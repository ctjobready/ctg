import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST_DIR } from './env';
import { CMF_COMPONENTS, CMF_COMPRESSIONS, CMF_ROWS, isCmfTag } from '../../src/data/cmf';
// The site's own HTML parser (scripts/lib/dist.mjs, used by the build gates), so nested bands are read by their real tree, not by a regex.
import { elements, parseHtml, visibleText } from '../../scripts/lib/dist.mjs';

/**
 * WP175 (owner decision of 28 November 2026): reads the CMF order of a built page for the per-page specs of packages A, B and C.
 * Every conversion-page band sits in a Tone wrapper that carries `data-cmf` (src/components/pages/home/Tone.astro; the values are src/data/cmf.ts).
 *
 *   readBuilt(route)            the built HTML of "/", "/partner-with-us/governments/", …
 *   cmfTags(html)               every data-cmf value inside <main>, in document order (a tag nested in a band, such as NU's C14 list inside C13, included)
 *   cmfSequence(html)           the same with consecutive repeats collapsed: a band and its sub-blocks (cases + journeys, both C7) are one slot
 *   cmfProblems(seq, opts)      order and coverage: C1 first, GEO directly after it, C5 to C14 once each and ascending, C12 directly before C13,
 *                               the declared compression (C2-C4, C2-C3 or none), recorded rows only between GEO and C2, declared omissions
 *   cmfBandHtml(html, tag)      the outer HTML of each band tagged `tag` (outermost only)
 *   cmfBandText(html, tag)      the visible text of those bands (sr-only text, scripts and hidden subtrees dropped), one line per block element
 *   inOrder(text, parts)        problems unless every part is in the text, in that order (C5: empathy → origin → authority → method)
 *   lastParagraph(bandHtml)     the visible text of the band's last <p> (a compressed C2 band ends with the C3 transition line)
 *   textOf(html)                visible text of a fragment, whitespace collapsed
 */

type El = { type: 'element'; tag: string; attrs: Record<string, string>; children: unknown[]; start: number; end: number };

/** The built HTML of a site route ("/" or "/a/b/"). */
export function readBuilt(route: string): string {
  const rel = route === '/' ? 'index.html' : `${route.replace(/^\/+|\/+$/g, '')}/index.html`;
  return readFileSync(join(DIST_DIR, rel), 'utf8');
}

const mainOf = (html: string): El => {
  const root = parseHtml(html);
  return ((elements(root, 'main') as El[])[0] ?? root) as El;
};

/** Every data-cmf value inside <main>, in document order. */
export function cmfTags(html: string): string[] {
  return (elements(mainOf(html)) as El[]).filter((el) => 'data-cmf' in el.attrs).map((el) => el.attrs['data-cmf']);
}

/** cmfTags with consecutive repeats collapsed to one slot. */
export function cmfSequence(html: string): string[] {
  return cmfTags(html).filter((t, i, all) => i === 0 || all[i - 1] !== t);
}

/** The outermost elements tagged `tag`, as source slices. */
function bands(html: string, tag: string): El[] {
  const tagged = (elements(mainOf(html)) as El[]).filter((el) => el.attrs['data-cmf'] === tag);
  return tagged.filter((el) => !tagged.some((o) => o !== el && o.start <= el.start && el.end <= o.end));
}

/** The outer HTML of each band tagged `tag`. */
export function cmfBandHtml(html: string, tag: string): string[] {
  return bands(html, tag).map((el) => html.slice(el.start, el.end));
}

/** Visible text of a fragment (sr-only text dropped, entities decoded), whitespace collapsed. */
export function textOf(fragment: string): string {
  const cleaned = fragment.replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, '').replace(/<svg\b[\s\S]*?<\/svg>/g, '');
  // parseHtml decodes the text nodes (entities included), so the text is not decoded twice
  return (visibleText(parseHtml(cleaned)).text as string)
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:)?!])/g, '$1')
    .trim();
}

/** The visible text of every band tagged `tag`, one band per line. */
export function cmfBandText(html: string, tag: string): string {
  return cmfBandHtml(html, tag).map(textOf).join('\n');
}

