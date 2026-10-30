import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP133 (Opus High run 8, kit 100).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp133.spec.ts --project=chromium`.
 *   - Minor 1: News closing bands ask for two suitable times, as the email each button opens does (government: "for a briefing", not "preferred dates").
 *   - Polish 2: the Trial page and the Impact evidence table say "today’s 100-hour tracks" / "today’s tracks are 100 hours" (plural), as WP132 did elsewhere.
 *   - Polish 3: Universities heads its one-line start band "Start with One Campus", not "Choose Where to Start".
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');

const LINES: [string, string][] = [
  ['news/1000-trainees-enhancing-digital-government-economy-edge/index.html', 'Tell us your agency and program target, with two suitable times for a briefing.'],
  ['news/mou-signing-ceremony-between-north-south-university-coderstrust/index.html', 'Tell us your institution, number of students and programs of interest, with two suitable times for a discovery session.'],
];

test('Minor 1: the government and university News closing lines ask for two suitable times; no closing line asks for "preferred dates"', () => {
  for (const [page, line] of LINES) expect(main(page), page).toContain(line);
  expect(main(LINES[0][0])).not.toContain('preferred dates');
});

test('Minor 1: the four News closing texts in the source each ask for two suitable times', () => {
  const src = readFileSync('src/components/pages/news/news.ts', 'utf8');
  const block = /export const NEWS_CTA[\s\S]*?\n};/.exec(src)?.[0] ?? '';
  const texts = [...block.matchAll(/text: '([^']+)'/g)].map((m) => m[1]);
  expect(texts).toHaveLength(4);
  for (const t of texts) expect(t, t).toMatch(/two suitable times/);
});

test('Polish 2: Trial and Impact say the 100-hour tracks in the plural', () => {
  const trial = main('impact/independent-evaluation/index.html');
  expect(trial).toContain('CodersTrust’s 200-hour WSDFM program; today’s tracks are 100 hours.');
  expect(trial).not.toContain('today’s track is 100 hours');
  const impact = main('impact/index.html');
  expect(impact).toContain('today’s 100-hour tracks');
  expect(impact).not.toContain('today’s standard track');
});

test('Polish 3: Universities "Start with One Campus"', () => {
  const raw = html('partner-with-us/universities/index.html');
  // WP135 (Opus High run 10, Polish 3): the "Start with One Campus" band is folded into the pilot band ("A Pilot Comes First"); tests/wp135.spec.ts pins the new shape.
  expect(/<h2[^>]*>\s*Start with One Campus\s*<\/h2>/.test(raw)).toBe(false);
  expect(main('partner-with-us/universities/index.html')).toContain('Start with one campus; cohort size, tracks and labs are agreed in co-design.');
  expect(main('partner-with-us/universities/index.html')).not.toContain('Choose Where to Start');
});
