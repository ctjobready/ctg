// Fact status gate (D15), public-citation scan (D16) and map-equivalence check over the built site.
// Run after `npm run build`:  npm run check:facts   (uses Node's built-in TypeScript stripping to read src/data/facts.ts)
//   - a U fact may appear only under /news/
//   - an R fact may appear only under the path prefixes in its `allow` list (none = nowhere)
//   - every data-fact ID must exist in the dataset (removed/withheld facts are therefore unknown IDs)
//   - internal source codes (IR26/GD26/ID26/BIGD22) must not appear anywhere in rendered markup
//   - internal wording ("investor deck", "to verify", ...) is scanned structurally inside citation/footnote
//     blocks (the Sources list and footnote markers), so ordinary calls to action such as
//     "Request the investor deck" are not false positives
//   - WorldMap: every pin-tooltip detail must appear in the location table (equivalence contract)
//   - vendor certifications (Meta Blueprint / Google Ads, Adobe Certified Professional, QuickBooks Online ProAdvisor, PCEP, CWP;
//     messaging framework rule 13): a page whose visible text names one must also carry the non-affiliation note (CERT_NOTE_TEXT),
//     exactly once (inline, via <CertNote>; no fact may also carry it as a footnote, which would print the sentence twice)
//   - archive-only wording: no British "enquir*" (D6; write "inquir*") and no "tripled" (OC-03 is a ratio of medians) anywhere in a
//     page's HTML (text, attributes, meta, JSON-LD), except on the archived posts under /news/<post>/ and on redirect stubs
//     (legacy URLs); negative self-tests below
//   - program-data label (PROGRAM_DATA_LABEL in src/data/facts.ts, on PR-01, PR-02 and PR-05): never printed twice in a row, and no
//     page-local variant ("gross placement", "Program records — gross"); negative self-tests below
//   - footnotes: markers and notes number in reading order (1, 2, 3 by first appearance), every marker has its note and every note
//     its markers and back-links, a caveat prints in full once per page ("Same caveat as note N" afterwards), no empty
//     "Notes and sources" band, and no sentence glued to an inline link. The self-test below runs the post-processing
//     (src/lib/postprocess.ts, applied by src/middleware.ts) on fixtures first, so a regression there fails with a reason.
//   - sentences: <Fact> ends every sentence with a period; the period it adds must never be doubled (no added period right after
//     a period, none left in front of punctuation the page typed)
//   - copy conventions (doc 06 global rules): no straight apostrophe inside a word and no bare "pp" before "percentage points" is spelled out,
//     outside the archived /news/ posts and the styleguide; negative self-tests below
//   - statistic tiles: every <Stat>/<FactStat> tile and <FactCard> stat tile carries its fact's footnote marker (doc 04 claims rule 15)
//   - [PLAIN-LINE] (plan v1.10): Home, /partner-with-us/development-partners/ and /impact/independent-evaluation/ must carry "For every 100
//     women offered a place, about 10 more were in work at follow-up than in the control group (+10.3 percentage points)." rendered by
//     <PlainLine> with RC-02's footnote marker; its numbers are re-derived here from RC-02 (+10.3 pp, rounded 10) and must match wherever the
//     sentence appears; negative self-tests below
//   - [SESSION-AGENDA] (plan v1.12): /partner-with-us/governments/, /development-partners/, /foundations/, /programs/youthwide/ and
//     /programs/nationwide/ must show, inside the C13 CTA band (#cta), ONE paragraph in the plan's words: the lead "What the discovery
//     session covers:" (or "What the briefing covers:" where the CTA is a briefing), the three items joined with " · " and one final period,
//     carrying data-fact="PD-02" like [PRICING] and FAQ Q8 (its "indicative budget" claim; PD-02 is a production hold); negative self-tests below
//   - report CTA: while REPORT_EDITION_READY (src/lib/site.ts) is false, no "Request the Impact Report" button, link or mailto
//     subject may appear on any page
//   - SITE_ENV=production only: production fact holds. A private hold list names facts that must not render in
//     production until the matching item of CodersTrust's confirm list is closed. It is read from
//       1. env PROD_FACT_HOLDS   a JSON string (the Actions secret), or
//       2. ../ctg-planning/prod-fact-holds.json   (the private planning checkout; found by walking up from the
//          repo, so it also works from a git worktree)
//     shape: { "holds": [ { "fact": "SC-01", "confirm": 6 }, ... ] }. With neither source the check FAILS CLOSED;
//     an invalid list fails; a held fact that is rendered (a data-fact reference) fails, listing fact -> pages.
//     Only fact IDs and confirm-list item numbers are ever printed, never any confirm-list text. Staging says nothing.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, 'dist');
const { facts, CERT_NOTE_TEXT, CERT_FACT_IDS, PROGRAM_DATA_LABEL } = await import(new URL('../src/data/facts.ts', import.meta.url).href);
const { orderFootnotes, dropEmptyNotesBand, dropDoubledStops, spaceInlineLinks, postprocessPage } = await import(new URL('../src/lib/postprocess.ts', import.meta.url).href);

/* ---- production fact holds (private list; staging never reads or reports it) ---- */
const production = process.env.SITE_ENV === 'production';
const holds = new Map(); // fact id -> confirm-list item number
if (production) {
  const findPlanningFile = () => {
    let dir = dirname(root.replace(/\/$/, ''));
    for (let i = 0; i < 7; i++) {
      const candidate = join(dir, 'ctg-planning', 'prod-fact-holds.json');
      if (existsSync(candidate)) return candidate;
      const up = dirname(dir);
      if (up === dir) break;
      dir = up;
    }
    return null;
  };
  let source = null;
  let raw = null;
  if (process.env.PROD_FACT_HOLDS && process.env.PROD_FACT_HOLDS.trim()) {
    source = 'env PROD_FACT_HOLDS';
    raw = process.env.PROD_FACT_HOLDS;
  } else {
    const file = findPlanningFile();
    if (file) {
      source = 'file ../ctg-planning/prod-fact-holds.json';
      raw = readFileSync(file, 'utf8');
    }
  }
  if (raw === null) {
    console.error('check-facts: FAILED CLOSED - SITE_ENV=production but no production fact-hold list was found (env PROD_FACT_HOLDS is unset and there is no ../ctg-planning/prod-fact-holds.json). Refusing to pass without it; use {"holds":[]} if nothing is held.');
    process.exit(1);
  }
  const bad = (why) => {
    // the list is private and CI logs are public: never echo its content or parser messages that quote it
    console.error(`check-facts: FAILED - the production fact-hold list (${source}) is invalid: ${why}`);
    process.exit(1);
  };
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (e) {
    const at = /position (\d+)/.exec(e.message);
    bad(`not valid JSON${at ? ` (parse error at character ${at[1]})` : ''}`);
  }
  if (!spec || typeof spec !== 'object' || !Array.isArray(spec.holds)) bad('expected an object with a "holds" array');
  spec.holds.forEach((h, i) => {
    if (!h || typeof h.fact !== 'string' || !/^[A-Z]{2}-\d{2}[a-z]?$/.test(h.fact)) bad(`holds[${i}].fact must be a fact ID such as "SC-01"`);
    if (!Number.isInteger(h.confirm) || h.confirm < 1) bad(`holds[${i}].confirm must be a positive confirm-list item number`);
    if (holds.has(h.fact)) bad(`holds[${i}]: fact ${h.fact} is listed twice`);
    holds.set(h.fact, h.confirm);
  });
}
const heldPages = new Map(); // fact id -> Set(page paths where it is rendered)

