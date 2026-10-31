import assert from 'node:assert/strict';

// Browser-only audit: observes public views/receipts; never edits server state.
export async function sevenResponseInteractionsBrowser({f,evaluate,seat,click,actionClick,textButton,confirm,pass,errors,browserVersion}) {
  const {actor,other,negateHeal}=f,saved={},timeline=[];
  const board=who=>`view.players.find(p=>p.playerId===${JSON.stringify(who)})`;
  const lp=who=>evaluate(`${board(who)}.lifePoints`);
  const mark=async()=>timeline.push([await lp(actor),await lp(other)]);
  const hand=async(who,name)=>{await seat(who);await click(`[...document.querySelectorAll('#hand .card')].find(e=>e.querySelector('.card-name')?.textContent===${JSON.stringify(name)})`);};
  const slot=async(who,row,n)=>{await seat(who);await click(`document.querySelector('#self .zone-row:nth-child(${row}) .slot:nth-child(${n+1}) .card')`);};
  const grave=who=>evaluate(`${board(who)}.graveyard.map(c=>catalog.get(c.definition.id).name)`);
  const settle=async()=>{for(let n=0;await evaluate(`view.timing.window!=='open'&&!view.result`);n++){assert.ok(n<14);assert.equal(await evaluate('view.decision'),null);await pass(await evaluate('view.timing.priorityPlayer'));}};
  const nextMain=async()=>{const prior=await evaluate('view.turn.number');const advance=async text=>{await seat(await evaluate('view.turn.activePlayer'));await actionClick(textButton('#turn-actions button',text));await settle();};await advance('KẾT THÚC');if(await evaluate('view.turn.number')===prior)await advance('Sang lượt đối thủ');await advance('CHUẨN BỊ');await advance('MAIN 1');};
  const capture=async key=>evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/command'){window.fetch=original;window[${JSON.stringify(key+'Request')}]=JSON.parse(args[1].body);const response=await original(...args);window[${JSON.stringify(key+'Receipt')}]=await response.clone().json();return response;}return original(...args);};})()`);
  const retry=async()=>{await seat(other);const before=await evaluate('JSON.stringify(view)');assert.deepEqual(await evaluate(`api('/api/command',auditSevenRequest).then(r=>r.outcome)`),await evaluate('auditSevenReceipt.outcome'));assert.equal(await evaluate('JSON.stringify(view)'),before);};
  const select=async(name,value)=>evaluate(`(()=>{const e=document.querySelector('#action-fields select[name="${name}"]');e.value=[...e.options].find(o=>label(visibleCard(o.value))===${JSON.stringify(value)}).value;e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  for(const who of [actor,other]){await seat(who);saved[who]=await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`);}
  const initialVersion=await evaluate('view.stateVersion');await mark();
  await evaluate(`(()=>{window.auditActivity=new Map();const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);if(args[0]==='/api/command'){const data=await response.clone().json();for(const entry of data.view.activity||[])window.auditActivity.set(entry.stateVersion,entry);}return response;};})()`);
  const chain=async second=>{
    await hand(actor,'Battle Ox');await click(textButton('#actions button','Triệu hồi'));if(!second)await capture('auditSummon');await confirm();
    await pass(actor);await slot(other,3,second?1:0);await click(textButton('#actions button','Kích hoạt Bẫy'));await confirm();
    const firstOwner=second?actor:other;
    if(await evaluate('view.timing.priorityPlayer')!==firstOwner)await pass(await evaluate('view.timing.priorityPlayer'));
    await slot(firstOwner,3,2);await click(textButton('#actions button','Phản hồi Bẫy'));await confirm();await mark();
    if(await evaluate('view.timing.priorityPlayer')!==other)await pass(await evaluate('view.timing.priorityPlayer'));await seat(other);
    if(second&&negateHeal){
      assert.equal(await lp(other),1);assert.equal(await evaluate(`view.availableActions.some(a=>a.type==='activate-lp-counter-trap')`),false);
      const before=await evaluate('JSON.stringify(view)'),r=await evaluate(`api('/api/command',{seat:view.viewerId,commandId:'low-lp-'+view.stateVersion,duelId:view.duelId,expectedStateVersion:view.stateVersion,action:{type:'activate-lp-counter-trap',cardHandle:${board(other)}.spellsTraps[3].handle,chainHandle:view.chain[1].chainHandle}})`);
      assert.equal(r.outcome.reason,'unpayable-cost');assert.equal(await evaluate('JSON.stringify(view)'),before);
    }else{
      await slot(other,3,second?3:4);const before=await evaluate('JSON.stringify(view)');await click(textButton('#actions button','Phản hồi Bẫy'));
      assert.equal(await evaluate(`document.querySelector('[data-preview="response"] h2').textContent`),'Seven Tools of the Bandit');
      assert.match(await evaluate(`document.getElementById('action-fields').textContent`),/Phản hồi liên kết 2/);
      await click(`document.getElementById('cancel-action')`);assert.equal(await evaluate('JSON.stringify(view)'),before);await click(textButton('#actions button','Phản hồi Bẫy'));
      if(!second)await capture('auditSeven');await confirm();await mark();assert.equal(await evaluate('view.chain.length'),3);assert.equal(await lp(other),1);
    }
    await retry();await pass(await evaluate('view.timing.priorityPlayer'));await pass(await evaluate('view.timing.priorityPlayer'));
    if(!(second&&negateHeal)){
      await seat(other);assert.equal(await evaluate('view.decision.kind'),'cleanup-order');
      await seat(actor);assert.equal(await evaluate('view.decision'),null);assert.equal(await evaluate(`${board(actor)}.monsters[0]`),null);await seat(other);
      const text=await evaluate('JSON.stringify(view)');for(const key of ['trapCounterResolution','lpCosts','sourceAtActivation'])assert.equal(text.includes(key),false);
      if(second){const before=await evaluate('JSON.stringify(view)');const outcome=await evaluate(`api('/api/command',{...auditCleanupRequest,commandId:'stale-cleanup-'+view.stateVersion,expectedStateVersion:view.stateVersion}).then(r=>r.outcome)`);assert.equal(outcome.accepted,false);assert.equal(await evaluate('JSON.stringify(view)'),before);}
      else{await click(`document.querySelector('#cleanup-order-list li:first-child [data-order-move="1"]')`);await capture('auditCleanup');}
      await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
      assert.deepEqual((await grave(other)).slice(-2),second?['Trap Hole','Seven Tools of the Bandit']:['Seven Tools of the Bandit','Trap Hole']);
    }else{assert.equal(await evaluate(`${board(actor)}.monsters[0]!==null`),true);assert.equal(await evaluate(`${board(other)}.spellsTraps[3].position`),'face-down');}
    assert.equal(await evaluate('view.chain.length'),0);assert.equal(await evaluate('view.normalSummonQuota.used'),1);await settle();
  };
  const recover=async second=>{
    await hand(actor,'Monster Reincarnation');await click(textButton('#actions button','Kích hoạt'));await select('discard',second?'Hane-Hane':'Man-Eater Bug');await select('target','Battle Ox');await confirm();
    assert.equal((await grave(actor)).filter(n=>n==='Battle Ox').length,1);await settle();await seat(actor);
    assert.equal(await evaluate(`view.selfHand.some(c=>catalog.get(c.definition.id).name==='Battle Ox')`),true);
  };
  await chain(false);assert.equal(await lp(other),1);await recover(false);
  assert.equal(await evaluate('view.normalSummonQuota.used'),1);await hand(actor,'Battle Ox');assert.equal(await evaluate(`view.availableActions.some(a=>a.type==='normal-summon')`),false);
  await nextMain();assert.equal(await evaluate('view.turn.activePlayer'),other);
  await hand(other,'Dian Keto the Cure Master');await click(textButton('#actions button','Kích hoạt'));await confirm();assert.equal(await lp(other),1);
  if(negateHeal){await slot(actor,3,4);await click(textButton('#actions button','Phản hồi Phép'));await select('discard','Skull Servant');await confirm();}
  await settle();assert.equal(await lp(other),negateHeal?1:1001);await mark();await retry();
  await nextMain();assert.equal(await evaluate('view.turn.activePlayer'),actor);assert.equal(await evaluate('view.turn.number'),5);
  await slot(actor,2,1);await actionClick(textButton('#actions button','Flip Summon'));
  assert.deepEqual(await evaluate(`view.decision.optionIds.map(h=>catalog.get(visibleCard(h).definition.id).name)`),['Monster Reincarnation']);
  await seat(other);assert.equal(await evaluate('view.decision'),null);await seat(actor);
  await click(`document.querySelector('#decision-form input')`);await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);await settle();await seat(actor);
  assert.equal(await evaluate('view.normalSummonQuota.used'),0);
  const before=await evaluate('JSON.stringify(view)'),stale=await evaluate(`api('/api/command',{...auditSummonRequest,commandId:'old-summon-'+view.stateVersion,expectedStateVersion:view.stateVersion}).then(r=>r.outcome)`);
  assert.equal(stale.accepted,false);assert.equal(await evaluate('JSON.stringify(view)'),before);
  await chain(true);if(!negateHeal)await recover(true);
  await retry();await hand(actor,'Ookazi');await click(textButton('#actions button','Kích hoạt'));await confirm();assert.equal(await lp(other),1);assert.equal(await evaluate('view.result'),null);await settle();await mark();await retry();
  assert.deepEqual(await evaluate('view.result'),{winner:actor,reason:'life-points'});assert.equal(await evaluate('view.turn.number'),5);
  const expected=negateHeal?[[8000,2001],[8000,1001],[8000,1],[8000,1],[7000,1],[7000,0]]:[[8000,2001],[8000,1001],[8000,1],[8000,1001],[7000,1001],[7000,1],[7000,0]];assert.deepEqual(timeline,expected);
  const facts=await evaluate('[...auditActivity.values()].sort((a,b)=>a.stateVersion-b.stateVersion).flatMap(a=>a.resolution||[])');
  assert.equal(facts.filter(x=>x.kind==='lp-cost').length,negateHeal?3:4);assert.equal(facts.filter(x=>x.kind==='life-points-gained').length,negateHeal?0:1);
  assert.equal(facts.filter(x=>x.kind==='effect-destroyed').length,negateHeal?1:2);assert.equal(facts.filter(x=>x.kind==='discard-cost').length,2);
  assert.equal(facts.filter(x=>x.kind==='return-to-hand').length,negateHeal?2:3);assert.equal(facts.filter(x=>x.kind==='effect-damage').length,1);
  const publicFacts=JSON.stringify(await evaluate('view.activity.flatMap(a=>a.resolution||[])')),commands=await evaluate('view.stateVersion')-initialVersion;
  assert.equal(await evaluate('view.activity.length'),Math.min(60,commands));
  for(const who of [actor,other]){await seat(who);assert.equal(JSON.stringify(await evaluate('view.activity.flatMap(a=>a.resolution||[])')),publicFacts);assert.equal(await evaluate(`api('/api/deck?seat='+view.viewerId).then(JSON.stringify)`),saved[who]);}
  assert.equal(errors.length,0);
  console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'seven-response-interactions-'+actor+'-'+(negateHeal?'negated':'heal'),catalog:112,
    actualThreeLinkChains:negateHeal?1:2,payments:negateHeal?3:4,lifePointTimeline:timeline,acceptedCommands:commands,finalTurn:5,
    recoveredSameMonster:true,recoveredSpellByFaith:true,newCostsNotRefunded:true,quotaResetAcrossTurns:true,discardDoesNotFlip:true,
    secondCounterBlocked:negateHeal,healNegated:negateHeal,oldSummonHandleRejected:true,oldCleanupRejected:!negateHeal,oldReceiptReadOnly:true,
    laterDamageEndsDuel:true,publicHistoryCollectedBeforeLimit:true,historyLimitReached:commands>60,samePublicFactsAcrossSeats:true,savedDecksUnchanged:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
}
