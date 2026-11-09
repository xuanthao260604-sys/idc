import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DuelState } from '../../protocol/src/duel.js';
import type { Registry } from './registry.js';
import { freeze } from './registry.js';
import { resolutionFingerprint } from './resolution-fingerprint.js';
import { SevenLPCostPaymentSchema, sevenLPCostBalances } from './seven-lp-cost-ledger.js';
import { validateBoundedCounterGraph } from './bounded-counter-graph.js';

const id = z.string().min(1), integer = z.number().int().nonnegative().safe(), sha = z.string().regex(/^[a-f0-9]{64}$/);
const Schema = z.strictObject({ version: z.literal(1), kind: z.literal('bounded-seven-lp-ledger-candidate-v1'),
  duelId: id, registryRevision: id, playerIds: z.tuple([id, id]),
  turn: z.strictObject({ number: integer.positive(), activePlayer: id, phase: z.enum(['main1', 'main2']) }),
  capturedStateVersion: integer, capturedSequence: integer.positive(), boardFingerprint: sha,
  payments: z.array(SevenLPCostPaymentSchema).min(1).max(6),
  balances: z.array(z.strictObject({ playerId: id, beforeFirstLP: integer.positive(), afterLastLP: integer.positive(),
    paymentCount: integer.positive().max(3), totalPaid: integer.positive() })).min(1).max(2), integritySha256: sha });
export type BoundedSevenLPCandidateLedger = z.infer<typeof Schema>;
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const digest = (body: Omit<BoundedSevenLPCandidateLedger, 'integritySha256'>) => createHash('sha256').update(JSON.stringify(body)).digest('hex');

/** Arithmetic/history only; integrity hash is not authentication or current-board binding. */
export function assertBoundedSevenLPHistory(ledger: BoundedSevenLPCandidateLedger): void {
  check(Schema.safeParse(ledger).success, 'Malformed bounded candidate ledger');
  const { integritySha256, ...body } = ledger;
  check(integritySha256 === digest(body), 'Bounded candidate ledger changed');
  check(new Set(ledger.playerIds).size === 2 && ledger.playerIds.includes(ledger.turn.activePlayer), 'Invalid bounded ledger players');
  for (const key of ['linkId', 'sourceId', 'sequence', 'simultaneousGroup'] as const)
    check(new Set(ledger.payments.map(p => p[key])).size === ledger.payments.length, 'Duplicate bounded receipt identity');
  ledger.payments.forEach((p, i) => check(ledger.playerIds.includes(p.playerId) && p.sequence < ledger.capturedSequence
    && (i === 0 || p.sequence > ledger.payments[i - 1]!.sequence), 'Invalid bounded receipt chronology/player'));
  check(same(ledger.balances, sevenLPCostBalances(ledger.payments, ledger.playerIds)), 'Incorrect bounded LP totals');
}

/** Costs have ALREADY been paid in a trusted candidate snapshot. Never pays or enables an action. */
export function captureBoundedSevenLPCandidate(registry: Registry, state: DuelState): Readonly<BoundedSevenLPCandidateLedger> {
  const graph = validateBoundedCounterGraph(registry, state);
  check(graph.sevenCount > 0, 'No bounded Seven payments');
  const body: Omit<BoundedSevenLPCandidateLedger, 'integritySha256'> = {
    version: 1, kind: 'bounded-seven-lp-ledger-candidate-v1', duelId: state.id, registryRevision: registry.revision,
    playerIds: [state.players[0].id, state.players[1].id],
    turn: { number: state.turn.number, activePlayer: state.turn.activePlayer, phase: state.turn.phase as 'main1' | 'main2' },
    capturedStateVersion: state.stateVersion, capturedSequence: state.eventSequence,
    boardFingerprint: resolutionFingerprint(state), payments: structuredClone(graph.payments), balances: structuredClone(graph.balances),
  };
  const result = { ...body, integritySha256: digest(body) };
  assertBoundedSevenLPHistory(result); return freeze(result);
}

export function assertCurrentBoundedSevenLPCandidate(registry: Registry, state: DuelState, ledger: BoundedSevenLPCandidateLedger): void {
  assertBoundedSevenLPHistory(ledger);
  check(state.id === ledger.duelId && registry.revision === ledger.registryRevision && same(state.turn, ledger.turn)
    && same(state.players.map(p => p.id), ledger.playerIds) && state.stateVersion >= ledger.capturedStateVersion
    && state.eventSequence >= ledger.capturedSequence && resolutionFingerprint(state) === ledger.boardFingerprint, 'Bounded candidate board/clock drift');
  const graph = validateBoundedCounterGraph(registry, state);
  check(same(graph.payments, ledger.payments) && same(graph.balances, ledger.balances), 'Bounded candidate receipts drift');
}
