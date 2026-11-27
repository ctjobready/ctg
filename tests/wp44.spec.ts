import { expect, test, type Page } from '@playwright/test';
import { open } from './support/browser';

/**
 * WP44 behaviors (cycle-21 whole-site review, GPT-6.1 Sol items 1-8): the Contact fallback names both inquiry addresses; Foundations' second card is the pilot scorecard
 * (not the WSDFM trial) and its "Our Approach" is one whole statement; Universities' "Our Approach" is one whole statement with the reporting scoped; the JobReady Platform hero drops
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
    // WP166-A (marketing review R7-02): the fallback also serves a reader unsure of the route ("Not sure which route fits, or your email app does not open? Write to ..."); both addresses stay
    expect(routes).toContain('Not sure which route fits, or your email app does not open? Write to contact@coderstrust.global. For local partnerships in Bangladesh, write to hello@coderstrustbd.com.');
    expect(routes).not.toContain('copy the address below');
    await expect(page.locator('#routes .copy-email')).toHaveCount(1);
  });
});

test.describe('Foundations: the second card is the scorecard and the approach is one whole statement (items 2 and 3)', () => {
  // WP175 (owner decision of 2026-11-28: CMF C8 relieves each pain 1:1): the second card relieves "Independent Evidence Is Hard to Find" again (doc 04 4.3: the trial of CodersTrust's WSDFM program, independent evaluation
  // welcome on new programs); the scorecard is the first card's ("measured against the agreed scorecard") and the risk-reversal band's; the predecessor-program heading stays gone (tests/wp35.spec.ts)
  test('the second features card relieves the independent-evidence pain (WP175; WP44 had made it "A Pilot Scorecard Agreed with You"), and the predecessor-program heading stays gone', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#features li.card', { has: page.locator('h3', { hasText: 'A Pilot Scorecard Agreed with You' }) })).toHaveCount(0);
    const card = page.locator('#features li.card').nth(1);
    await expect(card).toHaveAttribute('data-relieves', 'P2');
    await expect(card.locator('.card__text')).toHaveText('A randomized trial of CodersTrust’s WSDFM program, and independent evaluation welcome on new programs.');
    await expect(page.locator('#features')).not.toContainText('Independent Evidence on the Predecessor Program');
    await expect(page.locator('#features li.card').first()).toContainText('Results are measured against the agreed scorecard');
  });

  test('"Our Approach" is exactly the declared whole statement, rests on IN-04, PD-01, PD-08 and PD-11, and opens the band', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#mechanism .pos__label')).toHaveText('Our Approach');
    await expect(page.locator('#mechanism .pos__text')).toHaveText('Foundations and CSR teams want each grant to change what young people earn, with evidence that it did. A YouthWIDE cohort grant funds training, mentoring and placement support against a pilot scorecard agreed in advance; a JobReady platform grant funds CodersTrust’s digital learning and earning platform.');
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('IN-02 IN-04 PD-01 PD-11'); // WP175 (owner decision Q5 of 2026-11-28): re-pinned to the crafted statement (POSITIONING; scripts/check-facts.mjs POSITION_WHOLE_STATEMENT): the two routes (IN-02, IN-04), the pilot scorecard (PD-11)
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
    await expect(page.locator('#mechanism .pos__text')).toHaveText('Universities and colleges want degree holders who move into paid work, and placement results they can stand behind. JobReady@Campus runs in their own campus labs and adds certification exam preparation, mentoring and placement support to the degree, with monthly reports on each cohort.'); // WP155 (Polish 4): was "... in campus labs alongside academic studies. ..."; the H2 and the "In Parallel with the Degree" card state the timing
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('IN-09 PD-01 PD-02 PD-08'); // WP175: certification exam preparation (PD-02)
    await expect(page.locator('#mechanism .pos__text')).not.toContainText('For universities and colleges');
  });
});

test.describe('JobReady Platform: the hero drops "AI-native" (item 5)', () => {
  // WP53 (owner decision 2026-10-16): "JobReady is CodersTrust’s digital learning and earning platform." (it said "education and employment")
  // WP163 (owner answers of 3 November 2026): the lead names what the platform offers instead of a rollout status (it read "... platform. Modules are rolling out in stages.").
  test('the lead reads "JobReady is CodersTrust’s digital learning and earning platform, from an AI Tutor to work marketplaces." and the page no longer says AI-native', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const text = await mainText(page);
    expect(text).toContain('JobReady is CodersTrust’s digital learning and earning platform, from an AI Tutor to work marketplaces.');
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
    // WP166-B (marketing review R2-24): the FAQ "Where Do I Find Eligibility, Schedule and Fees?" is gone (it pointed to Before You Apply); its one admissions sentence is gone with it, and the Admissions rows state each point once.
    expect(text).not.toContain('Where Do I Find Eligibility, Schedule and Fees?');
    expect(text).not.toContain('Admissions confirms intake dates, schedule and teaching location with each applicant.');
    expect(text).not.toContain('Admissions confirms intake dates and schedule with each applicant. Admissions confirms the teaching location');
    // WP168-B (owner statement of 24 November 2026): the rows state the next intake and the campus (they said "Admissions confirms ... with each applicant."); each is still stated once in the Admissions rows
    expect(text).not.toContain('Admissions confirms');
    await expect(page.locator('.ba__row', { has: page.locator('dt', { hasText: /^Intake$/ }) })).toContainText('The application deadline for the next intake is December 10, 2026.');
    await expect(page.locator('.ba__row', { has: page.locator('dt', { hasText: /^Campus$/ }) })).toContainText('Classes are held at CodersTrust Mirpur Campus.');
  });
});

test.describe('Development Partners: the guide band has no empathy line (item 8)', () => {
  // WP51 (cycle-26 review, Kimi P2): the opening line is the shared origin line, "Since 2014, from a Copenhagen launch to work in 16 countries and territories." (it was the launch alone, "Launched in Copenhagen in 2014.")
  // WP175 (owner decision Q2 (a) of 2026-11-28: every C5 opens with an empathy line): the band opens with a fresh empathy line (EMPATHY.developmentPartners), one lead paragraph, then the origin line; the doc 04 line
  // this item removed stays gone
  test('the band opens with its one empathy line (WP175), then the origin line; the retired doc 04 line stays gone', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    await expect(page.locator('#guide p.lead')).toHaveCount(1);
    await expect(page.locator('#guide p.lead')).toHaveText('You are accountable for youth employment results across a portfolio of programs.');
    expect(compact(await page.locator('#guide').textContent())).not.toContain('You need more than enrollment numbers');
    await expect(page.locator('#guide .pg__origin').first()).toHaveText('From a Copenhagen launch to work across Asia, Africa, Europe and the Americas.'); // WP150: the tile carries the 16; // WP64 rework RW2 (coordinator): the heading says "Since 2014", so the line does not
  });
});
