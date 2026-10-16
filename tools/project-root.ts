import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Locate source assets from a module URL, independent of shell/cwd and path separators. */
export function findProjectRoot(moduleUrl: string | URL): string {
  let directory = dirname(fileURLToPath(moduleUrl));
  for (;;) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const parsed: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
      if (typeof parsed === 'object' && parsed !== null && 'name' in parsed && parsed.name === 'ygo-classic-duel') return directory;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Không tìm thấy thư mục dự án YGO Classic Duel.');
    directory = parent;
  }
}
export const projectRoot = findProjectRoot(import.meta.url);
