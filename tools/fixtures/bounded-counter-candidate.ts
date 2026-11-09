import { createDuel } from '../../packages/engine/src/duel.js';
import type { Registry } from '../../packages/engine/src/registry.js';
import type { ChainLink, DuelState, Slot } from '../../packages/protocol/src/duel.js';
import { BOUNDED_SEVEN_CANDIDATE_EFFECT } from '../../packages/engine/src/bounded-counter-graph.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

/** Explicit synthetic component snapshot, NOT activations or a gameplay fixture.
 * Receipts beyond the active v5 gate are modeled, never claimed to be paid by applyAction.
 */
export function setupBoundedCounterCandidate(registry: Registry, options: {
  actor?: string; phase?: 'main1' | 'main2'; traps?: number; spellId?: string;
  magicOwner?: string; owners?: readonly string[]; handSpell?: boolean; noMagic?: boolean;
} = {}) {
  const actor = options.actor ?? 'a', other = actor === 'a' ? 'b' : 'a', owners = options.owners ?? ['a', 'b'];
  const spellId = options.spellId, targetDef = Object.values(registry.cards).find(c => c.name === 'Battle Ox')!.id;
  const deck = ['official:03819470', 'official:03819470', 'official:03819470',
    'official:04206964', 'official:04206964', 'official:04206964',
    'official:77414722', 'official:77414722', 'official:77414722', targetDef, ...(spellId ? [spellId] : [])];
  for (const c of Object.values(registry.cards)) if (deck.length < 40 && c.kind === 'normal-monster' && !deck.includes(c.id)) deck.push(c.id);
  const state = structuredClone(createDuel(registry, { duelId: 'bounded-candidate', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: actor, seedHex: 'ea'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) { p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  state.turn = { number: 3, activePlayer: actor, phase: options.phase ?? 'main1' };
  state.chain = []; state.eventSequence = 2;
  state.timing = { ...state.timing, window: 'chain-response', priorityPlayer: other, consecutivePasses: 0, requestedPhase: null, lastRelevantEvents: [] };
  for (const p of state.players) p.lifePoints = owners.filter(who => who === p.id).length * 1000 + 1;
  const move = (def: string, who: string, zone: 'monster' | 'spell-trap' | 'graveyard') => {
    const p = state.players.find(p => p.id === who)!, id = p.deck.find(id => state.cards[id]!.definition.id === def);
    if (!id) throw new Error('Missing candidate fixture source');
    p.deck.splice(p.deck.indexOf(id), 1); const c = state.cards[id]!;
    if (zone === 'graveyard') { p.graveyard.push(id); c.location = { kind: zone, playerId: who }; c.position = 'face-up'; }
    else {
      const row = zone === 'monster' ? p.monsters : p.spellsTraps, slot = row.indexOf(null);
      if (slot < 0) throw new Error('Candidate fixture exceeds available zones');
      row[slot] = id; c.location = { kind: zone, playerId: who, slot: slot as Slot };
      c.position = zone === 'monster' ? 'face-up-attack' : 'face-up'; c.markers.setOnTurn = 1;
    }
    return id;
  };
  const target = move(targetDef, spellId ? other : actor, 'monster');
  state.cards[target]!.markers.summonedOnTurn = 3; state.cards[target]!.markers.summonedBy = actor;
  const add = (id: string, effectId: string, speed: 1 | 2 | 3, response?: string): Mutable<ChainLink> => {
    const c = state.cards[id]!, l: Mutable<ChainLink> = { id: 'candidate-link-' + state.chain.length, controllerId: c.controllerId, source: id,
      sourceAtActivation: structuredClone(c), effectId, spellSpeed: speed, costEvents: [], targetRefs: [],
      activationNegated: false, effectNegated: false, ...(response ? { respondingToLinkId: response } : {}) };
    state.chain.push(l); return l;
  };
  const discard = (l: Mutable<ChainLink>) => {
    const p = state.players.find(p => p.id === l.controllerId)!, d = p.deck.find(id => registry.cards[state.cards[id]!.definition.id]!.kind === 'normal-monster')!;
    move(state.cards[d]!.definition.id, p.id, 'graveyard');
    l.costEvents.push({ kind: 'cards-discarded', sequence: state.eventSequence++, simultaneousGroup: 'candidate-discard-' + l.id,
      affectedInstances: [d], details: { playerId: p.id, reason: 'activation-cost' } });
    return d;
  };
  if (spellId) {
    const id = move(spellId, actor, 'spell-trap'); if (options.handSpell) state.cards[id]!.markers.setOnTurn = null;
    const root = add(id, 'normal-spell', 1), handler = registry.spellHandlers[spellId]!.handler;
    if (['discard-destroy-target-monster', 'discard-return-own-graveyard-monster'].includes(handler)) {
      const d = discard(root), t = handler === 'discard-return-own-graveyard-monster' ? d : target;
      root.targetRefs.push({ instanceId: t, locationAtSelection: structuredClone(state.cards[t]!.location) });
    } else if (handler === 'target-opposing-attack-to-defense') root.targetRefs.push({ instanceId: target, locationAtSelection: structuredClone(state.cards[target]!.location) });
    if (!options.noMagic) { const m = add(move('official:77414722', options.magicOwner ?? other, 'spell-trap'), 'discard-negate-normal-spell-activation', 3, root.id); discard(m); }
  } else {
    state.timing.lastRelevantEvents = [{ kind: 'monster-summoned', sequence: 1, simultaneousGroup: 'candidate-summon', affectedInstances: [target], details: { playerId: actor, method: 'normal' } }];
    for (let i = 0; i < (options.traps ?? 1); i++) {
      const l = add(move('official:04206964', other, 'spell-trap'), 'destroy-opponent-normal-or-flip-summoned-1000', 2);
      l.targetRefs.push({ instanceId: target, locationAtSelection: structuredClone(state.cards[target]!.location) });
    }
  }
  for (const who of owners) {
    const l = add(move('official:03819470', who, 'spell-trap'), BOUNDED_SEVEN_CANDIDATE_EFFECT, 3, state.chain.at(-1)!.id);
    const p = state.players.find(p => p.id === who)!, beforeLP = p.lifePoints; p.lifePoints -= 1000;
    l.costEvents.push({ kind: 'life-points-paid', sequence: state.eventSequence++, simultaneousGroup: 'candidate-lp-' + l.id, affectedInstances: [],
      details: { playerId: who, reason: 'activation-cost', amount: 1000, beforeLP, afterLP: p.lifePoints } });
  }
  state.eventSequence++;
  return { state, target, actor, other };
}
