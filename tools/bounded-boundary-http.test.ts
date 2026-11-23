import {describe,it,expect} from 'vitest';
import {createBetaServer} from './beta-server.js';
import {boundedRegistry as registry,setupBoundedLive} from './fixtures/bounded-live.js';
import type {BoundedLiveOptions} from './fixtures/bounded-live.js';
import {boundedBoundaryOptions} from './fixtures/bounded-boundary.js';
type Case={label:string;kind:'lp'|'draw'|'damage'|'root';o:BoundedLiveOptions;lp?:number;remaining?:number;lethal?:boolean};
const cases:Case[]=[];
for(const actor of ['a','b'])for(const phase of ['main1','main2'] as const){
 const other=actor==='a'?'b':'a';
 for(const lp of [999,1000,1001])cases.push({label:`${actor}/${phase}/LP${lp}`,kind:'lp',lp,o:{...boundedBoundaryOptions(actor,'paid'),phase,lp:{[actor]:2000+lp,[other]:9001}}});
 for(const rootSet of [false,true])for(const mode of ['draw-short','draw-two','damage-lethal','damage-one']){
  const kind=mode.startsWith('draw')?'draw':'damage',remaining=mode==='draw-two'?2:actor==='a'?0:1,lethal=mode==='damage-lethal';
  cases.push({label:`${actor}/${phase}/${rootSet?'Set':'hand'}/${mode}`,kind,remaining,lethal,o:{...boundedBoundaryOptions(actor,kind),phase,rootSet,...(kind==='draw'?{deckRemaining:remaining}:{lp:{[actor]:9001,[other]:lethal?2800:2801}})}});
 }
}
for(const actor of ['a','b'])for(const spellId of Object.keys(registry.spellHandlers))cases.push({label:`${actor}/root/${spellId}`,kind:'root',o:{actor,phase:actor==='a'?'main2':'main1',spellId,rootSet:actor==='a',tie:true,owners:Array.from({length:5},(_,i)=>i%2?(actor==='a'?'b':'a'):actor)}});
describe('v6 HTTP boundary matrix: late LP, hand/Set, Main1/Main2, terminal and all reviewed roots',()=>{
 it.each(cases)('$label',async c=>{
  const f=setupBoundedLive(c.o),{actor,other}=f,server=createBetaServer(registry,undefined,f.state);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();if(!addr||typeof addr==='string')throw Error('No listener');const base=`http://127.0.0.1:${addr.port}`,cookies:Record<string,string>={};let serial=0,last:any;
  const post=(path:string,body:unknown,who?:string)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(who?{Cookie:cookies[who]!}:{})},body:JSON.stringify(body)});
  const get=(path:string,who:string)=>fetch(base+path,{headers:{Cookie:cookies[who]!}}).then(r=>r.json()),view=(who:string)=>get('/api/view?seat='+who,who);
  const send=async(who:string,action:any,accepted=true)=>{const v=await view(who),cmd={seat:who,commandId:'boundary-'+ ++serial,duelId:v.duelId,expectedStateVersion:v.stateVersion,action},res=await post('/api/command',cmd,who);expect(res.status).toBe(200);const r=await res.json();expect(r.outcome.accepted).toBe(accepted);expect(r.view.stateVersion).toBe(v.stateVersion+(accepted?1:0));if(!accepted)expect(await view(who)).toEqual(v);return{r,cmd};};
  const priority=async(who:string)=>{const v=await view(who);if(v.timing.priorityPlayer!==who)await send(v.timing.priorityPlayer,{type:'pass'});};
  const plan=async(who:string,type:string)=>{const p=(await view(who)).availableActions.find((a:any)=>a.type===type);expect(p).toBeDefined();return p;};
  try{
   for(const who of [actor,other]){const r=await post('/api/seat',{seat:who});cookies[who]=r.headers.get('set-cookie')!.split(';')[0]!;}
   const decks=[await get('/api/deck',actor),await get('/api/deck',other)];
   await send(actor,await plan(actor,c.kind==='lp'?'normal-summon':'activate-spell'));
   await priority(c.kind==='lp'?other:f.magicOwner);await send(c.kind==='lp'?other:f.magicOwner,await plan(c.kind==='lp'?other:f.magicOwner,c.kind==='lp'?'activate-trap':'activate-counter-trap'));
   for(const [i,who]of f.owners.entries()){
    await priority(who);
    if(c.kind==='lp'&&i===4){const v=await view(actor),p=v.players.find((p:any)=>p.playerId===actor);expect(p.lifePoints).toBe(c.lp);expect(v.availableActions.some((a:any)=>a.type==='activate-lp-counter-trap')).toBe(c.lp!>1000);
     if(c.lp!<=1000){const slot=f.state.cards[f.sevenIds[actor]![2]!]!.location;if(slot.kind!=='spell-trap')throw Error('Not Set');const denied=await send(actor,{type:'activate-lp-counter-trap',cardHandle:p.spellsTraps[slot.slot].handle,chainHandle:v.chain.at(-1).chainHandle},false);expect(denied.r.outcome.reason).toBe('unpayable-cost');expect((await view(actor)).players.find((p:any)=>p.playerId===actor).spellsTraps[slot.slot].position).toBe('face-down');break;}
    }
    last=await send(who,await plan(who,'activate-lp-counter-trap'));
   }
   const before=await view(actor),payments=c.kind==='lp'&&c.lp!<=1000?4:5,lpBefore=before.players.map((p:any)=>p.lifePoints),handBefore=before.selfHand.length;expect(before.chain.length).toBe((c.kind==='lp'?1:2)+payments);
   for(let i=0;i<2;i++)await send((await view(actor)).timing.priorityPlayer,{type:'pass'});
   for(let i=0;i<4&&(await view(actor)).chain.length;i++){const a=await view(actor),b=await view(other),v=[a,b].find(v=>v.decision);expect(v).toBeDefined();const d=v.decision;await send(v.viewerId,{type:'answer-decision',decisionId:d.id,optionIds:d.kind==='cleanup-order'?[...d.optionIds].reverse():[d.optionIds.at(-1)]});}
   const end=await view(actor);expect(end.chain).toEqual([]);expect(end.decision).toBeNull();
   const terminal=c.kind==='draw'&&c.remaining!<2||c.kind==='damage'&&c.lethal;
   if(terminal){expect(end.result).toEqual({winner:c.kind==='draw'?other:actor,reason:c.kind==='draw'?'failed-draw':'life-points'});expect(end.players.find((p:any)=>p.playerId===actor).spellsTraps.filter(Boolean)).toHaveLength(4);expect(end.availableActions).toEqual([]);const denied=await send(actor,{type:'pass'},false);expect(denied.r.outcome.reason).toBe('duel-ended');}
   else expect(end.result).toBeNull();
   if(c.kind==='lp'){expect(end.players.find((p:any)=>p.playerId===actor).lifePoints).toBe(c.lp===1001?1:c.lp);expect(end.players.find((p:any)=>p.playerId===actor).monsters[0]!==null).toBe(c.lp===1001);}
   if(c.kind==='draw')expect(end.selfHand.length-handBefore).toBe(c.remaining);
   if(c.kind==='damage')expect(end.players.find((p:any)=>p.playerId===other).lifePoints).toBe(c.lethal?0:1);
   if(c.kind==='root'){const h=registry.spellHandlers[c.o.spellId!]!;if(h.handler==='draw')expect(end.selfHand.length-handBefore).toBe(2);if(h.handler==='gain-life-points')expect(end.players.find((p:any)=>p.playerId===actor).lifePoints-lpBefore.find((_:number,i:number)=>before.players[i].playerId===actor)).toBe(h.amount);if(h.handler==='inflict-damage')expect(lpBefore.find((_:number,i:number)=>before.players[i].playerId===other)-end.players.find((p:any)=>p.playerId===other).lifePoints).toBe(h.amount);}
   expect((await(await post('/api/command',last.cmd,last.cmd.seat)).json()).outcome).toEqual(last.r.outcome);expect(await view(actor)).toEqual(end);
   expect((await view(other)).activity).toEqual(end.activity);expect(end.activity.flatMap((a:any)=>a.resolution||[]).filter((a:any)=>a.kind==='lp-cost')).toHaveLength(payments);for(const who of [actor,other])for(const key of ['boundedCounterResolution','sourceAtActivation','integritySha256','survivingSourceIds'])expect(JSON.stringify(await view(who))).not.toContain(key);
   expect([await get('/api/deck',actor),await get('/api/deck',other)]).toEqual(decks);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
});
