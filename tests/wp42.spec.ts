import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP42 behaviors (cycle-19 whole-site reviews, GPT-6.1 Sol items 1-9 and Kimi K3 items 10-17): Investors' track-record band opens with the delivered figures; Local Partners' evidence is a two-line strip; Development Partners,
 * Governments and SuperKids state their approach in two plain sentences; the WSDFM case study's hero says what kinds of evidence its tiles are in one line; the JobReady Platform says its roadmap item once; Contact's third
 * group is "Educate, Hire or Train"; Our Model's H1 and path lead; Home's carousel puts the government slide second and its comparison table is one style; Development Partners' >4x tile does not repeat the +10.3; Impact's
 * jump list names the goals heading in full. Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp42.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
/** An href as rendered ("/ctg/our-model/") without the staging base, so the test does not depend on it. */
const sitePath = (href: string) => href.replace(/^\/ctg(?=\/)/, '');
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** The ids of main's bands in page order, with whether each is a dark one (nested sections are not bands). */
const bands = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main .band[id]')).map((b) => ({ id: b.id, dark: /band--(klein|deep-ink)/.test(b.className) })));
/** Top edge of an element on the page (document coordinates). */
const topOf = (page: Page, selector: string) => page.evaluate((sel) => (document.querySelector(sel) as HTMLElement).getBoundingClientRect().top + window.scrollY, selector);

