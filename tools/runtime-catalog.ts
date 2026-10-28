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
export function loadRuntimeCatalog(root = projectRoot) {
  const read = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'));
  const bundles = Object.entries(inputs.bundles).map(([key, path]) => ({ key, bundle: read(path) }));
  const cards = combineCatalogBundles(bundles.map(({ bundle }) => bundle));
  const effectReviews = {
    spells: SpellReviewsSchema.parse(inputs.reviews.spells.flatMap(read)),
    flips: FlipReviewsSchema.parse(inputs.reviews.flips.flatMap(read)),
    traps: TrapReviewsSchema.parse(inputs.reviews.traps.flatMap(read)),
    counters: CounterReviewsSchema.parse(inputs.reviews.counters.flatMap(read)),
  };
  const registry = createRegistry(cards, goat200508Format, {}, effectReviews.spells, effectReviews.flips, effectReviews.traps, effectReviews.counters);
  return { cards, registry, effectReviews, importedSnapshots: Object.fromEntries(bundles.map(({ key, bundle }) => [key, bundle.summary])) };
}
