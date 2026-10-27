import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { platform, arch, release } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { StringDecoder } from 'node:string_decoder';

const root = fileURLToPath(new URL('../', import.meta.url));

/** stdout chunks need not end at a UTF-8 character or newline boundary. */
export function createBrowserReportCollector() {
  const decoder = new StringDecoder('utf8'), reports = [];
  let pending = '';
  const consume = line => {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, 'browserVersion')) reports.push(value);
    } catch {} // Non-report output is still preserved in the step log.
  };
  return {
    write(chunk) {
      pending += decoder.write(chunk);
      const lines = pending.split('\n'); pending = lines.pop();
      for (const line of lines) consume(line);
    },
    finish() { pending += decoder.end(); consume(pending); pending = ''; return reports; },
  };
}

/** Persist every transition; a failed check leaves subsequent checks explicitly unrun. */
export async function runChecks(steps, execute, persist, environment) {
  const report = { schemaVersion: 1, startedAt: new Date().toISOString(), environment,
    windows11DesktopVerified: false, status: 'running',
    steps: steps.map(step => ({ ...step, status: 'not-run' })) };
  await persist(report);
  for (const step of report.steps) {
    step.status = 'running'; step.startedAt = new Date().toISOString(); await persist(report);
    try {
      const outcome = await execute(step);
      step.exitCode = outcome.exitCode; step.signal = outcome.signal ?? null;
      if (outcome.browserReports?.length) step.browserReports = outcome.browserReports;
      step.status = outcome.exitCode === 0 && !outcome.signal ? 'passed' : 'failed';
      if (step.status === 'passed' && step.expectedBrowserReports !== undefined) {
        const reports = outcome.browserReports ?? [];
        if (!Array.isArray(reports) || reports.length !== step.expectedBrowserReports) {
          step.error = `Expected ${step.expectedBrowserReports} browser report(s); received ${Array.isArray(reports) ? reports.length : 'invalid evidence'}`;
        } else if (reports.some(report => !report || report.platform !== environment.platform
          || typeof report.browserVersion !== 'string' || !report.browserVersion.trim() || report.runtimeExceptions !== 0)) {
          step.error = 'Browser evidence must match the host platform, name a browser version and report runtimeExceptions=0';
        }
        if (step.error) step.status = 'failed';
      }
    } catch (error) {
      step.status = 'failed'; step.error = error.message;
    }
    step.finishedAt = new Date().toISOString();
    if (step.status === 'failed') {
      report.status = 'failed'; report.finishedAt = step.finishedAt; await persist(report); return report;
    }
    await persist(report);
  }
  report.status = 'passed'; report.finishedAt = new Date().toISOString(); await persist(report); return report;
}

async function main() {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Chạy bằng npm run validate:platform để sử dụng đúng npm của môi trường.');
  const directory = join(root, 'artifacts', 'platform-validation', new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid);
  await mkdir(directory, { recursive: true });
  const npm = (id, script) => ({ id, command: [process.execPath, npmCli, 'run', script] });
  const node = (id, file, ...args) => ({ id, command: [process.execPath, file, ...args] });
  const steps = [npm('environment', 'environment:check'),
    node('app-syntax', '--check', 'apps/beta/public/app.js'),
    node('browser-syntax', '--check', 'tools/beta-browser-smoke.mjs'),
    npm('typecheck', 'typecheck'), npm('tests', 'test'), npm('data-and-build', 'cards:check'),
    node('beta-startup', 'tools/beta-startup-smoke.mjs'),
    node('vanilla', 'dist/tools/engine-smoke.js'), node('capabilities', 'dist/tools/engine-capabilities.js'),
    node('mixed', 'dist/tools/engine-mixed-smoke.js'),
    ...[['effects'], ...['a:hand:normal','b:set:normal','a:set:lethal','b:hand:lethal'].map(mode=>['ookazi-'+mode.replaceAll(':','-'),'--ookazi='+mode]), ['monster-activity', '--monster-activity'], ['seat-guard', '--seat-guard'], ['choice-identities', '--choice-identities'], ['field-keyboard', '--field-keyboard'], ['decision-cards', '--decision-cards'], ['activity-filters', '--activity-filters'], ['graveyard-filters', '--graveyard-filters'], ['deck-save-check', '--deck-save-check'], ['deck-draft-guard', '--deck-draft-guard'], ['hand-keyboard', '--hand-keyboard'], ['hand-sorting', '--hand-sorting'], ['magician-faith', '--magician-faith'],
      ...['a:0','a:2','b:0','b:2'].map(mode=>['faith-battle-'+mode.replace(':','-'),'--faith-battle='+mode]),
      ['chain-view', '--chain-view'], ['deck-overview', '--deck-overview'], ['earthquake', '--earthquake'], ['block-attack', '--block-attack'], ['reincarnation-grave', '--reincarnation=grave'], ['reincarnation-cost', '--reincarnation=cost'], ['tribute-doomed', '--tribute-doomed'], ['hammer-shot', '--hammer-shot'], ['smashing-ground', '--smashing-ground'], ['life-points-normal', '--life-points=normal'], ['life-points-lethal', '--life-points=lethal'], ['expanded-catalog', '--expanded-catalog'], ['deck-builder', '--deck-builder'], ['setup', '--new-game'], ['discard', '--discard'],
      ['deck-out-0', '--deck-out=0'], ['deck-out-1', '--deck-out=1'], ['deck-out-2', '--deck-out=2'],
      ['concede', '--concede'], ['full-duel', '--full-duel'], ['expanded-duel', '--expanded-duel']].map(([id, ...args]) => ({ ...node('browser-' + id, 'tools/beta-browser-smoke.mjs', ...args), expectedBrowserReports: 1 }))];
  const reportPath = join(directory, 'report.json');
  const persist = report => writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  const execute = step => new Promise((resolveStep, reject) => {
    const log = createWriteStream(join(directory, step.id + '.log'));
    const collector = createBrowserReportCollector(); let launchError;
    log.on('error', reject);
    const child = spawn(step.command[0], step.command.slice(1), { cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('error', error => { launchError = error; });
    child.stdout.on('data', chunk => {
      process.stdout.write(chunk); log.write(chunk); collector.write(chunk);
    });
    child.stderr.on('data', chunk => { process.stderr.write(chunk); log.write(chunk); });
    child.on('close', (exitCode, signal) => log.end(() => launchError ? reject(launchError) : resolveStep({ exitCode, signal, browserReports: collector.finish() })));
  });
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  console.log(`Báo cáo kiểm chứng: ${reportPath}`);
  const report = await runChecks(steps, execute, persist, { platform: platform(), arch: arch(), osRelease: release(),
    node: process.versions.node, npm: process.env.npm_config_user_agent?.match(/npm\/([^ ]+)/)?.[1] ?? 'unknown',
    package: manifest.name, packageVersion: manifest.version, githubActions: process.env.GITHUB_ACTIONS === 'true' });
  console.log(`Kết quả: ${report.status}. Chỉ xác nhận môi trường trong report; không xác nhận Windows 11 desktop.`);
  if (report.status !== 'passed') process.exitCode = 1;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
