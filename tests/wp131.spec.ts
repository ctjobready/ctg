import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP131 (Opus High run 6, kit 98).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp131.spec.ts --project=chromium`.
 *   - Minor 1: Accessibility does not call jobready.global (CodersTrust’s course storefront) "run by others"; only the Google Form is.
 *   - Polish 2: Home FAQ "How Do You Prove Outcomes?": the program-scope qualifier covers the reports and surveys, not the welcome for independent evaluation.
 *   - Polish 3: the CCNY visit headline says "Discuss an Expanded Partnership" (the body describes expanding the 2024 MOU partnership); the slug stays.
 *   - Polish 4: the CodersTrust boilerplate in three News posts says "STEAM, coding and robotics for young learners", not "K-12 STEM" (owner, 2026-10-31).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const CCNY = 'news/coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership/index.html';
const onOrAfter = (raw: string, day: string) => (raw.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? '') >= day;

test('Minor 1: Accessibility names jobready.global as CodersTrust’s own separate site and only the Google Form as run by another organization', () => {
  const text = visible(html('accessibility/index.html'));
  expect(text).toContain('Pages we link to may not meet the same standard. jobready.global, CodersTrust’s course storefront, is a separate site that this statement does not cover; the National University diploma application form is run by Google Forms.');
  expect(text).not.toContain('are run by others');
  expect(onOrAfter(html('accessibility/index.html'), '2026-10-31')).toBe(true);
});

test('Polish 2: Home FAQ states the welcome for independent evaluation as its own sentence, in the page and its FAQ structured data', () => {
  const raw = html('index.html');
  const answer = 'As agreed in the program scope, partners receive monthly reports and follow-up surveys at 3, 6 and 12 months. Independent evaluation is welcome.';
  expect(visible(raw)).toContain(answer);
  expect(raw).toContain(answer);
  expect(raw).not.toContain('12 months, and independent evaluation is welcome');
});

test('Polish 3: the CCNY visit headline says "Discuss an Expanded Partnership" on the post, the News index and its JSON-LD; the slug stays', () => {
  const H = 'CodersTrust Chairman Aziz Ahmad Visits City College Downtown to Discuss an Expanded Partnership';
  const raw = html(CCNY);
  expect(visible(raw)).toContain(H);
  expect(raw).toContain(`"headline":"${H}"`);
  expect(visible(html('news/index.html'))).toContain(H);
  for (const page of [CCNY, 'news/index.html']) expect(visible(html(page)), page).not.toContain('to Explore Global Partnership');
  expect(raw).toMatch(/<time datetime="2026-10-3[01]"/);
});

test('Polish 4: the CodersTrust boilerplate in the three posts says "for young learners", and no CodersTrust description says K-12', () => {
  const posts: [string, string][] = [
    ['news/coderstrust-organizes-career-carnival-for-students-and-affiliates/index.html', 'Its programs range from STEAM, coding and robotics for young learners to professional skills and advanced technology skills for the digital era.'],
    ['news/empowering-women-in-digital-economy-certificate-giving-ceremony-by-coderstrust-with-joyeeta-foundation/index.html', 'Its programs range from STEAM, coding and robotics for young learners to professional skills and advanced technology skills for the digital era.'],
    [CCNY, 'ranging from STEAM, coding and robotics for young learners to advanced technical and business training for the digital economy.'],
  ];
  for (const [page, sentence] of posts) {
    const text = visible(html(page));
    expect(text, page).toContain(sentence);
    expect(text, page).not.toMatch(/K[-–]12 STEM/);
  }
});
