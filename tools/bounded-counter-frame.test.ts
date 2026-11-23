import { createHash } from 'node:crypto';
import { describe,it,expect } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupBoundedCounterCandidate } from './fixtures/bounded-counter-candidate.js';
import { BOUNDED_SEVEN_EFFECT_ID, BOUNDED_SEVEN_CANDIDATE_EFFECT } from '../packages/engine/src/bounded-counter-graph.js';
import { startBoundedCounterFrame, checkpointBoundedCounterFrame, assertCurrentBoundedCounterFrame, assertBoundedCounterFrameHistory, releaseBoundedCounterFrame } from '../packages/engine/src/bounded-counter-frame.js';
import { prepareCounterLifoSchedule } from '../packages/engine/src/counter-lifo-schedule.js';
import { prepareChainCleanup,chainCleanupDecision,orderChainCleanup,commitChainCleanup } from '../packages/engine/src/chain-cleanup.js';
import { planResolution } from '../packages/engine/src/effect-plans.js';
import { spellResolutionBoard } from '../packages/engine/src/spell-resolution.js';
import { assertDuelInvariants } from '../packages/engine/src/duel.js';
const runtime=loadRuntimeCatalog(),{registry}=runtime;
const review={...runtime.effectReviews.counters.find(r=>r.cardId==='official:03819470')!,revision:6,scope:'counter-trap-reviewed-bounded-patterns-v6',continuation:'reviewed-bounded-counter-patterns-v6'};
/** Synthetic staged receipts/boards only. No new activation/history is claimed. */
function fixture(o:Parameters<typeof setupBoundedCounterCandidate>[1]={}) {
  const f=setupBoundedCounterCandidate(registry,o),s=f.state;
  for(const l of s.chain)if(l.effectId===BOUNDED_SEVEN_CANDIDATE_EFFECT)l.effectId=BOUNDED_SEVEN_EFFECT_ID;
  s.timing={...s.timing,window:'resolving',priorityPlayer:null,consecutivePasses:2};return f;
}
function grave(s:any,id:string) {
  const c=s.cards[id],p=s.players.find((p:any)=>p.id===c.ownerId);
  if(c.location.kind==='spell-trap')p.spellsTraps[c.location.slot]=null;else p.monsters[c.location.slot]=null;
  p.graveyard.push(id);c.location={kind:'graveyard',playerId:p.id};c.position='face-up';c.controllerId=p.id;
}
function sweep(s:ReturnType<typeof fixture>['state']) {
  for(const step of prepareCounterLifoSchedule(s.chain))if(step.kind==='negate'){const l=s.chain[step.linkIndex]!;l.activationNegated=true;grave(s,l.source);}
  s.stateVersion++;s.eventSequence+=20;
  s.timing.lastRelevantEvents=[{kind:'trap-destroyed',sequence:s.eventSequence,simultaneousGroup:'modeled-sweep',affectedInstances:[]}];
}
function cleanup(s:ReturnType<typeof fixture>['state'],sources:readonly string[]) {
  s.pendingDecision=null;s.chainCleanup=prepareChainCleanup(registry,s,sources) as any;decision(s);
}
function decision(s:ReturnType<typeof fixture>['state']) {
  const d=chainCleanupDecision(registry,{...s,pendingDecision:null},s.chainCleanup!);
  s.pendingDecision=d?{id:`${s.chain[0]!.id}:bounded-cleanup:${d.playerId}`,kind:'cleanup-order',playerId:d.playerId,optionIds:[...d.optionIds],min:d.min,max:d.max}:null;
}
function finish(s:ReturnType<typeof fixture>['state'],frame:ReturnType<typeof startBoundedCounterFrame>) {
  while(s.pendingDecision){const d=s.pendingDecision;s.pendingDecision=null;
    s.chainCleanup=orderChainCleanup(registry,s,s.chainCleanup!,d.playerId,[...d.optionIds].reverse()) as any;
    decision(s);s.stateVersion++;s.eventSequence++;frame=checkpointBoundedCounterFrame(registry,s,frame,'cleanup',review);
  }
  Object.assign(s,commitChainCleanup(registry,s,s.chainCleanup!));s.chain=[];s.chainCleanup=null;s.stateVersion++;s.eventSequence++;
  expect(releaseBoundedCounterFrame(registry,s,frame,review)).toBeNull();
}
const seq=Array.from({length:7},(_,n)=>Array.from({length:2**n},(_,bits)=>Array.from({length:n},(_,i)=>bits&(1<<i)?'a':'b'))).flat().filter(s=>s.filter(x=>x==='a').length<=3&&s.filter(x=>x==='b').length<=3);
const cases=[...['a','b'].flatMap(actor=>[1,2,3].flatMap(traps=>seq.filter(s=>traps+s.filter(x=>x!==(actor)).length<=5).map(owners=>({actor,traps,owners})))),
  ...['a','b'].flatMap(magicOwner=>seq.map(owners=>({spellId:'official:55144522',magicOwner,owners})))];
