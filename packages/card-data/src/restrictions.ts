import { z } from 'zod';
import { EvidenceSchema } from './format.js';

export const RestrictionListSchema = z.strictObject({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  formatId: z.string().min(1),
  review: z.literal('community-source-reviewed'),
  evidence: z.array(EvidenceSchema).min(1),
  entries: z.array(z.strictObject({
    // Source names only; resolve to stable official IDs during the import stage.
    sourceName: z.string().trim().min(1),
    maxCopies: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  })).min(1),
}).superRefine((list, ctx) => {
  const seen = new Set<string>();
  for (const [index, entry] of list.entries.entries()) {
    const key = entry.sourceName.normalize('NFKC').toLowerCase();
    if (seen.has(key)) ctx.addIssue({ code: 'custom', path: ['entries', index], message: 'Duplicate restriction name' });
    seen.add(key);
  }
});

// An absent entry says nothing about release eligibility or effect implementation.
export function findListedRestriction(list: z.infer<typeof RestrictionListSchema>, sourceName: string) {
  return list.entries.find(entry => entry.sourceName === sourceName)?.maxCopies;
}
