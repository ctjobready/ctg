import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { C14, FAQ_EYEBROW } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP54 behaviors (the verified cycle-28 whole-site reviews): the Governments pain "Trainer and Curriculum Capacity Takes Time to Build" and the lower-case "implemented by" in the NHRDF contract name; the Local Partners reporting pain
 * ("often measured by enrollment"); the readiness-assessment step ("routes applicants"); Contact steps 1 and 3; the evaluator (BIGD) spelled out at its first mention on every page that names it; the Programs menu line for YouthWIDE
 * (no Bangladesh aim); Home's survey slide (the income tile first, then a sentence that leads with its base) and trial slide (the ">4×" callout); "agreed before enrollment" everywhere; the one partner-logo caption on every page
 * that prints it; the Employers closing band (the first-action line alone, the AWS credential as a sentence of the logo caption); the Universities meta description; Home's first Imagine card; the FAQ eyebrow; the Albania partner on Global Reach
 * (WP55: the former "Albania" photograph is a Kosovo photograph, so no photograph is captioned as Albania any more, and Global Reach lists 17 locations; WP56: 16, Somalia removed).
 * Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp54.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** The visible text of a built page's HTML (scripts, styles and the head dropped), for scans across every page. */
const visible = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/\s+/g, ' ');
/** The built pages that are not archived news posts (those keep their original wording). */
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** Everything in main, including answers inside closed FAQ accordions (innerText leaves those out). */
const everything = async (page: Page) => compact(await page.locator('main').evaluate((el) => el.textContent ?? ''));
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

const HOME = '';
const HUB = 'partner-with-us/';
const GOV = 'partner-with-us/governments/';
const LOCAL = 'partner-with-us/local-partners/';
const EMP = 'partner-with-us/employers/';
const UNI = 'partner-with-us/universities/';
const DP = 'partner-with-us/development-partners/';
const FOUND = 'partner-with-us/foundations/';
const MODEL = 'our-model/';
const TALENTLEAP = 'our-model/talentleap/';
const CONTACT = 'contact/';
const ABOUT = 'about/';
const GOVERNANCE = 'about/governance/';
const YOUTHWIDE = 'programs/youthwide/';
const CAMPUS = 'programs/jobready-campus/';
const WORK = 'programs/jobready-work/';
const NU = 'programs/nu-postgraduate-diploma/';
const SUPERKIDS = 'programs/superkids/';
const PROGRAMS = 'programs/';
const IMPACT = 'impact/';
const WSDFM = 'impact/case-studies/wsdfm-women-freelancers/';
const FIELD = 'impact/in-the-field/';
const GLOBAL_REACH = 'impact/global-reach/';

