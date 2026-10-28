import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { open } from './support/browser';

/**
 * WP78 (Claude-ladder review, Sonnet XHigh run 7). Retrospective coverage (the owner exempted this project from test-first work); run
 * `npm run build` first, then `PORT=<port> npx playwright test tests/wp78.spec.ts --project=chromium`.
 *   - Item 1: Global Reach's note no longer says no location "does not say how many programs ran there" for every row; it says most rows do not.
 *   - Item 2: the Case Studies lead and meta description say each result comes with its base, and that each case study says what its figures show.
 *   - Item 3: the independent evaluation page gives the income amounts in taka beside the dollar figures (RC-04a, from the BIGD report's Table 4).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

test.describe('WP78 item 1: Global Reach note', () => {
  test('the locations note says most rows do not give program counts or size, and no longer says none do', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    const p = page.locator('#map .callout p[data-fact="SC-03"]');
    await expect(p).toHaveCount(1);
    const text = compact(await p.textContent());
    expect(text).toContain('A location is a country or territory where CodersTrust has worked; most rows do not say how many programs ran there, or how large they were.');
    expect(text).not.toContain('It does not say how many programs ran there');
    expect(text).toContain('New York is the headquarters, not one of the 16 locations.');
  });
});

test.describe('WP78 item 2: Case Studies index wording', () => {
  test('the lead says each result comes with its base, and the old overpromise is gone', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    const lead = page.locator('main .hero__lead').first();
    await expect(lead).toHaveText('Five programs, each with its result and its base.');
    await expect(page.locator('main')).not.toContainText('its base and what the figures do and do not show');
  });

  test('the meta description names the result and the base, stays within 155 characters, and drops "what it does not show"', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toContain('each with its result and its base');
    expect(description).not.toContain('what it does not show');
    expect(description.length).toBeLessThanOrEqual(155);
  });
});

test.describe('WP78 item 3: taka amounts on the trial page', () => {
  test('RC-04a carries the three taka figures and the control-group mean, with no source code shown', () => {
    const text = fact('RC-04a').text;
    expect(text).toContain('BDT 2,354 a month for women offered a place');
    expect(text).toContain('BDT 3,118 for attenders');
    expect(text).toContain('a control-group mean of BDT 5,715 (Table 4)');
  });

  test('the income results section states the taka amounts and says the dollar figures are approximate conversions', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    const note = page.locator('#results p[data-fact="RC-04a"]');
    await expect(note).toHaveCount(1);
    const text = compact(await note.textContent());
    // WP80 (item 2): the rate sits in RC-04a's text, beside the dollar figures it converts.
    expect(text).toBe('The report gives these amounts in taka: BDT 2,354 a month for women offered a place, BDT 3,118 for attenders, on a control-group mean of BDT 5,715 (Table 4); the dollar figures are approximate conversions at about BDT 86 to the dollar, the rate in November–December 2021, when the follow-up survey ran.');
    await expect(page.locator('#results')).not.toContainText('BIGD22');
  });
});
