import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP103 (Sonnet Medium run 2, kit 69, and owner answers of 2026-10-29). Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp103.spec.ts --project=chromium`.
 *   - Item 1: Case Studies index says "figure", not "result", in its lead and meta description (Albania's figure is reported enrollment).
 *   - Item 2: the Kosovo case study H1 is "Women in Online Work, Kosovo: Preparing Young Women for Online Work".
 *   - Item 3: the Stories H1 is "Learners Turning Training into Work".
 *   - Item 4: the consent line says "those pictured or their guardians" on In the Field and News Photographs.
 *   - Item 5: Global Reach's Kenya row is a feasibility study with a Rockefeller Foundation grant; the note's sentence says so.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const builtHtml = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const ldJson = async (page: import('@playwright/test').Page) => (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');

test.describe('WP103 item 1: Case Studies index says "figure"', () => {
  test('the lead reads "Five programs, each with its figure and its base."', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    await expect(page.locator('main .hero__lead').first()).toHaveText('Five programs, each with its figure and its base.');
  });

  test('the meta description reads with "figure", stays within 155 characters, and keeps the rest of its sentence', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toBe(
      'Five CodersTrust case studies, each with its figure and its base: Women in Online Work, Digital Jobs Albania, WSDFM, UNDP YES and Her Power.',
    );
    expect(description.length).toBeLessThanOrEqual(155);
  });

  test('the JSON-LD description repeats "figure", not "result"', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    const ld = await ldJson(page);
    expect(ld).toContain('each with its figure and its base');
    expect(ld).not.toContain('its result and its base');
  });

  test('no built page still says "each with its result and its base"', () => {
    expect(builtHtml().filter((p) => p.html.includes('each with its result and its base')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('WP103 item 2: Kosovo case study H1', () => {
  test('the H1 is "Women in Online Work, Kosovo: Preparing Young Women for Online Work"', async ({ page }) => {
    await open(page, 'impact/case-studies/kosovo-women-in-online-work/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Women in Online Work, Kosovo: Preparing Young Women for Online Work');
  });

  test('the JSON-LD headline repeats the new H1, and the old H1 is gone from the page and its JSON-LD', async ({ page }) => {
    await open(page, 'impact/case-studies/kosovo-women-in-online-work/');
    const ld = await ldJson(page);
    expect(ld).toContain('Women in Online Work, Kosovo: Preparing Young Women for Online Work');
    expect(ld).not.toContain('Young Women Earning Online');
    expect(await page.content()).not.toContain('Young Women Earning Online');
  });

  test('no built page still says "Young Women Earning Online"', () => {
    expect(builtHtml().filter((p) => p.html.includes('Young Women Earning Online')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('WP103 item 3: Stories H1', () => {
  test('the H1 is "Learners Turning Training into Work"', async ({ page }) => {
    await open(page, 'impact/stories/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Learners Turning Training into Work');
  });

  test('no built page still says "Learners Turning Training into Paid Work"', () => {
    expect(builtHtml().filter((p) => p.html.includes('Learners Turning Training into Paid Work')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('WP103 item 4: consent line names guardians', () => {
  const NEW = 'Photographs are used with the consent of those pictured or their guardians.';

  for (const route of ['impact/in-the-field/', 'impact/in-the-field/news-photos/']) {
    test(`${route} carries the new consent line`, async ({ page }) => {
      await open(page, route);
      expect(compact(await page.locator('body').textContent())).toContain(NEW);
    });
  }

  test('no built page still says "consent of those pictured." without guardians', () => {
    expect(builtHtml().filter((p) => p.html.includes('consent of those pictured.')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('WP103 item 5: Global Reach names Kenya as a feasibility study', () => {
  const row = (page: import('@playwright/test').Page, name: string) =>
    page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: name }) }).first();

  test('the Kenya row note reads "Feasibility study with a Rockefeller Foundation grant", and its years and 100 students are unchanged', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    const kenya = row(page, 'Kenya');
    expect(compact(await kenya.locator('td[data-label="Partner / Note"]').textContent())).toBe('Feasibility study with a Rockefeller Foundation grant');
    const text = compact(await kenya.textContent());
    expect(text).toContain('2016');
    expect(text).toContain('100 students');
  });

  test('the note under the map says the other rows are training programs, except Kenya, a feasibility study', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    const note = compact(await page.locator('#map .callout p[data-fact="SC-03"]').textContent());
    expect(note).toContain('Rows that are a partnership, an announced cooperation or the launch say so in their note; the other rows are training programs, except Kenya, a feasibility study.');
    expect(note).not.toMatch(/the other rows are training programs\. /);
  });

  test('the table still has 16 locations, and the Kenya note names no grant amount', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    await expect(page.locator('.wmap__table tbody tr')).toHaveCount(16);
    const kenyaNote = compact(await row(page, 'Kenya').locator('td[data-label="Partner / Note"]').textContent());
    expect(kenyaNote).not.toMatch(/\d|\$|USD|US\$/);
  });
});
