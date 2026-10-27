import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { defaultDeck } from './deck-store.js';
import { exportDeck, importDeck } from './deck-transfer.js';
const { registry } = loadRuntimeCatalog(), cards = defaultDeck(registry);
describe('Portable deck files', () => {
  it('roundtrips ordered IDs, accepts UTF-8 BOM, and exports no private/save metadata', () => {
    const file = exportDeck(registry, cards);
    expect(Object.keys(file).sort()).toEqual(['cards', 'format', 'kind', 'schemaVersion']);
    expect(importDeck(registry, '\uFEFF' + JSON.stringify(file))).toEqual(cards);
    file.cards.pop(); expect(cards).toHaveLength(40);
  });
  it('roundtrips the full legal pool without imposing a modern 60-card ceiling', () => {
    const pool = Object.values(registry.cards).flatMap(c => Array(Math.min(3, c.legality.maxCopies!)).fill(c.id));
    const text = JSON.stringify(exportDeck(registry, pool), null, 2) + '\n';
    expect(pool).toHaveLength(328); expect(importDeck(registry, text)).toEqual(pool);
  });
  it.each(['json', 'version', 'format', 'format-revision', 'unknown', 'copies', 'short', 'definitions', 'seat', 'oversize'])('rejects %s without mutating the source deck', mode => {
    const file: any = exportDeck(registry, cards), before = [...cards];
    if (mode === 'version') file.schemaVersion = 2;
    if (mode === 'format') file.format = { ...file.format, id: 'different' };
    if (mode === 'format-revision') file.format = { ...file.format, revision: file.format.revision + 1 };
    if (mode === 'unknown') file.cards[0] = 'custom:unreviewed';
    if (mode === 'copies') file.cards.push('official:55144522');
    if (mode === 'short') file.cards.pop();
    if (mode === 'definitions') file.definitions = [{ text: 'execute this' }];
    if (mode === 'seat') file.seat = 'b';
    expect(() => importDeck(registry, mode === 'json' ? '{' : mode === 'oversize' ? ' '.repeat(12001) : JSON.stringify(file))).toThrow();
    expect(cards).toEqual(before);
  });
  it('refuses to export an invalid draft', () => expect(() => exportDeck(registry, [])).toThrow());
});
