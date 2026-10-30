import { createHash } from 'node:crypto';
import type { DuelState } from '../../protocol/src/duel.js';

/** Server-only board binding shared by paused effects and cleanup. Not authentication.
 * Context/decision/version fields are excluded so the frame does not hash itself.
 * The command adapter must still validate viewer/version-bound handles.
 */
export function resolutionFingerprint(state: DuelState): string {
  return createHash('sha256').update(JSON.stringify({ id: state.id, format: state.format,
    registryRevision: state.cardRegistryRevision, turn: state.turn, result: state.result,
    chain: state.chain, battle: state.battle, players: state.players, cards: state.cards })).digest('hex');
}
