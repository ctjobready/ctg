/**
 * Tests for the query-aware Worker (planning/08 §7 "Tests", planning/10 §1 "Edge redirect rules").
 * No network, no dependencies: `node --test edge/worker/test/`.
 * IDs come from the generated map and the migration manifest, so the tests cover every class of legacy content.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import worker, { handle, isSystemPath, resolveLocation, destinationFor, winningParam, PARAM_ORDER, CANONICAL_ORIGIN } from '../src/index.mjs';
import { loadManifest, needsStub } from '../../../scripts/manifest-lib.mjs';
import { buildCases, runStaged } from '../../staged-checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ID_MAP = JSON.parse(readFileSync(path.join(here, '..', 'id-map.json'), 'utf8'));
const MANIFEST = loadManifest();
const STUB_PATHS = new Set(MANIFEST.filter(needsStub).map((r) => r.legacy_url));

const req = (url, init) => new Request(url, init);
const at = (pathAndQuery, init) => req(`${CANONICAL_ORIGIN}${pathAndQuery}`, init);
const abs = (dest) => (dest.startsWith('https://') ? dest : CANONICAL_ORIGIN + dest);
const idRows = MANIFEST.filter((r) => r.class === 'query-string' && /^\/\?(p|page_id)=\d+$/.test(r.legacy_url));
const attRows = MANIFEST.filter((r) => r.class === 'attachment');

function expectRedirect(res, location) {
  assert.ok(res, 'expected a redirect, got pass-through');
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), location);
  assert.ok(!res.headers.get('location').includes('?'), 'destination must not carry a query string');
}
const expectHome = (res) => expectRedirect(res, CANONICAL_ORIGIN + '/');

/** Percent-encode every character of a string (%31%32 for "12"). */
const pct = (s) => [...s].map((c) => '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')).join('');

// A known ID of each class of content, taken from the map (not invented).
const sample = (pred) => idRows.find(pred);
const SAMPLES = {
  page: sample((r) => r.legacy_url.startsWith('/?page_id=') && r.destination === '/about/'),
  post: sample((r) => r.legacy_url.startsWith('/?p=') && r.destination.startsWith('/news/')),
  course: sample((r) => r.destination.startsWith('https://jobready.global/course/')),
  team: sample((r) => r.destination.startsWith('/about/team/') && r.destination !== '/about/team/'),
  withheld: sample((r) => r.disposition === 'WITHHELD'),
  home: sample((r) => r.destination === '/'),
};

test('the map and the samples are real', () => {
  assert.ok(Object.keys(ID_MAP.ids).length > 150, 'id map should hold every content ID');
  for (const [k, r] of Object.entries(SAMPLES)) assert.ok(r, `no ${k} sample in the manifest`);
  assert.equal(SAMPLES.page.content_id, '7670');
  assert.equal(ID_MAP.ids['7670'], '/about/');
});

