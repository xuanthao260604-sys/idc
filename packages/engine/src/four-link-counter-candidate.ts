import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ChainLink, DuelState, FourLinkCounterJournal } from '../../protocol/src/duel.js';
import { assertCounterContinuationGraph, COUNTER_CONTINUATION_PINS, FieldActivationLinkSchema, SEVEN_MAGIC_EFFECT_ID } from './counter-continuation.js';
import { captureSevenLPCosts, assertSevenLPCostHistory } from './seven-lp-cost-ledger.js';
import type { SevenLPCostLedger } from './seven-lp-cost-ledger.js';
import { definitionFingerprint } from './spell-review.js';
import { resolutionFingerprint } from './resolution-fingerprint.js';
import { freeze } from './registry.js';
import type { Registry } from './registry.js';

// Candidate accounting/resolution ONLY. No active review or activation gate uses this ID.
export const FOUR_LINK_CANDIDATE_EFFECT_ID='pay-1000-negate-seven-tools-after-magic-jammer-candidate-v1';
export const FOUR_LINK_EFFECT_ID='pay-1000-negate-seven-tools-after-magic-jammer-v1';
export const FOUR_LINK_REVIEW='reviewed-four-link-counter-patterns-v4';
const SEVEN='official:03819470';
const id=z.string().min(1),integer=z.number().int().nonnegative().safe(),sha=z.string().regex(/^[a-f0-9]{64}$/);
const Schema=z.strictObject({version:z.literal(1),kind:z.enum(['normal-spell-magic-seven-seven-candidate-v1','normal-spell-magic-seven-seven-v1']),duelId:id,registryRevision:id,
  turn:z.strictObject({number:integer.positive(),activePlayer:id,phase:z.enum(['main1','main2'])}),capturedStateVersion:integer,capturedSequence:integer.positive(),
  root:FieldActivationLinkSchema,magic:FieldActivationLinkSchema,seven:FieldActivationLinkSchema,top:FieldActivationLinkSchema,
  lpCosts:z.unknown(),cleanupSourceIds:z.tuple([id,id]),entryFingerprint:sha,boardFingerprint:sha,integritySha256:sha});
export type FourLinkCounterCandidateJournal = FourLinkCounterJournal;
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
function check(v:unknown,m:string):asserts v {if(!v)throw new Error(m);}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const digest=(body:Omit<FourLinkCounterCandidateJournal,'integritySha256'>)=>createHash('sha256').update(JSON.stringify(body)).digest('hex');

