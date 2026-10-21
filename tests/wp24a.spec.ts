import { expect, test } from '@playwright/test';

/**
 * WP24a: chrome and information architecture, the Investors URL move, the Partner pages' responsive tables.
 * Each test states one behavior. Structure is read from the DOM (nested lists, hrefs, link text), not from pixels.
 */

const NU = 'programs/nu-postgraduate-diploma/';
const PARTNER_ORDER = [
  'partner-with-us/',
  'partner-with-us/development-partners/',
  'partner-with-us/governments/',
  'partner-with-us/foundations/',
  'partner-with-us/universities/',
  'partner-with-us/employers/',
  'partner-with-us/local-partners/',
  'partner-with-us/investors/',
];

/** Trimmed text of every match, read from the DOM (the mega panels are hidden until opened, so innerText would be empty). */
async function texts(page: import('@playwright/test').Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
}

/** The path of every href in a scope, relative to the deployment base, without the leading base segment. */
async function hrefs(page: import('@playwright/test').Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
}
const rel = (h: string) => h.replace(/^\/[^/]+\//, '').replace(/^https?:\/\/[^/]+\//, '');

test.describe('Investors URL', () => {
  test('/investors/ is a redirect stub to /partner-with-us/investors/', async ({ page }) => {
    const res = await page.request.get('investors/');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html, 'a redirect stub, not a page').toContain('data-redirect-stub');
    expect(html).toMatch(/http-equiv="refresh" content="0;url=[^"]*\/partner-with-us\/investors\/"/);
  });

  test('the Investors page lives at /partner-with-us/investors/ and its breadcrumb names Partner with Us', async ({ page }) => {
    const res = await page.goto('partner-with-us/investors/');
    expect(res?.status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
    const crumbs = await page.locator('.crumbs').innerText();
    expect(crumbs).toContain('Partner with Us');
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/partner-with-us\/investors\/$/);
  });

  test('no page links to the old /investors/ path', async ({ page }) => {
    for (const route of ['', 'partner-with-us/', 'impact/']) {
      await page.goto(route);
      const old = (await hrefs(page, 'a[href]')).filter((h) => /\/investors\/?$/.test(h) && !/partner-with-us\/investors/.test(h));
      expect(old, `${route || 'home'} links to the old Investors URL`).toEqual([]);
    }
  });
});

