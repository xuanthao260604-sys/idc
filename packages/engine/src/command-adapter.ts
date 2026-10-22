import { z } from 'zod';
import { publicResolution } from './public-resolution.js';
import { availableActions } from './available-actions.js';
import type { DuelState } from '../../protocol/src/duel.js';
import type { CommandOutcome, PublicActivity, DuelClientView } from '../../protocol/src/commands.js';
import type { Registry } from './registry.js';
import type { EngineAction } from './actions.js';
import { RuleError } from './actions.js';
import { applyAction, assertDuelInvariants } from './duel.js';
import { createPlayerProjection } from './player-view.js';
import { freeze } from './registry.js';

const token = z.string().min(1).max(128);
const slot = z.number().int().min(0).max(4);
const ClientAction = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('normal-summon'), cardHandle: token, slot, tributeHandles: z.array(token).max(5) }),
  z.strictObject({ type: z.literal('set-monster'), cardHandle: token, slot, tributeHandles: z.array(token).max(5) }),
  z.strictObject({ type: z.literal('set-spell-trap'), cardHandle: token, zone: z.enum(['field', 'spell-trap']), slot: slot.nullable() }),
  z.strictObject({ type: z.literal('change-position'), cardHandle: token }),
  z.strictObject({ type: z.literal('flip-summon'), cardHandle: token }),
  z.strictObject({ type: z.literal('activate-spell'), cardHandle: token, slot, discardHandle: token.optional(), targetHandle: token.optional() }),
  z.strictObject({ type: z.literal('activate-trap'), cardHandle: token, targetHandle: token }),
  z.strictObject({ type: z.literal('declare-attack'), attackerHandle: token, targetHandle: token }),
  z.strictObject({ type: z.literal('answer-decision'), decisionId: token, optionIds: z.array(token).max(80) }),
  z.strictObject({ type: z.literal('request-phase'), phase: z.enum(['draw', 'standby', 'main1', 'battle', 'main2', 'end']) }),
  z.strictObject({ type: z.literal('pass') }), z.strictObject({ type: z.literal('concede') }),
]);
export const ClientCommandSchema = z.strictObject({
  commandId: token, duelId: token, expectedStateVersion: z.number().int().nonnegative().safe(), action: ClientAction,
});

/** In-memory synchronous adapter, not authentication or an HTTP/Socket server.
 * actorId must come from the trusted session. Only views and sanitized receipts leave this API.
 * Keep one adapter per duel; do not recreate it per request (that would lose dedup receipts).
 */
