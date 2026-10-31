import { expect } from 'vitest';
import { createDuel, applyAction, assertDuelInvariants } from '../../packages/engine/src/duel.js';
import type { Registry } from '../../packages/engine/src/registry.js';
import type { DuelState, Slot } from '../../packages/protocol/src/duel.js';
import type { EngineAction } from '../../packages/engine/src/actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
export function setupCounterPrefix(registry: Registry, rootDef = 'official:66788016', actor = 'a', selfMagic = false, selfSeven = false,
  phase: 'main1' | 'main2' = 'main1', fromSet = false, lp = 8000) {
  const act = (state: DuelState, actorId: string, action: EngineAction) => {
    const before=structuredClone(state),r=applyAction(registry,state,{actorId,expectedStateVersion:state.stateVersion,action});
    expect(state).toEqual(before);if(!r.accepted)throw new Error(r.message);assertDuelInvariants(r.state,registry);return r;
  };
  const other = actor === 'a' ? 'b' : 'a', magicOwner = selfMagic ? actor : other, sevenOwner = selfSeven ? magicOwner : (magicOwner === 'a' ? 'b' : 'a');
  const deck = [...Object.keys(registry.cards), 'official:05053103'];
  const initial = structuredClone(createDuel(registry, { duelId: 'counter-root', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: actor, seedHex: 'd1'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of initial.players) for (const id of p.hand.splice(0)) { p.deck.push(id); initial.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  initial.turn = { number: 3, activePlayer: actor, phase }; initial.timing = { ...initial.timing, window: 'open', priorityPlayer: actor, consecutivePasses: 0 };
  const move = (def: string, who: string, zone: 'hand' | 'monster' | 'graveyard' | 'spell-trap', slot: Slot = 0) => {
    const p = initial.players.find(p => p.id === who)!, id = p.deck.find(id => initial.cards[id]!.definition.id === def)!;
    if (!id) throw new Error('Missing definition ' + def); p.deck.splice(p.deck.indexOf(id), 1); const card = initial.cards[id]!;
    if (zone === 'monster' || zone === 'spell-trap') { (zone === 'monster' ? p.monsters : p.spellsTraps)[slot] = id; card.location = { kind: zone, playerId: who, slot }; card.position = zone === 'monster' ? 'face-up-attack' : 'face-down'; if (zone === 'spell-trap') card.markers.setOnTurn = 2; }
    else { p[zone].push(id); card.location = { kind: zone, playerId: who }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; } return id;
  };
  for (const p of initial.players) move('official:91152256', p.id, 'graveyard');
  const root = move(rootDef, actor, 'hand'), magic = move('official:77414722', magicOwner, 'spell-trap', 2), seven = move('official:03819470', sevenOwner, 'spell-trap', 4);
  const targets = [move('official:05053103', other, 'monster', 0), move('official:05053103', other, 'monster', 1)];
  const handler = registry.spellHandlers[rootDef]!.handler, hasCost = ['discard-destroy-target-monster', 'discard-return-own-graveyard-monster'].includes(handler);
  const rootCost = hasCost ? move('official:32274490', actor, 'hand') : undefined, magicCost = move('official:15025844', magicOwner, 'hand');
  initial.players.find(p => p.id === sevenOwner)!.lifePoints = lp;
  let state: DuelState = initial;
  if (fromSet) { state = act(state, actor, { type: 'set-spell', instanceId: root, slot: 0 }).state; while (state.timing.window !== 'open') state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state; }
  state = act(state, actor, { type: 'activate-spell', instanceId: root, slot: 0,
    ...(rootCost ? { discardId: rootCost } : {}), ...(hasCost || handler === 'target-opposing-attack-to-defense' ? { targetId: handler === 'discard-return-own-graveyard-monster' ? rootCost! : targets[0]! } : {}) }).state;
  if (state.timing.priorityPlayer !== magicOwner) state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  state = act(state, magicOwner, { type: 'activate-counter-trap', instanceId: magic, discardId: magicCost, respondingToLinkId: state.chain[0]!.id }).state;
  if (state.timing.priorityPlayer !== sevenOwner) state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  return {state,rootDef,actor,other,magicOwner,sevenOwner,root,magic,seven,rootCost,magicCost,targets};
}
