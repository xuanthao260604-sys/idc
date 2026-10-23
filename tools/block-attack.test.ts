import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog(), id = 'official:25880422';
const load = (p:string) => JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const bundle=load('../data/generated/block-attack.json'), reviews=load('../data/reviews/block-attack.effects.json');
function setup(actor='a') {
  const deck=Object.keys(registry.cards), state=structuredClone(createDuel(registry,{duelId:'block-attack-test',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:'a',seedHex:'e1'.repeat(32)}).state) as Mutable<DuelState>;
  for(const p of state.players) for(const id of p.hand.splice(0)){p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};}
  state.turn.number=actor==='a'?3:4;state.turn.activePlayer=actor;state.turn.phase='main1';state.timing.window='open';state.timing.priorityPlayer=actor;state.timing.consecutivePasses=0;
  const other=actor==='a'?'b':'a';
  function move(name:string,owner=actor,slot?:Slot,position:'face-up-attack'|'face-up-defense'|'face-down-defense'='face-up-attack'){
    const def=Object.values(registry.cards).find(c=>c.name===name)!,c=Object.values(state.cards).find(c=>c.ownerId===owner&&c.definition.id===def.id)!,p=state.players.find(p=>p.id===owner)!;
    p.deck.splice(p.deck.indexOf(c.id),1);
    if(slot===undefined){p.hand.push(c.id);c.location={kind:'hand',playerId:owner};c.position='face-down';}
    else {p.monsters[slot]=c.id;c.location={kind:'monster',playerId:owner,slot};c.position=position;}
    return c.id;
  }
  const spell=move('Block Attack'),target=move('Battle Ox',other,0),own=move('Celtic Guardian',actor,0),defense=move('Mystical Elf',other,1,'face-up-defense'),hidden=move('Man-Eater Bug',other,2,'face-down-defense');
  assertDuelInvariants(state,registry);return{state,actor,other,spell,target,own,defense,hidden,move};
}
function act(s:DuelState,actorId:string,action:EngineAction){return applyAction(registry,s,{actorId,expectedStateVersion:s.stateVersion,action});}
function step(s:DuelState,actorId:string,action:EngineAction){const before=structuredClone(s),r=act(s,actorId,action);expect(s).toEqual(before);if(!r.accepted)throw Error(r.message);assertDuelInvariants(r.state,registry);return r;}
function settle(s:DuelState){for(let n=0;s.timing.window!=='open';n++){if(n>12||s.pendingDecision)throw Error('Unresolved window');s=step(s,s.timing.priorityPlayer!,{type:'pass'}).state;}return s;}
function phase(s:DuelState,phase:'end'|'draw'|'standby'|'main1'){return settle(step(s,s.turn.activePlayer,{type:'request-phase',phase}).state);}
const activation=(f:ReturnType<typeof setup>):EngineAction=>({type:'activate-spell',instanceId:f.spell,slot:0,targetId:f.target});
describe('Reviewed Block Attack targeted position change',()=>{
  it('keeps historical snapshot pending and unsupported until a matching review is provided',()=>{
    expect(bundle.summary).toMatchObject({imported:1,verifiedData:0,historicalReviewPending:1,implemented:0,testedEffects:0,playable:0});
    expect(bundle.reviews[0].printing).toMatchObject({date:'2002-06-26',setCode:'MRD-133'});
    expect(createRegistry(bundle.cards,goat200508Format).unsupportedIds).toEqual([id]);
    expect(registry.spellHandlers[id]).toEqual({handler:'target-opposing-attack-to-defense'});
  });
  it.each(['text','legality','scope'])('rejects %s drift in a reviewed capability',field=>{
    const cards=structuredClone(bundle.cards),rs=structuredClone(reviews);
    if(field==='text')cards[0].text+=' altered';else if(field==='legality')cards[0].legality.maxCopies=1;else rs[0].scope='normal-spell-single-link-vanilla-v1';
    expect(()=>createRegistry(cards,goat200508Format,{},rs)).toThrow();
  });
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(fromSet=>['main1','main2'].map(main=>({actor,fromSet,main})))) )('actor=$actor fromSet=$fromSet phase=$main targets now, changes only at resolution without discard or marker changes',({actor,fromSet,main})=>{
    const f=setup(actor);f.state.turn.phase=main as 'main1'|'main2';let s:DuelState=f.state;
    if(fromSet)s=settle(step(s,actor,{type:'set-spell',instanceId:f.spell,slot:0}).state);
    const before=structuredClone(s),r=step(s,actor,activation(f));s=r.state;
    expect(s.cards[f.target]!.position).toBe('face-up-attack');expect(s.chain[0]!.costEvents).toEqual([]);
    expect(s.chain[0]!.targetRefs).toEqual([{instanceId:f.target,locationAtSelection:{kind:'monster',playerId:f.other,slot:0}}]);
    expect(publicResolution(r.events,s)).toEqual([]);
    s=step(s,f.other,{type:'pass'}).state;expect(s.cards[f.target]!.position).toBe('face-up-attack');
    const resolved=step(s,actor,{type:'pass'});s=settle(resolved.state);
    expect(publicResolution(resolved.events,s)).toEqual([{kind:'effect-position-changed',count:1}]);
    expect(s.cards[f.target]!.position).toBe('face-up-defense');expect(s.cards[f.target]!.markers).toEqual(before.cards[f.target]!.markers);
    const p=s.players.find(p=>p.id===actor)!;expect(p.graveyard).toEqual([f.spell]);expect(p.normalSummonsOrSetsUsed).toBe(0);
    expect(s.players.map(p=>p.lifePoints)).toEqual([8000,8000]);expect(s.cards[f.hidden]!.position).toBe('face-down-defense');expect(s.chain).toEqual([]);expect(s.pendingDecision).toBeNull();
  });
  it.each(['own','defense','hidden','hand','graveyard','missing','source'])('rejects target %s atomically',mode=>{
    const f=setup();
    if(mode==='graveyard'){const c=f.state.cards[f.target]!,p=f.state.players[1]!;p.monsters[0]=null;p.graveyard.push(c.id);c.location={kind:'graveyard',playerId:f.other};c.position='face-up';}
    const targetId=mode==='own'?f.own:mode==='defense'?f.defense:mode==='hidden'?f.hidden:mode==='hand'?f.move('Hane-Hane'):mode==='source'?f.spell:mode==='graveyard'?f.target:'unknown';
    const before=structuredClone(f.state);expect(act(f.state,'a',{...activation(f),targetId} as EngineAction)).toMatchObject({accepted:false,code:'invalid-target',state:f.state});expect(f.state).toEqual(before);
  });
  it.each(['missing-target','extra-discard'])('rejects parameters %s without paying or moving the source',mode=>{
    const f=setup();const a:EngineAction={type:'activate-spell',instanceId:f.spell,slot:0,...(mode==='extra-discard'?{targetId:f.target,discardId:f.move('Hinotama')}:{})};
    expect(act(f.state,'a',a)).toMatchObject({accepted:false,code:'invalid-action',state:f.state});expect(f.state.cards[f.spell]!.location.kind).toBe('hand');
  });
  it('allows Set with no valid target but discovery offers no activation',()=>{
    const f=setup();f.state.cards[f.target]!.position='face-up-defense';const room=createCommandAdapter(registry,f.state),v=room.getView('a',true),source=v.selfHand.find(c=>c.visibility==='known'&&c.definition.id===id)!;
    expect(v.availableActions!.filter(a=>a.type==='activate-spell'&&a.cardHandle===source.handle)).toEqual([]);
    expect(step(f.state,'a',{type:'set-spell',instanceId:f.spell,slot:0}).state.cards[f.spell]!.position).toBe('face-down');
  });
  it('offers only the public legal target; repeated submission never changes position twice',()=>{
    const f=setup(),room=createCommandAdapter(registry,f.state),v=room.getView('a',true),source=v.selfHand.find(c=>c.visibility==='known'&&c.definition.id===id)!,target=v.players[1]!.monsters[0]!;
    const a={type:'activate-spell' as const,cardHandle:source.handle,slot:0 as Slot,targetHandle:target.handle};
    expect(v.availableActions!.filter(c=>c.type==='activate-spell'&&c.cardHandle===source.handle)).toHaveLength(5);expect(v.availableActions).toContainEqual(a);
    const cmd={commandId:'block-retry',duelId:v.duelId,expectedStateVersion:v.stateVersion,action:a},receipt=room.submit('a',cmd);expect(receipt.accepted).toBe(true);expect(room.submit('a',cmd)).toEqual(receipt);
    for(let n=0;room.getView('a').timing.window!=='open';n++){if(n>12)throw Error('Unresolved');const w=room.getView('a'),who=w.timing.priorityPlayer!;expect(room.submit(who,{commandId:`pass-${n}`,duelId:w.duelId,expectedStateVersion:w.stateVersion,action:{type:'pass'}}).accepted).toBe(true);}
    const done=room.getView('a');expect(room.submit('a',cmd)).toEqual(receipt);expect(room.getView('a').stateVersion).toBe(done.stateVersion);
    expect(done.activity.flatMap(e=>e.resolution??[])).toEqual([{kind:'effect-position-changed',count:1}]);expect(done.players[1]!.monsters[0]!.position).toBe('face-up-defense');expect(JSON.stringify(room.getView('b'))).not.toContain(f.target);
  });
  it.each(['Hane-Hane','Man-Eater Bug'])('changes face-up %s without ATK threshold or triggering FLIP',name=>{
    const f=setup();if(name==='Man-Eater Bug'){f.target=f.hidden;f.state.cards[f.target]!.position='face-up-attack';}else f.target=f.move(name,f.other,3);const done=settle(step(f.state,'a',activation(f)).state);
    expect(done.cards[f.target]!.position).toBe('face-up-defense');expect(done.pendingDecision).toBeNull();expect(done.pendingTriggers).toEqual([]);
  });
  it('does not consume the target owner manual change on their following turn',()=>{
    const f=setup();let s=settle(step(f.state,'a',activation(f)).state);
    s=phase(phase(s,'end'),'draw');s=phase(phase(s,'standby'),'main1');expect(s.turn.activePlayer).toBe('b');
    s=settle(step(s,'b',{type:'change-position',instanceId:f.target}).state);expect(s.cards[f.target]!.position).toBe('face-up-attack');
    expect(act(s,'b',{type:'change-position',instanceId:f.target})).toMatchObject({accepted:false,code:'invalid-position'});
  });
  it.each(['own-controller','wrong-location','added-cost'])('rejects forged position links: %s',mode=>{
    const f=setup(),s=structuredClone(step(f.state,'a',activation(f)).state) as Mutable<DuelState>;
    if(mode==='own-controller')s.chain[0]!.controllerId=f.other;
    if(mode==='wrong-location')s.chain[0]!.targetRefs[0]!.locationAtSelection={kind:'graveyard',playerId:f.other};
    if(mode==='added-cost')s.chain[0]!.costEvents.push({kind:'cards-discarded',sequence:1,simultaneousGroup:'forged',affectedInstances:[f.own],details:{playerId:'a',reason:'activation-cost'}});
    expect(()=>assertDuelInvariants(s,registry)).toThrow('Invalid supported Chain');
  });
});
