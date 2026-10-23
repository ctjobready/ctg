import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { TRIAL_OFFERED, TRIAL_WOMEN, WSDFM_ENROLLED, WSDFM_NOT_TRIAL_NOTE } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP81 behaviors (owner item, 2026-10-23): WSDFM's program record covers the 1,000 women enrolled, and the women offered a place in the randomized trial were among them (BIGD report p. 19).
 * The two are different evidence, not different people, so no page says the program records are "separate" from the trial. Retrospective coverage (the owner exempted this project from test-first work);
 * run `npm run build` first, then `PORT=<port> npx playwright test tests/wp81.spec.ts --project=chromium`:
 *   - 1: Home slide 4's WSDFM line is "WSDFM: 711 of 1,000 enrolled in work (71%), from program records.", from PR-01 only, and it is one row at 1280 (as tall as the Kosovo line);
 *   - 2: the Impact WSDFM tile note and the WSDFM case-study hero note say the records are not trial results and that the trial's women were among the 1,000;
 *   - 3: the WSDFM caption on the Home case card reads "not trial results", and no built page says the WSDFM records are separate from, or a separate trial of, the women;
 *   - 4: the 1,000 in those notes is PR-01's value, and the 833 is RC-07's (TRIAL_WOMEN), never retyped.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
/** Built pages that are not archived news posts (those keep their original wording), with their HTML. */
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const HOME = '';
const IMPACT_WSDFM = 'impact/case-studies/wsdfm-women-freelancers/';

test.describe('WP81: WSDFM program records are not "separate" from the trial; the trial’s women were among the 1,000', () => {
  test('Home slide 4 reads "WSDFM: 711 of 1,000 enrolled in work (71%), from program records.", from PR-01 only, one row at 1280', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HOME);
    const lines = slide(page, 4).locator('.hs__lines li');
    expect(compact(await lines.nth(1).textContent())).toBe('WSDFM: 711 of 1,000 enrolled in work (71%), from program records.');
    expect(await lines.nth(1).getAttribute('data-fact')).toBe('PR-01');
    const heights = await lines.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(heights[1], 'the WSDFM line wraps').toBe(heights[0]);
  });

  test('the WSDFM case-study hero note and the Impact tile note say the records are not trial results, and the trial’s women were among the 1,000', async ({ page }) => {
    const note = `Program records, not trial results; the ${TRIAL_OFFERED} women offered a place in the randomized trial were among these ${WSDFM_ENROLLED}.`;
    await open(page, IMPACT_WSDFM);
    await expect(page.locator('[data-hero-note]')).toContainText('Program records, not trial results;');
    await open(page, 'impact/');
    await expect(page.locator('.glance__note', { hasText: 'Program records, not trial results' })).toHaveText(WSDFM_NOT_TRIAL_NOTE);
  });

  test('the constants read the 1,000 from PR-01 and the 833 from RC-07, and the note keeps the trial’s women inside the 1,000', () => {
    expect(WSDFM_ENROLLED).toBe(fact('PR-01').stat?.value?.split(' of ')[1]);
    expect(TRIAL_WOMEN).toBe(/(\d[\d,]*) women at baseline/.exec(fact('RC-07').text)?.[1]);
    expect(TRIAL_OFFERED).toBe(/(\d[\d,]*) treatment/.exec(fact('RC-07').text)?.[1]);
    expect(WSDFM_NOT_TRIAL_NOTE).toBe(
      `Program records, not trial results; the ${TRIAL_OFFERED} women offered a place in the randomized trial were among these ${WSDFM_ENROLLED}.`,
    );
  });

  test('the Home case card’s WSDFM caption says "not trial results"; no built page calls the WSDFM records separate from, or a separate trial of, the women', () => {
    const pages = sitePages();
    const withCaption = pages.filter((p) => visible(p.html).includes('WSDFM program records (not trial results; the trial’s 425 women offered a place were among these 1,000): 71% of enrolled women in work'));
    expect(withCaption.length).toBeGreaterThan(0);
    const separate = pages
      .filter((p) => /separate (trial|randomized trial|from the randomized trial)|separate randomized trial/i.test(visible(p.html)))
      .map((p) => p.route);
    expect(separate).toEqual([]);
  });

  test('Home has no horizontal overflow at 390 px with the new slide 4 line', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, HOME);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});
