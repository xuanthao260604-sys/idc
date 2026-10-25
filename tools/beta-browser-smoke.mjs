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
const magicianFaith = process.argv.includes('--magician-faith');
const handKeyboard = process.argv.includes('--hand-keyboard');
const graveyardFilters = process.argv.includes('--graveyard-filters');
const activityFilters = process.argv.includes('--activity-filters');
const decisionCards = process.argv.includes('--decision-cards');
const fieldKeyboard = process.argv.includes('--field-keyboard');
const choiceIdentities = process.argv.includes('--choice-identities');
const handSorting = handKeyboard || process.argv.includes('--hand-sorting');
const faithBattleArg = process.argv.find(arg => /^--faith-battle=[ab]:[02]$/.test(arg));
const faithBattle = faithBattleArg ? { defender: faithBattleArg.split('=')[1].split(':')[0], spells: Number(faithBattleArg.split(':')[1]) } : null;
const earthquake = process.argv.includes('--earthquake');
const blockAttack = process.argv.includes('--block-attack');
const tributeDoomed = process.argv.includes('--tribute-doomed');
const reincarnationArg = process.argv.find(arg => /^--reincarnation=(grave|cost)$/.test(arg));
const reincarnationMode = reincarnationArg?.split('=')[1] ?? null;
const deckDraftGuard = process.argv.includes('--deck-draft-guard');
const deckSaveCheck = process.argv.includes('--deck-save-check');
const deckOverview = deckSaveCheck || deckDraftGuard || process.argv.includes('--deck-overview');
const expanded = choiceIdentities || graveyardFilters || handSorting || faithBattle !== null || magicianFaith || deckOverview || earthquake || blockAttack || reincarnationMode !== null || tributeDoomed || hammerShot || smashingGround || process.argv.includes('--expanded-catalog') || process.argv.includes('--expanded-duel') || lifePointsMode !== null;
const r = expanded ? loadRuntimeCatalog().registry : createRegistry((await read('data/generated/pilot.json')).cards, goat200508Format, {},
  await read('data/reviews/pilot.spell-effects.json'), await read('data/reviews/pilot.flip-effects.json'), await read('data/reviews/pilot.trap-effects.json'));
