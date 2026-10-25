import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { projectRoot } from './project-root.js';
import { z } from 'zod';
import { exportDeck, importDeck } from './deck-transfer.js';
import { createDeckStore } from './deck-store.js';
import type { DeckStore } from './deck-store.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { createDuel } from '../packages/engine/src/duel.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
import type { Registry } from '../packages/engine/src/registry.js';

/** Loopback hotseat beta. Seat selection is intentional local switching, not user authentication. */
export function createBetaServer(registry: Registry, publicRoot = resolve(projectRoot, 'apps/beta/public'), testInitialState?: DuelState, deckStore: DeckStore = createDeckStore(registry)) {
  const newGame = (firstPlayer: 'a' | 'b' | 'random' = 'a') => createCommandAdapter(registry, createDuel(registry, {
    duelId: randomBytes(16).toString('hex'), players: [{ id: 'a', deck: [...deckStore.get('a').cards] }, { id: 'b', deck: [...deckStore.get('b').cards] }], ...(firstPlayer === 'random' ? {} : { firstPlayerId: firstPlayer }),
  }).state);
  // Trusted constructor input for browser fixtures; never configurable through HTTP or beta CLI.
  let game = testInitialState ? createCommandAdapter(registry, testInitialState) : newGame();
  const seats = new Map<string, 'a' | 'b'>();
  const catalog = Object.values(registry.cards).map(c => ({ id: c.id, revision: c.revision, name: c.name, text: c.text, kind: c.kind, maxCopies: Math.min(registry.rules.deck.combinedCopyLimit, c.legality.maxCopies!),
    ...('level' in c ? { level: c.level, attack: c.attack, defense: c.defense, attribute: c.attribute, race: c.race } : { subtype: c.subtype }) }));
  const assets: Record<string, [string, string]> = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'],
    '/assets/card-frames/monster-and-back.png': ['assets/card-frames/monster-and-back.png', 'image/png'],
    '/assets/card-frames/spell-and-trap.png': ['assets/card-frames/spell-and-trap.png', 'image/png'] };
  return createServer(async (req, res) => {
    const json = (status: number, body: unknown) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    const host = req.headers.host;
    if (!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) { json(403, { error: 'Máy chủ chỉ dành cho thử nghiệm trên máy này.' }); return; }
    const origin = req.headers.origin;
    if (origin && origin !== `http://${host}`) { json(403, { error: 'Nguồn yêu cầu không hợp lệ.' }); return; }
    const url = new URL(req.url ?? '/', `http://${host}`);
    const sid = /(?:^|;\s*)ygo_beta=([A-Za-z0-9_-]+)/.exec(req.headers.cookie ?? '')?.[1];
    const actor = sid && seats.get(sid);
    try {
      if (req.method === 'GET' && assets[url.pathname]) {
        const [file, mime] = assets[url.pathname]!;
        const body = await readFile(resolve(publicRoot, file)); res.writeHead(200, { 'Content-Type': mime.startsWith('text/') ? `${mime}; charset=utf-8` : mime }); res.end(body); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/catalog') { json(200, { cards: catalog, deckRules: registry.rules.deck }); return; }
      if (req.method === 'GET' && url.pathname === '/api/view') {
        if (!actor) { json(401, { error: 'Hãy chọn người chơi.' }); return; }
        json(200, game.getView(actor, true)); return;
      }
      if (req.method === 'GET' && url.pathname === '/api/deck') {
        if (!actor) { json(401, { error: 'Hãy chọn người chơi.' }); return; }
        json(200, { ...deckStore.get(actor), defaultCards: deckStore.defaults }); return;
      }
      if (req.method !== 'POST' || !['/api/seat', '/api/command', '/api/reset', '/api/deck', '/api/deck/import', '/api/deck/export'].includes(url.pathname)) { json(404, { error: 'Không tìm thấy.' }); return; }
      if (!req.headers['content-type']?.startsWith('application/json')) { json(415, { error: 'Yêu cầu phải là JSON.' }); return; }
      let length = 0; const chunks: Buffer[] = [];
      for await (const chunk of req) { length += chunk.length; if (length > (url.pathname === '/api/deck/import' ? 32768 : 16384)) { json(413, { error: 'Yêu cầu quá lớn.' }); return; } chunks.push(chunk); }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { json(400, { error: 'JSON không hợp lệ.' }); return; }
      if (url.pathname === '/api/seat') {
        const parsed = z.strictObject({ seat: z.enum(['a', 'b']) }).safeParse(body);
        if (!parsed.success) { json(400, { error: 'Người chơi không hợp lệ.' }); return; }
        if (sid) seats.delete(sid);
        if (seats.size >= 32) { json(429, { error: 'Đã đủ phiên thử nghiệm; khởi động lại để xóa phiên cũ.' }); return; }
        const session = randomBytes(24).toString('base64url'); seats.set(session, parsed.data.seat);
        res.setHeader('Set-Cookie', `ygo_beta=${session}; HttpOnly; SameSite=Strict; Path=/`);
        json(200, game.refreshView(parsed.data.seat, true)); return;
      }
      if (!actor) { json(401, { error: 'Hãy chọn người chơi.' }); return; }
      if (url.pathname === '/api/deck/import' || url.pathname === '/api/deck/export') {
        const parsed = (url.pathname.endsWith('/import')
          ? z.strictObject({ seat: z.enum(['a', 'b']), text: z.string().max(12000) })
          : z.strictObject({ seat: z.enum(['a', 'b']), cards: z.array(z.string().min(1).max(128)) })).safeParse(body);
        if (!parsed.success) { json(400, { error: 'Dữ liệu chuyển deck không hợp lệ.' }); return; }
        if (parsed.data.seat !== actor) { json(409, { error: 'Người chơi đã thay đổi. Hãy mở lại deck.' }); return; }
        try {
          json(200, 'text' in parsed.data ? { cards: importDeck(registry, parsed.data.text) } : exportDeck(registry, parsed.data.cards));
        } catch (error) { json(422, { error: (error as Error).message }); }
        return;
      }
      if (url.pathname === '/api/deck') {
        const parsed = z.strictObject({ seat: z.enum(['a', 'b']), revision: z.number().int().nonnegative().safe(), cards: z.array(z.string().min(1).max(128)) }).safeParse(body);
        if (!parsed.success) { json(400, { error: 'Dữ liệu deck không hợp lệ.' }); return; }
        if (parsed.data.seat !== actor) { json(409, { error: 'Người chơi đã thay đổi ở cửa sổ khác. Đóng rồi mở lại deck.' }); return; }
        const result = await deckStore.save(actor, parsed.data.revision, parsed.data.cards);
        if (!result.ok) { json(result.status, { error: result.error }); return; }
        json(200, result.deck); return;
      }
      if (url.pathname === '/api/reset') {
        const firstPlayer = z.enum(['a', 'b', 'random']).default('a');
        const settings = z.union([
          z.strictObject({ firstPlayer, seat: z.enum(['a', 'b']), duelId: z.string().min(1).max(128), expectedStateVersion: z.number().int().nonnegative().safe() }),
          z.strictObject({ firstPlayer }), // Preserve the documented legacy API; the UI always sends all guards.
        ]).safeParse(body);
        if (!settings.success) { json(400, { error: 'Thiết lập người đi trước không hợp lệ.' }); return; }
        if ('seat' in settings.data) {
          if (settings.data.seat !== actor) { json(409, { error: 'Người chơi đã thay đổi. Hãy kiểm tra bàn đấu rồi chọn lại người chơi.' }); return; }
          const current = game.getView(actor);
          if (settings.data.duelId !== current.duelId || settings.data.expectedStateVersion !== current.stateVersion) {
            json(409, { error: 'Bàn đấu đã thay đổi. Hãy kiểm tra bàn đấu rồi mở lại Trận mới.' }); return;
          }
        }
        game = newGame(settings.data.firstPlayer); json(200, game.getView(actor, true)); return;
      }
      const outcome = game.submit(actor, body);
      json(200, { outcome, view: game.getView(actor, true) });
    } catch {
      // Never return server exceptions, state or private event logs to the browser.
      json(500, { error: 'Không xử lý được yêu cầu. Hãy xem lại hoặc khởi động lại trận thử.' });
    }
  });
}
