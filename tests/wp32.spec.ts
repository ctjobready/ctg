import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP32 behaviors (cycle-9 whole-site reviews): the Partner with Us hub chooses a partnership instead of describing a cohort, Foundations says what is discussed for each
 * funding route, the Investors hero says what is live, the Employers FAQ answers an employer, YouthWIDE states the trial once, the employer credentials are stated once,
 * the follow-up survey schedule replaces the "tracer timeline", the benefit lines start with a capital letter, and the smaller Home and hub wording fixes. Retrospective
 * coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp32.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

test.describe('Partner with Us hub', () => {
  test('the hero asks for a choice of partnership and describes no cohort; the closing call to action offers help finding the route', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('.hero__lead').first()).toHaveText('Choose a partnership for youth employment, campus skills, team training, hiring or JobReady’s staged rollout.');
    const cta = compact(await page.locator('#cta').textContent());
    expect(cta).toContain('Tell us your goals, and we will help you find the right partnership route.');
    expect(cta).not.toMatch(/first cohort|priority groups/);
    await expect(page.locator('#audiences .grid-cards > a')).toHaveCount(7);
  });

  // WP45 (cycle-21 review): the hub's reporting band (and its "See What YouthWIDE Reports" link) is gone; the hub still promises no sample report, and the Programs link under the route cards opens the programs
  test('no link promises a sample report; the hub still links to the programs', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('#review-cycle')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Sample Monthly Report');
    expect(await mainText(page)).not.toContain('See What YouthWIDE Reports');
    const programs = page.locator('.hub__programs a.link');
    await expect(programs).toHaveCount(1);
    expect(await programs.getAttribute('href')).toMatch(/\/programs\/$/);
  });

  test('"Why Partner with CodersTrust" reads trial, survey, reach: the reach tile is the registered 130,000+ with its glance label, tied to SC-16', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const tiles = page.locator('#why-partner li');
    await expect(tiles).toHaveCount(3);
    expect(await texts(page, '#why-partner .wp__kicker')).toEqual(['Randomized Trial of a Predecessor Program', 'Impact Survey 2026', 'Reach Since 2014']);
    expect(await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['RC-02', 'OC-01', 'SC-16']);
    const reach = tiles.nth(2);
    await expect(reach.locator('.wp__value')).toHaveText('130,000+');
    // WP49 (cycle-24 review): "learners trained", SC-01's wording (the 130,000+ includes teacher and staff enrollments, so it is not "young people")
    await expect(reach.locator('.wp__desc')).toHaveText('learners trained since 2014');
    await expect(reach.locator('.wp__note')).toHaveText('Through 150,000+ enrollments, with work in 16 countries and territories.');
    expect(await reach.locator('a.wp__link').getAttribute('href')).toMatch(/\/impact\/global-reach\/$/);
  });

  for (const vp of [{ width: 800, height: 900 }, DESKTOP]) {
    test(`the three evidence tiles do not leave one alone beside an empty cell at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/');
      const boxes = await page.locator('#why-partner li').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
      const grid = await page.locator('#why-partner ul.wp').evaluate((e) => e.getBoundingClientRect());
      if (vp.width >= 1024) {
        // three across: one row, equal tops
        expect(new Set(boxes.map((b) => Math.round(b.top))).size, 'one row').toBe(1);
      } else {
        // two columns with the third across the row
        expect(Math.abs(boxes[2].width - grid.width), 'the third tile spans the row').toBeLessThan(2);
        expect(boxes[2].top).toBeGreaterThan(boxes[0].bottom - 1);
      }
    });
  }
});

test.describe('Foundations', () => {
  // WP46 (cycle-22 review): WP32 had left this band without steps (the two funding routes do not share one process) and kept the cohort timing in the call-to-action urgency line; the band now has the four Development Partners
  // steps, scoped "For cohort grants." (a platform grant is scoped in the discovery session, which the call-to-action agenda says), and the urgency line that would repeat them is gone.
  // WP49 (cycle-24 review): the heading is "What Happens Next" (it was "What Happens After You Say Yes", which presumed a commitment)
  test('"What Happens Next" shows the four grant-funded steps scoped "For cohort grants."; the call-to-action band no longer repeats their timing', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const band = page.locator('#next-steps');
    await expect(band.locator('h2')).toHaveText('What Happens Next');
    expect(compact(await band.locator('.lead').textContent())).toBe('For cohort grants.');
    expect((await texts(page, '#next-steps ol h3')).map((t) => t.replace(/^Step \d: /, ''))).toEqual(['Discovery (Week 1)', 'Co-Design (Week 2)', 'Agreement (Week 3)', 'Training Starts 6–8 Weeks After Signing']);
    expect(await band.locator('[data-fact]').first().getAttribute('data-fact')).toBe('PD-04');
    await expect(band.locator('.next__fn')).toHaveCount(0);
    // the timing is the steps' own; the call to action keeps its button, its links and the agenda, and no urgency line
    const cta = compact(await page.locator('#cta').textContent());
    expect(cta).not.toMatch(/grant-funded pilots|three weeks|6–8|Public procurement/);
    await expect(page.locator('#cta .cta-band__notes')).toHaveCount(0);
    expect(compact(await page.locator('#cta [data-session-agenda]').textContent())).toContain('For a platform grant, we discuss JobReady’s staged rollout.');
    expect(count(await mainText(page), '6–8'), 'the window is stated once on Foundations').toBe(1);
  });

  test('the cohort-grant offer is headed "Choose Where to Start Your Cohort Grant"; the page names the discovery session as its one first step and never an "introductory call"', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#cohort-grants h2')).toHaveText('Choose Where to Start Your Cohort Grant');
    const main = await mainText(page);
    expect(main).not.toMatch(/introductory call|introduction call|Details of what the grant delivers/);
    expect(main).toContain('A conversation about your goals, priority groups and timeline.');
  });

  test('Development Partners keeps its four grant-funded steps (they are cohort steps)', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    await expect(page.locator('#next-steps ol h3')).toHaveCount(4);
    await expect(page.locator('#next-steps .next__routes')).toHaveCount(0);
  });
});

test.describe('Investors', () => {
  test('the hero says what is live and what is in pre-launch, tied to IN-04; the owner H1 and the one primary button are unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const lead = page.locator('main .hero .hero__lead').first();
    // the two marketplaces are named as two (IN-04's wording; tests/wp25s.spec.ts forbids "employer and gig-work")
    await expect(lead).toHaveText('Back JobReady’s staged rollout, built on CodersTrust’s training and mentoring programs. Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.');
    expect(await lead.getAttribute('data-fact')).toBe('IN-04');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Invest in the Platform Connecting Emerging-Market Youth to Work');
    await expect(page.locator('main .hero .btn--primary')).toHaveCount(1);
  });
});

test.describe('Employers', () => {
  test('"Will This Work in Our Country?" is answered with the needs assessment and the candidate-pool scope, in the page and in its FAQ markup; the other pages keep the country answer', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const item = page.locator('#faq details', { hasText: 'Will This Work in Our Country?' });
    await expect(item).toHaveCount(1);
    const answer = compact(await item.textContent());
    expect(answer).toContain('We start with a needs assessment of your roles, tasks and required tools. For hiring, talent requests are scoped against the experience and credentials available in the candidate pool.');
    expect(answer).not.toMatch(/Bangladesh|Kosovo|local demand/);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('We start with a needs assessment of your roles, tasks and required tools.');
    expect(ld).not.toContain('That depends on local demand for the roles you hire for');
    await open(page, 'partner-with-us/governments/');
    expect(await mainText(page)).toContain('That depends on local demand and on lab access and facilitator supply, which we test first.');
  });
});

test.describe('YouthWIDE', () => {
  test('"Trial and Survey Evidence" states the trial once, in one sentence; the tiles, the chart and the links stay', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const band = page.locator('#proof-band');
    await expect(band.locator('.eb__headline')).toHaveCount(1);
    await expect(band.locator('.eb__headline')).toHaveText(
      // WP54 (cycle-28 review, GPT-6.1 Sol G8): the evaluator is spelled out where YouthWIDE first names it (it said "In BIGD’s randomized trial of the predecessor WSDFM program, ...")
      'In the randomized trial of the predecessor WSDFM program by the BRAC Institute of Governance and Development (BIGD), women offered a place were 10.3 percentage points more likely to be employed and had an estimated 41% higher monthly income than the control group.',
    );
    expect(await band.locator('.eb__headline').getAttribute('data-fact')).toBe('RC-01 RC-02');
    await expect(band.locator('[data-plain-line]')).toHaveCount(0);
    const text = compact(await band.textContent());
    expect(text).not.toMatch(/about 10 more were in work|For women who attended|A randomized trial by BIGD found/);
    // the chart's data table repeats the difference as a table cell; as a paragraph, the sentence is the only statement of the effect
    // (WP45: the RC-02 tile's figure line is a paragraph too, "+10.3" over "percentage points"; it is a tile, not a statement of the effect)
    expect((await texts(page, '#proof-band p:not(.stat__value)')).filter((p) => p.includes('10.3 percentage points')), 'one paragraph states the effect').toHaveLength(1);
    await expect(band.locator('.eb__stat')).toHaveCount(2);
    await expect(band.locator('svg[role="img"]').first()).toBeVisible();
    expect(await texts(page, '#proof-band .eb__links a')).toEqual(['Impact Survey 2026', 'The Randomized Trial']);
  });
});

test.describe('the employer credentials are stated once', () => {
  const CREDENTIALS = ['AWS Authorized Training Partner', 'Partnership with AIvolve Leadership Dynamics', 'enrollments in Grameenphone Academy courses'];

  for (const route of ['programs/jobready-work/', 'partner-with-us/employers/']) {
    test(`${route}: each credential appears once, in the Track Record band; the evidence strip is the two links`, async ({ page }) => {
      await open(page, route);
      const text = await mainText(page);
      for (const c of CREDENTIALS) expect(count(text, c), c).toBe(1);
      expect(count(text, '23,000+'), '23,000+').toBe(1);
      const strip = page.locator('#offer-evidence');
      await expect(strip.locator('h2')).toHaveText('Broader Evidence from Our Youth Programs');
      await expect(strip.locator('.pe__item')).toHaveCount(0);
      await expect(strip.locator('[data-fact]')).toHaveCount(0);
      expect(await texts(page, '#offer-evidence .pe__more a')).toEqual(['The Randomized Trial', 'Impact Survey 2026']);
      await expect(strip.locator('nav[aria-label="Broader Evidence from Our Youth Programs"]')).toHaveCount(1);
      expect(text).not.toContain('The Delivery Record for Employers');
    });
  }

  test('JobReady@Work keeps the credentials in "Employers and Partners We Work With"; Employers keeps them in "Our Track Record" (the three statements and the 23,000+ tile)', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const guide = compact(await page.locator('#guide').textContent());
    for (const c of [...CREDENTIALS, '23,000+']) expect(guide, c).toContain(c);
    await open(page, 'partner-with-us/employers/');
    const track = compact(await page.locator('#guide').textContent());
    for (const c of [...CREDENTIALS, '23,000+']) expect(track, c).toContain(c);
  });
});

test.describe('the follow-up survey schedule', () => {
  const PAGES: [string, number][] = [
    ['partner-with-us/development-partners/', 1],
    ['partner-with-us/governments/', 1],
    // WP34 (cycle-11 review): Foundations offers a cohort grant and a platform grant, so its line says what is discussed for each route instead (tests/wp34.spec.ts)
    // WP39 (cycle-16 review): YouthWIDE's two near-identical agendas are one line for both entry routes, "We discuss your priority groups, locations, tracks, indicative budget, scorecard and reporting plan." (tests/wp39.spec.ts)
  ];
  for (const [route, agendas] of PAGES) {
    test(`${route}: the session agenda ends "the pilot scorecard and the follow-up survey schedule" (${agendas} agenda${agendas > 1 ? 's' : ''}); nothing says "tracer timeline"`, async ({ page }) => {
      await open(page, route);
      const lines = await texts(page, '[data-session-agenda]');
      expect(lines).toHaveLength(agendas);
      for (const l of lines) expect(l.endsWith('an indicative budget, the pilot scorecard and the follow-up survey schedule.'), l).toBe(true);
      expect(await page.evaluate(() => document.body.innerText.toLowerCase().includes('tracer timeline'))).toBe(false);
    });
  }
});

test.describe('benefit lines start with a capital letter', () => {
  // WP38, WP39 and WP40 (cycle-15, cycle-16 and cycle-17 reviews): Home, every audience and program page and Investors state their features as three short cards (IncludesBand), not concern / inclusion / benefit rows,
  // so they have no .fc__means lines; their card sentences are held to the rule below.
  const CARD_ROUTES = [
    'partner-with-us/investors/',
    'partner-with-us/development-partners/',
    'partner-with-us/governments/',
    'partner-with-us/foundations/',
    'partner-with-us/universities/',
    'partner-with-us/employers/',
    'partner-with-us/local-partners/',
    // WP57 (cycle-29 review, GPT-6.1 Sol G2): YouthWIDE's three-card band is gone, so the page is not in this list
    'programs/jobready-campus/',
  ];
  test('every card sentence on the audience and program pages opens with a capital letter or a figure', async ({ page }) => {
    for (const route of CARD_ROUTES) {
      await open(page, route);
      const lines = await texts(page, '#features .card__text');
      expect(lines.length, `${route} has three card sentences`).toBe(3);
      for (const l of lines) expect(l, `${route}: "${l.slice(0, 40)}…"`).toMatch(/^[A-Z0-9]/);
    }
  });

  test('Home’s three cards open with a capital letter or a figure', async ({ page }) => {
    await open(page, '');
    const lines = await texts(page, '#features .card__text');
    expect(lines.length, 'home has three card sentences').toBe(3);
    for (const l of lines) expect(l, `home: "${l.slice(0, 40)}…"`).toMatch(/^[A-Z0-9]/);
  });

  // WP39 (cycle-16 review): "What Your Portfolio Gets" is three short cards (tests/wp39.spec.ts holds their words); the sentence is its own paragraph below the card heading
  test('Development Partners "What Your Portfolio Gets": three cards, each a heading with its sentence below it', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    await expect(page.locator('#features h2')).toHaveText('What Your Portfolio Gets');
    expect(await texts(page, '#features .card__title')).toEqual(['Training, Mentoring and Placement Support', 'Accessible Local Delivery', 'Progress Your Evaluators Can Check']);
    const sameLine = await page.locator('#features li.card').first().evaluate((card) => {
      const title = card.querySelector('.card__title')!.getBoundingClientRect();
      const text = card.querySelector('.card__text')!.getBoundingClientRect();
      return text.top < title.bottom - 1;
    });
    expect(sameLine).toBe(false);
  });
});

test.describe('Home', () => {
  test('the mechanism card says "Skills, Certification Preparation and Mentoring" and it wraps inside its card at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const titles = await texts(page, '#mechanism .model__title');
      expect(titles).toContain('Skills, Certification Preparation and Mentoring');
      expect(titles.join(' ')).not.toContain('Skills, Certification, Mentoring');
      const overflow = await page.locator('#mechanism .model__title').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
      expect(overflow, `${vp.width}px: no title overflows its card`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${vp.width}px: no sideways scroll`).toBeLessThanOrEqual(0);
    }
  });

  // WP48 (cycle-23 review): Home's low-risk band is gone (the audience pages keep theirs); its one line, "Start with a multi-cohort pilot, agree the scorecard up front, and decide on expansion from the evidence.", leads the closing band (tests/wp48.spec.ts)
  test('the low-risk band is gone from Home; no heading is split into "Start with a Multi-Cohort Pilot. Decide on Evidence"', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#risk')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Start with a Multi-Cohort Pilot. Decide on Evidence');
    await open(page, 'partner-with-us/local-partners/');
    await expect(page.locator('#risk h2')).toHaveText('Start with a Pilot Cohort, Then Decide on Evidence');
  });

  // WP42 (cycle-19 review): the government slide is second
  test('slide 2 (government contracts and the National University partnership) links both audience pages', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(1);
    expect(await slide.locator('.hs__actions a').evaluateAll((els) => els.map((a) => ({ text: (a.textContent ?? '').trim(), href: a.getAttribute('href') ?? '' })))).toEqual([
      { text: 'For Governments', href: expect.stringMatching(/\/partner-with-us\/governments\/$/) },
      { text: 'For Universities', href: expect.stringMatching(/\/partner-with-us\/universities\/$/) },
    ]);
  });

  // WP49 (cycle-24 review): the router card is "Investors" (nav.ts, the title the menu, the footer and the hub use); it was "Impact Investors" (tests/wp49.spec.ts)
  test('the "What Brings You Here?" router calls the investor card "Investors", as the main menu does', async ({ page }) => {
    await open(page, '');
    expect(await texts(page, '#router .cat__title')).toEqual(['Development Partners and NGOs', 'Governments', 'Foundations and CSR', 'Investors']);
    const menu = page.locator('a.mega__link[href$="partner-with-us/investors/"] .mega__title').first();
    await expect(menu).toHaveText('Investors');
  });
});

test.describe('layout', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['', 'partner-with-us/', 'partner-with-us/foundations/', 'partner-with-us/investors/', 'partner-with-us/employers/', 'partner-with-us/development-partners/', 'programs/youthwide/', 'programs/jobready-work/']) {
        await open(page, route);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over, route || 'home').toBeLessThanOrEqual(0);
      }
    });
  }
});
