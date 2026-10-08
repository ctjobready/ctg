/**
 * Tests for the query-aware Worker (planning/08 §7 "Tests", planning/10 §1 "Edge redirect rules").
 * No network, no dependencies: `node --test edge/worker/test/`.
 * IDs come from the generated map and the migration manifest, so the tests cover every class of legacy content.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import worker, { handle, isSystemPath, resolveLocation, destinationFor, CANONICAL_ORIGIN } from '../src/index.mjs';
import { loadManifest, needsStub } from '../../../scripts/manifest-lib.mjs';

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
  for (const q of ['author=2', 'author=', 'author=joya', 'author=2&cat=3']) expectRedirect(handle(at(`/?${q}`)), CANONICAL_ORIGIN + '/about/team/');
  for (const q of ['feed=rss2', 'feed=atom', 'feed=']) expectRedirect(handle(at(`/?${q}`)), CANONICAL_ORIGIN + '/news/');
  expectRedirect(handle(at('/jobs/?feed=rss2')), CANONICAL_ORIGIN + '/news/');
  expectRedirect(handle(at('/?feed=rss2&utm_source=x')), CANONICAL_ORIGIN + '/news/');
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
