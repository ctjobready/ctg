/**
 * Title Case rule (owner rule 2026-10-11: "All page title, headings and subheadings must be in title-caps"), Chicago style.
 *
 * - First and last word, and every major word, are capitalized (nouns, verbs incl. Is/Are/Be, adjectives, adverbs, pronouns,
 *   subordinating conjunctions such as If/Because/That).
 * - MINOR words stay lower case unless first/last or right after a colon, a sentence-ending ? or !, or a separator "·", "•" or "|"
 *   ("SDG 4 · Quality Education", "JobReady@Campus · For Universities"). A dash does not force a capital.
 * - A title cut short by an ellipsis ("…the…") has no last word yet: its final visible word follows the minor-word rule.
 * - Lower-case domains and file names (jobready.global, youtube-nocookie.com) are kept as written.
 * - Hyphenated and slashed compounds: every part is capitalized except minor words ("Job-Ready", "Two-Year", "Built-in").
 * - Tokens that already contain a capital after their first letter (CodersTrust, YouthWIDE, JobReady@Campus, AI, BIGD, NGOs,
 *   MoU, U.S., iDE, eBay ...) are brand/acronym/mixed-case tokens and are never altered. Tokens that start with a digit are left alone.
 * - Text inside quotation marks (" " or " ") is quoted text and is left as written.
 */

export const MINOR = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'as', 'at', 'by', 'in', 'of', 'off', 'on', 'per', 'to', 'via', 'vs', 'with',
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

/**
 * Domains and file names written in lower case (jobready.global, youtube-nocookie.com, press-kit.svg) are identifiers. They are masked
 * before the split, so their hyphens and dots do not split them, and restored unchanged at the end.
 */
const DOMAIN = /(?<![\p{L}\p{N}-])[a-z0-9][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+/gu;

/** Expected Title Case for a heading/title string. Pure; whitespace is preserved as given. */
export function titleCase(raw) {
  const kept = [];
  const input = String(raw).replace(DOMAIN, (m) => {
    kept.push(m);
    return `${String.fromCharCode(0xe100 + kept.length - 1)}`; // a private-use placeholder: neither a letter nor a digit
  });
  const parts = input.split(SEP); // [word, sep, word, sep, ...] (words may be '')
  const wordIdx = [];
  parts.forEach((p, i) => {
    if (i % 2 === 0 && /[\p{L}\p{N}]/u.test(p)) wordIdx.push(i);
  });
  // a title cut short by an ellipsis ("…the…") has no last word yet, so its final visible word is not forced to a capital
  const truncated = /(…|\.\.\.)\s*$/.test(input);
  const lastWord = truncated ? -1 : wordIdx[wordIdx.length - 1];
  const firstWord = wordIdx[0];
  let inQuote = false;
  let force = true; // start of title
  const out = parts.slice();
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2 === 1) {
      // separator: an em/en dash or a spaced hyphen starts a new clause
      if (isDashSep(p)) force = false; // a dash does not start a capitalized clause (Chicago); minor words after it stay lower case
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
    // clause-starting punctuation on this token affects the NEXT word: a colon, ?, !, or a separator such as "·", "•" or "|"
    force = /[:?!]$/.test(trail) || /[:?!]$/.test(core) || /[·•|]/.test(lead + trail);
    if (!hasLetter) continue;
    if (startedQuoted || quoteStartsHere || inQuote) continue; // quoted text is kept as written
    if (/^\d/.test(core)) continue;
    // a domain or file-like token (jobready.global, press-kit.svg) is an identifier, kept as written
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(core)) continue;
    // sentence-internal capital after the first letter => brand/acronym/mixed case, never altered
    if (/^.\p{Lu}/su.test(core) || /\p{Lu}/u.test(core.slice(1))) continue;
    // a token with an @ (an e-mail, a handle such as JobReady@Campus) or an arrow is an identifier: the whole token is checked, not only its core
    if (/[@→]/.test(p) || /\w\(\)/.test(core) || /^(https?:|www\.)/i.test(core)) continue;
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
  return out.join('').replace(/(.)/gu, (_, c) => kept[c.charCodeAt(0) - 0xe100]);
}
