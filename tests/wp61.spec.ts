import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { BIGD_FULL, CONTRACT_FIGURES, EMPATHY, LOCAL_PARTNER_PAINS, NU_NOT_TRAINED, POSITIONING } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP61 behaviors (cycle-33 whole-site reviews: GPT-6.1 Sol G1 to G6 and P1; Kimi K1, K2 and P1; GLM L4, L5, L6 and P1). Retrospective coverage (the owner exempted this project from test-first work);
 * each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp61.spec.ts --project=chromium`):
 *   - G1: Home slide 2 is three sentences (the contract scope; "Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly."; one National University sentence that ends with the qualifier), within the carousel’s height budget;
 *   - G2 (= Kimi K1): Employers and JobReady@Work have no empathy line ("You have roles to fill and teams that need AI skills for their daily work."); the bands open with the origin line / the credentials list;
 *   - G3: JobReady@Work’s "Our Approach" is one sentence, declared whole in scripts/check-facts.mjs, above the four cards;
 *   - G4: Local Partners’ first pain is "Curriculum and Certification Take Time to Build" (the C8 map to its card is intact);
 *   - G5: Independent Evaluation’s lead opens with the result, then says which program the trial evaluated;
 *   - G6: the Her Power case study’s learner card tells Maria Dewan’s story in two plain sentences (the story file is unchanged);
 *   - P1 (GPT-6.1 Sol): the WSDFM case study’s learner card shows Samina’s outcome line alone;
 *   - K2: the About page title is "About | CodersTrust";
 *   - P1 (Kimi): the badge on the 16-countries tiles of Programs and Investors says "Where We Have Worked";
 *   - L4: Outcomes 2026 "How to Read This Survey" names the respondents’ gender as well as their education;
 *   - L5: Governments’ glance runs trial, Her Power, Kosovo, then the contract scope;
 *   - L6: Contact has no partner logo band;
 *   - P1 (GLM): YouthWIDE’s "Where They Work" card is "Local, Remote and Global Work".
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

/** Built pages that are not archived news posts (those keep their original wording), with their HTML. */
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The visible text of a built page (no scripts, styles or screen-reader-only parts), entities decoded. */
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
/** The routes of the built site pages whose visible text contains any of these strings. */
const pagesWith = (...needles: string[]) => sitePages().filter((p) => needles.some((n) => visible(p.html).includes(n))).map((p) => p.route);

/** The measure of tests/hero-slider.spec.ts (its budget is 48 px at 1280 and 390): unused space between the showing slide's content and the controls bar. */
const unusedBelow = (page: Page) =>
  page.evaluate(() => {
    const active = document.querySelector('[data-hs-slide].is-active');
    const controls = document.querySelector('[data-hs-bar]');
    if (!active || !controls) return Number.NaN;
    const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
    const contentBottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom));
    return Math.round(controls.getBoundingClientRect().top - contentBottom);
  });
async function showSlide(page: Page, n: number) {
  await page.locator('[data-hs-dot]').nth(n - 1).click();
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')))).toBe(n - 1);
  await page.waitForTimeout(450);
}

const HOME = '';
const EMPLOYERS = 'partner-with-us/employers/';
const WORK = 'programs/jobready-work/';
const LOCAL = 'partner-with-us/local-partners/';
const EVALUATION = 'impact/independent-evaluation/';
const GOVERNMENTS = 'partner-with-us/governments/';
const PROGRAMS = 'programs/';
const INVESTORS = 'partner-with-us/investors/';
const YOUTHWIDE = 'programs/youthwide/';
const CONTACT = 'contact/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G1 (GPT-6.1 Sol): Home slide 2 is three sentences with the same facts', () => {
  const LEAD =
    'Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly. As National University’s official training partner for digital career skills and credentials, CodersTrust is onboarding 1.5M+ learners, the university’s own learners, not learners trained by CodersTrust.';

  test('the lead reads as above: the owner words "work scoped for" (WP47) and "onboarding 1.5M+ learners" (GV-12) stay, and the lead rests on GV-12, GV-01, GV-11 and SC-04', async ({ page }) => {
    await open(page, HOME);
    const lead = slide(page, 2).locator('.hs__lead');
    const text = compact(await lead.textContent());
    expect(text).toBe(LEAD);
    expect(text.split(/(?<=\.)\s+/)).toHaveLength(3);
    expect(text).not.toMatch(/[()—]/);
    expect(text).toContain('work scoped for 30,000+ people, not a count of completers.');
    expect(text).toContain('onboarding 1.5M+ learners');
    expect(text.endsWith(`the university’s own learners, ${NU_NOT_TRAINED}.`)).toBe(true);
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
    await expect(slide(page, 2).locator('h2')).toHaveText('Six Government Contracts and a National University Partnership');
  });

  test('the two Her Power counts are the register’s (GV-01 and GV-11 with GV-13) and each is on the slide once; the register’s GV-12 text is unchanged', async ({ page }) => {
    expect(CONTRACT_FIGURES).toEqual({ national: '25,125', direct: '2,500' });
    expect(fact('GV-12').text).toBe('Six government contracts with training and curriculum work scoped for 30,000+ people; official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners');
    await open(page, HOME);
    const text = compact(await slide(page, 2).textContent());
    expect((text.match(/25,125/g) ?? []).length).toBe(1);
    expect((text.match(/2,500/g) ?? []).length).toBe(1);
    expect((text.match(/1\.5M\+/g) ?? []).length).toBe(1);
  });

  test('the four sentences it replaced are on no built page, and no page says "curriculum scopes for 30,000+" (the wording the owner replaced in WP47)', () => {
    expect(pagesWith('This includes Her Power’s national program:', 'CodersTrust is also the official training partner of Bangladesh’s National University', 'They are National University’s own learners')).toEqual([]);
    expect(sitePages().filter((p) => /curriculum scopes (?:for|covering) 30,000\+/.test(p.html)).map((p) => p.route)).toEqual([]);
  });

  test('the shorter slide keeps the carousel’s height budget: no slide leaves more than 48 px unused at 1280 and 390, and nothing scrolls sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      for (const n of [1, 2, 3, 4]) {
        await showSlide(page, n);
        expect(await unusedBelow(page), `slide ${n} at ${vp.width}px`).toBeLessThanOrEqual(48);
      }
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G2 (GPT-6.1 Sol; Kimi K1): the Employers and JobReady@Work track-record bands have no empathy line', () => {
  const LINE = 'You have roles to fill and teams that need AI skills for their daily work.';

  test('the line is on no built page and EMPATHY has no employers key (Campus and the NU diploma keep theirs)', () => {
    expect(Object.keys(EMPATHY).sort()).toEqual(['nuPgd', 'universities']);
    expect(pagesWith(LINE, 'teams that need AI skills for their daily work')).toEqual([]);
  });

  test('Employers: the band opens with the origin line, then the method line; the delivered figure and the logo strip stay', async ({ page }) => {
    await open(page, EMPLOYERS);
    await expect(page.locator('#guide p.lead')).toHaveCount(0);
    expect(await page.locator('#guide .pg__copy').evaluate((el) => Array.from(el.children).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()))).toEqual([
      'From a Copenhagen launch to work in 16 countries and territories.', // WP64 rework RW2 (coordinator): the heading says "Since 2014", so the line does not
      'Our TalentLEAP method organizes skills into career paths. How TalentLEAP Works',
    ]);
    await expect(page.locator('#guide .factstat[data-fact="SC-15"]')).toHaveCount(1);
    await expect(page.locator('#guide section.partners')).toHaveCount(1);
  });

  test('JobReady@Work: the band opens with the credentials list (AWS, AIvolve, the ministry contract), then the method line; the figure and the logo strip stay', async ({ page }) => {
    await open(page, WORK);
    await expect(page.locator('#guide p.lead')).toHaveCount(0);
    const kids = await page.locator('#guide .guide__copy').evaluate((el) => Array.from(el.children).map((c) => c.className));
    expect(kids).toEqual(['guide__auth', 'guide__method']);
    expect(await texts(page, '#guide .guide-list li')).toEqual([
      'AWS Authorized Training Partner.',
      'Partnership with AIvolve Leadership Dynamics GmbH (Switzerland) for AI leadership and AI-transformation programs.',
      'Contract scope: ICT, networking and cybersecurity for 120+ professionals, for the Ministry of Power, Energy and Mineral Resources (via Bangladesh Petroleum Institute).',
    ]);
    await expect(page.locator('#guide .factstat[data-fact="SC-15"]')).toHaveCount(1);
    await expect(page.locator('#guide section.partners')).toHaveCount(1);
  });

  test('both bands fit at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const route of [EMPLOYERS, WORK]) {
        await open(page, route);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G3 (GPT-6.1 Sol): JobReady@Work’s "Our Approach" is one sentence above the four cards', () => {
  const STATEMENT = 'JobReady@Work builds training around your roles, from needs assessment to workshops and progress evaluation.';

  test('the statement is the one sentence, in the source and on the page; the gate declares it whole for this page, independently of the source, and no longer lists an employer closing for it', async ({ page }) => {
    expect(POSITIONING.work.text).toBe(STATEMENT);
    expect(POSITIONING.work.facts).toEqual(['IN-10']);
    const gate = readFileSync(new URL('../scripts/check-facts.mjs', import.meta.url), 'utf8');
    const whole = /const POSITION_WHOLE_STATEMENT = \{([\s\S]*?)\n\};/.exec(gate)?.[1] ?? '';
    expect(whole).toContain(`'/programs/jobready-work/': '${STATEMENT}'`);
    const closing = /const POSITION_EMPLOYER_CLOSING = \{([\s\S]*?)\n\};/.exec(gate)?.[1] ?? '';
    expect(closing).not.toContain('/programs/jobready-work/');
    expect(closing).toContain('/partner-with-us/employers/');
    await open(page, WORK);
    await expect(page.locator('#mechanism .pos__label')).toHaveText('Our Approach');
    const text = compact(await page.locator('#mechanism .pos__text').textContent());
    expect(text).toBe(STATEMENT);
    expect(text.split(/(?<=\.)\s+/)).toHaveLength(1);
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('IN-10');
  });

  test('the four cards under it stay, in order, and the statement sits above them', async ({ page }) => {
    await open(page, WORK);
    expect(await texts(page, '#mechanism .model__label')).toEqual(['Scope', 'Deliver', 'Measure', 'Support']);
    expect(await texts(page, '#mechanism .model__title')).toEqual([
      'Needs Assessment, Then a Customized Solution',
      'Custom Curriculum and Interactive Workshops',
      'Progress Evaluation',
      'Post-Training Support and Measurable Outcomes',
    ]);
    const [pos, cards] = await Promise.all([page.locator('#mechanism .pos').boundingBox(), page.locator('#mechanism .model__list').boundingBox()]);
    expect(pos!.y + pos!.height, 'the statement is above the cards').toBeLessThanOrEqual(cards!.y);
  });

  test('the earlier two-sentence statement is on no built page (Employers keeps its own statement)', async ({ page }) => {
    expect(pagesWith('Each program starts with a needs assessment of your roles', 'CodersTrust offers JobReady@Work, training custom-developed for each organization')).toEqual([]);
    await open(page, EMPLOYERS);
    expect(compact(await page.locator('#mechanism .pos__text').textContent())).toBe(POSITIONING.employers.text);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G4 (GPT-6.1 Sol): Local Partners’ first pain says what CodersTrust adds, not a deficit', () => {
  const HEADING = 'Curriculum and Certification Take Time to Build';
  const BODY = 'A ready curriculum, trained facilitators and a route to industry certification take time and specialist support to build.';

  test('the pain is written once in sentence case in the source and set in Title Case on the page; P2 and P3 are unchanged', async ({ page }) => {
    expect(LOCAL_PARTNER_PAINS[0]).toEqual({ id: 'P1', name: 'Curriculum and certification take time to build', text: BODY });
    await open(page, LOCAL);
    const pains = page.locator('#problem .gp__pains li');
    await expect(pains).toHaveCount(3);
    expect(await texts(page, '#problem .gp__q')).toEqual([HEADING, 'Missing Work-Entry Connections', 'Reporting and Accountability Demands']);
    expect(await texts(page, '#problem .gp__a')).toEqual([
      BODY,
      'Training that stops at the classroom door leaves completers without links to employers, clients and platforms.',
      'Funders ask who is earning, but training is often measured by enrollment, not earnings.',
    ]);
    expect(await pains.evaluateAll((els) => els.map((e) => e.getAttribute('data-pain')))).toEqual(['P1', 'P2', 'P3']);
  });

  test('"What Your Community Gets" still has one card for each pain, in order, and the first card keeps its facts', async ({ page }) => {
    await open(page, LOCAL);
    expect(await page.locator('#features li[data-relieves]').evaluateAll((els) => els.map((e) => e.getAttribute('data-relieves')))).toEqual(['P1', 'P2', 'P3']);
    expect(await page.locator('#features li[data-relieves="P1"]').getAttribute('data-fact')).toBe('PD-06 PD-02');
    expect(compact(await page.locator('#features li[data-relieves="P1"] .card__title').textContent())).toBe('Certified Facilitators and a Local Curriculum');
  });

  test('the earlier heading and body are on no built page', () => {
    expect(pagesWith('Missing Curriculum, Trainers and Certification', 'a ready curriculum, trained facilitators and a route to industry certification')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G5 (GPT-6.1 Sol): Independent Evaluation’s lead opens with the result', () => {
  const LEAD =
    'In a randomized trial by the BRAC Institute of Governance and Development (BIGD), women offered a place were 10.3 percentage points more likely to be employed than the control group. The trial evaluated CodersTrust’s 200-hour predecessor WSDFM program for women in Dhaka, not today’s 100-hour tracks.';

  test('the lead reads as above (46 words, inside the 40 to 60 of the direct answer), names the evaluator in full once, and the register still backs its figures', async ({ page }) => {
    expect(BIGD_FULL).toBe('the BRAC Institute of Governance and Development (BIGD)');
    expect(fact('RC-01').text).toContain('10.3 percentage points');
    expect(fact('RC-07').text).toContain('200 hours');
    expect(fact('PD-01').stat?.value).toBe('100');
    await open(page, EVALUATION);
    const lead = compact(await page.locator('main .lf-head .lead').textContent());
    expect(lead).toBe(LEAD);
    expect(lead.split(/\s+/)).toHaveLength(46);
    expect(lead.split(/(?<=\.)\s+/)).toHaveLength(2);
    expect(compact(await page.locator('main').textContent()).split('BRAC Institute of Governance and Development').length - 1).toBe(1);
    await expect(page.locator('[data-fact~="RC-01"]').first()).toBeAttached();
    await expect(page.locator('[data-fact~="RC-07"]').first()).toBeAttached();
  });

  test('the earlier lead is on no built page', () => {
    expect(pagesWith('a 200-hour program for women in Dhaka, were 10.3', 'It is evidence about that predecessor program, not a measurement of today’s 100-hour tracks')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G6 (GPT-6.1 Sol): the Her Power case study tells Maria Dewan’s story in two plain sentences', () => {
  const EXCERPT =
    'Maria Dewan joined Her Power as a third-year Biology student. She studied Graphic Design, won logo-design work on Freelancer.com and built a portfolio with more clients and higher-paying projects.';

  test('the card’s narrative is the two sentences under its unchanged outcome line, with her name and program', async ({ page }) => {
    await open(page, 'impact/case-studies/her-power/');
    const card = page.locator('article.ls');
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.ls__excerpt').textContent())).toBe(EXCERPT);
    expect(compact(await card.locator('.ls__outcome').textContent())).toBe('Won a company logo design on Freelancer.com, then built a freelance portfolio.');
    expect(await texts(page, 'article.ls .ls__name b, article.ls .ls__name span')).toEqual(['Maria Dewan', 'Her Power']);
    expect(await card.getAttribute('data-fact')).toBe('ST-06');
  });

  test('every clause rests on the story file, which is unchanged (Success Stories still builds its steps from it); the earlier narrative is on no built page', async ({ page }) => {
    const story = readFileSync(new URL('../src/content/stories/maria-dewan.md', import.meta.url), 'utf8').replace(/\s+/g, ' ');
    for (const phrase of [
      'Maria Dewan was a third-year Biology student when she first came across Her Power',
      'She enrolled in the Graphic Design course',
      'winning a company logo design on Freelancer.com',
      'with a growing portfolio, gradually winning more clients and higher-paying projects',
      'through her dedication and continuous enthusiasm for learning, was quickly initiated into the freelance marketplace',
    ]) {
      expect(story, phrase).toContain(phrase);
    }
    expect(pagesWith('continuous enthusiasm for learning', 'quickly initiated into the freelance marketplace', 'thus began her journey of earning')).toEqual([]);
    await open(page, 'impact/stories/');
    expect(compact(await page.locator('#steps').innerText())).toContain('She enrolled in the Graphic Design course and showed her skills by winning a company logo design on Freelancer.com.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('P1 (GPT-6.1 Sol): the WSDFM case study’s learner card shows Samina’s outcome line alone', () => {
  test('the card is her outcome line, her name and program, and the individual-story caveat; the sentence that repeated the outcome is gone from the page', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    const card = page.locator('article.ls');
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.ls__outcome').textContent())).toBe('Completed 90+ projects as a freelance graphic designer on Fiverr.');
    await expect(card.locator('.ls__excerpt')).toHaveCount(0);
    expect(await texts(page, 'article.ls .ls__name b, article.ls .ls__name span')).toEqual(['Samina Tasneem Chowdhury', 'WSDFM, first batch']);
    expect(compact(await card.locator('.ls__caveat').textContent())).toBe('Individual story; not typical or promised.');
    expect(await card.getAttribute('data-fact')).toBe('ST-03');
    expect(compact(await page.locator('main').textContent())).not.toContain('She has completed 90+ projects on Fiverr so far.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K2 (Kimi): the About page title is "About | CodersTrust"', () => {
  test('the page, social and structured titles agree, no other page has the title, and every page title still ends " | CodersTrust" within 60 characters', async ({ page }) => {
    await open(page, 'about/');
    expect(await page.title()).toBe('About | CodersTrust');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'About | CodersTrust');
    await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', 'About | CodersTrust');
    // the hero keeps its eyebrow
    expect(compact(await page.locator('main').first().textContent())).toContain('About Us');
    const titles = listPages().map((p) => ({ route: p.route, title: /<title>([^<]*)<\/title>/.exec(readFileSync(p.file, 'utf8'))?.[1] ?? '' }));
    expect(titles.filter((t) => t.title === 'About | CodersTrust').map((t) => t.route)).toEqual(['/about/']);
    expect(titles.filter((t) => t.title === 'About Us | CodersTrust')).toEqual([]);
    const odd = titles.filter((t) => t.route !== '/' && (!t.title.endsWith(' | CodersTrust') || t.title.length > 60));
    expect(odd).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('P1 (Kimi): the badge on the 16-countries tiles says "Where We Have Worked"', () => {
  test('Programs: the 130,000+ keeps "Delivered", the 16 carries the badge, level with it, with no status', async ({ page }) => {
    await open(page, PROGRAMS);
    const tiles = page.locator('#reach .hub__reach > div');
    await expect(tiles).toHaveCount(2);
    await expect(tiles.nth(0).locator('.status-tag')).toHaveText('Delivered');
    await expect(tiles.nth(1).locator('.badge')).toHaveText('Where We Have Worked');
    await expect(tiles.nth(1).locator('[data-status]')).toHaveCount(0);
    const tops = await page.locator('#reach .stat__value').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops[0], 'the 130,000+ and the 16 start on the same line').toBe(tops[1]);
  });

  test('Investors: the learners and the enrollments keep "Delivered", the 16 carries the badge and no status; the three figures start on one line', async ({ page }) => {
    await open(page, INVESTORS);
    expect(await texts(page, '#guide .ig__tile .status-tag')).toEqual(['Delivered', 'Delivered']);
    const sc03 = page.locator('#guide .ig__tile[data-fact="SC-03"]');
    await expect(sc03.locator('.badge')).toHaveText('Where We Have Worked');
    await expect(sc03.locator('[data-status]')).toHaveCount(0);
    const tops = await page.locator('#guide .ig__tile .stat__value').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });

  test('no built page carries a "Since 2014" badge; the badge fits its tile and the page at 1280, 768 and 390; Impact’s reach tile keeps its "Delivered" tag (it has no period badge)', async ({ page }) => {
    expect(sitePages().filter((p) => /class="badge[^"]*"[^>]*>\s*Since 2014\s*</.test(p.html)).map((p) => p.route)).toEqual([]);
    for (const vp of [DESKTOP, { width: 768, height: 900 }, MOBILE]) {
      await page.setViewportSize(vp);
      for (const route of [PROGRAMS, INVESTORS]) {
        await open(page, route);
        const fits = await page.locator('.badge', { hasText: 'Where We Have Worked' }).evaluate((el) => {
          const tile = el.closest('.hub__reach > div, .ig__tile')!.getBoundingClientRect();
          const b = el.getBoundingClientRect();
          return b.right <= tile.right + 0.5 && b.left >= tile.left - 0.5 && Math.round(b.height) === 24;
        });
        expect(fits, `${route} at ${vp.width}px`).toBe(true);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    }
    await open(page, 'impact/');
    const tile = page.locator('#glance a[data-fact~="SC-16"]');
    await expect(tile.locator('.status-tag')).toHaveText('Delivered');
    await expect(tile.locator('.badge')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L4 (GLM): Outcomes 2026 "How to Read This Survey" names the respondents’ gender as well as their education', () => {
  test('the line reads the two shares from OC-09 and says the group is mostly graduate and majority-male', async ({ page }) => {
    expect(fact('OC-09').stat?.value).toBe('84.6%');
    expect(fact('OC-09').text).toContain('19.9% women');
    await open(page, 'impact/outcomes-2026/');
    const item = page.locator('#methodology li', { hasText: 'Who the respondents are.' });
    await expect(item).toHaveCount(1);
    expect(compact(await item.evaluate((el) => el.textContent))).toBe(
      'Who the respondents are. 84.6% of respondents hold a bachelor’s degree or higher and 19.9% are women, so results describe a mostly graduate, majority-male group.',
    );
    expect(await item.getAttribute('data-fact')).toBe('OC-09');
    expect(pagesWith('so results describe a mostly graduate group')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L5 (GLM): Governments’ glance runs trial, Her Power, Kosovo, then the contract scope', () => {
  const ORDER = ['RC-02', 'PR-05', 'PR-02', 'GV-12'];

  test('the four tiles are in that order, each tagged for what it is, with the contract scope last and no "More Results" heading', async ({ page }) => {
    await open(page, GOVERNMENTS);
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(ORDER);
    expect(await page.locator('#glance .pg__lead a [data-evidence]').evaluateAll((els) => els.map((e) => e.getAttribute('data-evidence')))).toEqual(['Randomized Trial', 'Program Record', 'Program Record', 'Contract Scope']);
    expect(await texts(page, '#glance .pg__value')).toEqual(['+10.3 percentage points', '372 of 800', '102 of 150', '30,000+']);
    await expect(page.locator('#glance h3')).toHaveCount(0);
    await expect(page.locator('#glance h2')).toHaveText('Results and Contract Scope at a Glance');
    // the contract-scope tile keeps its label, note and facts
    const tile = page.locator('#glance a[data-fact~="GV-12"]');
    await expect(tile.locator('.pg__desc')).toHaveText('People in the Scopes of Six Government Contracts');
    expect(compact(await tile.locator('.pg__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly).');
    expect((await tile.getAttribute('data-fact'))!.split(' ')).toEqual(expect.arrayContaining(['GV-12', 'SC-06', 'GV-01', 'GV-11']));
  });

  test('the visual order follows: one row left to right at 1280, two by two at 900, one column at 390', async ({ page }) => {
    const boxes = () => page.locator('#glance .pg__lead > li').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top) }; }));
    await open(page, GOVERNMENTS);
    await page.setViewportSize(DESKTOP);
    let b = await boxes();
    expect(new Set(b.map((t) => t.y)).size, 'one row at 1280').toBe(1);
    expect(b.map((t) => t.x)).toEqual([...b.map((t) => t.x)].sort((p, q) => p - q));
    await page.setViewportSize({ width: 900, height: 900 });
    b = await boxes();
    expect(b[0].y).toBe(b[1].y);
    expect(b[2].y).toBe(b[3].y);
    expect(b[2].y).toBeGreaterThan(b[0].y);
    expect(b[0].x).toBeLessThan(b[1].x);
    await page.setViewportSize(MOBILE);
    b = await boxes();
    expect(b.map((t) => t.y)).toEqual([...b.map((t) => t.y)].sort((p, q) => p - q));
    expect(new Set(b.map((t) => t.y)).size, 'four rows at 390').toBe(4);
    expect(await noOverflow(page)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L6 (GLM, with Kimi): Contact no longer closes on a partner logo wall', () => {
  test('the page has no logo band; it ends on "What Happens After Your Inquiry", its steps and its first-cohort lines', async ({ page }) => {
    await open(page, CONTACT);
    await expect(page.locator('section.partners')).toHaveCount(0);
    expect(compact(await page.locator('main').textContent())).not.toContain('Organizations we have worked with');
    expect(await page.locator('main section.band').evaluateAll((els) => els.map((e) => e.id))).toEqual(['routes', 'offices', 'next']);
    await expect(page.locator('#next h2')).toHaveText('What Happens After Your Inquiry');
    await expect(page.locator('#next .steps__item')).toHaveCount(3);
    await expect(page.locator('#next .ct-c14 li')).toHaveCount(2);
    expect(pagesWith('Organizations we have worked with')).not.toContain('/contact/');
  });

  test('the last band has no extra bottom margin from the removed strip, and the page fits at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, CONTACT);
      expect(await page.locator('#next .ct-next').evaluate((el) => getComputedStyle(el).marginBottom), `${vp.width}px`).toBe('0px');
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('P1 (GLM): YouthWIDE’s "Where They Work" card is "Local, Remote and Global Work"', () => {
  // WP62 (cycle-34 review, Gemini): the card’s text says how long outcomes are tracked, "... outcome tracking for 12 months after each course." (tests/wp62.spec.ts)
  test('the card has the title Home, Development Partners and the shared mechanism band use; its text says "for 12 months" (WP62); the earlier title is on no built page', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const card = page.locator('#mechanism li', { has: page.locator('.model__label', { hasText: 'Where They Work' }) });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.model__title')).toHaveText('Local, Remote and Global Work');
    expect(compact(await card.locator('.model__text').textContent())).toBe('Placement support and outcome tracking for 12 months after each course.');
    expect(pagesWith('Local, Remote, Overseas and Freelance Work')).toEqual([]);
  });
});