export function createCommandAdapter(registry: Registry, initialState: DuelState, receiptLimit = 10000) {
  assertDuelInvariants(initialState, registry);
  if (!Number.isSafeInteger(receiptLimit) || receiptLimit < 1) throw new Error('Invalid receipt limit');
  // Take ownership of a frozen copy even if the trusted caller supplied a mutable fixture.
  let state = freeze(structuredClone(initialState));
  const projections = new Map<string, ReturnType<typeof createPlayerProjection>>();
  const actionCache = new Map<string, { projection: ReturnType<typeof createPlayerProjection>; actions: ReturnType<typeof availableActions> }>();
  const receipts = new Map<string, Map<string, { payload: string; outcome: CommandOutcome }>>();
  let receiptCount = 0;
  const activity: PublicActivity[] = [];
  const participant = (actor: string) => state.players.some(p => p.id === actor);
  const projection = (actor: string) => {
    if (!participant(actor)) throw new Error('Not a duel participant');
    let p = projections.get(actor);
    if (!p) { p = createPlayerProjection(registry, state, actor); projections.set(actor, p); }
    return p;
  };
  const reject = (commandId: string, reason: Extract<CommandOutcome, { accepted: false }>['reason']): CommandOutcome =>
    freeze({ accepted: false, commandId, stateVersion: state.stateVersion, reason });
  const publicView = (actorId: string, includeActions = false): DuelClientView => {
    const p = projection(actorId);
    if (!includeActions) return freeze({ ...p.view, activity: [...activity] });
    let cached = actionCache.get(actorId);
    if (!cached || cached.projection !== p) { cached = { projection: p, actions: availableActions(registry, state, p) }; actionCache.set(actorId, cached); }
    return freeze({ ...p.view, activity: [...activity], availableActions: cached.actions });
  };
  return Object.freeze({
    getView(actorId: string, includeActions = false) { return publicView(actorId, includeActions); },
    /** Trusted reconnect operation: rotates only this player's handles. Not session verification. */
    refreshView(actorId: string, includeActions = false) {
      if (!participant(actorId)) throw new Error('Not a duel participant');
      projections.delete(actorId); actionCache.delete(actorId); return publicView(actorId, includeActions);
    },
    submit(actorId: string, input: unknown): CommandOutcome {
      if (!participant(actorId)) return reject('', 'invalid-player');
      const parsed = ClientCommandSchema.safeParse(input);
      if (!parsed.success) return reject('', 'invalid-action');
      const cmd = parsed.data, payload = JSON.stringify(cmd);
      const previous = receipts.get(actorId)?.get(cmd.commandId);
      if (previous) return previous.payload === payload ? previous.outcome : reject(cmd.commandId, 'command-conflict');
      // Do not evict receipts: replay protection must not expire silently within a duel.
      if (receiptCount >= receiptLimit) return reject(cmd.commandId, 'command-capacity');
      let outcome: CommandOutcome | undefined;
      if (cmd.duelId !== state.id) outcome = reject(cmd.commandId, 'wrong-duel');
      else if (cmd.expectedStateVersion !== state.stateVersion) outcome = reject(cmd.commandId, 'stale-state');
      else {
        const p = projection(actorId);
        const resolve = (h: string) => {
          try { return p.resolveCardHandle(h, state, actorId); }
          catch { throw new RuleError('invalid-target', 'Invalid handle'); }
        };
        let action: EngineAction | undefined;
        try {
          const a = cmd.action;
          switch (a.type) {
            case 'normal-summon': case 'set-monster':
              action = { type: a.type, instanceId: resolve(a.cardHandle), slot: a.slot, tributeIds: a.tributeHandles.map(resolve) }; break;
            case 'change-position': case 'flip-summon': action = { type: a.type, instanceId: resolve(a.cardHandle) }; break;
            case 'activate-spell': action = { type: a.type, instanceId: resolve(a.cardHandle), slot: a.slot,
              ...(a.discardHandle !== undefined ? { discardId: resolve(a.discardHandle) } : {}),
              ...(a.targetHandle !== undefined ? { targetId: resolve(a.targetHandle) } : {}) }; break;
            case 'activate-trap': action = { type: a.type, instanceId: resolve(a.cardHandle), targetId: resolve(a.targetHandle) }; break;
            case 'set-spell-trap': {
              if (a.zone !== 'spell-trap' || a.slot === null) throw new RuleError('invalid-action', 'Unsupported zone');
              const instanceId = resolve(a.cardHandle), kind = registry.cards[state.cards[instanceId]!.definition.id]!.kind;
              if (kind !== 'spell' && kind !== 'trap') throw new RuleError('invalid-target', 'Not Spell/Trap');
              action = { type: kind === 'spell' ? 'set-spell' : 'set-trap', instanceId, slot: a.slot }; break;
            }
            case 'declare-attack': action = { type: a.type, attackerId: resolve(a.attackerHandle), targetId: a.targetHandle === 'direct' ? 'direct' : resolve(a.targetHandle) }; break;
            case 'answer-decision': {
              try { action = { type: a.type, ...p.resolveDecision(a.decisionId, a.optionIds, state, actorId) }; }
              catch { throw new RuleError('invalid-choice', 'Invalid decision handle'); }
              break;
            }
            case 'request-phase': action = { type: a.type, phase: a.phase }; break;
            case 'pass': case 'concede': action = { type: a.type }; break;
          }
        } catch (error) {
          if (!(error instanceof RuleError)) throw error;
          outcome = reject(cmd.commandId, error.code);
        }
        if (action) {
          const actionTurn = state.turn;
          const result = applyAction(registry, state, { actorId, expectedStateVersion: cmd.expectedStateVersion, action });
          if (result.accepted) {
            state = result.state; projections.clear(); actionCache.clear();
            const resolution = publicResolution(result.events, state);
            activity.push(freeze({ ...(resolution.length ? { resolution } : {}), stateVersion: state.stateVersion, actorId, turn: actionTurn.number, phase: actionTurn.phase, action: cmd.action.type }));
            if (activity.length > 60) activity.shift();
            outcome = freeze({ accepted: true, commandId: cmd.commandId, stateVersion: state.stateVersion });
          } else outcome = reject(cmd.commandId, result.code);
        }
      }
      if (!outcome) throw new Error('Command translation produced no outcome');
      const final = outcome;
      let playerReceipts = receipts.get(actorId);
      if (!playerReceipts) { playerReceipts = new Map(); receipts.set(actorId, playerReceipts); }
      playerReceipts.set(cmd.commandId, { payload, outcome: final }); receiptCount++;
      return final;
    },
  });
}
