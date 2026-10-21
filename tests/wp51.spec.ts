import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { C14, EMPATHY, ORIGIN_SHORT, POSITIONING, originShortUnder } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP51 behaviors (the verified cycle-26 whole-site reviews, items 1-28): the JobReady@Campus problem cards; the Universities pain heading; Home slides 2, 4 and 5 (the government heading, Her Power's base, the speed heading), the WSDFM card
 * of "Proof in Practice", the Outcome Tracking row, the positioning statement, the Compare heading, the first Imagine card and the Learner Journeys lead; the pricing lines on YouthWIDE and JobReady@Campus; About's "On This Page"
 * list; Samina's excerpt on Local Partners; the TalentLEAP example's "membership in"; the closing partner lines of Universities (gone) and Foundations (moved into its Track Record band); the shared origin line on Development Partners
 * and Investors; Governments' empathy line and tile note; "the gig-work marketplace" in prose; the Outcomes tile heading; the hub's hero button; the Programs eyebrow; the Development Partners FAQ question; the Foundations route table's
 * second column. Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp51.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').innerText());
/** Everything in main, including answers inside closed FAQ accordions (innerText leaves those out). */
const everything = async (page: Page) => compact(await page.locator('main').evaluate((el) => el.textContent ?? ''));
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
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** Every FAQPage question and answer text in the page's JSON-LD. */
async function faqJsonLd(page: Page) {
  const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: { name: string; text: string }[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      const o = n as Record<string, unknown>;
      if (o['@type'] === 'FAQPage') for (const q of (o.mainEntity as { name: string; acceptedAnswer?: { text: string } }[]) ?? []) out.push({ name: q.name, text: q.acceptedAnswer?.text ?? '' });
      Object.values(o).forEach(walk);
    }
  };
  blobs.forEach((b) => walk(JSON.parse(b)));
  return out;
}
/** The text and the logo alt text of everything in main that comes before the element with this id (what a reader has been told by the time they reach it). */
const namedAbove = (page: Page, id: string) =>
  page.evaluate((endId) => {
    const end = document.getElementById(endId)!;
    const parts: string[] = [];
    const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (end.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING) break;
      if (n.nodeType === Node.TEXT_NODE) parts.push(n.textContent ?? '');
      else if ((n as Element).tagName === 'IMG') parts.push((n as Element).getAttribute('alt') ?? '');
    }
    return parts.join(' ').replace(/\s+/g, ' ');
  }, id);

const CAMPUS = 'programs/jobready-campus/';
const YOUTHWIDE = 'programs/youthwide/';
const DP = 'partner-with-us/development-partners/';
const FOUND = 'partner-with-us/foundations/';
const GOV = 'partner-with-us/governments/';
const UNI = 'partner-with-us/universities/';
const LOCAL = 'partner-with-us/local-partners/';
const EMP = 'partner-with-us/employers/';
const INVEST = 'partner-with-us/investors/';
const FIRST_ACTION = 'Your first step: a discovery session. In your inquiry, include two suitable times for a discovery conversation.';
const NOTE = 'These are program sizes, not commitments: in the discovery session you choose a starting scope for your goals, country and delivery capacity.';
const WSDFM_TITLE = 'Women’s Skill Development for Freelancing Marketplace (WSDFM)';

test.describe('JobReady@Campus: the problem cards say what the program does for the students (item 1)', () => {
  const TITLES = ['Make Students’ Skills Visible', 'Build Placement Evidence'];
  const TEXTS = ['Prepare students for industry certification alongside the degree.', 'Track where completers start earning, with a baseline and follow-up surveys.'];

  test('the two cards are Title Case, read as above, and name the facts they rest on', async ({ page }) => {
    await open(page, CAMPUS);
    expect(await texts(page, '#problem .card__title')).toEqual(TITLES);
    expect(await texts(page, '#problem .card__text')).toEqual(TEXTS);
    for (const t of TITLES) expect(t, t).toBe(titleCase(t));
    expect(await page.locator('#problem article.card').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['IN-09', 'PD-08 PD-09']);
  });

  test('the wording uses the register’s own terms and adds no claim: IN-09 (preparation for industry-recognized certifications, alongside academic studies), PD-09 (a baseline and follow-up surveys), PD-08 (placements and first earnings)', () => {
    expect(fact('IN-09').text).toContain('industry-oriented skills training in parallel with academic studies');
    expect(fact('IN-09').text).toContain('preparation for industry-recognized certifications');
    expect(fact('PD-09').text).toContain('a baseline at enrollment and follow-up surveys at 3, 6 and 12 months');
    expect(fact('PD-08').text).toContain('placements and first earnings');
    expect(fact('PD-08').text).toContain('follow-up survey results (3/6/12 months)');
  });

  test('the earlier cards are on no built page', () => {
    const gone = ['Employers Cannot See the Skills', 'Employers cannot see the skills your students have.', 'No Placement Results to Publish', 'Institutions are asked for placement results they cannot yet show.'];
    expect(sitePages().flatMap((p) => gone.filter((g) => visible(p.html).includes(g)).map((g) => `${p.route}: ${g}`))).toEqual([]);
  });
});

