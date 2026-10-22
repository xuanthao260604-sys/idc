import { z } from 'zod';
import type { DuelState, EventRef, Phase, PlayerState, Slot } from '../../protocol/src/duel.js';
import { RequestSchema, RuleError, requireRule as rule } from './actions.js';
import type { EngineRequest, RejectionCode } from './actions.js';
import { createRandom } from './random.js';
import { freeze, validateDeck } from './registry.js';
import { planResolution } from './effect-plans.js';
import type { SupportedMonster, Registry } from './registry.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
type State = Mutable<DuelState>;
export interface EngineEvent extends EventRef {
  readonly details: Readonly<Record<string, string | number | boolean>>;
}
interface Context { state: State; registry: Registry; events: EngineEvent[] }
export type ActionResult =
  | { accepted: true; state: DuelState; events: readonly EngineEvent[] }
  | { accepted: false; state: DuelState; code: RejectionCode; message: string };

const mutablePlayer = (s: State, id: string) => s.players.find(p => p.id === id)!;
const other = (s: DuelState, id: string) => s.players.find(p => p.id !== id)!;
const definition = (c: Context, id: string) => c.registry.cards[c.state.cards[id]!.definition.id]!;
const monsterDefinition = (c: Context, id: string): SupportedMonster => {
  const def = definition(c, id);
  if (def.kind !== 'normal-monster' && def.kind !== 'effect-monster') throw new Error('Expected supported monster');
  return def;
};
function emit(c: Context, kind: string, ids: readonly string[] = [], details: Record<string, string | number | boolean> = {}, semantic = true) {
  const event = { sequence: ++c.state.eventSequence, simultaneousGroup: `${c.state.id}:event:${c.state.eventSequence}`,
    kind, affectedInstances: [...ids], details };
  c.events.push(event);
  if (semantic) c.state.timing.lastRelevantEvents = [{ ...event, affectedInstances: [...ids] }];
}
function open(c: Context) {
  c.state.timing = { ...c.state.timing, window: 'open', priorityPlayer: c.state.turn.activePlayer,
    consecutivePasses: 0, requestedPhase: null };
}
function response(c: Context, window: 'action-response' | 'summon-response') {
  open(c); c.state.timing.window = window;
}
function endDuel(c: Context, winner: string | null, reason: NonNullable<DuelState['result']>['reason']) {
  c.state.result = { winner, reason };
  c.state.pendingDecision = null;
  open(c); c.state.timing.priorityPlayer = null;
  emit(c, 'duel-ended', [], { winner: winner ?? 'draw', reason });
}
function draw(c: Context, playerId: string) {
  const p = mutablePlayer(c.state, playerId);
  const id = p.deck.shift();
  if (id === undefined) { endDuel(c, other(c.state, playerId).id, 'failed-draw'); return; }
  p.hand.push(id); c.state.cards[id]!.location = { kind: 'hand', playerId };
  emit(c, 'card-drawn', [id], { playerId });
}
function beginTurn(c: Context) {
  c.state.turn.phase = 'draw'; c.state.battle = null;
  for (const p of c.state.players) p.normalSummonsOrSetsUsed = 0;
  for (const card of Object.values(c.state.cards)) {
    card.markers.attackDeclarationsThisTurn = 0; card.markers.attackCountConsumedThisTurn = 0;
  }
  open(c); emit(c, 'phase-entered', [], { phase: 'draw', playerId: c.state.turn.activePlayer });
  draw(c, c.state.turn.activePlayer); // Goat includes the first player's first Draw Phase.
  if (!c.state.result) response(c, 'action-response');
}
function sendToGraveyard(c: Context, id: string) {
  const card = c.state.cards[id]!;
  const location = card.location;
  const controller = mutablePlayer(c.state, card.controllerId);
  if (location.kind === 'monster') controller.monsters[location.slot] = null;
  else if (location.kind === 'spell-trap') controller.spellsTraps[location.slot] = null;
  else if (location.kind === 'hand') {
    const p = mutablePlayer(c.state, location.playerId);
    p.hand.splice(p.hand.indexOf(id), 1);
  } else throw new Error('Unsupported graveyard movement in vanilla engine');
  const owner = mutablePlayer(c.state, card.ownerId);
  owner.graveyard.push(id); card.location = { kind: 'graveyard', playerId: owner.id };
  card.controllerId = owner.id; card.position = 'face-up';
}

