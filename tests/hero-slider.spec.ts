import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';
import { pageByRoute } from './support/pages';

/**
 * Home hero slider (WP13; src/components/sections/HeroSlider.astro, src/scripts/heroSlider.ts). WCAG 2.2 AA, APG carousel pattern.
 *   - keyboard: the next, previous and dot controls (Enter, Space, Tab, arrow keys on the controls) change the slide;
 *   - the Pause control toggles its label, and a stopped carousel does not rotate on its own;
 *   - autoplay steps every 7 s, pauses on hover, and a visitor's own choice stops it for good;
 *   - reduced motion: no autoplay and no pause control;
 *   - only the showing slide is exposed to assistive technology (one heading, the others inert and hidden);
 *   - without JavaScript every slide is present, stacked, with its links, and no controls show;
 *   - switching slides does not move the layout, and the controls keep a 24 px target at phone width.
 * The autoplay checks use the real 7 s step, so they take a few seconds each.
 */

const STEP_WAIT_MS = 7600;

/** Index of the slide that carries is-active (-1 when none does). */
async function activeIndex(page: Page): Promise<number> {
  return page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')));
}

test.describe('home hero slider', () => {
  test.use({ viewport: DESKTOP });

  test('is a labelled carousel of six slides, with the only h1 on the first slide', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const region = page.locator('#hero');
    await expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    await expect(region).toHaveAttribute('aria-label', /.+/);
    const slides = page.locator('[data-hs-slide]');
    await expect(slides).toHaveCount(6);
    await expect(slides.nth(0)).toHaveAttribute('aria-label', /^1 of 6: /);
    await expect(slides.nth(5)).toHaveAttribute('aria-label', /^6 of 6: /);
    await expect(slides.nth(0)).toHaveAttribute('role', 'group');
    await expect(slides.nth(0)).toHaveAttribute('aria-roledescription', 'slide');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#hero h1')).toHaveText('Turn Youth Unemployment into Digital Employment — with Evidence.');
    await expect(page.locator('#hero h2')).toHaveCount(5);
  });

  test('keyboard: the next, previous and dot controls change the slide, and focus stays put', async ({ page, browserName }) => {
    await open(page, pageByRoute('/'));
    const next = page.locator('[data-hs-next]');
    const prev = page.locator('[data-hs-prev]');
    const dots = page.locator('[data-hs-dot]');
    await expect(next).toBeVisible();

    await next.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => activeIndex(page)).toBe(1);
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
    await expect(next).toBeFocused();

    await prev.focus();
    await page.keyboard.press('Space');
    await expect.poll(() => activeIndex(page)).toBe(0);

    // Tab from the previous button reaches the first slide picker. WebKit on macOS does not give buttons Tab focus by default
    // (the OS setting), so there the buttons are reached by the arrow keys and Enter checked above and below.
    if (browserName !== 'webkit') {
      await prev.focus();
      await page.keyboard.press('Tab');
      await expect(dots.nth(0)).toBeFocused();
    }

    // the arrow keys move between slides from the controls
    await dots.nth(0).focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => activeIndex(page)).toBe(1);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => activeIndex(page)).toBe(0);
    await expect(dots.nth(0)).toBeFocused();
  });

  test('pause control: its label follows the state, and a paused carousel does not rotate', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await page.mouse.move(0, 0);
    const toggle = page.locator('[data-hs-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText(/Pause/);
    await expect(page.locator('#hero [data-hs-track]')).toHaveAttribute('aria-live', 'off');

    await expect.poll(() => activeIndex(page), { timeout: STEP_WAIT_MS + 2000 }).toBe(1);

    await toggle.click();
    await expect(toggle).toHaveText(/Play/);
    await expect(page.locator('#hero [data-hs-track]')).toHaveAttribute('aria-live', 'polite');
    await page.mouse.move(0, 0);
    const held = await activeIndex(page);
    await page.waitForTimeout(STEP_WAIT_MS);
    expect(await activeIndex(page), 'a paused carousel stays on its slide').toBe(held);
  });

  test('autoplay pauses while the pointer is over the region and resumes after it leaves', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await page.mouse.move(0, 0);
    const hero = page.locator('#hero');
    const box = await hero.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.waitForTimeout(STEP_WAIT_MS);
    expect(await activeIndex(page), 'hovering the region holds the slide').toBe(0);
    await page.mouse.move(0, 0);
    await expect.poll(() => activeIndex(page), { timeout: STEP_WAIT_MS + 2000 }).toBe(1);
  });

  test('a visitor choice stops the rotation for good', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await page.locator('[data-hs-dot]').nth(3).click();
    await expect.poll(() => activeIndex(page)).toBe(3);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(STEP_WAIT_MS);
    expect(await activeIndex(page), 'no automatic step after a manual choice').toBe(3);
    await expect(page.locator('[data-hs-toggle]')).toHaveText(/Play/);
  });

  test('only the showing slide is exposed to assistive technology', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const hero = page.locator('#hero');
    await expect(hero.getByRole('heading')).toHaveCount(1);
    const hidden = page.locator('[data-hs-slide]:not(.is-active)');
    await expect(hidden).toHaveCount(5);
    for (const el of await hidden.all()) {
      await expect(el).toHaveAttribute('inert', '');
    }
    await page.locator('[data-hs-dot]').nth(2).click();
    await expect(hero.getByRole('heading', { level: 2 })).toHaveText('Evidence from a Randomized Trial');
    await expect(hero.getByRole('heading')).toHaveCount(1);
    await expect(page.locator('[data-hs-slide]').nth(0).getByRole('link')).toHaveCount(0);
    await expect(page.locator('[data-hs-slide]').nth(0).locator('a').first()).toBeHidden();
  });

  test('switching slides does not move the layout', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const hero = page.locator('#hero');
    const first = await hero.boundingBox();
    expect(first).not.toBeNull();
    for (let i = 1; i < 6; i++) {
      await page.locator('[data-hs-dot]').nth(i).click();
      await expect.poll(() => activeIndex(page)).toBe(i);
      const box = await hero.boundingBox();
      expect(box!.height, `region height on slide ${i + 1}`).toBeCloseTo(first!.height, 0);
    }
  });
});

