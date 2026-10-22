import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { applyAction, assertDuelInvariants, createDuel } from '../packages/engine/src/duel.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog();
function fixture(actor: string) {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'graveyard-interactions', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: 'a7'.repeat(32) }).state) as Mutable<DuelState>;
  // Trusted scenario setup only. Every subsequent change goes through applyAction.
  for (const p of state.players) for (const id of p.hand.splice(0)) {
    p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id };
  }
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  const other = actor === 'a' ? 'b' : 'a';
  function move(name: string, owner = actor, zone: 'hand' | 'graveyard' | 'monster' | 'spell-trap' = 'hand') {
    const definition = Object.values(registry.cards).find(c => c.name === name)!;
    const card = Object.values(state.cards).find(c => c.ownerId === owner && c.definition.id === definition.id)!;
    const p = state.players.find(p => p.id === owner)!;
    p.deck.splice(p.deck.indexOf(card.id), 1);
    if (zone === 'monster' || zone === 'spell-trap') {
      (zone === 'monster' ? p.monsters : p.spellsTraps)[0] = card.id;
      card.location = { kind: zone, playerId: owner, slot: 0 };
      card.position = zone === 'monster' ? 'face-down-defense' : 'face-down'; card.markers.setOnTurn = state.turn.number - 1;
    } else { p[zone].push(card.id); card.location = { kind: zone, playerId: owner }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; }
    return card.id;
  }
  return { state, other, move };
}
function step(state: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(state), result = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(state).toEqual(before);
  if (!result.accepted) throw Error(result.message);
  assertDuelInvariants(result.state, registry); return result.state;
}
function reject(state: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(state), result = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(result.accepted).toBe(false); expect(result.state).toBe(state); expect(state).toEqual(before);
}
function settle(state: DuelState) {
  for (let n = 0; state.timing.window !== 'open'; n++) {
    if (n > 12 || state.pendingDecision) throw Error('Unexpected unresolved decision/window');
    state = step(state, state.timing.priorityPlayer!, { type: 'pass' });
  }
  return state;
}
function phase(state: DuelState, next: 'end' | 'draw' | 'standby' | 'main1') {
  return settle(step(state, state.turn.activePlayer, { type: 'request-phase', phase: next }));
}
const spell = (instanceId: string, discardId: string, targetId: string): EngineAction => ({ type: 'activate-spell', instanceId, slot: 0, discardId, targetId });
describe.each(['a', 'b'])('Graveyard cross-effect audit, controller %s', actor => {
  it('recovery does not open Trap Hole timing; a later Normal Summon does', () => {
    const f = fixture(actor), source = f.move('Monster Reincarnation'), cost = f.move('Hinotama'), target = f.move('Battle Ox', actor, 'graveyard'), trap = f.move('Trap Hole', f.other, 'spell-trap');
    assertDuelInvariants(f.state, registry);
    let s = step(f.state, actor, spell(source, cost, target));
    reject(s, f.other, { type: 'activate-trap', instanceId: trap, targetId: target });
    s = settle(s); reject(s, f.other, { type: 'activate-trap', instanceId: trap, targetId: target });
    s = step(s, actor, { type: 'normal-summon', instanceId: target, slot: 0, tributeIds: [] });
    reject(s, f.other, { type: 'activate-trap', instanceId: trap, targetId: target });
    s = step(s, actor, { type: 'pass' });
    s = settle(step(s, f.other, { type: 'activate-trap', instanceId: trap, targetId: target }));
    const p = s.players.find(p => p.id === actor)!;
    expect(p.graveyard.filter(id => id === target)).toHaveLength(1); expect(p.hand).not.toContain(target); expect(p.monsters[0]).toBeNull();
    expect(s.players.find(p => p.id === f.other)!.graveyard).toContain(trap); expect(p.normalSummonsOrSetsUsed).toBe(1);
  });
  it.each(['Man-Eater Bug', 'Hane-Hane'])('destroying face-down %s, recovering and Setting it defers FLIP until a later legal Flip Summon', name => {
    const f = fixture(actor), source = f.move('Monster Reincarnation'), tribute = f.move('Tribute to The Doomed'), cost1 = f.move('Hinotama'), cost2 = f.move('Dian Keto the Cure Master');
    const flip = f.move(name, actor, 'monster'), victim = f.move('Battle Ox', f.other, 'monster');
    assertDuelInvariants(f.state, registry);
    let s = settle(step(f.state, actor, spell(tribute, cost1, flip)));
    expect(s.cards[flip]!.location.kind).toBe('graveyard'); expect(s.cards[victim]!.location.kind).toBe('monster');
    expect(s.pendingTriggers).toEqual([]); expect(s.pendingDecision).toBeNull();
    s = settle(step(s, actor, spell(source, cost2, flip)));
    s = settle(step(s, actor, { type: 'set-monster', instanceId: flip, slot: 0, tributeIds: [] }));
    reject(s, actor, { type: 'flip-summon', instanceId: flip });
    // Advance the intervening opponent turn through actual phase actions, without editing markers.
    s = phase(phase(s, 'end'), 'draw'); s = phase(phase(s, 'standby'), 'main1');
    s = phase(phase(s, 'end'), 'draw'); s = phase(phase(s, 'standby'), 'main1');
    expect(s.turn.activePlayer).toBe(actor);
    s = step(s, actor, { type: 'flip-summon', instanceId: flip });
    const decision = s.pendingDecision!; expect(decision.optionIds).toContain(victim);
    s = settle(step(s, actor, { type: 'answer-decision', decisionId: decision.id, optionIds: [victim] }));
    expect(s.cards[victim]!.location).toEqual({ kind: name === 'Man-Eater Bug' ? 'graveyard' : 'hand', playerId: f.other });
    expect(s.cards[flip]!.location.kind).toBe('monster'); expect(s.pendingTriggers).toEqual([]); expect(s.chain).toEqual([]);
  });
  it.each(['Man-Eater Bug', 'Hane-Hane'])('recovered %s may pay Tribute cost without activating FLIP or consuming a summon', name => {
    const f = fixture(actor), source = f.move('Monster Reincarnation'), tribute = f.move('Tribute to The Doomed'), cost = f.move('Hinotama');
    const flip = f.move(name, actor, 'graveyard'), victim = f.move('Battle Ox', f.other, 'monster');
    assertDuelInvariants(f.state, registry);
    let s = settle(step(f.state, actor, spell(source, cost, flip)));
    s = step(s, actor, spell(tribute, flip, victim));
    expect(s.cards[flip]!.location.kind).toBe('graveyard'); expect(s.cards[victim]!.location.kind).toBe('monster');
    expect(s.pendingTriggers).toEqual([]); expect(s.pendingDecision).toBeNull();
    s = settle(s);
    expect(s.cards[victim]!.location.kind).toBe('graveyard'); expect(s.players.find(p => p.id === actor)!.graveyard.filter(id => id === flip)).toHaveLength(1);
    expect(s.players.find(p => p.id === actor)!.normalSummonsOrSetsUsed).toBe(0); expect(s.pendingTriggers).toEqual([]); expect(s.pendingDecision).toBeNull();
  });
});
