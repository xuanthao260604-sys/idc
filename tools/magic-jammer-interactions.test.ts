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
// Trusted preparation only. Every transition after the first action uses the engine/adapter.
function fixture(actor: string) {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'counter-interactions', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '93'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) { p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  const other = actor === 'a' ? 'b' : 'a';
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  function move(name: string, owner = actor, zone: 'hand' | 'graveyard' | 'monster' | 'spell-trap' = 'hand', slot: Slot = 0) {
    const definition = Object.values(registry.cards).find(c => c.name === name)!, p = state.players.find(p => p.id === owner)!;
    const id = p.deck.find(id => state.cards[id]!.definition.id === definition.id);
    if (!id) throw new Error('Missing fixture card ' + name);
    p.deck.splice(p.deck.indexOf(id), 1); const card = state.cards[id]!;
    if (zone === 'monster' || zone === 'spell-trap') {
      (zone === 'monster' ? p.monsters : p.spellsTraps)[slot] = id; card.location = { kind: zone, playerId: owner, slot };
      card.position = zone === 'monster' ? 'face-down-defense' : 'face-down'; card.markers.setOnTurn = state.turn.number - 1;
    } else { p[zone].push(id); card.location = { kind: zone, playerId: owner }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; }
    return id;
  }
  return { state, actor, other, move };
}
function act(state: DuelState, actorId: string, action: EngineAction) {
  assertDuelInvariants(state, registry);
  const before = structuredClone(state), r = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(state).toEqual(before); if (!r.accepted) throw new Error(r.message);
  assertDuelInvariants(r.state, registry); return r;
}
function reject(state: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(state), r = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(r.accepted).toBe(false); expect(r.state).toBe(state); expect(state).toEqual(before);
}
function settle(state: DuelState): DuelState {
  for (let n = 0; state.timing.window !== 'open'; n++) {
    if (n > 12 || state.pendingDecision || state.result) throw new Error('Unexpected paused interaction');
    state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  }
  return state;
}
const spell = (instanceId: string): EngineAction => ({ type: 'activate-spell', instanceId, slot: 0 });
function negate(state: DuelState, actor: string, activation: EngineAction, owner: string, counter: string, cost: string) {
  state = act(state, actor, activation).state;
  if (owner === actor) state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  const linked = act(state, owner, { type: 'activate-counter-trap', instanceId: counter, discardId: cost, respondingToLinkId: state.chain[0]!.id });
  state = act(linked.state, linked.state.timing.priorityPlayer!, { type: 'pass' }).state;
  const resolved = act(state, state.timing.priorityPlayer!, { type: 'pass' });
  expect(publicResolution(resolved.events, resolved.state)).toEqual([{ kind: 'spell-activation-negated', playerId: actor, count: 1 }, { kind: 'spell-destroyed', playerId: actor, count: 1 }]);
  return { state: settle(resolved.state), linked, resolved };
}
function recover(state: DuelState, actor: string, faith: string, target: string, excluded: string[]) {
  state = act(state, actor, { type: 'flip-summon', instanceId: faith }).state;
  expect(state.pendingDecision!.optionIds).toContain(target);
  for (const id of excluded) {
    expect(state.pendingDecision!.optionIds).not.toContain(id);
    reject(state, actor, { type: 'answer-decision', decisionId: state.pendingDecision!.id, optionIds: [id] });
  }
  state = act(state, actor, { type: 'answer-decision', decisionId: state.pendingDecision!.id, optionIds: [target] }).state;
  expect(state.cards[target]!.location.kind).toBe('graveyard');
  state = settle(state); expect(state.cards[target]!.location).toEqual({ kind: 'hand', playerId: actor }); return state;
}
function nextMain(state: DuelState) {
  const prior = state.turn.number;
  state = settle(act(state, state.turn.activePlayer, { type: 'request-phase', phase: 'end' }).state);
  if (state.turn.number === prior) state = settle(act(state, state.turn.activePlayer, { type: 'request-phase', phase: 'draw' }).state);
  state = settle(act(state, state.turn.activePlayer, { type: 'request-phase', phase: 'standby' }).state);
  return settle(act(state, state.turn.activePlayer, { type: 'request-phase', phase: 'main1' }).state);
}
const lp = (state: DuelState) => state.players.map(p => p.lifePoints);

