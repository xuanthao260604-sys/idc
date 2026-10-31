import { createDuel, assertDuelInvariants } from '../../packages/engine/src/duel.js';
import type { Registry } from '../../packages/engine/src/registry.js';
import type { DuelState, Slot } from '../../packages/protocol/src/duel.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

/** Trusted setup ONLY. No state edits are needed after the first gameplay action.
 * Card definitions, effects and stats come from the unchanged reviewed catalog.
 */
export function setupThreeLinkInteractions(registry: Registry, actor = 'a', selfMagic = false, selfSeven = true) {
  const other = actor === 'a' ? 'b' : 'a', magicOwner = selfMagic ? actor : other;
  const sevenOwner = selfSeven ? actor : other, burner = sevenOwner === actor ? other : actor;
  const deck = [...Object.keys(registry.cards), 'official:77414722', 'official:03819470', 'official:19523799'];
  const state = structuredClone(createDuel(registry, { duelId: 'three-link-interactions', players: [{ id: 'a', deck }, { id: 'b', deck }],
    firstPlayerId: actor, seedHex: 'd2'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) { p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  state.turn = { number: 3, activePlayer: actor, phase: actor === 'a' ? 'main1' : 'main2' };
  state.timing = { ...state.timing, window: 'open', priorityPlayer: actor, consecutivePasses: 0 };
  const move = (name: string, who: string, zone: 'hand' | 'graveyard' | 'spell-trap', slot: Slot = 0) => {
    const p = state.players.find(p => p.id === who)!, def = Object.values(registry.cards).find(c => c.name === name)!;
    const id = p.deck.find(id => state.cards[id]!.definition.id === def.id)!;
    if (!id) throw new Error('Missing fixture card ' + name); p.deck.splice(p.deck.indexOf(id), 1);
    const card = state.cards[id]!; card.position = zone === 'graveyard' ? 'face-up' : 'face-down';
    if (zone === 'spell-trap') { p.spellsTraps[slot] = id; card.location = { kind: zone, playerId: who, slot }; card.markers.setOnTurn = 2; }
    else { p[zone].push(id); card.location = { kind: zone, playerId: who }; } return id;
  };
  for (const p of state.players) move('Celtic Guardian', p.id, 'graveyard');
  const faith = move('Magician of Faith', actor, 'graveyard'), root = move('Monster Reincarnation', actor, 'hand');
  const firstCost = move('Ookazi', actor, 'hand'), secondCost = move('Skull Servant', actor, 'hand');
  const heal = move('Dian Keto the Cure Master', sevenOwner, 'hand'), lateBurn = move('Ookazi', burner, 'hand');
  const magic1 = move('Magic Jammer', magicOwner, 'spell-trap', 2), magic2 = move('Magic Jammer', magicOwner, 'spell-trap', 1);
  const magicCost1 = move('Man-Eater Bug', magicOwner, 'hand'), magicCost2 = move('Hane-Hane', magicOwner, 'hand');
  const seven1 = move('Seven Tools of the Bandit', sevenOwner, 'spell-trap', 4), seven2 = move('Seven Tools of the Bandit', sevenOwner, 'spell-trap', 3);
  state.players.find(p => p.id === sevenOwner)!.lifePoints = 1001;
  assertDuelInvariants(state, registry);
  return { state, actor, other, magicOwner, sevenOwner, burner, faith, root, firstCost, secondCost, heal, lateBurn,
    magic1, magic2, magicCost1, magicCost2, seven1, seven2 };
}
