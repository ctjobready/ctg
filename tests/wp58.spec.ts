import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact, sources } from '../src/data/facts';
import { CONTRACT_TOTAL_NOTE, ORIGIN_SHORT, SOURCE_NOTE, TRAINED_REACH, originShortUnder } from '../src/data/copy';
import { locations } from '../src/data/countries';
import { DIST_DIR } from './support/env';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP58 behaviors (cycle-30 whole-site reviews: Claude S1, S5, S7 to S11; GPT-6.1 Sol G1, G5, G6, G7; Kimi K5; GLM L3, L4, L7; Gemini GM1; Grok R1, R3; and the owner decision of 2026-10-19, K3). Retrospective coverage (the owner exempted this project
 * from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp58.spec.ts --project=chromium`):
 *   - S1 (with G1 and L7, extended to the other statements of the 16): "16 countries and territories" says where CodersTrust has worked, not where it delivered programs: SC-03 "CodersTrust has worked in 16 countries and territories ..." (tile label
 *     "countries and territories where CodersTrust has worked", detail "Most delivery has been in Bangladesh."), SC-16 "... enrollments since 2014, with work in 16 countries and territories", no "Delivered" tag on an SC-03 tile (Programs and
 *     Investors carry a "Since 2014" badge instead), About's and Global Reach's meta descriptions, Global Reach's "Where We Have Worked" eyebrow, map caption and note, the menu's description, and the origin line, the trained-reach block and
 *     YouthWIDE's FAQ answer ("work", not "programs");
 *   - S5 (with K2 and L1): Home's cost card names its source inside the sentence, "(Demirci, Hannane & Zhu, 2025)" (PX-06, DHZ25);
 *   - S7: every Kosovo year label reads 2016–2017;
 *   - S8 (with G4) is REVERSED: owner decision 7 ("show both") takes precedence, so Home's Kosovo card keeps the program records and the World Bank line;
 *   - S9: About no longer prints the "As covered by" press line (Home keeps it);
 *   - S10: "Progress You Can Check" (Home) and "Progress Your Evaluators Can Check" (Development Partners);
 *   - S11: Investors' third thesis card is "AI Skills Are in Rising Demand";
 *   - G5: Foundations' +$27 tile says "compared with the control group";
 *   - G6: Development Partners' Adrian Afraham card has no summary line above his quotation;
 *   - G7: TalentLEAP's results paragraph says "The figures in At a Glance above ...";
 *   - K5: the closing bands of the Impact pages said "A discovery session agrees your priority groups, tracks and the pilot scorecard." (WP59, GPT-6.1 Sol G2: "A discovery session explores your goals, priority groups and possible program scope.", tests/wp59.spec.ts);
 *   - L3: Foundations' glance opens with the +10.3 trial tile and ends with the +$27 tile;
 *   - L4: Universities' second pain is "Placement Results Are Hard to Publish";
 *   - GM1: the contract-total note says "(25,125 women trained; CodersTrust trained 2,500 directly)" on Home's government slide and the Governments tile;
 *   - R1 (Grok): the Denmark row's target-group and skills cells are "—";
 *   - R3 (Grok): Home slide 4's Her Power line is "Her Power: 372 of 800 tracked in work (47%); 2,500 trained directly." (built from PR-05, on one row at 1280 px);
 *   - K3 (owner decision 2026-10-19): the six-contract total is 30,000+ (SC-06 and GV-12), on every page that shows it.
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
/** Pages that render SC-03 anywhere (found in the build, so no route is typed here). */
const SC03_PAGES = listPages().filter((p) => /data-fact="[^"]*\bSC-03\b[^"]*"/.test(readFileSync(p.file, 'utf8')));

const HOME = '';
const ABOUT = 'about/';
const PROGRAMS = 'programs/';
const INVESTORS = 'partner-with-us/investors/';
const DP = 'partner-with-us/development-partners/';
const GOVERNMENTS = 'partner-with-us/governments/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const UNIVERSITIES = 'partner-with-us/universities/';
const HUB = 'partner-with-us/';
const IMPACT = 'impact/';
const GLOBAL_REACH = 'impact/global-reach/';
const TALENTLEAP = 'our-model/talentleap/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S1, G1 and L7: "16 countries and territories" is where CodersTrust has worked', () => {
  test('the register: SC-03 says "has worked" (text, tile label and detail); SC-16 separates the learners trained from the work in 16 countries and territories', () => {
    const sc03 = fact('SC-03');
    expect(sc03.stat?.value).toBe('16');
    expect(sc03.text).toBe('CodersTrust has worked in 16 countries and territories across Asia, Africa, Europe and the Americas, including Bangladesh since 2014');
    expect(sc03.stat?.label).toBe('countries and territories where CodersTrust has worked');
    expect(sc03.stat?.detail).toBe('Most delivery has been in Bangladesh.');
    const sc16 = fact('SC-16');
    // WP59 (cycle-31 review, GLM L3): two sentences (tests/wp59.spec.ts); the glance label and note below are unchanged
    expect(sc16.text).toBe('130,000+ learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories');
    expect(sc16.stat?.label).toBe('learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories.');
    expect(sc16.stat?.glance?.label).toBe('learners trained since 2014');
    expect(sc16.stat?.glance?.note).toBe('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
  });

  test('no built page outside the archived posts still says the learners were trained or enrolled "in 16 countries", that the countries are ones "with CodersTrust programs", or the old SC-03 wording', () => {
    const STALE = [
      /enrollments (?:in|across) 16 countries and territories/i,
      /youth for digital work in 16 countries/i,
      /with CodersTrust programs, including Bangladesh/i,
      /Bangladesh plus 15 other countries and territories/i,
      /Programs in 16 countries and territories across/i,
      /Programs in 16 countries and territories:/i,
    ];
    const hits = sitePages().flatMap((p) => STALE.filter((re) => re.test(p.html)).map((re) => `${p.route}: ${re}`));
    expect(hits).toEqual([]);
  });

  // WP61 (cycle-33 review, Kimi P1): the badge on the 16 says "Where We Have Worked" (it said "Since 2014"; the band heading already says it)
  test('Programs: the 130,000+ keeps its "Delivered" tag and the 16 carries the badge "Where We Have Worked", level with it, with no status', async ({ page }) => {
    await open(page, PROGRAMS);
    const tiles = page.locator('#reach .hub__reach > div');
    await expect(tiles).toHaveCount(2);
    expect(await texts(page, '#reach .status-tag')).toEqual(['Delivered']);
    await expect(tiles.nth(0).locator('.factstat')).toHaveAttribute('data-fact', 'SC-01');
    await expect(tiles.nth(0).locator('.status-tag')).toHaveCount(1);
    await expect(tiles.nth(1).locator('.factstat')).toHaveAttribute('data-fact', 'SC-03');
    await expect(tiles.nth(1).locator('[data-status]')).toHaveCount(0);
    await expect(tiles.nth(1).locator('.badge')).toHaveText('Where We Have Worked');
    expect(compact(await tiles.nth(1).locator('.stat__label').textContent())).toBe('countries and territories where CodersTrust has worked');
    expect(compact(await tiles.nth(1).locator('.stat__note').textContent())).toBe('Most delivery has been in Bangladesh.');
    // the two figures start level (the period badge is as tall as the status tag)
    const tops = await page.locator('#reach .stat__value').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops[0], 'the 130,000+ and the 16 start on the same line').toBe(tops[1]);
  });

  test('Investors: the learners and the enrollments keep "Delivered"; the 16 carries "Where We Have Worked" (WP61) and no status; the label and the note read "where CodersTrust has worked" and "Most delivery has been in Bangladesh."', async ({ page }) => {
    await open(page, INVESTORS);
    expect(await texts(page, '#guide .ig__tile .status-tag')).toEqual(['Delivered', 'Delivered']);
    const sc03 = page.locator('#guide .ig__tile[data-fact="SC-03"]');
    await expect(sc03).toHaveCount(1);
    await expect(sc03.locator('[data-status]')).toHaveCount(0);
    await expect(sc03.locator('.badge')).toHaveText('Where We Have Worked');
    expect(await texts(page, '#guide .ig__tile .stat__label')).toEqual(['learners trained', 'enrollments', 'countries and territories where CodersTrust has worked']); // WP64 (cycle-36 review, Grok): the group heading says "Since 2014", so the tiles do not
    expect(compact(await page.locator('#guide .ig__notes').textContent())).toBe('Of 150,000+ enrollments, 112,926 were direct. The other 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125, so counted once the total is 150,678. Most delivery has been in Bangladesh.');
    const tops = await page.locator('#guide .ig__tile .stat__value').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'the three figures start on the same line').toBe(1);
  });

  for (const p of SC03_PAGES) {
    test(`${p.route}: no status tag ("Delivered" or any other) belongs to an SC-03 tile`, async ({ page }) => {
      await open(page, p);
      const tagged = await page.locator('.status-tag').evaluateAll((tags) =>
        tags
          .filter((t) => Boolean(t.closest('[data-fact~="SC-03"]')) || Boolean(t.nextElementSibling?.matches('[data-fact~="SC-03"]')) || Boolean(t.parentElement?.querySelector(':scope > [data-fact~="SC-03"]')))
          .map((t) => (t.textContent ?? '').trim()),
      );
      expect(tagged, `${p.route} tags on SC-03 tiles`).toEqual([]);
    });
  }

  test('the SC-03 tile reads the same on About, Careers and Development Partners (label and detail), without "including Bangladesh"', async ({ page }) => {
    for (const route of [ABOUT, 'careers/', DP, 'programs/youthwide/']) {
      await open(page, route);
      const tile = page.locator('.factstat[data-fact="SC-03"]').first();
      await expect(tile.locator('.stat__value'), route).toHaveText('16');
      expect(compact(await tile.locator('.stat__label').textContent()), route).toBe('countries and territories where CodersTrust has worked');
    }
  });

  // WP59 (cycle-31 review, GLM L3): Home’s reach card carries the register’s label, now two sentences ("... enrollments since 2014. CodersTrust has worked in 16 countries and territories."); the Impact and hub tiles keep the glance note
  // WP62 (cycle-34 review, Gemini): the card’s eyebrow is "Reach Since 2014", so its caption drops the repeated "since 2014" (tests/wp62.spec.ts); the register’s label is unchanged
  test('SC-16 reads "... enrollments. CodersTrust has worked in 16 countries and territories." on Home’s reach card; the Impact tile (which keeps "Delivered") and the hub’s "Why Partner" tile keep the note "..., with work in 16 countries and territories."', async ({ page }) => {
    await open(page, HOME);
    expect(compact(await page.locator('.hh__card[data-fact="SC-16"]').textContent())).toContain('learners trained through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
    await open(page, IMPACT);
    const tile = page.locator('#glance a[data-fact~="SC-16"]');
    // WP92 (triage A4): the Impact Delivered tile's note is its own, "Through 150,000+ enrollments." (the 16 countries sentence stays on Global Reach and the other pages)
    expect(compact(await tile.locator('.glance__note').textContent())).toBe('Through 150,000+ enrollments.');
    await expect(tile.locator('.status-tag')).toHaveText('Delivered');
    await open(page, HUB);
    expect(compact(await page.locator('#why-partner li[data-fact="SC-16"]').textContent())).toContain('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
  });

  test('About’s meta description says the count is where CodersTrust has worked ("..., with work in 16 countries and territories."), within 155 characters, in the page and its structured data', async ({ page }) => {
    await open(page, ABOUT);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe('New York-headquartered CodersTrust has trained educated, unemployed and underemployed youth for digital work, with work in 16 countries and territories.'); // WP63 (cycle-35 review, Grok R6)
    expect(description!.length).toBeLessThanOrEqual(155);
    expect(description, 'the 16 is not attached to the training').not.toMatch(/(?:trained|youth|digital work) in 16 countries/);
    expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(description);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('with work in 16 countries and territories.');
    expect(ld).not.toContain('for digital work in 16 countries');
  });

  test('Global Reach: the lead is SC-03’s sentence and the meta description begins the same way, within 155 characters; the H1 and the title are unchanged', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    await expect(page.locator('main h1')).toHaveText('Where We Have Worked: 16 Countries and Territories');
    expect(compact(await page.locator('main .hero__lead').first().textContent())).toBe('CodersTrust has worked in 16 countries and territories across Asia, Africa, Europe and the Americas, including Bangladesh since 2014.');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe('CodersTrust has worked in 16 countries and territories: Bangladesh since 2014 and 15 international locations, with each location’s target group and skills.');
    expect(description!.length).toBeLessThanOrEqual(155);
    expect(await page.title()).toContain('Global Reach: 16 Countries and Territories');
  });

  test('Global Reach: the map section’s eyebrow, the map’s caption, its accessible name and the table’s name say "Where We Have Worked" / "Locations table"; no page says "Where Programs Have Run"', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    expect(compact(await page.locator('#map .eyebrow').first().textContent())).toBe('Where We Have Worked');
    expect(await page.locator('svg.wmap__svg').getAttribute('aria-label')).toBe('Where We Have Worked: 16 locations. A table with the same information follows.');
    expect(compact(await page.locator('.wmap__cap').textContent())).toMatch(/^Where We Have Worked\. Hover or tap a pin for details\./);
    expect(compact(await page.locator('.wmap__table caption').textContent())).toBe('Where We Have Worked');
    expect(await page.locator('.wmap__table').getAttribute('aria-label')).toBe('Locations table');
    for (const p of sitePages()) expect(p.html, p.route).not.toMatch(/Programs Have Run|Program locations table/);
  });

  // WP60 (cycle-32 review, Grok R1): the second sentence said the table "distinguishes training, partnerships and launch activity", which it did not, row by row; it says which rows say what (tests/wp60.spec.ts checks the rows against it)
  test('Global Reach: the note under the map defines a location as a place CodersTrust has worked, says which rows are a partnership, an announced cooperation or the launch and that the others are training programs, and that New York is the headquarters, not one of the 16', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const callout = page.locator('#map .callout');
    expect(compact(await callout.locator('.callout__label').textContent())).toBe('Locations Are Not Programs');
    const p = callout.locator('p[data-fact="SC-03"]');
    await expect(p).toHaveCount(1);
    expect(compact(await p.textContent())).toBe(
      'A location is a country or territory where CodersTrust has worked; most rows do not say how many programs ran there, or how large they were. Rows that are a partnership, an announced cooperation or the launch say so in their note; the other rows are training programs. New York is the headquarters, not one of the 16 locations. Most delivery has been in Bangladesh.',
    );
    // the 16 is the register's, and the table the note speaks of lists that many rows
    await expect(page.locator('.wmap__table tbody tr')).toHaveCount(Number(fact('SC-03').stat?.value));
  });

  test('llms.txt states SC-03’s sentence on its fourth line, and the menu describes Global Reach as "Where we have worked."', async ({ page, request }) => {
    const lines = (await (await request.get('llms.txt')).text()).split('\n');
    expect(lines[3]).toBe('CodersTrust has worked in 16 countries and territories across Asia, Africa, Europe and the Americas, including Bangladesh since 2014.');
    await open(page, HOME);
    const header = compact(await page.locator('header').first().textContent());
    expect(header).toContain('Global Reach Where we have worked.');
    expect(header).not.toContain('Where our programs have run');
  });

  test('the Home world strip’s Bangladesh tile says SC-03’s detail as registered', async ({ page }) => {
    await open(page, HOME);
    const last = page.locator('main [data-world-strip] [data-tile="bangladesh"]');
    expect(compact(await last.locator('figcaption').textContent())).toBe('Bangladesh, since 2014. Most delivery has been in Bangladesh.');
    expect(await last.getAttribute('data-fact')).toBe('SC-03');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S5: the PX-06 sentence names its source inside it', () => {
  test('SOURCE_NOTE reads PX-06’s note from its registered source (DHZ25), and the register’s own wording is unchanged', () => {
    expect(SOURCE_NOTE['PX-06']).toBe('(Demirci, Hannane & Zhu, 2025)');
    expect(fact('PX-06').sourceIds).toEqual(['DHZ25']);
    expect(sources.DHZ25.citation).toContain('Demirci, Hannane & Zhu');
    expect(sources.DHZ25.citation).toContain('2025');
    expect(fact('PX-06').text).not.toContain('Demirci');
  });

  test('Home’s cost-of-waiting card ends its sentence "... of ChatGPT’s release (Demirci, Hannane & Zhu, 2025).", still tied to PX-06, with no footnote or source list', async ({ page }) => {
    await open(page, HOME);
    const data = page.locator('#cost article').first().locator('.cost__data');
    expect(compact(await data.textContent())).toBe(
      'On one major freelancing platform, automation-prone writing and coding postings fell 21% relative to manual-intensive jobs within eight months of ChatGPT’s release (Demirci, Hannane & Zhu, 2025).',
    );
    expect(await data.getAttribute('data-fact')).toBe('PX-06');
    expect(await page.locator('#cost sup, #cost .fn, #cost [role="doc-footnote"]').count()).toBe(0);
  });

  test('the note is in the card’s sentence only: no title or meta description carries it, and no built page prints the study twice', () => {
    const hits = sitePages().filter((p) => (p.html.match(/Demirci, Hannane &amp; Zhu, 2025/g) ?? []).length > 1 || /<title>[^<]*Demirci|name="description" content="[^"]*Demirci/.test(p.html));
    expect(hits.map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S7: every Kosovo year label reads 2016–2017', () => {
  test('Impact’s Kosovo tile says "A 2016–2017 pilot with the World Bank Group." before the World Bank’s own line', async ({ page }) => {
    await open(page, IMPACT);
    const note = page.locator('#glance a[data-fact~="PR-02"] .glance__note');
    expect(compact(await note.textContent())).toBe('A 2016–2017 pilot with the World Bank Group. World Bank: 77 trainees won at least one online contract.');
  });

  test('the case-study cards, the case study, the learner story and the stories index say 2016–2017, and no built page labels the Kosovo pilot or program "2017"', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    expect(compact(await page.locator('main').textContent())).toContain('World Bank Group; Kosovo, 2016–2017');
    await open(page, 'impact/case-studies/kosovo-women-in-online-work/');
    const main = compact(await page.locator('main').textContent());
    expect(main).toContain('World Bank Group, 2016–2017');
    expect(main).toContain('Women in Online Work was a pilot with the World Bank Group in 2016–2017.');
    expect(main).toContain('Women in Online Work, Kosovo, 2016–2017');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe('Women in Online Work, a 2016–2017 pilot in Kosovo with the World Bank Group: 102 of the 150 women trained were in work (68%).');
    await open(page, 'impact/stories/');
    expect(compact(await page.locator('main').textContent())).toContain('Women in Online Work, Kosovo, 2016–2017');
    const STALE = [/\bA 2017 pilot\b/, /\ba 2017 pilot\b/, /World Bank Group; Kosovo, 2017/, /World Bank Group, 2017\b/, /Women in Online Work, Kosovo, 2017/, /pilot with the World Bank Group in 2017/];
    const hits = sitePages().flatMap((p) => STALE.filter((re) => re.test(visible(p.html))).map((re) => `${p.route}: ${re}`));
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S8 is reversed (b): owner decision 7, "show both", takes precedence, so Home’s Kosovo card keeps both figures', () => {
  // Claude S8 asked for the card to show neither Kosovo figure, on the ground that slide 4 states both. It states only the program records ("102 of 150"); the World Bank's 77 is on Home in this card alone, so removing the card's lines
  // would have left the program records on Home without the World Bank's figure beside them. The item was reversed; tests/wp57.spec.ts (GM4) holds the card's wording, and these tests pin the reason.
  test('the card still reads the program records and the World Bank line, each tied to its own fact; slide 4 gives the program records alone', async ({ page }) => {
    await open(page, HOME);
    const card = page.locator('#cases article', { hasText: 'Women in Online Work, Kosovo' });
    await expect(card.locator('.case__context')).toHaveText('Program records, 2016–2017: 102 of the 150 women trained were in work.');
    expect(await card.locator('.case__context').getAttribute('data-fact')).toBe('PR-02 TL-04');
    await expect(card.locator('.case__note')).toHaveText('World Bank: 77 trainees won at least one online contract.');
    expect(await card.locator('.case__note').getAttribute('data-fact')).toBe('PR-02b');
    const slide4 = compact(await page.locator('#results').textContent());
    expect(slide4).toContain('Women in Online Work, Kosovo (2016–2017): 68% in work (102 of 150).');
    expect(slide4, 'the World Bank’s 77 is not on slide 4').not.toContain('77 trainees');
    expect(compact(await page.locator('main').textContent()).split('77 trainees').length - 1, 'the World Bank’s figure is on Home in the card alone').toBe(1);
  });

  test('the other pages that show a Kosovo figure still show both', async ({ page }) => {
    for (const route of [DP, 'programs/youthwide/', IMPACT, FOUNDATIONS, GOVERNMENTS]) {
      await open(page, route);
      const main = compact(await page.locator('main').textContent());
      expect(main, route).toContain('102 of 150');
      expect(main, route).toMatch(/77 trainees/);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S9: the press line is not repeated on About', () => {
  // WP62 (cycle-34 review, Kimi, GPT-6.1 Sol and Gemini): Home’s line is one pointer sentence to Recognition and Media, with no outlet links of its own; the rework (R1, R2) prints the full line on Recognition and Media and the pointer names both places (tests/wp55.spec.ts)
  test('About’s recognition band has the HolonIQ sentence and the link to Recognition and Media only; Home keeps the "Early press coverage" line, as a pointer to that page', async ({ page }) => {
    await open(page, ABOUT);
    const about = page.locator('#recognition');
    expect(await texts(page, '#recognition .about-rec > *')).toEqual(['CodersTrust was listed in the HolonIQ South Asia EdTech 100 in 2023 (STEAM category) and 2024.', 'Recognition and Media']);
    await expect(about.locator('.cov')).toHaveCount(0);
    await expect(about.locator('a[href^="http"]')).toHaveCount(0);
    expect(compact(await page.locator('main').textContent())).not.toMatch(/Early press coverage|World Bank coverage/);
    await open(page, HOME);
    const home = page.locator('#recognition .cov');
    await expect(home).toHaveCount(1);
    const homeLine = await home.evaluate((el) => {
      const c = el.cloneNode(true) as HTMLElement;
      c.querySelectorAll('.sr-only').forEach((n) => n.remove());
      return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
    });
    expect(homeLine).toBe('Early press coverage, 2014–2016, and World Bank coverage of our work in Kosovo and Albania are on the Recognition and Media page.');
    expect(await home.locator('a').count()).toBe(0);
  });

  test('Recognition and Media keeps its press list (the outlets with their logos), tied to PA-09', async ({ page }) => {
    await open(page, 'about/recognition/');
    const list = page.locator('ul.rec-press');
    await expect(list).toHaveCount(1);
    expect(await list.getAttribute('data-fact')).toBe('PA-09');
    expect(await list.locator('li').count()).toBeGreaterThanOrEqual(7);
    await expect(list.locator('img[alt="Forbes logo"]')).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S10 and S11: headings', () => {
  test('Home’s second card is "Progress You Can Check" (and no page says "Results You Can Check"); the line under it is unchanged', async ({ page }) => {
    await open(page, HOME);
    expect(await texts(page, '#features .card__title')).toEqual(['Training, Mentoring and Placement Support', 'Progress You Can Check', 'Tracks Chosen from Employer Demand']);
    const card = page.locator('#features li.card', { has: page.locator('h3', { hasText: 'Progress You Can Check' }) });
    expect(compact(await card.locator('.card__text').textContent())).toBe('Monthly reports will show progress toward paid work, as agreed in the program scope.');
    expect(await card.getAttribute('data-fact')).toContain('PD-08');
    const hits = sitePages().filter((p) => /Results You Can Check|Results Your Evaluators Can Check/.test(visible(p.html))).map((p) => p.route);
    expect(hits).toEqual([]);
  });

  test('Development Partners’ third card is "Progress Your Evaluators Can Check", tied to PD-08 and PD-09', async ({ page }) => {
    await open(page, DP);
    expect(await texts(page, '#features .card__title')).toEqual(['Training, Mentoring and Placement Support', 'Accessible Local Delivery', 'Progress Your Evaluators Can Check']);
    const card = page.locator('#features li.card', { has: page.locator('h3', { hasText: 'Progress Your Evaluators Can Check' }) });
    expect(await card.getAttribute('data-fact')).toBe('PD-08 PD-09');
    for (const h of ['Progress You Can Check', 'Progress Your Evaluators Can Check']) expect(h).toBe(titleCase(h));
  });

  test('Investors’ third thesis card is "AI Skills Are in Rising Demand" over PX-08 (with its source note), in Title Case', async ({ page }) => {
    await open(page, INVESTORS);
    expect(await texts(page, '#thesis .card__title')).toEqual(['Young People Need Work and Employers Need Skills', 'Connect Learning to Paid Work', 'AI Skills Are in Rising Demand']);
    expect(compact(await page.locator('#thesis .th__more[data-fact="PX-08"]').textContent())).toBe('Globally, jobs requiring AI skills grew 69% vs. 9% for all jobs, with a 62% wage premium (PwC, 2026).');
    expect('AI Skills Are in Rising Demand').toBe(titleCase('AI Skills Are in Rising Demand'));
    expect(sitePages().filter((p) => visible(p.html).includes('AI Is Raising the Bar for Entry Work')).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G5 and L3: Foundations’ Results at a Glance', () => {
  // WP62 (cycle-34 review, Grok, GPT-6.1 Sol and Gemini): the +$27 tile left the glance (a program record is the fourth tile; tests/wp62.spec.ts; WP65, cycle-37 review: the UNDP YES, Korail record); RC-04’s register wording is unchanged
  test('RC-04’s caption still reads "... in a predecessor program, compared with the control group" (the $66 mean stays in the register’s text only); Foundations’ glance no longer shows it', async ({ page }) => {
    expect(fact('RC-04').stat?.label).toBe('estimated monthly income gain for women offered a place in a predecessor program, compared with the control group');
    expect(fact('RC-04').text).toContain('control-group mean of about $66');
    await open(page, FOUNDATIONS);
    await expect(page.locator('#glance a[data-fact~="RC-04"]')).toHaveCount(0);
    expect(compact(await page.locator('#glance').textContent())).not.toContain('control mean');
  });

  test('the +10.3 trial tile is first and the UNDP YES, Korail program-record tile fourth; the survey and Kosovo tiles keep their places between them; four tiles in a row at 1280, no sideways scroll at 390', async ({ page }) => {
    await open(page, FOUNDATIONS);
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-02', 'OC-03', 'PR-02', 'PR-03']);
    expect(compact(await page.locator('#glance .pg__lead a').first().locator('.pg__value').textContent())).toBe('+10.3 percentage points');
    const tops = await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'four tiles in one row at 1280').toBe(1);
    await page.setViewportSize(MOBILE);
    await open(page, FOUNDATIONS);
    expect(await noOverflow(page)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G6: Development Partners’ Adrian Afraham card', () => {
  test('shows his verbatim quotation, name, program and the individual-story label, without the summary line above it', async ({ page }) => {
    await open(page, DP);
    const card = page.locator('#learner-voice .ls');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.ls__outcome')).toHaveCount(0);
    expect(compact(await card.locator('.eyebrow').textContent())).toBe('Individual Learner Story');
    expect(compact(await card.locator('.ls__excerpt').textContent())).toBe('“Following my completion of the course, I successfully secured my very first freelance job, which was followed by an enticing job offer.”');
    expect(await texts(page, '#learner-voice .ls__name b, #learner-voice .ls__name span')).toEqual(['Adrian Afraham', 'Graphic Designing course, CodersTrust Bangladesh']);
    expect(compact(await card.locator('.ls__caveat').textContent())).toBe('Individual story; not typical or promised.');
    expect(await page.content()).not.toContain('Secured a first freelance job after the Graphic Designing course');
  });

  test('the same story keeps its summary line on the Impact page (the item named Development Partners only), and the other learner cards are unchanged', async ({ page }) => {
    await open(page, IMPACT);
    expect(compact(await page.locator('#learner-voice .ls__outcome').textContent())).toBe('Secured a first freelance job after the Graphic Designing course, followed by a job offer');
    for (const route of [GOVERNMENTS, FOUNDATIONS, 'partner-with-us/employers/', UNIVERSITIES]) {
      await open(page, route);
      await expect(page.locator('#learner-voice .ls__outcome'), route).toHaveCount(1);
    }
  });

  test('the card fits at 1280 and 390 with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, DP);
      await scrollThrough(page);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G7: TalentLEAP’s results paragraph points up, not down', () => {
  test('"The figures in At a Glance above describe CodersTrust programs, not individual TalentLEAP features." keeps the evaluation sentences, and nothing says "The results below"', async ({ page }) => {
    await open(page, TALENTLEAP);
    const results = page.locator('#results');
    expect(compact(await results.locator('p').first().textContent())).toBe(
      'The figures in At a Glance above describe CodersTrust programs, not individual TalentLEAP features. The current 100-hour track has not yet been independently evaluated. A pilot scorecard tracks agreed outcomes; independent evaluation is welcome.',
    );
    expect(compact(await page.locator('main').textContent())).not.toContain('The results below are for CodersTrust programs');
    // At a Glance is above the results section, as the sentence says
    const above = await page.evaluate(() => (document.querySelector('#glance')!.compareDocumentPosition(document.querySelector('#results')!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    expect(above).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WP59 (cycle-31 review, GPT-6.1 Sol G2): the line is now "A discovery session explores your goals, priority groups and possible program scope." (DISCOVERY_SESSION_LINE; tests/wp59.spec.ts); K5's "agrees" wording is on no built page, as the "sets" wording before it was not.
test.describe('K5, revised by WP59 G2: the closing bands say a discovery session "explores" the goals, priority groups and possible program scope', () => {
  const LINE = 'A discovery session explores your goals, priority groups and possible program scope.';
  test('Impact’s closing band, the other Impact pages’ closing bands and TalentLEAP’s next step carry the line; no built page says the session "sets" or "agrees" them', async ({ page }) => {
    await open(page, IMPACT);
    expect(compact(await page.locator('#cta').textContent())).toContain(LINE);
    for (const route of ['impact/independent-evaluation/', 'impact/outcomes-2026/', 'impact/in-the-field/', 'impact/in-the-field/news-photos/', TALENTLEAP]) {
      await open(page, route);
      expect(compact(await page.locator('main').textContent()), route).toContain(LINE);
    }
    const hits = sitePages().filter((p) => /A discovery session (?:sets priority groups|agrees your priority groups), tracks and the pilot scorecard/.test(visible(p.html))).map((p) => p.route);
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L4: Universities’ second pain is a pain', () => {
  test('"Placement Results Are Hard to Publish" keeps the line under it; the goal-framed heading is on no built page', async ({ page }) => {
    await open(page, UNIVERSITIES);
    expect(await texts(page, '#problem .gp__pains .gp__q')).toEqual(['Degree Holders Struggle to Find Work', 'Placement Results Are Hard to Publish']);
    const line = page.locator('#problem .gp__pains li', { has: page.locator('.gp__q', { hasText: 'Placement Results Are Hard to Publish' }) }).locator('.gp__a');
    expect(compact(await line.textContent())).toBe('Your institution needs placement data it can report to a board or ministry.');
    expect('Placement Results Are Hard to Publish').toBe(titleCase('Placement Results Are Hard to Publish'));
    expect(sitePages().filter((p) => visible(p.html).includes('Build Placement Results You Can Publish')).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM1: the contract-total note says who trained how many', () => {
  const NOTE = 'The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly). Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.';

  test('CONTRACT_TOTAL_NOTE reads the 25,125 from GV-01 and the 2,400 from GV-11 (GV-13 holds the same count), and names those facts', () => {
    expect(CONTRACT_TOTAL_NOTE.text).toBe(NOTE);
    expect(CONTRACT_TOTAL_NOTE.facts).toEqual(['GV-12', 'GV-01', 'GV-11', 'SC-02']);
    expect(fact('GV-01').stat?.value).toBe('25,125');
    expect(fact('GV-11').text).toContain('2,400 women trained directly');
    expect(fact('GV-13').stat?.value).toBe('2,400');
    // the register's own longer note (Impact) is unchanged
    expect(fact('GV-12').stat?.glance?.note).toBe('The figure is contract scope, not a count of completers. It includes Her Power’s national program, which trained 25,125 women and met its target; CodersTrust trained 2,400 women directly.');
  });

  // WP60 (cycle-32 review, GPT-6.1 Sol G1): Home's government slide says the same facts in plainer sentences (WP61, cycle-33 review: "Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly.") and no longer prints the note itself
  test('Home’s government slide is tied to GV-12, GV-01 and GV-11 (its plainer sentences state the note’s facts); the Governments tile, with the Investors and JobReady Platform tiles (WP59, GPT-6.1 Sol G1), prints the note, and none prints the bare "(25,125 women trained)" or the older "national program (25,125 women trained; ..."', async ({ page }) => {
    await open(page, HOME);
    const lead = slide(page, 2).locator('.hs__lead');
    expect(compact(await lead.textContent())).toBe(`Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly. As the official training partner of Bangladesh’s National University for digital career skills and credentials, CodersTrust is onboarding 1.5M+ of the university’s own learners, who are not learners trained by CodersTrust.`);
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
    await open(page, GOVERNMENTS);
    const tile = page.locator('#glance li', { hasText: '30,000+' });
    expect(compact(await tile.locator('.pg__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).');
    expect(await tile.locator('a').getAttribute('data-fact')).toBe('GV-12 SC-06 GV-01 GV-11');
    const printed = sitePages().filter((p) => p.html.includes('national program, which trained 25,125 women (CodersTrust trained 2,400 directly)')).map((p) => p.route).sort();
    expect(printed).toEqual(['/impact/', '/our-model/jobready-platform/', '/partner-with-us/governments/', '/partner-with-us/investors/']);
    expect(sitePages().filter((p) => p.html.includes('(25,125 women trained)')).map((p) => p.route)).toEqual([]);
  });

  test('Impact prints the shared contract-scope note (WP82)', async ({ page }) => {
    await open(page, IMPACT);
    expect(compact(await page.locator('#glance a[data-fact~="GV-12"] .glance__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly). Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S1 extended: the other statements of the 16 say "work", not "programs"', () => {
  test('ORIGIN_SHORT and TRAINED_REACH are built from SC-03 and say "work in" and "has also worked in"', () => {
    expect(ORIGIN_SHORT.text).toBe('Since 2014, from a Copenhagen launch to work in 16 countries and territories.');
    expect(ORIGIN_SHORT.facts).toEqual(['ID-02', 'SC-03']);
    // no page prints TRAINED_REACH today; it is aligned so that a page that does cannot say "programs have also run"
    expect(TRAINED_REACH.text).toBe('130,000+ learners trained since 2014, most of them in Bangladesh; CodersTrust has also worked in 15 other countries and territories.');
    expect(TRAINED_REACH.facts).toEqual(['SC-01', 'SC-03']);
  });

  test('every page that prints the origin line prints it with "work", tied to ID-02 and SC-03 (the audience pages’ Track Record bands)', async ({ page }) => {
    const pages = listPages().filter((p) => /data-fact="ID-02 SC-03"/.test(readFileSync(p.file, 'utf8')));
    expect(pages.map((p) => p.route)).toEqual(
      expect.arrayContaining(['/partner-with-us/governments/', '/partner-with-us/foundations/', '/partner-with-us/development-partners/', '/partner-with-us/investors/', '/partner-with-us/universities/', '/partner-with-us/employers/']),
    );
    for (const p of pages) {
      await open(page, p);
      // WP64 rework RW2 (coordinator): every one of these bands is headed "... Since 2014", so the line drops that lead-in (ORIGIN_SHORT.text above keeps it)
      expect(compact(await page.locator('[data-fact="ID-02 SC-03"]').first().textContent()), p.route).toBe(originShortUnder('Since 2014').text);
    }
  });

  // WP63 (cycle-35 review, GPT-6.1 Sol G2): YouthWIDE’s "Will This Work in Our Country?" answer is the bank’s two-sentence Q1 now, with no 16-countries sentence (tests/wp62.spec.ts, Item 6); the page still states the 16 as where CodersTrust has worked (its SC-03 tile)
  test('YouthWIDE states the 16 as where CodersTrust has worked (the SC-03 tile), and its structured data never says "has run programs since 2014"', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    expect(compact(await page.locator('main').textContent())).toContain('countries and territories where CodersTrust has worked');
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).not.toContain('has run programs since 2014');
  });

  test('no built page outside the archived posts says programs "run" or "ran" in the 16 or in "other countries and territories", or the nav’s "Where our programs have run"', () => {
    const STALE = [/Copenhagen launch to programs in/i, /programs? (?:have |has )?(?:also )?(?:run|ran) in/i, /run programs since 2014/i, /programs in (?:15|16|17) countries/i, /Where our programs have run/i];
    const hits = sitePages().flatMap((p) => STALE.filter((re) => re.test(visible(p.html))).map((re) => `${p.route}: ${re}`));
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R1 (Grok): the Denmark row has no target group or skills', () => {
  test('its target-group and skills cells are "—"; it keeps its years, its note and its photograph, and its pin card shows the same dashes; every other row keeps its own cells', async ({ page }) => {
    const denmark = locations.find((l) => l.id === 'denmark')!;
    expect([denmark.targetGroup, denmark.skills]).toEqual(['—', '—']);
    await open(page, GLOBAL_REACH);
    const row = page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: 'Denmark' }) });
    await expect(row).toHaveCount(1);
    await expect(row.locator('td[data-label="Target Group"]')).toHaveText('—');
    await expect(row.locator('td[data-label="Skills"]')).toHaveText('—');
    await expect(row.locator('td[data-label="Years"]')).toHaveText('2014');
    expect(compact(await row.locator('td[data-label="Partner / Note"]').textContent())).toBe('Launch location of CodersTrust, April 2014');
    await expect(row.locator('img')).toHaveCount(1);
    expect(await texts(page, '#wmap-card-denmark dt, #wmap-card-denmark dd')).toEqual(['Target Group', '—', 'Skills', '—', 'Note', 'Launch location of CodersTrust, April 2014']);
    // the other fifteen rows still carry a target group and skills of their own (none is a dash)
    const others = await page.locator('.wmap__table tbody tr').evaluateAll((rows) =>
      rows
        .filter((r) => !(r.querySelector('th')?.textContent ?? '').includes('Denmark'))
        .map((r) => [r.querySelector('td[data-label="Target Group"]')?.textContent?.trim(), r.querySelector('td[data-label="Skills"]')?.textContent?.trim()]),
    );
    expect(others).toHaveLength(15);
    for (const [targetGroup, skills] of others) {
      expect(targetGroup).not.toBe('—');
      expect(skills).not.toBe('—');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R3 (Grok): Home slide 4 states Her Power’s count and base', () => {
  const LINE = 'Her Power: 372 of 800 tracked in work (47%); 2,400 trained directly.';

  test('the line is built from PR-05 ("372 of 800", 47%, 2,400) and tied to it', async ({ page }) => {
    expect(fact('PR-05').stat?.value).toBe('372 of 800');
    expect(fact('PR-05').text).toContain('372 of 800 tracked women');
    expect(fact('PR-05').text).toContain('(47%)');
    expect(fact('PR-05').stat?.label).toContain('from the 2,400 trained directly by CodersTrust');
    await open(page, HOME);
    const lines = slide(page, 4).locator('.hs__lines li');
    await expect(lines).toHaveCount(4);
    await expect(lines.nth(3)).toHaveText(LINE);
    expect(await lines.nth(3).getAttribute('data-fact')).toBe('PR-05');
    // the old wording ("47% of 800 tracked women in work"), which read as 376 of the 800, is on no page
    expect(compact(await page.locator('main').textContent())).not.toContain('47% of 800');
  });

  test('the line fits one row at 1280 (as the Kosovo and WSDFM lines do), so the slide keeps its height budget (tests/hero-slider.spec.ts); the slide has no sideways scroll at 390', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HOME);
    await page.locator('[data-hs-dot]').nth(3).click();
    await page.waitForTimeout(600);
    const heights = await slide(page, 4).locator('.hs__lines li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(heights[3], 'the Her Power line is one row').toBe(heights[0]);
    expect(heights[3]).toBe(heights[1]);
    await page.setViewportSize(MOBILE);
    await open(page, HOME);
    expect(await noOverflow(page)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K3 (owner decision 2026-10-19): the six-contract total is 30,000+', () => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else out.push(full);
    }
    return out;
  };
  /** Every text-like file of the build (pages, llms.txt, the sitemaps, the manifests), with its path. */
  const builtFiles = () =>
    walk(DIST_DIR)
      .filter((f) => /\.(html|txt|xml|json|csv|webmanifest)$/.test(f))
      .map((f) => ({ file: relative(DIST_DIR, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));
  /** Pages that render SC-06 or GV-12 anywhere (found in the build). */
  const TOTAL_PAGES = listPages().filter((p) => /data-fact="[^"]*\b(?:SC-06|GV-12)\b[^"]*"/.test(readFileSync(p.file, 'utf8')));

  test('the register: SC-06 and GV-12 carry 30,000+ (text, value and numeric value); the "contract scope, not a count of completers" note and the Her Power clause are unchanged', () => {
    const sc06 = fact('SC-06');
    expect([sc06.stat?.value, sc06.stat?.numeric, sc06.text]).toEqual(['30,000+', 30000, '30,000+ people in the training and curriculum scopes of six government contracts']);
    const gv12 = fact('GV-12');
    expect([gv12.stat?.value, gv12.stat?.numeric]).toEqual(['30,000+', 30000]);
    expect(gv12.text).toBe('Six government contracts with training and curriculum work scoped for 30,000+ people; official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners');
    expect(gv12.stat?.glance?.note).toBe('The figure is contract scope, not a count of completers. It includes Her Power’s national program, which trained 25,125 women and met its target; CodersTrust trained 2,400 women directly.');
    expect(CONTRACT_TOTAL_NOTE.text).toContain('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained');
  });

  test('the pages that show the total are found in the build, and each says 30,000+ and never 31,200', () => {
    expect(TOTAL_PAGES.map((p) => p.route)).toEqual(expect.arrayContaining(['/', '/impact/', '/partner-with-us/governments/', '/partner-with-us/investors/', '/our-model/jobready-platform/']));
    for (const p of TOTAL_PAGES) {
      const text = visible(readFileSync(p.file, 'utf8'));
      expect(text, p.route).toMatch(/(?<![\d,])30,000\+/); // not the 130,000+ learners
      expect(text, p.route).not.toMatch(/31,200/);
    }
  });

  test('no built file (pages, the archived posts, llms.txt, the sitemaps and manifests) prints 31,200', () => {
    expect(builtFiles().filter((f) => /31,200|31200/.test(f.text)).map((f) => f.file)).toEqual([]);
  });

  test('Home’s government slide, the Governments tile, Impact’s tile and the Investors and JobReady tiles show 30,000+ with the Contract Scope tag', async ({ page }) => {
    await open(page, HOME);
    expect(compact(await slide(page, 2).locator('.hs__lead').textContent())).toMatch(/^Six government contracts with training and curriculum work scoped for 30,000\+ people, not a count of completers\. Her Power, one of the six, trained 25,125 women nationally, its full target;/);
    await open(page, GOVERNMENTS);
    const tile = page.locator('#glance li', { hasText: '30,000+' });
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.pg__value')).toHaveText('30,000+');
    await expect(tile.locator('[data-evidence="Contract Scope"]')).toHaveCount(1);
    await open(page, IMPACT);
    const impact = page.locator('#glance a[data-fact~="GV-12"]');
    await expect(impact.locator('.glance__value')).toHaveText('30,000+');
    await expect(impact.locator('[data-evidence="Contract Scope"]')).toHaveCount(1);
    for (const [route, tileSelector] of [[INVESTORS, '.ir__tile[data-fact="SC-06"]'], ['our-model/jobready-platform/', '.factstat[data-fact="SC-06"]']] as const) {
      await open(page, route);
      await expect(page.locator(`${tileSelector} .stat__value`).first(), route).toHaveText('30,000+');
    }
  });
});