// Anywhere in the page (rendered markup outside <script>/<style>).
const TOKENS = [[/\b(IR26|GD26|ID26|BIGD22)\b/, 'internal source code']];
// Only inside citation / footnote blocks (Sources section, footnote markers).
const CITATION_WORDING = [
  [/investor (full )?deck/i, 'investor deck named'],
  [/grant deck/i, 'grant deck named'],
  [/\bto verify\b/i, '"to verify"'],
  [/\bbelieved\b/i, '"believed"'],
  [/confirm (with|before)/i, '"confirm with/before"'],
];
// Claims discipline (terminology): phrases that must not render anywhere.
const DISCIPLINE = [
  [/\bdashboards?\b/i, '"dashboard" (use "monthly reports")'],
  [/into first income/i, '"into first income" (use "milestone-based mentoring")'],
  [/\b30[- ]minute/i, 'unsourced "30 minutes" promise'],
];
// The investor CTA label and its mailto subject are allowed.
const ALLOWED = [/Request the investor deck/gi, /Investor(%20| )deck(%20| )request/gi];

const decode = (t) => t.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

/** Citation/footnote blocks: the Sources section(s) and every footnote marker. */
function citationBlocks(markup) {
  const out = [];
  for (const m of markup.matchAll(/<section\b[^>]*\bclass="[^"]*\bsources\b[^"]*"[^>]*>[\s\S]*?<\/section>/g)) out.push(m[0]);
  for (const m of markup.matchAll(/<sup\b[^>]*\bclass="[^"]*\bfn\b[^"]*"[^>]*>[\s\S]*?<\/sup>/g)) out.push(m[0]);
  return out;
}

/** WorldMap equivalence: each tooltip card's details must be present in the table row for the same location. */
function mapGaps(markup) {
  const gaps = [];
  const rows = [...markup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => decode(m[1]));
  for (const c of markup.matchAll(/<div\b[^>]*\bclass="wmap__card"[^>]*>([\s\S]*?)<\/div>/g)) {
    const country = c[1].match(/<p\b[^>]*wmap__country[^>]*>([\s\S]*?)<span[^>]*>([\s\S]*?)<\/span>/);
    if (!country) { gaps.push('map card without country/years'); continue; }
    const name = decode(country[1]);
    const row = rows.find((r) => r.startsWith(name));
    if (!row) { gaps.push(`map: no table row for "${name}"`); continue; }
    const details = [decode(country[2]), ...[...c[1].matchAll(/<dd\b[^>]*>([\s\S]*?)<\/dd>/g)].map((d) => decode(d[1]))];
    for (const d of details) if (d && !row.includes(d)) gaps.push(`map: tooltip detail "${d}" for ${name} missing from the table`);
  }
  return gaps;
}

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const problems = [];

/* ---- vendor certifications (rule 13) ---- */
// The certification names themselves (PD-03 and IN-08), not the software or skills a person's bio mentions. "Google Ads" is covered through
// "Meta Blueprint / Google Ads"; QuickBooks as software (a mentor's expertise) is not a certification and is not matched.
const VENDOR_CERTS = [/Meta Blueprint/i, /Google Ads certif/i, /Adobe Certified/i, /QuickBooks (?:Online )?ProAdvisor/i, /\bPCEP\b/, /\bCWP\b/, /Google and Meta Certification/i];
const namesVendorCert = (text) => VENDOR_CERTS.some((re) => re.test(text));
/** A page's visible text must carry the non-affiliation note when it names a vendor certification, and never more than once. */
function certNoteProblems(text) {
  const copies = text.split(CERT_NOTE_TEXT).length - 1;
  if (copies > 1) return [`prints the non-affiliation note ${copies} times (it belongs once per page, inline; a fact must not also carry it as a footnote)`];
  if (copies === 0 && namesVendorCert(text)) return [`names a vendor certification but lacks the note "${CERT_NOTE_TEXT}"`];
  return [];
}

/* ---- wording that may survive only inside the archived /news/<post>/ pages ---- */
// "enquir*" is British (American spelling, D6: the public site says "inquiry"/"inquiries"); "tripled" overstates OC-03, which compares
// medians (a ratio of medians, not an average; individual changes vary). Both are held to every page except the archive.
const ARCHIVE_ONLY_WORDING = [
  [/enquir/i, 'British spelling "enquir…" (write "inquiry"/"inquiries")'],
  [/\btripled\b/i, '"tripled" (OC-03 is a ratio of medians, not an average; individual changes vary)'],
];
/**
 * Archived news posts (/news/<post>/) keep their original wording, and redirect stubs only carry legacy URLs, so neither is held to the
 * rule. Everything else is scanned as raw HTML: visible text, attributes (aria-label, title, data-*), meta descriptions and JSON-LD.
 */
const exemptFromArchiveRule = (path, html) => /^\/news\/[^/]+\/$/.test(path) || /<html\b[^>]*\bdata-redirect-stub\b/.test(html.slice(0, 600));
function archiveWordingProblems(path, html) {
  if (exemptFromArchiveRule(path, html)) return [];
  const out = [];
  for (const [re, why] of ARCHIVE_ONLY_WORDING) {
    const m = re.exec(html);
    if (!m) continue;
    const count = (html.match(new RegExp(re.source, 'gi')) ?? []).length;
    const around = html.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ');
    out.push(`${path}: ${why}, ${count} occurrence(s) outside the archived news posts: "…${around}…"`);
  }
  return out;
}
/* ---- program-data label (PROGRAM_DATA_LABEL, src/data/facts.ts): one per figure, never a page-local variant ---- */
// PR-01, PR-02 and PR-05 end their stat label with the register's label; components set it on its own line and add no second one.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LABEL_TWICE = new RegExp(`${escapeRe(PROGRAM_DATA_LABEL)}[^A-Za-z]{0,12}${escapeRe(PROGRAM_DATA_LABEL)}`);
const LABEL_VARIANT = /Program records — gross|gross placement/i;
function programLabelProblems(text) {
  const out = [];
  if (LABEL_TWICE.test(text)) out.push('the program-data label is printed twice in a row (a figure carries it once)');
  const v = LABEL_VARIANT.exec(text);
  if (v) out.push(`page-local program-data label "${v[0]}" (the register's label is the only one: "${PROGRAM_DATA_LABEL}")`);
  return out;
}
const visibleText = (markup) => decode(markup.replace(/<head\b[\s\S]*?<\/head>/i, '').replace(/<!--[\s\S]*?-->/g, ''));

