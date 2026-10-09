import { spawnSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';
import { pageByRoute } from './support/pages';

/**
 * Print stylesheet (review round 15, enhancement 2; src/styles/print.css). The two evidence pages print as clean evidence briefs and every
 * other page prints sensibly:
 *   - the chrome is gone (header, announcement bar, mega-menus, breadcrumbs, table of contents, footer, back-to-top, the sticky CTA bar,
 *     CTA bands, decorative art) and the content stays (H1, the BLUF, charts with their data tables, the footnotes and the sources);
 *   - black type on white, nothing left waiting for a scroll (reveals and chart growth are printed in their final state);
 *   - the page's canonical URL in a footer line.
 * The DOM checks run under print media emulation. The PDF (page.pdf, written under the test's output folder, never into the repository) must
 * exist, and where `pdftotext` is installed its text must carry the H1 and the first footnote.
 */
const CANONICAL_ORIGIN = 'https://coderstrust.global';
const EVIDENCE = [
  { route: '/impact/independent-evaluation/', h1: 'A randomized trial of CodersTrust’s training for women in Dhaka' },
  { route: '/impact/outcomes-2026/', h1: 'Impact Survey 2026: what happened after training' },
];

/** The chrome and the calls to action that never print. */
const NOT_PRINTED = ['.skip-link', '.promo-bar', '.site-header', '[data-mega]', '[data-drawer]', '.crumbs', '.lf-toc', '#site-footer', '.btt', '.toast-region', '.sticky-cta', '.cta-band', '.next', '.btn', '[data-art]'];

async function printMedia(page: Page): Promise<void> {
  await page.emulateMedia({ media: 'print' });
}

/** Elements of `selectors` that take up space in the print layout. */
async function shown(page: Page, selectors: string[]): Promise<string[]> {
  return page.evaluate(
    (list) => list.filter((s) => Array.from(document.querySelectorAll(s)).some((el) => getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0)),
    selectors,
  );
}

const hasPdftotext = (): boolean => spawnSync('pdftotext', ['-v'], { stdio: 'ignore' }).status !== null;

test.use({ viewport: DESKTOP });

for (const { route, h1 } of EVIDENCE) {
  test(`${route} prints as an evidence brief`, async ({ page }, testInfo) => {
    await open(page, pageByRoute(route));
    await printMedia(page);

    expect(await shown(page, NOT_PRINTED), 'chrome or calls to action that would print').toEqual([]);

    // the brief: H1, the first section's callout (the BLUF or the summary), a chart's data table, the first footnote and the sources
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText(h1);
    await expect(page.locator('.callout').first()).toBeVisible();
    await expect(page.locator('main sup.fn').first()).toBeVisible();
    await expect(page.locator('#sources .sources__note').first()).toBeVisible();
    await expect(page.locator('#sources h2')).toBeVisible();
    const tables = page.locator('details[class$="__data"] table');
    if (route.includes('outcomes')) {
      expect(await tables.count(), 'chart data tables on the Outcomes page').toBeGreaterThan(5);
      await expect(tables.first(), 'a chart data table (inside a closed <details> on screen) prints open').toBeVisible();
    }
    // the FAQ answers, closed on screen, print open (independent evaluation)
    if (route.includes('independent-evaluation')) await expect(page.locator('main details.acc:not([open]) .acc__body').first()).toBeVisible();

    // black on white, in their final state
    const paper = await page.evaluate(() => {
      const rgb = (el: Element, prop: 'color' | 'backgroundColor') => getComputedStyle(el)[prop];
      const body = Array.from(document.querySelectorAll('main p, main li')).filter((el) => el.getClientRects().length > 0 && !el.closest('svg'));
      return {
        pageBackground: rgb(document.body, 'backgroundColor'),
        headingColor: rgb(document.querySelector('h1')!, 'color'),
        offBlackText: body.filter((el) => rgb(el, 'color') !== 'rgb(0, 0, 0)').length,
        bodyText: body.length,
        waiting: Array.from(document.querySelectorAll('[data-reveal]')).filter((el) => getComputedStyle(el).opacity !== '1').length,
        horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(paper.pageBackground, 'page background').toBe('rgb(255, 255, 255)');
    expect(paper.headingColor, 'H1 color').toBe('rgb(0, 0, 0)');
    expect(paper.bodyText, 'paragraphs and list items counted').toBeGreaterThan(10);
    expect(paper.offBlackText, 'paragraphs and list items that are not black').toBe(0);
    expect(paper.waiting, 'reveal elements still waiting for a scroll (opacity below 1)').toBe(0);
    expect(paper.horizontalOverflow, 'horizontal overflow in print layout').toBeLessThanOrEqual(0);

    // the canonical URL in a footer line
    const line = page.locator('[data-print-url]');
    await expect(line).toBeVisible();
    await expect(line).toContainText(`${CANONICAL_ORIGIN}${route}`);

    // the PDF
    const pdf = await page.pdf({ format: 'A4' });
    const file = testInfo.outputPath(`${route.replace(/^\/|\/$/g, '').replace(/\//g, '-')}.pdf`);
    writeFileSync(file, pdf);
    expect(statSync(file).size, 'PDF size in bytes').toBeGreaterThan(20_000);
    expect(readFileSync(file).subarray(0, 5).toString(), 'PDF header').toBe('%PDF-');
    if (hasPdftotext()) {
      const text = spawnSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }).stdout.replace(/\s+/g, ' ');
      expect(text, 'PDF text carries the H1').toContain(h1);
      const firstNote = await page.locator('#sources .sources__note .sources__claim').first().innerText();
      expect(text, 'PDF text carries the first footnote').toContain(firstNote.replace(/\s+/g, ' ').trim().slice(0, 40));
      expect(text, 'PDF text carries the canonical URL').toContain(`${CANONICAL_ORIGIN}${route}`);
    }
  });
}

test('the Home page prints without its chrome or calls to action, at phone width too', async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await open(page, pageByRoute('/'));
  await printMedia(page);
  expect(await shown(page, NOT_PRINTED), 'chrome or calls to action that would print').toEqual([]);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('[data-print-url]')).toContainText(`${CANONICAL_ORIGIN}/`);
});
