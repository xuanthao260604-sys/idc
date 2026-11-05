import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {loadRuntimeCatalog} from './runtime-catalog.js';
import {createRegistry} from '../packages/engine/src/registry.js';
import {goat200508Format} from '../packages/card-data/src/formats/goat-2005-08-17.js';
import {setupTrapThreeSevenCandidate} from './fixtures/trap-three-seven-candidate.js';
import {prepareTrapThreeSevenCandidate,assertTrapThreeSevenCandidate} from '../packages/engine/src/trap-three-seven-candidate.js';
import {captureThreeSevenLPCosts,assertThreeSevenLPCostHistory,assertCurrentThreeSevenLPCosts} from '../packages/engine/src/three-seven-lp-cost-ledger.js';
import {captureSevenLPCosts,assertSevenLPCostHistory} from '../packages/engine/src/seven-lp-cost-ledger.js';
import {assertDuelInvariants} from '../packages/engine/src/duel.js';
import {prepareChainCleanup,chainCleanupDecision,orderChainCleanup,commitChainCleanup} from '../packages/engine/src/chain-cleanup.js';
const r=loadRuntimeCatalog(),registry=createRegistry(r.cards,goat200508Format,{},r.effectReviews.spells,r.effectReviews.flips,r.effectReviews.traps,r.effectReviews.counters);
const owners=Array.from({length:8},(_,n)=>[!!(n&1),!!(n&2),!!(n&4)]);
function rehash(j:any){const{integritySha256:_,...body}=j;j.integritySha256=createHash('sha256').update(JSON.stringify(body)).digest('hex');}
describe('isolated Trap Hole three-Seven candidate, never gameplay permission',()=>{
  it.each(['a','b'].flatMap(actor=>owners.flatMap(owners=>['normal','tribute','flip'].flatMap(method=>(['main1','main2']as const).map(phase=>({actor,owners,method,phase}))))))('resolves $actor $owners $method $phase',o=>{
    const f=setupTrapThreeSevenCandidate(registry,o.actor,o.owners,o.method,o.phase),input=structuredClone(f.state),p=prepareTrapThreeSevenCandidate(registry,f.state),post={...f.state,...p.board,chain:p.remainingChain};
    expect(f.state).toEqual(input);expect(Object.isFrozen(f.state.cards[f.top])).toBe(false);expect(Object.isFrozen(p.journal.lpCosts.payments[0])).toBe(true);
    expect(f.denied).toMatchObject({accepted:false,code:'illegal-timing'});expect(f.denied.state).toBe(f.accepted);
    expect(()=>assertDuelInvariants(f.state,registry)).toThrow();expect(()=>assertDuelInvariants(post,registry)).toThrow();
    assertTrapThreeSevenCandidate(registry,post,p.journal);assertTrapThreeSevenCandidate(registry,JSON.parse(JSON.stringify(post)),JSON.parse(JSON.stringify(p.journal)));
    expect(p.steps).toEqual([{resolver:f.top,negatedDestroyedSkipped:f.second},{resolver:f.first,negatedDestroyedSkipped:f.trap}]);
    expect(p.journal.cleanupSourceIds).toEqual([f.first,f.top]);expect(p.journal.root.activationNegated).toBe(true);expect(p.journal.middle.activationNegated).toBe(true);expect(p.journal.first.activationNegated).toBe(false);
    expect(p.board.cards[f.target]).toEqual(f.state.cards[f.target]);for(const id of f.tributes)expect(p.board.cards[id]).toEqual(f.state.cards[id]);
    for(const old of f.state.players){const now=p.board.players.find(p=>p.id===old.id)!;expect(now.lifePoints).toBe(old.lifePoints);expect(now.normalSummonsOrSetsUsed).toBe(old.normalSummonsOrSetsUsed);expect(now.monsters).toEqual(old.monsters);expect(now.hand).toEqual(old.hand);expect(now.deck).toEqual(old.deck);expect(now.graveyard).toEqual([...old.graveyard,...[f.second,f.trap].filter(id=>f.state.cards[id]!.ownerId===old.id)]);}
    let frame=prepareChainCleanup(registry,post,p.journal.cleanupSourceIds);const d=chainCleanupDecision(registry,post,frame);
    if(f.firstOwner===f.topOwner){expect(d?.playerId).toBe(f.firstOwner);frame=orderChainCleanup(registry,post,frame,d!.playerId,o.phase==='main1'?d!.optionIds:[...d!.optionIds].reverse());}else expect(d).toBeNull();
    const end=commitChainCleanup(registry,post,frame);for(const id of [f.trap,f.first,f.second,f.top])expect(end.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
    expect(end.players.map(p=>p.lifePoints)).toEqual(f.state.players.map(p=>p.lifePoints));expect(end.cards[f.target]).toEqual(f.state.cards[f.target]);
    for(const b of frame.batches)expect(end.players.find(p=>p.id===b.ownerId)!.graveyard).toEqual([...post.players.find(p=>p.id===b.ownerId)!.graveyard,...b.order!]);
    expect(()=>assertTrapThreeSevenCandidate(registry,{...post,...end},p.journal)).toThrow();assertThreeSevenLPCostHistory(p.journal.lpCosts);
  });
  it.each(['a','b'].flatMap(actor=>owners.flatMap(owners=>[false,true].map(large=>({actor,owners,large})))))('three-payment V2 accounting $actor $owners large=$large',o=>{
    const f=setupTrapThreeSevenCandidate(registry,o.actor,o.owners,'normal','main1',o.large),before=structuredClone(f.state),l=captureThreeSevenLPCosts(registry,f.state);
    expect(f.state).toEqual(before);assertCurrentThreeSevenLPCosts(registry,f.state,l);assertThreeSevenLPCostHistory(JSON.parse(JSON.stringify(l)));
    expect(l.version).toBe(2);expect(l.payments.map(p=>p.sourceId)).toEqual([f.first,f.second,f.top]);expect(l.balances.reduce((n,b)=>n+b.totalPaid,0)).toBe(3000);
    for(const b of l.balances){expect(b.beforeFirstLP).toBe(o.large?8000:b.paymentCount*1000+1);expect(b.afterLastLP).toBe(o.large?8000-b.totalPaid:1);}
    expect(()=>captureSevenLPCosts(registry,f.state)).toThrow();expect(()=>assertSevenLPCostHistory(l as never)).toThrow();const v1=captureSevenLPCosts(registry,f.accepted);expect(()=>assertThreeSevenLPCostHistory(v1 as never)).toThrow();expect(()=>captureThreeSevenLPCosts(registry,f.accepted)).toThrow();
    const p=prepareTrapThreeSevenCandidate(registry,f.state);expect(()=>assertCurrentThreeSevenLPCosts(registry,{...f.state,...p.board,chain:p.remainingChain},l)).toThrow();
  });
  it.each(['root-flag','middle-flag','top-flag','wrong-effect','wrong-response','duplicate-source','duplicate-link','same-turn','source-snapshot','lp-gap','lp-current','lp-amount','lp-sequence','lp-group','lp-extra','root-cost','target-moved','unknown-target','phase','window','passes','priority','decision','result','registry','orphan','duplicate-zone','fifth-link','negative-version','banished-copy','fusion-copy','field-copy','zero-lp'])('rejects %s atomically',mode=>{
    const f=setupTrapThreeSevenCandidate(registry,'a',[true,true,true]),s=f.state,l=s.chain[3]!,e=l.costEvents[0]!;
    if(mode==='root-flag')s.chain[0]!.activationNegated=true;if(mode==='middle-flag')s.chain[2]!.activationNegated=true;if(mode==='top-flag')l.activationNegated=true;
    if(mode==='wrong-effect')l.effectId=s.chain[2]!.effectId;if(mode==='wrong-response')l.respondingToLinkId=s.chain[1]!.id;if(mode==='duplicate-source')l.source=s.chain[2]!.source;if(mode==='duplicate-link')l.id=s.chain[2]!.id;
    if(mode==='same-turn'){s.cards[f.top]!.markers.setOnTurn=3;l.sourceAtActivation.markers.setOnTurn=3;}if(mode==='source-snapshot')l.sourceAtActivation.ownerId='bad';
    if(mode==='lp-gap'){e.details!.beforeLP=2001;e.details!.afterLP=1001;s.players[0].lifePoints=1001;}if(mode==='lp-current')s.players[0].lifePoints++;if(mode==='lp-amount')e.details!.amount=999;if(mode==='lp-sequence')e.sequence=s.chain[2]!.costEvents[0]!.sequence;if(mode==='lp-group')e.simultaneousGroup=s.chain[2]!.costEvents[0]!.simultaneousGroup;if(mode==='lp-extra')e.details!.refund=0;
    if(mode==='root-cost')s.chain[0]!.costEvents=[structuredClone(e)];if(mode==='target-moved')s.cards[f.target]!.position='face-down-defense';if(mode==='unknown-target')s.chain[0]!.targetRefs[0]!.instanceId='missing';
    if(mode==='phase')s.turn.phase='battle';if(mode==='window')s.timing.window='chain-response';if(mode==='passes')s.timing.consecutivePasses=1;if(mode==='priority')s.timing.priorityPlayer='a';
    if(mode==='decision')s.pendingDecision={id:'x',kind:'discard',playerId:'a',min:0,max:0,optionIds:[]};if(mode==='result')s.result={winner:'a',reason:'concession'};if(mode==='registry')s.cardRegistryRevision='old';
    if(mode==='orphan')s.players[0].deck.pop();if(mode==='duplicate-zone')s.players[0].hand.push(s.players[0].deck[0]!);if(mode==='fifth-link')s.chain.push(structuredClone(l));if(mode==='negative-version')s.stateVersion=-1;
    if(mode==='banished-copy')s.players[0].banished.push(s.players[0].deck[0]!);if(mode==='fusion-copy')s.players[0].fusionDeck.push(s.players[0].deck[0]!);if(mode==='field-copy')s.players[0].field=s.players[0].deck[0]!;if(mode==='zero-lp')s.players[0].lifePoints=0;
    const before=structuredClone(s);expect(()=>prepareTrapThreeSevenCandidate(registry,s)).toThrow();expect(s).toEqual(before);expect(Object.isFrozen(s.cards[f.top])).toBe(false);
  });
  it.each(['version','kind','two','four','zero-after','amount','before','sum','gap','source','link','group','sequence','clock','players','payer','pin','format','extra','integrity'])('V2 rejects malformed/rehashed history %s',mode=>{
    const f=setupTrapThreeSevenCandidate(registry,'a',[true,true,true]),j:any=structuredClone(captureThreeSevenLPCosts(registry,f.state));
    if(mode==='version')j.version=1;if(mode==='kind')j.kind='seven-tools-lp-cost-ledger-v1';if(mode==='two')j.payments.pop();if(mode==='four')j.payments.push(structuredClone(j.payments[2]));if(mode==='zero-after')j.payments[2].afterLP=0;if(mode==='amount')j.payments[2].amount=999;if(mode==='before')j.payments[0].beforeLP=1000;if(mode==='sum')j.balances[0].totalPaid=2000;if(mode==='gap'){j.payments[1].beforeLP++;j.payments[1].afterLP++;}
    if(mode==='source')j.payments[2].sourceId=j.payments[1].sourceId;if(mode==='link')j.payments[2].linkId=j.payments[1].linkId;if(mode==='group')j.payments[2].simultaneousGroup=j.payments[1].simultaneousGroup;if(mode==='sequence')j.payments[2].sequence=j.payments[1].sequence;if(mode==='clock')j.capturedSequence=j.payments[2].sequence;if(mode==='players')j.playerIds[1]=j.playerIds[0];if(mode==='payer')j.payments[2].playerId='unknown';if(mode==='pin')j.definitionSha256='0'.repeat(64);if(mode==='format')j.format.revision=3;if(mode==='extra')j.refund=0;
    rehash(j);if(mode==='integrity')j.integritySha256='0'.repeat(64);const before=structuredClone(j);expect(()=>assertThreeSevenLPCostHistory(j)).toThrow();expect(j).toEqual(before);expect(Object.isFrozen(j.payments[0])).toBe(false);
  });
  it.each(['board','lp','cost','cleanup','flags','survivor','destroyed','clock','turn','extra','ledger','rehash-graph','rehash-sum','rehash-gap','rehash-extra-receipt','occurrence'])('rejects checkpoint drift %s',mode=>{
    const f=setupTrapThreeSevenCandidate(registry),p=prepareTrapThreeSevenCandidate(registry,f.state),s=structuredClone({...f.state,...p.board,chain:p.remainingChain}),j:any=structuredClone(p.journal);
    if(mode==='board')s.players[0].deck.reverse();if(mode==='lp')s.players[0].lifePoints++;if(mode==='cost')j.root.costEvents=[...j.top.costEvents];if(mode==='cleanup')j.cleanupSourceIds.reverse();if(mode==='flags')j.first.activationNegated=true;if(mode==='survivor')s.cards[f.first]!.position='face-down';if(mode==='destroyed')s.cards[f.second]!.position='face-down';if(mode==='clock')s.eventSequence=j.capturedSequence-1;if(mode==='turn')s.turn.number++;if(mode==='extra')j.extra=true;if(mode==='ledger')j.lpCosts.payments[0].amount=1;
    if(mode==='occurrence')s.timing.lastRelevantEvents=[];if(mode==='rehash-extra-receipt'){j.top.costEvents[0].details.refund=0;rehash(j);}if(mode==='rehash-graph'){j.top.respondingToLinkId=j.root.id;rehash(j);}if(mode==='rehash-sum'){j.lpCosts.balances[0].totalPaid=1;rehash(j.lpCosts);rehash(j);}if(mode==='rehash-gap'){j.lpCosts.payments[2].beforeLP+=1000;j.lpCosts.payments[2].afterLP+=1000;rehash(j.lpCosts);rehash(j);}
    const before=structuredClone(s);expect(()=>assertTrapThreeSevenCandidate(registry,s,j)).toThrow();expect(s).toEqual(before);
  });
});
