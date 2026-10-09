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
//   - archive-only wording: no British "enquir*" (D6; write "inquir*"), no British "licence" (write "license") and no "tripled" (OC-03 is a ratio of medians) anywhere in a
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
//   - [PLAIN-LINE] (plan v1.10, v1.13): Home, /partner-with-us/development-partners/, /impact/independent-evaluation/ and the WSDFM case study
//     (/impact/case-studies/wsdfm-women-freelancers/, whose header leads with it) must carry "For every 100
//     women offered a place, about 10 more were in work at follow-up than in the control group (+10.3 percentage points)." rendered by
//     <PlainLine> with RC-02's footnote marker; its numbers are re-derived here from RC-02 (+10.3 pp, rounded 10) and must match wherever the
//     sentence appears; negative self-tests below
//   - [SESSION-AGENDA] (plan v1.13): /partner-with-us/governments/, /development-partners/, /foundations/, /programs/youthwide/ and
//     /programs/nationwide/ must show, inside the C13 CTA band (#cta), ONE paragraph in the plan's exact words for THAT page: the lead "What
//     the discovery session covers:" (development partners, foundations, YouthWIDE; first item "your country, priority groups and
//     locations") or "What the briefing covers:" (governments, NationWIDE; first item "your priority groups and districts"), then the three
//     items separated by semicolons and one final period, carrying data-fact="PD-02" like [PRICING] and FAQ Q8 (its "indicative budget"
//     claim, so the three stand on the same fact); negative self-tests below
//   - [POSITION] opens C6 (plan v1.13, conversion-page rule 9): on the 13 pages that carry a positioning statement, the statement is the first
//     thing in the C6 band (#mechanism): only its eyebrow and H2 may come first (never a lead line, diagram or other text), and it reads as
//     the audience sentence followed by the verbatim [UNLIKE] sentence (SuperKids, whose [UNLIKE] clause is pending, is exempt from that
//     second part); negative self-tests below
//   - ranked pains and the C8 map (review round 14, M4): Home, /partner-with-us/local-partners/ and /programs/youthwide/ state exactly three
//     pains in the C2 band (#problem; list items data-pain="P1".."P3", in that order) and give the C8 table (#features) exactly one row for
//     each (<tr data-relieves="P1">..), in the same order; rows without data-relieves are gain creators; negative self-tests below
//   - trial relevance line (round 14, m2): /partner-with-us/employers/, /programs/jobready-work/ (JobReady@Work) and /nu-postgraduate-diploma/ (the NU
//     Postgraduate Diploma) carry "This trial evaluated WSDFM training for women in Dhaka, not <offering>." directly under the trial headline of
//     the C7 proof band; negative self-tests below
//   - program-data label wording: "Program data — gross in-work rate among program completers, no comparison group" (round 14, m1; the retired
//     "among graduates" wording is flagged), and the retired USP heading "Earning starts within months" (round 14, m3) renders nowhere
//   - number guard (doc 10 §1 "Facts guard", WP1l): every claim-marked figure (%, pp, a leading + or ~, a trailing +, M/K/B/million, $ or BDT, ×,
//     "about/at least/up to/over N") in the copy of an evergreen page (visible text, title, meta description) is a value the public dataset
//     registers (facts, caveats, citations, the survey aggregates behind /impact/outcomes-2026/, one derivation list) or is whitelisted in
//     scripts/facts-guard-allow.json (page + exact text + reason; a stale entry fails). Not scanned: /news/<post>/ archive posts, redirect
//     stubs, /styleguide/ (a component sample page) and the 404. Details at "number guard" below; `FACTS_GUARD_LIST=1 npm run check:facts`
//     lists every figure the register allowed. Negative self-tests below.
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
const { facts, CAVEATS, sources, CERT_NOTE_TEXT, CERT_FACT_IDS, PROGRAM_DATA_LABEL } = await import(new URL('../src/data/facts.ts', import.meta.url).href);
// The published survey aggregates behind the /impact/outcomes-2026/ charts and CSV: a second public dataset the number guard reads (see below).
const { csvRows: outcomesCsvRows } = await import(new URL('../src/components/pages/impact/outcomes-data.ts', import.meta.url).href);
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
  // review round 14, m3: only conditional timing evidence supports it. Write "Most surveyed new earners started earning within six months.", with the 58.8%, its base and the survey qualifier immediately below
  [/\bearning starts within months\b/i, '"Earning starts within months" (OC-05 is a share of surveyed new earners: write "Most surveyed new earners started earning within six months.", with the 58.8%, its base and the survey qualifier below it)'],
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
// "enquir*" and "licence*" are British (American spelling, D6: the public site says "inquiry"/"inquiries" and "license"; the schema.org property
// is "license" too); "tripled" overstates OC-03, which compares medians (a ratio of medians, not an average; individual changes vary).
// All three are held to every page except the archive.
const ARCHIVE_ONLY_WORDING = [
  [/enquir/i, 'British spelling "enquir…" (write "inquiry"/"inquiries")'],
  [/\blicence/i, 'British spelling "licence" (write "license")'],
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
// "among graduates" is the label's retired wording (review round 14 m1: "graduates" means university-degree holders; the denominator is program completers)
const LABEL_VARIANT = /Program records — gross|gross placement|gross in-work rate among graduates/i;
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
// is built in src/data/copy.ts from RC-02's stat; it is required on Home, the development-partners page, the independent-evaluation page and the
// WSDFM case study (its header leads with the randomized trial's plain-language line, the program result second),
// and wherever it appears its numbers must be RC-02's: "+10.3 percentage points" is the stat value with "pp" spelled out, "about 10" its rounding.
// The expected sentence is derived here from the register on its own (not read from copy.ts), so a drift in either place fails the build.
const PLAIN_LINE_PAGES = ['/', '/partner-with-us/development-partners/', '/impact/independent-evaluation/', '/impact/case-studies/wsdfm-women-freelancers/'];
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
// lead, three items separated by semicolons and a single final period, tied to PD-02 (data-fact) like [PRICING] and FAQ Q8, whose "indicative
// budget" claim it repeats. The wording is verbatim from the plan (doc 06 [SESSION-AGENDA], v1.13) and is declared here independently of
// src/data/copy.ts, so a wording change has to be made in both places on purpose. Each page has its own exact sentence: the discovery-session
// pages open with "your country, priority groups and locations" (the international pages), the briefing pages (governments, NationWIDE) with
// "your priority groups and districts".
const SESSION_AGENDA_LEAD_DISCOVERY = 'What the discovery session covers:';
const SESSION_AGENDA_LEAD_BRIEFING = 'What the briefing covers:';
const SESSION_AGENDA_FIRST_DISCOVERY = 'your country, priority groups and locations';
const SESSION_AGENDA_FIRST_BRIEFING = 'your priority groups and districts';
const SESSION_AGENDA_COMMON = ['employer demand and certification tracks', 'an indicative budget, the pilot scorecard and the tracer timeline'];
const sessionAgendaWanted = (lead, first) => `${lead} ${[first, ...SESSION_AGENDA_COMMON].join('; ')}.`;
const SESSION_AGENDA_DISCOVERY = sessionAgendaWanted(SESSION_AGENDA_LEAD_DISCOVERY, SESSION_AGENDA_FIRST_DISCOVERY);
const SESSION_AGENDA_BRIEFING = sessionAgendaWanted(SESSION_AGENDA_LEAD_BRIEFING, SESSION_AGENDA_FIRST_BRIEFING);
/** page path -> the exact agenda sentence that page must carry */
const SESSION_AGENDA_BY_PAGE = {
  '/partner-with-us/development-partners/': SESSION_AGENDA_DISCOVERY,
  '/partner-with-us/foundations/': SESSION_AGENDA_DISCOVERY,
  '/programs/youthwide/': SESSION_AGENDA_DISCOVERY,
  '/partner-with-us/governments/': SESSION_AGENDA_BRIEFING,
  '/programs/nationwide/': SESSION_AGENDA_BRIEFING,
};
const SESSION_AGENDA_PAGES = Object.keys(SESSION_AGENDA_BY_PAGE);
const SESSION_AGENDA_FACT = 'PD-02';
/** Problems with the agenda on one page: one paragraph inside the C13 band (#cta), in the plan's exact words for that page (`wanted`), with the PD-02 marker. */
function sessionAgendaProblems(markup, wanted) {
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
    if (text !== wanted) out.push(`[SESSION-AGENDA] reads "${text}", expected "${wanted}"`);
  }
  const factAttr = /\bdata-fact="([^"]*)"/.exec(open[0])?.[1] ?? '';
  if (!factAttr.split(/\s+/).includes(SESSION_AGENDA_FACT)) out.push(`[SESSION-AGENDA] must carry data-fact="${SESSION_AGENDA_FACT}" like [PRICING] and FAQ Q8, so a change to ${SESSION_AGENDA_FACT} or a hold on it treats the agenda the same`);
  return out;
}

