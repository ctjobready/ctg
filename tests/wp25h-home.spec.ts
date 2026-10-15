import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { open } from './support/browser';
import { pageByRoute } from './support/pages';

/**
 * WP25h: Home cycle-5 fixes. Each test states one behavior, read from the built DOM (text, order, structure), not from pixels.
 *   - UNDP YES, Korail reports "found a first job within three months", never "in work" (PR-03, PR-06, slide 4 since WP42);
 *   - the evidence band: the paid-work pathways beside the 72.3% result (34 of 47); WP33 removed the trial chart and WP35 (cycle-12 review) the trial block (WP30c removed the evidence ladder from the band; see tests/wp28.spec.ts, tests/wp33.spec.ts and tests/wp35.spec.ts);
 *   - the carousel, vision, proof, FAQ and offer wording accepted in the cycle-5 triage;
 *   - the "Learner Journeys" strip of three registered stories;
 *   - no " & " in Home labels.
 */

const collapse = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const text = async (page: Page, selector: string) => collapse(await page.locator(selector).first().textContent());
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

test.describe('UNDP YES, Korail: first job, not "in work" (PR-03, PR-06)', () => {
  test('the register never says Korail trainees were in work', () => {
    const pr06 = fact('PR-06');
    const wording = [pr06.text, pr06.stat?.label, pr06.stat?.glance?.label, pr06.stat?.glance?.note].filter((w): w is string => !!w && /Korail/.test(w));
    expect(wording.length, 'PR-06 names Korail in its text, label and glance note').toBe(3);
    for (const w of wording) {
      expect(w, 'PR-06 wording names the first-job measure for Korail').toMatch(/Korail[^.;]*found (a|their) first job within three months/);
      expect(w, 'PR-06 wording never calls the Korail result "in work"').not.toMatch(/Korail[^.;·]*\bin work\b/i);
    }
    // the tile's own label covers all three programs, so it must not call the shared measure "in work" either
    expect(pr06.stat?.glance?.label, 'PR-06 glance label').not.toMatch(/\bin work\b/i);
    expect(fact('PR-03').text).toContain('found their first job within 3 months');
    expect(fact('PR-03').stat?.label).toBe('of the 350 trained found their first job within 3 months');
  });

  // WP42 (cycle-19 review): the government slide moved to second, so the program-results slide is the fourth
  test('slide 4 states Korail with its own measure; WP35: the WSDFM line is gone (its 71% is program records, read beside the trial’s 63.1%), so it lists three programs', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const s = slide(page, 4);
    await expect(s.locator('.hs__eyebrow')).toHaveText('Program Records');
    await expect(s.locator('h2')).toHaveText('Results by Program');
    await expect(s.locator('.hs__lead')).toHaveText('Three programs, each with its partner, with results from their own program records.');
    // WP36 (cycle-13 review): every result names its base
    await expect(s.locator('.hs__lines li')).toHaveText([
      'Women in Online Work, Kosovo: 68% in work (102 of 150).',
      'UNDP YES, Korail: 67% of the 350 trained found a first job within three months.',
      'Her Power: 47% of 800 tracked women in work.',
    ]);
    await expect(s).not.toContainText('WSDFM');
  });

  test('no sentence on Home calls the Korail result "in work"', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const main = collapse(await page.locator('main').textContent());
    expect(main).not.toMatch(/Korail[^.]*\bin work\b/i);
  });
});