/* ---- [PLAIN-LINE] (RC-02 in plain language, plan v1.10) ---- */
// "For every 100 women offered a place, about 10 more were in work at follow-up than in the control group (+10.3 percentage points)."
// is built in src/data/copy.ts from RC-02's stat; it is required on Home, the development-partners page and the independent-evaluation page,
// and wherever it appears its numbers must be RC-02's: "+10.3 percentage points" is the stat value with "pp" spelled out, "about 10" its rounding.
// The expected sentence is derived here from the register on its own (not read from copy.ts), so a drift in either place fails the build.
const PLAIN_LINE_PAGES = ['/', '/partner-with-us/development-partners/', '/impact/independent-evaluation/'];
const PLAIN_LINE_SHAPE = /For every 100 women offered a place, about (\d+) more were in work at follow-up than in the control group \(([^)]*)\)\./;
const plainLineWanted = (stat) => {
  const points = `${stat.prefix ?? ''}${stat.numeric.toFixed(stat.decimals ?? 0)} percentage points`;
  return { about: Math.round(stat.numeric), points, text: `For every 100 women offered a place, about ${Math.round(stat.numeric)} more were in work at follow-up than in the control group (${points}).` };
};
/** Problems with the plain-language line on one page: required = the page must carry it; the numbers are held on every page that has it. */
function plainLineProblems(markup, text, stat, required) {
  const m = PLAIN_LINE_SHAPE.exec(text);
  if (!m) return required ? ['the [PLAIN-LINE] (RC-02 in plain language) is missing'] : [];
  const want = plainLineWanted(stat);
  const out = [];
  if (Number(m[1]) !== want.about) out.push(`[PLAIN-LINE] says "about ${m[1]} more" but RC-02 (${stat.numeric}) rounds to ${want.about}`);
  if (m[2] !== want.points) out.push(`[PLAIN-LINE] says "(${m[2]})" but RC-02 is "${want.points}" (the stat value with "pp" spelled out)`);
  if (!out.length && !text.includes(want.text)) out.push(`[PLAIN-LINE] differs from the register-derived sentence "${want.text}"`);
  if (required) {
    // rendered by <PlainLine>, with RC-02's footnote marker, as body text (a paragraph, not a stat tile)
    const block = /<p\b[^>]*\bdata-plain-line\b[^>]*>([\s\S]*?)<\/p>/.exec(markup);
    if (!block) out.push('[PLAIN-LINE] is not rendered by <PlainLine> (no <p data-plain-line>)');
    else if (!/<sup class="fn" data-fact="RC-02">/.test(block[1])) out.push('[PLAIN-LINE] lacks RC-02’s footnote marker');
  }
  return out;
}

/* ---- [SESSION-AGENDA] (plan v1.12 round-11 enhancement) ---- */
// Beside the C13 primary CTA on the governments, development-partners and foundations pages, YouthWIDE and NationWIDE: ONE paragraph, the
// lead, the three items joined with " · " and a single final period, tied to PD-02 (data-fact) like [PRICING] and FAQ Q8, whose "indicative
// budget" claim it repeats. The wording is verbatim from the plan (doc 06 [SESSION-AGENDA]) and is declared here independently of
// src/data/copy.ts, so a wording change has to be made in both places on purpose. Either lead is accepted on any of the pages: "What the
// discovery session covers:" (the CTA books a discovery session) or "What the briefing covers:" (governments and NationWIDE, where the CTA is a briefing).
const SESSION_AGENDA_PAGES = ['/partner-with-us/governments/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/', '/programs/youthwide/', '/programs/nationwide/'];
const SESSION_AGENDA_LEADS = ['What the discovery session covers:', 'What the briefing covers:'];
const SESSION_AGENDA_ITEMS = ['your priority groups and districts', 'employer demand and certification tracks', 'an indicative budget, the pilot scorecard and the tracer timeline'];
const SESSION_AGENDA_FACT = 'PD-02';
const sessionAgendaWanted = (lead) => `${lead} ${SESSION_AGENDA_ITEMS.join(' · ')}.`;
/** Problems with the agenda on one page: one paragraph inside the C13 band (#cta), in the plan's words, with the PD-02 marker. */
function sessionAgendaProblems(markup) {
  const band = /<section\b[^>]*\bid="cta"[^>]*>[\s\S]*?<\/section>/.exec(markup);
  if (!band) return ['the C13 call-to-action band (#cta) is missing, so the [SESSION-AGENDA] has no CTA to sit beside'];
  const open = /<([a-z][a-z0-9]*)\b([^>]*)\bdata-session-agenda\b([^>]*)>/.exec(band[0]);
  if (!open) return ['the [SESSION-AGENDA] (what the discovery session or briefing covers) is missing from the C13 band'];
  const out = [];
  if (open[1] !== 'p') out.push(`[SESSION-AGENDA] must be one paragraph (<p>), not a <${open[1]}> (no heading, no list)`);
  const inner = /^<p\b[^>]*>([\s\S]*?)<\/p>/.exec(band[0].slice(open.index));
  if (inner) {
    if (/<(ul|ol|li|h[1-6])\b/.test(inner[1])) out.push('[SESSION-AGENDA] must be one line of text: no list items and no heading inside it');
    const text = decode(inner[1].replace(/<sup\b[\s\S]*?<\/sup>/g, ''));
    if (!SESSION_AGENDA_LEADS.some((lead) => text === sessionAgendaWanted(lead))) {
      out.push(`[SESSION-AGENDA] reads "${text}", expected "${sessionAgendaWanted(SESSION_AGENDA_LEADS[0])}" (or, where the CTA is a briefing, with the lead "${SESSION_AGENDA_LEADS[1]}")`);
    }
  }
  const factAttr = /\bdata-fact="([^"]*)"/.exec(open[0])?.[1] ?? '';
  if (!factAttr.split(/\s+/).includes(SESSION_AGENDA_FACT)) out.push(`[SESSION-AGENDA] must carry data-fact="${SESSION_AGENDA_FACT}" like [PRICING] and FAQ Q8, so a production hold on ${SESSION_AGENDA_FACT} treats it the same`);
  return out;
}

