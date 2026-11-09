import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DuelState, ChainLink } from '../../protocol/src/duel.js';
import type { Registry } from './registry.js';
import { freeze } from './registry.js';
import { validateBoundedCounterGraph, BOUNDED_SEVEN_CANDIDATE_EFFECT } from './bounded-counter-graph.js';
import { captureBoundedSevenLPCandidate } from './bounded-seven-lp-ledger.js';
import type { BoundedSevenLPCandidateLedger } from './bounded-seven-lp-ledger.js';
import { planResolution, chooseDestruction } from './effect-plans.js';
import type { ResolutionPlan } from './effect-plans.js';
import { spellResolutionBoard } from './spell-resolution.js';
import { prepareChainCleanup, chainCleanupDecision, orderChainCleanup, commitChainCleanup } from './chain-cleanup.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const AnswerSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('choose'), playerId: z.string().min(1), decisionId: z.string().min(1), optionIds: z.array(z.string().min(1)).min(1).max(10) }),
  z.strictObject({ kind: z.literal('concede'), playerId: z.string().min(1) }),
]);
export type BoundedCounterCandidateAnswer = z.infer<typeof AnswerSchema>;
export interface BoundedCounterCandidateTrace {
  readonly kind: 'resolve' | 'negate' | 'skip' | 'destroy' | 'draw' | 'damage' | 'heal' | 'return' | 'position' | 'cleanup' | 'terminal' | 'concede';
  readonly linkId: string;
  readonly instanceIds: readonly string[];
}
type Stage = 'root-choice' | 'cleanup' | 'done' | 'terminal';
export interface BoundedCounterCandidateJournal {
  readonly version: 1;
  readonly kind: 'bounded-counter-dispatcher-candidate-v1';
  readonly entry: DuelState;
  readonly answers: readonly BoundedCounterCandidateAnswer[];
  readonly stage: Stage;
  readonly cursor: number;
  readonly lpCosts: Readonly<BoundedSevenLPCandidateLedger> | null;
  readonly cleanupSourceIds: readonly string[];
  readonly trace: readonly BoundedCounterCandidateTrace[];
  readonly entryFingerprint: string;
  readonly stateFingerprint: string;
  readonly integritySha256: string;
}
const JournalSchema = z.strictObject({ version: z.literal(1), kind: z.literal('bounded-counter-dispatcher-candidate-v1'),
  entry: z.unknown(), answers: z.array(AnswerSchema).max(4), stage: z.enum(['root-choice', 'cleanup', 'done', 'terminal']),
  cursor: z.number().int().min(-1).max(7), lpCosts: z.unknown(), cleanupSourceIds: z.array(z.string().min(1)).max(8),
  trace: z.array(z.unknown()).max(100), entryFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  stateFingerprint: z.string().regex(/^[a-f0-9]{64}$/), integritySha256: z.string().regex(/^[a-f0-9]{64}$/) });
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function check(v: unknown, message: string): asserts v { if (!v) throw new Error(message); }

/** Pure candidate interpreter. Not installed in DuelState, exported through the adapter,
 * or permission for live activation. All inputs and receipts are trusted component data.
 * Replay below is an integrity check, not authentication or a deduplication service.
 */
