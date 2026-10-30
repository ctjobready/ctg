import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP29 behaviors (review round 5, cycle 7, the verified Benchmark review): timelines that name their starting point, the paid-work pathways
 * comparison (OC-04), the Her Power model partnership card (retired by WP37: its figures are the glance tile and the contracts table's first row), the two funding routes as a comparison. Each test states one observable behavior of
 * the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp29.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('timelines name their starting point', () => {
  // WP46 (cycle-22 review): "What a Ministry Sees" is gone; the follow-up surveys are still counted from the end of each course ("at 3, 6 and 12 months after each course", in the delivery model's card), never as "Month 6" or "Month 12"
  test('Governments: the follow-up surveys count from the end of each course, never as a bare "Month 6" or "Month 12"', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#ministry-sees')).toHaveCount(0);
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('follow-up surveys at 3, 6 and 12 months after each course');
    expect(text).not.toMatch(/\bMonth (6|12)\b/);
  });

  // every grant-funded step sequence on the site reads Discovery → Co-Design → Agreement → Training Starts 6–8 Weeks After Signing (WP100: the week numbers before signing are gone)
  // (WP32 had taken the sequence off Foundations, whose call-to-action band states what is discussed for a cohort grant and for a platform grant, tests/wp32.spec.ts; WP46 put it back, scoped "For cohort grants.")
  const SEQUENCES: { page: string; steps: string }[] = [
    { page: '', steps: '#next-steps ol h3' },
    { page: 'partner-with-us/', steps: '#how-partnering-works ol h3' },
    { page: 'partner-with-us/development-partners/', steps: '#next-steps ol h3' },
    // WP46 (cycle-22 review): Foundations' "What Happens After You Say Yes" has the same four steps, scoped "For cohort grants."
    { page: 'partner-with-us/foundations/', steps: '#next-steps ol h3' },
  ];
  for (const s of SEQUENCES) {
    test(`${s.page || 'Home'}: the grant-funded steps read Discovery → Co-Design → Agreement → Training Starts 6–8 Weeks After Signing`, async ({ page }) => {
      await open(page, s.page);
      const titles = (await page.locator(s.steps).allTextContents()).map((t) => compact(t).replace(/^Step \d: /, ''));
      expect(titles).toEqual(['Discovery', 'Co-Design', 'Agreement', 'Training Starts 6–8 Weeks After Signing']);
      expect(compact(await page.locator('main').textContent())).not.toMatch(/\bwk \d|First Cohort Starting Training|First Cohort · /);
    });
  }

  // WP49 (cycle-24 review): the closing timing paragraph under YouthWIDE's "What Happens Next" (PD-04 in full) is gone: it repeated the step sequence above it and the timing question in the FAQ. The procurement sentence is still on the page (tests/wp49.spec.ts)
  test('YouthWIDE: no closing timing line repeats the sequence; the page still says that public procurement follows the agency’s own timeline', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('.next-timing')).toHaveCount(0);
    const main = compact(await page.locator('main').textContent());
    expect(main).not.toContain('Discovery (Week 1) → Co-Design (Week 2) → Agreement (Week 3)');
    expect(main).toContain('Public procurement follows the agency’s own timeline');
  });

  test('PD-04 (the register) carries the sequence the pages read', () => {
    const text = fact('PD-04').text;
    expect(text).toContain('Discovery → Co-Design → Agreement; training starts');
    expect(text).toContain('training starts 6–8 weeks after signing');
    expect(text).not.toMatch(/\bwk \d/);
  });

  test('the "How Fast Can We Start?" answers say the weeks count from the first conversation (WP33: Governments, whose steps band shows the sequence, does not count them out again; WP40: nor does YouthWIDE)', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const gov = compact(await page.locator('#faq').textContent());
    // WP50 (cycle-25 review, item 23): the Governments answer is the procurement sentence alone, without the grant-pilot timing (tests/wp50.spec.ts)
    expect(gov).toContain('Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry.');
    expect(gov).not.toContain('agreement typically takes about three weeks from first conversation');
    expect(gov).not.toContain('Counting from the first conversation');
    await open(page, 'programs/youthwide/');
    const main = compact(await page.locator('main').textContent());
    // WP40 (cycle-17 review): YouthWIDE's "What Happens Next" shows the sequence, so its answer is the two-sentence variant (tests/wp40.spec.ts)
    expect(main).toContain('Target timing for grant-funded pilots: training starts 6–8 weeks after signing. Public procurement follows the agency’s own timeline.');
    expect(main).not.toMatch(/Counting from the first conversation|week 1 is a discovery session, week 2/i);
  });
});

