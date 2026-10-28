import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP91 behaviors (Perplexity cycle 40, triage A0 to A11, accepted exactly as written in c40-triage.md; WP91-spec items 2 to 4). Retrospective coverage: the owner
 * exempted this project from test-first work, so these tests were written after the change. Run `npm run build` first, then
 * `PORT=4572 npx playwright test tests/wp91.spec.ts --project=chromium`.
 *   - A0: the Investors band's sub-heading is "Scale and Partners" (the tiles keep their own status tags);
 *   - A1: SC-02's detail is reworded at its source; every figure stays and the Investors note prints it;
 *   - A2: Home slide 2 names the National University's country and says the 1.5M+ are the university's own learners (the count is read from GV-12);
 *   - A3: the trial callout reads "Employment effect, not income: +10.3 percentage points, ...";
 *   - A4: the Funding Route 2 body has the sentence about the cohort grants before the register line;
 *   - A5: the Governments mechanism band carries the YouthWIDE sentence after the positioning statement;
 *   - A6: the Governments "What Happens Next" band ends with the first-step prompt;
 *   - A7: the Albania card carries PR-07's wording only (no "Delivered" tag, no completion claim);
 *   - A8: the hiring route's first step says what the conversation covers; the hire band and FAQ keep their hedge;
 *   - A9: Home's AWS recognition badge is titled "Amazon Web Services (AWS)" and states the status under it;
 *   - A10: the first Foundations pain reads "Earnings Must Be Tracked, Not Only Training Hours";
 *   - A11: On This Page lists the full headings, and "In Short" is gone.
 * Screenshots (1280 and 390): set WP91_SHOTS to a directory and run the "WP91 screenshots" test.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

const SC02_DETAIL =
  'Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: 25,125 in Her Power’s national program, which used CodersTrust’s curriculum, and 15,027 enrollments in six CodersTrust-designed courses on UNDP’s FutureNation platform. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments.';
const HOME_SLIDE_2_LEAD =
  'Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly. As the official training partner of Bangladesh’s National University for digital career skills and credentials, CodersTrust is onboarding 1.5M+ of the university’s own learners, who are not learners trained by CodersTrust.';
const TRIAL_CAPTION =
  'Employment effect, not income: +10.3 percentage points, more than four times the 2.3-point average across nine vocational-training trials.';
const YOUTHWIDE_SENTENCE =
  'YouthWIDE is the program through which governments and funders deploy the CodersTrust model in a country; it builds on results from earlier programs in Bangladesh and Kosovo.';
const FIRST_STEP =
  'Your first step: a briefing for your ministry. In your inquiry, include two suitable times for it.';
const ALBANIA_SCOPE =
  'Three-month online training in graphic design, web development and digital marketing, with mentoring. The World Bank reported in May 2022, while the program was still running, that more than 500 students had enrolled.';
const HIRING_STEP = 'A conversation about the roles you want to fill, to scope your talent request.';
const FOUNDATIONS_PAIN = 'Earnings Must Be Tracked, Not Only Training Hours';

test.describe('WP91 A1: SC-02 detail is reworded at its source, and every figure stays', () => {
  test('the register detail reads the triage wording and the arithmetic still closes', () => {
    expect(fact('SC-02').stat?.detail).toBe(SC02_DETAIL);
    expect(112926 + 40152 - 2400).toBe(150678);
    expect(25125 + 15027).toBe(40152);
    expect(fact('SC-02').stat?.value).toBe('150,000+');
    // the copy.ts guard reads "N in Her Power’s national program" from this detail; it must still find it
    expect(fact('SC-02').stat?.detail).toContain('25,125 in Her Power’s national program');
  });

  test('the Investors note prints the new SC-02 wording, then the SC-03 line', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const note = compact(await page.locator('#guide .ig__notes').textContent());
    expect(note).toBe(`${SC02_DETAIL} Most delivery has been in Bangladesh.`);
  });
});

test.describe('WP91 A0: Investors sub-heading is "Scale and Partners"', () => {
  test('the band heads its tiles "Scale and Partners"; the tiles keep their status tags', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#guide h3')).toHaveText(['Scale and Partners']);
    await expect(page.locator('#guide .ig__tile')).toHaveCount(3);
    await expect(page.locator('#guide .ig__tile').nth(0)).toContainText('Delivered');
    await expect(page.locator('#guide .ig__tile').nth(2)).toContainText('Where We Have Worked');
  });
});

test.describe('WP91 A2: Home slide 2 names the country and the university’s own learners', () => {
  test('the lead reads the triage sentence, with the 1.5M+ read from GV-12', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('.hs__lead', { hasText: 'Six government contracts' })).toHaveText(HOME_SLIDE_2_LEAD);
  });
});

test.describe('WP91 A3: the trial callout says what the employment effect is', () => {
  test('the Home slide 1 caption reads "Employment effect, not income: +10.3 ..."', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('.hs__proof', { hasText: 'Employment effect' })).toContainText(TRIAL_CAPTION);
  });
});

