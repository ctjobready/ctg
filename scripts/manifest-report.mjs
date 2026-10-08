#!/usr/bin/env node
/**
 * Prints the migration manifest totals (planning/02 §5a: "the totals are printed by scripts/manifest-report.mjs")
 * and fails on any row that breaks the §5c acceptance rule:
 *   - an empty disposition,
 *   - an empty destination (WITHHELD rows may be empty by planning/02 §5c; ours carry the parent page),
 *   - an unknown class, disposition, query-handling or test status,
 *   - a duplicate legacy URL.
 *
 *   node scripts/manifest-report.mjs [manifest.csv]
 */
import { CLASSES, DISPOSITIONS, GONE, QUERY_HANDLING, STATE_OF, TEST_STATUSES, loadManifest, needsStub, MANIFEST_PATH } from './manifest-lib.mjs';

const file = process.argv[2] ?? MANIFEST_PATH;
const rows = loadManifest(file);
const problems = [];
const seen = new Set();
for (const [i, r] of rows.entries()) {
  const at = `row ${i + 2} (${r.legacy_url})`;
  if (!r.legacy_url) problems.push(`${at}: empty legacy_url`);
  if (seen.has(r.legacy_url)) problems.push(`${at}: duplicate legacy_url`);
  seen.add(r.legacy_url);
  if (!r.disposition) problems.push(`${at}: empty disposition`);
  else if (!DISPOSITIONS.includes(r.disposition)) problems.push(`${at}: unknown disposition "${r.disposition}"`);
  if (!r.destination && r.disposition !== 'WITHHELD') problems.push(`${at}: empty destination`);
  if (r.destination === GONE && r.disposition !== 'SYSTEM') problems.push(`${at}: ${GONE} is reserved for SYSTEM rows`);
  if (!CLASSES.includes(r.class)) problems.push(`${at}: unknown class "${r.class}"`);
  if (!QUERY_HANDLING.includes(r.query_handling)) problems.push(`${at}: unknown query_handling "${r.query_handling}"`);
  if (!TEST_STATUSES.includes(r.test_status)) problems.push(`${at}: unknown test_status "${r.test_status}"`);
  if (!r.publication_hold) problems.push(`${at}: empty publication_hold (use "none")`);
  if (r.disposition === 'WITHHELD' && r.publication_hold === 'none') problems.push(`${at}: WITHHELD without an approved reason`);
  if (r.disposition !== 'WITHHELD' && r.publication_hold !== 'none') problems.push(`${at}: publication_hold set on a non-WITHHELD row`);
}

const tally = (key) => {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return m;
};
const pad = (s, n) => String(s).padEnd(n);
const num = (n) => String(n).padStart(5);

console.log(`Migration manifest: ${rows.length} rows (one per unique legacy URL)\n`);
console.log('By class');
for (const c of CLASSES) console.log(`  ${pad(c, 18)}${num(tally('class').get(c) ?? 0)}`);
console.log('\nBy disposition');
for (const d of DISPOSITIONS) console.log(`  ${pad(d, 18)}${num(tally('disposition').get(d) ?? 0)}`);

console.log('\nClass x disposition');
console.log('  ' + pad('', 18) + DISPOSITIONS.map((d) => d.padStart(9)).join(''));
for (const c of CLASSES) {
  console.log('  ' + pad(c, 18) + DISPOSITIONS.map((d) => String(rows.filter((r) => r.class === c && r.disposition === d).length || '.').padStart(9)).join(''));
}

console.log('\nAcceptance states (planning/10 §4: published, merged, redirected, withheld)');
for (const s of ['published', 'merged', 'redirected', 'withheld']) {
  console.log(`  ${pad(s, 18)}${num(rows.filter((r) => STATE_OF[r.disposition] === s).length)}`);
}
console.log(`  (redirected includes ${rows.filter((r) => r.disposition === 'SYSTEM').length} WordPress system paths answered 410 Gone by the edge Worker)`);

const stubs = rows.filter(needsStub);
console.log('\nBy mechanism');
console.log(`  static redirect stubs (src/data/redirects.ts)   ${num(stubs.length)}`);
console.log(`    of which external (jobready.global)           ${num(stubs.filter((r) => /^https?:/.test(r.destination)).length)}`);
console.log(`  KEEP routes (no redirect)                       ${num(rows.filter((r) => r.disposition === 'KEEP').length)}`);
console.log(`  edge-only: query-string / attachment ID rows    ${num(rows.filter((r) => r.class === 'query-string' || r.class === 'attachment').length)}`);
console.log(`  edge-only: legacy media rows                    ${num(rows.filter((r) => r.class === 'media').length)}`);
console.log(`  edge-only: system paths (410)                   ${num(rows.filter((r) => r.class === 'system').length)}`);
console.log(`  query-string URLs of Elementor templates        ${num(rows.filter((r) => r.legacy_url.startsWith('/?ae_global_templates=')).length)}`);
console.log(`  rows with a publication hold                    ${num(rows.filter((r) => r.publication_hold !== 'none').length)}`);
console.log(`  posts -> /news/<slug>/                          ${num(rows.filter((r) => r.class === 'post' && r.disposition === 'MOVE' && r.destination.startsWith('/news/')).length)}`);

if (problems.length) {
  console.error(`\nFAIL: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 40)) console.error('  ' + p);
  process.exit(1);
}
console.log('\nOK: every row has a disposition and a destination; no duplicates');
