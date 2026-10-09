#!/usr/bin/env node
/**
 * SEO lint over dist/ (planning/10 §1 "SEO lint" and "Title length", planning/09 §3 and §7, planning/08 §9).
 *
 *   node scripts/check-seo.mjs [--dist dist] [--base /ctg] [--env staging|production] [--out .work/qa]
 *
 * Every page except redirect stubs (pages with a meta refresh):
 *   <html lang="en"> · exactly one non-empty <title>, at most 60 characters, unique · exactly one meta description,
 *   unique (length ≤ 155 and ≥ 50 are warnings) · exactly one <h1> · canonical present, absolute, https://coderstrust.global
 *   + the route with its trailing slash, only one (the noindex utility pages /404/ and /styleguide/ carry none) · robots: staging pages carry noindex, production pages do not
 *   (utility pages /404/ and /styleguide/ may) · og:title, og:description, og:image (absolute https), og:url (= canonical)
 *   and twitter:card · charset and viewport · JSON-LD present, every block parses, @graph holds Organization and WebSite
 *   · referrer policy strict-origin-when-cross-origin and a Content-Security-Policy meta that keeps scripts, fonts, connections and
 *   objects same-origin and frames limited to the click-to-load video hosts (doc 08 §9)
 *   · every <img> has an alt attribute (alt="" marks decorative images) and numeric width and height
 *   · external <a> links carry rel="noopener" (error) and rel="noreferrer" unless the host is one of our own sites (OWN_HOSTS in
 *   src/lib/externalRel.ts) or in src/data/partners.ts (warning;
 *   no other partner list is assumed) · heading levels do not skip downwards (warning)
 * Redirect stubs: robots follows the environment (staging: exactly `noindex`, like every staging page; production: no noindex),
 * a canonical that matches the refresh target, a visible fallback link (warning).
 * Sitemap: sitemap-index.xml and its sitemaps list exactly the non-stub pages except /404/ and /styleguide/.
 *
 * Output: console summary, .work/qa/seo.json and seo.md (seo.production.* for SITE_ENV=production).
 */
import {
  PRODUCTION_ORIGIN, REPO_ROOT, Findings, classifyUrl, describeConfig, elements, fatal, findingsMarkdown, first, jsonLdBlocks, join, loadConfig, loadSite,
  loadSiteData, mdTable, metaContent, pageTitle, plainText, printFindings, publicPath, readFileSync, snippet, trunc, writeReports,
} from './lib/dist.mjs';

const cfg = loadConfig(process.argv.slice(2));
let site;
try {
  site = loadSite(cfg);
} catch (e) {
  fatal(`check-seo: ${e.message}`);
}
const data = loadSiteData();
const findings = new Findings();
for (const e of data.errors) findings.warn('site-data', 'src/', e);

/**
 * CodersTrust's own sites (OWN_HOSTS in src/lib/externalRel.ts, planning/08 §9): links to them keep the referrer and carry
 * rel="noopener" only, like links to partner organizations. Read from that file so the rule has one source; the check warns
 * if the list cannot be found, rather than silently treating every own-site link as a missing noreferrer.
 */
const ownHosts = (() => {
  const m = /export const OWN_HOSTS[^=]*=\s*\[([^\]]*)\]/.exec(readFileSync(join(REPO_ROOT, 'src/lib/externalRel.ts'), 'utf8'));
  const hosts = m ? [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1].toLowerCase().replace(/^www\./, '')) : [];
  if (!hosts.length) findings.warn('site-data', 'src/lib/externalRel.ts', 'could not read OWN_HOSTS (own-site links will be reported as missing noreferrer)');
  return new Set(hosts);
})();
console.log(`check-seo: ${site.pages.length} pages  (${describeConfig(cfg)})`);

const TITLE_MAX = 60;
const DESC_MAX = 155;
const DESC_MIN = 50;
const HOME_TITLE = /^CodersTrust\b/;
const NOINDEX_OK_IN_PRODUCTION = new Set(['/404/', '/styleguide/']);
const NOT_IN_SITEMAP = new Set(['/404/', '/styleguide/']);
/** Noindex utility pages are not canonical documents: SEOHead omits the canonical link on them. Any other page without one is an error. */
const NO_CANONICAL_OK = new Set(['/404/', '/styleguide/']);
const TWITTER_CARDS = new Set(['summary', 'summary_large_image', 'app', 'player']);

