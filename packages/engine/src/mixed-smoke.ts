import type { DuelState, Phase } from '../../protocol/src/duel.js';
import type { Registry } from './registry.js';
import type { EngineAction } from './actions.js';
import { createDuel, applyAction } from './duel.js';
import type { EngineEvent } from './duel.js';

/** Deterministic test driver. Not product AI: no opponent hand/deck/face-down stats inspected. */
export function runMixedSmoke(registry: Registry, seedHex: string) {
  const definitions = Object.values(registry.cards);
  const deck = definitions.map(c => c.id);
  for (let copy = 2; deck.length < 40 && copy <= 3; copy++)
    for (const card of definitions) if (deck.length < 40 && card.legality.maxCopies! >= copy) deck.push(card.id);
  const started = createDuel(registry, { duelId: 'mixed-smoke', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex });
  let state: DuelState = started.state;
  const events: EngineEvent[] = [...started.events];
  let commands = 0;
  const act = (actorId: string, action: EngineAction) => {
    if (++commands > 15000) throw new Error('Mixed smoke command limit exceeded');
    const result = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
    if (!result.accepted) throw new Error(`Mixed smoke rejected ${action.type}: ${result.code}: ${result.message}`);
    state = result.state; events.push(...result.events);
  };
  const def = (id: string) => registry.cards[state.cards[id]!.definition.id]!;
  const advance = (phase: Phase) => act(state.turn.activePlayer, { type: 'request-phase', phase });
  while (!state.result) {
    if (state.turn.number > 200) throw new Error('Mixed smoke turn limit exceeded');
    const decision = state.pendingDecision;
    if (decision) {
      act(decision.playerId, { type: 'answer-decision', decisionId: decision.id, optionIds: decision.optionIds.slice(0, decision.min) }); continue;
    }
    if (state.timing.window !== 'open') {
      const actor = state.timing.priorityPlayer!;
      const p = state.players.find(p => p.id === actor)!;
      const occurrence = state.timing.lastRelevantEvents[0];
      const target = occurrence?.affectedInstances[0];
      const targetCard = target && state.cards[target];
      const targetDef = target && def(target);
      const trap = p.spellsTraps.find(id => id !== null && registry.trapHandlers[def(id).id]
        && state.cards[id]!.position === 'face-down' && state.cards[id]!.markers.setOnTurn! < state.turn.number);
      if (trap && occurrence?.kind === 'monster-summoned' && ['normal', 'tribute', 'flip'].includes(String(occurrence.details?.method))
        && targetCard && targetCard.controllerId !== actor && targetCard.location.kind === 'monster' && targetCard.position !== 'face-down-defense'
        && targetDef && (targetDef.kind === 'normal-monster' || targetDef.kind === 'effect-monster') && targetDef.attack >= 1000
        && (state.timing.window === 'summon-response' || (state.timing.window === 'chain-response'
          && state.chain.every(l => l.effectId === 'destroy-opponent-normal-or-flip-summoned-1000'))))
        act(actor, { type: 'activate-trap', instanceId: trap, targetId: targetCard.id });
      else act(actor, { type: 'pass' });
      continue;
    }
    const active = state.turn.activePlayer, p = state.players.find(p => p.id === active)!, opponent = state.players.find(p => p.id !== active)!;
    if (state.turn.phase === 'draw') { advance('standby'); continue; }
    if (state.turn.phase === 'standby') { advance('main1'); continue; }
    if (state.turn.phase === 'main1' || state.turn.phase === 'main2') {
      const free = p.spellsTraps.indexOf(null);
      const spell = free >= 0 && p.hand.find(id => ['draw', 'inflict-damage', 'gain-life-points'].includes(registry.spellHandlers[def(id).id]?.handler ?? '')
        || (registry.spellHandlers[def(id).id]?.handler === 'destroy-lowest-opposing-face-up-attack'
          && opponent.monsters.some(id => id !== null && state.cards[id]!.position !== 'face-down-defense')));
      if (spell) { act(active, { type: 'activate-spell', instanceId: spell, slot: free }); continue; }
      const trap = free >= 0 && p.hand.find(id => registry.trapHandlers[def(id).id]);
      if (trap) { act(active, { type: 'set-trap', instanceId: trap, slot: free }); continue; }
      const flip = p.monsters.find(id => id !== null && state.cards[id]!.position === 'face-down-defense'
        && state.cards[id]!.markers.setOnTurn !== state.turn.number);
      if (flip) { act(active, { type: 'flip-summon', instanceId: flip }); continue; }
      if (!p.normalSummonsOrSetsUsed) {
        const board = p.monsters.filter((id): id is string => id !== null);
        const candidates = p.hand.flatMap(id => {
          const d = def(id);
          if (d.kind !== 'normal-monster' && d.kind !== 'effect-monster') return [];
          const tributes = registry.rules.summons.tributesByLevel.find(r => d.level >= r.min && d.level <= r.max)!.count;
          return tributes <= board.length && (tributes > 0 || p.monsters.includes(null)) ? [{ id, tributes, score: registry.flipHandlers[d.id] ? 10000 : d.attack }] : [];
        }).sort((a, b) => b.score - a.score);
        const choice = candidates[0];
        if (choice) {
          const tributeIds = board.slice(0, choice.tributes), slot = p.monsters.findIndex(id => id === null || tributeIds.includes(id));
          act(active, { type: registry.flipHandlers[def(choice.id).id] ? 'set-monster' : 'normal-summon', instanceId: choice.id, slot, tributeIds }); continue;
        }
      }
      advance(state.turn.phase === 'main1' && state.turn.number > 1 ? 'battle' : 'end'); continue;
    }
    if (state.turn.phase === 'battle') {
      const attacker = p.monsters.find(id => id !== null && state.cards[id]!.position === 'face-up-attack' && !state.cards[id]!.markers.attackCountConsumedThisTurn);
      if (attacker) act(active, { type: 'declare-attack', attackerId: attacker, targetId: opponent.monsters.find(id => id !== null) ?? 'direct' });
      else advance('main2');
      continue;
    }
    advance('draw');
  }
  const count = (kind: string) => events.filter(e => e.kind === kind).length;
  const activatedDefinitions = [...new Set(events.filter(e => ['spell-activated', 'flip-effect-activated', 'trap-activated'].includes(e.kind))
    .map(e => state.cards[e.affectedInstances[0]!]!.definition.id))].sort();
  return { state, events, report: { deckSize: deck.length, deckDefinitions: new Set(deck).size, turns: state.turn.number, commands,
    draws: count('card-drawn'), spellActivations: count('spell-activated'), flipActivations: count('flip-effect-activated'), trapActivations: count('trap-activated'),
    returnedToHand: count('returned-to-hand'), effectDestructions: count('effect-destroyed'), battleDamageEvents: count('battle-damage'),
    activatedDefinitions, result: state.result, lifePoints: state.players.map(p => p.lifePoints) } };
}
