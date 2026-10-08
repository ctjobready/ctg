#!/usr/bin/env node
/**
 * Tests for the D13 permissions rule and its build gate (planning/08 §4, planning/10 §1 "Permissions" and "Staging asset
 * rule"; review round 8 m2). No network, no dependencies:  npm run test:permissions
 *
 * The rule (src/lib/permissionRule.mjs):
 *   staging     renders an asset when it is `cleared`, OR when it is published on coderstrust.global AND not sensitive;
 *   production  renders only `cleared` assets.
 *
 * Part 1 checks the rule as a truth table. Part 2 runs scripts/check-permissions.mjs end to end against SCRATCH copies of
 * permissions.json and small scratch dist/ folders (nothing in the repository is touched), including the negative cases:
 *   - a cleared sensitive asset renders on staging;
 *   - an uncleared sensitive asset does not (even when it was published on the legacy site);
 *   - a pending asset fails the production check.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mayRenderRow, productionMayRender, stagingBlockReason, stagingMayRender } from '../src/lib/permissionRule.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const gate = join(root, 'scripts/check-permissions.mjs');
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

const row = (assetId, status, legacy, sensitive) => ({ assetId, clearanceId: status === 'cleared' ? `TEST-${assetId}` : null, status, publishedOnLegacySite: legacy, sensitiveGroup: sensitive });

/* ---- 1. the rule as a truth table ---- */
const TABLE = [
  // status, legacy, sensitive -> staging, production
  ['cleared', true, false, true, true],
  ['cleared', false, false, true, true],
  ['cleared', true, true, true, true], // cleared sensitive: renders on staging and production
  ['cleared', false, true, true, true],
  ['pending', true, false, true, false], // published adult: staging only
  ['pending', false, false, false, false],
  ['pending', true, true, false, false], // published but sensitive and uncleared: nowhere
  ['pending', false, true, false, false],
];
for (const [status, legacy, sensitive, staging, production] of TABLE) {
  check(`rule: ${status}, legacy=${legacy}, sensitive=${sensitive} -> staging ${staging}, production ${production}`, () => {
    const r = row('a', status, legacy, sensitive);
    assert(stagingMayRender(r) === staging, `staging should be ${staging}`);
    assert(productionMayRender(r) === production, `production should be ${production}`);
    assert(mayRenderRow('staging', r) === staging && mayRenderRow('production', r) === production, 'mayRenderRow disagrees');
    assert((stagingBlockReason(r) === null) === staging, 'stagingBlockReason disagrees with the rule');
  });
}
check('rule: a missing row never renders', () => {
  assert(!stagingMayRender(undefined) && !productionMayRender(undefined), 'undefined row rendered');
});
check('rule: the block reason names the sensitive group', () => {
  assert(/sensitive group/.test(stagingBlockReason(row('a', 'pending', true, true))), 'wrong reason for a sensitive asset');
  assert(/not already published/.test(stagingBlockReason(row('a', 'pending', false, false))), 'wrong reason for an unpublished asset');
});

/* ---- 2. the gate, end to end, on scratch files ---- */
const scratch = mkdtempSync(join(tmpdir(), 'ctg-perm-'));
let n = 0;
function run({ rows, pages, env }) {
  const dir = join(scratch, `case-${++n}`);
  const dist = join(dir, 'dist');
  mkdirSync(dist, { recursive: true });
  for (const [route, body] of Object.entries(pages)) {
    const folder = join(dist, route === '/' ? '' : route.replace(/^\/|\/$/g, ''));
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, 'index.html'), `<!DOCTYPE html><html lang="en"><head><title>t</title></head><body>${body}</body></html>`);
  }
  const file = join(dir, 'permissions.json');
  writeFileSync(file, JSON.stringify(rows, null, 2));
  const childEnv = { ...process.env };
  delete childEnv.SITE_ENV;
  const r = spawnSync(process.execPath, [gate, dist, '--permissions', file, ...(env ? ['--env', env] : [])], { encoding: 'utf8', env: childEnv });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}
const img = (id) => `<img data-asset="${id}" src="x.jpg" alt="" width="10" height="10">`;
const page = (id) => ({ '/': img(id) });

