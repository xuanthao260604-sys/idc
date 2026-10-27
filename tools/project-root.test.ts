import { mkdtempSync, mkdirSync, writeFileSync, rmSync, copyFileSync, readFileSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { findProjectRoot, projectRoot } from './project-root.js';
import inputs from './runtime-catalog-inputs.json' with { type: 'json' };
const temporary = mkdtempSync(join(tmpdir(), 'ygo đường dẫn có khoảng trắng '));
afterAll(() => rmSync(temporary, { recursive: true, force: true }));
describe('Cross-platform project resource paths', () => {
  const root = join(temporary, 'Dự án YGO');
  mkdirSync(join(root, 'tools'), { recursive: true }); mkdirSync(join(root, 'dist', 'tools'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'ygo-classic-duel' }));
  it('finds the same root from source and compiled module URLs with spaces/Unicode', () => {
    expect(findProjectRoot(pathToFileURL(join(root, 'tools', 'beta.ts')))).toBe(root);
    expect(findProjectRoot(pathToFileURL(join(root, 'dist', 'tools', 'beta.js')))).toBe(root);
  });
  it('does not confuse a workspace package with the application root', () => {
    writeFileSync(join(root, 'tools', 'package.json'), JSON.stringify({ name: '@ygo/helper' }));
    expect(findProjectRoot(pathToFileURL(join(root, 'tools', 'beta.ts')))).toBe(root);
  });
  it('fails clearly rather than falling back to an unrelated working directory', () => {
    const unrelated = join(temporary, 'unrelated'); mkdirSync(unrelated);
    expect(() => findProjectRoot(pathToFileURL(join(unrelated, 'server.js')))).toThrow('Không tìm thấy');
  });
  it('resolves the actual checkout from the module location', () => {
    expect(findProjectRoot(import.meta.url)).toBe(projectRoot);
    expect(resolve(projectRoot, 'tools', 'project-root.test.ts')).toBe(fileURLToPath(import.meta.url));
  });
  it('runs preflight outside the project working directory without shell-specific commands', () => {
    const output = execFileSync(process.execPath, [join(projectRoot, 'tools', 'check-environment.mjs')], { cwd: temporary, encoding: 'utf8' });
    expect(output).toContain('Kiểm tra môi trường đạt'); expect(output).toContain(process.platform);
    expect(output).toContain('Windows 11');
  });

  // A source-only checkout models preflight before npm ci/build, without editing the real repo.
  function preflightFixture() {
    const folder = mkdtempSync(join(temporary, 'Kiểm tra đầu vào '));
    const files = ['tools/check-environment.mjs', 'tools/runtime-catalog-inputs.json', 'package.json', 'package-lock.json',
      ...Object.values(inputs.bundles), ...Object.values(inputs.reviews).flat(),
      'apps/beta/public/index.html', 'apps/beta/public/app.js', 'apps/beta/public/style.css',
      'apps/beta/public/assets/card-frames/monster-and-back.png', 'apps/beta/public/assets/card-frames/spell-and-trap.png'];
    for (const file of files) {
      mkdirSync(dirname(join(folder, file)), { recursive: true });
      copyFileSync(join(projectRoot, file), join(folder, file));
    }
    for (const seat of ['a', 'b']) {
      const file = `.ygo-local/decks/${seat}.json`; files.push(file);
      mkdirSync(dirname(join(folder, file)), { recursive: true });
      writeFileSync(join(folder, file), `Deck preservation sentinel ${seat}\n`);
    }
    const before = new Map(files.map(file => [file, readFileSync(join(folder, file))]));
    const run = () => spawnSync(process.execPath, [join(folder, 'tools/check-environment.mjs')], { cwd: temporary, encoding: 'utf8' });
    const expectPreserved = (omitted?: string) => {
      for (const [file, bytes] of before) if (file !== omitted) expect(readFileSync(join(folder, file)).equals(bytes), file).toBe(true);
    };
    return { folder, run, expectPreserved };
  }
  it('checks the complete source-only catalog before dependencies or compiled outputs exist', () => {
    expect(Object.keys(inputs.bundles)).toHaveLength(17);
    expect(Object.values(inputs.reviews).flat()).toHaveLength(12);
    const fixture = preflightFixture(), result = fixture.run();
    expect(result.error).toBeUndefined(); expect(result.status).toBe(0);
    expect(result.stdout).toContain('Kiểm tra môi trường đạt');
    expect(existsSync(join(fixture.folder, 'node_modules'))).toBe(false);
    expect(existsSync(join(fixture.folder, 'dist'))).toBe(false);
    fixture.expectPreserved();
  });
  it.each([
    'data/generated/ookazi.json', 'data/reviews/ookazi.effects.json',
    'data/generated/block-attack.json', 'data/reviews/block-attack.effects.json',
    'data/generated/earthquake.json', 'data/reviews/earthquake.effects.json',
    'data/generated/magician-faith.json', 'data/reviews/magician-faith.effects.json',
  ])('rejects missing %s before startup without repairing files or touching saved data', file => {
    const fixture = preflightFixture(); rmSync(join(fixture.folder, file));
    const result = fixture.run();
    expect(result.error).toBeUndefined(); expect(result.status).toBe(1);
    expect(result.stderr).toContain(file); expect(result.stdout).not.toContain('Kiểm tra môi trường đạt');
    expect(existsSync(join(fixture.folder, file))).toBe(false); fixture.expectPreserved(file);
  });
  it('rejects a directory in place of a required review file while preserving its contents', () => {
    const fixture = preflightFixture(), file = 'data/reviews/magician-faith.effects.json', path = join(fixture.folder, file);
    rmSync(path); mkdirSync(path); writeFileSync(join(path, 'keep.txt'), 'preserve this directory');
    const result = fixture.run();
    expect(result.status).toBe(1); expect(result.stderr).toContain(file);
    expect(statSync(path).isDirectory()).toBe(true);
    expect(readFileSync(join(path, 'keep.txt'), 'utf8')).toBe('preserve this directory'); fixture.expectPreserved(file);
  });
});
