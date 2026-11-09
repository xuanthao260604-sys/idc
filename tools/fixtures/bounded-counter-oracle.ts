import type { ChainLink } from '../../packages/protocol/src/duel.js';

/** Test-only reduction oracle, independent of candidate cursor/negation flags.
 * Removes a Counter and the activation it cancels, then evaluates the shorter
 * expression. No production dispatcher, graph checker, ledger or board operations.
 */
export function boundedCounterOracle(links: readonly ChainLink[]): { resolved: string[]; negated: string[] } {
  const top = links.at(-1);
  if (!top) return { resolved: [], negated: [] };
  if (top.spellSpeed === 3) {
    const previous = links.at(-2);
    if (!previous || top.respondingToLinkId !== previous.id) throw new Error('Oracle requires a direct Counter response');
    const tail = boundedCounterOracle(links.slice(0, -2));
    return { resolved: [top.id, ...tail.resolved], negated: [previous.id, ...tail.negated] };
  }
  const tail = boundedCounterOracle(links.slice(0, -1));
  return { resolved: [top.id, ...tail.resolved], negated: tail.negated };
}