test.describe('Governments: the third pain says capacity takes time to build; the NHRDF contract says "implemented by" (items G2 and S20)', () => {
  const HEADING = 'Trainer and Curriculum Capacity Takes Time to Build';

  test('the pain heading is Title Case, its line is unchanged, and the page no longer says the capacity "Is Thin"', async ({ page }) => {
    await open(page, GOV);
    expect(HEADING).toBe(titleCase(HEADING));
    expect(await texts(page, '#problem .gp__q')).toEqual(['Graduates Struggle to Find Work', 'Training Budgets Do Not Show Up as Earnings', HEADING]);
    const item = page.locator('#problem .gp__pains li', { has: page.locator('.gp__q', { hasText: HEADING }) });
    await expect(item).toHaveCount(1);
    expect(compact(await item.locator('.gp__a').textContent())).toBe('National delivery needs trained facilitators and localized curricula.');
    expect(await everything(page)).not.toMatch(/capacity is thin/i);
  });

  test('the NHRDF contract name reads "..., implemented by the National Skills Development Authority, NSDA" (no capital I), as the register words GV-04', async ({ page }) => {
    await open(page, GOV);
    const row = page.locator('#contracts tbody tr', { hasText: 'NHRDF' });
    await expect(row).toHaveCount(1);
    expect(compact(await row.locator('th').textContent())).toBe('NHRDF (National Human Resource Development Fund, implemented by the National Skills Development Authority, NSDA)');
    expect(fact('GV-04').text).toContain('implemented by NSDA');
    expect(sitePages().filter((p) => visible(p.html).includes('Implemented by the National Skills')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Local Partners: training is "often" measured by enrollment (item G3)', () => {
  // WP61 (cycle-33 review, GPT-6.1 Sol G4): the first pain is what CodersTrust adds ("Curriculum and Certification Take Time to Build"), no longer a deficit ("... a ready curriculum, trained facilitators and a route to industry certification are often out of reach."); tests/wp61.spec.ts
  test('the third pain says "often", not "still"; the other two pains are unchanged', async ({ page }) => {
    await open(page, LOCAL);
    const pains = page.locator('#problem .gp__pains li');
    await expect(pains).toHaveCount(3);
    expect(await texts(page, '#problem .gp__pains li .gp__a')).toEqual([
      'A ready curriculum, trained facilitators and a route to industry certification take time and specialist support to build.',
      'Training that stops at the classroom door leaves completers without links to employers, clients and platforms.',
      'Funders ask who is earning, but training is often measured by enrollment, not earnings.',
    ]);
    expect(await pains.nth(2).getAttribute('data-pain')).toBe('P3');
    expect(await everything(page)).not.toContain('is still measured by enrollment');
  });
});

test.describe('The readiness-assessment step routes "applicants" (item G4)', () => {
  const STEP = 'A readiness assessment routes applicants to a career or foundation track.';

  test('Our Model and TalentLEAP show the step, and TalentLEAP’s structured data carries the same sentence; "routes each applicant" is on no page', async ({ page }) => {
    for (const route of [MODEL, TALENTLEAP]) {
      await open(page, route);
      const text = await everything(page);
      expect(text, route).toContain(STEP);
      expect(text, route).not.toContain('routes each applicant');
    }
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain(STEP);
    expect(ld).not.toContain('routes each applicant');
    expect(sitePages().filter((p) => p.html.includes('routes each applicant')).map((p) => p.route)).toEqual([]);
  });

  test('Our Model still says some applicants may not be selected, which "each applicant" contradicted', async ({ page }) => {
    await open(page, MODEL);
    expect(await everything(page)).toContain('Some applicants may not be selected, and the reasons are reported.');
  });
});

test.describe('Contact: step 1 asks for two suitable times; step 3 is four short lines (items R7 and G7)', () => {
  test('step 1 is "In your inquiry, include two suitable times." (it named a discovery conversation, which not every route begins with)', async ({ page }) => {
    await open(page, CONTACT);
    const first = compact(await page.locator('#next .steps__item').nth(0).textContent());
    expect(first).toContain('Your Inquiry');
    expect(first).toContain('In your inquiry, include two suitable times.');
    expect(first).not.toContain('discovery conversation');
    expect(compact(await page.locator('#next .steps__item').nth(1).textContent())).toContain('We talk through your goals, priority groups and timeline.');
  });

  test('step 3 is "Program partners: ... Foundations: ... Employers: ... Impact investors: ...", with the hiring qualifier kept', async ({ page }) => {
    await open(page, CONTACT);
    const third = compact(await page.locator('#next .steps__item').nth(2).textContent());
    expect(third).toContain(
      'Program partners: a program scope, designed with you. Foundations: a cohort or platform grant. Employers: a needs assessment, or a talent request scoped against the candidate pool. Impact investors: the deck and data room, under NDA.',
    );
    for (const gone of ['Development partners, governments', 'Employers training a team', 'Employers hiring talent', 'follow under NDA', 'experience and credentials available']) expect(third, gone).not.toContain(gone);
    // the recap points to the route cards above it, which still name each kind of partner
    const cards = await texts(page, '#routes h4');
    for (const who of ['Impact Investors', 'Universities and Colleges', 'Employers: Hire Talent']) expect(cards, who).toContain(who);
  });
});

test.describe('BIGD is spelled out at its first mention on every page that names it (item G8)', () => {
  const SPELLED = 'BRAC Institute of Governance and Development (BIGD)';

  test('on every page the first "BIGD" is the one inside the spelled-out name; /impact/ is the one exception (its ladder row spells the institute out beside the abbreviation, WP48 item 34)', () => {
    const offenders: string[] = [];
    let checked = 0;
    for (const p of sitePages()) {
      const text = visible(p.html);
      const first = text.search(/\bBIGD\b/);
      if (first === -1) continue;
      checked++;
      if (p.route === '/impact/') continue;
      const spelled = text.indexOf(SPELLED);
      if (spelled === -1 || spelled + SPELLED.length - 'BIGD)'.length !== first) offenders.push(p.route);
    }
    expect(offenders).toEqual([]);
    expect(checked, 'the scan found the pages that name the evaluator').toBeGreaterThanOrEqual(9);
  });

  test('About and Governance: the trial sentence names the evaluator in full, once', async ({ page }) => {
    for (const route of [ABOUT, GOVERNANCE]) {
      await open(page, route);
      const text = await everything(page);
      expect(text, route).toContain('A randomized trial by the BRAC Institute of Governance and Development (BIGD) found that women offered a place in CodersTrust’s predecessor WSDFM program were 10.3 percentage points more likely to be employed.');
      expect(count(text, 'BIGD'), route).toBe(1);
      expect(await page.locator('[data-fact="RC-01"]').count(), route).toBeGreaterThan(0);
    }
  });

  test('YouthWIDE: the evidence sentence names the evaluator in full (RC-01 and RC-02 stay its facts)', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const headline = page.locator('#proof-band .eb__headline');
    await expect(headline).toHaveText(
      'In the randomized trial of the predecessor WSDFM program by the BRAC Institute of Governance and Development (BIGD), women offered a place were 10.3 percentage points more likely to be employed and had an estimated 41% higher monthly income than the control group.',
    );
    expect(await headline.getAttribute('data-fact')).toBe('RC-01 RC-02');
    expect(await everything(page)).not.toContain('BIGD’s');
  });

  test('the WSDFM case study: the hero note names the evaluator in full, and the tiles, the trial sub-heading and the chart note use the abbreviation it introduces', async ({ page }) => {
    await open(page, WSDFM);
    await expect(page.locator('[data-hero-note]')).toHaveText('Program records and a separate randomized trial of 833 women in the predecessor program, by the BRAC Institute of Governance and Development (BIGD).');
    const text = await everything(page);
    expect(count(text, SPELLED)).toBe(1);
    expect(text.indexOf('BIGD'), 'the first BIGD is the one in the hero note’s full name').toBe(text.indexOf(SPELLED) + SPELLED.length - 'BIGD)'.length);
    expect(count(text, 'BIGD randomized trial'), 'the tiles, the trial sub-heading and the chart note keep the abbreviation').toBeGreaterThanOrEqual(3);
  });
});

test.describe('The Programs menu describes YouthWIDE without the Bangladesh aim (item S7)', () => {
  const LINE = 'Co-funded country cohorts, designed for three regions, from training to paid digital work.';

  test('the menu item and the featured panel say the line, tied to IN-02 alone', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HOME);
    const link = page.locator('#mega-programs a.mega__link[href$="programs/youthwide/"]');
    expect(compact(await link.locator('.mega__desc').textContent())).toBe(LINE);
    expect(compact(await page.locator('#mega-programs .mega__feature-text').textContent())).toBe(LINE);
    const ids = await link.evaluate((el) => `${el.getAttribute('data-fact') ?? ''} ${el.querySelector('[data-fact]')?.getAttribute('data-fact') ?? ''}`);
    expect(ids).toContain('IN-02');
    expect(ids).not.toContain('IN-01');
    const menu = compact(await page.locator('#mega-programs').evaluate((el) => el.textContent ?? ''));
    expect(menu).not.toMatch(/aims to train|2 million/);
  });

  test('no page’s menu carries the aim, and it is still stated where it is labeled as an aim: YouthWIDE, the Programs hub and Impact', async ({ page }) => {
    expect(sitePages().filter((p) => visible(p.html).includes('Co-funded country cohorts, designed for three regions, with a Bangladesh initiative')).map((p) => p.route)).toEqual([]);
    await open(page, YOUTHWIDE);
    expect(compact(await page.locator('#program-glance .pg__row').first().textContent())).toContain('aims to train 2 million vulnerable youth by 2030');
    await open(page, PROGRAMS);
    expect(await everything(page)).toContain('In Bangladesh it aims to train 2 million vulnerable youth for digital employment by 2030');
    await open(page, IMPACT);
    expect(await everything(page)).toContain('Aim: vulnerable youth trained for digital employment by 2030');
  });
});

test.describe('Home slide 3: the income tile comes first, then a sentence that leads with its base (items S23 and L1)', () => {
  const SENTENCE = 'Of the 172 surveyed completers who first earned during or after training, 58.7% had started earning by six months after finishing the course.';

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the order under the heading is the income tile, the sentence, the link, in the markup and on the page; data-fact ties and the eyebrow are kept`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, HOME);
      const s = slide(page, 3);
      await expect(s.locator('.hs__eyebrow')).toHaveText('Impact Survey 2026');
      expect(await s.locator('.hs__copy').evaluate((copy) => Array.from(copy.children).map((c) => c.className.split(' ')[0]))).toEqual(['hs__eyebrow', 'hs__title', 'hs__stats', 'hs__lead', 'hs__actions']);
      const tops = await s.evaluate((el) => ['.hs__title', '.hs__stats', '.hs__lead', '.hs__actions'].map((sel) => Math.round(el.querySelector(sel)!.getBoundingClientRect().top)));
      expect(tops[0], 'the heading is above the tile').toBeLessThan(tops[1]);
      expect(tops[1], 'the tile is above the sentence').toBeLessThan(tops[2]);
      expect(tops[2], 'the sentence is above the link').toBeLessThan(tops[3]);
      expect(await s.locator('h2').getAttribute('data-fact')).toBe('OC-03');
      expect(await s.locator('.hs__stat').getAttribute('data-fact')).toBe('OC-03');
      const tile = compact(await s.locator('.hs__stat').textContent());
      expect(tile).toContain('$245');
      expect(tile).toContain('median monthly income among surveyed completers; the median before training was $98.');
      expect(compact(await s.locator('.hs__lead').textContent())).toBe(SENTENCE);
      expect(await s.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    });
  }

  test('only this slide shows its tiles first; the sentence is built from OC-05 and Home no longer uses the term "surveyed new earners"', async ({ page }) => {
    await open(page, HOME);
    await expect(page.locator('#results .hs__stats')).toHaveCount(1);
    await expect(slide(page, 3).locator('.hs__stats')).toHaveCount(1);
    const oc05 = fact('OC-05');
    expect(oc05.text.startsWith('Among the 172 surveyed completers who first earned during or after training: ')).toBe(true);
    expect(oc05.stat?.value).toBe('58.7%');
    expect(oc05.stat?.label).toContain('had started earning by six months after finishing the course');
    expect(count(compact(await page.locator('#results').evaluate((el) => el.textContent ?? '')), '58.7%'), 'the 58.7% is stated once in the carousel').toBe(1);
    expect(await everything(page)).not.toMatch(/surveyed new earners/i);
  });
});

test.describe('Home slide 1: the ">4×" callout names the comparison and its average (item R2)', () => {
  // WP59 (cycle-31 review, Kimi K3): the callout states the +10.3 it compares (RC-02's figure, which RC-06a's text states too): "Employment effect: +10.3 percentage points, more than four times the 2.3-point average across nine vocational-training trials." (tests/wp59.spec.ts)
  test('"Employment effect: +10.3 percentage points, more than four times the 2.3-point average across nine vocational-training trials." with the tile and its fact tie unchanged; an average, never "typical"', async ({ page }) => {
    await open(page, HOME);
    const proof = slide(page, 1).locator('.hs__proof');
    expect(await proof.getAttribute('data-fact')).toBe('RC-06a');
    await expect(proof.locator('.stat__value')).toHaveText('>4×');
    expect(compact(await proof.locator('.stat__label').textContent())).toBe('Employment effect: +10.3 percentage points, more than four times the 2.3-point average across nine vocational-training trials.');
    expect(fact('RC-06a').stat?.value).toBe('>4×');
    expect(fact('RC-06a').stat?.glance?.label).toMatch(/more than four times the 2\.3-point average across nine vocational-training trials$/);
    const text = compact(await proof.textContent());
    expect(text).not.toMatch(/typical/i);
    await page.setViewportSize(MOBILE);
    await open(page, HOME);
    expect(await noOverflow(page)).toBe(true);
  });
});

test.describe('"Agreed before enrollment" everywhere (item S25)', () => {
  test('no built page says a work-entry plan is "approved before enrollment"', () => {
    expect(sitePages().filter((p) => /approved before enrollment/i.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  // WP57 (cycle-29 review, GPT-6.1 Sol G2): YouthWIDE's three-card band, whose first card said "a work-entry plan per track agreed before enrollment" (PD-19), is gone; the page no longer states the work-entry plan at all
  test('Home and TalentLEAP say "agreed before enrollment"; YouthWIDE no longer carries the removed card’s sentence', async ({ page }) => {
    await open(page, HOME);
    expect(await everything(page)).toContain('Each track’s work-entry plan is agreed before enrollment.');
    await open(page, TALENTLEAP);
    expect(await everything(page)).toContain('each track’s work-entry plan is agreed before enrollment.');
    await open(page, YOUTHWIDE);
    expect(await everything(page)).not.toContain('a work-entry plan per track agreed before enrollment.');
  });
});

test.describe('One caption on every partner-logo band (item K1)', () => {
  const CAPTION = 'Organizations we have worked with, 2014–2026. These are working relationships, not endorsements.';
  // WP61 (cycle-33 review, GLM L6, with Kimi): Contact no longer closes on a partner logo wall, so it is not one of the pages with a logo band (tests/wp61.spec.ts holds its absence)
  const ROUTES = [DP, GOV, FOUND, UNI, EMP, LOCAL, CAMPUS, WORK, NU, YOUTHWIDE];

  test('every logo band on the audience pages and the program pages prints the full caption, and its landmark keeps PA-04’s sentence as its name', async ({ page }) => {
    for (const route of ROUTES) {
      await open(page, route);
      const captions = await texts(page, 'section.partners .partners__title');
      expect(captions.length, route).toBeGreaterThan(0);
      for (const c of captions) expect(c.startsWith(CAPTION), `${route}: ${c}`).toBe(true);
      const names = await page.locator('section.partners[aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));
      expect(new Set(names).size, `${route}: landmark names are unique`).toBe(names.length);
      for (const n of names) {
        expect(n.startsWith('Organizations we have worked with, 2014–2026'), `${route}: ${n}`).toBe(true);
        expect(n, route).not.toContain('working relationships');
      }
    }
  });

  test('Home prints the same caption once, over its relationship cards', async ({ page }) => {
    await open(page, HOME);
    await expect(page.locator('#guide .rel__caption')).toHaveText(CAPTION);
    expect(count(await everything(page), 'These are working relationships, not endorsements.')).toBe(1);
  });

  test('no built page prints the old caption sentence on its own', () => {
    // every printed caption continues with the second sentence (the styleguide’s sample captions are its own text)
    const alone = sitePages()
      .filter((p) => p.route !== '/styleguide/')
      .filter((p) => /Organizations we have worked with, 2014–2026\.(?! These are working relationships, not endorsements\.)/.test(visible(p.html)))
      .map((p) => p.route);
    expect(alone).toEqual([]);
  });
});

test.describe('Employers: the closing band, the AWS credential and the first-step line (items K2, K3 and K5)', () => {
  test('the closing band is the first-action line alone, for team training or hiring; "Private-sector partners include ..." is gone and the strip names the five partners', async ({ page }) => {
    await open(page, EMP);
    expect(C14.variants.employers).toBe('Your first step, for team training or hiring: a discovery session. In your inquiry, include two suitable times.');
    expect(await texts(page, '#reinforce li')).toEqual([C14.variants.employers]);
    expect(await everything(page)).not.toContain('Private-sector partners include');
    expect(Object.keys(C14.validateFor)).toEqual(['foundations']);
    const strip = await page.locator('#guide .partners').evaluate((el) => `${el.textContent ?? ''} ${Array.from(el.querySelectorAll('img')).map((i) => i.getAttribute('alt') ?? '').join(' ')}`);
    for (const name of ['Grameenphone Academy', 'Robi', 'Accenture', 'BASIS', 'AWS']) expect(strip, name).toContain(name);
  });

  test('"CodersTrust is an AWS Authorized Training Partner." is a sentence of the logo strip’s caption, tied to PA-06, not a lone paragraph under the logos', async ({ page }) => {
    await open(page, EMP);
    const caption = page.locator('#guide section.partners .partners__title');
    await expect(caption).toHaveCount(1);
    expect(compact(await caption.textContent())).toBe('Organizations we have worked with, 2014–2026. These are working relationships, not endorsements. CodersTrust is an AWS Authorized Training Partner.');
    expect(await caption.locator('[data-fact]').getAttribute('data-fact')).toBe('PA-06');
    expect(fact('PA-06').text).toBe('AWS Authorized Training Partner');
    await expect(page.locator('#guide .pg__logonote, #guide section.partners > p:not(.partners__title)')).toHaveCount(0);
    expect(count(await everything(page), 'AWS Authorized Training Partner')).toBe(1);
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, EMP);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Universities: the meta description states only what the page states (item K4)', () => {
  test('it names no figure, fits the limit, and each claim is in the page body', async ({ page }) => {
    await open(page, UNI);
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toBe('For universities and colleges: JobReady@Campus combines training, mentoring and placement support in campus labs, alongside academic studies.');
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).not.toMatch(/\d/);
    expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(description);
    const body = await everything(page);
    expect(body).toContain('We help universities and colleges prepare students');
    expect(body).toContain('JobReady@Campus combines training, mentoring and placement support in campus labs alongside academic studies.');
    expect(body).not.toContain('85.0');
  });
});

test.describe('Home: the first Imagine card is in the reader’s cohort (item L2)', () => {
  test('"A young woman in your cohort invoices her first foreign client from her own laptop."', async ({ page }) => {
    await open(page, HOME);
    expect(await texts(page, '#future .card__text')).toEqual([
      'A young woman in your cohort invoices her first foreign client from her own laptop.',
      'You review monthly reports showing who is earning, not only who completed.',
      'You see employers hire completers whose skills match current employer demand.',
    ]);
  });
});

test.describe('The FAQ eyebrow is "Questions, Answered" (item L9)', () => {
  test('the shared default is used by every FAQ band that does not pass its own eyebrow; no built page prints "Objections, Answered"', async ({ page }) => {
    expect(FAQ_EYEBROW).toBe('Questions, Answered');
    expect(FAQ_EYEBROW).toBe(titleCase(FAQ_EYEBROW));
    for (const route of [HOME, HUB, DP, GOV, FOUND, UNI, EMP, LOCAL, CAMPUS, WORK, NU, SUPERKIDS, YOUTHWIDE]) {
      await open(page, route);
      expect(await texts(page, '#faq .sh .eyebrow, #faqs .sh .eyebrow'), route).toEqual(['Questions, Answered']);
    }
    expect(sitePages().filter((p) => visible(p.html).includes('Objections, Answered')).map((p) => p.route)).toEqual([]);
  });

  test('a page may still pass its own eyebrow: Governance ("Questions") and Our Model ("Partner Questions")', async ({ page }) => {
    await open(page, GOVERNANCE);
    expect(await texts(page, '#faq .sh .eyebrow')).toEqual(['Questions']);
    await open(page, MODEL);
    expect(await texts(page, '#faq .sh .eyebrow')).toEqual(['Partner Questions']);
  });
});

// Item R1 as revised (the owner's investor deck confirms that the Albania 2021–2022 program was with the World Bank Group): Global Reach names the partner in the Albania row, as it does for Kosovo.
// WP55 (owner decisions 2026-10-17/18): the photograph that WP54 kept captioned "CodersTrust trainees, World Bank project, Albania" is the Kosovo Women in Online Work pilot (the word ALBANIA was burned into the file). It is cropped, re-keyed and
// captioned as Kosovo (tests/wp55.spec.ts), so no photograph is captioned or described as Albania any more; Global Reach now lists 16 locations (17 after WP55; WP56 removed Somalia), and the partner cells follow the owner's corrected rows.
test.describe('Albania and Kosovo: no photograph is captioned as Albania, and Global Reach names the World Bank Group as the partner (item R1, revised by WP55)', () => {
  const CAPTION = 'Women in Online Work trainees, Kosovo, 2016–17';

  test('In the Field captions the former "Albania" photograph as Kosovo ("Women in Online Work trainees, Kosovo, 2016–17"), and no figure on YouthWIDE or In the Field says Albania', async ({ page }) => {
    await open(page, FIELD);
    expect(await texts(page, 'figure:has(img[alt*="Women in Online Work banners"]) figcaption')).toEqual([CAPTION]);
    for (const route of [YOUTHWIDE, FIELD]) {
      await open(page, route);
      expect(await texts(page, 'figure:has(img[alt*="Albania"]) figcaption'), route).toEqual([]);
      expect(await page.locator('main').evaluate((el) => el.textContent ?? ''), route).not.toContain('World Bank project, Albania');
    }
  });

  test('Global Reach: the Albania row’s "Partner / Note" cell names the World Bank Group and the program (Kosovo’s pattern), names no amount or investment figure, and exactly the rows with a named partner say so', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const row = (name: string) => page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: name }) });
    const cell = (name: string) => row(name).locator('td[data-label="Partner / Note"]');
    await expect(cell('Albania')).toHaveCount(1);
    expect(compact(await cell('Albania').textContent())).toBe('Partner: World Bank Group (Digital Jobs Albania, with the Government of Albania and EuroPartners Development)');
    expect(compact(await cell('Kosovo').textContent())).toBe('Partner: World Bank Group (Women in Online Work pilot, 2016–2017)');
    expect(compact(await cell('Albania').textContent())).not.toMatch(/[$€£\d]|million|investment|invested|funded|grant|amount/i);
    // WP55: the rows that name a partner are Albania, Benin, Egypt, Kosovo and Uganda (the 2020 partnerships and the two World Bank programs); Bangladesh, Denmark and Iraq carry other notes; every other location keeps the dash.
    // WP56 (owner decision 13): Somaliland is no longer a "Partner:" row; its note says "Hour of Code, and an ICT program at Tima-ade University" (no source says the Hour of Code was held with the university).
    const cells = await page.locator('.wmap__table tbody tr').evaluateAll((rows) =>
      rows.map((r) => ({ name: (r.querySelector('th')?.firstChild?.textContent ?? '').trim(), cell: (r.querySelector('td[data-label="Partner / Note"]')?.textContent ?? '').replace(/\s+/g, ' ').trim() })),
    );
    expect(cells.filter((c) => c.cell.startsWith('Partner')).map((c) => c.name).sort()).toEqual(['Albania', 'Benin', 'Egypt', 'Kosovo', 'Uganda']);
    expect(cells.filter((c) => c.cell !== '—' && !c.cell.startsWith('Partner')).map((c) => c.name).sort()).toEqual(['Bangladesh', 'Denmark', 'Iraq', 'Somaliland']);
    expect(cells, 'the table lists the 16 program locations').toHaveLength(16);
  });

  test('the Albania pin card on the map shows the same note, so the table holds every detail a pin shows (the map’s equivalence contract)', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const card = compact(await page.locator('#wmap-card-albania').evaluate((el) => el.textContent ?? ''));
    expect(card).toContain('Albania');
    expect(card).toContain('Partner: World Bank Group');
    expect(card).not.toMatch(/[$€£]|million|investment|invested/i);
  });
});
