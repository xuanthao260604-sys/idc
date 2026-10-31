import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ChainLink, DuelState, EventRef, TrapCounterResolutionFrame } from '../../protocol/src/duel.js';
import { FieldActivationLinkSchema } from './counter-continuation.js';
import { captureSevenLPCosts, assertSevenLPCostHistory } from './seven-lp-cost-ledger.js';
import { definitionFingerprint } from './spell-review.js';
import { resolutionFingerprint } from './resolution-fingerprint.js';
import { chainCleanupDecision } from './chain-cleanup.js';
import { freeze } from './registry.js';
import type { Registry } from './registry.js';

export const SEVEN_RESPONSE_EFFECT_ID='pay-1000-negate-seven-tools-activation-v1';
const TRAP='official:04206964',SEVEN='official:03819470';
const trapPin='6bde121e8b1b4409e34d907b2d9e9d5ba5df93676a46507d205cd6d96372d35d';
const sevenPin='2dbc5c07956ac97d58b2f449898bf2d73bd0488578b9c69c0fadd5e468accbc0';
const id=z.string().min(1),integer=z.number().int().nonnegative().safe(),sha=z.string().regex(/^[a-f0-9]{64}$/);
const occurrence=z.strictObject({sequence:integer.positive(),simultaneousGroup:id,kind:z.literal('monster-summoned'),affectedInstances:z.array(id).length(1),details:z.record(id,z.union([z.string(),z.number().finite(),z.boolean()])).optional()});
const Frame=z.strictObject({version:z.literal(1),kind:z.literal('trap-hole-seven-seven-v1'),stage:z.literal('cleanup'),duelId:id,registryRevision:id,
  turn:z.strictObject({number:integer.positive(),activePlayer:id,phase:z.enum(['main1','main2'])}),capturedStateVersion:integer,capturedSequence:integer.positive(),
  root:FieldActivationLinkSchema,negatedSeven:FieldActivationLinkSchema,seven:FieldActivationLinkSchema,occurrence,lpCosts:z.unknown(),
  cleanupSourceIds:z.tuple([id,id]),boardFingerprint:sha,integritySha256:sha});
