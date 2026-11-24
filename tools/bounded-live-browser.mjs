import assert from 'node:assert/strict';
/** Only the starting board is prepared; all later changes use the real UI/HTTP. */
export async function boundedLiveBrowser({f,kind,defaultRun=false,evaluate,seat,click,actionClick,textButton,confirm,pass,send,errors,browserVersion}){
 const {actor,other}=f,saved={},secret=['boundedCounterResolution','sourceAtActivation','reviewSha256','integritySha256','survivingSourceIds'];
 const board=who=>`view.players.find(p=>p.playerId===${JSON.stringify(who)})`;
 const priority=async who=>{const current=await evaluate('view.timing.priorityPlayer');if(current!==who)await pass(current);await seat(who);};
 const slot=async id=>{const c=f.state.cards[id];await seat(c.ownerId);await click(`document.querySelector('#self .zone-row:nth-child(3) .slot:nth-child(${c.location.slot+1}) .card')`);};
 const immutable=async()=>{for(const s of secret)assert.equal((await evaluate('JSON.stringify(view)')).includes(s),false);};
 for(const who of [actor,other]){await seat(who);saved[who]=await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`);await immutable();}
 await seat(actor);const rootName=kind==='trap'?'Battle Ox':kind==='choice'?'Fissure':'Pot of Greed';
 await click(`[...document.querySelectorAll('#hand .card')].find(e=>e.querySelector('.card-name')?.textContent===${JSON.stringify(rootName)})`);
 await click(textButton('#actions button',kind==='trap'?'Triệu hồi':'Kích hoạt'));await confirm();
 if(kind==='trap')for(const id of f.trapIds){await priority(other);await slot(id);await click(textButton('#actions button','Kích hoạt Bẫy'));await confirm();}
 else{await priority(f.magicOwner);await slot(f.magic);await click(textButton('#actions button','Phản hồi Phép'));await confirm();}
 const used={a:0,b:0};let captured;
 for(const [i,who]of f.owners.entries()){
  await priority(who);await slot(f.sevenIds[who][used[who]++]);const before=await evaluate('JSON.stringify(view)'),length=await evaluate('view.chain.length');
  await click(textButton('#actions button','Phản hồi Bẫy'));
  assert.match(await evaluate(`document.getElementById('action-fields').textContent`),new RegExp('Phản hồi liên kết '+length));
  assert.equal(await evaluate(`document.querySelector('[data-preview="response"] h2').textContent`),i===0?(kind==='trap'?'Trap Hole':'Magic Jammer'):'Seven Tools of the Bandit');
  assert.match(await evaluate(`document.getElementById('action-fields').textContent`),/Trả 1000 LP/);
  if(i===f.owners.length-1){for(const[width,height]of[[1440,1000],[390,844]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});assert.equal(await evaluate(`(()=>{const e=document.getElementById('action-dialog'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1})()`),true);}await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');}
  await click(`document.getElementById('cancel-action')`);assert.equal(await evaluate('JSON.stringify(view)'),before);
  await click(textButton('#actions button','Phản hồi Bẫy'));
  if(i===f.owners.length-1)await evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/command'){window.fetch=original;window.boundedRequest=JSON.parse(args[1].body);const response=await original(...args);window.boundedReceipt=await response.clone().json();return response;}return original(...args);};})()`);
  await confirm();assert.equal(await evaluate('view.chain.length'),length+1);
 }
 assert.equal(await evaluate('view.chain.length'),kind==='choice'?7:8);captured=await evaluate('JSON.stringify(view)');
 assert.deepEqual(await evaluate(`api('/api/command',boundedRequest).then(r=>r.outcome)`),await evaluate('boundedReceipt.outcome'));assert.equal(await evaluate('JSON.stringify(view)'),captured);
 if(kind!=='choice')assert.equal(await evaluate(`view.availableActions.some(a=>a.type==='activate-lp-counter-trap')`),false);
 await click(`document.querySelector('#chain-links li:first-child [data-chain-card="source"]')`);
 assert.match(await evaluate(`document.getElementById('chain-card-detail').textContent`),/tối đa 6 Seven Tools/);await click(`document.getElementById('close-chain-card')`);assert.equal(await evaluate('JSON.stringify(view)'),captured);
 await pass(await evaluate('view.timing.priorityPlayer'));await pass(await evaluate('view.timing.priorityPlayer'));
 const fees=await evaluate('view.players.map(p=>p.lifePoints)');let cleanup=0,rootChoice=0;
 for(let i=0;i<4&&await evaluate('view.chain.length');i++){
  let who,decision;
  for(const p of [actor,other]){await seat(p);await immutable();if(await evaluate('view.decision!==null')){who=p;decision=await evaluate('view.decision');break;}}
  assert.ok(who,'A pending owner must have a private decision');
  await seat(who===actor?other:actor);assert.equal(await evaluate('view.decision'),null);assert.equal(await evaluate('document.querySelectorAll("#decision-form input").length'),0);await immutable();await seat(who);
  const stable=await evaluate('JSON.stringify(view)');
  if(decision.kind==='cleanup-order'){cleanup++;assert.equal(await evaluate('view.chain.every(l=>l.resolved&&l.targetHandles.length===0)'),true);await click(`document.querySelector('#cleanup-order-list li:first-child [data-order-move="1"]')`);assert.equal(await evaluate('JSON.stringify(view)'),stable);}
  else{rootChoice++;assert.equal(kind,'choice');assert.equal(await evaluate('view.chain.slice(1).every(l=>l.resolved&&l.targetHandles.length===0)'),true);await click(`document.querySelector('#decision-form input[type="radio"]')`);}
  assert.equal(await evaluate('JSON.stringify(view)'),stable);const ready=await evaluate('JSON.stringify(view)');await evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/command'){window.fetch=original;window.boundedAnswer=JSON.parse(args[1].body);const response=await original(...args);window.boundedAnswerReceipt=await response.clone().json();return response;}return original(...args);};})()`);
  await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);const after=await evaluate('JSON.stringify(view)');assert.notEqual(after,ready);
  assert.deepEqual(await evaluate(`api('/api/command',boundedAnswer).then(r=>r.outcome)`),await evaluate('boundedAnswerReceipt.outcome'));assert.equal(await evaluate('JSON.stringify(view)'),after);assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),fees);
 }
 assert.equal(rootChoice,kind==='choice'?1:0);assert.equal(cleanup,kind==='trap'?2:1);assert.equal(await evaluate('view.chain.length'),0);assert.equal(await evaluate('view.decision'),null);assert.equal(await evaluate('view.result'),null);
 const facts=await evaluate('view.activity.flatMap(a=>a.resolution||[])');assert.equal(facts.filter(x=>x.kind==='lp-cost').length,f.owners.length);assert.equal(facts.filter(x=>x.kind==='effect-destroyed').length,kind==='spell'?0:1);
 const publicFacts=JSON.stringify(facts);for(const who of [actor,other]){await seat(who);assert.equal(JSON.stringify(await evaluate('view.activity.flatMap(a=>a.resolution||[])')),publicFacts);assert.equal(await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`),saved[who]);await immutable();}
 assert.equal(errors.length,0);console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:defaultRun?'default-chain-'+actor:'bounded-live-'+actor+'-'+kind,explicitV6:!defaultRun,defaultCatalogStillV5:false,...(defaultRun?{defaultV6:true}:{}),actualLinks:kind==='choice'?7:8,payments:f.owners.length,previewCancelReadOnly:true,latestResponsePreview:true,responsiveWidths:[1440,390],privateCleanupOwners:cleanup,rootChoice:rootChoice===1,idempotentReceipts:true,samePublicFactsAcrossSeats:true,savedDecksUnchanged:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
}
