// D13 asset-permission gate over the built site. Run after `npm run build`:  npm run check:permissions
// Consent-dependent assets (learner photos, quotes, partner logos) carry data-asset="<assetId>" in the markup.
//   SITE_ENV=production : fail if any such asset has no `cleared` row in src/data/permissions.json
//   otherwise (staging)  : warn only (staging must still replace non-consented assets with placeholders)
// The public file may hold only { assetId, clearanceId, status } per row.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, 'dist');
const production = process.env.SITE_ENV === 'production';
const rows = JSON.parse(readFileSync(join(root, 'src/data/permissions.json'), 'utf8'));

const errors = [];
const warnings = [];
const KEYS = ['assetId', 'clearanceId', 'status'];
if (!Array.isArray(rows)) errors.push('permissions.json must be an array');
const status = new Map();
for (const r of Array.isArray(rows) ? rows : []) {
  const extra = Object.keys(r).filter((k) => !KEYS.includes(k));
  const missing = KEYS.filter((k) => typeof r[k] !== 'string' || !r[k]);
  if (extra.length) errors.push(`permissions.json row ${r.assetId}: extra field(s) ${extra.join(', ')} (public file is minimal)`);
  if (missing.length) errors.push(`permissions.json row ${r.assetId ?? '?'}: missing ${missing.join(', ')}`);
  if (!['cleared', 'pending'].includes(r.status)) errors.push(`permissions.json row ${r.assetId}: status must be cleared|pending`);
  if (status.has(r.assetId)) errors.push(`permissions.json: duplicate assetId ${r.assetId}`);
  status.set(r.assetId, r.status);
}

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const used = new Map(); // assetId -> Set(pages)
let pages = 0;
for (const file of htmlFiles(dist)) {
  pages++;
  const html = readFileSync(file, 'utf8').replace(/<script\b[\s\S]*?<\/script>/gi, '');
  for (const m of html.matchAll(/\sdata-asset=(?:"([^"]*)"|'([^']*)')/g)) {
    for (const id of (m[1] ?? m[2]).split(/\s+/).filter(Boolean)) {
      if (!used.has(id)) used.set(id, new Set());
      used.get(id).add(file.slice(dist.length));
    }
  }
}
if (pages === 0) {
  console.error(`check-permissions: no HTML found in ${dist}. Run "npm run build" first.`);
  process.exit(1);
}
for (const [id, where] of used) {
  if (status.get(id) === 'cleared') continue;
  const msg = `asset "${id}" is ${status.has(id) ? status.get(id) : 'not in permissions.json'} (used on ${[...where].slice(0, 3).join(', ')}${where.size > 3 ? ` +${where.size - 3} more` : ''})`;
  (production ? errors : warnings).push(msg);
}

for (const w of warnings) console.warn(`check-permissions: WARN ${w}`);
if (errors.length) {
  console.error(`check-permissions (${production ? 'production' : 'staging'}): ${errors.length} problem(s)\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`check-permissions (${production ? 'production' : 'staging'}): OK — ${pages} pages, ${used.size} consent-dependent asset(s) in use, ${warnings.length} warning(s).`);
