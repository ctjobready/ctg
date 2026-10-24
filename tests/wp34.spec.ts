import { expect, test, type Locator, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP34 behaviors (cycle-11 whole-site review): Employers and JobReady@Work close on two labeled routes (team training, hiring), Investors says how JobReady builds on
 * delivery instead of comparing youth cohorts, the five audience pages confirm contracting, safeguarding and reporting in one item instead of four cards, the Governments,
 * Universities and JobReady@Campus problem bands no longer open with the Bangladesh tile, Foundations says what is discussed for each funding route once, the NU diploma overview
 * links to the wider programs' evidence instead of showing it, and the smaller wording fixes. Retrospective coverage (the owner exempted this project from test-first work);
 * each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp34.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const HIRING = 'A conversation about the roles you want to fill, to scope your talent request.';
const INTRODUCTIONS = 'Job-ready candidates are introduced through CodersTrust’s placement team.';

test.describe('Employers and JobReady@Work: the closing steps name their routes', () => {
  // WP46 (cycle-22 review): Employers' hiring route is two steps in the training route's step component ("Discovery": the scoping sentence; "Introductions": the placement-team sentence); WP47: JobReady@Work's is the same two steps
  const PAGES = [
    // WP49 (cycle-24 review): the heading is "What Happens Next" on every page that had "What Happens After You Say Yes" (tests/wp49.spec.ts)
    { route: 'partner-with-us/employers/', title: 'What Happens Next', steps: ['Discovery Session', 'Needs Assessment', 'Agreement', 'First Workshop or Cohort'], hiringSteps: ['Discovery', 'Introductions'] },
    { route: 'programs/jobready-work/', title: 'What Happens Next', steps: ['Discovery Session', 'Needs Assessment', 'Agreement', 'First Workshop or Cohort', 'Progress Evaluation'], hiringSteps: ['Discovery', 'Introductions'] },
  ];

  for (const p of PAGES) {
    test(`${p.route}: the existing steps are labeled "For Team Training", and "For Hiring" is a parallel route with its own two steps`, async ({ page }) => {
      await open(page, p.route);
      const band = page.locator('#next-steps');
      await expect(band.locator('h2')).toHaveText(p.title);
      expect(await texts(page, '#next-steps h3')).toEqual(['For Team Training', 'For Hiring']);
      // the steps are the training route's, one heading level under its label
      const routes = band.locator('.route');
      const routeSteps = async (route: Locator) => (await route.locator('ol h4').allTextContents()).map((t) => compact(t).replace(/^Step \d+: /, ''));
      expect(await routeSteps(routes.nth(0))).toEqual(p.steps);
      await expect(band.locator('ol h3')).toHaveCount(0);
      // the hiring route is tied to IN-04 like the other hiring statements, and sits after the training steps
      const hiring = band.locator('.route', { has: page.locator('h3', { hasText: 'For Hiring' }) });
      expect(await routeSteps(hiring)).toEqual(p.hiringSteps);
      expect((await hiring.locator('.steps__text').allTextContents()).map(compact)).toEqual([HIRING, INTRODUCTIONS]);
      expect(await hiring.locator('[data-fact]').first().getAttribute('data-fact')).toBe('IN-04');
      await expect(hiring.locator('p.lead')).toHaveCount(0);
      await expect(routes).toHaveCount(2);
      const order = await band.evaluate((el) => {
        const steps = el.querySelector('ol')!.getBoundingClientRect();
        const hire = Array.from(el.querySelectorAll('h3')).find((h) => h.textContent?.trim() === 'For Hiring')!.getBoundingClientRect();
        return { stepsBottom: steps.bottom, hireTop: hire.top };
      });
      expect(order.hireTop).toBeGreaterThan(order.stepsBottom);
    });

    test(`${p.route}: the "Hire JobReady Talent" inquiry link stays in the call-to-action band`, async ({ page }) => {
      await open(page, p.route);
      const link = page.locator('#cta a', { hasText: 'Hire JobReady Talent' });
      await expect(link).toHaveCount(1);
      expect(await link.getAttribute('href')).toMatch(/^mailto:.*Talent%20request/);
    });

    test(`${p.route}: the route labels are sub-section headings (28px, 600) and the heading order stays H2, H3, H4`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await open(page, p.route);
      const labels = await page.locator('#next-steps h3').evaluateAll((els) => els.map((e) => ({ w: Number(getComputedStyle(e).fontWeight), s: parseFloat(getComputedStyle(e).fontSize) })));
      expect(labels).toHaveLength(2);
      for (const l of labels) {
        expect(l.w).toBe(600);
        expect(l.s).toBeGreaterThanOrEqual(27.5);
      }
      const levels = await page.locator('#next-steps h2, #next-steps h3, #next-steps h4').evaluateAll((els) => els.map((e) => e.tagName));
      // the band's H2, the training label (H3) over its steps (H4), then the hiring label (H3) over its steps (H4) (WP46: Employers; WP47: JobReady@Work)
      expect(levels).toEqual(['H2', 'H3', ...p.steps.map(() => 'H4'), 'H3', ...p.hiringSteps.map(() => 'H4')]);
    });
  }

  // WP54 (cycle-28 review, Kimi K5): the line follows both routes and the first step is a discovery session on both (the hiring route's first step is "Discovery"), so it says "for team training or hiring" (tests/wp54.spec.ts)
  test('Employers: the "first step: a discovery session" line names both routes, team training and hiring (it follows both routes)', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    expect(compact(await page.locator('#reinforce .rf__first').textContent())).toBe('Your first step, for team training or hiring: a discovery session. In your inquiry, include two suitable times.');
  });

  test('JobReady@Work: the first-action line sits inside the team-training route, before "For Hiring"', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const training = page.locator('#next-steps .route').first();
    await expect(training.locator('h3')).toHaveText('For Team Training');
    expect(compact(await training.locator('.next__first').textContent())).toBe('First action. In your inquiry, include two suitable times for a discovery conversation.');
    await expect(page.locator('#next-steps .route').nth(1).locator('.next__first')).toHaveCount(0);
  });

  test('the other pages that close on steps keep the plain band (no route labels): Universities, Governments, Development Partners, JobReady@Campus', async ({ page }) => {
    for (const route of ['partner-with-us/universities/', 'partner-with-us/governments/', 'partner-with-us/development-partners/', 'programs/jobready-campus/']) {
      await open(page, route);
      await expect(page.locator('#next-steps .route'), route).toHaveCount(0);
      expect((await texts(page, '#next-steps ol h3')).length, route).toBeGreaterThanOrEqual(4);
    }
  });
});

