import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DuelState } from '../../protocol/src/duel.js';
import { definitionFingerprint } from './spell-review.js';
import { resolutionFingerprint } from './resolution-fingerprint.js';
import { freeze } from './registry.js';
import type { Registry } from './registry.js';

// Accounting boundary only. Neither this pin nor a valid ledger permits activation.
const SEVEN = 'official:03819470';
const PIN = '2dbc5c07956ac97d58b2f449898bf2d73bd0488578b9c69c0fadd5e468accbc0';
const id = z.string().min(1), integer = z.number().int().nonnegative().safe();
const sha = z.string().regex(/^[a-f0-9]{64}$/);
const Cost = z.strictObject({ sequence: integer.positive(), simultaneousGroup: id, kind: z.literal('life-points-paid'),
  affectedInstances: z.array(id).length(0), details: z.strictObject({ playerId: id, reason: z.literal('activation-cost'),
    amount: z.literal(1000), beforeLP: integer.positive(), afterLP: integer.positive() }) });
const Payment = z.strictObject({ linkId: id, sourceId: id, playerId: id, sequence: integer.positive(), simultaneousGroup: id,
  amount: z.literal(1000), beforeLP: integer.positive(), afterLP: integer.positive() });
const Balance = z.strictObject({ playerId: id, beforeFirstLP: integer.positive(), afterLastLP: integer.positive(),
  paymentCount: integer.positive().max(2), totalPaid: integer.positive() });
const Ledger = z.strictObject({ version: z.literal(1), kind: z.literal('seven-tools-lp-cost-ledger-v1'),
  duelId: id, registryRevision: id, format: z.strictObject({ id: z.literal('goat-2005-08-17'), revision: z.literal(4) }),
  definitionSha256: z.literal(PIN), playerIds: z.tuple([id,id]),
  turn: z.strictObject({ number: integer.positive(), activePlayer: id, phase: z.enum(['main1','main2']) }),
  capturedStateVersion: integer, capturedSequence: integer.positive(),
  payments: z.array(Payment).min(1).max(2), balances: z.array(Balance).min(1).max(2), boardFingerprint: sha, integritySha256: sha });
export type SevenLPCostLedger = Readonly<z.infer<typeof Ledger>>;
const same = (a:unknown,b:unknown) => JSON.stringify(a)===JSON.stringify(b);
function check(value:unknown,message:string):asserts value { if(!value)throw new Error(message); }
const digest=(body:Omit<SevenLPCostLedger,'integritySha256'>)=>createHash('sha256').update(JSON.stringify(body)).digest('hex');
function seal(body:Omit<SevenLPCostLedger,'integritySha256'>):SevenLPCostLedger { return freeze({...body,integritySha256:digest(body)}); }
function balances(payments:SevenLPCostLedger['payments'],players:readonly string[]) {
  return players.flatMap(playerId=>{
    const paid=payments.filter(p=>p.playerId===playerId);if(!paid.length)return[];
    for(let i=0;i<paid.length;i++) {
      const p=paid[i]!;
      check(p.beforeLP>1000&&p.afterLP===p.beforeLP-1000,'Invalid fixed LP payment');
      check(i===0||p.beforeLP===paid[i-1]!.afterLP,'Gap in same-player LP payment history');
    }
    return[{playerId,beforeFirstLP:paid[0]!.beforeLP,afterLastLP:paid.at(-1)!.afterLP,paymentCount:paid.length,totalPaid:paid.length*1000}];
  });
}
/** Validate immutable arithmetic/chronology ONLY. Not current LP, a legal Chain graph,
 * a board transition, or authenticity. A parent must retain this server-captured ledger.
 */
