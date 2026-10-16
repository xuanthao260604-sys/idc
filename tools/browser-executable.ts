import { accessSync, constants, statSync } from 'node:fs';
import { delimiter, isAbsolute, join, win32 } from 'node:path';

interface Browser { path: string; brand: string }
type Environment = Readonly<Record<string, string | undefined>>;
const setting = (env: Environment, name: string) => Object.entries(env).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
const brand = (path: string) => /msedge|microsoft[ -]edge/i.test(path) ? 'Microsoft Edge' : /chromium/i.test(path) ? 'Chromium' : /chrome/i.test(path) ? 'Google Chrome' : 'Chromium-compatible';
/** Pure candidate policy, separately testable without claiming a Windows runtime was exercised. */
export function browserCandidates(platform: string, env: Environment): Browser[] {
  const override = setting(env, 'YGO_CHROMIUM');
  if (override) return [{ path: override, brand: brand(override) }];
  let paths: string[];
  if (platform === 'win32') {
    const drive = setting(env, 'SystemDrive') ?? 'C:';
    const roots = [setting(env, 'ProgramFiles(x86)') ?? `${drive}\\Program Files (x86)`, setting(env, 'ProgramFiles') ?? `${drive}\\Program Files`, setting(env, 'LOCALAPPDATA')].filter((p): p is string => !!p);
    paths = [...roots.map(p => win32.join(p, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
      ...roots.map(p => win32.join(p, 'Google', 'Chrome', 'Application', 'chrome.exe')), 'msedge.exe', 'chrome.exe'];
  } else if (platform === 'darwin') paths = ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  else paths = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'microsoft-edge'];
  return [...new Set(paths)].map(path => ({ path, brand: brand(path) }));
}
export function resolveBrowser(env: Environment = process.env): Browser {
  const executable = (path: string) => { try { accessSync(path, constants.X_OK); return statSync(path).isFile(); } catch { return false; } };
  for (const candidate of browserCandidates(process.platform, env)) {
    if (isAbsolute(candidate.path) || candidate.path.includes('/') || candidate.path.includes('\\')) {
      if (executable(candidate.path)) return candidate;
    } else {
      for (const directory of (setting(env, 'PATH') ?? '').split(delimiter).filter(Boolean)) {
        const full = join(directory, candidate.path);
        if (executable(full)) return { ...candidate, path: full };
      }
    }
  }
  throw new Error('Không tìm thấy Edge/Chrome/Chromium cho kiểm thử. Có thể đặt YGO_CHROMIUM thành đường dẫn executable. Đây không phải yêu cầu để chơi beta.');
}
export function browserLaunchArgs(platform: string, directory: string): string[] {
  return ['--headless', ...(platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : []),
    '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${directory}`, 'about:blank'];
}
