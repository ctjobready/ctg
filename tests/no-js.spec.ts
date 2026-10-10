import { expect, test, type Page } from '@playwright/test';
import { locations } from '../src/data/countries';
import { DESKTOP, MOBILE, VIEWPORTS, open, relativeToBase, vpLabel } from './support/browser';
import { contentProbe } from './support/content';
import { listPages, pageByRoute, pagesWithMarkup } from './support/pages';

/**
 * No-JS rendering (planning doc 10 §1, doc 08 §5): with JavaScript disabled, on every page
 *   - the main content is visible (nothing left hidden by a reveal class),
 *   - every stat shows its final value,
 *   - the navigation destinations stay reachable (the <noscript> primary nav below 1024px, the CSS hover/focus
 *     mega-menus from 1024px, and the footer),
 *   - the global-reach location table is visible.
 * The expected destinations come from the site's own drawer markup, read once from the home page with JS enabled.
 * Extra (beyond the brief): JS-only controls (promo dismiss, carousel arrows, marquee pause, ...) must not be left visible
 * and dead; a positive control proves the reveal probe sees hidden content when JS is on.
 */

interface NavGroupModel {
  label: string;
  links: { href: string; overview: boolean }[];
}
interface NavModel {
  groups: NavGroupModel[];
  tops: string[];
  cta: string;
}

let nav: NavModel;

test.beforeAll(async ({ browser }) => {
  const baseURL = test.info().project.use.baseURL;
  const context = await browser.newContext({ baseURL, javaScriptEnabled: true, viewport: MOBILE });
  const page = await context.newPage();
  await page.goto(pageByRoute('/').rel);
  nav = await page.evaluate((): NavModel => {
    const drawer = document.querySelector('#site-drawer')!;
    return {
      groups: Array.from(drawer.querySelectorAll('details.drawer__group')).map((d) => ({
        label: (d.querySelector('summary span')?.textContent ?? '').trim(),
        links: Array.from(d.querySelectorAll<HTMLAnchorElement>('.acc__body a')).map((a) => ({ href: a.getAttribute('href') ?? '', overview: !!a.querySelector('strong') })),
      })),
      tops: Array.from(drawer.querySelectorAll<HTMLAnchorElement>('a.drawer__top')).map((a) => a.getAttribute('href') ?? ''),
      cta: drawer.querySelector('.drawer__cta')?.getAttribute('href') ?? '',
    };
  });
  await context.close();
});

/** hrefs of the anchors inside `scope` that are actually rendered (not display:none, not in a closed <details>). */
async function visibleHrefs(page: Page, scope: string): Promise<string[]> {
  return page.evaluate((selector) => {
    const visible = (el: Element) => {
      const cs = getComputedStyle(el);
      return el.getClientRects().length > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0;
    };
    return Array.from(document.querySelectorAll<HTMLAnchorElement>(`${selector} a[href]`))
      .filter(visible)
      .map((a) => a.getAttribute('href') ?? '');
  }, scope);
}

