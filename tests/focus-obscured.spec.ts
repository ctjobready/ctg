import { expect, test, type Page } from '@playwright/test';
import { VIEWPORTS, attachJson, open, vpLabel } from './support/browser';
import { inspectFocus, inspectTarget, type FocusStop, type TargetStop } from './support/focus';
import { pagesWithMarkup } from './support/pages';
import { templatePages } from './support/templates';

/**
 * Focus not obscured (WCAG 2.2 SC 2.4.11, planning doc 10 §3, doc 07 §9) on one page per template (home, partner landing,
 * program, evidence, case study, article, team, NU PGD, contact) at 390x844 and 1280x800, with the sticky header, the
 * PromoBar and the mobile CTA bar in place:
 *   1. Tab forward through up to 80 focus stops from the top of the page;
 *   2. Shift+Tab backwards through up to 40 stops from the last focusable element (footer, back-to-top);
 *   3. follow every in-page anchor, table-of-contents link and footnote marker/back link (up to 60 per page) with the keyboard.
 * At every stop the focused element (or the link target) must not be covered by sticky/fixed UI: see tests/support/focus.ts
 * for the exact rule (centre of the visible part hit-tests to sticky/fixed UI = failure). A second, softer group of
 * assertions checks that a focus indicator is drawn ("focus always visible", doc 10 §3).
 */
const FORWARD_STOPS = 80;
const BACKWARD_STOPS = 40;
const MAX_ANCHORS = 60;

const sig = (s: FocusStop): string => `${s.el}|${s.text}`;
const describeStop = (s: FocusStop, i: number): string =>
  `#${i + 1} ${s.el} "${s.text}" at scrollY=${s.scrollY}${s.centerCoveredBy ? ` — centre covered by ${s.centerCoveredBy}` : ''}${s.kind === 'offscreen' ? ' — not in the viewport' : ''}`;

async function walk(page: Page, key: 'Tab' | 'Shift+Tab', limit: number, startSig?: string): Promise<FocusStop[]> {
  const stops: FocusStop[] = [];
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press(key);
    const stop = await inspectFocus(page);
    if (stop.kind === 'none') break; // focus left the document
    if (startSig && stops.length > 3 && sig(stop) === startSig) break; // wrapped around
    stops.push(stop);
  }
  return stops;
}

function assertStops(stops: FocusStop[], where: string): void {
  const bad = stops.map((s, i) => ({ s, i })).filter(({ s }) => s.kind === 'obscured' || s.kind === 'offscreen');
  expect.soft(bad.map(({ s, i }) => describeStop(s, i)), `focused elements hidden behind sticky UI or outside the viewport ${where}`).toEqual([]);
  const noIndicator = stops.map((s, i) => ({ s, i })).filter(({ s }) => s.kind !== 'hidden-control' && s.el !== 'main#main' && !s.indicator);
  expect.soft(noIndicator.map(({ s, i }) => describeStop(s, i)), `focused elements with no visible focus outline ${where}`).toEqual([]);
}

