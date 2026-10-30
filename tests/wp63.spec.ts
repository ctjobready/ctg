import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { POSITIONING, SCORECARD_LABELS, VALUE_PROPOSITION, WSDFM_RECORDS } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP63 behaviors (cycle-35 whole-site reviews, Perplexity models; the accepted triage items G1, G2, GP3, L4, K2, K5, M3, M4, M6, R1, R4, R5, R6, L6 and K8; R9 was not done). Retrospective coverage (the owner exempted this
 * project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp63.spec.ts --project=chromium`):
 *   - G1: an offer letter documents work, not earnings: YouthWIDE’s Reporting row and the shared "How Do You Prove Outcomes?" answer say "work and earnings";
 *   - G2: "Will This Work in Our Country?" is two plain sentences on the hub, Home and YouthWIDE, with each audience variant opening with its own first sentence (tests/wp62.spec.ts holds the audience pages);
 *   - GP3: JobReady Platform’s roadmap sentence ends "..., not live yet.";
 *   - L4: Home slide 1’s lead says "women offered a place had an estimated 41% higher monthly income than the control group";
 *   - K2: Home slide 4’s WSDFM line is "WSDFM: 711 of 1,000 enrolled in work (71%), from program records.", one row at 1280, inside the carousel’s height budget;
 *   - K5: the Impact band and the Case Studies hub are "Five Programs Across Kosovo, Albania and Bangladesh";
 *   - M3: Home’s recognition band heads its first badge "University Partners";
 *   - M4: Home’s WSDFM card shows its program records, as the Kosovo card does;
 *   - M6: the Governments Her Power tile states the tracked base ("47% of the 800 tracked women in work, from the 2,500 women CodersTrust trained directly");
 *   - R1: Home’s "Our Approach" names "educated, unemployed and underemployed youth";
 *   - R4: YouthWIDE’s scorecard list and Home’s scorecard share one list of Title Case labels;
 *   - R5: Home’s first offer is "Multi-Cohort Pilot Program";
 *   - R6: About’s meta description names "educated, unemployed and underemployed youth" within 155 characters;
 *   - L6: Governments’ contracts table is "What Each Government Contract Covers", its anchor unchanged;
 *   - K8: the partner hub’s FAQ lead is "Two questions partners ask first.";
 *   - R9 (not done): YouthWIDE keeps its "Last updated" line because the other program, evidence and legal pages carry the same line;
 *   - RW1 (rework, coordinator): the target group is "educated, unemployed and underemployed youth" site-wide: the Governments, Development Partners and YouthWIDE leads name it, and no built page says "educated, unemployed youth" (or "young people")
 *     in its visible text; the old phrase survives only in three meta descriptions that the full group would push past 155 characters (Home, Careers, YouthWIDE) and in the generated About and Careers social-card alt text (listed and pinned below).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

/** Built pages that are not archived news posts (those keep their original wording), with their HTML. */
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The visible text of a built page (no scripts, styles or screen-reader-only parts), entities decoded. */
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
/** The routes of the built site pages whose visible text contains any of these strings. */
const pagesWith = (...needles: string[]) => sitePages().filter((p) => needles.some((n) => visible(p.html).includes(n))).map((p) => p.route);

/** The measure of tests/hero-slider.spec.ts (its budget is 48 px at 1280 and 390): unused space between the showing slide's content and the controls bar. */
const unusedBelow = (page: Page) =>
  page.evaluate(() => {
    const active = document.querySelector('[data-hs-slide].is-active');
    const controls = document.querySelector('[data-hs-bar]');
    if (!active || !controls) return Number.NaN;
    const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
    const contentBottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom));
    return Math.round(controls.getBoundingClientRect().top - contentBottom);
  });
async function showSlide(page: Page, n: number) {
  await page.locator('[data-hs-dot]').nth(n - 1).click();
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')))).toBe(n - 1);
  await page.waitForTimeout(450);
}
/** The FAQ item of a question on the page, and its answer text. */
const itemOf = (page: Page, question: string) => page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: question }) }).first();
const answerOf = async (page: Page, question: string) => compact(await itemOf(page, question).locator('.faq__a').textContent());

const HOME = '';
const HUB = 'partner-with-us/';
const GOVERNMENTS = 'partner-with-us/governments/';
const DEV_PARTNERS = 'partner-with-us/development-partners/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const IMPACT = 'impact/';
const CASE_STUDIES = 'impact/case-studies/';
const YOUTHWIDE = 'programs/youthwide/';
const ABOUT = 'about/';
const CAREERS = 'careers/';
const JOBREADY_PLATFORM = 'our-model/jobready-platform/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G1 (GPT-6.1 Sol): an offer letter documents work, not earnings', () => {
  test('the register says offer letters, payslips and platform or bank records document work and earnings (PD-09)', () => {
    expect(fact('PD-09').text).toContain('offer letters, payslips and platform or bank records document work and earnings');
  });

  test('YouthWIDE’s Reporting row says "work and earnings checked against offer letters, payslips, ...", tied to PD-08 and PD-09', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const row = page.locator('.pg__row', { has: page.locator('dt', { hasText: 'Reporting' }) });
    await expect(row).toHaveCount(1);
    expect(compact(await row.locator('dd').textContent())).toBe('Monthly reports and follow-up surveys, with work and earnings checked against offer letters, payslips, platform logs or bank receipts where available, as agreed in the program scope.');
    expect(await row.getAttribute('data-fact')).toBe('PD-08 PD-09');
  });

  test('the shared "How Do You Prove Outcomes?" answer says "Documentary evidence of work and earnings, such as offer letters, ..." on Development Partners and Foundations, and in its structured data', async ({ page }) => {
    const SENTENCE = 'Documentary evidence of work and earnings, such as offer letters, payslips, platform logs or bank receipts, is collected where available.';
    for (const route of [DEV_PARTNERS, FOUNDATIONS]) {
      await open(page, route);
      expect(await answerOf(page, 'How Do You Prove Outcomes?'), route).toContain(SENTENCE);
      const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
      expect(ld, route).toContain(SENTENCE);
    }
  });

  test('"earnings checked against payslips, offer letters" and "Documentary evidence of earnings, such as offer letters" are on no built page', () => {
    expect(pagesWith('earnings checked against payslips, offer letters', 'Documentary evidence of earnings, such as offer letters')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G2 (GPT-6.1 Sol): "Will This Work in Our Country?" is two plain sentences', () => {
  const ANSWER = 'We test local employer demand first and choose each country’s tracks with local partners. Our outcome evidence comes mainly from Bangladesh, with program results from Kosovo and delivery experience in Albania.';

  test('Home, the partner hub and YouthWIDE print the same answer, resting on IN-02, PD-10, PR-02 and TL-05, with the same words in their structured data', async ({ page }) => {
    for (const route of [HOME, HUB, YOUTHWIDE]) {
      await open(page, route);
      expect(await answerOf(page, 'Will This Work in Our Country?'), route).toBe(ANSWER);
      const evidence = (await itemOf(page, 'Will This Work in Our Country?').locator('.faq__a p').first().getAttribute('data-fact')) ?? '';
      expect(evidence.split(' '), route).toEqual(['IN-02', 'PD-10', 'PR-02', 'TL-05']);
      const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
      expect(ld, route).toContain(ANSWER);
    }
  });

  test('the answer is two sentences and states no figure; Albania adds delivery experience, not results', async ({ page }) => {
    await open(page, HOME);
    const answer = await answerOf(page, 'Will This Work in Our Country?');
    expect(answer.split(/(?<=\.) (?=[A-Z])/)).toHaveLength(2);
    expect(answer).not.toMatch(/\d/);
    expect(answer).toContain('delivery experience in Albania');
    expect(answer).not.toMatch(/Albania[^.]*results/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GP3 (GPT-6.1 Sol): the JobReady Platform roadmap sentence', () => {
  test('"Planned Adaptive Learning" says "..., not live yet." once, tied to IN-06', async ({ page }) => {
    await open(page, JOBREADY_PLATFORM);
    await expect(page.locator('#roadmap h2')).toHaveText('Planned Adaptive Learning');
    const body = page.locator('#roadmap p');
    await expect(body).toHaveCount(1);
    await expect(body).toHaveText('Planned: personalized and adaptive learning based on TalentLEAP’s competency levels, not live yet.');
    expect(await body.getAttribute('data-fact')).toBe('IN-06');
    expect(pagesWith('This is roadmap, not live.')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L4 (GLM) and K2 (Kimi): Home slides 1 and 4', () => {
  test('slide 1’s lead reads "women offered a place had an estimated 41% higher monthly income than the control group", from RC-01 and RC-04; nothing says "their monthly income was"', async ({ page }) => {
    await open(page, HOME);
    const lead = slide(page, 1).locator('.hs__lead');
    expect(compact(await lead.textContent())).toBe('In CodersTrust’s WSDFM program, women offered a place had an estimated 41% higher monthly income than the control group, about $27 more a month.');
    expect(await lead.getAttribute('data-fact')).toBe('RC-01 RC-04');
    expect(fact('RC-01').stat?.numeric).toBe(41);
    expect(fact('RC-04').stat?.numeric).toBe(27);
    expect(pagesWith('their monthly income was an estimated')).toEqual([]);
  });

  test('slide 4’s WSDFM line is "WSDFM: 711 of 1,000 enrolled in work (71%), from program records.", from PR-01 and RC-07, and it is one row at 1280 (as long as the Kosovo line)', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HOME);
    const lines = slide(page, 4).locator('.hs__lines li');
    expect(compact(await lines.nth(1).textContent())).toBe('WSDFM: 711 of 1,000 enrolled in work (71%), from program records.');
    expect(await lines.nth(1).getAttribute('data-fact')).toBe('PR-01');
    expect(fact('PR-01').stat?.value).toBe('711 of 1,000');
    expect(fact('PR-01').stat?.label).toBe('WSDFM: 71% of enrolled women in work');
    expect(fact('RC-07').text).toContain('833 women at baseline');
    const heights = await lines.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(heights[1], 'the WSDFM line wraps').toBe(heights[0]);
  });

  test('every slide keeps the 48 px budget at 1280 and 390, and nothing scrolls sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      for (const n of [1, 2, 3, 4]) {
        await showSlide(page, n);
        expect(await unusedBelow(page), `slide ${n} at ${vp.width}px`).toBeLessThanOrEqual(48);
      }
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K5 (Kimi): "Five Programs Across Kosovo, Albania and Bangladesh"', () => {
  const HEADING = 'Five Programs Across Kosovo, Albania and Bangladesh';

  test('the Impact band and the Case Studies hub use it (Title Case), the hub’s <title> names the same three countries, and the earlier heading is on no built page', async ({ page }) => {
    expect(HEADING).toBe(titleCase(HEADING));
    await open(page, IMPACT);
    await expect(page.locator('#cases').getByRole('heading', { level: 2, name: HEADING })).toHaveCount(1);
    await open(page, CASE_STUDIES);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(HEADING);
    await expect(page).toHaveTitle('Case Studies: Kosovo, Albania and Bangladesh | CodersTrust');
    expect(pagesWith('Five Programs, from Kosovo to Bangladesh', 'Case Studies: Kosovo to Bangladesh')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('M3 (Gemini): Home’s recognition band', () => {
  test('its first badge is "University Partners" (only UPEACE is UN-mandated, and its own line says so); "University and UN-Mandated Partners" is on no built page', async ({ page }) => {
    await open(page, HOME);
    const band = page.locator('#recognition');
    await expect(band.locator('h3')).toHaveText(['University Partners', 'Amazon Web Services (AWS)', 'HolonIQ South Asia EdTech 100']);
    const first = band.locator('.rec__badge').first();
    expect(compact(await first.textContent())).toContain('University for Peace (UPEACE), the UN-mandated university');
    expect(await first.getAttribute('data-fact')).toBe('PA-05');
    expect(pagesWith('University and UN-Mandated Partners')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('M4 (Gemini): Home’s WSDFM card shows its program records, as the Kosovo card does', () => {
  test('its context line is "Program records: 711 of the 1,000 women enrolled were in work (71%).", from PR-01, with no-break spaces in the figure, and no headline figure or caption', async ({ page }) => {
    await open(page, HOME);
    const card = page.locator('#cases article').first();
    expect(compact(await card.locator('.card__title').textContent())).toBe('Women’s Skill Development for Freelancing Marketplace (WSDFM)');
    const line = card.locator('.case__context');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe('Program records: 711 of the 1,000 women enrolled were in work (71%).');
    expect(compact(WSDFM_RECORDS.text)).toBe('Program records: 711 of the 1,000 women enrolled were in work (71%).');
    expect(WSDFM_RECORDS.facts).toEqual(['PR-01']);
    expect(await line.getAttribute('data-fact')).toBe('PR-01');
    expect(await line.evaluate((el) => (el.textContent ?? '').includes('711\u00a0of\u00a0the\u00a01,000'))).toBe(true);
    await expect(card.locator('.case__stat, .case__value, .case__label')).toHaveCount(0);
    expect(fact('PR-01').text).toContain('711 of the 1,000 women enrolled were in work (71%)');
  });

  test('the three cards hold their layout at 1280 and 390: each context line sits above its title inside the card, and nothing scrolls sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      const order = await page.locator('#cases article').evaluateAll((els) =>
        els.map((el) => {
          const context = el.querySelector('.case__context')!.getBoundingClientRect();
          const title = el.querySelector('.card__title')!.getBoundingClientRect();
          const body = el.querySelector('.card__body')!.getBoundingClientRect();
          return { contextBottom: context.bottom, titleTop: title.top, contextRight: context.right, bodyRight: body.right };
        }),
      );
      order.forEach((o, i) => {
        expect(o.contextBottom, `${vp.width}px, card ${i + 1}`).toBeLessThanOrEqual(o.titleTop + 1);
        expect(o.contextRight, `${vp.width}px, card ${i + 1}`).toBeLessThanOrEqual(o.bodyRight + 1);
      });
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('M6 (Gemini): the Governments Her Power tile states the tracked base', () => {
  test('the tile reads "372 of 800" over "Her Power: tracked women in work (47%), among the 2,400 women CodersTrust trained directly" (the 800 and the 47% are PR-05’s), and the case cards keep their caption', async ({ page }) => {
    expect(fact('PR-05').stat?.value).toBe('372 of 800');
    expect(fact('PR-05').stat?.label).toBe('tracked women, from the 2,400 trained directly by CodersTrust, in work: 47%');
    await open(page, GOVERNMENTS);
    const tile = page.locator('#glance a[data-fact^="PR-05"]');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.locator('.pg__value').textContent())).toBe('372 of 800');
    expect(compact(await tile.locator('.pg__desc').textContent())).toBe('Her Power: tracked women in work (47%), among the 2,400 women CodersTrust trained directly');
    for (const route of [DEV_PARTNERS, FOUNDATIONS]) {
      await open(page, route);
      expect((await texts(page, '#cases article')).join(' | '), route).toContain('372 of 800 tracked women in work (47%), among the 2,400 women CodersTrust trained directly');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R1 (Grok): Home’s "Our Approach" names the group as ID-01 does', () => {
  const STATEMENT = 'CodersTrust connects training, mentoring and placement support for educated, unemployed and underemployed youth, with monthly reports on progress toward paid work, as agreed in the program scope.';

  test('the statement is one sentence on Home, in the source, and declared whole in the facts gate, independently of the source', async ({ page }) => {
    expect(POSITIONING.home.text).toBe(STATEMENT);
    expect(fact('ID-01').text).toContain('educated, unemployed and underemployed youth');
    const gate = readFileSync(new URL('../scripts/check-facts.mjs', import.meta.url), 'utf8');
    expect(/const POSITION_WHOLE_STATEMENT = \{([\s\S]*?)\n\};/.exec(gate)?.[1] ?? '').toContain(`'/': '${STATEMENT}'`);
    await open(page, HOME);
    const text = compact(await page.locator('#mechanism .pos__text').textContent());
    expect(text).toBe(STATEMENT);
    expect(text.split(/(?<=\.)\s+/)).toHaveLength(1);
    expect(pagesWith('support for educated, unemployed youth, with monthly reports')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R4 (Grok): the scorecard measures are one list of Title Case labels', () => {
  test('YouthWIDE’s "Managed Rollout" list and Home’s pilot scorecard print the same five labels, in Title Case', async ({ page }) => {
    expect([...SCORECARD_LABELS]).toEqual(['Completion', 'Certification', 'First Paid Work', 'Sustained Work', 'Cost per Completer and per Verified Outcome']);
    for (const label of SCORECARD_LABELS) expect(label).toBe(titleCase(label));
    await open(page, YOUTHWIDE);
    expect(await texts(page, '.measures li')).toEqual([...SCORECARD_LABELS]);
    await open(page, HOME);
    expect(await texts(page, '#offer .psc__label')).toEqual([...SCORECARD_LABELS]);
    expect(fact('PD-11').text.toLowerCase()).toContain('cost per completer and per verified outcome');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R5 (Grok): Home’s first offer is the "Multi-Cohort Pilot Program"', () => {
  test('option 1 carries the shared name, scoped in the discovery session; "First Multi-Cohort Pilot" is on no built page', async ({ page }) => {
    await open(page, HOME);
    const first = page.locator('#offer ol > li').first();
    await expect(first.locator('h3')).toHaveText('Multi-Cohort Pilot Program');
    await expect(first.locator('.eyebrow')).toHaveText('Option 1');
    await expect(first).toContainText('Prove the model in one country or region.'); // WP129: the second sentence ("Scope the number of cohorts and trainees with us in the discovery session.") is gone; the band lead above says it
    await expect(first).not.toContainText('Scope the number of cohorts');
    expect(pagesWith('First Multi-Cohort Pilot')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R6 (Grok): About’s meta description names the group as ID-01 does', () => {
  test('it is 151 characters (limit 155), says "educated, unemployed and underemployed youth" and "has worked in 16 countries and territories", in the page and in og:description', async ({ page }) => {
    await open(page, ABOUT);
    const D = 'New York-headquartered CodersTrust trains educated, unemployed and underemployed youth for digital work and has worked in 16 countries and territories.';
    expect(D.length).toBe(151);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe(D);
    expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(D);
    expect(D).toContain('educated, unemployed and underemployed youth');
    expect(fact('SC-03').stat?.value).toBe('16');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L6 (GLM): the Governments contracts table', () => {
  test('it is headed "What Each Government Contract Covers" (Title Case) and keeps its anchor, #contracts, which the glance tile links to (the scale answer did too until WP67, cycle-38 review); the earlier heading is on no built page', async ({ page }) => {
    const HEADING = 'What Each Government Contract Covers';
    expect(HEADING).toBe(titleCase(HEADING));
    await open(page, GOVERNMENTS);
    await expect(page.locator('#contracts h2')).toHaveText(HEADING);
    await expect(page.locator('#contracts h2')).toHaveCount(1);
    await expect(page.locator('#glance a[href$="#contracts"]')).toHaveCount(1);
    expect(pagesWith('Six Government Contracts, Scope by Scope')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K8 (Kimi): the partner hub’s FAQ lead', () => {
  test('it reads "Two questions partners ask first. Each route page answers the rest."', async ({ page }) => {
    await open(page, HUB);
    await expect(page.locator('#faqs .sh__lead')).toHaveText('Two questions partners ask first. Each route page answers the rest.');
    expect(pagesWith('Two questions every partner asks')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R9 (Grok, not done): YouthWIDE keeps its "Last updated" line', () => {
  test('the line is on YouthWIDE and on the other program, evidence and legal pages that carry one, so it is not a one-page oddity', async ({ page }) => {
    const withLine = sitePages().filter((p) => /Last updated [A-Z][a-z]+ \d{1,2}, \d{4}/.test(visible(p.html))).map((p) => p.route);
    expect(withLine).toContain('/programs/youthwide/');
    expect(withLine.length, `pages with a "Last updated" line: ${withLine.join(', ')}`).toBeGreaterThan(5);
    await open(page, YOUTHWIDE);
    await expect(page.locator('.updated')).toHaveText('Last updated October 31, 2026'); // WP104
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('RW1 (rework; coordinator, extending Grok R1): the target group is "educated, unemployed and underemployed youth" site-wide', () => {
  const GROUP = 'educated, unemployed and underemployed youth';
  const OLD_GROUP = /educated,\s+unemployed\s+(?:youth|young people)/i;

  test('the Governments and Development Partners leads name the group as ID-01 does; the Governments line is also its meta description, within 155 characters', async ({ page }) => {
    expect(fact('ID-01').text).toContain(GROUP);
    expect(VALUE_PROPOSITION.governments).toBe('We help governments prepare educated, unemployed and underemployed youth for paid digital work through mentored, certification-focused training.');
    expect(VALUE_PROPOSITION.developmentPartners).toBe('We help development partners prepare educated, unemployed and underemployed youth for paid work through mentored, certification-focused training.');
    await open(page, GOVERNMENTS);
    expect(compact(await page.locator('main .hero__lead').first().textContent())).toBe(VALUE_PROPOSITION.governments);
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toBe(VALUE_PROPOSITION.governments);
    expect(description.length).toBeLessThanOrEqual(155);
    await open(page, DEV_PARTNERS);
    expect(compact(await page.locator('main .hero__lead').first().textContent())).toBe(VALUE_PROPOSITION.developmentPartners);
  });

  test('YouthWIDE’s hero lead and its "Who It Is For" row name it too', async ({ page }) => {
    await open(page, YOUTHWIDE);
    expect(compact(await page.locator('#hero .hero__lead').textContent())).toBe('YouthWIDE helps governments and funders prepare educated, unemployed and underemployed youth for paid digital work through training, mentoring and placement support.');
    const row = page.locator('.pg__row', { has: page.locator('dt', { hasText: 'Who It Is For' }) });
    expect(compact(await row.locator('dd').textContent())).toBe('Governments, development partners and funders who want to report on educated, unemployed and underemployed young people moving into paid digital work.');
  });

  test('no built page says "educated, unemployed youth" or "educated, unemployed young people" in its visible text (the component gallery included)', () => {
    expect(sitePages().some((p) => p.route === '/styleguide/'), 'the staging build has the component gallery').toBe(true);
    expect(sitePages().filter((p) => OLD_GROUP.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  // WP104 (Sonnet High run 1): the three meta descriptions that kept the old phrase (Home, Careers, YouthWIDE) now name the full group within 155 characters (tests/wp104.spec.ts), so the old phrase survives nowhere in a built page.
  // WP101: the social cards were refreshed from current copy (scripts/build-og.mjs), so the About and Careers card alt texts no longer carry the old phrase.
  test('the old phrase survives nowhere (the three meta descriptions that kept it now name the full group within 155 characters; the social-card alt texts never carry it)', async ({ page }) => {
    const tag = (html: string, attr: string, value: string) => new RegExp(`<meta[^>]*\\b${attr}="${value}"[^>]*\\bcontent="([^"]*)"`, 'i').exec(html)?.[1] ?? '';
    const pages = sitePages().filter((p) => OLD_GROUP.test(p.html));
    expect(pages.filter((p) => OLD_GROUP.test(tag(p.html, 'name', 'description'))).map((p) => p.route), 'no meta description carries the old phrase').toEqual([]);
    expect(pages.filter((p) => OLD_GROUP.test(tag(p.html, 'property', 'og:image:alt'))).map((p) => p.route), 'no social-card alt text carries the old phrase').toEqual([]);
    expect(pages.map((p) => p.route), 'the phrase is nowhere else').toEqual([]);
    for (const route of [HOME, CAREERS, YOUTHWIDE]) {
      await open(page, route);
      const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
      expect(description, route).toContain('educated, unemployed and underemployed');
      expect(description.length, route).toBeLessThanOrEqual(155);
    }
    // About's description already names the full group (R6), and its card alt text is the page's own title
    await open(page, ABOUT);
    expect((await page.locator('meta[name="description"]').getAttribute('content')) ?? '').toContain(GROUP);
    expect(await page.locator('meta[property="og:image:alt"]').getAttribute('content')).toBe('CodersTrust: About. A Global Workforce Organization, Built on Evidence.');
  });
});
