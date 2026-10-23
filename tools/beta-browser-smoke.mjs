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
const lifePointsArg = process.argv.find(arg => /^--life-points=(normal|lethal)$/.test(arg));
const lifePointsMode = lifePointsArg?.split('=')[1] ?? null;
const smashingGround = process.argv.includes('--smashing-ground');
const hammerShot = process.argv.includes('--hammer-shot');
const earthquake = process.argv.includes('--earthquake');
const blockAttack = process.argv.includes('--block-attack');
const tributeDoomed = process.argv.includes('--tribute-doomed');
const reincarnationArg = process.argv.find(arg => /^--reincarnation=(grave|cost)$/.test(arg));
const reincarnationMode = reincarnationArg?.split('=')[1] ?? null;
const deckOverview = process.argv.includes('--deck-overview');
const expanded = deckOverview || earthquake || blockAttack || reincarnationMode !== null || tributeDoomed || hammerShot || smashingGround || process.argv.includes('--expanded-catalog') || process.argv.includes('--expanded-duel') || lifePointsMode !== null;
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
const s = structuredClone(createDuel(r, { duelId: fullDuel ? 'mixed-smoke' : 'browser-fixture', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: fullDuel ? (expanded ? '32' : '08').padStart(64, '0') : '12'.repeat(32) }).state);
// Trusted fixture setup BEFORE starting the server. No state-edit endpoint, seed flag or test mode in beta CLI.
function move(name, owner, zone, slot = 0, down = false) {
  const d = Object.values(r.cards).find(c => c.name === name), p = s.players.find(p => p.id === owner);
  const c = Object.values(s.cards).find(c => c.ownerId === owner && c.definition.id === d.id && ['hand', 'deck'].includes(c.location.kind));
  const list = c.location.kind === 'hand' ? p.hand : p.deck; list.splice(list.indexOf(c.id), 1);
  if (zone === 'graveyard') { p.graveyard.push(c.id); c.location = {kind:'graveyard',playerId:owner}; c.position='face-up'; return; }
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
if (expanded && !fullDuel && lifePointsMode === null && !smashingGround && !hammerShot && !tributeDoomed && !blockAttack && !earthquake && !deckOverview && reincarnationMode === null) {
  move('Gaia The Fierce Knight', 'a', 'hand');
  move('Battle Ox', 'a', 'monster', 0); move('Celtic Guardian', 'a', 'monster', 1, true);
  move('Curse of Dragon', 'a', 'hand');
  move('Armored Lizard', 'b', 'monster', 0);
  s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
}
if (earthquake) {
  move('Earthquake','a','hand');move('Battle Ox','a','monster',0);
  move('Mystical Elf','a','monster',1);s.cards[s.players[0].monsters[1]].position='face-up-defense';
  move('Man-Eater Bug','a','monster',2,true);
  move('Celtic Guardian','b','monster',0);move('Hane-Hane','b','monster',1);
  move('Mystical Elf','b','monster',2);s.cards[s.players[1].monsters[2]].position='face-up-defense';
  move('Man-Eater Bug','b','monster',3,true);
  s.turn.number=3;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='a';s.timing.consecutivePasses=0;
}
if (blockAttack) {
  move('Block Attack','a','hand');move('Celtic Guardian','a','monster',0);
  move('Battle Ox','b','monster',0);move('Mystical Elf','b','monster',1);s.cards[s.players[1].monsters[1]].position='face-up-defense';
  move('Man-Eater Bug','b','monster',2,true);
  s.turn.number=3;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='a';s.timing.consecutivePasses=0;
}
if (reincarnationMode !== null) {
  move('Monster Reincarnation','a','hand'); move('Battle Ox','a','hand'); move('Hane-Hane','a','graveyard');
  s.turn.number=3; s.turn.phase='main1'; s.timing.window='open'; s.timing.priorityPlayer='a'; s.timing.consecutivePasses=0;
}
if (tributeDoomed) {
  move('Tribute to The Doomed', 'a', 'hand'); move('Battle Ox', 'a', 'hand');
  move('Celtic Guardian', 'a', 'monster', 0); move('Man-Eater Bug', 'b', 'monster', 0, true);
  s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
}
if (hammerShot) {
  move('Hammer Shot', 'a', 'hand');
  move('Dark Magician', 'a', 'monster', 0); move('Dark Magician', 'b', 'monster', 0);
  move('Blue-Eyes White Dragon', 'a', 'monster', 1); s.cards[s.players[0].monsters[1]].position = 'face-up-defense';
  move('Blue-Eyes White Dragon', 'b', 'monster', 1, true); move('Battle Ox', 'b', 'monster', 2);
  s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
}
if (smashingGround) {
  move('Smashing Ground', 'a', 'hand'); move('Blue-Eyes White Dragon', 'a', 'monster', 0);
  move('Mystical Elf', 'b', 'monster', 0); move('Giant Soldier of Stone', 'b', 'monster', 1);
  move('Battle Ox', 'b', 'monster', 2); move('Blue-Eyes White Dragon', 'b', 'monster', 3, true);
  s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
}
if (lifePointsMode !== null) {
  move('Hinotama', 'a', 'hand'); move('Dian Keto the Cure Master', 'a', 'hand');
  s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
  if (lifePointsMode === 'lethal') s.players[1].lifePoints = 400;
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
const server = createBetaServer(r, undefined, newGame || concede || deckBuilder || deckOverview ? undefined : s), directory = await mkdtemp(join(tmpdir(), 'ygo-browser-'));
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
  async function marked(scope, name, expected) {
    const selector = `${scope} .card`;
    const card = `[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.querySelector('.card-name')?.textContent===${JSON.stringify(name)})`;
    assert.equal(await evaluate(`${card}?.classList.contains('actionable')`),expected,`${name}: legal-action cue`);
    assert.equal(await evaluate(`${card}?.getAttribute('aria-label').includes('Có thao tác hợp lệ')`),expected);
  }

  async function chooseTarget(index) {
    await evaluate(`(()=>{const s=document.querySelector('#action-fields select[name="target"]');s.selectedIndex=${index};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    if (await evaluate(`document.querySelector('#action-fields select[name="target"]').value==='direct'`)) {
      assert.match(await evaluate(`document.querySelector('[data-preview="target"]').textContent`),/Tấn công trực tiếp vào đối thủ/);
      assert.equal(await evaluate(`document.querySelectorAll('[data-preview="target"] .card-preview').length`),0);
    }
  }
  async function preview(kind, name) {
    const scope = `#action-fields [data-preview="${kind}"]`;
    assert.equal(await evaluate(`document.querySelector(${JSON.stringify(scope+' h2')})?.textContent`),name || 'Bài úp');
    assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(scope+' button')}).length`),0);
    if (name) {
      const definition = Object.values(r.cards).find(c=>c.name===name);
      assert.equal(await evaluate(`[...document.querySelectorAll(${JSON.stringify(scope+' p')})].at(-1).textContent`),definition.text);
    } else {
      assert.equal(await evaluate(`document.querySelectorAll(${JSON.stringify(scope+' .card-preview')}).length`),0);
      assert.match(await evaluate(`document.querySelector(${JSON.stringify(scope)}).textContent`),/Danh tính lá bài được giữ kín/);
    }
  }
  async function inspectDecision(index, escape = false) {
    const before = await evaluate('JSON.stringify(view)');
    const checked = await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`);
    const handle = await evaluate(`document.querySelectorAll('#decision-form input')[${index}].value`);
    const card = await evaluate(`visibleCard(${JSON.stringify(handle)})`);
    await click(`document.querySelectorAll('#decision-form [data-inspect]')[${index}]`);
    await wait(`document.getElementById('decision-card-dialog').open`);
    assert.equal(await evaluate(`document.querySelectorAll('#decision-card-detail button').length`),0);
    if (card.visibility === 'known') {
      assert.equal(await evaluate(`document.querySelector('#decision-card-detail h2').textContent`),r.cards[card.definition.id].name);
      assert.equal(await evaluate(`document.querySelector('#decision-card-detail p').textContent`),r.cards[card.definition.id].text);
    } else assert.equal(await evaluate(`document.querySelector('#decision-card-detail h2').textContent`),'Bài úp');
    if (process.argv.includes('--screenshots')) {
      const folder=join(projectRoot,'artifacts','decision-previews');await mkdir(folder,{recursive:true});
      for(const [label,width,height] of [['desktop',1440,1000],['narrow',390,844]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        assert.equal(await evaluate(`(()=>{const d=document.getElementById('decision-card-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1&&r.height<=innerHeight})()`),true);
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
      await send('Emulation.clearDeviceMetricsOverride');
    }
    if (escape) {
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    } else await click(`document.getElementById('close-decision-card')`);
    await wait(`!document.getElementById('decision-card-dialog').open && document.getElementById('decision-card-detail').textContent===''`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`),checked);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
  }
  async function decision(name) {
    assert.equal(await evaluate(`document.querySelectorAll('.card.actionable').length`),0);
    assert.match(await evaluate(`document.getElementById('guide-title').textContent`), /Bạn cần chọn bài/);
    assert.equal(await evaluate(`document.querySelector('#decision-form input').type`), 'radio');
    assert.match(await evaluate(`document.querySelector('#decision-form').textContent`), /Người chơi A · Quái ô/);
    const index = await evaluate(`[...document.querySelectorAll('#decision-form label')].findIndex(e=>e.textContent.includes(${JSON.stringify(name)}))`);
    await inspectDecision(index);
    await click(`[...document.querySelectorAll('#decision-form label')].find(e=>e.textContent.includes(${JSON.stringify(name)})).querySelector('input')`);
    const before = await evaluate('JSON.stringify(view)');
    const checked = await evaluate(`document.querySelector('#decision-form input:checked').value`);
    await send('Network.enable');
    await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await click(`document.querySelector('#decision-form button[type="submit"]')`); await wait('!busy');
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    assert.equal(await evaluate(`document.querySelector('#decision-form input:checked')?.value`),checked);
    await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.equal(await evaluate('decisionDraft'),null);
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
    async function handAction(index, text, slot, tributeHandles = [], costPlan = null) {
      await click(`document.querySelectorAll('#hand .card')[${index}]`);
      await click(textButton('#actions button', text));
      await evaluate(`document.querySelector('#action-fields select[name="slot"]').value=${JSON.stringify(String(slot))}`);
      if (costPlan) await evaluate(`(()=>{const f=document.getElementById('action-fields');f.querySelector('select[name="discard"]').value=${JSON.stringify(costPlan.discardHandle)};f.querySelector('select[name="target"]').value=${JSON.stringify(costPlan.targetHandle)};f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      for (const handle of tributeHandles) await click(`[...document.querySelectorAll('#action-fields input')].find(e=>e.value===${JSON.stringify(handle)})`);
      await confirm();
    }
    async function advance(phase) { await actionClick(textButton('#turn-actions button', phase)); }
    while (true) {
      let v = await snapshot();
      if (v.result) {
        assert.equal(v.result.reason, 'life-points'); assert.ok(attacks > 0); assert.ok(decisions > 0);
        if (expanded) assert.ok(usedEffects.has('Earthquake'), 'Expanded duel must exercise the new reviewed Spell');
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
        const spell = free >= 0 ? v.selfHand.findIndex(c => {
          if (definition(c)?.kind !== 'spell') return false;
          const handler = r.spellHandlers[c.definition.id].handler;
          if (handler === 'all-face-up-attack-to-defense') return [...own.monsters,...opp.monsters].some(c=>c?.position==='face-up-attack');
          if (handler === 'target-opposing-attack-to-defense') return opp.monsters.some(c=>c?.position==='face-up-attack');
          if (handler === 'discard-return-own-graveyard-monster') return v.selfHand.length >= 2 && own.graveyard.some(c=>definition(c)?.level);
          if (handler === 'discard-destroy-target-monster') return v.selfHand.length >= 2 && [...opp.monsters,...own.monsters].some(Boolean);
          if (['draw','inflict-damage','gain-life-points'].includes(handler)) return true;
          if (handler === 'destroy-highest-face-up-attack-position') return [...own.monsters,...opp.monsters].some(c=>c && c.position==='face-up-attack');
          return opp.monsters.some(c=>c && c.visibility==='known' && c.position!=='face-down-defense');
        }) : -1;
        if (spell >= 0) {
          const card = v.selfHand[spell], name = definition(card).name;
          const costPlan = ['discard-destroy-target-monster','discard-return-own-graveyard-monster'].includes(r.spellHandlers[card.definition.id].handler)
            ? { discardHandle: v.selfHand.find(c=>c.handle!==card.handle).handle, targetHandle: r.spellHandlers[card.definition.id].handler === 'discard-return-own-graveyard-monster' ? own.graveyard.find(c=>definition(c)?.level).handle : [...opp.monsters,...own.monsters].find(Boolean).handle } : null;
          await handAction(spell,'Kích hoạt',free,[],costPlan); actions++; usedEffects.add(name); continue;
        }
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
  if (earthquake) {
    const before=await evaluate('JSON.stringify(view)');
    await hand('Earthquake');await click(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="target"], #action-fields select[name="discard"]').length`),0);
    await click(`document.getElementById('cancel-action')`);assert.equal(await evaluate('JSON.stringify(view)'),before);
    await hand('Earthquake');await click(textButton('#actions button','Úp bài'));await confirm();await pass('a');await pass('b');await seat('a');
    const handBefore=await evaluate('view.selfHand.length');
    await click(`document.querySelector('#self .zone-row:nth-child(3) .card')`);await actionClick(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate('view.players[0].monsters[0].position'),'face-up-attack');
    await pass('b');assert.equal(await evaluate('view.players[1].monsters[0].position'),'face-up-attack');await pass('a');
    assert.deepEqual(await evaluate('[view.players[0].monsters[0],...view.players[1].monsters.slice(0,2)].map(c=>c.position)'),Array(3).fill('face-up-defense'));
    assert.equal(await evaluate('view.players[0].monsters[2].position'),'face-down-defense');assert.equal(await evaluate('view.players[1].monsters[3].visibility'),'hidden');
    assert.equal(await evaluate('view.selfHand.length'),handBefore);assert.equal(await evaluate('view.decision'),null);
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/chuyển sang phòng thủ bởi hiệu ứng/);
    await pass('a');await pass('b');await seat('a');
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'earthquake',cancelPreservesState:true,fromOwnSet:true,nonTargeting:true,noDiscard:true,delayedSimultaneousPositionChange:true,changedMonsters:3,hiddenMonstersUntouched:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (blockAttack) {
    const before=await evaluate('JSON.stringify(view)');
    await hand('Block Attack');await click(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="target"] option:not(:disabled)').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="discard"]').length`),0);
    await preview('target','Battle Ox');await click(`document.getElementById('cancel-action')`);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    await hand('Block Attack');await click(textButton('#actions button','Úp bài'));await confirm();await pass('a');await pass('b');await seat('a');
    const handBefore=await evaluate('view.selfHand.length');
    await click(`document.querySelector('#self .zone-row:nth-child(3) .card')`);await click(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="slot"]').length`),0);
    await preview('target','Battle Ox');await confirm();
    assert.equal(await evaluate('view.selfHand.length'),handBefore);assert.equal(await evaluate('view.players[1].monsters[0].position'),'face-up-attack');
    await pass('b');assert.equal(await evaluate('view.players[1].monsters[0].position'),'face-up-attack');await pass('a');
    assert.equal(await evaluate('view.players[1].monsters[0].position'),'face-up-defense');
    assert.equal(await evaluate('view.players[1].monsters[2].visibility'),'hidden');assert.equal(await evaluate('view.decision'),null);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/chuyển sang phòng thủ bởi hiệu ứng/);
    await pass('a');await pass('b');await seat('a');
    await actionClick(textButton('#turn-actions button','CHIẾN ĐẤU'));await pass('b');await seat('a');
    await click(`document.querySelector('#self .zone-row:nth-child(2) .card')`);await click(textButton('#actions button','Tấn công'));await chooseTarget(0);await confirm();await pass('a');await pass('b');
    assert.equal(await evaluate('view.players[1].monsters[0]'),null);assert.notEqual(await evaluate('view.players[0].monsters[0]'),null);
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'block-attack',cancelPreservesState:true,fromOwnSet:true,noDiscard:true,delayedPositionChange:true,hiddenMonsterUntouched:true,battleUsesDefense:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (reincarnationMode !== null) {
    const selfCost = reincarnationMode === 'cost', handBefore = await evaluate('view.selfHand.length');
    if (selfCost) {
      await hand('Monster Reincarnation'); await click(textButton('#actions button','Úp bài')); await confirm(); await pass('a'); await pass('b'); await seat('a');
    }
    const before = await evaluate('JSON.stringify(view)');
    async function openRecovery() {
      if (selfCost) await click(`document.querySelector('#self .zone-row:nth-child(3) .card')`); else await hand('Monster Reincarnation');
      await click(textButton('#actions button','Kích hoạt'));
    }
    await openRecovery(); await click(`document.getElementById('cancel-action')`); assert.equal(await evaluate('JSON.stringify(view)'),before); await openRecovery();
    assert.match(await evaluate(`document.getElementById('action-title').textContent`),/chọn quái về tay/);
    assert.match(await evaluate(`document.getElementById('action-fields').textContent`),/Mộ phải có quái/);
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),d=f.querySelector('select[name="discard"]'),t=f.querySelector('select[name="target"]');d.value=[...d.options].find(o=>o.textContent==='Battle Ox').value;t.value=[...t.options].find(o=>o.textContent.includes('Lá sẽ bỏ làm chi phí')&&o.textContent.includes('Battle Ox')).value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await preview('discard','Battle Ox'); await preview('target','Battle Ox');
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),d=f.querySelector('select[name="discard"]');d.value=[...d.options].find(o=>o.textContent!=='Battle Ox').value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await preview('target','Hane-Hane');
    assert.equal(await evaluate(`[...document.querySelector('#action-fields select[name="target"]').options].find(o=>o.textContent.includes('Lá sẽ bỏ làm chi phí')&&o.textContent.includes('Battle Ox')).disabled`),true);
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),d=f.querySelector('select[name="discard"]');d.value=[...d.options].find(o=>o.textContent==='Battle Ox').value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await evaluate(`[...document.querySelector('#action-fields select[name="target"]').options].find(o=>o.textContent.includes('Lá sẽ bỏ làm chi phí')&&o.textContent.includes('Battle Ox')).disabled`),false);
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),t=f.querySelector('select[name="target"]');t.value=[...t.options].find(o=>${selfCost ? "o.textContent.includes('Lá sẽ bỏ làm chi phí')&&o.textContent.includes('Battle Ox')" : "o.textContent.includes('Mộ')&&o.textContent.includes('Hane-Hane')"}).value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await preview('discard','Battle Ox'); await preview('target',selfCost?'Battle Ox':'Hane-Hane');
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    if (process.argv.includes('--screenshots')) {
      const folder=join(projectRoot,'artifacts','choice-previews'); await mkdir(folder,{recursive:true});
      for (const [label,width,height] of [['desktop',1440,1000],['narrow',390,844]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        await evaluate(`document.getElementById('action-dialog').scrollTop=0`);
        assert.equal(await evaluate(`(()=>{const d=document.getElementById('action-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1&&r.height<=innerHeight})()`),true);
        const shot=await send('Page.captureScreenshot',{format:'png'}); await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
      await send('Emulation.clearDeviceMetricsOverride');
    }
    assert.equal(await evaluate('view.players[0].graveyard.length'),1); await confirm();
    const selected = selfCost ? 'Battle Ox' : 'Hane-Hane';
    assert.equal(await evaluate('view.selfHand.length'),handBefore-2); assert.equal(await evaluate('view.players[0].graveyard.length'),2);
    assert.equal(await evaluate(`view.chain[0].targetHandles[0]===view.players[0].graveyard.find(c=>catalog.get(c.definition.id).name===${JSON.stringify(selected)}).handle`),true);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/bỏ 1 lá làm chi phí/);
    await pass('b'); assert.equal(await evaluate('view.players[0].graveyard.length'),2); await pass('a');
    assert.equal(await evaluate('view.selfHand.length'),handBefore-1);
    assert.equal(await evaluate(`view.selfHand.some(c=>c.visibility==='known'&&catalog.get(c.definition.id).name===${JSON.stringify(selected)})`),true);
    assert.equal(await evaluate('view.players.every(p=>p.monsters.every(c=>c===null))'),true);
    assert.equal(await evaluate('view.chain.length'),0); assert.equal(await evaluate('view.decision'),null);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/1 lá trở về tay Người chơi A/);
    await inspectGraveyard('self',['Monster Reincarnation',selfCost?'Hane-Hane':'Battle Ox']);
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]); assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'reincarnation-'+reincarnationMode,choicePreviews:true,previewFollowsCostChange:true,returnDiscardedMonster:selfCost,preExistingGraveyardMonster:true,costPaidAtActivation:true,returnOnlyAtResolution:true,noSpecialSummon:true,cancelPreservesState:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (tributeDoomed) {
    const before = await evaluate('JSON.stringify(view)'), handBefore = await evaluate('view.selfHand.length');
    await hand('Tribute to The Doomed'); await click(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="discard"]').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="target"]').length`),1);
    await click(`document.getElementById('cancel-action')`); assert.equal(await evaluate('JSON.stringify(view)'),before);
    await hand('Tribute to The Doomed'); await click(textButton('#actions button','Úp bài')); await confirm(); await pass('a'); await pass('b'); await seat('a');
    await click(`document.querySelector('#self .zone-row:nth-child(3) .card')`); await click(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="slot"]').length`),0);
    await evaluate(`(()=>{const t=document.querySelector('#action-fields select[name="target"]');t.value=[...t.options].find(o=>o.textContent.includes('Celtic Guardian')).value;t.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await preview('target','Celtic Guardian');
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),d=f.querySelector('select[name="discard"]'),t=f.querySelector('select[name="target"]');d.value=[...d.options].find(o=>o.textContent==='Battle Ox').value;t.value=[...t.options].find(o=>o.textContent.includes('Người chơi B')).value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.match(await evaluate(`document.querySelector('#action-fields select[name="target"]').selectedOptions[0].textContent`),/Bài úp/);
    await preview('discard','Battle Ox'); await preview('target',null);
    assert.equal(await evaluate(`document.querySelector('[data-preview="target"]').textContent.includes('Man-Eater Bug')`),false);
    assert.equal(await evaluate('view.players[0].graveyard.length'),0); await confirm();
    assert.equal(await evaluate('view.selfHand.length'),handBefore-2);
    assert.equal(await evaluate('view.players[0].graveyard.length'),1); assert.equal(await evaluate('view.players[1].monsters[0].visibility'),'hidden');
    assert.equal(await evaluate('view.chain[0].targetHandles.length'),1);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/Người chơi A bỏ 1 lá làm chi phí/);
    await pass('b'); assert.notEqual(await evaluate('view.players[1].monsters[0]'),null); await pass('a');
    assert.equal(await evaluate('view.players[1].monsters[0]'),null); assert.notEqual(await evaluate('view.players[0].monsters[0]'),null);
    assert.equal(await evaluate('view.chain.length'),0); assert.equal(await evaluate('view.decision'),null);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/1 quái bị phá bởi hiệu ứng/);
    await inspectGraveyard('self',['Tribute to The Doomed','Battle Ox']); await inspectGraveyard('opponent',['Man-Eater Bug']);
    const facts = await evaluate('view.activity.flatMap(x=>x.resolution||[])');
    assert.deepEqual(facts,[{kind:'discard-cost',playerId:'a',count:1},{kind:'effect-destroyed',count:1}]); assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'tribute-doomed',cancelPreservesCards:true,fromOwnSet:true,costPaidAtActivation:true,targetDestroyedAtResolution:true,hiddenTarget:true,choicePreviews:true,previewKeepsHiddenIdentity:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (hammerShot) {
    await hand('Hammer Shot'); await click(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="target"]').length`),0);
    await confirm(); assert.equal(await evaluate('view.decision'),null);
    await pass('b'); assert.equal(await evaluate('view.decision'),null); await pass('a'); await seat('a');
    assert.equal(await evaluate('view.decision.kind'),'effect-choice');
    assert.equal(await evaluate('view.decision.optionIds.length'),2);
    const labels = await evaluate(`[...document.querySelectorAll('#decision-form label')].map(e=>e.textContent)`);
    assert.equal(labels.length,2); assert.ok(labels.some(t=>t.includes('Người chơi A') && t.includes('Dark Magician')));
    assert.ok(labels.some(t=>t.includes('Người chơi B') && t.includes('Dark Magician')));
    assert.equal(await evaluate(`document.getElementById('pass').disabled`),true);
    await seat('b'); assert.equal(await evaluate('view.decision'),null); await seat('a');
    await inspectDecision(await evaluate(`[...document.querySelectorAll('#decision-form label')].findIndex(e=>e.textContent.includes('Người chơi A'))`));
    await click(`[...document.querySelectorAll('#decision-form label')].find(e=>e.textContent.includes('Người chơi A')).querySelector('input')`);
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.equal(await evaluate('view.players[0].monsters[0]'),null);
    assert.equal(await evaluate('view.players[1].monsters[0].visibility'),'known');
    assert.equal(await evaluate('view.players[0].monsters[1].position'),'face-up-defense');
    assert.equal(await evaluate('view.players[1].monsters[1].visibility'),'hidden');
    assert.equal(await evaluate('view.players[1].monsters[2].visibility'),'known');
    assert.equal(await evaluate('view.players[0].spellsTraps[0]'),null);
    assert.equal(await evaluate('view.chain.length'),0); assert.equal(await evaluate('view.decision'),null);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/1 quái bị phá bởi hiệu ứng/);
    await inspectGraveyard('self',['Hammer Shot','Dark Magician']); await inspectGraveyard('opponent',[]);
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]); assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'hammer-shot',decisionPreviews:true,nonTargeting:true,tiedAcrossFields:true,ownMonsterDestroyed:true,defenseExcluded:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (smashingGround) {
    await hand('Smashing Ground'); await click(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="target"]').length`),0);
    await confirm(); assert.equal(await evaluate('view.decision'),null);
    await pass('b'); assert.equal(await evaluate('view.decision'),null); await pass('a');
    await seat('a');
    assert.equal(await evaluate('view.decision.kind'),'effect-choice');
    assert.equal(await evaluate('view.decision.optionIds.length'),2);
    assert.equal(await evaluate(`document.querySelectorAll('#decision-form input').length`),2);
    assert.match(await evaluate(`document.getElementById('decision-form').textContent`),/Mystical Elf/);
    assert.match(await evaluate(`document.getElementById('decision-form').textContent`),/Giant Soldier of Stone/);
    assert.equal(await evaluate(`document.getElementById('pass').disabled`),true);
    await seat('b'); assert.equal(await evaluate('view.decision'),null); await seat('a');
    await click(`[...document.querySelectorAll('#decision-form label')].find(e=>e.textContent.includes('Giant Soldier of Stone')).querySelector('input')`);
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.equal(await evaluate('view.players[1].monsters[1]'),null);
    assert.equal(await evaluate('view.players[1].monsters[0].visibility'),'known');
    assert.equal(await evaluate('view.players[1].monsters[2].visibility'),'known');
    assert.equal(await evaluate('view.players[1].monsters[3].visibility'),'hidden');
    assert.equal(await evaluate('view.players[0].monsters[0].visibility'),'known');
    assert.equal(await evaluate('view.players[0].spellsTraps[0]'),null);
    assert.equal(await evaluate('view.chain.length'),0); assert.equal(await evaluate('view.decision'),null);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/1 quái bị phá bởi hiệu ứng/);
    await inspectGraveyard('self',['Smashing Ground']); await inspectGraveyard('opponent',['Giant Soldier of Stone']);
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'smashing-ground',nonTargeting:true,tiedHighestDefenseChoice:true,ownAndHiddenExcluded:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (lifePointsMode !== null) {
    if (lifePointsMode === 'normal') {
      await hand('Dian Keto the Cure Master'); await click(textButton('#actions button','Úp bài')); await confirm();
      await pass('a'); await pass('b'); await seat('a');
      await click(`document.querySelector('#self .zone-row:nth-child(3) .card')`);
      await actionClick(textButton('#actions button','Kích hoạt'));
      assert.equal(await evaluate('view.players[0].lifePoints'),8000);
      await pass('b'); assert.equal(await evaluate('view.players[0].lifePoints'),8000);
      await pass('a'); assert.equal(await evaluate('view.players[0].lifePoints'),9000);
      assert.match(await evaluate(`document.getElementById('status').textContent`),/Người chơi A hồi 1000 LP/);
      assert.equal(await evaluate(`view.chain.length`),0);
      await pass('a'); await pass('b');
    }
    await hand('Hinotama'); await click(textButton('#actions button','Kích hoạt'));
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields select[name="target"]').length`),0);
    await confirm();
    const beforeDamage=lifePointsMode==='lethal'?400:8000;
    assert.equal(await evaluate('view.players[1].lifePoints'),beforeDamage);
    await pass('b'); assert.equal(await evaluate('view.players[1].lifePoints'),beforeDamage);
    await pass('a');
    assert.equal(await evaluate('view.players[1].lifePoints'),lifePointsMode==='lethal'?0:7500);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/Người chơi B nhận 500 sát thương hiệu ứng/);
    const facts=await evaluate(`view.activity.flatMap(e=>e.resolution||[])`);
    assert.ok(facts.some(f=>f.kind==='effect-damage' && f.playerId==='b' && f.amount===500));
    if(lifePointsMode==='normal') assert.ok(facts.some(f=>f.kind==='life-points-gained' && f.playerId==='a' && f.amount===1000));
    assert.equal(await evaluate('view.chain.length'),0);assert.equal(await evaluate('view.players[0].spellsTraps.every(c=>c===null)'),true);
    if(lifePointsMode==='lethal') {
      assert.deepEqual(await evaluate('view.result'),{winner:'a',reason:'life-points'});
      assert.match(await evaluate(`document.getElementById('guide-title').textContent`),/thắng/);
      assert.equal(await evaluate(`document.getElementById('pass').disabled`),true);
    } else assert.equal(await evaluate('view.result'),null);
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'life-points-'+lifePointsMode,gainFromOwnSet:lifePointsMode==='normal',lifePoints:await evaluate('view.players.map(p=>p.lifePoints)'),delayedUntilResolution:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (expanded && !fullDuel && !deckOverview) {
    assert.equal(await evaluate('catalog.size'), 108);
    assert.match(await evaluate(`document.getElementById('catalog-count').textContent`), /108/);
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
      if(process.argv.includes('--screenshots') && ['Blue-Eyes White Dragon','Pot of Greed','Trap Hole','Skull Servant','Launcher Spider','Winged Dragon, Guardian of the Fortress #1','King of Yamimakai','Armored Zombie','Armored Starfish','Giga-Tech Wolf','Disk Magician','Illusionist Faceless Mage'].includes(card.name)) {
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
    await seat('b');
    assert.equal(await evaluate(`document.getElementById('opponent').textContent.includes('Celtic Guardian')`),false);
    await seat('a');
    const beforeTribute = await evaluate('JSON.stringify(view)');
    await hand('Curse of Dragon'); await click(textButton('#actions button','Úp quái'));
    assert.match(await evaluate(`document.getElementById('tribute-progress').textContent`),/0\/1/);
    await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[1]`);
    assert.equal(await evaluate(`document.querySelector('[data-preview="tributes"] h2').textContent`),'Celtic Guardian');
    assert.match(await evaluate(`document.getElementById('tribute-progress').textContent`),/1\/1/);
    await evaluate(`(()=>{const s=document.querySelector('#action-fields select[name="slot"]');s.value='1';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await evaluate(`document.querySelector('#action-form button[type="submit"]').disabled`),false);
    await click(`document.getElementById('cancel-action')`);
    assert.equal(await evaluate('JSON.stringify(view)'),beforeTribute);
    await hand('Gaia The Fierce Knight'); await click(textButton('#actions button', 'Triệu hồi'));
    assert.match(await evaluate(`document.getElementById('tribute-progress').textContent`),/0\/2/);
    assert.equal(await evaluate(`document.querySelectorAll('[data-preview="tributes"] .card-preview').length`),0);
    assert.equal(await evaluate(`document.querySelectorAll('#action-fields input[type="checkbox"]').length`), 2);
    await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[0]`);
    assert.match(await evaluate(`document.getElementById('tribute-progress').textContent`),/1\/2/);
    assert.equal(await evaluate(`document.querySelector('#action-form button[type="submit"]').disabled`),true);
    await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[1]`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-preview="tributes"] h2')].map(e=>e.textContent)`),['Battle Ox','Celtic Guardian']);
    assert.equal(await evaluate(`document.querySelector('#action-form button[type="submit"]').disabled`),false);
    await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[0]`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('[data-preview="tributes"] h2')].map(e=>e.textContent)`),['Celtic Guardian']);
    await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[0]`);
    for (const name of ['Battle Ox','Celtic Guardian']) {
      const definition=Object.values(r.cards).find(c=>c.name===name);
      assert.equal(await evaluate(`(()=>{const p=[...document.querySelectorAll('[data-preview="tributes"] .choice-preview')].find(p=>p.querySelector('h2')?.textContent===${JSON.stringify(name)});return [...p.querySelectorAll('p')].at(-1).textContent;})()`),definition.text);
    }
    assert.equal(await evaluate('JSON.stringify(view)'),beforeTribute);
    if(process.argv.includes('--screenshots')) {
      const directory=join(projectRoot,'artifacts','tribute-previews');await mkdir(directory,{recursive:true});
      for(const [label,width,height] of [['desktop',1440,1000],['narrow',390,844]]) {
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        await evaluate(`document.getElementById('action-dialog').scrollTop=0`);
        assert.equal(await evaluate(`(()=>{const d=document.getElementById('action-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1&&r.height<=innerHeight})()`),true);
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(directory,label+'.png'),Buffer.from(shot.data,'base64'));
      }
      await send('Emulation.clearDeviceMetricsOverride');
    }
    await confirm(); await pass('a'); await pass('b'); await seat('a');
    assert.equal(await evaluate('view.players[0].graveyard.length'), 2);
    await actionClick(textButton('#turn-actions button', 'CHIẾN ĐẤU')); await pass('b'); await seat('a');
    await click(`document.querySelector('#self .zone-row:nth-child(2) .card')`);
    await click(textButton('#actions button', 'Tấn công')); await chooseTarget(0); await confirm(); await pass('a'); await pass('b');
    assert.equal(await evaluate('view.players[1].lifePoints'), 7200);
    assert.equal(await evaluate(`view.players[1].graveyard.some(c=>catalog.get(c.definition.id).name==='Armored Lizard')`), true);
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'expanded-catalog', catalog: 108, reviewedCardPreviews: 108, dataDrivenLevels: true, tributePreviews: true, oneTributeSetCancelPreservesState: true, deselectionUpdatesPreview: true, ownSetPrivacy: true, tributeSummon: 'Gaia The Fierce Knight', battleTarget: 'Armored Lizard', battleDamage: 800, fixtureOnlyAtSetup: true, runtimeExceptions: errors.length }));
  } else if (deckOverview) {
    const openDeck=async()=>{await click(`document.getElementById('deck-builder')`);await wait(`!busy && document.getElementById('deck-dialog').open`);};
    const change=(id,direction)=>click(`document.querySelector('#deck-catalog [data-card-id="${id}"] [data-change="${direction}"]')`);
    const filter=async(id,value)=>evaluate(`document.getElementById(${JSON.stringify(id)}).value=${JSON.stringify(value)};document.getElementById(${JSON.stringify(id)}).dispatchEvent(new Event('change'))`);
    const rows=()=>evaluate(`[...document.querySelectorAll('#deck-catalog .deck-row')].map(e=>e.dataset.cardId)`);
    async function verifyComposition(){
      const cards=await evaluate('deckDraft.cards'),sum={monster:0,spell:0,trap:0};
      for(const id of cards){const k=r.cards[id].kind;sum[k.includes('monster')?'monster':k]++;}
      assert.equal(await evaluate(`document.getElementById('deck-composition').textContent`),`Quái: ${sum.monster} · Phép: ${sum.spell} · Bẫy: ${sum.trap} · ${new Set(cards).size} loại bài`);
    }
    const before=await evaluate('JSON.stringify(view)');await openDeck();
    const saved=await evaluate(`api('/api/deck')`),original=await evaluate('JSON.stringify(deckDraft.cards)');
    assert.equal((await rows()).length,108);await verifyComposition();
    assert.equal(await evaluate(`document.getElementById('deck-undo').disabled`),true);
    assert.equal(await evaluate(`document.getElementById('deck-redo').disabled`),true);
    const historyCard=saved.cards.find(id=>r.cards[id].legality.maxCopies>saved.cards.filter(c=>c===id).length);
    await change(historyCard,'add');const changed=await evaluate('JSON.stringify(deckDraft.cards)');
    await click(`document.getElementById('deck-undo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    assert.equal(await evaluate('document.activeElement.id'),'deck-redo');
    await click(`document.getElementById('deck-redo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),changed);
    await click(`document.getElementById('deck-undo')`);
    await click(`document.getElementById('deck-default')`);assert.equal(await evaluate(`document.getElementById('deck-redo').disabled`),false);
    await change(historyCard,'remove');assert.equal(await evaluate(`document.getElementById('deck-redo').disabled`),true);
    await click(`document.getElementById('deck-undo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    await filter('deck-kind','spell');await filter('deck-kind','all');
    assert.equal(await evaluate(`document.getElementById('deck-redo').disabled`),false);
    await click(`document.getElementById('deck-redo')`);
    const beforeDefault=await evaluate('JSON.stringify(deckDraft.cards)');await click(`document.getElementById('deck-default')`);
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    await click(`document.getElementById('deck-undo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),beforeDefault);
    await click(`document.getElementById('deck-redo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    assert.deepEqual(await evaluate(`api('/api/deck')`),saved);

    for(let n=0;n<26;n++){await change(historyCard,'add');await change(historyCard,'remove');}
    assert.equal(await evaluate('deckDraft.undo.length'),50);
    assert.deepEqual(await evaluate('[...deckDraft.cards].sort()'),[...saved.cards].sort());
    await click(`document.getElementById('deck-close')`);await openDeck();
    assert.deepEqual(await evaluate('[deckDraft.undo,deckDraft.redo]'),[[],[]]);
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    const key=async(key,code,windowsVirtualKeyCode)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode,...(code==='Space'?{text:' '}:code==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode});await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');};
    const focusState=()=>evaluate(`({id:document.activeElement.closest('.deck-row')?.dataset.cardId,change:document.activeElement.dataset.change,name:document.activeElement.classList.contains('deck-name'),control:document.activeElement.id})`);
    const keyboardCard=saved.cards.find(id=>r.cards[id].legality.maxCopies===3&&saved.cards.filter(c=>c===id).length===1);
    assert.ok(keyboardCard);
    await evaluate(`document.querySelector('#deck-catalog [data-card-id="${keyboardCard}"] [data-change="add"]').focus()`);
    await key('Enter','Enter',13);
    assert.equal(await evaluate(`deckDraft.cards.filter(id=>id===${JSON.stringify(keyboardCard)}).length`),2);
    assert.deepEqual(await focusState(),{id:keyboardCard,change:'add',name:false,control:''});
    await key(' ','Space',32);
    assert.deepEqual(await focusState(),{id:keyboardCard,name:true,control:''});
    assert.equal(await evaluate(`deckDraft.cards.filter(id=>id===${JSON.stringify(keyboardCard)}).length`),3);
    await key('Enter','Enter',13);assert.ok(await evaluate(`document.querySelector('#deck-preview h2').textContent.length>0`));
    assert.equal(await evaluate(`deckDraft.cards.filter(id=>id===${JSON.stringify(keyboardCard)}).length`),3);
    await key('Tab','Tab',9);assert.deepEqual(await focusState(),{id:keyboardCard,change:'remove',name:false,control:''});
    await filter('deck-presence','included');
    const includedBefore=await rows(),keyboardIndex=includedBefore.indexOf(keyboardCard),following=includedBefore[keyboardIndex+1]??includedBefore[keyboardIndex-1];
    for(let n=0;n<3;n++)await key(' ','Space',32);
    assert.ok(!(await rows()).includes(keyboardCard));
    assert.deepEqual(await focusState(),{id:following,change:'remove',name:false,control:''});
    await click(`document.getElementById('deck-default')`);
    // When the only matching row disappears, return to search rather than losing focus.
    await evaluate(`document.getElementById('deck-search').value=${JSON.stringify(r.cards[keyboardCard].name)};document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    assert.deepEqual(await rows(),[keyboardCard]);
    await evaluate(`document.querySelector('#deck-catalog [data-card-id="${keyboardCard}"] [data-change="remove"]').focus()`);
    await key('Enter','Enter',13);assert.equal((await rows()).length,0);
    assert.equal((await focusState()).control,'deck-search');
    await click(`document.getElementById('deck-default')`);
    await evaluate(`document.getElementById('deck-search').value='';document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    await filter('deck-presence','all');
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);

    const catalogOrder=await rows();
    const expectedSort=(ids,mode,cards)=>[...ids].sort((left,right)=>{
      const a=r.cards[left],b=r.cards[right];
      const value=c=>mode==='copies'?cards.filter(id=>id===c.id).length:(c[mode]??-1);
      return (mode==='name'?0:value(b)-value(a))||a.name.localeCompare(b.name,'en')||a.id.localeCompare(b.id,'en');
    });
    for(const mode of ['name','level','attack','copies']){
      await filter('deck-sort',mode);assert.deepEqual(await rows(),expectedSort(catalogOrder,mode,saved.cards));
      assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
      if(mode==='level'||mode==='attack'){
        assert.equal((await rows())[0],'official:89631139');
        const ordered=await rows(),firstSpell=ordered.findIndex(id=>r.cards[id].kind==='spell');
        assert.ok(ordered.slice(firstSpell).every(id=>!r.cards[id].kind.includes('monster')));
      }
    }
    await filter('deck-sort','catalog');assert.deepEqual(await rows(),catalogOrder);

    await filter('deck-presence','included');
    assert.deepEqual(new Set(await rows()),new Set(saved.cards));
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    assert.equal(await evaluate(`document.getElementById('deck-results').textContent`),`Hiển thị ${new Set(saved.cards).size} loại bài có trong deck.`);
    await filter('deck-kind','spell');assert.ok((await rows()).every(id=>r.cards[id].kind==='spell'&&saved.cards.includes(id)));
    await evaluate(`document.getElementById('deck-search').value='no such card';document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    assert.equal((await rows()).length,0);await verifyComposition();
    await evaluate(`document.getElementById('deck-search').value='';document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    await filter('deck-kind','all');
    const removed=saved.cards[0],count=saved.cards.filter(id=>id===removed).length;
    for(let n=0;n<count;n++)await change(removed,'remove');
    assert.ok(!(await rows()).includes(removed));await verifyComposition();
    assert.equal(await evaluate(`document.getElementById('deck-save').disabled`),true);
    await filter('deck-presence','all');await change(removed,'add');await filter('deck-presence','included');
    assert.ok((await rows()).includes(removed));await verifyComposition();
    const distinctBefore=(await rows()).length;await change(removed,'add');await verifyComposition();
    assert.equal((await rows()).length,distinctBefore);
    await filter('deck-sort','copies');
    assert.equal((await rows())[0],removed);
    assert.deepEqual(await rows(),expectedSort([...new Set(saved.cards)],'copies',await evaluate('deckDraft.cards')));
    await filter('deck-kind','monster');
    const monsters=[...new Set(saved.cards)].filter(id=>r.cards[id].kind.includes('monster'));
    await filter('deck-sort','level');assert.deepEqual(await rows(),expectedSort(monsters,'level',await evaluate('deckDraft.cards')));
    await filter('deck-kind','all');

    await click(`document.getElementById('deck-default')`);await verifyComposition();
    assert.deepEqual(new Set(await rows()),new Set(saved.defaultCards));
    // Read previews and check the dialog fits both target viewport sizes.
    await click(`document.querySelector('#deck-catalog .deck-name')`);
    assert.ok(await evaluate(`document.querySelector('#deck-preview h2').textContent.length>0`));
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const d=document.getElementById('deck-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1})()`),true);
      await evaluate(`document.getElementById('deck-dialog').scrollTop=0`);
      if(process.argv.includes('--screenshots')){const folder=join(projectRoot,'artifacts','deck-overview');await mkdir(folder,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));}
    }
    await send('Emulation.clearDeviceMetricsOverride');
    await click(`document.getElementById('deck-close')`);assert.deepEqual(await evaluate(`api('/api/deck')`),saved);
    await openDeck();assert.equal(await evaluate(`document.getElementById('deck-presence').value`),'all');
    assert.equal(await evaluate(`document.getElementById('deck-sort').value`),'catalog');
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    assert.deepEqual(await evaluate('[deckDraft.undo,deckDraft.redo]'),[[],[]]);await click(`document.getElementById('deck-close')`);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    await seat('b');await openDeck();await verifyComposition();
    assert.equal(await evaluate(`document.getElementById('deck-presence').value`),'all');
    assert.equal(await evaluate(`document.getElementById('deck-sort').value`),'catalog');
    await click(`document.getElementById('deck-close')`);await seat('a');
    // Seat handoff deliberately rotates private handles; compare public game state without handles.
    const withoutHandles=value=>JSON.stringify(value,(key,item)=>key==='handle'?undefined:item);
    assert.equal(withoutHandles(await evaluate('view')),withoutHandles(JSON.parse(before)));assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'deck-overview',catalog:108,undoRedo:true,historyLimit:50,defaultUndoable:true,historyResetOnReopen:true,compositionCountsCopies:true,sortModes:['catalog','name','level','attack','copies'],sortingPreservesDeckOrder:true,keyboardFocusRetained:true,copyLimitFocusFallback:true,removedRowFocusFallback:true,emptyListFocusSearch:true,combinedFilters:true,removedLastCopyDisappears:true,addRestoresRow:true,defaultRefreshesCounts:true,preview:true,filterPreservesDraft:true,cancelPreservesSaved:true,seatReset:true,responsiveWidths:[1440,390],runtimeExceptions:errors.length}));
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
    // Exercise the real download and native file input, preserving both draft and saved deck on error.
    const downloads = join(directory, 'deck-files'); await mkdir(downloads, {recursive:true});
    await send('Browser.setDownloadBehavior', {behavior:'allow',downloadPath:downloads});
    await click(`document.getElementById('deck-export')`); await wait(`!busy`);
    const exportedPath = join(downloads, 'classic-duel-deck-a.json');
    let portable;
    for (let n=0;n<100;n++) {
      try { portable = JSON.parse(await readFile(exportedPath,'utf8')); break; } catch { await new Promise(resolve=>setTimeout(resolve,100)); }
    }
    assert.ok(portable); assert.equal(portable.cards.length,41);
    assert.deepEqual(Object.keys(portable).sort(),['cards','format','kind','schemaVersion']);
    const upload = async path => {
      const root = await send('DOM.getDocument');
      const input = await send('DOM.querySelector',{nodeId:root.root.nodeId,selector:'#deck-file'});
      await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[path]});
      await wait(`!busy && document.getElementById('deck-file').value===''`);
    };
    const invalidPath=join(downloads,'invalid.json');await writeFile(invalidPath,'{');
    const historyBeforeInvalid=await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])');
    await upload(invalidPath);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/Không nhập được/);
    assert.equal(await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])'),historyBeforeInvalid);
    assert.equal(await evaluate('deckDraft.cards.length'),41);
    await change('official:89631139','remove'); assert.equal(await evaluate('deckDraft.cards.length'),40);
    const beforeImport=await evaluate('JSON.stringify(deckDraft.cards)');
    await upload(exportedPath); assert.equal(await evaluate('deckDraft.cards.length'),41);
    const importedCards=await evaluate('JSON.stringify(deckDraft.cards)');
    await click(`document.getElementById('deck-undo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),beforeImport);
    await click(`document.getElementById('deck-redo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),importedCards);
    await upload(exportedPath);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/bản nháp/);
    assert.equal(await evaluate(`(async()=> (await api('/api/deck')).cards.length)()`),40);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    await click(`document.getElementById('deck-close')`); await openDeck();
    assert.equal(await evaluate('deckDraft.cards.length'),40);
    await upload(exportedPath); assert.equal(await evaluate('deckDraft.cards.length'),41);

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

    const historyBeforeSaveError=await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])');
    await send('Network.enable');
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await click(`document.getElementById('deck-save')`);
    await wait(`!busy && document.getElementById('deck-error').textContent.length>0`);
    assert.equal(await evaluate(`document.getElementById('deck-dialog').open`), true);
    assert.equal(await evaluate('deckDraft.cards.length'), 41);
    assert.equal(await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])'),historyBeforeSaveError);
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
    await upload(exportedPath); assert.equal(await evaluate('deckDraft.cards.length'),41);
    assert.equal(await evaluate(`(async()=> (await api('/api/deck')).cards.length)()`),40);
    await click(`document.getElementById('deck-close')`); await openDeck();
    assert.equal(await evaluate('deckDraft.cards.length'),40);
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
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'deck-builder', importedDeckUndoRedo:true,invalidImportPreservesHistory:true,portableFileRoundtrip: true, invalidImportPreservesDraft: true, importRequiresSave: true, decks: [41,42], invalidSizeBlocked: true, copyLimits: true, cancelPreservesSaved: true, networkErrorPreservesDraft: true, savePreservesDuel: true, appliedOnNewDuel: true, runtimeExceptions: errors.length }));
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
    assert.equal(await evaluate(`document.querySelectorAll('.card.actionable').length`),0);
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
      assert.equal(await evaluate(`document.querySelectorAll('.card.actionable').length`),0);
      assert.match(await evaluate(`document.getElementById('action-hints').textContent`),/Trận đấu đã kết thúc/);
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
    assert.equal(await evaluate(`document.querySelectorAll('#decision-form [data-inspect]').length`),0);
    await seat('a');
    assert.equal(await evaluate('view.decision.kind'), 'discard');
    assert.equal(await evaluate('view.decision.min'), 2);
    assert.equal(await evaluate(`document.querySelector('#decision-form input').type`), 'checkbox');
    await inspectDecision(0);
    const disabled = () => evaluate(`document.querySelector('#decision-form button[type="submit"]').disabled`);
    assert.equal(await disabled(), true);
    await click(`document.querySelectorAll('#decision-form input')[0]`); assert.equal(await disabled(), true);
    await click(`document.querySelectorAll('#decision-form input')[1]`); assert.equal(await disabled(), false);
    await click(`document.querySelectorAll('#decision-form input')[2]`); assert.equal(await disabled(), true);
    await click(`document.querySelectorAll('#decision-form input')[2]`);
    assert.match(await evaluate(`document.getElementById('decision-progress').textContent`), /2\/2/);
    await inspectDecision(1,true); assert.equal(await disabled(),false);
    const checkedBeforeFailure = await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`);
    const beforeFailure = await evaluate('JSON.stringify(view)');
    await send('Network.enable');
    await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await click(`document.querySelector('#decision-form button[type="submit"]')`); await wait('!busy');
    assert.equal(await evaluate('JSON.stringify(view)'),beforeFailure);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`),checkedBeforeFailure);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/Chưa xác nhận lựa chọn/);
    await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    // Reading a card and refreshing an unchanged view must also preserve a local choice.
    await click(`document.querySelector('#hand .card')`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`),checkedBeforeFailure);
    await click(`document.getElementById('refresh')`); await wait('!busy');
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`),checkedBeforeFailure);
    // Seat changes discard private drafts, even when returning to the same still-pending decision.
    await seat('b'); assert.equal(await evaluate('decisionDraft'),null);
    assert.equal(await evaluate(`document.querySelectorAll('#decision-form input').length`),0);
    await seat('a'); assert.equal(await evaluate(`document.querySelectorAll('#decision-form input:checked').length`),0);
    await click(`document.querySelectorAll('#decision-form input')[0]`);
    await click(`document.querySelectorAll('#decision-form input')[1]`);
    const currentSelection = await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`);
    const beforeLostResponse = await evaluate('JSON.stringify(view)');
    // Real server execution, then lose only its response; no state manipulation or automatic retry.
    await evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/command'){window.fetch=original;await original(...args);throw new Error('Mất phản hồi sau khi server xử lý');}return original(...args);};})()`);
    await click(`document.querySelector('#decision-form button[type="submit"]')`); await wait('!busy');
    assert.equal(await evaluate('JSON.stringify(view)'),beforeLostResponse);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`),currentSelection);
    const serverAfterLoss = await evaluate(`api('/api/view')`);
    assert.equal(serverAfterLoss.selfHand.length,6); assert.equal(serverAfterLoss.decision,null);
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.equal(await evaluate('view.stateVersion'),serverAfterLoss.stateVersion);
    assert.equal(await evaluate('decisionDraft'),null);
    assert.equal(await evaluate(`view.activity.filter(e=>e.action==='answer-decision').length`),1);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/Bàn đấu đã thay đổi/);
    assert.equal(await evaluate('view.selfHand.length'), 6);
    assert.equal(await evaluate('view.players[0].graveyard.length'), 2);
    assert.equal(await evaluate('view.decision'), null);
    await pass('a'); await pass('b'); await seat('a');
    await actionClick(textButton('#turn-actions button', 'Sang lượt đối thủ')); await pass('b');
    assert.equal(await evaluate('view.turn.activePlayer'), 'b');
    assert.equal(await evaluate('view.turn.number'), 2);
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'discard', networkFailurePreservesSelection: true, unchangedRefreshPreservesSelection: true, seatSwitchClearsDraft: true, lostResponseNoDuplicateDiscard: true, decisionPreviews: true, viewingPreservesSelection: true, escapeClearsPreview: true, handAfterDiscard: 6, discarded: 2, nextPlayer: 'b', runtimeExceptions: errors.length }));
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
  await marked('#hand','Pot of Greed',true); await marked('#hand','Battle Ox',true);
  assert.equal(await evaluate(`document.querySelectorAll('#opponent .actionable').length`),0);
  assert.match(await evaluate(`document.getElementById('action-hints').textContent`),/lá có thao tác hợp lệ/);
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
  await hand('Pot of Greed'); await click(textButton('#actions button', 'Kích hoạt')); await confirm();
  assert.equal(await evaluate(`document.querySelectorAll('.card.actionable').length`),0); await pass('b'); await pass('a');
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
  await marked('#self','Trap Hole',true); await marked('#self','Fissure',false);
  assert.equal(await evaluate(`document.querySelectorAll('#opponent .actionable').length`),0);
  await click(`document.querySelector('#self .zone-row:nth-child(3) .card')`);
  await click(textButton('#actions button', 'Kích hoạt Bẫy'));
  assert.equal(await evaluate(`[...document.querySelector('#action-fields select').options].filter(o=>!o.disabled).length`), 1);
  await chooseTarget(2); await confirm(); await pass('a'); await pass('b');
  assert.equal(await evaluate('view.players[0].monsters[2]'), null);
  assert.match(await evaluate(`document.getElementById('status').textContent`), /1 quái bị phá bởi hiệu ứng/);
  await seat('a'); await pass('a'); await pass('b'); await seat('a');
  await actionClick(textButton('#turn-actions button', 'CHIẾN ĐẤU')); await pass('b');
  await seat('a'); await marked('#self','La Jinn the Mystical Genie of the Lamp',true);
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
  console.log(JSON.stringify({ browser: browser.brand, browserVersion: browserVersion.product, platform: process.platform, fixtureOnlyAtSetup: true, flipDecisionPreviews: true, radioSelectionSurvivesNetworkFailure: true, legalActionCues: ['main-hand', 'pass-only-chain', 'trap-summon-response', 'battle', 'mandatory-choice', 'own-only'], sharedBack: ['monster', 'spell', 'trap'], effectFlows: ['Pot of Greed', 'Fissure', 'Trap Hole', 'Hane-Hane', 'Man-Eater Bug'], interaction: 'mouse controls and dialogs', graveyard: ['empty', 'inline card text', 'top-first order', 'read-only both players'], runtimeExceptions: errors.length }));
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
