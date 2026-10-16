import { readFileSync } from 'node:fs';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { combineCatalogBundles, loadRuntimeCatalog } from './runtime-catalog.js';
import { projectRoot } from './project-root.js';
import { run } from './card-import/src/cli.js';
import { createDeckStore } from './deck-store.js';
const load = (p: string) => JSON.parse(readFileSync(join(projectRoot,p),'utf8'));
const pilot=load('data/generated/pilot.json'), extra=load('data/generated/classic-10.json');
describe('Additive 30-card runtime catalog', () => {
  it('preserves all twenty parsed definitions, including the five effect review fingerprints', () => {
    const {cards,registry}=loadRuntimeCatalog(); expect(cards).toHaveLength(30);
    for(const old of pilot.cards) expect(cards.find(c=>c.id===old.id)).toEqual(old);
    expect(Object.keys(registry.cards)).toHaveLength(30); expect(registry.unsupportedIds).toEqual([]);
    expect(Object.keys(registry.spellHandlers)).toHaveLength(2); expect(Object.keys(registry.flipHandlers)).toHaveLength(2); expect(Object.keys(registry.trapHandlers)).toHaveLength(1);
    for(const card of extra.cards) { expect(card.kind).toBe('normal-monster'); expect(card.verification).toBe('verified'); expect(card.implementation).toBe('not-started'); }
  });
  it('rejects duplicate cards and incompatible bundle formats instead of overwriting prior definitions', () => {
    expect(()=>combineCatalogBundles([pilot,pilot])).toThrow('Duplicate');
    const wrong=structuredClone(extra); wrong.format.revision++;
    expect(()=>combineCatalogBundles([pilot,wrong])).toThrow('format');
    expect(()=>combineCatalogBundles([])).toThrow();
  });
  it('loads prior valid 20-card saved decks with the expanded registry without migration or loss', async () => {
    const d=await mkdtemp(join(tmpdir(),'YGO catalog migrate '));
    try {
      const {createRegistry}=await import('../packages/engine/src/registry.js');
      const {goat200508Format}=await import('../packages/card-data/src/formats/goat-2005-08-17.js');
      const old=createRegistry(pilot.cards,goat200508Format,{},load('data/reviews/pilot.spell-effects.json'),load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json'));
      const store=createDeckStore(old,d); await store.save('a',0,store.defaults);
      const bytes=await readFile(join(d,'a.json'),'utf8');
      const next=createDeckStore(loadRuntimeCatalog().registry,d);
      expect(next.get('a')).toEqual(store.get('a')); expect(await readFile(join(d,'a.json'),'utf8')).toBe(bytes);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it('allows a legal 88-card Main Deck under Goat without introducing a modern 60-card cap', async () => {
    const {registry}=loadRuntimeCatalog();
    const cards=Object.values(registry.cards).flatMap(c=>Array<string>(c.legality.maxCopies!).fill(c.id));
    expect(cards).toHaveLength(88);
    const store=createDeckStore(registry); expect((await store.save('a',0,cards)).ok).toBe(true);
    const {createDuel}=await import('../packages/engine/src/duel.js');
    const result=createDuel(registry,{duelId:'goat-large-deck',players:[{id:'a',deck:cards},{id:'b',deck:cards}],firstPlayerId:'a'});
    expect(result.state.players[0].hand.length+result.state.players[0].deck.length).toBe(88);
  });
  it('reimports the ten-card batch twice without modifying either bundle or original reviews', async () => {
    const d=await mkdtemp(join(tmpdir(),'YGO expansion import '));
    try {
      await cp(join(projectRoot,'data'),join(d,'data'),{recursive:true});
      const paths=['data/generated/pilot.json','data/generated/classic-10.json','data/reviews/pilot.overlays.json','data/reviews/classic-10.overlays.json','data/reviews/pilot.spell-effects.json','data/reviews/pilot.flip-effects.json','data/reviews/pilot.trap-effects.json'];
      const before=await Promise.all(paths.map(p=>readFile(join(d,p),'utf8')));
      await run('import',d,'classic-10'); await run('import',d,'classic-10'); await run('check',d,'classic-10');
      expect(await Promise.all(paths.map(p=>readFile(join(d,p),'utf8')))).toEqual(before);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it.each(['review','raw'])('failed expansion %s validation preserves both last valid bundles', async mode => {
    const d=await mkdtemp(join(tmpdir(),'YGO expansion error '));
    try {
      await cp(join(projectRoot,'data'),join(d,'data'),{recursive:true});
      const before=await Promise.all(['pilot','classic-10'].map(n=>readFile(join(d,`data/generated/${n}.json`),'utf8')));
      if(mode==='review') {
        const p=join(d,'data/reviews/classic-10.overlays.json'),data=JSON.parse(await readFile(p,'utf8'));data[0].baseFingerprint='0'.repeat(64);await writeFile(p,JSON.stringify(data));
      } else {
        const receipt=load('data/import/classic-10.receipt.json');await writeFile(join(d,`data/raw/ygoprodeck/${receipt.sha256}.json`),'corrupt fixture');
      }
      await expect(run('import',d,'classic-10')).rejects.toThrow(mode==='review'?'Review conflict':'checksum mismatch');
      expect(await Promise.all(['pilot','classic-10'].map(n=>readFile(join(d,`data/generated/${n}.json`),'utf8')))).toEqual(before);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
});
