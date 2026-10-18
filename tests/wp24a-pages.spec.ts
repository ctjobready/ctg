import { expect, test, type Page } from '@playwright/test';

/**
 * WP24a: structure and responsive behavior of the Investors page and the Partner with Us pages.
 * Each test states one behavior; structure is read from the DOM.
 */

/** Trimmed text of every match, read from the DOM. */
async function texts(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
}

test.describe('Investors page structure', () => {
  const URL = 'partner-with-us/investors/';

  test('credibility ("A Record Built Since 2014") comes before the vision', async ({ page }) => {
    await page.goto(URL);
    const order = await page.evaluate(() => {
      const idx = (id: string) => Array.from(document.querySelectorAll('main [id]')).findIndex((e) => e.id === id);
      return { guide: idx('guide'), vision: idx('vision') };
    });
    expect(order.guide, 'guide band exists').toBeGreaterThan(-1);
    expect(order.vision, 'vision band exists').toBeGreaterThan(-1);
    expect(order.guide, 'guide before vision').toBeLessThan(order.vision);
  });

  test('program results are on the case studies the evidence band links, not on this page (WP36: the three case-study cards are one "Case Studies" link)', async ({ page }) => {
    await page.goto(URL);
    const evidence = await page.locator('#proof-band').innerText();
    expect(evidence, 'evidence band').not.toMatch(/711 of 1,000|102 of 150|372 of 800/);
    await expect(page.locator('#reach'), 'reach band exists').toHaveCount(1);
    const reach = await page.locator('#reach').innerText();
    expect(reach, 'reach band').not.toMatch(/711 of 1,000|102 of 150|372 of 800/);
    await expect(page.locator('#cases'), 'no case-study cards').toHaveCount(0);
    expect(await page.locator('main').innerText(), 'no program record on the page').not.toMatch(/711 of 1,000|102 of 150|372 of 800/);
    await expect(page.locator('#proof-band').getByRole('link', { name: 'Case Studies' })).toHaveAttribute('href', /\/impact\/case-studies\/$/);
  });

  // WP42 (cycle-19 review): "Delivered Since 2014" moved into the track-record band (#guide), before the institutional relationships; the contract scope stays in its own labeled block in #reach ("Contracts, Pipeline and Recognition")
  // WP43 (cycle-20 review): the band's only sub-heading is "Delivered Since 2014"; the relationships are one paragraph under the figures, and the leadership entries are the "Meet the Leadership Team" link under that paragraph
  test('delivered reach leads the track-record band; the contract scope is its own labeled block in the next reach band', async ({ page }) => {
    await page.goto(URL);
    expect(await texts(page, '#guide h3')).toEqual(['Delivered Since 2014']);
    expect(await texts(page, '#reach h3')).toEqual(['Contracted Scope']);
    const order = await page.evaluate(() => {
      const top = (sel: string) => (document.querySelector(sel) as HTMLElement).getBoundingClientRect().top + window.scrollY;
      return { delivered: top('#guide .ig__delivered'), partners: top('#guide .ig__names'), leadership: top('#guide .ig__leaders') };
    });
    expect(order.delivered, 'the delivered figures come before the paragraph that names the institutions').toBeLessThan(order.partners);
    expect(order.partners, 'the institutions come before the link to the leadership team').toBeLessThan(order.leadership);
  });

  test('the offer is one four-step sequence: no separate low-risk band, no second next-steps band', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#offer ol > li')).toHaveCount(4);
    await expect(page.locator('#risk')).toHaveCount(0);
    await expect(page.locator('#next-steps')).toHaveCount(0);
  });

  test('no stray "Programs since 2014." sentence or founder sentence beside the founder cards', async ({ page }) => {
    await page.goto(URL);
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('Programs since 2014.');
    expect(text).not.toContain('CodersTrust was founded by');
  });

  test('thesis, scope and case-study wording', async ({ page }) => {
    await page.goto(URL);
    const text = await page.locator('main').innerText();
    // WP30c: the thesis band has no lead line; its three cards carry the argument. WP50 (cycle-25 review): the second card is "Connect Learning to Paid Work" with one line about what JobReady is being built to do
    // (it was "Online Learning Sells Content, Not Earnings" over a sentence about what many online courses lack; tests/wp50.spec.ts)
    expect(text).toContain('JobReady is being built to connect learning with mentoring and placement support.');
    expect(text).not.toContain('Many online courses provide content without the work-entry support that turns skills into income');
    // WP48 (cycle-23 review): the closing stakes line ("Every trained young person who remains out of work is an opportunity employers and communities are not yet capturing.") is gone; it added no fact
    expect(text).not.toContain('is an opportunity employers and communities are not yet capturing');
    expect(text).not.toContain('leaves that gap open');
    expect(text).not.toContain('in every program');
    // WP40 (cycle-17 review): "What JobReady Does" is three cards; the first scopes the inclusions to supported cohorts ("Supported cohorts include mentoring, certification exam preparation and placement support."), where the old row said "in every supported cohort"
    expect(text).toContain('Supported cohorts include mentoring, certification exam preparation and placement support');
    // WP36: the three case-study cards and their lead are gone (one "Case Studies" link stands in)
    expect(text).not.toContain('Three featured case studies, each with its partner.');
    // Cycle 5 (triage-c5, Partner): the guide line reads "need to distinguish a model that is working from one that is only promised" (copy.ts EMPATHY.investors).
    // WP46 (cycle-22 review): it now reads "need to see what is proven and what is still being built" (the earlier line invited a platform-proof test the page cannot pass).
    // WP52 (cycle-27 review, Grok m1): the guide line is gone from the Track Record band (tests/wp52.spec.ts)
    expect(text).not.toContain('Impact investors need to see what is proven and what is still being built.');
    expect(text).not.toContain('only promised');
    // WP30c: the path-to-scale paragraph is gone from the reach band (the scale FAQ answers it)
    expect(text).not.toContain('Path to scale');
    // WP36 (cycle-13 review): the sector taxonomy ("The Sectors Involved") stalled the page and is gone from the mechanism band
    expect(text).not.toContain('all in emerging markets: skill training; freelance marketplaces and job sites; HR tech; and higher-ed EdTech.');
    expect(text).not.toContain('The Sectors Involved');
    // WP39 (cycle-16 review): the "Our Approach" statement that carried "program results are measured, reported and open to independent evaluation" is deleted on Investors (tests/wp39.spec.ts holds the absence)
    expect(text).not.toContain('Our Approach');
  });

  // WP43 (cycle-20 review): the one-sentence platform band WP34 put in its place ("How JobReady Builds on Delivery") is gone too (tests/wp43.spec.ts holds that)
  test('WP34: the approaches comparison is gone from Investors (it compared supported youth cohorts, on a page about backing the platform)', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('#compare')).toHaveCount(0);
    await expect(page.locator('#platform')).toHaveCount(0);
  });
});

