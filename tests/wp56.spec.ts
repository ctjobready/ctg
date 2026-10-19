import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact, facts, sources } from '../src/data/facts';
import { ORIGIN_SHORT } from '../src/data/copy';
import { locations } from '../src/data/countries';
import { timeline } from '../src/data/timeline';
import { WORLD_STRIP } from '../src/data/globalStrip';
import { DIST_DIR } from './support/env';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP56 behaviors (owner decisions 12 to 15 of 2026-10-18, after the DR1 Somalia research and the NG1 Nigeria research). Retrospective coverage (the owner exempted this project from test-first work); each test states one
 * observable behavior of the built site or of the register behind it (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp56.spec.ts --project=chromium`):
 *   - Somalia is removed ("Merge into Somaliland, show 16"): no Somalia row, pin, card or sentence anywhere; Somaliland stays;
 *   - the headline is 16 countries and territories (Bangladesh plus 15) on every surface that renders SC-03 or SC-16, and the earlier counts (15, 17) appear nowhere outside the archived news posts;
 *   - the Somaliland wording is "Hour of Code, and an ICT program at Tima-ade University" (American "program"), and nothing says the Hour of Code was held with the university;
 *   - Nigeria is a timeline line only (About, "Our Story", TL-07, source RFGRANT15): not a location, not counted, on no other page;
 *   - the Rockefeller Foundation grant amount is published nowhere.
 * The grant amount itself is deliberately not written in this file: the amount checks are generic (no currency symbol or word, no comma-grouped number, no long digit run).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const HOME = '';
const ABOUT = 'about/';
const GLOBAL_REACH = 'impact/global-reach/';
const YOUTHWIDE = 'programs/youthwide/';
const INVESTORS = 'partner-with-us/investors/';
const NEWS_HOC = 'news/hour-of-code-in-somaliland/';

/** The owner's wording (decision 13). */
const PHRASE = 'Hour of Code, and an ICT program at Tima-ade University';
/** The alt text describes the visible banner; it does not say the Hour of Code was held with the university. */
const BANNER_ALT = 'About thirty men and women, many in white caps, pose in two rows outdoors in front of a Tima-ade University banner';
/** The owner's timeline line (decision 15). */
const NIGERIA_TEXT = 'A Rockefeller Foundation grant supported a CodersTrust feasibility study in Kenya and Nigeria.';
const RF_URL = 'https://web.archive.org/web/20231202123117/https://www.rockefellerfoundation.org/grant/grant-2015-213/';

/** Every built page (archived news posts included), with its HTML. */
const allPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** Built pages that are not archived news posts (those keep their original wording). */
const sitePages = () => allPages().filter((p) => !p.route.startsWith('/news/'));

const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};
/** The text-like files of the build that are not pages (llms.txt, the sitemap, the manifests, the CSV). */
const distTextFiles = () =>
  walk(DIST_DIR)
    .filter((f) => /\.(txt|xml|json|csv|webmanifest)$/.test(f))
    .map((f) => ({ file: relative(DIST_DIR, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));

/** Pages that render SC-03 or SC-16 anywhere (found in the build, so no route is typed here). */
const SC_PAGES = listPages().filter((p) => /data-fact="[^"]*\b(?:SC-03|SC-16)\b[^"]*"/.test(readFileSync(p.file, 'utf8')));

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Somalia is removed: Global Reach lists Somaliland only (owner decision 12, "Merge into Somaliland")', () => {
  const row = (page: Page, name: string) => page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: name }) }).first();

  test('the data has no Somalia row; Somaliland stays, as 2015–2016; the list is 16 locations', () => {
    expect(locations.map((l) => l.id)).not.toContain('somalia');
    expect(locations.map((l) => l.name)).not.toContain('Somalia');
    expect(locations.find((l) => l.id === 'somaliland')?.years).toBe('2015–2016');
    expect(locations).toHaveLength(16);
  });

  test('Global Reach: no Somalia row, pin, pin card or word; the Somaliland row, pin and card remain; the "Beyond Bangladesh" list names Somaliland', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const names = await page.locator('.wmap__table tbody tr').evaluateAll((rows) => rows.map((r) => (r.querySelector('th')?.firstChild?.textContent ?? '').trim()));
    expect(names).not.toContain('Somalia');
    expect(names).toContain('Somaliland');
    expect(names).toHaveLength(16);
    await expect(page.locator('.wmap__pins > li')).toHaveCount(16);
    await expect(page.locator('#wmap-card-somalia')).toHaveCount(0);
    await expect(page.locator('#wmap-card-somaliland')).toHaveCount(1);
    await expect(row(page, 'Somaliland')).toHaveCount(1);
    expect(await page.locator('svg.wmap__svg').getAttribute('aria-label')).toContain(': 16 locations.');
    expect(compact(await page.locator('#map').textContent())).toContain('Albania, Benin, Bhutan, Denmark, Egypt, Honduras, India, Iraq, Jordan, Kenya, Kosovo, Malaysia, Poland, Somaliland and Uganda.');
    // the whole document, attributes and JSON-LD included
    expect(await page.content()).not.toMatch(/\bSomalia\b/);
  });

  test('no built page (archived posts included) and no text file of the build names Somalia', () => {
    expect(allPages().filter((p) => /\bSomalia\b/.test(p.html)).map((p) => p.route)).toEqual([]);
    expect(distTextFiles().filter((f) => /\bSomalia\b/.test(f.text)).map((f) => f.file)).toEqual([]);
  });

  test('no fact, source or timeline entry names Somalia', () => {
    const named = Object.values(facts).filter((f) => /\bSomalia\b/.test(`${f.text} ${f.headline ?? ''} ${f.stat?.label ?? ''} ${f.stat?.detail ?? ''}`)).map((f) => f.id);
    expect(named).toEqual([]);
    expect(Object.values(sources).filter((s) => /\bSomalia\b/.test(`${s.label} ${s.citation}`)).map((s) => s.id)).toEqual([]);
    expect(timeline.filter((t) => /\bSomalia\b/.test(`${t.title} ${t.text}`))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('16 countries and territories wherever SC-03 and SC-16 render (owner decisions 12 and 15)', () => {
  test('the register: SC-03 is 16 (Bangladesh plus 15 others), SC-16 and the origin line say 16, and the location list is 16', () => {
    const sc03 = fact('SC-03');
    expect(sc03.stat?.value).toBe('16');
    expect(sc03.stat?.numeric).toBe(16);
    expect(sc03.text).toBe('CodersTrust has worked in 16 countries and territories across Asia, Africa, Europe and the Americas, including Bangladesh since 2014');
    expect(sc03.stat?.detail).toBe('Most delivery has been in Bangladesh.');
    const sc16 = fact('SC-16');
    // WP59 (cycle-31 review, GLM L3): two sentences (tests/wp59.spec.ts)
    expect(sc16.text).toBe('130,000+ learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories');
    expect(sc16.stat?.label).toBe('learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories.');
    expect(sc16.stat?.glance?.note).toBe('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
    expect(ORIGIN_SHORT.text).toBe('Since 2014, from a Copenhagen launch to work in 16 countries and territories.');
    expect(locations.length).toBe(Number(sc03.stat?.value));
    // Nigeria is not counted (decision 15): the headline is Bangladesh plus 15, not plus 16
    expect(locations.map((l) => l.name)).not.toContain('Nigeria');
  });

  test('no built page outside the archived news posts, and no text file, states an earlier count (17 countries or locations, "plus 16 other", "plus 16 international")', () => {
    const STALE = [/\b17 (?:countries|Countries|locations|international|program locations)\b/, /\bplus 16 (?:other|international)\b/i, /\b16 other countries\b/i, /\bBangladesh plus 17\b/];
    const pages = sitePages().flatMap((p) => STALE.filter((re) => re.test(p.html)).map((re) => `${p.route}: ${re}`));
    const files = distTextFiles().flatMap((f) => STALE.filter((re) => re.test(f.text)).map((re) => `${f.file}: ${re}`));
    expect([...pages, ...files]).toEqual([]);
  });

  test('the pages that render SC-03 or SC-16 are found in the build (the per-page checks below are not silently empty)', () => {
    expect(SC_PAGES.map((p) => p.route)).toEqual(
      expect.arrayContaining(['/', '/about/', '/about/recognition/', '/careers/', '/impact/', '/impact/global-reach/', '/partner-with-us/', '/partner-with-us/development-partners/', '/partner-with-us/employers/', '/partner-with-us/foundations/', '/partner-with-us/governments/', '/partner-with-us/investors/', '/partner-with-us/universities/', '/programs/', '/programs/youthwide/']),
    );
  });

  for (const p of SC_PAGES) {
    test(`${p.route}: every element tied to SC-03 or SC-16 states 16 countries and territories (or "15 other"), a SC-03 tile reads 16, and no count is stale`, async ({ page }) => {
      await open(page, p);
      const els = await page.locator('[data-fact~="SC-03"], [data-fact~="SC-16"]').evaluateAll((nodes) =>
        nodes.map((n) => ({
          fact: n.getAttribute('data-fact') ?? '',
          text: (n.textContent ?? '').replace(/\s+/g, ' ').trim(),
          value: (n.querySelector('.stat__value')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        })),
      );
      expect(els.length, `${p.route} renders SC-03 or SC-16`).toBeGreaterThan(0);
      for (const e of els) {
        for (const m of e.text.matchAll(/\b(\d+)\s+(other\s+)?countries and territories\b/gi)) expect(m[1], `${p.route} [${e.fact}] "${m[0]}"`).toBe(m[2] ? '15' : '16');
        for (const m of e.text.matchAll(/\b(\d+)\s+international locations\b/gi)) expect(m[1], `${p.route} [${e.fact}] "${m[0]}"`).toBe('15');
        expect(e.text, `${p.route} [${e.fact}]`).not.toMatch(/\b17 (?:countries|locations|international|other)\b/i);
        if (e.fact.split(' ').join('') === 'SC-03' && e.value) expect(e.value, `${p.route} the SC-03 tile`).toBe('16');
      }
    });
  }

  test('the headline surfaces: Home’s reach card, About’s description and tile, Global Reach’s title, heading and description, the Investors and Programs tiles, and llms.txt', async ({ page }) => {
    await open(page, HOME);
    await expect(page.locator('.hh__card[data-fact="SC-16"]')).toContainText('learners trained through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
    await open(page, ABOUT);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe('New York-headquartered CodersTrust has trained educated, unemployed and underemployed youth for digital work, with work in 16 countries and territories.'); // WP63 (cycle-35 review, Grok R6)
    await expect(page.locator('.about-stats .factstat[data-fact="SC-03"] .stat__value')).toHaveText('16');
    await open(page, GLOBAL_REACH);
    // WP57 (cycle-29 review, Grok R1): the H1 is "Where We Have Worked: 16 Countries and Territories"; the page title keeps "Global Reach: 16 Countries and Territories"
    await expect(page.locator('main h1')).toHaveText('Where We Have Worked: 16 Countries and Territories');
    expect(await page.title()).toContain('Global Reach: 16 Countries and Territories');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toMatch(/^CodersTrust has worked in 16 countries and territories: Bangladesh since 2014 and 15 international locations/);
    expect(compact(await page.locator('main .hero__lead').first().textContent())).toBe('CodersTrust has worked in 16 countries and territories across Asia, Africa, Europe and the Americas, including Bangladesh since 2014.');
    await open(page, INVESTORS);
    expect(await texts(page, '#guide .ig__tile .stat__value')).toEqual(['130,000+', '150,000+', '16']);
    await open(page, 'programs/');
    await expect(page.locator('.factstat[data-fact="SC-03"] .stat__value')).toHaveText('16');
    await open(page, 'careers/');
    await expect(page.locator('.factstat[data-fact="SC-03"] .stat__value')).toHaveText('16');
    const llms = readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8');
    expect(llms).toContain('CodersTrust has worked in 16 countries and territories across Asia, Africa, Europe and the Americas, including Bangladesh since 2014.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Somaliland wording: "Hour of Code, and an ICT program at Tima-ade University" (owner decision 13)', () => {
  const ICT_PROGRAM = /\ban ICT program at Tima-ade University\b/;
  const BANNER = /\bin front of a Tima-ade University banner\b/;
  /** Every text node or attribute value (no `<`, `>` or `"` inside) that names Tima-ade, per built page. */
  const contexts = () => allPages().flatMap((p) => [...p.html.replace(/<style[\s\S]*?<\/style>/gi, ' ').matchAll(/[^<>"]*Tima-ade[^<>"]*/g)].map((m) => ({ route: p.route, text: compact(m[0]) })));

  test('TL-03 (the tile) says the owner’s wording; the strip reads it from the register; its sources include the Somali television item for the ICT program', () => {
    const tl = fact('TL-03');
    expect(tl.stat?.label).toBe(PHRASE);
    expect(tl.stat?.label.length).toBeLessThanOrEqual(60);
    expect(tl.stat?.value).toBe('2015');
    expect(tl.text).toBe('In late 2015, CodersTrust’s work in Somaliland included an Hour of Code event for students, and an ICT program at Tima-ade University');
    expect(tl.sourceIds).toEqual(['TUMBLRHOC15', 'CTGALLERY23', 'JUBATV15']);
    expect(sources.JUBATV15.url).toBe('https://www.youtube.com/watch?v=-8MZdwf13HM');
    expect(WORLD_STRIP.find((t) => t.id === 'somaliland')?.line).toBe(PHRASE);
  });

  test('Home and About: the Somaliland tile reads "Somaliland, 2015. Hour of Code, and an ICT program at Tima-ade University." and stays tied to TL-03', async ({ page }) => {
    for (const route of [HOME, ABOUT]) {
      await open(page, route);
      const tile = page.locator('#world li[data-tile="somaliland"]');
      await expect(tile, route).toHaveCount(1);
      expect(compact(await tile.locator('figcaption').textContent()), route).toBe(`Somaliland, 2015. ${PHRASE}.`);
      expect(await tile.getAttribute('data-fact'), route).toBe('TL-03');
      expect(await tile.locator('img').getAttribute('alt'), route).toBe(BANNER_ALT);
    }
  });

  test('Global Reach: the Somaliland note is the owner’s wording, not a "Partner:" line; the pin card carries the same note; the photograph’s alt text describes the banner only', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const row = page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: 'Somaliland' }) }).first();
    const note = compact(await row.locator('td[data-label="Partner / Note"]').textContent());
    expect(note).toBe(PHRASE);
    expect(note).not.toMatch(/^Partner|\bwith Tima-ade/);
    expect(compact(await row.locator('td[data-label="Years"]').textContent())).toBe('2015–2016');
    expect(compact(await page.locator('#wmap-card-somaliland').evaluate((el) => el.textContent ?? ''))).toContain(PHRASE);
    const alt = await row.locator('.wmap__photo img').getAttribute('alt');
    expect(alt).toBe(BANNER_ALT);
    expect(alt).not.toMatch(/Hour of Code/);
  });

  test('YouthWIDE: the gallery caption is the owner’s wording with the place and month; its alt text still describes the banner', async ({ page }) => {
    await open(page, YOUTHWIDE);
    expect(await texts(page, '#in-the-field figure figcaption')).toContain(`${PHRASE}, Somaliland, December 2015`);
    const figure = page.locator('#in-the-field figure', { has: page.locator('img[data-asset="legacy-global-somaliland-hour-of-code"]') });
    expect(await figure.locator('img').getAttribute('alt')).toBe(BANNER_ALT);
  });

  test('the news entry says Hour of Code event and ICT program as two items, never "with" the university, links the Somali television item, and keeps American spelling', async ({ page }) => {
    await open(page, NEWS_HOC);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hour of Code in Somaliland');
    const body = compact(await page.locator('article.art').textContent());
    expect(body).toContain('In late 2015, CodersTrust’s work in Somaliland included an Hour of Code event for students, and an ICT program at Tima-ade University.');
    expect(body).toContain('The photograph shows a group in front of a Tima-ade University banner.');
    expect(body).toContain('names Coders Trust, the university (spelled “Timacade”) and its ICT program.');
    expect(body).not.toMatch(/\bwith Tima-ade|Partner: Tima-ade|programme/i);
    const links = await page.locator('article.art .art__body a[href^="http"]').evaluateAll((as) => as.map((a) => ({ href: a.getAttribute('href'), text: (a.textContent ?? '').trim(), rel: a.getAttribute('rel') ?? '' })));
    expect(links.map((l) => l.href)).toEqual(['https://coderstrust.tumblr.com/post/135629572265/coderstrust-hour-of-code-in-a-nutshell-just-over', 'https://www.youtube.com/watch?v=-8MZdwf13HM']);
    expect(links[1].text).toBe('Somali television news item of November 29, 2015');
    for (const l of links) expect(l.rel).toMatch(/noopener/);
    // the news index card carries the same excerpt
    await open(page, 'news/');
    expect(compact(await page.locator('main').textContent())).toContain('In late 2015, CodersTrust’s work in Somaliland included an Hour of Code event for students, and an ICT program at Tima-ade University.');
  });

  test('every place the built site names Tima-ade says "an ICT program at Tima-ade University" or describes the banner; none says the Hour of Code was "with" the university or calls it a partner', () => {
    const found = contexts();
    expect(found.length, 'the university is named on the site').toBeGreaterThan(5);
    const bad = found.filter((c) => !(ICT_PROGRAM.test(c.text) || BANNER.test(c.text)) || /Hour of Code[^.]{0,80}\bwith\b[^.]{0,30}Tima-ade/i.test(c.text) || /\bpartner/i.test(c.text) || /programme/i.test(c.text));
    expect(bad).toEqual([]);
  });

  test('the register and the data never call Tima-ade University a partner or say the Hour of Code was held with it', () => {
    const strings = [
      ...Object.values(facts).map((f) => `${f.id}: ${f.text} ${f.stat?.label ?? ''} ${f.stat?.detail ?? ''}`),
      ...Object.values(sources).map((s) => `${s.id}: ${s.label} ${s.citation}`),
      ...locations.map((l) => `${l.id}: ${l.note ?? ''}`),
    ].filter((s) => /Tima-ade/.test(s));
    expect(strings.length).toBeGreaterThanOrEqual(3);
    for (const s of strings) {
      expect(s, s).not.toMatch(/Hour of Code[^.]{0,80}\bwith\b[^.]{0,30}Tima-ade/i);
      expect(s, s).not.toMatch(/Partner: Tima-ade|Tima-ade University,? (?:is|as) a partner/i);
      expect(s, s).not.toMatch(/programme/i);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Nigeria is a timeline line only (owner decision 15): About, "Our Story", TL-07; not a location, not counted', () => {
  test('TL-07 is registered with its own source, RFGRANT15 (the Rockefeller Foundation grant page, Wayback copy)', () => {
    const tl = fact('TL-07');
    expect(tl.group).toBe('scale');
    expect(tl.status).toBe('V');
    expect(tl.text).toBe('From 2015 to 2016, a Rockefeller Foundation grant supported a CodersTrust feasibility study in Kenya and Nigeria');
    expect(tl.sourceIds).toEqual(['RFGRANT15']);
    const src = sources.RFGRANT15;
    expect(src.url).toBe(RF_URL);
    expect(src.label).toBe('Rockefeller Foundation, grant “CodersTrust 2015”');
    expect(src.citation).toContain('term 09.01.2015–08.31.2016');
    expect(src.citation).toContain('in support of a feasibility study to explore the potential for replication of a microfinance model in Kenya and Nigeria');
  });

  test('About: the timeline carries the line once, in its existing format (year, title, text), in date order, tied to TL-07', async ({ page }) => {
    await open(page, ABOUT);
    const items = await page.locator('#story .timeline__item').evaluateAll((els) =>
      els.map((e) => ({
        year: (e.querySelector('.timeline__year')?.textContent ?? '').trim(),
        title: (e.querySelector('.timeline__title')?.textContent ?? '').trim(),
        text: (e.querySelector('.timeline__text')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
        fact: e.getAttribute('data-fact') ?? '',
      })),
    );
    expect(items.map((i) => i.year)).toEqual(['2014', '2014–2017', '2015–2016', '2018–2021', '2022–2024', '2025–2026']);
    expect(items.map((i) => i.year)).toEqual(timeline.map((t) => t.year));
    expect(items[2]).toEqual({ year: '2015–2016', title: 'Rockefeller Foundation Grant', text: NIGERIA_TEXT, fact: 'TL-07' });
    expect(`${items[2].year}: ${items[2].text}`).toBe('2015–2016: A Rockefeller Foundation grant supported a CodersTrust feasibility study in Kenya and Nigeria.');
    expect(titleCase(items[2].title)).toBe(items[2].title);
    expect(items.filter((i) => /Nigeria/.test(i.text))).toHaveLength(1);
    await expect(page.locator('main [data-fact~="TL-07"]')).toHaveCount(1);
    // the other five entries are unchanged
    expect(items.filter((_, i) => i !== 2).map((i) => i.title)).toEqual(['Launch in Copenhagen', 'Freelancer Development and Talent Financing', 'NGO Workforce Programs and COVID-19 Teacher Training', 'Government Contracts and University Partnerships', 'JobReady, YouthWIDE and the Impact Survey']);
  });

  test('Nigeria is not a location and is not counted: not in the data, the table, the pins, the cards or the headline', async ({ page }) => {
    expect(locations.map((l) => l.name)).not.toContain('Nigeria');
    expect(locations.map((l) => l.id)).not.toContain('nigeria');
    expect(fact('SC-03').stat?.value).toBe('16');
    expect(`${fact('SC-03').text} ${fact('SC-03').stat?.detail}`).not.toMatch(/Nigeria/);
    await open(page, GLOBAL_REACH);
    expect(await page.content()).not.toMatch(/Nigeria/);
    await expect(page.locator('#wmap-card-nigeria')).toHaveCount(0);
    await expect(page.locator('.wmap__pins > li')).toHaveCount(16);
  });

  test('"Nigeria" is on one site page only, About (the archived news posts keep their own wording); no text file of the build names it', () => {
    expect(sitePages().filter((p) => /\bNigeria\b/.test(p.html)).map((p) => p.route)).toEqual(['/about/']);
    expect(distTextFiles().filter((f) => /\bNigeria\b/.test(f.text)).map((f) => f.file)).toEqual([]);
  });

  test('the line fits with no sideways scroll at 390 and 1280, and its text is not clipped', async ({ page }) => {
    for (const vp of [MOBILE, DESKTOP]) {
      await page.setViewportSize(vp);
      await open(page, ABOUT);
      await scrollThrough(page);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      const item = page.locator('#story .timeline__item[data-fact="TL-07"]');
      await item.scrollIntoViewIfNeeded();
      const box = await item.boundingBox();
      expect(box?.width ?? 0, `${vp.width}px item width`).toBeGreaterThan(200);
      expect(await item.locator('.timeline__text').evaluate((el) => el.scrollWidth <= el.clientWidth + 1), `${vp.width}px text fits`).toBe(true);
      await expect(item.locator('.timeline__text')).toHaveText(NIGERIA_TEXT);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('the Rockefeller Foundation grant amount is never published (owner decision 15)', () => {
  /** A currency symbol or word, a comma-grouped number, or a run of five digits or more. (The amount is not written in this file; the detector is generic.) */
  const AMOUNT = /[$€£¥]|\b(?:USD|EUR|GBP|dollars?|euros?|pounds?|million|billion|thousand)\b|\b\d{1,3}(?:,\d{3})+\b|\b\d{5,}\b/i;
  /** The archived news posts keep their original wording, so one may name the foundation in a sentence with an unrelated count ("over 90,000 youth"): for them only a currency symbol or word counts as an amount. */
  const CURRENCY = /[$€£¥]|\b(?:USD|EUR|GBP|dollars?|euros?|pounds?)\b/i;
  const DATE_FORMS = [/\b(?:0[1-9]|1[0-2])\.[0-3]\d\.\d{4}\b/g, /\b\d{1,2} (?:January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/g, /\b(?:19|20)\d{2}\b/g];
  const withoutDates = (s: string) => DATE_FORMS.reduce((acc, re) => acc.replace(re, ''), s);
  /** The text blocks of a page that name the Rockefeller Foundation: closing block tags break lines, scripts and styles are dropped, inline tags are removed. */
  const blocksNaming = (html: string) =>
    html
      .replace(/<(?:script|style)\b[\s\S]*?<\/(?:script|style)>/gi, ' ')
      .replace(/<head[\s\S]*?<\/head>/i, ' ')
      .replace(/<\/(?:p|li|dd|dt|td|th|h[1-6]|figcaption|blockquote|div|section|article|tr|ul|ol|dl|table|header|footer|main|nav|button)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .split('\n')
      .map(compact)
      .filter((s) => /Rockefeller/i.test(s));

  test('the detector finds amounts (fabricated examples), so the checks below cannot pass by accident', () => {
    for (const s of ['a grant of $12,345', 'USD 12345', '12,345 dollars', 'a grant of 1.5 million', '€9,000', 'amount 123456']) expect(s, s).toMatch(AMOUNT);
    for (const s of ['2015–2016', 'in Kenya and Nigeria', 'term 09.01.2015–08.31.2016', '40 Wall Street']) expect(s, s).not.toMatch(AMOUNT);
  });

  test('the register: TL-07 and the grant source state no amount — after the two term dates, the years and the Wayback date are removed, no digit remains', () => {
    const strings = [fact('TL-07').text, sources.RFGRANT15.label, sources.RFGRANT15.citation];
    for (const s of strings) {
      expect(s, s).not.toMatch(AMOUNT);
      expect(withoutDates(s), s).not.toMatch(/\d/);
    }
    expect(fact('TL-07').stat).toBeUndefined();
    expect(sources.RFGRANT15.url).toBe(RF_URL);
    expect(timeline.map((t) => `${t.year} ${t.title} ${t.text}`).filter((s) => /Rockefeller/.test(s)).map(withoutDates).filter((s) => /\d/.test(s))).toEqual([]);
  });

  test('every register entry, source and data row that names the Rockefeller Foundation states no amount', () => {
    const strings = [
      ...Object.values(facts).map((f) => `${f.id}: ${f.text} ${f.headline ?? ''} ${f.stat?.label ?? ''} ${f.stat?.detail ?? ''}`),
      ...Object.values(sources).map((s) => `${s.id}: ${s.label} ${s.citation}`),
    ].filter((s) => /Rockefeller/i.test(s));
    expect(strings.length).toBeGreaterThanOrEqual(3);
    for (const s of strings) expect(withoutDates(s).replace(/\b[A-Z]{2}-\d{2}[a-z]?\b/g, ''), s).not.toMatch(AMOUNT);
  });

  test('every block of every built page that names the Rockefeller Foundation, and every attribute value that does, states no amount', () => {
    const pages = allPages();
    const naming = pages.filter((p) => /Rockefeller/i.test(p.html));
    expect(naming.length, 'the foundation is named on built pages').toBeGreaterThan(3);
    const offenders: string[] = [];
    for (const p of naming) {
      const detector = p.route.startsWith('/news/') ? CURRENCY : AMOUNT;
      for (const b of blocksNaming(p.html)) if (detector.test(withoutDates(b))) offenders.push(`${p.route}: "${b.slice(0, 120)}"`);
      for (const m of p.html.matchAll(/="([^"]*Rockefeller[^"]*)"/gi)) if (detector.test(withoutDates(m[1]))) offenders.push(`${p.route}: attribute "${m[1].slice(0, 120)}"`);
      // JSON-LD and other scripts: a window around each mention
      for (const m of p.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
        for (const at of m[1].matchAll(/Rockefeller/gi)) if (AMOUNT.test(withoutDates(m[1].slice(Math.max(0, at.index - 120), at.index + 160)))) offenders.push(`${p.route}: script near "Rockefeller"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the text files of the build (llms.txt, sitemaps, manifests, CSV) state no amount beside the foundation', () => {
    const offenders = distTextFiles()
      .flatMap((f) => f.text.split('\n').filter((line) => /Rockefeller/i.test(line)).map((line) => ({ file: f.file, line: line.slice(0, 160) })))
      .filter((l) => AMOUNT.test(withoutDates(l.line)));
    expect(offenders).toEqual([]);
  });

  test('the About line itself shows the foundation, the study and the two countries — and nothing numeric but the years', async ({ page }) => {
    await open(page, ABOUT);
    const item = page.locator('#story .timeline__item[data-fact="TL-07"]');
    // the year, title and text are separate block elements with no whitespace between them in the markup, so they are read one by one
    const t = [await item.locator('.timeline__year').textContent(), await item.locator('.timeline__title').textContent(), await item.locator('.timeline__text').textContent()].map(compact).join(' ');
    expect(t).toBe(`2015–2016 Rockefeller Foundation Grant ${NIGERIA_TEXT}`);
    expect(withoutDates(t)).not.toMatch(/\d/);
    expect(t).not.toMatch(AMOUNT);
  });
});
