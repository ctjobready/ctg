import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fact, facts, sources } from '../src/data/facts';
import { signedWith } from '../src/components/sections/copyText';
import { DIST_DIR } from './support/env';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP66 behaviors (owner request 2026-10-20: signed partnerships by category). Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the register or of the built site
 * (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp66.spec.ts --project=chromium`):
 *   - the register: the source PARTNERREC; SC-11 is "70+ organizations with signed MOUs, agreements or contracts since 2014" with its four categories (13, 20, 13 and 27) as its detail; SC-11a to SC-11d are one fact per category; SC-09's wording is unchanged;
 *   - About, Careers and Local Partners print SC-11's tile (the new label), and About and the other two show the register's detail line under it;
 *   - the Partner with Us hub's "Why Partner with CodersTrust" band closes with one line giving the 70+ and its four categories (no fourth tile, no new band);
 *   - Governments, Universities, Development Partners, Foundations and Employers close their Track Record list with the sentence for their own category, and say "since 2014" once, in the band heading (WP64 rework RW2);
 *   - no built page says "20+ NGO and government partners", and no amount, pipeline item or organization name from the records is published (the figures are counts only).
 * The partnership records themselves are not in this repository: nothing here names an organization or an amount from them.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
/** A no-break space reads as a space everywhere but a line break. */
const plain = (s: string) => s.replace(/\u00A0/g, ' ');

/** Every built page (archived news posts included), with its HTML. */
const allPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );

const ABOUT = 'about/';
const CAREERS = 'careers/';
const HUB = 'partner-with-us/';
const LOCAL = 'partner-with-us/local-partners/';
const GOVERNMENTS = 'partner-with-us/governments/';
const UNIVERSITIES = 'partner-with-us/universities/';
const DEV_PARTNERS = 'partner-with-us/development-partners/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const EMPLOYERS = 'partner-with-us/employers/';

const TOTAL_LABEL = 'organizations with signed MOUs, agreements or contracts since 2014'; // WP67 (cycle-38 review): it was "... signed partnership agreements since 2014"
const BREAKDOWN = '13 government bodies, 20 universities and colleges, 13 development partners and NGOs, 27 companies and industry bodies.';
const BAND_HEADING = 'We’ve Built This Path Since 2014';
const LEAD = 'CodersTrust has signed MOUs, agreements or contracts with';

/** The four categories of SC-11 and the audience page whose Track Record band prints each (Foundations prints the development partners and NGOs, as Development Partners does). */
const CATEGORIES = [
  { id: 'SC-11a', count: 13, who: 'government bodies' },
  { id: 'SC-11b', count: 20, who: 'universities and colleges' },
  { id: 'SC-11c', count: 13, who: 'development partners and NGOs' },
  { id: 'SC-11d', count: 27, who: 'companies and industry bodies' },
] as const;
const AUDIENCE = [
  { route: GOVERNMENTS, id: 'SC-11a', sentence: `${LEAD} 13 government bodies.`, list: ['SC-04', 'SC-11a'] },
  { route: UNIVERSITIES, id: 'SC-11b', sentence: `${LEAD} 20 universities and colleges.`, list: ['SC-11b'] },
  { route: DEV_PARTNERS, id: 'SC-11c', sentence: `${LEAD} 13 development partners and NGOs.`, list: ['SC-11c'] },
  { route: FOUNDATIONS, id: 'SC-11c', sentence: `${LEAD} 13 development partners and NGOs.`, list: ['PR-01 RC-01', 'PA-01', 'SC-11c'] },
  { route: EMPLOYERS, id: 'SC-11d', sentence: `${LEAD} 27 companies and industry bodies.`, list: ['GV-06', 'PA-07', 'SC-11d'] },
] as const;
const HUB_LINE = `${LEAD} 70+ organizations since 2014: 13 government bodies, 20 universities and colleges, 13 development partners and NGOs, and 27 companies and industry bodies.`;

/** Where each new figure renders: the page, the element that carries it, and the band that holds it. */
const PLACES = [
  { route: ABOUT, selector: '#glance .factstat[data-fact="SC-11"]' },
  { route: CAREERS, selector: '#why .factstat[data-fact="SC-11"]' },
  { route: LOCAL, selector: '#guide .factstat[data-fact="SC-11"]' },
  { route: HUB, selector: '#why-partner .wp__signed' },
  ...AUDIENCE.map((a) => ({ route: a.route, selector: `#guide .pg__list li[data-fact="${a.id}"]` })),
];

