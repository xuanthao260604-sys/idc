import { createDuel, assertDuelInvariants } from '../../packages/engine/src/duel.js';
import type { Registry } from '../../packages/engine/src/registry.js';
import type { DuelState, Slot } from '../../packages/protocol/src/duel.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
export function setupSevenResponse(registry:Registry,actor='a',firstOwn=true,secondOwn=false,method='normal',phase:'main1'|'main2'='main1',sameLP=2001,splitLP=1001){
  const other=actor==='a'?'b':'a',firstOwner=firstOwn?actor:other,secondOwner=secondOwn?actor:other;
  const deck=[...Object.keys(registry.cards),'official:03819470'];
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
  const trap=move('Trap Hole',other,'spell-trap'),first=move('Seven Tools of the Bandit',firstOwner,'spell-trap',2),second=move('Seven Tools of the Bandit',secondOwner,'spell-trap',4);
  for(const p of state.players)if(p.id===firstOwner||p.id===secondOwner)p.lifePoints=firstOwner===secondOwner?sameLP:splitLP;
  assertDuelInvariants(state,registry);return{state,actor,other,firstOwner,secondOwner,method,phase,target,tributes,trap,first,second};
}