function check(v:unknown,message:string):asserts v {if(!v)throw new Error(message);}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const digest=(body:Omit<TrapCounterResolutionFrame,'integritySha256'>)=>createHash('sha256').update(JSON.stringify(body)).digest('hex');
function rootValid(registry:Registry,state:DuelState,root:ChainLink,event:EventRef,spent:boolean) {
  const c=state.cards[root.source],ref=root.targetRefs[0],target=ref&&state.cards[ref.instanceId],def=target&&registry.cards[target.definition.id];
  return !!(FieldActivationLinkSchema.safeParse(root).success&&occurrence.safeParse(event).success&&c
    &&c.definition.id===TRAP&&definitionFingerprint(registry.cards[TRAP]!)===trapPin
    &&same(c,root.sourceAtActivation)&&root.controllerId!==state.turn.activePlayer&&root.controllerId===c.controllerId
    &&root.effectId==='destroy-opponent-normal-or-flip-summoned-1000'&&root.spellSpeed===2&&!root.activationNegated&&!root.effectNegated
    &&!root.costEvents.length&&root.respondingToLinkId===undefined&&root.targetRefs.length===1
    &&c.location.kind==='spell-trap'&&c.location.playerId===c.controllerId&&state.players.find(p=>p.id===c.controllerId)?.spellsTraps[c.location.slot]===c.id
    &&c.markers.setOnTurn!==null&&c.markers.setOnTurn<state.turn.number&&['main1','main2'].includes(state.turn.phase)
    &&target&&def&&(def.kind==='normal-monster'||def.kind==='effect-monster')&&def.attack>=1000
    &&ref?.locationAtSelection.kind==='monster'&&ref.locationAtSelection.playerId===state.turn.activePlayer
    &&event.affectedInstances[0]===target.id&&event.details?.playerId===state.turn.activePlayer
    &&['normal','tribute','flip'].includes(String(event.details?.method))
    &&(spent ? target.location.kind==='graveyard'&&target.location.playerId===target.ownerId&&target.controllerId===target.ownerId&&target.position==='face-up'
      &&state.players.find(p=>p.id===target.ownerId)?.graveyard.includes(target.id)
      : target.location.kind==='monster'&&target.controllerId===state.turn.activePlayer&&target.position!=='face-down-defense'&&same(target.location,ref.locationAtSelection)));
}
/** Same original Summon eligibility, with fixed full definition pin. */
export function trapHoleActivationPrefix(registry:Registry,state:DuelState):boolean {
  return !!state.chain[0]&&!!state.timing.lastRelevantEvents[0]&&rootValid(registry,state,state.chain[0],state.timing.lastRelevantEvents[0],false);
}
export function trapSevenPrefix(registry:Registry,state:DuelState):boolean {
  const second=state.chain[1];
  return state.chain.length===2&&trapHoleActivationPrefix(registry,state)&&!!second
    &&second.sourceAtActivation.definition.id===SEVEN&&second.effectId==='pay-1000-negate-trap-hole-activation'
    &&second.spellSpeed===3&&second.respondingToLinkId===state.chain[0]!.id;
}
function graph(registry:Registry,state:DuelState,root:ChainLink,first:ChainLink,top:ChainLink,event:EventRef,spent:boolean) {
  check(rootValid(registry,state,root,event,spent),'Invalid Trap Hole Counter root');
  check(new Set([root.id,first.id,top.id]).size===3&&new Set([root.source,first.source,top.source]).size===3,'Duplicate Trap Counter identity');
  for(const l of [first,top])check(FieldActivationLinkSchema.safeParse(l).success&&l.sourceAtActivation.definition.id===SEVEN
    &&definitionFingerprint(registry.cards[SEVEN]!)===sevenPin&&l.spellSpeed===3&&!l.targetRefs.length&&!l.effectNegated
    &&l.source===l.sourceAtActivation.id&&l.controllerId===l.sourceAtActivation.controllerId&&l.sourceAtActivation.location.playerId===l.controllerId
    &&l.costEvents.length===1&&l.costEvents[0]!.kind==='life-points-paid'&&!l.costEvents[0]!.affectedInstances.length
    &&l.costEvents[0]!.details?.playerId===l.controllerId&&l.costEvents[0]!.details?.reason==='activation-cost'&&l.costEvents[0]!.details?.amount===1000
    &&l.sourceAtActivation.markers.setOnTurn!==null&&l.sourceAtActivation.markers.setOnTurn<state.turn.number,'Invalid Seven source history');
  check(first.effectId==='pay-1000-negate-trap-hole-activation'&&first.respondingToLinkId===root.id&&first.activationNegated===spent
    &&top.effectId===SEVEN_RESPONSE_EFFECT_ID&&top.respondingToLinkId===first.id&&!top.activationNegated,'Invalid Seven response graph');
  check(event.sequence<first.costEvents[0]!.sequence,'Summon must precede costs');
}
/** Validates all live sources/costs without paying or moving anything. */
export function prepareTrapCounterContinuation(registry:Registry,state:DuelState) {
  check(state.chain.length===3&&state.fourLinkCounterResolution===null&&state.trapCounterResolution===null&&state.counterResolution===null&&state.spellResolution===null
    &&state.chainCleanup===null&&['reviewed-three-link-counter-patterns-v3','reviewed-four-link-counter-patterns-v4'].includes(registry.counterContinuations[SEVEN]??''),'Unreviewed Seven response');
  const [root,first,top]=state.chain as readonly[ChainLink,ChainLink,ChainLink],event=state.timing.lastRelevantEvents[0]!;
  graph(registry,state,root,first,top,event,false);
  const lpCosts=captureSevenLPCosts(registry,state);check(lpCosts.payments.length===2,'Two Seven costs required');
  return freeze({root:structuredClone(root),negatedSeven:{...structuredClone(first),activationNegated:true},seven:structuredClone(top),occurrence:structuredClone(event),lpCosts});
}
/** Trusted resolver seals AFTER it destroyed the negated Seven and the root target.
 * Does not claim arbitrary proposed boards are legal transitions or accept client state.
 */
