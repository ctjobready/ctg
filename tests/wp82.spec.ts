import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact, sources } from '../src/data/facts';
import { CONTRACT_TOTAL_NOTE, TRIAL_OFFERED, TRIAL_WOMEN, WSDFM_ENROLLED, WSDFM_NOT_TRIAL_NOTE } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP82 behaviors (owner items, 2026-10-23). Retrospective coverage (the owner exempted this project from test-first work). Run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp82.spec.ts --project=chromium`:
 *   - 1: the Kosovo case study attributes "78 program completers earned a combined total of about $25,000 online" to the World Bank (not a program record), and links the World Bank's Kosovo Brief (WBKOSOVO) beside the release link; PR-02 cites WBKOSOVO;
 *   - 2: the WSDFM case-study hero note and the Impact tile note read "Program records, not trial results; the 425 women offered a place in the randomized trial were among these 1,000." (425 read from RC-07); no page calls the trial separate from the records; PR-01 and Foundations drop "separately evaluated";
 *   - 3: the Impact contract-scope tile (GV-12) carries CONTRACT_TOTAL_NOTE (Her Power's national program, 25,125 women trained; CodersTrust trained 2,500 directly);
 *   - 4: the Accessibility page no longer lists the pre-launch screen-reader pass.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const KOSOVO = 'impact/case-studies/kosovo-women-in-online-work/';
const WSDFM = 'impact/case-studies/wsdfm-women-freelancers/';
const NOTE_NOW = 'Program records, not trial results; the 425 women offered a place in the randomized trial were among these 1,000.';

const builtHtml = (route: string) => {
  const p = listPages().find((x) => x.route === route);
  if (!p) throw new Error(`no built page for ${route}`);
  return readFileSync(p.file, 'utf8');
};

test.describe('WP82: Kosovo earnings are the World Bank’s figure', () => {
  test('the results list shows only "In Work"; the World Bank line and the Kosovo Brief link sit below the records', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, KOSOVO);
    const dts = await page.locator('.kw__results dt').allTextContents();
    expect(dts.map(compact)).toEqual(['In Work']);
    expect(await page.locator('.kw__results').getAttribute('data-fact')).toBe('PR-02');
    const results = compact(await page.locator('#results').textContent());
    expect(results).toContain('World Bank: 78 program completers earned a combined total of about $25,000 online.');
    expect(results.indexOf('102 of the 150')).toBeLessThan(results.indexOf('World Bank: 78'));
    const brief = page.locator('a', { hasText: 'Read the World Bank’s Kosovo Brief' });
    await expect(brief).toHaveCount(1);
    await expect(brief).toHaveAttribute('href', sources.WBKOSOVO.url ?? '');
    await expect(page.locator('a', { hasText: 'Read the February 2017 Release' })).toHaveCount(1);
  });

  test('PR-02 cites WBKOSOVO among its sources', () => {
    expect(fact('PR-02').sourceIds).toContain('WBKOSOVO');
    expect(sources.WBKOSOVO.url).toBe('https://www.worldbank.org/en/country/kosovo/brief/kosovo-wow');
  });

  test('the Kosovo case study has no horizontal overflow at 390 px', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, KOSOVO);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

test.describe('WP82: WSDFM trial wording uses the 425 offered a place', () => {
  test('the constants read 425 from RC-07, and the note keeps the 425 inside the 1,000', () => {
    expect(TRIAL_OFFERED).toBe(/(\d[\d,]*) treatment/.exec(fact('RC-07').text)?.[1]);
    expect(TRIAL_OFFERED).toBe('425');
    expect(TRIAL_WOMEN).toBe('833');
    expect(WSDFM_ENROLLED).toBe('1,000');
    expect(WSDFM_NOT_TRIAL_NOTE).toBe(NOTE_NOW);
  });

  test('the WSDFM case-study hero note and the Impact tile note read the new wording', async ({ page }) => {
    await open(page, WSDFM);
    await expect(page.locator('[data-hero-note]')).toHaveText(NOTE_NOW);
    await open(page, 'impact/');
    await expect(page.locator('.glance__note', { hasText: 'Program records, not trial results' })).toHaveText(NOTE_NOW);
  });

  test('PR-01 and Foundations no longer say the trial was "separately" evaluated', async ({ page }) => {
    expect(fact('PR-01').text).not.toMatch(/separately/);
    expect(fact('PR-01').text).toContain('BIGD evaluated the predecessor WSDFM program in a randomized trial');
    await open(page, 'partner-with-us/foundations/');
    const guide = compact(await page.locator('#guide').textContent());
    expect(guide).not.toMatch(/separately evaluated/);
    expect(guide).toContain('evaluated the predecessor WSDFM program, commissioned by Porticus, in a randomized trial.');
  });

  test('no built page says the WSDFM records are separate from the trial', () => {
    const offenders = listPages()
      .filter((p) => !p.route.startsWith('/news/'))
      .filter((p) => /separately evaluated the predecessor/i.test(readFileSync(p.file, 'utf8')))
      .map((p) => p.route);
    expect(offenders).toEqual([]);
  });
});

test.describe('WP82: the Impact contract-scope tile carries the shared note', () => {
  test('the GV-12 tile on Impact shows CONTRACT_TOTAL_NOTE', async ({ page }) => {
    await open(page, 'impact/');
    const tile = page.locator('#glance a[data-fact~="GV-12"]');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.glance__note')).toHaveText(CONTRACT_TOTAL_NOTE.text);
    expect(CONTRACT_TOTAL_NOTE.text).toContain('includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly)');
  });
});

test.describe('WP82: the Accessibility page drops the pre-launch item', () => {
  test('no "Before launch" item, and the list keeps its other items', () => {
    const html = builtHtml('/accessibility/');
    expect(html).not.toMatch(/Before launch/);
    expect(html).not.toMatch(/manual screen-reader pass/i);
    expect(html).toMatch(/<strong[^>]*>Testing\.<\/strong>/);
  });
});
