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
//     messaging framework rule 13): a page whose visible text names one must also carry the non-affiliation note (CERT_NOTE_TEXT)
//   - footnotes: markers and notes number in reading order (1, 2, 3 by first appearance), every marker has its note and every note
//     its markers and back-links, a caveat prints in full once per page ("Same caveat as note N" afterwards), no empty
//     "Notes and sources" band, and no sentence glued to an inline link. The self-test below runs the post-processing
//     (src/lib/postprocess.ts, applied by src/middleware.ts) on fixtures first, so a regression there fails with a reason.
//   - sentences: <Fact> ends every sentence with a period; the period it adds must never be doubled (no added period right after
//     a period, none left in front of punctuation the page typed)
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
const { facts, CERT_NOTE_TEXT, CERT_FACT_IDS } = await import(new URL('../src/data/facts.ts', import.meta.url).href);
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
const visibleText = (markup) => decode(markup.replace(/<head\b[\s\S]*?<\/head>/i, '').replace(/<!--[\s\S]*?-->/g, ''));

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
}

// The public dataset itself (D1, D15): no unverified facts and no restricted facts without a public scope.
for (const f of Object.values(facts)) {
  if (f.status === 'U') problems.push(`dataset: unverified (U) fact ${f.id} must stay in the private register`);
  if (f.status === 'R' && !(f.allow ?? []).length) problems.push(`dataset: restricted (R) fact ${f.id} has no public allow scope and must stay in the private register`);
}
if (!String(facts['PD-03']?.footnote ?? '').includes(CERT_NOTE_TEXT)) problems.push('dataset: PD-03 (vendor certifications) must carry the non-affiliation note in its footnote');
for (const id of CERT_FACT_IDS) if (!facts[id]) problems.push(`dataset: CERT_FACT_IDS names ${id}, which is not in the register`);

/* ---- report CTA switch (src/lib/site.ts) ---- */
const siteSource = readFileSync(join(root, 'src/lib/site.ts'), 'utf8');
const reportFlag = /export const REPORT_EDITION_READY\s*=\s*(true|false)\b/.exec(siteSource)?.[1];
if (!reportFlag) problems.push('src/lib/site.ts: REPORT_EDITION_READY is missing or is not a literal true/false');
const reportWithheld = reportFlag === 'false';
const REPORT_CTA = [/Request the Impact Report/i, /partner edition\)\s*request/i, /Impact(?:%20| )Report(?:%20| )2026(?:%20| )\(partner(?:%20| )edition\)(?:%20| )request/i];

let pages = 0;
let refs = 0;
let vendorPages = 0;
let footnotePages = 0;
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
  if (namesVendorCert(text)) {
    vendorPages++;
    if (!text.includes(CERT_NOTE_TEXT)) problems.push(`${path}: names a vendor certification but lacks the note "${CERT_NOTE_TEXT}"`);
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
  `check-facts: OK — ${pages} pages, ${refs} fact references, no gated facts or internal wording; ${vendorPages} page(s) name vendor certifications and carry the note; ${footnotePages} page(s) with footnotes in reading order; report CTA ${reportWithheld ? 'withheld' : 'enabled'}` +
    (production ? `; production holds: ${holds.size} held fact(s), none rendered.` : '.'),
);
