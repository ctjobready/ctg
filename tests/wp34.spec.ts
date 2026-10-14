import { expect, test, type Page } from '@playwright/test';
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
const stepTitles = async (page: Page, selector: string) => (await texts(page, selector)).map((t) => t.replace(/^Step \d+: /, ''));

const HIRING = 'We scope your talent request against the experience and credentials available in the candidate pool.';

test.describe('Employers and JobReady@Work: the closing steps name their routes', () => {
  const PAGES = [
    { route: 'partner-with-us/employers/', title: 'What Happens After You Say Yes', steps: ['Discovery Session', 'Needs Assessment', 'Agreement', 'First Workshop or Cohort'] },
    { route: 'programs/jobready-work/', title: 'What Happens Next', steps: ['Discovery Session', 'Needs Assessment', 'Agreement', 'First Workshop or Cohort', 'Progress Evaluation'] },
  ];

  for (const p of PAGES) {
    test(`${p.route}: the existing steps are labeled "For Team Training", and "For Hiring" is a parallel route with its own sentence`, async ({ page }) => {
      await open(page, p.route);
      const band = page.locator('#next-steps');
      await expect(band.locator('h2')).toHaveText(p.title);
      expect(await texts(page, '#next-steps h3')).toEqual(['For Team Training', 'For Hiring']);
      // the steps are the training route's, one heading level under its label
      expect(await stepTitles(page, '#next-steps ol h4')).toEqual(p.steps);
      await expect(band.locator('ol h3')).toHaveCount(0);
      // the hiring route is one sentence, tied to IN-04 like the other hiring statements, and sits after the training steps
      const hiring = band.locator('.route', { has: page.locator('h3', { hasText: 'For Hiring' }) });
      await expect(hiring.locator('p')).toHaveCount(1);
      expect(compact(await hiring.locator('p').textContent())).toBe(HIRING);
      expect(await hiring.locator('p').getAttribute('data-fact')).toBe('IN-04');
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
      expect(levels[0]).toBe('H2');
      expect(levels.slice(1, 2)).toEqual(['H3']);
      expect(levels.slice(2, 2 + p.steps.length)).toEqual(p.steps.map(() => 'H4'));
      expect(levels[levels.length - 1]).toBe('H3');
    });
  }

  test('Employers: the "first step: a discovery session" line belongs to team training, so it says so (it follows both routes)', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    expect(compact(await page.locator('#reinforce .rf__first').textContent())).toBe('For team training, your first step: a discovery session. In your inquiry, include two suitable times for a discovery conversation.');
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

test.describe('Investors: how JobReady builds on delivery, no cohort comparison', () => {
  test('the approaches comparison is gone from Investors and stays on Home', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#compare')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/How the Approaches Compare|Self-Paced Course Platforms|Freelance Marketplaces Alone/);
    await open(page, '');
    await expect(page.locator('#compare h2')).toHaveText('How the Approaches Compare');
  });

  test('a short band follows the FAQ: the heading and one statement, tied to IN-04, with the live and pre-launch wording of the register', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const band = page.locator('#platform');
    await expect(band.locator('h2')).toHaveText('How JobReady Builds on Delivery');
    const line = band.locator('p.lead');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(
      'JobReady adds live partner portals and pre-launch work marketplaces to CodersTrust’s training and mentoring programs. Youth-program outcomes are not platform outcomes.',
    );
    expect(await line.getAttribute('data-fact')).toBe('IN-04');
    await expect(band.locator('table, ul, ol')).toHaveCount(0);
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(order.indexOf('platform')).toBe(order.indexOf('faq') + 1);
    expect(order.indexOf('offer')).toBe(order.indexOf('platform') + 1);
  });

  test('the band is its heading and statement: no gap is left under the text (the header drops its bottom margin)', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'partner-with-us/investors/');
    const gap = await page.locator('#platform').evaluate((el) => {
      const header = el.querySelector('header')!.getBoundingClientRect();
      const band = el.getBoundingClientRect();
      return { header: getComputedStyle(el.querySelector('header')!).marginBottom, below: band.bottom - header.bottom, pad: parseFloat(getComputedStyle(el).paddingBottom) };
    });
    expect(gap.header).toBe('0px');
    expect(Math.abs(gap.below - gap.pad)).toBeLessThan(1);
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

  test('the hub keeps the full "Due Diligence in One View" (the same component, not changed), and Employers keeps its four rows', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('#due-diligence h2')).toHaveText('Due Diligence in One View');
    await expect(page.locator('#due-diligence .ddv__item')).toHaveCount(4);
    await open(page, 'partner-with-us/employers/');
    await expect(page.locator('#due-diligence h2')).toHaveText('Due Diligence in One View');
    await expect(page.locator('#due-diligence .ddv__item')).toHaveCount(4);
  });

  test('Development Partners and Foundations keep the "Reporting and Review" callout that links the hub (the item does not replace it)', async ({ page }) => {
    for (const slug of ['development-partners', 'foundations']) {
      await open(page, `partner-with-us/${slug}/`);
      await expect(page.locator('main').getByText('Reporting and Review', { exact: true }), slug).toHaveCount(1);
    }
  });
});