export function assertDuelInvariants(state: DuelState, registry: Registry) {
  if (state.format.id !== registry.format.id || state.format.revision !== registry.format.revision || state.cardRegistryRevision !== registry.revision)
    throw new Error('State/registry version mismatch');
  if (state.players.length !== 2 || state.players[0].id === state.players[1].id) throw new Error('Invalid players');
  if (!state.players.some(p => p.id === state.turn.activePlayer)) throw new Error('Invalid active player');
  if (!Number.isSafeInteger(state.stateVersion) || state.stateVersion < 0 || !Number.isSafeInteger(state.eventSequence)) throw new Error('Invalid version/sequence');
  if (state.chain.length > 5 || state.pendingTriggers.length > 1 || state.modifiers.length) throw new Error('Unsupported effect state');
  if (state.timing.window === 'resolving' && (state.chain.length !== 1 || state.pendingDecision?.kind !== 'effect-choice')) throw new Error('Invalid paused resolution');
  if (state.pendingTriggers.length && (state.chain.length || state.pendingDecision?.kind !== 'target' || state.timing.window !== 'trigger-order')) throw new Error('Invalid pending FLIP');
  if (state.timing.window === 'chain-response' && state.chain.length < 1) throw new Error('Missing Chain link');
  const seen = new Set<string>();
  const visit = (id: string, p: PlayerState, zone: 'deck' | 'hand' | 'graveyard' | 'banished' | 'fusion-deck' | 'monster' | 'spell-trap', slot?: Slot) => {
    const card = state.cards[id];
    if (!card || seen.has(id) || card.id !== id) throw new Error('Missing/duplicate card instance');
    seen.add(id);
    const def = registry.cards[card.definition.id];
    if (!def || def.revision !== card.definition.revision) throw new Error('Unsupported definition/revision in state');
    if (!state.players.some(owner => owner.id === card.ownerId)) throw new Error('Invalid owner');
    if (card.location.kind !== zone || card.location.playerId !== p.id) throw new Error('Card location disagrees with zone');
    if (zone === 'spell-trap') {
      if ((def.kind !== 'spell' && def.kind !== 'trap') || card.location.kind !== 'spell-trap' || card.location.slot !== slot || card.controllerId !== p.id
        || !['face-up', 'face-down'].includes(card.position)) throw new Error('Invalid spell zone');
    } else if (zone === 'monster') {
      if (def.kind !== 'normal-monster' && def.kind !== 'effect-monster') throw new Error('Non-monster in monster zone');
      if (card.location.kind !== 'monster' || card.location.slot !== slot || card.controllerId !== p.id
        || !['face-up-attack', 'face-up-defense', 'face-down-defense'].includes(card.position)) throw new Error('Invalid board position');
    } else if (card.ownerId !== p.id || card.controllerId !== p.id) throw new Error('Invalid owner zone');
  };
  for (const p of state.players) {
    if (!Number.isSafeInteger(p.lifePoints) || p.lifePoints < 0) throw new Error('Invalid LP');
    if (p.monsters.length !== 5 || p.spellsTraps.length !== 5) throw new Error('Invalid zone count');
    if (p.field !== null || p.fusionDeck.length) throw new Error('Non-vanilla board in vanilla engine');
    for (const [zone, ids] of [['deck', p.deck], ['hand', p.hand], ['graveyard', p.graveyard], ['banished', p.banished], ['fusion-deck', p.fusionDeck]] as const)
      for (const id of ids) visit(id, p, zone);
    p.spellsTraps.forEach((id, slot) => { if (id !== null) visit(id, p, 'spell-trap', slot as Slot); });
    p.monsters.forEach((id, slot) => { if (id !== null) visit(id, p, 'monster', slot as Slot); });
  }
  for (const link of state.chain) {
    const card = state.cards[link.source];
    const flip = card && registry.flipHandlers[card.definition.id];
    const trap = card && registry.trapHandlers[card.definition.id];
    const validSource = card && (trap
      ? card.location.kind === 'spell-trap' && card.position === 'face-up' && link.effectId === trap && link.targetRefs.length === 1
      : flip
      ? card.location.kind === 'monster' && link.effectId === flip && link.targetRefs.length <= 1
      : registry.spellHandlers[card.definition.id] && card.location.kind === 'spell-trap' && card.position === 'face-up' && link.effectId === 'normal-spell' && !link.targetRefs.length);
    if (!validSource || link.controllerId !== card!.controllerId || link.spellSpeed !== (trap ? 2 : 1) || link.costEvents.length
      || link.activationNegated || link.effectNegated || !['chain-response', 'resolving'].includes(state.timing.window)) throw new Error('Invalid supported Chain');
  }
  if (seen.size !== Object.keys(state.cards).length) throw new Error('Unreferenced card instance');
  if (state.players.some(p => p.lifePoints === 0) && !state.result) throw new Error('Zero LP without a duel result');
  if (state.timing.priorityPlayer !== null && !state.players.some(p => p.id === state.timing.priorityPlayer)) throw new Error('Invalid priority player');
}

