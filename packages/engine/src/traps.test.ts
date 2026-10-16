import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CardBatchSchema } from '../../card-data/src/schema.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
import { createRegistry } from './registry.js';
import { createDuel, applyAction } from './duel.js';
import type { DuelState, Slot } from '../../protocol/src/duel.js';
import type { EngineAction } from './actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const cards = CardBatchSchema.parse(load('../../../data/generated/pilot.json').cards);
const spells = load('../../../data/reviews/pilot.spell-effects.json'), flips = load('../../../data/reviews/pilot.flip-effects.json'), traps = load('../../../data/reviews/pilot.trap-effects.json');
const r = createRegistry(cards, goat200508Format, {}, spells, flips, traps);
const hole = 'official:04206964', ox = 'official:05053103', elf = 'official:15025844';
const normals = Object.values(r.cards).filter(c => c.kind === 'normal-monster').map(c => c.id);
const deck = [hole, hole, ...normals, ...normals, ...normals].slice(0, 40);
function start() {
  const s = structuredClone(createDuel(r, { duelId: 'trap', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '45'.repeat(32) }).state) as Mutable<DuelState>;
  s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0; s.timing.priorityPlayer = 'a'; return s;
}
function hand(s: Mutable<DuelState>, defId: string, who = 'a') {
  const p = s.players.find(p => p.id === who)!;
  const card = Object.values(s.cards).find(c => c.ownerId === who && c.definition.id === defId && c.location.kind === 'deck')!;
  p.deck.splice(p.deck.indexOf(card.id), 1); p.hand.push(card.id); card.location = { kind: 'hand', playerId: who }; return card.id;
}
function set(s: Mutable<DuelState>, slot: Slot = 0, who = 'b') {
  const id = hand(s, hole, who), p = s.players.find(p => p.id === who)!;
  p.hand.splice(p.hand.indexOf(id), 1); p.spellsTraps[slot] = id;
  s.cards[id]!.location = { kind: 'spell-trap', playerId: who, slot }; s.cards[id]!.position = 'face-down'; s.cards[id]!.markers.setOnTurn = 2; return id;
}
function run(s: DuelState, actorId: string, action: EngineAction) {
  const result = applyAction(r, s, { actorId, expectedStateVersion: s.stateVersion, action });
  if (!result.accepted) throw new Error(result.message); return result;
}
const pass = (s: DuelState) => run(s, s.timing.priorityPlayer!, { type: 'pass' }).state;
function rejected(s: DuelState, actorId: string, action: EngineAction) {
  const result = applyAction(r, s, { actorId, expectedStateVersion: s.stateVersion, action });
  expect(result.accepted).toBe(false); expect(result.state).toBe(s);
}
function summon(s: Mutable<DuelState>, definitionId = ox) {
  const target = hand(s, definitionId); return { target, state: run(s, 'a', { type: 'normal-summon', instanceId: target, slot: 0, tributeIds: [] }).state };
}
describe('Reviewed summon-response Normal Trap', () => {
  it('opens all 20 only with all reviewed capabilities', () => {
    expect(Object.keys(r.cards)).toHaveLength(20); expect(r.unsupportedIds).toEqual([]);
    expect(createRegistry(cards, goat200508Format, {}, spells, flips).cards[hole]).toBeUndefined();
  });
  it('rejects review drift and duplicates', () => {
    const changed = structuredClone(cards); changed.find(c => c.id === hole)!.revision++;
    expect(() => createRegistry(changed, goat200508Format, {}, spells, flips, traps)).toThrow('Trap review conflict');
    expect(() => createRegistry(cards, goat200508Format, {}, spells, flips, [...traps, traps[0]])).toThrow();
  });
  it('Sets through the public action and records the Set turn', () => {
    const s = start(), id = hand(s, hole); const done = run(s, 'a', { type: 'set-trap', instanceId: id, slot: 0 }).state;
    expect(done.cards[id]!.position).toBe('face-down'); expect(done.cards[id]!.markers.setOnTurn).toBe(3);
    expect(done.players[0].normalSummonsOrSetsUsed).toBe(0);
  });
  it('waits for summon priority, targets, destroys and cleans up', () => {
    const s = start(), id = set(s); const { target, state } = summon(s);
    rejected(state, 'b', { type: 'activate-trap', instanceId: id, targetId: target });
    const activated = run(pass(state), 'b', { type: 'activate-trap', instanceId: id, targetId: target }).state;
    expect(activated.chain[0]!.spellSpeed).toBe(2); expect(activated.chain[0]!.targetRefs[0]!.instanceId).toBe(target);
    const done = pass(pass(activated)); expect(done.players[0].graveyard).toContain(target); expect(done.players[1].graveyard).toContain(id);
    expect(done.chain).toHaveLength(0);
  });
  it('resolves two Trap responses LIFO with exactly one destruction', () => {
    const s = start(), first = set(s), second = set(s, 1); const { target, state } = summon(s);
    let linked = run(pass(state), 'b', { type: 'activate-trap', instanceId: first, targetId: target }).state;
    linked = run(pass(linked), 'b', { type: 'activate-trap', instanceId: second, targetId: target }).state;
    linked = pass(linked);
    const done = run(linked, 'b', { type: 'pass' });
    expect(done.events.filter(e => e.kind === 'chain-link-resolving').map(e => e.affectedInstances[0])).toEqual([second, first]);
    expect(done.events.filter(e => e.kind === 'effect-destroyed')).toHaveLength(1);
    expect(done.state.players[1].graveyard).toEqual([second, first]);
  });
  it('rejects activation in the Set turn', () => {
    const s = start(), id = set(s); s.cards[id]!.markers.setOnTurn = 3; const { target, state } = summon(s);
    rejected(pass(state), 'b', { type: 'activate-trap', instanceId: id, targetId: target });
  });
  it('rejects ATK below 1000 and activation from hand', () => {
    const s = start(), id = set(s), handId = hand(s, hole, 'b'); const { target, state } = summon(s, elf);
    const response = pass(state);
    rejected(response, 'b', { type: 'activate-trap', instanceId: id, targetId: target });
    rejected(response, 'b', { type: 'activate-trap', instanceId: handId, targetId: target });
  });
  it('cannot respond to Set or reopen a summon window after both pass', () => {
    const s = start(), id = set(s), target = hand(s, ox);
    const setState = run(s, 'a', { type: 'set-monster', instanceId: target, slot: 0, tributeIds: [] }).state;
    rejected(pass(setState), 'b', { type: 'activate-trap', instanceId: id, targetId: target });
    const fresh = start(), otherId = set(fresh), summoned = summon(fresh);
    const closed = pass(pass(summoned.state));
    rejected(closed, 'b', { type: 'activate-trap', instanceId: otherId, targetId: summoned.target });
  });
  it('accepts a Normal Monster Flip Summon', () => {
    const s = start(), id = set(s), target = hand(s, ox);
    s.players[0].hand.splice(s.players[0].hand.indexOf(target), 1); s.players[0].monsters[0] = target;
    s.cards[target]!.location = { kind: 'monster', playerId: 'a', slot: 0 }; s.cards[target]!.position = 'face-down-defense';
    const flipped = run(s, 'a', { type: 'flip-summon', instanceId: target }).state;
    const linked = run(pass(flipped), 'b', { type: 'activate-trap', instanceId: id, targetId: target }).state;
    expect(pass(pass(linked)).players[0].graveyard).toContain(target);
  });
  it('rejects a Special Summon event fixture; no Special Summon command exists yet', () => {
    const s = start(), id = set(s), summoned = summon(s);
    const fixture = structuredClone(pass(summoned.state)) as Mutable<DuelState>;
    fixture.timing.lastRelevantEvents[0]!.details = { playerId: 'a', method: 'special' };
    rejected(fixture, 'b', { type: 'activate-trap', instanceId: id, targetId: summoned.target });
  });
  it('cannot target another monster or activate against your own summon', () => {
    const s = start(), id = set(s), old = hand(s, ox);
    s.players[0].hand.splice(s.players[0].hand.indexOf(old), 1); s.players[0].monsters[1] = old;
    s.cards[old]!.location = { kind: 'monster', playerId: 'a', slot: 1 }; s.cards[old]!.position = 'face-up-attack';
    const ownTrap = set(s, 0, 'a'); const summoned = summon(s);
    rejected(summoned.state, 'a', { type: 'activate-trap', instanceId: ownTrap, targetId: summoned.target });
    rejected(pass(summoned.state), 'b', { type: 'activate-trap', instanceId: id, targetId: old });
  });

});
