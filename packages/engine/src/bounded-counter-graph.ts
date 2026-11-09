import { z } from 'zod';
import type { ChainLink, DuelState } from '../../protocol/src/duel.js';
import type { Registry } from './registry.js';
import { freeze } from './registry.js';
import { definitionFingerprint } from './spell-review.js';
import { COUNTER_CONTINUATION_PINS, FieldActivationLinkSchema } from './counter-continuation.js';
import { reviewedTrapHoleRootValid } from './trap-counter-continuation.js';
import { SevenLPCostEventSchema, sevenLPCostBalances } from './seven-lp-cost-ledger.js';

/** Component-only identity. Never accepted by the live v5 activation dispatcher. */
export const BOUNDED_SEVEN_CANDIDATE_EFFECT = 'candidate-bounded-seven-response-v1';
const T = 'official:04206964', M = 'official:77414722', V = 'official:03819470';
const trapPin = '6bde121e8b1b4409e34d907b2d9e9d5ba5df93676a46507d205cd6d96372d35d';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const natural = (n: number) => Number.isSafeInteger(n) && n >= 0;
const Discard = z.strictObject({ sequence: z.number().int().positive().safe(), simultaneousGroup: z.string().min(1),
  kind: z.literal('cards-discarded'), affectedInstances: z.array(z.string().min(1)).length(1),
  details: z.strictObject({ playerId: z.string().min(1), reason: z.literal('activation-cost') }) });

/** Structural candidate validation, not proof of a legal action history, priority history,
 * a complete DuelState validator, or permission to activate a new pattern. No mutations.
 */
