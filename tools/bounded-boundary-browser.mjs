import assert from 'node:assert/strict';
export async function boundedBoundaryBrowser({f,kind,evaluate,seat,click,actionClick,textButton,confirm,pass,errors,browserVersion}){
 const {actor,other}=f,terminal=kind==='draw'||kind==='damage',board=p=>`view.players.find(p=>p.playerId===${JSON.stringify(p)})`,saved={};
 const priority=async who=>{const p=await evaluate('view.timing.priorityPlayer');if(p!==who)await pass(p);await seat(who);};
 const slot=async id=>{const c=f.state.cards[id];await seat(c.ownerId);await click(`document.querySelector('#self .zone-row:nth-child(3) .slot:nth-child(${c.location.slot+1}) .card')`);};
 for(const p of [actor,other]){await seat(p);saved[p]=await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`);}
 await seat(actor);
 if(terminal){await slot(f.root);await actionClick(textButton('#actions button','Kích hoạt'));await priority(f.magicOwner);await slot(f.magic);await click(textButton('#actions button','Phản hồi Phép'));await confirm();}
 else{await click(`[...document.querySelectorAll('#hand .card')].find(e=>e.querySelector('.card-name')?.textContent==='Battle Ox')`);await click(textButton('#actions button','Triệu hồi'));await confirm();await priority(other);await slot(f.trapIds[0]);await click(textButton('#actions button','Kích hoạt Bẫy'));await confirm();}
 const used={a:0,b:0};let unpaid=null;
 for(const [i,who]of f.owners.entries()){
  await priority(who);const id=f.sevenIds[who][used[who]++];await slot(id);const before=await evaluate('JSON.stringify(view)');
  if(i===4&&kind==='blocked'){
   unpaid=await evaluate(`${board(actor)}.lifePoints`);assert.equal(unpaid,actor==='a'?999:1000);assert.equal(await evaluate(`view.availableActions.some(a=>a.type==='activate-lp-counter-trap')`),false);
   const loc=f.state.cards[id].location.slot,r=await evaluate(`api('/api/command',{seat:view.viewerId,commandId:'bounded-unpayable',duelId:view.duelId,expectedStateVersion:view.stateVersion,action:{type:'activate-lp-counter-trap',cardHandle:${board(actor)}.spellsTraps[${loc}].handle,chainHandle:view.chain.at(-1).chainHandle}})`);assert.equal(r.outcome.accepted,false);assert.equal(r.outcome.reason,'unpayable-cost');assert.equal(await evaluate('JSON.stringify(view)'),before);assert.equal(await evaluate(`api('/api/view?seat='+view.viewerId).then(JSON.stringify)`),before);break;
  }
  await click(textButton('#actions button','Phản hồi Bẫy'));if(i===4&&kind==='paid')assert.match(await evaluate(`document.getElementById('action-fields').textContent`),/1001 → 1 LP/);
  await click(`document.getElementById('cancel-action')`);assert.equal(await evaluate('JSON.stringify(view)'),before);await click(textButton('#actions button','Phản hồi Bẫy'));
  if(i===4)await evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/command'){window.fetch=original;window.boundaryRequest=JSON.parse(args[1].body);const response=await original(...args);window.boundaryReceipt=await response.clone().json();return response;}return original(...args);};})()`);
  await confirm();
 }
 const payments=kind==='blocked'?4:5;assert.equal(await evaluate('view.chain.length'),(terminal?2:1)+payments);const paidLP=await evaluate('view.players.map(p=>p.lifePoints)');
 await pass(await evaluate('view.timing.priorityPlayer'));await pass(await evaluate('view.timing.priorityPlayer'));
 for(let i=0;i<3&&await evaluate('view.chain.length');i++){let who;for(const p of [actor,other]){await seat(p);if(await evaluate('view.decision!==null')){who=p;break;}}assert.ok(who);assert.equal(await evaluate('view.decision.kind'),'cleanup-order');await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);}
 assert.equal(await evaluate('view.chain.length'),0);assert.equal(await evaluate('view.decision'),null);
 if(terminal){assert.deepEqual(await evaluate('view.result'),{winner:kind==='draw'?other:actor,reason:kind==='draw'?'failed-draw':'life-points'});assert.equal(await evaluate(`${board(actor)}.spellsTraps.filter(Boolean).length`),4);assert.equal(await evaluate(`view.availableActions.length`),0);}
 else{assert.equal(await evaluate('view.result'),null);assert.equal(await evaluate(`${board(actor)}.lifePoints`),kind==='paid'?1:unpaid);assert.equal(await evaluate(`${board(actor)}.monsters[0]!==null`),kind==='paid');assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),paidLP);}
 if(kind!=='blocked'){const before=await evaluate('JSON.stringify(view)');assert.deepEqual(await evaluate(`api('/api/command',boundaryRequest).then(r=>r.outcome)`),await evaluate('boundaryReceipt.outcome'));assert.equal(await evaluate('JSON.stringify(view)'),before);}
 const facts=await evaluate('view.activity.flatMap(a=>a.resolution||[])');assert.equal(facts.filter(x=>x.kind==='lp-cost').length,payments);const shared=JSON.stringify(facts);
 for(const p of [actor,other]){await seat(p);assert.equal(JSON.stringify(await evaluate('view.activity.flatMap(a=>a.resolution||[])')),shared);assert.equal(await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`),saved[p]);for(const key of ['boundedCounterResolution','sourceAtActivation','integritySha256'])assert.equal((await evaluate('JSON.stringify(view)')).includes(key),false);}
 assert.equal(errors.length,0);console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'bounded-boundary-'+actor+'-'+kind,explicitV6:true,phase:f.state.turn.phase,rootFromSet:terminal,payments,unpayableLP:unpaid,terminalReason:terminal?(kind==='draw'?'failed-draw':'life-points'):null,survivorsRemainOnTerminal:terminal,lateCost1001:kind==='paid',previewCancelReadOnly:true,retryAfterResolution:kind!=='blocked',samePublicFactsAcrossSeats:true,savedDecksUnchanged:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
}