const StartSchema = z.strictObject({
  duelId: z.string().min(1), players: z.tuple([
    z.strictObject({ id: z.string().min(1), deck: z.array(z.string().min(1)) }),
    z.strictObject({ id: z.string().min(1), deck: z.array(z.string().min(1)) }),
  ]), firstPlayerId: z.string().optional(), seedHex: z.string().optional(),
});
/** Trusted server setup. A supplied seed is for tests/replays, never a client choice. */
export function createDuel(registry: Registry, input: z.input<typeof StartSchema>): { state: DuelState; events: readonly EngineEvent[] } {
  const options = StartSchema.parse(input);
  if (options.players[0].id === options.players[1].id) throw new Error('Player IDs must differ');
  for (const p of options.players) validateDeck(registry, p.deck);
  const rng = createRandom(options.duelId, options.seedHex);
  const active = options.firstPlayerId ?? options.players[rng.int(2)]!.id;
  if (!options.players.some(p => p.id === active)) throw new Error('Invalid starting player');
  const cards: State['cards'] = {};
  const makePlayer = (p: (typeof options.players)[number], playerIndex: number): Mutable<PlayerState> => {
    const ids = p.deck.map((definitionId, index) => {
      const id = `${options.duelId}:p${playerIndex}:c${index}`;
      const def = registry.cards[definitionId]!;
      cards[id] = { id, definition: { id: def.id, revision: def.revision }, ownerId: p.id, controllerId: p.id,
        location: { kind: 'deck', playerId: p.id }, position: 'face-down', counters: {},
        markers: { summonedOnTurn: null, summonedBy: null, setOnTurn: null, manuallyChangedOnTurn: null,
          attackDeclarationsThisTurn: 0, attackCountConsumedThisTurn: 0, wasBattleDestroyed: false } };
      return id;
    });
    return { id: p.id, lifePoints: registry.rules.lifePoints, deck: rng.shuffle(ids), hand: [],
      monsters: [null, null, null, null, null], spellsTraps: [null, null, null, null, null], field: null,
      graveyard: [], banished: [], fusionDeck: [], normalSummonsOrSetsUsed: 0 };
  };
  const players: [Mutable<PlayerState>, Mutable<PlayerState>] = [makePlayer(options.players[0], 0), makePlayer(options.players[1], 1)];
  const state: State = { id: options.duelId, format: { ...registry.format }, cardRegistryRevision: registry.revision,
    stateVersion: 0, eventSequence: 0, turn: { number: 1, activePlayer: active, phase: 'draw' }, players, cards,
    chain: [], pendingTriggers: [], modifiers: [], timing: { window: 'open', priorityPlayer: active, consecutivePasses: 0, lastRelevantEvents: [], requestedPhase: null },
    battle: null, pendingDecision: null, rng: rng.state(), result: null };
  const c: Context = { state, registry, events: [] };
  emit(c, 'duel-started');
  for (let i = 0; i < registry.rules.openingHand; i++) for (const p of players) draw(c, p.id);
  if (!state.result) beginTurn(c);
  state.rng = rng.state();
  assertDuelInvariants(state, registry);
  return { state: freeze(state), events: freeze(c.events) };
}

