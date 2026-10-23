import {describe,it,expect} from 'vitest';
import {loadRuntimeCatalog} from './runtime-catalog.js';
import {createDuel,applyAction,assertDuelInvariants} from '../packages/engine/src/duel.js';
import {createPlayerProjection} from '../packages/engine/src/player-view.js';
import type {DuelState,Slot,Phase} from '../packages/protocol/src/duel.js';
import type {EngineAction} from '../packages/engine/src/actions.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
const {registry}=loadRuntimeCatalog();
function setup(actor:string){
 const deck=Object.keys(registry.cards),s=structuredClone(createDuel(registry,{duelId:'quota-test',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:'a',seedHex:'65'.repeat(32)}).state) as Mutable<DuelState>;
 for(const p of s.players)for(const id of p.hand.splice(0)){p.deck.push(id);s.cards[id]!.location={kind:'deck',playerId:p.id};}
 s.turn.number=actor==='a'?3:4;s.turn.activePlayer=actor;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer=actor;s.timing.consecutivePasses=0;
 const other=actor==='a'?'b':'a';
 function move(name:string,owner=actor,zone:'hand'|'monster'|'spell-trap'='hand',slot:Slot=0,down=false){
  const definition=Object.values(registry.cards).find(c=>c.name===name)!,p=s.players.find(p=>p.id===owner)!,id=p.deck.find(id=>s.cards[id]!.definition.id===definition.id)!;
  p.deck.splice(p.deck.indexOf(id),1);const c=s.cards[id]!;
  if(zone==='hand'){p.hand.push(id);c.location={kind:'hand',playerId:owner};}
  else{(zone==='monster'?p.monsters:p.spellsTraps)[slot]=id;c.location={kind:zone,playerId:owner,slot};c.position=down?(zone==='monster'?'face-down-defense':'face-down'):'face-up-attack';if(down)c.markers.setOnTurn=s.turn.number-1;}
  return id;
 }
 return{s,actor,other,move};
}
function step(s:DuelState,actorId:string,action:EngineAction){const before=structuredClone(s),r=applyAction(registry,s,{actorId,expectedStateVersion:s.stateVersion,action});expect(s).toEqual(before);if(!r.accepted)throw Error(r.message);assertDuelInvariants(r.state,registry);return r.state;}
function settle(s:DuelState){for(let n=0;s.timing.window!=='open';n++){if(n>16||s.pendingDecision)throw Error('Unresolved window');s=step(s,s.timing.priorityPlayer!,{type:'pass'});}return s;}
function phase(s:DuelState,p:Phase){return settle(step(s,s.turn.activePlayer,{type:'request-phase',phase:p}));}
function quota(s:DuelState,used:number){
 const expected={playerId:s.turn.activePlayer,used,limit:1,remaining:1-used};
 for(const actor of ['a','b']){const before=structuredClone(s),v=createPlayerProjection(registry,s,actor).view;expect(v.normalSummonQuota).toEqual(expected);expect(Object.isFrozen(v.normalSummonQuota)).toBe(true);expect(s).toEqual(before);}
}
describe.each(['a','b'])('Public Normal Summon/Set quota for active player %s',actor=>{
 it('starts unused and exposes only the public counter, identically to both viewers',()=>{const f=setup(actor);quota(f.s,0);expect(Object.keys(createPlayerProjection(registry,f.s,actor).view.normalSummonQuota).sort()).toEqual(['limit','playerId','remaining','used']);});
 it.each(['normal','set','tribute','flip'])('%s reports the actual counter without revealing a hidden identity',mode=>{
  const f=setup(actor),second=f.move('Celtic Guardian');let card:string,action:EngineAction;
  if(mode==='tribute'){card=f.move('Curse of Dragon');const tribute=f.move('Mystical Elf',actor,'monster');action={type:'normal-summon',instanceId:card,slot:0,tributeIds:[tribute]};}
  else if(mode==='flip'){card=f.move('Battle Ox',actor,'monster',0,true);action={type:'flip-summon',instanceId:card};}
  else{card=f.move('Battle Ox');action={type:mode==='set'?'set-monster':'normal-summon',instanceId:card,slot:0,tributeIds:[]};}
  let s=settle(step(f.s,actor,action));quota(s,mode==='flip'?0:1);
  if(mode==='set'){const hidden=createPlayerProjection(registry,s,f.other).view.players.find(p=>p.playerId===actor)!.monsters[0]!;expect(hidden).toEqual({visibility:'hidden',handle:expect.any(String),position:'face-down-defense'});}
  if(mode==='flip'){s=settle(step(s,actor,{type:'normal-summon',instanceId:second,slot:1,tributeIds:[]}));quota(s,1);}
 });
 it('stays consumed in Main2 and resets for the following player on their real turn',()=>{
  const f=setup(actor),first=f.move('Battle Ox'),second=f.move('Celtic Guardian'),next=f.move('Celtic Guardian',f.other);
  let s=settle(step(f.s,actor,{type:'normal-summon',instanceId:first,slot:0,tributeIds:[]}));s=phase(phase(s,'battle'),'main2');quota(s,1);
  const before=structuredClone(s);expect(applyAction(registry,s,{actorId:actor,expectedStateVersion:s.stateVersion,action:{type:'normal-summon',instanceId:second,slot:1,tributeIds:[]}})).toMatchObject({accepted:false,code:'quota-used',state:s});expect(s).toEqual(before);
  s=phase(phase(s,'end'),'draw');expect(s.turn.activePlayer).toBe(f.other);quota(s,0);s=phase(phase(s,'standby'),'main1');
  s=settle(step(s,f.other,{type:'normal-summon',instanceId:next,slot:0,tributeIds:[]}));quota(s,1);
 });
 it('Trap Hole destruction does not refund a Normal Summon even when the field becomes empty',()=>{
  const f=setup(actor),first=f.move('Battle Ox'),second=f.move('Celtic Guardian'),trap=f.move('Trap Hole',f.other,'spell-trap',0,true);
  let s=step(f.s,actor,{type:'normal-summon',instanceId:first,slot:0,tributeIds:[]});s=step(s,actor,{type:'pass'});s=settle(step(s,f.other,{type:'activate-trap',instanceId:trap,targetId:first}));
  expect(s.cards[first]!.location.kind).toBe('graveyard');expect(s.players.find(p=>p.id===actor)!.monsters.every(c=>c===null)).toBe(true);quota(s,1);
  const before=structuredClone(s);expect(applyAction(registry,s,{actorId:actor,expectedStateVersion:s.stateVersion,action:{type:'normal-summon',instanceId:second,slot:0,tributeIds:[]}})).toMatchObject({accepted:false,code:'quota-used',state:s});expect(s).toEqual(before);
 });
});
