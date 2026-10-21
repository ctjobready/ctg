import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { faqs } from '../src/data/faqs';
import { fact } from '../src/data/facts';
import { PROGRAM_OPTIONS } from '../src/data/copy';
import { parseProgramOptions } from '../src/components/sections/copyText';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';

/**
 * WP69 behaviors (owner items, Claude-ladder fixes, 2026-10-21). The owner exempted this project from test-first work, so these
 * are regression tests written after the change; each states one observable behavior of the built site or of the shared data:
 *   - 1: the Employers FAQ question is "Will This Work for Our Roles?" (page, FAQ markup and the shared bank entry); its answer is unchanged;
 *     every other audience keeps "Will This Work in Our Country?";
 *   - 2: the Governments contracts table row for the Digital Lab Establishment Project, Phase II names the ICT Division, and GV-05 says so in the register;
 *   - 3: Option 3 is "National Design Option" everywhere the pilot options print (Home, Development Partners, Governments, Foundations, YouthWIDE),
 *     from one shared source (PD-05 and PROGRAM_OPTIONS), and the "(a design option — not yet delivered at this size)" qualifier stays.
 *
 * Run after `npm run build`: `PORT=<port> npx playwright test tests/wp69.spec.ts --project=chromium`.
 * Set WP69_SHOTS_DIR to an absolute directory to also write the changed regions at 1280 and 390 (opt-in, not part of the gate).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

const EMPLOYERS = 'partner-with-us/employers/';
const DEV_PARTNERS = 'partner-with-us/development-partners/';
const GOVERNMENTS = 'partner-with-us/governments/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const YOUTHWIDE = 'programs/youthwide/';
const HOME = '';

const EMPLOYER_QUESTION = 'Will This Work for Our Roles?';
const COUNTRY_QUESTION = 'Will This Work in Our Country?';
const EMPLOYER_ANSWER = 'We start with a needs assessment of your roles, tasks and required tools. For hiring, talent requests are scoped against the experience and credentials available in the candidate pool.';
const OPTION_NAME = 'National Design Option';
const QUALIFIER = '(a design option — not yet delivered at this size)';

/** Every Question in the page's JSON-LD (walks the whole structure, so FAQPage and any nested mainEntity are read). */
function questionsIn(node: unknown, out: { name: string; text: string }[] = []): { name: string; text: string }[] {
  if (Array.isArray(node)) {
    for (const n of node) questionsIn(n, out);
  } else if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    if (o['@type'] === 'Question') {
      const answer = o.acceptedAnswer as { text?: string } | undefined;
      out.push({ name: String(o.name ?? ''), text: String(answer?.text ?? '') });
    }
    for (const v of Object.values(o)) questionsIn(v, out);
  }
  return out;
}
async function faqJsonLd(page: Page): Promise<{ name: string; text: string }[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((b) => questionsIn(JSON.parse(b)));
}

test.describe('Item 1: the Employers FAQ question is "Will This Work for Our Roles?"', () => {
  test('the shared bank entry and its employer variant carry the new question; the shared Q1 keeps the country question', () => {
    const bank = faqs.find((f) => f.id === 'Q1');
    const employer = faqs.find((f) => f.id === 'Q1-employer');
    expect(bank?.q).toBe(COUNTRY_QUESTION);
    expect(employer?.q).toBe(EMPLOYER_QUESTION);
    expect(employer?.a).toBe(EMPLOYER_ANSWER);
    expect(employer?.audiences).toEqual(['variants']);
  });

  test('the Employers page prints the new question, its unchanged answer and the same pair in its FAQ markup; the country question is gone from that page', async ({ page }) => {
    await open(page, EMPLOYERS);
    const item = page.locator('#faq details', { hasText: EMPLOYER_QUESTION });
    await expect(item).toHaveCount(1);
    await expect(page.locator('#faq summary', { hasText: COUNTRY_QUESTION })).toHaveCount(0);
    expect(compact(await item.locator('.faq__a').textContent())).toBe(EMPLOYER_ANSWER);
    const jsonLd = await faqJsonLd(page);
    expect(jsonLd.find((q) => q.name === EMPLOYER_QUESTION)?.text).toBe(EMPLOYER_ANSWER);
    expect(jsonLd.some((q) => q.name === COUNTRY_QUESTION)).toBe(false);
  });

  test('the other audiences keep "Will This Work in Our Country?" (Development Partners, Governments)', async ({ page }) => {
    for (const route of [DEV_PARTNERS, GOVERNMENTS]) {
      await open(page, route);
      await expect(page.locator('#faq details, #faqs details', { hasText: COUNTRY_QUESTION }).first(), route).toHaveCount(1);
      await expect(page.locator('#faq summary, #faqs summary', { hasText: EMPLOYER_QUESTION }), route).toHaveCount(0);
    }
  });
});

