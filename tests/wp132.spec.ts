import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP132 (Opus High run 7, kit 99).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp132.spec.ts --project=chromium`.
 *   - Minor 1: Universities "Choose Where to Start": tracks and labs are agreed in co-design, not set in the discovery session.
 *   - Polish 2: the first step is "Discovery Session" on Home, the hub, Development Partners, Foundations and SuperKids (step headings).
 *   - Polish 3: TalentLEAP "Today’s 100-hour tracks have not yet been independently evaluated."
 *   - Polish 4: Universities NU band lead names the cards in their order and has no dangling "they".
 *   - Polish 5: Contact step 3 for foundations names a process, not the grant itself.
 *   - Polish 6: Recognition links the 2016 World Bank feature once (its early-coverage card), not again in the World Bank line.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');

test('Minor 1: Universities says tracks and labs are agreed in co-design', () => {
  const text = main('partner-with-us/universities/index.html');
  expect(text).toContain('Start with one campus: cohort size, tracks and labs are agreed in co-design.');
  expect(text).not.toContain('are set in the discovery session');
});

test('Polish 2: no step heading on a built page is plain "Discovery"; the five pages say "Discovery Session"', () => {
  for (const page of ['index.html', 'partner-with-us/index.html', 'partner-with-us/development-partners/index.html', 'partner-with-us/foundations/index.html', 'programs/superkids/index.html']) {
    const raw = /<main[\s\S]*<\/main>/.exec(html(page))?.[0] ?? '';
    const headings = [...raw.matchAll(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/g)].map((m) => visible(m[1]).trim());
    expect(headings.some((h) => /Discovery Session$/.test(h)), page).toBe(true);
    expect(headings.filter((h) => /(^|: )Discovery$/.test(h)), page).toEqual([]);
  }
});

test('Polish 3: TalentLEAP says today’s 100-hour tracks (plural)', () => {
  const text = main('our-model/talentleap/index.html');
  expect(text).toContain('Today’s 100-hour tracks have not yet been independently evaluated.');
  expect(text).not.toContain('The current 100-hour track');
});

test('Polish 4: Universities NU band lead', () => {
  const text = main('partner-with-us/universities/index.html');
  expect(text).toContain('The first two cards describe the learners being onboarded and National University’s size, not learners trained by CodersTrust.');
  expect(text).not.toContain('; they are not learners trained by CodersTrust');
});

test('Polish 5: Contact step 3 for foundations', () => {
  const text = main('contact/index.html');
  expect(text).toContain('Foundations: a cohort grant designed with you, or a platform-grant discussion.');
  expect(text).not.toContain('Foundations: a cohort or platform grant.');
});

test('Polish 6: Recognition links the archived 2016 World Bank feature once; the World Bank line lists Kosovo (2017) and Albania (2021)', () => {
  const raw = html('about/recognition/index.html');
  expect(raw.match(/href="[^"]*kosovos-women-go-wow-online-and-working"/g) ?? []).toHaveLength(1);
  // the built <span> carries a data-astro-cid attribute, so match the class with trailing attributes allowed
  // the links carry a screen-reader-only note ("opens worldbank.org"); read the line as sighted readers see it
  const line = visible(raw.replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, ''));
  expect(line).toMatch(/World Bank coverage: Kosovo \(\s*2017\s*\) and Albania \(\s*2021\s*\)\./);
});
