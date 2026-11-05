import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {DuelState} from '../../protocol/src/duel.js';
import type {Registry} from './registry.js';
import {freeze} from './registry.js';
import {resolutionFingerprint} from './resolution-fingerprint.js';
import {readSevenLPCostPayments,sevenLPCostBalances,SevenLPCostLedgerSchema,SevenLPCostPaymentSchema} from './seven-lp-cost-ledger.js';
import type {SevenLPCostLedger} from './seven-lp-cost-ledger.js';

/** Separate accounting contract. Never permission for a third Seven activation. */
export type {ThreeSevenLPCostLedger} from '../../protocol/src/duel.js';
import type {ThreeSevenLPCostLedger} from '../../protocol/src/duel.js';
const Schema=SevenLPCostLedgerSchema.extend({version:z.literal(2),kind:z.literal('seven-tools-three-payments-ledger-v2'),
  payments:z.array(SevenLPCostPaymentSchema).length(3),
  balances:z.array(SevenLPCostLedgerSchema.shape.balances.element.extend({paymentCount:z.number().int().positive().max(3)})).min(1).max(2)});
function check(v:unknown,m:string):asserts v{if(!v)throw new Error(m);}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const digest=(body:Omit<ThreeSevenLPCostLedger,'integritySha256'>)=>createHash('sha256').update(JSON.stringify(body)).digest('hex');

/** History/arithmetic only. Does not authenticate a client or bind current LP/board. */
export function assertThreeSevenLPCostHistory(ledger:ThreeSevenLPCostLedger){
  check(Schema.safeParse(ledger).success,'Malformed three-payment ledger');const{integritySha256,...body}=ledger;
  check(integritySha256===digest(body),'Three-payment ledger changed');
  check(ledger.playerIds[0]!==ledger.playerIds[1]&&ledger.playerIds.includes(ledger.turn.activePlayer),'Invalid three-payment players');
  for(const key of ['linkId','sourceId','sequence','simultaneousGroup']as const)check(new Set(ledger.payments.map(p=>p[key])).size===3,'Duplicate three-payment receipt identity');
  ledger.payments.forEach((p,i)=>check(ledger.playerIds.includes(p.playerId)&&p.sequence<ledger.capturedSequence&&(i===0||p.sequence>ledger.payments[i-1]!.sequence),'Invalid three-payment chronology/player'));
  check(same(ledger.balances,sevenLPCostBalances(ledger.payments,ledger.playerIds)),'Incorrect three-payment totals');
}
/** All costs already paid in a trusted candidate state; produces no LP/event/card changes. */
export function captureThreeSevenLPCosts(registry:Registry,state:DuelState):ThreeSevenLPCostLedger{
  const payments=readSevenLPCostPayments(registry,state,3);check(payments.length===3,'Exactly three Seven payments required');
  const playerIds=state.players.map(p=>p.id)as[string,string],balances=sevenLPCostBalances(payments,playerIds);
  for(const b of balances)check(state.players.find(p=>p.id===b.playerId)!.lifePoints===b.afterLastLP,'Three-payment LP does not match final receipt');
  const body:Omit<ThreeSevenLPCostLedger,'integritySha256'>={version:2,kind:'seven-tools-three-payments-ledger-v2',duelId:state.id,registryRevision:registry.revision,
    format:{id:'goat-2005-08-17',revision:4},definitionSha256:'2dbc5c07956ac97d58b2f449898bf2d73bd0488578b9c69c0fadd5e468accbc0',playerIds,
    turn:{number:state.turn.number,activePlayer:state.turn.activePlayer,phase:state.turn.phase as 'main1'|'main2'},capturedStateVersion:state.stateVersion,capturedSequence:state.eventSequence,
    payments,balances,boardFingerprint:resolutionFingerprint(state)};
  const result=freeze({...body,integritySha256:digest(body)});assertThreeSevenLPCostHistory(result);return result;
}
export function assertCurrentThreeSevenLPCosts(registry:Registry,state:DuelState,ledger:ThreeSevenLPCostLedger){
  assertThreeSevenLPCostHistory(ledger);
  check(state.id===ledger.duelId&&registry.revision===ledger.registryRevision&&same(state.turn,ledger.turn)
    &&Number.isSafeInteger(state.stateVersion)&&state.stateVersion>=ledger.capturedStateVersion&&Number.isSafeInteger(state.eventSequence)&&state.eventSequence>=ledger.capturedSequence
    &&resolutionFingerprint(state)===ledger.boardFingerprint,'Three-payment board/clock drift');
  check(same(readSevenLPCostPayments(registry,state,3),ledger.payments),'Three-payment current receipts drift');
  for(const b of ledger.balances)check(state.players.find(p=>p.id===b.playerId)?.lifePoints===b.afterLastLP,'Three-payment current LP drift');
}
