import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupBoundedCounterCandidate } from './fixtures/bounded-counter-candidate.js';
import { boundedCounterOracle } from './fixtures/bounded-counter-oracle.js';
import { prepareBoundedCounterCandidate, resumeBoundedCounterCandidate, assertBoundedCounterCandidate } from '../packages/engine/src/bounded-counter-dispatcher.js';
import { assertBoundedSevenLPHistory, assertCurrentBoundedSevenLPCandidate } from '../packages/engine/src/bounded-seven-lp-ledger.js';
import { assertDuelInvariants, applyAction } from '../packages/engine/src/duel.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
const { registry } = loadRuntimeCatalog();
const sequences = Array.from({ length: 7 }, (_, n) => Array.from({ length: 2 ** n }, (_, b) => Array.from({ length: n }, (_, i) => b & (1 << i) ? 'a' : 'b')))
  .flat().filter(s => s.filter(w => w === 'a').length <= 3 && s.filter(w => w === 'b').length <= 3);
const traps = [1, 2, 3].flatMap(k => sequences.filter(s => k + s.filter(w => w === 'b').length <= 5).map(owners => ({ traps: k, owners })));
const spells = ['a', 'b'].flatMap(actor => ['a', 'b'].flatMap(magicOwner => sequences.map(owners => ({ actor, magicOwner, owners }))));
function fixture(o: Parameters<typeof setupBoundedCounterCandidate>[1] = {}) {
  const f = setupBoundedCounterCandidate(registry, o);
  f.state.timing = { ...f.state.timing, window: 'resolving', priorityPlayer: null, consecutivePasses: 2 }; return f;
}
type Output = ReturnType<typeof prepareBoundedCounterCandidate>;
function finish(p: Output, reverse = false): Output {
  for (let n = 0; p.state.pendingDecision; n++) {
    expect(n).toBeLessThan(4); const d = p.state.pendingDecision;
    p = resumeBoundedCounterCandidate(registry, p.state, p.journal, { kind: 'choose', playerId: d.playerId, decisionId: d.id,
      optionIds: d.kind === 'effect-choice' ? [d.optionIds[0]!] : reverse ? [...d.optionIds].reverse() : [...d.optionIds] });
  }
  assertBoundedCounterCandidate(registry, p.state, p.journal); return p;
}
function addTie(s: ReturnType<typeof fixture>['state']) {
  const p = s.players.find(p => p.id !== s.turn.activePlayer)!, original = Object.values(registry.cards).find(c => c.name === 'Battle Ox')!;
  const id = p.deck.find(id => registry.cards[s.cards[id]!.definition.id]!.kind === 'normal-monster')!, c = s.cards[id]!;
  p.deck.splice(p.deck.indexOf(id), 1); c.definition = { id: original.id, revision: original.revision };
  const slot = p.monsters.indexOf(null) as Slot; p.monsters[slot] = id; c.location = { kind: 'monster', playerId: p.id, slot }; c.position = 'face-up-attack'; return id;
}
function reseal(j: any) { const { integritySha256: _, ...body } = j; j.integritySha256 = createHash('sha256').update(JSON.stringify(body)).digest('hex'); }

