import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {loadRuntimeCatalog} from './runtime-catalog.js';
import {setupFourLinkPrefix} from './fixtures/four-link-counter-candidate.js';
import {applyAction,assertDuelInvariants} from '../packages/engine/src/duel.js';
import {createRegistry} from '../packages/engine/src/registry.js';
import {createCommandAdapter} from '../packages/engine/src/command-adapter.js';
import {goat200508Format} from '../packages/card-data/src/formats/goat-2005-08-17.js';
import {FOUR_LINK_EFFECT_ID} from '../packages/engine/src/four-link-counter-candidate.js';
import type {DuelState} from '../packages/protocol/src/duel.js';
import type {EngineAction} from '../packages/engine/src/actions.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
const runtime=loadRuntimeCatalog(),{registry}=runtime;
const roots=Object.keys(registry.spellHandlers);
function act(s:DuelState,who:string,action:EngineAction){const before=structuredClone(s),r=applyAction(registry,s,{actorId:who,expectedStateVersion:s.stateVersion,action});expect(s).toEqual(before);if(!r.accepted)throw new Error(r.message);assertDuelInvariants(r.state,registry);return r;}
function pay(f:ReturnType<typeof setupFourLinkPrefix>){return act(f.state,f.topOwner,{type:'activate-lp-counter-trap',instanceId:f.top,respondingToLinkId:f.state.chain[2]!.id});}
function resolve(s:DuelState){s=act(s,s.timing.priorityPlayer!,{type:'pass'}).state;return act(s,s.timing.priorityPlayer!,{type:'pass'});}
function reject(s:DuelState,who:string,action:EngineAction){const before=structuredClone(s),r=applyAction(registry,s,{actorId:who,expectedStateVersion:s.stateVersion,action});expect(r.accepted).toBe(false);expect(r.state).toBe(s);expect(s).toEqual(before);return r;}
describe('reviewed four-link Spell -> Magic Jammer -> Seven -> Seven',()=>{
  it.each(roots.flatMap(root=>['a','b'].flatMap(actor=>[false,true].flatMap(magic=>[false,true].flatMap(first=>[false,true].flatMap(top=>[false,true].map(set=>({root,actor,magic,first,top,set}))))))))(
    '$root $actor Magic=$magic first=$first top=$top Set=$set',o=>{
      const f=setupFourLinkPrefix(registry,o.root,o.actor,o.magic,o.first,o.top,o.set?'main2':'main1',o.set),p=pay(f),before=p.state;
      expect(p.events.map(e=>e.kind)).toEqual(['life-points-paid','counter-trap-activated']);expect(p.state.chain.map(l=>l.spellSpeed)).toEqual([1,3,3,3]);expect(p.state.chain[3]!.effectId).toBe(FOUR_LINK_EFFECT_ID);
      const restored=JSON.parse(JSON.stringify(p.state)) as DuelState;assertDuelInvariants(restored,registry);
      const r=resolve(restored);let s=r.state;const events=[...r.events];
      expect(s.cards[f.first]!.location.kind).toBe('graveyard');expect(s.cards[f.root]!.location.kind).toBe('graveyard');
      if(f.magicOwner===f.topOwner){expect(s.pendingDecision?.kind).toBe('cleanup-order');expect(s.fourLinkCounterResolution?.kind).toBe('normal-spell-magic-seven-seven-v1');
        s=JSON.parse(JSON.stringify(s)) as DuelState;assertDuelInvariants(s,registry);const d=s.pendingDecision!,done=act(s,d.playerId,{type:'answer-decision',decisionId:d.id,optionIds:o.set?[...d.optionIds].reverse():[...d.optionIds]});s=done.state;events.push(...done.events);
        expect(s.players.find(p=>p.id===f.magicOwner)!.graveyard.slice(-2)).toEqual(o.set?[f.top,f.magic]:[f.magic,f.top]);
      }else expect(s.pendingDecision).toBeNull();
      expect(s.chain).toEqual([]);expect(s.fourLinkCounterResolution).toBeNull();expect(s.chainCleanup).toBeNull();expect(s.result).toBeNull();
      for(const who of [f.actor,f.other]){const old=before.players.find(p=>p.id===who)!,now=s.players.find(p=>p.id===who)!;
        expect(now.lifePoints).toBe(old.lifePoints);expect(now.deck).toEqual(old.deck);expect(now.hand).toEqual(old.hand);expect(now.monsters).toEqual(old.monsters);expect(now.normalSummonsOrSetsUsed).toBe(old.normalSummonsOrSetsUsed);expect(now.graveyard.slice(0,old.graveyard.length)).toEqual(old.graveyard);
      }
      for(const id of [...f.targets,...(f.rootCost?[f.rootCost]:[]),f.magicCost])expect(s.cards[id]).toEqual(before.cards[id]);
      for(const id of [f.root,f.magic,f.first,f.top])expect(s.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
      expect(events.filter(e=>e.kind==='chain-link-negated-skipped').map(e=>e.affectedInstances)).toEqual([[f.first],[f.root]]);
      expect(events.filter(e=>e.kind==='trap-activation-negated').map(e=>e.affectedInstances)).toEqual([[f.first]]);expect(events.filter(e=>e.kind==='spell-activation-negated').map(e=>e.affectedInstances)).toEqual([[f.root]]);
      expect(events.filter(e=>e.kind==='chain-resolved')).toHaveLength(1);expect(events.filter(e=>e.kind==='sent-to-graveyard').map(e=>e.affectedInstances)).toEqual([[f.magic,f.top]]);
      expect(events.some(e=>['card-drawn','returned-to-hand','effect-damage','effect-destroyed','life-points-gained','flip-effect-activated','life-points-paid','cards-discarded'].includes(e.kind))).toBe(false);
    });
  it.each(['a','b'].flatMap(actor=>([0,1]as const).map(remaining=>({actor,remaining}))))('negates Pot with deck $remaining for $actor without deck-out',o=>{
    const f=setupFourLinkPrefix(registry,'official:55144522',o.actor,false,true,false,'main1',false,false,o.remaining);let s=resolve(pay(f).state).state;
    if(s.pendingDecision){const d=s.pendingDecision;expect(d.kind).toBe('cleanup-order');s=act(s,d.playerId,{type:'answer-decision',decisionId:d.id,optionIds:[...d.optionIds]}).state;}
    expect(s.result).toBeNull();expect(s.players.find(p=>p.id===o.actor)!.deck).toHaveLength(o.remaining);expect(s.pendingDecision).toBeNull();
  });
  it.each([1000,1])('rejects a fourth-link cost at %i LP before payment/reveal',lp=>{
    const f=setupFourLinkPrefix(registry),s=structuredClone(f.state) as Mutable<DuelState>;s.players.find(p=>p.id===f.topOwner)!.lifePoints=lp;
    expect(reject(s,f.topOwner,{type:'activate-lp-counter-trap',instanceId:f.top,respondingToLinkId:s.chain[2]!.id})).toMatchObject({code:'unpayable-cost'});expect(s.cards[f.top]!.position).toBe('face-down');
  });
  it.each([1001,2000])('blocks a second same-payer cost when starting with %i',lp=>{
    const f=setupFourLinkPrefix(registry,'official:66788016','a',false,true,true,'main1',false,false,undefined,lp),s=f.state;
    expect(s.chain[2]!.costEvents[0]!.details).toMatchObject({beforeLP:lp,afterLP:lp-1000});expect(s.timing.consecutivePasses).toBe(1);
    expect(reject(s,'a',{type:'activate-lp-counter-trap',instanceId:f.top,respondingToLinkId:s.chain[2]!.id})).toMatchObject({code:'unpayable-cost'});
    const end=act(s,s.timing.priorityPlayer!,{type:'pass'}).state;expect(end.cards[f.magic]!.location.kind).toBe('graveyard');expect(end.players[0].lifePoints).toBe(lp-1000);
  });
  it.each(['root','magic','first','top','source','cost','priority','window','extra-link','missing-frame-field'])('rejects forged building state %s before transitioning',mode=>{
    const f=setupFourLinkPrefix(registry),s=structuredClone(pay(f).state) as Mutable<DuelState>;
    if(mode==='root')s.chain[0]!.activationNegated=true;if(mode==='magic')s.chain[1]!.activationNegated=true;if(mode==='first')s.chain[2]!.activationNegated=true;if(mode==='top')s.chain[3]!.effectId='wrong';
    if(mode==='source')s.chain[3]!.sourceAtActivation.definition.id='official:77414722';if(mode==='cost')s.chain[3]!.costEvents[0]!.details!.amount=1;if(mode==='priority')s.timing.priorityPlayer=null;if(mode==='window')s.timing.window='open';if(mode==='extra-link')s.chain.push(structuredClone(s.chain[3]!));if(mode==='missing-frame-field')delete(s as any).fourLinkCounterResolution;
    const before=structuredClone(s);expect(()=>applyAction(registry,s,{actorId:'a',expectedStateVersion:s.stateVersion,action:{type:'pass'}})).toThrow();expect(s).toEqual(before);
  });
  it.each(['wrong-link','wrong-player','same-turn','from-hand','extra'] )('blocks %s before cost',mode=>{
    const f=setupFourLinkPrefix(registry),s=structuredClone(f.state) as Mutable<DuelState>;
    if(mode==='same-turn')s.cards[f.top]!.markers.setOnTurn=s.turn.number;
    if(mode==='from-hand'){const p=s.players.find(p=>p.id===f.topOwner)!;p.spellsTraps[3]=null;p.hand.push(f.top);s.cards[f.top]!.location={kind:'hand',playerId:p.id};}
    reject(s,mode==='wrong-player'?f.firstOwner:f.topOwner,{type:'activate-lp-counter-trap',instanceId:f.top,respondingToLinkId:s.chain[mode==='wrong-link'?1:2]!.id,...(mode==='extra'?{amount:1}:{})});
  });
  it.each(['root','magic','seven','top','ledger','cleanup','decision','board','phase','clock','overlap','extra'] )('rejects paused frame drift %s',mode=>{
    const f=setupFourLinkPrefix(registry,'official:74848038','a',false,true,false),s=structuredClone(resolve(pay(f).state).state) as Mutable<DuelState>,j=s.fourLinkCounterResolution!;
    if(mode==='root')j.root.activationNegated=false;if(mode==='magic')j.magic.activationNegated=true;if(mode==='seven')j.seven.activationNegated=false;if(mode==='top')j.top.respondingToLinkId=j.root.id;
    if(mode==='ledger')j.lpCosts.payments[0]!.amount=1 as any;if(mode==='cleanup')s.chainCleanup!.sourceIds=[f.root,f.top];if(mode==='decision')s.pendingDecision!.playerId='a';if(mode==='board')s.players[0].deck.reverse();if(mode==='phase')s.turn.phase='battle';if(mode==='clock')s.stateVersion=j.capturedStateVersion;if(mode==='overlap')s.counterResolution={} as any;if(mode==='extra')(j as any).unknown=true;
    const before=structuredClone(s);expect(()=>applyAction(registry,s,{actorId:'b',expectedStateVersion:s.stateVersion,action:{type:'pass'}})).toThrow();expect(s).toEqual(before);
  });
  it.each(['scope','continuation','revision','card','format','definition'] )('rejects v4 review drift %s',mode=>{
    const rs=JSON.parse(readFileSync('data/reviews/seven-tools-v4.effects.json','utf8'));if(mode==='scope')rs[0].scope='counter-trap-reviewed-three-link-patterns-v3';if(mode==='continuation')rs[0].continuation='reviewed-three-link-counter-patterns-v3';if(mode==='revision')rs[0].revision=3;if(mode==='card')rs[0].cardId='official:77414722';if(mode==='format')rs[0].format.revision++;if(mode==='definition')rs[0].definitionSha256='0'.repeat(64);
    expect(()=>createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,rs)).toThrow();
  });
  it.each(['a','b'])('keeps gate v3 blocked for %s',actor=>{
    const old=createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,[...runtime.effectReviews.counters.filter(r=>r.cardId!=='official:03819470'),...JSON.parse(readFileSync('data/reviews/seven-tools-v3.effects.json','utf8'))]);
    const f=setupFourLinkPrefix(old,'official:66788016',actor),r=applyAction(old,f.state,{actorId:f.topOwner,expectedStateVersion:f.state.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:f.top,respondingToLinkId:f.state.chain[2]!.id}});expect(r).toMatchObject({accepted:false,code:'illegal-timing'});expect(r.state).toBe(f.state);
  });
  it.each(['a','b'])('clears the private pause on concession by %s without refunding costs',actor=>{
    const f=setupFourLinkPrefix(registry,'official:74848038','a',false,true,false),paused=resolve(pay(f).state).state,r=act(paused,actor,{type:'concede'});
    expect(r.state.fourLinkCounterResolution).toBeNull();expect(r.state.pendingDecision).toBeNull();expect(r.state.chain).toEqual([]);expect(r.state.players.map(p=>p.lifePoints)).toEqual(paused.players.map(p=>p.lifePoints));
    expect(r.state.cards[f.magic]!.location.kind).toBe('spell-trap');expect(r.state.cards[f.top]!.location.kind).toBe('spell-trap');expect(r.state.cards[f.root]!.location.kind).toBe('graveyard');
  });
  it('blocks a fifth link despite a spare Set Seven and enough LP',()=>{
    const f=setupFourLinkPrefix(registry,'official:66788016','a',false,true,false,'main1',false,true),s=structuredClone(f.state) as Mutable<DuelState>,p=s.players[0],id=p.deck.find(id=>s.cards[id]!.definition.id==='official:03819470')!;
    p.deck.splice(p.deck.indexOf(id),1);p.spellsTraps[1]=id;s.cards[id]!.location={kind:'spell-trap',playerId:'a',slot:1};s.cards[id]!.position='face-down';s.cards[id]!.markers.setOnTurn=1;
    const paid=pay({...f,state:s}).state;expect(reject(paid,'a',{type:'activate-lp-counter-trap',instanceId:id,respondingToLinkId:paid.chain[3]!.id})).toMatchObject({code:'illegal-timing'});
  });
  it.each(['a','b'])('projects latest-link discovery, cleanup privacy and idempotent receipts for %s',actor=>{
    const f=setupFourLinkPrefix(registry,'official:74848038',actor,false,true,false),room=createCommandAdapter(registry,f.state);let serial=0;
    const command=(who:string,action:unknown)=>{const v=room.getView(who);return{commandId:'four-'+ ++serial,duelId:v.duelId,expectedStateVersion:v.stateVersion,action};};
    let v=room.getView(f.topOwner,true),plan=v.availableActions!.find(a=>a.type==='activate-lp-counter-trap')!;if(plan.type!=='activate-lp-counter-trap')throw new Error('No offered fourth response');expect(plan.chainHandle).toBe(v.chain[2]!.chainHandle);
    const before=room.getView(f.topOwner);expect(room.submit(f.topOwner,command(f.topOwner,{...plan,chainHandle:v.chain[1]!.chainHandle})).accepted).toBe(false);expect(room.getView(f.topOwner)).toEqual(before);
    const stale=command(f.topOwner,plan);room.refreshView(f.topOwner);expect(room.submit(f.topOwner,stale).accepted).toBe(false);
    v=room.getView(f.topOwner,true);plan=v.availableActions!.find(a=>a.type==='activate-lp-counter-trap')!;const cmd=command(f.topOwner,plan),receipt=room.submit(f.topOwner,cmd);expect(receipt.accepted).toBe(true);const paid=room.getView(f.topOwner);expect(room.submit(f.topOwner,cmd)).toEqual(receipt);expect(room.getView(f.topOwner)).toEqual(paid);
    for(let i=0;i<2;i++){const who=room.getView(actor).timing.priorityPlayer!;expect(room.submit(who,command(who,{type:'pass'})).accepted).toBe(true);}
    for(const who of [actor,f.other]){const view=room.getView(who,true);expect(view.chain[0]).toMatchObject({resolved:true,targetHandles:[]});expect(view.chain[0]!.respondingToChainHandle).toBeUndefined();for(const key of ['fourLinkCounterResolution','lpCosts','sourceAtActivation','integritySha256'])expect(JSON.stringify(view)).not.toContain(key);if(who!==f.topOwner)expect(view.decision).toBeNull();}
    const d=room.getView(f.topOwner).decision!,answer=command(f.topOwner,{type:'answer-decision',decisionId:d.id,optionIds:[...d.optionIds].reverse()}),r=room.submit(f.topOwner,answer);expect(r.accepted).toBe(true);const done=room.getView(f.topOwner);expect(room.submit(f.topOwner,answer)).toEqual(r);expect(room.submit(f.topOwner,cmd)).toEqual(receipt);expect(room.getView(f.topOwner)).toEqual(done);
    expect(done.chain).toEqual([]);expect(done.decision).toBeNull();expect(room.getView(actor).activity).toEqual(room.getView(f.other).activity);
  });
});