test('every map destination is a site path or an absolute https URL on an allowed host', () => {
  const all = [...Object.values(ID_MAP.ids), ...Object.values(ID_MAP.attachments), ...Object.values(ID_MAP.slugs)];
  for (const d of all) {
    assert.ok(d.startsWith('/') && !d.startsWith('//') ? true : /^https:\/\/jobready\.global\//.test(d), `bad destination ${d}`);
    assert.equal(resolveLocation(d, CANONICAL_ORIGIN), abs(d), `resolveLocation rejected ${d}`);
  }
});

test('/?p=<id> and /?page_id=<id>: one 301 for every known ID in the manifest', () => {
  assert.ok(idRows.length > 150);
  for (const r of idRows) {
    const res = handle(at(r.legacy_url));
    expectRedirect(res, abs(r.destination));
    // single hop: the destination is never a legacy path that would redirect again
    const p = r.destination.startsWith('/') ? r.destination.split('#')[0] : null;
    if (p) assert.ok(!STUB_PATHS.has(p), `${r.legacy_url} -> ${r.destination} would chain through a stub`);
  }
});

test('a known ID answers the same with p or page_id, on every class of content', () => {
  for (const [name, r] of Object.entries(SAMPLES)) {
    const id = r.content_id;
    const want = abs(r.destination);
    expectRedirect(handle(at(`/?p=${id}`)), want);
    expectRedirect(handle(at(`/?page_id=${id}`)), want);
    assert.ok(want, name);
  }
  // the withheld case study never points at a page of its own
  expectRedirect(handle(at(`/?page_id=${SAMPLES.withheld.content_id}`)), CANONICAL_ORIGIN + '/impact/case-studies/');
});

test('tracking and extra parameters are ignored and never forwarded', () => {
  const id = SAMPLES.post.content_id;
  const want = abs(SAMPLES.post.destination);
  for (const q of [
    `p=${id}&utm_source=x&fbclid=y`,
    `utm_campaign=a&p=${id}&gclid=z&utm_medium=m`,
    `p=${id}&foo=bar&baz=%E0%A4%A`,
    `fbclid=1&p=${id}`,
  ]) {
    expectRedirect(handle(at(`/?${q}`)), want);
  }
});

test('percent-encoded values are decoded once and validated as digits', () => {
  const id = SAMPLES.post.content_id;
  const want = abs(SAMPLES.post.destination);
  expectRedirect(handle(at(`/?p=${pct(id)}`)), want); // /?p=%32%30... decodes to the ID
  expectRedirect(handle(at(`/?%70=${id}`)), want); // an encoded parameter name decodes too
  expectHome(handle(at(`/?p=${pct(pct(id))}`))); // double-encoded: one decode leaves "%32...", not digits
  expectHome(handle(at(`/?p=%3D${id}`))); // "=2091"
  expectHome(handle(at(`/?p=%20${id}`))); // " 2091": not purely digits
  expectHome(handle(at(`/?p=${id}%20`)));
  expectHome(handle(at(`/?p=${id}%00`)));
  expectHome(handle(at(`/?p=%E0%A4%A`))); // malformed encoding
  expectHome(handle(at(`/?p=%`)));
  expectHome(handle(at(`/?p=%31%32abc`)));
});

test('malformed, empty and unknown IDs go to the home page', () => {
  for (const q of ['p=12abc', 'p=', 'page_id=', 'p=abc', 'p=-5', 'p=1.5', 'p=0', 'p=99999999', 'p=99999999999999999999999', 'page_id=0', 'p=%2D1', 'p=__proto__', 'p=constructor', 'attachment_id=abc']) {
    expectHome(handle(at(`/?${q}`)));
  }
  // an ID parameter that is present but empty still wins over a later parameter
  expectHome(handle(at('/?p=&s=term')));
});

test('duplicate parameters: the first one wins', () => {
  const a = SAMPLES.post;
  const b = SAMPLES.team;
  expectRedirect(handle(at(`/?p=${a.content_id}&p=${b.content_id}`)), abs(a.destination));
  expectRedirect(handle(at(`/?p=${b.content_id}&p=${a.content_id}`)), abs(b.destination));
  expectHome(handle(at(`/?p=0&p=${a.content_id}`))); // first is unknown: home, the second is not consulted
  expectRedirect(handle(at(`/?p=${a.content_id}&page_id=${b.content_id}`)), abs(a.destination)); // p precedes page_id
});

test('?s=term goes to /news/ and the term is never forwarded', () => {
  for (const q of ['s=term', 's=', 's=a%20b%26c', 's=%E2%9C%93', 's=%', 's=zero%20results&utm_source=x']) {
    const res = handle(at(`/?${q}`));
    expectRedirect(res, CANONICAL_ORIGIN + '/news/');
    assert.ok(!res.headers.get('location').includes('term'));
  }
});

test('WordPress parameters are inspected on any path, not only the home page', () => {
  const id = SAMPLES.post.content_id;
  const want = abs(SAMPLES.post.destination);
  expectRedirect(handle(at(`/news/?p=${id}`)), want);
  expectRedirect(handle(at(`/about/team/?page_id=${id}`)), want);
  expectRedirect(handle(at(`/some/deep/legacy/path/?p=${id}&utm_source=x`)), want);
  expectRedirect(handle(at('/news/some-article/?s=hello')), CANONICAL_ORIGIN + '/news/');
  expectRedirect(handle(at('/anything/?cat=3')), CANONICAL_ORIGIN + '/news/');
  expectRedirect(handle(at('/anything/?author=2')), CANONICAL_ORIGIN + '/about/team/');
  expectHome(handle(at('/about/?p=nope')));
});

test('?attachment_id=<id> goes to the attachment parent page or post', () => {
  assert.ok(attRows.length > 50);
  for (const r of attRows) expectRedirect(handle(at(`/?attachment_id=${r.content_id}`)), abs(r.destination));
  const a = attRows[0];
  expectRedirect(handle(at(`/news/?attachment_id=${a.content_id}&utm_source=x`)), abs(a.destination));
  expectRedirect(handle(at(`/?attachment_id=${pct(a.content_id)}`)), abs(a.destination));
  expectHome(handle(at('/?attachment_id=1')));
  expectHome(handle(at('/?attachment_id=')));
  // a page ID is not an attachment ID
  expectHome(handle(at(`/?attachment_id=${SAMPLES.page.content_id}`)));
});

test('?cat=, ?tag= -> /news/, ?author= -> /about/team/, ?feed= -> /news/', () => {
  for (const q of ['cat=3', 'cat=', 'cat=abc', 'tag=latest-news', 'tag=', 'cat=3&tag=4']) expectRedirect(handle(at(`/?${q}`)), CANONICAL_ORIGIN + '/news/');
  for (const q of ['author=2', 'author=', 'author=joya']) expectRedirect(handle(at(`/?${q}`)), CANONICAL_ORIGIN + '/about/team/');
  for (const q of ['feed=rss2', 'feed=atom', 'feed=']) expectRedirect(handle(at(`/?${q}`)), CANONICAL_ORIGIN + '/news/');
  expectRedirect(handle(at('/jobs/?feed=rss2')), CANONICAL_ORIGIN + '/news/');
  expectRedirect(handle(at('/?feed=rss2&utm_source=x')), CANONICAL_ORIGIN + '/news/');
});

/* ---- precedence when several WordPress parameters are present (planning/08 §7, review round 8 M7) ---- */

test('PARAM_ORDER is exactly the documented precedence', () => {
  assert.deepEqual([...PARAM_ORDER], ['p', 'page_id', 'attachment_id', 'post_type', 'cat', 'tag', 'author', 'feed', 's']);
});

test('precedence: of two recognized parameters the earlier one in PARAM_ORDER wins, in either URL order', () => {
  for (let i = 0; i < PARAM_ORDER.length; i++) {
    for (let j = i + 1; j < PARAM_ORDER.length; j++) {
      const early = PARAM_ORDER[i];
      const late = PARAM_ORDER[j];
      for (const q of [`${early}=1&${late}=1`, `${late}=1&${early}=1`, `utm_source=x&${late}=1&fbclid=y&${early}=1`]) {
        assert.equal(winningParam(new URLSearchParams(q)), early, `${q} should be decided by ${early}`);
        assert.equal(winningParam(new URL(`${CANONICAL_ORIGIN}/?${q}`).searchParams), early, `${q} (URL) should be decided by ${early}`);
      }
    }
  }
  assert.equal(winningParam(new URLSearchParams('utm_source=x&name=y&P=1')), null);
});

test('precedence: the destinations follow it (distinguishable pairs)', () => {
  const news = CANONICAL_ORIGIN + '/news/';
  const team = CANONICAL_ORIGIN + '/about/team/';
  const id = SAMPLES.post.content_id;
  const want = abs(SAMPLES.post.destination);
  const att = attRows[0];
  // p beats everything after it, page_id beats attachment_id and the rest
  for (const rest of ['page_id=7670', `attachment_id=${att.content_id}`, 'post_type=course', 'cat=3', 'tag=x', 'author=2', 'feed=rss2', 's=term']) {
    expectRedirect(handle(at(`/?${rest}&p=${id}`)), want);
    expectRedirect(handle(at(`/?p=${id}&${rest}`)), want);
  }
  expectRedirect(handle(at(`/?attachment_id=${att.content_id}&page_id=7670`)), abs('/about/')); // page_id precedes attachment_id
  expectRedirect(handle(at(`/?post_type=course&attachment_id=${att.content_id}`)), abs(att.destination)); // attachment_id precedes post_type
  expectRedirect(handle(at('/?author=2&post_type=course')), 'https://jobready.global/courses/'); // post_type precedes author
  expectRedirect(handle(at('/?author=2&cat=3')), news); // cat precedes author
  expectRedirect(handle(at('/?tag=x&author=2')), news); // tag precedes author
  expectRedirect(handle(at('/?feed=rss2&author=2')), team); // author precedes feed
  expectRedirect(handle(at('/?s=term&author=2')), team); // author precedes s
  expectRedirect(handle(at('/?s=term&feed=rss2')), news);
  // a present but invalid higher-precedence parameter still decides (an empty p goes home; s is not consulted)
  expectHome(handle(at('/?s=term&p=')));
  expectHome(handle(at('/?author=2&attachment_id=abc')));
});

/* ---- collisions with the Bulk Redirects list: real legacy paths from the migration manifest ---- */

// every path-based legacy URL the Bulk Redirects list covers (pages, posts, archives, feeds, courses, uploads), without the query rows
const LEGACY_PATHS = MANIFEST.filter((r) => !r.legacy_url.includes('?') && r.legacy_url !== '/' && ['page', 'post', 'archive', 'course', 'custom-post-type', 'attachment', 'media'].includes(r.class));

test('collisions: the manifest holds hundreds of real legacy paths, and /team/ is one of them', () => {
  assert.ok(LEGACY_PATHS.length > 800, `only ${LEGACY_PATHS.length} legacy paths`);
  const team = LEGACY_PATHS.find((r) => r.legacy_url === '/team/');
  assert.ok(team && team.destination === '/about/team/', '/team/ should redirect to /about/team/ in the list');
});

test('collisions: /team/?p=<known id> goes to the post, not to /about/team/ (the path rule would have caught it)', () => {
  const post = SAMPLES.post;
  const res = handle(at(`/team/?p=${post.content_id}`));
  expectRedirect(res, abs(post.destination));
  assert.notEqual(res.headers.get('location'), CANONICAL_ORIGIN + '/about/team/');
  expectRedirect(handle(at(`/team/?page_id=${SAMPLES.page.content_id}&utm_source=x`)), abs(SAMPLES.page.destination));
  // the path alone, and the path with only tracking parameters, are the Bulk Redirects list's job: the Worker passes them through
  assert.equal(handle(at('/team/')), null);
  assert.equal(handle(at('/team/?utm_source=x&fbclid=y')), null);
});

test('collisions: on every legacy path in the manifest a known ID decides, never the path', () => {
  const post = SAMPLES.post;
  const want = abs(post.destination);
  let differing = 0;
  for (const r of LEGACY_PATHS) {
    expectRedirect(handle(at(`${r.legacy_url}?p=${post.content_id}`)), want);
    expectRedirect(handle(at(`${r.legacy_url}?utm_source=x&page_id=${post.content_id}&fbclid=y`)), want);
    if (abs(r.destination) !== want) differing++;
  }
  assert.ok(differing > LEGACY_PATHS.length * 0.9, 'the test should cover paths whose own destination differs from the ID destination');
});

test('collisions: every recognized parameter, on every kind of legacy path, is answered by the Worker', () => {
  const byClass = new Map();
  for (const r of LEGACY_PATHS) if (!byClass.has(r.class)) byClass.set(r.class, []);
  for (const r of LEGACY_PATHS) byClass.get(r.class).push(r);
  assert.ok(byClass.size >= 6, 'expected several classes of legacy path');
  for (const rows of byClass.values()) {
    // first, middle and last of each class keeps the test fast and still spans every folder shape
    for (const r of [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]]) {
      for (const param of PARAM_ORDER) {
        const res = handle(at(`${r.legacy_url}?${param}=1`));
        assert.ok(res && res.status === 301, `${r.legacy_url}?${param}=1 should be answered by the Worker`);
        assert.ok(!res.headers.get('location').includes('?'));
      }
    }
  }
});

