import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, open } from './support/browser';

/**
 * WP68 behaviors (Sonnet Low run 1 review of the Claude-ladder pages). Retrospective coverage (the owner exempted this project from test-first work);
 * each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp68.spec.ts --project=chromium`):
 *   - item 1: the Universities band that shows National University's size and onboarding is headed "Our University Partnerships" (it was "The National University Partnership"); its eyebrow and anchor (#offer-evidence) are unchanged;
 *   - item 2: the grant-funded week figures are labelled as target timing once, in each band's lead (or, where a band has no lead, in its label): the shared NextStepsBand lead (Development Partners), the partner hub lead, Foundations' lead, Home's eyebrow and the Contact timing line;
 *   - item 2: the four step headings keep their week numbers ("Discovery (Week 1)" to "Training Starts 6–8 Weeks After Signing"), and no individual step heading says "Target".
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const STEP_HEADINGS = [/^Discovery \(Week 1\)$/, /^Co-Design \(Week 2\)$/, /^Agreement \(Week 3\)$/, /^Training Starts 6–8 Weeks After Signing$/];

async function stepHeadings(page: Page, selector: string) {
  // Each step heading is prefixed "Step N: " (tests/wp32.spec.ts strips the same prefix).
  return (await page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()))).map((t) => t.replace(/^Step \d: /, ''));
}

test.describe('WP68 item 1: the Universities band is headed for what it shows', () => {
  test('the band heading is "Our University Partnerships", keeps its eyebrow and anchor, and still states that the figures are not CodersTrust learners', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'partner-with-us/universities/');
    const band = page.locator('#offer-evidence');
    await expect(band).toHaveCount(1);
    await expect(band.locator('h2')).toHaveText('Our University Partnerships');
    await expect(band.locator('.eyebrow').first()).toHaveText('Evidence for This Offer');
    expect(compact(await band.locator('.sh__lead').textContent())).toContain('they are not learners trained by CodersTrust');
    await expect(band.locator('.pe__item')).toHaveCount(3);
  });

  test('no element on the Universities page is headed "The National University Partnership" in the band', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#offer-evidence h2', { hasText: 'The National University Partnership' })).toHaveCount(0);
  });
});

test.describe('WP68 item 2: the grant-funded week figures are target timing', () => {
  test('Development Partners: the shared next-steps lead says "Target timing for grant-funded pilots." and the four week headings are unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const band = page.locator('#next-steps');
    expect(compact(await band.locator('.lead').textContent())).toContain('Target timing for grant-funded pilots. Public procurement follows the agency’s own timeline.');
    const headings = await stepHeadings(page, '#next-steps ol h3');
    expect(headings).toHaveLength(4);
    headings.forEach((h, i) => expect(h).toMatch(STEP_HEADINGS[i]));
  });

  test('the partner hub lead says "Target timing for grant-funded pilots;" and the four week headings are unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/');
    expect(compact(await page.locator('#how-partnering-works .sh__lead').textContent())).toBe('Target timing for grant-funded pilots; public procurement follows the agency’s own timeline.');
    const headings = await stepHeadings(page, '#how-partnering-works ol h3');
    expect(headings).toHaveLength(4);
    headings.forEach((h, i) => expect(h).toMatch(STEP_HEADINGS[i]));
  });

  test('Foundations: the cohort-grant lead says the steps show target timing for grant-funded pilots, and the week headings are unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const lead = compact(await page.locator('#next-steps .lead').textContent());
    expect(lead).toContain('For cohort grants, the steps below show target timing for grant-funded pilots.');
    const headings = await stepHeadings(page, '#next-steps ol h3');
    expect(headings).toHaveLength(4);
    headings.forEach((h, i) => expect(h).toMatch(STEP_HEADINGS[i]));
  });

  test('Home: the steps eyebrow reads "Target Timing for Grant-Funded Pilots" and the four week headings are unchanged', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#next-steps .eyebrow').first()).toHaveText('Target Timing for Grant-Funded Pilots');
    const headings = await stepHeadings(page, '#next-steps ol h3');
    expect(headings).toHaveLength(4);
    headings.forEach((h, i) => expect(h).toMatch(STEP_HEADINGS[i]));
  });

  test('Contact: the first-cohort timing line says "Target timing for grant-funded pilots" and keeps the 6–8 week figure', async ({ page }) => {
    await open(page, 'contact/');
    const line = page.locator('ul.ct-c14 li').first();
    expect(compact(await line.textContent())).toBe('Target timing for grant-funded pilots: the first cohort begins training 6–8 weeks after signing, and monthly reports follow from the first cohort.');
  });
});
