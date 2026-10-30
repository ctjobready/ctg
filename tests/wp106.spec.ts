import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DIST_DIR } from './support/env';
import { open } from './support/browser';
import { listPages, pageByRoute } from './support/pages';

/**
 * WP106 (Sonnet XHigh run 2, kit 72; owner answers of 2026-10-29). Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp106.spec.ts --project=chromium`.
 *   - Item 1: the About timeline band that lists Her Power (2023-2025), EDGE and SKIT (contract posts of 2023), National University (partner since 2023) and UPEACE (2023) reads "2023–2025", not "2022–2024".
 *   - Item 2: the City College Downtown news post explores expanding the existing partnership (MOU signed April 2024); the post is a new step, not a first proposal.
 *   - Item 3: Recognition drops the NOVA Award from "Aziz Ahmad’s Appointments and Honors" (owner: "bio only"); the bio keeps it.
 *   - Item 4: "Co-Founder and Global Chairman" is "Co-Founder and Chairman" in every news post, headline, excerpt, card and JSON-LD (the URL slug keeps its words: it is the old site's address).
 *   - Item 5: the Privacy Policy says the site is run by CT USA, Inc. (CodersTrust).
 *   - Item 6: Global Reach: Somaliland is "2015–2016, 2020" and the note adds the 2020 partnership announcement.
 *   - Item 7: the Programs page YouthWIDE card is sibling length and keeps the 1 million aim, its 2030 date and its dependency clause.
 *   - Item 8: the Abdul Karim, Faruque Hossain, Ferdinand Kjærulff and Md. Fahim Sheikh bios carry the role in the <title>.
 *   - Item 9: dateModified (and "Last updated" where a page prints one) of the pages this WP changes reads 2026-10-29.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
const htmlOf = (route: string) => readFileSync(pageByRoute(route).file, 'utf8');
const ldJson = async (page: Page) => (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
const words = (t: string) => compact(t).split(' ').length;

/** Every text file in dist/ (pages, redirect stubs, feeds, llms.txt, sitemaps): the title must be gone from all of them. */
function distTextFiles(dir = DIST_DIR, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) distTextFiles(full, out);
    else if (/\.(html|xml|txt|json|webmanifest|md)$/.test(name)) out.push(full);
  }
  return out;
}

