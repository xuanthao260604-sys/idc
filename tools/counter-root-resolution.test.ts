import { readFileSync } from 'node:fs';
import { createRegistry } from '../packages/engine/src/registry.js';
import { goat200508Format } from '../packages/card-data/src/formats/goat-2005-08-17.js';
import { describe, expect, it } from 'vitest';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { createDuel, applyAction, assertDuelInvariants, resolveCandidateCounterContinuation } from '../packages/engine/src/duel.js';
import { createCommandAdapter } from '../packages/engine/src/command-adapter.js';
import { CANDIDATE_SEVEN_EFFECT_ID } from '../packages/engine/src/counter-continuation.js';
import type { DuelState, Slot } from '../packages/protocol/src/duel.js';
import type { EngineAction } from '../packages/engine/src/actions.js';
import type { DuelAction } from '../packages/protocol/src/commands.js';
type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };
const oldRuntime = loadRuntimeCatalog();
// Preserve the candidate-only boundary test under the historical v1 review.
const registry = createRegistry(oldRuntime.cards, goat200508Format, {}, oldRuntime.effectReviews.spells, oldRuntime.effectReviews.flips, oldRuntime.effectReviews.traps, [
  ...oldRuntime.effectReviews.counters.filter(r=>r.cardId!=='official:03819470'), ...JSON.parse(readFileSync('data/reviews/seven-tools.effects.json','utf8')),
]);
const roots = Object.keys(registry.spellHandlers);
function act(state: DuelState, actorId: string, action: EngineAction) {
  const before = structuredClone(state), r = applyAction(registry, state, { actorId, expectedStateVersion: state.stateVersion, action });
  expect(state).toEqual(before); if (!r.accepted) throw new Error(r.message); assertDuelInvariants(r.state, registry); return r;
}
function fixture(rootDef = 'official:66788016', actor = 'a', selfMagic = false, selfSeven = false,
  phase: 'main1' | 'main2' = 'main1', fromSet = false, lp = 8000) {
  const other = actor === 'a' ? 'b' : 'a', magicOwner = selfMagic ? actor : other, sevenOwner = selfSeven ? magicOwner : (magicOwner === 'a' ? 'b' : 'a');
  const deck = [...Object.keys(registry.cards), 'official:05053103'];
  const initial = structuredClone(createDuel(registry, { duelId: 'counter-root', players: [{ id: 'a', deck }, { id: 'b', deck }], firstPlayerId: actor, seedHex: 'd1'.repeat(32) }).state) as Mutable<DuelState>;
  for (const p of initial.players) for (const id of p.hand.splice(0)) { p.deck.push(id); initial.cards[id]!.location = { kind: 'deck', playerId: p.id }; }
  initial.turn = { number: 3, activePlayer: actor, phase }; initial.timing = { ...initial.timing, window: 'open', priorityPlayer: actor, consecutivePasses: 0 };
  const move = (def: string, who: string, zone: 'hand' | 'monster' | 'graveyard' | 'spell-trap', slot: Slot = 0) => {
    const p = initial.players.find(p => p.id === who)!, id = p.deck.find(id => initial.cards[id]!.definition.id === def)!;
    if (!id) throw new Error('Missing definition ' + def); p.deck.splice(p.deck.indexOf(id), 1); const card = initial.cards[id]!;
    if (zone === 'monster' || zone === 'spell-trap') { (zone === 'monster' ? p.monsters : p.spellsTraps)[slot] = id; card.location = { kind: zone, playerId: who, slot }; card.position = zone === 'monster' ? 'face-up-attack' : 'face-down'; if (zone === 'spell-trap') card.markers.setOnTurn = 2; }
    else { p[zone].push(id); card.location = { kind: zone, playerId: who }; card.position = zone === 'hand' ? 'face-down' : 'face-up'; } return id;
  };
  for (const p of initial.players) move('official:91152256', p.id, 'graveyard');
  const root = move(rootDef, actor, 'hand'), magic = move('official:77414722', magicOwner, 'spell-trap', 2), seven = move('official:03819470', sevenOwner, 'spell-trap', 4);
  const targets = [move('official:05053103', other, 'monster', 0), move('official:05053103', other, 'monster', 1)];
  const handler = registry.spellHandlers[rootDef]!.handler, hasCost = ['discard-destroy-target-monster', 'discard-return-own-graveyard-monster'].includes(handler);
  const rootCost = hasCost ? move('official:32274490', actor, 'hand') : undefined, magicCost = move('official:15025844', magicOwner, 'hand');
  initial.players.find(p => p.id === sevenOwner)!.lifePoints = lp;
  let state: DuelState = initial;
  if (fromSet) { state = act(state, actor, { type: 'set-spell', instanceId: root, slot: 0 }).state; while (state.timing.window !== 'open') state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state; }
  state = act(state, actor, { type: 'activate-spell', instanceId: root, slot: 0,
    ...(rootCost ? { discardId: rootCost } : {}), ...(hasCost || handler === 'target-opposing-attack-to-defense' ? { targetId: handler === 'discard-return-own-graveyard-monster' ? rootCost! : targets[0]! } : {}) }).state;
  if (state.timing.priorityPlayer !== magicOwner) state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  state = act(state, magicOwner, { type: 'activate-counter-trap', instanceId: magic, discardId: magicCost, respondingToLinkId: state.chain[0]!.id }).state;
  if (state.timing.priorityPlayer !== sevenOwner) state = act(state, state.timing.priorityPlayer!, { type: 'pass' }).state;
  // Real engine activations created root + Magic, with real costs/events/targets.
  // Link 3 remains REJECTED by gameplay. Only this trusted fixture supplies its receipt
  // to the candidate resolver seam; this is not an end-to-end three-link activation.
  const denied = applyAction(registry, state, { actorId: sevenOwner, expectedStateVersion: state.stateVersion,
    action: { type: 'activate-lp-counter-trap', instanceId: seven, respondingToLinkId: state.chain[1]!.id } });
  expect(denied.accepted).toBe(false); expect(denied.state).toBe(state);
  const candidate = structuredClone(state) as Mutable<DuelState>, seq = candidate.eventSequence + 1;
  candidate.players.find(p => p.id === sevenOwner)!.lifePoints -= 1000; candidate.cards[seven]!.position = 'face-up';
  candidate.chain.push({ id: 'candidate-seven', source: seven, controllerId: sevenOwner, sourceAtActivation: structuredClone(candidate.cards[seven]!),
    effectId: CANDIDATE_SEVEN_EFFECT_ID, spellSpeed: 3, targetRefs: [], respondingToLinkId: candidate.chain[1]!.id, activationNegated: false, effectNegated: false,
    costEvents: [{ sequence: seq, simultaneousGroup: 'candidate-payment', kind: 'life-points-paid', affectedInstances: [], details: { playerId: sevenOwner, reason: 'activation-cost', amount: 1000, beforeLP: lp, afterLP: lp - 1000 } }] });
  candidate.eventSequence = seq + 3; candidate.timing = { ...candidate.timing, window: 'resolving', priorityPlayer: null, consecutivePasses: 2 };
  return { state: candidate, rootDef, actor, other, magicOwner, sevenOwner, root, magic, seven, rootCost, magicCost, targets };
}
function resolve(f: ReturnType<typeof fixture>) {
  const before = structuredClone(f.state), r = resolveCandidateCounterContinuation(registry, f.state);
  expect(f.state).toEqual(before); assertDuelInvariants(r.state, registry); expect(r.state.stateVersion).toBe(f.state.stateVersion + 1); return r;
}
function finish(state: DuelState, reverse = false) {
  const events = [];
  for (let i = 0; state.pendingDecision; i++) {
    if (i > 2) throw new Error('Resolution repeated'); const d = state.pendingDecision;
    const ids = d.kind === 'effect-choice' ? [d.optionIds[1]!] : reverse ? [...d.optionIds].reverse() : [...d.optionIds];
    const r = act(state, d.playerId, { type: 'answer-decision', decisionId: d.id, optionIds: ids }); state = r.state; events.push(...r.events);
  }
  return { state, events };
}

