import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';
import { pageByRoute } from './support/pages';

/**
 * Home "Results" carousel (WP13, moved below the stable hero in WP17, headed "Results and Programs" until WP53; src/components/sections/HeroSlider.astro,
 * src/scripts/heroSlider.ts). WCAG 2.2 AA, APG carousel pattern. The hero above it (#hero, HomeHero) holds the page's only h1, the primary
 * action and the three proof cards; the carousel's slides are all h2.
 *   - keyboard: the next, previous and dot controls (Enter, Space, Tab, arrow keys on the controls) change the slide;
 *   - the Pause control toggles its label, and a stopped carousel does not rotate on its own;
 *   - autoplay steps every 7 s, pauses on hover, and a visitor's own choice stops it for good;
 *   - reduced motion: no autoplay and no pause control;
 *   - only the showing slide is exposed to assistive technology (one heading, the others inert and hidden);
 *   - without JavaScript every slide is present, stacked, with its links, and no controls show;
 *   - switching slides does not move the layout, and the controls keep a 24 px target at phone width;
 *   - the pill of the active dot follows the slide (the visual state, not only aria-current);
 *   - the region does not change height when the script runs (no layout shift on load);
 *   - every slide has its own cleared photograph, all loaded lazily (the hero's own photograph is the eager one);
 *   - no slide leaves more than 48 px of unused space between its content and the controls (1280 and 390).
 * Slide order (WP53, owner decision 2026-10-16: four slides): the randomized trial, government and National University, the Impact Survey 2026 (income, with the timing of first earnings as one body line), results by program.
 * The autoplay checks use the real 7 s step, so they take a few seconds each.
 */

const STEP_WAIT_MS = 7600;

/** Index of the slide that carries is-active (-1 when none does). */
async function activeIndex(page: Page): Promise<number> {
  return page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')));
}

/**
 * Unused space, in px, between the showing slide's content (the copy column and the visual column with its photograph and proof card)
 * and the controls bar under the slides. Measured on the live layout.
 */
async function unusedBelow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const active = document.querySelector('[data-hs-slide].is-active');
    const controls = document.querySelector('[data-hs-bar]');
    if (!active || !controls) return Number.NaN;
    const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
    const contentBottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom));
    return Math.round(controls.getBoundingClientRect().top - contentBottom);
  });
}

