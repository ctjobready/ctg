import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP31 behaviors (cycle-8 whole-site reviews): the freelancing label, a Governments page that speaks to any ministry, the corporate offer pages without
 * the youth programs' trial block, credibility before the vision on the audience pages, one plain closing sentence in the positioning statements,
 * survey figures said as what completers report, and the smaller wording fixes. Each test states one observable behavior of the built site (run
 * `npm run build` first, then `PORT=<port> npx playwright test tests/wp31.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const ids = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));

const AUDIENCE = ['development-partners', 'governments', 'foundations', 'universities', 'employers', 'local-partners'];

test.describe('figures say what they measure', () => {
  test('the 2.8× tile on Foundations names FREELANCING employment, not employment', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const band = compact(await page.locator('#proof-band').textContent());
    expect(band).toContain('+21.9 percentage points on a control rate of 11.9% (freelancing employment, women who attended)');
    expect(band).not.toContain('(employment, women who attended)');
  });

  test('the Impact survey tiles state shares, not growth multiples: 14.0% freelance (up from 6.2%), no "about 3×" beside the median', async ({ page }) => {
    await open(page, 'impact/');
    const glance = compact(await page.locator('#glance').textContent());
    expect(glance).toContain('14.0%');
    expect(glance).toContain('of surveyed completers freelance, up from 6.2% before training');
    expect(glance).toContain('Business ownership rose from 2.8% to 10.6%. Nearly one in eight earns mainly from foreign clients or jobs abroad.');
    expect(glance).not.toMatch(/growth in freelancing|2\.3×|3\.8×|3× the median/);
    await open(page, 'impact/outcomes-2026/');
    const survey = await mainText(page);
    expect(survey).not.toMatch(/growth in freelancing|about 3× the median/);
  });

  test('Home slide 2 reads as what surveyed completers report, and has no lead line to repeat it', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(1);
    await expect(slide.locator('h2')).toHaveText('Surveyed Completers Report a Median Income of $245, Up from $82 Before Training');
    await expect(slide.locator('.hs__lead')).toHaveCount(0);
  });

  test('Home slide 1 states the offered-place results only; slide 3 and the case card say the WSDFM 71% is program records, separate from the trial', async ({ page }) => {
    await open(page, '');
    const lead = compact(await page.locator('[data-hs-slide]').nth(0).locator('.hs__lead').textContent());
    expect(lead).toBe('Women offered a place in the predecessor WSDFM program were 10.3 percentage points more likely to be employed. Their monthly income was an estimated 41% higher than the control group’s.');
    await expect(page.locator('[data-hs-slide]').nth(2).locator('.hs__lines li').first()).toHaveText('WSDFM program records, separate from the trial: 71% in work.');
    expect(compact(await page.locator('#cases article').first().textContent())).toContain('WSDFM program records, separate from the trial: 71% in work');
  });

  test('every WSDFM and Her Power case card reads the same wherever it stands (Development Partners shows the shared Her Power caption)', async ({ page }) => {
    for (const route of ['', 'partner-with-us/development-partners/', 'partner-with-us/foundations/']) {
      await open(page, route);
      const cards = (await texts(page, '#cases article')).join(' | ');
      expect(cards, route || 'home').toContain('WSDFM program records, separate from the trial: 71% in work');
      if (cards.includes('Her Power')) {
        expect(cards, route || 'home').toContain('372 of 800 tracked women in work (47%), from the 2,500 trained directly by CodersTrust');
        expect(cards, route || 'home').not.toContain('tracked women, from the 2,500 trained directly by CodersTrust, in work: 47%');
      }
    }
  });

  test('the Home Track Record tile for the six government contracts carries the Contract Scope tag', async ({ page }) => {
    await open(page, '');
    const tile = page.locator('#guide .guide__tile', { hasText: '31,200+' });
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('[data-evidence="Contract Scope"]')).toHaveCount(1);
  });

  test('the National University relationship is worded one way: official training partner for digital career skills and credentials', async ({ page }) => {
    await open(page, '');
    const lead = compact(await page.locator('[data-hs-slide]').nth(5).locator('.hs__lead').textContent());
    expect(lead).toContain('Official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners.');
    expect(await mainText(page)).not.toContain('official skills partner');
  });

  test('the NHRDF contract cell reads the scope first, then the first batch inside it', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const row = page.locator('#contracts tbody tr', { hasText: 'NHRDF' });
    await expect(row).toContainText('Contract scope: 1,000+ trainees, 200 in the first batch');
    expect(await mainText(page)).not.toContain('200 trainees initially');
  });

  test('the Impact hub leads its trial group with the offered-place income result, the attenders’ figure after it', async ({ page }) => {
    await open(page, 'impact/');
    const group = page.locator('#glance .glance__group', { has: page.getByRole('heading', { level: 3, name: 'Trial Results, Predecessor Program' }) });
    const facts = await group.locator('li a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]));
    expect(facts).toEqual(['RC-01', 'RC-13', 'RC-06a']);
    await expect(group.locator('li').first()).toContainText('+41%');
    await expect(group.locator('li').nth(1)).toContainText('+54%');
  });

  test('the Impact "On This Page" labels are the headings they jump to (a short form only where the heading is long), and every heading has one', async ({ page }) => {
    await open(page, 'impact/');
    const links = await page.locator('nav[aria-label="On this page"] a').evaluateAll((els) => els.map((a) => ({ label: (a.textContent ?? '').trim(), id: (a.getAttribute('href') ?? '').replace('#', '') })));
    const h2Of = async (id: string) => compact(await page.locator(`#${id} h2`).first().textContent());
    for (const l of links.filter((x) => x.id !== 'summary')) {
      const h2 = await h2Of(l.id);
      expect(h2.startsWith(l.label), `"${l.label}" is the start of "${h2}"`).toBe(true);
    }
    const jumped = new Set(links.map((l) => l.id));
    const headed = await page.evaluate(() => Array.from(document.querySelectorAll('main > section[id]')).filter((s) => s.querySelector(':scope > .container > header h2, :scope > .container > h2, :scope > .container > .sh h2') && !['on-this-page', 'cta', 'learner-voice'].includes(s.id)).map((s) => s.id));
    for (const id of headed) expect(jumped.has(id), `#${id} has a jump label`).toBe(true);
    expect(links.map((l) => l.label)).toContain('Where We Are Heading');
  });

  test('the Programs hub keeps the plain trial sentence, the chart and the 77.9% tile; the income paragraph, the chart table and the 5.9% line are gone', async ({ page }) => {
    await open(page, 'programs/');
    const band = page.locator('#proof-band');
    const text = compact(await band.textContent());
    expect(text).toContain('For every 100 women offered a place, about 10 more were in work at follow-up than among 100 comparable women in the control group (+10.3 percentage points).');
    expect(text).toContain('77.9%');
    expect(text).not.toMatch(/41% higher|54% higher|5\.9%|View Chart Data as a Table/);
    await expect(band.locator('svg[role="img"]').first()).toBeVisible();
    await expect(band.locator('.ba__data')).toHaveCount(0);
  });

  test('Our Model ends its evidence paragraph after the employment result and carries no survey sentence', async ({ page }) => {
    await open(page, 'our-model/');
    const evidence = compact(await page.locator('#evidence .om__text').textContent());
    expect(evidence).toMatch(/10\.3 percentage points more likely to be employed\.$/);
    expect(evidence).not.toMatch(/41%|54%|77\.9%|surveyed completers/i);
    await expect(page.locator('#evidence a[href$="impact/independent-evaluation/"]')).toHaveCount(1);
  });

  test('the announcement bar states the trial result once and keeps its two links', async ({ page }) => {
    await open(page, '');
    const bar = page.locator('[data-promo]');
    const text = compact(await bar.locator('.promo-bar__long').textContent());
    expect(text).toBe('women offered a place were 10.3 percentage points more likely to be employed.');
    expect(compact(await bar.textContent())).not.toMatch(/Surveyed completers|77\.9%|47\.4%/);
    expect(await texts(page, '[data-promo] a')).toEqual(['Trial Results', 'Impact Survey 2026']);
  });
});