test.describe('Investors: the delivered figures lead the track-record band (item 1)', () => {
  const URL = 'partner-with-us/investors/';

  test('"Delivered Since 2014" is in the Guide band with its three tiles and the enrollment and location note; the Reach band no longer holds it', async ({ page }) => {
    await open(page, URL);
    const group = page.locator('#guide .ig__delivered');
    await expect(group.locator('h3')).toHaveText('Delivered Since 2014');
    expect(await texts(page, '#guide .ig__tile .stat__value')).toEqual(['130,000+', '150,000+', '15']);
    expect(await texts(page, '#guide .ig__tile .stat__label')).toEqual(['learners trained since 2014', 'enrollments since 2014', 'countries and territories with CodersTrust programs, including Bangladesh']);
    expect(await texts(page, '#guide .ig__tile .status-tag')).toEqual(['Delivered', 'Delivered', 'Delivered']);
    expect(await page.locator('#guide .ig__tile').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['SC-01', 'SC-02', 'SC-03']);
    // the explanation moved with the tiles, in the register's own words (SC-02 and SC-03 detail lines)
    const note = page.locator('#guide .ig__notes');
    await expect(note).toHaveText('Of 150,000+ enrollments: 111,268 direct and 40,043 through CodersTrust courseware. Bangladesh plus 14 other countries and territories; most delivery has been in Bangladesh.');
    expect(await note.getAttribute('data-fact')).toBe('SC-02 SC-03');
    // moved, not duplicated: the figures are stated where they were, once (the 150,000+ twice: the tile, and the register's own "Of 150,000+ enrollments" note), and the Reach band holds none of it
    const text = await mainText(page);
    for (const figure of ['130,000+', '111,268', '40,043']) expect(count(text, figure), `${figure} is stated once on Investors`).toBe(1);
    expect(count(text, '150,000+'), 'the tile and the note’s lead-in').toBe(2);
    expect(count(compact(await page.locator('#guide').textContent()), '150,000+'), 'both are in the Guide band').toBe(2);
    const reach = compact(await page.locator('#reach').textContent());
    expect(reach).not.toMatch(/130,000|150,000|111,268|Delivered Since 2014/);
    await expect(page.locator('#reach .status-tag')).toHaveCount(0);
  });

  // WP43 (cycle-20 review): the relationship panel and the founder and leadership strips are gone (tests/wp43.spec.ts); the figures still come first, then the one paragraph that names the institutions, then the link to the leadership team
  test('the figures come before the institutional relationships (one paragraph), and those before the link to the leadership team', async ({ page }) => {
    await open(page, URL);
    expect(await texts(page, '#guide h3')).toEqual(['Delivered Since 2014']);
    const [delivered, relationships, leadership] = await Promise.all([topOf(page, '#guide .ig__delivered'), topOf(page, '#guide .ig__names'), topOf(page, '#guide .ig__leaders')]);
    expect(delivered, 'delivered figures above the relationships').toBeLessThan(relationships);
    expect(relationships, 'relationships above the leadership link').toBeLessThan(leadership);
    // and in the markup, so the order holds for a screen reader and without styles
    const domOrder = await page.evaluate(() => {
      const el = (s: string) => document.querySelector(s) as Element;
      const before = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return [before(el('#guide .ig__delivered'), el('#guide .ig__names')), before(el('#guide .ig__names'), el('#guide .ig__leaders'))];
    });
    expect(domOrder).toEqual([true, true]);
  });

  test('the band shows SC-03’s tile, so the origin line is the launch alone and the count of countries and territories is stated once in the band’s tile and note', async ({ page }) => {
    await open(page, URL);
    const line = page.locator('#guide p[data-fact="ID-02"]');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe('Launched in Copenhagen in 2014.');
    const guide = compact(await page.locator('#guide').textContent());
    expect(guide).not.toMatch(/from a Copenhagen launch to programs in|began (?:developing|training) freelancers|Korail settlement/);
    expect(count(guide, 'countries and territories'), 'the tile’s label and SC-03’s note, nothing else').toBe(2);
    await expect(page.locator('#guide [data-fact="SC-03"]')).toHaveCount(1);
  });

  test('the Reach band keeps its id, a heading that says what it holds, and the contract scope in its own labeled block', async ({ page }) => {
    await open(page, URL);
    await expect(page.locator('section#reach')).toHaveCount(1);
    await expect(page.locator('#reach .eyebrow')).toHaveText('Beyond Delivered Reach');
    await expect(page.locator('#reach h2')).toHaveText('Contracts, Pipeline and Recognition');
    for (const heading of ['Contracts, Pipeline and Recognition', 'Beyond Delivered Reach', 'Delivered Since 2014', 'Contracted Scope']) expect(heading, heading).toBe(titleCase(heading));
    expect(await texts(page, '#reach h3')).toEqual(['Contracted Scope']);
    const tile = page.locator('#reach .ir__tile');
    await expect(tile).toHaveCount(1);
    await expect(tile).toContainText('31,200+');
    await expect(tile.locator('[data-evidence="Contract Scope"]')).toHaveCount(1);
    await expect(tile.locator('[data-status]')).toHaveCount(0);
    expect(compact(await page.locator('#reach p[data-fact="SC-04"]').textContent())).toMatch(/^Separately, and not counted in the delivered reach: 1\.5M\+ National University learners/);
    await expect(page.locator('#reach .ir__badges li')).toHaveCount(2);
    // the band no longer calls itself reach to date, and nothing links to a heading that is gone
    expect(await mainText(page)).not.toContain('Reach to Date');
  });

  test('the band order is unchanged (guide, vision, mechanism, reach, evidence, features) and no two dark bands touch', async ({ page }) => {
    await open(page, URL);
    const list = await bands(page);
    const ids = list.map((b) => b.id);
    for (const id of ['definition', 'thesis', 'guide', 'vision', 'mechanism', 'reach', 'proof-band', 'features', 'faq']) expect(ids, id).toContain(id);
    const at = (id: string) => ids.indexOf(id);
    expect(at('guide')).toBeLessThan(at('vision'));
    expect(at('vision')).toBeLessThan(at('mechanism'));
    expect(at('mechanism')).toBeLessThan(at('reach'));
    expect(at('reach')).toBe(at('proof-band') - 1);
    for (let i = 1; i < list.length; i++) expect(list[i].dark && list[i - 1].dark, `bands ${list[i - 1].id} and ${list[i].id}`).toBe(false);
  });

  // WP43 (cycle-20 review): the relationships are one paragraph under both columns (it was a panel that spanned the band), at a reading width
  test('desktop: the three tiles share a row beside the heading, the paragraph that names the institutions is below them; phone: one column, no overflow', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, URL);
    const tiles = await page.locator('#guide .ig__tile').evaluateAll((els) => els.map((e) => ({ top: Math.round(e.getBoundingClientRect().top), left: Math.round(e.getBoundingClientRect().left) })));
    expect(new Set(tiles.map((t) => t.top)).size, 'the three tiles are on one row at 1280').toBe(1);
    const copy = await page.locator('#guide .ig__copy').boundingBox();
    const delivered = await page.locator('#guide .ig__delivered').boundingBox();
    const names = await page.locator('#guide .ig__names').boundingBox();
    expect(delivered!.x, 'the figures sit to the right of the copy').toBeGreaterThan(copy!.x + copy!.width - 1);
    expect(delivered!.y, 'and level with it').toBeLessThan(copy!.y + copy!.height);
    expect(names!.y, 'the paragraph is below both').toBeGreaterThan(Math.max(copy!.y + copy!.height, delivered!.y + delivered!.height) - 1);
    expect(names!.width, 'at a reading width (48rem)').toBeLessThanOrEqual(769);
    expect(await noOverflow(page)).toBe(true);
    await page.setViewportSize(MOBILE);
    await open(page, URL);
    expect(await noOverflow(page), '390px').toBe(true);
    const [copyTop, deliveredTop, namesTop] = await Promise.all([topOf(page, '#guide .ig__copy'), topOf(page, '#guide .ig__delivered'), topOf(page, '#guide .ig__names')]);
    expect(copyTop).toBeLessThan(deliveredTop);
    expect(deliveredTop).toBeLessThan(namesTop);
  });
});

