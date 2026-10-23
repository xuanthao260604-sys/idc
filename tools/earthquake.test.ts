import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Slot, Phase } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const {registry}=loadRuntimeCatalog(),id='official:82828051';
const load=(p:string)=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const bundle=load('../data/generated/earthquake.json'),reviews=load('../data/reviews/earthquake.effects.json');
function setup(actor='a',pattern='both'){
  const deck=Object.keys(registry.cards),state=structuredClone(createDuel(registry,{duelId:'earthquake-test',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:'a',seedHex:'d9'.repeat(32)}).state) as Mutable<DuelState>;
  for(const p of state.players)for(const id of p.hand.splice(0)){p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};}
  state.turn.number=actor==='a'?3:4;state.turn.activePlayer=actor;state.turn.phase='main1';state.timing.window='open';state.timing.priorityPlayer=actor;state.timing.consecutivePasses=0;
  const other=actor==='a'?'b':'a';
  function move(name:string,owner=actor,slot?:Slot,position:'face-up-attack'|'face-up-defense'|'face-down-defense'='face-up-attack'){
    const def=Object.values(registry.cards).find(c=>c.name===name)!,c=Object.values(state.cards).find(c=>c.ownerId===owner&&c.definition.id===def.id)!,p=state.players.find(p=>p.id===owner)!;p.deck.splice(p.deck.indexOf(c.id),1);
    if(slot===undefined){p.hand.push(c.id);c.location={kind:'hand',playerId:owner};c.position='face-down';}
    else {p.monsters[slot]=c.id;c.location={kind:'monster',playerId:owner,slot};c.position=position;}
    return c.id;
  }
  const spell=move('Earthquake'),own=move('Battle Ox',actor,0),ownDefense=move('Mystical Elf',actor,1,'face-up-defense'),ownHidden=move('Man-Eater Bug',actor,2,'face-down-defense');
  const opposing=move('Celtic Guardian',other,0),flip=move('Hane-Hane',other,1),opponentDefense=move('Mystical Elf',other,2,'face-up-defense'),opponentHidden=move('Man-Eater Bug',other,3,'face-down-defense');
  const attackers=[own,opposing,flip];
  if(pattern==='own-only'){state.cards[opposing]!.position='face-up-defense';state.cards[flip]!.position='face-up-defense';}
  if(pattern==='opponent-only')state.cards[own]!.position='face-up-defense';
  if(['defense-only','hidden-only','empty'].includes(pattern))for(const id of attackers)state.cards[id]!.position=pattern==='hidden-only'?'face-down-defense':'face-up-defense';
  if(pattern==='empty')for(const p of state.players)for(const [slot,id]of p.monsters.entries())if(id){p.monsters[slot]=null;p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};state.cards[id]!.position='face-down';}
  assertDuelInvariants(state,registry);return{state,actor,other,spell,own,ownDefense,ownHidden,opposing,flip,opponentDefense,opponentHidden,move};
}
function act(s:DuelState,actorId:string,action:EngineAction){return applyAction(registry,s,{actorId,expectedStateVersion:s.stateVersion,action});}
function step(s:DuelState,actorId:string,action:EngineAction){const before=structuredClone(s),r=act(s,actorId,action);expect(s).toEqual(before);if(!r.accepted)throw Error(r.message);assertDuelInvariants(r.state,registry);return r;}
function settle(s:DuelState){for(let n=0;s.timing.window!=='open';n++){if(n>14||s.pendingDecision)throw Error('Unresolved window');s=step(s,s.timing.priorityPlayer!,{type:'pass'}).state;}return s;}
function phase(s:DuelState,phase:Phase){return settle(step(s,s.turn.activePlayer,{type:'request-phase',phase}).state);}
const activation=(f:ReturnType<typeof setup>):EngineAction=>({type:'activate-spell',instanceId:f.spell,slot:0});
describe('Reviewed Earthquake simultaneous non-targeting position change',()=>{
  it('keeps historical import separate, pins original AST printing and requires a review',()=>{
    expect(bundle.summary).toMatchObject({imported:1,verifiedData:0,historicalReviewPending:1,implemented:0,testedEffects:0,playable:0});
    expect(bundle.reviews[0].printing).toMatchObject({date:'2004-06-01',setCode:'AST-043'});
    expect(createRegistry(bundle.cards,goat200508Format).unsupportedIds).toEqual([id]);
    expect(registry.spellHandlers[id]).toEqual({handler:'all-face-up-attack-to-defense'});
    const evidence=load('../data/evidence/effects/earthquake-faq.json');expect(evidence.displayedDate).toBe('2015-09-17');expect(evidence.quotations).toHaveLength(4);
  });
  it.each(['text','revision','scope'])('rejects reviewed capability %s drift',field=>{
    const cs=structuredClone(bundle.cards),rs=structuredClone(reviews);if(field==='text')cs[0].text+=' altered';else if(field==='revision')cs[0].revision++;else rs[0].scope='normal-spell-target-position-single-link-v1';expect(()=>createRegistry(cs,goat200508Format,{},rs)).toThrow();
  });
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(fromSet=>['main1','main2'].map(main=>({actor,fromSet,main})))) )('actor=$actor fromSet=$fromSet phase=$main changes both fields together only at resolution',({actor,fromSet,main})=>{
    const f=setup(actor);f.state.turn.phase=main as Phase;let s:DuelState=f.state;
    if(fromSet)s=settle(step(s,actor,{type:'set-spell',instanceId:f.spell,slot:0}).state);
    const before=structuredClone(s),activated=step(s,actor,activation(f));s=activated.state;
    expect(s.chain[0]!.targetRefs).toEqual([]);expect(s.chain[0]!.costEvents).toEqual([]);expect(publicResolution(activated.events,s)).toEqual([]);
    s=step(s,f.other,{type:'pass'}).state;expect(s.cards[f.own]!.position).toBe('face-up-attack');expect(s.cards[f.opposing]!.position).toBe('face-up-attack');
    const resolved=step(s,actor,{type:'pass'});s=settle(resolved.state);
    const events=resolved.events.filter(e=>e.kind==='position-changed');expect(events).toHaveLength(1);
    expect(new Set(events[0]!.affectedInstances)).toEqual(new Set([f.own,f.opposing,f.flip]));
    expect(publicResolution(resolved.events,s)).toEqual([{kind:'effect-position-changed',count:3}]);
    for(const id of [f.own,f.opposing,f.flip,f.ownDefense,f.opponentDefense])expect(s.cards[id]!.position).toBe('face-up-defense');
    for(const id of [f.ownHidden,f.opponentHidden])expect(s.cards[id]!.position).toBe('face-down-defense');
    for(const id of [f.own,f.opposing,f.flip,f.ownDefense,f.opponentDefense,f.ownHidden,f.opponentHidden])expect(s.cards[id]!.markers).toEqual(before.cards[id]!.markers);
    expect(s.pendingDecision).toBeNull();expect(s.pendingTriggers).toEqual([]);expect(s.chain).toEqual([]);
    expect(s.players.map(p=>p.lifePoints)).toEqual([8000,8000]);expect(s.players.find(p=>p.id===actor)!.normalSummonsOrSetsUsed).toBe(0);expect(s.players.find(p=>p.id===actor)!.graveyard).toEqual([f.spell]);
    expect(resolved.events.some(e=>e.kind==='monster-flipped'||e.kind==='monster-summoned')).toBe(false);
  });
  it.each(['own-only','opponent-only'])('may activate when attacks exist on %s',pattern=>{
    const f=setup('a',pattern),s=settle(step(f.state,'a',activation(f)).state);expect(s.cards[f.own]!.position).toBe('face-up-defense');expect(s.cards[f.opposing]!.position).toBe('face-up-defense');expect(s.pendingDecision).toBeNull();
  });
  it.each(['defense-only','hidden-only','empty'])('rejects activation but permits Set with %s field',pattern=>{
    const f=setup('a',pattern),before=structuredClone(f.state);expect(act(f.state,'a',activation(f))).toMatchObject({accepted:false,code:'invalid-target',state:f.state});expect(f.state).toEqual(before);
    const room=createCommandAdapter(registry,f.state),v=room.getView('a',true),source=v.selfHand.find(c=>c.visibility==='known'&&c.definition.id===id)!;
    expect(v.availableActions!.filter(a=>a.type==='activate-spell'&&a.cardHandle===source.handle)).toEqual([]);
    expect(step(f.state,'a',{type:'set-spell',instanceId:f.spell,slot:0}).state.cards[f.spell]!.position).toBe('face-down');
  });
  it.each(['target','discard','both'])('rejects extra %s parameters atomically',mode=>{
    const f=setup(),cost=f.move('Hinotama');expect(act(f.state,'a',{...activation(f),...(mode!=='discard'?{targetId:f.opposing}:{}),...(mode!=='target'?{discardId:cost}:{})} as EngineAction)).toMatchObject({accepted:false,code:'invalid-action',state:f.state});expect(f.state.players[0].hand).toContain(cost);
  });
  it('does not consume a manual change on the same turn',()=>{
    const f=setup();let s=settle(step(f.state,'a',activation(f)).state);s=settle(step(s,'a',{type:'change-position',instanceId:f.own}).state);expect(s.cards[f.own]!.position).toBe('face-up-attack');expect(act(s,'a',{type:'change-position',instanceId:f.own})).toMatchObject({accepted:false,code:'invalid-position'});
  });
  it('can change a surviving attacker in Main2 without resetting its attack restriction',()=>{
    const f=setup('a','own-only');let s=phase(f.state,'battle');s=settle(step(s,'a',{type:'declare-attack',attackerId:f.own,targetId:f.opponentDefense}).state);s=phase(s,'main2');
    expect(s.players[0].lifePoints).toBe(7700);expect(act(s,'a',{type:'change-position',instanceId:f.own})).toMatchObject({accepted:false,code:'invalid-position'});
    s=settle(step(s,'a',activation(f)).state);expect(s.cards[f.own]!.position).toBe('face-up-defense');expect(s.cards[f.own]!.markers.attackDeclarationsThisTurn).toBe(1);expect(s.cards[f.own]!.markers.attackCountConsumedThisTurn).toBe(1);
    expect(act(s,'a',{type:'change-position',instanceId:f.own})).toMatchObject({accepted:false,code:'invalid-position'});
  });
  it('discovery and duplicate receipts never apply the effect twice or leak raw IDs',()=>{
    const f=setup(),room=createCommandAdapter(registry,f.state),v=room.getView('a',true),source=v.selfHand.find(c=>c.visibility==='known'&&c.definition.id===id)!;
    const action={type:'activate-spell' as const,cardHandle:source.handle,slot:0 as Slot};expect(v.availableActions).toContainEqual(action);
    const command={commandId:'earthquake-retry',duelId:v.duelId,expectedStateVersion:v.stateVersion,action},receipt=room.submit('a',command);expect(receipt.accepted).toBe(true);expect(room.submit('a',command)).toEqual(receipt);
    for(let n=0;room.getView('a').timing.window!=='open';n++){if(n>14)throw Error('Unresolved');const w=room.getView('a'),actor=w.timing.priorityPlayer!;expect(room.submit(actor,{commandId:`pass-${n}`,duelId:w.duelId,expectedStateVersion:w.stateVersion,action:{type:'pass'}}).accepted).toBe(true);}
    const done=room.getView('a');expect(room.submit('a',command)).toEqual(receipt);expect(room.getView('a').stateVersion).toBe(done.stateVersion);expect(done.activity.flatMap(e=>e.resolution??[])).toEqual([{kind:'effect-position-changed',count:3}]);expect(room.getView('b').activity).toEqual(done.activity);expect(JSON.stringify(room.getView('b'))).not.toContain(f.own);
  });
});