test.describe('Development Partners: the hardest-to-reach answer names the barriers', () => {
  test('"Why do the hardest-to-reach groups drop out?" is answered with the barriers, not by repeating the question', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const pain = page.locator('#problem .gp__pains li', { hasText: 'Why Do the Hardest-to-Reach Groups Drop Out?' });
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
    // WP35 (cycle-12 review): the pain titles are card titles, so they are set in Title Case
    expect(await texts(page, '#problem .gp__pains .gp__q')).toEqual(['Why Do Degree Holders Struggle to Find Work?', 'Why Can’t Employers Find the Skills They Need?', 'Where Are Your Placement Results?']);

    await open(page, 'programs/jobready-campus/');
    const problem = page.locator('#problem');
    await expect(problem.locator('[data-fact="PX-03"]')).toHaveCount(0);
    expect(compact(await problem.textContent())).not.toMatch(/13\.5%|SSC|graduate unemployment in Bangladesh/);
    expect(await texts(page, '#problem .card__title')).toEqual(['Employers Cannot See the Skills', 'No Placement Results to Publish']);
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
    expect(compact(await answer.textContent())).toBe('Students and degree holders at universities and colleges. Across CodersTrust’s wider programs, 84.6% of surveyed completers hold a bachelor’s degree or higher.');
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

  test('the Next Steps band no longer repeats it: the heading and the introductory-call line only, with no route cards', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const band = page.locator('#next-steps');
    await expect(band.locator('h2')).toHaveText('What Happens After You Say Yes');
    expect(compact(await band.locator('.lead').textContent())).toBe('Details of what the grant delivers are discussed in the introductory call.');
    await expect(band.locator('.next__routes, ol, ul, li')).toHaveCount(0);
    const main = await mainText(page);
    expect(count(main, COHORT), 'the cohort sentence').toBe(1);
    expect(count(main, PLATFORM), 'the platform sentence').toBe(1);
    expect(count(main, 'Details of what the grant delivers are discussed in the introductory call.'), 'the introductory-call line').toBe(1);
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
    expect(text).not.toMatch(/10\.3|77\.9%|47\.4%|\+41%|Not This Diploma|not from the National University Postgraduate Diploma|This trial evaluated/);
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
    await expect(page.locator('.updated time')).toHaveAttribute('datetime', '2026-10-15');
  });
});

test.describe('Our Model: two delivery cards say what they mean', () => {
  test('"Each certification track includes 100 training hours over 3–6 months." and the scale card is "Local Labs, Coordinated Delivery"', async ({ page }) => {
    await open(page, 'our-model/');
    const training = page.locator('#delivery .card', { hasText: 'Blended Training with Certification' });
    expect(compact(await training.textContent())).toContain('Each certification track includes 100 training hours over 3–6 months.');
    const scale = page.locator('#delivery .card', { hasText: 'Local Labs, Coordinated Delivery' });
    await expect(scale).toHaveCount(1);
    expect(compact(await scale.textContent())).toContain('From about month 5, programs can run up to 10 certification cohorts in parallel, using existing labs and certified local facilitators.');
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
      const steps = await page.locator('#next-steps ol').boundingBox();
      expect(box!.y, route).toBeGreaterThan(steps!.y + steps!.height);
      expect(box!.x + box!.width, route).toBeLessThanOrEqual(MOBILE.width);
    }
  });
});
