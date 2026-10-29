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
import { createRegistry, validateDeck } from '../packages/engine/src/registry.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';

const load = (path: string) => JSON.parse(readFileSync(join(projectRoot, path), 'utf8'));
const imported = load('data/generated/seven-tools.json'), proof = load('data/evidence/konami/4863.json');
const receipt = load('data/import/seven-tools.receipt.json'), overlay = load('data/reviews/seven-tools.overlays.json');
const runtime = loadRuntimeCatalog(), { registry } = runtime, seven = 'official:03819470';
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'YGO Seven Tools nhập dữ liệu '));
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
describe('Seven Tools imported data, separate from runtime behavior', () => {
  it('pins real reference bytes and the eligible print, preserving the leading-zero passcode and Counter subtype', () => {
    const card = imported.cards[0];
    expect(card).toMatchObject({ id: seven, passcode: '03819470', name: 'Seven Tools of the Bandit', kind: 'trap', subtype: 'counter', text: 'When a Trap Card is activated: Pay 1000 LP; negate the activation, and if you do, destroy it.', verification: 'pending', implementation: 'not-started', testing: 'not-run', textBasis: 'current-reference', effects: [], legality: { status: 'legal', maxCopies: 3 } });
    expect(imported.summary).toEqual({ imported: 1, verifiedData: 0, historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
    expect(imported.reviews[0]).toMatchObject({ upstreamText: card.text, referenceText: card.text, historicalTextReview: 'pending', printing: { date: '2002-06-26', setCode: 'MRD-129', product: 'METAL RAIDERS' } });
    expect(proof).toMatchObject({ passcode: '03819470', konamiId: 4863 });
    const raw = readFileSync(join(projectRoot, `data/raw/ygoprodeck/${receipt.sha256}.json`));
    expect(receipt.sha256).toBe('324636d43dfe3ab4b010ff9880c84827a349660785e4728b34da2122e5709e95');
    expect(sha256(raw)).toBe(receipt.sha256); expect(JSON.parse(raw.toString('utf8')).data[0].id).toBe(3819470);
    const html = readFileSync(join(projectRoot, `data/raw/konami/${proof.htmlSha256}.html`));
    expect(proof.htmlSha256).toBe('0fa7aeda482c7792e98dd9bca18bcef5f0ac675a1f7140b83dd530edd17d09da');
    expect(sha256(html)).toBe(proof.htmlSha256); expect(html.toString('utf8')).toContain(card.text);
    expect(overlay[0].patch).toEqual({}); expect(overlay[0].baseFingerprint).toBe('9b1e0f1ab3d3d715441af06d0ec542733a3cdfa22df70dbf12e38a3c58920dfa');
    const pool = readFileSync(join(projectRoot, 'data/raw/goatformat/01e0626f198987b8daf60e00242cd33b7a692419f645adf4e7f826ed47eef98e.html'));
    expect(sha256(pool)).toBe('01e0626f198987b8daf60e00242cd33b7a692419f645adf4e7f826ed47eef98e');
    expect(pool.toString('utf8')).toContain('Metal Raiders (MRD)'); expect(html.toString('utf8')).toContain('Counter Trap');
    expect(html.toString('utf8')).toMatch(/2002-06-26[\s\S]{0,350}MRD-129[\s\S]{0,250}METAL RAIDERS/);
  });
  it('counts 112 imported cards but keeps the 111-card runtime and rejects Seven Tools even with all existing reviews', async () => {
    const bundles = (await readdir(join(projectRoot, 'data/generated'))).filter(name => name.endsWith('.json')).map(name => load(`data/generated/${name}`));
    expect(bundles).toHaveLength(19); expect(bundles.reduce((n, b) => n + b.summary.imported, 0)).toBe(112);
    expect(bundles.reduce((n, b) => n + b.summary.verifiedData, 0)).toBe(95); expect(bundles.reduce((n, b) => n + b.summary.historicalReviewPending, 0)).toBe(17);
    expect(Object.keys(registry.cards)).toHaveLength(111); expect(registry.cards[seven]).toBeUndefined();
    const probe = createRegistry([...runtime.cards, ...imported.cards], goat200508Format, {}, runtime.effectReviews.spells, runtime.effectReviews.flips, runtime.effectReviews.traps, runtime.effectReviews.counters);
    expect(probe.unsupportedIds).toEqual([seven]); expect(probe.cards).toEqual(registry.cards);
    expect(probe.spellHandlers).toEqual(registry.spellHandlers); expect(probe.flipHandlers).toEqual(registry.flipHandlers);
    expect(probe.trapHandlers).toEqual(registry.trapHandlers); expect(probe.counterTrapHandlers).toEqual(registry.counterTrapHandlers);
    expect(probe.counterTrapHandlers[seven]).toBeUndefined(); expect(probe.counterTrapHandlers['official:77414722']).toBe('discard-negate-normal-spell-activation');
    expect(() => validateDeck(probe, [...createDeckStore(registry).defaults, seven])).toThrow('Unsupported');
    expect(createRegistry(imported.cards, goat200508Format).unsupportedIds).toEqual([seven]);
  });
  it('reimports twice offline and checks all nineteen bundles and saved A/B decks without changing bytes', async () => {
    const f = await fixture();
    try {
      const before = await snapshot(f.root);
      await run('import', f.root, 'seven-tools'); await run('import', f.root, 'seven-tools');
      for (const file of await readdir(join(f.root, 'data/generated'))) await run('check', f.root, file.replace(/\.json$/, ''));
      await expectPreserved(f.root, before);
      const reloaded = createDeckStore(registry, f.directory); expect([reloaded.get('a'), reloaded.get('b')]).toEqual(f.decks);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
  it.each(['checksum', 'review', 'official facts', 'cutoff', 'unreviewed print', 'Konami identity', 'historical review'])('failed %s reimport preserves all nineteen bundles, inputs and valid deck files', async mode => {
    const f = await fixture();
    try {
      let message: string;
      if (mode === 'checksum') { await writeFile(join(f.root, `data/raw/ygoprodeck/${receipt.sha256}.json`), 'corrupt test snapshot'); message = 'checksum mismatch'; }
      else if (mode === 'review' || mode === 'historical review') {
        const changed = structuredClone(overlay);
        if (mode === 'review') { changed[0].baseFingerprint = '0'.repeat(64); message = 'Review conflict'; }
        else { changed[0].historicalTextReview = 'not-required-normal-flavor'; message = 'Effect card cannot skip historical review'; }
        await writeFile(join(f.root, 'data/reviews/seven-tools.overlays.json'), JSON.stringify(changed));
      } else {
        const changed = structuredClone(proof);
        if (mode === 'official facts') { changed.currentFacts.text += ' altered'; message = 'Official facts mismatch'; }
        else if (mode === 'unreviewed print') { changed.printing.setCode = 'MRD-000'; message = 'Unreviewed print/set eligibility'; }
        else if (mode === 'Konami identity') { changed.konamiId = 4862; message = 'Konami identity mismatch'; }
        else { changed.printing.date = '2006-01-01'; message = 'Printing after format cutoff'; }
        await writeFile(join(f.root, 'data/evidence/konami/4863.json'), JSON.stringify(changed));
      }
      const before = await snapshot(f.root);
      await expect(run('import', f.root, 'seven-tools')).rejects.toThrow(message);
      await expectPreserved(f.root, before);
      const reloaded = createDeckStore(registry, f.directory); expect([reloaded.get('a'), reloaded.get('b')]).toEqual(f.decks);
    } finally { await rm(f.root, { recursive: true, force: true }); }
  });
});
