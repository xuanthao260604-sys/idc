import type { DuelState } from '../../protocol/src/duel.js';
import type { PublicResolution } from '../../protocol/src/commands.js';
import type { EngineEvent } from './duel.js';
import { freeze } from './registry.js';

/** Explicit public facts only, never serialize an event, card identity, target or source snapshot.
 * Counts summarize this accepted command; aggregation does not assert simultaneous game timing.
 */
export function publicResolution(events: readonly EngineEvent[], after: DuelState): readonly PublicResolution[] {
  const result: PublicResolution[] = [];
  const player = (id: unknown): id is string => typeof id === 'string' && after.players.some(p => p.id === id);
  const add = (fact: PublicResolution) => {
    const last = result.at(-1);
    if (last && last.kind === fact.kind && 'count' in last && 'count' in fact
      && (!('playerId' in last) || ('playerId' in fact && last.playerId === fact.playerId))) {
      last.count += fact.count;
    } else result.push(fact);
  };
  for (const event of events) {
    const count = new Set(event.affectedInstances).size;
    const playerId = event.details.playerId;
    if (event.kind === 'card-drawn' && count && player(playerId)) add({ kind: 'draw', playerId, count });
    else if ((event.kind === 'battle-damage' || event.kind === 'effect-damage' || event.kind === 'life-points-gained') && player(playerId) && typeof event.details.amount === 'number'
      && Number.isSafeInteger(event.details.amount) && event.details.amount > 0) add({ kind: event.kind, playerId, amount: event.details.amount });
    else if (event.kind === 'position-changed' && event.details.reason === 'effect' && count) add({ kind: 'effect-position-changed', count });
    else if (event.kind === 'effect-destroyed' && count) add({ kind: 'effect-destroyed', count });
    else if (event.kind === 'battle-destroyed' && count) add({ kind: 'battle-destroyed', count });
    else if (event.kind === 'cards-discarded' && count && player(playerId)) add({ kind: event.details.reason === 'activation-cost' ? 'discard-cost' : 'discard', playerId, count });
    else if (event.kind === 'monsters-tributed' && count && player(playerId)) add({ kind: 'tribute', playerId, count });
    else if (event.kind === 'returned-to-hand') {
      const owners = new Map<string, number>();
      for (const id of new Set(event.affectedInstances)) {
        const owner = after.cards[id]?.ownerId;
        if (player(owner)) owners.set(owner, (owners.get(owner) ?? 0) + 1);
      }
      for (const [owner, count] of owners) add({ kind: 'return-to-hand', playerId: owner, count });
    }
  }
  return freeze(result);
}