test.describe('home hero slider', () => {
  test.use({ viewport: DESKTOP });

  test('is a labelled carousel of four slides; the only h1 is in the stable hero above it', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const region = page.locator('#results');
    await expect(region).toHaveAttribute('aria-roledescription', 'carousel');
    await expect(region).toHaveAttribute('aria-labelledby', 'results-h');
    // WP53 (owner decision 2026-10-16): the band is headed "Results" (it was "Results and Programs"; the programs slide is gone)
    await expect(page.locator('#results-h')).toHaveText('Results');
    const slides = page.locator('[data-hs-slide]');
    await expect(slides).toHaveCount(4);
    await expect(slides.nth(0)).toHaveAttribute('aria-label', /^1 of 4: /);
    await expect(slides.nth(3)).toHaveAttribute('aria-label', /^4 of 4: /);
    await expect(slides.nth(0)).toHaveAttribute('role', 'group');
    await expect(slides.nth(0)).toHaveAttribute('aria-roledescription', 'slide');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#hero h1')).toHaveText('Turn Youth Unemployment into a Digital Workforce — with Evidence');
    await expect(page.locator('#results h1')).toHaveCount(0);
    await expect(page.locator('#results [data-hs-slide] h2')).toHaveCount(4);
    // WP45 (cycle-21 review): the trial slide leads with the income result (the employment result is the hero card's, the bar's and the >4× tile's)
    // WP48 (cycle-23 review): the heading named the predecessor program; WP50 (cycle-25 review): the heading is short again and the slide's eyebrow carries the qualifier ("Randomized Trial of a Predecessor Program"; tests/wp50.spec.ts)
    await expect(slides.nth(0)).toHaveAttribute('aria-label', '1 of 4: Women Offered a Place Earned an Estimated 41% More');
    // WP23, WP25h and WP30c gave the band one framing sentence ("Evidence first, then our programs."). WP53 (owner decision 2026-10-16): the programs slide is gone, so the band is headed "Results" and has no framing sentence.
    // No slide heading ends with a period.
    await expect(page.locator('.hs__intro')).toHaveCount(0);
    const titles = await page.locator('#results [data-hs-slide] h2').allTextContents();
    // WP42 (cycle-19 review): the government slide is second, after the trial. WP53 (owner decision 2026-10-16): the speed, reach and programs slides are gone (the survey slide carries the timing as one body line, tests/wp53.spec.ts),
    // so the order is the trial, the government scale, the survey and the program results
    expect(titles.slice(1), 'government, survey and program-result headlines').toEqual([
      'Six Government Contracts and Bangladesh’s National University',
      'Surveyed Completers Report Higher Income',
      'Results by Program',
    ]);
    expect(titles[3], 'the program results stay last').toBe('Results by Program');
    for (const t of titles) expect(t, 'slide titles carry no trailing period').not.toMatch(/\.$/);
    // WP31: the first slide states the offered-place results only; the attenders' income is on the trial page it links. WP45 (cycle-21 review): the income result (the employment result is the hero card's), still the offered-place women's
    const lead = (await slides.nth(0).locator('.hs__lead').textContent()) ?? '';
    expect(lead.indexOf('predecessor WSDFM program'), 'the scope comes first').toBeGreaterThan(-1);
    expect(lead.indexOf('41% higher')).toBeGreaterThan(lead.indexOf('predecessor WSDFM program'));
    expect(lead).not.toContain('54%');
    expect(lead).not.toContain('who attended');
    // the placement slide lists four programs (WP35 had taken the WSDFM 71% off it, because it is program records, read beside the trial's 63.1%; WP50, cycle-25 review: it is back as the second program, with the qualifier "program records, not trial data")
    await expect(slides.nth(3).locator('.hs__lines li')).toHaveCount(4);
    await expect(slides.nth(3).locator('.hs__lines li').nth(1)).toHaveText('WSDFM: 71% in work (711 of 1,000; program records; trial studied 833).');
    await expect(slides.nth(3).locator('.hs__lines li').nth(3)).toHaveText('Her Power: 372 of 800 tracked in work (47%); 2,500 trained directly.');
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
    await expect(page.locator('#results [data-hs-track]')).toHaveAttribute('aria-live', 'off');

    await expect.poll(() => activeIndex(page), { timeout: STEP_WAIT_MS + 2000 }).toBe(1);

    await toggle.click();
    await expect(toggle).toHaveText(/Play/);
    await expect(page.locator('#results [data-hs-track]')).toHaveAttribute('aria-live', 'polite');
    await page.mouse.move(0, 0);
    const held = await activeIndex(page);
    await page.waitForTimeout(STEP_WAIT_MS);
    expect(await activeIndex(page), 'a paused carousel stays on its slide').toBe(held);
  });

  test('autoplay pauses while the pointer is over the region and resumes after it leaves', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await page.mouse.move(0, 0);
    const hero = page.locator('#results');
    // The carousel sits below the hero: bring it into the viewport so that the pointer can be over it.
    await hero.scrollIntoViewIfNeeded();
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
    const hero = page.locator('#results');
    await expect(hero.getByRole('heading')).toHaveCount(1);
    const hidden = page.locator('[data-hs-slide]:not(.is-active)');
    await expect(hidden).toHaveCount(3);
    for (const el of await hidden.all()) {
      await expect(el).toHaveAttribute('inert', '');
    }
    // (the survey-income slide is the third, since WP42 put the government slide second)
    await page.locator('[data-hs-dot]').nth(2).click();
    // The leaving slide fades out before it leaves the accessibility tree: wait for that, then read the one heading that is left.
    await expect(hero.getByRole('heading')).toHaveCount(1);
    await expect(hero.getByRole('heading', { level: 2 })).toHaveText('Surveyed Completers Report Higher Income');
    await expect(hero.getByRole('heading')).toHaveCount(1);
    await expect(page.locator('[data-hs-slide]').nth(0).getByRole('link')).toHaveCount(0);
    await expect(page.locator('[data-hs-slide]').nth(0).locator('a').first()).toBeHidden();
  });

  test('switching slides does not move the layout', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const hero = page.locator('#results');
    const first = await hero.boundingBox();
    expect(first).not.toBeNull();
    for (let i = 1; i < 4; i++) {
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
    for (let i = 0; i < 4; i++) {
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
    await expect(page.locator('#results [data-hs-track]')).toHaveAttribute('aria-live', 'polite');
    await page.locator('[data-hs-next]').click();
    await expect.poll(() => activeIndex(page)).toBe(1);
  });
});

