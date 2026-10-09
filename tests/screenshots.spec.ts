import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { attachJson, fontsReady, open, quiet, scrollThrough, settleAnimations } from './support/browser';
import { QA_DIR } from './support/env';
import { screenshotPages } from './support/templates';

/**
 * Full-page screenshots of the core pages at 390, 768, 1200 and 1440 px for layout review (planning doc 10 §3):
 *   .work/qa/screens/<width>/<slug>.png
 * Opt-in (slow): SCREENS=1 npx playwright test tests/screenshots.spec.ts --project=chromium
 *
 * Chromium repeats the top of the page once a full-page capture is taller than ~16,384 px (texture limit), so tall pages
 * are captured in 8,000 px slices (fullPage + clip) and stitched with sharp, which ships with Astro (no new dependency).
 * If sharp cannot be loaded the slices are kept as <slug>.part-N.png instead.
 */
const WIDTHS = [390, 768, 1200, 1440];
const VIEWPORT_HEIGHT = 900;
const SLICE = 8000;
const SINGLE_SHOT_LIMIT = 12000;

/**
 * Make sure every image has loaded and is decoded. Lazy images inside horizontally scrolling carousels never come near the viewport
 * while scrolling vertically, so they are switched to eager loading first; the wait is bounded.
 *
 * "Loaded" is not "painted": the site's images use decoding="async", and a full-page capture rasterizes areas that were never
 * on screen. An image whose load event has fired can still be undecoded when the slice is taken, and then its card shows only the
 * empty tile behind it. That is what left the RemoteIntegrity card on /news/ blank in about half of the 1440 px captures (page
 * and image are fine: the same card paints in every capture once img.decode() has resolved, 10 of 10 runs). So every image is
 * decoded before the capture.
 */
async function imagesLoaded(page: Page): Promise<void> {
  await page.evaluate(async () => {
    for (const img of Array.from(document.images)) if (img.loading === 'lazy' && !img.complete) img.loading = 'eager';
    const loaded = Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            }),
      ),
    );
    await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 10_000))]);
    const decoded = Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => undefined)));
    await Promise.race([decoded, new Promise((resolve) => setTimeout(resolve, 10_000))]);
  });
}

if (!process.env.SCREENS) {
  test('screenshots are opt-in: run with SCREENS=1', () => {
    test.skip(true, 'set SCREENS=1 to capture the screenshots');
  });
} else {
  for (const width of WIDTHS) {
    test.describe(`screenshots ${width}`, () => {
      test.use({ viewport: { width, height: VIEWPORT_HEIGHT }, deviceScaleFactor: 1 });
      for (const { slug, page: p } of screenshotPages()) {
        test(slug, async ({ page }, testInfo) => {
          test.setTimeout(240_000);
          await open(page, p);
          await fontsReady(page);
          await scrollThrough(page);
          await quiet(page);
          await imagesLoaded(page);
          // Back at the top the mobile sticky CTA bar steps aside once its IntersectionObserver reports the hero CTA (stickycta.ts);
          // a full-page capture would otherwise paint the bar over the hero. Bounded wait, never asserted.
          await page
            .waitForFunction(() => {
              const bar = document.querySelector('.sticky-cta');
              return !bar || bar.hasAttribute('data-hidden') || getComputedStyle(bar).display === 'none';
            }, undefined, { timeout: 3000 })
            .catch(() => undefined);
          await settleAnimations(page);
          await page.waitForTimeout(500);
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          const file = join(QA_DIR, 'screens', String(width), `${slug}.png`);
          mkdirSync(dirname(file), { recursive: true });

          let slices = 1;
          if (height <= SINGLE_SHOT_LIMIT) {
            await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
          } else {
            const parts: Buffer[] = [];
            for (let y = 0; y < height; y += SLICE) {
              parts.push(await page.screenshot({ fullPage: true, animations: 'disabled', clip: { x: 0, y, width, height: Math.min(SLICE, height - y) } }));
            }
            slices = parts.length;
            try {
              const sharp = (await import('sharp')).default;
              await sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
                .composite(parts.map((input, i) => ({ input, top: i * SLICE, left: 0 })))
                .png()
                .toFile(file);
              const meta = await sharp(file).metadata();
              expect(meta.width, `${slug} @${width}: stitched width`).toBe(width);
              expect(meta.height, `${slug} @${width}: stitched height`).toBe(height);
            } catch (error) {
              if (error instanceof Error && /Cannot find|ERR_MODULE_NOT_FOUND/.test(error.message)) {
                const { writeFileSync } = await import('node:fs');
                parts.forEach((buffer, i) => writeFileSync(file.replace(/\.png$/, `.part-${i + 1}.png`), buffer));
              } else {
                throw error;
              }
            }
          }
          await attachJson(testInfo, 'screens', { slug, width, route: p.route, documentHeight: height, slices, file });
        });
      }
    });
  }
}