describe.each(['a', 'b'])('Magic Jammer sequential interactions for %s', actor => {
  it.each([false, true])('Faith recovers a negated Ookazi, then a new hand/Set activation (Set=%s) deals damage', fromSet => {
    const f = fixture(actor), source = f.move('Ookazi'), counter = f.move('Magic Jammer', f.other, 'spell-trap', 4), cost = f.move('Skull Servant', f.other);
    const faith = f.move('Magician of Faith', actor, 'monster'), foreign = f.move('Ookazi', f.other, 'graveyard');
    let state = negate(f.state, actor, spell(source), f.other, counter, cost).state;
    expect(lp(state)).toEqual([8000, 8000]);
    state = recover(state, actor, faith, source, [foreign, counter]); expect(lp(state)).toEqual([8000, 8000]);
    if (fromSet) state = settle(act(state, actor, { type: 'set-spell', instanceId: source, slot: 0 }).state);
    const active = act(state, actor, spell(source)).state;
    expect(active.chain[0]).toMatchObject({ activationNegated: false, effectNegated: false }); expect(lp(active)).toEqual([8000, 8000]);
    state = settle(active); expect(state.players.find(p => p.id === f.other)!.lifePoints).toBe(7200);
    for (const id of [source, foreign, counter, cost]) expect(state.players.flatMap(p => p.graveyard).filter(c => c === id)).toHaveLength(1);
    expect(state.players.find(p => p.id === actor)!.normalSummonsOrSetsUsed).toBe(0);
  });
  it.each(['Tribute to The Doomed', 'Monster Reincarnation'])('negated %s keeps its first cost; Faith recovery requires a new cost for a new activation', name => {
    const f = fixture(actor), source = f.move(name), firstCost = f.move('Ookazi'), secondCost = f.move('Skull Servant');
    const counter = f.move('Magic Jammer', f.other, 'spell-trap', 4), counterCost = f.move('Magician of Faith', f.other), faith = f.move('Magician of Faith', actor, 'monster');
    const target = name === 'Monster Reincarnation' ? f.move('Battle Ox', actor, 'graveyard') : f.move('Battle Ox', f.other, 'monster');
    const activation = { ...spell(source), discardId: firstCost, targetId: target } as EngineAction;
    let state = negate(f.state, actor, activation, f.other, counter, counterCost).state;
    expect(state.cards[target]).toEqual(f.state.cards[target]); expect(state.pendingDecision).toBeNull(); expect(state.pendingTriggers).toEqual([]); expect(lp(state)).toEqual([8000, 8000]);
    state = recover(state, actor, faith, source, [counter, counterCost]);
    reject(state, actor, { ...spell(source), discardId: firstCost, targetId: target } as EngineAction);
    const active = act(state, actor, { ...spell(source), discardId: secondCost, targetId: target } as EngineAction);
    expect(publicResolution(active.events, active.state)).toEqual([{ kind: 'discard-cost', playerId: actor, count: 1 }]);
    expect(active.state.cards[target]).toEqual(f.state.cards[target]); state = settle(active.state);
    expect(state.cards[target]!.location.kind).toBe(name === 'Monster Reincarnation' ? 'hand' : 'graveyard');
    for (const id of [firstCost, secondCost, counterCost, counter, source]) expect(state.players.flatMap(p => p.graveyard).filter(c => c === id)).toHaveLength(1);
    expect(lp(state)).toEqual([8000, 8000]); expect(state.chain).toEqual([]); expect(state.pendingDecision).toBeNull();
  });
  it.each(['Magician of Faith', 'Hane-Hane', 'Man-Eater Bug'])('discarding %s for Magic Jammer does not Flip it or create a decision', name => {
    const f = fixture(actor), source = f.move('Ookazi'), counter = f.move('Magic Jammer', f.other, 'spell-trap', 4), cost = f.move(name, f.other);
    f.move('Battle Ox', actor, 'monster'); f.move('Hinotama', f.other, 'graveyard');
    const { state, linked, resolved } = negate(f.state, actor, spell(source), f.other, counter, cost);
    for (const s of [linked.state, resolved.state, state]) { expect(s.pendingDecision).toBeNull(); expect(s.pendingTriggers).toEqual([]); expect(lp(s)).toEqual([8000, 8000]); }
    expect(state.cards[cost]!.location).toEqual({ kind: 'graveyard', playerId: f.other });
    expect(state.players.map(p => p.monsters)).toEqual(f.state.players.map(p => p.monsters));
    expect([...linked.events, ...resolved.events].some(e => ['flip-effect-activated', 'returned-to-hand', 'effect-destroyed', 'effect-damage'].includes(e.kind))).toBe(false);
  });
  it('a Spell discarded as Counter cost can be recovered on its owner’s next Main Phase, then activated separately', () => {
    const f = fixture(actor), source = f.move('Dian Keto the Cure Master'), counter = f.move('Magic Jammer', f.other, 'spell-trap', 4);
    const cost = f.move('Ookazi', f.other), faith = f.move('Magician of Faith', f.other, 'monster');
    let state = negate(f.state, actor, spell(source), f.other, counter, cost).state;
    expect(lp(state)).toEqual([8000, 8000]); reject(state, f.other, { type: 'flip-summon', instanceId: faith });
    state = nextMain(state); expect(state.turn.activePlayer).toBe(f.other);
    state = recover(state, f.other, faith, cost, [source, counter]); expect(lp(state)).toEqual([8000, 8000]);
    state = settle(act(state, f.other, spell(cost)).state);
    expect(state.players.find(p => p.id === actor)!.lifePoints).toBe(7200); expect(state.players.find(p => p.id === f.other)!.lifePoints).toBe(8000);
  });
  it('a newly Set Magic Jammer waits for the next turn before responding to a new Spell Chain', () => {
    const f = fixture(actor), counter = f.move('Magic Jammer'), cost = f.move('Magician of Faith'), ownSpell = f.move('Ookazi'), otherSpell = f.move('Hinotama', f.other);
    let state = settle(act(f.state, actor, { type: 'set-trap', instanceId: counter, slot: 4 }).state);
    state = act(state, actor, spell(ownSpell)).state; state = act(state, f.other, { type: 'pass' }).state;
    reject(state, actor, { type: 'activate-counter-trap', instanceId: counter, discardId: cost, respondingToLinkId: state.chain[0]!.id });
    state = settle(state); expect(state.players.find(p => p.id === f.other)!.lifePoints).toBe(7200);
    state = nextMain(state); expect(state.turn.activePlayer).toBe(f.other);
    state = negate(state, f.other, spell(otherSpell), actor, counter, cost).state;
    expect(state.players.find(p => p.id === actor)!.lifePoints).toBe(8000); expect(state.players.find(p => p.id === f.other)!.lifePoints).toBe(7200);
    expect(state.pendingDecision).toBeNull(); expect(state.cards[counter]!.location.kind).toBe('graveyard');
  });
  it('recovery rotates Spell handles; old Counter receipts cannot negate the new Chain or pay again', () => {
    const f = fixture(actor); f.move('Ookazi'); f.move('Magician of Faith', actor, 'monster'); f.move('Magic Jammer', f.other, 'spell-trap', 4); f.move('Skull Servant', f.other);
    const room = createCommandAdapter(registry, f.state); let serial = 0;
    const command = (who: string, action: DuelAction) => { const v = room.getView(who); return { duelId: v.duelId, expectedStateVersion: v.stateVersion, commandId: 'counter-recovery-' + ++serial, action }; };
    const send = (who: string, action: DuelAction) => { const cmd = command(who, action), receipt = room.submit(who, cmd); expect(receipt.accepted).toBe(true); return { cmd, receipt }; };
    const settleRoom = () => { for (let n = 0; room.getView(actor).timing.window !== 'open'; n++) { if (n > 12) throw new Error('Paused room'); send(room.getView(actor).timing.priorityPlayer!, { type: 'pass' }); } };
    const own = () => room.getView(actor).players.find(p => p.playerId === actor)!;
    const hand = () => room.getView(actor).selfHand.find(c => c.visibility === 'known' && c.definition.id === 'official:19523799')!.handle;
    const oldHandle = hand(); send(actor, { type: 'activate-spell', cardHandle: oldHandle, slot: 0 });
    const oldCounter = room.getView(f.other, true).availableActions!.find(a => a.type === 'activate-counter-trap')!;
    const paid = send(f.other, oldCounter); settleRoom();
    send(actor, { type: 'flip-summon', cardHandle: own().monsters[0]!.handle }); expect(room.getView(f.other).decision).toBeNull();
    send(actor, { type: 'answer-decision', decisionId: room.getView(actor).decision!.id, optionIds: [own().graveyard.find(c => c.visibility === 'known' && c.definition.id === 'official:19523799')!.handle] }); settleRoom();
    expect(hand()).not.toBe(oldHandle);
    const beforeStale = room.getView(actor); expect(room.submit(actor, command(actor, { type: 'activate-spell', cardHandle: oldHandle, slot: 0 }))).toMatchObject({ accepted: false, reason: 'invalid-target' }); expect(room.getView(actor)).toEqual(beforeStale);
    const fresh = send(actor, { type: 'activate-spell', cardHandle: hand(), slot: 0 }), before = room.getView(actor);
    expect(room.submit(f.other, paid.cmd)).toEqual(paid.receipt); expect(room.getView(actor)).toEqual(before);
    expect(room.submit(f.other, command(f.other, oldCounter))).toMatchObject({ accepted: false, reason: 'invalid-target' }); expect(room.getView(actor)).toEqual(before);
    settleRoom(); const final = room.getView(actor); expect(room.submit(actor, fresh.cmd)).toEqual(fresh.receipt); expect(room.getView(actor)).toEqual(final);
    expect(final.players.find(p => p.playerId === f.other)!.lifePoints).toBe(7200);
    const facts = final.activity.flatMap(a => a.resolution ?? []);
    expect(facts.filter(f => f.kind === 'discard-cost')).toEqual([{ kind: 'discard-cost', playerId: f.other, count: 1 }]);
    expect(facts.filter(f => f.kind === 'spell-activation-negated')).toHaveLength(1);
    expect(facts.filter(f => f.kind === 'effect-damage')).toEqual([{ kind: 'effect-damage', playerId: f.other, amount: 800 }]);
    expect(room.getView(f.other).activity).toEqual(final.activity);
  });
});