test.describe('Investors: no cohort comparison, and (WP43) no one-sentence platform band in its place', () => {
  test('the approaches comparison is gone from Investors and stays on Home', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#compare')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/How the Approaches Compare|Self-Paced Course Platforms|Freelance Marketplaces Alone/);
    await open(page, '');
    await expect(page.locator('#compare h2')).toHaveText('How CodersTrust Compares with Self-Paced Courses');
  });

  // WP43 (cycle-20 review): the one-sentence band WP34 added after the FAQ ("The Platform": "How JobReady Builds on Delivery", tied to IN-04) is gone: the evidence block ends "Youth-program outcomes are not platform
  // outcomes." (WP36) and "What JobReady Does" states what is live and in pre-launch. The page goes from the questions to the offer.
  test('no platform band follows the FAQ: the offer follows it, and "Youth-program outcomes are not platform outcomes." is said once, closing the evidence block', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#platform')).toHaveCount(0);
    const text = compact(await page.locator('main').textContent());
    expect(text).not.toMatch(/How JobReady Builds on Delivery|JobReady adds live partner portals and pre-launch work marketplaces/);
    await expect(page.locator('main .eyebrow', { hasText: 'The Platform' })).toHaveCount(0);
    expect(text.split('Youth-program outcomes are not platform outcomes.').length - 1, 'said once').toBe(1);
    expect(compact(await page.locator('#proof-band').textContent())).toContain('Youth-program outcomes are not platform outcomes.');
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(order.indexOf('offer')).toBe(order.indexOf('faq') + 1);
  });

  test('the meta description names the staged rollout and stays within the SEO limit', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe('For impact investors: back JobReady’s staged rollout. Request an introduction call; the deck follows under NDA.');
    expect(description!.length).toBeLessThanOrEqual(155);
    expect(description).not.toContain('moving emerging-market youth into paid work');
  });
});