test.describe('Local Partners: the evidence is a two-line strip (item 2)', () => {
  const URL = 'partner-with-us/local-partners/';
  const TRIAL = 'A randomized trial of the predecessor WSDFM program found women offered a place were 10.3 percentage points more likely to be employed.';
  const SURVEY = 'Among surveyed completers, employment was 77.9% at the October 2026 survey, up from 47.4% before training.';

  test('the strip keeps the band’s anchor, says the trial and the survey in one line each, and links the two evidence pages', async ({ page }) => {
    await open(page, URL);
    expect(fact('RC-02').stat?.value).toBe('+10.3 pp');
    expect(fact('OC-01').stat?.value).toBe('77.9%');
    expect(fact('OC-01').stat?.from).toBe('47.4%');
    const band = page.locator('section#proof');
    await expect(band).toHaveCount(1);
    await expect(band.locator('.eyebrow')).toHaveText('The Evidence');
    await expect(band.locator('h2')).toHaveText('Evidence from Our Wider Youth Programs');
    expect('Evidence from Our Wider Youth Programs').toBe(titleCase('Evidence from Our Wider Youth Programs'));
    expect(await texts(page, '#proof p.lead')).toEqual([TRIAL, SURVEY]);
    expect(await page.locator('#proof p.lead').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['RC-02', 'OC-01']);
    expect(await texts(page, '#proof nav a')).toEqual(['The Randomized Trial', 'Impact Survey 2026']);
    expect((await hrefs(page, '#proof nav a')).map(sitePath)).toEqual(['/impact/independent-evaluation/', '/impact/outcomes-2026/']);
    // one line each: no tile, chart, table or list
    await expect(band.locator('.stat, svg[role="img"], table, .ba, .ba__data, .proofband')).toHaveCount(0);
  });

  test('the full band is gone: no income results, no 52.8% / 63.1% employment table, no median income, no evaluator named; the program-result cards stay', async ({ page }) => {
    await open(page, URL);
    const text = await mainText(page);
    expect(text).not.toMatch(/41% higher|54% higher|\+41%|\$245|\$82|63\.1%|View Chart Data|An Independent Randomized Trial|Chart data:/);
    expect(text).not.toMatch(/BIGD|BRAC Institute/);
    await expect(page.locator('#proof [data-fact="RC-01"]')).toHaveCount(0);
    const cards = page.locator('#cases article');
    await expect(cards).toHaveCount(2);
    expect((await hrefs(page, '#cases a.card__link')).map(sitePath)).toEqual(['/impact/case-studies/wsdfm-women-freelancers/', '/impact/case-studies/her-power/']);
  });

  test('the strip is a light band between the light mechanism band and the light program cards: the rhythm is kept and the page has no dark band before its call to action', async ({ page }) => {
    await open(page, URL);
    expect(await page.locator('#proof').getAttribute('class')).toMatch(/band--white/);
    const list = await bands(page);
    const ids = list.map((b) => b.id);
    expect(ids.indexOf('mechanism')).toBeLessThan(ids.indexOf('proof'));
    expect(ids.indexOf('proof')).toBe(ids.indexOf('cases') - 1);
    for (let i = 1; i < list.length; i++) expect(list[i].dark && list[i - 1].dark, `bands ${list[i - 1].id} and ${list[i].id}`).toBe(false);
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, URL);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      await expect(page.locator('#proof a').first()).toBeVisible();
    }
  });
});