/* ---- statistic tiles carry their fact's footnote (doc 04 claims rule 15, doc 06 "Tiles, footnotes and links") ---- */
// Every <Stat>/<FactStat> tile (.stat__label) and every <FactCard> stat tile (.factcard__label, not its full-sentence --text variant) must hold a
// footnote marker; the styleguide's sample tiles are exempt.
const TILE_LABEL = /<p class="(?:stat__label|factcard__label)"[^>]*>([\s\S]*?)<\/p>/g;
function tileProblems(markup) {
  const out = [];
  for (const m of markup.matchAll(TILE_LABEL)) {
    if (!/<sup class="fn"/.test(m[1])) out.push(`a statistic tile ("${decode(m[1]).slice(0, 70)}") carries no footnote marker`);
  }
  return out;
}

/* ---- copy conventions (doc 06 global rules, R10/WP11 F29-F41): curly apostrophes; "pp" only once "percentage points" is spelled out ---- */
// The archived /news/ posts keep their wording and the styleguide holds samples, so neither is held to these two rules.
const exemptFromConventions = (path) => path.startsWith('/news/') || path === '/styleguide/';
function conventionProblems(text) {
  const out = [];
  const apos = /[A-Za-z]'[A-Za-z]/.exec(text);
  if (apos) out.push(`straight apostrophe in "…${text.slice(Math.max(0, apos.index - 25), apos.index + 25)}…" (write ’)`);
  // a "pp" figure counts as introduced when "percentage points" is spelled out before it, or in its own tile label right after it
  const pp = /\bpp\b/.exec(text);
  if (pp) {
    const spelled = /percentage points?/i.exec(text);
    if (!spelled || spelled.index > pp.index + 40) out.push(`"pp" appears before "percentage points" is spelled out: "…${text.slice(Math.max(0, pp.index - 30), pp.index + 20)}…"`);
  }
  return out;
}

/* ---- footnote and link checks over one page's markup (shared by the self-test and the built-site scan) ---- */
const MARKER_G = /<sup class="fn" data-fact="([^"]*)"><a href="#fn-(\d+)" id="fn-ref-(\d+)-(\d+)" aria-label="Note \d+">(\d+)<\/a><\/sup>/g;
const GLUED_LINK = /([\p{L}\p{N}.,;:!?%)”’'"])(<a class="link[ "])/u;
const DOUBLED_STOP = /<span class="fact__stop">\.<\/span>[”’"]*(?:<sup class="fn" data-fact="[^"]*"><a [^>]*>\d+<\/a><\/sup>)?<\/(?:span|p|strong|b|div)>\s?[.,;:)!?—–]/;
const STOP_AFTER_STOP = /[.!?…][”’"')]*<span class="fact__stop">/;
const EMPTY_NOTES_BAND = /<section class="band [^"]*" aria-label="Notes and sources"[^>]*><div class="container"[^>]*><\/div><\/section>/;
function footnoteProblems(markup) {
  const out = [];
  const markers = [...markup.matchAll(MARKER_G)].map((m) => ({ fact: m[1], n: Number(m[2]), idN: Number(m[3]), k: Number(m[4]), text: Number(m[5]) }));
  const notes = [...markup.matchAll(/<li class="sources__note" id="fn-(\d+)"[^>]*?data-fact="([^"]*)"[\s\S]*?<\/li>/g)].map((m) => ({ n: Number(m[1]), fact: m[2], html: m[0] }));
  // markers: number by first appearance, ref index by appearance within the note, label equals number
  const first = [];
  const perNote = new Map();
  for (const m of markers) {
    if (m.idN !== m.n || m.text !== m.n) out.push(`footnote marker for ${m.fact} is inconsistent (href #fn-${m.n}, id fn-ref-${m.idN}-${m.k}, text ${m.text})`);
    if (!first.includes(m.n)) first.push(m.n);
    const k = (perNote.get(m.n) ?? 0) + 1;
    perNote.set(m.n, k);
    if (m.k !== k) out.push(`footnote ${m.n}: reference ${m.k} appears as reference ${k} in reading order`);
  }
  if (!first.every((n, i) => n === i + 1)) out.push(`footnote markers are not numbered in reading order (first appearances: ${first.join(', ')})`);
  // notes: ascending 1..N, one per numbered marker, same fact as the marker, back-links to every reference
  if (!notes.every((x, i) => x.n === i + 1)) out.push(`Notes list is not in reading order (${notes.map((x) => x.n).join(', ')})`);
  for (const n of first) if (!notes.some((x) => x.n === n)) out.push(`footnote ${n} has a marker but no note`);
  const caveatFull = new Map();
  for (const note of notes) {
    const refs = markers.filter((m) => m.n === note.n);
    if (!refs.length) out.push(`note ${note.n} (${note.fact}) has no marker`);
    for (const r of refs) if (r.fact !== note.fact) out.push(`footnote ${note.n}: marker is for ${r.fact}, note is for ${note.fact}`);
    const back = [...note.html.matchAll(/<a href="#fn-ref-(\d+)-(\d+)"/g)].map((m) => `${m[1]}-${m[2]}`);
    const want = refs.map((r) => `${note.n}-${r.k}`);
    if (back.join() !== want.join()) out.push(`note ${note.n}: back-links [${back.join(' ')}] do not match its references [${want.join(' ')}]`);
    const cav = note.html.match(/<p class="sources__caveat" data-caveat="([^"]*)"/);
    if (cav) caveatFull.set(cav[1], (caveatFull.get(cav[1]) ?? 0) + 1);
    const same = note.html.match(/<p class="sources__same" data-caveat="([^"]*)"[^>]*>Same caveat as <a href="#fn-(\d+)">note (\d+)<\/a>\./);
    if (same) {
      if (same[2] !== same[3] || Number(same[2]) >= note.n) out.push(`note ${note.n}: "Same caveat as note ${same[2]}" must point to an earlier note`);
      else if (!notes.some((x) => x.n === Number(same[2]) && x.html.includes(`data-caveat="${same[1]}"`) && x.html.includes('class="sources__caveat"'))) out.push(`note ${note.n}: the note it points to does not print caveat ${same[1]} in full`);
    }
  }
  for (const [key, count] of caveatFull) if (count > 1) out.push(`caveat ${key} is printed in full ${count} times (it should print once, then "Same caveat as note N")`);
  if (EMPTY_NOTES_BAND.test(markup)) out.push('empty "Notes and sources" band');
  if (DOUBLED_STOP.test(markup)) out.push('a period <Fact> added stands in front of punctuation the page typed (doubled punctuation)');
  if (STOP_AFTER_STOP.test(markup)) out.push('<Fact> added a period after text that already ends with punctuation');
  const glue = markup.match(new RegExp(GLUED_LINK.source, 'gu'));
  if (glue) out.push(`${glue.length} inline link(s) glued to the text before them (no space), e.g. "…${glue[0].slice(0, 20)}"`);
  return out;
}

