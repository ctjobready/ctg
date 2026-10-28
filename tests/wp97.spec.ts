import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP97 (owner instruction 2026-10-26: "In case of NU, retrieve their official course title from NU website and follow that phrasing only."
 * Source: National University's PGD site, http://pgd.nu.ac.bd/, read 2026-10-26; its course list reads "Cyber Security", "Data Analytics",
 * "Digital Marketing", "Information and Communication Technology (ICT)" and "ICT in Accounting and Business"):
 *   - 1: the course is "Cyber Security" (WP96's "Cybersecurity" is reverted); the URL slug stays cyber-security;
 *   - 2: course titles (H1, <title>, meta description, cards and lists on the overview, FAQ answers that name the course) use NU's names:
 *        "Information and Communication Technology (ICT)" for the ICT course. Menus keep the short "ICT" label. The <title> cannot hold the full name
 *        under its 60-character limit, so it keeps "NU Post Graduate Diploma in ICT" (the short form NU itself uses);
 *   - 3: module names and job titles keep the two-word "Cyber Security";
 *   - 4: the program's own name is unchanged ("Post Graduate Diploma", as the site has always said it; NU writes "Post Graduate Diploma (PGD)", owner decides).
 * Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp97.spec.ts --project=chromium --workers=2`.
 * Screenshots (opt-in): WP97_SHOTS=<dir> with the same command writes PNGs of the overview, the two course pages and the Programs menu at 1280 and 390.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
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
const builtPages = () => listPages().map((p) => ({ route: p.route.replace(/^\//, ''), html: readFileSync(p.file, 'utf8') }));
const pageHtml = (route: string) => builtPages().find((p) => p.route === route)!.html;
const routesWhere = (test: (text: string) => boolean) => builtPages().filter((p) => test(visible(p.html))).map((p) => p.route);
const ICT = 'programs/nu-postgraduate-diploma/ict/';
const CYBER = 'programs/nu-postgraduate-diploma/cyber-security/';
const OVERVIEW = 'programs/nu-postgraduate-diploma/';
const HUB = 'programs/';

test.describe('Item 1: the course is spelled "Cyber Security"', () => {
  test('no built NU page prints the one-word "Cybersecurity" for the course', () => {
    // generic prose elsewhere ("cybersecurity" in news and partner copy) is not the course name, so only the course-name phrases are scanned
    expect(routesWhere((t) => /Diploma in Cybersecurity|in cybersecurity,|Cybersecurity knowledge|Choose Cybersecurity/.test(t))).toEqual([]);
  });

  test('the Cyber Security page keeps its URL slug; its H1 and <title> say "NU Post Graduate Diploma in Cyber Security"', async ({ page }) => {
    await open(page, CYBER);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('NU Post Graduate Diploma in Cyber Security');
    await expect(page).toHaveTitle('NU Post Graduate Diploma in Cyber Security | CodersTrust');
  });

  test('the Cyber Security page keeps "Cyber Security" in its job titles and module names', () => {
    const text = visible(pageHtml(CYBER));
    expect(text).toContain('Junior Cyber Security Analyst');
    expect(text).toContain('Cyber Security Laws, Policies and Strategies');
    expect(text).not.toMatch(/Cybersecurity/);
  });
});

test.describe('Item 2: course titles use NU’s course names', () => {
  test('the ICT page H1 is "NU Post Graduate Diploma in Information and Communication Technology (ICT)"', async ({ page }) => {
    await open(page, ICT);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('NU Post Graduate Diploma in Information and Communication Technology (ICT)');
  });

  test('the ICT <title> is the shortest NU-faithful form that fits the 60-character limit; the description names the full course', async ({ page }) => {
    await open(page, ICT);
    const title = await page.title();
    expect(title).toBe('NU Post Graduate Diploma in ICT | CodersTrust');
    expect([...title].length).toBeLessThanOrEqual(60);
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toContain('in information and communication technology (ICT)');
    expect([...description].length).toBeLessThanOrEqual(155);
  });

  test('the Cyber Security and Digital Marketing <title> and description stay within the guards', async ({ page }) => {
    for (const route of [CYBER, 'programs/nu-postgraduate-diploma/digital-marketing/', 'programs/nu-postgraduate-diploma/data-analytics/']) {
      await open(page, route);
      const title = await page.title();
      expect([...title].length, route).toBeLessThanOrEqual(60);
      const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
      expect([...description].length, route).toBeLessThanOrEqual(155);
    }
    await open(page, CYBER);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toContain('in cyber security');
  });

  test('the overview cards carry the four course names, in order, with the full ICT name', async ({ page }) => {
    await open(page, OVERVIEW);
    expect(compact(await page.locator('#courses .lead').textContent())).toBe(
      'Four courses, in digital marketing, information and communication technology (ICT), cyber security and data analytics, delivered by CodersTrust, an affiliated college (College Code: 6634) under the National University of Bangladesh.',
    );
    const titles = (await page.locator('#courses article .course__title').allTextContents()).map(compact);
    expect(titles).toEqual([
      'NU Post Graduate Diploma in Digital Marketing',
      'NU Post Graduate Diploma in Information and Communication Technology (ICT)',
      'NU Post Graduate Diploma in Cyber Security',
      'NU Post Graduate Diploma in Data Analytics',
    ]);
  });

  test('the Programs hub card names the four courses in the same words', async ({ page }) => {
    await open(page, HUB);
    const card = page.locator('#programs-grid li:has(a[href$="programs/nu-postgraduate-diploma/"])');
    expect(compact(await card.textContent())).toContain(
      'in digital marketing, information and communication technology (ICT), cyber security and data analytics.',
    );
  });

  test('the Programs menu shows "ICT" (the short label kept) and "Cyber Security"', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HUB);
    const kids = '#mega-programs li:has(> a.mega__link[href$="programs/nu-postgraduate-diploma/"]) > ul > li > a .mega__title';
    expect(compact((await page.locator(kids).allTextContents()).join('|'))).toBe('Digital Marketing|ICT|Cyber Security|Data Analytics');
  });

  test('the "Is This the Right Course for Me?" answers name the course in its NU words', async ({ page }) => {
    await open(page, ICT);
    const ictAnswer = await page.locator('details', { hasText: 'Is This the Right Course for Me?' }).first().textContent();
    expect(compact(ictAnswer)).toContain('Choose Information and Communication Technology (ICT) if you want to study programming, databases, networks and mobile or web development.');
    await open(page, CYBER);
    const cyberAnswer = await page.locator('details', { hasText: 'Is This the Right Course for Me?' }).first().textContent();
    expect(compact(cyberAnswer)).toContain('Choose Cyber Security if you want to study');
  });

  test('"Also Consider" names the ICT course by its full NU name', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/digital-marketing/');
    const others = (await page.locator('#also-consider .others li').allTextContents()).map(compact);
    expect(others).toContain('Prefer programming, databases and networks? The NU Post Graduate Diploma in Information and Communication Technology (ICT) is the course for those modules.');
    expect(others).toContain('Prefer cryptography, network security and digital forensics? The NU Post Graduate Diploma in Cyber Security is the course for those modules.');
  });
});

test.describe('Item 4: the program name is unchanged', () => {
  test('the overview still names the program "National University Post Graduate Diploma" and "NU Post Graduate Diploma"', () => {
    const text = visible(pageHtml(OVERVIEW));
    expect(text).toContain('National University Post Graduate Diploma');
    expect(text).toContain('NU Post Graduate Diploma');
  });
});

test('WP97 opt-in screenshots of the changed regions at 1280 and 390', async ({ browser }) => {
  const dir = process.env.WP97_SHOTS;
  test.skip(!dir, 'set WP97_SHOTS=<dir> to write screenshots');
  mkdirSync(dir!, { recursive: true });
  const shots: [string, string, string][] = [
    [OVERVIEW, '#courses', 'nu-overview'],
    [ICT, '.hero', 'ict-course'],
    [CYBER, '.hero', 'cyber-security-course'],
  ];
  for (const vp of [DESKTOP, MOBILE]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    try {
      for (const [route, sel, name] of shots) {
        await open(page, route);
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        await page.locator(sel).first().screenshot({ path: join(dir!, `${name}-${vp.width}.png`), animations: 'disabled' });
      }
      // the Programs menu: the desktop mega panel, and on mobile the drawer's Programs accordion
      await open(page, HUB);
      if (vp.width >= 768) {
        await page.locator('[aria-controls="mega-programs"]').first().click();
        await page.locator('#mega-programs').screenshot({ path: join(dir!, `programs-menu-${vp.width}.png`), animations: 'disabled' });
      } else {
        await page.locator('[data-drawer-open]').click();
        await page.locator('#site-drawer details.drawer__group', { has: page.locator('summary', { hasText: 'Programs' }) }).first().screenshot({ path: join(dir!, `programs-menu-${vp.width}.png`), animations: 'disabled' });
      }
    } finally {
      await ctx.close();
    }
  }
});
