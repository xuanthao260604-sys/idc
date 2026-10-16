import { z } from 'zod';

export const SourceSchema = z.strictObject({
  url: z.url(),
  accessedOn: z.iso.date(),
  scope: z.enum(['identity', 'text', 'release', 'ruling', 'restriction', 'image-license']),
  notes: z.string().min(1),
});

// Descriptors reference reviewed handlers. Continuous effects do not start Chains.
const effectBase = {
  id: z.string().min(1),
  condition: z.string().min(1),
  parameters: z.record(z.string(), z.union([z.string(), z.number().finite(), z.boolean()])),
};
const activated = {
  ...effectBase, cost: z.string().min(1), target: z.string().min(1),
  resolution: z.string().min(1),
};
export const EffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...activated, kind: z.literal('ignition'), spellSpeed: z.literal(1) }),
  z.strictObject({ ...activated, kind: z.literal('trigger'), spellSpeed: z.literal(1) }),
  z.strictObject({ ...activated, kind: z.literal('quick'), spellSpeed: z.literal(2) }),
  z.strictObject({ ...activated, kind: z.literal('activation'),
    spellSpeed: z.union([z.literal(1), z.literal(2), z.literal(3)]) }),
  z.strictObject({ ...effectBase, kind: z.literal('continuous'), application: z.string().min(1) }),
  z.strictObject({ ...effectBase, kind: z.literal('replacement'), application: z.string().min(1) }),
]);

const common = {
  schemaVersion: z.literal(1),
  id: z.string().regex(/^(official|custom):[a-z0-9][a-z0-9-]*$/),
  origin: z.enum(['official', 'custom']),
  revision: z.number().int().positive(),
  name: z.string().min(1),
  passcode: z.string().regex(/^\d{8}$/).optional(),
  text: z.string(),
  textBasis: z.enum(['current-reference', 'historical-reviewed', 'custom']).optional(),
  sources: z.array(SourceSchema),
  verification: z.enum(['pending', 'verified']),
  implementation: z.enum(['not-started', 'partial', 'implemented']),
  testing: z.enum(['not-run', 'failing', 'passing']),
  effects: z.array(EffectSchema),
  artwork: z.strictObject({
    uri: z.string().min(1),
    rights: z.enum(['unknown', 'permission', 'owned', 'licensed']),
    licenseSource: z.url().optional(),
  }).optional(),
  legality: z.strictObject({
    formatId: z.string().min(1),
    status: z.enum(['unverified', 'legal', 'illegal']),
    maxCopies: z.number().int().min(0).max(3).optional(),
    evidence: z.array(SourceSchema),
  }),
};

const monster = {
  attribute: z.enum(['DARK', 'LIGHT', 'EARTH', 'WATER', 'FIRE', 'WIND', 'DIVINE']),
  race: z.string().min(1),
  level: z.number().int().min(1).max(12),
  attack: z.number().int().nonnegative(),
  defense: z.number().int().nonnegative(),
};

export const CardSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...common, ...monster, kind: z.literal('normal-monster') }),
  z.strictObject({ ...common, ...monster, kind: z.literal('effect-monster') }),
  z.strictObject({ ...common, kind: z.literal('spell'), subtype: z.enum(['normal', 'quick-play', 'continuous', 'equip', 'field', 'ritual']) }),
  z.strictObject({ ...common, kind: z.literal('trap'), subtype: z.enum(['normal', 'continuous', 'counter']) }),
]).superRefine((card, ctx) => {
  const reject = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (!card.id.startsWith(`${card.origin}:`)) reject('ID namespace must match origin');
  if (card.origin === 'official' && card.verification === 'verified' && card.sources.length === 0)
    reject('Verified official cards require sources');
  if (card.origin === 'custom' && card.passcode !== undefined)
    reject('Custom cards must not claim official passcodes');
  if (card.kind !== 'normal-monster' && card.implementation === 'implemented' && card.effects.length === 0)
    reject('Implemented effect cards require effect definitions');
  for (const effect of card.effects) {
    if (effect.kind !== 'activation') continue;
    if (card.kind === 'normal-monster' || card.kind === 'effect-monster') {
      reject('Monster effects must use monster effect categories');
    } else {
      const speed = card.kind === 'trap' ? (card.subtype === 'counter' ? 3 : 2) : (card.subtype === 'quick-play' ? 2 : 1);
      if (effect.spellSpeed !== speed) reject('Activation speed must match the Spell/Trap subtype');
    }
  }
  if (card.kind === 'normal-monster' && card.effects.length !== 0)
    reject('Normal monsters cannot contain effect definitions');
  if (new Set(card.effects.map(effect => effect.id)).size !== card.effects.length)
    reject('Effect IDs must be unique within a card');
  if (card.testing === 'passing' && card.implementation !== 'implemented')
    reject('Passing status requires completed implementation');
  if (card.legality.status !== 'unverified' && (card.legality.evidence.length === 0 || card.legality.maxCopies === undefined))
    reject('Legality decisions require evidence and a copy limit');
  if (card.legality.status === 'legal' && card.legality.maxCopies === 0)
    reject('Legal cards require a positive copy limit');
  if (card.legality.status === 'illegal' && card.legality.maxCopies !== 0)
    reject('Illegal cards require a zero copy limit');
});

export const CardBatchSchema = z.array(CardSchema).superRefine((cards, ctx) => {
  const ids = new Set<string>();
  const passcodes = new Set<string>();
  for (const card of cards) {
    if (ids.has(card.id)) ctx.addIssue({ code: 'custom', message: `Duplicate card ID: ${card.id}` });
    ids.add(card.id);
    if (card.passcode !== undefined) {
      if (passcodes.has(card.passcode)) ctx.addIssue({ code: 'custom', message: `Duplicate passcode: ${card.passcode}` });
      passcodes.add(card.passcode);
    }
  }
});

export type CardDefinition = z.infer<typeof CardSchema>;
