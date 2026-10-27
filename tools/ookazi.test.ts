import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDeckStore, defaultDeck } from './deck-store.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { definitionFingerprint } from '../packages/engine/src/spell-review.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Phase } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const load = (path: string) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const { registry, cards, effectReviews } = loadRuntimeCatalog(), id = 'official:19523799';
const imported = load('data/generated/ookazi.json'), reviews = load('data/reviews/ookazi.effects.json');
// Fixture edits stop before the first action or creation of the command adapter.
function fixture(actor = 'a', victimLP = 8000) {
  const deck = [id, ...defaultDeck(registry)].slice(0, 40);
  const state = structuredClone(createDuel(registry, { duelId: 'ookazi-test', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '81'.repeat(32) }).state) as Mutable<DuelState>;
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  const other = actor === 'a' ? 'b' : 'a', p = state.players.find(p => p.id === actor)!;
  state.players.find(p => p.id === other)!.lifePoints = victimLP;
  const source = Object.values(state.cards).find(c => c.ownerId === actor && c.definition.id === id)!;
  if (source.location.kind === 'deck') {
    p.deck.splice(p.deck.indexOf(source.id), 1); p.hand.push(source.id); source.location = { kind: 'hand', playerId: actor };
  }
  assertDuelInvariants(state, registry);
  return { state, source: source.id, actor, other };
}
function step(state: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(state);
  const result = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  if (!result.accepted) throw new Error(result.message);
  expect(state).toEqual(before); assertDuelInvariants(result.state, registry); return result;
}
function settle(state: DuelState): DuelState {
  for (let n = 0; !state.result && state.timing.window !== 'open'; n++) {
    if (n > 8) throw new Error('Unsettled spell');
    state = step(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  }
  return state;
}
describe('Ookazi reviewed runtime scope', () => {
  it('binds only the separately reviewed definition and leaves imported historical status pending', () => {
    expect(reviews[0].definitionSha256).toBe(definitionFingerprint(imported.cards[0]));
    expect(reviews[0].evidence[0].quotation).toBe(imported.cards[0].text);
    expect(registry.spellHandlers[id]).toEqual({ handler: 'inflict-damage', amount: 800 });
    expect(createRegistry(imported.cards, goat200508Format).unsupportedIds).toEqual([id]);
    expect(imported.summary).toMatchObject({ historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
  });
  it.each(['text', 'revision', 'legality', 'scope', 'override'])('rejects %s drift instead of enabling a mismatched official definition', field => {
    const changed = structuredClone(imported.cards), review = structuredClone(reviews);
    if (field === 'text') changed[0].text += ' changed';
    if (field === 'revision') changed[0].revision++;
    if (field === 'legality') changed[0].legality.maxCopies = 1;
    if (field === 'scope') review[0].scope = 'normal-spell-single-link-vanilla-v1';
    expect(() => createRegistry(changed, goat200508Format, field === 'override' ? { [id]: { handler: 'inflict-damage', amount: 999 } } : {}, review)).toThrow();
  });
  it.each(['a', 'b'].flatMap(actor => [false, true].flatMap(fromSet => ['main1', 'main2'].map(phase => ({ actor, fromSet, phase: phase as Phase })))))('$actor fromSet=$fromSet in $phase inflicts 800 only at resolution without cost, target or summon quota', ({ actor, fromSet, phase }) => {
    const f = fixture(actor); let state: DuelState = f.state; f.state.turn.phase = phase;
    if (fromSet) state = settle(step(state, actor, { type: 'set-spell', instanceId: f.source, slot: 0 }).state);
    const quota = structuredClone(state.players.find(p => p.id === actor)!.normalSummonsOrSetsUsed);
    const active = step(state, actor, { type: 'activate-spell', instanceId: f.source, slot: 0 }).state;
    expect(active.players.map(p => p.lifePoints)).toEqual([8000, 8000]); expect(active.pendingDecision).toBeNull();
    expect(active.chain[0]).toMatchObject({ targetRefs: [], costEvents: [] });
    const first = step(active, f.other, { type: 'pass' }).state;
    expect(first.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
    const done = step(first, actor, { type: 'pass' });
    expect(done.state.players.find(p => p.id === f.other)!.lifePoints).toBe(7200);
    const caster = done.state.players.find(p => p.id === actor)!;
    expect(caster.lifePoints).toBe(8000); expect(caster.normalSummonsOrSetsUsed).toEqual(quota);
    expect(caster.graveyard).toContain(f.source); expect(caster.spellsTraps[0]).toBeNull(); expect(done.state.chain).toEqual([]);
    expect(publicResolution(done.events, done.state)).toEqual([{ kind: 'effect-damage', playerId: f.other, amount: 800 }]);
    expect(done.events.some(e => e.kind === 'battle-damage')).toBe(false);
  });
  it.each(['a', 'b'].flatMap(actor => [801, 800, 799, 1].map(lp => ({ actor, lp }))))('$actor resolves against $lp LP and ends immediately only when lethal', ({ actor, lp }) => {
    const f = fixture(actor, lp), done = settle(step(f.state, actor, { type: 'activate-spell', instanceId: f.source, slot: 0 }).state);
    expect(done.players.find(p => p.id === f.other)!.lifePoints).toBe(Math.max(0, lp - 800));
    expect(done.result).toEqual(lp <= 800 ? { winner: actor, reason: 'life-points' } : null);
    expect(done.chain).toEqual([]); expect(done.players.find(p => p.id === actor)!.graveyard).toContain(f.source);
    if (done.result) expect(applyAction(registry, done, { actorId: actor, expectedStateVersion: done.stateVersion, action: { type: 'pass' } })).toMatchObject({ accepted: false, state: done, code: 'duel-ended' });
  });
  it.each(['draw', 'standby', 'battle', 'end'] as const)('rejects %s activation without changing state', phase => {
    const f = fixture(); f.state.turn.phase = phase; const before = structuredClone(f.state);
    expect(applyAction(registry, f.state, { actorId: 'a', expectedStateVersion: f.state.stateVersion, action: { type: 'activate-spell', instanceId: f.source, slot: 0 } })).toMatchObject({ accepted: false, state: f.state });
    expect(f.state).toEqual(before);
  });
  it('rejects a wrong controller, client damage overrides and an extra Chain link without mutation', () => {
    const f = fixture(), action = { type: 'activate-spell' as const, instanceId: f.source, slot: 0 as const };
    const before = structuredClone(f.state);
    for (const [actorId, input] of [[f.other, action], [f.actor, { ...action, amount: 99999 }], [f.actor, { ...action, playerId: f.actor }]] as const) {
      const result = applyAction(registry, f.state, { actorId, expectedStateVersion: f.state.stateVersion, action: input });
      expect(result.accepted).toBe(false); expect(result.state).toBe(f.state); expect(f.state).toEqual(before);
    }
    const active = step(f.state, f.actor, action).state, copy = structuredClone(active);
    expect(applyAction(registry, active, { actorId: f.actor, expectedStateVersion: active.stateVersion, action })).toMatchObject({ accepted: false, state: active });
    expect(active).toEqual(copy);
  });
  it('needs no monster, hand cost or remaining deck cards to resolve', () => {
    const f = fixture(), caster = f.state.players[0];
    for (const instanceId of [...caster.deck, ...caster.hand.filter(card => card !== f.source)]) {
      caster.graveyard.push(instanceId); f.state.cards[instanceId]!.location = { kind: 'graveyard', playerId: 'a' };
    }
    caster.deck = []; caster.hand = [f.source]; assertDuelInvariants(f.state, registry);
    const done = settle(step(f.state, 'a', { type: 'activate-spell', instanceId: f.source, slot: 0 }).state);
    expect(done.result).toBeNull(); expect(done.players[1].lifePoints).toBe(7200);
    expect(done.players[0].deck).toEqual([]); expect(done.players[0].hand).toEqual([]);
  });
  it.each(['a', 'b'])('keeps $0 damage single-use across command retry and refreshed handles', actor => {
    const f = fixture(actor), room = createCommandAdapter(registry, f.state); let serial = 0;
    const send = (who: string, action: DuelAction) => {
      const view = room.getView(who), command = { duelId: view.duelId, expectedStateVersion: view.stateVersion, commandId: `ookazi-${++serial}`, action };
      const receipt = room.submit(who, command); expect(receipt.accepted).toBe(true); return { command, receipt };
    };
    const source = room.getView(actor).selfHand.find(c => c.visibility === 'known' && c.definition.id === id)!;
    const activation = send(actor, { type: 'activate-spell', cardHandle: source.handle, slot: 0 });
    send(f.other, { type: 'pass' }); const resolution = send(actor, { type: 'pass' });
    const before = room.getView(actor); room.refreshView(actor, true);
    for (const old of [activation, resolution]) expect(room.submit(actor, old.command)).toEqual(old.receipt);
    const after = room.getView(actor); expect(after.stateVersion).toBe(before.stateVersion); expect(after.activity).toEqual(before.activity);
    expect(after.players.find(p => p.playerId === f.other)!.lifePoints).toBe(7200);
    expect(after.activity.flatMap(a => a.resolution ?? [])).toEqual([{ kind: 'effect-damage', playerId: f.other, amount: 800 }]);
    expect(room.getView(f.other).activity).toEqual(after.activity);
  });
  it('preserves both valid saved decks, starter and all prior handlers when extending catalog 109', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'YGO Ookazi old decks '));
    try {
      const old = createRegistry(cards.filter(c => c.id !== id), goat200508Format, {}, effectReviews.spells.filter(r => r.cardId !== id), effectReviews.flips, effectReviews.traps);
      expect(Object.keys(old.cards)).toHaveLength(109);
      const store = createDeckStore(old, directory);
      for (const seat of ['a', 'b'] as const) expect((await store.save(seat, 0, seat === 'a' ? store.defaults : ['official:31560081', ...store.defaults].slice(0, 40))).ok).toBe(true);
      const before = await Promise.all(['a', 'b'].map(seat => readFile(join(directory, seat + '.json'))));
      const next = createDeckStore(registry, directory); expect(next.defaults).toEqual(store.defaults);
      for (const [index, seat] of (['a', 'b'] as const).entries()) {
        expect(next.get(seat)).toEqual(store.get(seat)); expect((await readFile(join(directory, seat + '.json'))).equals(before[index]!)).toBe(true);
      }
      for (const [key, handler] of Object.entries(old.spellHandlers)) expect(registry.spellHandlers[key]).toEqual(handler);
      expect(registry.flipHandlers).toEqual(old.flipHandlers); expect(registry.trapHandlers).toEqual(old.trapHandlers);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
