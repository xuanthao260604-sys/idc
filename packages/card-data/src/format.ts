import { z } from 'zod';

// Retrieval and review are separate. A URL alone does not establish a historical rule.
export const EvidenceSchema = z.strictObject({
  url: z.url(),
  accessedOn: z.iso.date(),
  sourceKind: z.enum(['historical-official', 'official-current', 'archive', 'community']),
  quotation: z.string().min(1),
  historicalApplicability: z.string().min(1),
});

export const DecisionSchema = z.strictObject({
  status: z.enum(['pending', 'verified', 'disputed']),
  proposedValue: z.json(),
  rationale: z.string().min(1),
  evidence: z.array(EvidenceSchema),
}).superRefine((decision, ctx) => {
  if (decision.status === 'verified' && (decision.proposedValue === null || decision.evidence.length === 0))
    ctx.addIssue({ code: 'custom', message: 'Verified decisions require a value and historical evidence' });
});

// Every item must be reviewed before activating a profile. Mechanics are not implemented here.
export const ruleKeys = [
  'territory', 'cardPoolCutoff', 'restrictionList', 'textAndErrataPolicy',
  'startingLifePoints', 'openingHand', 'firstTurnDraw', 'deckConstruction',
  'fieldLayout', 'turnPhases', 'normalAndTributeSummons', 'positionChanges',
  'battleAndDamageStep', 'winConditions', 'priorityAndResponseWindows',
  'chainResolution', 'simultaneousTriggers', 'optionalTriggerTiming',
  'activationCostTargetNegation', 'continuousAndEquipEffects', 'fieldSpellReplacement',
  'endPhaseAndHandLimit', 'fusionAndRitualScope',
] as const;

export const FormatSchema = z.strictObject({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  name: z.string().min(1),
  targetMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  status: z.enum(['draft', 'ready']),
  decisions: z.record(z.enum(ruleKeys), DecisionSchema),
}).superRefine((format, ctx) => {
  if (format.status === 'ready') {
    for (const key of ruleKeys) {
      if (format.decisions[key].status !== 'verified')
        ctx.addIssue({ code: 'custom', path: ['decisions', key], message: 'Ready profiles require every decision to be verified' });
    }
  }
});

export type FormatDefinition = z.infer<typeof FormatSchema>;

export type RuleKey = (typeof ruleKeys)[number];
export type RuleDecision = z.infer<typeof DecisionSchema>;
