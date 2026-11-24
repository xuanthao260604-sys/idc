import type {Registry} from '../../packages/engine/src/registry.js';
import {createDuel} from '../../packages/engine/src/duel.js';
import {createRandom} from '../../packages/engine/src/random.js';
/** Chosen legal input and inverse shuffle only; never changes the created state. */
export function naturalSpellStart(registry:Registry,actor='a',negated=false){
 const other=actor==='a'?'b':'a',duelId='natural-spell-'+actor,seedHex='c5'.repeat(32),id=(n:string)=>Object.values(registry.cards).find(c=>c.name===n)!.id,V=id('Seven Tools of the Bandit'),M=id('Magic Jammer'),P=id('Pot of Greed'),F=id('Magician of Faith'),S=id('Skull Servant');
 const pool=[V,V,V,M,M,P,F,S,S,S];for(const c of Object.values(registry.cards))if(pool.length<40&&c.kind==='normal-monster'&&!pool.includes(c.id))pool.push(c.id);
 const random=createRandom(duelId,seedHex),players=(['a','b']as const).map(who=>{const head=who===actor?[V,V,V,F,P,S,S]:negated?[M,V,V,V,S,S,M]:[M,V,V,S,S,M,V],rest=[...pool];for(const card of head){const n=rest.indexOf(card);if(n<0)throw Error('Invalid input multiset');rest.splice(n,1);}const desired=[...head,...rest],order=random.shuffle(Array.from({length:40},(_,i)=>i)),deck:string[]=Array(40);order.forEach((source,n)=>{deck[source]=desired[n]!;});return{id:who,deck};}) as [{id:string;deck:string[]},{id:string;deck:string[]}];
 const input={duelId,players,firstPlayerId:actor,seedHex},started=createDuel(registry,input),state=started.state,find=(who:string,name:string)=>Object.values(state.cards).filter(c=>c.ownerId===who&&c.definition.id===id(name)).map(c=>c.id),p=state.players.find(p=>p.id===other)!;
 return{state,input,events:started.events,actor,other,ownSeven:find(actor,'Seven Tools of the Bandit'),otherSeven:p.hand.filter(c=>state.cards[c]!.definition.id===V),lastSeven:p.deck.find(c=>state.cards[c]!.definition.id===V)!,magic:p.hand.find(c=>state.cards[c]!.definition.id===M)!,laterMagic:p.deck.find(c=>state.cards[c]!.definition.id===M)!,costs:[...p.hand,...p.deck].filter(c=>state.cards[c]!.definition.id===S).slice(0,2),pot:find(actor,'Pot of Greed')[0]!,faith:find(actor,'Magician of Faith')[0]!};
}
