import { readFileSync } from 'node:fs';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { combineCatalogBundles, loadRuntimeCatalog } from './runtime-catalog.js';
import { projectRoot } from './project-root.js';
import { run } from './card-import/src/cli.js';
import { createDeckStore } from './deck-store.js';
import { createCapabilityReport } from './engine-capabilities.js';
import { definitionFingerprint } from '../packages/engine/src/spell-review.js';
const load = (p: string) => JSON.parse(readFileSync(join(projectRoot,p),'utf8'));
const pilot=load('data/generated/pilot.json'), extra=load('data/generated/classic-10.json'), extraB=load('data/generated/classic-10b.json'), extraC=load('data/generated/classic-10c.json'), extraD=load('data/generated/classic-10d.json'), extraE=load('data/generated/classic-10e.json'), extraF=load('data/generated/classic-10f.json'), final20=load('data/generated/classic-20.json');
describe('Additive 112-card runtime catalog', () => {
  it('preserves all 111 prior parsed definitions, including all prior reviewed effects', () => {
    const {cards,registry}=loadRuntimeCatalog(); expect(cards).toHaveLength(112);
    for(const old of [...pilot.cards,...extra.cards,...extraB.cards,...extraC.cards,...extraD.cards,...extraE.cards,...extraF.cards,...final20.cards,...load('data/generated/lp-spells.json').cards,...load('data/generated/defense-spell.json').cards,...load('data/generated/hammer-shot.json').cards,...load('data/generated/tribute-doomed.json').cards,...load('data/generated/reincarnation.json').cards,...load('data/generated/block-attack.json').cards,...load('data/generated/earthquake.json').cards,...load('data/generated/magician-faith.json').cards,...load('data/generated/ookazi.json').cards,...load('data/generated/magic-jammer.json').cards]) expect(cards.find(c=>c.id===old.id)).toEqual(old);
    expect(Object.keys(registry.cards)).toHaveLength(112); expect(registry.unsupportedIds).toEqual([]);
    expect(Object.keys(registry.spellHandlers)).toHaveLength(11); expect(Object.keys(registry.flipHandlers)).toHaveLength(3); expect(Object.keys(registry.trapHandlers)).toHaveLength(1);
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
      const oldCards=loadRuntimeCatalog().cards.filter(c=>c.id!=='official:03819470').filter(c=>c.id!=='official:77414722').filter(c=>c.id!=='official:19523799').filter(c=>c.id!=='official:31560081').filter(c=>c.id!=='official:82828051').filter(c=>c.id!=='official:25880422').filter(c=>!['official:26412047','official:79759861','official:74848038'].includes(c.id));
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
  it('loads the previous 104-card catalog deck containing Hammer Shot without rewriting saved bytes', async () => {
    const d=await mkdtemp(join(tmpdir(),'YGO 104 deck preserve '));
    try {
      const {createRegistry}=await import('../packages/engine/src/registry.js');
      const {goat200508Format}=await import('../packages/card-data/src/formats/goat-2005-08-17.js');
      const cards=loadRuntimeCatalog().cards.filter(c=>c.id!=='official:03819470').filter(c=>c.id!=='official:77414722').filter(c=>c.id!=='official:19523799').filter(c=>c.id!=='official:31560081').filter(c=>c.id!=='official:82828051').filter(c=>c.id!=='official:25880422').filter(c=>!['official:79759861','official:74848038'].includes(c.id)); expect(cards).toHaveLength(104);
      const old=createRegistry(cards,goat200508Format,{},[...load('data/reviews/pilot.spell-effects.json'),...load('data/reviews/life-point-spells.effects.json'),...load('data/reviews/defense-spell.effects.json'),...load('data/reviews/hammer-shot.effects.json')],load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json'));
      const store=createDeckStore(old,d), ids=['official:26412047','official:97169186'];
      const saved=[...ids,...store.defaults.filter(id=>!ids.includes(id))].slice(0,40);
      expect((await store.save('a',0,saved)).ok).toBe(true);
      const bytes=await readFile(join(d,'a.json'),'utf8'), next=createDeckStore(loadRuntimeCatalog().registry,d);
      expect(next.defaults).toEqual(store.defaults); expect(next.get('a')).toEqual(store.get('a'));
      expect(await readFile(join(d,'a.json'),'utf8')).toBe(bytes);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it('preserves a saved catalog-105 deck containing Tribute without rewriting its bytes', async () => {
    const d=await mkdtemp(join(tmpdir(),'YGO 105 deck preserve '));
    try {
      const {createRegistry}=await import('../packages/engine/src/registry.js');
      const {goat200508Format}=await import('../packages/card-data/src/formats/goat-2005-08-17.js');
      const cards=loadRuntimeCatalog().cards.filter(c=>c.id!=='official:03819470').filter(c=>c.id!=='official:77414722').filter(c=>c.id!=='official:19523799').filter(c=>c.id!=='official:31560081').filter(c=>c.id!=='official:82828051').filter(c=>c.id!=='official:25880422').filter(c=>c.id!=='official:74848038'); expect(cards).toHaveLength(105);
      const old=createRegistry(cards,goat200508Format,{},[...load('data/reviews/pilot.spell-effects.json'),...load('data/reviews/life-point-spells.effects.json'),...load('data/reviews/defense-spell.effects.json'),...load('data/reviews/hammer-shot.effects.json'),...load('data/reviews/tribute-doomed.effects.json')],load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json'));
      const store=createDeckStore(old,d), ids=['official:79759861','official:26412047'];
      const saved=[...ids,...store.defaults.filter(id=>!ids.includes(id))].slice(0,40);
      expect((await store.save('a',0,saved)).ok).toBe(true);
      const bytes=await readFile(join(d,'a.json'),'utf8'), next=createDeckStore(loadRuntimeCatalog().registry,d);
      expect(next.defaults).toEqual(store.defaults); expect(next.get('a')).toEqual(store.get('a'));
      expect(await readFile(join(d,'a.json'),'utf8')).toBe(bytes);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it('preserves the previous 106-card catalog deck including Reincarnation byte-for-byte',async()=>{
    const d=await mkdtemp(join(tmpdir(),'YGO 106 preserve '));
    try {
      const {createRegistry}=await import('../packages/engine/src/registry.js');
      const {goat200508Format}=await import('../packages/card-data/src/formats/goat-2005-08-17.js');
      const cards=loadRuntimeCatalog().cards.filter(c=>c.id!=='official:03819470').filter(c=>c.id!=='official:77414722').filter(c=>c.id!=='official:19523799').filter(c=>c.id!=='official:31560081').filter(c=>c.id!=='official:82828051').filter(c=>c.id!=='official:25880422');expect(cards).toHaveLength(106);
      const old=createRegistry(cards,goat200508Format,{},['pilot.spell-effects','life-point-spells.effects','defense-spell.effects','hammer-shot.effects','tribute-doomed.effects','reincarnation.effects'].flatMap(n=>load(`data/reviews/${n}.json`)),load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json'));
      const store=createDeckStore(old,d),saved=['official:74848038',...store.defaults].slice(0,40);expect((await store.save('a',0,saved)).ok).toBe(true);
      const bytes=await readFile(join(d,'a.json'),'utf8'),next=createDeckStore(loadRuntimeCatalog().registry,d);
      expect(next.get('a')).toEqual(store.get('a'));expect(next.defaults).toEqual(store.defaults);expect(await readFile(join(d,'a.json'),'utf8')).toBe(bytes);
    } finally {await rm(d,{recursive:true,force:true});}
  });
  it('preserves catalog-107 deck files containing Block Attack',async()=>{
    const d=await mkdtemp(join(tmpdir(),'YGO 107 preserve '));
    try {
      const {createRegistry}=await import('../packages/engine/src/registry.js');const {goat200508Format}=await import('../packages/card-data/src/formats/goat-2005-08-17.js');
      const cards=loadRuntimeCatalog().cards.filter(c=>c.id!=='official:03819470').filter(c=>c.id!=='official:77414722').filter(c=>c.id!=='official:19523799').filter(c=>c.id!=='official:31560081').filter(c=>c.id!=='official:82828051');expect(cards).toHaveLength(107);
      const old=createRegistry(cards,goat200508Format,{},['pilot.spell-effects','life-point-spells.effects','defense-spell.effects','hammer-shot.effects','tribute-doomed.effects','reincarnation.effects','block-attack.effects'].flatMap(n=>load(`data/reviews/${n}.json`)),load('data/reviews/pilot.flip-effects.json'),load('data/reviews/pilot.trap-effects.json'));
      const store=createDeckStore(old,d),saved=['official:25880422','official:74848038',...store.defaults].slice(0,40);expect((await store.save('b',0,saved)).ok).toBe(true);
      const bytes=await readFile(join(d,'b.json'),'utf8'),next=createDeckStore(loadRuntimeCatalog().registry,d);expect(next.get('b')).toEqual(store.get('b'));expect(next.defaults).toEqual(store.defaults);expect(await readFile(join(d,'b.json'),'utf8')).toBe(bytes);
    } finally {await rm(d,{recursive:true,force:true});}
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
  it('allows a legal 334-card Main Deck under Goat without introducing a modern 60-card cap', async () => {
    const {registry}=loadRuntimeCatalog();
    const cards=Object.values(registry.cards).flatMap(c=>Array<string>(c.legality.maxCopies!).fill(c.id));
    expect(cards).toHaveLength(334);
    const store=createDeckStore(registry); expect((await store.save('a',0,cards)).ok).toBe(true);
    const {createDuel}=await import('../packages/engine/src/duel.js');
    const result=createDuel(registry,{duelId:'goat-large-deck',players:[{id:'a',deck:cards},{id:'b',deck:cards}],firstPlayerId:'a'});
    expect(result.state.players[0].hand.length+result.state.players[0].deck.length).toBe(334);
  });
  it('reimports all expansion batches twice without modifying any bundle or original reviews', async () => {
    const d=await mkdtemp(join(tmpdir(),'YGO expansion import '));
    try {
      await cp(join(projectRoot,'data'),join(d,'data'),{recursive:true});
      const paths=['data/generated/magician-faith.json','data/reviews/magician-faith.overlays.json','data/reviews/magician-faith.effects.json','data/generated/earthquake.json','data/reviews/earthquake.overlays.json','data/reviews/earthquake.effects.json','data/generated/block-attack.json','data/reviews/block-attack.overlays.json','data/reviews/block-attack.effects.json','data/generated/reincarnation.json','data/reviews/reincarnation.overlays.json','data/reviews/reincarnation.effects.json','data/generated/tribute-doomed.json','data/reviews/tribute-doomed.overlays.json','data/reviews/tribute-doomed.effects.json','data/generated/hammer-shot.json','data/reviews/hammer-shot.overlays.json','data/reviews/hammer-shot.effects.json','data/generated/defense-spell.json','data/reviews/defense-spell.overlays.json','data/reviews/defense-spell.effects.json','data/generated/lp-spells.json','data/reviews/lp-spells.overlays.json','data/reviews/life-point-spells.effects.json','data/generated/classic-20.json','data/reviews/classic-20.overlays.json','data/generated/classic-10f.json','data/reviews/classic-10f.overlays.json','data/generated/classic-10e.json','data/reviews/classic-10e.overlays.json','data/generated/classic-10d.json','data/reviews/classic-10d.overlays.json','data/generated/classic-10c.json','data/reviews/classic-10c.overlays.json','data/generated/classic-10b.json','data/reviews/classic-10b.overlays.json','data/generated/pilot.json','data/generated/classic-10.json','data/reviews/pilot.overlays.json','data/reviews/classic-10.overlays.json','data/reviews/pilot.spell-effects.json','data/reviews/pilot.flip-effects.json','data/reviews/pilot.trap-effects.json'];
      const before=await Promise.all(paths.map(p=>readFile(join(d,p),'utf8')));
      for(const batch of ['classic-10','classic-10b','classic-10c','classic-10d','classic-10e','classic-10f','classic-20','lp-spells','defense-spell','hammer-shot','tribute-doomed','reincarnation','block-attack','earthquake','magician-faith']) { await run('import',d,batch); await run('import',d,batch); await run('check',d,batch); }
      expect(await Promise.all(paths.map(p=>readFile(join(d,p),'utf8')))).toEqual(before);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
  it.each(['classic-10','classic-10b','classic-10c','classic-10d','classic-10e','classic-10f','classic-20','lp-spells','defense-spell','hammer-shot','tribute-doomed','reincarnation','block-attack','earthquake','magician-faith'].flatMap(batch=>['review','raw'].map(mode=>({batch,mode}))))('failed $batch $mode validation preserves all sixteen last valid bundles', async ({batch,mode}) => {
    const d=await mkdtemp(join(tmpdir(),'YGO expansion error '));
    try {
      await cp(join(projectRoot,'data'),join(d,'data'),{recursive:true});
      const before=await Promise.all(['pilot','classic-10','classic-10b','classic-10c','classic-10d','classic-10e','classic-10f','classic-20','lp-spells','defense-spell','hammer-shot','tribute-doomed','reincarnation','block-attack','earthquake','magician-faith'].map(n=>readFile(join(d,`data/generated/${n}.json`),'utf8')));
      if(mode==='review') {
        const p=join(d,`data/reviews/${batch}.overlays.json`),data=JSON.parse(await readFile(p,'utf8'));data[batch==='classic-20'?data.length-1:0].baseFingerprint='0'.repeat(64);await writeFile(p,JSON.stringify(data));
      } else {
        const receipt=load(`data/import/${batch}.receipt.json`);await writeFile(join(d,`data/raw/ygoprodeck/${receipt.sha256}.json`),'corrupt fixture');
      }
      await expect(run('import',d,batch)).rejects.toThrow(mode==='review'?'Review conflict':'checksum mismatch');
      expect(await Promise.all(['pilot','classic-10','classic-10b','classic-10c','classic-10d','classic-10e','classic-10f','classic-20','lp-spells','defense-spell','hammer-shot','tribute-doomed','reincarnation','block-attack','earthquake','magician-faith'].map(n=>readFile(join(d,`data/generated/${n}.json`),'utf8')))).toEqual(before);
    } finally { await rm(d,{recursive:true,force:true}); }
  });
});

describe('Capability report follows validated runtime reviews', () => {
  it('reports all thirteen active scopes and maps each effect to its validated review', () => {
    const report = createCapabilityReport(), { registry, effectReviews } = loadRuntimeCatalog();
    const capabilities = report.engineCapabilities;
    expect(capabilities.supportedDefinitions).toBe(112); expect(capabilities.normalMonsters).toBe(95);
    expect(capabilities.reviewedNormalSpells).toHaveLength(11); expect(capabilities.reviewedFlipMonsters).toHaveLength(3); expect(capabilities.reviewedNormalTraps).toHaveLength(1);
    expect(capabilities.scope).toEqual([
      'normal-spell-single-link-vanilla-v1', 'normal-spell-life-points-single-link-v1', 'normal-spell-highest-defense-single-link-v1',
      'normal-spell-highest-attack-position-single-link-v1', 'normal-spell-discard-target-single-link-v1', 'normal-spell-discard-graveyard-single-link-v1',
      'normal-spell-target-position-single-link-v1', 'normal-spell-all-position-single-link-v1',
      'flip-single-link-v1', 'flip-own-graveyard-spell-single-link-v1', 'summon-response-trap-v1', 'counter-trap-normal-spell-activation-v1', 'counter-trap-trap-hole-or-magic-jammer-v2',
    ].sort());
    expect(capabilities.reviewedEffects).toHaveLength(17);
    expect(capabilities.reviewedEffects.map(e => e.cardId)).toEqual([
      ...Object.keys(registry.spellHandlers), ...Object.keys(registry.flipHandlers), ...Object.keys(registry.trapHandlers), ...Object.keys(registry.counterTrapHandlers),
    ].sort((a, b) => a.localeCompare(b, 'en')));
    for (const entry of capabilities.reviewedEffects) {
      const reviews = entry.kind === 'normal-spell' ? effectReviews.spells : entry.kind === 'flip-monster' ? effectReviews.flips : entry.kind === 'counter-trap' ? effectReviews.counters : effectReviews.traps;
      const review = reviews.find(r => r.cardId === entry.cardId)!;
      expect(entry).toMatchObject({ scope: review.scope, reviewStatus: review.status, reviewRevision: review.revision, definitionSha256: review.definitionSha256 });
      expect(entry.name).toBe(registry.cards[entry.cardId]!.name);
      expect(entry.definitionSha256).toBe(definitionFingerprint(registry.cards[entry.cardId]!));
    }
    expect(capabilities.unsupportedIds).toEqual([]);
  });
  it('keeps imported pending/not-started/not-run statuses distinct from reviewed runtime effects', () => {
    const report = createCapabilityReport();
    expect(Object.keys(report.importedSnapshots)).toHaveLength(19);
    expect(report.importedSnapshots.magicianFaith).toMatchObject({ imported: 1, verifiedData: 0, historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
    for (const entry of report.engineCapabilities.reviewedEffects) {
      expect(entry.importedStatus).toEqual({ verification: 'pending', implementation: 'not-started', testing: 'not-run' });
      expect(entry.reviewStatus).toBe('reviewed-for-supported-scope');
    }
    expect(createCapabilityReport()).toEqual(report);
    expect(report.engineCapabilities.limitations).toContain('no general mixed Chain/negation');
  });
  it('does not claim an imported effect is supported when its enabling review is absent', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'YGO capability missing review '));
    try {
      await cp(join(projectRoot, 'data'), join(directory, 'data'), { recursive: true });
      const path = join(directory, 'data/generated/magician-faith.json'), before = await readFile(path, 'utf8');
      await writeFile(join(directory, 'data/reviews/magician-faith.effects.json'), '[]\n');
      const report = createCapabilityReport(directory);
      expect(report.engineCapabilities.supportedDefinitions).toBe(111);
      expect(report.engineCapabilities.reviewedEffects).toHaveLength(16);
      expect(report.engineCapabilities.reviewedEffects.some(e => e.cardId === 'official:31560081')).toBe(false);
      expect(report.engineCapabilities.scope).not.toContain('flip-own-graveyard-spell-single-link-v1');
      expect(report.engineCapabilities.unsupportedIds).toEqual(['official:31560081']);
      expect(report.importedSnapshots.magicianFaith.imported).toBe(1);
      expect(await readFile(path, 'utf8')).toBe(before);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it.each(['scope', 'definition'] as const)('rejects a conflicting %s without repairing or rewriting report inputs', async mode => {
    const directory = await mkdtemp(join(tmpdir(), 'YGO capability conflict '));
    try {
      await cp(join(projectRoot, 'data'), join(directory, 'data'), { recursive: true });
      const relative = mode === 'scope' ? 'data/reviews/magician-faith.effects.json' : 'data/generated/magician-faith.json';
      const path = join(directory, relative), value = JSON.parse(await readFile(path, 'utf8'));
      if (mode === 'scope') value[0].scope = 'normal-spell-target-position-single-link-v1';
      else value.cards[0].text += ' altered test fixture';
      await writeFile(path, JSON.stringify(value, null, 2) + '\n');
      const paths = ['data/generated/pilot.json', 'data/generated/magician-faith.json', 'data/reviews/magician-faith.effects.json'].map(p => join(directory, p));
      const before = await Promise.all(paths.map(p => readFile(p, 'utf8')));
      expect(() => createCapabilityReport(directory)).toThrow(mode === 'scope' ? /scope|Invalid/ : /FLIP review conflict/);
      expect(await Promise.all(paths.map(p => readFile(p, 'utf8')))).toEqual(before);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
