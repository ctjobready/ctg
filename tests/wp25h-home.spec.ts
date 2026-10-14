import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { open } from './support/browser';
import { pageByRoute } from './support/pages';

/**
 * WP25h: Home cycle-5 fixes. Each test states one behavior, read from the built DOM (text, order, structure), not from pixels.
 *   - UNDP YES, Korail reports "found a first job within three months", never "in work" (PR-03, PR-06, slide 3);
 *   - the evidence band: the trial in one sentence and its chart, then the ladder, then the 72.3% result (34 of 47) (the order is WP28's, see tests/wp28.spec.ts);
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

  test('slide 3 states Korail with its own measure and labels the WSDFM line as program records', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const s = slide(page, 3);
    await expect(s.locator('.hs__eyebrow')).toHaveText('Program Records');
    await expect(s.locator('h2')).toHaveText('Results by Program');
    await expect(s.locator('.hs__lead')).toHaveText('Four programs, each with its partner, with results from their own program records.');
    await expect(s.locator('.hs__lines li')).toHaveText([
      'WSDFM program records: 71% in work.',
      'Women in Online Work, Kosovo: 68% in work.',
      'UNDP YES, Korail: 67% found a first job within three months.',
      'Her Power: 47% of 800 tracked women in work.',
    ]);
  });

  test('no sentence on Home calls the Korail result "in work"', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const main = collapse(await page.locator('main').textContent());
    expect(main).not.toMatch(/Korail[^.]*\bin work\b/i);
  });
});

test.describe('evidence band (#proof-band)', () => {
  test('shows the 72.3% result with its base, after the trial and the ladder (WP28 order)', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const band = page.locator('#proof-band');
    const stat = band.locator('[data-fact="OC-02"]');
    await expect(stat).toContainText('72.3%');
    await expect(stat).toContainText('34 of 47 surveyed 2014–2023 completers with no prior income were earning at the October 2026 survey');
    // document order: the trial heading, its sentence and its chart, then the ladder, then the 72.3% tile
    const order = await band.evaluate((el) => {
      const at = (sel: string) => {
        const n = el.querySelector(sel);
        return n ? Array.from(el.querySelectorAll('*')).indexOf(n) : -1;
      };
      return { stat: at('[data-fact="OC-02"]'), ladder: at('.lc'), trial: at('.he__trial'), sentence: at('[data-plain-line]'), chart: at('.he__chart svg') };
    });
    expect(order.trial).toBeGreaterThan(-1);
    expect(order.sentence).toBeGreaterThan(order.trial);
    expect(order.chart).toBeGreaterThan(order.sentence);
    expect(order.ladder).toBeGreaterThan(order.chart);
    expect(order.stat).toBeGreaterThan(order.ladder);
  });

  test('does not retell the trial or the survey: one trial sentence, one chart, and (WP29) one survey comparison the carousel does not carry', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const band = page.locator('#proof-band');
    await expect(band.locator('h2')).toHaveText('Trial and Survey Evidence');
    // WP29 (benchmark review): the paid-work pathways comparison (OC-04) is the band's one extra survey block; the carousel states no pathway figure
    await expect(band.locator('h3')).toHaveText(['An Independent Randomized Trial', 'Four Kinds of Evidence, Strongest First', 'Paid-Work Pathways Among Surveyed Completers']);
    await expect(band.locator('[data-fact="OC-04"]')).toHaveCount(1);
    await expect(band.locator('[data-plain-line]')).toHaveCount(1);
    await expect(band.locator('[data-plain-line]')).toHaveText('For every 100 women offered a place, about 10 more were in work at follow-up than among 100 comparable women in the control group (+10.3 percentage points).');
    await expect(band.locator('svg[role="img"], figure svg').first()).toBeVisible();
    const t = collapse(await band.textContent());
    for (const retold of ['41% higher', '54% higher', 'BIGD found', 'From the October 2026 Survey']) expect(t, `no "${retold}" in the band`).not.toContain(retold);
    expect(t.match(/72\.3%/g)?.length, 'the 72.3% appears once').toBe(1);
    expect(t, 'program records stay out of the evidence band').not.toMatch(/71%|711 of 1,000/);
  });

  test('labels the chart as the trial follow-up for women offered a place', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const t = collapse(await page.locator('#proof-band').textContent());
    expect(t).toContain('Employment at Trial Follow-Up (Nov–Dec 2021): Women Offered a Place and Control Group');
    expect(t).toContain('Chart data: employment at trial follow-up, women offered a place and the control group.');
    expect(t).toContain('63.1%');
    expect(t).toContain('52.8%');
  });
});

test.describe('carousel, vision, proof, FAQ and offer wording', () => {
  test('the carousel slides carry the accepted headings, bases and links', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await expect(slide(page, 2).locator('h2')).toHaveText('Median Income: $82 Before Training, $245 at the October 2026 Survey');
    await expect(slide(page, 2).locator('.hs__lead')).toContainText('Among surveyed completers');
    await expect(slide(page, 4).locator('h2')).toHaveText('58.8% of Surveyed Earners Started Within Six Months');
    await expect(slide(page, 4).locator('.hs__lead')).toHaveText('Among surveyed completers who first earned during or after training, most started within six months.');
    await expect(slide(page, 4).locator('a').first()).toHaveText('See When Completers First Earn');
    await expect(slide(page, 6).locator('.hs__eyebrow')).toHaveText('Government and University Partners');
    await expect(slide(page, 6).locator('h2')).toHaveText('Government Contracts and National University Partnership');
    await expect(slide(page, 6).locator('.hs__lead')).toHaveText('Six government contracts with training and curriculum scopes for 31,200+ people (contract scope, not people trained). Official skills partner of Bangladesh’s National University, onboarding 1.5M+ learners.');
  });

  test('the third vision scenario starts "You see employers hire AI-ready talent from your cohort"', async ({ page }) => {
    await open(page, pageByRoute('/'));
    expect(await text(page, '#future')).toContain('You see employers hire AI-ready talent from your cohort, including completers prepared for an industry certification exam.');
  });

  test('Proof in Practice points to all four case studies, with a link', async ({ page }) => {
    await open(page, pageByRoute('/'));
    expect(await text(page, '#cases')).toContain('Three of our four case studies, each with its partner — see all four in Case Studies.');
    const link = page.getByRole('link', { name: 'See All Four Case Studies' });
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toMatch(/\/impact\/case-studies\/$/);
  });

  test('the FAQ "Does the Trial Apply to Your Program?" scopes later programs to the October 2026 survey and program records', async ({ page }) => {
    await open(page, pageByRoute('/'));
    expect(await text(page, '#faq')).toContain('Results for later programs come from the October 2026 survey of completers and from program records, which are descriptive');
  });

  test('offer: option 1 is the First Multi-Cohort Pilot, scoped in the discovery session; the Her Power sentence names who ran it', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const first = page.locator('#offer ol > li').first();
    await expect(first.locator('h3')).toHaveText('First Multi-Cohort Pilot');
    await expect(first).toContainText('Scope the number of cohorts and trainees with us in the discovery session.');
    const offer = await text(page, '#offer');
    expect(offer).toContain('Her Power, a national program of DoICT and the ICT Division, trained 25,125 women across 130 sub-districts (upazilas); CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,500 women directly.');
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
