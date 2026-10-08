#!/usr/bin/env node
/**
 * Link check by URI class (planning/10 §1 and §4 "Links out"), base-aware, over dist/.
 *
 *   node scripts/check-links.mjs [--dist dist] [--base /ctg] [--env staging|production] [--out .work/qa]
 *                                [--external [--timeout 12000] [--concurrency 6]]
 *
 * Classes
 *   Routes   every internal href resolves to a dist page; on staging each starts with the base (/ctg/) or is external,
 *            mailto, tel or a fragment; routes end in "/" (trailingSlash: always)
 *   Anchors  every #id (same page and cross page, footnote markers included) exists on the target page
 *   Assets   every src, srcset candidate, poster, link href, CSS url() (inline styles, <style>, built CSS files),
 *            web-manifest icon and download link resolves to a non-empty file in dist
 *   mailto   well-formed address that exists in the CTA library (src/data/ctas.ts) or the site's published contact
 *            addresses (src/lib/site.ts, src/data/*); subject/body percent-encoded; only subject and body parameters
 *   tel      E.164 (+ then 7-15 digits, no separators) matching a number defined in the site data
 *   External unique list per host; --external probes each URL (HEAD, GET fallback) and reports the status. Dead links
 *            fail, except third-party press archives (src/data/press.ts hosts), which only warn; bot-blocked answers
 *            (401/403/429/999) are "unverified" warnings.
 * Also reported (warnings): orphan pages and pages deeper than 3 clicks from Home (planning/09 §7).
 *
 * Output: console summary, .work/qa/links.json and links.md (links.production.* for SITE_ENV=production).
 */
import { statSync } from 'node:fs';
import {
  PRODUCTION_ORIGIN, Findings, classifyUrl, cssUrls, describeConfig, extractRefs, fatal, findingsMarkdown, hostKey, join, loadConfig, loadSite,
  loadSiteData, mdTable, plainText, printFindings, publicPath, readFileSync, resolveInDist, safeDecode, snippet, trunc, writeReports,
} from './lib/dist.mjs';

const cfg = loadConfig(process.argv.slice(2), ['external']);
const doExternal = cfg.opts.external === true || cfg.opts.external === 'true';
const timeoutMs = Number(cfg.opts.timeout ?? 12000);
const concurrency = Math.max(1, Number(cfg.opts.concurrency ?? 6));

let site;
try {
  site = loadSite(cfg);
} catch (e) {
  fatal(`check-links: ${e.message}`);
}
const data = loadSiteData();
const findings = new Findings();
for (const e of data.errors) findings.error('site-data', 'src/', e);

console.log(`check-links: ${site.pages.length} pages  (${describeConfig(cfg)})${doExternal ? '  [external probes ON]' : ''}`);

/* ------------------------------------------------------------------------------------------- */

const stats = { routes: 0, anchors: 0, assets: 0, downloads: 0, mailto: 0, tel: 0, external: 0, cssFiles: 0, cssRefs: 0 };
const mailtoSeen = new Map(); // href -> {pages:Set, ok}
const telSeen = new Map();
const telTexts = new Set();
const external = new Map(); // url (no fragment) -> {url, host, pages:Set, kinds:Set, texts:Set}
const edges = new Map(); // route -> Set(route)   (nav links between pages)
const sizeCache = new Map();
const fileSize = (rel) => {
  if (!sizeCache.has(rel)) sizeCache.set(rel, statSync(join(cfg.dist, rel)).size);
  return sizeCache.get(rel);
};