const cases = [
  // name, input, expected exit status, text the output must contain
  ['staging: a cleared sensitive asset renders', { rows: [row('story-s1', 'cleared', false, true)], pages: page('story-s1') }, 0, 'OK'],
  ['staging: a cleared sensitive asset that was also published renders', { rows: [row('story-s1', 'cleared', true, true)], pages: page('story-s1') }, 0, 'OK'],
  ['staging: an uncleared sensitive asset does not render', { rows: [row('story-s2', 'pending', false, true)], pages: page('story-s2') }, 1, 'sensitive group'],
  ['staging: an uncleared sensitive asset does not render even when published on the legacy site', { rows: [row('story-s3', 'pending', true, true)], pages: page('story-s3') }, 1, 'sensitive group'],
  ['staging: a pending asset published for an adult audience renders', { rows: [row('team-t1', 'pending', true, false)], pages: page('team-t1') }, 0, 'OK'],
  ['staging: a pending asset not published on the legacy site does not render', { rows: [row('team-t2', 'pending', false, false)], pages: page('team-t2') }, 1, 'not already published'],
  ['staging: a cleared asset that was not published on the legacy site renders', { rows: [row('team-t3', 'cleared', false, false)], pages: page('team-t3') }, 0, 'OK'],
  ['staging: an asset without a row fails', { rows: [], pages: page('team-nobody') }, 1, 'no row'],
  ['staging: a sensitive social preview image fails like the photo', { rows: [row('news-n1', 'pending', true, true)], pages: { '/': '<meta property="og:image" content="https://x/y.jpg" data-asset="news-n1">' } }, 1, 'social preview'],
  ['staging: an example- asset is allowed on /styleguide/ only', { rows: [], pages: { '/styleguide/': img('example-person') } }, 0, 'OK'],
  ['staging: an example- asset elsewhere fails', { rows: [], pages: page('example-person') }, 1, 'example-'],
  ['staging: a cleared row without a clearance ID fails', { rows: [{ ...row('team-t4', 'cleared', true, false), clearanceId: null }], pages: page('team-t4') }, 1, 'clearanceId'],
  ['staging: a row with a private field fails (the public file is minimal)', { rows: [{ ...row('team-t5', 'pending', true, false), holder: 'someone' }], pages: page('team-t5') }, 1, 'extra field'],
  ['production: a pending asset fails', { rows: [row('team-p1', 'pending', true, false)], pages: page('team-p1'), env: 'production' }, 1, 'not cleared'],
  ['production: a pending sensitive asset fails', { rows: [row('story-p2', 'pending', true, true)], pages: page('story-p2'), env: 'production' }, 1, 'not cleared'],
  ['production: a cleared sensitive asset passes', { rows: [row('story-p3', 'cleared', false, true)], pages: page('story-p3'), env: 'production' }, 0, 'OK'],
  ['production: a cleared asset passes', { rows: [row('team-p4', 'cleared', false, false)], pages: page('team-p4'), env: 'production' }, 0, 'OK'],
  ['production: an asset without a row fails', { rows: [], pages: page('team-p5'), env: 'production' }, 1, 'not in permissions.json'],
  ['production: a pending social preview image fails', { rows: [row('news-p6', 'pending', true, false)], pages: { '/': '<meta name="twitter:image" content="https://x/y.jpg" data-asset="news-p6">' }, env: 'production' }, 1, 'social preview'],
];
for (const [name, input, wantStatus, wantText] of cases) {
  check(name, () => {
    const r = run(input);
    assert(r.status === wantStatus, `exit status ${r.status}, expected ${wantStatus}\n${r.out.trim()}`);
    assert(r.out.includes(wantText), `output does not mention "${wantText}"\n${r.out.trim()}`);
  });
}
check('production mode also follows env SITE_ENV=production (no --env flag)', () => {
  const dir = join(scratch, 'case-env');
  mkdirSync(join(dir, 'dist'), { recursive: true });
  writeFileSync(join(dir, 'dist/index.html'), `<!DOCTYPE html><html lang="en"><head><title>t</title></head><body>${img('team-e1')}</body></html>`);
  writeFileSync(join(dir, 'permissions.json'), JSON.stringify([row('team-e1', 'pending', true, false)]));
  const r = spawnSync(process.execPath, [gate, join(dir, 'dist'), '--permissions', join(dir, 'permissions.json')], { encoding: 'utf8', env: { ...process.env, SITE_ENV: 'production' } });
  assert(r.status === 1 && /not cleared/.test(r.stderr), `expected a production failure, got ${r.status}`);
});

rmSync(scratch, { recursive: true, force: true });
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'ok    ' : 'FAIL  '} ${r.name}${r.ok ? '' : '\n        ' + r.why.split('\n').join('\n        ')}`);
}
console.log(`\ntest-permissions: ${failed ? `${failed} of ${results.length} FAILED` : `all ${results.length} checks passed`}`);
process.exit(failed ? 1 : 0);
