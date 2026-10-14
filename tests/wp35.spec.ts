import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP35 behaviors (cycle-12 whole-site review): the Impact overview is lighter, the survey is stated as what completers report (no multiplier, no "+30.5 percentage points", no "Difference" row on the audience pages),
 * the trial and survey are shown once per page (Home's evidence band and the proof bands of Development Partners, Governments and Foundations no longer restate them), the WSDFM tile leaves Home's third
 * slide and the audience pages' Results at a Glance, the Partner with Us hub chooses a route instead of opening an email, the evaluator (BIGD) is spelled out where a page first names it, and the smaller
 * wording fixes. Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp35.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
/** The ids of main's bands in page order (nested sections, such as the funding-route comparison inside Foundations' mechanism band, are not bands). */
const bandIds = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main .band[id]')).map((s) => s.id));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

const THREE = ['development-partners', 'governments', 'foundations'];
const SPELLED = 'BRAC Institute of Governance and Development (BIGD)';

test.describe('Impact overview: Results at a Glance and the jump list', () => {
  test('the trial group is one tile, the employment result for women offered a place (RC-02), linked to the Independent Evaluation page', async ({ page }) => {
    await open(page, 'impact/');
    const group = page.locator('#glance .glance__group', { has: page.getByRole('heading', { level: 3, name: 'Trial Results, Predecessor Program' }) });
    await expect(group.locator('li')).toHaveCount(1);
    const tile = group.locator('li a');
    expect(await tile.getAttribute('data-fact')).toBe('RC-02');
    await expect(tile).toContainText('+10.3 pp');
    await expect(tile).toContainText('more employment for women offered a place (randomized trial of a predecessor program)');
    await expect(tile.locator('[data-evidence="Randomized Trial"]')).toHaveCount(1);
    expect(await tile.getAttribute('href')).toMatch(/\/impact\/independent-evaluation\/$/);
    expect(compact(await page.locator('#glance').textContent())).not.toMatch(/\+41%|\+54%|>4×|in percentage points/);
  });

  test('the income results (+41%, +54%) and the comparison with nine trials (>4×) are on the Independent Evaluation page the tile links', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    const text = await mainText(page);
    expect(text).toContain('estimated 41% higher');
    expect(text).toContain('income was 54% higher');
    expect(text).toContain('Over Four Times the Average of Nine Training Trials');
  });

  test('the "Go Deeper" band is gone (it repeated On This Page and the menu); the jump list names the bands that remain; the seven goals keep the owner’s wording', async ({ page }) => {
    await open(page, 'impact/');
    await expect(page.locator('#explore')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Go Deeper');
    expect(await texts(page, 'nav[aria-label="On this page"] a')).toEqual(['In Short', 'Results at a Glance', 'Four Programs', 'Four Kinds of Evidence', 'Where We Are Heading', 'Seven Global Goals']);
    expect(compact(await page.locator('#sdg').textContent())).toContain('CodersTrust’s training-to-employment model aligns with seven SDGs, with a primary focus on Quality Education, Gender Equality, and Decent Work and Economic Growth');
    // the band order keeps its rhythm: no two dark bands in a row
    const dark = await page.evaluate(() => Array.from(document.querySelectorAll('main .band')).map((b) => /band--(klein|deep-ink)/.test(b.className)));
    for (let i = 1; i < dark.length; i++) expect(dark[i] && dark[i - 1], `band ${i}`).toBe(false);
  });

  test('the survey group says once that the survey is of surveyed completers in Bangladesh (OC-09: respondents live in 58 of the country’s 64 districts)', async ({ page }) => {
    await open(page, 'impact/');
    await expect(page.getByRole('heading', { level: 3, name: 'Survey Results, Among Surveyed Completers in Bangladesh' })).toHaveCount(1);
    expect(count(compact(await page.locator('#glance').textContent()), 'in Bangladesh')).toBe(1);
  });

  test('Home’s survey proof card says in its caption that the survey is of surveyed completers in Bangladesh, and the three proof figures start level at tablet widths too', async ({ page }) => {
    await open(page, '');
    const card = page.locator('.hh__card[data-fact="OC-01"]');
    await expect(card.locator('.hh__eyebrow')).toHaveText('Impact Survey 2026');
    await expect(card.locator('.stat__label')).toHaveText('employed, up from 47.4% before training, among surveyed completers in Bangladesh at the October 2026 survey');
    for (const width of [390, 768, 820, 900, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const tops = await page.locator('.hh__card').evaluateAll((cards) => cards.map((c) => Math.round((c.querySelector('.hh__figvalue, .stat__value') as HTMLElement).getBoundingClientRect().top - c.getBoundingClientRect().top)));
      expect(new Set(tops).size, `the three figures sit at the same height in their cards at ${width}px: ${tops.join(', ')}`).toBe(1);
    }
  });

  test('the 31,200+ note says the total is contract scope, not a count of completers, and that Her Power’s 25,125 women were trained; Impact and Governments read the same register line', async ({ page }) => {
    const NOTE = 'The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained).';
    await open(page, 'impact/');
    await expect(page.locator('#glance a[data-fact~="GV-12"] .glance__note')).toHaveText(NOTE);
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#glance li', { hasText: '31,200+' }).locator('.pg__note')).toHaveText(NOTE);
    expect(await mainText(page)).not.toMatch(/delivered-training total|Includes Her Power’s 25,125 women/);
  });
});

test.describe('survey figures say what completers report, not an effect', () => {
  const PAGES = ['impact/', 'partner-with-us/', 'partner-with-us/development-partners/', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/universities/', 'partner-with-us/local-partners/', 'our-model/talentleap/'];
  for (const route of PAGES) {
    test(`${route}: no "+30.5 percentage points", no "about 3×" and no "Difference" row on a survey chart`, async ({ page }) => {
      await open(page, route);
      expect(await mainText(page)).not.toMatch(/\+30\.5|about 3×|percentage-point change/);
      await expect(page.locator('.ba__data th', { hasText: 'Difference' })).toHaveCount(0);
      await expect(page.locator('.ba-delta')).toHaveCount(0);
    });
  }

  test('the survey employment tile reads "Up from 47.4% before training." on Impact and on the hub', async ({ page }) => {
    await open(page, 'impact/');
    await expect(page.locator('#glance a[data-fact~="OC-01"] .glance__note')).toHaveText('Up from 47.4% before training.');
    await open(page, 'partner-with-us/');
    await expect(page.locator('#why-partner li[data-fact="OC-01"] .wp__note')).toHaveText('Up from 47.4% before training.');
  });

  test('Universities states the median income as two readings, with no "rose" and no multiplier', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    const list = compact(await page.locator('#proof-band .ev').textContent());
    expect(list).toContain('Among surveyed completers, median monthly income was $245 at the October 2026 survey, against $82 before training.');
    expect(list).not.toMatch(/rose from|3×/);
    expect(await page.locator('#proof-band .ba__data tbody tr').count(), 'two rows: before and at the survey, no difference row').toBe(2);
  });

  test('the Impact Survey 2026 page keeps its own descriptive "Change" chip: it is the survey’s data page and says the survey does not show cause', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    await expect(page.locator('.ba__data th', { hasText: 'Change' })).toHaveCount(1);
    const text = await mainText(page);
    expect(text).toContain('+30.5 percentage points');
    expect(text).toContain('does not show that training caused the change');
    expect(text).not.toMatch(/LimeSurvey|112268/);
  });
});

test.describe('the trial and the survey are shown once per page', () => {
  test('Home: the evidence band keeps the paid-work pathways and the 72.3% tile; the trial sub-block, its plain-language sentence and its sub-heading are gone, a text link to the trial results stays', async ({ page }) => {
    await open(page, '');
    const band = page.locator('#proof-band');
    await expect(band.locator('h2')).toHaveText('Evidence You Can Check');
    expect(await texts(page, '#proof-band h3')).toEqual(['Paid-Work Pathways Among Surveyed Completers']);
    await expect(band.locator('.he__trial')).toHaveCount(0);
    await expect(page.locator('[data-plain-line]')).toHaveCount(0);
    await expect(band.locator('[data-fact="OC-02"]')).toContainText('34 of 47 surveyed 2014–2023 completers with no prior income were earning at the October 2026 survey');
    await expect(band.locator('[data-fact="OC-04"]')).toHaveCount(1);
    expect(compact(await band.textContent())).not.toMatch(/10\.3|predecessor|randomized/i);
    expect(await texts(page, '#proof-band .he__links a')).toEqual(['Read the Trial Results', 'Impact Survey 2026']);
    expect((await hrefs(page, '#proof-band .he__links a')).map((h) => h.replace(/^.*\/ctg\//, ''))).toEqual(['impact/independent-evaluation/', 'impact/outcomes-2026/']);
  });

  test('Home: the hero’s "Strongest Proof" card carries the plain-language reading of the trial (the check:facts anchor moved here), and the first slide still states the offered-place results', async ({ page }) => {
    await open(page, '');
    const card = page.locator('.hh__card[data-fact="RC-02"]');
    await expect(card.locator('.hh__eyebrow')).toHaveText('Randomized Trial');
    await expect(card.locator('.hh__num')).toHaveText('+10.3');
    await expect(card.locator('.hh__unit')).toHaveText('percentage points');
    await expect(card.locator('.hh__figlabel')).toHaveText('For every 100 women offered a place in a 200-hour predecessor program, about 10 more were in work than in the control group.');
    expect(compact(await page.locator('[data-hs-slide]').nth(0).locator('.hs__lead').textContent())).toContain('10.3 percentage points more likely to be employed');
  });

  for (const slug of THREE) {
    test(`${slug}: #proof-band is a strip of two links under "See the Evidence Behind the Results"; no chart, no figure and no second trial or survey block`, async ({ page }) => {
      await open(page, `partner-with-us/${slug}/`);
      const strip = page.locator('#proof-band');
      await expect(strip).toHaveCount(1);
      await expect(strip.locator('h2')).toHaveText('See the Evidence Behind the Results');
      expect(await texts(page, '#proof-band a')).toEqual(['Read the Trial Results', 'Impact Survey 2026']);
      expect((await hrefs(page, '#proof-band a')).map((h) => h.replace(/^.*\/ctg\//, ''))).toEqual(['impact/independent-evaluation/', 'impact/outcomes-2026/']);
      await expect(strip.locator('svg:not(.icon), .stat, .ba, [data-fact]')).toHaveCount(0);
      await expect(page.locator('[data-plain-line], main .ba, #proof-band .proofband')).toHaveCount(0);
      const text = await mainText(page);
      expect(text).not.toMatch(/An Independent Randomized Trial|What Surveyed Completers Report|Employment Among Surveyed Completers|View Chart Data as a Table|found that women offered a place/);
      // Results at a Glance still carries the trial figure
      await expect(page.locator('#glance [data-evidence="Randomized Trial"]').first()).toBeVisible();
    });

    test(`${slug}: the strip sits right after the mechanism band, on a light ground (so no two dark bands meet), and keeps one primary button on the page's closing call to action`, async ({ page }) => {
      await open(page, `partner-with-us/${slug}/`);
      const order = await bandIds(page);
      expect(order.indexOf('proof-band')).toBe(order.indexOf('mechanism') + 1);
      expect(await page.locator('#proof-band').getAttribute('class')).toMatch(/band--(airy|ice|white)/);
      await expect(page.locator('#cta .btn--primary')).toHaveCount(1);
    });
  }
});

test.describe('the WSDFM 71% leaves the carousel and the glance tiles (the case cards and the case study keep it)', () => {
  test('Home slide 3 lists three programs: Women in Online Work, UNDP YES and Her Power', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(2);
    await expect(slide.locator('h2')).toHaveText('Results by Program');
    await expect(slide.locator('.hs__lead')).toHaveText('Three programs, each with its partner, with results from their own program records.');
    await expect(slide.locator('.hs__lines li')).toHaveText(['Women in Online Work, Kosovo: 68% in work.', 'UNDP YES, Korail: 67% found a first job within three months.', 'Her Power: 47% of 800 tracked women in work.']);
  });

  test('Results at a Glance on Development Partners, Governments and Foundations carries no WSDFM tile; Kosovo takes its place where it led', async ({ page }) => {
    for (const slug of THREE) {
      await open(page, `partner-with-us/${slug}/`);
      await expect(page.locator('#glance [data-fact~="PR-01"]'), slug).toHaveCount(0);
      expect(compact(await page.locator('#glance').textContent()), slug).not.toMatch(/711 of 1,000|WSDFM/);
    }
    await open(page, 'partner-with-us/development-partners/');
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-02', 'OC-01', 'PR-02']);
    await open(page, 'partner-with-us/foundations/');
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-04', 'OC-03', 'PR-02']);
    await open(page, 'partner-with-us/governments/');
    expect(await page.locator('#glance .pg__more a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['PR-02']);
  });

  test('the Proof in Practice cards and the case study still state the WSDFM program records, apart from the trial', async ({ page }) => {
    for (const route of ['', 'partner-with-us/development-partners/', 'partner-with-us/foundations/']) {
      await open(page, route);
      expect((await texts(page, '#cases article')).join(' | '), route || 'home').toContain('WSDFM program records, separate from the trial: 71% in work');
    }
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    expect(await mainText(page)).toContain('711 of 1,000');
  });
});

test.describe('the evaluator is spelled out where a page first names it', () => {
  test('Home names BIGD nowhere: the Impact menu line no longer introduces the acronym', async ({ page }) => {
    await open(page, '');
    expect(await page.content()).not.toContain('BIGD');
    await expect(page.locator('#mega-impact a.mega__link[href$="independent-evaluation/"] .mega__desc')).toHaveText('The randomized trial of a predecessor program.');
  });

  test('Foundations: the track-record band spells it out; the benefits card (later) uses the acronym', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const text = await mainText(page);
    expect(text.indexOf('BIGD')).toBe(text.indexOf(SPELLED) + SPELLED.length - 'BIGD)'.length);
    expect(compact(await page.locator('#guide').textContent())).toContain(`The ${SPELLED} separately evaluated the predecessor WSDFM program, commissioned by Porticus, in a randomized trial.`);
    expect(count(text, SPELLED)).toBe(1);
    expect(compact(await page.locator('#features').textContent())).toContain('A randomized trial by BIGD on the predecessor WSDFM program');
  });

  test('Development Partners and Governments no longer name the evaluator at all (their proof band is a strip of links)', async ({ page }) => {
    for (const slug of ['development-partners', 'governments']) {
      await open(page, `partner-with-us/${slug}/`);
      expect(await mainText(page), slug).not.toContain('BIGD');
    }
  });

  test('Impact: the evidence-ladder row is the first mention and spells it out; the "Go Deeper" card that repeated it is gone', async ({ page }) => {
    await open(page, 'impact/');
    const row = compact(await page.locator('#evidence-ladder tbody tr').first().locator('th').textContent());
    expect(row).toContain(`Independent Evaluation by the ${SPELLED}`);
    const text = await mainText(page);
    expect(text.indexOf('BIGD')).toBe(text.indexOf(SPELLED) + SPELLED.length - 'BIGD)'.length);
    expect(count(text, 'BIGD')).toBe(1);
  });

  test('the proof band that Universities and Local Partners keep spells it out in its trial headline', async ({ page }) => {
    for (const slug of ['universities', 'local-partners']) {
      await open(page, `partner-with-us/${slug}/`);
      const head = compact(await page.locator('.proofband__head').textContent());
      expect(head, slug).toContain(`A randomized trial by the ${SPELLED} found that women offered a place`);
      expect(count(await mainText(page), 'BIGD'), slug).toBe(1);
    }
  });
});

test.describe('Partner with Us hub', () => {
  test('the hero has one button, "Choose Your Route", that jumps to the route cards, and no email button comes before the closing call to action', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const hero = page.locator('#hero');
    await expect(hero.locator('.btn')).toHaveCount(1);
    await expect(hero.locator('.btn')).toHaveText('Choose Your Route');
    expect(await hero.locator('.btn').getAttribute('href')).toBe('#audiences');
    await expect(hero.locator('.routelinks, a.link')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Not Sure? Email Us Your Goals');
    // the due-diligence item keeps its text link "Ask About Due Diligence"; no email BUTTON sits outside the closing call to action
    const outside = await page.locator('main a.btn[href^="mailto:"]').evaluateAll((els) => els.filter((a) => !a.closest('#cta')).length);
    expect(outside, 'mailto buttons outside the closing call to action').toBe(0);
    // the closing call to action (a dark band, so its button is the inverse one) holds the page's one email button
    await expect(page.locator('#cta a.btn')).toHaveCount(1);
    await expect(page.locator('#cta a.btn')).toHaveText(/Request a Discovery Session/);
  });

  test('the jump lands on the route cards', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'partner-with-us/');
    await page.locator('#hero .btn').click();
    await expect(page).toHaveURL(/#audiences$/);
    await expect(page.locator('#audiences h2')).toBeInViewport();
  });

  test('the route-card helper keeps one line, "Already know the program you need? See Programs", with no email button and no second route chooser', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('.hub__helper')).toHaveCount(0);
    const line = page.locator('#audiences .hub__programs');
    expect(compact(await line.textContent())).toBe('Already know the program you need? See Programs');
    expect(await line.locator('a').getAttribute('href')).toMatch(/\/programs\/$/);
    await expect(page.locator('#audiences a.btn')).toHaveCount(0);
  });

  test('the foundations route card, the audience router and the Partner with Us menu say "fund outcomes you can track"', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('#audiences .grid-cards')).toContainText('For foundations and CSR teams: fund outcomes you can track.');
    await expect(page.locator('#mega-partner a.mega__link[href$="foundations/"] .mega__desc')).toHaveText('Fund outcomes you can track.');
    await open(page, '');
    await expect(page.locator('#router')).toContainText('Fund outcomes you can track');
    for (const route of ['', 'partner-with-us/', '404.html']) {
      await open(page, route);
      expect(await page.content(), route || 'home').not.toContain('outcomes you can verify');
    }
  });

  test('the reporting band is two sentences and a link: monthly reports from the first cohort, a quarterly review with you that decides corrective action and expansion', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const band = page.locator('#review-cycle');
    await expect(band.locator('h2')).toHaveText('Monthly Reports and Quarterly Reviews');
    await expect(band.locator('.sh__lead')).toHaveText('Monthly reports from the first cohort. A quarterly review with you decides corrective action and expansion.');
    expect(await band.getAttribute('data-fact')).toBe('PD-08 PD-11');
    await expect(band.locator('a')).toHaveText('See What YouthWIDE Reports');
    await expect(band.locator('h3, ul, ol, li, .rc__panel')).toHaveCount(0);
    // the pages that link to the band (Foundations, Development Partners, the due-diligence view) still land on #review-cycle
    expect((await hrefs(page, '#due-diligence a')).some((h) => h.endsWith('/partner-with-us/#review-cycle'))).toBe(true);
  });
});

test.describe('plain words and plain claims', () => {
  test('Development Partners: "Training designed to reach hard-to-reach groups"; Governments: "Trainers and curricula designed to stay in your system" (designed, not achieved)', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const dp = await texts(page, '#features .fc__benefit');
    expect(dp).toContain('Training designed to reach hard-to-reach groups');
    expect(dp.join(' ')).not.toContain('Training that reaches');
    await open(page, 'partner-with-us/governments/');
    const gov = await texts(page, '#features .fc__benefit');
    expect(gov).toContain('Trainers and curricula designed to stay in your system');
    expect(gov.join(' ')).not.toContain('curricula that stay');
  });

  test('Foundations: the independent-evidence card says the evidence is on the predecessor program and that evaluating your own cohort is welcome, once', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const card = page.locator('#features .fc__card', { hasText: 'Independent evidence is thin' });
    await expect(card.locator('.fc__included')).toHaveText('A randomized trial by BIGD on the predecessor WSDFM program');
    await expect(card.locator('.fc__benefit')).toHaveText('Independent evidence on the predecessor program');
    await expect(card.locator('.fc__means')).toHaveText('Independent evaluation of your cohort is welcome.');
    const text = await mainText(page);
    expect(text).not.toMatch(/Independent evidence on a CodersTrust program|fund a model with independent evidence/);
    expect(count(compact(await card.textContent()), 'independent evaluation'.toLowerCase()) + count(compact(await card.textContent()), 'Independent evaluation')).toBe(1);
  });

  test('Governments: "What a Ministry Sees" names the follow-up surveys at 3, 6 and 12 months in its lead; the contracts table and the services line use plain words', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#ministry-sees .sh__lead')).toHaveText('Planned for every cohort, as agreed in the program scope. Reports run monthly, with follow-up surveys at 3, 6 and 12 months after each course.');
    const contracts = await texts(page, '#contracts tbody td:nth-child(2)');
    expect(contracts).toContain('Training in digital technologies');
    expect(contracts).toContain('Training for staff on the learning platform and lab operations');
    const text = await mainText(page);
    expect(text).toContain('Training for staff on the learning platform and lab operations.');
    expect(text).not.toMatch(/4IR|LMS and operation/);
  });

  test('FAQ: the cost answer is three sentences and the safeguarding answer says "data with personal details protected"', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const answer = async (q: string) => {
      const item = page.locator('#faqs details', { has: page.locator('summary', { hasText: q }) });
      return compact(await item.locator('.faq__a').textContent());
    };
    const cost = await answer('What Does It Cost?');
    expect(cost).toBe(
      'Pricing is set per program, and we share an indicative budget in the discovery session. Standard inclusions are outreach and selection, blended training, an AI-ready curriculum, certification exam preparation (exam fee included), three months of mentoring, placement support, monthly reports and outcome tracking for 12 months after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where needed.',
    );
    const safeguarding = await answer('What About Safeguarding and Data Protection?');
    expect(safeguarding).toBe(
      'Safeguarding and data protection are specified for each program and agreed before enrollment. Each program design covers accessible selection, consent-based data collection, protected records, grievance handling, harassment and fraud response and referral pathways. Guardian consent and supervision apply to anyone under 18, and funders receive data with personal details protected.',
    );
    for (const a of [cost, safeguarding]) expect(a.split(/(?<=[.!?])\s+(?=[A-Z“])/).length).toBeLessThanOrEqual(3);
    await open(page, 'about/governance/');
    const text = await mainText(page);
    expect(text).toContain('funders receive data with personal details protected and monthly reports');
    expect(text).not.toContain('privacy-appropriate');
  });

  test('the ranked pains ("What Gets in the Way") are Title Case card titles on every page that renders them', async ({ page }) => {
    for (const route of ['', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/development-partners/', 'partner-with-us/universities/', 'partner-with-us/local-partners/', 'programs/youthwide/']) {
      await open(page, route);
      const qs = await texts(page, '.gp__q');
      expect(qs.length, route || 'home').toBeGreaterThanOrEqual(3);
      for (const q of qs) expect(q, `${route || 'home'}: "${q}"`).toBe(titleCase(q));
    }
    await open(page, 'partner-with-us/governments/');
    expect(await texts(page, '.gp__q')).toContain('Why Do Graduates Struggle to Find Work?');
  });

  test('About: National University sits with the 2022–2024 partnerships (official training partner since 2023), not with 2025–2026', async ({ page }) => {
    await open(page, 'about/');
    const items = page.locator('#story li, #story article');
    const timeline = compact(await page.locator('#story').textContent());
    expect(timeline).toContain('Government Contracts and University Partnerships');
    expect(timeline).toContain('partnerships with National University (official training partner since 2023) and the University for Peace (UPEACE)');
    expect(timeline).toContain('JobReady, YouthWIDE and the Impact Survey');
    expect(await items.count()).toBeGreaterThanOrEqual(5);
    const later = compact(await page.locator('#story', { has: page.getByText('JobReady, YouthWIDE and the Impact Survey') }).textContent());
    const afterHeading = later.slice(later.indexOf('JobReady, YouthWIDE and the Impact Survey'));
    expect(afterHeading).not.toContain('National University');
  });

  test('the Foundations meta description is one complete sentence within the SEO limit', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe('Fund a supported path to earnings. A randomized trial of a predecessor program found women offered a place had an estimated $27 higher monthly income.');
    expect(description!.length).toBeLessThanOrEqual(155);
  });
});

test.describe('layout', () => {
  const ROUTES = ['', 'impact/', 'partner-with-us/', 'partner-with-us/development-partners/', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/universities/', 'about/', 'impact/outcomes-2026/'];
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ROUTES) {
        await open(page, route);
        expect(await noOverflow(page), route || 'home').toBe(true);
      }
    });
  }
});
