import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { defaultDeck } from './deck-store.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { EngineEvent } from '../packages/engine/src/duel.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog();
const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const imported = load('../data/generated/lp-spells.json');
const reviews = load('../data/reviews/life-point-spells.effects.json');
const burn = 'official:46130346', heal = 'official:84257639';
function setup(id: string, actor = 'a') {
  const deck = [burn, heal, ...defaultDeck(registry)].slice(0, 40);
  const state = structuredClone(createDuel(registry, { duelId: 'lp-spells', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '43'.repeat(32) }).state) as Mutable<DuelState>;
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  const player = state.players.find(p => p.id === actor)!;
  const card = Object.values(state.cards).find(c => c.ownerId === actor && c.definition.id === id)!;
  if (card.location.kind === 'deck') {
    player.deck.splice(player.deck.indexOf(card.id), 1); player.hand.push(card.id); card.location = { kind: 'hand', playerId: actor };
  }
  return { state, instanceId: card.id };
}
function step(s: DuelState, actor: string, action: EngineAction) {
  const result = applyAction(registry, s, { actorId: actor, expectedStateVersion: s.stateVersion, action });
  if (!result.accepted) throw new Error(result.message);
  assertDuelInvariants(result.state, registry); return result;
}
function settle(s: DuelState) {
  for (let n = 0; !s.result && s.timing.window !== 'open'; n++) {
    if (n > 8) throw new Error('Spell did not settle');
    s = step(s, s.timing.priorityPlayer!, { type: 'pass' }).state;
  }
  return s;
}
describe('Reviewed life-point Normal Spells', () => {
  it('keeps imported effects pending and requires a matching semantic review', () => {
    expect(imported.summary).toMatchObject({ imported: 2, verifiedData: 0, historicalReviewPending: 2, implemented: 0, testedEffects: 0 });
    expect(createRegistry(imported.cards, goat200508Format).unsupportedIds).toHaveLength(2);
    expect(registry.spellHandlers[burn]).toEqual({ handler: 'inflict-damage', amount: 500 });
    expect(registry.spellHandlers[heal]).toEqual({ handler: 'gain-life-points', amount: 1000 });
  });
  it.each(['text', 'revision', 'legality'])('rejects stale whole-definition review after %s drift', field => {
    const cards = structuredClone(imported.cards);
    if (field === 'text') cards[0].text += ' changed';
    if (field === 'revision') cards[0].revision++;
    if (field === 'legality') cards[0].legality.maxCopies = 1;
    expect(() => createRegistry(cards, goat200508Format, {}, reviews)).toThrow('review conflict');
  });
  it('rejects the old semantic scope and custom overrides for reviewed official cards', () => {
    const changed = structuredClone(reviews); changed[0].scope = 'normal-spell-single-link-vanilla-v1';
    expect(() => createRegistry(imported.cards, goat200508Format, {}, changed)).toThrow('reviewed scope');
    expect(() => createRegistry(imported.cards, goat200508Format, { [burn]: { handler: 'inflict-damage', amount: 999 } }, reviews)).toThrow('overridden');
  });
  it.each([burn, heal].flatMap(id => ['a', 'b'].flatMap(actor => [false, true].map(fromSet => ({ id, actor, fromSet })))))('$id resolves for $actor fromSet=$fromSet after two responses, with no target or cost', ({ id, actor, fromSet }) => {
    const { state, instanceId } = setup(id, actor); let s: DuelState = state;
    if (fromSet) s = settle(step(s, actor, { type: 'set-spell', instanceId, slot: 0 }).state);
    const before = structuredClone(s);
    const activated = step(s, actor, { type: 'activate-spell', instanceId, slot: 0 }).state;
    expect(s).toEqual(before); expect(activated.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
    expect(activated.chain[0]!.targetRefs).toEqual([]); expect(activated.chain[0]!.costEvents).toEqual([]); expect(activated.pendingDecision).toBeNull();
    const opponent = actor === 'a' ? 'b' : 'a';
    const first = step(activated, opponent, { type: 'pass' }).state;
    expect(first.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
    const resolved = step(first, actor, { type: 'pass' });
    const recipient = id === burn ? opponent : actor;
    expect(resolved.state.players.find(p => p.id === recipient)!.lifePoints).toBe(id === burn ? 7500 : 9000);
    expect(resolved.state.players.find(p => p.id !== recipient)!.lifePoints).toBe(8000);
    expect(publicResolution(resolved.events, resolved.state)).toEqual([{ kind: id === burn ? 'effect-damage' : 'life-points-gained', playerId: recipient, amount: id === burn ? 500 : 1000 }]);
    const caster = resolved.state.players.find(p => p.id === actor)!;
    expect(caster.graveyard).toContain(instanceId); expect(caster.spellsTraps[0]).toBeNull(); expect(resolved.state.chain).toEqual([]);
    expect(resolved.events.some(e => e.kind === 'battle-damage')).toBe(false);
  });
  it.each([501, 500, 300, 1])('Hinotama resolves at opposing LP %i, clamps to zero and ends immediately when lethal', lp => {
    const { state, instanceId } = setup(burn); state.players[1].lifePoints = lp;
    const done = settle(step(state, 'a', { type: 'activate-spell', instanceId, slot: 0 }).state);
    expect(done.players[1].lifePoints).toBe(Math.max(0, lp - 500));
    expect(done.result).toEqual(lp <= 500 ? { winner: 'a', reason: 'life-points' } : null);
    expect(done.chain).toEqual([]); expect(done.players[0].graveyard).toContain(instanceId);
    if (done.result) expect(applyAction(registry, done, { actorId: 'a', expectedStateVersion: done.stateVersion, action: { type: 'pass' } })).toMatchObject({ accepted: false, state: done, code: 'duel-ended' });
  });
  it.each([1, 8000, 15000])('Dian Keto adds exactly 1000 to %i LP without an 8000 cap', lp => {
    const { state, instanceId } = setup(heal); state.players[0].lifePoints = lp;
    const done = settle(step(state, 'a', { type: 'activate-spell', instanceId, slot: 0 }).state);
    expect(done.players[0].lifePoints).toBe(lp + 1000); expect(done.players[1].lifePoints).toBe(8000); expect(done.result).toBeNull();
  });
  it.each([burn, heal])('allows $0 with an empty deck and field, without causing a draw', id => {
    const { state, instanceId } = setup(id), p = state.players[0];
    for (const cardId of p.deck.splice(0)) { p.graveyard.push(cardId); state.cards[cardId]!.location = { kind: 'graveyard', playerId: 'a' }; }
    const done = settle(step(state, 'a', { type: 'activate-spell', instanceId, slot: 0 }).state);
    expect(done.result).toBeNull(); expect(done.players[0].deck).toHaveLength(0); expect(done.players[0].hand).toHaveLength(p.hand.length - 1);
  });
  it.each(['draw', 'standby', 'battle', 'end'] as const)('rejects activation in %s without mutation', phase => {
    const { state, instanceId } = setup(burn); state.turn.phase = phase;
    const result = applyAction(registry, state, { actorId: 'a', expectedStateVersion: state.stateVersion, action: { type: 'activate-spell', instanceId, slot: 0 } });
    expect(result.accepted).toBe(false); expect(result.state).toBe(state);
  });
  it('rejects wrong player, a second mixed link, and client-supplied damage', () => {
    const { state, instanceId } = setup(burn);
    const second = Object.values(state.cards).find(c => c.ownerId === 'a' && c.definition.id === heal)!;
    if (second.location.kind === 'deck') {
      const p = state.players[0]; p.deck.splice(p.deck.indexOf(second.id), 1); p.hand.push(second.id); second.location = { kind: 'hand', playerId: 'a' };
    }
    expect(applyAction(registry, state, { actorId: 'b', expectedStateVersion: state.stateVersion, action: { type: 'activate-spell', instanceId, slot: 0 } }).accepted).toBe(false);
    const forged = { type: 'activate-spell', instanceId, slot: 0, amount: 99999 } as unknown as EngineAction;
    expect(applyAction(registry, state, { actorId: 'a', expectedStateVersion: state.stateVersion, action: forged })).toMatchObject({ accepted: false, state });
    const active = step(state, 'a', { type: 'activate-spell', instanceId, slot: 0 }).state;
    const rejected = applyAction(registry, active, { actorId: 'a', expectedStateVersion: active.stateVersion, action: { type: 'activate-spell', instanceId: second.id, slot: 1 } });
    expect(rejected.accepted).toBe(false); expect(rejected.state).toBe(active);
  });
  it('projects only public LP amounts and recipients, omitting private event content and malformed facts', () => {
    const { state } = setup(burn);
    const event = (kind: string, playerId: string, amount: number): EngineEvent => ({ kind, sequence: 1, simultaneousGroup: 'secret-group', affectedInstances: ['secret-card'], details: { playerId, amount, source: 'secret-source' } });
    const facts = publicResolution([
      event('effect-damage', 'b', 500), event('life-points-gained', 'a', 1000),
      event('effect-damage', 'unknown', 500), ...[0, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(n => event('life-points-gained', 'a', n)),
    ], state);
    expect(facts).toEqual([{ kind: 'effect-damage', playerId: 'b', amount: 500 }, { kind: 'life-points-gained', playerId: 'a', amount: 1000 }]);
    expect(JSON.stringify(facts)).not.toContain('secret');
  });
});
