/**
 * Shared helpers for the migration manifest (planning/02 §5a) and everything generated from it
 * (src/data/redirects.ts, edge/bulk-redirects.csv, edge/worker/id-map.json) and tested against it
 * (scripts/test-redirects.mjs, scripts/test-manifest.mjs, scripts/postbuild-redirects.mjs).
 *
 * Pure Node (no dependencies). Imported by the other scripts; not executed on its own.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MANIFEST_PATH = path.join(REPO_ROOT, 'migration', 'migration-manifest.csv');
export const REDIRECTS_TS_PATH = path.join(REPO_ROOT, 'src', 'data', 'redirects.ts');
export const BULK_CSV_PATH = path.join(REPO_ROOT, 'edge', 'bulk-redirects.csv');
export const ID_MAP_PATH = path.join(REPO_ROOT, 'edge', 'worker', 'id-map.json');

/** Manifest columns, in file order (planning/02 §5a). */
export const COLUMNS = [
  'legacy_url',
  'content_id',
  'class',
  'disposition',
  'destination',
  'query_handling',
  'publication_hold',
  'test_status',
];

export const CLASSES = ['page', 'post', 'custom-post-type', 'course', 'archive', 'attachment', 'query-string', 'system', 'media'];
export const DISPOSITIONS = ['KEEP', 'MOVE', 'MERGE', 'JR', 'DROP', 'WITHHELD', 'SYSTEM'];
export const QUERY_HANDLING = ['none', 'ID map', 'ignore parameters'];
/** What an automated test asserts for the row (see README in edge/ and the report of scripts/manifest-report.mjs). */
export const TEST_STATUSES = ['route', 'stub+edge', 'edge'];

/** Neutral, public-safe reason shown for withheld items. */
export const HOLD_TEXT = 'withheld pending owner confirmation';

/** Destination marker for WordPress system paths answered with 410 Gone by the edge Worker. */
export const GONE = '410';

/** The planning/10 §4 acceptance states. SYSTEM paths are retired with 410 at the edge, counted as "redirected". */
export const STATE_OF = {
  KEEP: 'published',
  MERGE: 'merged',
  MOVE: 'redirected',
  JR: 'redirected',
  DROP: 'redirected',
  SYSTEM: 'redirected',
  WITHHELD: 'withheld',
};

/** Classes that get a static redirect stub (path-based; media/system/query/attachment are edge-only). */
export const STUB_CLASSES = new Set(['page', 'post', 'custom-post-type', 'course', 'archive']);
export const STUB_DISPOSITIONS = new Set(['MOVE', 'MERGE', 'JR', 'DROP', 'WITHHELD']);

/** External destinations the manifest may point to. */
export const EXTERNAL_HOSTS = new Set(['jobready.global']);

// ---------------------------------------------------------------------------------------------
// CSV (RFC 4180 subset: comma separated, double quotes, LF line ends)
// ---------------------------------------------------------------------------------------------

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function csvField(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(csvField).join(',')).join('\n') + '\n';
}

// ---------------------------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------------------------

export function loadManifest(file = MANIFEST_PATH) {
  if (!fs.existsSync(file)) throw new Error(`manifest not found: ${file} (run: node scripts/build-manifest.mjs <exportDir>)`);
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!header || header.join(',') !== COLUMNS.join(',')) {
    throw new Error(`manifest header must be exactly: ${COLUMNS.join(',')} (found: ${(header ?? []).join(',')})`);
  }
  return rows
    .filter((r) => r.length > 1 || r[0] !== '')
    .map((r, i) => {
      if (r.length !== COLUMNS.length) throw new Error(`manifest row ${i + 2}: expected ${COLUMNS.length} fields, found ${r.length}`);
      return Object.fromEntries(COLUMNS.map((c, k) => [c, r[k]]));
    });
}

export function writeManifest(rows, file = MANIFEST_PATH) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, toCsv([COLUMNS, ...rows.map((r) => COLUMNS.map((c) => r[c]))]));
}

export const isExternalDest = (d) => /^https?:\/\//i.test(d);
export const splitFragment = (d) => {
  const i = d.indexOf('#');
  return i === -1 ? [d, ''] : [d.slice(0, i), d.slice(i)];
};

/** Is this row served by a static redirect stub on the Pages host? */
export function needsStub(row) {
  return STUB_CLASSES.has(row.class) && STUB_DISPOSITIONS.has(row.disposition) && !row.legacy_url.includes('?');
}

