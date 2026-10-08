import { expect, test } from '@playwright/test';
import { VIEWPORTS, open, quiet, scrollThrough, vpLabel, watchPage } from './support/browser';
import { listPages } from './support/pages';

/**
 * Cross-browser smoke (planning doc 10 §3). Runs in the chromium, firefox and webkit projects (the last two in CI):
 * every page loads (HTTP 200), renders a visible <h1> in <main>, has a title, and produces no console errors, uncaught
 * exceptions or failed same-origin requests while it is scrolled top to bottom.
 */
for (const vp of VIEWPORTS) {
  test.describe(`smoke ${vpLabel(vp)}`, () => {
    test.use({ viewport: vp });
    for (const p of listPages()) {
      test(p.route, async ({ page }) => {
        const issues = watchPage(page);
        await open(page, p);
        await scrollThrough(page);
        await quiet(page);
        await expect(page, 'document title').toHaveTitle(/\S/);
        await expect(page.locator('main'), '<main>').toBeVisible();
        await expect(page.locator('main h1').first(), 'first <h1> in <main>').toBeVisible();
        expect.soft(issues.console, 'console errors').toEqual([]);
        expect.soft(issues.pageErrors, 'uncaught exceptions / unhandled rejections').toEqual([]);
        expect.soft(issues.failedRequests, 'failed same-origin requests').toEqual([]);
        expect.soft(issues.badResponses, 'same-origin 4xx/5xx responses').toEqual([]);
      });
    }
  });
}
