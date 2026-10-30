import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, assertDuelInvariants, applyAction } from '../packages/engine/src/duel.js';
import { prepareChainCleanup, chainCleanupDecision, orderChainCleanup, commitChainCleanup } from '../packages/engine/src/chain-cleanup.js';
import type { ChainCleanupFrame } from '../packages/engine/src/chain-cleanup.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog();

// Trusted intermediate board for the movement primitive, NOT an enabled three-link
// Chain or a claim that root effects/counter-to-counter already resolve in gameplay.
function fixture(owner = 'a', otherOwner = owner, controlledBy = owner) {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'cleanup-core',
    players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: owner, seedHex: 'cb'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) {
    p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id };
  }
  const take = (name: string, who: string, controller = who, slot: Slot | null = null) => {
    const p = state.players.find(p => p.id === who)!, def = Object.values(registry.cards).find(d => d.name === name)!;
    const id = p.deck.find(id => state.cards[id]!.definition.id === def.id)!;
    if (!id) throw new Error('Missing fixture ' + name);
    p.deck.splice(p.deck.indexOf(id), 1);
    const card = state.cards[id]!;
    if (slot === null) { p.graveyard.push(id); card.location = { kind: 'graveyard', playerId: who }; }
    else {
      state.players.find(p => p.id === controller)!.spellsTraps[slot] = id;
      card.location = { kind: 'spell-trap', playerId: controller, slot }; card.controllerId = controller;
      card.markers.setOnTurn = 1;
    }
    card.position = 'face-up'; return id;
  };
  state.turn.number = 3; state.turn.phase = 'main1'; state.timing.priorityPlayer = owner;
  const spell = take('Dian Keto the Cure Master', owner, controlledBy, 0);
  const seven = take('Seven Tools of the Bandit', otherOwner, otherOwner, 4);
  // Paid costs, destroyed Counter and an effect victim are already in their Graves.
  for (const p of state.players) {
    take('Skull Servant', p.id); take('Magic Jammer', p.id); take('Battle Ox', p.id);
  }
  assertDuelInvariants(state, registry);
  state.timing.window = 'resolving'; state.timing.priorityPlayer = null;
  return { state, spell, seven, take };
}
function unchanged<T>(state: DuelState, frame: ChainCleanupFrame | null, run: () => T) {
  const before = structuredClone(state), oldFrame = structuredClone(frame);
  try { return run(); } finally { expect(state).toEqual(before); expect(frame).toEqual(oldFrame); }
}
const choose = (state: DuelState, frame: ChainCleanupFrame, who: string, order: readonly string[]) =>
  unchanged(state, frame, () => orderChainCleanup(registry, state, frame, who, order));
const commit = (state: DuelState, frame: ChainCleanupFrame) =>
  unchanged(state, frame, () => commitChainCleanup(registry, state, frame));

