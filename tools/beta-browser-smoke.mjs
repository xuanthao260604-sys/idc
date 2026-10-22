// Optional browser regression check. Requires an installed Chromium, no Playwright dependency.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { resolveBrowser, browserLaunchArgs } from '../dist/tools/browser-executable.js';
import { projectRoot } from '../dist/tools/project-root.js';
import { createBetaServer } from '../dist/tools/beta-server.js';
import { loadRuntimeCatalog } from '../dist/tools/runtime-catalog.js';
import { createRegistry } from '../dist/packages/engine/src/registry.js';
import { createDuel, assertDuelInvariants } from '../dist/packages/engine/src/duel.js';
import { goat200508Format } from '../dist/packages/card-data/src/formats/goat-2005-08-17.js';
const read = async p => JSON.parse(await readFile(join(projectRoot, p), 'utf8'));
const expanded = process.argv.includes('--expanded-catalog') || process.argv.includes('--expanded-duel');
const r = expanded ? loadRuntimeCatalog().registry : createRegistry((await read('data/generated/pilot.json')).cards, goat200508Format, {},
  await read('data/reviews/pilot.spell-effects.json'), await read('data/reviews/pilot.flip-effects.json'), await read('data/reviews/pilot.trap-effects.json'));
const deck = Object.keys(r.cards);
for (const c of Object.values(r.cards)) if (!expanded && c.legality.maxCopies >= 2) deck.push(c.id);
for (const c of Object.values(r.cards)) if (!expanded && deck.length < 40 && c.legality.maxCopies >= 3) deck.push(c.id);
const fullDuel = process.argv.includes('--full-duel') || process.argv.includes('--expanded-duel');
const newGame = process.argv.includes('--new-game');
const discard = process.argv.includes('--discard');
const concede = process.argv.includes('--concede');
const deckBuilder = process.argv.includes('--deck-builder');
const deckOutArg = process.argv.find(arg => /^--deck-out=[012]$/.test(arg));
const deckOut = deckOutArg === undefined ? null : Number(deckOutArg.split('=')[1]);
const s = structuredClone(createDuel(r, { duelId: fullDuel ? 'mixed-smoke' : 'browser-fixture', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: fullDuel ? (expanded ? '03' : '08').padStart(64, '0') : '12'.repeat(32) }).state);
// Trusted fixture setup BEFORE starting the server. No state-edit endpoint, seed flag or test mode in beta CLI.
function move(name, owner, zone, slot = 0, down = false) {
  const d = Object.values(r.cards).find(c => c.name === name), p = s.players.find(p => p.id === owner);
  const c = Object.values(s.cards).find(c => c.ownerId === owner && c.definition.id === d.id && ['hand', 'deck'].includes(c.location.kind));
  const list = c.location.kind === 'hand' ? p.hand : p.deck; list.splice(list.indexOf(c.id), 1);
  if (zone === 'hand') { p.hand.push(c.id); c.location = { kind: 'hand', playerId: owner }; return; }
  (zone === 'monster' ? p.monsters : p.spellsTraps)[slot] = c.id;
  c.location = { kind: zone, playerId: owner, slot }; c.position = down ? zone === 'monster' ? 'face-down-defense' : 'face-down' : 'face-up-attack';
  if (down) c.markers.setOnTurn = 2;
}
if (!fullDuel && !newGame && !discard && !concede && !deckBuilder && !expanded && deckOut === null) {
move('Pot of Greed', 'a', 'hand'); move('Fissure', 'a', 'hand'); move('Battle Ox', 'a', 'hand');
move('La Jinn the Mystical Genie of the Lamp', 'a', 'monster', 0); move('Celtic Guardian', 'a', 'monster', 1);
move('Mystical Elf', 'b', 'monster', 0); move('Hane-Hane', 'b', 'monster', 1, true); move('Man-Eater Bug', 'b', 'monster', 2, true); move('Trap Hole', 'b', 'spell-trap', 0, true); move('Fissure', 'b', 'spell-trap', 1, true);
s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
}
if (expanded && !fullDuel) {
  move('Gaia The Fierce Knight', 'a', 'hand');
  move('Battle Ox', 'a', 'monster', 0); move('Celtic Guardian', 'a', 'monster', 1);
  move('Armored Lizard', 'b', 'monster', 0);
  s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
}
if (discard) {
  while (s.players[0].hand.length < 8) {
    const id = s.players[0].deck.shift(); s.players[0].hand.push(id); s.cards[id].location = { kind: 'hand', playerId: 'a' };
  }
  s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
}
if (deckOut !== null) {
  move('Pot of Greed', 'a', 'hand');
  const p = s.players[0];
  while (p.deck.length > deckOut) {
    const id = p.deck.pop(); p.graveyard.push(id); s.cards[id].location = { kind: 'graveyard', playerId: 'a' }; s.cards[id].position = 'face-up';
  }
  s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
}
assertDuelInvariants(s, r);
const server = createBetaServer(r, undefined, newGame || concede || deckBuilder ? undefined : s), directory = await mkdtemp(join(tmpdir(), 'ygo-browser-'));
let chrome, ws, closeBrowser, browser, dialogAnswer; const nativeDialogs = []; const pending = new Map(), errors = []; let nextId = 0;
const timeout = setTimeout(() => { console.error('Browser regression timed out'); chrome?.kill(); server.closeAllConnections(); process.exit(1); }, fullDuel ? 240000 : 90000);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  browser = resolveBrowser();
  chrome = spawn(browser.path, browserLaunchArgs(process.platform, directory), { stdio: 'ignore', windowsHide: true });
  let launchError; chrome.on('error', e => { launchError = e; });
  let port;
  for (let n = 0; n < 100 && !port; n++) {
    if (launchError) throw launchError;
    try { port = (await readFile(join(directory, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; } catch { await delay(100); }
  }
  if (!port) throw new Error('Chromium DevTools did not start');
  const page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = event => { const m = JSON.parse(event.data); if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text); if (m.method === 'Page.javascriptDialogOpening') { nativeDialogs.push(m.params); if (typeof dialogAnswer === 'boolean') send('Page.handleJavaScriptDialog', { accept: dialogAnswer }).catch(e=>errors.push(e.message)); } if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } };
  function send(method, params = {}) { const id = ++nextId; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); }); }
  closeBrowser = () => send('Browser.close');
  const browserVersion = await send('Browser.getVersion');
  async function evaluate(expression) { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails)); return r.result.value; }
  async function wait(condition) { for (let n = 0; n < 100; n++) { if (await evaluate(condition)) return; await delay(40); } throw new Error(`Browser wait failed: ${condition}`); }
  async function click(expression) {
    const point = await evaluate(`(()=>{const e=(${expression});if(!e || e.disabled)throw new Error('Missing/disabled control');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  }
  const textButton = (scope, text) => `[...document.querySelectorAll(${JSON.stringify(scope)})].find(e=>e.textContent===${JSON.stringify(text)})`;
  async function seat(who) {
    if (await evaluate(`view?.viewerId===${JSON.stringify(who)} && !document.getElementById('seat-dialog').open`)) return;
    if (!(await evaluate(`document.getElementById('seat-dialog').open`))) await click(`document.getElementById('handoff-next').hidden ? document.getElementById('switch') : document.getElementById('handoff-next')`);
    await click(`document.querySelector('[data-seat="${who}"]')`); await wait(`!busy && view?.viewerId===${JSON.stringify(who)} && !document.getElementById('seat-dialog').open`);
  }
  async function actionClick(expression) { const version = await evaluate('view.stateVersion'); await click(expression); await wait(`!busy && view.stateVersion>${version}`); }
  async function pass(who) { await seat(who); await actionClick(`document.getElementById('pass')`); }
  async function hand(name) { await seat('a'); await click(`[...document.querySelectorAll('#hand .card')].find(e=>e.querySelector('.card-name')?.textContent===${JSON.stringify(name)})`); }
  async function confirm() { await actionClick(`document.querySelector('#action-form button[type="submit"]')`); }
  async function chooseTarget(index) { await evaluate(`document.querySelector('#action-fields select[name="target"]').selectedIndex=${index}`); }
  async function decision(name) {
    assert.match(await evaluate(`document.getElementById('guide-title').textContent`), /Bạn cần chọn bài/);
    assert.equal(await evaluate(`document.querySelector('#decision-form input').type`), 'radio');
    assert.match(await evaluate(`document.querySelector('#decision-form').textContent`), /Người chơi A · Quái ô/);
    await click(`[...document.querySelectorAll('#decision-form label')].find(e=>e.textContent.includes(${JSON.stringify(name)})).querySelector('input')`);
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
  }
  async function inspectGraveyard(side, expectedNames) {
    const before = await evaluate('JSON.stringify(view)');
    await click(`document.querySelector('#${side} .zone-info button')`);
    await wait(`document.getElementById('graveyard-dialog').open`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#graveyard-cards .card-name')].map(e=>e.textContent)`), expectedNames);
    if (!expectedNames.length) assert.match(await evaluate(`document.getElementById('graveyard-detail').textContent`), /Mộ đang trống/);
    for (let i = 0; i < expectedNames.length; i++) {
      await click(`document.querySelectorAll('#graveyard-cards .card')[${i}]`);
      const definition = Object.values(r.cards).find(c=>c.name===expectedNames[i]);
      assert.equal(await evaluate(`document.querySelector('#graveyard-detail h2').textContent`), definition.name);
      assert.equal(await evaluate(`document.querySelector('#graveyard-detail p').textContent`), definition.text);
      assert.equal(await evaluate(`document.querySelectorAll('#graveyard-detail button').length`), 0);
    }
    await click(`document.getElementById('close-graveyard')`);
    assert.equal(await evaluate(`document.getElementById('graveyard-dialog').open`), false);
    assert.equal(await evaluate('JSON.stringify(view)'), before);
  }
  async function playNaturalDuel() {
    // Policy reads only the active PlayerView/catalog, never the server state or deck order.
    let currentTurn = 0, normalUsed = false, attacked = new Set();
    const monsterSets = { a: {}, b: {} }, trapSets = { a: {}, b: {} };
    let lastSummon = null;
    const usedEffects = new Set(); let actions = 0, decisions = 0, attacks = 0;
    const snapshot = () => evaluate('view');
    const definition = card => card?.visibility === 'known' ? r.cards[card.definition.id] : null;
    const boardCard = slot => `document.querySelector('#self .zone-row:nth-child(2) .slot:nth-child(${slot + 1}) .card')`;
    async function handAction(index, text, slot, tributeHandles = []) {
      await click(`document.querySelectorAll('#hand .card')[${index}]`);
      await click(textButton('#actions button', text));
      await evaluate(`document.querySelector('#action-fields select[name="slot"]').value=${JSON.stringify(String(slot))}`);
      for (const handle of tributeHandles) await click(`[...document.querySelectorAll('#action-fields input')].find(e=>e.value===${JSON.stringify(handle)})`);
      await confirm();
    }
    async function advance(phase) { await actionClick(textButton('#turn-actions button', phase)); }
    while (true) {
      let v = await snapshot();
      if (v.result) {
        assert.equal(v.result.reason, 'life-points'); assert.ok(attacks > 0); assert.ok(decisions > 0);
        assert.equal(errors.length, 0); assert.equal(v.chain.length, 0); assert.equal(v.decision, null);
        assert.match(await evaluate(`document.getElementById('timing').textContent`), /thắng/);
        assert.equal(v.stateVersion, actions);
        assert.match(await evaluate(`document.getElementById('guide-title').textContent`), /thắng/);
        assert.equal(await evaluate(`document.getElementById('concede').disabled`), true);
        assert.equal(v.activity.length, Math.min(actions,60));
        assert.ok(v.activity.some(e=>e.resolution?.some(f=>f.kind==='battle-damage')));
        assert.match(await evaluate(`document.getElementById('activity').textContent`), /sát thương chiến đấu/);
        for(const entry of v.activity) assert.deepEqual(Object.keys(entry).filter(k=>k!=='resolution').sort(), ['action','actorId','phase','stateVersion','turn']);
        console.log(JSON.stringify({ browser: browser.brand, browserVersion: browserVersion.product, platform: process.platform, mode: expanded ? 'natural-expanded-duel' : 'natural-full-duel', catalogDefinitions: Object.keys(r.cards).length, openingHands: [6, 5],
          turns: v.turn.number, acceptedCommands: actions, attacks, decisions, effectsUsed: [...usedEffects].sort(),
          result: v.result, lifePoints: v.players.map(p=>p.lifePoints), stateEditedDuringPlay: false, runtimeExceptions: errors.length }));
        break;
      }
      if (actions > 2500 || v.turn.number > 100) throw new Error('Natural browser duel exceeded limit');
      if (v.turn.number !== currentTurn) { currentTurn = v.turn.number; normalUsed = false; attacked = new Set(); }
      if (v.decision || v.timing.priorityPlayer === null) {
        if (!v.decision) { await seat(v.viewerId === 'a' ? 'b' : 'a'); v = await snapshot(); }
        assert.ok(v.decision, 'A mandatory decision must be visible to its player');
        for (let i = 0; i < v.decision.min; i++) await click(`document.querySelectorAll('#decision-form input')[${i}]`);
        await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
        const afterChoice = await snapshot();
        const source = afterChoice.chain[0]?.sourceHandle;
        const sourceCard = afterChoice.players.flatMap(p=>[...p.monsters,...p.spellsTraps]).find(c=>c?.handle===source);
        if (sourceCard && definition(sourceCard)) usedEffects.add(definition(sourceCard).name);
        actions++; decisions++; continue;
      }
      if (v.timing.window !== 'open') {
        await seat(v.timing.priorityPlayer); v = await snapshot();
        const own = v.players.find(p=>p.playerId===v.viewerId), opp = v.players.find(p=>p.playerId!==v.viewerId);
        const target = lastSummon && opp.playerId === lastSummon.player ? opp.monsters[lastSummon.slot] : null;
        const d = definition(target);
        const trapSlot = own.spellsTraps.findIndex((c,i)=>c?.position==='face-down' && definition(c)?.kind==='trap' && trapSets[v.viewerId][i] < v.turn.number);
        if (trapSlot >= 0 && d?.attack >= 1000 && target.position !== 'face-down-defense'
          && (v.timing.window === 'summon-response' || (v.timing.window === 'chain-response' && v.chain.every(l=>l.spellSpeed===2)))) {
          await click(`document.querySelector('#self .zone-row:nth-child(3) .slot:nth-child(${trapSlot+1}) .card')`);
          await click(textButton('#actions button', 'Kích hoạt Bẫy'));
          const targetIndex = opp.monsters.slice(0, lastSummon.slot).filter(Boolean).length;
          await chooseTarget(targetIndex); await confirm(); usedEffects.add('Trap Hole');
        } else await actionClick(`document.getElementById('pass')`);
        actions++; continue;
      }
      await seat(v.turn.activePlayer); v = await snapshot();
      if (v.decision) continue; // End Phase discard may be private to the newly selected player.
      const own = v.players.find(p=>p.playerId===v.viewerId), opp = v.players.find(p=>p.playerId!==v.viewerId);
      if (v.turn.phase === 'draw') { await advance('CHUẨN BỊ'); actions++; continue; }
      if (v.turn.phase === 'standby') { await advance('MAIN 1'); actions++; continue; }
      if (['main1', 'main2'].includes(v.turn.phase)) {
        lastSummon = null;
        const free = own.spellsTraps.indexOf(null);
        const spell = free >= 0 ? v.selfHand.findIndex(c=>definition(c)?.kind==='spell'
          && (r.spellHandlers[c.definition.id].handler==='draw' || opp.monsters.some(c=>c && c.visibility==='known' && c.position!=='face-down-defense'))) : -1;
        if (spell >= 0) { const name=definition(v.selfHand[spell]).name; await handAction(spell,'Kích hoạt',free); actions++; usedEffects.add(name); continue; }
        const trap = free >= 0 ? v.selfHand.findIndex(c=>definition(c)?.kind==='trap') : -1;
        if (trap >= 0) { trapSets[v.viewerId][free]=v.turn.number; await handAction(trap,'Úp bài',free); actions++; continue; }
        const flip = own.monsters.findIndex((c,i)=>c?.position==='face-down-defense' && monsterSets[v.viewerId][i] < v.turn.number);
        if (flip >= 0) { const name=definition(own.monsters[flip]).name; await click(boardCard(flip)); await actionClick(textButton('#actions button','Flip Summon')); usedEffects.add(name); actions++; continue; }
        if (!normalUsed) {
          const board=own.monsters.filter(Boolean);
          const choices=v.selfHand.flatMap((c,index)=>{
            const d=definition(c); if (!d?.level) return [];
            const count=d.level>=7?2:d.level>=5?1:0;
            return count<=board.length && (count>0 || own.monsters.includes(null)) ? [{index,count,score:r.flipHandlers[d.id]?10000:d.attack}] : [];
          }).sort((a,b)=>b.score-a.score);
          const choice=choices[0];
          if(choice){
            const tributeHandles=board.slice(0,choice.count).map(c=>c.handle);
            const slot=own.monsters.findIndex(c=>!c||tributeHandles.includes(c.handle));
            const d=definition(v.selfHand[choice.index]), set=!!r.flipHandlers[d.id];
            if(set)monsterSets[v.viewerId][slot]=v.turn.number;
            await handAction(choice.index,set?'Úp quái':'Triệu hồi',slot,tributeHandles);
            normalUsed=true; lastSummon=set?null:{player:v.viewerId,slot}; actions++; continue;
          }
        }
        await advance(v.turn.phase==='main1'&&v.turn.number>1?'CHIẾN ĐẤU':'KẾT THÚC'); actions++; continue;
      }
      if(v.turn.phase==='battle'){
        const slot=own.monsters.findIndex((c,i)=>c?.position==='face-up-attack'&&!attacked.has(i));
        if(slot>=0){
          const target=opp.monsters.find(c=>c);
          // Look only at presence of an opposing Set card; never inspect its identity/stats.
          // Hidden target identity is learned only after the engine publicly flips it.
          await click(boardCard(slot)); await click(textButton('#actions button','Tấn công')); await chooseTarget(0); await confirm();
          attacked.add(slot); attacks++; actions++; continue;
        }
        await advance('MAIN 2'); actions++; continue;
      }
      await advance('Sang lượt đối thủ'); actions++;
    }
  }
  await send('Runtime.enable'); await send('Page.enable'); await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
  await wait(`document.getElementById('seat-dialog')?.open`); await seat('a');
  if (expanded && !fullDuel) {
    assert.equal(await evaluate('catalog.size'), 80);
    assert.match(await evaluate(`document.getElementById('catalog-count').textContent`), /80/);
    await click(`document.getElementById('deck-builder')`); await wait(`!busy && document.getElementById('deck-dialog').open`);
    const added = Object.values(r.cards);
    for (const card of added) {
      await click(`document.querySelector('#deck-catalog [data-card-id="${card.id}"] .deck-name')`);
      assert.equal(await evaluate(`document.querySelector('#deck-preview h2').textContent`), card.name);
      assert.equal(await evaluate(`document.querySelector('#deck-preview p').textContent`), card.text);
      assert.equal(await evaluate(`document.querySelectorAll('#deck-preview .card-star').length`), card.level || 0);
      assert.equal(await evaluate(`document.querySelector('#deck-preview .card-name').textContent`), card.name);
      assert.equal(await evaluate(`document.querySelector('#deck-preview .card-description').textContent`), card.text);
      const kind=card.kind==='spell'?'spell':card.kind==='trap'?'trap':'monster';
      assert.equal(await evaluate(`document.querySelector('#deck-preview .card-preview').classList.contains(${JSON.stringify(kind)})`),true);
      if(card.level) {
        assert.equal(await evaluate(`document.querySelector('#deck-preview .card-stats').textContent`),`ATK/${card.attack}  DEF/${card.defense}`);
        assert.equal(await evaluate(`document.querySelector('#deck-preview .card-attribute').textContent`),card.attribute);
        assert.equal(await evaluate(`(()=>{const e=document.querySelector('#deck-preview .card-attribute');return getComputedStyle(e).whiteSpace==='nowrap' && e.scrollWidth<=e.clientWidth+1})()`),true);
      }
      if(process.argv.includes('--screenshots') && ['Blue-Eyes White Dragon','Pot of Greed','Trap Hole','Skull Servant','Launcher Spider','Winged Dragon, Guardian of the Fortress #1','King of Yamimakai','Armored Zombie','Armored Starfish','Giga-Tech Wolf'].includes(card.name)) {
        const directory=join(projectRoot,'artifacts','card-fronts');await mkdir(directory,{recursive:true});
        for(const [label,width,height] of [['desktop',1440,1000],['narrow',390,844]]) {
          await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
          await evaluate(`document.querySelector('#deck-preview .card-preview').scrollIntoView({block:'center'})`);
          const capture=await send('Page.captureScreenshot',{format:'png'});
          await writeFile(join(directory,kind+'-'+card.id.split(':')[1]+'-'+label+'.png'),Buffer.from(capture.data,'base64'));
        }
        await send('Emulation.clearDeviceMetricsOverride');
      }
    }
    await click(`document.getElementById('deck-close')`);
    await hand('Gaia The Fierce Knight'); await click(textButton('#actions button', 'Triệu hồi'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields input[type="checkbox"]').length`), 2);
    await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[0]`);
    await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[1]`);
    await confirm(); await pass('a'); await pass('b'); await seat('a');
    assert.equal(await evaluate('view.players[0].graveyard.length'), 2);
    await actionClick(textButton('#turn-actions button', 'CHIẾN ĐẤU')); await pass('b'); await seat('a');
    await click(`document.querySelector('#self .zone-row:nth-child(2) .card')`);
    await click(textButton('#actions button', 'Tấn công')); await chooseTarget(0); await confirm(); await pass('a'); await pass('b');
    assert.equal(await evaluate('view.players[1].lifePoints'), 7200);
    assert.equal(await evaluate(`view.players[1].graveyard.some(c=>catalog.get(c.definition.id).name==='Armored Lizard')`), true);
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'expanded-catalog', catalog: 80, reviewedCardPreviews: 80, dataDrivenLevels: true, tributeSummon: 'Gaia The Fierce Knight', battleTarget: 'Armored Lizard', battleDamage: 800, fixtureOnlyAtSetup: true, runtimeExceptions: errors.length }));
  } else if (deckBuilder) {
    const openDeck = async () => { await click(`document.getElementById('deck-builder')`); await wait(`!busy && document.getElementById('deck-dialog').open`); };
    const change = (id, direction) => click(`document.querySelector('#deck-catalog [data-card-id="${id}"] [data-change="${direction}"]')`);
    const saveDeck = async () => { await click(`document.getElementById('deck-save')`); await wait(`!busy && !document.getElementById('deck-dialog').open`); };
    const before = await evaluate('JSON.stringify(view)');
    await openDeck();
    assert.equal(await evaluate('deckDraft.cards.length'), 40);
    assert.equal(await evaluate(`document.querySelector('#deck-catalog [data-card-id="official:55144522"] [data-change="add"]').disabled`), true);
    await change('official:05053103', 'remove');
    assert.equal(await evaluate(`document.getElementById('deck-save').disabled`), true);
    assert.match(await evaluate(`document.getElementById('deck-issues').textContent`), /còn thiếu 1/);
    await change('official:05053103', 'add');
    await change('official:89631139', 'add');
    assert.equal(await evaluate(`document.querySelector('#deck-catalog [data-card-id="official:89631139"] [data-change="add"]').disabled`), true);
    await click(`document.querySelector('#deck-catalog [data-card-id="official:89631139"] .deck-name')`);
    assert.equal(await evaluate(`document.querySelector('#deck-preview h2').textContent`), 'Blue-Eyes White Dragon');
    assert.equal(await evaluate(`document.querySelector('#deck-preview p').textContent`), r.cards['official:89631139'].text);
    if (process.argv.includes('--screenshots')) {
      const screenshots = join(projectRoot, 'artifacts', 'deck-builder'); await mkdir(screenshots, { recursive: true });
      for (const [label, width, height] of [['desktop', 1440, 1000], ['narrow', 390, 844]]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        assert.equal(await evaluate(`(()=>{const d=document.getElementById('deck-dialog'),r=d.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && d.scrollWidth<=d.clientWidth+1})()`), true);
        const capture = await send('Page.captureScreenshot', { format: 'png' });
        await writeFile(join(screenshots, label+'.png'), Buffer.from(capture.data,'base64'));
      }
      await send('Emulation.clearDeviceMetricsOverride');
    }

    await send('Network.enable');
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await click(`document.getElementById('deck-save')`);
    await wait(`!busy && document.getElementById('deck-error').textContent.length>0`);
    assert.equal(await evaluate(`document.getElementById('deck-dialog').open`), true);
    assert.equal(await evaluate('deckDraft.cards.length'), 41);
    await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    assert.equal(await evaluate(`(async()=> (await api('/api/deck')).cards.length)()`), 40);
    await saveDeck(); assert.equal(await evaluate('JSON.stringify(view)'), before);
    await openDeck(); assert.equal(await evaluate('deckDraft.cards.length'), 41);
    await change('official:05053103', 'remove');
    await click(`document.getElementById('deck-close')`);
    await openDeck(); assert.equal(await evaluate('deckDraft.cards.length'), 41);
    await evaluate(`document.getElementById('deck-search').value='not a real card name'; document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    assert.match(await evaluate(`document.getElementById('deck-catalog').textContent`), /Không có lá phù hợp/);
    await click(`document.getElementById('deck-search')`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await wait('!busy'); assert.equal(await evaluate(`document.getElementById('deck-dialog').open`), true);

    await evaluate(`document.getElementById('deck-search').value=''; document.getElementById('deck-kind').value='spell'; document.getElementById('deck-kind').dispatchEvent(new Event('change'))`);
    assert.equal(await evaluate(`document.querySelectorAll('#deck-catalog .deck-row').length`), 2);
    await click(`document.getElementById('deck-close')`);
    await seat('b'); await openDeck(); assert.equal(await evaluate('deckDraft.cards.length'), 40);
    await change('official:97590747', 'add'); await change('official:05053103', 'add'); await saveDeck();
    const oldId = await evaluate('view.duelId');
    await click(`document.getElementById('reset')`); await click(`document.querySelector('#new-game-form input[value="a"]')`);
    await click(`document.querySelector('#new-game-form button[type="submit"]')`);
    await wait(`!busy && view.duelId!==${JSON.stringify(oldId)} && !document.getElementById('new-game-dialog').open`);
    assert.equal(await evaluate('view.players[0].deckCount + view.opponentHandCount'), 41);
    assert.equal(await evaluate('view.players[1].deckCount + view.selfHand.length'), 42);
    await seat('a'); await openDeck(); assert.equal(await evaluate('deckDraft.cards.length'), 41);
    await click(`document.getElementById('deck-close')`);
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'deck-builder', decks: [41,42], invalidSizeBlocked: true, copyLimits: true, cancelPreservesSaved: true, networkErrorPreservesDraft: true, savePreservesDuel: true, appliedOnNewDuel: true, runtimeExceptions: errors.length }));
  } else if (concede) {
    const before = await evaluate('JSON.stringify(view)');
    dialogAnswer = false; await click(`document.getElementById('concede')`);
    assert.equal(nativeDialogs.length, 1); assert.equal(nativeDialogs[0].type, 'confirm');
    assert.equal(await evaluate('JSON.stringify(view)'), before);
    dialogAnswer = true; await actionClick(`document.getElementById('concede')`);
    assert.deepEqual(await evaluate('view.result'), { winner: 'b', reason: 'concession' });
    assert.match(await evaluate(`document.getElementById('guide-text').textContent`), /đầu hàng/);
    assert.deepEqual(await evaluate('view.availableActions'), []);
    await seat('b'); assert.equal(await evaluate('view.result.reason'), 'concession');
    const oldId = await evaluate('view.duelId');
    await click(`document.getElementById('reset')`);
    await click(`document.querySelector('#new-game-form input[value="b"]')`);
    await click(`document.querySelector('#new-game-form button[type="submit"]')`);
    await wait(`!busy && view.duelId!==${JSON.stringify(oldId)} && !document.getElementById('new-game-dialog').open`);
    assert.equal(await evaluate('view.result'), null);
    assert.equal(await evaluate('view.activity.length'), 0);
    assert.equal(await evaluate('view.turn.activePlayer'), 'b');
    assert.equal(await evaluate('view.selfHand.length'), 6);
    assert.equal(await evaluate('view.players.every(p=>p.lifePoints===8000)'), true);
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'concede', cancelledWithoutChanges: true, winner: 'b', freshDuelAfterFinish: true, runtimeExceptions: errors.length }));
  } else if (deckOut !== null) {
    const before = await evaluate('view.selfHand.length');
    await hand('Pot of Greed'); await click(textButton('#actions button', 'Kích hoạt')); await confirm();
    await pass('b'); await pass('a');
    assert.equal(await evaluate('view.selfHand.length'), before - 1 + deckOut);
    assert.equal(await evaluate('view.players[0].deckCount'), 0);
    assert.equal(await evaluate(`view.players[0].graveyard.some(c=>catalog.get(c.definition.id).name==='Pot of Greed')`), true);
    const facts = await evaluate('view.activity.at(-1).resolution || []');
    assert.equal(facts.filter(f=>f.kind==='draw').reduce((n,f)=>n+f.count,0), deckOut);
    if (deckOut < 2) {
      assert.deepEqual(await evaluate('view.result'), { winner: 'b', reason: 'failed-draw' });
      assert.match(await evaluate(`document.getElementById('guide-text').textContent`), /không thể bốc đủ bài/);
      assert.equal(await evaluate(`document.getElementById('pass').disabled`), true);
      assert.equal(await evaluate(`document.getElementById('concede').disabled`), true);
      assert.equal(await evaluate(`document.querySelectorAll('#turn-actions button').length`), 0);
      assert.deepEqual(await evaluate('view.availableActions'), []);
      await seat('b'); assert.equal(await evaluate('view.result.reason'), 'failed-draw');
    } else {
      assert.equal(await evaluate('view.result'), null);
      assert.match(await evaluate(`document.getElementById('status').textContent`), /bốc 2 lá/);
    }
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'pot-deck-out', remainingBefore: deckOut, actualDraws: deckOut, result: await evaluate('view.result'), runtimeExceptions: errors.length }));
  } else if (discard) {
    await actionClick(textButton('#turn-actions button', 'KẾT THÚC')); await pass('b');
    assert.equal(await evaluate('view.decision'), null);
    assert.equal(await evaluate('view.timing.priorityPlayer'), null);
    assert.match(await evaluate(`document.getElementById('guide-title').textContent`), /đang chọn bài/);
    assert.equal(await evaluate(`document.getElementById('pass').disabled`), true);
    assert.equal(await evaluate(`document.getElementById('decision-panel').hidden`), true);
    await seat('a');
    assert.equal(await evaluate('view.decision.kind'), 'discard');
    assert.equal(await evaluate('view.decision.min'), 2);
    assert.equal(await evaluate(`document.querySelector('#decision-form input').type`), 'checkbox');
    const disabled = () => evaluate(`document.querySelector('#decision-form button[type="submit"]').disabled`);
    assert.equal(await disabled(), true);
    await click(`document.querySelectorAll('#decision-form input')[0]`); assert.equal(await disabled(), true);
    await click(`document.querySelectorAll('#decision-form input')[1]`); assert.equal(await disabled(), false);
    await click(`document.querySelectorAll('#decision-form input')[2]`); assert.equal(await disabled(), true);
    await click(`document.querySelectorAll('#decision-form input')[2]`);
    assert.match(await evaluate(`document.getElementById('decision-progress').textContent`), /2\/2/);
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.equal(await evaluate('view.selfHand.length'), 6);
    assert.equal(await evaluate('view.players[0].graveyard.length'), 2);
    assert.equal(await evaluate('view.decision'), null);
    await pass('a'); await pass('b'); await seat('a');
    await actionClick(textButton('#turn-actions button', 'Sang lượt đối thủ')); await pass('b');
    assert.equal(await evaluate('view.turn.activePlayer'), 'b');
    assert.equal(await evaluate('view.turn.number'), 2);
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'discard', handAfterDiscard: 6, discarded: 2, nextPlayer: 'b', runtimeExceptions: errors.length }));
  } else if (newGame) {
    const before = await evaluate('JSON.stringify(view)');
    await click(`document.getElementById('reset')`);
    await wait(`document.getElementById('new-game-dialog').open`);
    await click(`document.getElementById('cancel-new-game')`);
    assert.equal(await evaluate('JSON.stringify(view)'), before);
    for (const first of ['b', 'a', 'random']) {
      const oldId = await evaluate('view.duelId');
      await click(`document.getElementById('reset')`);
      await click(`document.querySelector('#new-game-form input[value="${first}"]')`);
      await click(`document.querySelector('#new-game-form button[type="submit"]')`);
      await wait(`!busy && view.duelId!==${JSON.stringify(oldId)} && !document.getElementById('new-game-dialog').open`);
      const active = await evaluate('view.turn.activePlayer');
      assert.ok(['a', 'b'].includes(active));
      if (first !== 'random') assert.equal(active, first);
      for (const who of ['a', 'b']) {
        await seat(who);
        assert.equal(await evaluate('view.selfHand.length'), who === active ? 6 : 5);
        assert.equal(await evaluate('view.stateVersion'), 0);
        assert.equal(await evaluate('view.activity.length'), 0);
        assert.equal(await evaluate('view.players.every(p=>p.lifePoints===8000 && p.monsters.every(c=>c===null) && p.spellsTraps.every(c=>c===null))'), true);
      }
    }
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ browser: browser.brand, browserVersion: browserVersion.product, platform: process.platform, newGame: ['cancel-preserves-view', 'b', 'a', 'random'], runtimeExceptions: errors.length }));
  } else if (fullDuel) {
    assert.equal(await evaluate('view.selfHand.length'), 6);
    await seat('b'); assert.equal(await evaluate('view.selfHand.length'), 5); await seat('a');
    await playNaturalDuel();
  } else {
  assert.equal(await evaluate(`['Hane-Hane','Man-Eater Bug','Trap Hole'].some(name=>document.getElementById('opponent').textContent.includes(name))`), false);
  await inspectGraveyard('opponent', []);
  // Known fixture includes concealed monsters, a Spell and a Trap; all use the same back.
  assert.equal(await evaluate(`document.querySelectorAll('#opponent .card.back').length`), 4);
  assert.equal(await evaluate(`new Set([...document.querySelectorAll('#opponent .card.back')].map(b=>getComputedStyle(b.querySelector('.card-back-art')).backgroundImage)).size`), 1);
  assert.equal(await evaluate(`[...document.querySelectorAll('#opponent .card.back')].every(b=>b.textContent==='' && !b.classList.contains('spell') && !b.classList.contains('trap') && b.getAttribute('aria-label').startsWith('Bài úp'))`), true);
  assert.equal(await evaluate(`new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img.naturalWidth===1470 && img.naturalHeight===1070);img.onerror=()=>resolve(false);img.src='/assets/card-frames/monster-and-back.png';})`), true);
  if (process.argv.includes('--screenshots')) {
    const directory=join(projectRoot,'artifacts','shared-card-back'); await mkdir(directory,{recursive:true});
    for(const [label,width,height] of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      const capture=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(join(directory,label+'.png'),Buffer.from(capture.data,'base64'));
    }
    await send('Emulation.clearDeviceMetricsOverride');
  }
  const before = await evaluate('view.selfHand.length');
  await hand('Pot of Greed'); await click(textButton('#actions button', 'Kích hoạt')); await confirm(); await pass('b'); await pass('a');
  assert.equal(await evaluate('view.selfHand.length'), before + 1);
  assert.match(await evaluate(`document.getElementById('status').textContent`), /Người chơi A bốc 2 lá/);
  await inspectGraveyard('self', ['Pot of Greed']);
  await hand('Fissure');
  assert.equal(await evaluate(`[...document.querySelectorAll('#actions button')].find(e=>e.textContent==='Kích hoạt').disabled`), true);
  await pass('a'); await pass('b');
  await hand('Fissure'); await click(textButton('#actions button', 'Kích hoạt')); await confirm(); await pass('b'); await pass('a');
  assert.equal(await evaluate(`view.players[1].monsters[0]`), null);
  await inspectGraveyard('self', ['Fissure', 'Pot of Greed']);
  await inspectGraveyard('opponent', ['Mystical Elf']);
  await pass('a'); await pass('b');
  await hand('Battle Ox'); await click(textButton('#actions button', 'Triệu hồi'));
  assert.equal(await evaluate(`[...document.querySelector('#action-fields select').options].slice(0,2).every(o=>o.disabled)`), true);
  await confirm(); await pass('a'); await seat('b');
  await click(`document.querySelector('#self .zone-row:nth-child(3) .card')`);
  await click(textButton('#actions button', 'Kích hoạt Bẫy'));
  assert.equal(await evaluate(`[...document.querySelector('#action-fields select').options].filter(o=>!o.disabled).length`), 1);
  await chooseTarget(2); await confirm(); await pass('a'); await pass('b');
  assert.equal(await evaluate('view.players[0].monsters[2]'), null);
  assert.match(await evaluate(`document.getElementById('status').textContent`), /1 quái bị phá bởi hiệu ứng/);
  await seat('a'); await pass('a'); await pass('b'); await seat('a');
  await actionClick(textButton('#turn-actions button', 'CHIẾN ĐẤU')); await pass('b');
  for (const [attacker, slot, flipped] of [['La Jinn the Mystical Genie of the Lamp', 0, 'Hane-Hane'], ['Celtic Guardian', 0, 'Man-Eater Bug']]) {
    await seat('a'); await click(`[...document.querySelectorAll('#self .card')].find(e=>e.querySelector('.card-name')?.textContent===${JSON.stringify(attacker)})`);
    await click(textButton('#actions button', 'Tấn công')); await chooseTarget(slot); await confirm(); await pass('a'); await pass('b');
    await seat('b'); await decision(attacker); await pass('a'); await pass('b');
    assert.ok(await evaluate(`view.players[1].graveyard.some(c=>catalog.get(c.definition.id).name===${JSON.stringify(flipped)})`));
    assert.match(await evaluate(`document.getElementById('status').textContent`), flipped === 'Hane-Hane' ? /1 lá trở về tay Người chơi A/ : /1 quái bị phá bởi hiệu ứng/);
  }
  await seat('a'); assert.ok(await evaluate(`view.selfHand.some(c=>catalog.get(c.definition.id).name==='La Jinn the Mystical Genie of the Lamp')`));
  assert.equal(await evaluate('view.players[0].monsters.filter(Boolean).length'), 0);
  assert.equal(await evaluate(`['Pot of Greed','Hane-Hane','Man-Eater Bug','Trap Hole','Fissure'].some(name=>document.getElementById('activity').textContent.includes(name))`), false);
  assert.equal(errors.length, 0);
  console.log(JSON.stringify({ browser: browser.brand, browserVersion: browserVersion.product, platform: process.platform, fixtureOnlyAtSetup: true, sharedBack: ['monster', 'spell', 'trap'], effectFlows: ['Pot of Greed', 'Fissure', 'Trap Hole', 'Hane-Hane', 'Man-Eater Bug'], interaction: 'mouse controls and dialogs', graveyard: ['empty', 'inline card text', 'top-first order', 'read-only both players'], runtimeExceptions: errors.length }));
  }

} finally {
  clearTimeout(timeout);
  if (closeBrowser && ws?.readyState === WebSocket.OPEN) {
    let timer;
    try { await Promise.race([closeBrowser(), new Promise(resolve => { timer = setTimeout(resolve, 2000); })]); } catch {} finally { clearTimeout(timer); }
  }
  ws?.close();
  if (chrome?.pid && chrome.exitCode === null && chrome.signalCode === null) {
    const exit = new Promise(resolve => chrome.once('exit', resolve));
    const timer = setTimeout(() => chrome.kill(), 3000);
    try { await exit; } finally { clearTimeout(timer); }
  }
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
