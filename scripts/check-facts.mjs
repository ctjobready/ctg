// Fact status gate (D15), public-citation scan (D16) and map-equivalence check over the built site.
// Run after `npm run build`:  npm run check:facts   (uses Node's built-in TypeScript stripping to read src/data/facts.ts)
//   - a U fact may appear only under /news/
//   - an R fact may appear only under the path prefixes in its `allow` list (none = nowhere)
//   - every data-fact ID must exist in the dataset (removed/withheld facts are therefore unknown IDs)
//   - internal source codes (IR26/GD26/ID26/BIGD22) must not appear anywhere in rendered markup
//   - internal wording ("investor deck", "to verify", ...) is scanned in the rendered page, outside <script>/<style>; ordinary calls
//     to action such as "Request the investor deck" are allowed (ALLOWED below)
//   - WorldMap: every pin-tooltip detail must appear in the location table (equivalence contract)
//   - vendor certifications (Meta Blueprint / Google Ads, Adobe Certified Professional, QuickBooks Online ProAdvisor, PCEP, CWP;
//     messaging framework rule 13): a page whose visible text names one must also carry the non-affiliation note (CERT_NOTE_TEXT),
//     exactly once (inline, via <CertNote>; src/lib/postprocess.ts keeps the first copy on a finished page)
//   - archive-only wording: no British "enquir*" (D6; write "inquir*"), no British "licence" (write "license") and no "tripled" (OC-03 is a ratio of medians) anywhere in a
//     page's HTML (text, attributes, meta, JSON-LD), except on the archived posts under /news/<post>/ and on redirect stubs
//     (legacy URLs); negative self-tests below
//   - sentences: <Fact> ends every sentence with a period; the period it adds must never be doubled (no added period right after
//     a period, none left in front of punctuation the page typed)
//   - copy conventions (doc 06 global rules): no straight apostrophe inside a word and no bare "pp" before "percentage points" is spelled out,
//     outside the archived /news/ posts and the styleguide; negative self-tests below
//   - [PLAIN-LINE] (plan v1.10, v1.13): /impact/independent-evaluation/ (and, until WP42, the WSDFM case study, whose header led with it)
//     must carry "For every 100 women offered a place, about 10 more were in work at follow-up than among 100 comparable women in the control group (+10 percentage points)." rendered by
//     <PlainLine> carrying data-fact="RC-02"; its numbers are re-derived here from RC-02 (+10 pp, rounded 10; WP172: the published study's figure, where the 2022 report's was +10.3) and must match wherever the
//     sentence appears; negative self-tests below. WP35 (cycle-12 review): Home and /partner-with-us/development-partners/ no longer restate the trial in an evidence band, so they are not required
//     to carry the sentence; Home's plain-language reading lives on its hero's Randomized Trial proof card and is held to RC-02 and RC-07 there ([PROOF-CARD], below). WP42 (cycle-19 review): the WSDFM case study's hero no longer
//     prints the sentence (it repeated, in prose, the result its RC-02 tile shows beside it), so that one page is listed as exempt (PLAIN_LINE_EXEMPT_PAGES); the numbers of the sentence stay held on any page that carries it
//   - [SESSION-AGENDA] (plan v1.13): /partner-with-us/governments/, /development-partners/, /foundations/ and /programs/youthwide/ must show, inside the C13 CTA band (#cta; YouthWIDE: its "Choose Your
//     Entry Point" band, #entry-point), ONE paragraph in the plan's exact words for THAT page: the lead "What the discovery session covers:" (development partners; first item "your country, priority groups and
//     locations") or "What the briefing covers:" (governments: "your priority groups and locations"), then the three
//     items separated by semicolons and one final period, carrying data-fact="PD-02" like [PRICING] and FAQ Q8 (its "indicative budget"
//     claim, so the three stand on the same fact); WP34: Foundations has two funding routes, so its paragraph says what is discussed for each ("For a cohort grant, we discuss …
//     For a platform grant, we discuss …"), still one paragraph with the PD-02 marker; WP39 (cycle-16 review): YouthWIDE's two entry routes (the discovery session and the briefing) share ONE line,
//     "We discuss your priority groups, locations, tracks, indicative budget, scorecard and reporting plan.", still one paragraph with the PD-02 marker, in place of the two near-identical agendas; negative self-tests below
//   - [POSITION] opens C6 (plan v1.13, conversion-page rule 9; WP175, owner decision Q5 of 2026-11-28): on the pages that carry a positioning statement (POSITION_PAGES), the statement is the first
//     thing in the C6 band (#mechanism): only its eyebrow and H2 may come first (never a lead line, diagram or other text); it reads exactly as the statement declared for THAT page
//     (POSITION_WHOLE_STATEMENT: one crafted statement per page that carries the four CMF elements, for whom, the need, what CodersTrust does and how it differs, in the audience's own wording, not the
//     literal "For … who need …; unlike …, we …" template); and it is the page's only statement, printed once (one .pos__text, and its words nowhere else in the page's text). Until WP175 the pages
//     carried short site sentences (WP36 to WP155) or the audience sentence plus the verbatim [UNLIKE] closing; those wordings are refused by the self-tests. WP175-Z: Home and Investors (no statement
//     from WP166-A and WP39 until packages A and B gave them one) are [POSITION] pages like the other ten, so their statements are required; the NU Post Graduate Diploma carries none (S4-C2). The declared statements are distinct and share no sentence, and none uses the template's "For …" opening, "who need" or the retired [UNLIKE] sentence; negative self-tests below
//   - ranked pains and the C8 map (review round 14, M4; WP175-Z): Home, /partner-with-us/governments/, /development-partners/, /foundations/, /employers/, /local-partners/, /investors/,
//     /programs/youthwide/ and /programs/jobready-work/ state exactly three pains in the C2 band (#problem; list items data-pain="P1".."P3", in that order; Investors: the <article> pains of
//     its compressed C2–C3 band, #thesis) and give the C8 band (#features) exactly one card for each (<li data-relieves="P1">.. since WP38/WP39; a <tr> row is still read), in the same order;
//     rows without data-relieves are gain creators. WP175-Z: every one of them must carry the C8 band (the WP57 and WP166-A allowances for YouthWIDE and Home, PAIN_C8_OPTIONAL, are gone with
//     the bands' return); negative self-tests below
//   - trial relevance line (round 14, m2): /partner-with-us/employers/, /programs/jobready-work/ (JobReady@Work) and /programs/nu-postgraduate-diploma/ (the NU
//     Post Graduate Diploma) carry "This trial evaluated WSDFM training for women in Bangladesh, not <offering>." (WP172: it said "women in Dhaka") directly under the trial headline of
//     the C7 proof band, which all three must show (WP175-Z: the WP31 and WP34 allowances for a page with no proof band, TRIAL_SCOPE_OPTIONAL, are gone, because every C7 opens with the
//     trial again); negative self-tests below
//   - number guard (doc 10 §1 "Facts guard", WP1l): every claim-marked figure (%, pp, a leading + or ~, a trailing +, M/K/B/million, $ or BDT, ×,
//     "about/at least/up to/over N") in the copy of an evergreen page (visible text, title, meta description) is a value the public dataset
//     registers (facts, citations, the survey aggregates behind /impact/outcomes-2026/, one derivation list) or is whitelisted in
//     scripts/facts-guard-allow.json (page + exact text + reason; a stale entry fails). Not scanned: /news/<post>/ archive posts, redirect
//     stubs, /styleguide/ (a component sample page) and the 404. Details at "number guard" below; `FACTS_GUARD_LIST=1 npm run check:facts`
//     lists every figure the register allowed. Negative self-tests below.
//   - WP165 (owner request of 5 November 2026): the essay element (<div data-repost-body>) of a /blog/<post>/ page is Aziz Ahmad's text as published on
//     Substack, so that element alone is left out of the number guard, the archive-only wording and the copy conventions, as the archived /news/<post>/
//     posts are; the rest of the page and every other check are unchanged ("withoutRepostBody" below). Negative self-tests below.
//   - survey edition pin: the survey figures are those of ONE Impact Report edition (SURVEY_EDITION, Impact Report 261014B). The OC-* facts (text, stat value, numeric, before-training figure, label, detail and glance
//     lines) and every row of the published survey CSV (outcomes-data.ts: chart cells, headline rows, bases) must state that edition's figures and none of the previous edition's (261007A); a fact field,
//     a stat.numeric or a CSV row that disagrees fails as a "dataset:" problem naming it and the value it should have, and a survey fact or CSV row the pin does not list fails too. Negative self-tests below.
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
const { facts, sources, CERT_NOTE_TEXT, CERT_FACT_IDS } = await import(new URL('../src/data/facts.ts', import.meta.url).href);
// The published survey aggregates behind the /impact/outcomes-2026/ charts and CSV: a second public dataset the number guard reads (see below).
const { csvRows: outcomesCsvRows } = await import(new URL('../src/components/pages/impact/outcomes-data.ts', import.meta.url).href);
const { keepOneCertNote, dropDoubledStops, spaceInlineLinks, postprocessPage } = await import(new URL('../src/lib/postprocess.ts', import.meta.url).href);

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
// Internal wording that must not render on any page.
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
  // review round 14, m3: only conditional timing evidence supports it. Write "Most surveyed new earners had started earning by six months after finishing the course." (WP46: the owner's answer of 2026-10-15 counts the months from the end of the course; WP48, cycle-23 review: OC-05 is cumulative and includes those who first earned during the course, so "by ... after", never "within ... of finishing"), with the 58.7%, its base and the survey qualifier immediately below
  [/\bearning starts within months\b/i, '"Earning starts within months" (OC-05 is a share of surveyed new earners: write "Most surveyed new earners had started earning by six months after finishing the course.", with the 58.7%, its base and the survey qualifier below it)'],
];
// The investor CTA label and its mailto subject are allowed.
const ALLOWED = [/Investor(%20| )deck(%20| )request/gi];

const decode = (t) => t.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

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
  if (copies > 1) return [`prints the non-affiliation note ${copies} times (it belongs once per page, inline)`];
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

/* ---- WP165: the author's own text of a re-posted Blog essay ---- */
// A /blog/<post>/ re-post carries an essay by Aziz Ahmad as he published it on Substack (owner request of 5 November 2026: republished with his permission;
// its CodersTrust figures aligned with the register, his own wording otherwise kept), inside ONE element, <div … data-repost-body> (src/pages/blog/[slug].astro;
// an essay written for the site has no such element and is held to every rule). That element alone, and only on a /blog/<post>/ page, is
// left out of three wording rules: the number guard, the archive-only wording ("enquir*", "licence", "tripled") and the copy conventions (straight
// apostrophes, "pp") — the same three the archived /news/<post>/ posts are left out of, and for the same reason: they are dated texts in their author's
// words, not evergreen copy. Everything else on the page (the <title>, the meta description, the subtitle, the byline, the cards, the JSON-LD) is held to
// them, and every other check of this script (internal source codes and wording, data-fact status, the certification note) reads the whole page,
// essay included. The marker on any other page, or on the /blog/ index, exempts nothing. Negative self-tests below.
const REPOST_PAGE = /^\/blog\/[^/]+\/$/;
const REPOST_BODY_OPEN = /<div\b[^>]*\sdata-repost-body(?=[\s=/>])[^>]*>/;
function withoutRepostBody(path, html) {
  if (!REPOST_PAGE.test(path)) return html;
  const open = REPOST_BODY_OPEN.exec(html);
  if (!open) return html;
  // the element runs to its own closing tag: count nested <div>s
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = open.index;
  let depth = 0;
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(0, open.index) + html.slice(tag.lastIndex);
  }
  return html; // unbalanced markup: nothing is left out
}

function archiveWordingProblems(path, rawHtml) {
  if (exemptFromArchiveRule(path, rawHtml)) return [];
  const html = withoutRepostBody(path, rawHtml);
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
const visibleText = (markup) => decode(markup.replace(/<head\b[\s\S]*?<\/head>/i, '').replace(/<!--[\s\S]*?-->/g, ''));

/* ---- [PLAIN-LINE] (RC-02 in plain language, plan v1.10) ---- */
// "For every 100 women offered a place, about 10 more were in work at follow-up than among 100 comparable women in the control group (+10 percentage points)."
// (WP172, owner decision 2026-11-27: the published study's +10 pp; the 2022 report's +10.3 gave the same "about 10") is built in src/data/copy.ts from RC-02's stat; it is required on the independent-evaluation page (and was, until WP42, on the
// WSDFM case study, whose header led with the randomized trial's plain-language line, the program result second),
// WP35 (cycle-12 review: the trial was restated on every audience page): Home's evidence band and the Development Partners proof band that carried it are gone, and Home's reading moved to the hero card ([PROOF-CARD] below),
// and wherever it appears its numbers must be RC-02's: "+10.3 percentage points" is the stat value with "pp" spelled out, "about 10" its rounding.
// The expected sentence is derived here from the register on its own (not read from copy.ts), so a drift in either place fails the build.
// WP42 (cycle-19 review): the WSDFM case study's hero stated the trial result in prose (this sentence) and the program record in prose, directly above the tiles that show both, so its two paragraphs are gone: the tiles
// (the RC-02 tile, "+10.3 pp", tagged Randomized Trial; the PR-01 tile, tagged Program Record) carry the results and one line above them names the two kinds of evidence. That one page is exempt from REQUIRING the
// sentence (PLAIN_LINE_EXEMPT_PAGES, below); the exemption is not an exemption from the numbers: a page that carries the sentence, exempt or not, must carry RC-02's.
const PLAIN_LINE_PAGES = ['/impact/independent-evaluation/'];
const PLAIN_LINE_EXEMPT_PAGES = ['/impact/case-studies/wsdfm-women-freelancers/'];
const PLAIN_LINE_SHAPE = /For every 100 women offered a place, about (\d+) more were in work at follow-up than among 100 comparable women in the control group \(([^)]*)\)\./;
const plainLineWanted = (stat) => {
  const points = `${stat.prefix ?? ''}${stat.numeric.toFixed(stat.decimals ?? 0)} percentage points`;
  return { about: Math.round(stat.numeric), points, text: `For every 100 women offered a place, about ${Math.round(stat.numeric)} more were in work at follow-up than among 100 comparable women in the control group (${points}).` };
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
    // rendered by <PlainLine>, tagged data-fact="RC-02", as body text (a paragraph, not a stat tile)
    const block = /<p\b[^>]*\bdata-plain-line\b[^>]*>/.exec(markup);
    if (!block) out.push('[PLAIN-LINE] is not rendered by <PlainLine> (no <p data-plain-line>)');
    else if (!/\bdata-fact="RC-02"/.test(block[0])) out.push('[PLAIN-LINE] is not tagged data-fact="RC-02"');
  }
  return out;
}