test('collisions: archive, author, feed and category paths keep their meaning for their own parameter', () => {
  const news = CANONICAL_ORIGIN + '/news/';
  expectRedirect(handle(at('/author/joya/?author=2')), CANONICAL_ORIGIN + '/about/team/');
  expectRedirect(handle(at('/category/latest-news/?cat=3')), news);
  expectRedirect(handle(at('/category/latest-news/page/2/?s=term')), news);
  expectRedirect(handle(at('/feed/?feed=rss2')), news);
  expectRedirect(handle(at(`/author/joya/?p=${SAMPLES.post.content_id}`)), abs(SAMPLES.post.destination)); // an ID on an author archive: the ID wins
  expectRedirect(handle(at(`/feed/?p=${SAMPLES.post.content_id}`)), abs(SAMPLES.post.destination));
  const courseRow = LEGACY_PATHS.find((r) => r.class === 'course' && r.legacy_url.startsWith('/course/'));
  assert.ok(courseRow, 'no course path in the manifest');
  expectRedirect(handle(at(`${courseRow.legacy_url}?post_type=course`)), 'https://jobready.global/courses/');
  expectRedirect(handle(at(`${courseRow.legacy_url}?p=${SAMPLES.course.content_id}`)), SAMPLES.course.destination);
  const att = attRows[0];
  const media = LEGACY_PATHS.find((r) => r.class === 'media');
  assert.ok(media, 'no media path in the manifest');
  expectRedirect(handle(at(`${media.legacy_url}?attachment_id=${att.content_id}`)), abs(att.destination));
});