test.describe('evidence band (#proof-band)', () => {
  test('shows the paid-work pathways beside the 72.3% result with its base (WP35: no trial block; WP30c: no ladder)', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const band = page.locator('#proof-band');
    const stat = band.locator('[data-fact="OC-02"]');
    await expect(stat).toContainText('72.3%');
    await expect(stat).toContainText('34 of 47 surveyed 2014–2023 completers with no prior income were earning at the October 2026 survey');
    // document order: the pathways comparison, then the 72.3% tile (WP35: the trial sub-block, its sentence and its link are gone; WP33: no chart)
    const order = await band.evaluate((el) => {
      const at = (sel: string) => {
        const n = el.querySelector(sel);
        return n ? Array.from(el.querySelectorAll('*')).indexOf(n) : -1;
      };
      return { stat: at('[data-fact="OC-02"]'), pathways: at('.pwp'), ladder: at('.lc'), trial: at('.he__trial'), sentence: at('[data-plain-line]'), chart: at('.ba, .he__chart') };
    });
    expect(order.pathways).toBeGreaterThan(-1);
    expect(order.stat).toBeGreaterThan(order.pathways);
    expect(order.trial, 'no trial sub-block in the band (WP35)').toBe(-1);
    expect(order.sentence, 'no plain-language trial sentence in the band (WP35)').toBe(-1);
    expect(order.chart, 'no trial chart in the band (WP33)').toBe(-1);
    expect(order.ladder, 'no evidence ladder in the band').toBe(-1);
  });

  test('does not retell the trial or the survey: no trial at all, no chart, and (WP29) one survey comparison the carousel does not carry', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const band = page.locator('#proof-band');
    await expect(band.locator('h2')).toHaveText('Evidence You Can Check');
    // WP29 (benchmark review): the paid-work pathways comparison (OC-04) is the band's one extra survey block; the carousel states no pathway figure.
    // WP35: the trial's sub-heading is gone with its sentence (the hero card and the first slide state the trial)
    await expect(band.locator('h3')).toHaveText(['Paid-Work Pathways Among Surveyed Completers']);
    await expect(band.locator('[data-fact="OC-04"]')).toHaveCount(1);
    await expect(band.locator('[data-plain-line]')).toHaveCount(0);
    await expect(band.locator('.ba, .ba__data, figure'), 'no chart, chart table or figure in the band').toHaveCount(0);
    const t = collapse(await band.textContent());
    for (const retold of ['41% higher', '54% higher', 'BIGD found', 'From the October 2026 Survey', '10.3', 'predecessor']) expect(t, `no "${retold}" in the band`).not.toContain(retold);
    expect(t.match(/72\.3%/g)?.length, 'the 72.3% appears once').toBe(1);
    expect(t, 'program records stay out of the evidence band').not.toMatch(/71%|711 of 1,000/);
  });

  test('carries no chart, chart table or chart note, and no trial figure or sub-heading (WP33, WP35)', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const t = collapse(await page.locator('#proof-band').textContent());
    for (const gone of ['Employment at Trial Follow-Up', 'Chart data:', 'View Chart Data as a Table', '52.8%', '63.1%', 'Control Group', 'Offered a Place', 'An Independent Randomized Trial of a Predecessor Program']) expect(t, `no "${gone}" in the band`).not.toContain(gone);
  });
});

test.describe('carousel, vision, proof, FAQ and offer wording', () => {
  test('the carousel slides carry the accepted headings, bases and links', async ({ page }) => {
    await open(page, pageByRoute('/'));
    // WP31: said as what surveyed completers report, not as a before-and-after effect; the heading says whose figures these are, so the slide has no lead
    // WP42 (cycle-19 review): the order is the trial, the government contracts, the survey income, the program results, the speed to earning, the reach and the programs
    await expect(slide(page, 3).locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    await expect(slide(page, 3).locator('.hs__lead')).toHaveCount(0);
    // WP36 (cycle-13 review): "surveyed completers", the survey page's term; the base is the clause "who started earning" (the lead gives it in full)
    // WP38 (cycle-15 review): the heading led with the figure and then named the base; WP41 (cycle-18 reviews): the heading is the finding alone ("First Earnings Within Six Months"), and the eyebrow, the lead and the tile keep "surveyed completers"
    await expect(slide(page, 5).locator('h2')).toHaveText('First Earnings Within Six Months');
    await expect(slide(page, 5).locator('.hs__lead')).toHaveText('Among surveyed completers who first earned during or after training, most started within six months.');
    await expect(slide(page, 5).locator('a').first()).toHaveText('See When Completers First Earn');
    await expect(slide(page, 2).locator('.hs__eyebrow')).toHaveText('Government and University Partners');
    // WP41 (cycle-18 review): the heading counts the contracts (GV-12 says "Six") and says "a" National University partnership
    await expect(slide(page, 2).locator('h2')).toHaveText('Six Government Contracts and a National University Partnership');
    await expect(slide(page, 2).locator('.hs__lead')).toHaveText('Six government contracts with training and curriculum scopes for 31,200+ people (contract scope, not people trained). Official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners.');
  });

  test('the third vision scenario starts "You see employers hire AI-ready talent from your cohort"', async ({ page }) => {
    await open(page, pageByRoute('/'));
    expect(await text(page, '#future')).toContain('You see employers hire AI-ready talent from your cohort, including completers prepared for an industry certification exam.');
  });

  test('Proof in Practice points to all four case studies, with a link', async ({ page }) => {
    await open(page, pageByRoute('/'));
    // WP30c: the lead sentence is gone; the heading, three cards and one link to all four case studies remain
    await expect(page.locator('#cases-h')).toHaveText('Proof in Practice');
    await expect(page.locator('#cases article')).toHaveCount(3);
    const link = page.getByRole('link', { name: 'See All Four Case Studies' });
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toMatch(/\/impact\/case-studies\/$/);
  });

  test('the FAQ "Does the Trial Apply to Your Program?" scopes later programs to the October 2026 survey and program records', async ({ page }) => {
    await open(page, pageByRoute('/'));
    expect(await text(page, '#faq')).toContain('Results for later programs come from the October 2026 survey of completers and from program records, which are descriptive');
  });

  test('offer: option 1 is the First Multi-Cohort Pilot, scoped in the discovery session; pricing is one short block', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const first = page.locator('#offer ol > li').first();
    await expect(first.locator('h3')).toHaveText('First Multi-Cohort Pilot');
    await expect(first).toContainText('Scope the number of cohorts and trainees with us in the discovery session.');
    const offer = await text(page, '#offer');
    // WP30c: the offer states pricing in one short block; the scale evidence (Her Power, the contracts) is on the Governments page and in the carousel
    expect(offer).toContain('Pricing is set per program, and we share an indicative budget in the discovery session.');
    expect(offer).not.toContain('Her Power');
    expect(offer).not.toContain('DoICT, the ICT Division');
  });
});