test.describe('Universities: the institution’s pain is headed as the goal (item 2)', () => {
  test('"Placement Results Are Hard to Publish" keeps the line under it; the earlier heading is on no built page', async ({ page }) => {
    await open(page, UNI);
    expect(await texts(page, '#problem .gp__q')).toEqual(['Degree Holders Struggle to Find Work', 'Placement Results Are Hard to Publish']);
    expect(await texts(page, '#problem .gp__a')).toEqual(['A degree alone does not guarantee a job offer.', 'Your institution needs placement data it can report to a board or ministry.']);
    expect('Placement Results Are Hard to Publish').toBe(titleCase('Placement Results Are Hard to Publish'));
    expect(sitePages().filter((p) => visible(p.html).includes('Institutions Lack Placement Results They Can Publish')).map((p) => p.route)).toEqual([]);
  });
});

// WP53 (owner decision 2026-10-16): the speed slide (slide 5, headed HEADING) is gone; its subgroup is named in the survey slide's body line (slide 3), in the register's term and with the cumulative "by ... after" wording
// WP54 (cycle-28 reviews, Claude S23 and GLM L1): the body line names the subgroup in the words of OC-05's text ("the 172 surveyed completers who first earned during or after training") instead of the term (tests/wp54.spec.ts)
test.describe('Home: the survey slide names its subgroup (item 3; WP53: the speed slide it was named on is gone)', () => {
  const HEADING = 'Most Surveyed New Earners Were Earning by Six Months After the Course';
  const survey = (page: Page) => page.locator('[data-hs-slide]').nth(2);

  test('the body line names the subgroup, keeps the cumulative "by ... after" wording, tied to OC-05; the former speed heading is on no slide', async ({ page }) => {
    expect(fact('OC-05').stat?.label).toContain('surveyed new earners');
    expect(fact('OC-05').text).toContain('Among the 172 surveyed completers who first earned during or after training');
    await open(page, '');
    const line = compact(await survey(page).locator('.hs__lead').textContent());
    expect(line).toContain('the 172 surveyed completers who first earned during or after training');
    expect(line).not.toContain('surveyed new earners');
    expect(line).toContain('had started earning by six months after finishing the course');
    expect(line).not.toMatch(/within|of finishing|of the course ending/i);
    expect(await survey(page).locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
    await expect(survey(page)).toHaveAttribute('aria-label', '3 of 4: Surveyed Completers Report Higher Income');
    expect(compact(await page.locator('#results').textContent())).not.toContain(HEADING);
  });

  test('the slide fits the carousel at 1280 and 390 (the slider’s unused-space budget is held by tests/hero-slider.spec.ts), and the page does not scroll sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      expect(await survey(page).evaluate((e) => Math.round((e as HTMLElement).scrollHeight)), `${vp.width}px: the slide fits its track`).toBeLessThanOrEqual(track + 1);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// WP63 (cycle-35 review, Gemini M4): the WSDFM card's context line is its program records (it was the case study's delivery scope, "ICT skills for freelancing marketplaces and local jobs, with one-to-one mentoring."), as the Kosovo card's is
test.describe('Home: the WSDFM card of "Proof in Practice" shows a context line in the figure’s place, its program records (item 4; WP63)', () => {
  const RECORDS = 'Program records: 711 of 1,000 women in work (71%).';

  test('all three cards show a context line in the figure’s place and the band names the WSDFM and Kosovo facts (PR-01, PR-02 and PR-02b); the WSDFM line is its program records', async ({ page }) => {
    await open(page, '');
    const cards = page.locator('#cases article');
    await expect(cards).toHaveCount(3);
    await expect(cards.locator('.case__stat, .case__value, .case__label')).toHaveCount(0);
    // WP57 (cycle-29 review, Gemini GM4): the Kosovo card's context line is its program records
    expect(await texts(page, '#cases .case__context')).toEqual([RECORDS, 'Program records, 2016–2017: 102 of 150 women in work.', 'Curriculum, trainer training and direct delivery for women’s digital skills.']);
    expect(compact(await cards.nth(0).locator('.card__title').textContent())).toBe(WSDFM_TITLE);
    // WP55 (owner decision 2026-10-17, "Show both"): the Kosovo card adds one World Bank line (PR-02b). WP57 (cycle-29 review, Gemini GM4): and its own program-records line (PR-02); the band's wrapper names both. WP63 (cycle-35 review, Gemini M4): and the WSDFM card's program records (PR-01); Her Power's fact (PR-05) is not named.
    expect(await page.locator('#cases [data-fact]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['PR-01 PR-02 TL-04 PR-02b', 'PR-01', 'PR-02 TL-04', 'PR-02b']);
  });

  test('the figure is stated on Home in slide 4, with its qualifier, and in the WSDFM card as program records (WP63; it was slide 4’s alone)', async ({ page }) => {
    await open(page, '');
    const text = await everything(page);
    expect(count(text, '711 of 1,000')).toBe(2);
    await expect(page.locator('[data-hs-slide]').nth(3)).toContainText('WSDFM: 711 of 1,000 in work (71%); a separate trial studied 833 women.');
  });

  test('Development Partners, Foundations, Local Partners and YouthWIDE list their own cards: the WSDFM card keeps the figure and its caption there', async ({ page }) => {
    for (const route of [DP, FOUND, LOCAL, YOUTHWIDE]) {
      await open(page, route);
      const card = page.locator('#cases article', { hasText: WSDFM_TITLE });
      await expect(card, route).toHaveCount(1);
      await expect(card.locator('.case__value'), route).toHaveText('711 of 1,000');
      expect(compact(await card.locator('.case__label').textContent()), route).toBe('WSDFM program records (not trial data; the trial studied 833 women): 71% in work');
      await expect(card.locator('.case__context'), route).toHaveCount(0);
    }
  });
});

test.describe('The pricing lines no longer describe the website itself (item 5)', () => {
  test('YouthWIDE: "We share an indicative budget in the discovery session."', async ({ page }) => {
    await open(page, YOUTHWIDE);
    expect(compact(await page.locator('#offer .sh__lead').textContent())).toBe('Each phase is planned with the agency or funder on the results of the one before. We share an indicative budget in the discovery session.');
  });

  test('JobReady@Campus: the lead is the program-sizes note alone; the budget sentence under the options stays, tied to PD-02', async ({ page }) => {
    await open(page, CAMPUS);
    expect(compact(await page.locator('#offer .sh__lead').textContent())).toBe(NOTE);
    const pricing = page.locator('#offer p.note--key');
    await expect(pricing).toHaveCount(1);
    expect(compact(await pricing.textContent())).toBe('Pricing is set per program, and we share an indicative budget in the discovery session.');
    expect(await pricing.getAttribute('data-fact')).toBe('PD-02');
  });

  test('"Program options are shown without prices" is on no built page', () => {
    expect(sitePages().filter((p) => /shown without prices/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });
});

test.describe('About: "On This Page" lists all eight bands (item 6)', () => {
  const LINKS: [string, string][] = [
    ['Why We Exist', 'mission'],
    ['Where We Are Today', 'glance'],
    ['An Independent Randomized Trial', 'proof'],
    ['From a Copenhagen Launch to National Programs', 'story'],
    ['The People Who Started It', 'founders'],
    ['Four Principles Behind Every Program', 'how-we-work'],
    ['Industry Recognition', 'recognition'],
    ['Start a Conversation', 'about-cta'],
  ];

  test('the two added entries use the existing ids (#founders, #recognition), sit in page order, and are the H2s they open', async ({ page }) => {
    await open(page, 'about/');
    const links = await page.locator('nav[aria-label="On this page"] a').evaluateAll((els) => els.map((a) => ({ label: (a.textContent ?? '').replace(/\s+/g, ' ').trim(), id: (a.getAttribute('href') ?? '').replace(/^.*#/, '') })));
    expect(links.map((l) => [l.label, l.id])).toEqual(LINKS);
    for (const [label, id] of LINKS) {
      expect(label, label).toBe(titleCase(label));
      await expect(page.locator(`#${id}`), `#${id} exists once`).toHaveCount(1);
      if (id !== 'about-cta') expect(compact(await page.locator(`#${id} h2`).first().textContent()), `the H2 under #${id}`).toBe(label);
    }
    await page.locator('nav[aria-label="On this page"]').getByRole('link', { name: 'Industry Recognition' }).click();
    await expect(page).toHaveURL(/#recognition$/);
    await expect(page.locator('#rec-h')).toBeInViewport();
  });

  test('the list wraps without sideways scroll on a phone and a desktop', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, 'about/');
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Local Partners: Samina’s excerpt says what she did (item 7)', () => {
  const SENTENCE = 'During the training period, she began offering her services as a graphic designer on the freelance marketplace Fiverr.';

  test('the excerpt is a verbatim sentence of her story file, not generic praise', async ({ page }) => {
    expect(readFileSync(resolve('src/content/stories/samina-tasneem-chowdhury.md'), 'utf8')).toContain(SENTENCE);
    await open(page, LOCAL);
    const voice = compact(await page.locator('#learner-voice').textContent());
    expect(voice).toContain(SENTENCE);
    expect(voice).not.toContain('inspiration to the young people');
  });
});

test.describe('TalentLEAP: "membership in" (item 8)', () => {
  test('the career-path example, its structured data and the register (IN-08) all say "membership in a digital-marketing expertise community"', async ({ page }) => {
    expect(fact('IN-08').text).toContain('3 months of membership in a digital-marketing expertise community');
    await open(page, 'our-model/talentleap/');
    expect(await texts(page, '.lv__bullets li')).toEqual([
      'Three months of mentorship by an experienced professional',
      'Three months of membership in a digital-marketing expertise community',
      'Bonus mini-courses in essential business and leadership skills',
    ]);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('three months of membership in a digital-marketing expertise community');
  });

  test('"membership of" is on no built page', () => {
    expect(sitePages().filter((p) => /membership of a digital-marketing/.test(p.html)).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Closing partner lines (items 9 and 17)', () => {
  test('Universities: the three universities are named above the closing strip, in visible text or logo alt text, so the strip holds the first-action line alone', async ({ page }) => {
    await open(page, UNI);
    const above = await namedAbove(page, 'reinforce');
    for (const name of ['National University', 'University for Peace', 'UPEACE', 'City College of New York', 'CCNY']) expect(above, name).toContain(name);
    expect(await texts(page, '#reinforce li')).toEqual([FIRST_ACTION]);
    expect(await everything(page)).not.toContain('University partners include National University, the University for Peace');
  });

  test('Foundations: the line moved, unchanged, into the Track Record band directly after the BIGD line (not deleted); the closing strip holds the first-action line alone', async ({ page }) => {
    const LINE = 'Organizations that have worked with CodersTrust include the Rockefeller Foundation, DANIDA and Porticus.';
    expect(C14.validateFor.foundations.text).toBe(LINE);
    await open(page, FOUND);
    const items = page.locator('#guide .pg__list li');
    // WP66 (owner request 2026-10-20): a third line closes the list, the signed-agreement sentence for development partners and NGOs (SC-11c); the BIGD line and the moved line keep their places (tests/wp66.spec.ts)
    await expect(items).toHaveCount(3);
    expect(compact(await items.nth(0).textContent())).toContain('separately evaluated the predecessor WSDFM program');
    expect(compact(await items.nth(1).textContent())).toBe(LINE);
    expect(await items.nth(1).getAttribute('data-fact')).toBe('PA-01');
    expect(compact(await items.nth(2).textContent())).toBe('CodersTrust has signed MOUs, agreements or contracts with 13 development partners and NGOs.');
    expect(await items.nth(2).getAttribute('data-fact')).toBe('SC-11c');
    expect(await texts(page, '#reinforce li')).toEqual([FIRST_ACTION]);
    expect(count(await everything(page), LINE), 'said once on the page').toBe(1);
    // the band is the one headed "We’ve Built This Path Since 2014"
    await expect(page.locator('#guide h2')).toHaveText('We’ve Built This Path Since 2014');
  });

  // WP54 (cycle-28 review, Kimi K2): Employers' closing line is gone as well (its strip names the same five organizations); the closing band holds the first-action line alone (tests/wp50.spec.ts and tests/wp54.spec.ts)
  test('Employers: the closing line ("Private-sector partners include ...") is gone with the other pages’; the closing band holds the first-action line alone', async ({ page }) => {
    await open(page, EMP);
    expect(compact(await page.locator('#reinforce').textContent())).not.toContain('Private-sector partners include');
    expect(await texts(page, '#reinforce li')).toEqual(['Your first step, for team training or hiring: a discovery session. In your inquiry, include two suitable times.']);
  });

  test('the Foundations Track Record band and the Development Partners band do not scroll sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const route of [FOUND, DP]) {
        await open(page, route);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    }
  });
});

test.describe('Home: the Outcome Tracking row, the positioning statement and the Compare heading (items 10, 11 and 12)', () => {
  // WP63 (cycle-35 review, Grok R1): "... for educated, unemployed and underemployed youth, ..." (the group ID-01 names)
  const CLOSING = 'CodersTrust connects training, mentoring and placement support for educated, unemployed and underemployed youth, with monthly reports on progress toward paid work, as agreed in the program scope.';

  test('the Outcome Tracking row carries the scope qualifier and puts the reports first', async ({ page }) => {
    await open(page, '');
    const row = page.locator('#compare tbody tr', { has: page.locator('th', { hasText: 'Outcome Tracking' }) });
    await expect(row).toHaveCount(1);
    expect(compact(await row.locator('td').first().textContent())).toBe('Planned for every cohort, as agreed in the program scope: monthly reports and follow-up surveys at 3, 6 and 12 months');
  });

  test('the Compare heading names the one approach the table compares with', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#compare h2')).toHaveText('How CodersTrust Compares with Self-Paced Courses');
    expect('How CodersTrust Compares with Self-Paced Courses').toBe(titleCase('How CodersTrust Compares with Self-Paced Courses'));
    expect(await texts(page, '#compare thead th')).toEqual(['Approach', 'CodersTrust Supported Cohort', 'Self-Paced Course Platforms']);
    expect(sitePages().filter((p) => visible(p.html).includes('How the Approaches Compare')).map((p) => p.route)).toEqual([]);
  });

  // WP60 (cycle-32 review, Gemini GM7): the statement is one sentence (CLOSING above), declared whole for Home in the gate (POSITION_WHOLE_STATEMENT['/']); it was an audience sentence followed by that closing sentence
  test('the positioning statement’s reports are scoped, and the gate declares the same sentence independently', async ({ page }) => {
    expect(POSITIONING.home.text).toBe(CLOSING);
    expect(readFileSync(resolve('scripts/check-facts.mjs'), 'utf8')).toContain(`'/': '${CLOSING}'`);
    await open(page, '');
    expect(compact(await page.locator('#mechanism .pos__text').textContent())).toBe(CLOSING);
  });
});

test.describe('Home: the first Imagine card and the Learner Journeys lead (items 16 and 22)', () => {
  // WP54 (cycle-28 review, GLM L2): the scene is "A young woman in your cohort invoices her first foreign client from her own laptop." (the other two cards speak to the reader; tests/wp54.spec.ts)
  test('the first Imagine card is a scene, "A young woman in your cohort invoices her first foreign client from her own laptop."', async ({ page }) => {
    await open(page, '');
    expect(await texts(page, '#future .card__text')).toEqual([
      'A young woman in your cohort invoices her first foreign client from her own laptop.',
      'You review monthly reports showing who is earning, not only who completed.',
      'You see employers hire completers whose skills match current employer demand.',
    ]);
    expect(await mainText(page)).not.toContain('You hear from a young woman');
  });

  test('the Learner Journeys lead names Proof in Practice, the band it counts from, which comes before it', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#journeys .sh__lead').textContent())).toBe('One learner from each program in Proof in Practice: individual stories, not typical or promised outcomes.');
    await expect(page.locator('#cases h2')).toHaveText('Proof in Practice');
    const order = await page.evaluate(() => Boolean(document.getElementById('cases')!.compareDocumentPosition(document.getElementById('journeys')!) & Node.DOCUMENT_POSITION_FOLLOWING));
    expect(order).toBe(true);
    expect(sitePages().filter((p) => visible(p.html).includes('each program above')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('The shared origin line on Development Partners and Investors (items 13, 20 and 27)', () => {
  test('Development Partners, Governments and Foundations print the same line, from the same source (ORIGIN_SHORT)', async ({ page }) => {
    expect(ORIGIN_SHORT.text).toBe('Since 2014, from a Copenhagen launch to work in 16 countries and territories.');
    for (const route of [DP, GOV, FOUND]) {
      await open(page, route);
      const line = page.locator('#guide .pg__origin');
      await expect(line, route).toHaveCount(1);
      // WP64 rework RW2 (coordinator): the bands' heading says "Since 2014", so the line drops that lead-in (ORIGIN_SHORT.text above keeps it)
      expect(compact(await line.textContent()), route).toBe(originShortUnder('We’ve Built This Path Since 2014').text);
      expect(await line.getAttribute('data-fact'), route).toBe('ID-02 SC-03');
    }
  });

  test('Development Partners: the band opens with the origin line and then the TalentLEAP line, and no longer prints the launch alone', async ({ page }) => {
    await open(page, DP);
    expect(compact(await page.locator('#guide').textContent())).not.toContain('Launched in Copenhagen in 2014.');
    const copy = await texts(page, '#guide .pg__copy > *');
    expect(copy[0]).toBe(originShortUnder('We’ve Built This Path Since 2014').text); // WP64 rework RW2 (coordinator): the heading says "Since 2014", so the line drops that lead-in
    expect(copy[1]).toContain('Our TalentLEAP method organizes skills into career paths.');
  });

  test('Investors prints the same line in its own band (InvestorGuide), followed by the TalentLEAP line', async ({ page }) => {
    await open(page, INVEST);
    const line = page.locator('#guide .ig__origin');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(originShortUnder('A Record Built Since 2014').text); // WP64 rework RW2 (coordinator): the band's heading says "Since 2014", so the line drops that lead-in
    expect(await line.getAttribute('data-fact')).toBe('ID-02 SC-03');
    expect(compact(await page.locator('#guide .ig__method').textContent())).toContain('TalentLEAP, our method, organizes skills into career paths.');
  });

  test('"Launched in Copenhagen in 2014." is on no built page', () => {
    expect(sitePages().filter((p) => visible(p.html).includes('Launched in Copenhagen in')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Home: the government slide and the program-results slide (items 25 and 26)', () => {
  const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

  // WP64 (cycle-36 review; GLM, GPT-6.1 Sol, Grok and Kimi): the heading is "Six Government Contracts and a National University Partnership" (it named "Bangladesh’s National University" after GV-12, the register's own name for the partner, which is unchanged);
  // "Six" is still read from GV-12 (tests/wp64.spec.ts)
  test('slide 2 is "Six Government Contracts and a National University Partnership" (Title Case, tied to GV-12)', async ({ page }) => {
    const HEADING = 'Six Government Contracts and a National University Partnership';
    expect(HEADING).toBe(titleCase(HEADING));
    expect(fact('GV-12').text).toContain('official training partner of Bangladesh’s National University');
    await open(page, '');
    await expect(slide(page, 2).locator('h2')).toHaveText(HEADING);
    expect(await slide(page, 2).locator('h2').getAttribute('data-fact')).toBe('GV-12');
    await expect(slide(page, 2)).toHaveAttribute('aria-label', `2 of 4: ${HEADING}`);
  });

  test('slide 4’s Her Power line carries its base (the 2,500 trained directly), read from PR-05’s label, and stays one line at 1280 like the Kosovo and WSDFM lines', async ({ page }) => {
    expect(fact('PR-05').stat?.label).toBe('tracked women, from the 2,500 trained directly by CodersTrust, in work: 47%');
    await page.setViewportSize(DESKTOP);
    await open(page, '');
    const heights = await page.locator('[data-hs-slide]').nth(3).locator('.hs__lines li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(heights[3], 'the Her Power line wraps').toBe(heights[0]);
    expect(await texts(page, '[data-hs-slide]:nth-child(4) .hs__lines li')).toEqual([
      'Women in Online Work, Kosovo (2016–2017): 68% in work (102 of 150).',
      'WSDFM: 711 of 1,000 in work (71%); a separate trial studied 833 women.',
      'UNDP YES, Korail (2017): 67% of the 350 trained found a first job within three months.',
      'Her Power: 372 of 800 tracked in work (47%); 2,500 trained directly.',
    ]);
    expect(await slide(page, 4).locator('.hs__lines li').nth(3).getAttribute('data-fact')).toBe('PR-05');
  });

  test('both slides fit the carousel at 1280 and 390 (the unused-space budget is held by tests/hero-slider.spec.ts)', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      for (const n of [2, 4]) expect(await slide(page, n).evaluate((e) => Math.round((e as HTMLElement).scrollHeight)), `${vp.width}px: slide ${n} fits its track`).toBeLessThanOrEqual(track + 1);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Programs: the grid’s eyebrow counts the five program cards (item 28)', () => {
  test('"Five Programs" over the H2 "Find the Program That Fits Where You Start" and five cards; "Five Routes" is on no built page', async ({ page }) => {
    await open(page, 'programs/');
    await expect(page.locator('#programs-grid .eyebrow').first()).toHaveText('Five Programs');
    await expect(page.locator('#programs-grid h2')).toHaveText('Find the Program That Fits Where You Start');
    await expect(page.locator('#programs-grid ul.hub > li')).toHaveCount(5);
    expect(sitePages().filter((p) => visible(p.html).includes('Five Routes')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Governments: the empathy line and the glance tile (items 14 and 18)', () => {
  // WP52 (cycle-27 reviews, Grok M2 and Gemini m6): the Track Record band opens with the origin line; the empathy line that WP51 reworded ("... must produce young people in work, not only seats filled.") is gone, with its EMPATHY key (tests/wp52.spec.ts)
  test('the Track Record band has no empathy line (the earlier wordings are on no built page either)', async ({ page }) => {
    expect(Object.keys(EMPATHY)).not.toContain('governments');
    await open(page, GOV);
    await expect(page.locator('#guide p.lead')).toHaveCount(0);
    expect(sitePages().filter((p) => visible(p.html).includes('must show up as young people in work') || visible(p.html).includes('must produce young people in work, not only seats filled')).map((p) => p.route)).toEqual([]);
  });

  // WP57 (cycle-29 review, Grok R2 with Gemini GM1): the tile's note is the shared "The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly)." (tests/wp57.spec.ts); the contracts table still states the 2,500 and the 130 sub-districts
  test('the GV-12 tile says the total includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly); Impact keeps the full register note; the contracts table below states the rest', async ({ page }) => {
    const FULL = fact('GV-12').stat?.glance?.note;
    expect(FULL).toBe('The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; CodersTrust trained 2,500 women directly.');
    await open(page, GOV);
    const tile = page.locator('#glance li', { hasText: '30,000+' });
    expect(compact(await tile.locator('.pg__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly).');
    expect(await tile.locator('a').getAttribute('data-fact')).toBe('GV-12 SC-06 GV-01 GV-11');
    // the table is below the tile and states the two figures Her Power's note used to repeat
    const contracts = compact(await page.locator('#contracts').textContent());
    expect(contracts).toContain('CodersTrust trained 2,500 women directly.');
    expect(contracts).toContain('The national program trained 25,125 women across 130 sub-districts (upazilas).');
    expect(await page.evaluate(() => Boolean(document.getElementById('glance')!.compareDocumentPosition(document.getElementById('contracts')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance a[data-fact~="GV-12"] .glance__note').textContent())).toBe(FULL);
  });
});

test.describe('"the gig-work marketplace" in prose; the product name Earn stays in the platform status table (item 15)', () => {
  test('IN-04 says "the gig-work marketplace"; "(Earn)" is on no built page except the JobReady Platform status table’s row', async ({ page }) => {
    expect(fact('IN-04').text).toContain('In pre-launch: the employer marketplace and the gig-work marketplace.');
    expect(fact('IN-04').text).not.toContain('(Earn)');
    // every page (the archived posts too: they carry the menu), in the raw markup: visible text, meta and structured data
    const hits = listPages().flatMap((p) => {
      const html = readFileSync(p.file, 'utf8');
      return html.includes('(Earn)') ? [`${p.route} x${count(html, '(Earn)')}`] : [];
    });
    expect(hits).toEqual(['/our-model/jobready-platform/ x1']);
    await open(page, 'our-model/jobready-platform/');
    await expect(page.locator('#status tbody tr', { hasText: 'Gig-work (Earn) marketplace' })).toHaveCount(1);
  });

  test('Investors, Foundations, Employers and JobReady@Work say it in prose, the two marketplaces still named as two', async ({ page }) => {
    for (const route of [INVEST, FOUND, EMP, 'programs/jobready-work/']) {
      await open(page, route);
      const text = await everything(page);
      expect(text, route).toContain('the employer marketplace and the gig-work marketplace');
      expect(text, route).not.toMatch(/\(Earn\)|employer and gig-work/i);
    }
  });
});

test.describe('Outcomes 2026: "Median Change per Person" (item 19)', () => {
  test('the +$82 tile’s heading is Title Case, its label is unchanged, and the old heading is gone', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    expect(await texts(page, '#income h3')).toEqual(['Direction of Income Change', 'Median Change per Person']);
    expect('Median Change per Person').toBe(titleCase('Median Change per Person'));
    const tile = page.locator('#income [data-fact="OC-03c"]');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe('median change in each surveyed completer’s own monthly income');
    expect(compact(await tile.locator('.stat__value').textContent())).toContain('+$82');
    expect(sitePages().filter((p) => visible(p.html).includes('Median Individual Change')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Partner with Us hub: the hero button (item 21)', () => {
  test('"See Partnership Routes", Title Case, with the same anchor (#audiences); "Choose Your Route" is on no built page', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const button = page.locator('#hero .btn');
    await expect(button).toHaveCount(1);
    await expect(button).toHaveText('See Partnership Routes');
    expect('See Partnership Routes').toBe(titleCase('See Partnership Routes'));
    expect((await button.getAttribute('href')) ?? '').toMatch(/#audiences$/);
    await expect(page.locator('#audiences')).toHaveCount(1);
    expect(sitePages().filter((p) => visible(p.html).includes('Choose Your Route')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Development Partners FAQ: "Can You Reach Women and Other Priority Groups?" (item 23)', () => {
  const QUESTION = 'Can You Reach Women and Other Priority Groups?';

  test('the page, its JSON-LD and the shared bank entry (Q6) ask the same question; the earlier question is on no built page', async ({ page }) => {
    expect(QUESTION).toBe(titleCase(QUESTION));
    expect(faqs.find((f) => f.id === 'Q6')?.q).toBe(QUESTION);
    expect(faqs.find((f) => f.id === 'Q6-development-partners')?.q).toBe(QUESTION);
    await open(page, DP);
    await expect(page.locator('#faq summary', { hasText: QUESTION })).toHaveCount(1);
    expect((await faqJsonLd(page)).map((q) => q.name)).toContain(QUESTION);
    expect(sitePages().filter((p) => p.html.includes('Can It Reach Women')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Foundations: the route table’s second column is "What the Evidence Covers" (item 24)', () => {
  test('the column heading and its mobile labels agree, and the cells keep their text', async ({ page }) => {
    await open(page, FOUND);
    const table = page.locator('#funding-routes table');
    expect(await texts(page, '#funding-routes thead th')).toEqual(['Funding Route', 'What It Supports', 'What the Evidence Covers']);
    expect(await table.locator('tbody td:nth-child(3)').evaluateAll((els) => els.map((e) => e.getAttribute('data-label')))).toEqual(['What the Evidence Covers', 'What the Evidence Covers']);
    expect('What the Evidence Covers').toBe(titleCase('What the Evidence Covers'));
    expect(await texts(page, '#funding-routes tbody td:nth-child(3)')).toEqual([
      'Builds on results from earlier programs in Bangladesh and Kosovo.',
      'Youth-program outcomes are not platform outcomes.', // WP65 (cycle-37 review, Gemini): the second sentence is gone (tests/wp65.spec.ts)
    ]);
    expect(sitePages().filter((p) => visible(p.html).includes('Evidence Relationship') || p.html.includes('data-label="Evidence Relationship"')).map((p) => p.route)).toEqual([]);
  });

  test('the table stacks without sideways scroll on a phone', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, FOUND);
    expect(await noOverflow(page)).toBe(true);
  });
});

test.describe('Pages changed by WP51 do not scroll sideways', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['', CAMPUS, YOUTHWIDE, UNI, LOCAL, GOV, 'partner-with-us/', 'impact/outcomes-2026/', 'our-model/talentleap/']) {
        await open(page, route);
        expect(await noOverflow(page), `${route || 'home'} at ${vp.width}px`).toBe(true);
      }
    });
  }
});