describe('bounded Counter LIFO dispatcher and replay journal, isolated candidate only', () => {
  it.each(traps)('oracle agrees for $traps Trap prefix / $owners Seven', o => {
    const f = fixture(o), original = structuredClone(f.state), oracle = boundedCounterOracle(f.state.chain), p = prepareBoundedCounterCandidate(registry, f.state);
    expect(p.journal.trace.filter(t => t.kind === 'resolve').map(t => t.linkId)).toEqual(oracle.resolved);
    expect(p.journal.trace.filter(t => t.kind === 'negate').map(t => t.linkId)).toEqual(oracle.negated);
    const end = finish(p, o.owners.length % 2 === 0);
    expect(end.state.cards[f.target]!.location.kind).toBe(o.traps === 1 && o.owners.length % 2 ? 'monster' : 'graveyard');
    expect(end.state.players.map(p => p.lifePoints)).toEqual(original.players.map(p => p.lifePoints));
    for (const l of original.chain) expect(end.state.players.flatMap(p => p.graveyard).filter(id => id === l.source)).toHaveLength(1);
    expect(f.state).toEqual(original); expect(Object.isFrozen(f.state.cards[f.target])).toBe(false);
  });
  it.each(spells)('oracle agrees for Spell $actor Magic $magicOwner / Seven $owners', o => {
    const f = fixture({ ...o, spellId: 'official:55144522', handSpell: true }), oracle = boundedCounterOracle(f.state.chain), p = prepareBoundedCounterCandidate(registry, f.state);
    expect(p.journal.trace.filter(t => t.kind === 'resolve').map(t => t.linkId)).toEqual(oracle.resolved);
    expect(p.journal.trace.filter(t => t.kind === 'negate').map(t => t.linkId)).toEqual(oracle.negated);
    const end = finish(p, true), before = f.state.players.find(p => p.id === o.actor)!, after = end.state.players.find(p => p.id === o.actor)!;
    expect(after.hand.length - before.hand.length).toBe(o.owners.length % 2 ? 2 : 0);
    expect(after.deck.length - before.deck.length).toBe(o.owners.length % 2 ? -2 : 0);
    if (end.journal.lpCosts) assertBoundedSevenLPHistory(end.journal.lpCosts);
  });
  it.each(Object.keys(registry.spellHandlers).flatMap(spellId => [1, 2, 5, 6].map(n => ({ spellId, n }))))('dispatches all reviewed plans $spellId / $n Seven', ({ spellId, n }) => {
    const owners = Array.from({ length: n }, (_, i) => i % 2 ? 'b' : 'a'), f = fixture({ spellId, owners }), input = structuredClone(f.state);
    const end = finish(prepareBoundedCounterCandidate(registry, f.state));
    expect(end.journal.stage).toBe(['official:19523799', 'official:46130346'].includes(spellId) && n % 2 ? 'terminal' : 'done');
    const rootResolved = end.journal.trace.some(t => t.kind === 'resolve' && t.linkId === input.chain[0]!.id);
    expect(rootResolved).toBe(n % 2 === 1); expect(f.state).toEqual(input);
    if (spellId === 'official:84257639' && n % 2) {
      expect(end.state.players[0].lifePoints).toBe(input.players[0].lifePoints + 1000);
      assertBoundedSevenLPHistory(end.journal.lpCosts!);
      expect(() => assertCurrentBoundedSevenLPCandidate(registry, end.state, end.journal.lpCosts!)).toThrow();
    }
  });
  it.each(['official:66788016', 'official:97169186', 'official:26412047'])('pauses once for %s root choice then performs owner cleanup', spellId => {
    const f = fixture({ spellId, owners: ['a'] }), extra = addTie(f.state), p = prepareBoundedCounterCandidate(registry, f.state), d = p.state.pendingDecision!;
    expect(p.journal.stage).toBe('root-choice'); expect(d.optionIds).toContain(extra); expect(d.playerId).toBe('a');
    expect(p.journal.trace.filter(t => t.kind === 'resolve' && t.linkId === f.state.chain[0]!.id)).toHaveLength(1);
    const next = resumeBoundedCounterCandidate(registry, p.state, p.journal, { kind: 'choose', playerId: d.playerId, decisionId: d.id, optionIds: [extra] });
    expect(next.state.cards[extra]!.location.kind).toBe('graveyard');
    expect(next.journal.stage).toBe('cleanup'); expect(next.state.pendingDecision!.id).not.toBe(d.id);
    expect(() => resumeBoundedCounterCandidate(registry, next.state, next.journal, { kind: 'choose', playerId: d.playerId, decisionId: d.id, optionIds: [extra] })).toThrow();
    const end = finish(next, true); expect(end.journal.trace.filter(t => t.kind === 'resolve' && t.linkId === f.state.chain[0]!.id)).toHaveLength(1);
  });
  it.each([0, 1, 2])('required draw from %s cards keeps multi-source terminal bookkeeping separate', remaining => {
    const f = fixture({ spellId: 'official:55144522', owners: ['a'] }), owner = f.state.players[0];
    while (owner.deck.length > remaining) { const id = owner.deck.pop()!; owner.graveyard.push(id); f.state.cards[id]!.location = { kind: 'graveyard', playerId: owner.id }; f.state.cards[id]!.position = 'face-up'; }
    const end = finish(prepareBoundedCounterCandidate(registry, f.state));
    expect(end.journal.trace.filter(t => t.kind === 'draw')).toHaveLength(Math.min(remaining, 2));
    if (remaining < 2) {
      expect(end.state.result).toEqual({ winner: 'b', reason: 'failed-draw' }); expect(end.state.pendingDecision).toBeNull();
      expect(end.state.chain).toEqual([]); expect(end.journal.trace.some(t => t.kind === 'cleanup')).toBe(false);
      expect(end.state.cards[f.state.chain[0]!.source]!.location.kind).toBe('spell-trap');
    } else expect(end.state.result).toBeNull();
  });
  it('single-source failed draw retains its existing terminal cleanup rule', () => {
    const f = fixture({ spellId: 'official:55144522', owners: [], noMagic: true });
    const p = f.state.players[0]; for (const id of p.deck.splice(0)) { p.graveyard.push(id); f.state.cards[id]!.location = { kind: 'graveyard', playerId: p.id }; }
    const end = prepareBoundedCounterCandidate(registry, f.state); assertBoundedCounterCandidate(registry, end.state, end.journal);
    expect(end.state.result?.reason).toBe('failed-draw'); expect(end.state.cards[f.state.chain[0]!.source]!.location.kind).toBe('graveyard');
  });
  it('collects both owners before committing cleanup, preserves old graveyard prefixes and every instance once', () => {
    const f = fixture({ traps: 2, owners: ['a', 'b', 'b', 'a', 'b', 'a'] }), p = prepareBoundedCounterCandidate(registry, f.state), d = p.state.pendingDecision!;
    expect(p.journal.stage).toBe('cleanup'); expect(d.playerId).toBe('a');
    const half = resumeBoundedCounterCandidate(registry, p.state, p.journal, { kind: 'choose', playerId: d.playerId, decisionId: d.id, optionIds: [...d.optionIds].reverse() });
    expect(half.journal.stage).toBe('cleanup'); expect(half.state.players.map(p => p.graveyard)).toEqual(p.state.players.map(p => p.graveyard));
    const end = finish(half, true);
    for (const old of p.state.players) expect(end.state.players.find(p => p.id === old.id)!.graveyard.slice(0, old.graveyard.length)).toEqual(old.graveyard);
    expect(new Set(end.state.players.flatMap(p => [...p.deck, ...p.hand, ...p.graveyard, ...p.monsters, ...p.spellsTraps].filter(Boolean))).size).toBe(Object.keys(end.state.cards).length);
  });
  it.each(['a', 'b'])('concede by %s while root choice pending does not resolve or cleanup another source', who => {
    const f = fixture({ spellId: 'official:66788016', owners: ['a'] }); addTie(f.state);
    const p = prepareBoundedCounterCandidate(registry, f.state), end = resumeBoundedCounterCandidate(registry, p.state, p.journal, { kind: 'concede', playerId: who });
    expect(end.state.result).toEqual({ winner: who === 'a' ? 'b' : 'a', reason: 'concession' }); expect(end.state.pendingDecision).toBeNull(); expect(end.state.chainCleanup).toBeNull();
    expect(end.state.cards).toEqual(p.state.cards); expect(end.state.players).toEqual(p.state.players); assertBoundedCounterCandidate(registry, end.state, end.journal);
  });
  it.each(['lp', 'source', 'target', 'version', 'decision', 'trace', 'stage', 'cursor', 'ledger', 'survivors', 'answers'])('rejects drift %s, even after resealing journal', mode => {
    const f = fixture({ spellId: 'official:66788016', owners: ['a'] }); addTie(f.state);
    const p = prepareBoundedCounterCandidate(registry, f.state), s: any = structuredClone(p.state), j: any = structuredClone(p.journal);
    if (mode === 'lp') s.players[0].lifePoints++; if (mode === 'source') s.cards[f.state.chain[0]!.source].position = 'face-down';
    if (mode === 'target') s.cards[f.target].position = 'face-down-defense'; if (mode === 'version') s.stateVersion--;
    if (mode === 'decision') s.pendingDecision.playerId = 'b'; if (mode === 'trace') j.trace.pop(); if (mode === 'stage') j.stage = 'done';
    if (mode === 'cursor') j.cursor = 1; if (mode === 'ledger') j.lpCosts.payments[0].amount = 999;
    if (mode === 'survivors') j.cleanupSourceIds.push('fake'); if (mode === 'answers') j.answers.push({ kind: 'concede', playerId: 'a' });
    reseal(j); const original = structuredClone({ s, j }); expect(() => assertBoundedCounterCandidate(registry, s, j)).toThrow(); expect({ s, j }).toEqual(original);
  });
  it('rejects private/wrong/partial choices and stale state; round-trips JSON without freezing caller-owned input', () => {
    const f = fixture({ traps: 2, owners: ['a', 'b', 'b', 'a', 'b', 'a'] }), prepared = prepareBoundedCounterCandidate(registry, f.state);
    const p = JSON.parse(JSON.stringify(prepared)) as Output, d = p.state.pendingDecision!; assertBoundedCounterCandidate(registry, p.state, p.journal);
    for (const a of [{ kind: 'choose', playerId: 'b', decisionId: d.id, optionIds: [...d.optionIds] },
      { kind: 'choose', playerId: d.playerId, decisionId: d.id, optionIds: [d.optionIds[0]!] },
      { kind: 'choose', playerId: d.playerId, decisionId: d.id, optionIds: [d.optionIds[0]!, d.optionIds[0]!] }])
      expect(() => resumeBoundedCounterCandidate(registry, p.state, p.journal, a as never)).toThrow();
    expect(Object.isFrozen(p.state.cards)).toBe(false); expect(Object.isFrozen(p.journal.entry)).toBe(false);
    const end = finish(p); expect(() => resumeBoundedCounterCandidate(registry, end.state, p.journal, { kind: 'choose', playerId: d.playerId, decisionId: d.id, optionIds: [...d.optionIds] })).toThrow();
  });
  it('rejects prepare before two Passes and cannot expose a paused candidate through live invariants', () => {
    const f = fixture({ spellId: 'official:66788016', owners: ['a'] }); addTie(f.state);
    const p = prepareBoundedCounterCandidate(registry, f.state); expect(() => assertDuelInvariants(p.state, registry)).toThrow();
    f.state.timing.window = 'chain-response'; f.state.timing.priorityPlayer = 'a'; f.state.timing.consecutivePasses = 1;
    expect(() => prepareBoundedCounterCandidate(registry, f.state)).toThrow('two Passes');
  });
  it.each(Object.keys(registry.spellHandlers).flatMap(spellId => ['a', 'b'].map(actor => ({ spellId, actor }))))('root effects agree with existing live single-Spell resolver $spellId / $actor', ({ spellId, actor }) => {
    const f = fixture({ spellId, actor, owners: [actor] }), candidate = finish(prepareBoundedCounterCandidate(registry, f.state));
    // Counter receipts are component-only. Build a separate trusted single-root
    // reference board with the same already-paid LP/discards, not a new activation.
    const reference = structuredClone(f.state), sources = new Set(reference.chain.map(l => l.source));
    for (const l of reference.chain.slice(1)) {
      const c = reference.cards[l.source]!, p = reference.players.find(p => p.id === c.ownerId)!;
      if (c.location.kind !== 'spell-trap') throw new Error('Expected reference field source');
      p.spellsTraps[c.location.slot] = null; p.graveyard.push(c.id); c.location = { kind: 'graveyard', playerId: p.id };
    }
    reference.chain = reference.chain.slice(0, 1);
    reference.timing = { ...reference.timing, window: 'chain-response', priorityPlayer: actor, consecutivePasses: 1 };
    assertDuelInvariants(reference, registry);
    const pass = applyAction(registry, reference, { actorId: actor, expectedStateVersion: reference.stateVersion, action: { type: 'pass' } });
    expect(pass.accepted).toBe(true); let live = pass.state;
    if (live.pendingDecision) {
      const d = live.pendingDecision, answer = applyAction(registry, live, { actorId: d.playerId, expectedStateVersion: live.stateVersion,
        action: { type: 'answer-decision', decisionId: d.id, optionIds: [d.optionIds[0]!] } });
      expect(answer.accepted).toBe(true); live = answer.state;
    }
    expect(candidate.state.result).toEqual(live.result);
    for (const p of live.players) {
      const actual = candidate.state.players.find(x => x.id === p.id)!;
      expect({ lp: actual.lifePoints, hand: actual.hand, deck: actual.deck, monsters: actual.monsters, quota: actual.normalSummonsOrSetsUsed })
        .toEqual({ lp: p.lifePoints, hand: p.hand, deck: p.deck, monsters: p.monsters, quota: p.normalSummonsOrSetsUsed });
      expect(actual.graveyard.filter(id => !sources.has(id))).toEqual(p.graveyard.filter(id => !sources.has(id)));
    }
    for (const [id, card] of Object.entries(live.cards)) if (!sources.has(id)) expect(candidate.state.cards[id]).toEqual(card);
  });
  it('rejects clock and LP overflow without changing a caller snapshot', () => {
    for (const mode of ['version', 'sequence', 'heal']) {
      const f = fixture({ spellId: 'official:84257639', noMagic: true, owners: [] });
      if (mode === 'version') f.state.stateVersion = Number.MAX_SAFE_INTEGER;
      if (mode === 'sequence') f.state.eventSequence = Number.MAX_SAFE_INTEGER;
      if (mode === 'heal') f.state.players[0].lifePoints = Number.MAX_SAFE_INTEGER;
      const before = structuredClone(f.state); expect(() => prepareBoundedCounterCandidate(registry, f.state)).toThrow(); expect(f.state).toEqual(before);
    }
  });
  it('cannot select a later Magic Jammer discard as the earlier Reincarnation target', () => {
    const f = fixture({ spellId: 'official:74848038', magicOwner: 'a', owners: ['a'] }), root = f.state.chain[0]!, later = f.state.chain[1]!.costEvents[0]!.affectedInstances[0]!;
    root.targetRefs = [{ instanceId: later, locationAtSelection: { kind: 'graveyard', playerId: 'a' } }];
    const before = structuredClone(f.state); expect(() => prepareBoundedCounterCandidate(registry, f.state)).toThrow('later activation'); expect(f.state).toEqual(before);
  });
  it.each(['a', 'b'])('concede by %s after one owner ordered cleanup never commits either batch', playerId => {
    const f = fixture({ traps: 2, owners: ['a', 'b', 'b', 'a', 'b', 'a'] }), p = prepareBoundedCounterCandidate(registry, f.state), d = p.state.pendingDecision!;
    const half = resumeBoundedCounterCandidate(registry, p.state, p.journal, { kind: 'choose', playerId: d.playerId, decisionId: d.id, optionIds: [...d.optionIds].reverse() });
    const end = resumeBoundedCounterCandidate(registry, half.state, half.journal, { kind: 'concede', playerId });
    expect(end.state.players).toEqual(half.state.players); expect(end.state.cards).toEqual(half.state.cards);
    expect(end.state.chainCleanup).toBeNull(); expect(end.state.pendingDecision).toBeNull(); expect(end.journal.stage).toBe('terminal');
    assertBoundedCounterCandidate(registry, end.state, end.journal);
  });
  it('re-evaluating the same trusted checkpoint is deterministic, but answering a completed checkpoint is rejected', () => {
    const f = fixture({ traps: 2, owners: ['a', 'b', 'b', 'a', 'b', 'a'] }), p = prepareBoundedCounterCandidate(registry, f.state), d = p.state.pendingDecision!;
    const a = { kind: 'choose' as const, playerId: d.playerId, decisionId: d.id, optionIds: [...d.optionIds] };
    const next = resumeBoundedCounterCandidate(registry, p.state, p.journal, a);
    expect(resumeBoundedCounterCandidate(registry, p.state, p.journal, a)).toEqual(next);
    const end = finish(next); expect(() => resumeBoundedCounterCandidate(registry, end.state, end.journal, a)).toThrow('already finished');
  });
});
