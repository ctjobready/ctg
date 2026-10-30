import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP136 (owner answer 2026-10-31 and Opus High run 11, kit 103).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp136.spec.ts tests/wp135.spec.ts --project=chromium`.
 *   - Owner answer: the "two suitable times" request appears ONCE per page (the per-page rule lives in tests/wp135.spec.ts; the four pages it changed are pinned here).
 *   - Minor 2: Local Partners "Challenge" lead states the reader's obstacle, not the offer.
 *   - Polish 3: Governments "Challenge" lead leaves the measurement point to card 2.
 *   - Polish 4: Outcomes 2026 "How Fast Earnings Started" uses the defined term "surveyed new earners" in its second sentence.
 *   - Polish 5: Universities "The National University Partnership" loses its third card (University Partners).
 *   - Polish 6: Home's comparison table names its first column "What It Includes".
 *   - Owner rule 2026-10-31: a page with its own "Last updated" / dateModified is on or after 2026-10-31 (build-date pages need nothing).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const onOrAfter = (day: string | undefined, min: string) => (day ?? '') >= min;
/** The <section> that holds the element with this id, to its closing tag. */
const band = (rel: string, id: string) => {
  const raw = html(rel);
  const at = raw.search(new RegExp(`<section[^>]*\\bid="${id}"`));
  expect(at, `${rel} has a section #${id}`).toBeGreaterThanOrEqual(0);
  return raw.slice(at, raw.indexOf('</section>', at) + 10);
};

test('Minor 2: Local Partners "Challenge" lead states the reader’s obstacle, not CodersTrust’s offer', () => {
  const rel = 'partner-with-us/local-partners/index.html';
  const t = main(rel);
  expect(t).toContain('Connect Your Community to Paid Digital Work Your organization reaches young people, but a curriculum, certification and links to paid work are hard to build alone.');
  expect(t).not.toContain('Pair your community reach with CodersTrust’s curriculum, mentoring, placement support and reporting.');
});

test('Polish 3: the Governments "Challenge" lead is the ministry’s goal; the measurement point stays in card 2', () => {
  const t = main('partner-with-us/governments/index.html');
  expect(t).toContain('National programs are judged on who starts earning.');
  expect(t).not.toContain('Budgets that count enrollment cannot show who is earning.');
  expect(t).toContain('Most training budgets count who enrolled, not who is earning afterward.');
});

test('Polish 4: Outcomes 2026 "How Fast Earnings Started" uses the defined term in its second sentence, with the figures and the OC-05 marker unchanged', () => {
  const rel = 'impact/outcomes-2026/index.html';
  const raw = html(rel);
  const t = main(rel);
  expect(t).toContain(
    'Surveyed new earners are the completers who first earned during or after training. Among the 172 surveyed new earners: 23.3% first earned during the course; 58.7% had started earning by six months after finishing it; 77.3% by a year; 90.7% by two years (cumulative).',
  );
  expect(t).not.toContain('Among the 172 surveyed completers who first earned during or after training');
  expect(/<p[^>]*data-fact="OC-05"[^>]*>\s*<span[^>]*data-fact="OC-05"/.test(raw), 'the sentence keeps its OC-05 markers').toBe(true);
});

test('Polish 4 (guard): the register’s OC-05 text, and Home’s survey slide built from it, are unchanged', () => {
  expect(main('index.html')).toContain('Of the 172 surveyed completers who first earned during or after training, 58.7% had started earning by six months after finishing the course.');
});

test('Polish 5: Universities "The National University Partnership" has two cards and a lead that reads for two', () => {
  const rel = 'partner-with-us/universities/index.html';
  const b = band(rel, 'offer-evidence');
  expect(visible(b)).toContain('The National University Partnership These cards describe the learners being onboarded and National University’s size, not learners trained by CodersTrust.');
  expect(visible(b)).not.toContain('The first two cards');
  expect(b.match(/<li class="pe__item"/g) ?? [], 'two cards in the band').toHaveLength(2);
  expect(/University Partners\b/.test(visible(b)), 'no "University Partners" card label ("Partnership" is not it)').toBe(false);
  expect(/data-fact="PA-05"/.test(b), 'the band no longer carries PA-05').toBe(false);
  expect(b).toContain('data-fact="SC-04"');
  expect(b).toContain('data-fact="SC-05"');
  // PA-05's three partners stay named on the page, as the track-record logos' alt text.
  const raw = html(rel);
  for (const alt of ['National University, Bangladesh', 'University for Peace (UPEACE)', 'The City College of New York (CCNY), MOU partner since 2024']) expect(raw, alt).toContain(`alt="${alt}"`);
});

test('Polish 6: Home’s comparison table names its first column "What It Includes", not "Approach"', () => {
  const b = band('index.html', 'compare');
  const heads = [...b.matchAll(/<th\b[^>]*scope="col"[^>]*>([\s\S]*?)<\/th>/g)].map((m) => visible(m[1]));
  expect(heads).toEqual(['What It Includes', 'CodersTrust Supported Cohort', 'Self-Paced Course Platforms']);
});

test('Owner rule 2026-10-31: the changed pages that carry their own date are on or after 2026-10-31 (Home, Local Partners and Universities are build-date pages)', () => {
  const DAY = '2026-10-31';
  const modified = (rel: string) => [...html(rel).matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
  for (const p of ['partner-with-us/governments/index.html', 'impact/outcomes-2026/index.html', 'programs/superkids/index.html', 'programs/youthwide/index.html']) {
    const days = modified(p);
    expect(days.length, `${p} states a dateModified`).toBeGreaterThan(0);
    for (const d of days) expect(onOrAfter(d, DAY), `${p} dateModified ${d}`).toBe(true);
  }
  for (const p of ['impact/outcomes-2026/index.html', 'programs/superkids/index.html', 'programs/youthwide/index.html']) {
    const stamp = /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(p))?.[1];
    expect(onOrAfter(stamp, DAY), `${p} visible "Last updated"`).toBe(true);
  }
  for (const p of ['index.html', 'partner-with-us/local-partners/index.html', 'partner-with-us/universities/index.html']) {
    expect(/Last updated\s*<time/.test(html(p)), `${p} prints no "Last updated" (its dateModified is the build date)`).toBe(false);
  }
});
