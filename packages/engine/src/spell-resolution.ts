import { z } from 'zod';
import type { DuelState, SpellResolutionFrame } from '../../protocol/src/duel.js';
import { planResolution } from './effect-plans.js';
import { resolutionFingerprint } from './resolution-fingerprint.js';
import { freeze } from './registry.js';
import type { Registry } from './registry.js';

const id = z.string().min(1);
const FrameSchema = z.strictObject({
  version: z.literal(1), kind: z.literal('normal-spell-single-link-v1'), stage: z.literal('effect-choice'),
  duelId: id, registryRevision: id, rootLinkId: id, rootSourceId: id,
  cleanupSourceIds: z.tuple([id]), boardFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  choice: z.strictObject({ playerId: id, optionIds: z.array(id).min(2).max(10) }),
});

/** Only trusted current server stats/positions enter a resolution plan. */
export function spellResolutionBoard(registry: Registry, state: DuelState, controllerId: string) {
  return { controllerId, monsters: state.players.flatMap(p => p.monsters.filter((id): id is string => id !== null).map(id => {
    const card = state.cards[id]!, def = registry.cards[card.definition.id];
    if (!def || (def.kind !== 'normal-monster' && def.kind !== 'effect-monster')) throw new Error('Expected supported monster');
    return { instanceId: id, controllerId: p.id, faceUp: card.position !== 'face-down-defense', position: card.position,
      attack: def.attack, defense: def.defense };
  })) };
}

function pausedRoot(registry: Registry, state: DuelState) {
  const link = state.chain[0], source = link && state.cards[link.source], def = source && registry.cards[source.definition.id];
  if (state.cardRegistryRevision !== registry.revision || state.format.id !== registry.format.id || state.format.revision !== registry.format.revision
    || state.result || state.chainCleanup !== null || state.counterResolution !== null || state.pendingTriggers.length || state.chain.length !== 1
    || state.timing.window !== 'resolving' || state.timing.priorityPlayer !== null
    || state.timing.consecutivePasses !== 2 || state.timing.requestedPhase !== null
    || !link || link.effectId !== 'normal-spell' || link.spellSpeed !== 1 || link.activationNegated || link.effectNegated
    || link.controllerId !== state.turn.activePlayer || !['main1', 'main2'].includes(state.turn.phase)
    || link.costEvents.length || link.targetRefs.length || link.respondingToLinkId !== undefined
    || !source || def?.kind !== 'spell' || def.subtype !== 'normal' || def.revision !== source.definition.revision
    || !registry.spellHandlers[def.id] || source.location.kind !== 'spell-trap' || source.position !== 'face-up'
    || source.controllerId !== link.controllerId || source.location.playerId !== link.controllerId
    || state.players.find(p => p.id === link.controllerId)?.spellsTraps[source.location.slot] !== source.id
    || JSON.stringify(source) !== JSON.stringify(link.sourceAtActivation)) throw new Error('Invalid paused Spell root');
  const plan = planResolution(registry.spellHandlers[def.id], spellResolutionBoard(registry, state, link.controllerId));
  if (plan.kind !== 'choose-destruction') throw new Error('Spell is not waiting for a resolution choice');
  return { link, plan };
}

/** Called by the trusted resolver after two Passes, before exposing the private choice.
 * No effect, payment, decision or board mutation occurs here. Not a client state API.
 */
export function prepareSpellResolution(registry: Registry, state: DuelState): SpellResolutionFrame {
  if (state.pendingDecision || state.spellResolution !== null) throw new Error('Spell already has a pending resolution');
  const { link, plan } = pausedRoot(registry, state);
  return freeze({ version: 1, kind: 'normal-spell-single-link-v1', stage: 'effect-choice',
    duelId: state.id, registryRevision: registry.revision, rootLinkId: link.id, rootSourceId: link.source,
    cleanupSourceIds: [link.source] as [string], boardFingerprint: resolutionFingerprint(state),
    choice: { playerId: plan.playerId, optionIds: [...plan.optionIds] } });
}

/** Frame integrity plus exact recomputed candidate list. No projection or raw ID leaves server. */
export function assertSpellResolution(registry: Registry, state: DuelState): void {
  const frame = state.spellResolution;
  if (!frame || !FrameSchema.safeParse(frame).success) throw new Error('Malformed Spell resolution frame');
  const { link, plan } = pausedRoot(registry, state), decision = state.pendingDecision;
  if (frame.duelId !== state.id || frame.registryRevision !== registry.revision || frame.rootLinkId !== link.id
    || frame.rootSourceId !== link.source || frame.cleanupSourceIds[0] !== link.source
    || frame.boardFingerprint !== resolutionFingerprint(state)
    || frame.choice.playerId !== plan.playerId || JSON.stringify(frame.choice.optionIds) !== JSON.stringify(plan.optionIds)
    || decision?.kind !== 'effect-choice' || decision.id !== `${link.id}:choice` || decision.playerId !== plan.playerId
    || decision.min !== 1 || decision.max !== 1 || JSON.stringify(decision.optionIds) !== JSON.stringify(plan.optionIds))
    throw new Error('Invalid paused Spell resolution context');
}