function reseal(f:any){const{integritySha256:_,...b}=f;f.integritySha256=createHash('sha256').update(JSON.stringify(b)).digest('hex');}

describe('bounded Counter frame contract, staged outside live v5',()=>{
  it.each(cases)('binds source lifecycle/owner cleanup for %j',o=>{
    const f=fixture(o),s=f.state,old=structuredClone(s),start=startBoundedCounterFrame(registry,s,review);
    expect(s).toEqual(old);expect(Object.isFrozen(s.chain[0])).toBe(false);expect(Object.isFrozen(start.links[0])).toBe(true);
    assertCurrentBoundedCounterFrame(registry,s,JSON.parse(JSON.stringify(start)),review);sweep(s);
    // Model the selected root effects; this fixture never submits activate actions.
    for(const l of s.chain.filter(l=>!l.activationNegated&&l.spellSpeed===2)){const id=l.targetRefs[0]!.instanceId;if(s.cards[id]!.location.kind==='monster')grave(s,id);}
    const root=s.chain[0]!;
    if(root.effectId==='normal-spell'&&!root.activationNegated){const p=s.players.find(p=>p.id===root.controllerId)!;
      for(let i=0;i<2;i++){const id=p.deck.shift()!;p.hand.push(id);s.cards[id]!.location={kind:'hand',playerId:p.id};}}
    cleanup(s,start.survivingSourceIds);const next=checkpointBoundedCounterFrame(registry,s,start,'cleanup',review);
    assertBoundedCounterFrameHistory(registry,next,review);expect(()=>assertCurrentBoundedCounterFrame(registry,s,start,review)).toThrow();finish(s,next);
    expect(s.players.map(p=>p.lifePoints)).toEqual(old.players.map(p=>p.lifePoints));
    for(const l of start.links)expect(s.players.flatMap(p=>p.graveyard).filter(id=>id===l.source)).toHaveLength(1);
  });
  it.each(Object.keys(registry.spellHandlers))('captures pinned Spell %s without activating it',spellId=>{
    const {state:s}=fixture({spellId,owners:['a','b','a','b','a','b']});expect(startBoundedCounterFrame(registry,s,review).links).toHaveLength(8);
  });
  it('keeps historical fees after a root heal but requires a fresh board checkpoint',()=>{
    const {state:s}=fixture({spellId:'official:84257639',owners:['a']}),start=startBoundedCounterFrame(registry,s,review);sweep(s);
    s.players.find(p=>p.id===s.turn.activePlayer)!.lifePoints+=1000;cleanup(s,start.survivingSourceIds);
    assertBoundedCounterFrameHistory(registry,start,review);expect(()=>assertCurrentBoundedCounterFrame(registry,s,start,review)).toThrow();
    finish(s,checkpointBoundedCounterFrame(registry,s,start,'cleanup',review));
  });
  it.each(['official:66788016','official:97169186','official:26412047'])('pins root choice and prevents reopening after %s',spellId=>{
    const {state:s}=fixture({spellId,owners:['a']}),p=s.players.find(p=>p.id!=='a')!,target=s.cards[p.monsters[0]!]!;
    const extra=p.deck.find(id=>registry.cards[s.cards[id]!.definition.id]!.kind==='normal-monster')!,c=s.cards[extra]!;
    p.deck.splice(p.deck.indexOf(extra),1);c.definition={...target.definition};p.monsters[1]=extra;c.location={kind:'monster',playerId:p.id,slot:1};c.position='face-up-attack';
    const start=startBoundedCounterFrame(registry,s,review);sweep(s);
    const plan=planResolution(registry.spellHandlers[spellId],spellResolutionBoard(registry,s,'a'));if(plan.kind!=='choose-destruction')throw Error('Missing tie');
    s.pendingDecision={id:`${s.chain[0]!.id}:bounded-choice`,kind:'effect-choice',playerId:plan.playerId,optionIds:[...plan.optionIds],min:1,max:1};
    const paused=checkpointBoundedCounterFrame(registry,s,start,'root-choice',review);assertCurrentBoundedCounterFrame(registry,s,paused,review);
    grave(s,extra);s.stateVersion++;s.eventSequence++;cleanup(s,start.survivingSourceIds);
    const next=checkpointBoundedCounterFrame(registry,s,paused,'cleanup',review);
    expect(()=>checkpointBoundedCounterFrame(registry,s,next,'root-choice',review)).toThrow();finish(s,next);
  });
  it.each(['version','sequence','occurrence','lp','source','cost','decision','overlap','timing'])('rejects current-board drift %s while history stays separate',mode=>{
    const {state:s}=fixture(),frame=startBoundedCounterFrame(registry,s,review),d:any=s;
    if(mode==='version')d.stateVersion++;if(mode==='sequence')d.eventSequence++;if(mode==='occurrence')d.timing.lastRelevantEvents[0].sequence++;
    if(mode==='lp')d.players[0].lifePoints++;if(mode==='source')d.cards[d.chain[0].source].markers.setOnTurn++;
    if(mode==='cost')d.chain[1].costEvents[0].details.amount=999;if(mode==='decision')d.pendingDecision={kind:'effect-choice'};
    if(mode==='overlap')d.counterResolution={};if(mode==='timing')d.timing.priorityPlayer='a';
    assertBoundedCounterFrameHistory(registry,frame,review);const before=structuredClone(s);expect(()=>assertCurrentBoundedCounterFrame(registry,s,frame,review)).toThrow();expect(s).toEqual(before);
  });
  it.each(['extra','survivors','effect','payment','revision','format','owner','origin','copies'])('rejects resealed frame drift %s',mode=>{
    const {state:s}=fixture({owners:['a','b','a','b','a','b']}),f:any=structuredClone(startBoundedCounterFrame(registry,s,review));
    if(mode==='extra')f.extra=true;if(mode==='survivors')f.survivingSourceIds.reverse();if(mode==='effect')f.links[1].effectId='foreign';
    if(mode==='payment')f.links[1].costEvents[0].details.amount=1;if(mode==='revision')f.reviewSha256='0'.repeat(64);
    if(mode==='format')f.turn.phase='battle';if(mode==='owner')f.links[1].controllerId='foreign';if(mode==='origin')f.originSequence=f.checkpointSequence+1;
    if(mode==='copies')f.playerIds=['a','a'];reseal(f);expect(()=>assertBoundedCounterFrameHistory(registry,f,review)).toThrow();
  });
  it.each(['before-root','cleanup'] as const)('drops frame on concession during %s without cleanup/refund',stage=>{
    const {state:s}=fixture({owners:['a','b','a']}),start=startBoundedCounterFrame(registry,s,review);let f=start;
    if(stage==='cleanup'){sweep(s);cleanup(s,start.survivingSourceIds);f=checkpointBoundedCounterFrame(registry,s,start,'cleanup',review);}
    const cards=structuredClone(s.cards),lp=s.players.map(p=>p.lifePoints);s.chain=[];s.chainCleanup=null;s.pendingDecision=null;s.result={winner:'b',reason:'concession'};s.stateVersion++;s.eventSequence++;
    expect(releaseBoundedCounterFrame(registry,s,f,review)).toBeNull();expect(s.cards).toEqual(cards);expect(s.players.map(p=>p.lifePoints)).toEqual(lp);
  });
  it('keeps the original summon as history after semantic events replace the response occurrence',()=>{
    const {state:s}=fixture({owners:['a','b']}),f=startBoundedCounterFrame(registry,s,review),original=structuredClone(f.occurrence);
    sweep(s);cleanup(s,f.survivingSourceIds);const next=checkpointBoundedCounterFrame(registry,s,f,'cleanup',review);
    expect(next.occurrence).toEqual(original);expect(s.timing.lastRelevantEvents).not.toEqual([original]);assertCurrentBoundedCounterFrame(registry,s,next,review);
  });
  it('rejects a cleanup re-checkpoint without one next owner answer',()=>{
    const {state:s}=fixture({owners:['a','b','a']}),f=startBoundedCounterFrame(registry,s,review);sweep(s);cleanup(s,f.survivingSourceIds);
    const next=checkpointBoundedCounterFrame(registry,s,f,'cleanup',review);s.stateVersion++;s.eventSequence++;
    expect(()=>checkpointBoundedCounterFrame(registry,s,next,'cleanup',review)).toThrow('one next owner');
  });
  it.each(['clock','pending','source','early'])('rejects invalid release %s',mode=>{
    const {state:s}=fixture({owners:['a','b','a']}),f=startBoundedCounterFrame(registry,s,review);s.chain=[];s.chainCleanup=null;s.pendingDecision=null;
    s.stateVersion++;s.eventSequence++;if(mode!=='early')s.result={winner:'b',reason:'concession'};
    if(mode==='clock')s.stateVersion=f.checkpointVersion;
    if(mode==='pending')s.pendingDecision={id:'stale',kind:'discard',playerId:'a',optionIds:[],min:0,max:0};
    if(mode==='source')grave(s,f.links.at(-1)!.source);
    expect(()=>releaseBoundedCounterFrame(registry,s,f,review)).toThrow();
  });
  it('keeps standalone Spell outside the staged Counter frame family',()=>{
    const {state:s}=fixture({spellId:'official:55144522',noMagic:true,owners:[]});
    expect(()=>startBoundedCounterFrame(registry,s,review)).toThrow('requires Magic');
  });
  it('does not install a frame in DuelState or bypass the active v5 gate',()=>{
    for(const owners of [['a'],['a','b','a','b','a','b']]) {
      const {state:s}=fixture({owners}),before=structuredClone(s);startBoundedCounterFrame(registry,s,review);
      expect(()=>assertDuelInvariants(s,registry)).toThrow();expect(s).toEqual(before);expect(JSON.stringify(s)).not.toContain('bounded-counter-resolution-frame-v1');
    }
  });
});