describe('candidate parent resolver uses real root handlers; activation gate stays closed', () => {
  it.each(roots.flatMap(root => ['a','b'].flatMap(actor => [false,true].flatMap(selfMagic => [false,true].flatMap(selfSeven =>
    (['main1','main2'] as const).flatMap(phase => [false,true].map(fromSet => ({ root, actor, selfMagic, selfSeven, phase, fromSet }))))))))(
    '$root $actor $phase Set=$fromSet MagicSelf=$selfMagic SevenSelf=$selfSeven', o => {
      const f = fixture(o.root, o.actor, o.selfMagic, o.selfSeven, o.phase, o.fromSet), r = resolve(f);
      if (r.state.counterResolution) {
        expect(r.state.counterResolution.root).toEqual(f.state.chain[0]);
        expect(r.state.counterResolution.seven.costEvents).toEqual(f.state.chain[2]!.costEvents);
        expect(r.state.cards[f.root]).toEqual(f.state.cards[f.root]); expect(r.state.cards[f.seven]).toEqual(f.state.cards[f.seven]);
        expect(Object.isFrozen(r.state.counterResolution.magic.costEvents)).toBe(true);
        if(r.state.pendingDecision?.kind==='effect-choice') {
          for(const id of f.targets)expect(r.state.cards[id]!.location.kind).toBe('monster');
          expect(r.state.chainCleanup).toBeNull();expect(r.events.some(e=>e.kind==='sent-to-graveyard')).toBe(false);
        }
      }
      const restored = JSON.parse(JSON.stringify(r.state)) as DuelState; assertDuelInvariants(restored, registry);
      const completed = finish(restored, o.fromSet), s = completed.state, all = [...r.events, ...completed.events];
      expect(s.chain).toEqual([]); expect(s.counterResolution).toBeNull(); expect(s.chainCleanup).toBeNull(); expect(s.spellResolution).toBeNull(); expect(s.result).toBeNull();
      expect(s.timing.window).toBe('action-response'); expect(s.turn).toEqual(f.state.turn);
      for (const id of [f.root, f.magic, f.seven, f.magicCost]) expect(s.cards[id]!.location.kind).toBe('graveyard');
      expect(all.filter(e => e.kind === 'trap-destroyed').map(e => e.affectedInstances)).toEqual([[f.magic]]);
      expect(all.filter(e => e.kind === 'chain-link-negated-skipped').map(e => e.affectedInstances)).toEqual([[f.magic]]);
      expect(all.filter(e => e.kind === 'chain-resolved')).toHaveLength(1);
      const cleanup = all.filter(e => e.kind === 'sent-to-graveyard'); expect(cleanup).toHaveLength(1);
      expect(cleanup[0]!.affectedInstances).toEqual([f.root, f.seven]); expect(cleanup[0]!.details.reason).toBe('counter-chain-cleanup');
      expect(all.some(e => ['cards-discarded','life-points-paid','spell-activated','counter-trap-activated'].includes(e.kind))).toBe(false);
      for (const p of s.players) {
        const old = f.state.players.find(p0 => p0.id === p.id)!;
        const historicalPrefix = old.graveyard.filter(id => id !== f.rootCost || f.rootDef !== 'official:74848038');
        expect(p.graveyard.slice(0, historicalPrefix.length)).toEqual(historicalPrefix);
        expect(p.normalSummonsOrSetsUsed).toBe(old.normalSummonsOrSetsUsed);
        const expectedLP = old.lifePoints + (f.rootDef === 'official:84257639' && p.id === f.actor ? 1000 : 0)
          - (['official:19523799','official:46130346'].includes(f.rootDef) && p.id === f.other ? (f.rootDef === 'official:19523799' ? 800 : 500) : 0);
        expect(p.lifePoints).toBe(expectedLP);
        expect(p.deck.length).toBe(old.deck.length - (f.rootDef === 'official:55144522' && p.id === f.actor ? 2 : 0));
        if (p.id === f.actor && f.rootDef === 'official:74848038') expect(p.hand).toContain(f.rootCost);
      }
      if (f.sevenOwner === f.actor) {
        const owner = s.players.find(p => p.id === f.actor)!;
        expect(owner.graveyard.slice(-2)).toEqual(o.fromSet ? [f.seven,f.root] : [f.root,f.seven]);
      }
      const handler = registry.spellHandlers[f.rootDef]!.handler;
      if (['official:66788016','official:97169186','official:26412047','official:79759861'].includes(f.rootDef)) expect(all.filter(e => e.kind === 'effect-destroyed')).toHaveLength(1);
      if (handler === 'target-opposing-attack-to-defense') expect(s.cards[f.targets[0]!]!.position).toBe('face-up-defense');
      if (handler === 'all-face-up-attack-to-defense') for (const id of f.targets) expect(s.cards[id]!.position).toBe('face-up-defense');
    });

  it('keeps paid LP historical through Dian Keto 1001 -> 1 -> 1001 and owner cleanup', () => {
    const f = fixture('official:84257639','a',false,false,'main1',false,1001), r = resolve(f), frame = r.state.counterResolution!;
    expect(r.state.players.find(p=>p.id==='a')!.lifePoints).toBe(1001); expect(frame.stage).toBe('cleanup');
    expect(frame.seven.costEvents[0]!.details).toMatchObject({beforeLP:1001,afterLP:1});
    expect(finish(r.state).state.players.find(p=>p.id==='a')!.lifePoints).toBe(1001);
  });
  it.each(['a','b'].flatMap(actor => ['official:19523799','official:46130346','official:55144522'].flatMap(root =>
    (root==='official:55144522'?[0,1]:[0]).map(remaining=>({root,actor,remaining})))))(
    'ends during $root for $actor with deck remainder $remaining without post-game ordering or invented cleanup', ({root,actor,remaining}) => {
    const f = fixture(root,actor,false,true,'main1',false,1001);
    if(root==='official:55144522') { const p=f.state.players.find(p=>p.id===f.actor)!; for(const id of p.deck.splice(remaining)) {p.hand.push(id);f.state.cards[id]!.location={kind:'hand',playerId:p.id};} }
    const r=resolve(f); expect(r.state.result?.reason).toBe(root==='official:55144522'?'failed-draw':'life-points');
    expect(r.state.pendingDecision).toBeNull(); expect(r.state.chain).toEqual([]); expect(r.state.counterResolution).toBeNull(); expect(r.state.chainCleanup).toBeNull();
    expect(r.state.cards[f.magic]!.location.kind).toBe('graveyard'); for(const id of [f.root,f.seven])expect(r.state.cards[id]!.location.kind).toBe('spell-trap');
    expect(r.events.some(e=>['sent-to-graveyard','chain-resolved'].includes(e.kind))).toBe(false);
    expect(r.events.at(-1)!.kind).toBe('duel-ended');
    if(root==='official:55144522')expect(r.events.filter(e=>e.kind==='card-drawn')).toHaveLength(remaining);
  });
  it.each(['a','b'].flatMap(actor=>(['root-choice','cleanup'] as const).map(stage=>({actor,stage}))))('concession during $stage for $actor clears contexts without moving pending sources', ({actor,stage}) => {
    const f=fixture(stage==='root-choice'?'official:66788016':'official:84257639',actor),r=resolve(f);expect(r.state.counterResolution!.stage).toBe(stage);
    const done=act(r.state,f.other,{type:'concede'}); expect(done.state.counterResolution).toBeNull();expect(done.state.chainCleanup).toBeNull();expect(done.state.pendingDecision).toBeNull();
    expect(done.events.map(e=>e.kind)).toEqual(['duel-ended']);for(const id of [f.root,f.seven])expect(done.state.cards[id]).toEqual(r.state.cards[id]);
  });
  it.each(['clock','version','root-history','spent-source','remaining-source','stage','missing-frame','cleanup-source','choice-options','unknown-field','overlap'])('rejects altered %s context before any command', mode => {
    const f=fixture(mode==='cleanup-source'?'official:84257639':'official:66788016'),s=structuredClone(resolve(f).state) as Mutable<DuelState>;
    if(mode==='clock')s.eventSequence=s.counterResolution!.capturedSequence-1;
    if(mode==='version')s.stateVersion=s.counterResolution!.capturedStateVersion;
    if(mode==='root-history')s.counterResolution!.root.id='other';if(mode==='spent-source')s.cards[f.magic]!.position='face-down';
    if(mode==='remaining-source')s.cards[f.seven]!.markers.setOnTurn=3;if(mode==='stage')s.counterResolution!.stage='before-root';
    if(mode==='missing-frame')s.counterResolution=null;if(mode==='cleanup-source')s.chainCleanup!.sourceIds=[f.magic,f.seven];
    if(mode==='choice-options')s.pendingDecision!.optionIds.reverse();if(mode==='unknown-field')(s.counterResolution as any).extra=true;
    if(mode==='overlap')s.spellResolution={} as any;
    const before=structuredClone(s);expect(()=>applyAction(registry,s,{actorId:f.actor,expectedStateVersion:s.stateVersion,action:{type:'concede'}})).toThrow();expect(s).toEqual(before);
  });
  it.each(['duplicate-zone','missing-card','wrong-target','wrong-registry','negative-version','bad-counter','four-links'])('rejects invalid candidate %s atomically', mode => {
    const f=fixture('official:79759861'),s=f.state;
    if(mode==='duplicate-zone')s.players[0].hand.push(s.players[0].deck[0]!);
    if(mode==='missing-card')s.players[0].deck.shift();
    if(mode==='wrong-target')s.chain[0]!.targetRefs[0]!.instanceId=f.root;
    if(mode==='wrong-registry')s.cardRegistryRevision='old';if(mode==='negative-version')s.stateVersion=-1;
    if(mode==='bad-counter')s.chain[2]!.respondingToLinkId=s.chain[0]!.id;
    if(mode==='four-links')s.chain.push(structuredClone(s.chain[2]!));
    const before=structuredClone(s);expect(()=>resolveCandidateCounterContinuation(registry,s)).toThrow();expect(s).toEqual(before);
  });
  it.each(['root-choice','cleanup'] as const)('rejects commands that interrupt or repeat %s and starts a clean new duel', stage => {
    const f=fixture(stage==='root-choice'?'official:66788016':'official:74848038'),s=resolve(f).state,d=s.pendingDecision!;
    for(const actor of [f.actor,f.other])for(const action of [{type:'pass'},{type:'request-phase',phase:'end'},
      {type:'activate-lp-counter-trap',instanceId:f.seven,respondingToLinkId:s.chain[0]!.id},
      {type:'answer-decision',decisionId:d.id,optionIds:[f.magic]},
      {type:'answer-decision',decisionId:d.id,optionIds:[d.optionIds[0],d.optionIds[0]]}]) {
      const r=applyAction(registry,s,{actorId:actor,expectedStateVersion:s.stateVersion,action});expect(r.accepted).toBe(false);expect(r.state).toBe(s);
    }
    expect(applyAction(registry,s,{actorId:d.playerId,expectedStateVersion:s.stateVersion-1,action:{type:'concede'}})).toMatchObject({accepted:false,code:'stale-state'});
    const fresh=createDuel(registry,{duelId:'after-parent',players:[{id:'a',deck:Object.keys(registry.cards)},{id:'b',deck:Object.keys(registry.cards)}]}).state;
    expect(fresh.counterResolution).toBeNull();expect(fresh.chainCleanup).toBeNull();expect(fresh.spellResolution).toBeNull();expect(fresh.pendingDecision).toBeNull();
  });
  it.each(['a','b'])('keeps both paused decisions private and receipt-safe for %s', actor => {
    const f=fixture('official:66788016',actor),r=resolve(f),room=createCommandAdapter(registry,r.state);let serial=0;
    const cmd=(who:string,action:DuelAction)=>{const v=room.getView(who);return{commandId:'parent-'+ ++serial,duelId:v.duelId,expectedStateVersion:v.stateVersion,action};};
    for(const kind of ['effect-choice','cleanup-order']){
      const v=room.getView(actor,true),d=v.decision!;expect(d.kind).toBe(kind);expect(room.getView(f.other).decision).toBeNull();
      expect(v.availableActions).toEqual([{type:'concede'}]);const text=JSON.stringify([v,room.getView(f.other,true)]);
      for(const key of ['counterResolution','integritySha256','capturedSequence','sourceAtActivation','entryFingerprint'])expect(text).not.toContain(key);
      for(const id of Object.keys(r.state.cards))expect(text).not.toContain(id);
      const old=cmd(actor,{type:'answer-decision',decisionId:d.id,optionIds:kind==='effect-choice'?[d.optionIds[0]!]:[...d.optionIds].reverse()});
      room.refreshView(actor);expect(room.submit(actor,old)).toMatchObject({accepted:false,reason:'invalid-choice'});
      const current=room.getView(actor),choice=current.decision!,ids=kind==='effect-choice'?[choice.optionIds[0]!]:[...choice.optionIds].reverse();
      expect(room.submit(f.other,cmd(f.other,{type:'answer-decision',decisionId:choice.id,optionIds:ids})).accepted).toBe(false);
      const command=cmd(actor,{type:'answer-decision',decisionId:choice.id,optionIds:ids}),receipt=room.submit(actor,command);expect(receipt.accepted).toBe(true);
      const done=room.getView(actor);expect(room.submit(actor,command)).toEqual(receipt);expect(room.getView(actor)).toEqual(done);
      expect(room.submit(actor,{...command,action:{...command.action,optionIds:[...ids].reverse(),decisionId:'changed'}})).toMatchObject({accepted:false,reason:'command-conflict'});expect(room.getView(actor)).toEqual(done);
      expect(room.submit(actor,cmd(actor,{type:'answer-decision',decisionId:choice.id,optionIds:ids})).accepted).toBe(false);expect(room.getView(actor)).toEqual(done);
    }
    expect(room.getView(actor).decision).toBeNull();expect(room.getView(actor).chain).toEqual([]);
  });
});
