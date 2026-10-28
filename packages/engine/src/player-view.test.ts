import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRegistry } from './registry.js';
import { createDuel, applyAction, assertDuelInvariants } from './duel.js';
import { createPlayerProjection } from './player-view.js';
import { goat200508Format } from '../../card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Slot } from '../../protocol/src/duel.js';
import { runMixedSmoke } from './mixed-smoke.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const registry = createRegistry(read('../../../data/generated/pilot.json').cards, goat200508Format, {},
  read('../../../data/reviews/pilot.spell-effects.json'), read('../../../data/reviews/pilot.flip-effects.json'), read('../../../data/reviews/pilot.trap-effects.json'));
const normals = Object.values(registry.cards).filter(c => c.kind === 'normal-monster').map(c => c.id);
const deck = [...normals, ...normals, ...normals].slice(0, 40);
function start() {
  return createDuel(registry, { duelId: 'view-test', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '12'.repeat(32) }).state;
}
function put(s: Mutable<DuelState>, who: 'a' | 'b', slot: Slot, down: boolean) {
  const p = s.players.find(p => p.id === who)!, id = p.deck.shift()!;
  p.monsters[slot] = id; s.cards[id]!.location = { kind: 'monster', playerId: who, slot }; s.cards[id]!.position = down ? 'face-down-defense' : 'face-up-attack'; return id;
}
const normalized = (value: unknown) => JSON.stringify(value).replace(/[A-Za-z0-9_-]{32}/g, '<opaque>');
describe('Player view allowlist and private handle mapping', () => {
  it('shows own hand, counts the other hand, and never serializes private state or raw instance IDs', () => {
    const s = start(), { view } = createPlayerProjection(registry, s, 'a'); const json = JSON.stringify(view);
    expect(view.selfHand).toHaveLength(6); expect(view.selfHand.every(c => c.visibility === 'known')).toBe(true);
    expect(view.opponentHandCount).toBe(5); expect(view.players.map(p => p.deckCount)).toEqual([34, 35]);
    for (const id of Object.keys(s.cards)) expect(json).not.toContain(id);
    expect(json).not.toContain(s.rng.privateState);
    for (const key of ['rng', 'privateState', 'sourceAtActivation', 'sourceAtTrigger', 'lastRelevantEvents', 'cardRegistryRevision', 'counters', 'markers']) expect(json).not.toContain(`"${key}"`);
    expect(Object.isFrozen(view.selfHand)).toBe(true);
  });
  it('reveals own Set monsters, hides opposing Set monsters, exposes face-up monsters and graves', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    const own = put(s, 'a', 0, true), hidden = put(s, 'b', 0, true); put(s, 'b', 1, false);
    const grave = s.players[1].deck.shift()!; s.players[1].graveyard.push(grave); s.cards[grave]!.location = { kind: 'graveyard', playerId: 'b' }; s.cards[grave]!.position = 'face-up';
    const { view } = createPlayerProjection(registry, s, 'a');
    expect(view.players[0]!.monsters[0]).toMatchObject({ visibility: 'known', definition: s.cards[own]!.definition });
    expect(view.players[1]!.monsters[0]).toEqual({ visibility: 'hidden', handle: expect.any(String), position: 'face-down-defense' });
    expect(view.players[1]!.monsters[1]!.visibility).toBe('known'); expect(view.players[1]!.graveyard[0]!.visibility).toBe('known');
    expect(JSON.stringify(view.players[1]!.monsters[0])).not.toContain(s.cards[hidden]!.definition.id);
  });
  it('rejects non-participants and cross-viewer/cross-projection/unknown handles', () => {
    const s = start(), a = createPlayerProjection(registry, s, 'a'), b = createPlayerProjection(registry, s, 'b'), a2 = createPlayerProjection(registry, s, 'a');
    const h = a.view.selfHand[0]!.handle;
    expect(a.resolveCardHandle(h, s, 'a')).toBe(s.players[0].hand[0]);
    expect(() => createPlayerProjection(registry, s, 'spectator')).toThrow('participant');
    expect(() => a.resolveCardHandle(h, s, 'b')).toThrow();
    expect(() => b.resolveCardHandle(h, s, 'b')).toThrow();
    expect(() => a2.resolveCardHandle(h, s, 'a')).toThrow();
    expect(() => a.resolveCardHandle(s.players[0].deck[0]!, s, 'a')).toThrow();
  });
  it('rejects a previous-version mapping after a successful action', () => {
    const s = start(), p = createPlayerProjection(registry, s, 'a');
    const result = applyAction(registry, s, { actorId: s.timing.priorityPlayer, expectedStateVersion: 0, action: { type: 'pass' } });
    if (!result.accepted) throw new Error(result.message);
    expect(() => p.resolveCardHandle(p.view.selfHand[0]!.handle, result.state, 'a')).toThrow('stale');
  });
  it('keeps hidden identity/deck order changes indistinguishable after opaque tokens are normalized', () => {
    const first = structuredClone(start()) as Mutable<DuelState>; const hidden = put(first, 'b', 0, true);
    const second = structuredClone(first), alternative = second.players[1].deck.find(id => second.cards[id]!.definition.id !== second.cards[hidden]!.definition.id)!;
    [second.cards[hidden]!.definition, second.cards[alternative]!.definition] = [second.cards[alternative]!.definition, second.cards[hidden]!.definition];
    second.players[1].deck.reverse(); second.rng.privateState = 'different-server-only-state';
    expect(normalized(createPlayerProjection(registry, first, 'a').view)).toBe(normalized(createPlayerProjection(registry, second, 'a').view));
  });
  it('shows discard choices only to their player and resolves opaque options back for the engine', () => {
    const s = structuredClone(start()) as Mutable<DuelState>;
    s.pendingDecision = { id: 'internal-secret-decision', playerId: 'a', kind: 'discard', optionIds: [...s.players[0].hand], min: 1, max: 1 };
    const a = createPlayerProjection(registry, s, 'a'), b = createPlayerProjection(registry, s, 'b');
    expect(b.view.decision).toBeNull(); expect(JSON.stringify(a.view)).not.toContain('internal-secret-decision');
    const d = a.view.decision!;
    expect(a.resolveDecision(d.id, [d.optionIds[0]!], s, 'a')).toEqual({ decisionId: s.pendingDecision.id, optionIds: [s.players[0].hand[0]] });
    expect(() => a.resolveDecision(d.id, [s.players[0].hand[0]!], s, 'a')).toThrow();
    expect(() => a.resolveDecision(d.id, [d.optionIds[0]!], s, 'b')).toThrow();
  });
  it('allows targeting a hidden board card by handle without revealing its definition', () => {
    const s = structuredClone(start()) as Mutable<DuelState>, target = put(s, 'b', 0, true);
    s.pendingDecision = { id: 'target-secret', playerId: 'a', kind: 'target', optionIds: [target], min: 1, max: 1 };
    const projection = createPlayerProjection(registry, s, 'a'), d = projection.view.decision!;
    expect(d.optionIds).toEqual([projection.view.players[1]!.monsters[0]!.handle]);
    expect(projection.resolveDecision(d.id, d.optionIds, s, 'a').optionIds).toEqual([target]);
    expect(projection.view.players[1]!.monsters[0]!.visibility).toBe('hidden');
  });
  it('does not share mutable nested objects with the state and accepts a completed mixed duel', () => {
    const s = structuredClone(start()) as Mutable<DuelState>, before = structuredClone(s);
    createPlayerProjection(registry, s, 'a'); expect(s).toEqual(before); expect(Object.isFrozen(s.turn)).toBe(false);
    const finished = runMixedSmoke(registry, '08'.padStart(64, '0')).state;
    assertDuelInvariants(finished, registry);
    for (const viewer of ['a', 'b']) expect(createPlayerProjection(registry, finished, viewer).view.result).toEqual(finished.result);
  });
  it('hides opponent Set Trap identity while allowing its controller to inspect it', () => {
    const s = structuredClone(start()) as Mutable<DuelState>, p = s.players[1], id = p.deck.shift()!;
    const trap = registry.cards['official:04206964']!;
    s.cards[id]!.definition = { id: trap.id, revision: trap.revision }; s.cards[id]!.location = { kind: 'spell-trap', playerId: 'b', slot: 0 };
    s.cards[id]!.position = 'face-down'; s.cards[id]!.markers.setOnTurn = 1; p.spellsTraps[0] = id;
    expect(createPlayerProjection(registry, s, 'a').view.players[1]!.spellsTraps[0]).toEqual({ visibility: 'hidden', handle: expect.any(String), position: 'face-down' });
    expect(createPlayerProjection(registry, s, 'b').view.players[1]!.spellsTraps[0]).toMatchObject({ visibility: 'known', definition: { id: trap.id } });
  });

  it('projects Chain source as a visible handle without source snapshots or internal link IDs', () => {
    const s = structuredClone(start()) as Mutable<DuelState>, id = s.players[0].hand[0]!;
    const pot = registry.cards['official:55144522']!;
    s.cards[id]!.definition = { id: pot.id, revision: pot.revision };
    s.turn.phase = 'main1'; s.timing.window = 'open'; s.timing.consecutivePasses = 0;
    const activated = applyAction(registry, s, { actorId: 'a', expectedStateVersion: s.stateVersion, action: { type: 'activate-spell', instanceId: id, slot: 0 } });
    if (!activated.accepted) throw new Error(activated.message);
    const projection = createPlayerProjection(registry, activated.state, 'b'), chain = projection.view.chain[0]!;
    expect(chain.sourceHandle).toBe(projection.view.players[0]!.spellsTraps[0]!.handle);
    expect(chain).toEqual({ chainHandle: expect.any(String), controllerId: 'a', sourceHandle: expect.any(String), targetHandles: [], spellSpeed: 1 });
    const json = JSON.stringify(projection.view);
    expect(json).not.toContain(activated.state.chain[0]!.id); expect(json).not.toContain('sourceAtActivation');
  });

});
