import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { faqs, faqsFor } from '../src/data/faqs';
import { BIGD_FULL, EMPATHY, NEXT_STEPS_TITLE, POSITIONING } from '../src/data/copy';
import { STAGE_STEPS } from '../src/components/pages/model/stagePipeline';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP50 behaviors (the verified cycle-25 whole-site reviews, items 1-28): Home's challenge heading and lead, its positioning statement, the trial slide (heading, eyebrow, ">4×" support line), the program-results slide, the reporting
 * answer, the closing steps heading and the Investors router card; the Foundations first pain, track-record band and funding-route links; the Investors thesis card and Next Steps lead; the Local Partners problem lead; YouthWIDE's first-cohort step; the
 * evaluator spelled out on the Independent Evaluation page; the Universities track-record band; the single pricing sentence on the two employer pages; the Programs H1 and its missing "Last updated" line; the Development Partners challenge lead;
 * Her Power's row, the timing answer and the closing link on Governments; the closing partner lines of Development Partners and Governments; About's enrollments tile; the learner-story kicker; the TalentLEAP pipeline's last step; the hero
 * trial card's "10.3 more". Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built
 * site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp50.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').innerText());
/** Everything in main, including answers inside closed FAQ accordions (innerText leaves those out). */
const everything = async (page: Page) => compact(await page.locator('main').evaluate((el) => el.textContent ?? ''));
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
/** The visible text of a built page's HTML (scripts, styles and the head dropped), for scans across every page. */
const visible = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/\s+/g, ' ');
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const itemOf = (page: Page, question: string) => page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: question }) }).first();
const answerOf = async (page: Page, question: string) => compact(await itemOf(page, question).locator('.faq__a').textContent());
/** Every FAQPage question and answer text in the page's JSON-LD. */
async function faqJsonLd(page: Page) {
  const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: { name: string; text: string }[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      const o = n as Record<string, unknown>;
      if (o['@type'] === 'FAQPage') for (const q of (o.mainEntity as { name: string; acceptedAnswer?: { text: string } }[]) ?? []) out.push({ name: q.name, text: q.acceptedAnswer?.text ?? '' });
      Object.values(o).forEach(walk);
    }
  };
  blobs.forEach((b) => walk(JSON.parse(b)));
  return out;
}

const DP = 'partner-with-us/development-partners/';
const FOUND = 'partner-with-us/foundations/';
const UNI = 'partner-with-us/universities/';
const LOCAL = 'partner-with-us/local-partners/';
const EMP = 'partner-with-us/employers/';
const INVEST = 'partner-with-us/investors/';
const ORIGIN_LINE = 'From a Copenhagen launch to work in 16 countries and territories.'; // WP64 rework RW2 (coordinator): under a heading that says "Since 2014" the line drops that lead-in (originShortUnder, src/data/copy.ts)
const PRICING = 'Pricing is set per program; we share an indicative budget in the discovery session and confirm it after the needs assessment.';

test.describe('Home: the challenge band and the positioning statement (items 1 and 11)', () => {
  test('the H2 is "Education Alone Is Not Leading to Jobs" (Title Case), and the lead speaks to the reader’s own training budget', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#problem h2')).toHaveText('Education Alone Is Not Leading to Jobs');
    expect('Education Alone Is Not Leading to Jobs').toBe(titleCase('Education Alone Is Not Leading to Jobs'));
    const lead = compact(await page.locator('#problem .sh__lead').textContent());
    expect(lead).toBe('Millions of educated young people are out of work and out of training. Your training budget needs to show who starts earning.');
    expect(lead.split('. ')).toHaveLength(2);
  });

  // WP60 (cycle-32 review, Gemini GM7): the statement is ONE sentence that keeps the audience (it was the audience sentence, "For funders who need educated, unemployed youth in paid digital work, CodersTrust offers an integrated training-to-earnings model.", and a closing sentence); tests/wp60.spec.ts
  test('"One Path from Learning to Earning" states one sentence: the "Many programs cover one step" sentence is gone from the statement and from the source', async ({ page }) => {
    const expected =
      // WP51 (cycle-26 review): the reports are scoped like every other reporting statement on the site ("..., as agreed in the program scope"; tests/wp51.spec.ts)
      // WP63 (cycle-35 review, Grok R1): "... for educated, unemployed and underemployed youth, ..." (the group ID-01 names)
      'CodersTrust connects training, mentoring and placement support for educated, unemployed and underemployed youth, with monthly reports on progress toward paid work, as agreed in the program scope.';
    expect(POSITIONING.home.text).toBe(expected);
    expect(POSITIONING.home.facts).toEqual(['PD-08']);
    await open(page, '');
    await expect(page.locator('#mechanism h2')).toHaveText('One Path from Learning to Earning');
    expect(compact(await page.locator('#mechanism .pos__text').textContent())).toBe(expected);
    expect(await mainText(page)).not.toMatch(/Many programs cover one step|self-paced courses or freelance matching/);
  });

  test('none of the earlier wording is on any built page', () => {
    const gone = [
      'Education Is Not Turning into Jobs',
      'Training budgets rarely show who starts earning',
      'Many programs cover one step: training, self-paced courses or freelance matching',
    ];
    const found = sitePages().flatMap((p) => gone.filter((g) => visible(p.html).includes(g)).map((g) => `${p.route}: ${g}`));
    expect(found).toEqual([]);
  });
});