describe('server Chain cleanup primitive; multi-source runtime integration remains disabled', () => {
  it.each(['a', 'b'].flatMap(owner => [false, true].map(reverse => ({ owner, reverse }))))(
    '$owner chooses reverse=$reverse without moving costs, destroyed links or victims', ({ owner, reverse }) => {
      const f = fixture(owner), before = structuredClone(f.state);
      const frame = unchanged(f.state, null, () => prepareChainCleanup(registry, f.state, [f.seven, f.spell]));
      expect(chainCleanupDecision(registry, f.state, frame)).toEqual({ playerId: owner,
        optionIds: [f.seven, f.spell], min: 2, max: 2 });
      expect(() => commit(f.state, frame)).toThrow('incomplete');
      const order = reverse ? [f.spell, f.seven] : [f.seven, f.spell];
      const ordered = choose(f.state, frame, owner, order);
      expect(chainCleanupDecision(registry, f.state, ordered)).toBeNull();
      const patch = commit(f.state, ordered);
      for (const p of patch.players) {
        const old = before.players.find(o => o.id === p.id)!;
        expect(p).toEqual({ ...old, spellsTraps: p.id === owner ? [null, null, null, null, null] : old.spellsTraps,
          graveyard: p.id === owner ? [...old.graveyard, ...order] : old.graveyard });
      }
      for (const [id, card] of Object.entries(patch.cards)) expect(card).toEqual(order.includes(id)
        ? { ...before.cards[id], location: { kind: 'graveyard', playerId: owner }, controllerId: owner, position: 'face-up' }
        : before.cards[id]);
      expect(patch.players.find(p => p.id === owner)!.graveyard.at(-1)).toBe(order.at(-1));
      assertDuelInvariants({ ...f.state, ...patch, timing: { ...f.state.timing, window: 'open', priorityPlayer: owner } }, registry);
      expect(Object.isFrozen(frame)).toBe(true); expect(Object.isFrozen(ordered.batches[0]!.order)).toBe(true);
      expect(Object.isFrozen(patch.cards[f.spell])).toBe(true);
    });

  it.each(['a', 'b'])('%s and the other owner each receive one source without a shared ordering choice', owner => {
    const rival = owner === 'a' ? 'b' : 'a', f = fixture(owner, rival);
    const frame = prepareChainCleanup(registry, f.state, [f.spell, f.seven]);
    expect(chainCleanupDecision(registry, f.state, frame)).toBeNull();
    expect(() => choose(f.state, frame, owner, [f.spell, f.seven])).toThrow();
    const patch = commit(f.state, frame);
    expect(patch.players.find(p => p.id === owner)!.graveyard).toEqual([...f.state.players.find(p => p.id === owner)!.graveyard, f.spell]);
    expect(patch.players.find(p => p.id === rival)!.graveyard).toEqual([...f.state.players.find(p => p.id === rival)!.graveyard, f.seven]);
  });

  it('assigns choice and destination to the owner even when an opponent controls the source', () => {
    const f = fixture('b', 'b', 'a'), frame = prepareChainCleanup(registry, f.state, [f.spell, f.seven]);
    expect(chainCleanupDecision(registry, f.state, frame)?.playerId).toBe('b');
    expect(() => choose(f.state, frame, 'a', [f.spell, f.seven])).toThrow();
    const patch = commit(f.state, choose(f.state, frame, 'b', [f.seven, f.spell]));
    expect(patch.players[0].spellsTraps[0]).toBeNull();
    expect(patch.players[1].graveyard.slice(-2)).toEqual([f.seven, f.spell]);
    expect(patch.cards[f.spell]!.controllerId).toBe('b');
  });

  it('collects both owners’ choices before committing any source', () => {
    const f = fixture('a', 'b'), a2 = f.take('Fissure', 'a', 'a', 1), b2 = f.take('Ookazi', 'b', 'b', 1);
    const frame = prepareChainCleanup(registry, f.state, [f.seven, a2, b2, f.spell]);
    expect(chainCleanupDecision(registry, f.state, frame)?.playerId).toBe('a');
    expect(() => choose(f.state, frame, 'b', [b2, f.seven])).toThrow();
    const half = choose(f.state, frame, 'a', [f.spell, a2]);
    expect(chainCleanupDecision(registry, f.state, half)?.playerId).toBe('b');
    expect(() => commit(f.state, half)).toThrow('incomplete');
    const full = choose(f.state, half, 'b', [b2, f.seven]), patch = commit(f.state, full);
    expect(patch.players[0].graveyard).toEqual([...f.state.players[0].graveyard, f.spell, a2]);
    expect(patch.players[1].graveyard).toEqual([...f.state.players[1].graveyard, b2, f.seven]);
    expect(() => choose(f.state, full, 'b', [f.seven, b2])).toThrow();
  });

  it.each(['missing', 'duplicate', 'extra', 'foreign-source', 'old-grave-card', 'wrong-owner'])('rejects %s choice before movement', mode => {
    const f = fixture(), frame = prepareChainCleanup(registry, f.state, [f.spell, f.seven]);
    const order = mode === 'missing' ? [f.spell] : mode === 'duplicate' ? [f.spell, f.spell]
      : mode === 'extra' ? [f.spell, f.seven, 'extra'] : mode === 'foreign-source' ? [f.spell, 'unknown']
      : mode === 'old-grave-card' ? [f.spell, f.state.players[0].graveyard[0]!] : [f.spell, f.seven];
    expect(() => choose(f.state, frame, mode === 'wrong-owner' ? 'b' : 'a', order)).toThrow();
  });

  it.each(['source-moved', 'old-grave-order', 'life-points', 'turn', 'duel-id', 'registry', 'other-card', 'chain', 'battle'])('rejects changed %s context', mode => {
    const f = fixture(), frame = prepareChainCleanup(registry, f.state, [f.spell, f.seven]);
    const ordered = choose(f.state, frame, 'a', [f.seven, f.spell]), drift = structuredClone(f.state);
    if (mode === 'source-moved') drift.cards[f.spell]!.position = 'face-down';
    if (mode === 'old-grave-order') drift.players[0].graveyard.reverse();
    if (mode === 'life-points') drift.players[0].lifePoints--;
    if (mode === 'turn') drift.turn.number++;
    if (mode === 'duel-id') drift.id += '-new';
    if (mode === 'registry') drift.cardRegistryRevision += '-new';
    if (mode === 'other-card') drift.cards[drift.players[1].deck[0]!]!.markers.attackDeclarationsThisTurn++;
    if (mode === 'chain') drift.chain.push({ id: 'another-chain', controllerId: 'a', source: f.spell,
      sourceAtActivation: structuredClone(drift.cards[f.spell]!), effectId: 'normal-spell', spellSpeed: 1,
      costEvents: [], targetRefs: [], activationNegated: false, effectNegated: false });
    if (mode === 'battle') drift.battle = { step: 'battle', attacker: null, target: null,
      damageTiming: null, ordinaryDamageChainUsed: false, replayPending: false };
    expect(() => commit(drift, ordered)).toThrow();
    expect(() => choose(drift, frame, 'a', [f.seven, f.spell])).toThrow();
  });

  it.each(['wrong-owner', 'missing-batch', 'foreign-batch', 'duplicate-order', 'changed-members', 'bad-fingerprint', 'unknown-field', 'pre-answered-owner'])('rejects structurally corrupted %s frame', mode => {
    const f = fixture('a', 'b'), a2 = f.take('Fissure', 'a', 'a', 1), b2 = f.take('Ookazi', 'b', 'b', 1);
    const frame = prepareChainCleanup(registry, f.state, [f.spell, f.seven, a2, b2]);
    const bad = structuredClone(frame) as Mutable<ChainCleanupFrame> & { extra?: boolean };
    if (mode === 'wrong-owner') bad.batches[0]!.ownerId = 'b';
    if (mode === 'missing-batch') bad.batches.pop();
    if (mode === 'foreign-batch') bad.batches[0]!.sourceIds.push(f.seven);
    if (mode === 'duplicate-order') bad.batches[0]!.order = [f.spell, f.spell];
    if (mode === 'changed-members') bad.sourceIds[0] = f.seven;
    if (mode === 'bad-fingerprint') bad.boardFingerprint = '0'.repeat(64);
    if (mode === 'unknown-field') bad.extra = true;
    if (mode === 'pre-answered-owner') bad.batches[1]!.order = [b2, f.seven];
    expect(() => unchanged(f.state, bad, () => chainCleanupDecision(registry, f.state, bad))).toThrow();
    expect(() => commit(f.state, bad)).toThrow();
  });

  it.each(['empty', 'duplicate', 'missing', 'face-down', 'already-in-grave', 'wrong-slot', 'duplicate-zone', 'monster', 'pending-choice', 'pending-trigger', 'response-window', 'priority'])('rejects invalid %s preparation', mode => {
    const f = fixture(); let sources = [f.spell, f.seven];
    if (mode === 'empty') sources = [];
    if (mode === 'duplicate') sources = [f.spell, f.spell];
    if (mode === 'missing') sources = ['missing'];
    if (mode === 'face-down') f.state.cards[f.spell]!.position = 'face-down';
    if (mode === 'already-in-grave') sources = [f.state.players[0].graveyard[0]!];
    if (mode === 'wrong-slot') f.state.players[0].spellsTraps[0] = null;
    if (mode === 'duplicate-zone') f.state.players[0].hand.push(f.spell);
    if (mode === 'monster') sources = [f.state.players[0].deck.find(id => registry.cards[f.state.cards[id]!.definition.id]!.kind === 'normal-monster')!];
    if (mode === 'pending-choice') f.state.pendingDecision = { id: 'root-choice', playerId: 'a', kind: 'effect-choice', optionIds: [], min: 1, max: 1 };
    if (mode === 'pending-trigger') f.state.pendingTriggers.push({ source: f.spell, sourceAtTrigger: f.state.cards[f.spell]!, effectId: 'unresolved', controllerAtTrigger: 'a',
      occurrence: { sequence: 1, simultaneousGroup: 'unresolved', kind: 'unresolved', affectedInstances: [] }, mandatory: true, timingPolicy: 'mandatory' });
    if (mode === 'response-window') f.state.timing.window = 'chain-response';
    if (mode === 'priority') f.state.timing.priorityPlayer = 'a';
    expect(() => unchanged(f.state, null, () => prepareChainCleanup(registry, f.state, sources))).toThrow();
  });

  it('cannot apply a committed batch twice to the resulting board', () => {
    const f = fixture(), frame = prepareChainCleanup(registry, f.state, [f.spell, f.seven]);
    const ordered = choose(f.state, frame, 'a', [f.seven, f.spell]), patch = commit(f.state, ordered);
    const after = { ...f.state, ...patch };
    expect(() => commit(after, ordered)).toThrow('changed');
    expect(() => prepareChainCleanup(registry, after, [f.spell, f.seven])).toThrow();
    expect(after.players[0].graveyard.filter(id => id === f.spell)).toHaveLength(1);
    expect(after.players[0].graveyard.filter(id => id === f.seven)).toHaveLength(1);
  });

  it('permits only explicit single-source bookkeeping after a duel ends', () => {
    const f = fixture(); f.state.result = { winner: 'a', reason: 'life-points' };
    f.state.timing.window = 'open';
    expect(() => prepareChainCleanup(registry, f.state, [f.spell])).toThrow();
    expect(() => prepareChainCleanup(registry, f.state, [f.spell, f.seven], 'terminal-single-source')).toThrow();
    const frame = prepareChainCleanup(registry, f.state, [f.spell], 'terminal-single-source');
    expect(chainCleanupDecision(registry, f.state, frame)).toBeNull();
    expect(commit(f.state, frame).players[0].graveyard).toEqual([...f.state.players[0].graveyard, f.spell]);
    const live = fixture(); expect(() => prepareChainCleanup(registry, live.state, [live.spell], 'terminal-single-source')).toThrow();
  });

  it.each(['concession', 'effect', 'simultaneous-loss'] as const)('does not invent cleanup bookkeeping for terminal reason %s', reason => {
    const f = fixture(); f.state.result = { winner: reason === 'simultaneous-loss' ? null : 'b', reason };
    f.state.timing.window = 'open';
    expect(() => unchanged(f.state, null, () => prepareChainCleanup(registry, f.state, [f.spell], 'terminal-single-source'))).toThrow();
  });

  it('does not freeze a caller-owned deserialized frame while recording an order', () => {
    const f = fixture(), frame = structuredClone(prepareChainCleanup(registry, f.state, [f.spell, f.seven]));
    const ordered = choose(f.state, frame, 'a', [f.seven, f.spell]);
    expect(Object.isFrozen(frame)).toBe(false); expect(Object.isFrozen(frame.sourceIds)).toBe(false);
    expect(Object.isFrozen(frame.batches[0])).toBe(false); expect(Object.isFrozen(ordered)).toBe(true);
    expect(Object.isFrozen(ordered.sourceIds)).toBe(true);
  });

  it('accepts all 120 permutations of five remaining sources while preserving the entire old Graveyard prefix', () => {
    const f = fixture(), sources = [f.spell, f.seven, f.take('Fissure', 'a', 'a', 1),
      f.take('Ookazi', 'a', 'a', 2), f.take('Earthquake', 'a', 'a', 3)];
    const permutations = (xs: string[]): string[][] => xs.length ? xs.flatMap((id, i) =>
      permutations(xs.filter((_, j) => i !== j)).map(rest => [id, ...rest])) : [[]];
    const frame = prepareChainCleanup(registry, f.state, sources), orders = permutations(sources);
    expect(orders).toHaveLength(120);
    for (const order of orders) {
      const patch = commit(f.state, choose(f.state, frame, 'a', order));
      expect(patch.players[0].graveyard).toEqual([...f.state.players[0].graveyard, ...order]);
      expect(patch.players[0].spellsTraps).toEqual([null, null, null, null, null]);
      expect(patch.players[1]).toEqual(f.state.players[1]);
    }
  });
});

