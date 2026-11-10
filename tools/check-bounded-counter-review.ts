import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { EvidenceSchema } from '../packages/card-data/src/format.js';
import { CounterReviewsSchema } from '../packages/engine/src/counter-review.js';
import { COUNTER_CONTINUATION_PINS } from '../packages/engine/src/counter-continuation.js';
import { definitionFingerprint } from '../packages/engine/src/spell-review.js';
import { loadRuntimeCatalog } from './runtime-catalog.js';
import { projectRoot } from './project-root.js';

const id = z.string().min(1), sha = z.string().regex(/^[a-f0-9]{64}$/), day = z.iso.date();
const Source = z.strictObject({ id, url: z.url(), sourceKind: EvidenceSchema.shape.sourceKind, accessedOn: day, checkedOn: day,
  sha256: sha, bytes: z.number().int().positive(), rawPath: id.optional(), cacheFile: z.string().regex(/^[a-zA-Z0-9._-]+\.pdf$/).optional(), notes: id,
  provenance: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('fresh-source') }),
    z.strictObject({ kind: z.literal('review-source'), path: id, sourceId: id })]) }).refine(s => Boolean(s.rawPath) !== Boolean(s.cacheFile), 'Exactly one source location required');
const Quote = z.strictObject({ id, sourceId: id, evidence: EvidenceSchema, locator: id.optional(),
  reusedFrom: z.strictObject({ path: id, reviewIndex: z.number().int().nonnegative(), evidenceIndex: z.number().int().nonnegative() }).optional() });
const Profile = z.strictObject({ schemaVersion: z.literal(1), status: z.literal('design-reviewed-not-enabled'), reviewedOn: day,
  basedOnCommit: z.string().regex(/^[a-f0-9]{40}$/), format: z.strictObject({ id: z.literal('goat-2005-08-17'), revision: z.literal(4) }),
  runtimeEnabled: z.literal(false), historicalPrintedTextReview: z.literal('pending'), activationImplementation: z.literal('not-started'), effectTestsForNewScope: z.literal('not-run'), existingInfrastructure: id,
  activeBaseline: z.strictObject({ sevenReviewPath: z.literal('data/reviews/seven-tools-v5.effects.json'), sevenRevision: z.literal(5),
    testedSource: z.literal('898b29c2c603f4fb017b3a50cbb01369af4ea84e'), ciRunId: z.literal(42590265485),
    tests: z.literal(4832), files: z.literal(63), windowsSteps: z.literal(112), windowsBrowserReports: z.literal(102), windows11DesktopVerified: z.literal(false) }),
  proposal: z.strictObject({ cardId: z.literal('official:03819470'), definitionSha256: sha, revision: z.literal(6), scope: z.literal('counter-trap-reviewed-bounded-patterns-v6'),
    continuation: z.literal('reviewed-bounded-counter-patterns-v6'), handler: z.literal('pay-1000-negate-trap-hole-activation'), activeFileNotCreated: id }),
  grammar: z.strictObject({ spellFamily: z.strictObject({ rootSpellIds: z.array(id).length(11), sevenMin: z.literal(0), sevenMax: z.literal(6), maxLinks: z.literal(8) }),
    trapFamily: z.strictObject({ trapMin: z.literal(1), trapMax: z.literal(3), sevenMin: z.literal(0), sevenMax: z.literal(6), maxLinks: z.literal(8), sameSummonOccurrence: z.literal(true) }),
    limits: z.strictObject({ players: z.literal(2), sevenCopiesPerOwner: z.literal(3), trapCopiesPerOwner: z.literal(3), spellTrapSlotsPerPlayer: z.literal(5) }),
    phases: z.tuple([z.literal('main1'), z.literal('main2')]), summonMethods: z.tuple([z.literal('normal'), z.literal('tribute'), z.literal('flip')]) }),
  cardPins: z.array(z.strictObject({ cardId: id, name: id, definitionSha256: sha, definitionRevision: z.number().int().positive(), maxCopies: z.number().int().min(1).max(3) })).length(14),
  sources: z.array(Source).length(14), quotations: z.array(Quote).length(30),
  decisions: z.array(z.strictObject({ id, category: z.enum(['rule-synthesis', 'engineering-contract']), conclusion: id, evidenceIds: z.array(id).min(1), rationale: id, limitations: id })).length(12),
  openImplementationChecks: z.array(z.strictObject({ id, status: z.literal('not-started'), requirement: id })).length(6),
  notCovered: z.array(id).min(1), reviewLimitations: z.array(id).min(1), remainingMilestones: z.array(id).min(1) });
