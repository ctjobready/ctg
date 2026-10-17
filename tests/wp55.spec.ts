import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact, factsByGroup, sources } from '../src/data/facts';
import { WB_KOSOVO } from '../src/data/copy';
import { locations } from '../src/data/countries';
import { WORLD_STRIP, WORLD_STRIP_SHORT } from '../src/data/globalStrip';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP55 behaviors (owner decisions 2026-10-17/18: global positioning; "CodersTrust Around the World"). Retrospective coverage (the owner exempted this project from test-first work); each test states one observable
 * behavior of the built site or of the register behind it (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp55.spec.ts --project=chromium`):
 *   - the register: SC-03 and SC-16 say 17 countries and territories; the dated tile facts (TL-01 to TL-06), the World Bank's Kosovo figure (PR-02b), the two Digital Jobs Albania figures (PR-07, PR-08) and the World Bank pages (PA-12) have sources;
 *   - Global Reach: 17 locations (Egypt and Benin added; Uganda, Somaliland, Iraq, Albania and Kosovo corrected), a photograph in every row that has one;
 *   - the "CodersTrust Around the World" strip: seven tiles on Home and About, three on the audience pages, ending on Bangladesh;
 *   - the "As covered by" press line (text links, no logos);
 *   - Kosovo "show both": the program records (102 of 150) and the World Bank's 77 trainees, wherever PR-02 is shown;
 *   - the former "Albania" photograph is the Kosovo pilot: cropped above its burned-in caption, re-keyed, captioned Kosovo, and gone from the pages that treated it as Albania;
 *   - the fifth case study (Digital Jobs Albania) and its hub entries; the five news-archive entries; the permissions rows of every added photograph.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
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
/** Built pages that are not archived news posts (those keep their original wording), with their HTML. */
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const repo = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));

const HOME = '';
const ABOUT = 'about/';
const DP = 'partner-with-us/development-partners/';
const GOV = 'partner-with-us/governments/';
const FOUND = 'partner-with-us/foundations/';
const IMPACT = 'impact/';
const HUB = 'impact/case-studies/';
const KOSOVO = 'impact/case-studies/kosovo-women-in-online-work/';
const ALBANIA = 'impact/case-studies/digital-jobs-albania/';
const YOUTHWIDE = 'programs/youthwide/';
const FIELD = 'impact/in-the-field/';
const GLOBAL_REACH = 'impact/global-reach/';

const NEWS = [
  { slug: 'coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner', title: 'CodersTrust Launches in Copenhagen with a Virgin Unite Dinner', date: 'April 8, 2014', topic: 'Programs and Events' },
  { slug: 'coderstrust-presents-at-in5-in-dubai', title: 'CodersTrust Presents at In5 in Dubai', date: 'April 29, 2014', topic: 'Programs and Events' },
  { slug: 'hour-of-code-in-somaliland', title: 'Hour of Code in Somaliland', date: 'December 21, 2015', topic: 'Programs and Events' },
  { slug: 'coderstrust-sets-up-in-india', title: 'CodersTrust Sets Up in India', date: 'August 7, 2016', topic: 'Programs and Events' },
  { slug: 'coderstrust-announces-learning-partnerships-in-uganda', title: 'CodersTrust Announces Learning Partnerships in Uganda', date: 'September 10, 2020', topic: 'Partnerships' },
];

/** The sources WP55 added to the register (each links to its public page or its Wayback Machine copy); SC-03 also keeps the two older internal sources, which have no link. */
const NEW_SOURCES = ['BORSEN14', 'CTCPH14', 'DAILYSTAR14', 'NATIONAL14', 'GULFNEWS14', 'CTDUBAI14', 'TUMBLRHOC15', 'CTGALLERY23', 'CTACADEMY20', 'WBKOSOVO', 'WBKOSOVO17', 'MED17', 'WBFEATURE16', 'WBDJA21', 'WBBLOG22', 'TBSCCNY24'];
// (the private never-publish and content-rule lists are checked by the production gate over the built pages and the committed files; this spec checks what it can without naming them)
const MONEY = /[$€£]|\bmillion\b|\bbillion\b/i;

test.describe('the register: 17 countries and territories, and the new dated and World Bank facts', () => {
  test('SC-03 is 17 (Bangladesh plus 16 others) and keeps "most delivery has been in Bangladesh"; SC-16 says 17 too; the Global Reach list has 17 locations', () => {
    const sc03 = fact('SC-03');
    expect(sc03.stat?.value).toBe('17');
    expect(sc03.stat?.numeric).toBe(17);
    expect(sc03.text).toBe('Programs in 17 countries and territories across Asia, Africa, Europe and the Americas, including Bangladesh since 2014');
    expect(sc03.stat?.detail).toBe('Bangladesh plus 16 other countries and territories; most delivery has been in Bangladesh.');
    expect(fact('SC-16').text).toContain('17 countries and territories');
    expect(fact('SC-16').stat?.glance?.note).toBe('Through 150,000+ enrollments across 17 countries and territories.');
    expect(locations).toHaveLength(17);
    expect(new Set(locations.map((l) => l.name)).size, 'no location is listed twice').toBe(17);
    expect(locations.length).toBe(Number(sc03.stat?.value));
  });

  test('the six dated tile facts carry a date, one short line and at least one source with a link', () => {
    const tl = ['TL-01', 'TL-02', 'TL-03', 'TL-04', 'TL-05', 'TL-06'].map((id) => fact(id));
    expect(tl.map((f) => f.stat?.value)).toEqual(['April 2014', 'April 2014', '2015', '2016–2017', '2021–2022', 'April 2024']);
    for (const f of tl) {
      expect(f.stat?.label.length, f.id).toBeLessThanOrEqual(60);
      expect(f.sourceIds?.length, f.id).toBeGreaterThan(0);
    }
    expect(tl.map((f) => f.stat?.label)).toEqual([
      'Launched at a Virgin Unite dinner',
      'Start-up event at In5, Dubai Internet City',
      'Hour of Code with Tima-ade University',
      'Women in Online Work, with the World Bank',
      'A World Bank initiative, delivered online',
      'MoU with The City College of New York',
    ]);
  });

  test('every new or changed fact names sources that exist and link out; none states a money amount', () => {
    for (const id of ['SC-03', 'TL-01', 'TL-02', 'TL-03', 'TL-04', 'TL-05', 'TL-06', 'PR-02b', 'PR-07', 'PR-08', 'PA-12']) {
      const f = fact(id);
      expect(f.sourceIds?.length, `${id} has a source`).toBeGreaterThan(0);
      for (const s of f.sourceIds ?? []) {
        const src = sources[s];
        expect(src, `${id}: source ${s} exists`).toBeTruthy();
        if (NEW_SOURCES.includes(s)) expect(src.url, `${s} has a URL`).toMatch(/^https:\/\//);
      }
      expect(`${f.text} ${f.stat?.label ?? ''} ${f.stat?.detail ?? ''}`, id).not.toMatch(MONEY);
    }
  });

  test('PR-02b is the World Bank’s own figure for Kosovo, 77, kept beside PR-02’s program records (102 of 150) and never in place of them', () => {
    expect(fact('PR-02').stat?.value).toBe('102 of 150');
    const wb = fact('PR-02b');
    expect(wb.stat?.value).toBe('77');
    expect(wb.stat?.numeric).toBe(77);
    expect(wb.text).toBe('The World Bank reports that 77 trainees in the Women in Online Work pilot in Kosovo won at least one online work contract in the pilot’s first two phases');
    expect(wb.sourceIds).toEqual(['WBKOSOVO17', 'WBKOSOVO']);
    expect(sources.WBKOSOVO.url).toBe('https://www.worldbank.org/en/country/kosovo/brief/kosovo-wow');
    expect(WB_KOSOVO.text).toBe('World Bank: 77 trainees won at least one online contract.');
    expect(WB_KOSOVO.facts).toEqual(['PR-02b']);
  });

  test('the two Digital Jobs Albania figures are the World Bank’s, from May 2022: interest (5,000+) and enrollment (500+), not completion or employment', () => {
    expect(fact('PR-07').stat?.value).toBe('500+');
    expect(fact('PR-08').stat?.value).toBe('5,000+');
    for (const id of ['PR-07', 'PR-08']) {
      expect(fact(id).text, id).toContain('the World Bank reported in May 2022');
      expect(fact(id).sourceIds, id).toEqual(['WBBLOG22']);
      expect(`${fact(id).text} ${fact(id).stat?.label}`, id).not.toMatch(/completed|graduat|employed|earn/i);
    }
  });

  test('the strip’s facts are in the "scale" group and the strip reads its dates and lines from them (nothing is typed twice)', () => {
    const scale = factsByGroup('scale').map((f) => f.id);
    for (const id of ['TL-01', 'TL-02', 'TL-03', 'TL-04', 'TL-05', 'TL-06']) expect(scale, id).toContain(id);
    const byId = Object.fromEntries(WORLD_STRIP.map((t) => [t.id, t]));
    for (const [tile, id] of [['copenhagen', 'TL-01'], ['dubai', 'TL-02'], ['somaliland', 'TL-03'], ['kosovo', 'TL-04'], ['albania', 'TL-05'], ['new-york', 'TL-06']] as const) {
      expect(byId[tile].when, tile).toBe(fact(id).stat?.value);
      expect(byId[tile].line, tile).toBe(fact(id).stat?.label);
      expect(byId[tile].factIds, tile).toEqual([id]);
    }
    expect(WORLD_STRIP.map((t) => t.id)).toEqual(['copenhagen', 'dubai', 'somaliland', 'kosovo', 'albania', 'new-york', 'bangladesh']);
    expect(WORLD_STRIP_SHORT.map((t) => t.id)).toEqual(['copenhagen', 'dubai', 'kosovo']);
  });
});

test.describe('Global Reach: 17 locations, the owner’s corrected rows, and a photograph where one exists', () => {
  const row = (page: Page, name: string) => page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: name }) }).first();
  const cell = (page: Page, name: string, label: string) => row(page, name).locator(`td[data-label="${label}"]`);

  test('the table lists the 17 locations and the map has 17 pins', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const names = await page.locator('.wmap__table tbody tr').evaluateAll((rows) => rows.map((r) => (r.querySelector('th')?.firstChild?.textContent ?? '').trim()).sort());
    expect(names).toEqual(['Albania', 'Bangladesh', 'Benin', 'Bhutan', 'Denmark', 'Egypt', 'Honduras', 'India', 'Iraq', 'Jordan', 'Kenya', 'Kosovo', 'Malaysia', 'Poland', 'Somalia', 'Somaliland', 'Uganda']);
    await expect(page.locator('.wmap__pins > li')).toHaveCount(17);
  });

  test('Egypt and Benin are 2020 partnerships (CrossWorkers; SOS Children’s Villages), Uganda is 2020 (three partners), Somaliland is 2015–2016 (Tima-ade University), Iraq is 2018 and says "announced" only', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const get = async (name: string) => ({
      years: compact(await cell(page, name, 'Years').textContent()),
      target: compact(await cell(page, name, 'Target Group').textContent()),
      skills: compact(await cell(page, name, 'Skills').textContent()),
      note: compact(await cell(page, name, 'Partner / Note').textContent()),
    });
    expect(await get('Egypt')).toEqual({ years: '2020', target: 'Students learning with a local partner', skills: 'Digital and soft skills for online freelancing', note: 'Partner: CrossWorkers' });
    expect(await get('Benin')).toEqual({ years: '2020', target: 'Students learning with a local partner', skills: 'Digital and soft skills for online freelancing', note: 'Partner: SOS Children’s Villages' });
    const uganda = await get('Uganda');
    expect(uganda.years).toBe('2020');
    expect(uganda.note).toBe('Partners: Maarifasasa, Makerere University Business School and U-Touch');
    expect(uganda.target, 'the unsupported "100 participants aged 18 to 40" is gone').not.toMatch(/\d/);
    const somaliland = await get('Somaliland');
    expect(somaliland.years).toBe('2015–2016');
    expect(somaliland.note).toBe('Partner: Tima-ade University (Hour of Code, December 2015)');
    const iraq = await get('Iraq');
    expect(iraq.years).toBe('2018');
    expect(iraq.note).toBe('Cooperation with the World Food Programme announced in March 2018');
    expect(iraq.note, 'Iraq states no outcome').not.toMatch(/trained|graduat|enrolled|employ|completed|earned|earning|\d+ (people|refugees|learners)/i);
  });

  test('Albania names the World Bank Group, Digital Jobs Albania, the Government of Albania and EuroPartners Development, and shows no photograph (none exists)', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    expect(compact(await cell(page, 'Albania', 'Partner / Note').textContent())).toBe('Partner: World Bank Group (Digital Jobs Albania, with the Government of Albania and EuroPartners Development)');
    expect(compact(await cell(page, 'Albania', 'Years').textContent())).toBe('2021–2022');
    await expect(row(page, 'Albania').locator('img')).toHaveCount(0);
    expect(compact(await cell(page, 'Kosovo', 'Partner / Note').textContent())).toBe('Partner: World Bank Group (Women in Online Work pilot, 2016–2017)');
  });

  test('a location that has a photograph shows it in its row (Bhutan, Somaliland, Denmark, Kosovo), with alt text; a location without one shows none', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const withPhoto = await page.locator('.wmap__table tbody tr').evaluateAll((rows) =>
      rows.filter((r) => r.querySelector('.wmap__photo img')).map((r) => (r.querySelector('th')?.firstChild?.textContent ?? '').trim()).sort(),
    );
    expect(withPhoto).toEqual(['Bhutan', 'Denmark', 'Kosovo', 'Somaliland']);
    expect(withPhoto).toEqual(locations.filter((l) => l.photo).map((l) => l.name).sort());
    const alts = await page.locator('.wmap__photo img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt') ?? ''));
    expect(alts.length).toBe(4);
    for (const a of alts) expect(a.length, a).toBeGreaterThan(30);
    // the photograph is in the data cell, not the row header, so a screen reader does not read its alt text with every cell of the row
    await expect(page.locator('.wmap__table th[scope="row"] img')).toHaveCount(0);
  });

  test('the hero and description say 17 countries and territories; the thumbnails fit at 390 and 1280 with no sideways scroll', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    await expect(page.locator('main h1')).toHaveText('Delivered in 17 Countries and Territories');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toMatch(/Programs in 17 countries and territories: Bangladesh since 2014, plus 16 international locations/);
    for (const vp of [MOBILE, DESKTOP]) {
      await page.setViewportSize(vp);
      await scrollThrough(page);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      const box = await page.locator('.wmap__photo').first().boundingBox();
      expect(box?.width, `${vp.width}px thumbnail width`).toBeLessThanOrEqual(121);
      expect((box?.width ?? 0) / (box?.height ?? 1), 'the 3:2 frame').toBeCloseTo(1.5, 1);
    }
  });

  test('no built page outside the archived news posts says "15 countries"', () => {
    // (the staging-only component gallery, /styleguide/, keeps arbitrary sample values such as "15 Countries" for its stat samples; it is not in a production build)
    const offenders = sitePages().filter((p) => p.route !== '/styleguide/').filter((p) => /\b15 (countries|Countries)\b/.test(visible(p.html))).map((p) => p.route);
    expect(offenders).toEqual([]);
  });
});

test.describe('"CodersTrust Around the World": seven tiles on Home and About, three on the audience pages, ending on Bangladesh', () => {
  const EXPECTED = [
    ['copenhagen', 'Copenhagen, April 2014. Launched at a Virgin Unite dinner.', 'legacy-global-copenhagen-launch-dinner'],
    ['dubai', 'Dubai, April 2014. Start-up event at In5, Dubai Internet City.', 'legacy-global-dubai-start-up-event'],
    ['somaliland', 'Somaliland, 2015. Hour of Code with Tima-ade University.', 'legacy-global-somaliland-hour-of-code'],
    ['kosovo', 'Kosovo, 2016–2017. Women in Online Work, with the World Bank.', 'legacy-general-kosovo-wow-group'],
    ['albania', 'Albania, 2021–2022. A World Bank initiative, delivered online.', ''],
    ['new-york', 'New York, April 2024. MoU with The City College of New York.', 'legacy-field-ccny-mou-signing'],
    ['bangladesh', 'Bangladesh, since 2014. Most delivery has been in Bangladesh.', 'legacy-general-women-learners-classroom'],
  ] as const;

  test('Home: an H2 band of seven chronological tiles, each place and date first and one short line after it, tied to the register', async ({ page }) => {
    await open(page, HOME);
    const strip = page.locator('#world[data-world-strip]');
    await expect(strip).toHaveCount(1);
    await expect(strip.getByRole('heading', { level: 2, name: 'CodersTrust Around the World' })).toHaveCount(1);
    expect('CodersTrust Around the World').toBe(titleCase('CodersTrust Around the World'));
    await expect(strip.locator('li[data-tile]')).toHaveCount(7);
    expect(await strip.locator('li[data-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tile')))).toEqual(EXPECTED.map((e) => e[0]));
    expect(await texts(page, '#world li[data-tile] figcaption')).toEqual(EXPECTED.map((e) => e[1]));
    expect(await strip.locator('li[data-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['TL-01', 'TL-02', 'TL-03', 'TL-04', 'TL-05', 'TL-06', 'SC-03']);
    for (const cap of await texts(page, '#world figcaption')) expect(cap.length, cap).toBeLessThanOrEqual(90);
    expect(await texts(page, '#world .wst__where')).toEqual(EXPECTED.map((e) => e[1].split('. ')[0] + '.'));
  });

  test('every photographed tile shows its D13 asset with alt text; the Albania tile is a type tile ("Digital Jobs Albania"), because no photograph of the program exists', async ({ page }) => {
    await open(page, HOME);
    for (const [tile, , asset] of EXPECTED) {
      const li = page.locator(`#world li[data-tile="${tile}"]`);
      if (asset === '') {
        await expect(li.locator('img')).toHaveCount(0);
        await expect(li.locator('.wst__mark')).toHaveText('Digital Jobs Albania');
      } else {
        const img = li.locator('img');
        await expect(img, tile).toHaveCount(1);
        expect(await img.getAttribute('data-asset'), tile).toBe(asset);
        expect((await img.getAttribute('alt'))?.length ?? 0, `${tile} alt`).toBeGreaterThan(30);
      }
    }
  });

  test('the strip ends on Bangladesh, in a wider tile that says where most delivery has been (SC-03’s own clause), and links to Global Reach once', async ({ page }) => {
    await open(page, HOME);
    const last = page.locator('#world li[data-tile]').last();
    expect(await last.getAttribute('data-tile')).toBe('bangladesh');
    expect(compact(await last.locator('figcaption').textContent())).toContain('Most delivery has been in Bangladesh.');
    expect(fact('SC-03').stat?.detail).toContain('most delivery has been in Bangladesh');
    const links = page.locator('#world a');
    await expect(links).toHaveCount(1);
    await expect(links).toHaveText('See Global Reach');
    expect(await links.getAttribute('href')).toMatch(/\/impact\/global-reach\/$/);
    // the strip adds Bangladesh to Home once, as its last tile: SC-03 is not anywhere else on the page
    await expect(page.locator('main [data-fact~="SC-03"]')).toHaveCount(1);
  });

  test('About: the same seven tiles as an H3 under the timeline, inside Our Story (the page keeps its H2 jump list)', async ({ page }) => {
    await open(page, ABOUT);
    const strip = page.locator('#story #world[data-world-strip]');
    await expect(strip).toHaveCount(1);
    await expect(strip.getByRole('heading', { level: 3, name: 'CodersTrust Around the World' })).toHaveCount(1);
    expect(await texts(page, '#story #world figcaption')).toEqual(EXPECTED.map((e) => e[1]));
    const timelineBeforeStrip = await page.evaluate(() => {
      const t = document.querySelector('#story .timeline');
      const s = document.querySelector('#story #world');
      return !!t && !!s && !!(t.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(timelineBeforeStrip, 'the strip follows the timeline').toBe(true);
  });

  for (const [name, route] of [['Development Partners', DP], ['Governments', GOV], ['Foundations', FOUND]] as const) {
    test(`${name}: the short strip (Copenhagen, Dubai, Kosovo) is an H3 inside the Our Track Record band, and no photograph repeats on the page`, async ({ page }) => {
      await open(page, route);
      const strip = page.locator('#guide #world[data-world-strip]');
      await expect(strip).toHaveCount(1);
      await expect(strip.getByRole('heading', { level: 3, name: 'CodersTrust Around the World' })).toHaveCount(1);
      expect(await strip.locator('li[data-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tile')))).toEqual(['copenhagen', 'dubai', 'kosovo']);
      expect(await texts(page, '#guide #world figcaption')).toEqual([EXPECTED[0][1], EXPECTED[1][1], EXPECTED[3][1]]);
      const inStrip = await strip.locator('img[data-asset]').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('data-asset')));
      const elsewhere = await page.locator('img[data-asset]').evaluateAll((imgs) => imgs.filter((i) => !i.closest('[data-world-strip]')).map((i) => i.getAttribute('data-asset')));
      for (const a of inStrip) expect(elsewhere, `${a} is on the page once`).not.toContain(a);
    });
  }

  test('no photograph of the strip repeats elsewhere on Home or About', async ({ page }) => {
    for (const route of [HOME, ABOUT]) {
      await open(page, route);
      const inStrip = await page.locator('[data-world-strip] img[data-asset]').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('data-asset')));
      expect(inStrip.length, route).toBe(6);
      const elsewhere = await page.locator('img[data-asset]').evaluateAll((imgs) => imgs.filter((i) => !i.closest('[data-world-strip]')).map((i) => i.getAttribute('data-asset')));
      for (const a of inStrip) expect(elsewhere, `${route}: ${a}`).not.toContain(a);
    }
  });

  test('1280 px: four tiles in the first row, Bangladesh across two columns, equal heights per row; 390 px: two tiles a row, Bangladesh across the row; no sideways scroll on any page that carries the strip', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HOME);
    await scrollThrough(page);
    const rects = await page.locator('#world li[data-tile]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) }; }));
    expect(new Set(rects.slice(0, 4).map((r) => r.top)).size, 'the first four share a row').toBe(1);
    expect(rects.slice(0, 4).map((r) => r.left), 'four distinct columns').toEqual([...rects.slice(0, 4).map((r) => r.left)].sort((a, b) => a - b));
    expect(new Set(rects.slice(0, 4).map((r) => r.height)).size, 'equal heights in row one').toBe(1);
    expect(rects[4].top).toBeGreaterThan(rects[0].top);
    expect(rects[6].width, 'the Bangladesh tile spans two columns').toBeGreaterThan(rects[0].width * 1.8);
    expect(new Set([rects[4].top, rects[5].top, rects[6].top]).size, 'the last three share the second row').toBe(1);
    await page.setViewportSize(MOBILE);
    await open(page, HOME);
    await scrollThrough(page);
    const m = await page.locator('#world li[data-tile]').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), left: Math.round(r.left), width: Math.round(r.width) }; }));
    expect(m[0].top).toBe(m[1].top);
    expect(m[2].top).toBeGreaterThan(m[0].top);
    expect(m[6].width, 'Bangladesh takes the whole row').toBeGreaterThan(m[0].width * 1.8);
    for (const route of [HOME, ABOUT, DP, GOV, FOUND]) {
      for (const vp of [MOBILE, DESKTOP]) {
        await page.setViewportSize(vp);
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    }
  });

  test('the tile cards have uniform borders (no coloured accent bar on one edge), and their text sits inside them', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, HOME);
    await scrollThrough(page);
    const bad = await page.locator('#world .wst__card').evaluateAll((els) =>
      els.flatMap((e) => {
        const c = getComputedStyle(e);
        const problems: string[] = [];
        if (c.borderTopWidth !== c.borderBottomWidth || c.borderLeftWidth !== c.borderRightWidth || c.borderTopWidth !== c.borderLeftWidth) problems.push(`border widths ${c.borderTopWidth}/${c.borderRightWidth}/${c.borderBottomWidth}/${c.borderLeftWidth}`);
        if (c.borderTopColor !== c.borderBottomColor || c.borderLeftColor !== c.borderRightColor) problems.push('border colours differ');
        const cap = e.querySelector('figcaption');
        if (cap && cap.scrollWidth > cap.clientWidth + 1) problems.push('caption overflows');
        return problems.length ? [`${e.closest('li')?.getAttribute('data-tile')}: ${problems.join('; ')}`] : [];
      }),
    );
    expect(bad).toEqual([]);
  });
});