function requireMain(c: Context, actorId: string) {
  rule(actorId === c.state.turn.activePlayer, 'not-your-action', 'Only the turn player may take this action');
  rule(c.state.timing.window === 'open' && !c.state.pendingDecision, 'illegal-timing', 'Wait for the response/decision window');
  rule(c.state.turn.phase === 'main1' || c.state.turn.phase === 'main2', 'illegal-timing', 'Action requires a Main Phase');
}
function summon(c: Context, actorId: string, action: Extract<EngineRequest['action'], { type: 'normal-summon' | 'set-monster' }>) {
  requireMain(c, actorId);
  const p = mutablePlayer(c.state, actorId);
  const card = c.state.cards[action.instanceId];
  rule(card && p.hand.includes(card.id), 'invalid-target', 'Card is not in your hand');
  rule(p.normalSummonsOrSetsUsed < c.registry.rules.summons.normalSummonOrSetQuota, 'quota-used', 'Normal Summon/Set quota already used');
  const def = definition(c, card.id);
  rule(def.kind === 'normal-monster' || def.kind === 'effect-monster', 'invalid-target', 'Card is not a supported monster');
  const required = c.registry.rules.summons.tributesByLevel.find(r => def.level >= r.min && def.level <= r.max)?.count;
  rule(required !== undefined && action.tributeIds.length === required && new Set(action.tributeIds).size === required,
    'unpayable-tribute', 'Incorrect or duplicate Tributes');
  rule(action.tributeIds.every(id => p.monsters.includes(id)), 'unpayable-tribute', 'Tributes must be monsters you control');
  const occupied = p.monsters[action.slot as Slot];
  rule(occupied === null || action.tributeIds.includes(occupied), 'occupied-zone', 'Destination zone is occupied');
  if (action.tributeIds.length) {
    for (const id of action.tributeIds) sendToGraveyard(c, id);
    emit(c, 'monsters-tributed', action.tributeIds, { playerId: actorId });
  }
  p.hand.splice(p.hand.indexOf(card.id), 1);
  p.monsters[action.slot] = card.id; card.location = { kind: 'monster', playerId: actorId, slot: action.slot as Slot };
  p.normalSummonsOrSetsUsed++;
  if (action.type === 'set-monster') {
    card.position = 'face-down-defense'; card.markers.setOnTurn = c.state.turn.number;
    emit(c, 'monster-set', [card.id], { playerId: actorId }); response(c, 'action-response');
  } else {
    card.position = 'face-up-attack'; card.markers.summonedOnTurn = c.state.turn.number; card.markers.summonedBy = actorId;
    emit(c, 'monster-summoned', [card.id], { playerId: actorId, method: required ? 'tribute' : 'normal' }); response(c, 'summon-response');
  }
}
function position(c: Context, actorId: string, action: Extract<EngineRequest['action'], { type: 'change-position' | 'flip-summon' }>) {
  requireMain(c, actorId);
  const p = mutablePlayer(c.state, actorId); const card = c.state.cards[action.instanceId];
  rule(card && p.monsters.includes(card.id), 'invalid-target', 'Monster is not on your field');
  rule(card.markers.setOnTurn !== c.state.turn.number
    && !(card.markers.summonedOnTurn === c.state.turn.number && card.markers.summonedBy === actorId)
    && card.markers.manuallyChangedOnTurn !== c.state.turn.number && card.markers.attackDeclarationsThisTurn === 0,
  'invalid-position', 'Monster cannot change position manually this turn');
  if (action.type === 'flip-summon') {
    rule(card.position === 'face-down-defense', 'invalid-position', 'Flip Summon requires a face-down Defense Position monster');
    card.position = 'face-up-attack'; card.markers.summonedOnTurn = c.state.turn.number; card.markers.summonedBy = actorId;
    emit(c, 'monster-summoned', [card.id], { playerId: actorId, method: 'flip' }); response(c, 'summon-response');
    if (c.registry.flipHandlers[card.definition.id]) queueFlip(c, card.id);
  } else {
    rule(card.position === 'face-up-attack' || card.position === 'face-up-defense', 'invalid-position', 'Use Flip Summon for a face-down monster');
    card.position = card.position === 'face-up-attack' ? 'face-up-defense' : 'face-up-attack';
    emit(c, 'position-changed', [card.id], { playerId: actorId }); response(c, 'action-response');
  }
  card.markers.manuallyChangedOnTurn = c.state.turn.number;
}
function declareAttack(c: Context, actorId: string, attackerId: string, targetId: string) {
  rule(actorId === c.state.turn.activePlayer, 'not-your-action', 'Only the turn player attacks');
  rule(c.state.turn.phase === 'battle' && c.state.battle?.step === 'battle' && c.state.timing.window === 'open'
    && c.state.battle.attacker === null, 'illegal-timing', 'Attack requires an open Battle Step');
  const p = mutablePlayer(c.state, actorId); const opponent = other(c.state, actorId);
  const card = c.state.cards[attackerId];
  rule(card && p.monsters.includes(attackerId), 'invalid-target', 'Attacker is not on your field');
  rule(card.position === 'face-up-attack' && card.markers.attackCountConsumedThisTurn === 0, 'invalid-position', 'Monster cannot attack');
  rule(targetId === 'direct' ? opponent.monsters.every(id => id === null) : opponent.monsters.includes(targetId),
    'invalid-target', 'Invalid attack target/direct attack');
  card.markers.attackDeclarationsThisTurn++; card.markers.attackCountConsumedThisTurn++;
  c.state.battle.attacker = attackerId; c.state.battle.target = targetId;
  emit(c, 'attack-declared', targetId === 'direct' ? [attackerId] : [attackerId, targetId], { playerId: actorId, direct: targetId === 'direct' });
  response(c, 'action-response');
}
function resolveBattle(c: Context) {
  const battle = c.state.battle!; const attacker = c.state.cards[battle.attacker!]!;
  const defender = battle.target === 'direct' ? null : c.state.cards[battle.target!]!;
  const attack = monsterDefinition(c, attacker.id).attack;
  let damage = 0; let damagedPlayer = other(c.state, attacker.controllerId).id;
  let destroyed: string[] = [];
  let flipped: string | null = null;
  battle.step = 'damage';
  for (const timing of ['start', 'before-calculation', 'calculation-1', 'calculation-2', 'after-calculation', 'end'] as const) {
    battle.damageTiming = timing;
    emit(c, 'damage-timing', [], { timing }, false);
    if (timing === 'before-calculation' && defender?.position === 'face-down-defense') {
      flipped = defender.id; defender.position = 'face-up-defense'; emit(c, 'monster-flipped', [defender.id]);
    }
    if (timing === 'calculation-1') {
      if (!defender) damage = attack;
      else if (defender.position === 'face-up-attack') {
        const difference = attack - monsterDefinition(c, defender.id).attack;
        if (difference > 0) { damage = difference; destroyed = [defender.id]; }
        else if (difference < 0) { damage = -difference; damagedPlayer = attacker.controllerId; destroyed = [attacker.id]; }
        else destroyed = [attacker.id, defender.id]; // Goat also destroys both at 0 ATK.
      } else {
        const difference = attack - monsterDefinition(c, defender.id).defense;
        if (difference > 0) destroyed = [defender.id];
        if (difference < 0) { damage = -difference; damagedPlayer = attacker.controllerId; }
      }
    }
    if (timing === 'calculation-2' && damage > 0) {
      const p = mutablePlayer(c.state, damagedPlayer); p.lifePoints = Math.max(0, p.lifePoints - damage);
      emit(c, 'battle-damage', [], { playerId: damagedPlayer, amount: damage });
      if (p.lifePoints === 0) { endDuel(c, other(c.state, damagedPlayer).id, 'life-points'); return; }
    }
    if (timing === 'after-calculation' && destroyed.length) {
      for (const id of destroyed) c.state.cards[id]!.markers.wasBattleDestroyed = true;
      emit(c, 'battle-destroyed', destroyed);
    }
    if (timing === 'after-calculation' && flipped && c.registry.flipHandlers[c.state.cards[flipped]!.definition.id]) { queueFlip(c, flipped); return; }
    if (timing === 'end' && destroyed.length) {
      for (const id of destroyed) sendToGraveyard(c, id);
      emit(c, 'sent-to-graveyard', destroyed, { reason: 'battle' });
    }
  }
  battle.step = 'battle'; battle.attacker = null; battle.target = null; battle.damageTiming = null;
  open(c);
}
function enterPhase(c: Context, phase: Phase) {
  if (c.state.turn.phase === 'end' && phase === 'draw') {
    c.state.turn.activePlayer = other(c.state, c.state.turn.activePlayer).id;
    c.state.turn.number++; beginTurn(c); return;
  }
  c.state.turn.phase = phase; open(c);
  c.state.battle = phase === 'battle' ? { step: 'battle', attacker: null, target: null, damageTiming: null,
    ordinaryDamageChainUsed: false, replayPending: false } : null;
  emit(c, 'phase-entered', [], { phase, playerId: c.state.turn.activePlayer });
  if (phase === 'end') {
    const p = mutablePlayer(c.state, c.state.turn.activePlayer); const excess = p.hand.length - c.registry.rules.handLimit;
    if (excess > 0) c.state.pendingDecision = { id: `${c.state.id}:discard:${c.state.turn.number}:${c.state.eventSequence}`,
      playerId: p.id, kind: 'discard', optionIds: [...p.hand], min: excess, max: excess };
  }
}
function requestPhase(c: Context, actorId: string, phase: Phase) {
  rule(actorId === c.state.turn.activePlayer, 'not-your-action', 'Only the turn player requests a phase');
  rule(c.state.timing.window === 'open' && !c.state.pendingDecision, 'illegal-timing', 'Cannot skip responses/mandatory decisions');
  const current = c.state.turn.phase;
  const allowed: Record<Phase, readonly Phase[]> = { draw: ['standby'], standby: ['main1'],
    main1: c.state.turn.number === 1 ? ['end'] : ['battle', 'end'], battle: ['main2'], main2: ['end'], end: ['draw'] };
  rule(allowed[current].includes(phase), 'illegal-timing', 'Invalid phase transition');
  c.state.timing.window = 'phase-exit'; c.state.timing.requestedPhase = phase;
  c.state.timing.priorityPlayer = other(c.state, actorId).id; c.state.timing.consecutivePasses = 1;
  emit(c, 'phase-requested', [], { phase }, false);
}
function queueFlip(c: Context, id: string) {
  const card = c.state.cards[id]!;
  const occurrence = c.state.timing.lastRelevantEvents[0]!;
  c.state.pendingTriggers.push({ source: id, sourceAtTrigger: structuredClone(card), effectId: c.registry.flipHandlers[card.definition.id]!,
    controllerAtTrigger: card.controllerId, occurrence: structuredClone(occurrence), mandatory: true, timingPolicy: 'mandatory' });
  const options = c.state.players.flatMap(p => p.monsters.filter((id): id is string => id !== null && !c.state.cards[id]!.markers.wasBattleDestroyed));
  c.state.timing.window = 'trigger-order'; c.state.timing.priorityPlayer = null; c.state.timing.consecutivePasses = 0;
  if (!options.length) { activateFlip(c, null); return; }
  c.state.pendingDecision = { id: `${c.state.id}:flip-target:${c.state.eventSequence}`, playerId: card.controllerId, kind: 'target', optionIds: options, min: 1, max: 1 };
}
function activateFlip(c: Context, target: string | null) {
  const trigger = c.state.pendingTriggers.shift()!;
  c.state.chain.push({ id: `${c.state.id}:flip-link:${c.state.eventSequence + 1}`, controllerId: trigger.controllerAtTrigger,
    source: trigger.source, sourceAtActivation: structuredClone(c.state.cards[trigger.source]!), effectId: trigger.effectId,
    spellSpeed: 1, costEvents: [], targetRefs: target ? [{ instanceId: target, locationAtSelection: { ...c.state.cards[target]!.location } }] : [], activationNegated: false, effectNegated: false });
  emit(c, 'flip-effect-activated', [trigger.source, ...(target ? [target] : [])]);
  c.state.timing.window = 'chain-response'; c.state.timing.priorityPlayer = other(c.state, trigger.controllerAtTrigger).id; c.state.timing.consecutivePasses = 0;
}
function finishDamageAfterFlip(c: Context) {
  const battle = c.state.battle!;
  battle.damageTiming = 'end'; emit(c, 'damage-timing', [], { timing: 'end' }, false);
  const destroyed = c.state.players.flatMap(p => p.monsters.filter((id): id is string => id !== null && c.state.cards[id]!.markers.wasBattleDestroyed));
  for (const id of destroyed) sendToGraveyard(c, id);
  if (destroyed.length) emit(c, 'sent-to-graveyard', destroyed, { reason: 'battle' });
  battle.step = 'battle'; battle.attacker = null; battle.target = null; battle.damageTiming = null; open(c);
}
function resolveFlip(c: Context) {
  const link = c.state.chain.pop()!;
  const ref = link.targetRefs[0], target = ref && c.state.cards[ref.instanceId];
  if (target && target.location.kind === 'monster' && !target.markers.wasBattleDestroyed
    && JSON.stringify(target.location) === JSON.stringify(ref!.locationAtSelection)) {
    if (link.effectId === 'destroy-target-monster') { sendToGraveyard(c, target.id); emit(c, 'effect-destroyed', [target.id]); }
    else {
      mutablePlayer(c.state, target.controllerId).monsters[target.location.slot] = null;
      mutablePlayer(c.state, target.ownerId).hand.push(target.id);
      target.location = { kind: 'hand', playerId: target.ownerId }; target.controllerId = target.ownerId; target.position = 'face-down';
      target.counters = {}; target.markers = { summonedOnTurn: null, summonedBy: null, setOnTurn: null, manuallyChangedOnTurn: null, attackDeclarationsThisTurn: 0, attackCountConsumedThisTurn: 0, wasBattleDestroyed: false };
      emit(c, 'returned-to-hand', [target.id]);
    }
  }
  emit(c, 'chain-resolved', [], {}, false);
  if (c.state.battle?.step === 'damage') finishDamageAfterFlip(c); else response(c, 'action-response');
}