/** `{ from, to, kind }` for every stub row, sorted by `from` (this is src/data/redirects.ts). */
export function redirectEntries(rows) {
  return rows
    .filter(needsStub)
    .map((r) => ({ from: r.legacy_url, to: r.destination, kind: isExternalDest(r.destination) ? 'external' : 'internal' }))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

/**
 * Soundness of the redirect list: never a redirect whose `from` is a real route of the site, never a destination that is
 * itself a redirect source (no chains), never a self-redirect, no duplicate sources.
 */
export function redirectProblems(rows, routes) {
  const entries = redirectEntries(rows);
  const froms = new Set();
  const out = [];
  for (const e of entries) {
    if (froms.has(e.from)) out.push(`${e.from}: duplicate redirect source`);
    froms.add(e.from);
  }
  for (const e of entries) {
    const [p] = splitFragment(e.to);
    if (routes.has(e.from)) out.push(`${e.from}: is a real route of the site; a redirect would shadow it`);
    if (e.kind === 'internal' && p === e.from) out.push(`${e.from}: redirects to itself`);
    if (e.kind === 'internal' && froms.has(p)) out.push(`${e.from}: chain, ${e.to} is itself a redirect source`);
  }
  return out;
}

/** Exact text of the generated src/data/redirects.ts. Tests regenerate it and compare byte for byte. */
export function renderRedirectsTs(rows) {
  const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  const lines = redirectEntries(rows).map((r) => `  { from: ${q(r.from)}, to: ${q(r.to)}, kind: ${q(r.kind)} },`);
  return [
    '// GENERATED by scripts/generate-from-manifest.mjs from migration/migration-manifest.csv. Do not edit by hand:',
    '// change the manifest builder (scripts/build-manifest.mjs) and regenerate.',
    '//',
    '// Path-based legacy URLs only (planning/02 §5). `from` is base-less with a trailing slash; `to` is a base-less site',
    '// path (optionally with #fragment) or an absolute https URL. astro.config.mjs feeds this list to `redirects`, and',
    '// scripts/postbuild-redirects.mjs rewrites every emitted stub (canonical, visible link, no noindex).',
    'export const REDIRECTS: { from: string; to: string; kind: \'internal\' | \'external\' }[] = [',
    ...lines,
    '];',
    '',
  ].join('\n');
}

/** Parse the generated src/data/redirects.ts (strict: one entry per line, exactly as renderRedirectsTs writes it). */
export function readRedirectsTs(file = REDIRECTS_TS_PATH) {
  const text = fs.readFileSync(file, 'utf8');
  const unq = (s) => s.replace(/\\(['\\])/g, '$1');
  const entries = [];
  let inList = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('export const REDIRECTS')) {
      inList = true;
      continue;
    }
    if (line === '];') inList = false;
    if (!inList) continue;
    const m = line.match(/^ {2}\{ from: '((?:[^'\\]|\\.)*)', to: '((?:[^'\\]|\\.)*)', kind: '(internal|external)' \},$/);
    if (!m) throw new Error(`${path.relative(REPO_ROOT, file)}: unparseable entry (file must be generated): ${line}`);
    entries.push({ from: unq(m[1]), to: unq(m[2]), kind: m[3] });
  }
  if (!entries.length) throw new Error(`${path.relative(REPO_ROOT, file)}: no entries`);
  return entries;
}

// ---------------------------------------------------------------------------------------------
// Site facts read from the repo (no TypeScript execution needed)
// ---------------------------------------------------------------------------------------------

/** PRODUCTION_ORIGIN from src/lib/site.ts: the canonical origin (same semantics as the site code). */
export function productionOrigin() {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src', 'lib', 'site.ts'), 'utf8');
  const m = src.match(/export const PRODUCTION_ORIGIN\s*=\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error('PRODUCTION_ORIGIN not found in src/lib/site.ts');
  return m[1].replace(/\/+$/, '');
}

/** ENTITY_DEFINITION is `fact('ID-01').text`; resolve it from src/data/facts.ts without running TypeScript. */
export function entityDefinition() {
  const src = fs.readFileSync(path.join(REPO_ROOT, 'src', 'data', 'facts.ts'), 'utf8');
  const i = src.indexOf("'ID-01'");
  if (i === -1) throw new Error("fact 'ID-01' not found in src/data/facts.ts");
  const m = src.slice(i).match(/text:\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/);
  if (!m) throw new Error("fact 'ID-01' has no text field");
  return m[2].replace(/\\(['"`\\])/g, '$1');
}

/** Build environment, mirroring astro.config.mjs (SITE_URL, BASE_PATH, SITE_ENV). */
export function envConfig(env = process.env) {
  const siteUrl = (env.SITE_URL || 'https://ctjobready.github.io').replace(/\/+$/, '');
  const rawBase = env.BASE_PATH ?? '/ctg';
  const basePath = rawBase === '/' || rawBase === '' ? '/' : '/' + rawBase.replace(/^\/+|\/+$/g, '');
  const siteEnv = env.SITE_ENV === 'production' ? 'production' : 'staging';
  return { siteUrl, basePath, base: basePath === '/' ? '' : basePath, siteEnv };
}

/** Base-aware URL of an internal destination ("/a/#f" -> "/ctg/a/#f" on staging); externals pass through. */
export function deployedHref(dest, base) {
  if (isExternalDest(dest)) return dest;
  return base + dest;
}

/** Canonical (production) URL of a destination, fragment removed (canonicals never carry fragments). */
export function canonicalOf(dest, origin) {
  if (isExternalDest(dest)) return splitFragment(dest)[0];
  return origin + splitFragment(dest)[0];
}

// ---------------------------------------------------------------------------------------------
// dist/ helpers shared by the post-build and test scripts
// ---------------------------------------------------------------------------------------------

export function* walkFiles(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}

/** Astro's own redirect stub, or one rewritten by scripts/postbuild-redirects.mjs. */
export const isRedirectStub = (html) =>
  (/^<!doctype html>\s*<title>Redirecting to:/i.test(html) && /http-equiv="refresh"/i.test(html)) || /<html lang="en" data-redirect-stub>/.test(html);

/** File in dist/ that serves a base-less route ("/about/" -> dist/about/index.html). */
export const distFile = (dist, route) => path.join(dist, route, 'index.html');

/** Every URL listed in dist/sitemap-*.xml, as base-less paths with a trailing slash. */
export function sitemapPaths(dist, base) {
  const out = [];
  for (const f of fs.readdirSync(dist).filter((n) => /^sitemap-\d+\.xml$/.test(n))) {
    const xml = fs.readFileSync(path.join(dist, f), 'utf8');
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = new URL(m[1].replace(/&amp;/g, '&')).pathname;
      const bare = base && p.startsWith(base) ? p.slice(base.length) || '/' : p;
      out.push(bare.endsWith('/') ? bare : bare + '/');
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Routes the site actually serves (from src/pages and the content collections)
// ---------------------------------------------------------------------------------------------

function frontMatter(file) {
  const t = fs.readFileSync(file, 'utf8');
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}
const fmValue = (fm, key) => {
  const m = fm.match(new RegExp('^' + key + ':\\s*(.+)$', 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : undefined;
};

/** Content entries with their legacyUrl, keyed by collection. */
export function contentEntries() {
  const root = path.join(REPO_ROOT, 'src', 'content');
  const out = { news: [], team: [], stories: [], nuPgd: [], mentors: [] };
  const read = (dir, key, extra) => {
    const d = path.join(root, dir);
    if (!fs.existsSync(d)) return;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.md')).sort()) {
      const fm = frontMatter(path.join(d, f));
      out[key].push({ id: f.replace(/\.md$/, ''), legacyUrl: fmValue(fm, 'legacyUrl'), slug: fmValue(fm, 'slug'), kind: fmValue(fm, 'kind'), draft: fmValue(fm, 'draft') === 'true', ...(extra ? extra(fm) : {}) });
    }
  };
  read('news', 'news');
  read('team', 'team');
  read('stories', 'stories');
  read('nu-pgd', 'nuPgd');
  const mentorsFile = path.join(root, 'mentors.json');
  if (fs.existsSync(mentorsFile)) {
    for (const m of JSON.parse(fs.readFileSync(mentorsFile, 'utf8'))) out.mentors.push({ id: m.id, legacyUrl: m.legacyUrl });
  }
  return out;
}

/**
 * Every route the static site serves, base-less with a trailing slash. Derived from src/pages plus the
 * collections behind the three dynamic routes; throws on a dynamic route it does not know how to expand,
 * so a new dynamic page cannot silently go unchecked.
 */
export function siteRoutes() {
  const pagesDir = path.join(REPO_ROOT, 'src', 'pages');
  const content = contentEntries();
  const routes = new Set();
  const walk = (dir, prefix) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, prefix + ent.name + '/');
        continue;
      }
      const m = ent.name.match(/^(.+)\.(astro|md|mdx)$/);
      if (!m) continue; // endpoints (robots.txt.ts, llms.txt.ts) are files, not routes
      const stem = m[1];
      const base = '/' + prefix;
      if (stem === '404') continue; // 404.html is not a route
      if (stem === 'index') routes.add(base);
      else if (stem.startsWith('[')) {
        const key = base + stem;
        let slugs;
        if (key === '/news/[slug]') slugs = content.news.filter((n) => !n.draft).map((n) => n.id);
        else if (key === '/about/team/[slug]') slugs = content.team.map((t) => t.id);
        else if (key === '/nu-postgraduate-diploma/[slug]') slugs = content.nuPgd.filter((n) => n.kind === 'course').map((n) => n.slug ?? n.id);
        else throw new Error(`siteRoutes(): unknown dynamic route ${key}; teach scripts/manifest-lib.mjs how to expand it`);
        for (const s of slugs) routes.add(`${base}${s}/`);
      } else routes.add(`${base}${stem}/`);
    }
  };
  walk(pagesDir, '');
  return routes;
}