test.describe('Development Partners, Governments and SuperKids: the approach in two plain sentences (items 3, 4 and 8)', () => {
  const STATEMENTS: [string, string, string[]][] = [
    ['partner-with-us/development-partners/', 'We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports and outcome tracking after each course, as agreed in the program scope.', ['PD-01', 'PD-08', 'PD-09']],
    ['partner-with-us/governments/', 'We combine training, mentoring and placement support in existing labs and colleges. Your agency receives monthly reports on progress toward paid work, as agreed in the program scope.', ['PD-01', 'PD-08']],
    ['programs/superkids/', 'SuperKids offers block coding, robotics and digital art through schools and education partners. DoICT and NCTB agreements set targets, not delivered reach.', ['GV-08']],
  ];
  for (const [route, statement, facts] of STATEMENTS) {
    test(`${route}: "Our Approach" is exactly the two sentences, rests on ${facts.join(', ')}, and opens the band`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('#mechanism .pos__label')).toHaveText('Our Approach');
      await expect(page.locator('#mechanism .pos__text')).toHaveText(statement);
      expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe(facts.join(' '));
      // nothing but the eyebrow and the heading comes before it
      const before = await page.evaluate(() => {
        const band = document.querySelector('#mechanism')!;
        const pos = band.querySelector('.pos')!;
        const kinds: string[] = [];
        for (const el of Array.from(band.querySelectorAll('p, ul, ol, svg, img, table, a'))) {
          if (el.compareDocumentPosition(pos) & Node.DOCUMENT_POSITION_FOLLOWING && !el.classList.contains('eyebrow') && !pos.contains(el)) kinds.push(el.tagName + '.' + el.className);
        }
        return kinds;
      });
      expect(before, 'only the eyebrow precedes the statement').toEqual([]);
      for (const gone of ['who need', 'integrated training-to-earnings model', 'K-12 STEAM program of block coding']) expect(statement).not.toContain(gone);
    });
  }

  test('Development Partners keeps the YouthWIDE explanation after the statement', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const lead = page.locator('#mechanism .sh__lead');
    await expect(lead).toHaveText('YouthWIDE is the program through which funders deploy the CodersTrust model in a country; it builds on results from earlier programs in Bangladesh and Kosovo.');
    expect(await topOf(page, '#mechanism .pos')).toBeLessThan(await topOf(page, '#mechanism .sh__lead'));
  });

  test('SuperKids still says the agreements are targets, not delivered reach, in its own block (the statement and that block are the page’s two mentions)', async ({ page }) => {
    await open(page, 'programs/superkids/');
    expect(await texts(page, '.agree__fact p')).toContain('These are agreement targets, not delivered reach.');
    expect(count(await mainText(page), 'not delivered reach')).toBe(2);
  });

  // WP44 (cycle-21 review): Foundations and Universities are declared whole now (tests/wp44.spec.ts); the audience sentence is no longer on either page
  test('Foundations and Universities carry their declared whole statements (the declaration is for the pages the gate lists)', async ({ page }) => {
    for (const route of ['partner-with-us/foundations/', 'partner-with-us/universities/']) {
      await open(page, route);
      const statement = compact(await page.locator('#mechanism .pos__text').textContent());
      expect(statement.startsWith('For '), route).toBe(false);
      expect(statement.endsWith('We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work.'), route).toBe(false);
    }
  });
});