export function validateBoundedCounterGraph(registry: Registry, state: DuelState) {
  check(state.id && state.cardRegistryRevision === registry.revision && same(state.format, registry.format)
    && registry.format.id === 'goat-2005-08-17' && registry.format.revision === 4
    && natural(state.stateVersion) && natural(state.eventSequence) && state.eventSequence > 0
    && natural(state.turn.number) && state.turn.number > 0 && ['main1', 'main2'].includes(state.turn.phase)
    && !state.result && !state.pendingDecision && !state.pendingTriggers.length && !state.modifiers.length
    && state.battle === null && state.timing.requestedPhase === null
    && state.chainCleanup === null && state.spellResolution === null && state.counterResolution === null
    && state.trapCounterResolution === null && state.fourLinkCounterResolution === null && state.trapThreeSevenResolution === null,
  'Invalid bounded candidate context');
  const players = state.players.map(p => p.id);
  check(players.length === 2 && new Set(players).size === 2 && players.every(p => typeof p === 'string' && p.length)
    && players.includes(state.turn.activePlayer) && state.players.every(p => natural(p.lifePoints) && p.lifePoints > 0), 'Invalid candidate players');
  check(natural(state.timing.consecutivePasses)
    && ((state.timing.window === 'chain-response' && players.includes(state.timing.priorityPlayer ?? '') && state.timing.consecutivePasses < 2)
      || (state.timing.window === 'resolving' && state.timing.priorityPlayer === null && state.timing.consecutivePasses === 2)), 'Invalid candidate timing');

  // Verify one location per instance, board indexes, and owned copy limits. This is
  // deliberately not deck-size validation: cards have already moved during play.
  const seen = new Set<string>(), copies = new Map<string, number>();
  for (const p of state.players) {
    check(p.monsters.length === 5 && p.spellsTraps.length === 5 && p.field === null && !p.banished.length && !p.fusionDeck.length, 'Unsupported candidate zones');
    for (const zone of ['deck', 'hand', 'graveyard', 'monsters', 'spellsTraps'] as const) p[zone].forEach((id, slot) => {
      if (id === null) return;
      const c = state.cards[id], d = c && registry.cards[c.definition.id];
      const location = zone === 'monsters' ? { kind: 'monster', playerId: p.id, slot }
        : zone === 'spellsTraps' ? { kind: 'spell-trap', playerId: p.id, slot } : { kind: zone, playerId: p.id };
      check(c && d && c.id === id && c.definition.revision === d.revision && players.includes(c.ownerId)
        && c.ownerId === p.id && c.controllerId === p.id && !seen.has(id) && same(c.location, location), 'Candidate instance/zone drift');
      seen.add(id);
      const key = JSON.stringify([c.ownerId, d.id]), count = (copies.get(key) ?? 0) + 1;
      copies.set(key, count);
      check(count <= Math.min(registry.rules.deck.combinedCopyLimit, d.legality.maxCopies ?? 0), 'Candidate copy limit');
    });
  }
  check(seen.size === Object.keys(state.cards).length, 'Orphan candidate instance');
  check(state.chain.length >= 1 && state.chain.length <= 8
    && new Set(state.chain.map(l => l.id)).size === state.chain.length
    && new Set(state.chain.map(l => l.source)).size === state.chain.length, 'Invalid candidate Chain identities/bound');
  const activeSources = new Set(state.chain.map(l => l.source));
  for (const p of state.players) for (const id of p.spellsTraps) {
    // This pool has no persistent face-up Spell/Trap. A dropped activation must
    // not become an unrelated face-up source while its receipt disappears.
    if (id !== null && state.cards[id]!.position === 'face-up') check(activeSources.has(id), 'Untracked candidate activation source');
  }
  for (const l of state.chain) {
    const c = state.cards[l.source], d = c && registry.cards[c.definition.id];
    check(FieldActivationLinkSchema.safeParse(l).success && c && d && same(c, l.sourceAtActivation)
      && l.controllerId === c.controllerId && c.ownerId === c.controllerId && c.position === 'face-up'
      && c.location.kind === 'spell-trap' && !l.activationNegated && !l.effectNegated
      && definitionFingerprint(d) === (d.id === T ? trapPin : COUNTER_CONTINUATION_PINS[d.id]), 'Invalid candidate source/pin');
    check(c.markers.setOnTurn === null || (natural(c.markers.setOnTurn) && c.markers.setOnTurn <= state.turn.number), 'Invalid candidate Set marker');
    if (d.kind === 'trap') check(c.markers.setOnTurn !== null && c.markers.setOnTurn < state.turn.number, 'Candidate Trap Set this turn');
  }

  const root = state.chain[0]!;
  const spell = root.sourceAtActivation.definition.id !== T;
  let prefixLength = 0;
  const costs: ChainLink['costEvents'][number][] = [];
  const discards = new Set<string>();
  const discard = (l: ChainLink) => {
    const e = l.costEvents[0];
    check(l.costEvents.length === 1 && Discard.safeParse(e).success && e?.details?.playerId === l.controllerId, 'Invalid candidate discard');
    const id = e.affectedInstances[0]!, c = state.cards[id];
    check(c && c.ownerId === l.controllerId && c.location.kind === 'graveyard' && !discards.has(id)
      && !state.chain.some(l => l.source === id), 'Invalid candidate discard source');
    discards.add(id); costs.push(e);
  };
  if (spell) {
    const def = registry.cards[root.sourceAtActivation.definition.id]!, binding = registry.spellHandlers[def.id];
    check(def.kind === 'spell' && def.subtype === 'normal' && def.origin === 'official' && binding
      && root.effectId === 'normal-spell' && root.spellSpeed === 1 && root.controllerId === state.turn.activePlayer
      && root.respondingToLinkId === undefined, 'Invalid candidate Spell root');
    const handler = binding.handler;
    const hasCost = ['discard-destroy-target-monster', 'discard-return-own-graveyard-monster'].includes(handler);
    if (hasCost) discard(root); else check(!root.costEvents.length, 'Unexpected candidate root cost');
    const targeted = hasCost || handler === 'target-opposing-attack-to-defense';
    check(root.targetRefs.length === (targeted ? 1 : 0), 'Invalid candidate Spell targets');
    if (targeted) {
      const ref = root.targetRefs[0]!, target = state.cards[ref.instanceId], d = target && registry.cards[target.definition.id];
      check(target && d && ['normal-monster', 'effect-monster'].includes(d.kind) && same(target.location, ref.locationAtSelection), 'Candidate target moved');
      if (handler === 'discard-return-own-graveyard-monster') check(target.location.kind === 'graveyard' && target.ownerId === root.controllerId, 'Invalid candidate grave target');
      else check(target.location.kind === 'monster'
        && (handler !== 'target-opposing-attack-to-defense' || (target.controllerId !== root.controllerId && target.position === 'face-up-attack')), 'Invalid candidate monster target');
    }
    prefixLength = 1;
    if (state.chain.length > 1) {
      const magic = state.chain[1]!;
      check(magic.sourceAtActivation.definition.id === M && magic.effectId === 'discard-negate-normal-spell-activation'
        && magic.spellSpeed === 3 && magic.respondingToLinkId === root.id && !magic.targetRefs.length, 'Invalid candidate Magic prefix');
      discard(magic); prefixLength++;
    }
  } else {
    const event = state.timing.lastRelevantEvents[0];
    check(state.timing.lastRelevantEvents.length === 1 && event && natural(event.sequence) && event.sequence > 0 && event.sequence < state.eventSequence, 'Invalid candidate Summon occurrence');
    while (state.chain[prefixLength]?.sourceAtActivation.definition.id === T) {
      const l = state.chain[prefixLength]!;
      check(reviewedTrapHoleRootValid(registry, state, l, event, false) && same(l.targetRefs, root.targetRefs), 'Invalid candidate Trap prefix');
      prefixLength++;
    }
    check(prefixLength >= 1 && prefixLength <= 3, 'Invalid candidate Trap prefix count');
  }
  const seven = state.chain.slice(prefixLength);
  check(seven.length <= 6 && (!spell || !seven.length || prefixLength === 2), 'Invalid candidate Seven suffix');
  for (let i = 0; i < seven.length; i++) {
    const l = seven[i]!, previous = state.chain[prefixLength + i - 1]!;
    check(l.sourceAtActivation.definition.id === V && l.effectId === BOUNDED_SEVEN_CANDIDATE_EFFECT && l.spellSpeed === 3
      && l.respondingToLinkId === previous.id && !l.targetRefs.length && l.costEvents.length === 1, 'Invalid candidate Seven response');
    const e = l.costEvents[0]!;
    check(SevenLPCostEventSchema.safeParse(e).success && e.details?.playerId === l.controllerId, 'Invalid candidate LP receipt');
    costs.push(e);
  }
  for (const key of ['sequence', 'simultaneousGroup'] as const) check(new Set(costs.map(e => e[key])).size === costs.length, 'Duplicate candidate cost identity');
  costs.forEach((e, i) => check(e.sequence < state.eventSequence && (i === 0 || e.sequence > costs[i - 1]!.sequence)
    && (spell || e.sequence > state.timing.lastRelevantEvents[0]!.sequence), 'Invalid candidate cost chronology'));
  const payments = seven.map(l => {
    const e = l.costEvents[0]!, d = e.details!;
    return { linkId: l.id, sourceId: l.source, playerId: l.controllerId, sequence: e.sequence,
      simultaneousGroup: e.simultaneousGroup, amount: 1000 as const, beforeLP: Number(d.beforeLP), afterLP: Number(d.afterLP) };
  });
  const balances = sevenLPCostBalances(payments, players);
  for (const b of balances) check(state.players.find(p => p.id === b.playerId)!.lifePoints === b.afterLastLP, 'Candidate current LP drift');
  return freeze({ kind: 'bounded-counter-graph-candidate-v1' as const, family: spell ? 'spell-magic' as const : 'trap-prefix' as const,
    prefixLength, sevenCount: seven.length, linkIds: state.chain.map(l => l.id), sourceIds: state.chain.map(l => l.source), payments, balances });
}
