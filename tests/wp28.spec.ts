import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP28 behaviors (review round 5, cycle 7, the verified Home review): scoped inclusions, an evidence-first band, a headline that matches its body,
 * a labelled post-inquiry band. Each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp28.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const UPEACE = 'news/coderstrust-students-invited-to-join-upeaces-young-leaders-for-peace-summer-programme-2026/';

test.describe('What a Supported Youth Cohort Includes (#features; WP41: it was "What Your Partnership Includes")', () => {
  // WP38 (cycle-15 review): on Home the band is three short cards (IncludesBand), not the concern / inclusion / benefit rows; the scoping stays in the card's sentences (tests/wp38.spec.ts holds the whole band)
  test('the reporting card is scoped: "as agreed in the program scope", documentary evidence "where available"', async ({ page }) => {
    await open(page, '');
    const card = page.locator('#features li[data-fact~="PD-08"]');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.card__title')).toHaveText('Results You Can Check');
    const t = compact(await card.textContent());
    expect(t).not.toContain('Documentary Evidence of Earnings');
    expect(t).toContain('as agreed in the program scope');
    expect(t).toContain('Documentary evidence is checked where available');
  });

  test('no card on Home claims an "Employer-Ready Portfolio" (WP30c: the hands-on-labs row is gone; three cards answer the three ranked pains)', async ({ page }) => {
    await open(page, '');
    const titles = (await page.locator('#features .card__title').allTextContents()).map(compact);
    expect(titles).toEqual(['Training, Mentoring and Placement Support', 'Results You Can Check', 'Tracks Chosen from Employer Demand']);
    expect(compact(await page.locator('main').textContent())).not.toMatch(/Employer-Ready Portfolio/i);
  });
});

test.describe('evidence band (#proof-band): the survey evidence', () => {
  test('the paid-work pathways come first, then the 72.3% tile, then the links (WP35: the trial sub-block, with its heading, sentence and link, is gone; WP30c: no ladder; WP33: no chart)', async ({ page }) => {
    await open(page, '');
    const band = page.locator('#proof-band');
    const order = await band.evaluate((el) => {
      const all = Array.from(el.querySelectorAll('*'));
      const at = (sel: string) => {
        const n = el.querySelector(sel);
        return n ? all.indexOf(n) : -1;
      };
      return { heading: at('.he__sub'), sentence: at('[data-plain-line]'), link: at('.he__links a'), chart: at('.ba, .he__chart'), ladder: at('.lc'), pathways: at('.pwp'), tile: at('[data-fact="OC-02"]') };
    });
    expect(order.heading, 'no trial sub-heading').toBe(-1);
    expect(order.sentence, 'no plain-language trial sentence').toBe(-1);
    expect(order.chart, 'the trial chart is not in the band').toBe(-1);
    expect(order.ladder, 'the evidence ladder is not in the band').toBe(-1);
    expect(order.pathways).toBeGreaterThan(-1);
    expect(order.tile).toBeGreaterThan(order.pathways);
    expect(order.link, 'the links follow the survey area').toBeGreaterThan(order.tile);
    // WP29's paid-work pathways comparison keeps its own h3, beside the 72.3% tile
    await expect(band.locator('h3')).toHaveText(['Paid-Work Pathways Among Surveyed Completers']);
    await expect(band.locator('[data-fact="OC-02"]')).toContainText('34 of 47 surveyed 2014–2023 completers with no prior income were earning at the October 2026 survey');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the pathways comparison and the tile sit below the heading (side by side from 1024px, stacked below it)`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, '');
      const tops = await page.locator('#proof-band').evaluate((el) => {
        const top = (sel: string) => (el.querySelector(sel) as HTMLElement).getBoundingClientRect().top + window.scrollY;
        return { head: top('.he__head'), pathways: top('.pwp'), tile: top('.he__stat') };
      });
      expect(tops.pathways).toBeGreaterThan(tops.head);
      if (vp.width >= 1024) {
        // side by side: the pathways comparison and the tile share a row
        expect(Math.abs(tops.tile - tops.pathways)).toBeLessThan(4);
      } else {
        expect(tops.tile).toBeGreaterThan(tops.pathways);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), 'no horizontal overflow').toBe(true);
    });
  }
});

test.describe('the UPEACE news headline matches its body', () => {
  test('the article says students "were invited to apply", as its body does ("accepting applications")', async ({ page }) => {
    await open(page, UPEACE);
    const h1 = compact(await page.locator('h1').first().textContent());
    expect(h1).toBe('CodersTrust Students Were Invited to Apply to UPEACE’s “Young Leaders for Peace” Summer Programme 2026');
    const body = compact(await page.locator('main').textContent());
    expect(body).toContain('UPEACE was accepting applications');
    expect(body).not.toMatch(/Invited to Join/i);
  });

  test('the News page card carries the same headline (WP31: Home no longer carries a news band)', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#news')).toHaveCount(0);
    await open(page, 'news/');
    const cards = page.locator(`main a[href$="/${UPEACE}"]`);
    expect(await cards.count(), 'the UPEACE post is listed on the News page').toBeGreaterThan(0);
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('CodersTrust Students Were Invited to Apply to UPEACE’s “Young Leaders for Peace” Summer Programme 2026');
    expect(text).not.toMatch(/Invited to Join/i);
  });
});

test.describe('post-inquiry band (#next-steps)', () => {
  const band = (page: Page) => page.locator('#next-steps');

  test('the week-by-week steps are labelled "For Grant-Funded Cohorts", ahead of the heading', async ({ page }) => {
    await open(page, '');
    await expect(band(page).locator('.eyebrow').first()).toHaveText('For Grant-Funded Cohorts');
    await expect(band(page).locator('h2')).toHaveText('What Happens After You Contact Us');
    // WP29: each step names its starting point
    await expect(band(page).locator('ol h3')).toHaveText([/Discovery \(Week 1\)/, /Co-Design \(Week 2\)/, /Agreement \(Week 3\)/, /Training Starts 6–8 Weeks After Signing/]);
  });

  test('one line says ministries, employers and impact investors get a route-specific next step, each linked to its route page', async ({ page }) => {
    await open(page, '');
    const line = band(page).locator('.ns__routes');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe('Ministries, employers and impact investors get a route-specific next step.');
    const links = await line.locator('a').evaluateAll((as) => as.map((a) => ({ text: (a.textContent ?? '').trim(), href: a.getAttribute('href') ?? '' })));
    expect(links.map((l) => l.text)).toEqual(['Ministries', 'employers', 'impact investors']);
    expect(links[0].href).toMatch(/\/partner-with-us\/governments\/$/);
    expect(links[1].href).toMatch(/\/partner-with-us\/employers\/$/);
    expect(links[2].href).toMatch(/\/partner-with-us\/investors\/$/);
    // the line follows the steps and the first-step card
    const after = await band(page).evaluate((el) => {
      const pos = (sel: string) => (el.querySelector(sel) as HTMLElement).getBoundingClientRect().top;
      return pos('.ns__routes') > pos('.ns__reinforce');
    });
    expect(after).toBe(true);
  });
});
