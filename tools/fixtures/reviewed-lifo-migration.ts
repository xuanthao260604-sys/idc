import { createHash } from 'node:crypto';
import type { Registry } from '../../packages/engine/src/registry.js';
import type { DuelState } from '../../packages/protocol/src/duel.js';
import type { EngineAction } from '../../packages/engine/src/actions.js';
import { applyAction, assertDuelInvariants } from '../../packages/engine/src/duel.js';
import { setupFourLinkBoard } from './four-link-counter-candidate.js';
import { setupTrapThreeSevenBoard } from './trap-three-seven-candidate.js';
export interface ReviewedLifoMigrationCase {
  key: string; actor: string; sevenCount: number; spell?: string; method?: string; self: boolean; phase: 'main1' | 'main2'; concede?: boolean;
}
export function reviewedLifoMigrationCases(registry: Registry): ReviewedLifoMigrationCase[] {
  const cases: ReviewedLifoMigrationCase[] = [];
  for (const [i, spell] of Object.keys(registry.spellHandlers).entries()) for (const actor of ['a', 'b']) for (const sevenCount of [0, 1, 2])
    cases.push({ key: `spell-${spell}-${actor}-${sevenCount}`, actor, sevenCount, spell, self: i % 2 === 0, phase: actor === 'a' ? 'main1' : 'main2' });
  for (const actor of ['a', 'b']) for (const sevenCount of [1, 2, 3]) for (const method of ['normal', 'tribute', 'flip']) for (const self of [false, true]) for (const phase of ['main1', 'main2'] as const)
    cases.push({ key: `trap-${actor}-${sevenCount}-${method}-${self}-${phase}`, actor, sevenCount, method, self, phase });
  for (const actor of ['a', 'b']) {
    cases.push({ key: `concede-root-${actor}`, actor, sevenCount: 1, spell: 'official:66788016', self: true, phase: 'main1', concede: true });
    cases.push({ key: `concede-cleanup-${actor}`, actor, sevenCount: 2, method: 'normal', self: true, phase: 'main2', concede: true });
  }
  return cases;
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
/** Initial fixture only, then accepted engine actions throughout. Baseline was
 * captured on 88b1618 before the shared kernel replaced the old emission paths.
 */
export function runReviewedLifoMigration(registry: Registry, o: ReviewedLifoMigrationCase) {
  let s: DuelState;
  const transitions: { state: string; events: string }[] = [];
  const act = (who: string, action: EngineAction) => {
    const r = applyAction(registry, s, { actorId: who, expectedStateVersion: s.stateVersion, action });
    if (!r.accepted) throw new Error(o.key + ': ' + r.message);
    s = r.state; assertDuelInvariants(s, registry); transitions.push({ state: hash(s), events: hash(r.events) });
  };
  const pass = () => act(s.timing.priorityPlayer!, { type: 'pass' });
  if (o.spell) {
    const f = setupFourLinkBoard(registry, o.spell, o.actor, o.self, true, o.self, o.phase, o.phase === 'main2'); s = f.state;
    if (f.fromSet) { act(o.actor, { type: 'set-spell', instanceId: f.root, slot: 0 }); while (s.timing.window !== 'open') pass(); }
    act(o.actor, { type: 'activate-spell', instanceId: f.root, slot: 0, ...(f.rootCost ? { discardId: f.rootCost } : {}),
      ...(f.hasCost || f.handler === 'target-opposing-attack-to-defense' ? { targetId: f.handler === 'discard-return-own-graveyard-monster' ? f.rootCost! : f.targets[0]! } : {}) });
    if (s.timing.priorityPlayer !== f.magicOwner) pass();
    act(f.magicOwner, { type: 'activate-counter-trap', instanceId: f.magic, discardId: f.magicCost, respondingToLinkId: s.chain.at(-1)!.id });
    for (const [who, source] of [[f.firstOwner, f.first], [f.topOwner, f.top]].slice(0, o.sevenCount)) {
      if (s.timing.priorityPlayer !== who) pass();
      act(who!, { type: 'activate-lp-counter-trap', instanceId: source!, respondingToLinkId: s.chain.at(-1)!.id });
    }
  } else {
    const f = setupTrapThreeSevenBoard(registry, o.actor, [o.self, !o.self, o.self], o.method, o.phase); s = f.state;
    act(o.actor, o.method === 'flip' ? { type: 'flip-summon', instanceId: f.target }
      : { type: 'normal-summon', instanceId: f.target, slot: 0, tributeIds: f.tributes });
    pass(); act(f.other, { type: 'activate-trap', instanceId: f.trap, targetId: f.target });
    for (const [who, source] of [[f.firstOwner, f.first], [f.secondOwner, f.second], [f.topOwner, f.top]].slice(0, o.sevenCount)) {
      if (s.timing.priorityPlayer !== who) pass();
      act(who!, { type: 'activate-lp-counter-trap', instanceId: source!, respondingToLinkId: s.chain.at(-1)!.id });
    }
  }
  for (let n = 0; s.timing.window !== 'open' && !s.result; n++) {
    if (n > 12) throw new Error('Migration fixture did not settle');
    const d = s.pendingDecision;
    if (d) act(o.concede ? o.actor : d.playerId, o.concede ? { type: 'concede' }
      : { type: 'answer-decision', decisionId: d.id, optionIds: d.kind === 'effect-choice' ? [d.optionIds.at(-1)!] : [...d.optionIds].reverse() });
    else pass();
  }
  return { key: o.key, commands: transitions.length, digest: hash(transitions) };
}
