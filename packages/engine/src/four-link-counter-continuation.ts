import type { DuelState } from '../../protocol/src/duel.js';
import type { Registry } from './registry.js';
import { chainCleanupDecision } from './chain-cleanup.js';
import { normalSpellMagicPrefix, SEVEN_MAGIC_EFFECT_ID } from './counter-continuation.js';
import { assertFourLinkCounterResolution, FOUR_LINK_REVIEW } from './four-link-counter-candidate.js';

/** Prefix eligibility only; complete live-source/cost guards still run in the engine. */
export function reviewedFourLinkPrefix(registry:Registry,state:DuelState){
  const seven=state.chain[2];
  return [FOUR_LINK_REVIEW,'reviewed-four-link-counter-patterns-v5'].includes(registry.counterContinuations['official:03819470']??'')&&state.chain.length===3
    &&normalSpellMagicPrefix(registry,{...state,chain:state.chain.slice(0,2)})&&seven?.effectId===SEVEN_MAGIC_EFFECT_ID
    &&seven.sourceAtActivation.definition.id==='official:03819470'&&seven.respondingToLinkId===state.chain[1]!.id;
}
/** The core checkpoint owns the board/history; this parent owns the exact private
 * cleanup pause. Only its own context fields are removed for core validation.
 */
export function assertFourLinkCounterCleanup(registry:Registry,state:DuelState){
  const f=state.fourLinkCounterResolution;
  if(!f)throw new Error('Missing four-link cleanup frame');
  assertFourLinkCounterResolution(registry,{...state,fourLinkCounterResolution:null,chainCleanup:null,pendingDecision:null},f);
  if(state.stateVersion<=f.capturedStateVersion||state.eventSequence<=f.capturedSequence||state.chainCleanup?.mode!=='live'
    ||JSON.stringify(state.chainCleanup.sourceIds)!==JSON.stringify(f.cleanupSourceIds))throw new Error('Invalid four-link cleanup context');
  const pending=chainCleanupDecision(registry,{...state,pendingDecision:null},state.chainCleanup),d=state.pendingDecision;
  if(!pending||d?.kind!=='cleanup-order'||d.id!==`${f.magic.id}:cleanup:${pending.playerId}`||d.playerId!==pending.playerId
    ||d.min!==pending.min||d.max!==pending.max||JSON.stringify(d.optionIds)!==JSON.stringify(pending.optionIds))throw new Error('Invalid four-link cleanup decision');
}
