import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP134 (Opus High run 9, kit 101).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp134.spec.ts --project=chromium`.
 *   - Minor 1: the closing lines of the hub, About, Team, Programs and Global Reach ask for two suitable times, as the email each button opens does.
 *   - Minor 2: the Trial page, whose text WP133 changed, reads "Last updated October 31, 2026" (owner rule, 2026-10-31).
 *   - Minor 3: Careers "Inclusive and Flexible" is two parseable sentences (no list of items that contain "and").
 *   - Polish 4: JobReady@Work prints the first-step line once, after both routes, in the Employers wording.
 *   - Polish 5: Universities' closing band says "Timing follows your academic calendar." (co-design is said once, in the start band).
 *   - Polish 6: the two Careers photos have alt text without a closing period, as on In the Field.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');

test('Minor 1: the five closing lines ask for two suitable times', () => {
  const lines: [string, string][] = [
    ['partner-with-us/index.html', 'Tell us your goals and two suitable times, and we will help you find the right partnership route.'],
    ['about/index.html', 'Tell us your goals and two suitable times, and we will discuss the right partnership route.'],
    ['about/team/index.html', 'Tell us your goals and two suitable times, and we will discuss the right partnership route.'],
    ['programs/index.html', 'Tell us who you want to reach, your timeline and two suitable times. We will point you to the right program.'],
    ['impact/global-reach/index.html', 'Tell us the country, your priority groups and two suitable times; we outline a first cohort in a discovery session.'],
  ];
  for (const [page, line] of lines) expect(main(page), page).toContain(line);
});

test('Minor 2: the Trial page is dated October 31, 2026 (visible stamp and JSON-LD)', () => {
  const raw = html('impact/independent-evaluation/index.html');
  expect(visible(raw)).toContain('Last updated October 31, 2026');
  expect(raw).toMatch(/"dateModified":"2026-10-31"/);
  expect(raw).not.toMatch(/"dateModified":"2026-10-29"/);
});

test('Minor 3: Careers "Inclusive and Flexible" reads as two short sentences', () => {
  const text = main('careers/index.html');
  expect(text).toContain('A diverse, inclusive and flexible workplace. We are active, socially responsible and open to new thinking.');
  expect(text).not.toContain('diverse and inclusive, socially responsible');
});

test('Polish 4: JobReady@Work prints one first-step line, after the hiring steps, in the Employers wording', () => {
  const raw = /<main[\s\S]*<\/main>/.exec(html('programs/jobready-work/index.html'))?.[0] ?? '';
  const text = visible(raw);
  const LINE = 'Your first step, for team training or hiring: a discovery session. In your inquiry, include two suitable times.';
  expect(text.split(LINE)).toHaveLength(2);
  expect(text.indexOf(LINE)).toBeGreaterThan(text.indexOf('For Hiring'));
  expect(text).not.toContain('Your first step: a discovery session. In your inquiry, include two suitable times.');
});

test('Polish 5: Universities says co-design once; the closing band gives the timing only', () => {
  const text = main('partner-with-us/universities/index.html');
  expect(text).toContain('Timing follows your academic calendar.');
  expect(text).not.toContain('tracks and campus labs are agreed in co-design before the first cohort starts');
  expect(text.match(/agreed in co-design/g) ?? []).toHaveLength(1);
});

test('Polish 6: the Careers photo alt texts have no closing period', () => {
  const raw = html('careers/index.html');
  expect(raw).toContain('alt="The CodersTrust Bangladesh team gathered at the office entrance for a festival celebration"');
  expect(raw).toContain('alt="A group photo of the CodersTrust Bangladesh team outdoors at a company picnic"');
});
