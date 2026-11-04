import {describe,expect,it} from 'vitest';
import {loadRuntimeCatalog} from './runtime-catalog.js';
import {setupFourLinkInteractions} from './fixtures/four-link-interactions.js';
import {applyAction,assertDuelInvariants} from '../packages/engine/src/duel.js';
import {createCommandAdapter} from '../packages/engine/src/command-adapter.js';
import type {EngineAction} from '../packages/engine/src/actions.js';
import type {DuelState,Slot} from '../packages/protocol/src/duel.js';
import type {DuelAction,DuelCommand,CommandOutcome} from '../packages/protocol/src/commands.js';
const{registry}=loadRuntimeCatalog();
type Fixture=ReturnType<typeof setupFourLinkInteractions>;
function run(f:Fixture,reverseFirst:boolean,withAdapter=false){
  let state:DuelState=f.state,serial=0,oldRoot:DuelAction|null=null,oldCleanup:DuelAction|null=null;
  let oldTop:{command:DuelCommand;receipt:CommandOutcome}|null=null;
  const room=withAdapter?createCommandAdapter(registry,state):null;
  const events:{kind:string;affectedInstances:readonly string[];details:Readonly<Record<string,string|number|boolean>>}[]=[];
  const handle=(id:string,who:string)=>{const c=state.cards[id]!,p=state.players.find(p=>p.id===c.location.playerId)!,v=room!.getView(who),b=v.players.find(p=>p.playerId===c.location.playerId)!;
    switch(c.location.kind){case 'hand':return v.selfHand[p.hand.indexOf(id)]!.handle;case 'graveyard':return b.graveyard[p.graveyard.indexOf(id)]!.handle;case 'monster':return b.monsters[c.location.slot]!.handle;case 'spell-trap':return b.spellsTraps[c.location.slot]!.handle;default:throw new Error('Unsupported audit handle');}};
  const translate=(who:string,a:EngineAction):DuelAction=>{const v=room!.getView(who);switch(a.type){
    case 'activate-spell':return{type:a.type,cardHandle:handle(a.instanceId,who),slot:a.slot as Slot,...(a.discardId?{discardHandle:handle(a.discardId,who)}:{}),...(a.targetId?{targetHandle:handle(a.targetId,who)}:{})};
    case 'set-spell':case 'set-trap':return{type:'set-spell-trap',cardHandle:handle(a.instanceId,who),slot:a.slot as Slot,zone:'spell-trap'};
    case 'set-monster':return{type:a.type,cardHandle:handle(a.instanceId,who),slot:a.slot as Slot,tributeHandles:a.tributeIds.map(id=>handle(id,who))};
    case 'flip-summon':return{type:a.type,cardHandle:handle(a.instanceId,who)};
    case 'activate-counter-trap':return{type:a.type,cardHandle:handle(a.instanceId,who),discardHandle:handle(a.discardId,who),chainHandle:v.chain[state.chain.findIndex(l=>l.id===a.respondingToLinkId)]!.chainHandle};
    case 'activate-lp-counter-trap':return{type:a.type,cardHandle:handle(a.instanceId,who),chainHandle:v.chain[state.chain.findIndex(l=>l.id===a.respondingToLinkId)]!.chainHandle};
    case 'answer-decision':return{type:a.type,decisionId:v.decision!.id,optionIds:a.optionIds.map(id=>v.decision!.optionIds[state.pendingDecision!.optionIds.indexOf(id)]!)};
    case 'pass':case 'request-phase':return a;default:throw new Error('Unexpected audit action');}};
  const retryTop=()=>{if(room&&oldTop){const v=room.getView(f.topOwner);expect(room.submit(f.topOwner,oldTop.command)).toEqual(oldTop.receipt);expect(room.getView(f.topOwner)).toEqual(v);expect(room.submit(f.topOwner,{...oldTop.command,commandId:'old-top-'+ ++serial,expectedStateVersion:state.stateVersion}).accepted).toBe(false);expect(room.getView(f.topOwner)).toEqual(v);}};
  const act=(who:string,action:EngineAction)=>{
    const before=structuredClone(state),current=state;
    if(room){const intent=translate(who,action),command={commandId:'four-audit-'+ ++serial,duelId:state.id,expectedStateVersion:state.stateVersion,action:intent};
      if(action.type==='activate-spell'&&action.instanceId===f.root){if(oldRoot){if(intent.type==='activate-spell'&&oldRoot.type==='activate-spell')expect(intent.cardHandle).not.toBe(oldRoot.cardHandle);const v=room.getView(who);expect(room.submit(who,{...command,commandId:'old-root-'+ ++serial,action:oldRoot}).accepted).toBe(false);expect(room.getView(who)).toEqual(v);}else oldRoot=intent;}
      if(action.type==='answer-decision'&&state.pendingDecision?.kind==='cleanup-order'){if(oldCleanup){const v=room.getView(who);expect(room.submit(who,{...command,commandId:'old-cleanup-'+ ++serial,action:oldCleanup}).accepted).toBe(false);expect(room.getView(who)).toEqual(v);}else oldCleanup=intent;}
      const receipt=room.submit(who,command);expect(receipt.accepted).toBe(true);if(action.type==='activate-lp-counter-trap'&&action.instanceId===f.top1)oldTop={command,receipt};
      const v=room.getView(who);expect(room.submit(who,command)).toEqual(receipt);expect(room.getView(who)).toEqual(v);
    }
    const r=applyAction(registry,current,{actorId:who,expectedStateVersion:current.stateVersion,action});expect(current).toEqual(before);if(!r.accepted)throw new Error(r.message);state=r.state;events.push(...r.events);assertDuelInvariants(state,registry);
    if(room)for(const who of [f.actor,f.other]){const v=room.getView(who,true);expect(v.stateVersion).toBe(state.stateVersion);expect(v.players.map(p=>p.lifePoints)).toEqual(state.players.map(p=>p.lifePoints));expect(v.selfHand.map(c=>c.visibility==='known'?c.definition.id:'hidden')).toEqual(state.players.find(p=>p.id===who)!.hand.map(id=>state.cards[id]!.definition.id));
      for(const key of ['fourLinkCounterResolution','counterResolution','lpCosts','sourceAtActivation','integritySha256'])expect(JSON.stringify(v)).not.toContain(key);if(state.pendingDecision?.playerId!==who)expect(v.decision).toBeNull();}
    return r;
  };
  const reject=(who:string,a:EngineAction)=>{const before=structuredClone(state),r=applyAction(registry,state,{actorId:who,expectedStateVersion:state.stateVersion,action:a});expect(r.accepted).toBe(false);expect(r.state).toBe(state);expect(state).toEqual(before);return r;};
  const settle=()=>{for(let n=0;state.timing.window!=='open'&&!state.result;n++){if(n>14||state.pendingDecision)throw new Error('Unexpected audit pause');act(state.timing.priorityPlayer!,{type:'pass'});}};
  const nextMain=()=>{const prior=state.turn.number;act(state.turn.activePlayer,{type:'request-phase',phase:'end'});settle();if(state.turn.number===prior){act(state.turn.activePlayer,{type:'request-phase',phase:'draw'});settle();}act(state.turn.activePlayer,{type:'request-phase',phase:'standby'});settle();act(state.turn.activePlayer,{type:'request-phase',phase:'main1'});settle();};
  const lp=(who:string)=>state.players.find(p=>p.id===who)!.lifePoints;
  const timeline=[[lp(f.actor),lp(f.other)]],mark=()=>timeline.push([lp(f.actor),lp(f.other)]);
  const chainLengths:number[]=[],rootLinks:string[]=[];
  const chain=(second:boolean)=>{
    const start=events.length,magic=second?f.magic2:f.magic1,first=second?f.first2:f.first1,top=second?f.top2:f.top1;
    act(f.actor,{type:'activate-spell',instanceId:f.root,slot:0,discardId:second?f.secondCost:f.firstCost,targetId:f.firstCost});rootLinks.push(state.chain[0]!.id);
    if(state.timing.priorityPlayer!==f.magicOwner)act(state.timing.priorityPlayer!,{type:'pass'});
    act(f.magicOwner,{type:'activate-counter-trap',instanceId:magic,discardId:second?f.magicCost2:f.magicCost1,respondingToLinkId:state.chain[0]!.id});
    let length=2;
    for(const[owner,source]of[[f.firstOwner,first],[f.topOwner,top]]as const){
      if(state.timing.priorityPlayer!==owner)act(state.timing.priorityPlayer!,{type:'pass'});
      if(second&&f.negateHeal&&owner===f.other){expect(reject(owner,{type:'activate-lp-counter-trap',instanceId:source,respondingToLinkId:state.chain.at(-1)!.id})).toMatchObject({code:'unpayable-cost'});expect(state.cards[source]!.position).toBe('face-down');break;}
      act(owner,{type:'activate-lp-counter-trap',instanceId:source,respondingToLinkId:state.chain.at(-1)!.id});mark();length++;
    }
    chainLengths.push(length);if(second)retryTop();
    for(let n=0;state.timing.window==='chain-response';n++){if(n>2)throw new Error('Response did not resolve');act(state.timing.priorityPlayer!,{type:'pass'});}
    if(state.pendingDecision){const d=state.pendingDecision;expect(d.kind).toBe('cleanup-order');const reverse=second?!reverseFirst:reverseFirst;act(d.playerId,{type:'answer-decision',decisionId:d.id,optionIds:reverse?[...d.optionIds].reverse():[...d.optionIds]});}
    const group=events.slice(start);expect(group.filter(e=>e.kind==='chain-resolved')).toHaveLength(1);expect(state.fourLinkCounterResolution).toBeNull();expect(state.counterResolution).toBeNull();expect(state.chainCleanup).toBeNull();expect(state.chain).toEqual([]);expect(state.pendingTriggers).toEqual([]);
    const resumed=second&&f.negateHeal&&f.firstOwner===f.actor;expect(state.cards[f.firstCost]!.location.kind).toBe(resumed?'hand':'graveyard');
    expect(group.filter(e=>e.kind==='returned-to-hand')).toHaveLength(resumed?1:0);expect(group.some(e=>['life-points-gained','effect-damage','flip-effect-activated'].includes(e.kind))).toBe(false);settle();
  };
  chain(false);expect(lp(f.actor)).toBe(1);expect(lp(f.other)).toBe(1);expect(state.result).toBeNull();
  act(f.actor,{type:'activate-spell',instanceId:f.ownHeal,slot:0});expect(lp(f.actor)).toBe(1);settle();mark();expect(lp(f.actor)).toBe(1001);retryTop();
  if(f.negateHeal){act(f.actor,{type:'set-trap',instanceId:f.healMagic!,slot:0});settle();expect(state.cards[f.healMagic!]!.markers.setOnTurn).toBe(3);}
  act(f.actor,{type:'set-monster',instanceId:f.faith,slot:0,tributeIds:[]});settle();expect(state.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(1);reject(f.actor,{type:'flip-summon',instanceId:f.faith});
  nextMain();expect(state.turn.activePlayer).toBe(f.other);act(f.other,{type:'activate-spell',instanceId:f.otherHeal,slot:0});expect(lp(f.other)).toBe(1);
  if(f.negateHeal)act(f.actor,{type:'activate-counter-trap',instanceId:f.healMagic!,discardId:f.healCost!,respondingToLinkId:state.chain[0]!.id});settle();mark();expect(lp(f.other)).toBe(f.negateHeal?1:1001);retryTop();
  nextMain();expect(state.turn.number).toBe(5);expect(state.turn.activePlayer).toBe(f.actor);act(f.actor,{type:'flip-summon',instanceId:f.faith});const d=state.pendingDecision!;
  expect([...d.optionIds].sort()).toEqual([f.root,f.ownHeal].sort());for(const id of [f.firstCost,f.magic1,f.first1,f.top1,f.otherHeal])reject(f.actor,{type:'answer-decision',decisionId:d.id,optionIds:[id]});
  act(f.actor,{type:'answer-decision',decisionId:d.id,optionIds:[f.root]});expect(state.cards[f.root]!.location.kind).toBe('graveyard');settle();expect(state.cards[f.root]!.location).toEqual({kind:'hand',playerId:f.actor});expect(state.players.find(p=>p.id===f.actor)!.normalSummonsOrSetsUsed).toBe(0);
  chain(true);expect(rootLinks[0]).not.toBe(rootLinks[1]);const secondLength=f.negateHeal?(f.firstOwner===f.actor?3:2):4;expect(chainLengths).toEqual([4,secondLength]);retryTop();
  if(f.negateHeal&&f.firstOwner===f.actor)expect(events.filter(e=>e.kind==='returned-to-hand'&&e.affectedInstances.includes(f.firstCost))).toHaveLength(1);
  expect(state.cards[f.secondCost]!.location.kind).toBe('graveyard');act(f.actor,{type:'activate-spell',instanceId:f.burn,slot:0});expect(state.result).toBeNull();expect(lp(f.other)).toBe(1);settle();mark();retryTop();
  expect(state.result).toEqual({winner:f.actor,reason:'life-points'});expect(state.fourLinkCounterResolution).toBeNull();expect(state.pendingDecision).toBeNull();expect(state.chain).toEqual([]);
  const payments=f.negateHeal?(f.firstOwner===f.actor?3:2):4;expect(events.filter(e=>e.kind==='life-points-paid')).toHaveLength(payments);expect(events.filter(e=>e.kind==='effect-damage')).toHaveLength(1);
  expect(events.filter(e=>e.kind==='life-points-gained')).toHaveLength(f.negateHeal?1:2);expect(events.filter(e=>e.kind==='cards-discarded').map(e=>e.affectedInstances[0])).toEqual([f.firstCost,f.magicCost1,...(f.negateHeal?[f.healCost!]:[]),f.secondCost,f.magicCost2]);
  expect(events.filter(e=>e.kind==='flip-effect-activated').map(e=>e.affectedInstances[0])).toEqual([f.faith]);
  for(const id of [f.magic1,f.magic2,f.magicCost1,f.magicCost2,f.secondCost,f.ownHeal,f.otherHeal,f.burn,f.root,...(f.negateHeal?[f.healMagic!,f.healCost!]:[])])expect(state.players.flatMap(p=>p.graveyard).filter(x=>x===id)).toHaveLength(1);
  expect(state.players.find(p=>p.id===f.actor)!.graveyard[0]).toBe(f.state.players.find(p=>p.id===f.actor)!.graveyard[0]);for(const p of state.players)expect(new Set(p.graveyard).size).toBe(p.graveyard.length);
  const firstTimeline=f.firstOwner===f.actor?[[1001,1001],[1,1001],[1,1]]:[[1001,1001],[1001,1],[1,1]];
  const ending=f.negateHeal?(f.firstOwner===f.actor?[[1001,1],[1,1],[1,0]]:[[1001,1],[1001,0]]):(f.firstOwner===f.actor?[[1001,1001],[1,1001],[1,1],[1,0]]:[[1001,1001],[1001,1],[1,1],[1,0]]);
  expect(timeline).toEqual([...firstTimeline,[1001,1],...ending]);
  return{state,events,timeline,chainLengths};
}
describe('four-link sequential interactions, recovery and insufficient later costs',()=>{
  it.each(['a','b'].flatMap(actor=>[false,true].flatMap(selfMagic=>[false,true].flatMap(selfFirst=>[false,true].flatMap(negateHeal=>[false,true].map(reverse=>({actor,selfMagic,selfFirst,negateHeal,reverse})))))))(
    '$actor MagicSelf=$selfMagic firstSelf=$selfFirst negatedHeal=$negateHeal reverse=$reverse',o=>{run(setupFourLinkInteractions(registry,o.actor,o.selfMagic,o.selfFirst,o.negateHeal),o.reverse);});
  it.each(['a','b'].flatMap(actor=>[false,true].map(negateHeal=>({actor,negateHeal}))))('adapter $actor negatedHeal=$negateHeal',o=>{run(setupFourLinkInteractions(registry,o.actor,o.actor==='b',true,o.negateHeal),true,true);});
});
