import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDeckStore } from './deck-store.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const load = (p: string) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const runtime = loadRuntimeCatalog(), bundle = load('data/generated/magic-jammer.json'), reviews = load('data/reviews/magic-jammer.effects.json'), magic = 'official:77414722';
// Works before and after catalog integration, without duplicate definitions/reviews.
const cards = [...runtime.cards.filter(c => c.id !== magic), ...bundle.cards];
const registry = createRegistry(cards, goat200508Format, {}, runtime.effectReviews.spells, runtime.effectReviews.flips, runtime.effectReviews.traps, reviews);
const spells = Object.keys(registry.spellHandlers);
function fixture(spellId = 'official:19523799', actor = 'a', self = false, fromSet = false) {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'magic-jammer', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '91'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) { p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  const opponent = actor === 'a' ? 'b' : 'a', counterOwner = self ? actor : opponent;
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  function move(id: string, owner: string, zone: 'hand' | 'graveyard' | 'monster' | 'spell-trap', slot: Slot = 0) {
    const p = state.players.find(p => p.id === owner)!, instanceId = p.deck.find(c => state.cards[c]!.definition.id === id)!;
    if (!instanceId) throw new Error('Missing fixture card ' + id);
    p.deck.splice(p.deck.indexOf(instanceId), 1); const c = state.cards[instanceId]!;
    if (zone === 'monster' || zone === 'spell-trap') {
      (zone === 'monster' ? p.monsters : p.spellsTraps)[slot] = instanceId; c.location = { kind: zone, playerId: owner, slot };
      c.position = zone === 'monster' ? 'face-up-attack' : 'face-down'; if (zone === 'spell-trap') c.markers.setOnTurn = state.turn.number - 1;
    } else { p[zone].push(instanceId); c.location = { kind: zone, playerId: owner }; c.position = zone === 'hand' ? 'face-down' : 'face-up'; }
    return instanceId;
  }
  const source = move(spellId, actor, fromSet ? 'spell-trap' : 'hand'), counter = move(magic, counterOwner, 'spell-trap', 4);
  const cost = move('official:15025844', counterOwner, 'hand'); // Mystical Elf
  const spellCost = move('official:32274490', actor, 'hand'); // Skull Servant
  const target = move('official:05053103', opponent, 'monster', 0); // Battle Ox
  move('official:97590747', opponent, 'monster', 1); // La Jinn: equal ATK for Hammer Shot choice
  move('official:13039848', actor, 'monster', 2); // Giant Soldier of Stone
  const graveTarget = move('official:91152256', actor, 'graveyard'); // Celtic Guardian
  const handler = registry.spellHandlers[spellId]!.handler;
  const activation: EngineAction = { type: 'activate-spell', instanceId: source, slot: 0,
    ...(['discard-destroy-target-monster', 'discard-return-own-graveyard-monster'].includes(handler) ? { discardId: spellCost, targetId: handler === 'discard-return-own-graveyard-monster' ? graveTarget : target }
      : handler === 'target-opposing-attack-to-defense' ? { targetId: target } : {}) };
  return { state, source, counter, cost, spellCost, actor, opponent, counterOwner, target, graveTarget, activation, move };
}
function step(state: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(state), r = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(state).toEqual(before); if (!r.accepted) throw new Error(r.message); assertDuelInvariants(r.state, registry); return r;
}
function activate(f: ReturnType<typeof fixture>) {
  let state = step(f.state, f.actor, f.activation).state;
  if (f.actor === f.counterOwner) state = step(state, f.opponent, { type: 'pass' }).state;
  return state;
}
const counterAction = (f: ReturnType<typeof fixture>, state: DuelState): EngineAction => ({ type: 'activate-counter-trap', instanceId: f.counter, discardId: f.cost, respondingToLinkId: state.chain[0]!.id });
function resolve(state: DuelState) {
  state = step(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  return step(state, state.timing.priorityPlayer!, { type: 'pass' });
}
describe('Magic Jammer two-link activation negation', () => {
  it('requires a separate Counter Trap review and keeps imported status pending', () => {
    expect(createRegistry(bundle.cards, goat200508Format).unsupportedIds).toEqual([magic]);
    expect(registry.counterTrapHandlers[magic]).toBe('discard-negate-normal-spell-activation'); expect(registry.trapHandlers[magic]).toBeUndefined();
    expect(bundle.summary).toMatchObject({ historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
  });
  it.each(['text', 'revision', 'legality', 'subtype', 'scope', 'format'])('rejects %s review drift', mode => {
    const changed = structuredClone(bundle.cards), rs = structuredClone(reviews);
    if (mode === 'text') changed[0].text += ' altered'; if (mode === 'revision') changed[0].revision++;
    if (mode === 'legality') changed[0].legality.maxCopies = 1; if (mode === 'subtype') changed[0].subtype = 'normal';
    if (mode === 'scope') rs[0].scope = 'summon-response-trap-v1'; if (mode === 'format') rs[0].format.revision++;
    expect(() => createRegistry(changed, goat200508Format, {}, [], [], [], rs)).toThrow();
  });
  it.each(spells.flatMap(spellId => ['a', 'b'].flatMap(actor => [false, true].flatMap(self => [false, true].map(fromSet => ({ spellId, actor, self, fromSet }))))))('$spellId actor=$actor self=$self fromSet=$fromSet skips the original plan, preserves costs and cleans both sources', ({ spellId, actor, self, fromSet }) => {
    const f = fixture(spellId, actor, self, fromSet), active = activate(f), before = structuredClone(active);
    const linked = step(active, f.counterOwner, counterAction(f, active));
    expect(linked.state.players.map(p => p.lifePoints)).toEqual([8000, 8000]); expect(linked.state.chain).toHaveLength(2);
    expect(linked.state.chain[1]).toMatchObject({ spellSpeed: 3, respondingToLinkId: active.chain[0]!.id, targetRefs: [], activationNegated: false });
    expect(publicResolution(linked.events, linked.state)).toEqual([{ kind: 'discard-cost', playerId: f.counterOwner, count: 1 }]);
    const first = step(linked.state, linked.state.timing.priorityPlayer!, { type: 'pass' }).state;
    expect(first.chain).toHaveLength(2); expect(first.cards[f.source]!.location.kind).toBe('spell-trap');
    const done = step(first, first.timing.priorityPlayer!, { type: 'pass' });
    expect(done.state.chain).toEqual([]); expect(done.state.pendingDecision).toBeNull(); expect(done.state.result).toBeNull();
    expect(done.state.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
    for (const p of done.state.players) {
      const old = before.players.find(o => o.id === p.id)!;
      expect(p.monsters).toEqual(old.monsters); expect(p.deck).toEqual(old.deck); expect(p.normalSummonsOrSetsUsed).toBe(0);
      expect(p.hand).toEqual(old.hand.filter(id => id !== f.cost));
    }
    for (const id of [...done.state.players.flatMap(p => p.monsters.filter((id): id is string => id !== null)), f.graveTarget]) expect(done.state.cards[id]).toEqual(before.cards[id]);
    for (const id of [f.source, f.counter, f.cost]) expect(done.state.players.find(p => p.id === done.state.cards[id]!.ownerId)!.graveyard.filter(c => c === id)).toHaveLength(1);
    expect(publicResolution(done.events, done.state)).toEqual([{ kind: 'spell-activation-negated', playerId: actor, count: 1 }, { kind: 'spell-destroyed', playerId: actor, count: 1 }]);
    expect(done.events.some(e => ['card-drawn', 'effect-damage', 'life-points-gained', 'effect-destroyed', 'position-changed', 'returned-to-hand'].includes(e.kind))).toBe(false);
  });
  it.each([0, 1, 2])('negated Pot with %i deck cards never draws or causes deck-out', count => {
    const f = fixture('official:55144522'), p = f.state.players[0];
    for (const id of p.deck.splice(count)) { p.graveyard.push(id); f.state.cards[id]!.location = { kind: 'graveyard', playerId: 'a' }; }
    const active = activate(f), done = resolve(step(active, f.counterOwner, counterAction(f, active)).state).state;
    expect(done.players[0].deck).toHaveLength(count); expect(done.result).toBeNull();
  });
  it.each(['official:19523799', 'official:46130346'])('negating lethal damage from %s keeps both players alive', id => {
    const f = fixture(id); f.state.players[1].lifePoints = id === 'official:19523799' ? 800 : 500;
    const active = activate(f), done = resolve(step(active, f.counterOwner, counterAction(f, active)).state).state;
    expect(done.players.map(p => p.lifePoints)).toEqual(f.state.players.map(p => p.lifePoints)); expect(done.result).toBeNull();
  });
  it('does not treat Counter Trap data as a Normal Trap review', () => {
    const wrong = { ...load('data/reviews/pilot.trap-effects.json')[0], cardId: magic, definitionSha256: reviews[0].definitionSha256 };
    expect(() => createRegistry(bundle.cards, goat200508Format, {}, [], [], [wrong])).toThrow('Trap review conflict');
  });
  it('loads saved catalog-110 decks for A/B without changing their bytes or the starter', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'YGO Counter old decks '));
    try {
      const old = createRegistry(cards.filter(c => c.id !== magic), goat200508Format, {}, runtime.effectReviews.spells, runtime.effectReviews.flips, runtime.effectReviews.traps);
      const store = createDeckStore(old, directory);
      for (const seat of ['a', 'b'] as const) expect((await store.save(seat, 0, seat === 'a' ? store.defaults : ['official:19523799', 'official:31560081', ...store.defaults].slice(0, 40))).ok).toBe(true);
      const before = await Promise.all(['a', 'b'].map(seat => readFile(join(directory, seat + '.json'))));
      const next = createDeckStore(registry, directory); expect(next.defaults).toEqual(store.defaults);
      for (const [i, seat] of (['a', 'b'] as const).entries()) { expect(next.get(seat)).toEqual(store.get(seat)); expect((await readFile(join(directory, seat + '.json'))).equals(before[i]!)).toBe(true); }
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
  it.each(['same-turn', 'in-hand', 'opponent-cost', 'no-cost', 'wrong-link', 'wrong-priority', 'extra-amount'])('rejects %s without paying, revealing or mutating', mode => {
    const f = fixture();
    if (mode === 'same-turn') f.state.cards[f.counter]!.markers.setOnTurn = f.state.turn.number;
    if (mode === 'in-hand') { f.state.players[1].spellsTraps[4] = null; f.state.players[1].hand.push(f.counter); f.state.cards[f.counter]!.location = { kind: 'hand', playerId: 'b' }; }
    if (mode === 'no-cost') { f.state.players[1].hand = []; f.state.players[1].deck.push(f.cost); f.state.cards[f.cost]!.location = { kind: 'deck', playerId: 'b' }; }
    const state = activate(f), before = structuredClone(state), action = { ...counterAction(f, state) } as Record<string, unknown>;
    if (mode === 'opponent-cost') action.discardId = f.spellCost; if (mode === 'wrong-link') action.respondingToLinkId = 'fake'; if (mode === 'extra-amount') action.amount = 100;
    const r = applyAction(registry, state, { actorId: mode === 'wrong-priority' ? 'a' : 'b', expectedStateVersion: state.stateVersion, action });
    expect(r.accepted).toBe(false); expect(r.state).toBe(state); expect(state).toEqual(before);
  });
  it.each(['main1', 'battle'] as const)('cannot start a Chain on its own in %s', phase => {
    const f = fixture(); f.state.turn.phase = phase; f.state.timing.priorityPlayer = f.counterOwner;
    const before = structuredClone(f.state), r = applyAction(registry, f.state, { actorId: f.counterOwner, expectedStateVersion: f.state.stateVersion, action: { type: 'activate-counter-trap', instanceId: f.counter, discardId: f.cost, respondingToLinkId: 'nonexistent' } });
    expect(r).toMatchObject({ accepted: false, code: 'illegal-timing', state: f.state }); expect(f.state).toEqual(before);
  });
  it('does not interrupt a mandatory FLIP decision or pay while it is pending', () => {
    const f = fixture(), faith = f.move('official:31560081', 'a', 'monster', 3); f.move('official:46130346', 'a', 'graveyard');
    f.state.cards[faith]!.position = 'face-down-defense'; f.state.cards[faith]!.markers.setOnTurn = f.state.turn.number - 1;
    const state = step(f.state, 'a', { type: 'flip-summon', instanceId: faith }).state, before = structuredClone(state);
    expect(state.pendingDecision).not.toBeNull();
    expect(applyAction(registry, state, { actorId: 'b', expectedStateVersion: state.stateVersion, action: { type: 'activate-counter-trap', instanceId: f.counter, discardId: f.cost, respondingToLinkId: 'not-a-spell' } })).toMatchObject({ accepted: false, state });
    expect(state).toEqual(before);
  });
  it.each(['reference', 'speed', 'target', 'cost', 'source', 'duplicate', 'negated'])('invariants reject forged %s Counter Chain', mode => {
    const f = fixture(), active = activate(f), state = structuredClone(step(active, f.counterOwner, counterAction(f, active)).state) as Mutable<DuelState>;
    const link = state.chain[1]!;
    if (mode === 'reference') link.respondingToLinkId = 'fake'; if (mode === 'speed') link.spellSpeed = 2;
    if (mode === 'target') link.targetRefs.push({ instanceId: f.target, locationAtSelection: { kind: 'monster', playerId: 'b', slot: 0 } });
    if (mode === 'cost') link.costEvents = []; if (mode === 'source') link.sourceAtActivation.id = 'fake';
    if (mode === 'duplicate') link.id = state.chain[0]!.id; if (mode === 'negated') state.chain[0]!.activationNegated = true;
    expect(() => assertDuelInvariants(state, registry)).toThrow();
  });
  it('blocks a third counter and normal Trap responses, while Pass without counter retains the original effect', () => {
    const f = fixture(), trap = f.move('official:04206964', 'a', 'spell-trap', 3), second = f.move(magic, 'a', 'spell-trap', 2), active = activate(f), linked = step(active, 'b', counterAction(f, active)).state;
    for (const action of [{ type: 'activate-counter-trap', instanceId: second, discardId: f.spellCost, respondingToLinkId: linked.chain[1]!.id }, { type: 'activate-trap', instanceId: trap, targetId: f.target }]) expect(applyAction(registry, linked, { actorId: 'a', expectedStateVersion: linked.stateVersion, action }).accepted).toBe(false);
    expect(resolve(active).state.players[1].lifePoints).toBe(7200);
  });
});

describe.each(['a', 'b'])('Counter handles, privacy and receipts for %s', actor => {
  it('offers a private cost with a separate Chain handle, rejects stale/forged handles and replays only once', () => {
    const f = fixture('official:19523799', actor), room = createCommandAdapter(registry, f.state); let serial = 0;
    const cmd = (who: string, action: DuelAction) => { const v = room.getView(who); return { duelId: v.duelId, expectedStateVersion: v.stateVersion, commandId: `counter-${++serial}`, action }; };
    const send = (who: string, action: DuelAction) => { const command = cmd(who, action), receipt = room.submit(who, command); expect(receipt.accepted).toBe(true); return { command, receipt }; };
    const own = (who: string) => room.getView(who).players.find(p => p.playerId === who)!;
    const source = room.getView(actor).selfHand.find(c => c.visibility === 'known' && c.definition.id === 'official:19523799')!;
    send(actor, { type: 'activate-spell', cardHandle: source.handle, slot: 0 });
    const view = room.getView(f.counterOwner, true), plan = view.availableActions!.find(a => a.type === 'activate-counter-trap')!;
    expect(plan).toBeDefined(); expect(room.getView(actor).players.find(p => p.playerId === f.counterOwner)!.spellsTraps[4]!.visibility).toBe('hidden');
    expect(JSON.stringify(view.chain)).not.toContain('magic-jammer:link:'); expect(view.chain[0]!.targetHandles).toEqual([]);
    for (let i = 0; i < 3; i++) expect(room.getView(f.counterOwner, true)).toEqual(view);
    room.refreshView(f.counterOwner, true); expect(room.submit(f.counterOwner, cmd(f.counterOwner, plan))).toMatchObject({ accepted: false, reason: 'invalid-target' });
    const next = room.getView(f.counterOwner, true).availableActions!.find(a => a.type === 'activate-counter-trap')!;
    if (next.type !== 'activate-counter-trap') throw new Error('Missing counter');
    const before = room.getView(f.counterOwner);
    for (const forged of [{ ...next, chainHandle: own(f.counterOwner).spellsTraps[4]!.handle }, { ...next, chainHandle: room.getView(actor).chain[0]!.chainHandle }, { ...next, amount: 999 }, { ...next, targetHandle: source.handle }]) expect(room.submit(f.counterOwner, cmd(f.counterOwner, forged))).toMatchObject({ accepted: false });
    expect(room.getView(f.counterOwner)).toEqual(before);
    const activation = send(f.counterOwner, next); send(actor, { type: 'pass' }); const final = send(f.counterOwner, { type: 'pass' });
    const done = room.getView(actor); room.refreshView(f.counterOwner);
    for (const old of [activation, final]) expect(room.submit(f.counterOwner, old.command)).toEqual(old.receipt);
    expect(room.getView(actor)).toEqual(done); expect(done.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
    expect(done.activity.flatMap(e => e.resolution ?? [])).toEqual([{ kind: 'discard-cost', playerId: f.counterOwner, count: 1 }, { kind: 'spell-activation-negated', playerId: actor, count: 1 }, { kind: 'spell-destroyed', playerId: actor, count: 1 }]);
    expect(room.getView(f.counterOwner).activity).toEqual(done.activity);
  });
});
