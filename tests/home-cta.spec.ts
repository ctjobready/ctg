import { expect, test } from '@playwright/test';
import { VIEWPORTS, fontsReady, open, settleAnimations, vpLabel } from './support/browser';
import { pageByRoute, pagesWithMarkup } from './support/pages';

/**
 * Home: the primary CTA is visible above the fold, without scrolling, at 390x844 and 1280x800 (planning doc 10 §3).
 * Runs in all three browser projects. The primary CTA is the first solid-primary button of the hero
 * (HeroBand -> Hero: `.hero__actions .btn--primary`); the PromoBar action is a "promo" button and does not count.
 */
/** Control: in a deliberately short viewport the same measurement must report the CTA below the fold. */
test('home: control - the above-the-fold measurement fails in a 300px-tall viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 300 });
  await open(page, pageByRoute('/'));
  await fontsReady(page);
  await settleAnimations(page);
  const box = await page.locator('main .hero__actions .btn--primary').first().boundingBox();
  expect(box, 'CTA box').not.toBeNull();
  expect(box!.y + box!.height, 'CTA bottom edge in a 300px viewport').toBeGreaterThan(300);
});

for (const vp of VIEWPORTS) {
  test(`home: primary CTA is fully visible above the fold at ${vpLabel(vp)}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await open(page, pageByRoute('/'));
    await fontsReady(page);
    await settleAnimations(page);
    const cta = page.locator('main .hero__actions .btn--primary').first();
    await expect(cta, 'hero primary button').toBeVisible();
    const label = (await cta.innerText()).trim();
    expect(label.length, 'CTA label').toBeGreaterThan(2);
    const href = await cta.getAttribute('href');
    expect(href, 'CTA is a link with a destination').toBeTruthy();

    const probe = await cta.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      return {
        scrollY: window.scrollY,
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        viewportHeight: window.innerHeight,
        viewportWidth: document.documentElement.clientWidth,
        hitTarget: top ? `${top.tagName.toLowerCase()}${typeof top.className === 'string' && top.className ? `.${top.className.trim().split(/\s+/)[0]}` : ''}` : null,
        reachable: !!top && (el === top || el.contains(top)),
      };
    });
    expect(probe.scrollY, 'measured at the top of the page').toBe(0);
    expect(probe.top, `CTA top edge (label "${label}")`).toBeGreaterThanOrEqual(0);
    expect(probe.bottom, `CTA bottom edge is within the ${probe.viewportHeight}px viewport; it starts at ${Math.round(probe.top)}px`).toBeLessThanOrEqual(probe.viewportHeight);
    expect(probe.left, 'CTA left edge').toBeGreaterThanOrEqual(0);
    expect(probe.right, 'CTA right edge').toBeLessThanOrEqual(probe.viewportWidth);
    expect(probe.reachable, `nothing covers the CTA centre (hit target: ${probe.hitTarget})`).toBe(true);
  });
}

/**
 * Extra (beyond the brief): the mobile sticky CTA bar must not sit beside the hero CTA. src/scripts/stickycta.ts keeps it
 * hidden (and inert) while the hero's primary CTA, #cta, .cta-band or [data-sticky-hide] is in view, so a solid primary
 * button is never shown twice in one viewport region (doc 06 P1, doc 07 §5.1). Sweeps every page that renders the bar.
 */
test('mobile sticky CTA bar is hidden at the top of every landing page (extra) 390x844', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const withBar = pagesWithMarkup(/class="sticky-cta/);
  expect(withBar.length, 'pages that render the sticky CTA bar').toBeGreaterThan(0);
  const shown: string[] = [];
  for (const p of withBar) {
    await open(page, p);
    await fontsReady(page);
    await settleAnimations(page);
    await page.waitForTimeout(600); // the bar's visibility transition and the IntersectionObserver callback
    const visible = await page.evaluate(() => {
      const bar = document.querySelector('.sticky-cta');
      if (!bar) return false;
      const rect = bar.getBoundingClientRect();
      return getComputedStyle(bar).visibility !== 'hidden' && rect.top < window.innerHeight && rect.bottom > 0;
    });
    if (visible) shown.push(p.route);
  }
  expect(shown, `pages where the sticky CTA bar is already visible at scrollY=0 (of ${withBar.length})`).toEqual([]);
});