/** Spatial accounting, not permission to run an unsupported Chain through the engine. */
function zones(registry:Registry,state:DuelState){
  const seen=new Set<string>();
  check(state.players.length===2&&state.players[0].id!==state.players[1].id,'Invalid candidate players');
  for(const p of state.players){
    check(p.monsters.length===5&&p.spellsTraps.length===5&&p.field===null&&!p.banished.length&&!p.fusionDeck.length,'Invalid or unsupported candidate field/extra zone');
    const visit=(key:string,kind:string,slot?:number)=>{const c=state.cards[key],def=c&&registry.cards[c.definition.id];
      check(c&&c.id===key&&!seen.has(key)&&def&&c.definition.revision===def.revision&&state.players.some(p=>p.id===c.ownerId)
        &&same(c.location,{kind,playerId:p.id,...(slot===undefined?{}:{slot})})&&c.controllerId===p.id,'Invalid candidate zone binding');
      if(slot===undefined)check(c.ownerId===p.id,'Candidate off-field ownership drift');seen.add(key);
    };
    for(const kind of ['deck','hand','graveyard']as const)for(const key of p[kind])visit(key,kind);
    p.monsters.forEach((key,slot)=>{if(key!==null)visit(key,'monster',slot);});
    p.spellsTraps.forEach((key,slot)=>{if(key!==null)visit(key,'spell-trap',slot);});
  }
  check(seen.size===Object.keys(state.cards).length,'Unreferenced candidate card');
}
function graph(registry:Registry,root:ChainLink,magic:ChainLink,seven:ChainLink,top:ChainLink,turn:FourLinkCounterCandidateJournal['turn'],seq:number,spent:boolean,reviewed=false){
  // Validate the historical activation graph, while separately requiring the exact
  // two negations produced by the candidate. No LP is reconstructed or paid here.
  check(root.activationNegated===spent&&seven.activationNegated===spent,'Invalid candidate spent flags');
  assertCounterContinuationGraph(registry,{...root,activationNegated:false},magic,{...seven,activationNegated:false},turn,seq,false);
  check(seven.effectId===SEVEN_MAGIC_EFFECT_ID&&FieldActivationLinkSchema.safeParse(top).success
    &&top.sourceAtActivation.definition.id===SEVEN&&top.sourceAtActivation.definition.revision===registry.cards[SEVEN]!.revision
    &&definitionFingerprint(registry.cards[SEVEN]!)===COUNTER_CONTINUATION_PINS[SEVEN]
    &&top.source===top.sourceAtActivation.id&&top.controllerId===top.sourceAtActivation.controllerId
    &&top.sourceAtActivation.location.playerId===top.controllerId&&top.spellSpeed===3
    &&top.effectId===(reviewed?FOUR_LINK_EFFECT_ID:FOUR_LINK_CANDIDATE_EFFECT_ID)&&top.respondingToLinkId===seven.id&&!top.activationNegated&&!top.effectNegated&&!top.targetRefs.length
    &&top.sourceAtActivation.markers.setOnTurn!==null&&top.sourceAtActivation.markers.setOnTurn<turn.number,'Invalid fourth candidate link');
  check(new Set([root,magic,seven,top].map(l=>l.id)).size===4&&new Set([root,magic,seven,top].map(l=>l.source)).size===4,'Duplicate four-link identity');
}
function costsStillPaid(state:DuelState,root:ChainLink,magic:ChainLink){
  for(const l of [root,magic])for(const e of l.costEvents){const c=state.cards[e.affectedInstances[0]!];
    check(c&&c.ownerId===l.controllerId&&c.controllerId===l.controllerId&&c.position==='face-up'
      &&c.location.kind==='graveyard'&&c.location.playerId===l.controllerId&&state.players.find(p=>p.id===l.controllerId)?.graveyard.includes(c.id),'Candidate discard was not paid');
  }
}
function rootTargets(registry:Registry,state:DuelState,root:ChainLink){
  const handler=registry.spellHandlers[root.sourceAtActivation.definition.id]!.handler;
  const targeted=['discard-destroy-target-monster','discard-return-own-graveyard-monster','target-opposing-attack-to-defense'].includes(handler);
  check(root.targetRefs.length===(targeted?1:0),'Invalid candidate Spell target count');
  if(!targeted)return;
  const ref=root.targetRefs[0]!,c=state.cards[ref.instanceId],def=c&&registry.cards[c.definition.id];
  check(c&&(def?.kind==='normal-monster'||def?.kind==='effect-monster')&&same(c.location,ref.locationAtSelection),'Candidate target moved');
  if(handler==='discard-return-own-graveyard-monster')check(c.ownerId===root.controllerId&&c.location.kind==='graveyard'&&c.location.playerId===root.controllerId,'Invalid candidate recovery target');
  else{check(c.location.kind==='monster'&&c.id!==root.costEvents[0]?.affectedInstances[0],'Invalid candidate monster target');
    if(handler==='target-opposing-attack-to-defense')check(c.controllerId!==root.controllerId&&c.position==='face-up-attack','Invalid candidate position target');}
}

/** Shared atomic work for candidate and reviewed entry points. All costs are already
 * paid. Does not emit events, pay, resolve root effects or itself create a stable
 * DuelState. Only the separate live engine gate may authorize an activation.
 */
