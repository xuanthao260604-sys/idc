import { z } from 'zod';
import { SourceSchema } from '../../../packages/card-data/src/schema.js';

const Passcode = z.string().regex(/^\d{8}$/);
export const ManifestSchema = z.strictObject({
  schemaVersion: z.literal(1), formatId: z.literal('goat-2005-08-17'),
  cards: z.array(z.strictObject({ passcode: Passcode, expectedName: z.string().min(1), konamiId: z.number().int().positive() })).min(1).max(100),
  eligibleSetPrefixes: z.array(z.string().regex(/^[A-Z0-9]+$/)).min(1),
  eligibilitySource: SourceSchema,
}).superRefine((manifest, ctx) => {
  for (const key of ['passcode', 'expectedName', 'konamiId'] as const) {
    if (new Set(manifest.cards.map(c => c[key])).size !== manifest.cards.length)
      ctx.addIssue({ code: 'custom', message: `Duplicate manifest ${key}` });
  }
  if (manifest.eligibilitySource.scope !== 'release') ctx.addIssue({ code: 'custom', message: 'Set eligibility requires release provenance' });
});
export const UpstreamCardSchema = z.object({
  id: z.number().int().positive().max(99999999), name: z.string().min(1),
  type: z.enum(['Normal Monster', 'Effect Monster', 'Flip Effect Monster', 'Spell Card', 'Trap Card']),
  desc: z.string().min(1), race: z.string().min(1),
  attribute: z.string().optional(), level: z.number().int().optional(), atk: z.number().int().optional(), def: z.number().int().optional(),
  card_sets: z.array(z.object({ set_code: z.string().min(1), set_name: z.string().min(1) })).min(1),
  misc_info: z.array(z.object({ konami_id: z.number().int().positive(), tcg_date: z.iso.date().optional() })).length(1),
});
export const ApiResponseSchema = z.object({ data: z.array(UpstreamCardSchema).min(1) });
export const ReceiptSchema = z.strictObject({
  schemaVersion: z.literal(1), url: z.url(), fetchedAt: z.iso.datetime(), sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export const FactsSchema = z.discriminatedUnion('kind', [
  z.strictObject({ name: z.string().min(1), text: z.string().min(1), kind: z.literal('normal-monster'), race: z.string().min(1),
    attribute: z.enum(['DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE']), level: z.number().int().min(1).max(12), attack: z.number().int().nonnegative(), defense: z.number().int().nonnegative() }),
  z.strictObject({ name: z.string().min(1), text: z.string().min(1), kind: z.literal('effect-monster'), race: z.string().min(1),
    attribute: z.enum(['DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE']), level: z.number().int().min(1).max(12), attack: z.number().int().nonnegative(), defense: z.number().int().nonnegative() }),
  z.strictObject({ name: z.string().min(1), text: z.string().min(1), kind: z.literal('spell'), subtype: z.enum(['normal', 'quick-play', 'continuous', 'equip', 'field', 'ritual']) }),
  z.strictObject({ name: z.string().min(1), text: z.string().min(1), kind: z.literal('trap'), subtype: z.enum(['normal', 'continuous', 'counter']) }),
]);
export const OfficialEvidenceSchema = z.strictObject({
  passcode: Passcode, konamiId: z.number().int().positive(), url: z.url(), accessedOn: z.iso.date(),
  htmlSha256: z.string().regex(/^[a-f0-9]{64}$/), currentFacts: FactsSchema,
  printing: z.strictObject({ date: z.iso.date(), setCode: z.string().min(1), product: z.string().min(1) }),
});
export const OverlaySchema = z.strictObject({
  id: z.string().regex(/^official:\d{8}$/), baseFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  revision: z.number().int().positive(),
  patch: z.strictObject({ name: z.string().min(1).optional(), text: z.string().min(1).optional() }),
  historicalTextReview: z.enum(['not-required-normal-flavor', 'pending']),
  notes: z.string().min(1), sources: z.array(SourceSchema).min(1),
});
export const OverlayBatchSchema = z.array(OverlaySchema).min(1).superRefine((entries, ctx) => {
  if (new Set(entries.map(e => e.id)).size !== entries.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate overlay ID' });
});
export type Facts = z.infer<typeof FactsSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type UpstreamCard = z.infer<typeof UpstreamCardSchema>;
export type Overlay = z.infer<typeof OverlaySchema>;
