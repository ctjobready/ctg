import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { open } from './support/browser';
import { pageByRoute } from './support/pages';

/**
 * WP25h: Home cycle-5 fixes. Each test states one behavior, read from the built DOM (text, order, structure), not from pixels.
 *   - UNDP YES, Korail reports "found a first job within three months", never "in work" (PR-03, PR-06, slide 4 since WP42);
 *   - the evidence band: it held the paid-work pathways beside the 72.3% result (34 of 47) after WP33 removed the trial chart and WP35 (cycle-12 review) the trial block (WP30c removed the evidence ladder from the band); WP48 (cycle-23 review) removed the band itself (tests/wp48.spec.ts);
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
    // WP48 (cycle-23 review): "three months", not "3 months", in prose labels (tests/wp48.spec.ts)
    expect(fact('PR-03').text).toContain('found their first job within three months');
    expect(fact('PR-03').stat?.label).toBe('of the 350 enrolled found their first job within three months');
  });

  // WP42 (cycle-19 review): the government slide moved to second, so the program-results slide is the fourth
  // WP50 (cycle-25 review): WP35 had taken the WSDFM line off the slide (its 71% is program records, read beside the trial’s 63.1%); it is back as the second of four programs, with the qualifier "program records, not trial data" (tests/wp50.spec.ts)
  test('slide 4 states Korail with its own measure, and lists four programs, WSDFM among them with its qualifier', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const s = slide(page, 4);
    await expect(s.locator('.hs__eyebrow')).toHaveText('Program Records');
    await expect(s.locator('h3')).toHaveText('Results by Program');
    await expect(s.locator('.hs__lead')).toHaveText('Results from the records of four programs.');
    // WP36 (cycle-13 review): every result names its base
    await expect(s.locator('.hs__lines li')).toHaveText([
      'Women in Online Work, Kosovo (2016–2017): 68% in work (102 of 150).',
      'WSDFM: 711 of 1,000 enrolled in work (71%), from program records.',
      'UNDP YES, Korail (2017): 67% of the 350 enrolled found a first job within three months.',
      'Her Power: 372 of 800 tracked in work (47%); 2,400 trained directly.',
    ]);
  });

  test('no sentence on Home calls the Korail result "in work"', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const main = collapse(await page.locator('main').textContent());
    expect(main).not.toMatch(/Korail[^.]*\bin work\b/i);
  });
});

// WP48 (cycle-23 review): the evidence band ("Evidence You Can Check", #proof-band) is gone from Home with its paid-work pathways table and its 72.3% line (34 of 47): they repeated survey detail the hero's survey card and the carousel carry, and the
// Impact Survey 2026 page keeps both. The band's two evidence links close the "Proof in Practice" link row (tests/wp48.spec.ts). It had held no trial block, chart, ladder or program record since WP30c, WP33 and WP35.
test.describe('evidence band (#proof-band): gone from Home (WP48)', () => {
  test('Home has no #proof-band, no pathways table, no 70.8% tile and none of the trial or program-record content the band had already shed', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await expect(page.locator('#proof-band')).toHaveCount(0);
    await expect(page.locator('.pwp, .he__top, .he__trial, .lc, [data-plain-line], [data-fact="OC-02"], [data-fact="OC-04"]')).toHaveCount(0);
    const t = collapse(await page.locator('main').textContent());
    for (const gone of ['Evidence You Can Check', 'Paid-Work Pathways Among Surveyed Completers', '70.8%', '34 of 48', 'Employment at Trial Follow-Up', 'Chart data:', 'View Chart Data as a Table']) expect(t, `no "${gone}" on Home`).not.toContain(gone);
  });
});

test.describe('carousel, vision, proof, FAQ and offer wording', () => {
  test('the carousel slides carry the accepted headings, bases and links', async ({ page }) => {
    await open(page, pageByRoute('/'));
    // WP31: said as what surveyed completers report, not as a before-and-after effect. WP42 (cycle-19 review): the order is the trial, the government contracts, the survey income and the program results.
    // WP53 (owner decision 2026-10-16): the speed, reach and programs slides are gone. The survey slide (slide 3) keeps its heading, tile and evidence link and carries the finding of the former speed slide as ONE body line, OC-05's 58.7%
    // with the base the register defines ("surveyed new earners", WP36, WP49, WP52); the earlier heading ("Most Surveyed New Earners Were Earning by Six Months After the Course") is on no slide (tests/wp53.spec.ts).
    // WP54 (cycle-28 reviews, Claude S23 and GLM L1): that line leads with its base, in the words of OC-05's text, and follows the income tile (tests/wp54.spec.ts).
    await expect(slide(page, 3).locator('h3')).toHaveText('Surveyed Completers Report Higher Income');
    await expect(slide(page, 3).locator('.hs__lead')).toHaveText('Of the 172 surveyed completers who first earned during or after training, 58.7% had started earning by six months after finishing the course.');
    await expect(slide(page, 3).locator('a').first()).toHaveText('Read the Impact Survey 2026');
    await expect(page.locator('[data-hs-slide]')).toHaveCount(4);
    await expect(slide(page, 2).locator('.hs__eyebrow')).toHaveText('Government and University Partners');
    // WP41 (cycle-18 review): the heading counts the contracts (GV-12 says "Six") and says "a" National University partnership
    await expect(slide(page, 2).locator('h3')).toHaveText('Six Government Contracts and a National University Partnership');
    // WP45 (cycle-21 review): the contract scope is GV-12's own note, with Her Power's 25,125 women trained; WP46 (cycle-22 review): the note adds that CodersTrust trained 2,500 directly, and the last sentence names its subject
    // WP48 (cycle-23 review): the body was two sentences, the contract scope with the clause that keeps it true, then the National University sentence; WP57 (cycle-29 review, Grok R2): the clause names Her Power's national program again (25,125 women trained; CodersTrust trained 2,500 directly)
    await expect(slide(page, 2).locator('.hs__lead')).toHaveText('Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly. As the official training partner of Bangladesh’s National University for digital career skills and credentials, CodersTrust is onboarding 1.5M+ of the university’s own learners, who are not learners trained by CodersTrust.');
  });

  // WP48 (cycle-23 review, three reviewers): the third scenario is "Employers Hiring from Your Cohort" ("AI-ready" is a positioning term that Employers and JobReady@Work explain, not Home; tests/wp48.spec.ts)
  test('the third vision scenario is "Employers Hiring from Your Cohort": "You see employers hire completers whose skills match current employer demand."', async ({ page }) => {
    await open(page, pageByRoute('/'));
    expect(await text(page, '#future')).toContain('You see employers hire completers whose skills match current employer demand.');
    expect(await text(page, '#future')).not.toContain('AI-ready');
  });

  test('Proof in Practice points to all five case studies, with a link', async ({ page }) => {
    await open(page, pageByRoute('/'));
    // WP30c: the lead sentence is gone; the heading, three cards and one link to all five case studies remain (WP55: Digital Jobs Albania is the fifth)
    await expect(page.locator('#cases-h')).toHaveText('Proof in Practice');
    await expect(page.locator('#cases article')).toHaveCount(3);
    const link = page.getByRole('link', { name: 'See All Case Studies' });
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toMatch(/\/impact\/case-studies\/$/);
  });

  test('the FAQ "Does the Trial Apply to Your Program?" scopes other programs to the October 2026 survey and program records', async ({ page }) => {
    await open(page, pageByRoute('/'));
    expect(await text(page, '#faq')).toContain('Results for other programs come from the October 2026 survey of completers and from program records, which are descriptive');
  });

  // WP63 (cycle-35 review, Grok R5): option 1 is "Multi-Cohort Pilot Program", the name the audience pages use (Home called it "First Multi-Cohort Pilot")
  test('offer: option 1 is the Multi-Cohort Pilot Program, scoped in the discovery session; pricing is one short block', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const first = page.locator('#offer ol > li').first();
    await expect(first.locator('h3')).toHaveText('Multi-Cohort Pilot Program');
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
      'Completed 90+ projects as a freelance graphic designer on Fiverr.',
      'She landed a full-time online contract with a U.S.-based startup and was earning more than Kosovo’s average wage at the time.',
      'Won a company logo design on Freelancer.com, then more clients.',
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
          // WP58 (cycle-30 review, Claude S5): the one allowed " & " is the author list of the study PX-06 cites, "(Demirci, Hannane & Zhu, 2025)" (its registered citation, DHZ25, writes it so)
          if (n.nodeType === 3 && / & /.test(n.textContent ?? '') && !/Demirci, Hannane & Zhu, 2025/.test(n.textContent ?? '')) hits.push(`${el.tagName.toLowerCase()}: ${(n.textContent ?? '').trim().slice(0, 80)}`);
        }
      }
      return hits;
    });
    expect(found).toEqual([]);
  });
});
