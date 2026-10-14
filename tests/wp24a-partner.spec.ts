import { expect, test, type Page } from '@playwright/test';

/**
 * WP24a: the Partner with Us hub and the six audience pages. Each test states one behavior; structure is read from the DOM.
 */

/** Trimmed text of every match, read from the DOM. */
async function texts(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
}
const idOrder = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main [id]')).map((e) => e.id));

const AUDIENCE_PAGES = ['development-partners', 'governments', 'foundations', 'universities', 'employers', 'local-partners'];

test.describe('Partner with Us hub', () => {
  const URL = 'partner-with-us/';

  test('route cards follow the menu order (WP27: Investors is the seventh peer route); the university card says "Prepare Students and Graduates for Work"', async ({ page }) => {
    await page.goto(URL);
    const hrefs = await page.locator('#audiences .grid-cards a').evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
    expect(hrefs.map((h) => h.replace(/^.*partner-with-us\//, ''))).toEqual(['development-partners/', 'governments/', 'foundations/', 'universities/', 'employers/', 'local-partners/', 'investors/']);
    await expect(page.locator('#audiences .grid-cards')).toContainText('Prepare Students and Graduates for Work');
  });

  test('a reverse routing line points program seekers to Programs', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#audiences').getByText('Already know the program you need?')).toHaveCount(1);
    expect(await page.locator('#audiences a[href$="/programs/"]').count()).toBeGreaterThanOrEqual(1);
  });

  test('WP30c: the hub states safeguarding once, in Due Diligence in One View (no separate "Protected by Design" band)', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#protected-by-design')).toHaveCount(0);
    const dd = page.locator('#due-diligence');
    await expect(dd.locator('h2')).toHaveText('Due Diligence in One View');
    await expect(dd).toContainText('Consent, protected records and grievance handling are specified for each program.');
  });

  test('the trial tile does not repeat "percentage points" beside "pp"', async ({ page }) => {
    await page.goto(URL);
    const tile = (await texts(page, '#why-partner li'))[0];
    expect(tile).toContain('+10.3 pp');
    expect(tile).not.toMatch(/in percentage points/);
  });

  test('WP30c: the hub has no RACI roles table (an internal-report view); the route cards, the first 90 days and four FAQs remain', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.raci')).toHaveCount(0);
    await expect(page.locator('#who-does-what')).toHaveCount(0);
    await expect(page.locator('#how-partnering-works ol > li')).toHaveCount(4);
    await expect(page.locator('#faqs details')).toHaveCount(4);
  });
});

test.describe('audience pages', () => {
  for (const slug of AUDIENCE_PAGES) {
    test(`${slug}: "Due Diligence in One View" compact block from registered commitments`, async ({ page }) => {
      await page.goto(`partner-with-us/${slug}/`);
      const block = page.locator('#due-diligence');
      await expect(block).toHaveCount(1);
      await expect(block.locator('h2')).toHaveText('Due Diligence in One View');
      expect(await block.locator('li').count()).toBe(4);
    });

    test(`${slug}: one learner story card near the top (before the problem band)`, async ({ page }) => {
      await page.goto(`partner-with-us/${slug}/`);
      const ids = await idOrder(page);
      const story = ids.indexOf('learner-voice');
      expect(story, 'learner story exists').toBeGreaterThan(-1);
      expect(story, 'before the problem band').toBeLessThan(ids.indexOf('problem'));
    });
  }

  for (const slug of ['development-partners', 'governments', 'foundations']) {
    test(`${slug}: Results at a Glance leads with three tiles, each tagged with its evidence type, secondary tiles below`, async ({ page }) => {
      await page.goto(`partner-with-us/${slug}/`);
      await expect(page.locator('#glance .pg__lead > li')).toHaveCount(3);
      const tags = await texts(page, '#glance .evidence-tag');
      expect(tags.length).toBeGreaterThanOrEqual(5);
      for (const t of tags) expect(['Randomized Trial', 'Surveyed Completers', 'Program Record', 'Contract Scope']).toContain(t);
      await expect(page.locator('#glance .pg__more')).toHaveCount(1);
    });
  }

  test('governments: the 31,200+ tile says "Six Government Contract Scopes" and is not a delivered-training total', async ({ page }) => {
    await page.goto('partner-with-us/governments/');
    const tile = page.locator('#glance li', { hasText: '31,200+' });
    await expect(tile).toContainText('Six Government Contract Scopes');
    await expect(tile).toContainText('contracted scopes, not a delivered-training total');
  });

  test('governments: "What a Ministry Sees" names each step\'s starting point (WP29): the first cohort, then 6 and 12 months after each course', async ({ page }) => {
    await page.goto('partner-with-us/governments/');
    const strip = page.locator('#ministry-sees');
    await expect(strip.locator('h2')).toHaveText('What a Ministry Sees');
    expect(await texts(page, '#ministry-sees ol > li .ms__when')).toEqual(['Month 1 of the First Cohort', '6 Months After Each Course', '12 Months After Each Course']);
    await expect(strip).toContainText('as agreed in the program scope');
  });

  test('governments: the contracts table becomes stacked rows on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('partner-with-us/governments/');
    const sw = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(sw.s).toBeLessThanOrEqual(sw.c);
    const display = await page.locator('#contracts tbody tr').first().evaluate((el) => getComputedStyle(el).display);
    expect(display, 'rows are stacked blocks, not table rows').not.toBe('table-row');
  });

  test('titles, breadcrumbs and eyebrows use "and", not "&"', async ({ page }) => {
    for (const slug of ['development-partners', 'foundations', 'employers']) {
      await page.goto(`partner-with-us/${slug}/`);
      const title = await page.title();
      const heroEyebrow = await page.locator('main .eyebrow').first().innerText();
      const crumbs = await page.locator('.crumbs').innerText();
      expect(`${title} ${heroEyebrow} ${crumbs}`, slug).not.toContain('&');
    }
  });

  test('employers: the closing CTA has one primary button, labelled "Plan Your First Team Program"', async ({ page }) => {
    await page.goto('partner-with-us/employers/');
    await expect(page.locator('#cta a.btn--primary')).toHaveCount(1);
    await expect(page.locator('#cta a.btn--primary')).toContainText('Plan Your First Team Program');
  });

  test('WP30c: the audience pages carry no In Short summary and no comparison table (the table is on Home and Investors)', async ({ page }) => {
    for (const slug of AUDIENCE_PAGES) {
      await page.goto(`partner-with-us/${slug}/`);
      await expect(page.locator('#in-short'), `${slug}: In Short`).toHaveCount(0);
      await expect(page.locator('#compare'), `${slug}: comparison`).toHaveCount(0);
      await expect(page.locator('#for-not-for'), `${slug}: fit check`).toHaveCount(0);
    }
  });

  test('foundations: one funding name, "YouthWIDE Cohort Grants"', async ({ page }) => {
    await page.goto('partner-with-us/foundations/');
    const text = await page.locator('main').innerText();
    expect(text).toContain('YouthWIDE Cohort Grants');
    expect(text).not.toMatch(/Fund YouthWIDE Cohorts|Choose a Cohort Starting Point/);
  });

  test('universities: the National University scale band comes before the challenge', async ({ page }) => {
    await page.goto('partner-with-us/universities/');
    const ids = await idOrder(page);
    expect(ids.indexOf('offer-evidence'), 'NU band').toBeGreaterThan(-1);
    expect(ids.indexOf('offer-evidence')).toBeLessThan(ids.indexOf('problem'));
    await expect(page.locator('#offer-evidence h2')).toHaveText('National University Scale, Not CodersTrust Delivery');
  });
});
