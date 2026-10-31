import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupThreeLinkInteractions } from './fixtures/three-link-interactions.js';
import { applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { DuelAction, DuelCommand, CommandOutcome } from '../packages/protocol/src/commands.js';
const { registry } = loadRuntimeCatalog();
type Fixture = ReturnType<typeof setupThreeLinkInteractions>;

function run(f: Fixture, reverseFirst: boolean, withAdapter = false) {
  let state: DuelState = f.state, serial = 0;
  const room = withAdapter ? createCommandAdapter(registry, state) : null;
  const events: { kind: string; affectedInstances: readonly string[]; details: Readonly<Record<string,string|number|boolean>> }[] = [];
  let firstRootAction: Extract<DuelAction,{type:'activate-spell'}> | null = null, oldSeven: { command: DuelCommand; receipt: CommandOutcome } | null = null, reactivations = 0;
  const cardHandle = (id: string, who: string) => {
    const card = state.cards[id]!, p = state.players.find(p => p.id === card.location.playerId)!, v = room!.getView(who);
    const b = v.players.find(q => q.playerId === p.id)!;
    if (card.location.kind === 'hand') return v.selfHand[p.hand.indexOf(id)]!.handle;
    if (card.location.kind === 'graveyard') return b.graveyard[p.graveyard.indexOf(id)]!.handle;
    if (card.location.kind === 'monster') return b.monsters[card.location.slot]!.handle;
    if (card.location.kind === 'spell-trap') return b.spellsTraps[card.location.slot]!.handle;
    throw new Error('Unsupported test handle zone');
  };
  const translate = (who: string, a: EngineAction): DuelAction => {
    const v = room!.getView(who);
    switch(a.type) {
      case 'activate-spell': return { type:a.type,cardHandle:cardHandle(a.instanceId,who),slot:a.slot as Slot,
        ...(a.discardId ? {discardHandle:cardHandle(a.discardId,who)}:{}),...(a.targetId?{targetHandle:cardHandle(a.targetId,who)}:{}) };
      case 'activate-counter-trap': return {type:a.type,cardHandle:cardHandle(a.instanceId,who),discardHandle:cardHandle(a.discardId,who),chainHandle:v.chain[state.chain.findIndex(l=>l.id===a.respondingToLinkId)]!.chainHandle};
      case 'activate-lp-counter-trap': return {type:a.type,cardHandle:cardHandle(a.instanceId,who),chainHandle:v.chain[state.chain.findIndex(l=>l.id===a.respondingToLinkId)]!.chainHandle};
      case 'set-monster': return {type:a.type,cardHandle:cardHandle(a.instanceId,who),slot:a.slot as Slot,tributeHandles:a.tributeIds.map(id=>cardHandle(id,who))};
      case 'flip-summon': return {type:a.type,cardHandle:cardHandle(a.instanceId,who)};
      case 'answer-decision': return {type:a.type,decisionId:v.decision!.id,optionIds:a.optionIds.map(id=>v.decision!.optionIds[state.pendingDecision!.optionIds.indexOf(id)]!)};
      case 'pass': case 'request-phase': return a;
      default: throw new Error('Unexpected scenario action');
    }
  };
  const act = (who: string, action: EngineAction) => {
    const before = structuredClone(state), current = state;
    if(room) {
      const intent = translate(who,action), command = {commandId:'audit-'+ ++serial,duelId:state.id,expectedStateVersion:state.stateVersion,action:intent};
      if(action.type==='activate-spell'&&action.instanceId===f.root) {
        if(intent.type!=='activate-spell')throw new Error('Wrong translated root action');
        if(reactivations++===0) firstRootAction=intent;
        else {
          const v=room.getView(who);expect(intent.cardHandle).not.toBe(firstRootAction!.cardHandle);
          expect(room.submit(who,{...command,commandId:'stale-root-'+ ++serial,action:firstRootAction}).accepted).toBe(false);
          expect(room.getView(who)).toEqual(v);
          expect(room.submit(f.sevenOwner,oldSeven!.command)).toEqual(oldSeven!.receipt);
          expect(room.getView(who)).toEqual(v); // Old accepted cost receipt cannot affect a new Chain.
        }
      }
      const receipt=room.submit(who,command);expect(receipt.accepted).toBe(true);
      if(action.type==='activate-lp-counter-trap'&&!oldSeven) oldSeven={command,receipt};
      const v=room.getView(who);expect(room.submit(who,command)).toEqual(receipt);expect(room.getView(who)).toEqual(v);
    }
    const result=applyAction(registry,current,{actorId:who,expectedStateVersion:current.stateVersion,action});
    expect(current).toEqual(before);if(!result.accepted)throw new Error(result.message);state=result.state;assertDuelInvariants(state,registry);events.push(...result.events);
    if(room) {
      for(const viewer of ['a','b']) {
        const v=room.getView(viewer,true);expect(v.stateVersion).toBe(state.stateVersion);
        for(const key of ['counterResolution','sourceAtActivation','integritySha256'])expect(JSON.stringify(v)).not.toContain(key);
        if(state.pendingDecision?.playerId!==viewer)expect(v.decision).toBeNull();
      }
    }
    return result;
  };
  const reject=(who:string,action:EngineAction)=>{const r=applyAction(registry,state,{actorId:who,expectedStateVersion:state.stateVersion,action});expect(r.accepted).toBe(false);expect(r.state).toBe(state);};
  const settle=()=>{for(let n=0;state.timing.window!=='open'&&!state.result;n++){
    if(n>12||state.pendingDecision)throw new Error('Unexpected suspended scenario');act(state.timing.priorityPlayer!,{type:'pass'});
  }};
  const nextMain=()=>{const turn=state.turn.number;act(state.turn.activePlayer,{type:'request-phase',phase:'end'});settle();
    if(state.turn.number===turn){act(state.turn.activePlayer,{type:'request-phase',phase:'draw'});settle();}
    act(state.turn.activePlayer,{type:'request-phase',phase:'standby'});settle();act(state.turn.activePlayer,{type:'request-phase',phase:'main1'});settle();
  };
  const lp=()=>state.players.find(p=>p.id===f.sevenOwner)!.lifePoints, timeline=[lp()];
  const chain=(second:boolean)=>{
    const cost=second?f.secondCost:f.firstCost,target=second?f.secondCost:f.faith,magic=second?f.magic2:f.magic1,seven=second?f.seven2:f.seven1;
    const offset=events.length;
    act(f.actor,{type:'activate-spell',instanceId:f.root,slot:0,discardId:cost,targetId:target});
    const rootLink=state.chain[0]!;
    if(state.timing.priorityPlayer!==f.magicOwner)act(state.timing.priorityPlayer!,{type:'pass'});
    act(f.magicOwner,{type:'activate-counter-trap',instanceId:magic,discardId:second?f.magicCost2:f.magicCost1,respondingToLinkId:rootLink.id});
    expect(state.pendingTriggers).toEqual([]);expect(state.pendingDecision).toBeNull();
    if(state.timing.priorityPlayer!==f.sevenOwner)act(state.timing.priorityPlayer!,{type:'pass'});
    act(f.sevenOwner,{type:'activate-lp-counter-trap',instanceId:seven,respondingToLinkId:state.chain[1]!.id});timeline.push(lp());
    expect(state.chain).toHaveLength(3);expect(state.chain[0]).toEqual(rootLink);
    act(state.timing.priorityPlayer!,{type:'pass'});act(state.timing.priorityPlayer!,{type:'pass'});
    expect(state.cards[target]!.location).toEqual({kind:'hand',playerId:f.actor});
    if(f.sevenOwner===f.actor){expect(state.pendingDecision!.kind).toBe('cleanup-order');
      const d=state.pendingDecision!,reverse=second?!reverseFirst:reverseFirst;
      act(d.playerId,{type:'answer-decision',decisionId:d.id,optionIds:reverse?[...d.optionIds].reverse():[...d.optionIds]});
      expect(state.players.find(p=>p.id===f.actor)!.graveyard.slice(-2)).toEqual(reverse?[seven,f.root]:[f.root,seven]);
    }else expect(state.pendingDecision).toBeNull();
    expect(state.chain).toEqual([]);expect(state.counterResolution).toBeNull();expect(state.pendingTriggers).toEqual([]);expect(lp()).toBe(1);
    const group=events.slice(offset);expect(group.filter(e=>e.kind==='chain-resolved')).toHaveLength(1);
    expect(group.filter(e=>e.kind==='trap-destroyed').map(e=>e.affectedInstances)).toEqual([[magic]]);
    expect(group.filter(e=>e.kind==='chain-link-negated-skipped').map(e=>e.affectedInstances)).toEqual([[magic]]);
    expect(group.some(e=>['effect-damage','life-points-gained','flip-effect-activated'].includes(e.kind))).toBe(false);
    const end=state;settle();return{rootLink,end};
  };
  const first=chain(false);
  const heal=()=>{act(f.sevenOwner,{type:'activate-spell',instanceId:f.heal,slot:0});expect(lp()).toBe(1);settle();timeline.push(lp());expect(lp()).toBe(1001);};
  if(f.sevenOwner===f.actor)heal();
  act(f.actor,{type:'set-monster',instanceId:f.faith,slot:0,tributeIds:[]});settle();
  expect(state.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(1);reject(f.actor,{type:'flip-summon',instanceId:f.faith});
  nextMain();expect(state.turn.activePlayer).toBe(f.other);if(f.sevenOwner!==f.actor)heal();nextMain();expect(state.turn.activePlayer).toBe(f.actor);
  const turn=state.turn.number;expect(turn).toBe(5);act(f.actor,{type:'flip-summon',instanceId:f.faith});
  const d=state.pendingDecision!;expect(d.kind).toBe('target');expect([...d.optionIds].sort()).toEqual([f.firstCost,f.root,...(f.sevenOwner===f.actor?[f.heal]:[])].sort());
  for(const id of [f.magic1,f.seven1,f.magicCost1])reject(f.actor,{type:'answer-decision',decisionId:d.id,optionIds:[id]});
  act(f.actor,{type:'answer-decision',decisionId:d.id,optionIds:[f.root]});expect(state.cards[f.root]!.location.kind).toBe('graveyard');settle();
  expect(state.cards[f.root]!.location).toEqual({kind:'hand',playerId:f.actor});expect(state.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(0);
  reject(f.actor,{type:'activate-spell',instanceId:f.root,slot:0,discardId:f.firstCost,targetId:f.secondCost});
  const second=chain(true);expect(second.rootLink.id).not.toBe(first.rootLink.id);expect(second.rootLink.source).toBe(first.rootLink.source);
  expect(first.rootLink.costEvents[0]!.affectedInstances).toEqual([f.firstCost]);expect(second.rootLink.costEvents[0]!.affectedInstances).toEqual([f.secondCost]);
  expect(state.cards[f.firstCost]!.location.kind).toBe('graveyard');expect(state.cards[f.secondCost]!.location.kind).toBe('hand');
  if(state.turn.activePlayer!==f.burner)nextMain();expect(state.turn.activePlayer).toBe(f.burner);
  act(f.burner,{type:'activate-spell',instanceId:f.lateBurn,slot:0});expect(lp()).toBe(1);settle();timeline.push(lp());
  expect(timeline).toEqual([1001,1,1001,1,0]);expect(state.result).toEqual({winner:f.burner,reason:'life-points'});
  expect(state.chain).toEqual([]);expect(state.pendingDecision).toBeNull();expect(state.counterResolution).toBeNull();
  expect(events.filter(e=>e.kind==='life-points-paid')).toHaveLength(2);expect(events.filter(e=>e.kind==='effect-damage')).toHaveLength(1);
  expect(events.filter(e=>e.kind==='cards-discarded').map(e=>e.affectedInstances[0])).toEqual([f.firstCost,f.magicCost1,f.secondCost,f.magicCost2]);
  expect(events.filter(e=>e.kind==='returned-to-hand').map(e=>e.affectedInstances[0])).toEqual([f.faith,f.root,f.secondCost]);
  for(const id of [f.firstCost,f.magic1,f.magic2,f.magicCost1,f.magicCost2,f.seven1,f.seven2,f.root,f.lateBurn])expect(state.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
  return{state,events,timeline};
}
describe('three-link sequential interactions across recovery, turns and new payments',()=>{
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(selfMagic=>[false,true].flatMap(selfSeven=>[false,true].map(reverse=>({actor,selfMagic,selfSeven,reverse}))))))(
    '$actor MagicSelf=$selfMagic SevenSelf=$selfSeven reverseFirst=$reverse',o=>{run(setupThreeLinkInteractions(registry,o.actor,o.selfMagic,o.selfSeven),o.reverse);});
  it.each(['a','b'])('keeps refreshed handles and old receipts isolated from the recovered Spell for %s',actor=>
    {run(setupThreeLinkInteractions(registry,actor,actor==='b',actor==='a'),true,true);});
});