const CCNY = 'news/coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership/';
const UPEACE = 'news/aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador/';
const FOREIGN_MINISTER = 'news/coderstrust-chairman-aziz-ahmad-meets-bangladesh-foreign-affairs-minister-khalilur-rahman/';
const DIGITAL_FACTORY = 'news/why-we-call-it-a-digital-factory/';

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 1: the About timeline band for the contracts and university partnerships is 2023–2025', () => {
  test('the band reads "2023–2025" and the sequence of band years has no band that starts before its first dated item', async ({ page }) => {
    await open(page, 'about/');
    const years = (await page.locator('#story .timeline__year').allTextContents()).map(compact);
    expect(years).toEqual(['2014', '2014–2017', '2015–2016', '2018–2021', '2023–2025', '2025–2026']);
    const band = page.locator('#story .timeline__item', { hasText: 'Government Contracts and University Partnerships' });
    await expect(band).toHaveCount(1);
    expect(compact(await band.locator('.timeline__year').textContent())).toBe('2023–2025');
  });

  test('the band’s items are the site’s own 2023 and 2023–2025 dates (Her Power 2023–2025; EDGE, SKIT and National University 2023), none of them 2022', async ({ page }) => {
    await open(page, 'about/');
    const text = compact(await page.locator('#story .timeline__item', { hasText: 'Government Contracts and University Partnerships' }).textContent());
    expect(text).toContain('Her Power');
    expect(text).toContain('official training partner since 2023');
    expect(text).not.toContain('2022');
    // the dates the band stands on
    const caseStudies = readFileSync('src/components/pages/impact/case-studies.ts', 'utf8');
    expect(caseStudies).toContain('Government of Bangladesh, 2023–2025');
    for (const slug of ['1000-trainees-enhancing-digital-government-economy-edge', '1000-trainees-sheikh-kamal-ict-incubator-training', 'coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration']) {
      expect(readFileSync(`src/content/news/${slug}.md`, 'utf8'), slug).toMatch(/^date: 2023-/m);
    }
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 2: the City College Downtown post explores expanding the existing partnership (MOU, April 2024)', () => {
  const EXCERPT = 'Aziz Ahmad visits City College Downtown to discuss expanding the partnership with The City College of New York, an MOU partner since April 2024.';

  test('the first paragraph names the existing partnership and the April 2024 MOU; the second says "an expanded partnership"', async ({ page }) => {
    await open(page, CCNY);
    const body = compact(await page.locator('main').textContent());
    expect(body).toContain(
      'discuss expanding the existing partnership between CodersTrust and the City College of New York (CCNY), which began with a memorandum of understanding (MOU) signed in April 2024, through the Continuing and Professional Studies Program.',
    );
    expect(body).toContain('making selected professional and career-focused courses available to an international audience through an expanded partnership.');
    expect(body).toContain('An expanded partnership would align closely with CodersTrust’s core mission');
    expect(body).toContain('As discussions progress, the expanded partnership could create new opportunities for knowledge sharing and international learning');
  });

  test('no sentence calls it a "potential" or "proposed" partnership, and the rest of the post stays', async ({ page }) => {
    await open(page, CCNY);
    const body = compact(await page.locator('main').textContent());
    expect(body).not.toMatch(/potential partnership|proposed partnership|through a potential/i);
    expect(body).toContain('has trained 130,000+ learners since 2014 and worked in 16 countries and territories');
    expect(body).toContain('Mr. Ahmad, an alumnus of CCNY, leads CodersTrust');
    expect(body).toContain('CEO of UTC Associates');
  });

  test('the excerpt (meta description, News index card) says the same, and the old excerpt is on no page', async ({ page }) => {
    await open(page, CCNY);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe(EXCERPT);
    expect(EXCERPT.length).toBeLessThanOrEqual(155);
    expect(EXCERPT.length).toBeLessThanOrEqual(180); // the excerpt field’s own limit
    expect(readFileSync(`src/content/news/${CCNY.replace(/^news\/|\/$/g, '')}.md`, 'utf8')).toContain(`excerpt: "${EXCERPT}"`);
    const stale = listPages().filter((p) => visible(readFileSync(p.file, 'utf8')).includes('to discuss collaboration with its Continuing and Professional Studies Program')).map((p) => p.route);
    expect(stale).toEqual([]);
    const cards = listPages().filter((p) => visible(readFileSync(p.file, 'utf8')).includes(EXCERPT)).map((p) => p.route);
    expect(cards, 'the News index lists the card').toContain('/news/');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 3: Recognition drops the NOVA Award; the bio keeps it', () => {
  test('"Aziz Ahmad’s Appointments and Honors" lists the UPEACE appointment and the SDG Life Achievement Award only', async ({ page }) => {
    await open(page, 'about/recognition/');
    const titles = (await page.locator('#honors .rec-honor .card__title').allTextContents()).map(compact);
    expect(titles).toEqual(['Global UPEACE Ambassador', 'SDG Life Achievement Award']);
    const section = compact(await page.locator('#honors').textContent());
    expect(section).not.toContain('NOVA');
    expect(section).not.toContain('green technology');
    expect(section).not.toContain('In His Profile');
  });

  test('no part of the Recognition page says NOVA', () => {
    expect(visible(htmlOf('/about/recognition/'))).not.toContain('NOVA');
  });

  test('Aziz Ahmad’s bio still says he received the NOVA Award in 2022 for green technology', () => {
    expect(visible(htmlOf('/about/team/aziz-ahmad/'))).toContain('He received the NOVA Award in 2022 for his contribution to the green technology industry');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 4: "Co-Founder and Global Chairman" is "Co-Founder and Chairman" everywhere', () => {
  test('no file in the build (pages, stubs, feeds, llms.txt, JSON-LD) says "Global Chairman"', () => {
    const offenders = distTextFiles()
      .filter((f) => /Global Chairman/i.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(DIST_DIR.length));
    expect(offenders).toEqual([]);
  });

  test('the UPEACE post: H1, <title> source, excerpt-driven description and NewsArticle headline say "Co-Founder and Chairman of CodersTrust"', async ({ page }) => {
    await open(page, UPEACE);
    expect(compact(await page.locator('h1').textContent())).toBe('Aziz Ahmad, Co-Founder and Chairman of CodersTrust, Appointed as Global UPEACE Ambassador');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe('Aziz Ahmad, Co-Founder and Chairman of CodersTrust, is appointed a Global Ambassador of the University for Peace (UPEACE).');
    const ld = await ldJson(page);
    expect(ld).toContain('Aziz Ahmad, Co-Founder and Chairman of CodersTrust, Appointed as Global UPEACE Ambassador');
    expect(compact(await page.locator('main').textContent())).toContain('congratulates Aziz Ahmad, Co-Founder and Chairman of CodersTrust, on his appointment');
  });

  test('the Foreign Minister post and the Digital Factory post say "Co-Founder and Chairman"', async ({ page }) => {
    await open(page, FOREIGN_MINISTER);
    expect(compact(await page.locator('main').textContent())).toContain('Mr. Aziz Ahmad, Co-Founder and Chairman of CodersTrust, held a warm and insightful courtesy meeting');
    await open(page, DIGITAL_FACTORY);
    expect(compact(await page.locator('main').textContent())).toContain('As CodersTrust Co-Founder and Chairman Aziz Ahmad often says:');
  });

  test('the News index card for the UPEACE post carries the new headline and excerpt', async ({ page }) => {
    const html = visible(htmlOf('/news/'));
    expect(html).toContain('Aziz Ahmad, Co-Founder and Chairman of CodersTrust, Appointed as Global UPEACE Ambassador');
    expect(html).not.toContain('Global Chairman');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 5: the Privacy Policy names CT USA, Inc.', () => {
  test('"This website is run by CT USA, Inc. (CodersTrust)." and the rest of the sentence stays', async ({ page }) => {
    await open(page, 'privacy-policy/');
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('This website is run by CT USA, Inc. (CodersTrust). Questions about privacy go to');
    expect(text).not.toContain('This website is run by CodersTrust.');
    await expect(page.locator('main a[href^="mailto:"]').first()).toBeVisible();
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 6: Global Reach lists Somaliland as 2015–2016, 2020', () => {
  const row = (page: Page, name: string) => page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: name }) }).first();
  const cell = (page: Page, name: string, label: string) => row(page, name).locator(`td[data-label="${label}"]`);

  test('Years "2015–2016, 2020"; the note keeps the Hour of Code and Tima-ade University and adds the 2020 partnership announcement; still 16 locations', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    expect(compact(await cell(page, 'Somaliland', 'Years').textContent())).toBe('2015–2016, 2020');
    expect(compact(await cell(page, 'Somaliland', 'Partner / Note').textContent())).toBe('Hour of Code, and an ICT program at Tima-ade University (2015–2016); separately, a learning partnership announced in 2020');
    await expect(page.locator('.wmap__table tbody tr')).toHaveCount(Number(fact('SC-03').stat?.value));
    await expect(page.locator('.wmap__table tbody tr')).toHaveCount(16);
    await expect(page.locator('.wmap__pins > li')).toHaveCount(16);
  });

  test('the 2020 announcement is the September 2020 release the Uganda post links, which names Somaliland', () => {
    const post = readFileSync('src/content/news/coderstrust-announces-learning-partnerships-in-uganda.md', 'utf8');
    expect(post).toMatch(/^date: 2020-09-10$/m);
    expect(post).toContain('and in Somaliland');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 7: the Programs page YouthWIDE card is sibling length', () => {
  const CARD = 'The youth digital-employment program, designed as co-funded country cohorts. It aims to train 1 million educated youth by 2030, depending on government and donor commitments.';

  test('the card text is the short form: the program, the co-funded cohorts, and the 1 million aim by 2030 with its dependency', async ({ page }) => {
    await open(page, 'programs/');
    const card = page.locator('#programs-grid li:has(a[href$="programs/youthwide/"])');
    const text = compact(await card.locator('.card__text').textContent());
    expect(text).toBe(CARD);
    expect(words(text)).toBeLessThanOrEqual(30);
    // the full aim statement stays on the YouthWIDE page
    const full = compact(await card.textContent());
    expect(full).not.toContain('Higher Secondary');
    expect(full).not.toContain('Sub-Saharan');
  });

  test('the card text is no longer than 30 words (the siblings run 10 to 25), and the register’s IN-01 is unchanged', async ({ page }) => {
    await open(page, 'programs/');
    const lens = await page.locator('#programs-grid li .card__text').evaluateAll((ps) => ps.map((p) => (p.textContent ?? '').trim().split(/\s+/).length));
    expect(lens.length).toBe(5);
    expect(Math.max(...lens)).toBeLessThanOrEqual(30);
    expect(fact('IN-01').stat?.value).toBe('1 million');
    expect(fact('IN-01').text).toBe('YouthWIDE aims to train 1 million educated youth (Higher Secondary Certificate or above) for digital employment by 2030, in Bangladesh and similar countries in South Asia and the Middle East and North Africa, depending on government and donor commitments');
  });

  test('YouthWIDE still states the full aim once, in the "Designed for Three Regions" row', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const row = compact(await page.locator('#program-glance .pg__row').first().textContent());
    expect(row.startsWith('Designed for Three Regions')).toBe(true);
    expect(row).toContain('YouthWIDE aims to train 1 million educated youth (Higher Secondary Certificate or above) for digital employment by 2030, in Bangladesh and similar countries in South Asia and the Middle East and North Africa, depending on government and donor commitments.');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 8: four team bios carry the role in the <title>', () => {
  const TITLES: [string, string][] = [
    ['about/team/abdul-karim/', 'Abdul Karim, Advisor | CodersTrust'],
    ['about/team/faruque-hossain/', 'Faruque Hossain, Advisor | CodersTrust'],
    ['about/team/ferdinand-kjaerulff/', 'Ferdinand Kjærulff, Co-Founder | CodersTrust'],
    ['about/team/fahim-sheikh/', 'Md. Fahim Sheikh | CodersTrust'],
  ];
  for (const [route, title] of TITLES) {
    test(`${route} is titled "${title}" (60 characters or fewer), and the displayed role is unchanged`, async ({ page }) => {
      await open(page, route);
      expect(await page.title()).toBe(title);
      expect(title.length).toBeLessThanOrEqual(60);
      expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBe(title);
    });
  }

  test('the displayed roles on the four pages are unchanged', async ({ page }) => {
    const ROLES: [string, string][] = [
      ['about/team/abdul-karim/', 'Advisor; former Principal Secretary, Government of Bangladesh'],
      ['about/team/faruque-hossain/', 'Advisor; former Chairman, National Skills Development Authority'],
      ['about/team/ferdinand-kjaerulff/', 'Co-Founder · In Memoriam (2023)'],
      ['about/team/fahim-sheikh/', 'Marketing, Project and Training Operations'],
    ];
    for (const [route, role] of ROLES) {
      await open(page, route);
      expect(compact(await page.locator('.prof__role').textContent()), route).toBe(role);
    }
  });

  test('every team bio’s <title> now names a role (Name, Role | CodersTrust), all within 60 characters', async () => {
    const bios = listPages().filter((p) => /^\/about\/team\/[a-z-]+\/$/.test(p.route));
    expect(bios.length).toBeGreaterThanOrEqual(12);
    const bare = bios
      .map((p) => ({ route: p.route, title: /<title>([^<]*)<\/title>/.exec(readFileSync(p.file, 'utf8'))?.[1] ?? '' }))
      .filter((b) => b.route !== '/about/team/fahim-sheikh/' && (!/^[^,]+, .+ \| CodersTrust$/.test(b.title) || b.title.length > 60))
      .map((b) => `${b.route}: ${b.title}`);
    expect(bare).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP106 item 9: dateModified of the pages this WP changes reads 2026-10-29', () => {
  const ROUTES = [
    'about/', // WP105 had set it; the timeline band changes again today
    'about/recognition/',
    'privacy-policy/',
    'impact/global-reach/',
    'programs/',
    'about/team/abdul-karim/',
    'about/team/faruque-hossain/',
    'about/team/ferdinand-kjaerulff/',
    'about/team/fahim-sheikh/',
    CCNY,
    UPEACE,
    FOREIGN_MINISTER,
    DIGITAL_FACTORY,
  ];
  for (const route of ROUTES) {
    test(`${route} has JSON-LD dateModified 2026-10-29 (the day it changed), not the build date`, async ({ page }) => {
      await open(page, route);
      const ld = await ldJson(page);
      const day = [CCNY, DIGITAL_FACTORY, UPEACE, FOREIGN_MINISTER].includes(route) ? '2026-10-30' : '2026-10-29'; // WP126 re-dated the first two (countToday note; "exported labor"); WP127 the other two (serial-comma sweep)
      expect(ld).toMatch(new RegExp(`"dateModified"\\s*:\\s*"${day}"`));
      expect(ld).not.toMatch(new RegExp(`"dateModified"\\s*:\\s*"(?!${day})[^"]*"`));
    });
  }

  test('the Privacy Policy still prints "Last updated October 29, 2026"', async ({ page }) => {
    await open(page, 'privacy-policy/');
    expect(compact(await page.locator('.lf-updated').first().textContent())).toBe('Last updated October 29, 2026');
  });

  test('the four news posts carry `updated: 2026-10-29` in their front matter', () => {
    for (const route of [CCNY, UPEACE, FOREIGN_MINISTER, DIGITAL_FACTORY]) {
      const slug = route.replace(/^news\/|\/$/g, '');
      const day = [CCNY, DIGITAL_FACTORY, UPEACE, FOREIGN_MINISTER].includes(route) ? '2026-10-30' : '2026-10-29'; // WP126, WP127
      expect(readFileSync(`src/content/news/${slug}.md`, 'utf8'), slug).toMatch(new RegExp(`^updated: ${day}$`, 'm'));
    }
  });
});
