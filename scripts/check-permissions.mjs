// D13 asset-permission gate over the built site (planning/08 §4, R6-M3). Run after `npm run build`:  npm run check:permissions
// Consent-dependent assets (learner/team/mentor photos, quotes, press and endorsement assets) carry
// data-asset="<assetId>" in the markup; src/data/permissions.json holds one row per asset:
//   { assetId, clearanceId, status: "cleared" | "pending", publishedOnLegacySite, sensitiveGroup }
//   SITE_ENV=production : fail if any used asset is not `cleared` (no row, or status pending)
//   otherwise (staging)  : fail if a used asset has no row, is in a sensitive group (minors, refugees,
//                          third-gender trainees, slum residents) or was not already published on
//                          coderstrust.global. Pending is fine on staging: staging is a re-publication of
//                          what CodersTrust itself already published for adults, noindex.
// `example-` assets (sample content in the component gallery) are allowed only on /styleguide/ and need no
// row; an `example-` asset anywhere else fails in both modes.
// The public file holds only these five non-personal fields (holder, basis and release documents stay private).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, 'dist');
const production = process.env.SITE_ENV === 'production';
const rows = JSON.parse(readFileSync(join(root, 'src/data/permissions.json'), 'utf8'));

const EXAMPLE_PREFIX = 'example-';
const STYLEGUIDE = '/styleguide/';
const KEYS = ['assetId', 'clearanceId', 'status', 'publishedOnLegacySite', 'sensitiveGroup'];

const errors = [];
const warnings = [];
if (!Array.isArray(rows)) errors.push('permissions.json must be an array');
const byId = new Map();
for (const r of Array.isArray(rows) ? rows : []) {
  const id = r.assetId ?? '?';
  const extra = Object.keys(r).filter((k) => !KEYS.includes(k));
  const missing = KEYS.filter((k) => !(k in r));
  if (extra.length) errors.push(`permissions.json row ${id}: extra field(s) ${extra.join(', ')} (public file is minimal)`);
  if (missing.length) errors.push(`permissions.json row ${id}: missing ${missing.join(', ')}`);
  if (typeof r.assetId !== 'string' || !r.assetId) errors.push(`permissions.json row ${id}: assetId must be a non-empty string`);
  if (!['cleared', 'pending'].includes(r.status)) errors.push(`permissions.json row ${id}: status must be cleared|pending`);
  if (r.clearanceId !== null && (typeof r.clearanceId !== 'string' || !r.clearanceId)) errors.push(`permissions.json row ${id}: clearanceId must be a non-empty string or null`);
  if (r.status === 'cleared' && !r.clearanceId) errors.push(`permissions.json row ${id}: a cleared row needs a clearanceId`);
  for (const k of ['publishedOnLegacySite', 'sensitiveGroup']) if (typeof r[k] !== 'boolean') errors.push(`permissions.json row ${id}: ${k} must be true or false`);
  if (byId.has(r.assetId)) errors.push(`permissions.json: duplicate assetId ${r.assetId}`);
  byId.set(r.assetId, r);
}

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const used = new Map(); // assetId -> Set(site paths)
let pages = 0;
for (const file of htmlFiles(dist)) {
  pages++;
  const rel = file.slice(dist.length).split(sep).join('/');
  const path = rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
  const html = readFileSync(file, 'utf8').replace(/<script\b[\s\S]*?<\/script>/gi, '');
  for (const m of html.matchAll(/\sdata-asset=(?:"([^"]*)"|'([^']*)')/g)) {
    for (const id of (m[1] ?? m[2]).split(/\s+/).filter(Boolean)) {
      if (!used.has(id)) used.set(id, new Set());
      used.get(id).add(path);
    }
  }
}
if (pages === 0) {
  console.error(`check-permissions: no HTML found in ${dist}. Run "npm run build" first.`);
  process.exit(1);
}

const where = (set) => `used on ${[...set].slice(0, 3).join(', ')}${set.size > 3 ? ` +${set.size - 3} more` : ''}`;
let examples = 0;
let pending = 0;
for (const [id, paths] of used) {
  if (id.startsWith(EXAMPLE_PREFIX)) {
    const elsewhere = [...paths].filter((p) => p !== STYLEGUIDE);
    if (elsewhere.length) errors.push(`asset "${id}": the example- prefix is allowed only on ${STYLEGUIDE} (${where(new Set(elsewhere))})`);
    else examples++;
    continue;
  }
  const row = byId.get(id);
  if (production) {
    if (!row) errors.push(`asset "${id}" is not in permissions.json (${where(paths)})`);
    else if (row.status !== 'cleared') errors.push(`asset "${id}" is ${row.status}, not cleared (${where(paths)})`);
    continue;
  }
  if (!row) errors.push(`asset "${id}" has no row in permissions.json (${where(paths)})`);
  else if (row.sensitiveGroup) errors.push(`asset "${id}" is in a sensitive group and must not render (${where(paths)})`);
  else if (!row.publishedOnLegacySite) errors.push(`asset "${id}" was not already published on coderstrust.global and must not render on staging (${where(paths)})`);
  else if (row.status !== 'cleared') pending++;
}

for (const w of warnings) console.warn(`check-permissions: WARN ${w}`);
if (errors.length) {
  console.error(`check-permissions (${production ? 'production' : 'staging'}): ${errors.length} problem(s)\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
const real = used.size - examples;
console.log(
  `check-permissions (${production ? 'production' : 'staging'}): OK — ${pages} pages, ${real} consent-dependent asset(s) in use` +
    (production ? ', all cleared' : ` (${pending} pending clearance, rendered under the staging rule)`) +
    `, ${examples} example asset(s) on ${STYLEGUIDE}, ${warnings.length} warning(s).`,
);
