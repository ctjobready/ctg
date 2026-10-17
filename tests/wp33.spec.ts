import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP33 behaviors (cycle-10 whole-site reviews): the Home evidence band states the trial in one line and one link instead of a chart (WP35, cycle-12 review: the trial block left the band altogether;
 * the Home evidence-band tests below describe the band as it is now, and tests/wp35.spec.ts pins the rest), the OC-03 tile note no longer
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

// WP48 (cycle-23 review): the evidence band (#proof-band, "Evidence You Can Check") is gone from Home, with its paid-work pathways table and its 72.3% tile (the Impact Survey 2026 page keeps both); its two evidence links close the
// "Proof in Practice" link row (tests/wp48.spec.ts). The band had held no trial block since WP35, so the trial figure is the hero card's and the first slide's.
test.describe('Home evidence band (#proof-band): gone (WP48); the trial and survey links close the Proof in Practice row', () => {
  test('there is no #proof-band, no plain-language trial sentence and no chart; the link row links the case studies, the trial results and the survey', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#proof-band')).toHaveCount(0);
    await expect(page.locator('[data-plain-line]')).toHaveCount(0);
    await expect(page.locator('main .ba, main .ba__data')).toHaveCount(0);
    expect(await texts(page, '#cases .csc__more a')).toEqual(['See All Five Case Studies', 'Read the Trial Results', 'Impact Survey 2026']);
    await expect(page.locator('#cases a[href$="/impact/independent-evaluation/"]'), 'one link to the trial results in the row').toHaveCount(1);
  });

  test('the trial figure is the hero card’s (+10.3 percentage points); the Proof in Practice band does not restate it', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('.hh__card[data-fact="RC-02"]').textContent())).toContain('+10.3 percentage points');
    expect(compact(await page.locator('#cases').textContent())).not.toContain('10.3 percentage points');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the link row is visible and the page does not scroll sideways`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, '');
      await expect(page.locator('#cases .csc__more a').first()).toBeVisible();
      await expect(page.locator('#cases .csc__more a').last()).toBeVisible();
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
  // WP50 (cycle-25 review, item 23): the answer is the procurement sentence alone; the grant-pilot timing sentence it carried (three weeks to agreement, 6–8 weeks to training) is gone (tests/wp50.spec.ts)
  test('the answer is the procurement sentence alone and has no Week 1 to 3 sentence or grant-pilot timing, in the page and in its FAQ JSON-LD', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const item = page.locator('#faq details', { hasText: 'How Fast Can We Start?' });
    await expect(item).toHaveCount(1);
    const answer = compact(await item.textContent());
    expect(answer).toContain('Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry.');
    expect(answer).not.toContain('agreement typically takes about three weeks from first conversation');
    expect(answer).not.toMatch(/Counting from the first conversation|Week 1 is a briefing|Week 3 the agreement/);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry.');
    expect(ld).not.toContain('agreement typically takes about three weeks from first conversation');
    expect(ld).not.toContain('Counting from the first conversation');
    // the steps band after the FAQ still shows the sequence the answer no longer counts out
    const steps = (await texts(page, '#next-steps ol h3')).map((t) => t.replace(/^Step \d: /, ''));
    expect(steps).toEqual(['Briefing', 'Co-Design with the Agency', 'Agreement', 'Launch in Existing Labs']);
  });

  // WP37 (cycle-14 review): Our Model has its own two-sentence variant (it says the weeks once, "allow about three weeks ... then 6–8 weeks ..."); WP40 (cycle-17 review): YouthWIDE, whose "What Happens Next" shows the sequence,
  // uses it too, so no built page counts the weeks out any more (the shared Q7 stays in the objection bank; tests/wp37.spec.ts, tests/wp40.spec.ts)
  test('neither YouthWIDE nor Our Model counts the weeks out in "How Fast Can We Start?"', async ({ page }) => {
    for (const route of ['programs/youthwide/', 'our-model/']) {
      await open(page, route);
      expect(await mainText(page), route).not.toContain('Counting from the first conversation');
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
    // WP45 (cycle-21 review): "are designed to run" (PD-06 states a design, not a delivered capacity)
    expect(sentences[1]).toBe('We scale in phases: larger programs are designed to run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges.');
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
