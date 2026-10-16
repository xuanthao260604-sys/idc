import { describe, expect, it } from 'vitest';
import { RestrictionListSchema, findListedRestriction } from './restrictions.js';
import { goatApril2005Restrictions as list } from './formats/restrictions-2005-04.js';

describe('Goat restriction source transcription', () => {
  it('preserves all three source sections without duplicate names', () => {
    expect(list.entries.filter(e => e.maxCopies === 0)).toHaveLength(17);
    expect(list.entries.filter(e => e.maxCopies === 1)).toHaveLength(41);
    expect(list.entries.filter(e => e.maxCopies === 2)).toHaveLength(15);
    expect(list.evidence[0]?.sourceKind).toBe('community');
  });
  it('distinguishes banned, limited and semi-limited examples', () => {
    expect(findListedRestriction(list, 'Monster Reborn')).toBe(0);
    expect(findListedRestriction(list, 'Pot of Greed')).toBe(1);
    expect(findListedRestriction(list, 'Nobleman of Crossout')).toBe(2);
  });
  it('does not declare an unlisted card legal', () => {
    expect(findListedRestriction(list, 'Unverified fixture')).toBeUndefined();
  });
  it('rejects duplicates even if a copy limit differs', () => {
    expect(RestrictionListSchema.safeParse({ ...list, entries: [
      { sourceName: 'Pot of Greed', maxCopies: 1 },
      { sourceName: 'pot of greed', maxCopies: 2 },
    ] }).success).toBe(false);
  });
  it('requires provenance and rejects an unrestricted entry in a restricted-only list', () => {
    expect(RestrictionListSchema.safeParse({ ...list, evidence: [] }).success).toBe(false);
    expect(RestrictionListSchema.safeParse({ ...list, entries: [{ sourceName: 'fixture', maxCopies: 3 }] }).success).toBe(false);
  });
});