test.describe('no JS', () => {
  test.use({ javaScriptEnabled: false });

  for (const vp of VIEWPORTS) {
    test.describe(vpLabel(vp), () => {
      test.use({ viewport: vp });

      for (const p of listPages()) {
        test(`${p.route}: content, links and stats are present`, async ({ page }) => {
          await open(page, p);
          const info = await page.evaluate(contentProbe);
          expect(info.jsClass, 'JavaScript really is off (the inline script adds html.js)').toBe(false);
          expect(info.mainVisible, '<main> is rendered').toBe(true);
          expect(info.mainText, 'text length of <main>').toBeGreaterThan(200);
          expect(info.h1Visible, 'visible <h1>').toBeGreaterThanOrEqual(1);
          expect.soft(info.hiddenReveals, `[data-reveal] elements left hidden (of ${info.revealCount})`).toEqual([]);
          expect.soft(info.wrongCountups, `count-up stats not showing the final value (of ${info.countupCount})`).toEqual([]);
          expect.soft(info.emptyStats, 'empty stat values').toEqual([]);
          expect(info.links, 'visible links on the page').toBeGreaterThan(10);
        });

        if (vp.width === MOBILE.width) {
          test(`${p.route}: nav fallback (noscript nav and footer) lists every destination`, async ({ page }) => {
            await open(page, p);
            await expect(page.locator('nav.nav-noscript'), 'primary navigation without scripts').toBeVisible();
            const navHrefs = await visibleHrefs(page, 'nav.nav-noscript');
            const hubs = nav.groups.map((g) => g.links[0]?.href);
            const expected = [...hubs, ...nav.tops.filter((h) => !/^https?:/.test(h)), nav.cta];
            expect.soft(expected.filter((h) => !navHrefs.includes(h)), 'group hubs, top links and the header CTA missing from the no-JS nav').toEqual([]);
            const footerHrefs = await visibleHrefs(page, 'footer');
            expect.soft(footerHrefs.length, 'visible footer links').toBeGreaterThan(15);
            const footerItems = nav.groups.filter((g) => ['About', 'Programs', 'Impact', 'Partner with us'].includes(g.label)).flatMap((g) => g.links.filter((l) => !l.overview).map((l) => l.href));
            expect.soft(footerItems.filter((h) => !footerHrefs.includes(h)), 'footer is missing destinations that the mega-menus list').toEqual([]);
          });
        }

        if (vp.width === DESKTOP.width) {
          test(`${p.route}: desktop menus open on hover and on keyboard focus without JS`, async ({ page }) => {
            await open(page, p);
            const triggers = page.locator('.site-nav__trigger');
            expect(await triggers.count(), 'mega-menu triggers').toBe(nav.groups.length);
            for (let i = 0; i < nav.groups.length; i++) {
              const group = nav.groups[i];
              const panel = page.locator('[data-mega-panel]').nth(i);
              const wanted = group.links.filter((l) => !l.overview).map((l) => l.href);
              await triggers.nth(i).hover();
              await expect(panel, `${group.label}: panel visible on hover`).toBeVisible();
              const hoverHrefs = await panel.evaluate((el) => Array.from(el.querySelectorAll('a.mega__link')).map((a) => a.getAttribute('href') ?? ''));
              expect.soft(wanted.filter((h) => !hoverHrefs.includes(h)), `${group.label}: destinations missing from the hover panel`).toEqual([]);
              await page.mouse.move(0, 0);
              await expect(panel, `${group.label}: panel closes when the pointer leaves`).toBeHidden();
              await triggers.nth(i).focus();
              await expect(panel, `${group.label}: panel visible on keyboard focus`).toBeVisible();
              await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
            }
          });
        }
      }
    });
  }

  /**
   * Extra (beyond the brief): controls that need JavaScript must not be shown, dead, when it is off. One sweep per viewport so
   * a site-wide pattern (for example the PromoBar dismiss button) is reported once, grouped by control, instead of once per page.
   */
  for (const vp of VIEWPORTS) {
    test(`no dead JS-only controls on any page (extra) ${vpLabel(vp)}`, async ({ page }) => {
      test.setTimeout(600_000);
      await page.setViewportSize(vp);
      const byControl = new Map<string, string[]>();
      for (const p of listPages()) {
        await open(page, p);
        const { deadControls } = await page.evaluate(contentProbe);
        for (const c of deadControls) {
          const routes = byControl.get(c) ?? [];
          if (!routes.includes(p.route)) routes.push(p.route);
          byControl.set(c, routes);
        }
      }
      const digest = [...byControl.entries()].map(([control, routes]) => `${control} visible but inert on ${routes.length} page(s): ${routes.slice(0, 6).join(', ')}${routes.length > 6 ? ', ...' : ''}`);
      expect(digest, 'visible controls that need JavaScript (promo dismiss, carousel arrows/dots, marquee pause, drawer button, back to top, copy)').toEqual([]);
    });
  }

  /**
   * Extra (beyond the brief): the mobile sticky CTA bar steps aside through a script (src/scripts/stickycta.ts), so without
   * JavaScript it could never leave the hero's own primary CTA and a phone visitor would see two solid primaries. It must not be displayed.
   */
  test.describe('sticky CTA bar', () => {
    test.use({ viewport: MOBILE });
    test('the mobile sticky CTA bar is not displayed without JavaScript (390)', async ({ page }) => {
      const landing = pagesWithMarkup(/class="sticky-cta"/);
      expect(landing.length, 'pages that render the sticky CTA bar').toBeGreaterThan(0);
      const shown: string[] = [];
      for (const p of landing) {
        await open(page, p);
        const state = await page.evaluate(() => {
          const bar = document.querySelector('.sticky-cta');
          const cs = bar && getComputedStyle(bar);
          return { jsClass: document.documentElement.classList.contains('js'), present: !!bar, display: cs?.display, rects: bar?.getClientRects().length ?? 0 };
        });
        expect(state.jsClass, `${p.route}: JavaScript really is off`).toBe(false);
        expect(state.present, `${p.route}: the bar is in the markup`).toBe(true);
        if (state.display !== 'none' || state.rects > 0) shown.push(`${p.route} (display ${state.display})`);
      }
      expect(shown, 'pages that draw the sticky CTA bar without JavaScript').toEqual([]);
    });
  });

  test.describe('reachability', () => {
    test.use({ viewport: MOBILE });
    test('home: every destination offered by the JS menus is reachable without JS within two clicks (390)', async ({ page }) => {
      await open(page, pageByRoute('/'));
      const onHome = new Set(await visibleHrefs(page, 'body'));
      const missing: string[] = [];
      for (const g of nav.groups) {
        const hub = g.links[0]?.href;
        if (!hub || !onHome.has(hub)) {
          missing.push(`${g.label}: hub ${hub} is not a visible link on the home page`);
          continue;
        }
        const notOnHome = g.links.filter((l) => !onHome.has(l.href));
        if (!notOnHome.length) continue;
        await open(page, relativeToBase(hub));
        const onHub = new Set(await visibleHrefs(page, 'body'));
        for (const l of notOnHome) if (!onHub.has(l.href)) missing.push(`${g.label}: ${l.href} is linked neither from the home page nor from the ${g.label} hub page`);
      }
      expect(missing, 'destinations unreachable without JS within two clicks').toEqual([]);
    });
  });

  for (const vp of VIEWPORTS) {
    test(`global reach: the location table is visible ${vpLabel(vp)}`, async ({ page }) => {
      const mapPages = pagesWithMarkup(/class="wmap[ "]/);
      expect(mapPages.length, 'pages rendering the world map').toBeGreaterThan(0);
      for (const mp of mapPages) {
        await page.setViewportSize(vp);
        await open(page, mp);
        const table = page.locator('.wmap__table table');
        await expect(table, `${mp.route}: location table`).toBeVisible();
        const rows = page.locator('.wmap__table tbody tr');
        expect(await rows.count(), `${mp.route}: table rows`).toBe(locations.length);
        for (const i of [0, locations.length - 1]) await expect(rows.nth(i), `${mp.route}: row ${i + 1}`).toBeVisible();
        const region = page.locator('.wmap__table');
        await expect(region, 'scrollable region is keyboard reachable').toHaveAttribute('tabindex', '0');
        await expect(region, 'scrollable region has a name').toHaveAttribute('aria-label', /locations/i);
      }
    });
  }
});

