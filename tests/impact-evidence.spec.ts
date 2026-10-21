import { expect, test } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP24b: the Impact section tells apart the kinds of evidence (cycle-4 review round 9).
 *  - every proof figure on an Impact page carries an evidence-type badge (Randomized Trial · Surveyed Completers · Program Record · Individual Story);
 *  - /impact/ keeps program records in their own group, never beside the trial, and states each program result once (WP30e: the separate results table is gone);
 *  - the Outcomes 2026 income-source chart shows 6.9% and 4.6% as separate bars with an "about 12%" summary;
 *  - long lists (stories, photographs) show a first set and keep the rest behind a disclosure.
 */
// WP36 (cycle-13 review, "one figure, one label"): the 30,000+ carries the "Contract Scope" evidence tag on /impact/ too (it had the "Agreement" status tag)
const TYPES = ['Randomized Trial', 'Surveyed Completers', 'Program Record', 'Contract Scope', 'Individual Story'];

test.describe('evidence-type badge', () => {
  test.use({ viewport: DESKTOP });

  test('/impact/ glance tiles carry the right evidence type', async ({ page }) => {
    await open(page, 'impact/');
    const tile = (fact: string) => page.locator(`#glance a[data-fact~="${fact}"]`).first();
    // WP35: the trial group is one tile, the employment result for women offered a place (the income results and the nine-trial comparison are on the Independent Evaluation page)
    await expect(tile('RC-02').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Randomized Trial');
    await expect(tile('OC-01').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Surveyed Completers');
    await expect(tile('OC-03').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Surveyed Completers');
    await expect(tile('PR-01').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Program Record');
    await expect(tile('PR-02').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Program Record');
    await expect(tile('PR-03').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Program Record');
    await expect(tile('PR-05').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Program Record');
  });

  test('the badge states its type in words, never by color alone', async ({ page }) => {
    await open(page, 'impact/');
    const badges = page.locator('[data-evidence]');
    expect(await badges.count()).toBeGreaterThan(5);
    for (const b of await badges.all()) {
      const type = (await b.getAttribute('data-evidence')) ?? '';
      expect(TYPES).toContain(type);
      await expect(b).toContainText(type);
      await expect(b.locator('svg')).toHaveCount(1);
    }
  });

  test('the case-study pages and the stories page badge their proof figures', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    const types = await page.locator('main [data-evidence]').evaluateAll((els) => els.map((e) => e.getAttribute('data-evidence')));
    expect(types).toContain('Program Record');
    expect(types).toContain('Randomized Trial');
    await open(page, 'impact/stories/');
    await expect(page.locator('main [data-evidence="Individual Story"]').first()).toBeVisible();
    await open(page, 'impact/outcomes-2026/');
    await expect(page.locator('main [data-evidence="Surveyed Completers"]').first()).toBeVisible();
    await open(page, 'impact/independent-evaluation/');
    await expect(page.locator('main [data-evidence="Randomized Trial"]').first()).toBeVisible();
  });
});

test.describe('/impact/ At a Glance', () => {
  test.use({ viewport: DESKTOP });

  test('program records sit in their own group, apart from the trial, each with its own measure', async ({ page }) => {
    await open(page, 'impact/');
    const group = (name: string) => page.locator('#glance .glance__group', { has: page.getByRole('heading', { level: 3, name }) });
    const records = group('Program Results, by Named Program');
    await expect(records).toHaveCount(1);
    // Each tile carries its own program, share and measure.
    const tileOf = (fact: string) => records.locator(`a[data-fact~="${fact}"]`);
    await expect(tileOf('PR-01')).toContainText(/WSDFM/);
    await expect(tileOf('PR-01')).toContainText(/71%/);
    await expect(tileOf('PR-01')).toContainText(/in work/);
    await expect(tileOf('PR-02')).toContainText(/Kosovo/);
    await expect(tileOf('PR-02')).toContainText(/68%/);
    await expect(tileOf('PR-02')).toContainText(/in work/);
    await expect(tileOf('PR-03')).toContainText(/UNDP YES/);
    await expect(tileOf('PR-03')).toContainText(/67%/);
    await expect(tileOf('PR-03')).toContainText(/within (3|three) months/);
    await expect(tileOf('PR-05')).toContainText(/Her Power/);
    await expect(tileOf('PR-05')).toContainText(/47%/);
    await expect(tileOf('PR-05')).toContainText(/2,500/);
    // The trial group holds trial figures only.
    const trial = group('Trial Results, Predecessor Program');
    await expect(trial).toHaveCount(1);
    await expect(trial).not.toContainText(/71%|68%|67%/);
    await expect(trial.locator('[data-evidence]')).toHaveCount(await trial.locator('li').count());
    // The old mixed group and the compound tile are gone.
    await expect(page.getByRole('heading', { level: 3, name: 'Trial and Program Results' })).toHaveCount(0);
    await expect(page.locator('#glance')).not.toContainText('71% · 68% · 67%');
  });

  test('reach is labeled with its contract scope, kept apart from the tracked-women outcome', async ({ page }) => {
    await open(page, 'impact/');
    const reach = page.locator('#glance .glance__group', { has: page.getByRole('heading', { level: 3, name: 'Reach and Contract Scope' }) });
    await expect(reach).toHaveCount(1);
    await expect(reach).toContainText(/(?<![\d,])30,000\+/); // the group also holds the 130,000+ learners
    await expect(reach).toContainText(/contracted scopes of six government programs/i);
    await expect(reach).toContainText('25,125');
    await expect(reach).not.toContainText('800');
    // WP36: the contract-scope figure carries the "Contract Scope" evidence tag (as on Home, Governments and Investors), not an "Agreement" status tag; the reach figure keeps "Delivered"
    await expect(reach.locator('[data-evidence="Contract Scope"]')).toHaveCount(1);
    await expect(reach.locator('.status-tag[data-status="Agreement"]')).toHaveCount(0);
    await expect(reach.locator('.status-tag[data-status="Delivered"]')).toHaveCount(1);
  });

  test('the trial tile (WP35: the one trial group tile) names the predecessor program and the +10.3 label does not repeat itself', async ({ page }) => {
    await open(page, 'impact/');
    await expect(page.locator('#glance')).toContainText(/more employment for women offered a place \(randomized trial of a predecessor program\)/);
    // WP45 (cycle-21 review): the figure is "+10.3" with "percentage points" under it, and the label does not say the unit a second time
    const tile = await page.locator('#glance a[data-fact~="RC-02"]').innerText();
    expect(tile.match(/percentage points/g) ?? []).toHaveLength(1);
    expect(await page.locator('main').innerText()).not.toMatch(/\bpp\b/);
  });
});

test.describe('/impact/ program results', () => {
  test.use({ viewport: DESKTOP });

  test('each reported program result appears once, in Results at a Glance, Kosovo first', async ({ page }) => {
    await open(page, 'impact/');
    // WP30e: the former "Every Reported Program Result in One Table" repeated the four tiles, so it is gone.
    await expect(page.getByRole('heading', { level: 2, name: 'Every Reported Program Result in One Table' })).toHaveCount(0);
    await expect(page.locator('#program-results')).toHaveCount(0);
    const tiles = page.locator('#glance .glance__group', { has: page.getByRole('heading', { level: 3, name: 'Program Results, by Named Program' }) }).locator('li a');
    await expect(tiles).toHaveCount(4);
    const facts = await tiles.evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]));
    expect(facts).toEqual(['PR-02', 'PR-01', 'PR-03', 'PR-05']);
    for (const t of await tiles.all()) await expect(t.locator('[data-evidence="Program Record"]')).toHaveCount(1);
  });

  test('on a phone the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, 'impact/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('On This Page lists the results, the case studies, the evidence ladder and the goals section', async ({ page }) => {
    await open(page, 'impact/');
    const links = await page.locator('nav[aria-label="On this page"] a, .page-nav a').allInnerTexts();
    const flat = links.join('|');
    expect(flat).toContain('Results at a Glance');
    expect(flat).toContain('Five Programs');
    // WP31: the jump labels are the headings they jump to (a short form only where the heading is long), and every heading has one
    expect(flat).toContain('Four Kinds of Evidence');
    expect(flat).toContain('Where We Are Heading');
    expect(flat).toContain('Seven Global Goals');
    expect(flat).not.toContain('Program Results Table');
  });
});

test.describe('Outcomes 2026', () => {
  test.use({ viewport: DESKTOP });

  test('the income-source chart shows 6.9% and 4.6% as separate bars, and the summary says about 12%', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    const sec = page.locator('#income-source');
    await expect(sec).toContainText('Freelancing for Foreign Clients');
    await expect(sec).toContainText('6.9%');
    await expect(sec).toContainText('Job Abroad');
    await expect(sec).toContainText('4.6%');
    await expect(sec).toContainText(/about 12%/i);
    const text = await sec.innerText();
    expect(text).not.toContain('11.6%');
  });

  test('the employment sentence reads plainly and the 58.7% label has no stray comma', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    await expect(page.locator('#employment')).toContainText('78.2% of surveyed completers reported being employed at the October 2026 survey, compared with 48.0% before training');
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/during or after training, started earning/);
  });

  // Impact Report 261014B: the employment share before training is 48.0%. A number prints without its decimal ("48%") unless the chart formats it, so the chart, its text alternative and its data table must read as the sentence above them does.
  test('the employment chart prints both shares to one decimal, as the sentence above it does (48.0%, not 48%)', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    const chart = page.locator('#employment .ba');
    await expect(chart.locator('.ba-value')).toHaveText(['48.0%', '78.2%']);
    await expect(chart.locator('svg[role="img"]')).toHaveAttribute('aria-label', /Before: 48\.0%\. October 2026 Survey: 78\.2%\. Change: \+30\.2 percentage points\./);
    await expect(chart.locator('.ba__data td')).toHaveText(['48.0%', '78.2%', '+30.2 percentage points']);
  });
});

