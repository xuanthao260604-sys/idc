import { describe,it,expect } from 'vitest';
import { boundedRegistry as registry,buildBoundedLive } from './fixtures/bounded-live.js';
import { applyAction,assertDuelInvariants,resolveStagedBoundedCounter,resumeStagedBoundedCounter } from '../packages/engine/src/duel.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
function settle(state:DuelState){let s=state;const all=[];for(let i=0;i<7&&(s.chain.length||s.pendingDecision);i++){
  const d=s.pendingDecision,old=structuredClone(s),r=applyAction(registry,s,{actorId:d?.playerId??s.timing.priorityPlayer!,expectedStateVersion:s.stateVersion,action:d?{type:'answer-decision',decisionId:d.id,optionIds:d.kind==='effect-choice'?[d.optionIds.at(-1)!]:[...d.optionIds].reverse()}:{type:'pass'}});
  expect(r.accepted).toBe(true);if(!r.accepted)throw Error(r.message);expect(s).toEqual(old);expect(r.state.stateVersion).toBe(s.stateVersion+1);s=r.state;all.push(...r.events);assertDuelInvariants(s,registry);
  }expect(s.chain).toEqual([]);expect(s.boundedCounterResolution).toBeNull();return{state:s,events:all};}
const seq=Array.from({length:7},(_,n)=>Array.from({length:2**n},(_,bits)=>Array.from({length:n},(_,i)=>bits&(1<<i)?'a':'b'))).flat().filter(s=>s.filter(x=>x==='a').length<=3&&s.filter(x=>x==='b').length<=3);
const traps=['a','b'].flatMap(actor=>[1,2,3].flatMap(traps=>seq.filter(s=>traps+s.filter(x=>x!==actor).length<=5).map(owners=>({actor,traps,owners}))));
const spells=['a','b'].flatMap(actor=>['a','b'].flatMap(magicOwner=>seq.map(owners=>({actor,magicOwner,owners}))));
describe('explicit v6 registry: actual building/cost/Pass/answer commands; legacy catalog remains pinned to v5',()=>{
 it.each(traps)('plays Trap prefix $actor/$traps/$owners',o=>{const f=buildBoundedLive({...o,phase:o.actor==='a'?'main1':'main2'}),lp=f.state.players.map(p=>p.lifePoints);expect(f.state.chain).toHaveLength(o.traps+o.owners.length);const end=settle(f.state);expect(end.state.cards[f.target]!.location.kind).toBe(o.traps===1&&o.owners.length%2?'monster':'graveyard');expect(end.state.players.map(p=>p.lifePoints)).toEqual(lp);expect(end.events.filter(e=>e.kind==='effect-destroyed'&&e.affectedInstances.includes(f.target))).toHaveLength(o.traps===1&&o.owners.length%2?0:1);});
 it.each(spells)('plays Spell $actor/Magic $magicOwner/Seven $owners',o=>{const f=buildBoundedLive({...o,spellId:'official:55144522'}),hand=f.state.players.find(p=>p.id===o.actor)!.hand.length,lp=f.state.players.map(p=>p.lifePoints),end=settle(f.state);expect(end.state.players.find(p=>p.id===o.actor)!.hand.length-hand).toBe(o.owners.length%2?2:0);expect(end.state.players.map(p=>p.lifePoints)).toEqual(lp);});
 it.each(Object.keys(registry.spellHandlers).flatMap(spellId=>[5,6].map(n=>({spellId,n}))))('runs live root $spellId through $n Seven',({spellId,n})=>{const f=buildBoundedLive({spellId,owners:['a','b','a','b','a','b'].slice(0,n)});expect(f.state.chain).toHaveLength(n+2);settle(f.state);});
 it.each(['normal','tribute','flip'] as const)('uses the actual %s summon occurrence for multiple Trap Hole',method=>{const f=buildBoundedLive({method,traps:3,owners:['a','b','a','b','a']});expect(f.state.chain).toHaveLength(8);settle(f.state);});
 it.each(['official:66788016','official:97169186','official:26412047'])('persists a root choice and cleanup for %s',spellId=>{const f=buildBoundedLive({spellId,owners:['a','b','a','b','a'],tie:true});let s=f.state;for(let i=0;i<2;i++){const r=applyAction(registry,s,{actorId:s.timing.priorityPlayer!,expectedStateVersion:s.stateVersion,action:{type:'pass'}});expect(r.accepted).toBe(true);s=r.state;}expect(s.boundedCounterResolution?.stage).toBe('root-choice');settle(s);});
});

