import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { COUNTER_CONTINUATION_PINS, CANDIDATE_SEVEN_EFFECT_ID, prepareCounterContinuation, assertCounterContinuation, checkpointCounterContinuation } from '../packages/engine/src/counter-continuation.js';
import { spellResolutionBoard } from '../packages/engine/src/spell-resolution.js';
import { planResolution } from '../packages/engine/src/effect-plans.js';
import type { ChainLink, DuelState, EventRef, Slot } from '../packages/protocol/src/duel.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const {registry}=loadRuntimeCatalog(),magicDef='official:77414722',sevenDef='official:03819470';
const design=JSON.parse(readFileSync('data/evidence/effects/counter-to-counter-scope-review.json','utf8'));
const roots=Object.keys(registry.spellHandlers);

// Trusted intermediate INPUT for an isolated candidate component. No game activation
// API creates this three-link state, and the active engine must continue to reject it.
function fixture(rootDef=roots[0]!,actor='a',selfMagic=false,selfSeven=false,lp=1001){
  const other=actor==='a'?'b':'a',magicOwner=selfMagic?actor:other,sevenOwner=selfSeven?magicOwner:(magicOwner==='a'?'b':'a');
  const deck=[...Object.keys(registry.cards),'official:05053103'];
  const state=structuredClone(createDuel(registry,{duelId:'counter-journal',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:actor,seedHex:'cf'.repeat(32)}).state) as Mutable<DuelState>;
  for(const p of state.players)for(const id of p.hand.splice(0)){p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};}
  state.turn.number=3;state.turn.phase='main1';state.timing.window='resolving';state.timing.priorityPlayer=null;state.timing.consecutivePasses=2;
  const move=(definitionId:string,who:string,zone:'monster'|'spell-trap'|'graveyard',slot:Slot=0)=>{
    const p=state.players.find(p=>p.id===who)!,id=p.deck.find(id=>state.cards[id]!.definition.id===definitionId)!;if(!id)throw new Error('Missing fixture '+definitionId);
    p.deck.splice(p.deck.indexOf(id),1);const card=state.cards[id]!;
    if(zone==='graveyard'){p.graveyard.push(id);card.location={kind:zone,playerId:who};card.position='face-up';}
    else{(zone==='monster'?p.monsters:p.spellsTraps)[slot]=id;card.location={kind:zone,playerId:who,slot};card.position=zone==='monster'?'face-up-attack':'face-up';if(zone==='spell-trap')card.markers.setOnTurn=2;}
    return id;
  };
  for(const who of ['a','b'])move('official:91152256',who,'graveyard'); // Celtic Guardian prefix.
  const root=move(rootDef,actor,'spell-trap'),magic=move(magicDef,magicOwner,'spell-trap',2),seven=move(sevenDef,sevenOwner,'spell-trap',4);
  const target=move('official:05053103',other,'monster',0);move('official:05053103',other,'monster',1);
  const handler=registry.spellHandlers[rootDef]!.handler,hasCost=['discard-destroy-target-monster','discard-return-own-graveyard-monster'].includes(handler);
  const rootCost=hasCost?move('official:32274490',actor,'graveyard'):null; // Skull Servant.
  const magicCost=move('official:15025844',magicOwner,'graveyard');
  const discard=(id:string,who:string,sequence:number):EventRef=>({sequence,simultaneousGroup:'cost-'+sequence,kind:'cards-discarded',affectedInstances:[id],details:{playerId:who,reason:'activation-cost'}});
  const link=(source:string,who:string,effectId:string,speed:1|3,costEvents:readonly EventRef[],respondingToLinkId?:string):ChainLink=>({
    id:'link-'+source,controllerId:who,source,sourceAtActivation:structuredClone(state.cards[source]!),effectId,spellSpeed:speed,costEvents,targetRefs:[],
    ...(respondingToLinkId?{respondingToLinkId}:{}),activationNegated:false,effectNegated:false});
  const rootLink=link(root,actor,'normal-spell',1,rootCost?[discard(rootCost,actor,2)]:[]);
  if(hasCost||handler==='target-opposing-attack-to-defense'){
    const id=handler==='discard-return-own-graveyard-monster'?rootCost!:target;
    (rootLink.targetRefs as Mutable<ChainLink['targetRefs']>).push({instanceId:id,locationAtSelection:structuredClone(state.cards[id]!.location)});
  }
  const magicLink=link(magic,magicOwner,'discard-negate-normal-spell-activation',3,[discard(magicCost,magicOwner,4)],rootLink.id);
  const sevenLink=link(seven,sevenOwner,CANDIDATE_SEVEN_EFFECT_ID,3,[{sequence:6,simultaneousGroup:'cost-6',kind:'life-points-paid',affectedInstances:[],
    details:{playerId:sevenOwner,reason:'activation-cost',amount:1000,beforeLP:lp,afterLP:lp-1000}}],magicLink.id);
  state.players.find(p=>p.id===sevenOwner)!.lifePoints=lp-1000;state.eventSequence=7;
  state.chain=structuredClone([rootLink,magicLink,sevenLink]) as Mutable<DuelState['chain']>;
  return{state,root,magic,seven,rootCost,magicCost,target,actor,other,magicOwner,sevenOwner};
}
function prepare(f:ReturnType<typeof fixture>){const before=structuredClone(f.state),result=prepareCounterContinuation(registry,f.state);expect(f.state).toEqual(before);return result;}
function work(f:ReturnType<typeof fixture>,r:ReturnType<typeof prepare>){return{...structuredClone(f.state),...structuredClone(r.board),chain:[structuredClone(r.activeRoot)]} as Mutable<DuelState>;}

