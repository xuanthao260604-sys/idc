import { describe, it, expect } from 'vitest';
import { runChecks } from './validate-platform.mjs';

const steps = ['first', 'second', 'third'].map(id => ({ id, command: ['node', id] }));
const environment = { platform: 'linux', node: '24.19.0' };
describe('Platform validation report', () => {
  it('records actual platform and browser evidence without asserting Windows desktop verification', async () => {
    const saved = [];
    const browserReports = [{ platform: 'linux', browserVersion: 'Chrome/test' }];
    const report = await runChecks(steps, async () => ({ exitCode: 0, browserReports }), r => saved.push(structuredClone(r)), environment);
    expect(report.status).toBe('passed'); expect(report.steps.every(s => s.status === 'passed')).toBe(true);
    expect(report.environment.platform).toBe('linux'); expect(report.windows11DesktopVerified).toBe(false);
    expect(report.steps[0].browserReports).toEqual(browserReports);
    expect(saved[0].steps.every(s => s.status === 'not-run')).toBe(true);
    expect(saved[1].steps[0].status).toBe('running');
    expect(saved.at(-1)).toEqual(report);
  });
  it('preserves a failing exit code and never executes or passes later checks', async () => {
    const called = [], saved = [];
    const report = await runChecks(steps, async step => { called.push(step.id); return { exitCode: step.id === 'second' ? 7 : 0 }; }, r => saved.push(structuredClone(r)), environment);
    expect(called).toEqual(['first', 'second']); expect(report.status).toBe('failed');
    expect(report.steps.map(s => s.status)).toEqual(['passed', 'failed', 'not-run']);
    expect(report.steps[1].exitCode).toBe(7); expect(saved.at(-1)).toEqual(report);
  });
  it('records launch errors and leaves following checks unrun', async () => {
    const report = await runChecks(steps, async () => { throw new Error('Browser executable missing'); }, async () => {}, environment);
    expect(report.status).toBe('failed'); expect(report.steps[0].error).toBe('Browser executable missing');
    expect(report.steps[1].status).toBe('not-run'); expect(report.steps[2].status).toBe('not-run');
  });
  it('treats signal termination as failure even when a child reports zero', async () => {
    const report = await runChecks(steps, async () => ({ exitCode: 0, signal: 'SIGTERM' }), async () => {}, environment);
    expect(report.status).toBe('failed'); expect(report.steps[0].signal).toBe('SIGTERM');
    expect(report.steps[1].status).toBe('not-run');
  });
});