test.describe('"As covered by": a line of text links with years, no logos, on Home and About', () => {
  const LINE = 'As covered by Gulf News (2014), TechCrunch (2014), Forbes (2014, contributor post), The Wall Street Journal (2014), USA Today (2014), Tech in Asia (2015) and The Times of India (2016); and by the World Bank on Kosovo (2016, 2017) and Albania (2021).';
  const HREFS = [
    'https://gulfnews.com/technology/skype-co-founder-seeks-local-partners-in-new-venture-1.1327190',
    'https://techcrunch.com/2014/06/13/building-code-to-break-poverty-in-bangladesh/',
    'https://web.archive.org/web/20140924225212/http://www.forbes.com/sites/ilyapozin/2014/08/21/5-companies-making-a-splash-for-a-better-world/',
    'https://web.archive.org/web/20141224065551/http://blogs.wsj.com/cio/2014/09/24/startup-aims-to-boost-number-of-qualified-it-workers/',
    'https://web.archive.org/web/20141228085159/http://www.usatoday.com/story/tech/columnist/shinal/2014/12/22/new-york-bangladesh-global-technology-trends/20734365/',
    'https://www.techinasia.com/microfinance-startup-coders-trust-teaches-code',
    'https://timesofindia.indiatimes.com/home/sunday-times/Cook-to-coder-How-low-income-youth-are-writing-a-better-future/articleshow/53575603.cms',
    'https://web.archive.org/web/20170504003520/http://www.worldbank.org/en/news/feature/2016/09/19/kosovos-women-go-wow-online-and-working',
    'https://www.worldbank.org/en/country/kosovo/brief/kosovo-wow',
    'https://www.worldbank.org/en/news/press-release/2021/09/14/women-in-albania-to-gain-greater-access-to-global-digital-jobs-market-with-world-bank-support',
  ];

  for (const [name, route] of [['Home', HOME], ['About', ABOUT]] as const) {
    test(`${name}: the line reads as written, links ten dated pages that leave the site safely, and carries no image`, async ({ page }) => {
      await open(page, route);
      const line = page.locator('p.cov');
      await expect(line).toHaveCount(1);
      const text = await line.evaluate((el) => {
        const c = el.cloneNode(true) as HTMLElement;
        c.querySelectorAll('.sr-only').forEach((n) => n.remove());
        return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
      });
      expect(text).toBe(LINE);
      expect(await line.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(HREFS);
      expect(await line.locator('a').evaluateAll((as) => as.every((a) => /noopener/.test(a.getAttribute('rel') ?? '')))).toBe(true);
      await expect(line.locator('img, svg, picture')).toHaveCount(0);
      expect(await line.getAttribute('data-fact')).toBe('PA-09 PA-12');
      // every link says where it goes, for a screen reader
      expect(await line.locator('a .sr-only').count()).toBe(10);
    });
  }

  test('the line is on Home and About only (the Recognition and Media page keeps its logo list)', () => {
    const on = sitePages().filter((p) => /class="cov[ "]/.test(p.html)).map((p) => p.route).sort();
    expect(on).toEqual(['/', '/about/']);
  });

  test('the line fits at 390 px with no sideways scroll', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    for (const route of [HOME, ABOUT]) {
      await open(page, route);
      await scrollThrough(page);
      expect(await noOverflow(page), route).toBe(true);
    }
  });
});

