import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog(), hole = 'official:04206964';
function fixture(actor = 'a', method = 'normal', count = 2, phase: 'main1' | 'main2' = 'main1') {
  const deck = [...Object.keys(registry.cards), hole, hole];
  const state = structuredClone(createDuel(registry, { duelId: 'trap-cleanup', players: [{ id: 'a', deck }, { id: 'b', deck }],
    firstPlayerId: actor, seedHex: 'cc'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) { p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  const owner = actor === 'a' ? 'b' : 'a';
  state.turn.number = 3; state.turn.phase = phase; state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  const move = (name: string, who: string, zone: 'hand' | 'graveyard' | 'monster' | 'spell-trap', slot: Slot = 0) => {
    const p = state.players.find(p => p.id === who)!, def = Object.values(registry.cards).find(d => d.name === name)!;
    const id = p.deck.find(id => state.cards[id]!.definition.id === def.id)!; if (!id) throw new Error('Missing fixture ' + name);
    p.deck.splice(p.deck.indexOf(id), 1); const card = state.cards[id]!;
    if (zone === 'monster' || zone === 'spell-trap') {
      (zone === 'monster' ? p.monsters : p.spellsTraps)[slot] = id; card.location = { kind: zone, playerId: who, slot };
      card.position = zone === 'spell-trap' ? 'face-down' : 'face-up-attack'; card.markers.setOnTurn = 2;
    } else { p[zone].push(id); card.location = { kind: zone, playerId: who }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; }
    return id;
  };
  const target = move(method === 'tribute' ? 'Gaia The Fierce Knight' : 'Battle Ox', actor, method === 'flip' ? 'monster' : 'hand');
  if (method === 'flip') state.cards[target]!.position = 'face-down-defense';
  const tributeIds = method === 'tribute' ? [move('Skull Servant', actor, 'monster', 1), move('Mystical Elf', actor, 'monster', 2)] : [];
  const traps = Array.from({ length: count }, (_, i) => move('Trap Hole', owner, 'spell-trap', i as Slot));
  move('Celtic Guardian', owner, 'graveyard'); move('Battle Ox', owner, 'graveyard');
  const summon: EngineAction = method === 'flip' ? { type: 'flip-summon', instanceId: target }
    : { type: 'normal-summon', instanceId: target, slot: 0, tributeIds };
  return { state, actor, owner, target, traps, summon };
}
function act(s: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(s), r = applyAction(registry, s, { actorId, expectedStateVersion: s.stateVersion, action });
  expect(s).toEqual(before); if (!r.accepted) throw new Error(r.message); assertDuelInvariants(r.state, registry); return r;
}
function pause(f: ReturnType<typeof fixture>) {
  let s = act(f.state, f.actor, f.summon).state;
  for (const trap of f.traps) { s = act(s, f.actor, { type: 'pass' }).state; s = act(s, f.owner, { type: 'activate-trap', instanceId: trap, targetId: f.target }).state; }
  s = act(s, f.actor, { type: 'pass' }).state;
  return act(s, f.owner, { type: 'pass' });
}
const answer = (s: DuelState, order: string[]): EngineAction => ({ type: 'answer-decision', decisionId: s.pendingDecision!.id, optionIds: order });
function reject(s: DuelState, actorId: string, action: unknown, version = s.stateVersion) {
  const before = structuredClone(s), r = applyAction(registry, s, { actorId, expectedStateVersion: version, action });
  expect(r.accepted).toBe(false); expect(r.state).toBe(s); expect(s).toEqual(before); return r;
}

describe('Trap-only Chain pauses for owner cleanup order after its effects finish', () => {
  it.each(['a', 'b'].flatMap(actor => ['normal', 'tribute', 'flip'].flatMap(method => [false, true].flatMap(reverse =>
    (['main1', 'main2'] as const).map(phase => ({ actor, method, reverse, phase }))))))(
    '$actor $method $phase reverse=$reverse keeps the old Graveyard prefix and emits one cleanup batch', ({ actor, method, reverse, phase }) => {
      const f = fixture(actor, method, 2, phase), paused = pause(f), s = paused.state;
      expect(paused.events.filter(e => e.kind === 'chain-link-resolving').map(e => e.affectedInstances[0])).toEqual([...f.traps].reverse());
      expect(paused.events.filter(e => e.kind === 'effect-destroyed')).toHaveLength(1);
      expect(paused.events.some(e => ['chain-resolved', 'sent-to-graveyard'].includes(e.kind))).toBe(false);
      expect(s.cards[f.target]!.location.kind).toBe('graveyard');
      for (const id of f.traps) expect(s.cards[id]!.position).toBe('face-up');
      expect(s.pendingDecision).toMatchObject({ kind: 'cleanup-order', playerId: f.owner, min: 2, max: 2, optionIds: [...f.traps].reverse() });
      expect(s.timing.priorityPlayer).toBeNull(); expect(s.chainCleanup).not.toBeNull(); expect(s.chain).toHaveLength(2);
      const order = reverse ? [...f.traps].reverse() : [...f.traps];
      // Round-trip the SERVER snapshot, not a client view. This is not match persistence across restarts.
      const restored = JSON.parse(JSON.stringify(s)) as DuelState; assertDuelInvariants(restored, registry);
      const done = act(restored, f.owner, answer(restored, order));
      for (const p of done.state.players) {
        const old = s.players.find(o => o.id === p.id)!;
        expect(p.graveyard).toEqual(p.id === f.owner ? [...old.graveyard, ...order] : old.graveyard);
        expect(p.lifePoints).toBe(old.lifePoints); expect(p.hand).toEqual(old.hand); expect(p.deck).toEqual(old.deck);
        expect(p.monsters).toEqual(old.monsters); expect(p.normalSummonsOrSetsUsed).toBe(old.normalSummonsOrSetsUsed);
      }
      const cleanup = done.events.filter(e => e.kind === 'sent-to-graveyard');
      expect(cleanup).toHaveLength(1); expect(cleanup[0]).toMatchObject({ affectedInstances: [...f.traps].reverse(), details: { reason: 'trap-cleanup' } });
      expect(done.events.filter(e => e.kind === 'chain-resolved')).toHaveLength(1);
      expect(publicResolution(done.events, done.state)).toEqual([]);
      expect(done.state.chain).toEqual([]); expect(done.state.chainCleanup).toBeNull(); expect(done.state.pendingDecision).toBeNull();
      reject(done.state, f.owner, answer(s, order));
    });

  it('accepts all six orders of three real activated Trap copies', () => {
    const f = fixture('b', 'normal', 3), s = pause(f).state, [a, b, c] = f.traps as [string, string, string];
    for (const order of [[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]]) {
      const done = act(s, f.owner, answer(s, order)); expect(done.state.players.find(p => p.id === f.owner)!.graveyard.slice(-3)).toEqual(order);
    }
  });

  it.each(['missing', 'duplicate', 'extra', 'foreign', 'wrong-player', 'wrong-id', 'stale-version', 'pass', 'new-chain'])('rejects %s before any source leaves the field', mode => {
    const f = fixture(), s = pause(f).state; let who = f.owner, a: unknown = answer(s, f.traps), version = s.stateVersion;
    if (mode === 'missing') a = answer(s, f.traps.slice(1));
    if (mode === 'duplicate') a = answer(s, [f.traps[0]!, f.traps[0]!]);
    if (mode === 'extra') a = answer(s, [...f.traps, f.target]);
    if (mode === 'foreign') a = answer(s, [f.traps[0]!, f.target]);
    if (mode === 'wrong-player') who = f.actor;
    if (mode === 'wrong-id') a = { ...answer(s, f.traps), decisionId: 'old-cleanup' };
    if (mode === 'stale-version') version--;
    if (mode === 'pass') a = { type: 'pass' };
    if (mode === 'new-chain') a = { type: 'activate-trap', instanceId: f.traps[0], targetId: f.target };
    reject(s, who, a, version);
  });

  it.each(['missing-context', 'wrong-mode', 'source-order', 'fingerprint', 'owner', 'decision-options', 'decision-player', 'decision-id', 'priority', 'wrong-window', 'root-negated', 'source-snapshot', 'target', 'counter-source'])('rejects corrupted %s server state', mode => {
    const f = fixture(), s = structuredClone(pause(f).state) as Mutable<DuelState>;
    if (mode === 'missing-context') s.chainCleanup = null;
    if (mode === 'wrong-mode') s.chainCleanup!.mode = 'terminal-single-source';
    if (mode === 'source-order') s.chainCleanup!.sourceIds.reverse();
    if (mode === 'fingerprint') s.chainCleanup!.boardFingerprint = '0'.repeat(64);
    if (mode === 'owner') s.chainCleanup!.batches[0]!.ownerId = f.actor;
    if (mode === 'decision-options') s.pendingDecision!.optionIds.reverse();
    if (mode === 'decision-player') s.pendingDecision!.playerId = f.actor;
    if (mode === 'decision-id') s.pendingDecision!.id += '-old';
    if (mode === 'priority') s.timing.priorityPlayer = f.owner;
    if (mode === 'wrong-window') s.timing.window = 'chain-response';
    if (mode === 'root-negated') s.chain[0]!.activationNegated = true;
    if (mode === 'source-snapshot') s.chain[0]!.sourceAtActivation.id = 'fake';
    if (mode === 'target') s.chain[0]!.targetRefs[0]!.instanceId = f.traps[0]!;
    if (mode === 'counter-source') s.cards[f.traps[0]!]!.definition = { id: 'official:03819470', revision: registry.cards['official:03819470']!.revision };
    expect(() => assertDuelInvariants(s, registry)).toThrow();
  });

  it('concession clears the pending context without resolving cleanup or moving sources', () => {
    const f = fixture(), s = pause(f).state, done = act(s, f.actor, { type: 'concede' });
    expect(done.state.result).toEqual({ winner: f.owner, reason: 'concession' });
    expect(done.state.chainCleanup).toBeNull(); expect(done.state.chain).toEqual([]); expect(done.state.pendingDecision).toBeNull();
    for (const id of f.traps) expect(done.state.cards[id]).toEqual(s.cards[id]);
    expect(done.events.map(e => e.kind)).toEqual(['duel-ended']);
  });
});

describe.each(['a', 'b'])('private cleanup handles when %s Summons', actor => {
  it('projects only owner options, rotates handles, rejects forged orders and deduplicates receipts', () => {
    const f = fixture(actor), s = pause(f).state, room = createCommandAdapter(registry, s); let serial = 0;
    const cmd = (who: string, action: DuelAction) => { const v = room.getView(who); return { duelId: v.duelId, expectedStateVersion: v.stateVersion, commandId: 'cleanup-' + ++serial, action }; };
    const v = room.getView(f.owner, true), other = room.getView(f.actor, true), d = v.decision!;
    expect(other.decision).toBeNull(); expect(v.availableActions).toEqual([{ type: 'concede' }]); expect(other.availableActions).toEqual([{ type: 'concede' }]);
    expect(d.kind).toBe('cleanup-order'); expect(d.optionIds).toHaveLength(2);
    const serialized = JSON.stringify([v, other]);
    for (const key of ['chainCleanup', 'boardFingerprint', 'sourceIds', 'sourceAtActivation']) expect(serialized).not.toContain(key);
    for (const id of Object.keys(s.cards)) expect(serialized).not.toContain(id);
    const old = cmd(f.owner, { type: 'answer-decision', decisionId: d.id, optionIds: [...d.optionIds].reverse() });
    room.refreshView(f.owner); expect(room.submit(f.owner, old)).toMatchObject({ accepted: false, reason: 'invalid-choice' });
    const current = room.getView(f.owner), choice = current.decision!, clean = JSON.stringify(current);
    for (const options of [[choice.optionIds[0]!], [choice.optionIds[0]!, choice.optionIds[0]!], f.traps,
      [choice.optionIds[0]!, other.players.find(p => p.playerId === f.actor)!.graveyard[0]!.handle]]) {
      expect(room.submit(f.owner, cmd(f.owner, { type: 'answer-decision', decisionId: choice.id, optionIds: options })).accepted).toBe(false);
      expect(JSON.stringify(room.getView(f.owner))).toBe(clean);
    }
    const command = cmd(f.owner, { type: 'answer-decision', decisionId: choice.id, optionIds: [...choice.optionIds].reverse() });
    const receipt = room.submit(f.owner, command); expect(receipt.accepted).toBe(true);
    const after = room.getView(f.owner), prefix = v.players.find(p => p.playerId === f.owner)!.graveyard.map(c => c.visibility === 'known' ? c.definition : null);
    expect(after.players.find(p => p.playerId === f.owner)!.graveyard.slice(0, -2).map(c => c.visibility === 'known' ? c.definition : null)).toEqual(prefix);
    expect(room.submit(f.owner, command)).toEqual(receipt); expect(room.getView(f.owner)).toEqual(after);
    expect(room.getView(f.actor).activity).toEqual(after.activity); expect(after.activity.flatMap(a => a.resolution ?? [])).toEqual([]);
    const reloaded = createDuel(registry, { duelId: 'next-game', players: [{ id: 'a', deck: Object.keys(registry.cards) }, { id: 'b', deck: Object.keys(registry.cards) }] }).state;
    expect(reloaded.chainCleanup).toBeNull(); expect(reloaded.pendingDecision).toBeNull();
  });
});
