import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP144 (Opus High run 19, kit 111).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp144.spec.ts --project=chromium`.
 *   - Minor 1: Local Partners says CodersTrust supports partners with certification exam preparation, not "certification".
 *   - Minor 2: Foundations' Next Steps lead does not repeat the platform-grant first conversation (the table cell and the closing line say it).
 *   - Minor 3: YouthWIDE "What We Deliver" reads as one parallel phrase.
 *   - Minor 4: JobReady@Work and Employers make certification a success measure only where the track offers one.
 *   - Polish 5: the UNDP YES Korail case study's quote band is "Two Learners in Their Own Words" (Success Stories keeps "Two Learner Journeys").
 *   - Polish 6: Investors names AI chat as a platform-wide capability.
 *   - Polish 7: TalentLEAP's caveat band is "Evidence for Today’s Tracks" (heading and On This Page).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');

test('Minor 1: Local Partners "certification exam preparation"', () => {
  const text = main('partner-with-us/local-partners/index.html');
  expect(text).toContain('CodersTrust Bangladesh supports local partners with curriculum, certification exam preparation, mentoring, reporting and safeguarding.');
  expect(text).not.toContain('with curriculum, certification, mentoring');
});

test('Minor 2: Foundations says the platform-grant first conversation twice, not three times', () => {
  const text = main('partner-with-us/foundations/index.html');
  expect(text).not.toContain('For platform grants, the first conversation covers JobReady’s infrastructure and staged rollout.');
  expect(text).toContain('For cohort grants, the steps below show target timing for grant-funded pilots.');
});

test('Minor 3: YouthWIDE "What We Deliver"', () => {
  const text = main('programs/youthwide/index.html');
  expect(text).toContain('Certification exam preparation by track, then three months of milestone-based mentoring.');
  expect(text).not.toContain('Each track prepares learners for an industry certification, then three months');
});

test('Minor 4: certification is a success measure only where the track offers one', () => {
  expect(main('programs/jobready-work/index.html')).toContain('Completion, any certification the track offers and the skills you name are agreed before you start and checked in the progress evaluation.');
  expect(main('partner-with-us/employers/index.html')).toContain('Success measures are agreed before you start (completion, any certification the track offers and the role-specific skills you prioritize) and checked in the progress evaluation.');
});

test('Polish 5: Korail case study "Two Learners in Their Own Words"; Success Stories keeps "Two Learner Journeys"', () => {
  expect(main('impact/case-studies/undp-yes-korail/index.html')).toContain('Two Learners in Their Own Words');
  expect(main('impact/case-studies/undp-yes-korail/index.html')).not.toContain('Two Learner Journeys');
  expect(main('impact/stories/index.html')).toContain('Two Learner Journeys');
});

test('Polish 6: Investors names AI chat as platform-wide', () => {
  expect(main('partner-with-us/investors/index.html')).toContain('Partner portals are live, and AI chat is live across the platform. Personalized and adaptive learning is on the roadmap.');
});

test('Polish 7: TalentLEAP "Evidence for Today’s Tracks" (heading and On This Page)', () => {
  const text = main('our-model/talentleap/index.html');
  expect(text.split('Evidence for Today’s Tracks').length).toBe(3);
  expect(text).not.toContain('Results from CodersTrust Programs');
});

test('owner date rule: the Korail case study, whose text changed, is dated 2026-11-01 or later', () => {
  expect((html('impact/case-studies/undp-yes-korail/index.html').match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? '') >= '2026-11-01').toBe(true);
});
