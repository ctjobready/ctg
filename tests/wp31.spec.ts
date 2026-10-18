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
  test('the 2.8× figure never reads as employment: Foundations no longer shows its tile (WP35), and the Independent Evaluation page words it as freelancing', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    expect(await mainText(page)).not.toMatch(/2\.8×|\(employment, women who attended\)/);
    await open(page, 'impact/independent-evaluation/');
    expect(await mainText(page)).toContain('freelancing 2.8× the control group');
  });

  test('the Impact survey tiles state shares, not growth multiples: 14.0% freelance (up from 6.2%), no "about 3×" beside the median', async ({ page }) => {
    await open(page, 'impact/');
    const glance = compact(await page.locator('#glance').textContent());
    expect(glance).toContain('14.0%');
    expect(glance).toContain('of surveyed completers freelance, up from 6.2% before training');
    // WP46 (cycle-22 review): the note keeps the business-ownership sentence only; the foreign-client income share (OC-07) is stated on the survey page, not stacked on this tile
    expect(glance).toContain('Business ownership rose from 2.8% to 10.6%.');
    expect(glance).not.toMatch(/Nearly one in eight|foreign clients or jobs abroad/);
    expect(glance).not.toMatch(/growth in freelancing|2\.3×|3\.8×|3× the median/);
    await open(page, 'impact/outcomes-2026/');
    const survey = await mainText(page);
    expect(survey).not.toMatch(/growth in freelancing|about 3× the median/);
  });

  // WP42 (cycle-19 review): the government slide is second, so the survey-income slide is the third. WP53 (owner decision 2026-10-16): it also carries the former speed slide's finding as one body line (OC-05), which does not repeat the heading
  test('Home slide 3 reads as what surveyed completers report; its one body line is the timing of first earnings (OC-05), not a repeat of the heading', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(2);
    await expect(slide.locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    await expect(slide.locator('.hs__lead')).toHaveCount(1);
    expect(await slide.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
    expect(compact(await slide.locator('.hs__lead').textContent())).not.toMatch(/income/i);
  });

  // WP45 (cycle-21 review): the slide states the offered-place women's income result (the employment result is the hero card's, the bar's and the >4× tile's), with the predecessor program named
  // WP50 (cycle-25 review, item 10): the fourth slide lists WSDFM again, as program records and not trial data, so a reader does not take its 71% for a second result of the trial (tests/wp50.spec.ts)
  test('Home slide 1 states the offered-place income result only; the program-results slide and the case card say the WSDFM 71% is program records, separate from the trial (WP42: it is the fourth slide)', async ({ page }) => {
    await open(page, '');
    const lead = compact(await page.locator('[data-hs-slide]').nth(0).locator('.hs__lead').textContent());
    expect(lead).toBe('In the predecessor WSDFM program, their monthly income was an estimated 41% higher than the control group’s, about +$27 a month.');
    await expect(page.locator('[data-hs-slide]').nth(3)).toContainText('WSDFM: 71% in work (711 of 1,000; program records, not trial data).');
    // WP51 (cycle-26 review): the Home card shows delivery context in place of the figure and its caption ("WSDFM program records (not trial data): 71% in work"), which the pages that keep the figure still print (below; tests/wp51.spec.ts)
    expect(compact(await page.locator('#cases article').first().textContent())).not.toContain('WSDFM program records');
  });

  // WP37 (cycle-14 review): Home's Her Power card says what was delivered instead of stating the figure (the program-results slide of the carousel states it; tests/wp37.spec.ts), so only the pages that show it carry the shared caption.
  // WP51 (cycle-26 review): Home's WSDFM card shows delivery context too (the fourth slide states its figure), so only the pages that show the figures carry the shared captions
  test('every WSDFM and Her Power case card reads the same wherever it shows its figure (Development Partners shows the shared Her Power caption; Home’s cards show delivery context)', async ({ page }) => {
    for (const route of ['', 'partner-with-us/development-partners/', 'partner-with-us/foundations/']) {
      await open(page, route);
      const cards = (await texts(page, '#cases article')).join(' | ');
      if (route === '') expect(cards, 'home').not.toContain('WSDFM program records (not trial data): 71% in work');
      else expect(cards, route).toContain('WSDFM program records (not trial data): 71% in work');
      if (cards.includes('Her Power')) {
        if (route === '') {
          expect(cards, 'home').toContain('Curriculum, trainer training and direct delivery for women’s digital skills.');
          expect(cards, 'home').not.toContain('372 of 800');
        } else {
          expect(cards, route).toContain('372 of 800 tracked women in work (47%), among the 2,500 women CodersTrust trained directly');
        }
        expect(cards, route || 'home').not.toContain('tracked women, from the 2,500 trained directly by CodersTrust, in work: 47%');
      }
    }
  });

  // WP38 (cycle-15 review): the Home Track Record band no longer shows the 31,200+ and 1.5M+ tiles (the government slide of the carousel, slide 2 since WP42, states both); the slide says what kind of figure the 31,200+ is in words
  // WP45 (cycle-21 review): the slide said it in GV-12's own note (the Impact and Governments wording), with Her Power's 25,125 women trained; WP48 (cycle-23 review): the slide keeps the note's first clause only (tests/wp48.spec.ts)
  test('the Home Track Record band has no tile for the six government contracts; slide 2 says the 31,200+ is contract scope, not a count of completers', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#guide .guide__tile, #guide [data-evidence="Contract Scope"]')).toHaveCount(0);
    expect(compact(await page.locator('[data-hs-slide]').nth(1).locator('.hs__lead').textContent())).toContain('31,200+ people. The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained).');
  });

  test('the National University relationship is worded one way: official training partner for digital career skills and credentials', async ({ page }) => {
    await open(page, '');
    const lead = compact(await page.locator('[data-hs-slide]').nth(1).locator('.hs__lead').textContent());
    // WP46 (cycle-22 review): the sentence names its subject ("CodersTrust is the official training partner of ..."), where it was a fragment
    expect(lead).toContain('CodersTrust is also the official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners.');
    expect(await mainText(page)).not.toContain('official skills partner');
  });

  test('the NHRDF contract cell reads the scope first, then the first batch inside it', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const row = page.locator('#contracts tbody tr', { hasText: 'NHRDF' });
    await expect(row).toContainText('Contract scope: 1,000+ trainees, 200 in the first batch');
    expect(await mainText(page)).not.toContain('200 trainees initially');
  });

  test('the Impact hub’s trial group is the one employment tile for women offered a place (WP35: the +41% and +54% income results and the >4× comparison are on the Independent Evaluation page)', async ({ page }) => {
    await open(page, 'impact/');
    const group = page.locator('#glance .glance__group', { has: page.getByRole('heading', { level: 3, name: 'Trial Results, Predecessor Program' }) });
    const facts = await group.locator('li a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]));
    expect(facts).toEqual(['RC-02']);
    await expect(group.locator('li').first()).toContainText('+10.3 percentage points');
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

  // WP41 (cycle-18 review): the hub states the trial as ONE line (the employment result, the predecessor program named) and keeps the 77.9% tile; the plain-language paragraph (WP31 kept it), the +10.3 pp tile and the chart
  // (WP31 kept them too) are gone, with the income paragraph and the 5.9% line before them (tests/wp41.spec.ts covers the band in full)
  test('the Programs hub states the trial as one line and keeps the 77.9% tile; the plain-language paragraph, the chart, the income paragraph and the 5.9% line are gone', async ({ page }) => {
    await open(page, 'programs/');
    const band = page.locator('#proof-band');
    const text = compact(await band.textContent());
    expect(text).toContain('Women offered a place in the predecessor WSDFM program were 10.3 percentage points more likely to be employed than the control group.');
    expect(text).toContain('77.9%');
    expect(text).not.toMatch(/For every 100 women|41% higher|54% higher|5\.9%|View Chart Data as a Table/);
    await expect(band.locator('svg[role="img"]')).toHaveCount(0);
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
  test('the Challenge heading no longer names a country, and (WP34, cycle-11 review) neither does its tile: the global 62 million (PX-01) stands where the Bangladesh 13.5% (PX-03) was', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#problem h2')).toHaveText('Training Budgets Need Employment Results');
    const tile = page.locator('#problem [data-fact="PX-01"]');
    await expect(tile).toContainText('62 million');
    await expect(page.locator('#problem [data-fact="PX-03"]')).toHaveCount(0);
    expect(compact(await page.locator('#problem').textContent())).not.toMatch(/13\.5%|Bangladesh/);
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

  // WP48 (cycle-23 review, item 13): Home's "Evidence You Can Check" band, which held the paid-work pathways block, is gone; the table stays on Impact Survey 2026 (tests/wp48.spec.ts)
  test('Home no longer carries the paid-work pathways block (it is on Impact Survey 2026)', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('.pwp')).toHaveCount(0);
    await expect(page.locator('#proof-band')).toHaveCount(0);
  });
});

// WP47 (owner decision 2026-10-15): the audience pages have no "What Success Looks Like" band (#future) any more, so credibility ("Our Track Record") comes after the problem band and is followed by the mechanism band (tests/wp47.spec.ts)
test.describe('credibility comes before the model on the audience pages', () => {
  for (const slug of AUDIENCE) {
    test(`${slug}: "Our Track Record" (#guide) sits directly after the problem band and directly before the mechanism band, and is a light band; there is no #future band`, async ({ page }) => {
      await open(page, `partner-with-us/${slug}/`);
      const order = await ids(page);
      expect(order.indexOf('guide'), 'guide band').toBe(order.indexOf('problem') + 1);
      expect(order.indexOf('future'), 'future band').toBe(-1);
      expect(order.indexOf('mechanism'), 'mechanism band').toBe(order.indexOf('guide') + 1);
      const grounds = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => ({ id: s.id, dark: /band--(klein|deep-ink)/.test(s.className) })));
      expect(grounds.find((g) => g.id === 'guide')!.dark, 'the guide is a light band').toBe(false);
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
    'programs/youthwide/',
    'programs/jobready-campus/',
  ];
  // WP39 (cycle-16 review): Investors carries no statement (it restated the hero and returned to cohort language; scripts/check-facts.mjs exempts that one page, tests/wp39.spec.ts holds the absence)
  // WP36 (cycle-13 review): YouthWIDE's hero and glance already say who the program is for and where it runs, so its statement is the two shared sentences alone, with the program as the subject
  // (scripts/check-facts.mjs declares it whole for that page); WP40 (cycle-17 review): Local Partners' statement is the two sentences that divide the work (declared whole as well); WP42 (cycle-19 reviews): Development
  // Partners and Governments state the two shared sentences with the reader named in the second (declared whole too); WP43 (cycle-20 review): JobReady@Campus' statement is two sentences with the program as the subject and the
  // reporting scoped ("as agreed in the program scope"; declared whole as well); every other page keeps its audience sentence and the shared closing
  const WHOLE: Record<string, string> = {
    'programs/youthwide/': 'YouthWIDE combines training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work.',
    'partner-with-us/local-partners/': 'Your organization mobilizes learners and hosts training. CodersTrust supports delivery, mentoring, placement and reporting.',
    'partner-with-us/development-partners/': 'We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports and outcome tracking after each course, as agreed in the program scope.',
    'partner-with-us/governments/': 'We combine training, mentoring and placement support in existing labs and colleges. Your agency receives monthly reports on progress toward paid work, as agreed in the program scope.',
    'programs/jobready-campus/': 'JobReady@Campus combines certification exam preparation, mentoring and placement support in campus labs alongside academic studies. Institutions receive monthly reports on progress toward paid work, as agreed in the program scope.',
    // WP44 (cycle-21 review): Foundations and Universities are declared whole too (tests/wp44.spec.ts)
    'partner-with-us/foundations/': 'Fund a YouthWIDE cohort or JobReady’s platform infrastructure. For cohort grants, we agree a pilot scorecard and combine training, mentoring and placement support, with monthly progress reports.',
    'partner-with-us/universities/': 'JobReady@Campus combines training, mentoring and placement support in campus labs alongside academic studies. Your institution receives monthly reports on progress toward paid work, as agreed in the program scope.',
  };
  for (const route of PAGES) {
    test(`${route}: ${WHOLE[route] ? 'the statement is the two sentences declared for this page' : 'the audience sentence stays, the comparison sentence is gone'}`, async ({ page }) => {
      await open(page, route);
      const statement = compact(await page.locator('#mechanism .pos__text').textContent());
      if (WHOLE[route]) {
        expect(statement).toBe(WHOLE[route]);
      } else {
        expect(statement.endsWith(` ${CLOSING}`), 'ends with the shared closing').toBe(true);
        expect(statement.startsWith('For '), 'opens with its own audience sentence').toBe(true);
      }
      expect(statement).not.toMatch(/Unlike approaches|randomized trial by BIGD|provision varies/);
    });
  }
});

test.describe('Foundations keeps the two grant routes apart', () => {
  test('the benefits table, the FAQ and the closing explanation speak of the cohort grant, then of the platform grant', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#features h2')).toHaveText('What Your Cohort Grant Gets');
    await expect(page.locator('#faq h2')).toHaveText('Questions About Cohort Grants');
    // WP32 (cycle-9 review): the four cohort-only steps were gone; WP34 (cycle-11 review): what is discussed for each route is said once, in the call-to-action band; WP46 (cycle-22 review): the Next Steps band
    // has the four steps again, scoped "For cohort grants." (tests/wp32.spec.ts and tests/wp34.spec.ts pin the two)
    expect(compact(await page.locator('#cta [data-session-agenda]').textContent())).toBe(
      'For a cohort grant, we discuss your country, priority groups, tracks, budget and scorecard. For a platform grant, we discuss JobReady’s staged rollout.',
    );
    expect(compact(await page.locator('#next-steps .lead').textContent())).toBe('For cohort grants.');
    expect(compact(await page.locator('#next-steps').textContent())).not.toContain('introductory call');
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

  // WP39 (cycle-16 review): the features band is three short cards
  test('Local Partners: mentoring comes "with placement support alongside", not "then placement support"', async ({ page }) => {
    await open(page, 'partner-with-us/local-partners/');
    const cards = (await texts(page, '#features .card__text')).join(' ');
    expect(cards).toContain('Three months of milestone-based mentoring, with placement support alongside');
    expect(cards.toLowerCase()).not.toContain('then placement support');
  });

  test('YouthWIDE: no vignette is attributed to a funder ("Know Whether the Budget Produced Earnings"), and the page says the cohorts are designed for three regions', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    // WP41 (cycle-18 review): the "What Success Looks Like" band is about young people earning, so the "See Who Started Earning" vignette is gone (tests/wp41.spec.ts)
    expect(await texts(page, '#future h3')).not.toContain('See Who Started Earning');
    expect(await mainText(page)).not.toContain('Know Whether the Budget Produced Earnings');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('designed for three regions');
    expect(description).not.toContain('in three regions');
    expect(description!.length).toBeLessThanOrEqual(155);
  });

  test('the YouthWIDE menu lines, the Programs card and the funding-route table say "designed for", and "builds on results from earlier programs"', async ({ page }) => {
    await open(page, 'programs/');
    const card = compact(await page.locator('#programs-grid li', { hasText: 'YouthWIDE' }).first().textContent());
    expect(card).toContain('designed as co-funded country cohorts for South Asia, the Middle East and North Africa, and Sub-Saharan Africa');
    expect(card).toContain('It builds on results from earlier programs in Bangladesh and Kosovo.');
    expect(card).not.toContain('outcome evidence so far');
    await open(page, '');
    const desc = compact(await page.locator('#mega-programs a.mega__link[href$="programs/youthwide/"] .mega__desc').textContent());
    // WP54 (cycle-28 review, Claude S7): the line no longer carries the Bangladesh aim (tests/wp54.spec.ts)
    expect(desc).toBe('Co-funded country cohorts, designed for three regions, from training to paid digital work.');
    expect(await page.evaluate(() => document.body.innerText.includes('across three regions'))).toBe(false);
  });

  // WP48 (cycle-23 review, item 23): Home's "Low Risk" band (the risk-reversal cards) is gone, so only the audience pages that keep the band carry the sentence; Home has none
  test('"Review early progress at three months" (no work outcome can exist at month three)', async ({ page }) => {
    for (const route of ['partner-with-us/local-partners/']) {
      await open(page, route);
      const text = await mainText(page);
      expect(text, route).toContain('Review early progress at three months');
      expect(text, route).not.toContain('Review early results at three months');
    }
    await open(page, '');
    expect(await mainText(page), 'home').not.toContain('Review early results at three months');
  });

  test('jargon: "Training has to follow current employer demand" and "follow-up surveys" instead of "tracks have to follow" and "tracer surveys"', async ({ page }) => {
    for (const route of ['', 'programs/youthwide/', 'partner-with-us/development-partners/', 'partner-with-us/governments/', 'partner-with-us/local-partners/']) {
      await open(page, route);
      const text = await mainText(page);
      expect(text, route || 'home').not.toMatch(/[Tt]racks have to follow|Tracks and Evidence Fall Behind|[Tt]racer [Ss]urveys?|Tracers\b/);
    }
    await open(page, '');
    await expect(page.locator('#cost h2')).toHaveText('Training and Evidence Fall Behind While You Wait');
    // WP38: Home's band is three short cards; WP45 (cycle-21 review): the reporting card is one line about the monthly reports (the "follow-up surveys" are in Home's FAQ answer)
    expect(compact(await page.locator('#features .card__text').nth(1).textContent())).toBe('Monthly reports will show progress toward paid work, as agreed in the program scope.');
    expect(compact(await page.locator('#faq').textContent())).toContain('follow-up surveys at 3, 6 and 12 months');
    await open(page, 'programs/youthwide/');
    // WP39 (cycle-16 review): YouthWIDE's features band was three short cards; the second said "follow-up surveys". WP57 (cycle-29 review, GPT-6.1 Sol G2): the band is gone, and the glance's Reporting row says them
    await expect(page.locator('#features')).toHaveCount(0);
    const reporting = page.locator('.pg__row', { has: page.locator('dt', { hasText: 'Reporting' }) });
    expect(compact(await reporting.locator('dd').textContent())).toContain('Monthly reports and follow-up surveys');
  });

  // WP53 (owner decision 2026-10-16): the carousel's programs slide ("Find Your Program") is gone, so its last slide is the program results
  test('Home: no "outside Dhaka", no Latest News band after the final call to action, the carousel’s last slide is "Results by Program"', async ({ page }) => {
    await open(page, '');
    expect(await mainText(page)).not.toContain('outside Dhaka');
    await expect(page.locator('#future')).toContainText('A young woman in your cohort invoices her first foreign client from her own laptop.');
    await expect(page.locator('#news, #news-teaser')).toHaveCount(0);
    const order = await ids(page);
    expect(order[order.length - 1], 'the page ends on its next steps').toBe('next-steps');
    await expect(page.locator('[data-hs-slide]')).toHaveCount(4);
    await expect(page.locator('[data-hs-slide]').nth(3).locator('h2')).toHaveText('Results by Program');
  });

  // WP48 (cycle-23 review): the evidence band (it had no scope line and no trial sub-heading) is gone from Home (tests/wp48.spec.ts); the comparison below it is unchanged
  test('Home: the evidence band is gone; the comparison drops the freelance-marketplace column', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#proof-band')).toHaveCount(0);
    expect(await texts(page, '#compare thead th')).toEqual(['Approach', 'CodersTrust Supported Cohort', 'Self-Paced Course Platforms']);
  });

  test('Partner with Us hub: the hero asks for the choice of partnership (WP32) with one "See Partnership Routes" button and no email before the closing call to action (WP35), three evidence tiles (trial, survey, reach), the investor card says "we are building"', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('.hero__lead').first()).toHaveText('Choose a partnership for youth employment, campus skills, team training, hiring or JobReady’s staged rollout.');
    await expect(page.locator('#hero .btn')).toHaveText('See Partnership Routes');
    await expect(page.locator('#hero a[href^="mailto:"], #audiences a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.locator('#why-partner li')).toHaveCount(3);
    expect(await mainText(page)).not.toContain('The platform connecting emerging-market youth to work');
    await expect(page.locator('#audiences .grid-cards')).toContainText('JobReady, CodersTrust’s digital learning and earning platform.');
  });

  // WP54 (cycle-28 review, GPT-6.1 Sol G7): the step's recap is shorter ("Employers: a needs assessment, or a talent request scoped against the candidate pool."); the Employers page keeps the full scope wording
  test('Contact: the third step names employers hiring talent, scoped against the candidate pool, as the Employers page scopes it', async ({ page }) => {
    await open(page, 'contact/');
    const third = compact(await page.locator('#next .steps__item').nth(2).textContent());
    expect(third).toContain('Employers: a needs assessment, or a talent request scoped against the candidate pool.');
    await open(page, 'partner-with-us/employers/');
    expect(await mainText(page)).toContain('Talent requests are scoped against the experience and credentials available in the candidate pool.');
  });

  test('Development Partners and Governments show the trial and survey once, as tiles, with a strip of links in the proof band (WP35: no second full evidence band)', async ({ page }) => {
    for (const slug of ['development-partners', 'governments']) {
      await open(page, `partner-with-us/${slug}/`);
      const text = await mainText(page);
      expect((text.match(/randomized trial by/gi) ?? []).length, `${slug}: no BIGD trial sentence`).toBe(0);
      await expect(page.locator('#proof-band')).toHaveCount(1);
      await expect(page.locator('#proof-band .proofband')).toHaveCount(0);
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

  // WP38 (cycle-15 review): the two Track Record tiles are gone from Home, so there is no pair of figures to start level; the copy column is what the band holds, and it fits at both widths
  test('the Home Track Record band holds its copy and its logos and no figure tile, with no sideways scroll at 1280 or 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      await expect(page.locator('#guide .stat')).toHaveCount(0);
      await expect(page.locator('#guide .guide__copy')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${vp.width}px`).toBe(true);
    }
  });
});
