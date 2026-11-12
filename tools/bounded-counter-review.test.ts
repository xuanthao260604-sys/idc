import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { CounterReviewsSchema } from '../packages/engine/src/counter-review.js';
import { preflightBoundedCounterReview, BOUNDED_COUNTER_SCOPE, BOUNDED_COUNTER_CONTINUATION } from '../packages/engine/src/bounded-counter-review.js';
const runtime = loadRuntimeCatalog(), { registry } = runtime;
const seven = runtime.effectReviews.counters.find(r => r.cardId === 'official:03819470')!;
const profile = JSON.parse(readFileSync('data/evidence/effects/bounded-counter-scope-review.json', 'utf8'));
const proposal = () => ({ ...structuredClone(seven), revision: 6, scope: BOUNDED_COUNTER_SCOPE,
  continuation: BOUNDED_COUNTER_CONTINUATION, notes: 'Test-only C3a proposal; never installed as a runtime review.' });
const pins: string[] = profile.cardPins.map((p: { cardId: string }) => p.cardId);
function build(input: unknown) {
  return createRegistry(runtime.cards, goat200508Format, {}, runtime.effectReviews.spells, runtime.effectReviews.flips,
    runtime.effectReviews.traps, [...runtime.effectReviews.counters.filter(r => r.cardId !== seven.cardId), input]);
}

