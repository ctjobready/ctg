import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP29 behaviors (review round 5, cycle 7, the verified Benchmark review): timelines that name their starting point, the paid-work pathways
 * comparison (OC-04), the Her Power model partnership card, the two funding routes as a comparison. Each test states one observable behavior of
 * the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp29.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('timelines name their starting point', () => {
  test('Governments, "What a Ministry Sees": reports count from the first cohort, follow-up surveys from the end of each course', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const when = await page.locator('#ministry-sees ol > li .ms__when').allTextContents();
    expect(when.map(compact)).toEqual(['Month 1 of the First Cohort', '6 Months After Each Course', '12 Months After Each Course']);
    expect(compact(await page.locator('#ministry-sees').textContent())).not.toMatch(/\bMonth (6|12)\b/);
    await expect(page.locator('#ministry-sees ol > li .ms__title')).toHaveText(['Monthly Reports Begin', 'The 6-Month Follow-Up Survey', 'The 12-Month Follow-Up Survey']);
  });

  // every grant-funded week sequence on the site reads Discovery (Week 1) → Co-Design (Week 2) → Agreement (Week 3) → Training Starts 6–8 Weeks After Signing
  const SEQUENCES: { page: string; steps: string }[] = [
    { page: '', steps: '#next-steps ol h3' },
    { page: 'partner-with-us/', steps: '#how-partnering-works ol h3' },
    { page: 'partner-with-us/development-partners/', steps: '#next-steps ol h3' },
    { page: 'partner-with-us/foundations/', steps: '#next-steps ol h3' },
  ];
  for (const s of SEQUENCES) {
    test(`${s.page || 'Home'}: the grant-funded steps read Discovery (Week 1) → Co-Design (Week 2) → Agreement (Week 3) → Training Starts 6–8 Weeks After Signing`, async ({ page }) => {
      await open(page, s.page);
      const titles = (await page.locator(s.steps).allTextContents()).map((t) => compact(t).replace(/^Step \d: /, ''));
      expect(titles).toEqual(['Discovery (Week 1)', 'Co-Design (Week 2)', 'Agreement (Week 3)', 'Training Starts 6–8 Weeks After Signing']);
      expect(compact(await page.locator('main').textContent())).not.toMatch(/\bwk \d|First Cohort Starting Training|First Cohort · /);
    });
  }

  test('YouthWIDE in Bangladesh: the timing line reads the same sequence and keeps procurement timing as its own sentence', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const line = compact(await page.locator('.next-timing').textContent());
    expect(line).toContain('Discovery (Week 1) → Co-Design (Week 2) → Agreement (Week 3)');
    expect(line).toContain('training starts 6–8 weeks after signing.');
    expect(line).toMatch(/signing\. Public procurement follows the agency’s own timeline\.$/);
  });

  test('PD-04 (the register) carries the sequence the pages read', () => {
    const text = fact('PD-04').text;
    expect(text).toContain('Discovery (Week 1) → Co-Design (Week 2) → Agreement (Week 3)');
    expect(text).toContain('training starts 6–8 weeks after signing');
    expect(text).not.toMatch(/\bwk \d/);
  });

  test('the "How Fast Can We Start?" answers say the weeks count from the first conversation', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const gov = compact(await page.locator('#faq').textContent());
    expect(gov).toContain('Counting from the first conversation, Week 1 is a briefing, Week 2 co-design and Week 3 the agreement.');
    await open(page, 'programs/youthwide/');
    const main = compact(await page.locator('main').textContent());
    expect(main).toContain('Counting from the first conversation, Week 1 is a discovery session, Week 2 co-design and Week 3 the agreement; public procurement follows the agency’s own timeline.');
    expect(main).not.toMatch(/week 1 is a discovery session, week 2/);
  });
});