const EMAIL_STRICT = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const ENCODED_VALUE = /^(?:[A-Za-z0-9\-_.!~*'()]|%[0-9A-Fa-f]{2})*$/;
const E164 = /^\+[1-9]\d{6,14}$/;
const VIDEO_FRAME_HOSTS = new Set(['www.youtube-nocookie.com', 'player.vimeo.com']);
const PASSIVE_LINK_RELS = new Set(['dns-prefetch', 'preconnect']);

function addExternal(u, page, ref, text) {
  const clean = new URL(u.href);
  clean.hash = '';
  const key = clean.href;
  let e = external.get(key);
  if (!e) external.set(key, (e = { url: key, host: hostKey(key), pages: new Set(), kinds: new Set(), texts: new Set() }));
  e.pages.add(page.route);
  e.kinds.add(`${ref.tag}[${ref.attr}]`);
  if (text) e.texts.add(text);
  stats.external++;
}

function checkMailto(raw, ref, page) {
  stats.mailto++;
  const where = page.rel;
  const seen = mailtoSeen.get(raw) ?? { pages: new Set(), problems: 0, items: [] };
  seen.pages.add(page.route);
  mailtoSeen.set(raw, seen);
  if (seen.checked) return; // an identical href is validated once; findings list every page it appears on afterwards
  seen.checked = true;
  const fail = (code, msg, level = 'error') => {
    seen.problems++;
    seen.items.push(findings.add(level, code, where, msg, { evidence: trunc(raw, 200) }));
  };
  const m = /^mailto:([^?]*)(?:\?(.*))?$/i.exec(raw);
  if (!m) return fail('mailto-malformed', 'not a valid mailto: URL');
  const addrs = m[1].split(',').map((a) => safeDecode(a.trim()));
  if (!m[1].trim()) fail('mailto-malformed', 'mailto: without an address');
  if (addrs.length > 1) fail('mailto-multiple-recipients', 'more than one recipient in a single mailto:', 'warning');
  for (const a of addrs) {
    if (a === null || !a) continue;
    if (!EMAIL_STRICT.test(a)) fail('mailto-malformed', `address "${a}" is not well-formed`);
    else if (!data.emails.has(a.toLowerCase())) fail('mailto-unknown-address', `address "${a}" is not in the CTA library or the site's published contact addresses`);
  }
  const params = new Map();
  if (m[2] !== undefined) {
    if (m[2] === '') fail('mailto-stray-parameter', 'empty query after "?"');
    for (const part of m[2].split('&')) {
      if (part === '') continue;
      const eq = part.indexOf('=');
      const key = (eq === -1 ? part : part.slice(0, eq)).toLowerCase();
      const value = eq === -1 ? '' : part.slice(eq + 1);
      if (!['subject', 'body'].includes(key)) {
        fail('mailto-stray-parameter', `unexpected parameter "${key}" (only subject and body are allowed)`);
        continue;
      }
      if (params.has(key)) fail('mailto-stray-parameter', `duplicate parameter "${key}"`);
      if (!ENCODED_VALUE.test(value)) {
        const bad = [...value].find((ch) => !/[A-Za-z0-9\-_.!~*'()%]/.test(ch));
        fail('mailto-not-encoded', `${key} is not percent-encoded as encodeURIComponent would (offending character ${JSON.stringify(bad ?? '%')})`);
      }
      const decoded = safeDecode(value);
      if (decoded === null) {
        fail('mailto-bad-encoding', `${key} contains an invalid percent-escape`);
        continue;
      }
      params.set(key, decoded);
    }
  }
  const subject = params.get('subject');
  const body = params.get('body');
  if (body !== undefined && /(^|[^\r])\n/.test(body)) fail('mailto-lf-linebreak', 'body uses bare LF line breaks; RFC 6068 expects CRLF (%0D%0A)', 'warning');
  if (subject !== undefined && data.ctas) {
    const cta = Object.values(data.ctas).find((c) => c.subject === subject);
    if (!cta) fail('mailto-subject-not-in-library', `subject "${subject}" matches no CTA in src/data/ctas.ts`, 'warning');
    else if (body !== undefined && cta.body) {
      const labels = body.split(/\r?\n/).map((l) => /^(.+?):\s*$/.exec(l)?.[1]).filter(Boolean);
      if (JSON.stringify(labels) !== JSON.stringify(cta.body)) fail('mailto-body-differs-from-library', `body fields [${labels.join(' | ')}] differ from the "${cta.key}" CTA [${cta.body.join(' | ')}]`, 'warning');
    }
  } else if (subject === undefined && params.size) fail('mailto-no-subject', 'mailto: with a body but no subject', 'warning');
}

function checkTel(raw, ref, page) {
  stats.tel++;
  const num = safeDecode(raw.replace(/^tel:/i, '').trim());
  const seen = telSeen.get(raw) ?? { pages: new Set(), items: [] };
  seen.pages.add(page.route);
  telSeen.set(raw, seen);
  if (!seen.checked) {
    seen.checked = true;
    if (num === null || !E164.test(num)) {
      seen.items.push(findings.error('tel-not-e164', page.rel, `"${raw}" is not an E.164-style number (+ country code and subscriber number, 7-15 digits, no spaces or separators)`, { evidence: snippet(page.source, ref.el) }));
    } else if (!data.phones.has(num)) {
      seen.items.push(findings.error('tel-unknown-number', page.rel, `${num} is not a number defined in the site data (${[...data.phones].join(', ')})`, { evidence: snippet(page.source, ref.el) }));
    }
  }
  const text = plainText(ref.el);
  const key = `${raw}|${text}`;
  if (num && !telTexts.has(key)) {
    telTexts.add(key);
    if (/^\+?[\d\s().-]{7,}$/.test(text) && text.replace(/\D/g, '') !== num.replace(/\D/g, '')) {
      seen.items.push(findings.error('tel-text-mismatch', page.rel, `link text "${text}" does not match href ${num}`, { evidence: snippet(page.source, ref.el) }));
    }
  }
}

/** Resolve an internal pathname; report problems; returns {res, page} for fragment checks. */
function checkInternal(c, ref, page, { base = true } = {}) {
  const where = page.rel;
  const isNav = ref.kind === 'nav' || ref.kind === 'refresh' || ref.kind === 'canonical' || ref.kind === 'other';
  const cls = isNav ? 'routes' : 'assets';
  const ev = () => snippet(page.source, ref.el) + (ref.attr !== 'href' && ref.attr !== 'src' ? `  [${ref.attr}=${trunc(ref.url, 120)}]` : '');
  if (c.badEncoding) findings.error('bad-percent-encoding', where, `invalid percent-encoding in ${ref.url}`, { evidence: ev() });
  const res = resolveInDist(site, c.pathname, { base });
  if (cfg.base && base && res.status === 'outside-base') {
    findings.error(isNav ? 'route-missing-base' : 'asset-missing-base', where, `${ref.tag}[${ref.attr}] "${trunc(ref.url, 140)}" is root-relative but does not start with the base ${cfg.base}/`, { evidence: ev() });
    stats[cls]++;
    return { res };
  }
  stats[cls]++;
  if (res.status === 'missing') {
    findings.error(isNav ? 'broken-route' : 'broken-asset', where, `${ref.tag}[${ref.attr}] "${trunc(ref.url, 140)}" does not resolve to a ${isNav ? 'page or file' : 'file'} in dist`, { evidence: ev() });
  } else if (res.status === 'needs-trailing-slash') {
    findings.error('route-no-trailing-slash', where, `"${trunc(ref.url, 140)}" points at a page without the trailing slash (trailingSlash is "always")`, { evidence: ev() });
  } else if (!isNav && res.status === 'page' && ref.kind !== 'meta') {
    findings.error('asset-is-page', where, `${ref.tag}[${ref.attr}] "${trunc(ref.url, 140)}" resolves to an HTML page, not an asset`, { evidence: ev() });
  } else if (res.status === 'file') {
    if (fileSize(res.rel) === 0) findings.error('empty-asset', where, `"${trunc(ref.url, 140)}" resolves to an empty file (${res.rel})`, { evidence: ev() });
    if (ref.tag === 'a' && /\.(csv|pdf|zip|xlsx?|docx?|pptx?|png|jpe?g|webp|svg|txt|json)$/i.test(res.rel)) stats.downloads++;
  }
  if (ref.kind === 'meta' && ref.metaKey && /image|video|audio/.test(ref.metaKey) && res.status === 'page') {
    findings.error('asset-is-page', where, `${ref.metaKey} "${trunc(ref.url, 140)}" resolves to an HTML page, not an image`, { evidence: ev() });
  }
  return { res };
}

function checkFragment(fragment, target, ref, page, label) {
  if (!fragment || fragment === 'top' || fragment.startsWith(':~:')) return;
  const id = safeDecode(fragment);
  stats.anchors++;
  if (id === null) {
    findings.error('bad-percent-encoding', page.rel, `invalid percent-encoding in fragment #${fragment}`, { evidence: snippet(page.source, ref.el) });
    return;
  }
  if (!target.ids.has(id)) {
    findings.error('missing-anchor', page.rel, `${label} #${id} does not exist${target === page ? ' on this page' : ' on ' + target.route}`, {
      evidence: snippet(page.source, ref.el),
    });
  }
}

/* ------------------------------------------------------------------------------------------- */
/* pages                                                                                        */
/* ------------------------------------------------------------------------------------------- */

for (const page of site.pages) {
  const from = publicPath(cfg, page.route);
  const refs = extractRefs(page, cfg);
  const links = edges.get(page.route) ?? new Set();
  edges.set(page.route, links);
  for (const ref of refs) {
    const c = classifyUrl(cfg, ref.url, from);
    const where = page.rel;
    const text = ref.tag === 'a' ? plainText(ref.el) : '';
    switch (c.kind) {
      case 'empty':
        if (ref.tag === 'a') findings.warn('empty-href', where, 'href="" (links to the current page)', { evidence: snippet(page.source, ref.el) });
        else findings.error('empty-url', where, `${ref.tag}[${ref.attr}] is empty`, { evidence: snippet(page.source, ref.el) });
        break;
      case 'fragment':
        checkFragment(c.fragment, page, ref, page, 'same-page anchor');
        break;
      case 'mailto':
        checkMailto(ref.url, ref, page);
        break;
      case 'tel':
        checkTel(ref.url, ref, page);
        break;
      case 'data':
        if (!['img', 'source'].includes(ref.tag) && !ref.css) findings.error('data-url', where, `${ref.tag}[${ref.attr}] uses a data: URL (CSP img-src allows data: only for images)`, { evidence: snippet(page.source, ref.el) });
        break;
      case 'javascript':
        findings.error('javascript-url', where, `${ref.tag}[${ref.attr}] uses a javascript: URL`, { evidence: snippet(page.source, ref.el) });
        break;
      case 'other-scheme':
        findings.error('unsupported-scheme', where, `${ref.tag}[${ref.attr}] uses the "${c.scheme}:" scheme`, { evidence: snippet(page.source, ref.el) });
        break;
      case 'protocol-relative':
        findings.error('protocol-relative-url', where, `${ref.tag}[${ref.attr}] "${trunc(ref.url, 120)}" is protocol-relative; use https://`, { evidence: snippet(page.source, ref.el) });
        break;
      case 'invalid':
        findings.error('invalid-url', where, `${ref.tag}[${ref.attr}] "${trunc(ref.url, 120)}" is not a valid URL`, { evidence: snippet(page.source, ref.el) });
        break;
      case 'external': {
        const nav = ref.kind === 'nav' || ref.kind === 'canonical' || ref.kind === 'refresh' || ref.kind === 'other';
        if (c.url.protocol === 'http:') findings.warn('insecure-http', where, `${ref.tag}[${ref.attr}] "${trunc(ref.url, 120)}" is http:// (CSP upgrade-insecure-requests masks it; use https)`, { evidence: snippet(page.source, ref.el) });
        if (!nav) {
          const okFrame = ref.tag === 'iframe' && VIDEO_FRAME_HOSTS.has(c.url.hostname);
          const okLink = ref.tag === 'link' && ref.rel?.some((r) => PASSIVE_LINK_RELS.has(r));
          const okMeta = ref.kind === 'meta'; // og:image etc. are read by crawlers, not loaded by the page
          if (!okFrame && !okLink && !okMeta) {
            findings.error('external-resource', where, `${ref.tag}[${ref.attr}] loads ${trunc(ref.url, 120)} from a third-party host (no third-party loads, doc 08 §9; CSP would block it)`, { evidence: snippet(page.source, ref.el) });
          }
        }
        if (ref.kind === 'meta' && c.url.hostname !== new URL(PRODUCTION_ORIGIN).hostname) findings.warn('meta-url-off-site', where, `${ref.metaKey ?? ref.attr} points to ${c.url.origin}, not ${PRODUCTION_ORIGIN}`, { evidence: snippet(page.source, ref.el) });
        addExternal(c.url, page, ref, text);
        break;
      }
      case 'own-origin': {
        const isProd = c.url.origin === PRODUCTION_ORIGIN;
        const nav = ref.kind === 'nav' || ref.kind === 'other';
        if (isProd) {
          const res = resolveInDist(site, safeDecode(c.url.pathname) ?? c.url.pathname, { base: false });
          if (ref.kind === 'canonical' || ref.kind === 'meta') {
            // canonical / og:* point at the production origin on every build; they must exist in the build
            const selfReference = page.is404 && new URL(ref.url).pathname === '/404/'; // the 404 page names itself /404/
            if (!selfReference && (res.status === 'missing' || res.status === 'needs-trailing-slash')) {
              findings.error(ref.kind === 'canonical' ? 'broken-canonical-target' : 'broken-meta-url', where, `${ref.metaKey ?? 'canonical'} ${trunc(ref.url, 120)} does not exist in dist (${res.status})`, { evidence: snippet(page.source, ref.el) });
            }
            stats.routes++;
          } else if (ref.kind !== 'other' || res.status === 'missing') {
            findings.add(cfg.siteEnv === 'production' && res.status === 'missing' ? 'error' : 'warning', 'absolute-own-origin', where, `${ref.tag}[${ref.attr}] "${trunc(ref.url, 120)}" is an absolute ${PRODUCTION_ORIGIN} URL (bypasses url()/the base)${res.status === 'missing' ? ' and does not exist in dist' : ''}`, { evidence: snippet(page.source, ref.el) });
          }
          if (nav && res.status === 'page' && res.route) links.add(res.route);
        } else {
          const { res } = checkInternal({ pathname: safeDecode(c.url.pathname) ?? c.url.pathname }, ref, page, { base: true });
          if (res?.route && nav) links.add(res.route);
        }
        break;
      }
      case 'root-relative':
      case 'relative': {
        const { res } = checkInternal(c, ref, page, { base: true });
        const nav = ref.kind === 'nav' || ref.kind === 'refresh' || ref.kind === 'other';
        if (res && res.status === 'page') {
          const target = site.byRel.get(res.rel);
          if (nav && target && res.route && res.route !== page.route) links.add(res.route);
          if (target && c.fragment && (ref.kind === 'nav' || ref.kind === 'refresh')) checkFragment(c.fragment, target, ref, page, `anchor on ${res.route}`);
        }
        if (c.search && ref.kind === 'nav' && res?.status === 'page') findings.warn('internal-query-string', where, `"${trunc(ref.url, 120)}" carries a query string; static pages ignore it`, { evidence: snippet(page.source, ref.el) });
        break;
      }
    }
  }
}

for (const seen of [...mailtoSeen.values(), ...telSeen.values()]) {
  for (const item of seen.items) {
    const list = [...seen.pages];
    item.pages = list;
    item.message += ` — on ${list.length} page(s): ${list.slice(0, 4).join(', ')}${list.length > 4 ? ', …' : ''}`;
  }
}

/* ---- built CSS files and the web manifest ---- */
for (const rel of site.relFiles.filter((f) => f.endsWith('.css'))) {
  stats.cssFiles++;
  const css = readFileSync(join(cfg.dist, rel), 'utf8');
  const from = `${cfg.base}/${rel}`;
  for (const url of cssUrls(css)) {
    stats.cssRefs++;
    const c = classifyUrl(cfg, url, from);
    const evidence = `url(${trunc(url, 120)})`;
    if (c.kind === 'root-relative' || c.kind === 'relative') {
      const res = resolveInDist(site, c.pathname, { base: true });
      stats.assets++;
      if (res.status === 'outside-base') findings.error('asset-missing-base', rel, `CSS url(${trunc(url, 120)}) is root-relative but does not start with the base ${cfg.base}/`, { evidence });
      else if (res.status === 'missing' || res.status === 'needs-trailing-slash') findings.error('broken-asset', rel, `CSS url(${trunc(url, 120)}) does not resolve to a file in dist`, { evidence });
      else if (res.status === 'file' && fileSize(res.rel) === 0) findings.error('empty-asset', rel, `CSS url(${trunc(url, 120)}) resolves to an empty file`, { evidence });
    } else if (c.kind === 'external' || c.kind === 'own-origin' || c.kind === 'protocol-relative') {
      findings.error('external-resource', rel, `CSS url(${trunc(url, 120)}) loads from a third-party host`, { evidence });
    }
  }
}
for (const rel of site.relFiles.filter((f) => /\.webmanifest$|manifest\.json$/.test(f))) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(cfg.dist, rel), 'utf8'));
  } catch (e) {
    findings.error('manifest-invalid', rel, `web manifest is not valid JSON: ${e.message}`);
    continue;
  }
  const from = `${cfg.base}/${rel}`;
  const check = (label, value) => {
    if (typeof value !== 'string') return;
    const c = classifyUrl(cfg, value, from);
    if (c.kind !== 'root-relative' && c.kind !== 'relative') return;
    stats.assets++;
    const res = resolveInDist(site, c.pathname, { base: true });
    if (res.status === 'outside-base') findings.error('asset-missing-base', rel, `manifest ${label} "${value}" does not start with the base ${cfg.base}/`);
    else if (res.status === 'missing') findings.error('broken-asset', rel, `manifest ${label} "${value}" does not resolve in dist`);
  };
  for (const icon of manifest.icons ?? []) check('icon', icon.src);
  for (const s of manifest.shortcuts ?? []) for (const icon of s.icons ?? []) check('shortcut icon', icon.src);
  check('start_url', manifest.start_url);
  check('scope', manifest.scope);
}

