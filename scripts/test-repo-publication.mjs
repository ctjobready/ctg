#!/usr/bin/env node
/**
 * Negative and positive tests for scripts/check-repo-publication.mjs (review round 8 C1; planning/08 §4, planning/10 §1).
 * Everything happens in SCRATCH git repositories under the OS temp folder with a DUMMY never-publish list; the real private list
 * is never read and nothing in the site repository is touched.  npm run test:repo-publication
 *
 * Covered: a clean repo passes; a banned term in Markdown, YAML, JSON, front matter, Astro alt text, a TS data file or a file
 * name fails; a banned file glob fails; a sensitive-group asset whose files are committed fails and passes once cleared; an
 * untracked file and a CSV are ignored; a missing list warns, fails closed for production builds (GITHUB_REF) and with
 * NEVER_PUBLISH_STRICT=1; NEVER_PUBLISH_JSON wins over a file; an invalid list fails without echoing it; and the output never
 * contains the pattern or the text that matched.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(fileURLToPath(new URL('..', import.meta.url)), 'scripts/check-repo-publication.mjs');
const base = mkdtempSync(join(tmpdir(), 'ctg-pub-'));
const results = [];
const check = (name, fn) => {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, why: e.message });
  }
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

/** The dummy list. The "secret" is a made-up word, so a leak into any output is easy to spot. */
const SECRET = 'zzquillperson';
const PATTERN = `\\b${SECRET}\\b`;
const LIST = { terms: [{ id: 'dummy-person', pattern: PATTERN, flags: 'i' }], files: [{ id: 'dummy-photo', glob: '**/zz-photo-1.*' }] };

let n = 0;
function repo(files) {
  const dir = join(base, `repo-${++n}`);
  mkdirSync(dir, { recursive: true });
  spawnSync('git', ['-C', dir, 'init', '-q']);
  const tracked = [];
  for (const [path, content, track = true] of files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
    if (track) tracked.push(path);
  }
  if (tracked.length) spawnSync('git', ['-C', dir, 'add', '--', ...tracked]);
  return dir;
}
const ROW = (assetId, status, sensitive) => ({ assetId, clearanceId: status === 'cleared' ? 'TEST-1' : null, status, publishedOnLegacySite: true, sensitiveGroup: sensitive });