test.describe('menus', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('Programs mega menu nests the NU diploma tracks in a child list, labelled "Digital Marketing" and "ICT"', async ({ page }) => {
    await page.goto('');
    const parent = page.locator('#mega-programs li:has(> a.mega__link[href$="' + NU + '"])');
    await expect(parent).toHaveCount(1);
    await expect(parent.locator('> ul > li > a.mega__link')).toHaveCount(2);
    expect(await texts(page, '#mega-programs li:has(> a.mega__link[href$="' + NU + '"]) > ul > li > a .mega__title')).toEqual(['Digital Marketing', 'ICT']);
    // the tracks are not repeated as top-level items
    await expect(page.locator('#mega-programs > .mega__inner > .mega__links > li > a.mega__link[href*="' + NU + 'ict"]')).toHaveCount(0);
  });

  test('Programs menu groups are "Partner Programs" and "For Individual Learners"; Courses comes last', async ({ page }) => {
    await page.goto('');
    const groups = await texts(page, '#mega-programs .mega__group-title');
    expect(groups).toEqual(['Partner Programs', 'For Individual Learners']);
    const all = await hrefs(page, '#mega-programs a.mega__link');
    expect(all[all.length - 1]).toMatch(/jobready\.global/);
  });

  test('mobile drawer nests the NU tracks the same way', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto('');
    const parent = page.locator('.drawer .acc__body li:has(> a[href$="' + NU + '"])');
    await expect(parent).toHaveCount(1);
    const kids = await parent.locator('> ul > li > a').allTextContents();
    expect(kids.map((k) => k.trim())).toEqual(['Digital Marketing', 'ICT']);
  });

  // Owner, 2026-10-21: Digital Marketing and ICT are courses, not programs, so the footer's Programs column no longer lists them
  // (the header menu still nests them under the diploma); and no footer sub-list draws a vertical rule.
  test('footer Programs column lists programs only (no NU course tracks), ends with an external "Courses" link, and draws no rule beside nested links', async ({ page }) => {
    await page.goto('');
    const col = page.locator('footer nav.footer__col', { has: page.locator('h2 a', { hasText: 'Programs' }) });
    await expect(col.locator('li:has(> a[href$="' + NU + '"]) > ul')).toHaveCount(0);
    await expect(col.getByRole('link', { name: 'Digital Marketing' })).toHaveCount(0);
    await expect(col.getByRole('link', { name: 'ICT', exact: true })).toHaveCount(0);
    const borders = await page.locator('footer .footer__sub').evaluateAll((els) => els.map((e) => getComputedStyle(e).borderLeftWidth));
    expect(borders.length).toBeGreaterThan(0);
    for (const w of borders) expect(w).toBe('0px');
    const top = col.locator('> ul > li > a');
    const last = top.last();
    await expect(last).toContainText('Courses');
    expect(await last.getAttribute('href')).toMatch(/^https:\/\/jobready\.global/);
    await expect(last.locator('svg')).toHaveCount(1);
  });

  test('footer Partner column opens with "Partnership Overview"', async ({ page }) => {
    await page.goto('');
    const col = page.locator('footer nav.footer__col', { has: page.locator('h2 a', { hasText: 'Partner with Us' }) });
    const first = col.locator('> ul > li > a').first();
    await expect(first).toHaveText(/Partnership Overview/);
    expect(rel((await first.getAttribute('href')) ?? '')).toBe('partner-with-us/');
  });

  test('Partner menu order, labels use "and", Investors last at its new URL', async ({ page }) => {
    await page.goto('');
    expect((await hrefs(page, '#mega-partner a.mega__link')).map(rel)).toEqual(PARTNER_ORDER);
    const titles = await texts(page, '#mega-partner .mega__title');
    expect(titles).toContain('Development Partners and NGOs');
    expect(titles).toContain('Foundations and CSR');
    expect(titles.join(' ')).not.toContain('&');
  });

  test('About menu says "Leadership and Team", "Instructors and Mentors", "Recognition and Media"', async ({ page }) => {
    await page.goto('');
    const titles = await texts(page, '#mega-about .mega__title');
    expect(titles).toEqual(expect.arrayContaining(['Leadership and Team', 'Instructors and Mentors', 'Recognition and Media']));
    expect(titles.join(' ')).not.toContain('&');
  });

  test('Impact menu: "In the Field" with a nested "News Photographs" child', async ({ page }) => {
    await page.goto('');
    const parent = page.locator('#mega-impact li:has(> a.mega__link[href$="impact/in-the-field/"])');
    expect(await texts(page, '#mega-impact li:has(> a.mega__link[href$="impact/in-the-field/"]) > a .mega__title')).toEqual(['In the Field']);
    expect(await texts(page, '#mega-impact li:has(> a.mega__link[href$="impact/in-the-field/"]) > ul > li > a .mega__title')).toEqual(['News Photographs']);
    await expect(parent).toHaveCount(1);
  });
});

test.describe('announcement bar', () => {
  test('two text links: Trial Results and Impact Survey 2026, no button', async ({ page }) => {
    await page.goto('');
    const bar = page.locator('[data-promo]');
    const links = bar.locator('a');
    expect((await links.allInnerTexts()).map((t) => t.trim())).toEqual(['Trial Results', 'Impact Survey 2026']);
    expect((await hrefs(page, '[data-promo] a')).map(rel)).toEqual(['impact/independent-evaluation/', 'impact/outcomes-2026/']);
    await expect(bar.locator('.btn')).toHaveCount(0);
  });
});
