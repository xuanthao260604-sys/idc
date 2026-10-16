import type { DuelState, Slot } from '../../protocol/src/duel.js';
import type { DuelAction } from '../../protocol/src/commands.js';
import type { EngineAction } from './actions.js';
import type { Registry } from './registry.js';
import type { createPlayerProjection } from './player-view.js';
import { applyAction } from './duel.js';
import { freeze } from './registry.js';

/** Pilot-only action discovery. Probes pure transitions; never commits effects, costs or receipts.
 * Candidate construction uses only own cards and public board presence. Review this policy again
 * before introducing hidden-information conditions or general effects/modifiers.
 */
export function availableActions(registry: Registry, state: DuelState, projection: ReturnType<typeof createPlayerProjection>): readonly DuelAction[] {
  const view = projection.view, actorId = view.viewerId;
  const own = state.players.find(p => p.id === actorId)!, board = view.players.find(p => p.playerId === actorId)!;
  const opponent = view.players.find(p => p.playerId !== actorId)!;
  const actions: DuelAction[] = [];
  const resolve = (h: string) => projection.resolveCardHandle(h, state, actorId);
  const offer = (publicAction: DuelAction, action: EngineAction) => {
    if (applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action }).accepted) actions.push(publicAction);
  };
  offer({ type: 'concede' }, { type: 'concede' });
  offer({ type: 'pass' }, { type: 'pass' });
  for (const phase of ['draw', 'standby', 'main1', 'battle', 'main2', 'end'] as const)
    offer({ type: 'request-phase', phase }, { type: 'request-phase', phase });
  if (!state.result && !state.pendingDecision && state.turn.activePlayer === actorId && state.timing.window === 'open'
    && ['main1', 'main2'].includes(state.turn.phase)) {
    const monsters = board.monsters.filter(c => c !== null);
    for (const c of view.selfHand) {
      if (c.visibility !== 'known') continue;
      const def = registry.cards[c.definition.id]!, id = resolve(c.handle);
      if (def.kind === 'normal-monster' || def.kind === 'effect-monster') {
        const required = registry.rules.summons.tributesByLevel.find(r => def.level >= r.min && def.level <= r.max)!.count;
        const choices: string[][] = [];
        const choose = (start: number, selected: string[]) => {
          if (selected.length === required) { choices.push(selected); return; }
          for (let i = start; i < monsters.length; i++) choose(i + 1, [...selected, monsters[i]!.handle]);
        };
        choose(0, []);
        for (const tributeHandles of choices) for (let slot = 0; slot < 5; slot++) for (const type of ['normal-summon', 'set-monster'] as const)
          offer({ type, cardHandle: c.handle, slot: slot as Slot, tributeHandles }, { type, instanceId: id, slot, tributeIds: tributeHandles.map(resolve) });
      } else for (let slot = 0; slot < 5; slot++) {
        offer({ type: 'set-spell-trap', cardHandle: c.handle, zone: 'spell-trap', slot: slot as Slot },
          { type: def.kind === 'spell' ? 'set-spell' : 'set-trap', instanceId: id, slot });
        if (def.kind === 'spell') offer({ type: 'activate-spell', cardHandle: c.handle, slot: slot as Slot }, { type: 'activate-spell', instanceId: id, slot });
      }
    }
    for (const c of monsters) for (const type of ['flip-summon', 'change-position'] as const)
      offer({ type, cardHandle: c.handle }, { type, instanceId: resolve(c.handle) });
  }
  for (let slot = 0; slot < 5; slot++) {
    const c = board.spellsTraps[slot];
    if (!c || c.visibility !== 'known' || c.position !== 'face-down') continue;
    const id = own.spellsTraps[slot]!, def = registry.cards[state.cards[id]!.definition.id]!;
    if (def.kind === 'spell') offer({ type: 'activate-spell', cardHandle: c.handle, slot: slot as Slot }, { type: 'activate-spell', instanceId: id, slot });
    if (def.kind === 'trap') for (const target of opponent.monsters) {
      if (!target || target.visibility !== 'known' || target.position === 'face-down-defense') continue;
      offer({ type: 'activate-trap', cardHandle: c.handle, targetHandle: target.handle }, { type: 'activate-trap', instanceId: id, targetId: resolve(target.handle) });
    }
  }
  if (state.turn.phase === 'battle' && state.timing.window === 'open' && !state.pendingDecision) {
    const targets = opponent.monsters.filter(c => c !== null);
    for (const c of board.monsters) if (c) for (const target of targets.length ? targets.map(c => c.handle) : ['direct'])
      offer({ type: 'declare-attack', attackerHandle: c.handle, targetHandle: target }, { type: 'declare-attack', attackerId: resolve(c.handle), targetId: target === 'direct' ? target : resolve(target) });
  }
  return freeze(actions);
}
