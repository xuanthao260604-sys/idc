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
const pilot=load('data/generated/pilot.json'), extra=load('data/generated/classic-10.json'), extraB=load('data/generated/classic-10b.json'), extraC=load('data/generated/classic-10c.json'), extraD=load('data/generated/classic-10d.json'), extraE=load('data/generated/classic-10e.json'), extraF=load('data/generated/classic-10f.json'), final20=load('data/generated/classic-20.json');
describe('Additive 104-card runtime catalog', () => {
  it('preserves all 103 prior parsed definitions, including the five effect review fingerprints', () => {
    const {cards,registry}=loadRuntimeCatalog(); expect(cards).toHaveLength(104);
    for(const old of [...pilot.cards,...extra.cards,...extraB.cards,...extraC.cards,...extraD.cards,...extraE.cards,...extraF.cards,...final20.cards,...load('data/generated/lp-spells.json').cards,...load('data/generated/defense-spell.json').cards]) expect(cards.find(c=>c.id===old.id)).toEqual(old);
    expect(Object.keys(registry.cards)).toHaveLength(104); expect(registry.unsupportedIds).toEqual([]);
    expect(Object.keys(registry.spellHandlers)).toHaveLength(6); expect(Object.keys(registry.flipHandlers)).toHaveLength(2); expect(Object.keys(registry.trapHandlers)).toHaveLength(1);
    for(const card of [...extra.cards,...extraB.cards,...extraC.cards,...extraD.cards,...extraE.cards,...extraF.cards,...final20.cards]) { expect(card.kind).toBe('normal-monster'); expect(card.verification).toBe('verified'); expect(card.implementation).toBe('not-started'); }
  });
  it('loads an existing 102-card catalog deck containing both LP spells without rewriting it', async () => {
    const d=await mkdtemp(join(tmpdir(),'YGO LP deck preserve '));
    try {
      const {createRegistry}=await import('../packages/engine/src/registry.js');
      const {goat200508Format}=await import('../packages/card-data/src/formats/goat-2005-08-17.js');
      const oldCards=combineCatalogBundles([pilot,extra,extraB,extraC,extraD,extraE,extraF,final20,load('data/generated/lp-spells.json')]);
      const old=createRegistry(oldCards,goat200508Format,{},[...load('data/reviews/pilot.spell-effects.json'),...load('data/reviews/life-point-spells.effects.json')],load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json'));
      const store=createDeckStore(old,d);
      const lp=['official:46130346','official:84257639'];
      const saved=[...lp,...store.defaults.filter(id=>!lp.includes(id))].slice(0,40);
      expect((await store.save('a',0,saved)).ok).toBe(true);
      const bytes=await readFile(join(d,'a.json'),'utf8');
      const next=createDeckStore(loadRuntimeCatalog().registry,d);
      expect(next.defaults).toEqual(store.defaults); expect(next.get('a')).toEqual(store.get('a'));
      expect(await readFile(join(d,'a.json'),'utf8')).toBe(bytes);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it('preserves a saved catalog-103 deck containing Smashing Ground, including file bytes', async () => {
    const d=await mkdtemp(join(tmpdir(),'YGO 103 deck preserve '));
    try {
      const {createRegistry}=await import('../packages/engine/src/registry.js');
      const {goat200508Format}=await import('../packages/card-data/src/formats/goat-2005-08-17.js');
      const oldCards=loadRuntimeCatalog().cards.filter(c=>c.id!=='official:26412047');
      expect(oldCards).toHaveLength(103);
      const old=createRegistry(oldCards,goat200508Format,{},[...load('data/reviews/pilot.spell-effects.json'),...load('data/reviews/life-point-spells.effects.json'),...load('data/reviews/defense-spell.effects.json')],load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json'));
      const store=createDeckStore(old,d), ids=['official:97169186','official:46130346','official:84257639'];
      const saved=[...ids,...store.defaults.filter(id=>!ids.includes(id))].slice(0,40);
      expect((await store.save('b',0,saved)).ok).toBe(true);
      const bytes=await readFile(join(d,'b.json'),'utf8'), next=createDeckStore(loadRuntimeCatalog().registry,d);
      expect(next.defaults).toEqual(store.defaults); expect(next.get('b')).toEqual(store.get('b'));
      expect(await readFile(join(d,'b.json'),'utf8')).toBe(bytes);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it('rejects duplicate cards and incompatible bundle formats instead of overwriting prior definitions', () => {
    expect(()=>combineCatalogBundles([pilot,pilot])).toThrow('Duplicate');
    const wrong=structuredClone(extra); wrong.format.revision++;
    expect(()=>combineCatalogBundles([pilot,wrong])).toThrow('format');
    expect(()=>combineCatalogBundles([])).toThrow();
  });
  it.each([20,30,40,50,60,70,80,100])('loads prior valid %i-card saved catalogs without migration or loss', async count => {
    const d=await mkdtemp(join(tmpdir(),'YGO catalog migrate '));
    try {
      const {createRegistry}=await import('../packages/engine/src/registry.js');
      const {goat200508Format}=await import('../packages/card-data/src/formats/goat-2005-08-17.js');
      const old=createRegistry(combineCatalogBundles([pilot,extra,extraB,extraC,extraD,extraE,extraF,final20].slice(0,1+(count-20)/10)),goat200508Format,{},load('data/reviews/pilot.spell-effects.json'),load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json'));
      const store=createDeckStore(old,d);
      const extension=count===100?final20:count===80?extraF:count===70?extraE:count===60?extraD:count===50?extraC:null;
      const saved=extension?[...extension.cards.map((c:{id:string})=>c.id),...store.defaults].slice(0,40):store.defaults;
      expect((await store.save('a',0,saved)).ok).toBe(true);
      const bytes=await readFile(join(d,'a.json'),'utf8');
      const next=createDeckStore(loadRuntimeCatalog().registry,d);
      if(count>=40) expect(next.defaults).toEqual(store.defaults);
      expect(next.get('a')).toEqual(store.get('a')); expect(await readFile(join(d,'a.json'),'utf8')).toBe(bytes);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it('allows a legal 310-card Main Deck under Goat without introducing a modern 60-card cap', async () => {
    const {registry}=loadRuntimeCatalog();
    const cards=Object.values(registry.cards).flatMap(c=>Array<string>(c.legality.maxCopies!).fill(c.id));
    expect(cards).toHaveLength(310);
    const store=createDeckStore(registry); expect((await store.save('a',0,cards)).ok).toBe(true);
    const {createDuel}=await import('../packages/engine/src/duel.js');
    const result=createDuel(registry,{duelId:'goat-large-deck',players:[{id:'a',deck:cards},{id:'b',deck:cards}],firstPlayerId:'a'});
    expect(result.state.players[0].hand.length+result.state.players[0].deck.length).toBe(310);
  });
  it('reimports all expansion batches twice without modifying any bundle or original reviews', async () => {
    const d=await mkdtemp(join(tmpdir(),'YGO expansion import '));
    try {
      await cp(join(projectRoot,'data'),join(d,'data'),{recursive:true});
      const paths=['data/generated/hammer-shot.json','data/reviews/hammer-shot.overlays.json','data/reviews/hammer-shot.effects.json','data/generated/defense-spell.json','data/reviews/defense-spell.overlays.json','data/reviews/defense-spell.effects.json','data/generated/lp-spells.json','data/reviews/lp-spells.overlays.json','data/reviews/life-point-spells.effects.json','data/generated/classic-20.json','data/reviews/classic-20.overlays.json','data/generated/classic-10f.json','data/reviews/classic-10f.overlays.json','data/generated/classic-10e.json','data/reviews/classic-10e.overlays.json','data/generated/classic-10d.json','data/reviews/classic-10d.overlays.json','data/generated/classic-10c.json','data/reviews/classic-10c.overlays.json','data/generated/classic-10b.json','data/reviews/classic-10b.overlays.json','data/generated/pilot.json','data/generated/classic-10.json','data/reviews/pilot.overlays.json','data/reviews/classic-10.overlays.json','data/reviews/pilot.spell-effects.json','data/reviews/pilot.flip-effects.json','data/reviews/pilot.trap-effects.json'];
      const before=await Promise.all(paths.map(p=>readFile(join(d,p),'utf8')));
      for(const batch of ['classic-10','classic-10b','classic-10c','classic-10d','classic-10e','classic-10f','classic-20','lp-spells','defense-spell','hammer-shot']) { await run('import',d,batch); await run('import',d,batch); await run('check',d,batch); }
      expect(await Promise.all(paths.map(p=>readFile(join(d,p),'utf8')))).toEqual(before);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it.each(['classic-10','classic-10b','classic-10c','classic-10d','classic-10e','classic-10f','classic-20','lp-spells','defense-spell','hammer-shot'].flatMap(batch=>['review','raw'].map(mode=>({batch,mode}))))('failed $batch $mode validation preserves all eleven last valid bundles', async ({batch,mode}) => {
    const d=await mkdtemp(join(tmpdir(),'YGO expansion error '));
    try {
      await cp(join(projectRoot,'data'),join(d,'data'),{recursive:true});
      const before=await Promise.all(['pilot','classic-10','classic-10b','classic-10c','classic-10d','classic-10e','classic-10f','classic-20','lp-spells','defense-spell','hammer-shot'].map(n=>readFile(join(d,`data/generated/${n}.json`),'utf8')));
      if(mode==='review') {
        const p=join(d,`data/reviews/${batch}.overlays.json`),data=JSON.parse(await readFile(p,'utf8'));data[batch==='classic-20'?data.length-1:0].baseFingerprint='0'.repeat(64);await writeFile(p,JSON.stringify(data));
      } else {
        const receipt=load(`data/import/${batch}.receipt.json`);await writeFile(join(d,`data/raw/ygoprodeck/${receipt.sha256}.json`),'corrupt fixture');
      }
      await expect(run('import',d,batch)).rejects.toThrow(mode==='review'?'Review conflict':'checksum mismatch');
      expect(await Promise.all(['pilot','classic-10','classic-10b','classic-10c','classic-10d','classic-10e','classic-10f','classic-20','lp-spells','defense-spell','hammer-shot'].map(n=>readFile(join(d,`data/generated/${n}.json`),'utf8')))).toEqual(before);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
});
