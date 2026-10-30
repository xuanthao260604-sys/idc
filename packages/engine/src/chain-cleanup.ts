import { z } from 'zod';
import type { DuelState, ChainCleanupFrame } from '../../protocol/src/duel.js';
export type { ChainCleanupFrame } from '../../protocol/src/duel.js';
import { requireRule as rule } from './actions.js';
import { freeze } from './registry.js';
import type { Registry } from './registry.js';
import { resolutionFingerprint as fingerprint } from './resolution-fingerprint.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

const ids = z.array(z.string().min(1)).min(1).max(10);
const FrameSchema = z.strictObject({
  version: z.literal(1),
  mode: z.enum(['live', 'terminal-single-source']),
  duelId: z.string().min(1),
  registryRevision: z.string().min(1),
  boardFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sourceIds: ids,
  batches: z.array(z.strictObject({ ownerId: z.string().min(1), sourceIds: ids, order: ids.nullable() })).min(1).max(2),
});
function exactPermutation(order: readonly string[], expected: readonly string[]) {
  return order.length === expected.length && new Set(order).size === order.length
    && order.every(id => expected.includes(id));
}

/** Trusted resolver calls this only AFTER all effects/choices have finished, with its
 * remaining face-up sources (not costs, destroyed links, or effect victims).
 * Does not resolve effects, authorize a Chain pattern, or change any game state.
 */
export function prepareChainCleanup(registry: Registry, state: DuelState, sourceIds: readonly string[],
  mode: ChainCleanupFrame['mode'] = 'live'): ChainCleanupFrame {
  rule(state.cardRegistryRevision === registry.revision && state.format.id === registry.format.id
    && state.format.revision === registry.format.revision, 'invalid-target', 'Cleanup registry mismatch');
  rule(state.players.length === 2 && state.players[0].id !== state.players[1].id, 'invalid-target', 'Invalid cleanup players');
  rule(!state.pendingDecision && !state.pendingTriggers.length, 'illegal-timing', 'Finish effect decisions before cleanup');
  rule(mode === 'live'
    ? !state.result && state.timing.window === 'resolving' && state.timing.priorityPlayer === null
    : mode === 'terminal-single-source' && state.result !== null
      && ['life-points', 'failed-draw'].includes(state.result.reason) && sourceIds.length === 1,
  'illegal-timing', 'Unsupported cleanup timing');
  rule(ids.safeParse(sourceIds).success && new Set(sourceIds).size === sourceIds.length,
    'invalid-target', 'Cleanup requires distinct remaining sources');
  for (const id of sourceIds) {
    const card = state.cards[id], def = card && registry.cards[card.definition.id];
    const location = card?.location;
    const controller = location && state.players.find(p => p.id === location.playerId);
    rule(card && def && def.revision === card.definition.revision
      && ((def.kind === 'spell' && def.subtype === 'normal') || (def.kind === 'trap' && ['normal', 'counter'].includes(def.subtype)))
      && location?.kind === 'spell-trap' && card.position === 'face-up'
      && card.controllerId === location.playerId && controller?.spellsTraps[location.slot] === id
      && state.players.some(p => p.id === card.ownerId)
      && state.players.reduce((n, p) => n + [...p.deck, ...p.hand, ...p.graveyard, ...p.banished, ...p.fusionDeck,
        ...p.monsters, ...p.spellsTraps, p.field].filter(value => value === id).length, 0) === 1,
    'invalid-target', 'Cleanup source must be a remaining supported face-up Spell/Trap');
  }
  return freeze({ version: 1, mode, duelId: state.id, registryRevision: registry.revision,
    boardFingerprint: fingerprint(state), sourceIds: [...sourceIds],
    // Player tuple order only schedules private choices. It gives no player control of
    // another owner's Graveyard and does not assert an order BETWEEN Graveyards.
    batches: state.players.flatMap(p => {
      const owned = sourceIds.filter(id => state.cards[id]!.ownerId === p.id);
      return owned.length ? [{ ownerId: p.id, sourceIds: owned, order: owned.length === 1 ? [...owned] : null }] : [];
    }) });
}