test('?post_type=: a known course type goes to the JobReady courses page, a known slug or ID to the manifest, else home', () => {
  const courses = 'https://jobready.global/courses/';
  expectRedirect(handle(at('/?post_type=course')), courses);
  expectRedirect(handle(at('/?post_type=ngs-course')), courses);
  expectRedirect(handle(at('/?post_type=course&s=react')), courses);
  expectRedirect(handle(at('/blog/?post_type=course')), courses);
  expectHome(handle(at('/?post_type=')));
  expectHome(handle(at('/?post_type=unknown-type')));
  expectHome(handle(at('/?post_type=%')));
  expectHome(handle(at('/?post_type=jobs')));
  // a known slug (from the map) resolves through the manifest
  const [key, dest] = Object.entries(ID_MAP.slugs).find(([k]) => k.startsWith('jobs/'));
  const [type, name] = key.split('/');
  expectRedirect(handle(at(`/?post_type=${type}&name=${name}`)), abs(dest));
  expectRedirect(handle(at(`/?post_type=${type}&name=${name}&utm_source=x`)), abs(dest));
  expectHome(handle(at(`/?post_type=${type}&name=no-such-slug`)));
  // an ID beside post_type decides first
  expectRedirect(handle(at(`/?post_type=course&p=${SAMPLES.post.content_id}`)), abs(SAMPLES.post.destination));
  expectHome(handle(at('/?post_type=course&p=1')));
});

