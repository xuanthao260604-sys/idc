import { describe,it,expect } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupBoundedCounterCandidate } from './fixtures/bounded-counter-candidate.js';
import { boundedCounterOracle } from './fixtures/bounded-counter-oracle.js';
import { BOUNDED_SEVEN_EFFECT_ID,BOUNDED_SEVEN_CANDIDATE_EFFECT } from '../packages/engine/src/bounded-counter-graph.js';
import { resolveStagedBoundedCounter,resumeStagedBoundedCounter,assertDuelInvariants,applyAction } from '../packages/engine/src/duel.js';
import { assertCurrentBoundedCounterFrame } from '../packages/engine/src/bounded-counter-frame.js';
import type { StagedBoundedCounterResult,EngineEvent } from '../packages/engine/src/duel.js';
import type { Slot } from '../packages/protocol/src/duel.js';
const runtime=loadRuntimeCatalog(),{registry}=runtime;
const review={...runtime.effectReviews.counters.find(r=>r.cardId==='official:03819470')!,revision:6,scope:'counter-trap-reviewed-bounded-patterns-v6',continuation:'reviewed-bounded-counter-patterns-v6'};
/** Synthetic PREPAID entry, not live activation. Only tests assign staged IDs. */
function fixture(o:Parameters<typeof setupBoundedCounterCandidate>[1]={}) {
  const f=setupBoundedCounterCandidate(registry,o);for(const l of f.state.chain)if(l.effectId===BOUNDED_SEVEN_CANDIDATE_EFFECT)l.effectId=BOUNDED_SEVEN_EFFECT_ID;
  f.state.timing={...f.state.timing,window:'resolving',priorityPlayer:null,consecutivePasses:2};return f;
}
function finish(p:StagedBoundedCounterResult,reverse=false) {
  const events:EngineEvent[]=[...p.events];let choices=0;
  while(p.frame){expect(++choices).toBeLessThan(5);assertCurrentBoundedCounterFrame(registry,p.state,p.frame,review);
    const d=p.state.pendingDecision!;expect(d).not.toBeNull();const before=structuredClone(p.state),version=p.state.stateVersion;
    const r=resumeStagedBoundedCounter(registry,p.state,p.frame,review,{actorId:d.playerId,expectedStateVersion:version,action:{type:'answer-decision',decisionId:d.id,optionIds:d.kind==='effect-choice'?[d.optionIds.at(-1)!]:reverse?[...d.optionIds].reverse():[...d.optionIds]}});
    expect(r.accepted).toBe(true);if(!r.accepted)throw Error(r.message);expect(p.state).toEqual(before);expect(r.state.stateVersion).toBe(version+1);
    events.push(...r.events);p=r;
  }
  assertDuelInvariants(p.state,registry);expect(p.state.chain).toEqual([]);expect(p.state.pendingDecision).toBeNull();expect(p.state.chainCleanup).toBeNull();
  expect(events.map(e=>e.sequence)).toEqual(Array.from({length:events.length},(_,i)=>events[0]!.sequence+i));
  expect(new Set(events.map(e=>e.simultaneousGroup)).size).toBe(events.length);
  expect(events.some(e=>e.kind==='life-points-paid'||e.kind==='cards-discarded')).toBe(false);
  return{...p,events,choices};
}
function tie(s:ReturnType<typeof fixture>['state']) {
  const p=s.players.find(p=>p.id!==s.turn.activePlayer)!,def=registry.cards[s.cards[p.monsters[0]!]!.definition.id]!;
  const id=p.deck.find(id=>registry.cards[s.cards[id]!.definition.id]!.kind==='normal-monster')!,c=s.cards[id]!;
  p.deck.splice(p.deck.indexOf(id),1);c.definition={id:def.id,revision:def.revision};const slot=p.monsters.indexOf(null) as Slot;p.monsters[slot]=id;c.location={kind:'monster',playerId:p.id,slot};c.position='face-up-attack';return id;
}
const seq=Array.from({length:7},(_,n)=>Array.from({length:2**n},(_,bits)=>Array.from({length:n},(_,i)=>bits&(1<<i)?'a':'b'))).flat().filter(s=>s.filter(x=>x==='a').length<=3&&s.filter(x=>x==='b').length<=3);
const traps=['a','b'].flatMap(actor=>[1,2,3].flatMap(traps=>seq.filter(s=>traps+s.filter(x=>x!==actor).length<=5).map(owners=>({actor,traps,owners}))));
const spells=['a','b'].flatMap(actor=>['a','b'].flatMap(magicOwner=>seq.map(owners=>({actor,magicOwner,owners}))));
describe('bounded parent, real engine handlers/events with staged entry and sidecar frame',()=>{
  it.each(traps)('resolves Trap prefix $actor/$traps/$owners against independent oracle',o=>{
    const f=fixture({...o,phase:o.actor==='a'?'main1':'main2'}),original=structuredClone(f.state),oracle=boundedCounterOracle(f.state.chain);
    const p=resolveStagedBoundedCounter(registry,f.state,review);expect(p.state.stateVersion).toBe(original.stateVersion+1);
    const end=finish(p,true),id=(source:string)=>original.chain.find(l=>l.source===source)!.id;
    expect(end.events.filter(e=>e.kind==='chain-link-resolving').map(e=>id(e.affectedInstances[0]!))).toEqual(oracle.resolved);
    expect(end.events.filter(e=>e.kind==='trap-activation-negated').map(e=>id(e.affectedInstances[0]!))).toEqual(oracle.negated);
    expect(end.state.cards[f.target]!.location.kind).toBe(o.traps===1&&o.owners.length%2?'monster':'graveyard');
    expect(end.events.filter(e=>e.kind==='effect-destroyed'&&e.affectedInstances.includes(f.target))).toHaveLength(o.traps===1&&o.owners.length%2?0:1);
    expect(end.state.players.map(p=>p.lifePoints)).toEqual(original.players.map(p=>p.lifePoints));expect(f.state).toEqual(original);
    for(const l of original.chain)expect(end.state.players.flatMap(p=>p.graveyard).filter(id=>id===l.source)).toHaveLength(1);
  });
  it.each(spells)('resolves Spell $actor/Magic $magicOwner/Seven $owners once',o=>{
    const f=fixture({...o,spellId:'official:55144522',phase:o.actor==='a'?'main1':'main2'}),before=structuredClone(f.state),oracle=boundedCounterOracle(f.state.chain);
    const p=resolveStagedBoundedCounter(registry,f.state,review);expect(p.state.stateVersion).toBe(before.stateVersion+1);const end=finish(p,true),id=(source:string)=>before.chain.find(l=>l.source===source)!.id;
    expect(end.events.filter(e=>e.kind==='chain-link-resolving').map(e=>id(e.affectedInstances[0]!))).toEqual(oracle.resolved);
    expect(end.events.filter(e=>e.kind.endsWith('-activation-negated')).map(e=>id(e.affectedInstances[0]!))).toEqual(oracle.negated);
    const a=before.players.find(p=>p.id===o.actor)!,b=end.state.players.find(p=>p.id===o.actor)!;
    expect(b.hand.length-a.hand.length).toBe(o.owners.length%2?2:0);expect(a.deck.length-b.deck.length).toBe(o.owners.length%2?2:0);
    expect(end.state.players.map(p=>p.lifePoints)).toEqual(before.players.map(p=>p.lifePoints));expect(f.state).toEqual(before);
    for(const p of before.players)expect(end.state.players.find(q=>q.id===p.id)!.graveyard.slice(0,p.graveyard.length)).toEqual(p.graveyard);
  });
  it.each(Object.keys(registry.spellHandlers).flatMap(spellId=>[1,2,5,6].map(n=>({spellId,n}))))('runs reviewed plan $spellId/$n without re-paying activation',({spellId,n})=>{
    const f=fixture({spellId,owners:Array.from({length:n},(_,i)=>i%2?'b':'a')}),before=structuredClone(f.state),end=finish(resolveStagedBoundedCounter(registry,f.state,review));
    const root=before.chain[0]!,resolved=!!(n%2);expect(end.events.filter(e=>e.kind==='chain-link-resolving'&&e.affectedInstances.includes(root.source))).toHaveLength(resolved?1:0);
    if(spellId==='official:84257639')expect(end.state.players.find(p=>p.id==='a')!.lifePoints-before.players.find(p=>p.id==='a')!.lifePoints).toBe(resolved?1000:0);
    if(spellId==='official:74848038'&&resolved)expect(end.state.cards[root.targetRefs[0]!.instanceId]!.location.kind).toBe('hand');
    if(spellId==='official:79759861'&&resolved)expect(end.state.cards[root.targetRefs[0]!.instanceId]!.location.kind).toBe('graveyard');
    expect(f.state).toEqual(before);
  });
  it.each(['official:66788016','official:97169186','official:26412047'])('pauses and resumes root choice %s with one root effect',spellId=>{
    const f=fixture({spellId,owners:['a']}),extra=tie(f.state),p=resolveStagedBoundedCounter(registry,f.state,review);
    expect(p.frame?.stage).toBe('root-choice');expect(p.state.pendingDecision!.optionIds).toContain(extra);
    const end=finish(p,true);expect(end.events.filter(e=>e.kind==='effect-destroyed')).toHaveLength(1);
    expect(end.events.filter(e=>e.kind==='chain-link-resolving'&&e.affectedInstances.includes(f.state.chain[0]!.source))).toHaveLength(1);
  });
  it.each(['a','b'].flatMap(actor=>[0,1,2].map(remaining=>({actor,remaining}))))('handles required draw $actor/$remaining without post-game owner cleanup',({actor,remaining})=>{
    const f=fixture({spellId:'official:55144522',actor,owners:[actor]}),p=f.state.players.find(p=>p.id===actor)!;
    for(const id of p.deck.splice(remaining)){p.graveyard.push(id);f.state.cards[id]!.location={kind:'graveyard',playerId:p.id};f.state.cards[id]!.position='face-up';}
    const end=finish(resolveStagedBoundedCounter(registry,f.state,review));expect(end.events.filter(e=>e.kind==='card-drawn')).toHaveLength(remaining);
    expect(end.state.result?.reason??null).toBe(remaining<2?'failed-draw':null);
    if(remaining<2){expect(end.events.filter(e=>e.kind==='sent-to-graveyard')).toHaveLength(0);for(const l of [f.state.chain[0]!,f.state.chain[2]!])expect(end.state.cards[l.source]!.location.kind).toBe('spell-trap');}
  });
  it.each(['root-choice','cleanup'] as const)('concession releases %s without moving surviving sources or refunding fees',stage=>{
    const f=fixture(stage==='root-choice'?{spellId:'official:66788016',owners:['a']}:{owners:['a','b','a']});if(stage==='root-choice')tie(f.state);
    const p=resolveStagedBoundedCounter(registry,f.state,review);expect(p.frame?.stage).toBe(stage);const before=structuredClone(p.state),frame=p.frame!;
    const r=resumeStagedBoundedCounter(registry,p.state,frame,review,{actorId:'b',expectedStateVersion:p.state.stateVersion,action:{type:'concede'}});
    expect(r.accepted).toBe(true);expect(r.frame).toBeNull();expect(r.state.result).toEqual({winner:'a',reason:'concession'});expect(r.state.cards).toEqual(before.cards);
    expect(r.state.players.map(p=>p.lifePoints)).toEqual(before.players.map(p=>p.lifePoints));assertDuelInvariants(r.state,registry);
  });
  it.each(['stale','wrong-player','wrong-id','partial','duplicate','pass','extra'])('rejects invalid paused request %s atomically',mode=>{
    const p=resolveStagedBoundedCounter(registry,fixture({owners:['a','b','a']}).state,review),d=p.state.pendingDecision!,frame=p.frame!,before=structuredClone(p.state);
    const req:any={actorId:d.playerId,expectedStateVersion:p.state.stateVersion,action:{type:'answer-decision',decisionId:d.id,optionIds:[...d.optionIds]}};
    if(mode==='stale')req.expectedStateVersion--;if(mode==='wrong-player')req.actorId=d.playerId==='a'?'b':'a';if(mode==='wrong-id')req.action.decisionId+='-old';
    if(mode==='partial')req.action.optionIds.pop();if(mode==='duplicate')req.action.optionIds[1]=req.action.optionIds[0];if(mode==='pass')req.action={type:'pass'};if(mode==='extra')req.extra=true;
    const r=resumeStagedBoundedCounter(registry,p.state,frame,review,req);expect(r.accepted).toBe(false);expect(r.state).toBe(p.state);expect(r.frame).toBe(frame);expect(p.state).toEqual(before);
  });
  it('records private owner order without exposing its permutation before atomic cleanup',()=>{
    const f=fixture({spellId:'official:55144522',magicOwner:'a',owners:['a','b','a','b','b','a']}),p=resolveStagedBoundedCounter(registry,f.state,review),d=p.state.pendingDecision!;
    expect(d.playerId).toBe('a');const firstOrder=[...d.optionIds].reverse();
    const r=resumeStagedBoundedCounter(registry,p.state,p.frame!,review,{actorId:d.playerId,expectedStateVersion:p.state.stateVersion,action:{type:'answer-decision',decisionId:d.id,optionIds:firstOrder}});
    expect(r.accepted).toBe(true);if(!r.accepted)throw Error(r.message);expect(r.frame?.stage).toBe('cleanup');expect(r.state.pendingDecision!.playerId).toBe('b');
    expect(r.events.map(e=>({kind:e.kind,ids:e.affectedInstances,details:e.details}))).toEqual([{kind:'cleanup-order-selected',ids:[],details:{playerId:'a'}}]);
    for(const id of p.frame!.survivingSourceIds)expect(r.state.cards[id]!.location.kind).toBe('spell-trap');
    const secondOrder=[...r.state.pendingDecision!.optionIds].reverse(),end=finish(r,true);
    expect(end.state.players.find(p=>p.id==='a')!.graveyard.slice(-firstOrder.length)).toEqual(firstOrder);
    expect(end.state.players.find(p=>p.id==='b')!.graveyard.slice(-secondOrder.length)).toEqual(secondOrder);
  });
  it('rejects an old request on the next checkpoint without replaying its effect',()=>{
    const p=resolveStagedBoundedCounter(registry,fixture({spellId:'official:55144522',magicOwner:'a',owners:['a','b','a','b','b','a']}).state,review),d=p.state.pendingDecision!;
    const request={actorId:d.playerId,expectedStateVersion:p.state.stateVersion,action:{type:'answer-decision',decisionId:d.id,optionIds:[...d.optionIds]}};
    const r=resumeStagedBoundedCounter(registry,p.state,p.frame!,review,request);expect(r.accepted).toBe(true);if(!r.accepted||!r.frame)throw Error('Missing next owner');
    const old=resumeStagedBoundedCounter(registry,r.state,r.frame,review,request);expect(old).toMatchObject({accepted:false,code:'stale-state'});expect(old.state).toBe(r.state);expect(old.frame).toBe(r.frame);
    const staleId=resumeStagedBoundedCounter(registry,r.state,r.frame,review,{...request,expectedStateVersion:r.state.stateVersion});expect(staleId.accepted).toBe(false);expect(staleId.state).toBe(r.state);
    expect(()=>resumeStagedBoundedCounter(registry,r.state,p.frame!,review,request)).toThrow();
  });
  it.each(['a','b'].flatMap(actor=>['official:19523799','official:46130346'].map(spellId=>({actor,spellId}))))('applies nonterminal damage once for $actor/$spellId',({actor,spellId})=>{
    const f=fixture({spellId,actor,owners:[actor]}),other=f.state.players.find(p=>p.id!==actor)!;other.lifePoints=3000;
    const end=finish(resolveStagedBoundedCounter(registry,f.state,review));
    expect(end.state.result).toBeNull();expect(end.state.players.find(p=>p.id===other.id)!.lifePoints).toBe(3000-(spellId==='official:19523799'?800:500));
    expect(end.events.filter(e=>e.kind==='effect-damage')).toHaveLength(1);
  });
  it('keeps the live v5 gate closed and never attaches a sidecar to DuelState',()=>{
    const f=fixture({owners:['a','b','a','b','a','b']}),original=structuredClone(f.state);expect(()=>assertDuelInvariants(f.state,registry)).toThrow();
    const p=resolveStagedBoundedCounter(registry,f.state,review);expect(f.state).toEqual(original);expect(JSON.stringify(p.state)).not.toContain('bounded-counter-resolution-frame-v1');
    const done=finish(p);expect(applyAction(registry,done.state,{actorId:done.state.timing.priorityPlayer!,expectedStateVersion:done.state.stateVersion,action:{type:'pass'}}).accepted).toBe(true);
  });
});
