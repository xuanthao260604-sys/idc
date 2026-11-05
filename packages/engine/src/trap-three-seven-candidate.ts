import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {ChainLink,DuelState,EventRef,TrapThreeSevenJournal} from '../../protocol/src/duel.js';
import type {Registry} from './registry.js';
import {freeze} from './registry.js';
import {FieldActivationLinkSchema} from './counter-continuation.js';
import {reviewedTrapHoleRootValid,SEVEN_RESPONSE_EFFECT_ID} from './trap-counter-continuation.js';
import {SevenLPCostEventSchema} from './seven-lp-cost-ledger.js';
import {definitionFingerprint} from './spell-review.js';
import {resolutionFingerprint} from './resolution-fingerprint.js';
import {captureThreeSevenLPCosts,assertThreeSevenLPCostHistory} from './three-seven-lp-cost-ledger.js';
import type {ThreeSevenLPCostLedger} from './three-seven-lp-cost-ledger.js';

export const THREE_SEVEN_CANDIDATE_EFFECT_ID='pay-1000-negate-second-seven-after-trap-hole-candidate-v1';
export const THREE_SEVEN_EFFECT_ID='pay-1000-negate-second-seven-after-trap-hole-v1';
export const THREE_SEVEN_REVIEW='reviewed-four-link-counter-patterns-v5';
const SEVEN='official:03819470',PIN='2dbc5c07956ac97d58b2f449898bf2d73bd0488578b9c69c0fadd5e468accbc0';
const id=z.string().min(1),integer=z.number().int().nonnegative().safe(),sha=z.string().regex(/^[a-f0-9]{64}$/);
const Occurrence=z.strictObject({sequence:integer.positive(),simultaneousGroup:id,kind:z.literal('monster-summoned'),affectedInstances:z.array(id).length(1),details:z.record(id,z.union([z.string(),z.number().finite(),z.boolean()])).optional()});
const Schema=z.strictObject({version:z.literal(1),kind:z.enum(['trap-hole-three-seven-candidate-v1','trap-hole-three-seven-v1']),duelId:id,registryRevision:id,
  turn:z.strictObject({number:integer.positive(),activePlayer:id,phase:z.enum(['main1','main2'])}),capturedSequence:integer.positive(),capturedStateVersion:integer,
  root:FieldActivationLinkSchema,first:FieldActivationLinkSchema,middle:FieldActivationLinkSchema,top:FieldActivationLinkSchema,occurrence:Occurrence,
  lpCosts:z.unknown(),cleanupSourceIds:z.tuple([id,id]),entryFingerprint:sha,boardFingerprint:sha,integritySha256:sha});