test.describe('the due-diligence item on the five audience pages', () => {
  const FIVE = ['development-partners', 'governments', 'foundations', 'universities', 'local-partners'];

  for (const slug of FIVE) {
    test(`${slug}: one heading, one sentence and one link, in place of the four cards`, async ({ page }) => {
      await open(page, `partner-with-us/${slug}/`);
      const block = page.locator('#due-diligence');
      await expect(block).toHaveCount(1);
      await expect(block.locator('.eyebrow')).toHaveText('Due Diligence');
      await expect(block.locator('h2')).toHaveText('Confirm Contracting, Safeguarding and Reporting');
      const sentence = block.locator('p.lead');
      expect(compact(await sentence.textContent())).toBe('The contracting entity, safeguarding arrangements and reporting plan are confirmed for your program.');
      expect(await sentence.getAttribute('data-fact')).toBe('ID-07 PD-13 PD-12 PD-08');
      await expect(block.locator('li, h3')).toHaveCount(0);
      const link = block.locator('a');
      await expect(link).toHaveCount(1);
      expect(compact(await link.textContent())).toBe('Governance and Accountability');
      expect(await link.getAttribute('href')).toMatch(/\/about\/governance\/$/);
      const main = await mainText(page);
      expect(main).not.toMatch(/Due Diligence in One View|Contracting Entities|Independent Evaluation Welcome\s+We support third-party evaluation of outcomes, and the randomized trial/);
    });
  }

  // WP57 (cycle-29 review, GPT-6.1 Sol G7): Employers' compact view is three rows now (its "Independent Evaluation Welcome" row is gone; tests/wp57.spec.ts); the hub keeps all four
  test('the hub keeps the full "Due Diligence in One View" (the same component, not changed), and Employers keeps its compact view of three rows', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('#due-diligence h2')).toHaveText('Due Diligence in One View');
    await expect(page.locator('#due-diligence .ddv__item')).toHaveCount(4);
    await open(page, 'partner-with-us/employers/');
    await expect(page.locator('#due-diligence h2')).toHaveText('Due Diligence in One View');
    await expect(page.locator('#due-diligence .ddv__item')).toHaveCount(3);
  });

  // WP48 (cycle-23 review): Foundations' callout is gone (its "Progress You Can See Every Month" card says the same; tests/wp48.spec.ts); Development Partners keeps its callout, the one place the page names the quarterly reviews
  test('Development Partners keeps the "Reporting and Review" callout (the item does not replace it); Foundations no longer has one', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    await expect(page.locator('main').getByText('Reporting and Review', { exact: true }), 'development-partners').toHaveCount(1);
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('main').getByText('Reporting and Review', { exact: true }), 'foundations').toHaveCount(0);
  });
});

test.describe('Development Partners: the barriers answer names the barriers', () => {
  // WP49 (cycle-24 review): the card is headed "Barriers Can Interrupt Training" (it was "The Hardest-to-Reach Groups Drop Out"); its body is unchanged
  test('"Barriers can interrupt training" (WP36: a statement, no longer a question) is explained with the barriers, not by repeating the title', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const pain = page.locator('#problem .gp__pains li', { hasText: 'Barriers Can Interrupt Training' });
    await expect(pain).toHaveCount(1);
    expect(compact(await pain.locator('.gp__a').textContent())).toBe('Computer skills, devices, connectivity and social barriers can keep learners from joining or staying.');
    expect(await mainText(page)).not.toContain('They drop out, or are never reached in the first place.');
  });
});

test.describe('the Bangladesh graduate-unemployment tile (PX-03) leaves the global pages', () => {
  test('Governments opens its problem band with the global 62 million (PX-01), worded as on Home', async ({ page }) => {
    await open(page, '');
    const home = compact(await page.locator('#problem [data-fact="PX-01"]').textContent());
    expect(home).toContain('62 million');
    await open(page, 'partner-with-us/governments/');
    const tile = page.locator('#problem [data-fact="PX-01"]');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.textContent())).toBe(home);
    await expect(page.locator('#problem [data-fact="PX-03"]')).toHaveCount(0);
    expect(compact(await page.locator('#problem').textContent())).not.toMatch(/13\.5%|SSC/);
  });

  test('Universities and JobReady@Campus carry no Bangladesh tile and keep the rest of their problem copy', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#problem [data-fact="PX-03"]')).toHaveCount(0);
    await expect(page.locator('#problem [data-fact="PX-05"]')).toContainText('72%');
    expect(compact(await page.locator('#problem').textContent())).not.toMatch(/13\.5%|SSC|graduate unemployment in Bangladesh/);
    // WP35 (cycle-12 review): the pain titles are card titles, so they are set in Title Case; WP36 (cycle-13 review): they are statements, not questions
    // WP46 (cycle-22 review): the employers' pain card is gone (the 72% tile directly below states it), so two pains are left
    expect(await texts(page, '#problem .gp__pains .gp__q')).toEqual(['Degree Holders Struggle to Find Work', 'Placement Results Are Hard to Publish']);

    await open(page, 'programs/jobready-campus/');
    const problem = page.locator('#problem');
    await expect(problem.locator('[data-fact="PX-03"]')).toHaveCount(0);
    expect(compact(await problem.textContent())).not.toMatch(/13\.5%|SSC|graduate unemployment in Bangladesh/);
    expect(await texts(page, '#problem .card__title')).toEqual(['Make Students’ Skills Visible', 'Build Placement Evidence']);
  });

  test('the Bangladesh pages keep it: Local Partners and the NU Postgraduate Diploma', async ({ page }) => {
    for (const route of ['partner-with-us/local-partners/', 'programs/nu-postgraduate-diploma/']) {
      await open(page, route);
      const tile = page.locator('#problem [data-fact="PX-03"]');
      await expect(tile, route).toContainText('13.5%');
      await expect(tile, route).toContainText('graduate unemployment in Bangladesh');
    }
  });
});