test.describe('Independent Evaluation', () => {
  test.use({ viewport: DESKTOP });

  test('the result leads, the method is a closed disclosure and the FAQ asks how outcomes are tracked', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Randomized Trial: Women Offered a Place Were More Likely to Work');
    await expect(page.getByRole('link', { name: /Read the BIGD Report \(2022\)/ })).toHaveCount(1);
    // "How to Read This Trial" holds what was evaluated, who took part and the design; it starts closed.
    const method = page.locator('#summary details', { hasText: 'How to Read This Trial' });
    await expect(method).toHaveCount(1);
    expect(await method.evaluate((el) => (el as HTMLDetailsElement).open)).toBe(false);
    await expect(method).toContainText('833 women at baseline');
    await expect(page.locator('#funders')).toContainText(/follow-up study of the program is under way/);
    await expect(page.locator('#funders')).not.toContainText(/five-year/i);
    await expect(page.locator('#funders')).toContainText('See How Partnerships Work');
    await expect(page.locator('#faq')).toContainText('How Do You Track Outcomes?');
    await expect(page.locator('#classes h2')).toHaveText('Freelancing Share by Classes Attended');
    await expect(page.locator('#classes')).toContainText('Freelancing Share by Classes Attended');
  });
});

test.describe('case studies', () => {
  test.use({ viewport: DESKTOP });

  test('five cards, Kosovo first, and no side-by-side table that repeats their results', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    await expect(page.locator('article.case')).toHaveCount(5);
    const names = await page.locator('article.case .card__title').allInnerTexts();
    expect(names.map((n) => n.trim())[0]).toBe('Women in Online Work, Kosovo');
    await expect(page.getByRole('heading', { level: 2, name: 'WSDFM, Women in Online Work and Her Power, Side by Side' })).toHaveCount(0);
    await expect(page.locator('article.case .status-tag[data-status="Delivered"]')).toHaveCount(5);
  });

  // WP42 (cycle-19 review): the hero's two paragraphs (the plain-language trial line and the program-record line) are gone; one line above the tiles names the two kinds of evidence, and each tile carries its own tag
  test('WSDFM states which figure is program records and which is the trial', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    // WP54 (cycle-28 review, GPT-6.1 Sol G8): the note spells out the evaluator, the page's first mention of BIGD
    await expect(page.locator('[data-hero-note]')).toHaveText('Program records and a separate randomized trial of 833 women in the predecessor program, by the BRAC Institute of Governance and Development (BIGD).');
    const tiles = page.locator('.hero .cs__stat');
    await expect(tiles).toHaveCount(3);
    await expect(tiles.nth(0).locator('[data-evidence="Program Record"]')).toHaveCount(1);
    await expect(tiles.nth(0)).toContainText('711 of 1,000');
    await expect(tiles.nth(1).locator('[data-evidence="Randomized Trial"]')).toHaveCount(1);
    await expect(tiles.nth(1)).toContainText('+10.3 percentage points');
    await expect(tiles.nth(2).locator('[data-evidence="Randomized Trial"]')).toHaveCount(1);
  });

  test('the UNDP YES page leads with the reported outcome, with no unregistered awareness claim', async ({ page }) => {
    await open(page, 'impact/case-studies/undp-yes-korail/');
    const text = await page.locator('main').innerText();
    expect(text).not.toContain('awareness of the opportunity grew');
    expect(text).toContain('about $32,000 over three years');
    await expect(page.getByRole('heading', { level: 2, name: 'Two Learner Journeys' })).toBeVisible();
  });
});

