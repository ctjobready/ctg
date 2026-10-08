import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { DESKTOP, MOBILE, VIEWPORTS, attachJson, fontsReady, open, scrollThrough, settleAnimations, vpLabel } from './support/browser';
import { hoverReachablePin } from './support/map';
import { countMarkup, listPages, pageByRoute, pagesWithMarkup } from './support/pages';

/**
 * Accessibility (planning doc 10 §1): axe-core on EVERY page at 390x844 and 1280x800, WCAG 2.0/2.1/2.2 A and AA
 * rule tags, zero violations. No rule is disabled and nothing is excluded. Pages are scrolled through first so the
 * IntersectionObserver reveals are in their final state (axe cannot judge contrast on an element still at opacity 0).
 * Results are attached as qa:a11y and summarised by tests/support/qa-reporter.ts (.work/qa/a11y-summary.{json,md}).
 */
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function runAxe(page: Page, testInfo: TestInfo, route: string, viewport: string, state?: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact ?? null,
    help: v.help,
    helpUrl: v.helpUrl,
    tags: v.tags.filter((t) => t.startsWith('wcag') || t.startsWith('best')),
    nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 400), summary: n.failureSummary ?? '' })),
  }));
  await attachJson(testInfo, 'a11y', {
    route,
    viewport,
    state,
    violations,
    incomplete: results.incomplete.map((i) => ({ id: i.id, nodes: i.nodes.length })),
    passes: results.passes.length,
    axeVersion: results.testEngine.version,
  });
  const digest = violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0]?.target ?? ''} — ${v.help}`);
  expect(digest, `axe violations on ${route}${state ? ` [${state}]` : ''} at ${viewport}`).toEqual([]);
}

async function prepare(page: Page, route: string): Promise<void> {
  await open(page, route);
  await fontsReady(page);
  await scrollThrough(page);
  await settleAnimations(page);
}

for (const vp of VIEWPORTS) {
  test.describe(`axe ${vpLabel(vp)}`, () => {
    test.use({ viewport: vp });
    for (const p of listPages()) {
      test(p.route, async ({ page }, testInfo) => {
        await prepare(page, p.rel);
        await runAxe(page, testInfo, p.route, vpLabel(vp));
      });
    }
  });
}

/**
 * Interactive states that are not in the static DOM scan: the open mega-menus (desktop), the open drawer with a
 * group expanded (mobile) and a visible map tooltip.
 */
test.describe('axe interactive states', () => {
  test.describe('desktop menus', () => {
    test.use({ viewport: DESKTOP });
    const triggers = countMarkup(pageByRoute('/'), /<button[^>]*\sdata-mega-trigger[\s>]/);
    for (let i = 0; i < triggers; i++) {
      test(`home: mega-menu ${i + 1} open`, async ({ page }, testInfo) => {
        await prepare(page, pageByRoute('/').rel);
        const all = page.locator('[data-mega-trigger]');
        expect(await all.count(), 'number of mega-menu triggers').toBe(triggers);
        await all.nth(i).click();
        await expect(all.nth(i)).toHaveAttribute('aria-expanded', 'true');
        await settleAnimations(page);
        await runAxe(page, testInfo, '/', vpLabel(DESKTOP), `mega-menu ${i + 1} open`);
      });
    }
  });

  test.describe('mobile drawer', () => {
    test.use({ viewport: MOBILE });
    test('home: drawer open with a group expanded', async ({ page }, testInfo) => {
      await prepare(page, pageByRoute('/').rel);
      await page.locator('[data-drawer-open]').click();
      await expect(page.locator('dialog[data-drawer]')).toHaveJSProperty('open', true);
      await page.locator('#site-drawer summary').first().click();
      await settleAnimations(page);
      await runAxe(page, testInfo, '/', vpLabel(MOBILE), 'drawer open, group expanded');
    });
  });

  test.describe('world map tooltip', () => {
    for (const vp of VIEWPORTS) {
      test.describe(vpLabel(vp), () => {
        test.use({ viewport: vp });
        for (const which of ['first', 'last'] as const) {
          test(`${which} reachable pin tooltip visible`, async ({ page }, testInfo) => {
            const mapPage = pagesWithMarkup(/class="wmap[ "]/)[0];
            expect(mapPage, 'a page rendering the world map').toBeDefined();
            await prepare(page, mapPage.rel);
            // Some pins sit under their neighbours (Bangladesh/Bhutan/India); hover the first/last pin the pointer can actually reach.
            await hoverReachablePin(page, which);
            await settleAnimations(page);
            await runAxe(page, testInfo, mapPage.route, vpLabel(vp), `map tooltip (${which} reachable pin)`);
          });
        }
      });
    }
  });
});