const deck = Object.keys(r.cards);
if (handSorting || graveyardFilters) deck.push(Object.values(r.cards).find(c=>c.name==='Battle Ox').id);
if (choiceIdentities) for(const name of ['Battle Ox','Celtic Guardian','Hane-Hane','Fissure'])deck.push(Object.values(r.cards).find(c=>c.name===name).id);
for (const c of Object.values(r.cards)) if (!expanded && c.legality.maxCopies >= 2) deck.push(c.id);
for (const c of Object.values(r.cards)) if (!expanded && deck.length < 40 && c.legality.maxCopies >= 3) deck.push(c.id);
const fullDuel = process.argv.includes('--full-duel') || process.argv.includes('--expanded-duel');
const newGame = process.argv.includes('--new-game');
const discard = process.argv.includes('--discard');
const concede = process.argv.includes('--concede');
const deckBuilder = process.argv.includes('--deck-builder');
const chainView = process.argv.includes('--chain-view');
const deckOutArg = process.argv.find(arg => /^--deck-out=[012]$/.test(arg));
const deckOut = deckOutArg === undefined ? null : Number(deckOutArg.split('=')[1]);
const s = structuredClone(createDuel(r, { duelId: fullDuel ? 'mixed-smoke' : 'browser-fixture', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: fullDuel ? (expanded ? '09' : '08').padStart(64, '0') : '12'.repeat(32) }).state);
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
if (!fullDuel && !newGame && !discard && !concede && !deckBuilder && !chainView && !decisionCards && !fieldKeyboard && !expanded && deckOut === null) {
move('Pot of Greed', 'a', 'hand'); move('Fissure', 'a', 'hand'); move('Battle Ox', 'a', 'hand');
move('La Jinn the Mystical Genie of the Lamp', 'a', 'monster', 0); move('Celtic Guardian', 'a', 'monster', 1);
move('Mystical Elf', 'b', 'monster', 0); move('Hane-Hane', 'b', 'monster', 1, true); move('Man-Eater Bug', 'b', 'monster', 2, true); move('Trap Hole', 'b', 'spell-trap', 0, true); move('Fissure', 'b', 'spell-trap', 1, true);
s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
}
if (decisionCards) {
  move('Man-Eater Bug','b','monster',0,true);move('Battle Ox','b','monster',1);
  move('Celtic Guardian','a','monster',0);move('Mystical Elf','a','monster',1,true);
  s.turn.number=4;s.turn.activePlayer='b';s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='b';s.timing.consecutivePasses=0;
}
if (fieldKeyboard) {
  move('Battle Ox','a','monster',0);move('Mystical Elf','a','monster',2);move('Celtic Guardian','a','monster',4,true);
  move('Trap Hole','a','spell-trap',0,true);move('Fissure','a','spell-trap',2,true);move('Pot of Greed','a','spell-trap',4,true);
  move('La Jinn the Mystical Genie of the Lamp','b','monster',0);move('Hane-Hane','b','monster',2,true);move('Man-Eater Bug','b','monster',4,true);
  move('Trap Hole','b','spell-trap',2,true);
  s.turn.number=4;s.turn.activePlayer='b';s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='b';s.timing.consecutivePasses=0;
}
if (magicianFaith) {
  move('Magician of Faith','a','monster',0,true);
  move('Pot of Greed','a','graveyard');move('Fissure','a','graveyard');move('Trap Hole','a','graveyard');move('Battle Ox','a','graveyard');
  move('Pot of Greed','b','graveyard');move('Celtic Guardian','b','monster',0);
  s.turn.number=3;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='a';s.timing.consecutivePasses=0;
}
if (graveyardFilters) {
  for(const name of ['Pot of Greed','Trap Hole','Battle Ox','Magician of Faith','Battle Ox','Fissure'])move(name,'a','graveyard');
  for(const name of ['Pot of Greed','Man-Eater Bug','Hinotama'])move(name,'b','graveyard');
  move('Mystical Elf','a','monster',0);move('Hane-Hane','b','monster',0,true);
  s.turn.number=3;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='a';s.timing.consecutivePasses=0;
}
if (handSorting) {
  const p=s.players[0];
  for(const id of p.hand.splice(0)) {p.deck.push(id);s.cards[id].location={kind:'deck',playerId:'a'};}
  for(const name of ['Trap Hole','Battle Ox','Pot of Greed','Blue-Eyes White Dragon','Fissure','Magician of Faith','Battle Ox']) {
    const index=p.deck.findIndex(id=>r.cards[s.cards[id].definition.id].name===name),id=p.deck.splice(index,1)[0];
    assert.ok(id);p.hand.push(id);s.cards[id].location={kind:'hand',playerId:'a'};
  }
  s.turn.number=3;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='a';s.timing.consecutivePasses=0;
  if(handKeyboard) move('Hane-Hane','b','monster',0,true);
}
if (choiceIdentities) {
  const p=s.players[0];
  for(const id of p.hand.splice(0)){p.deck.push(id);s.cards[id].location={kind:'deck',playerId:'a'};}
  for(const name of ['Battle Ox','Gaia The Fierce Knight','Battle Ox','Monster Reincarnation','Tribute to The Doomed']) {
    const index=p.deck.findIndex(id=>r.cards[s.cards[id].definition.id].name===name),id=p.deck.splice(index,1)[0];
    assert.ok(id);p.hand.push(id);s.cards[id].location={kind:'hand',playerId:'a'};
  }
  for(const name of ['Fissure','Hane-Hane','Fissure','Hane-Hane'])move(name,'a','graveyard');
  move('Celtic Guardian','a','monster',0);move('Celtic Guardian','a','monster',2,true);move('Magician of Faith','a','monster',4,true);
  move('Man-Eater Bug','b','monster',1,true);
  s.turn.number=3;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='a';s.timing.consecutivePasses=0;
}
if (faithBattle) {
  const defender = faithBattle.defender, attacker = defender === 'a' ? 'b' : 'a';
  move('Magician of Faith',defender,'monster',0,true);
  move('Trap Hole',defender,'graveyard');move('Battle Ox',defender,'graveyard');
  if (faithBattle.spells) { move('Pot of Greed',defender,'graveyard');move('Fissure',defender,'graveyard'); }
  move('Pot of Greed',attacker,'graveyard');move('Celtic Guardian',attacker,'monster',0);
  s.turn.number=attacker==='a'?3:4;s.turn.activePlayer=attacker;s.turn.phase='main1';
  s.timing.window='open';s.timing.priorityPlayer=attacker;s.timing.consecutivePasses=0;
}
if (chainView) {
  move('Battle Ox','a','hand');move('Pot of Greed','a','hand');
  move('Trap Hole','b','spell-trap',0,true);move('Trap Hole','b','spell-trap',1,true);
  move('Man-Eater Bug','b','monster',0,true);
  s.turn.number=3;s.turn.phase='main1';s.timing.window='open';s.timing.priorityPlayer='a';s.timing.consecutivePasses=0;
}
if (expanded && !fullDuel && lifePointsMode === null && !smashingGround && !hammerShot && !tributeDoomed && !blockAttack && !earthquake && !magicianFaith && !faithBattle && !handSorting && !graveyardFilters && !choiceIdentities && !deckOverview && reincarnationMode === null) {
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
  async function closeDeck() {
    const previousAnswer=dialogAnswer;dialogAnswer=true;
    try { await click(`document.getElementById('deck-close')`);await wait(`!document.getElementById('deck-dialog').open`); }
    finally { dialogAnswer=previousAnswer; }
  }
  async function inspectChain(role, expectedName, escape = false, responsive = false) {
    const before=await evaluate('JSON.stringify(view)');
    await click(`document.querySelector('#chain-links [data-chain-card="${role}"]')`);
    await wait(`document.getElementById('chain-card-dialog').open`);
    assert.equal(await evaluate(`document.querySelectorAll('#chain-card-detail button').length`),0);
    assert.equal(await evaluate(`document.querySelector('#chain-card-detail h2').textContent`),expectedName??'Bài úp');
    if(expectedName){const d=Object.values(r.cards).find(c=>c.name===expectedName);assert.equal(await evaluate(`document.querySelector('#chain-card-detail p').textContent`),d.text);}
    else{assert.equal(await evaluate(`document.querySelectorAll('#chain-card-detail .card-preview').length`),0);assert.equal(await evaluate(`document.getElementById('chain-card-detail').textContent.includes('Man-Eater Bug')`),false);}
    if(responsive){
      for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]){
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        assert.equal(await evaluate(`(()=>{const e=document.getElementById('chain-card-dialog'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1&&r.height<=innerHeight})()`),true);
        if(process.argv.includes('--screenshots')){const folder=join(projectRoot,'artifacts','chain-card-preview');await mkdir(folder,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));}
      }
      await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    }
    if(escape){await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});}
    else await click(`document.getElementById('close-chain-card')`);
    await wait(`!document.getElementById('chain-card-dialog').open && document.getElementById('chain-card-detail').textContent==='' && document.getElementById('chain-card-location').textContent===''`);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
  }
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
  async function verifyActivityFilters(scope,hidePass) {
    const before=await evaluate('JSON.stringify(view)'),selection=await evaluate('JSON.stringify(selected)');
    if(!await evaluate(`document.querySelector('.activity-panel details').open`))await click(`document.querySelector('.activity-panel summary')`);
    await evaluate(`document.getElementById('activity-scope').value=${JSON.stringify(scope)};document.getElementById('activity-scope').dispatchEvent(new Event('change'))`);
    if(await evaluate(`document.getElementById('activity-hide-pass').checked`)!==hidePass)await click(`document.getElementById('activity-hide-pass')`);
    const v=await evaluate('view'),expected=v.activity.filter(e=>(scope!=='turn'||e.turn===v.turn.number)&&(!hidePass||e.action!=='pass'||e.resolution?.length)).map(e=>e.stateVersion).reverse();
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#activity li[data-state-version]')].map(e=>Number(e.dataset.stateVersion))`),expected);
    assert.equal(await evaluate(`document.getElementById('activity-results').textContent`),`Hiển thị ${expected.length}/${v.activity.length} thao tác đang lưu.`);
    assert.equal(await evaluate('JSON.stringify(view)'),before);assert.equal(await evaluate('JSON.stringify(selected)'),selection);
    return expected;
  }
  async function verifyResultSummary(reason) {
    const before=await evaluate('JSON.stringify(view)'),v=await evaluate('view');
    assert.equal(await evaluate(`document.getElementById('result-panel').hidden`),!v.result);
    if(!v.result) {
      for(const id of ['result-title','result-reason','result-turn','result-rows'])assert.equal(await evaluate(`document.getElementById(${JSON.stringify(id)}).textContent`),'');
      assert.equal(await evaluate(`document.getElementById('result-new-game').disabled`),true);
      return;
    }
    assert.equal(await evaluate(`document.getElementById('result-title').textContent`),`Kết quả trận · ${v.result.winner?'Người chơi '+v.result.winner.toUpperCase()+' thắng':'Hòa'}`);
    assert.match(await evaluate(`document.getElementById('result-reason').textContent`),new RegExp(reason));
    assert.match(await evaluate(`document.getElementById('result-turn').textContent`),new RegExp(`Lượt ${v.turn.number} ·`));
    const byId=id=>v.players.find(p=>p.playerId===id),hand=id=>id===v.viewerId?v.selfHand.length:v.opponentHandCount;
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#result-rows tr')].map(r=>[...r.children].map(c=>c.textContent))`),[
      ['LP',...['a','b'].map(id=>String(byId(id).lifePoints))],
      ['Bài trên tay',...['a','b'].map(id=>String(hand(id)))],
      ['Bài trong Deck',...['a','b'].map(id=>String(byId(id).deckCount))],
      ['Bài trong Mộ',...['a','b'].map(id=>String(byId(id).graveyard.length))],
    ]);
    assert.equal(await evaluate(`document.querySelectorAll('#result-panel button').length`),1);
    assert.equal(await evaluate(`document.getElementById('result-new-game').disabled`),false);
    assert.equal(await evaluate(`document.querySelectorAll('#result-panel .card,#result-panel [data-card-handle]').length`),0);
    const summary=await evaluate(`document.getElementById('result-panel').textContent`);
    assert.ok(Object.values(r.cards).every(c=>!summary.includes(c.name)), 'Summary must contain counts, never card identities');
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    return summary;
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
        if (expanded) assert.ok(usedEffects.has('Magician of Faith'), 'Expanded duel must exercise the new reviewed FLIP');
        assert.equal(errors.length, 0); assert.equal(await evaluate(`document.getElementById('battle-status').hidden`),true); assert.equal(await evaluate(`document.getElementById('summon-quota').hidden`),true); assert.equal(v.chain.length, 0); assert.equal(v.decision, null);
        assert.match(await evaluate(`document.getElementById('timing').textContent`), /thắng/);
        assert.equal(v.stateVersion, actions);
        assert.match(await evaluate(`document.getElementById('guide-title').textContent`), /thắng/);
        assert.equal(await evaluate(`document.getElementById('concede').disabled`), true);
        assert.equal(v.activity.length, Math.min(actions,60));
        assert.ok(v.activity.some(e=>e.resolution?.some(f=>f.kind==='battle-damage')));
        assert.match(await evaluate(`document.getElementById('activity').textContent`), /sát thương chiến đấu/);
        for(const entry of v.activity) assert.deepEqual(Object.keys(entry).filter(k=>k!=='resolution').sort(), ['action','actorId','phase','stateVersion','turn']);
        for(const scope of ['all','turn'])for(const hidePass of [false,true])await verifyActivityFilters(scope,hidePass);
        await verifyActivityFilters('all',false);
        const summary=await verifyResultSummary('điểm gốc về 0');
        for(const who of ['a','b']) {await seat(who);assert.equal(await verifyResultSummary('điểm gốc về 0'),summary);}
        assert.equal(errors.length,0);
        console.log(JSON.stringify({ browser: browser.brand, browserVersion: browserVersion.product, platform: process.platform, mode: expanded ? 'natural-expanded-duel' : 'natural-full-duel', catalogDefinitions: Object.keys(r.cards).length, openingHands: [6, 5],
          turns: v.turn.number, acceptedCommands: actions, attacks, decisions, effectsUsed: [...usedEffects].sort(),
          result: v.result, lifePoints: v.players.map(p=>p.lifePoints), stateEditedDuringPlay: false,resultSummary:true,activityFilteringAtHistoryLimit:true,battleCues:true,directAttackCues:true, runtimeExceptions: errors.length }));
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
            assert.equal(await evaluate('view.normalSummonQuota.remaining'),0);
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
          assert.equal(await evaluate(`document.getElementById('battle-status').hidden`),false);
          assert.equal(await evaluate(`document.querySelectorAll('.battle-attacker').length`),1);
          assert.equal(await evaluate(`document.querySelectorAll('.battle-target').length`),target?1:0);
          if(!target)assert.match(await evaluate(`document.getElementById('battle-status').textContent`),/Tấn công trực tiếp/);

          attacked.add(slot); attacks++; actions++; continue;
        }
        await advance('MAIN 2'); actions++; continue;
      }
      await advance('Sang lượt đối thủ'); actions++;
    }
  }
  await send('Runtime.enable'); await send('Page.enable'); await send('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
  await wait(`document.getElementById('seat-dialog')?.open`); await seat('a');
  await verifyResultSummary();
  if (choiceIdentities) {
    const commands=[],previousOnMessage=ws.onmessage;
    ws.onmessage=event=>{
      const m=JSON.parse(event.data);
      if(m.method==='Network.requestWillBeSent'&&m.params.request.url.endsWith('/api/command'))commands.push(JSON.parse(m.params.request.postData));
      previousOnMessage(event);
    };
    await send('Network.enable');
    await seat('b');const savedB=await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`);
    assert.equal(await evaluate(`document.querySelector('#opponent .slot:nth-child(3) .card').getAttribute('aria-label').includes('Celtic Guardian')`),false);
    await seat('a');const savedA=await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`);
    const before=await evaluate('JSON.stringify(view)'),originalHand=await evaluate('view.selfHand.map(c=>c.handle)');
    const ox=originalHand[2],recoveryTarget=await evaluate('view.players[0].graveyard[3].handle');
    await click(`document.getElementById('hand-sort')`);
    await evaluate(`document.getElementById('hand-sort').value='name';document.getElementById('hand-sort').dispatchEvent(new Event('change'))`);
    const oxLabels=await evaluate(`[...document.querySelectorAll('#hand .card')].filter(c=>c.querySelector('.card-name').textContent==='Battle Ox').map(c=>c.getAttribute('aria-label'))`);
    assert.equal(new Set(oxLabels).size,2);assert.match(oxLabels[0],/vị trí 1 theo thứ tự nhận/);assert.match(oxLabels[1],/vị trí 3 theo thứ tự nhận/);
    await click(`[...document.querySelectorAll('#hand .card')].find(c=>c.dataset.cardHandle===${JSON.stringify(ox)})`);
    assert.match(await evaluate(`document.querySelector('#detail .choice-location').textContent`),/vị trí 3 theo thứ tự nhận/);
    await hand('Gaia The Fierce Knight');await click(textButton('#actions button','Triệu hồi'));
    const tributeLabels=await evaluate(`[...document.querySelectorAll('#action-fields input[type="checkbox"]')].map(e=>e.parentElement.textContent)`);
    assert.match(tributeLabels[0],/Quái ô 1 — Celtic Guardian/);assert.match(tributeLabels[1],/Quái ô 3 — Celtic Guardian/);
    await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[0]`);await click(`document.querySelectorAll('#action-fields input[type="checkbox"]')[1]`);
    assert.match(await evaluate(`document.querySelector('[data-preview="tributes"]').textContent`),/Quái ô 1/);
    assert.match(await evaluate(`document.querySelector('[data-preview="tributes"]').textContent`),/Quái ô 3/);
    await click(`document.getElementById('cancel-action')`);assert.equal(await evaluate('JSON.stringify(view)'),before);assert.equal(commands.length,0);
    await hand('Monster Reincarnation');await click(textButton('#actions button','Kích hoạt'));
    const costs=await evaluate(`[...document.querySelector('#action-fields select[name="discard"]').options].filter(o=>o.textContent.includes('Battle Ox')).map(o=>({text:o.textContent,value:o.value}))`);
    assert.equal(costs.length,2);assert.equal(new Set(costs.map(o=>o.text)).size,2);assert.deepEqual(costs.map(o=>o.value),[originalHand[0],ox]);
    const targets=await evaluate(`[...document.querySelector('#action-fields select[name="target"]').options].filter(o=>o.textContent.includes('Mộ')&&o.textContent.includes('Hane-Hane')).map(o=>o.textContent)`);
    assert.equal(targets.length,2);assert.match(targets[0],/vị trí 3 từ trên xuống/);assert.match(targets[1],/vị trí 1 từ trên xuống/);
    await evaluate(`(()=>{const d=document.querySelector('#action-fields select[name="discard"]');d.value=${JSON.stringify(ox)};d.dispatchEvent(new Event('change',{bubbles:true}));const t=document.querySelector('#action-fields select[name="target"]');t.value=${JSON.stringify(recoveryTarget)};t.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await preview('discard','Battle Ox');await preview('target','Hane-Hane');
    assert.match(await evaluate(`document.querySelector('[data-preview="discard"] .choice-location').textContent`),/vị trí 3 theo thứ tự nhận/);
    assert.match(await evaluate(`document.querySelector('[data-preview="target"] .choice-location').textContent`),/vị trí 1 từ trên xuống/);
    assert.equal(await evaluate('JSON.stringify(view)'),before);assert.equal(commands.length,0);
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const d=document.getElementById('action-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1&&r.height<=innerHeight})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','choice-identities');await mkdir(folder,{recursive:true});
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    // Cancel/reopen must neither send a command nor keep a discarded dialog selection.
    await click(`document.getElementById('cancel-action')`);assert.equal(await evaluate('JSON.stringify(view)'),before);
    await click(textButton('#actions button','Kích hoạt'));
    await evaluate(`(()=>{const f=document.getElementById('action-fields');f.querySelector('select[name="discard"]').value=${JSON.stringify(ox)};f.querySelector('select[name="target"]').value=${JSON.stringify(recoveryTarget)};f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await confirm();assert.equal(commands[0].action.discardHandle,ox);assert.equal(commands[0].action.targetHandle,recoveryTarget);
    // Distinct cards between the copies prove which instance left each ordered zone, despite rotated handles.
    assert.deepEqual(await evaluate('view.selfHand.map(c=>label(c))'),['Battle Ox','Gaia The Fierce Knight','Tribute to The Doomed']);
    assert.equal(await evaluate('view.chain[0].targetHandles[0]===view.players[0].graveyard[3].handle'),true);
    await pass('b');await pass('a');
    assert.deepEqual(await evaluate('view.selfHand.map(c=>label(c))'),['Battle Ox','Gaia The Fierce Knight','Tribute to The Doomed','Hane-Hane']);
    assert.deepEqual(await evaluate('view.players[0].graveyard.map(c=>label(c))'),['Fissure','Hane-Hane','Fissure','Battle Ox','Monster Reincarnation']);
    await pass('a');await pass('b');await seat('a');
    await click(`document.querySelector('#self .zone-row:nth-child(2) .slot:nth-child(5) button')`);await actionClick(textButton('#actions button','Flip Summon'));
    const decisions=await evaluate(`[...document.querySelectorAll('#decision-form label')].map(e=>e.textContent)`);
    const fissureLabels=decisions.filter(t=>t.includes('Fissure'));
    assert.equal(fissureLabels.length,2);assert.match(fissureLabels[0],/vị trí 5 từ trên xuống/);assert.match(fissureLabels[1],/vị trí 3 từ trên xuống/);
    const target=await evaluate('view.players[0].graveyard[2].handle');
    const index=await evaluate(`[...document.querySelectorAll('#decision-form input')].findIndex(e=>e.value===${JSON.stringify(target)})`);
    const pendingView=await evaluate('JSON.stringify(view)');await inspectDecision(index);
    assert.equal(await evaluate('JSON.stringify(view)'),pendingView);
    await click(`[...document.querySelectorAll('#decision-form input')].find(e=>e.value===${JSON.stringify(target)})`);
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.equal(commands.find(c=>c.action.type==='answer-decision').action.optionIds[0],target);
    await pass('b');await pass('a');
    assert.deepEqual(await evaluate('view.players[0].graveyard.map(c=>label(c))'),['Fissure','Hane-Hane','Battle Ox','Monster Reincarnation']);
    assert.deepEqual(await evaluate('view.selfHand.map(c=>label(c))'),['Battle Ox','Gaia The Fierce Knight','Tribute to The Doomed','Hane-Hane','Fissure']);
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);assert.equal(await evaluate('view.normalSummonQuota.remaining'),1);
    assert.equal(await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`),savedA);await seat('b');
    assert.equal(await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`),savedB);assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'choice-identities',catalog:109,
      handOriginalPositionsAfterSort:true,duplicateTributesDistinct:true,duplicateCostsDistinct:true,graveyardTopFirstPositions:true,
      cancelledChoicePreservesState:true,exactDiscardAndRecoveryCopies:true,duplicateFaithTargetsDistinct:true,exactFaithRecoveryCopy:true,
      previewsReadOnly:true,hiddenOpponentPrivacy:true,responsive:true,savedDecksUnchanged:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (fieldKeyboard) {
    const commands=[],previousOnMessage=ws.onmessage;
    ws.onmessage=event=>{
      const m=JSON.parse(event.data);
      if(m.method==='Network.requestWillBeSent'&&m.params.request.url.endsWith('/api/command'))commands.push(JSON.parse(m.params.request.postData));
      previousOnMessage(event);
    };
    await send('Network.enable');
    const key=async(key,code,windowsVirtualKeyCode,modifiers=0)=>{
      await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode,modifiers,...(code==='Space'?{text:' '}:code==='Enter'?{text:'\r'}:{})});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode,modifiers});
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    };
    const savedDecks={};
    for(const who of ['a','b']) {
      await seat(who);savedDecks[who]=await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`);
      const before=await evaluate('JSON.stringify(view)');
      for(const side of ['self','opponent'])for(const rowIndex of [2,3]) {
        const row=`document.querySelector('#${side} .zone-row:nth-child(${rowIndex})')`;
        const owner=side==='self'?who:who==='a'?'b':'a';
        const slots=await evaluate(`[...${row}.querySelectorAll('.slot')].flatMap((s,i)=>s.querySelector('button')?[i]:[])`);
        const card=slot=>`${row}.querySelector('.slot:nth-child(${slot+1}) button')`;
        const focused=()=>evaluate(`[...${row}.children].indexOf(document.activeElement.parentElement)`);
        assert.ok(slots.length);assert.equal(await evaluate(`${row}.getAttribute('role')`),'group');
        assert.match(await evaluate(`${row}.getAttribute('aria-label')`),new RegExp('Người chơi '+owner.toUpperCase()));
        await evaluate(`${card(slots[0])}.focus()`);
        await key('Home','Home',36);await key('ArrowLeft','ArrowLeft',37);assert.equal(await focused(),slots[0]);
        await key('ArrowRight','ArrowRight',39);assert.equal(await focused(),slots[1]??slots[0]);
        await key('End','End',35);await key('ArrowRight','ArrowRight',39);assert.equal(await focused(),slots.at(-1));
        await key('Home','Home',36);await key('End','End',35,8);await key('End','End',35,2);
        assert.equal(await focused(),slots[0]);
        if(slots.length>1) {
          await key('Tab','Tab',9);assert.equal(await focused(),slots[1]);
          await key('Tab','Tab',9,8);assert.equal(await focused(),slots[0]);
        }
        await key('Enter','Enter',13);
        const first=await evaluate('selected.card.handle');assert.equal(await focused(),slots[0]);
        await key('End','End',35);assert.equal(await evaluate('selected.card.handle'),first);
        await key(' ','Space',32);assert.equal(await focused(),slots.at(-1));
        assert.equal(await evaluate('selected.player'),owner);assert.equal(await evaluate('selected.slot'),slots.at(-1));
        const aria=await evaluate('document.activeElement.getAttribute("aria-label")');
        assert.match(aria,new RegExp('Người chơi '+owner.toUpperCase()));assert.match(aria,new RegExp('ô '+(slots.at(-1)+1)));
        const visible=await evaluate('selected.card');
        if(visible.visibility==='known')assert.equal(await evaluate(`document.querySelector('#detail h2').textContent`),r.cards[visible.definition.id].name);
        else {
          assert.match(aria,/Bài úp/);assert.equal(await evaluate(`document.querySelector('#detail h2').textContent`),'Bài úp');
          assert.equal(await evaluate(`document.querySelector('#detail .card-preview')`),null);
          assert.equal(await evaluate(`document.activeElement.querySelector('.card-name')`),null);
          assert.equal(visible.definition,undefined);
        }
        // Tab leaves the row naturally, including a one-card row, rather than trapping focus.
        await key('Tab','Tab',9);assert.equal(await evaluate(`document.activeElement.closest('.zone-row')===${row}`),false);
        assert.equal(await evaluate('JSON.stringify(view)'),before);assert.equal(commands.length,0);
      }
    }
    const hiddenRow=`document.querySelector('#opponent .zone-row:nth-child(3)')`;
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate(`${hiddenRow}.querySelector('button').focus()`);await key('End','End',35);
      assert.equal(await evaluate(`(()=>{const r=document.activeElement.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','field-keyboard');await mkdir(folder,{recursive:true});
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    // Flip via keyboard, then move focus among real decision targets without selecting or submitting.
    await evaluate(`document.querySelector('#self .zone-row:nth-child(2) .slot:nth-child(5) button').focus()`);await key('Enter','Enter',13);
    await evaluate(`${textButton('#actions button','Flip Summon')}.focus()`);let version=await evaluate('view.stateVersion');
    await key('Enter','Enter',13);await wait(`!busy&&view.stateVersion>${version}`);
    assert.equal(await evaluate('view.decision.optionIds.length'),6);assert.equal(commands.length,1);
    const beforeDecision=await evaluate('JSON.stringify(view)');
    await evaluate(`${hiddenRow}.querySelector('button').focus()`);await key('End','End',35);
    assert.deepEqual(await evaluate('decisionDraft.optionIds'),[]);
    await key(' ','Space',32);
    const chosen=await evaluate('selected.card.handle');
    assert.equal(await evaluate('document.activeElement.dataset.decisionHandle'),chosen);
    assert.equal(await evaluate(`document.querySelector('#decision-form input:checked').value`),chosen);
    assert.equal(await evaluate(`document.querySelector('#detail h2').textContent`),'Bài úp');
    await key('Home','Home',36);await key('ArrowRight','ArrowRight',39);
    assert.deepEqual(await evaluate('decisionDraft.optionIds'),[chosen]);
    await key('Enter','Enter',13);
    assert.notEqual(await evaluate('selected.card.handle'),chosen);assert.equal(await evaluate(`document.querySelectorAll('main .decision-chosen').length`),1);
    await key('End','End',35);await key(' ','Space',32);
    assert.deepEqual(await evaluate('decisionDraft.optionIds'),[chosen]);
    assert.equal(await evaluate('JSON.stringify(view)'),beforeDecision);assert.equal(commands.length,1);
    version=await evaluate('view.stateVersion');
    await evaluate(`document.querySelector('#decision-form button[type="submit"]').focus()`);await key('Enter','Enter',13);
    await wait(`!busy&&view.stateVersion>${version}`);assert.equal(commands[1].action.optionIds[0],chosen);
    assert.equal(await evaluate(`document.querySelectorAll('main .decision-choice').length`),0);
    await pass('a');await pass('b');
    assert.equal(await evaluate('view.players[0].monsters[4]'),null);
    assert.equal(await evaluate(`view.players[0].graveyard.filter(c=>catalog.get(c.definition.id).name==='Celtic Guardian').length`),1);
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);
    for(const who of ['a','b']) {await seat(who);assert.equal(await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`),savedDecks[who]);}
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'field-keyboard',catalog:20,
      bothSeatsAndRows:true,emptySlotsSkipped:true,singleCardRow:true,boundedNavigation:true,modifierKeysIgnored:true,nativeTab:true,
      nativeEnterSpace:true,focusAfterRender:true,ownerAndSlotLabels:true,hiddenOpponentPrivacy:true,readOnlyNavigation:true,
      decisionFocusDoesNotChoose:true,keyboardDecisionExplicitConfirm:true,responsive:true,savedDecksUnchanged:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (decisionCards) {
    await seat('b');await click(`document.querySelector('#self .zone-row:nth-child(2) .slot:nth-child(1) .card')`);
    await actionClick(textButton('#actions button','Flip Summon'));
    assert.equal(await evaluate('view.decision.kind'),'target');assert.equal(await evaluate('view.decision.optionIds.length'),4);
    const before=await evaluate('JSON.stringify(view)');
    assert.equal(await evaluate(`document.querySelectorAll('main .decision-choice').length`),4);
    assert.equal(await evaluate(`document.querySelectorAll('main .decision-chosen').length`),0);
    const hidden=`document.querySelector('#opponent .zone-row:nth-child(3) .slot:nth-child(2) .card')`;
    await click(hidden);
    const handle=await evaluate(`${hidden}.dataset.decisionHandle`);
    assert.equal(await evaluate(`${hidden}.getAttribute('aria-pressed')`),'true');
    assert.equal(await evaluate(`document.querySelector('#decision-form input:checked').value`),handle);
    assert.equal(await evaluate(`document.querySelector('#detail h2').textContent`),'Bài úp');
    assert.equal(await evaluate(`document.querySelector('#detail .card-preview')`),null);
    assert.equal(await evaluate(`${hidden}.querySelector('.card-name')`),null);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    // The radio list and board must stay in sync in both directions.
    await click(`document.querySelectorAll('#decision-form input')[0]`);
    assert.equal(await evaluate(`document.querySelector('main .decision-chosen').dataset.decisionHandle`),await evaluate(`document.querySelector('#decision-form input:checked').value`));
    assert.equal(await evaluate(`document.querySelectorAll('main .decision-chosen').length`),1);
    await click(hidden);assert.equal(await evaluate(`document.querySelectorAll('main .decision-chosen').length`),1);
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const e=document.querySelector('main .decision-chosen'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','decision-cards');await mkdir(folder,{recursive:true});await evaluate(`${hidden}.scrollIntoView({block:'center'})`);
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await seat('a');assert.equal(await evaluate('view.decision'),null);assert.equal(await evaluate(`document.querySelectorAll('main .decision-choice').length`),0);
    await seat('b');assert.equal(await evaluate(`document.querySelectorAll('main .decision-chosen').length`),0);
    await click(hidden);const version=await evaluate('view.stateVersion');
    assert.equal(await evaluate('view.chain.length'),0);
    await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.equal(await evaluate('view.stateVersion'),version+1);assert.equal(await evaluate(`document.querySelectorAll('main .decision-choice').length`),0);
    await inspectChain('target',null);await pass('a');await pass('b');
    assert.equal(await evaluate('view.players[0].monsters[1]'),null);
    assert.equal(await evaluate(`view.players[0].graveyard.filter(c=>catalog.get(c.definition.id).name==='Mystical Elf').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('main .decision-choice').length`),0);
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'decision-cards',catalog:20,
      privateCandidatesOnly:true,boardAndRadioSync:true,hiddenTargetKeptHidden:true,selectionDoesNotSubmit:true,
      explicitConfirm:true,seatClearsDraft:true,cuesClearedAfterDecision:true,responsive:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (activityFilters) {
    let commands=0;const previousOnMessage=ws.onmessage;
    ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Network.requestWillBeSent'&&m.params.request.url.endsWith('/api/command'))commands++;previousOnMessage(event);};
    await send('Network.enable');await verifyActivityFilters('turn',true);
    assert.match(await evaluate(`document.getElementById('activity').textContent`),/Chưa có thao tác/);
    await hand('Fissure');await click(textButton('#actions button','Úp bài'));await confirm();
    const setVersion=await evaluate('view.stateVersion');await pass('a');await pass('b');await seat('a');
    let count=commands;assert.deepEqual(await verifyActivityFilters('all',true),[setVersion]);assert.equal(commands,count);
    assert.equal(await evaluate(`document.getElementById('activity').textContent.includes('Fissure')`),false);
    assert.match(await evaluate(`document.getElementById('activity').textContent`),/MAIN 1/);
    await hand('Pot of Greed');await click(textButton('#actions button','Kích hoạt'));await confirm();
    const activation=await evaluate('view.stateVersion');await pass('b');const emptyPass=await evaluate('view.stateVersion');await pass('a');
    const resolution=await evaluate('view.stateVersion');count=commands;
    const visible=await verifyActivityFilters('turn',true);
    assert.ok(visible.includes(resolution));assert.ok(visible.includes(activation));assert.ok(!visible.includes(emptyPass));
    assert.match(await evaluate(`document.getElementById('activity').textContent`),/bốc 2 lá/);
    assert.equal(await evaluate(`['Fissure','Pot of Greed','Trap Hole','Hane-Hane'].some(name=>document.getElementById('activity').textContent.includes(name))`),false);
    assert.equal(commands,count);
    await pass('a');await pass('b');await seat('a');
    await actionClick(textButton('#turn-actions button','KẾT THÚC'));await pass('b');await seat('a');
    if(await evaluate('!!view.decision')) {
      const needed=await evaluate('view.decision.min');
      for(let i=0;i<needed;i++)await click(`document.querySelectorAll('#decision-form input')[${i}]`);
      await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);await pass('a');await pass('b');await seat('a');
    }
    await actionClick(textButton('#turn-actions button','Sang lượt đối thủ'));await seat('b');
    await verifyActivityFilters('turn',true);const oldTurn=await evaluate('view.turn.number');await pass('b');
    assert.equal(await evaluate('view.turn.number'),oldTurn+1);
    assert.equal(await evaluate(`document.getElementById('activity-scope').value`),'turn');
    assert.equal(await evaluate(`document.getElementById('activity-hide-pass').checked`),true);
    assert.deepEqual(await verifyActivityFilters('turn',true),[]);
    assert.match(await evaluate(`document.getElementById('activity').textContent`),/Không có thao tác phù hợp/);
    await verifyActivityFilters('turn',false);await pass('b');
    assert.equal((await verifyActivityFilters('turn',false)).length,1);
    await seat('a');assert.equal(await evaluate(`document.getElementById('activity-scope').value`),'all');
    assert.equal(await evaluate(`document.getElementById('activity-hide-pass').checked`),false);
    count=commands;await verifyActivityFilters('all',true);await verifyActivityFilters('turn',false);assert.equal(commands,count);
    const refreshVersion=await evaluate('view.stateVersion');await click(`document.getElementById('refresh')`);
    await wait(`!busy&&document.getElementById('status').textContent.includes('Đã cập nhật')`);
    assert.equal(await evaluate('view.stateVersion'),refreshVersion);
    assert.equal(await evaluate(`document.getElementById('activity-scope').value`),'turn');assert.equal(await evaluate(`document.getElementById('activity-hide-pass').checked`),false);
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const e=document.querySelector('.activity-panel'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','activity-filters');await mkdir(folder,{recursive:true});await evaluate(`document.querySelector('.activity-panel').scrollIntoView({block:'center'})`);
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const id=await evaluate('view.duelId');await click(`document.getElementById('reset')`);await click(`document.querySelector('#new-game-form input[value="a"]')`);
    await click(`document.querySelector('#new-game-form button[type="submit"]')`);await wait(`!busy&&view.duelId!==${JSON.stringify(id)}&&!document.getElementById('new-game-dialog').open`);
    assert.equal(await evaluate('view.activity.length'),0);assert.equal(await evaluate(`document.getElementById('activity-scope').value`),'all');
    assert.equal(await evaluate(`document.getElementById('activity-hide-pass').checked`),false);assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'activity-filters',catalog:20,
      currentTurnAndAll:true,emptyPassHidden:true,resolvingPassKept:true,setIdentityHidden:true,phaseContext:true,
      liveTurnUpdate:true,refreshPreservesFilters:true,seatAndDuelReset:true,readOnlyFilters:true,responsive:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (graveyardFilters) {
    let commands=0;const previousOnMessage=ws.onmessage;
    ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.method==='Network.requestWillBeSent'&&m.params.request.url.endsWith('/api/command'))commands++;previousOnMessage(event);};
    await send('Network.enable');
    const open=async(side)=>{await click(`document.querySelector('#${side} .zone-info button')`);await wait(`document.getElementById('graveyard-dialog').open`);};
    const rows=()=>evaluate(`[...document.querySelectorAll('#graveyard-cards button.card')].map(c=>({name:c.querySelector('.card-name').textContent,slot:Number(c.dataset.graveyardSlot),handle:c.dataset.graveyardHandle}))`);
    const kind=async(value)=>evaluate(`document.getElementById('graveyard-kind').value=${JSON.stringify(value)};document.getElementById('graveyard-kind').dispatchEvent(new Event('change'))`);
    const search=async(text)=>{await evaluate(`document.getElementById('graveyard-search').value='';document.getElementById('graveyard-search').dispatchEvent(new Event('input'))`);await click(`document.getElementById('graveyard-search')`);await send('Input.insertText',{text});};
    const read=async(index)=>click(`document.querySelectorAll('#graveyard-cards button.card')[${index}]`);
    await click(`document.querySelector('#self .zone-row:nth-child(2) .card')`);
    const before=await evaluate('JSON.stringify(view)'),selectedBefore=await evaluate('selected.card.handle');
    await open('self');
    const all=await rows();
    assert.deepEqual(all.map(c=>c.name),['Fissure','Battle Ox','Magician of Faith','Battle Ox','Trap Hole','Pot of Greed']);
    assert.deepEqual(all.map(c=>c.slot),[0,1,2,3,4,5]);
    assert.equal(new Set(all.filter(c=>c.name==='Battle Ox').map(c=>c.handle)).size,2);
    await search('  bAtTlE  ');assert.deepEqual((await rows()).map(c=>c.slot),[1,3]);
    assert.equal(await evaluate(`document.getElementById('graveyard-results').textContent`),'Hiển thị 2/6 lá.');
    await read(1);assert.equal(await evaluate(`document.querySelector('#graveyard-detail h2').textContent`),'Battle Ox');
    assert.equal(await evaluate(`document.querySelector('#graveyard-cards .selected').dataset.graveyardHandle`),all[3].handle);
    assert.match(await evaluate(`document.querySelector('#graveyard-cards .selected').getAttribute('aria-label')`),/vị trí 4 từ trên xuống/);
    await kind('monster');assert.deepEqual((await rows()).map(c=>c.slot),[1,3]);
    assert.equal(await evaluate(`document.querySelector('#graveyard-detail h2').textContent`),'Battle Ox');
    await search('');assert.deepEqual((await rows()).map(c=>c.slot),[1,2,3]);
    await kind('spell');assert.deepEqual((await rows()).map(c=>c.name),['Fissure','Pot of Greed']);
    assert.equal(await evaluate(`document.querySelector('#graveyard-detail h2')`),null);
    await search('draw 2');assert.deepEqual((await rows()).map(c=>c.slot),[5]);
    await read(0);assert.equal(await evaluate(`document.querySelector('#graveyard-detail h2').textContent`),'Pot of Greed');
    assert.equal(await evaluate(`document.querySelector('#graveyard-detail p').textContent`),Object.values(r.cards).find(c=>c.name==='Pot of Greed').text);
    await kind('all');assert.equal(await evaluate(`document.querySelector('#graveyard-detail h2').textContent`),'Pot of Greed');
    await kind('trap');assert.equal((await rows()).length,0);
    assert.match(await evaluate(`document.getElementById('graveyard-cards').textContent`),/Không có lá phù hợp/);
    assert.equal(await evaluate(`document.querySelector('#graveyard-detail h2')`),null);
    await search('');assert.deepEqual((await rows()).map(c=>c.name),['Trap Hole']);
    await kind('all');
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const d=document.getElementById('graveyard-dialog'),r=d.getBoundingClientRect(),s=document.getElementById('graveyard-search').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1&&s.right<=r.right&&r.height<=innerHeight})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','graveyard-filters');await mkdir(folder,{recursive:true});
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await search('Battle');await evaluate(`document.getElementById('close-graveyard').focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await wait(`!document.getElementById('graveyard-dialog').open`);
    assert.equal(await evaluate('graveyardContext'),null);assert.equal(await evaluate(`document.getElementById('graveyard-detail').textContent`),'');
    assert.equal(await evaluate(`document.querySelectorAll('#graveyard-cards button').length`),0);
    assert.equal(await evaluate('selected.card.handle'),selectedBefore);
    await open('opponent');assert.equal(await evaluate(`document.getElementById('graveyard-search').value`),'');
    assert.equal(await evaluate(`document.getElementById('graveyard-kind').value`),'all');
    assert.deepEqual((await rows()).map(c=>c.name),['Hinotama','Man-Eater Bug','Pot of Greed']);
    await search('Hane-Hane');assert.equal((await rows()).length,0);
    await search('');await kind('spell');assert.deepEqual((await rows()).map(c=>c.name),['Hinotama','Pot of Greed']);
    await read(1);await click(`document.getElementById('close-graveyard')`);
    assert.equal(await evaluate('graveyardContext'),null);await open('self');
    assert.deepEqual(await rows(),all);await click(`document.getElementById('close-graveyard')`);
    assert.equal(await evaluate('JSON.stringify(view)'),before);assert.equal(commands,0);
    await seat('b');const bBefore=await evaluate('JSON.stringify(view)');await open('self');
    assert.deepEqual((await rows()).map(c=>c.name),['Hinotama','Man-Eater Bug','Pot of Greed']);
    await kind('monster');assert.deepEqual((await rows()).map(c=>c.name),['Man-Eater Bug']);
    await read(0);await click(`document.getElementById('close-graveyard')`);assert.equal(await evaluate('JSON.stringify(view)'),bBefore);
    const duelId=await evaluate('view.duelId');await click(`document.getElementById('reset')`);
    await click(`document.querySelector('#new-game-form input[value="a"]')`);await click(`document.querySelector('#new-game-form button[type="submit"]')`);
    await wait(`!busy&&view.duelId!==${JSON.stringify(duelId)}&&!document.getElementById('new-game-dialog').open`);
    const empty=await evaluate('JSON.stringify(view)');await open('self');
    assert.equal((await rows()).length,0);assert.match(await evaluate(`document.getElementById('graveyard-detail').textContent`),/Mộ đang trống/);
    assert.equal(await evaluate(`document.getElementById('graveyard-search').disabled&&document.getElementById('graveyard-kind').disabled`),true);
    assert.equal(await evaluate(`document.getElementById('graveyard-results').textContent`),'Hiển thị 0/0 lá.');
    await click(`document.getElementById('close-graveyard')`);assert.equal(await evaluate('JSON.stringify(view)'),empty);assert.equal(commands,0);
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'graveyard-filters',catalog:109,
      nameAndTextSearch:true,combinedKindFilters:true,duplicatesPreserved:true,originalPositionsPreserved:true,
      previewClearedWhenHidden:true,filtersResetOnReopen:true,seatIndependent:true,emptyGraveyard:true,
      readOnlyViews:true,noDuelCommands:true,hiddenCardsExcluded:true,responsive:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (deckSaveCheck) {
    const writes=[],previousOnMessage=ws.onmessage;
    ws.onmessage=event=>{
      const m=JSON.parse(event.data);
      if(m.method==='Network.requestWillBeSent'&&m.params.request.url.endsWith('/api/deck')&&m.params.request.method==='POST')writes.push(JSON.parse(m.params.request.postData));
      previousOnMessage(event);
    };
    await send('Network.enable');
    const openDeck=async()=>{await click(`document.getElementById('deck-builder')`);await wait(`!busy&&document.getElementById('deck-dialog').open`);};
    const change=(id,direction='add')=>click(`document.querySelector('#deck-catalog [data-card-id="${id}"] [data-change="${direction}"]')`);
    const comparison=()=>evaluate(`[...document.querySelectorAll('#deck-changes-rows tr')].map(row=>({id:row.dataset.cardId,saved:Number(row.cells[1].textContent),draft:Number(row.cells[2].textContent)}))`);
    const check=async()=>{await click(`document.getElementById('deck-check-saved')`);await wait('!busy');};
    const loadSaved=async()=>{await click(`document.getElementById('deck-load-saved')`);await wait('!busy');};
    const extra=(cards,exclude)=>Object.values(r.cards).find(c=>c.id!==exclude&&cards.filter(id=>id===c.id).length<c.legality.maxCopies).id;
    const before=await evaluate('JSON.stringify(view)'),savedA=await evaluate(`api('/api/deck')`);
    await openDeck();await check();assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/Đã xác nhận/);
    assert.equal(writes.length,0);
    assert.equal(await evaluate(`document.getElementById('deck-changes').hidden`),true);
    // Removing and re-adding the first card changes order only; 39 cards still show the missing copy.
    const moved=savedA.cards[0],movedCount=savedA.cards.filter(id=>id===moved).length;
    await change(moved,'remove');assert.deepEqual(await comparison(),[{id:moved,saved:movedCount,draft:movedCount-1}]);
    assert.equal(await evaluate(`document.getElementById('deck-save').disabled`),true);
    const shortDraft=await evaluate('JSON.stringify(deckDraft.cards)');
    await loadSaved();assert.deepEqual(await evaluate('deckDraft.cards'),savedA.cards);
    await click(`document.getElementById('deck-undo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),shortDraft);
    assert.equal(await evaluate(`document.getElementById('deck-save').disabled`),true);
    await click(`document.getElementById('deck-redo')`);assert.deepEqual(await evaluate('deckDraft.cards'),savedA.cards);
    await click(`document.getElementById('deck-undo')`);
    await change(moved);assert.deepEqual(await comparison(),[]);
    assert.equal(await evaluate(`document.getElementById('deck-changes').hidden`),false);
    assert.equal(await evaluate(`document.getElementById('deck-changes-table').hidden`),true);
    assert.match(await evaluate(`document.getElementById('deck-changes-order').textContent`),/Chỉ thay đổi thứ tự/);
    await click(`document.getElementById('deck-undo')`);await click(`document.getElementById('deck-undo')`);
    assert.equal(await evaluate(`document.getElementById('deck-changes').hidden`),true);
    const added=extra(savedA.cards);await change(added);
    const addedCount=savedA.cards.filter(id=>id===added).length,removed=savedA.cards.find(id=>id!==added),removedCount=savedA.cards.filter(id=>id===removed).length;
    const oneChange=[{id:added,saved:addedCount,draft:addedCount+1}];
    assert.deepEqual(await comparison(),oneChange);
    await change(removed,'remove');
    const twoChanges=[...oneChange,{id:removed,saved:removedCount,draft:removedCount-1}].sort((a,b)=>r.cards[a.id].name.localeCompare(r.cards[b.id].name,'en'));
    assert.deepEqual(await comparison(),twoChanges);
    const editing=await evaluate('JSON.stringify(deckDraft)');
    await click(`document.getElementById('deck-changes-title')`);
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),editing);
    assert.equal(await evaluate(`document.querySelectorAll('#deck-changes button,#deck-changes input,#deck-changes select').length`),0);
    // Catalog filters must not hide a changed card from the independent review table.
    await evaluate(`document.getElementById('deck-search').value=${JSON.stringify(r.cards[added].name)};document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    assert.equal(await evaluate(`!!document.querySelector('#deck-catalog [data-card-id="${removed}"]')`),false);
    assert.deepEqual(await comparison(),twoChanges);
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const d=document.getElementById('deck-dialog'),r=d.getBoundingClientRect(),t=document.getElementById('deck-changes-table'),b=t.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1&&b.left>=r.left&&b.right<=r.right})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','deck-changes');await mkdir(folder,{recursive:true});
        await evaluate(`document.getElementById('deck-changes').scrollIntoView({block:'center'})`);
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await evaluate(`document.getElementById('deck-search').value='';document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    await click(`document.getElementById('deck-undo')`);assert.deepEqual(await comparison(),oneChange);
    await click(`document.getElementById('deck-redo')`);assert.deepEqual(await comparison(),twoChanges);
    await click(`document.getElementById('deck-undo')`);assert.deepEqual(await comparison(),oneChange);
    const draft=await evaluate('JSON.stringify(deckDraft)');await check();
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),draft);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/khác bản đang sửa/);
    await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await check();assert.equal(await evaluate('JSON.stringify(deckDraft)'),draft);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/Chưa kiểm tra được/);
    await loadSaved();assert.equal(await evaluate('JSON.stringify(deckDraft)'),draft);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/Chưa tải được/);
    await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    // A real successful POST whose response never reaches the application.
    await evaluate(`(()=>{const original=window.fetch;window.fetch=async(...args)=>{if(args[0]==='/api/deck'&&args[1]?.method==='POST'){window.fetch=original;await original(...args);throw new Error('Mất phản hồi sau khi server lưu');}return original(...args);};})()`);
    await click(`document.getElementById('deck-save')`);await wait('!busy');
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),draft);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/Chưa xác nhận lưu deck/);
    const serverSaved=await evaluate(`api('/api/deck')`);assert.equal(serverSaved.revision,savedA.revision+1);
    assert.deepEqual(serverSaved.cards,await evaluate('deckDraft.cards'));assert.equal(writes.length,1);
    assert.deepEqual(await comparison(),oneChange);
    await evaluate(`document.getElementById('deck-presence').value='included';document.getElementById('deck-presence').dispatchEvent(new Event('change'));document.getElementById('deck-sort').value='name';document.getElementById('deck-sort').dispatchEvent(new Event('change'))`);
    await click(`document.querySelector('#deck-catalog .deck-name')`);
    const history=await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])'),preview=await evaluate(`document.getElementById('deck-preview').textContent`);
    await check();
    assert.equal(await evaluate('deckDraft.revision'),serverSaved.revision);
    assert.deepEqual(await evaluate('deckDraft.savedCards'),serverSaved.cards);
    assert.equal(await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])'),history);
    assert.equal(await evaluate(`document.getElementById('deck-preview').textContent`),preview);
    assert.equal(await evaluate(`document.getElementById('deck-presence').value`),'included');
    assert.equal(await evaluate(`document.getElementById('deck-sort').value`),'name');
    assert.equal(await evaluate(`document.getElementById('deck-draft-status').textContent.includes('Có thay đổi')`),false);
    assert.equal(await evaluate(`document.getElementById('deck-changes').hidden`),true);
    assert.equal(writes.length,1);
    await click(`document.getElementById('deck-undo')`);
    assert.equal(await evaluate(`document.getElementById('deck-draft-status').textContent.includes('Có thay đổi')`),true);
    assert.deepEqual(await comparison(),[{id:added,saved:addedCount+1,draft:addedCount}]);
    await click(`document.getElementById('deck-redo')`);
    assert.equal(await evaluate(`document.getElementById('deck-draft-status').textContent.includes('Có thay đổi')`),false);
    const prompts=nativeDialogs.length;await closeDeck();assert.equal(nativeDialogs.length,prompts);
    await openDeck();assert.deepEqual(await evaluate('deckDraft.cards'),serverSaved.cards);
    // A second real session for A saves a different list; the checker must never rebase over it.
    const localExtra=extra(serverSaved.cards),remoteExtra=extra(serverSaved.cards,localExtra);await change(localExtra);
    const local=await evaluate('JSON.stringify(deckDraft)');
    const localComparison=await comparison();
    const origin=`http://127.0.0.1:${server.address().port}`;
    const remoteSeat=await fetch(origin+'/api/seat',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({seat:'a'})});
    assert.equal(remoteSeat.status,200);const remoteCookie=remoteSeat.headers.get('set-cookie').split(';')[0];
    const remoteCards=[...serverSaved.cards,remoteExtra];
    const remoteSave=await fetch(origin+'/api/deck',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Cookie:remoteCookie},body:JSON.stringify({seat:'a',revision:serverSaved.revision,cards:remoteCards})});
    assert.equal(remoteSave.status,200);const winner=await remoteSave.json();
    await click(`document.getElementById('deck-save')`);await wait('!busy');
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/cửa sổ khác/);
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),local);const writesBeforeCheck=writes.length;
    await check();assert.equal(await evaluate('JSON.stringify(deckDraft)'),local);assert.equal(writes.length,writesBeforeCheck);
    assert.deepEqual(await comparison(),localComparison);
    assert.deepEqual((await evaluate(`api('/api/deck')`)).cards,winner.cards);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/khác bản đang sửa/);
    // Changing the shared browser seat elsewhere cannot bind A's draft to B's revision.
    await evaluate(`api('/api/seat',{seat:'b'})`);await check();
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),local);
    assert.deepEqual(await comparison(),localComparison);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/Người chơi đã thay đổi/);
    await loadSaved();assert.equal(await evaluate('JSON.stringify(deckDraft)'),local);
    assert.deepEqual(await comparison(),localComparison);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/Người chơi đã thay đổi/);
    await evaluate(`api('/api/seat',{seat:'a'})`);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    // Explicitly loading the winning save is reversible and does not write over either list.
    await evaluate(`document.getElementById('deck-presence').value='included';document.getElementById('deck-presence').dispatchEvent(new Event('change'));document.getElementById('deck-sort').value='name';document.getElementById('deck-sort').dispatchEvent(new Event('change'))`);
    await click(`document.querySelector('#deck-catalog .deck-name')`);
    const priorCards=await evaluate('deckDraft.cards'),priorHistory=await evaluate('deckDraft.undo');
    const loadPreview=await evaluate(`document.getElementById('deck-preview').textContent`);
    await loadSaved();
    assert.deepEqual(await evaluate('deckDraft.cards'),winner.cards);
    assert.deepEqual(await evaluate('deckDraft.savedCards'),winner.cards);
    assert.equal(await evaluate('deckDraft.revision'),winner.revision);
    assert.deepEqual(await evaluate('deckDraft.undo'),[...priorHistory,priorCards]);
    assert.equal(await evaluate(`document.getElementById('deck-changes').hidden`),true);
    assert.equal(await evaluate(`document.getElementById('deck-preview').textContent`),loadPreview);
    assert.equal(await evaluate(`document.getElementById('deck-presence').value`),'included');
    assert.equal(await evaluate(`document.getElementById('deck-sort').value`),'name');
    assert.equal(writes.length,writesBeforeCheck);
    assert.deepEqual((await evaluate(`api('/api/deck')`)).cards,winner.cards);
    await click(`document.getElementById('deck-undo')`);assert.deepEqual(await evaluate('deckDraft.cards'),priorCards);
    assert.equal(await evaluate('deckDraft.revision'),winner.revision);
    assert.equal(await evaluate(`document.getElementById('deck-changes').hidden`),false);
    await click(`document.getElementById('deck-redo')`);assert.deepEqual(await evaluate('deckDraft.cards'),winner.cards);
    await change(extra(winner.cards));await click(`document.getElementById('deck-undo')`);
    const noOp=await evaluate('JSON.stringify(deckDraft)');await loadSaved();
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),noOp);
    // Choosing Undo then Save is a new explicit edit based on the acknowledged revision.
    await click(`document.getElementById('deck-undo')`);assert.deepEqual(await evaluate('deckDraft.cards'),priorCards);
    await click(`document.getElementById('deck-save')`);await wait(`!busy&&!document.getElementById('deck-dialog').open`);
    const explicitSave=await evaluate(`api('/api/deck')`);
    assert.equal(explicitSave.revision,winner.revision+1);assert.deepEqual(explicitSave.cards,priorCards);
    assert.equal(writes.length,writesBeforeCheck+1);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    await openDeck();assert.deepEqual(await evaluate('deckDraft.cards'),priorCards);await closeDeck();
    await seat('b');const savedB=await evaluate(`api('/api/deck')`);await openDeck();await check();
    assert.equal(await evaluate(`document.getElementById('deck-changes').hidden`),true);assert.deepEqual(await comparison(),[]);
    assert.deepEqual(await evaluate('deckDraft.savedCards'),savedB.cards);
    assert.equal(await evaluate('deckDraft.revision'),savedB.revision);
    const bNoOp=await evaluate('JSON.stringify(deckDraft)');await loadSaved();assert.equal(await evaluate('JSON.stringify(deckDraft)'),bNoOp);
    assert.deepEqual(await evaluate(`api('/api/deck')`),savedB);await closeDeck();
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'deck-save-check',catalog:109,
      draftChangeTable:true,orderOnlyChanges:true,invalidDraftChanges:true,comparisonIgnoresCatalogFilters:true,comparisonResponsive:true,
      loadSavedUndoable:true,loadInvalidDraftUndoable:true,loadNoopPreservesHistory:true,loadFailurePreservesDraft:true,explicitSaveAfterLoad:true,
      lostSaveResponseConfirmed:true,noDuplicateSave:true,historyAndFiltersPreserved:true,undoUsesConfirmedBaseline:true,
      offlinePreservesDraft:true,remoteConflictPreservesDraft:true,noSilentRebase:true,wrongSeatRejected:true,
      seatBIndependent:true,currentDuelUnchanged:true,runtimeExceptions:errors.length}));
  } else if (deckDraftGuard) {
    const openDeck=async()=>{await click(`document.getElementById('deck-builder')`);await wait(`!busy&&document.getElementById('deck-dialog').open`);};
    const change=(id,direction)=>click(`document.querySelector('#deck-catalog [data-card-id="${id}"] [data-change="${direction}"]')`);
    const escape=async()=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});};
    const dirty=()=>evaluate(`document.getElementById('deck-draft-status').textContent.includes('Có thay đổi chưa lưu')`);
    async function tryClose(accept,viaEscape=false,expectPrompt=true) {
      const count=nativeDialogs.length;dialogAnswer=accept;
      try {
        if(viaEscape)await escape();else await click(`document.getElementById('deck-close')`);
        await wait(`document.getElementById('deck-dialog').open===${expectPrompt?!accept:false}`);
        assert.equal(nativeDialogs.length,count+(expectPrompt?1:0));
        if(expectPrompt){assert.equal(nativeDialogs.at(-1).type,'confirm');assert.match(nativeDialogs.at(-1).message,/chưa được lưu.*bỏ thay đổi/);}
      } finally {dialogAnswer=undefined;}
    }
    const before=await evaluate('JSON.stringify(view)');
    const savedA=await evaluate(`api('/api/deck')`);
    await openDeck();assert.equal(await dirty(),false);
    // Search, sort and previews never make a draft dirty or require a prompt.
    await evaluate(`document.getElementById('deck-search').value='Blue';document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    await click(`document.querySelector('#deck-catalog .deck-name')`);
    await tryClose(false,false,false);assert.equal(await evaluate('deckDraft'),null);
    await openDeck();await tryClose(false,true,false);
    await openDeck();
    const extra=Object.values(r.cards).find(c=>savedA.cards.filter(id=>id===c.id).length<c.legality.maxCopies).id;
    await change(extra,'add');assert.equal(await dirty(),true);
    const edited=await evaluate('JSON.stringify(deckDraft)');
    await tryClose(false);assert.equal(await evaluate('JSON.stringify(deckDraft)'),edited);
    await tryClose(false,true);assert.equal(await evaluate('JSON.stringify(deckDraft)'),edited);
    assert.deepEqual(await evaluate(`api('/api/deck')`),savedA);
    await click(`document.getElementById('deck-undo')`);assert.equal(await dirty(),false);
    // A non-empty redo stack still closes quietly when cards match the baseline.
    await tryClose(false,false,false);await openDeck();assert.deepEqual(await evaluate('[deckDraft.undo,deckDraft.redo]'),[[],[]]);
    await change(extra,'add');await click(`document.getElementById('deck-undo')`);await click(`document.getElementById('deck-redo')`);
    assert.equal(await dirty(),true);await tryClose(true,true);assert.equal(await evaluate('deckDraft'),null);
    await openDeck();assert.deepEqual(await evaluate('deckDraft.cards'),savedA.cards);
    // Even an invalid 39-card draft is preserved when closing is cancelled.
    await change(savedA.cards[0],'remove');assert.equal(await evaluate(`document.getElementById('deck-save').disabled`),true);
    const invalid=await evaluate('JSON.stringify(deckDraft)');await tryClose(false);
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),invalid);await tryClose(true);
    await openDeck();await change(extra,'add');
    await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await click(`document.getElementById('deck-save')`);await wait(`!busy&&document.getElementById('deck-error').textContent.includes('Chưa xác nhận lưu deck')`);
    assert.equal(await dirty(),true);const failedSave=await evaluate('JSON.stringify(deckDraft)');
    await tryClose(false,true);assert.equal(await evaluate('JSON.stringify(deckDraft)'),failedSave);
    await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    assert.deepEqual(await evaluate(`api('/api/deck')`),savedA);
    const prompts=nativeDialogs.length;
    await click(`document.getElementById('deck-save')`);await wait(`!busy&&!document.getElementById('deck-dialog').open`);
    assert.equal(nativeDialogs.length,prompts);assert.equal(await evaluate('deckDraft'),null);
    const savedAfter=await evaluate(`api('/api/deck')`);assert.equal(savedAfter.cards.length,savedA.cards.length+1);
    await openDeck();assert.equal(await dirty(),false);
    // Returning to the sample is a real edit after a different deck has been saved.
    await click(`document.getElementById('deck-default')`);assert.equal(await dirty(),true);
    await tryClose(false);await click(`document.getElementById('deck-undo')`);assert.equal(await dirty(),false);
    await tryClose(false,true,false);assert.deepEqual(await evaluate(`api('/api/deck')`),savedAfter);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    await seat('b');const savedB=await evaluate(`api('/api/deck')`);await openDeck();
    assert.equal(await dirty(),false);assert.deepEqual(await evaluate('deckDraft.savedCards'),savedB.cards);
    await change(savedB.cards[0],'remove');const draftB=await evaluate('JSON.stringify(deckDraft)');
    await tryClose(false,true);assert.equal(await evaluate('JSON.stringify(deckDraft)'),draftB);
    await tryClose(true);assert.deepEqual(await evaluate(`api('/api/deck')`),savedB);
    await seat('a');await openDeck();assert.deepEqual(await evaluate('deckDraft.cards'),savedAfter.cards);
    assert.equal(await dirty(),false);await tryClose(false,false,false);
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'deck-draft-guard',catalog:109,
      closeAndEscapeProtected:true,cancelPreservesDraftAndHistory:true,cleanCloseNoPrompt:true,undoClearsDirty:true,redoRestoresDirty:true,
      invalidDraftProtected:true,saveFailureProtected:true,saveSuccessNoPrompt:true,sampleIsEdit:true,seatBaselineIndependent:true,
      currentDuelUnchanged:true,runtimeExceptions:errors.length}));
  } else if (handKeyboard) {
    const commands=[],previousOnMessage=ws.onmessage;
    ws.onmessage=event=>{
      const m=JSON.parse(event.data);
      if(m.method==='Network.requestWillBeSent'&&m.params.request.url.endsWith('/api/command'))commands.push(JSON.parse(m.params.request.postData));
      previousOnMessage(event);
    };
    await send('Network.enable');
    const key=async(key,code,windowsVirtualKeyCode,modifiers=0)=>{
      await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode,modifiers,...(code==='Space'?{text:' '}:code==='Enter'?{text:'\r'}:{})});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode,modifiers});
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    };
    await seat('b');const savedDeckB=await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`);await seat('a');
    const focusHandle=()=>evaluate('document.activeElement.dataset.cardHandle');
    const original=await evaluate('view.selfHand.map(c=>c.handle)'),before=await evaluate('JSON.stringify(view)');
    const savedDecks=await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`);
    await evaluate(`document.getElementById('hand-sort').focus()`);await key('Tab','Tab',9);
    assert.equal(await focusHandle(),original[0]);
    await key('ArrowLeft','ArrowLeft',37);assert.equal(await focusHandle(),original[0]);
    await key('ArrowRight','ArrowRight',39);assert.equal(await focusHandle(),original[1]);
    await key('End','End',35);assert.equal(await focusHandle(),original[6]);
    await key('ArrowRight','ArrowRight',39);assert.equal(await focusHandle(),original[6]);
    assert.equal(await evaluate('selected'),null);
    await key('Enter','Enter',13);
    assert.equal(await focusHandle(),original[6]);assert.equal(await evaluate('selected.card.handle'),original[6]);
    await key(' ','Space',32);assert.equal(await focusHandle(),original[6]);
    await key('ArrowLeft','ArrowLeft',37);assert.equal(await focusHandle(),original[5]);
    assert.equal(await evaluate('selected.card.handle'),original[6]);
    await key(' ','Space',32);assert.equal(await evaluate('selected.card.handle'),original[5]);
    assert.equal(await focusHandle(),original[5]);
    assert.equal(await evaluate(`document.querySelector('#detail h2').textContent`),'Magician of Faith');
    await key('Tab','Tab',9);assert.equal(await focusHandle(),original[6]);
    await key('Tab','Tab',9,8);assert.equal(await focusHandle(),original[5]);
    await key('Home','Home',36);assert.equal(await focusHandle(),original[0]);
    await key('ArrowRight','ArrowRight',39,8);assert.equal(await focusHandle(),original[0]);
    // Native select keys remain native; navigation follows the resulting displayed order.
    await evaluate(`document.getElementById('hand-sort').focus()`);await key('Home','Home',36);await key('ArrowDown','ArrowDown',40);
    assert.equal(await evaluate('document.activeElement.id'),'hand-sort');
    assert.equal(await evaluate(`document.getElementById('hand-sort').value`),'name');
    await key('Tab','Tab',9);assert.equal(await focusHandle(),original[1]);
    await key('ArrowRight','ArrowRight',39);assert.equal(await focusHandle(),original[6]);
    await key('End','End',35);assert.equal(await focusHandle(),original[0]);
    await key('Enter','Enter',13);assert.equal(await focusHandle(),original[0]);
    assert.equal(await evaluate('JSON.stringify(view)'),before);assert.equal(commands.length,0);
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
    await key('Home','Home',36);await key('End','End',35);
    assert.equal(await evaluate(`(()=>{const h=document.getElementById('hand'),r=document.activeElement.getBoundingClientRect(),b=h.getBoundingClientRect();return h.scrollLeft>0&&r.left>=b.left-1&&r.right<=b.right+1&&document.documentElement.scrollWidth<=innerWidth+1})()`),true);
    if(process.argv.includes('--screenshots')) {
      const folder=join(projectRoot,'artifacts','hand-keyboard');await mkdir(folder,{recursive:true});
      const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,'narrow.png'),Buffer.from(shot.data,'base64'));
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await key('Home','Home',36);await key('ArrowRight','ArrowRight',39);await key('Enter','Enter',13);
    assert.equal(await focusHandle(),original[6]);
    // Opening/cancelling an action by keyboard must not submit the summon.
    await evaluate(`${textButton('#actions button','Triệu hồi')}.focus()`);await key('Enter','Enter',13);
    assert.equal(await evaluate(`document.getElementById('action-dialog').open`),true);
    await key('Escape','Escape',27);assert.equal(await evaluate(`document.getElementById('action-dialog').open`),false);
    assert.equal(commands.length,0);
    await evaluate(`${textButton('#actions button','Triệu hồi')}.focus()`);await key('Enter','Enter',13);
    const version=await evaluate('view.stateVersion');
    await evaluate(`document.querySelector('#action-form button[type="submit"]').focus()`);await key('Enter','Enter',13);
    await wait(`!busy&&view.stateVersion>${version}`);assert.equal(commands[0].action.cardHandle,original[6]);
    await pass('a');await pass('b');await seat('a');
    assert.equal(await evaluate('view.normalSummonQuota.remaining'),0);
    assert.equal(await evaluate(`view.selfHand.filter(c=>catalog.get(c.definition.id).name==='Battle Ox').length`),1);
    const afterSummon=await evaluate('JSON.stringify(view)'),commandCount=commands.length;
    await evaluate(`document.querySelector('#self .zone-row:nth-child(2) .card').focus()`);await key('Enter','Enter',13);
    assert.equal(await evaluate(`document.activeElement===document.querySelector('#self .card.selected')`),true);
    await evaluate(`document.querySelector('#opponent .card').focus()`);await key(' ','Space',32);
    assert.equal(await evaluate(`document.activeElement===document.querySelector('#opponent .card.selected')`),true);
    assert.equal(await evaluate(`document.querySelector('#detail h2').textContent`),'Bài úp');
    assert.equal(await evaluate(`document.getElementById('detail').textContent.includes('Hane-Hane')`),false);
    assert.equal(await evaluate('JSON.stringify(view)'),afterSummon);assert.equal(commands.length,commandCount);
    await seat('b');assert.equal(await evaluate('selected'),null);
    assert.equal(await evaluate(`document.querySelector('main .card.selected')`),null);
    assert.equal(await evaluate(`document.activeElement?.closest('#hand')`),null);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#hand .card')].map(c=>c.dataset.cardHandle)`),await evaluate('view.selfHand.map(c=>c.handle)'));
    assert.equal(await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`),savedDeckB);
    await seat('a');
    assert.equal(await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`),savedDecks);
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'hand-keyboard',catalog:109,
      arrowsHomeEnd:true,boundedNavigation:true,nativeEnterSpace:true,focusAfterRender:true,nativeTabAndSelect:true,
      sortedDuplicateIdentity:true,readOnlyNavigation:true,keyboardSummon:true,hiddenOpponentPreview:true,
      narrowHandScroll:true,seatClearsSelection:true,savedDecksUnchanged:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (handSorting) {
    const commands=[],previousOnMessage=ws.onmessage;
    ws.onmessage=event=>{
      const m=JSON.parse(event.data);
      if(m.method==='Network.requestWillBeSent'&&m.params.request.url.endsWith('/api/command'))commands.push(JSON.parse(m.params.request.postData));
      previousOnMessage(event);
    };
    await send('Network.enable');
    const received=['Trap Hole','Battle Ox','Pot of Greed','Blue-Eyes White Dragon','Fissure','Magician of Faith','Battle Ox'];
    const alphabetical=['Battle Ox','Battle Ox','Blue-Eyes White Dragon','Fissure','Magician of Faith','Pot of Greed','Trap Hole'];
    const byKind=['Battle Ox','Battle Ox','Blue-Eyes White Dragon','Magician of Faith','Fissure','Pot of Greed','Trap Hole'];
    const byLevel=['Blue-Eyes White Dragon','Battle Ox','Battle Ox','Magician of Faith','Fissure','Pot of Greed','Trap Hole'];
    const handNames=()=>evaluate(`[...document.querySelectorAll('#hand .card-name')].map(e=>e.textContent)`);
    const shownHandles=()=>evaluate(`[...document.querySelectorAll('#hand .card')].map(e=>e.dataset.cardHandle)`);
    const key=async(key,code,windowsVirtualKeyCode)=>{
      await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode});
    };
    async function sort(mode) {
      const before=await evaluate('JSON.stringify(view)');
      const position=await evaluate(`[...document.getElementById('hand-sort').options].findIndex(o=>o.value===${JSON.stringify(mode)})`);
      assert.ok(position>=0);await evaluate(`document.getElementById('hand-sort').focus()`);
      await key('Home','Home',36);for(let n=0;n<position;n++)await key('ArrowDown','ArrowDown',40);
      await wait(`document.getElementById('hand-sort').value===${JSON.stringify(mode)}`);
      assert.equal(await evaluate('document.activeElement.id'),'hand-sort');
      assert.equal(await evaluate('JSON.stringify(view)'),before);
    }
    assert.deepEqual(await handNames(),received);
    const originalHandles=await shownHandles(),duplicateHandles=[originalHandles[1],originalHandles[6]];
    const savedDecks=await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`);
    await click(`document.querySelectorAll('#hand .card')[6]`);
    const selectedHandle=await evaluate('selected.card.handle');
    for(const [mode,expected] of [['name',alphabetical],['kind',byKind],['level',byLevel],['received',received]]) {
      await sort(mode);assert.deepEqual(await handNames(),expected);
      assert.equal(await evaluate('selected.card.handle'),selectedHandle);
      assert.equal(await evaluate(`document.querySelector('#hand .selected').dataset.cardHandle`),selectedHandle);
      assert.equal(await evaluate(`document.querySelector('#detail h2').textContent`),'Battle Ox');
      assert.deepEqual((await shownHandles()).filter(h=>duplicateHandles.includes(h)),duplicateHandles);
    }
    await sort('level');
    for(const [label,width,height] of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const r=document.getElementById('hand-sort').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','hand-sorting');await mkdir(folder,{recursive:true});
        await evaluate(`document.getElementById('hand-sort').scrollIntoView({block:'center'})`);
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    // The selected second copy still supplies the actual summon command after sorting.
    assert.equal(commands.length,0);
    await click(textButton('#actions button','Triệu hồi'));await confirm();
    assert.equal(commands.at(-1).action.cardHandle,selectedHandle);
    await pass('a');await pass('b');await seat('a');
    assert.equal(await evaluate(`view.players[0].monsters.filter(c=>c&&catalog.get(c.definition.id).name==='Battle Ox').length`),1);
    assert.equal(await evaluate(`view.selfHand.filter(c=>catalog.get(c.definition.id).name==='Battle Ox').length`),1);
    assert.equal(await evaluate('view.normalSummonQuota.remaining'),0);
    // Every handoff resets display order; it never carries the previous player's cards.
    assert.equal(await evaluate(`document.getElementById('hand-sort').value`),'received');
    await sort('kind');await seat('b');assert.equal(await evaluate(`document.getElementById('hand-sort').value`),'received');
    assert.deepEqual(await shownHandles(),await evaluate('view.selfHand.map(c=>c.handle)'));
    assert.equal(await evaluate(`document.querySelector('#hand .selected')`),null);
    await seat('a');await sort('name');
    const version=await evaluate('view.stateVersion');await click(`document.getElementById('refresh')`);
    await wait(`!busy && view.stateVersion===${version} && document.getElementById('status').textContent.includes('Đã cập nhật')`);
    assert.equal(await evaluate(`document.getElementById('hand-sort').value`),'name');
    await click(`[...document.querySelectorAll('#hand .card')].find(e=>e.querySelector('.card-name')?.textContent==='Pot of Greed')`);
    const beforePot=await evaluate('view.selfHand.length');
    await click(textButton('#actions button','Kích hoạt'));await confirm();await pass('b');await pass('a');
    assert.equal(await evaluate('view.selfHand.length'),beforePot+1);
    await sort('level');const duelId=await evaluate('view.duelId');
    await click(`document.getElementById('reset')`);await click(`document.querySelector('#new-game-form input[value="a"]')`);
    await click(`document.querySelector('#new-game-form button[type="submit"]')`);
    await wait(`!busy && view.duelId!==${JSON.stringify(duelId)} && !document.getElementById('new-game-dialog').open`);
    assert.equal(await evaluate(`document.getElementById('hand-sort').value`),'received');
    assert.deepEqual(await shownHandles(),await evaluate('view.selfHand.map(c=>c.handle)'));
    assert.equal(await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`),savedDecks);
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'hand-sorting',catalog:109,
      keyboardSort:true,stableDuplicateOrder:true,selectionPreserved:true,sortedCardActions:true,drawAfterSorting:true,
      receivedOrderRestored:true,seatAndDuelReset:true,refreshPreservesMode:true,viewAndSavedDecksUnchanged:true,
      responsive:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (faithBattle) {
    const {defender,spells}=faithBattle,attacker=defender==='a'?'b':'a';
    const owner=`view.players.find(p=>p.playerId===${JSON.stringify(defender)})`;
    const opponent=`view.players.find(p=>p.playerId===${JSON.stringify(attacker)})`;
    const ownHandCard=name=>`[...document.querySelectorAll('#hand .card')].find(e=>e.querySelector('.card-name')?.textContent===${JSON.stringify(name)})`;
    async function advance(text) {
      await seat(await evaluate('view.turn.activePlayer'));await actionClick(textButton('#turn-actions button',text));
      for(let n=0;await evaluate("view.timing.window!=='open'");n++) {
        assert.ok(n<4,'Phase transition must finish');await pass(await evaluate('view.timing.priorityPlayer'));
      }
    }
    await seat(defender);const beforeHand=await evaluate('view.selfHand.length');
    const graveBefore=await evaluate(`${owner}.graveyard.map(c=>catalog.get(c.definition.id).name)`);
    await seat(attacker);await advance('CHIẾN ĐẤU');await seat(attacker);
    assert.equal(await evaluate(`${owner}.monsters[0].visibility`),'hidden');
    assert.equal(await evaluate(`${owner}.monsters[0].definition`),undefined);
    await click(`document.querySelector('#self .zone-row:nth-child(2) .card')`);
    await click(textButton('#actions button','Tấn công'));await chooseTarget(0);await confirm();
    assert.match(await evaluate(`document.getElementById('battle-status').textContent`),/Bài úp/);
    assert.equal(await evaluate(`document.getElementById('battle-status').textContent.includes('Magician of Faith')`),false);
    await pass(attacker);await pass(defender);
    assert.equal(await evaluate('view.battle.damageTiming'),'after-calculation');
    assert.equal(await evaluate(`${owner}.monsters[0].position`),'face-up-defense');
    assert.equal(await evaluate(`${owner}.graveyard.length`),graveBefore.length);
    assert.equal(await evaluate('view.selfHand.length'),beforeHand);
    if(spells) {
      assert.equal(await evaluate('view.decision.kind'),'target');
      assert.equal(await evaluate('view.decision.optionIds.length'),2);
      const labels=await evaluate(`[...document.querySelectorAll('#decision-form label')].map(e=>e.textContent)`);
      assert.ok(labels.every(t=>t.includes(`Người chơi ${defender.toUpperCase()}`)&&t.includes('Mộ')));
      assert.ok(labels.some(t=>t.includes('Pot of Greed')));assert.ok(labels.some(t=>t.includes('Fissure')));
      const version=await evaluate('view.stateVersion');
      await seat(attacker);assert.equal(await evaluate('view.decision'),null);
      assert.equal(await evaluate(`document.getElementById('decision-panel').hidden`),true);
      assert.equal(await evaluate(`document.querySelectorAll('#decision-form input').length`),0);
      await seat(defender);assert.equal(await evaluate('view.stateVersion'),version);
      await inspectDecision(0);await inspectDecision(1,true);
      await click(`[...document.querySelectorAll('#decision-form label')].find(e=>e.textContent.includes('Pot of Greed')).querySelector('input')`);
      await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    } else {
      assert.equal(await evaluate('view.decision'),null);
      assert.equal(await evaluate(`document.getElementById('decision-panel').hidden`),true);
    }
    assert.equal(await evaluate('view.chain.length'),1);
    assert.equal(await evaluate('view.chain[0].controllerId'),defender);
    assert.equal(await evaluate('view.chain[0].targetHandles.length'),spells?1:0);
    await inspectChain('source','Magician of Faith');
    if(spells) await inspectChain('target','Pot of Greed');
    else assert.equal(await evaluate(`document.querySelectorAll('#chain-links [data-chain-card="target"]').length`),0);
    await pass(attacker);await seat(defender);
    assert.equal(await evaluate('view.selfHand.length'),beforeHand);
    assert.ok(await evaluate(`${owner}.monsters[0]!==null`));
    await pass(defender);
    assert.equal(await evaluate('view.chain.length'),0);assert.equal(await evaluate('view.decision'),null);
    assert.equal(await evaluate(`${owner}.monsters[0]`),null);
    assert.deepEqual(await evaluate(`${owner}.graveyard.map(c=>catalog.get(c.definition.id).name)`),
      [...graveBefore.filter(n=>!spells||n!=='Pot of Greed'),'Magician of Faith']);
    assert.deepEqual(await evaluate(`${opponent}.graveyard.map(c=>catalog.get(c.definition.id).name)`),['Pot of Greed']);
    assert.equal(await evaluate('view.selfHand.length'),beforeHand+(spells?1:0));
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);
    assert.equal(await evaluate('view.normalSummonQuota.remaining'),1);
    assert.equal(await evaluate('view.timing.window'),'open');assert.equal(await evaluate('view.turn.activePlayer'),attacker);
    assert.equal(await evaluate(`document.getElementById('battle-status').hidden`),true);
    assert.equal(await evaluate(`document.querySelectorAll('.battle-attacker,.battle-target').length`),0);
    if(spells) {
      await click(ownHandCard('Pot of Greed'));
      assert.equal(await evaluate(`${textButton('#actions button','Kích hoạt')}.disabled`),true);
      assert.equal(await evaluate(`view.availableActions.some(a=>a.type==='activate-spell')`),false);
      await seat(attacker);assert.equal(await evaluate('view.opponentHandCount'),beforeHand+1);
      assert.equal(await evaluate(`view.selfHand.some(c=>catalog.get(c.definition.id).name==='Pot of Greed')`),false);
      await advance('MAIN 2');await advance('KẾT THÚC');await advance('Sang lượt đối thủ');await advance('CHUẨN BỊ');await advance('MAIN 1');
      await seat(defender);assert.equal(await evaluate('view.turn.activePlayer'),defender);
      const beforePot=await evaluate('view.selfHand.length');
      await click(ownHandCard('Pot of Greed'));await click(textButton('#actions button','Kích hoạt'));await confirm();
      await pass(attacker);await pass(defender);
      assert.equal(await evaluate('view.selfHand.length'),beforePot+1);
      assert.equal(await evaluate(`${owner}.graveyard.at(-1).definition.id`),Object.values(r.cards).find(c=>c.name==='Pot of Greed').id);
      assert.equal(await evaluate('view.normalSummonQuota.remaining'),1);
    }
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'faith-battle',defender,ownGraveyardSpells:spells,
      hiddenBeforeReveal:true,privateDecision:true,mandatoryZeroTarget:spells===0,returnOnlyAtResolution:true,sourceCleanupAfterFlip:true,
      battleCuesCleared:true,spellWaitsForOwnMain:spells>0,recoveredSpellUsed:spells>0,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (magicianFaith) {
    const beforeHand=await evaluate('view.selfHand.length');
    await click(`document.querySelector('#self .zone-row:nth-child(2) .card')`);await actionClick(textButton('#actions button','Flip Summon'));
    assert.equal(await evaluate('view.decision.kind'),'target');assert.equal(await evaluate('view.decision.optionIds.length'),2);
    const labels=await evaluate(`[...document.querySelectorAll('#decision-form label')].map(e=>e.textContent)`);
    assert.ok(labels.every(t=>t.includes('Người chơi A')&&t.includes('Mộ')));assert.ok(labels.some(t=>t.includes('Pot of Greed')));assert.ok(labels.some(t=>t.includes('Fissure')));
    const index=await evaluate(`[...document.querySelectorAll('#decision-form label')].findIndex(e=>e.textContent.includes('Pot of Greed'))`);
    await inspectDecision(index);
    await seat('b');assert.equal(await evaluate('view.decision'),null);assert.equal(await evaluate(`document.querySelectorAll('#decision-form input').length`),0);await seat('a');
    await click(`[...document.querySelectorAll('#decision-form label')].find(e=>e.textContent.includes('Pot of Greed')).querySelector('input')`);await actionClick(`document.querySelector('#decision-form button[type="submit"]')`);
    assert.equal(await evaluate('view.chain[0].targetHandles.length'),1);await inspectChain('source','Magician of Faith');await inspectChain('target','Pot of Greed');
    assert.equal(await evaluate('view.selfHand.length'),beforeHand);
    await pass('b');assert.equal(await evaluate('view.selfHand.length'),beforeHand);await pass('a');
    assert.equal(await evaluate('view.selfHand.length'),beforeHand+1);
    assert.equal(await evaluate(`view.selfHand.filter(c=>catalog.get(c.definition.id).name==='Pot of Greed').length`),1);
    assert.ok(await evaluate(`view.players[0].graveyard.some(c=>catalog.get(c.definition.id).name==='Fissure')`));
    assert.ok(await evaluate(`view.players[1].graveyard.some(c=>catalog.get(c.definition.id).name==='Pot of Greed')`));
    assert.equal(await evaluate('view.normalSummonQuota.remaining'),1);
    await pass('a');await pass('b');await seat('a');await hand('Pot of Greed');await click(textButton('#actions button','Kích hoạt'));await confirm();await pass('b');await pass('a');
    assert.equal(await evaluate('view.selfHand.length'),beforeHand+2);assert.equal(await evaluate('view.players[0].monsters[0].position'),'face-up-attack');
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'magician-faith',catalog:109,ownGraveyardSpellsOnly:true,privateDecision:true,sourceAndTargetPreviews:true,targetCapturedAtActivation:true,returnOnlyAtResolution:true,recoveredSpellUsed:true,noNormalQuotaConsumed:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (chainView) {
    assert.equal(await evaluate(`document.getElementById('chain-panel').hidden`),true);
    assert.match(await evaluate(`document.getElementById('summon-quota').textContent`),/Người chơi A.*còn 1\/1 lượt/);
    await hand('Battle Ox');await click(textButton('#actions button','Triệu hồi'));await confirm();await pass('a');await seat('b');
    assert.match(await evaluate(`document.getElementById('summon-quota').textContent`),/Người chơi A.*còn 0\/1 lượt/);
    const trap=slot=>`document.querySelector('#self .zone-row:nth-child(3) .slot:nth-child(${slot+1}) .card')`;
    await click(trap(0));await click(textButton('#actions button','Kích hoạt Bẫy'));await chooseTarget(0);
    const before=await evaluate('JSON.stringify(view)');await click(`document.getElementById('cancel-action')`);
    assert.equal(await evaluate('JSON.stringify(view)'),before);assert.equal(await evaluate(`document.getElementById('chain-panel').hidden`),true);
    await click(trap(0));await click(textButton('#actions button','Kích hoạt Bẫy'));await chooseTarget(0);await confirm();
    assert.equal(await evaluate(`document.querySelectorAll('#chain-links li').length`),1);
    assert.match(await evaluate(`document.getElementById('chain-links').textContent`),/Liên kết 1.*Người chơi B.*Trap Hole/);
    assert.match(await evaluate(`document.getElementById('chain-links').textContent`),/Mục tiêu:.*Battle Ox/);
    await pass('a');await seat('b');
    await click(trap(1));await click(textButton('#actions button','Kích hoạt Bẫy'));await chooseTarget(0);await confirm();
    assert.equal(await evaluate('view.chain.length'),2);
    await inspectChain('source','Trap Hole',false,true);await inspectChain('target','Battle Ox',true);
    const publicText=await evaluate(`document.getElementById('chain-links').textContent`),version=await evaluate('view.stateVersion');
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#chain-links strong')].map(e=>e.textContent.match(/Liên kết (\\d+)/)[1])`),['2','1']);
    assert.ok(!publicText.includes('Man-Eater Bug'));assert.ok(!publicText.includes('official:'));
    await seat('a');assert.equal(await evaluate('view.stateVersion'),version);
    assert.equal(await evaluate(`document.getElementById('chain-links').textContent`),publicText);
    assert.equal(await evaluate(`document.getElementById('chain-panel').textContent.includes('Man-Eater Bug')`),false);
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const e=document.getElementById('chain-panel'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1})()`),true);
      if(process.argv.includes('--screenshots')){const folder=join(projectRoot,'artifacts','chain-view');await mkdir(folder,{recursive:true});await evaluate(`document.getElementById('chain-panel').scrollIntoView({block:'start'})`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));}
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await pass('a');assert.equal(await evaluate('view.chain.length'),2);await pass('b');
    assert.equal(await evaluate('view.chain.length'),0);assert.equal(await evaluate(`document.getElementById('chain-panel').hidden`),true);
    assert.equal(await evaluate(`document.getElementById('chain-links').textContent`),'');
    assert.equal(await evaluate(`view.players[0].graveyard.filter(c=>catalog.get(c.definition.id).name==='Battle Ox').length`),1);
    assert.match(await evaluate(`document.getElementById('summon-quota').textContent`),/Người chơi A.*còn 0\/1 lượt/);
    assert.equal(await evaluate(`view.players[1].graveyard.filter(c=>catalog.get(c.definition.id).name==='Trap Hole').length`),2);
    await pass('a');await pass('b');await seat('a');
    const handCount=await evaluate('view.selfHand.length');await hand('Pot of Greed');await click(textButton('#actions button','Kích hoạt'));await confirm();
    assert.match(await evaluate(`document.getElementById('chain-links').textContent`),/Liên kết 1.*Pot of Greed/);
    assert.match(await evaluate(`document.getElementById('chain-links').textContent`),/Không chọn mục tiêu khi kích hoạt/);
    await inspectChain('source','Pot of Greed',true);
    await pass('b');await pass('a');
    assert.equal(await evaluate('view.selfHand.length'),handCount+1);
    assert.equal(await evaluate(`document.getElementById('chain-panel').hidden`),true);
    assert.equal(await evaluate(`document.getElementById('chain-links').textContent`),'');
    assert.deepEqual(await evaluate('view.players.map(p=>p.lifePoints)'),[8000,8000]);assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'chain-view',normalQuotaSurvivesTrapDestruction:true,readOnlySourceAndTargetPreviews:true,escapeClearsPreview:true,previewPreservesState:true,twoTrapLinks:true,reverseResolutionOrder:true,publicTarget:true,hiddenMonsterPrivacy:true,samePublicChainAcrossSeats:true,singleNormalSpell:true,cancelPreservesState:true,clearedAfterResolution:true,responsiveWidths:[1440,390],fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (earthquake) {
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
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),d=f.querySelector('select[name="discard"]'),t=f.querySelector('select[name="target"]');d.value=[...d.options].find(o=>label(visibleCard(o.value))==='Battle Ox').value;t.value=[...t.options].find(o=>o.textContent.includes('Lá sẽ bỏ làm chi phí')&&o.textContent.includes('Battle Ox')).value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await preview('discard','Battle Ox'); await preview('target','Battle Ox');
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),d=f.querySelector('select[name="discard"]');d.value=[...d.options].find(o=>label(visibleCard(o.value))!=='Battle Ox').value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await preview('target','Hane-Hane');
    assert.equal(await evaluate(`[...document.querySelector('#action-fields select[name="target"]').options].find(o=>o.textContent.includes('Lá sẽ bỏ làm chi phí')&&o.textContent.includes('Battle Ox')).disabled`),true);
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),d=f.querySelector('select[name="discard"]');d.value=[...d.options].find(o=>label(visibleCard(o.value))==='Battle Ox').value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
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
    await evaluate(`(()=>{const f=document.getElementById('action-fields'),d=f.querySelector('select[name="discard"]'),t=f.querySelector('select[name="target"]');d.value=[...d.options].find(o=>label(visibleCard(o.value))==='Battle Ox').value;t.value=[...t.options].find(o=>o.textContent.includes('Người chơi B')).value;f.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.match(await evaluate(`document.querySelector('#action-fields select[name="target"]').selectedOptions[0].textContent`),/Bài úp/);
    await preview('discard','Battle Ox'); await preview('target',null);
    assert.equal(await evaluate(`document.querySelector('[data-preview="target"]').textContent.includes('Man-Eater Bug')`),false);
    assert.equal(await evaluate('view.players[0].graveyard.length'),0); await confirm();
    assert.equal(await evaluate('view.selfHand.length'),handBefore-2);
    assert.equal(await evaluate('view.players[0].graveyard.length'),1); assert.equal(await evaluate('view.players[1].monsters[0].visibility'),'hidden');
    assert.equal(await evaluate('view.chain[0].targetHandles.length'),1);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/Người chơi A bỏ 1 lá làm chi phí/);
    assert.match(await evaluate(`document.getElementById('chain-links').textContent`),/Mục tiêu:.*Bài úp/);
    await inspectChain('target',null,true);
    assert.equal(await evaluate(`document.getElementById('chain-links').textContent.includes('Man-Eater Bug')`),false);
    const chainVersion=await evaluate('view.stateVersion');await seat('b');
    assert.match(await evaluate(`document.getElementById('chain-links').textContent`),/Man-Eater Bug/);
    await inspectChain('target','Man-Eater Bug');
    assert.equal(await evaluate('view.stateVersion'),chainVersion);await seat('a');
    assert.equal(await evaluate(`document.getElementById('chain-links').textContent.includes('Man-Eater Bug')`),false);


    await pass('b'); assert.notEqual(await evaluate('view.players[1].monsters[0]'),null); await pass('a');
    assert.equal(await evaluate('view.players[1].monsters[0]'),null); assert.notEqual(await evaluate('view.players[0].monsters[0]'),null);
    assert.equal(await evaluate('view.chain.length'),0); assert.equal(await evaluate('view.decision'),null);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/1 quái bị phá bởi hiệu ứng/);
    await inspectGraveyard('self',['Tribute to The Doomed','Battle Ox']); await inspectGraveyard('opponent',['Man-Eater Bug']);
    const facts = await evaluate('view.activity.flatMap(x=>x.resolution||[])');
    assert.deepEqual(facts,[{kind:'discard-cost',playerId:'a',count:1},{kind:'effect-destroyed',count:1}]); assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'tribute-doomed',cancelPreservesCards:true,fromOwnSet:true,costPaidAtActivation:true,targetDestroyedAtResolution:true,hiddenTarget:true,chainTargetPrivacy:true,chainPreviewPrivacy:true,choicePreviews:true,previewKeepsHiddenIdentity:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
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
      const summary=await verifyResultSummary('điểm gốc về 0');await seat('b');assert.equal(await verifyResultSummary('điểm gốc về 0'),summary);
    } else assert.equal(await evaluate('view.result'),null);
    if(lifePointsMode==='normal')await verifyResultSummary();
    assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'life-points-'+lifePointsMode,resultSummary:lifePointsMode==='lethal',summaryHiddenWhenOngoing:lifePointsMode==='normal',gainFromOwnSet:lifePointsMode==='normal',lifePoints:await evaluate('view.players.map(p=>p.lifePoints)'),delayedUntilResolution:true,fixtureOnlyAtSetup:true,runtimeExceptions:errors.length}));
  } else if (expanded && !fullDuel && !deckOverview) {
    assert.equal(await evaluate('catalog.size'), 109);
    assert.match(await evaluate(`document.getElementById('catalog-count').textContent`), /109/);
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
    await closeDeck();
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
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'expanded-catalog', catalog: 109, reviewedCardPreviews: 109, dataDrivenLevels: true, tributePreviews: true, oneTributeSetCancelPreservesState: true, deselectionUpdatesPreview: true, ownSetPrivacy: true, tributeSummon: 'Gaia The Fierce Knight', battleTarget: 'Armored Lizard', battleDamage: 800, fixtureOnlyAtSetup: true, runtimeExceptions: errors.length }));
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
    assert.equal((await rows()).length,109);await verifyComposition();
    const key=async(key,code,windowsVirtualKeyCode,modifiers=0)=>{await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode,modifiers,...(code==='Space'?{text:' '}:code==='Enter'?{text:'\r'}:{})});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode,modifiers});await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');};
    assert.equal(await evaluate(`document.getElementById('deck-undo').disabled`),true);
    assert.equal(await evaluate(`document.getElementById('deck-redo').disabled`),true);
    const historyCard=saved.cards.find(id=>r.cards[id].legality.maxCopies>saved.cards.filter(c=>c===id).length);
    await change(historyCard,'add');const changed=await evaluate('JSON.stringify(deckDraft.cards)');
    await key('z','KeyZ',90,2);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    assert.equal(await evaluate('document.activeElement.id'),'deck-redo');
    await key('y','KeyY',89,2);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),changed);
    await key('z','KeyZ',90,2);await key('Z','KeyZ',90,10);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),changed);
    // Editing text must retain the browser's native undo instead of touching the deck.
    await click(`document.getElementById('deck-search')`);await send('Input.insertText',{text:'Blue'});
    const nativeBefore=await evaluate('JSON.stringify(deckDraft.cards)');
    await key('z','KeyZ',90,2);
    assert.equal(await evaluate(`document.getElementById('deck-search').value`),'');
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),nativeBefore);
    await key('y','KeyY',89,2);
    assert.equal(await evaluate(`document.getElementById('deck-search').value`),'Blue');
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),nativeBefore);
    await evaluate(`document.getElementById('deck-search').value='';document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    await key('Tab','Tab',9);assert.equal(await evaluate('document.activeElement.id'),'deck-kind');await key('z','KeyZ',90,2);
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),nativeBefore);
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
    await closeDeck();await openDeck();
    assert.deepEqual(await evaluate('[deckDraft.undo,deckDraft.redo]'),[[],[]]);
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
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
    await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await closeDeck();await wait(`!document.getElementById('deck-dialog').open`);assert.deepEqual(await evaluate(`api('/api/deck')`),saved);
    await openDeck();assert.equal(await evaluate(`document.getElementById('deck-presence').value`),'all');
    assert.equal(await evaluate(`document.getElementById('deck-sort').value`),'catalog');
    assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),original);
    assert.deepEqual(await evaluate('[deckDraft.undo,deckDraft.redo]'),[[],[]]);await closeDeck();
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    await seat('b');await openDeck();await verifyComposition();
    assert.equal(await evaluate(`document.getElementById('deck-presence').value`),'all');
    assert.equal(await evaluate(`document.getElementById('deck-sort').value`),'catalog');
    await closeDeck();await seat('a');
    // Seat handoff deliberately rotates private handles; compare public game state without handles.
    const withoutHandles=value=>JSON.stringify(value,(key,item)=>key==='handle'?undefined:item);
    assert.equal(withoutHandles(await evaluate('view')),withoutHandles(JSON.parse(before)));assert.equal(errors.length,0);
    console.log(JSON.stringify({platform:process.platform,browserVersion:browserVersion.product,mode:'deck-overview',catalog:109,undoRedo:true,windowsHistoryShortcuts:true,nativeSearchUndoPreserved:true,historyLimit:50,defaultUndoable:true,historyResetOnReopen:true,compositionCountsCopies:true,sortModes:['catalog','name','level','attack','copies'],sortingPreservesDeckOrder:true,keyboardFocusRetained:true,copyLimitFocusFallback:true,removedRowFocusFallback:true,emptyListFocusSearch:true,combinedFilters:true,removedLastCopyDisappears:true,addRestoresRow:true,defaultRefreshesCounts:true,preview:true,filterPreservesDraft:true,cancelPreservesSaved:true,seatReset:true,responsiveWidths:[1440,390],runtimeExceptions:errors.length}));
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
    const upload = async (path,apply=true) => {
      const root = await send('DOM.getDocument');
      const input = await send('DOM.querySelector',{nodeId:root.root.nodeId,selector:'#deck-file'});
      await send('DOM.setFileInputFiles',{nodeId:input.nodeId,files:[path]});
      await wait(`!busy && document.getElementById('deck-file').value===''`);
      if(apply&&await evaluate(`document.getElementById('deck-import-dialog').open`)) {
        await click(`document.getElementById('deck-import-apply')`);
        await wait(`!document.getElementById('deck-import-dialog').open`);
      }
    };
    const invalidPath=join(downloads,'invalid.json');await writeFile(invalidPath,'{');
    const historyBeforeInvalid=await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])');
    await upload(invalidPath);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/Không nhập được/);
    assert.equal(await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])'),historyBeforeInvalid);
    assert.equal(await evaluate('deckDraft.cards.length'),41);
    await change('official:89631139','remove'); assert.equal(await evaluate('deckDraft.cards.length'),40);
    const beforeImport=await evaluate('JSON.stringify(deckDraft.cards)');
    const untouched=await evaluate('JSON.stringify(deckDraft)'),savedBeforePreview=await evaluate(`api('/api/deck')`);
    await upload(exportedPath,false);
    assert.equal(await evaluate(`document.getElementById('deck-import-dialog').open`),true);
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),untouched);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    assert.deepEqual(await evaluate(`api('/api/deck')`),savedBeforePreview);
    assert.match(await evaluate(`document.getElementById('deck-import-summary').textContent`),/40.*41.*1 loại bài/);
    assert.equal(await evaluate(`document.getElementById('deck-import-file-name').textContent`),'classic-duel-deck-a.json');
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#deck-import-rows tr')].map(row=>({id:row.dataset.cardId,old:Number(row.cells[1].textContent),next:Number(row.cells[2].textContent)}))`),[{id:'official:89631139',old:2,next:3}]);
    assert.equal(await evaluate('document.activeElement.id'),'deck-import-cancel');
    await click(`document.getElementById('deck-import-cancel')`);
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),untouched);
    assert.equal(await evaluate('deckImportPreview'),null);
    assert.equal(await evaluate(`document.querySelectorAll('#deck-import-rows tr').length`),0);
    assert.equal(await evaluate(`document.getElementById('deck-import-file-name').textContent`),'');
    await upload(exportedPath,false);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await wait(`!document.getElementById('deck-import-dialog').open`);
    assert.equal(await evaluate(`document.getElementById('deck-dialog').open`),true);
    assert.equal(await evaluate('JSON.stringify(deckDraft)'),untouched);assert.equal(await evaluate('deckImportPreview'),null);
    await upload(exportedPath,false);
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      assert.equal(await evaluate(`(()=>{const d=document.getElementById('deck-import-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&d.scrollWidth<=d.clientWidth+1&&r.height<=innerHeight})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','deck-import-preview');await mkdir(folder,{recursive:true});
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    await click(`document.getElementById('deck-import-apply')`);
    assert.equal(await evaluate('deckDraft.cards.length'),41);
    assert.equal(await evaluate('deckDraft.undo.length'),JSON.parse(untouched).undo.length+1);
    assert.equal(await evaluate('deckImportPreview'),null);
    await click(`document.getElementById('deck-undo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),beforeImport);
    await upload(exportedPath); assert.equal(await evaluate('deckDraft.cards.length'),41);
    const importedCards=await evaluate('JSON.stringify(deckDraft.cards)');
    await click(`document.getElementById('deck-undo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),beforeImport);
    await click(`document.getElementById('deck-redo')`);assert.equal(await evaluate('JSON.stringify(deckDraft.cards)'),importedCards);
    const sameHistory=await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])');
    await upload(exportedPath,false);
    assert.match(await evaluate(`document.getElementById('deck-import-summary').textContent`),/Danh sách và thứ tự giống/);
    assert.equal(await evaluate(`document.getElementById('deck-import-table').hidden`),true);
    await click(`document.getElementById('deck-import-apply')`);
    assert.equal(await evaluate('JSON.stringify([deckDraft.undo,deckDraft.redo])'),sameHistory);
    const reversedPath=join(downloads,'reordered.json');await writeFile(reversedPath,JSON.stringify({...portable,cards:[...portable.cards].reverse()}));
    const beforeReordered=await evaluate('JSON.stringify(deckDraft)');await upload(reversedPath,false);
    assert.match(await evaluate(`document.getElementById('deck-import-summary').textContent`),/Chỉ thay đổi thứ tự/);
    assert.equal(await evaluate(`document.getElementById('deck-import-table').hidden`),true);
    await click(`document.getElementById('deck-import-cancel')`);assert.equal(await evaluate('JSON.stringify(deckDraft)'),beforeReordered);
    assert.match(await evaluate(`document.getElementById('deck-error').textContent`),/bản nháp/);
    assert.equal(await evaluate(`(async()=> (await api('/api/deck')).cards.length)()`),40);
    assert.equal(await evaluate('JSON.stringify(view)'),before);
    await closeDeck(); await openDeck();
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
    await closeDeck();
    await openDeck(); assert.equal(await evaluate('deckDraft.cards.length'), 41);
    await evaluate(`document.getElementById('deck-search').value='not a real card name'; document.getElementById('deck-search').dispatchEvent(new Event('input'))`);
    assert.match(await evaluate(`document.getElementById('deck-catalog').textContent`), /Không có lá phù hợp/);
    await click(`document.getElementById('deck-search')`);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await wait('!busy'); assert.equal(await evaluate(`document.getElementById('deck-dialog').open`), true);

    await evaluate(`document.getElementById('deck-search').value=''; document.getElementById('deck-kind').value='spell'; document.getElementById('deck-kind').dispatchEvent(new Event('change'))`);
    assert.equal(await evaluate(`document.querySelectorAll('#deck-catalog .deck-row').length`), 2);
    await closeDeck();
    await seat('b'); await openDeck(); assert.equal(await evaluate('deckDraft.cards.length'), 40);
    await upload(exportedPath); assert.equal(await evaluate('deckDraft.cards.length'),41);
    assert.equal(await evaluate(`(async()=> (await api('/api/deck')).cards.length)()`),40);
    await closeDeck(); await openDeck();
    assert.equal(await evaluate('deckDraft.cards.length'),40);
    await change('official:97590747', 'add'); await change('official:05053103', 'add'); await saveDeck();
    const oldId = await evaluate('view.duelId');
    await click(`document.getElementById('reset')`); await click(`document.querySelector('#new-game-form input[value="a"]')`);
    await click(`document.querySelector('#new-game-form button[type="submit"]')`);
    await wait(`!busy && view.duelId!==${JSON.stringify(oldId)} && !document.getElementById('new-game-dialog').open`);
    assert.equal(await evaluate('view.players[0].deckCount + view.opponentHandCount'), 41);
    assert.equal(await evaluate('view.players[1].deckCount + view.selfHand.length'), 42);
    await seat('a'); await openDeck(); assert.equal(await evaluate('deckDraft.cards.length'), 41);
    await closeDeck();
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'deck-builder',importPreview:true,importCancelAndEscapePreserveDraft:true,importApplyOneUndoStep:true,importSameFileNoHistoryChange:true,importPreviewResponsive:true, importedDeckUndoRedo:true,invalidImportPreservesHistory:true,portableFileRoundtrip: true, invalidImportPreservesDraft: true, importRequiresSave: true, decks: [41,42], invalidSizeBlocked: true, copyLimits: true, cancelPreservesSaved: true, networkErrorPreservesDraft: true, savePreservesDuel: true, appliedOnNewDuel: true, runtimeExceptions: errors.length }));
  } else if (concede) {
    const requests=[],previousOnMessage=ws.onmessage;
    ws.onmessage=event=>{
      const m=JSON.parse(event.data);
      if(m.method==='Network.requestWillBeSent'&&m.params.request.method==='POST')requests.push(m.params.request.url);
      previousOnMessage(event);
    };
    await send('Network.enable');
    const savedA=await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`);
    await seat('b');const savedB=await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`);await seat('a');
    const before = await evaluate('JSON.stringify(view)');
    dialogAnswer = false; await click(`document.getElementById('concede')`);
    assert.equal(nativeDialogs.length, 1); assert.equal(nativeDialogs[0].type, 'confirm');
    assert.equal(await evaluate('JSON.stringify(view)'), before);
    await verifyResultSummary();
    dialogAnswer = true; await actionClick(`document.getElementById('concede')`);
    assert.deepEqual(await evaluate('view.result'), { winner: 'b', reason: 'concession' });
    assert.match(await evaluate(`document.getElementById('guide-text').textContent`), /đầu hàng/);
    assert.deepEqual(await evaluate('view.availableActions'), []);
    const summary=await verifyResultSummary('đầu hàng');
    await seat('b'); assert.equal(await evaluate('view.result.reason'), 'concession');
    assert.equal(await verifyResultSummary('đầu hàng'),summary);
    const finished=await evaluate('JSON.stringify(view)'),version=await evaluate('view.stateVersion');
    await click(`document.getElementById('refresh')`);await wait(`!busy&&document.getElementById('status').textContent.includes('Đã cập nhật')`);
    assert.equal(await evaluate('view.stateVersion'),version);assert.equal(await verifyResultSummary('đầu hàng'),summary);
    for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
      await evaluate(`document.getElementById('result-panel').scrollIntoView({block:'start'})`);
      assert.equal(await evaluate(`(()=>{const e=document.getElementById('result-panel'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1})()`),true);
      if(process.argv.includes('--screenshots')) {
        const folder=join(projectRoot,'artifacts','result-summary');await mkdir(folder,{recursive:true});
        const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));
      }
    }
    await send('Emulation.clearDeviceMetricsOverride');await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const requestCount=requests.length;
    await click(`document.getElementById('result-new-game')`);await wait(`document.getElementById('new-game-dialog').open`);
    await click(`document.getElementById('cancel-new-game')`);assert.equal(await evaluate('JSON.stringify(view)'),finished);
    assert.equal(await verifyResultSummary('đầu hàng'),summary);assert.equal(requests.length,requestCount);
    await click(`document.getElementById('result-new-game')`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await wait(`!document.getElementById('new-game-dialog').open`);assert.equal(await evaluate('JSON.stringify(view)'),finished);assert.equal(requests.length,requestCount);
    const oldId = await evaluate('view.duelId');
    await click(`document.getElementById('result-new-game')`);
    await click(`document.querySelector('#new-game-form input[value="b"]')`);
    await click(`document.querySelector('#new-game-form button[type="submit"]')`);
    await wait(`!busy && view.duelId!==${JSON.stringify(oldId)} && !document.getElementById('new-game-dialog').open`);
    assert.equal(await evaluate('view.result'), null);
    assert.equal(await evaluate('view.activity.length'), 0);
    assert.equal(await evaluate('view.turn.activePlayer'), 'b');
    assert.equal(await evaluate('view.selfHand.length'), 6);
    assert.equal(await evaluate('view.players.every(p=>p.lifePoints===8000)'), true);
    await verifyResultSummary();
    assert.equal(await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`),savedB);await seat('a');
    assert.equal(await evaluate(`api('/api/deck').then(data=>JSON.stringify(data))`),savedA);
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'concede',resultSummary:true,summarySameAcrossSeats:true,summaryRefreshStable:true,summaryResponsive:true,restartCancelPreservesResult:true,summaryClearedOnRestart:true,savedDecksUnchanged:true, cancelledWithoutChanges: true, winner: 'b', freshDuelAfterFinish: true, runtimeExceptions: errors.length }));
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
      const summary=await verifyResultSummary('không thể bốc đủ bài');await seat('a');assert.equal(await verifyResultSummary('không thể bốc đủ bài'),summary);
    } else {
      assert.equal(await evaluate('view.result'), null);
      assert.match(await evaluate(`document.getElementById('status').textContent`), /bốc 2 lá/);
      await verifyResultSummary();
    }
    assert.equal(errors.length, 0);
    console.log(JSON.stringify({ platform: process.platform, browserVersion: browserVersion.product, mode: 'pot-deck-out',resultSummary:deckOut<2,summaryHiddenWhenOngoing:deckOut===2, remainingBefore: deckOut, actualDraws: deckOut, result: await evaluate('view.result'), runtimeExceptions: errors.length }));
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
    await evaluate(`document.getElementById('hand-sort').value='name';document.getElementById('hand-sort').dispatchEvent(new Event('change'))`);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#hand .decision-chosen')].map(c=>c.dataset.decisionHandle).sort()`),[...checkedBeforeFailure].sort());
    const beforeFailure = await evaluate('JSON.stringify(view)');
    await send('Network.enable');
    await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await click(`document.querySelector('#decision-form button[type="submit"]')`); await wait('!busy');
    assert.equal(await evaluate('JSON.stringify(view)'),beforeFailure);
    assert.deepEqual(await evaluate(`[...document.querySelectorAll('#decision-form input:checked')].map(e=>e.value)`),checkedBeforeFailure);
    assert.match(await evaluate(`document.getElementById('status').textContent`),/Chưa xác nhận lựa chọn/);
    await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    // Selecting a hand card toggles the same private checkbox; a second click restores it.
    assert.equal(await evaluate(`document.querySelectorAll('#hand .decision-choice').length`),8);
    assert.equal(await evaluate(`document.querySelectorAll('#hand .decision-chosen').length`),2);
    const third=await evaluate(`document.querySelectorAll('#decision-form input')[2].value`);
    await evaluate(`[...document.querySelectorAll('#hand .card')].find(c=>c.dataset.decisionHandle===${JSON.stringify(third)}).focus()`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32,text:' '});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
    assert.equal(await evaluate('document.activeElement.dataset.decisionHandle'),third);
    assert.equal(await disabled(),true);assert.equal(await evaluate(`document.querySelectorAll('#hand .decision-chosen').length`),3);
    await click(`[...document.querySelectorAll('#hand .card')].find(c=>c.dataset.decisionHandle===${JSON.stringify(third)})`);
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
    assert.equal(await evaluate(`document.querySelectorAll('main .decision-choice').length`),0);
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
        assert.equal(await evaluate('view.normalSummonQuota.remaining'),1);
        assert.equal(await evaluate('view.normalSummonQuota.playerId'),active);
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
    await click(textButton('#actions button', 'Tấn công')); await chooseTarget(slot); await confirm();
    assert.equal(await evaluate(`document.querySelectorAll('.battle-attacker').length`),1);
    assert.equal(await evaluate(`document.querySelectorAll('.battle-target').length`),1);
    assert.match(await evaluate(`document.getElementById('battle-status').textContent`),new RegExp(attacker));
    assert.match(await evaluate(`document.getElementById('battle-status').textContent`),/Bài úp/);
    assert.equal(await evaluate(`document.getElementById('battle-status').textContent.includes(${JSON.stringify(flipped)})`),false);
    assert.match(await evaluate(`document.querySelector('.battle-target').getAttribute('aria-label')`),/Bài úp.*Mục tiêu/);
    assert.equal(await evaluate(`document.querySelector('.battle-target .card-name')`),null);
    if(attacker==='La Jinn the Mystical Genie of the Lamp'){
      const pendingView=await evaluate('JSON.stringify(view)');
      for(const [label,width,height]of [['desktop',1440,1000],['narrow',390,844]]){
        await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
        assert.equal(await evaluate(`(()=>{const e=document.getElementById('battle-status'),r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&e.scrollWidth<=e.clientWidth+1})()`),true);
        if(process.argv.includes('--screenshots')){const folder=join(projectRoot,'artifacts','battle-cues');await mkdir(folder,{recursive:true});await evaluate(`document.getElementById('battle-status').scrollIntoView({block:'start'})`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(join(folder,label+'.png'),Buffer.from(shot.data,'base64'));}
      }
      await send('Emulation.clearDeviceMetricsOverride');
      await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      assert.equal(await evaluate('JSON.stringify(view)'),pendingView);
    }
    const declaredVersion=await evaluate('view.stateVersion');await seat('b');
    assert.equal(await evaluate('view.stateVersion'),declaredVersion);
    assert.match(await evaluate(`document.getElementById('battle-status').textContent`),new RegExp(flipped));
    assert.equal(await evaluate(`document.querySelector('.battle-target').classList.contains('back')`),false);
    await pass('a'); await pass('b');
    await seat('b'); await decision(attacker); await pass('a'); await pass('b');
    assert.equal(await evaluate(`document.getElementById('battle-status').hidden`),true);
    assert.equal(await evaluate(`document.querySelectorAll('.battle-attacker,.battle-target').length`),0);
    assert.ok(await evaluate(`view.players[1].graveyard.some(c=>catalog.get(c.definition.id).name===${JSON.stringify(flipped)})`));
    assert.match(await evaluate(`document.getElementById('status').textContent`), flipped === 'Hane-Hane' ? /1 lá trở về tay Người chơi A/ : /1 quái bị phá bởi hiệu ứng/);
  }
  await seat('a'); assert.ok(await evaluate(`view.selfHand.some(c=>catalog.get(c.definition.id).name==='La Jinn the Mystical Genie of the Lamp')`));
  assert.equal(await evaluate('view.players[0].monsters.filter(Boolean).length'), 0);
  assert.equal(await evaluate(`['Pot of Greed','Hane-Hane','Man-Eater Bug','Trap Hole','Fissure'].some(name=>document.getElementById('activity').textContent.includes(name))`), false);
  assert.equal(errors.length, 0);
  console.log(JSON.stringify({ browser: browser.brand, browserVersion: browserVersion.product, platform: process.platform, fixtureOnlyAtSetup: true,battleCues:true,hiddenTargetPrivacy:true,battleCuesClearedAfterResolution:true, flipDecisionPreviews: true, radioSelectionSurvivesNetworkFailure: true, legalActionCues: ['main-hand', 'pass-only-chain', 'trap-summon-response', 'battle', 'mandatory-choice', 'own-only'], sharedBack: ['monster', 'spell', 'trap'], effectFlows: ['Pot of Greed', 'Fissure', 'Trap Hole', 'Hane-Hane', 'Man-Eater Bug'], interaction: 'mouse controls and dialogs', graveyard: ['empty', 'inline card text', 'top-first order', 'read-only both players'], runtimeExceptions: errors.length }));
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