describe('isolated Counter continuation component; three-link gameplay remains disabled',()=>{
  it('pins exactly the 11 reviewed root definitions and both Counter definitions from the frozen design',()=>{
    const expected=Object.fromEntries([...design.currentRootSpellPins,...Object.values(design.cardPins)].map((p:any)=>[p.cardId,p.definitionSha256]));
    expect(COUNTER_CONTINUATION_PINS).toEqual(expected);expect(Object.keys(COUNTER_CONTINUATION_PINS)).toHaveLength(13);
  });
  it.each(roots.flatMap(root=>['a','b'].flatMap(actor=>[false,true].flatMap(selfMagic=>[false,true].map(selfSeven=>({root,actor,selfMagic,selfSeven}))))))(
    '$root $actor selfMagic=$selfMagic selfSeven=$selfSeven preserves all paid costs and the original root',options=>{
      const f=fixture(options.root,options.actor,options.selfMagic,options.selfSeven),r=prepare(f),s=work(f,r);
      expect(()=>assertDuelInvariants(f.state,registry)).toThrow(); // No active three-link gate.
      expect(()=>assertDuelInvariants(s,registry)).toThrow(); // Transient component output is not a stable player state.
      assertCounterContinuation(registry,s,r.journal);
      expect(r.journal).toMatchObject({stage:'before-root',cleanupSourceIds:[f.root,f.seven],magicResult:'activation-negated-destroyed-skipped',sevenResult:'resolved-awaiting-cleanup'});
      expect(r.journal.magic.activationNegated).toBe(true);expect(r.journal.root.activationNegated).toBe(false);
      expect(r.journal.seven.costEvents).toEqual(f.state.chain[2]!.costEvents);expect(r.journal.magic.costEvents).toEqual(f.state.chain[1]!.costEvents);
      expect(r.journal.root.costEvents).toEqual(f.state.chain[0]!.costEvents);
      for(const p of s.players){const old=f.state.players.find(o=>o.id===p.id)!;
        expect(p.lifePoints).toBe(old.lifePoints);expect(p.hand).toEqual(old.hand);expect(p.deck).toEqual(old.deck);expect(p.monsters).toEqual(old.monsters);
        expect(p.graveyard).toEqual(p.id===f.magicOwner?[...old.graveyard,f.magic]:old.graveyard);
      }
      expect(s.cards[f.root]).toEqual(f.state.cards[f.root]);expect(s.cards[f.seven]).toEqual(f.state.cards[f.seven]);
      expect(s.cards[f.target]).toEqual(f.state.cards[f.target]);expect(s.cards[f.magic]!.location).toEqual({kind:'graveyard',playerId:f.magicOwner});
      expect(Object.isFrozen(r.journal.magic.costEvents)).toBe(true);expect(Object.isFrozen(r.board.cards[f.magic])).toBe(true);
      const restored=JSON.parse(JSON.stringify(r.journal));assertCounterContinuation(registry,s,restored);
      expect(()=>prepareCounterContinuation(registry,s)).toThrow(); // Cannot destroy the same link twice.
    });

  it('keeps 1000 LP payment historical after the real Dian Keto plan gains LP',()=>{
    const f=fixture('official:84257639','a',false,false),r=prepare(f),s=work(f,r),paid=s.players.find(p=>p.id===f.sevenOwner)!;
    expect(paid.lifePoints).toBe(1);
    const plan=planResolution(registry.spellHandlers[s.cards[f.root]!.definition.id],spellResolutionBoard(registry,s,f.actor));
    if(plan.kind!=='life-points-gained')throw new Error('Wrong real root plan');
    s.players.find(p=>p.id===plan.playerId)!.lifePoints+=plan.amount;
    const journal=checkpointCounterContinuation(registry,s,r.journal,'cleanup');assertCounterContinuation(registry,s,journal);
    expect(paid.lifePoints).toBe(1001);expect(journal.seven.costEvents[0]!.details).toMatchObject({beforeLP:1001,afterLP:1,amount:1000});
    expect(()=>assertCounterContinuation(registry,s,r.journal)).toThrow();expect(()=>checkpointCounterContinuation(registry,s,journal,'cleanup')).toThrow();
  });
  it('does not require the root discard to remain in the Graveyard after Monster Reincarnation legitimately returns it',()=>{
    const f=fixture('official:74848038','a',true,false),r=prepare(f),s=work(f,r);
    const plan=planResolution(registry.spellHandlers[s.cards[f.root]!.definition.id],spellResolutionBoard(registry,s,f.actor));
    expect(plan.kind).toBe('return-selected-graveyard-monster');
    const id=r.activeRoot.targetRefs[0]!.instanceId,p=s.players.find(p=>p.id===f.actor)!;expect(id).toBe(f.rootCost);
    p.graveyard.splice(p.graveyard.indexOf(id),1);p.hand.push(id);s.cards[id]!.location={kind:'hand',playerId:f.actor};s.cards[id]!.position='face-down';
    const journal=checkpointCounterContinuation(registry,s,r.journal,'cleanup');assertCounterContinuation(registry,s,journal);
    expect(journal.root.costEvents[0]!.affectedInstances).toEqual([id]);expect(p.hand).toEqual([id]);
    expect(s.cards[f.magicCost]!.location.kind).toBe('graveyard');
  });
  it.each(['official:66788016','official:97169186','official:26412047'])('keeps spent Counters across the real %s choice and only then reaches cleanup',root=>{
    const f=fixture(root),r=prepare(f),s=work(f,r);
    const plan=planResolution(registry.spellHandlers[root],spellResolutionBoard(registry,s,f.actor));if(plan.kind!=='choose-destruction')throw new Error('Missing real tie plan');
    s.pendingDecision={id:r.activeRoot.id+':choice',kind:'effect-choice',playerId:plan.playerId,optionIds:[...plan.optionIds],min:1,max:1};
    const waiting=checkpointCounterContinuation(registry,s,r.journal,'root-choice');assertCounterContinuation(registry,s,waiting);
    expect(s.cards[f.seven]!.location.kind).toBe('spell-trap');expect(s.cards[f.magic]!.location.kind).toBe('graveyard');
    expect(()=>checkpointCounterContinuation(registry,s,waiting,'cleanup')).toThrow();
    const chosen=plan.optionIds[0]!,card=s.cards[chosen]!,location=card.location;if(location.kind!=='monster')throw new Error('Wrong target zone');
    s.players.find(p=>p.id===card.controllerId)!.monsters[location.slot]=null;s.players.find(p=>p.id===card.ownerId)!.graveyard.push(chosen);
    card.location={kind:'graveyard',playerId:card.ownerId};card.controllerId=card.ownerId;card.position='face-up';s.pendingDecision=null;
    const ready=checkpointCounterContinuation(registry,s,waiting,'cleanup');assertCounterContinuation(registry,s,ready);
    expect(ready.cleanupSourceIds).toEqual([f.root,f.seven]);
  });
  it.each(['missing-root','wrong-link','same-turn','unpaid-discard','lp-drift','lp-zero','wrong-amount','bad-chronology','wrong-root-pin','negated-root','four-links','pending-decision'])('rejects %s before producing a board patch',mode=>{
    const f=fixture();
    if(mode==='missing-root')f.state.chain.shift();
    if(mode==='wrong-link')f.state.chain[2]!.respondingToLinkId='old';
    if(mode==='same-turn'){f.state.cards[f.seven]!.markers.setOnTurn=3;f.state.chain[2]!.sourceAtActivation.markers.setOnTurn=3;}
    if(mode==='unpaid-discard')f.state.cards[f.magicCost]!.location={kind:'hand',playerId:f.magicOwner};
    if(mode==='lp-drift')f.state.players.find(p=>p.id===f.sevenOwner)!.lifePoints++;
    if(mode==='lp-zero')f.state.players.find(p=>p.id===f.sevenOwner)!.lifePoints=0;
    if(mode==='wrong-amount')f.state.chain[2]!.costEvents[0]!.details!.amount=999;
    if(mode==='bad-chronology')f.state.chain[1]!.costEvents[0]!.sequence=6;
    if(mode==='wrong-root-pin')f.state.chain[0]!.sourceAtActivation.definition.id='official:03819470';
    if(mode==='negated-root')f.state.chain[0]!.activationNegated=true;
    if(mode==='four-links')f.state.chain.push(structuredClone(f.state.chain[2]!));
    if(mode==='pending-decision')f.state.pendingDecision={id:'pending',kind:'discard',playerId:f.actor,optionIds:[],min:0,max:0};
    const before=structuredClone(f.state);expect(()=>prepareCounterContinuation(registry,f.state)).toThrow();expect(f.state).toEqual(before);
  });
  it.each(['lp','cost-card','source','root','cleanup','stage','unknown'])('detects changed %s in the stored journal',mode=>{
    const f=fixture(),r=prepare(f),s=work(f,r),j=structuredClone(r.journal) as any;
    if(mode==='lp')j.seven.costEvents[0].details.afterLP=1001;if(mode==='cost-card')j.magic.costEvents[0].affectedInstances[0]=f.root;
    if(mode==='source')j.magic.sourceAtActivation.id='fake';if(mode==='root')j.root.activationNegated=true;
    if(mode==='cleanup')j.cleanupSourceIds.reverse();if(mode==='stage')j.stage='cleanup';if(mode==='unknown')j.extra=true;
    expect(()=>assertCounterContinuation(registry,s,j)).toThrow();
  });
  it.each(['life-points','failed-draw','concession'] as const)('does not checkpoint after terminal %s or invent cleanup after the duel',reason=>{
    const f=fixture(),r=prepare(f),s=work(f,r);s.result={winner:f.actor,reason};
    expect(()=>checkpointCounterContinuation(registry,s,r.journal,'cleanup')).toThrow();expect(s.cards[f.seven]!.location.kind).toBe('spell-trap');
  });
  it.each(['window','priority','passes','zero-lp'])('does not accept or checkpoint a suspended context with invalid %s',mode=>{
    const f=fixture(),r=prepare(f),s=work(f,r);
    if(mode==='window')s.timing.window='open';if(mode==='priority')s.timing.priorityPlayer=f.actor;
    if(mode==='passes')s.timing.consecutivePasses=1;if(mode==='zero-lp')s.players[0].lifePoints=0;
    expect(()=>assertCounterContinuation(registry,s,r.journal)).toThrow();
    expect(()=>checkpointCounterContinuation(registry,s,r.journal,'cleanup')).toThrow();
  });
});
