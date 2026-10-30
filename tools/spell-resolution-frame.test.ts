import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { prepareSpellResolution, assertSpellResolution } from '../packages/engine/src/spell-resolution.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog();
const spells = ['Fissure', 'Smashing Ground', 'Hammer Shot'];
function fixture(name = 'Fissure', actor = 'a', phase: 'main1' | 'main2' = 'main1') {
  const deck = [...Object.keys(registry.cards), 'official:05053103'];
  const state = structuredClone(createDuel(registry, { duelId: 'spell-frame', players: [{ id: 'a', deck }, { id: 'b', deck }],
    firstPlayerId: actor, seedHex: 'ce'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of state.players) for (const id of p.hand.splice(0)) { p.deck.push(id); state.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  const other = actor === 'a' ? 'b' : 'a';
  state.turn.number = 3; state.turn.phase = phase; state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  const move = (name: string, who: string, zone: 'hand' | 'monster' | 'graveyard' | 'spell-trap', slot: Slot = 0, down = false) => {
    const p = state.players.find(p => p.id === who)!, def = Object.values(registry.cards).find(d => d.name === name)!;
    const id = p.deck.find(id => state.cards[id]!.definition.id === def.id)!; if (!id) throw new Error('Missing fixture ' + name);
    p.deck.splice(p.deck.indexOf(id), 1); const card = state.cards[id]!;
    if (zone === 'monster' || zone === 'spell-trap') {
      (zone === 'monster' ? p.monsters : p.spellsTraps)[slot] = id; card.location = { kind: zone, playerId: who, slot };
      card.position = zone === 'spell-trap' ? 'face-down' : down ? 'face-down-defense' : 'face-up-attack';
      if (down || zone === 'spell-trap') card.markers.setOnTurn = 2;
    } else { p[zone].push(id); card.location = { kind: zone, playerId: who }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; }
    return id;
  };
  const source = move(name, actor, 'hand');
  // Equal real stats, never modified test-only ATK/DEF. Hammer also covers choosing one's own monster.
  const candidates = [move('Battle Ox', name === 'Hammer Shot' ? actor : other, 'monster', 0), move('Battle Ox', other, 'monster', 1)];
  const hidden = move('Man-Eater Bug', other, 'monster', 3, true);
  const magic = move('Magic Jammer', other, 'spell-trap', 4), cost = move('Skull Servant', other, 'hand');
  move('Mystical Elf', actor, 'graveyard'); move('Celtic Guardian', other, 'graveyard');
  const orderedCandidates = state.players.flatMap(p => p.monsters.filter((id): id is string => id !== null && candidates.includes(id)));
  return { state, name, actor, other, source, candidates: orderedCandidates, hidden, magic, cost };
}
function act(state: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(state), result = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(state).toEqual(before); if (!result.accepted) throw new Error(result.message); assertDuelInvariants(result.state, registry); return result;
}
function settle(state: DuelState) {
  for (let n = 0; state.timing.window !== 'open'; n++) {
    if (n > 10 || state.pendingDecision) throw new Error('Unexpected pending state');
    state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  } return state;
}
function activate(f: ReturnType<typeof fixture>, fromSet = false) {
  const initial = fromSet ? settle(act(f.state, f.actor, { type: 'set-spell', instanceId: f.source, slot: 0 }).state) : f.state;
  return act(initial, f.actor, { type: 'activate-spell', instanceId: f.source, slot: 0 }).state;
}
function pause(f: ReturnType<typeof fixture>, fromSet = false) {
  let state = activate(f, fromSet);
  expect(state.spellResolution).toBeNull(); state = act(state, f.other, { type: 'pass' }).state;
  expect(state.spellResolution).toBeNull(); return act(state, f.actor, { type: 'pass' });
}
function reject(state: DuelState, actorId: string, action: unknown, version = state.stateVersion) {
  const before = structuredClone(state), result = applyAction(registry, state, { actorId, expectedStateVersion: version, action });
  expect(result.accepted).toBe(false); expect(result.state).toBe(state); expect(state).toEqual(before); return result;
}

describe('server frame pins the original Spell while its existing effect waits for a choice', () => {
  it.each(spells.flatMap(name => ['a','b'].flatMap(actor => [false,true].flatMap(fromSet =>
    (['main1','main2'] as const).map(phase => ({ name, actor, fromSet, phase }))))))(
    '$name $actor $phase fromSet=$fromSet resumes once and clears the root context', ({ name, actor, fromSet, phase }) => {
      const f = fixture(name, actor, phase), waiting = pause(f, fromSet), state = waiting.state, frame = state.spellResolution!;
      expect(frame).toMatchObject({ version: 1, kind: 'normal-spell-single-link-v1', stage: 'effect-choice', duelId: state.id,
        registryRevision: registry.revision, rootLinkId: state.chain[0]!.id, rootSourceId: f.source,
        cleanupSourceIds: [f.source], choice: { playerId: actor, optionIds: f.candidates } });
      expect(frame.boardFingerprint).toMatch(/^[a-f0-9]{64}$/); expect(Object.isFrozen(frame.choice.optionIds)).toBe(true);
      expect(waiting.events.some(e => ['effect-destroyed','sent-to-graveyard','spell-activated'].includes(e.kind))).toBe(false);
      expect(state.cards[f.source]!.location.kind).toBe('spell-trap'); expect(state.cards[f.source]!.position).toBe('face-up');
      for (const id of f.candidates) expect(state.cards[id]!.location.kind).toBe('monster');
      const restored = JSON.parse(JSON.stringify(state)) as DuelState; assertDuelInvariants(restored, registry); assertSpellResolution(registry, restored);
      const selected = f.candidates[fromSet ? 1 : 0]!, survivor = f.candidates[fromSet ? 0 : 1]!;
      const done = act(restored, actor, { type: 'answer-decision', decisionId: restored.pendingDecision!.id, optionIds: [selected] });
      expect(done.state.spellResolution).toBeNull(); expect(done.state.chainCleanup).toBeNull(); expect(done.state.chain).toEqual([]); expect(done.state.pendingDecision).toBeNull();
      expect(done.state.cards[selected]!.location.kind).toBe('graveyard'); expect(done.state.cards[survivor]).toEqual(state.cards[survivor]);
      expect(done.state.cards[f.hidden]).toEqual(state.cards[f.hidden]);
      for (const p of done.state.players) {
        const old = state.players.find(o => o.id === p.id)!, added = [selected, f.source].filter(id => state.cards[id]!.ownerId === p.id);
        expect(p.graveyard).toEqual([...old.graveyard, ...added]); expect(p.lifePoints).toBe(old.lifePoints);
        expect(p.hand).toEqual(old.hand); expect(p.deck).toEqual(old.deck); expect(p.normalSummonsOrSetsUsed).toBe(old.normalSummonsOrSetsUsed);
      }
      expect(done.events.map(e => e.kind)).toEqual(['effect-destroyed','sent-to-graveyard','chain-resolved']);
      reject(done.state, actor, { type: 'answer-decision', decisionId: state.pendingDecision!.id, optionIds: [selected] });
    });

  it.each(['missing-frame','root-link','root-source','cleanup-source','cleanup-extra','choice-player','choice-options','choice-order','fingerprint',
    'unknown-field','stage','duel','registry','pending-options','coordinated-options','extra-link','pending-min','pending-player','pending-id','priority','passes','phase','source-snapshot','board-lp','board-position'])('rejects corrupted %s context before transition', mode => {
    const f = fixture(), state = structuredClone(pause(f).state) as Mutable<DuelState>;
    const frame = state.spellResolution! as Mutable<NonNullable<DuelState['spellResolution']>> & { extra?: boolean };
    if (mode === 'missing-frame') state.spellResolution = null;
    if (mode === 'root-link') frame.rootLinkId = 'old-link';
    if (mode === 'root-source') frame.rootSourceId = f.hidden;
    if (mode === 'cleanup-source') frame.cleanupSourceIds[0] = f.hidden;
    if (mode === 'cleanup-extra') (frame.cleanupSourceIds as string[]).push(f.magic);
    if (mode === 'choice-player') frame.choice.playerId = f.other;
    if (mode === 'choice-options') frame.choice.optionIds.push(f.hidden);
    if (mode === 'choice-order') frame.choice.optionIds.reverse();
    if (mode === 'fingerprint') frame.boardFingerprint = '0'.repeat(64);
    if (mode === 'unknown-field') frame.extra = true;
    if (mode === 'stage') (frame as unknown as { stage: string }).stage = 'cleanup';
    if (mode === 'duel') frame.duelId += '-old';
    if (mode === 'registry') frame.registryRevision += '-old';
    if (mode === 'pending-options') state.pendingDecision!.optionIds.push(f.hidden);
    if (mode === 'coordinated-options') { frame.choice.optionIds = [f.hidden,f.source]; state.pendingDecision!.optionIds = [f.hidden,f.source]; }
    if (mode === 'extra-link') state.chain.push({ ...structuredClone(state.chain[0]!), id:'unreviewed-extra-link' });
    if (mode === 'pending-min') state.pendingDecision!.min = 0;
    if (mode === 'pending-player') state.pendingDecision!.playerId = f.other;
    if (mode === 'pending-id') state.pendingDecision!.id += '-old';
    if (mode === 'priority') state.timing.priorityPlayer = f.actor;
    if (mode === 'passes') state.timing.consecutivePasses = 1;
    if (mode === 'phase') state.turn.phase = 'battle';
    if (mode === 'source-snapshot') state.chain[0]!.sourceAtActivation.id = 'fake';
    if (mode === 'board-lp') state.players[0].lifePoints--;
    if (mode === 'board-position') state.cards[f.candidates[0]!]!.position = 'face-up-defense';
    expect(() => assertDuelInvariants(state, registry)).toThrow();
  });

  it.each(['wrong-player','missing','duplicate','extra','hidden','source','wrong-id','stale','pass','phase'])('rejects %s answer without consuming the frame', mode => {
    const f = fixture(), state = pause(f).state, decision = state.pendingDecision!;
    let who = f.actor, version = state.stateVersion;
    let action: unknown = { type: 'answer-decision', decisionId: decision.id, optionIds: [f.candidates[0]] };
    if (mode === 'wrong-player') who = f.other;
    if (['missing','duplicate','extra','hidden','source','wrong-id'].includes(mode)) action = { type: 'answer-decision', decisionId: mode === 'wrong-id' ? 'old' : decision.id,
      optionIds: mode === 'missing' ? [] : mode === 'duplicate' ? [f.candidates[0],f.candidates[0]] : mode === 'extra' ? f.candidates : [mode === 'hidden' ? f.hidden : mode === 'source' ? f.source : f.candidates[0]] };
    if (mode === 'stale') version--;
    if (mode === 'pass') action = { type: 'pass' };
    if (mode === 'phase') action = { type: 'request-phase', phase: 'end' };
    reject(state, who, action, version); expect(state.spellResolution).not.toBeNull();
  });

  it.each(spells)('%s never creates a frame if Magic Jammer negates its activation', name => {
    const f = fixture(name); let state = activate(f);
    state = act(state, f.other, { type: 'activate-counter-trap', instanceId: f.magic, discardId: f.cost, respondingToLinkId: state.chain[0]!.id }).state;
    state = act(state, f.actor, { type: 'pass' }).state; state = act(state, f.other, { type: 'pass' }).state;
    expect(state.spellResolution).toBeNull(); expect(state.pendingDecision).toBeNull();
    for (const id of f.candidates) expect(state.cards[id]!.location.kind).toBe('monster');
  });

  it.each(['a','b'])('%s may concede without resolving the paused Spell or leaving a context', who => {
    const f = fixture(), state = pause(f).state, done = act(state, who, { type: 'concede' });
    expect(done.state.spellResolution).toBeNull(); expect(done.state.pendingDecision).toBeNull(); expect(done.state.chain).toEqual([]);
    for (const id of [f.source, ...f.candidates]) expect(done.state.cards[id]).toEqual(state.cards[id]);
    expect(done.events.map(e => e.kind)).toEqual(['duel-ended']);
  });

  it('does not create another frame for an existing pending resolution or a completed/open Chain', () => {
    const f = fixture(), state = pause(f).state;
    expect(() => prepareSpellResolution(registry, state)).toThrow();
    expect(() => prepareSpellResolution(registry, f.state)).toThrow();
    const next = createDuel(registry, { duelId: 'new-spell-game', players: f.state.players.map(p => ({ id: p.id, deck: Object.keys(registry.cards) })) as [{id:string;deck:string[]},{id:string;deck:string[]}] }).state;
    expect(next.spellResolution).toBeNull(); expect(next.chainCleanup).toBeNull();
  });
});

describe.each(['a','b'])('private Spell choice frame for %s', actor => {
  it('keeps frame/raw IDs hidden, preserves exact handles and deduplicates the resume receipt', () => {
    const f = fixture('Hammer Shot', actor), state = pause(f).state, room = createCommandAdapter(registry, state); let serial = 0;
    const cmd = (who: string, action: DuelAction) => { const view = room.getView(who); return { commandId: 'frame-'+ ++serial, duelId: view.duelId, expectedStateVersion: view.stateVersion, action }; };
    const own = room.getView(actor, true), other = room.getView(f.other, true), decision = own.decision!;
    expect(other.decision).toBeNull(); expect(own.availableActions).toEqual([{type:'concede'}]); expect(other.availableActions).toEqual([{type:'concede'}]);
    const publicText = JSON.stringify([own,other]);
    for (const key of ['spellResolution','boardFingerprint','cleanupSourceIds','rootLinkId','sourceAtActivation']) expect(publicText).not.toContain(key);
    for (const id of Object.keys(state.cards)) expect(publicText).not.toContain(id);
    const old = cmd(actor, { type:'answer-decision', decisionId:decision.id, optionIds:[decision.optionIds[0]!] });
    room.refreshView(actor); expect(room.submit(actor,old)).toMatchObject({accepted:false,reason:'invalid-choice'});
    const current = room.getView(actor), d = current.decision!;
    const foreign = room.getView(f.other).players.flatMap(p=>p.monsters).find(Boolean)!.handle;
    for(const handles of [[foreign],[f.candidates[0]!],[d.optionIds[0]!,d.optionIds[0]!]]) {
      expect(room.submit(actor,cmd(actor,{type:'answer-decision',decisionId:d.id,optionIds:handles})).accepted).toBe(false);
      expect(room.getView(actor)).toEqual(current);
    }
    const command = cmd(actor,{type:'answer-decision',decisionId:d.id,optionIds:[d.optionIds[1]!]});
    const receipt = room.submit(actor,command); expect(receipt.accepted).toBe(true); const finished = room.getView(actor);
    expect(finished.decision).toBeNull(); expect(finished.chain).toEqual([]);
    expect(room.submit(actor,command)).toEqual(receipt); expect(room.getView(actor)).toEqual(finished);
    expect(finished.activity.flatMap(a=>a.resolution??[])).toEqual([{kind:'effect-destroyed',count:1}]);
    expect(room.getView(f.other).activity).toEqual(finished.activity);
  });
});