test.describe('stories and photographs', () => {
  test.use({ viewport: DESKTOP });

  test('stories show a first set and keep the rest behind "Show More Stories"', async ({ page }) => {
    await open(page, 'impact/stories/');
    const all = page.locator('#stories article.sc');
    const first = page.locator('#stories > .container > [data-story-filter] > ul > li article.sc');
    expect(await all.count()).toBeGreaterThan(9);
    expect(await first.count()).toBeLessThanOrEqual(9);
    expect(await first.count()).toBeGreaterThanOrEqual(6);
    const more = page.locator('#stories details.sg-more > summary');
    await expect(more).toHaveText('Show More Stories');
    await more.click();
    await expect(page.locator('#stories details.sg-more[open]')).toHaveCount(1);
  });

  test('the news photographs page is named News Photographs and the field page describes it', async ({ page }) => {
    await open(page, 'impact/in-the-field/news-photos/');
    await expect(page.locator('main h1')).toHaveText('News Photographs');
    await open(page, 'impact/in-the-field/');
    const link = page.locator('main a', { hasText: 'News Photographs' }).first();
    await expect(link).toBeVisible();
    await expect(page.locator('main')).toContainText(/Photographs from news posts, \d{4}.\d{4}/);
  });

  test('every collection on In the Field shows a first set and "View Full Collection" with its photo count"', async ({ page }) => {
    await open(page, 'impact/in-the-field/');
    expect(await page.locator('details.gd__more > summary').count()).toBeGreaterThanOrEqual(4);
    for (const s of await page.locator('details.gd__more > summary').all()) await expect(s).toHaveText(/^View Full Collection \(\d+ Photographs\)$/);
  });
});