test.describe('Item 2: the Digital Lab Establishment Project, Phase II row names the ICT Division', () => {
  test('GV-05 in the register says the contract was with the ICT Division, and keeps its 3,120+ staff figure', () => {
    expect(fact('GV-05').text).toBe('Digital Lab Establishment Project (Phase II), ICT Division: LMS and operation training for 3,120+ staff');
  });

  test('the contracts table row names the ICT Division, shows the 3,120+ staff figure from GV-05, and keeps its scope', async ({ page }) => {
    await open(page, GOVERNMENTS);
    const row = page.locator('table tbody tr', { has: page.locator('th', { hasText: 'Digital Lab Establishment Project' }) });
    await expect(row).toHaveCount(1);
    await expect(row.locator('th')).toHaveText('Digital Lab Establishment Project, Phase II (ICT Division)');
    await expect(row).toHaveAttribute('data-fact', 'GV-05');
    await expect(row.locator('td').nth(0)).toHaveText('Training for staff on the learning platform and lab operations');
    expect(compact(await row.locator('td').nth(1).textContent())).toBe('Contract scope: 3,120+ staff');
  });
});

test.describe('Item 3: Option 3 is "National Design Option" at the shared source and on every page that prints the options', () => {
  test('the shared data (PROGRAM_OPTIONS and PD-05) names the option "National Design Option" and keeps the qualifier', () => {
    expect(PROGRAM_OPTIONS[2].name).toBe(OPTION_NAME);
    const parsed = parseProgramOptions(fact('PD-05').text);
    expect(parsed[2]).toEqual({ name: OPTION_NAME, volume: '100,000+ trainees', duration: `3–5 years ${QUALIFIER}` });
    expect(fact('PD-05').text).toContain(QUALIFIER);
    expect(parsed.map((o) => o.name)).toEqual(['Multi-Cohort Pilot Program', 'Scale', OPTION_NAME]);
  });

  for (const [label, route] of [
    ['Home', HOME],
    ['Development Partners', DEV_PARTNERS],
    ['Governments', GOVERNMENTS],
    ['Foundations', FOUNDATIONS],
    ['YouthWIDE', YOUTHWIDE],
  ] as const) {
    test(`${label} names Option 3 "National Design Option" and no bare "National" option heading`, async ({ page }) => {
      await open(page, route);
      await expect(page.getByRole('heading', { name: OPTION_NAME, exact: true }).first(), label).toBeVisible();
      await expect(page.getByRole('heading', { name: 'National', exact: true }), label).toHaveCount(0);
    });
  }

  test('Home drops the separate "Design Option" badge, since the name carries it; the card keeps its size and note', async ({ page }) => {
    await open(page, HOME);
    const card = page.locator('#offer li.offer__card', { has: page.getByRole('heading', { name: OPTION_NAME, exact: true }) });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.offer__badge')).toHaveCount(0);
    expect(compact(await card.textContent())).toContain('100,000+ trainees');
    expect(compact(await card.textContent())).toContain('A design option we plan phase by phase; not yet delivered at this size.');
  });
});

test.describe('Changed regions (opt-in screenshots, WP69_SHOTS_DIR)', () => {
  const dir = process.env.WP69_SHOTS_DIR;
  test.skip(!dir, 'set WP69_SHOTS_DIR to write screenshots');

  const shots: [string, string, string][] = [
    ['home-offer', HOME, '#offer'],
    ['governments-contracts', GOVERNMENTS, '#contracts'],
    ['employers-faq', EMPLOYERS, '#faq'],
    ['governments-options', GOVERNMENTS, '#offer'],
  ];
  for (const vp of [DESKTOP, MOBILE]) {
    for (const [name, route, selector] of shots) {
      test(`${name} at ${vp.width}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await open(page, route);
        await scrollThrough(page);
        const region = page.locator(selector).first();
        await region.scrollIntoViewIfNeeded();
        mkdirSync(dir!, { recursive: true });
        await region.screenshot({ path: join(dir!, `${name}-${vp.width}.png`) });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
      });
    }
  }
});
