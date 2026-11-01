import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP143 (Opus High run 18, kit 110).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp143.spec.ts --project=chromium`.
 *   - Minor 1: About's principles heading is scoped to the youth programs ("Four Principles Behind Our Youth Programs"), heading and On This Page entry.
 *   - Minor 2 (rule, the reverse of the WP142 noun check): a page that promises outcome tracking names tracking (or reporting) in its one scope sentence. TalentLEAP: "Inclusions, exam terms and outcome tracking on this page are agreed in the program scope."
 *   - Minor 3: YouthWIDE's options lead offers the indicative budget "in the briefing or discovery session".
 *   - Polish 4: JobReady@Campus H1 does not read as if CodersTrust awards the degree.
 *   - Polish 5: SuperKids states "400+ SuperKids learners since 2021" once.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const mainOf = (raw: string) => visible(/<main[\s\S]*<\/main>/.exec(raw)?.[0] ?? '');
const main = (rel: string) => mainOf(html(rel));
const STATEMENT = /[A-Z][^.]{0,80}\b(?:is|are) agreed in (?:the|each) program(?:[’']s)? scope\./;
const TRACKING_PROMISE = /\boutcome tracking\b|\btracking for 12 months\b/i;

test('Minor 1: About "Four Principles Behind Our Youth Programs" (heading and On This Page)', () => {
  const raw = html('about/index.html');
  expect(raw).toMatch(/<h2[^>]*>\s*Four Principles Behind Our Youth Programs\s*<\/h2>/);
  expect(mainOf(raw)).not.toContain('Four Principles Behind Every Program');
  expect(mainOf(raw).split('Four Principles Behind Our Youth Programs').length).toBe(3); // the On This Page entry and the heading
});

test('Minor 2 (rule): every page whose one scope sentence sits beside an outcome-tracking promise names tracking or reporting in it', () => {
  const offenders: string[] = [];
  let examined = 0;
  for (const p of listPages()) {
    if (p.route.startsWith('/news/') || p.route.startsWith('/styleguide')) continue;
    const text = mainOf(readFileSync(p.file, 'utf8'));
    const s = STATEMENT.exec(text)?.[0];
    if (!s || !TRACKING_PROMISE.test(text.replace(s, ''))) continue;
    examined++;
    if (!/\btracking\b|\breporting\b/i.test(s)) offenders.push(`${p.route}: ${s}`);
  }
  expect(examined).toBeGreaterThanOrEqual(3);
  expect(offenders).toEqual([]);
});

test('Minor 2: TalentLEAP names outcome tracking', () => {
  expect(main('our-model/talentleap/index.html')).toContain('Inclusions, exam terms and outcome tracking on this page are agreed in the program scope.');
});

test('Minor 3: YouthWIDE options lead offers the budget in the briefing or discovery session', () => {
  const text = main('programs/youthwide/index.html');
  expect(text).toContain('We share an indicative budget in the briefing or discovery session.');
  expect(text).not.toContain('We share an indicative budget in the discovery session.');
});

test('Polish 4: JobReady@Campus H1 names the route beside the degree', () => {
  const raw = html('programs/jobready-campus/index.html');
  expect(raw).toMatch(/<h1[^>]*>\s*Give Your Students a Route into Digital Work Alongside Their Degree\s*<\/h1>/);
  expect(raw).not.toContain('Give Your Students a Degree and a Route');
});

test('Polish 5: SuperKids states its delivered figure once', () => {
  expect(main('programs/superkids/index.html').split('400+ SuperKids learners since 2021').length).toBe(2);
});

test('owner date rule: SuperKids, whose text changed, is dated 2026-11-01 or later', () => {
  expect((html('programs/superkids/index.html').match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? '') >= '2026-11-01').toBe(true);
});
