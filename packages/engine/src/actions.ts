import { z } from 'zod';

const instance = z.string().min(1);
const slot = z.number().int().min(0).max(4);
export const ActionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('normal-summon'), instanceId: instance, slot, tributeIds: z.array(instance).max(5) }),
  z.strictObject({ type: z.literal('set-monster'), instanceId: instance, slot, tributeIds: z.array(instance).max(5) }),
  z.strictObject({ type: z.literal('set-trap'), instanceId: instance, slot }),
  z.strictObject({ type: z.literal('activate-trap'), instanceId: instance, targetId: instance }),
  z.strictObject({ type: z.literal('activate-spell'), instanceId: instance, slot }),
  z.strictObject({ type: z.literal('set-spell'), instanceId: instance, slot }),
  z.strictObject({ type: z.literal('flip-summon'), instanceId: instance }),
  z.strictObject({ type: z.literal('change-position'), instanceId: instance }),
  z.strictObject({ type: z.literal('declare-attack'), attackerId: instance, targetId: instance }), // 'direct' is reserved.
  z.strictObject({ type: z.literal('request-phase'), phase: z.enum(['draw', 'standby', 'main1', 'battle', 'main2', 'end']) }),
  z.strictObject({ type: z.literal('answer-decision'), decisionId: instance, optionIds: z.array(instance) }),
  z.strictObject({ type: z.literal('pass') }),
  z.strictObject({ type: z.literal('concede') }),
]);
export const RequestSchema = z.strictObject({ actorId: instance, expectedStateVersion: z.number().int().nonnegative(), action: ActionSchema });
export type EngineAction = z.infer<typeof ActionSchema>;
export type EngineRequest = z.infer<typeof RequestSchema>;
export type RejectionCode = 'invalid-action' | 'invalid-player' | 'stale-state' | 'duel-ended' | 'not-your-action'
  | 'illegal-timing' | 'invalid-target' | 'invalid-choice' | 'quota-used' | 'unpayable-tribute' | 'occupied-zone' | 'invalid-position';
export class RuleError extends Error {
  constructor(readonly code: RejectionCode, message: string) { super(message); }
}
export function requireRule(condition: unknown, code: RejectionCode, message: string): asserts condition {
  if (!condition) throw new RuleError(code, message);
}
