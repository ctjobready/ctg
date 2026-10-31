import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP139 (Opus High run 14, kit 106): the scorecard model (PD-11: shaped in co-design, agreed before the first cohort) everywhere.
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp139.spec.ts --project=chromium`.
 *   - Minor 1: Home FAQ "How Do You Prove Outcomes?" opens "A pilot scorecard is agreed before the first cohort." (page and FAQ JSON-LD).
 *   - Polish 2: the grant-funded Step 2 (Co-Design) shapes the pilot scorecard (Home, hub, Development Partners, Foundations).
 *   - Polish 3: Development Partners' accountability line judges each pilot against its scorecard.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');

test('Minor 1: Home FAQ opens with the one pilot scorecard, in the page and its FAQ structured data', () => {
  const raw = html('index.html');
  expect(main('index.html')).toContain('A pilot scorecard is agreed before the first cohort. As agreed in the program scope');
  expect(raw).toContain('"text":"A pilot scorecard is agreed before the first cohort.');
  expect(raw).not.toContain('A scorecard is agreed for every cohort before delivery.');
});

test('Polish 2: Step 2 shapes the pilot scorecard on Home, the hub, Development Partners and Foundations', () => {
  for (const page of ['index.html', 'partner-with-us/index.html', 'partner-with-us/development-partners/index.html', 'partner-with-us/foundations/index.html']) {
    const text = main(page);
    expect(text, page).toContain('We shape tracks, cohorts, safeguarding, reporting and the pilot scorecard with you.');
    expect(text, page).not.toContain('We shape tracks, cohorts, safeguarding and reporting with you.');
  }
});

test('Polish 3: Development Partners judges each pilot against its scorecard', () => {
  const text = main('partner-with-us/development-partners/index.html');
  expect(text).toContain('Every pilot is judged against its scorecard, including cost per completer and per verified outcome, with thresholds agreed with you before the first cohort starts.');
});
