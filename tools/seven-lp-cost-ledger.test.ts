import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupCounterPrefix } from './fixtures/three-link.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { captureSevenLPCosts, assertCurrentSevenLPCosts, assertSevenLPCostHistory } from '../packages/engine/src/seven-lp-cost-ledger.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
const {registry}=loadRuntimeCatalog(),SEVEN='official:03819470';
function act(state:DuelState,who:string,action:EngineAction){const r=applyAction(registry,state,{actorId:who,expectedStateVersion:state.stateVersion,action});if(!r.accepted)throw new Error(r.message);return r.state;}
function single(actor='a',selfMagic=false,selfSeven=false,root='official:84257639') {
  const f=setupCounterPrefix(registry,root,actor,selfMagic,selfSeven,'main1',false,1001);
  const state=act(f.state,f.sevenOwner,{type:'activate-lp-counter-trap',instanceId:f.seven,respondingToLinkId:f.state.chain[1]!.id});
  return{...f,state};
}
// Candidate two-Seven receipts only. The first two links are accepted gameplay.
// The third activation is explicitly rejected before the test prepares its receipt.
function two(actor='a',samePlayer=false,largeLP=false,resolving=false) {
  const other=actor==='a'?'b':'a',secondOwner=samePlayer?actor:other;
  const deck=[...Object.keys(registry.cards),SEVEN];
  const initial=structuredClone(createDuel(registry,{duelId:'seven-cost-ledger',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:actor,seedHex:'d3'.repeat(32)}).state) as Mutable<DuelState>;
  for(const p of initial.players)for(const id of p.hand.splice(0)){p.deck.push(id);initial.cards[id]!.location={kind:'deck',playerId:p.id};}
  initial.turn={number:3,activePlayer:actor,phase:actor==='a'?'main1':'main2'};
  initial.timing={...initial.timing,window:'open',priorityPlayer:actor,consecutivePasses:0};
  const move=(def:string,owner:string,zone:'hand'|'spell-trap',slot:Slot=0)=>{
    const p=initial.players.find(p=>p.id===owner)!,id=p.deck.find(id=>initial.cards[id]!.definition.id===def)!;p.deck.splice(p.deck.indexOf(id),1);
    const c=initial.cards[id]!;c.position='face-down';if(zone==='hand'){p.hand.push(id);c.location={kind:zone,playerId:owner};}
    else{p.spellsTraps[slot]=id;c.location={kind:zone,playerId:owner,slot};c.markers.setOnTurn=2;}return id;
  };
  const monster=move('official:05053103',actor,'hand'),trap=move('official:04206964',other,'spell-trap'),first=move(SEVEN,actor,'spell-trap',4),second=move(SEVEN,secondOwner,'spell-trap',3);
  initial.players.find(p=>p.id===actor)!.lifePoints=largeLP?8000:samePlayer?2001:1001;
  if(!samePlayer)initial.players.find(p=>p.id===other)!.lifePoints=largeLP?8000:1001;
  let accepted=act(initial,actor,{type:'normal-summon',instanceId:monster,slot:0,tributeIds:[]});accepted=act(accepted,actor,{type:'pass'});
  accepted=act(accepted,other,{type:'activate-trap',instanceId:trap,targetId:monster});
  accepted=act(accepted,actor,{type:'activate-lp-counter-trap',instanceId:first,respondingToLinkId:accepted.chain[0]!.id});
  if(accepted.timing.priorityPlayer!==secondOwner)accepted=act(accepted,accepted.timing.priorityPlayer!,{type:'pass'});
  const denied=applyAction(registry,accepted,{actorId:secondOwner,expectedStateVersion:accepted.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:second,respondingToLinkId:accepted.chain[1]!.id}});
  expect(denied.accepted).toBe(false);expect(denied.state).toBe(accepted);
  const state=structuredClone(accepted) as Mutable<DuelState>,payer=state.players.find(p=>p.id===secondOwner)!,beforeLP=payer.lifePoints,seq=state.eventSequence+1;
  payer.lifePoints-=1000;state.cards[second]!.position='face-up';state.chain.push({id:'candidate-seven-response',source:second,controllerId:secondOwner,
    sourceAtActivation:structuredClone(state.cards[second]!),effectId:'pay-1000-negate-seven-tools-activation-v1',spellSpeed:3,targetRefs:[],respondingToLinkId:state.chain[1]!.id,
    activationNegated:false,effectNegated:false,costEvents:[{sequence:seq,simultaneousGroup:'candidate-payment-'+seq,kind:'life-points-paid',affectedInstances:[],
      details:{playerId:secondOwner,reason:'activation-cost',amount:1000,beforeLP,afterLP:payer.lifePoints}}]});
  state.eventSequence=seq+1;state.timing={...state.timing,window:resolving?'resolving':'chain-response',priorityPlayer:resolving?null:(secondOwner===actor?other:actor),consecutivePasses:resolving?2:0};
  return{state,accepted,actor,other,secondOwner,monster,trap,first,second};
}
function capture(state:DuelState){const before=structuredClone(state),ledger=captureSevenLPCosts(registry,state);expect(state).toEqual(before);assertCurrentSevenLPCosts(registry,state,ledger);return ledger;}
describe('isolated Seven LP accounting component, not an activation permission',()=>{
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(selfMagic=>[false,true].map(selfSeven=>({actor,selfMagic,selfSeven})))))(
    'captures one real payment: $actor MagicSelf=$selfMagic SevenSelf=$selfSeven',o=>{
      const f=single(o.actor,o.selfMagic,o.selfSeven),l=capture(f.state);
      expect(l.payments).toHaveLength(1);expect(l.balances).toEqual([{playerId:f.sevenOwner,beforeFirstLP:1001,afterLastLP:1,paymentCount:1,totalPaid:1000}]);
      expect(l.payments[0]!.sourceId).toBe(f.seven);expect(Object.isFrozen(l.payments[0])).toBe(true);
    });
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(same=>[false,true].flatMap(large=>([false,true].map(resolving=>({actor,same,large,resolving})))))))(
    'two candidate receipts: $actor samePlayer=$same large=$large resolving=$resolving',o=>{
      const f=two(o.actor,o.same,o.large,o.resolving),l=capture(f.state);
      expect(()=>assertDuelInvariants(f.state,registry)).toThrow(); // Still not supported gameplay.
      expect(l.payments.map(p=>p.sourceId)).toEqual([f.first,f.second]);expect(l.payments.map(p=>p.amount)).toEqual([1000,1000]);
      expect(l.balances.reduce((n,b)=>n+b.totalPaid,0)).toBe(2000);
      if(o.same)expect(l.balances).toEqual([{playerId:f.actor,beforeFirstLP:o.large?8000:2001,afterLastLP:o.large?6000:1,paymentCount:2,totalPaid:2000}]);
      else{expect(l.balances).toHaveLength(2);for(const b of l.balances)expect(b).toMatchObject({beforeFirstLP:o.large?8000:1001,afterLastLP:o.large?7000:1,paymentCount:1,totalPaid:1000});}
      const restored=JSON.parse(JSON.stringify(l));assertSevenLPCostHistory(restored);assertCurrentSevenLPCosts(registry,f.state,restored);
      expect(Object.isFrozen(restored.payments[0])).toBe(false); // Assertions never freeze caller objects.
      expect(f.state.cards[f.monster]!.location.kind).toBe('monster');expect(f.state.cards[f.trap]!.location.kind).toBe('spell-trap');
    });
  it.each(['lp-drift','wrong-amount','same-sequence','backwards-sequence','duplicate-link','duplicate-source','set-this-turn','face-down','wrong-snapshot','unknown-owner',
    'wrong-registry','affected-card','extra-cost-field','foreign-lp-source','three-payments','no-payment','pending-decision','result','bad-priority','bad-passes','negative-version','bad-turn','bad-set-marker','active-player-object'])(
    'rejects %s atomically without paying/moving/freezing input',mode=>{
      const f=two('a',true),s=f.state,link=s.chain[2]!,event=link.costEvents[0]!;
      if(mode==='lp-drift')s.players[0].lifePoints++;if(mode==='wrong-amount')event.details!.amount=999;
      if(mode==='same-sequence')event.sequence=s.chain[1]!.costEvents[0]!.sequence;if(mode==='backwards-sequence')event.sequence=1;
      if(mode==='duplicate-link')link.id=s.chain[1]!.id;if(mode==='duplicate-source')s.chain[2]=structuredClone(s.chain[1]!);
      if(mode==='set-this-turn'){s.cards[f.second]!.markers.setOnTurn=3;link.sourceAtActivation.markers.setOnTurn=3;}
      if(mode==='face-down'){s.cards[f.second]!.position='face-down';link.sourceAtActivation.position='face-down';}
      if(mode==='wrong-snapshot')link.sourceAtActivation.id='bad';if(mode==='unknown-owner'){s.cards[f.second]!.ownerId='bad';link.sourceAtActivation.ownerId='bad';}
      if(mode==='wrong-registry')s.cardRegistryRevision='old';if(mode==='affected-card')event.affectedInstances.push(f.monster);
      if(mode==='extra-cost-field')event.details!.discount=0;if(mode==='foreign-lp-source'){s.chain[0]!.costEvents.push(structuredClone(event));}
      if(mode==='three-payments')s.chain.push(structuredClone(s.chain[2]!));if(mode==='no-payment')s.chain=s.chain.slice(0,1);
      if(mode==='pending-decision')s.pendingDecision={id:'other',kind:'discard',playerId:'a',optionIds:[],min:0,max:0};
      if(mode==='result')s.result={winner:'a',reason:'concession'};if(mode==='bad-priority')s.timing.priorityPlayer=null;if(mode==='bad-passes')s.timing.consecutivePasses=2;
      if(mode==='negative-version')s.stateVersion=-1;if(mode==='bad-turn')s.turn.number=NaN;if(mode==='bad-set-marker'){s.cards[f.second]!.markers.setOnTurn=-1;link.sourceAtActivation.markers.setOnTurn=-1;}
      if(mode==='active-player-object')s.turn.activePlayer={invalid:true} as any;
      const before=structuredClone(s);expect(()=>captureSevenLPCosts(registry,s)).toThrow();expect(s).toEqual(before);expect(Object.isFrozen(s.cards[f.second])).toBe(false);
      if(mode==='active-player-object')expect(Object.isFrozen(s.turn.activePlayer)).toBe(false);
    });
  it('rejects a gap in same-player payments even when the final LP and each individual subtraction match',()=>{
    const f=two('a',true),s=f.state,e=s.chain[2]!.costEvents[0]!;e.details!.beforeLP=2001;e.details!.afterLP=1001;s.players[0].lifePoints=1001;
    expect(()=>captureSevenLPCosts(registry,s)).toThrow(/Gap/);
  });
  it.each(['amount','sequence','source','balance','extra','pin'])('detects modified %s in a stored ledger without freezing it',mode=>{
    const l=structuredClone(capture(two().state)) as any;
    if(mode==='amount')l.payments[0].amount=1;if(mode==='sequence')l.payments[1].sequence=l.payments[0].sequence;
    if(mode==='source')l.payments[1].sourceId=l.payments[0].sourceId;if(mode==='balance')l.balances[0].totalPaid=1;
    if(mode==='extra')l.unknown=true;if(mode==='pin')l.definitionSha256='0'.repeat(64);
    const before=structuredClone(l);expect(()=>assertSevenLPCostHistory(l)).toThrow();expect(l).toEqual(before);expect(Object.isFrozen(l.payments)).toBe(false);
  });
  it('checks chronology and per-player continuity even if a trusted test recomputes the integrity hash',()=>{
    const l=structuredClone(capture(two('a',true).state)) as any;l.payments[1].beforeLP=2001;l.payments[1].afterLP=1001;
    const {integritySha256:_old,...body}=l;l.integritySha256=createHash('sha256').update(JSON.stringify(body)).digest('hex');expect(()=>assertSevenLPCostHistory(l)).toThrow(/Gap/);
  });
  it('keeps payment history after real Dian Keto heals, but rejects the old live-board binding',()=>{
    const f=single(),l=capture(f.state);let s=act(f.state,f.state.timing.priorityPlayer!,{type:'pass'});s=act(s,s.timing.priorityPlayer!,{type:'pass'});
    expect(s.players.find(p=>p.id===f.sevenOwner)!.lifePoints).toBe(1001);expect(s.pendingDecision!.kind).toBe('cleanup-order');
    assertSevenLPCostHistory(l);expect(l.payments[0]).toMatchObject({beforeLP:1001,afterLP:1,amount:1000});expect(()=>assertCurrentSevenLPCosts(registry,s,l)).toThrow();
  });
  it('allows an ordinary Pass clock advance without changing a captured live board',()=>{
    const f=single(),l=capture(f.state),s=act(f.state,f.state.timing.priorityPlayer!,{type:'pass'});assertCurrentSevenLPCosts(registry,s,l);
    const before=structuredClone(s),bad={...s,eventSequence:l.capturedSequence-1};expect(()=>assertCurrentSevenLPCosts(registry,bad,l)).toThrow();expect(s).toEqual(before);
  });
});
