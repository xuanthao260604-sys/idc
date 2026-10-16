import { describe, expect, it } from 'vitest';
import { browserCandidates, browserLaunchArgs, resolveBrowser } from './browser-executable.js';
describe('Windows-first browser discovery policy; pure path tests are not a Windows execution', () => {
  it('finds Edge then Chrome in Windows installation roots including Unicode/spaces', () => {
    const candidates = browserCandidates('win32', { ProgramFiles: 'D:\\Ứng dụng', 'PROGRAMFILES(X86)': 'D:\\Program Files (x86)', localappdata: 'D:\\Người dùng\\Local' });
    expect(candidates[0]).toEqual({ path: 'D:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', brand: 'Microsoft Edge' });
    expect(candidates.some(c => c.path === 'D:\\Người dùng\\Local\\Google\\Chrome\\Application\\chrome.exe')).toBe(true);
  });
  it('uses SystemDrive for fallback paths and executable names for PATH lookup', () => {
    const candidates = browserCandidates('win32', { SYSTEMDRIVE: 'E:' });
    expect(candidates[0]!.path).toMatch(/^E:/); expect(candidates.at(-1)!.path).toBe('chrome.exe');
  });
  it('honors an explicit executable as one argument without shell interpretation or silent fallback', () => {
    const path = 'C:\\Browser test\\chrome.exe';
    expect(browserCandidates('win32', { YGO_CHROMIUM: path })).toEqual([{ path, brand: 'Google Chrome' }]);
    expect(() => resolveBrowser({ YGO_CHROMIUM: 'missing-ygo-browser-file.exe', PATH: '' })).toThrow('Không tìm thấy');
  });
  it('does not pass Linux-specific sandbox/shared-memory flags to Windows', () => {
    const path = 'C:\\Người dùng\\Browser profile'; const args = browserLaunchArgs('win32', path);
    expect(args).toContain(`--user-data-dir=${path}`); expect(args).not.toContain('--no-sandbox'); expect(args).not.toContain('--disable-dev-shm-usage');
    expect(args).toContain('--remote-debugging-address=127.0.0.1');
  });
  it('keeps supported Linux executable discovery and cloud launch flags', () => {
    expect(browserCandidates('linux', {})[0]!.path).toBe('chromium'); expect(browserLaunchArgs('linux', '/tmp/test')).toContain('--disable-dev-shm-usage');
  });
  it('resolves an explicitly supplied existing executable without a shell', () => {
    expect(resolveBrowser({ YGO_CHROMIUM: process.execPath }).path).toBe(process.execPath);
  });
});
