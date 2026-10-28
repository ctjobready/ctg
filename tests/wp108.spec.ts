import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DIST_DIR } from './support/env';
import { open } from './support/browser';
import { listPages, pageByRoute } from './support/pages';

/**
 * WP108 (Sonnet XHigh run 4, kit 74): Minor fixes and accepted Polish. Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp108.spec.ts --project=chromium`.
 *   - Item 1: Investors' SC-02 detail gives both courseware parts their unit (Her Power's national program; six courses on FutureNation).
 *   - Item 2: the Copenhagen and NYNJMSDC news posts have complete meta descriptions; no meta description anywhere ends in an ellipsis.
 *   - Item 3: the JobReady@Work meta description names the publisher (ManpowerGroup) and keeps the year.
 *   - Item 4: the Foundations meta description leads with the employment result (RC-02).
 *   - Item 5: the Sheikh Kamal alt text says "Center" (the American spelling the site uses).
 *   - Item 6: every page changed here carries 2026-10-29 as its date modified.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const htmlOf = (route: string) => readFileSync(pageByRoute(route).file, 'utf8');
const metaDescriptionOf = (html: string) => decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '');
const ldJson = async (page: Page) => (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
const metaContent = async (page: Page, sel: string) => (await page.locator(sel).first().getAttribute('content')) ?? '';
const post = (slug: string) => readFileSync(`src/content/news/${slug}.md`, 'utf8');

function distTextFiles(dir = DIST_DIR, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) distTextFiles(full, out);
    else if (/\.(html|xml|txt|json|webmanifest|md)$/.test(name)) out.push(full);
  }
  return out;
}
const offenders = (re: RegExp) =>
  distTextFiles()
    .filter((f) => re.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(DIST_DIR.length));

const COPENHAGEN = 'coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner';
const NYNJMSDC = 'aziz-ahmad-wins-the-nynjmsdc-partnership-award-in-the-united-states';
const KAMAL = '1000-trainees-sheikh-kamal-ict-incubator-training';

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP108 item 1: SC-02’s detail says what both courseware parts count', () => {
  const DETAIL =
    'Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: 25,125 in Her Power’s national program, which used CodersTrust’s curriculum, and 15,027 enrollments in six CodersTrust-designed courses on UNDP’s FutureNation platform. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments.';

  test('the register detail reads as above, with the arithmetic sentences unchanged', () => {
    expect(fact('SC-02').stat?.detail).toBe(DETAIL);
    expect(25125 + 15027).toBe(40152);
    expect(112926 + 40152 - 2400).toBe(150678);
  });

  test('the FutureNation part uses the register’s own description of SC-14, and the figure is SC-14’s 15,027', () => {
    expect(fact('SC-14').text).toContain('enrollments in six CodersTrust-designed courses on UNDP’s FutureNation platform');
    expect(fact('SC-14').stat?.numeric).toBe(15027);
    expect(fact('SC-02').stat?.detail).toContain('15,027 enrollments in six CodersTrust-designed courses on UNDP’s FutureNation platform');
  });

  test('Investors prints the new detail in the track-record note', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(compact(await page.locator('#guide .ig__notes').textContent())).toContain(DETAIL);
  });

  test('no built page prints the unitless “Her Power’s 25,125 and UNDP FutureNation’s 15,027”', () => {
    expect(offenders(/Her Power’s 25,125 and UNDP FutureNation’s 15,027/)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP108 item 2: complete news meta descriptions; none ends in an ellipsis', () => {
  const CASES: [string, string, string][] = [
    ['Copenhagen', COPENHAGEN, 'CodersTrust launched in Copenhagen in April 2014 at a Virgin Unite dinner, in the presence of Sir Richard Branson and early Skype investor Morten Lund.'],
    ['NYNJMSDC', NYNJMSDC, 'UTC Associates, led by Aziz Ahmad, received the Partnership Award from the New York New Jersey Minority Supplier Development Council.'],
  ];
  for (const [name, slug, excerpt] of CASES) {
    test(`${name}: the post’s excerpt, meta description and Open Graph description are the complete sentence (≤155)`, async ({ page }) => {
      expect(excerpt.length).toBeLessThanOrEqual(155);
      expect(post(slug)).toContain(`excerpt: "${excerpt}"`);
      await open(page, `news/${slug}/`);
      expect(await metaContent(page, 'meta[name="description"]')).toBe(excerpt);
      expect(await metaContent(page, 'meta[property="og:description"]')).toBe(excerpt);
    });
  }

  test('no page’s meta description ends in an ellipsis (a cut-off name) or runs past 155 characters', () => {
    const bad: string[] = [];
    for (const p of listPages()) {
      const d = metaDescriptionOf(readFileSync(p.file, 'utf8'));
      if (!d) continue;
      if (/(…|\.\.\.)\s*$/.test(d)) bad.push(`${p.route}: ends in an ellipsis: ${d.slice(-60)}`);
      if ([...d].length > 155) bad.push(`${p.route}: ${[...d].length} characters`);
    }
    expect(bad).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP108 item 3: the JobReady@Work meta description names the publisher of the 72%', () => {
  const DESCRIPTION = 'JobReady@Work builds custom AI-ready training and sources talent. In 2026, 72% of employers globally reported difficulty finding talent (ManpowerGroup).';

  test('the description, its Open Graph copy and the structured data say it, within 155 characters, with the figure read from PX-05', async ({ page }) => {
    expect([...DESCRIPTION].length).toBeLessThanOrEqual(155);
    expect(fact('PX-05').stat?.value).toBe('72%');
    expect(fact('PX-05').sourceIds).toEqual(['MANPOWER26']);
    await open(page, 'programs/jobready-work/');
    expect(await metaContent(page, 'meta[name="description"]')).toBe(DESCRIPTION);
    expect(await metaContent(page, 'meta[property="og:description"]')).toBe(DESCRIPTION);
    expect(await ldJson(page)).toContain(DESCRIPTION);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP108 item 4: the Foundations meta description leads with the employment result', () => {
  const DESCRIPTION = 'Fund paths to earnings. In a randomized trial of CodersTrust’s WSDFM program, women offered a place were 10.3 percentage points more likely to be employed.';

  test('the description, its Open Graph copy and the structured data say it, within 155 characters, with the figure read from RC-02', async ({ page }) => {
    expect([...DESCRIPTION].length).toBeLessThanOrEqual(155);
    expect(fact('RC-02').text).toContain('10.3 percentage points more likely to be employed');
    await open(page, 'partner-with-us/foundations/');
    expect(await metaContent(page, 'meta[name="description"]')).toBe(DESCRIPTION);
    expect(await metaContent(page, 'meta[property="og:description"]')).toBe(DESCRIPTION);
    expect(await ldJson(page)).toContain(DESCRIPTION);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP108 item 5: “Sheikh Kamal IT Center”, not “Centre”, in the alt text', () => {
  const ALT = 'Architect’s rendering of the Sheikh Kamal IT Center, a curved glass building with palm trees in front';

  test('the post’s cover alt text is spelled “Center”', () => {
    expect(post(KAMAL)).toContain(`coverAlt: "${ALT}"`);
  });

  test('the post page carries the alt text, and no page says “Sheikh Kamal IT Centre”', async ({ page }) => {
    await open(page, `news/${KAMAL}/`);
    expect(decode(await page.content())).toContain(ALT);
    expect(offenders(/Sheikh Kamal IT Centre/)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP108 item 6: the pages changed here carry a date modified of 2026-10-29', () => {
  for (const [name, slug] of [['Copenhagen', COPENHAGEN], ['NYNJMSDC', NYNJMSDC], ['Sheikh Kamal', KAMAL]]) {
    test(`news post ${name}: front matter \`updated: 2026-10-29\` and JSON-LD dateModified 2026-10-29`, async ({ page }) => {
      expect(post(slug)).toMatch(/^updated: 2026-10-29$/m);
      await open(page, `news/${slug}/`);
      const ld = await ldJson(page);
      expect(ld).toMatch(/"dateModified"\s*:\s*"2026-10-29"/);
      expect(ld).not.toMatch(/"dateModified"\s*:\s*"(?!2026-10-29)[^"]*"/);
    });
  }

  for (const [name, route, file] of [
    ['Investors', 'partner-with-us/investors/', 'src/pages/partner-with-us/investors/index.astro'],
    ['Foundations', 'partner-with-us/foundations/', 'src/pages/partner-with-us/foundations/index.astro'],
  ]) {
    test(`${name}: the page states its modified date in the source and in its JSON-LD`, async ({ page }) => {
      expect(readFileSync(file, 'utf8')).toMatch(/dateModified: '2026-10-29'/);
      await open(page, route);
      const ld = await ldJson(page);
      expect(ld).toMatch(/"dateModified"\s*:\s*"2026-10-29"/);
      expect(ld).not.toMatch(/"dateModified"\s*:\s*"(?!2026-10-29)[^"]*"/);
    });
  }

  test('JobReady@Work still shows “Last updated October 29, 2026”', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    await expect(page.locator('p.updated')).toHaveText(/Last updated\s+October 29, 2026/);
  });
});
