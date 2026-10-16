import { describe, expect, it } from 'vitest';
import { FormatSchema, ruleKeys } from './format.js';
import { goat200508Format } from './formats/goat-2005-08-17.js';

const copy = () => structuredClone(goat200508Format);

describe('historical format activation boundary', () => {
  it('has reviewed design decisions without claiming official-only provenance', () => {
    expect(goat200508Format.status).toBe('ready');
    for (const decision of Object.values(goat200508Format.decisions)) {
      expect(decision.status).toBe('verified');
      expect(decision.evidence.length).toBeGreaterThan(0);
    }
    expect(goat200508Format.decisions.fieldSpellReplacement.evidence.some(e => e.sourceKind === 'community')).toBe(true);
  });
  it('separates the selected card cutoff from the restriction list month', () => {
    expect(goat200508Format.targetMonth).toBe('2005-08');
    expect(goat200508Format.decisions.cardPoolCutoff.proposedValue).toBe('2005-08-17');
    expect(goat200508Format.decisions.restrictionList.proposedValue).toBe('goat-tcg-2005-04');
  });
  it.each(ruleKeys)('rejects ready status when %s becomes pending or disputed', key => {
    for (const status of ['pending', 'disputed'] as const) {
      const profile = copy();
      profile.decisions[key].status = status;
      expect(FormatSchema.safeParse(profile).success).toBe(false);
      expect(FormatSchema.safeParse({ ...profile, status: 'draft' }).success).toBe(true);
    }
  });
  it('rejects claiming verification with only a proposed value', () => {
    const profile = copy();
    profile.decisions.startingLifePoints.evidence = [];
    expect(FormatSchema.safeParse(profile).success).toBe(false);
  });
  it('requires all rule categories even on a draft', () => {
    const { territory, ...incomplete } = copy().decisions;
    expect(FormatSchema.safeParse({ ...copy(), status: 'draft', decisions: incomplete }).success).toBe(false);
  });
  it('rejects impossible target months', () => {
    expect(FormatSchema.safeParse({ ...copy(), targetMonth: '2005-13' }).success).toBe(false);
  });
  it('rejects a verified decision with a null value', () => {
    const profile = copy();
    profile.decisions.openingHand.proposedValue = null;
    expect(FormatSchema.safeParse(profile).success).toBe(false);
  });
});
