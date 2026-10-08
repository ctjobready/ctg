#!/usr/bin/env node
/**
 * Redirect map test (planning/10 §1 "Redirect map", planning/08 §7 "Tests"): after `astro build` and
 * `node scripts/postbuild-redirects.mjs`, every path-based manifest row with a stub disposition must
 *   - exist in dist/ as a redirect stub,
 *   - point (meta refresh + canonical + visible link + JS replace) to its mapped destination,
 *   - not chain (the destination is never itself a stub),
 *   - carry no `noindex`,
 * and no stub path may collide with a real page or appear in the sitemap.
 *
 *   node scripts/test-redirects.mjs [dist]       env: SITE_URL, BASE_PATH, SITE_ENV (as astro.config.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
  canonicalOf,
  deployedHref,
  distFile,
  envConfig,
  isExternalDest,
  isRedirectStub,
  loadManifest,
  needsStub,
  productionOrigin,
  readRedirectsTs,
  renderRedirectsTs,
  REDIRECTS_TS_PATH,
  siteRoutes,
  sitemapPaths,
  splitFragment,
  walkFiles,
} from './manifest-lib.mjs';

const dist = path.resolve(process.argv[2] ?? path.join(REPO_ROOT, 'dist'));
const { base, siteEnv } = envConfig();
const origin = productionOrigin();
const errors = [];
const err = (m) => errors.push(m);

if (!fs.existsSync(dist)) {
  console.error(`test-redirects: ${dist} not found (build first)`);
  process.exit(1);
}

const rows = loadManifest();
const stubRows = rows.filter(needsStub);
const stubPaths = new Set(stubRows.map((r) => r.legacy_url));
const routes = siteRoutes();

// 0. src/data/redirects.ts is generated from the manifest, never maintained by hand.
if (fs.readFileSync(REDIRECTS_TS_PATH, 'utf8') !== renderRedirectsTs(rows)) err('src/data/redirects.ts is not what the manifest produces (run: node scripts/generate-from-manifest.mjs)');
const ts = readRedirectsTs();
if (ts.length !== stubRows.length) err(`src/data/redirects.ts has ${ts.length} entries, the manifest has ${stubRows.length} stub rows`);

// 1. No stub may shadow a real route, and no redirect may chain.
for (const r of stubRows) {
  if (routes.has(r.legacy_url)) err(`${r.legacy_url}: stub path equals a real route of the site`);
  const [dest] = splitFragment(r.destination);
  if (!isExternalDest(r.destination) && stubPaths.has(dest)) err(`${r.legacy_url}: chain, destination ${r.destination} is itself a redirect source`);
}

// 2. Every stub exists and points at its mapped destination.
const attr = (html, re) => (html.match(re) || [])[1];
const unesc = (s) => (s ?? '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
let verified = 0;
let internal = 0;
let external = 0;
for (const r of stubRows) {
  const file = distFile(dist, r.legacy_url);
  if (!fs.existsSync(file)) {
    err(`${r.legacy_url}: no stub in dist/ (${path.relative(dist, file)})`);
    continue;
  }
  const html = fs.readFileSync(file, 'utf8');
  if (!isRedirectStub(html)) {
    err(`${r.legacy_url}: ${path.relative(dist, file)} is not a redirect stub (a real page sits on a legacy path)`);
    continue;
  }
  const href = deployedHref(r.destination, base);
  const canonical = canonicalOf(r.destination, origin);
  const refresh = unesc(attr(html, /<meta[^>]+http-equiv="refresh"[^>]+content="([^"]*)"/i));
  const canon = unesc(attr(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i));
  const link = unesc(attr(html, /<a[^>]+href="([^"]*)"/i));
  const js = attr(html, /location\.replace\(("[^"]*")\)/);
  const bad = [];
  if (refresh !== `0;url=${href}`) bad.push(`refresh "${refresh}" != "0;url=${href}"`);
  if (canon !== canonical) bad.push(`canonical "${canon}" != "${canonical}"`);
  if (link !== href) bad.push(`link "${link}" != "${href}"`);
  if (!js || JSON.parse(js) !== href) bad.push(`location.replace ${js} != "${href}"`);
  if (!/<html lang="en"[ >]/.test(html)) bad.push('missing lang="en"');
  if (!/<title>[^<]+<\/title>/.test(html)) bad.push('missing <title>');
  if (/noindex/i.test(html)) bad.push('contains noindex');
  if (isExternalDest(r.destination)) {
    if (!href.startsWith('https://')) bad.push('external destination is not absolute');
    external++;
  } else {
    if (siteEnv === 'staging' && base && !href.startsWith(base + '/')) bad.push(`staging refresh does not start with ${base}/`);
    if (siteEnv === 'production' && !href.startsWith('/')) bad.push('production refresh is not site-rooted');
    if (!canon.startsWith(origin + '/')) bad.push('canonical is not on the production origin');
    internal++;
    // No chain through the built site: the destination page exists and is a page, not another stub.
    const [dp] = splitFragment(r.destination);
    const df = distFile(dist, dp);
    if (!fs.existsSync(df)) bad.push(`destination ${dp} does not exist in dist/`);
    else if (isRedirectStub(fs.readFileSync(df, 'utf8'))) bad.push(`destination ${dp} is itself a redirect stub (chain)`);
  }
  if (bad.length) err(`${r.legacy_url}: ${bad.join('; ')}`);
  else verified++;
}

// 3. No stray stubs, no noindex on any stub, no real page overwritten.
let stubsInDist = 0;
let noindexStubs = 0;
let pages = 0;
for (const f of walkFiles(dist)) {
  if (!f.endsWith('.html')) continue;
  const html = fs.readFileSync(f, 'utf8');
  if (isRedirectStub(html)) {
    stubsInDist++;
    if (/noindex/i.test(html)) noindexStubs++;
    const route = '/' + path.relative(dist, path.dirname(f)).split(path.sep).join('/') + '/';
    if (!stubPaths.has(route)) err(`${path.relative(dist, f)}: redirect stub that is not a manifest row`);
  } else pages++;
}
if (stubsInDist !== stubRows.length) err(`${stubsInDist} stubs in dist/, ${stubRows.length} stub rows in the manifest`);
if (noindexStubs) err(`${noindexStubs} stub(s) contain noindex`);
for (const route of routes) {
  const f = distFile(dist, route);
  if (!fs.existsSync(f)) err(`route ${route} was not built`);
  else if (isRedirectStub(fs.readFileSync(f, 'utf8'))) err(`route ${route} was overwritten by a redirect stub`);
}

// 4. Stubs stay out of the sitemap, and every sitemap URL is a real page.
const sm = sitemapPaths(dist, base);
for (const p of sm) {
  if (stubPaths.has(p)) err(`sitemap lists redirect stub ${p}`);
  else if (!fs.existsSync(distFile(dist, p))) err(`sitemap lists ${p}, which is not in dist/`);
}

console.log(`test-redirects (${siteEnv}, base "${base || '/'}", dist ${path.relative(REPO_ROOT, dist) || '.'})`);
console.log(`  stub rows in manifest      ${stubRows.length} (${internal} internal, ${external} external)`);
console.log(`  stubs verified             ${verified}`);
console.log(`  stubs in dist/             ${stubsInDist}`);
console.log(`  stubs containing noindex   ${noindexStubs}`);
console.log(`  real pages in dist/        ${pages}`);
console.log(`  sitemap URLs               ${sm.length}, none is a stub`);
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 40)) console.error('  ' + e);
  process.exit(1);
}
console.log('PASS');
