import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { CardBatchSchema } from '../packages/card-data/src/schema.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { SpellReviewsSchema } from '../packages/engine/src/spell-review.js';
import { FlipReviewsSchema } from '../packages/engine/src/flip-review.js';
import { CounterReviewsSchema } from '../packages/engine/src/counter-review.js';
import { TrapReviewsSchema } from '../packages/engine/src/trap-review.js';
import { projectRoot } from './project-root.js';
import inputs from './runtime-catalog-inputs.json' with { type: 'json' };
import legacyV5Inputs from './runtime-catalog-legacy-v5-inputs.json' with { type: 'json' };

const Bundle = z.object({ schemaVersion: z.literal(1), format: z.strictObject({ id: z.string(), revision: z.number().int() }), cards: CardBatchSchema });
/** Additive snapshots: never rewrite old definitions or silently choose a duplicate winner. */
export function combineCatalogBundles(inputs: readonly unknown[]) {
  if (!inputs.length) throw new Error('Catalog requires an imported bundle');
  const bundles = inputs.map(input => Bundle.parse(input));
  for (const bundle of bundles) if (bundle.format.id !== goat200508Format.id || bundle.format.revision !== goat200508Format.revision || !bundle.cards.length)
    throw new Error('Catalog bundle format/selection mismatch');
  const cards = CardBatchSchema.parse(bundles.flatMap(b => b.cards));
  if (new Set(cards.map(c=>c.name)).size !== cards.length) throw new Error('Catalog has duplicate canonical names');
  return cards;
}
function loadCatalog(selected: typeof inputs, root: string) {
  const read = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'));
  const bundles = Object.entries(selected.bundles).map(([key, path]) => ({ key, bundle: read(path) }));
  const cards = combineCatalogBundles(bundles.map(({ bundle }) => bundle));
  const effectReviews = {
    spells: SpellReviewsSchema.parse(selected.reviews.spells.flatMap(read)),
    flips: FlipReviewsSchema.parse(selected.reviews.flips.flatMap(read)),
    traps: TrapReviewsSchema.parse(selected.reviews.traps.flatMap(read)),
    counters: CounterReviewsSchema.parse(selected.reviews.counters.flatMap(read)),
  };
  const registry = createRegistry(cards, goat200508Format, {}, effectReviews.spells, effectReviews.flips, effectReviews.traps, effectReviews.counters);
  return { cards, registry, effectReviews, importedSnapshots: Object.fromEntries(bundles.map(({ key, bundle }) => [key, bundle.summary])) };
}

/** Current application profile; never silently fall back to a historical review. */
export function loadRuntimeCatalog(root=projectRoot){return loadCatalog(inputs,root);}
/** Explicit historical profile for v5 regression fixtures and golden journeys. */
export function loadLegacyV5Catalog(root=projectRoot){return loadCatalog(legacyV5Inputs,root);}
