import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { DuelState, ChainLink } from '../../protocol/src/duel.js';
import type { Registry } from './registry.js';
import { freeze } from './registry.js';
import { FieldActivationLinkSchema } from './counter-continuation.js';
import { BOUNDED_SEVEN_EFFECT_ID, validateStagedBoundedCounterGraph } from './bounded-counter-graph.js';
import { preflightBoundedCounterReview } from './bounded-counter-review.js';
import { prepareCounterLifoSchedule } from './counter-lifo-schedule.js';
import { definitionFingerprint } from './spell-review.js';
import { resolutionFingerprint } from './resolution-fingerprint.js';
import { sevenLPCostBalances, SevenLPCostEventSchema } from './seven-lp-cost-ledger.js';
import { planResolution } from './effect-plans.js';
import { spellResolutionBoard } from './spell-resolution.js';
import { chainCleanupDecision } from './chain-cleanup.js';

const id = z.string().min(1), integer = z.number().int().nonnegative().safe(), sha = z.string().regex(/^[a-f0-9]{64}$/);
const Schema = z.strictObject({ version: z.literal(1), kind: z.literal('bounded-counter-resolution-frame-v1'),
  stage: z.enum(['before-root', 'root-choice', 'cleanup']), duelId: id, registryRevision: id, reviewSha256: sha,
  playerIds: z.tuple([id, id]), turn: z.strictObject({ number: integer.positive(), activePlayer: id, phase: z.enum(['main1','main2']) }),
  originVersion: integer, originSequence: integer.positive(), checkpointVersion: integer, checkpointSequence: integer.positive(),
  occurrence: z.unknown(), links: z.array(FieldActivationLinkSchema).min(1).max(8),
  survivingSourceIds: z.array(id).min(1).max(8), cleanupOrders: z.array(z.strictObject({ownerId:id,order:z.array(id).min(1).max(8).nullable()})).min(1).max(2).nullable(), binding: sha, integritySha256: sha });
