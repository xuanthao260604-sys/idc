import { createHash } from 'node:crypto';
import { z } from 'zod';
import { CardBatchSchema } from '../../card-data/src/schema.js';
import type { CardDefinition } from '../../card-data/src/schema.js';
import { FormatSchema } from '../../card-data/src/format.js';
import type { FormatDefinition } from '../../card-data/src/format.js';

import { CounterReviewsSchema } from './counter-review.js';
import type { CounterHandler } from './counter-review.js';
import { TrapReviewsSchema } from './trap-review.js';
import { FlipReviewsSchema } from './flip-review.js';
import type { FlipHandler } from './flip-review.js';
export type SupportedMonster = Extract<CardDefinition, { kind: 'normal-monster' | 'effect-monster' }>;
export type NormalTrap = Extract<CardDefinition, { kind: 'trap' }>;
export type NormalSpell = Extract<CardDefinition, { kind: 'spell' }>;
import { SpellHandlerSchema, SpellReviewsSchema, definitionFingerprint } from './spell-review.js';
import type { SpellHandler } from './spell-review.js';
export type { SpellHandler } from './spell-review.js';
export type NormalCard = Extract<CardDefinition, { kind: 'normal-monster' }>;
export function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
const CoreRulesSchema = z.strictObject({
  lifePoints: z.number().int().positive(), openingHand: z.number().int().positive(),
  deck: z.object({ mainMin: z.number().int().positive(), mainMax: z.number().int().positive().nullable(), combinedCopyLimit: z.number().int().positive() }),
  summons: z.object({ normalSummonOrSetQuota: z.literal(1), tributesByLevel: z.array(z.strictObject({ min: z.number().int(), max: z.number().int(), count: z.number().int().nonnegative() })).min(1) }),
  positions: z.object({ manualChangesPerMonsterPerTurn: z.literal(1), blockedAfterAttack: z.literal(true), blockedWhenSummonedByTurnPlayerThisTurn: z.literal(true), opponentSummonedThisTurnException: z.literal(true) }),
  phases: z.object({ firstPlayerFirstTurnBattle: z.literal(false), main2RequiresBattlePhase: z.literal(true), battleOptional: z.literal(true) }),
  battle: z.object({ equalAttackZeroDestroysBoth: z.literal(true), attackDefenseDefaultPiercing: z.literal(false) }),
  firstTurnDraw: z.literal(true), handLimit: z.number().int().nonnegative(),
  monsterSlots: z.literal(5), spellTrapSlots: z.literal(5),
});
export interface Registry {
  readonly format: { readonly id: string; readonly revision: number };
  readonly revision: string;
  readonly cards: Readonly<Record<string, SupportedMonster | NormalSpell | NormalTrap>>;
  readonly counterTrapHandlers: Readonly<Record<string, CounterHandler>>;
  readonly trapHandlers: Readonly<Record<string, 'destroy-opponent-normal-or-flip-summoned-1000'>>;
  readonly flipHandlers: Readonly<Record<string, FlipHandler>>;
  readonly spellHandlers: Readonly<Record<string, SpellHandler>>;
  readonly unsupportedIds: readonly string[];
  readonly rules: z.infer<typeof CoreRulesSchema>;
}

