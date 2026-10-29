import { z } from 'zod';
import { EvidenceSchema } from '../../card-data/src/format.js';

/** Separate capability gate: never coerce a Counter Trap into a Normal Trap review. */
export const CounterReviewsSchema = z.array(z.strictObject({
  cardId: z.string().regex(/^official:\d{8}$/), definitionSha256: z.string().regex(/^[a-f0-9]{64}$/),
  revision: z.number().int().positive(),
  format: z.strictObject({ id: z.string().min(1), revision: z.number().int().positive() }),
  status: z.literal('reviewed-for-supported-scope'),
  scope: z.enum(['counter-trap-normal-spell-activation-v1', 'counter-trap-trap-hole-activation-v1']),
  handler: z.enum(['discard-negate-normal-spell-activation', 'pay-1000-negate-trap-hole-activation']),
  evidence: z.array(EvidenceSchema).min(1), notes: z.string().min(1),
})).superRefine((reviews, ctx) => {
  if (new Set(reviews.map(r => r.cardId)).size !== reviews.length) ctx.addIssue({ code: 'custom', message: 'Duplicate Counter Trap review' });
  for (const r of reviews) if ((r.scope === 'counter-trap-trap-hole-activation-v1') !== (r.handler === 'pay-1000-negate-trap-hole-activation'))
    ctx.addIssue({ code: 'custom', message: 'Counter Trap handler requires its reviewed scope' });
});
export type CounterHandler = z.infer<typeof CounterReviewsSchema>[number]['handler'];
