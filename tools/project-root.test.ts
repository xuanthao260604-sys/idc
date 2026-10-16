import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { afterAll, describe, expect, it } from 'vitest';
import { findProjectRoot, projectRoot } from './project-root.js';
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
});
