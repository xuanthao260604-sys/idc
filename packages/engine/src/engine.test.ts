import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CardBatchSchema, CardSchema } from '../../card-data/src/schema.js';
import type { CardDefinition } from '../../card-data/src/schema.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Position, Slot } from '../../protocol/src/duel.js';
import { createRegistry, validateDeck } from './registry.js';
import type { Registry } from './registry.js';
import { applyAction, assertDuelInvariants, createDuel } from './duel.js';
import type { EngineAction } from './actions.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const bundle = JSON.parse(readFileSync(new URL('../../../data/generated/pilot.json', import.meta.url), 'utf8'));
const definitions = CardBatchSchema.parse(bundle.cards);
const registry = createRegistry(definitions, goat200508Format);
const id = (name: string, r = registry) => Object.values(r.cards).find(c => c.name === name)!.id;
const deck = (r = registry) => { const ids = Object.keys(r.cards); return [...ids, ...ids, ...ids].slice(0, 40); };
const start = (r = registry, seedHex = '12'.repeat(32)) => createDuel(r, {
  duelId: 'test-duel', players: [{ id: 'a', deck: deck(r) }, { id: 'b', deck: deck(r) }], firstPlayerId: 'a', seedHex,
}).state;
const step = (state: DuelState, actorId: string, action: EngineAction, r = registry) => {
  const result = applyAction(r, state, { actorId, expectedStateVersion: state.stateVersion, action });
  if (!result.accepted) throw new Error(`${result.code}: ${result.message}`);
  return result;
};
function settle(input: DuelState, r = registry) {
  let state = input;
  for (let count = 0; !state.result && !state.pendingDecision && state.timing.window !== 'open'; count++) {
    if (count > 3) throw new Error('Response window did not close');
    state = step(state, state.timing.priorityPlayer!, { type: 'pass' }, r).state;
  }
  return state;
}
function phase(input: DuelState, target: DuelState['turn']['phase'], r = registry) {
  const state = settle(input, r);
  return settle(step(state, state.turn.activePlayer, { type: 'request-phase', phase: target }, r).state, r);
}
function reject(state: DuelState, actorId: string, action: unknown, code: string, r = registry) {
  const before = JSON.stringify(state);
  const result = applyAction(r, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(result.accepted).toBe(false);
  if (!result.accepted) { expect(result.code).toBe(code); expect(result.state).toBe(state); }
  expect(JSON.stringify(state)).toBe(before);
}
function take(state: Mutable<DuelState>, playerId: string, definitionId: string) {
  const p = state.players.find(p => p.id === playerId)!;
  const card = Object.values(state.cards).find(c => c.ownerId === playerId && c.definition.id === definitionId && (c.location.kind === 'deck' || c.location.kind === 'hand'))!;
  if (!card) throw new Error('Fixture card unavailable');
  const from = card.location.kind === 'deck' ? p.deck : p.hand;
  from.splice(from.indexOf(card.id), 1);
  return { p, card };
}
function inHand(state: Mutable<DuelState>, name: string, playerId = 'a', r = registry) {
  const { p, card } = take(state, playerId, id(name, r));
  p.hand.push(card.id); card.location = { kind: 'hand', playerId }; card.position = 'face-down';
  return card.id;
}
function put(state: Mutable<DuelState>, name: string, playerId = 'a', slot: Slot = 0, position: Position = 'face-up-attack', r = registry) {
  const { p, card } = take(state, playerId, id(name, r));
  if (p.monsters[slot] !== null) throw new Error('Fixture slot is occupied');
  p.monsters[slot] = card.id; card.location = { kind: 'monster', playerId, slot }; card.position = position;
  card.markers.summonedOnTurn = state.turn.number - 1; card.markers.summonedBy = playerId;
  card.markers.setOnTurn = position === 'face-down-defense' ? state.turn.number - 1 : null;
  return card.id;
}
function scenario(configure: (state: Mutable<DuelState>) => void, r = registry) {
  const state = structuredClone(start(r)) as Mutable<DuelState>;
  state.turn.number = 3; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.consecutivePasses = 0;
  configure(state); assertDuelInvariants(state, r); return state;
}
function battle(attacker: string, defender: string | null, position: Position = 'face-up-attack', r = registry) {
  const state = scenario(s => {
    s.turn.phase = 'battle';
    s.battle = { step: 'battle', attacker: null, target: null, damageTiming: null, ordinaryDamageChainUsed: false, replayPending: false };
    put(s, attacker, 'a', 0, 'face-up-attack', r);
    if (defender) put(s, defender, 'b', 0, position, r);
  }, r);
  const declaration = step(state, 'a', { type: 'declare-attack', attackerId: state.players[0].monsters[0]!, targetId: state.players[1].monsters[0] ?? 'direct' }, r);
  const firstPass = step(declaration.state, 'a', { type: 'pass' }, r);
  return step(firstPass.state, 'b', { type: 'pass' }, r);
}
function synthetic(name: string, values: { level?: number; attack?: number; defense?: number } = {}): CardDefinition {
  const base = Object.values(registry.cards)[0]!;
  const { passcode, ...rest } = base;
  return CardSchema.parse({ ...rest, ...values, id: `custom:test-${name}`, origin: 'custom', name: `TEST ONLY ${name}`,
    text: 'Synthetic test fixture; not a real Yu-Gi-Oh! card.', textBasis: 'custom', sources: [],
    legality: { ...rest.legality, maxCopies: 3, evidence: [{ url: 'https://example.org/test-only', accessedOn: '2026-10-15', scope: 'restriction', notes: 'Synthetic test fixture only' }] } });
}

describe('registry and trusted startup', () => {
  it('supports the 15 reviewed normal definitions without mutating imported statuses', () => {
    expect(Object.keys(registry.cards)).toHaveLength(15);
    expect(registry.unsupportedIds).toHaveLength(5);
    expect(definitions.every(c => c.implementation === 'not-started')).toBe(true);
    expect(Object.isFrozen(registry.cards)).toBe(true);
  });
  it('can replace the complete official catalog with synthetic custom data without changing engine code', () => {
    const cards = Array.from({ length: 21 }, (_, n) => synthetic(`replacement-${n}`));
    const r = createRegistry(cards, goat200508Format);
    const ids = Object.keys(r.cards).flatMap(id => [id, id, id]);
    expect(() => validateDeck(r, ids)).not.toThrow(); // 63 cards: no invented modern 60-card cap.
    const duel = createDuel(r, { duelId: 'replacement', players: [{ id: 'a', deck: ids }, { id: 'b', deck: ids }] });
    expect(Object.values(duel.state.cards).every(card => card.definition.id.startsWith('custom:'))).toBe(true);
  });
  it('rejects short decks, excessive copies and pending/effect cards', () => {
    expect(() => validateDeck(registry, deck().slice(0, 39))).toThrow('Deck size');
    expect(() => validateDeck(registry, Array(40).fill(id('Battle Ox')))).toThrow('Copy limit');
    const invalid = deck(); invalid[0] = 'official:55144522';
    expect(() => validateDeck(registry, invalid)).toThrow('Unsupported');
  });
  it('starts with 8000 LP and 5 cards each then performs the first normal draw', () => {
    const result = createDuel(registry, { duelId: 'setup', players: [{ id: 'a', deck: deck() }, { id: 'b', deck: deck() }], firstPlayerId: 'a' });
    expect(result.state.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
    expect(result.state.players.map(p => p.hand.length)).toEqual([6, 5]);
    expect(result.state.players.map(p => p.deck.length)).toEqual([34, 35]);
    expect(result.events.filter(e => e.kind === 'card-drawn')).toHaveLength(11);
    expect(Object.keys(result.state.cards)).toHaveLength(80);
    assertDuelInvariants(result.state, registry);
  });
  it('reproduces shuffle for a fixed server seed and differs with another seed', () => {
    expect(start().players).toEqual(start().players);
    expect(start().players[0].deck).not.toEqual(start(registry, '34'.repeat(32)).players[0].deck);
  });
  it('does not mutate input decks and freezes resulting snapshots', () => {
    const inputDeck = deck(); const before = [...inputDeck];
    const s = createDuel(registry, { duelId: 'immutable', players: [{ id: 'a', deck: inputDeck }, { id: 'b', deck: inputDeck }] }).state;
    expect(inputDeck).toEqual(before);
    expect(Object.isFrozen(s.players[0].deck)).toBe(true);
  });
});

describe('phase and response windows', () => {
  it('requires the opponent to pass before completing a phase request', () => {
    const state = settle(start());
    const requested = step(state, 'a', { type: 'request-phase', phase: 'standby' }).state;
    expect(requested.turn.phase).toBe('draw');
    expect(requested.timing.priorityPlayer).toBe('b');
    reject(requested, 'a', { type: 'pass' }, 'not-your-action');
    expect(step(requested, 'b', { type: 'pass' }).state.turn.phase).toBe('standby');
  });
  it('does not allow the first player to battle or jump directly to Main 2', () => {
    const main = phase(phase(start(), 'standby'), 'main1');
    reject(main, 'a', { type: 'request-phase', phase: 'battle' }, 'illegal-timing');
    reject(main, 'a', { type: 'request-phase', phase: 'main2' }, 'illegal-timing');
  });
  it('draws for the next player when the End Phase completes', () => {
    let s = phase(phase(start(), 'standby'), 'main1');
    s = phase(phase(s, 'end'), 'draw');
    expect(s.turn).toEqual({ number: 2, activePlayer: 'b', phase: 'draw' });
    expect(s.players[1].hand).toHaveLength(6);
  });
});

describe('summoning and setting', () => {
  it.each(Object.values(registry.cards).filter(c => c.kind === 'normal-monster' && c.level <= 4))('Normal Summons $name using data rather than a hardcoded card handler', card => {
    const state = scenario(s => { inHand(s, card.name); });
    const target = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === card.id)!;
    const result = step(state, 'a', { type: 'normal-summon', instanceId: target, slot: 0, tributeIds: [] });
    expect(result.state.cards[target]!.position).toBe('face-up-attack');
    expect(result.state.players[0].normalSummonsOrSetsUsed).toBe(1);
    expect(result.state.timing.window).toBe('summon-response');
  });
  it('requires two Tributes for Blue-Eyes and permits reusing a tributed occupied slot', () => {
    const state = scenario(s => {
      inHand(s, 'Blue-Eyes White Dragon');
      put(s, 'Battle Ox', 'a', 0); put(s, 'Mystical Elf', 'a', 1, 'face-down-defense');
      put(s, 'Celtic Guardian', 'a', 2); put(s, 'Ryu-Kishin', 'a', 3); put(s, 'Beaver Warrior', 'a', 4);
    });
    const p = state.players[0]; const tributes = [p.monsters[0]!, p.monsters[1]!];
    const blue = p.hand.find(instance => state.cards[instance]!.definition.id === id('Blue-Eyes White Dragon'))!;
    const result = step(state, 'a', { type: 'normal-summon', instanceId: blue, slot: 0, tributeIds: tributes });
    expect(result.state.players[0].graveyard).toEqual(tributes);
    expect(result.state.players[0].monsters.filter(Boolean)).toHaveLength(4);
    expect(result.events.map(e => e.kind)).toEqual(['monsters-tributed', 'monster-summoned']);
    expect(tributes.every(instance => !result.state.cards[instance]!.markers.wasBattleDestroyed)).toBe(true);
  });
  it.each([5, 6])('requires one Tribute at Level %i using synthetic data', level => {
    const card = synthetic(`level-${level}`, { level }); const r = createRegistry([...definitions, card], goat200508Format);
    const state = scenario(s => { inHand(s, card.name, 'a', r); put(s, 'Battle Ox', 'a', 0, 'face-up-attack', r); }, r);
    const summoned = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === card.id)!;
    const result = step(state, 'a', { type: 'normal-summon', instanceId: summoned, slot: 0, tributeIds: [state.players[0].monsters[0]!] }, r);
    expect(result.state.players[0].graveyard).toHaveLength(1);
  });
  it('rejects wrong/duplicate/enemy Tributes without consuming cards or quota', () => {
    const state = scenario(s => { inHand(s, 'Dark Magician'); put(s, 'Battle Ox'); put(s, 'Mystical Elf', 'b'); });
    const instanceId = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Dark Magician'))!;
    for (const tributeIds of [[], [state.players[0].monsters[0]!], [state.players[0].monsters[0]!, state.players[0].monsters[0]!], [state.players[0].monsters[0]!, state.players[1].monsters[0]!]])
      reject(state, 'a', { type: 'normal-summon', instanceId, slot: 1, tributeIds }, 'unpayable-tribute');
  });
  it('shares the Normal Summon/Set quota between Main 1 and Main 2', () => {
    let state: DuelState = scenario(s => { inHand(s, 'Battle Ox'); inHand(s, 'Mystical Elf'); });
    const first = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Battle Ox'))!;
    state = settle(step(state, 'a', { type: 'normal-summon', instanceId: first, slot: 0, tributeIds: [] }).state);
    state = phase(phase(state, 'battle'), 'main2');
    const second = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Mystical Elf'))!;
    reject(state, 'a', { type: 'set-monster', instanceId: second, slot: 1, tributeIds: [] }, 'quota-used');
  });
  it('Tribute Sets in defense without emitting a successful Summon event', () => {
    const state = scenario(s => { inHand(s, 'Dark Magician'); put(s, 'Battle Ox'); put(s, 'Mystical Elf', 'a', 1); });
    const instanceId = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Dark Magician'))!;
    const result = step(state, 'a', { type: 'set-monster', instanceId, slot: 0, tributeIds: state.players[0].monsters.filter((v): v is string => v !== null) });
    expect(result.state.cards[instanceId]!.position).toBe('face-down-defense');
    expect(result.events.some(e => e.kind === 'monster-summoned')).toBe(false);
    expect(result.state.cards[instanceId]!.markers.summonedOnTurn).toBeNull();
  });
  it('cannot manually change a monster just Summoned/Set this turn', () => {
    const state = scenario(s => { inHand(s, 'Battle Ox'); });
    const instanceId = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Battle Ox'))!;
    const summoned = settle(step(state, 'a', { type: 'normal-summon', instanceId, slot: 0, tributeIds: [] }).state);
    reject(summoned, 'a', { type: 'change-position', instanceId }, 'invalid-position');
  });
  it('Flip Summons a previously Set normal monster without using the Normal Summon quota', () => {
    const state = scenario(s => { put(s, 'Mystical Elf', 'a', 0, 'face-down-defense'); });
    const instanceId = state.players[0].monsters[0]!;
    const flipped = settle(step(state, 'a', { type: 'flip-summon', instanceId }).state);
    expect(flipped.cards[instanceId]!.position).toBe('face-up-attack');
    expect(flipped.players[0].normalSummonsOrSetsUsed).toBe(0);
    reject(flipped, 'a', { type: 'change-position', instanceId }, 'invalid-position');
  });
});

