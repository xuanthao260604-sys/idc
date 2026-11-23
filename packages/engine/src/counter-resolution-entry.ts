import type { ChainLink, DuelState } from '../../protocol/src/duel.js';
import type { Registry } from './registry.js';
import { freeze } from './registry.js';
import { resolutionFingerprint } from './resolution-fingerprint.js';
import { validateReviewedCounterGraph } from './bounded-counter-graph.js';
import { prepareCounterLifoSchedule } from './counter-lifo-schedule.js';

/** Trusted, transient server checkpoint before ANY resolution mutation. This is
 * not a paused DuelState frame, an activation receipt, authentication, or a
 * candidate journal. Costs are already paid. No caller references are frozen.
 */
export function captureCounterResolutionEntry(registry: Registry, state: DuelState) {
  if (state.timing.window !== 'resolving' || state.timing.priorityPlayer !== null || state.timing.consecutivePasses !== 2)
    throw new Error('Counter entry requires two Passes and a suspended response window');
  const graph = validateReviewedCounterGraph(registry, state);
  return freeze({ version: 1 as const, kind: 'reviewed-counter-resolution-entry-v1' as const,
    duelId: state.id, registryRevision: registry.revision, stateVersion: state.stateVersion, eventSequence: state.eventSequence,
    boardFingerprint: resolutionFingerprint(state), timing: structuredClone(state.timing),
    links: structuredClone(state.chain), graph, schedule: prepareCounterLifoSchedule(state.chain) });
}
export type CounterResolutionEntry = ReturnType<typeof captureCounterResolutionEntry>;

/** Exact pre-resolution binding, including clocks and occurrence. A later board
 * must get its own trusted checkpoint; historical payments do not rebind it.
 */
export function assertCurrentCounterResolutionEntry(registry: Registry, state: DuelState, entry: CounterResolutionEntry) {
  if (JSON.stringify(entry) !== JSON.stringify(captureCounterResolutionEntry(registry, state)))
    throw new Error('Counter resolution entry board/clock/receipt changed');
}

/** Resolver retains the validated original links while moving sources. This only
 * matches that historical graph, never asserts that the post-effect board is valid.
 */
export function counterEntrySchedule(entry: CounterResolutionEntry, originalLinks: readonly ChainLink[]) {
  if (JSON.stringify(originalLinks) !== JSON.stringify(entry.links)
    || JSON.stringify(entry.schedule) !== JSON.stringify(prepareCounterLifoSchedule(originalLinks)))
    throw new Error('Counter entry graph changed before emission');
  return entry.schedule;
}