/* ---- [PROOF-CARD]: the plain-language trial reading on Home's hero Randomized Trial proof card (WP35, cycle-12 review; its strip is headed "Proof at a Glance" since WP48) ---- */
// Home states the trial in the hero's Randomized Trial card and in the first carousel slide; its evidence band no longer restates it, so the [PLAIN-LINE] anchor for Home moved to the card (the gate keeps its
// strength: the card's numbers are held to the register, as the [PLAIN-LINE]'s are). The card (<li class="hh__card" data-fact="RC-02">) carries the eyebrow "Randomized Trial", RC-02's value ("+10.3") with the unit
// "percentage points", and the plain-language caption "For every 100 women offered a place in CodersTrust’s 200-hour WSDFM program, about 10 more were in work than among 100 comparable women in the control group." (WP109, Opus Low run 1: the Trial page's own wording; before it, "10.3 more ... than in the control group"). The caption's numbers
// are re-derived here from RC-02 (its rounded whole number, "about 10", as the [PLAIN-LINE] keeps it; the card's figure stays "+10.3") and RC-07 ("... was 200 hours"), independently of src/data/heroSlides.ts, so a drift in either place fails the build.
// WP166-A (marketing review R1-02, owner approval of 21 November 2026): the eyebrow is "Independent Randomized Trial", and the caption's second sentence states the nine-trial benchmark, "That is more than four times the
// 2.3-point average across nine vocational-training trials.", re-derived here from RC-06a's glance label (independently of src/data/heroSlides.ts) and carried by a span tagged data-fact="RC-06a" inside the caption.
const PROOF_CARD_PAGES = ['/'];
const proofCardBenchmark = (rc06aGlance) => {
  const avg = /more than four times the ([\d.]+-point average across nine vocational-training trials)$/.exec(rc06aGlance ?? '')?.[1];
  return avg ? `That is more than four times the ${avg}.` : '(RC-06a’s glance label no longer ends "more than four times the N-point average across nine vocational-training trials")';
};
const proofCardWanted = (stat, rc07Text, rc06aGlance = facts['RC-06a']?.stat?.glance?.label) => {
  const hours = /was (\d+) hours/.exec(rc07Text)?.[1];
  const figure = stat.numeric.toFixed(stat.decimals ?? 0);
  const value = `${stat.prefix ?? ''}${figure}`;
  return {
    eyebrow: 'Independent Randomized Trial',
    value,
    unit: 'percentage points',
    caption: `For every 100 women offered a place in CodersTrust’s ${hours}-hour WSDFM program, about ${Math.round(stat.numeric)} more were in work than among 100 comparable women in the control group. ${proofCardBenchmark(rc06aGlance)}`,
  };
};
/** Problems with the hero's trial card on one page: the card exists and its figure, unit and plain-language caption are RC-02's and RC-07's, with RC-06a's benchmark (tagged) as the caption's second sentence. */
function proofCardProblems(markup, stat, rc07Text) {
  const card = /<li\b[^>]*\bclass="hh__card"[^>]*\bdata-fact="RC-02"[^>]*>([\s\S]*?)<\/li>/.exec(markup);
  if (!card) return ['the hero\'s Randomized Trial card (<li class="hh__card" data-fact="RC-02">) is missing, so the plain-language trial reading has nowhere to sit'];
  const want = proofCardWanted(stat, rc07Text);
  const part = (cls, tag) => {
    const m = new RegExp(`<${tag}\\b[^>]*\\bclass="${cls}"[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(card[1]);
    return m ? decode(m[1]) : '';
  };
  const got = { eyebrow: part('hh__eyebrow', 'p'), value: part('hh__num', 'span'), unit: part('hh__unit', 'span'), caption: part('hh__figlabel', 'p') };
  const out = [];
  if (got.eyebrow !== want.eyebrow) out.push(`[PROOF-CARD] the eyebrow reads "${got.eyebrow}", expected "${want.eyebrow}"`);
  if (got.value !== want.value) out.push(`[PROOF-CARD] the figure reads "${got.value}" but RC-02 is "${want.value}"`);
  if (got.unit !== want.unit) out.push(`[PROOF-CARD] the unit reads "${got.unit}", expected "${want.unit}"`);
  if (got.caption !== want.caption) out.push(`[PROOF-CARD] the plain-language caption reads "${got.caption}", expected the register-derived "${want.caption}"`);
  else if (!/<p\b[^>]*\bclass="hh__figlabel"[^>]*>[\s\S]*?<span\b[^>]*\bdata-fact="RC-06a"[^>]*>[\s\S]*?<\/p>/.test(card[1])) out.push('[PROOF-CARD] the caption\'s benchmark sentence is not tagged data-fact="RC-06a" (a <span> inside the caption)');
  return out;
}

/* ---- [SESSION-AGENDA] (plan v1.12 round-11 enhancement) ---- */
// Beside the C13 primary CTA on the governments, development-partners and foundations pages, YouthWIDE (also its governments band): ONE paragraph, the
// lead, three items separated by semicolons and a single final period, tied to PD-02 (data-fact) like [PRICING] and FAQ Q8, whose "indicative
// budget" claim it repeats. The wording is verbatim from the plan (doc 06 [SESSION-AGENDA], v1.13) and is declared here independently of
// src/data/copy.ts, so a wording change has to be made in both places on purpose. Each page has its own exact sentence: the discovery-session
// pages open with "your country, priority groups and locations" (the international pages); the briefing pages open with "your priority groups and
// districts" (YouthWIDE in Bangladesh, the national initiative) or "your priority groups and locations" (governments: ministries in any country).
const SESSION_AGENDA_LEAD_DISCOVERY = 'What the discovery session covers:';
const SESSION_AGENDA_LEAD_BRIEFING = 'What the briefing covers:';
const SESSION_AGENDA_FIRST_DISCOVERY = 'your country, priority groups and locations';
const SESSION_AGENDA_FIRST_GOVERNMENTS = 'your priority groups and locations';
// WP32 (cycle-9 review): the third item says "the follow-up survey schedule", where the plan's v1.13 wording said "the tracer timeline" (jargon to a funder); the planning register needs the same change.
const SESSION_AGENDA_COMMON = ['employer demand and certification tracks', 'an indicative budget, the pilot scorecard and the follow-up survey schedule'];
const sessionAgendaWanted = (lead, first) => `${lead} ${[first, ...SESSION_AGENDA_COMMON].join('; ')}.`;
const SESSION_AGENDA_DISCOVERY = sessionAgendaWanted(SESSION_AGENDA_LEAD_DISCOVERY, SESSION_AGENDA_FIRST_DISCOVERY);
const SESSION_AGENDA_GOVERNMENTS = sessionAgendaWanted(SESSION_AGENDA_LEAD_BRIEFING, SESSION_AGENDA_FIRST_GOVERNMENTS);
// WP34 (cycle-11 review): Foundations offers a cohort grant and a platform grant, and the discovery-session agenda is a cohort agenda, so its paragraph says what is discussed for each route (declared here on its
// own, like the others; src/data/copy.ts SESSION_AGENDA_ROUTES builds it, so a wording change has to be made in both places on purpose).
const SESSION_AGENDA_FOUNDATIONS = 'For a cohort grant, we discuss your country, priority groups, tracks, budget and scorecard. For a platform grant, we discuss JobReady’s staged rollout.';
// WP39 (cycle-16 review): YouthWIDE's "Choose Your Entry Point" has two routes (a discovery session for funders, a briefing for governments) whose agendas were near-identical, so the band carries ONE line for both,
// in the #entry-point band (SESSION_AGENDA_BAND), not in a C13 CTA band (#cta). Declared here on its own, like the others (src/data/copy.ts SESSION_AGENDA_SHARED builds it).
const SESSION_AGENDA_YOUTHWIDE = 'We discuss your priority groups, locations, tracks, indicative budget, scorecard and reporting plan.';
/** page path -> the exact agenda sentence that page must carry */
const SESSION_AGENDA_BY_PAGE = {
  '/partner-with-us/development-partners/': SESSION_AGENDA_DISCOVERY,
  '/partner-with-us/foundations/': SESSION_AGENDA_FOUNDATIONS,
  '/programs/youthwide/': SESSION_AGENDA_YOUTHWIDE,
  '/partner-with-us/governments/': SESSION_AGENDA_GOVERNMENTS,
};
/**
 * The band an agenda sits in, where it is not the C13 CTA band (#cta). WP39: YouthWIDE's one line sits in its "Choose Your Entry Point" band, whose two route cards are <section>s nested in it, so that band is read
 * up to the next band (bandMarkup), not up to the first </section>. (WP4c/WP24c had two agendas there, one in #cta and one in #cta-governments; both are gone.)
 */
const SESSION_AGENDA_BAND = { '/programs/youthwide/': 'entry-point' };
const SESSION_AGENDA_PAGES = Object.keys(SESSION_AGENDA_BY_PAGE);
const SESSION_AGENDA_FACT = 'PD-02';
/** Problems with the agenda on one page: one paragraph inside the C13 band (#cta), in the plan's exact words for that page (`wanted`), with the PD-02 marker. */
function sessionAgendaProblems(markup, wanted, bandId = 'cta') {
  // the C13 CTA band is one <section> with no nested section; a band with nested sections (WP39: #entry-point) is read up to the next band
  const band = bandId === 'cta' ? new RegExp(`<section\\b[^>]*\\bid="${bandId}"[^>]*>[\\s\\S]*?<\\/section>`).exec(markup)?.[0] : bandMarkup(markup, bandId);
  if (!band) return [bandId === 'cta' ? 'the C13 call-to-action band (#cta) is missing, so the [SESSION-AGENDA] has no CTA to sit beside' : `the #${bandId} band is missing, so the [SESSION-AGENDA] has nowhere to sit`];
  const open = /<([a-z][a-z0-9]*)\b([^>]*)\bdata-session-agenda\b([^>]*)>/.exec(band);
  if (!open) return [bandId === 'cta' ? 'the [SESSION-AGENDA] (what the discovery session or briefing covers) is missing from the C13 band' : `the [SESSION-AGENDA] (what the first conversation covers) is missing from the #${bandId} band`];
  const out = [];
  const agendas = band.match(/\bdata-session-agenda\b/g).length;
  if (agendas !== 1) out.push(`[SESSION-AGENDA] must appear once in the #${bandId} band, found ${agendas}`);
  if (open[1] !== 'p') out.push(`[SESSION-AGENDA] must be one paragraph (<p>), not a <${open[1]}> (no heading, no list)`);
  const inner = /^<p\b[^>]*>([\s\S]*?)<\/p>/.exec(band.slice(open.index));
  if (inner) {
    if (/<(ul|ol|li|h[1-6])\b/.test(inner[1])) out.push('[SESSION-AGENDA] must be one line of text: no list items and no heading inside it');
    const text = decode(inner[1].replace(/<sup\b[\s\S]*?<\/sup>/g, ''));
    if (text !== wanted) out.push(`[SESSION-AGENDA] reads "${text}", expected "${wanted}"`);
  }
  const factAttr = /\bdata-fact="([^"]*)"/.exec(open[0])?.[1] ?? '';
  if (!factAttr.split(/\s+/).includes(SESSION_AGENDA_FACT)) out.push(`[SESSION-AGENDA] must carry data-fact="${SESSION_AGENDA_FACT}" like [PRICING] and FAQ Q8, so a change to ${SESSION_AGENDA_FACT} or a hold on it treats the agenda the same`);
  return out;
}