test('?post_type=course for a known course ID goes to the JobReady product from the course map', () => {
  expectRedirect(handle(at(`/?post_type=course&p=${SAMPLES.course.content_id}`)), SAMPLES.course.destination);
});

test('WordPress system paths return 410 Gone, for any method and query', () => {
  for (const p of ['/wp-login.php', '/wp-login.php?redirect_to=%2Fwp-admin%2F', '/wp-admin', '/wp-admin/', '/wp-admin/admin-ajax.php', '/wp-admin/css/login.min.css', '/wp-json/', '/wp-json', '/wp-json/wp/v2/posts', '/wp-json/oembed/1.0/embed?url=https%3A%2F%2Fcoderstrust.global%2F', '/xmlrpc.php', '/xmlrpc.php?rsd', '/wp-cron.php', '/wp-cron.php?doing_wp_cron=1', '/WP-LOGIN.PHP', '/%77p-login.php', '//wp-login.php', '/wp-login.php/']) {
    for (const method of ['GET', 'HEAD', 'POST']) {
      const res = handle(at(p, { method }));
      assert.ok(res, `${method} ${p} should be answered`);
      assert.equal(res.status, 410, `${method} ${p}`);
    }
  }
  const res = handle(at('/wp-login.php'));
  assert.equal(res.headers.get('location'), null, '410 never redirects');
  assert.match(res.headers.get('content-type'), /^text\/plain/);
  assert.ok(isSystemPath('/wp-admin/x') && !isSystemPath('/wp-content/uploads/a.png') && !isSystemPath('/about/'));
});

