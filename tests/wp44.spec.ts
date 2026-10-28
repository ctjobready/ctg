import { expect, test, type Page } from '@playwright/test';
import { open } from './support/browser';

/**
 * WP44 behaviors (cycle-21 whole-site review, GPT-6.1 Sol items 1-8): the Contact fallback names both inquiry addresses; Foundations' second card is the pilot scorecard
 * (not the predecessor trial) and its "Our Approach" is one whole statement; Universities' "Our Approach" is one whole statement with the reporting scoped; the JobReady Platform hero drops
 * "AI-native"; Investors' thesis heading is "Young People Need Work. Employers Need Skills."; the NU diploma FAQ states schedule, intake and location in one sentence; Development Partners' guide
 * band has no empathy line and opens with the launch line. Retrospective coverage (the owner exempted this project from test-first work); run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp44.spec.ts --project=chromium`.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());

test.describe('Contact: the inquiry fallback names both addresses (item 1)', () => {
  test('the routes lead says where to write, with the local-partnership route to the Bangladesh team, and keeps its copy control', async ({ page }) => {
    await open(page, 'contact/');
    const routes = compact(await page.locator('#routes').textContent());
    expect(routes).toContain('If your email app does not open, write to contact@coderstrust.global. For local partnerships in Bangladesh, write to hello@coderstrustbd.com.');
    expect(routes).not.toContain('copy the address below');
    await expect(page.locator('#routes .copy-email')).toHaveCount(1);
  });
});

test.describe('Foundations: the second card is the scorecard and the approach is one whole statement (items 2 and 3)', () => {
  test('the features card is "A Pilot Scorecard Agreed with You" with the scorecard sentence, and the card is not the predecessor trial', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const card = page.locator('#features li.card', { has: page.locator('h3', { hasText: 'A Pilot Scorecard Agreed with You' }) });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.card__text')).toHaveText('Cost per completer and per verified outcome, with thresholds agreed before the first cohort starts.');
    await expect(page.locator('#features')).not.toContainText('Independent Evidence on the Predecessor Program');
  });

  test('"Our Approach" is exactly the declared whole statement, rests on IN-04, PD-01, PD-08 and PD-11, and opens the band', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#mechanism .pos__label')).toHaveText('Our Approach');
    await expect(page.locator('#mechanism .pos__text')).toHaveText('Fund a YouthWIDE cohort or JobReady’s platform infrastructure. For cohort grants, we agree a pilot scorecard and combine training, mentoring and placement support, with monthly progress reports.');
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('IN-04 PD-01 PD-08 PD-11');
    const before = await page.evaluate(() => {
      const band = document.querySelector('#mechanism')!;
      const pos = band.querySelector('.pos')!;
      const kinds: string[] = [];
      for (const el of Array.from(band.querySelectorAll('p, ul, ol, svg, img, table, a'))) {
        if (el.compareDocumentPosition(pos) & Node.DOCUMENT_POSITION_FOLLOWING && !el.classList.contains('eyebrow') && !pos.contains(el)) kinds.push(el.tagName + '.' + el.className);
      }
      return kinds;
    });
    expect(before, 'only the eyebrow precedes the statement').toEqual([]);
  });
});

test.describe('Universities: "Our Approach" is one whole statement with the reporting scoped (item 4)', () => {
  test('the statement is the declared JobReady@Campus wording for universities, keeps "as agreed in the program scope", and rests on IN-09, PD-01 and PD-08', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#mechanism .pos__label')).toHaveText('Our Approach');
    await expect(page.locator('#mechanism .pos__text')).toHaveText('JobReady@Campus combines training, mentoring and placement support in campus labs alongside academic studies. Your institution receives monthly reports on progress toward paid work, as agreed in the program scope.');
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('IN-09 PD-01 PD-08');
    await expect(page.locator('#mechanism .pos__text')).not.toContainText('For universities and colleges');
  });
});

test.describe('JobReady Platform: the hero drops "AI-native" (item 5)', () => {
  // WP53 (owner decision 2026-10-16): "JobReady is CodersTrust’s digital learning and earning platform." (it said "education and employment")
  test('the lead reads "JobReady is CodersTrust’s digital learning and earning platform. Modules are rolling out in stages." and the page no longer says AI-native', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const text = await mainText(page);
    expect(text).toContain('JobReady is CodersTrust’s digital learning and earning platform. Modules are rolling out in stages.');
    expect(text).not.toContain('AI-native');
  });
});

test.describe('Investors: the thesis heading is in sentence pairs (item 6)', () => {
  test('the thesis card heading is "Young People Need Work and Employers Need Skills" (no trailing period, the owner rule of the title-case gate)', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.getByRole('heading', { level: 3, name: 'Young People Need Work and Employers Need Skills' })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 3, name: /Educated Young People Are Not in Work/ })).toHaveCount(0);
  });
});

test.describe('NU Post Graduate Diploma: one admissions sentence in the FAQ (item 8)', () => {
  test('the FAQ answer names intake dates, schedule and teaching location in one sentence; the Admissions rows keep their own wording', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    const text = await mainText(page);
    expect(text).toContain('Admissions confirms intake dates, schedule and teaching location with each applicant.');
    expect(text).not.toContain('Admissions confirms intake dates and schedule with each applicant. Admissions confirms the teaching location');
    await expect(page.locator('.ba__row', { hasText: 'Schedule and Intake' })).toContainText('Admissions confirms intake dates and schedule with each applicant.');
  });
});

test.describe('Development Partners: the guide band has no empathy line (item 8)', () => {
  // WP51 (cycle-26 review, Kimi P2): the opening line is the shared origin line, "Since 2014, from a Copenhagen launch to work in 16 countries and territories." (it was the launch alone, "Launched in Copenhagen in 2014.")
  test('the band opens with the origin line and carries no lead paragraph', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    await expect(page.locator('#guide p.lead')).toHaveCount(0);
    expect(compact(await page.locator('#guide').textContent())).not.toContain('You need more than enrollment numbers');
    await expect(page.locator('#guide .pg__origin').first()).toHaveText('From a Copenhagen launch to work in 16 countries and territories.'); // WP64 rework RW2 (coordinator): the heading says "Since 2014", so the line does not
  });
});
