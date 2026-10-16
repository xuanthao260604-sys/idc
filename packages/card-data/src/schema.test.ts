import { describe, expect, it } from 'vitest';
import { CardBatchSchema, CardSchema } from './schema.js';

// Synthetic schema fixtures, never imported as official game data.
const fixture = () => ({
  schemaVersion: 1, id: 'custom:test-monster', origin: 'custom', revision: 1,
  name: 'Schema fixture', text: '', sources: [], verification: 'pending',
  implementation: 'not-started', testing: 'not-run', effects: [],
  legality: { formatId: 'goat-2005-08-17', status: 'unverified', evidence: [] },
  kind: 'normal-monster', attribute: 'EARTH', race: 'Warrior',
  level: 4, attack: 1000, defense: 1000,
});

describe('card schema trust boundaries', () => {
  it('accepts a draft without claiming historical legality', () => {
    expect(CardSchema.parse(fixture()).legality.status).toBe('unverified');
  });
  it.each([0, 13, 4.5])('rejects invalid level %s', level => {
    expect(CardSchema.safeParse({ ...fixture(), level }).success).toBe(false);
  });
  it('requires provenance for verified official data', () => {
    expect(CardSchema.safeParse({ ...fixture(), id: 'official:test', origin: 'official', verification: 'verified' }).success).toBe(false);
  });
  it('does not allow custom cards to claim an official passcode', () => {
    expect(CardSchema.safeParse({ ...fixture(), passcode: '12345678' }).success).toBe(false);
  });
  it('rejects a mismatched namespace', () => {
    expect(CardSchema.safeParse({ ...fixture(), id: 'official:test' }).success).toBe(false);
  });
  it('rejects test success on an unimplemented card', () => {
    expect(CardSchema.safeParse({ ...fixture(), testing: 'passing' }).success).toBe(false);
  });
  it('requires evidence before declaring legality', () => {
    expect(CardSchema.safeParse({ ...fixture(), legality: { formatId: 'goat-2005-08-17', status: 'legal', maxCopies: 3, evidence: [] } }).success).toBe(false);
  });
  it('rejects duplicate IDs in a batch', () => {
    expect(CardBatchSchema.safeParse([fixture(), fixture()]).success).toBe(false);
  });
  it('rejects monster-only fields on a spell', () => {
    expect(CardSchema.safeParse({ ...fixture(), kind: 'spell', subtype: 'normal' }).success).toBe(false);
  });
  it('accepts spells and traps without monster fields', () => {
    const { attribute, race, level, attack, defense, ...base } = fixture();
    for (const kind of ['spell', 'trap']) {
      expect(CardSchema.safeParse({ ...base, kind, subtype: 'normal' }).success).toBe(true);
    }
  });
});

describe('effect classification boundaries', () => {
  const active = { id: 'fixture', condition: 'fixture:condition', cost: 'fixture:cost',
    target: 'fixture:target', resolution: 'fixture:resolve', parameters: {} };
  it('does not put a continuous effect onto a Chain with a Spell Speed', () => {
    const passive = { id: 'fixture', kind: 'continuous', condition: 'fixture:condition',
      application: 'fixture:apply', parameters: {} };
    const effectCard = { ...fixture(), kind: 'effect-monster', effects: [passive] };
    expect(CardSchema.safeParse(effectCard).success).toBe(true);
    expect(CardSchema.safeParse({ ...effectCard, effects: [{ ...passive, spellSpeed: 1 }] }).success).toBe(false);
  });
  it('keeps ignition at speed 1 and quick effects at speed 2', () => {
    for (const [kind, speed] of [['ignition', 1], ['quick', 2]] as const) {
      const card = { ...fixture(), kind: 'effect-monster', effects: [{ ...active, kind, spellSpeed: speed }] };
      expect(CardSchema.safeParse(card).success).toBe(true);
      expect(CardSchema.safeParse({ ...card, effects: [{ ...active, kind, spellSpeed: 3 }] }).success).toBe(false);
    }
  });
  it('requires Counter Trap activation speed 3', () => {
    const { attribute, race, level, attack, defense, ...base } = fixture();
    const card = { ...base, kind: 'trap', subtype: 'counter',
      effects: [{ ...active, kind: 'activation', spellSpeed: 3 }] };
    expect(CardSchema.safeParse(card).success).toBe(true);
    expect(CardSchema.safeParse({ ...card, effects: [{ ...active, kind: 'activation', spellSpeed: 2 }] }).success).toBe(false);
  });
  it('does not label an effect monster implemented without any effect definitions', () => {
    expect(CardSchema.safeParse({ ...fixture(), kind: 'effect-monster', implementation: 'implemented' }).success).toBe(false);
  });
});
