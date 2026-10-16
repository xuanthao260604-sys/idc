import { readFileSync } from 'node:fs';
import { createRegistry } from '../packages/engine/src/registry.js';
import { runMixedSmoke } from '../packages/engine/src/mixed-smoke.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const registry = createRegistry(read('data/generated/pilot.json').cards, goat200508Format, {},
  read('data/reviews/pilot.spell-effects.json'), read('data/reviews/pilot.flip-effects.json'), read('data/reviews/pilot.trap-effects.json'));
const { report } = runMixedSmoke(registry, '08'.padStart(64, '0'));
if (!report.result || report.activatedDefinitions.length !== 5 || !report.returnedToHand || !report.effectDestructions || !report.battleDamageEvents)
  throw new Error('Mixed smoke did not exercise all five effects and finish the duel');
console.log(JSON.stringify(report, null, 2));