/** Control: with JS on and motion allowed the probe must see reveal content hidden below the fold, otherwise "no hidden reveals" proves nothing. */
test.describe('no JS: control (JS on)', () => {
  test.use({ viewport: DESKTOP, javaScriptEnabled: true, reducedMotion: 'no-preference' });
  test('home: reveal and count-up probes detect hidden or unfinished content when JS runs', async ({ page }) => {
    await open(page, pageByRoute('/'), 'domcontentloaded');
    const info = await page.evaluate(contentProbe);
    expect(info.jsClass, 'JavaScript is on').toBe(true);
    expect(info.revealCount, 'reveal elements on home').toBeGreaterThan(0);
    expect(info.hiddenReveals.length, 'reveal elements still hidden before they scroll into view').toBeGreaterThan(0);
    expect(info.wrongCountups.length, 'count-ups not yet at their final value').toBeGreaterThan(0);
    expect(info.deadControls.length, 'JS-only controls are shown when JS runs').toBeGreaterThan(0);
  });
  test.describe('sticky CTA bar', () => {
    test.use({ viewport: MOBILE });
    test('home: the sticky CTA bar is displayed (not display:none) at 390 when JS runs, so the no-JS assertion can fail', async ({ page }) => {
      await open(page, pageByRoute('/'), 'domcontentloaded');
      await expect(page.locator('html.js')).toHaveCount(1);
      await expect.poll(() => page.evaluate(() => getComputedStyle(document.querySelector('.sticky-cta')!).display)).not.toBe('none');
    });
  });
});
