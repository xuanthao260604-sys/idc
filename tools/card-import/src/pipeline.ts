import { createHash } from 'node:crypto';
import { CardBatchSchema } from '../../../packages/card-data/src/schema.js';
import { goat200508Format } from '../../../packages/card-data/src/formats/goat-2005-08-17.js';
import { goatApril2005Restrictions } from '../../../packages/card-data/src/formats/restrictions-2005-04.js';
import { findListedRestriction } from '../../../packages/card-data/src/restrictions.js';
import { ApiResponseSchema, FactsSchema, ManifestSchema, OfficialEvidenceSchema, OverlayBatchSchema, ReceiptSchema } from './contracts.js';
import type { Facts, UpstreamCard } from './contracts.js';

export function canonical(value: unknown): string {
  if (value === undefined) throw new Error('Undefined is not canonical JSON');
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
}
export const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export const fingerprint = (facts: Facts) => sha256(canonical(facts));
export function normalize(card: UpstreamCard): Facts {
  const base = { name: card.name, text: card.desc.replace(/\r\n/g, '\n') };
  if (card.type === 'Spell Card' || card.type === 'Trap Card') {
    return FactsSchema.parse({ ...base, kind: card.type === 'Spell Card' ? 'spell' : 'trap', subtype: card.race.toLowerCase() });
  }
  return FactsSchema.parse({ ...base, kind: card.type === 'Normal Monster' ? 'normal-monster' : 'effect-monster',
    race: card.race, attribute: card.attribute, level: card.level, attack: card.atk, defense: card.def });
}

export function validateUpstreamSnapshot(raw: string, manifestInput: unknown) {
  const manifest = ManifestSchema.parse(manifestInput);
  const { data } = ApiResponseSchema.parse(JSON.parse(raw));
  const ids = data.map(card => String(card.id).padStart(8, '0'));
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate upstream passcode');
  if (new Set(data.map(c => c.name)).size !== data.length) throw new Error('Duplicate upstream name');
  if (data.length !== manifest.cards.length || manifest.cards.some(c => !ids.includes(c.passcode)))
    throw new Error('Upstream batch does not match requested manifest');
  for (const card of data) {
    const expected = manifest.cards.find(c => c.passcode === String(card.id).padStart(8, '0'))!;
    if (card.name !== expected.expectedName || card.misc_info[0]!.konami_id !== expected.konamiId)
      throw new Error(`Identity mismatch: ${expected.passcode}`);
    normalize(card); // Reject missing stats and unsupported data, even before caching a new receipt.
  }
  return data;
}