function prepare(registry:Registry,state:DuelState,reviewed:boolean){
  if(reviewed)check([FOUR_LINK_REVIEW,'reviewed-four-link-counter-patterns-v5'].includes(registry.counterContinuations[SEVEN]??''),'Unreviewed four-link resolution');
  check(state.chain.length===4&&state.timing.window==='resolving'&&state.timing.priorityPlayer===null&&state.timing.consecutivePasses===2
    &&state.timing.requestedPhase===null&&!state.result&&!state.pendingDecision&&!state.pendingTriggers.length
    &&state.chainCleanup===null&&state.spellResolution===null&&state.counterResolution===null&&state.trapCounterResolution===null&&state.fourLinkCounterResolution===null&&state.trapThreeSevenResolution===null,'Invalid four-link candidate context');
  const [root,magic,seven,top]=state.chain as readonly[ChainLink,ChainLink,ChainLink,ChainLink];
  const turn={...state.turn,phase:state.turn.phase as 'main1'|'main2'};
  graph(registry,root,magic,seven,top,turn,state.eventSequence,false,reviewed);zones(registry,state);costsStillPaid(state,root,magic);rootTargets(registry,state,root);
  for(const l of [root,magic,seven,top])check(same(state.cards[l.source],l.sourceAtActivation),'Candidate source no longer matches activation');
  const lpCosts=captureSevenLPCosts(registry,state);check(lpCosts.payments.length===2,'Two candidate Seven payments required');
  const players=structuredClone(state.players) as Mutable<DuelState['players']>,cards=structuredClone(state.cards);
  const destroy=(sourceId:string)=>{const c=cards[sourceId]!,loc=c.location;check(loc.kind==='spell-trap','Candidate source already moved');
    const controller=players.find(p=>p.id===c.controllerId)!,owner=players.find(p=>p.id===c.ownerId)!;
    controller.spellsTraps[loc.slot]=null;owner.graveyard.push(c.id);c.location={kind:'graveyard',playerId:owner.id};c.controllerId=owner.id;c.position='face-up';
  };
  destroy(seven.source);destroy(root.source);
  const board={players,cards},remainingChain=[structuredClone(magic)];
  const body:Omit<FourLinkCounterCandidateJournal,'integritySha256'>={version:1,kind:reviewed?'normal-spell-magic-seven-seven-v1':'normal-spell-magic-seven-seven-candidate-v1',duelId:state.id,registryRevision:registry.revision,turn,
    capturedStateVersion:state.stateVersion,capturedSequence:state.eventSequence,root:{...structuredClone(root),activationNegated:true},magic:structuredClone(magic),
    seven:{...structuredClone(seven),activationNegated:true},top:structuredClone(top),lpCosts,cleanupSourceIds:[magic.source,top.source],
    entryFingerprint:resolutionFingerprint(state),boardFingerprint:resolutionFingerprint({...state,...board,chain:remainingChain})};
  const journal=freeze({...body,integritySha256:digest(body)});
  assertCheckpoint(registry,{...state,...board,chain:remainingChain},journal,reviewed);
  return freeze({board,remainingChain,journal,steps:[{resolver:top.source,negatedDestroyedSkipped:seven.source},{resolver:magic.source,negatedDestroyedSkipped:root.source}]});
}

/** Shared server-owned checkpoint validation. Hashes detect drift, not authenticity.
 * The live parent separately owns the review gate, activation and private cleanup pause.
 */