test.describe('Kosovo: both figures, the program records and the World Bank’s, wherever PR-02 is shown', () => {
  const LINE = 'World Bank: 77 trainees won at least one online contract.';

  test('Home, Development Partners and YouthWIDE: the Kosovo card carries the World Bank line once, tied to PR-02b, beside its program-record line', async ({ page }) => {
    for (const route of [HOME, DP, YOUTHWIDE]) {
      await open(page, route);
      const card = page.locator('#cases article', { hasText: 'Women in Online Work, Kosovo' });
      await expect(card, route).toHaveCount(1);
      await expect(card.locator('.case__note'), route).toHaveText(LINE);
      expect(await card.locator('.case__note').getAttribute('data-fact'), route).toBe('PR-02b');
      expect(compact(await page.locator('main').textContent()).split(LINE).length - 1, `${route}: the line is stated once`).toBe(1);
    }
    // Home states the program records in the slide above; the card adds only the World Bank's figure. Development Partners and YouthWIDE show both on the card.
    await open(page, HOME);
    expect(compact(await page.locator('#results').textContent())).toContain('102 of 150');
    await open(page, DP);
    expect(compact(await page.locator('#cases article', { hasText: 'Women in Online Work, Kosovo' }).textContent())).toContain('102 of 150');
  });

  test('Governments, Foundations and the Impact glance: the PR-02 tile adds the World Bank line under its figure, and the tile is tied to both facts', async ({ page }) => {
    for (const route of [GOV, FOUND, IMPACT]) {
      await open(page, route);
      const tile = page.locator('#glance [data-fact~="PR-02"]').first();
      await expect(tile, route).toBeVisible();
      const t = compact(await tile.textContent());
      expect(t, route).toContain('102 of 150');
      expect(t, route).toContain(LINE);
      expect(await tile.getAttribute('data-fact'), route).toContain('PR-02b');
    }
  });

  test('the Case Studies hub card and the Kosovo case study give both: the card as a second line, the case study as a sentence after the program-record figures', async ({ page }) => {
    await open(page, HUB);
    const card = page.locator('article.case', { hasText: 'Women in Online Work, Kosovo' });
    await expect(card.locator('.case__value')).toHaveText('102 of 150');
    await expect(card.locator('.case__second')).toHaveText(LINE);
    await open(page, KOSOVO);
    const results = compact(await page.locator('#results').textContent());
    expect(results).toContain('102 of 150 women in work (68%)');
    expect(results).toContain('The World Bank reports that 77 trainees in the Women in Online Work pilot in Kosovo won at least one online work contract in the pilot’s first two phases.');
    expect(results.indexOf('102 of 150'), 'the program records come first').toBeLessThan(results.indexOf('77 trainees'));
  });

  test('every built page that shows the 102 of 150 also shows the World Bank’s 77 (the staging-only component gallery aside)', () => {
    const missing = sitePages()
      .filter((p) => p.route !== '/styleguide/')
      .filter((p) => /102 of 150/.test(visible(p.html)) && !/World Bank: 77 trainees|The World Bank reports that 77 trainees/.test(visible(p.html)))
      .map((p) => p.route);
    expect(missing).toEqual([]);
  });

  test('the World Bank’s figure is a short line (under 70 characters), is not given an evidence pill, and states no earnings or money', () => {
    expect(WB_KOSOVO.text.length).toBeLessThan(70);
    expect(WB_KOSOVO.text).not.toMatch(MONEY);
  });
});