/* ---- page graph: orphans and click depth from Home ---- */
const pageRoutes = site.pages.filter((p) => !p.isStub && !p.is404 && p.route !== '/styleguide/').map((p) => p.route);
const depth = new Map([['/', 0]]);
const queue = ['/'];
while (queue.length) {
  const r = queue.shift();
  for (const next of edges.get(r) ?? []) {
    if (!depth.has(next)) {
      depth.set(next, depth.get(r) + 1);
      queue.push(next);
    }
  }
}
const inbound = new Map();
for (const [from, tos] of edges) for (const to of tos) if (to !== from) inbound.set(to, (inbound.get(to) ?? 0) + 1);
const orphans = pageRoutes.filter((r) => r !== '/' && !inbound.has(r));
const unreachable = pageRoutes.filter((r) => !depth.has(r));
const deep = pageRoutes.filter((r) => (depth.get(r) ?? 0) > 3);
for (const r of orphans) findings.warn('orphan-page', r, 'no other page links here (planning/09 §7: no orphan pages)');
for (const r of unreachable.filter((r) => !orphans.includes(r))) findings.warn('unreachable-from-home', r, 'not reachable from Home by following links');
for (const r of deep) findings.warn('deeper-than-3-clicks', r, `${depth.get(r)} clicks from Home (planning/09 §7: at most 3)`);

