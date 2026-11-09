import type { ChainLink } from '../../protocol/src/duel.js';
import { freeze } from './registry.js';

export type CounterLifoStep = { readonly kind: 'resolve' | 'skip'; readonly linkIndex: number }
  | { readonly kind: 'negate'; readonly linkIndex: number; readonly byLinkIndex: number };

/** Shared structural schedule ONLY. Caller must validate card/review/prefix,
 * costs, timing, targets and source snapshots before using it. Speed alone never
 * grants an activation. No board, flags, receipts or input references are changed.
 */
export function prepareCounterLifoSchedule(links: readonly ChainLink[]): readonly CounterLifoStep[] {
  if (!links.length || links.length > 8 || new Set(links.map(l => l.id)).size !== links.length
    || new Set(links.map(l => l.source)).size !== links.length) throw new Error('Invalid LIFO identities/bound');
  let counterSeen = false;
  for (const [i, l] of links.entries()) {
    if (typeof l.id !== 'string' || !l.id || typeof l.source !== 'string' || !l.source || l.activationNegated !== false || l.effectNegated !== false
      || ![1, 2, 3].includes(l.spellSpeed)) throw new Error('Invalid unspent LIFO link');
    if (l.spellSpeed === 3) {
      if (!i || l.respondingToLinkId !== links[i - 1]!.id) throw new Error('LIFO Counter must answer the immediately previous activation');
      counterSeen = true;
    } else if (counterSeen || l.respondingToLinkId !== undefined || (l.spellSpeed === 1 && i !== 0)
      || (i > 0 && links[0]!.spellSpeed === 1)) throw new Error('Unsupported LIFO prefix');
  }
  const negated = new Set<number>(), steps: CounterLifoStep[] = [];
  for (let i = links.length - 1; i >= 0; i--) {
    if (negated.has(i)) { steps.push({ kind: 'skip', linkIndex: i }); continue; }
    steps.push({ kind: 'resolve', linkIndex: i });
    if (links[i]!.spellSpeed === 3) { negated.add(i - 1); steps.push({ kind: 'negate', linkIndex: i - 1, byLinkIndex: i }); }
  }
  return freeze(steps);
}
