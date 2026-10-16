import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { assertRevisionProgress, canonical, fingerprint, importBatch, normalize, sha256 } from './pipeline.js';
import { ApiResponseSchema } from './contracts.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const load = (path: string) => JSON.parse(readFileSync(`${root}${path}`, 'utf8'));
const manifest = load('data/import/pilot.manifest.json');
const receipt = load('data/import/pilot.receipt.json');
const raw = readFileSync(`${root}data/raw/ygoprodeck/${receipt.sha256}.json`, 'utf8');
const input = {
  raw, receipt, manifest, overlays: load('data/reviews/pilot.overlays.json'),
  official: manifest.cards.map((c: { konamiId: number }) => load(`data/evidence/konami/${c.konamiId}.json`)),
};
const fixture = () => structuredClone(input);
const changedRaw = (change: (data: ReturnType<typeof JSON.parse>) => void) => {
  const next = fixture();
  const upstream = JSON.parse(next.raw);
  change(upstream);
  next.raw = JSON.stringify(upstream);
  next.receipt.sha256 = sha256(next.raw);
  return next;
};

describe('offline batch import boundaries', () => {
  it('imports the real pilot with separate data/historical/engine statuses', () => {
    const result = importBatch(fixture());
    expect(result.summary).toEqual({ imported: 20, verifiedData: 15, historicalReviewPending: 5, implemented: 0, testedEffects: 0, playable: 0 });
    for (const card of result.cards) {
      expect(card.implementation).toBe('not-started');
      expect(card.testing).toBe('not-run');
      expect(card.effects).toEqual([]);
      expect(card.textBasis).toBe('current-reference');
    }
  });
  it('preserves all identities and reviewed facts from the original 11-card snapshot', () => {
    const baseline = load('data/import/pilot-11.baseline.json');
    const oldRaw = readFileSync(`${root}data/raw/ygoprodeck/${baseline.upstreamSha256}.json`, 'utf8');
    expect(sha256(oldRaw)).toBe(baseline.upstreamSha256);
    const oldCards = ApiResponseSchema.parse(JSON.parse(oldRaw)).data;
    const result = importBatch(fixture());
    expect(oldCards).toHaveLength(11);
    for (const source of oldCards) {
      const id = `official:${String(source.id).padStart(8, '0')}`;
      const savedReview = result.reviews.find(review => review.id === id);
      expect(savedReview?.fingerprint).toBe(fingerprint(normalize(source)));
      expect(result.cards.find(card => card.id === id)?.revision).toBe(1);
    }
    expect(result.cards.filter(card => !oldCards.some(old => `official:${String(old.id).padStart(8, '0')}` === card.id))).toHaveLength(9);
  });
  it('has enough reviewed normal-card copies for a future 40-card test deck without claiming gameplay support', () => {
    const cards = importBatch(fixture()).cards;
    const normals = cards.filter(card => card.kind === 'normal-monster' && card.verification === 'verified' && card.legality.status === 'legal');
    expect(normals.reduce((count, card) => count + (card.legality.maxCopies ?? 0), 0)).toBeGreaterThanOrEqual(40);
    expect(cards.every(card => card.implementation === 'not-started')).toBe(true);
  });
  it('retains leading zeroes and stable IDs', () => {
    const cards = importBatch(fixture()).cards;
    expect(cards.find(c => c.name === 'Battle Ox')?.id).toBe('official:05053103');
    expect(cards.find(c => c.name === 'Trap Hole')?.passcode).toBe('04206964');
  });
  it('uses the era restriction list rather than the current banlist', () => {
    const cards = importBatch(fixture()).cards;
    expect(cards.find(c => c.name === 'Pot of Greed')?.legality.maxCopies).toBe(1);
    expect(cards.find(c => c.name === 'Trap Hole')?.legality.maxCopies).toBe(3);
  });
  it('preserves real manual text corrections on repeated import', () => {
    const next = fixture();
    const before = canonical(next.overlays);
    const first = importBatch(next);
    expect(first.cards.find(c => c.name === 'Dark Magician')?.text).toBe('The ultimate wizard in terms of attack and defense.');
    expect(first.cards.find(c => c.name === 'Trap Hole')?.text).toContain('Summons a monster');
    expect(canonical(importBatch(next))).toBe(canonical(first));
    expect(canonical(next.overlays)).toBe(before);
  });
  it('rejects unrecorded raw tampering', () => {
    expect(() => importBatch({ ...fixture(), raw: raw + ' ' })).toThrow('checksum');
  });
  it('rejects a missing requested card', () => {
    expect(() => importBatch(changedRaw(d => d.data.pop()))).toThrow('manifest');
  });
  it('rejects duplicate upstream IDs', () => {
    expect(() => importBatch(changedRaw(d => d.data.push(d.data[0])))).toThrow('Duplicate upstream passcode');
  });
  it('rejects an ID resolving to a different card name', () => {
    expect(() => importBatch(changedRaw(d => { d.data[0].name = 'Wrong identity fixture'; }))).toThrow('Identity mismatch');
  });
  it('rejects missing monster stats', () => {
    expect(() => importBatch(changedRaw(d => { delete d.data.find((c: { type: string }) => c.type === 'Normal Monster').atk; }))).toThrow();
  });
  it('rejects unsupported card types rather than coercing them into effect monsters', () => {
    expect(() => importBatch(changedRaw(d => { d.data[0].type = 'Link Monster'; }))).toThrow();
  });
  it('flags upstream rule-bearing changes before overwriting a manual review', () => {
    const next = changedRaw(d => { d.data.find((c: { name: string }) => c.name === 'Trap Hole').desc = 'Changed upstream text fixture'; });
    const overlaysBefore = canonical(next.overlays);
    expect(() => importBatch(next)).toThrow('Review conflict');
    expect(canonical(next.overlays)).toBe(overlaysBefore);
  });
  it('does not invalidate reviewed facts merely because a price or view count changes', () => {
    const next = changedRaw(d => { d.data[0].card_prices = [{ price: '999' }]; d.data[0].misc_info[0].views = 999999; });
    expect(importBatch(next).summary.imported).toBe(20);
  });
  it('does not use API tcg_date as release eligibility evidence', () => {
    const next = changedRaw(d => { d.data.forEach((c: { misc_info: { tcg_date: string }[] }) => { c.misc_info[0]!.tcg_date = '2025-01-01'; }); });
    expect(importBatch(next).cards.every(c => c.legality.status === 'legal')).toBe(true);
    expect(importBatch(next).reviews.every(r => r.printing.date <= '2005-08-17')).toBe(true);
  });
  it('rejects duplicate overlays', () => {
    const next = fixture(); next.overlays[1] = next.overlays[0];
    expect(() => importBatch(next)).toThrow('Duplicate overlay');
  });
  it('rejects a missing official evidence record', () => {
    const next = fixture(); next.official.pop();
    expect(() => importBatch(next)).toThrow('evidence records');
  });
  it('rejects mismatch with current official facts even if the upstream fingerprint was reapproved', () => {
    const next = changedRaw(d => { d.data.find((c: { name: string }) => c.name === 'Battle Ox').atk = 999; });
    const card = ApiResponseSchema.parse(JSON.parse(next.raw)).data.find(c => c.name === 'Battle Ox')!;
    next.overlays.find((o: { id: string }) => o.id === 'official:05053103').baseFingerprint = fingerprint(normalize(card));
    expect(() => importBatch(next)).toThrow('Official facts mismatch');
  });
  it.each(['future', 'unknown-set', 'missing-print-code'])('rejects invalid release evidence: %s', condition => {
    const next = fixture();
    const proof = next.official[0];
    if (condition === 'future') proof.printing.date = '2006-01-01';
    else if (condition === 'unknown-set') proof.printing.setCode = 'UNKNOWN-001';
    else proof.printing.setCode = 'LOB-999';
    expect(() => importBatch(next)).toThrow();
  });
  it('does not allow an effect card to skip historical review as normal flavor', () => {
    const next = fixture();
    next.overlays.find((o: { id: string }) => o.id === 'official:55144522').historicalTextReview = 'not-required-normal-flavor';
    expect(() => importBatch(next)).toThrow('cannot skip historical review');
  });
  it('requires revision advancement for a changed card and prevents silent card removal', () => {
    const cards = importBatch(fixture()).cards;
    const modified = structuredClone(cards);
    modified[0]!.text += ' fixture edit';
    expect(() => assertRevisionProgress(cards, modified)).toThrow('revision must advance');
    modified[0]!.revision += 1;
    expect(() => assertRevisionProgress(cards, modified)).not.toThrow();
    expect(() => assertRevisionProgress(cards, cards.slice(1))).toThrow('Refusing to drop');
  });
});
