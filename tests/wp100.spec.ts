import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { faqs, faqsFor } from '../src/data/faqs';
import { DESKTOP, open } from './support/browser';
import { DIST_DIR } from './support/env';
import { inventory } from './support/pages';

/**
 * WP100 behaviors (owner decision 2026-10-28: the grant deck dropped the pre-signature timing, so the site drops it too). Each test states one observable behavior of the
 * built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp100.spec.ts --project=chromium`):
 *   - the grant-funded steps read Discovery, Co-Design, Agreement and then "Training Starts 6–8 Weeks After Signing", with no week numbers before signing;
 *   - PD-04 and the two "How Fast Can We Start?" timing answers (Q7 and Q7-model) keep only the timing after signing (6–8 weeks) and the procurement sentence;
 *   - no built page, and no llms.txt, still states how long the steps before signing take ("Week 1" to "Week 3", "three weeks", "from first conversation to agreement").
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

// WP132: the first step heading is "Discovery Session" (grantStartTitles); PD-04 keeps "Discovery"
const STEP_TITLES = ['Discovery Session', 'Co-Design', 'Agreement', 'Training Starts 6–8 Weeks After Signing'];

/** Pre-signature timing, in any wording the site used for it. Week numbers are matched only as "Week 1" to "Week 3" (not "Week 2025"). */
const PRE_SIGNATURE_TIMING = [/\bWeek [1-3]\b/, /three weeks/i, /Counting from the first conversation/, /agreement typically/i, /from (the )?first conversation to agreement/i, /weeks from (the )?first conversation/i, /Discovery \(Week/];

const TARGET_PD04 = 'For grant-funded pilots: Discovery → Co-Design → Agreement; training starts 6–8 weeks after signing. Public procurement follows the agency’s own timeline';
const TARGET_Q7 = 'Target timing for grant-funded pilots: the first cohort is typically in training 6–8 weeks after signing. Public procurement follows the agency’s own timeline.';
const TARGET_Q7_MODEL = 'Target timing for grant-funded pilots: training starts 6–8 weeks after signing. Public procurement follows the agency’s own timeline.';

async function stepTitles(page: Page, selector: string) {
  // Each step heading may carry a "Step N: " prefix (tests/wp32.spec.ts strips the same prefix).
  return (await page.locator(selector).allTextContents()).map((t) => compact(t).replace(/^Step \d: /, ''));
}

test.describe('WP100: the register and the FAQ state no timing before signing', () => {
  test('PD-04 reads "Discovery → Co-Design → Agreement; training starts 6–8 weeks after signing", and its stat is unchanged', () => {
    expect(fact('PD-04').text).toBe(TARGET_PD04);
    expect(fact('PD-04').stat?.value).toBe('6–8 weeks');
  });

  test('the shared Q7 answer keeps the 6–8 weeks after signing and drops the week count', () => {
    expect(faqs.find((f) => f.id === 'Q7')!.a).toBe(TARGET_Q7);
  });

  test('the Q7-model answer (Our Model, YouthWIDE) keeps the 6–8 weeks after signing and drops the three-weeks clause', () => {
    expect(faqsFor('variants').find((f) => f.id === 'Q7-model')!.a).toBe(TARGET_Q7_MODEL);
  });

  test('the Q7-model answer, as Our Model renders it, is the same sentence and tied to PD-04', async ({ page }) => {
    await open(page, 'our-model/');
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: 'How Fast Can We Start?' }) });
    await expect(item).toHaveCount(1);
    expect(compact(await item.locator('.faq__a').textContent())).toBe(TARGET_Q7_MODEL);
    expect(await item.locator('.faq__a p').getAttribute('data-fact')).toBe('PD-04');
  });
});

test.describe('WP100: the grant-funded steps have no week numbers', () => {
  // Home, the partner hub, Development Partners and Foundations show the same four steps.
  const SEQUENCES: { page: string; steps: string }[] = [
    { page: '', steps: '#next-steps ol h3' },
    { page: 'partner-with-us/', steps: '#how-partnering-works ol h3' },
    { page: 'partner-with-us/development-partners/', steps: '#next-steps ol h3' },
    { page: 'partner-with-us/foundations/', steps: '#next-steps ol h3' },
  ];
  for (const s of SEQUENCES) {
    test(`${s.page || 'Home'}: the grant-funded steps read Discovery Session, Co-Design, Agreement, Training Starts 6–8 Weeks After Signing`, async ({ page }) => {
      await open(page, s.page);
      expect(await stepTitles(page, s.steps)).toEqual(STEP_TITLES);
    });
  }

  test('the training step keeps "monthly reports follow" and its description', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    expect(compact(await page.locator('#next-steps ol').textContent())).toContain('The first cohort begins training; monthly reports follow.');
  });

  test('the sequence renders at desktop width without the week numbers in the page text', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'partner-with-us/development-partners/');
    const text = compact(await page.locator('main').textContent());
    expect(text).not.toMatch(/Week [1-3]\b/);
    expect(text).toContain('Discovery');
    expect(text).toContain('Agreement');
  });
});

test.describe('WP100: no built page or llms.txt states pre-signature timing', () => {
  test('no built HTML page carries "Week 1" to "Week 3", "three weeks", or a first-conversation-to-agreement count', () => {
    const offenders: string[] = [];
    for (const p of inventory().pages) {
      const html = readFileSync(p.file, 'utf8');
      for (const re of PRE_SIGNATURE_TIMING) {
        const m = re.exec(html);
        if (m) offenders.push(`${p.route}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('llms.txt carries no pre-signature timing', () => {
    const text = readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8');
    for (const re of PRE_SIGNATURE_TIMING) expect(text, re.source).not.toMatch(re);
  });

  test('the "How Fast Can We Start?" FAQ JSON-LD on YouthWIDE (the Q7-model page with FAQPage markup) carries only the post-signature timing', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    // Parsed, so the JSON escaping of quotes and dashes does not hide the sentence.
    const blobs = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((b) => JSON.stringify(JSON.parse(b)));
    expect(blobs.join('\n')).toContain(TARGET_Q7_MODEL);
    for (const re of PRE_SIGNATURE_TIMING) expect(blobs.join('\n'), re.source).not.toMatch(re);
  });
});