export type TrapThreeSevenCandidateJournal=TrapThreeSevenJournal;
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
function check(v:unknown,m:string):asserts v{if(!v)throw new Error(m);}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const digest=(body:Omit<TrapThreeSevenCandidateJournal,'integritySha256'>)=>createHash('sha256').update(JSON.stringify(body)).digest('hex');
function zones(registry:Registry,state:DuelState){const seen=new Set<string>();for(const p of state.players){
  check(p.monsters.length===5&&p.spellsTraps.length===5&&p.field===null&&!p.banished.length&&!p.fusionDeck.length,'Unsupported candidate zones');
  const visit=(key:string,kind:string,slot?:number)=>{const c=state.cards[key],def=c&&registry.cards[c.definition.id];check(c&&c.id===key&&!seen.has(key)&&def&&c.definition.revision===def.revision
    &&state.players.some(p=>p.id===c.ownerId)&&c.controllerId===p.id&&same(c.location,{kind,playerId:p.id,...(slot===undefined?{}:{slot})}),'Candidate zone drift');if(slot===undefined)check(c.ownerId===p.id,'Candidate off-field ownership');seen.add(key);};
  for(const kind of ['deck','hand','graveyard']as const)for(const key of p[kind])visit(key,kind);p.monsters.forEach((key,slot)=>{if(key!==null)visit(key,'monster',slot);});p.spellsTraps.forEach((key,slot)=>{if(key!==null)visit(key,'spell-trap',slot);});
}check(seen.size===Object.keys(state.cards).length,'Unreferenced candidate card');}
function graph(registry:Registry,state:DuelState,root:ChainLink,first:ChainLink,middle:ChainLink,top:ChainLink,event:EventRef,spent:boolean,reviewed=false){
  check(FieldActivationLinkSchema.safeParse(root).success&&Occurrence.safeParse(event).success&&root.activationNegated===spent,'Invalid three-Seven root history');
  // Original activation history and the real current destroyed source are checked
  // together; no LP or board is reconstructed to bypass a live-state guard.
  check(reviewedTrapHoleRootValid(registry,state,root,event,false,spent),'Invalid original Trap Hole target/activation');
  const links=[root,first,middle,top];check(new Set(links.map(l=>l.id)).size===4&&new Set(links.map(l=>l.source)).size===4,'Duplicate three-Seven identity');
  for(const l of [first,middle,top])check(FieldActivationLinkSchema.safeParse(l).success&&l.sourceAtActivation.definition.id===SEVEN&&l.sourceAtActivation.definition.revision===registry.cards[SEVEN]!.revision
    &&definitionFingerprint(registry.cards[SEVEN]!)===PIN&&l.source===l.sourceAtActivation.id&&l.controllerId===l.sourceAtActivation.controllerId&&l.sourceAtActivation.location.playerId===l.controllerId
    &&l.costEvents.length===1&&SevenLPCostEventSchema.safeParse(l.costEvents[0]).success&&l.costEvents[0]!.details!.playerId===l.controllerId&&l.spellSpeed===3&&!l.targetRefs.length&&!l.effectNegated&&l.sourceAtActivation.markers.setOnTurn!==null&&l.sourceAtActivation.markers.setOnTurn<state.turn.number,'Invalid three-Seven source history');
  check(first.effectId==='pay-1000-negate-trap-hole-activation'&&first.respondingToLinkId===root.id&&!first.activationNegated
    &&middle.effectId===SEVEN_RESPONSE_EFFECT_ID&&middle.respondingToLinkId===first.id&&middle.activationNegated===spent
    &&top.effectId===(reviewed?THREE_SEVEN_EFFECT_ID:THREE_SEVEN_CANDIDATE_EFFECT_ID)&&top.respondingToLinkId===middle.id&&!top.activationNegated,'Invalid three-Seven response graph');
  check(event.sequence<first.costEvents[0]!.sequence,'Summon must precede all costs');
}
/** Shared atomic work; all three costs have already been paid. No activation,
 * event emission or gameplay permission is provided here; the live parent owns those.
 */
