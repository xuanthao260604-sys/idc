import assert from 'node:assert/strict';

/** Four real UI activations. The fixture only prepared the starting board. */
export async function fourLinkBrowser({f,rootName,kind,evaluate,seat,click,actionClick,textButton,confirm,pass,send,errors,browserVersion}){
  const{actor,other,magicOwner,firstOwner,topOwner}=f,saved={};
  const board=who=>`view.players.find(p=>p.playerId===${JSON.stringify(who)})`;
  const hand=async(who,name)=>{await seat(who);await click(`[...document.querySelectorAll('#hand .card')].find(e=>e.querySelector('.card-name')?.textContent===${JSON.stringify(name)})`);};
  const slot=async(who,n)=>{await seat(who);await click(`document.querySelector('#self .zone-row:nth-child(3) .slot:nth-child(${n+1}) .card')`);};
  const grave=who=>evaluate(`${board(who)}.graveyard.map(c=>catalog.get(c.definition.id).name)`);
  const select=async(name,value)=>evaluate(`(()=>{const e=document.querySelector('#action-fields select[name="${name}"]');e.value=[...e.options].find(o=>label(visibleCard(o.value))===${JSON.stringify(value)}).value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const settle=async()=>{for(let n=0;await evaluate(`view.timing.window!=='open'&&!view.result`);n++){assert.ok(n<14);assert.equal(await evaluate('view.decision'),null);await pass(await evaluate('view.timing.priorityPlayer'));}};
  for(const who of [actor,other]){await seat(who);saved[who]=await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`);}
  const deckCounts=await evaluate('view.players.map(p=>p.deckCount)');
  if(f.fromSet){await hand(actor,rootName);await click(textButton('#actions button','Úp bài'));await confirm();await settle();await slot(actor,0);}
  else await hand(actor,rootName);
  if(f.fromSet&&!f.rootCost&&f.handler!=='target-opposing-attack-to-defense')await actionClick(textButton('#actions button','Kích hoạt'));
  else{await click(textButton('#actions button','Kích hoạt'));if(f.rootCost){await select('discard','Skull Servant');await select('target','Skull Servant');}await confirm();}
  assert.equal(await evaluate('view.chain.length'),1);
  if(await evaluate('view.timing.priorityPlayer')!==magicOwner)await pass(await evaluate('view.timing.priorityPlayer'));
  await slot(magicOwner,2);await click(textButton('#actions button','Phản hồi Phép'));await select('discard','Man-Eater Bug');await confirm();assert.equal(await evaluate('view.chain.length'),2);
  if(await evaluate('view.timing.priorityPlayer')!==firstOwner)await pass(await evaluate('view.timing.priorityPlayer'));
  await slot(firstOwner,4);await click(textButton('#actions button','Phản hồi Bẫy'));await confirm();assert.equal(await evaluate('view.chain.length'),3);
  const afterFirst=await evaluate(`${board(firstOwner)}.lifePoints`);assert.equal(afterFirst,kind==='same'?1001:1);
  if(await evaluate('view.timing.priorityPlayer')!==topOwner)await pass(await evaluate('view.timing.priorityPlayer'));
  await slot(topOwner,3);const before=await evaluate('JSON.stringify(view)');await click(textButton('#actions button','Phản hồi Bẫy'));
  assert.equal(await evaluate(`document.querySelector('[data-preview="response"] h2').textContent`),'Seven Tools of the Bandit');
  assert.match(await evaluate(`document.getElementById('action-fields').textContent`),/Phản hồi liên kết 3/);
  assert.match(await evaluate(`document.getElementById('action-fields').textContent`),/1001 → 1 LP/);
  assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="target"],#action-fields select[name="discard"]').length`),0);
  for(const[width,height]of[[1440,1000],[390,844]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});assert.equal(await evaluate(`(()=>{const e=document.getElementById('action-dialog'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1})()`),true);}
  await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  await click(`document.getElementById('cancel-action')`);assert.equal(await evaluate('JSON.stringify(view)'),before);await click(textButton('#actions button','Phản hồi Bẫy'));
  await evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/command'){window.fetch=original;window.fourRequest=JSON.parse(args[1].body);const response=await original(...args);window.fourReceipt=await response.clone().json();return response;}return original(...args);};})()`);
  await confirm();assert.deepEqual(await evaluate('view.chain.map(l=>l.spellSpeed)'),[1,3,3,3]);assert.equal(await evaluate(`${board(topOwner)}.lifePoints`),1);
  const paid=await evaluate('JSON.stringify(view)');assert.deepEqual(await evaluate(`api('/api/command',fourRequest).then(r=>r.outcome)`),await evaluate('fourReceipt.outcome'));assert.equal(await evaluate('JSON.stringify(view)'),paid);
  assert.equal(await evaluate(`view.availableActions.some(a=>a.type==='activate-lp-counter-trap')`),false);
  await pass(await evaluate('view.timing.priorityPlayer'));await pass(await evaluate('view.timing.priorityPlayer'));
  assert.equal(await evaluate('view.result'),null);assert.deepEqual(await evaluate('view.players.map(p=>p.deckCount)'),deckCounts);
  for(const who of [actor,other]){
    const expected=who===firstOwner?1:0;assert.equal((await grave(who)).filter(n=>n==='Seven Tools of the Bandit').length,expected+(magicOwner!==topOwner&&who===topOwner?1:0));
  }
  assert.equal((await grave(actor)).filter(n=>n===rootName).length,1);
  const ownerCleanup=magicOwner===topOwner;
  if(ownerCleanup){
    await seat(topOwner);assert.equal(await evaluate('view.decision.kind'),'cleanup-order');assert.equal(await evaluate('view.chain[0].resolved'),true);assert.deepEqual(await evaluate('view.chain[0].targetHandles'),[]);assert.equal(await evaluate('view.chain[0].respondingToChainHandle'),undefined);
    const privateText=await evaluate('JSON.stringify(view)');for(const key of ['fourLinkCounterResolution','lpCosts','sourceAtActivation','integritySha256'])assert.equal(privateText.includes(key),false);
    const notOwner=topOwner===actor?other:actor;await seat(notOwner);assert.equal(await evaluate('view.decision'),null);await seat(topOwner);
    if(actor==='a')await click(`document.querySelector('#cleanup-order-list li:first-child [data-order-move="1"]')`);
    await evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/command'){window.fetch=original;window.fourCleanupRequest=JSON.parse(args[1].body);const response=await original(...args);window.fourCleanupReceipt=await response.clone().json();return response;}return original(...args);};})()`);
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.deepEqual((await grave(topOwner)).slice(-2),actor==='a'?['Seven Tools of the Bandit','Magic Jammer']:['Magic Jammer','Seven Tools of the Bandit']);
    const done=await evaluate('JSON.stringify(view)');assert.deepEqual(await evaluate(`api('/api/command',fourCleanupRequest).then(r=>r.outcome)`),await evaluate('fourCleanupReceipt.outcome'));assert.equal(await evaluate('JSON.stringify(view)'),done);
  }else assert.equal(await evaluate('view.decision'),null);
  assert.equal(await evaluate('view.chain.length'),0);assert.equal(await evaluate('view.decision'),null);assert.equal(await evaluate(`${board(topOwner)}.lifePoints`),1);
  // Compare public board identities after returning to the same observer; handles are viewer-bound.
  await seat(other);assert.equal(await evaluate(`${board(other)}.monsters.filter(Boolean).length`),2);
  assert.equal((await grave(magicOwner)).filter(n=>n==='Magic Jammer').length,1);
  if(f.rootCost){assert.equal((await grave(actor)).filter(n=>n==='Skull Servant').length,1);await seat(actor);assert.equal(await evaluate(`view.selfHand.some(c=>catalog.get(c.definition.id).name==='Skull Servant')`),false);}
  const facts=await evaluate('view.activity.flatMap(a=>a.resolution||[])');assert.equal(facts.filter(x=>x.kind==='lp-cost').length,2);assert.equal(facts.filter(x=>x.kind==='discard-cost').length,f.rootCost?2:1);
  assert.equal(facts.filter(x=>x.kind==='trap-activation-negated').length,1);assert.equal(facts.filter(x=>x.kind==='spell-activation-negated').length,1);
  assert.equal(facts.some(x=>['draw','return-to-hand','effect-damage','life-points-gained','effect-destroyed','effect-position-changed'].includes(x.kind)),false);
  const publicFacts=JSON.stringify(facts);
  for(const who of [actor,other]){await seat(who);assert.equal(JSON.stringify(await evaluate('view.activity.flatMap(a=>a.resolution||[])')),publicFacts);assert.equal(await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`),saved[who]);}
  assert.equal(errors.length,0);
  console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'four-link-'+actor+'-'+kind,catalog:112,root:rootName,fromSet:f.fromSet,phase:f.phase,
    actualFourActivations:true,latestSevenPreview:true,cancelReadOnly:true,receiptRetryReadOnly:true,twoPaidLPCosts:true,afterFirstLP:afterFirst,finalTopLP:1,
    firstSevenNegated:true,originalSpellNegated:true,rootEffectsSkipped:true,originalCostsRetained:true,ownerCleanup,noFifthCounter:true,noEffectChoice:true,noDeckOut:true,
    samePublicFactsAcrossSeats:true,responsive:true,savedDecksUnchanged:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
}
