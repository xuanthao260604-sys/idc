import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CardBatchSchema } from '../../card-data/src/schema.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
import { createRegistry } from './registry.js';
import { createDuel, applyAction, assertDuelInvariants } from './duel.js';
import type { DuelState, Slot } from '../../protocol/src/duel.js';
import type { EngineAction } from './actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const cards = CardBatchSchema.parse(load('../../../data/generated/pilot.json').cards);
const spellReviews = load('../../../data/reviews/pilot.spell-effects.json');
const flipReviews = load('../../../data/reviews/pilot.flip-effects.json');
const r = createRegistry(cards, goat200508Format, {}, spellReviews, flipReviews);
const bug = 'official:54652250', hane = 'official:07089711';
const ox = 'official:05053103', elf = 'official:15025844';
const normals = Object.values(r.cards).filter(c => c.kind === 'normal-monster').map(c => c.id);
const deck = [bug, hane, ...normals, ...normals, ...normals].slice(0, 40);
function start() {
  const s = structuredClone(createDuel(r, { duelId: 'flip', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '45'.repeat(32) }).state) as Mutable<DuelState>;
  s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0; s.timing.priorityPlayer = 'a'; return s;
}
function put(s: Mutable<DuelState>, defId: string, player: 'a' | 'b' = 'a', slot: Slot = 0, down = false) {
  const p = s.players.find(p => p.id === player)!;
  const card = Object.values(s.cards).find(c => c.ownerId === player && c.definition.id === defId && ['hand', 'deck'].includes(c.location.kind))!;
  const list = card.location.kind === 'hand' ? p.hand : p.deck; list.splice(list.indexOf(card.id), 1);
  p.monsters[slot] = card.id; card.location = { kind: 'monster', playerId: player, slot }; card.position = down ? 'face-down-defense' : 'face-up-attack'; return card.id;
}
function run(s: DuelState, actor: string, action: EngineAction) {
  const result = applyAction(r, s, { actorId: actor, expectedStateVersion: s.stateVersion, action });
  if (!result.accepted) throw new Error(result.message); return result;
}
function settle(s: DuelState) {
  for (let n = 0; !s.result && !s.pendingDecision && s.timing.window !== 'open'; n++) {
    if (n > 4) throw new Error('Unclosed response'); s = run(s, s.timing.priorityPlayer!, { type: 'pass' }).state;
  }
  return s;
}
function choose(s: DuelState, target: string) {
  const d = s.pendingDecision!;
  return run(s, d.playerId, { type: 'answer-decision', decisionId: d.id, optionIds: [target] }).state;
}
function attack(s: Mutable<DuelState>, attacker: string, target: string) {
  s.turn.phase = 'battle'; s.battle = { step: 'battle', attacker: null, target: null, damageTiming: null, ordinaryDamageChainUsed: false, replayPending: false };
  return settle(run(s, 'a', { type: 'declare-attack', attackerId: attacker, targetId: target }).state);
}
describe('Reviewed mandatory FLIP effects, pass-only single-link scope', () => {
  it('opens 19 definitions and keeps Trap Hole blocked', () => {
    expect(Object.keys(r.cards)).toHaveLength(19); expect(r.unsupportedIds).toEqual(['official:04206964']);
    expect(createRegistry(cards, goat200508Format, {}, spellReviews).cards[bug]).toBeUndefined();
  });
  it('rejects review drift, duplicate review and wrong format', () => {
    const changed = structuredClone(cards); changed.find(c => c.id === bug)!.text += 'changed';
    expect(() => createRegistry(changed, goat200508Format, {}, spellReviews, flipReviews)).toThrow('FLIP review conflict');
    expect(() => createRegistry(cards, goat200508Format, {}, spellReviews, [...flipReviews, flipReviews[0]])).toThrow();
    const stale = structuredClone(flipReviews); stale[0].format.revision++;
    expect(() => createRegistry(cards, goat200508Format, {}, spellReviews, stale)).toThrow();
  });
  it.each([bug, hane])('Flip Summon %s requires a target and can choose itself', defId => {
    const s = start(), id = put(s, defId, 'a', 0, true);
    const waiting = run(s, 'a', { type: 'flip-summon', instanceId: id }).state;
    expect(waiting.pendingDecision?.optionIds).toEqual([id]);
    const linked = choose(waiting, id); expect(linked.chain[0]!.targetRefs[0]!.instanceId).toBe(id);
    const done = settle(linked);
    expect(done.players[0].monsters[0]).toBeNull();
    expect(defId === bug ? done.players[0].graveyard : done.players[0].hand).toContain(id);
    expect(done.players[0].normalSummonsOrSetsUsed).toBe(0);
  });
  it.each([bug, hane])('battle flips %s after calculation even when destroyed, excluding battle-destroyed source', defId => {
    const s = start(), attacker = put(s, ox), defender = put(s, defId, 'b', 0, true);
    const waiting = attack(s, attacker, defender);
    expect(waiting.battle?.damageTiming).toBe('after-calculation');
    expect(waiting.cards[defender]!.markers.wasBattleDestroyed).toBe(true);
    expect(waiting.pendingDecision?.playerId).toBe('b'); expect(waiting.pendingDecision?.optionIds).toEqual([attacker]);
    expect(waiting.players[1].graveyard).not.toContain(defender);
    const linked = choose(waiting, attacker); expect(linked.timing.priorityPlayer).toBe('a');
    const done = settle(linked);
    expect(defId === bug ? done.players[0].graveyard : done.players[0].hand).toContain(attacker);
    expect(done.players[1].graveyard).toContain(defender); expect(done.battle?.step).toBe('battle');
    assertDuelInvariants(done, r);
  });
  it('permits targeting a face-down monster on either side without flipping it', () => {
    const s = start(), source = put(s, bug, 'a', 0, true), target = put(s, elf, 'b', 0, true);
    const done = settle(choose(run(s, 'a', { type: 'flip-summon', instanceId: source }).state, target));
    expect(done.players[1].graveyard).toContain(target); expect(done.players[0].monsters[0]).toBe(source);
  });
  it('returns Hane-Hane target to its owner and clears field markers', () => {
    const s = start(), source = put(s, hane, 'a', 0, true), target = put(s, ox, 'b');
    s.cards[target]!.markers.summonedOnTurn = 2; s.cards[target]!.counters = { test: 1 };
    const done = settle(choose(run(s, 'a', { type: 'flip-summon', instanceId: source }).state, target));
    expect(done.players[1].hand).toContain(target); expect(done.cards[target]!.markers.summonedOnTurn).toBeNull(); expect(done.cards[target]!.counters).toEqual({});
  });
  it('does not trigger on Normal Summon or Set', () => {
    for (const type of ['normal-summon', 'set-monster'] as const) {
      const s = start(); const card = Object.values(s.cards).find(c => c.ownerId === 'a' && c.definition.id === bug)!;
      if (card.location.kind === 'deck') { s.players[0].deck.splice(s.players[0].deck.indexOf(card.id), 1); s.players[0].hand.push(card.id); card.location = { kind: 'hand', playerId: 'a' }; }
      const done = run(s, 'a', { type, instanceId: card.id, slot: 0, tributeIds: [] }).state;
      expect(done.pendingTriggers).toHaveLength(0); expect(done.chain).toHaveLength(0); expect(done.pendingDecision).toBeNull();
    }
  });
  it('rejects wrong actor, wrong/stale decision and passing before mandatory target atomically', () => {
    const s = start(), source = put(s, bug, 'a', 0, true);
    const waiting = run(s, 'a', { type: 'flip-summon', instanceId: source }).state, d = waiting.pendingDecision!;
    for (const [actor, action] of [ ['b', { type: 'answer-decision', decisionId: d.id, optionIds: [source] }], ['a', { type: 'answer-decision', decisionId: 'old', optionIds: [source] }], ['a', { type: 'pass' }], ['a', { type: 'request-phase', phase: 'end' }] ] as const) {
      const result = applyAction(r, waiting, { actorId: actor, expectedStateVersion: waiting.stateVersion, action });
      expect(result.accepted).toBe(false); expect(result.state).toBe(waiting);
    }
  });
  it('concedes cleanly while a mandatory target is pending', () => {
    const s = start(), source = put(s, bug, 'a', 0, true);
    const waiting = run(s, 'a', { type: 'flip-summon', instanceId: source }).state;
    const done = run(waiting, 'a', { type: 'concede' }).state;
    expect(done.pendingTriggers).toHaveLength(0); expect(done.pendingDecision).toBeNull(); expect(done.result?.winner).toBe('b');
  });
  it('surviving Hane-Hane can target itself after damage has already been applied', () => {
    const s = start(), attacker = put(s, bug), defender = put(s, hane, 'b', 0, true);
    const waiting = attack(s, attacker, defender);
    expect(waiting.players[0].lifePoints).toBe(7950);
    expect(waiting.cards[defender]!.markers.wasBattleDestroyed).toBe(false);
    expect(waiting.pendingDecision?.optionIds).toContain(defender);
    const done = settle(choose(waiting, defender));
    expect(done.players[1].hand).toContain(defender); expect(done.players[0].monsters[0]).toBe(attacker);
    expect(done.players[0].lifePoints).toBe(7950);
    expect(done.cards[attacker]!.markers.attackCountConsumedThisTurn).toBe(1);
  });
  it('ends immediately on lethal battle damage before the defender FLIP can activate', () => {
    const s = start(), attacker = put(s, bug), defender = put(s, hane, 'b', 0, true);
    s.players[0].lifePoints = 50;
    const done = attack(s, attacker, defender);
    expect(done.result).toEqual({ winner: 'b', reason: 'life-points' });
    expect(done.chain).toHaveLength(0); expect(done.pendingTriggers).toHaveLength(0); expect(done.pendingDecision).toBeNull();
  });

  it('destroying a face-down FLIP monster by effect does not flip or trigger it', () => {
    const s = start(), source = put(s, bug, 'a', 0, true), target = put(s, hane, 'b', 0, true);
    const done = settle(choose(run(s, 'a', { type: 'flip-summon', instanceId: source }).state, target));
    expect(done.players[1].graveyard).toContain(target);
    expect(done.players[0].monsters[0]).toBe(source);
    expect(done.pendingTriggers).toHaveLength(0); expect(done.pendingDecision).toBeNull();
    expect(done.chain).toHaveLength(0); assertDuelInvariants(done, r);
  });
  it('returning a face-down FLIP monster does not reveal or trigger it', () => {
    const s = start(), source = put(s, hane, 'a', 0, true), target = put(s, bug, 'b', 0, true);
    const done = settle(choose(run(s, 'a', { type: 'flip-summon', instanceId: source }).state, target));
    expect(done.players[1].hand).toContain(target);
    expect(done.cards[target]!.position).toBe('face-down');
    expect(done.players[0].monsters[0]).toBe(source);
    expect(done.pendingTriggers).toHaveLength(0); expect(done.chain).toHaveLength(0);
    assertDuelInvariants(done, r);
  });
  it('a returned monster can be Normal Summoned again but still consumes the normal quota', () => {
    const s = start(), source = put(s, hane, 'a', 0, true), target = put(s, ox, 'a', 1);
    s.cards[target]!.markers.summonedOnTurn = 3; s.cards[target]!.markers.summonedBy = 'a';
    const returned = settle(choose(run(s, 'a', { type: 'flip-summon', instanceId: source }).state, target));
    const summoned = settle(run(returned, 'a', { type: 'normal-summon', instanceId: target, slot: 1, tributeIds: [] }).state);
    expect(summoned.players[0].monsters[1]).toBe(target);
    expect(summoned.players[0].normalSummonsOrSetsUsed).toBe(1);
    expect(summoned.cards[target]!.markers.summonedOnTurn).toBe(3);
    expect(summoned.cards[target]!.markers.manuallyChangedOnTurn).toBeNull();
    assertDuelInvariants(summoned, r);
  });
  it('surviving Man-Eater Bug may destroy itself after battle damage without attacking twice', () => {
    const s = start(), attacker = put(s, bug), defender = put(s, bug, 'b', 0, true);
    const waiting = attack(s, attacker, defender);
    expect(waiting.players[0].lifePoints).toBe(7850);
    expect(waiting.pendingDecision?.optionIds).toContain(defender);
    const done = settle(choose(waiting, defender));
    expect(done.players[1].graveyard).toContain(defender);
    expect(done.players[0].monsters[0]).toBe(attacker);
    const retry = applyAction(r, done, { actorId: 'a', expectedStateVersion: done.stateVersion,
      action: { type: 'declare-attack', attackerId: attacker, targetId: 'direct' } });
    expect(retry.accepted).toBe(false); expect(retry.state).toBe(done);
    assertDuelInvariants(done, r);
  });

});
