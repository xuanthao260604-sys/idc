/** Pure resolution plans. Not an activation API or a substitute for Chain/timing checks. */
import { z } from 'zod';
import { freeze } from './registry.js';
import { SpellHandlerSchema } from './spell-review.js';

const Request = SpellHandlerSchema;
const Board = z.strictObject({
  controllerId: z.string().min(1),
  // Effective ATK/DEF at resolution, supplied by the trusted engine, never stats/positions from client.
  monsters: z.array(z.strictObject({
    instanceId: z.string().min(1), controllerId: z.string().min(1),
    faceUp: z.boolean(), attack: z.number().int().nonnegative().safe(),
    position: z.enum(['face-up-attack', 'face-up-defense', 'face-down-defense']).optional(),
    defense: z.number().int().nonnegative().safe().optional(),
  })),
}).superRefine((board, ctx) => {
  for (const m of board.monsters) if (m.position !== undefined && m.faceUp !== (m.position !== 'face-down-defense'))
    ctx.addIssue({ code: 'custom', message: 'Inconsistent monster visibility and position' });
  if (new Set(board.monsters.map(m => m.instanceId)).size !== board.monsters.length)
    ctx.addIssue({ code: 'custom', message: 'Duplicate monster instance' });
});
export type ResolutionPlan =
  | { readonly kind: 'draw'; readonly playerId: string; readonly count: number }
  | { readonly kind: 'effect-damage'; readonly controllerId: string; readonly amount: number }
  | { readonly kind: 'life-points-gained'; readonly playerId: string; readonly amount: number }
  | { readonly kind: 'no-op' }
  | { readonly kind: 'change-all-to-defense'; readonly instanceIds: readonly string[] }
  | { readonly kind: 'change-selected-monster-to-defense' }
  | { readonly kind: 'destroy-selected-monster' }
  | { readonly kind: 'return-selected-graveyard-monster' }
  | { readonly kind: 'destroy'; readonly instanceId: string }
  | { readonly kind: 'choose-destruction'; readonly playerId: string; readonly optionIds: readonly string[] };

/** Inspect the current board when this link resolves, not when it was activated.
 * No card names, passcodes or description interpretation occur in a handler.
 * Caller applies draws one by one (including required-draw loss) and destruction through
 * the event/replacement pipeline. A choice pauses this same resolution, not a new Chain.
 */
export function planResolution(requestInput: unknown, boardInput: unknown): ResolutionPlan {
  const request = Request.parse(requestInput);
  const board = Board.parse(boardInput);
  if (request.handler === 'all-face-up-attack-to-defense') {
    if (board.monsters.some(m => m.faceUp && m.position === undefined)) throw new Error('Missing monster position');
    const instanceIds = board.monsters.filter(m => m.faceUp && m.position === 'face-up-attack').map(m => m.instanceId);
    return freeze(instanceIds.length ? { kind: 'change-all-to-defense', instanceIds } : { kind: 'no-op' });
  }
  if (request.handler === 'target-opposing-attack-to-defense') return freeze({ kind: 'change-selected-monster-to-defense' });
  if (request.handler === 'discard-return-own-graveyard-monster') return freeze({ kind: 'return-selected-graveyard-monster' });
  if (request.handler === 'discard-destroy-target-monster') return freeze({ kind: 'destroy-selected-monster' });
  if (request.handler === 'draw')
    return freeze({ kind: 'draw', playerId: board.controllerId, count: request.count });
  if (request.handler === 'inflict-damage') return freeze({ kind: 'effect-damage', controllerId: board.controllerId, amount: request.amount });
  if (request.handler === 'gain-life-points') return freeze({ kind: 'life-points-gained', playerId: board.controllerId, amount: request.amount });
  const byAttackPosition = request.handler === 'destroy-highest-face-up-attack-position';
  if (byAttackPosition && board.monsters.some(m => m.faceUp && m.position === undefined)) throw new Error('Missing monster position');
  const candidates = board.monsters.filter(m => m.faceUp && (byAttackPosition
    ? m.position === 'face-up-attack'
    : m.controllerId !== board.controllerId));
  if (candidates.length === 0) return freeze({ kind: 'no-op' });
  const byDefense = request.handler === 'destroy-highest-opposing-face-up-defense';
  if (byDefense && candidates.some(m => m.defense === undefined)) throw new Error('Missing effective DEF');
  const stat = (m: (typeof candidates)[number]) => byDefense ? m.defense! : m.attack;
  const selected = byDefense || byAttackPosition ? Math.max(...candidates.map(stat)) : Math.min(...candidates.map(stat));
  const optionIds = candidates.filter(m => stat(m) === selected).map(m => m.instanceId);
  if (optionIds.length === 1) return freeze({ kind: 'destroy', instanceId: optionIds[0]! });
  return freeze({ kind: 'choose-destruction', playerId: board.controllerId, optionIds });
}

/** Server validates the pending decision ID/actor/version before calling this helper. */
export function chooseDestruction(plan: Extract<ResolutionPlan, { kind: 'choose-destruction' }>, instanceId: string): ResolutionPlan {
  if (!plan.optionIds.includes(instanceId)) throw new Error('Choice is not an eligible destruction candidate');
  return freeze({ kind: 'destroy', instanceId });
}
