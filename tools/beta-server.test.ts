import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createBetaServer } from './beta-server.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const registry = createRegistry(read('../data/generated/pilot.json').cards, goat200508Format, {}, read('../data/reviews/pilot.spell-effects.json'), read('../data/reviews/pilot.flip-effects.json'), read('../data/reviews/pilot.trap-effects.json'));
const server = createBetaServer(registry); let base: string;
const post = (path: string, body: unknown, cookie = '') => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(body) });
beforeAll(async () => { await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const addr = server.address(); if (!addr || typeof addr === 'string') throw new Error('No listener'); base = `http://127.0.0.1:${addr.port}`; });
afterAll(async () => { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
describe('Loopback beta HTTP boundary', () => {
  it('serves the UI and public catalog but not repository files', async () => {
    const response = await fetch(base); expect(response.status).toBe(200); expect(await response.text()).toContain('CLASSIC');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    const catalog = await (await fetch(base + '/api/catalog')).json(); expect(catalog.cards).toHaveLength(20);
    expect(JSON.stringify(catalog)).not.toContain('spellHandlers');
    expect((await fetch(base + '/data/generated/pilot.json')).status).toBe(404);
    for(const name of ['monster-and-back','spell-and-trap']) {
      const asset=await fetch(`${base}/assets/card-frames/${name}.png`);
      expect(asset.status).toBe(200); expect(asset.headers.get('content-type')).toBe('image/png');
      expect(Buffer.from(await asset.arrayBuffer()).equals(readFileSync(new URL(`../apps/beta/public/assets/card-frames/${name}.png`,import.meta.url)))).toBe(true);
    }
  });
  it('requires seat selection then sends only the selected PlayerView', async () => {
    expect((await fetch(base + '/api/view')).status).toBe(401);
    const response = await post('/api/seat', { seat: 'b' });
    expect(response.headers.get('set-cookie')).toContain('HttpOnly'); expect(response.headers.get('set-cookie')).toContain('SameSite=Strict');
    const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const view = await (await fetch(base + '/api/view', { headers: { Cookie: cookie } })).json();
    expect(view.viewerId).toBe('b'); expect(view.selfHand).toHaveLength(5); expect(view.opponentHandCount).toBe(6);
    for (const key of ['rng', 'cards', 'pendingTriggers', 'privateState', 'sourceAtActivation']) expect(view).not.toHaveProperty(key);
  });
  it('routes a command through its cookie seat and deduplicates retries', async () => {
    const response = await post('/api/seat', { seat: 'a' }), cookie = response.headers.get('set-cookie')!.split(';')[0]!, view = await response.json();
    const cmd = { commandId: 'http-pass-once', duelId: view.duelId, expectedStateVersion: view.stateVersion, action: { type: 'pass' } };
    const first = await (await post('/api/command', cmd, cookie)).json(), retry = await (await post('/api/command', cmd, cookie)).json();
    expect(first.outcome.accepted).toBe(true); expect(retry.outcome).toEqual(first.outcome); expect(retry.view.stateVersion).toBe(first.view.stateVersion);
    const forged = await (await post('/api/command', { ...cmd, actorId: 'b' }, cookie)).json();
    expect(forged.outcome).toMatchObject({ accepted: false, reason: 'invalid-action' });
  });
  it('rejects foreign origins, invalid seats, malformed JSON and oversized bodies', async () => {
    expect((await fetch(base + '/api/seat', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: '{"seat":"a"}' })).status).toBe(403);
    expect((await post('/api/seat', { seat: 'spectator' })).status).toBe(400);
    expect((await fetch(base + '/api/seat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
    expect((await post('/api/seat', { seat: 'a', oversized: 'x'.repeat(18000) })).status).toBe(413);
  });
  it.each(['a', 'b'])('starts a fresh duel with %s first and the correct 6/5 opening hands', async firstPlayer => {
    const seat = await post('/api/seat', { seat: 'a' }); const cookie = seat.headers.get('set-cookie')!.split(';')[0]!; const old = await seat.json();
    const response = await post('/api/reset', { firstPlayer }, cookie); expect(response.status).toBe(200); const view = await response.json();
    expect(view.duelId).not.toBe(old.duelId); expect(view.stateVersion).toBe(0); expect(view.turn).toEqual({ number: 1, activePlayer: firstPlayer, phase: 'draw' });
    expect(view.selfHand).toHaveLength(firstPlayer === 'a' ? 6 : 5); expect(view.opponentHandCount).toBe(firstPlayer === 'a' ? 5 : 6);
    expect(view.players.map((p: {lifePoints:number}) => p.lifePoints)).toEqual([8000, 8000]); expect(view.activity).toEqual([]);
    expect(view.players.every((p: {monsters: unknown[]; spellsTraps:unknown[]}) => [...p.monsters, ...p.spellsTraps].every(c=>c===null))).toBe(true);
  });
  it('selects random first player on the server without exposing RNG state', async () => {
    const seat = await post('/api/seat', { seat: 'b' }); const cookie = seat.headers.get('set-cookie')!.split(';')[0]!;
    const view = await (await post('/api/reset', { firstPlayer: 'random' }, cookie)).json();
    expect(['a','b']).toContain(view.turn.activePlayer); expect(view.selfHand).toHaveLength(view.turn.activePlayer === 'b' ? 6 : 5);
    expect(view).not.toHaveProperty('rng'); expect(JSON.stringify(view)).not.toContain('privateState');
  });
  it('preserves the current duel and view when new-game settings are rejected', async () => {
    const seat = await post('/api/seat', { seat: 'a' }); const cookie = seat.headers.get('set-cookie')!.split(';')[0]!; const before = await seat.json();
    for (const body of [{ firstPlayer: 'outsider' }, { firstPlayer: 'a', seedHex: '12'.repeat(32) }, { firstPlayer: 'b', lifePoints: 1 }])
      expect((await post('/api/reset', body, cookie)).status).toBe(400);
    const after = await (await fetch(base+'/api/view', {headers:{Cookie:cookie}})).json(); expect(after).toEqual(before);
  });
  it('requires a local seat for creating a new duel', async () => {
    expect((await post('/api/reset', { firstPlayer: 'b' })).status).toBe(401);
  });

  it('requires a seat and binds deck edits to the cookie seat even across shared-cookie tabs', async () => {
    expect((await fetch(base+'/api/deck')).status).toBe(401);
    expect((await post('/api/deck', {})).status).toBe(401);
    const seat=await post('/api/seat',{seat:'a'}), cookie=seat.headers.get('set-cookie')!.split(';')[0]!;
    const own=await (await fetch(base+'/api/deck?seat=b',{headers:{Cookie:cookie}})).json();
    expect(own.seat).toBe('a');
    const saved=await post('/api/deck',{seat:'b',revision:own.revision,cards:own.cards},cookie);
    expect(saved.status).toBe(409);
    expect(await (await fetch(base+'/api/deck',{headers:{Cookie:cookie}})).json()).toEqual(own);
  });
  it('rejects invalid decks and extra fields without changing saved deck or duel', async () => {
    const seat=await post('/api/seat',{seat:'a'}), cookie=seat.headers.get('set-cookie')!.split(';')[0]!, beforeView=await seat.json();
    const own=await (await fetch(base+'/api/deck',{headers:{Cookie:cookie}})).json();
    const normals=Object.values(registry.cards).filter(c=>c.kind==='normal-monster').map(c=>c.id);
    const normalDeck=[...normals,...normals,...normals].slice(0,40);
    for (const cards of [own.cards.slice(0,39),[...normalDeck,'official:55144522','official:55144522'],[...normalDeck,'__proto__']]) {
      expect((await post('/api/deck',{seat:'a',revision:own.revision,cards},cookie)).status).toBe(422);
    }
    expect((await post('/api/deck',{seat:'a',revision:own.revision,cards:own.cards,path:'forged'},cookie)).status).toBe(400);
    expect(await (await fetch(base+'/api/deck',{headers:{Cookie:cookie}})).json()).toEqual(own);
    expect(await (await fetch(base+'/api/view',{headers:{Cookie:cookie}})).json()).toEqual(beforeView);
  });
  it('keeps the running duel unchanged on save and uses independent saved decks only on reset', async () => {
    const seat=await post('/api/seat',{seat:'a'}), cookie=seat.headers.get('set-cookie')!.split(';')[0]!, beforeView=await seat.json();
    const own=await (await fetch(base+'/api/deck',{headers:{Cookie:cookie}})).json();
    const normals=Object.values(registry.cards).filter(c=>c.kind==='normal-monster').map(c=>c.id);
    const cards=[...normals,...normals,...normals].slice(0,40).concat('official:55144522');
    const saved=await post('/api/deck',{seat:'a',revision:own.revision,cards},cookie); expect(saved.status).toBe(200);
    expect((await saved.json()).revision).toBe(own.revision+1);
    expect(await (await fetch(base+'/api/view',{headers:{Cookie:cookie}})).json()).toEqual(beforeView);
    expect((await post('/api/deck',{seat:'a',revision:own.revision,cards:own.cards},cookie)).status).toBe(409);
    const reset=await (await post('/api/reset',{firstPlayer:'a'},cookie)).json();
    expect(reset.selfHand.length+reset.players[0].deckCount).toBe(41);
    expect(reset.opponentHandCount+reset.players[1].deckCount).toBe(40);
    expect(reset.duelId).not.toBe(beforeView.duelId);
    const b=await post('/api/seat',{seat:'b'}), cookieB=b.headers.get('set-cookie')!.split(';')[0]!;
    expect((await (await fetch(base+'/api/deck',{headers:{Cookie:cookieB}})).json()).cards).toHaveLength(40);
  });

  it('validates portable files without saving decks or changing the duel, and binds the selected seat', async () => {
    const selected = await post('/api/seat', {seat:'a'}), cookie = selected.headers.get('set-cookie')!.split(';')[0]!;
    const get = async (path:string) => (await fetch(base+path,{headers:{Cookie:cookie}})).json();
    const before = await get('/api/deck'), duel = await get('/api/view');
    const exported = await post('/api/deck/export',{seat:'a',cards:before.cards},cookie);
    expect(exported.status).toBe(200); const file = await exported.json();
    expect(Object.keys(file).sort()).toEqual(['cards','format','kind','schemaVersion']);
    expect((await post('/api/deck/import',{seat:'a',text:JSON.stringify(file)})).status).toBe(401);
    expect((await post('/api/deck/import',{seat:'b',text:JSON.stringify(file)},cookie)).status).toBe(409);
    expect((await post('/api/deck/import',{seat:'a',text:'{'},cookie)).status).toBe(422);
    expect((await post('/api/deck/import',{seat:'a',text:JSON.stringify({...file,definitions:[]})},cookie)).status).toBe(422);
    const imported = await post('/api/deck/import',{seat:'a',text:JSON.stringify(file)},cookie);
    expect(imported.status).toBe(200); expect(await imported.json()).toEqual({cards:before.cards});
    expect(await get('/api/deck')).toEqual(before); expect(await get('/api/view')).toEqual(duel);
  });

});
