import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ChainLink, DuelState, CounterResolutionFrame } from '../../protocol/src/duel.js';
import { definitionFingerprint } from './spell-review.js';
import { resolutionFingerprint } from './resolution-fingerprint.js';
import { spellResolutionBoard } from './spell-resolution.js';
import { planResolution } from './effect-plans.js';
import { chainCleanupDecision } from './chain-cleanup.js';
import { freeze } from './registry.js';
import type { Registry } from './registry.js';

// Candidate design pins from counter-to-counter-scope-review.json. NOT an active review
// or activation permission. applyAction only resumes a trusted candidate parent frame;
// no activation route or availableActions creates the three-link input.
export const COUNTER_CONTINUATION_PINS: Readonly<Record<string, string>> = freeze({
  'official:19523799': '834b4eee8335d5e15da679820bd89d728327b5b7f2dee1dd9be895a7e0180bac',
  'official:25880422': '93aa075ddd05f9f30b3e03f045c8720aa065ff3684a2b7d0590987d02912a3d5',
  'official:26412047': 'e99e146fddebbfb918c468a94b3bb6608ac00c0cc75770602018ce331de14c5e',
  'official:46130346': '7db0e22ab9c746643d0e9191e45f84f8f76b6b2cdd9999016194be4e4b06b459',
  'official:55144522': 'e267b070ff9477b340042761d189b221e471910a10cf9571ce4a770db22e7909',
  'official:66788016': '73cf26b24c8c287ab9c2c87c881e8b52f9cf4d821c405b55cbefe8941b8e77f0',
  'official:74848038': '655ceb62f07b6e19eb30a85ac5c6aac097af16e68bd7fb25175118d2da496f15',
  'official:79759861': '788c8981799ec84ae6e5837e6933cfb3b650df4f7031ee666aa70908bc283604',
  'official:82828051': '6dafa3956a9454679c400e0b7e086ccc74599bc6f16ddb964de86a6af5f58c01',
  'official:84257639': 'e9fafe2761bde56cd0a75bd820de9bbcbe173a944e92254cf6380e8fbf97fdbb',
  'official:97169186': '7743be5806f0fc8b856f8061701ffffe77e47831f1752da6ca604fe8201c450c',
  'official:03819470': '2dbc5c07956ac97d58b2f449898bf2d73bd0488578b9c69c0fadd5e468accbc0',
  'official:77414722': 'dcbfa15ffcecc32dd594e2794ab516642bc5ede743942717406b95f955e946bf',
});
const MAGIC = 'official:77414722', SEVEN = 'official:03819470';
/** Proposed receipt identity; deliberately not the live Trap Hole-only handler. */
export const CANDIDATE_SEVEN_EFFECT_ID = 'pay-1000-negate-magic-jammer-activation-v1';
const id = z.string().min(1), integer = z.number().int().nonnegative().safe();
const ref = z.strictObject({ id, revision: integer });
const fieldLocation = z.strictObject({ kind: z.literal('spell-trap'), playerId: id, slot: integer.max(4) });
const source = z.strictObject({ id, definition: ref, ownerId: id, controllerId: id, location: fieldLocation,
  position: z.literal('face-up'), counters: z.record(id, integer), markers: z.strictObject({
    summonedOnTurn: integer.nullable(), summonedBy: id.nullable(), setOnTurn: integer.nullable(),
    manuallyChangedOnTurn: integer.nullable(), attackDeclarationsThisTurn: integer, attackCountConsumedThisTurn: integer, wasBattleDestroyed: z.boolean(),
  }) });
const event = z.strictObject({ sequence: integer.positive(), simultaneousGroup: id, kind: id, affectedInstances: z.array(id),
  details: z.record(id, z.union([z.string(), z.number().finite(), z.boolean()])).optional() });
