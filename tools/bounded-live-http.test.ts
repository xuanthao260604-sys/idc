import {describe,it,expect} from 'vitest';
import {createBetaServer} from './beta-server.js';
import {boundedRegistry as registry,setupBoundedLive} from './fixtures/bounded-live.js';
import {loadRuntimeCatalog} from './runtime-catalog.js';
const cases=['a','b'].flatMap(actor=>['spell','trap','choice'].map(kind=>({actor,kind})));
describe('explicit bounded v6 through loopback HTTP; no client capability switch',()=>{
 it.each(cases)('plays $actor/$kind with owner privacy, strict commands and deduplication',async({actor,kind})=>{
  const other=actor==='a'?'b':'a',owners=Array.from({length:kind==='spell'?6:5},(_,i)=>i%2?other:actor),f=setupBoundedLive({actor,phase:actor==='a'?'main1':'main2',owners,...(kind==='trap'?{traps:3}:{spellId:kind==='choice'?'official:66788016':'official:55144522',tie:kind==='choice'})}),server=createBetaServer(registry,undefined,f.state);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const addr=server.address();if(!addr||typeof addr==='string')throw Error('No HTTP listener');const base=`http://127.0.0.1:${addr.port}`,cookies:Record<string,string>={};let serial=0;
  const post=(path:string,body:unknown,who?:string)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(who?{Cookie:cookies[who]!}:{})},body:JSON.stringify(body)});
  const get=(path:string,who:string)=>fetch(base+path,{headers:{Cookie:cookies[who]!}}).then(r=>r.json());
  const view=(who:string)=>get('/api/view?seat='+who,who);
  const send=async(who:string,action:any)=>{const v=await view(who),cmd={seat:who,commandId:'http-bounded-'+ ++serial,duelId:v.duelId,expectedStateVersion:v.stateVersion,action},res=await post('/api/command',cmd,who);expect(res.status).toBe(200);const r=await res.json();expect(r.outcome.accepted).toBe(true);expect(r.view.stateVersion).toBe(v.stateVersion+1);return{r,cmd};};
  const priority=async(who:string)=>{const v=await view(who);if(v.timing.priorityPlayer!==who)await send(v.timing.priorityPlayer,{type:'pass'});};
  const plan=async(who:string,type:string)=>{const v=await view(who);const p=v.availableActions.find((a:any)=>a.type===type);expect(p).toBeDefined();return p;};
  try{
   for(const who of [actor,other]){const r=await post('/api/seat',{seat:who});cookies[who]=r.headers.get('set-cookie')!.split(';')[0]!;}
   const decks=[await get('/api/deck',actor),await get('/api/deck',other)],catalog=await get('/api/catalog',actor);expect(catalog.cards.find((c:any)=>c.id==='official:03819470').support.counterContinuation).toBe('reviewed-bounded-counter-patterns-v6');expect(JSON.stringify(catalog)).not.toContain('reviewSha256');
   await send(actor,await plan(actor,kind==='trap'?'normal-summon':'activate-spell'));
   if(kind==='trap')for(let i=0;i<3;i++){await priority(other);await send(other,await plan(other,'activate-trap'));}
   else{await priority(f.magicOwner);await send(f.magicOwner,await plan(f.magicOwner,'activate-counter-trap'));}
   let last:any;for(const [index,who]of owners.entries()){await priority(who);
    if(index===owners.length-1){const oldPlan=await plan(who,'activate-lp-counter-trap'),v=await view(who),refresh=await post('/api/seat',{seat:who},who);cookies[who]=refresh.headers.get('set-cookie')!.split(';')[0]!;const fresh=await view(who),rejected=await(await post('/api/command',{seat:who,commandId:'stale-counter-handle',duelId:v.duelId,expectedStateVersion:v.stateVersion,action:oldPlan},who)).json();expect(rejected.outcome.accepted).toBe(false);expect(await view(who)).toEqual(fresh);}
    last=await send(who,await plan(who,'activate-lp-counter-trap'));}

   const built=await view(actor);expect(built.chain).toHaveLength(kind==='choice'?7:8);expect((await(await post('/api/command',last.cmd,owners.at(-1))).json()).outcome).toEqual(last.r.outcome);expect(await view(actor)).toEqual(built);
   const forged={seat:actor,commandId:'frame-injection',duelId:built.duelId,expectedStateVersion:built.stateVersion,action:{type:'pass'},boundedCounterResolution:{stage:'cleanup'},review:{revision:6}};expect((await post('/api/command',forged,actor)).status).toBe(400);expect(await view(actor)).toEqual(built);
   expect((await post('/api/command',{seat:other,commandId:'seat-forged',duelId:built.duelId,expectedStateVersion:built.stateVersion,action:{type:'pass'}},actor)).status).toBe(409);expect(await view(actor)).toEqual(built);
   for(let i=0;i<2;i++)await send((await view(actor)).timing.priorityPlayer,{type:'pass'});
   let rootChoices=0,cleanup=0;for(let i=0;i<4&&(await view(actor)).chain.length;i++){
    const all=[await view(actor),await view(other)],own=all.find(v=>v.decision),hidden=all.find(v=>!v.decision);expect(own).toBeDefined();expect(hidden).toBeDefined();
    for(const v of all)for(const key of ['boundedCounterResolution','sourceAtActivation','integritySha256','reviewSha256','survivingSourceIds'])expect(JSON.stringify(v)).not.toContain(key);
    const d=own.decision;if(d.kind==='cleanup-order'){cleanup++;expect(own.chain.every((l:any)=>l.resolved&&l.targetHandles.length===0)).toBe(true);}else{rootChoices++;expect(own.chain.slice(1).every((l:any)=>l.resolved&&l.targetHandles.length===0)).toBe(true);}
    const result=await send(own.viewerId,{type:'answer-decision',decisionId:d.id,optionIds:d.kind==='cleanup-order'?[...d.optionIds].reverse():[d.optionIds.at(-1)]}),after=await view(actor),retry=await(await post('/api/command',result.cmd,own.viewerId)).json();expect(retry.outcome).toEqual(result.r.outcome);expect(await view(actor)).toEqual(after);
   }
   expect(rootChoices).toBe(kind==='choice'?1:0);expect(cleanup).toBe(kind==='trap'?2:1);const end=await view(actor);expect(end.chain).toEqual([]);expect(end.result).toBeNull();expect((await view(other)).activity).toEqual(end.activity);expect([await get('/api/deck',actor),await get('/api/deck',other)]).toEqual(decks);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
 it('keeps the normal runtime manifest on v5',()=>{expect(loadRuntimeCatalog().registry.counterContinuations['official:03819470']).toBe('reviewed-four-link-counter-patterns-v5');});
});
