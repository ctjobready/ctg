import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP98 (owner decision 2026-10-26: match National University's programme name "Post Graduate Diploma (PGD)", pgd.nu.ac.bd).
 *   - 1: the programme is written "Post Graduate Diploma" wherever the site shows it (visible text, page titles, meta descriptions, structured data);
 *   - 2: URL slugs and anchors are unchanged (the nu-postgraduate-diploma paths still build and link);
 *   - 3: <title> stays within 60 characters and meta descriptions within 155;
 *   - 4: no built page shows "Postgraduate Diploma" or "postgraduate diploma" in visible text (URLs excluded).
 * The one lower-case "postgraduate diploma" left on purpose is the Stockholm University degree in the team bio (a different programme, not NU).
 * Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp98.spec.ts --project=chromium --workers=2`.
 */

const OLD_NAME = /postgraduate diploma/i;
// the one non-NU use: a degree from Stockholm University, named in the team bio; it is not the NU programme
const NON_NU_SENTENCE = 'plus a postgraduate diploma from Stockholm University.';

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
const NU_ROUTES = ['programs/nu-postgraduate-diploma/', 'programs/nu-postgraduate-diploma/cyber-security/', 'programs/nu-postgraduate-diploma/data-analytics/', 'programs/nu-postgraduate-diploma/digital-marketing/', 'programs/nu-postgraduate-diploma/ict/'];
const pageHtml = (route: string) => builtPages().find((p) => p.route === route)!.html;

test.describe('Item 1: the programme is "Post Graduate Diploma" in visible text', () => {
  test('no built page shows "Postgraduate Diploma" or "postgraduate diploma" in its visible text (URLs excluded)', () => {
    const offenders = builtPages()
      .map((p) => ({ route: p.route, text: visible(p.html).split(NON_NU_SENTENCE).join('') }))
      .filter((p) => OLD_NAME.test(p.text))
      .map((p) => p.route);
    expect(offenders).toEqual([]);
  });

  test('no built page title, meta description or JSON-LD names the old programme', () => {
    const offenders = builtPages()
      .filter((p) => {
        const title = p.html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
        const description = p.html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
        const jsonLd = [...p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(' ');
        return OLD_NAME.test(`${title} ${description} ${jsonLd}`);
      })
      .map((p) => p.route);
    expect(offenders).toEqual([]);
  });

  test('the NU overview and the four course pages say "Post Graduate Diploma" in their headings', () => {
    expect(visible(pageHtml('programs/nu-postgraduate-diploma/'))).toContain('National University Post Graduate Diploma');
    expect(visible(pageHtml('programs/nu-postgraduate-diploma/cyber-security/'))).toContain('NU Post Graduate Diploma in Cyber Security');
    expect(visible(pageHtml('programs/nu-postgraduate-diploma/data-analytics/'))).toContain('NU Post Graduate Diploma in Data Analytics');
    expect(visible(pageHtml('programs/nu-postgraduate-diploma/digital-marketing/'))).toContain('NU Post Graduate Diploma in Digital Marketing');
    expect(visible(pageHtml('programs/nu-postgraduate-diploma/ict/'))).toContain('NU Post Graduate Diploma in Information and Communication Technology (ICT)');
  });
});

test.describe('Item 2: URL slugs and anchors are unchanged', () => {
  test('every NU route still builds under its nu-postgraduate-diploma slug', () => {
    const routes = builtPages().map((p) => p.route);
    for (const route of NU_ROUTES) expect(routes, route).toContain(route);
  });

  test('the Programs hub still links the NU overview at its slug', () => {
    expect(pageHtml('programs/')).toMatch(/href="[^"]*\/programs\/nu-postgraduate-diploma\/"/);
  });
});

test.describe('Item 3: <title> and meta description stay within their guards', () => {
  // (screenshots: see the opt-in describe at the end of this file)
  test('each NU page title is at most 60 characters and each description at most 155', () => {
    for (const route of NU_ROUTES) {
      const html = pageHtml(route);
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
      const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
      expect(title.length, `${route} title`).toBeLessThanOrEqual(60);
      expect(description.length, `${route} description`).toBeLessThanOrEqual(155);
    }
  });
});

test.describe('Screenshots (opt-in)', () => {
  test('WP98_SHOTS=<dir> writes the NU overview, a course page, the Programs card and the Programs menu at 1280 and 390', async ({ browser }) => {
    const dir = process.env.WP98_SHOTS;
    test.skip(!dir, 'set WP98_SHOTS=<dir> to write screenshots');
    mkdirSync(dir!, { recursive: true });
    for (const vp of [DESKTOP, MOBILE]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      try {
        await open(page, 'programs/nu-postgraduate-diploma/');
        await page.locator('#courses').first().scrollIntoViewIfNeeded();
        await page.locator('#courses').first().screenshot({ path: join(dir!, `nu-overview-${vp.width}.png`), animations: 'disabled' });
        await open(page, 'programs/nu-postgraduate-diploma/ict/');
        await page.locator('.hero').first().screenshot({ path: join(dir!, `ict-course-${vp.width}.png`), animations: 'disabled' });
        await open(page, 'programs/');
        const card = page.locator('li', { has: page.locator('h3', { hasText: 'NU Post Graduate Diploma' }) }).first();
        await card.scrollIntoViewIfNeeded();
        await card.screenshot({ path: join(dir!, `programs-card-${vp.width}.png`), animations: 'disabled' });
        if (vp.width >= 768) {
          await page.locator('[aria-controls="mega-programs"]').first().click();
          await page.locator('#mega-programs').screenshot({ path: join(dir!, `programs-menu-${vp.width}.png`), animations: 'disabled' });
        } else {
          await page.locator('[data-drawer-open]').click();
          const accordion = page.locator('#site-drawer details.drawer__group', { has: page.locator('summary', { hasText: 'Programs' }) }).first();
          await accordion.locator('summary').click();
          await accordion.screenshot({ path: join(dir!, `programs-menu-${vp.width}.png`), animations: 'disabled' });
        }
      } finally {
        await ctx.close();
      }
    }
  });
});
