import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP68 behaviors (Sonnet Low run 1 review of the Claude-ladder pages, reworked as RW1 and RW2). Retrospective coverage (the owner exempted this project from test-first work);
 * each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp68.spec.ts --project=chromium`):
 *   - RW1: the Universities band that shows National University's size and onboarding keeps its heading "The National University Partnership" and takes the page-level eyebrow
 *     "Our Partnerships" (the eyebrow was the misleading label, "Evidence for This Offer"); its anchor (#offer-evidence) is unchanged, and other pages keep the default eyebrow;
 *   - item 2: the grant-funded week figures are labelled as target timing: the shared NextStepsBand lead (Development Partners), the partner hub lead, Foundations' lead, Home's eyebrow,
 *     the Contact timing line, the C14 reminder and both "How Fast Can We Start?" timing answers (Q7 and Q7-model, RW2); the four step headings keep their week numbers;
 *   - RW2: no built page still carries the untargeted grant-pilot timing wording.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
// WP132: step 1 is "Discovery Session" (PD-04 keeps "Discovery")
const STEP_HEADINGS = [/^Discovery Session$/, /^Co-Design$/, /^Agreement$/, /^Training Starts 6–8 Weeks After Signing$/];
const OLD_TIMING_PHRASES = ['For grant-funded pilots, agreement typically takes', 'For grant-funded pilots, allow about three weeks', 'we plan for the first cohort to begin training'];

async function stepHeadings(page: Page, selector: string) {
  // Each step heading is prefixed "Step N: " (tests/wp32.spec.ts strips the same prefix).
  return (await page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()))).map((t) => t.replace(/^Step \d: /, ''));
}

/** The "How Fast Can We Start?" answer as rendered on the page. */
function fastAnswer(page: Page) {
  return page.locator('#faq details', { has: page.locator('summary', { hasText: 'How Fast Can We Start?' }) }).locator('.faq__a').first();
}

test.describe('WP68 RW1: the Universities band keeps its heading and takes a page-level eyebrow', () => {
  test('the band reads "Our Partnerships" over "The National University Partnership", keeps its anchor and its clarifying sentence and its three figures', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'partner-with-us/universities/');
    const band = page.locator('#offer-evidence');
    await expect(band).toHaveCount(1);
    await expect(band.locator('.eyebrow').first()).toHaveText('Our Partnerships');
    await expect(band.locator('h2')).toHaveText('The National University Partnership');
    expect(compact(await band.locator('.sh__lead').textContent())).toContain('The first two cards describe the learners being onboarded and National University’s size, not learners trained by CodersTrust.'); // WP132: the lead names the first two cards in their order (was "...; they are not learners trained by CodersTrust")
    await expect(band.locator('.pe__item')).toHaveCount(3);
  });

  test('the Universities band no longer carries the "Evidence for This Offer" eyebrow', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#offer-evidence .eyebrow', { hasText: 'Evidence for This Offer' })).toHaveCount(0);
  });

  test('JobReady@Campus keeps its own eyebrow, "Delivery Context: National University", on its evidence band', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    await expect(page.locator('#offer-evidence .eyebrow').first()).toHaveText('Delivery Context: National University');
  });
});

test.describe('WP68 item 2 and RW2: the grant-funded week figures are target timing', () => {
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

  test('Our Model and YouthWIDE: "How Fast Can We Start?" (Q7-model) opens with the target qualifier and keeps its 3-week and 6–8 week figures', async ({ page }) => {
    for (const route of ['our-model/', 'programs/youthwide/']) {
      await open(page, route);
      const answer = compact(await fastAnswer(page).textContent());
      expect(answer, route).toBe('Target timing for grant-funded pilots: training starts 6–8 weeks after signing. Public procurement follows the agency’s own timeline.');
    }
  });
});

test.describe('RW2: no built page keeps the untargeted grant-pilot timing wording', () => {
  test('every built page is free of the old "we plan for" reminder and the old Q7 openers', async () => {
    const pages = listPages().filter((p) => !p.route.startsWith('/news/'));
    expect(pages.length).toBeGreaterThan(40);
    expect(pages.map((p) => p.route)).toContain('/contact/');
    expect(pages.map((p) => p.route)).toContain('/our-model/');
    const offenders = pages.flatMap((p) => {
      const html = readFileSync(p.file, 'utf8');
      return OLD_TIMING_PHRASES.filter((phrase) => html.includes(phrase)).map((phrase) => `${p.route}: ${phrase}`);
    });
    expect(offenders).toEqual([]);
  });
});
