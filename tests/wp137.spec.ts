import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP137 (Opus High run 12, kit 104; owner answer 2026-10-31).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp137.spec.ts --project=chromium`.
 *   - Minor 1: Universities, JobReady@Campus and Local Partners agree "the pilot scorecard" in Step 3, as Home and the funder pages do, so their Scorecard Thresholds card refers to something the page set up.
 *   - Polish 2 (owner, 2026-10-31: "Every program"): women are a priority in every program, not "in every group" (register IN-03 and every page).
 *   - Polish 3: the Her Power case study says the program "aimed" (2023–2025).
 *   - Polish 4: SuperKids states the targets-not-delivered qualifier in its "Agreed, Not Delivered" band only, not also in the lead.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');

test('Minor 1: Step 3 agrees the pilot scorecard on Universities, JobReady@Campus and Local Partners', () => {
  for (const page of ['partner-with-us/universities/index.html', 'programs/jobready-campus/index.html', 'partner-with-us/local-partners/index.html']) {
    const text = main(page);
    expect(text, page).toContain('Scope, schedule and the pilot scorecard are agreed.');
    expect(text, page).not.toContain('Scope, schedule and success measures are agreed.');
  }
});

test('Polish 2 (owner): "women are a priority in every program"; no built page or register fact says "in every group"', () => {
  expect(fact('IN-03').text).toContain('women are a priority in every program');
  const offenders = listPages().filter((p) => /a priority in every group/.test(readFileSync(p.file, 'utf8'))).map((p) => p.route);
  expect(offenders).toEqual([]);
  expect(main('partner-with-us/development-partners/index.html')).toContain('women are a priority in every program');
});

test('Polish 3: Her Power "aimed"', () => {
  const text = main('impact/case-studies/her-power/index.html');
  expect(text).toContain('It aimed to help women become entrepreneurs and self-employed through digital skills');
  expect(text).not.toContain('It aims to help women become');
});

test('Polish 4: SuperKids says "targets, not delivered reach" once, in its Agreed, Not Delivered band', () => {
  const text = main('programs/superkids/index.html');
  expect(text).not.toContain('DoICT and NCTB agreements set targets, not delivered reach.');
  expect(text).toContain('These are agreement targets, not delivered reach.');
});

test('owner date rule: the Her Power case study, whose text changed, carries dateModified 2026-10-31 or later', () => {
  expect((html('impact/case-studies/her-power/index.html').match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? '') >= '2026-10-31').toBe(true);
});