test('other WordPress-looking paths and every other request pass through unchanged', () => {
  for (const p of ['/', '/about/', '/news/some-slug/', '/wp-content/uploads/2017/02/UNDP-Korail.png', '/wp-admin-notes/', '/wp-login.html', '/team/', '/?utm_source=x', '/?fbclid=abc&gclid=def', '/about/?ref=1', '/?foo=bar', '/?p[]=1', '/?P=1', '/?pp=1', '/?page=2', '/?ae_global_templates=faq']) {
    assert.equal(handle(at(p)), null, `${p} should pass through`);
  }
  // only GET and HEAD are redirected on query parameters
  assert.equal(handle(at(`/?p=${SAMPLES.post.content_id}`, { method: 'POST' })), null);
  assert.equal(handle(at('/?s=x', { method: 'PUT' })), null);
  // HEAD behaves like GET
  expectRedirect(handle(at(`/?p=${SAMPLES.post.content_id}`, { method: 'HEAD' })), abs(SAMPLES.post.destination));
});

test('hosts: www goes to the apex, a staging host keeps its own origin, the rollback host is never touched', () => {
  const id = SAMPLES.post.content_id;
  const dest = SAMPLES.post.destination;
  expectRedirect(handle(req(`https://www.coderstrust.global/?p=${id}`)), CANONICAL_ORIGIN + dest);
  expectRedirect(handle(req(`https://staging.example.net/?p=${id}`)), 'https://staging.example.net' + dest);
  expectRedirect(handle(req(`https://staging.example.net/?p=${id}`), { TARGET_ORIGIN: 'https://coderstrust.global' }), CANONICAL_ORIGIN + dest);
  assert.equal(handle(req(`https://legacy.coderstrust.global/?p=${id}`)), null);
  assert.equal(handle(req('https://legacy.coderstrust.global/wp-login.php')), null);
  // external destinations stay absolute on every host
  expectRedirect(handle(req(`https://staging.example.net/?p=${SAMPLES.course.content_id}`)), SAMPLES.course.destination);
});

test('resolveLocation never produces an open redirect', () => {
  const o = CANONICAL_ORIGIN;
  for (const bad of ['//evil.example/x', 'https://evil.example/', 'http://jobready.global/courses/', 'https://jobready.global.evil.example/', 'https://user:pw@jobready.global/', 'https://jobready.global:8443/', 'javascript:alert(1)', '/\\evil.example', '/a b', '/a\nb', '', undefined, null, 42, 'about/']) {
    assert.equal(resolveLocation(bad, o), o + '/', `accepted ${JSON.stringify(bad)}`);
  }
  assert.equal(resolveLocation('/about/#story', o), o + '/about/#story');
  assert.equal(resolveLocation('https://jobready.global/courses/', o), 'https://jobready.global/courses/');
});

test('destinationFor ignores the query when no WordPress parameter is present', () => {
  assert.equal(destinationFor(new URLSearchParams('utm_source=x&fbclid=y')), null);
  assert.equal(destinationFor(new URLSearchParams('')), null);
});

test('the default export passes through to the origin when nothing matches, and redirects otherwise', async () => {
  const seen = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (r) => {
    seen.push(r.url);
    return new Response('origin', { status: 200 });
  };
  try {
    const pass = await worker.fetch(at('/about/?utm_source=x'), {});
    assert.equal(pass.status, 200);
    assert.equal(await pass.text(), 'origin');
    assert.deepEqual(seen, [`${CANONICAL_ORIGIN}/about/?utm_source=x`]);
    const hit = await worker.fetch(at('/?s=term'), {});
    assert.equal(hit.status, 301);
    assert.equal(seen.length, 1, 'a redirect must not touch the origin');
    const gone = await worker.fetch(at('/xmlrpc.php'), {});
    assert.equal(gone.status, 410);
    assert.equal(seen.length, 1);
  } finally {
    globalThis.fetch = realFetch;
  }
});

