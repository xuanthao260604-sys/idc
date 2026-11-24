import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRuntimeCatalog, loadLegacyV5Catalog } from './runtime-catalog.js';
import { projectRoot } from './project-root.js';

/** Describe only active registry bindings whose review passed the normal catalog validation. */
export function createCapabilityReport(root = projectRoot, profile: 'current'|'legacy-v5'='current') {
  const { registry, importedSnapshots, effectReviews } = (profile==='legacy-v5'?loadLegacyV5Catalog:loadRuntimeCatalog)(root);
  const groups = [
    { kind: 'normal-spell', bindings: registry.spellHandlers, reviews: effectReviews.spells },
    { kind: 'flip-monster', bindings: registry.flipHandlers, reviews: effectReviews.flips },
    { kind: 'counter-trap', bindings: registry.counterTrapHandlers, reviews: effectReviews.counters },
    { kind: 'normal-trap', bindings: registry.trapHandlers, reviews: effectReviews.traps },
  ] as const;
  const reviewedEffects = groups.flatMap(group => Object.keys(group.bindings).map(cardId => {
    const review = group.reviews.find(review => review.cardId === cardId), card = registry.cards[cardId]!;
    if (!review) throw new Error(`Active effect has no validated review: ${cardId}`);
    return {
      cardId, name: card.name, kind: group.kind, scope: review.scope,
      ...("continuation" in review && review.continuation ? { continuation: review.continuation } : {}),
      reviewStatus: review.status, reviewRevision: review.revision, definitionSha256: review.definitionSha256,
      importedStatus: { verification: card.verification, implementation: card.implementation, testing: card.testing },
    };
  })).sort((a, b) => a.cardId.localeCompare(b.cardId, 'en'));
  return {
    format: registry.format,
    importedSnapshots,
    engineCapabilities: {
      supportedDefinitions: Object.keys(registry.cards).length,
      normalMonsters: Object.values(registry.cards).filter(c => c.kind === 'normal-monster').length,
      reviewedNormalSpells: Object.keys(registry.spellHandlers),
      reviewedFlipMonsters: Object.keys(registry.flipHandlers),
      reviewedCounterTraps: Object.keys(registry.counterTrapHandlers),
      reviewedNormalTraps: Object.keys(registry.trapHandlers),
      unsupportedIds: registry.unsupportedIds,
      scope: [...new Set(reviewedEffects.map(review => review.scope))].sort(),
      reviewedEffects,
      limitations: [registry.boundedCounterReview?'only 11 pinned Normal Spells -> Magic Jammer -> Seven^0..6 or same-summon Trap Hole^1..3 -> Seven^0..6, subject to copy/zone bounds; no universal eight-link rule':'only reviewed summon Traps, reviewed two-link and three-link Counters, and pinned Normal Spell -> Magic Jammer -> Seven -> Seven, or passes as responses', 'no general mixed Chain/negation', 'no general SEGOC/modifiers/replacements', 'no online multiplayer or persistent matches'],
    },
  };
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(JSON.stringify(createCapabilityReport(), null, 2));
}

export function createLegacyV5CapabilityReport(root=projectRoot){return createCapabilityReport(root,'legacy-v5');}