function setTrap(c: Context, actorId: string, id: string, slot: Slot) {
  requireMain(c, actorId);
  const p = mutablePlayer(c.state, actorId), card = c.state.cards[id];
  rule(card && p.hand.includes(id) && c.registry.trapHandlers[card.definition.id], 'invalid-target', 'Unsupported Trap in hand');
  rule(p.spellsTraps[slot] === null, 'occupied-zone', 'Spell/Trap zone occupied');
  p.hand.splice(p.hand.indexOf(id), 1); p.spellsTraps[slot] = id;
  card.location = { kind: 'spell-trap', playerId: actorId, slot }; card.position = 'face-down'; card.markers.setOnTurn = c.state.turn.number;
  emit(c, 'trap-set', [id]); response(c, 'action-response');
}
function activateTrap(c: Context, actorId: string, id: string, targetId: string) {
  rule(!c.state.pendingDecision && c.state.timing.priorityPlayer === actorId, 'not-your-action', 'Wait for your priority');
  rule(c.state.timing.window === 'summon-response' || (c.state.timing.window === 'chain-response'
    && c.state.chain.every(link => link.effectId === 'destroy-opponent-normal-or-flip-summoned-1000')),
    'illegal-timing', 'Trap requires the supported summon response window');
  const card = c.state.cards[id], target = c.state.cards[targetId];
  rule(card && c.registry.trapHandlers[card.definition.id] && card.controllerId === actorId
    && card.location.kind === 'spell-trap' && card.position === 'face-down', 'invalid-target', 'Trap must be Set on your field');
  rule(card.markers.setOnTurn !== null && card.markers.setOnTurn < c.state.turn.number, 'illegal-timing', 'Cannot activate Trap in the turn it was Set');
  const event = c.state.timing.lastRelevantEvents[0];
  rule(event?.kind === 'monster-summoned' && event.affectedInstances.includes(targetId)
    && ['normal', 'tribute', 'flip'].includes(String(event.details?.method)), 'invalid-target', 'Not a supported Normal/Flip Summon event');
  rule(target && target.controllerId !== actorId && target.location.kind === 'monster' && target.position !== 'face-down-defense'
    && monsterDefinition(c, targetId).attack >= 1000, 'invalid-target', 'Summoned opponent monster must have at least 1000 ATK');
  card.position = 'face-up';
  c.state.chain.push({ id: `${c.state.id}:trap-link:${c.state.eventSequence + 1}`, controllerId: actorId, source: id,
    sourceAtActivation: structuredClone(card), effectId: c.registry.trapHandlers[card.definition.id]!, spellSpeed: 2,
    costEvents: [], targetRefs: [{ instanceId: targetId, locationAtSelection: { ...target.location } }], activationNegated: false, effectNegated: false });
  // A response belongs to the same summon event; do not erase that occurrence with activation bookkeeping.
  emit(c, 'trap-activated', [id, targetId], {}, false);
  c.state.timing.window = 'chain-response'; c.state.timing.priorityPlayer = other(c.state, actorId).id; c.state.timing.consecutivePasses = 0;
}
function resolveTraps(c: Context) {
  const cleanup: string[] = [];
  while (c.state.chain.length) {
    const link = c.state.chain.pop()!, ref = link.targetRefs[0]!, target = c.state.cards[ref.instanceId];
    emit(c, 'chain-link-resolving', [link.source], {}, false);
    if (target?.location.kind === 'monster' && target.position !== 'face-down-defense'
      && JSON.stringify(target.location) === JSON.stringify(ref.locationAtSelection) && monsterDefinition(c, target.id).attack >= 1000) {
      sendToGraveyard(c, target.id); emit(c, 'effect-destroyed', [target.id]);
    }
    cleanup.push(link.source);
  }
  for (const id of cleanup) sendToGraveyard(c, id);
  emit(c, 'sent-to-graveyard', cleanup, { reason: 'trap-cleanup' });
  emit(c, 'chain-resolved', [], {}, false); response(c, 'action-response');
}