test.describe('Governments speaks to any ministry', () => {
  test('the Challenge heading no longer names a country; the 13.5% stays as the Bangladesh example inside the band', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#problem h2')).toHaveText('Training Budgets Need Employment Results');
    const tile = page.locator('#problem [data-fact="PX-03"]');
    await expect(tile).toContainText('13.5%');
    await expect(tile).toContainText('graduate unemployment in Bangladesh');
    await expect(page.locator('main h1')).toHaveText('Build a National Digital Workforce Through Graduates and Digital Labs');
  });

  test('the labs card speaks of existing labs and colleges, not 9,000+ labs in Bangladesh', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const card = page.locator('#mechanism .model__block', { hasText: 'Government Digital Labs' });
    expect(compact(await card.textContent())).toContain('Blended learning in government labs you already run; lab access and seats are confirmed per program.');
    expect(await mainText(page)).not.toContain('9,000+');
  });

  test('both onward links read "How YouthWIDE Works" and open the top of the YouthWIDE page', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const route = page.locator('#route-link a');
    await expect(route).toHaveText(/How YouthWIDE Works/);
    expect(await route.getAttribute('href')).toMatch(/\/programs\/youthwide\/$/);
    const mech = page.locator('#mechanism a', { hasText: 'See How YouthWIDE Works' });
    await expect(mech).toHaveCount(1);
    expect(await mech.getAttribute('href')).toMatch(/\/programs\/youthwide\/$/);
    expect(await mainText(page)).not.toContain('See YouthWIDE in Bangladesh');
  });
});

