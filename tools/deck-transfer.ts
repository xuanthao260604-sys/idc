import { z } from 'zod';
import type { Registry } from '../packages/engine/src/registry.js';
import { deckIssues } from './deck-store.js';

const TransferSchema = z.strictObject({
  kind: z.literal('ygo-classic-deck'), schemaVersion: z.literal(1),
  format: z.strictObject({ id: z.string(), revision: z.number().int() }),
  cards: z.array(z.string().min(1).max(128)),
});
export const maxDeckFileBytes = 12000;
/** Portable card IDs only. No seat, saved revision, definitions or duel state. */
export function exportDeck(registry: Registry, cards: readonly string[]) {
  const issues = deckIssues(registry, cards);
  if (issues.length) throw new Error(issues.join(' '));
  return { kind: 'ygo-classic-deck' as const, schemaVersion: 1 as const, format: registry.format, cards: [...cards] };
}
export function importDeck(registry: Registry, text: string): string[] {
  if (Buffer.byteLength(text, 'utf8') > maxDeckFileBytes) throw new Error('File deck vượt 12.000 byte.');
  let input: unknown;
  try { input = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('File deck không đọc được JSON.'); }
  const parsed = TransferSchema.safeParse(input);
  if (!parsed.success) throw new Error('File không đúng định dạng deck Classic Duel phiên bản 1.');
  if (parsed.data.format.id !== registry.format.id || parsed.data.format.revision !== registry.format.revision)
    throw new Error('File deck dùng bộ luật hoặc phiên bản luật khác.');
  const issues = deckIssues(registry, parsed.data.cards);
  if (issues.length) throw new Error(issues.join(' '));
  return [...parsed.data.cards];
}
