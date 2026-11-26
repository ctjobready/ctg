import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP110 (Opus Low run 2, kit 76: Minor and Polish). Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp110.spec.ts --project=chromium`.
 *   - Item 1 (Minor): Her Power's contract scope on Governments adds "direct training" (ContractTable.astro literal, not a register fact).
 *   - Item 2 (Polish): Home's "Progress You Can Check" card reads "Monthly reports show ..." (no "will"), everywhere it appears.
 *   - Item 3 (Polish): the Trial page drops the attenders' "(+$36)" from RC-04 (register) and states "Income about +$36 a month." under
 *     "Women Who Attended", once.
 *   - Item 4: changed pages carry dateModified 2026-10-29 (Governments, Trial and Home already do; checked, not changed).
 */

const distHtml = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');

// Pages without a date of their own carry the build date (BUILD_DATE), so a later build dates them later: check "on or after" the change date.
const onOrAfter = (html: string, day: string, re = /"dateModified":"(\d{4}-\d{2}-\d{2})"/) => (html.match(re)?.[1] ?? "") >= day;
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+');
const visibleText = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP110 item 1: Her Power contract scope on Governments includes direct training', () => {
  test('the scope reads "Curriculum, manuals, mentorship guidelines, Training of Trainers and direct training"', () => {
    const html = distHtml('partner-with-us/governments/index.html');
    expect(visibleText(html)).toContain('Curriculum, manuals, mentorship guidelines, Training of Trainers and direct training');
    expect(visibleText(html)).not.toContain('Curriculum, manuals, mentorship guidelines and Training of Trainers');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP110 item 2: Home reporting card reads "Monthly reports show"', () => {
  // WP166-A (marketing review R1-17, owner approval of 21 November 2026): the Includes band with this card is gone from Home; the reporting promise is the hero lead's ("with monthly reports on their progress"). No page says "will show".
  test('Home states its monthly reports in the hero lead, and no built page keeps "Monthly reports will show progress"', () => {
    const home = distHtml('index.html');
    expect(visibleText(home)).toContain('with monthly reports on their progress.');
    expect(visibleText(home)).not.toContain('Monthly reports will show progress toward paid work');
    const offenders = walk(DIST_DIR).filter((f) => visibleText(readFileSync(f, 'utf8')).includes('Monthly reports will show progress toward paid work'));
    expect(offenders).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP110 item 3: Trial page attenders income and the RC-04 wording', () => {
  const html = () => distHtml('impact/independent-evaluation/index.html');
  const section = (h: string, start: string, end: string) => {
    const from = h.indexOf(start);
    const to = h.indexOf(end, from);
    return from === -1 || to === -1 ? '' : visibleText(h.slice(from, to));
  };

  test('"Women Offered a Place" prints RC-04 without the attenders parenthetical', () => {
    const offered = section(html(), '>Women Offered a Place</h3>', '>Women Who Attended</h3>');
    // WP172 (owner decision 2026-11-27): the published study's figures, about +$25 on about $68 (it was the 2022 report's +$27 on $66; the attenders' $36 is now $34)
    expect(offered).toContain('About +$25 a month for all women offered a place, on a control-group mean of about $68.');
    expect(offered).not.toContain('(+$34 for attenders)');
    expect(offered).not.toContain('(+$36 for attenders)');
  });

  test('"Women Who Attended" prints "Income about +$34 a month." once, and $34 appears nowhere else on the page', () => {
    const attended = section(html(), '>Women Who Attended</h3>', 'data-fact="RC-04a"');
    expect(attended).toContain('Income about +$34 a month.');
    const page = visibleText(html());
    expect(page.match(/\$34\b/g) ?? []).toHaveLength(1);
    expect(page).not.toMatch(/\$36\b/);
  });

  test('the register’s RC-04 text drops the parenthetical and keeps the control mean (about $68 since WP172)', () => {
    const facts = readFileSync('src/data/facts.ts', 'utf8');
    expect(facts).toContain('About +$25 a month for all women offered a place, on a control-group mean of about $68`');
    expect(facts).not.toContain('(+$34 for attenders)');
    expect(facts).not.toContain('(+$36 for attenders)');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP110 item 4: changed pages are dated 2026-10-29', () => {
  test('Governments, Trial and Home carry dateModified 2026-10-29', () => {
    expect(onOrAfter(distHtml('partner-with-us/governments/index.html'), "2026-10-29")).toBe(true);
    expect(onOrAfter(distHtml('impact/independent-evaluation/index.html'), "2026-10-29")).toBe(true);
    expect(onOrAfter(distHtml('index.html'), "2026-10-29")).toBe(true);
  });
});