/* ---- self-test: the post-processing on fixtures, then the checks above on its result (and on a broken page) ---- */
{
  const mk = (fact, n, k) => `<sup class="fn" data-fact="${fact}"><a href="#fn-${n}" id="fn-ref-${n}-${k}" aria-label="Note ${n}">${n}</a></sup>`;
  const back = (n, refs) => Array.from({ length: refs }, (_, i) => `<a href="#fn-ref-${n}-${i + 1}" aria-label="Back to reference ${n}${refs > 1 ? '.' + (i + 1) : ''}" data-astro-cid-x><span>Back ${i + 1}</span></a>`).join('');
  const note = (n, fact, key, refs) => `<li class="sources__note" id="fn-${n}" tabindex="-1" data-fact="${fact}" data-astro-cid-x><p class="sources__claim" data-astro-cid-x>claim ${fact}</p><p class="sources__caveat" data-caveat="${key}" data-astro-cid-x>caveat ${key}</p><p class="sources__back" data-astro-cid-x>${back(n, refs)}</p></li>`;
  const page = (body, notesHtml) => `<main>${body}<section class="sources" id="sources"><ol class="sources__list" data-astro-cid-x>${notesHtml}</ol></section></main>`;
  // A is registered first (an early frontmatter, say) but met second; B is met first and twice
  const broken = page(`<p>One${mk('B', 2, 1)} two${mk('A', 1, 1)} three${mk('B', 2, 2)}</p>`, note(1, 'A', 'R', 1) + note(2, 'B', 'R', 2));
  const fixed = orderFootnotes(broken);
  const reading = [...fixed.matchAll(MARKER_G)].map((m) => `${m[1]}:${m[2]}.${m[4]}`).join(' ');
  if (reading !== 'B:1.1 A:2.1 B:1.2') problems.push(`self-test: orderFootnotes numbered the markers "${reading}", expected "B:1.1 A:2.1 B:1.2"`);
  const listed = [...fixed.matchAll(/<li class="sources__note" id="fn-(\d+)"[^>]*data-fact="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`).join(' ');
  if (listed !== '1=B 2=A') problems.push(`self-test: orderFootnotes listed the notes "${listed}", expected "1=B 2=A"`);
  if (!fixed.includes('<p class="sources__same" data-caveat="R" data-astro-cid-x>Same caveat as <a href="#fn-1">note 1</a>.</p>')) problems.push('self-test: the second note with the same caveat did not become "Same caveat as note 1"');
  if (fixed.split('class="sources__caveat"').length !== 2) problems.push('self-test: the first note in reading order must keep the caveat in full, and only that one');
  for (const p of footnoteProblems(fixed)) problems.push('self-test: fixed fixture still fails — ' + p);
  if (orderFootnotes(fixed) !== fixed) problems.push('self-test: orderFootnotes is not idempotent');
  if (!footnoteProblems(broken).length) problems.push('self-test: the footnote checks accepted a page numbered out of reading order');
  // references of one note met in the opposite order to their registration: back-links follow reading order
  const swapped = orderFootnotes(page(`<p>${mk('A', 1, 2)}${mk('A', 1, 1)}</p>`, note(1, 'A', 'R', 2)));
  for (const p of footnoteProblems(swapped)) problems.push('self-test: swapped references — ' + p);
  const emptyBand = '<main><section class="band band--white band--pad-sm" aria-label="Notes and sources" data-astro-cid-x><div class="container" data-astro-cid-x></div></section></main>';
  if (dropEmptyNotesBand(emptyBand).includes('Notes and sources')) problems.push('self-test: dropEmptyNotesBand left the empty band');
  if (!footnoteProblems(emptyBand).length) problems.push('self-test: the checks accepted an empty "Notes and sources" band');
  const glued = '<p>independent evaluation welcome.<a class="link" href="/x/">How partnerships work</a> (<a class="link" href="/y/">y</a>)</p><script>var s=\'a.<a class="link">\'</script>';
  const spaced = spaceInlineLinks(glued);
  if (!spaced.includes('welcome. <a class="link"')) problems.push('self-test: spaceInlineLinks did not restore the space');
  if (spaced.includes('( <a') || !spaced.includes("var s='a.<a class=\"link\">'")) problems.push('self-test: spaceInlineLinks touched an opening bracket or script text');
  if (postprocessPage(postprocessPage(broken + glued)) !== postprocessPage(broken + glued)) problems.push('self-test: postprocessPage is not idempotent');
  // the period <Fact> adds to a sentence: kept at the end of a sentence, dropped where the page types its own punctuation
  const stopFix = dropDoubledStops(
    '<p><span class="fact" data-fact="A">text<span class="fact__stop">.</span><sup class="fn" data-fact="A"><a href="#fn-1" id="fn-ref-1-1" aria-label="Note 1">1</a></sup></span>. Next</p>' +
      '<p><span class="fact" data-fact="B">cap<span class="fact__stop">.</span></span> More.</p>' +
      '<p><span class="fact" data-fact="C">“q<span class="fact__stop">.</span>”</span>, said</p>' +
      '<li><span class="fact" data-fact="D">item<span class="fact__stop">.</span></span></li>',
  );
  if (stopFix.includes('text<span class="fact__stop">') || stopFix.includes('“q<span class="fact__stop">')) problems.push('self-test: dropDoubledStops left a period in front of punctuation the page typed');
  if (!stopFix.includes('cap<span class="fact__stop">.</span></span> More.') || !stopFix.includes('item<span class="fact__stop">.</span></span></li>')) problems.push('self-test: dropDoubledStops removed the period at the end of a sentence');
  if (!DOUBLED_STOP.test('<span class="fact__stop">.</span></span>.') || DOUBLED_STOP.test(stopFix)) problems.push('self-test: the doubled-punctuation check does not recognise its fixtures');
  // the certification gate itself: a page naming a vendor needs the note
  if (!namesVendorCert('Certifications by track: Meta Blueprint / Google Ads (digital marketing), CWP (web)') || namesVendorCert('QuickBooks and Xero experience; Media Buying (Meta, Google Ads, YouTube)')) problems.push('self-test: the vendor-certification patterns misclassify their examples');
  // the note is required once: a page that names a vendor without it, or prints it twice (inline plus a footnote), fails; once passes
  const certPage = 'Certifications by track: Meta Blueprint / Google Ads (digital marketing), CWP (web).';
  if (certNoteProblems(`${certPage} ${CERT_NOTE_TEXT}`).length) problems.push('self-test: the certification check rejected a page that carries the note once');
  if (!certNoteProblems(certPage).length) problems.push('self-test: the certification check accepted a page that names a vendor without the note');
  if (!certNoteProblems(`${certPage} ${CERT_NOTE_TEXT} Notes: ${CERT_NOTE_TEXT}`).length) problems.push('self-test: the certification check accepted a page that prints the note twice');
  if (certNoteProblems('A page that names no vendor and carries no note.').length) problems.push('self-test: the certification check rejected a page without vendor names');
  // archive-only wording ("enquir*", "tripled"): fails in text, attributes, meta and JSON-LD of any page except /news/<post>/ and redirect stubs
  const brit = (where) => archiveWordingProblems(where, '<!doctype html><html lang="en"><head><title>x</title></head><body><main><p>Enquiry routes</p></main></body></html>');
  if (!brit('/contact/').length) problems.push('self-test: the wording gate accepted "Enquiry" in the text of /contact/');
  if (!archiveWordingProblems('/about/recognition/', '<body><a aria-label="Media enquiries" href="/x/">m</a></body>').length) problems.push('self-test: the wording gate accepted "enquiries" in an attribute');
  if (!archiveWordingProblems('/investors/', '<head><meta name="description" content="Make an ENQUIRY."></head>').length) problems.push('self-test: the wording gate accepted "ENQUIRY" in a meta description (case-insensitive)');
  if (!archiveWordingProblems('/partner-with-us/local-partners/', '<script type="application/ld+json">{"description":"Send an enquiry"}</script>').length) problems.push('self-test: the wording gate accepted "enquiry" in JSON-LD');
  if (!archiveWordingProblems('/news/page/2/', '<body>Enquiry</body>').length) problems.push('self-test: the wording gate exempted a news listing page (only /news/<post>/ is exempt)');
  if (brit('/news/some-archived-post/').length) problems.push('self-test: the wording gate flagged an archived /news/<post>/ page');
  if (archiveWordingProblems('/old-slug/', '<!DOCTYPE html><html lang="en" data-redirect-stub><head><meta http-equiv="refresh" content="0;url=/news/enquiry-open/"></head></html>').length) problems.push('self-test: the wording gate flagged a redirect stub');
  if (archiveWordingProblems('/contact/', '<body><p>Inquiry routes and media inquiries.</p></body>').length) problems.push('self-test: the wording gate flagged American spelling');
  if (!archiveWordingProblems('/impact/outcomes-2026/', '<body><li>does not mean every learner’s income Tripled.</li></body>').length) problems.push('self-test: the wording gate accepted "tripled" outside the archive');
  if (archiveWordingProblems('/news/some-archived-post/', '<body>income tripled</body>').length) problems.push('self-test: the wording gate flagged "tripled" inside an archived post');
  if (archiveWordingProblems('/our-model/', '<body>A triple-lens model; triplet; tripleshot</body>').length) problems.push('self-test: the wording gate flagged "triple" words that are not "tripled"');
  // program-data label: once per figure; a second copy or a page-local variant fails
  const okFig = `711 of 1,000 women placed (71%) in WSDFM 1 ${PROGRAM_DATA_LABEL} Women’s skills for freelancing 102 of 150 women placed (68%) in Kosovo 2 ${PROGRAM_DATA_LABEL} Women in Online Work`;
  if (programLabelProblems(okFig).length) problems.push('self-test: the program-data label check rejected figures that each carry the label once');
  if (!programLabelProblems(`women placed (71%) in WSDFM. ${PROGRAM_DATA_LABEL} 1 ${PROGRAM_DATA_LABEL} Women’s skills`).length) problems.push('self-test: the program-data label check accepted the label printed twice in a row');
  if (!programLabelProblems('372 of 800 women placed (47%) in Her Power training Program records — gross placement Context').length) problems.push('self-test: the program-data label check accepted a page-local label');
  if (programLabelProblems('What would have happened without training; placement is gross, not net. Each case study states its own base.').length) problems.push('self-test: the program-data label check flagged ordinary wording');
  // [PLAIN-LINE]: required on three pages, numbers derived from RC-02, rendered by <PlainLine> with RC-02's footnote marker
  const rc02 = facts['RC-02'].stat;
  const want = plainLineWanted(rc02);
  const plainBlock = (sentence) => `<p class="plainline" data-plain-line data-fact="RC-02" data-astro-cid-x>${sentence}<sup class="fn" data-fact="RC-02"><a href="#fn-2" id="fn-ref-2-1" aria-label="Note 2">2</a></sup></p>`;
  const plainPage = (sentence, block = plainBlock(sentence)) => ({ markup: `<main><h2>x</h2>${block}</main>`, text: decode(`<main><h2>x</h2>${block}</main>`) });
  const plainOk = plainPage(want.text);
  if (plainLineProblems(plainOk.markup, plainOk.text, rc02, true).length) problems.push(`self-test: the [PLAIN-LINE] check rejected the register-derived sentence: ${plainLineProblems(plainOk.markup, plainOk.text, rc02, true).join('; ')}`);
  if (want.text !== 'For every 100 women offered a place, about 10 more were in work at follow-up than in the control group (+10.3 percentage points).') problems.push(`self-test: RC-02 no longer yields the plan's [PLAIN-LINE] sentence (derived: "${want.text}"); the plan wording needs a decision`);
  const plainBad = (why, sentence, ...rest) => {
    const pg = plainPage(sentence, ...rest);
    if (!plainLineProblems(pg.markup, pg.text, rc02, true).length) problems.push(`self-test: the [PLAIN-LINE] check accepted ${why}`);
  };
  plainBad('a page without the sentence', 'Women offered a place did better.');
  plainBad('"+10.4 percentage points" (a number that differs from RC-02)', want.text.replace('+10.3', '+10.4'));
  plainBad('"about 11 more" (RC-02 rounds to 10)', want.text.replace('about 10', 'about 11'));
  plainBad('"(+10.3 pp)" instead of "percentage points"', want.text.replace('percentage points', 'pp'));
  plainBad('a sentence typed by hand with no <PlainLine> block', want.text, `<p>${want.text}<sup class="fn" data-fact="RC-02"><a href="#fn-2" id="fn-ref-2-1" aria-label="Note 2">2</a></sup></p>`);
  plainBad('the sentence without RC-02’s footnote marker', want.text, `<p class="plainline" data-plain-line data-fact="RC-02">${want.text}</p>`);
  if (plainLineProblems(plainOk.markup, plainOk.text, { ...rc02, numeric: 10.6 }, true).length !== 2) problems.push('self-test: the [PLAIN-LINE] check did not notice that RC-02 changed (10.6 would give "about 11" and "+10.6 percentage points")');
  const stray = plainPage(want.text.replace('+10.3', '+10.4'));
  if (!plainLineProblems(stray.markup, stray.text, rc02, false).length) problems.push('self-test: a page that does not need the [PLAIN-LINE] but carries it with a wrong number was accepted');
  if (plainLineProblems('<main><p>No plain line here.</p></main>', 'No plain line here.', rc02, false).length) problems.push('self-test: a page that does not need the [PLAIN-LINE] was flagged for lacking it');
  // copy conventions: curly apostrophes, "pp" spelled out before it is used
  if (conventionProblems('CodersTrust’s WSDFM training; +10.3 pp percentage points more employment; In percentage points, employment rose +10.3 pp.').length) problems.push('self-test: the copy-convention check rejected correct copy');
  if (!conventionProblems('CodersTrust\'s WSDFM training raised women’s income.').length) problems.push('self-test: the copy-convention check accepted a straight apostrophe');
  if (!conventionProblems('Won\'t AI eliminate these jobs?').length) problems.push('self-test: the copy-convention check accepted "Won\'t"');
  if (!conventionProblems('Employment among surveyed completers +30.5 pp View chart data').length) problems.push('self-test: the copy-convention check accepted a bare "pp" that is never spelled out');
  if (!conventionProblems('+30.5 pp ... much later text ................................................... percentage points').length) problems.push('self-test: the copy-convention check accepted "percentage points" far after the first "pp"');
  if (conventionProblems('He said \'hello\' and the 8pp-wide column; opposite; apple').length) problems.push('self-test: the copy-convention check flagged quotes or words that merely contain "pp"');
  // statistic tiles carry their footnote marker
  const sup = '<sup class="fn" data-fact="SC-05"><a href="#fn-1" id="fn-ref-1-1" aria-label="Note 1">1</a></sup>';
  const tile = (label) => `<div class="stat stat--md" data-astro-cid-x><p class="stat__value">3M+</p><p class="stat__label" data-astro-cid-x>${label}</p></div>`;
  if (tileProblems(tile(`students at National University${sup}`)).length) problems.push('self-test: the tile check rejected a tile with its footnote marker');
  if (!tileProblems(tile('students at National University')).length) problems.push('self-test: the tile check accepted a statistic tile with no footnote marker');
  if (!tileProblems(`<article class="card factcard" data-fact="PX-05"><p class="factcard__label" data-astro-cid-x>of employers globally report difficulty finding talent</p></article>`).length) problems.push('self-test: the tile check accepted a FactCard stat tile with no footnote marker');
  if (tileProblems(`<article class="card factcard" data-fact="PX-06"><p class="factcard__label factcard__label--text" data-astro-cid-x>A sentence card</p></article>`).length) problems.push('self-test: the tile check flagged a FactCard sentence (not a tile)');
  // [SESSION-AGENDA]: beside the C13 CTA as ONE paragraph (lead, items joined with " · ", one final period), tied to PD-02, in the plan's words
  const agendaP = (text, { tag = 'p', fact = 'PD-02', attrs = '' } = {}) => `<${tag} class="agenda" data-session-agenda${fact ? ` data-fact="${fact}"` : ''}${attrs} data-astro-cid-x><span class="agenda__lead">${text.split(': ')[0]}:</span> ${text.split(': ').slice(1).join(': ')}</${tag}>`;
  const ctaBand = (inner) => `<main><section class="band band--airy" id="cta" aria-labelledby="cta-h"><div class="container"><div class="cta-band"><h2 id="cta-h">Let’s</h2><a href="/x/">Book</a><ul><li>A discovery session is a conversation, not a commitment.</li></ul>${inner}</div></div></section></main>`;
  const [leadDiscovery, leadBriefing] = SESSION_AGENDA_LEADS;
  const agendaWant = sessionAgendaWanted(leadDiscovery);
  for (const [why, text] of [['discovery lead', agendaWant], ['briefing lead', sessionAgendaWanted(leadBriefing)]]) {
    const ok = ctaBand(agendaP(text));
    if (sessionAgendaProblems(ok).length) problems.push(`self-test: the [SESSION-AGENDA] check rejected a correct agenda (${why}): ${sessionAgendaProblems(ok).join('; ')}`);
  }
  if (sessionAgendaProblems(ctaBand(agendaP(agendaWant).replace('</p>', '<sup class="fn" data-fact="PD-02"><a href="#fn-9" id="fn-ref-9-1" aria-label="Note 9">9</a></sup></p>'))).length) problems.push('self-test: the [SESSION-AGENDA] check rejected an agenda that carries a footnote marker');
  const agendaBad = (why, markup) => {
    if (!sessionAgendaProblems(markup).length) problems.push(`self-test: the [SESSION-AGENDA] check accepted ${why}`);
  };
  agendaBad('a CTA band with no agenda', ctaBand(''));
  agendaBad('a page with no CTA band', '<main><p>nothing</p></main>');
  agendaBad('an agenda outside the C13 band', ctaBand('') + agendaP(agendaWant));
  agendaBad('an agenda set as a heading', ctaBand(agendaP(agendaWant, { tag: 'h3' })));
  agendaBad('an agenda set as a list', ctaBand(`<ul class="agenda" data-session-agenda data-fact="PD-02"><li>${leadDiscovery}</li><li>${SESSION_AGENDA_ITEMS.join('</li><li>')}</li></ul>`));
  agendaBad('a paragraph that wraps a list', ctaBand(`<p class="agenda" data-session-agenda data-fact="PD-02">${leadDiscovery} <ul><li>${SESSION_AGENDA_ITEMS.join('</li><li>')}</li></ul></p>`));
  agendaBad('a changed lead', ctaBand(agendaP(agendaWant.replace('discovery session', 'session'))));
  agendaBad('a changed item', ctaBand(agendaP(agendaWant.replace('employer demand and certification tracks', 'employer demand'))));
  agendaBad('items joined with commas instead of " · "', ctaBand(agendaP(agendaWant.replaceAll(' · ', ', '))));
  agendaBad('a missing final period', ctaBand(agendaP(agendaWant.slice(0, -1))));
  agendaBad('an agenda without the PD-02 marker', ctaBand(agendaP(agendaWant, { fact: '' })));
  agendaBad('an agenda tied to the wrong fact', ctaBand(agendaP(agendaWant, { fact: 'PD-04' })));
}

// The public dataset itself (D1, D15): no unverified facts and no restricted facts without a public scope.
for (const f of Object.values(facts)) {
  if (f.status === 'U') problems.push(`dataset: unverified (U) fact ${f.id} must stay in the private register`);
  if (f.status === 'R' && !(f.allow ?? []).length) problems.push(`dataset: restricted (R) fact ${f.id} has no public allow scope and must stay in the private register`);
}
// The non-affiliation note is the inline <CertNote> that <Fact>/<FactCard> add for CERT_FACT_IDS; no fact may repeat it as a footnote.
for (const id of ['PD-03', 'IN-08']) if (!CERT_FACT_IDS.includes(id)) problems.push(`dataset: ${id} names vendor certifications, so it must be in CERT_FACT_IDS (that is what makes <Fact> add the inline non-affiliation note)`);
for (const f of Object.values(facts)) {
  if (String(f.footnote ?? '').includes(CERT_NOTE_TEXT) || String(f.caveatText ?? '').includes(CERT_NOTE_TEXT)) problems.push(`dataset: ${f.id} carries the non-affiliation note in its footnote; the inline note is the treatment (the sentence would print twice)`);
}
for (const id of CERT_FACT_IDS) if (!facts[id]) problems.push(`dataset: CERT_FACT_IDS names ${id}, which is not in the register`);

/* ---- report CTA switch (src/lib/site.ts) ---- */
const siteSource = readFileSync(join(root, 'src/lib/site.ts'), 'utf8');
const reportFlag = /export const REPORT_EDITION_READY\s*=\s*(true|false)\b/.exec(siteSource)?.[1];
if (!reportFlag) problems.push('src/lib/site.ts: REPORT_EDITION_READY is missing or is not a literal true/false');
const reportWithheld = reportFlag === 'false';
const REPORT_CTA = [/Request the Impact Report/i, /partner edition\)\s*request/i, /Impact(?:%20| )Report(?:%20| )2026(?:%20| )\(partner(?:%20| )edition\)(?:%20| )request/i];

const rc02Stat = facts['RC-02']?.stat;
if (!rc02Stat || typeof rc02Stat.numeric !== 'number' || rc02Stat.suffix !== ' pp') problems.push('dataset: RC-02 must carry a numeric stat in percentage points (suffix " pp"); the [PLAIN-LINE] is derived from it');

let pages = 0;
let refs = 0;
let vendorPages = 0;
let footnotePages = 0;
let plainLinePages = 0;
let agendaPages = 0;
const seenPaths = new Set();
for (const file of htmlFiles(dist)) {
  pages++;
  const rel = relative(dist, file).split(sep).join('/');
  const path = rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? '/' + rel.slice(0, -'index.html'.length) : '/' + rel;
  const html = readFileSync(file, 'utf8');
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');

  const ids = new Set();
  for (const m of markup.matchAll(/\sdata-fact=(?:"([^"]*)"|'([^']*)')/g)) for (const t of (m[1] ?? m[2]).split(/\s+/).filter(Boolean)) ids.add(t);
  refs += ids.size;
  for (const id of ids) {
    if (holds.has(id)) {
      if (!heldPages.has(id)) heldPages.set(id, new Set());
      heldPages.get(id).add(path);
    }
    const f = facts[id];
    if (!f) { problems.push(`${path}: data-fact="${id}" is not in the register`); continue; }
    if (f.status === 'U' && !path.startsWith('/news/')) problems.push(`${path}: unverified (U) fact ${id} rendered outside /news/`);
    if (f.status === 'R' && !(f.allow ?? []).some((p) => path.startsWith(p))) problems.push(`${path}: restricted (R) fact ${id} rendered outside its allow list [${(f.allow ?? []).join(', ') || 'none'}]`);
  }

  let scan = markup;
  for (const a of ALLOWED) scan = scan.replace(a, '');
  const report = (text, list, where) => {
    for (const [re, why] of list) {
      const m = text.match(re);
      if (m) problems.push(`${path}: forbidden wording${where} (${why}): "${text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ')}"`);
    }
  };
  report(scan, [...TOKENS, ...DISCIPLINE], '');
  for (const block of citationBlocks(markup)) report(decode(block), CITATION_WORDING, ' in citation block');
  for (const g of mapGaps(markup)) problems.push(`${path}: ${g}`);

  // vendor certifications need the non-affiliation note (rule 13)
  const text = visibleText(markup);
  if (namesVendorCert(text)) vendorPages++;
  for (const p of certNoteProblems(text)) problems.push(`${path}: ${p}`);
  // archive-only wording: British "enquir*" (D6) and "tripled" (OC-03) outside the archived news posts
  problems.push(...archiveWordingProblems(path, html));
  // program-data label once per figure, no page-local variant (the archived posts keep their wording)
  if (!exemptFromArchiveRule(path, html)) for (const p of programLabelProblems(text)) problems.push(`${path}: ${p}`);
  // [PLAIN-LINE] required on Home, the development-partners page and the independent-evaluation page; its numbers are RC-02's wherever it appears
  seenPaths.add(path);
  const plainRequired = PLAIN_LINE_PAGES.includes(path);
  if (plainRequired) plainLinePages++;
  if (rc02Stat) for (const p of plainLineProblems(markup, text, rc02Stat, plainRequired)) problems.push(`${path}: ${p}`);
  // curly apostrophes and "pp" spelled out (the archived posts and the styleguide samples are exempt)
  if (!exemptFromConventions(path) && !exemptFromArchiveRule(path, html)) for (const p of conventionProblems(text)) problems.push(`${path}: ${p}`);
  // every statistic tile carries its fact's footnote marker (the styleguide's samples are not real tiles)
  if (path !== '/styleguide/') for (const p of tileProblems(markup)) problems.push(`${path}: ${p}`);
  // [SESSION-AGENDA] required beside the C13 CTA on the five funder and government pages
  if (SESSION_AGENDA_PAGES.includes(path)) {
    agendaPages++;
    for (const p of sessionAgendaProblems(markup)) problems.push(`${path}: ${p}`);
  }
  // footnotes in reading order, no empty notes band, no glued inline link
  if (markup.includes('class="fn"') || markup.includes('sources__note')) footnotePages++;
  for (const p of footnoteProblems(markup)) problems.push(`${path}: ${p}`);
  // the withheld report CTA must not leak
  if (reportWithheld) for (const re of REPORT_CTA) if (re.test(html)) problems.push(`${path}: report CTA rendered while REPORT_EDITION_READY is false (${re})`);
}

if (pages === 0) {
  console.error(`check-facts: no HTML found in ${dist}. Run "npm run build" first.`);
  process.exit(1);
}
// A page that must carry the [PLAIN-LINE] or the [SESSION-AGENDA] has to be in the build at all.
for (const p of new Set([...PLAIN_LINE_PAGES, ...SESSION_AGENDA_PAGES])) if (!seenPaths.has(p)) problems.push(`${p}: page not found in ${relative(root, dist) || '.'}, so its [PLAIN-LINE] or [SESSION-AGENDA] cannot be checked`);
// Production fact holds: a held fact must not be rendered anywhere. Only fact IDs, item numbers and page paths are printed.
for (const [id, set] of heldPages) {
  const list = [...set].sort();
  problems.push(`production fact hold: ${id} (confirm item ${holds.get(id)}) is rendered on ${list.length} page(s): ${list.slice(0, 8).join(', ')}${list.length > 8 ? ` +${list.length - 8} more` : ''}`);
}
if (problems.length) {
  console.error(`check-facts: ${problems.length} problem(s)\n` + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(
  `check-facts: OK — ${pages} pages, ${refs} fact references, no gated facts or internal wording; ${vendorPages} page(s) name vendor certifications and carry the note once; no "enquir*" or "tripled" outside /news/<post>/; ${footnotePages} page(s) with footnotes in reading order; [PLAIN-LINE] on ${plainLinePages} page(s) with RC-02's numbers; [SESSION-AGENDA] beside the CTA on ${agendaPages} page(s); report CTA ${reportWithheld ? 'withheld' : 'enabled'}` +
    (production ? `; production holds: ${holds.size} held fact(s), none rendered.` : '.'),
);
