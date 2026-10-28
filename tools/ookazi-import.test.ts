import { readFileSync, statSync } from 'node:fs';
import { cp, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { run } from './card-import/src/cli.js';
import { sha256 } from './card-import/src/pipeline.js';
import { projectRoot } from './project-root.js';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDeckStore } from './deck-store.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';

const load = (path: string) => JSON.parse(readFileSync(join(projectRoot, path), 'utf8'));
const imported = load('data/generated/ookazi.json'), proof = load('data/evidence/konami/4352.json');
const receipt = load('data/import/ookazi.receipt.json'), overlay = load('data/reviews/ookazi.overlays.json');
const { registry } = loadRuntimeCatalog();
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'YGO Ookazi nhập dữ liệu '));
  await cp(join(projectRoot, 'data'), join(root, 'data'), { recursive: true });
  const directory = join(root, '.ygo-local', 'decks'), store = createDeckStore(registry, directory);
  const extra = Object.values(registry.cards).find(c => store.defaults.filter(id => id === c.id).length < c.legality.maxCopies!)!;
  expect((await store.save('a', 0, store.defaults)).ok).toBe(true);
  expect((await store.save('b', 0, [...store.defaults, extra.id])).ok).toBe(true);
  return { root, directory, decks: [store.get('a'), store.get('b')] };
}
async function snapshot(root: string) {
  const names = (await readdir(root, { recursive: true })).filter(path => statSync(join(root, path)).isFile()).sort();
  return new Map(await Promise.all(names.map(async path => [path, await readFile(join(root, path))] as const)));
}
async function expectPreserved(root: string, before: Map<string, Buffer>) {
  const after = await snapshot(root); expect([...after.keys()]).toEqual([...before.keys()]);
  for (const [path, bytes] of before) expect(after.get(path)!.equals(bytes), path).toBe(true);
}
describe('Ookazi imported data, separate from runtime behavior', () => {
  it('pins real source bytes and the original eligible print while keeping both text versions', () => {
    const card = imported.cards[0];
    expect(card).toMatchObject({ id: 'official:19523799', name: 'Ookazi', kind: 'spell', subtype: 'normal', text: "Inflict 800 points of damage to your opponent's Life Points.", verification: 'pending', implementation: 'not-started', testing: 'not-run', textBasis: 'current-reference', effects: [], legality: { status: 'legal', maxCopies: 3 } });
    expect(imported.summary).toEqual({ imported: 1, verifiedData: 0, historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
    expect(imported.reviews[0]).toMatchObject({ upstreamText: 'Inflict 800 damage to your opponent.', referenceText: card.text, historicalTextReview: 'pending', printing: { date: '2002-03-29', setCode: 'SDK-023', product: 'STARTER DECK KAIBA' } });
    expect(proof).toMatchObject({ passcode: '19523799', konamiId: 4352 });
    expect(sha256(readFileSync(join(projectRoot, `data/raw/ygoprodeck/${receipt.sha256}.json`)))).toBe(receipt.sha256);
    const html = readFileSync(join(projectRoot, `data/raw/konami/${proof.htmlSha256}.html`));
    expect(sha256(html)).toBe(proof.htmlSha256); expect(html.toString('utf8')).toContain(card.text);
    expect(overlay[0].patch.text).toBe(card.text);
  });
  it('counts 111 imported cards while runtime support still requires a separate validated review', async () => {
    const files = await readdir(join(projectRoot, 'data/generated'));
    const bundles = files.filter(name => name.endsWith('.json')).map(name => load(`data/generated/${name}`));
    expect(bundles).toHaveLength(18);
    expect(bundles.reduce((n, b) => n + b.summary.imported, 0)).toBe(111);
    expect(bundles.reduce((n, b) => n + b.summary.verifiedData, 0)).toBe(95);
    expect(bundles.reduce((n, b) => n + b.summary.historicalReviewPending, 0)).toBe(16);
    expect(Object.keys(registry.cards)).toHaveLength(111); expect(registry.cards['official:19523799']).toEqual(imported.cards[0]);
    expect(Object.keys(registry.spellHandlers).length + Object.keys(registry.flipHandlers).length + Object.keys(registry.trapHandlers).length + Object.keys(registry.counterTrapHandlers).length).toBe(16);
    expect(createRegistry(imported.cards, goat200508Format).unsupportedIds).toEqual(['official:19523799']);
  });
  it('reimports twice offline and checks all eighteen bundles and saved A/B decks without changing bytes', async () => {
    const f = await fixture();
    try {
      const before = await snapshot(f.root);
      await run('import', f.root, 'ookazi'); await run('import', f.root, 'ookazi');
      for (const file of await readdir(join(f.root, 'data/generated'))) await run('check', f.root, file.replace(/\.json$/, ''));
      await expectPreserved(f.root, before);
      const reloaded = createDeckStore(registry, f.directory); expect([reloaded.get('a'), reloaded.get('b')]).toEqual(f.decks);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it.each(['checksum', 'review', 'official facts', 'cutoff'])('failed %s reimport preserves all eighteen bundles, inputs and valid deck files', async mode => {
    const f = await fixture();
    try {
      let message: string;
      if (mode === 'checksum') { await writeFile(join(f.root, `data/raw/ygoprodeck/${receipt.sha256}.json`), 'corrupt test snapshot'); message = 'checksum mismatch'; }
      else if (mode === 'review') { const changed = structuredClone(overlay); changed[0].baseFingerprint = '0'.repeat(64); await writeFile(join(f.root, 'data/reviews/ookazi.overlays.json'), JSON.stringify(changed)); message = 'Review conflict'; }
      else {
        const changed = structuredClone(proof);
        if (mode === 'official facts') { changed.currentFacts.text += ' altered'; message = 'Official facts mismatch'; }
        else { changed.printing.date = '2006-01-01'; message = 'Printing after format cutoff'; }
        await writeFile(join(f.root, 'data/evidence/konami/4352.json'), JSON.stringify(changed));
      }
      const before = await snapshot(f.root);
      await expect(run('import', f.root, 'ookazi')).rejects.toThrow(message);
      await expectPreserved(f.root, before);
      const reloaded = createDeckStore(registry, f.directory); expect([reloaded.get('a'), reloaded.get('b')]).toEqual(f.decks);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});
