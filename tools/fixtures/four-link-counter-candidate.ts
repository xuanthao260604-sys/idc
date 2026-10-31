import { createDuel, applyAction, assertDuelInvariants } from '../../packages/engine/src/duel.js';
import type { Registry } from '../../packages/engine/src/registry.js';
import type { DuelState, Slot } from '../../packages/protocol/src/duel.js';
import type { EngineAction } from '../../packages/engine/src/actions.js';
import { FOUR_LINK_CANDIDATE_EFFECT_ID } from '../../packages/engine/src/four-link-counter-candidate.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};

/** Three real accepted activations; link four is explicitly rejected, then modeled
 * solely as a candidate receipt. This helper is never imported by the beta product.
 */
export function setupFourLinkBoard(registry:Registry,rootDef='official:66788016',actor='a',selfMagic=false,selfFirst=true,selfTop=false,phase:'main1'|'main2'='main1',fromSet=false,largeLP=false,deckRemaining?:0|1,initialLP?:number){
  const other=actor==='a'?'b':'a',magicOwner=selfMagic?actor:other,firstOwner=selfFirst?actor:other,topOwner=selfTop?actor:other;
  const deck=[...Object.keys(registry.cards),'official:03819470','official:05053103'];
  const initial=structuredClone(createDuel(registry,{duelId:'four-link-candidate',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:actor,seedHex:'d6'.repeat(32)}).state) as Mutable<DuelState>;
  for(const p of initial.players)for(const id of p.hand.splice(0)){p.deck.push(id);initial.cards[id]!.location={kind:'deck',playerId:p.id};}
  initial.turn={number:3,activePlayer:actor,phase};initial.timing={...initial.timing,window:'open',priorityPlayer:actor,consecutivePasses:0};
  const move=(def:string,who:string,zone:'hand'|'monster'|'graveyard'|'spell-trap',slot:Slot=0)=>{
    const p=initial.players.find(p=>p.id===who)!,id=p.deck.find(id=>initial.cards[id]!.definition.id===def);if(!id)throw new Error('Missing candidate card '+def);
    p.deck.splice(p.deck.indexOf(id),1);const c=initial.cards[id]!;
    if(zone==='monster'||zone==='spell-trap'){(zone==='monster'?p.monsters:p.spellsTraps)[slot]=id;c.location={kind:zone,playerId:who,slot};c.position=zone==='monster'?'face-up-attack':'face-down';if(zone==='spell-trap')c.markers.setOnTurn=who===actor?1:2;}
    else{p[zone].push(id);c.location={kind:zone,playerId:who};c.position=zone==='hand'?'face-down':'face-up';}return id;
  };
  for(const who of [actor,other])move('official:91152256',who,'graveyard');
  const root=move(rootDef,actor,'hand'),magic=move('official:77414722',magicOwner,'spell-trap',2);
  const first=move('official:03819470',firstOwner,'spell-trap',4),top=move('official:03819470',topOwner,'spell-trap',3);
  const targets=[move('official:05053103',other,'monster',0),move('official:05053103',other,'monster',1)];
  const handler=registry.spellHandlers[rootDef]!.handler,hasCost=['discard-destroy-target-monster','discard-return-own-graveyard-monster'].includes(handler);
  const rootCost=hasCost?move('official:32274490',actor,'hand'):null,magicCost=move('official:54652250',magicOwner,'hand');
  for(const p of initial.players)if(p.id===firstOwner||p.id===topOwner)p.lifePoints=initialLP??(largeLP?8000:firstOwner===topOwner?2001:1001);
  if(deckRemaining!==undefined){const p=initial.players.find(p=>p.id===actor)!;for(const id of p.deck.splice(deckRemaining)){p.hand.push(id);initial.cards[id]!.location={kind:'hand',playerId:actor};}}
  return{state:initial,rootDef,phase,fromSet,handler,hasCost,actor,other,magicOwner,firstOwner,topOwner,root,magic,first,top,targets,rootCost,magicCost};
}
export function setupFourLinkPrefix(...args:Parameters<typeof setupFourLinkBoard>){
  const [registry]=args,f=setupFourLinkBoard(...args);
  const {actor,other,magicOwner,firstOwner,topOwner,root,magic,first,top,targets,rootCost,magicCost,fromSet,handler,hasCost}=f;
  let accepted:DuelState=f.state;

  const act=(who:string,action:EngineAction)=>{const r=applyAction(registry,accepted,{actorId:who,expectedStateVersion:accepted.stateVersion,action});if(!r.accepted)throw new Error(r.message);assertDuelInvariants(r.state,registry);accepted=r.state;};
  if(fromSet){act(actor,{type:'set-spell',instanceId:root,slot:0});while(accepted.timing.window!=='open')act(accepted.timing.priorityPlayer!,{type:'pass'});}
  act(actor,{type:'activate-spell',instanceId:root,slot:0,...(rootCost?{discardId:rootCost}:{}),...(hasCost||handler==='target-opposing-attack-to-defense'?{targetId:handler==='discard-return-own-graveyard-monster'?rootCost!:targets[0]!}:{})});
  if(accepted.timing.priorityPlayer!==magicOwner)act(accepted.timing.priorityPlayer!,{type:'pass'});
  act(magicOwner,{type:'activate-counter-trap',instanceId:magic,discardId:magicCost,respondingToLinkId:accepted.chain[0]!.id});
  if(accepted.timing.priorityPlayer!==firstOwner)act(accepted.timing.priorityPlayer!,{type:'pass'});
  act(firstOwner,{type:'activate-lp-counter-trap',instanceId:first,respondingToLinkId:accepted.chain[1]!.id});
  if(accepted.timing.priorityPlayer!==topOwner)act(accepted.timing.priorityPlayer!,{type:'pass'});
  return{state:accepted,actor,other,magicOwner,firstOwner,topOwner,root,magic,first,top,targets,rootCost,magicCost};
}
export function setupFourLinkCounterCandidate(...args:Parameters<typeof setupFourLinkPrefix>){
  const [registry]=args,f=setupFourLinkPrefix(...args);
  const {state:accepted,actor,other,magicOwner,firstOwner,topOwner,root,magic,first,top,targets,rootCost,magicCost}=f;
  const denied=applyAction(registry,accepted,{actorId:topOwner,expectedStateVersion:accepted.stateVersion,action:{type:'activate-lp-counter-trap',instanceId:top,respondingToLinkId:accepted.chain[2]!.id}});
  if(denied.accepted||denied.state!==accepted)throw new Error('The fourth link must remain blocked in gameplay');
  const state=structuredClone(accepted) as Mutable<DuelState>,p=state.players.find(p=>p.id===topOwner)!,beforeLP=p.lifePoints,seq=state.eventSequence+1;
  p.lifePoints-=1000;state.cards[top]!.position='face-up';state.chain.push({id:'candidate-fourth-link',source:top,sourceAtActivation:structuredClone(state.cards[top]!),controllerId:topOwner,
    effectId:FOUR_LINK_CANDIDATE_EFFECT_ID,spellSpeed:3,targetRefs:[],respondingToLinkId:state.chain[2]!.id,activationNegated:false,effectNegated:false,
    costEvents:[{sequence:seq,simultaneousGroup:'candidate-fourth-payment-'+seq,kind:'life-points-paid',affectedInstances:[],details:{playerId:topOwner,amount:1000,beforeLP,afterLP:p.lifePoints,reason:'activation-cost'}}]});
  state.eventSequence=seq+1;state.timing={...state.timing,window:'resolving',priorityPlayer:null,consecutivePasses:2};
  return{state,accepted,denied,actor,other,magicOwner,firstOwner,topOwner,root,magic,first,top,targets,rootCost,magicCost};
}