function validateFrame(registry: Registry, state: DuelState, frame: ChainCleanupFrame) {
  rule(FrameSchema.safeParse(frame).success, 'invalid-choice', 'Malformed cleanup frame');
  rule(frame.duelId === state.id && frame.registryRevision === registry.revision
    && frame.boardFingerprint === fingerprint(state), 'stale-state', 'Cleanup board has changed');
  const expected = prepareChainCleanup(registry, state, frame.sourceIds, frame.mode);
  rule(frame.batches.length === expected.batches.length && frame.batches.every((batch, i) => {
    const original = expected.batches[i]!;
    return batch.ownerId === original.ownerId && JSON.stringify(batch.sourceIds) === JSON.stringify(original.sourceIds)
      && (batch.order === null ? original.order === null : exactPermutation(batch.order, original.sourceIds));
  }), 'invalid-choice', 'Cleanup owner/source grouping changed');
  // Choices are answered in sequence; a later batch cannot be pre-answered.
  const firstPending = frame.batches.findIndex(batch => batch.order === null);
  rule(firstPending < 0 || frame.batches.slice(firstPending + 1).every((batch, i) =>
    expected.batches[firstPending + 1 + i]!.order !== null || batch.order === null),
  'invalid-choice', 'Cleanup choice sequence changed');
}

/** Internal raw identities. A future adapter must issue viewer/version-bound handles. */
export function chainCleanupDecision(registry: Registry, state: DuelState, frame: ChainCleanupFrame) {
  validateFrame(registry, state, frame);
  const batch = frame.batches.find(batch => batch.order === null);
  return batch ? freeze({ playerId: batch.ownerId, optionIds: [...batch.sourceIds],
    min: batch.sourceIds.length, max: batch.sourceIds.length }) : null;
}

/** Records one owner's complete permutation. No card, LP, cost, or event is changed. */
export function orderChainCleanup(registry: Registry, state: DuelState, frame: ChainCleanupFrame,
  actorId: string, order: readonly string[]): ChainCleanupFrame {
  const decision = chainCleanupDecision(registry, state, frame);
  rule(decision && decision.playerId === actorId && exactPermutation(order, decision.optionIds),
    'invalid-choice', 'Choose every source of your cleanup batch exactly once');
  const next = structuredClone(frame);
  return freeze({ ...next, batches: next.batches.map(batch => batch.ownerId === actorId
    ? { ...batch, order: [...order] } : batch) });
}

/** Atomic board patch; caller installs it and emits ONE simultaneous cleanup event.
 * No partial patch is returned while any owner still needs to choose. Chain/timing,
 * state version, receipts and terminal handling belong to the integrating resolver.
 */
export function commitChainCleanup(registry: Registry, state: DuelState, frame: ChainCleanupFrame): Pick<DuelState, 'players' | 'cards'> {
  validateFrame(registry, state, frame);
  rule(frame.batches.every(batch => batch.order !== null), 'invalid-choice', 'Cleanup ordering is incomplete');
  const players = structuredClone(state.players) as Mutable<DuelState['players']>, cards = structuredClone(state.cards);
  for (const batch of frame.batches) for (const id of batch.order!) {
    const card = cards[id]!, location = card.location;
    // All sources and all choices were validated before the first movement.
    if (location.kind !== 'spell-trap') throw new Error('Validated cleanup source moved');
    const controller = players.find(p => p.id === card.controllerId)!, owner = players.find(p => p.id === card.ownerId)!;
    controller.spellsTraps[location.slot] = null;
    owner.graveyard.push(id);
    card.location = { kind: 'graveyard', playerId: owner.id }; card.controllerId = owner.id; card.position = 'face-up';
  }
  return freeze({ players, cards });
}