test.describe('Home: the program-results slide lists four programs (item 10)', () => {
  const slide = (page: Page) => page.locator('[data-hs-slide]').nth(3);

  test('the lead says "Four programs"; WSDFM is the second line, with its base and the qualifier "program records; trial studied 833" (WP60; it was "program records, not trial data"); each line names its facts', async ({ page }) => {
    await open(page, '');
    await expect(slide(page).locator('h3')).toHaveText('Results by Program');
    await expect(slide(page).locator('.hs__lead')).toHaveText('Results from the records of four programs.');
    await expect(slide(page).locator('.hs__lines li')).toHaveText([
      'Women in Online Work, Kosovo (2016–2017): 68% in work (102 of 150).',
      'WSDFM: 711 of 1,000 enrolled in work (71%), from program records.',
      'UNDP YES, Korail (2017): 67% of the 350 enrolled found a first job within three months.',
      'Her Power: 372 of 800 tracked in work (47%); 2,400 trained directly.',
    ]);
    // WP60 (cycle-32 review, Claude S4): the WSDFM line names the trial's count (RC-07's 833) beside its own fact
    expect(await slide(page).locator('.hs__lines li').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['PR-02 TL-04', 'PR-01', 'PR-03 PR-06', 'PR-05']);
  });

  // WP55 (owner decision 2026-10-18): Impact lists five case studies ("Five Programs Across Kosovo, Albania and Bangladesh" since WP63; it was "..., from Kosovo to Bangladesh"). The slide's four are the four with program records, in Impact's order; the fifth, Digital Jobs Albania, has only the World Bank's published figures
  // (interest and enrollment, no program-record result) and so is not a line on this slide.
  test('the four lines are Impact’s case studies with program-record results, in the same order ("Five Programs Across Kosovo, Albania and Bangladesh" adds Digital Jobs Albania), and WSDFM’s figure is the case card’s', async ({ page }) => {
    await open(page, '');
    const lines = await texts(page, '[data-hs-slide]:nth-child(4) .hs__lines li');
    expect(lines).toHaveLength(4);
    // WP51 (cycle-26 review): the slide's line is the one place Home states the figure, so Home's WSDFM card shows delivery context; the figure and its caption are the card's on Development Partners (tests/wp51.spec.ts)
    const homeCard = page.locator('#cases article', { hasText: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)' });
    await expect(homeCard.locator('.case__value')).toHaveCount(0);
    await open(page, 'partner-with-us/development-partners/');
    const card = page.locator('#cases article', { hasText: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)' });
    await expect(card.locator('.case__value')).toHaveText('711 of 1,000');
    expect(compact(await card.locator('.case__label').textContent())).toBe('WSDFM program records (not trial results; the trial’s 425 women offered a place were among these 1,000): 71% of enrolled women in work');
    await open(page, 'impact/');
    await expect(page.locator('#cases').getByRole('heading', { level: 2, name: 'Five Programs Across Kosovo, Albania and Bangladesh' })).toBeVisible();
    await expect(page.locator('#cases article.card')).toHaveCount(5);
    const hrefs = await page.locator('#cases a.card__link').evaluateAll((els) => els.map((e) => (e.getAttribute('href') ?? '').split('/').filter(Boolean).pop()));
    expect(hrefs).toEqual(['kosovo-women-in-online-work', 'digital-jobs-albania', 'wsdfm-women-freelancers', 'undp-yes-korail', 'her-power']);
    expect(hrefs.filter((h) => h !== 'digital-jobs-albania'), 'the slide’s four, in Impact’s order').toEqual(['kosovo-women-in-online-work', 'wsdfm-women-freelancers', 'undp-yes-korail', 'her-power']);
  });

  test('at 1280 px the WSDFM line is one line, and the slide’s copy fits the carousel (the 48 px unused-space budget is held for every slide by tests/hero-slider.spec.ts)', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, '');
    const lineHeights = await slide(page).locator('.hs__lines li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    // Kosovo, WSDFM and Her Power are one line each; UNDP YES' sentence is two
    expect(lineHeights[1], 'the WSDFM line wraps').toBe(lineHeights[0]);
    expect(lineHeights[2]).toBeGreaterThan(lineHeights[0]);
    const copyHeights = await page.locator('[data-hs-slide] .hs__copy').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(copyHeights).toHaveLength(4);
    // WP53 (owner decision 2026-10-16): the "Find Your Program" slide, which used to be the tallest, is gone; the program-results copy may now be the tallest, and it must fit the carousel (the 48 px budget is held for every slide by tests/hero-slider.spec.ts)
    const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
    expect(copyHeights[3], 'the program-results copy fits the carousel').toBeLessThanOrEqual(track);
  });

  test('at 390 px the slide has no sideways scroll and the four lines stay inside their cards', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, '');
    await page.locator('[data-hs-dot]').nth(3).click();
    await expect(slide(page)).toHaveClass(/is-active/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const inside = await slide(page).locator('.hs__lines li').evaluateAll((els) => els.every((e) => e.scrollWidth <= e.clientWidth + 1));
    expect(inside).toBe(true);
  });
});