const link = z.strictObject({ id, controllerId: id, source: id, sourceAtActivation: source, effectId: id, spellSpeed: z.union([z.literal(1),z.literal(2),z.literal(3)]),
  costEvents: z.array(event).max(1), targetRefs: z.array(z.strictObject({ instanceId: id, locationAtSelection: z.discriminatedUnion('kind',[
    z.strictObject({kind:z.literal('monster'),playerId:id,slot:integer.max(4)}),z.strictObject({kind:z.literal('graveyard'),playerId:id}),
  ]) })).max(1), respondingToLinkId: id.optional(), activationNegated: z.boolean(), effectNegated: z.boolean() });
const JournalSchema = z.strictObject({ version: z.literal(1), kind: z.literal('normal-spell-magic-jammer-seven-tools-v1'),
  stage: z.enum(['before-root','root-choice','cleanup']), duelId:id, registryRevision:id,
  turn: z.strictObject({number:integer.positive(),activePlayer:id,phase:z.enum(['main1','main2'])}), capturedSequence:integer.positive(), capturedStateVersion:integer,
  root:link, magic:link, seven:link, cleanupSourceIds:z.tuple([id,id]),
  magicResult:z.literal('activation-negated-destroyed-skipped'), sevenResult:z.literal('resolved-awaiting-cleanup'),
  entryFingerprint:id, boardFingerprint:id, integritySha256:z.string().regex(/^[a-f0-9]{64}$/),
});
export type CounterContinuationJournal = CounterResolutionFrame;
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const same = (a: unknown,b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const check = (value: unknown, message: string): void => { if(!value) throw new Error(message); };
function seal(body: Omit<CounterContinuationJournal,'integritySha256'>): CounterContinuationJournal {
  return freeze({...body,integritySha256:createHash('sha256').update(JSON.stringify(body)).digest('hex')});
}
function pinned(registry:Registry, l:ChainLink) {
  const card=registry.cards[l.sourceAtActivation.definition.id], pin=card&&COUNTER_CONTINUATION_PINS[card.id];
  check(card&&pin&&card.origin==='official'&&card.revision===l.sourceAtActivation.definition.revision&&definitionFingerprint(card)===pin,'Unreviewed continuation definition');
  check(l.source===l.sourceAtActivation.id&&l.controllerId===l.sourceAtActivation.controllerId&&l.sourceAtActivation.location.playerId===l.controllerId,'Invalid continuation source identity');
  return card!;
}
function graph(registry:Registry, root:ChainLink, magic:ChainLink, seven:ChainLink, turn:CounterContinuationJournal['turn'], sequence:number, spent:boolean) {
  for(const l of [root,magic,seven]) { check(link.safeParse(l).success,'Malformed continuation link'); pinned(registry,l); }
  const rootDef=pinned(registry,root);
  check(rootDef.kind==='spell'&&rootDef.subtype==='normal'&&registry.spellHandlers[rootDef.id]&&root.effectId==='normal-spell'&&root.spellSpeed===1
    &&root.controllerId===turn.activePlayer&&!root.activationNegated&&!root.effectNegated&&root.respondingToLinkId===undefined,'Invalid continuation root');
  check(new Set([root.id,magic.id,seven.id]).size===3&&new Set([root.source,magic.source,seven.source]).size===3,'Duplicate continuation identity');
  check(magic.sourceAtActivation.definition.id===MAGIC&&magic.effectId==='discard-negate-normal-spell-activation'&&magic.spellSpeed===3
    &&magic.respondingToLinkId===root.id&&magic.activationNegated===spent&&!magic.effectNegated&&!magic.targetRefs.length,'Invalid Magic Jammer continuation');
  check(seven.sourceAtActivation.definition.id===SEVEN&&seven.effectId===CANDIDATE_SEVEN_EFFECT_ID&&seven.spellSpeed===3
    &&seven.respondingToLinkId===magic.id&&!seven.activationNegated&&!seven.effectNegated&&!seven.targetRefs.length,'Invalid Seven Tools continuation');
  for(const l of [magic,seven]) check(l.sourceAtActivation.markers.setOnTurn!==null&&l.sourceAtActivation.markers.setOnTurn<turn.number,'Counter was Set this turn');
  const rootCost = root.costEvents[0], mc=magic.costEvents[0], lp=seven.costEvents[0];
  const handler=registry.spellHandlers[rootDef.id]!.handler, hasRootCost=['discard-destroy-target-monster','discard-return-own-graveyard-monster'].includes(handler);
  const discard=(cost:ChainLink['costEvents'][number]|undefined,who:string)=>!!cost&&cost.kind==='cards-discarded'&&cost.affectedInstances.length===1
    &&cost.details?.playerId===who&&cost.details?.reason==='activation-cost';
  check(hasRootCost ? root.costEvents.length===1&&discard(rootCost,root.controllerId) : !root.costEvents.length,'Invalid original Spell cost receipt');
  check(magic.costEvents.length===1&&discard(mc,magic.controllerId),'Invalid Magic Jammer discard receipt');
  check(seven.costEvents.length===1&&lp?.kind==='life-points-paid'&&!lp.affectedInstances.length&&lp.details?.playerId===seven.controllerId
    &&lp.details?.reason==='activation-cost'&&lp.details?.amount===1000&&typeof lp.details.beforeLP==='number'&&Number.isSafeInteger(lp.details.beforeLP)&&lp.details.beforeLP>1000
    &&typeof lp.details.afterLP==='number'&&lp.details.afterLP===lp.details.beforeLP-1000,'Invalid historical LP receipt');
  check((!rootCost||rootCost.sequence<mc!.sequence)&&mc!.sequence<lp!.sequence&&lp!.sequence<sequence,'Invalid continuation cost chronology');
  check(!rootCost||rootCost.affectedInstances[0]!==mc!.affectedInstances[0],'Same card paid twice');
}
function assertJournal(registry:Registry,journal:CounterContinuationJournal) {
  check(JournalSchema.safeParse(journal).success,'Malformed counter continuation journal');
  const {integritySha256,...body}=journal;
  check(integritySha256===seal(body).integritySha256,'Counter continuation journal changed');
  check(journal.registryRevision===registry.revision&&registry.format.id==='goat-2005-08-17'&&registry.format.revision===4,'Continuation registry mismatch');
  graph(registry,journal.root as ChainLink,journal.magic as ChainLink,journal.seven as ChainLink,journal.turn,journal.capturedSequence,true);
  check(same(journal.cleanupSourceIds,[journal.root.source,journal.seven.source]),'Invalid continuation cleanup sources');
}

/** Candidate resolver component only. Trusted input has three activation receipts with
 * costs ALREADY paid. Returns an atomic board patch and spent-link journal, not a stable
 * DuelState, activation API, or a new gameplay capability. No LP/discard payment occurs.
 */
export function prepareCounterContinuation(registry:Registry,state:DuelState) {
  check(state.cardRegistryRevision===registry.revision&&state.format.id===registry.format.id&&state.format.revision===registry.format.revision
    &&registry.format.id==='goat-2005-08-17'&&registry.format.revision===4&&!state.result&&!state.pendingDecision&&!state.pendingTriggers.length
    &&state.chainCleanup===null&&state.spellResolution===null&&state.counterResolution===null&&state.chain.length===3&&state.timing.window==='resolving'
    &&state.timing.priorityPlayer===null&&state.timing.consecutivePasses===2&&state.timing.requestedPhase===null
    &&state.players.length===2&&state.players[0].id!==state.players[1].id&&state.players.some(p=>p.id===state.turn.activePlayer)
    &&state.players.every(p=>Number.isSafeInteger(p.lifePoints)&&p.lifePoints>0)&&['main1','main2'].includes(state.turn.phase),'Invalid candidate Counter resolution input');
  const [root,magic,seven]=state.chain as readonly [ChainLink,ChainLink,ChainLink];
  const turn={...state.turn,phase:state.turn.phase as 'main1'|'main2'};
  graph(registry,root,magic,seven,turn,state.eventSequence,false);
  for(const l of [root,magic,seven]) {
    const card=state.cards[l.source],location=card?.location;
    check(card&&same(card,l.sourceAtActivation)&&location?.kind==='spell-trap'
      &&state.players.find(p=>p.id===l.controllerId)?.spellsTraps[location.slot]===card.id
      &&state.players.some(p=>p.id===card.ownerId),'Continuation source not on its activation field');
  }
  for(const l of [root,magic])for(const cost of l.costEvents){const paid=state.cards[cost.affectedInstances[0]!];
    check(paid&&paid.ownerId===l.controllerId&&paid.location.kind==='graveyard'&&paid.location.playerId===l.controllerId
      &&state.players.find(p=>p.id===l.controllerId)?.graveyard.includes(paid.id),'Discard was not already paid');}
  check(state.players.find(p=>p.id===seven.controllerId)?.lifePoints===seven.costEvents[0]!.details?.afterLP,'LP receipt does not match pre-resolution LP');
  const players=structuredClone(state.players) as Mutable<DuelState['players']>,cards=structuredClone(state.cards);
  const destroyed=cards[magic.source]!,location=destroyed.location;
  if(location.kind!=='spell-trap')throw new Error('Validated Counter moved');
  const owner=players.find(p=>p.id===destroyed.ownerId),controller=players.find(p=>p.id===destroyed.controllerId);
  check(owner&&controller&&!owner.graveyard.includes(destroyed.id),'Invalid destroyed Counter destination');
  controller!.spellsTraps[location.slot]=null;owner!.graveyard.push(destroyed.id);
  destroyed.location={kind:'graveyard',playerId:owner!.id};destroyed.controllerId=owner!.id;destroyed.position='face-up';
  const activeRoot=structuredClone(root),spentMagic={...structuredClone(magic),activationNegated:true};
  const patch={players,cards};
  const journal=seal({version:1,kind:'normal-spell-magic-jammer-seven-tools-v1',stage:'before-root',duelId:state.id,registryRevision:registry.revision,
    turn,capturedSequence:state.eventSequence,capturedStateVersion:state.stateVersion,root:activeRoot,magic:spentMagic,seven:structuredClone(seven),
    cleanupSourceIds:[root.source,seven.source],magicResult:'activation-negated-destroyed-skipped',sevenResult:'resolved-awaiting-cleanup',
    entryFingerprint:resolutionFingerprint(state),boardFingerprint:resolutionFingerprint({...state,...patch,chain:[activeRoot]})});
  assertJournal(registry,journal);
  return freeze({board:patch,activeRoot,journal});
}

/** Validate historical costs without requiring old afterLP or old discard locations to
 * equal the current board after the root effect. The bound checkpoint still must match.
 */
export function assertCounterContinuation(registry:Registry,state:DuelState,journal:CounterContinuationJournal) {
  assertJournal(registry,journal);
  check(state.id===journal.duelId&&state.cardRegistryRevision===journal.registryRevision&&same(state.turn,journal.turn)&&!state.result
    &&Number.isSafeInteger(state.eventSequence)&&state.eventSequence>=journal.capturedSequence
    &&Number.isSafeInteger(state.stateVersion)&&state.stateVersion>=journal.capturedStateVersion
    &&state.timing.window==='resolving'&&state.timing.priorityPlayer===null&&state.timing.consecutivePasses===2&&state.timing.requestedPhase===null
    &&!state.pendingTriggers.length&&state.players.every(p=>Number.isSafeInteger(p.lifePoints)&&p.lifePoints>0)
    &&state.chain.length===1&&same(state.chain[0],journal.root)&&resolutionFingerprint(state)===journal.boardFingerprint,'Counter continuation board changed');
  const magic=state.cards[journal.magic.source],seven=state.cards[journal.seven.source],root=state.cards[journal.root.source];
  const ownerId=journal.magic.sourceAtActivation.ownerId;
  const expectedMagic={...journal.magic.sourceAtActivation,location:{kind:'graveyard',playerId:ownerId},controllerId:ownerId,position:'face-up'};
  check(magic?.location.kind==='graveyard'&&magic.location.playerId===journal.magic.sourceAtActivation.ownerId
    &&state.players.find(p=>p.id===magic.ownerId)?.graveyard.includes(magic.id)&&same(magic,expectedMagic)&&same(seven,journal.seven.sourceAtActivation)
    &&same(root,journal.root.sourceAtActivation),'Counter continuation source lifecycle changed');
}

/** Stable server states have either the root's exact choice, or the final owner order.
 * before-root is internal work within one transition and must never reach an adapter.
 */
export function assertCounterResolutionFrame(registry: Registry, state: DuelState) {
  const frame = state.counterResolution;
  check(frame && state.spellResolution === null, 'Missing or overlapping Counter resolution frame');
  assertCounterContinuation(registry, state, frame!);
  check(state.stateVersion > frame!.capturedStateVersion && state.eventSequence > frame!.capturedSequence, 'Counter continuation clock did not advance');
  const decision = state.pendingDecision;
  if (frame!.stage === 'root-choice') {
    const plan = planResolution(registry.spellHandlers[frame!.root.sourceAtActivation.definition.id], spellResolutionBoard(registry, state, frame!.root.controllerId));
    check(state.chainCleanup === null && plan.kind === 'choose-destruction' && decision?.kind === 'effect-choice'
      && decision.id === `${frame!.root.id}:choice` && decision.playerId === plan.playerId
      && decision.min === 1 && decision.max === 1 && same(decision.optionIds, plan.optionIds), 'Invalid Counter root choice');
  } else {
    check(frame!.stage === 'cleanup' && state.chainCleanup?.mode === 'live'
      && same(state.chainCleanup.sourceIds, frame!.cleanupSourceIds), 'Invalid Counter cleanup context');
    const pending = chainCleanupDecision(registry, { ...state, pendingDecision: null }, state.chainCleanup!);
    check(pending && decision?.kind === 'cleanup-order' && decision.id === `${frame!.root.id}:cleanup:${pending.playerId}`
      && decision.playerId === pending.playerId && decision.min === pending.min && decision.max === pending.max
      && same(decision.optionIds, pending.optionIds), 'Invalid Counter cleanup decision');
  }
}

/** Trusted root resolver checkpoints its own completed work; NOT validation that an
 * arbitrary proposed board is a legal effect transition. Parent resolver must apply the
 * reviewed root plan, suspend commands, own decisions and manage terminal cleanup.
 */
export function checkpointCounterContinuation(registry:Registry,state:DuelState,journal:CounterContinuationJournal,stage:'root-choice'|'cleanup') {
  assertJournal(registry,journal);
  check(journal.stage!=='cleanup'&&(journal.stage==='before-root'||stage==='cleanup'),'Counter continuation stage cannot reopen');
  check(!state.result&&state.timing.window==='resolving'&&state.timing.priorityPlayer===null,'No Counter checkpoint after terminal or outside resolution');
  if(stage==='root-choice'){
    const plan=planResolution(registry.spellHandlers[journal.root.sourceAtActivation.definition.id],spellResolutionBoard(registry,state,journal.root.controllerId));
    check(plan.kind==='choose-destruction'&&state.pendingDecision?.kind==='effect-choice'&&state.pendingDecision.id===`${journal.root.id}:choice`&&state.pendingDecision.playerId===plan.playerId
      &&same(state.pendingDecision.optionIds,plan.optionIds)&&state.pendingDecision.min===1&&state.pendingDecision.max===1,'Invalid root choice checkpoint');
  }else check(!state.pendingDecision,'Finish root choice before cleanup checkpoint');
  const {integritySha256:_old,...body}=structuredClone(journal);
  const next=seal({...body,stage,boardFingerprint:resolutionFingerprint(state)});assertCounterContinuation(registry,state,next);return next;
}
