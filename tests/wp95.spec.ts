import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { CONTRACT_FIGURES } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP95 behaviors (Perplexity cycle 44, triage A1 to A5 in review-tools/c44-triage.md). Retrospective coverage: the owner exempted this project from
 * test-first work, so these tests were written after the change. Run `npm run build` first, then `PORT=4576 npx playwright test tests/wp95.spec.ts --project=chromium`.
 *   - A1: Governments' national-scale answer says CodersTrust trained 2,400 women directly, the figure read from the register (CONTRACT_FIGURES, GV-11);
 *   - A2: the Programs hub's hero carries a second text link to JobReady.global for learners who want short courses, under the NU diploma link;
 *   - A3: Development Partners, Governments and Foundations put one sentence under "See the Evidence Behind the Results", before the two links;
 *   - A5: Contact's "A Conversation" step reads "We talk through your goals and timeline."
 *   - A4 is NOT implemented: the triage wording makes the Global Reach meta 184 characters, over the 155 limit enforced by desc() (src/components/pages/impact/page-utils.ts), so the build fails; reported to the primary.
 * Screenshots (1280 and 390): set WP95_SHOTS to a directory and run the "WP95 screenshots" tests.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

test.describe('WP95 A1: Governments national-scale answer names CodersTrust’s direct training', () => {
  const Q = 'Can You Deliver at National Scale?';
  const ANSWER =
    'We scale in phases. Her Power, a national program, met its full target with CodersTrust’s curriculum, and CodersTrust trained 2,400 women directly; the contract table above gives the figures. A 100,000+ program is a design option we have not yet delivered.';

  test('the 2,400 is the register’s figure (GV-11, GV-13) and is read through CONTRACT_FIGURES', () => {
    expect(CONTRACT_FIGURES.direct).toBe('2,400');
    expect(fact('GV-11').text).toContain(`${CONTRACT_FIGURES.direct} women trained directly`);
    expect(fact('GV-13').stat?.value).toBe(CONTRACT_FIGURES.direct);
  });

  test('the FAQ answer on Governments reads the new sentence', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const item = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: Q }) }).first();
    expect(compact(await item.textContent())).toContain(ANSWER);
  });
});

test.describe('WP95 A2: Programs hub links learners to JobReady.global for short courses', () => {
  test('the hero keeps one primary button and carries two text links under it: the diploma, then JobReady.global', async ({ page }) => {
    await open(page, 'programs/');
    const hero = page.locator('main .hero');
    await expect(hero.locator('.btn--primary')).toHaveCount(1);
    const lines = hero.locator('.hub__nu');
    await expect(lines).toHaveCount(2);
    const course = lines.nth(1);
    await expect(course).toContainText('Looking for a short self-paced course?');
    const link = course.getByRole('link', { name: /Explore Courses at JobReady\.global/ });
    await expect(link).toHaveAttribute('href', 'https://jobready.global/');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link.locator('.sr-only')).toHaveText('(opens JobReady.global)');
    const order = compact(await hero.textContent());
    expect(order.indexOf('See the diploma.')).toBeLessThan(order.indexOf('Explore Courses at JobReady.global'));
  });
});

test.describe('WP95 A3: evidence band has one sentence between the heading and the two links', () => {
  const SENTENCE = 'The trial evaluated a predecessor program; the survey describes what completers who responded report about work and income.';
  for (const slug of ['governments', 'development-partners', 'foundations']) {
    test(`${slug}: the sentence sits under the H2 and above the links; heading and link labels are unchanged`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await open(page, `partner-with-us/${slug}/`);
      const band = page.locator('#proof-band');
      await expect(band.locator('h2')).toHaveText('See the Evidence Behind the Results');
      expect(compact(await band.textContent())).toContain(SENTENCE);
      expect((await band.locator('a').allTextContents()).map(compact)).toEqual(['Read the Trial Results', 'Impact Survey 2026']);
      const sentence = band.getByText(SENTENCE, { exact: true });
      const first = band.getByRole('link', { name: 'Read the Trial Results' });
      const a = await sentence.boundingBox();
      const b = await first.boundingBox();
      expect(a && b && a.y + a.height <= b.y).toBe(true);
    });
  }
});

test.describe('WP95 A5: Contact step 2 names the goals and the timeline only', () => {
  test('"A Conversation" reads "We talk through your goals and timeline." and the phrase "priority groups" is gone from that step', async ({ page }) => {
    await open(page, 'contact/');
    const step = page.locator('#next .steps__item').nth(1);
    expect(compact(await step.textContent())).toContain('A Conversation');
    expect(compact(await step.textContent())).toContain('We talk through your goals and timeline.');
    expect(compact(await step.textContent())).not.toContain('priority groups');
  });
});

test.describe('WP95 layout: no horizontal overflow at 390 on the changed pages', () => {
  const routes = ['programs/', 'partner-with-us/governments/', 'partner-with-us/development-partners/', 'partner-with-us/foundations/', 'impact/global-reach/', 'contact/'];
  for (const route of routes) {
    test(`${route} has no horizontal page scroll at 390`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await open(page, route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

const SHOTS = process.env.WP95_SHOTS;

async function scrollThrough(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

const regionShots: Array<[string, string, (page: Page) => ReturnType<Page['locator']>]> = [
  ['programs-hero', 'programs/', (page) => page.locator('main .hero')],
  ['governments-proof-band', 'partner-with-us/governments/', (page) => page.locator('#proof-band')],
  ['development-partners-proof-band', 'partner-with-us/development-partners/', (page) => page.locator('#proof-band')],
  ['foundations-proof-band', 'partner-with-us/foundations/', (page) => page.locator('#proof-band')],
  ['governments-national-scale-faq', 'partner-with-us/governments/', (page) => page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) }).first()],
  ['contact-next-steps', 'contact/', (page) => page.locator('#next')],
];

test.describe('WP95 region crops', () => {
  test.skip(!SHOTS, 'set WP95_SHOTS to a directory to capture');
  for (const [name, route, locate] of regionShots) {
    for (const [label, vp] of [['1280', DESKTOP], ['390', MOBILE]] as const) {
      test(`${name} at ${label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await open(page, route);
        await scrollThrough(page);
        const el = locate(page).first();
        await el.scrollIntoViewIfNeeded();
        if (name.endsWith('-faq')) await el.locator('summary').click(); // open the FAQ item so its answer is in the crop
        await page.waitForTimeout(1500);
        await el.screenshot({ path: `${SHOTS}/region-${name}-${label}.png` });
      });
    }
  }
});