test.describe('corporate offer pages carry no youth-program trial block', () => {
  for (const route of ['partner-with-us/employers/', 'programs/jobready-work/']) {
    test(`${route}: no trial band, no survey or pathway figures, no "(Not Corporate Training)" labels; a two-link group stands in`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('#proof-band')).toHaveCount(0);
      await expect(page.locator('.pwp')).toHaveCount(0);
      await expect(page.locator('[data-trial-scope]')).toHaveCount(0);
      const text = await mainText(page);
      expect(text).not.toMatch(/10\.3|77\.9%|47\.4%|Not Corporate Training|This trial evaluated WSDFM/);
      const group = page.locator('nav[aria-label="Broader Evidence from Our Youth Programs"]');
      await expect(group).toHaveCount(1);
      expect(await texts(page, 'nav[aria-label="Broader Evidence from Our Youth Programs"] a')).toEqual(['The Randomized Trial', 'Impact Survey 2026']);
      const hrefs = await group.locator('a').evaluateAll((els) => els.map((a) => a.getAttribute('href') ?? ''));
      expect(hrefs.map((h) => h.replace(/^.*\/ctg\//, ''))).toEqual(['impact/independent-evaluation/', 'impact/outcomes-2026/']);
    });
  }

  test('Home keeps the paid-work pathways block that Employers lost', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#proof-band .pwp')).toHaveCount(1);
  });
});

test.describe('credibility comes before the vision on the audience pages', () => {
  for (const slug of AUDIENCE) {
    test(`${slug}: "Our Track Record" (#guide) sits directly before "What Success Looks Like" (#future); both are light bands, so the rhythm around them is unchanged`, async ({ page }) => {
      await open(page, `partner-with-us/${slug}/`);
      const order = await ids(page);
      expect(order.indexOf('guide'), 'guide band').toBeGreaterThan(-1);
      expect(order.indexOf('future'), 'future band').toBe(order.indexOf('guide') + 1);
      // both bands are on the light ground, as before the swap, so no dark band moved next to another
      const grounds = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => ({ id: s.id, dark: /band--(klein|deep-ink)/.test(s.className) })));
      const at = grounds.findIndex((g) => g.id === 'guide');
      expect(grounds[at].dark || grounds[at + 1].dark, 'guide and future are light bands').toBe(false);
    });
  }
});

test.describe('the positioning statements share one plain closing', () => {
  const CLOSING = 'We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work.';
  const PAGES = [
    'partner-with-us/development-partners/',
    'partner-with-us/governments/',
    'partner-with-us/foundations/',
    'partner-with-us/universities/',
    'partner-with-us/local-partners/',
    'partner-with-us/investors/',
    'programs/youthwide/',
    'programs/jobready-campus/',
  ];
  for (const route of PAGES) {
    test(`${route}: the audience sentence stays, the comparison sentence is gone`, async ({ page }) => {
      await open(page, route);
      const statement = compact(await page.locator('#mechanism .pos__text').textContent());
      expect(statement.endsWith(` ${CLOSING}`), 'ends with the shared closing').toBe(true);
      expect(statement.startsWith('For '), 'opens with its own audience sentence').toBe(true);
      expect(statement).not.toMatch(/Unlike approaches|randomized trial by BIGD|provision varies/);
    });
  }
});

