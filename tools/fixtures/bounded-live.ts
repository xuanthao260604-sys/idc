import { loadRuntimeCatalog } from '../runtime-catalog.js';
import { createRegistry } from '../../packages/engine/src/registry.js';
import { goat200508Format } from '../../packages/card-data/src/formats/goat-2005-08-17.js';
import { createDuel,applyAction,assertDuelInvariants } from '../../packages/engine/src/duel.js';
import type { DuelState,Slot } from '../../packages/protocol/src/duel.js';
import type { EngineAction } from '../../packages/engine/src/actions.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
const runtime=loadRuntimeCatalog();
export const explicitBoundedReview={...runtime.effectReviews.counters.find(r=>r.cardId==='official:03819470')!,revision:6,scope:'counter-trap-reviewed-bounded-patterns-v6',continuation:'reviewed-bounded-counter-patterns-v6'};
export const boundedRegistry=createRegistry(runtime.cards,goat200508Format,{},runtime.effectReviews.spells,runtime.effectReviews.flips,runtime.effectReviews.traps,
  [...runtime.effectReviews.counters.filter(r=>r.cardId!=='official:03819470'),explicitBoundedReview]);
export interface BoundedLiveOptions { actor?:string;spellId?:string;magicOwner?:string;owners?:readonly string[];traps?:number;phase?:'main1'|'main2';method?:'normal'|'tribute'|'flip';tie?:boolean;lp?:Readonly<Record<string,number>>;deckRemaining?:number;activateSevenCount?:number }
/** Initial board only. Every Chain receipt/link after this fixture is produced by
 * applyAction, never by converting a candidate snapshot or writing Chain state.
 */