describe('explicit v6 terminal and paused-state guards through real commands',()=>{
 const passTwice=(input:DuelState)=>{let s=input;for(let i=0;i<2;i++){const r=applyAction(registry,s,{actorId:s.timing.priorityPlayer!,expectedStateVersion:s.stateVersion,action:{type:'pass'}});expect(r.accepted).toBe(true);s=r.state;}return s;};
 it.each(['a','b'].flatMap(actor=>[0,1].map(deckRemaining=>({actor,deckRemaining}))))('ends required draw $actor/$deckRemaining without survivor cleanup',o=>{
  const f=buildBoundedLive({...o,spellId:'official:55144522',owners:[o.actor]}),s=passTwice(f.state);
  expect(s.result).toEqual({winner:o.actor==='a'?'b':'a',reason:'failed-draw'});expect(s.boundedCounterResolution).toBeNull();expect(s.chain).toEqual([]);
  for(const l of [f.state.chain[0]!,f.state.chain[2]!])expect(s.cards[l.source]!.location.kind).toBe('spell-trap');
 });
 it.each(['root-choice','cleanup'] as const)('concedes at persisted %s without refund or moving survivors',stage=>{
  const f=buildBoundedLive(stage==='root-choice'?{spellId:'official:66788016',owners:['a'],tie:true}:{owners:['a','b','a']}),s=passTwice(f.state),before=structuredClone(s);
  expect(s.boundedCounterResolution?.stage).toBe(stage);const r=applyAction(registry,s,{actorId:'b',expectedStateVersion:s.stateVersion,action:{type:'concede'}});
  expect(r.accepted).toBe(true);expect(r.state.result).toEqual({winner:'a',reason:'concession'});expect(r.state.boundedCounterResolution).toBeNull();expect(r.state.cards).toEqual(s.cards);expect(r.state.players.map(p=>p.lifePoints)).toEqual(s.players.map(p=>p.lifePoints));expect(s).toEqual(before);
 });
 it.each(['stale','wrong-player','wrong-id','partial','duplicate','pass'] as const)('rejects persisted cleanup request %s without effects',mode=>{
  const s=passTwice(buildBoundedLive({owners:['a','b','a']}).state),d=s.pendingDecision!,before=structuredClone(s);
  const request:any={actorId:d.playerId,expectedStateVersion:s.stateVersion,action:{type:'answer-decision',decisionId:d.id,optionIds:[...d.optionIds]}};
  if(mode==='stale')request.expectedStateVersion--;if(mode==='wrong-player')request.actorId=d.playerId==='a'?'b':'a';if(mode==='wrong-id')request.action.decisionId+='-old';if(mode==='partial')request.action.optionIds.pop();if(mode==='duplicate')request.action.optionIds[1]=request.action.optionIds[0];if(mode==='pass')request.action={type:'pass'};
  const r=applyAction(registry,s,request);expect(r.accepted).toBe(false);expect(r.state).toBe(s);expect(s).toEqual(before);
 });
 it('rejects stale frame clocks before a valid owner answer',()=>{
  const s=structuredClone(passTwice(buildBoundedLive({owners:['a','b','a']}).state));s.stateVersion++;const d=s.pendingDecision!,before=structuredClone(s);
  expect(()=>assertDuelInvariants(s,registry)).toThrow();expect(()=>applyAction(registry,s,{actorId:d.playerId,expectedStateVersion:s.stateVersion,action:{type:'answer-decision',decisionId:d.id,optionIds:d.optionIds}})).toThrow();expect(s).toEqual(before);
 });
});

it('keeps the staged sidecar API separate from persisted v6 state',()=>{
 const f=buildBoundedLive({owners:['a','b','a']});expect(()=>resolveStagedBoundedCounter(registry,f.state,registry.boundedCounterReview)).toThrow('Use applyAction');
 let s=f.state;for(let i=0;i<2;i++)s=applyAction(registry,s,{actorId:s.timing.priorityPlayer!,expectedStateVersion:s.stateVersion,action:{type:'pass'}}).state;
 const d=s.pendingDecision!;expect(()=>resumeStagedBoundedCounter(registry,s,s.boundedCounterResolution!,registry.boundedCounterReview,{actorId:d.playerId,expectedStateVersion:s.stateVersion,action:{type:'answer-decision',decisionId:d.id,optionIds:d.optionIds}})).toThrow('Use applyAction');
});