test.describe('Home: the reporting answer is two sentences, and the full answer stays elsewhere (item 12)', () => {
  // WP60 (cycle-32 review, GLM L4): "A scorecard is agreed for every cohort before delivery." (it said "Every cohort agrees a scorecard before delivery.", which gave the cohort the action)
  const HOME_ANSWER = 'A scorecard is agreed for every cohort before delivery. As agreed in the program scope, partners receive monthly reports and follow-up surveys at 3, 6 and 12 months, and independent evaluation is welcome.';

  test('Home’s "How Do You Prove Outcomes?" is the Q3-home variant, tied to PD-11, PD-08 and PD-09, and the FAQ JSON-LD says the same words', async ({ page }) => {
    const variant = faqsFor('variants').find((f) => f.id === 'Q3-home')!;
    expect(variant.a).toBe(HOME_ANSWER);
    expect(variant.q).toBe('How Do You Prove Outcomes?');
    expect(variant.evidence).toEqual(['PD-11', 'PD-08', 'PD-09']);
    expect(faqsFor('all').map((f) => f.id)).not.toContain('Q3-home');
    await open(page, '');
    expect(await texts(page, '#faq summary')).toEqual(['Will This Work in Our Country?', 'Does the Trial Apply to Your Program?', 'How Do You Prove Outcomes?']);
    expect(await answerOf(page, 'How Do You Prove Outcomes?')).toBe(HOME_ANSWER);
    expect(await itemOf(page, 'How Do You Prove Outcomes?').locator('.faq__a p').first().getAttribute('data-fact')).toBe('PD-11 PD-08 PD-09');
    expect((await faqJsonLd(page)).find((q) => q.name === 'How Do You Prove Outcomes?')?.text).toBe(HOME_ANSWER);
    // WP63 (cycle-35 review, GPT-6.1 Sol G1): the shared Q3 reads "Documentary evidence of work and earnings, such as offer letters, ..."; Home prints the Q3-home variant, which has neither form
    expect(await everything(page)).not.toContain('Documentary evidence of work and earnings, such as offer letters');
    expect(await everything(page)).not.toContain('Documentary evidence of earnings, such as offer letters');
  });

  test('the shared answer (Q3) is unchanged in the bank (the hub’s full list) and on the pages that print it: Development Partners and Foundations', async ({ page }) => {
    const full = faqs.find((f) => f.id === 'Q3')!.a;
    expect(full).toBe(
      'For every cohort, as agreed in the program scope, we plan a baseline at enrollment, follow-up surveys at 3, 6 and 12 months and monthly reports. Documentary evidence of work and earnings, such as offer letters, payslips, platform logs or bank receipts, is collected where available. Independent evaluation is welcome.',
    );
    expect(faqsFor('all').map((f) => f.id)).toContain('Q3');
    for (const route of [DP, FOUND]) {
      await open(page, route);
      expect(await answerOf(page, 'How Do You Prove Outcomes?'), route).toBe(full);
      expect((await faqJsonLd(page)).find((q) => q.name === 'How Do You Prove Outcomes?')?.text, route).toBe(full);
    }
  });
});

test.describe('Foundations: the first pain and the track-record band (items 2 and 7)', () => {
  test('the first pain is "Earnings Must Be Tracked, Not Only Training Hours" in Title Case, with its supporting sentence unchanged; the other two are unchanged', async ({ page }) => {
    await open(page, FOUND);
    const qs = await texts(page, '#problem .gp__q');
    expect(qs).toEqual(['Earnings Must Be Tracked, Not Only Training Hours', 'Independent Evidence Is Hard to Find', 'Accountability Must Keep Pace with Scale']);
    for (const q of qs) expect(q, q).toBe(titleCase(q));
    expect((await texts(page, '#problem .gp__a'))[0]).toBe('Attendance is easy to count; a change in income is harder to show.');
    expect(sitePages().filter((p) => visible(p.html).includes('Grants Buy Training Hours')).map((p) => p.route)).toEqual([]);
  });

  test('the track-record band opens with the origin line ("Since 2014, ..."), not an empathy line', async ({ page }) => {
    await open(page, FOUND);
    await expect(page.locator('#guide p.lead')).toHaveCount(0);
    expect(compact(await page.locator('#guide .pg__copy > :first-child').textContent())).toBe(ORIGIN_LINE);
    expect(await everything(page)).not.toContain('You want your grant to change a young person’s income');
    expect(Object.keys(EMPATHY)).not.toContain('foundations');
  });
});

test.describe('Universities: the track-record band opens with the origin line; JobReady@Campus keeps the sentence (item 7)', () => {
  // WP52 (cycle-27 review): the sentence is "Help students prepare for paid digital work and build placement evidence from your campus cohorts." (it read "You see capable students finish their degrees and still struggle to find work, and you are asked for placement results you cannot yet show.")
  const CAMPUS_SENTENCE = 'Help students prepare for paid digital work and build placement evidence from your campus cohorts.';

  test('the Universities partner page’s band opens with "Since 2014, ..." and has no empathy line', async ({ page }) => {
    await open(page, UNI);
    await expect(page.locator('#guide p.lead')).toHaveCount(0);
    expect(compact(await page.locator('#guide .pg__copy > :first-child').textContent())).toBe(ORIGIN_LINE);
    expect(await everything(page)).not.toContain(CAMPUS_SENTENCE);
  });

  test('JobReady@Campus still states the sentence once, as its problem band’s lead (EMPATHY.universities)', async ({ page }) => {
    expect(EMPATHY.universities).toBe(CAMPUS_SENTENCE);
    await open(page, 'programs/jobready-campus/');
    expect(count(await everything(page), CAMPUS_SENTENCE)).toBe(1);
    expect(compact(await page.locator('#problem .sh__lead').textContent())).toBe(CAMPUS_SENTENCE);
  });
});

