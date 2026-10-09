#!/usr/bin/env node
/**
 * Release gates (planning/10 §1 "Automated gates", planning/08 §10 CI/CD, review round 8 M9). One runner for the composite npm
 * scripts, so a gate lists its steps in one place, runs ALL of them (a failing step never hides the next) and exits non-zero if
 * any step failed:
 *
 *   npm run test:build               deterministic local checks on the STAGING build in dist/
 *   npm run test:production-release  checks against a PRODUCTION build (SITE_ENV=production, BASE_PATH=/)
 *   npm run test:edge-release        Worker tests + the staged-hostname checklist (network only if EDGE_HOST is set)
 *   npm run test:static              html, links, budget, seo and content checks over dist/
 *
 *   node scripts/run-gate.mjs <build|production-release|edge-release|static> [--dist <dir>]
 *
 * `--dist <dir>` (or env DIST_DIR) points the dist-based steps at another build output, for example a production build written
 * to a scratch folder:   npm run build -- --outDir /tmp/ctg-prod   then   npm run test:production-release -- --dist /tmp/ctg-prod
 *
 * Both gates run check:privacy-origins (review round 14, m5): every third-party origin a built page can load is named in /privacy-policy/.
 *
 * Production release (doc 08 §11 step 1, doc 10 §4): run it against a build made with SITE_ENV=production SITE_URL=https://coderstrust.global
 * BASE_PATH=/. It reads the private lists the same way CI does and FAILS CLOSED without them: the production fact holds
 * (env PROD_FACT_HOLDS or ../ctg-planning/prod-fact-holds.json) and the never-publish list (env NEVER_PUBLISH_JSON or
 * ../ctg-planning/never-publish.json; the runner sets NEVER_PUBLISH_STRICT=1). Expected failures on a site that is not ready
 * to go live: held facts that still render, assets that are only pending, sensitive material still committed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const gateName = argv.find((a) => !a.startsWith('--'));
const distIdx = argv.indexOf('--dist');
const dist = resolve(distIdx !== -1 ? argv[distIdx + 1] : process.env.DIST_DIR || join(root, 'dist'));
// check-facts joins its dist argument to the working directory, so it gets the path relative to the repository root
const distRel = relative(root, dist) || '.';

const node = (script, ...args) => [process.execPath, join(root, 'scripts', script), ...args];
const nodeTs = (script, ...args) => [process.execPath, '--experimental-strip-types', join(root, 'scripts', script), ...args];

const STATIC = [
  ['test:static › html validity', node('check-html.mjs', '--dist', dist)],
  ['test:static › links by URI class', node('check-links.mjs', '--dist', dist)],
  ['test:static › budgets', node('check-budget.mjs', '--dist', dist)],
  ['test:static › SEO lint', node('check-seo.mjs', '--dist', dist)],
  ['test:static › content rules', node('check-content-rules.mjs', '--dist', dist)],
];

const GATES = {
  static: { title: 'test:static', steps: STATIC },
  build: {
    title: 'test:build',
    env: {},
    steps: [
      ['astro check', [join(root, 'node_modules/.bin/astro'), 'check']],
      ['manifest:check (generated files in sync)', node('generate-from-manifest.mjs', '--check')],
      ['check:facts', nodeTs('check-facts.mjs', distRel)],
      ['check:permissions', node('check-permissions.mjs', dist)],
      ['check:privacy-origins (every loadable third-party origin is named in /privacy-policy/)', node('check-privacy-origins.mjs', '--dist', dist)],
      ['test:permissions (rule and gate, scratch fixtures)', node('test-permissions.mjs')],
      ['test:repo-publication (audit, scratch fixtures)', node('test-repo-publication.mjs')],
      ...STATIC,
      ['test:redirects', node('test-redirects.mjs', dist)],
      ['test:manifest', node('test-manifest.mjs', dist)],
      ['validate:jsonld', node('validate-jsonld.mjs', dist)],
      ['verify:seo', node('verify-seo-files.mjs', dist)],
      ['test:edge (Worker tests)', [process.execPath, '--test', join(root, 'edge/worker/test/')]],
    ],
  },
  'production-release': {
    title: 'test:production-release',
    // a production build is made with SITE_URL=https://coderstrust.global and BASE_PATH=/ (doc 08 §11 step 1)
    env: { SITE_ENV: 'production', BASE_PATH: process.env.BASE_PATH ?? '/', SITE_URL: process.env.SITE_URL ?? 'https://coderstrust.global', NEVER_PUBLISH_STRICT: '1' },
    steps: [
      ['check:facts (production, with the private holds)', nodeTs('check-facts.mjs', distRel)],
      ['check:permissions (production: cleared only)', node('check-permissions.mjs', dist)],
      ['check:privacy-origins (production)', node('check-privacy-origins.mjs', '--dist', dist)],
      ['check:repo-publication (committed files, private never-publish list)', node('check-repo-publication.mjs')],
      ['validate:jsonld', node('validate-jsonld.mjs', dist)],
      ['test:manifest', node('test-manifest.mjs', dist)],
      ['test:redirects (production stubs carry no noindex)', node('test-redirects.mjs', dist)],
      ['verify:seo (production robots)', node('verify-seo-files.mjs', dist)],
      ['SEO lint (production)', node('check-seo.mjs', '--dist', dist, '--env', 'production')],
    ],
  },
  'edge-release': {
    title: 'test:edge-release',
    env: {},
    steps: [
      ['Worker tests (offline)', [process.execPath, '--test', join(root, 'edge/worker/test/')]],
      ['staged-hostname checklist (network only if EDGE_HOST is set)', [process.execPath, join(root, 'edge/staged-checks.mjs')]],
    ],
  },
};

const gate = GATES[gateName];
if (!gate) {
  console.error(`run-gate: unknown gate ${JSON.stringify(gateName)}; use one of ${Object.keys(GATES).join(', ')}`);
  process.exit(2);
}

const needsDist = gateName !== 'edge-release';
console.log(`${gate.title}: ${gate.steps.length} step(s)${needsDist ? `, dist ${relative(process.cwd(), dist) || '.'}${existsSync(dist) ? '' : ' (NOT FOUND: run the build first)'}` : ''}`);

const results = [];
for (const [name, [cmd, ...args]] of gate.steps) {
  console.log(`\n──── ${gate.title} › ${name}`);
  const started = Date.now();
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...(gate.env ?? {}) } });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = r.status === 0 && !r.error;
  results.push({ name, ok, seconds, why: r.error ? r.error.message : r.signal ? `signal ${r.signal}` : `exit ${r.status}` });
}

console.log(`\n──── ${gate.title}: summary`);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}  (${r.seconds}s${r.ok ? '' : ', ' + r.why})`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${gate.title}: ${failed.length ? `${failed.length} of ${results.length} step(s) FAILED` : `all ${results.length} step(s) passed`}`);
process.exit(failed.length ? 1 : 0);
