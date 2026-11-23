import type {BoundedLiveOptions} from './bounded-live.js';
export type BoundedBoundaryKind='blocked'|'paid'|'draw'|'damage';
/** Board-only options; all post-setup costs, effects and terminal changes use commands. */
export function boundedBoundaryOptions(actor:string,kind:BoundedBoundaryKind):BoundedLiveOptions {
 const other=actor==='a'?'b':'a',owners=Array.from({length:5},(_,i)=>i%2?other:actor),phase=actor==='a'?'main2':'main1';
 if(kind==='blocked'||kind==='paid')return{actor,phase,owners,lp:{[actor]:kind==='paid'?3001:actor==='a'?2999:3000,[other]:9001}};
 return{actor,phase,owners,rootSet:true,spellId:kind==='draw'?'official:55144522':'official:19523799',magicOwner:kind==='damage'?actor:other,
  ...(kind==='draw'?{deckRemaining:actor==='a'?0:1}:{lp:{[actor]:9001,[other]:2800}})};
}