export function assertSevenLPCostHistory(ledger:SevenLPCostLedger):void {
  check(Ledger.safeParse(ledger).success,'Malformed Seven LP ledger');
  const {integritySha256,...body}=ledger;
  check(integritySha256===digest(body),'Seven LP ledger changed');
  check(ledger.playerIds[0]!==ledger.playerIds[1]&&ledger.playerIds.includes(ledger.turn.activePlayer),'Invalid ledger players');
  for(const key of ['linkId','sourceId','sequence','simultaneousGroup'] as const)
    check(new Set(ledger.payments.map(p=>p[key])).size===ledger.payments.length,'Duplicate LP receipt identity');
  ledger.payments.forEach((p,i)=>{
    check(ledger.playerIds.includes(p.playerId)&&p.sequence<ledger.capturedSequence
      &&(i===0||p.sequence>ledger.payments[i-1]!.sequence),'Invalid LP receipt chronology/player');
  });
  check(same(ledger.balances,balances(ledger.payments,ledger.playerIds)),'Incorrect per-player LP totals');
}
function readPayments(registry:Registry,state:DuelState) {
  check(typeof state.id==='string'&&state.id.length>0&&typeof registry.revision==='string'&&registry.revision.length>0
    &&Number.isSafeInteger(state.stateVersion)&&state.stateVersion>=0&&Number.isSafeInteger(state.eventSequence)&&state.eventSequence>0
    &&Number.isSafeInteger(state.turn.number)&&state.turn.number>0
    &&state.cardRegistryRevision===registry.revision&&state.format.id===registry.format.id&&state.format.revision===registry.format.revision
    &&registry.format.id==='goat-2005-08-17'&&registry.format.revision===4&&!state.result&&!state.pendingDecision&&!state.pendingTriggers.length
    &&state.chainCleanup===null&&state.spellResolution===null&&state.counterResolution===null
    &&state.timing.requestedPhase===null&&['main1','main2'].includes(state.turn.phase)
    &&((state.timing.window==='chain-response'&&state.players.some(p=>p.id===state.timing.priorityPlayer)&&state.timing.consecutivePasses<2)
      ||(state.timing.window==='resolving'&&state.timing.priorityPlayer===null&&state.timing.consecutivePasses===2))
    &&state.players.length===2&&state.players[0].id!==state.players[1].id
    &&state.players.some(p=>p.id===state.turn.activePlayer)
    &&state.players.every(p=>typeof p.id==='string'&&p.id.length>0&&Number.isSafeInteger(p.lifePoints)&&p.lifePoints>0),'Invalid live Seven cost context');
  const def=registry.cards[SEVEN];check(def&&definitionFingerprint(def)===PIN,'Seven cost definition drift');
  const payments:z.infer<typeof Payment>[]=[];
  for(const link of state.chain) {
    const card=state.cards[link.source];
    if(card?.definition.id!==SEVEN) {
      check(!link.costEvents.some(e=>e.kind==='life-points-paid'),'LP receipt from an unsupported source');continue;
    }
    const loc=card.location, event=link.costEvents[0],parsed=Cost.safeParse(event);
    check(typeof link.id==='string'&&link.id.length>0&&typeof card.id==='string'&&card.id.length>0
      &&link.costEvents.length===1&&parsed.success&&card.definition.revision===def.revision&&link.spellSpeed===3
      &&!link.activationNegated&&!link.effectNegated&&!link.targetRefs.length&&typeof link.respondingToLinkId==='string'&&link.respondingToLinkId.length>0
      &&link.sourceAtActivation.id===card.id&&same(card,link.sourceAtActivation)&&card.position==='face-up'
      &&card.controllerId===link.controllerId&&loc.kind==='spell-trap'&&loc.playerId===link.controllerId
      &&state.players.find(p=>p.id===link.controllerId)?.spellsTraps[loc.slot]===card.id&&state.players.some(p=>p.id===card.ownerId)
      &&card.markers.setOnTurn!==null&&Number.isSafeInteger(card.markers.setOnTurn)&&card.markers.setOnTurn>=0
      &&card.markers.setOnTurn<state.turn.number,'Invalid live Seven source/receipt');
    check(parsed.data.details.playerId===link.controllerId,'LP cost belongs to another controller');
    const {playerId,amount,beforeLP,afterLP}=parsed.data.details;
    payments.push({linkId:link.id,sourceId:card.id,playerId,sequence:parsed.data.sequence,simultaneousGroup:parsed.data.simultaneousGroup,amount,beforeLP,afterLP});
  }
  check(payments.length>=1&&payments.length<=2,'Expected one or two Seven payments');
  return payments;
}
/** Candidate accounting component; NOT imported by the active duel/activation paths.
 * Input costs have ALREADY been paid. Captures zero LP changes, events or card moves.
 * A synthetic two-Seven input is not thereby a stable/authorized gameplay state.
 */
export function captureSevenLPCosts(registry:Registry,state:DuelState):SevenLPCostLedger {
  const payments=readPayments(registry,state),playerIds=state.players.map(p=>p.id) as [string,string];
  const totals=balances(payments,playerIds);
  for(const b of totals)check(state.players.find(p=>p.id===b.playerId)!.lifePoints===b.afterLastLP,'LP does not match the last paid receipt');
  const ledger=seal({version:1,kind:'seven-tools-lp-cost-ledger-v1',duelId:state.id,registryRevision:registry.revision,
    format:{id:'goat-2005-08-17',revision:4},definitionSha256:PIN,playerIds,
    turn:{number:state.turn.number,activePlayer:state.turn.activePlayer,phase:state.turn.phase as 'main1'|'main2'},capturedStateVersion:state.stateVersion,capturedSequence:state.eventSequence,
    payments,balances:totals,boardFingerprint:resolutionFingerprint(state)});
  assertSevenLPCostHistory(ledger);return ledger;
}
/** Live/capture binding. After root effects or source movement, use a separate trusted
 * continuation with its own current-board invariant; history alone cannot replace it.
 */
export function assertCurrentSevenLPCosts(registry:Registry,state:DuelState,ledger:SevenLPCostLedger):void {
  assertSevenLPCostHistory(ledger);
  check(state.id===ledger.duelId&&registry.revision===ledger.registryRevision&&same(state.turn,ledger.turn)
    &&Number.isSafeInteger(state.stateVersion)&&state.stateVersion>=ledger.capturedStateVersion
    &&Number.isSafeInteger(state.eventSequence)&&state.eventSequence>=ledger.capturedSequence
    &&resolutionFingerprint(state)===ledger.boardFingerprint,'Seven LP ledger board/clock changed');
  check(same(readPayments(registry,state),ledger.payments),'Current Seven receipts changed');
  for(const b of ledger.balances)check(state.players.find(p=>p.id===b.playerId)?.lifePoints===b.afterLastLP,'Current LP changed');
}
