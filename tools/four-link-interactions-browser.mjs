import assert from 'node:assert/strict';

/** Full multi-turn UI flow. Only the initial board comes from a trusted fixture. */
export async function fourLinkInteractionsBrowser({f,evaluate,seat,click,actionClick,textButton,confirm,pass,errors,browserVersion}){
  const{actor,other,magicOwner,negateHeal}=f,saved={},timeline=[];
  const board=who=>`view.players.find(p=>p.playerId===${JSON.stringify(who)})`;
  const lp=who=>evaluate(`${board(who)}.lifePoints`);
  const mark=async()=>timeline.push([await lp(actor),await lp(other)]);
  const hand=async(who,name)=>{await seat(who);await click(`[...document.querySelectorAll('#hand .card')].find(e=>e.querySelector('.card-name')?.textContent===${JSON.stringify(name)})`);};
  const slot=async(who,n)=>{await seat(who);await click(`document.querySelector('#self .zone-row:nth-child(3) .slot:nth-child(${n+1}) .card')`);};
  const select=async(name,value)=>evaluate(`(()=>{const e=document.querySelector('#action-fields select[name="${name}"]');e.value=[...e.options].find(o=>label(visibleCard(o.value))===${JSON.stringify(value)}).value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const grave=who=>evaluate(`${board(who)}.graveyard.map(c=>catalog.get(c.definition.id).name)`);
  const settle=async()=>{for(let n=0;await evaluate(`view.timing.window!=='open'&&!view.result`);n++){assert.ok(n<14);assert.equal(await evaluate('view.decision'),null);await pass(await evaluate('view.timing.priorityPlayer'));}};
  const nextMain=async()=>{const prior=await evaluate('view.turn.number');const advance=async text=>{await seat(await evaluate('view.turn.activePlayer'));await actionClick(textButton('#turn-actions button',text));await settle();};await advance('KẾT THÚC');if(await evaluate('view.turn.number')===prior)await advance('Sang lượt đối thủ');await advance('CHUẨN BỊ');await advance('MAIN 1');};
  const capture=async key=>evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/command'){window.fetch=original;window[${JSON.stringify(key+'Request')}]=JSON.parse(args[1].body);const response=await original(...args);window[${JSON.stringify(key+'Receipt')}]=await response.clone().json();return response;}return original(...args);};})()`);
  const retryTop=async()=>{await seat(other);const before=await evaluate('JSON.stringify(view)'),expected=await evaluate('[view.stateVersion,view.players.map(p=>p.lifePoints),view.chain.length]');
    const response=await evaluate(`api('/api/command',auditFourTopRequest)`);assert.deepEqual(response.outcome,await evaluate('auditFourTopReceipt.outcome'));assert.deepEqual([response.view.stateVersion,response.view.players.map(p=>p.lifePoints),response.view.chain.length],expected);assert.equal(await evaluate('JSON.stringify(view)'),before);
  };
  for(const who of [actor,other]){await seat(who);saved[who]=await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`);}
  const initialVersion=await evaluate('view.stateVersion');await mark();
  await evaluate(`(()=>{window.auditActivity=new Map();const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);if(args[0]==='/api/command'){const data=await response.clone().json();for(const entry of data.view.activity||[])window.auditActivity.set(entry.stateVersion,entry);}return response;};})()`);
  const chainLengths=[];
  const chain=async second=>{
    await hand(actor,'Monster Reincarnation');await click(textButton('#actions button','Kích hoạt'));await select('discard',second?'Skull Servant':'Man-Eater Bug');await select('target','Man-Eater Bug');if(!second)await capture('auditFourRoot');await confirm();
    if(await evaluate('view.timing.priorityPlayer')!==magicOwner)await pass(await evaluate('view.timing.priorityPlayer'));
    await slot(magicOwner,second?1:2);await click(textButton('#actions button','Phản hồi Phép'));await select('discard',second?'Battle Ox':'Hane-Hane');await confirm();
    if(await evaluate('view.timing.priorityPlayer')!==actor)await pass(await evaluate('view.timing.priorityPlayer'));
    await slot(actor,second?3:4);await click(textButton('#actions button','Phản hồi Bẫy'));await confirm();await mark();assert.equal(await lp(actor),1);
    if(await evaluate('view.timing.priorityPlayer')!==other)await pass(await evaluate('view.timing.priorityPlayer'));await seat(other);
    if(second&&negateHeal){
      assert.equal(await evaluate(`view.availableActions.some(a=>a.type==='activate-lp-counter-trap')`),false);const before=await evaluate('JSON.stringify(view)');
      const r=await evaluate(`api('/api/command',{seat:view.viewerId,commandId:'four-low-lp-'+view.stateVersion,duelId:view.duelId,expectedStateVersion:view.stateVersion,action:{type:'activate-lp-counter-trap',cardHandle:${board(other)}.spellsTraps[3].handle,chainHandle:view.chain[2].chainHandle}})`);
      assert.equal(r.outcome.reason,'unpayable-cost');assert.equal(r.view.stateVersion,await evaluate('view.stateVersion'));assert.equal(await evaluate('JSON.stringify(view)'),before);
    }else{
      await slot(other,second?3:4);const before=await evaluate('JSON.stringify(view)');await click(textButton('#actions button','Phản hồi Bẫy'));
      assert.equal(await evaluate(`document.querySelector('[data-preview="response"] h2').textContent`),'Seven Tools of the Bandit');assert.match(await evaluate(`document.getElementById('action-fields').textContent`),/Phản hồi liên kết 3/);
      await click(`document.getElementById('cancel-action')`);assert.equal(await evaluate('JSON.stringify(view)'),before);await click(textButton('#actions button','Phản hồi Bẫy'));if(!second)await capture('auditFourTop');await confirm();await mark();assert.equal(await lp(other),1);
    }
    chainLengths.push(await evaluate('view.chain.length'));await retryTop();
    for(let n=0;await evaluate(`view.timing.window==='chain-response'`);n++){assert.ok(n<3);await pass(await evaluate('view.timing.priorityPlayer'));}
    const owner=second&&negateHeal?actor:(magicOwner===other?other:null);
    if(owner){
      await seat(owner);assert.equal(await evaluate('view.decision.kind'),'cleanup-order');const text=await evaluate('JSON.stringify(view)');for(const key of ['fourLinkCounterResolution','lpCosts','sourceAtActivation','integritySha256'])assert.equal(text.includes(key),false);
      await seat(owner===actor?other:actor);assert.equal(await evaluate('view.decision'),null);await seat(owner);
      if(second&&actor==='a'){
        const before=await evaluate('JSON.stringify(view)'),r=await evaluate(`api('/api/command',{...auditFourCleanupRequest,seat:view.viewerId,commandId:'old-four-cleanup-'+view.stateVersion,expectedStateVersion:view.stateVersion})`);
        assert.equal(r.outcome.accepted,false);assert.equal(r.view.stateVersion,await evaluate('view.stateVersion'));assert.equal(await evaluate('JSON.stringify(view)'),before);
      }
      const reverse=actor==='a'?!second:second;if(reverse)await click(`document.querySelector('#cleanup-order-list li:first-child [data-order-move="1"]')`);
      if(!second)await capture('auditFourCleanup');await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
      const firstName=second&&negateHeal?'Monster Reincarnation':'Magic Jammer';assert.deepEqual((await grave(owner)).slice(-2),reverse?['Seven Tools of the Bandit',firstName]:[firstName,'Seven Tools of the Bandit']);
    }else assert.equal(await evaluate('view.decision'),null);
    assert.equal(await evaluate('view.chain.length'),0);await settle();await seat(actor);
    const returned=second&&negateHeal;assert.equal(await evaluate(`view.selfHand.some(c=>catalog.get(c.definition.id).name==='Man-Eater Bug')`),returned);
    if(!returned)assert.equal((await grave(actor)).filter(n=>n==='Man-Eater Bug').length,1);
    assert.equal(await evaluate('view.result'),null);
  };
  await chain(false);
  await hand(actor,'Dian Keto the Cure Master');await click(textButton('#actions button','Kích hoạt'));await confirm();assert.equal(await lp(actor),1);await settle();await mark();assert.equal(await lp(actor),1001);await retryTop();
  if(negateHeal){await hand(actor,'Magic Jammer');await click(textButton('#actions button','Úp bài'));await confirm();await settle();await seat(actor);assert.equal(await evaluate(`${board(actor)}.spellsTraps[0].position`),'face-down');}
  await hand(actor,'Magician of Faith');await click(textButton('#actions button','Úp quái'));await confirm();await settle();await seat(actor);assert.equal(await evaluate('view.normalSummonQuota.used'),1);assert.equal(await evaluate(`view.availableActions.some(a=>a.type==='flip-summon')`),false);
  await nextMain();assert.equal(await evaluate('view.turn.activePlayer'),other);
  await hand(other,'Dian Keto the Cure Master');await click(textButton('#actions button','Kích hoạt'));await confirm();assert.equal(await lp(other),1);
  if(negateHeal){await slot(actor,0);await click(textButton('#actions button','Phản hồi Phép'));await select('discard','Mystical Elf');await confirm();}
  await settle();await mark();assert.equal(await lp(other),negateHeal?1:1001);await retryTop();
  await nextMain();assert.equal(await evaluate('view.turn.number'),5);await seat(actor);await click(`document.querySelector('#self .zone-row:nth-child(2) .slot:nth-child(1) .card')`);await actionClick(textButton('#actions button','Flip Summon'));
  assert.deepEqual((await evaluate(`view.decision.optionIds.map(h=>catalog.get(visibleCard(h).definition.id).name)`)).sort(),['Dian Keto the Cure Master','Monster Reincarnation']);
  await seat(other);assert.equal(await evaluate('view.decision'),null);await seat(actor);await click(`[...document.querySelectorAll('#decision-form label')].find(e=>e.textContent.includes('Monster Reincarnation')).querySelector('input')`);await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);await settle();await seat(actor);
  assert.equal(await evaluate('view.normalSummonQuota.used'),0);const before=await evaluate('JSON.stringify(view)');
  const stale=await evaluate(`api('/api/command',{...auditFourRootRequest,seat:view.viewerId,commandId:'old-four-root-'+view.stateVersion,expectedStateVersion:view.stateVersion})`);assert.equal(stale.outcome.accepted,false);assert.equal(stale.view.stateVersion,await evaluate('view.stateVersion'));assert.equal(await evaluate('JSON.stringify(view)'),before);
  await chain(true);assert.deepEqual(chainLengths,[4,negateHeal?3:4]);
  await retryTop();await hand(actor,'Ookazi');await click(textButton('#actions button','Kích hoạt'));await confirm();assert.equal(await lp(other),1);assert.equal(await evaluate('view.result'),null);await settle();await mark();await retryTop();
  assert.deepEqual(await evaluate('view.result'),{winner:actor,reason:'life-points'});assert.equal(await evaluate('view.turn.number'),5);
  const expected=negateHeal?[[1001,1001],[1,1001],[1,1],[1001,1],[1001,1],[1,1],[1,0]]:[[1001,1001],[1,1001],[1,1],[1001,1],[1001,1001],[1,1001],[1,1],[1,0]];assert.deepEqual(timeline,expected);
  const facts=await evaluate('[...auditActivity.values()].sort((a,b)=>a.stateVersion-b.stateVersion).flatMap(a=>a.resolution||[])');
  assert.equal(facts.filter(x=>x.kind==='lp-cost').length,negateHeal?3:4);assert.equal(facts.filter(x=>x.kind==='discard-cost').length,negateHeal?5:4);assert.equal(facts.filter(x=>x.kind==='life-points-gained').length,negateHeal?1:2);
  assert.equal(facts.filter(x=>x.kind==='return-to-hand').length,negateHeal?2:1);assert.equal(facts.filter(x=>x.kind==='effect-damage').length,1);
  const publicFacts=JSON.stringify(await evaluate('view.activity.flatMap(a=>a.resolution||[])')),commands=await evaluate('view.stateVersion')-initialVersion;assert.equal(await evaluate('view.activity.length'),Math.min(60,commands));
  for(const who of [actor,other]){await seat(who);assert.equal(JSON.stringify(await evaluate('view.activity.flatMap(a=>a.resolution||[])')),publicFacts);assert.equal(await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`),saved[who]);}
  assert.equal(errors.length,0);
  console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'four-link-interactions-'+actor+'-'+(negateHeal?'negated':'heal'),catalog:112,
    chainLengths,actualFourLinkChains:negateHeal?1:2,payments:negateHeal?3:4,lifePointTimeline:timeline,acceptedCommands:commands,finalTurn:5,
    rootRecoveredByFaith:true,newCostsForReactivation:true,originalCostsNotRefunded:true,healNegated:negateHeal,secondFourthBlocked:negateHeal,firstCostReturnedByEffect:negateHeal,normalSetThenLaterFlip:true,
    healingCounterSetDuringPlay:negateHeal,oldRootRejected:true,oldCleanupRejected:actor==='a',oldReceiptReadOnly:true,backendRetryStateUnchanged:true,publicHistoryCollectedBeforeLimit:true,historyLimitReached:commands>60,
    laterDamageEndsDuel:true,samePublicFactsAcrossSeats:true,savedDecksUnchanged:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
}