export function importBatch(input: { raw: string; receipt: unknown; manifest: unknown; overlays: unknown; official: readonly unknown[] }) {
  const receipt = ReceiptSchema.parse(input.receipt);
  if (sha256(input.raw) !== receipt.sha256) throw new Error('Raw snapshot checksum mismatch');
  const sourceUrl = new URL(receipt.url);
  if (sourceUrl.origin !== 'https://db.ygoprodeck.com' || sourceUrl.pathname !== '/api/v7/cardinfo.php')
    throw new Error('Unexpected upstream source');
  const manifest = ManifestSchema.parse(input.manifest);
  const data = validateUpstreamSnapshot(input.raw, manifest);
  const overlays = OverlayBatchSchema.parse(input.overlays);
  const official = input.official.map(e => OfficialEvidenceSchema.parse(e));
  const ids = data.map(card => String(card.id).padStart(8, '0'));
  if (overlays.length !== data.length || official.length !== data.length || new Set(official.map(e => e.passcode)).size !== official.length)
    throw new Error('Missing or duplicate review/evidence records');
  if (overlays.some(e => !ids.includes(e.id.slice('official:'.length))) || official.some(e => !ids.includes(e.passcode)))
    throw new Error('Review/evidence contains unexpected cards');

  const records = data.map(upstream => {
    const passcode = String(upstream.id).padStart(8, '0');
    const expected = manifest.cards.find(c => c.passcode === passcode)!;
    if (upstream.name !== expected.expectedName) throw new Error(`Identity mismatch: ${passcode}`);
    const facts = normalize(upstream);
    const id = `official:${passcode}`;
    const overlay = overlays.find(o => o.id === id);
    const proof = official.find(e => e.passcode === passcode);
    if (!overlay || !proof) throw new Error(`Missing review/evidence for ${id}`);
    if (overlay.baseFingerprint !== fingerprint(facts)) throw new Error(`Review conflict for ${id}: upstream facts changed; preserve overlay and review a new revision`);
    const merged = FactsSchema.parse({ ...facts, ...overlay.patch });
    const officialUrl = new URL(proof.url);
    if (officialUrl.origin !== 'https://www.db.yugioh-card.com' || officialUrl.pathname !== '/yugiohdb/card_search.action'
      || officialUrl.searchParams.get('ope') !== '2' || officialUrl.searchParams.get('cid') !== String(expected.konamiId)
      || officialUrl.searchParams.get('request_locale') !== 'en') throw new Error(`Invalid official evidence URL for ${id}`);
    if (proof.konamiId !== expected.konamiId || upstream.misc_info[0]!.konami_id !== expected.konamiId)
      throw new Error(`Konami identity mismatch for ${id}`);
    if (canonical(merged) !== canonical(proof.currentFacts)) throw new Error(`Official facts mismatch for ${id}`);
    const prefix = proof.printing.setCode.split('-')[0]!;
    if (!manifest.eligibleSetPrefixes.includes(prefix) || !upstream.card_sets.some(s => s.set_code === proof.printing.setCode))
      throw new Error(`Unreviewed print/set eligibility for ${id}`);
    if (proof.printing.date > '2005-08-17') throw new Error(`Printing after format cutoff: ${id}`);
    if (overlay.historicalTextReview === 'not-required-normal-flavor' && merged.kind !== 'normal-monster')
      throw new Error(`Effect card cannot skip historical review: ${id}`);
    const source = { url: receipt.url, accessedOn: receipt.fetchedAt.slice(0, 10), scope: 'identity' as const,
      notes: 'YGOPRODeck v7 snapshot: structured reference data, not proof of historical text/legality.' };
    const identityProof = { url: proof.url, accessedOn: proof.accessedOn, scope: 'identity' as const,
      notes: `Current Konami name/type/stats compared with frozen evidence; CID ${proof.konamiId}.` };
    const textProof = { ...identityProof, scope: 'text' as const, notes: 'Current official reference text; not represented as original 2005 wording.' };
    const releaseProof = { ...identityProof, scope: 'release' as const,
      notes: `Reviewed North American print ${proof.printing.setCode}, ${proof.printing.date}, ${proof.printing.product}; not inferred from API tcg_date.` };
    const restrictionEvidence = goatApril2005Restrictions.evidence.map(e => ({ url: e.url, accessedOn: e.accessedOn,
      scope: 'restriction' as const, notes: `Goat list reviewed: ${goatApril2005Restrictions.id} revision ${goatApril2005Restrictions.revision}.` }));
    const maxCopies = findListedRestriction(goatApril2005Restrictions, merged.name) ?? 3;
    return {
      card: { ...merged, schemaVersion: 1, id, origin: 'official', revision: overlay.revision, passcode,
        textBasis: 'current-reference', sources: [source, identityProof, textProof, ...overlay.sources],
        verification: overlay.historicalTextReview === 'not-required-normal-flavor' ? 'verified' : 'pending',
        implementation: 'not-started', testing: 'not-run', effects: [],
        legality: { formatId: manifest.formatId, status: maxCopies === 0 ? 'illegal' : 'legal', maxCopies,
          evidence: [releaseProof, manifest.eligibilitySource, ...restrictionEvidence] } },
      review: { id, fingerprint: fingerprint(facts), historicalTextReview: overlay.historicalTextReview,
        upstreamText: facts.text, referenceText: merged.text, notes: overlay.notes, printing: proof.printing,
        upstreamTcgDate: upstream.misc_info[0]!.tcg_date ?? null },
    };
  }).sort((a, b) => a.card.id.localeCompare(b.card.id, 'en'));
  const cards = CardBatchSchema.parse(records.map(r => r.card));
  return { schemaVersion: 1, format: { id: manifest.formatId, revision: goat200508Format.revision },
    provenance: { upstreamSha256: receipt.sha256, manifestSha256: sha256(canonical(manifest)),
      reviewSha256: sha256(canonical(overlays)), officialEvidenceSha256: sha256(canonical(official)) },
    cards, reviews: records.map(r => r.review),
    summary: { imported: cards.length, verifiedData: cards.filter(c => c.verification === 'verified').length,
      historicalReviewPending: records.filter(r => r.review.historicalTextReview === 'pending').length,
      implemented: 0, testedEffects: 0, playable: 0 },
  };
}

export function assertRevisionProgress(previousCards: unknown, nextCards: unknown) {
  const previous = CardBatchSchema.parse(previousCards);
  const next = CardBatchSchema.parse(nextCards);
  const revisionPayload = (card: (typeof next)[number]) => {
    const { revision, sources, legality, ...rest } = card;
    const { evidence, ...limits } = legality;
    return canonical({ ...rest, legality: limits });
  };
  for (const old of previous) {
    const updated = next.find(card => card.id === old.id);
    if (!updated) throw new Error(`Refusing to drop existing card ${old.id}; use a new bundle for a different selection`);
    if (updated.revision < old.revision || (revisionPayload(old) !== revisionPayload(updated) && updated.revision <= old.revision))
      throw new Error(`Card revision must advance for ${old.id}`);
  }
}
