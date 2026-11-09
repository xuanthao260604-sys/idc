import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupBoundedCounterCandidate } from './fixtures/bounded-counter-candidate.js';
import { validateBoundedCounterGraph } from '../packages/engine/src/bounded-counter-graph.js';
import { captureBoundedSevenLPCandidate, assertBoundedSevenLPHistory, assertCurrentBoundedSevenLPCandidate } from '../packages/engine/src/bounded-seven-lp-ledger.js';
import { assertSevenLPCostHistory } from '../packages/engine/src/seven-lp-cost-ledger.js';
import { assertDuelInvariants, applyAction } from '../packages/engine/src/duel.js';
const { registry } = loadRuntimeCatalog();
const validate = (s: Parameters<typeof validateBoundedCounterGraph>[1]) => validateBoundedCounterGraph(registry, s);
const sequences = Array.from({ length: 7 }, (_, n) => Array.from({ length: 2 ** n }, (_, bits) =>
  Array.from({ length: n }, (_, i) => bits & (1 << i) ? 'a' : 'b'))).flat().filter(s => s.filter(x => x === 'a').length <= 3 && s.filter(x => x === 'b').length <= 3);
const trapCases = [1, 2, 3].flatMap(traps => sequences.filter(s => traps + s.filter(x => x === 'b').length <= 5).map(owners => ({ traps, owners })));
const spellCases = ['a', 'b'].flatMap(actor => ['a', 'b'].flatMap(magicOwner => sequences.map(owners => ({ actor, magicOwner, owners }))));
function rehash(l: any) { const { integritySha256: _, ...body } = l; l.integritySha256 = createHash('sha256').update(JSON.stringify(body)).digest('hex'); }