test.describe('JobReady@Campus FAQ: who the program is for', () => {
  test('the question is about the program, the answer says who it is for and keeps the survey profile as a wider-programs figure', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    const item = page.locator('#faq details', { hasText: 'Who Is JobReady@Campus For?' });
    await expect(item).toHaveCount(1);
    expect(compact(await item.locator('summary').textContent())).toBe('Who Is JobReady@Campus For?');
    const answer = item.locator('p');
    expect(compact(await answer.textContent())).toBe('Students and degree holders at universities and colleges. In CodersTrust’s October 2026 survey of completers across its programs, 85.0% held a bachelor’s degree or higher.');
    expect(await answer.getAttribute('data-fact')).toBe('OC-09');
    expect(await mainText(page)).not.toMatch(/Typical Learners|Mostly university graduates from across Bangladesh/);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('Who Is JobReady@Campus For?');
    expect(ld).toContain('Students and degree holders at universities and colleges.');
    expect(ld).not.toContain('Typical Learners');
  });
});

test.describe('Foundations: what is discussed for each funding route is said once', () => {
  const COHORT = 'we discuss your country, priority groups, tracks, budget and scorecard.';
  const PLATFORM = 'we discuss JobReady’s staged rollout.';

  test('the call-to-action band says it in the one agenda paragraph, with the route as the bold lead-in, tied to PD-02', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const agenda = page.locator('#cta [data-session-agenda]');
    await expect(agenda).toHaveCount(1);
    expect(await agenda.evaluate((el) => el.tagName)).toBe('P');
    expect(compact(await agenda.textContent())).toBe(`For a cohort grant, ${COHORT} For a platform grant, ${PLATFORM}`);
    expect(await texts(page, '#cta [data-session-agenda] .agenda__lead')).toEqual(['For a cohort grant,', 'For a platform grant,']);
    expect(await agenda.getAttribute('data-fact')).toBe('PD-02');
    expect(compact(await page.locator('#cta').textContent())).not.toContain('What the discovery session covers');
  });

  // WP46 (cycle-22 review): the Next Steps band is no longer a heading and one line: it has the four grant-funded steps, scoped "For cohort grants." (tests/wp32.spec.ts); it still has no route cards and does not repeat the agenda
  test('the Next Steps band no longer repeats it: the four steps scoped "For cohort grants.", with no route cards and no agenda sentence', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const band = page.locator('#next-steps');
    await expect(band.locator('h2')).toHaveText('What Happens Next');
    expect(compact(await band.locator('.lead').textContent())).toBe('For platform grants, the first conversation covers JobReady’s infrastructure and staged rollout. For cohort grants, the steps below show target timing for grant-funded pilots.');
    await expect(band.locator('ol h3')).toHaveCount(4);
    await expect(band.locator('.next__routes')).toHaveCount(0);
    expect(compact(await band.textContent())).not.toMatch(/we discuss your country|we discuss JobReady/);
    const main = await mainText(page);
    expect(count(main, COHORT), 'the cohort sentence').toBe(1);
    expect(count(main, PLATFORM), 'the platform sentence').toBe(1);
    expect(count(main, 'introductory call'), 'no introductory-call line').toBe(0);
  });

  test('the discovery-session agenda stays on the pages that sell cohorts (Development Partners)', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    expect(compact(await page.locator('#cta [data-session-agenda]').textContent())).toBe(
      'What the discovery session covers: your country, priority groups and locations; employer demand and certification tracks; an indicative budget, the pilot scorecard and the follow-up survey schedule.',
    );
  });
});