export type BoundedCounterFrame = Omit<z.infer<typeof Schema>,'links'> & { readonly links: readonly ChainLink[] };
const same = (a: unknown,b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function check(v: unknown, message: string): asserts v { if (!v) throw new Error(message); }
const binding = (s: DuelState) => hash({ board: resolutionFingerprint(s), timing: s.timing,
  decision: s.pendingDecision, cleanup: s.chainCleanup, version: s.stateVersion, sequence: s.eventSequence });
function seal(body: Omit<BoundedCounterFrame,'integritySha256'>): BoundedCounterFrame {
  return freeze({ ...body, integritySha256: hash(body) });
}
const survivors = (links: readonly ChainLink[]) => {
  const gone = new Set(prepareCounterLifoSchedule(links).filter(s => s.kind === 'negate').map(s => s.linkIndex));
  return links.filter((_,i) => !gone.has(i)).map(l => l.source);
};

/** Staged server frame contract. No activation, resolver effects, state writes,
 * replay log or whole-DuelState journal. Not installed in the live v5 protocol.
 * Parent owns the trusted transition and must use the reviewed effect/cleanup APIs.
 */
export function startBoundedCounterFrame(registry: Registry, state: DuelState, review: unknown): BoundedCounterFrame {
  const proposal = preflightBoundedCounterReview(registry, review);
  const graph = validateStagedBoundedCounterGraph(registry, state);
  check(graph.family!=='spell-magic'||graph.prefixLength===2,'Bounded frame Spell family requires Magic Jammer');
  check(state.timing.window === 'resolving' && state.timing.priorityPlayer === null && state.timing.consecutivePasses === 2,
    'Bounded frame requires suspended responses after two Passes');
  const [root, magic] = state.chain;
  check(root?.effectId !== 'normal-spell' || root.targetRefs[0]?.instanceId !== magic?.costEvents[0]?.affectedInstances[0]
    || !root.targetRefs.length, 'Target was discarded by a later activation');
  const body = { version: 1 as const, kind: 'bounded-counter-resolution-frame-v1' as const, stage: 'before-root' as const,
    duelId: state.id, registryRevision: registry.revision, reviewSha256: proposal.reviewSha256,
    playerIds: [state.players[0].id,state.players[1].id] as [string,string],
    turn: { number: state.turn.number, activePlayer: state.turn.activePlayer, phase: state.turn.phase as 'main1'|'main2' },
    originVersion: state.stateVersion, originSequence: state.eventSequence, checkpointVersion: state.stateVersion,
    checkpointSequence: state.eventSequence, occurrence: structuredClone(graph.family === 'trap-prefix' ? state.timing.lastRelevantEvents[0] : null),
    links: structuredClone(state.chain) as ChainLink[], survivingSourceIds: survivors(state.chain), cleanupOrders:null, binding: binding(state) };
  const result = seal(body); assertCurrentBoundedCounterFrame(registry,state,result,review); return result;
}

/** History/shape only. Hash detects accidental changes, never authenticates a caller. */
export function assertBoundedCounterFrameHistory(registry: Registry, frame: BoundedCounterFrame, review: unknown): void {
  check(Schema.safeParse(frame).success, 'Malformed bounded frame');
  const { integritySha256,...body } = frame;
  check(integritySha256 === hash(body), 'Bounded frame changed');
  const proposal = preflightBoundedCounterReview(registry,review);
  check(frame.registryRevision === registry.revision && frame.reviewSha256 === proposal.reviewSha256
    && frame.playerIds[0] !== frame.playerIds[1] && frame.playerIds.includes(frame.turn.activePlayer)
    && frame.checkpointVersion >= frame.originVersion && frame.checkpointSequence >= frame.originSequence,
  'Bounded frame registry/review/player/clock conflict');
  check((frame.stage==='cleanup')===(frame.cleanupOrders!==null)
    &&(frame.stage==='before-root'?frame.checkpointVersion===frame.originVersion&&frame.checkpointSequence===frame.originSequence
      :frame.checkpointVersion>frame.originVersion&&frame.checkpointSequence>frame.originSequence),'Bounded frame stage clock/order conflict');
  check(same(frame.survivingSourceIds,survivors(frame.links)), 'Bounded frame survivor set changed');
  const trap=frame.links[0]!.sourceAtActivation.definition.id==='official:04206964';
  const prefix=trap?frame.links.findIndex(l=>l.sourceAtActivation.definition.id!=='official:04206964'):2;
  const count=trap?(prefix<0?frame.links.length:prefix):prefix;
  check(trap?count>=1&&count<=3:frame.links.length>=2&&frame.links[0]!.effectId==='normal-spell','Invalid bounded historical root');
  check(frame.links.length-count<=6,'Invalid bounded historical suffix');
  for(const [i,l] of frame.links.entries()) {
    const c=l.sourceAtActivation,d=registry.cards[c.definition.id],counter=i>=count;
    check(d&&c.id===l.source&&c.ownerId===l.controllerId&&c.controllerId===l.controllerId&&frame.playerIds.includes(l.controllerId)
      &&c.location.kind==='spell-trap'&&c.location.playerId===l.controllerId&&c.position==='face-up'
      &&d.revision===c.definition.revision&&definitionFingerprint(d)===proposal.dependencyPins[d.id], 'Bounded historical source/pin conflict');
    if(d.kind==='trap')check(c.markers.setOnTurn!==null&&c.markers.setOnTurn<frame.turn.number,'Bounded historical Trap Set this turn');
    if(counter)check(l.spellSpeed===3&&d.id==='official:03819470'&&l.effectId===BOUNDED_SEVEN_EFFECT_ID&&l.costEvents.length===1&&l.costEvents[0]?.kind==='life-points-paid'&&!l.targetRefs.length,'Invalid bounded historical Seven');
    else if(trap)check(l.spellSpeed===2&&d.id==='official:04206964'&&l.effectId==='destroy-opponent-normal-or-flip-summoned-1000'&&l.controllerId!==frame.turn.activePlayer
      &&!l.costEvents.length&&l.targetRefs.length===1&&same(l.targetRefs,frame.links[0]!.targetRefs),'Invalid bounded historical Trap prefix');
    else if(i===0)check(l.spellSpeed===1&&d.kind==='spell'&&l.controllerId===frame.turn.activePlayer,'Invalid bounded historical Spell');
    else check(l.spellSpeed===3&&l.costEvents[0]?.kind==='cards-discarded'&&d.id==='official:77414722'&&l.effectId==='discard-negate-normal-spell-activation'&&l.costEvents.length===1&&!l.targetRefs.length,'Invalid bounded historical Magic');
  }

  check(new Set(frame.links.map(l=>JSON.stringify(l.sourceAtActivation.location))).size===frame.links.length,'Duplicate bounded historical source slot');
  if(!trap) {
    const root=frame.links[0]!,handler=registry.spellHandlers[root.sourceAtActivation.definition.id]?.handler;
    const paid=['discard-destroy-target-monster','discard-return-own-graveyard-monster'].includes(handler??'');
    check(root.costEvents.length===(paid?1:0)&&(!paid||root.costEvents[0]?.kind==='cards-discarded')
      &&root.targetRefs.length===(paid||handler==='target-opposing-attack-to-defense'?1:0),'Bounded historical root cost/target conflict');
    check(!root.targetRefs.length||root.targetRefs[0]!.instanceId!==frame.links[1]?.costEvents[0]?.affectedInstances[0],'Bounded historical target chronology conflict');
  }
  const costs=frame.links.flatMap(l=>l.costEvents);
  check(new Set(costs.map(e=>e.sequence)).size===costs.length&&new Set(costs.map(e=>e.simultaneousGroup)).size===costs.length
    &&costs.every((e,i)=>e.sequence<frame.originSequence&&(i===0||e.sequence>costs[i-1]!.sequence)), 'Bounded historical cost chronology conflict');
  const discards=costs.filter(e=>e.kind==='cards-discarded').flatMap(e=>e.affectedInstances);
  check(new Set(discards).size===discards.length&&!discards.some(id=>frame.links.some(l=>l.source===id)),'Bounded historical discard identity conflict');
  for(const l of frame.links)for(const e of l.costEvents)if(e.kind!=='life-points-paid')
    check(e.kind==='cards-discarded'&&e.affectedInstances.length===1&&e.details?.playerId===l.controllerId&&e.details?.reason==='activation-cost','Invalid bounded historical discard');
  check(frame.playerIds.every(who=>frame.links.filter(l=>l.sourceAtActivation.definition.id==='official:03819470'&&l.controllerId===who).length<=3
    &&frame.links.filter(l=>l.controllerId===who).length<=5),'Bounded historical copy/zone conflict');
  if(trap) {
    const e=frame.occurrence as DuelState['timing']['lastRelevantEvents'][number];
    check(e&&e.kind==='monster-summoned'&&Number.isSafeInteger(e.sequence)&&e.sequence>0&&e.sequence<frame.originSequence
      &&same(e.affectedInstances,[frame.links[0]!.targetRefs[0]!.instanceId])&&e.details?.playerId===frame.turn.activePlayer
      &&['normal','tribute','flip'].includes(String(e.details?.method)),'Invalid bounded historical occurrence');
  } else check(frame.occurrence===null,'Unexpected bounded historical occurrence');
  const payments = frame.links.flatMap(l => l.costEvents.filter(e => e.kind === 'life-points-paid').map(e => {
    check(SevenLPCostEventSchema.safeParse(e).success && e.details?.playerId === l.controllerId
      && frame.playerIds.includes(l.controllerId) && e.sequence < frame.originSequence, 'Invalid bounded historical cost');
    return { linkId:l.id,sourceId:l.source,playerId:l.controllerId,sequence:e.sequence,simultaneousGroup:e.simultaneousGroup,
      amount:1000 as const,beforeLP:Number(e.details.beforeLP),afterLP:Number(e.details.afterLP) };
  }));
  sevenLPCostBalances(payments, frame.playerIds);
  check(new Set(payments.map(p=>p.sequence)).size === payments.length && new Set(payments.map(p=>p.simultaneousGroup)).size === payments.length
    && payments.every((p,i)=>i===0||p.sequence>payments[i-1]!.sequence), 'Bounded frame receipt chronology changed');
}

function assertCheckpoint(registry: Registry,state: DuelState,frame: BoundedCounterFrame) {
  check(state.id === frame.duelId && state.cardRegistryRevision === frame.registryRevision && same(state.format,registry.format)
    && same(state.turn,frame.turn) && same(state.players.map(p=>p.id),frame.playerIds) && !state.result
    && state.players.every(p=>Number.isSafeInteger(p.lifePoints)&&p.lifePoints>0)
    && !state.pendingTriggers.length && !state.modifiers.length && state.battle === null
    && state.spellResolution === null && state.counterResolution === null && state.trapCounterResolution === null
    && state.fourLinkCounterResolution === null && state.trapThreeSevenResolution === null
    && state.timing.window === 'resolving' && state.timing.priorityPlayer === null && state.timing.consecutivePasses === 2
    && state.timing.requestedPhase === null && state.stateVersion === frame.checkpointVersion && state.eventSequence === frame.checkpointSequence,
  'Bounded frame checkpoint context changed');
  if (frame.stage === 'before-root' && frame.occurrence !== null) check(same(state.timing.lastRelevantEvents,[frame.occurrence]),'Bounded frame summon occurrence changed');
  const gone = new Set(frame.stage === 'before-root' ? [] : prepareCounterLifoSchedule(frame.links).filter(s=>s.kind==='negate').map(s=>s.linkIndex));
  const expected = frame.links.map((l,i)=>({...l,activationNegated:gone.has(i)}));
  check(same(state.chain,expected),'Bounded frame spent graph changed');
  for(const [i,l] of frame.links.entries()) {
    const c=state.cards[l.source], snapshot=l.sourceAtActivation;
    const wanted = gone.has(i) ? {...snapshot,location:{kind:'graveyard',playerId:snapshot.ownerId},controllerId:snapshot.ownerId,position:'face-up'} : snapshot;
    check(c && same(c,wanted) && state.players.reduce((n,p)=>n+[...p.deck,...p.hand,...p.graveyard,...p.monsters,...p.spellsTraps,...p.banished,...p.fusionDeck,p.field].filter(id=>id===c.id).length,0)===1,
      'Bounded frame source lifecycle changed');
    check(gone.has(i) ? state.players.find(p=>p.id===c.ownerId)?.graveyard.includes(c.id)
      : c.location.kind==='spell-trap'&&state.players.find(p=>p.id===c.controllerId)?.spellsTraps[c.location.slot]===c.id,'Bounded frame source index changed');
  }
  if(frame.stage==='before-root') check(frame.cleanupOrders===null&&!state.pendingDecision&&!state.chainCleanup,'Bounded frame before-root cannot pause');
  else if(frame.stage==='root-choice') {
    const root=state.chain[0]!;
    const plan=planResolution(registry.spellHandlers[root.sourceAtActivation.definition.id],spellResolutionBoard(registry,state,root.controllerId));
    const d=state.pendingDecision;
    check(frame.cleanupOrders===null&&root.effectId==='normal-spell'&&!root.activationNegated&&plan.kind==='choose-destruction'&&!state.chainCleanup
      &&d?.kind==='effect-choice'&&d.id===`${root.id}:bounded-choice`&&d.playerId===plan.playerId&&d.min===1&&d.max===1&&same(d.optionIds,plan.optionIds),'Bounded frame root choice changed');
  } else {
    check(state.chainCleanup?.mode==='live'&&same(state.chainCleanup.sourceIds,frame.survivingSourceIds)
      &&same(frame.cleanupOrders,state.chainCleanup.batches.map(b=>({ownerId:b.ownerId,order:b.order}))),'Bounded frame cleanup sources changed');
    const d=chainCleanupDecision(registry,{...state,pendingDecision:null},state.chainCleanup!);
    check(d ? state.pendingDecision?.kind==='cleanup-order'&&state.pendingDecision.id===`${frame.links[0]!.id}:bounded-cleanup:${d.playerId}`
      &&state.pendingDecision.playerId===d.playerId&&state.pendingDecision.min===d.min&&state.pendingDecision.max===d.max&&same(state.pendingDecision.optionIds,d.optionIds)
      : state.pendingDecision===null,'Bounded frame cleanup decision changed');
  }
}

export function assertCurrentBoundedCounterFrame(registry: Registry,state: DuelState,frame: BoundedCounterFrame,review: unknown): void {
  assertBoundedCounterFrameHistory(registry,frame,review);
  check(binding(state)===frame.binding,'Bounded frame board/decision/clock binding changed');
  assertCheckpoint(registry,state,frame);
}

/** Trusted parent only: checkpoint AFTER applying a reviewed transition and advancing
 * its committed clocks. This does not prove an arbitrary proposed board is a legal
 * root effect. Same-stage cleanup permits one validated owner-order answer.
 */
export function checkpointBoundedCounterFrame(registry: Registry,state: DuelState,frame: BoundedCounterFrame,
  stage:'root-choice'|'cleanup',review: unknown): BoundedCounterFrame {
  assertBoundedCounterFrameHistory(registry,frame,review);
  check((frame.stage==='before-root'||frame.stage==='root-choice'&&stage==='cleanup'||frame.stage==='cleanup'&&stage==='cleanup')
    && state.stateVersion>frame.checkpointVersion&&state.eventSequence>frame.checkpointSequence,'Bounded frame stage/clock cannot reopen');
  const cleanupOrders=stage==='cleanup'?state.chainCleanup?.batches.map(b=>({ownerId:b.ownerId,order:b.order===null?null:[...b.order]}))??null:null;
  if(frame.stage==='cleanup') {
    check(frame.cleanupOrders&&cleanupOrders&&frame.cleanupOrders.length===cleanupOrders.length,'Missing previous bounded cleanup order');
    const changed=cleanupOrders.map((b,i)=>same(b,frame.cleanupOrders![i])?-1:i).filter(i=>i>=0),first=frame.cleanupOrders.findIndex(b=>b.order===null);
    check(changed.length===1&&changed[0]===first&&cleanupOrders[first]!.order!==null&&cleanupOrders[first]!.ownerId===frame.cleanupOrders[first]!.ownerId,'Bounded cleanup must answer one next owner');
  }
  const {integritySha256:_old,...body}=structuredClone(frame);
  const result=seal({...body,stage,cleanupOrders,checkpointVersion:state.stateVersion,checkpointSequence:state.eventSequence,binding:binding(state)});
  assertCurrentBoundedCounterFrame(registry,state,result,review);return result;
}

/** Parent calls after its validated cleanup commit or end/concede transition.
 * Returns null to drop the frame. Never moves a card, refunds LP, selects an order,
 * or proves that arbitrary proposed effects were legal. Cleanup may finish in
 * the same committed version as its checkpoint, with a later event sequence;
 * concession remains a separate command/version. No post-game owner choice.
 */
export function releaseBoundedCounterFrame(registry:Registry,state:DuelState,frame:BoundedCounterFrame,review:unknown):null {
  assertBoundedCounterFrameHistory(registry,frame,review);
  check(state.id===frame.duelId&&state.cardRegistryRevision===frame.registryRevision&&same(state.format,registry.format)
    &&same(state.turn,frame.turn)&&same(state.players.map(p=>p.id),frame.playerIds)
    &&Number.isSafeInteger(state.stateVersion)&&Number.isSafeInteger(state.eventSequence)
    &&state.players.every(p=>Number.isSafeInteger(p.lifePoints)&&p.lifePoints>=(state.result?0:1))
    &&state.stateVersion>=frame.checkpointVersion&&state.stateVersion>frame.originVersion&&state.eventSequence>frame.checkpointSequence
    &&(state.result?.reason!=='concession'||state.stateVersion>frame.checkpointVersion)
    &&state.chain.length===0&&state.pendingDecision===null&&state.chainCleanup===null
    &&state.spellResolution===null&&state.counterResolution===null&&state.trapCounterResolution===null
    &&state.fourLinkCounterResolution===null&&state.trapThreeSevenResolution===null&&!state.pendingTriggers.length,
  'Bounded frame release context changed');
  check(state.result ? frame.playerIds.includes(state.result.winner??'')&&['concession','failed-draw','life-points'].includes(state.result.reason)
    : frame.stage==='cleanup','Bounded frame cannot finish before cleanup');
  const gone=new Set(prepareCounterLifoSchedule(frame.links).filter(s=>s.kind==='negate').map(s=>s.linkIndex));
  if(state.result&&state.result.reason!=='concession') {
    const root=frame.links[0]!,handler=registry.spellHandlers[root.sourceAtActivation.definition.id],other=frame.playerIds.find(p=>p!==root.controllerId)!;
    check(frame.stage==='before-root'&&root.effectId==='normal-spell'&&!gone.has(0)
      &&(state.result.reason==='failed-draw'?handler?.handler==='draw'&&state.result.winner===other&&state.players.find(p=>p.id===root.controllerId)?.deck.length===0
        :handler?.handler==='inflict-damage'&&state.result.winner===root.controllerId&&state.players.find(p=>p.id===other)?.lifePoints===0),
    'Bounded frame terminal must come from the surviving reviewed root');
  }
  for(const [i,l] of frame.links.entries()) {
    const snapshot=l.sourceAtActivation,c=state.cards[l.source];
    // A non-concession terminal can only occur in the root after the atomic
    // sweep. Concession is observable only at entry or an already paused stage.
    const swept = frame.stage!=='before-root'||state.result?.reason!=='concession';
    const grave = !state.result||gone.has(i)&&swept;
    const wanted=grave?{...snapshot,location:{kind:'graveyard',playerId:snapshot.ownerId},controllerId:snapshot.ownerId,position:'face-up'}:snapshot;
    check(c&&same(c,wanted),'Bounded frame release source lifecycle changed');
    check(grave?state.players.find(p=>p.id===c.ownerId)?.graveyard.filter(id=>id===c.id).length===1
      :c.location.kind==='spell-trap'&&state.players.find(p=>p.id===c.controllerId)?.spellsTraps[c.location.slot]===c.id,'Bounded frame release source index changed');
  }
  return null;
}