export function setupBoundedLive(o:BoundedLiveOptions={}) {
  const registry=boundedRegistry,actor=o.actor??'a',other=actor==='a'?'b':'a',magicOwner=o.magicOwner??other,owners=o.owners??['a','b'];
  const targetDef=Object.values(registry.cards).find(c=>o.method==='tribute'?c.kind==='normal-monster'&&c.level>=5&&c.level<=6&&c.attack>=1000:c.name==='Battle Ox')!.id;
  const ox=Object.values(registry.cards).find(c=>c.name==='Battle Ox')!.id;
  const deck=['official:03819470','official:03819470','official:03819470','official:04206964','official:04206964','official:04206964','official:77414722',ox,ox];
  if(!deck.includes(targetDef))deck.push(targetDef);if(o.spellId)deck.push(o.spellId);
  for(const c of Object.values(registry.cards))if(deck.length<40&&c.kind==='normal-monster'&&!deck.includes(c.id))deck.push(c.id);
  const state=structuredClone(createDuel(registry,{duelId:'bounded-live',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:actor,seedHex:'a7'.repeat(32)}).state) as Mutable<DuelState>;
  for(const p of state.players){for(const id of p.hand.splice(0)){p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};}p.lifePoints=o.lp?.[p.id]??9001;}
  state.turn={number:3,activePlayer:actor,phase:o.phase??'main1'};state.timing={window:'open',priorityPlayer:actor,consecutivePasses:0,lastRelevantEvents:[],requestedPhase:null};
  const take=(who:string,definition:string,zone:'hand'|'graveyard'|'monster'|'spell-trap',slot?:Slot)=>{
    const p=state.players.find(p=>p.id===who)!,id=p.deck.find(id=>state.cards[id]!.definition.id===definition)!;
    if(!id)throw Error('Missing fixture card '+definition);p.deck.splice(p.deck.indexOf(id),1);const c=state.cards[id]!;
    if(zone==='hand'||zone==='graveyard'){p[zone].push(id);c.location={kind:zone,playerId:who};c.position=zone==='hand'?'face-down':'face-up';}
    else {const row=zone==='monster'?p.monsters:p.spellsTraps,at=slot??row.indexOf(null) as Slot;if(at<0||row[at]!==null)throw Error('Fixture slot occupied');row[at]=id;c.location={kind:zone,playerId:who,slot:at};c.position=zone==='monster'?'face-up-attack':'face-down';c.markers.setOnTurn=1;}
    return id;
  };
  const normal=(who:string,zone:'hand'|'graveyard')=>{const p=state.players.find(p=>p.id===who)!,id=p.deck.find(id=>registry.cards[state.cards[id]!.definition.id]!.kind==='normal-monster'&&state.cards[id]!.definition.id!==ox&&state.cards[id]!.definition.id!==targetDef)!;return take(who,state.cards[id]!.definition.id,zone);};
  let root:string|undefined,magic:string|undefined,magicCost:string|undefined,rootCost:string|undefined,target:string,rootTarget:string|undefined;
  const trapIds:string[]=[],tributes:string[]=[];
  const reserved:Record<string,Set<number>>={a:new Set(),b:new Set()};
  if(o.spellId){root=take(actor,o.spellId,'hand');reserved[actor]!.add(0);const mslot=magicOwner===actor?1:0;reserved[magicOwner]!.add(mslot);magic=take(magicOwner,'official:77414722','spell-trap',mslot as Slot);magicCost=normal(magicOwner,'hand');target=take(other,ox,'monster',0);if(o.tie)take(other,ox,'monster',1);
    const handler=registry.spellHandlers[o.spellId]!.handler;
    if(['discard-destroy-target-monster','discard-return-own-graveyard-monster'].includes(handler))rootCost=normal(actor,'hand');
    if(handler==='discard-return-own-graveyard-monster')rootTarget=normal(actor,'graveyard');
    else if(handler==='discard-destroy-target-monster'||handler==='target-opposing-attack-to-defense')rootTarget=target;
  }else{target=take(actor,targetDef,o.method==='flip'?'monster':'hand',0);if(o.method==='flip')state.cards[target]!.position='face-down-defense';
    if(o.method==='tribute')tributes.push(take(actor,ox,'monster',0));
    for(let i=0;i<(o.traps??1);i++){reserved[other]!.add(i);trapIds.push(take(other,'official:04206964','spell-trap',i as Slot));}}
  const sevenIds:Record<string,string[]>={a:[],b:[]};
  for(const who of ['a','b'])for(let i=0;i<owners.filter(p=>p===who).length;i++){
    const slot=Array.from({length:5},(_,s)=>s).find(s=>!reserved[who]!.has(s))!;reserved[who]!.add(slot);sevenIds[who]!.push(take(who,'official:03819470','spell-trap',slot as Slot));}
  if(o.deckRemaining!==undefined){const p=state.players.find(p=>p.id===actor)!;for(const id of p.deck.splice(o.deckRemaining)){p.graveyard.push(id);state.cards[id]!.location={kind:'graveyard',playerId:actor};state.cards[id]!.position='face-up';}}
  assertDuelInvariants(state,registry);return{state,actor,other,magicOwner,root,magic,magicCost,rootCost,rootTarget,target,trapIds,sevenIds,tributes,owners};
}
export function buildBoundedLive(o:BoundedLiveOptions={}) {
  const f=setupBoundedLive(o);let state:DuelState=f.state;
  const act=(who:string,action:EngineAction)=>{const old=structuredClone(state),r=applyAction(boundedRegistry,state,{actorId:who,expectedStateVersion:state.stateVersion,action});if(!r.accepted)throw Error(r.message);if(JSON.stringify(old)!==JSON.stringify(state))throw Error('Mutated live input');state=r.state;assertDuelInvariants(state,boundedRegistry);return r;};
  if(f.root){act(f.actor,{type:'activate-spell',instanceId:f.root,slot:0,...(f.rootCost?{discardId:f.rootCost}:{}),...(f.rootTarget?{targetId:f.rootTarget}:{})});if(state.timing.priorityPlayer!==f.magicOwner)act(state.timing.priorityPlayer!,{type:'pass'});act(f.magicOwner,{type:'activate-counter-trap',instanceId:f.magic!,discardId:f.magicCost!,respondingToLinkId:state.chain[0]!.id});}
  else{act(f.actor,o.method==='flip'?{type:'flip-summon',instanceId:f.target}:{type:'normal-summon',instanceId:f.target,slot:0,tributeIds:f.tributes});
    for(const id of f.trapIds){if(state.timing.priorityPlayer!==f.other)act(state.timing.priorityPlayer!,{type:'pass'});act(f.other,{type:'activate-trap',instanceId:id,targetId:f.target});}}
  const used:Record<string,number>={a:0,b:0};
  for(const who of f.owners.slice(0,o.activateSevenCount??f.owners.length)){if(state.timing.priorityPlayer!==who)act(state.timing.priorityPlayer!,{type:'pass'});act(who,{type:'activate-lp-counter-trap',instanceId:f.sevenIds[who]![(used[who]??0)]!,respondingToLinkId:state.chain.at(-1)!.id});used[who]=(used[who]??0)+1;}
  return{...f,state};
}