/** A currency symbol or word, a comma-grouped number, a million or a long digit run: how the site would print an amount (the years are taken out first). */
const AMOUNT = /[$€£¥৳]|\b(?:USD|BDT|EUR|GBP|taka|dollars?|euros?|pounds?|million|billion|thousand)\b|\b\d{1,3}(?:,\d{3})+\b|\b\d{5,}\b/i;
const withoutYears = (s: string) => s.replace(/\b(?:19|20)\d{2}\b/g, '');
/** "Current" wording: the figures are signed agreements since 2014, never partnerships that are active today. */
const ACTIVE = /\b(?:active|current|currently|ongoing|today|now)\b/i;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('The register: signed agreements by category (SC-11 and SC-11a to SC-11d, source PARTNERREC)', () => {
  test('the source PARTNERREC is "CodersTrust partnership records", with the owner’s citation', () => {
    expect(sources.PARTNERREC).toEqual({
      id: 'PARTNERREC',
      label: 'CodersTrust partnership records',
      citation: 'CodersTrust, partnership records (signed MOUs, agreements and contracts), October 2026.',
    });
  });

  test('SC-11 is "70+" with the four categories in its text and its detail, rests on PARTNERREC alone, and no longer says "20+ NGO and government partners"', () => {
    const f = fact('SC-11');
    expect(f.status).toBe('V');
    expect(f.group).toBe('scale');
    expect(f.text).toBe(
      '70+ organizations with signed MOUs, agreements or contracts since 2014: 13 government bodies, 20 universities and colleges, 13 development partners and NGOs, and 27 companies and industry bodies',
    );
    expect(f.stat).toEqual({ value: '70+', numeric: 70, decimals: 0, suffix: '+', label: TOTAL_LABEL, detail: BREAKDOWN });
    expect(f.sourceIds).toEqual(['PARTNERREC']);
    const old = Object.values(facts).filter((x) => /NGO and government partners|\b20\+/.test(`${x.text} ${x.headline ?? ''} ${x.stat?.value ?? ''} ${x.stat?.label ?? ''} ${x.stat?.detail ?? ''}`));
    expect(old.map((x) => x.id)).toEqual([]);
  });

  test('SC-11a to SC-11d are one fact per category, each with its number as the stat, and rest on PARTNERREC alone', () => {
    for (const c of CATEGORIES) {
      const f = fact(c.id);
      expect(f.status, c.id).toBe('V');
      expect(f.group, c.id).toBe('scale');
      expect(f.text, c.id).toBe(`${c.count} ${c.who} with signed MOUs, agreements or contracts since 2014`);
      expect(f.stat, c.id).toEqual({ value: String(c.count), numeric: c.count, decimals: 0, label: `${c.who} with signed agreements since 2014` });
      expect(f.sourceIds, c.id).toEqual(['PARTNERREC']);
    }
  });

  test('the headline is a floor of the four counts (one count per organization), and SC-11’s detail and text list the same four categories as SC-11a to SC-11d', () => {
    const total = CATEGORIES.reduce((sum, c) => sum + (fact(c.id).stat?.numeric ?? 0), 0);
    const headline = fact('SC-11').stat?.numeric ?? 0;
    expect(headline).toBe(70);
    expect(total).toBeGreaterThanOrEqual(headline);
    expect(total).toBeLessThan(headline + 10);
    expect(fact('SC-11').stat?.detail).toBe(`${CATEGORIES.map((c) => `${fact(c.id).stat?.value} ${c.who}`).join(', ')}.`);
    expect(fact('SC-11').text).toContain(CATEGORIES.map((c) => `${fact(c.id).stat?.value} ${c.who}`).join(', ').replace(/, (27 )/, ', and $1'));
  });

  test('the new register entries publish counts only: no amount, no pipeline wording, and no capitalized word but "MOUs" and "NGOs" (so no organization name)', () => {
    const entries = ['SC-11', ...CATEGORIES.map((c) => c.id)].map((id) => `${fact(id).text} ${fact(id).stat?.label ?? ''} ${fact(id).stat?.detail ?? ''}`);
    entries.push(sources.PARTNERREC.label, sources.PARTNERREC.citation);
    for (const s of entries) {
      expect(withoutYears(s), s).not.toMatch(AMOUNT);
      expect(s, s).not.toMatch(/pipeline|prospect|lead|proposal|negotiat/i);
    }
    for (const s of entries.slice(0, -2)) {
      const names = [...s.matchAll(/\b[A-Z][A-Za-z]*\b/g)].map((m) => m[0]).filter((w) => !['MOUs', 'NGOs'].includes(w));
      expect(names, s).toEqual([]);
    }
  });

  test('SC-09 is unchanged: only its comment carries the owner’s note on what the 150+ courses are', () => {
    expect(fact('SC-09').text).toBe('150+ skill and certification courses delivered; 150+ instructors and mentors');
    expect(fact('SC-09').stat).toEqual({ value: '150+', numeric: 150, decimals: 0, suffix: '+', label: 'skill and certification courses delivered' });
    expect(fact('SC-09').sourceIds).toEqual(['IR26']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('signedWith: the register’s wording as one sentence', () => {
  test('a category reads "CodersTrust has signed MOUs, agreements or contracts with N who since 2014."; under a heading that says "Since 2014" the sentence leaves the year to it', () => {
    expect(plain(signedWith('SC-11a'))).toBe(`${LEAD} 13 government bodies since 2014.`);
    expect(plain(signedWith('SC-11b', 'Why Partner with CodersTrust'))).toBe(`${LEAD} 20 universities and colleges since 2014.`);
    for (const a of AUDIENCE) expect(plain(signedWith(a.id, BAND_HEADING)), a.route).toBe(a.sentence);
    expect(plain(signedWith('SC-11d', 'A Record Built Since 2014'))).toBe(`${LEAD} 27 companies and industry bodies.`);
  });

  test('SC-11 reads with its breakdown after a colon, and keeps "since 2014" under a heading that does not say it', () => {
    expect(plain(signedWith('SC-11', 'Why Partner with CodersTrust'))).toBe(HUB_LINE);
    expect(plain(signedWith('SC-11', BAND_HEADING))).toBe(HUB_LINE.replace(' since 2014:', ':'));
  });

  test('every count is joined to its noun with a no-break space, so a line never ends on a bare figure', () => {
    expect(signedWith('SC-11b')).toContain('with 20\u00A0universities and colleges');
    expect(signedWith('SC-11')).toContain('with 70+\u00A0organizations since 2014: 13\u00A0government bodies, 20\u00A0universities and colleges, 13\u00A0development partners and NGOs, and 27\u00A0companies and industry bodies.');
  });

  test('a fact that is not in the signed form stops the build instead of printing a wrong sentence', () => {
    expect(() => signedWith('SC-01')).toThrow(/signedWith: SC-01 is not in/);
    expect(() => signedWith('SC-99')).toThrow(/Unknown fact/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('About, Careers and Local Partners: the SC-11 tile', () => {
  test('About: the fourth tile is "70+" and the new label, with the register’s breakdown under it; the five tiles keep their order and the countries tile keeps its note', async ({ page }) => {
    await open(page, ABOUT);
    const tile = page.locator('#glance .about-stats .factstat[data-fact="SC-11"]');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.stat__value')).toHaveText('70+');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe(TOTAL_LABEL);
    expect(compact(await tile.locator('.stat__note').textContent())).toBe(BREAKDOWN);
    expect(BREAKDOWN).toBe(fact('SC-11').stat?.detail);
    expect(TOTAL_LABEL).toBe(fact('SC-11').stat?.label);
    expect(await page.locator('#glance .about-stats [data-fact]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['SC-01', 'SC-02', 'SC-03', 'SC-11', 'SC-09']);
    expect(await texts(page, '#glance .about-stats .stat__note')).toEqual(['Most delivery has been in Bangladesh.', BREAKDOWN]);
    // SC-09 (its courses are JobReady.global's plus the 4 NU Postgraduate Diploma courses, a comment in the register) reads as it did
    const courses = page.locator('#glance .about-stats .factstat[data-fact="SC-09"]');
    await expect(courses.locator('.stat__value')).toHaveText('150+');
    expect(compact(await courses.locator('.stat__label').textContent())).toBe('skill and certification courses delivered');
    await expect(page.locator('#glance .about-stats .factstat[data-fact="SC-09"] .stat__note')).toHaveCount(0);
  });

  test('About: "since 2014" is on the learners tile and on this one, and on neither tile beside either (the enrollments tile and the countries and courses tiles drop or never carry it)', async ({ page }) => {
    await open(page, ABOUT);
    const labels = await texts(page, '#glance .about-stats .stat__label');
    expect(labels.map((l) => /since 2014/.test(l))).toEqual([true, false, false, true, false]);
    expect(labels[0]).toBe('learners trained since 2014');
    expect(labels[1]).toBe('course enrollments');
    expect(compact(await page.locator('#glance').textContent()).match(/since 2014/gi)).toHaveLength(2);
    // neither the eyebrow nor the heading gives the period, so the tile keeps it: a count of signed agreements says since when
    await expect(page.locator('#glance h2')).toHaveText('Where We Are Today');
    await expect(page.locator('#glance .sh .eyebrow')).toHaveText('At a Glance');
  });

  test('Careers: the third tile is "70+" with the new label and the register’s breakdown; the learners tile keeps "since 2014"', async ({ page }) => {
    await open(page, CAREERS);
    const tile = page.locator('#why .factstat[data-fact="SC-11"]');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.stat__value')).toHaveText('70+');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe(TOTAL_LABEL);
    expect(compact(await tile.locator('.stat__note').textContent())).toBe(BREAKDOWN);
    expect(await page.locator('#why .cr-stats .factstat').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['SC-01', 'SC-03', 'SC-11']);
    expect(compact(await page.locator('#why .factstat[data-fact="SC-01"] .stat__label').textContent())).toBe('learners trained since 2014');
  });

  test('Local Partners: the authority row’s first tile is "70+" with the new label (its heading does not say the period, so the label keeps it) and the breakdown; the labs tile follows', async ({ page }) => {
    await open(page, LOCAL);
    await expect(page.locator('#guide h2')).toHaveText('Delivered with a Bangladesh Team Beside You');
    const tiles = page.locator('#guide .guide__stats .factstat');
    expect(await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['SC-11', 'GV-09']);
    const tile = tiles.first();
    await expect(tile.locator('.stat__value')).toHaveText('70+');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe(TOTAL_LABEL);
    expect(compact(await tile.locator('.stat__note').textContent())).toBe(BREAKDOWN);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Partner with Us hub: one line in "Why Partner with CodersTrust"', () => {
  test('the band closes with the 70+ and its four categories as one sentence tied to SC-11; it is not a fourth tile and not a new band', async ({ page }) => {
    await open(page, HUB);
    const band = page.locator('#why-partner');
    await expect(band.locator('h2')).toHaveText('Why Partner with CodersTrust');
    await expect(band.locator('li')).toHaveCount(3);
    const line = band.locator('.wp__signed');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(HUB_LINE);
    await expect(line).toHaveAttribute('data-fact', 'SC-11');
    expect(await line.evaluate((el) => el.closest('section')?.id)).toBe('why-partner');
    expect(await line.evaluate((el) => el.closest('li'))).toBeNull();
    expect(count(await mainText(page), 'signed MOUs, agreements or contracts')).toBe(1);
  });

  test('it says "signed" and "since 2014" (the band’s heading does not carry the year) and uses no "active" or "current" wording', async ({ page }) => {
    await open(page, HUB);
    const text = compact(await page.locator('#why-partner .wp__signed').textContent());
    expect(text).toContain('has signed MOUs, agreements or contracts');
    expect(text).toContain('70+ organizations since 2014');
    expect(text).not.toMatch(ACTIVE);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Audience pages: the Track Record band closes with the sentence for the page’s own category', () => {
  for (const a of AUDIENCE) {
    test(`${a.route}: the list ends with "${a.sentence}", tied to ${a.id}; the band is headed "${BAND_HEADING}" and says "since 2014" once, in the heading`, async ({ page }) => {
      await open(page, a.route);
      await expect(page.locator('#guide h2')).toHaveText(BAND_HEADING);
      const items = page.locator('#guide .pg__list li');
      expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual([...a.list]);
      const last = items.last();
      expect(compact(await last.textContent())).toBe(a.sentence);
      expect(await last.getAttribute('data-fact')).toBe(a.id);
      expect(compact(await page.locator('#guide').textContent()).match(/since 2014/gi)).toHaveLength(1);
      expect(a.sentence).not.toMatch(/since 2014/);
      expect(count(await mainText(page), 'signed MOUs, agreements or contracts')).toBe(1);
    });
  }

  test('each page prints its own category and no other: the four sentences are spread one to a page (the development partners and NGOs on two)', async ({ page }) => {
    const sentences = [...new Set(AUDIENCE.map((a) => a.sentence))];
    for (const a of AUDIENCE) {
      await open(page, a.route);
      const text = await mainText(page);
      for (const s of sentences) expect(text.includes(s), `${a.route}: ${s}`).toBe(s === a.sentence);
    }
  });

  test('the sentence is a line of the existing band: the tile rows are as they were (no new tile), and the sentence sits inside the one #guide band', async ({ page }) => {
    const tiles: [string, string[]][] = [
      [GOVERNMENTS, []],
      [UNIVERSITIES, []],
      [DEV_PARTNERS, ['SC-01', 'SC-03']],
      [FOUNDATIONS, []],
      [EMPLOYERS, ['SC-15']],
    ];
    for (const [route, ids] of tiles) {
      await open(page, route);
      expect(await page.locator('#guide .pg__stats .factstat').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact'))), route).toEqual(ids);
      await expect(page.locator('#guide'), route).toHaveCount(1);
      await expect(page.locator('#guide .pg__list li[data-fact^="SC-11"]'), route).toHaveCount(1);
      await expect(page.locator('main li[data-fact^="SC-11"]'), `${route}: the sentence is printed once on the page`).toHaveCount(1);
    }
  });

  test('Universities: the one proof line gives the band a proof column (beside the copy at 1280, under it at 390), where it had none', async ({ page }) => {
    await open(page, UNIVERSITIES);
    await expect(page.locator('#guide .pg__proof')).toHaveCount(1);
    await expect(page.locator('#guide .pg--solo')).toHaveCount(0);
    await expect(page.locator('#guide .pg__list li')).toHaveCount(1);
    // the National University relationship is still stated once, in the NU band, and not in this band
    expect(compact(await page.locator('#guide').textContent())).not.toContain('official training partner');
    for (const [vp, beside] of [[DESKTOP, true], [MOBILE, false]] as const) {
      await page.setViewportSize(vp);
      await open(page, UNIVERSITIES);
      const copy = (await page.locator('#guide .pg__copy').boundingBox())!;
      const proof = (await page.locator('#guide .pg__proof').boundingBox())!;
      if (beside) expect(proof.x, `${vp.width}px: the proof column is beside the copy`).toBeGreaterThan(copy.x + copy.width - 1);
      else expect(proof.y, `${vp.width}px: the proof column is under the copy`).toBeGreaterThanOrEqual(copy.y + copy.height - 1);
    }
  });

  test('Governments, Foundations and Employers keep the lines they had, in their order, with the new sentence after them (Foundations: the names line is still directly after the BIGD line)', async ({ page }) => {
    await open(page, GOVERNMENTS);
    expect(compact(await page.locator('#guide .pg__list li').first().textContent())).toBe('CodersTrust has been National University’s official training partner for digital career skills and credentials since 2023.');
    await open(page, FOUNDATIONS);
    const items = page.locator('#guide .pg__list li');
    await expect(items).toHaveCount(3);
    expect(compact(await items.nth(0).textContent())).toContain('evaluated the predecessor WSDFM program');
    expect(compact(await items.nth(1).textContent())).toBe('Organizations that have worked with CodersTrust include the Rockefeller Foundation, DANIDA and Porticus.');
    await open(page, EMPLOYERS);
    expect(await texts(page, '#guide .pg__list li')).toEqual([
      'Contract scope: ICT, networking and cybersecurity for 120+ professionals, for the Ministry of Power, Energy and Mineral Resources (via Bangladesh Petroleum Institute).',
      'Partnership with AIvolve Leadership Dynamics GmbH (Switzerland) for AI leadership and AI-transformation programs.',
      `${LEAD} 27 companies and industry bodies.`,
    ]);
    await expect(page.locator('#guide .partners__title [data-fact="PA-06"]')).toHaveText('CodersTrust is an AWS Authorized Training Partner.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Where the new figures render, and what they never say', () => {
  test('the SC-11 family is on the nine pages above and on no other built page', () => {
    const routes = allPages()
      .filter((p) => /data-fact="[^"]*\bSC-11[a-d]?\b[^"]*"/.test(p.html))
      .map((p) => p.route)
      .sort();
    const expected = [ABOUT, CAREERS, HUB, LOCAL, GOVERNMENTS, UNIVERSITIES, DEV_PARTNERS, FOUNDATIONS, EMPLOYERS].map((r) => `/${r}`).sort();
    expect(routes).toEqual(expected);
  });

  test('no built page, archived post or text file of the build says "20+ NGO and government partners" (or "20+ NGO", or "NGO and government partners")', () => {
    const offenders = allPages().filter((p) => /20\+ NGO|NGO and government partners/i.test(p.html) || /20\+ NGO|NGO and government partners/i.test(visible(p.html))).map((p) => p.route);
    expect(offenders).toEqual([]);
    expect(readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8')).not.toMatch(/20\+ NGO|NGO and government partners/i);
  });

  test('wherever any built page counts a category, the count is the register\u2019s: 13 government bodies, 20 universities and colleges, 13 development partners and NGOs, 27 companies and industry bodies, 70+ organizations', () => {
    const counts: [RegExp, string][] = [
      [/(\d+\+?) government bodies/g, '13'],
      [/(\d+\+?) universities and colleges/g, '20'],
      [/(\d+\+?) development partners and NGOs/g, '13'],
      [/(\d+\+?) companies and industry bodies/g, '27'],
      [/(\d+\+?) organizations (?:with signed|since 2014)/g, '70+'],
    ];
    let seen = 0;
    for (const p of allPages().filter((x) => !x.route.startsWith('/news/'))) {
      const text = visible(p.html);
      for (const [re, expected] of counts) {
        for (const m of text.matchAll(re)) {
          seen++;
          expect(m[1], `${p.route}: "${m[0]}"`).toBe(expected);
        }
      }
    }
    // the hub line (5 counts), the About, Careers and Local Partners details and labels (5 each) and the five audience sentences
    expect(seen).toBeGreaterThanOrEqual(5 + 5 * 3 + 5);
  });

  test('no currency amount is in or beside any new line: the element and the band that holds it carry none (and the lines carry no "active", "current" or "today" wording)', async ({ page }) => {
    for (const place of PLACES) {
      await open(page, place.route);
      const element = page.locator(place.selector);
      await expect(element, `${place.route} ${place.selector}`).toHaveCount(1);
      // innerText, not textContent: a tile's label and note are separate blocks with no space between them in the markup ("since 2014" and "13 government bodies" would otherwise run together as "201413")
      const own = compact(await element.innerText());
      const band = compact(await element.evaluate((el) => (el.closest('section') as HTMLElement | null)?.innerText ?? ''));
      expect(band.length, `${place.route}: the band`).toBeGreaterThan(own.length);
      expect(withoutYears(own), `${place.route}: ${own}`).not.toMatch(AMOUNT);
      expect(withoutYears(band), `${place.route}: the band`).not.toMatch(/[$€£¥৳]|\b(?:USD|BDT|taka|dollars?)\b/i);
      expect(own, `${place.route}: ${own}`).not.toMatch(ACTIVE);
    }
  });

  test('every new line says "signed", and the About, Careers and Local Partners tiles say "signed ... since 2014"', async ({ page }) => {
    for (const place of PLACES) {
      await open(page, place.route);
      const own = compact(await page.locator(place.selector).textContent());
      expect(own, place.route).toMatch(/signed/);
      if (/factstat/.test(place.selector)) expect(own, place.route).toMatch(/signed MOUs, agreements or contracts since 2014/);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Layout: the new lines and tiles stay inside the page', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: the nine pages have no sideways scroll and every new line sits inside the viewport`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const place of PLACES) {
        await open(page, place.route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${place.route} at ${vp.width}px`).toBe(true);
        // a stat tile's wrapper (.factstat) is display:contents and has no box of its own, so the tile (.stat) is measured
        const target = page.locator(/factstat/.test(place.selector) ? `${place.selector} .stat` : place.selector);
        const box = await target.boundingBox();
        expect(box, place.route).not.toBeNull();
        expect(box!.x, `${place.route}: left edge`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${place.route}: right edge`).toBeLessThanOrEqual(vp.width + 0.5);
        await expect(target, place.route).toBeVisible();
      }
    });
  }

  test('at 390px the hub line wraps in the band (more than one line) and keeps each count with its noun: no line starts with a noun that belongs to a figure at the end of the line before', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, HUB);
    await scrollThrough(page);
    const line = page.locator('#why-partner .wp__signed');
    const lines = await line.evaluate((el) => {
      const range = document.createRange();
      const words: { text: string; top: number }[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent ?? '';
        for (const m of text.matchAll(/\S+/g)) {
          range.setStart(node, m.index!);
          range.setEnd(node, m.index! + m[0].length);
          words.push({ text: m[0], top: Math.round(range.getBoundingClientRect().top) });
        }
      }
      const rows = new Map<number, string[]>();
      for (const w of words) rows.set(w.top, [...(rows.get(w.top) ?? []), w.text]);
      return [...rows.values()].map((r) => r.join(' '));
    });
    expect(lines.length).toBeGreaterThan(1);
    // 13, 20, 27 and 70+ are the counts; "2014:" ends a line legitimately (a year, not a count)
    for (const row of lines) expect(row, `a line ends on a bare count: "${row}"`).not.toMatch(/(?:^|\s)(?:13|20|27|70\+),?$/);
  });
});
