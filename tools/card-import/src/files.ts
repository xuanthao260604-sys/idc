import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { sha256 } from './pipeline.js';

export async function readIfExists(path: string): Promise<string | undefined> {
  try { return await readFile(path, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
export async function atomicWrite(path: string, contents: string) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${randomUUID()}`;
  try {
    const handle = await open(temporary, 'wx');
    try { await handle.writeFile(contents, 'utf8'); await handle.sync(); } finally { await handle.close(); }
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}
export async function saveImmutableSnapshot(path: string, contents: string) {
  await mkdir(dirname(path), { recursive: true });
  const existing = await readIfExists(path);
  if (existing !== undefined) {
    if (sha256(existing) !== sha256(contents)) throw new Error('Existing raw snapshot is corrupt; refusing overwrite');
    return;
  }
  const handle = await open(path, 'wx');
  try { await handle.writeFile(contents, 'utf8'); } finally { await handle.close(); }
}
