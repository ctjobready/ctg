import { expect, test } from '@playwright/test';
import { DESKTOP, attachJson, open, scrollThrough } from './support/browser';
import { EPS_MS, globalMotionProbe, motionProbe, type MotionReport } from './support/motion';
import { listPages, pageByRoute } from './support/pages';

/**
 * Reduced motion (planning doc 10 §1, doc 07 §6): with `prefers-reduced-motion: reduce` there are no running CSS
 * animations or transitions longer than "0 ms" on the reveal, marquee and count-up elements, and every count-up shows its
 * final value immediately.
 *
 * "0 ms": the site's reset sets durations to 0.001ms (kept non-zero so animationend still fires). That finishes inside the
 * first frame, so anything at or below EPS_MS = 1 ms counts as off; anything longer, any infinite animation and any
 * scroll-driven animation counts as motion.
 *
 * Real selectors (src/components, src/scripts): [data-reveal] (BaseLayout/reveal.ts), [data-marquee] with .marquee__inner,
 * .marquee__clone and [data-marquee-toggle] (PartnerStrip.astro/marquee.ts), [data-countup] with its sr-only twin
 * (Stat.astro/countup.ts).
 */

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce', viewport: DESKTOP });

  for (const p of listPages()) {
    test(`${p.route}: reveal, marquee and count-up are static`, async ({ page }, testInfo) => {
      await open(page, p, 'domcontentloaded');
      // "Immediately": the DOM has just been parsed and the deferred scripts have run.
      const early = await page.evaluate(motionProbe, EPS_MS);
      await page.waitForLoadState('load');
      await scrollThrough(page);
      const late = await page.evaluate(motionProbe, EPS_MS);
      await attachJson(testInfo, 'motion-coverage', { route: p.route, reveal: late.reveal.total, marquees: late.marquee.roots, countups: late.countup.total });

      const check = (label: string, r: MotionReport) => {
        expect.soft(r.reveal.notVisible, `[data-reveal] elements not fully visible ${label}`).toEqual([]);
        expect.soft(r.reveal.moving, `[data-reveal] elements with a running or declared animation/transition > ${EPS_MS}ms ${label}`).toEqual([]);
        expect.soft(r.marquee.moving, `marquee elements with a running or declared animation/transition > ${EPS_MS}ms ${label}`).toEqual([]);
        expect.soft(r.marquee.pauseButtonsVisible, `marquee pause button must be hidden under reduced motion (M13) ${label}`).toEqual([]);
        expect.soft(r.marquee.cloneTracksVisible, `marquee duplicate track must be hidden under reduced motion ${label}`).toEqual([]);
        expect.soft(r.countup.wrong, `count-ups not showing their final value ${label}`).toEqual([]);
      };
      check('at DOMContentLoaded', early);
      check('after scrolling the whole page', late);
    });

    test(`${p.route}: nothing else animates either (sweep of all elements and a scroll-through)`, async ({ page }, testInfo) => {
      await open(page, p);
      const report = await page.evaluate(globalMotionProbe, EPS_MS);
      await attachJson(testInfo, 'motion-sweep', { route: p.route, elements: report.elements });
      expect.soft(report.declared, `${report.declaredTotal} element(s) declare an animation or transition longer than ${EPS_MS}ms under reduced motion`).toEqual([]);
      expect.soft(report.running, 'animations seen running while scrolling the page (scroll-driven animations included)').toEqual([]);
    });
  }
});

/**
 * Positive control: the same probes must see motion when motion is allowed, otherwise a green result above would prove
 * nothing. Home has hero drift, reveals, the logo marquee and count-ups.
 */
test.describe('reduced motion: control (motion allowed)', () => {
  test.use({ reducedMotion: 'no-preference', viewport: DESKTOP });

  test('home: the probes detect reveal, marquee and count-up motion', async ({ page }) => {
    await open(page, pageByRoute('/'), 'domcontentloaded');
    const early = await page.evaluate(motionProbe, EPS_MS);
    expect(early.countup.total, 'count-ups on home').toBeGreaterThan(0);
    expect(early.countup.wrong.length, 'count-ups start below their final value when motion is allowed').toBeGreaterThan(0);
    await page.waitForLoadState('load');
    const late = await page.evaluate(motionProbe, EPS_MS);
    expect(late.reveal.total, 'reveal elements on home').toBeGreaterThan(0);
    expect(late.reveal.moving.length, 'reveal animation detected').toBeGreaterThan(0);
    expect(late.marquee.roots, 'marquees on home').toBeGreaterThan(0);
    expect(late.marquee.moving.length, 'marquee animation detected').toBeGreaterThan(0);
    expect(late.marquee.pauseButtonsVisible.length, 'marquee pause button shown when motion is allowed').toBeGreaterThan(0);
    const sweep = await page.evaluate(globalMotionProbe, EPS_MS);
    expect(sweep.declaredTotal, 'declared animations/transitions detected').toBeGreaterThan(0);
    expect(sweep.running.length, 'running animations detected').toBeGreaterThan(0);
  });
});