test.describe('Investors: the thesis card (item 3)', () => {
  test('the second card is "Connect Learning to Paid Work" with one line about what JobReady is being built to do, tied to IN-04', async ({ page }) => {
    await open(page, INVEST);
    const cards = page.locator('#thesis article.card');
    await expect(cards).toHaveCount(3);
    expect(await texts(page, '#thesis .card__title')).toEqual(['Young People Need Work and Employers Need Skills', 'Connect Learning to Paid Work', 'AI Skills Are in Rising Demand']);
    for (const t of await texts(page, '#thesis .card__title')) expect(t, t).toBe(titleCase(t));
    const second = cards.nth(1);
    expect(compact(await second.locator('.card__text').textContent())).toBe('JobReady is being built to connect learning with mentoring and placement support.');
    expect(await second.locator('.card__text').getAttribute('data-fact')).toBe('IN-04');
    expect(sitePages().filter((p) => /Online Learning Sells Content|Many online courses provide content/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Local Partners, YouthWIDE and Development Partners: the lines the review asked for (items 4, 5 and 13)', () => {
  test('Local Partners: the problem lead is the offer, under the unchanged heading', async ({ page }) => {
    await open(page, LOCAL);
    await expect(page.locator('#problem h2')).toHaveText('Connect Your Community to Paid Digital Work');
    expect(compact(await page.locator('#problem .sh__lead').textContent())).toBe('Pair your community reach with CodersTrust’s curriculum, mentoring, placement support and reporting.');
    expect(await everything(page)).not.toContain('Local organizations often lack');
  });

  test('YouthWIDE: step 4 of "What Happens Next" says training starts "on the agreed schedule"; no step points at a window below', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const steps = await texts(page, '#next-steps .steps__text');
    expect(steps[3]).toBe('Training starts in existing labs and colleges on the agreed schedule.');
    expect(steps).toHaveLength(5);
    expect(await everything(page)).not.toMatch(/within the window below/);
    expect((await texts(page, '#next-steps ol h3')).map((t) => t.replace(/^Step \d+: /, ''))[3]).toBe('First Cohort');
  });

  test('Development Partners: the challenge lead says "keeping hard-to-reach groups engaged"', async ({ page }) => {
    await open(page, DP);
    expect(compact(await page.locator('#problem .sh__lead').textContent())).toBe('You can count who enrolled. Showing who is earning, and keeping hard-to-reach groups engaged, is the hard part.');
    expect(await everything(page)).not.toContain('hard-to-reach groups in,');
  });
});

test.describe('Independent Evaluation: the evaluator is spelled out where the page first names it (item 6)', () => {
  test('the lead says "by the BRAC Institute of Governance and Development (BIGD)", it is the first "BIGD" on the page, and the abbreviation is used after it', async ({ page }) => {
    expect(BIGD_FULL).toBe('the BRAC Institute of Governance and Development (BIGD)');
    await open(page, 'impact/independent-evaluation/');
    const lead = compact(await page.locator('main .lf-head .lead').textContent());
    // WP61 (cycle-33 review, GPT-6.1 Sol G5): the result comes first, with the evaluator ("In a randomized trial by the BRAC Institute of Governance and Development (BIGD), women offered a place were 10.3 percentage points more likely to be employed ...")
    expect(lead.startsWith(`In a randomized trial by ${BIGD_FULL}, women offered a place were 10.3 percentage points more likely to be employed`)).toBe(true);
    const words = lead.split(/\s+/).length;
    expect(words, 'the direct answer is 40 to 60 words').toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    const text = await everything(page);
    const spelled = 'BRAC Institute of Governance and Development (BIGD)';
    expect(count(text, spelled)).toBe(1);
    expect(text.indexOf('BIGD')).toBe(text.indexOf(spelled) + spelled.length - 'BIGD)'.length);
    await expect(page.getByRole('link', { name: /Read the BIGD Report \(2022\)/ })).toHaveCount(1);
  });
});

test.describe('Employers and JobReady@Work: the pricing sentence is said once, in the FAQ (item 8)', () => {
  test('each page prints it once, as part of the "What Does It Cost?" answer, which keeps its inclusions sentence', async ({ page }) => {
    for (const route of [EMP, 'programs/jobready-work/']) {
      await open(page, route);
      expect(count(await everything(page), PRICING), route).toBe(1);
      const answer = await answerOf(page, 'What Does It Cost?');
      expect(answer.startsWith(PRICING), route).toBe(true);
      expect(answer, route).toContain('Standard inclusions are a needs assessment, a customized curriculum, interactive workshops, progress evaluation and post-training support');
    }
  });

  test('the options band under the cards has no pricing line: Employers’ "Choose How to Work with Us" has no lead, and JobReady@Work keeps "Pick one or both." with no note', async ({ page }) => {
    await open(page, EMP);
    await expect(page.locator('#offer h2')).toHaveText('Choose How to Work with Us');
    await expect(page.locator('#offer .sh__lead')).toHaveCount(0);
    await expect(page.locator('#offer article.card')).toHaveCount(2);
    await open(page, 'programs/jobready-work/');
    await expect(page.locator('#offer .sh__lead')).toHaveText('Pick one or both.');
    await expect(page.locator('#offer .note')).toHaveCount(0);
    await expect(page.locator('#offer article.card')).toHaveCount(2);
  });

  test('the pages that still carry a pricing line in their offer band are unchanged (SuperKids and JobReady@Campus keep their note)', async ({ page }) => {
    for (const route of ['programs/superkids/', 'programs/jobready-campus/']) {
      await open(page, route);
      await expect(page.locator('#offer .note--key'), route).toHaveCount(1);
    }
  });
});

test.describe('Programs: the H1 (item 9)', () => {
  test('"Digital Skills Programs, from School to Work" is the one H1, in Title Case with no trailing period; the earlier H1s are on no page', async ({ page }) => {
    await open(page, 'programs/');
    await expect(page.locator('main h1')).toHaveText('Digital Skills Programs, from School to Work');
    expect('Digital Skills Programs, from School to Work').toBe(titleCase('Digital Skills Programs, from School to Work'));
    expect(sitePages().filter((p) => visible(p.html).includes('Programs That Take Learners from Classroom to Career')).map((p) => p.route)).toEqual([]);
  });

  test('the Programs page has no sideways scroll at 390 px', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, 'programs/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe('Home: the Investors router card names the platform in IN-04’s words (item 14)', () => {
  // WP53 (owner decision 2026-10-16): IN-04's definition is "CodersTrust’s digital learning and earning platform" (it said "education and employment"; tests/wp53.spec.ts)
  const CARD = 'Back the staged rollout of JobReady, CodersTrust’s digital learning and earning platform.';

  test('the card reads "Back the staged rollout of JobReady, CodersTrust’s digital learning and earning platform."; the definition is IN-04’s own; the card does not say the platform "connects" youth to work', async ({ page }) => {
    expect(fact('IN-04').text.startsWith('JobReady is CodersTrust’s digital learning and earning platform,')).toBe(true);
    await open(page, '');
    const card = page.locator('#router a.cat[href$="partner-with-us/investors/"]');
    await expect(card.locator('.cat__title')).toHaveText('Investors');
    expect(compact(await card.locator('.cat__text').textContent())).toBe(CARD);
    expect(compact(await card.locator('.cat__text').textContent())).not.toMatch(/we are building|connect/i);
  });

  test('the 404 page reads the same single source; the partner hub’s card names the platform the same way (primary follow-up)', async ({ page }) => {
    await open(page, '404.html');
    expect(compact(await page.locator('main a.cat[href$="partner-with-us/investors/"] .cat__text').first().textContent())).toBe(CARD);
    await open(page, 'partner-with-us/');
    expect(compact(await page.locator('main a.cat[href$="partner-with-us/investors/"] .cat__text').first().textContent())).toBe('For impact investors: JobReady, CodersTrust’s digital learning and earning platform.');
    expect(sitePages().filter((p) => /Back JobReady, the platform we are building/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Governments: Her Power’s row is three full sentences (item 15)', () => {
  const SENTENCES = [
    'CodersTrust trained 2,400 women directly.',
    'The national program trained 25,125 women across 130 sub-districts (upazilas), meeting its target.',
    '54,609 manuals and guidelines were distributed.',
  ];

  test('each line is its own sentence with a full stop, one per line, and the row keeps its facts; the figures are the register’s', async ({ page }) => {
    expect(fact('GV-11').text).toContain('2,400 women trained directly; 54,609 manuals and guidelines distributed');
    expect(fact('GV-01').text).toContain('national program that trained 25,125 women across 130 sub-districts (upazilas), meeting its target');
    await open(page, 'partner-with-us/governments/');
    const row = page.locator('#contracts tbody tr').first();
    expect(await row.getAttribute('data-fact')).toBe('GV-01 GV-11');
    expect(await texts(page, '#contracts tbody tr:first-child td.ct__num li')).toEqual(SENTENCES);
    // one line each: the items stack, none beside another
    const tops = await row.locator('td.ct__num li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(3);
  });

  test('a text export keeps the sentences apart (a space follows each), and the other five rows are unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const raw = (await page.locator('#contracts tbody tr').first().locator('td.ct__num').evaluate((el) => el.textContent ?? '')).replace(/\s+/g, ' ').trim();
    expect(raw).toBe(SENTENCES.join(' '));
    const cells = await texts(page, '#contracts td.ct__num');
    expect(cells).toHaveLength(6);
    for (const c of cells.slice(1)) expect(c.startsWith('Contract scope:'), c).toBe(true);
  });
});

test.describe('Development Partners and Governments: no closing line repeats the logo strip (item 16)', () => {
  test('Development Partners: the closing band has the first-action line alone; the track-record band’s strip names UNDP, the World Bank Group and BRAC', async ({ page }) => {
    await open(page, DP);
    expect(await texts(page, '#reinforce li')).toEqual(['Your first step: a discovery session. In your inquiry, include two suitable times for it.']);
    expect(await everything(page)).not.toContain('Organizations that have worked with CodersTrust include');
    const strip = await page.locator('#guide .partners').evaluate((el) => `${el.textContent ?? ''} ${Array.from(el.querySelectorAll('img')).map((i) => i.getAttribute('alt') ?? '').join(' ')}`);
    for (const name of ['UNDP', 'World Bank Group', 'BRAC']) expect(strip, name).toContain(name);
  });

  // WP52 (cycle-27 review, Claude m4): the briefing line that closed the page ("Your agency’s procurement timeline sets the pace; we start with a briefing.") is gone with the strip around it: it repeated the procurement point the FAQ answer and the steps band state (tests/wp52.spec.ts)
  test('Governments: the track-record band’s strip names the five government bodies the closing line named; no closing strip follows the steps (WP52)', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#reinforce')).toHaveCount(0);
    expect(await everything(page)).not.toContain('Government partners include Bangladesh’s ICT Division');
    const strip = await page.locator('#guide .partners').first().evaluate((el) => `${el.textContent ?? ''} ${Array.from(el.querySelectorAll('img')).map((i) => i.getAttribute('alt') ?? '').join(' ')}`);
    for (const name of ['ICT Division', 'DoICT', 'Bangladesh Hi-Tech Park Authority', 'NSDA', 'BCC']) expect(strip, name).toContain(name);
  });

  // WP51 (cycle-26 reviews): Universities' closing line is gone by the same rule (its three universities are named above it) and Foundations' line moved into its Track Record band (tests/wp51.spec.ts); Employers kept its closing line.
  // WP54 (cycle-28 review, Kimi K2): Employers' line is gone by the same rule, because the track-record band's strip names the five private-sector partners it named (tests/wp54.spec.ts)
  test('Employers: the closing band has the first-action line alone; the track-record band’s strip names the five private-sector partners the closing line named (WP54)', async ({ page }) => {
    await open(page, EMP);
    expect(await texts(page, '#reinforce li')).toEqual(['Your first step, for team training or hiring: a discovery session. In your inquiry, include two suitable times.']);
    expect(await everything(page)).not.toContain('Private-sector partners include Grameenphone Academy, Robi, Accenture, BASIS and AWS.');
    const strip = await page.locator('#guide .partners').evaluate((el) => `${el.textContent ?? ''} ${Array.from(el.querySelectorAll('img')).map((i) => i.getAttribute('alt') ?? '').join(' ')}`);
    for (const name of ['Grameenphone Academy', 'Robi', 'Accenture', 'BASIS', 'AWS']) expect(strip, name).toContain(name);
  });
});

test.describe('Home: the trial slide (items 17 and 18)', () => {
  const first = (page: Page) => page.locator('[data-hs-slide]').nth(0);

  test('the heading is "Women Offered a Place Earned an Estimated 41% More per Month"; the eyebrow is "Randomized Trial of CodersTrust’s WSDFM Program"; the lead still names CodersTrust’s WSDFM program', async ({ page }) => {
    await open(page, '');
    await expect(first(page).locator('h3')).toHaveText('Women Offered a Place Earned an Estimated 41% More per Month');
    expect('Women Offered a Place Earned an Estimated 41% More per Month').toBe(titleCase('Women Offered a Place Earned an Estimated 41% More per Month'));
    await expect(first(page).locator('.hs__eyebrow')).toHaveText('Randomized Trial of CodersTrust’s WSDFM Program');
    expect('Randomized Trial of CodersTrust’s WSDFM Program').toBe(titleCase('Randomized Trial of CodersTrust’s WSDFM Program'));
    expect(compact(await first(page).locator('.hs__lead').textContent())).toBe('In CodersTrust’s WSDFM program, women offered a place had an estimated 41% higher monthly income than the control group, about $27 more a month.'); // WP63 (cycle-35 review, GLM L4)
    expect(await first(page).locator('h3').getAttribute('data-fact')).toBe('RC-01');
    expect(await first(page).getAttribute('aria-label')).toBe('1 of 4: Women Offered a Place Earned an Estimated 41% More per Month');
  });

  test('the eyebrow is this slide’s own text: the menu’s trial card and the partner hub keep their wording, and the other slides keep their eyebrows', async ({ page }) => {
    await open(page, '');
    // WP53 (owner decision 2026-10-16): the second "Impact Survey 2026" slide, "Reach at Scale" and "Our Programs" are gone
    expect(await texts(page, '[data-hs-slide] .hs__eyebrow')).toEqual(['Randomized Trial of CodersTrust’s WSDFM Program', 'Government and University Partners', 'Impact Survey 2026', 'Program Records']);
    expect(sitePages().filter((p) => visible(p.html).includes('Women Offered a Place in a Predecessor Program Earned')).map((p) => p.route)).toEqual([]);
  });

  // WP54 (cycle-28 review, Grok R2): the support line is "Employment effect: more than four times the 2.3-point average across nine vocational-training trials." (it said "More than four times the average employment effect across nine
  // vocational-training trials." and stated no 2.3); WP59 (cycle-31 review, Kimi K3, reversing WP50 on this point): it states the +10.3 it compares, "Employment effect: +10.3 percentage points, more than four times the 2.3-point ..." (tests/wp54.spec.ts, tests/wp59.spec.ts)
  test('the ">4×" tile’s support line states the +10.3 base and says the multiple in words; its value is still RC-06a’s', async ({ page }) => {
    expect(fact('RC-06a').stat?.value).toBe('>4×');
    await open(page, '');
    const proof = first(page).locator('.hs__proof');
    expect(await proof.getAttribute('data-fact')).toBe('RC-06a');
    await expect(proof.locator('.stat__value')).toHaveText('>4×');
    expect(compact(await proof.locator('.stat__label').textContent())).toBe('Employment effect, not income: +10.3 percentage points, more than four times the 2.3-point average across nine vocational-training trials.');
    // the register is unchanged: RC-06a keeps its tile label and its glance label
    expect(fact('RC-06a').stat?.label).toContain('+10.3 percentage points for women offered a place, against 2.3 on average');
  });

  test('the slide fits the carousel: no slide leaves more than 48 px unused at 1280, and nothing overflows at 390', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, '');
    const dots = page.locator('[data-hs-dot]');
    for (let i = 0; i < 4; i++) {
      await dots.nth(i).click();
      await expect(page.locator('[data-hs-slide]').nth(i)).toHaveClass(/is-active/);
      await page.waitForTimeout(450);
      const unused = await page.evaluate(() => {
        const active = document.querySelector('[data-hs-slide].is-active')!;
        const controls = document.querySelector('[data-hs-bar]')!;
        const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
        return Math.round(controls.getBoundingClientRect().top - Math.max(...parts.map((el) => el.getBoundingClientRect().bottom)));
      });
      expect(unused, `unused space on slide ${i + 1}`).toBeLessThanOrEqual(48);
    }
    await page.setViewportSize(MOBILE);
    await open(page, '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const eyebrow = await first(page).locator('.hs__eyebrow').evaluate((el) => ({ wraps: el.getBoundingClientRect().height > 40, inside: el.getBoundingClientRect().right <= document.documentElement.clientWidth }));
    expect(eyebrow.wraps, 'the eyebrow wraps to a second line at 390 px').toBe(false);
    expect(eyebrow.inside).toBe(true);
  });
});

test.describe('Investors: the Next Steps lead (item 19)', () => {
  test('the lead is "Four steps, at your pace."; the editorial sentence is on no page', async ({ page }) => {
    await open(page, INVEST);
    expect(compact(await page.locator('#offer .sh__lead').textContent())).toBe('Four steps, at your pace.');
    await expect(page.locator('#offer ol > li')).toHaveCount(4);
    expect(sitePages().filter((p) => visible(p.html).includes('This page covers the thesis and results only')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Foundations: each funding-route link appears once (item 20)', () => {
  test('"Discuss a JobReady Platform Grant" is the one link under the comparison, none in the Funding Route 2 passage; "Discuss a YouthWIDE Cohort Grant" was linked once and still is', async ({ page }) => {
    await open(page, FOUND);
    const platform = page.getByRole('link', { name: /Discuss a JobReady Platform Grant/ });
    const youthwide = page.getByRole('link', { name: /Discuss a YouthWIDE Cohort Grant/ });
    await expect(platform).toHaveCount(1);
    await expect(youthwide).toHaveCount(1);
    expect(await texts(page, '#mechanism .fr__inquire a')).toHaveLength(2);
    await expect(page.locator('#platform-grants').getByRole('link')).toHaveCount(0);
    expect(compact(await page.locator('#platform-grants .callout').first().textContent())).toContain('The program sizes above apply to cohort grants only. A platform grant supports JobReady’s infrastructure and staged rollout, not cohorts.');
    // one primary button in the hero and the closing band are the page’s other inquiry actions; the two route links are text links
    await expect(platform).not.toHaveClass(/btn/);
  });
});

test.describe('About: the enrollments tile (item 21)', () => {
  // WP64 (cycle-36 review, Grok): the learners tile beside it says "since 2014", so this one reads "enrollments" (said once; tests/wp64.spec.ts)
  // WP65 (cycle-37 review, Sonnet, Grok): the detail line ("Including 111,268 direct enrollments and 40,043 through courseware.") is gone from About; the register's SC-02 text and detail are unchanged (tests/wp65.spec.ts)
  test('the tile keeps "150,000+" and "enrollments" and has no detail line; the register still states the split; the item-21 wording ("111,268 direct enrollments; 40,043 through courseware") is on no page', async ({ page }) => {
    await open(page, 'about/');
    const tile = page.locator('#glance .about-stats__tile[data-fact="SC-02"]');
    await expect(tile.locator('.stat__value')).toContainText('150,000');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe('enrollments');
    await expect(tile.locator('.stat__note')).toHaveCount(0);
    expect(fact('SC-02').text).toContain('112,926 through direct training'); // WP87 (items 19 and 21): the owner's updated Ex-Trainees Data sheet (it was 111,268)
    expect(fact('SC-02').text).toContain('40,152 reached through CodersTrust curriculum and courseware'); // WP87 (items 19 and 21): 25,125 + 15,027 (it was 40,043)
    expect(sitePages().filter((p) => visible(p.html).includes('111,268 direct enrollments; 40,043 through courseware')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Learner stories: the evidence tag takes the kicker’s place (item 22)', () => {
  test('Impact: the card shows the "Individual Story" tag and no "Individual Learner Story" kicker above the outcome, and keeps the caveat; the section keeps its accessible name', async ({ page }) => {
    await open(page, 'impact/');
    const card = page.locator('#learner-voice article.ls');
    await expect(card).toHaveCount(1);
    await expect(card.locator('[data-evidence="Individual Story"]')).toHaveCount(1);
    await expect(card.locator('.eyebrow')).toHaveCount(0);
    expect(compact(await card.locator('.ls__caveat').textContent())).toBe('Individual story; not typical or promised.');
    expect(compact(await card.locator('.ls__name').textContent())).toContain('Adrian Afraham');
    await expect(page.locator('#learner-voice')).toHaveAttribute('aria-label', 'Individual Learner Story');
    expect(await mainText(page)).not.toContain('Individual Learner Story');
  });

  test('the audience pages, which show no tag, print the kicker once: "Individual Learner Story"', async ({ page }) => {
    for (const route of [DP, FOUND, UNI, EMP, LOCAL, 'partner-with-us/governments/']) {
      await open(page, route);
      const card = page.locator('#learner-voice article.ls');
      await expect(card, route).toHaveCount(1);
      await expect(card.locator('[data-evidence]'), route).toHaveCount(0);
      expect(await texts(page, '#learner-voice article.ls .eyebrow'), route).toEqual(['Individual Learner Story']);
    }
  });

  test('the four case-study pages, whose learner cards show the tag too, drop their "Learner Story" kicker (the section above them is headed "A Learner Story")', async ({ page }) => {
    const cards: Record<string, number> = { 'wsdfm-women-freelancers': 1, 'her-power': 1, 'kosovo-women-in-online-work': 1, 'undp-yes-korail': 2 };
    for (const [slug, n] of Object.entries(cards)) {
      await open(page, `impact/case-studies/${slug}/`);
      await expect(page.locator('main article.ls'), slug).toHaveCount(n);
      await expect(page.locator('main article.ls [data-evidence="Individual Story"]'), slug).toHaveCount(n);
      await expect(page.locator('main article.ls .eyebrow'), slug).toHaveCount(0);
      await expect(page.locator('main article.ls .ls__caveat'), slug).toHaveCount(n);
      await expect(page.locator('main h2', { hasText: 'A Learner Story' }).or(page.locator('main h2', { hasText: 'Two Learner Journeys' })), slug).toHaveCount(1);
    }
  });
});

test.describe('Governments: the timing answer is the procurement sentence alone (item 23)', () => {
  const GOV_ANSWER = 'Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry.';

  test('"How Fast Can We Start?" on Governments is one sentence, tied to PD-04, with the same words in the FAQ JSON-LD; no grant-pilot timing and no unregistered "after contracting" claim', async ({ page }) => {
    const variant = faqsFor('variants').find((f) => f.id === 'Q7-government')!;
    expect(variant.a).toBe(GOV_ANSWER);
    expect(variant.evidence).toEqual(['PD-04']);
    await open(page, 'partner-with-us/governments/');
    expect(await answerOf(page, 'How Fast Can We Start?')).toBe(GOV_ANSWER);
    expect((await faqJsonLd(page)).find((q) => q.name === 'How Fast Can We Start?')?.text).toBe(GOV_ANSWER);
    const text = await everything(page);
    expect(text).not.toMatch(/grant-funded pilots, agreement typically takes|after contracting/);
  });

  test('the other timing answers are unchanged: the shared Q7 (Home’s bank) and Q7-model (YouthWIDE, Our Model)', async () => {
    expect(faqs.find((f) => f.id === 'Q7')!.a).toContain('Target timing for grant-funded pilots: agreement typically takes about three weeks from first conversation, and the first cohort is typically in training 6–8 weeks after signing.');
    expect(faqsFor('variants').find((f) => f.id === 'Q7-model')!.a).toBe(
      'Target timing for grant-funded pilots: about three weeks from the first conversation to agreement, then 6–8 weeks from signing to training. Public procurement follows the agency’s own timeline.',
    );
  });
});

test.describe('Programs: no "Last updated" line on the overview (item 24)', () => {
  test('the overview prints none and keeps dateModified in its JSON-LD; the program, evidence and legal pages keep theirs', async ({ page }) => {
    await open(page, 'programs/');
    await expect(page.locator('main .updated, main .lf-updated')).toHaveCount(0);
    expect(await everything(page)).not.toMatch(/Last updated/);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"dateModified":"2026-10-15"');
    for (const route of ['programs/youthwide/', 'programs/superkids/', 'programs/jobready-work/', 'programs/nu-postgraduate-diploma/', 'impact/independent-evaluation/', 'privacy-policy/']) {
      await open(page, route);
      expect(await page.locator('.updated, .lf-updated').count(), route).toBeGreaterThan(0);
    }
  });
});

test.describe('Home and Governments: the closing band heading and link (items 25 and 26)', () => {
  test('Home’s closing steps band is headed "What Happens Next" (NEXT_STEPS_TITLE), as on the other pages; its eyebrow and steps are unchanged', async ({ page }) => {
    expect(NEXT_STEPS_TITLE).toBe('What Happens Next');
    await open(page, '');
    await expect(page.locator('#next-steps h2')).toHaveText('What Happens Next');
    await expect(page.locator('#next-steps .eyebrow').first()).toHaveText('Target Timing for Grant-Funded Pilots');
    await expect(page.locator('#next-steps ol h3')).toHaveText([/Discovery \(Week 1\)/, /Co-Design \(Week 2\)/, /Agreement \(Week 3\)/, /Training Starts 6–8 Weeks After Signing/]);
    expect(sitePages().filter((p) => visible(p.html).includes('What Happens After You Contact Us')).map((p) => p.route)).toEqual([]);
  });

  test('the Governments call-to-action band’s text link reads "See YouthWIDE for Governments" and keeps its destination (the Bangladesh band of the YouthWIDE page)', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const link = page.locator('#cta').getByRole('link', { name: /See YouthWIDE for Governments/ });
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toMatch(/\/programs\/youthwide\/#governments$/);
    await expect(link).not.toHaveClass(/btn/);
    expect(sitePages().filter((p) => visible(p.html).includes('See government programs')).map((p) => p.route)).toEqual([]);
    expect('See YouthWIDE for Governments').toBe(titleCase('See YouthWIDE for Governments'));
  });
});

test.describe('TalentLEAP stage pipeline: "Further TalentLEAP levels are planned." (item 27)', () => {
  const PROSPER = 'Career paths, continuing development and the alumni network. Further TalentLEAP levels are planned.';

  test('Our Model and TalentLEAP print the same five steps from one source; the last step ends with the new sentence; the TalentLEAP structured data says the same', async ({ page }) => {
    expect(STAGE_STEPS).toHaveLength(5);
    expect(STAGE_STEPS.map((s) => s.name)).toEqual(['Assess', 'Learn', 'Prepare for Certification', 'Earn', 'Prosper']);
    expect(STAGE_STEPS[4].text).toBe(PROSPER);
    for (const route of ['our-model/', 'our-model/talentleap/']) {
      await open(page, route);
      await expect(page.locator('figure.sp .sp__step'), route).toHaveCount(5);
      expect(await texts(page, 'figure.sp .sp__text'), route).toEqual(STAGE_STEPS.map((s) => s.text));
      expect(compact(await page.locator('figure.sp .sp__step').last().locator('.sp__text').textContent()), route).toBe(PROSPER);
    }
    await open(page, 'our-model/talentleap/');
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain(PROSPER);
    expect(ld).not.toContain('Progressive levels are planned beyond the first published level');
  });

  test('the earlier sentence is on no page; the two related clauses that were not part of this review (the Our Model TalentLEAP card, the Investors Prosper step) are unchanged', async ({ page }) => {
    expect(sitePages().filter((p) => p.html.includes('Progressive levels are planned beyond the first published level')).map((p) => p.route)).toEqual([]);
    await open(page, 'our-model/');
    expect(await everything(page)).toContain('with progressive levels planned beyond the first published level.');
    await open(page, INVEST);
    expect(await everything(page)).toContain('TalentLEAP career paths; progressive levels are planned beyond the first published level.');
  });
});

test.describe('Home: the hero trial card says "10.3 more" (item 28)', () => {
  test('the caption states RC-02’s own figure beside the "+10.3" above it; the Independent Evaluation plain-language line keeps its rounded "about 10"', async ({ page }) => {
    expect(fact('RC-02').stat?.numeric).toBe(10.3);
    await open(page, '');
    const card = page.locator('.hh__card[data-fact="RC-02"]');
    await expect(card.locator('.hh__num')).toHaveText('+10.3');
    await expect(card.locator('.hh__unit')).toHaveText('percentage points');
    await expect(card.locator('.hh__figlabel')).toHaveText('For every 100 women offered a place in CodersTrust’s 200-hour WSDFM program, 10.3 more were in work than in the control group.');
    await open(page, 'impact/independent-evaluation/');
    expect(compact(await page.locator('[data-plain-line]').textContent())).toBe('For every 100 women offered a place, about 10 more were in work at follow-up than among 100 comparable women in the control group (+10.3 percentage points).');
    expect(sitePages().filter((p) => visible(p.html).includes('about 10 more were in work than in the control group')).map((p) => p.route)).toEqual([]);
  });
});