test.describe('home hero slider in print', () => {
  test.use({ viewport: DESKTOP });

  test('every slide prints in order, and no control prints', async ({ page }) => {
    await open(page, pageByRoute('/'));
    await page.emulateMedia({ media: 'print' });
    const headings = page.locator('#results [data-hs-slide] h2');
    await expect(headings).toHaveCount(4);
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
    const hero = page.locator('#results');
    await expect(hero.getByRole('heading')).toHaveCount(4);
    const slides = page.locator('[data-hs-slide]');
    await expect(slides).toHaveCount(4);
    for (const s of await slides.all()) {
      await expect(s).toBeVisible();
    }
    await expect(page.locator('[data-hs-toggle]')).toBeHidden();
    await expect(page.locator('[data-hs-prev]')).toBeHidden();
    await expect(page.locator('[data-hs-next]')).toBeHidden();
    await expect(hero.getByRole('link', { name: 'See the Trial' })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'Read the Impact Survey 2026' })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'See the Case Studies' })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'For Governments' })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'For Universities' })).toBeVisible();
  });
});

test.describe('home hero slider layout', () => {
  test.use({ viewport: DESKTOP });

  test('the pill of the active dot follows the slide, not only aria-current', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const dots = page.locator('[data-hs-dot]');
    const pill = (i: number) => dots.nth(i).evaluate((el) => parseFloat(getComputedStyle(el, '::before').width));
    await expect.poll(() => pill(0)).toBe(24);
    await dots.nth(3).click();
    await expect.poll(() => activeIndex(page)).toBe(3);
    await expect.poll(() => pill(3)).toBe(24);
    await expect.poll(() => pill(0)).toBe(8);
    await expect(dots.nth(3)).toHaveClass(/is-active/);
    await expect(dots.nth(3)).toHaveAttribute('aria-current', 'true');
    await expect(dots.nth(0)).not.toHaveClass(/is-active/);
    await expect(dots.nth(0)).not.toHaveAttribute('aria-current', 'true');
  });

  test('the region does not change height when the script runs (no layout shift on load)', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __shift: number };
      w.__shift = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
          if (!e.hadRecentInput) w.__shift += e.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await open(page, pageByRoute('/'));
    await expect(page.locator('[data-hs-toggle]')).toBeVisible();
    await page.waitForTimeout(1000);
    const shift = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
    expect(shift, 'cumulative layout shift on the home page after load').toBeLessThan(0.01);
  });

  test('each slide has its own cleared photograph, all loaded lazily', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const permissions = JSON.parse(readFileSync(new URL('../src/data/permissions.json', import.meta.url), 'utf8')) as {
      assetId: string;
      status: string;
    }[];
    const slides = page.locator('[data-hs-slide]');
    await expect(slides).toHaveCount(4);
    const assets: string[] = [];
    for (let i = 0; i < 4; i++) {
      const img = slides.nth(i).locator('img');
      await expect(img, `photograph on slide ${i + 1}`).toHaveCount(1);
      await expect(img).toHaveAttribute('loading', 'lazy');
      await expect(img).toHaveAttribute('alt', /.+/);
      const asset = (await img.getAttribute('data-asset')) ?? '';
      assets.push(asset);
      expect(permissions.find((p) => p.assetId === asset)?.status, `slide ${i + 1} photograph ${asset} is cleared`).toBe('cleared');
    }
    expect(new Set(assets).size, 'each slide shows a different photograph').toBe(4);
  });

  test('no slide leaves more than 48 px of unused space below its content (1280)', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const dots = page.locator('[data-hs-dot]');
    for (let i = 0; i < 4; i++) {
      await dots.nth(i).click();
      await expect.poll(() => activeIndex(page)).toBe(i);
      await page.waitForTimeout(450);
      expect(await unusedBelow(page), `unused space below the content on slide ${i + 1}`).toBeLessThanOrEqual(48);
    }
  });
});

test.describe('home hero slider layout at phone width', () => {
  test.use({ viewport: MOBILE });

  test('no slide leaves more than 48 px of unused space below its content (390)', async ({ page }) => {
    await open(page, pageByRoute('/'));
    const dots = page.locator('[data-hs-dot]');
    for (let i = 0; i < 4; i++) {
      await dots.nth(i).click();
      await expect.poll(() => activeIndex(page)).toBe(i);
      await page.waitForTimeout(450);
      expect(await unusedBelow(page), `unused space below the content on slide ${i + 1}`).toBeLessThanOrEqual(48);
    }
  });
});