/** Problems unless every part occurs in `text` in the order given (each after the previous one). */
export function inOrder(text: string, parts: string[]): string[] {
  const flat = text.replace(/\s+/g, ' ');
  const out: string[] = [];
  let from = 0;
  for (const part of parts) {
    const at = flat.indexOf(part.replace(/\s+/g, ' '), from);
    if (at < 0) {
      out.push(flat.includes(part) ? `"${part}" comes too early (before "${parts[parts.indexOf(part) - 1]}")` : `"${part}" is missing`);
      continue;
    }
    from = at + part.length;
  }
  return out;
}

/** The visible text of the last <p> of a band. */
export function lastParagraph(bandHtml: string): string {
  const ps = [...bandHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)];
  return ps.length ? textOf(ps[ps.length - 1][1]) : '';
}

export interface CmfOptions {
  /** The page's declared compression: C2 to C4 in one band, C2 to C3 in one band (with its own C4 band), or none (C2, C3 and C4 each a band). */
  compression: 'C2-C4' | 'C2-C3' | 'none';
  /** Components the page omits by a declared exception (the NU Post Graduate Diploma's C10, S4-C2). */
  omit?: string[];
  /** Recorded non-CMF rows the page carries between GEO and C2 (RESULTS, ROUTER, GLANCE). */
  rows?: string[];
}

const RANK: Record<string, number> = Object.fromEntries(CMF_COMPONENTS.map((c, i) => [c, i]));
RANK[CMF_COMPRESSIONS['C2-C4']] = RANK.C2;
RANK[CMF_COMPRESSIONS['C2-C3']] = RANK.C2;

/** Order and coverage problems of a collapsed data-cmf sequence (empty when the page follows CMF v3 with its declared compression and exceptions). */
export function cmfProblems(seq: string[], { compression, omit = [], rows = [] }: CmfOptions): string[] {
  const out: string[] = [];
  const count = (t: string) => seq.filter((s) => s === t).length;
  for (const t of seq) if (!isCmfTag(t)) out.push(`"${t}" is not a CMF tag`);
  for (const r of CMF_ROWS) {
    if (count(r) && !rows.includes(r)) out.push(`the recorded row ${r} is on the page but not declared for it`);
  }
  if (seq[0] !== 'C1') out.push(`C1 is not first (the first band is ${seq[0] ?? 'missing'})`);
  if (seq[1] !== 'GEO') out.push(`GEO does not directly follow C1 (band 2 is ${seq[1] ?? 'missing'})`);
  const c2 = seq.findIndex((t) => t === 'C2' || t === CMF_COMPRESSIONS['C2-C4'] || t === CMF_COMPRESSIONS['C2-C3']);
  seq.forEach((t, i) => {
    if ((CMF_ROWS as readonly string[]).includes(t) && (i < 2 || (c2 >= 0 && i > c2))) out.push(`the recorded row ${t} sits at band ${i + 1}, outside the slot between GEO and C2`);
  });
  const required: string[] = ['C1', 'GEO'];
  if (compression === 'C2-C4') required.push(CMF_COMPRESSIONS['C2-C4']);
  else if (compression === 'C2-C3') required.push(CMF_COMPRESSIONS['C2-C3'], 'C4');
  else required.push('C2', 'C3', 'C4');
  required.push(...CMF_COMPONENTS.slice(5));
  for (const t of required) {
    if (omit.includes(t)) {
      if (count(t)) out.push(`${t} is declared omitted but is on the page`);
      continue;
    }
    if (count(t) !== 1) out.push(`${t} appears ${count(t)} times (once expected)`);
  }
  const forbidden = compression === 'C2-C4' ? ['C2', 'C3', 'C4', CMF_COMPRESSIONS['C2-C3']] : compression === 'C2-C3' ? ['C2', 'C3', CMF_COMPRESSIONS['C2-C4']] : Object.values(CMF_COMPRESSIONS);
  for (const t of forbidden) if (count(t)) out.push(`${t} is on the page beside the declared ${compression === 'none' ? 'separate C2, C3 and C4 bands' : `${compression} compression`}`);
  const ranked = seq.filter((t) => t in RANK);
  for (let i = 1; i < ranked.length; i++) if (RANK[ranked[i]] <= RANK[ranked[i - 1]] && ranked[i] !== ranked[i - 1]) out.push(`${ranked[i]} comes after ${ranked[i - 1]}`);
  const c12 = seq.indexOf('C12');
  if (!omit.includes('C12') && c12 >= 0 && seq[c12 + 1] !== 'C13') out.push(`C12 is not directly before C13 (it is followed by ${seq[c12 + 1] ?? 'nothing'})`);
  return out;
}