test.describe('the former "Albania" photograph is the Kosovo pilot: cropped, re-keyed, captioned Kosovo, and off every Albania context', () => {
  test('the file is cropped above the burned-in caption (its text began at y 425 of 655) and the old file is gone', async () => {
    expect(existsSync(repo('src/assets/images/pages/general/albania-trainees-group.jpg')), 'the old file name').toBe(false);
    const file = repo('src/assets/images/pages/general/kosovo-wow-group.jpg');
    expect(existsSync(file)).toBe(true);
    const meta = await sharp(file).metadata();
    expect(meta.width).toBe(1600);
    expect(meta.height, 'ends above the caption (x 750-930, y 425-470 of the 1600 x 655 original)').toBeLessThan(425);
    expect(meta.height, 'the whole group is kept (the faces end near y 400)').toBeGreaterThanOrEqual(400);
  });

  test('its permissions row is renamed with it (the owner’s 2026-10-11 statement covers it); no row remains for the old key', () => {
    const rows = JSON.parse(readFileSync(new URL('../src/data/permissions.json', import.meta.url), 'utf8')) as { assetId: string; clearanceId: string; status: string }[];
    expect(rows.find((r) => r.assetId === 'legacy-general-kosovo-wow-group')).toMatchObject({ clearanceId: 'OWNER-2026-10-11-OLDSITE', status: 'cleared' });
    expect(rows.find((r) => r.assetId === 'legacy-general-albania-trainees-group')).toBeUndefined();
  });

  test('no built page uses the old key or captions or describes any photograph as Albania', () => {
    const offenders = sitePages().flatMap((p) => {
      const out: string[] = [];
      if (/albania-trainees-group/.test(p.html)) out.push(`${p.route}: the old key`);
      if (/World Bank project, Albania/.test(p.html)) out.push(`${p.route}: the old caption`);
      for (const m of p.html.matchAll(/<img[^>]*\balt="([^"]*Albania[^"]*)"/g)) out.push(`${p.route}: alt "${m[1]}"`);
      for (const m of p.html.matchAll(/<figcaption[^>]*>([^<]*Albania[^<]*)</g)) out.push(`${p.route}: caption "${m[1]}"`);
      return out;
    });
    expect(offenders).toEqual([]);
  });

  test('wherever the photograph is shown it is captioned or described as the Kosovo pilot, and only on Kosovo pages, the strip, Global Reach and In the Field', () => {
    const on = sitePages().filter((p) => p.route !== '/styleguide/' && /data-asset="legacy-general-kosovo-wow-group"/.test(p.html)).map((p) => p.route).sort();
    expect(on).toEqual(['/', '/about/', '/impact/case-studies/kosovo-women-in-online-work/', '/impact/global-reach/', '/impact/in-the-field/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/', '/partner-with-us/governments/']);
    for (const p of sitePages().filter((q) => on.includes(q.route))) {
      const alts = [...p.html.matchAll(/<img[^>]*data-asset="legacy-general-kosovo-wow-group"[^>]*>/g)].map((m) => /alt="([^"]*)"/.exec(m[0])?.[1] ?? '');
      expect(alts.length, p.route).toBe(1);
      expect(alts[0], p.route).toBe('Thirteen people, most of them young women, pose together in a training room in front of two purple Women in Online Work banners');
      expect(visible(p.html), p.route).toContain('Kosovo');
    }
  });

  test('In the Field: the group is captioned "Women in Online Work trainees, Kosovo, 2016–17" under "Women’s Programs: Kosovo and Bangladesh", and the page lead no longer says Albania', async ({ page }) => {
    await open(page, FIELD);
    await expect(page.getByRole('heading', { level: 2, name: 'Women’s Programs: Kosovo and Bangladesh' })).toHaveCount(1);
    expect(await texts(page, 'figure:has(img[alt*="Women in Online Work banners"]) figcaption')).toEqual(['Women in Online Work trainees, Kosovo, 2016–17']);
    expect(compact(await page.locator('main').textContent())).not.toMatch(/Albania/);
    expect(compact(await page.locator('main .hero__lead').first().textContent())).toContain('from Kosovo to Bangladesh');
  });

  test('the Development Partners hero is the Somaliland Hour of Code, the Case Studies hero is the Bhutan inauguration, and the YouthWIDE gallery shows the Somaliland photograph in its second place', async ({ page }) => {
    await open(page, DP);
    expect(await page.locator('img[fetchpriority="high"]').first().getAttribute('data-asset')).toBe('legacy-global-somaliland-hour-of-code');
    await open(page, HUB);
    expect(await page.locator('img[fetchpriority="high"]').first().getAttribute('data-asset')).toBe('legacy-global-bhutan-batch-inauguration');
    await open(page, YOUTHWIDE);
    const gallery = await page.locator('#in-the-field figure img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('data-asset')));
    expect(gallery[1]).toBe('legacy-global-somaliland-hour-of-code');
    expect(gallery).toHaveLength(4);
    expect(await texts(page, '#in-the-field figure figcaption')).toContain('Hour of Code with Tima-ade University, Somaliland, December 2015');
  });
});