test.describe('the comparison table (Home)', () => {
  test('turns into stacked cards on a phone (table hidden, one card per approach)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('');
    await expect(page.locator('#compare .cmp')).toBeHidden();
    // WP31 dropped the "Conventional Skills Programs" and "Freelance Marketplaces Alone" columns on Home, so two approaches remain (CodersTrust and self-paced platforms);
    // WP34 took the table off Investors, which had been its other home
    await expect(page.locator('#compare .cmp-card')).toHaveCount(2);
    await expect(page.locator('#compare .cmp-card').first()).toBeVisible();
  });
});

test.describe('home partner logo wall', () => {
  test('partners are grouped into four relationship cards, with "not endorsements" stated', async ({ page }) => {
    await page.goto('');
    // WP57 (cycle-29 review, GPT-6.1 Sol P1): the fourth group holds AWS and BASIS beside the employers, so it is "Employers and Industry Partners"
    expect(await texts(page, '#guide .rel__title')).toEqual(['Funders and Development Partners', 'Government Programs', 'Education Partners', 'Employers and Industry Partners']);
    await expect(page.locator('#guide .rel__caption')).toContainText('not endorsements');
    await expect(page.locator('#guide [data-marquee]'), 'no scrolling marquee').toHaveCount(0);
    for (const label of ['Funders and development partners', 'Government program partners', 'Education partners', 'Employers and industry partners']) {
      await expect(page.locator(`#guide section.partners[aria-label="${label}"]`)).toHaveCount(1);
    }
  });
});
