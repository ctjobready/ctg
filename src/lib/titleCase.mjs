/**
 * Title Case rule (owner rule 2026-10-11: "All page title, headings and subheadings must be in title-caps"), Chicago style.
 *
 * - First and last word, and every major word, are capitalized (nouns, verbs incl. Is/Are/Be, adjectives, adverbs, pronouns,
 *   subordinating conjunctions such as If/Because/That).
 * - MINOR words stay lower case unless first/last or right after a colon, an em dash or a sentence-ending ? or !.
 * - Hyphenated and slashed compounds: every part is capitalized except minor words ("Job-Ready", "Two-Year", "Built-in").
 * - Tokens that already contain a capital after their first letter (CodersTrust, YouthWIDE, JobReady@Campus, AI, BIGD, NGOs,
 *   MoU, U.S., iDE, eBay ...) are brand/acronym/mixed-case tokens and are never altered. Tokens that start with a digit are left alone.
 * - Text inside quotation marks (" " or " ") is quoted text and is left as written.
 */

export const MINOR = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'as', 'at', 'by', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via', 'vs', 'with',
  'from', 'into', 'onto', 'over',
]);
/** lower-case abbreviations that are never capitalized */
export const ALWAYS_LOWER = new Set(['pp']);

const SEP = /([\s\-‐‑–—\/]+)/; // whitespace, hyphen, en/em dash, slash
const isDashSep = (s) => /[–—]/.test(s) || /\s-+\s/.test(s);

function capitalizeWord(core) {
  // capitalize the first letter only; keep apostrophes and everything else as is
  return core.replace(/^(\p{L})/u, (m) => m.toUpperCase());
}

/** Expected Title Case for a heading/title string. Pure; whitespace is preserved as given. */
export function titleCase(input) {
  const parts = String(input).split(SEP); // [word, sep, word, sep, ...] (words may be '')
  const wordIdx = [];
  parts.forEach((p, i) => {
    if (i % 2 === 0 && /[\p{L}\p{N}]/u.test(p)) wordIdx.push(i);
  });
  const lastWord = wordIdx[wordIdx.length - 1];
  const firstWord = wordIdx[0];
  let inQuote = false;
  let force = true; // start of title
  const out = parts.slice();
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2 === 1) {
      // separator: an em/en dash or a spaced hyphen starts a new clause
      if (isDashSep(p)) force = true;
      continue;
    }
    if (p === '') continue;
    // quote tracking on straight and curly double quotes
    const quoteStartsHere = /^[\s(\[]*["“]/.test(p);
    const startedQuoted = inQuote;
    for (const ch of p) {
      if (ch === '"') inQuote = !inQuote;
      else if (ch === '“') inQuote = true;
      else if (ch === '”') inQuote = false;
    }
    const m = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su.exec(p);
    const lead = m[1];
    const core = m[2];
    const trail = m[3];
    const hasLetter = /\p{L}/u.test(core);
    const wasForced = force;
    // clause-starting punctuation on this token affects the NEXT word
    force = /[:?!]$/.test(trail) || /[:?!]$/.test(core);
    if (!hasLetter) continue;
    if (startedQuoted || quoteStartsHere || inQuote) continue; // quoted text is kept as written
    if (/^\d/.test(core)) continue;
    // sentence-internal capital after the first letter => brand/acronym/mixed case, never altered
    if (/^.\p{Lu}/su.test(core) || /\p{Lu}/u.test(core.slice(1))) continue;
    if (/[@→]|\w\(\)/.test(core) || /^(https?:|www\.)/i.test(core)) continue;
    const lower = core.toLowerCase();
    let want;
    if (ALWAYS_LOWER.has(lower)) want = lower;
    else {
      const abbr = lower.replace(/\.$/, '');
      const isMinor = MINOR.has(abbr);
      const mustCap = i === firstWord || i === lastWord || wasForced;
      want = isMinor && !mustCap ? lower : capitalizeWord(core);
    }
    out[i] = lead + want + trail;
  }
  return out.join('');
}
