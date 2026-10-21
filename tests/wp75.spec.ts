import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact, facts } from '../src/data/facts';
import { UNDP_YES_TILE_LABEL } from '../src/components/pages/partners/partners';
import { programResultRows } from '../src/components/pages/impact/evidence';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP75 (Claude-ladder fixes). Retrospective coverage: the owner exempted this project from test-first work (WP24-common.md), so these tests were written after the changes.
 * Each one states an observable behavior of the register or of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp75.spec.ts --project=chromium`):
 *   - 1 (owner answer 2026-10-22: "350 enrolled, 97.5% completed"): UNDP YES, Korail's 350 is the number enrolled, not trained. PR-03 and PR-06 say "350 enrolled" and every rendering follows its single source:
 *     Home slide 4, the shared tile label of Development Partners and Foundations (UNDP_YES_TILE_LABEL), the Impact tile, the Case Studies hub card, the UNDP YES case study (figure, sentence, description,
 *     social descriptions, JSON-LD) and the program-results table data; no built page says "350 trained"; the longer word keeps the carousel's rows and its 48 px height budget at 1280 and 390;
 *   - 2: the Home "Results" carousel's four slide headings are h3s, children of the band's "Results" h2 (they were h2s, siblings of it), with the same text, classes and visual size (the styles are the
 *     `hs__title t-display-4xl` classes, not the element); the carousel is on Home alone, so no other page's outline changes, and Home's outline never skips a level.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

const HOME = '';
const DEV_PARTNERS = 'partner-with-us/development-partners/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const IMPACT = 'impact/';
const CASE_STUDIES = 'impact/case-studies/';
const UNDP_YES_CASE = 'impact/case-studies/undp-yes-korail/';

/** The measure of tests/hero-slider.spec.ts (budget 48 px): unused space between the showing slide's content and the controls bar. */
const unusedBelow = (page: Page) =>
  page.evaluate(() => {
    const active = document.querySelector('[data-hs-slide].is-active');
    const controls = document.querySelector('[data-hs-bar]');
    if (!active || !controls) return Number.NaN;
    const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
    const contentBottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom));
    return Math.round(controls.getBoundingClientRect().top - contentBottom);
  });

async function showSlide(page: Page, n: number) {
  await page.locator('[data-hs-dot]').nth(n - 1).click();
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')))).toBe(n - 1);
  await page.waitForTimeout(450);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP75 item 1: the register says the 350 were enrolled (owner answer 2026-10-22: "350 enrolled, 97.5% completed")', () => {
  test('PR-03 reads "2017: 350 enrolled; 97.5% completed the program; 67% of the 350 enrolled found their first job within three months", with its stat label and glance label to match', () => {
    const pr03 = fact('PR-03');
    expect(pr03.text.startsWith('UNDP YES (Youth Employment through Skills), Korail settlement, Dhaka, with UNDP, the Government of Bangladesh and Swanirvar Bangladesh, 2017: ')).toBe(true);
    expect(pr03.text.endsWith('2017: 350 enrolled; 97.5% completed the program; 67% of the 350 enrolled found their first job within three months')).toBe(true);
    expect(pr03.stat?.value).toBe('67%');
    expect(pr03.stat?.label).toBe('of the 350 enrolled found their first job within three months');
    expect(pr03.stat?.glance?.label).toBe('of the 350 enrolled in UNDP YES, Korail, found their first job within three months');
  });

  test('PR-06 states the same base: "... UNDP YES, Korail, Dhaka, 67% of the 350 enrolled found their first job within three months" (its tile wording names no base)', () => {
    const pr06 = fact('PR-06');
    expect(pr06.text.endsWith('UNDP YES, Korail, Dhaka, 67% of the 350 enrolled found their first job within three months')).toBe(true);
    expect(pr06.stat?.label).toBe('WSDFM 71% in work · Women in Online Work, Kosovo 68% in work · UNDP YES, Korail 67% found a first job within three months');
  });

  test('no register entry still calls the 350 "trained" (text, headline, stat label, detail, glance label or glance note)', () => {
    const offenders = Object.values(facts)
      .filter((f) => [f.text, f.headline, f.stat?.label, f.stat?.detail, f.stat?.glance?.label, f.stat?.glance?.note].some((s) => /\b350 trained\b/.test(s ?? '')))
      .map((f) => f.id);
    expect(offenders).toEqual([]);
  });

  test('the shared glance-tile label (Development Partners and Foundations) is PR-03’s glance label with its year, read from the register', () => {
    expect(UNDP_YES_TILE_LABEL).toBe('of the 350 enrolled in UNDP YES, Korail (2017), found their first job within three months');
  });

  test('the program-results table data (the component is not placed on a page now) reads the register: UNDP YES, Korail has 350 enrolled and 97.5% completed and no "trained" count; Her Power keeps its trained count', () => {
    const rows = programResultRows();
    const yes = rows.find((r) => r.id === 'PR-03');
    expect(yes?.enrolled).toBe('350');
    expect(yes?.completed).toBe('97.5%');
    expect(yes?.trained).toBeUndefined();
    expect(yes?.inWork).toBe('67% found a first job within three months');
    expect(rows.find((r) => r.id === 'PR-05')?.trained).toBe('2,500 directly by CodersTrust');
    expect(rows.find((r) => r.id === 'PR-05')?.enrolled).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP75 item 1: every page that states the figure says "enrolled"', () => {
  test('Home slide 4: "UNDP YES, Korail (2017): 67% of the 350 enrolled found a first job within three months." tied to PR-03 and PR-06', async ({ page }) => {
    await open(page, HOME);
    const line = slide(page, 4).locator('.hs__lines li').nth(2);
    await expect(line).toHaveText('UNDP YES, Korail (2017): 67% of the 350 enrolled found a first job within three months.');
    await expect(line).toHaveAttribute('data-fact', 'PR-03 PR-06');
    expect(compact(await page.locator('#results').textContent())).not.toContain('350 trained');
  });

  test('Development Partners and Foundations print the shared tile label; the Impact tile prints the register’s own glance label', async ({ page }) => {
    for (const route of [DEV_PARTNERS, FOUNDATIONS]) {
      await open(page, route);
      await expect(page.locator('#glance .pg__lead a[data-fact="PR-03"] .pg__desc'), route).toHaveText('of the 350 enrolled in UNDP YES, Korail (2017), found their first job within three months');
      await expect(page.locator('#glance .pg__lead a[data-fact="PR-03"] .pg__desc'), route).toHaveText(UNDP_YES_TILE_LABEL);
    }
    await open(page, IMPACT);
    await expect(page.locator('#glance a[data-fact~="PR-03"] .glance__desc')).toHaveText('of the 350 enrolled in UNDP YES, Korail, found their first job within three months');
  });

  test('the Case Studies hub card shows 67% with "of the 350 enrolled found their first job within three months"', async ({ page }) => {
    await open(page, CASE_STUDIES);
    const label = page.locator('.case__label', { hasText: 'found their first job within three months' });
    await expect(label).toHaveCount(1);
    await expect(label).toHaveText('of the 350 enrolled found their first job within three months');
  });

  test('the UNDP YES case study: the figure’s label and the program-results sentence say 350 enrolled, and so do its description, its social descriptions and its JSON-LD', async ({ page }) => {
    const DESCRIPTION = 'UNDP YES, a 2017 program with UNDP in Korail, Dhaka: 350 enrolled, 97.5% completed, 67% of the 350 enrolled found a first job within three months.';
    await open(page, UNDP_YES_CASE);
    expect(await page.locator('.factstat[data-fact="PR-03"] .stat__num').getAttribute('data-final')).toBe('67%');
    await expect(page.locator('.factstat[data-fact="PR-03"] .stat__label')).toHaveText('of the 350 enrolled found their first job within three months');
    await expect(page.locator('p.fact[data-fact="PR-03"]')).toContainText('2017: 350 enrolled; 97.5% completed the program; 67% of the 350 enrolled found their first job within three months');
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      expect(await page.locator(selector).getAttribute('content'), selector).toBe(DESCRIPTION);
    }
    const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
    expect(jsonLd).toContain(DESCRIPTION);
    expect(DESCRIPTION.length, 'meta description length (the SEO check warns above 155)').toBeLessThanOrEqual(155);
  });

  test('no built page says "350 trained"; wherever a page says "of the 350", it is "of the 350 enrolled"; the figure is still on the pages that state it', () => {
    const offenders: string[] = [];
    const stating: string[] = [];
    for (const p of listPages()) {
      const html = readFileSync(p.file, 'utf8');
      if (/\b350 trained\b/.test(html)) offenders.push(`${p.route}: "350 trained"`);
      for (const m of html.matchAll(/\bof the 350 (\w+)/g)) if (m[1] !== 'enrolled') offenders.push(`${p.route}: "${m[0]}"`);
      if (/\b350 enrolled\b/.test(html)) stating.push(p.route);
    }
    expect(offenders).toEqual([]);
    // not vacuous: the figure is on Home, the two funder pages, Impact, the case-study hub and the case study itself
    expect(stating).toEqual(expect.arrayContaining(['/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/', '/impact/', '/impact/case-studies/', '/impact/case-studies/undp-yes-korail/']));
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP75 item 1: the longer word keeps the carousel’s rows and its height budget', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test.describe(`at ${vp.width}px`, () => {
      test.use({ viewport: vp });

      test('slide 4: the UNDP YES line takes no more rows than the others allow, the Kosovo, WSDFM and Her Power lines stay on one row at 1280, no slide leaves more than 48 px unused, and nothing scrolls sideways', async ({ page }) => {
        await open(page, HOME);
        await scrollThrough(page);
        await showSlide(page, 4);
        const lines = await slide(page, 4)
          .locator('.hs__lines li')
          .evaluateAll((els) => els.map((e) => ({ height: Math.round(e.getBoundingClientRect().height * 10) / 10, lineHeight: parseFloat(getComputedStyle(e).lineHeight) })));
        expect(lines).toHaveLength(4);
        if (vp.width >= 1024) {
          // one row each for Kosovo (0), WSDFM (1) and Her Power (3); the UNDP YES line (2) wraps to a second row, as it did with "trained"
          expect(lines[1].height, 'WSDFM line is one row').toBe(lines[0].height);
          expect(lines[3].height, 'Her Power line is one row').toBe(lines[0].height);
          expect(Math.round((lines[2].height - lines[0].height) / lines[0].lineHeight), 'UNDP YES line takes at most one row more').toBeLessThanOrEqual(1);
        } else {
          // at phone width every line wraps; the UNDP YES line takes no more rows than the tallest of the others
          expect(lines[2].height, 'UNDP YES line takes no more rows than the others').toBeLessThanOrEqual(Math.max(lines[0].height, lines[1].height, lines[3].height));
        }
        for (let n = 1; n <= 4; n++) {
          await showSlide(page, n);
          const gap = await unusedBelow(page);
          expect(gap, `slide ${n} at ${vp.width}px: unused space below the content`).toBeLessThanOrEqual(48);
          expect(gap, `slide ${n} at ${vp.width}px: content must not run into the controls`).toBeGreaterThanOrEqual(0);
        }
        expect(await noOverflow(page), `horizontal overflow on Home at ${vp.width}px`).toBe(true);
      });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const TITLES = [
  'Women Offered a Place Earned an Estimated 41% More per Month',
  'Six Government Contracts and a National University Partnership',
  'Surveyed Completers Report Higher Income',
  'Results by Program',
];

/** Every heading of the document, in order, with its level, text and whether it sits in the Results band (the band's h2 and the carousel). */
const outlineOf = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({ level: Number(h.tagName[1]), text: (h.textContent ?? '').replace(/\s+/g, ' ').trim(), inBand: !!h.closest('.hs-shell') })),
  );

test.describe('WP75 item 2: the carousel’s slide headings are h3s under the band’s "Results" h2', () => {
  test.use({ viewport: DESKTOP });

  test('"Results" is an h2; the four slide headings that follow it are h3s with the same text; the next heading is an h2 again; the band holds no other heading', async ({ page }) => {
    await open(page, HOME);
    const outline = await outlineOf(page);
    const at = outline.findIndex((h) => h.inBand && h.text === 'Results');
    expect(at, 'the "Results" band heading').toBeGreaterThan(-1);
    expect(outline[at].level).toBe(2);
    expect(outline.slice(at + 1, at + 5)).toEqual(TITLES.map((text) => ({ level: 3, text, inBand: true })));
    expect(outline[at + 5].level, 'the heading after the carousel').toBe(2);
    expect(outline[at + 5].inBand).toBe(false);
    expect(outline.filter((h) => h.inBand).map((h) => h.level)).toEqual([2, 3, 3, 3, 3]);
    await expect(page.locator('#results h2')).toHaveCount(0);
    await expect(page.locator('#results-h')).toHaveText('Results');
    expect(await page.locator('#results-h').evaluate((h) => h.tagName)).toBe('H2');
  });

  test('Home’s outline never skips a level: one h1, then every heading is at most one level deeper than the one before it', async ({ page }) => {
    await open(page, HOME);
    const outline = await outlineOf(page);
    expect(outline.filter((h) => h.level === 1)).toHaveLength(1);
    expect(outline[0].level).toBe(1);
    const skips = outline.map((h, i) => (i > 0 && h.level > outline[i - 1].level + 1 ? `${outline[i - 1].level} → ${h.level}: ${h.text}` : '')).filter(Boolean);
    expect(skips).toEqual([]);
  });

  test('each slide’s title is one h3 keeping its classes and data-fact, and its slide label still names it', async ({ page }) => {
    await open(page, HOME);
    for (let n = 1; n <= 4; n++) {
      const heading = slide(page, n).locator('.hs__title');
      await expect(heading, `slide ${n}`).toHaveCount(1);
      expect(await heading.evaluate((h) => h.tagName), `slide ${n}`).toBe('H3');
      await expect(heading, `slide ${n}`).toHaveClass(/\bhs__title\b/);
      await expect(heading, `slide ${n}`).toHaveClass(/\bt-display-4xl\b/);
      await expect(heading, `slide ${n}`).toHaveText(TITLES[n - 1]);
      await expect(slide(page, n)).toHaveAttribute('aria-label', `${n} of 4: ${TITLES[n - 1]}`);
    }
    expect(await slide(page, 1).locator('.hs__title').getAttribute('data-fact')).toBe('RC-01');
    expect(await slide(page, 2).locator('.hs__title').getAttribute('data-fact')).toBe('GV-12');
    expect(await slide(page, 3).locator('.hs__title').getAttribute('data-fact')).toBe('OC-03');
    expect(await slide(page, 4).locator('.hs__title').getAttribute('data-fact')).toBeNull();
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px each slide title looks exactly as it did as an h2: the same type styles, spacing, position and box size as an h2 with the same classes in its place`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, HOME);
      for (let n = 1; n <= 4; n++) {
        await showSlide(page, n);
        // measure the h3, swap an h2 with the same classes and text into the same place, measure it, and put the h3 back
        const { asH3, asH2 } = await slide(page, n)
          .locator('.hs__title')
          .evaluate((h3) => {
            const props = ['fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'color', 'marginTop', 'marginBottom', 'maxWidth', 'textWrap', 'fontFamily', 'display', 'textAlign'] as const;
            const snapshot = (el: Element) => {
              const cs = getComputedStyle(el);
              const r = el.getBoundingClientRect();
              return { ...Object.fromEntries(props.map((p) => [p, cs[p]])), left: Math.round(r.left * 100) / 100, top: Math.round(r.top * 100) / 100, width: Math.round(r.width * 100) / 100, height: Math.round(r.height * 100) / 100 };
            };
            const asH3 = snapshot(h3);
            const former = document.createElement('h2');
            former.className = h3.className;
            former.textContent = h3.textContent;
            h3.replaceWith(former);
            const asH2 = snapshot(former);
            former.replaceWith(h3);
            return { asH3, asH2 };
          });
        expect(asH3, `slide ${n} at ${vp.width}px`).toEqual(asH2);
        expect(asH3.height, `slide ${n} at ${vp.width}px: the heading has a box`).toBeGreaterThan(0);
      }
    });
  }

  test('the carousel is on Home alone, so no other page’s outline changes: no other built page has a slide heading, and none has a slide heading as an h2', () => {
    const withSlides = listPages().filter((p) => /class="hs__title\b/.test(readFileSync(p.file, 'utf8'))).map((p) => p.route);
    expect(withSlides).toEqual(['/']);
    const asH2 = listPages().filter((p) => /<h2[^>]*class="[^"]*\bhs__title\b/.test(readFileSync(p.file, 'utf8'))).map((p) => p.route);
    expect(asH2).toEqual([]);
  });
});

test.describe('WP75 item 2: the outline does not depend on JavaScript', () => {
  test.use({ viewport: DESKTOP, javaScriptEnabled: false });

  test('without JavaScript the four slides stack, each with its h3 under the "Results" h2', async ({ page }) => {
    await open(page, HOME);
    const outline = await outlineOf(page);
    const at = outline.findIndex((h) => h.inBand && h.text === 'Results');
    expect(outline.slice(at, at + 5).map((h) => h.level)).toEqual([2, 3, 3, 3, 3]);
    expect(outline.slice(at + 1, at + 5).map((h) => h.text)).toEqual(TITLES);
  });
});
