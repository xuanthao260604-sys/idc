import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupSevenResponse } from './fixtures/seven-response.js';
import { applyAction,assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
const runtime=loadRuntimeCatalog(),registry=createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,[...runtime.effectReviews.counters.filter(r=>r.cardId!=='official:03819470'),...JSON.parse(readFileSync('data/reviews/seven-tools-v4.effects.json','utf8'))]);
function act(s:DuelState,who:string,a:EngineAction){const before=structuredClone(s),r=applyAction(registry,s,{actorId:who,expectedStateVersion:s.stateVersion,action:a});expect(s).toEqual(before);if(!r.accepted)throw new Error(r.message);assertDuelInvariants(r.state,registry);return r;}
function prefix(f:ReturnType<typeof setupSevenResponse>){
  let s=act(f.state,f.actor,f.method==='flip'?{type:'flip-summon',instanceId:f.target}:{type:'normal-summon',instanceId:f.target,slot:0,tributeIds:f.tributes}).state;
  s=act(s,f.actor,{type:'pass'}).state;s=act(s,f.other,{type:'activate-trap',instanceId:f.trap,targetId:f.target}).state;
  if(s.timing.priorityPlayer!==f.firstOwner)s=act(s,s.timing.priorityPlayer!,{type:'pass'}).state;
  s=act(s,f.firstOwner,{type:'activate-lp-counter-trap',instanceId:f.first,respondingToLinkId:s.chain[0]!.id}).state;
  if(s.timing.priorityPlayer!==f.secondOwner)s=act(s,s.timing.priorityPlayer!,{type:'pass'}).state;return s;
}
function pay(f:ReturnType<typeof setupSevenResponse>,s=prefix(f)){return act(s,f.secondOwner,{type:'activate-lp-counter-trap',instanceId:f.second,respondingToLinkId:s.chain[1]!.id});}
function resolve(s:DuelState){s=act(s,s.timing.priorityPlayer!,{type:'pass'}).state;return act(s,s.timing.priorityPlayer!,{type:'pass'});}
describe('reviewed Trap Hole -> Seven -> Seven',()=>{
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(firstOwn=>[false,true].flatMap(secondOwn=>['normal','tribute','flip'].flatMap(method=>(['main1','main2']as const).flatMap(phase=>[false,true].map(reverse=>({actor,firstOwn,secondOwn,method,phase,reverse}))))))))(
    '$actor firstOwn=$firstOwn secondOwn=$secondOwn $method $phase reverse=$reverse',o=>{
      const f=setupSevenResponse(registry,o.actor,o.firstOwn,o.secondOwn,o.method,o.phase),two=prefix(f),paid=pay(f,two);
      expect(paid.state.chain).toHaveLength(3);expect(paid.events.map(e=>e.kind)).toEqual(['life-points-paid','counter-trap-activated']);
      expect(paid.state.cards[f.target]).toEqual(two.cards[f.target]);const r=resolve(paid.state);let s=r.state;const events=[...r.events];
      expect(s.cards[f.first]!.location).toEqual({kind:'graveyard',playerId:f.firstOwner});expect(s.cards[f.target]!.location.kind).toBe('graveyard');
      if(f.secondOwner===f.other){expect(s.pendingDecision!.kind).toBe('cleanup-order');expect(s.trapCounterResolution!.negatedSeven.activationNegated).toBe(true);
        const restored=JSON.parse(JSON.stringify(s)) as DuelState;assertDuelInvariants(restored,registry);const d=restored.pendingDecision!;
        const ordered=o.reverse?[...d.optionIds].reverse():[...d.optionIds];const done=act(restored,d.playerId,{type:'answer-decision',decisionId:d.id,optionIds:ordered});s=done.state;events.push(...done.events);
        expect(s.players.find(p=>p.id===f.other)!.graveyard.slice(-2)).toEqual(o.reverse?[f.second,f.trap]:[f.trap,f.second]);
      }else expect(s.pendingDecision).toBeNull();
      expect(s.chain).toEqual([]);expect(s.trapCounterResolution).toBeNull();expect(s.counterResolution).toBeNull();expect(s.chainCleanup).toBeNull();expect(s.result).toBeNull();
      expect(s.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(o.method==='flip'?0:1);
      for(const p of s.players){const payments=[f.firstOwner,f.secondOwner].filter(x=>x===p.id).length;expect(p.lifePoints).toBe(payments===2?1:payments===1?1:8000);
        const old=f.state.players.find(q=>q.id===p.id)!;expect(p.graveyard.slice(0,old.graveyard.length)).toEqual(old.graveyard);}
      expect(events.filter(e=>e.kind==='trap-activation-negated').map(e=>e.affectedInstances)).toEqual([[f.first]]);
      expect(events.filter(e=>e.kind==='chain-link-negated-skipped').map(e=>e.affectedInstances)).toEqual([[f.first]]);
      expect(events.filter(e=>e.kind==='effect-destroyed').map(e=>e.affectedInstances)).toEqual([[f.target]]);
      expect(events.filter(e=>e.kind==='chain-resolved')).toHaveLength(1);expect(events.filter(e=>e.kind==='sent-to-graveyard').map(e=>e.affectedInstances)).toEqual([[f.trap,f.second]]);
      expect(events.some(e=>['life-points-paid','effect-damage','battle-damage'].includes(e.kind))).toBe(false);
      for(const id of [f.target,f.trap,f.first,f.second,...f.tributes])expect(s.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
    });
  it.each([1001,2000])('rejects the second payment when one payer starts with %i and preserves the first cost',lp=>{
    const f=setupSevenResponse(registry,'a',true,true,'normal','main1',lp),s=prefix(f),before=structuredClone(s);
    const r=applyAction(registry,s,{actorId:f.secondOwner,expectedStateVersion:s.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:f.second,respondingToLinkId:s.chain[1]!.id}});
    expect(r).toMatchObject({accepted:false,code:'unpayable-cost'});expect(r.state).toBe(s);expect(s).toEqual(before);
    const end=resolve(s).state;expect(end.cards[f.target]!.location.kind).toBe('monster');expect(end.players[0].lifePoints).toBe(lp-1000);expect(end.cards[f.second]!.position).toBe('face-down');
  });
  it.each(['wrong-link','wrong-priority','same-turn','from-hand','amount'])('rejects %s before a second LP payment',mode=>{
    const f=setupSevenResponse(registry),s=structuredClone(prefix(f)) as Mutable<DuelState>;
    if(mode==='same-turn')s.cards[f.second]!.markers.setOnTurn=3;
    if(mode==='from-hand'){const p=s.players.find(p=>p.id===f.secondOwner)!;p.spellsTraps[4]=null;p.hand.push(f.second);s.cards[f.second]!.location={kind:'hand',playerId:p.id};}
    const before=structuredClone(s),r=applyAction(registry,s,{actorId:mode==='wrong-priority'?f.firstOwner:f.secondOwner,expectedStateVersion:s.stateVersion,
      action:{type:'activate-lp-counter-trap',instanceId:f.second,respondingToLinkId:s.chain[mode==='wrong-link'?0:1]!.id,...(mode==='amount'?{amount:1}:{})}});
    expect(r.accepted).toBe(false);expect(r.state).toBe(s);expect(s).toEqual(before);
  });
  it('keeps review v2 gated and refuses duplicate active Seven reviews',()=>{
    const old=JSON.parse(readFileSync('data/reviews/seven-tools-v2.effects.json','utf8'));
    const v2=createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,[...runtime.effectReviews.counters.filter(r=>r.cardId!=='official:03819470'),...old]);
    const f=setupSevenResponse(registry),s=prefix(f),previous={...s,cardRegistryRevision:v2.revision};const r=applyAction(v2,previous,{actorId:f.secondOwner,expectedStateVersion:s.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:f.second,respondingToLinkId:s.chain[1]!.id}});expect(r.accepted).toBe(false);
    expect(()=>createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,[...runtime.effectReviews.counters,...old])).toThrow();
  });
  it.each(['clock','version','root','spent-source','top-source','target','history','order','decision-owner','decision-options','phase','priority','unknown-field'])(
    'rejects corrupted paused %s before any transition',mode=>{
      const f=setupSevenResponse(registry),s=structuredClone(resolve(pay(f).state).state) as Mutable<DuelState>,frame=s.trapCounterResolution!;
      if(mode==='clock')s.eventSequence=frame.capturedSequence;if(mode==='version')s.stateVersion=frame.capturedStateVersion;
      if(mode==='root')frame.root.activationNegated=true;if(mode==='spent-source')s.cards[f.first]!.position='face-down';
      if(mode==='top-source')s.cards[f.second]!.markers.setOnTurn=3;if(mode==='target')s.cards[f.target]!.position='face-up-defense';
      if(mode==='history')frame.lpCosts.payments[0]!.afterLP=2;if(mode==='order')s.chainCleanup!.sourceIds.reverse();
      if(mode==='decision-owner')s.pendingDecision!.playerId=f.actor;if(mode==='decision-options')s.pendingDecision!.optionIds.reverse();
      if(mode==='phase')s.turn.phase='battle';if(mode==='priority')s.timing.priorityPlayer=f.actor;if(mode==='unknown-field')(frame as any).extra=true;
      const before=structuredClone(s);expect(()=>applyAction(registry,s,{actorId:f.actor,expectedStateVersion:s.stateVersion,action:{type:'concede'}})).toThrow();expect(s).toEqual(before);
    });
  it.each(['a','b'])('concession clears pending cleanup for %s without refunding/moving remaining sources',actor=>{
    const f=setupSevenResponse(registry,actor),waiting=resolve(pay(f).state).state,done=act(waiting,actor,{type:'concede'});
    expect(done.state.trapCounterResolution).toBeNull();expect(done.state.chainCleanup).toBeNull();expect(done.state.pendingDecision).toBeNull();expect(done.state.chain).toEqual([]);
    expect(done.events.map(e=>e.kind)).toEqual(['duel-ended']);for(const id of [f.trap,f.second,f.target,f.first])expect(done.state.cards[id]).toEqual(waiting.cards[id]);
    expect(done.state.players.map(p=>p.lifePoints)).toEqual(waiting.players.map(p=>p.lifePoints));
  });
  it('blocks a fourth Counter with enough LP and a valid unused Set source',()=>{
    const f=setupSevenResponse(registry,'a',true,false,'normal','main1',8000,8000),p=f.state.players[0],third=p.deck.find(id=>f.state.cards[id]!.definition.id==='official:03819470')!;
    p.deck.splice(p.deck.indexOf(third),1);p.spellsTraps[3]=third;f.state.cards[third]!.location={kind:'spell-trap',playerId:'a',slot:3};f.state.cards[third]!.position='face-down';f.state.cards[third]!.markers.setOnTurn=1;
    const s=pay(f).state,before=structuredClone(s),r=applyAction(registry,s,{actorId:'a',expectedStateVersion:s.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:third,respondingToLinkId:s.chain[2]!.id}});
    expect(r).toMatchObject({accepted:false,code:'illegal-timing'});expect(s).toEqual(before);
  });
  it.each(['scope','continuation','revision','card','format','definition'])('rejects v3 review drift: %s',mode=>{
    const rs=JSON.parse(readFileSync('data/reviews/seven-tools-v3.effects.json','utf8'));
    if(mode==='scope')rs[0].scope='counter-trap-trap-hole-or-magic-jammer-v2';if(mode==='continuation')rs[0].continuation='normal-spell-magic-jammer-seven-tools-v1';
    if(mode==='revision')rs[0].revision=2;if(mode==='card')rs[0].cardId='official:77414722';if(mode==='format')rs[0].format.revision++;if(mode==='definition')rs[0].definitionSha256='0'.repeat(64);
    expect(()=>createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,rs)).toThrow();
  });
  it.each(['a','b'])('keeps private cleanup/receipts and latest-link handles correct for %s',actor=>{
    const f=setupSevenResponse(registry,actor,true,false),s=prefix(f),room=createCommandAdapter(registry,s);let serial=0;
    const cmd=(who:string,action:unknown)=>{const v=room.getView(who);return{commandId:'seven-response-'+ ++serial,duelId:v.duelId,expectedStateVersion:v.stateVersion,action};};
    const v=room.getView(f.secondOwner,true),plan=v.availableActions!.find(a=>a.type==='activate-lp-counter-trap')!;
    if(plan.type!=='activate-lp-counter-trap')throw new Error('Missing offered response');expect(plan.chainHandle).toBe(v.chain[1]!.chainHandle);
    expect(room.submit(f.secondOwner,cmd(f.secondOwner,{...plan,chainHandle:v.chain[0]!.chainHandle})).accepted).toBe(false);
    const old=cmd(f.secondOwner,plan);room.refreshView(f.secondOwner);expect(room.submit(f.secondOwner,old).accepted).toBe(false);
    const current=room.getView(f.secondOwner,true).availableActions!.find(a=>a.type==='activate-lp-counter-trap')!,c=cmd(f.secondOwner,current),receipt=room.submit(f.secondOwner,c);expect(receipt.accepted).toBe(true);
    expect(room.submit(f.secondOwner,c)).toEqual(receipt);
    for(let i=0;i<2;i++){const who=room.getView(actor).timing.priorityPlayer!;expect(room.submit(who,cmd(who,{type:'pass'})).accepted).toBe(true);}
    expect(room.getView(actor).decision).toBeNull();const d=room.getView(f.other).decision!;expect(d.kind).toBe('cleanup-order');
    const text=JSON.stringify([room.getView(actor,true),room.getView(f.other,true)]);for(const key of ['trapCounterResolution','lpCosts','capturedSequence','sourceAtActivation'])expect(text).not.toContain(key);
    const confirm=cmd(f.other,{type:'answer-decision',decisionId:d.id,optionIds:[...d.optionIds].reverse()}),done=room.submit(f.other,confirm);expect(done.accepted).toBe(true);const final=room.getView(f.other);expect(room.submit(f.other,confirm)).toEqual(done);expect(room.getView(f.other)).toEqual(final);
  });
});