test.describe('Foundations keeps the two grant routes apart', () => {
  test('the benefits table, the FAQ and the closing explanation speak of the cohort grant, then of the platform grant', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#features h2')).toHaveText('What Your Cohort Grant Gets');
    await expect(page.locator('#faq h2')).toHaveText('Questions About Cohort Grants');
    // WP32 (cycle-9 review): the closing band states what is discussed for each route; the four cohort-only steps are gone (tests/wp32.spec.ts pins the band)
    expect(await texts(page, '#next-steps .next__routes li')).toEqual([
      'For a cohort grant, we discuss your country, priority groups, tracks, budget and scorecard.',
      'For a platform grant, we discuss JobReady’s staged rollout. Details of what the grant delivers are discussed in the introductory call.',
    ]);
  });
});

test.describe('smaller wording fixes', () => {
  test('JobReady@Campus prints the pilot as delivery plus tracking, like every other page, never "tracking to month 23"', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    const first = page.locator('#offer .offer__duration').first();
    await expect(first).toHaveText('Pilot delivery runs 8–14 months. Outcome tracking continues for 12 months after each course.');
    expect(await mainText(page)).not.toContain('tracking to month 23');
  });

  test('Development Partners: priority groups are agreed in co-design, with women a priority in every group', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const block = page.locator('#mechanism .model__block', { hasText: 'Priority Groups' });
    expect(compact(await block.textContent())).toContain('Priority groups are agreed with you in co-design; women are a priority in every group.');
    expect(await mainText(page)).not.toMatch(/madrasah youth and third-gender people/);
  });

  test('Local Partners: mentoring comes "with Placement Support Alongside", not "Then Placement Support"', async ({ page }) => {
    await open(page, 'partner-with-us/local-partners/');
    const included = await texts(page, '#features .fc__included');
    expect(included).toContain('Three Months of Milestone-Based Mentoring with Placement Support Alongside');
    expect(included.join(' ')).not.toContain('Then Placement Support');
  });

  test('YouthWIDE: the vignette says "See Who Started Earning" (no attribution), and the page says the cohorts are designed for three regions', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    expect(await texts(page, '#future h3')).toContain('See Who Started Earning');
    expect(await mainText(page)).not.toContain('Know Whether the Budget Produced Earnings');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('designed for three regions');
    expect(description).not.toContain('in three regions');
    expect(description!.length).toBeLessThanOrEqual(155);
  });

  test('the YouthWIDE menu lines, the Programs card and the funding-route table say "designed for", and "builds on results from earlier programs"', async ({ page }) => {
    await open(page, 'programs/');
    const card = compact(await page.locator('#programs-grid li', { hasText: 'YouthWIDE' }).first().textContent());
    expect(card).toContain('designed as co-funded country cohorts for South Asia, MENA and Sub-Saharan Africa');
    expect(card).toContain('It builds on results from earlier programs in Bangladesh and Kosovo.');
    expect(card).not.toContain('outcome evidence so far');
    await open(page, '');
    const desc = compact(await page.locator('#mega-programs a.mega__link[href$="programs/youthwide/"] .mega__desc').textContent());
    expect(desc).toBe('Co-funded country cohorts, designed for South Asia, MENA and Sub-Saharan Africa, with a national initiative in Bangladesh.');
    expect(await page.evaluate(() => document.body.innerText.includes('across three regions'))).toBe(false);
  });

  test('"Review early progress at three months" (no work outcome can exist at month three)', async ({ page }) => {
    for (const route of ['', 'partner-with-us/local-partners/']) {
      await open(page, route);
      const text = await mainText(page);
      expect(text, route || 'home').toContain('Review early progress at three months');
      expect(text, route || 'home').not.toContain('Review early results at three months');
    }
  });

  test('jargon: "Training has to follow current employer demand" and "follow-up surveys" instead of "tracks have to follow" and "tracer surveys"', async ({ page }) => {
    for (const route of ['', 'programs/youthwide/', 'partner-with-us/development-partners/', 'partner-with-us/governments/', 'partner-with-us/local-partners/']) {
      await open(page, route);
      const text = await mainText(page);
      expect(text, route || 'home').not.toMatch(/[Tt]racks have to follow|Tracks and Evidence Fall Behind|[Tt]racer [Ss]urveys?|Tracers\b/);
    }
    await open(page, '');
    await expect(page.locator('#cost h2')).toHaveText('Training and Evidence Fall Behind While You Wait');
    expect(compact(await page.locator('#features .fc__included').nth(1).textContent())).toBe('Monthly Reports and Follow-Up Surveys, as Agreed in the Program Scope');
    await open(page, 'programs/youthwide/');
    expect(await texts(page, '#features .fc__included')).toContain('Baseline, Monthly Reports and Follow-Up Surveys, as Agreed in the Program Scope');
  });

  test('Home: no "outside Dhaka", no Latest News band after the final call to action, the carousel’s last slide is "Find Your Program"', async ({ page }) => {
    await open(page, '');
    expect(await mainText(page)).not.toContain('outside Dhaka');
    await expect(page.locator('#future')).toContainText('You hear from a young woman who invoices her first foreign client from her own laptop.');
    await expect(page.locator('#news, #news-teaser')).toHaveCount(0);
    const order = await ids(page);
    expect(order[order.length - 1], 'the page ends on its next steps').toBe('next-steps');
    await expect(page.locator('[data-hs-slide]').nth(6).locator('h2')).toHaveText('Find Your Program');
  });

  test('Home: the evidence band has no scope line (its tags and chart note carry the scope); the comparison drops the freelance-marketplace column', async ({ page }) => {
    await open(page, '');
    const band = page.locator('#proof-band');
    expect(compact(await band.locator('.he__head').textContent())).toBe('The EvidenceEvidence You Can Check');
    expect(compact(await band.textContent())).toContain('the trial of the predecessor program');
    expect(await texts(page, '#compare thead th')).toEqual(['Approach', 'CodersTrust Supported Cohort', 'Self-Paced Course Platforms']);
  });

  test('Partner with Us hub: the hero asks for the choice of partnership (WP32), "Not sure where you fit?" opens a prefilled email, three evidence tiles (trial, survey, reach), the investor card says "we are building"', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('.hero__lead').first()).toHaveText('Choose a partnership for youth employment, campus skills, team training, hiring or JobReady’s staged rollout.');
    const email = page.locator('.hub__helper a.btn');
    await expect(email).toContainText('Not Sure? Email Us Your Goals');
    const href = (await email.getAttribute('href')) ?? '';
    expect(href).toMatch(/^mailto:contact@coderstrust\.global\?subject=/);
    expect(decodeURIComponent(href)).toContain('Your goals: ');
    await expect(page.locator('.hub__helper a[href$="contact/"]')).toHaveCount(0);
    await expect(page.locator('#why-partner li')).toHaveCount(3);
    expect(await mainText(page)).not.toContain('The platform connecting emerging-market youth to work');
    await expect(page.locator('#audiences .grid-cards')).toContainText('JobReady, the platform we are building to connect emerging-market youth to work.');
  });

  test('Contact: the third step names employers hiring talent, in the Employers page’s own scope wording', async ({ page }) => {
    await open(page, 'contact/');
    const third = compact(await page.locator('#next .steps__item').nth(2).textContent());
    expect(third).toContain('Employers hiring talent: a talent request scoped against the experience and credentials available in the candidate pool.');
    await open(page, 'partner-with-us/employers/');
    expect(await mainText(page)).toContain('Talent requests are scoped against the experience and credentials available in the candidate pool.');
  });

  test('Development Partners and Governments show the trial and survey once as tiles and once as one full evidence band', async ({ page }) => {
    for (const slug of ['development-partners', 'governments']) {
      await open(page, `partner-with-us/${slug}/`);
      const text = await mainText(page);
      expect((text.match(/randomized trial by BIGD/gi) ?? []).length, `${slug}: the BIGD trial sentence`).toBe(1);
      await expect(page.locator('#proof-band')).toHaveCount(1);
      await expect(page.locator('#mechanism .pos__text')).not.toContainText('randomized trial');
    }
  });
});

test.describe('layout', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['', 'partner-with-us/', 'partner-with-us/governments/', 'partner-with-us/employers/', 'partner-with-us/foundations/', 'programs/', 'programs/youthwide/', 'programs/jobready-work/', 'programs/jobready-campus/', 'impact/', 'our-model/', 'contact/']) {
        await open(page, route);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over, route || 'home').toBeLessThanOrEqual(0);
      }
    });
  }

  test('the Home Track Record tiles start level whether or not one carries a tag', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, '');
    const tops = await page.locator('#guide .guide__tile .stat__value').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops).toHaveLength(2);
    expect(Math.abs(tops[0] - tops[1]), 'the two figures share a baseline').toBeLessThanOrEqual(2);
  });
});