describe('bounded Counter v6 schema/preflight; gameplay remains v5', () => {
  it('pairs the reviewed proposal while refusing to load it into a live registry', () => {
    const input = proposal(), before = structuredClone(input);
    expect(CounterReviewsSchema.safeParse([input]).success).toBe(true);
    expect(() => build(input)).toThrow('Bounded Counter v6 gameplay is not implemented');
    expect(input).toEqual(before); expect(Object.isFrozen(input)).toBe(false);
    expect(registry.counterContinuations[seven.cardId]).toBe('reviewed-four-link-counter-patterns-v5');
  });
  it('rejects v6 before unsupported or missing cards could silently remove it from the registry', () => {
    for (const absent of [false, true]) {
      const cards = structuredClone(runtime.cards).filter(c => !absent || c.id !== seven.cardId);
      if (!absent) Object.assign(cards.find(c => c.id === seven.cardId)!.legality, { status: 'illegal', maxCopies: 0 });
      expect(() => createRegistry(cards, goat200508Format, {}, runtime.effectReviews.spells, runtime.effectReviews.flips,
        runtime.effectReviews.traps, [proposal()])).toThrow('Bounded Counter v6 gameplay is not implemented');
    }
  });
  it('preflights exactly C3a pins and bounds without mutating/freezing caller data or granting activation', () => {
    const input = proposal(), r = structuredClone(registry), before = structuredClone(r);
    const result = preflightBoundedCounterReview(r, input);
    expect(result).toMatchObject({ kind: 'bounded-counter-review-preflight-v1', runtimeEnabled: false,
      registryRevision: registry.revision, scope: profile.proposal.scope, continuation: profile.proposal.continuation,
      reviewRevision: 6, limits: { maxLinksForSelectedPool: 8, maxSevenPerOwner: 3, maxTrapPrefix: 3, maxSevenSuffix: 6, spellTrapSlots: 5 } });
    expect(result.dependencyPins).toEqual(Object.fromEntries(profile.cardPins.map((p: any) => [p.cardId, p.definitionSha256])));
    expect(result.rootSpellIds).toEqual(profile.grammar.spellFamily.rootSpellIds);
    expect(result.reviewSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(result.dependencyPins)).toBe(true); expect(Object.isFrozen(result.rootSpellIds)).toBe(true);
    expect(r).toEqual(before); expect(Object.isFrozen(r.cards[pins[0]!])).toBe(false); expect(Object.isFrozen(input)).toBe(false);
  });
  it.each(['scope', 'continuation', 'missing-continuation', 'revision', 'card', 'handler', 'duplicate', 'extra', 'empty-evidence'])('rejects malformed pairing %s', mode => {
    const input: any = proposal();
    if (mode === 'scope') input.scope = seven.scope;
    if (mode === 'continuation') input.continuation = seven.continuation;
    if (mode === 'missing-continuation') delete input.continuation;
    if (mode === 'revision') input.revision = 5;
    if (mode === 'card') input.cardId = 'official:77414722';
    if (mode === 'handler') input.handler = 'discard-negate-normal-spell-activation';
    if (mode === 'extra') input.runtimeEnabled = true;
    if (mode === 'empty-evidence') input.evidence = [];
    const before = structuredClone(input), records = mode === 'duplicate' ? [input, input] : [input];
    expect(CounterReviewsSchema.safeParse(records).success).toBe(false);
    if (mode !== 'duplicate') expect(() => preflightBoundedCounterReview(registry, input)).toThrow();
    expect(input).toEqual(before);
  });
  it.each(['review-pin', 'review-format-id', 'review-format-revision', 'future-revision', 'old-review', 'design-profile'])('rejects semantically invalid preflight %s', mode => {
    let input: any = proposal();
    if (mode === 'review-pin') input.definitionSha256 = '0'.repeat(64);
    if (mode === 'review-format-id') input.format.id = 'other';
    if (mode === 'review-format-revision') input.format.revision++;
    if (mode === 'future-revision') input.revision++;
    if (mode === 'old-review') input = structuredClone(seven);
    if (mode === 'design-profile') input = structuredClone(profile);
    const before = structuredClone(input); expect(() => preflightBoundedCounterReview(registry, input)).toThrow(); expect(input).toEqual(before);
  });
  it.each(pins)('rejects missing pinned dependency %s', id => {
    const r = structuredClone(registry); delete (r.cards as any)[id];
    const before = structuredClone(r); expect(() => preflightBoundedCounterReview(r, proposal())).toThrow('dependency definition conflict'); expect(r).toEqual(before);
  });
  it.each(pins)('rejects a changed full definition for %s', id => {
    const r = structuredClone(registry); (r.cards[id]! as any).name += ' changed';
    const before = structuredClone(r); expect(() => preflightBoundedCounterReview(r, proposal())).toThrow('dependency definition conflict'); expect(r).toEqual(before);
  });
  it.each(Object.keys(registry.spellHandlers))('rejects a missing reviewed Spell binding %s', id => {
    const r = structuredClone(registry); delete (r.spellHandlers as any)[id];
    expect(() => preflightBoundedCounterReview(r, proposal())).toThrow('Spell binding conflict');
  });
  it.each(['pot-count', 'damage-amount', 'heal-amount', 'wrong-handler', 'extra-binding-field', 'trap', 'magic', 'seven', 'format-id', 'format-revision', 'copy-limit', 'slots'])('rejects dependent capability drift %s', mode => {
    const r: any = structuredClone(registry);
    if (mode === 'pot-count') r.spellHandlers['official:55144522'].count = 3;
    if (mode === 'damage-amount') r.spellHandlers['official:19523799'].amount = 500;
    if (mode === 'heal-amount') r.spellHandlers['official:84257639'].amount = 2000;
    if (mode === 'wrong-handler') r.spellHandlers['official:66788016'] = { handler: 'draw', count: 2 };
    if (mode === 'extra-binding-field') r.spellHandlers['official:55144522'].amount = 1000;
    if (mode === 'trap') delete r.trapHandlers['official:04206964'];
    if (mode === 'magic') delete r.counterTrapHandlers['official:77414722'];
    if (mode === 'seven') delete r.counterTrapHandlers['official:03819470'];
    if (mode === 'format-id') r.format.id = 'other';
    if (mode === 'format-revision') r.format.revision++;
    if (mode === 'copy-limit') r.rules.deck.combinedCopyLimit = 4;
    if (mode === 'slots') r.rules.spellTrapSlots = 6;
    const before = structuredClone(r); expect(() => preflightBoundedCounterReview(r, proposal())).toThrow(); expect(r).toEqual(before);
  });
  it('keeps all historical review schema versions and the runtime v5 registry unchanged', () => {
    for (const suffix of ['', '-v2', '-v3', '-v4', '-v5']) {
      const records = JSON.parse(readFileSync(`data/reviews/seven-tools${suffix}.effects.json`, 'utf8'));
      expect(CounterReviewsSchema.safeParse(records).success).toBe(true);
    }
    const rebuilt = build(seven); expect(rebuilt).toEqual(registry); expect(rebuilt.revision).toBe(registry.revision);
  });
});