describe('bounded Counter component candidates; never gameplay permission', () => {
  it('enumerates precisely the feasible copy/slot assignments from C1', () => {
    expect(sequences).toHaveLength(69); expect(trapCases).toHaveLength(172);
    expect(trapCases.filter(c => c.traps === 3)).toHaveLength(34);
  });
  it.each(trapCases)('validates Trap prefix $traps with Seven owners $owners', ({ traps, owners }) => {
    const { state } = setupBoundedCounterCandidate(registry, { traps, owners }), before = structuredClone(state);
    const graph = validate(state); expect(graph.prefixLength).toBe(traps); expect(graph.sevenCount).toBe(owners.length);
    expect(state).toEqual(before); expect(Object.isFrozen(state.cards[state.chain[0]!.source])).toBe(false);
    if (owners.length) {
      const ledger = captureBoundedSevenLPCandidate(registry, state);
      assertCurrentBoundedSevenLPCandidate(registry, state, ledger); assertBoundedSevenLPHistory(JSON.parse(JSON.stringify(ledger)));
      expect(ledger.balances.reduce((n, b) => n + b.totalPaid, 0)).toBe(owners.length * 1000);
      expect(Object.isFrozen(ledger.payments[0])).toBe(true);
    } else expect(() => captureBoundedSevenLPCandidate(registry, state)).toThrow('No bounded Seven');
  });
  it.each(spellCases)('validates Spell actor $actor Magic $magicOwner owners $owners', o => {
    const { state } = setupBoundedCounterCandidate(registry, { ...o, spellId: 'official:55144522', phase: o.actor === 'a' ? 'main1' : 'main2', handSpell: true });
    expect(validate(state)).toMatchObject({ family: 'spell-magic', prefixLength: 2, sevenCount: o.owners.length });
  });
  it.each(Object.keys(registry.spellHandlers))('validates pinned Spell root %s with costs and targets', spellId => {
    const { state } = setupBoundedCounterCandidate(registry, { spellId, owners: ['a', 'b', 'a', 'b', 'a', 'b'], magicOwner: 'a', phase: 'main2' });
    expect(validate(state).linkIds).toHaveLength(8);
    assertCurrentBoundedSevenLPCandidate(registry, state, captureBoundedSevenLPCandidate(registry, state));
  });
  it('accepts standalone Spell, both timing checkpoints, and both Trap actors without freezing caller inputs', () => {
    const { state } = setupBoundedCounterCandidate(registry, { spellId: 'official:55144522', noMagic: true, owners: [], handSpell: true });
    expect(validate(state).prefixLength).toBe(1);
    for (const actor of ['a', 'b']) {
      const f = setupBoundedCounterCandidate(registry, { actor, traps: 2, owners: ['a', 'b'], phase: 'main2' });
      const l = captureBoundedSevenLPCandidate(registry, f.state);
      f.state.timing = { ...f.state.timing, window: 'resolving', priorityPlayer: null, consecutivePasses: 2 };
      assertCurrentBoundedSevenLPCandidate(registry, f.state, l);
    }
  });
  it.each(['magic-link', 'magic-response', 'magic-speed', 'magic-cost', 'magic-discard', 'magic-target', 'spell-speed',
    'spell-controller', 'spell-cost', 'spell-target', 'spell-pin', 'spell-set-future'])('rejects Spell branch %s before capture', mode => {
    const { state: s } = setupBoundedCounterCandidate(registry, { spellId: 'official:79759861', magicOwner: 'a', owners: ['a', 'b'] });
    const root = s.chain[0]!, m = s.chain[1]!;
    if (mode === 'magic-link') m.effectId = 'normal-spell';
    if (mode === 'magic-response') m.respondingToLinkId = s.chain.at(-1)!.id;
    if (mode === 'magic-speed') m.spellSpeed = 2;
    if (mode === 'magic-cost') m.costEvents[0]!.details!.reason = 'refund';
    if (mode === 'magic-discard') m.costEvents[0]!.affectedInstances[0] = root.costEvents[0]!.affectedInstances[0]!;
    if (mode === 'magic-target') m.targetRefs.push(structuredClone(root.targetRefs[0]!));
    if (mode === 'spell-speed') root.spellSpeed = 2;
    if (mode === 'spell-controller') root.controllerId = 'b';
    if (mode === 'spell-cost') root.costEvents = [];
    if (mode === 'spell-target') root.targetRefs = [];
    if (mode === 'spell-pin') { s.cards[root.source]!.definition.revision++; root.sourceAtActivation.definition.revision++; }
    if (mode === 'spell-set-future') { s.cards[root.source]!.markers.setOnTurn = 4; root.sourceAtActivation.markers.setOnTurn = 4; }
    const before = structuredClone(s); expect(() => captureBoundedSevenLPCandidate(registry, s)).toThrow(); expect(s).toEqual(before);
  });
  it.each(['seven-on-spell', 'trap-after-seven', 'no-root', 'too-many-links', 'mixed-trap-target', 'trap-null-set', 'unknown-source', 'zero-lp', 'fractional-lp'])('rejects grammar/bound %s', mode => {
    const { state: s } = setupBoundedCounterCandidate(registry, mode === 'seven-on-spell'
      ? { spellId: 'official:55144522', noMagic: true, owners: ['a'] } : { traps: 2, owners: ['a', 'b'] });
    if (mode === 'trap-after-seven') [s.chain[1], s.chain[2]] = [s.chain[2]!, s.chain[1]!];
    if (mode === 'no-root') s.chain.shift();
    if (mode === 'too-many-links') while (s.chain.length < 9) s.chain.push(structuredClone(s.chain.at(-1)!));
    if (mode === 'mixed-trap-target') s.chain[1]!.targetRefs[0]!.instanceId = s.chain[0]!.source;
    if (mode === 'trap-null-set') { const c = s.cards[s.chain[0]!.source]!; c.markers.setOnTurn = null; s.chain[0]!.sourceAtActivation.markers.setOnTurn = null; }
    if (mode === 'unknown-source') s.chain.at(-1)!.source = 'missing';
    if (mode === 'zero-lp') s.players[0].lifePoints = 0; if (mode === 'fractional-lp') s.players[0].lifePoints = 1.5;
    const before = structuredClone(s); expect(() => validate(s)).toThrow(); expect(s).toEqual(before);
  });
  it('rejects a changed receipt and a different duel even with valid independent history', () => {
    const { state: s } = setupBoundedCounterCandidate(registry), l = captureBoundedSevenLPCandidate(registry, s);
    s.chain.at(-1)!.costEvents[0]!.sequence++; s.eventSequence++;
    assertBoundedSevenLPHistory(l); expect(() => assertCurrentBoundedSevenLPCandidate(registry, s, l)).toThrow();
    s.id = 'another-duel'; expect(() => assertCurrentBoundedSevenLPCandidate(registry, s, l)).toThrow();
  });
  it.each(['response', 'effect', 'negated', 'effect-negated', 'duplicate-link', 'duplicate-source', 'source-snapshot', 'same-turn',
    'unknown-owner', 'duplicate-zone', 'orphan', 'copy-limit', 'lp-current', 'lp-gap', 'lp-amount', 'lp-group', 'lp-sequence', 'lp-player', 'lp-extra',
    'root-target', 'root-event', 'root-cost', 'window', 'passes', 'priority', 'phase', 'turn', 'clock', 'registry', 'decision', 'result', 'context'])('rejects %s without mutation', mode => {
    const { state: s, target } = setupBoundedCounterCandidate(registry, { owners: ['a', 'b', 'a', 'b'] }), l = s.chain.at(-1)!, e = l.costEvents[0]!;
    if (mode === 'response') l.respondingToLinkId = s.chain[0]!.id;
    if (mode === 'effect') l.effectId = 'pay-1000-negate-trap-hole-activation';
    if (mode === 'negated') l.activationNegated = true; if (mode === 'effect-negated') l.effectNegated = true;
    if (mode === 'duplicate-link') l.id = s.chain[1]!.id; if (mode === 'duplicate-source') l.source = s.chain[1]!.source;
    if (mode === 'source-snapshot') l.sourceAtActivation.ownerId = 'a';
    if (mode === 'same-turn') { s.cards[l.source]!.markers.setOnTurn = 3; l.sourceAtActivation.markers.setOnTurn = 3; }
    if (mode === 'unknown-owner') s.cards[l.source]!.ownerId = 'unknown';
    if (mode === 'duplicate-zone') s.players[0].hand.push(s.players[0].deck[0]!);
    if (mode === 'orphan') s.players[0].deck.pop();
    if (mode === 'copy-limit') { const c = s.cards[s.players[0].deck.find(id => s.cards[id]!.definition.id !== 'official:03819470')!]!; c.definition = { ...s.cards[s.chain[1]!.source]!.definition }; }
    if (mode === 'lp-current') s.players[1].lifePoints++;
    if (mode === 'lp-gap') { e.details!.beforeLP = 3001; e.details!.afterLP = 2001; s.players[1].lifePoints = 2001; }
    if (mode === 'lp-amount') e.details!.amount = 999; if (mode === 'lp-group') e.simultaneousGroup = s.chain[1]!.costEvents[0]!.simultaneousGroup;
    if (mode === 'lp-sequence') e.sequence = s.chain[1]!.costEvents[0]!.sequence; if (mode === 'lp-player') e.details!.playerId = 'a'; if (mode === 'lp-extra') e.details!.refund = 0;
    if (mode === 'root-target') s.cards[target]!.position = 'face-down-defense'; if (mode === 'root-event') s.timing.lastRelevantEvents[0]!.details!.method = 'special';
    if (mode === 'root-cost') s.chain[0]!.costEvents.push(structuredClone(e));
    if (mode === 'window') s.timing.window = 'open'; if (mode === 'passes') s.timing.consecutivePasses = -1 as never;
    if (mode === 'priority') s.timing.priorityPlayer = null; if (mode === 'phase') s.turn.phase = 'battle'; if (mode === 'turn') s.turn.number = NaN;
    if (mode === 'clock') s.eventSequence = 0; if (mode === 'registry') s.cardRegistryRevision = 'old';
    if (mode === 'decision') s.pendingDecision = { id: 'x', kind: 'discard', playerId: 'a', min: 1, max: 1, optionIds: [] };
    if (mode === 'result') s.result = { winner: 'a', reason: 'concession' }; if (mode === 'context') s.spellResolution = {} as never;
    const before = structuredClone(s); expect(() => validate(s)).toThrow(); expect(s).toEqual(before); expect(Object.isFrozen(l)).toBe(false);
  });
  it.each(['duplicate', 'gap', 'unknown-player', 'balance', 'count', 'extra', 'clock'])('checks resealed ledger %s independently of its hash', mode => {
    const { state } = setupBoundedCounterCandidate(registry, { owners: ['a', 'b', 'a', 'b', 'a', 'b'] });
    const l = { ...structuredClone(captureBoundedSevenLPCandidate(registry, state)) };
    if (mode === 'duplicate') l.payments[1]!.sourceId = l.payments[0]!.sourceId;
    if (mode === 'gap') { l.payments[2]!.beforeLP += 1; l.payments[2]!.afterLP += 1; }
    if (mode === 'unknown-player') l.payments[0]!.playerId = 'foreign'; if (mode === 'balance') l.balances[0]!.totalPaid++;
    if (mode === 'count') l.balances[0]!.paymentCount = 4; if (mode === 'extra') (l as any).extra = true; if (mode === 'clock') l.capturedSequence = l.payments[0]!.sequence;
    rehash(l); const before = structuredClone(l); expect(() => assertBoundedSevenLPHistory(l)).toThrow(); expect(l).toEqual(before);
  });
  it('keeps history but rejects old board bindings after healing, receipt drift or rewind; v1 ledger rejects candidate identity', () => {
    const { state } = setupBoundedCounterCandidate(registry), l = captureBoundedSevenLPCandidate(registry, state);
    state.players[0].lifePoints += 1000; assertBoundedSevenLPHistory(l); expect(() => assertCurrentBoundedSevenLPCandidate(registry, state, l)).toThrow();
    expect(() => assertSevenLPCostHistory(l as never)).toThrow();
    state.players[0].lifePoints -= 1000; state.stateVersion++; state.eventSequence++;
    assertCurrentBoundedSevenLPCandidate(registry, state, l);
    state.stateVersion = l.capturedStateVersion - 1; expect(() => assertCurrentBoundedSevenLPCandidate(registry, state, l)).toThrow();
  });
  it('candidate kind cannot enter live v5 state or turn its Pass into a successful transition', () => {
    const { state } = setupBoundedCounterCandidate(registry, { owners: ['a', 'b', 'a', 'b', 'a', 'b'] }); validate(state);
    expect(() => assertDuelInvariants(state, registry)).toThrow();
    const before = structuredClone(state);
    expect(() => applyAction(registry, state, { actorId: state.timing.priorityPlayer!, expectedStateVersion: state.stateVersion, action: { type: 'pass' } })).toThrow();
    expect(state).toEqual(before);
  });
});
