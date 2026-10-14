import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP33 behaviors (cycle-10 whole-site reviews): the Home evidence band states the trial in one line and one link instead of a chart, the OC-03 tile note no longer
 * repeats the $245 under the $245, the Governments FAQ stops counting the weeks the steps band shows, Outcomes 2026 "Results in Brief" drops the bare 5.9% line, the Home
 * mechanism card loses its parenthesis, the Investors national-scale answer closes on two short sentences (inside the three-sentence FAQ cap of tests/wp30c.spec.ts), and
 * "skill and certification courses" reads the same everywhere. Retrospective
 * coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp33.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

test.describe('Home evidence band (#proof-band): the trial in one line and one link', () => {
  test('the trial block is the sub-heading, the registered plain-language sentence (RC-02) and one link to the trial results, with no chart, chart table or chart note', async ({ page }) => {
    await open(page, '');
    const band = page.locator('#proof-band');
    await expect(band.locator('h2')).toHaveText('Evidence You Can Check');
    const trial = band.locator('.he__trial');
    await expect(trial).toHaveCount(1);
    expect(await trial.getAttribute('data-fact')).toBe('RC-02');
    await expect(trial.locator('h3')).toHaveText('An Independent Randomized Trial of a Predecessor Program');
    await expect(trial.locator('[data-plain-line]')).toHaveText('For every 100 women offered a place, about 10 more were in work at follow-up than among 100 comparable women in the control group (+10.3 percentage points).');
    expect(await trial.locator('[data-plain-line]').getAttribute('data-fact')).toBe('RC-02');
    const link = trial.locator('a.link');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('Read the Trial Results');
    expect(await link.getAttribute('href')).toMatch(/\/impact\/independent-evaluation\/$/);
    // the block holds three things only: heading, sentence, link
    expect(await trial.evaluate((el) => Array.from(el.children).map((c) => c.tagName.toLowerCase()))).toEqual(['h3', 'p', 'a']);
    // no chart, no data table, no chart note, none of the chart's figures
    await expect(band.locator('.ba, .ba__data, figure, details')).toHaveCount(0);
    const t = compact(await band.textContent());
    for (const gone of ['Employment at Trial Follow-Up', 'View Chart Data as a Table', 'Chart data:', '52.8%', '63.1%']) expect(t, `no "${gone}" in the band`).not.toContain(gone);
  });

  test('the trial link is not repeated at the foot of the band, which keeps the survey link; the survey content stays (pathways table, 72.3% tile)', async ({ page }) => {
    await open(page, '');
    const band = page.locator('#proof-band');
    expect(await texts(page, '#proof-band .he__links a')).toEqual(['Impact Survey 2026']);
    await expect(band.locator('a[href$="/impact/independent-evaluation/"]'), 'one link to the trial results in the band').toHaveCount(1);
    await expect(band.locator('.pwp')).toHaveCount(1);
    await expect(band.locator('[data-fact="OC-02"]')).toContainText('72.3%');
    await expect(band.locator('[data-fact="OC-02"]')).toContainText('34 of 47 surveyed 2014–2023 completers with no prior income were earning at the October 2026 survey');
  });

  test('the trial figure is stated once in the band, as the plain sentence: the +10.3 points appear in one paragraph only', async ({ page }) => {
    await open(page, '');
    expect((await texts(page, '#proof-band p')).filter((p) => p.includes('10.3 percentage points'))).toHaveLength(1);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the trial block sits above the survey area, its link is visible and the page does not scroll sideways`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, '');
      const tops = await page.locator('#proof-band').evaluate((el) => {
        const top = (sel: string) => (el.querySelector(sel) as HTMLElement).getBoundingClientRect().top + window.scrollY;
        return { head: top('.he__head'), trial: top('.he__trial'), link: top('.he__trial a.link'), survey: top('.he__top') };
      });
      expect(tops.trial).toBeGreaterThan(tops.head);
      expect(tops.link).toBeGreaterThan(tops.trial);
      expect(tops.survey).toBeGreaterThan(tops.link);
      await expect(page.locator('#proof-band .he__trial a.link')).toBeVisible();
      expect(await noOverflow(page), 'no horizontal overflow').toBe(true);
    });
  }
});

test.describe('the OC-03 tile note says the survey once, without repeating $245', () => {
  const NOTE = 'Up from $82 before training (October 2026 survey).';

  test('the register carries the shortened glance note', () => {
    const oc03 = fact('OC-03').stat!;
    expect(oc03.glance?.note).toBe(NOTE);
    expect(oc03.glance?.note, 'the note does not repeat the tile value').not.toContain(oc03.value);
  });

  for (const [route, selector] of [
    ['partner-with-us/foundations/', '#glance li'],
    ['impact/', '#glance a[data-fact~="OC-03"]'],
  ] as const) {
    test(`${route}: the $245 tile reads the value once and the shortened note under it`, async ({ page }) => {
      await open(page, route);
      const tile = page.locator(selector, { hasText: '$245' });
      await expect(tile).toHaveCount(1);
      const text = compact(await tile.textContent());
      expect(text).toContain(NOTE);
      expect(text.match(/\$245/g), 'the tile states $245 once').toHaveLength(1);
      expect(text).not.toContain('before training to $245');
    });
  }
});

test.describe('the Governments "How Fast Can We Start?" answer does not count the weeks the steps band shows', () => {
  test('the answer keeps the three-week and 6–8 week timing and drops the Week 1 to 3 sentence, in the page and in its FAQ JSON-LD', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const item = page.locator('#faq details', { hasText: 'How Fast Can We Start?' });
    await expect(item).toHaveCount(1);
    const answer = compact(await item.textContent());
    expect(answer).toContain('Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry.');
    expect(answer).toContain('agreement typically takes about three weeks from first conversation, and the first cohort is typically in training 6–8 weeks after signing.');
    expect(answer).not.toMatch(/Counting from the first conversation|Week 1 is a briefing|Week 3 the agreement/);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('agreement typically takes about three weeks from first conversation');
    expect(ld).not.toContain('Counting from the first conversation');
    // the steps band after the FAQ still shows the sequence the answer no longer counts out
    const steps = (await texts(page, '#next-steps ol h3')).map((t) => t.replace(/^Step \d: /, ''));
    expect(steps).toEqual(['Briefing', 'Co-Design with the Agency', 'Agreement', 'Launch in Existing Labs']);
  });

  test('the pages without a steps band keep the count (the shared "How Fast Can We Start?" answer on YouthWIDE and Our Model)', async ({ page }) => {
    for (const route of ['programs/youthwide/', 'our-model/']) {
      await open(page, route);
      expect(await mainText(page), route).toContain('Counting from the first conversation, Week 1 is a discovery session, Week 2 co-design and Week 3 the agreement; public procurement follows the agency’s own timeline.');
    }
  });
});

test.describe('Outcomes 2026: "Results in Brief" has no bare 5.9% line', () => {
  test('the OC-01 tile keeps its 77.9% and its label, without the "no longer employed" note, which stays with its context in "Employment Before and After Training"', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    const summary = page.locator('#summary');
    const tile = summary.locator('[data-fact="OC-01"]');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.textContent())).toContain('77.9%');
    const brief = compact(await summary.textContent());
    expect(brief).not.toMatch(/5\.9%|no longer employed/);
    const employment = compact(await page.locator('#employment').textContent());
    expect(employment).toContain('Separately, 5.9% of those employed before training reported that they were no longer employed.');
    expect(employment.match(/5\.9%/g), 'stated once in the section').toHaveLength(1);
  });

  test('the register still holds the 5.9% (the page data is checked against it), so the fact is unchanged', () => {
    expect(fact('OC-01').stat?.detail).toBe('5.9% of those employed before training reported they were no longer employed.');
  });
});

test.describe('Home mechanism card 3', () => {
  test('reads exam preparation by track, then three months of mentoring, with no scope parenthesis; YouthWIDE keeps its scope sentence', async ({ page }) => {
    await open(page, '');
    const card = page.locator('#mechanism .model__block', { hasText: 'Skills, Certification Preparation and Mentoring' });
    await expect(card).toHaveCount(1);
    expect(compact(await card.textContent())).toContain('Industry certification exam preparation by track, then three months of milestone-based mentoring.');
    expect(await mainText(page)).not.toContain('eligibility and attempts agreed in the program scope');
    await open(page, 'programs/youthwide/');
    expect(await mainText(page)).toContain('exam eligibility and attempts are agreed in the program scope');
  });
});

test.describe('Investors: the national-scale answer closes on two short sentences', () => {
  test('three sentences (the FAQ cap, tests/wp30c.spec.ts): Her Power, then the phases, then the design option not yet delivered', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const item = page.locator('#faq details', { hasText: 'Can You Deliver at National Scale?' });
    await expect(item).toHaveCount(1);
    const answer = compact(await item.textContent());
    expect(answer).not.toContain('phase by phase');
    // CodersTrust's own role in Her Power comes before the national total, which is the program's (WP25s); the two statements are one sentence, so the answer stays within three sentences
    expect(answer.indexOf('CodersTrust provided the curriculum')).toBeLessThan(answer.indexOf('25,125'));
    const body = answer.slice(answer.indexOf('In Her Power'));
    const sentences = body.split(/(?<=[.?!])\s+(?=[A-Z])/);
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe(
      'In Her Power, a national program of DoICT, the ICT Division, CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,500 women directly; the national program trained 25,125 women across 130 sub-districts (upazilas).',
    );
    // the 41-word closing sentence is now two, each short
    expect(sentences[1]).toBe('We scale in phases: larger programs run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges.');
    expect(sentences[2]).toBe('A 100,000+ national program is a design option we have not yet delivered.');
    expect(wordCount(sentences[1])).toBeLessThanOrEqual(25);
    expect(wordCount(sentences[2])).toBeLessThanOrEqual(15);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('A 100,000+ national program is a design option we have not yet delivered.');
  });
});

test.describe('"skill and certification courses delivered" reads the same on every page that shows SC-09', () => {
  test('the register, the About tile and the Mentors line', async ({ page }) => {
    const sc09 = fact('SC-09');
    expect(sc09.text).toBe('150+ skill and certification courses delivered; 150+ instructors and mentors');
    expect(sc09.stat?.label).toBe('skill and certification courses delivered');
    await open(page, 'about/');
    const tile = page.locator('#glance [data-fact="SC-09"]');
    await expect(tile).toHaveCount(1);
    const tileText = compact(await tile.textContent());
    expect(tileText).toContain('150+');
    expect(tileText).toContain('skill and certification courses delivered');
    expect(await mainText(page)).not.toContain('skill courses and certification courses');
    await open(page, 'about/mentors/');
    await expect(page.locator('#mentors .lead[data-fact="SC-09"]')).toHaveText('150+ skill and certification courses delivered. 150+ instructors and mentors.');
    expect(await mainText(page)).not.toContain('skill courses and certification courses');
  });
});

test.describe('layout', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['', 'about/', 'about/mentors/', 'impact/', 'impact/outcomes-2026/', 'partner-with-us/foundations/', 'partner-with-us/governments/', 'partner-with-us/investors/']) {
        await open(page, route);
        expect(await noOverflow(page), route || 'home').toBe(true);
      }
    });
  }
});
