import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP140 (Opus High run 15, kit 107): the scorecard model (shaped in Step 2, agreed in Step 3, thresholds before the first cohort) on every route.
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp140.spec.ts --project=chromium`.
 *   - Minor 1 (rule, site-wide): every page whose steps agree "the pilot scorecard" in Step 3 shapes the scorecard in Step 2.
 *   - Polish 2: Case Studies' closing line plans a first cohort in the discovery session, not the scorecard.
 *   - Polish 3: the Scorecard Thresholds cards say thresholds are agreed before the first cohort.
 *   - Polish 4: Governments "Who We Reach" body names underemployed graduates, as its heading does.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const mainOf = (raw: string) => visible(/<main[\s\S]*<\/main>/.exec(raw)?.[0] ?? '');
const main = (rel: string) => mainOf(html(rel));

test('Minor 1 (rule): on every built page, a Step 3 that agrees the pilot scorecard follows a Step 2 that shapes it', () => {
  const offenders: string[] = [];
  let examined = 0;
  for (const p of listPages()) {
    const text = mainOf(readFileSync(p.file, 'utf8'));
    for (const m of text.matchAll(/Step 2: ([\s\S]*?)Step 3: ([^.]*\.)/g)) {
      if (!/pilot scorecard/.test(m[2])) continue;
      examined++;
      if (!/scorecard/.test(m[1])) offenders.push(`${p.route}: Step 2 "${m[1].trim().slice(0, 90)}"`);
    }
  }
  expect(examined).toBeGreaterThanOrEqual(8);
  expect(offenders).toEqual([]);
});

test('Minor 1: the three named pages', () => {
  expect(main('partner-with-us/universities/index.html')).toContain('Tracks, campus labs and the pilot scorecard are shaped with you.');
  expect(main('programs/jobready-campus/index.html')).toContain('We shape tracks, campus labs and the pilot scorecard with you.');
  expect(main('partner-with-us/local-partners/index.html')).toContain('We shape the cohort, tracks, safeguarding, reporting and the pilot scorecard with you.');
});

test('Polish 2: Case Studies plans a first cohort in the discovery session', () => {
  const text = main('impact/case-studies/index.html');
  expect(text).toContain('In a discovery session, we start planning a first cohort for your own program.');
  expect(text).not.toContain('planning the scorecard');
});

test('Polish 3: Scorecard Thresholds cards say when thresholds are agreed', () => {
  for (const page of ['partner-with-us/universities/index.html', 'programs/jobready-campus/index.html', 'partner-with-us/local-partners/index.html']) {
    expect(main(page), page).toContain('Thresholds are agreed before the first cohort; a missed threshold triggers a corrective plan.');
  }
});

test('Polish 4: Governments "Who We Reach" names underemployed graduates', () => {
  expect(main('partner-with-us/governments/index.html')).toContain('Unemployed and underemployed graduates and other priority groups, with women a priority in every program.');
});