function prepare(registry:Registry,state:DuelState,reviewed:boolean){
  if(reviewed)check(registry.counterContinuations[SEVEN]===THREE_SEVEN_REVIEW,'Unreviewed three-Seven resolution');
  check(state.timing.lastRelevantEvents.length===1&&state.chain.length===4&&state.timing.window==='resolving'&&state.timing.priorityPlayer===null&&state.timing.consecutivePasses===2,'Invalid candidate timing');
  const[root,first,middle,top]=state.chain as readonly[ChainLink,ChainLink,ChainLink,ChainLink],event=state.timing.lastRelevantEvents[0]!;
  graph(registry,state,root,first,middle,top,event,false,reviewed);zones(registry,state);for(const l of state.chain)check(same(state.cards[l.source],l.sourceAtActivation),'Candidate live source drift');
  const lpCosts=captureThreeSevenLPCosts(registry,state),players=structuredClone(state.players)as Mutable<DuelState['players']>,cards=structuredClone(state.cards);
  const destroy=(source:string)=>{const c=cards[source]!,loc=c.location;check(loc.kind==='spell-trap','Candidate source already destroyed');const owner=players.find(p=>p.id===c.ownerId)!,controller=players.find(p=>p.id===c.controllerId)!;
    controller.spellsTraps[loc.slot]=null;owner.graveyard.push(c.id);c.location={kind:'graveyard',playerId:owner.id};c.controllerId=owner.id;c.position='face-up';};
  destroy(middle.source);destroy(root.source);const board={players,cards},remainingChain=[structuredClone(first)];
  const body:Omit<TrapThreeSevenCandidateJournal,'integritySha256'>={version:1,kind:reviewed?'trap-hole-three-seven-v1':'trap-hole-three-seven-candidate-v1',duelId:state.id,registryRevision:registry.revision,
    turn:{...state.turn,phase:state.turn.phase as 'main1'|'main2'},capturedSequence:state.eventSequence,capturedStateVersion:state.stateVersion,
    root:{...structuredClone(root),activationNegated:true},first:structuredClone(first),middle:{...structuredClone(middle),activationNegated:true},top:structuredClone(top),occurrence:structuredClone(event),lpCosts,
    cleanupSourceIds:[first.source,top.source],entryFingerprint:resolutionFingerprint(state),boardFingerprint:resolutionFingerprint({...state,...board,chain:remainingChain})};
  const journal=freeze({...body,integritySha256:digest(body)});assertCheckpoint(registry,{...state,...board,chain:remainingChain},journal,reviewed);
  return freeze({board,remainingChain,journal,steps:[{resolver:top.source,negatedDestroyedSkipped:middle.source},{resolver:first.source,negatedDestroyedSkipped:root.source}]});
}
function assertCheckpoint(registry:Registry,state:DuelState,j:TrapThreeSevenCandidateJournal,reviewed:boolean){
  check(j.kind===(reviewed?'trap-hole-three-seven-v1':'trap-hole-three-seven-candidate-v1'),'Wrong three-Seven checkpoint kind');
  if(reviewed)check(registry.counterContinuations[SEVEN]===THREE_SEVEN_REVIEW,'Unreviewed three-Seven checkpoint');
  check(Schema.safeParse(j).success,'Malformed Trap three-Seven journal');const{integritySha256,...body}=j;check(integritySha256===digest(body),'Trap three-Seven journal changed');assertThreeSevenLPCostHistory(j.lpCosts);
  check(state.format.id===registry.format.id&&state.format.revision===registry.format.revision&&registry.format.id==='goat-2005-08-17'&&registry.format.revision===4
    &&state.id===j.duelId&&state.cardRegistryRevision===j.registryRevision&&registry.revision===j.registryRevision&&same(state.turn,j.turn)
    &&Number.isSafeInteger(state.stateVersion)&&state.stateVersion>=j.capturedStateVersion&&Number.isSafeInteger(state.eventSequence)&&state.eventSequence>=j.capturedSequence
    &&state.timing.window==='resolving'&&state.timing.priorityPlayer===null&&state.timing.consecutivePasses===2&&state.timing.requestedPhase===null
    &&!state.result&&!state.pendingDecision&&!state.pendingTriggers.length&&state.chainCleanup===null&&state.spellResolution===null&&state.counterResolution===null&&state.trapCounterResolution===null&&state.fourLinkCounterResolution===null&&state.trapThreeSevenResolution===null
    &&(same(state.timing.lastRelevantEvents,[j.occurrence])||(reviewed&&state.eventSequence>j.capturedSequence))&&same(state.chain,[j.first])&&same(j.cleanupSourceIds,[j.first.source,j.top.source])&&resolutionFingerprint(state)===j.boardFingerprint,'Trap three-Seven checkpoint drift');
  check(j.lpCosts.duelId===state.id&&j.lpCosts.registryRevision===registry.revision&&same(j.lpCosts.turn,state.turn)&&same(j.lpCosts.playerIds,state.players.map(p=>p.id))
    &&j.lpCosts.capturedStateVersion===j.capturedStateVersion&&j.lpCosts.capturedSequence===j.capturedSequence,'Three-Seven ledger context drift');
  const expected=[j.first,j.middle,j.top].map(l=>{const e=l.costEvents[0]!,d=e.details!;return{linkId:l.id,sourceId:l.source,playerId:l.controllerId,sequence:e.sequence,simultaneousGroup:e.simultaneousGroup,amount:d.amount,beforeLP:d.beforeLP,afterLP:d.afterLP};});
  check(same(j.lpCosts.payments,expected),'Three-Seven receipts do not match links');for(const b of j.lpCosts.balances)check(state.players.find(p=>p.id===b.playerId)?.lifePoints===b.afterLastLP,'Three-Seven paid LP drift');
  graph(registry,state,j.root,j.first,j.middle,j.top,j.occurrence,true,reviewed);zones(registry,state);
  for(const l of [j.first,j.top])check(same(state.cards[l.source],l.sourceAtActivation),'Surviving candidate source drift');
  for(const l of [j.root,j.middle])check(same(state.cards[l.source],{...l.sourceAtActivation,location:{kind:'graveyard',playerId:l.sourceAtActivation.ownerId},controllerId:l.sourceAtActivation.ownerId,position:'face-up'}),'Destroyed candidate source drift');
}

/** Frozen candidate API; never authorizes a live activation. */
export const prepareTrapThreeSevenCandidate=(r:Registry,s:DuelState)=>prepare(r,s,false);
export const assertTrapThreeSevenCandidate=(r:Registry,s:DuelState,j:TrapThreeSevenCandidateJournal)=>assertCheckpoint(r,s,j,false);
/** Reviewed entry points; the live parent owns activation, events and cleanup pause. */
export const prepareTrapThreeSevenResolution=(r:Registry,s:DuelState)=>prepare(r,s,true);
export const assertTrapThreeSevenResolution=(r:Registry,s:DuelState,j:TrapThreeSevenJournal)=>assertCheckpoint(r,s,j,true);
