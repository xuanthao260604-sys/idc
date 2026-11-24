import {readFileSync} from 'node:fs';
import {cp,mkdtemp,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {describe,it,expect} from 'vitest';
import {loadRuntimeCatalog,loadLegacyV5Catalog} from './runtime-catalog.js';
import {createCapabilityReport,createLegacyV5CapabilityReport} from './engine-capabilities.js';
import {createRegistry} from '../packages/engine/src/registry.js';
import {createDuel,applyAction} from '../packages/engine/src/duel.js';
import {goat200508Format} from '../packages/card-data/src/formats/goat-2005-08-17.js';
import {createDeckStore} from './deck-store.js';
import {createBetaServer} from './beta-server.js';
const current=loadRuntimeCatalog(),legacy=loadLegacyV5Catalog(),profile=JSON.parse(readFileSync('data/evidence/effects/bounded-counter-scope-review.json','utf8')),seven='official:03819470';
describe('application default v6 and explicit retained v5 profile',()=>{
 it('adopts the exact C3a proposal and inherited quotations without rewriting the design snapshot',()=>{
  const r=current.effectReviews.counters.find(r=>r.cardId===seven)!;expect(r).toMatchObject({revision:6,scope:profile.proposal.scope,continuation:profile.proposal.continuation,definitionSha256:profile.proposal.definitionSha256});expect(r.evidence).toEqual(profile.quotations.map((q:any)=>q.evidence));expect(r.evidence).toHaveLength(30);
  expect(current.registry.boundedCounterReview).toEqual(r);expect(legacy.registry.counterContinuations[seven]).toBe('reviewed-four-link-counter-patterns-v5');expect(legacy.registry.boundedCounterReview).toBeUndefined();expect(profile.runtimeEnabled).toBe(false);expect(profile.historicalPrintedTextReview).toBe('pending');
 });
 it('keeps all imported card data, other reviews, handlers and default decks identical across profiles',()=>{
  expect(current.cards).toEqual(legacy.cards);expect(current.importedSnapshots).toEqual(legacy.importedSnapshots);expect(current.effectReviews.spells).toEqual(legacy.effectReviews.spells);expect(current.effectReviews.flips).toEqual(legacy.effectReviews.flips);expect(current.effectReviews.traps).toEqual(legacy.effectReviews.traps);expect(current.effectReviews.counters.filter(r=>r.cardId!==seven)).toEqual(legacy.effectReviews.counters.filter(r=>r.cardId!==seven));
  for(const key of ['cards','rules','spellHandlers','flipHandlers','trapHandlers','counterTrapHandlers','unsupportedIds'] as const)expect(current.registry[key]).toEqual(legacy.registry[key]);expect(createDeckStore(current.registry).defaults).toEqual(createDeckStore(legacy.registry).defaults);
 });
 it('uses distinct registry revisions and persists a frame field only on the current state ABI',()=>{
  const deck=[...createDeckStore(current.registry).defaults],start:Parameters<typeof createDuel>[1]={duelId:'profile-version',players:[{id:'a',deck},{id:'b',deck}],firstPlayerId:'a',seedHex:'12'.repeat(32)},now=createDuel(current.registry,start).state,old=createDuel(legacy.registry,start).state;
  expect(current.registry.revision).not.toBe(legacy.registry.revision);expect(now.boundedCounterResolution).toBeNull();expect(old).not.toHaveProperty('boundedCounterResolution');expect(()=>applyAction(legacy.registry,now,{actorId:'a',expectedStateVersion:now.stateVersion,action:{type:'pass'}})).toThrow();expect(()=>applyAction(current.registry,old,{actorId:'a',expectedStateVersion:old.stateVersion,action:{type:'pass'}})).toThrow();
 });
 it('changes only the reviewed Seven scope/revision/continuation and its limitation in the capability report',()=>{
  const now=createCapabilityReport(),old=createLegacyV5CapabilityReport(),n=structuredClone(now),o=structuredClone(old),a=n.engineCapabilities.reviewedEffects.find(r=>r.cardId===seven)!,b=o.engineCapabilities.reviewedEffects.find(r=>r.cardId===seven)!;
  expect(a.reviewRevision).toBe(6);expect(b.reviewRevision).toBe(5);expect(a.importedStatus).toEqual({verification:'pending',implementation:'not-started',testing:'not-run'});
  Object.assign(a,{scope:b.scope,reviewRevision:b.reviewRevision,continuation:b.continuation});n.engineCapabilities.scope=[...o.engineCapabilities.scope];n.engineCapabilities.limitations=[...o.engineCapabilities.limitations];expect(n).toEqual(o);expect(now.engineCapabilities.limitations[0]).toContain('no universal eight-link rule');
 });
 it.each(profile.cardPins.map((p:any)=>p.cardId) as string[])('fails closed when current mandatory dependency %s is missing',id=>{
  expect(()=>createRegistry(current.cards.filter(c=>c.id!==id),goat200508Format,{},current.effectReviews.spells,current.effectReviews.flips,current.effectReviews.traps,current.effectReviews.counters)).toThrow();
 });
 it('never falls back to v5 when the active review is missing',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'YGO current review missing '));try{await cp('data',join(directory,'data'),{recursive:true});await rm(join(directory,'data/reviews/seven-tools-v6.effects.json'));expect(()=>loadRuntimeCatalog(directory)).toThrow();expect(loadLegacyV5Catalog(directory).registry.counterContinuations[seven]).toBe('reviewed-four-link-counter-patterns-v5');}finally{await rm(directory,{recursive:true,force:true});}
 });
 it('opens saved v5 A/B decks on v6 without rewriting bytes and keeps them on a rejected save',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'YGO v5-v6 deck preserve '));try{const old=createDeckStore(legacy.registry,directory);for(const who of ['a','b'] as const)expect((await old.save(who,0,[...old.defaults])).ok).toBe(true);const before=await Promise.all(['a','b'].map(who=>readFile(join(directory,who+'.json')))),now=createDeckStore(current.registry,directory);
   for(const who of ['a','b'] as const){expect(now.get(who)).toEqual(old.get(who));expect((await now.save(who,now.get(who).revision,[])).ok).toBe(false);}expect(await Promise.all(['a','b'].map(who=>readFile(join(directory,who+'.json'))))).toEqual(before);
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it('starts the application server with v6, guards rejected deck imports and resets with the same profile',async()=>{
  const server=createBetaServer(current.registry);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const a=server.address();if(!a||typeof a==='string')throw Error('No listener');const base=`http://127.0.0.1:${a.port}`;let cookie='';const post=(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)}),get=(path:string)=>fetch(base+path,{headers:{Cookie:cookie}}).then(r=>r.json());try{
   const s=await post('/api/seat',{seat:'a'});cookie=s.headers.get('set-cookie')!.split(';')[0]!;const before=await get('/api/view?seat=a'),deck=await get('/api/deck?seat=a');expect((await get('/api/catalog')).cards.find((c:any)=>c.id===seven).support.counterContinuation).toBe('reviewed-bounded-counter-patterns-v6');expect(JSON.stringify(before)).not.toContain('boundedCounterResolution');
   await post('/api/deck/import',{seat:'a',text:'{bad file'});expect(await get('/api/deck?seat=a')).toEqual(deck);expect(await get('/api/view?seat=a')).toEqual(before);
   const r=await post('/api/command',{seat:'a',commandId:'default-pass',duelId:before.duelId,expectedStateVersion:before.stateVersion,action:{type:'pass'}});expect((await r.json()).outcome.accepted).toBe(true);const v=await get('/api/view?seat=a'),reset=await post('/api/reset',{seat:'a',duelId:v.duelId,expectedStateVersion:v.stateVersion,firstPlayer:'b'});expect(reset.status).toBe(200);expect((await reset.json()).turn.activePlayer).toBe('b');expect(await get('/api/deck?seat=a')).toEqual(deck);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
 });
});
