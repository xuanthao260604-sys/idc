import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDeckStore, deckIssues, defaultDeck } from './deck-store.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import { rename } from 'node:fs/promises';
vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>(); return { ...actual, rename: vi.fn(actual.rename) };
});
const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const registry = createRegistry(load('../data/generated/pilot.json').cards, goat200508Format, {}, load('../data/reviews/pilot.spell-effects.json'), load('../data/reviews/pilot.flip-effects.json'), load('../data/reviews/pilot.trap-effects.json'));
const directories: string[] = [];
const directory = async () => { const d = await mkdtemp(join(tmpdir(), 'YGO bộ bài ')); directories.push(d); return d; };
afterEach(async () => { vi.mocked(rename).mockClear(); for (const d of directories.splice(0)) await rm(d, { recursive: true, force: true }); });
const normalIds = Object.values(registry.cards).filter(c=>c.kind==='normal-monster').map(c=>c.id);
const normalDeck = [...normalIds, ...normalIds, ...normalIds].slice(0,40);
describe('Saved deck validation and atomic persistence', () => {
  it('uses valid defaults and reports size, unknown cards and copy limits without imposing modern 60', () => {
    const initial = defaultDeck(registry); expect(initial).toHaveLength(40); expect(deckIssues(registry, initial)).toEqual([]);
    expect(deckIssues(registry, initial.slice(0,39)).join(' ')).toContain('40');
    expect(deckIssues(registry, [...normalDeck,'official:55144522','official:55144522']).join(' ')).toContain('Pot of Greed: tối đa 1');
    expect(deckIssues(registry, [...initial, '__proto__']).join(' ')).toContain('chưa được hỗ trợ');
    expect(deckIssues(registry, [...initial, 'official:97590747','official:97590747','official:97590747','official:97590747']).join(' ')).toContain('tối đa 3');
    expect(registry.rules.deck.mainMax).toBeNull();
  });
  it('persists independent A/B decks and reloads them from a Unicode path', async () => {
    const d = await directory(), store = createDeckStore(registry, d);
    expect((await store.save('a',0,normalDeck)).ok).toBe(true);
    expect(store.get('b').revision).toBe(0);
    expect((await store.save('b',0,[...normalDeck,'official:55144522'])).ok).toBe(true);
    const reloaded = createDeckStore(registry,d);
    expect(reloaded.get('a')).toEqual(store.get('a')); expect(reloaded.get('b')).toEqual(store.get('b'));
    expect(Object.isFrozen(reloaded.get('a').cards)).toBe(true);
  });
  it('invalid edits leave saved bytes and in-memory decks unchanged', async () => {
    const d=await directory(), store=createDeckStore(registry,d); await store.save('a',0,normalDeck);
    const before=await readFile(join(d,'a.json'),'utf8'), saved=store.get('a');
    const invalid=await store.save('a',1,normalDeck.slice(0,39)); expect(invalid.ok).toBe(false);
    expect(store.get('a')).toBe(saved); expect(await readFile(join(d,'a.json'),'utf8')).toBe(before);
  });
  it('serializes concurrent saves and refuses stale revisions without overwriting the winner', async () => {
    const store=createDeckStore(registry,await directory());
    const results=await Promise.all([store.save('a',0,normalDeck),store.save('a',0,[...normalDeck,'official:55144522'])]);
    expect(results.map(r=>r.ok)).toEqual([true,false]); expect(results[1]).toMatchObject({status:409});
    expect(store.get('a').cards).toEqual(normalDeck);
  });
  it('failed atomic rename preserves the previous deck, removes the temp and permits a later save', async () => {
    const d=await directory(), store=createDeckStore(registry,d); await store.save('a',0,normalDeck);
    const before=await readFile(join(d,'a.json'),'utf8'), saved=store.get('a');
    vi.mocked(rename).mockRejectedValueOnce(new Error('Injected disk failure'));
    await expect(store.save('a',1,[...normalDeck,'official:55144522'])).rejects.toThrow('Injected disk failure');
    expect(store.get('a')).toBe(saved); expect(await readFile(join(d,'a.json'),'utf8')).toBe(before);
    expect((await readdir(d)).some(p=>p.includes('.tmp-'))).toBe(false);
    expect((await store.save('a',1,[...normalDeck,'official:55144522'])).ok).toBe(true);
  });
  it.each(['bad JSON', 'wrong format', 'invalid cards'])('does not replace an existing file with %s', async kind => {
    const d=await directory(), store=createDeckStore(registry,d); await store.save('a',0,normalDeck);
    const path=join(d,'a.json'); const parsed=JSON.parse(await readFile(path,'utf8'));
    if(kind==='wrong format') parsed.format.revision++;
    if(kind==='invalid cards') parsed.cards=[];
    const text=kind==='bad JSON'?'{broken':JSON.stringify(parsed); await writeFile(path,text);
    expect(()=>createDeckStore(registry,d)).toThrow('giữ nguyên file'); expect(await readFile(path,'utf8')).toBe(text);
  });
});
