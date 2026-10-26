import { randomBytes } from 'node:crypto';
import type { DuelState, PlayerView, VisibleCard, FiveSlots } from '../../protocol/src/duel.js';
import { assertDuelInvariants } from './duel.js';
import { freeze } from './registry.js';
import type { Registry } from './registry.js';

/** Server-only envelope. Send .view, never raw state/events or the envelope to a client.
 * Handles belong to one viewer and one state version, and are regenerated on every projection.
 * Session authentication and transport parsing remain the adapter's responsibility.
 */
export function createPlayerProjection(registry: Registry, state: DuelState, viewerId: string) {
  assertDuelInvariants(state, registry);
  if (!state.players.some(p => p.id === viewerId)) throw new Error('Viewer is not a duel participant');
  const cardToHandle = new Map<string, string>(), handleToCard = new Map<string, string>();
  const token = () => randomBytes(24).toString('base64url');
  const handle = (id: string) => {
    let value = cardToHandle.get(id);
    if (!value) { value = token(); cardToHandle.set(id, value); handleToCard.set(value, id); }
    return value;
  };
  const visible = (id: string): VisibleCard => {
    const card = state.cards[id]!;
    const faceDown = card.position === 'face-down' || card.position === 'face-down-defense';
    const own = card.controllerId === viewerId;
    if (faceDown && !own) return { visibility: 'hidden', handle: handle(id), position: card.position as 'face-down' | 'face-down-defense' };
    return { visibility: 'known', handle: handle(id), definition: { ...card.definition }, position: card.position };
  };
  const slots = (ids: FiveSlots<string>): FiveSlots<VisibleCard> => ids.map(id => id === null ? null : visible(id)) as unknown as FiveSlots<VisibleCard>;
  const self = state.players.find(p => p.id === viewerId)!, opponent = state.players.find(p => p.id !== viewerId)!;
  // Explicit allowlist; no spread from CardInstance, PlayerState, timing, ChainLink or DuelState.
  const players = state.players.map(p => ({ playerId: p.id, lifePoints: p.lifePoints, deckCount: p.deck.length,
    fusionDeckCount: p.fusionDeck.length, monsters: slots(p.monsters), spellsTraps: slots(p.spellsTraps),
    field: p.field === null ? null : visible(p.field), graveyard: p.graveyard.map(visible), banished: p.banished.map(visible) }));
  const selfHand = self.hand.map(visible);
  const pending = state.pendingDecision?.playerId === viewerId ? state.pendingDecision : null;
  const decisionToken = pending ? token() : null;
  const decision = pending ? { id: decisionToken!, kind: pending.kind, optionIds: pending.optionIds.map(id => {
    if (!cardToHandle.has(id)) throw new Error('Decision option has no supported visible card representation');
    return handle(id);
  }), min: pending.min, max: pending.max } : null;
  const publicHandle = (id: string): string => {
    const value = cardToHandle.get(id);
    if (!value) throw new Error('Unsupported reference outside visible zones');
    return value;
  };
  const active = state.players.find(p => p.id === state.turn.activePlayer)!;
  const limit = registry.rules.summons.normalSummonOrSetQuota;
  const ownMonsterActivity = self.monsters.flatMap(id => {
    if (id === null) return [];
    const markers = state.cards[id]!.markers;
    return [{ cardHandle: handle(id),
      summonedOrSetThisTurn: markers.summonedOnTurn === state.turn.number || markers.setOnTurn === state.turn.number,
      positionChangedThisTurn: markers.manuallyChangedOnTurn === state.turn.number,
      attackDeclaredThisTurn: markers.attackDeclarationsThisTurn > 0 }];
  });
  const view: PlayerView = freeze({ duelId: state.id, stateVersion: state.stateVersion, viewerId,
    turn: { ...state.turn }, normalSummonQuota: { playerId: active.id, used: active.normalSummonsOrSetsUsed, limit, remaining: Math.max(0, limit - active.normalSummonsOrSetsUsed) }, ownMonsterActivity, selfHand, opponentHandCount: opponent.hand.length, players, decision,
    // A mandatory decision suspends response actions, even if the internal phase retains priority.
    timing: { window: state.timing.window, priorityPlayer: state.pendingDecision ? null : state.timing.priorityPlayer },
    chain: state.chain.map(link => ({ controllerId: link.controllerId, sourceHandle: publicHandle(link.source),
      targetHandles: link.targetRefs.map(ref => publicHandle(ref.instanceId)), spellSpeed: link.spellSpeed })),
    battle: state.battle ? { step: state.battle.step, damageTiming: state.battle.damageTiming,
      attackerHandle: state.battle.attacker ? publicHandle(state.battle.attacker) : null,
      targetHandle: state.battle.target === 'direct' ? 'direct' : state.battle.target ? publicHandle(state.battle.target) : null } : null,
    result: state.result ? { ...state.result } : null });
  const requireCurrent = (current: DuelState, actorId: string) => {
    if (actorId !== viewerId || current.id !== state.id || current.stateVersion !== state.stateVersion
      || current.cardRegistryRevision !== state.cardRegistryRevision) throw new Error('Wrong viewer or stale projection');
  };
  return Object.freeze({ view,
    resolveCardHandle(value: string, current: DuelState, actorId: string): string {
      requireCurrent(current, actorId);
      const id = handleToCard.get(value);
      if (!id) throw new Error('Unknown card handle');
      return id;
    },
    resolveDecision(value: string, optionHandles: readonly string[], current: DuelState, actorId: string) {
      requireCurrent(current, actorId);
      if (!pending || value !== decisionToken || current.pendingDecision?.id !== pending.id) throw new Error('Unknown decision handle');
      const optionIds = optionHandles.map(h => {
        const id = handleToCard.get(h);
        if (!id || !pending.optionIds.includes(id)) throw new Error('Unknown decision option');
        return id;
      });
      // Count/distinctness/timing also validated by applyAction. Never return a new game state here.
      return { decisionId: pending.id, optionIds };
    },
  });
}
