import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP30d behaviors (owner direction 2026-10-14, "less is more"): the Programs pages and Our Model pages say less, lead with the global program where it is
 * global, and open with impactful H1s. Each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp30d.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const wordsIn = async (page: Page) => compact(await page.locator('main').evaluate((el) => el.textContent ?? '')).split(' ').length;
const sectionIds = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));

const ROUTES = [
  'programs/',
  'programs/youthwide/',
  'programs/jobready-campus/',
  'programs/jobready-work/',
  'programs/superkids/',
  'programs/nu-postgraduate-diploma/',
  'programs/nu-postgraduate-diploma/ict/',
  'programs/nu-postgraduate-diploma/digital-marketing/',
  'our-model/',
  'our-model/talentleap/',
  'our-model/jobready-platform/',
];

test.describe('impactful H1s, Title Case, no trailing period', () => {
  const H1: [string, string][] = [
    ['programs/', 'Digital Skills for Every Stage, from Classroom to Career'],
    ['programs/youthwide/', 'From Training to Paid Digital Work, Country by Country'],
    ['programs/jobready-campus/', 'Give Your Students a Degree and a Route into Digital Work'],
    ['programs/jobready-work/', 'Build AI-Ready Teams Around Your Own Roles'],
    ['programs/superkids/', 'Bring Coding, Robotics and Digital Art into Your Classroom'],
    ['programs/nu-postgraduate-diploma/', 'Build Practical Digital Skills After Your Degree'],
    ['our-model/', 'One Path from Assessment to Career, with Outcomes Tracked'],
    ['our-model/talentleap/', 'TalentLEAP: A Skill-by-Skill Path from Learning to Earning'],
    ['our-model/jobready-platform/', 'JobReady: A Platform Built to Connect Learning to Work'],
  ];
  for (const [route, h1] of H1) {
    test(`${route} reads "${h1}"`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('main h1')).toHaveText(h1);
      expect(h1).not.toMatch(/\.$/);
    });
  }

  test('the Programs hub H1 does not say that every program aims at one result (SuperKids and the diploma are not that)', async ({ page }) => {
    await open(page, 'programs/');
    expect(compact(await page.locator('main h1').textContent())).not.toMatch(/\b(every|all)\b.*\b(job|employment|work)\b/i);
  });
});

test.describe('YouthWIDE leads with the global program', () => {
  // WP40 (cycle-17 review): the row is headed "Designed for Three Regions" ("Where It Runs" read as the countries it runs in today; tests/wp40.spec.ts)
  test('the glance table opens with the three regions it is designed for, Bangladesh as the reference implementation', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const first = page.locator('#program-glance .pg__row').first();
    await expect(first).toContainText('Designed for Three Regions');
    await expect(first).toContainText('South Asia, the Middle East and North Africa, and Sub-Saharan Africa');
    await expect(first).toContainText('Bangladesh is the reference implementation');
  });

  test('the Bangladesh national initiative keeps #governments (linked from the Governments page and a case study) and says the 2030 aim is not delivered', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('section#governments')).toHaveCount(1);
    expect(compact(await page.locator('section#governments').innerText())).toContain('not a delivered figure');
  });

  test('the Programs hub card names the country cohorts before the Bangladesh aim', async ({ page }) => {
    await open(page, 'programs/');
    const text = compact(await page.locator('#programs-grid li:has(a[href$="programs/youthwide/"])').textContent());
    expect(text.indexOf('co-funded country cohorts')).toBeGreaterThan(-1);
    expect(text.indexOf('co-funded country cohorts')).toBeLessThan(text.indexOf('In Bangladesh it aims'));
  });

  test('the structured data lists no roadmap the page does not show', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.join(' ')).not.toContain('execution roadmap');
  });
});