describe('vanilla Battle/Damage Step', () => {
  it.each([
    ['La Jinn the Mystical Genie of the Lamp', 'Battle Ox', 'face-up-attack', 8000, 7900, 0, 1],
    ['Battle Ox', 'La Jinn the Mystical Genie of the Lamp', 'face-up-attack', 7900, 8000, 1, 0],
    ['Battle Ox', 'Battle Ox', 'face-up-attack', 8000, 8000, 1, 1],
    ['Battle Ox', 'Beaver Warrior', 'face-up-defense', 8000, 8000, 0, 1],
    ['Giant Soldier of Stone', 'Witty Phantom', 'face-up-defense', 8000, 8000, 0, 0],
    ['La Jinn the Mystical Genie of the Lamp', 'Mystical Elf', 'face-up-defense', 7800, 8000, 0, 0],
  ] as const)('%s attacks %s (%s)', (attacker, defender, position, lpA, lpB, graveA, graveB) => {
    const { state } = battle(attacker, defender, position);
    expect(state.players.map(p => p.lifePoints)).toEqual([lpA, lpB]);
    expect(state.players.map(p => p.graveyard.length)).toEqual([graveA, graveB]);
    assertDuelInvariants(state, registry);
  });
  it('handles a direct attack and rejects a second attack from the same monster', () => {
    const result = battle('Battle Ox', null);
    expect(result.state.players[1].lifePoints).toBe(6300);
    reject(result.state, 'a', { type: 'declare-attack', attackerId: result.state.players[0].monsters[0]!, targetId: 'direct' }, 'invalid-position');
    reject(result.state, 'a', { type: 'change-position', instanceId: result.state.players[0].monsters[0]! }, 'illegal-timing');
    const main2 = phase(result.state, 'main2');
    reject(main2, 'a', { type: 'change-position', instanceId: main2.players[0].monsters[0]! }, 'invalid-position');
  });
  it('flips an attacked Set monster, runs all six timings and sends it to the Graveyard only at the end', () => {
    const result = battle('Blue-Eyes White Dragon', 'Giant Soldier of Stone', 'face-down-defense');
    expect(result.events.filter(e => e.kind === 'damage-timing').map(e => e.details.timing)).toEqual(['start', 'before-calculation', 'calculation-1', 'calculation-2', 'after-calculation', 'end']);
    const kinds = result.events.map(e => e.kind);
    expect(kinds.indexOf('monster-flipped')).toBeLessThan(kinds.indexOf('battle-destroyed'));
    expect(kinds.indexOf('battle-destroyed')).toBeLessThan(kinds.indexOf('sent-to-graveyard'));
    expect(result.state.players[1].lifePoints).toBe(8000); // No invented piercing.
  });
  it('destroys both 0 ATK Attack Position monsters under Goat rules (synthetic fixture)', () => {
    const zero = synthetic('zero', { attack: 0 }); const r = createRegistry([...definitions, zero], goat200508Format);
    const result = battle(zero.name, zero.name, 'face-up-attack', r);
    expect(result.state.players.map(p => p.graveyard.length)).toEqual([1, 1]);
    expect(result.state.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
  });
  it('requires a valid opponent monster for an attack while that opponent has monsters', () => {
    const s = scenario(s => {
      s.turn.phase = 'battle'; s.battle = { step: 'battle', attacker: null, target: null, damageTiming: null, ordinaryDamageChainUsed: false, replayPending: false };
      put(s, 'Battle Ox'); put(s, 'Mystical Elf', 'b');
    });
    reject(s, 'a', { type: 'declare-attack', attackerId: s.players[0].monsters[0]!, targetId: 'direct' }, 'invalid-target');
    reject(s, 'a', { type: 'declare-attack', attackerId: s.players[0].monsters[0]!, targetId: s.players[0].monsters[0]! }, 'invalid-target');
  });
});

describe('mandatory discards, ending a duel and rejection safety', () => {
  it('does not advance past required hand-limit choices or accept duplicate discards', () => {
    let state: DuelState = scenario(s => {
      while (s.players[0].hand.length < 8) {
        const instance = s.players[0].deck[0]!;
        const card = s.cards[instance]!; s.players[0].deck.shift(); s.players[0].hand.push(instance); card.location = { kind: 'hand', playerId: 'a' };
      }
    });
    state = phase(state, 'end');
    expect(state.pendingDecision?.min).toBe(2);
    reject(state, 'a', { type: 'request-phase', phase: 'draw' }, 'illegal-timing');
    const decision = state.pendingDecision!;
    reject(state, 'a', { type: 'answer-decision', decisionId: decision.id, optionIds: [decision.optionIds[0], decision.optionIds[0]] }, 'invalid-choice');
    state = settle(step(state, 'a', { type: 'answer-decision', decisionId: decision.id, optionIds: decision.optionIds.slice(0, 2) }).state);
    expect(state.players[0].hand).toHaveLength(6);
    expect(state.players[0].graveyard).toHaveLength(2);
    expect(phase(state, 'draw').turn.activePlayer).toBe('b');
  });
  it('does not lose merely because the Deck is empty, but loses on a required failed draw', () => {
    const state = scenario(s => {
      const p = s.players[1];
      for (const instance of [...p.deck]) { p.deck.shift(); p.graveyard.push(instance); s.cards[instance]!.location = { kind: 'graveyard', playerId: p.id }; s.cards[instance]!.position = 'face-up'; }
    });
    expect(state.result).toBeNull();
    const ended = phase(phase(state, 'end'), 'draw');
    expect(ended.result).toEqual({ winner: 'a', reason: 'failed-draw' });
    reject(ended, 'a', { type: 'pass' }, 'duel-ended');
  });
  it('ends immediately when battle damage reduces LP to 0', () => {
    const s = scenario(s => {
      s.turn.phase = 'battle'; s.battle = { step: 'battle', attacker: null, target: null, damageTiming: null, ordinaryDamageChainUsed: false, replayPending: false };
      put(s, 'Battle Ox'); s.players[1].lifePoints = 500;
    });
    let state = step(s, 'a', { type: 'declare-attack', attackerId: s.players[0].monsters[0]!, targetId: 'direct' }).state;
    state = step(state, 'a', { type: 'pass' }).state;
    const result = step(state, 'b', { type: 'pass' });
    expect(result.state.result).toEqual({ winner: 'a', reason: 'life-points' });
    expect(result.state.players[1].lifePoints).toBe(0);
    expect(result.events.some(e => e.kind === 'damage-timing' && e.details.timing === 'after-calculation')).toBe(false);
  });
  it('lets either participant concede and rejects outsiders', () => {
    expect(step(start(), 'b', { type: 'concede' }).state.result).toEqual({ winner: 'a', reason: 'concession' });
    reject(start(), 'spectator', { type: 'concede' }, 'invalid-player');
  });
  it('rejects injected result fields, unsupported effect activation and invalid slots without state changes', () => {
    const s = scenario(() => {});
    reject(s, 'a', { type: 'concede', winner: 'a' }, 'invalid-action');
    reject(s, 'a', { type: 'activate', effectId: 'fake' }, 'invalid-action');
    reject(s, 'a', { type: 'normal-summon', instanceId: s.players[0].hand[0], slot: 5, tributeIds: [] }, 'invalid-action');
    const result = applyAction(registry, s, { actorId: 'a', expectedStateVersion: s.stateVersion + 1, action: { type: 'concede' } });
    expect(result.accepted).toBe(false);
    if (!result.accepted) expect(result.code).toBe('stale-state');
    expect(result.state).toBe(s);
  });
  it('detects lost or duplicated card instances in a corrupt server snapshot', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.players[0].hand.push(s.players[0].hand[0]!);
    expect(() => assertDuelInvariants(s, registry)).toThrow('duplicate');
  });
});