/* ---- [POSITION] opens C6 (plan v1.13: conversion-page rule 9, review round 12 Mi2; WP175: the crafted statements, owner decision Q5 of 2026-11-28) ---- */
// Every C6 band opens with the page's positioning statement. "Opens" means nothing precedes the statement in the band except its own eyebrow and H2 (the band's title): no lead line, no model heading as
// body text, no diagram, no list. WP175: each page carries its own crafted statement (the four CMF elements in the audience's words, doc 04 §1), declared here word for word and independently of
// src/data/copy.ts (POSITIONING), so a change has to be made twice on purpose; and the page carries it once.
const POSITION_PAGES = [
  '/',
  '/partner-with-us/governments/',
  '/partner-with-us/development-partners/',
  '/partner-with-us/foundations/',
  '/partner-with-us/universities/',
  '/partner-with-us/employers/',
  '/partner-with-us/local-partners/',
  '/partner-with-us/investors/',
  '/programs/youthwide/',
  '/programs/jobready-campus/',
  '/programs/jobready-work/',
  '/programs/superkids/',
];
// WP39 (cycle-16 review) and WP166-A (marketing review R1-03) took the statement off Investors and Home, which were exempt from [POSITION] (POSITION_EXEMPT_PAGES) and so were checked for nothing.
// WP175 (owner decision Q5 of 2026-11-28: Home and Investors get a statement too): package 0 listed both as pending (POSITION_PENDING_PAGES, held to the rules only once they showed one); packages A and B
// render them, so WP175-Z makes both [POSITION] pages: the statement is required on all twelve, and a page that shows none fails. The NU Post Graduate Diploma carries none (S4-C2) and is not listed.
// WP175: the statement of each page, whole. Each carries the four elements of the CMF positioning (for whom, the need, what CodersTrust does, how it differs) in wording crafted for its audience; the earlier
// forms (the audience sentence plus the shared [UNLIKE] closing, the employer closing of WP18b/WP20b, and the short site sentences declared whole from WP36 to WP155) are retired fixtures of the self-tests below.
// The rules the earlier reviews set still hold for the new words (tests/wp154.spec.ts, tests/wp155.spec.ts: a fact the band states in a card is not said again in the statement; WP141: no in-sentence scope clause).
const POSITION_WHOLE_STATEMENT = {
  '/': 'Funders and governments want young people in paid work, not only trained. CodersTrust takes each learner the whole way, from training and mentoring to placement support, with outcome evidence that includes an independent randomized trial of its own training.',
  '/partner-with-us/governments/': 'Your agency wants training budgets that end in jobs and earnings for young people. CodersTrust runs training, mentoring and placement support as one program, phase by phase, with monthly reports to your agency on progress toward paid work.',
  '/partner-with-us/development-partners/': 'Development partners want youth programs whose results hold up with their evaluators. CodersTrust carries each cohort from training through mentoring and placement support into paid work, in one program, with monthly reports on placements and first earnings.',
  '/partner-with-us/foundations/': 'Foundations and CSR teams want each grant to change what young people earn, with evidence that it did. A YouthWIDE cohort grant funds training, mentoring and placement support against a pilot scorecard agreed in advance; a JobReady platform grant funds CodersTrust’s digital learning and earning platform.',
  '/partner-with-us/universities/': 'Universities and colleges want degree holders who move into paid work, and placement results they can stand behind. JobReady@Campus runs in their own campus labs and adds certification exam preparation, mentoring and placement support to the degree, with monthly reports on each cohort.',
  '/partner-with-us/employers/': 'Employers want teams that can work with AI tools and candidates ready for open roles. CodersTrust builds training from a needs assessment of their own roles rather than a fixed catalog, with job-ready candidates introduced through its placement team.',
  '/partner-with-us/local-partners/': 'Your organization wants the young people it serves to reach paid work. Delivery is shared: you lead locally, and we bring the curriculum, facilitator training, mentoring, placement support and monthly reports.',
  '/partner-with-us/investors/': 'Impact investors look for platforms that can move young people in emerging markets into paid work. JobReady builds on CodersTrust’s training and mentoring programs, one of which was tested in an independent randomized trial.',
  '/programs/youthwide/': 'Funders and agencies want a program they can start in one country and grow on its results. YouthWIDE combines training, mentoring and placement support in one delivery model, with monthly reports to partners and an independent randomized trial of an earlier CodersTrust program behind it.',
  '/programs/jobready-campus/': 'Colleges and universities want their students to graduate with skills that employers recognize. JobReady@Campus runs certification exam preparation, mentoring and placement support in campus labs alongside academic studies, with monthly reports on progress toward paid work.',
  '/programs/jobready-work/': 'If your teams need AI and digital skills for their own roles, JobReady@Work builds the training around them, from needs assessment to workshops and progress evaluation, rather than offering a standard course.',
  '/programs/superkids/': 'Schools and education partners want young learners to discover what they can make with technology, and SuperKids@School brings block coding, robotics and digital art into their classrooms, with each program shaped around the school.',
};
/** The statements the pages carried before WP175 (and the [UNLIKE] closing they were built from): fixtures of the self-tests, so none can come back unnoticed. */
const RETIRED_UNLIKE_SENTENCE = 'We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work.';
// kept as [page, statement] pairs, not in the declaration's form, so the gate's source never reads as declaring a retired statement (tests/wp51.spec.ts, tests/wp60.spec.ts)
const RETIRED_POSITION_STATEMENTS = Object.fromEntries([
  ['/', 'CodersTrust connects training, mentoring and placement support for educated, unemployed and underemployed youth, with monthly reports on progress toward paid work.'],
  ['/partner-with-us/governments/', 'We combine training, mentoring and placement support. Your agency receives monthly reports on progress toward paid work.'],
  ['/partner-with-us/development-partners/', 'We combine training, mentoring and placement support. Partners receive monthly reports.'],
  ['/partner-with-us/foundations/', 'Fund a YouthWIDE cohort or JobReady’s platform infrastructure. For cohort grants, we agree a pilot scorecard and combine training, mentoring and placement support, with monthly progress reports.'],
  ['/partner-with-us/universities/', 'JobReady@Campus combines training, mentoring and placement support in campus labs. Your institution receives monthly reports on progress toward paid work.'],
  ['/partner-with-us/employers/', 'CodersTrust offers employer training built from a needs assessment, and job-ready digital talent through its placement team. Training is customized to your roles, and hiring starts from your talent request.'],
  ['/partner-with-us/local-partners/', 'Your organization mobilizes learners and hosts training. CodersTrust supports delivery, mentoring, placement and reporting.'],
  ['/partner-with-us/investors/', `For impact investors who need a platform that moves emerging-market youth into paid digital work, CodersTrust offers an integrated training-to-earnings model. ${RETIRED_UNLIKE_SENTENCE}`],
  ['/programs/youthwide/', 'YouthWIDE combines training, mentoring and placement support. Partners receive monthly reports on progress toward paid work.'],
  ['/programs/jobready-campus/', 'JobReady@Campus combines certification exam preparation, mentoring and placement support in campus labs alongside academic studies. Institutions receive monthly reports on progress toward paid work.'],
  ['/programs/jobready-work/', 'JobReady@Work builds training around your roles, from needs assessment to workshops and progress evaluation.'],
  ['/programs/superkids/', 'SuperKids offers block coding, robotics and digital art through schools and education partners.'],
]);
/** The sentences of a statement (a sentence ends at ". " before a capital letter, or at the end). */
const statementSentences = (t) => t.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
/**
 * Problems with the C6 band's opening: the statement exists, nothing but eyebrow and H2 precedes it, it reads exactly as the statement declared for the page (`whole`), and it is the page's only
 * statement (one .pos__text in the page) and its words are on the page once (`text`, the page's visible text; defaults to the markup's).
 */
function positionProblems(markup, { whole, text = visibleText(markup) } = {}) {
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
  const p = /<p\b[^>]*\bpos__text\b[^>]*>([\s\S]*?)<\/p>/.exec(pos[1]);
  const statement = p ? decode(p[1]) : '';
  if (!statement) out.push('the positioning statement has no text');
  else if (whole === undefined) out.push('no statement is declared for this page (POSITION_WHOLE_STATEMENT)');
  else if (statement !== whole) out.push(`the positioning statement reads "${statement}", expected the statement declared for this page: "${whole}"`);
  const blocks = (markup.match(/<p\b[^>]*\bpos__text\b/g) ?? []).length;
  if (blocks !== 1) out.push(`the page carries ${blocks} positioning statements (one, in C6)`);
  if (statement) {
    const times = text.split(statement).length - 1;
    if (times !== 1) out.push(`the statement's words are on the page ${times} times (once, in C6)`);
  }
  return out;
}

