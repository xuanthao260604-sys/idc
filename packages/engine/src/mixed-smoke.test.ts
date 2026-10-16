import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRegistry } from './registry.js';
import { runMixedSmoke } from './mixed-smoke.js';
import { assertDuelInvariants } from './duel.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const registry = createRegistry(load('../../../data/generated/pilot.json').cards, goat200508Format, {},
  load('../../../data/reviews/pilot.spell-effects.json'), load('../../../data/reviews/pilot.flip-effects.json'), load('../../../data/reviews/pilot.trap-effects.json'));
const expected = ['official:04206964', 'official:07089711', 'official:54652250', 'official:55144522', 'official:66788016'];
const seed = (n: number) => n.toString(16).padStart(64, '0');
describe('Complete mixed pilot duels through public action API, without state editing', () => {
  it.each([3, 8])('finishes seed %i with legal 40-card decks containing all 20 definitions', n => {
    const { state, events, report } = runMixedSmoke(registry, seed(n));
    expect(report.deckSize).toBe(40); expect(report.deckDefinitions).toBe(20);
    expect(state.result?.reason).toBe('life-points'); expect(report.battleDamageEvents).toBeGreaterThan(0);
    expect(report.spellActivations).toBeGreaterThan(0); expect(report.flipActivations).toBeGreaterThan(0); expect(report.trapActivations).toBeGreaterThan(0);
    expect(report.returnedToHand).toBeGreaterThan(0); expect(report.effectDestructions).toBeGreaterThan(0);
    expect(state.stateVersion).toBe(report.commands);
    expect(Object.keys(state.cards)).toHaveLength(80); assertDuelInvariants(state, registry);
    expect(Object.isFrozen(state)).toBe(true);
    expect(events.some(e => e.kind === 'duel-ended' && e.details.reason === 'concession')).toBe(false);
    expect(state.pendingDecision).toBeNull(); expect(state.chain).toHaveLength(0); expect(state.pendingTriggers).toHaveLength(0);
    if (n === 8) expect(report.activatedDefinitions).toEqual(expected);
  });
  it('repeats the same seed with identical final snapshot, report and event trace', () => {
    const first = runMixedSmoke(registry, seed(8)), second = runMixedSmoke(registry, seed(8));
    expect(second).toEqual(first);
  });
});
