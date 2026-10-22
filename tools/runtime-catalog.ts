import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { CardBatchSchema } from '../packages/card-data/src/schema.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { projectRoot } from './project-root.js';

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
  const pilot = read('data/generated/pilot.json'), classic10 = read('data/generated/classic-10.json');
  const classic10b = read('data/generated/classic-10b.json');
  const classic10c = read('data/generated/classic-10c.json');
  const classic10d = read('data/generated/classic-10d.json');
  const classic10e = read('data/generated/classic-10e.json');
  const classic10f = read('data/generated/classic-10f.json');
  const cards = combineCatalogBundles([pilot, classic10, classic10b, classic10c, classic10d, classic10e, classic10f]);
  const registry = createRegistry(cards, goat200508Format, {}, read('data/reviews/pilot.spell-effects.json'),
    read('data/reviews/pilot.flip-effects.json'), read('data/reviews/pilot.trap-effects.json'));
  return { cards, registry, importedSnapshots: { pilot: pilot.summary, classic10: classic10.summary, classic10b: classic10b.summary, classic10c: classic10c.summary, classic10d: classic10d.summary, classic10e: classic10e.summary, classic10f: classic10f.summary } };
}
