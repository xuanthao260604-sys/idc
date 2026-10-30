import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
import type { EngineAction } from '../packages/engine/src/actions.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog();
const definition = (name: string) => Object.values(registry.cards).find(c => c.name === name)!.id;

// Trusted preparation only; every later transition uses a real engine/adapter action.
function fixture(actor: string) {
  const other = actor === 'a' ? 'b' : 'a';
  const deck = [...Object.keys(registry.cards), definition('Seven Tools of the Bandit'), definition('Trap Hole')];
  const state = structuredClone(createDuel(registry, { duelId: 'seven-interactions', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '95'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) { p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  state.players.find(p => p.id === actor)!.lifePoints = 1001;
  function move(name: string, who = actor, zone: 'hand' | 'monster' | 'spell-trap' | 'graveyard' = 'hand', slot: Slot = 0) {
    const p = state.players.find(p => p.id === who)!, id = p.deck.find(id => state.cards[id]!.definition.id === definition(name));
    if (!id) throw new Error('Missing fixture card ' + name);
    p.deck.splice(p.deck.indexOf(id), 1); const card = state.cards[id]!;
    if (zone === 'monster' || zone === 'spell-trap') {
      (zone === 'monster' ? p.monsters : p.spellsTraps)[slot] = id; card.location = { kind: zone, playerId: who, slot };
      card.position = zone === 'monster' ? 'face-down-defense' : 'face-down'; card.markers.setOnTurn = state.turn.number - 1;
    } else { p[zone].push(id); card.location = { kind: zone, playerId: who }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; }
    return id;
  }
  const ox = move('Battle Ox'), guardian = move('Celtic Guardian', actor, 'monster', 1);
  const traps = [move('Trap Hole', other, 'spell-trap'), move('Trap Hole', other, 'spell-trap', 1)];
  const counters = [move('Seven Tools of the Bandit', actor, 'spell-trap', 4), move('Seven Tools of the Bandit', actor, 'spell-trap', 2)];
  return { state, actor, other, move, ox, guardian, traps, counters };
}
function act(state: DuelState, actorId: string, action: EngineAction) {
  assertDuelInvariants(state, registry);
  const before = structuredClone(state), r = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(state).toEqual(before); if (!r.accepted) throw new Error(r.message);
  assertDuelInvariants(r.state, registry); return r;
}
function reject(state: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(state), r = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(r.accepted).toBe(false); expect(r.state).toBe(state); expect(state).toEqual(before); return r;
}
function settle(state: DuelState): DuelState {
  for (let n = 0; state.timing.window !== 'open' && !state.result; n++) {
    if (n > 12 || state.pendingDecision) throw new Error('Unexpected paused interaction');
    state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  }
  return state;
}
const lp = (s: DuelState, who: string) => s.players.find(p => p.id === who)!.lifePoints;
const spell = (instanceId: string): EngineAction => ({ type: 'activate-spell', instanceId, slot: 0 });
function trap(state: DuelState, f: ReturnType<typeof fixture>, second = false) {
  state = act(state, f.actor, second ? { type: 'flip-summon', instanceId: f.guardian } : { type: 'normal-summon', instanceId: f.ox, slot: 0, tributeIds: [] }).state;
  state = act(state, f.actor, { type: 'pass' }).state;
  return act(state, f.other, { type: 'activate-trap', instanceId: f.traps[second ? 1 : 0]!, targetId: second ? f.guardian : f.ox }).state;
}
function pay(state: DuelState, f: ReturnType<typeof fixture>, second = false) {
  const paid = act(state, f.actor, { type: 'activate-lp-counter-trap', instanceId: f.counters[second ? 1 : 0]!, respondingToLinkId: state.chain[0]!.id });
  expect(publicResolution(paid.events, paid.state)).toEqual([{ kind: 'lp-cost', playerId: f.actor, amount: 1000 }]);
  const passed = act(paid.state, f.other, { type: 'pass' }).state;
  const done = act(passed, f.actor, { type: 'pass' });
  expect(publicResolution(done.events, done.state)).toEqual([{ kind: 'trap-activation-negated', playerId: f.other, count: 1 }, { kind: 'trap-destroyed', playerId: f.other, count: 1 }]);
  return { state: settle(done.state), paid, done };
}
function once(state: DuelState, ids: string[]) {
  for (const id of ids) expect(state.players.flatMap(p => p.graveyard).filter(c => c === id)).toHaveLength(1);
}
function nextMain(state: DuelState) {
  const prior = state.turn.number;
  state = settle(act(state, state.turn.activePlayer, { type: 'request-phase', phase: 'end' }).state);
  if (state.turn.number === prior) state = settle(act(state, state.turn.activePlayer, { type: 'request-phase', phase: 'draw' }).state);
  state = settle(act(state, state.turn.activePlayer, { type: 'request-phase', phase: 'standby' }).state);
  return settle(act(state, state.turn.activePlayer, { type: 'request-phase', phase: 'main1' }).state);
}

describe.each(['a', 'b'])('Seven Tools sequential interactions for %s', actor => {
  it('heals from 1 to 1001, then pays for a separate Trap Chain without refunding cost or Summon quota', () => {
    const f = fixture(actor), heal = f.move('Dian Keto the Cure Master'), extra = f.move('Skull Servant');
    const decks = f.state.players.map(p => p.deck), first = pay(trap(f.state, f), f);
    expect(lp(first.state, actor)).toBe(1); expect(first.state.result).toBeNull();
    const active = act(first.state, actor, spell(heal)); expect(lp(active.state, actor)).toBe(1);
    let state = settle(active.state); expect(lp(state, actor)).toBe(1001);
    reject(state, actor, { type: 'normal-summon', instanceId: extra, slot: 2, tributeIds: [] });
    state = trap(state, f, true); const monsters = state.players.map(p => p.monsters), markers = [state.cards[f.ox]!.markers, state.cards[f.guardian]!.markers];
    const second = pay(state, f, true); state = second.state;
    expect(second.paid.state.chain[1]!.costEvents[0]!.details).toMatchObject({ beforeLP: 1001, afterLP: 1, amount: 1000 });
    expect(second.paid.state.chain[0]!.id).not.toBe(first.paid.state.chain[0]!.id);
    expect(lp(state, actor)).toBe(1); expect(state.result).toBeNull(); expect(state.pendingDecision).toBeNull();
    expect(state.players.map(p => p.monsters)).toEqual(monsters); expect([state.cards[f.ox]!.markers, state.cards[f.guardian]!.markers]).toEqual(markers);
    expect(state.players.find(p => p.id === actor)!.normalSummonsOrSetsUsed).toBe(1); expect(state.players.map(p => p.deck)).toEqual(decks);
    once(state, [...f.traps, ...f.counters, heal]);
  });
  it('negating the heal leaves 1 LP; the next Seven Tools is blocked and its Trap Hole still resolves', () => {
    const f = fixture(actor), heal = f.move('Dian Keto the Cure Master'), magic = f.move('Magic Jammer', f.other, 'spell-trap', 4), cost = f.move('Man-Eater Bug', f.other);
    let state = pay(trap(f.state, f), f).state;
    state = act(state, actor, spell(heal)).state;
    const counter = act(state, f.other, { type: 'activate-counter-trap', instanceId: magic, discardId: cost, respondingToLinkId: state.chain[0]!.id });
    state = settle(counter.state); expect(lp(state, actor)).toBe(1); expect(state.pendingDecision).toBeNull(); expect(state.pendingTriggers).toEqual([]);
    state = trap(state, f, true);
    expect(reject(state, actor, { type: 'activate-lp-counter-trap', instanceId: f.counters[1]!, respondingToLinkId: state.chain[0]!.id })).toMatchObject({ code: 'unpayable-cost' });
    state = settle(state); expect(state.cards[f.guardian]!.location.kind).toBe('graveyard'); expect(state.cards[f.ox]!.location.kind).toBe('monster');
    expect(state.cards[f.counters[1]!]!.position).toBe('face-down'); expect(lp(state, actor)).toBe(1); expect(state.result).toBeNull();
    once(state, [f.traps[0]!, f.traps[1]!, f.counters[0]!, magic, cost, heal, f.guardian]);
  });
  it.each(['Magician of Faith', 'Hane-Hane', 'Man-Eater Bug'])('a new self Magic Jammer at 1 LP discards %s without paying LP again or triggering FLIP', name => {
    const f = fixture(actor), source = f.move('Hinotama'), magic = f.move('Magic Jammer', actor, 'spell-trap', 3), cost = f.move(name);
    let state = pay(trap(f.state, f), f).state;
    const monsters = state.players.map(p => p.monsters);
    state = act(state, actor, spell(source)).state; state = act(state, f.other, { type: 'pass' }).state;
    const counter = act(state, actor, { type: 'activate-counter-trap', instanceId: magic, discardId: cost, respondingToLinkId: state.chain[0]!.id });
    expect(publicResolution(counter.events, counter.state)).toEqual([{ kind: 'discard-cost', playerId: actor, count: 1 }]);
    expect(counter.state.chain.map(l => l.spellSpeed)).toEqual([1, 3]); state = settle(counter.state);
    expect(lp(state, actor)).toBe(1); expect(lp(state, f.other)).toBe(8000); expect(state.pendingDecision).toBeNull(); expect(state.pendingTriggers).toEqual([]);
    expect(state.players.map(p => p.monsters)).toEqual(monsters); expect(state.result).toBeNull();
    once(state, [f.traps[0]!, f.counters[0]!, magic, source, cost]);
  });
  it('1 LP is not defeat from payment; a later real Ookazi ends the duel only when its effect resolves', () => {
    const f = fixture(actor), burn = f.move('Ookazi', f.other);
    let state = pay(trap(f.state, f), f).state; expect(state.result).toBeNull();
    state = nextMain(state); expect(state.turn.activePlayer).toBe(f.other); expect(lp(state, actor)).toBe(1);
    state = act(state, f.other, spell(burn)).state; expect(state.result).toBeNull(); expect(lp(state, actor)).toBe(1);
    state = act(state, actor, { type: 'pass' }).state; expect(state.result).toBeNull();
    const done = act(state, f.other, { type: 'pass' });
    expect(publicResolution(done.events, done.state)).toEqual([{ kind: 'effect-damage', playerId: actor, amount: 800 }]);
    expect(done.state.result).toEqual({ winner: f.other, reason: 'life-points' }); expect(lp(done.state, actor)).toBe(0);
    expect(done.state.cards[f.ox]!.location.kind).toBe('monster'); once(done.state, [f.traps[0]!, f.counters[0]!, burn]);
  });
  it('Faith recovers the used heal but excludes both Trap sources; recovery itself does not heal or refund the Counter', () => {
    const f = fixture(actor), heal = f.move('Dian Keto the Cure Master'), faith = f.move('Magician of Faith', actor, 'monster', 2), ownTrap = f.move('Trap Hole', actor, 'graveyard');
    let state = pay(trap(f.state, f), f).state; state = settle(act(state, actor, spell(heal)).state);
    state = act(state, actor, { type: 'flip-summon', instanceId: faith }).state;
    expect(state.pendingDecision!.optionIds).toEqual([heal]);
    for (const id of [ownTrap, f.traps[0]!, f.counters[0]!]) reject(state, actor, { type: 'answer-decision', decisionId: state.pendingDecision!.id, optionIds: [id] });
    state = act(state, actor, { type: 'answer-decision', decisionId: state.pendingDecision!.id, optionIds: [heal] }).state;
    expect(lp(state, actor)).toBe(1001); state = settle(state); expect(lp(state, actor)).toBe(1001);
    expect(state.cards[heal]!.location.kind).toBe('hand'); once(state, [ownTrap, f.traps[0]!, f.counters[0]!]);
    state = settle(act(state, actor, spell(heal)).state); expect(lp(state, actor)).toBe(2001);
    const second = pay(trap(state, f, true), f, true); expect(lp(second.state, actor)).toBe(1001);
    expect(second.paid.state.chain[1]!.costEvents[0]!.details).toMatchObject({ beforeLP: 2001, afterLP: 1001 });
    once(second.state, [...f.traps, ...f.counters, ownTrap, heal]);
  });
  it('old LP receipts/handles cannot pay again or negate a later heal/Trap Chain', () => {
    const f = fixture(actor); f.move('Dian Keto the Cure Master');
    const room = createCommandAdapter(registry, f.state); let serial = 0;
    const command = (who: string, action: DuelAction) => { const v = room.getView(who); return { duelId: v.duelId, expectedStateVersion: v.stateVersion, commandId: 'seven-sequence-' + ++serial, action }; };
    const send = (who: string, action: DuelAction) => { const cmd = command(who, action), receipt = room.submit(who, cmd); expect(receipt.accepted).toBe(true); return { cmd, receipt }; };
    const settleRoom = () => { for (let n = 0; room.getView(actor).timing.window !== 'open'; n++) { if (n > 12) throw new Error('Paused room'); send(room.getView(actor).timing.priorityPlayer!, { type: 'pass' }); } };
    const plan = (who: string, type: DuelAction['type']) => room.getView(who, true).availableActions!.find(a => a.type === type)!;
    const own = () => room.getView(actor).players.find(p => p.playerId === actor)!;
    const respond = (second = false) => {
      if (second) send(actor, { type: 'flip-summon', cardHandle: own().monsters[1]!.handle });
      else send(actor, { type: 'normal-summon', cardHandle: room.getView(actor).selfHand.find(c => c.visibility === 'known' && c.definition.id === definition('Battle Ox'))!.handle, slot: 0, tributeHandles: [] });
      send(actor, { type: 'pass' }); send(f.other, plan(f.other, 'activate-trap'));
    };
    respond(); const oldAction = plan(actor, 'activate-lp-counter-trap'), paid = send(actor, oldAction); settleRoom();
    send(actor, plan(actor, 'activate-spell')); const before = room.getView(actor);
    expect(room.submit(actor, paid.cmd)).toEqual(paid.receipt); expect(room.getView(actor)).toEqual(before);
    expect(room.submit(actor, command(actor, oldAction))).toMatchObject({ accepted: false, reason: 'invalid-target' }); expect(room.getView(actor)).toEqual(before);
    settleRoom(); expect(own().lifePoints).toBe(1001); respond(true); const second = send(actor, plan(actor, 'activate-lp-counter-trap'));
    const linked = room.getView(actor); expect(own().lifePoints).toBe(1);
    expect(room.submit(actor, paid.cmd)).toEqual(paid.receipt); expect(room.submit(actor, second.cmd)).toEqual(second.receipt); expect(room.getView(actor)).toEqual(linked);
    settleRoom(); const final = room.getView(actor); expect(own().lifePoints).toBe(1);
    expect(room.submit(actor, paid.cmd)).toEqual(paid.receipt); expect(room.getView(actor)).toEqual(final);
    const facts = final.activity.flatMap(a => a.resolution ?? []);
    expect(facts.filter(f => f.kind === 'lp-cost')).toEqual([{ kind: 'lp-cost', playerId: actor, amount: 1000 }, { kind: 'lp-cost', playerId: actor, amount: 1000 }]);
    expect(facts.filter(f => f.kind === 'life-points-gained')).toEqual([{ kind: 'life-points-gained', playerId: actor, amount: 1000 }]);
    expect(facts.filter(f => f.kind === 'trap-activation-negated')).toHaveLength(2); expect(facts.some(f => f.kind === 'effect-damage')).toBe(false);
    expect(room.getView(f.other).activity).toEqual(final.activity);
  });
});
