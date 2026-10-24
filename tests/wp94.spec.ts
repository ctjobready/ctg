import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { CONTRACT_TOTAL_NOTE, CONTRACT_TOTAL_NOTE_INVESTORS, HER_POWER_RECORDS } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP94 behaviors (Perplexity cycle 43, triage A1 to A6 in review-tools/c43-triage.md). Retrospective coverage: the owner exempted this project from
 * test-first work, so these tests were written after the change. Run `npm run build` first, then `PORT=4575 npx playwright test tests/wp94.spec.ts --project=chromium`.
 *   - A1: the partner hub's closing band carries Home's two route lines (Governments, Impact investors) after "Read the Evidence" and before the email fallback;
 *   - A2: Home's Her Power card opens with the register's figure line ("Program records: 372 of the 800 ...") and keeps its delivery sentence;
 *   - A3: the hub's "Monthly Reports and Follow-Up Surveys" card reads "Included", not "Planned";
 *   - A4: Investors' contract-scope note points back to its reconciliation ("already counted in the 150,000+ enrollments above"); Impact keeps the full overlap sentence;
 *   - A5: Governments' "Launch in Existing Labs" step says the first cohort begins training and monthly reports follow;
 *   - A6: SC-02's detail ends "Counted once, the total is 150,678 enrollments." and the arithmetic still closes.
 * Screenshots (1280 and 390): set WP94_SHOTS to a directory and run the "WP94 screenshots" test.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

test.describe('WP94 A1: partner hub closing band carries the two route lines', () => {
  test('the band has one primary button, Read the Evidence, then Governments and Impact investors route links, then the email fallback', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const band = page.locator('#cta');
    await expect(band.locator('.cta-band__actions a.btn, .cta-band__actions button').first()).toHaveCount(1);
    const routes = band.locator('.cta-band__routes a.link');
    await expect(routes).toHaveCount(2);
    await expect(band.getByRole('link', { name: 'Request a Briefing for Your Ministry' })).toHaveAttribute('href', /^mailto:/);
    await expect(band.getByRole('link', { name: 'Request an Introduction Call' })).toHaveAttribute('href', /^mailto:/);
    const text = compact(await band.textContent());
    const evidence = text.indexOf('Read the Evidence');
    const governments = text.indexOf('Governments: Request a Briefing for Your Ministry');
    const investors = text.indexOf('Impact investors: Request an Introduction Call');
    const fallback = text.indexOf('If your email app does not open');
    expect(evidence).toBeGreaterThanOrEqual(0);
    expect(evidence).toBeLessThan(governments);
    expect(governments).toBeLessThan(investors);
    expect(investors).toBeLessThan(fallback);
  });
});

test.describe('WP94 A2: Her Power card on Home states its figure', () => {
  test('the card line reads the register figures and keeps the delivery sentence', async ({ page }) => {
    await open(page, '');
    const line = 'Program records: 372 of the 800 tracked women were in work (47%), among the 2,400 CodersTrust trained directly. Curriculum, trainer training and direct delivery for women’s digital skills.';
    expect(HER_POWER_RECORDS.text).toBe(line.replace(' Curriculum, trainer training and direct delivery for women’s digital skills.', ''));
    await expect(page.locator('#cases .case__context', { hasText: 'Program records: 372 of the 800' })).toHaveText(line);
  });

  test('the figures come from PR-05 and GV-11', () => {
    expect(fact('PR-05').stat?.value).toBe('372 of 800');
    expect(fact('PR-05').stat?.label).toContain('from the 2,400 trained directly by CodersTrust, in work: 47%');
    expect(fact('GV-11').text).toContain('2,400 women trained directly');
    expect(HER_POWER_RECORDS.facts).toEqual(['PR-05', 'GV-11']);
  });
});

test.describe('WP94 A3: due-diligence card reads Included', () => {
  test('the Monthly Reports card opens "Included for every cohort" and "Planned" is gone', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('Included for every cohort, as agreed in the program scope: follow-up surveys at 3, 6 and 12 months and monthly reports.');
    expect(text).not.toContain('Planned for every cohort');
  });
});