/* ------------------------------------------------------------------------------------------- */
/* external links                                                                               */
/* ------------------------------------------------------------------------------------------- */

const SHARE_ENDPOINT = /^\/(?:intent\/(?:tweet|post)|sharer(?:\/sharer\.php|\.php)?|sharing\/share-offsite|shareArticle|share)\/?$/i;
const hostCategory = (host, url) => {
  if (url && SHARE_ENDPOINT.test(new URL(url).pathname)) return 'share';
  if (data.criticalHosts.has(host)) return 'critical';
  if (data.pressHosts.has(host)) return 'press';
  if (data.partnerHosts.has(host)) return 'partner';
  if (data.socialHosts.has(host)) return 'social';
  return 'other';
};
const externalList = [...external.values()].map((e) => ({ ...e, pages: [...e.pages].sort(), kinds: [...e.kinds], texts: [...e.texts].slice(0, 3), category: hostCategory(e.host, e.url) }));
const byHost = new Map();
for (const e of externalList) {
  let h = byHost.get(e.host);
  if (!h) byHost.set(e.host, (h = { host: e.host, category: hostCategory(e.host), urls: [], pages: new Set() }));
  h.urls.push(e.url);
  for (const p of e.pages) h.pages.add(p);
}
const hostList = [...byHost.values()].sort((a, b) => b.pages.size - a.pages.size || a.host.localeCompare(b.host));