function assertCheckpoint(registry:Registry,state:DuelState,j:FourLinkCounterCandidateJournal,reviewed:boolean){
  check(j.kind===(reviewed?'normal-spell-magic-seven-seven-v1':'normal-spell-magic-seven-seven-candidate-v1'),'Wrong four-link checkpoint kind');
  if(reviewed)check([FOUR_LINK_REVIEW,'reviewed-four-link-counter-patterns-v5'].includes(registry.counterContinuations[SEVEN]??''),'Unreviewed four-link checkpoint');
  check(Schema.safeParse(j).success,'Malformed four-link candidate journal');const {integritySha256,...body}=j;
  check(integritySha256===digest(body),'Four-link candidate journal changed');assertSevenLPCostHistory(j.lpCosts);
  check(state.format.id===registry.format.id&&state.format.revision===registry.format.revision&&registry.format.id==='goat-2005-08-17'&&registry.format.revision===4
    &&state.id===j.duelId&&state.cardRegistryRevision===j.registryRevision&&registry.revision===j.registryRevision&&same(state.turn,j.turn)
    &&Number.isSafeInteger(state.stateVersion)&&state.stateVersion>=j.capturedStateVersion&&Number.isSafeInteger(state.eventSequence)&&state.eventSequence>=j.capturedSequence
    &&state.timing.window==='resolving'&&state.timing.priorityPlayer===null&&state.timing.consecutivePasses===2&&state.timing.requestedPhase===null
    &&!state.result&&!state.pendingDecision&&!state.pendingTriggers.length&&state.chainCleanup===null&&state.spellResolution===null&&state.counterResolution===null&&state.trapCounterResolution===null&&state.fourLinkCounterResolution===null&&state.trapThreeSevenResolution===null
    &&same(state.chain,[j.magic])&&same(j.cleanupSourceIds,[j.magic.source,j.top.source])&&resolutionFingerprint(state)===j.boardFingerprint,'Four-link candidate checkpoint drift');
  graph(registry,j.root,j.magic,j.seven,j.top,j.turn,j.capturedSequence,true,reviewed);zones(registry,state);costsStillPaid(state,j.root,j.magic);rootTargets(registry,state,j.root);
  check(j.lpCosts.duelId===state.id&&j.lpCosts.registryRevision===registry.revision&&same(j.lpCosts.turn,state.turn)
    &&same(j.lpCosts.playerIds,state.players.map(p=>p.id))&&j.lpCosts.capturedStateVersion===j.capturedStateVersion&&j.lpCosts.capturedSequence===j.capturedSequence,'Candidate LP context drift');
  check(same(j.lpCosts.payments,[j.seven,j.top].map(l=>{const e=l.costEvents[0]!,d=e.details!;return{linkId:l.id,sourceId:l.source,playerId:l.controllerId,sequence:e.sequence,simultaneousGroup:e.simultaneousGroup,amount:d.amount,beforeLP:d.beforeLP,afterLP:d.afterLP};})),'Candidate LP receipts changed');
  for(const b of j.lpCosts.balances)check(state.players.find(p=>p.id===b.playerId)?.lifePoints===b.afterLastLP,'Candidate LP changed');
  for(const l of [j.magic,j.top])check(same(state.cards[l.source],l.sourceAtActivation),'Candidate surviving source changed');
  for(const l of [j.root,j.seven])check(same(state.cards[l.source],{...l.sourceAtActivation,location:{kind:'graveyard',playerId:l.sourceAtActivation.ownerId},controllerId:l.sourceAtActivation.ownerId,position:'face-up'}),'Candidate destroyed source changed');
}

/** Frozen candidate API: old effect ID and no activation permission. */
export const prepareFourLinkCounterCandidate=(registry:Registry,state:DuelState)=>prepare(registry,state,false);
export const assertFourLinkCounterCandidate=(registry:Registry,state:DuelState,j:FourLinkCounterCandidateJournal)=>assertCheckpoint(registry,state,j,false);
/** Live gate remains separate; these entry points additionally demand the active v4 review. */
export const prepareFourLinkCounterResolution=(registry:Registry,state:DuelState)=>prepare(registry,state,true);
export const assertFourLinkCounterResolution=(registry:Registry,state:DuelState,j:FourLinkCounterJournal)=>assertCheckpoint(registry,state,j,true);
