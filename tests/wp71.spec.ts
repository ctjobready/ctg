import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { KOSOVO_RECORDS } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { pageByRoute } from './support/pages';

/**
 * WP71 (Claude-ladder fix, Sonnet High run 1; owner direction: dated program records like the other pages do). Retrospective coverage: the owner exempted this project from
 * test-first work (WP24-common.md), so these tests were written after the wording change. Each one states an observable behavior of the built Home page:
 *   - Home's results carousel, slide 4 ("Results by Program"), dates the Kosovo program records "Women in Online Work, Kosovo (2016–2017): 68% in work (102 of 150)." and the
 *     UNDP YES, Korail result "UNDP YES, Korail (2017): 67% of the 350 enrolled found a first job within three months.";
 *   - the years are read from the register, not typed: TL-04's stat value ("2016–2017") and PR-03's own text ("..., 2017: 350 enrolled; ...");
 *   - the Home Proof in Practice Kosovo card reads "Program records, 2016–2017: 102 of 150 women in work." and names TL-04 beside PR-02 (data-fact);
 *   - the carousel keeps its height budget: no slide leaves more than 48 px unused below its content at 1280 and 390, and nothing scrolls sideways at 390.
 * Run after `npm run build`: PORT=<port> npx playwright test tests/wp71.spec.ts --project=chromium
 */

const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

/** The measure of tests/hero-slider.spec.ts (budget 48 px): unused space between the showing slide's content and the controls bar. */
const unusedBelow = (page: Page) =>
  page.evaluate(() => {
    const active = document.querySelector('[data-hs-slide].is-active');
    const controls = document.querySelector('[data-hs-bar]');
    if (!active || !controls) return Number.NaN;
    const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
    const contentBottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom));
    return Math.round(controls.getBoundingClientRect().top - contentBottom);
  });

async function showSlide(page: Page, n: number) {
  await page.locator('[data-hs-dot]').nth(n - 1).click();
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')))).toBe(n - 1);
  await page.waitForTimeout(450);
}

test.describe('WP71: the register supplies the years', () => {
  test('TL-04 gives the Kosovo span "2016–2017" and PR-03’s own text gives the Korail year 2017', () => {
    expect(fact('TL-04').stat?.value).toBe('2016–2017');
    expect(fact('PR-03').text).toMatch(/, 2017: 350 enrolled; /);
    expect(fact('PR-02').stat?.label).toBe('Women in Online Work, Kosovo: 68% in work');
  });

  test('the Kosovo card’s program-records line is built from the register: "Program records, 2016–2017: 102 of 150 women in work." (no-break spaces in the figure)', () => {
    expect(KOSOVO_RECORDS.text).toBe('Program records, 2016–2017: 102 of 150 women in work.');
    expect(KOSOVO_RECORDS.facts).toEqual(['PR-02', 'TL-04']);
  });
});

test.describe('WP71: Home results carousel, slide 4 (Results by Program)', () => {
  test.use({ viewport: DESKTOP });

  test('the Kosovo and Korail lines carry their years; the WSDFM and Her Power lines are unchanged', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const s4 = slide(page, 4);
    await expect(s4.locator('h3')).toHaveText('Results by Program');
    const lines = s4.locator('.hs__lines li');
    await expect(lines).toHaveCount(4);
    await expect(lines.nth(0)).toHaveText('Women in Online Work, Kosovo (2016–2017): 68% in work (102 of 150).');
    await expect(lines.nth(1)).toHaveText('WSDFM: 711 of 1,000 in work (71%); a separate trial studied 833 women.');
    await expect(lines.nth(2)).toHaveText('UNDP YES, Korail (2017): 67% of the 350 enrolled found a first job within three months.');
    await expect(lines.nth(3)).toHaveText('Her Power: 372 of 800 tracked in work (47%); 2,500 trained directly.');
  });

  test('the old undated wording is gone from the Home results carousel', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const text = (await page.locator('#results').textContent()) ?? '';
    expect(text).not.toContain('Women in Online Work, Kosovo: 68% in work');
    expect(text).not.toContain('UNDP YES, Korail: 67%');
  });

  test('the two dated lines name their register facts (PR-02 with TL-04; PR-03 with PR-06)', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const lines = slide(page, 4).locator('.hs__lines li');
    await expect(lines.nth(0)).toHaveAttribute('data-fact', 'PR-02 TL-04');
    await expect(lines.nth(2)).toHaveAttribute('data-fact', 'PR-03 PR-06');
  });
});

test.describe('WP71: the carousel keeps its height budget with the longer lines', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test.describe(`at ${vp.width}px`, () => {
      test.use({ viewport: vp });

      test('no slide leaves more than 48 px unused below its content, and nothing scrolls sideways', async ({ page }) => {
        await open(page, pageByRoute('/'));
        for (let n = 1; n <= 4; n++) {
          await showSlide(page, n);
          const gap = await unusedBelow(page);
          expect(gap, `slide ${n} at ${vp.width}px: unused space below the content`).toBeLessThanOrEqual(48);
          expect(gap, `slide ${n} at ${vp.width}px: content must not run into the controls`).toBeGreaterThanOrEqual(0);
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'horizontal overflow on Home').toBeLessThanOrEqual(0);
      });
    });
  }
});

test.describe('WP71: Home Proof in Practice Kosovo card', () => {
  test.use({ viewport: DESKTOP });

  test('the card reads "Program records, 2016–2017: 102 of 150 women in work." and then the World Bank line', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const card = page.locator('#cases .case__context').nth(1);
    await expect(card).toHaveText('Program records, 2016–2017: 102 of 150 women in work.');
    await expect(card).toHaveAttribute('data-fact', 'PR-02 TL-04');
    await expect(page.locator('#cases').getByText('World Bank: 77 trainees won at least one online contract.')).toBeVisible();
  });
});
