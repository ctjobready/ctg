import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages, pageByRoute, pagesWithMarkup } from './support/pages';

/**
 * WP88 behaviors (CLR review, Opus XHigh run 2, Minor and Polish items 1 to 16). Retrospective coverage: the owner exempted this project from test-first work, so these tests were
 * written after the change. Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp88.spec.ts --project=chromium`:
 *   - 1, 10: the Her Power overlap is stated (the 2,400 are among the 25,125) on Impact and the case study; the case-study heading is "National Scale: The Wider Program";
 *     "trained 2,400 women directly" (Her Power) and "2,400 trained directly" (the Impact card) replace "a cohort";
 *   - 2: the Investors enrollment note ends with the de-duplicated total, 150,678 (112,926 + 40,152 - 2,400);
 *   - 3: the BCIU and HolonIQ 2023 posts say "worked in 16 countries and territories", not "trained … across 15 countries";
 *   - 4: the Career Carnival body says "its Dhaka office in Banani";
 *   - 5, 6: the 30,000+ contract-scope wording is "six government contracts" in sentence case on Impact and Governments;
 *   - 7: the UNDP YES heading says "Paid Work"; 8: the WSDFM meta description states the difference against the control group;
 *   - 9: About's enrollments tile reads "enrollments"; 11: the Somaliland caption reads "2015"; 12: alt text uses numerals (30, 13);
 *   - 13: the Treasure Hunt caption names the EMK Center, and the News Photographs meta promises an event only where the post names one;
 *   - 14: the Uganda post names Somaliland among the partnerships; 15: the Kosovo caption says "program completer".
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const htmlOf = (route: string): string => readFileSync(pageByRoute(route).file, 'utf8');
const visibleText = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
const metaDescription = (html: string): string => /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const BCIU = '/news/coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c/';
const HOLONIQ23 = '/news/coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia/';
const CARNIVAL = '/news/coderstrust-organizes-career-carnival-for-students-and-affiliates/';
const UGANDA = '/news/coderstrust-announces-learning-partnerships-in-uganda/';
const UNDP_YES = '/impact/case-studies/undp-yes-korail/';
const WSDFM = '/impact/case-studies/wsdfm-women-freelancers/';
const HER_POWER = '/impact/case-studies/her-power/';
const NEWS_PHOTOS = '/impact/in-the-field/news-photos/';

test.describe('Items 1 and 10: the Her Power overlap and the cohort wording', () => {
  test('Impact\'s Her Power tile says the 2,400 are among the 25,125, and no longer says the reach is "counted separately"', async ({ page }) => {
    await open(page, 'impact/');
    const body = compact(await page.locator('body').textContent());
    expect(body).toContain('The 2,400 are among the 25,125 women the national program trained.');
    expect(body).not.toContain('counted separately');
  });

  test('the Her Power case study heading is "National Scale: The Wider Program" and says the 2,400 are among the 25,125', async ({ page }) => {
    await open(page, 'impact/case-studies/her-power/');
    await expect(page.getByRole('heading', { level: 3, name: 'National Scale: The Wider Program' })).toBeVisible();
    const body = compact(await page.locator('body').textContent());
    expect(body).toContain('meeting its target. The 2,400 women CodersTrust trained directly are among them.');
    expect(body).not.toContain('A Different Measure');
  });

  test('the Her Power context says CodersTrust "trained 2,400 women directly", not "a cohort"', () => {
    const html = visibleText(htmlOf(HER_POWER));
    expect(html).toContain('trained 2,400 women directly.');
    expect(html).not.toContain('a cohort of women directly');
  });

  test('the Impact case card says "2,400 trained directly", not "a cohort trained directly"', () => {
    const withCard = pagesWithMarkup(/2,400 trained directly/).map((p) => p.route);
    expect(withCard.length).toBeGreaterThan(0);
    expect(pagesWithMarkup(/a cohort trained directly/)).toEqual([]);
  });

  test('the Impact tile and Her Power page have no horizontal overflow at 390 px', async ({ page }) => {
    await page.setViewportSize({ width: MOBILE.width, height: MOBILE.height });
    await open(page, 'impact/case-studies/her-power/');
    expect(await noOverflow(page)).toBe(true);
    await page.setViewportSize({ width: DESKTOP.width, height: DESKTOP.height });
  });
});

test.describe('Item 2: the Investors enrollment note states the de-duplicated total', () => {
  test('SC-02 detail ends with "Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125, so counted once the total is 150,678." and the arithmetic closes', () => {
    expect(112926 + 40152 - 2400).toBe(150678);
    expect(fact('SC-02').stat?.detail).toContain('Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125');
    expect(fact('SC-02').stat?.detail).toContain('so counted once the total is 150,678.');
  });

  test('the rendered Investors note carries the total after the split', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const note = compact(await page.locator('#guide .ig__notes').textContent());
    expect(note).toContain('Of 150,000+ enrollments, 112,926 were direct. The other 40,152 came through CodersTrust curriculum and courseware');
    expect(note).toContain('UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125, so counted once the total is 150,678. Most delivery has been in Bangladesh.');
  });
});

test.describe('Items 3 and 4: archive posts', () => {
  test('BCIU and HolonIQ 2023 say "worked in 16 countries and territories", not "trained … across 15"', () => {
    const bciu = visibleText(htmlOf(BCIU));
    expect(bciu).toContain('has trained learners since 2014 and has worked in 16 countries and territories');
    expect(bciu).not.toContain('trained learners across 15 countries');
    const holoniq = visibleText(htmlOf(HOLONIQ23));
    expect(holoniq).toContain('has worked in 16 countries and territories');
    expect(holoniq).not.toContain('across 15+ countries');
  });

  test('the Career Carnival body says "its Dhaka office in Banani" and not "head office"', () => {
    const body = visibleText(htmlOf(CARNIVAL));
    expect(body).toContain('at its Dhaka office in Banani.');
    expect(body).not.toContain('head office');
  });
});

test.describe('Items 5 and 6: the 30,000+ contract-scope wording', () => {
  test('Impact\'s 30,000+ tile reads "six government contracts" and not "programs"', async ({ page }) => {
    await open(page, 'impact/');
    const body = compact(await page.locator('body').textContent());
    expect(body).toContain('people in the contracted scopes of six government contracts');
    expect(body).not.toContain('six government programs');
  });

  test('the Governments 30,000+ tile caption is in sentence case', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#glance li', { hasText: '30,000+' }).locator('.pg__desc')).toHaveText('people in the scopes of six government contracts');
  });
});

test.describe('Items 7, 8 and 9: case-study heading, meta description and About tile', () => {
  test('the UNDP YES heading says "Korail Youth into Paid Work, 2017"', async ({ page }) => {
    await open(page, 'impact/case-studies/undp-yes-korail/');
    await expect(page.locator('h1')).toHaveText('UNDP YES: Korail Youth into Paid Work, 2017');
  });

  test('the WSDFM meta description says women offered a place had an estimated 41% higher income than the control group', () => {
    const meta = metaDescription(htmlOf(WSDFM));
    expect(meta).toBe('WSDFM (Porticus): a randomized trial of the predecessor found women offered a place had an estimated 41% higher monthly income than the control group.');
    expect(meta.length).toBeLessThanOrEqual(155);
    expect(meta).not.toContain('income rose');
  });

  test('About\'s enrollments tile reads "150,000+ enrollments", without "course"', () => {
    const about = htmlOf('/about/');
    expect(visibleText(about)).toContain('150,000+ enrollments');
    expect(about).not.toContain('course enrollments');
  });
});

test.describe('Items 11, 12 and 15: photo captions and alt text', () => {
  test('the Somaliland caption reads "Somaliland, 2015" on every page that shows it', () => {
    const withCaption = pagesWithMarkup(/Hour of Code, and an ICT program at Tima-ade University, Somaliland, 2015/).map((p) => p.route);
    expect(withCaption.length).toBeGreaterThan(0);
    expect(pagesWithMarkup(/Somaliland, December 2015/)).toEqual([]);
  });

  test('alt text uses numerals for 10 and above: "About 30 men and women", "13 people"', () => {
    expect(pagesWithMarkup(/About 30 men and women/).length).toBeGreaterThan(0);
    expect(pagesWithMarkup(/13 people, most of them young women/).length).toBeGreaterThan(0);
    expect(pagesWithMarkup(/About thirty men and women|Thirteen people, most/)).toEqual([]);
  });

  test('the Kosovo portrait caption in the photo source says "program completer" (no page prints this caption)', () => {
    const photosSource = readFileSync(new URL('../src/data/photos.ts', import.meta.url), 'utf8');
    expect(photosSource).toContain("'impact/kosovo-graduate-portrait': 'Erlisa Zherka, Women in Online Work program completer, Kosovo',");
    expect(photosSource).not.toContain('Women in Online Work graduate, Kosovo');
    expect(pagesWithMarkup(/Women in Online Work graduate, Kosovo/)).toEqual([]);
  });
});

test.describe('Item 13: News Photographs captions and meta', () => {
  test('the Treasure Hunt caption names the EMK Center and the meta promises an event only where the post names one', async ({ page }) => {
    await open(page, 'impact/in-the-field/news-photos/');
    const captions = (await page.locator('figcaption').allTextContents()).map(compact);
    expect(captions).toContain('Audience at the Great American Treasure Hunt finale, EMK Center');
    const meta = metaDescription(htmlOf(NEWS_PHOTOS));
    expect(meta).toContain('with the event named where the post gives one.');
    expect(meta).not.toContain('with the event named in each caption');
  });
});

test.describe('Item 14: the Uganda post names Somaliland', () => {
  test('the partnerships sentence lists Somaliland after Egypt', () => {
    const body = visibleText(htmlOf(UGANDA));
    expect(body).toContain('It also announced partnerships in Benin, with SOS Children’s Villages, in Egypt, with CrossWorkers, and in Somaliland.');
  });
});

test('every built page is free of the old WP88 wording', () => {
  const old = [
    /National Scale: A Different Measure/,
    /counted separately/,
    /six government programs/,
    /Freelance Work, 2017/,
    /across 15 countries and territories/,
    /head office in Banani/,
    /Audience at the Great American Treasure Hunt finale</,
  ];
  for (const p of listPages()) {
    const html = readFileSync(p.file, 'utf8');
    for (const needle of old) expect(needle.test(html), `${p.route} still has ${needle}`).toBe(false);
  }
});
