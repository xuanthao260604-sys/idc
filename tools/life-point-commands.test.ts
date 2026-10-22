import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { defaultDeck } from './deck-store.js';
import { createDuel, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
import type { DuelAction, DuelCommand } from '../packages/protocol/src/commands.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog();
const burn = 'official:46130346', heal = 'official:84257639';
const pot = 'official:55144522', fissure = 'official:66788016';
type Room = ReturnType<typeof createCommandAdapter>;
// Trusted fixtures only: after adapter creation every transition uses public commands.
function setup(actor = 'a', victimLP = 8000) {
  const required = [burn, heal, pot, fissure];
  const deck = [...required, ...defaultDeck(registry).filter(id => !required.includes(id))].slice(0, 40);
  const state = structuredClone(createDuel(registry, { duelId: 'lp-command-audit', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '76'.repeat(32) }).state) as Mutable<DuelState>;
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  state.players.find(p => p.id !== actor)!.lifePoints = victimLP;
  const player = state.players.find(p => p.id === actor)!;
  for (const definitionId of required) {
    const card = Object.values(state.cards).find(c => c.ownerId === actor && c.definition.id === definitionId)!;
    if (card.location.kind === 'deck') {
      player.deck.splice(player.deck.indexOf(card.id), 1); player.hand.push(card.id); card.location = { kind: 'hand', playerId: actor };
    }
  }
  assertDuelInvariants(state, registry); return state;
}
let serial = 0;
function command(room: Room, actor: string, action: DuelAction): DuelCommand {
  const v = room.getView(actor); return { duelId: v.duelId, expectedStateVersion: v.stateVersion, commandId: `lp-${++serial}`, action };
}
function send(room: Room, actor: string, action: DuelAction) {
  const cmd = command(room, actor, action), receipt = room.submit(actor, cmd);
  expect(receipt.accepted).toBe(true); return { cmd, receipt };
}
function handHandle(room: Room, actor: string, definitionId: string) {
  const card = room.getView(actor).selfHand.find(c => c.visibility === 'known' && c.definition.id === definitionId);
  if (!card) throw new Error(`Missing own hand card ${definitionId}`); return card.handle;
}
function settle(room: Room) {
  for (let n = 0; !room.getView('a').result && room.getView('a').timing.window !== 'open'; n++) {
    if (n > 10) throw new Error('Did not settle');
    send(room, room.getView('a').timing.priorityPlayer!, { type: 'pass' });
  }
}
const points = (room: Room) => room.getView('a').players.map(p => p.lifePoints);
const facts = (room: Room) => room.getView('a').activity.flatMap(a => a.resolution ?? []);
function activate(room: Room, actor: string, id: string) {
  send(room, actor, { type: 'activate-spell', cardHandle: handHandle(room, actor, id), slot: 0 }); settle(room);
}

describe('Life-point spells through player-handle commands', () => {
  it.each([burn, heal].flatMap(id => ['a', 'b'].map(actor => ({ id, actor }))))('$id for $actor cannot resolve twice after receipt retry or view refresh', ({ id, actor }) => {
    const room = createCommandAdapter(registry, setup(actor));
    const activation = send(room, actor, { type: 'activate-spell', cardHandle: handHandle(room, actor, id), slot: 0 });
    expect(points(room)).toEqual([8000, 8000]);
    const other = actor === 'a' ? 'b' : 'a';
    send(room, other, { type: 'pass' });
    const final = send(room, actor, { type: 'pass' });
    const before = room.getView('a');
    const expected = id === heal ? (actor === 'a' ? [9000, 8000] : [8000, 9000]) : (actor === 'a' ? [8000, 7500] : [7500, 8000]);
    expect(points(room)).toEqual(expected);
    expect(facts(room)).toEqual([{ kind: id === heal ? 'life-points-gained' : 'effect-damage', playerId: id === heal ? actor : other, amount: id === heal ? 1000 : 500 }]);
    room.refreshView(actor);
    for (const { cmd, receipt } of [activation, final]) expect(room.submit(actor, cmd)).toEqual(receipt);
    expect(room.getView('a').stateVersion).toBe(before.stateVersion);
    expect(room.getView('a').activity).toEqual(before.activity); expect(points(room)).toEqual(expected);
    expect(room.getView('b').activity).toEqual(before.activity);
    expect(room.getView(actor).players.find(p => p.playerId === actor)!.graveyard).toHaveLength(1);
    expect(room.getView(actor).chain).toEqual([]);
  });
  it.each([500, 200])('keeps a lethal resolution at %i LP final across retries, stale commands and reconnect', victimLP => {
    const room = createCommandAdapter(registry, setup('a', victimLP));
    const activation = send(room, 'a', { type: 'activate-spell', cardHandle: handHandle(room, 'a', burn), slot: 0 });
    send(room, 'b', { type: 'pass' }); const final = send(room, 'a', { type: 'pass' });
    const finished = room.getView('a'); expect(finished.result).toEqual({ winner: 'a', reason: 'life-points' });
    expect(points(room)).toEqual([8000, 0]);
    for (const actor of ['a', 'b']) expect(room.refreshView(actor, true).availableActions).toEqual([]);
    for (const old of [activation, final]) expect(room.submit('a', old.cmd)).toEqual(old.receipt);
    expect(room.submit('a', command(room, 'a', { type: 'concede' }))).toMatchObject({ accepted: false, reason: 'duel-ended' });
    expect(room.submit('a', { ...final.cmd, commandId: 'stale-final' })).toMatchObject({ accepted: false, reason: 'stale-state' });
    expect(room.getView('a').activity).toEqual(finished.activity); expect(points(room)).toEqual([8000, 0]);
    expect(facts(room)).toEqual([{ kind: 'effect-damage', playerId: 'b', amount: 500 }]);
  });
  it.each([burn, heal])('rejects forged LP amount/recipient and obsolete handles for %s without changing public history', id => {
    const room = createCommandAdapter(registry, setup());
    const action = { type: 'activate-spell' as const, cardHandle: handHandle(room, 'a', id), slot: 0 as const };
    const before = room.getView('a');
    for (const injected of [{ amount: 99999 }, { playerId: 'a' }, { handler: 'gain-life-points' }])
      expect(room.submit('a', command(room, 'a', { ...action, ...injected }))).toMatchObject({ accepted: false, reason: 'invalid-action' });
    room.refreshView('a');
    expect(room.submit('a', command(room, 'a', action))).toMatchObject({ accepted: false, reason: 'invalid-target' });
    expect(room.getView('a').stateVersion).toBe(before.stateVersion); expect(room.getView('a').activity).toEqual([]); expect(points(room)).toEqual([8000, 8000]);
  });
  it('offers actions without applying LP, hides an own Set card until activation, and then frees its slot', () => {
    const room = createCommandAdapter(registry, setup());
    send(room, 'a', { type: 'set-spell-trap', zone: 'spell-trap', slot: 0, cardHandle: handHandle(room, 'a', heal) }); settle(room);
    const hidden = room.getView('b').players[0]!.spellsTraps[0]!;
    expect(hidden.visibility).toBe('hidden'); expect(JSON.stringify(hidden)).not.toContain(heal);
    const before = room.getView('a');
    for (let n = 0; n < 3; n++) {
      const v = room.refreshView('a', true), own = v.players[0]!.spellsTraps[0]!;
      expect(v.availableActions).toContainEqual({ type: 'activate-spell', cardHandle: own.handle, slot: 0 });
      expect(points(room)).toEqual([8000, 8000]); expect(v.activity).toEqual(before.activity);
    }
    const own = room.getView('a').players[0]!.spellsTraps[0]!;
    send(room, 'a', { type: 'activate-spell', cardHandle: own.handle, slot: 0 });
    expect(room.getView('b').players[0]!.spellsTraps[0]!.visibility).toBe('known'); settle(room);
    expect(points(room)).toEqual([9000, 8000]); expect(room.getView('a').players[0]!.spellsTraps[0]).toBeNull();
    expect(room.getView('a').activity).toEqual(room.getView('b').activity);
  });
  it.each([[heal, burn, pot, fissure], [fissure, pot, burn, heal]].map(order => ({ order })))('resolves four independent Normal Spells in order $order with one shared slot', ({ order }) => {
    const state = setup(), victim = state.players[1].hand.find(id => registry.cards[state.cards[id]!.definition.id]!.kind === 'normal-monster')!;
    state.players[1].hand.splice(state.players[1].hand.indexOf(victim), 1); state.players[1].monsters[0] = victim;
    state.cards[victim]!.location = { kind: 'monster', playerId: 'b', slot: 0 }; state.cards[victim]!.position = 'face-up-attack';
    const room = createCommandAdapter(registry, state), handBefore = room.getView('a').selfHand.length;
    for (const id of order) {
      activate(room, 'a', id);
      const v = room.getView('a'); expect(v.chain).toEqual([]); expect(v.decision).toBeNull(); expect(v.players[0]!.spellsTraps[0]).toBeNull();
    }
    expect(points(room)).toEqual([9000, 7500]); expect(room.getView('a').selfHand).toHaveLength(handBefore - 4 + 2);
    expect(room.getView('a').players[0]!.graveyard).toHaveLength(4); expect(room.getView('a').players[1]!.monsters[0]).toBeNull();
    expect(facts(room)).toHaveLength(4); expect(room.getView('a').activity).toEqual(room.getView('b').activity);
    expect(facts(room)).toContainEqual({ kind: 'draw', playerId: 'a', count: 2 });
    expect(facts(room)).toContainEqual({ kind: 'effect-destroyed', count: 1 });
  });
});
