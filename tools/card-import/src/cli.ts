import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { ManifestSchema, ReceiptSchema } from './contracts.js';
import { assertRevisionProgress, canonical, importBatch, sha256, validateUpstreamSnapshot } from './pipeline.js';
import { atomicWrite, readIfExists, saveImmutableSnapshot } from './files.js';

const json = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'));
export async function run(command: string, root = process.cwd(), batchInput = 'pilot') {
  const batch = z.enum(['pilot', 'classic-10', 'classic-10b', 'classic-10c', 'classic-10d', 'classic-10e']).parse(batchInput);
  const manifest = ManifestSchema.parse(await json(resolve(root, `data/import/${batch}.manifest.json`)));
  const receiptPath = resolve(root, `data/import/${batch}.receipt.json`);
  if (command === 'fetch') {
    const url = new URL('https://db.ygoprodeck.com/api/v7/cardinfo.php');
    url.searchParams.set('id', manifest.cards.map(c => String(Number(c.passcode))).join(','));
    url.searchParams.set('misc', 'yes');
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error',
      headers: { 'User-Agent': 'YGOClassicDuel-card-import/0.1', Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Source HTTP ${response.status}; saved receipt/output untouched`);
    const raw = await response.text();
    validateUpstreamSnapshot(raw, manifest);
    const hash = sha256(raw);
    await saveImmutableSnapshot(resolve(root, `data/raw/ygoprodeck/${hash}.json`), raw);
    const receipt = ReceiptSchema.parse({ schemaVersion: 1, url: url.href, fetchedAt: new Date().toISOString(), sha256: hash });
    await atomicWrite(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
    console.log(`Cached ${manifest.cards.length} requested cards; SHA-256 ${hash}. Reviews/generated bundle were not changed.`);
    return;
  }
  if (command !== 'import' && command !== 'check') throw new Error('Usage: card-import [fetch|import|check] [pilot|classic-10|classic-10b|classic-10c|classic-10d|classic-10e]');
  const receipt = ReceiptSchema.parse(await json(receiptPath));
  const raw = await readFile(resolve(root, `data/raw/ygoprodeck/${receipt.sha256}.json`), 'utf8');
  const overlays = await json(resolve(root, `data/reviews/${batch}.overlays.json`));
  const official = await Promise.all(manifest.cards.map(c => json(resolve(root, `data/evidence/konami/${c.konamiId}.json`))));
  const bundle = importBatch({ raw, receipt, manifest, overlays, official });
  const contents = JSON.stringify(bundle, null, 2) + '\n';
  const outputPath = resolve(root, `data/generated/${batch}.json`);
  const previous = await readIfExists(outputPath);
  if (command === 'check') {
    if (previous === undefined || canonical(JSON.parse(previous)) !== canonical(bundle))
      throw new Error('Generated bundle missing/stale/edited; run cards:import after reviewing inputs');
  } else {
    if (previous !== undefined) {
      const old = z.object({ cards: z.unknown() }).parse(JSON.parse(previous));
      assertRevisionProgress(old.cards, bundle.cards);
    }
    if (contents !== previous) await atomicWrite(outputPath, contents);
  }
  console.log(JSON.stringify({ command, ...bundle.summary }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run(process.argv[2] ?? '', process.cwd(), process.argv[3] ?? 'pilot').catch(error => {
    console.error(error instanceof Error ? error.message : 'Card import failed');
    process.exitCode = 1;
  });
}