function resolutionBoard(c: Context, controllerId: string) {
  return { controllerId, monsters: c.state.players.flatMap(p => p.monsters.filter((id): id is string => id !== null).map(id => ({
    instanceId: id, controllerId: p.id, faceUp: c.state.cards[id]!.position !== 'face-down-defense', position: c.state.cards[id]!.position, attack: monsterDefinition(c, id).attack, defense: monsterDefinition(c, id).defense,
  }))) };
}
function spell(c: Context, actorId: string, action: Extract<EngineRequest['action'], { type: 'activate-spell' | 'set-spell' }>) {
  requireMain(c, actorId);
  const p = mutablePlayer(c.state, actorId), card = c.state.cards[action.instanceId];
  rule(card && definition(c, card.id).kind === 'spell' && c.registry.spellHandlers[card.definition.id], 'invalid-target', 'Unsupported spell');
  const fromHand = p.hand.includes(card.id);
  const fromSet = card.location.kind === 'spell-trap' && card.location.playerId === actorId && card.position === 'face-down' && card.location.slot === action.slot;
  rule(fromHand || (action.type === 'activate-spell' && fromSet), 'invalid-target', 'Spell is not in an eligible own zone');
  rule(fromSet || p.spellsTraps[action.slot] === null, 'occupied-zone', 'Spell zone occupied');
  const handler = c.registry.spellHandlers[card.definition.id]!;
  if (action.type === 'activate-spell' && ['destroy-lowest-opposing-face-up-attack', 'destroy-highest-opposing-face-up-defense', 'destroy-highest-face-up-attack-position'].includes(handler.handler))
    rule(planResolution(handler, resolutionBoard(c, actorId)).kind !== 'no-op', 'invalid-target', 'No eligible monster for this Spell');
  if (fromHand) { p.hand.splice(p.hand.indexOf(card.id), 1); p.spellsTraps[action.slot] = card.id; }
  card.location = { kind: 'spell-trap', playerId: actorId, slot: action.slot as Slot };
  card.position = action.type === 'set-spell' ? 'face-down' : 'face-up';
  if (action.type === 'set-spell') {
    card.markers.setOnTurn = c.state.turn.number; emit(c, 'spell-set', [card.id]); response(c, 'action-response'); return;
  }
  c.state.chain.push({ id: `${c.state.id}:link:${c.state.eventSequence + 1}`, controllerId: actorId, source: card.id,
    sourceAtActivation: structuredClone(card), effectId: 'normal-spell', spellSpeed: 1, costEvents: [], targetRefs: [], activationNegated: false, effectNegated: false });
  emit(c, 'spell-activated', [card.id]);
  c.state.timing.window = 'chain-response'; c.state.timing.priorityPlayer = other(c.state, actorId).id; c.state.timing.consecutivePasses = 0;
}
function finishSpell(c: Context) {
  const link = c.state.chain.pop()!;
  sendToGraveyard(c, link.source); emit(c, 'sent-to-graveyard', [link.source], { reason: 'spell-cleanup' });
  emit(c, 'chain-resolved', [], {}, false);
  if (!c.state.result) response(c, 'action-response');
}
function resolveSpell(c: Context) {
  const link = c.state.chain[0]!;
  c.state.timing.window = 'resolving'; c.state.timing.priorityPlayer = null;
  const plan = planResolution(c.registry.spellHandlers[c.state.cards[link.source]!.definition.id], resolutionBoard(c, link.controllerId));
  if (plan.kind === 'choose-destruction') {
    c.state.pendingDecision = { id: `${link.id}:choice`, playerId: plan.playerId, kind: 'effect-choice', optionIds: [...plan.optionIds], min: 1, max: 1 }; return;
  }
  if (plan.kind === 'draw') for (let i = 0; i < plan.count && !c.state.result; i++) draw(c, plan.playerId);
  if (plan.kind === 'effect-damage') {
    const victim = mutablePlayer(c.state, other(c.state, plan.controllerId).id);
    victim.lifePoints = Math.max(0, victim.lifePoints - plan.amount);
    emit(c, 'effect-damage', [], { playerId: victim.id, amount: plan.amount });
    if (victim.lifePoints === 0) endDuel(c, plan.controllerId, 'life-points');
  }
  if (plan.kind === 'life-points-gained') {
    const recipient = mutablePlayer(c.state, plan.playerId);
    rule(Number.isSafeInteger(recipient.lifePoints + plan.amount), 'invalid-action', 'LP exceeds numeric representation');
    recipient.lifePoints += plan.amount;
    emit(c, 'life-points-gained', [], { playerId: recipient.id, amount: plan.amount });
  }
  if (plan.kind === 'destroy') { sendToGraveyard(c, plan.instanceId); emit(c, 'effect-destroyed', [plan.instanceId]); }
  finishSpell(c);
}