test.describe('the WSDFM case study: one line above the tiles instead of two paragraphs (item 5)', () => {
  const URL = 'impact/case-studies/wsdfm-women-freelancers/';

  test('the hero keeps its intro sentence and its three tiles; the plain-language trial paragraph and the program-record paragraph are gone', async ({ page }) => {
    await open(page, URL);
    const hero = page.locator('section.hero');
    expect(compact(await hero.locator('.hero__lead').textContent())).toContain('ICT skills for freelancing marketplaces and local jobs');
    const text = compact(await hero.textContent());
    expect(text).not.toMatch(/For every 100 women offered a place|WSDFM program records:|not from these records/);
    await expect(hero.locator('[data-plain-line]')).toHaveCount(0);
    await expect(page.locator('[data-plain-line]'), 'the plain-language line is not on this page at all (the evaluation page keeps it)').toHaveCount(0);
    await expect(hero.locator('.cs__stat')).toHaveCount(3);
    expect(await texts(page, '.hero .cs__stat .stat__value')).toEqual(['711 of 1,000', '+10.3 percentage points', '+41%']);
  });

  test('the one line names the two kinds of evidence and sits directly above the tiles, in the same row group', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, URL);
    const note = page.locator('.hero [data-hero-note]');
    await expect(note).toHaveCount(1);
    await expect(note).toHaveText('Program records and a separate randomized trial of the predecessor program.');
    expect(await note.evaluate((e) => e.parentElement?.className ?? '')).toContain('hero__stats');
    expect(await note.evaluate((e) => e.nextElementSibling?.className ?? '')).toContain('cs__stat');
    const [noteBox, firstTile, button] = await Promise.all([note.boundingBox(), page.locator('.hero .cs__stat').first().boundingBox(), page.locator('.hero .hero__actions a').boundingBox()]);
    expect(noteBox!.y + noteBox!.height, 'the line is above the first tile').toBeLessThanOrEqual(firstTile!.y + 1);
    expect(firstTile!.y - (noteBox!.y + noteBox!.height), 'and close to it').toBeLessThan(40);
    expect(button!.y, 'the button stays above both').toBeLessThan(noteBox!.y);
    // each tile still carries its own evidence tag
    expect(await page.locator('.hero .cs__stat').evaluateAll((els) => els.map((e) => e.querySelector('[data-evidence]')?.getAttribute('data-evidence')))).toEqual(['Program Record', 'Randomized Trial', 'Randomized Trial']);
    await page.setViewportSize(MOBILE);
    await open(page, URL);
    expect(await noOverflow(page), '390px').toBe(true);
  });

  test('the detailed results and the chart stay further down; the Independent Evaluation page still carries the plain-language line, once', async ({ page }) => {
    await open(page, URL);
    const results = page.locator('#results');
    await expect(results.getByRole('heading', { level: 3, name: 'What the Randomized Trial Found' })).toHaveCount(1);
    expect(compact(await results.textContent())).toContain('711 of 1,000');
    await expect(results.locator('[data-fact="RC-09"]')).toContainText('Employment Status at Follow-Up');
    await expect(results.getByRole('link', { name: 'Read the Randomized Trial Results' })).toHaveCount(1);
    await open(page, 'impact/independent-evaluation/');
    await expect(page.locator('[data-plain-line]')).toHaveCount(1);
    expect(compact(await page.locator('[data-plain-line]').textContent())).toBe('For every 100 women offered a place, about 10 more were in work at follow-up than among 100 comparable women in the control group (+10.3 percentage points).');
  });
});

