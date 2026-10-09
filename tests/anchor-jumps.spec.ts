import { expect, test, type Page } from '@playwright/test';
import { VIEWPORTS, attachJson, open, vpLabel } from './support/browser';
import { inspectTarget } from './support/focus';
import { pageByRoute } from './support/pages';

/**
 * Anchor jumps land in one scroll (review round 15, N6). On the three long evidence pages (Outcomes 2026, the independent evaluation and
 * TalentLEAP) a visitor follows footnote markers down to the Notes list, back-links up to the marker, and the "On this page" links. Each
 * jump must put the target's top edge fully in view, below the sticky header, on the FIRST scroll: no second scroll and no landing short
 * or long once the layout settles. A band that skips rendering while offscreen (content-visibility: auto, the opt-in `defer` on
 * src/components/ui/Section.astro) can leave the first scroll at an estimated position, which is what this spec would catch.
 *
 * Per page and viewport (390x844 and 1280x800), under smooth scrolling (the default) and under reduced motion (instant scrolling):
 *   - footnote markers: the first, a middle and the last; each is followed from a freshly loaded page, then its back-link in the note it
 *     reached is followed (the jump back up);
 *   - "On this page" links: the first, a middle and the last, each from a freshly loaded page.
 * A jump passes when, after it comes to rest, (1) the target's top is at or below the sticky header's height and its first line is inside
 * the viewport, (2) nothing sticky or fixed covers it (tests/support/focus.ts), (3) it landed where the page's scroll offsets put it
 * (scroll-padding-top + scroll-margin-top below the viewport's top) unless the end of the page stopped the scroll, and (4) nothing scrolls
 * again afterwards (a second scroll is a scroll event after the jump has been still for 350 ms).
 */
const PAGES = ['/impact/outcomes-2026/', '/impact/independent-evaluation/', '/our-model/talentleap/'];
const MOTION = [
  { id: 'smooth scrolling', reducedMotion: 'no-preference' as const },
  { id: 'reduced motion', reducedMotion: 'reduce' as const },
];
/** How far the landing position may differ from the offsets the page asks for, in CSS pixels. */
const LANDING_TOLERANCE = 48;

interface Link {
  /** Selector for the link itself. */
  selector: string;
  /** id of the element the link points to. */
  target: string;
  label: string;
}
interface Marker extends Link {
  /** The note's back-link to this marker. */
  back: Link;
  /** On screen when the page loads (false: inside a closed FAQ answer, which only the back-link can reach). */
  shown: boolean;
}
interface Measure {
  found: boolean;
  top: number;
  headerHeight: number;
  innerHeight: number;
  scrollY: number;
  maxScroll: number;
  /** scroll-padding-top of the root plus scroll-margin-top of the target. */
  expectedTop: number;
  scrolled: boolean;
  secondScroll: boolean;
}

/** First, a middle and the last of a list (deduplicated). */
const pick = <T>(items: T[]): T[] => [...new Set([items[0], items[Math.floor(items.length / 2)], items[items.length - 1]])].filter((x) => x !== undefined);

/** Every footnote marker (with its note's back-link) and the visible "On this page" links of the page that is open, in page order. */
async function collect(page: Page): Promise<{ markers: Marker[]; toc: Link[] }> {
  return page.evaluate(() => {
    // On screen now: a closed <details> (a FAQ answer) keeps boxes for its content but shows none of it
    const visible = (el: Element) => {
      const closed = el.closest('details:not([open])');
      return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden' && (!closed || Boolean(el.closest('summary')));
    };
    const label = (el: Element) => (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    const markers = Array.from(document.querySelectorAll<HTMLAnchorElement>('sup.fn > a[id^="fn-ref-"]'))
      .flatMap((a) => {
        const noteId = a.getAttribute('href')?.slice(1) ?? '';
        const backLink = document.querySelector<HTMLAnchorElement>(`#${CSS.escape(noteId)} .sources__back a[href="#${CSS.escape(a.id)}"]`);
        if (!noteId || !backLink || !document.getElementById(noteId)) return [];
        return [
          {
            selector: `#${CSS.escape(a.id)}`,
            target: noteId,
            label: `marker ${a.id} (${label(a)})`,
            shown: visible(a),
            back: { selector: `#${CSS.escape(noteId)} .sources__back a[href="#${CSS.escape(a.id)}"]`, target: a.id, label: `back-link of ${a.id}` },
          },
        ];
      });
    const toc = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc] nav a[href^="#"]'))
      .filter(visible)
      .map((a) => ({ selector: `[data-toc] nav a[href="${a.getAttribute('href')}"]`, target: decodeURIComponent(a.hash.slice(1)), label: `table of contents "${label(a)}"` }));
    return { markers, toc };
  });
}