// WP31: the Employers page carries no pathways block; WP48 (cycle-23 review): Home's "Evidence You Can Check" band, the one place the block stood, is gone with its 72.3% tile (the Impact Survey 2026 page keeps the table and the 70.8%), so no
// page but the survey page shows the paid-work pathways comparison any more (tests/wp48.spec.ts)
test.describe('paid-work pathways comparison (OC-04): the Impact Survey 2026 page alone', () => {
  for (const route of ['', 'partner-with-us/employers/']) {
    test(`${route || 'Home'} carries no pathways block (a landing page shows no youth-program survey table, only links to the evidence pages)`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('.pwp')).toHaveCount(0);
      await expect(page.locator('#proof-band .pwp, #proof-band [data-fact="OC-04"]')).toHaveCount(0);
    });
  }

  test('the survey page keeps the three pathways, before training and at the October 2026 survey (OC-04)', async ({ page }) => {
    const m = /salaried employment rose from ([\d.]+%) before training to ([\d.]+%) at the October 2026 survey, freelancing from ([\d.]+%) to ([\d.]+%)(?: \([\d.]+×\))? and business ownership from ([\d.]+%) to ([\d.]+%)/.exec(fact('OC-04').text)!;
    await open(page, 'impact/outcomes-2026/');
    const text = compact(await page.locator('main').textContent());
    for (const share of [m[1], m[2], m[3], m[4], m[5], m[6]]) expect(text, share).toContain(share);
  });
});