test.describe('year headers, filters and the evidence ladder', () => {
  test.use({ viewport: DESKTOP });

  test('each news-photo year has one compact header and no repeated eyebrow or second title', async ({ page }) => {
    await open(page, 'impact/in-the-field/news-photos/');
    const years = page.locator('details.itf__year');
    expect(await years.count()).toBeGreaterThanOrEqual(2);
    for (const y of await years.all()) {
      await expect(y.locator('h2')).toHaveCount(1);
      await expect(y.locator('.eyebrow')).toHaveCount(0);
      await expect(y.locator('summary h2')).toHaveText(/^News Photographs, \d{4}/);
    }
  });

  test('a pathway filter opens the stories kept behind the disclosure', async ({ page }) => {
    await open(page, 'impact/stories/');
    await expect(page.locator('#stories details.sg-more[open]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Freelance' }).click();
    await expect(page.locator('#stories details.sg-more[open]')).toHaveCount(1);
  });

  test('the evidence ladder names each kind of evidence with the same badges and says what each does not show', async ({ page }) => {
    await open(page, 'impact/');
    const types = await page.locator('#evidence-ladder [data-evidence]').evaluateAll((els) => els.map((e) => e.getAttribute('data-evidence')));
    expect(types).toEqual(['Randomized Trial', 'Surveyed Completers', 'Program Record', 'Individual Story']);
    await expect(page.locator('#evidence-ladder')).not.toContainText('in percentage points');
    // WP30e: the figures live in Results at a Glance; the ladder keeps what each kind shows and does not show.
    const heads = (await page.locator('#evidence-ladder thead th').allInnerTexts()).map((h) => h.trim());
    expect(heads).toEqual(['Kind of Evidence', 'What It Shows', 'What It Does Not Show']);
    await expect(page.locator('#evidence-ladder')).toContainText('Cause: respondents are not a random sample');
  });
});
