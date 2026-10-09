#!/usr/bin/env node
/**
 * Privacy-origin gate (review round 14, m5; planning/08 §9, planning/10 "Privacy coverage").
 *
 * Every third-party origin a built page can LOAD must be named in the text of /privacy-policy/, by hostname or by registrable domain
 * ("youtube-nocookie.com" covers www.youtube-nocookie.com). The check runs on the built pages in dist/ and is one-directional on purpose:
 * the policy may name services that no page loads (the hosting provider, Google Forms, jobready.global: they process data or receive a
 * visitor who follows a link, they are not requested by a page), so a disclosure without a load is never a finding.
 *
 *   node scripts/check-privacy-origins.mjs [--dist dist] [--base /ctg] [--site-url https://…] [--out .work/qa]
 *
 * "Can load" means a resource a browser requests by itself when it renders the page:
 *   · script src · link href where rel is stylesheet, preload, modulepreload, prefetch, preconnect, dns-prefetch, prerender, icon,
 *     apple-touch-icon, mask-icon or manifest · img and source src and srcset · iframe, embed, video, audio and track src · video poster ·
 *     object data · input type=image src · SVG image and use href
 *   · url() and @import in <style> blocks, in style attributes and in every .css file of the build
 *   · the hosts the page's Content-Security-Policy meta allows in default-src, script-src, style-src, img-src, font-src, connect-src,
 *     frame-src, child-src, media-src, object-src, worker-src and manifest-src. A catch-all source (`*`, `https:`, `http:`, `wss:`, `ws:`)
 *     allows an origin that cannot be named, so it is a finding too; 'self', 'none', 'unsafe-inline', hashes, nonces and data:/blob: are not origins.
 * Not loads (exempt): plain outbound <a href> links, canonical/alternate links, mailto:/tel:, form actions and anything on the site's own
 * origin (SITE_URL and the production origin). Meta tags such as og:image are crawler hints, not loads.
 *
 * Output: console summary, .work/qa/privacy-origins.json and privacy-origins.md. If it reports an origin, either remove the load or name
 * the service in src/pages/privacy-policy/index.astro (the services table and the section that explains when it is involved).
 * The negative self-tests below run first, so a regression in this check fails with a reason.
 */
import {
  PRODUCTION_ORIGIN, Findings, cssUrls, elements, fatal, findingsMarkdown, first, join, loadConfig, loadSite, mdTable, metaContent, parseHtml, parseSrcset, printFindings,
  readFileSync, relative, textContent, visibleText, writeReports,
} from './lib/dist.mjs';

/* ---------------------------------------------------------------------------------------------- */
/* Hostnames                                                                                       */
/* ---------------------------------------------------------------------------------------------- */

/** Two-label public suffixes the registrable-domain rule needs (a small list: the sites CodersTrust deals with; anything else is eTLD+1 by last two labels). */
const TWO_LABEL_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.bd', 'org.bd', 'net.bd', 'gov.bd', 'edu.bd', 'ac.bd', 'co.in', 'org.in', 'gov.in', 'com.au', 'org.au', 'co.jp', 'co.ke', 'co.za', 'com.my',
  'com.pk', 'com.np', 'com.lk', 'com.sg', 'com.br', 'com.mx', 'com.tr', 'github.io',
]);
/** example.cdn.net -> cdn.net · www.example.co.uk -> example.co.uk · example.github.io -> example.github.io */
export function registrableDomain(host) {
  const labels = host.toLowerCase().split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const lastTwo = labels.slice(-2).join('.');
  return TWO_LABEL_SUFFIXES.has(lastTwo) ? labels.slice(-3).join('.') : lastTwo;
}

