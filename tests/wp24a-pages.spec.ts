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

  test('program proof tiles appear only in Proof in Practice, not in the evidence or reach bands', async ({ page }) => {
    await page.goto(URL);
    const evidence = await page.locator('#proof-band').innerText();
    expect(evidence, 'evidence band').not.toMatch(/711 of 1,000|102 of 150|372 of 800/);
    await expect(page.locator('#reach'), 'reach band exists').toHaveCount(1);
    const reach = await page.locator('#reach').innerText();
    expect(reach, 'reach band').not.toMatch(/711 of 1,000|102 of 150|372 of 800/);
    await expect(page.locator('#cases')).toContainText('711 of 1,000');
  });

  test('reach is its own band, grouped "Delivered Since 2014" and "Contracted Scope"', async ({ page }) => {
    await page.goto(URL);
    expect(await texts(page, '#reach h3')).toEqual(['Delivered Since 2014', 'Contracted Scope']);
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
    // WP30c: the thesis band has no lead line; its three cards carry the argument (the online-learning card says what content-only courses lack)
    expect(text).toContain('Many online courses provide content without the work-entry support that turns skills into income');
    expect(text).toContain('is an opportunity employers and communities are not yet capturing');
    expect(text).not.toContain('leaves that gap open');
    expect(text).not.toContain('in every program');
    expect(text).toContain('in every supported cohort');
    expect(text).toContain('Three featured case studies, each with its partner.');
    // Cycle 5 (triage-c5, Partner): the guide line reads "need to distinguish a model that is working from one that is only promised" (copy.ts EMPATHY.investors).
    expect(text).toContain('need to distinguish a model that is working from one that is only promised');
    // WP30c: the path-to-scale paragraph is gone from the reach band (the scale FAQ answers it)
    expect(text).not.toContain('Path to scale');
    expect(text).toContain('all in emerging markets: skill training; freelance marketplaces and job sites; HR tech; and higher-ed EdTech.');
    expect(text).toContain('CodersTrust’s program results are measured, reported and open to independent evaluation.');
  });

  test('comparison table turns into stacked cards on a phone (table hidden, one card per approach)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(URL);
    await expect(page.locator('#compare .cmp')).toBeHidden();
    // WP30c: the "Conventional Skills Programs" column is dropped, so three approaches remain (CodersTrust, self-paced platforms, freelance marketplaces)
    await expect(page.locator('#compare .cmp-card')).toHaveCount(3);
    await expect(page.locator('#compare .cmp-card').first()).toBeVisible();
  });
});

test.describe('home partner logo wall', () => {
  test('partners are grouped into four relationship cards, with "not endorsements" stated', async ({ page }) => {
    await page.goto('');
    expect(await texts(page, '#guide .rel__title')).toEqual(['Funders and Development Partners', 'Government Programs', 'Education Partners', 'Employers']);
    await expect(page.locator('#guide .rel__caption')).toContainText('not endorsements');
    await expect(page.locator('#guide [data-marquee]'), 'no scrolling marquee').toHaveCount(0);
    for (const label of ['Funders and development partners', 'Government program partners', 'Education partners', 'Employer and private-sector partners']) {
      await expect(page.locator(`#guide section.partners[aria-label="${label}"]`)).toHaveCount(1);
    }
  });
});
