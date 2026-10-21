import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { INVESTOR_PARTNERS } from '../src/data/copy';
import { UNDP_YES_TILE_LABEL } from '../src/components/pages/partners/partners';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP65 behaviors (cycle-37 whole-site reviews, Perplexity models; the accepted triage items 1 to 6; item 6's third part, the Impact "Cause:" label, was skipped because its condition was not met). Retrospective coverage (the owner exempted this project
 * from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp65.spec.ts --project=chromium`):
 *   - 1: Our Model's "Local Labs, Coordinated Delivery" card reads "From about month 5 of a program, delivery is designed to run up to 10 certification cohorts in parallel, ..." (PD-06's register text is unchanged; WP67, cycle-38 review, Grok: it reads "After about five months of delivery, programs are designed to run up to 10 ..." now, tests/wp67.spec.ts);
 *   - 2: About's enrollments tile is its number and label alone: "Including 111,268 direct enrollments and 40,043 through courseware." is gone from About (SC-02's register detail is unchanged; Investors still prints the split);
 *   - 3: Foundations' fourth glance tile is the UNDP YES, Korail program record (PR-03, Development Partners' tile and label) in place of the WSDFM tile, so "711 of 1,000" and its not-the-trial caption are stated once, on the Proof in Practice card
 *     (UNDP YES, Korail was on no other part of Foundations, so the tile was replaced rather than the card's caption removed);
 *   - 4: Investors' private-sector sentence reads "Private-sector partners include Grameenphone Academy and Accenture, and CodersTrust is an AWS Authorized Training Partner." and rests on PA-06 beside PA-03;
 *   - 5: Foundations' platform-grant row says "Youth-program outcomes are not platform outcomes." and nothing more;
 *   - 6: Governments' contracts note opens "We confirm each contract’s delivery status in a briefing."; Development Partners' first "What Your Portfolio Gets" card reads "CodersTrust connects training, mentoring and placement support in one program.";
 *     the Impact ladder keeps "Cause:" (no sibling row carries a label, so there is no label form to make consistent).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

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

const OUR_MODEL = 'our-model/';
const ABOUT = 'about/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const DEV_PARTNERS = 'partner-with-us/development-partners/';
const GOVERNMENTS = 'partner-with-us/governments/';
const INVESTORS = 'partner-with-us/investors/';
const IMPACT = 'impact/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 1 (Sonnet, Grok, Kimi): the Our Model scale card says month 5 is a month of a program', () => {
  const TEXT = 'After about five months of delivery, programs are designed to run up to 10 certification cohorts in parallel, using existing labs and certified local facilitators.'; // WP67 (cycle-38 review, Grok): it was "From about month 5 of a program, delivery is designed to run ..."

  test('"Local Labs, Coordinated Delivery" reads as above, still rests on PD-06, and the earlier sentence is on no built page', async ({ page }) => {
    await open(page, OUR_MODEL);
    const card = page.locator('#delivery .card', { hasText: 'Local Labs, Coordinated Delivery' });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.card__text').textContent())).toBe(TEXT);
    expect(await card.locator('[data-fact]').getAttribute('data-fact')).toBe('PD-06');
    expect(pagesWith('From about month 5, programs are designed')).toEqual([]);
  });

  test('the register’s PD-06 text is unchanged: it counts "from about month 5" as a month of the program, which is what the card now says', () => {
    expect(fact('PD-06').text).toBe(
      'Up to 10 certification cohorts in parallel from about month 5; classes of 20 (labs) and 40 (lectures); hub-and-spoke delivery with certified local facilitators for larger programs',
    );
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: the six delivery cards stay inside the page`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, OUR_MODEL);
      await scrollThrough(page);
      await expect(page.locator('#delivery .card')).toHaveCount(6);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 2 (Sonnet, Grok): About’s enrollments tile has no detail line', () => {
  test('the tile is "150,000+" and "course enrollments" with no note; About states neither 111,268 nor 40,043', async ({ page }) => {
    await open(page, ABOUT);
    const tile = page.locator('#glance .about-stats__tile[data-fact="SC-02"]');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.stat__value')).toContainText('150,000');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe('course enrollments');
    await expect(tile.locator('.stat__note')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/111,268|40,043|direct enrollments|through courseware/);
  });

  // WP66 (owner request 2026-10-20): the SC-11 tile carries the register's detail line, the four categories of signed agreements, so two tiles have a note now: the countries tile and the signed-agreements tile (tests/wp66.spec.ts)
  test('the other tiles keep their notes: only the countries tile ("Most delivery has been in Bangladesh.") and the signed-agreements tile (its four categories, WP66) have one, and the five tiles stay in the page order', async ({ page }) => {
    await open(page, ABOUT);
    expect(await texts(page, '#glance .about-stats .stat__note')).toEqual([
      'Most delivery has been in Bangladesh.',
      '13 government bodies, 20 universities and colleges, 13 development partners and NGOs, 27 companies and industry bodies.',
    ]);
    expect(await page.locator('#glance .about-stats [data-fact]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['SC-01', 'SC-02', 'SC-03', 'SC-11', 'SC-09']);
  });

  test('SC-02 is unchanged in the register, and Investors still prints the split from its detail line', async ({ page }) => {
    expect(fact('SC-02').text).toContain('111,268 through direct training across 45 programs and 40,043 through CodersTrust courseware');
    expect(fact('SC-02').stat?.detail).toBe('Of 150,000+ enrollments: 111,268 direct and 40,043 through CodersTrust courseware.');
    await open(page, INVESTORS);
    expect(compact(await page.locator('#guide .ig__notes').textContent())).toContain('Of 150,000+ enrollments: 111,268 direct and 40,043 through CodersTrust courseware.');
    // the wording WP50 gave About's tile is on no page; the split is on Investors and no longer on About
    expect(pagesWith('Including 111,268 direct enrollments and 40,043 through courseware.')).toEqual([]);
    const withSplit = pagesWith('111,268');
    expect(withSplit).toContain('/partner-with-us/investors/');
    expect(withSplit).not.toContain('/about/');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: the five glance tiles stay inside the page`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, ABOUT);
      await scrollThrough(page);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 3 (GPT-6.1 Sol, Gemini): Foundations’ fourth glance tile is UNDP YES, Korail; "711 of 1,000" is stated once', () => {
  const LABEL = 'of the 350 enrolled in UNDP YES, Korail (2017), found their first job within three months';

  test('the glance runs trial, survey, Kosovo, UNDP YES; the fourth tile is "67%", tagged Program Record, linking the UNDP YES case study, with no note', async ({ page }) => {
    await open(page, FOUNDATIONS);
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-02', 'OC-03', 'PR-02', 'PR-03']);
    const tile = page.locator('#glance .pg__lead a[data-fact~="PR-03"]');
    await expect(tile).toHaveCount(1);
    expect(await tile.getAttribute('data-fact')).toBe('PR-03');
    await expect(tile.locator('.pg__value')).toHaveText('67%');
    await expect(tile.locator('.pg__desc')).toHaveText(LABEL);
    await expect(tile.locator('[data-evidence="Program Record"]')).toHaveCount(1);
    await expect(tile.locator('.pg__note')).toHaveCount(0);
    expect(await tile.getAttribute('href')).toMatch(/\/impact\/case-studies\/undp-yes-korail\/$/);
    await expect(page.locator('#glance h3')).toHaveCount(0);
  });

  test('one source: Foundations and Development Partners print the same label (UNDP_YES_TILE_LABEL, PR-03’s glance label with its 2017), and the Impact tile keeps the register’s own', async ({ page }) => {
    expect(UNDP_YES_TILE_LABEL).toBe(LABEL);
    expect(fact('PR-03').stat?.glance?.label).toBe('of the 350 enrolled in UNDP YES, Korail, found their first job within three months');
    expect(fact('PR-03').text).toContain('Swanirvar Bangladesh, 2017: 350 enrolled;');
    for (const route of [FOUNDATIONS, DEV_PARTNERS]) {
      await open(page, route);
      await expect(page.locator('#glance .pg__lead a[data-fact="PR-03"] .pg__desc'), route).toHaveText(UNDP_YES_TILE_LABEL);
    }
    await open(page, IMPACT);
    await expect(page.locator('#glance a[data-fact~="PR-03"] .glance__desc')).toHaveText('of the 350 enrolled in UNDP YES, Korail, found their first job within three months');
  });

  test('"711 of 1,000" and its not-the-trial caption are stated once on Foundations, on the Proof in Practice WSDFM card; the glance carries neither the figure nor the note', async ({ page }) => {
    await open(page, FOUNDATIONS);
    const text = await mainText(page);
    expect(count(text, '711 of 1,000')).toBe(1);
    expect(count(text, 'WSDFM program records (not trial data; the trial studied 833 women): 71% in work')).toBe(1);
    expect(count(text, 'Program records, separate from the randomized trial')).toBe(0);
    const card = page.locator('#cases article', { hasText: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)' });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.case__value')).toHaveText('711 of 1,000');
    const glance = compact(await page.locator('#glance').textContent());
    expect(glance).not.toMatch(/711|WSDFM|833/);
    // the card’s band still names the trial’s count beside the program record (RC-07 beside PR-01), and keeps its second card
    expect(((await page.locator('#cases [data-fact]').first().getAttribute('data-fact')) ?? '').split(' ')).toEqual(expect.arrayContaining(['PR-01', 'RC-07', 'PR-05']));
    expect(await texts(page, '#cases article .card__title')).toEqual(['Women’s Skill Development for Freelancing Marketplace (WSDFM)', 'Her Power']);
  });

  test('UNDP YES, Korail was on no other part of Foundations, so it is stated once, in the tile', async ({ page }) => {
    await open(page, FOUNDATIONS);
    const text = await mainText(page);
    expect(count(text, 'UNDP YES')).toBe(1);
    expect(count(text, 'Korail')).toBe(1);
    expect(count(text, '350 enrolled')).toBe(1);
  });

  test('the four tiles sit in one row at 1280; at 390 they stack and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, FOUNDATIONS);
    await scrollThrough(page);
    const tops = await page.locator('#glance .pg__lead > li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops).toHaveLength(4);
    expect(new Set(tops).size, 'one row at 1280').toBe(1);
    expect(await noOverflow(page)).toBe(true);
    await page.setViewportSize(MOBILE);
    await open(page, FOUNDATIONS);
    await scrollThrough(page);
    const stacked = await page.locator('#glance .pg__lead > li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(stacked).size, 'four rows at 390').toBe(4);
    await expect(page.locator('#glance .pg__lead a[data-fact~="PR-03"] .pg__desc')).toBeVisible();
    expect(await noOverflow(page)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 4 (GLM; Sonnet in cycles 34 and 36): Investors names AWS by its registered status', () => {
  const SENTENCE = 'Private-sector partners include Grameenphone Academy and Accenture, and CodersTrust is an AWS Authorized Training Partner.';

  test('the track-record paragraph ends with the sentence above, and its facts are PA-02, PA-01, PA-05, PA-03 and PA-06', async ({ page }) => {
    await open(page, INVESTORS);
    const paragraph = page.locator('#guide .ig__names');
    await expect(paragraph).toHaveCount(1);
    const text = compact(await paragraph.textContent());
    expect(text.endsWith(SENTENCE)).toBe(true);
    expect(text).not.toContain('Accenture and AWS.');
    expect(await paragraph.getAttribute('data-fact')).toBe('PA-02 PA-01 PA-05 PA-03 PA-06');
    expect(INVESTOR_PARTNERS.facts).toEqual(['PA-02', 'PA-01', 'PA-05', 'PA-03', 'PA-06']);
    expect(INVESTOR_PARTNERS.text.endsWith(SENTENCE)).toBe(true);
  });

  test('the register is unchanged: PA-06 reads "AWS Authorized Training Partner" (the status) and PA-03 still lists AWS beside the other private-sector partners', () => {
    expect(fact('PA-06').text).toBe('AWS Authorized Training Partner');
    expect(fact('PA-03').text).toBe('Private-sector partners include Grameenphone Academy, Robi, Accenture, BASIS and AWS');
  });

  test('no built page lists AWS as a private-sector partner beside Accenture', () => {
    expect(pagesWith('Grameenphone Academy, Accenture and AWS')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 5 (Gemini): the platform-grant row says one thing', () => {
  test('"What the Evidence Covers" for Funding Route 2 is "Youth-program outcomes are not platform outcomes." alone; Route 1’s cell is unchanged', async ({ page }) => {
    await open(page, FOUNDATIONS);
    expect(await texts(page, '#funding-routes tbody td:nth-child(3)')).toEqual(['Builds on results from earlier programs in Bangladesh and Kosovo.', 'Youth-program outcomes are not platform outcomes.']);
    expect(count(await mainText(page), 'Youth-program outcomes are not platform outcomes.')).toBe(1);
  });

  test('the sentence it dropped, "The outcome evidence on this page comes from the youth programs, not from the platform.", is on no built page', () => {
    expect(pagesWith('The outcome evidence on this page comes from the youth programs')).toEqual([]);
  });

  test('the row’s platform status (IN-04) is unchanged and the table still stacks on a phone without sideways scroll', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, FOUNDATIONS);
    await scrollThrough(page);
    const cell = page.locator('#funding-routes tr[data-fact="IN-04"] td').first();
    expect(compact(await cell.textContent())).toContain('A grant toward platform infrastructure, not toward cohorts. Live today: partner portals and AI chat.');
    expect(await noOverflow(page)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 6 (Gemini, Kimi, Sonnet): polish', () => {
  test('Governments: the contracts note opens "We confirm each contract’s delivery status in a briefing." and keeps its second sentence and GV-10', async ({ page }) => {
    await open(page, GOVERNMENTS);
    expect(compact(await page.locator('#contracts .ct__notes').textContent())).toBe(
      'We confirm each contract’s delivery status in a briefing. Apart from the Her Power figures, scopes are contracted scopes of work, not delivered scale.',
    );
    expect(await page.locator('#contracts .ct__notes p').getAttribute('data-fact')).toBe('GV-10');
    expect(pagesWith('Delivery status is confirmed for each contract')).toEqual([]);
  });

  test('Development Partners: the first "What Your Portfolio Gets" card reads "CodersTrust connects training, mentoring and placement support in one program." (PD-01)', async ({ page }) => {
    await open(page, DEV_PARTNERS);
    const card = page.locator('#features li.card').first();
    await expect(card.locator('h3')).toHaveText('Training, Mentoring and Placement Support');
    expect(await texts(page, '#features li.card:nth-child(1) p')).toEqual(['CodersTrust connects training, mentoring and placement support in one program.']);
    expect(await card.getAttribute('data-fact')).toBe('PD-01');
    expect(pagesWith('One delivery partner connects training')).toEqual([]);
  });

  test('Impact (skipped): only the survey row’s "What It Does Not Show" carries a label ("Cause:"), so there is no label form shared by the siblings and the cell is unchanged', async ({ page }) => {
    await open(page, IMPACT);
    const cells = await texts(page, '#evidence-ladder tbody td[data-label="What It Does Not Show"]');
    expect(cells).toHaveLength(4);
    expect(cells.filter((c) => /^[A-Z][a-z]+:/.test(c))).toEqual(['Cause: respondents are not a random sample and may over-represent successful learners.']);
    expect(cells.filter((c) => /^Cause:/.test(c))).toHaveLength(1);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: Governments, Development Partners and Impact stay inside the page`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of [GOVERNMENTS, DEV_PARTNERS, IMPACT, INVESTORS]) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    });
  }
});
