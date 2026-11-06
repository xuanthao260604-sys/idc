import {createDuel,assertDuelInvariants} from '../../packages/engine/src/duel.js';
import type {Registry} from '../../packages/engine/src/registry.js';
import type {DuelState,Slot} from '../../packages/protocol/src/duel.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
/** Initial setup only. All later effects, recovery, Set, turns and costs are real actions. */
export function setupTrapFourInteractions(registry:Registry,actor='a',selfDouble=true,negateHeal=false,phase:'main1'|'main2'=actor==='a'?'main1':'main2'){
 const other=actor==='a'?'b':'a',doubleOwner=selfDouble?actor:other,singleOwner=selfDouble?other:actor;
 const deck=[...Object.keys(registry.cards),'official:03819470','official:03819470','official:04206964','official:84257639'];
 const state=structuredClone(createDuel(registry,{duelId:'trap-four-interactions',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:actor,seedHex:'d8'.repeat(32)}).state)as Mutable<DuelState>;
 for(const p of state.players)for(const id of p.hand.splice(0)){p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};}
 state.turn={number:3,activePlayer:actor,phase};state.timing={...state.timing,window:'open',priorityPlayer:actor,consecutivePasses:0};
 const move=(name:string,who:string,zone:'hand'|'graveyard'|'monster'|'spell-trap',slot:Slot=0)=>{const p=state.players.find(p=>p.id===who)!,def=Object.values(registry.cards).find(c=>c.name===name)!,id=p.deck.find(id=>state.cards[id]!.definition.id===def.id);if(!id)throw new Error('Missing audit card '+name);p.deck.splice(p.deck.indexOf(id),1);const c=state.cards[id]!;
 if(zone==='monster'||zone==='spell-trap'){(zone==='monster'?p.monsters:p.spellsTraps)[slot]=id;c.location={kind:zone,playerId:who,slot};c.position=zone==='monster'?'face-down-defense':'face-down';c.markers.setOnTurn=who===actor?1:2;}else{p[zone].push(id);c.location={kind:zone,playerId:who};c.position=zone==='hand'?'face-down':'face-up';}return id;};
 for(const who of [actor,other])move('Celtic Guardian',who,'graveyard');
 const target=move('Battle Ox',actor,'hand'),removal=move('Tribute to The Doomed',actor,'hand'),removalCost=move('Man-Eater Bug',actor,'hand');
 const recovery=move('Monster Reincarnation',actor,'hand'),firstCost=move('Hane-Hane',actor,'hand'),secondCost=move('Skull Servant',actor,'hand');
 const faith=move('Magician of Faith',actor,'monster',1),burn=move('Ookazi',actor,'hand');
 const trap1=move('Trap Hole',other,'spell-trap',0),trap2=move('Trap Hole',other,'hand');
 const first1=move('Seven Tools of the Bandit',doubleOwner,'spell-trap',2),middle1=move('Seven Tools of the Bandit',singleOwner,'spell-trap',2),top1=move('Seven Tools of the Bandit',doubleOwner,'spell-trap',4);
 const first2=move('Seven Tools of the Bandit',singleOwner,'spell-trap',3),middle2=move('Seven Tools of the Bandit',doubleOwner,'spell-trap',3),top2=move('Seven Tools of the Bandit',singleOwner,'spell-trap',4);
 const doubleHeal=move('Dian Keto the Cure Master',doubleOwner,'hand'),singleHeal1=move('Dian Keto the Cure Master',singleOwner,'hand'),singleHeal2=move('Dian Keto the Cure Master',singleOwner,'hand');
 const magic=negateHeal?move('Magic Jammer',doubleOwner,'spell-trap',1):null,magicCost=negateHeal?move('Mystical Elf',doubleOwner,'hand'):null;
 state.players.find(p=>p.id===doubleOwner)!.lifePoints=2001;state.players.find(p=>p.id===singleOwner)!.lifePoints=1001;assertDuelInvariants(state,registry);
 return{state,actor,other,selfDouble,doubleOwner,singleOwner,negateHeal,phase,target,removal,removalCost,recovery,firstCost,secondCost,faith,burn,trap1,trap2,first1,middle1,top1,first2,middle2,top2,doubleHeal,singleHeal1,singleHeal2,magic,magicCost};
}