test.describe('JobReady Platform: the roadmap item is said once (item 6)', () => {
  test('"Planned Adaptive Learning" keeps its heading and has one sentence under it; the card and its heading are gone', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    await expect(page.locator('#roadmap h2')).toHaveText('Planned Adaptive Learning');
    await expect(page.locator('#roadmap h3, #roadmap .card')).toHaveCount(0);
    const body = page.locator('#roadmap p');
    await expect(body).toHaveCount(1);
    await expect(body).toHaveText('Planned: personalized and adaptive learning based on TalentLEAP’s competency levels. This is roadmap, not live.');
    expect(await body.getAttribute('data-fact')).toBe('IN-06');
    expect(fact('IN-06').text).toContain('the basis for AI-driven personalized and adaptive learning (roadmap)');
    expect(await mainText(page)).not.toContain('Planned Personalized and Adaptive Learning');
    expect(await texts(page, '.lf-toc nav a')).toContain('Planned Adaptive Learning');
  });
});

test.describe('Contact: the third group is "Educate, Hire or Train" (item 7)', () => {
  test('the group headings, with the group holding the universities, employers and schools', async ({ page }) => {
    await open(page, 'contact/');
    expect(await texts(page, '.ct-group h3')).toEqual(['Partner or Fund', 'Educate, Hire or Train', 'Study or Contact the Media']);
    for (const h of await texts(page, '.ct-group h3')) expect(h, h).toBe(titleCase(h));
    const group = page.locator('.ct-group', { has: page.getByRole('heading', { level: 3, name: 'Educate, Hire or Train' }) });
    expect(await group.locator('h4').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()))).toEqual(['Universities and Colleges', 'Employers: Train Your Team', 'Employers: Hire Talent', 'Schools and Education Partners']);
    expect(await mainText(page)).not.toMatch(/(^|[^,] )Hire or Train/);
  });
});

test.describe('Our Model: one slogan for the one path, and who agrees the tracking plan (items 9 and 12)', () => {
  test('the H1 is Home’s phrase for the one path, with the outcomes line; the meta title is unchanged', async ({ page }) => {
    await open(page, 'our-model/');
    const h1 = 'One Path from Learning to Earning, with Outcomes Tracked';
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
    expect(h1).toBe(titleCase(h1));
    expect(h1).not.toMatch(/\.$/);
    await expect(page).toHaveTitle(/^Our Model/);
    expect(await mainText(page)).not.toContain('Assessment to Career');
    await open(page, '');
    await expect(page.locator('#mechanism h2').first()).toHaveText('One Path from Learning to Earning');
  });

  test('the path lead is two sentences: each stage prepares learners for the next; partners agree an outcome-tracking plan for every supported cohort before delivery begins', async ({ page }) => {
    await open(page, 'our-model/');
    await expect(page.locator('#path .sh__lead')).toHaveText('Each stage prepares learners for the next. Partners agree an outcome-tracking plan for every supported cohort before delivery begins.');
    expect(await mainText(page)).not.toContain('every supported cohort agrees an outcome-tracking plan');
  });
});

