import { readFile } from 'node:fs/promises';
import { createRegistry } from '../packages/engine/src/index.js';
import { runVanillaSmoke } from '../packages/engine/src/smoke.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';

const bundle = JSON.parse(await readFile('data/generated/pilot.json', 'utf8'));
const registry = createRegistry(bundle.cards, goat200508Format);
// Fixed seed only for this internal validation run; never use as a production session seed.
const { report } = runVanillaSmoke(registry, '12'.repeat(32));
if (!report.result || report.attacks === 0 || report.battleDamageEvents === 0)
  throw new Error('Smoke did not exercise a completed duel and battle damage');
console.log(JSON.stringify(report, null, 2));