describe('single-source live integration retains existing Spell resolution semantics', () => {
  it.each(['Dian Keto the Cure Master', 'Ookazi', 'Pot of Greed'])('%s emits one cleanup group after resolving once', name => {
    const f = fixture(), old = f.state.cards[f.spell]!;
    const desired = Object.values(registry.cards).find(c => c.name === name)!;
    // Restore the helper fixture to a valid open engine state, with the requested root in hand.
    f.state.players[0].spellsTraps[0] = null;
    f.state.players[0].hand.push(f.spell); old.location = { kind: 'hand', playerId: 'a' }; old.position = 'face-down';
    if (old.definition.id !== desired.id) {
      const replacement = f.state.players[0].deck.find(id => f.state.cards[id]!.definition.id === desired.id)!;
      const card = f.state.cards[replacement]!, definition = { ...card.definition };
      card.definition = { ...old.definition }; old.definition = definition;
    }
    f.state.timing.window = 'open'; f.state.timing.priorityPlayer = 'a';
    if (name === 'Ookazi') f.state.players[1].lifePoints = 800;
    if (name === 'Pot of Greed') {
      const p = f.state.players[0];
      for (const id of p.deck.splice(0)) { p.graveyard.push(id); f.state.cards[id]!.location = { kind: 'graveyard', playerId: 'a' }; f.state.cards[id]!.position = 'face-up'; }
    }
    assertDuelInvariants(f.state, registry);
    const act = (s: DuelState, actorId: string, action: EngineAction) => {
      const before = structuredClone(s), r = applyAction(registry, s, { actorId, expectedStateVersion: s.stateVersion, action });
      expect(s).toEqual(before); if (!r.accepted) throw new Error(r.message); assertDuelInvariants(r.state, registry); return r;
    };
    let s = act(f.state, 'a', { type: 'activate-spell', instanceId: f.spell, slot: 0 }).state;
    s = act(s, 'b', { type: 'pass' }).state;
    const done = act(s, 'a', { type: 'pass' });
    expect(done.events.filter(e => e.kind === 'sent-to-graveyard')).toEqual([expect.objectContaining({ affectedInstances: [f.spell], details: { reason: 'spell-cleanup' } })]);
    expect(done.events.filter(e => e.kind === 'chain-resolved')).toHaveLength(1);
    expect(done.state.chain).toEqual([]); expect(done.state.pendingDecision).toBeNull();
    expect(done.state.players[0].graveyard.at(-1)).toBe(f.spell);
    if (name === 'Dian Keto the Cure Master') { expect(done.state.players[0].lifePoints).toBe(9000); expect(done.state.result).toBeNull(); }
    if (name === 'Ookazi') expect(done.state.result).toEqual({ winner: 'a', reason: 'life-points' });
    if (name === 'Pot of Greed') expect(done.state.result).toEqual({ winner: 'b', reason: 'failed-draw' });
  });
});
