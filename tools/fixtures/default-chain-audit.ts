import type {Registry} from '../../packages/engine/src/registry.js';
import type {DuelState,Slot} from '../../packages/protocol/src/duel.js';
import {createDuel,assertDuelInvariants} from '../../packages/engine/src/duel.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};
/** Initial board only; no edit or injected receipt after the server/driver starts. */
export function setupDefaultChainAudit(registry:Registry,actor='a',phase:'main1'|'main2'='main1'){
 const other=actor==='a'?'b':'a',names=['Seven Tools of the Bandit','Seven Tools of the Bandit','Seven Tools of the Bandit','Trap Hole','Trap Hole','Trap Hole','Magic Jammer','Battle Ox','Magician of Faith','Ookazi','Monster Reincarnation','Tribute to The Doomed','Hane-Hane','Man-Eater Bug','Mystical Elf','Skull Servant','Celtic Guardian'];
 const id=(name:string)=>Object.values(registry.cards).find(c=>c.name===name)!.id,deck=names.map(id);for(const c of Object.values(registry.cards))if(deck.length<40&&c.kind==='normal-monster'&&!deck.includes(c.id))deck.push(c.id);
 const state=structuredClone(createDuel(registry,{duelId:'default-chain-audit',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:actor,seedHex:'d4'.repeat(32)}).state)as Mutable<DuelState>;
 for(const p of state.players)for(const c of p.hand.splice(0)){p.deck.push(c);state.cards[c]!.location={kind:'deck',playerId:p.id};}
 state.turn={number:3,activePlayer:actor,phase};state.timing={...state.timing,window:'open',priorityPlayer:actor,consecutivePasses:0,lastRelevantEvents:[],requestedPhase:null};
 const take=(name:string,who:string,zone:'hand'|'graveyard'|'monster'|'spell-trap',slot:Slot=0)=>{const p=state.players.find(p=>p.id===who)!,cardId=p.deck.find(c=>state.cards[c]!.definition.id===id(name));if(!cardId)throw Error('Missing audit card '+name);p.deck.splice(p.deck.indexOf(cardId),1);const c=state.cards[cardId]!;if(zone==='hand'||zone==='graveyard'){p[zone].push(cardId);c.location={kind:zone,playerId:who};c.position=zone==='hand'?'face-down':'face-up';}else{const row=zone==='monster'?p.monsters:p.spellsTraps;if(row[slot]!==null)throw Error('Occupied fixture slot');row[slot]=cardId;c.location={kind:zone,playerId:who,slot};c.position=zone==='monster'?'face-down-defense':'face-down';c.markers.setOnTurn=1;}return cardId;};
 for(const who of [actor,other])take('Celtic Guardian',who,'graveyard');
 const target=take('Battle Ox',actor,'hand'),otherTarget=take('Battle Ox',other,'hand'),recovery=take('Monster Reincarnation',actor,'hand'),firstCost=take('Hane-Hane',actor,'hand'),removal=take('Tribute to The Doomed',actor,'hand'),secondCost=take('Man-Eater Bug',actor,'hand'),burn=take('Ookazi',actor,'hand'),faith=take('Magician of Faith',actor,'monster',1);
 const traps=[0,1,2].map(n=>take('Trap Hole',other,'spell-trap',n as Slot)),laterTraps=[3,4].map(n=>take('Trap Hole',actor,'spell-trap',n as Slot));
 const ownSeven=[0,1,2].map(n=>take('Seven Tools of the Bandit',actor,'spell-trap',n as Slot)),otherSeven=[3,4].map(n=>take('Seven Tools of the Bandit',other,'spell-trap',n as Slot));
 const lastSeven=take('Seven Tools of the Bandit',other,'hand'),magic=take('Magic Jammer',other,'hand'),magicCost=take('Mystical Elf',other,'hand');
 const p=state.players.find(p=>p.id===actor)!,drawCost=p.deck.find(c=>state.cards[c]!.definition.id===id('Skull Servant'))!;p.deck.splice(p.deck.indexOf(drawCost),1);p.deck.unshift(drawCost);p.lifePoints=4001;state.players.find(p=>p.id===other)!.lifePoints=3001;
 assertDuelInvariants(state,registry);return{state,actor,other,phase,target,otherTarget,recovery,firstCost,removal,secondCost,burn,faith,traps,laterTraps,ownSeven,otherSeven,lastSeven,magic,magicCost,drawCost};
}
