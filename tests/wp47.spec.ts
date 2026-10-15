import { readFileSync } from 'node:fs';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { EMPLOYER_HIRING_STEPS, PROGRAM_SIZES_NOTE } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP47 behaviors (owner decision 2026-10-15: shorter Home and audience pages; cycle-22 reviews, items 30-40): the audience pages carry their own proof and go straight to their offer, so the Cost of Waiting and Imagine bands
 * (and any Compare band) are Home's alone; Home routes readers to their audience page right after the Results and Programs carousel and cuts the padding in its Cost of Waiting and Track Record bands; the Impact evidence
 * table links each rung by its name; the program-sizes note, the contract-scope sentence, the Her Power base, Foundations' live-platform list, the Governments and Universities degree card, About's enrollment split and founding
 * line, the Investors record heading and the JobReady@Work hiring route read as the reviews asked. Retrospective coverage (the owner exempted this project from test-first work); run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp47.spec.ts --project=chromium`.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The ids of the page's top-level sections, in order. */
const sectionIds = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));

/** The seven audience pages (src/pages/partner-with-us/<slug>/). */
const AUDIENCE = ['development-partners', 'governments', 'foundations', 'universities', 'employers', 'local-partners', 'investors'] as const;
/** The six that had a Cost of Waiting band and an Imagine band (Investors has its own thesis and vision bands, which are not Home's). */
const WITH_REMOVED_BANDS = AUDIENCE.filter((s) => s !== 'investors');

/** The headings of the twelve bands WP47 removed from the audience pages. */
const REMOVED_HEADINGS = [
  'Without Tracking, Agencies Cannot See What Training Delivers',
  'What Your Next Budget Cycle Could Show',
  'Build Work Entry into the Training Budget',
  'What Your Monthly Report Could Show',
  'Every Year of Delay Leaves a Cohort Without a Route to Work',
  'What a Funded Cohort Could Show',
  'No Placement Evidence Weakens Your Employment Story',
  'What Your Students Leave With',
  'AI Is Changing the Skills Your Teams Need',
  'What Changes for Your Team',
  'Cohorts That Train Without Placement Cost Community Trust',
  'Imagine a Cohort in Your Community',
];

test.describe('Audience pages: no Cost of Waiting, Imagine or Compare band (items 1, 2 and 4)', () => {
  test('no audience page has a #cost, #future or #compare band, or the eyebrows they carried', async ({ page }) => {
    for (const slug of AUDIENCE) {
      await open(page, `partner-with-us/${slug}/`);
      for (const id of ['cost', 'future', 'compare']) await expect(page.locator(`#${id}`), `${slug} #${id}`).toHaveCount(0);
      const text = await mainText(page);
      expect(text, slug).not.toContain('The Cost of Waiting');
      expect(text, slug).not.toContain('What Success Looks Like');
      expect(text, slug).not.toContain('Illustrative, not case studies');
    }
  });

  test('the twelve removed headings are on no built page', () => {
    for (const p of builtPages()) {
      for (const heading of REMOVED_HEADINGS) expect(p.html.includes(`>${heading}<`), `${p.route}: "${heading}"`).toBe(false);
    }
  });

  test('every other band stays, in the same order: the problem band is followed by the guide and the guide by the mechanism band', async ({ page }) => {
    for (const slug of WITH_REMOVED_BANDS) {
      await open(page, `partner-with-us/${slug}/`);
      const ids = await sectionIds(page);
      expect(ids.indexOf('problem'), `${slug}: problem band`).toBeGreaterThanOrEqual(0);
      expect(ids.indexOf('guide'), `${slug}: guide band follows the problem band`).toBe(ids.indexOf('problem') + 1);
      expect(ids.indexOf('mechanism'), `${slug}: mechanism band follows the guide band`).toBe(ids.indexOf('guide') + 1);
      for (const id of ['definition', 'features', 'faq', 'cta', 'next-steps']) expect(ids, `${slug}: #${id} stays`).toContain(id);
    }
  });

  test('Investors keeps its own thesis and vision bands: they are the investor problem band and the company ambition (IN-05), not the Cost of Waiting or Imagine bands of Home', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const ids = await sectionIds(page);
    for (const id of ['thesis', 'guide', 'vision', 'mechanism', 'features', 'faq', 'offer', 'cta']) expect(ids, `#${id}`).toContain(id);
    await expect(page.locator('#vision [data-fact="IN-05"]')).toHaveCount(1);
  });

  test('no two dark bands (Klein or Deep Ink) follow each other on Home or any audience page', async ({ page }) => {
    for (const route of ['', ...AUDIENCE.map((s) => `partner-with-us/${s}/`)]) {
      await open(page, route);
      const adjacent = await page.evaluate(() => {
        const bands = Array.from(document.querySelectorAll('main section.band')).filter((b) => !b.parentElement?.closest('section.band'));
        const dark = bands.map((b) => /\bband--(klein|deep-ink)\b/.test(b.className));
        return dark.flatMap((d, i) => (d && i > 0 && dark[i - 1] ? [`#${bands[i - 1].id} then #${bands[i].id}`] : []));
      });
      expect(adjacent, route || 'home').toEqual([]);
    }
  });

  test('no link on any page points at a removed anchor of an audience page', () => {
    const stale = builtPages().flatMap((p) => (p.html.match(/href="[^"]*partner-with-us\/(?:development-partners|governments|foundations|universities|employers|local-partners)\/#(?:cost|future|compare)"/g) ?? []).map((h) => `${p.route}: ${h}`));
    expect(stale).toEqual([]);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the six pages have no sideways scroll after the removals`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const slug of WITH_REMOVED_BANDS) {
        await open(page, `partner-with-us/${slug}/`);
        expect(await noOverflow(page), `${slug} at ${vp.width}px`).toBe(true);
      }
    });
  }
});

test.describe('Home: the router is the band after the carousel; Cost of Waiting, Imagine and Compare stay, with less padding (items 5-8)', () => {
  test('the role router sits directly after "Results and Programs", before the problem band; one router; the hero keeps its audience links; the offer band is directly before the closing call to action (WP48: the risk band is gone from Home)', async ({ page }) => {
    await open(page, '');
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('[data-cmf]')).map((el) => el.getAttribute('data-cmf')));
    expect(order.filter((c) => c === 'ROUTER'), 'one router').toHaveLength(1);
    await expect(page.locator('#router')).toHaveCount(1);
    expect(order.indexOf('ROUTER'), `router after the carousel (order: ${order.join(' > ')})`).toBe(order.indexOf('RESULTS') + 1);
    expect(order[order.indexOf('ROUTER') + 1], 'problem band after the router').toBe('C2');
    // WP48 (cycle-23 review): the risk band (C12) is gone from Home; its one line leads the closing band (tests/wp48.spec.ts), so the offer (C11) is directly before the call to action
    expect(order.slice(order.indexOf('C11')), 'offer, closing call to action, next steps').toEqual(['C11', 'C13', 'C14']);
    // WP49 (cycle-24 review): the investor card is "Investors", as in the menu, the footer and the hub (it was "Impact Investors")
    expect(await texts(page, '#router .cat__title')).toEqual(['Development Partners and NGOs', 'Governments', 'Foundations and CSR', 'Investors']);
    expect(await texts(page, 'nav[aria-label="Choose your audience"] a')).toEqual(['Development Partners', 'Governments', 'Foundations', 'Investors']);
    await expect(page.locator('#router h2')).toHaveText('What Brings You Here?');
  });

  test('the router is the first band after the carousel in the page itself, so a reader reaches it before the problem band', async ({ page }) => {
    await open(page, '');
    const y = await page.evaluate(() => ({ results: document.getElementById('results')!.getBoundingClientRect().bottom, router: document.getElementById('router')!.getBoundingClientRect().top, problem: document.getElementById('problem')!.getBoundingClientRect().top }));
    expect(y.router).toBeGreaterThanOrEqual(y.results - 1);
    expect(y.problem).toBeGreaterThan(y.router);
  });

  test('Cost of Waiting (C3), Imagine (C4) and Compare (C10) stay, and so does "What a Supported Youth Cohort Includes", because Home’s FAQ band does not ask what a supported cohort includes (Q8)', async ({ page }) => {
    await open(page, '');
    const ids = await sectionIds(page);
    for (const id of ['cost', 'future', 'compare', 'features']) expect(ids, `#${id}`).toContain(id);
    await expect(page.locator('#features h2')).toHaveText('What a Supported Youth Cohort Includes');
    expect(await texts(page, '#faq summary')).toEqual(['Will This Work in Our Country?', 'Does the Trial Apply to Your Program?', 'How Do You Prove Outcomes?']);
    expect(await texts(page, '#faq summary')).not.toContain('What Does It Cost?');
  });

  test('the Cost of Waiting band ends with its two cards: the "A first cohort can show who is earning" line is gone', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#cost .card')).toHaveCount(2);
    await expect(page.locator('#cost .cost__after, #cost .cost__turn')).toHaveCount(0);
    expect(await page.locator('#cost .container > :last-child').getAttribute('class')).toContain('grid-cards');
    expect(await mainText(page)).not.toContain('A first cohort can show who is earning');
  });

  test('the Track Record band opens with its eyebrow and its heading; the "You need more than enrollment numbers" line is gone, and its content stays', async ({ page }) => {
    await open(page, '');
    expect(await page.locator('#guide .guide__copy > *').evaluateAll((els) => els.slice(0, 2).map((e) => `${e.tagName} ${(e.textContent ?? '').trim()}`))).toEqual(['P Our Track Record', 'H2 We’ve Built This Path Since 2014']);
    expect(await mainText(page)).not.toContain('You need more than enrollment numbers');
    const guide = compact(await page.locator('#guide').textContent());
    expect(guide).toContain('CodersTrust launched in 2014 in Copenhagen');
    expect(guide).toContain('How TalentLEAP Works');
    expect(guide).toContain('Meet the Leadership Team');
    await expect(page.locator('#guide .guide__origin')).toHaveCount(1);
    // the heading, now directly under the eyebrow, is set in the same section-heading color as the other Home bands' titles
    const color = (selector: string) => page.locator(selector).evaluate((el) => getComputedStyle(el).color);
    expect(await color('#guide h2')).toBe(await color('#problem h2'));
  });

  test('item 33: the Challenge lead is two sentences, one claim each', async ({ page }) => {
    await open(page, '');
    const lead = compact(await page.locator('#problem .sh__lead').textContent());
    // WP50 (cycle-25 review): the second sentence speaks to the reader's own budget (it was "Training budgets rarely show who starts earning."; tests/wp50.spec.ts)
    expect(lead).toBe('Millions of educated young people are out of work and out of training. Your training budget needs to show who starts earning.');
    expect(lead.split('. ')).toHaveLength(2);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px Home has no sideways scroll, and the Cost of Waiting band keeps room under its cards`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, '');
      expect(await noOverflow(page)).toBe(true);
      expect(await page.locator('#cost').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))).toBeGreaterThanOrEqual(40);
    });
  }
});

test.describe('Impact: each evidence-ladder rung name is the link (item 30)', () => {
  // WP48 (cycle-23 review, item 34): the first rung's name carries the abbreviation (it was "Independent Evaluation by the BRAC Institute of Governance and Development (BIGD)"); WP49 (cycle-24 review, item 14): it is "Independent Evaluation (BIGD)", since the tag says "Randomized Trial"
  const NAMES = ['Independent Evaluation (BIGD)', 'Impact Survey 2026', 'Program Results', 'Learner Stories'];
  const TAGS = ['Randomized Trial', 'Surveyed Completers', 'Program Record', 'Individual Story'];
  const PATHS = ['/impact/independent-evaluation/', '/impact/outcomes-2026/', '/impact/case-studies/', '/impact/stories/'];

  test('every row header holds the number, ONE link that is the name, and the evidence tag; no second link repeats the name', async ({ page }) => {
    await open(page, 'impact/');
    const rows = page.locator('#evidence-ladder tbody tr');
    await expect(rows).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const th = rows.nth(i).locator('th');
      await expect(th.locator('a'), `row ${i + 1}: links`).toHaveCount(1);
      expect(compact(await th.locator('a').textContent()), `row ${i + 1}: link text`).toBe(NAMES[i]);
      expect((await th.locator('a').getAttribute('href')) ?? '', `row ${i + 1}: href`).toMatch(new RegExp(`${PATHS[i]}$`));
      await expect(th.locator('[data-evidence]'), `row ${i + 1}: tag`).toHaveCount(1);
      expect(await th.locator('[data-evidence]').getAttribute('data-evidence')).toBe(TAGS[i]);
      // the name is read once in the row header (it used to be the name, the tag and a link repeating the name)
      expect(count(compact(await th.textContent()), NAMES[i]), `row ${i + 1}: the name once`).toBe(1);
    }
    const header = compact(await page.locator('#evidence-ladder tbody').textContent());
    for (const old of ['The Randomized Trial', 'Case Studies', 'Success Stories']) expect(header, old).not.toContain(old);
  });

  test('each rung link can take keyboard focus at 1280 and 390 (the table stacks to cards at 390), with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, 'impact/');
      const first: Locator = page.locator('#evidence-ladder tbody tr').first().locator('th a');
      await first.focus();
      await expect(first).toBeFocused();
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Single-source wording (items 31, 32, 34, 35, 36)', () => {
  test('item 31: the program-sizes note is a full sentence on every page that carries it', async ({ page }) => {
    const NOTE = 'These are program sizes, not commitments: in the discovery session you choose a starting scope for your goals, country and delivery capacity.';
    expect(PROGRAM_SIZES_NOTE).toBe(NOTE);
    // WP49 (cycle-24 reviews, items 12 and 33): the Governments page, whose action is a briefing, carries the same sentence with "in the briefing" (PROGRAM_SIZES_NOTE_BRIEFING; tests/wp49.spec.ts)
    for (const route of ['', 'partner-with-us/development-partners/', 'partner-with-us/foundations/', 'partner-with-us/universities/', 'programs/jobready-campus/']) {
      await open(page, route);
      const text = await mainText(page);
      expect(text, route || 'home').toContain(NOTE);
      expect(text, route || 'home').not.toContain('Program sizes, not a commitment');
    }
    await open(page, 'partner-with-us/governments/');
    const governments = await mainText(page);
    expect(governments).toContain(NOTE.replace('in the discovery session', 'in the briefing'));
    expect(governments).not.toContain('Program sizes, not a commitment');
    expect(builtPages().filter((p) => p.html.includes('Program sizes, not a commitment')).map((p) => p.route)).toEqual([]);
  });

  test('item 32: the contract-scope sentence says "work scoped for", in the register and on Home slide 2; no page says "scopes for 31,200+" or "scopes covering"', async ({ page }) => {
    const GV12 = 'Six government contracts with training and curriculum work scoped for 31,200+ people; official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners';
    expect(fact('GV-12').text).toBe(GV12);
    await open(page, '');
    const lead = compact(await slide(page, 2).locator('.hs__lead').textContent());
    // WP48 (cycle-23 review): the slide keeps "work scoped for 31,200+ people" and follows it with the clause "contract scope, not a count of completers"; Her Power's 25,125 and the 2,500 are off the slide (tests/wp48.spec.ts)
    expect(lead).toBe(
      'Six government contracts with training and curriculum work scoped for 31,200+ people. This is contract scope, not a count of completers. CodersTrust is also the official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners.',
    );
    expect(await slide(page, 2).locator('.hs__lead').getAttribute('data-fact')).toBe('GV-12');
    const stale = builtPages().filter((p) => /curriculum scopes (?:for|covering) 31,200\+/.test(p.html)).map((p) => p.route);
    expect(stale, 'pages with the old sentence').toEqual([]);
  });

  test('item 34: the Her Power base reads "among the 2,500 women CodersTrust trained directly" on the Governments tile and on every case card that shows the figure', async ({ page }) => {
    const LABEL = 'tracked women in work (47%), among the 2,500 women CodersTrust trained directly';
    await open(page, 'partner-with-us/governments/');
    const tile = page.locator('#glance a[data-fact^="PR-05"]');
    expect(compact(await tile.locator('.pg__value').textContent())).toBe('372 of 800');
    // WP52 (cycle-27 review): the tile names the program ("Her Power: ..."); the case cards below sit under the program's name and keep the bare caption
    expect(compact(await tile.locator('.pg__desc').textContent())).toBe(`Her Power: ${LABEL}`);
    for (const route of ['partner-with-us/development-partners/', 'partner-with-us/foundations/', 'partner-with-us/local-partners/']) {
      await open(page, route);
      const cards = (await texts(page, '#cases article')).join(' | ');
      expect(cards, route).toContain(`372 of 800 ${LABEL}`);
    }
    const stale = builtPages().filter((p) => /tracked women in work \(47%\), from the 2,500 trained directly by CodersTrust/.test(p.html)).map((p) => p.route);
    expect(stale, 'the old caption').toEqual([]);
    // the register's own wording (PR-05) is unchanged: the caption is derived from it
    expect(fact('PR-05').stat?.label).toBe('tracked women, from the 2,500 trained directly by CodersTrust, in work: 47%');
  });

  // WP48 (cycle-23 review, item 5): the Employers FAQ no longer lists the full tooling; it says "Partner portals and AI chat are live; the employer marketplace and the gig-work (Earn) marketplace are in pre-launch. Hiring currently runs through CodersTrust’s placement team." (tests/wp48.spec.ts)
  test('item 35: Foundations’ Funding Route 2 says "Live today: partner portals and AI chat."; JobReady Platform keeps the full list', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const cell = page.locator('#funding-routes tbody tr').nth(1).locator('td[data-label="What It Supports"]');
    expect(compact(await cell.textContent())).toBe('A grant toward platform infrastructure, not toward cohorts. Live today: partner portals and AI chat. In pre-launch: the employer marketplace and the gig-work marketplace.');
    const text = await mainText(page);
    expect(text).not.toMatch(/marketing automation|customer relationship management/i);
    expect(await page.locator('#funding-routes tbody tr').nth(1).getAttribute('data-fact')).toBe('IN-04');
    await open(page, 'our-model/jobready-platform/');
    // WP49 (cycle-24 review): the "What Is Live Today" callout is gone; the status table's "Across the Platform" row keeps the full list (tests/wp49.spec.ts)
    const platform = await mainText(page);
    expect(platform).toContain('Marketing automation, customer relationship management and AI chat');
    expect(platform).toContain('Partner portals');
    await open(page, 'partner-with-us/employers/');
    expect(await mainText(page)).toContain('Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.');
    expect(await mainText(page)).not.toMatch(/marketing automation|customer relationship management/i);
  });

  test('item 36: the degree-holders pain says "A degree alone does not guarantee a job offer." on Governments and Universities, under the unchanged card titles', async ({ page }) => {
    for (const [route, title] of [
      ['partner-with-us/governments/', 'Graduates Struggle to Find Work'],
      ['partner-with-us/universities/', 'Degree Holders Struggle to Find Work'],
    ] as const) {
      await open(page, route);
      const item = page.locator('#problem .gp__pains li', { has: page.locator('.gp__q', { hasText: title }) });
      await expect(item, route).toHaveCount(1);
      expect(compact(await item.locator('.gp__q').textContent())).toBe(title);
      expect(compact(await item.locator('.gp__a').textContent()), route).toBe('A degree alone does not guarantee a job offer.');
      expect(await mainText(page), route).not.toContain('not producing job offers');
    }
  });
});

test.describe('About and Investors (items 37, 38, 39)', () => {
  test('item 37: About’s enrollment tile counts "direct enrollments" beside the courseware enrollments', async ({ page }) => {
    await open(page, 'about/');
    const note = compact(await page.locator('#glance .about-stats__tile[data-fact="SC-02"] .stat__note').textContent());
    // WP50 (cycle-25 review, item 21): the detail line is a sentence (tests/wp50.spec.ts); the figures are SC-02's
    expect(note).toBe('Including 111,268 direct enrollments and 40,043 through courseware.');
  });

  test('item 38: the founding line reads "Founded in 2014 and launched in Copenhagen, Denmark, …" on the About timeline and in the register (the Recognition page prints the register line)', async ({ page }) => {
    const LINE = 'Founded in 2014 and launched in Copenhagen, Denmark, in the presence of Sir Richard Branson and early Skype investor Morten Lund.';
    expect(fact('ID-02').text).toBe(LINE);
    await open(page, 'about/');
    expect(await texts(page, '.timeline__text')).toContain(LINE);
    await open(page, 'about/recognition/');
    expect(await mainText(page)).toContain(LINE);
    expect(builtPages().filter((p) => p.html.includes('Founded 2014;')).map((p) => p.route)).toEqual([]);
  });

  test('item 39: the Investors record band is headed "A Record Built Since 2014"; the institutions follow directly below it', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#guide h2')).toHaveText('A Record Built Since 2014');
    expect(await texts(page, '#guide h2, #guide h3')).toEqual(['A Record Built Since 2014', 'Delivered Since 2014']);
    expect(await mainText(page)).not.toContain('with Institutions That Reach Youth');
    const guide = compact(await page.locator('#guide').textContent());
    expect(guide.indexOf('Government partners include')).toBeGreaterThan(guide.indexOf('A Record Built Since 2014'));
    expect(guide).toContain('Private-sector partners include');
  });
});

test.describe('JobReady@Work: "For Hiring" is the Employers page’s two steps (item 40)', () => {
  test('both pages carry the same two steps, in the same step component, tied to IN-04, with the wording of the shared constant', async ({ page }) => {
    expect(EMPLOYER_HIRING_STEPS.map((s) => s.title)).toEqual(['Discovery', 'Introductions']);
    const read = async (route: string) => {
      await open(page, route);
      const hiring = page.locator('#next-steps .route', { has: page.locator('h3', { hasText: 'For Hiring' }) });
      await expect(hiring, route).toHaveCount(1);
      expect(await hiring.locator('[data-fact]').first().getAttribute('data-fact'), route).toBe('IN-04');
      await expect(hiring.locator('p.lead'), route).toHaveCount(0);
      return {
        titles: (await hiring.locator('ol h4').allTextContents()).map((t) => compact(t).replace(/^Step \d+: /, '')),
        texts: (await hiring.locator('.steps__text').allTextContents()).map(compact),
      };
    };
    const employers = await read('partner-with-us/employers/');
    const work = await read('programs/jobready-work/');
    expect(work).toEqual(employers);
    expect(work.titles).toEqual(EMPLOYER_HIRING_STEPS.map((s) => s.title));
    expect(work.texts).toEqual(EMPLOYER_HIRING_STEPS.map((s) => s.text));
  });

  test('the training route keeps its five steps and its first action; the hiring route follows it with H3 over two H4 steps', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const band = page.locator('#next-steps');
    const training = band.locator('.route').first();
    expect((await training.locator('ol h4').allTextContents()).map((t) => compact(t).replace(/^Step \d+: /, ''))).toEqual(['Discovery Session', 'Needs Assessment', 'Agreement', 'First Workshop or Cohort', 'Progress Evaluation']);
    expect(await band.locator('h2, h3, h4').evaluateAll((els) => els.map((e) => e.tagName))).toEqual(['H2', 'H3', 'H4', 'H4', 'H4', 'H4', 'H4', 'H3', 'H4', 'H4']);
  });
});
