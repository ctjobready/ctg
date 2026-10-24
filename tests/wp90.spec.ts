import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP90 behaviors (Perplexity cycle 39, Minor and Polish triage A1 to A6 and owner items 2 to 4). Retrospective coverage: the owner exempted this project from
 * test-first work, so these tests were written after the change. Run `npm run build` first, then `PORT=4571 npx playwright test tests/wp90.spec.ts --project=chromium`.
 *   - A1: SC-02's detail is shortened; the figures (112,926, 40,152, the 2,400 overlap and 150,678) are unchanged; SC-02's text (the register's full wording) is unchanged;
 *   - A2: the Foundations "Accountability" callout is removed; the "A Pilot Scorecard Agreed with You" card stays;
 *   - A3: the 23,000+ tile leads the JobReady@Work band, above the credential bullets;
 *   - A4: SuperKids "Who It Is For" no longer repeats the discovery-session clause;
 *   - A5 and item 2: the program cards for SuperKids and the NU Postgraduate Diploma carry an in-card link;
 *   - A6: the Universities third card reads "Placement Evidence You Can Report" (the program page's wording);
 *   - item 3: the Investors H2 is "Contracts and Recognition" and the NU sentence says the learners are being onboarded (SC-04 keeps "onboarding pipeline" for the other pages);
 *   - item 4: the comparison row reads "Included for every cohort".
 * Screenshots (1280 and 390): set WP90_SHOTS to a directory and run the "WP90 screenshots" test.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

test.describe('WP90 A1: SC-02 detail is shortened, the figures are unchanged', () => {
  test('the register detail reads the shortened breakdown and keeps the arithmetic', () => {
    expect(fact('SC-02').stat?.detail).toBe(
      'Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments.',
    );
    expect(112926 + 40152 - 2400).toBe(150678);
    expect(25125 + 15027).toBe(40152);
    expect(fact('SC-02').stat?.value).toBe('150,000+');
    // the register text (the full wording) is not shortened
    expect(fact('SC-02').text).toContain('including the 2,400 CodersTrust also trained directly');
  });

  test('SC-04 keeps the "onboarding pipeline" wording that the other pages read', () => {
    expect(fact('SC-04').text.startsWith('1.5M+ National University learners in the onboarding pipeline')).toBe(true);
  });

  test('the Investors track-record note prints the shortened detail and the Her Power overlap sentence', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const note = compact(await page.locator('#guide .ig__notes').textContent());
    expect(note).toContain('Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments. Most delivery has been in Bangladesh.');
    expect(note).not.toContain('the 25,125 women Her Power trained nationally');
  });
});

test.describe('WP90 A2: Foundations Accountability callout removed', () => {
  test('the scorecard card stays and the callout does not', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#features h3', { hasText: 'A Pilot Scorecard Agreed with You' })).toHaveCount(1);
    await expect(page.locator('#platform-grants')).not.toContainText('Accountability');
    await expect(page.locator('#platform-grants')).not.toContainText('every pilot is judged');
    // the Funding Route 2 callout stays
    await expect(page.locator('#platform-grants')).toContainText('A platform grant supports JobReady’s infrastructure');
  });
});

test.describe('WP90 A3: JobReady@Work band opens with the 23,000+ tile', () => {
  test('the SC-15 tile sits above the credential bullets, with its wording unchanged', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const auth = page.locator('#guide .guide__auth');
    const html = await auth.innerHTML();
    expect(html.indexOf('23,000+')).toBeGreaterThanOrEqual(0);
    expect(html.indexOf('23,000+')).toBeLessThan(html.indexOf('AWS Authorized Training Partner'));
    await expect(page.locator('#guide .guide__stats')).toHaveCount(0);
    await expect(page.locator('#guide')).toContainText('enrollments in Grameenphone Academy courses delivered by CodersTrust');
  });
});

test.describe('WP90 A4: SuperKids "Who It Is For" drops the repeated clause', () => {
  test('the row ends at "graphic design for kids."', async ({ page }) => {
    await open(page, 'programs/superkids/');
    const row = page.locator('.pg__row', { has: page.locator('dt', { hasText: 'Who It Is For' }) });
    expect(compact(await row.locator('dd').textContent())).toBe('Schools and education partners that want young learners to build digital skills early, through block coding, robotics, and graphic design for kids.');
  });
});

test.describe('WP90 A5 and item 2: program cards link to their programs', () => {
  test('the NU Postgraduate Diploma and SuperKids cards each carry an in-card link', async ({ page }) => {
    await open(page, 'programs/');
    const nu = page.locator('li', { has: page.locator('h3', { hasText: 'NU Postgraduate Diploma' }) });
    await expect(nu.locator('a', { hasText: 'Explore the NU Postgraduate Diploma' })).toHaveAttribute('href', /\/programs\/nu-postgraduate-diploma\/$/);
    const sk = page.locator('li', { has: page.locator('h3', { hasText: 'SuperKids' }) });
    await expect(sk.locator('a', { hasText: 'Explore SuperKids' })).toHaveAttribute('href', /\/programs\/superkids\/$/);
  });
});

test.describe('WP90 A6: Universities third card heading', () => {
  test('the heading is "Placement Evidence You Can Report" and the old heading is gone', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('h3', { hasText: 'Placement Evidence You Can Report' })).toHaveCount(1);
    await expect(page.locator('body')).not.toContainText('Placement Results You Can Discuss');
  });
});

test.describe('WP90 item 3: Investors reach band', () => {
  test('the H2 is "Contracts and Recognition" and the NU sentence says the learners are being onboarded', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#reach h2')).toHaveText('Contracts and Recognition');
    const p = page.locator('#reach p.ir__p');
    const text = compact(await p.textContent());
    expect(text).toBe(
      'Separately, and not counted in the delivered reach: 1.5M+ National University learners being onboarded (the university’s own learners, not learners trained by CodersTrust); CodersTrust has been NU’s official training partner for digital career skills and credentials since 2023 and delivers NU postgraduate diploma courses.',
    );
    expect(text).not.toContain('onboarding pipeline');
  });
});

test.describe('WP90 item 4: comparison row', () => {
  test('the Outcome Tracking row reads "Included for every cohort" on Home, the page that carries the comparison table', async ({ page }) => {
    await open(page, '');
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('Included for every cohort, as agreed in the program scope: monthly reports and follow-up surveys at 3, 6 and 12 months');
    expect(text).not.toContain('Planned for every cohort');
  });
});

const SHOTS = process.env.WP90_SHOTS;
const shotPages: Array<[string, string]> = [
  ['home', ''],
  ['investors', 'partner-with-us/investors/'],
  ['foundations', 'partner-with-us/foundations/'],
  ['jobready-work', 'programs/jobready-work/'],
  ['superkids', 'programs/superkids/'],
  ['programs', 'programs/'],
  ['universities', 'partner-with-us/universities/'],
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

test.describe('WP90 screenshots', () => {
  test.skip(!SHOTS, 'set WP90_SHOTS to a directory to capture');
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
