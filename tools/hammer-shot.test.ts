import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { planResolution } from '../packages/engine/src/effect-plans.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Position, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog(), spellId = 'official:26412047';
const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const bundle = load('../data/generated/hammer-shot.json'), reviews = load('../data/reviews/hammer-shot.effects.json');
function setup(actor = 'a') {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'hammer-test', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: 'a1'.repeat(32) }).state) as Mutable<DuelState>;
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  function move(name: string, owner: string, slot?: Slot, position: Position = 'face-up-attack') {
    const def = Object.values(registry.cards).find(c => c.name === name)!;
    const c = Object.values(state.cards).find(c => c.ownerId === owner && c.definition.id === def.id)!;
    const p = state.players.find(p => p.id === owner)!;
    const list = c.location.kind === 'hand' ? p.hand : p.deck; list.splice(list.indexOf(c.id), 1);
    if (slot === undefined) { p.hand.push(c.id); c.location = { kind: 'hand', playerId: owner }; }
    else { p.monsters[slot] = c.id; c.location = { kind: 'monster', playerId: owner, slot }; c.position = position; }
    return c.id;
  }
  const spell = move('Hammer Shot', actor); return { state, spell, move };
}
function step(state: DuelState, actorId: string, action: EngineAction) {
  const r = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  if (!r.accepted) throw Error(r.message); assertDuelInvariants(r.state, registry); return r.state;
}
function resolve(state: DuelState) { return step(step(state, state.timing.priorityPlayer!, { type: 'pass' }), state.turn.activePlayer, { type: 'pass' }); }
function settle(state: DuelState) {
  for (let n = 0; state.timing.window !== 'open' && !state.pendingDecision; n++) {
    if (n > 10) throw Error('Did not settle'); state = step(state, state.timing.priorityPlayer!, { type: 'pass' });
  }
  return state;
}
describe('Reviewed Hammer Shot on either field in Attack Position', () => {
  it('keeps imported historical status pending and requires a whole-definition runtime review', () => {
    expect(bundle.summary).toMatchObject({ imported: 1, verifiedData: 0, historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
    expect(bundle.cards[0]).toMatchObject({ textBasis: 'current-reference', verification: 'pending', legality: { maxCopies: 3, status: 'legal' } });
    expect(bundle.reviews[0].upstreamText).not.toBe(bundle.cards[0].text);
    expect(createRegistry(bundle.cards, goat200508Format).unsupportedIds).toEqual([spellId]);
    expect(registry.spellHandlers[spellId]).toEqual({ handler: 'destroy-highest-face-up-attack-position' });
    expect(() => createRegistry(bundle.cards, goat200508Format, { [spellId]: { handler: 'draw', count: 2 } }, reviews)).toThrow('overridden');
  });
  it.each(['text', 'revision', 'legality'])('rejects stale %s review', field => {
    const cards = structuredClone(bundle.cards);
    if (field === 'text') cards[0].text += ' changed';
    if (field === 'revision') cards[0].revision++;
    if (field === 'legality') cards[0].legality.maxCopies = 1;
    expect(() => createRegistry(cards, goat200508Format, {}, reviews)).toThrow('review conflict');
  });
  it.each(['normal-spell-single-link-vanilla-v1', 'normal-spell-life-points-single-link-v1', 'normal-spell-highest-defense-single-link-v1'])('rejects unrelated scope %s', scope => {
    const changed = structuredClone(reviews); changed[0].scope = scope;
    expect(() => createRegistry(bundle.cards, goat200508Format, {}, changed)).toThrow('reviewed scope');
  });
  it.each(['a', 'b'].flatMap(actor => [false, true].flatMap(fromSet => [false, true].map(ownVictim => ({ actor, fromSet, ownVictim })))))('actor=$actor fromSet=$fromSet ownVictim=$ownVictim destroys highest ATK in Attack Position only', ({ actor, fromSet, ownVictim }) => {
    const { state, spell, move } = setup(actor), opponent = actor === 'a' ? 'b' : 'a';
    const owner = ownVictim ? actor : opponent, otherOwner = ownVictim ? opponent : actor;
    const high = move('Dark Magician', owner, 0), low = move('Battle Ox', otherOwner, 0);
    const defender = move('Blue-Eyes White Dragon', owner, 2, 'face-up-defense');
    const hidden = move('Blue-Eyes White Dragon', otherOwner, 2, 'face-down-defense');
    let s: DuelState = state;
    if (fromSet) s = settle(step(s, actor, { type: 'set-spell', instanceId: spell, slot: 0 }));
    const before = structuredClone(s);
    const activated = step(s, actor, { type: 'activate-spell', instanceId: spell, slot: 0 });
    expect(s).toEqual(before); expect(activated.chain[0]!.targetRefs).toEqual([]); expect(activated.chain[0]!.costEvents).toEqual([]); expect(activated.pendingDecision).toBeNull();
    const first = step(activated, opponent, { type: 'pass' }); expect(first.players.find(p => p.id === owner)!.monsters).toContain(high);
    const done = settle(step(first, actor, { type: 'pass' }));
    expect(done.players.find(p => p.id === owner)!.graveyard).toContain(high);
    expect(done.players.find(p => p.id === owner)!.monsters).toContain(defender);
    expect(done.players.find(p => p.id === otherOwner)!.monsters).toEqual(expect.arrayContaining([low, hidden]));
    expect(done.players.find(p => p.id === actor)!.graveyard).toContain(spell);
    expect(done.chain).toEqual([]); expect(done.pendingDecision).toBeNull(); expect(done.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
    expect(done.players.find(p => p.id === actor)!.normalSummonsOrSetsUsed).toBe(before.players.find(p => p.id === actor)!.normalSummonsOrSetsUsed);
  });
  it.each(['a', 'b'])('controller chooses the tied maximum belonging to %s at resolution', owner => {
    const { state, spell, move } = setup(), own = move('Blue-Eyes White Dragon', 'a', 0), enemy = move('Blue-Eyes White Dragon', 'b', 0);
    const low = move('Battle Ox', 'b', 1);
    const activated = step(state, 'a', { type: 'activate-spell', instanceId: spell, slot: 0 }); expect(activated.pendingDecision).toBeNull();
    const waiting = resolve(activated), d = waiting.pendingDecision!, selected = owner === 'a' ? own : enemy;
    expect(d).toMatchObject({ kind: 'effect-choice', playerId: 'a', min: 1, max: 1 }); expect(d.optionIds).toEqual([own, enemy]);
    for (const [actor, options] of [['b', [enemy]], ['a', [low]], ['a', [own, enemy]]] as const)
      expect(applyAction(registry, waiting, { actorId: actor, expectedStateVersion: waiting.stateVersion, action: { type: 'answer-decision', decisionId: d.id, optionIds: [...options] } })).toMatchObject({ accepted: false, state: waiting });
    expect(applyAction(registry, waiting, { actorId: 'a', expectedStateVersion: waiting.stateVersion - 1, action: { type: 'answer-decision', decisionId: d.id, optionIds: [selected] } })).toMatchObject({ accepted: false, code: 'stale-state', state: waiting });
    const done = settle(step(waiting, 'a', { type: 'answer-decision', decisionId: d.id, optionIds: [selected] }));
    expect(done.players.find(p => p.id === owner)!.graveyard).toContain(selected);
    expect(done.players.find(p => p.id !== owner)!.monsters[0]).toBe(owner === 'a' ? enemy : own);
    expect(done.chain).toEqual([]); expect(done.pendingDecision).toBeNull();
  });
  it.each(['a', 'b'])('does not destroy twice when retrying a handle-based choice of player %s monster', owner => {
    const { state, move } = setup(); move('Blue-Eyes White Dragon', 'a', 0); move('Blue-Eyes White Dragon', 'b', 0);
    const room = createCommandAdapter(registry, state); let sequence = 0;
    function command(actor: string, action: DuelAction) {
      const view = room.getView(actor); return { commandId: `hammer-${++sequence}`, duelId: view.duelId, expectedStateVersion: view.stateVersion, action };
    }
    function send(actor: string, action: DuelAction) {
      const cmd = command(actor, action), receipt = room.submit(actor, cmd); expect(receipt.accepted).toBe(true); return { cmd, receipt };
    }
    const card = room.getView('a').selfHand.find(c => c.visibility === 'known' && c.definition.id === spellId)!;
    send('a', { type: 'activate-spell', cardHandle: card.handle, slot: 0 }); send('b', { type: 'pass' }); send('a', { type: 'pass' });
    const view = room.getView('a'), d = view.decision!, selected = view.players.find(p => p.playerId === owner)!.monsters[0]!;
    expect(d.optionIds).toContain(selected.handle); expect(room.getView('b').decision).toBeNull();
    const answered = send('a', { type: 'answer-decision', decisionId: d.id, optionIds: [selected.handle] });
    for (let n = 0; room.getView('a').timing.window !== 'open'; n++) {
      if (n > 10) throw Error('Did not settle'); send(room.getView('a').timing.priorityPlayer!, { type: 'pass' });
    }
    const finished = room.getView('a'); room.refreshView('a');
    expect(room.submit('a', answered.cmd)).toEqual(answered.receipt);
    expect(room.getView('a').stateVersion).toBe(finished.stateVersion); expect(room.getView('a').activity).toEqual(finished.activity);
    expect(room.getView('b').activity).toEqual(finished.activity);
    expect(finished.activity.flatMap(a => a.resolution ?? [])).toEqual([{ kind: 'effect-destroyed', count: 1 }]);
    expect(finished.players.find(p => p.playerId === owner)!.monsters[0]).toBeNull();
    expect(finished.players.find(p => p.playerId !== owner)!.monsters[0]).not.toBeNull();
  });
  it('allows activation when only the controller has an eligible monster', () => {
    const { state, spell, move } = setup(), victim = move('Battle Ox', 'a', 0);
    const done = settle(resolve(step(state, 'a', { type: 'activate-spell', instanceId: spell, slot: 0 })));
    expect(done.players[0].graveyard).toEqual(expect.arrayContaining([victim, spell])); expect(done.players[1].graveyard).toEqual([]);
  });
  it.each([null, 'face-up-defense', 'face-down-defense'] as const)('rejects activation when only %s monsters are present, but permits Set', position => {
    const { state, spell, move } = setup();
    if (position) { move('Blue-Eyes White Dragon', 'a', 0, position); move('Dark Magician', 'b', 0, position); }
    expect(applyAction(registry, state, { actorId: 'a', expectedStateVersion: state.stateVersion, action: { type: 'activate-spell', instanceId: spell, slot: 0 } })).toMatchObject({ accepted: false, code: 'invalid-target', state });
    expect(step(state, 'a', { type: 'set-spell', instanceId: spell, slot: 0 }).players[0].spellsTraps[0]).toBe(spell);
  });
  it('does not activate a destroyed face-up FLIP monster', () => {
    const { state, spell, move } = setup(), victim = move('Man-Eater Bug', 'a', 0);
    const done = settle(resolve(step(state, 'a', { type: 'activate-spell', instanceId: spell, slot: 0 })));
    expect(done.players[0].graveyard).toContain(victim); expect(done.pendingTriggers).toEqual([]); expect(done.pendingDecision).toBeNull();
  });
  it('reads current ATK at resolution and handles a zero-ATK tie across fields', () => {
    const h = { handler: 'destroy-highest-face-up-attack-position' };
    const board = { controllerId: 'a', monsters: [{ instanceId: 'own', controllerId: 'a', faceUp: true, position: 'face-up-attack', attack: 10 }, { instanceId: 'enemy', controllerId: 'b', faceUp: true, position: 'face-up-attack', attack: 20 }] };
    const before = structuredClone(board); expect(planResolution(h, board)).toEqual({ kind: 'destroy', instanceId: 'enemy' }); expect(board).toEqual(before);
    board.monsters[0]!.attack = 30; expect(planResolution(h, board)).toEqual({ kind: 'destroy', instanceId: 'own' });
    board.monsters.forEach(m => { m.attack = 0; }); expect(planResolution(h, board)).toMatchObject({ kind: 'choose-destruction', playerId: 'a', optionIds: ['own', 'enemy'] });
    expect(planResolution(h, { controllerId: 'a', monsters: [] })).toEqual({ kind: 'no-op' });
  });
  it.each([{ position: undefined, faceUp: true }, { position: 'face-up-attack', faceUp: false }, { position: 'face-down-attack', faceUp: false }])('rejects missing/inconsistent/unsupported position %j', partial => {
    expect(() => planResolution({ handler: 'destroy-highest-face-up-attack-position' }, { controllerId: 'a', monsters: [{ instanceId: 'x', controllerId: 'b', attack: 2000, ...partial }] })).toThrow();
  });
});
