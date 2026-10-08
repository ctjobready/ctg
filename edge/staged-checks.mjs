#!/usr/bin/env node
/**
 * Staged-hostname checks of the edge rules (planning/08 §7 "Tests" and §11 step 9; planning/10 §1 "Edge redirect rules").
 *
 *   EDGE_HOST=https://staging.example.net node edge/staged-checks.mjs
 *
 * Sends the request list from edge/README.md section 3 to a staging hostname that sits behind Cloudflare with the Bulk Redirects
 * list and the Worker switched on, and compares every answer: status, destination, one hop, no query string left on the
 * destination. IDs and destinations come from the migration manifest (the same data the Worker's id map is generated from), so
 * the list cannot drift from the site.
 *
 * NETWORK: this is the only place in the repository that talks to a host, and only when EDGE_HOST is set. Without it the script
 * prints the checklist and exits 0. Nothing is sent to the production hostname unless it is named in EDGE_HOST.
 *
 * Exports `buildCases` and `runStaged` so the Worker tests can run the same cases against a local loopback server.
 */
import { loadManifest } from '../scripts/manifest-lib.mjs';
import { pathToFileURL } from 'node:url';

const COURSES = 'https://jobready.global/courses/';

/** Samples taken from the manifest, never invented: a known post, page, course and attachment ID with their destinations. */
export function samples(manifest = loadManifest()) {
  const ids = manifest.filter((r) => r.class === 'query-string' && /^\/\?(p|page_id)=\d+$/.test(r.legacy_url));
  const page = ids.find((r) => r.legacy_url.startsWith('/?page_id=') && r.destination === '/about/');
  const post = ids.find((r) => r.legacy_url.startsWith('/?p=') && r.destination.startsWith('/news/'));
  const course = ids.find((r) => r.destination.startsWith('https://jobready.global/course/'));
  const attachment = manifest.find((r) => r.class === 'attachment' && r.destination.startsWith('/'));
  if (!page || !post || !course || !attachment) throw new Error('the manifest has no sample page, post, course or attachment ID');
  return { page, post, course, attachment };
}

/**
 * The cases. `want` is { status, to } where `to` is a site path (compared with the Location's path and fragment, so the staging
 * origin does not matter), an absolute https URL (compared whole), or null (no Location expected).
 */
export function buildCases(s = samples()) {
  const id = s.post.content_id;
  const home = '/';
  return [
    ['legacy path (Bulk Redirects list)', '/team/', { status: 301, to: '/about/team/' }],
    ['legacy path with tracking parameters only (still the list)', '/team/?utm_source=x&fbclid=y', { status: 301, to: '/about/team/' }],
    ['COLLISION /team/?p=<known id> (Worker, not the list)', `/team/?p=${id}`, { status: 301, to: s.post.destination }],
    ['COLLISION encoded parameter name /team/?%70=<known id>', `/team/?%70=${id}`, { status: 301, to: s.post.destination }],
    ['COLLISION archive path with its own parameter', '/category/latest-news/?cat=3', { status: 301, to: '/news/' }],
    ['COLLISION feed path with an ID (the ID wins)', `/feed/?p=${id}`, { status: 301, to: s.post.destination }],
    ['/?p=<known id> with tracking parameters', `/?p=${id}&utm_source=x&fbclid=y`, { status: 301, to: s.post.destination }],
    ['/?page_id=<known id>', `/?page_id=${s.page.content_id}`, { status: 301, to: s.page.destination }],
    ['course ID goes to JobReady', `/?p=${s.course.content_id}`, { status: 301, to: s.course.destination }],
    ['percent-encoded ID is decoded once', `/?p=${[...id].map((c) => '%' + c.charCodeAt(0).toString(16)).join('')}`, { status: 301, to: s.post.destination }],
    ['malformed value goes home', '/?p=12abc', { status: 301, to: home }],
    ['empty value goes home', '/?p=', { status: 301, to: home }],
    ['unknown ID goes home', '/?p=99999999', { status: 301, to: home }],
    ['/?s=term (the term is not forwarded)', '/?s=term', { status: 301, to: '/news/' }],
    ['ID on a deep path', `/news/?p=${id}`, { status: 301, to: s.post.destination }],
    ['/?attachment_id=<known id>', `/?attachment_id=${s.attachment.content_id}`, { status: 301, to: s.attachment.destination }],
    ['/?cat=3', '/?cat=3', { status: 301, to: '/news/' }],
    ['/?tag=latest-news', '/?tag=latest-news', { status: 301, to: '/news/' }],
    ['/?author=2', '/?author=2', { status: 301, to: '/about/team/' }],
    ['/?feed=rss2', '/?feed=rss2', { status: 301, to: '/news/' }],
    ['/?post_type=course (known course type)', '/?post_type=course', { status: 301, to: COURSES }],
    ['precedence: cat before author', '/?author=2&cat=3', { status: 301, to: '/news/' }],
    ['precedence: p before everything', `/?s=term&author=2&p=${id}`, { status: 301, to: s.post.destination }],
    ['duplicate parameter: the first wins', `/?p=${id}&p=99999999`, { status: 301, to: s.post.destination }],
    ['WordPress system path /wp-login.php', '/wp-login.php', { status: 410, to: null }],
    ['WordPress system path /wp-admin/', '/wp-admin/', { status: 410, to: null }],
    ['WordPress system path /wp-json/', '/wp-json/wp/v2/posts', { status: 410, to: null }],
    ['WordPress system path /xmlrpc.php', '/xmlrpc.php', { status: 410, to: null }],
    ['WordPress system path /wp-cron.php', '/wp-cron.php', { status: 410, to: null }],
    ['other query strings pass through untouched', '/about/?utm_source=x', { status: 200, to: null }],
    ['a page without a query string is served', '/about/', { status: 200, to: null }],
  ];
}