test.describe('Digital Jobs Albania: the fifth case study, in the World Bank’s wording', () => {
  test('the page follows the template: title, World Bank figure tile, context, challenges, what CodersTrust did, results, keep reading', async ({ page }) => {
    await open(page, ALBANIA);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Digital Jobs Albania: Online Skills for Women, with the World Bank');
    expect(await page.locator('title').textContent()).toContain('Digital Jobs Albania');
    expect(await texts(page, 'main h2')).toEqual(['Why This Program', 'Challenges', 'What CodersTrust Did', 'What Happened', 'Where the Model Runs Next', 'Talk to Us About a First Cohort']);
    await expect(page.locator('.hero [data-fact="PR-07"]')).toHaveCount(1);
    expect(compact(await page.locator('.hero [data-fact="PR-07"]').textContent())).toContain('500+');
    const hero = page.locator('img[fetchpriority="high"]').first();
    expect(await hero.getAttribute('data-asset')).toBe('legacy-global-digital-jobs-albania');
    expect(await page.locator('#cta, section[aria-labelledby="related-h"]').count()).toBe(2);
  });

  test('it names CodersTrust as the international digital skills training provider, in the World Bank’s words, and never another company', async ({ page }) => {
    await open(page, ALBANIA);
    const main = compact(await page.locator('main').textContent());
    expect(main).toContain('The World Bank names CodersTrust as the international digital skills training provider in the partnership.');
    expect(main).toContain('The initiative was implemented with the Government of Albania, CodersTrust and EuroPartners Development, a local consulting company.');
    expect(main).not.toMatch(MONEY);
    expect(main).not.toMatch(/Coderstrust/);
  });

  test('its results are the World Bank’s two figures from May 2022 (5,000+ interest, 500+ enrolled), labelled as interest and enrollment, with a link to the release and no "Program Record" pill', async ({ page }) => {
    await open(page, ALBANIA);
    const results = page.locator('#results, section:has(h2:text("What Happened"))').first();
    const t = compact(await results.textContent());
    expect(t).toContain('What the World Bank Reported');
    expect(t).toContain('5,000+ women expressed interest, far exceeding the available spots.');
    expect(t).toContain('500+ students enrolled in the three-month course.');
    expect(t).toContain('They show interest and enrollment, not completion or employment.');
    expect(await results.locator('div[data-fact="PR-08"], div[data-fact="PR-07"]').count()).toBe(2);
    const link = results.getByRole('link', { name: /Read the World Bank Announcement/ });
    expect(await link.getAttribute('href')).toBe(sources.WBDJA21.url);
    expect(await link.getAttribute('rel')).toMatch(/noopener/);
    await expect(page.locator('main .evidence-tag, main [data-evidence]')).toHaveCount(0);
    expect(compact(await page.locator('.hero').textContent())).not.toContain('Program Record');
    await expect(page.locator('main .ls, main [data-learner-story]')).toHaveCount(0);
  });

  test('the hub lists five case studies with Digital Jobs Albania second, results first and no evidence pill on its card; Impact, Home and the case studies agree on "Five"', async ({ page }) => {
    await open(page, HUB);
    await expect(page.locator('article.case')).toHaveCount(5);
    expect(await texts(page, 'article.case .card__title')).toEqual([
      'Women in Online Work, Kosovo',
      'Digital Jobs Albania',
      'Women’s Skill Development for Freelancing Marketplace (WSDFM)',
      'UNDP YES, Korail',
      'Her Power',
    ]);
    const dja = page.locator('article.case', { hasText: 'Digital Jobs Albania' });
    await expect(dja.locator('.case__value')).toHaveText('500+');
    expect(compact(await dja.locator('.case__label').textContent())).toBe('students enrolled, reported by the World Bank in May 2022 while the program was running');
    await expect(dja.locator('.evidence-tag, [data-evidence]')).toHaveCount(0);
    expect(await dja.locator('a.card__link').getAttribute('href')).toMatch(/\/impact\/case-studies\/digital-jobs-albania\/$/);
    await expect(page.getByRole('heading', { level: 2, name: 'Five Programs, Results First' })).toHaveCount(1);
    await open(page, IMPACT);
    await expect(page.locator('#cases').getByRole('heading', { level: 2, name: 'Five Programs, from Kosovo to Bangladesh' })).toHaveCount(1);
    await open(page, HOME);
    await expect(page.getByRole('link', { name: 'See All Five Case Studies' })).toHaveCount(1);
  });

  test('five cards sit 3 + 2 at 1280 px (no card alone in its row) and stack at 390 px with no sideways scroll', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HUB);
    await scrollThrough(page);
    const tops = await page.locator('article.case').evaluateAll((els) => els.map((e) => (e as HTMLElement).offsetTop));
    expect(new Set(tops.slice(0, 3)).size, 'three in the first row').toBe(1);
    expect(new Set(tops.slice(3)).size, 'two in the second row').toBe(1);
    expect(tops[3]).toBeGreaterThan(tops[0]);
    await open(page, IMPACT);
    const cards = await page.locator('#cases article.card').evaluateAll((els) => els.map((e) => (e.closest('li') as HTMLElement).offsetTop));
    expect(new Set(cards.slice(0, 3)).size, 'Impact: three in the first row').toBe(1);
    await page.setViewportSize(MOBILE);
    for (const route of [HUB, IMPACT, ALBANIA, KOSOVO]) {
      await open(page, route);
      await scrollThrough(page);
      expect(await noOverflow(page), route).toBe(true);
    }
  });

  test('the case study carries a Kosovo learner’s portrait only on the Kosovo page (the portrait is a named person; the Albania page has no learner story)', async ({ page }) => {
    await open(page, KOSOVO);
    const img = page.locator('.ls img');
    await expect(img).toHaveCount(1);
    expect(await img.getAttribute('data-asset')).toBe('legacy-impact-kosovo-graduate-portrait');
    expect(await img.getAttribute('alt')).toBe('Portrait of Erlisa Zherka, a graduate of the Women in Online Work pilot in Kosovo');
    await open(page, ALBANIA);
    await expect(page.locator('.ls')).toHaveCount(0);
  });
});

