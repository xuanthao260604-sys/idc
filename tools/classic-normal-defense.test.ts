import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { projectRoot } from './project-root.js';
import { defaultDeck } from './deck-store.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import type { DuelState, PlayerId } from '../packages/protocol/src/duel.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const load = (path: string) => JSON.parse(readFileSync(join(projectRoot, path), 'utf8'));
const manifest = { cards: ['classic-10e','classic-10f'].flatMap(batch => load(`data/import/${batch}.manifest.json`).cards) } as { cards: { passcode: string; konamiId: number; expectedName: string }[] };
const { registry } = loadRuntimeCatalog();

describe('Sourced expansion DEF through a revealed defense battle', () => {
  it.each(manifest.cards)('$expectedName uses its exact reviewed DEF, including zero and 1530', entry => {
    const proof = load(`data/evidence/konami/${entry.konamiId}.json`);
    const definitionId = `official:${entry.passcode}`;
    const deck = [definitionId, ...defaultDeck(registry).filter(id => id !== definitionId)].slice(0, 40);
    let state = structuredClone(createDuel(registry, { duelId: 'classic-normal-defense', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: '31'.repeat(32) }).state) as Mutable<DuelState>;
    state.turn.number = 3; state.turn.phase = 'main1'; state.timing.window = 'open'; state.timing.priorityPlayer = 'a'; state.timing.consecutivePasses = 0;
    const place = (owner: PlayerId, id: string, down: boolean) => {
      const player = state.players.find(p => p.id === owner)!;
      const card = Object.values(state.cards).find(c => c.ownerId === owner && c.definition.id === id && ['hand', 'deck'].includes(c.location.kind))!;
      const list = card.location.kind === 'hand' ? player.hand : player.deck;
      list.splice(list.indexOf(card.id), 1); player.monsters[0] = card.id;
      card.location = { kind: 'monster', playerId: owner, slot: 0 };
      card.position = down ? 'face-down-defense' : 'face-up-attack';
      if (down) card.markers.setOnTurn = 2;
      return card.id;
    };
    // A fixed 300 ATK attacker makes every nonzero DEF in this batch cause
    // independently sourced reflection damage; DEF 0 instead destroys the defender.
    const attacker = place('a', 'official:32274490', false), defender = place('b', definitionId, true);
    assertDuelInvariants(state, registry);
    const settle = (initial: DuelState) => {
      let current = initial;
      for (let n = 0; current.timing.window !== 'open'; n++) {
        if (n > 12) throw new Error('Defense battle did not settle');
        const pass = applyAction(registry, current, { actorId: current.timing.priorityPlayer!, expectedStateVersion: current.stateVersion, action: { type: 'pass' } });
        if (!pass.accepted) throw new Error(pass.message); current = pass.state;
      }
      return current;
    };
    const phase = applyAction(registry, state, { actorId: 'a', expectedStateVersion: state.stateVersion, action: { type: 'request-phase', phase: 'battle' } });
    if (!phase.accepted) throw new Error(phase.message);
    const ready = settle(phase.state);
    const attack = applyAction(registry, ready, { actorId: 'a', expectedStateVersion: ready.stateVersion, action: { type: 'declare-attack', attackerId: attacker, targetId: defender } });
    if (!attack.accepted) throw new Error(attack.message);
    const done = settle(attack.state);
    expect(done.players[0].lifePoints).toBe(8000 - Math.max(0, proof.currentFacts.defense - 300));
    expect(done.players[1].lifePoints).toBe(8000); // No piercing damage.
    if (proof.currentFacts.defense < 300) {
      expect(done.players[1].graveyard).toContain(defender); expect(done.players[1].monsters[0]).toBeNull();
    } else {
      expect(done.players[1].monsters[0]).toBe(defender); expect(done.cards[defender]!.position).toBe('face-up-defense');
    }
    expect(done.players[0].monsters[0]).toBe(attacker); assertDuelInvariants(done, registry);
  });
});