test.describe('NU Postgraduate Diploma: a link to the wider programs, not their results', () => {
  test('the overview shows a one-link strip headed "Evidence from CodersTrust’s Wider Programs" and no trial or survey figure', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    const strip = page.locator('#offer-evidence');
    await expect(strip.locator('h2')).toHaveText('Evidence from CodersTrust’s Wider Programs');
    await expect(strip.locator('.pe__item, [data-fact], .eyebrow')).toHaveCount(0);
    const links = strip.locator('nav[aria-label="Evidence from CodersTrust’s Wider Programs"] a');
    await expect(links).toHaveCount(1);
    expect(compact(await links.first().textContent())).toBe('See CodersTrust’s Impact');
    expect(await links.first().getAttribute('href')).toMatch(/\/impact\/$/);
    await expect(page.locator('#proof-band')).toHaveCount(0);
    await expect(page.locator('[data-trial-scope]')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/10\.3|78\.2%|48\.0%|\+41%|Not This Diploma|not from the National University Postgraduate Diploma|This trial evaluated/);
  });

  test('the strip sits between "Delivered with National University" and the questions, and the closing call to action keeps its one primary button', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(order.indexOf('offer-evidence')).toBe(order.indexOf('guide') + 1);
    expect(order.indexOf('faq')).toBe(order.indexOf('offer-evidence') + 1);
    await expect(page.locator('#cta .btn--primary')).toHaveCount(1);
  });

  test('the page shows today as its last-updated date', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    // WP76 (2026-10-22): the page's wording changed that day (four courses), so PAGE_UPDATED.nu moved from 2026-10-15
    await expect(page.locator('.updated time')).toHaveAttribute('datetime', '2026-10-22');
  });
});

test.describe('Our Model: two delivery cards say what they mean', () => {
  test('"Each certification track includes 100 training hours over 3–6 months." and the scale card is "Local Labs, Coordinated Delivery"', async ({ page }) => {
    await open(page, 'our-model/');
    const training = page.locator('#delivery .card', { hasText: 'Blended Training and Certification Preparation' });
    expect(compact(await training.textContent())).toContain('Each certification track includes 100 training hours over 3–6 months.');
    const scale = page.locator('#delivery .card', { hasText: 'Local Labs, Coordinated Delivery' });
    await expect(scale).toHaveCount(1);
    // WP46 (cycle-22 review): "are designed to run" (as Q2 and Investors say it), not "can run"
    // WP65 (cycle-37 review): month 5 is a month of a program (PD-06); WP67 (cycle-38 review, Grok): "After about five months of delivery, programs are designed to run up to 10 certification cohorts in parallel, ..." (it said "From about month 5 of a program, delivery is designed to run ...")
    expect(compact(await scale.textContent())).toContain('After about five months of delivery, programs are designed to run up to 10 certification cohorts in parallel, using existing labs and certified local facilitators.');
    expect(await scale.locator('[data-fact]').getAttribute('data-fact')).toBe('PD-06');
    const text = await mainText(page);
    expect(text).not.toMatch(/Hub-and-Spoke Delivery at Scale|Each certification takes|Larger programs use hub-and-spoke/);
    await expect(page.locator('#delivery .card')).toHaveCount(6);
  });
});

test.describe('layout', () => {
  const ROUTES = [
    'partner-with-us/employers/',
    'programs/jobready-work/',
    'partner-with-us/investors/',
    'partner-with-us/development-partners/',
    'partner-with-us/governments/',
    'partner-with-us/foundations/',
    'partner-with-us/universities/',
    'partner-with-us/local-partners/',
    'programs/jobready-campus/',
    'programs/nu-postgraduate-diploma/',
    'our-model/',
  ];
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ROUTES) {
        await open(page, route);
        expect(await noOverflow(page), route).toBe(true);
      }
    });
  }

  test('at 390px the two routes stack: the hiring route starts below the training steps and its label stays inside the viewport', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    for (const route of ['partner-with-us/employers/', 'programs/jobready-work/']) {
      await open(page, route);
      const box = await page.locator('#next-steps .route').nth(1).locator('h3').boundingBox();
      // (the first list is the training route's steps; WP46: Employers' hiring route has a list of its own after it)
      const steps = await page.locator('#next-steps ol').first().boundingBox();
      expect(box!.y, route).toBeGreaterThan(steps!.y + steps!.height);
      expect(box!.x + box!.width, route).toBeLessThanOrEqual(MOBILE.width);
    }
  });
});
