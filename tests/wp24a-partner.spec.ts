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

  test('WP30c: the hub has no RACI roles table (an internal-report view); the route cards, the first-cohort steps and two FAQs remain (WP45; WP62: the steps band is headed "From First Conversation to First Cohort")', async ({ page }) => {
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
    // Employers keeps the compact view of its own offer (tests/wp25s.spec.ts); WP57 (cycle-29 review, GPT-6.1 Sol G7): three rows, its "Independent Evaluation Welcome" row is gone (tests/wp57.spec.ts)
    test(`${slug}: the due-diligence block is ${slug === 'employers' ? 'the compact three-row "Due Diligence in One View"' : 'one short item'}`, async ({ page }) => {
      await page.goto(`partner-with-us/${slug}/`);
      const block = page.locator('#due-diligence');
      await expect(block).toHaveCount(1);
      if (slug === 'employers') {
        await expect(block.locator('h2')).toHaveText('Due Diligence in One View');
        expect(await block.locator('li').count()).toBe(3);
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

  // WP52 (cycle-27 review, Kimi M2): Development Partners' glance is the three lead tiles (its ">4×" tile became the +10.3 tile's note); Governments and Foundations keep four (tests/wp49.spec.ts, tests/wp52.spec.ts)
  for (const [slug, tiles] of [['development-partners', 3], ['governments', 4], ['foundations', 4]] as const) {
    // WP49 (cycle-24 review): the one secondary tile joins the main group (a "More Results" heading over a single tile is gone), so the glance is one group, each tile tagged with its evidence type (tests/wp49.spec.ts)
    test(`${slug}: Results at a Glance is ${tiles} tiles in one group, each tagged with its evidence type`, async ({ page }) => {
      await page.goto(`partner-with-us/${slug}/`);
      await expect(page.locator('#glance .pg__lead > li')).toHaveCount(tiles);
      const tags = await texts(page, '#glance .evidence-tag');
      // WP35: the WSDFM tile left the glance (its 71% is program records, read beside the trial's 63.1%); every tile carries a tag
      expect(tags.length).toBe(tiles);
      for (const t of tags) expect(['Randomized Trial', 'Surveyed Completers', 'Program Record', 'Contract Scope']).toContain(t);
      await expect(page.locator('#glance .pg__more')).toHaveCount(0);
    });
  }

  test('governments: the 30,000+ tile says "People in the Scopes of Six Government Contracts" (WP36), that the total is contract scope and not a count of completers, and where each scope is shown (WP51)', async ({ page }) => {
    await page.goto('partner-with-us/governments/');
    const tile = page.locator('#glance li', { hasText: '30,000+' });
    await expect(tile).toContainText('People in the Scopes of Six Government Contracts');
    // WP46 (cycle-22 review): the note said who trained whom, so the 25,125 was not read as CodersTrust's own count; WP48 (cycle-23 review): "The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; ..."
    // WP51 (cycle-26 review, Kimi m2): the tile kept the first sentence and pointed to the table. WP57 (cycle-29 review, Grok R2 with Gemini GM1): the total visibly includes Her Power's national program, in the note's WP35 wording (tests/wp57.spec.ts)
    await expect(tile).toContainText('The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly).');
    await expect(tile).not.toContainText('The contracts table below shows each scope.');
    await expect(page.locator('#contracts')).toContainText('The national program trained 25,125 women across 130 sub-districts (upazilas).');
  });

  // WP46 (cycle-22 review): "What a Ministry Sees" (WP24a, WP29) is gone: it restated the reporting cadence the page already gives. Its one detail that stood nowhere else, the follow-up surveys counted from the end of each course, is in the delivery model's card.
  test('governments: the ministry timeline strip is gone; the "Placement and Monthly Reports" card names the follow-up surveys at 3, 6 and 12 months after each course', async ({ page }) => {
    await page.goto('partner-with-us/governments/');
    await expect(page.locator('#ministry-sees')).toHaveCount(0);
    const card = page.locator('#mechanism .model__block', { hasText: 'Placement and Monthly Reports' });
    await expect(card).toHaveCount(1);
    // WP52 (cycle-27 review): the card scopes its reports and surveys ("..., as agreed in the program scope.")
    await expect(card).toContainText('Placement support into local, remote and global work, with monthly reports to the agency and follow-up surveys at 3, 6 and 12 months after each course, as agreed in the program scope.');
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
