import { expect, test } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP24b: the Impact section tells apart the kinds of evidence (cycle-4 review round 9).
 *  - every proof figure on an Impact page carries an evidence-type badge (Randomized Trial · Surveyed Completers · Program Record · Individual Story);
 *  - /impact/ keeps program records in their own group, never beside the trial, and holds one table of every reported program result;
 *  - the Outcomes 2026 income-source chart agrees with its 11.9% summary;
 *  - long lists (stories, photographs) show a first set and keep the rest behind a disclosure.
 */
const TYPES = ['Randomized Trial', 'Surveyed Completers', 'Program Record', 'Individual Story'];

test.describe('evidence-type badge', () => {
  test.use({ viewport: DESKTOP });

  test('/impact/ glance tiles carry the right evidence type', async ({ page }) => {
    await open(page, 'impact/');
    const tile = (fact: string) => page.locator(`#glance a[data-fact~="${fact}"]`).first();
    await expect(tile('RC-13').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Randomized Trial');
    await expect(tile('RC-06a').locator('[data-evidence]')).toHaveAttribute('data-evidence', 'Randomized Trial');
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
    await expect(reach).toContainText('31,200+');
    await expect(reach).toContainText(/contracted scopes of six government programs/i);
    await expect(reach).toContainText('25,125');
    await expect(reach).not.toContainText('800');
    await expect(reach.locator('.status-tag[data-status="Agreement"]')).toHaveCount(1);
  });

  test('the +54% tile names the predecessor WSDFM program and the +10.3 label does not repeat itself', async ({ page }) => {
    await open(page, 'impact/');
    await expect(page.locator('#glance')).toContainText(/higher monthly income for women who attended the predecessor WSDFM program/);
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/\+10\.3 pp[^\n]*in percentage points/);
  });
});

test.describe('/impact/ program-results table', () => {
  test.use({ viewport: DESKTOP });

  test('one table holds every reported program result, with a dash where nothing is reported', async ({ page }) => {
    await open(page, 'impact/');
    const sec = page.locator('section', { has: page.getByRole('heading', { level: 2, name: 'Every Reported Program Result in One Table' }) });
    await expect(sec).toHaveCount(1);
    const heads = await sec.locator('thead th').allInnerTexts();
    expect(heads.map((h) => h.trim())).toEqual(['Program', 'Partner', 'Geography', 'Trained', 'Completed', 'Certified', 'In Work', 'Evidence Type']);
    const rows = sec.locator('tbody tr');
    await expect(rows).toHaveCount(4);
    const row = (name: RegExp) => rows.filter({ has: page.getByRole('rowheader', { name }) });
    await expect(row(/WSDFM/)).toContainText('711 of 1,000');
    await expect(row(/Kosovo/)).toContainText('102 of 150');
    await expect(row(/UNDP YES/)).toContainText('350');
    await expect(row(/UNDP YES/)).toContainText('97.5%');
    await expect(row(/UNDP YES/)).toContainText('67%');
    await expect(row(/Her Power/)).toContainText('372 of 800');
    // A cell with no registered figure is a dash, never a made-up number.
    await expect(row(/WSDFM/).locator('td[data-label="Certified"]')).toContainText('—');
    await expect(row(/Kosovo/).locator('td[data-label="Trained"]')).toContainText('—');
    for (const r of await rows.all()) await expect(r.locator('td[data-label="Evidence Type"] [data-evidence="Program Record"]')).toHaveCount(1);
  });

  test('on a phone the table stacks and the page does not scroll sideways', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, 'impact/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('On This Page lists the table and the goals section', async ({ page }) => {
    await open(page, 'impact/');
    const links = await page.locator('nav[aria-label="On this page"] a, .page-nav a').allInnerTexts();
    const flat = links.join('|');
    expect(flat).toContain('Program Results Table');
    expect(flat).toContain('Sustainable Development Goals');
  });
});

test.describe('Outcomes 2026', () => {
  test.use({ viewport: DESKTOP });

  test('the income-source chart shows the 11.9% share, not two components that add to 11.8%', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    const sec = page.locator('#income-source');
    await expect(sec).toContainText('11.9%');
    const text = await sec.innerText();
    expect(text).not.toMatch(/(^|[^\d.])7\.1%/);
    expect(text).not.toMatch(/(^|[^\d.])4\.7%/);
  });

  test('the employment sentence reads plainly and the 58.8% label has no stray comma', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    await expect(page.locator('#employment')).toContainText('77.9% of surveyed completers reported being employed at the October 2026 survey, compared with 47.4% before training');
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/during or after training, started earning/);
  });
});

test.describe('Independent Evaluation', () => {
  test.use({ viewport: DESKTOP });

  test('the short-answer links are a list, and the FAQ question asks how outcomes are tracked', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    await expect(page.locator('#summary ul li a')).toHaveCount(3);
    await expect(page.locator('#funders')).toContainText(/five-year follow-up/i);
    await expect(page.locator('#funders')).toContainText('See How Partnerships Work');
    await expect(page.locator('#faq')).toContainText('How Do You Track Outcomes?');
    await expect(page.locator('#classes h2')).toHaveText('Freelancing Share by Classes Attended');
  });
});

test.describe('case studies', () => {
  test.use({ viewport: DESKTOP });

  test('four cards, and the side-by-side heading names the three programs it compares', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    await expect(page.locator('article.case')).toHaveCount(4);
    await expect(page.getByRole('heading', { level: 2, name: 'WSDFM, Women in Online Work and Her Power, Side by Side' })).toBeVisible();
    await expect(page.locator('article.case .status-tag[data-status="Delivered"]')).toHaveCount(4);
  });

  test('WSDFM states which figure is program records and which is the trial', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    await expect(page.locator('[data-hero-note]')).toContainText('WSDFM program records: 711 of 1,000 women in work (71%)');
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

  test('the evidence ladder names each kind of evidence with the same badges, without repeating a unit', async ({ page }) => {
    await open(page, 'impact/');
    const types = await page.locator('#evidence-ladder [data-evidence]').evaluateAll((els) => els.map((e) => e.getAttribute('data-evidence')));
    expect(types).toEqual(['Randomized Trial', 'Surveyed Completers', 'Program Record', 'Individual Story']);
    await expect(page.locator('#evidence-ladder')).not.toContainText('in percentage points');
    await expect(page.locator('#evidence-ladder')).toContainText('WSDFM program records: women in work (71%)');
  });
});
