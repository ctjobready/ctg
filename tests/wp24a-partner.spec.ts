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

  test('the trial tile spells the unit out once: "+10.3" with "percentage points" under it (WP45: no bare "pp")', async ({ page }) => {
    await page.goto(URL);
    const tile = (await texts(page, '#why-partner li'))[0];
    expect(tile).toContain('+10.3 percentage points');
    expect(tile.match(/percentage points/g) ?? []).toHaveLength(1);
    expect(tile).not.toMatch(/\bpp\b|in percentage points/);
  });

  test('WP30c: the hub has no RACI roles table (an internal-report view); the route cards, the first 90 days and two FAQs remain (WP45)', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('.raci')).toHaveCount(0);
    await expect(page.locator('#who-does-what')).toHaveCount(0);
    await expect(page.locator('#how-partnering-works ol > li')).toHaveCount(4);
    await expect(page.locator('#faqs details')).toHaveCount(2);
  });
});

test.describe('audience pages', () => {
  for (const slug of AUDIENCE_PAGES) {
    // WP34 (cycle-11 review): the four cards repeated what the page's own bands state, so the five pages other than Employers show one short item (tests/wp34.spec.ts pins its wording);
    // Employers keeps the compact four-row view of its own offer (tests/wp25s.spec.ts)
    test(`${slug}: the due-diligence block is ${slug === 'employers' ? 'the compact four-row "Due Diligence in One View"' : 'one short item'}`, async ({ page }) => {
      await page.goto(`partner-with-us/${slug}/`);
      const block = page.locator('#due-diligence');
      await expect(block).toHaveCount(1);
      if (slug === 'employers') {
        await expect(block.locator('h2')).toHaveText('Due Diligence in One View');
        expect(await block.locator('li').count()).toBe(4);
      } else {
        await expect(block.locator('h2')).toHaveText('Confirm Contracting, Safeguarding and Reporting');
        expect(await block.locator('li').count()).toBe(0);
        await expect(block.locator('a')).toHaveCount(1);
      }
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
    // WP49 (cycle-24 review): the one secondary tile joins the main group (a "More Results" heading over a single tile is gone), so the glance is four tiles in one group, each tagged with its evidence type (tests/wp49.spec.ts)
    test(`${slug}: Results at a Glance is four tiles in one group, each tagged with its evidence type`, async ({ page }) => {
      await page.goto(`partner-with-us/${slug}/`);
      await expect(page.locator('#glance .pg__lead > li')).toHaveCount(4);
      const tags = await texts(page, '#glance .evidence-tag');
      // WP35: the WSDFM tile left the glance (its 71% is program records, read beside the trial's 63.1%); every tile carries a tag
      expect(tags.length).toBe(4);
      for (const t of tags) expect(['Randomized Trial', 'Surveyed Completers', 'Program Record', 'Contract Scope']).toContain(t);
      await expect(page.locator('#glance .pg__more')).toHaveCount(0);
    });
  }

  test('governments: the 31,200+ tile says "People in the Scopes of Six Government Contracts" (WP36), that the total is contract scope and not a count of completers, and that Her Power’s 25,125 women were trained (WP35)', async ({ page }) => {
    await page.goto('partner-with-us/governments/');
    const tile = page.locator('#glance li', { hasText: '31,200+' });
    await expect(tile).toContainText('People in the Scopes of Six Government Contracts');
    // WP46 (cycle-22 review): the note says who trained whom, so the 25,125 is not read as CodersTrust's own count; WP48 (cycle-23 review): "The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; ..."
    await expect(tile).toContainText('The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; CodersTrust trained 2,500 women directly.');
  });

  // WP46 (cycle-22 review): "What a Ministry Sees" (WP24a, WP29) is gone: it restated the reporting cadence the page already gives. Its one detail that stood nowhere else, the follow-up surveys counted from the end of each course, is in the delivery model's card.
  test('governments: the ministry timeline strip is gone; the "Placement and Monthly Reports" card names the follow-up surveys at 3, 6 and 12 months after each course', async ({ page }) => {
    await page.goto('partner-with-us/governments/');
    await expect(page.locator('#ministry-sees')).toHaveCount(0);
    const card = page.locator('#mechanism .model__block', { hasText: 'Placement and Monthly Reports' });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Placement support into local, remote and global work, with monthly reports to the agency and follow-up surveys at 3, 6 and 12 months after each course.');
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

  test('WP30c: the audience pages carry no In Short summary and no comparison table (WP34: the table is on Home only)', async ({ page }) => {
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
    // WP38 (cycle-15 review): the heading names the partnership; the sentence under it still says the figures are National University's, not learners trained by CodersTrust
    await expect(page.locator('#offer-evidence h2')).toHaveText('The National University Partnership');
    await expect(page.locator('#offer-evidence .sh__lead')).toContainText('they are not learners trained by CodersTrust');
  });
});