test.describe('WP94 A4: Investors points back to its reconciliation; Impact keeps the full overlap', () => {
  const POINTER = 'Her Power’s 25,125 are already counted in the 150,000+ enrollments above, not additional people.';
  const FULL = 'Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.';

  test('the copy builders give Investors the pointer and keep the full note elsewhere', () => {
    expect(CONTRACT_TOTAL_NOTE_INVESTORS.text.endsWith(POINTER)).toBe(true);
    expect(CONTRACT_TOTAL_NOTE.text.endsWith(FULL)).toBe(true);
    expect(CONTRACT_TOTAL_NOTE_INVESTORS.text.startsWith(CONTRACT_TOTAL_NOTE.text.slice(0, CONTRACT_TOTAL_NOTE.text.length - FULL.length - 1))).toBe(true);
    expect(CONTRACT_TOTAL_NOTE_INVESTORS.facts).toEqual(CONTRACT_TOTAL_NOTE.facts);
  });

  test('the Investors contract note prints the pointer and Impact prints the full sentence', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#reach .ir__note')).toHaveText(CONTRACT_TOTAL_NOTE_INVESTORS.text);
    await open(page, 'impact/');
    await expect(page.locator('#glance [data-fact~="GV-12"] .glance__note, #glance [data-fact~="GV-12"]').first()).toContainText(FULL);
  });
});

test.describe('WP94 A5: Governments Launch in Existing Labs step', () => {
  test('the step body says the first cohort begins training and monthly reports follow, then the caveat', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('Launch in Existing Labs');
    expect(text).toContain('The first cohort begins training; monthly reports follow. Seats are confirmed per program.');
  });
});

test.describe('WP94 A6: SC-02 detail ends with the enrollments noun', () => {
  test('the detail reads "Counted once, the total is 150,678 enrollments." and the arithmetic closes', () => {
    expect(fact('SC-02').stat?.detail).toBe(
      'Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments.',
    );
    expect(112926 + 40152 - 2400).toBe(150678);
    expect(25125 + 15027).toBe(40152);
  });

  test('the Investors reconciliation paragraph prints the new detail', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const note = compact(await page.locator('#guide .ig__notes').textContent());
    expect(note).toContain('Counted once, the total is 150,678 enrollments.');
  });
});

const SHOTS = process.env.WP94_SHOTS;
const shotPages: Array<[string, string]> = [
  ['home', ''],
  ['partner-hub', 'partner-with-us/'],
  ['investors', 'partner-with-us/investors/'],
  ['governments', 'partner-with-us/governments/'],
  ['impact', 'impact/'],
];

async function scrollThrough(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Element crops of the changed regions (WP94_SHOTS): the closing band, the Her Power card, the due-diligence card, the Investors reach band and the Governments step. */
const regionShots: Array<[string, string, (page: Page) => ReturnType<Page['locator']>]> = [
  ['hub-closing-band', 'partner-with-us/', (page) => page.locator('#cta')],
  ['home-proof-band', '', (page) => page.locator('#cases')],
  ['home-her-power-card', '', (page) => page.locator('#cases article').nth(2)],
  ['hub-monthly-reports-card', 'partner-with-us/', (page) => page.getByRole('heading', { name: 'Monthly Reports and Follow-Up Surveys' }).locator('..')],
  ['investors-reach-band', 'partner-with-us/investors/', (page) => page.locator('#reach')],
  ['governments-existing-labs-step', 'partner-with-us/governments/', (page) => page.getByRole('heading', { name: 'Launch in Existing Labs' }).locator('..')],
];

test.describe('WP94 region crops', () => {
  test.skip(!SHOTS, 'set WP94_SHOTS to a directory to capture');
  for (const [name, route, locate] of regionShots) {
    for (const [label, vp] of [['1280', DESKTOP], ['390', MOBILE]] as const) {
      test(`${name} at ${label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await open(page, route);
        await scrollThrough(page);
        const el = locate(page).first();
        await el.scrollIntoViewIfNeeded();
        // let the count-up figures finish before the crop (WP94 shots only)
        await page.waitForTimeout(1500);
        await el.screenshot({ path: `${SHOTS}/region-${name}-${label}.png` });
      });
    }
  }
});

test.describe('WP94 screenshots', () => {
  test.skip(!SHOTS, 'set WP94_SHOTS to a directory to capture');
  for (const [name, route] of shotPages) {
    for (const [label, vp] of [['1280', DESKTOP], ['390', MOBILE]] as const) {
      test(`${name} at ${label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await open(page, route);
        await scrollThrough(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `horizontal overflow at ${label}`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `${SHOTS}/${name}-${label}.png`, fullPage: true });
      });
    }
  }
});
