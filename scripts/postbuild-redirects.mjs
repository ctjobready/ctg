#!/usr/bin/env node
/**
 * Post-processes every Astro redirect stub in dist/ (planning/02 §5, planning/08 §7, planning/09 §7).
 *
 * Astro's default stub carries `<meta name="robots" content="noindex">` and a canonical on the deployment host. A
 * noindex on a redirecting URL asks search engines to drop it and can stop the signal passing to the destination,
 * so each stub is rewritten as:
 *   - <html lang="en">, <title>, meta refresh 0 to the base-aware destination
 *       (staging /ctg/...; production /...; external destinations absolute),
 *   - <link rel="canonical"> to the PRODUCTION destination URL (PRODUCTION_ORIGIN from src/lib/site.ts; externals as-is),
 *   - a JavaScript location.replace and a visible fallback link,
 *   - NO noindex.
 *
 * Fails loudly (exit 1) when a stub path holds a real page, when a stub was not emitted, or when an unexpected
 * redirect stub is found in dist/.
 *
 * As its last step it also runs scripts/postbuild-llms.mjs (page meta descriptions into dist/llms.txt), so this one
 * command finishes dist/.
 *
 *   node scripts/postbuild-redirects.mjs [dist]        env: SITE_URL, BASE_PATH, SITE_ENV (as astro.config.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, canonicalOf, deployedHref, envConfig, isExternalDest, productionOrigin, readRedirectsTs, splitFragment } from './manifest-lib.mjs';

const dist = path.resolve(process.argv[2] ?? path.join(REPO_ROOT, 'dist'));
const { base, siteEnv } = envConfig();
const origin = productionOrigin();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// Destinations only contain URL-safe characters (validated in the manifest); "<" is escaped as belt and braces.
const jsString = (s) => JSON.stringify(s).replace(/</g, '\\u003c');

/** Astro's own stub (compressHTML on or off). */
const isAstroStub = (html) => /^<!doctype html>\s*<title>Redirecting to:/i.test(html) && /http-equiv="refresh"/i.test(html);
/** A stub this script already rewrote (the script is idempotent). */
const isOurStub = (html) => /<html lang="en" data-redirect-stub>/.test(html);

function stubHtml(to) {
  const href = deployedHref(to, base);
  const canonical = canonicalOf(to, origin);
  const label = isExternalDest(to) ? to.replace(/^https?:\/\//, '') : to;
  return `<!doctype html>
<html lang="en" data-redirect-stub>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Redirecting to ${esc(label)}</title>
<meta http-equiv="refresh" content="0;url=${esc(href)}">
<link rel="canonical" href="${esc(canonical)}">
<script>location.replace(${jsString(href)})</script>
</head>
<body>
<p>This page has moved. <a href="${esc(href)}">Continue to ${esc(label)}</a>.</p>
</body>
</html>
`;
}

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(p);
    else if (ent.name.endsWith('.html')) yield p;
  }
}

if (!fs.existsSync(dist)) {
  console.error(`postbuild-redirects: ${dist} does not exist (run the build first)`);
  process.exit(1);
}

const entries = readRedirectsTs();
const problems = [];
const stubFiles = new Set();
let written = 0;

const countPages = () => [...walk(dist)].filter((f) => {
  const h = fs.readFileSync(f, 'utf8');
  return !isAstroStub(h) && !isOurStub(h);
}).length;
const pagesBefore = countPages();

for (const { from, to } of entries) {
  if (!/^\/[A-Za-z0-9._~%!$&()*+,;=:@/-]*\/$/.test(from) || from.includes('..')) {
    problems.push(`${from}: not a clean path with a trailing slash`);
    continue;
  }
  const file = path.join(dist, from, 'index.html');
  if (!file.startsWith(dist + path.sep)) {
    problems.push(`${from}: resolves outside dist/`);
    continue;
  }
  if (!fs.existsSync(file)) {
    problems.push(`${from}: no stub was emitted at ${path.relative(dist, file)} (is it in astro.config.mjs redirects?)`);
    continue;
  }
  const current = fs.readFileSync(file, 'utf8');
  if (!isAstroStub(current) && !isOurStub(current)) {
    problems.push(`${from}: ${path.relative(dist, file)} is a real page, refusing to overwrite it with a redirect stub`);
    continue;
  }
  if (!to || (!isExternalDest(to) && !to.startsWith('/'))) {
    problems.push(`${from}: invalid destination "${to}"`);
    continue;
  }
  fs.writeFileSync(file, stubHtml(to));
  stubFiles.add(file);
  written++;
}

// Any stub not accounted for by the redirect list is a mistake (a stale entry or a page that turned into a redirect).
for (const f of walk(dist)) {
  if (stubFiles.has(f)) continue;
  const h = fs.readFileSync(f, 'utf8');
  if (isAstroStub(h) || isOurStub(h)) problems.push(`${path.relative(dist, f)}: redirect stub that is not in src/data/redirects.ts`);
}

const pagesAfter = countPages();
if (pagesBefore !== pagesAfter) problems.push(`page count changed during post-processing (${pagesBefore} -> ${pagesAfter})`);

if (problems.length) {
  console.error(`postbuild-redirects: FAIL (${problems.length})`);
  for (const p of problems.slice(0, 40)) console.error('  ' + p);
  process.exit(1);
}
console.log(`postbuild-redirects: ${written} stubs rewritten (${siteEnv}, base "${base || '/'}"); ${pagesAfter} real pages untouched`);

// Second post-build step, kept here so one command finishes dist/: add each page's own meta description to llms.txt.
try {
  const { fillLlmsDescriptions } = await import('./postbuild-llms.mjs');
  console.log(`postbuild-llms: ${fillLlmsDescriptions(dist)} descriptions added to llms.txt`);
} catch (e) {
  console.error(`postbuild-llms: FAIL ${e.message}`);
  process.exit(1);
}
