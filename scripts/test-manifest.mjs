#!/usr/bin/env node
/**
 * Release-manifest acceptance test (planning/10 §4 "Migration completeness / release manifest", planning/02 §5c):
 *   - every manifest row is in one of the four accepted states (published, merged, redirected, withheld),
 *     with a destination (WITHHELD rows may be empty by the doc; ours carry the parent page) and an approved reason on withheld rows,
 *   - every published/merged/redirected destination exists in dist/ (and its #fragment, when it has one),
 *   - WITHHELD items are not linked from any page and not in the sitemap,
 *   - 42/42 posts are accounted for (each legacy post -> its /news/<slug>/ article, which exists in dist/),
 *   - no legacy upload route serves a document: PDF media rows resolve to a landing page and dist/ holds no PDF,
 *   - the generated files (redirects.ts, bulk-redirects.csv, id-map.json) match the manifest.
 * Prints the counts.
 *
 *   node scripts/test-manifest.mjs [dist]       env: SITE_URL, BASE_PATH, SITE_ENV (as astro.config.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  HOLD_TEXT,
  REPO_ROOT,
  STATE_OF,
  contentEntries,
  distFile,
  envConfig,
  isExternalDest,
  isRedirectStub,
  loadManifest,
  EXTERNAL_HOSTS,
  siteRoutes,
  sitemapPaths,
  splitFragment,
  walkFiles,
} from './manifest-lib.mjs';
import { generate } from './generate-from-manifest.mjs';

const dist = path.resolve(process.argv[2] ?? path.join(REPO_ROOT, 'dist'));
const { base, siteEnv } = envConfig();
const errors = [];
const err = (m) => errors.push(m);

if (!fs.existsSync(dist)) {
  console.error(`test-manifest: ${dist} not found (build first)`);
  process.exit(1);
}

const rows = loadManifest();
const routes = siteRoutes();
const htmlCache = new Map();
const html = (route) => {
  if (!htmlCache.has(route)) {
    const f = distFile(dist, route);
    htmlCache.set(route, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
  }
  return htmlCache.get(route);
};

// 1. Four accepted states, destination, approved reason.
const states = { published: 0, merged: 0, redirected: 0, withheld: 0 };
for (const r of rows) {
  const state = STATE_OF[r.disposition];
  if (!state) {
    err(`${r.legacy_url}: disposition "${r.disposition}" is not one of the accepted states`);
    continue;
  }
  states[state]++;
  if (!r.destination && r.disposition !== 'WITHHELD') err(`${r.legacy_url}: no destination`);
  if (r.disposition === 'WITHHELD' && r.publication_hold !== HOLD_TEXT) err(`${r.legacy_url}: withheld without the approved reason`);
  if (r.disposition !== 'WITHHELD' && r.publication_hold !== 'none') err(`${r.legacy_url}: publication hold on a row that is not withheld`);
}

// 2. Published / merged / redirected destinations exist in dist/ (internal) or on an allowed host (external).
const checkedDest = new Set();
for (const r of rows) {
  if (r.disposition === 'SYSTEM') continue; // 410 Gone at the edge: nothing to publish
  if (!r.destination) continue;
  if (isExternalDest(r.destination)) {
    if (!EXTERNAL_HOSTS.has(new URL(r.destination).hostname)) err(`${r.legacy_url}: external destination host not allowed: ${r.destination}`);
    continue;
  }
  if (checkedDest.has(r.destination)) continue;
  checkedDest.add(r.destination);
  const [p, frag] = splitFragment(r.destination);
  const h = html(p);
  if (h === null) err(`destination ${p} (for ${r.legacy_url}) does not exist in dist/`);
  else if (isRedirectStub(h)) err(`destination ${p} (for ${r.legacy_url}) is a redirect stub`);
  else if (frag && !new RegExp(`\\sid="${frag.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(h)) err(`destination ${r.destination} (for ${r.legacy_url}): no element with id "${frag.slice(1)}" on the page`);
  if (!routes.has(p)) err(`destination ${p} is not a route in src/pages (for ${r.legacy_url})`);
}
// KEEP rows are the page itself.
for (const r of rows.filter((x) => x.disposition === 'KEEP')) {
  const h = html(r.legacy_url);
  if (h === null || isRedirectStub(h)) err(`KEEP ${r.legacy_url}: not published in dist/`);
  if (r.destination !== r.legacy_url) err(`KEEP ${r.legacy_url}: destination must equal the legacy URL`);
}

// 3. Withheld items: not linked from any page, not in the sitemap, no page of their own.
const withheld = rows.filter((r) => r.disposition === 'WITHHELD');
const sm = new Set(sitemapPaths(dist, base));
const withheldTokens = new Set();
for (const r of withheld) {
  if (r.legacy_url.includes('?') || r.class === 'media') {
    withheldTokens.add(r.legacy_url);
    continue;
  }
  withheldTokens.add(r.legacy_url);
  const slug = r.legacy_url.split('/').filter(Boolean).pop();
  withheldTokens.add(slug.replace(/-project$/, '')); // e.g. the case-study slug without its WordPress suffix
  if (sm.has(r.legacy_url)) err(`withheld ${r.legacy_url} is in the sitemap`);
  const h = html(r.legacy_url);
  if (h !== null && !isRedirectStub(h)) err(`withheld ${r.legacy_url} has a real page in dist/`);
}
for (const p of sm) for (const t of withheldTokens) if (t.length > 6 && p.includes(t)) err(`sitemap URL ${p} contains withheld token ${t}`);
const hrefRe = /\b(?:href|src|srcset|poster|content)="([^"]*)"/g;
let linkScanned = 0;
for (const f of walkFiles(dist)) {
  if (!f.endsWith('.html')) continue;
  const h = fs.readFileSync(f, 'utf8');
  if (isRedirectStub(h)) continue;
  linkScanned++;
  for (const m of h.matchAll(hrefRe)) {
    const v = m[1];
    for (const t of withheldTokens) if (t.length > 6 && v.includes(t)) err(`${path.relative(dist, f)} links to withheld item (${t}): ${v.slice(0, 120)}`);
  }
}
for (const p of routes) for (const t of withheldTokens) if (t.length > 6 && t !== p && p.includes(t)) err(`a real route (${p}) exists for withheld token ${t}`);
// The withheld legacy URL itself still redirects to its parent (planning/02 §5c), via a stub.
for (const r of withheld.filter((x) => x.class === 'page')) {
  const h = html(r.legacy_url);
  if (h === null || !isRedirectStub(h)) err(`withheld ${r.legacy_url} should redirect to its parent page (no stub found)`);
}

// 4. 42/42 posts accounted for.
const news = contentEntries().news.filter((n) => !n.draft);
const postRows = rows.filter((r) => r.class === 'post' && r.disposition === 'MOVE' && /^\/[^/]+\/$/.test(r.legacy_url));
const mapped = new Set(postRows.map((r) => r.destination));
for (const n of news) {
  const route = `/news/${n.id}/`;
  if (!mapped.has(route)) err(`news article ${n.id} has no legacy post row pointing at it`);
  const h = html(route);
  if (h === null || isRedirectStub(h)) err(`news article ${route} missing from dist/`);
  else if (!/Published\s/.test(h)) err(`news article ${route} has no dated archive banner`);
}
for (const r of postRows) if (!news.some((n) => `/news/${n.id}/` === r.destination)) err(`post ${r.legacy_url} points at ${r.destination}, which is not an article`);
if (postRows.length !== 42 || news.length !== 42) err(`posts accounted for: ${postRows.length} legacy post rows, ${news.length} articles (expected 42/42)`);

// 5. No legacy upload route serves a document (planning/02 §5b, D9).
let docs = 0;
for (const r of rows.filter((x) => x.class === 'media' && /\.(pdf|docx?|xlsx?|pptx?|zip)$/i.test(x.legacy_url))) {
  docs++;
  if (isExternalDest(r.destination) || /\.[a-z0-9]{2,5}$/i.test(r.destination) || !routes.has(splitFragment(r.destination)[0])) err(`${r.legacy_url}: document does not resolve to a landing page (${r.destination})`);
}
for (const f of walkFiles(dist)) {
  if (/\.(pdf|docx?|xlsx?|pptx?|zip)$/i.test(f)) err(`dist/ contains a document: ${path.relative(dist, f)}`);
}
if (fs.existsSync(path.join(dist, 'wp-content')) || fs.existsSync(path.join(dist, 'legacy-media'))) err('dist/ contains a legacy upload tree');

// 6. Derived artifacts are in sync with the manifest.
const stale = generate({ check: true });
if (stale.length) err(`generated files differ from the manifest: ${stale.join(', ')} (run: node scripts/generate-from-manifest.mjs)`);

const byClass = {};
for (const r of rows) byClass[r.class] = (byClass[r.class] ?? 0) + 1;
console.log(`test-manifest (${siteEnv}, base "${base || '/'}", dist ${path.relative(REPO_ROOT, dist) || '.'})`);
console.log(`  manifest rows        ${rows.length}`);
console.log(`  published (KEEP)     ${states.published}`);
console.log(`  merged               ${states.merged}`);
console.log(`  redirected           ${states.redirected}   (incl. ${rows.filter((r) => r.disposition === 'SYSTEM').length} system paths answered 410 at the edge)`);
console.log(`  withheld             ${states.withheld}   (${withheld.filter((r) => r.class === 'page').length} page; the rest are its ID, attachment and media rows)`);
console.log(`  four-state coverage  ${states.published + states.merged + states.redirected + states.withheld}/${rows.length}`);
console.log(`  destinations checked in dist/   ${checkedDest.size}`);
console.log(`  pages scanned for withheld links ${linkScanned}`);
console.log(`  posts accounted for  ${postRows.length}/42 legacy posts, ${news.length}/42 articles in dist/`);
console.log(`  documents in media rows ${docs}, resolved to landing pages`);
console.log(`  by class: ${Object.entries(byClass).map(([k, v]) => `${k} ${v}`).join(', ')}`);
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 40)) console.error('  ' + e);
  process.exit(1);
}
console.log('PASS');