function run(dir, { list = LIST, listVia = 'file', env = {}, permissions } = {}) {
  const childEnv = { ...process.env, GITHUB_REF: '', NEVER_PUBLISH_JSON: '', NEVER_PUBLISH_FILE: '', NEVER_PUBLISH_STRICT: '', ...env };
  const out = join(dir, '.out');
  const args = [script, '--root', dir, '--out', out];
  if (list && listVia === 'file') {
    const f = join(dir, '..', `list-${n}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(f, typeof list === 'string' ? list : JSON.stringify(list));
    args.push('--list', f);
  }
  if (list && listVia === 'env') childEnv.NEVER_PUBLISH_JSON = typeof list === 'string' ? list : JSON.stringify(list);
  if (permissions) {
    const pf = join(dir, '..', `perm-${n}-${Math.random().toString(36).slice(2)}.json`);
    writeFileSync(pf, JSON.stringify(permissions));
    args.push('--permissions', pf);
  }
  const r = spawnSync(process.execPath, args, { encoding: 'utf8', env: childEnv });
  let report = '';
  try {
    report = readFileSync(join(out, 'repo-publication.json'), 'utf8') + readFileSync(join(out, 'repo-publication.md'), 'utf8');
  } catch {
    /* no report on a setup failure */
  }
  return { status: r.status, text: `${r.stdout}\n${r.stderr}`, report };
}
const noLeak = (r, path = '') => {
  // a committed file path is public and is reported as such, even when the path itself contains the word
  const all = (r.text + r.report).split(path || '\u0000').join('').toLowerCase();
  assert(!all.includes(SECRET) && !all.includes('\\b'), 'the output or the report contains the secret term or the pattern');
};

const CLEAN = [['README.md', '# A public readme\n'], ['src/data/a.ts', 'export const a = 1;\n']];

check('a clean repository passes', () => {
  const r = run(repo(CLEAN));
  assert(r.status === 0, `exit ${r.status}\n${r.text}`);
  assert(/passed/.test(r.text), 'no "passed" in the output');
});

const BANNED = [
  ['Markdown body', 'content/post.md', `Some text about ${SECRET.toUpperCase()} here.\n`],
  ['Markdown front matter', 'content/story.md', `---\nname: "${SECRET}"\n---\nBody\n`],
  ['YAML data', 'content/people.yaml', `- name: ${SECRET}\n`],
  ['JSON data', 'src/data/people.json', `{"who": "${SECRET}"}\n`],
  ['TS data', 'src/data/people.ts', `export const who = '${SECRET}';\n`],
  ['Astro alt text', 'src/pages/p.astro', `<img src="a.jpg" alt="${SECRET} at the desk" />\n`],
  ['an image file name', `src/assets/images/${SECRET}-portrait.jpg`, 'binary-ish'],
  ['a folder name', `src/assets/images/${SECRET}/photo.jpg`, 'binary-ish'],
];
for (const [what, path, content] of BANNED) {
  check(`a banned term in ${what} fails (id and path only)`, () => {
    const r = run(repo([...CLEAN, [path, content]]));
    assert(r.status === 1, `exit ${r.status}\n${r.text}`);
    assert(r.text.includes('dummy-person') && r.text.includes(path), 'the entry id and the file path should be reported');
    noLeak(r, path);
  });
}
check('a banned file glob fails, whatever the folder', () => {
  const r = run(repo([...CLEAN, ['public/img/ZZ-Photo-1.JPG', 'x']]));
  assert(r.status === 1 && r.text.includes('dummy-photo') && r.text.includes('public/img/ZZ-Photo-1.JPG'), `exit ${r.status}\n${r.text}`);
  noLeak(r);
});
check('a file that is not git-added is not "committed" and is ignored', () => {
  const r = run(repo([...CLEAN, ['content/untracked.md', `${SECRET}\n`, false]]));
  assert(r.status === 0, `exit ${r.status}\n${r.text}`);
});
check('CSV inventories of legacy URLs are not text-scanned', () => {
  const r = run(repo([...CLEAN, ['migration/manifest.csv', `/wp-content/uploads/${SECRET}.png,1\n`]]));
  assert(r.status === 0, `exit ${r.status}\n${r.text}`);
});
check('a hit reports line numbers, not text', () => {
  const r = run(repo([...CLEAN, ['content/post.md', `line one\nline two\n${SECRET}\n`]]));
  assert(r.status === 1 && /line 3/.test(r.text), `exit ${r.status}\n${r.text}`);
  noLeak(r);
});

/* ---- (b) sensitive assets still committed ---- */
const SENS = [...CLEAN, ['src/content/stories/someone-x.md', 'name: x\n'], ['src/assets/images/stories/someone-x.jpg', 'img'], ['src/assets/images/news/news-slug-y/photo-1.jpg', 'img']];
check('a sensitive asset without a release whose story file and photo are committed fails', () => {
  const r = run(repo(SENS), { list: null, permissions: [ROW('story-someone-x', 'pending', true)] });
  assert(r.status === 1, `exit ${r.status}\n${r.text}`);
  assert(r.text.includes('src/content/stories/someone-x.md') && r.text.includes('src/assets/images/stories/someone-x.jpg'), 'both committed files should be reported');
  assert(r.text.includes('story-someone-x'), 'the asset id should be reported');
});
check('a sensitive news asset fails on its committed photos (by folder name)', () => {
  const r = run(repo(SENS), { list: null, permissions: [ROW('news-news-slug-y', 'pending', true)] });
  assert(r.status === 1 && r.text.includes('src/assets/images/news/news-slug-y/photo-1.jpg'), `exit ${r.status}\n${r.text}`);
});
check('the same sensitive asset passes once a release is cleared', () => {
  const r = run(repo(SENS), { list: null, permissions: [ROW('story-someone-x', 'cleared', true)] });
  assert(r.status === 0, `exit ${r.status}\n${r.text}`);
});
check('a non-sensitive pending asset may stay committed', () => {
  const r = run(repo(SENS), { list: null, permissions: [ROW('story-someone-x', 'pending', false)] });
  assert(r.status === 0, `exit ${r.status}\n${r.text}`);
});
check('a sensitive asset whose files are not committed passes', () => {
  const r = run(repo(CLEAN), { list: null, permissions: [ROW('story-someone-x', 'pending', true)] });
  assert(r.status === 0, `exit ${r.status}\n${r.text}`);
});

/* ---- where the list comes from, and failing closed ---- */
check('no list: warns and skips locally (exit 0), the sensitive-asset check still runs', () => {
  const r = run(repo(CLEAN), { list: null });
  assert(r.status === 0 && /WARN/.test(r.text) && /SKIPPED/.test(r.text), `exit ${r.status}\n${r.text}`);
  const r2 = run(repo(SENS), { list: null, permissions: [ROW('story-someone-x', 'pending', true)] });
  assert(r2.status === 1, 'the sensitive-asset check should still fail without a list');
});
check('no list for a production build fails closed', () => {
  const r = run(repo(CLEAN), { list: null, env: { SITE_ENV: 'production' } });
  assert(r.status === 1 && /FAILED CLOSED/.test(r.text), `exit ${r.status}\n${r.text}`);
});
check('no list on a staging deploy from main only warns', () => {
  const r = run(repo(CLEAN), { list: null, env: { GITHUB_REF: 'refs/heads/main', SITE_ENV: 'staging' } });
  assert(r.status === 0 && /WARN/.test(r.text), `exit ${r.status}\n${r.text}`);
});
check('no list with NEVER_PUBLISH_STRICT=1 fails closed', () => {
  const r = run(repo(CLEAN), { list: null, env: { NEVER_PUBLISH_STRICT: '1' } });
  assert(r.status === 1 && /FAILED CLOSED/.test(r.text), `exit ${r.status}\n${r.text}`);
});
check('no list on a pull-request ref only warns', () => {
  const r = run(repo(CLEAN), { list: null, env: { GITHUB_REF: 'refs/pull/7/merge' } });
  assert(r.status === 0, `exit ${r.status}\n${r.text}`);
});
check('NEVER_PUBLISH_JSON (the Actions secret) is read and enforced', () => {
  const r = run(repo([...CLEAN, ['content/post.md', `${SECRET}\n`]]), { listVia: 'env' });
  assert(r.status === 1 && r.text.includes('dummy-person') && /env NEVER_PUBLISH_JSON/.test(r.text), `exit ${r.status}\n${r.text}`);
  noLeak(r);
});
check('an invalid list fails without echoing it', () => {
  const bad = `{"terms": [{"id": "x", "pattern": "${SECRET}("}]}`;
  const r = run(repo(CLEAN), { list: bad });
  assert(r.status === 1 && /invalid regular expression/.test(r.text), `exit ${r.status}\n${r.text}`);
  noLeak(r);
  const r2 = run(repo(CLEAN), { list: `{"terms": [ ${SECRET} `, listVia: 'env' });
  assert(r2.status === 1 && /not valid JSON/.test(r2.text), `exit ${r2.status}\n${r2.text}`);
  noLeak(r2);
});

rmSync(base, { recursive: true, force: true });
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'ok    ' : 'FAIL  '} ${r.name}${r.ok ? '' : '\n        ' + r.why.split('\n').join('\n        ')}`);
}
console.log(`\ntest-repo-publication: ${failed ? `${failed} of ${results.length} FAILED` : `all ${results.length} checks passed`}`);
process.exit(failed ? 1 : 0);
