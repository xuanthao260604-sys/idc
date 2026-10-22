import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants } from '../packages/engine/src/duel.js';
import { createRegistry } from '../packages/engine/src/registry.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { publicResolution } from '../packages/engine/src/public-resolution.js';
import { planResolution } from '../packages/engine/src/effect-plans.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const { registry } = loadRuntimeCatalog(), id = 'official:74848038';
const load = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const bundle = load('../data/generated/reincarnation.json'), reviews = load('../data/reviews/reincarnation.effects.json');
function setup(actor = 'a', initial = 'own-monster') {
  const deck = Object.keys(registry.cards);
  const state = structuredClone(createDuel(registry, { duelId: 'reincarnation-test', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: 'a', seedHex: 'c1'.repeat(32) }).state) as Mutable<DuelState>;
  state.turn.number = actor === 'a' ? 3 : 4; state.turn.activePlayer = actor; state.turn.phase = 'main1';
  state.timing.window = 'open'; state.timing.priorityPlayer = actor; state.timing.consecutivePasses = 0;
  function move(name: string, owner: string, zone: 'hand' | 'graveyard' | 'monster' = 'hand', slot: Slot = 0) {
    const def = Object.values(registry.cards).find(c => c.name === name)!;
    const card = Object.values(state.cards).find(c => c.ownerId === owner && c.definition.id === def.id)!;
    const p = state.players.find(p => p.id === owner)!;
    const list = card.location.kind === 'hand' ? p.hand : p.deck; list.splice(list.indexOf(card.id), 1);
    if (zone === 'monster') { p.monsters[slot] = card.id; card.location = { kind: 'monster', playerId: owner, slot }; card.position = 'face-up-attack'; }
    else { p[zone].push(card.id); card.location = { kind: zone, playerId: owner }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; }
    return card.id;
  }
  const other = actor === 'a' ? 'b' : 'a', spell = move('Monster Reincarnation', actor), cost = move('Battle Ox', actor);
  const target = initial === 'own-monster' ? move('Hane-Hane', actor, 'graveyard')
    : initial === 'spells-only' ? move('Hinotama', actor, 'graveyard')
    : initial === 'opponent-only' ? move('Hane-Hane', other, 'graveyard') : 'no-target';
  if (initial === 'own-monster') state.cards[target]!.markers = { summonedOnTurn: 1, summonedBy: actor, setOnTurn: 1, manuallyChangedOnTurn: 1, attackDeclarationsThisTurn: 1, attackCountConsumedThisTurn: 1, wasBattleDestroyed: true };
  return { state, actor, other, spell, cost, target, move };
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
const intent = (f: ReturnType<typeof setup>, self = false): EngineAction => ({ type: 'activate-spell', instanceId: f.spell, slot: 0, discardId: f.cost, targetId: self ? f.cost : f.target });
describe('Reviewed Monster Reincarnation own Graveyard recovery', () => {
  it('keeps snapshot status separate, records official printing rather than API date, and requires a review', () => {
    expect(bundle.summary).toMatchObject({ imported: 1, verifiedData: 0, historicalReviewPending: 1, implemented: 0, testedEffects: 0, playable: 0 });
    expect(bundle.cards[0]).toMatchObject({ name: 'Monster Reincarnation', verification: 'pending', textBasis: 'current-reference', legality: { maxCopies: 3 } });
    expect(bundle.reviews[0]).toMatchObject({ printing: { date: '2004-12-01', setCode: 'RDS-EN045' }, upstreamTcgDate: '2004-11-20' });
    expect(createRegistry(bundle.cards, goat200508Format).unsupportedIds).toEqual([id]);
    expect(registry.spellHandlers[id]).toEqual({ handler: 'discard-return-own-graveyard-monster' });
    expect(() => createRegistry(bundle.cards, goat200508Format, { [id]: { handler: 'draw', count: 2 } }, reviews)).toThrow('overridden');
  });
  it.each(['text', 'revision', 'legality'])('rejects whole-definition %s drift', field => {
    const cards = structuredClone(bundle.cards);
    if (field === 'revision') cards[0].revision++; else if (field === 'legality') cards[0].legality.maxCopies = 1; else cards[0].text += ' changed';
    expect(() => createRegistry(cards, goat200508Format, {}, reviews)).toThrow('review conflict');
  });
  it.each(['normal-spell-discard-target-single-link-v1', 'normal-spell-single-link-vanilla-v1'])('rejects unrelated scope %s', scope => {
    const changed = structuredClone(reviews); changed[0].scope = scope;
    expect(() => createRegistry(bundle.cards, goat200508Format, {}, changed)).toThrow('reviewed scope');
  });
  const scenarios = ['a','b'].flatMap(actor => [false,true].flatMap(fromSet => [false,true].map(self => ({ actor, fromSet, self }))));
  it.each(scenarios)('actor=$actor fromSet=$fromSet returnCost=$self pays now, selects after cost, returns after two passes', ({ actor, fromSet, self }) => {
    const f = setup(actor); let s: DuelState = f.state;
    if (fromSet) s = settle(step(s, actor, { type: 'set-spell', instanceId: f.spell, slot: 0 }).state);
    const before = structuredClone(s), selected = self ? f.cost : f.target;
    const activated = step(s, actor, intent(f, self)); expect(s).toEqual(before); s = activated.state;
    const caster = s.players.find(p => p.id === actor)!;
    expect(caster.hand).toHaveLength(before.players.find(p => p.id === actor)!.hand.length - (fromSet ? 1 : 2)); expect(caster.graveyard).toContain(f.cost);
    expect(s.chain[0]!.targetRefs).toEqual([{ instanceId: selected, locationAtSelection: { kind: 'graveyard', playerId: actor } }]);
    expect(s.chain[0]!.costEvents[0]).toMatchObject({ kind: 'cards-discarded', affectedInstances: [f.cost], details: { reason: 'activation-cost', playerId: actor } });
    expect(publicResolution(activated.events, s)).toEqual([{ kind: 'discard-cost', playerId: actor, count: 1 }]);
    s = step(s, f.other, { type: 'pass' }).state; expect(s.cards[selected]!.location.kind).toBe('graveyard');
    const resolved = step(s, actor, { type: 'pass' });
    expect(publicResolution(resolved.events, resolved.state)).toEqual([{ kind: 'return-to-hand', playerId: actor, count: 1 }]);
    const done = settle(resolved.state), p = done.players.find(p => p.id === actor)!;
    expect(p.hand).toContain(selected); expect(p.graveyard).not.toContain(selected); expect(p.graveyard).toContain(f.spell);
    expect(p.graveyard).toContain(self ? f.target : f.cost); expect(p.normalSummonsOrSetsUsed).toBe(0); expect(p.monsters.every(x => x === null)).toBe(true);
    expect(done.cards[selected]).toMatchObject({ controllerId: actor, position: 'face-down', location: { kind: 'hand', playerId: actor }, counters: {}, markers: { summonedOnTurn: null, summonedBy: null, setOnTurn: null, manuallyChangedOnTurn: null, attackCountConsumedThisTurn: 0, wasBattleDestroyed: false } });
    expect(done.chain).toEqual([]); expect(done.pendingTriggers).toEqual([]); expect(done.pendingDecision).toBeNull(); expect(done.players.map(p => p.lifePoints)).toEqual([8000,8000]);
    expect(resolved.events.some(e => e.kind.includes('summoned') || e.kind === 'effect-destroyed')).toBe(false);
  });
  it.each(['empty','spells-only','opponent-only'])('refuses to create activation eligibility by discarding a monster when own GY is %s', initial => {
    const f = setup('a', initial), before = structuredClone(f.state);
    expect(act(f.state, 'a', intent(f, true))).toMatchObject({ accepted: false, code: 'invalid-target', state: f.state }); expect(f.state).toEqual(before);
    const view = createCommandAdapter(registry, f.state).getView('a', true);
    const source = view.selfHand.find(c => c.visibility === 'known' && c.definition.id === id)!;
    expect(view.availableActions!.filter(a => a.type === 'activate-spell' && a.cardHandle === source.handle)).toEqual([]);
    expect(step(f.state, 'a', { type: 'set-spell', instanceId: f.spell, slot: 0 }).state.players[0].spellsTraps[0]).toBe(f.spell);
  });
  it.each(['graveyard-spell','opponent','hand-other','field','source','unknown'])('rejects target %s atomically before payment', mode => {
    const f = setup(); const targetId = mode === 'graveyard-spell' ? f.move('Hinotama','a','graveyard') : mode === 'opponent' ? f.move('Battle Ox','b','graveyard')
      : mode === 'hand-other' ? f.move('Mystical Elf','a') : mode === 'field' ? f.move('Celtic Guardian','a','monster') : mode === 'source' ? f.spell : 'unknown';
    expect(act(f.state, 'a', { type: 'activate-spell', instanceId: f.spell, slot: 0, discardId: f.cost, targetId })).toMatchObject({ accepted: false, code: 'invalid-target', state: f.state });
    expect(f.state.players[0].hand).toContain(f.cost); expect(f.state.players[0].graveyard).not.toContain(f.cost);
  });
  it.each(['Hinotama','Trap Hole'])('can discard %s for an existing GY monster, but cannot retrieve the discarded non-monster', name => {
    const f = setup(); f.cost = f.move(name,'a');
    expect(act(f.state,'a',intent(f,true))).toMatchObject({ accepted:false, code:'invalid-target', state:f.state });
    const done = settle(step(f.state,'a',intent(f)).state); expect(done.players[0].hand).toContain(f.target); expect(done.players[0].graveyard).toContain(f.cost);
  });
  it.each(['neither','cost-only','target-only'])('requires both parameters: %s', mode => {
    const f = setup(); expect(act(f.state,'a',{type:'activate-spell',instanceId:f.spell,slot:0,...(mode==='cost-only'?{discardId:f.cost}:{}),...(mode==='target-only'?{targetId:f.target}:{})})).toMatchObject({accepted:false,code:'invalid-action',state:f.state});
  });
  it.each(['source','opponent','graveyard'])('rejects a discard from %s rather than another own hand card', mode => {
    const f = setup(), discardId = mode==='source'?f.spell:mode==='opponent'?f.state.players[1].hand[0]!:f.target;
    expect(act(f.state,'a',{type:'activate-spell',instanceId:f.spell,slot:0,discardId,targetId:f.target})).toMatchObject({accepted:false,code:'unpayable-cost',state:f.state});
  });
  it.each(['wrong-zone','opponent-zone','spell-target'])('rejects forged GY target refs: %s', mode => {
    const f=setup(), active=structuredClone(step(f.state,'a',intent(f)).state) as Mutable<DuelState>;
    if(mode==='wrong-zone') active.chain[0]!.targetRefs[0]!.locationAtSelection={kind:'monster',playerId:'a',slot:0};
    if(mode==='opponent-zone') active.chain[0]!.targetRefs[0]!.locationAtSelection={kind:'graveyard',playerId:'b'};
    if(mode==='spell-target') active.chain[0]!.targetRefs[0]!.instanceId=f.spell;
    expect(()=>assertDuelInvariants(active,registry)).toThrow('Invalid supported Chain');
  });
  it.each([false,true])('returned card may be played normally afterward; no summon quota consumed by recovery (returnCost=%s)', self => {
    const f=setup(), selected=self?f.cost:f.target, done=settle(step(f.state,'a',intent(f,self)).state);
    const played=step(done,'a',{type:self?'normal-summon':'set-monster',instanceId:selected,slot:0,tributeIds:[]}).state;
    expect(played.players[0].monsters[0]).toBe(selected); expect(played.players[0].normalSummonsOrSetsUsed).toBe(1);
  });
  it('offers the same cost/target handle pair without paying; retries do not duplicate a recovered cost card', () => {
    const f=setup(), room=createCommandAdapter(registry,f.state);let seq=0;
    const command=(actor:string,action:DuelAction)=>{const v=room.getView(actor);return{commandId:`recovery-${++seq}`,duelId:v.duelId,expectedStateVersion:v.stateVersion,action};};
    const before=room.getView('a'), view=room.getView('a',true);
    const source=view.selfHand.find(c=>c.visibility==='known'&&c.definition.id===id)!;
    const cost=view.selfHand.find(c=>c.visibility==='known'&&c.definition.id==='official:05053103')!;
    const action:DuelAction={type:'activate-spell',cardHandle:source.handle,slot:0,discardHandle:cost.handle,targetHandle:cost.handle};
    expect(view.availableActions).toContainEqual(action);expect(room.getView('a').selfHand).toEqual(before.selfHand);expect(room.getView('a').activity).toEqual([]);
    const cmd=command('a',action),receipt=room.submit('a',cmd);expect(receipt.accepted).toBe(true);expect(room.submit('a',cmd)).toEqual(receipt);
    expect(room.getView('a').selfHand).toHaveLength(before.selfHand.length-2);
    for(let n=0;room.getView('a').timing.window!=='open';n++){if(n>10)throw Error('Did not settle');const actor=room.getView('a').timing.priorityPlayer!;expect(room.submit(actor,command(actor,{type:'pass'})).accepted).toBe(true);}
    const done=room.getView('a');room.refreshView('a');expect(room.submit('a',cmd)).toEqual(receipt);expect(room.getView('a').stateVersion).toBe(done.stateVersion);
    expect(room.getView('a').activity).toEqual(done.activity);expect(room.getView('b').activity).toEqual(done.activity);expect(done.selfHand).toHaveLength(before.selfHand.length-1);
    expect(done.selfHand.filter(c=>c.visibility==='known'&&c.definition.id==='official:05053103')).toHaveLength(1);expect(room.getView('b').opponentHandCount).toBe(done.selfHand.length);
    expect(done.activity.flatMap(x=>x.resolution??[])).toEqual([{kind:'discard-cost',playerId:'a',count:1},{kind:'return-to-hand',playerId:'a',count:1}]);expect(JSON.stringify(room.getView('b'))).not.toContain(f.cost);
  });
  it('plans a selected GY return without interpreting card text or selecting ATK candidates',()=>{
    expect(planResolution({handler:'discard-return-own-graveyard-monster'},{controllerId:'a',monsters:[]})).toEqual({kind:'return-selected-graveyard-monster'});
  });
});
