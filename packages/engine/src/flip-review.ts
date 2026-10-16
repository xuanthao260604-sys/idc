import { z } from 'zod';
import { EvidenceSchema } from '../../card-data/src/format.js';
export const FlipReviewsSchema = z.array(z.strictObject({
  cardId: z.string().regex(/^official:\d{8}$/), definitionSha256: z.string().regex(/^[a-f0-9]{64}$/),
  revision: z.number().int().positive(),
  format: z.strictObject({ id: z.string().min(1), revision: z.number().int().positive() }),
  status: z.literal('reviewed-for-supported-scope'), scope: z.literal('flip-single-link-v1'),
  handler: z.enum(['destroy-target-monster', 'return-target-monster-to-owner-hand']),
  evidence: z.array(EvidenceSchema).min(1), notes: z.string().min(1),
})).superRefine((reviews, ctx) => {
  if (new Set(reviews.map(r => r.cardId)).size !== reviews.length) ctx.addIssue({ code: 'custom', message: 'Duplicate FLIP review' });
});
export type FlipHandler = z.infer<typeof FlipReviewsSchema>[number]['handler'];