// WP37 (cycle-14 review): the "Her Power, with the ICT Division" model-partnership card (the five separate fields, the three figure tiles) is gone. Its figures are Results at a Glance's Her Power tile and the
// contracts table's first row (the delivered, tracked and national-reach measures stay apart there), and the case study is a text link under the table (tests/wp37.spec.ts covers the replacement in full).
test.describe('Governments: Her Power is a row of the contracts table and a link to its case study', () => {
  test('the card is gone; the table’s first row keeps the registered Her Power figures, each read from its fact (GV-01, GV-11), apart from the tracked 372 of 800', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#model-partnership')).toHaveCount(0);
    const row = page.locator('#contracts tbody tr').first();
    expect(await row.getAttribute('data-fact')).toBe('GV-01 GV-11');
    const text = compact(await row.textContent());
    expect(text).toContain('Her Power: Department of ICT (DoICT), under the ICT Division');
    expect(text).toContain('25,125 women across 130 sub-districts (upazilas)');
    expect(fact('GV-01').text).toContain('a national program that trained 25,125 women across 130 sub-districts (upazilas), meeting its target');
    // WP50 (cycle-25 review, item 15): the row's three lines are full sentences ("CodersTrust trained 2,500 women directly." ...; tests/wp50.spec.ts); the register's GV-11 string is unchanged
    expect(text).toContain('54,609 manuals and guidelines were distributed.');
    expect(text).toContain('CodersTrust trained 2,400 women directly.');
    expect(fact('GV-11').text).toContain('2,400 women trained directly; 54,609 manuals and guidelines distributed');
    // the tracked outcome (372 of 800, from the 2,500 trained directly) is the glance tile's, never beside the 25,125 as one figure
    expect(text).not.toContain('372 of 800');
  });

  test('the case study is a text link under the contracts table', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    expect(await page.locator('#contracts a', { hasText: 'Read the Her Power Case Study' }).getAttribute('href')).toMatch(/\/impact\/case-studies\/her-power\/$/);
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids.indexOf('features')).toBe(ids.indexOf('contracts') + 1);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/governments/');
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('Foundations: the two funding routes as a comparison', () => {
  const table = (page: Page) => page.locator('#mechanism #funding-routes');

  test('two rows (YouthWIDE Cohort Grants, JobReady Platform Grants) under What It Supports and What the Evidence Covers, in existing copy', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    expect((await table(page).locator('thead th').allTextContents()).map(compact)).toEqual(['Funding Route', 'What It Supports', 'What the Evidence Covers']);
    const rows = await table(page).locator('tbody tr').evaluateAll((trs) => trs.map((tr) => Array.from(tr.querySelectorAll('th, td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())));
    expect(rows).toEqual([
      ['Funding Route 1 YouthWIDE Cohort Grants', 'Co-fundable country programs designed for South Asia, Sub-Saharan Africa and the Middle East and North Africa.', 'Builds on results from earlier programs in Bangladesh and Kosovo.'],
      [
        'Funding Route 2 JobReady Platform Grants',
        'A grant toward platform infrastructure, not toward cohorts. Live today: partner portals and AI chat. In pre-launch: the employer marketplace and the gig-work marketplace.',
        // WP65 (cycle-37 review, Gemini): the cell keeps the benchmark's line alone; "The outcome evidence on this page comes from the youth programs, not from the platform." restated it (tests/wp65.spec.ts)
        'Youth-program outcomes are not platform outcomes. The first conversation covers JobReady’s staged rollout.',
      ],
    ]);
  });

  test('the route cards no longer repeat the comparison: each route is named once, as a row heading of the table, and the two route links go to the program and platform pages', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#mechanism .model__block')).toHaveCount(0);
    const headings = (await table(page).locator('tbody th').allTextContents()).map(compact);
    expect(headings).toEqual(['Funding Route 1 YouthWIDE Cohort Grants', 'Funding Route 2 JobReady Platform Grants']);
    // WP40 (cycle-17 review): the two links under the comparison are one for each route, named for what they open (tests/wp40.spec.ts)
    await expect(page.locator('#mechanism').getByRole('link', { name: 'Explore YouthWIDE Delivery' })).toHaveAttribute('href', /\/programs\/youthwide\/$/);
    await expect(page.locator('#mechanism').getByRole('link', { name: 'Explore JobReady’s Rollout' })).toHaveAttribute('href', /\/our-model\/jobready-platform\/$/);
  });

  test('the platform status sentence in the table is IN-04’s: the live subset (partner portals and AI chat) and the registered pre-launch sentence', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const cell = table(page).locator('tr[data-fact="IN-04"] td').first();
    // WP37 (cycle-14 review): "CRM" is written out as "customer relationship management" (in IN-04 and wherever the full live list is printed); WP47 (cycle-22 review): the table lists the live subset only
    expect(compact(await cell.textContent())).toContain('Live today: partner portals and AI chat. In pre-launch: the employer marketplace and the gig-work marketplace.');
    expect(fact('IN-04').text).toContain('Live today: partner portals, marketing automation, customer relationship management and AI chat. In pre-launch: the employer marketplace and the gig-work marketplace.');
  });

  test('on a phone the table becomes one card per route (table hidden), with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, 'partner-with-us/foundations/');
    const display = await table(page).locator('tbody tr').first().evaluate((el) => getComputedStyle(el).display);
    expect(display, 'rows are stacked blocks, not table rows').not.toBe('table-row');
    expect(await noOverflow(page)).toBe(true);
  });

  test('at 1280px the table fits its band with no horizontal scrolling', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'partner-with-us/foundations/');
    const fits = await table(page).evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(fits).toBe(true);
    expect(await noOverflow(page)).toBe(true);
  });
});