test.describe('Home: the government slide is second (item 10)', () => {
  test('the carousel runs trial, government scale, survey, program results, speed, reach, programs; the government slide’s text and links are unchanged', async ({ page }) => {
    await open(page, '');
    expect(await texts(page, '#results [data-hs-slide] h2')).toEqual([
      // WP48 (cycle-23 review): the heading names the predecessor program
      'Women Offered a Place in a Predecessor Program Earned an Estimated 41% More',
      'Six Government Contracts and a National University Partnership',
      'Surveyed Completers Report Higher Income',
      'Results by Program',
      // WP46 (cycle-22 review, owner answer 2026-10-15): the six months are counted from the end of the course; WP48 (cycle-23 review, item 32): "by", because OC-05 is cumulative and includes those who first earned during the course
      'Most Had Started Earning by Six Months After the Course',
      'Programs in 15 Countries and Territories',
      'Find Your Program',
    ]);
    const slides = page.locator('#results [data-hs-slide]');
    await expect(slides.nth(1)).toHaveAttribute('aria-label', '2 of 7: Six Government Contracts and a National University Partnership');
    await expect(slides.nth(6)).toHaveAttribute('aria-label', /^7 of 7: Find Your Program/);
    const gov = slides.nth(1);
    await expect(gov.locator('.hs__eyebrow')).toHaveText('Government and University Partners');
    // WP46 (cycle-22 review): the note says who trained whom, and the last sentence names its subject ("CodersTrust is the official training partner of ...")
    // WP48 (cycle-23 review): the body is two sentences; the contract scope carries the clause "contract scope, not a count of completers" and the 25,125 and 2,500 are off the slide (tests/wp48.spec.ts)
    await expect(gov.locator('.hs__lead')).toHaveText('Six government contracts with training and curriculum work scoped for 31,200+ people: contract scope, not a count of completers. CodersTrust is the official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners.');
    expect(await gov.locator('h2').getAttribute('data-fact')).toBe('GV-12');
    expect(await gov.locator('.hs__actions a').evaluateAll((els) => els.map((a) => ({ text: (a.textContent ?? '').trim(), href: a.getAttribute('href') ?? '' })))).toEqual([
      { text: 'For Governments', href: expect.stringMatching(/\/partner-with-us\/governments\/$/) },
      { text: 'For Universities', href: expect.stringMatching(/\/partner-with-us\/universities\/$/) },
    ]);
  });

  test('the carousel keeps one height box and every slide stays inside it at 1280 and 390, and the slide that moved is reachable by its dot', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const heights = await page.locator('#results [data-hs-slide]').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).offsetHeight)));
      expect(new Set(heights).size, `${vp.width}px: every slide has the same height`).toBe(1);
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      const scroll = await page.locator('#results [data-hs-slide]').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).scrollHeight)));
      for (const h of scroll) expect(h, `${vp.width}px`).toBeLessThanOrEqual(track + 1);
      await page.locator('[data-hs-dot]').nth(1).click();
      await expect(page.locator('#results [data-hs-slide].is-active h2')).toHaveText('Six Government Contracts and a National University Partnership');
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Development Partners: the >4x tile quotes the multiplier only (item 11)', () => {
  test('the tile’s label gives the nine-trial average and does not repeat the +10.3 percentage points of the lead tile', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const tile = page.locator('#glance .pg__more a[data-fact="RC-06a"]');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.pg__value')).toHaveText('>4×');
    // WP48 (cycle-23 review): the label says what is compared ("The employment effect for women offered a place, against the 2.3-point average across nine vocational-training trials"); it was "Employment effect over four times the nine-trial average".
    // The note under it ("Against 2.3 percentage points on average across nine vocational-training trials.") repeated the label, so the tile has no note.
    await expect(tile.locator('.pg__desc')).toHaveText('The employment effect for women offered a place, against the 2.3-point average across nine vocational-training trials');
    await expect(tile.locator('.pg__note')).toHaveCount(0);
    expect(compact(await tile.textContent())).not.toMatch(/10\.3|\+10/);
    // the +10.3 is stated once in the glance: the lead tile
    const glance = compact(await page.locator('#glance').textContent());
    expect(count(glance, '10.3'), 'the 10.3 is the lead tile’s alone').toBe(1);
    await expect(page.locator('#glance .pg__lead a[data-fact="RC-02"]')).toContainText('+10.3 percentage points');
  });

  test('the register’s wording (RC-06a): the average is 2.3 percentage points across nine trials, and the glance label says so without a repeating note', () => {
    const rc06a = fact('RC-06a');
    expect(rc06a.text).toContain('which was 2.3 percentage points');
    expect(rc06a.stat?.glance?.label).toBe('The employment effect for women offered a place, against the 2.3-point average across nine vocational-training trials');
    expect(rc06a.stat?.glance?.note).toBeUndefined();
  });
});

