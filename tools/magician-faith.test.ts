import {readFileSync} from 'node:fs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe,it,expect} from 'vitest';
import {loadRuntimeCatalog} from './runtime-catalog.js';
import {createDeckStore} from './deck-store.js';
import {createDuel,applyAction,assertDuelInvariants} from '../packages/engine/src/duel.js';
import {createPlayerProjection} from '../packages/engine/src/player-view.js';
import {createRegistry} from '../packages/engine/src/registry.js';
import {publicResolution} from '../packages/engine/src/public-resolution.js';
import {goat200508Format} from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type {DuelState,Slot,Phase} from '../packages/protocol/src/duel.js';
import type {EngineAction} from '../packages/engine/src/actions.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
const load=(p:string)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const {registry,cards}=loadRuntimeCatalog(),faith='official:31560081',bundle=load('data/generated/magician-faith.json'),reviews=load('data/reviews/magician-faith.effects.json');
function setup(actor='a',count=2){
 const deck=Object.keys(registry.cards),s=structuredClone(createDuel(registry,{duelId:'faith-test',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:'a',seedHex:'69'.repeat(32)}).state) as Mutable<DuelState>;
 for(const p of s.players)for(const id of p.hand.splice(0)){p.deck.push(id);s.cards[id]!.location={kind:'deck',playerId:p.id};}
 s.turn.number=actor==='a'?3:4;s.turn.activePlayer=actor;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer=actor;s.timing.consecutivePasses=0;
 const other=actor==='a'?'b':'a';
 function move(name:string,owner=actor,zone:'hand'|'graveyard'|'monster'='graveyard',slot:Slot=0,down=false){
  const def=Object.values(registry.cards).find(c=>c.name===name)!,p=s.players.find(p=>p.id===owner)!,id=p.deck.find(id=>s.cards[id]!.definition.id===def.id)!;
  p.deck.splice(p.deck.indexOf(id),1);const c=s.cards[id]!;
  if(zone==='monster'){p.monsters[slot]=id;c.location={kind:'monster',playerId:owner,slot};c.position=down?'face-down-defense':'face-up-attack';if(down)c.markers.setOnTurn=s.turn.number-1;}
  else{p[zone].push(id);c.location={kind:zone,playerId:owner};c.position=zone==='hand'?'face-down':'face-up';}
  return id;
 }
 const source=move('Magician of Faith',actor,'monster',0,true),pot=count>0?move('Pot of Greed'):null,fissure=count>1?move('Fissure'):null;
 const trap=move('Trap Hole'),monster=move('Mystical Elf'),foreign=move('Pot of Greed',other),hand=move('Hinotama',actor,'hand'),attacker=move('Battle Ox',other,'monster');
 assertDuelInvariants(s,registry);return{s,actor,other,source,pot,fissure,trap,monster,foreign,hand,attacker,move};
}
function step(s:DuelState,actorId:string,action:EngineAction){const before=structuredClone(s),r=applyAction(registry,s,{actorId,expectedStateVersion:s.stateVersion,action});expect(s).toEqual(before);if(!r.accepted)throw Error(r.message);assertDuelInvariants(r.state,registry);return r;}
function settle(s:DuelState){for(let n=0;s.timing.window!=='open';n++){if(n>16||s.pendingDecision)throw Error('Unresolved');s=step(s,s.timing.priorityPlayer!,{type:'pass'}).state;}return s;}
function phase(s:DuelState,p:Phase){return settle(step(s,s.turn.activePlayer,{type:'request-phase',phase:p}).state);}
function flip(f:ReturnType<typeof setup>){return step(f.s,f.actor,{type:'flip-summon',instanceId:f.source}).state;}
function choose(f:ReturnType<typeof setup>,s:DuelState){return s.pendingDecision?step(s,f.actor,{type:'answer-decision',decisionId:s.pendingDecision.id,optionIds:[f.pot!]}).state:s;}
describe('Reviewed Magician of Faith own Graveyard Spell recovery',()=>{
 it('separates historical import from the hash-gated runtime review and original release proof',()=>{
  expect(bundle.summary).toEqual({imported:1,verifiedData:0,historicalReviewPending:1,implemented:0,testedEffects:0,playable:0});
  expect(bundle.reviews[0].printing).toMatchObject({date:'2002-06-26',setCode:'MRD-036'});
  expect(createRegistry(bundle.cards,goat200508Format).unsupportedIds).toEqual([faith]);
  expect(registry.flipHandlers[faith]).toBe('return-own-graveyard-spell-to-hand');expect(registry.cards[faith]!.legality.maxCopies).toBe(3);
  expect(load('data/evidence/effects/magician-faith-faq.json').displayedDate).toBe('2021-07-10');
 });
 it.each(['text','revision','scope'])('rejects review %s drift',field=>{
  const cs=structuredClone(bundle.cards),rs=structuredClone(reviews);if(field==='text')cs[0].text+=' altered';else if(field==='revision')cs[0].revision++;else rs[0].scope='flip-single-link-v1';expect(()=>createRegistry(cs,goat200508Format,{},[],rs)).toThrow();
 });
 it.each(['a','b'].flatMap(actor=>['flip','battle'].flatMap(trigger=>[0,1,2].map(count=>({actor,trigger,count})))))('$actor $trigger with $count own Graveyard Spells selects at activation and returns only at resolution',({actor,trigger,count})=>{
  const f=setup(actor,count);let s:DuelState=f.s;
  if(trigger==='flip')s=flip(f);
  else{f.s.turn.activePlayer=f.other;f.s.timing.priorityPlayer=f.other;s=phase(f.s,'battle');s=step(s,f.other,{type:'declare-attack',attackerId:f.attacker,targetId:f.source}).state;s=step(s,f.other,{type:'pass'}).state;s=step(s,actor,{type:'pass'}).state;expect(s.cards[f.source]!.markers.wasBattleDestroyed).toBe(true);}
  if(count){expect(s.pendingDecision!.playerId).toBe(actor);expect(new Set(s.pendingDecision!.optionIds)).toEqual(new Set([f.pot,...(f.fissure?[f.fissure]:[])]));expect(createPlayerProjection(registry,s,f.other).view.decision).toBeNull();}
  else{expect(s.pendingDecision).toBeNull();expect(s.chain).toHaveLength(1);}
  s=choose(f,s);expect(s.chain[0]!.effectId).toBe('return-own-graveyard-spell-to-hand');expect(s.chain[0]!.costEvents).toEqual([]);
  expect(s.chain[0]!.targetRefs).toEqual(count?[{instanceId:f.pot,locationAtSelection:{kind:'graveyard',playerId:actor}}]:[]);
  if(f.pot)expect(s.cards[f.pot]!.location.kind).toBe('graveyard');
  s=step(s,f.other,{type:'pass'}).state;if(f.pot)expect(s.cards[f.pot]!.location.kind).toBe('graveyard');
  const resolved=step(s,actor,{type:'pass'});s=settle(resolved.state);
  expect(s.chain).toEqual([]);expect(s.pendingTriggers).toEqual([]);expect(s.pendingDecision).toBeNull();
  if(f.pot){expect(s.cards[f.pot]!.location).toEqual({kind:'hand',playerId:actor});expect(s.players.find(p=>p.id===actor)!.hand.filter(id=>id===f.pot)).toHaveLength(1);expect(publicResolution(resolved.events,s)).toContainEqual({kind:'return-to-hand',playerId:actor,count:1});}
  else expect(resolved.events.filter(e=>e.kind==='returned-to-hand')).toEqual([]);
  for(const id of [f.trap,f.monster,f.foreign,...(f.fissure?[f.fissure]:[])])expect(s.cards[id]!.location.kind).toBe('graveyard');
  expect(s.cards[f.source]!.location.kind).toBe(trigger==='battle'?'graveyard':'monster');expect(s.players.map(p=>p.lifePoints)).toEqual([8000,8000]);expect(s.players.every(p=>p.normalSummonsOrSetsUsed===0)).toBe(true);
 });
 it.each(['trap','monster','foreign','hand','source','attacker'])('rejects %s outside eligible own Graveyard Spells without consuming the decision',key=>{
  const f=setup(),s=flip(f),before=structuredClone(s),id=f[key as 'trap'|'monster'|'foreign'|'hand'|'source'|'attacker'];
  expect(applyAction(registry,s,{actorId:f.actor,expectedStateVersion:s.stateVersion,action:{type:'answer-decision',decisionId:s.pendingDecision!.id,optionIds:[id]}})).toMatchObject({accepted:false,code:'invalid-choice',state:s});expect(s).toEqual(before);
 });
 it.each(['a','b'])('controller %s can use the recovered Spell in their open Main',actor=>{
  const f=setup(actor,1);let s=settle(choose(f,flip(f))),before=s.players.find(p=>p.id===actor)!.hand.length;
  s=settle(step(s,actor,{type:'activate-spell',instanceId:f.pot!,slot:0}).state);expect(s.players.find(p=>p.id===actor)!.hand).toHaveLength(before+1);expect(s.cards[f.pot!]!.location.kind).toBe('graveyard');
 });
 it.each(['wrong-zone','wrong-owner','extra-cost'])('rejects forged recovery links: %s',mode=>{
  const f=setup(),s=structuredClone(choose(f,flip(f))) as Mutable<DuelState>;
  if(mode==='wrong-zone')s.chain[0]!.targetRefs[0]!.locationAtSelection={kind:'monster',playerId:'a',slot:0};
  if(mode==='wrong-owner')s.chain[0]!.targetRefs[0]!.locationAtSelection={kind:'graveyard',playerId:'b'};
  if(mode==='extra-cost')s.chain[0]!.costEvents.push({kind:'cards-discarded',sequence:1,simultaneousGroup:'forged',affectedInstances:[f.monster],details:{playerId:'a',reason:'activation-cost'}});
  expect(()=>assertDuelInvariants(s,registry)).toThrow('Invalid supported Chain');
 });
 it('loads an old 108-card deck containing Earthquake without rewriting bytes or starter',async()=>{
  const d=await mkdtemp(join(tmpdir(),'YGO faith preserved '));try{
   const spellReviews=['pilot.spell-effects','life-point-spells.effects','defense-spell.effects','hammer-shot.effects','tribute-doomed.effects','reincarnation.effects','block-attack.effects','earthquake.effects'].flatMap(n=>load(`data/reviews/${n}.json`));
   const old=createRegistry(cards.filter(c=>c.id!==faith && c.id!=='official:19523799' && c.id!=='official:77414722'),goat200508Format,{},spellReviews,load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json')),store=createDeckStore(old,d);
   const saved=['official:82828051','official:74848038',...store.defaults].slice(0,40);expect((await store.save('a',0,saved)).ok).toBe(true);const bytes=await readFile(join(d,'a.json'),'utf8'),next=createDeckStore(registry,d);expect(next.defaults).toEqual(store.defaults);expect(next.get('a')).toEqual(store.get('a'));expect(await readFile(join(d,'a.json'),'utf8')).toBe(bytes);
  }finally{await rm(d,{recursive:true,force:true});}
 });
});

function pickTarget(s:DuelState,actor:string,id:string){
 expect(s.pendingDecision?.playerId).toBe(actor);
 return step(s,actor,{type:'answer-decision',decisionId:s.pendingDecision!.id,optionIds:[id]}).state;
}
function recover(f:ReturnType<typeof setup>,id:string){return settle(pickTarget(flip(f),f.actor,id));}
describe.each(['a','b'])('Magician of Faith interaction audit, controller %s',actor=>{
 it('recovers Tribute to The Doomed, pays its discard at activation and destroys its target only at resolution',()=>{
  const f=setup(actor,0),spell=f.move('Tribute to The Doomed');
  let s=recover(f,spell);
  s=step(s,actor,{type:'activate-spell',instanceId:spell,slot:0,discardId:f.hand,targetId:f.attacker}).state;
  expect(s.cards[f.hand]!.location).toEqual({kind:'graveyard',playerId:actor});expect(s.cards[f.attacker]!.location.kind).toBe('monster');
  expect(s.chain[0]!.targetRefs[0]!.instanceId).toBe(f.attacker);expect(s.chain[0]!.costEvents).toHaveLength(1);
  s=settle(s);expect(s.cards[f.attacker]!.location).toEqual({kind:'graveyard',playerId:f.other});expect(s.cards[spell]!.location.kind).toBe('graveyard');
  expect(s.cards[f.source]!.location.kind).toBe('monster');expect(s.players.every(p=>p.normalSummonsOrSetsUsed===0)).toBe(true);expect(s.players.map(p=>p.lifePoints)).toEqual([8000,8000]);
 });
 it('recovers Monster Reincarnation and then recovers a monster without confusing the two Graveyard target kinds',()=>{
  const f=setup(actor,0),spell=f.move('Monster Reincarnation');let s=recover(f,spell);
  s=step(s,actor,{type:'activate-spell',instanceId:spell,slot:0,discardId:f.hand,targetId:f.monster}).state;
  expect(s.cards[f.hand]!.location.kind).toBe('graveyard');expect(s.cards[f.monster]!.location.kind).toBe('graveyard');
  expect(s.chain[0]!.targetRefs).toEqual([{instanceId:f.monster,locationAtSelection:{kind:'graveyard',playerId:actor}}]);
  s=settle(s);expect(s.cards[f.monster]!.location).toEqual({kind:'hand',playerId:actor});expect(s.cards[spell]!.location.kind).toBe('graveyard');expect(s.cards[f.trap]!.location.kind).toBe('graveyard');
  expect(s.cards[f.foreign]!.location).toEqual({kind:'graveyard',playerId:f.other});expect(s.pendingDecision).toBeNull();expect(s.pendingTriggers).toEqual([]);
 });
 it('Earthquake changes the already flipped source without creating another FLIP or resetting its manual restriction',()=>{
  const f=setup(actor,0),spell=f.move('Earthquake');let s=recover(f,spell);const markers=structuredClone(s.cards[f.source]!.markers);
  expect(markers.manuallyChangedOnTurn).toBe(s.turn.number);
  s=settle(step(s,actor,{type:'activate-spell',instanceId:spell,slot:0}).state);
  expect(s.cards[f.source]!.position).toBe('face-up-defense');expect(s.cards[f.attacker]!.position).toBe('face-up-defense');expect(s.cards[f.source]!.markers).toEqual(markers);
  expect(s.pendingTriggers).toEqual([]);expect(s.pendingDecision).toBeNull();expect(s.chain).toEqual([]);
  const before=structuredClone(s);expect(applyAction(registry,s,{actorId:actor,expectedStateVersion:s.stateVersion,action:{type:'change-position',instanceId:f.source}})).toMatchObject({accepted:false,code:'invalid-position',state:s});expect(s).toEqual(before);
 });
 it('Hane-Hane can return the source, Set it with the Normal quota and reuse its FLIP on a later real turn',()=>{
  const f=setup(actor,1),hane=f.move('Hane-Hane',actor,'monster',1,true);let s=recover(f,f.pot!);
  s=settle(step(s,actor,{type:'activate-spell',instanceId:f.pot!,slot:0}).state);expect(s.cards[f.pot!]!.location.kind).toBe('graveyard');
  s=step(s,actor,{type:'flip-summon',instanceId:hane}).state;s=settle(pickTarget(s,actor,f.source));
  expect(s.cards[f.source]!.location).toEqual({kind:'hand',playerId:actor});expect(s.cards[f.source]!.markers.manuallyChangedOnTurn).toBeNull();
  s=settle(step(s,actor,{type:'set-monster',instanceId:f.source,slot:0,tributeIds:[]}).state);
  expect(s.players.find(p=>p.id===actor)!.normalSummonsOrSetsUsed).toBe(1);
  const before=structuredClone(s);expect(applyAction(registry,s,{actorId:actor,expectedStateVersion:s.stateVersion,action:{type:'flip-summon',instanceId:f.source}})).toMatchObject({accepted:false,code:'invalid-position',state:s});expect(s).toEqual(before);
  s=phase(phase(s,'end'),'draw');s=phase(phase(s,'standby'),'main1');expect(s.turn.activePlayer).toBe(f.other);
  s=phase(phase(s,'end'),'draw');s=phase(phase(s,'standby'),'main1');expect(s.turn.activePlayer).toBe(actor);
  s=step(s,actor,{type:'flip-summon',instanceId:f.source}).state;s=settle(pickTarget(s,actor,f.pot!));
  expect(s.cards[f.pot!]!.location).toEqual({kind:'hand',playerId:actor});expect(s.cards[f.source]!.position).toBe('face-up-attack');expect(s.players.find(p=>p.id===actor)!.normalSummonsOrSetsUsed).toBe(0);
 });
 it('a Spell recovered in the opponent Battle Phase cannot be used until its controller reaches an open Main',()=>{
  const f=setup(actor,0),spell=f.move('Fissure');f.s.turn.activePlayer=f.other;f.s.timing.priorityPlayer=f.other;
  let s=phase(f.s,'battle');s=step(s,f.other,{type:'declare-attack',attackerId:f.attacker,targetId:f.source}).state;s=step(s,f.other,{type:'pass'}).state;s=step(s,actor,{type:'pass'}).state;
  s=settle(pickTarget(s,actor,spell));expect(s.cards[f.source]!.location.kind).toBe('graveyard');expect(s.cards[spell]!.location.kind).toBe('hand');
  const before=structuredClone(s);expect(applyAction(registry,s,{actorId:actor,expectedStateVersion:s.stateVersion,action:{type:'activate-spell',instanceId:spell,slot:0}})).toMatchObject({accepted:false,state:s});expect(s).toEqual(before);
  s=phase(phase(s,'main2'),'end');s=phase(s,'draw');s=phase(phase(s,'standby'),'main1');expect(s.turn.activePlayer).toBe(actor);
  s=settle(step(s,actor,{type:'activate-spell',instanceId:spell,slot:0}).state);expect(s.cards[f.attacker]!.location).toEqual({kind:'graveyard',playerId:f.other});expect(s.cards[spell]!.location.kind).toBe('graveyard');
 });
 it('a recovered Spell can be discarded as another Spell cost without retriggering the resolved FLIP',()=>{
  const f=setup(actor,1),doomed=f.move('Tribute to The Doomed',actor,'hand');let s=recover(f,f.pot!);
  const activated=step(s,actor,{type:'activate-spell',instanceId:doomed,slot:0,discardId:f.pot!,targetId:f.attacker});s=activated.state;
  expect(s.cards[f.pot!]!.location).toEqual({kind:'graveyard',playerId:actor});expect(s.pendingTriggers).toEqual([]);expect(s.pendingDecision).toBeNull();
  expect(publicResolution(activated.events,s)).toEqual([{kind:'discard-cost',playerId:actor,count:1}]);
  s=settle(s);expect(s.players.find(p=>p.id===actor)!.hand).not.toContain(f.pot);expect(s.cards[f.source]!.location.kind).toBe('monster');expect(s.cards[doomed]!.location.kind).toBe('graveyard');expect(s.pendingTriggers).toEqual([]);
 });
 it('Fissure recovered by the 300-ATK source ignores that source and an opposing face-down monster',()=>{
  const f=setup(actor,0),spell=f.move('Fissure'),hidden=f.move('Man-Eater Bug',f.other,'monster',1,true);let s=recover(f,spell);
  s=settle(step(s,actor,{type:'activate-spell',instanceId:spell,slot:0}).state);
  expect(s.cards[f.source]!.location.kind).toBe('monster');expect(s.cards[f.source]!.position).toBe('face-up-attack');expect(s.cards[f.attacker]!.location.kind).toBe('graveyard');expect(s.cards[hidden]!.position).toBe('face-down-defense');
  expect(s.pendingTriggers).toEqual([]);expect(s.pendingDecision).toBeNull();expect(s.players.map(p=>p.lifePoints)).toEqual([8000,8000]);
 });
});
