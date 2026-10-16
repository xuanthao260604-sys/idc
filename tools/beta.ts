import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { projectRoot } from './project-root.js';
import { createDeckStore } from './deck-store.js';
import { createBetaServer } from './beta-server.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
const read = (p: string) => JSON.parse(readFileSync(join(projectRoot, p), 'utf8'));
const registry = createRegistry(read('data/generated/pilot.json').cards, goat200508Format, {},
  read('data/reviews/pilot.spell-effects.json'), read('data/reviews/pilot.flip-effects.json'), read('data/reviews/pilot.trap-effects.json'));
const port = Number(process.env.YGO_BETA_PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('YGO_BETA_PORT phải từ 1 đến 65535');
const server = createBetaServer(registry, undefined, undefined, createDeckStore(registry, process.env.YGO_BETA_DECK_DIR ? resolve(process.env.YGO_BETA_DECK_DIR) : join(projectRoot, '.ygo-local', 'decks')));
server.on('error', error => { console.error(`Không khởi động được beta: ${error.message}`); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`YGO Classic Duel — beta trên máy này: http://127.0.0.1:${port}\nHai người thay phiên cùng máy; chưa có đấu online. Ctrl+C để dừng.`));
