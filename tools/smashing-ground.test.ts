import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { planResolution } from '../packages/engine/src/effect-plans.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog(), spellId = 'official:97169186';
const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const bundle = load('../data/generated/defense-spell.json'), reviews = load('../data/reviews/defense-spell.effects.json');
function setup(actor = 'a') {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'smashing-test', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '91'.repeat(32) }).state) as Mutable<DuelState>;
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  function move(name: string, owner: string, slot?: Slot, down = false) {
    const def = Object.values(registry.cards).find(c => c.name === name)!;
    const c = Object.values(state.cards).find(c => c.ownerId === owner && c.definition.id === def.id)!;
    const p = state.players.find(p => p.id === owner)!;
    const list = c.location.kind === 'hand' ? p.hand : p.deck; list.splice(list.indexOf(c.id), 1);
    if (slot === undefined) { p.hand.push(c.id); c.location = { kind: 'hand', playerId: owner }; }
    else { p.monsters[slot] = c.id; c.location = { kind: 'monster', playerId: owner, slot }; c.position = down ? 'face-down-defense' : 'face-up-attack'; }
    return c.id;
  }
  const spell = move('Smashing Ground', actor); return { state, spell, move };
}
function step(state: DuelState, actorId: string, action: EngineAction) {
  const r = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  if (!r.accepted) throw Error(r.message); assertDuelInvariants(r.state, registry); return r.state;
}
function passes(state: DuelState) { return step(step(state, state.timing.priorityPlayer!, { type: 'pass' }), state.turn.activePlayer, { type: 'pass' }); }
function settle(state: DuelState) {
  for (let n = 0; state.timing.window !== 'open' && !state.pendingDecision; n++) {
    if (n > 10) throw Error('Did not settle'); state = step(state, state.timing.priorityPlayer!, { type: 'pass' });
  }
  return state;
}
describe('Reviewed Smashing Ground highest-DEF resolution', () => {
  it('keeps import historical/implementation status separate from reviewed runtime capability', () => {
    expect(bundle.summary).toMatchObject({ imported: 1, verifiedData: 0, historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
    expect(bundle.cards[0]).toMatchObject({ textBasis: 'current-reference', verification: 'pending', legality: { maxCopies: 3, status: 'legal' } });
    expect(bundle.reviews[0].upstreamText).not.toBe(bundle.cards[0].text);
    expect(createRegistry(bundle.cards, goat200508Format).unsupportedIds).toEqual([spellId]);
    expect(registry.spellHandlers[spellId]).toEqual({ handler: 'destroy-highest-opposing-face-up-defense' });
  });
  it.each(['text', 'revision', 'legality'])('rejects stale %s review', field => {
    const cards = structuredClone(bundle.cards);
    if (field === 'text') cards[0].text += ' changed';
    if (field === 'revision') cards[0].revision++;
    if (field === 'legality') cards[0].legality.maxCopies = 1;
    expect(() => createRegistry(cards, goat200508Format, {}, reviews)).toThrow('review conflict');
  });
  it.each(['normal-spell-single-link-vanilla-v1', 'normal-spell-life-points-single-link-v1'])('rejects unrelated review scope %s', scope => {
    const changed = structuredClone(reviews); changed[0].scope = scope;
    expect(() => createRegistry(bundle.cards, goat200508Format, {}, changed)).toThrow('reviewed scope');
  });
  it.each(['a', 'b'].flatMap(actor => [false, true].map(fromSet => ({ actor, fromSet }))))('resolves for $actor fromSet=$fromSet by DEF, excluding own/hidden higher DEF', ({ actor, fromSet }) => {
    const { state, spell, move } = setup(actor), opponent = actor === 'a' ? 'b' : 'a';
    const low = move('Battle Ox', opponent, 0), high = move('Mystical Elf', opponent, 1);
    const hidden = move('Blue-Eyes White Dragon', opponent, 2, true), own = move('Blue-Eyes White Dragon', actor, 0);
    // Cover face-up Defense Position as well as face-up Attack Position.
    if (fromSet) state.cards[high]!.position = 'face-up-defense';
    let s: DuelState = state;
    if (fromSet) s = settle(step(s, actor, { type: 'set-spell', instanceId: spell, slot: 0 }));
    s = step(s, actor, { type: 'activate-spell', instanceId: spell, slot: 0 });
    expect(s.chain[0]!.targetRefs).toEqual([]); expect(s.chain[0]!.costEvents).toEqual([]); expect(s.pendingDecision).toBeNull();
    const before = s; s = step(s, opponent, { type: 'pass' }); expect(s.players.find(p => p.id === opponent)!.monsters).toContain(high);
    s = settle(step(s, actor, { type: 'pass' }));
    const enemy = s.players.find(p => p.id === opponent)!;
    expect(enemy.graveyard).toContain(high); expect(enemy.monsters).toContain(low); expect(enemy.monsters).toContain(hidden);
    expect(s.players.find(p => p.id === actor)!.monsters).toContain(own);
    expect(s.players.find(p => p.id === actor)!.graveyard).toContain(spell); expect(s.chain).toEqual([]);
    expect(before.players.find(p => p.id === opponent)!.monsters).toContain(high);
    expect(s.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
  });
  it('chooses a tied maximum only at resolution; checks actor, minimum choice and version atomically', () => {
    const { state, spell, move } = setup();
    const one = move('Mystical Elf', 'b', 0), two = move('Giant Soldier of Stone', 'b', 1), low = move('Battle Ox', 'b', 2);
    const activated = step(state, 'a', { type: 'activate-spell', instanceId: spell, slot: 0 });
    expect(activated.pendingDecision).toBeNull(); const waiting = passes(activated), d = waiting.pendingDecision!;
    expect(d).toMatchObject({ kind: 'effect-choice', playerId: 'a', min: 1, max: 1 }); expect(d.optionIds).toEqual([one, two]);
    for (const [actor, options] of [['b', [one]], ['a', [low]], ['a', [one, two]]] as const) {
      expect(applyAction(registry, waiting, { actorId: actor, expectedStateVersion: waiting.stateVersion, action: { type: 'answer-decision', decisionId: d.id, optionIds: [...options] } })).toMatchObject({ accepted: false, state: waiting });
    }
    expect(applyAction(registry, waiting, { actorId: 'a', expectedStateVersion: waiting.stateVersion - 1, action: { type: 'answer-decision', decisionId: d.id, optionIds: [two] } })).toMatchObject({ accepted: false, code: 'stale-state', state: waiting });
    const done = settle(step(waiting, 'a', { type: 'answer-decision', decisionId: d.id, optionIds: [two] }));
    expect(done.players[1].monsters[0]).toBe(one); expect(done.players[1].graveyard).toContain(two); expect(done.pendingDecision).toBeNull(); expect(done.chain).toEqual([]);
  });
  it.each([false, true])('rejects activation without opposing face-up monsters (hidden=$0), while allowing Set', hidden => {
    const { state, spell, move } = setup(); move('Blue-Eyes White Dragon', 'a', 0);
    if (hidden) move('Mystical Elf', 'b', 0, true);
    expect(applyAction(registry, state, { actorId: 'a', expectedStateVersion: state.stateVersion, action: { type: 'activate-spell', instanceId: spell, slot: 0 } })).toMatchObject({ accepted: false, code: 'invalid-target', state });
    expect(step(state, 'a', { type: 'set-spell', instanceId: spell, slot: 0 }).players[0].spellsTraps[0]).toBe(spell);
  });
  it('destroys a face-up FLIP monster without treating effect destruction as a Flip', () => {
    const { state, spell, move } = setup(), victim = move('Man-Eater Bug', 'b', 0);
    const done = settle(passes(step(state, 'a', { type: 'activate-spell', instanceId: spell, slot: 0 })));
    expect(done.players[1].graveyard).toContain(victim); expect(done.chain).toEqual([]); expect(done.pendingDecision).toBeNull(); expect(done.pendingTriggers).toEqual([]);
  });
  it.each([-1, NaN, Number.MAX_SAFE_INTEGER + 1])('rejects invalid supplied DEF %s without a fallback to ATK', defense => {
    expect(() => planResolution({ handler: 'destroy-highest-opposing-face-up-defense' }, { controllerId: 'a', monsters: [{ instanceId: 'x', controllerId: 'b', faceUp: true, attack: 1000, defense }] })).toThrow();
  });
  it('reads effective DEF from the supplied resolution board, rejects missing DEF, and handles zero DEF ties', () => {
    const h = { handler: 'destroy-highest-opposing-face-up-defense' };
    const board = { controllerId: 'a', monsters: [{ instanceId: 'x', controllerId: 'b', faceUp: true, attack: 3000, defense: 0 }, { instanceId: 'y', controllerId: 'b', faceUp: true, attack: 0, defense: 100 }] };
    expect(planResolution(h, board)).toEqual({ kind: 'destroy', instanceId: 'y' });
    board.monsters[0]!.defense = 200; expect(planResolution(h, board)).toEqual({ kind: 'destroy', instanceId: 'x' });
    board.monsters.forEach(m => { m.defense = 0; }); expect(planResolution(h, board)).toMatchObject({ kind: 'choose-destruction', optionIds: ['x', 'y'] });
    const { defense: _def, ...missing } = board.monsters[0]!;
    expect(() => planResolution(h, { ...board, monsters: [missing] })).toThrow('Missing effective DEF');
    expect(planResolution(h, { controllerId: 'a', monsters: [] })).toEqual({ kind: 'no-op' });
  });
});
