import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages, pageByRoute } from './support/pages';

/**
 * WP70 behaviors (Sonnet Medium run 2, Claude-ladder fix, 2026-10-21). Retrospective coverage: the owner exempted this project from test-first work,
 * so these tests were written after the change; each states one observable behavior of the built site
 * (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp70.spec.ts --project=chromium`):
 *   - 1: the Kosovo Women in Online Work case study opens with "The World Bank Group sought market-oriented skills to help young women in Kosovo find meaningful employment."
 *     (no "In 2017" start date: the pilot ran 2016–2017), and the pilot's 2016–2017 span stays on the page;
 *   - 1 (site-wide): no built page states that the Kosovo pilot began in 2017.
 */

const KOSOVO = '/impact/case-studies/kosovo-women-in-online-work/';
const CONTEXT_SENTENCE = 'The World Bank Group sought market-oriented skills to help young women in Kosovo find meaningful employment.';
const OLD_SENTENCE = 'In 2017 the World Bank Group sought market-oriented skills to help young women in Kosovo find meaningful employment.';
const SPAN_LINE = 'Women in Online Work was a pilot with the World Bank Group in 2016–2017.';

/** Visible text of a built HTML file: script and style bodies dropped, tags removed, whitespace collapsed. */
function textOfHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

test.describe('Item 1: the Kosovo case study states the pilot span, not a 2017 start', () => {
  for (const [label, viewport] of [
    ['1280', DESKTOP],
    ['390', MOBILE],
  ] as const) {
    test(`the context opens with "${CONTEXT_SENTENCE.slice(0, 40)}…" at ${label}px and carries no 2017 start`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await open(page, pageByRoute(KOSOVO));
      const main = page.locator('main');
      const text = (await main.innerText()).replace(/\s+/g, ' ');
      expect(text).toContain(CONTEXT_SENTENCE);
      expect(text).not.toContain(OLD_SENTENCE);
      expect(text).not.toContain('In 2017 the World Bank Group');
      expect(text).toContain(SPAN_LINE);
    });
  }

  test('the Kosovo case study is in the built inventory, and its shipped HTML carries the new sentence and not the old one', () => {
    const p = pageByRoute(KOSOVO);
    const html = readFileSync(p.file, 'utf8');
    const text = textOfHtml(html).replace(/&#x27;|&#39;/g, "'");
    expect(text).toContain(CONTEXT_SENTENCE);
    expect(text).not.toContain('In 2017 the World Bank Group');
  });
});

test.describe('Item 1 (site-wide): no built page states the Kosovo pilot began in 2017', () => {
  // A start-date claim is a 2017 year phrase that governs the Kosovo or World Bank pilot within the same sentence.
  const START_CLAIMS: RegExp[] = [
    /\b(?:In|Since|From|Began|Started|Launched|began in|started in|launched in) 2017\b[^.]{0,200}\b(?:Kosovo|World Bank)\b/,
    /\b(?:Kosovo|World Bank)\b[^.]{0,120}\b(?:began|started|launched|kicked off)\b[^.]{0,40}\b2017\b/,
  ];

  test('no built HTML page matches a 2017 start-date claim for the Kosovo pilot', () => {
    const inventory = listPages();
    expect(inventory.some((p) => p.route === KOSOVO), 'the Kosovo case study is built').toBe(true);
    const offenders: { route: string; match: string }[] = [];
    for (const p of inventory) {
      const text = textOfHtml(readFileSync(p.file, 'utf8')).replace(/&#x27;|&#39;/g, "'");
      for (const re of START_CLAIMS) {
        const m = re.exec(text);
        if (m) offenders.push({ route: p.route, match: m[0].slice(0, 160) });
      }
    }
    expect(offenders, 'pages that state the pilot began in 2017').toEqual([]);
  });
});
