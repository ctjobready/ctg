import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { VIEWPORTS, attachJson, open, quiet, scrollThrough, vpLabel, watchPage, type PageIssues } from './support/browser';
import { listPages } from './support/pages';
import { templatePages } from './support/templates';

/**
 * Console hygiene (planning doc 10 §1): on every page, 0 console errors, 0 uncaught exceptions / unhandled rejections
 * (pageerror) and 0 failed same-origin requests (network failure or HTTP 4xx/5xx). Each page is scrolled top to bottom
 * first so lazy images and the IntersectionObserver-driven scripts run. A second group exercises the interactive
 * scripts (menus, drawer, accordions, carousels, marquee pause, copy button) on one page per template and checks the
 * console again. console.warning messages are recorded in notes.json but never fail.
 */

async function expectClean(issues: PageIssues, testInfo: TestInfo, route: string, context: string): Promise<void> {
  if (issues.warnings.length) await attachJson(testInfo, 'console-warnings', { route, context, warnings: issues.warnings });
  expect.soft(issues.console, `console errors ${context}`).toEqual([]);
  expect.soft(issues.pageErrors, `uncaught exceptions / unhandled rejections ${context}`).toEqual([]);
  expect.soft(issues.failedRequests, `failed same-origin requests ${context}`).toEqual([]);
  expect.soft(issues.badResponses, `same-origin 4xx/5xx responses ${context}`).toEqual([]);
}

for (const vp of VIEWPORTS) {
  test.describe(`console hygiene ${vpLabel(vp)}`, () => {
    test.use({ viewport: vp });
    for (const p of listPages()) {
      test(p.route, async ({ page }, testInfo) => {
        const issues = watchPage(page);
        await open(page, p);
        await scrollThrough(page);
        await quiet(page);
        await expectClean(issues, testInfo, p.route, `on ${p.route} at ${vpLabel(vp)}`);
      });
    }
  });
}

/** Drive the interactive scripts the way a visitor would; any of them throwing shows up as a console or page error. */
async function exercise(page: Page): Promise<void> {
  const desktop = (page.viewportSize()?.width ?? 0) >= 1024;
  if (desktop) {
    const triggers = page.locator('[data-mega-trigger]');
    for (let i = 0; i < (await triggers.count()); i++) {
      await triggers.nth(i).click();
      await page.keyboard.press('Escape');
    }
  } else {
    await page.locator('[data-drawer-open]').click();
    const groups = page.locator('#site-drawer details.drawer__group > summary');
    for (let i = 0; i < (await groups.count()); i++) await groups.nth(i).click();
    await page.keyboard.press('Escape');
  }
  const accordions = page.locator('main details.acc > summary');
  const accordionCount = Math.min(await accordions.count(), 4);
  for (let i = 0; i < accordionCount; i++) {
    await accordions.nth(i).scrollIntoViewIfNeeded();
    await accordions.nth(i).click();
  }
  for (const root of await page.locator('[data-carousel]').all()) {
    const next = root.locator('[data-carousel-next]');
    const prev = root.locator('[data-carousel-prev]');
    await root.scrollIntoViewIfNeeded();
    if (await next.isEnabled()) await next.click();
    if (await prev.isEnabled()) await prev.click();
    const dots = root.locator('[data-carousel-dots] button');
    if ((await dots.count()) > 1) await dots.nth(1).click();
  }
  for (const toggle of await page.locator('[data-marquee-toggle]:visible').all()) {
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await toggle.click();
  }
  for (const copy of await page.locator('[data-copy]:visible').all()) {
    await copy.scrollIntoViewIfNeeded();
    await copy.click();
  }
  const close = page.locator('[data-promo-close]:visible');
  if (await close.count()) await close.first().click();
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  const top = page.locator('[data-backtotop]');
  if (await top.isVisible()) await top.click();
  await quiet(page);
}

for (const vp of VIEWPORTS) {
  test.describe(`console hygiene while interacting ${vpLabel(vp)}`, () => {
    test.use({ viewport: vp });
    for (const t of templatePages()) {
      test(`${t.label}: ${t.page.route}`, async ({ page }, testInfo) => {
        const issues = watchPage(page);
        await open(page, t.page);
        await scrollThrough(page);
        await exercise(page);
        await expectClean(issues, testInfo, t.page.route, `while interacting with ${t.page.route} at ${vpLabel(vp)}`);
      });
    }
  });
}