test.describe('Learner Journeys (#journeys)', () => {
  test('three registered stories, one per Proof in Practice program, with one caveat and a link to all stories', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const strip = page.locator('#journeys');
    await expect(strip.locator('h2')).toHaveText('Learner Journeys');
    const cards = strip.locator('article.sc');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('.sc__name')).toHaveText(['Samina Tasneem Chowdhury', 'Erlisa Zherka', 'Maria Dewan']);
    await expect(cards.locator('.sc__role')).toHaveText(['WSDFM', 'Women in Online Work, Kosovo', 'Her Power']);
    await expect(cards.locator('.sc__outcome')).toHaveText([
      'Completed 90+ projects as a freelance graphic designer on Fiverr',
      'She landed a full-time online contract with a US-based startup and was earning more than Kosovo’s average wage at the time.',
      'Won a company logo design on Freelancer.com, then more clients',
    ]);
    // the individual-story caveat is stated once, in the strip's lead
    expect((await text(page, '#journeys')).match(/not typical or promised outcomes/g)?.length).toBe(1);
    const link = strip.getByRole('link', { name: 'See All Success Stories' });
    expect(await link.getAttribute('href')).toMatch(/\/impact\/stories\/$/);
  });

  test('sits after the proof area and the hero, and replaces the single learner voice', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const order = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('main [id]')).map((e) => e.id);
      return { hero: ids.indexOf('hero'), cases: ids.indexOf('cases'), journeys: ids.indexOf('journeys'), recognition: ids.indexOf('recognition'), voice: ids.indexOf('learner-voice') };
    });
    expect(order.hero).toBeGreaterThan(-1);
    expect(order.journeys).toBeGreaterThan(order.cases);
    expect(order.journeys).toBeGreaterThan(order.hero);
    expect(order.voice, 'the single learner voice is gone').toBe(-1);
  });
});

test.describe('labels use "and", not "&"', () => {
  test('the "Also for" line says Universities and Colleges', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const also = await text(page, '.router__also');
    expect(also).toContain('Universities and Colleges');
  });

  test('no " & " in any visible Home text, link text or heading', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const found = await page.evaluate(() => {
      const hits: string[] = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
        for (const n of Array.from(el.childNodes)) {
          if (n.nodeType === 3 && / & /.test(n.textContent ?? '')) hits.push(`${el.tagName.toLowerCase()}: ${(n.textContent ?? '').trim().slice(0, 80)}`);
        }
      }
      return hits;
    });
    expect(found).toEqual([]);
  });
});
