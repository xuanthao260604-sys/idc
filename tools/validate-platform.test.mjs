import { describe, it, expect } from 'vitest';
import { runChecks, createBrowserReportCollector } from './validate-platform.mjs';

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

  const browserStep = { id: 'browser', command: ['node', 'browser'], expectedBrowserReports: 1 };
  const evidence = { platform: 'linux', browserVersion: 'Chrome/test', runtimeExceptions: 0 };
  it.each(['linux', 'win32'])('accepts complete browser evidence only for its actual %s host', async platform => {
    const browserReports = [{ ...evidence, platform }], saved = [];
    const report = await runChecks([browserStep], async () => ({ exitCode: 0, browserReports }), r => saved.push(structuredClone(r)), { ...environment, platform });
    expect(report.status).toBe('passed'); expect(report.steps[0].browserReports).toEqual(browserReports);
    expect(report.steps[0].expectedBrowserReports).toBe(1); expect(report.steps[0].exitCode).toBe(0);
    expect(report.windows11DesktopVerified).toBe(false); expect(saved.at(-1)).toEqual(report);
  });
  it.each([
    ['missing', undefined], ['duplicated', [evidence, evidence]],
    ['wrong platform', [{ ...evidence, platform: 'win32' }]],
    ['blank browser version', [{ ...evidence, browserVersion: '  ' }]],
    ['invalid browser version', [{ ...evidence, browserVersion: 155 }]],
    ['runtime exception', [{ ...evidence, runtimeExceptions: 1 }]],
    ['missing exception count', [{ platform: 'linux', browserVersion: 'Chrome/test' }]],
    ['string exception count', [{ ...evidence, runtimeExceptions: '0' }]],
  ])('fails a zero-exit browser with %s evidence and leaves later checks unrun', async (_name, browserReports) => {
    const called = [], saved = [];
    const report = await runChecks([steps[0], browserStep, steps[2]], async step => {
      called.push(step.id); return { exitCode: 0, ...(step.id === 'browser' ? { browserReports } : {}) };
    }, r => saved.push(structuredClone(r)), environment);
    expect(report.status).toBe('failed'); expect(called).toEqual(['first', 'browser']);
    expect(report.steps.map(s => s.status)).toEqual(['passed', 'failed', 'not-run']);
    expect(report.steps[1].exitCode).toBe(0); expect(report.steps[1].error).toMatch(/browser/i);
    if (browserReports?.length) expect(report.steps[1].browserReports).toEqual(browserReports);
    expect(saved.at(-1)).toEqual(report); expect(report.windows11DesktopVerified).toBe(false);
  });
  it('collects complete UTF-8 reports across arbitrary chunks, CRLF and an unterminated final line', () => {
    const collector = createBrowserReportCollector();
    const first = { ...evidence, note: 'Kiểm thử đường dẫn tiếng Việt' }, last = { ...evidence, note: 'Không có dòng trống cuối' };
    const output = Buffer.from(`npm output\r\n${JSON.stringify({ platform: 'linux' })}\r\n${JSON.stringify(first)}\r\n${JSON.stringify(last)}`);
    for (const byte of output) collector.write(Buffer.from([byte]));
    expect(collector.finish()).toEqual([first, last]);
  });
  it('keeps malformed browser fields for rejection while ignoring non-report output', async () => {
    const collector = createBrowserReportCollector(), invalid = { ...evidence, browserVersion: null };
    collector.write(Buffer.from(`ordinary output\nnull\n[]\n{broken JSON\n${JSON.stringify(invalid)}`));
    const browserReports = collector.finish(); expect(browserReports).toEqual([invalid]);
    const report = await runChecks([browserStep, steps[2]], async () => ({ exitCode: 0, browserReports }), async () => {}, environment);
    expect(report.steps[0].status).toBe('failed'); expect(report.steps[0].error).toContain('Browser evidence');
    expect(report.steps[1].status).toBe('not-run');
  });
});