/* ---- [POSITION] opens C6 (plan v1.13: conversion-page rule 9, review round 12 Mi2) ---- */
// Every C6 band opens with the positioning statement: "For ... who need ..., CodersTrust ...." then the verbatim [UNLIKE] sentence (doc 04 section 1).
// "Opens" means nothing precedes the statement in the band except its own eyebrow and H2 (the band's title): no lead line, no model heading as
// body text, no diagram, no list. The [UNLIKE] sentence is declared here independently of src/data/copy.ts, so a change to it must be made twice on purpose.
const POSITION_PAGES = [
  '/',
  '/investors/',
  '/partner-with-us/governments/',
  '/partner-with-us/development-partners/',
  '/partner-with-us/foundations/',
  '/partner-with-us/universities/',
  '/partner-with-us/employers/',
  '/partner-with-us/local-partners/',
  '/programs/youthwide/',
  '/programs/nationwide/',
  '/programs/jobready-campus/',
  '/programs/jobready-work/',
  '/programs/superkids/',
];
// SuperKids' "unlike ... we ..." clause waits for CodersTrust's approval (doc 06 P14), so its statement is the audience sentence alone.
const POSITION_WITHOUT_UNLIKE = ['/programs/superkids/'];
const UNLIKE_SENTENCE =
  'Unlike approaches that typically focus on one part of the path — training-only programs, self-paced course platforms or freelance marketplaces alone (provision varies by provider) — we take responsibility for the whole path to earnings, working in phases through existing labs and colleges, with outcome evidence that includes a randomized trial by BIGD.';
/** Problems with the C6 band's opening: the statement exists, nothing but eyebrow and H2 precedes it, and it ends with the verbatim [UNLIKE] sentence. */
function positionProblems(markup, { unlike = true } = {}) {
  const band = /<section\b[^>]*\bid="mechanism"[^>]*>([\s\S]*)/.exec(markup);
  if (!band) return ['the C6 band (#mechanism) is missing, so the positioning statement has nowhere to open'];
  const pos = /<div\b[^>]*\bclass="[^"]*\bpos\b[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(band[1]);
  if (!pos) return ['the C6 band has no positioning statement ([POSITION])'];
  const out = [];
  const before = band[1]
    .slice(0, pos.index)
    .replace(/<p\b[^>]*\beyebrow\b[^>]*>[\s\S]*?<\/p>/g, '')
    .replace(/<h2\b[^>]*>[\s\S]*?<\/h2>/g, '');
  const leading = decode(before);
  if (leading) out.push(`the C6 band puts "${leading.slice(0, 80)}${leading.length > 80 ? '…' : ''}" before the positioning statement (only its eyebrow and H2 may come first)`);
  else if (/<(svg|img|ul|ol|table|figure|a)\b/.test(before)) out.push('the C6 band puts a diagram, list, image or link before the positioning statement (only its eyebrow and H2 may come first)');
  const text = /<p\b[^>]*\bpos__text\b[^>]*>([\s\S]*?)<\/p>/.exec(pos[1]);
  const statement = text ? decode(text[1]) : '';
  if (!statement) out.push('the positioning statement has no text');
  else if (unlike) {
    if (!statement.endsWith(` ${UNLIKE_SENTENCE}`)) out.push('the positioning statement does not end with the verbatim [UNLIKE] sentence as its own sentence');
    else if (!/[.!?]$/.test(statement.slice(0, -UNLIKE_SENTENCE.length - 1))) out.push('the positioning statement runs the audience sentence into [UNLIKE] (they are two sentences)');
  }
  return out;
}

