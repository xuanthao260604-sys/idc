import { createDuel, applyAction, assertDuelInvariants } from '../../packages/engine/src/duel.js';
import type { Registry } from '../../packages/engine/src/registry.js';
import type { DuelState, Slot } from '../../packages/protocol/src/duel.js';
import type { EngineAction } from '../../packages/engine/src/actions.js';
import { THREE_SEVEN_CANDIDATE_EFFECT_ID } from '../../packages/engine/src/trap-three-seven-candidate.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
export function setupTrapThreeSevenBoard(registry:Registry,actor='a',owners:readonly boolean[]=[true,false,true],method='normal',phase:'main1'|'main2'='main1',largeLP=false,initialLP?:number){
  const other=actor==='a'?'b':'a',firstOwner=owners[0]?actor:other,secondOwner=owners[1]?actor:other,topOwner=owners[2]?actor:other;
  const deck=[...Object.keys(registry.cards),'official:03819470','official:03819470'];
  const state=structuredClone(createDuel(registry,{duelId:'seven-response',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:actor,seedHex:'d4'.repeat(32)}).state) as Mutable<DuelState>;
  for(const p of state.players)for(const id of p.hand.splice(0)){p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};}
  state.turn={number:3,activePlayer:actor,phase};state.timing={...state.timing,window:'open',priorityPlayer:actor,consecutivePasses:0};
  const move=(name:string,who:string,zone:'hand'|'monster'|'spell-trap'|'graveyard',slot:Slot=0)=>{
    const p=state.players.find(p=>p.id===who)!,def=Object.values(registry.cards).find(c=>c.name===name)!,id=p.deck.find(id=>state.cards[id]!.definition.id===def.id)!;
    if(!id)throw new Error('Missing fixture '+name);p.deck.splice(p.deck.indexOf(id),1);const c=state.cards[id]!;
    if(zone==='monster'||zone==='spell-trap'){(zone==='monster'?p.monsters:p.spellsTraps)[slot]=id;c.location={kind:zone,playerId:who,slot};c.position=zone==='monster'?'face-up-attack':'face-down';c.markers.setOnTurn=who===actor?1:2;}
    else{p[zone].push(id);c.location={kind:zone,playerId:who};c.position=zone==='hand'?'face-down':'face-up';}return id;
  };
  for(const p of state.players)move('Celtic Guardian',p.id,'graveyard');
  const target=move(method==='tribute'?'Gaia The Fierce Knight':'Battle Ox',actor,method==='flip'?'monster':'hand');
  if(method==='flip')state.cards[target]!.position='face-down-defense';
  const tributes=method==='tribute'?[move('Skull Servant',actor,'monster',1),move('Mystical Elf',actor,'monster',2)]:[];
  const trap=move('Trap Hole',other,'spell-trap'),first=move('Seven Tools of the Bandit',firstOwner,'spell-trap',1),second=move('Seven Tools of the Bandit',secondOwner,'spell-trap',2),top=move('Seven Tools of the Bandit',topOwner,'spell-trap',4);
  for(const p of state.players){const n=[firstOwner,secondOwner,topOwner].filter(w=>w===p.id).length;if(n)p.lifePoints=initialLP??(largeLP?8000:n*1000+1);}
  assertDuelInvariants(state,registry);return{state,actor,other,firstOwner,secondOwner,topOwner,method,phase,target,tributes,trap,first,second,top};
}
export function setupTrapThreeSevenPrefix(...args:Parameters<typeof setupTrapThreeSevenBoard>){
  const [registry]=args,f=setupTrapThreeSevenBoard(...args);const{state,actor,other,firstOwner,secondOwner,topOwner,method,target,tributes,trap,first,second,top}=f;let accepted:DuelState=state;

  const act=(who:string,action:EngineAction)=>{const r=applyAction(registry,accepted,{actorId:who,expectedStateVersion:accepted.stateVersion,action});if(!r.accepted)throw new Error(r.message);assertDuelInvariants(r.state,registry);accepted=r.state;};
  if(method==='flip')act(actor,{type:'flip-summon',instanceId:target});else act(actor,{type:'normal-summon',instanceId:target,slot:0,tributeIds:tributes});
  act(actor,{type:'pass'});act(other,{type:'activate-trap',instanceId:trap,targetId:target});
  for(const [who,source] of [[firstOwner,first],[secondOwner,second]]as const){if(accepted.timing.priorityPlayer!==who)act(accepted.timing.priorityPlayer!,{type:'pass'});act(who,{type:'activate-lp-counter-trap',instanceId:source,respondingToLinkId:accepted.chain.at(-1)!.id});}
  if(accepted.timing.priorityPlayer!==topOwner)act(accepted.timing.priorityPlayer!,{type:'pass'});
  return{...f,state:accepted};
}
export function setupTrapThreeSevenCandidate(...args:Parameters<typeof setupTrapThreeSevenPrefix>){
  const [registry]=args,f=setupTrapThreeSevenPrefix(...args),accepted=f.state;const{actor,other,firstOwner,secondOwner,topOwner,method,phase,target,tributes,trap,first,second,top}=f;
  const denied=applyAction(registry,accepted,{actorId:topOwner,expectedStateVersion:accepted.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:top,respondingToLinkId:accepted.chain[2]!.id}});
  if(denied.accepted||denied.state!==accepted)throw new Error('Trap Hole fourth link must remain blocked');
  // Only the prefix is real gameplay. Explicitly model the rejected fourth receipt.
  const candidate=structuredClone(accepted)as Mutable<DuelState>,payer=candidate.players.find(p=>p.id===topOwner)!,beforeLP=payer.lifePoints,seq=candidate.eventSequence+1;
  payer.lifePoints-=1000;candidate.cards[top]!.position='face-up';candidate.chain.push({id:'candidate-third-seven',source:top,controllerId:topOwner,sourceAtActivation:structuredClone(candidate.cards[top]!),effectId:THREE_SEVEN_CANDIDATE_EFFECT_ID,spellSpeed:3,targetRefs:[],respondingToLinkId:candidate.chain[2]!.id,activationNegated:false,effectNegated:false,costEvents:[{sequence:seq,simultaneousGroup:'candidate-third-payment-'+seq,kind:'life-points-paid',affectedInstances:[],details:{playerId:topOwner,reason:'activation-cost',amount:1000,beforeLP,afterLP:payer.lifePoints}}]});
  candidate.eventSequence=seq+1;candidate.timing={...candidate.timing,window:'resolving',priorityPlayer:null,consecutivePasses:2};
  return{state:candidate,accepted,denied,actor,other,firstOwner,secondOwner,topOwner,method,phase,target,tributes,trap,first,second,top};
}
