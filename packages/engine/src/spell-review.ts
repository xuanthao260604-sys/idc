import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { CardDefinition } from '../../card-data/src/schema.js';
import { EvidenceSchema } from '../../card-data/src/format.js';

export const SpellHandlerSchema = z.discriminatedUnion('handler', [
  z.strictObject({ handler: z.literal('discard-destroy-target-monster') }),
  z.strictObject({ handler: z.literal('draw'), count: z.number().int().positive().max(100) }),
  z.strictObject({ handler: z.literal('destroy-lowest-opposing-face-up-attack') }),
  z.strictObject({ handler: z.literal('destroy-highest-opposing-face-up-defense') }),
  z.strictObject({ handler: z.literal('destroy-highest-face-up-attack-position') }),
  z.strictObject({ handler: z.literal('inflict-damage'), amount: z.number().int().positive().safe() }),
  z.strictObject({ handler: z.literal('gain-life-points'), amount: z.number().int().positive().safe() }),
]);
export type SpellHandler = z.infer<typeof SpellHandlerSchema>;
export const SpellReviewSchema = z.strictObject({
  cardId: z.string().regex(/^official:\d{8}$/),
  definitionSha256: z.string().regex(/^[a-f0-9]{64}$/),
  revision: z.number().int().positive(),
  format: z.strictObject({ id: z.string().min(1), revision: z.number().int().positive() }),
  status: z.literal('reviewed-for-supported-scope'),
  scope: z.enum(['normal-spell-single-link-vanilla-v1', 'normal-spell-life-points-single-link-v1', 'normal-spell-highest-defense-single-link-v1', 'normal-spell-highest-attack-position-single-link-v1', 'normal-spell-discard-target-single-link-v1']),
  handler: SpellHandlerSchema,
  evidence: z.array(EvidenceSchema).min(1),
  notes: z.string().min(1),
}).superRefine((review, ctx) => {
  const discardTarget = review.handler.handler === 'discard-destroy-target-monster';
  if (discardTarget !== (review.scope === 'normal-spell-discard-target-single-link-v1'))
    ctx.addIssue({ code: 'custom', message: 'Spell handler requires its reviewed scope' });
  const highestAttackPosition = review.handler.handler === 'destroy-highest-face-up-attack-position';
  if (highestAttackPosition !== (review.scope === 'normal-spell-highest-attack-position-single-link-v1'))
    ctx.addIssue({ code: 'custom', message: 'Spell handler requires its reviewed scope' });
  const highestDefense = review.handler.handler === 'destroy-highest-opposing-face-up-defense';
  if (highestDefense !== (review.scope === 'normal-spell-highest-defense-single-link-v1'))
    ctx.addIssue({ code: 'custom', message: 'Spell handler requires its reviewed scope' });
  const lifePoints = ['inflict-damage', 'gain-life-points'].includes(review.handler.handler);
  if (lifePoints !== (review.scope === 'normal-spell-life-points-single-link-v1'))
    ctx.addIssue({ code: 'custom', message: 'Spell handler requires its reviewed scope' });
});
export const SpellReviewsSchema = z.array(SpellReviewSchema).superRefine((reviews, ctx) => {
  if (new Set(reviews.map(r => r.cardId)).size !== reviews.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate spell review' });
});
function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
}
/** Hash the entire parsed definition, including legality/revision/provenance, not just text. */
export const definitionFingerprint = (card: CardDefinition): string => createHash('sha256').update(canonical(card)).digest('hex');
