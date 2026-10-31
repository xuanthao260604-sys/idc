import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupSevenResponseInteractions } from './fixtures/seven-response-interactions.js';
import { applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { DuelAction, DuelCommand, CommandOutcome } from '../packages/protocol/src/commands.js';
const {registry}=loadRuntimeCatalog();
type Fixture=ReturnType<typeof setupSevenResponseInteractions>;

function run(f:Fixture,reverseFirst:boolean,withAdapter=false){
  let state:DuelState=f.state,serial=0;
  const room=withAdapter?createCommandAdapter(registry,state):null;
  const events:{kind:string;affectedInstances:readonly string[];details:Readonly<Record<string,string|number|boolean>>}[]=[];
  let oldSummon:DuelAction|null=null,oldSeven:{command:DuelCommand;receipt:CommandOutcome}|null=null;
  let oldCleanup:{id:string;options:readonly string[]}|null=null;
  const handle=(id:string,who:string)=>{
    const c=state.cards[id]!,p=state.players.find(p=>p.id===c.location.playerId)!,v=room!.getView(who),b=v.players.find(p=>p.playerId===c.location.playerId)!;
    switch(c.location.kind){case 'hand':return v.selfHand[p.hand.indexOf(id)]!.handle;case 'graveyard':return b.graveyard[p.graveyard.indexOf(id)]!.handle;
      case 'monster':return b.monsters[c.location.slot]!.handle;case 'spell-trap':return b.spellsTraps[c.location.slot]!.handle;default:throw new Error('Unsupported handle');}
  };
  const translate=(who:string,a:EngineAction):DuelAction=>{
    const v=room!.getView(who);
    switch(a.type){
      case 'normal-summon':return{type:a.type,cardHandle:handle(a.instanceId,who),slot:a.slot as Slot,tributeHandles:a.tributeIds.map(id=>handle(id,who))};
      case 'flip-summon':return{type:a.type,cardHandle:handle(a.instanceId,who)};
      case 'activate-spell':return{type:a.type,cardHandle:handle(a.instanceId,who),slot:a.slot as Slot,...(a.discardId?{discardHandle:handle(a.discardId,who)}:{}),...(a.targetId?{targetHandle:handle(a.targetId,who)}:{})};
      case 'activate-trap':return{type:a.type,cardHandle:handle(a.instanceId,who),targetHandle:handle(a.targetId,who)};
      case 'activate-lp-counter-trap':return{type:a.type,cardHandle:handle(a.instanceId,who),chainHandle:v.chain[state.chain.findIndex(l=>l.id===a.respondingToLinkId)]!.chainHandle};
      case 'activate-counter-trap':return{type:a.type,cardHandle:handle(a.instanceId,who),discardHandle:handle(a.discardId,who),chainHandle:v.chain[0]!.chainHandle};
      case 'answer-decision':return{type:a.type,decisionId:v.decision!.id,optionIds:a.optionIds.map(id=>v.decision!.optionIds[state.pendingDecision!.optionIds.indexOf(id)]!)};
      case 'pass':case 'request-phase':return a;default:throw new Error('Unexpected scenario action');
    }
  };
  const retryOld=()=>{if(room&&oldSeven){const v=room.getView(f.other);expect(room.submit(f.other,oldSeven.command)).toEqual(oldSeven.receipt);expect(room.getView(f.other)).toEqual(v);expect(room.submit(f.other,{...oldSeven.command,commandId:'old-counter-intent-'+ ++serial,expectedStateVersion:state.stateVersion}).accepted).toBe(false);expect(room.getView(f.other)).toEqual(v);}};
  const act=(who:string,action:EngineAction)=>{
    const before=structuredClone(state),current=state;
    if(room){
      const intent=translate(who,action),command={commandId:'seven-response-audit-'+ ++serial,duelId:state.id,expectedStateVersion:state.stateVersion,action:intent};
      if(action.type==='normal-summon'){
        if(!oldSummon)oldSummon=intent;
        else{const v=room.getView(who);expect(room.submit(who,{...command,commandId:'old-summon-'+ ++serial,action:oldSummon}).accepted).toBe(false);expect(room.getView(who)).toEqual(v);}
      }
      const receipt=room.submit(who,command);expect(receipt.accepted).toBe(true);
      if(action.type==='activate-lp-counter-trap'&&action.instanceId===f.seven2)oldSeven={command,receipt};
      const v=room.getView(who);expect(room.submit(who,command)).toEqual(receipt);expect(room.getView(who)).toEqual(v);
    }
    const r=applyAction(registry,current,{actorId:who,expectedStateVersion:current.stateVersion,action});expect(current).toEqual(before);
    if(!r.accepted)throw new Error(r.message);state=r.state;events.push(...r.events);assertDuelInvariants(state,registry);
    if(room)for(const viewer of [f.actor,f.other]){const v=room.getView(viewer,true);expect(v.stateVersion).toBe(state.stateVersion);expect(v.players.map(p=>p.lifePoints)).toEqual(state.players.map(p=>p.lifePoints));
      expect(v.selfHand.map(c=>c.visibility==='known'?c.definition.id:'hidden')).toEqual(state.players.find(p=>p.id===viewer)!.hand.map(id=>state.cards[id]!.definition.id));
      for(const key of ['trapCounterResolution','lpCosts','sourceAtActivation','integritySha256'])expect(JSON.stringify(v)).not.toContain(key);
      if(state.pendingDecision?.playerId!==viewer)expect(v.decision).toBeNull();
    }
    return r;
  };
  const reject=(who:string,action:EngineAction)=>{const before=structuredClone(state),r=applyAction(registry,state,{actorId:who,expectedStateVersion:state.stateVersion,action});expect(r.accepted).toBe(false);expect(r.state).toBe(state);expect(state).toEqual(before);return r;};
  const settle=()=>{for(let n=0;state.timing.window!=='open'&&!state.result;n++){if(n>14||state.pendingDecision)throw new Error('Unexpected suspended state');act(state.timing.priorityPlayer!,{type:'pass'});}};
  const nextMain=()=>{const turn=state.turn.number;act(state.turn.activePlayer,{type:'request-phase',phase:'end'});settle();if(state.turn.number===turn){act(state.turn.activePlayer,{type:'request-phase',phase:'draw'});settle();}act(state.turn.activePlayer,{type:'request-phase',phase:'standby'});settle();act(state.turn.activePlayer,{type:'request-phase',phase:'main1'});settle();};
  const lp=(who:string)=>state.players.find(p=>p.id===who)!.lifePoints;
  const timeline=[[lp(f.actor),lp(f.other)]];
  const mark=()=>timeline.push([lp(f.actor),lp(f.other)]);
  const summon=()=>act(f.actor,{type:'normal-summon',instanceId:f.target,slot:0,tributeIds:[]});
  const chain=(second:boolean)=>{
    const offset=events.length;summon();act(f.actor,{type:'pass'});act(f.other,{type:'activate-trap',instanceId:second?f.trap2:f.trap1,targetId:f.target});
    const first=second?f.seven3:f.seven1,top=second?f.seven4:f.seven2,firstOwner=second?f.actor:f.other;
    if(state.timing.priorityPlayer!==firstOwner)act(state.timing.priorityPlayer!,{type:'pass'});
    act(firstOwner,{type:'activate-lp-counter-trap',instanceId:first,respondingToLinkId:state.chain[0]!.id});mark();
    if(state.timing.priorityPlayer!==f.other)act(state.timing.priorityPlayer!,{type:'pass'});
    if(second&&f.negateHeal){retryOld();expect(reject(f.other,{type:'activate-lp-counter-trap',instanceId:top,respondingToLinkId:state.chain[1]!.id})).toMatchObject({code:'unpayable-cost'});}
    else{act(f.other,{type:'activate-lp-counter-trap',instanceId:top,respondingToLinkId:state.chain[1]!.id});mark();expect(state.chain).toHaveLength(3);retryOld();}
    act(state.timing.priorityPlayer!,{type:'pass'});act(state.timing.priorityPlayer!,{type:'pass'});
    if(!(second&&f.negateHeal)){
      const d=state.pendingDecision!;expect(d.kind).toBe('cleanup-order');expect(state.cards[f.target]!.location.kind).toBe('graveyard');
      if(second){expect(reject(d.playerId,{type:'answer-decision',decisionId:oldCleanup!.id,optionIds:[...oldCleanup!.options]}).accepted).toBe(false);}
      else oldCleanup={id:d.id,options:[...d.optionIds]};
      const reverse=second?!reverseFirst:reverseFirst;act(d.playerId,{type:'answer-decision',decisionId:d.id,optionIds:reverse?[...d.optionIds].reverse():[...d.optionIds]});
      expect(state.players.find(p=>p.id===f.other)!.graveyard.slice(-2)).toEqual(reverse?[top,second?f.trap2:f.trap1]:[second?f.trap2:f.trap1,top]);
    }else{expect(state.cards[f.target]!.location.kind).toBe('monster');expect(state.cards[top]!.position).toBe('face-down');}
    expect(state.trapCounterResolution).toBeNull();expect(state.chainCleanup).toBeNull();expect(state.chain).toEqual([]);expect(state.pendingTriggers).toEqual([]);
    const group=events.slice(offset);expect(group.filter(e=>e.kind==='effect-destroyed')).toHaveLength(second&&f.negateHeal?0:1);expect(group.filter(e=>e.kind==='chain-resolved')).toHaveLength(1);
    expect(group.filter(e=>e.kind==='chain-link-negated-skipped').map(e=>e.affectedInstances)).toEqual([[second&&f.negateHeal?f.trap2:first]]);
    expect(state.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(1);settle();
  };
  const recover=(second:boolean)=>{const r=act(f.actor,{type:'activate-spell',instanceId:f.recovery,slot:0,discardId:second?f.secondCost:f.firstCost,targetId:f.target});
    const link=state.chain[0]!;expect(state.cards[f.target]!.location.kind).toBe('graveyard');expect(state.pendingTriggers).toEqual([]);settle();expect(state.cards[f.target]!.location).toEqual({kind:'hand',playerId:f.actor});return{r,link};};
  chain(false);expect(lp(f.other)).toBe(1);expect(state.result).toBeNull();
  const firstRecovery=recover(false);expect(reject(f.actor,{type:'normal-summon',instanceId:f.target,slot:0,tributeIds:[]})).toMatchObject({code:'quota-used'});
  nextMain();expect(state.turn.activePlayer).toBe(f.other);
  act(f.other,{type:'activate-spell',instanceId:f.heal,slot:0});expect(lp(f.other)).toBe(1);
  if(f.negateHeal)act(f.actor,{type:'activate-counter-trap',instanceId:f.magic!,discardId:f.magicCost!,respondingToLinkId:state.chain[0]!.id});
  settle();expect(lp(f.other)).toBe(f.negateHeal?1:1001);mark();retryOld();
  nextMain();expect(state.turn.number).toBe(5);expect(state.turn.activePlayer).toBe(f.actor);
  act(f.actor,{type:'flip-summon',instanceId:f.faith});const d=state.pendingDecision!;expect(d.optionIds).toEqual([f.recovery]);
  for(const id of [f.firstCost,f.trap1,f.seven1,f.seven2,f.heal])reject(f.actor,{type:'answer-decision',decisionId:d.id,optionIds:[id]});
  act(f.actor,{type:'answer-decision',decisionId:d.id,optionIds:[f.recovery]});settle();expect(state.cards[f.recovery]!.location.kind).toBe('hand');expect(state.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(0);
  chain(true);
  if(f.negateHeal){reject(f.actor,{type:'activate-spell',instanceId:f.recovery,slot:0,discardId:f.secondCost,targetId:f.target});expect(state.cards[f.secondCost]!.location.kind).toBe('hand');}
  else{const secondRecovery=recover(true);expect(secondRecovery.link.id).not.toBe(firstRecovery.link.id);expect(secondRecovery.link.source).toBe(firstRecovery.link.source);
    expect(firstRecovery.link.costEvents[0]!.affectedInstances).toEqual([f.firstCost]);expect(secondRecovery.link.costEvents[0]!.affectedInstances).toEqual([f.secondCost]);}
  retryOld();act(f.actor,{type:'activate-spell',instanceId:f.burn,slot:0});expect(lp(f.other)).toBe(1);expect(state.result).toBeNull();settle();mark();retryOld();
  expect(state.result).toEqual({winner:f.actor,reason:'life-points'});expect(lp(f.actor)).toBe(7000);expect(state.chain).toEqual([]);expect(state.trapCounterResolution).toBeNull();
  expect(events.filter(e=>e.kind==='life-points-paid')).toHaveLength(f.negateHeal?3:4);
  expect(events.filter(e=>e.kind==='life-points-gained')).toHaveLength(f.negateHeal?0:1);
  expect(events.filter(e=>e.kind==='effect-damage')).toHaveLength(1);
  expect(events.filter(e=>e.kind==='returned-to-hand').map(e=>e.affectedInstances[0])).toEqual(f.negateHeal?[f.target,f.recovery]:[f.target,f.recovery,f.target]);
  expect(events.filter(e=>e.kind==='flip-effect-activated').map(e=>e.affectedInstances[0])).toEqual([f.faith]);
  expect(events.filter(e=>e.kind==='life-points-paid').map(e=>[e.details.playerId,e.details.beforeLP,e.details.afterLP])).toEqual([[f.other,2001,1001],[f.other,1001,1],[f.actor,8000,7000],...(f.negateHeal?[]:[[f.other,1001,1]])]);
  for(const id of [f.trap1,f.trap2,f.seven1,f.seven2,f.seven3,f.heal,f.firstCost,f.burn,...(f.negateHeal?[f.magic!,f.magicCost!]:[f.seven4,f.secondCost,f.recovery])])expect(state.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
  expect(state.cards[f.firstCost]!.location.kind).toBe('graveyard');expect(state.cards[f.target]!.location.kind).toBe(f.negateHeal?'monster':'hand');
  for(const p of state.players)expect(new Set(p.graveyard).size).toBe(p.graveyard.length);
  expect(timeline).toEqual(f.negateHeal?[[8000,2001],[8000,1001],[8000,1],[8000,1],[7000,1],[7000,0]]:[[8000,2001],[8000,1001],[8000,1],[8000,1001],[7000,1001],[7000,1],[7000,0]]);
  return{state,events,timeline};
}
describe('Seven versus Seven across recovery, new turns and distinct payers',()=>{
  it.each(['a','b'].flatMap(actor=>(['main1','main2']as const).flatMap(phase=>[false,true].flatMap(reverse=>[false,true].map(negateHeal=>({actor,phase,reverse,negateHeal}))))))(
    '$actor $phase reverse=$reverse negatedHeal=$negateHeal',o=>{run(setupSevenResponseInteractions(registry,o.actor,o.negateHeal,o.phase),o.reverse);});
  it.each(['a','b'].flatMap(actor=>[false,true].map(negateHeal=>({actor,negateHeal}))))('adapter $actor negatedHeal=$negateHeal',o=>{run(setupSevenResponseInteractions(registry,o.actor,o.negateHeal),true,true);});
});