test.describe('Home: the comparison table is one style (item 13)', () => {
  test('every cell is a fragment with no trailing period, in sentence case, in CodersTrust’s column and the comparison column alike', async ({ page }) => {
    await open(page, '');
    const rows = await page.locator('#compare tbody tr').evaluateAll((trs) => trs.map((tr) => Array.from(tr.querySelectorAll('th, td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())));
    expect(rows).toEqual([
      ['Mentoring', 'Three months of milestone-based mentoring', 'Varies; often self-directed'],
      ['Work Entry', 'Placement support into local, remote and global work', 'Work-entry support depends on the provider and package'],
      ['Outcome Tracking', 'Planned for every cohort: follow-up surveys at 3, 6 and 12 months; monthly reports', 'Reporting emphasis varies; check whether employment outcomes are included'],
      ['Independent Evidence', 'One randomized trial of a predecessor program (200 hours, women in Dhaka); independent evaluation of your cohort welcome', 'Varies'],
    ]);
    for (const [, ...cells] of rows) {
      for (const cell of cells) {
        expect(cell, `"${cell}" has no trailing period`).not.toMatch(/\.$/);
        expect(cell, `"${cell}" starts with a capital letter`).toMatch(/^[A-Z]/);
        // sentence case: no run of three capitalized words (Title Case)
        expect(cell, `"${cell}" is not Title Case`).not.toMatch(/\b[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+\b/);
      }
    }
    // the row and column headings stay Title Case (they are headings)
    for (const h of await texts(page, '#compare th')) expect(h, h).toBe(titleCase(h));
  });
});

test.describe('Impact: the jump list names the goals heading in full (item 15)', () => {
  test('the last "On This Page" entry is the H2 it jumps to, and the others still open their headings', async ({ page }) => {
    await open(page, 'impact/');
    const links = await page.locator('nav[aria-label="On this page"] a').evaluateAll((els) => els.map((a) => ({ label: (a.textContent ?? '').replace(/\s+/g, ' ').trim(), id: (a.getAttribute('href') ?? '').replace(/^.*#/, '') })));
    const goals = links[links.length - 1];
    expect(goals).toEqual({ label: 'Seven Global Goals, Three at the Core', id: 'sdg' });
    await expect(page.locator('#sdg-h')).toHaveText(goals.label);
    expect(goals.label).toBe(titleCase(goals.label));
    for (const l of links.filter((x) => x.id !== 'summary')) {
      const h2 = compact(await page.locator(`#${l.id} h2`).first().textContent());
      expect(h2.startsWith(l.label), `"${l.label}" is the start of "${h2}"`).toBe(true);
    }
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, 'impact/');
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('the facts gate carries the two WP42 allowances', () => {
  test('npm run check:facts passes on the build: four pages declare a whole positioning statement, one page carries the plain-language line, one is exempt from it', () => {
    const out = execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/check-facts.mjs'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toContain('check-facts: OK');
    expect(out).toMatch(/\[PLAIN-LINE\] on 1 page\(s\)/);
    expect(out).toMatch(/\[POSITION\] opens C6 on 11 page\(s\)/);
  });
});