/* ---- the staged-hostname runner (edge/staged-checks.mjs), against a LOOPBACK edge only: no outside network ---- */

/**
 * A stand-in for the staged edge on 127.0.0.1: the Bulk Redirects list (path only, query ignored), the Worker, and an origin that
 * answers 200. `ruleExpression` true is the documented set-up (edge/README.md "Rule expression"): the list is skipped for a
 * request the Worker handles. false is the broken set-up: the list runs first and swallows the query string.
 */
async function loopbackEdge({ ruleExpression }) {
  // the real list: edge/bulk-redirects.csv, seven columns, source = host + path, target = absolute URL
  const listed = new Map();
  for (const line of readFileSync(path.join(here, '..', '..', 'bulk-redirects.csv'), 'utf8').split('\n').filter(Boolean)) {
    const cols = line.split(',');
    assert.equal(cols.length, 7, `unexpected Bulk Redirects row: ${line}`);
    listed.set(cols[0].slice(cols[0].indexOf('/')), cols[1]);
  }
  assert.ok(listed.size > 900 && listed.get('/team/') === 'https://coderstrust.global/about/team/', 'the list should hold the legacy paths');
  const server = http.createServer((incoming, outgoing) => {
    const request = new Request(`http://127.0.0.1:${server.address().port}${incoming.url}`, { method: incoming.method });
    const requestPath = new URL(request.url).pathname;
    const workerAnswer = handle(request);
    let answer;
    if (ruleExpression) answer = workerAnswer; // WordPress parameters and system paths bypass the list and reach the Worker
    else answer = listed.has(requestPath) ? new Response(null, { status: 301, headers: { location: listed.get(requestPath) } }) : workerAnswer;
    if (!answer && listed.has(requestPath)) answer = new Response(null, { status: 301, headers: { location: listed.get(requestPath) } });
    answer ??= new Response('origin', { status: 200 });
    outgoing.writeHead(answer.status, Object.fromEntries(answer.headers));
    answer.text().then((body) => outgoing.end(body));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { host: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve) => server.close(resolve)) };
}

test('staged runner: every case passes against an edge built as documented (list excludes WordPress parameters, Worker decides them)', async () => {
  const edge = await loopbackEdge({ ruleExpression: true });
  try {
    const { passed, failed, lines } = await runStaged(edge.host);
    assert.equal(failed, 0, lines.filter((l) => l.startsWith('FAIL')).join('\n'));
    assert.equal(passed, buildCases().length);
  } finally {
    await edge.close();
  }
});

test('staged runner: it catches the broken set-up where the Bulk Redirects list runs first and swallows ?p= on a legacy path', async () => {
  const edge = await loopbackEdge({ ruleExpression: false });
  try {
    const { failed, lines } = await runStaged(edge.host);
    const failing = lines.filter((l) => l.startsWith('FAIL'));
    assert.ok(failed >= 3, `expected the collision cases to fail, ${failed} failed`);
    assert.ok(failing.some((l) => l.includes('COLLISION /team/?p=')), 'the /team/?p= collision should be reported');
    assert.ok(failing.every((l) => l.includes('COLLISION')), `only collision cases should fail:\n${failing.join('\n')}`);
  } finally {
    await edge.close();
  }
});

test('staged runner: without EDGE_HOST the CLI prints the checklist and sends nothing', async () => {
  const { spawnSync } = await import('node:child_process');
  const env = { ...process.env };
  delete env.EDGE_HOST;
  const r = spawnSync(process.execPath, [path.join(here, '..', '..', 'staged-checks.mjs')], { encoding: 'utf8', env });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /EDGE_HOST is not set: the staged requests were NOT sent \(no network used\)/);
  assert.match(r.stdout, /Full \(strict\) only after/);
});
