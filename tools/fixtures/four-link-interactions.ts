import {createDuel,assertDuelInvariants} from '../../packages/engine/src/duel.js';
import type {Registry} from '../../packages/engine/src/registry.js';
import type {DuelState,Slot} from '../../packages/protocol/src/duel.js';
type Mutable<T>={-readonly[K in keyof T]:Mutable<T[K]>};

/** Initial board only. Later Set, healing, recovery and costs all use real actions. */
export function setupFourLinkInteractions(registry:Registry,actor='a',selfMagic=false,selfFirst=true,negateHeal=false){
  const other=actor==='a'?'b':'a',magicOwner=selfMagic?actor:other,firstOwner=selfFirst?actor:other,topOwner=selfFirst?other:actor;
  const deck=[...Object.keys(registry.cards),'official:03819470','official:77414722','official:77414722'];
  const state=structuredClone(createDuel(registry,{duelId:'four-link-interactions',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:actor,seedHex:'d7'.repeat(32)}).state) as Mutable<DuelState>;
  for(const p of state.players)for(const id of p.hand.splice(0)){p.deck.push(id);state.cards[id]!.location={kind:'deck',playerId:p.id};}
  state.turn={number:3,activePlayer:actor,phase:actor==='a'?'main1':'main2'};state.timing={...state.timing,window:'open',priorityPlayer:actor,consecutivePasses:0};
  const move=(name:string,who:string,zone:'hand'|'graveyard'|'spell-trap',slot:Slot=0)=>{
    const p=state.players.find(p=>p.id===who)!,def=Object.values(registry.cards).find(c=>c.name===name)!,id=p.deck.find(id=>state.cards[id]!.definition.id===def.id);
    if(!id)throw new Error('Missing audit card '+name);p.deck.splice(p.deck.indexOf(id),1);const c=state.cards[id]!;
    if(zone==='spell-trap'){p.spellsTraps[slot]=id;c.location={kind:zone,playerId:who,slot};c.position='face-down';c.markers.setOnTurn=who===actor?1:2;}
    else{p[zone].push(id);c.location={kind:zone,playerId:who};c.position=zone==='hand'?'face-down':'face-up';}return id;
  };
  for(const who of [actor,other])move('Celtic Guardian',who,'graveyard');
  const root=move('Monster Reincarnation',actor,'hand'),firstCost=move('Man-Eater Bug',actor,'hand'),secondCost=move('Skull Servant',actor,'hand');
  const faith=move('Magician of Faith',actor,'hand'),ownHeal=move('Dian Keto the Cure Master',actor,'hand'),otherHeal=move('Dian Keto the Cure Master',other,'hand'),burn=move('Ookazi',actor,'hand');
  const magic1=move('Magic Jammer',magicOwner,'spell-trap',2),magic2=move('Magic Jammer',magicOwner,'spell-trap',1);
  const magicCost1=move('Hane-Hane',magicOwner,'hand'),magicCost2=move('Battle Ox',magicOwner,'hand');
  const first1=move('Seven Tools of the Bandit',firstOwner,'spell-trap',4),first2=move('Seven Tools of the Bandit',firstOwner,'spell-trap',3);
  const top1=move('Seven Tools of the Bandit',topOwner,'spell-trap',4),top2=move('Seven Tools of the Bandit',topOwner,'spell-trap',3);
  const healMagic=negateHeal?move('Magic Jammer',actor,'hand'):null,healCost=negateHeal?move('Mystical Elf',actor,'hand'):null;
  for(const p of state.players)p.lifePoints=1001;assertDuelInvariants(state,registry);
  return{state,actor,other,magicOwner,firstOwner,topOwner,negateHeal,root,firstCost,secondCost,faith,ownHeal,otherHeal,burn,magic1,magic2,magicCost1,magicCost2,first1,first2,top1,top2,healMagic,healCost};
}
