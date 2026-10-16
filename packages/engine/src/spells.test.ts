import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { CardBatchSchema, CardSchema } from '../../card-data/src/schema.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Slot } from '../../protocol/src/duel.js';
import { createRegistry } from './registry.js';
import { createDuel, applyAction, assertDuelInvariants } from './duel.js';
import type { EngineAction } from './actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const defs = CardBatchSchema.parse(JSON.parse(readFileSync(new URL('../../../data/generated/pilot.json', import.meta.url), 'utf8')).cards);
const sample = defs.find(c => c.kind === 'spell')!;
const custom = (id: string) => CardSchema.parse({ ...sample, id: `custom:${id}`, origin: 'custom', passcode: undefined,
  name: `Synthetic test ${id}`, text: 'Synthetic engine fixture; not an official card.', textBasis: 'custom', verification: 'verified',
  legality: { ...sample.legality, maxCopies: 3 }, effects: [] });
const drawSpell = custom('draw'), destroySpell = custom('destroy');
const bindings = { [drawSpell.id]: { handler: 'draw' as const, count: 2 }, [destroySpell.id]: { handler: 'destroy-lowest-opposing-face-up-attack' as const } };
const registry = createRegistry([...defs, drawSpell, destroySpell], goat200508Format, bindings);
const normalIds = Object.values(registry.cards).filter(c => c.kind === 'normal-monster').map(c => c.id);
const deck = [drawSpell.id, destroySpell.id, ...normalIds, ...normalIds, ...normalIds].slice(0, 40);
function setup(kind = drawSpell.id) {
  const state = structuredClone(createDuel(registry, { duelId: 'spells', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '34'.repeat(32) }).state) as Mutable<DuelState>;
  state.turn.phase = 'main1'; state.timing.window = 'open'; state.timing.priorityPlayer = 'a'; state.timing.consecutivePasses = 0;
  const spell = Object.values(state.cards).find(c => c.ownerId === 'a' && c.definition.id === kind)!;
  if (spell.location.kind === 'deck') {
    state.players[0].deck.splice(state.players[0].deck.indexOf(spell.id), 1); state.players[0].hand.push(spell.id); spell.location = { kind: 'hand', playerId: 'a' };
  }
  assertDuelInvariants(state, registry);
  return { state, id: spell.id };
}
function act(state: DuelState, actorId: string, action: EngineAction) {
  return applyAction(registry, state, { actorId, action, expectedStateVersion: state.stateVersion });
}
function step(state: DuelState, actorId: string, action: EngineAction) {
  const result = act(state, actorId, action);
  if (!result.accepted) throw new Error(result.message);
  return result.state;
}
function resolve(state: DuelState) { return step(step(state, 'b', { type: 'pass' }), 'a', { type: 'pass' }); }
function put(state: Mutable<DuelState>, slot: Slot, definitionId = normalIds[0]!) {
  const p = state.players[1];
  const card = Object.values(state.cards).find(c => c.ownerId === 'b' && c.definition.id === definitionId && ['hand', 'deck'].includes(c.location.kind))!;
  const list = card.location.kind === 'hand' ? p.hand : p.deck;
  list.splice(list.indexOf(card.id), 1); p.monsters[slot] = card.id;
  card.location = { kind: 'monster', playerId: 'b', slot }; card.position = 'face-up-attack'; return card.id;
}
describe('Experimental Normal Spell integration using synthetic custom fixtures', () => {
  it('keeps official spells blocked, even with supplied bindings', () => {
    const pot = defs.find(c => c.id === 'official:55144522')!;
    expect(createRegistry(defs, goat200508Format, { [pot.id]: bindings[drawSpell.id]! }).cards[pot.id]).toBeUndefined();
  });
  it('pins handler parameters in registry hash', () => {
    expect(createRegistry([...defs, drawSpell, destroySpell], goat200508Format, { ...bindings, [drawSpell.id]: { handler: 'draw', count: 1 } }).revision).not.toBe(registry.revision);
  });
  it('waits for both passes, draws two and cleans up without spending summon quota', () => {
    const { state, id } = setup(); const before = state.players[0].hand.length;
    const activated = step(state, 'a', { type: 'activate-spell', instanceId: id, slot: 0 });
    expect(activated.chain).toHaveLength(1); expect(activated.chain[0]!.targetRefs).toEqual([]);
    expect(activated.timing.priorityPlayer).toBe('b'); expect(activated.players[0].hand).toHaveLength(before - 1);
    const done = resolve(activated);
    expect(done.players[0].hand).toHaveLength(before + 1); expect(done.players[0].graveyard).toContain(id);
    expect(done.players[0].spellsTraps[0]).toBeNull(); expect(done.chain).toEqual([]);
    expect(done.players[0].normalSummonsOrSetsUsed).toBe(0); expect(state.players[0].hand).toContain(id);
  });
  it('can activate a Normal Spell set earlier in the same turn after response passes', () => {
    const { state, id } = setup();
    let s = step(state, 'a', { type: 'set-spell', instanceId: id, slot: 2 });
    s = step(step(s, 'a', { type: 'pass' }), 'b', { type: 'pass' });
    s = resolve(step(s, 'a', { type: 'activate-spell', instanceId: id, slot: 2 }));
    expect(s.players[0].graveyard).toContain(id);
  });
  it('rejects responding with another speed-1 spell and preserves the exact snapshot', () => {
    const { state, id } = setup(); const s = step(state, 'a', { type: 'activate-spell', instanceId: id, slot: 0 });
    const rejected = act(s, 'a', { type: 'activate-spell', instanceId: id, slot: 1 });
    expect(rejected.accepted).toBe(false); expect(rejected.state).toBe(s);
  });
  it('rejects activation without eligible monsters atomically', () => {
    const { state, id } = setup(destroySpell.id);
    const result = act(state, 'a', { type: 'activate-spell', instanceId: id, slot: 0 });
    expect(result.accepted).toBe(false); expect(result.state).toBe(state);
  });
  it('destroys the one eligible monster and clears its zone', () => {
    const { state, id } = setup(destroySpell.id); const victim = put(state, 0);
    const done = resolve(step(state, 'a', { type: 'activate-spell', instanceId: id, slot: 0 }));
    expect(done.players[1].monsters[0]).toBeNull(); expect(done.players[1].graveyard).toContain(victim);
  });
  it('pauses a tie decision inside resolution, checks actor/choice, then cleans up', () => {
    const { state, id } = setup(destroySpell.id); put(state, 0); const victim = put(state, 1);
    const waiting = resolve(step(state, 'a', { type: 'activate-spell', instanceId: id, slot: 0 }));
    expect(waiting.timing.window).toBe('resolving'); expect(waiting.chain).toHaveLength(1);
    const decision = waiting.pendingDecision!;
    for (const [actor, options] of [['b', [victim]], ['a', [id]], ['a', [victim, victim]]] as const) {
      const result = act(waiting, actor, { type: 'answer-decision', decisionId: decision.id, optionIds: [...options] });
      expect(result.accepted).toBe(false); expect(result.state).toBe(waiting);
    }
    const done = step(waiting, 'a', { type: 'answer-decision', decisionId: decision.id, optionIds: [victim] });
    expect(done.chain).toHaveLength(0); expect(done.pendingDecision).toBeNull(); expect(done.players[1].graveyard).toContain(victim);
  });
  it.each([0, 1])('permits required-draw activation with %i cards left and loses on failed draw', remaining => {
    const { state, id } = setup(); const p = state.players[0];
    while (p.deck.length > remaining) { const moved = p.deck.pop()!; p.graveyard.push(moved); state.cards[moved]!.location = { kind: 'graveyard', playerId: 'a' }; }
    const done = resolve(step(state, 'a', { type: 'activate-spell', instanceId: id, slot: 0 }));
    expect(done.result).toEqual({ winner: 'b', reason: 'failed-draw' }); expect(done.chain).toHaveLength(0);
  });
  it('rejects a spell as a summon without spending quota', () => {
    const { state, id } = setup(); const result = act(state, 'a', { type: 'normal-summon', instanceId: id, slot: 0, tributeIds: [] });
    expect(result.accepted).toBe(false); expect(result.state).toBe(state);
  });
  it('allows concession during Chain response and while choosing at resolution', () => {
    const first = setup();
    const active = step(first.state, 'a', { type: 'activate-spell', instanceId: first.id, slot: 0 });
    expect(step(active, 'b', { type: 'concede' }).result).toEqual({ winner: 'a', reason: 'concession' });
    const second = setup(destroySpell.id); put(second.state, 0); put(second.state, 1);
    const waiting = resolve(step(second.state, 'a', { type: 'activate-spell', instanceId: second.id, slot: 0 }));
    const done = step(waiting, 'a', { type: 'concede' });
    expect(done.pendingDecision).toBeNull(); expect(done.chain).toHaveLength(0);
  });
  it('rejects wrong actor, occupied slot and stale version atomically', () => {
    const { state, id } = setup();
    const otherCard = Object.values(state.cards).find(c => c.ownerId === 'a' && c.definition.id === destroySpell.id)!;
    if (otherCard.location.kind === 'deck') {
      state.players[0].deck.splice(state.players[0].deck.indexOf(otherCard.id), 1); state.players[0].hand.push(otherCard.id); otherCard.location = { kind: 'hand', playerId: 'a' };
    }
    const wrong = act(state, 'b', { type: 'activate-spell', instanceId: id, slot: 0 });
    expect(wrong.accepted).toBe(false); expect(wrong.state).toBe(state);
    let set = step(state, 'a', { type: 'set-spell', instanceId: id, slot: 0 });
    set = step(step(set, 'a', { type: 'pass' }), 'b', { type: 'pass' });
    const otherId = set.players[0].hand.find(i => set.cards[i]!.definition.id === destroySpell.id);
    // An occupied destination is rejected before any card movement.
    expect(otherId).toBeDefined();
    {
      const occupied = act(set, 'a', { type: 'set-spell', instanceId: otherId!, slot: 0 });
      expect(occupied.accepted).toBe(false); expect(occupied.state).toBe(set);
    }
    const stale = applyAction(registry, set, { actorId: 'a', expectedStateVersion: 0, action: { type: 'activate-spell', instanceId: id, slot: 0 } });
    expect(stale.accepted).toBe(false); expect(stale.state).toBe(set);
  });

});
