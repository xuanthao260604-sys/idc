import { readFileSync } from 'node:fs';
import { createRegistry } from '../packages/engine/src/registry.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const bundle = read('data/generated/pilot.json');
const reviews = read('data/reviews/pilot.spell-effects.json');
const registry = createRegistry(bundle.cards, goat200508Format, {}, reviews, read('data/reviews/pilot.flip-effects.json'), read('data/reviews/pilot.trap-effects.json'));
console.log(JSON.stringify({
  format: registry.format,
  importedSnapshot: bundle.summary,
  engineCapabilities: {
    supportedDefinitions: Object.keys(registry.cards).length,
    normalMonsters: Object.values(registry.cards).filter(c => c.kind === 'normal-monster').length,
    reviewedNormalSpells: Object.keys(registry.spellHandlers),
    reviewedFlipMonsters: Object.keys(registry.flipHandlers),
    reviewedNormalTraps: Object.keys(registry.trapHandlers),
    unsupportedIds: registry.unsupportedIds,
    scope: ['normal-spell-single-link-vanilla-v1', 'flip-single-link-v1', 'summon-response-trap-v1'],
    limitations: ['only reviewed summon Traps or passes as responses', 'no general mixed Chain/negation', 'no general SEGOC/modifiers/replacements', 'no online multiplayer or persistent matches'],
  },
}, null, 2));