test.describe('paid-work pathways comparison (OC-04)', () => {
  /** The figures the block must show, read from the register's own sentence (not typed here). */
  const expected = (() => {
    const m = /salaried employment rose from ([\d.]+%) before training to ([\d.]+%) at the October 2026 survey, freelancing from ([\d.]+%) to ([\d.]+%)(?: \([\d.]+×\))? and business ownership from ([\d.]+%) to ([\d.]+%)/.exec(fact('OC-04').text)!;
    return [
      ['Salaried Employment', m[1], m[2]],
      ['Freelancing', m[3], m[4]],
      ['Business Ownership', m[5], m[6]],
    ];
  })();

  // WP31: the Employers page no longer carries the youth programs' pathway block (it links to the evidence pages); Home keeps it
  for (const route of ['']) {
    test(`${route || 'Home'}: salaried, freelancing and business ownership, before training and at the October 2026 survey, tagged Surveyed Completers`, async ({ page }) => {
      await open(page, route);
      const block = page.locator('#proof-band .pwp');
      await expect(block).toHaveCount(1);
      expect(await block.getAttribute('data-fact')).toBe('OC-04');
      await expect(block.locator('h3')).toHaveText('Paid-Work Pathways Among Surveyed Completers');
      await expect(block.locator('.evidence-tag')).toHaveText('Surveyed Completers');
      expect((await block.locator('thead th').allTextContents()).map(compact)).toEqual(['Pathway', 'Before Training', 'October 2026 Survey']);
      const rows = await block.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => Array.from(tr.querySelectorAll('th, td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())));
      expect(rows).toEqual(expected);
    });
  }

  test('Home: the comparison sits in the survey area, below the trial and beside the 72.3% tile, and the table itself shows salaried work as the largest pathway', async ({ page }) => {
    await open(page, '');
    const tops = await page.locator('#proof-band').evaluate((el) => {
      const top = (sel: string) => (el.querySelector(sel) as HTMLElement).getBoundingClientRect().top + window.scrollY;
      return { trial: top('.he__trial'), tile: top('.he__stat'), pathways: top('.pwp') };
    });
    expect(tops.pathways).toBeGreaterThan(tops.trial);
    // WP30c: no note under the table on Home (the figures say it: salaried employment 53.3% against freelancing 14.0% and business ownership 10.6%)
    await expect(page.locator('#proof-band .pwp__note')).toHaveCount(0);
  });

  test('Employers carries no pathways block (WP31): a corporate offer page shows no youth-program survey figure, only links to the evidence pages', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    await expect(page.locator('.pwp')).toHaveCount(0);
    await expect(page.locator('#proof-band')).toHaveCount(0);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    for (const route of ['']) {
      test(`${route || 'Home'} at ${vp.width}px: the comparison fits its band with no horizontal overflow`, async ({ page }) => {
        await page.setViewportSize(vp);
        await open(page, route);
        const fits = await page.locator('#proof-band .pwp').evaluate((el) => {
          const band = el.closest('section') as HTMLElement;
          const r = el.getBoundingClientRect();
          const b = band.getBoundingClientRect();
          return r.left >= b.left - 1 && r.right <= b.right + 1;
        });
        expect(fits, 'the card stays inside its band').toBe(true);
        expect(await noOverflow(page), 'no horizontal overflow').toBe(true);
      });
    }
  }
});

test.describe('Governments: Her Power model partnership card', () => {
  const card = (page: Page) => page.locator('#model-partnership');

  test('five separate fields, each from its registered fact: partner, role, direct training, reported work outcome, national program reach', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(card(page).locator('h2')).toHaveText('Her Power, with the ICT Division');
    await expect(card(page).locator('dt')).toHaveText(['Partner', 'CodersTrust’s Role', 'Direct Training', 'Reported Work Outcome', 'National Program Reach']);
    const field = (label: string) => card(page).locator('.mp__field', { has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) });
    expect(compact(await field('Partner').locator('dd').textContent())).toBe('ICT Division / Department of ICT (DoICT)');
    // the role is GV-11's list; its direct-training clause is the next field's, so it is not said twice
    const role = compact(await field('CodersTrust’s Role').locator('dd').textContent());
    expect(role).toBe('Curriculum, training manuals and mentorship guidelines; Training of Trainers; 54,609 manuals and guidelines distributed');
    expect(fact('GV-11').text).toContain('curriculum, training manuals and mentorship guidelines; Training of Trainers; 2,500 women trained directly; 54,609 manuals and guidelines distributed');
    expect(compact(await field('Direct Training').locator('dd').textContent())).toBe('2,500 women trained directly by CodersTrust in Her Power');
    expect(compact(await field('Reported Work Outcome').locator('dd').textContent())).toBe('372 of 800 tracked women in work (47%), from the 2,500 trained directly by CodersTrust');
    expect(compact(await field('National Program Reach').locator('dd').textContent())).toBe('25,125 women trained across 130 sub-districts (upazilas) in the national program');
  });

  test('direct delivery, the tracked outcome and national reach are visibly separate tiles; the 372 of 800 is never beside the 25,125 as one figure', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const ids = await card(page).locator('.mp__field').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')));
    expect(ids).toEqual(['GV-01', 'GV-11', 'GV-13', 'PR-05', 'GV-01']);
    const boxes = await card(page).locator('.mp__field--figure').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right }; }));
    expect(boxes).toHaveLength(3);
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].l, 'tiles do not overlap').toBeGreaterThanOrEqual(boxes[i - 1].r - 1);
    await expect(card(page).locator('.evidence-tag')).toHaveText('Program Record');
  });

  test('the card follows the contracts table and links to the Her Power case study', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids.indexOf('model-partnership')).toBe(ids.indexOf('contracts') + 1);
    expect(await card(page).locator('a.link').getAttribute('href')).toMatch(/\/impact\/case-studies\/her-power\/$/);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: no horizontal overflow, and the figure tiles ${vp.width >= 900 ? 'share a row' : 'stack'}`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/governments/');
      expect(await noOverflow(page)).toBe(true);
      const tops = await card(page).locator('.mp__field--figure').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      if (vp.width >= 900) expect(new Set(tops).size).toBe(1);
      else expect(new Set(tops).size).toBe(3);
    });
  }
});

test.describe('Foundations: the two funding routes as a comparison', () => {
  const table = (page: Page) => page.locator('#mechanism #funding-routes');

  test('two rows (YouthWIDE Cohort Grants, JobReady Platform Grants) under What It Supports and Evidence Relationship, in existing copy', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    expect((await table(page).locator('thead th').allTextContents()).map(compact)).toEqual(['Funding Route', 'What It Supports', 'Evidence Relationship']);
    const rows = await table(page).locator('tbody tr').evaluateAll((trs) => trs.map((tr) => Array.from(tr.querySelectorAll('th, td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())));
    expect(rows).toEqual([
      ['Funding Route 1 YouthWIDE Cohort Grants', 'Co-fundable country programs designed for South Asia, MENA and Sub-Saharan Africa.', 'Builds on results from earlier programs in Bangladesh and Kosovo.'],
      [
        'Funding Route 2 JobReady Platform Grants',
        'A grant toward platform infrastructure, not toward cohorts. Live today: partner portals, marketing automation, CRM and AI chat. In pre-launch: the employer marketplace and the gig-work (Earn) marketplace.',
        'Youth-program outcomes are not platform outcomes. The outcome evidence on this page comes from the youth programs, not from the platform.',
      ],
    ]);
  });

  test('the route cards no longer repeat the comparison: each route is named once, as a row heading of the table, and the jump links still work', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#mechanism .model__block')).toHaveCount(0);
    const headings = (await table(page).locator('tbody th').allTextContents()).map(compact);
    expect(headings).toEqual(['Funding Route 1 YouthWIDE Cohort Grants', 'Funding Route 2 JobReady Platform Grants']);
    await expect(page.locator('#mechanism').getByRole('link', { name: 'See Funding Route 1' })).toHaveAttribute('href', '#cohort-grants');
    await expect(page.locator('#mechanism').getByRole('link', { name: 'See Funding Route 2' })).toHaveAttribute('href', '#platform-grants');
  });

  test('the platform status sentence in the table is IN-04’s own wording', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const cell = table(page).locator('tr[data-fact="IN-04"] td').first();
    expect(compact(await cell.textContent())).toContain('Live today: partner portals, marketing automation, CRM and AI chat. In pre-launch: the employer marketplace and the gig-work (Earn) marketplace.');
    expect(fact('IN-04').text).toContain('Live today: partner portals, marketing automation, CRM and AI chat. In pre-launch: the employer marketplace and the gig-work (Earn) marketplace.');
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