const REFERRER_POLICY = 'strict-origin-when-cross-origin';
const VIDEO_FRAME_ORIGINS = new Set(['https://www.youtube-nocookie.com']);

/**
 * doc 08 §9 states the shipped CSP; hardening to hashes is allowed later, so the check is rule-based rather than an exact match:
 * same-origin defaults, no third-party scripts, no eval, plugins off, base/form locked, frames limited to the click-to-load video hosts.
 */
function cspProblems(text) {
  const d = new Map(text.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [name, ...vals] = s.split(/\s+/); return [name.toLowerCase(), vals]; }));
  const out = [];
  const only = (name, allowed, label = name) => {
    const vals = d.get(name);
    if (!vals) return out.push(`CSP has no ${label} directive`);
    const bad = vals.filter((v) => !allowed.has(v.toLowerCase()) && !/^'(sha(256|384|512)|nonce)-/.test(v));
    if (bad.length) out.push(`CSP ${label} allows ${bad.join(' ')}`);
  };
  if (!d.has('default-src') || d.get('default-src').join(' ') !== "'self'") out.push(`CSP default-src is ${JSON.stringify((d.get('default-src') ?? []).join(' '))}, expected 'self'`);
  only('script-src', new Set(["'self'", "'unsafe-inline'"]));
  only('style-src', new Set(["'self'", "'unsafe-inline'"]));
  only('img-src', new Set(["'self'", 'data:']));
  only('font-src', new Set(["'self'"]));
  only('connect-src', new Set(["'self'"]));
  only('frame-src', VIDEO_FRAME_ORIGINS);
  only('object-src', new Set(["'none'"]));
  only('base-uri', new Set(["'self'"]));
  only('form-action', new Set(["'self'"]));
  return out;
}

const len = (s) => [...s].length;
const robotsTokens = (doc) => {
  const tokens = [];
  for (const m of elements(doc, 'meta')) {
    const name = (m.attrs.name ?? '').toLowerCase();
    if (name === 'robots' || name === 'googlebot' || name === 'bingbot') tokens.push(...(m.attrs.content ?? '').toLowerCase().split(/[\s,]+/).filter(Boolean));
  }
  return tokens;
};
const normPath = (p) => (p.length > 1 && !p.endsWith('/') && !/\.[a-z0-9]+$/i.test(p) ? p + '/' : p);

const rows = [];
const titles = new Map();
const descriptions = new Map();
const externalNoReferrer = new Map(); // host -> {pages:Set, count}
let stubs = 0;
let checkedImages = 0;
let checkedLinks = 0;