for (const vp of VIEWPORTS) {
  test.describe(`focus not obscured ${vpLabel(vp)}`, () => {
    // Reduced motion: scrolling is instant (no smooth-scroll race) and the header never hides, which is the strictest case for 2.4.11.
    test.use({ viewport: vp, reducedMotion: 'reduce' });

    for (const t of templatePages()) {
      test(`${t.label} (${t.page.route}): Tab forward, up to ${FORWARD_STOPS} stops`, async ({ page }, testInfo) => {
        await open(page, t.page);
        const stops = await walk(page, 'Tab', FORWARD_STOPS);
        await attachJson(testInfo, 'focus-notes', {
          route: t.page.route,
          viewport: vpLabel(vp),
          direction: 'forward',
          stops: stops.length,
          partlyCovered: stops.filter((s) => s.partial.length).map((s) => `${s.el} "${s.text}": ${s.partial.join(', ')}`),
          otherOverlays: stops.filter((s) => s.otherOverlays.length).map((s) => `${s.el} "${s.text}": ${s.otherOverlays.join(', ')}`),
        });
        expect(stops.length, 'focus stops visited').toBeGreaterThanOrEqual(15);
        expect(stops[0].el, 'first stop is the skip link').toContain('skip-link');
        assertStops(stops, `(forward, ${stops.length} stops)`);
      });

      test(`${t.label} (${t.page.route}): Shift+Tab backwards from the end, up to ${BACKWARD_STOPS} stops`, async ({ page }, testInfo) => {
        await open(page, t.page);
        // Start at the last visible focusable element (footer link or the back-to-top button) and walk back up.
        await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
          const usable = all.filter((el) => !el.closest('[inert]') && !el.closest('dialog:not([open])') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
          usable[usable.length - 1]?.focus();
        });
        const start = await inspectFocus(page);
        const stops = [start, ...(await walk(page, 'Shift+Tab', BACKWARD_STOPS - 1))];
        await attachJson(testInfo, 'focus-notes', {
          route: t.page.route,
          viewport: vpLabel(vp),
          direction: 'backward',
          stops: stops.length,
          partlyCovered: stops.filter((s) => s.partial.length).map((s) => `${s.el} "${s.text}": ${s.partial.join(', ')}`),
          otherOverlays: stops.filter((s) => s.otherOverlays.length).map((s) => `${s.el} "${s.text}": ${s.otherOverlays.join(', ')}`),
        });
        expect(stops.length, 'focus stops visited').toBeGreaterThanOrEqual(10);
        assertStops(stops, `(backward from the end, ${stops.length} stops)`);
      });

      test(`${t.label} (${t.page.route}): in-page anchors, TOC and footnote links land clear of sticky UI`, async ({ page }, testInfo) => {
        await open(page, t.page);
        const links = await page.evaluate((limit) => {
          const seen = new Set<string>();
          const out: { hash: string; kind: string; text: string }[] = [];
          for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]'))) {
            if (a.classList.contains('skip-link')) continue;
            const sameDocument = (a.getAttribute('href') ?? '').startsWith('#') || (a.origin === location.origin && a.pathname === location.pathname);
            if (!sameDocument || a.hash.length < 2 || seen.has(a.hash) || a.getClientRects().length === 0) continue;
            seen.add(a.hash);
            const kind = a.closest('sup.fn') ? 'footnote marker' : a.closest('.sources__back') ? 'footnote back link' : a.closest('[data-toc]') ? 'table of contents' : 'anchor';
            out.push({ hash: a.hash, kind, text: (a.getAttribute('aria-label') ?? a.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40) });
            if (out.length >= limit) break;
          }
          return out;
        }, MAX_ANCHORS);
        await attachJson(testInfo, 'focus-notes', { route: t.page.route, viewport: vpLabel(vp), direction: 'anchors', anchorsFollowed: links.length });
        test.skip(links.length === 0, `no in-page links on ${t.page.route}`);

        const problems: string[] = [];
        for (const link of links) {
          const anchor = page.locator(`a[href$="${link.hash}"]`).first();
          await anchor.focus();
          await page.keyboard.press('Enter');
          const r: TargetStop = await inspectTarget(page, link.hash);
          const label = `${link.kind} "${link.text}" -> ${link.hash}`;
          if (!r.found) problems.push(`${label}: target element does not exist`);
          else {
            if (r.top < r.headerHeight - 1) problems.push(`${label}: target top is ${r.top}px, under the ${r.headerHeight}px sticky header (scrollY=${r.scrollY}/${r.maxScroll})`);
            if (r.coveredBy) problems.push(`${label}: target's top-left is covered by ${r.coveredBy}`);
            if (r.centerCoveredBy) problems.push(`${label}: centre of the target is covered by ${r.centerCoveredBy}`);
            if (r.focused) {
              const stop = await inspectFocus(page);
              if (stop.kind === 'obscured' || stop.kind === 'offscreen') problems.push(`${label}: focused target is hidden: ${describeStop(stop, 0)}`);
            }
          }
        }
        expect(problems, `anchors followed: ${links.length}`).toEqual([]);
      });
    }
  });
}

/**
 * Extra (beyond the brief): the focus ring of a link can only enclose the link if its box has a height. The footnote
 * markers are links inside a `line-height: 0` <sup>, so their boxes are 0px tall and the 2px outline collapses into a
 * thin strip across the superscript. One sweep over every page that has footnote markers, reported once per viewport.
 */
for (const vp of VIEWPORTS) {
  test(`focus ring can enclose every footnote marker (extra) ${vpLabel(vp)}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize(vp);
    const withMarkers = pagesWithMarkup(/<sup class="fn"/);
    expect(withMarkers.length, 'pages with footnote markers').toBeGreaterThan(0);
    const collapsed: string[] = [];
    for (const p of withMarkers) {
      await open(page, p);
      const heights = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('sup.fn a')).map((a) => Math.round(a.getBoundingClientRect().height)));
      const tooShort = heights.filter((h) => h < 10).length;
      if (tooShort) collapsed.push(`${p.route}: ${tooShort} of ${heights.length} markers have a ${Math.min(...heights)}px-tall box`);
    }
    expect(collapsed, 'footnote markers whose focus ring cannot enclose them (box height < 10px)').toEqual([]);
  });
}