const hash = (b: string | Buffer) => createHash('sha256').update(b).digest('hex');
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function check(v: unknown, message: string): asserts v { if (!v) throw new Error(message); }
const normalize = (s: string) => s.replace(/\s+/gu, ' ').trim();

/** Bounded source-text normalizer, not a browser/HTML execution engine. Preserve
 * words across inline tags; only block boundaries insert spaces. Unknown entities
 * remain unchanged so they cannot silently manufacture a verified quotation.
 */
function htmlText(html: string) {
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ',
    ndash: '\u2013', mdash: '\u2014', lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d', hellip: '\u2026' };
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<\/?(?:address|article|aside|blockquote|br|caption|dd|div|dl|dt|footer|h[1-6]|header|hr|li|main|nav|ol|p|section|table|tbody|td|th|thead|tr|ul)\b[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, key: string) => {
      if (!key.startsWith('#')) return entities[key.toLowerCase()] ?? whole;
      const n = key.toLowerCase().startsWith('#x') ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
      return n >= 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : whole;
    });
}

/** Review integrity only. No network, imports, manifests or game state are written.
 * pdftotext (or YGO_PDFTOTEXT) is a reviewer dependency, never a player requirement.
 */
export function checkBoundedCounterReview(input: unknown, evidenceDirectory: string, root = projectRoot) {
  const repoFile = (path: string) => {
    check(/^(data|tools)\//.test(path) && !path.includes('\\') && !path.split('/').includes('..'), 'Expected repository-relative review path');
    return join(root, path);
  };
  const p = Profile.parse(input), read = (path: string) => JSON.parse(readFileSync(repoFile(path), 'utf8'));
  const { registry } = loadRuntimeCatalog(root), ids = new Set(p.cardPins.map(c => c.cardId));
  check(registry.rules.spellTrapSlots === 5 && registry.rules.deck.combinedCopyLimit === 3, 'Adopted copy/slot rules changed');
  const expected: Readonly<Record<string, string>> = { ...COUNTER_CONTINUATION_PINS, 'official:04206964': '6bde121e8b1b4409e34d907b2d9e9d5ba5df93676a46507d205cd6d96372d35d' };
  check(ids.size === 14 && Object.keys(expected).every(id => ids.has(id)), 'Card pin universe changed');
  for (const pin of p.cardPins) {
    const def = registry.cards[pin.cardId];
    check(def && pin.definitionSha256 === expected[pin.cardId] && pin.definitionSha256 === definitionFingerprint(def)
      && pin.definitionRevision === def.revision && pin.name === def.name && pin.maxCopies === def.legality.maxCopies, 'Card definition/pin drift: ' + pin.cardId);
  }
  check(same([...p.grammar.spellFamily.rootSpellIds].sort(), Object.keys(COUNTER_CONTINUATION_PINS).filter(id => registry.cards[id]!.kind === 'spell').sort()), 'Root Spell set changed');
  for (const key of ['sources', 'quotations', 'decisions', 'openImplementationChecks'] as const)
    check(new Set(p[key].map(v => v.id)).size === p[key].length, 'Duplicate review identifiers: ' + key);

  const texts = new Map<string, string[]>();
  for (const s of p.sources) {
    const provenance = s.provenance;
    if (provenance.kind === 'review-source') {
      const old = read(provenance.path).sources.find((v: { id: string }) => v.id === provenance.sourceId);
      check(old && old.url === s.url && old.sourceKind === s.sourceKind && old.sha256 === s.sha256 && old.bytes === s.bytes, 'Prior source metadata drift: ' + s.id);
      if (s.rawPath) check(s.rawPath === old.rawPath && s.accessedOn === old.accessedOn, 'Raw retrieval provenance changed');
    } else check(s.url.includes('cid=4836') && s.accessedOn === p.reviewedOn, 'Unexpected fresh source');
    const path = s.rawPath ? repoFile(s.rawPath) : join(resolve(evidenceDirectory), s.cacheFile!);
    const bytes = readFileSync(path);
    check(bytes.length === s.bytes && hash(bytes) === s.sha256, 'Source bytes/hash mismatch: ' + s.id);
    if (s.rawPath) texts.set(s.id, [normalize(htmlText(bytes.toString('utf8')))]);
    else {
      const variants = [[], ['-layout']].map(flags => {
        const r = spawnSync(process.env.YGO_PDFTOTEXT ?? 'pdftotext', [...flags, path, '-'], { encoding: 'utf8', shell: false, maxBuffer: 8 * 1024 * 1024 });
        check(!r.error && r.status === 0 && !r.signal, 'PDF extraction failed: ' + s.id + ' ' + (r.error?.message ?? r.stderr));
        return normalize(r.stdout);
      });
      texts.set(s.id, variants);
    }
  }
  for (const q of p.quotations) {
    const s = p.sources.find(s => s.id === q.sourceId);
    check(s && s.url === q.evidence.url && s.sourceKind === q.evidence.sourceKind, 'Quotation/source attribution mismatch');
    if (q.reusedFrom) {
      const ref = q.reusedFrom;
      check(same(read(ref.path)[ref.reviewIndex]?.evidence[ref.evidenceIndex], q.evidence), 'Inherited evidence body/date changed: ' + q.id);
    } else check(q.locator && q.evidence.accessedOn === p.reviewedOn, 'New quotation needs actual review locator/date');
    check(texts.get(q.sourceId)!.some(text => text.includes(normalize(q.evidence.quotation))), 'Quotation absent from source: ' + q.id);
  }
  for (const d of p.decisions) check(d.evidenceIds.every(id => p.quotations.some(q => q.id === id)), 'Missing decision evidence: ' + d.id);
  check(p.proposal.definitionSha256 === expected[p.proposal.cardId], 'Proposed review pin drift');
  check(!CounterReviewsSchema.safeParse([p]).success, 'Design profile must not be an active effect review');
  const active = read(p.activeBaseline.sevenReviewPath)[0];
  check(active.cardId === p.proposal.cardId && active.revision === 5 && active.definitionSha256 === p.proposal.definitionSha256
    && active.scope === 'counter-trap-reviewed-four-link-patterns-v5', 'Historical v5 baseline drift');
  const proposed = { ...active, revision: p.proposal.revision, scope: p.proposal.scope, continuation: p.proposal.continuation };
  const manifest = read('tools/runtime-catalog-inputs.json');
  const allInputs = Object.values(manifest.reviews).flat() as string[];
  check(!allInputs.includes('data/evidence/effects/bounded-counter-scope-review.json'), 'Design profile entered runtime manifest');
  const current = loadRuntimeCatalog(root).effectReviews.counters.find(r => r.cardId === p.proposal.cardId)!;
  const owners = Array.from({ length: 7 }, (_, n) => Array.from({ length: 2 ** n }, (_, bits) =>
    Array.from({ length: n }, (_, i) => bits & (1 << i) ? 'a' : 'b'))).flat()
    .filter(s => s.filter(w => w === 'a').length <= 3 && s.filter(w => w === 'b').length <= 3);
  const traps = [1, 2, 3].map(k => owners.filter(s => k + s.filter(w => w === 'b').length <= 5));
  check(same(traps.map(s => s.length), [69, 69, 34]) && owners.length === 69, 'Copy/slot design enumeration changed');
  check(same(traps.map((cases, i) => Math.max(...cases.map(s => i + 1 + s.length))), [7, 8, 8]), 'Trap family bound changed');
  for (const magicOwner of ['a', 'b']) {
    const legal = owners.filter(s => ['a', 'b'].every(w => Number(w === 'a') + Number(w === magicOwner) + s.filter(o => o === w).length <= 5));
    check(legal.length === 69 && Math.max(...legal.map(s => s.length + 2)) === 8, 'Spell family bound changed');
  }
  return { status: 'review-integrity-passed', reviewedOn: p.reviewedOn, cardPins: p.cardPins.length, sources: p.sources.length,
    quotationsMatched: p.quotations.length, inheritedEvidenceUnchanged: p.quotations.filter(q => q.reusedFrom).length,
    decisions: p.decisions.length, openImplementationChecks: p.openImplementationChecks.length,
    trapAssignments: traps.map(s => s.length), spellAssignmentsPerRootAndMagicOwner: owners.length, maxLinksForSelectedPool: 8,
    activeSevenRevision: current.revision, activeV5StillSelected: current.revision === 5 && allInputs.includes(p.activeBaseline.sevenReviewPath),
    proposalAcceptedByCurrentSchema: CounterReviewsSchema.safeParse([proposed]).success,
    proposedActiveFileExists: existsSync(join(root, p.proposal.activeFileNotCreated)), runtimeEnabled: p.runtimeEnabled,
    newScopeEffectTests: p.effectTestsForNewScope, historicalPrintedTextReview: p.historicalPrintedTextReview };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Usage: node dist/tools/check-bounded-counter-review.js <evidence-cache-directory>');
  const input = JSON.parse(readFileSync(join(projectRoot, 'data/evidence/effects/bounded-counter-scope-review.json'), 'utf8'));
  console.log(JSON.stringify(checkBoundedCounterReview(input, directory), null, 2));
}
