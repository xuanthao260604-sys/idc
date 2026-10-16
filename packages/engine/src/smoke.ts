import type { DuelState, Phase, Slot } from '../../protocol/src/duel.js';
import type { EngineAction } from './actions.js';
import { applyAction, createDuel } from './duel.js';
import type { EngineEvent } from './duel.js';
import type { NormalCard, Registry } from './registry.js';

/** Headless verification driver, not a shipped AI opponent or an online server. */
export function runVanillaSmoke(registry: Registry, seedHex: string) {
  const ids = Object.values(registry.cards).filter(c => c.kind === 'normal-monster').map(c => c.id);
  const deck = [...ids, ...ids, ...ids].slice(0, 40);
  const started = createDuel(registry, { duelId: 'vanilla-smoke', players: [{ id: 'a', deck }, { id: 'b', deck }],
    firstPlayerId: 'a', seedHex });
  let state = started.state;
  let commands = 0;
  const events: EngineEvent[] = [...started.events];
  const act = (actorId: string, action: EngineAction) => {
    if (++commands > 10000) throw new Error('Smoke command limit exceeded');
    const result = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
    if (!result.accepted) throw new Error(`Smoke action rejected: ${result.code}: ${result.message}`);
    state = result.state; events.push(...result.events);
  };
  const settle = () => {
    while (!state.result && state.timing.window !== 'open' && !state.pendingDecision)
      act(state.timing.priorityPlayer!, { type: 'pass' });
  };
  const advance = (phase: Phase) => {
    act(state.turn.activePlayer, { type: 'request-phase', phase }); settle();
  };
  const def = (instance: string) => registry.cards[state.cards[instance]!.definition.id]! as NormalCard;
  while (!state.result) {
    if (state.turn.number > 100) throw new Error('Smoke turn limit exceeded');
    settle();
    if (state.result) break;
    const activeId = state.turn.activePlayer;
    if (state.pendingDecision) {
      const d = state.pendingDecision;
      act(d.playerId, { type: 'answer-decision', decisionId: d.id, optionIds: d.optionIds.slice(0, d.min) });
      continue;
    }
    if (state.turn.phase === 'draw') { advance('standby'); continue; }
    if (state.turn.phase === 'standby') { advance('main1'); continue; }
    if (state.turn.phase === 'main1') {
      const p = state.players.find(p => p.id === activeId)!;
      const board = p.monsters.filter((instance): instance is string => instance !== null).sort((a, b) => def(a).attack - def(b).attack);
      const choices = p.hand.filter(instance => def(instance).kind === 'normal-monster').map(instance => ({ instance,
        tributes: registry.rules.summons.tributesByLevel.find(rule => def(instance).level >= rule.min && def(instance).level <= rule.max)!.count,
      })).filter(choice => choice.tributes <= board.length && (choice.tributes > 0 || p.monsters.includes(null)))
        .sort((a, b) => def(b.instance).attack - def(a.instance).attack);
      const choice = choices[0];
      if (choice) {
        const tributeIds = board.slice(0, choice.tributes);
        const free = p.monsters.findIndex(instance => instance === null || tributeIds.includes(instance));
        act(activeId, { type: 'normal-summon', instanceId: choice.instance, slot: free as Slot, tributeIds }); settle();
      }
      advance(state.turn.number === 1 ? 'end' : 'battle'); continue;
    }
    if (state.turn.phase === 'battle') {
      for (;;) {
        const p = state.players.find(p => p.id === activeId)!;
        const attackerId = p.monsters.find(instance => instance !== null && state.cards[instance]!.position === 'face-up-attack'
          && state.cards[instance]!.markers.attackCountConsumedThisTurn === 0);
        if (!attackerId) break;
        const opponent = state.players.find(p => p.id !== activeId)!;
        // Only board presence is inspected. No opponent hand, deck order or face-down stats.
        const targetId = opponent.monsters.find(instance => instance !== null) ?? 'direct';
        act(activeId, { type: 'declare-attack', attackerId, targetId }); settle();
        if (state.result) break;
      }
      if (!state.result) advance('main2');
      continue;
    }
    if (state.turn.phase === 'main2') { advance('end'); continue; }
    if (state.turn.phase === 'end') { advance('draw'); continue; }
  }
  return {
    state,
    report: {
      supportedNormalDefinitions: ids.length, unsupportedDefinitions: registry.unsupportedIds.length,
      turns: state.turn.number, commands, draws: events.filter(event => event.kind === 'card-drawn').length,
      summons: events.filter(event => event.kind === 'monster-summoned').length,
      attacks: events.filter(event => event.kind === 'attack-declared').length,
      battleDamageEvents: events.filter(event => event.kind === 'battle-damage').length,
      result: state.result, lifePoints: state.players.map(p => p.lifePoints),
    },
  };
}