/** The hostname of an absolute http(s) or protocol-relative URL, lower-cased; null for relative URLs, data:, blob:, mailto:, tel:, fragments and other schemes. */
export function hostOfUrl(raw) {
  const url = String(raw ?? '').trim();
  if (!url) return null;
  const abs = /^(?:https?:)?\/\/([^/?#\s]+)/i.exec(url);
  if (!abs) return null;
  const authority = abs[1].replace(/^[^@]*@/, '');
  const host = authority.replace(/:\d*$/, '').replace(/^\[|\]$/g, '').toLowerCase();
  return host || null;
}

/** Hosts that are this site itself. */
export function ownHostSet(siteUrl) {
  const hosts = new Set();
  for (const u of [PRODUCTION_ORIGIN, siteUrl]) {
    const h = hostOfUrl(u);
    if (h) {
      hosts.add(h);
      hosts.add(h.replace(/^www\./, ''));
      hosts.add('www.' + h.replace(/^www\./, ''));
    }
  }
  return hosts;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Is `name` (a hostname or a registrable domain) written in the policy text as a whole name, not as the tail of a longer hostname or the head of a longer word? */
export function namedIn(policyText, name) {
  return new RegExp(`(?<![a-z0-9.-])${escapeRe(name.toLowerCase())}(?![a-z0-9-]|\\.[a-z0-9])`).test(policyText.toLowerCase());
}
/** A host is disclosed when the policy names the host itself or its registrable domain. */
export const isDisclosed = (host, policyText) => namedIn(policyText, host) || namedIn(policyText, registrableDomain(host));

/* ---------------------------------------------------------------------------------------------- */
/* What a page can load                                                                            */
/* ---------------------------------------------------------------------------------------------- */

const LOADING_RELS = new Set([
  'stylesheet', 'preload', 'modulepreload', 'prefetch', 'preconnect', 'dns-prefetch', 'prerender', 'icon', 'apple-touch-icon', 'apple-touch-icon-precomposed', 'mask-icon', 'manifest', 'fluid-icon',
]);
const CSP_FETCH_DIRECTIVES = new Set([
  'default-src', 'script-src', 'script-src-elem', 'script-src-attr', 'style-src', 'style-src-elem', 'style-src-attr', 'img-src', 'font-src', 'connect-src', 'frame-src', 'child-src', 'media-src',
  'object-src', 'worker-src', 'manifest-src', 'prefetch-src',
]);
const CSP_KEYWORD = /^'(?:self|none|unsafe-inline|unsafe-eval|unsafe-hashes|strict-dynamic|report-sample|wasm-unsafe-eval|inline-speculation-rules|(?:nonce|sha256|sha384|sha512)-[^']*)'$/i;
const CSP_LOCAL_SCHEME = /^(?:data|blob|filesystem|mediastream):$/i;
const CSP_CATCH_ALL = /^(?:\*|https?:|wss?:)$/i;

/**
 * Every reference of one parsed page that a browser requests on its own: [{ via, url }] where `via` names the surface ("script src", "link[stylesheet] href",
 * "img srcset", "style url()", …) and `url` is the reference as written.
 */
export function loadedReferences(doc) {
  const refs = [];
  const add = (via, url) => {
    if (url !== undefined && url !== null && String(url).trim() !== '') refs.push({ via, url: String(url).trim() });
  };
  for (const el of elements(doc)) {
    const a = el.attrs;
    if (el.ns === 'svg') {
      if (el.tag === 'image' || el.tag === 'use' || el.tag === 'feimage') {
        add(`svg ${el.tag} href`, a.href);
        add(`svg ${el.tag} xlink:href`, a['xlink:href']);
      }
    } else {
      switch (el.tag) {
        case 'script':
          add('script src', a.src);
          break;
        case 'link': {
          const rels = (a.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
          const loading = rels.find((r) => LOADING_RELS.has(r));
          if (loading) add(`link[${loading}] href`, a.href);
          break;
        }
        case 'img':
          add('img src', a.src);
          if (a.srcset !== undefined) for (const c of parseSrcset(a.srcset)) add('img srcset', c.url);
          break;
        case 'source':
          add('source src', a.src);
          if (a.srcset !== undefined) for (const c of parseSrcset(a.srcset)) add('source srcset', c.url);
          break;
        case 'iframe':
        case 'embed':
        case 'audio':
        case 'track':
          add(`${el.tag} src`, a.src);
          break;
        case 'video':
          add('video src', a.src);
          add('video poster', a.poster);
          break;
        case 'object':
          add('object data', a.data);
          break;
        case 'input':
          if ((a.type ?? '').toLowerCase() === 'image') add('input[image] src', a.src);
          break;
        case 'style':
          for (const u of cssUrls(textContent(el))) add('style url()', u);
          break;
        default:
      }
    }
    if (a.style) for (const u of cssUrls(a.style)) add('style attribute url()', u);
  }
  return refs;
}

/** The origins a Content-Security-Policy text allows: { hosts: [{ directive, host }], catchAll: [{ directive, token }] }. */
export function cspOrigins(cspText) {
  const hosts = [];
  const catchAll = [];
  for (const part of String(cspText ?? '').split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    const directive = (name ?? '').toLowerCase();
    if (!CSP_FETCH_DIRECTIVES.has(directive)) continue;
    for (const token of sources) {
      if (!token || CSP_KEYWORD.test(token) || CSP_LOCAL_SCHEME.test(token)) continue;
      if (CSP_CATCH_ALL.test(token)) {
        catchAll.push({ directive, token });
        continue;
      }
      // host-source: [scheme://]host[:port][/path], host may start with "*."
      const m = /^(?:[a-z][a-z0-9+.-]*:\/\/)?(\*\.)?([^/:?#\s]+)/i.exec(token);
      if (m && m[2].includes('.')) hosts.push({ directive, host: m[2].toLowerCase() });
    }
  }
  return { hosts, catchAll };
}

/* ---------------------------------------------------------------------------------------------- */
/* The check                                                                                       */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Third-party origins a page can load that the policy does not name. `pages` is a list of { route, doc }, `css` a list of { name, text },
 * `policyText` the visible text of the privacy policy (null when the page is missing). Returns { findings, origins } where origins
 * is a Map host -> { loads: Set(via), where: Set(route or css file), disclosed }.
 */
export function privacyOriginFindings({ pages, css = [], policyText, own }) {
  const findings = new Findings();
  const origins = new Map();
  const seen = (host, where, via) => {
    if (own.has(host)) return;
    if (!origins.has(host)) origins.set(host, { loads: new Set(), where: new Set(), disclosed: policyText !== null && isDisclosed(host, policyText) });
    const o = origins.get(host);
    o.loads.add(via);
    o.where.add(where);
  };
  if (policyText === null) findings.error('policy-missing', '/privacy-policy/', 'the privacy policy page is not in the build, so no third-party origin can be disclosed');
  for (const { route, doc } of pages) {
    for (const { via, url } of loadedReferences(doc)) {
      const host = hostOfUrl(url);
      if (host) seen(host, route, via);
    }
    const csp = metaContent(doc, { httpEquiv: 'content-security-policy' });
    if (csp !== null) {
      const { hosts, catchAll } = cspOrigins(csp);
      for (const { directive, host } of hosts) seen(host, route, `CSP ${directive}`);
      for (const { directive, token } of catchAll) {
        findings.error('csp-catch-all', route, `the Content-Security-Policy ${directive} allows every origin on "${token}", which no policy text can name`);
      }
    }
  }
  for (const { name, text } of css) {
    for (const url of cssUrls(text)) {
      const host = hostOfUrl(url);
      if (host) seen(host, name, 'css url()/@import');
    }
  }
  for (const [host, o] of origins) {
    if (o.disclosed) continue;
    const where = [...o.where].sort();
    findings.error(
      'origin-not-disclosed',
      where[0],
      `third-party origin ${host} (registrable domain ${registrableDomain(host)}) can be loaded via ${[...o.loads].sort().join(', ')} on ${where.length} page(s)/file(s) but /privacy-policy/ names neither the host nor its domain`,
      { evidence: where.slice(0, 5).join(', ') },
    );
  }
  return { findings, origins };
}

/* ---- self-test: negative fixtures first ---- */
{
  const POLICY = 'Every service involved: GitHub Pages (hosting). YouTube (youtube-nocookie.com) after you click play. Google Forms at docs.google.com. jobready.global. cdn.example.net is named.';
  const own = ownHostSet('https://ctjobready.github.io');
  const page = (head = '', body = '') => ({ route: '/x/', doc: parseHtml(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>t</title>${head}</head><body>${body}</body></html>`) });
  const failures = [];
  const run = (pages, extra = {}) => privacyOriginFindings({ pages, policyText: POLICY, own, ...extra });
  const mustFail = (why, pages, extra) => {
    if (!run(pages, extra).findings.errors.length) failures.push(`accepted ${why}`);
  };
  const mustPass = (why, pages, extra) => {
    const r = run(pages, extra).findings.errors;
    if (r.length) failures.push(`rejected ${why}: ${r.map((f) => f.message).join('; ')}`);
  };
  // every surface in the task's list, undisclosed
  mustFail('a third-party script src', [page('<script src="https://analytics.vendor.example/a.js"></script>')]);
  mustFail('a protocol-relative script src', [page('<script src="//analytics.vendor.example/a.js"></script>')]);
  mustFail('a third-party stylesheet', [page('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">')]);
  mustFail('a third-party font preload', [page('<link rel="preload" as="font" href="https://fonts.gstatic.com/s/inter.woff2" crossorigin>')]);
  mustFail('a third-party modulepreload', [page('<link rel="modulepreload" href="https://esm.vendor.example/m.js">')]);
  mustFail('a third-party icon', [page('<link rel="shortcut icon" href="https://assets.vendor.example/favicon.ico">')]);
  mustFail('a third-party preconnect', [page('<link rel="preconnect" href="https://fonts.googleapis.com">')]);
  mustFail('a third-party img src', [page('', '<img src="https://images.vendor.example/a.png" alt="" width="1" height="1">')]);
  mustFail('a third-party img srcset candidate', [page('', '<img src="/a.png" srcset="/a.png 1x, https://images.vendor.example/a2.png 2x" alt="" width="1" height="1">')]);
  mustFail('a third-party source srcset', [page('', '<picture><source srcset="https://images.vendor.example/a.webp" type="image/webp"><img src="/a.png" alt="" width="1" height="1"></picture>')]);
  mustFail('a third-party iframe', [page('', '<iframe src="https://player.vimeo.com/video/1" title="v"></iframe>')]);
  mustFail('a YouTube iframe when the policy names only youtube-nocookie.com', [page('', '<iframe src="https://www.youtube.com/embed/x" title="v"></iframe>')]);
  mustFail('a third-party video src', [page('', '<video src="https://media.vendor.example/v.mp4"></video>')]);
  mustFail('a third-party video poster', [page('', '<video src="/v.mp4" poster="https://media.vendor.example/p.jpg"></video>')]);
  mustFail('a third-party audio src', [page('', '<audio src="https://media.vendor.example/a.mp3"></audio>')]);
  mustFail('a third-party SVG image', [page('', '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://images.vendor.example/a.png" width="1" height="1"/></svg>')]);
  mustFail('a url() in a style block', [page('<style>.a{background:url("https://images.vendor.example/a.png")}</style>')]);
  mustFail('an @import in a style block', [page('<style>@import url("https://fonts.googleapis.com/css2?family=Inter");</style>')]);
  mustFail('a url() in a style attribute', [page('', '<div style="background:url(https://images.vendor.example/a.png)"></div>')]);
  mustFail('a third-party url() in a stylesheet file', [page()], { css: [{ name: '_astro/a.css', text: '@font-face{src:url(https://fonts.gstatic.com/s/inter.woff2)}' }] });
  mustFail('an upper-case host that the policy does not name', [page('<script src="HTTPS://CDN.Other.Example/a.js"></script>')]);
  // CSP: every listed directive, wildcards and catch-alls
  for (const d of ['connect-src', 'frame-src', 'img-src', 'script-src', 'style-src', 'font-src', 'media-src']) {
    mustFail(`a CSP ${d} host the policy does not name`, [page(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; ${d} 'self' https://api.vendor.example">`)]);
  }
  mustFail('a CSP wildcard subdomain the policy does not name', [page(`<meta http-equiv="Content-Security-Policy" content="img-src 'self' https://*.vendor.example data:">`)]);
  mustFail('a CSP catch-all https: source', [page(`<meta http-equiv="Content-Security-Policy" content="img-src 'self' https:">`)]);
  mustFail('a CSP catch-all * source', [page(`<meta http-equiv="Content-Security-Policy" content="connect-src *">`)]);
  mustFail('a CSP catch-all wss: source', [page(`<meta http-equiv="Content-Security-Policy" content="connect-src 'self' wss:">`)]);
  // matching is by whole name: a longer hostname or a lookalike does not count as the policy naming it
  mustFail('a host whose name only ends like a disclosed one (notexample.net)', [page('<script src="https://notexample.net/a.js"></script>')], { policyText: 'We use example.net.' });
  mustFail('a different subdomain when the policy names only www.example.net', [page('<script src="https://cdn.example.net/a.js"></script>')], { policyText: 'We use www.example.net.' });
  mustFail('a domain the policy names only as the tail of another hostname (api.youtube-nocookie.com.evil.example)', [page('<script src="https://youtube-nocookie.com.evil.example/a.js"></script>')], { policyText: 'We use youtube-nocookie.com.' });
  mustFail('any load when the privacy policy page is missing', [page('<script src="https://cdn.example.net/a.js"></script>')], { policyText: null });
  // disclosed or exempt: nothing to report
  mustPass('a script from a host the policy names (cdn.example.net)', [page('<script src="https://cdn.example.net/a.js"></script>')]);
  mustPass('a host covered by its registrable domain (www.youtube-nocookie.com)', [page('', '<iframe src="https://www.youtube-nocookie.com/embed/x" title="v"></iframe>')]);
  mustPass('a CSP host covered by its registrable domain', [page(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'; frame-src https://www.youtube-nocookie.com; img-src 'self' data:; script-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests">`)]);
  mustPass('a host followed by a full stop in the policy sentence', [page('<script src="https://jobready.global/a.js"></script>')]);
  mustPass('relative, root-relative and data: references', [page('<link rel="stylesheet" href="/ctg/_astro/a.css"><script src="a.js"></script>', '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt="" width="1" height="1"><img src="/a.png" alt="" width="1" height="1">')]);
  mustPass('the site’s own origin, on staging and in production', [page('<link rel="stylesheet" href="https://ctjobready.github.io/ctg/_astro/a.css"><script src="https://coderstrust.global/a.js"></script>')]);
  mustPass('plain outbound links (not loads)', [page('', '<a href="https://www.linkedin.com/company/x">in</a><a href="https://twitter.com/x">x</a><a href="//maps.vendor.example/q">map</a>')]);
  mustPass('canonical, alternate and other non-loading links', [page('<link rel="canonical" href="https://other.vendor.example/"><link rel="alternate" type="application/rss+xml" href="https://feeds.vendor.example/rss">')]);
  mustPass('meta tags that are only crawler hints (og:image)', [page('<meta property="og:image" content="https://images.vendor.example/og.png">')]);
  mustPass('mailto:, tel: and form actions', [page('', '<a href="mailto:a@vendor.example">m</a><a href="tel:+1">t</a><form action="https://forms.vendor.example/post"></form>')]);
  mustPass('a service the policy names that no page loads', [page()], { policyText: 'GitHub Pages hosts this site; docs.google.com forms; nothing else.' });
  mustPass('a style block with only local and data: urls', [page('<style>.a{background:url(/a.png)}.b{background:url(data:image/gif;base64,AAAA)}</style>')]);
  // helpers
  if (registrableDomain('www.youtube-nocookie.com') !== 'youtube-nocookie.com' || registrableDomain('cdn.example.co.uk') !== 'example.co.uk' || registrableDomain('example.com') !== 'example.com') failures.push('registrableDomain gave the wrong domain');
  if (hostOfUrl('https://user:pw@Cdn.Example.NET:8443/a?b#c') !== 'cdn.example.net' || hostOfUrl('/a') !== null || hostOfUrl('data:image/png;base64,AA') !== null || hostOfUrl('mailto:a@b.example') !== null) failures.push('hostOfUrl gave the wrong host');
  if (failures.length) {
    console.error(`check-privacy-origins: ${failures.length} self-test failure(s)\n` + failures.map((f) => '  - ' + f).join('\n'));
    process.exit(1);
  }
}

/* ---- run over the build ---- */
const cfg = loadConfig(process.argv.slice(2));
let site;
try {
  site = loadSite(cfg);
} catch (e) {
  fatal(`check-privacy-origins: ${e.message}`);
}
// The policy's own text only: the page <main>, not the site header, menus or footer, which would "name" a host the policy does not.
const policy = site.pages.find((p) => p.route === '/privacy-policy/');
const policyText = policy ? visibleText(first(policy.doc, 'main') ?? policy.doc).text : null;
const css = site.relFiles.filter((f) => f.endsWith('.css')).map((f) => ({ name: f, text: readFileSync(join(cfg.dist, f), 'utf8') }));
const own = ownHostSet(cfg.siteUrl);
const { findings, origins } = privacyOriginFindings({ pages: site.pages, css, policyText, own });
const rows = [...origins].sort(([a], [b]) => a.localeCompare(b)).map(([host, o]) => [host, registrableDomain(host), [...o.loads].sort().join(', '), o.where.size, o.disclosed ? 'named in /privacy-policy/' : 'NOT NAMED']);
console.log(
  `check-privacy-origins: ${site.pages.length} page(s), ${css.length} stylesheet(s); ${origins.size} third-party origin(s) can be loaded` +
    (origins.size ? ` (${[...origins.keys()].sort().join(', ')})` : '') +
    `; policy ${policyText === null ? 'MISSING' : 'read (' + policyText.length + ' characters)'}`,
);
printFindings('check-privacy-origins', findings);
const md = `# Privacy-origin check\n\nPages: ${site.pages.length} · stylesheets: ${css.length} · third-party origins a page can load: ${origins.size}\n\n## Origins\n\n${mdTable(['Host', 'Registrable domain', 'Loaded via', 'Pages/files', 'Disclosure'], rows)}\n## Findings\n${findingsMarkdown(findings)}`;
const paths = writeReports(cfg, 'privacy-origins', { check: 'privacy-origins', origins: rows, findings: findings.items }, md);
console.log(`reports: ${relative(process.cwd(), paths.json)}, ${relative(process.cwd(), paths.md)}`);
process.exit(findings.errors.length ? 1 : 0);
