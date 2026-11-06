import {assertThreeSevenLPCostHistory,assertCurrentThreeSevenLPCosts} from '../packages/engine/src/three-seven-lp-cost-ledger.js';
import type {TrapThreeSevenJournal} from '../packages/protocol/src/duel.js';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupTrapFourInteractions } from './fixtures/trap-four-interactions.js';
import { applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { DuelAction, DuelCommand, CommandOutcome } from '../packages/protocol/src/commands.js';
const {registry}=loadRuntimeCatalog();
type Fixture=ReturnType<typeof setupTrapFourInteractions>;

function run(f:Fixture,reverseFirst:boolean,withAdapter=false){
  let state:DuelState=f.state,serial=0;
  const room=withAdapter?createCommandAdapter(registry,state):null;
  const events:{kind:string;affectedInstances:readonly string[];details:Readonly<Record<string,string|number|boolean>>}[]=[];
  let oldSummon:DuelAction|null=null,oldSeven:{command:DuelCommand;receipt:CommandOutcome}|null=null;
  let oldCleanup:{id:string;options:readonly string[]}|null=null,oldCleanupIntent:DuelAction|null=null;
  const handle=(id:string,who:string)=>{
    const c=state.cards[id]!,p=state.players.find(p=>p.id===c.location.playerId)!,v=room!.getView(who),b=v.players.find(p=>p.playerId===c.location.playerId)!;
    switch(c.location.kind){case 'hand':return v.selfHand[p.hand.indexOf(id)]!.handle;case 'graveyard':return b.graveyard[p.graveyard.indexOf(id)]!.handle;
      case 'monster':return b.monsters[c.location.slot]!.handle;case 'spell-trap':return b.spellsTraps[c.location.slot]!.handle;default:throw new Error('Unsupported handle');}
  };
  const translate=(who:string,a:EngineAction):DuelAction=>{
    const v=room!.getView(who);
    switch(a.type){
      case 'normal-summon':return{type:a.type,cardHandle:handle(a.instanceId,who),slot:a.slot as Slot,tributeHandles:a.tributeIds.map(id=>handle(id,who))};
      case 'set-trap':return{type:'set-spell-trap',cardHandle:handle(a.instanceId,who),slot:a.slot as Slot,zone:'spell-trap'};
      case 'flip-summon':return{type:a.type,cardHandle:handle(a.instanceId,who)};
      case 'activate-spell':return{type:a.type,cardHandle:handle(a.instanceId,who),slot:a.slot as Slot,...(a.discardId?{discardHandle:handle(a.discardId,who)}:{}),...(a.targetId?{targetHandle:handle(a.targetId,who)}:{})};
      case 'activate-trap':return{type:a.type,cardHandle:handle(a.instanceId,who),targetHandle:handle(a.targetId,who)};
      case 'activate-lp-counter-trap':return{type:a.type,cardHandle:handle(a.instanceId,who),chainHandle:v.chain[state.chain.findIndex(l=>l.id===a.respondingToLinkId)]!.chainHandle};
      case 'activate-counter-trap':return{type:a.type,cardHandle:handle(a.instanceId,who),discardHandle:handle(a.discardId,who),chainHandle:v.chain[0]!.chainHandle};
      case 'answer-decision':return{type:a.type,decisionId:v.decision!.id,optionIds:a.optionIds.map(id=>v.decision!.optionIds[state.pendingDecision!.optionIds.indexOf(id)]!)};
      case 'pass':case 'request-phase':return a;default:throw new Error('Unexpected scenario action');
    }
  };
  const retryOld=()=>{if(room&&oldSeven){const v=room.getView(f.doubleOwner);expect(room.submit(f.doubleOwner,oldSeven.command)).toEqual(oldSeven.receipt);expect(room.getView(f.doubleOwner)).toEqual(v);expect(room.submit(f.doubleOwner,{...oldSeven.command,commandId:'old-counter-intent-'+ ++serial,expectedStateVersion:state.stateVersion}).accepted).toBe(false);expect(room.getView(f.doubleOwner)).toEqual(v);}};
  const act=(who:string,action:EngineAction)=>{
    const before=structuredClone(state),current=state;
    if(room){
      const intent=translate(who,action),command={commandId:'seven-response-audit-'+ ++serial,duelId:state.id,expectedStateVersion:state.stateVersion,action:intent};
      if(intent.type==='activate-lp-counter-trap')expect(room.getView(who,true).availableActions!.some(a=>a.type==='activate-lp-counter-trap'&&a.cardHandle===intent.cardHandle&&a.chainHandle===intent.chainHandle)).toBe(true);
      if(action.type==='normal-summon'){
        if(!oldSummon)oldSummon=intent;
        else{const v=room.getView(who);expect(room.submit(who,{...command,commandId:'old-summon-'+ ++serial,action:oldSummon}).accepted).toBe(false);expect(room.getView(who)).toEqual(v);}
      }
      if(action.type==='answer-decision'&&state.pendingDecision?.kind==='cleanup-order'){if(oldCleanupIntent){const v=room.getView(who);expect(room.submit(who,{...command,commandId:'stale-cleanup-'+ ++serial,action:oldCleanupIntent}).accepted).toBe(false);expect(room.getView(who)).toEqual(v);}else oldCleanupIntent=intent;}
      const receipt=room.submit(who,command);expect(receipt.accepted).toBe(true);
      if(action.type==='activate-lp-counter-trap'&&action.instanceId===f.top1)oldSeven={command,receipt};
      const v=room.getView(who);expect(room.submit(who,command)).toEqual(receipt);expect(room.getView(who)).toEqual(v);
    }
    const r=applyAction(registry,current,{actorId:who,expectedStateVersion:current.stateVersion,action});expect(current).toEqual(before);
    if(!r.accepted)throw new Error(r.message);state=r.state;events.push(...r.events);assertDuelInvariants(state,registry);
    if(room)for(const viewer of [f.actor,f.other]){const v=room.getView(viewer);expect(v.stateVersion).toBe(state.stateVersion);expect(v.players.map(p=>p.lifePoints)).toEqual(state.players.map(p=>p.lifePoints));
      expect(v.selfHand.map(c=>c.visibility==='known'?c.definition.id:'hidden')).toEqual(state.players.find(p=>p.id===viewer)!.hand.map(id=>state.cards[id]!.definition.id));
      for(const key of ['trapThreeSevenResolution','trapCounterResolution','lpCosts','sourceAtActivation','integritySha256'])expect(JSON.stringify(v)).not.toContain(key);
      if(state.pendingDecision?.playerId!==viewer)expect(v.decision).toBeNull();
    }
    return r;
  };
  const reject=(who:string,action:EngineAction)=>{const before=structuredClone(state),r=applyAction(registry,state,{actorId:who,expectedStateVersion:state.stateVersion,action});expect(r.accepted).toBe(false);expect(r.state).toBe(state);expect(state).toEqual(before);return r;};
  const settle=()=>{for(let n=0;state.timing.window!=='open'&&!state.result;n++){if(n>14||state.pendingDecision)throw new Error('Unexpected suspended state');act(state.timing.priorityPlayer!,{type:'pass'});}};
  const nextMain=()=>{const turn=state.turn.number;act(state.turn.activePlayer,{type:'request-phase',phase:'end'});settle();if(state.turn.number===turn){act(state.turn.activePlayer,{type:'request-phase',phase:'draw'});settle();}act(state.turn.activePlayer,{type:'request-phase',phase:'standby'});settle();act(state.turn.activePlayer,{type:'request-phase',phase:'main1'});settle();};
  const lp=(who:string)=>state.players.find(p=>p.id===who)!.lifePoints,timeline:number[][]=[],mark=()=>timeline.push([lp(f.doubleOwner),lp(f.singleOwner)]);mark();
  const chainLengths:number[]=[],rootLinks:string[]=[];let firstFrame:TrapThreeSevenJournal|null=null;
  const chain=(second:boolean)=>{
    const start=events.length;act(f.actor,{type:'normal-summon',instanceId:f.target,slot:0,tributeIds:[]});act(f.actor,{type:'pass'});act(f.other,{type:'activate-trap',instanceId:second?f.trap2:f.trap1,targetId:f.target});rootLinks.push(state.chain[0]!.id);
    const firstOwner=second?f.singleOwner:f.doubleOwner,middleOwner=second?f.doubleOwner:f.singleOwner;
    for(const[who,source]of[[firstOwner,second?f.first2:f.first1],[middleOwner,second?f.middle2:f.middle1],[firstOwner,second?f.top2:f.top1]]as const){
      if(state.timing.priorityPlayer!==who)act(state.timing.priorityPlayer!,{type:'pass'});
      if(second&&f.negateHeal&&source===f.top2){if(room)expect(room.getView(who,true).availableActions!.some(a=>a.type==='activate-lp-counter-trap')).toBe(false);expect(reject(who,{type:'activate-lp-counter-trap',instanceId:source,respondingToLinkId:state.chain.at(-1)!.id})).toMatchObject({code:'unpayable-cost'});expect(state.cards[source]!.position).toBe('face-down');break;}
      act(who,{type:'activate-lp-counter-trap',instanceId:source,respondingToLinkId:state.chain.at(-1)!.id});mark();
    }
    chainLengths.push(state.chain.length);retryOld();act(state.timing.priorityPlayer!,{type:'pass'});act(state.timing.priorityPlayer!,{type:'pass'});
    if(state.pendingDecision){const d=state.pendingDecision;expect(d.kind).toBe('cleanup-order');if(second){reject(d.playerId,{type:'answer-decision',decisionId:oldCleanup!.id,optionIds:[...oldCleanup!.options]});if(state.trapThreeSevenResolution&&firstFrame){const forged={...state,trapThreeSevenResolution:firstFrame};expect(()=>assertDuelInvariants(forged,registry)).toThrow();}}else{oldCleanup={id:d.id,options:[...d.optionIds]};firstFrame=structuredClone(state.trapThreeSevenResolution!);expect(firstFrame.lpCosts.payments).toHaveLength(3);}
      const reverse=second?!reverseFirst:reverseFirst,order=reverse?[...d.optionIds].reverse():[...d.optionIds];act(d.playerId,{type:'answer-decision',decisionId:d.id,optionIds:order});expect(state.players.find(p=>p.id===d.playerId)!.graveyard.slice(-2)).toEqual(order);
    }
    expect(state.cards[f.target]!.location.kind).toBe(second&&f.negateHeal?'graveyard':'monster');expect(state.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(1);expect(state.trapThreeSevenResolution).toBeNull();expect(state.trapCounterResolution).toBeNull();expect(state.chainCleanup).toBeNull();expect(state.pendingTriggers).toEqual([]);expect(state.chain).toEqual([]);
    const group=events.slice(start);expect(group.filter(e=>e.kind==='effect-destroyed')).toHaveLength(second&&f.negateHeal?1:0);expect(group.filter(e=>e.kind==='chain-resolved')).toHaveLength(1);expect(group.filter(e=>e.kind==='chain-link-negated-skipped').map(e=>e.affectedInstances)).toEqual(second&&f.negateHeal?[[f.first2]]:[[second?f.middle2:f.middle1],[second?f.trap2:f.trap1]]);settle();
  };
  chain(false);expect(lp(f.actor)).toBe(1);expect(lp(f.other)).toBe(1);
  act(f.actor,{type:'activate-spell',instanceId:f.removal,slot:0,discardId:f.removalCost,targetId:f.target});settle();expect(state.cards[f.target]!.location.kind).toBe('graveyard');
  act(f.actor,{type:'activate-spell',instanceId:f.recovery,slot:0,discardId:f.firstCost,targetId:f.target});const oldRecovery=structuredClone(state.chain[0]!);settle();expect(state.cards[f.target]!.location.kind).toBe('hand');expect(state.pendingTriggers).toEqual([]);expect(reject(f.actor,{type:'normal-summon',instanceId:f.target,slot:0,tributeIds:[]})).toMatchObject({code:'quota-used'});
  const heal=(who:string)=>{const sources=who===f.doubleOwner?[f.doubleHeal]:[f.singleHeal1,f.singleHeal2];for(const source of sources){const beforeLP=lp(who);act(who,{type:'activate-spell',instanceId:source,slot:who===f.actor?0:1});expect(lp(who)).toBe(beforeLP);if(source===f.singleHeal2&&f.negateHeal)act(f.doubleOwner,{type:'activate-counter-trap',instanceId:f.magic!,discardId:f.magicCost!,respondingToLinkId:state.chain[0]!.id});settle();mark();expect(lp(who)).toBe(beforeLP+(source===f.singleHeal2&&f.negateHeal?0:1000));retryOld();}};
  heal(f.actor);nextMain();expect(state.turn.activePlayer).toBe(f.other);act(f.other,{type:'set-trap',instanceId:f.trap2,slot:0});settle();expect(state.cards[f.trap2]!.markers.setOnTurn).toBe(4);heal(f.other);nextMain();expect(state.turn.number).toBe(5);expect(state.turn.activePlayer).toBe(f.actor);
  act(f.actor,{type:'flip-summon',instanceId:f.faith});const d=state.pendingDecision!;expect(d.optionIds).toContain(f.recovery);for(const id of [f.removalCost,f.firstCost,f.trap1,f.first1,f.middle1,f.top1])reject(f.actor,{type:'answer-decision',decisionId:d.id,optionIds:[id]});act(f.actor,{type:'answer-decision',decisionId:d.id,optionIds:[f.recovery]});settle();expect(state.cards[f.recovery]!.location.kind).toBe('hand');expect(state.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(0);
  const history=structuredClone(firstFrame!.lpCosts);assertThreeSevenLPCostHistory(history);expect(()=>assertCurrentThreeSevenLPCosts(registry,state,history)).toThrow();chain(true);expect(chainLengths).toEqual([4,f.negateHeal?3:4]);expect(rootLinks[0]).not.toBe(rootLinks[1]);assertThreeSevenLPCostHistory(history);expect(firstFrame!.lpCosts).toEqual(history);
  if(f.negateHeal){act(f.actor,{type:'activate-spell',instanceId:f.recovery,slot:0,discardId:f.secondCost,targetId:f.target});const link=state.chain[0]!;expect(link.id).not.toBe(oldRecovery.id);expect(link.source).toBe(oldRecovery.source);expect(oldRecovery.costEvents[0]!.affectedInstances).toEqual([f.firstCost]);expect(link.costEvents[0]!.affectedInstances).toEqual([f.secondCost]);settle();expect(state.cards[f.target]!.location.kind).toBe('hand');}else{reject(f.actor,{type:'activate-spell',instanceId:f.recovery,slot:0,discardId:f.secondCost,targetId:f.target});expect(state.cards[f.secondCost]!.location.kind).toBe('hand');}
  retryOld();act(f.actor,{type:'activate-spell',instanceId:f.burn,slot:0});expect(lp(f.other)).toBe(1);expect(state.result).toBeNull();settle();mark();retryOld();expect(state.result).toEqual({winner:f.actor,reason:'life-points'});expect(lp(f.actor)).toBe(1);expect(state.trapThreeSevenResolution).toBeNull();expect(state.chain).toEqual([]);
  expect(events.filter(e=>e.kind==='life-points-paid').map(e=>[e.details.playerId,e.details.beforeLP,e.details.afterLP])).toEqual([[f.doubleOwner,2001,1001],[f.singleOwner,1001,1],[f.doubleOwner,1001,1],[f.singleOwner,f.negateHeal?1001:2001,f.negateHeal?1:1001],[f.doubleOwner,1001,1],...(f.negateHeal?[]:[[f.singleOwner,1001,1]])]);
  expect(events.filter(e=>e.kind==='life-points-gained')).toHaveLength(f.negateHeal?2:3);expect(events.filter(e=>e.kind==='effect-damage')).toHaveLength(1);expect(events.filter(e=>e.kind==='flip-effect-activated').map(e=>e.affectedInstances[0])).toEqual([f.faith]);expect(events.filter(e=>e.kind==='cards-discarded').map(e=>e.affectedInstances[0])).toEqual([f.removalCost,f.firstCost,...(f.negateHeal?[f.magicCost!,f.secondCost]:[])]);
  for(const id of [f.removal,f.removalCost,f.firstCost,f.trap1,f.trap2,f.first1,f.middle1,f.top1,f.first2,f.middle2,f.burn,f.doubleHeal,f.singleHeal1,f.singleHeal2,...(f.negateHeal?[f.magic!,f.magicCost!,f.secondCost,f.recovery]:[f.top2])])expect(state.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
  for(const p of state.players){expect(p.graveyard[0]).toBe(f.state.players.find(q=>q.id===p.id)!.graveyard[0]);expect(new Set(p.graveyard).size).toBe(p.graveyard.length);}
  const first=[[2001,1001],[1001,1001],[1001,1],[1,1]],heals=f.selfDouble?[[1001,1],[1001,1001],[1001,f.negateHeal?1001:2001]]:[[1,1001],[1,f.negateHeal?1001:2001],[1001,f.negateHeal?1001:2001]],second=f.negateHeal?[[1001,1],[1,1]]:[[1001,1001],[1,1001],[1,1]];expect(timeline).toEqual([...first,...heals,...second,f.selfDouble?[1,0]:[0,1]]);
  return{state,events,timeline,chainLengths};
}
describe('Trap Hole four-link audit across recovery, changed payers and new turns',()=>{
 it.each(['a','b'].flatMap(actor=>[false,true].flatMap(selfDouble=>(['main1','main2']as const).flatMap(phase=>[false,true].flatMap(reverse=>[false,true].map(negateHeal=>({actor,selfDouble,phase,reverse,negateHeal})))))))('$actor doubleSelf=$selfDouble $phase reverse=$reverse negatedHeal=$negateHeal',o=>{run(setupTrapFourInteractions(registry,o.actor,o.selfDouble,o.negateHeal,o.phase),o.reverse);});
 it.each(['a','b'].flatMap(actor=>[false,true].flatMap(selfDouble=>[false,true].map(negateHeal=>({actor,selfDouble,negateHeal})))))('adapter $actor doubleSelf=$selfDouble negatedHeal=$negateHeal',o=>{run(setupTrapFourInteractions(registry,o.actor,o.selfDouble,o.negateHeal),true,true);});
});
