export { createRegistry, validateDeck } from './registry.js';
export type { Registry, NormalCard } from './registry.js';
export { createDuel, applyAction, assertDuelInvariants } from './duel.js';
export type { ActionResult, EngineEvent } from './duel.js';
export type { EngineAction, EngineRequest, RejectionCode } from './actions.js';

export { SpellReviewsSchema, definitionFingerprint } from './spell-review.js';
export type { SpellHandler } from './spell-review.js';
export { FlipReviewsSchema } from './flip-review.js';
export type { SupportedMonster } from './registry.js';
export { TrapReviewsSchema } from './trap-review.js';
export { createPlayerProjection } from './player-view.js';
export { createCommandAdapter, ClientCommandSchema } from './command-adapter.js';