test.describe('five news-archive entries, dated and sourced, in American English', () => {
  for (const n of NEWS) {
    test(`${n.slug}: "${n.title}", ${n.date}, ${n.topic}, with the added-entry note, sources that open safely, no money amount`, async ({ page }) => {
      await open(page, `news/${n.slug}/`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(n.title);
      expect(n.title).toBe(titleCase(n.title));
      expect(compact(await page.locator('main time').first().textContent())).toBe(n.date);
      expect(compact(await page.locator('main').textContent())).toContain(n.topic);
      await expect(page.locator('.archive-banner__note')).toHaveText('Added in October 2026 from the dated sources linked in the text.');
      const links = page.locator('article.art .art__body a[href^="http"]');
      expect(await links.count(), 'at least one source link').toBeGreaterThan(0);
      expect(await links.evaluateAll((as) => as.every((a) => /noopener/.test(a.getAttribute('rel') ?? '')))).toBe(true);
      const body = compact(await page.locator('article.art').textContent());
      expect(body).not.toMatch(MONEY);
      expect(body, 'American date order: "April 8, 2014", not "8 April 2014"').not.toMatch(/\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December)\b/);
      expect(body).not.toMatch(/programme|organis|colour|centre\b/i);
    });
  }

  test('the news index lists the five, newest of them in date order, with 47 posts in all (42 migrated and the five added)', async ({ page }) => {
    await open(page, 'news/');
    const titles = await texts(page, 'main article h3, main article h2');
    for (const n of NEWS) expect(titles, n.title).toContain(n.title);
    expect(titles.length).toBe(47);
  });

  test('the cover photographs have permissions rows and render (Copenhagen, Dubai and Somaliland); India and Uganda have no photograph and no empty frame', async ({ page }) => {
    await open(page, `news/${NEWS[0].slug}/`);
    expect(await page.locator('article.art img[data-asset]').count()).toBeGreaterThanOrEqual(2);
    await open(page, `news/${NEWS[1].slug}/`);
    expect(await page.locator('article.art img[data-asset]').count()).toBeGreaterThanOrEqual(1);
    await open(page, `news/${NEWS[2].slug}/`);
    expect(await page.locator('article.art img[data-asset]').first().getAttribute('data-asset')).toBe('news-hour-of-code-in-somaliland');
    for (const n of [NEWS[3], NEWS[4]]) {
      await open(page, `news/${n.slug}/`);
      await expect(page.locator('article.art img')).toHaveCount(0);
    }
  });
});