test.describe('less is more: the report-like bands are gone', () => {
  for (const route of ['programs/youthwide/', 'programs/jobready-campus/', 'programs/jobready-work/', 'programs/superkids/', 'our-model/']) {
    test(`${route} has no In Short band`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('#in-short')).toHaveCount(0);
    });
  }

  test('YouthWIDE drops the delivery grid, the work-entry plans, the roadmap, the reporting timeline, the RACI, the comparison table and the offer notes', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const ids = await sectionIds(page);
    for (const gone of ['delivery-reporting', 'compare', 'definition', 'in-short']) expect(ids, gone).not.toContain(gone);
    const text = compact(await page.locator('main').evaluate((el) => el.textContent ?? ''));
    for (const gone of ['Who Does What', 'Compare the Approaches', 'The Delivery Model in Detail', 'Five Phases from Agreement to Parallel Cohorts', 'What Your Reports Show over Time', 'Services Behind a Phase']) {
      expect(text, gone).not.toContain(gone);
    }
  });

  test('the Programs hub has no selection table, shared-path band or safeguarding band: the five cards carry it', async ({ page }) => {
    await open(page, 'programs/');
    const ids = await sectionIds(page);
    for (const gone of ['find', 'path', 'protected', 'definition']) expect(ids, gone).not.toContain(gone);
    await expect(page.locator('#programs-grid article')).toHaveCount(5);
    await expect(page.locator('#hero a[href="#find"], .hero a[href="#find"]')).toHaveCount(0);
  });

  test('the diploma course pages drop the generic definition and the wider-programs outcome band but keep eligibility', async ({ page }) => {
    for (const route of ['programs/nu-postgraduate-diploma/ict/', 'programs/nu-postgraduate-diploma/digital-marketing/']) {
      await open(page, route);
      const ids = await sectionIds(page);
      for (const gone of ['definition', 'outcomes']) expect(ids, `${route} ${gone}`).not.toContain(gone);
      await expect(page.locator('#before-you-apply .ba__row', { hasText: 'Eligibility' }).first()).toContainText('Honors / Diploma holders with a minimum CGPA of 2.25');
      await expect(page.locator('#faq details')).toHaveCount(2);
    }
  });

  test('the diploma overview drops five bands and keeps Before You Apply, the wider-programs evidence link and one closing call to action', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    const ids = await sectionIds(page);
    for (const gone of ['definition', 'cost', 'future', 'steps', 'offer', 'risk']) expect(ids, gone).not.toContain(gone);
    // WP34 (cycle-11 review): the trial and survey band (and its scope line) became a one-link strip, #offer-evidence (tests/wp34.spec.ts)
    for (const kept of ['courses', 'problem', 'before-you-apply', 'offer-evidence', 'faq', 'cta']) expect(ids, kept).toContain(kept);
    await expect(page.locator('#proof-band')).toHaveCount(0);
    await expect(page.locator('[data-trial-scope]')).toHaveCount(0);
    await expect(page.locator('main .hero .btn--primary')).toHaveCount(1);
    await expect(page.locator('#cta .btn--primary')).toHaveCount(1);
  });

  test('SuperKids drops the problem, partner and "what your school receives" bands', async ({ page }) => {
    await open(page, 'programs/superkids/');
    const ids = await sectionIds(page);
    for (const gone of ['problem', 'guide', 'school-receives', 'definition']) expect(ids, gone).not.toContain(gone);
    await expect(page.locator('#agreements')).toContainText('not delivered reach');
  });

  test('Our Model has no quality-assurance band and six one-sentence delivery cards', async ({ page }) => {
    await open(page, 'our-model/');
    await expect(page.getByRole('heading', { name: 'Quality Assurance' })).toHaveCount(0);
    await expect(page.locator('#delivery .card')).toHaveCount(6);
    await expect(page.locator('#delivery h3.om__group')).toHaveCount(0);
    await expect(page.locator('#faq details')).toHaveCount(3);
  });

  test('TalentLEAP keeps three decision questions and no nine-trials context line or mentoring caveat box', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    await expect(page.locator('#faq details')).toHaveCount(3);
    const text = compact(await page.locator('main').evaluate((el) => el.textContent ?? ''));
    expect(text).not.toContain('For context, a review of nine randomized trials');
    expect(text).not.toContain('Why Mentoring Is Milestone-Based');
  });

  test('the JobReady Platform page states the live-today summary once', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const text = compact(await page.locator('main').evaluate((el) => el.textContent ?? ''));
    expect(text.split('AI chat is live today').length - 1).toBe(0);
    expect(text.split('Adaptive learning remains on the roadmap').length - 1).toBe(1);
  });
});

test.describe('anchors that other pages link to stay', () => {
  const ANCHORS: [string, string[]][] = [
    ['programs/youthwide/', ['governments', 'cta', 'cta-governments', 'mechanism', 'proof-band', 'features', 'next-steps']],
    // WP31: #proof-band left the Work page with its youth-program trial block; no page linked to that anchor (#mechanism and #next-steps are linked, from the employer due-diligence view)
    ['programs/jobready-work/', ['mechanism', 'next-steps', 'cta']],
    ['programs/jobready-campus/', ['mechanism', 'features', 'next-steps', 'cta']],
  ];
  for (const [route, ids] of ANCHORS) {
    test(`${route} keeps ${ids.map((i) => '#' + i).join(' ')}`, async ({ page }) => {
      await open(page, route);
      for (const id of ids) await expect(page.locator(`[id="${id}"]`), `#${id}`).toHaveCount(1);
    });
  }
});

test.describe('each page is noticeably shorter than the 2026-10-14 baseline (words in main, FAQ answers included)', () => {
  // Baseline word counts (built HTML, main content) before WP30d; the caps keep a regression from quietly bringing the report-like text back.
  const CAPS: [string, number][] = [
    ['programs/', 800],
    ['programs/youthwide/', 2800],
    ['programs/jobready-campus/', 1300],
    ['programs/jobready-work/', 1100],
    ['programs/superkids/', 850],
    ['programs/nu-postgraduate-diploma/', 850],
    ['programs/nu-postgraduate-diploma/ict/', 750],
    ['programs/nu-postgraduate-diploma/digital-marketing/', 750],
    ['our-model/', 950],
    ['our-model/talentleap/', 850],
    ['our-model/jobready-platform/', 600],
  ];
  for (const [route, cap] of CAPS) {
    test(`${route} stays under ${cap} words`, async ({ page }) => {
      await open(page, route);
      expect(await wordsIn(page)).toBeLessThan(cap);
    });
  }
});

test.describe('layout', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ROUTES) {
        await open(page, route);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over, route).toBeLessThanOrEqual(0);
      }
    });
  }
});
