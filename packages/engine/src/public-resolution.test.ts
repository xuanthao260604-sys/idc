import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRegistry } from './registry.js';
import { createDuel } from './duel.js';
import type { EngineEvent } from './duel.js';
import { publicResolution } from './public-resolution.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
const data = JSON.parse(readFileSync(new URL('../../../data/generated/pilot.json', import.meta.url), 'utf8'));
const r = createRegistry(data.cards, goat200508Format), ids = Object.keys(r.cards), deck = [...ids, ...ids, ...ids].slice(0, 40);
const state = createDuel(r, { duelId: 'feedback-test', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '12'.repeat(32) }).state;
const event = (kind: string, affectedInstances: string[], details: EngineEvent['details'] = {}): EngineEvent => ({ sequence: 99, simultaneousGroup: 'internal-secret-group', kind, affectedInstances, details });
describe('Public resolution allowlist', () => {
  it('keeps Spell negation/destruction separate from monsters, omitting private event fields', () => {
    const summary = publicResolution([event('spell-activation-negated', ['private-source'], { playerId: 'a', discard: 'private-cost' }), event('spell-destroyed', ['private-source'], { playerId: 'a' }), event('sent-to-graveyard', ['private-counter']), event('spell-destroyed', ['bad'], { playerId: 'unknown' }), event('spell-activation-negated', [], { playerId: 'a' })], state);
    expect(summary).toEqual([{ kind: 'spell-activation-negated', playerId: 'a', count: 1 }, { kind: 'spell-destroyed', playerId: 'a', count: 1 }]);
    expect(JSON.stringify(summary)).not.toContain('private'); expect(Object.isFrozen(summary)).toBe(true);
  });
  it('aggregates draw counts for the actual recipient without names, IDs or unknown details', () => {
    const input = [event('card-drawn', [state.players[1].hand[0]!], { playerId: 'b', hiddenName: 'secret-name' }), event('card-drawn', [state.players[1].hand[1]!], { playerId: 'b' })];
    const before = structuredClone(input), summary = publicResolution(input, state);
    expect(summary).toEqual([{ kind: 'draw', playerId: 'b', count: 2 }]); expect(input).toEqual(before);
    expect(Object.isFrozen(summary[0])).toBe(true);
    for (const id of Object.keys(state.cards)) expect(JSON.stringify(summary)).not.toContain(id);
    expect(JSON.stringify(summary)).not.toContain('secret-name'); expect(JSON.stringify(summary)).not.toContain('internal-secret-group');
  });
  it('keeps battle damage distinct from destruction and ignores cleanup movement to avoid double counting', () => {
    expect(publicResolution([event('battle-damage', [], { playerId: 'a', amount: 1700 }), event('battle-destroyed', ['one', 'two']), event('sent-to-graveyard', ['one', 'two'], { reason: 'battle' })], state))
      .toEqual([{ kind: 'battle-damage', playerId: 'a', amount: 1700 }, { kind: 'battle-destroyed', count: 2 }]);
  });
  it('attributes return-to-hand to owners, not the acting player, without returning identities', () => {
    const a = state.players[0].hand[0]!, b = state.players[1].hand[0]!;
    expect(publicResolution([event('returned-to-hand', [a, b, b], { playerId: 'b' })], state))
      .toEqual([{ kind: 'return-to-hand', playerId: 'a', count: 1 }, { kind: 'return-to-hand', playerId: 'b', count: 1 }]);
  });
  it('counts effect destruction, discards and tributes without serializing private choices', () => {
    const events = [event('effect-destroyed', ['target']), event('cards-discarded', ['secret1', 'secret2'], { playerId: 'a' }), event('monsters-tributed', ['cost'], { playerId: 'b' })];
    expect(publicResolution(events, state)).toEqual([{ kind: 'effect-destroyed', count: 1 }, { kind: 'discard', playerId: 'a', count: 2 }, { kind: 'tribute', playerId: 'b', count: 1 }]);
  });
  it('drops unsupported events and invalid recipients/damage rather than echoing arbitrary fields', () => {
    expect(publicResolution([event('private-search', ['hidden'], { text: 'secret' }), event('card-drawn', ['hidden'], { playerId: 'outsider' }), event('battle-damage', [], { playerId: 'a', amount: -100 }), event('battle-damage', [], { playerId: 'b', amount: Infinity }), event('effect-destroyed', [])], state)).toEqual([]);
  });
  it('counts only successful draws before a failed-draw loss, without inventing the requested total', () => {
    const events = [event('card-drawn', [state.players[0].hand[0]!], { playerId: 'a' }), event('duel-ended', [], { winner: 'b', reason: 'failed-draw' })];
    expect(publicResolution(events, state)).toEqual([{ kind: 'draw', playerId: 'a', count: 1 }]);
  });

});
