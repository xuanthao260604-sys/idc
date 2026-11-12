import { createHash } from 'node:crypto';
import { CounterReviewsSchema } from './counter-review.js';
import { COUNTER_CONTINUATION_PINS } from './counter-continuation.js';
import { definitionFingerprint } from './spell-review.js';
import { freeze } from './registry.js';
import type { Registry, SpellHandler } from './registry.js';

export const BOUNDED_COUNTER_SCOPE = 'counter-trap-reviewed-bounded-patterns-v6';
export const BOUNDED_COUNTER_CONTINUATION = 'reviewed-bounded-counter-patterns-v6';
const SEVEN = 'official:03819470', MAGIC = 'official:77414722', TRAP = 'official:04206964';
const TRAP_PIN = '6bde121e8b1b4409e34d907b2d9e9d5ba5df93676a46507d205cd6d96372d35d';
const SPELL_BINDINGS: Readonly<Record<string, SpellHandler>> = freeze({
  'official:19523799': { handler: 'inflict-damage', amount: 800 },
  'official:25880422': { handler: 'target-opposing-attack-to-defense' },
  'official:26412047': { handler: 'destroy-highest-face-up-attack-position' },
  'official:46130346': { handler: 'inflict-damage', amount: 500 },
  'official:55144522': { handler: 'draw', count: 2 },
  'official:66788016': { handler: 'destroy-lowest-opposing-face-up-attack' },
  'official:74848038': { handler: 'discard-return-own-graveyard-monster' },
  'official:79759861': { handler: 'discard-destroy-target-monster' },
  'official:82828051': { handler: 'all-face-up-attack-to-defense' },
  'official:84257639': { handler: 'gain-life-points', amount: 1000 },
  'official:97169186': { handler: 'destroy-highest-opposing-face-up-defense' },
});
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }

/** Preflight for the C3a proposal against a trusted existing registry. This is NOT
 * activation permission, a live frame, a historical text verification or proof
 * of legal actions. No runtime review file/manifest is installed by this call.
 * Recheck dependencies when integrating gameplay; this receipt is not authority.
 */
export function preflightBoundedCounterReview(registry: Registry, input: unknown) {
  const [review] = CounterReviewsSchema.parse([input]);
  check(review && review.scope === BOUNDED_COUNTER_SCOPE && review.continuation === BOUNDED_COUNTER_CONTINUATION
    && review.revision === 6 && review.cardId === SEVEN, 'Expected the bounded Counter v6 proposal');
  check(registry.format.id === 'goat-2005-08-17' && registry.format.revision === 4
    && review.format.id === registry.format.id && review.format.revision === registry.format.revision,
  'Bounded Counter format conflict');
  check(registry.rules.spellTrapSlots === 5 && registry.rules.deck.combinedCopyLimit === 3, 'Bounded Counter copy/zone rules conflict');
  const pins: Readonly<Record<string, string>> = { ...COUNTER_CONTINUATION_PINS, [TRAP]: TRAP_PIN };
  for (const [id, pin] of Object.entries(pins)) {
    const card = registry.cards[id];
    check(card && card.id === id && card.origin === 'official' && card.legality.formatId === registry.format.id
      && card.legality.status === 'legal' && (card.legality.maxCopies ?? 0) > 0 && definitionFingerprint(card) === pin,
    'Bounded Counter dependency definition conflict: ' + id);
    if (id in SPELL_BINDINGS) {
      const binding = registry.spellHandlers[id], expected = SPELL_BINDINGS[id]!;
      check(card.kind === 'spell' && card.subtype === 'normal' && binding
        && Object.keys(binding).length === Object.keys(expected).length
        && Object.entries(expected).every(([key, value]) => (binding as unknown as Record<string, unknown>)[key] === value),
      'Bounded Counter Spell binding conflict: ' + id);
    } else check(card.kind === 'trap' && card.subtype === (id === TRAP ? 'normal' : 'counter'), 'Bounded Counter Trap kind conflict: ' + id);
  }
  check(review.definitionSha256 === pins[SEVEN], 'Bounded Counter Seven review pin conflict');
  check(registry.trapHandlers[TRAP] === 'destroy-opponent-normal-or-flip-summoned-1000'
    && registry.counterTrapHandlers[MAGIC] === 'discard-negate-normal-spell-activation'
    && registry.counterTrapHandlers[SEVEN] === 'pay-1000-negate-trap-hole-activation', 'Bounded Counter Trap binding conflict');
  return freeze({ kind: 'bounded-counter-review-preflight-v1' as const, runtimeEnabled: false as const,
    registryRevision: registry.revision, scope: review.scope, continuation: review.continuation,
    reviewRevision: review.revision, reviewSha256: createHash('sha256').update(JSON.stringify(review)).digest('hex'),
    dependencyPins: pins, rootSpellIds: Object.keys(SPELL_BINDINGS),
    limits: { maxLinksForSelectedPool: 8, maxSevenPerOwner: 3, maxTrapPrefix: 3, maxSevenSuffix: 6, spellTrapSlots: 5 } });
}
