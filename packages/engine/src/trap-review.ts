import { z } from 'zod';
import { EvidenceSchema } from '../../card-data/src/format.js';
export const TrapReviewsSchema = z.array(z.strictObject({
  cardId: z.string().regex(/^official:\d{8}$/), definitionSha256: z.string().regex(/^[a-f0-9]{64}$/),
  revision: z.number().int().positive(),
  format: z.strictObject({ id: z.string().min(1), revision: z.number().int().positive() }),
  status: z.literal('reviewed-for-supported-scope'), scope: z.literal('summon-response-trap-v1'),
  handler: z.literal('destroy-opponent-normal-or-flip-summoned-1000'),
  evidence: z.array(EvidenceSchema).min(1), notes: z.string().min(1),
})).superRefine((reviews, ctx) => {
  if (new Set(reviews.map(r => r.cardId)).size !== reviews.length) ctx.addIssue({ code: 'custom', message: 'Duplicate Trap review' });
});
