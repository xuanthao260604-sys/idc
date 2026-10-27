import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
import type { EngineAction } from '../packages/engine/src/actions.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog(), ookazi = 'official:19523799';
// Fixture preparation only. After the first action, all transitions use engine or handle commands.
function fixture(actor: string, victimLP = 8000) {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'ookazi-interactions', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '82'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) {
    p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id };
  }
  const other = actor === 'a' ? 'b' : 'a';
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  state.players.find(p => p.id === other)!.lifePoints = victimLP;
  function move(name: string, owner = actor, zone: 'hand' | 'graveyard' | 'monster' = 'hand', down = false) {
    const definition = Object.values(registry.cards).find(c => c.name === name)!, p = state.players.find(p => p.id === owner)!;
    const id = p.deck.find(id => state.cards[id]!.definition.id === definition.id)!;
    if (!id) throw new Error(`Fixture missing ${name}`);
    p.deck.splice(p.deck.indexOf(id), 1); const card = state.cards[id]!;
    if (zone === 'monster') {
      p.monsters[0] = id; card.location = { kind: 'monster', playerId: owner, slot: 0 };
      card.position = down ? 'face-down-defense' : 'face-up-attack';
      if (down) card.markers.setOnTurn = state.turn.number - 1;
    } else { p[zone].push(id); card.location = { kind: zone, playerId: owner }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; }
    return id;
  }
  return { state, actor, other, move };
}
function act(state: DuelState, actorId: string, action: EngineAction) {
  assertDuelInvariants(state, registry);
  const before = structuredClone(state), result = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(state).toEqual(before); if (!result.accepted) throw new Error(result.message);
  assertDuelInvariants(result.state, registry); return result;
}
function settle(state: DuelState): DuelState {
  for (let n = 0; !state.result && state.timing.window !== 'open'; n++) {
    if (n > 10 || state.pendingDecision) throw new Error('Unresolved interaction');
    state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  }
  return state;
}
const points = (state: DuelState, player: string) => state.players.find(p => p.id === player)!.lifePoints;
const spell = (instanceId: string): EngineAction => ({ type: 'activate-spell', instanceId, slot: 0 });
function recover(state: DuelState, actor: string, faith: string, target: string, foreign: string) {
  state = act(state, actor, { type: 'flip-summon', instanceId: faith }).state;
  expect(state.pendingDecision!.optionIds).toContain(target); expect(state.pendingDecision!.optionIds).not.toContain(foreign);
  state = act(state, actor, { type: 'answer-decision', decisionId: state.pendingDecision!.id, optionIds: [target] }).state;
  expect(state.cards[target]!.location.kind).toBe('graveyard');
  state = settle(state); expect(state.cards[target]!.location).toEqual({ kind: 'hand', playerId: actor });
  return state;
}
describe.each(['a', 'b'])('Ookazi interactions for controller %s', actor => {
  it.each([['Ookazi', 'Hinotama', 'Dian Keto the Cure Master'], ['Dian Keto the Cure Master', 'Hinotama', 'Ookazi']])('resolves independent LP spells in order %j with one reusable slot', (...order) => {
    const f = fixture(actor), ids = order.map(name => f.move(name)); let state: DuelState = f.state;
    for (const id of ids) {
      const before = state.players.map(p => p.lifePoints), active = act(state, actor, spell(id)).state;
      expect(active.players.map(p => p.lifePoints)).toEqual(before);
      const first = act(active, f.other, { type: 'pass' }).state; expect(first.players.map(p => p.lifePoints)).toEqual(before);
      state = settle(act(first, actor, { type: 'pass' }).state);
      expect(state.chain).toEqual([]); expect(state.pendingDecision).toBeNull();
      expect(state.players.find(p => p.id === actor)!.spellsTraps[0]).toBeNull();
    }
    expect(points(state, actor)).toBe(9000); expect(points(state, f.other)).toBe(6700);
    const own = state.players.find(p => p.id === actor)!;
    expect(own.graveyard).toEqual(ids); expect(own.normalSummonsOrSetsUsed).toBe(0);
  });
  it('recovers a resolved Ookazi with Faith and inflicts another 800 only on a new activation', () => {
    const f = fixture(actor), burn = f.move('Ookazi'), faith = f.move('Magician of Faith', actor, 'monster', true), foreign = f.move('Ookazi', f.other, 'graveyard');
    let state = settle(act(f.state, actor, spell(burn)).state); expect(points(state, f.other)).toBe(7200);
    state = recover(state, actor, faith, burn, foreign); expect(points(state, f.other)).toBe(7200);
    expect(state.players.find(p => p.id === f.other)!.graveyard).toContain(foreign);
    state = settle(act(state, actor, spell(burn)).state); expect(points(state, f.other)).toBe(6400);
    expect(state.players.find(p => p.id === actor)!.graveyard.filter(id => id === burn)).toHaveLength(1);
    expect(state.players.find(p => p.id === actor)!.normalSummonsOrSetsUsed).toBe(0);
  });
  it.each(['Monster Reincarnation', 'Tribute to The Doomed'])('discarding Ookazi as %s cost causes no damage and allows later Faith recovery', sourceName => {
    const f = fixture(actor), source = f.move(sourceName), cost = f.move('Ookazi'), faith = f.move('Magician of Faith', actor, 'monster', true);
    const foreign = f.move('Ookazi', f.other, 'graveyard');
    const target = sourceName === 'Monster Reincarnation' ? f.move('Battle Ox', actor, 'graveyard') : f.move('Battle Ox', f.other, 'monster');
    const active = act(f.state, actor, { ...spell(source), discardId: cost, targetId: target } as EngineAction);
    expect(publicResolution(active.events, active.state)).toEqual([{ kind: 'discard-cost', playerId: actor, count: 1 }]);
    expect(active.state.cards[cost]!.location.kind).toBe('graveyard'); expect(points(active.state, f.other)).toBe(8000);
    let state = settle(active.state); expect(points(state, f.other)).toBe(8000); expect(points(state, actor)).toBe(8000);
    expect(state.cards[target]!.location.kind).toBe(sourceName === 'Monster Reincarnation' ? 'hand' : 'graveyard');
    state = recover(state, actor, faith, cost, foreign); expect(points(state, f.other)).toBe(8000);
    state = settle(act(state, actor, spell(cost)).state); expect(points(state, f.other)).toBe(7200);
    expect(state.chain).toEqual([]); expect(state.pendingDecision).toBeNull();
  });
  it.each([1300, 1299])('Hinotama then Ookazi ends a duel starting at %i opposing LP before another spell can be played', lp => {
    const f = fixture(actor, lp), first = f.move('Hinotama'), burn = f.move('Ookazi'), heal = f.move('Dian Keto the Cure Master');
    let state = settle(act(f.state, actor, spell(first)).state); expect(points(state, f.other)).toBe(lp - 500); expect(state.result).toBeNull();
    state = settle(act(state, actor, spell(burn)).state); expect(points(state, f.other)).toBe(0); expect(state.result).toEqual({ winner: actor, reason: 'life-points' });
    const before = structuredClone(state), rejected = applyAction(registry, state, { actorId: actor, expectedStateVersion: state.stateVersion, action: spell(heal) });
    expect(rejected).toMatchObject({ accepted: false, code: 'duel-ended', state }); expect(state).toEqual(before);
    expect(points(state, actor)).toBe(8000); expect(state.cards[heal]!.location.kind).toBe('hand'); expect(state.chain).toEqual([]);
  });
  it('uses a fresh recovered-card handle and keeps both real activations single-use across retries', () => {
    const f = fixture(actor); f.move('Ookazi'); f.move('Magician of Faith', actor, 'monster', true);
    const room = createCommandAdapter(registry, f.state); let serial = 0;
    const command = (who: string, action: DuelAction) => {
      const v = room.getView(who); return { duelId: v.duelId, expectedStateVersion: v.stateVersion, commandId: `ookazi-recovery-${++serial}`, action };
    };
    const send = (who: string, action: DuelAction) => {
      const cmd = command(who, action), receipt = room.submit(who, cmd); expect(receipt.accepted).toBe(true); return { cmd, receipt };
    };
    const settleRoom = () => {
      for (let n = 0; room.getView(actor).timing.window !== 'open'; n++) {
        if (n > 10) throw new Error('Unsettled room'); send(room.getView(actor).timing.priorityPlayer!, { type: 'pass' });
      }
    };
    const own = () => room.getView(actor).players.find(p => p.playerId === actor)!;
    const hand = () => room.getView(actor).selfHand.find(c => c.visibility === 'known' && c.definition.id === ookazi)!.handle;
    const oldHandle = hand(), first = send(actor, { type: 'activate-spell', cardHandle: oldHandle, slot: 0 }); settleRoom();
    send(actor, { type: 'flip-summon', cardHandle: own().monsters[0]!.handle });
    expect(room.getView(f.other).decision).toBeNull();
    send(actor, { type: 'answer-decision', decisionId: room.getView(actor).decision!.id, optionIds: [own().graveyard.find(c => c.visibility === 'known' && c.definition.id === ookazi)!.handle] }); settleRoom();
    expect(hand()).not.toBe(oldHandle);
    const beforeStale = room.getView(actor);
    expect(room.submit(actor, command(actor, { type: 'activate-spell', cardHandle: oldHandle, slot: 0 }))).toMatchObject({ accepted: false, reason: 'invalid-target' });
    expect(room.getView(actor)).toEqual(beforeStale);
    const second = send(actor, { type: 'activate-spell', cardHandle: hand(), slot: 0 }); settleRoom();
    const before = room.getView(actor); room.refreshView(actor, true);
    for (const old of [first, second]) expect(room.submit(actor, old.cmd)).toEqual(old.receipt);
    const after = room.getView(actor); expect(after.stateVersion).toBe(before.stateVersion); expect(after.activity).toEqual(before.activity);
    expect(after.players.find(p => p.playerId === f.other)!.lifePoints).toBe(6400);
    expect(after.activity.flatMap(a => a.resolution ?? []).filter(f => f.kind === 'effect-damage')).toEqual([
      { kind: 'effect-damage', playerId: f.other, amount: 800 }, { kind: 'effect-damage', playerId: f.other, amount: 800 },
    ]);
    expect(room.getView(f.other).activity).toEqual(after.activity); expect(own().graveyard.filter(c => c.visibility === 'known' && c.definition.id === ookazi)).toHaveLength(1);
  });
});