/* ---- ranked pains (C2b) and the C8 map (review round 14, M4; WP175-Z: the conversion pages that rank three pains) ---- */
// Home, /partner-with-us/local-partners/ and /programs/youthwide/ are built by hand, not from a band matrix, so the messaging framework's C2b and
// C8b rules are checked on the built pages: the C2 band (#problem) states exactly THREE ranked pains, each a list item with data-pain="P1", "P2",
// "P3" in that order, and the C8 band (#features) has exactly ONE card for each of them, in the same order, as <li data-relieves="P1"> (pain →
// how we relieve it → the registered feature behind it; WP38/WP39: three short cards, components/sections/IncludesBand.astro). An item without data-relieves is a gain creator and is not counted. Only the two bands
// are read: the same attributes elsewhere on the page count for nothing. The wording lives in src/data/copy.ts (FUNDER_PAINS, LOCAL_PARTNER_PAINS).
// WP175-Z (owner decisions of 2026-11-28: C8 relieves each C2 pain 1:1, in rank order, on every conversion page): the pages that tag their three ranked pains (data-pain) and their relieving cards
// (data-relieves) are read too: Governments, Development Partners, Foundations, Employers, Investors and JobReady@Work. Universities, JobReady@Campus and the NU Post Graduate Diploma count statistic tiles as
// pains (Q4 (b)) and SuperKids ranks none (Q9 (a)), so they are not listed.
const PAIN_PAGES = [
  '/',
  '/partner-with-us/governments/',
  '/partner-with-us/development-partners/',
  '/partner-with-us/foundations/',
  '/partner-with-us/employers/',
  '/partner-with-us/local-partners/',
  '/partner-with-us/investors/',
  '/programs/youthwide/',
  '/programs/jobready-work/',
];
// WP57 and WP166-A had let YouthWIDE and Home carry no C8 band (PAIN_C8_OPTIONAL); WP175 brought both bands back, so every page above must carry one (WP175-Z).
// Where a page states its pains, if not as list items in #problem: Investors' compressed C2–C3 band is #thesis and its three pains are <article> cards. Only that page is read this way, so every other page is
// held to the <li> pains of #problem exactly as before.
const PAIN_C2_AT = { '/partner-with-us/investors/': { band: 'thesis', element: 'article' } };
const PAIN_IDS = ['P1', 'P2', 'P3'];
/** The markup of the band whose <section> has this id, up to the next band (a <section class="band …">; a section nested in the band, such as a route card, is not one). */
function bandMarkup(markup, id) {
  const open = new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`).exec(markup);
  if (!open) return null;
  const rest = markup.slice(open.index + open[0].length);
  const next = /<section\b[^>]*\bclass="band\b/.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}
function painMapProblems(markup, { band = 'problem', element = 'li' } = {}) {
  const c2 = bandMarkup(markup, band);
  const c8 = bandMarkup(markup, 'features');
  const out = [];
  if (c2 === null) out.push(`the C2 band (#${band}) is missing, so the ranked pains have nowhere to sit`);
  if (c8 === null) out.push('the C8 band (#features) is missing, so the pains have no relieving rows');
  if (c2 === null || c8 === null) return out;
  const pains = [...c2.matchAll(new RegExp(`<${element}\\b[^>]*\\bdata-pain="([^"]*)"`, 'g'))].map((m) => m[1]);
  if (pains.join(' ') !== PAIN_IDS.join(' ')) out.push(`C2 must state exactly three ranked pains, P1, P2 and P3 in that order (data-pain), found [${pains.join(' ') || 'none'}]`);
  // WP18b: the C8 rows were concern-led cards (<li>); WP38/WP39: three short cards (<li>). A table row (<tr>) is still read
  const rows = [...c8.matchAll(/<(?:tr|li)\b[^>]*\bdata-relieves="([^"]*)"/g)].map((m) => m[1]);
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
// "This trial evaluated WSDFM training for women in Bangladesh, not <the offering>." (WP172: the published study's sample is 84% from Dhaka, so it no longer says "women in Dhaka"). The sentences are declared here on their own (src/data/copy.ts
// builds them from TRIAL_SCOPE), so a change has to be made in both places on purpose. Both employer pages sell JobReady@Work.
const TRIAL_SCOPE_BY_PAGE = {
  '/partner-with-us/employers/': 'This trial evaluated WSDFM training for women in Bangladesh, not JobReady@Work.',
  '/programs/jobready-work/': 'This trial evaluated WSDFM training for women in Bangladesh, not JobReady@Work.',
  '/programs/nu-postgraduate-diploma/': 'This trial evaluated WSDFM training for women in Bangladesh, not the NU Post Graduate Diploma.',
};
const TRIAL_SCOPE_PAGES = Object.keys(TRIAL_SCOPE_BY_PAGE);
// WP31 and WP34 let the two employer pages and the NU Post Graduate Diploma show no trial band (TRIAL_SCOPE_OPTIONAL). WP175 (owner decision Q3 (a) of 2026-11-28): every C7 opens with the trial again, and
// all three show the proof band with the line, so WP175-Z makes the band required on all three.
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

/* ---- page-markup checks (shared by the self-test and the built-site scan): sentences and inline links ---- */
const GLUED_LINK = /([\p{L}\p{N}.,;:!?%)”’'"])(<a class="link[ "])/u;
const DOUBLED_STOP = /<span class="fact__stop">\.<\/span>[”’"]*<\/(?:span|p|strong|b|div)>\s?[.,;:)!?—–]/;
const STOP_AFTER_STOP = /[.!?…][”’"')]*<span class="fact__stop">/;
function markupProblems(markup) {
  const out = [];
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

/** The register of number values: every marked number in the public dataset's wording and citations, plus the derivations below. */
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
    for (const s of [f.text, f.headline, f.stat?.value, f.stat?.label, f.stat?.from, f.stat?.detail]) add(s, f.id);
  }
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
    // [PLAIN-LINE] (src/data/copy.ts, re-derived in plainLineWanted below): "about 10 more were in work" is RC-02's stat rounded to a whole number (WP172: +10 pp, the published study's; it was the 2022 report's +10.3)
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
  // WP165: a re-posted Blog essay's own text is the author's (withoutRepostBody, above); the rest of its page is guarded
  const markup = withoutRepostBody(path, html).replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
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

/* ---- survey edition pin: the public survey dataset states the figures of ONE Impact Report edition ---- */
/**
 * Every survey figure on the site (the OC-* facts, and the aggregates behind /impact/outcomes-2026/ and its CSV in outcomes-data.ts) comes from one edition of the Impact Report.
 * SURVEY_EDITION names it. SURVEY_FACTS and SURVEY_CSV_ROWS state what that edition prints (shares to one decimal, as the report prints them; dollars at the UN operational rate of BDT 122.465),
 * and surveyEditionProblems() holds the dataset to them, so a figure left behind from the previous edition fails the build, naming the fact (or CSV row) and the value it should have.
 * A new edition changes this block, src/data/facts.ts and outcomes-data.ts together. The self-tests below run the same function on fixtures built from these tables.
 */
const SURVEY_EDITION = 'Impact Report 261014B';
const SURVEY_PREVIOUS_EDITION = 'Impact Report 261007A';
// What each OC fact states in that edition. `want`: the figures each field of the fact must carry (a field is a path into the fact: text, stat.value, stat.from, stat.label, stat.detail,
// stat.glance.label, stat.glance.note); `numeric`: stat.numeric; `stale`: the previous edition's figures, which no field of the fact may still carry (a figure that did not change is not listed).
const SURVEY_FACTS = {
  'OC-01': { want: { text: ['48.0%', '78.2%', '+30.2 percentage-point'], 'stat.value': ['78.2%'], 'stat.from': ['48.0%'], 'stat.label': ['48.0%'], 'stat.detail': ['5.7%'], 'stat.glance.note': ['48.0%'] }, numeric: 78.2, stale: ['47.4%', '77.9%', '30.5', '5.9%'] },
  'OC-02': { want: { text: ['70.8%', '34 of 48'], 'stat.value': ['70.8%'], 'stat.label': ['34 of 48'] }, numeric: 70.8, stale: ['72.3%', '34 of 47'] },
  'OC-03': { want: { text: ['$98', '$245', '(2.5×)'], 'stat.value': ['$245'], 'stat.from': ['$98'], 'stat.label': ['$98'], 'stat.glance.note': ['$98'] }, numeric: 245, stale: ['$82', 'about 3×'] },
  'OC-03b': { want: { text: ['72.0%', '22.0%', '5.9%'], 'stat.value': ['72.0%'] }, numeric: 72, stale: ['72.2%', '5.8%'] },
  'OC-03c': { want: { text: ['+$82'], 'stat.value': ['+$82'] }, numeric: 82, stale: [] },
  'OC-04': { want: { text: ['39.0%', '54.4%', '6.0%', '13.6%', '(2.3×)', '3.0%', '10.3%', '(3.4×)'], 'stat.value': ['13.6%'], 'stat.from': ['6.0%'], 'stat.label': ['6.0%'], 'stat.glance.label': ['6.0%'], 'stat.glance.note': ['3.0%', '10.3%'] }, numeric: 13.6, stale: ['38.3%', '53.3%', '6.2%', '14.0%', '2.8%', '10.6%', '3.8×'] },
  // WP168-B (marketing review R4-18, owner approval of 24 November 2026): OC-05's glance tile splits its label and note, so the 23.3% is held in the note.
  'OC-05': { want: { text: ['172', '23.3%', '58.7%', '77.3%', '90.7%'], 'stat.value': ['58.7%'], 'stat.label': ['172'], 'stat.glance.label': ['172'], 'stat.glance.note': ['23.3%'] }, numeric: 58.7, stale: ['170', '23.5%', '58.8%', '77.1%', '90.6%'] },
  'OC-06': { want: { text: ['92.6%', '87.0%', '71.1%'], 'stat.value': ['92.6%'] }, numeric: 92.6, stale: ['92.7%', '86.9%', '71.6%'] },
  'OC-07': { want: { text: ['About 12%', '78.0%'], 'stat.value': ['About 12%'] }, numeric: 12, stale: [] },
  'OC-08': { want: { text: ['58.9%', '36.9%'], 'stat.value': ['58.9%'] }, numeric: 58.9, stale: ['59.5%', '37.4%'] },
  'OC-09': { want: { text: ['85.0%', '68.2%', '19.6%', '63.0%', '58 of 64 districts', '15.6%'], 'stat.value': ['85.0%'] }, numeric: 85, stale: ['84.6%', '68.7%', '19.9%', '62.9%', '16.0%'] },
};
// What the published CSV (csvRows() of outcomes-data.ts) holds in that edition: [measure_id, category, value_type, value, base_n], every row, in the order of the file. The bases are the report's
// own: 331 paired completers (employment, career outcomes), 286 paired income answers, 172 completers who first earned during or after training, 48 completers with no prior income, of whom 34 were earning.
// Districts under 3.0% are combined into Other Districts (Narayanganj, 2.9%, is no longer listed).
const surveyCsv = (id, type, base, cells) => cells.map(([category, value]) => [id, category, type, value, base]);
const SURVEY_CSV_ROWS = [
  ...surveyCsv('OC-01', 'percent', '331', [['Before Training', '48.0'], ['At the October 2026 survey', '78.2']]),
  ...surveyCsv('OC-01', 'percent', '', [['Share of those employed before training', '5.7']]),
  ...surveyCsv('OC-02', 'percent', '48', [['Earning', '70.8'], ['Not Earning', '29.2']]),
  ...surveyCsv('OC-03', 'median_usd', '286', [['Before Training', '98'], ['At the October 2026 survey', '245']]),
  ...surveyCsv('OC-03b', 'percent', '286', [['Increased', '72.0'], ['Unchanged', '22.0'], ['Decreased', '5.9']]),
  ...surveyCsv('OC-03c', 'median_usd', '286', [['Median change', '82']]),
  ...surveyCsv('OC-04', 'percent', '331', [['Salaried Employment, before training', '39.0'], ['Salaried Employment, at the October 2026 survey', '54.4'], ['Freelancing, before training', '6.0'], ['Freelancing, at the October 2026 survey', '13.6'], ['Business Ownership, before training', '3.0'], ['Business Ownership, at the October 2026 survey', '10.3']]),
  ...surveyCsv('OC-05', 'percent', '172', [['During the Course', '23.3'], ['By 3 Months', '38.4'], ['By 6 Months', '58.7'], ['By 12 Months', '77.3'], ['By 2 Years', '90.7']]),
  ...surveyCsv('OC-06-recommend', 'percent', '', [['0', '5.3'], ['1', '1.8'], ['2', '0.7'], ['3', '1.8'], ['4', '2.8'], ['5', '11.3'], ['6', '5.3'], ['7', '9.5'], ['8', '13.0'], ['9', '5.6'], ['10', '43.0']]),
  ...surveyCsv('OC-08', 'percent', '331', [['Freelancing or Remote Job', '18.4'], ['New Job', '11.5'], ['Started a Business', '6.9'], ['Better Position', '6.3'], ['Higher Education', '8.2'], ['Promotion', '4.2'], ['Salary Increase', '3.3'], ['Other or No Change', '41.1']]),
  ...surveyCsv('OC-07', 'percent', '', [['Job in Bangladesh', '49.1'], ['Own Business', '11.3'], ['Freelancing in Bangladesh', '6.1'], ['Freelancing for Foreign Clients', '6.9'], ['Job Abroad', '4.6'], ['Other', '16.8'], ['No Current Income', '5.2']]),
  ...surveyCsv('OC-09-age', 'percent', '', [['15–24', '14.8'], ['25–35', '53.4'], ['36–45', '23.7'], ['46 and Over', '8.0']]),
  ...surveyCsv('OC-09-education', 'percent', '', [['Higher Secondary Certificate (HSC) or Below', '10.7'], ['Diploma', '4.3'], ['Bachelor’s Degree', '34.2'], ['Master’s Degree or Higher', '50.8']]),
  ...surveyCsv('OC-09-district', 'percent', '', [['Dhaka', '37.0'], ['Chattogram', '8.4'], ['Barishal', '5.6'], ['Comilla', '3.1'], ['Other Districts', '45.9']]),
  ...surveyCsv('OC-01', 'percentage_points', '331', [['October 2026 survey vs. before training', '30.2']]),
  ...surveyCsv('OC-03', 'percent_change', '', [['October 2026 survey vs. before training', '150']]),
  ...surveyCsv('OC-06-summary', 'percent', '', [['Rate instructors good or better', '92.6'], ['Rate their overall experience good or better', '87.0'], ['Recommendation score of 7 or more out of 10', '71.1']]),
  ...surveyCsv('OC-07-summary', 'percent', '', [['Freelancing for foreign clients or a job abroad', '11.6'], ['Work as the main income source', '78.0']]),
  ...surveyCsv('OC-08-summary', 'percent', '331', [['Report a specific career or education outcome', '58.9'], ['Gained a new income source', '36.9']]),
  ...surveyCsv('OC-09-profile', 'percent', '', [['Hold a bachelor’s degree or higher', '85.0'], ['Aged 15–35', '68.2'], ['Women', '19.6'], ['Live outside Dhaka', '63.0'], ['Rural', '15.6']]),
];
const SURVEY_FIELDS = ['text', 'headline', 'stat.value', 'stat.from', 'stat.label', 'stat.detail', 'stat.glance.label', 'stat.glance.note'];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A pinned figure on its own, never the end or the start of a longer number ("5.9%" is not in "15.9%", "170" is not in "1,170"). */
const surveyFigure = (fig) => new RegExp(`(?<![\\d.,])${escapeRe(fig)}(?!\\d)`);
const surveyField = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
/**
 * The public survey dataset against the edition's pin: `factsById` is the register, `rows` the published CSV rows (csvRows()). Returns the problems, one per fact field, stale-figure
 * group, stat.numeric or CSV row that disagrees. `pins` is the pin the self-tests may replace.
 */
function surveyEditionProblems(factsById, rows, pins = { facts: SURVEY_FACTS, rows: SURVEY_CSV_ROWS }) {
  const out = [];
  const rowKey = (id, category) => `${id} / ${category}`;
  const describe = (r) => `${r.type} ${r.value}${r.base ? ` (n = ${r.base})` : ' (no base)'}`;
  // the pin itself: a CSV row listed twice would hide a mismatch behind its twin
  const pinnedRows = new Map();
  for (const [id, category, type, value, base] of pins.rows) {
    if (pinnedRows.has(rowKey(id, category))) out.push(`dataset: the ${SURVEY_EDITION} pin lists the CSV row ${rowKey(id, category)} twice`);
    pinnedRows.set(rowKey(id, category), { type, value, base });
  }
  // the facts: every survey fact is pinned, and each pinned fact states the edition's figures and none of the previous edition's
  for (const id of Object.keys(factsById)) if (/^OC-/.test(id) && !pins.facts[id]) out.push(`dataset: survey fact ${id} is not in the ${SURVEY_EDITION} pin (list the figures that edition prints for it)`);
  for (const [id, pin] of Object.entries(pins.facts)) {
    const f = factsById[id];
    if (!f) { out.push(`dataset: ${id} is missing from the register, but ${SURVEY_EDITION} prints its survey figure`); continue; }
    for (const [path, figures] of Object.entries(pin.want)) {
      const s = surveyField(f, path);
      const missing = figures.filter((fig) => typeof s !== 'string' || !surveyFigure(fig).test(s));
      if (missing.length) out.push(`dataset: ${id} ${path} should state ${missing.map((m) => `"${m}"`).join(', ')} (${SURVEY_EDITION}); ${typeof s === 'string' ? `it reads "${s}"` : 'the field is missing'}`);
    }
    if (pin.numeric !== undefined && f.stat?.numeric !== pin.numeric) out.push(`dataset: ${id} stat.numeric should be ${pin.numeric} (${SURVEY_EDITION}), got ${f.stat?.numeric}`);
    const stale = [];
    for (const fig of pin.stale ?? []) for (const path of SURVEY_FIELDS) {
      const s = surveyField(f, path);
      if (typeof s === 'string' && surveyFigure(fig).test(s)) stale.push(`"${fig}" in ${path}`);
    }
    if (stale.length) out.push(`dataset: ${id} still carries ${stale.join(', ')} from the previous edition (${SURVEY_PREVIOUS_EDITION}); ${SURVEY_EDITION} prints the figures of the pin`);
  }
  // the published CSV: every row of the edition is there with its value and base, and no other row is
  const seen = new Map();
  for (const r of rows) {
    if (seen.has(rowKey(r[0], r[2]))) out.push(`dataset: the survey CSV has two rows for ${rowKey(r[0], r[2])}`);
    seen.set(rowKey(r[0], r[2]), r);
  }
  for (const [key, want] of pinnedRows) {
    const r = seen.get(key);
    if (!r) { out.push(`dataset: the survey CSV has no row ${key}, which ${SURVEY_EDITION} prints (${describe(want)})`); continue; }
    const got = { type: r[3], value: r[4], base: r[5] };
    if (got.type !== want.type || got.value !== want.value || got.base !== want.base) out.push(`dataset: survey CSV row ${key} should be ${describe(want)} (${SURVEY_EDITION}), got ${describe(got)}`);
  }
  for (const [key, r] of seen) if (!pinnedRows.has(key)) out.push(`dataset: the survey CSV carries a row ${key} (${r[3]} ${r[4]}) that ${SURVEY_EDITION} does not print${r[0] === 'OC-09-district' ? '; a district under 3.0% is combined into Other Districts' : ''}`);
  return out;
}

/* ---- self-test: the post-processing on fixtures, then the checks above on its result (and on a broken page) ---- */
{
  // a page that prints the non-affiliation note twice keeps only the first copy (postprocess.keepOneCertNote)
  const certTwice = `<p data-cert-note class="certnote">${CERT_NOTE_TEXT}</p><p>between</p><span class="certnote" data-cert-note>${CERT_NOTE_TEXT}</span>`;
  const certOnce = keepOneCertNote(certTwice);
  if (certOnce.split(CERT_NOTE_TEXT).length - 1 !== 1 || !certOnce.includes('between')) problems.push('self-test: keepOneCertNote did not keep exactly the first note');
  if (keepOneCertNote(certOnce) !== certOnce) problems.push('self-test: keepOneCertNote is not idempotent');
  const glued = '<p>independent evaluation welcome.<a class="link" href="/x/">How partnerships work</a> (<a class="link" href="/y/">y</a>)</p><script>var s=\'a.<a class="link">\'</script>';
  const spaced = spaceInlineLinks(glued);
  if (!spaced.includes('welcome. <a class="link"')) problems.push('self-test: spaceInlineLinks did not restore the space');
  if (spaced.includes('( <a') || !spaced.includes("var s='a.<a class=\"link\">'")) problems.push('self-test: spaceInlineLinks touched an opening bracket or script text');
  if (postprocessPage(postprocessPage(glued)) !== postprocessPage(glued)) problems.push('self-test: postprocessPage is not idempotent');
  // the period <Fact> adds to a sentence: kept at the end of a sentence, dropped where the page types its own punctuation
  const stopFix = dropDoubledStops(
    '<p><span class="fact" data-fact="A">text<span class="fact__stop">.</span></span>. Next</p>' +
      '<p><span class="fact" data-fact="B">cap<span class="fact__stop">.</span></span> More.</p>' +
      '<p><span class="fact" data-fact="C">“q<span class="fact__stop">.</span>”</span>, said</p>' +
      '<li><span class="fact" data-fact="D">item<span class="fact__stop">.</span></span></li>',
  );
  if (stopFix.includes('text<span class="fact__stop">') || stopFix.includes('“q<span class="fact__stop">')) problems.push('self-test: dropDoubledStops left a period in front of punctuation the page typed');
  if (!stopFix.includes('cap<span class="fact__stop">.</span></span> More.') || !stopFix.includes('item<span class="fact__stop">.</span></span></li>')) problems.push('self-test: dropDoubledStops removed the period at the end of a sentence');
  if (!DOUBLED_STOP.test('<span class="fact__stop">.</span></span>.') || DOUBLED_STOP.test(stopFix)) problems.push('self-test: the doubled-punctuation check does not recognise its fixtures');
  // the certification gate itself: a page naming a vendor needs the note
  if (!namesVendorCert('Certifications by track: Meta Blueprint / Google Ads (digital marketing), CWP (web)') || namesVendorCert('QuickBooks and Xero experience; Media Buying (Meta, Google Ads, YouTube)')) problems.push('self-test: the vendor-certification patterns misclassify their examples');
  // the note is required once: a page that names a vendor without it, or prints it twice (inline, or twice in the built page), fails; once passes
  const certPage = 'Certifications by track: Meta Blueprint / Google Ads (digital marketing), CWP (web).';
  if (certNoteProblems(`${certPage} ${CERT_NOTE_TEXT}`).length) problems.push('self-test: the certification check rejected a page that carries the note once');
  if (!certNoteProblems(certPage).length) problems.push('self-test: the certification check accepted a page that names a vendor without the note');
  if (!certNoteProblems(`${certPage} ${CERT_NOTE_TEXT} Notes: ${CERT_NOTE_TEXT}`).length) problems.push('self-test: the certification check accepted a page that prints the note twice');
  if (certNoteProblems('A page that names no vendor and carries no note.').length) problems.push('self-test: the certification check rejected a page without vendor names');
  // archive-only wording ("enquir*", "tripled"): fails in text, attributes, meta and JSON-LD of any page except /news/<post>/ and redirect stubs
  const brit = (where) => archiveWordingProblems(where, '<!doctype html><html lang="en"><head><title>x</title></head><body><main><p>Enquiry routes</p></main></body></html>');
  if (!brit('/contact/').length) problems.push('self-test: the wording gate accepted "Enquiry" in the text of /contact/');
  if (!archiveWordingProblems('/about/recognition/', '<body><a aria-label="Media enquiries" href="/x/">m</a></body>').length) problems.push('self-test: the wording gate accepted "enquiries" in an attribute');
  if (!archiveWordingProblems('/partner-with-us/investors/', '<head><meta name="description" content="Make an ENQUIRY."></head>').length) problems.push('self-test: the wording gate accepted "ENQUIRY" in a meta description (case-insensitive)');
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
  // WP165: only the essay element of a /blog/<post>/ page is the author's own text; the rest of that page, the /blog/ index and any other page carrying the marker are held to the rule
  const repostDoc = (outside = '') => `<!doctype html><html lang="en"><head><title>x</title><meta name="description" content="An essay${outside}"></head><body><main><h1>Essay</h1><div class="prose" data-repost-body=""><p>Income roughly tripled.</p><div><p>Send an enquiry.</p></div><p>Our licence.</p></div><p>Originally published on Substack${outside}.</p></main></body></html>`;
  if (archiveWordingProblems('/blog/an-essay/', repostDoc()).length) problems.push('self-test: the wording gate flagged the author’s own text inside the essay element of a /blog/<post>/ page');
  if (archiveWordingProblems('/blog/an-essay/', repostDoc(' (income tripled)')).length !== 1) problems.push('self-test: the wording gate exempted "tripled" outside the essay element of a /blog/<post>/ page (title, meta and the rest of the page are held to it)');
  if (!archiveWordingProblems('/blog/', repostDoc()).length) problems.push('self-test: the wording gate exempted the /blog/ index (only the essay element of /blog/<post>/ is the author’s text)');
  if (!archiveWordingProblems('/our-model/', repostDoc()).length) problems.push('self-test: the wording gate exempted the essay marker on a page that is not a /blog/<post>/ page');
  if (!archiveWordingProblems('/blog/an-essay/', repostDoc().replace('<p>Originally published', '<p>A licence, outside the essay. Originally published')).length) problems.push('self-test: the wording gate stopped at a nested </div> inside the essay element (text after the essay must still be read)');
  if (!archiveWordingProblems('/blog/an-essay/', repostDoc().replace('data-repost-body=""', 'data-repost-body-note=""')).length) problems.push('self-test: the wording gate exempted an element whose attribute only starts with data-repost-body');
  // [PLAIN-LINE]: required on the independent-evaluation page, numbers derived from RC-02 wherever it appears, rendered by <PlainLine> with RC-02's footnote marker (WP42: the exemption is one page, the WSDFM case study, and not also a required page)
  if (PLAIN_LINE_PAGES.length !== 1 || PLAIN_LINE_PAGES[0] !== '/impact/independent-evaluation/') problems.push('self-test: the [PLAIN-LINE] is required on exactly /impact/independent-evaluation/ (WP42)');
  if (PLAIN_LINE_EXEMPT_PAGES.length !== 1 || PLAIN_LINE_EXEMPT_PAGES[0] !== '/impact/case-studies/wsdfm-women-freelancers/') problems.push('self-test: the [PLAIN-LINE] exemption is exactly /impact/case-studies/wsdfm-women-freelancers/ (WP42) and no other page');
  for (const exempt of PLAIN_LINE_EXEMPT_PAGES) if (PLAIN_LINE_PAGES.includes(exempt)) problems.push(`self-test: ${exempt} is exempt from the [PLAIN-LINE] but also listed as a page that must carry it`);
  const rc02 = facts['RC-02'].stat;
  const want = plainLineWanted(rc02);
  const plainBlock = (sentence) => `<p class="plainline" data-plain-line data-fact="RC-02" data-astro-cid-x>${sentence}</p>`;
  const plainPage = (sentence, block = plainBlock(sentence)) => ({ markup: `<main><h2>x</h2>${block}</main>`, text: decode(`<main><h2>x</h2>${block}</main>`) });
  const plainOk = plainPage(want.text);
  if (plainLineProblems(plainOk.markup, plainOk.text, rc02, true).length) problems.push(`self-test: the [PLAIN-LINE] check rejected the register-derived sentence: ${plainLineProblems(plainOk.markup, plainOk.text, rc02, true).join('; ')}`);
  if (want.text !== 'For every 100 women offered a place, about 10 more were in work at follow-up than among 100 comparable women in the control group (+10 percentage points).') problems.push(`self-test: RC-02 no longer yields the plan's [PLAIN-LINE] sentence (derived: "${want.text}"); the plan wording needs a decision`);
  const plainBad = (why, sentence, ...rest) => {
    const pg = plainPage(sentence, ...rest);
    if (!plainLineProblems(pg.markup, pg.text, rc02, true).length) problems.push(`self-test: the [PLAIN-LINE] check accepted ${why}`);
  };
  plainBad('a page without the sentence', 'Women offered a place did better.');
  plainBad('"+11 percentage points" (a number that differs from RC-02)', want.text.replace('(+10 ', '(+11 '));
  plainBad('"about 11 more" (RC-02 rounds to 10)', want.text.replace('about 10', 'about 11'));
  plainBad('"(+10 pp)" instead of "percentage points"', want.text.replace('percentage points', 'pp'));
  plainBad('a sentence typed by hand with no <PlainLine> block', want.text, `<p>${want.text}</p>`);
  plainBad('the sentence without its data-fact (RC-02)', want.text, `<p class="plainline" data-plain-line>${want.text}</p>`);
  if (plainLineProblems(plainOk.markup, plainOk.text, { ...rc02, numeric: 10.6 }, true).length !== 2) problems.push('self-test: the [PLAIN-LINE] check did not notice that RC-02 changed (10.6 would give "about 11" and "+11 percentage points")');
  const stray = plainPage(want.text.replace('(+10 ', '(+11 '));
  if (!plainLineProblems(stray.markup, stray.text, rc02, false).length) problems.push('self-test: a page that does not need the [PLAIN-LINE] but carries it with a wrong number was accepted');
  if (plainLineProblems('<main><p>No plain line here.</p></main>', 'No plain line here.', rc02, false).length) problems.push('self-test: a page that does not need the [PLAIN-LINE] was flagged for lacking it');
  // [PROOF-CARD]: Home's hero trial card carries RC-02's figure and the plain-language caption derived from RC-02 and RC-07 (WP35)
  const rc07 = facts['RC-07'].text;
  const cardWant = proofCardWanted(rc02, rc07);
  if (cardWant.caption !== 'For every 100 women offered a place in CodersTrust’s 200-hour WSDFM program, about 10 more were in work than among 100 comparable women in the control group. That is more than four times the 2.3-point average across nine vocational-training trials.') problems.push(`self-test: RC-02, RC-07 and RC-06a no longer yield the hero card caption (derived: "${cardWant.caption}"); the card wording needs a decision`);
  // WP166-A: the caption's second sentence (the RC-06a benchmark) sits in its own tagged span, as HomeHero renders it
  const benchmarkAt = cardWant.caption.indexOf(' That is ');
  const taggedCaption = `${cardWant.caption.slice(0, benchmarkAt)} <span data-fact="RC-06a">${cardWant.caption.slice(benchmarkAt + 1)}</span>`;
  const heroCard = ({ eyebrow = cardWant.eyebrow, value = cardWant.value, unit = cardWant.unit, caption = taggedCaption, fact = 'RC-02' } = {}) =>
    `<main><ul class="hh__cards" role="list"><li class="hh__card" data-fact="${fact}" data-astro-cid-x><p class="hh__eyebrow" data-astro-cid-x>${eyebrow}</p><div class="hh__fig"><p class="hh__figvalue"><span class="hh__num">${value}</span> <span class="hh__unit">${unit}</span></p><p class="hh__figlabel">${caption}</p></div></li><li class="hh__card" data-fact="OC-01"><p class="hh__eyebrow">Impact Survey 2026</p></li></ul></main>`;
  if (proofCardProblems(heroCard(), rc02, rc07).length) problems.push(`self-test: the [PROOF-CARD] check rejected the register-derived card: ${proofCardProblems(heroCard(), rc02, rc07).join('; ')}`);
  const cardBad = (why, markup, stat = rc02) => {
    if (!proofCardProblems(markup, stat, rc07).length) problems.push(`self-test: the [PROOF-CARD] check accepted ${why}`);
  };
  cardBad('a page with no hero trial card', '<main><p>For every 100 women offered a place, about 10 more were in work.</p></main>');
  cardBad('a card for another fact (the survey card is not the trial card)', heroCard({ fact: 'OC-01' }));
  cardBad('"+11" (a figure that differs from RC-02)', heroCard({ value: '+11' }));
  cardBad('"pp" instead of "percentage points"', heroCard({ unit: 'pp' }));
  cardBad('"about 11 more" (RC-02 rounds to 10)', heroCard({ caption: cardWant.caption.replace('about 10 more', 'about 11 more') }));
  cardBad('"10.3 more ... than in the control group" (the card reads the Trial page’s rounded wording since WP109)', heroCard({ caption: cardWant.caption.replace('about 10 more were in work than among 100 comparable women in the control group', '10.3 more were in work than in the control group') }));
  cardBad('"100-hour" (RC-07 says 200 hours)', heroCard({ caption: cardWant.caption.replace('200-hour', '100-hour') }));
  cardBad('a caption without the WSDFM-program scope', heroCard({ caption: 'For every 100 women offered a place, 10.3 more were in work than in the control group.' }));
  cardBad('a changed eyebrow', heroCard({ eyebrow: 'Independent Evaluation' }));
  cardBad('the WP166 eyebrow without "Independent"', heroCard({ eyebrow: 'Randomized Trial' }));
  cardBad('a caption without the nine-trial benchmark (RC-06a)', heroCard({ caption: cardWant.caption.slice(0, benchmarkAt) }));
  cardBad('the benchmark sentence without its RC-06a tag', heroCard({ caption: cardWant.caption }));
  cardBad('a benchmark that is not RC-06a’s ("three times")', heroCard({ caption: taggedCaption.replace('four times', 'three times') }));
  if (proofCardProblems(heroCard(), { ...rc02, numeric: 10.6, value: '+10.6 pp' }, rc07).length !== 2) problems.push('self-test: the [PROOF-CARD] check did not notice that RC-02 changed (10.6 would give "+11" and "about 11 more")');
  // copy conventions: curly apostrophes, "pp" spelled out before it is used
  if (conventionProblems('CodersTrust’s WSDFM training; +10.3 pp percentage points more employment; In percentage points, employment rose +10.3 pp.').length) problems.push('self-test: the copy-convention check rejected correct copy');
  if (!conventionProblems('CodersTrust\'s WSDFM training raised women’s income.').length) problems.push('self-test: the copy-convention check accepted a straight apostrophe');
  if (!conventionProblems('Won\'t AI eliminate these jobs?').length) problems.push('self-test: the copy-convention check accepted "Won\'t"');
  if (!conventionProblems('Employment among surveyed completers +30.5 pp View chart data').length) problems.push('self-test: the copy-convention check accepted a bare "pp" that is never spelled out');
  if (!conventionProblems('+30.5 pp ... much later text ................................................... percentage points').length) problems.push('self-test: the copy-convention check accepted "percentage points" far after the first "pp"');
  if (conventionProblems('He said \'hello\' and the 8pp-wide column; opposite; apple').length) problems.push('self-test: the copy-convention check flagged quotes or words that merely contain "pp"');
  // [SESSION-AGENDA]: beside the C13 CTA as ONE paragraph (lead, items joined with " · ", one final period), tied to PD-02, in the plan's words
  const agendaP = (text, { tag = 'p', fact = 'PD-02', attrs = '' } = {}) => `<${tag} class="agenda" data-session-agenda${fact ? ` data-fact="${fact}"` : ''}${attrs} data-astro-cid-x><span class="agenda__lead">${text.split(': ')[0]}:</span> ${text.split(': ').slice(1).join(': ')}</${tag}>`;
  const ctaBand = (inner) => `<main><section class="band band--airy" id="cta" aria-labelledby="cta-h"><div class="container"><div class="cta-band"><h2 id="cta-h">Let’s</h2><a href="/x/">Book</a><ul><li>A discovery session is a conversation, not a commitment.</li></ul>${inner}</div></div></section></main>`;
  const agendaWant = SESSION_AGENDA_DISCOVERY;
  const agendaWantG = SESSION_AGENDA_GOVERNMENTS;
  const agendaWantF = SESSION_AGENDA_FOUNDATIONS;
  const agendaWantY = SESSION_AGENDA_YOUTHWIDE;
  if (agendaWant !== 'What the discovery session covers: your country, priority groups and locations; employer demand and certification tracks; an indicative budget, the pilot scorecard and the follow-up survey schedule.') problems.push('self-test: the discovery agenda is no longer the plan wording');
  if (agendaWantG !== 'What the briefing covers: your priority groups and locations; employer demand and certification tracks; an indicative budget, the pilot scorecard and the follow-up survey schedule.') problems.push('self-test: the governments briefing agenda is no longer the plan wording');
  if (agendaWantF !== 'For a cohort grant, we discuss your country, priority groups, tracks, budget and scorecard. For a platform grant, we discuss JobReady’s staged rollout.') problems.push('self-test: the Foundations two-route agenda is no longer the WP34 wording');
  if (agendaWantY !== 'We discuss your priority groups, locations, tracks, indicative budget, scorecard and reporting plan.') problems.push('self-test: the YouthWIDE shared agenda is no longer the WP39 wording');
  // WP34: Foundations says what is discussed for each funding route, with the route as the bold lead-in of each sentence; still one paragraph with the PD-02 marker
  const agendaRoutesP = `<p class="agenda" data-session-agenda data-fact="PD-02" data-astro-cid-x><span class="agenda__lead">For a cohort grant,</span> we discuss your country, priority groups, tracks, budget and scorecard. <span class="agenda__lead">For a platform grant,</span> we discuss JobReady’s staged rollout.</p>`;
  if (sessionAgendaProblems(ctaBand(agendaRoutesP), agendaWantF).length) problems.push(`self-test: the [SESSION-AGENDA] check rejected a correct Foundations agenda: ${sessionAgendaProblems(ctaBand(agendaRoutesP), agendaWantF).join('; ')}`);
  for (const [why, text] of [['discovery lead', agendaWant], ['governments briefing lead', agendaWantG]]) {
    const ok = ctaBand(agendaP(text));
    if (sessionAgendaProblems(ok, text).length) problems.push(`self-test: the [SESSION-AGENDA] check rejected a correct agenda (${why}): ${sessionAgendaProblems(ok, text).join('; ')}`);
  }
  // per page: every configured page maps to the discovery or the briefing sentence, and the two pages groups really differ
  const byPage = (p) => SESSION_AGENDA_BY_PAGE[p];
  if (byPage('/partner-with-us/development-partners/') !== agendaWant) problems.push('self-test: /partner-with-us/development-partners/ must carry the discovery agenda ("your country, priority groups and locations")');
  if (byPage('/programs/youthwide/') !== agendaWantY) problems.push('self-test: /programs/youthwide/ must carry the one shared line for both entry routes ("We discuss your priority groups, locations, tracks, …")');
  if (SESSION_AGENDA_BAND['/programs/youthwide/'] !== 'entry-point') problems.push('self-test: the YouthWIDE agenda must be read in the #entry-point band, whose route cards are nested sections');
  if (byPage('/partner-with-us/foundations/') !== agendaWantF) problems.push('self-test: /partner-with-us/foundations/ must carry the two-route agenda ("For a cohort grant, … For a platform grant, …")');
  if (byPage('/partner-with-us/governments/') !== agendaWantG) problems.push('self-test: /partner-with-us/governments/ must carry the governments briefing agenda ("your priority groups and locations")');
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
  agendaBad('the cohort-only discovery agenda on Foundations (two funding routes)', ctaBand(agendaP(agendaWant)), agendaWantF);
  agendaBad('a Foundations agenda that names only the cohort grant', ctaBand(agendaRoutesP.replace(/ <span[\s\S]*<\/span> we discuss JobReady’s staged rollout\./, '')), agendaWantF);
  agendaBad('a Foundations agenda without the PD-02 marker', ctaBand(agendaRoutesP.replace(' data-fact="PD-02"', '')), agendaWantF);
  agendaBad('a changed item', ctaBand(agendaP(agendaWant.replace('employer demand and certification tracks', 'employer demand'))));
  agendaBad('items joined with middle dots instead of semicolons', ctaBand(agendaP(agendaWant.replaceAll('; ', ' · '))));
  agendaBad('items joined with commas instead of semicolons', ctaBand(agendaP(agendaWant.replaceAll('; ', ', '))));
  agendaBad('a missing final period', ctaBand(agendaP(agendaWant.slice(0, -1))));
  agendaBad('an agenda without the PD-02 marker', ctaBand(agendaP(agendaWant, { fact: '' })));
  agendaBad('an agenda tied to the wrong fact', ctaBand(agendaP(agendaWant, { fact: 'PD-04' })));
  // the first item is per page: the briefing wording on a discovery page and the other way round both fail
  agendaBad('"districts" in the first item on a discovery-session page', ctaBand(agendaP(agendaWant.replace('your country, priority groups and locations', 'your priority groups and districts'))));
  agendaBad('"districts" on the governments page', ctaBand(agendaP(agendaWantG.replace('your priority groups and locations', 'your priority groups and districts'))), agendaWantG);
  agendaBad('the discovery agenda on the governments page', ctaBand(agendaP(agendaWant)), agendaWantG);
  agendaBad('the discovery lead over the briefing items on the governments page', ctaBand(agendaP(agendaWantG.replace('What the briefing covers:', 'What the discovery session covers:'))), agendaWantG);
  // WP39: YouthWIDE's one shared line is read in the #entry-point band, whose two route cards are <section>s nested in it
  const sharedP = (text = agendaWantY, { tag = 'p', fact = 'PD-02' } = {}) => `<${tag} class="agenda" data-session-agenda${fact ? ` data-fact="${fact}"` : ''} data-astro-cid-x>${text}</${tag}>`;
  const entryBand = (inner, inCard = '') => `<main><section class="band band--airy" id="entry-point" aria-labelledby="entry-point-h"><div class="container"><h2 id="entry-point-h">Choose Your Entry Point</h2><div class="entry"><section id="cta" class="entry__card"><h3>Funders</h3><a href="/x/">Book</a>${inCard}</section><section id="cta-governments" class="entry__card"><h3>Governments</h3><p>Public procurement follows the agency’s own timeline.</p></section></div>${inner}</div></section><section class="band" id="next-steps"><p>Next band</p></section></main>`;
  if (sessionAgendaProblems(entryBand(sharedP()), agendaWantY, 'entry-point').length) problems.push(`self-test: the [SESSION-AGENDA] check rejected the correct YouthWIDE line: ${sessionAgendaProblems(entryBand(sharedP()), agendaWantY, 'entry-point').join('; ')}`);
  const sharedBad = (why, markup) => {
    if (!sessionAgendaProblems(markup, agendaWantY, 'entry-point').length) problems.push(`self-test: the [SESSION-AGENDA] check accepted ${why} (YouthWIDE)`);
  };
  sharedBad('an entry-point band with no agenda', entryBand(''));
  sharedBad('a page with no entry-point band', '<main><p>nothing</p></main>');
  sharedBad('an agenda after the entry-point band', entryBand('') + sharedP());
  sharedBad('the old funders agenda in the first route card instead of the shared line', entryBand('', agendaP(agendaWant)));
  sharedBad('the shared line and a second agenda in a route card (two agendas)', entryBand(sharedP(), agendaP(agendaWant)));
  sharedBad('the shared line twice', entryBand(sharedP() + sharedP()));
  sharedBad('the shared line set as a heading', entryBand(sharedP(agendaWantY, { tag: 'h3' })));
  sharedBad('the shared line without the PD-02 marker', entryBand(sharedP(agendaWantY, { fact: '' })));
  sharedBad('a changed item in the shared line', entryBand(sharedP(agendaWantY.replace('scorecard', 'plan'))));
  sharedBad('the shared line without its final period', entryBand(sharedP(agendaWantY.slice(0, -1))));
  sharedBad('the shared line wrapping a list', entryBand(`<p class="agenda" data-session-agenda data-fact="PD-02">We discuss <ul><li>your priority groups</li></ul></p>`));
  if (!sessionAgendaProblems(ctaBand(agendaP(agendaWant)), agendaWantY).length) problems.push('self-test: the [SESSION-AGENDA] check accepted the discovery agenda where YouthWIDE\'s shared line is wanted');

  // [POSITION] opens C6 (WP175): the page's declared statement, first in the band (after, at most, its eyebrow and H2), exactly its words, the page's only statement and said once
  const posBlock = (text) => `<div class="pos" data-reveal data-fact="PD-01" data-astro-cid-x><p class="pos__label">Our Approach</p><p class="pos__text">${text}</p></div>`;
  const headerHtml = '<header class="sh sh--start"><p class="eyebrow">How it works</p><h2 class="sh__title" id="mechanism-h">A title</h2>';
  const mech = (inner, after = '') => `<main><section class="band" id="mechanism" aria-labelledby="mechanism-h"><div class="container">${inner}</div></section><section class="band" id="proof"><p>Next band</p>${after}</section></main>`;
  const posOk = (why, markup, opts) => {
    const r = positionProblems(markup, opts);
    if (r.length) problems.push(`self-test: the [POSITION] check rejected ${why}: ${r.join('; ')}`);
  };
  const posBad = (why, markup, opts) => {
    if (!positionProblems(markup, opts).length) problems.push(`self-test: the [POSITION] check accepted ${why}`);
  };
  const declared = Object.entries(POSITION_WHOLE_STATEMENT);
  // the declarations: exactly the [POSITION] pages, each with a crafted statement (not the template), distinct, sharing no sentence
  if (Object.keys(POSITION_WHOLE_STATEMENT).sort().join(' ') !== [...POSITION_PAGES].sort().join(' ')) problems.push('self-test: POSITION_WHOLE_STATEMENT declares a statement for exactly the [POSITION] pages (WP175)');
  // WP175-Z: the twelve conversion pages that carry a statement, Home and Investors included (no pending page is left); the NU Post Graduate Diploma carries none (S4-C2)
  if (POSITION_PAGES.length !== 12 || new Set(POSITION_PAGES).size !== 12) problems.push(`self-test: ${POSITION_PAGES.length} [POSITION] pages; the twelve conversion pages that carry a statement are expected`);
  for (const required of ['/', '/partner-with-us/investors/']) if (!POSITION_PAGES.includes(required)) problems.push(`self-test: ${required} must be a [POSITION] page (WP175-Z: its statement is required, not pending)`);
  if (POSITION_PAGES.includes('/programs/nu-postgraduate-diploma/')) problems.push('self-test: the NU Post Graduate Diploma carries no positioning statement until National University signs off (S4-C2), so it is not a [POSITION] page');
  const sentenceOwner = new Map();
  for (const [page, statement] of declared) {
    if (/^For /.test(statement)) problems.push(`self-test: the ${page} statement opens with the template's "For …" (WP175: crafted wording, not the literal template)`);
    if (/\bwho need\b/.test(statement)) problems.push(`self-test: the ${page} statement uses the template's "who need" (WP175)`);
    if (statement.includes(RETIRED_UNLIKE_SENTENCE) || /Unlike approaches|provision varies/.test(statement)) problems.push(`self-test: the ${page} statement carries the retired [UNLIKE] closing (WP31, WP175)`);
    if (/agreed in (?:the|each) program(?:’s)? scope/.test(statement)) problems.push(`self-test: the ${page} statement carries the scope clause (WP141: stated once per page, not in the statement)`);
    if (/\d/.test(statement)) problems.push(`self-test: the ${page} statement carries a figure`);
    if (statement === RETIRED_POSITION_STATEMENTS[page]) problems.push(`self-test: the ${page} statement is its retired pre-WP175 wording`);
    const parts = statementSentences(statement);
    if (parts.length < 1 || parts.length > 2) problems.push(`self-test: the ${page} statement has ${parts.length} sentences (one or two)`);
    for (const sentence of parts) {
      if (sentence.split(/\s+/).length > 50) problems.push(`self-test: a sentence of the ${page} statement runs past 50 words (review round 11, F26)`);
      if (sentenceOwner.has(sentence)) problems.push(`self-test: "${sentence}" is in the statements of both ${sentenceOwner.get(sentence)} and ${page} (WP175: no sentence repeated page to page)`);
      sentenceOwner.set(sentence, page);
    }
  }
  if (new Set(declared.map(([, t]) => t)).size !== declared.length) problems.push('self-test: two pages declare the same positioning statement');
  // the check itself, on each declared statement and against the other pages' statements and the retired wordings
  for (const [page, own] of declared) {
    posOk(`the declared statement on its own page (${page})`, mech(`${headerHtml}${posBlock(own)}</header><div class="diagram"><svg></svg></div>`), { whole: own });
    posOk(`the declared statement before the header, nothing preceding it (${page})`, mech(`${posBlock(own)}${headerHtml}</header>`), { whole: own });
    posOk(`a lead line that follows the statement (${page})`, mech(`${headerHtml}${posBlock(own)}<p class="sh__lead lead">A lead.</p></header>`), { whole: own });
    posBad(`the retired pre-WP175 statement on ${page}`, mech(`${headerHtml}${posBlock(RETIRED_POSITION_STATEMENTS[page])}</header>`), { whole: own });
    posBad(`a reworded statement on ${page}`, mech(`${headerHtml}${posBlock(own.replace(/\w+(?=\W*$)/, 'changed'))}</header>`), { whole: own });
    posBad(`the statement with the retired [UNLIKE] closing after it on ${page}`, mech(`${headerHtml}${posBlock(`${own} ${RETIRED_UNLIKE_SENTENCE}`)}</header>`), { whole: own });
    posBad(`the statement with the scope clause put back on ${page} (WP141)`, mech(`${headerHtml}${posBlock(`${own.slice(0, -1)}, as agreed in the program scope.`)}</header>`), { whole: own });
    posBad(`only the first sentence of the statement on ${page}`, mech(`${headerHtml}${posBlock(statementSentences(own)[0])}</header>`), { whole: statementSentences(own).length > 1 ? own : `${own} More.` });
    posBad(`a lead line before the statement on ${page}`, mech(`${headerHtml}<p class="sh__lead lead">A lead line.</p>${posBlock(own)}</header>`), { whole: own });
    posBad(`the statement twice on ${page} (a second .pos block)`, mech(`${headerHtml}${posBlock(own)}</header>`, posBlock(own)), { whole: own });
    posBad(`a second statement block, in other words, on ${page}`, mech(`${headerHtml}${posBlock(own)}</header>`, posBlock('Another statement.')), { whole: own });
    posBad(`the statement's words repeated in another band of ${page}`, mech(`${headerHtml}${posBlock(own)}</header>`, `<p>${own}</p>`), { whole: own });
    posBad(`a statement where none is declared (${page} without its declaration)`, mech(`${headerHtml}${posBlock(own)}</header>`), {});
    for (const [other, theirs] of declared) if (other !== page) posBad(`the ${other} statement on ${page} (each page carries only its own)`, mech(`${headerHtml}${posBlock(theirs)}</header>`), { whole: own });
  }
  const anyOwn = POSITION_WHOLE_STATEMENT['/programs/youthwide/'];
  posBad('a model block before the statement', mech(`<div class="diagram"><svg></svg></div>${posBlock(anyOwn)}`), { whole: anyOwn });
  posBad('a paragraph before the statement', mech(`<p>The model: learn, earn, prosper.</p>${posBlock(anyOwn)}`), { whole: anyOwn });
  posBad('a list before the statement', mech(`<ul><li>01 Who we reach</li></ul>${posBlock(anyOwn)}`), { whole: anyOwn });
  posBad('a band with no statement', mech(`${headerHtml}</header><p>Just text.</p>`), { whole: anyOwn });
  posBad('a page with no C6 band', '<main><p>nothing</p></main>', { whole: anyOwn });
  posBad('a statement that is not in the #mechanism band', `<main><section class="band" id="mechanism"><p>x</p></section>${posBlock(anyOwn)}</main>`, { whole: anyOwn });
  posBad('a statement with no text', mech(`${headerHtml}${posBlock('')}</header>`), { whole: anyOwn });
  // WP175-Z: Home and Investors are held like every [POSITION] page: a band with no statement fails (it was counted as pending), and so does another page's statement
  const withoutPos = mech(`${headerHtml}</header><p>No statement yet.</p>`);
  for (const page of ['/', '/partner-with-us/investors/']) {
    posBad(`${page} with no statement in its C6 band (no longer pending)`, withoutPos, { whole: POSITION_WHOLE_STATEMENT[page] });
    posBad(`${page} with no C6 band at all`, '<main><p>nothing</p></main>', { whole: POSITION_WHOLE_STATEMENT[page] });
  }
  posBad('Home showing the YouthWIDE statement', mech(`${headerHtml}${posBlock(anyOwn)}</header>`), { whole: POSITION_WHOLE_STATEMENT['/'] });
  // the earlier template forms are refused on every page: the audience sentence with the [UNLIKE] closing, and the employer closing of WP18b/WP20b
  const posFor = 'For governments who need youth in paid digital work, CodersTrust offers an integrated training-to-earnings model.';
  posBad('the retired audience-sentence-plus-[UNLIKE] statement', mech(`${headerHtml}${posBlock(`${posFor} ${RETIRED_UNLIKE_SENTENCE}`)}</header>`), { whole: POSITION_WHOLE_STATEMENT['/partner-with-us/governments/'] });
  posBad('the retired employer closing', mech(`${headerHtml}${posBlock(`${posFor} Training is customized to your roles, and hiring starts from your talent request.`)}</header>`), { whole: POSITION_WHOLE_STATEMENT['/partner-with-us/employers/'] });

  // ranked pains and the C8 map (M4): exactly P1, P2, P3 in C2, exactly one C8 row for each, in order; only the two bands are read
  const painLi = (id) => `<li data-pain="${id}" data-astro-cid-x><span class="gp__n">1</span><div><p class="gp__q">A pain</p><p class="gp__a">Its words.</p></div></li>`;
  const painTr = (id) => `<tr data-relieves="${id}" data-fact="PD-15"><th scope="row">A feature</th><td>Which means</td><td>Outcome</td><td>Relieves</td></tr>`;
  // WP38/WP39: the C8 band is three short cards (IncludesBand: <li class="card inc__card" data-relieves="P1" data-fact="…">), not a table
  const painCard = (id) => `<li class="card inc__card" data-relieves="${id}" data-fact="PD-15" data-reveal data-astro-cid-x><div class="card__body"><h3 class="card__title">A card</h3><p class="card__text">Its sentence.</p></div></li>`;
  const painPage = ({ pains = PAIN_IDS, rows = PAIN_IDS, c2 = true, c8 = true, cards = false } = {}) =>
    '<main>' +
    (c2 ? `<section class="band band--white band--pad-md" id="problem" aria-labelledby="problem-h"><div class="container"><header class="sh"><h2 id="problem-h">Problem</h2><div class="gp"><ol class="gp__pains">${pains.map(painLi).join('')}</ol></div></header></div></section>` : '') +
    (c8
      ? cards
        ? `<section class="band band--white band--pad-md" id="features" aria-labelledby="features-h"><div class="container"><header class="sh"><h2 id="features-h">What You Get</h2></header><ul class="grid-cards inc" role="list">${rows.map(painCard).join('')}</ul></div></section>`
        : `<section class="band band--white band--pad-md" id="features" aria-labelledby="features-h"><div class="container"><header class="sh"><h2 id="features-h">Features</h2></header><section class="ft" aria-label="Features and benefits"><table><tbody>${rows.map(painTr).join('')}<tr><th scope="row">A gain creator</th><td>Which means</td><td>Outcome</td><td>—</td></tr></tbody></table></section></div></section>`
      : '') +
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
  painOk('three pains with one C8 card each (IncludesBand, WP38/WP39)', painPage({ cards: true }));
  painBad('a pain with no C8 card (P2 missing)', painPage({ cards: true, rows: ['P1', 'P3'] }));
  painBad('two C8 cards for one pain (P1 twice)', painPage({ cards: true, rows: ['P1', 'P1', 'P2', 'P3'] }));
  painBad('C8 cards that do not follow the ranking', painPage({ cards: true, rows: ['P3', 'P1', 'P2'] }));
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
  // WP175-Z: no page may carry its pains without the C8 band any more (the YouthWIDE and Home allowances are gone): their pages with only the C2 band fail
  painBad('YouthWIDE or Home with its three pains and no C8 band (the WP57 and WP166-A allowances are gone)', painPage({ c8: false, cards: true }));
  // the list: the nine conversion pages that tag three ranked pains, each read with its C8 band
  const PAIN_PAGES_WANT = ['/', '/partner-with-us/governments/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/', '/partner-with-us/employers/', '/partner-with-us/local-partners/', '/partner-with-us/investors/', '/programs/youthwide/', '/programs/jobready-work/'];
  if (PAIN_PAGES.join(' ') !== PAIN_PAGES_WANT.join(' ')) problems.push(`self-test: the ranked-pain pages are exactly ${PAIN_PAGES_WANT.join(', ')} (WP175-Z)`);
  for (const p of Object.keys(PAIN_C2_AT)) if (!PAIN_PAGES.includes(p)) problems.push(`self-test: ${p} has its own C2 reading (PAIN_C2_AT) but is not a ranked-pain page`);
  if (Object.keys(PAIN_C2_AT).join(' ') !== '/partner-with-us/investors/') problems.push('self-test: only Investors reads its pains outside the <li> items of #problem (its <article> cards in #thesis)');
  // Investors' reading: three <article> pains in the compressed #thesis band; it is held to every rule of the others, and the other pages are not read this way
  const investorsPage = ({ pains = PAIN_IDS, element = 'article', band = 'thesis' } = {}) =>
    painPage({ c2: false, cards: true }).replace(
      '<main>',
      `<main><section class="band band--deep-ink" id="${band}" aria-labelledby="${band}-h"><div class="container"><h2 id="${band}-h">Thesis</h2><div class="grid-cards">${pains.map((id) => `<${element} class="card factcard" data-pain="${id}" data-astro-cid-x><h3>A pain</h3><p>Its words.</p></${element}>`).join('')}</div></div></section>`,
    );
  const invOk = (why, markup) => {
    const r = painMapProblems(markup, PAIN_C2_AT['/partner-with-us/investors/']);
    if (r.length) problems.push(`self-test: the pain-map check rejected ${why}: ${r.join('; ')}`);
  };
  const invBad = (why, markup) => {
    if (!painMapProblems(markup, PAIN_C2_AT['/partner-with-us/investors/']).length) problems.push(`self-test: the pain-map check accepted ${why} (Investors)`);
  };
  invOk('three <article> pains in #thesis and one C8 card each', investorsPage());
  invBad('two <article> pains in #thesis', investorsPage({ pains: ['P1', 'P2'] }));
  invBad('<article> pains out of rank order', investorsPage({ pains: ['P2', 'P1', 'P3'] }));
  invBad('the pains as <li> items in #thesis (not the cards the page states them in)', investorsPage({ element: 'li' }));
  invBad('the pains in a #problem band (Investors has no #problem band)', investorsPage({ band: 'problem' }));
  invBad('a C8 card missing (P3)', investorsPage().replace(/<li class="card inc__card" data-relieves="P3"[\s\S]*?<\/li>/, ''));
  invBad('no C8 band', investorsPage().replace(/<section class="band band--white band--pad-md" id="features"[\s\S]*?<\/section>/, ''));
  painBad('<article> pains in #problem on a page read for <li> pains (the Investors reading is that page’s alone)', investorsPage({ band: 'problem' }));
  // the trial relevance line (m2): directly under the trial headline, in the plan's words for the page's own offering
  const scopeWork = TRIAL_SCOPE_BY_PAGE['/programs/jobready-work/'];
  const scopeNu = TRIAL_SCOPE_BY_PAGE['/programs/nu-postgraduate-diploma/'];
  if (scopeWork !== 'This trial evaluated WSDFM training for women in Bangladesh, not JobReady@Work.' || scopeNu !== 'This trial evaluated WSDFM training for women in Bangladesh, not the NU Post Graduate Diploma.') problems.push('self-test: the trial relevance lines are no longer the plan wording');
  const proofPage = (headInner, after = '') => `<main><section class="band band--klein band--pad-md" id="proof-band" aria-labelledby="proof-band-h"><div class="container"><header class="proofband__head" data-reveal data-fact="RC-01"><p class="eyebrow">The evidence</p>${headInner}</header><div class="proofband"><div class="proofband__stats"></div></div>${after}</div></section></main>`;
  const trialH2 = '<h2 class="proofband__title" id="proof-band-h">A randomized trial found…</h2>';
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
  trialBad('a reworded line', proofPage(`${trialH2}${trialLine('This trial evaluated training for women in Bangladesh, not JobReady@Work.')}`), scopeWork);
  trialBad('a line without the trial’s scope', proofPage(`${trialH2}${trialLine('This trial did not evaluate JobReady@Work.')}`), scopeWork);
  trialBad('a line above the headline', proofPage(`${trialLine(scopeWork)}${trialH2}`), scopeWork);
  trialBad('a line outside the header (after the stats, away from the proof)', proofPage(trialH2, trialLine(scopeWork)), scopeWork);
  trialBad('a page with no proof band', '<main><p>nothing</p></main>', scopeWork);
  // WP175-Z: the WP31 and WP34 allowances are gone: an employer page or the NU diploma page that links to the evidence pages instead of showing the proof band fails
  const evidenceLinksOnly = '<main><nav aria-label="Broader Evidence from Our Youth Programs"><a href="/impact/independent-evaluation/">The Randomized Trial</a><a href="/impact/outcomes-2026/">Impact Survey 2026</a></nav></main>';
  trialBad('an employer page with only the two evidence links and no proof band (the WP31 allowance is gone)', evidenceLinksOnly, scopeWork);
  trialBad('the NU diploma page with only a link strip and no proof band (the WP34 allowance is gone)', evidenceLinksOnly, scopeNu);
  // the line follows the one-line trial lead under the headline (WP175): a band led by it is read like any other
  trialOk('the line under the trial lead, below the headline (WP175)', proofPage(`${trialH2}<p class="lead" data-fact="RC-01 RC-02">A randomized trial found…</p>${trialLine(scopeWork)}`), scopeWork);
  // retired wording: the USP heading "Earning starts within months" overgeneralizes OC-05 (round 14, m3)
  const disciplineHits = (text) => DISCIPLINE.filter(([re]) => re.test(text)).length;
  if (!disciplineHits('<h3>Earning starts within months</h3>')) problems.push('self-test: the wording gate accepted the retired USP heading "Earning starts within months"');
  if (disciplineHits('<h3>Most surveyed new earners had started earning by six months after finishing the course.</h3>')) problems.push('self-test: the wording gate flagged the round-14 USP heading');

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
  // WP165: the essay element of a /blog/<post>/ page is the author's text; the page around it, the /blog/ index and the marker elsewhere are guarded
  const essay = (inside, outside = '') => `<h1>Essay</h1><p class="sub">${outside}</p><div class="prose" data-repost-body><p>Employment rose 47.5%.</p><div><p>About $9.9M.</p></div><p>${inside}</p></div><p>Originally published on Substack.</p>`;
  guardPasses('the author’s figures inside the essay element of a /blog/<post>/ page', '/blog/an-essay/', essay('Up 12.34%.'));
  guardFails('an unregistered "47.5%" outside the essay element of a /blog/<post>/ page', '/blog/an-essay/', essay('Up 12.34%.', 'Employment rose 47.5%.'));
  guardFails('an unregistered figure in the meta description of a /blog/<post>/ page', '/blog/an-essay/', essay('Up 12.34%.'), [], '<meta name="description" content="Up 47.5% in a year">');
  if (guardRun('/blog/', essay('Up 12.34%.')).problems.length !== 3) problems.push('self-test: the number guard exempted the essay marker on the /blog/ index (only /blog/<post>/ is exempt)');
  if (guardRun('/our-model/', essay('Up 12.34%.')).problems.length !== 3) problems.push('self-test: the number guard exempted the essay marker on a page that is not a /blog/<post>/ page');
  if (numberGuardPage('/404.html', guardDoc('<p>47.5%</p>')).problems.length) problems.push('self-test: the number guard flagged the 404');
  // numbers that are not claims carry no marker and are not read: years, dates, list counts, steps, durations, ages, bases
  const unmarked = guardRun('/our-model/', '<p>Founded in 2014; the October 2026 survey; Nov–Dec 2021; steps 1, 2 and 3; 100 training hours; ages 18–35; 6–8 weeks; tracers at 3/6/12 months; n = 331; over 4 months; 1 of 3; Her Power 2.0.</p><p>Call +1 212 344 4111 or +880 1958\u{2011}220802. WSIS+20 Forum.</p>');
  if (unmarked.problems.length || unmarked.tokens) problems.push(`self-test: the number guard read figures that carry no marker (${unmarked.tokens} token(s)): ${unmarked.problems.join('; ')}`);
  // a registered figure in another format passes (value-level matching): RC-02 is "+10 pp" (WP172: the published study's figure; it was the 2022 report's "+10.3 pp")
  for (const fig of ['+10 pp', '10 percentage points', '10 percentage-point', '+10 percentage points', '10pp', '+10 pp']) guardPasses(`RC-02 written as "${fig}"`, '/our-model/', `<p>Employment rose ${fig} for women offered a place.</p>`);
  guardFails('"10.4 percentage points" (RC-02 is 10)', '/our-model/', '<p>Employment rose 10.4 percentage points.</p>');
  for (const fig of ['62 million', '62M', '3M+', '3 million', '1.5M+', '1.5 million', '61–78 million', '~15,000', '+$25', '$25', '2.50×', '2.5×', '2.70×', '2.30×', '3.40×', '68–71%', '71–68%', '68% to 71%', '130,000+']) guardPasses(`the registered "${fig}"`, '/our-model/', `<p>Figure: ${fig}.</p>`);
  // $5M+ impact investment (SC-13) was removed on the owner's decision (2026-10-12): the figure is no longer a registered value and must not render anywhere
  // D1 (owner decision, 2026-10-13): the online gig-work range (154M–435M, PX-09), the 257M youth figure (PX-10) and the 10M+ labor-market figure (PX-15) are withdrawn from the public dataset and must not render
  for (const fig of ['68–73%', '$5M+', '$5 million', '$5.5M', '3.5×', 'BDT 2,355', '1.6M+', '61–79 million', '~16,000', '435M', '257M', '10M+']) guardFails(`"${fig}" (a range or figure with one unregistered value)`, '/our-model/', `<p>Figure: ${fig}.</p>`);
  // chart data: the published survey aggregates (outcomes-data.ts) are part of the public dataset
  guardPasses('a published survey share ("37.0%" Dhaka)', '/impact/outcomes-2026/', '<p>Dhaka 37.0%, Chattogram 8.4%</p>');
  guardFails('"37.2%" (not a published share)', '/impact/outcomes-2026/', '<p>Dhaka 37.2%</p>');
  // the previous edition's figures (Impact Report 261007A) are no longer published values: Dhaka was 37.1%, the ratio of medians "3.00×" ("about 3×")
  guardFails('"37.1%" (the previous edition’s Dhaka share)', '/impact/outcomes-2026/', '<p>Dhaka 37.1%</p>');
  for (const fig of ['3.00×', 'about 3×']) guardFails(`"${fig}" (the previous edition’s ratio of medians; OC-03 is 2.5×)`, '/our-model/', `<p>Median income rose ${fig}.</p>`);
  // numbers derived from a fact in code: only the listed derivation passes ("about 10 more" is RC-02 rounded)
  guardPasses('"about 10 more" (RC-02 rounded)', '/our-model/', '<p>About 10 more were in work.</p>');
  guardFails('"about 11 more" (RC-02 rounds to 10)', '/our-model/', '<p>about 11 more were in work.</p>');
  // counts below 1,000 are tied to the word after them: "at least 10 classes" is RC-17, "at least 10 workshops" is not a fact (WP172: RC-08's "25+ classes" is withdrawn; "at least 10 years" is a duration, which the guard does not read)
  guardPasses('"at least 10 classes" (RC-17)', '/our-model/', '<p>Employment was 28% higher for women who attended at least 10 classes.</p>');
  guardFails('"at least 10 workshops" (a number that only matches RC-17 by value)', '/our-model/', '<p>Women who attended at least 10 workshops.</p>');
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
  const staleEntry = { page: '/our-model/', text: '+10 pp', reason: 'a self-test entry that says why this is not a claim' };
  guardRun('/our-model/', '<p>+10 pp</p>', [staleEntry]);
  if (staleEntry.used) problems.push('self-test: a whitelist entry for a registered figure was marked used (the register applies first, so the entry is stale and must be reported)');
  if (allowlistProblems([allowEntry, { ...allowEntry, page: '/about/' }]).length) problems.push('self-test: the whitelist validator rejected valid entries');
  for (const [why, entry] of [['a wildcard page', { ...allowEntry, page: '*' }], ['the whole site as a prefix', { ...allowEntry, page: '/*' }], ['an entry with no reason', { ...allowEntry, reason: '' }], ['a one-word reason', { ...allowEntry, reason: 'year' }], ['an entry whose text holds no number', { ...allowEntry, text: 'ten percent' }], ['an entry with no page', { text: '47.5%', reason: allowEntry.reason }]]) {
    if (!allowlistProblems([entry]).length) problems.push(`self-test: the whitelist validator accepted ${why}`);
  }
  if (!allowlistProblems([allowEntry, { ...allowEntry }]).length) problems.push('self-test: the whitelist validator accepted a duplicate entry');
  if (!allowlistProblems({}).length) problems.push('self-test: the whitelist validator accepted a non-array');

  // survey edition pin: the edition's own figures pass; a figure of the previous edition (261007A) is reported where it sits, with the value it should have. These run the real
  // surveyEditionProblems() on fixtures built from the pin tables (and on the real wording of OC-01), so they hold whatever state the live dataset is in.
  const setPath = (obj, path, value) => {
    const keys = path.split('.');
    const last = keys.pop();
    let o = obj;
    for (const k of keys) o = o[k] ??= {};
    o[last] = value;
  };
  const fixtureFacts = () => Object.fromEntries(Object.entries(SURVEY_FACTS).map(([id, pin]) => {
    const f = { id };
    for (const [path, figures] of Object.entries(pin.want)) setPath(f, path, `${figures.join(' and ')} in this field`);
    if (pin.numeric !== undefined) setPath(f, 'stat.numeric', pin.numeric);
    return [id, f];
  }));
  const fixtureRows = () => SURVEY_CSV_ROWS.map(([id, category, type, value, base]) => [id, 'A measure', category, type, value, base, 'published']);
  const reports = (why, got, expected) => {
    if (got.length !== expected.length || got.some((p, i) => !p.includes(expected[i]))) problems.push(`self-test: the survey edition pin should report ${why} as [${expected.join(' | ')}], reported [${got.join(' | ')}]`);
  };
  const oc01 = { id: 'OC-01', text: 'Among surveyed completers, employment rose from 48.0% before training to 78.2% at the October 2026 survey (a +30.2 percentage-point change)', stat: { value: '78.2%', numeric: 78.2, from: '48.0%', label: 'employed, up from 48.0% before training, among surveyed completers at the October 2026 survey', detail: '5.7% of those employed before training reported they were no longer employed.', glance: { label: 'employed among surveyed completers at the October 2026 survey', note: 'Up from 48.0% before training.' } } };
  const withOc01 = (f) => ({ ...fixtureFacts(), 'OC-01': f });
  const withRow = (match, change) => fixtureRows().map((r) => (match(r) ? change(r) : r));
  reports('the edition’s own figures as correct', surveyEditionProblems(fixtureFacts(), fixtureRows()), []);
  reports('the real wording of OC-01 as correct', surveyEditionProblems(withOc01(oc01), fixtureRows()), []);
  reports('OC-01 stating 77.9% in its text (the 78.2% is missing and the 77.9% is the previous edition’s)', surveyEditionProblems(withOc01({ ...oc01, text: oc01.text.replace('78.2%', '77.9%') }), fixtureRows()), ['OC-01 text should state "78.2%"', 'OC-01 still carries "77.9%" in text']);
  reports('OC-01’s stat value at 77.9%', surveyEditionProblems(withOc01({ ...oc01, stat: { ...oc01.stat, value: '77.9%' } }), fixtureRows()), ['OC-01 stat.value should state "78.2%"', 'OC-01 still carries "77.9%" in stat.value']);
  reports('OC-01’s stat.numeric at 77.9', surveyEditionProblems(withOc01({ ...oc01, stat: { ...oc01.stat, numeric: 77.9 } }), fixtureRows()), ['OC-01 stat.numeric should be 78.2']);
  reports('the previous edition’s exit share (5.9%) left in OC-01’s detail', surveyEditionProblems(withOc01({ ...oc01, stat: { ...oc01.stat, detail: oc01.stat.detail.replace('5.7%', '5.9%') } }), fixtureRows()), ['OC-01 stat.detail should state "5.7%"', 'OC-01 still carries "5.9%" in stat.detail']);
  reports('a previous-edition figure in a field the pin does not list (OC-03 headline)', surveyEditionProblems({ ...fixtureFacts(), 'OC-03': { ...fixtureFacts()['OC-03'], headline: 'Up about 3×' } }, fixtureRows()), ['OC-03 still carries "about 3×" in headline']);
  reports('"15.9%" is not the previous edition’s "5.9%" (a figure is matched whole)', surveyEditionProblems(withOc01({ ...oc01, text: `${oc01.text}; 15.9% of the others` }), fixtureRows()), []);
  reports('a survey fact the pin does not list', surveyEditionProblems({ ...fixtureFacts(), 'OC-99': { id: 'OC-99', text: '1.0% of something' } }, fixtureRows()), [`survey fact OC-99 is not in the ${SURVEY_EDITION} pin`]);
  reports('a pinned survey fact that is missing from the register', surveyEditionProblems((({ 'OC-09': gone, ...rest }) => rest)(fixtureFacts()), fixtureRows()), ['OC-09 is missing from the register']);
  reports('a chart cell at the previous edition’s share (Comilla 3.2, now 3.1)', surveyEditionProblems(fixtureFacts(), withRow((r) => r[0] === 'OC-09-district' && r[2] === 'Comilla', (r) => [...r.slice(0, 4), '3.2', ...r.slice(5)])), ['survey CSV row OC-09-district / Comilla should be percent 3.1 (no base)']);
  reports('a base from the previous edition (OC-05 at n = 170, now 172)', surveyEditionProblems(fixtureFacts(), withRow((r) => r[0] === 'OC-05' && r[2] === 'By 6 Months', (r) => [...r.slice(0, 5), '170', r[6]])), ['survey CSV row OC-05 / By 6 Months should be percent 58.7 (n = 172)']);
  reports('the headline row of the previous edition (OC-01 net gain 30.5, now 30.2)', surveyEditionProblems(fixtureFacts(), withRow((r) => r[3] === 'percentage_points', (r) => [...r.slice(0, 4), '30.5', ...r.slice(5)])), ['survey CSV row OC-01 / October 2026 survey vs. before training should be percentage_points 30.2 (n = 331)']);
  reports('Narayanganj (2.9%) still listed although it is under the 3.0% fold', surveyEditionProblems(fixtureFacts(), [...fixtureRows(), ['OC-09-district', 'Respondents by District of Residence', 'Narayanganj', 'percent', '2.9', '', 'published']]), [`the survey CSV carries a row OC-09-district / Narayanganj (percent 2.9) that ${SURVEY_EDITION} does not print; a district under 3.0% is combined into Other Districts`]);
  reports('a row of the edition that the CSV dropped (Other Districts)', surveyEditionProblems(fixtureFacts(), fixtureRows().filter((r) => r[2] !== 'Other Districts')), ['the survey CSV has no row OC-09-district / Other Districts']);
  reports('a CSV row listed twice', surveyEditionProblems(fixtureFacts(), [...fixtureRows(), fixtureRows()[0]]), ['the survey CSV has two rows for OC-01 / Before Training']);
  reports('a pin that lists a CSV row twice', surveyEditionProblems(fixtureFacts(), fixtureRows(), { facts: SURVEY_FACTS, rows: [...SURVEY_CSV_ROWS, SURVEY_CSV_ROWS[0]] }), ['pin lists the CSV row OC-01 / Before Training twice']);
}

// The survey figures are those of one edition of the Impact Report (SURVEY_EDITION): the OC-* facts and the published aggregates state its figures and none of the previous edition's.
problems.push(...surveyEditionProblems(facts, outcomesCsvRows()));
// The public dataset itself (D1, D15): no unverified facts and no restricted facts without a public scope.
for (const f of Object.values(facts)) {
  if (f.status === 'U') problems.push(`dataset: unverified (U) fact ${f.id} must stay in the private register`);
  if (f.status === 'R' && !(f.allow ?? []).length) problems.push(`dataset: restricted (R) fact ${f.id} has no public allow scope and must stay in the private register`);
}
// The non-affiliation note is the inline <CertNote> that <Fact>/<FactCard> add for CERT_FACT_IDS.
for (const id of ['PD-03', 'IN-08']) if (!CERT_FACT_IDS.includes(id)) problems.push(`dataset: ${id} names vendor certifications, so it must be in CERT_FACT_IDS (that is what makes <Fact> add the inline non-affiliation note)`);
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
let plainLinePages = 0;
let proofCardPages = 0;
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
  for (const g of mapGaps(markup)) problems.push(`${path}: ${g}`);

  // vendor certifications need the non-affiliation note (rule 13)
  const text = visibleText(markup);
  if (namesVendorCert(text)) vendorPages++;
  for (const p of certNoteProblems(text)) problems.push(`${path}: ${p}`);
  // archive-only wording: British "enquir*" (D6) and "tripled" (OC-03) outside the archived news posts
  problems.push(...archiveWordingProblems(path, html));
  // [PLAIN-LINE] required on the independent-evaluation page (WP42: no longer on the WSDFM case study, the exempt page); its numbers are RC-02's wherever it appears
  seenPaths.add(path);
  const plainRequired = PLAIN_LINE_PAGES.includes(path);
  if (plainRequired) plainLinePages++;
  if (rc02Stat) for (const p of plainLineProblems(markup, text, rc02Stat, plainRequired)) problems.push(`${path}: ${p}`);
  // [PROOF-CARD]: Home's hero trial card carries the plain-language reading of RC-02 (WP35)
  if (PROOF_CARD_PAGES.includes(path) && rc02Stat) {
    proofCardPages++;
    for (const p of proofCardProblems(markup, rc02Stat, facts['RC-07']?.text ?? '')) problems.push(`${path}: ${p}`);
  }
  // curly apostrophes and "pp" spelled out (the archived posts and the styleguide samples are exempt)
  // WP165: a re-posted Blog essay's own text is the author's (withoutRepostBody); the rest of its page is held to the conventions
  if (!exemptFromConventions(path) && !exemptFromArchiveRule(path, html)) for (const p of conventionProblems(REPOST_PAGE.test(path) ? visibleText(withoutRepostBody(path, markup)) : text)) problems.push(`${path}: ${p}`);
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
  // [POSITION] opens C6 on the twelve pages that carry a positioning statement (WP175-Z: Home and Investors included, no longer pending)
  if (POSITION_PAGES.includes(path)) {
    positionPages++;
    for (const p of positionProblems(markup, { whole: POSITION_WHOLE_STATEMENT[path], text })) problems.push(`${path}: ${p}`);
  }
  // three ranked pains in C2 and one C8 card for each, on the nine ranked-pain pages (round 14, M4; WP175-Z)
  if (PAIN_PAGES.includes(path)) {
    painPages++;
    for (const p of painMapProblems(markup, PAIN_C2_AT[path])) problems.push(`${path}: ${p}`);
  }
  // the trial relevance line directly under the randomized-trial headline where the offering is not the evaluated program (round 14, m2); WP175-Z: the proof band is required on all three pages
  if (TRIAL_SCOPE_PAGES.includes(path)) {
    trialScopePages++;
    for (const p of trialScopeProblems(markup, TRIAL_SCOPE_BY_PAGE[path])) problems.push(`${path}: ${p}`);
  }
  // [SESSION-AGENDA] required beside the C13 CTA on the five funder and government pages
  if (SESSION_AGENDA_PAGES.includes(path)) {
    agendaPages++;
    for (const p of sessionAgendaProblems(markup, SESSION_AGENDA_BY_PAGE[path], SESSION_AGENDA_BAND[path])) problems.push(`${path}: ${p}`);
  }
  // sentences and inline links: no doubled period from <Fact>, no link glued to the text before it
  for (const p of markupProblems(markup)) problems.push(`${path}: ${p}`);
  // the withheld report CTA must not leak
  if (reportWithheld) for (const re of REPORT_CTA) if (re.test(html)) problems.push(`${path}: report CTA rendered while REPORT_EDITION_READY is false (${re})`);
}

if (pages === 0) {
  console.error(`check-facts: no HTML found in ${dist}. Run "npm run build" first.`);
  process.exit(1);
}
// A page that must carry the [PLAIN-LINE], the [SESSION-AGENDA], the [POSITION] statement, the ranked pains or the trial relevance line has to be in the build at all (and so does a page exempted from one of them, so a rename cannot leave a stale exemption).
for (const p of new Set([...PLAIN_LINE_PAGES, ...PLAIN_LINE_EXEMPT_PAGES, ...PROOF_CARD_PAGES, ...SESSION_AGENDA_PAGES, ...POSITION_PAGES, ...PAIN_PAGES, ...TRIAL_SCOPE_PAGES])) if (!seenPaths.has(p)) problems.push(`${p}: page not found in ${relative(root, dist) || '.'}, so its [PLAIN-LINE], [PROOF-CARD], [SESSION-AGENDA], [POSITION], ranked pains or trial relevance line cannot be checked`);
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
  `check-facts: OK — ${pages} pages, ${refs} fact references, no gated facts or internal wording; ${vendorPages} page(s) name vendor certifications and carry the note once; no "enquir*", "licence" or "tripled" outside /news/<post>/ (and the essay text of /blog/<post>/); [PLAIN-LINE] on ${plainLinePages} page(s) with RC-02's numbers; [PROOF-CARD] (the hero's plain-language trial reading, held to RC-02 and RC-07) on ${proofCardPages} page(s); [SESSION-AGENDA] beside the CTA on ${agendaPages} page(s); [POSITION] opens C6 on ${positionPages} page(s); three ranked pains (C2), with one C8 card each, on ${painPages} page(s); trial relevance line under the trial headline on ${trialScopePages} page(s); number guard: ${guard.pages} evergreen page(s) scanned, ${guard.tokens} claim-marked figure(s) checked, ${guard.byRegister} allowed by the register, ${guard.byWhitelist} by the whitelist (${allowList.length} entries); survey dataset pinned to ${SURVEY_EDITION} (${Object.keys(SURVEY_FACTS).length} facts, ${SURVEY_CSV_ROWS.length} CSV rows); report CTA ${reportWithheld ? 'withheld' : 'enabled'}` +
    (production ? `; production holds: ${holds.size} held fact(s), none rendered.` : '.'),
);
