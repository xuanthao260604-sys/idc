/** Shared server-state contract; never serialize DuelState directly to a player. */
export type PlayerId = string;
export type InstanceId = string;
export type Phase = 'draw' | 'standby' | 'main1' | 'battle' | 'main2' | 'end';
export type DamageTiming = 'start' | 'before-calculation' | 'calculation-1'
  | 'calculation-2' | 'after-calculation' | 'end';
export type Position = 'face-up-attack' | 'face-up-defense' | 'face-down-defense';
export type Slot = 0 | 1 | 2 | 3 | 4;
export type FiveSlots<T> = readonly [T | null, T | null, T | null, T | null, T | null];
export type Location =
  | { kind: 'deck' | 'hand' | 'graveyard' | 'banished' | 'fusion-deck'; playerId: PlayerId }
  | { kind: 'monster' | 'spell-trap'; playerId: PlayerId; slot: Slot }
  | { kind: 'field'; playerId: PlayerId }
  | { kind: 'trap-monster'; playerId: PlayerId; monsterSlot: Slot; spellTrapSlot: Slot };

export interface DefinitionRef { id: string; revision: number }
export interface CardInstance {
  id: InstanceId;
  definition: DefinitionRef;
  ownerId: PlayerId;
  controllerId: PlayerId;
  location: Location;
  position: Position | 'face-down' | 'face-up';
  counters: Readonly<Record<string, number>>;
  markers: {
    summonedOnTurn: number | null;
    summonedBy: PlayerId | null;
    setOnTurn: number | null;
    manuallyChangedOnTurn: number | null;
    attackDeclarationsThisTurn: number;
    attackCountConsumedThisTurn: number; // Replay can redeclare without losing its historical allowance.
    wasBattleDestroyed: boolean;
  };
}
export interface PlayerState {
  id: PlayerId;
  lifePoints: number;
  deck: readonly InstanceId[]; // Top at index 0. Server-only ordered list.
  hand: readonly InstanceId[];
  monsters: FiveSlots<InstanceId>;
  spellsTraps: FiveSlots<InstanceId>;
  field: InstanceId | null;
  graveyard: readonly InstanceId[];
  banished: readonly InstanceId[];
  fusionDeck: readonly InstanceId[];
  normalSummonsOrSetsUsed: number;
}
export interface EventRef {
  details?: Readonly<Record<string, string | number | boolean>>; // Semantic event facts retained for response eligibility.
  sequence: number; // Total event order, including cost/tribute events before a summon.
  simultaneousGroup: string; // Events truly simultaneous share a group.
  kind: string;
  affectedInstances: readonly InstanceId[];
}
export interface PendingTrigger {
  source: InstanceId;
  sourceAtTrigger: Readonly<CardInstance>;
  effectId: string;
  controllerAtTrigger: PlayerId;
  occurrence: EventRef;
  mandatory: boolean;
  timingPolicy: 'mandatory' | 'optional-when' | 'reviewed-special';
}
export interface ChainLink {
  id: string;
  controllerId: PlayerId;
  source: InstanceId;
  sourceAtActivation: Readonly<CardInstance>;
  effectId: string;
  spellSpeed: 1 | 2 | 3;
  costEvents: readonly EventRef[];
  targetRefs: readonly { instanceId: InstanceId; locationAtSelection: Location }[];
  activationNegated: boolean;
  effectNegated: boolean;
}
export interface Modifier {
  id: string;
  sourceInstance: InstanceId;
  handlerId: string;
  affectedInstances: readonly InstanceId[];
  parameters: Readonly<Record<string, string | number | boolean>>;
  dependency: 'source-face-up' | 'independent-after-resolution' | 'reviewed-special';
  expiresAt: { turn: number; phase: Phase; boundary: 'during' | 'end' } | null;
}
export interface DuelState {
  id: string;
  format: DefinitionRef;
  cardRegistryRevision: string;
  stateVersion: number;
  eventSequence: number;
  turn: { number: number; activePlayer: PlayerId; phase: Phase };
  players: readonly [PlayerState, PlayerState];
  cards: Readonly<Record<InstanceId, CardInstance>>;
  chain: readonly ChainLink[];
  pendingTriggers: readonly PendingTrigger[];
  modifiers: readonly Modifier[];
  timing: {
    window: 'open' | 'action-response' | 'summon-negation' | 'summon-response' | 'trigger-order'
      | 'chain-response' | 'resolving' | 'post-chain' | 'phase-exit' | 'damage';
    priorityPlayer: PlayerId | null;
    consecutivePasses: 0 | 1 | 2;
    lastRelevantEvents: readonly EventRef[];
    requestedPhase: Phase | null;
  };
  battle: {
    step: 'start' | 'battle' | 'damage' | 'end';
    attacker: InstanceId | null;
    target: InstanceId | 'direct' | null;
    damageTiming: DamageTiming | null;
    ordinaryDamageChainUsed: boolean;
    replayPending: boolean;
  } | null;
  pendingDecision: {
    id: string; playerId: PlayerId; kind: 'cost' | 'target' | 'trigger-order' | 'effect-choice' | 'discard';
    optionIds: readonly string[]; min: number; max: number;
  } | null;
  rng: { algorithm: string; privateState: string }; // Never include in a player view.
  result: { winner: PlayerId | null; reason: 'life-points' | 'failed-draw' | 'effect' | 'concession' | 'simultaneous-loss' } | null;
}

/** Server-issued handles must not expose stable hidden instance IDs across shuffle/hide events. */
export type VisibleCard =
  | { visibility: 'known'; handle: string; definition: DefinitionRef; position: CardInstance['position'] }
  | { visibility: 'hidden'; handle: string; position: 'face-down' | 'face-down-defense' };
export interface PlayerView {
  duelId: string;
  stateVersion: number;
  viewerId: PlayerId;
  turn: DuelState['turn'];
  /** Response priority is suspended (null) while a mandatory decision is pending. */
  timing: { window: DuelState['timing']['window']; priorityPlayer: PlayerId | null };
  chain: readonly { controllerId: PlayerId; sourceHandle: string; targetHandles: readonly string[]; spellSpeed: 1 | 2 | 3 }[];
  battle: { step: NonNullable<DuelState['battle']>['step']; damageTiming: DamageTiming | null; attackerHandle: string | null; targetHandle: string | 'direct' | null } | null;
  selfHand: readonly VisibleCard[];
  opponentHandCount: number;
  players: readonly {
    playerId: PlayerId; lifePoints: number; deckCount: number; fusionDeckCount: number;
    monsters: FiveSlots<VisibleCard>; spellsTraps: FiveSlots<VisibleCard>;
    field: VisibleCard | null; graveyard: readonly VisibleCard[]; banished: readonly VisibleCard[];
  }[];
  decision: { id: string; kind: string; optionIds: readonly string[]; min: number; max: number } | null;
  result: DuelState['result'];
}