/** Supported behavior is an engine capability, not an alteration of imported metadata. */
export function createRegistry(definitions: unknown, formatInput: FormatDefinition, spellBindings: Readonly<Record<string, SpellHandler>> = {}, reviewInput: unknown = [], flipReviewInput: unknown = [], trapReviewInput: unknown = [], counterReviewInput: unknown = []): Registry {
  const format = FormatSchema.parse(formatInput);
  if (format.status !== 'ready') throw new Error('Rules design profile is not ready');
  const d = format.decisions;
  const layout = z.object({ monsterSlotsPerPlayer: z.literal(5), spellTrapSlotsPerPlayer: z.literal(5) }).parse(d.fieldLayout.proposedValue);
  const rules = CoreRulesSchema.parse({
    lifePoints: d.startingLifePoints.proposedValue, openingHand: d.openingHand.proposedValue,
    deck: d.deckConstruction.proposedValue, summons: d.normalAndTributeSummons.proposedValue,
    positions: d.positionChanges.proposedValue, phases: d.turnPhases.proposedValue,
    battle: d.battleAndDamageStep.proposedValue, firstTurnDraw: d.firstTurnDraw.proposedValue,
    handLimit: z.object({ standardHandLimit: z.number() }).parse(d.endPhaseAndHandLimit.proposedValue).standardHandLimit,
    monsterSlots: layout.monsterSlotsPerPlayer, spellTrapSlots: layout.spellTrapSlotsPerPlayer,
  });
  const parsed = CardBatchSchema.parse(definitions);
  const reviews = SpellReviewsSchema.parse(reviewInput);
  for (const review of reviews) {
    const card = parsed.find(c => c.id === review.cardId);
    if (!card || card.kind !== 'spell' || card.subtype !== 'normal' || card.origin !== 'official'
      || review.format.id !== format.id || review.format.revision !== format.revision
      || definitionFingerprint(card) !== review.definitionSha256)
      throw new Error(`Spell review conflict: ${review.cardId}; preserve review and re-review changed data`);
    if (spellBindings[review.cardId]) throw new Error('Official review cannot be overridden by a custom binding');
  }
  const flipReviews = FlipReviewsSchema.parse(flipReviewInput);
  for (const review of flipReviews) {
    const card = parsed.find(c => c.id === review.cardId);
    if (!card || card.kind !== 'effect-monster' || card.origin !== 'official'
      || review.format.id !== format.id || review.format.revision !== format.revision
      || definitionFingerprint(card) !== review.definitionSha256) throw new Error(`FLIP review conflict: ${review.cardId}`);
  }
  const trapReviews = TrapReviewsSchema.parse(trapReviewInput);
  for (const review of trapReviews) {
    const card = parsed.find(c => c.id === review.cardId);
    if (!card || card.kind !== 'trap' || card.subtype !== 'normal' || card.origin !== 'official'
      || review.format.id !== format.id || review.format.revision !== format.revision
      || definitionFingerprint(card) !== review.definitionSha256) throw new Error(`Trap review conflict: ${review.cardId}`);
  }
  const counterReviews = CounterReviewsSchema.parse(counterReviewInput);
  for (const review of counterReviews) {
    const card = parsed.find(c => c.id === review.cardId);
    if (!card || card.kind !== 'trap' || card.subtype !== 'counter' || card.origin !== 'official'
      || review.format.id !== format.id || review.format.revision !== format.revision
      || definitionFingerprint(card) !== review.definitionSha256) throw new Error(`Counter Trap review conflict: ${review.cardId}`);
  }
  const counterTrapHandlers: Record<string, CounterHandler> = {};
  const trapHandlers: Record<string, 'destroy-opponent-normal-or-flip-summoned-1000'> = {};
  const flipHandlers: Record<string, FlipHandler> = {};
  const cards: Record<string, SupportedMonster | NormalSpell | NormalTrap> = {};
  const spellHandlers: Record<string, SpellHandler> = {};
  const unsupportedIds: string[] = [];
  const names = new Set<string>();
  for (const card of parsed.sort((a, b) => a.id.localeCompare(b.id, 'en'))) {
    const binding = spellBindings[card.id];
    const customSpell = card.origin === 'custom' && card.kind === 'spell' && card.subtype === 'normal' && binding;
    const officialReview = reviews.find(r => r.cardId === card.id);
    const flipReview = flipReviews.find(r => r.cardId === card.id);
    const counterReview = counterReviews.find(r => r.cardId === card.id);
    const trapReview = trapReviews.find(r => r.cardId === card.id);
    const supportedSpell = customSpell || officialReview;
    if ((!supportedSpell && !flipReview && !trapReview && !counterReview && card.kind !== 'normal-monster') || (!officialReview && !flipReview && !trapReview && !counterReview && card.verification !== 'verified') || (!supportedSpell && !flipReview && !trapReview && !counterReview && card.effects.length !== 0)
      || card.legality.formatId !== format.id || card.legality.status !== 'legal' || !card.legality.maxCopies) {
      unsupportedIds.push(card.id); continue;
    }
    if (names.has(card.name)) throw new Error('Registry requires one definition per canonical card name');
    names.add(card.name);
    cards[card.id] = card as SupportedMonster | NormalSpell | NormalTrap;
    if (counterReview) counterTrapHandlers[card.id] = counterReview.handler;
    if (trapReview) trapHandlers[card.id] = trapReview.handler;
    if (flipReview) flipHandlers[card.id] = flipReview.handler;
    if (supportedSpell) spellHandlers[card.id] = SpellHandlerSchema.parse(officialReview?.handler ?? binding);
  }
  const reference = { id: format.id, revision: format.revision };
  const revision = createHash('sha256').update(JSON.stringify({ engineCapabilityVersion: 'spell-or-trap-hole-counter-two-link-v1', format, rules, cards, spellHandlers, reviews, flipHandlers, flipReviews, trapHandlers, trapReviews, counterTrapHandlers, counterReviews })).digest('hex');
  return freeze({ format: reference, revision, cards, spellHandlers, flipHandlers, trapHandlers, counterTrapHandlers, unsupportedIds, rules });
}

export function validateDeck(registry: Registry, ids: readonly string[]) {
  if (ids.length < registry.rules.deck.mainMin || (registry.rules.deck.mainMax !== null && ids.length > registry.rules.deck.mainMax))
    throw new Error('Deck size is not legal for this format');
  const counts = new Map<string, number>();
  for (const id of ids) {
    const card = registry.cards[id];
    if (!card) throw new Error(`Unsupported or unverified card in deck: ${id}`);
    const count = (counts.get(card.name) ?? 0) + 1;
    if (count > Math.min(registry.rules.deck.combinedCopyLimit, card.legality.maxCopies!))
      throw new Error(`Copy limit exceeded: ${id}`);
    counts.set(card.name, count);
  }
}