/* ---- ranked pains (C2b) and the C8 map on the bespoke pages (review round 14, M4) ---- */
// Home, /partner-with-us/local-partners/ and /programs/youthwide/ are built by hand, not from a band matrix, so the messaging framework's C2b and
// C8b rules are checked on the built pages: the C2 band (#problem) states exactly THREE ranked pains, each a list item with data-pain="P1", "P2",
// "P3" in that order, and the C8 table (#features) has exactly ONE row for each of them, in the same order, as <tr data-relieves="P1"> (pain →
// how we relieve it → the registered feature behind it). A row without data-relieves is a gain creator and is not counted. Only the two bands
// are read: the same attributes elsewhere on the page count for nothing. The wording lives in src/data/copy.ts (FUNDER_PAINS, LOCAL_PARTNER_PAINS).
const PAIN_PAGES = ['/', '/partner-with-us/local-partners/', '/programs/youthwide/'];
const PAIN_IDS = ['P1', 'P2', 'P3'];
/** The markup of the band whose <section> has this id, up to the next band (a <section class="band …">; the C8 table's own wrapper is not one). */
function bandMarkup(markup, id) {
  const open = new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`).exec(markup);
  if (!open) return null;
  const rest = markup.slice(open.index + open[0].length);
  const next = /<section\b[^>]*\bclass="band\b/.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}
function painMapProblems(markup) {
  const c2 = bandMarkup(markup, 'problem');
  const c8 = bandMarkup(markup, 'features');
  const out = [];
  if (c2 === null) out.push('the C2 band (#problem) is missing, so the ranked pains have nowhere to sit');
  if (c8 === null) out.push('the C8 band (#features) is missing, so the pains have no relieving rows');
  if (c2 === null || c8 === null) return out;
  const pains = [...c2.matchAll(/<li\b[^>]*\bdata-pain="([^"]*)"/g)].map((m) => m[1]);
  const rows = [...c8.matchAll(/<tr\b[^>]*\bdata-relieves="([^"]*)"/g)].map((m) => m[1]);
  if (pains.join(' ') !== PAIN_IDS.join(' ')) out.push(`C2 must state exactly three ranked pains, P1, P2 and P3 in that order (data-pain), found [${pains.join(' ') || 'none'}]`);
  for (const id of PAIN_IDS) {
    const n = rows.filter((r) => r === id).length;
    if (n !== 1) out.push(`C8 must have exactly one row for pain ${id} (data-relieves="${id}"), found ${n}`);
  }
  for (const r of new Set(rows)) if (!PAIN_IDS.includes(r)) out.push(`C8 has a row that relieves "${r}", which is not one of ${PAIN_IDS.join(', ')}`);
  const inOrder = rows.filter((r) => PAIN_IDS.includes(r));
  if (inOrder.length === PAIN_IDS.length && new Set(inOrder).size === PAIN_IDS.length && inOrder.join(' ') !== PAIN_IDS.join(' ')) out.push(`C8 rows must follow the ranking of the pains, found [${inOrder.join(' ')}]`);
  return out;
}

/* ---- relevance line beside the randomized-trial proof (review round 14, m2) ---- */
// Where the offering on the page is not the program the trial evaluated, one line sits directly under the trial headline in the C7 proof band:
// "This trial evaluated WSDFM training for women in Dhaka, not <the offering>." The sentences are declared here on their own (src/data/copy.ts
// builds them from TRIAL_SCOPE), so a change has to be made in both places on purpose. Both employer pages sell JobReady@Work.
const TRIAL_SCOPE_BY_PAGE = {
  '/partner-with-us/employers/': 'This trial evaluated WSDFM training for women in Dhaka, not JobReady@Work.',
  '/programs/jobready-work/': 'This trial evaluated WSDFM training for women in Dhaka, not JobReady@Work.',
  '/nu-postgraduate-diploma/': 'This trial evaluated WSDFM training for women in Dhaka, not the NU Postgraduate Diploma.',
};
const TRIAL_SCOPE_PAGES = Object.keys(TRIAL_SCOPE_BY_PAGE);
function trialScopeProblems(markup, wanted) {
  const band = bandMarkup(markup, 'proof-band');
  if (band === null) return ['the C7 proof band (#proof-band) is missing, so the trial relevance line has nowhere to sit'];
  const head = /<header\b[^>]*\bproofband__head\b[^>]*>([\s\S]*?)<\/header>/.exec(band)?.[1];
  if (head === undefined) return ['the proof band has no header, so the trial relevance line cannot sit under the trial headline'];
  const heading = /<h2\b[\s\S]*?<\/h2>/.exec(head);
  const line = /<p\b[^>]*\bdata-trial-scope\b[^>]*>([\s\S]*?)<\/p>/.exec(head);
  if (!heading) return ['the proof band header has no H2 trial headline'];
  if (!line) return [`the relevance line "${wanted}" is missing directly under the randomized-trial headline`];
  const out = [];
  if (line.index < heading.index) out.push('the relevance line sits above the trial headline (it belongs directly under it)');
  const text = decode(line[1]);
  if (text !== wanted) out.push(`the relevance line reads "${text}", expected "${wanted}"`);
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

/* ---- number guard (doc 10 §1 "Facts guard"; WP1l) ---- */
// Every number token in the visible copy of an evergreen page that carries a claim marker (%, pp / "percentage points", a leading "+" or "~",
// a trailing "+", M / K / B / million / billion, $ or BDT, ×, or "about / at least / up to / over …" in front) must be a value the public
// dataset registers, or sit in the small whitelist (scripts/facts-guard-allow.json, one page and one reason per entry). Unmarked numbers
// (years, dates, list counts, step numbers, "100 hours") are not claims and are not read. Not held to it: the archived /news/<post>/ posts
// (R8-m5: they keep their dated figures), redirect stubs, /styleguide/ (a component sample page, its tiles hold placeholder figures) and the 404.
// Matching is by value, not by wording: "+10.3 pp", "10.3 percentage points" and "10.3 percentage-point" are one token; "62 million" and "62M",
// "3.00×" and "3×", "68–71%" (68% and 71%) and "~15,000" (15,000) are normalised alike on the page and in the register, so a fact rendered in
// a different format passes and a different number does not. Two limits, stated plainly: a value is matched wherever the register holds it
// (a page cannot reuse 47% for something else and be caught here; the sentences that matter are pinned by the [PLAIN-LINE], [SESSION-AGENDA]
// and tile checks), and a count below 1,000 must be followed by one of the three words that follow it in the register ("25+ classes" is
// registered, "25+ years" is not; "up to 10 cohorts" passes for PD-06's "Up to 10 certification cohorts").
const NUM = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const NUM_RE = new RegExp(`(?<![\\w.,])${NUM}(?!\\d)`, 'g');
// "+1 212 344 4111" (office telephone numbers) are contact details, not claims; removed before reading
const PHONE_RE = /\+\d{1,3}[ \-\u{2011}]\d[\d \-\u{2011}]{6,}\d/gu;
const APPROX_BEFORE = /\b(?:about|around|roughly|approximately|nearly|almost|more than|at least|up to|over)\s$/i;
// "over 4 months", "over 15 years": a duration is not a count of people, jobs or money
const DURATION_WORD = /^(?:years?|months?|weeks?|days?|hours?|minutes?)$/i;
const MAGNITUDE = { k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, billion: 1e9 };
const gap = (text, a, b) => /^\s?[–—-]\s?$/.test(text.slice(a, b));
/**
 * Every claim-marked number in a text: { kind, value, shown, words, around }. kind is pct | pp | mult | usd | bdt | num; value is normalised
 * (separators stripped, M/K/B/million applied); shown is the text as printed (marker included, the whole range for "68–71%"); words are the
 * (up to) three words after it.
 */
function numberTokens(input) {
  const text = input.replace(PHONE_RE, ' ');
  const occ = [...text.matchAll(NUM_RE)].map((m) => ({ i: m.index, j: m.index + m[0].length, raw: m[0] }));
  for (const o of occ) {
    const pre = /(?:([+~≈])?(US\$|\$|\bBDT|\bUSD|৳)\s?|([+~≈]))$/i.exec(text.slice(Math.max(0, o.i - 12), o.i));
    const prefixLen = pre ? pre[0].length : 0;
    // a sign glued to a letter or digit is part of a name ("WSIS+20 Forum"), not a "+41%"
    o.sign = pre && !/\w/.test(text[o.i - prefixLen - 1] ?? '') ? (pre[1] ?? pre[3] ?? '') : '';
    o.cur = pre?.[2] ? (/^(?:us)?\$$/i.test(pre[2]) ? '$' : pre[2] === '৳' ? 'BDT' : pre[2].toUpperCase()) : '';
    const lead = text.slice(Math.max(0, o.i - prefixLen - 18), o.i - prefixLen);
    const ap = APPROX_BEFORE.exec(lead);
    o.approx = Boolean(ap);
    o.start = o.i - prefixLen - (ap ? ap[0].length : 0);
    const after = text.slice(o.j, o.j + 32);
    let m;
    o.unit = '';
    if ((m = /^\s?(?:%|percent\b)/i.exec(after))) o.unit = 'pct';
    else if ((m = /^\s?(?:pp\b|percentage[ -]points?\b)/i.exec(after))) o.unit = 'pp';
    else if ((m = /^\s?×/.exec(after)) || (m = /^x(?![A-Za-z0-9])/.exec(after))) o.unit = 'mult';
    else if ((m = /^\s(?:million|billion|thousand)\b/i.exec(after) ?? /^[MKB](?![A-Za-z])/.exec(after))) o.unit = 'mag:' + m[0].trim().toLowerCase();
    o.ulen = m ? m[0].length : 0;
    o.plus = /^\+(?![\dA-Za-z])/.test(after.slice(o.ulen));
    o.end = o.j + o.ulen + (o.plus ? 1 : 0);
  }
  // ranges ("68–71%", "61–78 million", "$5–10"): the figures share the unit, the currency and the sign, but a magnitude only when the range ascends
  // ("200,000–1.5 million" is not 200,000 million)
  for (let k = 0; k + 1 < occ.length; k++) {
    const a = occ[k];
    const b = occ[k + 1];
    if (!gap(text, a.j, b.i)) continue;
    a.range = b;
    b.rangeFrom = a;
  }
  const out = [];
  for (const o of occ) {
    let { unit, cur, sign, approx, plus } = o;
    let shownStart = o.start;
    let shownEnd = o.end;
    if (o.range) {
      const b = o.range;
      const ascends = Number(o.raw.replace(/,/g, '')) <= Number(b.raw.replace(/,/g, ''));
      if (!unit && b.unit && (!b.unit.startsWith('mag:') || ascends)) unit = b.unit;
      shownEnd = b.end;
    }
    if (o.rangeFrom) {
      cur = cur || o.rangeFrom.cur;
      sign = sign || o.rangeFrom.sign;
      approx = approx || o.rangeFrom.approx;
      shownStart = o.rangeFrom.start;
    }
    let value = Number(o.raw.replace(/,/g, ''));
    let kind;
    if (unit === 'pp' || unit === 'pct' || unit === 'mult') kind = unit;
    else {
      if (unit.startsWith('mag:')) value *= MAGNITUDE[unit.slice(4)];
      if (cur === '$' || cur === 'USD') kind = 'usd';
      else if (cur === 'BDT') kind = 'bdt';
      else if (unit || plus || sign || approx) kind = 'num';
      else continue;
    }
    const words = [...text.slice(shownEnd, shownEnd + 60).matchAll(/[A-Za-z][A-Za-z’'-]*/g)].slice(0, 3).map((w) => w[0].toLowerCase());
    // an approximator in front of a bare number ("over 15 years") is a claim only when the number counts something other than time
    if (kind === 'num' && approx && !unit && !plus && !sign && DURATION_WORD.test(words[0] ?? '')) continue;
    out.push({ kind, value: +value.toPrecision(12), shown: text.slice(shownStart, shownEnd).trim(), words, around: text.slice(Math.max(0, shownStart - 30), shownEnd + 30).trim() });
  }
  return out;
}
const tokenKey = (t) => `${t.kind}:${t.value}`;
// A count below 1,000 ("25+", "10", "90+") could stand for anything, so the word that follows it on the page must be one of the three words that
// follow the same value in the register ("up to 10 cohorts" for "Up to 10 certification cohorts in parallel"; "25+ years" is not "25+ classes").
const isSmallCount = (t) => t.kind === 'num' && t.value < 1000;

/** The register of number values: every marked number in the public dataset's wording, caveats and citations, plus the derivations below. */
const numberRegistry = new Map(); // key -> { sources: Set(where it is registered), words: Set(words that follow it there) }
const registryEntry = (key) => {
  if (!numberRegistry.has(key)) numberRegistry.set(key, { sources: new Set(), words: new Set() });
  return numberRegistry.get(key);
};
const isRegistered = (t) => {
  const e = numberRegistry.get(tokenKey(t));
  return Boolean(e) && (!isSmallCount(t) || e.words.has(t.words[0] ?? ''));
};
{
  const add = (text, source) => {
    if (!text) return;
    for (const t of numberTokens(String(text))) {
      const e = registryEntry(tokenKey(t));
      e.sources.add(source);
      for (const w of t.words.length ? t.words : ['']) e.words.add(w);
    }
  };
  for (const f of Object.values(facts)) {
    for (const s of [f.text, f.headline, f.stat?.value, f.stat?.label, f.stat?.from, f.footnote, f.base, f.claim, f.caveatText]) add(s, f.id);
  }
  for (const [cls, text] of Object.entries(CAVEATS)) add(text, `caveat ${cls}`);
  for (const s of Object.values(sources)) {
    add(s.citation, `source ${s.id}`);
    add(s.label, `source ${s.id}`);
  }
  // The survey aggregates behind the /impact/outcomes-2026/ charts and its CSV (src/components/pages/impact/outcomes-data.ts): every share and
  // median is a row of the published CSV, and the module asserts at build time that each one reproduces a register headline (assertAgainstRegister)
  const csvKind = { percent: 'pct', percent_change: 'pct', percentage_points: 'pp', median_usd: 'usd' };
  for (const [id, , , type, value] of outcomesCsvRows()) {
    registryEntry(`${csvKind[type]}:${Number(value)}`).sources.add(`outcomes-data ${id}`);
  }
  // Numbers derived in code from a fact, never typed: each one is named here with the fact it comes from and the sentence that carries it.
  // This list is the only way to allow a derived value; the matcher is never loosened for it.
  const DERIVED = [
    // [PLAIN-LINE] (src/data/copy.ts, re-derived in plainLineWanted below): "about 10 more were in work" is RC-02's +10.3 pp rounded to a whole number
    ['RC-02 rounded (the [PLAIN-LINE])', () => (typeof facts['RC-02']?.stat?.numeric === 'number' ? `about ${Math.round(facts['RC-02'].stat.numeric)} more` : '')],
  ];
  for (const [source, make] of DERIVED) add(make(), source);
}

// FACTS_GUARD_LIST=1 npm run check:facts  also prints every figure the register allowed, as printed, with the pages it is on and where it is registered (an audit aid)
const FACTS_GUARD_LIST = Boolean(process.env.FACTS_GUARD_LIST);
const guardLog = new Map();

/** The whitelist (scripts/facts-guard-allow.json): numbers that carry a marker but are not claims. One page (or page prefix "/x/*") and one reason each. */
function allowlistProblems(list) {
  if (!Array.isArray(list)) return ['"allow" must be an array'];
  const out = [];
  const seen = new Set();
  list.forEach((e, i) => {
    const at = `allow[${i}]`;
    if (!e || typeof e !== 'object') return out.push(`${at} must be an object { page, text, reason }`);
    if (typeof e.page !== 'string' || !/^\/[^*]*\*?$/.test(e.page) || e.page === '/*') out.push(`${at}.page must be a page path such as "/news/" or a section prefix such as "/news/page/*" (never "/*" or "*")`);
    if (typeof e.text !== 'string' || !/\d/.test(e.text)) out.push(`${at}.text must be the number as printed, such as "25,000+"`);
    if (typeof e.reason !== 'string' || e.reason.trim().length < 15) out.push(`${at}.reason must say in a line why this is not a claim`);
    const key = `${e.page} ${e.text}`;
    if (seen.has(key)) out.push(`${at} repeats ${key}`);
    seen.add(key);
  });
  return out;
}
const allowAppliesTo = (e, path) => (e.page.endsWith('*') ? path.startsWith(e.page.slice(0, -1)) : e.page === path);
const loadAllowlist = () => {
  const file = join(root, 'scripts', 'facts-guard-allow.json');
  const spec = JSON.parse(readFileSync(file, 'utf8'));
  return { list: spec.allow, bad: allowlistProblems(spec.allow) };
};

/** Archive posts, redirect stubs, the styleguide's samples and the 404 are not held to the guard (see the note above). */
const NUMBER_GUARD_EXEMPT_PATHS = new Set(['/styleguide/', '/404.html']);
const guardsNumbers = (path, html) => !exemptFromArchiveRule(path, html) && !NUMBER_GUARD_EXEMPT_PATHS.has(path);
/**
 * The copy of a page for the guard: its visible text, plus the title and the meta description (search results and link previews are copy too).
 * Footnote-marker digits are set apart so they never read as part of a figure.
 */
function guardText(markup) {
  const head = /<head\b[\s\S]*?<\/head>/i.exec(markup)?.[0] ?? '';
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? '';
  const description = /<meta\b[^>]*\bname="description"[^>]*\bcontent="([^"]*)"/i.exec(head)?.[1] ?? '';
  const body = markup.replace(/<head\b[\s\S]*?<\/head>/i, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<sup\b[^>]*\bclass="fn"[\s\S]*?<\/sup>/g, ' ⁿ ');
  return decode(`${title} . ${description} . ${body}`.replace(/&nbsp;|&#160;/g, ' '))
    .replace(/[\u{a0}\u{202f}\u{2009}]/gu, ' ')
    .replace(/\u{2011}/gu, '-');
}
/** One page through the guard. `allow` is a list of whitelist entries (their `used` flag is set when one applies). */
function numberGuardPage(path, html, allow = []) {
  const res = { scanned: false, tokens: 0, byRegister: 0, byWhitelist: 0, problems: [] };
  if (!guardsNumbers(path, html)) return res;
  res.scanned = true;
  const markup = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const reported = new Set();
  for (const t of numberTokens(guardText(markup))) {
    res.tokens++;
    if (isRegistered(t)) {
      res.byRegister++;
      if (FACTS_GUARD_LIST) {
        const row = guardLog.get(tokenKey(t)) ?? { shown: new Set(), pages: new Set(), sources: [...numberRegistry.get(tokenKey(t)).sources] };
        row.shown.add(t.shown);
        row.pages.add(path);
        guardLog.set(tokenKey(t), row);
      }
      continue;
    }
    const hit = allow.find((e) => allowAppliesTo(e, path) && e.text === t.shown);
    if (hit) { hit.used = true; res.byWhitelist++; continue; }
    if (reported.has(t.shown)) continue;
    reported.add(t.shown);
    res.problems.push(`${path}: number "${t.shown}" is not a registered fact value (${t.kind}${isSmallCount(t) ? ', next word "' + (t.words[0] ?? '') + '"' : ''}): "…${t.around}…" — render it from a fact, or whitelist it with a reason in scripts/facts-guard-allow.json`);
  }
  return res;
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
  // "licence" (round 15, N3): British; "license" (noun and verb, and the schema.org property) is the site's spelling
  if (!archiveWordingProblems('/impact/independent-evaluation/', '<body><p>Dataset licence: CC BY 4.0.</p></body>').length) problems.push('self-test: the wording gate accepted "licence" in the text of a page');
  if (!archiveWordingProblems('/about/governance/', '<body><p>Licences are reviewed yearly.</p></body>').length) problems.push('self-test: the wording gate accepted "Licences" (case-insensitive plural)');
  if (!archiveWordingProblems('/impact/outcomes-2026/', '<body><a aria-label="Open data licence" href="/x/">data</a></body>').length) problems.push('self-test: the wording gate accepted "licence" in an attribute');
  if (!archiveWordingProblems('/impact/outcomes-2026/', '<script type="application/ld+json">{"description":"Data under a CC BY licence"}</script>').length) problems.push('self-test: the wording gate accepted "licence" in JSON-LD');
  if (!archiveWordingProblems('/news/page/2/', '<body>Licence</body>').length) problems.push('self-test: the wording gate exempted a news listing page for "licence" (only /news/<post>/ is exempt)');
  if (archiveWordingProblems('/news/some-archived-post/', '<body>Licence to operate</body>').length) problems.push('self-test: the wording gate flagged "licence" inside an archived post');
  if (archiveWordingProblems('/old-slug/', '<!DOCTYPE html><html lang="en" data-redirect-stub><head><meta http-equiv="refresh" content="0;url=/news/licence-notice/"></head></html>').length) problems.push('self-test: the wording gate flagged "licence" on a redirect stub');
  if (archiveWordingProblems('/impact/outcomes-2026/', '<body><p>Open data license CC BY 4.0; licensed under CC BY; sublicense; licensee.</p><script type="application/ld+json">{"license":"https://creativecommons.org/licenses/by/4.0/"}</script></body>').length) problems.push('self-test: the wording gate flagged American "license" spellings');
  if (!archiveWordingProblems('/impact/outcomes-2026/', '<body><li>does not mean every learner’s income Tripled.</li></body>').length) problems.push('self-test: the wording gate accepted "tripled" outside the archive');
  if (archiveWordingProblems('/news/some-archived-post/', '<body>income tripled</body>').length) problems.push('self-test: the wording gate flagged "tripled" inside an archived post');
  if (archiveWordingProblems('/our-model/', '<body>A triple-lens model; triplet; tripleshot</body>').length) problems.push('self-test: the wording gate flagged "triple" words that are not "tripled"');
  // program-data label: once per figure; a second copy or a page-local variant fails
  const okFig = `711 of 1,000 women placed (71%) in WSDFM 1 ${PROGRAM_DATA_LABEL} Women’s skills for freelancing 102 of 150 women placed (68%) in Kosovo 2 ${PROGRAM_DATA_LABEL} Women in Online Work`;
  if (programLabelProblems(okFig).length) problems.push('self-test: the program-data label check rejected figures that each carry the label once');
  if (!programLabelProblems(`women placed (71%) in WSDFM. ${PROGRAM_DATA_LABEL} 1 ${PROGRAM_DATA_LABEL} Women’s skills`).length) problems.push('self-test: the program-data label check accepted the label printed twice in a row');
  if (!programLabelProblems('372 of 800 women placed (47%) in Her Power training Program records — gross placement Context').length) problems.push('self-test: the program-data label check accepted a page-local label');
  if (!programLabelProblems('711 of 1,000 women placed (71%) in WSDFM. Program data — gross in-work rate among graduates, no comparison group Context').length) problems.push('self-test: the program-data label check accepted the retired "among graduates" wording');
  if (PROGRAM_DATA_LABEL !== 'Program data — gross in-work rate among program completers, no comparison group') problems.push(`self-test: PROGRAM_DATA_LABEL is "${PROGRAM_DATA_LABEL}", not the round-14 wording "Program data — gross in-work rate among program completers, no comparison group"`);
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
  const agendaWant = SESSION_AGENDA_DISCOVERY;
  const agendaWantB = SESSION_AGENDA_BRIEFING;
  if (agendaWant !== 'What the discovery session covers: your country, priority groups and locations; employer demand and certification tracks; an indicative budget, the pilot scorecard and the tracer timeline.') problems.push('self-test: the discovery agenda is no longer the plan wording');
  if (agendaWantB !== 'What the briefing covers: your priority groups and districts; employer demand and certification tracks; an indicative budget, the pilot scorecard and the tracer timeline.') problems.push('self-test: the briefing agenda is no longer the plan wording');
  for (const [why, text] of [['discovery lead', agendaWant], ['briefing lead', agendaWantB]]) {
    const ok = ctaBand(agendaP(text));
    if (sessionAgendaProblems(ok, text).length) problems.push(`self-test: the [SESSION-AGENDA] check rejected a correct agenda (${why}): ${sessionAgendaProblems(ok, text).join('; ')}`);
  }
  if (sessionAgendaProblems(ctaBand(agendaP(agendaWant).replace('</p>', '<sup class="fn" data-fact="PD-02"><a href="#fn-9" id="fn-ref-9-1" aria-label="Note 9">9</a></sup></p>')), agendaWant).length) problems.push('self-test: the [SESSION-AGENDA] check rejected an agenda that carries a footnote marker');
  // per page: every configured page maps to the discovery or the briefing sentence, and the two pages groups really differ
  const byPage = (p) => SESSION_AGENDA_BY_PAGE[p];
  for (const p of ['/partner-with-us/development-partners/', '/partner-with-us/foundations/', '/programs/youthwide/']) if (byPage(p) !== agendaWant) problems.push(`self-test: ${p} must carry the discovery agenda ("your country, priority groups and locations")`);
  for (const p of ['/partner-with-us/governments/', '/programs/nationwide/']) if (byPage(p) !== agendaWantB) problems.push(`self-test: ${p} must carry the briefing agenda ("your priority groups and districts")`);
  const agendaBad = (why, markup, wanted = agendaWant) => {
    if (!sessionAgendaProblems(markup, wanted).length) problems.push(`self-test: the [SESSION-AGENDA] check accepted ${why}`);
  };
  agendaBad('a CTA band with no agenda', ctaBand(''));
  agendaBad('a page with no CTA band', '<main><p>nothing</p></main>');
  agendaBad('an agenda outside the C13 band', ctaBand('') + agendaP(agendaWant));
  agendaBad('an agenda set as a heading', ctaBand(agendaP(agendaWant, { tag: 'h3' })));
  agendaBad('an agenda set as a list', ctaBand(`<ul class="agenda" data-session-agenda data-fact="PD-02"><li>${SESSION_AGENDA_LEAD_DISCOVERY}</li><li>${[SESSION_AGENDA_FIRST_DISCOVERY, ...SESSION_AGENDA_COMMON].join('</li><li>')}</li></ul>`));
  agendaBad('a paragraph that wraps a list', ctaBand(`<p class="agenda" data-session-agenda data-fact="PD-02">${SESSION_AGENDA_LEAD_DISCOVERY} <ul><li>${[SESSION_AGENDA_FIRST_DISCOVERY, ...SESSION_AGENDA_COMMON].join('</li><li>')}</li></ul></p>`));
  agendaBad('a changed lead', ctaBand(agendaP(agendaWant.replace('discovery session', 'session'))));
  agendaBad('a changed item', ctaBand(agendaP(agendaWant.replace('employer demand and certification tracks', 'employer demand'))));
  agendaBad('items joined with middle dots instead of semicolons', ctaBand(agendaP(agendaWant.replaceAll('; ', ' · '))));
  agendaBad('items joined with commas instead of semicolons', ctaBand(agendaP(agendaWant.replaceAll('; ', ', '))));
  agendaBad('a missing final period', ctaBand(agendaP(agendaWant.slice(0, -1))));
  agendaBad('an agenda without the PD-02 marker', ctaBand(agendaP(agendaWant, { fact: '' })));
  agendaBad('an agenda tied to the wrong fact', ctaBand(agendaP(agendaWant, { fact: 'PD-04' })));
  // the first item is per page: the briefing wording on a discovery page and the other way round both fail
  agendaBad('the briefing agenda ("districts") on a discovery-session page', ctaBand(agendaP(agendaWantB)));
  agendaBad('the discovery agenda on a briefing page', ctaBand(agendaP(agendaWant)), agendaWantB);
  agendaBad('"districts" in the first item on a discovery-session page', ctaBand(agendaP(agendaWant.replace('your country, priority groups and locations', 'your priority groups and districts'))));
  agendaBad('"your country, priority groups and locations" on a briefing page', ctaBand(agendaP(agendaWantB.replace('your priority groups and districts', 'your country, priority groups and locations'))), agendaWantB);
  agendaBad('the discovery lead over the briefing items on a briefing page', ctaBand(agendaP(agendaWantB.replace('What the briefing covers:', 'What the discovery session covers:'))), agendaWantB);

  // [POSITION] opens C6: the statement first (after, at most, the band's eyebrow and H2), then the verbatim [UNLIKE] sentence
  const posFor = 'For governments who need youth in paid digital work, CodersTrust offers an integrated training-to-earnings model.';
  const posBlock = (text = `${posFor} ${UNLIKE_SENTENCE}`) => `<div class="pos" data-reveal data-fact="ID-06" data-astro-cid-x><p class="pos__label">Where we stand</p><p class="pos__text">${text}</p></div>`;
  const headerHtml = '<header class="sh sh--start"><p class="eyebrow">How it works</p><h2 class="sh__title" id="mechanism-h">A title</h2>';
  const mech = (inner) => `<main><section class="band" id="mechanism" aria-labelledby="mechanism-h"><div class="container">${inner}</div></section><section class="band" id="proof"><p>Next band</p></section></main>`;
  const posOk = (why, markup, opts) => {
    const r = positionProblems(markup, opts);
    if (r.length) problems.push(`self-test: the [POSITION] check rejected ${why}: ${r.join('; ')}`);
  };
  const posBad = (why, markup, opts) => {
    if (!positionProblems(markup, opts).length) problems.push(`self-test: the [POSITION] check accepted ${why}`);
  };
  posOk('eyebrow, H2, then the statement', mech(`${headerHtml}${posBlock()}</header><div class="diagram"><svg></svg></div>`));
  posOk('the statement before the header (nothing precedes it)', mech(`${posBlock()}${headerHtml}</header><div class="diagram"><svg></svg></div>`));
  posOk('a lead line that follows the statement', mech(`${headerHtml}${posBlock()}<p class="sh__lead lead">A lead.</p></header>`));
  posOk('SuperKids’ audience-only statement (no [UNLIKE] pending approval)', mech(`${headerHtml}${posBlock(posFor)}</header>`), { unlike: false });
  posBad('a lead line before the statement', mech(`${headerHtml}<p class="sh__lead lead">A lead line.</p>${posBlock()}</header>`));
  posBad('a model block before the statement', mech(`<div class="diagram"><svg></svg></div>${posBlock()}`));
  posBad('a paragraph before the statement', mech(`<p>The model: learn, earn, prosper.</p>${posBlock()}`));
  posBad('a list before the statement', mech(`<ul><li>01 Who we reach</li></ul>${posBlock()}`));
  posBad('a band with no statement', mech(`${headerHtml}</header><p>Just text.</p>`));
  posBad('a page with no C6 band', '<main><p>nothing</p></main>');
  posBad('an altered [UNLIKE] sentence', mech(`${headerHtml}${posBlock(`${posFor} ${UNLIKE_SENTENCE.replace('whole path', 'path')}`)}</header>`));
  posBad('a statement without the [UNLIKE] sentence', mech(`${headerHtml}${posBlock(posFor)}</header>`));
  posBad('an audience sentence run into [UNLIKE] with a semicolon', mech(`${headerHtml}${posBlock(`${posFor.slice(0, -1)}; ${UNLIKE_SENTENCE.charAt(0).toLowerCase()}${UNLIKE_SENTENCE.slice(1)}`)}</header>`));
  posBad('a statement that is not in the #mechanism band', `<main><section class="band" id="mechanism"><p>x</p></section>${posBlock()}</main>`);

  // ranked pains and the C8 map (M4): exactly P1, P2, P3 in C2, exactly one C8 row for each, in order; only the two bands are read
  const painLi = (id) => `<li data-pain="${id}" data-astro-cid-x><span class="gp__n">1</span><div><p class="gp__q">A pain</p><p class="gp__a">Its words.</p></div></li>`;
  const painTr = (id) => `<tr data-relieves="${id}" data-fact="PD-15"><th scope="row">A feature</th><td>Which means</td><td>Outcome</td><td>Relieves</td></tr>`;
  const painPage = ({ pains = PAIN_IDS, rows = PAIN_IDS, c2 = true, c8 = true } = {}) =>
    '<main>' +
    (c2 ? `<section class="band band--white band--pad-md" id="problem" aria-labelledby="problem-h"><div class="container"><header class="sh"><h2 id="problem-h">Problem</h2><div class="gp"><ol class="gp__pains">${pains.map(painLi).join('')}</ol></div></header></div></section>` : '') +
    (c8 ? `<section class="band band--white band--pad-md" id="features" aria-labelledby="features-h"><div class="container"><header class="sh"><h2 id="features-h">Features</h2></header><section class="ft" aria-label="Features and benefits"><table><tbody>${rows.map(painTr).join('')}<tr><th scope="row">A gain creator</th><td>Which means</td><td>Outcome</td><td>—</td></tr></tbody></table></section></div></section>` : '') +
    // the same attributes in a later band count for nothing
    `<section class="band band--white" id="faq"><ol><li data-pain="P4">x</li></ol><table><tr data-relieves="P4"><td>x</td></tr></table></section></main>`;
  const painOk = (why, markup) => {
    const r = painMapProblems(markup);
    if (r.length) problems.push(`self-test: the pain-map check rejected ${why}: ${r.join('; ')}`);
  };
  const painBad = (why, markup) => {
    if (!painMapProblems(markup).length) problems.push(`self-test: the pain-map check accepted ${why}`);
  };
  painOk('three pains with one C8 row each (and a gain-creator row, and decoys in a later band)', painPage());
  painBad('two pains in C2', painPage({ pains: ['P1', 'P2'] }));
  painBad('four pains in C2', painPage({ pains: ['P1', 'P2', 'P3', 'P4'] }));
  painBad('no pains in C2', painPage({ pains: [] }));
  painBad('pains out of rank order', painPage({ pains: ['P2', 'P1', 'P3'] }));
  painBad('a pain stated twice (P1, P1, P3)', painPage({ pains: ['P1', 'P1', 'P3'] }));
  painBad('a pain with the wrong id (P1, P2, P4)', painPage({ pains: ['P1', 'P2', 'P4'] }));
  painBad('a pain with no C8 row (P2 missing)', painPage({ rows: ['P1', 'P3'] }));
  painBad('no C8 rows at all', painPage({ rows: [] }));
  painBad('two C8 rows for one pain (P1 twice)', painPage({ rows: ['P1', 'P1', 'P2', 'P3'] }));
  painBad('a C8 row for a pain that C2 does not state (P4)', painPage({ rows: ['P1', 'P2', 'P3', 'P4'] }));
  painBad('C8 rows that do not follow the ranking', painPage({ rows: ['P3', 'P1', 'P2'] }));
  painBad('a page with no C2 band', painPage({ c2: false }));
  painBad('a page with no C8 band', painPage({ c8: false }));
  painBad('pain ids that sit only outside C2 (the attributes in a later band do not count)', painPage({ pains: [] }).replace('<ol><li data-pain="P4">x</li></ol>', `<ol>${painLi('P1')}${painLi('P2')}${painLi('P3')}</ol>`));
  // the trial relevance line (m2): directly under the trial headline, in the plan's words for the page's own offering
  const scopeWork = TRIAL_SCOPE_BY_PAGE['/programs/jobready-work/'];
  const scopeNu = TRIAL_SCOPE_BY_PAGE['/nu-postgraduate-diploma/'];
  if (scopeWork !== 'This trial evaluated WSDFM training for women in Dhaka, not JobReady@Work.' || scopeNu !== 'This trial evaluated WSDFM training for women in Dhaka, not the NU Postgraduate Diploma.') problems.push('self-test: the trial relevance lines are no longer the plan wording');
  const proofPage = (headInner, after = '') => `<main><section class="band band--klein band--pad-md" id="proof-band" aria-labelledby="proof-band-h"><div class="container"><header class="proofband__head" data-reveal data-fact="RC-01"><p class="eyebrow">The evidence</p>${headInner}</header><div class="proofband"><div class="proofband__stats"></div></div>${after}</div></section></main>`;
  const trialH2 = '<h2 class="proofband__title" id="proof-band-h">A randomized trial found…<sup class="fn" data-fact="RC-01"><a href="#fn-1" id="fn-ref-1-1" aria-label="Note 1">1</a></sup></h2>';
  const trialLine = (text) => `<p class="proofband__scope" data-trial-scope data-astro-cid-x>${text}</p>`;
  const trialOk = (why, markup, wanted) => {
    const r = trialScopeProblems(markup, wanted);
    if (r.length) problems.push(`self-test: the trial-relevance check rejected ${why}: ${r.join('; ')}`);
  };
  const trialBad = (why, markup, wanted) => {
    if (!trialScopeProblems(markup, wanted).length) problems.push(`self-test: the trial-relevance check accepted ${why}`);
  };
  trialOk('the line directly under the headline', proofPage(`${trialH2}${trialLine(scopeWork)}<p class="lead">A lead.</p>`), scopeWork);
  trialOk('the NU diploma line on the NU page', proofPage(`${trialH2}${trialLine(scopeNu)}`), scopeNu);
  trialBad('a proof band with no relevance line', proofPage(trialH2), scopeWork);
  trialBad('the NU diploma line on an employer page', proofPage(`${trialH2}${trialLine(scopeNu)}`), scopeWork);
  trialBad('the employer line on the NU diploma page', proofPage(`${trialH2}${trialLine(scopeWork)}`), scopeNu);
  trialBad('a reworded line', proofPage(`${trialH2}${trialLine('This trial evaluated training for women in Dhaka, not JobReady@Work.')}`), scopeWork);
  trialBad('a line without the Dhaka scope', proofPage(`${trialH2}${trialLine('This trial did not evaluate JobReady@Work.')}`), scopeWork);
  trialBad('a line above the headline', proofPage(`${trialLine(scopeWork)}${trialH2}`), scopeWork);
  trialBad('a line outside the header (after the stats, away from the proof)', proofPage(trialH2, trialLine(scopeWork)), scopeWork);
  trialBad('a page with no proof band', '<main><p>nothing</p></main>', scopeWork);
  // retired wording: the USP heading "Earning starts within months" overgeneralizes OC-05 (round 14, m3)
  const disciplineHits = (text) => DISCIPLINE.filter(([re]) => re.test(text)).length;
  if (!disciplineHits('<h3>Earning starts within months</h3>')) problems.push('self-test: the wording gate accepted the retired USP heading "Earning starts within months"');
  if (disciplineHits('<h3>Most surveyed new earners started earning within six months.</h3>')) problems.push('self-test: the wording gate flagged the round-14 USP heading');

  // number guard: an unregistered figure on an evergreen page fails; registered figures pass in any format; archive posts, stubs, the styleguide
  // and the 404 are exempt; the whitelist is per page and per text
  const guardDoc = (body, head = '') => `<!doctype html><html lang="en"><head><title>Page</title>${head}</head><body><main>${body}</main></body></html>`;
  const guardRun = (path, body, allow = [], head = '') => numberGuardPage(path, guardDoc(body, head), allow);
  const guardFails = (why, path, body, allow, head) => {
    const r = guardRun(path, body, allow, head);
    if (r.problems.length !== 1) problems.push(`self-test: the number guard should flag ${why} once, flagged ${r.problems.length}`);
  };
  const guardPasses = (why, path, body, allow, head) => {
    const r = guardRun(path, body, allow, head);
    if (r.problems.length) problems.push(`self-test: the number guard rejected ${why}: ${r.problems.join('; ')}`);
  };
  guardFails('an unregistered "47.5%" on an evergreen page', '/our-model/', '<p>Employment rose 47.5% after training.</p>');
  for (const fig of ['+47.5 pp', '47.5 percentage points', '$47.5', '+$47.5', '47.5×', '47.5M', '47.5K+', '47.5+', '~47.5', 'about 47', 'at least 47', '$47.5 million', 'BDT 47.5', '47.5 million', '47.5B']) guardFails(`an unregistered "${fig}"`, '/our-model/', `<p>Result: ${fig} in the cohort.</p>`);
  guardFails('an unregistered figure in the meta description', '/our-model/', '<p>Nothing here.</p>', [], '<meta name="description" content="Up 47.5% in a year">');
  if (numberGuardPage('/our-model/', '<!doctype html><html lang="en"><head><title>Up 47.5% in a year</title></head><body><main><p>Nothing here.</p></main></body></html>').problems.length !== 1) problems.push('self-test: the number guard accepted an unregistered figure in the title');
  guardFails('an unregistered "47.5%" on a news listing page (only /news/<post>/ is exempt)', '/news/page/2/', '<p>Employment rose 47.5%.</p>');
  guardPasses('"47.5%" on an archived /news/<post>/ page', '/news/some-archived-post/', '<p>Employment rose 47.5% and income $9.9M.</p>');
  if (!guardRun('/our-model/', '').scanned || guardRun('/news/some-archived-post/', '').scanned || guardRun('/styleguide/', '').scanned) problems.push('self-test: the number guard scans the wrong pages');
  if (numberGuardPage('/old-slug/', '<!DOCTYPE html><html lang="en" data-redirect-stub><head><title>47.5%</title></head><body>47.5%</body></html>').problems.length) problems.push('self-test: the number guard flagged a redirect stub');
  guardPasses('"47.5%" on the styleguide (a component sample page)', '/styleguide/', '<p>47.5% and 1,234M+</p>');
  if (numberGuardPage('/404.html', guardDoc('<p>47.5%</p>')).problems.length) problems.push('self-test: the number guard flagged the 404');
  // numbers that are not claims carry no marker and are not read: years, dates, list counts, steps, durations, ages, bases
  const unmarked = guardRun('/our-model/', '<p>Founded in 2014; the October 2026 survey; Nov–Dec 2021; steps 1, 2 and 3; 100 training hours; ages 18–35; 6–8 weeks; tracers at 3/6/12 months; n = 321; over 4 months; 1 of 3; Her Power 2.0.</p><p>Call +1 212 344 4111 or +880 1958\u{2011}220802. WSIS+20 Forum.</p>');
  if (unmarked.problems.length || unmarked.tokens) problems.push(`self-test: the number guard read figures that carry no marker (${unmarked.tokens} token(s)): ${unmarked.problems.join('; ')}`);
  // a registered figure in another format passes (value-level matching): RC-02 is "+10.3 pp"
  for (const fig of ['+10.3 pp', '10.3 percentage points', '10.3 percentage-point', '+10.3 percentage points', '10.3pp', '+10.3 pp']) guardPasses(`RC-02 written as "${fig}"`, '/our-model/', `<p>Employment rose ${fig} for women offered a place.</p>`);
  guardFails('"10.4 percentage points" (RC-02 is 10.3)', '/our-model/', '<p>Employment rose 10.4 percentage points.</p>');
  const ppAfterMarker = guardRun('/our-model/', '<p>+10.3 pp<sup class="fn" data-fact="RC-02"><a href="#fn-3" id="fn-ref-3-1" aria-label="Note 3">3</a></sup> percentage points more employment</p>');
  if (ppAfterMarker.problems.length || ppAfterMarker.tokens !== 1) problems.push('self-test: the number guard read a footnote marker digit as part of the figure after it ("3 percentage points")');
  for (const fig of ['62 million', '62M', '3M+', '3 million', '1.5M+', '1.5 million', '61–78 million', '154M–435M', '~15,000', '$5M+', '$5 million', '+$27', '$27', 'BDT 2,354', '3.00×', '3×', '2.30×', '68–71%', '71–68%', '68% to 71%', '130,000+']) guardPasses(`the registered "${fig}"`, '/our-model/', `<p>Figure: ${fig}.</p>`);
  for (const fig of ['68–73%', '$5.5M', '3.5×', 'BDT 2,355', '1.6M+', '61–79 million', '~16,000']) guardFails(`"${fig}" (a range or figure with one unregistered value)`, '/our-model/', `<p>Figure: ${fig}.</p>`);
  // chart data: the published survey aggregates (outcomes-data.ts) are part of the public dataset
  guardPasses('a published survey share ("37.1%" Dhaka)', '/impact/outcomes-2026/', '<p>Dhaka 37.1%, Chattogram 8.2%</p>');
  guardFails('"37.2%" (not a published share)', '/impact/outcomes-2026/', '<p>Dhaka 37.2%</p>');
  // numbers derived from a fact in code: only the listed derivation passes ("about 10 more" is RC-02 rounded)
  guardPasses('"about 10 more" (RC-02 rounded)', '/our-model/', '<p>About 10 more were in work.</p>');
  guardFails('"about 11 more" (RC-02 rounds to 10)', '/our-model/', '<p>about 11 more were in work.</p>');
  // counts below 1,000 are tied to the word after them: "25+ classes" is RC-08, "25+ years" is not a fact
  guardPasses('"25+ classes" (RC-08)', '/our-model/', '<p>42% (25+ classes) freelanced.</p>');
  guardFails('"25+ years" (a number that only matches RC-08 by value)', '/our-model/', '<p>An architect with 25+ years of experience.</p>');
  guardPasses('"up to 10 cohorts" (PD-06: "Up to 10 certification cohorts")', '/our-model/', '<p>Run up to 10 cohorts in parallel.</p>');
  guardFails('"over 100 young" (a count, not a duration)', '/our-model/', '<p>Over 100 young Bhutanese took part.</p>');
  // the whitelist is per page and per exact text, and an entry that nothing uses is stale
  const allowEntry = { page: '/our-model/', text: '47.5%', reason: 'a self-test entry that says why this is not a claim' };
  const used = { ...allowEntry };
  const whitelisted = guardRun('/our-model/', '<p>Employment rose 47.5%.</p>', [used]);
  if (whitelisted.problems.length || whitelisted.byWhitelist !== 1 || !used.used) problems.push('self-test: the number guard rejected a whitelisted figure (or did not mark the entry used)');
  guardFails('a whitelisted text on another page', '/about/', '<p>Employment rose 47.5%.</p>', [{ ...allowEntry }]);
  guardFails('a different figure than the whitelisted text', '/our-model/', '<p>Employment rose 47.6%.</p>', [{ ...allowEntry }]);
  guardPasses('a whitelisted figure on a page under a prefix entry', '/section/page/', '<p>47.5%</p>', [{ ...allowEntry, page: '/section/*' }]);
  guardFails('a whitelisted figure outside its prefix', '/other/page/', '<p>47.5%</p>', [{ ...allowEntry, page: '/section/*' }]);
  const staleEntry = { page: '/our-model/', text: '+10.3 pp', reason: 'a self-test entry that says why this is not a claim' };
  guardRun('/our-model/', '<p>+10.3 pp</p>', [staleEntry]);
  if (staleEntry.used) problems.push('self-test: a whitelist entry for a registered figure was marked used (the register applies first, so the entry is stale and must be reported)');
  if (allowlistProblems([allowEntry, { ...allowEntry, page: '/about/' }]).length) problems.push('self-test: the whitelist validator rejected valid entries');
  for (const [why, entry] of [['a wildcard page', { ...allowEntry, page: '*' }], ['the whole site as a prefix', { ...allowEntry, page: '/*' }], ['an entry with no reason', { ...allowEntry, reason: '' }], ['a one-word reason', { ...allowEntry, reason: 'year' }], ['an entry whose text holds no number', { ...allowEntry, text: 'ten percent' }], ['an entry with no page', { text: '47.5%', reason: allowEntry.reason }]]) {
    if (!allowlistProblems([entry]).length) problems.push(`self-test: the whitelist validator accepted ${why}`);
  }
  if (!allowlistProblems([allowEntry, { ...allowEntry }]).length) problems.push('self-test: the whitelist validator accepted a duplicate entry');
  if (!allowlistProblems({}).length) problems.push('self-test: the whitelist validator accepted a non-array');
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
let positionPages = 0;
let painPages = 0;
let trialScopePages = 0;
const guard ={ pages: 0, tokens: 0, byRegister: 0, byWhitelist: 0 };
guardLog.clear(); // the self-tests above also pass through the guard
const { list: allowList, bad: allowBad } = loadAllowlist();
for (const p of allowBad) problems.push(`scripts/facts-guard-allow.json: ${p}`);
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
  // [PLAIN-LINE] required on Home, the development-partners page, the independent-evaluation page and the WSDFM case study; its numbers are RC-02's wherever it appears
  seenPaths.add(path);
  const plainRequired = PLAIN_LINE_PAGES.includes(path);
  if (plainRequired) plainLinePages++;
  if (rc02Stat) for (const p of plainLineProblems(markup, text, rc02Stat, plainRequired)) problems.push(`${path}: ${p}`);
  // curly apostrophes and "pp" spelled out (the archived posts and the styleguide samples are exempt)
  if (!exemptFromConventions(path) && !exemptFromArchiveRule(path, html)) for (const p of conventionProblems(text)) problems.push(`${path}: ${p}`);
  // every statistic tile carries its fact's footnote marker (the styleguide's samples are not real tiles)
  if (path !== '/styleguide/') for (const p of tileProblems(markup)) problems.push(`${path}: ${p}`);
  // number guard: every claim-marked figure in the copy is a registered fact value or whitelisted (archive posts, stubs, styleguide, 404 exempt)
  {
    const g = numberGuardPage(path, html, allowList);
    if (g.scanned) {
      guard.pages++;
      guard.tokens += g.tokens;
      guard.byRegister += g.byRegister;
      guard.byWhitelist += g.byWhitelist;
    }
    problems.push(...g.problems);
  }
  // [POSITION] opens C6 on the 13 pages that carry a positioning statement (SuperKids' [UNLIKE] clause is pending approval)
  if (POSITION_PAGES.includes(path)) {
    positionPages++;
    for (const p of positionProblems(markup, { unlike: !POSITION_WITHOUT_UNLIKE.includes(path) })) problems.push(`${path}: ${p}`);
  }
  // three ranked pains in C2 and one C8 row for each, on the three bespoke pages (round 14, M4)
  if (PAIN_PAGES.includes(path)) {
    painPages++;
    for (const p of painMapProblems(markup)) problems.push(`${path}: ${p}`);
  }
  // the trial relevance line directly under the randomized-trial headline where the offering is not the evaluated program (round 14, m2)
  if (TRIAL_SCOPE_PAGES.includes(path)) {
    trialScopePages++;
    for (const p of trialScopeProblems(markup, TRIAL_SCOPE_BY_PAGE[path])) problems.push(`${path}: ${p}`);
  }
  // [SESSION-AGENDA] required beside the C13 CTA on the five funder and government pages
  if (SESSION_AGENDA_PAGES.includes(path)) {
    agendaPages++;
    for (const p of sessionAgendaProblems(markup, SESSION_AGENDA_BY_PAGE[path])) problems.push(`${path}: ${p}`);
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
// A page that must carry the [PLAIN-LINE], the [SESSION-AGENDA], the [POSITION] statement, the ranked pains or the trial relevance line has to be in the build at all.
for (const p of new Set([...PLAIN_LINE_PAGES, ...SESSION_AGENDA_PAGES, ...POSITION_PAGES, ...PAIN_PAGES, ...TRIAL_SCOPE_PAGES])) if (!seenPaths.has(p)) problems.push(`${p}: page not found in ${relative(root, dist) || '.'}, so its [PLAIN-LINE], [SESSION-AGENDA], [POSITION], ranked pains or trial relevance line cannot be checked`);
// A whitelist entry that no page used any more is stale: the list stays as small as the site needs it.
for (const e of allowList) if (!e.used) problems.push(`scripts/facts-guard-allow.json: the entry for "${e.text}" on ${e.page} matched nothing in ${relative(root, dist) || '.'} (stale; remove it)`);
// Production fact holds: a held fact must not be rendered anywhere. Only fact IDs, item numbers and page paths are printed.
for (const [id, set] of heldPages) {
  const list = [...set].sort();
  problems.push(`production fact hold: ${id} (confirm item ${holds.get(id)}) is rendered on ${list.length} page(s): ${list.slice(0, 8).join(', ')}${list.length > 8 ? ` +${list.length - 8} more` : ''}`);
}
if (FACTS_GUARD_LIST) {
  for (const [key, row] of [...guardLog].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))) console.log(`${key.padEnd(18)} ${[...row.shown].slice(0, 4).join(' | ').padEnd(34)} ${String(row.pages.size).padStart(3)} page(s)  <- ${row.sources.slice(0, 4).join(', ')}${row.sources.length > 4 ? ` +${row.sources.length - 4}` : ''}`);
}
if (problems.length) {
  console.error(`check-facts: ${problems.length} problem(s)\n` + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(
  `check-facts: OK — ${pages} pages, ${refs} fact references, no gated facts or internal wording; ${vendorPages} page(s) name vendor certifications and carry the note once; no "enquir*", "licence" or "tripled" outside /news/<post>/; ${footnotePages} page(s) with footnotes in reading order; [PLAIN-LINE] on ${plainLinePages} page(s) with RC-02's numbers; [SESSION-AGENDA] beside the CTA on ${agendaPages} page(s); [POSITION] opens C6 on ${positionPages} page(s); three ranked pains (C2) with one C8 row each on ${painPages} page(s); trial relevance line under the trial headline on ${trialScopePages} page(s); number guard: ${guard.pages} evergreen page(s) scanned, ${guard.tokens} claim-marked figure(s) checked, ${guard.byRegister} allowed by the register, ${guard.byWhitelist} by the whitelist (${allowList.length} entries); report CTA ${reportWithheld ? 'withheld' : 'enabled'}` +
    (production ? `; production holds: ${holds.size} held fact(s), none rendered.` : '.'),
);