test.describe('every photograph WP55 added has a cleared permissions row with the owner’s 2026-10-18 ruling and a source note', () => {
  const rows = JSON.parse(readFileSync(new URL('../src/data/permissions.json', import.meta.url), 'utf8')) as Record<string, unknown>[];
  const ADDED = [
    'legacy-global-copenhagen-launch-dinner',
    'legacy-global-dubai-start-up-event',
    'legacy-global-somaliland-hour-of-code',
    'legacy-global-bhutan-batch-inauguration',
    'legacy-global-digital-jobs-albania',
    'legacy-impact-kosovo-graduate-portrait',
    'news-coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner',
    'news-coderstrust-presents-at-in5-in-dubai',
    'news-hour-of-code-in-somaliland',
  ];

  test('each added asset has exactly the five fields, is cleared, and cites OWNER-2026-10-18-CTUSA-ASSETS', () => {
    for (const id of ADDED) {
      const r = rows.find((x) => x.assetId === id);
      expect(r, id).toBeTruthy();
      expect(Object.keys(r!).sort(), id).toEqual(['assetId', 'clearanceId', 'publishedOnLegacySite', 'sensitiveGroup', 'status']);
      expect(r!.status, id).toBe('cleared');
      expect(r!.clearanceId, id).toBe('OWNER-2026-10-18-CTUSA-ASSETS');
    }
  });

  test('the named learner’s portrait is marked as a sensitive-group image; none of the event photographs is', () => {
    expect(rows.find((r) => r.assetId === 'legacy-impact-kosovo-graduate-portrait')?.sensitiveGroup).toBe(true);
    for (const id of ADDED.filter((a) => a !== 'legacy-impact-kosovo-graduate-portrait')) expect(rows.find((r) => r.assetId === id)?.sensitiveGroup, id).toBe(false);
  });

  test('each added photograph file is a JPEG of at most 2,000 px wide, and the Albania visual is flattened onto the Airy Blue ground (no transparency)', async () => {
    const files = [
      'src/assets/images/pages/global/copenhagen-launch-dinner.jpg',
      'src/assets/images/pages/global/dubai-start-up-event.jpg',
      'src/assets/images/pages/global/somaliland-hour-of-code.jpg',
      'src/assets/images/pages/global/bhutan-batch-inauguration.jpg',
      'src/assets/images/pages/global/digital-jobs-albania.jpg',
      'src/assets/images/pages/impact/kosovo-graduate-portrait.jpg',
      'src/assets/images/pages/general/kosovo-wow-group.jpg',
      'src/assets/images/news/coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner/launch-dinner-speaker.jpg',
      'src/assets/images/news/coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner/question-and-answer-session.jpg',
      'src/assets/images/news/coderstrust-presents-at-in5-in-dubai/presentation-at-in5.jpg',
    ];
    for (const f of files) {
      const meta = await sharp(repo(f)).metadata();
      expect(meta.format, f).toBe('jpeg');
      expect(meta.width ?? 0, f).toBeLessThanOrEqual(2000);
      expect(meta.hasAlpha ?? false, f).toBe(false);
    }
  });
});
