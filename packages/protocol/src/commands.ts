import type { Phase, Slot, PlayerView } from './duel.js';

/** Client intent, not an instruction to trust or mutate state without server validation. */
export type DuelAction =
  | { type: 'normal-summon'; cardHandle: string; slot: Slot; tributeHandles: readonly string[] }
  | { type: 'set-monster'; cardHandle: string; slot: Slot; tributeHandles: readonly string[] }
  | { type: 'set-spell-trap'; cardHandle: string; zone: 'field' | 'spell-trap'; slot: Slot | null }
  | { type: 'change-position'; cardHandle: string }
  | { type: 'flip-summon'; cardHandle: string }
  | { type: 'declare-attack'; attackerHandle: string; targetHandle: string | 'direct' }
  | { type: 'activate-spell'; cardHandle: string; slot: Slot }
  | { type: 'activate-trap'; cardHandle: string; targetHandle: string }
  | { type: 'answer-decision'; decisionId: string; optionIds: readonly string[] }
  | { type: 'pass' }
  | { type: 'request-phase'; phase: Phase }
  | { type: 'concede' };

export interface DuelCommand {
  commandId: string;
  duelId: string;
  expectedStateVersion: number;
  action: DuelAction;
  // No playerId, damage, winner, resulting state or executable effect payload from client.
}
export type CommandOutcome =
  | { accepted: true; commandId: string; stateVersion: number }
  | { accepted: false; commandId: string; stateVersion: number;
      reason: 'stale-state' | 'not-your-action' | 'invalid-choice' | 'invalid-target'
        | 'unpayable-cost' | 'unsupported-effect' | 'illegal-timing' | 'duel-ended'
        | 'invalid-action' | 'invalid-player' | 'quota-used' | 'unpayable-tribute' | 'occupied-zone' | 'invalid-position'
        | 'wrong-duel' | 'command-conflict' | 'command-capacity' };

export type PublicResolution =
  | { kind: 'draw' | 'return-to-hand' | 'discard' | 'tribute'; playerId: string; count: number }
  | { kind: 'battle-damage' | 'effect-damage' | 'life-points-gained'; playerId: string; amount: number }
  | { kind: 'effect-destroyed' | 'battle-destroyed'; count: number };

/** Public action summaries only; never raw engine events or private card references. */
export interface PublicActivity {
  stateVersion: number;
  actorId: string;
  turn: number;
  phase: Phase;
  action: DuelAction['type'];
  resolution?: readonly PublicResolution[];
}

export interface DuelClientView extends PlayerView {
  readonly activity: readonly PublicActivity[];
  readonly availableActions?: readonly DuelAction[];
}
