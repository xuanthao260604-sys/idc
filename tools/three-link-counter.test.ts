import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupCounterPrefix } from './fixtures/three-link.js';
import { applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const runtime=loadRuntimeCatalog(),{registry}=runtime,sevenId='official:03819470';
const activeReview=JSON.parse(readFileSync('data/reviews/seven-tools-v2.effects.json','utf8'));
function act(state:DuelState,actorId:string,action:EngineAction){
  const before=structuredClone(state),r=applyAction(registry,state,{actorId,expectedStateVersion:state.stateVersion,action});
  expect(state).toEqual(before);if(!r.accepted)throw new Error(r.message);assertDuelInvariants(r.state,registry);return r;
}
function pay(f:ReturnType<typeof setupCounterPrefix>){return act(f.state,f.sevenOwner,{type:'activate-lp-counter-trap',instanceId:f.seven,respondingToLinkId:f.state.chain[1]!.id});}
function resolve(s:DuelState){s=act(s,s.timing.priorityPlayer!,{type:'pass'}).state;return act(s,s.timing.priorityPlayer!,{type:'pass'});}
function complete(s:DuelState,reverse=false){const events=[];for(let i=0;s.pendingDecision;i++){
  if(i>2)throw new Error('Repeated resolution');const d=s.pendingDecision,r=act(s,d.playerId,{type:'answer-decision',decisionId:d.id,optionIds:d.kind==='effect-choice'?[d.optionIds[1]!]:reverse?[...d.optionIds].reverse():[...d.optionIds]});s=r.state;events.push(...r.events);
}return{state:s,events};}
describe('reviewed three-link activation and actual Pass resolver',()=>{
  it.each(Object.keys(registry.spellHandlers).flatMap(root=>['a','b'].flatMap(actor=>[false,true].flatMap(selfMagic=>[false,true].flatMap(selfSeven=>(['main1','main2']as const).flatMap(phase=>[false,true].map(fromSet=>({root,actor,selfMagic,selfSeven,phase,fromSet}))))))))(
    '$root $actor $phase Set=$fromSet MagicSelf=$selfMagic SevenSelf=$selfSeven',o=>{
      const f=setupCounterPrefix(registry,o.root,o.actor,o.selfMagic,o.selfSeven,o.phase,o.fromSet),original=f.state.chain[0]!,paid=pay(f);
      expect(paid.state.chain).toHaveLength(3);expect(paid.state.chain[0]).toEqual(original);expect(paid.state.chain[2]!.respondingToLinkId).toBe(f.state.chain[1]!.id);
      expect(paid.events.map(e=>e.kind)).toEqual(['life-points-paid','counter-trap-activated']);
      expect(paid.state.players.find(p=>p.id===f.sevenOwner)!.lifePoints).toBe(7000);
      expect(paid.state.chain[2]!.targetRefs).toEqual([]);expect(paid.state.cards[f.root]).toEqual(f.state.cards[f.root]);
      const first=act(paid.state,paid.state.timing.priorityPlayer!,{type:'pass'});expect(first.state.chain).toHaveLength(3);
      const r=act(first.state,first.state.timing.priorityPlayer!,{type:'pass'});expect(r.state.stateVersion).toBe(first.state.stateVersion+1);
      const restored=JSON.parse(JSON.stringify(r.state)) as DuelState;assertDuelInvariants(restored,registry);
      const end=complete(restored,o.fromSet),s=end.state,events=[...r.events,...end.events];
      expect(s.result).toBeNull();expect(s.chain).toEqual([]);expect(s.pendingDecision).toBeNull();expect(s.counterResolution).toBeNull();expect(s.chainCleanup).toBeNull();
      expect(s.timing.window).toBe('action-response');expect(events.filter(e=>e.kind==='chain-resolved')).toHaveLength(1);
      expect(events.filter(e=>e.kind==='trap-activation-negated').map(e=>e.affectedInstances)).toEqual([[f.magic]]);
      expect(events.filter(e=>e.kind==='chain-link-negated-skipped').map(e=>e.affectedInstances)).toEqual([[f.magic]]);
      expect(events.filter(e=>e.kind==='sent-to-graveyard').map(e=>e.affectedInstances)).toEqual([[f.root,f.seven]]);
      expect(events.some(e=>['cards-discarded','life-points-paid','spell-activated'].includes(e.kind))).toBe(false);
      expect(s.cards[f.magicCost]!.location.kind).toBe('graveyard');for(const id of [f.root,f.magic,f.seven])expect(s.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
      const h=registry.spellHandlers[o.root]!;
      for(const p of s.players){const old=paid.state.players.find(q=>q.id===p.id)!;
        const gain=h.handler==='gain-life-points'&&p.id===f.actor?h.amount:0,damage=h.handler==='inflict-damage'&&p.id===f.other?h.amount:0;
        expect(p.lifePoints).toBe(old.lifePoints+gain-damage);expect(p.normalSummonsOrSetsUsed).toBe(old.normalSummonsOrSetsUsed);
        expect(p.deck.length).toBe(old.deck.length-(h.handler==='draw'&&p.id===f.actor?h.count:0));
        const prefix=old.graveyard.filter(id=>!(o.root==='official:74848038'&&id===f.rootCost));expect(p.graveyard.slice(0,prefix.length)).toEqual(prefix);
      }
      if(o.root==='official:74848038')expect(s.players.find(p=>p.id===f.actor)!.hand).toContain(f.rootCost);
      if(f.sevenOwner===f.actor)expect(s.players.find(p=>p.id===f.actor)!.graveyard.slice(-2)).toEqual(o.fromSet?[f.seven,f.root]:[f.root,f.seven]);
    });
  it.each([1000,999,1])('blocks %i LP before cost/reveal/discovery',lp=>{
    const f=setupCounterPrefix(registry,'official:66788016','a',false,false,'main1',false,lp),before=structuredClone(f.state);
    const r=applyAction(registry,f.state,{actorId:f.sevenOwner,expectedStateVersion:f.state.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:f.seven,respondingToLinkId:f.state.chain[1]!.id}});
    expect(r).toMatchObject({accepted:false,code:'unpayable-cost'});expect(r.state).toBe(f.state);expect(f.state).toEqual(before);
    expect(createCommandAdapter(registry,f.state).getView(f.sevenOwner,true).availableActions!.some(a=>a.type==='activate-lp-counter-trap')).toBe(false);
  });
  it.each(['a','b'])('keeps payment historical while the real Dian Keto heals %s from 1 to 1001',actor=>{
    const f=setupCounterPrefix(registry,'official:84257639',actor,false,false,'main1',false,1001),paid=pay(f),r=resolve(paid.state);
    expect(r.state.players.find(p=>p.id===actor)!.lifePoints).toBe(1001);expect(r.state.counterResolution!.seven.costEvents[0]!.details).toMatchObject({beforeLP:1001,afterLP:1,amount:1000});
    const end=complete(r.state);expect(end.state.players.find(p=>p.id===actor)!.lifePoints).toBe(1001);expect(end.events.some(e=>e.kind==='life-points-paid')).toBe(false);
  });
  it.each(['a','b'].flatMap(actor=>['official:19523799','official:46130346','official:55144522'].flatMap(root=>(root==='official:55144522'?[0,1]:[0]).map(remaining=>({actor,root,remaining})))))(
    'terminates $root for $actor with deck $remaining through real activation/Pass without a post-game choice',({actor,root,remaining})=>{
      const f=setupCounterPrefix(registry,root,actor,false,true,'main1',false,1001);
      if(root==='official:55144522'){const s=structuredClone(f.state) as Mutable<DuelState>,p=s.players.find(p=>p.id===actor)!;
        for(const id of p.deck.splice(remaining)){p.hand.push(id);s.cards[id]!.location={kind:'hand',playerId:actor};}f.state=s;}
      const paid=pay(f),r=resolve(paid.state);expect(r.state.result?.reason).toBe(root==='official:55144522'?'failed-draw':'life-points');
      expect(r.state.pendingDecision).toBeNull();expect(r.state.counterResolution).toBeNull();expect(r.state.chainCleanup).toBeNull();expect(r.state.chain).toEqual([]);
      expect(r.state.cards[f.magic]!.location.kind).toBe('graveyard');for(const id of [f.root,f.seven])expect(r.state.cards[id]!.location.kind).toBe('spell-trap');
      expect(r.events.some(e=>['sent-to-graveyard','chain-resolved','life-points-paid'].includes(e.kind))).toBe(false);
      if(root==='official:55144522')expect(r.events.filter(e=>e.kind==='card-drawn')).toHaveLength(remaining);
    });
  it.each(['root','magic','seven','cost','cost-order','source-snapshot','response-link','effect-id','pin','priority','window','fourth-link'])('rejects a forged building three-link %s state',mode=>{
    const f=setupCounterPrefix(registry),s=structuredClone(pay(f).state) as Mutable<DuelState>;
    if(mode==='root')s.chain[0]!.activationNegated=true;if(mode==='magic')s.chain[1]!.activationNegated=true;if(mode==='seven')s.chain[2]!.activationNegated=true;
    if(mode==='cost')s.chain[2]!.costEvents[0]!.details!.amount=1;if(mode==='cost-order')s.chain[2]!.costEvents[0]!.sequence=s.chain[1]!.costEvents[0]!.sequence;
    if(mode==='source-snapshot')s.chain[2]!.sourceAtActivation.markers.setOnTurn=3;if(mode==='response-link')s.chain[2]!.respondingToLinkId=s.chain[0]!.id;
    if(mode==='effect-id')s.chain[2]!.effectId='pay-1000-negate-trap-hole-activation';if(mode==='pin')s.chain[0]!.sourceAtActivation.definition.id=sevenId;
    if(mode==='priority')s.timing.priorityPlayer=null;if(mode==='window')s.timing.window='open';if(mode==='fourth-link')s.chain.push(structuredClone(s.chain[2]!));
    const before=structuredClone(s);expect(()=>applyAction(registry,s,{actorId:f.actor,expectedStateVersion:s.stateVersion,action:{type:'pass'}})).toThrow();expect(s).toEqual(before);
  });
  it.each(['same-turn','from-hand','wrong-player','root-link','unknown-field'])('blocks %s before payment',mode=>{
    const f=setupCounterPrefix(registry),s=structuredClone(f.state) as Mutable<DuelState>;
    if(mode==='same-turn')s.cards[f.seven]!.markers.setOnTurn=s.turn.number;
    if(mode==='from-hand'){const p=s.players.find(p=>p.id===f.sevenOwner)!;p.spellsTraps[4]=null;p.hand.push(f.seven);s.cards[f.seven]!.location={kind:'hand',playerId:p.id};}
    const before=structuredClone(s),r=applyAction(registry,s,{actorId:mode==='wrong-player'?f.magicOwner:f.sevenOwner,expectedStateVersion:s.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:f.seven,respondingToLinkId:s.chain[mode==='root-link'?0:1]!.id,...(mode==='unknown-field'?{amount:1}:{})}});
    expect(r.accepted).toBe(false);expect(r.state).toBe(s);expect(s).toEqual(before);
  });
  it('keeps the historical v1 review gated and uses exactly one active Seven review',()=>{
    const old=JSON.parse(readFileSync('data/reviews/seven-tools.effects.json','utf8'));
    const v1=createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,[...runtime.effectReviews.counters.filter(r=>r.cardId!==sevenId),...old]);
    const f=setupCounterPrefix(v1),r=applyAction(v1,f.state,{actorId:f.sevenOwner,expectedStateVersion:f.state.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:f.seven,respondingToLinkId:f.state.chain[1]!.id}});
    expect(r.accepted).toBe(false);expect(r.state).toBe(f.state);expect(v1.counterContinuations).toEqual({});
    expect(registry.counterContinuations[sevenId]).toBe('normal-spell-magic-jammer-seven-tools-v1');
    expect(runtime.effectReviews.counters.filter(r=>r.cardId===sevenId)).toHaveLength(1);
    expect(()=>createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,[...runtime.effectReviews.counters,...old])).toThrow();
  });
  it.each(['scope','extension','handler','revision','card','format','definition'])('rejects v2 review drift: %s',mode=>{
    const rs=structuredClone(activeReview);if(mode==='scope')rs[0].scope='counter-trap-trap-hole-activation-v1';if(mode==='extension')delete rs[0].continuation;
    if(mode==='handler')rs[0].handler='discard-negate-normal-spell-activation';if(mode==='revision')rs[0].revision=1;if(mode==='card')rs[0].cardId='official:77414722';
    if(mode==='format')rs[0].format.revision++;if(mode==='definition')rs[0].definitionSha256='0'.repeat(64);
    expect(()=>createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,rs)).toThrow();
  });
  it('blocks a fourth Seven and Magic responding to a Trap without touching either cost',()=>{
    const f=setupCounterPrefix(registry),paid=pay(f),s=structuredClone(paid.state) as Mutable<DuelState>,who=s.timing.priorityPlayer!,p=s.players.find(p=>p.id===who)!;
    const id=p.deck.find(id=>s.cards[id]!.definition.id===sevenId)!;p.deck.splice(p.deck.indexOf(id),1);p.spellsTraps[3]=id;s.cards[id]!.location={kind:'spell-trap',playerId:who,slot:3};s.cards[id]!.position='face-down';s.cards[id]!.markers.setOnTurn=2;
    for(const action of [{type:'activate-lp-counter-trap',instanceId:id,respondingToLinkId:s.chain[2]!.id},{type:'activate-counter-trap',instanceId:f.magic,discardId:f.magicCost,respondingToLinkId:s.chain[2]!.id}]){
      const before=structuredClone(s),r=applyAction(registry,s,{actorId:who,expectedStateVersion:s.stateVersion,action});expect(r.accepted).toBe(false);expect(s).toEqual(before);
    }
    expect(createCommandAdapter(registry,s).getView(who,true).availableActions!.filter(a=>a.type.includes('counter-trap'))).toEqual([]);
  });
  it.each(['a','b'])('uses latest-link handles, actual activation, refresh and receipts for %s',actor=>{
    const f=setupCounterPrefix(registry,'official:66788016',actor),room=createCommandAdapter(registry,f.state);let serial=0;
    const command=(who:string,action:unknown)=>{const v=room.getView(who);return{commandId:'three-'+ ++serial,duelId:v.duelId,expectedStateVersion:v.stateVersion,action};};
    const v=room.getView(f.sevenOwner,true),plan=v.availableActions!.find(a=>a.type==='activate-lp-counter-trap')!;
    if(plan.type!=='activate-lp-counter-trap')throw new Error('No offered Seven');expect(plan.chainHandle).toBe(v.chain[1]!.chainHandle);
    const before=room.getView(f.sevenOwner);expect(room.submit(f.sevenOwner,command(f.sevenOwner,{...plan,chainHandle:v.chain[0]!.chainHandle})).accepted).toBe(false);expect(room.getView(f.sevenOwner)).toEqual(before);
    const stale=command(f.sevenOwner,plan);room.refreshView(f.sevenOwner);expect(room.submit(f.sevenOwner,stale).accepted).toBe(false);
    const current=room.getView(f.sevenOwner,true).availableActions!.find(a=>a.type==='activate-lp-counter-trap')!,cmd=command(f.sevenOwner,current),receipt=room.submit(f.sevenOwner,cmd);expect(receipt.accepted).toBe(true);
    const paid=room.getView(f.sevenOwner);expect(paid.chain).toHaveLength(3);expect(room.submit(f.sevenOwner,cmd)).toEqual(receipt);expect(room.getView(f.sevenOwner)).toEqual(paid);
    for(let i=0;i<2;i++){const who=room.getView(actor).timing.priorityPlayer!;expect(room.submit(who,command(who,{type:'pass'})).accepted).toBe(true);}
    for(const kind of ['effect-choice','cleanup-order']){const d=room.getView(actor).decision!;expect(d.kind).toBe(kind);expect(room.getView(f.other).decision).toBeNull();
      const c=command(actor,{type:'answer-decision',decisionId:d.id,optionIds:kind==='effect-choice'?[d.optionIds[0]!]:[...d.optionIds].reverse()}),r=room.submit(actor,c);expect(r.accepted).toBe(true);const after=room.getView(actor);expect(room.submit(actor,c)).toEqual(r);expect(room.getView(actor)).toEqual(after);
    }
    expect(room.getView(actor).chain).toEqual([]);expect(room.getView(actor).decision).toBeNull();
  });
  it.each(['a','b'])('does not expose a returned Reincarnation target through the resolved Chain for %s',actor=>{
    const f=setupCounterPrefix(registry,'official:74848038',actor),r=resolve(pay(f).state),room=createCommandAdapter(registry,r.state);
    expect(r.state.cards[f.rootCost!]!.location.kind).toBe('hand');
    for(const who of [actor,f.other]){const v=room.getView(who,true);expect(v.chain).toHaveLength(1);expect(v.chain[0]).toMatchObject({resolved:true,targetHandles:[]});
      expect(JSON.stringify(v)).not.toContain(f.rootCost!);expect(room.refreshView(who,true).chain[0]!.targetHandles).toEqual([]);}
    expect(room.getView(f.other).selfHand).toEqual([]);expect(room.getView(actor).selfHand).toHaveLength(1);
  });
});