/** Compare a Location header with the wanted destination; returns a problem string or null. */
function locationProblem(location, want, host) {
  if (!location) return 'no Location header';
  if (location.includes('?')) return `the destination carries a query string (${location})`;
  if (want.startsWith('https://')) return location === want ? null : `Location is ${location}, expected ${want}`;
  const u = new URL(location, host);
  const got = u.pathname + u.hash;
  return got === want ? null : `Location is ${got}, expected ${want}`;
}

/**
 * Run every case against `host` (an origin such as https://staging.example.net). Returns { passed, failed, lines }.
 * `fetchImpl` is injectable for tests; the default is the global fetch with manual redirects, so each hop is seen.
 */
export async function runStaged(host, { cases = buildCases(), fetchImpl = fetch } = {}) {
  const origin = host.replace(/\/+$/, '');
  const lines = [];
  let passed = 0;
  let failed = 0;
  for (const [name, path, want] of cases) {
    const problems = [];
    let res;
    try {
      res = await fetchImpl(origin + path, { redirect: 'manual', headers: { 'user-agent': 'ctg-edge-staged-checks' } });
    } catch (e) {
      problems.push(`request failed: ${e.message}`);
    }
    if (res) {
      if (res.status !== want.status) problems.push(`status ${res.status}, expected ${want.status}`);
      else if (want.to) {
        const p = locationProblem(res.headers.get('location'), want.to, origin);
        if (p) problems.push(p);
        else if (want.to.startsWith('/')) {
          // one hop: the destination page itself must not redirect again. The follow-up request goes to EDGE_HOST only, with the
          // destination's path: a Bulk Redirects target may name the production origin, which these checks never contact.
          try {
            const target = new URL(res.headers.get('location'), origin);
            const next = await fetchImpl(origin + target.pathname, { redirect: 'manual', headers: { 'user-agent': 'ctg-edge-staged-checks' } });
            if (next.status >= 300 && next.status < 400) problems.push(`redirect chain: the destination answers ${next.status}`);
          } catch (e) {
            problems.push(`destination request failed: ${e.message}`);
          }
        }
      }
    }
    if (problems.length) {
      failed++;
      lines.push(`FAIL  ${name}: ${path}\n        ${problems.join('; ')}`);
    } else {
      passed++;
      lines.push(`ok    ${name}: ${path} -> ${want.status}${want.to ? ' ' + want.to : ''}`);
    }
  }
  return { passed, failed, lines };
}

export function checklist() {
  return [
    'Staged-hostname checklist (planning/08 §11 step 9; edge/README.md sections 1-4):',
    '  1. Load the Bulk Redirects list and the Worker on a STAGING hostname behind Cloudflare (orange cloud); production comes later.',
    '  2. The Bulk Redirect rule carries the rule expression from edge/README.md (WordPress parameters and system paths excluded).',
    '  3. Set the Worker variable TARGET_ORIGIN for the staging hostname if redirects should point at the production origin.',
    '  4. Run this checklist against the staging hostname:  EDGE_HOST=https://<staging host> npm run test:edge-release',
    '     (collisions, precedence, encoded and malformed values, 410 system paths, tracking parameters, one hop, no query on the destination).',
    '  5. Only then enable the list and the Worker for the production hostname, add the Transform Rules, and run the production smoke list.',
    '  6. Certificates: the GitHub Pages origin certificate is provisioned and validated first (up to 24 h); Full (strict) only after',
    '     that; a temporary proxy fallback uses Full (not strict).',
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = (process.env.EDGE_HOST ?? '').trim();
  console.log(checklist().join('\n'));
  if (!host) {
    console.log('\nEDGE_HOST is not set: the staged requests were NOT sent (no network used). Set EDGE_HOST to a staging hostname to run them.');
    process.exit(0);
  }
  if (!/^https:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(host) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) {
    console.error(`\nEDGE_HOST must be an https origin such as https://staging.example.net (got ${JSON.stringify(host)}).`);
    process.exit(1);
  }
  console.log(`\nSending ${buildCases().length} requests to ${host} ...\n`);
  const { passed, failed, lines } = await runStaged(host);
  console.log(lines.join('\n'));
  console.log(`\nstaged edge checks: ${failed ? `${failed} of ${passed + failed} FAILED` : `all ${passed} passed`}`);
  process.exit(failed ? 1 : 0);
}
