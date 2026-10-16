import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRegistry } from './registry.js';
import { createDuel } from './duel.js';
import { createCommandAdapter } from './command-adapter.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
import type { DuelState } from '../../protocol/src/duel.js';
import type { DuelAction, DuelCommand } from '../../protocol/src/commands.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const r = createRegistry(load('../../../data/generated/pilot.json').cards, goat200508Format, {}, load('../../../data/reviews/pilot.spell-effects.json'), load('../../../data/reviews/pilot.flip-effects.json'), load('../../../data/reviews/pilot.trap-effects.json'));
const ids = Object.values(r.cards).filter(c => c.kind === 'normal-monster').map(c => c.id), deck = [...ids, ...ids, ...ids].slice(0, 40);
function start() { return createDuel(r, { duelId: 'adapter-test', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '12'.repeat(32) }).state; }
type Room = ReturnType<typeof createCommandAdapter>;
let sequence = 0;
function command(room: Room, actor: string, action: DuelAction, commandId = `cmd-${++sequence}`): DuelCommand {
  const v = room.getView(actor); return { commandId, duelId: v.duelId, expectedStateVersion: v.stateVersion, action };
}
function send(room: Room, actor: string, action: DuelAction) {
  const result = room.submit(actor, command(room, actor, action));
  if (!result.accepted) throw new Error(result.reason); return result;
}
function settle(room: Room) {
  for (let n = 0; room.getView('a').timing.window !== 'open'; n++) {
    if (n > 10) throw new Error('Did not settle');
    const actor = room.getView('a').timing.priorityPlayer!;
    send(room, actor, { type: 'pass' });
  }
}
function main(room: Room) {
  settle(room);
  for (const phase of ['standby', 'main1'] as const) { send(room, 'a', { type: 'request-phase', phase }); settle(room); }
}
const lowMonster = (room: Room) => room.getView('a').selfHand.find(c => {
  if (c.visibility !== 'known') return false;
  const def = r.cards[c.definition.id]!; return def.kind === 'normal-monster' && def.level <= 4;
})!;
describe('Handle command adapter with two player views', () => {
  it('advances two filtered views together and summons through an own-hand handle', () => {
    const room = createCommandAdapter(r, start()); main(room);
    const card = lowMonster(room); send(room, 'a', { type: 'normal-summon', cardHandle: card.handle, slot: 0, tributeHandles: [] });
    const a = room.getView('a'), b = room.getView('b');
    expect(a.stateVersion).toBe(b.stateVersion); expect(b.players[0]!.monsters[0]!.visibility).toBe('known');
    expect(a.players[0]!.monsters[0]!.handle).not.toBe(b.players[0]!.monsters[0]!.handle);
    expect(b.opponentHandCount).toBe(a.selfHand.length); expect(JSON.stringify(b)).not.toContain('privateState');
  });
  it('deduplicates an accepted summon even after later commands and ignores JSON key order', () => {
    const room = createCommandAdapter(r, start()); main(room);
    const cmd = command(room, 'a', { type: 'normal-summon', cardHandle: lowMonster(room).handle, slot: 0, tributeHandles: [] }, 'summon-once');
    const first = room.submit('a', cmd); expect(first.accepted).toBe(true);
    send(room, 'a', { type: 'pass' }); const version = room.getView('a').stateVersion;
    const reordered = { action: cmd.action, expectedStateVersion: cmd.expectedStateVersion, duelId: cmd.duelId, commandId: cmd.commandId };
    expect(room.submit('a', reordered)).toEqual(first); expect(room.getView('a').stateVersion).toBe(version);
    expect(room.getView('a').players[0]!.monsters.filter(Boolean)).toHaveLength(1);
  });
  it('rejects reusing a command ID with a different payload', () => {
    const room = createCommandAdapter(r, start()), cmd = command(room, 'a', { type: 'pass' }, 'one'); room.submit('a', cmd);
    expect(room.submit('a', { ...cmd, action: { type: 'concede' } })).toMatchObject({ accepted: false, reason: 'command-conflict' });
    expect(room.getView('a').result).toBeNull();
  });
  it('keeps dedup IDs scoped to each player', () => {
    const room = createCommandAdapter(r, start());
    expect(room.submit('a', command(room, 'a', { type: 'pass' }, 'same'))).toMatchObject({ accepted: true });
    expect(room.submit('b', command(room, 'b', { type: 'pass' }, 'same'))).toMatchObject({ accepted: true });
    expect(room.getView('a').stateVersion).toBe(2);
  });
  it('rejects stale and wrong-duel commands before resolving handles', () => {
    const room = createCommandAdapter(r, start()), cmd = command(room, 'a', { type: 'pass' });
    room.submit('a', cmd);
    expect(room.submit('a', { ...cmd, commandId: 'stale' })).toMatchObject({ accepted: false, reason: 'stale-state' });
    const wrong = { ...command(room, 'a', { type: 'concede' }), duelId: 'different' };
    expect(room.submit('a', wrong)).toMatchObject({ accepted: false, reason: 'wrong-duel' });
  });
  it.each(['actorId', 'damage', 'winner', 'state'])('rejects injected %s fields', key => {
    const room = createCommandAdapter(r, start()), cmd = command(room, 'a', { type: 'pass' });
    expect(room.submit('a', { ...cmd, [key]: 'forged' })).toMatchObject({ accepted: false, reason: 'invalid-action' });
    expect(room.getView('a').stateVersion).toBe(0);
  });
  it('rejects cross-view handles, raw IDs, stale handles and invalid participant', () => {
    const s = start(), room = createCommandAdapter(r, s); main(room);
    const own = lowMonster(room).handle, foreign = room.getView('b').selfHand[0]!.handle;
    for (const h of [foreign, s.players[0].hand[0]!])
      expect(room.submit('a', command(room, 'a', { type: 'normal-summon', cardHandle: h, slot: 0, tributeHandles: [] }))).toMatchObject({ accepted: false, reason: 'invalid-target' });
    room.refreshView('a');
    expect(room.submit('a', command(room, 'a', { type: 'normal-summon', cardHandle: own, slot: 0, tributeHandles: [] }))).toMatchObject({ accepted: false, reason: 'invalid-target' });
    expect(room.submit('outsider', {})).toMatchObject({ accepted: false, reason: 'invalid-player' });
    expect(() => room.getView('outsider')).toThrow();
  });
  it('does not grant control over an opponent card whose handle is visible', () => {
    const room = createCommandAdapter(r, start()); main(room);
    send(room, 'a', { type: 'normal-summon', cardHandle: lowMonster(room).handle, slot: 0, tributeHandles: [] }); settle(room);
    const visible = room.getView('b').players[0]!.monsters[0]!;
    expect(room.submit('b', command(room, 'b', { type: 'change-position', cardHandle: visible.handle }))).toMatchObject({ accepted: false, reason: 'not-your-action' });
  });
  it('routes a mandatory FLIP decision without revealing the face-down target', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
    const source = s.players[0].hand.shift()!, target = s.players[1].hand.shift()!;
    const bug = r.cards['official:54652250']!; s.cards[source]!.definition = { id: bug.id, revision: bug.revision };
    for (const [playerIndex, id] of [[0, source], [1, target]] as const) {
      const p = s.players[playerIndex]; p.monsters[0] = id; s.cards[id]!.location = { kind: 'monster', playerId: p.id, slot: 0 }; s.cards[id]!.position = 'face-down-defense';
    }
    const room = createCommandAdapter(r, s), sourceHandle = room.getView('a').players[0]!.monsters[0]!.handle;
    send(room, 'a', { type: 'flip-summon', cardHandle: sourceHandle });
    const a = room.getView('a'), d = a.decision!, targetCard = a.players[1]!.monsters[0]!;
    expect(targetCard.visibility).toBe('hidden'); expect(d.optionIds).toContain(targetCard.handle); expect(room.getView('b').decision).toBeNull();
    const cmd = command(room, 'a', { type: 'answer-decision', decisionId: d.id, optionIds: [targetCard.handle] });
    expect(room.submit('b', cmd)).toMatchObject({ accepted: false, reason: 'invalid-choice' });
    expect(room.submit('a', cmd)).toMatchObject({ accepted: true }); settle(room);
    expect(room.getView('b').players[1]!.monsters[0]).toBeNull(); expect(room.getView('b').players[1]!.graveyard).toHaveLength(1);
  });
  it('never evicts a receipt and rejects new commands when configured capacity is reached', () => {
    const room = createCommandAdapter(r, start(), 1), cmd = command(room, 'a', { type: 'pass' });
    const first = room.submit('a', cmd);
    expect(room.submit('b', command(room, 'b', { type: 'pass' }))).toMatchObject({ accepted: false, reason: 'command-capacity' });
    expect(room.submit('a', cmd)).toEqual(first);
  });
  it('activates Pot through handles and a retried command never draws twice', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
    const card = s.players[0].hand[0]!, pot = r.cards['official:55144522']!;
    s.cards[card]!.definition = { id: pot.id, revision: pot.revision };
    const room = createCommandAdapter(r, s), before = room.getView('a').selfHand.length;
    const cmd = command(room, 'a', { type: 'activate-spell', cardHandle: room.getView('a').selfHand[0]!.handle, slot: 0 });
    const receipt = room.submit('a', cmd); expect(receipt.accepted).toBe(true); settle(room);
    expect(room.getView('a').selfHand).toHaveLength(before + 1);
    const drawFeedback = room.getView('a').activity.flatMap(e => e.resolution || []).filter(f => f.kind === 'draw');
    expect(drawFeedback).toEqual([{ kind: 'draw', playerId: 'a', count: 2 }]);
    const history = room.getView('a').activity;
    const version = room.getView('a').stateVersion;
    expect(room.submit('a', cmd)).toEqual(receipt);
    expect(room.getView('a').selfHand).toHaveLength(before + 1); expect(room.getView('a').stateVersion).toBe(version);
    expect(room.getView('a').activity).toEqual(history);
  });
  it('Sets Trap through a handle, advances a real turn and activates against the opponent summon', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.turn.number = 2; s.turn.activePlayer = 'b'; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.priorityPlayer = 'b'; s.timing.consecutivePasses = 0;
    const trap = r.cards['official:04206964']!, card = s.players[1].hand[0]!;
    s.cards[card]!.definition = { id: trap.id, revision: trap.revision };
    const room = createCommandAdapter(r, s);
    send(room, 'b', { type: 'set-spell-trap', cardHandle: room.getView('b').selfHand[0]!.handle, zone: 'spell-trap', slot: 0 }); settle(room);
    expect(room.getView('a').players[1]!.spellsTraps[0]!.visibility).toBe('hidden');
    send(room, 'b', { type: 'request-phase', phase: 'end' }); settle(room);
    send(room, 'b', { type: 'request-phase', phase: 'draw' }); settle(room);
    for (const phase of ['standby', 'main1'] as const) { send(room, 'a', { type: 'request-phase', phase }); settle(room); }
    const monster = room.getView('a').selfHand.find(c => {
      if (c.visibility !== 'known') return false;
      const d = r.cards[c.definition.id]!; return d.kind === 'normal-monster' && d.level <= 4 && d.attack >= 1000;
    })!;
    expect(monster).toBeDefined(); send(room, 'a', { type: 'normal-summon', cardHandle: monster.handle, slot: 0, tributeHandles: [] });
    send(room, 'a', { type: 'pass' });
    const b = room.getView('b');
    send(room, 'b', { type: 'activate-trap', cardHandle: b.players[1]!.spellsTraps[0]!.handle, targetHandle: b.players[0]!.monsters[0]!.handle }); settle(room);
    expect(room.getView('a').players[0]!.monsters[0]).toBeNull();
    expect(room.getView('b').players[1]!.graveyard).toHaveLength(1);
  });

  it('shares only public activity and never appends a retry or rejected action', () => {
    const room = createCommandAdapter(r, start());
    const cmd = command(room, 'a', { type: 'pass' }); room.submit('a', cmd);
    const first = room.getView('a').activity;
    expect(first).toEqual([{ stateVersion: 1, actorId: 'a', turn: 1, phase: 'draw', action: 'pass' }]);
    expect(room.getView('b').activity).toEqual(first); expect(room.refreshView('a').activity).toEqual(first);
    room.submit('a', cmd);
    room.submit('a', command(room, 'a', { type: 'pass' })); // b has priority: rejected.
    expect(room.getView('a').activity).toEqual(first);
    expect(Object.isFrozen(first[0])).toBe(true);
    send(room, 'b', { type: 'pass' });
    send(room, 'a', { type: 'request-phase', phase: 'standby' });
    send(room, 'b', { type: 'pass' });
    expect(room.getView('a').turn.phase).toBe('standby');
    expect(room.getView('a').activity.at(-1)!.phase).toBe('draw'); // Context when the accepted action began.

  });
  it('records a Set without exposing its identity, handle or raw instance ID', () => {
    const initial = start(), room = createCommandAdapter(r, initial); main(room);
    const card = lowMonster(room);
    send(room, 'a', { type: 'set-monster', cardHandle: card.handle, slot: 0, tributeHandles: [] });
    const history = room.getView('b').activity;
    expect(history.at(-1)?.action).toBe('set-monster');
    const serialized = JSON.stringify(history);
    expect(serialized).not.toContain(card.handle);
    if (card.visibility === 'known') {
      expect(serialized).not.toContain(card.definition.id); expect(serialized).not.toContain(r.cards[card.definition.id]!.name);
    }
    for (const id of Object.keys(initial.cards)) expect(serialized).not.toContain(id);
    expect(room.getView('b').players[0]!.monsters[0]!.visibility).toBe('hidden');
  });
  it('bounds public history to the latest 60 accepted commands without clearing dedup', () => {
    const room = createCommandAdapter(r, start()); const first = command(room, 'a', { type: 'pass' }); const receipt = room.submit('a', first);
    for (let n = 1; n < 70; n++) { const actor = room.getView('a').timing.priorityPlayer!; send(room, actor, { type: 'pass' }); }
    expect(room.getView('a').activity).toHaveLength(60); expect(room.getView('a').activity[0]!.stateVersion).toBe(11);
    expect(room.submit('a', first)).toEqual(receipt); expect(room.getView('a').activity.at(-1)!.stateVersion).toBe(70);
    expect(createCommandAdapter(r, start()).getView('a').activity).toEqual([]);
  });

  it('discovers legal Main actions without changing state or consuming summon quota', () => {
    const room = createCommandAdapter(r, start()); main(room);
    const before = room.getView('a'), discovery = room.getView('a', true);
    expect(discovery.stateVersion).toBe(before.stateVersion); expect(discovery.activity).toEqual(before.activity); expect(discovery.selfHand).toEqual(before.selfHand);
    expect(room.getView('a', true).availableActions).toBe(discovery.availableActions);
    const summon = discovery.availableActions!.find(a => a.type === 'normal-summon'); expect(summon).toBeDefined();
    send(room, 'a', summon!); settle(room);
    expect(room.getView('a', true).availableActions!.some(a => ['normal-summon', 'set-monster'].includes(a.type))).toBe(false);
    expect(room.getView('b', true).availableActions!.some(a => a.type === 'normal-summon')).toBe(false);
  });
  it('discovery has no hidden IDs, card definitions or decisions and is invalidated on refresh', () => {
    const s = start(), room = createCommandAdapter(r, s); main(room);
    const first = room.getView('a', true); const serialized = JSON.stringify(first.availableActions);
    for (const id of Object.keys(s.cards)) expect(serialized).not.toContain(id);
    for (const card of Object.values(r.cards)) expect(serialized).not.toContain(card.id);
    expect(serialized).not.toContain('definition'); expect(serialized).not.toContain('optionIds');
    const refreshed = room.refreshView('a', true);
    const oldHandles = first.selfHand.map(c => c.handle);
    for (const handle of oldHandles) expect(JSON.stringify(refreshed.availableActions)).not.toContain(handle);
  });
  it('never commits a draw while probing activation choices', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
    const id = s.players[0].hand[0]!, pot = r.cards['official:55144522']!;
    s.cards[id]!.definition = { id: pot.id, revision: pot.revision };
    const room = createCommandAdapter(r, s), before = room.getView('a');
    const actions = room.getView('a', true).availableActions!;
    expect(actions.some(a => a.type === 'activate-spell')).toBe(true);
    expect(room.getView('a').selfHand).toEqual(before.selfHand); expect(room.getView('a').players).toEqual(before.players);
    expect(room.getView('a').activity).toEqual([]); expect(room.getView('a').stateVersion).toBe(before.stateVersion);
  });
  it('does not offer already occupied Spell/Trap destinations', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
    const spell = r.cards['official:55144522']!, trap = r.cards['official:04206964']!;
    const spellId = s.players[0].hand[0]!, trapId = s.players[0].hand.pop()!;
    s.cards[spellId]!.definition = { id: spell.id, revision: spell.revision };
    s.cards[trapId]!.definition = { id: trap.id, revision: trap.revision }; s.cards[trapId]!.location = { kind: 'spell-trap', playerId: 'a', slot: 0 }; s.cards[trapId]!.position = 'face-down'; s.cards[trapId]!.markers.setOnTurn = 1; s.players[0].spellsTraps[0] = trapId;
    const room = createCommandAdapter(r, s), v = room.getView('a', true);
    const handle = v.selfHand.find(c => c.visibility === 'known' && c.definition.id === spell.id)!.handle;
    const options = v.availableActions!.filter(a => 'cardHandle' in a && a.cardHandle === handle);
    expect(options.length).toBeGreaterThan(0); expect(options.every(a => 'slot' in a && a.slot !== 0)).toBe(true);
  });

  it('offers full-board tribute destinations only when their occupant is among the Tributes', () => {
    const s = structuredClone(start()) as Mutable<DuelState>, p = s.players[0];
    s.turn.number = 3; s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
    const magician = Object.values(s.cards).find(c => c.ownerId === 'a' && c.definition.id === 'official:46986414' && ['hand', 'deck'].includes(c.location.kind))!;
    if (magician.location.kind === 'deck') { p.deck.splice(p.deck.indexOf(magician.id), 1); p.hand.push(magician.id); magician.location = { kind: 'hand', playerId: 'a' }; }
    for (let slot = 0; slot < 5; slot++) {
      const id = p.deck.shift()!; p.monsters[slot] = id; s.cards[id]!.location = { kind: 'monster', playerId: 'a', slot: slot as 0 | 1 | 2 | 3 | 4 }; s.cards[id]!.position = 'face-up-attack';
    }
    const room = createCommandAdapter(r, s), v = room.getView('a', true);
    const handle = v.selfHand.find(c => c.visibility === 'known' && c.definition.id === magician.definition.id)!.handle;
    const plans = v.availableActions!.filter(a => a.type === 'normal-summon' && a.cardHandle === handle);
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      if (plan.type !== 'normal-summon') throw new Error('Expected summon');
      expect(plan.tributeHandles).toHaveLength(2); expect(new Set(plan.tributeHandles).size).toBe(2);
      expect(plan.tributeHandles).toContain(v.players[0]!.monsters[plan.slot]!.handle);
    }
  });

  it.each(['main1', 'battle'] as const)('does not expose hidden identities or deck order through %s action discovery', phase => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.turn.number = 3; s.turn.phase = phase; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
    if (phase === 'battle') s.battle = { step: 'battle', attacker: null, target: null, damageTiming: null, ordinaryDamageChainUsed: false, replayPending: false };
    for (const [index, down] of [[0, false], [1, true]] as const) {
      const p = s.players[index], id = p.hand.shift()!;
      p.monsters[0] = id; s.cards[id]!.location = { kind: 'monster', playerId: p.id, slot: 0 };
      s.cards[id]!.position = down ? 'face-down-defense' : 'face-up-attack';
    }
    const changed = structuredClone(s), hidden = changed.players[1].monsters[0]!;
    const otherHidden = changed.players[1].deck.find(id => changed.cards[id]!.definition.id !== changed.cards[hidden]!.definition.id)!;
    [changed.cards[hidden]!.definition, changed.cards[otherHidden]!.definition] = [changed.cards[otherHidden]!.definition, changed.cards[hidden]!.definition];
    changed.players[0].deck.reverse(); changed.players[1].deck.reverse(); changed.players[1].hand.reverse();
    // Normalize opaque projection tokens by visible location, not by private card ID.
    const normalized = (state: DuelState) => {
      const view = createCommandAdapter(r, state).getView('a', true), tokens = new Map<string, string>();
      for (const card of [...view.selfHand, ...view.players.flatMap(p => [...p.monsters, ...p.spellsTraps, ...p.graveyard, ...p.banished])])
        if (card) tokens.set(card.handle, `visible-${tokens.size}`);
      return JSON.parse(JSON.stringify(view, (_key, value: unknown) => typeof value === 'string' ? tokens.get(value) ?? value : value));
    };
    expect(normalized(changed)).toEqual(normalized(s));
  });
  it('every advertised Main action can be submitted against its unchanged snapshot', () => {
    const seedRoom = createCommandAdapter(r, start()); main(seedRoom);
    // Recreate the same state via commands, with new projection handles in every branch.
    const count = seedRoom.getView('a', true).availableActions!.length;
    expect(count).toBeGreaterThan(10);
    for (let index = 0; index < count; index++) {
      const room = createCommandAdapter(r, start()); main(room);
      const view = room.getView('a', true), action = view.availableActions![index]!;
      const before = JSON.stringify(room.getView('b'));
      expect(room.getView('a', true).availableActions).toBe(view.availableActions);
      expect(JSON.stringify(room.getView('b'))).toBe(before);
      const result = room.submit('a', command(room, 'a', action));
      expect(result.accepted, JSON.stringify(action)).toBe(true);
      expect(room.getView('a').stateVersion).toBe(view.stateVersion + 1);
    }
  });

  it('keeps end-turn discard private, rejects invalid choices atomically and deduplicates success', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
    while (s.players[0].hand.length < 8) {
      const id = s.players[0].deck.shift()!; s.players[0].hand.push(id); s.cards[id]!.location = { kind: 'hand', playerId: 'a' };
    }
    const room = createCommandAdapter(r, s);
    send(room, 'a', { type: 'request-phase', phase: 'end' }); send(room, 'b', { type: 'pass' });
    const a = room.getView('a'), b = room.getView('b'), d = a.decision!;
    expect(d.kind).toBe('discard'); expect(d.min).toBe(2); expect(b.decision).toBeNull();
    expect(a.timing.priorityPlayer).toBeNull(); expect(b.timing.priorityPlayer).toBeNull();
    expect(room.getView('b', true).availableActions!.map(action => action.type)).toEqual(['concede']);
    for (const h of d.optionIds) expect(JSON.stringify(b)).not.toContain(h);
    for (const [actor, action] of [
      ['a', { type: 'answer-decision', decisionId: d.id, optionIds: [d.optionIds[0]!] }],
      ['a', { type: 'answer-decision', decisionId: d.id, optionIds: [d.optionIds[0]!, d.optionIds[0]!] }],
      ['b', { type: 'answer-decision', decisionId: d.id, optionIds: d.optionIds.slice(0, 2) }],
      ['a', { type: 'request-phase', phase: 'draw' }],
    ] as const) {
      expect(room.submit(actor, command(room, actor, action)).accepted).toBe(false);
      expect(room.getView('a')).toEqual(a); expect(room.getView('b')).toEqual(b);
    }
    const cmd = command(room, 'a', { type: 'answer-decision', decisionId: d.id, optionIds: d.optionIds.slice(0, 2) });
    const receipt = room.submit('a', cmd); expect(receipt.accepted).toBe(true);
    const done = room.getView('a'); expect(done.selfHand).toHaveLength(6); expect(done.players[0]!.graveyard).toHaveLength(2);
    expect(room.submit('a', cmd)).toEqual(receipt); expect(room.getView('a')).toEqual(done);
    expect(done.activity.at(-1)?.resolution).toContainEqual({ kind: 'discard', playerId: 'a', count: 2 });
  });

});
