import type {Registry} from '../../packages/engine/src/registry.js';
import {createDuel} from '../../packages/engine/src/duel.js';
import {createRandom} from '../../packages/engine/src/random.js';
/** Legal deck order + fixed seed only. Returned state is the untouched createDuel result.
 * Inverse permutation chooses reproducible opening hands; it never edits a dealt card/board. */
export function naturalChainStart(registry:Registry,actor='a'){
 const other=actor==='a'?'b':'a',duelId='natural-chain-'+actor,seedHex='c4'.repeat(32),V='official:03819470',T='official:04206964',ox=Object.values(registry.cards).find(c=>c.name==='Battle Ox')!.id,skull=Object.values(registry.cards).find(c=>c.name==='Skull Servant')!.id;
 const pool=[V,V,V,T,T,T,ox,skull];for(const c of Object.values(registry.cards))if(pool.length<40&&c.kind==='normal-monster'&&!pool.includes(c.id))pool.push(c.id);
 const random=createRandom(duelId,seedHex),players=(['a','b'] as const).map(who=>{const head=who===actor?[V,V,V,T,T,skull,ox]:[T,T,T,V,V,ox,V],rest=[...pool];for(const id of head)rest.splice(rest.indexOf(id),1);const desired=[...head,...rest],permutation=random.shuffle(Array.from({length:40},(_,i)=>i)),deck:string[]=Array(40);permutation.forEach((source,index)=>{deck[source]=desired[index]!;});return{id:who,deck};}) as [{id:string;deck:string[]},{id:string;deck:string[]}];
 const input={duelId,players,firstPlayerId:actor,seedHex},started=createDuel(registry,input),state=started.state,p=state.players.find(p=>p.id===actor)!,q=state.players.find(p=>p.id===other)!;
 const definition=(id:string)=>state.cards[id]!.definition.id,find=(who:string,id:string)=>Object.values(state.cards).find(c=>c.ownerId===who&&c.definition.id===id)!.id;
 const ownSeven=p.hand.filter(id=>definition(id)===V),ownTraps=p.hand.filter(id=>definition(id)===T),otherSeven=q.hand.filter(id=>definition(id)===V),otherTraps=q.hand.filter(id=>definition(id)===T),lastSeven=Object.values(state.cards).find(c=>c.ownerId===other&&c.definition.id===V&&c.location.kind==='deck')!.id;
 return{state,input,events:started.events,actor,other,ownSeven,ownTraps,otherSeven,otherTraps,lastSeven,target:find(actor,ox),otherTarget:find(other,ox)};
}