test.describe('home hero slider at phone width', () => {
  test.use({ viewport: MOBILE });

  test('no horizontal scroll on any slide, and every control has a 24 px target', async ({ page }) => {
    await open(page, pageByRoute('/'));
    for (let i = 0; i < 6; i++) {
      await page.locator('[data-hs-dot]').nth(i).click();
      await expect.poll(() => activeIndex(page)).toBe(i);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on slide ${i + 1}`).toBeLessThanOrEqual(0);
    }
    for (const sel of ['[data-hs-prev]', '[data-hs-next]', '[data-hs-toggle]', '[data-hs-dot]']) {
      for (const el of await page.locator(sel).all()) {
        const box = await el.boundingBox();
        expect(box!.width, `${sel} width`).toBeGreaterThanOrEqual(24);
        expect(box!.height, `${sel} height`).toBeGreaterThanOrEqual(24);
      }
    }
  });
});

test.describe('home hero slider with reduced motion', () => {
  test.use({ viewport: DESKTOP, reducedMotion: 'reduce' });

  test('no autoplay, and no pause control is offered', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await page.waitForTimeout(STEP_WAIT_MS);
    expect(await activeIndex(page), 'no slide change under reduced motion').toBe(0);
    await expect(page.locator('[data-hs-toggle]')).toBeHidden();
    await expect(page.locator('#hero [data-hs-track]')).toHaveAttribute('aria-live', 'polite');
    await page.locator('[data-hs-next]').click();
    await expect.poll(() => activeIndex(page)).toBe(1);
  });
});

test.describe('home hero slider in print', () => {
  test.use({ viewport: DESKTOP });

  test('every slide prints in order, and no control prints', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await page.emulateMedia({ media: 'print' });
    const headings = page.locator('#hero h1, #hero h2');
    await expect(headings).toHaveCount(6);
    for (const h of await headings.all()) {
      await expect(h).toBeVisible();
    }
    for (const sel of ['[data-hs-toggle]', '[data-hs-prev]', '[data-hs-next]', '[data-hs-dot]']) {
      await expect(page.locator(sel).first(), `${sel} in print`).toBeHidden();
    }
  });
});

test.describe('home hero slider without JavaScript', () => {
  test.use({ viewport: DESKTOP, javaScriptEnabled: false });

  test('every slide is present and stacked, with its links, and no controls show', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const hero = page.locator('#hero');
    await expect(hero.getByRole('heading')).toHaveCount(6);
    const slides = page.locator('[data-hs-slide]');
    await expect(slides).toHaveCount(6);
    for (const s of await slides.all()) {
      await expect(s).toBeVisible();
    }
    await expect(page.locator('[data-hs-toggle]')).toBeHidden();
    await expect(page.locator('[data-hs-prev]')).toBeHidden();
    await expect(page.locator('[data-hs-next]')).toBeHidden();
    await expect(hero.getByRole('link', { name: 'Explore Global Reach' })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'See the Trial' })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'Read the 2026 Survey Results' })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'YouthWIDE' })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'For Governments' })).toBeVisible();
  });
});