const UA = 'Mozilla/5.0 (compatible; ctg-link-check/1.0; +https://github.com/ctjobready/ctg)';
async function probeOnce(url, method) {
  const res = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': UA, accept: '*/*' } });
  const out = { status: res.status, location: res.headers.get('location') };
  try {
    await res.body?.cancel();
  } catch {
    /* ignore */
  }
  return out;
}
async function probe(url) {
  const hops = [];
  let current = url;
  let method = 'HEAD';
  const started = Date.now();
  for (let hop = 0; hop < 6; hop++) {
    let r;
    try {
      r = await probeOnce(current, method);
      if (method === 'HEAD' && r.status >= 400) r = await probeOnce(current, 'GET'); // many servers mishandle HEAD
    } catch (e) {
      try {
        r = await probeOnce(current, 'GET');
      } catch (e2) {
        const cause = e2.cause?.code ?? e2.cause?.message ?? e2.name ?? e2.message;
        return { ok: false, class: 'dead', status: null, error: String(cause), hops, ms: Date.now() - started };
      }
    }
    hops.push({ url: current, status: r.status });
    if (r.status >= 300 && r.status < 400 && r.location) {
      try {
        current = new URL(r.location, current).href;
      } catch {
        return { ok: false, class: 'dead', status: r.status, error: 'bad redirect location', hops, ms: Date.now() - started };
      }
      method = 'HEAD';
      continue;
    }
    const final = r.status;
    let klass;
    if (final >= 200 && final < 300) klass = hops.length > 1 ? 'redirect-ok' : 'ok';
    else if ([401, 403, 429, 999].includes(final)) klass = 'blocked';
    else klass = 'dead';
    return { ok: klass === 'ok' || klass === 'redirect-ok', class: klass, status: hops[0].status, finalStatus: final, finalUrl: current, hops, ms: Date.now() - started };
  }
  return { ok: false, class: 'dead', status: hops[0]?.status ?? null, error: 'too many redirects', hops, ms: 0 };
}

