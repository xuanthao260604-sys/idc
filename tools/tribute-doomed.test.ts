import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import { planResolution } from '../packages/engine/src/effect-plans.js';
import { importBatch } from './card-import/src/pipeline.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Position, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog(), id = 'official:79759861';
const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const bundle = load('../data/generated/tribute-doomed.json'), reviews = load('../data/reviews/tribute-doomed.effects.json');
function setup(actor = 'a', ownTarget = false, down = true) {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'discard-spell', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: 'b1'.repeat(32) }).state) as Mutable<DuelState>;
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  function move(name: string, owner: string, slot?: Slot, position: Position = 'face-up-attack') {
    const def = Object.values(registry.cards).find(c => c.name === name)!;
    const card = Object.values(state.cards).find(c => c.ownerId === owner && c.definition.id === def.id)!;
    const p = state.players.find(p => p.id === owner)!;
    const list = card.location.kind === 'hand' ? p.hand : p.deck; list.splice(list.indexOf(card.id), 1);
    if (slot === undefined) { p.hand.push(card.id); card.location = { kind: 'hand', playerId: owner }; }
    else { p.monsters[slot] = card.id; card.location = { kind: 'monster', playerId: owner, slot }; card.position = position; }
    return card.id;
  }
  const other = actor === 'a' ? 'b' : 'a', owner = ownTarget ? actor : other;
  const spell = move('Tribute to The Doomed', actor), cost = move('Battle Ox', actor);
  const target = move('Man-Eater Bug', owner, 0, down ? 'face-down-defense' : 'face-up-attack');
  return { state, spell, cost, target, owner, actor, other, move };
}
function act(state: DuelState, actorId: string, action: EngineAction) { return applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action }); }
function step(state: DuelState, actorId: string, action: EngineAction) {
  const r = act(state, actorId, action); if (!r.accepted) throw Error(r.message); assertDuelInvariants(r.state, registry); return r;
}
function settle(state: DuelState) {
  for (let n = 0; state.timing.window !== 'open'; n++) {
    if (n > 10) throw Error('Did not settle'); state = step(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  }
  return state;
}
const action = (f: ReturnType<typeof setup>): EngineAction => ({ type: 'activate-spell', instanceId: f.spell, slot: 0, discardId: f.cost, targetId: f.target });
describe('Tribute to The Doomed discard cost and activation target', () => {
  it('separates pending import from reviewed runtime and retains both sourced name spellings', () => {
    expect(bundle.summary).toMatchObject({ imported: 1, verifiedData: 0, historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
    expect(bundle.cards[0]).toMatchObject({ name: 'Tribute to The Doomed', textBasis: 'current-reference', verification: 'pending', legality: { maxCopies: 3 } });
    expect(bundle.reviews[0].upstreamName).toBe('Tribute to the Doomed');
    expect(createRegistry(bundle.cards, goat200508Format).unsupportedIds).toEqual([id]);
    expect(registry.spellHandlers[id]).toEqual({ handler: 'discard-destroy-target-monster' });
    expect(() => createRegistry(bundle.cards, goat200508Format, { [id]: { handler: 'draw', count: 2 } }, reviews)).toThrow('overridden');
  });
  it.each([undefined, 'Unreviewed name'])('refuses a missing or incorrect canonical name patch %s', name => {
    const receipt = load('../data/import/tribute-doomed.receipt.json'), overlays = load('../data/reviews/tribute-doomed.overlays.json');
    if (name === undefined) delete overlays[0].patch.name; else overlays[0].patch.name = name;
    expect(() => importBatch({ raw: readFileSync(new URL(`../data/raw/ygoprodeck/${receipt.sha256}.json`, import.meta.url), 'utf8'), receipt, overlays,
      manifest: load('../data/import/tribute-doomed.manifest.json'), official: [load('../data/evidence/konami/4856.json')] })).toThrow(name === undefined ? 'Official facts mismatch' : 'casing correction');
  });
  it.each(['name', 'text', 'revision', 'legality'])('rejects whole-definition %s drift', field => {
    const cards = structuredClone(bundle.cards);
    if (field === 'revision') cards[0].revision++; else if (field === 'legality') cards[0].legality.maxCopies = 1; else cards[0][field] += ' changed';
    expect(() => createRegistry(cards, goat200508Format, {}, reviews)).toThrow('review conflict');
  });
  it.each(['normal-spell-single-link-vanilla-v1', 'normal-spell-life-points-single-link-v1'])('rejects unrelated scope %s', scope => {
    const changed = structuredClone(reviews); changed[0].scope = scope;
    expect(() => createRegistry(bundle.cards, goat200508Format, {}, changed)).toThrow('reviewed scope');
  });
  const scenarios = ['a', 'b'].flatMap(actor => [false, true].flatMap(fromSet => [false, true].flatMap(own => [false, true].map(down => ({ actor, fromSet, own, down })))));
  it.each(scenarios)('actor=$actor fromSet=$fromSet own=$own down=$down pays now and destroys only after responses', ({ actor, fromSet, own, down }) => {
    const f = setup(actor, own, down); let s: DuelState = f.state;
    if (fromSet) s = settle(step(s, actor, { type: 'set-spell', instanceId: f.spell, slot: 0 }).state);
    const before = structuredClone(s), handBefore = s.players.find(p => p.id === actor)!.hand.length;
    const activation = step(s, actor, action(f)); expect(s).toEqual(before); s = activation.state;
    const caster = s.players.find(p => p.id === actor)!;
    expect(caster.hand).toHaveLength(handBefore - (fromSet ? 1 : 2)); expect(caster.graveyard).toContain(f.cost); expect(caster.graveyard).not.toContain(f.spell);
    expect(s.players.find(p => p.id === f.owner)!.monsters[0]).toBe(f.target);
    expect(s.chain[0]!.targetRefs).toEqual([{ instanceId: f.target, locationAtSelection: { kind: 'monster', playerId: f.owner, slot: 0 } }]);
    expect(s.chain[0]!.costEvents).toHaveLength(1); expect(s.chain[0]!.costEvents[0]).toMatchObject({ kind: 'cards-discarded', affectedInstances: [f.cost], details: { reason: 'activation-cost', playerId: actor } });
    expect(s.chain[0]!.costEvents[0]!.sequence).toBeLessThan(activation.events.find(e => e.kind === 'spell-activated')!.sequence);
    expect(publicResolution(activation.events, s)).toEqual([{ kind: 'discard-cost', playerId: actor, count: 1 }]); expect(s.pendingDecision).toBeNull();
    s = step(s, f.other, { type: 'pass' }).state; expect(s.players.find(p => p.id === f.owner)!.monsters[0]).toBe(f.target);
    const resolved = step(s, actor, { type: 'pass' });
    expect(publicResolution(resolved.events, resolved.state)).toEqual([{ kind: 'effect-destroyed', count: 1 }]);
    const done = settle(resolved.state); expect(done.players.find(p => p.id === f.owner)!.graveyard).toContain(f.target);
    expect(done.players.find(p => p.id === actor)!.graveyard).toEqual(expect.arrayContaining([f.cost, f.spell]));
    expect(done.chain).toEqual([]); expect(done.pendingTriggers).toEqual([]); expect(done.pendingDecision).toBeNull(); expect(done.players.map(p => p.lifePoints)).toEqual([8000, 8000]);
  });
  it.each(['Mystical Elf', 'Hinotama', 'Trap Hole', 'Hane-Hane'])('accepts a %s as the one discarded hand card', name => {
    const f = setup(); f.cost = f.move(name, 'a');
    const done = settle(step(f.state, 'a', action(f)).state);
    expect(done.players[0].graveyard).toContain(f.cost); expect(done.pendingTriggers).toEqual([]);
  });
  it('can target a face-up Defense Position monster', () => {
    const f = setup(); f.state.cards[f.target]!.position = 'face-up-defense';
    expect(settle(step(f.state, 'a', action(f)).state).players[1].graveyard).toContain(f.target);
  });
  it.each(['source', 'opponent-hand', 'deck', 'field', 'unknown'])('rejects invalid discard %s atomically', mode => {
    const f = setup();
    const discardId = mode === 'source' ? f.spell : mode === 'opponent-hand' ? f.state.players[1].hand[0]! : mode === 'deck' ? f.state.players[0].deck[0]! : mode === 'field' ? f.target : 'unknown';
    const before = structuredClone(f.state);
    expect(act(f.state, 'a', { type: 'activate-spell', instanceId: f.spell, slot: 0, discardId, targetId: f.target })).toMatchObject({ accepted: false, code: 'unpayable-cost', state: f.state }); expect(f.state).toEqual(before);
  });
  it.each(['hand', 'spell-source', 'unknown'])('rejects invalid target %s without paying a valid cost', mode => {
    const f = setup(), targetId = mode === 'hand' ? f.cost : mode === 'spell-source' ? f.spell : 'unknown';
    expect(act(f.state, 'a', { type: 'activate-spell', instanceId: f.spell, slot: 0, discardId: f.cost, targetId })).toMatchObject({ accepted: false, code: 'invalid-target', state: f.state });
    expect(f.state.players[0].hand).toContain(f.cost); expect(f.state.players[0].graveyard).not.toContain(f.cost);
  });
  it.each(['neither', 'cost-only', 'target-only'])('requires a complete activation intent: %s', mode => {
    const f = setup(); expect(act(f.state, 'a', { type: 'activate-spell', instanceId: f.spell, slot: 0,
      ...(mode === 'cost-only' ? { discardId: f.cost } : {}), ...(mode === 'target-only' ? { targetId: f.target } : {}) })).toMatchObject({ accepted: false, code: 'invalid-action', state: f.state });
  });
  it('cannot activate from hand or own Set without another hand card to pay', () => {
    const f = setup(), p = f.state.players[0];
    for (const cardId of [...p.hand]) if (cardId !== f.spell) {
      p.hand.splice(p.hand.indexOf(cardId), 1); p.graveyard.push(cardId); f.state.cards[cardId]!.location = { kind: 'graveyard', playerId: 'a' };
    }
    expect(act(f.state, 'a', action(f))).toMatchObject({ accepted: false, code: 'unpayable-cost', state: f.state });
    const set = settle(step(f.state, 'a', { type: 'set-spell', instanceId: f.spell, slot: 0 }).state);
    const view = createCommandAdapter(registry, set).getView('a', true);
    expect(view.selfHand).toHaveLength(0); expect(view.availableActions!.filter(a => a.type === 'activate-spell')).toEqual([]);
    expect(act(set, 'a', action(f))).toMatchObject({ accepted: false, code: 'unpayable-cost', state: set });
  });
  it.each(['draw', 'battle', 'end'] as const)('rejects a paid-target intent in %s before paying', phase => {
    const f = setup(); f.state.turn.phase = phase;
    expect(act(f.state, 'a', action(f))).toMatchObject({ accepted: false, state: f.state }); expect(f.state.players[0].hand).toContain(f.cost);
  });
  it('rejects the other player before paying an activation cost', () => {
    const f = setup(); expect(act(f.state, 'b', action(f))).toMatchObject({ accepted: false, state: f.state }); expect(f.state.players[0].hand).toContain(f.cost);
  });
  it('cannot discard again or add another Spell while the first link waits', () => {
    const f = setup(); const activated = step(f.state, 'a', action(f)).state;
    const rejected = act(activated, 'a', action(f)); expect(rejected).toMatchObject({ accepted: false, state: activated });
    expect(activated.players[0].graveyard.filter(x => x === f.cost)).toHaveLength(1);
  });
  it('does not allow adding discard/target arguments to a non-targeting Spell', () => {
    const f = setup(), pot = f.move('Pot of Greed', 'a');
    expect(act(f.state, 'a', { type: 'activate-spell', instanceId: pot, slot: 0, discardId: f.cost, targetId: f.target })).toMatchObject({ accepted: false, code: 'invalid-action', state: f.state });
  });
  it.each(['cost-missing', 'wrong-cost-reason', 'target-missing', 'target-unknown', 'target-spell', 'cost-sequence', 'cost-count'])('rejects a forged supported Chain: %s', mode => {
    const f = setup(), active = structuredClone(step(f.state, 'a', action(f)).state) as Mutable<DuelState>;
    if (mode === 'cost-missing') active.chain[0]!.costEvents = [];
    if (mode === 'wrong-cost-reason') active.chain[0]!.costEvents[0]!.details = { playerId: 'a', reason: 'effect' };
    if (mode === 'target-missing') active.chain[0]!.targetRefs = [];
    if (mode === 'target-unknown') active.chain[0]!.targetRefs[0]!.instanceId = 'unknown';
    if (mode === 'target-spell') active.chain[0]!.targetRefs[0]!.instanceId = f.spell;
    if (mode === 'cost-sequence') active.chain[0]!.costEvents[0]!.sequence = NaN;
    if (mode === 'cost-count') active.chain[0]!.costEvents[0]!.affectedInstances.push(f.spell);
    expect(() => assertDuelInvariants(active, registry)).toThrow('Invalid supported Chain');
  });
  it('discovers actions without paying and retries one public activation without discarding twice', () => {
    const f = setup(), room = createCommandAdapter(registry, f.state); let seq = 0;
    const command = (actor: string, action: DuelAction) => { const v = room.getView(actor); return { commandId: `discard-${++seq}`, duelId: v.duelId, expectedStateVersion: v.stateVersion, action }; };
    const before = room.getView('a'); const view = room.getView('a', true);
    const card = view.selfHand.find(c => c.visibility === 'known' && c.definition.id === id)!;
    const cost = view.selfHand.find(c => c.visibility === 'known' && c.definition.id === 'official:05053103')!;
    const target = view.players[1]!.monsters[0]!; expect(target.visibility).toBe('hidden');
    const intent: DuelAction = { type: 'activate-spell', cardHandle: card.handle, slot: 0, discardHandle: cost.handle, targetHandle: target.handle };
    expect(view.availableActions).toContainEqual(intent); expect(room.getView('a').activity).toEqual([]); expect(room.getView('a').selfHand).toEqual(before.selfHand);
    const cmd = command('a', intent), receipt = room.submit('a', cmd); expect(receipt.accepted).toBe(true); expect(room.submit('a', cmd)).toEqual(receipt);
    expect(room.getView('a').players[1]!.monsters[0]!.visibility).toBe('hidden'); expect(room.getView('b').players[1]!.monsters[0]!.visibility).toBe('known'); expect(room.getView('a').chain[0]!.targetHandles).toHaveLength(1);
    for (let n = 0; room.getView('a').timing.window !== 'open'; n++) {
      if (n > 10) throw Error('Did not settle'); const actor = room.getView('a').timing.priorityPlayer!;
      expect(room.submit(actor, command(actor, { type: 'pass' })).accepted).toBe(true);
    }
    const done = room.getView('a'); room.refreshView('a'); expect(room.submit('a', cmd)).toEqual(receipt);
    expect(room.getView('a').stateVersion).toBe(done.stateVersion); expect(room.getView('a').activity).toEqual(done.activity); expect(room.getView('b').activity).toEqual(done.activity);
    expect(done.selfHand).toHaveLength(before.selfHand.length - 2);
    expect(done.activity.flatMap(x => x.resolution ?? [])).toEqual([{ kind: 'discard-cost', playerId: 'a', count: 1 }, { kind: 'effect-destroyed', count: 1 }]);
    expect(JSON.stringify(done)).not.toContain(f.target);
  });
  it('uses an explicit selected-target plan rather than falling through to minimum ATK', () => {
    expect(planResolution({ handler: 'discard-destroy-target-monster' }, { controllerId: 'a', monsters: [] })).toEqual({ kind: 'destroy-selected-monster' });
  });
});
