#!/usr/bin/env node
/**
 * Regenerates everything derived from migration/migration-manifest.csv (planning/02 §5a):
 *   src/data/redirects.ts          path-based stubs for astro.config.mjs `redirects`
 *   edge/bulk-redirects.csv        Cloudflare Bulk Redirects list (planning/08 §7)
 *   edge/worker/id-map.json        ID/slug map for the query-aware Worker (planning/08 §7)
 *
 *   node scripts/generate-from-manifest.mjs            write the files
 *   node scripts/generate-from-manifest.mjs --check    exit 1 if a committed file differs from what the manifest produces
 *
 * No export directory is needed: the manifest is the only input, so CI can run `--check`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BULK_CSV_PATH,
  ID_MAP_PATH,
  REDIRECTS_TS_PATH,
  STUB_DISPOSITIONS,
  STUB_CLASSES,
  isExternalDest,
  loadManifest,
  productionOrigin,
  redirectProblems,
  renderRedirectsTs,
  siteRoutes,
  toCsv,
} from './manifest-lib.mjs';

/** WordPress post type names that differ from the first path segment of their permalink. */
const POST_TYPE_OF_PREFIX = { 'next-generation-skills-courses': 'ngs-course', testcase: 'test-case' };

export function renderBulkCsv(rows) {
  const origin = productionOrigin();
  const host = new URL(origin).host;
  const selected = rows.filter((r) => (STUB_CLASSES.has(r.class) || r.class === 'media') && STUB_DISPOSITIONS.has(r.disposition) && !r.legacy_url.includes('?'));
  const line = (r) => {
    const target = isExternalDest(r.destination) ? r.destination : origin + r.destination;
    // Cloudflare Bulk Redirects CSV: no header; source without scheme; 301; legacy query never carried;
    // include subdomains (www); no subpath matching; no path suffix preservation.
    return [`${host}${r.legacy_url}`, target, '301', 'FALSE', 'TRUE', 'FALSE', 'FALSE'];
  };
  const byUrl = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  // Page, post, archive, feed and course rules first; legacy upload (media) rules last, so a plan with a small list limit can load the head of the file.
  const pages = selected.filter((r) => r.class !== 'media').map(line).sort(byUrl);
  const media = selected.filter((r) => r.class === 'media').map(line).sort(byUrl);
  return toCsv([...pages, ...media]);
}

export function buildIdMap(rows) {
  const ids = {};
  const attachments = {};
  const slugs = {};
  const idRows = rows.filter((r) => r.class === 'query-string' && /^\/\?(p|page_id)=\d+$/.test(r.legacy_url));
  for (const r of idRows.sort((a, b) => Number(a.content_id) - Number(b.content_id))) ids[r.content_id] = r.destination;
  for (const r of rows.filter((x) => x.class === 'attachment').sort((a, b) => Number(a.content_id) - Number(b.content_id))) attachments[r.content_id] = r.destination;
  for (const r of rows) {
    if (r.content_id === 'none' || r.legacy_url.includes('?')) continue;
    const segs = r.legacy_url.split('/').filter(Boolean);
    if (!segs.length) continue;
    const slug = segs[segs.length - 1];
    let type;
    if (r.class === 'post') type = 'post';
    else if (r.class === 'page') type = 'page';
    else if (r.class === 'custom-post-type' || r.class === 'course') type = segs.length > 1 ? (POST_TYPE_OF_PREFIX[segs[0]] ?? segs[0]) : undefined;
    if (!type) continue;
    slugs[`${type}/${slug}`] = r.destination;
  }
  const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return { version: 1, ids, attachments, slugs: sortKeys(slugs) };
}

export function renderIdMap(rows) {
  return JSON.stringify(buildIdMap(rows), null, 1) + '\n';
}

export function outputs(rows) {
  return [
    [REDIRECTS_TS_PATH, renderRedirectsTs(rows)],
    [BULK_CSV_PATH, renderBulkCsv(rows)],
    [ID_MAP_PATH, renderIdMap(rows)],
  ];
}

export function generate({ check = false } = {}) {
  const rows = loadManifest();
  const problems = redirectProblems(rows, siteRoutes());
  if (problems.length) throw new Error(`unsound redirect list:\n  ${problems.slice(0, 20).join('\n  ')}`);
  const stale = [];
  for (const [file, text] of outputs(rows)) {
    if (check) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
      if (current !== text) stale.push(path.relative(process.cwd(), file));
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, text);
    }
  }
  return stale;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check');
  let stale;
  try {
    stale = generate({ check });
  } catch (e) {
    console.error(`generate-from-manifest: ${e.message}`);
    process.exit(1);
  }
  if (check) {
    if (stale.length) {
      console.error(`stale generated files (run node scripts/generate-from-manifest.mjs):\n  ${stale.join('\n  ')}`);
      process.exit(1);
    }
    console.log('generated files are in sync with the manifest');
  } else console.log('wrote src/data/redirects.ts, edge/bulk-redirects.csv, edge/worker/id-map.json');
}