let probes = [];
if (doExternal) {
  // share endpoints differ only in their query string: probe each endpoint once and copy the answer to its siblings
  const keyOf = (e) => (e.category === 'share' ? (({ origin, pathname }) => origin + pathname)(new URL(e.url)) : e.url);
  const reps = new Map();
  for (const e of externalList) if (!reps.has(keyOf(e))) reps.set(keyOf(e), e);
  const queueByHost = new Map();
  for (const e of reps.values()) {
    if (!queueByHost.has(e.host)) queueByHost.set(e.host, []);
    queueByHost.get(e.host).push(e);
  }
  const hosts = [...queueByHost.keys()];
  let next = 0;
  const worker = async () => {
    while (next < hosts.length) {
      const host = hosts[next++];
      for (const e of queueByHost.get(host)) {
        e.probe = await probe(e.url);
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  };
  console.log(`  probing ${reps.size} external URL(s) (${externalList.length} unique incl. share-link variants) on ${hosts.length} host(s) …`);
  await Promise.all(Array.from({ length: Math.min(concurrency, hosts.length) }, worker));
  for (const e of externalList) e.probe = reps.get(keyOf(e)).probe;
  probes = externalList.filter((e) => e.probe);
  for (const e of reps.values()) {
    const p = e.probe;
    const siblings = externalList.filter((o) => keyOf(o) === keyOf(e));
    e.pages = [...new Set(siblings.flatMap((o) => o.pages))].sort();
    const where = e.pages[0] ?? '';
    const label = `${keyOf(e)} (${e.category}; on ${e.pages.length} page(s))`;
    if (p.class === 'dead') {
      const level = e.category === 'press' ? 'warning' : 'error';
      findings.add(level, e.category === 'press' ? 'external-dead-press-archive' : 'external-dead', where, `${label}: ${p.finalStatus ?? p.status ?? p.error}${p.error ? ' (' + p.error + ')' : ''}`, { evidence: e.pages.join(', ') });
    } else if (p.class === 'blocked') {
      findings.warn('external-unverified', where, `${label}: answered ${p.finalStatus} to an automated probe (cannot verify)`, { evidence: e.pages.join(', ') });
    } else if (p.class === 'redirect-ok' && e.category !== 'share') {
      const fin = new URL(p.finalUrl);
      const start = new URL(keyOf(e));
      const signIn = (/(^|\.)accounts\.google\.com$/.test(fin.hostname) || /\/(login|signin|sign-in)(\/|$)/i.test(fin.pathname)) && !/\/(login|signin|sign-in)(\/|$)/i.test(start.pathname);
      if (signIn) findings.warn('external-sign-in-redirect', where, `${label}: ${p.hops[0].status} to a sign-in page (${fin.origin}${fin.pathname}); an anonymous visitor may not reach the target - verify in a private window`, { evidence: e.pages.join(', ') });
      else if (/closedform/i.test(fin.pathname)) findings.warn('external-closed-form', where, `${label}: the form is closed (${fin.pathname})`, { evidence: e.pages.join(', ') });
      else if (p.hops[0].status !== 301 && p.hops[0].status !== 308) findings.warn('external-temporary-redirect', where, `${label}: ${p.hops[0].status} -> ${p.finalUrl}`, { evidence: e.pages.join(', ') });
    }
  }
}

/* ------------------------------------------------------------------------------------------- */
/* output                                                                                       */
/* ------------------------------------------------------------------------------------------- */

const mailtoList = [...mailtoSeen].map(([href, v]) => ({ href, pages: v.pages.size, problems: v.problems }));
const telList = [...telSeen].map(([href, v]) => ({ href, pages: v.pages.size }));
const errors = findings.errors.length;
const warnings = findings.warnings.length;

printFindings('check-links', findings, { examples: 4 });
console.log(
  `  checked: ${stats.routes} route refs, ${stats.anchors} fragment refs, ${stats.assets} asset refs (+${stats.cssRefs} url() in ${stats.cssFiles} CSS files), ${stats.downloads} download links, ` +
    `${stats.mailto} mailto (${mailtoList.length} unique), ${stats.tel} tel (${telList.length} unique), ${stats.external} external refs -> ${externalList.length} unique URLs on ${hostList.length} hosts`,
);
if (!doExternal) console.log('  external links were not probed (pass --external to HEAD/GET them)');
else {
  const by = (k) => probes.filter((e) => e.probe.class === k).length;
  console.log(`  external probes: ok ${by('ok')}, redirect-ok ${by('redirect-ok')}, blocked/unverified ${by('blocked')}, dead ${by('dead')}`);
}

const catCounts = Object.fromEntries(['critical', 'press', 'partner', 'social', 'other'].map((c) => [c, hostList.filter((h) => h.category === c).length]));
let md = `# Link check\n\nPages: ${site.pages.length} · base \`${cfg.base || '/'}\` · env ${cfg.siteEnv} · errors **${errors}** · warnings ${warnings}${doExternal ? ' · external probes run' : ' · external links not probed'}\n\n`;
md += mdTable(
  ['Class', 'Checked'],
  [
    ['Routes (internal hrefs, canonical, refresh)', stats.routes],
    ['Anchors (#id on same/other page)', stats.anchors],
    ['Assets (src, srcset, poster, link, inline + built CSS url(), manifest)', `${stats.assets} (+${stats.cssRefs} CSS url() in ${stats.cssFiles} files)`],
    ['Downloads', stats.downloads],
    ['mailto', `${stats.mailto} (${mailtoList.length} unique)`],
    ['tel', `${stats.tel} (${telList.length} unique)`],
    ['External', `${stats.external} refs, ${externalList.length} unique URLs, ${hostList.length} hosts`],
  ],
);
md += `\n## Findings\n${findingsMarkdown(findings)}`;
md += `\n## mailto links (unique)\n\n${mdTable(['href', 'pages', 'problems'], mailtoList.map((m) => [trunc(m.href, 150), m.pages, m.problems]))}`;
md += `\n## tel links (unique)\n\n${mdTable(['href', 'pages'], telList.map((t) => [t.href, t.pages]))}`;
md += `\n## External hosts (${hostList.length}; categories ${JSON.stringify(catCounts)})\n\n${mdTable(['Host', 'Category', 'URLs', 'Pages'], hostList.map((h) => [h.host, h.category, h.urls.length, h.pages.size]))}`;
md += `\n## External URLs\n\n${mdTable(
  ['URL', 'Host class', 'Pages', ...(doExternal ? ['Result'] : [])],
  externalList.map((e) => [e.url, e.category, e.pages.length, ...(doExternal ? [e.probe ? `${e.probe.class} ${e.probe.hops.map((h) => h.status).join('>')}${e.probe.error ? ' ' + e.probe.error : ''}` : 'not probed'] : [])]),
)}`;
md += `\n## Page graph\n\nOrphans: ${orphans.length ? orphans.join(', ') : 'none'} · unreachable from Home: ${unreachable.length ? unreachable.join(', ') : 'none'} · deeper than 3 clicks: ${deep.length ? deep.join(', ') : 'none'}\n`;

const paths = writeReports(
  cfg,
  'links',
  {
    check: 'links',
    external: doExternal,
    summary: { pages: site.pages.length, errors, warnings, stats },
    findings: findings.items,
    mailto: mailtoList,
    tel: telList,
    externalHosts: hostList.map((h) => ({ host: h.host, category: h.category, urls: h.urls, pages: h.pages.size })),
    externalUrls: externalList,
    graph: { orphans, unreachable, deeperThan3: deep, depth: Object.fromEntries(depth) },
  },
  md,
);
console.log(`reports: ${paths.json}, ${paths.md}`);
process.exit(errors ? 1 : 0);