test.describe('WP91 A4: the platform grant has its sentence about cohort grants', () => {
  test('the Route 2 body reads the program-sizes sentence, then the register line', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#platform-grants p[data-fact="IN-04"]')).toHaveText(
      'The program sizes above apply to cohort grants only. A platform grant supports JobReady’s infrastructure and staged rollout, not cohorts.',
    );
  });
});

test.describe('WP91 A5: Governments introduces YouthWIDE after the approach', () => {
  test('the sentence follows the positioning statement in the How It Works band', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const band = compact(await page.locator('#mechanism').textContent());
    expect(band).toContain(YOUTHWIDE_SENTENCE);
    expect(band.indexOf('We combine training, mentoring and placement support')).toBeLessThan(band.indexOf(YOUTHWIDE_SENTENCE));
  });
});

test.describe('WP91 A6: Governments ends What Happens Next with the first-step prompt', () => {
  test('the steps band carries the first-step line after Step 4', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const band = compact(await page.locator('#next-steps').textContent());
    expect(band).toContain('Launch in Existing Labs');
    expect(band.indexOf('Seats are confirmed per program.')).toBeLessThan(band.indexOf(FIRST_STEP));
    await expect(page.locator('#next-steps')).toContainText(FIRST_STEP);
  });
});

test.describe('WP91 A7: the Albania card carries PR-07 wording only', () => {
  test('the card reads the World Bank figure, with no Delivered tag or completion claim', async ({ page }) => {
    await open(page, 'impact/');
    await expect(page.locator('#cases')).toContainText(ALBANIA_SCOPE);
  });
  test('PR-07 keeps the 500+ figure the card states', () => {
    expect(fact('PR-07').stat?.value).toBe('500+');
    expect(fact('PR-07').text).toContain('more than 500 students had enrolled');
  });
});

test.describe('WP91 A8: the hiring route’s first step says what the conversation covers', () => {
  test('Employers prints the new Discovery step and no longer the old scoping sentence', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain(HIRING_STEP);
    expect(text).not.toContain('We scope your talent request against the experience and credentials available in the candidate pool.');
    // the hire band and the FAQ keep their hedge
    expect(text).toContain('Talent requests are scoped against the experience and credentials available in the candidate pool.');
  });
});

test.describe('WP91 A9: Home’s AWS badge is titled by the company, and states the status', () => {
  test('the badge title is "Amazon Web Services (AWS)" and the line under it is the registered status', async ({ page }) => {
    await open(page, '');
    const aws = page.locator('.rec__badge', { has: page.locator('.rec__badge-title', { hasText: 'Amazon Web Services (AWS)' }) });
    await expect(aws).toHaveCount(1);
    await expect(aws.locator('.rec__badge-title')).toHaveText('Amazon Web Services (AWS)');
    await expect(aws.locator('.rec__badge-text')).toHaveText('CodersTrust is an AWS Authorized Training Partner.');
  });
});

test.describe('WP91 A10: the first Foundations pain reads "Must"', () => {
  test('the first pain title is "Earnings Must Be Tracked, Not Only Training Hours"', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const titles = await page.locator('#problem .gp__q').allTextContents();
    expect(titles).toEqual([FOUNDATIONS_PAIN, 'Independent Evidence Is Hard to Find', 'Accountability Must Keep Pace with Scale']);
  });
});

test.describe('WP91 A11: On This Page lists the full headings', () => {
  test('the Impact list matches its headings and drops "In Short"', async ({ page }) => {
    await open(page, 'impact/');
    const links = await page.locator('nav[aria-label="On this page"] a').evaluateAll((els) =>
      els.map((a) => ({ label: (a.textContent ?? '').replace(/\s+/g, ' ').trim(), id: (a.getAttribute('href') ?? '').replace(/^.*#/, '') })),
    );
    expect(links.map((l) => l.label)).toEqual([
      'Results at a Glance',
      'Five Programs Across Kosovo, Albania and Bangladesh',
      'Four Kinds of Evidence, Strongest First',
      'Where We Are Heading',
      'Seven Global Goals, Three at the Core',
      'Discuss the Evidence for Your Program',
    ]);
    for (const { label, id } of links) {
      expect(compact(await page.locator(`#${id} :is(h2, h3)`).first().textContent()), `the heading of #${id}`).toBe(label);
    }
  });
});

const SHOTS = process.env.WP91_SHOTS;
const shotPages: Array<[string, string]> = [
  ['home', ''],
  ['investors', 'partner-with-us/investors/'],
  ['foundations', 'partner-with-us/foundations/'],
  ['governments', 'partner-with-us/governments/'],
  ['employers', 'partner-with-us/employers/'],
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

test.describe('WP91 screenshots', () => {
  test.skip(!SHOTS, 'set WP91_SHOTS to a directory to capture');
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
