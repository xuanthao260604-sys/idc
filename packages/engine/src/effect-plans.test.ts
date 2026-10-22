import { describe, expect, it } from 'vitest';
import { chooseDestruction, planResolution } from './effect-plans.js';
const fissure = { handler: 'destroy-lowest-opposing-face-up-attack' };
const monster = (instanceId: string, attack: number, controllerId = 'b', faceUp = true) => ({ instanceId, attack, controllerId, faceUp });
const board = (monsters: ReturnType<typeof monster>[] = []) => ({ controllerId: 'a', monsters });
describe('Resolution primitives only; not integrated card activation', () => {
  it.each(['inflict-damage', 'gain-life-points'])('rejects unsafe or nonpositive amounts for %s', handler => {
    for (const amount of [0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
      expect(() => planResolution({ handler, amount }, board())).toThrow();
    expect(() => planResolution({ handler, amount: 500, playerId: 'b' }, board())).toThrow();
  });
  it('plans two required draws for the resolving controller without deck-length gating', () => {
    expect(planResolution({ handler: 'draw', count: 2 }, board())).toEqual({ kind: 'draw', playerId: 'a', count: 2 });
  });
  it('selects the lowest opposing face-up effective ATK, excluding own and face-down monsters', () => {
    expect(planResolution(fissure, board([monster('own', 0, 'a'), monster('hidden', 0, 'b', false), monster('high', 2000), monster('low', 300)])))
      .toEqual({ kind: 'destroy', instanceId: 'low' });
  });
  it('allows a single opposing face-up monster', () => {
    expect(planResolution(fissure, board([monster('one', 1900)]))).toEqual({ kind: 'destroy', instanceId: 'one' });
  });
  it('returns no operation if no eligible monster remains at resolution', () => {
    expect(planResolution(fissure, board([monster('hidden', 100, 'b', false)]))).toEqual({ kind: 'no-op' });
  });
  it('requires the resolving controller to choose among tied minima only', () => {
    const plan = planResolution(fissure, board([monster('x', 0), monster('y', 0), monster('z', 10)]));
    expect(plan).toEqual({ kind: 'choose-destruction', playerId: 'a', optionIds: ['x', 'y'] });
    if (plan.kind !== 'choose-destruction') throw new Error('Expected choice');
    expect(chooseDestruction(plan, 'y')).toEqual({ kind: 'destroy', instanceId: 'y' });
    expect(() => chooseDestruction(plan, 'z')).toThrow('candidate');
  });
  it('uses a new resolution board rather than capturing activation candidates', () => {
    expect(planResolution(fissure, board([monster('x', 100), monster('y', 200)]))).toEqual({ kind: 'destroy', instanceId: 'x' });
    expect(planResolution(fissure, board([monster('x', 300), monster('y', 200)]))).toEqual({ kind: 'destroy', instanceId: 'y' });
  });
  it('does not mutate inputs and freezes returned choices', () => {
    const input = board([monster('x', 100), monster('y', 100)]);
    const before = structuredClone(input);
    const plan = planResolution(fissure, input);
    expect(input).toEqual(before);
    expect(Object.isFrozen(plan)).toBe(true);
    if (plan.kind === 'choose-destruction') expect(Object.isFrozen(plan.optionIds)).toBe(true);
  });
  it.each([{}, { handler: 'draw', count: -1 }, { handler: 'draw', count: 1.5 }, { handler: 'execute-description', text: 'anything' }])('rejects unsupported or malformed handlers %j', request => {
    expect(() => planResolution(request, board())).toThrow();
  });
  it('rejects duplicate instances and invalid effective ATK', () => {
    expect(() => planResolution(fissure, board([monster('x', 1), monster('x', 1)]))).toThrow();
    expect(() => planResolution(fissure, board([monster('x', NaN)]))).toThrow();
  });
});