function pass(c: Context, actorId: string) {
  rule(!c.state.pendingDecision && c.state.timing.priorityPlayer === actorId, 'not-your-action', 'Not your response window or decision pending');
  c.state.timing.consecutivePasses++;
  emit(c, 'priority-passed', [], { playerId: actorId }, false);
  if (c.state.timing.consecutivePasses < 2) {
    c.state.timing.priorityPlayer = other(c.state, actorId).id;
    if (c.state.timing.window === 'open') c.state.timing.window = 'action-response';
    return;
  }
  const phase = c.state.timing.requestedPhase;
  if (c.state.chain.length) {
    if (c.registry.trapHandlers[c.state.cards[c.state.chain[0]!.source]!.definition.id]) resolveTraps(c);
    else if (c.state.chain[0]!.effectId === 'normal-spell') resolveSpell(c); else resolveFlip(c);
  }
  else if (phase !== null) enterPhase(c, phase);
  else if (c.state.battle?.attacker) resolveBattle(c);
  else open(c);
}
function answer(c: Context, actorId: string, decisionId: string, ids: string[]) {
  const decision = c.state.pendingDecision;
  if (decision?.kind === 'target') {
    rule(decision.id === decisionId && decision.playerId === actorId && ids.length === 1 && decision.optionIds.includes(ids[0]!), 'invalid-choice', 'Not your FLIP target choice');
    c.state.pendingDecision = null; activateFlip(c, ids[0]!); return;
  }
  if (decision?.kind === 'effect-choice') {
    rule(decision.id === decisionId && decision.playerId === actorId && ids.length === 1 && decision.optionIds.includes(ids[0]!), 'invalid-choice', 'Not a valid resolution choice');
    sendToGraveyard(c, ids[0]!); emit(c, 'effect-destroyed', ids);
    c.state.pendingDecision = null; finishSpell(c); return;
  }
  rule(decision && decision.id === decisionId && decision.playerId === actorId && decision.kind === 'discard', 'invalid-choice', 'Not your discard decision');
  const p = mutablePlayer(c.state, actorId);
  rule(ids.length === decision.min && ids.length === new Set(ids).size && ids.every(id => decision.optionIds.includes(id) && p.hand.includes(id)),
    'invalid-choice', 'Select exactly the required distinct hand cards');
  for (const id of ids) sendToGraveyard(c, id);
  emit(c, 'cards-discarded', ids, { playerId: actorId, reason: 'hand-limit' });
  c.state.pendingDecision = null; response(c, 'action-response');
}

