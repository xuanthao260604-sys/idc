import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { z } from 'zod';
import { freeze, validateDeck } from '../packages/engine/src/registry.js';
import type { Registry } from '../packages/engine/src/registry.js';

type Seat = 'a' | 'b';
export interface SavedDeck { readonly seat: Seat; readonly revision: number; readonly cards: readonly string[] }
const FileSchema = z.strictObject({ schemaVersion: z.literal(1), format: z.strictObject({ id: z.string(), revision: z.number().int() }),
  revision: z.number().int().positive().safe(), cards: z.array(z.string().min(1).max(128)) });

export function deckIssues(registry: Registry, cards: readonly string[]): string[] {
  const issues: string[] = [], counts = new Map<string, number>();
  if (cards.length < registry.rules.deck.mainMin) issues.push(`Deck cần ít nhất ${registry.rules.deck.mainMin} lá (hiện có ${cards.length}).`);
  if (registry.rules.deck.mainMax !== null && cards.length > registry.rules.deck.mainMax) issues.push(`Deck vượt giới hạn ${registry.rules.deck.mainMax} lá.`);
  for (const id of cards) {
    if (!Object.hasOwn(registry.cards, id)) { if (!issues.includes('Deck chứa bài chưa được hỗ trợ.')) issues.push('Deck chứa bài chưa được hỗ trợ.'); continue; }
    const card = registry.cards[id]!; counts.set(card.name, (counts.get(card.name) ?? 0) + 1);
  }
  for (const card of Object.values(registry.cards)) {
    const limit = Math.min(registry.rules.deck.combinedCopyLimit, card.legality.maxCopies!);
    if ((counts.get(card.name) ?? 0) > limit) issues.push(`${card.name}: tối đa ${limit} bản sao.`);
  }
  if (!issues.length) validateDeck(registry, cards);
  return issues;
}
export function defaultDeck(registry: Registry): string[] {
  const cards: string[] = [];
  for (let copy = 1; copy <= registry.rules.deck.combinedCopyLimit && cards.length < registry.rules.deck.mainMin; copy++)
    for (const card of Object.values(registry.cards)) if (cards.length < registry.rules.deck.mainMin && card.legality.maxCopies! >= copy) cards.push(card.id);
  validateDeck(registry, cards); return cards;
}

/** Disk directory is trusted startup configuration, never an HTTP path. No stored duel state. */
export function createDeckStore(registry: Registry, directory?: string) {
  const initial = defaultDeck(registry);
  const decks: Record<Seat, SavedDeck> = { a: freeze({ seat: 'a', revision: 0, cards: [...initial] }), b: freeze({ seat: 'b', revision: 0, cards: [...initial] }) };
  for (const seat of ['a', 'b'] as const) if (directory) {
    let text: string;
    try { text = readFileSync(join(directory, `${seat}.json`), 'utf8'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw new Error(`Không đọc được deck ${seat}; giữ nguyên file đã lưu.`); }
    let input: unknown;
    try { input = JSON.parse(text); } catch { throw new Error(`Deck ${seat} đã lưu không đọc được JSON; giữ nguyên file để kiểm tra.`); }
    const file = FileSchema.safeParse(input);
    if (!file.success || file.data.format.id !== registry.format.id || file.data.format.revision !== registry.format.revision || deckIssues(registry, file.data.cards).length)
      throw new Error(`Deck ${seat} đã lưu không hợp lệ; giữ nguyên file để kiểm tra.`);
    decks[seat] = freeze({ seat, revision: file.data.revision, cards: [...file.data.cards] });
  }
  let queue = Promise.resolve();
  return {
    get: (seat: Seat) => decks[seat],
    defaults: freeze([...initial]),
    save(seat: Seat, revision: number, cards: readonly string[]) {
      const candidate = [...cards];
      const operation = queue.then(async () => {
        if (decks[seat].revision !== revision) return { ok: false as const, status: 409, error: 'Deck đã được sửa ở cửa sổ khác. Đóng rồi mở lại để tải bản mới; bản đang sửa chưa được lưu.' };
        const issues = deckIssues(registry, candidate);
        if (issues.length) return { ok: false as const, status: 422, error: issues.join(' '), issues };
        const next = freeze({ seat, revision: revision + 1, cards: candidate });
        if (directory) {
          await mkdir(directory, { recursive: true });
          const path = join(directory, `${seat}.json`), temporary = `${path}.tmp-${randomUUID()}`;
          try {
            const handle = await open(temporary, 'wx');
            try { await handle.writeFile(JSON.stringify({ schemaVersion: 1, format: registry.format, revision: next.revision, cards: next.cards }, null, 2) + '\n', 'utf8'); await handle.sync(); }
            finally { await handle.close(); }
            await rename(temporary, path);
          } finally { await rm(temporary, { force: true }); }
        }
        decks[seat] = next; return { ok: true as const, deck: next };
      });
      queue = operation.then(() => {}, () => {}); return operation;
    },
  };
}
export type DeckStore = ReturnType<typeof createDeckStore>;
