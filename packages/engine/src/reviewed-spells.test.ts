import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CardBatchSchema } from '../../card-data/src/schema.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
import { createRegistry, validateDeck } from './registry.js';
import { SpellReviewsSchema } from './spell-review.js';
import { createDuel, applyAction, assertDuelInvariants } from './duel.js';
import type { DuelState, Slot } from '../../protocol/src/duel.js';
import type { EngineAction } from './actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const cards = CardBatchSchema.parse(load('../../../data/generated/pilot.json').cards);
const reviews = SpellReviewsSchema.parse(load('../../../data/reviews/pilot.spell-effects.json'));
const r = createRegistry(cards, goat200508Format, {}, reviews);
const pot = 'official:55144522', fissure = 'official:66788016';
const normals = Object.values(r.cards).filter(c => c.kind === 'normal-monster').map(c => c.id);
const deck = [pot, fissure, ...normals, ...normals, ...normals].slice(0, 40);
function run(s: DuelState, actorId: string, action: EngineAction) {
  const result = applyAction(r, s, { actorId, expectedStateVersion: s.stateVersion, action });
  if (!result.accepted) throw new Error(result.message);
  return result;
}
function settle(input: DuelState) {
  let s = input;
  while (!s.result && !s.pendingDecision && s.timing.window !== 'open') s = run(s, s.timing.priorityPlayer!, { type: 'pass' }).state;
  return s;
}
function setup(definitionId: string) {
  const s = structuredClone(createDuel(r, { duelId: 'official-spells', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '45'.repeat(32) }).state) as Mutable<DuelState>;
  s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'a'; s.timing.consecutivePasses = 0;
  const card = Object.values(s.cards).find(c => c.ownerId === 'a' && c.definition.id === definitionId)!;
  if (card.location.kind === 'deck') { s.players[0].deck.splice(s.players[0].deck.indexOf(card.id), 1); s.players[0].hand.push(card.id); card.location = { kind: 'hand', playerId: 'a' }; }
  return { s, id: card.id };
}
function put(s: Mutable<DuelState>, slot: Slot, definitionId = normals[0]!, faceUp = true) {
  const card = Object.values(s.cards).find(c => c.ownerId === 'b' && c.definition.id === definitionId && ['hand', 'deck'].includes(c.location.kind))!;
  const p = s.players[1], list = card.location.kind === 'deck' ? p.deck : p.hand;
  list.splice(list.indexOf(card.id), 1); p.monsters[slot] = card.id;
  card.location = { kind: 'monster', playerId: 'b', slot }; card.position = faceUp ? 'face-up-attack' : 'face-down-defense'; return card.id;
}
describe('Reviewed official spells: supported single-link scope', () => {
  it('opens exactly two spells without mutating imported statuses', () => {
    expect(Object.keys(r.cards)).toHaveLength(17); expect(r.unsupportedIds).toHaveLength(3);
    expect(cards.find(c => c.id === pot)!.implementation).toBe('not-started');
    expect(createRegistry(cards, goat200508Format).cards[pot]).toBeUndefined();
  });
  it.each(['text', 'revision', 'legality'])('rejects drift in %s instead of silently reusing a review', field => {
    const changed = structuredClone(cards); const card = changed.find(c => c.id === pot)!;
    if (field === 'text') card.text += ' changed';
    if (field === 'revision') card.revision++;
    if (field === 'legality') card.legality.maxCopies = 2;
    expect(() => createRegistry(changed, goat200508Format, {}, reviews)).toThrow('review conflict');
  });
  it('rejects stale format, duplicate review, missing evidence and binding override', () => {
    const stale = structuredClone(reviews); stale[0]!.format.revision++;
    expect(() => createRegistry(cards, goat200508Format, {}, stale)).toThrow('review conflict');
    expect(() => createRegistry(cards, goat200508Format, {}, [...reviews, reviews[0]])).toThrow();
    const empty = structuredClone(reviews); empty[0]!.evidence = [];
    expect(() => createRegistry(cards, goat200508Format, {}, empty)).toThrow();
    expect(() => createRegistry(cards, goat200508Format, { [pot]: { handler: 'draw', count: 3 } }, reviews)).toThrow('overridden');
  });
  it('enforces April 2005 Pot of Greed limit of one', () => {
    expect(r.cards[pot]!.legality.maxCopies).toBe(1);
    expect(() => validateDeck(r, [pot, ...deck.slice(0, 39)])).toThrow('Copy limit');
  });
  it('activates real Pot through public commands without editing the initial duel', () => {
    // Search deterministic test seeds for a legal opening hand; never changes deck order or state.
    let s: DuelState | undefined;
    for (let n = 1; n <= 100; n++) {
      const candidate = createDuel(r, { duelId: 'pot-public-api', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: n.toString(16).padStart(64, '0') }).state;
      if (candidate.players[0].hand.some(id => candidate.cards[id]!.definition.id === pot)) { s = candidate; break; }
    }
    if (!s) throw new Error('No test opening found');
    s = settle(s);
    for (const phase of ['standby', 'main1'] as const) s = settle(run(s, 'a', { type: 'request-phase', phase }).state);
    const instanceId = s.players[0].hand.find(id => s!.cards[id]!.definition.id === pot)!;
    const before = s.players[0].deck.length;
    s = settle(run(s, 'a', { type: 'activate-spell', instanceId, slot: 0 }).state);
    expect(s.players[0].deck).toHaveLength(before - 2); expect(s.players[0].graveyard).toContain(instanceId);
    assertDuelInvariants(s, r);
  });
  it.each([0, 1, 2])('resolves real Pot with %i cards left, losing only on failed draw', count => {
    const { s, id } = setup(pot); const p = s.players[0];
    while (p.deck.length > count) { const moved = p.deck.pop()!; p.graveyard.push(moved); s.cards[moved]!.location = { kind: 'graveyard', playerId: 'a' }; }
    const done = settle(run(s, 'a', { type: 'activate-spell', instanceId: id, slot: 0 }).state);
    expect(done.result).toEqual(count < 2 ? { winner: 'b', reason: 'failed-draw' } : null);
  });
  it('resolves real Fissure tie as a resolution choice, without activation targets', () => {
    const { s, id } = setup(fissure); put(s, 0); const victim = put(s, 1);
    const activated = run(s, 'a', { type: 'activate-spell', instanceId: id, slot: 0 }).state;
    expect(activated.chain[0]!.targetRefs).toEqual([]);
    const waiting = settle(activated); expect(waiting.pendingDecision?.kind).toBe('effect-choice');
    const d = waiting.pendingDecision!;
    const done = run(waiting, 'a', { type: 'answer-decision', decisionId: d.id, optionIds: [victim] });
    expect(done.state.players[1].graveyard).toContain(victim);
    expect(done.events.some(e => e.kind === 'effect-destroyed')).toBe(true);
    expect(done.state.players[0].graveyard).toContain(id);
  });
  it('rejects real Fissure with only face-down opponents, preserving original state', () => {
    const { s, id } = setup(fissure); put(s, 0, normals[0]!, false);
    const rejected = applyAction(r, s, { actorId: 'a', expectedStateVersion: s.stateVersion, action: { type: 'activate-spell', instanceId: id, slot: 0 } });
    expect(rejected.accepted).toBe(false); expect(rejected.state).toBe(s);
  });
});
