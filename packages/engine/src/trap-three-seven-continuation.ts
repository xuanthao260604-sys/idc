import type {DuelState} from '../../protocol/src/duel.js';
import type {Registry} from './registry.js';
import {trapSevenPrefix,SEVEN_RESPONSE_EFFECT_ID} from './trap-counter-continuation.js';
import {assertTrapThreeSevenResolution,THREE_SEVEN_REVIEW} from './trap-three-seven-candidate.js';
import {chainCleanupDecision} from './chain-cleanup.js';
/** Exact prefix only. Existing invariants separately validate all paid/live sources. */
export function reviewedTrapThreeSevenPrefix(registry:Registry,state:DuelState){
  const middle=state.chain[2];return registry.counterContinuations['official:03819470']===THREE_SEVEN_REVIEW&&state.chain.length===3
    &&trapSevenPrefix(registry,{...state,chain:state.chain.slice(0,2)})&&middle?.effectId===SEVEN_RESPONSE_EFFECT_ID
    &&middle.sourceAtActivation.definition.id==='official:03819470'&&middle.respondingToLinkId===state.chain[1]!.id;
}
export function assertTrapThreeSevenCleanup(registry:Registry,state:DuelState){
  const f=state.trapThreeSevenResolution;if(!f)throw new Error('Missing three-Seven cleanup journal');
  assertTrapThreeSevenResolution(registry,{...state,trapThreeSevenResolution:null,chainCleanup:null,pendingDecision:null},f);
  const e=state.timing.lastRelevantEvents[0];
  if(state.stateVersion<=f.capturedStateVersion||state.eventSequence!==f.capturedSequence+8||state.chainCleanup?.mode!=='live'
    ||JSON.stringify(state.chainCleanup.sourceIds)!==JSON.stringify(f.cleanupSourceIds)||state.timing.lastRelevantEvents.length!==1
    ||e?.kind!=='trap-destroyed'||e.sequence!==f.capturedSequence+7||JSON.stringify(e.affectedInstances)!==JSON.stringify([f.root.source])
    ||e.details?.playerId!==f.root.controllerId)throw new Error('Invalid three-Seven cleanup context');
  const pending=chainCleanupDecision(registry,{...state,pendingDecision:null},state.chainCleanup),d=state.pendingDecision;
  if(!pending||d?.kind!=='cleanup-order'||d.id!==`${f.first.id}:cleanup:${pending.playerId}`||d.playerId!==pending.playerId
    ||d.min!==pending.min||d.max!==pending.max||JSON.stringify(d.optionIds)!==JSON.stringify(pending.optionIds))throw new Error('Invalid three-Seven cleanup decision');
}