/** Follow one link from where the page is, like a visitor: bring it into view, click it, and measure where the jump ended. */
async function follow(page: Page, link: Link): Promise<Measure> {
  await page.evaluate((selector) => {
    // instant, so the click itself starts from a known position (the site scrolls smoothly otherwise)
    document.querySelector(selector)?.scrollIntoView({ block: 'center', behavior: 'instant' });
    const log = { last: performance.now(), moves: 0 };
    (window as unknown as { __jump: typeof log }).__jump = log;
    window.addEventListener('scroll', () => {
      log.last = performance.now();
      log.moves++;
    }, { passive: true });
  }, link.selector);
  // let the instant scroll's own event and the header's reaction pass before the click is the thing being measured
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    const log = (window as unknown as { __jump: { last: number; moves: number } }).__jump;
    log.last = performance.now();
    log.moves = 0;
  });
  await page.locator(link.selector).first().click();
  return page.evaluate(async (id) => {
    const log = (window as unknown as { __jump: { last: number; moves: number } }).__jump;
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const started = performance.now();
    // 1. the first jump comes to rest: it scrolled and then nothing moved for 350 ms (or it never needed to scroll)
    for (;;) {
      await frame();
      const now = performance.now();
      if (log.moves > 0 && now - log.last >= 350) break;
      if (log.moves === 0 && now - started >= 1500) break;
      if (now - started >= 9000) break;
    }
    const movesAtRest = log.moves;
    // 2. a correction after the layout has settled would be a second scroll
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    await frame();
    const target = document.getElementById(id);
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const headerHeight = header ? Math.round(header.getBoundingClientRect().height) : 0;
    const scrollY = Math.round(window.scrollY);
    const maxScroll = Math.round(document.documentElement.scrollHeight - window.innerHeight);
    if (!target) return { found: false, top: 0, headerHeight, innerHeight: window.innerHeight, scrollY, maxScroll, expectedTop: 0, scrolled: log.moves > 0, secondScroll: false };
    const expectedTop = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + parseFloat(getComputedStyle(target).scrollMarginTop);
    return {
      found: true,
      top: Math.round(target.getBoundingClientRect().top),
      headerHeight,
      innerHeight: window.innerHeight,
      scrollY,
      maxScroll,
      expectedTop: Math.round(expectedTop),
      scrolled: movesAtRest > 0,
      secondScroll: log.moves !== movesAtRest,
    };
  }, link.target);
}

/** What is wrong with one jump, as sentences (empty = the jump passed). */
async function judge(page: Page, link: Link, m: Measure): Promise<string[]> {
  const out: string[] = [];
  const where = `${link.label} -> #${link.target}`;
  if (!m.found) return [`${where}: the target element does not exist`];
  if (m.top < m.headerHeight - 1) out.push(`${where}: the target's top is ${m.top}px, under the ${m.headerHeight}px sticky header (scrollY ${m.scrollY} of ${m.maxScroll})`);
  if (m.top + 24 > m.innerHeight) out.push(`${where}: the target's top is ${m.top}px, too low to read its first line in a ${m.innerHeight}px viewport (scrollY ${m.scrollY} of ${m.maxScroll})`);
  const endOfPage = m.scrollY >= m.maxScroll - 2;
  if (!endOfPage && Math.abs(m.top - m.expectedTop) > LANDING_TOLERANCE) {
    out.push(`${where}: landed with the target ${m.top}px from the top, expected about ${m.expectedTop}px (scroll-padding plus scroll-margin); scrollY ${m.scrollY} of ${m.maxScroll}`);
  }
  if (m.secondScroll) out.push(`${where}: the page scrolled again after the jump had come to rest (a second scroll)`);
  const cover = await inspectTarget(page, `#${link.target}`);
  if (cover.coveredBy) out.push(`${where}: the target's top-left is covered by ${cover.coveredBy}`);
  if (cover.centerCoveredBy) out.push(`${where}: the centre of the target is covered by ${cover.centerCoveredBy}`);
  return out;
}

for (const vp of VIEWPORTS) {
  for (const motion of MOTION) {
    test.describe(`anchor jumps land in one scroll, ${vpLabel(vp)}, ${motion.id}`, () => {
      test.use({ viewport: vp, reducedMotion: motion.reducedMotion });

      for (const route of PAGES) {
        test(`${route}: footnote markers, back-links and "On this page" links`, async ({ page }, testInfo) => {
          test.setTimeout(240_000);
          const target = pageByRoute(route);
          await open(page, target);
          const { markers, toc } = await collect(page);
          const shown = markers.filter((m) => m.shown);
          expect(shown.length, `footnote markers on screen, with a note and a back-link, on ${route}`).toBeGreaterThanOrEqual(3);
          expect(toc.length, `"On this page" links on ${route}`).toBeGreaterThanOrEqual(3);

          const problems: string[] = [];
          const jumps: string[] = [];
          const record = (link: Link, m: Measure) => jumps.push(`${link.label}: top ${m.top}px, expected ${m.expectedTop}px, scrollY ${m.scrollY}/${m.maxScroll}`);
          for (const marker of pick(shown)) {
            await open(page, target); // a fresh page: this is the first jump
            let m = await follow(page, marker);
            problems.push(...(await judge(page, marker, m)));
            record(marker, m);
            // and back up, from the note it reached
            m = await follow(page, marker.back);
            problems.push(...(await judge(page, marker.back, m)));
            record(marker.back, m);
          }
          // The last marker on the page can sit in a closed FAQ answer: it cannot be clicked, but its back-link must still bring it into view
          const last = markers[markers.length - 1];
          if (!last.shown) {
            await open(page, target);
            const m = await follow(page, last.back);
            problems.push(...(await judge(page, last.back, m)));
            record(last.back, m);
          }
          for (const link of pick(toc)) {
            await open(page, target);
            const m = await follow(page, link);
            problems.push(...(await judge(page, link, m)));
            jumps.push(`${link.label}: top ${m.top}px, expected ${m.expectedTop}px, scrollY ${m.scrollY}/${m.maxScroll}`);
          }
          await attachJson(testInfo, 'anchor-jumps', { route, viewport: vpLabel(vp), motion: motion.id, markers: markers.length, toc: toc.length, jumps });
          expect(problems, `jumps followed: ${jumps.length}`).toEqual([]);
        });
      }
    });
  }
}
