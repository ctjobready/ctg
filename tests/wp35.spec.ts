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
    await expect(tile).toContainText('+10.3 percentage points');
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
    // WP42 (cycle-19 review): the goals entry is the full heading ("Seven Global Goals, Three at the Core"), which says which goals are the focus
    expect(await texts(page, 'nav[aria-label="On this page"] a')).toEqual(['In Short', 'Results at a Glance', 'Four Programs', 'Four Kinds of Evidence', 'Where We Are Heading', 'Seven Global Goals, Three at the Core']);
    expect(compact(await page.locator('#sdg').textContent())).toContain('CodersTrust’s training-to-employment model aligns with seven SDGs, with a primary focus on Quality Education, Gender Equality, and Decent Work and Economic Growth');
    // the band order keeps its rhythm: no two dark bands in a row
    const dark = await page.evaluate(() => Array.from(document.querySelectorAll('main .band')).map((b) => /band--(klein|deep-ink)/.test(b.className)));
    for (let i = 1; i < dark.length; i++) expect(dark[i] && dark[i - 1], `band ${i}`).toBe(false);
  });

  test('the survey group is headed for surveyed completers (country scope pending the owner)', async ({ page }) => {
    await open(page, 'impact/');
    await expect(page.getByRole('heading', { level: 3, name: 'Survey Results, Among Surveyed Completers' })).toHaveCount(1);
  });

  test('Home’s survey proof card caption is OC-01’s label, and the three proof figures start level at tablet widths too', async ({ page }) => {
    await open(page, '');
    const card = page.locator('.hh__card[data-fact="OC-01"]');
    await expect(card.locator('.hh__eyebrow')).toHaveText('Impact Survey 2026');
    await expect(card.locator('.stat__label')).toHaveText('employed, up from 47.4% before training, among surveyed completers at the October 2026 survey');
    for (const width of [390, 768, 820, 900, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const tops = await page.locator('.hh__card').evaluateAll((cards) => cards.map((c) => Math.round((c.querySelector('.hh__figvalue, .stat__value') as HTMLElement).getBoundingClientRect().top - c.getBoundingClientRect().top)));
      expect(new Set(tops).size, `the three figures sit at the same height in their cards at ${width}px: ${tops.join(', ')}`).toBe(1);
    }
  });

  test('the 31,200+ note says the total is contract scope, not a count of completers, and that Her Power’s 25,125 women were trained; Impact and Governments read the same register line', async ({ page }) => {
    // WP46 (cycle-22 review): "... national program, which trained 25,125 women; CodersTrust trained 2,500 women directly." (the 25,125 is not CodersTrust's own count); WP48 (cycle-23 review): two plain sentences, as below
    const NOTE = 'The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; CodersTrust trained 2,500 women directly.';
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

  // WP38 (cycle-15 review): Universities' evidence band was two lines; the median income and the chart left it, and the survey line kept the two-readings form ("was 77.9% ... up from 47.4% before training").
  // WP43 (cycle-20 review): that strip is gone (the first band's linked strip points to the Impact Survey 2026 page), so Universities states no survey reading; it still has no "rose", no multiplier, no chart and no median income
  test('Universities states no survey reading, and has no "rose", no multiplier, no chart and no median income', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#proof-band')).toHaveCount(0);
    expect(await mainText(page)).not.toMatch(/employment was 77\.9%|rose from|3×|median monthly income/);
    await expect(page.locator('main .ba__data, main .ev')).toHaveCount(0);
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
  // WP48 (cycle-23 review): the evidence band (the paid-work pathways and the 72.3% tile) is gone from Home; the trial-results and survey links close the "Proof in Practice" link row (tests/wp48.spec.ts)
  test('Home: the trial is shown once (no plain-language sentence, no trial block outside the hero card and the first slide); a text link to the trial results and one to the survey close the Proof in Practice row', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#proof-band')).toHaveCount(0);
    await expect(page.locator('[data-plain-line]')).toHaveCount(0);
    expect(await texts(page, '#cases .csc__more a')).toEqual(['See All Four Case Studies', 'Read the Trial Results', 'Impact Survey 2026']);
    expect((await hrefs(page, '#cases .csc__more a')).map((h) => h.replace(/^.*\/ctg\//, ''))).toEqual(['impact/case-studies/', 'impact/independent-evaluation/', 'impact/outcomes-2026/']);
  });

  // WP45 (cycle-21 review): the first slide states the trial's income result for the offered-place women (the employment result is this card's, the bar's and the slide's >4× tile)
  // WP48 (cycle-23 review): the hero's proof strip is headed "Proof at a Glance" (it was "The Strongest Proof"; screen-reader heading), and the first slide's heading names the predecessor program
  test('Home: the hero’s Randomized Trial card carries the plain-language reading of the trial (the check:facts anchor moved here), and the first slide still states the offered-place results', async ({ page }) => {
    await open(page, '');
    const card = page.locator('.hh__card[data-fact="RC-02"]');
    await expect(card.locator('.hh__eyebrow')).toHaveText('Randomized Trial');
    await expect(card.locator('.hh__num')).toHaveText('+10.3');
    await expect(card.locator('.hh__unit')).toHaveText('percentage points');
    // WP50 (cycle-25 review, item 28): "10.3 more", RC-02's own figure (it read "about 10 more"); tests/wp50.spec.ts
    await expect(card.locator('.hh__figlabel')).toHaveText('For every 100 women offered a place in a 200-hour predecessor program, 10.3 more were in work than in the control group.');
    const first = page.locator('[data-hs-slide]').nth(0);
    expect(compact(await first.locator('.hs__lead').textContent())).toContain('their monthly income was an estimated 41% higher than the control group’s');
    // WP50 (cycle-25 review, item 18): the slide's >4× tile says the multiple in words and no longer repeats the +10.3 percentage points, which this card states
    expect(compact(await first.locator('.hs__proof').textContent())).toContain('More than four times the average employment effect across nine vocational-training trials.');
    expect(compact(await first.locator('.hs__proof').textContent())).not.toContain('+10.3 percentage points');
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

// WP50 (cycle-25 review): the WSDFM 71% is back in Home's program-results slide (as the second of four programs, "program records, not trial data"); it stays off the glance tiles
test.describe('the WSDFM 71% is off the glance tiles (the case cards and the case study keep it; WP50: the Home program-results slide lists it again)', () => {
  // WP42 (cycle-19 review): the government slide is second, so the program-results slide is the fourth
  test('Home slide 4 lists four programs: Women in Online Work, WSDFM, UNDP YES and Her Power', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(3);
    await expect(slide.locator('h2')).toHaveText('Results by Program');
    await expect(slide.locator('.hs__lead')).toHaveText('Four programs, each with its partner, with results from their own program records.');
    // WP36 (cycle-13 review): each result names its base (Kosovo "(102 of 150)", WSDFM "(711 of 1,000 ...)", UNDP YES "of the 350 trained"; Her Power already said "of 800 tracked women")
    await expect(slide.locator('.hs__lines li')).toHaveText([
      'Women in Online Work, Kosovo: 68% in work (102 of 150).',
      'WSDFM: 71% in work (711 of 1,000; program records, not trial data).',
      'UNDP YES, Korail: 67% of the 350 trained found a first job within three months.',
      'Her Power: 47% of 800 tracked women in work.',
    ]);
  });

  test('Results at a Glance on Development Partners, Governments and Foundations carries no WSDFM tile; Kosovo takes its place where it led (WP36: not on Development Partners, whose Kosovo case card states it)', async ({ page }) => {
    for (const slug of THREE) {
      await open(page, `partner-with-us/${slug}/`);
      await expect(page.locator('#glance [data-fact~="PR-01"]'), slug).toHaveCount(0);
      expect(compact(await page.locator('#glance').textContent()), slug).not.toMatch(/711 of 1,000|WSDFM/);
    }
    // WP49 (cycle-24 review): each page's one secondary tile (RC-06a, RC-02, PR-02) is the glance's fourth tile, in the main group, with no "More Results" heading (tests/wp49.spec.ts)
    await open(page, 'partner-with-us/development-partners/');
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-02', 'OC-01', 'PR-03', 'RC-06a']);
    await open(page, 'partner-with-us/foundations/');
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-04', 'OC-03', 'PR-02', 'RC-02']);
    await open(page, 'partner-with-us/governments/');
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['GV-12', 'PR-05', 'RC-02', 'PR-02']);
  });

  test('the Proof in Practice cards and the case study still state the WSDFM program records, apart from the trial', async ({ page }) => {
    for (const route of ['', 'partner-with-us/development-partners/', 'partner-with-us/foundations/']) {
      await open(page, route);
      // WP46 (cycle-22 review): "WSDFM program records (not trial data): 71% in work"
      expect((await texts(page, '#cases article')).join(' | '), route || 'home').toContain('WSDFM program records (not trial data): 71% in work');
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

  test('Foundations: the track-record band spells it out once; the benefits cards no longer name the evaluator (WP44: the second card is the scorecard)', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const text = await mainText(page);
    expect(text.indexOf('BIGD')).toBe(text.indexOf(SPELLED) + SPELLED.length - 'BIGD)'.length);
    expect(compact(await page.locator('#guide').textContent())).toContain(`The ${SPELLED} separately evaluated the predecessor WSDFM program, commissioned by Porticus, in a randomized trial.`);
    expect(count(text, SPELLED)).toBe(1);
    expect(compact(await page.locator('#features').textContent())).not.toContain('BIGD');
  });

  test('Development Partners and Governments no longer name the evaluator at all (their proof band is a strip of links)', async ({ page }) => {
    for (const slug of ['development-partners', 'governments']) {
      await open(page, `partner-with-us/${slug}/`);
      expect(await mainText(page), slug).not.toContain('BIGD');
    }
  });

  // WP48 (cycle-23 review, item 34): the rung's name carries the abbreviation (it was "Independent Evaluation by the BRAC Institute of Governance and Development (BIGD)"), so the institute is spelled out, once,
  // in the same row's "What It Shows" cell; the page says "BIGD" once (the rung name) and the full name once (tests/wp48.spec.ts). WP49 (cycle-24 review, item 14): the name is "Independent Evaluation (BIGD)"; the evidence tag says "Randomized Trial" (tests/wp49.spec.ts)
  test('Impact: the evidence-ladder row is the first mention; its "What It Shows" cell spells the evaluator out once; the "Go Deeper" card that repeated it is gone', async ({ page }) => {
    await open(page, 'impact/');
    const first = page.locator('#evidence-ladder tbody tr').first();
    const row = compact(await first.locator('th').textContent());
    expect(row).toContain('Independent Evaluation (BIGD)');
    expect(compact(await first.locator('td[data-label="What It Shows"]').textContent())).toContain('BRAC Institute of Governance and Development');
    const text = await mainText(page);
    expect(count(text, 'BIGD')).toBe(1);
    expect(count(text, 'BRAC Institute of Governance and Development')).toBe(1);
  });

  // WP38 (cycle-15 review): Universities' evidence band is two lines ("A randomized trial of the predecessor WSDFM program found ..."), so, like Development Partners and Governments, it no longer names the evaluator
  // WP42 (cycle-19 review): Local Partners' evidence band is the same two-line strip, so it names no evaluator either (the trial page it links spells it out)
  // WP43 (cycle-20 review): Universities' two-line strip is gone; the linked strip that ends its first band ("Broader Evidence from Our Youth Programs", #offer-evidence) links the trial page and names no evaluator
  test('Local Partners and Universities name no evaluator: the evidence is a strip that links the trial page', async ({ page }) => {
    for (const [route, strip] of [['partner-with-us/local-partners/', '#proof'], ['partner-with-us/universities/', '#offer-evidence']]) {
      await open(page, route);
      expect(await mainText(page), route).not.toContain('BIGD');
      expect(await mainText(page), route).not.toContain(SPELLED);
      await expect(page.locator('.proofband__head'), route).toHaveCount(0);
      await expect(page.locator(strip).getByRole('link', { name: 'The Randomized Trial' }), route).toHaveAttribute('href', /\/impact\/independent-evaluation\/$/);
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

  // WP39 (cycle-16 review): the hub serves every route, so the line was scoped to supported cohorts (tests/wp39.spec.ts). WP45 (cycle-21 review): the hub's reporting band (#review-cycle) is gone, since the due-diligence view and the route
  // pages state the reporting (tests/wp45.spec.ts); the due-diligence card that linked to the band links to Governance instead
  test('the hub has no reporting band; the due-diligence view states the monthly reports and follow-up surveys once and links to Governance', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('#review-cycle')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Monthly Reports and Quarterly Reviews');
    const card = page.locator('#due-diligence .ddv__item', { hasText: 'Monthly Reports and Follow-Up Surveys' });
    await expect(card).toHaveCount(1);
    expect(await card.getAttribute('data-fact')).toBe('PD-08 PD-09');
    expect((await hrefs(page, '#due-diligence a')).some((h) => h.endsWith('/about/governance/#faq'))).toBe(true);
  });
});

test.describe('plain words and plain claims', () => {
  // WP39 (cycle-16 review): the features band is three short cards; Development Partners says delivery is "chosen" and safeguarding "agreed" (no claim to reach), Governments keeps "designed to stay" in its card heading
  test('Development Partners: "Accessible Local Delivery" claims no reach; Governments: "Capacity Designed to Stay in Your System" (designed, not achieved)', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const dp = (await texts(page, '#features li.card')).join(' ');
    expect(dp).toContain('Accessible Local Delivery');
    expect(dp).not.toMatch(/Training that reaches|Training designed to reach hard-to-reach groups/);
    await open(page, 'partner-with-us/governments/');
    const gov = await texts(page, '#features li.card h3');
    expect(gov).toContain('Capacity Designed to Stay in Your System');
    expect(gov.join(' ')).not.toContain('curricula that stay');
  });

  test('Foundations: the second features card is the pilot scorecard the grant agrees (WP44: it replaced the predecessor-evidence card)', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    // WP39 (cycle-16 review) headed this card "Independent Evidence on the Predecessor Program"; WP44 (cycle-21 review) describes the scorecard instead, since the card lists a deliverable (tests/wp44.spec.ts)
    const card = page.locator('#features li.card', { has: page.locator('h3', { hasText: 'A Pilot Scorecard Agreed with You' }) });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.card__text')).toHaveText('Cost per completer and per verified outcome, with thresholds agreed before the first cohort starts.');
    const text = await mainText(page);
    expect(text).not.toMatch(/Independent evidence on a CodersTrust program|fund a model with independent evidence/);
    expect(compact(await card.textContent())).not.toContain('Independent evaluation');
  });

  // WP46 (cycle-22 review): "What a Ministry Sees" is gone; the delivery model's "Placement and Monthly Reports" card names the follow-up surveys at 3, 6 and 12 months after each course
  test('Governments: the delivery card names the follow-up surveys at 3, 6 and 12 months; the contracts table and the services line use plain words', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#ministry-sees')).toHaveCount(0);
    await expect(page.locator('#mechanism .model__block', { hasText: 'Placement and Monthly Reports' })).toContainText('with monthly reports to the agency and follow-up surveys at 3, 6 and 12 months after each course.');
    const contracts = await texts(page, '#contracts tbody td:nth-child(2)');
    expect(contracts).toContain('Training in digital technologies');
    expect(contracts).toContain('Training for staff on the learning platform and lab operations');
    const text = await mainText(page);
    expect(text).toContain('Training for staff on the learning platform and lab operations.');
    expect(text).not.toMatch(/4IR|LMS and operation/);
  });

  // WP45 (cycle-21 review): the hub keeps the cost answer only (the safeguarding answer is in the due-diligence view and on Governance); the cost inclusions name "outreach and selection" (tests/wp45.spec.ts)
  test('FAQ: the hub’s cost answer is three sentences; the Governance page says funders receive data with personal details protected', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const answer = async (q: string) => {
      const item = page.locator('#faqs details', { has: page.locator('summary', { hasText: q }) });
      return compact(await item.locator('.faq__a').textContent());
    };
    const cost = await answer('What Does It Cost?');
    expect(cost).toBe(
      // WP41 (cycle-18 review): "For supported youth cohorts, standard inclusions are …"; WP43 (cycle-20 review): "Supported youth cohorts include training, certification exam preparation and the exam fee, …"
      'Pricing is set per program; we share an indicative budget in the discovery session. Supported youth cohorts include outreach and selection, training, certification exam preparation and the exam fee, three months of mentoring, placement support and 12 months of outcome tracking after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where needed.',
    );
    expect(cost.split(/(?<=[.!?])\s+(?=[A-Z“])/).length).toBeLessThanOrEqual(3);
    await expect(page.locator('#faqs details', { has: page.locator('summary', { hasText: 'What About Safeguarding and Data Protection?' }) })).toHaveCount(0);
    await open(page, 'about/governance/');
    const text = await mainText(page);
    expect(text).toContain('funders receive data with personal details protected and monthly reports');
    expect(text).not.toContain('privacy-appropriate');
  });

  test('the ranked pains ("What Gets in the Way") are Title Case card titles on every page that renders them', async ({ page }) => {
    for (const route of ['', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/development-partners/', 'partner-with-us/universities/', 'partner-with-us/local-partners/', 'programs/youthwide/']) {
      await open(page, route);
      const qs = await texts(page, '.gp__q');
      // WP46 (cycle-22 review): Universities states two pains (the employers' pain is the 72% tile directly below them)
      expect(qs.length, route || 'home').toBeGreaterThanOrEqual(route === 'partner-with-us/universities/' ? 2 : 3);
      for (const q of qs) expect(q, `${route || 'home'}: "${q}"`).toBe(titleCase(q));
    }
    await open(page, 'partner-with-us/governments/');
    // WP36 (cycle-13 review): the audience pages state their pains as outcomes, as Home and YouthWIDE do ("Graduates Struggle to Find Work", not "Why Do Graduates Struggle to Find Work?")
    expect(await texts(page, '.gp__q')).toContain('Graduates Struggle to Find Work');
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