function run(registry: Registry, entry: DuelState, answers: readonly BoundedCounterCandidateAnswer[]) {
  validateBoundedCounterGraph(registry, entry);
  check(entry.timing.window === 'resolving' && entry.timing.consecutivePasses === 2, 'Candidate resolution requires two Passes');
  const first = entry.chain[0]!, second = entry.chain[1];
  if (first.effectId === 'normal-spell' && registry.spellHandlers[first.sourceAtActivation.definition.id]?.handler === 'discard-return-own-graveyard-monster'
    && second?.effectId === 'discard-negate-normal-spell-activation') {
    check(first.targetRefs[0]?.instanceId !== second.costEvents[0]?.affectedInstances[0], 'Root target was discarded by a later activation');
  }
  const lpCosts = entry.chain.some(l => l.effectId === BOUNDED_SEVEN_CANDIDATE_EFFECT) ? captureBoundedSevenLPCandidate(registry, entry) : null;
  const s = structuredClone(entry) as Mutable<DuelState>;
  const trace: BoundedCounterCandidateTrace[] = [];
  let stage: Stage = 'done', cursor = s.chain.length - 1, answerIndex = 0;
  let cleanupSourceIds: string[] = [];
  s.stateVersion++;
  const emit = (kind: BoundedCounterCandidateTrace['kind'], linkId: string, instanceIds: readonly string[] = []) => {
    trace.push({ kind, linkId, instanceIds: [...instanceIds] }); s.eventSequence++;
    check(Number.isSafeInteger(s.eventSequence), 'Candidate event clock overflow');
  };
  const player = (id: string) => { const p = s.players.find(p => p.id === id); check(p, 'Unknown candidate player'); return p; };
  const other = (id: string) => s.players.find(p => p.id !== id)!.id;
  const grave = (id: string) => {
    const c = s.cards[id]!;
    if (c.location.kind === 'monster') player(c.controllerId).monsters[c.location.slot] = null;
    else if (c.location.kind === 'spell-trap') player(c.controllerId).spellsTraps[c.location.slot] = null;
    else throw new Error('Candidate destruction source already moved');
    player(c.ownerId).graveyard.push(id); c.location = { kind: 'graveyard', playerId: c.ownerId }; c.controllerId = c.ownerId; c.position = 'face-up';
  };
  const terminal = (winner: string, reason: 'life-points' | 'failed-draw' | 'concession', linkId: string) => {
    s.result = { winner, reason }; s.pendingDecision = null; s.chainCleanup = null; s.chain = [];
    s.timing = { ...s.timing, window: 'open', priorityPlayer: null, consecutivePasses: 0 };
    stage = 'terminal'; cursor = -1; emit(reason === 'concession' ? 'concede' : 'terminal', linkId);
  };
  const rootPlan = (l: ChainLink) => planResolution(registry.spellHandlers[l.sourceAtActivation.definition.id], spellResolutionBoard(registry, s, l.controllerId));
  const applyPlan = (l: ChainLink, plan: Exclude<ResolutionPlan, { kind: 'choose-destruction' }>) => {
    if (plan.kind === 'draw') for (let i = 0; i < plan.count && !s.result; i++) {
      const p = player(plan.playerId), id = p.deck.shift();
      if (!id) { terminal(other(p.id), 'failed-draw', l.id); break; }
      p.hand.push(id); s.cards[id]!.location = { kind: 'hand', playerId: p.id }; emit('draw', l.id, [id]);
    }
    if (plan.kind === 'effect-damage') {
      const p = player(other(plan.controllerId)); p.lifePoints = Math.max(0, p.lifePoints - plan.amount); emit('damage', l.id);
      if (!p.lifePoints) terminal(plan.controllerId, 'life-points', l.id);
    }
    if (plan.kind === 'life-points-gained') {
      const p = player(plan.playerId); check(Number.isSafeInteger(p.lifePoints + plan.amount), 'Candidate LP overflow');
      p.lifePoints += plan.amount; emit('heal', l.id);
    }
    if (plan.kind === 'change-all-to-defense') {
      for (const id of plan.instanceIds) s.cards[id]!.position = 'face-up-defense'; emit('position', l.id, plan.instanceIds);
    }
    if (plan.kind === 'destroy') { grave(plan.instanceId); emit('destroy', l.id, [plan.instanceId]); }
    const ref = l.targetRefs[0], target = ref && s.cards[ref.instanceId];
    const bound = target && same(target.location, ref!.locationAtSelection);
    if (plan.kind === 'destroy-selected-monster' && bound && target.location.kind === 'monster') { grave(target.id); emit('destroy', l.id, [target.id]); }
    if (plan.kind === 'change-selected-monster-to-defense' && bound && target.location.kind === 'monster'
      && target.controllerId !== l.controllerId && target.position === 'face-up-attack') { target.position = 'face-up-defense'; emit('position', l.id, [target.id]); }
    if (plan.kind === 'return-selected-graveyard-monster' && bound && target.location.kind === 'graveyard' && target.location.playerId === l.controllerId) {
      const gy = player(target.ownerId).graveyard; gy.splice(gy.indexOf(target.id), 1); player(target.ownerId).hand.push(target.id);
      target.location = { kind: 'hand', playerId: target.ownerId }; target.controllerId = target.ownerId; target.position = 'face-down'; target.counters = {};
      target.markers = { summonedOnTurn: null, summonedBy: null, setOnTurn: null, manuallyChangedOnTurn: null, attackDeclarationsThisTurn: 0, attackCountConsumedThisTurn: 0, wasBattleDestroyed: false };
      emit('return', l.id, [target.id]);
    }
  };
  const decisionId = (tag: string) => `${entry.id}:bounded-candidate:${s.stateVersion}:${tag}`;
  const finishCleanup = () => {
    check(s.chainCleanup, 'Missing candidate cleanup');
    const d = chainCleanupDecision(registry, { ...s, pendingDecision: null }, s.chainCleanup);
    if (d) {
      stage = 'cleanup'; s.pendingDecision = { id: decisionId('cleanup-' + d.playerId), kind: 'cleanup-order', playerId: d.playerId,
        optionIds: [...d.optionIds], min: d.min, max: d.max }; return;
    }
    const orderedSources = s.chainCleanup.batches.flatMap(b => [...b.order!]);
    Object.assign(s, commitChainCleanup(registry, { ...s, pendingDecision: null }, s.chainCleanup)); emit('cleanup', '', orderedSources);
    s.chainCleanup = null; s.pendingDecision = null; s.chain = []; stage = 'done';
    s.timing = { ...s.timing, window: 'action-response', priorityPlayer: s.turn.activePlayer, consecutivePasses: 0 };
  };
  const beginCleanup = () => {
    cursor = -1;
    cleanupSourceIds = s.chain.filter(l => !l.activationNegated && s.cards[l.source]!.location.kind === 'spell-trap').map(l => l.source);
    s.chainCleanup = prepareChainCleanup(registry, s, cleanupSourceIds) as Mutable<DuelState>['chainCleanup']; finishCleanup();
  };
  while (cursor >= 0 && !s.result) {
    const l = s.chain[cursor]!;
    if (l.activationNegated) { emit('skip', l.id, [l.source]); cursor--; continue; }
    emit('resolve', l.id, [l.source]);
    if (l.effectId === BOUNDED_SEVEN_CANDIDATE_EFFECT || l.effectId === 'discard-negate-normal-spell-activation') {
      const previous = s.chain[cursor - 1]; check(previous && l.respondingToLinkId === previous.id, 'Candidate response graph changed');
      previous.activationNegated = true; emit('negate', previous.id, [previous.source]); grave(previous.source); emit('destroy', l.id, [previous.source]);
    } else if (l.effectId === 'normal-spell') {
      const plan = rootPlan(l);
      if (plan.kind === 'choose-destruction') {
        stage = 'root-choice'; s.pendingDecision = { id: decisionId('root-choice'), kind: 'effect-choice', playerId: plan.playerId,
          optionIds: [...plan.optionIds], min: 1, max: 1 }; break;
      }
      applyPlan(l, plan);
    } else {
      const ref = l.targetRefs[0], c = ref && s.cards[ref.instanceId];
      if (c && c.location.kind === 'monster' && same(c.location, ref!.locationAtSelection) && c.position !== 'face-down-defense') {
        grave(c.id); emit('destroy', l.id, [c.id]);
      }
    }
    if (!s.result) cursor--; else cursor = -1;
  }
  if (s.result && entry.chain.length === 1 && s.result.reason !== 'concession') {
    // Preserve existing single-Spell terminal bookkeeping; multi-source terminal
    // never invents a post-game owner order or moves surviving sources.
    const source = entry.chain[0]!.source, frame = prepareChainCleanup(registry, s, [source], 'terminal-single-source');
    Object.assign(s, commitChainCleanup(registry, s, frame)); emit('cleanup', '', [source]);
  }
  if (!s.result && !s.pendingDecision) beginCleanup();
  for (const raw of answers) {
    const a = AnswerSchema.parse(raw);
    const stageAtAnswer = stage as Stage;
    check(stageAtAnswer === 'root-choice' || stageAtAnswer === 'cleanup', 'Candidate already finished');
    check(s.players.some(p => p.id === a.playerId), 'Unknown candidate answering player');
    s.stateVersion++; answerIndex++;
    if (a.kind === 'concede') { terminal(other(a.playerId), 'concession', ''); continue; }
    const d = s.pendingDecision;
    check(d && d.id === a.decisionId && d.playerId === a.playerId, 'Stale or private candidate decision');
    if (stageAtAnswer === 'root-choice') {
      const l = s.chain[cursor]!, plan = rootPlan(l);
      check(plan.kind === 'choose-destruction' && same(plan.optionIds, d.optionIds) && a.optionIds.length === 1, 'Candidate root choice changed');
      const selected = chooseDestruction(plan, a.optionIds[0]!); check(selected.kind === 'destroy', 'Invalid candidate root answer');
      s.pendingDecision = null; applyPlan(l, selected); cursor--; beginCleanup();
    } else {
      check(s.chainCleanup, 'Missing candidate cleanup frame'); s.pendingDecision = null;
      s.chainCleanup = orderChainCleanup(registry, s, s.chainCleanup, a.playerId, a.optionIds) as Mutable<DuelState>['chainCleanup']; finishCleanup();
    }
  }
  check(answers.length <= 4 && answerIndex === answers.length && Number.isSafeInteger(s.stateVersion), 'Invalid candidate answer clock');
  const body: Omit<BoundedCounterCandidateJournal, 'integritySha256'> = { version: 1, kind: 'bounded-counter-dispatcher-candidate-v1',
    entry: structuredClone(entry), answers: structuredClone(answers), stage, cursor, lpCosts,
    cleanupSourceIds, trace, entryFingerprint: hash(entry), stateFingerprint: hash(s) };
  return freeze({ state: s as DuelState, journal: { ...body, integritySha256: hash(body) } });
}

export function prepareBoundedCounterCandidate(registry: Registry, entry: DuelState) { return run(registry, entry, []); }

/** Recompute the trusted candidate transition, including all choices, not merely its hash.
 * A resealed drifted checkpoint cannot stand in for a valid intermediate board. No input freezes.
 */
export function assertBoundedCounterCandidate(registry: Registry, state: DuelState, journal: BoundedCounterCandidateJournal): void {
  check(JournalSchema.safeParse(journal).success, 'Malformed bounded dispatcher journal');
  const { integritySha256, ...body } = journal;
  check(integritySha256 === hash(body), 'Bounded dispatcher journal changed');
  const expected = run(registry, journal.entry, journal.answers);
  check(same(expected.journal, journal) && same(expected.state, state), 'Bounded dispatcher checkpoint drift');
}

export function resumeBoundedCounterCandidate(registry: Registry, state: DuelState, journal: BoundedCounterCandidateJournal, answer: BoundedCounterCandidateAnswer) {
  assertBoundedCounterCandidate(registry, state, journal);
  return run(registry, journal.entry, [...journal.answers, AnswerSchema.parse(answer)]);
}