/** Pure transition; actorId must come from a trusted adapter/session, not raw client identity. */
export function applyAction(registry: Registry, state: DuelState, requestInput: unknown): ActionResult {
  assertDuelInvariants(state, registry);
  const parsed = RequestSchema.safeParse(requestInput);
  if (!parsed.success) return { accepted: false, state, code: 'invalid-action', message: 'Malformed or unsupported engine action' };
  const request = parsed.data;
  try {
    rule(state.players.some(p => p.id === request.actorId), 'invalid-player', 'Player is not in this duel');
    rule(!state.result, 'duel-ended', 'Duel is already finished');
    rule(request.expectedStateVersion === state.stateVersion, 'stale-state', 'State version has changed');
    const c: Context = { state: structuredClone(state) as State, registry, events: [] };
    const a = request.action;
    switch (a.type) {
      case 'set-trap': setTrap(c, request.actorId, a.instanceId, a.slot as Slot); break;
      case 'activate-trap': activateTrap(c, request.actorId, a.instanceId, a.targetId); break;
      case 'activate-spell': case 'set-spell': spell(c, request.actorId, a); break;
      case 'normal-summon': case 'set-monster': summon(c, request.actorId, a); break;
      case 'flip-summon': case 'change-position': position(c, request.actorId, a); break;
      case 'declare-attack': declareAttack(c, request.actorId, a.attackerId, a.targetId); break;
      case 'request-phase': requestPhase(c, request.actorId, a.phase); break;
      case 'pass': pass(c, request.actorId); break;
      case 'answer-decision': answer(c, request.actorId, a.decisionId, a.optionIds); break;
      case 'concede': c.state.chain = []; c.state.pendingTriggers = []; endDuel(c, other(state, request.actorId).id, 'concession'); break;
    }
    c.state.stateVersion++;
    assertDuelInvariants(c.state, registry);
    return { accepted: true, state: freeze(c.state), events: freeze(c.events) };
  } catch (error) {
    if (error instanceof RuleError) return { accepted: false, state, code: error.code, message: error.message };
    throw error;
  }
}
