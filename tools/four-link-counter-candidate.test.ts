import { describe,expect,it } from 'vitest';
import { createHash } from 'node:crypto';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupFourLinkCounterCandidate } from './fixtures/four-link-counter-candidate.js';
import { prepareFourLinkCounterCandidate,assertFourLinkCounterCandidate } from '../packages/engine/src/four-link-counter-candidate.js';
import { assertDuelInvariants,applyAction } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { prepareChainCleanup,chainCleanupDecision,orderChainCleanup,commitChainCleanup } from '../packages/engine/src/chain-cleanup.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
const {registry}=loadRuntimeCatalog();
const roots=Object.keys(registry.spellHandlers);
function prepare(f:ReturnType<typeof setupFourLinkCounterCandidate>){const before=structuredClone(f.state),p=prepareFourLinkCounterCandidate(registry,f.state);expect(f.state).toEqual(before);expect(Object.isFrozen(f.state.cards[f.root])).toBe(false);return p;}
describe('isolated four-link Spell Magic Seven Seven candidate, not enabled gameplay',()=>{
  it.each(roots.flatMap(root=>['a','b'].flatMap(actor=>[false,true].flatMap(selfMagic=>[false,true].flatMap(selfFirst=>[false,true].map(selfTop=>({root,actor,selfMagic,selfFirst,selfTop})))))))(
    '$root $actor MagicSelf=$selfMagic firstSelf=$selfFirst topSelf=$selfTop',o=>{
      const f=setupFourLinkCounterCandidate(registry,o.root,o.actor,o.selfMagic,o.selfFirst,o.selfTop,o.actor==='a'?'main1':'main2',o.selfMagic),p=prepare(f);
      expect(f.denied).toMatchObject({accepted:false,code:'illegal-timing'});expect(()=>assertDuelInvariants(f.state,registry)).toThrow();
      expect(p.steps).toEqual([{resolver:f.top,negatedDestroyedSkipped:f.first},{resolver:f.magic,negatedDestroyedSkipped:f.root}]);
      expect(p.journal.root.activationNegated).toBe(true);expect(p.journal.seven.activationNegated).toBe(true);expect(p.journal.magic.activationNegated).toBe(false);expect(p.journal.top.activationNegated).toBe(false);
      expect(p.journal.cleanupSourceIds).toEqual([f.magic,f.top]);expect(p.journal.lpCosts.payments).toHaveLength(2);
      const post={...f.state,...p.board,chain:p.remainingChain};expect(post.result).toBeNull();assertFourLinkCounterCandidate(registry,post,p.journal);
      assertFourLinkCounterCandidate(registry,JSON.parse(JSON.stringify(post)),JSON.parse(JSON.stringify(p.journal)));
      for(const who of [f.actor,f.other]){const old=f.state.players.find(p=>p.id===who)!,now=p.board.players.find(p=>p.id===who)!;
        expect(now.lifePoints).toBe(old.lifePoints);expect(now.deck).toEqual(old.deck);expect(now.hand).toEqual(old.hand);expect(now.monsters).toEqual(old.monsters);expect(now.normalSummonsOrSetsUsed).toBe(old.normalSummonsOrSetsUsed);
        expect(now.graveyard.slice(0,old.graveyard.length)).toEqual(old.graveyard);
        const destroyed=[f.first,f.root].filter(id=>f.state.cards[id]!.ownerId===who);expect(now.graveyard.slice(old.graveyard.length)).toEqual(destroyed);
      }
      for(const target of f.targets)expect(p.board.cards[target]).toEqual(f.state.cards[target]);
      if(f.rootCost)expect(p.board.cards[f.rootCost]).toEqual(f.state.cards[f.rootCost]);expect(p.board.cards[f.magicCost]).toEqual(f.state.cards[f.magicCost]);
      for(const id of [f.root,f.first])expect(p.board.cards[id]!.location.kind).toBe('graveyard');
      for(const id of [f.magic,f.top])expect(p.board.cards[id]).toEqual(f.state.cards[id]);
      expect(Object.isFrozen(p.board.cards[f.root])).toBe(true);expect(Object.isFrozen(p.journal.lpCosts.payments[0])).toBe(true);
    });
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(same=>[false,true].flatMap(large=>(['main1','main2']as const).map(phase=>({actor,same,large,phase}))))))(
    'cleanup candidate foundation $actor same=$same large=$large $phase',o=>{
      const f=setupFourLinkCounterCandidate(registry,'official:74848038',o.actor,false,true,o.same,o.phase,true,o.large),p=prepare(f),post={...f.state,...p.board,chain:p.remainingChain};
      const input=structuredClone(post);let frame=prepareChainCleanup(registry,post,p.journal.cleanupSourceIds);const d=chainCleanupDecision(registry,post,frame);
      if(f.magicOwner===f.topOwner){expect(d?.playerId).toBe(f.topOwner);frame=orderChainCleanup(registry,post,frame,d!.playerId,[...d!.optionIds].reverse());}
      else expect(d).toBeNull();const end=commitChainCleanup(registry,post,frame);expect(post).toEqual(input);expect(()=>assertFourLinkCounterCandidate(registry,{...post,...end},p.journal)).toThrow();
      for(const id of [f.root,f.first,f.magic,f.top,f.magicCost,f.rootCost!])expect(end.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
      expect(end.players.map(p=>p.lifePoints)).toEqual(post.players.map(p=>p.lifePoints));
      // Foundation calls above are not a live cleanup decision or accepted four-link state.
      expect(()=>assertDuelInvariants(post,registry)).toThrow();
    });
  it.each(['root-flag','magic-flag','first-flag','top-flag','wrong-effect','wrong-response','duplicate-source','duplicate-link','same-turn','source-snapshot','lp-gap','lp-current','lp-amount','lp-sequence','lp-extra','root-cost','magic-cost','target-moved','unknown-target','phase','window','passes','priority','decision','result','registry','orphan','duplicate-zone','fifth-link','negative-version','banished-copy','fusion-copy','field-copy'])(
    'rejects invalid candidate %s without moving, paying or freezing input',mode=>{
      const f=setupFourLinkCounterCandidate(registry,'official:74848038','a',false,true,true),s=f.state,l=s.chain[3]!,e=l.costEvents[0]!;
      if(mode==='root-flag')s.chain[0]!.activationNegated=true;if(mode==='magic-flag')s.chain[1]!.activationNegated=true;if(mode==='first-flag')s.chain[2]!.activationNegated=true;if(mode==='top-flag')l.activationNegated=true;
      if(mode==='wrong-effect')l.effectId=s.chain[2]!.effectId;if(mode==='wrong-response')l.respondingToLinkId=s.chain[1]!.id;if(mode==='duplicate-source')l.source=s.chain[2]!.source;if(mode==='duplicate-link')l.id=s.chain[2]!.id;
      if(mode==='same-turn'){s.cards[f.top]!.markers.setOnTurn=3;l.sourceAtActivation.markers.setOnTurn=3;}if(mode==='source-snapshot')l.sourceAtActivation.ownerId='bad';
      if(mode==='lp-gap'){e.details!.beforeLP=2001;e.details!.afterLP=1001;s.players.find(p=>p.id===f.topOwner)!.lifePoints=1001;}if(mode==='lp-current')s.players[0].lifePoints++;
      if(mode==='lp-amount')e.details!.amount=999;if(mode==='lp-sequence')e.sequence=s.chain[2]!.costEvents[0]!.sequence;if(mode==='lp-extra')e.details!.refund=0;
      if(mode==='root-cost')s.chain[0]!.costEvents=[];if(mode==='magic-cost')s.chain[1]!.costEvents[0]!.affectedInstances=[f.top];
      if(mode==='target-moved')s.chain[0]!.targetRefs[0]!.locationAtSelection={kind:'monster',playerId:'a',slot:0};if(mode==='unknown-target')s.chain[0]!.targetRefs[0]!.instanceId='missing';
      if(mode==='phase')s.turn.phase='battle';if(mode==='window')s.timing.window='chain-response';if(mode==='passes')s.timing.consecutivePasses=1;if(mode==='priority')s.timing.priorityPlayer='a';
      if(mode==='decision')s.pendingDecision={id:'x',kind:'discard',playerId:'a',min:0,max:0,optionIds:[]};if(mode==='result')s.result={winner:'a',reason:'concession'};if(mode==='registry')s.cardRegistryRevision='old';
      if(mode==='banished-copy')s.players[0].banished.push(s.players[0].deck[0]!);if(mode==='fusion-copy')s.players[0].fusionDeck.push(s.players[0].deck[0]!);if(mode==='field-copy')s.players[0].field=s.players[0].deck[0]!;
      if(mode==='orphan')s.players[0].deck.pop();if(mode==='duplicate-zone')s.players[0].hand.push(s.players[0].deck[0]!);if(mode==='fifth-link')s.chain.push(structuredClone(l));if(mode==='negative-version')s.stateVersion=-1;
      const before=structuredClone(s);expect(()=>prepareFourLinkCounterCandidate(registry,s)).toThrow();expect(s).toEqual(before);expect(Object.isFrozen(s.cards[f.top])).toBe(false);
    });
  it.each(['board','lp','cost','cleanup','flags','survivor','destroyed','clock','turn','extra','ledger','rehash'])(
    'rejects candidate checkpoint drift %s',mode=>{
      const f=setupFourLinkCounterCandidate(registry),p=prepare(f),s=structuredClone({...f.state,...p.board,chain:p.remainingChain}) as Mutable<DuelState>,j=structuredClone(p.journal) as any;
      if(mode==='board')s.players[0].deck.reverse();if(mode==='lp')s.players[0].lifePoints++;if(mode==='cost')j.root.costEvents=[...j.magic.costEvents];if(mode==='cleanup')j.cleanupSourceIds.reverse();
      if(mode==='flags')j.magic.activationNegated=true;if(mode==='survivor')s.cards[f.magic]!.position='face-down';if(mode==='destroyed')s.cards[f.first]!.position='face-down';
      if(mode==='clock')s.eventSequence=j.capturedSequence-1;if(mode==='turn')s.turn.number++;if(mode==='extra')j.extra=true;if(mode==='ledger')j.lpCosts.payments[0].amount=1;
      if(mode==='rehash'){j.top.respondingToLinkId=j.root.id;const{integritySha256:_old,...body}=j;j.integritySha256=createHash('sha256').update(JSON.stringify(body)).digest('hex');}
      const before=structuredClone(s);expect(()=>assertFourLinkCounterCandidate(registry,s,j)).toThrow();expect(s).toEqual(before);
    });
  it.each(['a','b'].flatMap(actor=>([0,1]as const).map(remaining=>({actor,remaining}))))('skips Pot draw/deck-out for $actor with $remaining remaining',o=>{
    const f=setupFourLinkCounterCandidate(registry,'official:55144522',o.actor,false,true,false,'main1',false,false,o.remaining),p=prepare(f);
    const before=f.state.players.find(p=>p.id===o.actor)!,after=p.board.players.find(p=>p.id===o.actor)!;
    expect(before.deck).toHaveLength(o.remaining);expect(after.deck).toEqual(before.deck);expect(after.hand).toEqual(before.hand);
    expect({...f.state,...p.board}.result).toBeNull();expect(p.journal.root.activationNegated).toBe(true);
  });
  it.each(['a','b'])('does not expose/enable a fourth response for %s in the adapter',actor=>{
    const f=setupFourLinkCounterCandidate(registry,'official:66788016',actor),room=createCommandAdapter(registry,f.accepted),v=room.getView(f.topOwner,true);
    expect(v.availableActions!.some(a=>a.type==='activate-lp-counter-trap')).toBe(false);
    const c=v.players.find(p=>p.playerId===f.topOwner)!.spellsTraps[3]!;
    const command={commandId:'not-enabled',duelId:v.duelId,expectedStateVersion:v.stateVersion,action:{type:'activate-lp-counter-trap' as const,cardHandle:c.handle,chainHandle:v.chain[2]!.chainHandle}};
    expect(room.submit(f.topOwner,command)).toMatchObject({accepted:false,reason:'illegal-timing'});expect(room.getView(f.topOwner,true)).toEqual(v);
    expect(applyAction(registry,f.accepted,{actorId:f.topOwner,expectedStateVersion:f.accepted.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:f.top,respondingToLinkId:f.accepted.chain[2]!.id}})).toMatchObject({accepted:false,code:'illegal-timing'});
    for(const key of ['lpCosts','cleanupSourceIds','integritySha256','normal-spell-magic-seven-seven-candidate-v1'])expect(JSON.stringify(v)).not.toContain(key);
  });
});
