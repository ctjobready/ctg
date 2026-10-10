#!/usr/bin/env node
/**
 * Checks the WP9 SEO artifacts in dist/ (planning/09 §3, §6, §7):
 *   robots.txt   production: allow all, the AI user agents named in planning/09, sitemap index on the canonical origin;
 *                staging: disallow all
 *   llms.txt     line 1 title, line 2 ENTITY_DEFINITION verbatim, the planning/09 priority resources, production URLs only,
 *                each description equal to that page's own meta description, deprioritised section
 *   robots meta  staging: every page and every redirect stub is noindex; production: only 404 and styleguide are noindex and
 *                redirect stubs carry no robots meta at all
 *   og:image     every card URL exists in dist/ as a 1200x630 PNG of at most 200 KB
 *   sitemap      lists real, indexable pages only (no stub, no 404, no styleguide, no noindex page); every <loc> on the canonical origin
 *
 *   node scripts/verify-seo-files.mjs [dist]       env: SITE_URL, BASE_PATH, SITE_ENV (as astro.config.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, distFile, entityDefinition, envConfig, isRedirectStub, productionOrigin, sitemapPaths, walkFiles } from './manifest-lib.mjs';

const dist = path.resolve(process.argv[2] ?? path.join(REPO_ROOT, 'dist'));
const { base, siteEnv } = envConfig();
const origin = productionOrigin();
const errors = [];
const err = (m) => errors.push(m);
const read = (f) => (fs.existsSync(path.join(dist, f)) ? fs.readFileSync(path.join(dist, f), 'utf8') : null);
if (!fs.existsSync(dist)) {
  console.error(`verify-seo-files: ${dist} not found (build first)`);
  process.exit(1);
}

// ---- robots.txt ---------------------------------------------------------------------------------
const AI = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'Claude-Web', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended'];
const robots = read('robots.txt');
if (robots === null) err('robots.txt missing');
else if (siteEnv === 'production') {
  const groups = robots.split(/\n\s*\n/).map((g) => g.trim()).filter(Boolean);
  const agentsAllowed = new Set();
  for (const g of groups) {
    const agents = [...g.matchAll(/^User-agent:\s*(.+)$/gim)].map((m) => m[1].trim());
    if (/^Disallow:\s*\/\s*$/im.test(g)) err(`robots.txt disallows everything for ${agents.join(', ')}`);
    if (/^Allow:\s*\/\s*$/im.test(g)) agents.forEach((a) => agentsAllowed.add(a));
  }
  for (const a of ['*', ...AI]) if (!agentsAllowed.has(a)) err(`robots.txt does not explicitly allow ${a}`);
  if (!new RegExp(`^Sitemap:\\s*${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/sitemap-index\\.xml\\s*$`, 'm').test(robots)) err(`robots.txt lacks "Sitemap: ${origin}/sitemap-index.xml"`);
} else {
  if (!/^User-agent:\s*\*\s*$/m.test(robots) || !/^Disallow:\s*\/\s*$/m.test(robots)) err('staging robots.txt must disallow everything');
  if (/^Allow:/m.test(robots) || /^Sitemap:/m.test(robots)) err('staging robots.txt must not allow anything or list a sitemap');
}

// ---- llms.txt ------------------------------------------------------------------------------------
const llms = read('llms.txt');
const PRIORITY = ['/', '/about/', '/our-model/talentleap/', '/impact/outcomes-2026/', '/impact/independent-evaluation/', '/programs/youthwide/', '/programs/nationwide/', '/partner-with-us/', '/investors/', '/nu-postgraduate-diploma/'];
let llmsLinks = 0;
if (llms === null) err('llms.txt missing');
else {
  const lines = llms.split('\n');
  if (!/^# \S/.test(lines[0])) err(`llms.txt line 1 is not a title: "${lines[0]}"`);
  if (lines[1] !== entityDefinition()) err('llms.txt line 2 is not ENTITY_DEFINITION verbatim');
  const section = (name) => {
    const i = lines.indexOf(`## ${name}`);
    if (i === -1) {
      err(`llms.txt has no "## ${name}" section`);
      return [];
    }
    const out = [];
    for (let k = i + 1; k < lines.length && !lines[k].startsWith('## '); k++) if (lines[k]) out.push(lines[k]);
    return out;
  };
  const priority = section('Priority resources');
  const reference = section('Canonical reference pages');
  const depri = section('Deprioritised');
  for (const p of PRIORITY) if (!priority.some((l) => l.includes(`(${origin}${p})`))) err(`llms.txt priority resources lack ${p}`);
  if (!depri.some((l) => /redirect stub/i.test(l)) || !depri.some((l) => /styleguide/i.test(l))) err('llms.txt "Deprioritised" must mention redirect stubs and the styleguide');
  for (const l of [...priority, ...reference]) {
    const m = l.match(/^- \[([^\]]+)\]\((https?:\/\/[^)\s]+)\)(?:: (.+))?$/);
    if (!m) {
      err(`llms.txt line is not "- [name](url): description": ${l.slice(0, 80)}`);
      continue;
    }
    llmsLinks++;
    if (!m[2].startsWith(origin + '/')) err(`llms.txt URL is not on ${origin}: ${m[2]}`);
    if (!m[3]) err(`llms.txt has no description for ${m[2]} (run scripts/postbuild-llms.mjs)`);
    const p = m[2].slice(origin.length);
    if (p.endsWith('/')) {
      const html = read(path.join(p, 'index.html'));
      const d = html && html.match(/<meta name="description" content="([^"]*)"/);
      if (!html) err(`llms.txt lists ${p}, which is not in dist/`);
      else if (!d) err(`${p} has no meta description`);
      else {
        const want = d[1].replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        if (m[3] !== want) err(`llms.txt description of ${p} differs from the page's meta description`);
      }
    } else if (!fs.existsSync(path.join(dist, p))) err(`llms.txt lists ${p}, which is not in dist/`);
  }
  if (/\/ctg\//.test(llms) || /github\.io/.test(llms)) err('llms.txt contains a staging URL');
}

// ---- robots meta, og:image, sitemap --------------------------------------------------------------
const noindexOk = new Set(['/404/', '/styleguide/']);
const pngInfo = (file) => {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), bytes: b.length };
};
let pages = 0;
let stubCount = 0;
const cardsSeen = new Set();
const noindexPages = new Set();
/** Every robots-family <meta> of a document, as lower-cased content strings. */
const robotsMetas = (html) => [...html.matchAll(/<meta\b[^>]*>/gi)]
  .map((m) => m[0])
  .filter((t) => /\bname="(robots|googlebot|bingbot)"/i.test(t))
  .map((t) => ((t.match(/\bcontent="([^"]*)"/i) || [])[1] ?? '').toLowerCase().trim());
for (const f of walkFiles(dist)) {
  if (!f.endsWith('.html')) continue;
  const html = fs.readFileSync(f, 'utf8');
  const rel = path.relative(dist, f).split(path.sep).join('/');
  const route = rel === '404.html' ? '/404/' : '/' + rel.replace(/index\.html$/, '');
  if (isRedirectStub(html)) {
    stubCount++;
    // Staging stubs are noindex like every staging page; a production stub never is (a noindex on a redirect source slows consolidation).
    const metas = robotsMetas(html);
    if (siteEnv === 'staging') {
      if (metas.length !== 1 || metas[0] !== 'noindex') err(`${route}: staging redirect stub must carry exactly one <meta name="robots" content="noindex"> (found ${metas.length ? metas.join(', ') : 'none'})`);
    } else if (metas.length || /noindex/i.test(html)) err(`${route}: production redirect stub carries noindex or a robots meta`);
    continue;
  }
  pages++;
  const robotsMeta = (html.match(/<meta name="robots" content="([^"]*)"/) || [])[1];
  if (!robotsMeta) err(`${route}: no robots meta`);
  const noindex = /noindex/i.test(robotsMeta ?? '');
  if (noindex) noindexPages.add(route);
  if (siteEnv === 'staging' && !noindex) err(`${route}: staging page without noindex`);
  if (siteEnv === 'production' && noindex !== noindexOk.has(route)) err(`${route}: production robots meta is "${robotsMeta}"`);
  const og = (html.match(/property="og:image" content="([^"]*)"/) || [])[1];
  if (!og) err(`${route}: no og:image`);
  else {
    const m = og.match(new RegExp(`^${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/og/[a-z-]+\\.png)$`));
    if (m) cardsSeen.add(m[1]);
  }
  // The noindex utility pages (/404/, /styleguide/) carry no canonical link (SEOHead omits it); every other page's canonical is on the production origin.
  if (noindexOk.has(route)) {
    if (/<link rel="canonical"/.test(html)) err(`${route}: utility page carries a canonical link`);
  } else if (!/<link rel="canonical" href="https:\/\/coderstrust\.global\//.test(html)) err(`${route}: canonical is not on the production origin`);
}
for (const c of cardsSeen) {
  const f = path.join(dist, c);
  const info = fs.existsSync(f) ? pngInfo(f) : null;
  if (!info) err(`og card ${c} missing or not a PNG in dist/`);
  else {
    if (info.w !== 1200 || info.h !== 630) err(`og card ${c} is ${info.w}x${info.h}, expected 1200x630`);
    if (info.bytes > 200 * 1024) err(`og card ${c} is ${info.bytes} bytes (> 200 KB)`);
  }
}
const sitemapIndex = read('sitemap-index.xml');
if (!sitemapIndex || !/<loc>[^<]*sitemap-0\.xml<\/loc>/.test(sitemapIndex)) err('sitemap-index.xml missing or does not list sitemap-0.xml');
// Every <loc>, the index's too, is on the canonical origin in every environment (the origin the page canonicals use).
for (const f of fs.readdirSync(dist).filter((n) => /^sitemap-(index|\d+)\.xml$/.test(n))) {
  for (const m of fs.readFileSync(path.join(dist, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    if (!m[1].startsWith(origin + '/')) err(`${f}: <loc> ${m[1]} is not on the canonical origin ${origin}`);
  }
}
const sm = sitemapPaths(dist, base);
for (const p of sm) {
  const f = distFile(dist, p);
  if (!fs.existsSync(f)) err(`sitemap lists ${p}, not in dist/`);
  else if (isRedirectStub(fs.readFileSync(f, 'utf8'))) err(`sitemap lists redirect stub ${p}`);
  // Staging pages are all noindex by design (and still listed); the utility pages never are, in any environment.
  if (noindexOk.has(p) || (siteEnv === 'production' && noindexPages.has(p))) err(`sitemap lists noindex/utility page ${p}`);
}
const utilityBuilt = [...noindexOk].filter((r) => fs.existsSync(distFile(dist, r)) || (r === '/404/' && fs.existsSync(path.join(dist, '404.html')))).length;
if (sm.length !== pages - utilityBuilt) err(`sitemap has ${sm.length} URLs for ${pages} built pages minus ${utilityBuilt} utility pages`);

console.log(`verify-seo-files (${siteEnv}, base "${base || '/'}", dist ${path.relative(REPO_ROOT, dist) || '.'})`);
console.log(`  robots.txt   ${siteEnv === 'production' ? `allow all + ${AI.length} AI user agents + sitemap index` : 'disallow all'}`);
console.log(`  llms.txt     ${llmsLinks} link lines, each description equal to the page's meta description`);
console.log(`  pages        ${pages}, ${noindexPages.size} noindex${siteEnv === 'production' ? ` (${[...noindexPages].sort().join(', ') || 'none'})` : ' (staging: all, by design)'}; ${stubCount} redirect stubs ${siteEnv === 'production' ? 'carry no noindex or robots meta' : 'all carry noindex (staging)'}`);
console.log(`  og cards     ${[...cardsSeen].sort().map((c) => c.replace('/og/', '')).join(', ')}`);
console.log(`  sitemap      ${sm.length} URLs, no stub, no utility page`);
if (errors.length) {
  console.error(`\nFAIL: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 40)) console.error('  ' + e);
  process.exit(1);
}
console.log('PASS');