describe('complete duel through public engine actions', () => {
  it.each(['12', '34'])('finishes a real 40-card vanilla duel for server test seed %s', async seed => {
    const { runVanillaSmoke } = await import('./smoke.js');
    const { state, report } = runVanillaSmoke(registry, seed.repeat(32));
    expect(state.result).not.toBeNull();
    expect(state.players.every(p => p.lifePoints >= 0)).toBe(true);
    expect(report.summons).toBeGreaterThan(0);
    expect(report.attacks).toBeGreaterThan(0);
    expect(report.battleDamageEvents).toBeGreaterThan(0);
    expect(['life-points', 'failed-draw']).toContain(state.result?.reason);
    expect(report.turns).toBeLessThanOrEqual(100);
    assertDuelInvariants(state, registry);
  });
});

describe('turn and placement edge cases', () => {
  it('rejects a low-level Summon into an occupied zone and an opponent action', () => {
    const state = scenario(s => { put(s, 'Battle Ox'); inHand(s, 'Celtic Guardian'); });
    const instanceId = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Celtic Guardian'))!;
    reject(state, 'a', { type: 'normal-summon', instanceId, slot: 0, tributeIds: [] }, 'occupied-zone');
    reject(state, 'b', { type: 'normal-summon', instanceId, slot: 1, tributeIds: [] }, 'not-your-action');
  });
  it('does not Flip Summon a monster in the turn it was Set', () => {
    const state = scenario(s => { inHand(s, 'Battle Ox'); });
    const instanceId = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Battle Ox'))!;
    const set = settle(step(state, 'a', { type: 'set-monster', instanceId, slot: 0, tributeIds: [] }).state);
    reject(set, 'a', { type: 'flip-summon', instanceId }, 'invalid-position');
  });
  it('allows a newly Normal Summoned monster to attack that turn once response windows close', () => {
    const state = scenario(s => { inHand(s, 'Battle Ox'); });
    const instanceId = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Battle Ox'))!;
    const summoned = step(state, 'a', { type: 'normal-summon', instanceId, slot: 0, tributeIds: [] }).state;
    reject(summoned, 'a', { type: 'request-phase', phase: 'battle' }, 'illegal-timing');
    const battle = phase(settle(summoned), 'battle');
    const damaged = settle(step(battle, 'a', { type: 'declare-attack', attackerId: instanceId, targetId: 'direct' }).state);
    expect(damaged.players[1].lifePoints).toBe(6300);
  });
  it('restores the Normal Summon quota on the next own turn', () => {
    let state: DuelState = scenario(s => { inHand(s, 'Battle Ox'); });
    const instanceId = state.players[0].hand.find(instance => state.cards[instance]!.definition.id === id('Battle Ox'))!;
    state = settle(step(state, 'a', { type: 'normal-summon', instanceId, slot: 0, tributeIds: [] }).state);
    expect(state.players[0].normalSummonsOrSetsUsed).toBe(1);
    state = phase(phase(state, 'end'), 'draw');
    state = phase(phase(state, 'standby'), 'main1');
    state = phase(phase(state, 'end'), 'draw');
    state = phase(phase(state, 'standby'), 'main1');
    expect(state.turn.activePlayer).toBe('a');
    expect(state.players[0].normalSummonsOrSetsUsed).toBe(0);
  });
});