export function finishTrapCounterContinuation(registry:Registry,state:DuelState,p:ReturnType<typeof prepareTrapCounterContinuation>):TrapCounterResolutionFrame {
  const body={version:1 as const,kind:'trap-hole-seven-seven-v1' as const,stage:'cleanup' as const,duelId:state.id,registryRevision:registry.revision,
    turn:{number:state.turn.number,activePlayer:state.turn.activePlayer,phase:state.turn.phase as 'main1'|'main2'},
    capturedStateVersion:p.lpCosts.capturedStateVersion,capturedSequence:p.lpCosts.capturedSequence,
    ...structuredClone(p),cleanupSourceIds:[p.root.source,p.seven.source] as [string,string],boardFingerprint:resolutionFingerprint(state)};
  const result=freeze({...body,integritySha256:digest(body)});assertTrapCounterSources(registry,state,result);return result;
}
function assertTrapCounterSources(registry:Registry,state:DuelState,f:TrapCounterResolutionFrame) {
  check(Frame.safeParse(f).success,'Malformed Trap Counter frame');const {integritySha256,...body}=f;
  check(integritySha256===digest(body),'Trap Counter frame changed');assertSevenLPCostHistory(f.lpCosts);
  check(state.id===f.duelId&&state.cardRegistryRevision===f.registryRevision&&registry.revision===f.registryRevision
    &&['reviewed-three-link-counter-patterns-v3','reviewed-four-link-counter-patterns-v4'].includes(registry.counterContinuations[SEVEN]??'')&&same(state.turn,f.turn)&&!state.result&&!state.pendingTriggers.length
    &&state.spellResolution===null&&state.counterResolution===null&&state.fourLinkCounterResolution===null&&state.timing.window==='resolving'&&state.timing.priorityPlayer===null
    &&state.timing.consecutivePasses===2&&state.timing.requestedPhase===null&&state.eventSequence>f.capturedSequence
    &&state.stateVersion>=f.capturedStateVersion&&state.chain.length===1&&same(state.chain[0],f.root)
    &&same(f.cleanupSourceIds,[f.root.source,f.seven.source])&&resolutionFingerprint(state)===f.boardFingerprint,'Trap Counter context drift');
  graph(registry,state,f.root,f.negatedSeven,f.seven,f.occurrence,true);
  check(f.lpCosts.duelId===state.id&&f.lpCosts.registryRevision===registry.revision&&same(f.lpCosts.turn,state.turn)
    &&same(f.lpCosts.playerIds,state.players.map(p=>p.id))&&f.lpCosts.capturedSequence===f.capturedSequence&&f.lpCosts.capturedStateVersion===f.capturedStateVersion,'LP history context drift');
  const expected=[f.negatedSeven,f.seven].map(l=>{const e=l.costEvents[0]!,d=e.details!;return{linkId:l.id,sourceId:l.source,playerId:l.controllerId,sequence:e.sequence,simultaneousGroup:e.simultaneousGroup,amount:d.amount,beforeLP:d.beforeLP,afterLP:d.afterLP};});
  check(same(f.lpCosts.payments,expected),'LP receipts do not match spent links');
  for(const b of f.lpCosts.balances)check(state.players.find(p=>p.id===b.playerId)?.lifePoints===b.afterLastLP,'Paid LP changed during Trap resolution');
  const lost=state.cards[f.negatedSeven.source],owner=f.negatedSeven.sourceAtActivation.ownerId;
  check(lost&&same(lost,{...f.negatedSeven.sourceAtActivation,location:{kind:'graveyard',playerId:owner},controllerId:owner,position:'face-up'})
    &&state.players.find(p=>p.id===owner)?.graveyard.includes(lost.id)&&same(state.cards[f.seven.source],f.seven.sourceAtActivation),'Counter source lifecycle drift');
}
export function assertTrapCounterResolutionFrame(registry:Registry,state:DuelState) {
  const f=state.trapCounterResolution;check(f,'Missing Trap Counter frame');assertTrapCounterSources(registry,state,f);
  check(state.stateVersion>f.capturedStateVersion&&state.chainCleanup?.mode==='live'&&same(state.chainCleanup.sourceIds,f.cleanupSourceIds),'Invalid Trap Counter cleanup');
  const pending=chainCleanupDecision(registry,{...state,pendingDecision:null},state.chainCleanup),d=state.pendingDecision;
  check(pending&&d?.kind==='cleanup-order'&&d.id===`${f.root.id}:cleanup:${pending.playerId}`&&d.playerId===pending.playerId
    &&d.min===pending.min&&d.max===pending.max&&same(d.optionIds,pending.optionIds),'Invalid Trap Counter cleanup choice');
}
