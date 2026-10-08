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
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, 'dist');
const { facts } = await import(new URL('../src/data/facts.ts', import.meta.url).href);

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
// The public dataset itself (D1, D15): no unverified facts and no restricted facts without a public scope.
for (const f of Object.values(facts)) {
  if (f.status === 'U') problems.push(`dataset: unverified (U) fact ${f.id} must stay in the private register`);
  if (f.status === 'R' && !(f.allow ?? []).length) problems.push(`dataset: restricted (R) fact ${f.id} has no public allow scope and must stay in the private register`);
}
let pages = 0;
let refs = 0;
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
}

if (pages === 0) {
  console.error(`check-facts: no HTML found in ${dist}. Run "npm run build" first.`);
  process.exit(1);
}
if (problems.length) {
  console.error(`check-facts: ${problems.length} problem(s)\n` + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(`check-facts: OK — ${pages} pages, ${refs} fact references, no gated facts or internal wording.`);
