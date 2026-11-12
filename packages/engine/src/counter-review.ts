import { z } from 'zod';
import { EvidenceSchema } from '../../card-data/src/format.js';

const extendedScopes = {
  'counter-trap-trap-hole-or-magic-jammer-v2': { minimumRevision: 2, continuation: 'normal-spell-magic-jammer-seven-tools-v1' },
  'counter-trap-reviewed-three-link-patterns-v3': { minimumRevision: 3, continuation: 'reviewed-three-link-counter-patterns-v3' },
  'counter-trap-reviewed-four-link-patterns-v4': { minimumRevision: 4, continuation: 'reviewed-four-link-counter-patterns-v4' },
  'counter-trap-reviewed-four-link-patterns-v5': { minimumRevision: 5, continuation: 'reviewed-four-link-counter-patterns-v5' },
  'counter-trap-reviewed-bounded-patterns-v6': { minimumRevision: 6, continuation: 'reviewed-bounded-counter-patterns-v6' },
} as const;

/** Review syntax and scope pairing, not proof that its continuation is implemented.
 * createRegistry separately rejects staged v6 until gameplay integration is ready.
 * Never coerce a Counter Trap into a Normal Trap review. */
export const CounterReviewsSchema = z.array(z.strictObject({
  cardId: z.string().regex(/^official:\d{8}$/), definitionSha256: z.string().regex(/^[a-f0-9]{64}$/),
  revision: z.number().int().positive(),
  format: z.strictObject({ id: z.string().min(1), revision: z.number().int().positive() }),
  status: z.literal('reviewed-for-supported-scope'),
  scope: z.enum(['counter-trap-normal-spell-activation-v1', 'counter-trap-trap-hole-activation-v1', 'counter-trap-trap-hole-or-magic-jammer-v2', 'counter-trap-reviewed-three-link-patterns-v3', 'counter-trap-reviewed-four-link-patterns-v4','counter-trap-reviewed-four-link-patterns-v5', 'counter-trap-reviewed-bounded-patterns-v6']),
  handler: z.enum(['discard-negate-normal-spell-activation', 'pay-1000-negate-trap-hole-activation']),
  continuation: z.enum(['normal-spell-magic-jammer-seven-tools-v1','reviewed-three-link-counter-patterns-v3','reviewed-four-link-counter-patterns-v4','reviewed-four-link-counter-patterns-v5','reviewed-bounded-counter-patterns-v6']).optional(),
  evidence: z.array(EvidenceSchema).min(1), notes: z.string().min(1),
})).superRefine((reviews, ctx) => {
  if (new Set(reviews.map(r => r.cardId)).size !== reviews.length) ctx.addIssue({ code: 'custom', message: 'Duplicate Counter Trap review' });
  for (const r of reviews) {
    const gate = extendedScopes[r.scope as keyof typeof extendedScopes];
    if ((r.scope !== 'counter-trap-normal-spell-activation-v1') !== (r.handler === 'pay-1000-negate-trap-hole-activation')
      || Boolean(gate) !== (r.continuation !== undefined)
      || (gate && (r.cardId !== 'official:03819470' || r.revision < gate.minimumRevision || r.continuation !== gate.continuation)))
      ctx.addIssue({ code: 'custom', message: 'Counter Trap handler/continuation requires its reviewed scope' });
  }
});
export type CounterHandler = z.infer<typeof CounterReviewsSchema>[number]['handler'];