for (const page of site.pages) {
  const doc = page.doc;
  const where = page.rel;
  const route = page.route;
  const robots = robotsTokens(doc);
  const canon = elements(doc, 'link').filter((l) => (l.attrs.rel ?? '').toLowerCase().split(/\s+/).includes('canonical'));

  /* ---------------- redirect stubs ---------------- */
  if (page.isStub) {
    stubs++;
    if (cfg.siteEnv === 'staging') {
      // Staging stubs are noindex like every staging page (the staging host must never be indexed).
      if (!robots.includes('noindex')) findings.error('stub-missing-noindex', where, 'staging redirect stub has no robots noindex (the staging host must not be indexed)', { evidence: `robots: ${robots.join(', ') || '(none)'}` });
    } else if (robots.includes('noindex')) {
      findings.error('stub-has-noindex', where, 'production redirect stub carries noindex (a noindex on a redirect source slows consolidation; doc 08 §7)', { evidence: robots.join(',') });
    }
    if (canon.length !== 1) {
      findings.error('stub-canonical', where, canon.length ? 'redirect stub has more than one canonical' : 'redirect stub has no <link rel="canonical"> to its destination (doc 08 §7)');
    } else {
      const target = page.refresh;
      let wantPath = null;
      let wantExternal = null;
      try {
        const t = new URL(target, `${cfg.siteUrl}${publicPath(cfg, route)}`);
        if (t.origin === new URL(cfg.siteUrl).origin || t.origin === PRODUCTION_ORIGIN) {
          wantPath = t.pathname.startsWith(cfg.base + '/') || t.pathname === cfg.base ? t.pathname.slice(cfg.base.length) || '/' : t.pathname;
        } else wantExternal = t.href;
      } catch {
        /* handled below */
      }
      const href = canon[0].attrs.href ?? '';
      let ok = false;
      try {
        const cu = new URL(href);
        ok = wantExternal ? cu.href === wantExternal : cu.origin === PRODUCTION_ORIGIN && cu.pathname === wantPath;
      } catch {
        ok = false;
      }
      if (!ok) findings.error('stub-canonical-mismatch', where, `canonical ${trunc(href, 120)} does not match the redirect target ${trunc(target ?? '', 120)}`, { evidence: snippet(page.source, canon[0]) });
    }
    if (!elements(doc, 'a').some((a) => a.attrs.href)) findings.warn('stub-no-fallback-link', where, 'redirect stub has no visible fallback link (doc 08 §7)');
    continue;
  }

  /* ---------------- html lang ---------------- */
  const html = first(doc, 'html');
  if (!html) findings.error('html-missing', where, 'no <html> element');
  else if (html.attrs.lang !== 'en') findings.error('html-lang', where, `<html lang> is ${html.attrs.lang === undefined ? 'missing' : JSON.stringify(html.attrs.lang)}, expected "en"`, { evidence: snippet(page.source, html) });

  /* ---------------- charset / viewport ---------------- */
  if (!elements(doc, 'meta').some((m) => m.attrs.charset !== undefined || (m.attrs['http-equiv'] ?? '').toLowerCase() === 'content-type')) findings.error('meta-charset', where, 'no <meta charset>');
  if (!/width=device-width/.test(metaContent(doc, { name: 'viewport' }) ?? '')) findings.error('meta-viewport', where, 'no <meta name="viewport" content="width=device-width, …">');

  /* ---------------- referrer policy and CSP (doc 08 §9) ---------------- */
  const referrer = metaContent(doc, { name: 'referrer' });
  if (referrer !== REFERRER_POLICY) findings.error('referrer-policy', where, `<meta name="referrer"> is ${referrer === null ? 'missing' : JSON.stringify(referrer)}, expected "${REFERRER_POLICY}"`);
  const cspText = metaContent(doc, { httpEquiv: 'content-security-policy' });
  if (cspText === null) findings.error('csp-missing', where, 'no <meta http-equiv="Content-Security-Policy"> (doc 08 §9)');
  else for (const problem of cspProblems(cspText)) findings.error('csp-policy', where, problem, { evidence: trunc(cspText, 200) });

  /* ---------------- title ---------------- */
  const titleEls = elements(doc, 'title').filter((t) => !t.ns);
  const title = pageTitle(doc);
  if (titleEls.length !== 1) findings.error('title-count', where, `${titleEls.length} <title> elements (exactly one required)`);
  if (!title) findings.error('title-missing', where, 'empty or missing <title>');
  else {
    const n = len(title);
    if (n > TITLE_MAX) findings.error('title-too-long', where, `title is ${n} characters (limit ${TITLE_MAX})`, { evidence: title });
    if (!titles.has(title)) titles.set(title, []);
    titles.get(title).push(route);
    if (!/ \| CodersTrust$/.test(title) && !(route === '/' && HOME_TITLE.test(title))) findings.warn('title-pattern', where, 'title does not follow "{Page} | CodersTrust" (doc 09 §3)', { evidence: title });
    if (title.includes('…') || title.includes('...')) findings.warn('title-truncated', where, 'title is cut off with an ellipsis (shorten the headline instead of truncating it)', { evidence: title });
    if (/^\p{Ll}/u.test(title)) findings.warn('title-starts-lowercase', where, 'title starts with a lowercase letter (a leading word was probably stripped)', { evidence: title });
  }

  /* ---------------- description ---------------- */
  const descEls = elements(doc, 'meta').filter((m) => (m.attrs.name ?? '').toLowerCase() === 'description');
  const description = descEls[0]?.attrs.content?.trim() ?? '';
  if (descEls.length !== 1) findings.error('description-count', where, `${descEls.length} meta descriptions (exactly one required)`);
  if (descEls.length && !description) findings.error('description-missing', where, 'empty meta description');
  if (description) {
    if (len(description) > DESC_MAX) findings.warn('description-too-long', where, `description is ${len(description)} characters (target ≤ ${DESC_MAX}, doc 09 §3)`, { evidence: description });
    if (len(description) < DESC_MIN) findings.warn('description-too-short', where, `description is only ${len(description)} characters`, { evidence: description });
    if (!descriptions.has(description)) descriptions.set(description, []);
    descriptions.get(description).push(route);
  }

  /* ---------------- headings ---------------- */
  const h1s = elements(doc, 'h1').filter((h) => !h.ns);
  if (h1s.length !== 1) findings.error('h1-count', where, `${h1s.length} <h1> elements (exactly one required)`, { evidence: h1s.map((h) => trunc(plainText(h), 60)).join(' | ') });
  else if (!plainText(h1s[0])) findings.error('h1-empty', where, '<h1> has no text', { evidence: snippet(page.source, h1s[0]) });
  let prev = 0;
  const skips = [];
  for (const h of elements(doc, 'h1').concat(elements(doc, 'h2'), elements(doc, 'h3'), elements(doc, 'h4'), elements(doc, 'h5'), elements(doc, 'h6')).filter((h) => !h.ns).sort((a, b) => a.start - b.start)) {
    const level = Number(h.tag[1]);
    if (prev && level > prev + 1) skips.push(`h${prev} → h${level} "${trunc(plainText(h), 40)}"`);
    prev = level;
  }
  if (skips.length) findings.warn('heading-order', where, `heading level skipped ${skips.length} time(s): ${skips.slice(0, 3).join('; ')}`);

  /* ---------------- canonical ---------------- */
  let canonicalHref = null;
  if (canon.length === 0) {
    if (!NO_CANONICAL_OK.has(route)) findings.error('canonical-missing', where, 'no <link rel="canonical">');
    else if (!robots.includes('noindex')) findings.error('canonical-missing', where, 'utility page without a canonical must carry robots noindex');
  } else {
    if (canon.length > 1) findings.error('canonical-multiple', where, `${canon.length} canonical links`);
    canonicalHref = canon[0].attrs.href ?? '';
    let u = null;
    try {
      u = new URL(canonicalHref);
    } catch {
      /* not absolute */
    }
    const ev = snippet(page.source, canon[0]);
    if (!u || !/^https?:\/\//i.test(canonicalHref)) findings.error('canonical-not-absolute', where, `canonical "${trunc(canonicalHref, 100)}" is not an absolute URL`, { evidence: ev });
    else {
      if (u.origin !== PRODUCTION_ORIGIN) findings.error('canonical-wrong-origin', where, `canonical origin is ${u.origin}, expected ${PRODUCTION_ORIGIN} (doc 09 §3: always the production domain, also on staging)`, { evidence: ev });
      else {
        if (u.search || u.hash) findings.error('canonical-query-or-hash', where, 'canonical carries a query string or fragment', { evidence: ev });
        const want = PRODUCTION_ORIGIN + route;
        if (u.origin + u.pathname !== want) {
          const slashOnly = normPath(u.pathname) === route;
          findings.error(slashOnly ? 'canonical-no-trailing-slash' : 'canonical-route-mismatch', where, `canonical is ${u.origin + u.pathname}, expected ${want}`, { evidence: ev });
        }
      }
    }
  }

  /* ---------------- robots ---------------- */
  const noindex = robots.includes('noindex');
  if (cfg.siteEnv === 'staging') {
    if (!noindex) findings.error('staging-missing-noindex', where, 'staging page has no robots noindex (doc 08 §2)', { evidence: `robots: ${robots.join(', ') || '(none)'}` });
  } else if (noindex || robots.includes('nofollow')) {
    if (NOINDEX_OK_IN_PRODUCTION.has(route)) findings.info('production-noindex-utility', where, `utility page carries ${robots.join(', ')} in production (allowed)`);
    else findings.error('production-noindex', where, `production page carries robots "${robots.join(', ')}"`, { evidence: robots.join(',') });
  }

  /* ---------------- Open Graph / Twitter ---------------- */
  const og = (p) => metaContent(doc, { property: p });
  const tw = (n) => metaContent(doc, { name: n });
  for (const key of ['og:title', 'og:description', 'og:image', 'og:url']) if (!og(key)) findings.error('og-missing', where, `<meta property="${key}"> missing or empty`);
  const card = tw('twitter:card');
  if (!card) findings.error('twitter-card-missing', where, '<meta name="twitter:card"> missing or empty');
  else if (!TWITTER_CARDS.has(card)) findings.error('twitter-card-invalid', where, `twitter:card "${card}" is not one of ${[...TWITTER_CARDS].join(', ')}`);
  const ogImage = og('og:image');
  if (ogImage && !/^https:\/\//i.test(ogImage)) findings.error('og-image-not-absolute', where, `og:image "${trunc(ogImage, 100)}" is not an absolute https URL`);
  if (og('og:url') && canonicalHref && og('og:url') !== canonicalHref) findings.error('og-url-canonical-mismatch', where, `og:url ${og('og:url')} differs from the canonical ${canonicalHref}`);
  if (ogImage && !og('og:image:alt')) findings.warn('og-image-alt-missing', where, 'og:image has no og:image:alt');
  if (!tw('twitter:title') && !og('og:title')) findings.warn('twitter-title-missing', where, 'no twitter:title (and no og:title fallback)');

  /* ---------------- JSON-LD ---------------- */
  const blocks = jsonLdBlocks(doc);
  if (!blocks.length) findings.error('jsonld-missing', where, 'no JSON-LD block (Organization + WebSite on every page, doc 09 §2)');
  if (blocks.length > 1) findings.warn('jsonld-multiple', where, `${blocks.length} JSON-LD scripts (doc 09 §2: one @graph script per page)`);
  for (const b of blocks) {
    if (b.error) {
      findings.error('jsonld-parse', where, `JSON-LD does not parse: ${b.error}`, { evidence: trunc(b.text, 160) });
      continue;
    }
    const json = b.json;
    const nodes = Array.isArray(json?.['@graph']) ? json['@graph'] : [json];
    if (!/^https?:\/\/schema\.org\/?$/.test(String(json?.['@context'] ?? ''))) findings.warn('jsonld-context', where, `@context is ${JSON.stringify(json?.['@context'])}, expected https://schema.org`);
    const ids = new Set(nodes.map((n) => n?.['@id']).filter(Boolean));
    const types = new Set();
    for (const [i, n] of nodes.entries()) {
      if (!n || typeof n !== 'object' || !n['@type']) {
        findings.warn('jsonld-node-type', where, `@graph node ${i} has no @type`, { evidence: trunc(JSON.stringify(n), 120) });
        continue;
      }
      for (const t of [].concat(n['@type'])) types.add(t);
    }
    if (!types.has('Organization')) findings.warn('jsonld-no-organization', where, 'JSON-LD graph has no Organization node');
    if (!types.has('WebSite')) findings.warn('jsonld-no-website', where, 'JSON-LD graph has no WebSite node');
    // references of the form {"@id": "..."} that point at the page's own origin must be defined in the graph
    const dangling = new Set();
    const scan = (v, top) => {
      if (Array.isArray(v)) return v.forEach((x) => scan(x, false));
      if (v && typeof v === 'object') {
        const keys = Object.keys(v);
        if (!top && keys.length === 1 && keys[0] === '@id' && String(v['@id']).startsWith(PRODUCTION_ORIGIN) && !ids.has(v['@id'])) dangling.add(v['@id']);
        keys.forEach((k) => scan(v[k], false));
      }
    };
    nodes.forEach((n) => scan(n, true));
    if (dangling.size) findings.warn('jsonld-dangling-id', where, `@id reference(s) not defined in the graph: ${[...dangling].slice(0, 3).join(', ')}`);
    if (canonicalHref) {
      for (const n of nodes) {
        const t = [].concat(n?.['@type'] ?? []);
        if (n?.url && t.some((x) => /^(WebPage|AboutPage|ContactPage|CollectionPage|ProfilePage|FAQPage|QAPage|CheckoutPage|ItemPage)$/.test(x)) && n.url !== canonicalHref) {
          findings.warn('jsonld-url-mismatch', where, `${t.join('/')} url ${n.url} differs from the canonical ${canonicalHref}`);
        }
      }
    }
  }

  /* ---------------- images ---------------- */
  for (const img of elements(doc, 'img').filter((i) => !i.ns)) {
    checkedImages++;
    const ev = snippet(page.source, img);
    if (img.attrs.alt === undefined) findings.error('img-no-alt', where, '<img> without an alt attribute (use alt="" for decorative images)', { evidence: ev });
    else if (img.attrs.alt !== '' && !img.attrs.alt.trim()) findings.error('img-alt-blank', where, '<img> with a whitespace-only alt', { evidence: ev });
    else if (/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(img.attrs.alt.trim()) || /^(IMG|DSC|image)[-_ ]?\d+/i.test(img.attrs.alt.trim())) findings.warn('img-alt-filename', where, `alt looks like a file name: "${trunc(img.attrs.alt, 60)}"`, { evidence: ev });
    else if (len(img.attrs.alt) > 150) findings.warn('img-alt-long', where, `alt is ${len(img.attrs.alt)} characters`, { evidence: ev });
    for (const dim of ['width', 'height']) {
      if (!/^\d+$/.test((img.attrs[dim] ?? '').trim()) || Number(img.attrs[dim]) <= 0) findings.error('img-no-dimensions', where, `<img> ${dim} is ${img.attrs[dim] === undefined ? 'missing' : JSON.stringify(img.attrs[dim])} (explicit pixel dimensions prevent layout shift)`, { evidence: ev });
    }
  }

  /* ---------------- external links ---------------- */
  const from = publicPath(cfg, route);
  for (const a of elements(doc, 'a')) {
    if (a.attrs.href === undefined) continue;
    const c = classifyUrl(cfg, a.attrs.href, from);
    if (c.kind !== 'external') continue;
    checkedLinks++;
    const rel = (a.attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!rel.includes('noopener')) findings.error('external-no-noopener', where, `external link to ${trunc(c.url.href, 80)} lacks rel="noopener"${a.attrs.target === '_blank' ? ' (target=_blank)' : ''}`, { evidence: snippet(page.source, a) });
    const host = c.url.hostname.toLowerCase().replace(/^www\./, '');
    if (!rel.includes('noreferrer') && !data.partnerHosts.has(host) && !ownHosts.has(host)) {
      const e = externalNoReferrer.get(host) ?? { pages: new Set(), count: 0 };
      e.pages.add(route);
      e.count++;
      externalNoReferrer.set(host, e);
    }
  }

  rows.push({ page: where, route, title, titleLength: title ? len(title) : 0, description, descriptionLength: len(description), h1: h1s[0] ? plainText(h1s[0]) : null, canonical: canonicalHref, robots: robots.join(','), jsonLd: blocks.length });
}

for (const [title, pages] of titles) if (pages.length > 1) findings.error('title-duplicate', pages[0], `title "${trunc(title, 70)}" is used by ${pages.length} pages: ${pages.slice(0, 6).join(', ')}${pages.length > 6 ? ', …' : ''}`);
for (const [d, pages] of descriptions) if (pages.length > 1) findings.error('description-duplicate', pages[0], `description "${trunc(d, 70)}" is used by ${pages.length} pages: ${pages.slice(0, 6).join(', ')}${pages.length > 6 ? ', …' : ''}`);
// noreferrer is reported per host, not per link (doc 08 §9: noreferrer for non-partner sites; partner list = src/data/partners.ts)
for (const [host, e] of [...externalNoReferrer].sort((a, b) => b[1].count - a[1].count)) {
  findings.warn('external-no-noreferrer', [...e.pages][0], `${host}: ${e.count} link(s) on ${e.pages.size} page(s) lack rel="noreferrer" and the host is neither one of our own sites (src/lib/externalRel.ts) nor in src/data/partners.ts`);
}

/* ---------------- sitemap ---------------- */
const sitemapIndex = site.fileSet.has('sitemap-index.xml');
const locs = [];
if (!sitemapIndex) findings.error('sitemap-missing', 'sitemap-index.xml', 'no sitemap-index.xml in dist');
else {
  const sitemapFiles = [...readFileSync(join(cfg.dist, 'sitemap-index.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const sm of sitemapFiles) {
    let rel;
    try {
      const u = new URL(sm);
      rel = u.pathname.startsWith(cfg.base + '/') ? u.pathname.slice(cfg.base.length + 1) : u.pathname.slice(1);
    } catch {
      findings.error('sitemap-bad-url', 'sitemap-index.xml', `bad sitemap URL ${sm}`);
      continue;
    }
    if (!site.fileSet.has(rel)) {
      findings.error('sitemap-file-missing', 'sitemap-index.xml', `${sm} is listed but ${rel} is not in dist`);
      continue;
    }
    for (const m of readFileSync(join(cfg.dist, rel), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) locs.push(m[1]);
  }
  const want = new Map(site.pages.filter((p) => !p.isStub && !NOT_IN_SITEMAP.has(p.route)).map((p) => [`${cfg.siteUrl}${publicPath(cfg, p.route)}`, p]));
  const stubUrls = new Set(site.pages.filter((p) => p.isStub).map((p) => `${cfg.siteUrl}${publicPath(cfg, p.route)}`));
  const seen = new Set();
  for (const loc of locs) {
    if (seen.has(loc)) findings.error('sitemap-duplicate', 'sitemap', `duplicate sitemap URL ${loc}`);
    seen.add(loc);
    if (stubUrls.has(loc)) findings.error('sitemap-includes-stub', 'sitemap', `redirect stub listed in the sitemap: ${loc}`);
    else if (!want.has(loc)) findings.error('sitemap-unknown-url', 'sitemap', `sitemap lists ${loc}, which is not a built page (or is an excluded utility page)`);
  }
  for (const [url, p] of want) if (!seen.has(url)) findings.warn('sitemap-missing-page', p.route, `page is not in the sitemap: ${url}`);
}

/* ------------------------------------------------------------------------------------------- */

const errors = findings.errors.length;
const warnings = findings.warnings.length;
printFindings('check-seo', findings, { examples: 3 });
const checked = site.pages.length - stubs;
console.log(`  ${checked} page(s) linted, ${stubs} redirect stub(s), ${checkedImages} <img>, ${checkedLinks} external link(s), ${locs.length} sitemap URL(s); longest title ${Math.max(0, ...rows.map((r) => r.titleLength))} chars; robots mode ${cfg.siteEnv}`);

const longest = [...rows].sort((a, b) => b.titleLength - a.titleLength).slice(0, 8);
let md = `# SEO lint\n\nPages linted: ${checked} (+${stubs} redirect stubs) · env ${cfg.siteEnv} · base \`${cfg.base || '/'}\` · errors **${errors}** · warnings ${warnings}\n\n`;
md += `Limits: title ≤ ${TITLE_MAX} characters; description target ≤ ${DESC_MAX}; canonical \`${PRODUCTION_ORIGIN}\` + route with trailing slash; ${cfg.siteEnv === 'staging' ? 'every page and redirect stub noindex' : 'no noindex except ' + [...NOINDEX_OK_IN_PRODUCTION].join(', ') + ' (redirect stubs carry none)'}.\n\n`;
md += `## Longest titles\n\n${mdTable(['Page', 'Characters', 'Title'], longest.map((r) => [r.route, r.titleLength, r.title ?? '']))}\n`;
md += `## Findings\n${findingsMarkdown(findings)}`;
const paths = writeReports(cfg, 'seo', { check: 'seo', limits: { titleMax: TITLE_MAX, descMax: DESC_MAX }, summary: { pages: checked, stubs, errors, warnings, images: checkedImages, externalLinks: checkedLinks, sitemapUrls: locs.length }, findings: findings.items, pageSummaries: rows }, md);
console.log(`reports: ${paths.json}, ${paths.md}`);
process.exit(errors ? 1 : 0);
