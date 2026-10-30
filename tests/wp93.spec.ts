import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';

/**
 * WP93 behaviors (Perplexity cycle 42, triage A0 to A7, accepted as written in c42-triage.md; WP93-spec items 1 to 4). Retrospective coverage: the owner exempted
 * this project from test-first work, so these tests were written after the change. Run `npm run build` first, then
 * `PORT=4574 npx playwright test tests/wp93.spec.ts --project=chromium`.
 *   - A0: Investors' evidence band is headed "Evidence from the Youth Programs" (it was "Independent Evidence");
 *   - A1: SC-02's detail reads "Another 40,152 ... Counted once, the total is 150,678 enrollments." (every figure stays; the arithmetic closes);
 *   - A2: Foundations' Route 2 evidence cell adds "The first conversation covers JobReady’s staged rollout.";
 *   - A3: the Impact ladder's survey row says "19.6% are women." (OC-09's share, read from its text, as Outcomes 2026 words it);
 *   - A4: YouthWIDE's Our Approach reporting promise is "..., as agreed in the program scope.";
 *   - A5: the Governments national-scale answer says "met its full target with CodersTrust’s curriculum; the contract table above gives the figures.";
 *   - A6: Programs' reach band links "See Global Reach" after the 16's note;
 *   - A7: the partner closing strips end "include two suitable times for it." (Programs: "include two suitable times." since WP126).
 * Item 4 (headings flow from source): the only heading change (A0) is one string in InvestorEvidence.astro, and Investors renders no On This Page list, so nothing else needs the new wording.
 * Screenshots (1280 and 390): set WP93_SHOTS to a directory and run the "WP93 screenshots" test.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

const SC02_DETAIL =
  'Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: 25,125 in Her Power’s national program, which used CodersTrust’s curriculum, and 15,027 enrollments in six CodersTrust-designed courses on UNDP’s FutureNation platform. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments.';
const EVIDENCE_HEADING = 'Evidence from the Youth Programs';
const ROUTE_2_EVIDENCE = 'Youth-program outcomes are not platform outcomes. The first conversation covers JobReady’s staged rollout.';
const SURVEY_NOT = 'Cause: respondents are not a random sample and may over-represent successful learners. 19.6% are women.';
const YOUTHWIDE_STATEMENT =
  'YouthWIDE combines training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work, as agreed in the program scope.';
const NATIONAL_ANSWER =
  'We scale in phases. Her Power, a national program, met its full target with CodersTrust’s curriculum; the contract table above gives the figures. A 100,000+ program is a design option we have not yet delivered.';
const FIRST_ACTION_PARTNER = 'Your first step: a discovery session. In your inquiry, include two suitable times for it.';
const FIRST_ACTION_PROGRAMS = 'Your first step: a discovery session. In your inquiry, include two suitable times.'; // WP126: the programs’ line drops "for a discovery conversation"

test.describe('WP93 A0: the Investors evidence band is headed "Evidence from the Youth Programs"', () => {
  test('the band heading is the new wording and "Independent Evidence" is no longer a heading on Investors', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#proof-band h2')).toHaveText(EVIDENCE_HEADING);
    const headings = await page.locator('h2').allTextContents();
    expect(headings.map(compact)).not.toContain('Independent Evidence');
    expect(headings.map(compact)).toContain(EVIDENCE_HEADING);
  });

  test('the heading is one source string (InvestorEvidence) and Investors renders no On This Page list to go stale', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.getByRole('heading', { level: 2, name: EVIDENCE_HEADING })).toHaveCount(1);
    await expect(page.locator('nav[aria-label="On this page"], .on-this-page, .otp')).toHaveCount(0);
  });
});

test.describe('WP93 A1: SC-02 detail wording', () => {
  test('the register detail reads the triage wording and the arithmetic still closes', () => {
    expect(fact('SC-02').stat?.detail).toBe(SC02_DETAIL);
    expect(112926 + 40152 - 2400).toBe(150678);
    expect(25125 + 15027).toBe(40152);
    expect(fact('SC-02').stat?.value).toBe('150,000+');
    // the copy.ts guard reads "N in Her Power’s national program" from this detail; it must still find it
    expect(fact('SC-02').stat?.detail).toContain('25,125 in Her Power’s national program');
  });

  test('the Investors note prints the new SC-02 detail, then the SC-03 Bangladesh line', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const note = compact(await page.locator('#guide .ig__notes').textContent());
    expect(note).toBe(`${SC02_DETAIL} Most delivery has been in Bangladesh.`);
  });
});

test.describe('WP93 A2: Foundations Route 2 evidence cell', () => {
  test('the platform-grant row names the staged rollout after the youth-outcomes line', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const cells = await page.locator('#funding-routes tbody td:nth-child(3)').allTextContents();
    expect(cells.map(compact)).toContain(ROUTE_2_EVIDENCE);
  });
});

test.describe('WP93 A3: the Impact ladder survey row reads OC-09’s share of women', () => {
  test('the survey "What It Does Not Show" cell ends "19.6% are women." and the figure is OC-09’s', async ({ page }) => {
    await open(page, 'impact/');
    const cells = await page.locator('#evidence-ladder td:nth-child(3)').allTextContents();
    expect(cells.map(compact)).toContain(SURVEY_NOT);
    const share = /(\d+(?:\.\d+)?)% women/.exec(fact('OC-09').text)?.[1];
    expect(share).toBe('19.6');
  });
});

test.describe('WP93 A4: YouthWIDE reporting promise carries the scope guard', () => {
  test('the Our Approach statement reads the triage wording', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#mechanism .pos__text')).toHaveText(YOUTHWIDE_STATEMENT);
  });
});

test.describe('WP93 A5: the Governments national-scale answer', () => {
  test('the FAQ answer reads the triage wording, with the register figures kept in the glance and table', () => {
    const q = faqs.find((f) => f.id === 'Q2-government');
    expect(q?.a).toBe(NATIONAL_ANSWER);
    expect(q?.a.split(/(?<=\.)\s+/).length, 'three sentences (FAQ cap)').toBeLessThanOrEqual(3);
  });

  test('the Governments page prints the answer', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain(NATIONAL_ANSWER);
  });
});

test.describe('WP93 A6: Programs reach band links to Global Reach', () => {
  test('the 16 tile is followed by a "See Global Reach" text link to /impact/global-reach/', async ({ page }) => {
    await open(page, 'programs/');
    const link = page.locator('#reach .hub__reach-link a');
    await expect(link).toHaveText('See Global Reach');
    expect(await link.getAttribute('href')).toContain('/impact/global-reach/');
    // the link follows the tile's own note: its previous sibling is the stat that holds "Most delivery has been in Bangladesh."
    const before = await link.evaluate((a) => (a.closest('.hub__reach-link') as HTMLElement).previousElementSibling?.textContent ?? '');
    expect(compact(before)).toContain('Most delivery has been in Bangladesh.');
  });
});

test.describe('WP93 A7: partner closing strips say "for it"', () => {
  for (const route of ['partner-with-us/development-partners/', 'partner-with-us/foundations/', 'partner-with-us/universities/']) {
    test(`${route} ends its What Happens Next with the "for it" first action`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('#reinforce li').first()).toHaveText(FIRST_ACTION_PARTNER);
    });
  }

  test('Programs end on "include two suitable times." (WP126: no "for a discovery conversation"; their lead is removed, so "for it" would have no noun)', async ({ page }) => {
    await open(page, 'programs/jobready-campus/'); // WP134: JobReady@Work uses the Employers line (tests/wp134.spec.ts); Campus has one route, so no route block
    await expect(page.locator('#next-steps .next__first')).toHaveText(FIRST_ACTION_PROGRAMS);
  });
});

const SHOTS = process.env.WP93_SHOTS;
type Shot = { name: string; route: string; selector: string };
const shots: Shot[] = [
  { name: 'investors-evidence', route: 'partner-with-us/investors/', selector: '#proof-band' },
  { name: 'investors-guide', route: 'partner-with-us/investors/', selector: '#guide' },
  { name: 'foundations-routes', route: 'partner-with-us/foundations/', selector: '#funding-routes' },
  { name: 'impact-ladder', route: 'impact/', selector: '#evidence-ladder' },
  { name: 'youthwide-approach', route: 'programs/youthwide/', selector: '#mechanism' },
  { name: 'governments-faq', route: 'partner-with-us/governments/', selector: 'section:has(h2:text-is("Questions Ministries Ask"))' },
  { name: 'programs-reach', route: 'programs/', selector: '#reach' },
  { name: 'development-partners-reinforce', route: 'partner-with-us/development-partners/', selector: '#reinforce' },
  { name: 'foundations-reinforce', route: 'partner-with-us/foundations/', selector: '#reinforce' },
  { name: 'universities-reinforce', route: 'partner-with-us/universities/', selector: '#reinforce' },
];

test.describe('WP93 screenshots', () => {
  test.skip(!SHOTS, 'set WP93_SHOTS to a directory to capture');
  for (const shot of shots) {
    for (const [label, vp] of [['1280', DESKTOP], ['390', MOBILE]] as const) {
      test(`${shot.name} at ${label}`, async ({ page }: { page: Page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await open(page, shot.route);
        await scrollThrough(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `horizontal overflow at ${label}`).toBeLessThanOrEqual(0);
        await page.locator(shot.selector).first().screenshot({ path: `${SHOTS}/${shot.name}-${label}.png` });
      });
    }
  }
});
