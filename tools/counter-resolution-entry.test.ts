import { describe, it, expect } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { setupFourLinkPrefix } from './fixtures/four-link-counter-candidate.js';
import { setupTrapThreeSevenPrefix } from './fixtures/trap-three-seven-candidate.js';
import { setupBoundedCounterCandidate } from './fixtures/bounded-counter-candidate.js';
import { captureCounterResolutionEntry, assertCurrentCounterResolutionEntry, counterEntrySchedule } from '../packages/engine/src/counter-resolution-entry.js';
import { validateBoundedCounterGraph } from '../packages/engine/src/bounded-counter-graph.js';
import { applyAction } from '../packages/engine/src/duel.js';
import type { DuelState } from '../packages/protocol/src/duel.js';
const { registry } = loadRuntimeCatalog();
const resolving = (s: DuelState) => ({ ...structuredClone(s), timing: { ...structuredClone(s.timing), window: 'resolving' as const, priorityPlayer: null, consecutivePasses: 2 as const } });
function entryState(family: 'spell' | 'trap', actor: string) {
  const f = family === 'spell' ? setupFourLinkPrefix(registry, 'official:66788016', actor) : setupTrapThreeSevenPrefix(registry, actor);
  return resolving(f.state);
}
describe('transient reviewed Counter resolution entry; live v5 only', () => {
  it.each(['a', 'b'].flatMap(actor => (['spell', 'trap'] as const).map(family => ({ actor, family }))))('captures $family/$actor without mutation or freezing caller data', ({ actor, family }) => {
    const s = entryState(family, actor), before = structuredClone(s), e = captureCounterResolutionEntry(registry, s);
    assertCurrentCounterResolutionEntry(registry, s, e);
    expect(e).toMatchObject({ kind: 'reviewed-counter-resolution-entry-v1', stateVersion: s.stateVersion, eventSequence: s.eventSequence });
    expect(e.graph.kind).toBe('reviewed-counter-graph-v1'); expect(e.links).toEqual(s.chain);
    expect(e.graph.payments).toHaveLength(family === 'spell' ? 1 : 2);
    expect(e.graph.balances.reduce((sum, b) => sum + b.totalPaid, 0)).toBe(family === 'spell' ? 1000 : 2000);
    expect(counterEntrySchedule(e, s.chain)).toBe(e.schedule); expect(s).toEqual(before);
    expect(Object.isFrozen(s.chain[0])).toBe(false); expect(Object.isFrozen(e.links[0]!.sourceAtActivation)).toBe(true);
    expect(Object.isFrozen(e.timing.lastRelevantEvents)).toBe(true);
  });
  it.each(['state-clock', 'event-clock', 'rewind', 'duel', 'board', 'lp', 'source', 'receipt', 'occurrence', 'decision', 'terminal', 'overlap', 'priority', 'passes', 'window'])('rejects checkpoint drift %s without mutation', mode => {
    const s: any = entryState('trap', 'a'), e = captureCounterResolutionEntry(registry, s);
    if (mode === 'state-clock') s.stateVersion++;
    if (mode === 'event-clock') s.eventSequence++;
    if (mode === 'rewind') s.stateVersion--;
    if (mode === 'duel') s.id += '-other';
    if (mode === 'board') s.players[0].deck.reverse();
    if (mode === 'lp') s.players[0].lifePoints++;
    if (mode === 'source') s.cards[s.chain[0].source].markers.setOnTurn++;
    if (mode === 'receipt') s.chain[1].costEvents[0].details.amount = 999;
    if (mode === 'occurrence') s.timing.lastRelevantEvents[0].sequence++;
    if (mode === 'decision') s.pendingDecision = { id: 'foreign', kind: 'effect-choice', playerId: 'a', min: 1, max: 1, optionIds: ['x'] };
    if (mode === 'terminal') s.result = { winner: 'a', reason: 'concession' };
    if (mode === 'overlap') s.counterResolution = {};
    if (mode === 'priority') s.timing.priorityPlayer = 'a';
    if (mode === 'passes') s.timing.consecutivePasses = 1;
    if (mode === 'window') s.timing.window = 'chain-response';
    const before = structuredClone(s); expect(() => assertCurrentCounterResolutionEntry(registry, s, e)).toThrow(); expect(s).toEqual(before);
  });
  it.each(['links', 'schedule', 'extra', 'kind', 'graph', 'timing'])('rejects a changed entry %s rather than trusting its metadata', mode => {
    const s = entryState('trap', 'a'), e: any = structuredClone(captureCounterResolutionEntry(registry, s));
    if (mode === 'links') e.links[1].respondingToLinkId = 'foreign';
    if (mode === 'schedule') e.schedule.reverse();
    if (mode === 'extra') e.extra = true;
    if (mode === 'kind') e.kind = 'bounded-counter-dispatcher-candidate-v1';
    if (mode === 'graph') e.graph.balances[0].totalPaid = 0;
    if (mode === 'timing') e.timing.lastRelevantEvents = [];
    expect(() => assertCurrentCounterResolutionEntry(registry, s, e)).toThrow();
  });
  it('does not let a valid component graph or candidate identity enter the live checkpoint', () => {
    for (const owners of [['a'], ['a', 'b', 'a', 'b', 'a', 'b']]) {
      const f = setupBoundedCounterCandidate(registry, { owners });
      validateBoundedCounterGraph(registry, f.state);
      const s = resolving(f.state), before = structuredClone(s);
      expect(() => captureCounterResolutionEntry(registry, s)).toThrow(); expect(s).toEqual(before);
    }
  });
  it('preserves the first Pass and captures only inside the second Pass resolution transition', () => {
    const f = setupTrapThreeSevenPrefix(registry);
    expect(() => captureCounterResolutionEntry(registry, f.state)).toThrow();
    const first = applyAction(registry, f.state, { actorId: f.state.timing.priorityPlayer!, expectedStateVersion: f.state.stateVersion, action: { type: 'pass' } });
    expect(first.accepted).toBe(true); expect(() => captureCounterResolutionEntry(registry, first.state)).toThrow();
    const next = applyAction(registry, first.state, { actorId: first.state.timing.priorityPlayer!, expectedStateVersion: first.state.stateVersion, action: { type: 'pass' } });
    expect(next.accepted).toBe(true); expect(next.state.stateVersion).toBe(first.state.stateVersion + 1);
    expect(JSON.stringify(next.state)).not.toContain('reviewed-counter-resolution-entry-v1');
  });
  it('rejects altered original links before emitting the stored schedule', () => {
    const s = entryState('spell', 'a'), e = captureCounterResolutionEntry(registry, s), links = structuredClone(s.chain);
    links[1]!.costEvents[0]!.affectedInstances = ['other-discard'];
    expect(() => counterEntrySchedule(e, links)).toThrow('graph changed');
  });
  it('rejects a changed stored schedule before emission', () => {
    const s = entryState('spell', 'a'), e: any = structuredClone(captureCounterResolutionEntry(registry, s));
    e.schedule.reverse(); expect(() => counterEntrySchedule(e, s.chain)).toThrow('graph changed');
  });
  it('keeps the new entry closed when the registry does not have the active v5 capability', () => {
    const r: any = structuredClone(registry); r.counterContinuations['official:03819470'] = 'reviewed-three-link-counter-patterns-v3';
    expect(() => captureCounterResolutionEntry(r, entryState('trap', 'a'))).toThrow('Unreviewed Counter entry');
  });
});
