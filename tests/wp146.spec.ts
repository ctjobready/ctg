import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP146 (Opus High run 21, kit 113).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp146.spec.ts --project=chromium`.
 *   - Minor 1: YouthWIDE "Can You Deliver at National Scale?" says a 100,000+ program is planned phase by phase (not "a 100,000+ phase"), in the page and its FAQ JSON-LD.
 *   - Polish 2: TalentLEAP FAQ Q14 says the cohort inclusions once.
 *   - Polish 3: the trial sentence above the +10.3 tile gives the income result and points to the employment effect below (the tile states +10.3).
 *   - Polish 4: Universities certification card names exam fees.
 *   - Polish 5: Investors "Partner portals for governments, universities and other partner institutions."
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');

test('Minor 1: YouthWIDE national-scale answer plans a 100,000+ program phase by phase (page and JSON-LD)', () => {
  const S = 'A 100,000+ program is a design option we plan phase by phase; we have not yet delivered a program at that size.';
  expect(main('programs/youthwide/index.html')).toContain(S);
  expect(html('programs/youthwide/index.html')).toContain(S);
  expect(html('programs/youthwide/index.html')).not.toContain('phase is a design option');
});

test('Polish 2: TalentLEAP Q14 states the inclusions once', () => {
  const S = 'Compared with a self-paced course alone, every supported TalentLEAP cohort pairs 100 training hours per certification, including certification exam preparation, with three months of milestone-based mentoring, placement support and outcome tracking for 12 months after each course.';
  expect(main('our-model/talentleap/index.html')).toContain(S);
  expect(main('our-model/talentleap/index.html')).not.toContain('supported CodersTrust cohorts add mentoring');
});

test('Polish 3: the trial sentence gives the income result and leaves +10.3 to the tile', () => {
  const text = main('programs/youthwide/index.html');
  expect(text).toContain('women offered a place had an estimated 41% higher monthly income than the control group, alongside the employment effect below.');
  expect(text).not.toContain('were 10.3 percentage points more likely to be employed and had an estimated 41%');
});

test('Polish 4: Universities certification card names exam fees', () => {
  const text = main('partner-with-us/universities/index.html');
  expect(text).toContain('100 training hours per certification, including exam preparation; exam fees, eligibility and attempts are set per program.');
  expect(text).not.toContain('eligibility, attempts and terms are set per program');
});

test('Polish 5: Investors partner portals', () => {
  expect(main('partner-with-us/investors/index.html')).toContain('Partner portals for governments, universities and other partner institutions.');
});
