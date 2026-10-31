import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDeckStore } from './deck-store.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const runtime = loadRuntimeCatalog(), { registry } = runtime, seven = 'official:03819470';
const load = (p: string) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const review = load('data/reviews/seven-tools.effects.json'), bundle = load('data/generated/seven-tools.json');
function fixture(actor = 'a', self = false, method = 'normal', phase: 'main1' | 'main2' = 'main1', lp = 8000) {
  const deck = [...Object.keys(registry.cards), Object.keys(registry.trapHandlers)[0]!];
  const state = structuredClone(createDuel(registry, { duelId: 'seven-tools', players: [{ id:'a',deck },{ id:'b',deck }], firstPlayerId:'a', seedHex:'94'.repeat(32) }).state) as Mutable<DuelState>;
  for(const p of state.players) for(const id of p.hand.splice(0)){p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};}
  const other=actor==='a'?'b':'a', owner=self?other:actor;
  state.turn.number=actor==='a'?3:4;state.turn.activePlayer=actor;state.turn.phase=phase;state.timing.window='open';state.timing.priorityPlayer=actor;state.timing.consecutivePasses=0;
  state.players.find(p=>p.id===owner)!.lifePoints=lp;
  function move(name: string, who: string, zone: 'hand'|'monster'|'spell-trap'|'graveyard', slot: Slot=0, down=false){
    const p=state.players.find(p=>p.id===who)!,def=Object.values(registry.cards).find(c=>c.name===name)!;
    const id=p.deck.find(id=>state.cards[id]!.definition.id===def.id);if(!id)throw new Error('Missing fixture '+name);
    p.deck.splice(p.deck.indexOf(id),1);const c=state.cards[id]!;
    if(zone==='monster'||zone==='spell-trap'){(zone==='monster'?p.monsters:p.spellsTraps)[slot]=id;c.location={kind:zone,playerId:who,slot};c.position=zone==='spell-trap'?'face-down':down?'face-down-defense':'face-up-attack';if(down||zone==='spell-trap')c.markers.setOnTurn=state.turn.number-1;}
    else{p[zone].push(id);c.location={kind:zone,playerId:who};c.position=zone==='hand'?'face-down':'face-up';}return id;
  }
  const target=move(method==='tribute'?'Gaia The Fierce Knight':'Battle Ox',actor,method==='flip'?'monster':'hand',0,method==='flip');
  const tributeIds=method==='tribute'?[move('Skull Servant',actor,'monster',1),move('Mystical Elf',actor,'monster',2)]:[];
  const trap=move('Trap Hole',other,'spell-trap'),counter=move('Seven Tools of the Bandit',owner,'spell-trap',4);
  const summon: EngineAction=method==='flip'?{type:'flip-summon',instanceId:target}:{type:'normal-summon',instanceId:target,slot:0,tributeIds};
  return {state,actor,other,owner,trap,counter,target,summon,move};
}
function act(state: DuelState,who: string,action: EngineAction){const before=structuredClone(state),r=applyAction(registry,state,{actorId:who,expectedStateVersion:state.stateVersion,action});expect(state).toEqual(before);if(!r.accepted)throw new Error(r.message);assertDuelInvariants(r.state,registry);return r;}
function reject(state: DuelState,who: string,action: unknown){const before=structuredClone(state),r=applyAction(registry,state,{actorId:who,expectedStateVersion:state.stateVersion,action});expect(r.accepted).toBe(false);expect(r.state).toBe(state);expect(state).toEqual(before);return r;}
function trapChain(f:ReturnType<typeof fixture>,initial:DuelState=f.state){let s=act(initial,f.actor,f.summon).state;s=act(s,f.actor,{type:'pass'}).state;s=act(s,f.other,{type:'activate-trap',instanceId:f.trap,targetId:f.target}).state;if(f.owner===f.other)s=act(s,f.actor,{type:'pass'}).state;return s;}
const action=(f:ReturnType<typeof fixture>,s:DuelState):EngineAction=>({type:'activate-lp-counter-trap',instanceId:f.counter,respondingToLinkId:s.chain[0]!.id});
function resolve(s:DuelState){s=act(s,s.timing.priorityPlayer!,{type:'pass'}).state;return act(s,s.timing.priorityPlayer!,{type:'pass'});}
function settle(s:DuelState){for(let n=0;s.timing.window!=='open';n++){if(n>10||s.pendingDecision)throw new Error('Paused');s=act(s,s.timing.priorityPlayer!,{type:'pass'}).state;}return s;}
describe('Seven Tools reviewed two-link Trap Hole activation negation',()=>{
  it('requires its own matching review and retains pending imported statuses',()=>{
    expect(createRegistry(bundle.cards,goat200508Format).unsupportedIds).toEqual([seven]);expect(registry.counterTrapHandlers[seven]).toBe('pay-1000-negate-trap-hole-activation');
    expect(bundle.summary).toMatchObject({historicalReviewPending:1,implemented:0,testedEffects:0,playable:0});
    expect(review[0].evidence).toHaveLength(17);expect(registry.cards[seven]).toMatchObject({passcode:'03819470',verification:'pending',implementation:'not-started',testing:'not-run'});
  });
  it.each(['text','revision','legality','subtype','scope','format','handler'])('rejects %s review drift',mode=>{
    const cards=structuredClone(bundle.cards),rs=structuredClone(review);
    if(mode==='text')cards[0].text+=' changed';if(mode==='revision')cards[0].revision++;if(mode==='legality')cards[0].legality.maxCopies=1;if(mode==='subtype')cards[0].subtype='normal';
    if(mode==='scope')rs[0].scope='counter-trap-normal-spell-activation-v1';if(mode==='format')rs[0].format.revision++;if(mode==='handler')rs[0].handler='discard-negate-normal-spell-activation';
    expect(()=>createRegistry(cards,goat200508Format,{},[],[],[],rs)).toThrow();
  });
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(self=>['normal','tribute','flip'].flatMap(method=>(['main1','main2'] as const).map(phase=>({actor,self,method,phase}))))))('$actor self=$self $method $phase pays once then preserves the successful Summon',({actor,self,method,phase})=>{
    const f=fixture(actor,self,method,phase),s=trapChain(f),before=structuredClone(s),paid=act(s,f.owner,action(f,s));
    expect(publicResolution(paid.events,paid.state)).toEqual([{kind:'lp-cost',playerId:f.owner,amount:1000}]);
    expect(paid.state.players.find(p=>p.id===f.owner)!.lifePoints).toBe(7000);expect(paid.state.cards[f.target]).toEqual(s.cards[f.target]);
    expect(paid.state.chain[1]).toMatchObject({spellSpeed:3,targetRefs:[],respondingToLinkId:s.chain[0]!.id,activationNegated:false});expect(paid.state.chain[1]!.costEvents[0]!.affectedInstances).toEqual([]);
    const first=act(paid.state,paid.state.timing.priorityPlayer!,{type:'pass'}).state;expect(first.chain).toHaveLength(2);expect(first.cards[f.target]).toEqual(s.cards[f.target]);
    const done=act(first,first.timing.priorityPlayer!,{type:'pass'});
    expect(publicResolution(done.events,done.state)).toEqual([{kind:'trap-activation-negated',playerId:f.other,count:1},{kind:'trap-destroyed',playerId:f.other,count:1}]);
    expect(done.state.chain).toEqual([]);expect(done.state.pendingDecision).toBeNull();expect(done.state.result).toBeNull();expect(done.state.cards[f.target]).toEqual(before.cards[f.target]);
    for(const p of done.state.players){const old=before.players.find(o=>o.id===p.id)!;expect(p.hand).toEqual(old.hand);expect(p.deck).toEqual(old.deck);expect(p.monsters).toEqual(old.monsters);expect(p.normalSummonsOrSetsUsed).toBe(old.normalSummonsOrSetsUsed);expect(p.lifePoints).toBe(p.id===f.owner?7000:8000);}
    for(const id of [f.trap,f.counter])expect(done.state.players.flatMap(p=>p.graveyard).filter(c=>c===id)).toHaveLength(1);
    expect(done.events.some(e=>['effect-destroyed','spell-destroyed','effect-damage','life-points-paid'].includes(e.kind))).toBe(false);
  });
  it.each([1001,8000])('works with empty hands at %i LP and never treats payment as damage',lp=>{
    const f=fixture('b',false,'normal','main1',lp),s=trapChain(f);expect(s.players.every(p=>!p.hand.length)).toBe(true);
    const paid=act(s,f.owner,action(f,s));const done=resolve(paid.state).state;
    expect(done.players.find(p=>p.id===f.owner)!.lifePoints).toBe(lp-1000);expect(done.result).toBeNull();expect(done.cards[f.target]!.location.kind).toBe('monster');
  });
  it.each([1000,999,1])('rejects %i LP before payment or revealing',lp=>{const f=fixture('a',false,'normal','main1',lp),s=trapChain(f);expect(reject(s,f.owner,action(f,s))).toMatchObject({code:'unpayable-cost'});});
  it.each(['same-turn','from-hand','other-source','wrong-priority','wrong-link','amount','discardId','targetId','afterLP'])('rejects %s without cost',mode=>{
    const f=fixture();const rival=f.move('Seven Tools of the Bandit',f.other,'spell-trap',4);
    if(mode==='same-turn')f.state.cards[f.counter]!.markers.setOnTurn=f.state.turn.number;
    if(mode==='from-hand'){f.state.players.find(p=>p.id===f.owner)!.spellsTraps[4]=null;f.state.players.find(p=>p.id===f.owner)!.hand.push(f.counter);f.state.cards[f.counter]!.location={kind:'hand',playerId:f.owner};}
    const s=trapChain(f),a={...action(f,s)} as Record<string,unknown>;
    if(mode==='other-source')a.instanceId=rival;if(mode==='wrong-link')a.respondingToLinkId='fake';if(['amount','discardId','targetId','afterLP'].includes(mode))a[mode]=mode==='amount'||mode==='afterLP'?1:f.target;
    reject(s,mode==='wrong-priority'?f.other:f.owner,a);
  });
  it.each(['reference','speed','target','cost-amount','cost-before','cost-after','cost-player','cost-sequence','cost-card','source','duplicate','negated','lp','cost-kind','missing-cost','original-target','original-event','original-set','original-player'])('invariants reject forged %s',mode=>{
    const f=fixture(),s=trapChain(f),state=structuredClone(act(s,f.owner,action(f,s)).state) as Mutable<DuelState>,link=state.chain[1]!,cost=link.costEvents[0]!;
    if(mode==='reference')link.respondingToLinkId='fake';if(mode==='speed')link.spellSpeed=2;if(mode==='target')link.targetRefs.push(state.chain[0]!.targetRefs[0]!);
    if(mode==='cost-amount')cost.details!.amount=999;if(mode==='cost-before')cost.details!.beforeLP=1000;if(mode==='cost-after')cost.details!.afterLP=1;if(mode==='cost-player')cost.details!.playerId=f.other;if(mode==='cost-sequence')cost.sequence=state.eventSequence;if(mode==='cost-card')cost.affectedInstances.push(f.target);
    if(mode==='source')link.sourceAtActivation.id='fake';if(mode==='duplicate')link.id=state.chain[0]!.id;if(mode==='negated')state.chain[0]!.activationNegated=true;if(mode==='lp')state.players.find(p=>p.id===f.owner)!.lifePoints++;
    if(mode==='cost-kind')cost.kind='effect-damage';if(mode==='missing-cost')link.costEvents=[];if(mode==='original-target')state.chain[0]!.targetRefs[0]!.instanceId=f.counter;if(mode==='original-event')state.timing.lastRelevantEvents=[];
    if(mode==='original-set'){state.cards[f.trap]!.markers.setOnTurn=state.turn.number;state.chain[0]!.sourceAtActivation.markers.setOnTurn=state.turn.number;}if(mode==='original-player')state.timing.lastRelevantEvents[0]!.details!.playerId=f.other;
    expect(()=>assertDuelInvariants(state,registry)).toThrow();
  });
  it('Sets Seven Tools from hand through an accepted action, then rejects using it in the same turn',()=>{
    const f=fixture(),p=f.state.players.find(p=>p.id===f.owner)!;p.spellsTraps[4]=null;p.hand.push(f.counter);f.state.cards[f.counter]!.location={kind:'hand',playerId:f.owner};
    const set=act(f.state,f.owner,{type:'set-trap',instanceId:f.counter,slot:4});expect(set.state.cards[f.counter]!.markers.setOnTurn).toBe(f.state.turn.number);
    const s=trapChain(f,settle(set.state));expect(reject(s,f.owner,action(f,s))).toMatchObject({code:'illegal-timing'});
  });
  it('rejects unreviewed prefixes while accepting the v2 Magic Jammer prefix',()=>{
    const f=fixture(),trap2=f.move('Trap Hole',f.other,'spell-trap',2),counter2=f.move('Seven Tools of the Bandit',f.other,'spell-trap',4),magic=f.move('Magic Jammer',f.other,'spell-trap',3),burn=f.move('Ookazi',f.actor,'hand'),cost=f.move('Skull Servant',f.other,'hand');
    reject(f.state,f.actor,{type:'activate-lp-counter-trap',instanceId:f.counter,respondingToLinkId:'no-chain'});
    const summoned=act(f.state,f.actor,f.summon).state;reject(summoned,f.actor,{type:'activate-lp-counter-trap',instanceId:f.counter,respondingToLinkId:'no-chain'});
    const s=trapChain(f),paid=act(s,f.owner,action(f,s)).state;
    reject(paid,f.other,{type:'activate-lp-counter-trap',instanceId:counter2,respondingToLinkId:paid.chain[1]!.id});reject(paid,f.other,{type:'activate-trap',instanceId:trap2,targetId:f.target});
    let two=act(s,f.actor,{type:'pass'}).state;two=act(two,f.other,{type:'activate-trap',instanceId:trap2,targetId:f.target}).state;reject(two,f.actor,action(f,two));
    const spellState=act(f.state,f.actor,{type:'activate-spell',instanceId:burn,slot:0}).state;
    reject(spellState,f.other,{type:'activate-lp-counter-trap',instanceId:counter2,respondingToLinkId:spellState.chain[0]!.id});
    const mc=act(spellState,f.other,{type:'activate-counter-trap',instanceId:magic,discardId:cost,respondingToLinkId:spellState.chain[0]!.id}).state;expect(act(mc,f.actor,{type:'activate-lp-counter-trap',instanceId:f.counter,respondingToLinkId:mc.chain[1]!.id}).state.chain).toHaveLength(3);
  });
  it('Pass without Seven Tools still destroys the monster; resolved Counter does not reopen the old Summon timing',()=>{
    const f=fixture(),trap2=f.move('Trap Hole',f.other,'spell-trap',2),s=trapChain(f);
    expect(resolve(s).state.cards[f.target]!.location.kind).toBe('graveyard');
    let done=settle(resolve(act(s,f.owner,action(f,s)).state).state);done=act(done,f.actor,{type:'pass'}).state;
    reject(done,f.other,{type:'activate-trap',instanceId:trap2,targetId:f.target});
  });
  it('does not interrupt a private mandatory FLIP choice',()=>{
    const f=fixture(),faith=f.move('Magician of Faith',f.actor,'monster',3,true);f.move('Ookazi',f.actor,'graveyard');const s=act(f.state,f.actor,{type:'flip-summon',instanceId:faith}).state;
    expect(s.pendingDecision).not.toBeNull();reject(s,f.actor,{type:'activate-lp-counter-trap',instanceId:f.counter,respondingToLinkId:'fake'});
  });
  it('loads catalog-111 saved decks without rewriting bytes or starter',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'YGO Seven old decks '));try{
      const old=createRegistry(runtime.cards.filter(c=>c.id!==seven),goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,runtime.effectReviews.counters.filter(r=>r.cardId!==seven));const store=createDeckStore(old,dir);
      for(const seat of ['a','b'] as const)expect((await store.save(seat,0,store.defaults)).ok).toBe(true);
      const before=await Promise.all(['a','b'].map(s=>readFile(join(dir,s+'.json'))));const next=createDeckStore(registry,dir);expect(next.defaults).toEqual(store.defaults);
      for(const [i,seat] of (['a','b'] as const).entries()){expect(next.get(seat)).toEqual(store.get(seat));expect((await readFile(join(dir,seat+'.json'))).equals(before[i]!)).toBe(true);}
    }finally{await rm(dir,{recursive:true,force:true});}
  });
});
describe.each(['a','b'].flatMap(actor=>[false,true].map(self=>({actor,self}))))('LP Counter handles for $actor self=$self',({actor,self})=>{
  it('probes without paying, rejects stale/forged/cross-viewer handles and deduplicates cost and resolution receipts',()=>{
    const f=fixture(actor,self,'normal','main1',1001),room=createCommandAdapter(registry,f.state);let serial=0;
    const cmd=(who:string,action:DuelAction)=>{const v=room.getView(who);return{duelId:v.duelId,expectedStateVersion:v.stateVersion,commandId:'lp-'+ ++serial,action};};
    const send=(who:string,action:DuelAction)=>{const command=cmd(who,action),receipt=room.submit(who,command);expect(receipt.accepted).toBe(true);return{command,receipt};};
    const v=room.getView(actor,true);send(actor,v.availableActions!.find(a=>a.type==='normal-summon'&&v.selfHand.some(c=>c.visibility==='known'&&c.handle===a.cardHandle&&c.definition.id==='official:05053103'))!);send(actor,{type:'pass'});
    send(f.other,room.getView(f.other,true).availableActions!.find(a=>a.type==='activate-trap')!);if(self)send(actor,{type:'pass'});
    const before=room.getView(f.owner,true);for(let n=0;n<3;n++)expect(room.getView(f.owner,true)).toEqual(before);
    const old=before.availableActions!.find(a=>a.type==='activate-lp-counter-trap')!;expect(old).toBeDefined();room.refreshView(f.owner,true);expect(room.submit(f.owner,cmd(f.owner,old))).toMatchObject({accepted:false,reason:'invalid-target'});
    const plan=room.getView(f.owner,true).availableActions!.find(a=>a.type==='activate-lp-counter-trap')!;if(plan.type!=='activate-lp-counter-trap')throw new Error('Missing LP plan');
    const clean=room.getView(f.owner);for(const fake of [{...plan,amount:1},{...plan,discardHandle:'fake'},{...plan,targetHandle:'fake'},{...plan,chainHandle:plan.cardHandle},{...plan,chainHandle:room.getView(f.owner==='a'?'b':'a').chain[0]!.chainHandle}])expect(room.submit(f.owner,cmd(f.owner,fake))).toMatchObject({accepted:false});expect(room.getView(f.owner)).toEqual(clean);
    const paid=send(f.owner,plan);const other=f.owner==='a'?'b':'a';send(other,{type:'pass'});const final=send(f.owner,{type:'pass'});room.refreshView(f.owner,true);const done=room.getView(actor);
    for(const r of [paid,final])expect(room.submit(f.owner,r.command)).toEqual(r.receipt);expect(room.getView(actor)).toEqual(done);
    expect(done.players.find(p=>p.playerId===f.owner)!.lifePoints).toBe(1);expect(done.players.find(p=>p.playerId===actor)!.monsters[0]!.visibility).toBe('known');
    expect(done.activity.flatMap(a=>a.resolution??[]).filter(f=>['lp-cost','trap-activation-negated','trap-destroyed'].includes(f.kind))).toEqual([{kind:'lp-cost',playerId:f.owner,amount:1000},{kind:'trap-activation-negated',playerId:f.other,count:1},{kind:'trap-destroyed',playerId:f.other,count:1}]);expect(room.getView(other).activity).toEqual(done.activity);
  });
});
