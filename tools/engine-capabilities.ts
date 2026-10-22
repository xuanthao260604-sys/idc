import { loadRuntimeCatalog } from './runtime-catalog.js';
const { registry, importedSnapshots } = loadRuntimeCatalog();
console.log(JSON.stringify({
  format: registry.format,
  importedSnapshots,
  engineCapabilities: {
    supportedDefinitions: Object.keys(registry.cards).length,
    normalMonsters: Object.values(registry.cards).filter(c => c.kind === 'normal-monster').length,
    reviewedNormalSpells: Object.keys(registry.spellHandlers),
    reviewedFlipMonsters: Object.keys(registry.flipHandlers),
    reviewedNormalTraps: Object.keys(registry.trapHandlers),
    unsupportedIds: registry.unsupportedIds,
    scope: ['normal-spell-single-link-vanilla-v1', 'normal-spell-life-points-single-link-v1', 'normal-spell-highest-defense-single-link-v1', 'normal-spell-highest-attack-position-single-link-v1', 'normal-spell-discard-target-single-link-v1', 'flip-single-link-v1', 'summon-response-trap-v1'],
    limitations: ['only reviewed summon Traps or passes as responses', 'no general mixed Chain/negation', 'no general SEGOC/modifiers/replacements', 'no online multiplayer or persistent matches'],
  },
}, null, 2));
