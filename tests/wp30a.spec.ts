import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP30a behaviors (design system: vertical spacing and sub-section headings, all inside the original design system, DESIGN.md).
 * Each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp30a.spec.ts --project=chromium`):
 *  - spacing uses the system's tokens only: xs 4, sm 8, md 16, gutter 20, lg 32, the 12px compact step and the section values (40 on a phone
 *    up to 80), and two bands on the same ground never sit further apart than one band plus the 32px join;
 *  - headings use the system's weights: H1 700, H2 600, card and small headings (heading-l, heading-m) 500; a sub-section heading is
 *    promoted to heading-xl (28/36/600) instead of getting a new weight;
 *  - the definition band and the FAQ band use the width (heading beside the text on a wide screen), and stack on a phone.
 */

// The main page types: Home, hub, audience page, program page, evidence pages, About, Contact, longform.
const PAGES = ['', 'partner-with-us/', 'partner-with-us/governments/', 'programs/youthwide/', 'impact/', 'impact/outcomes-2026/', 'about/', 'contact/', 'programs/', 'our-model/'];

/** Band paddings and neighbours as the browser lays them out. */
async function bands(page: Page) {
  return page.evaluate(() => {
    const out: { id: string; pt: number; pb: number; top: number; bottom: number; bg: string; none: boolean }[] = [];
    for (const b of Array.from(document.querySelectorAll('main section.band')) as HTMLElement[]) {
      const r = b.getBoundingClientRect();
      if (r.height === 0) continue;
      const cs = getComputedStyle(b);
      out.push({
        id: b.id || b.className,
        pt: parseFloat(cs.paddingTop),
        pb: parseFloat(cs.paddingBottom),
        top: Math.round(r.top + scrollY),
        bottom: Math.round(r.bottom + scrollY),
        bg: cs.backgroundColor,
        none: b.classList.contains('band--pad-none'),
      });
    }
    return out;
  });
}

for (const vp of [DESKTOP, MOBILE]) {
  test.describe(`spacing at ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('the spacing tokens are the system values, and the section padding stays inside the system range (40 to 80)', async ({ page }) => {
      await open(page, '');
      const t = await page.evaluate(() => {
        const read = (n: string) => {
          const probe = document.createElement('div');
          probe.style.cssText = `position:absolute;visibility:hidden;width:var(${n})`;
          document.body.appendChild(probe);
          const w = probe.getBoundingClientRect().width;
          probe.remove();
          return Math.round(w * 10) / 10;
        };
        return {
          scale: ['--space-xs', '--space-sm', '--space-md', '--space-gutter', '--space-lg', '--space-section-mobile', '--space-section-desktop'].map(read),
          ext: ['--space-compact', '--space-xl', '--band-join', '--stack-eyebrow', '--stack-heading', '--stack-title', '--stack-header', '--stack-link', '--card-pad', '--grid-gap'].map(read),
          band: read('--band-pad'),
          bandSm: read('--band-pad-sm'),
          bandLg: read('--band-pad-lg'),
        };
      });
      expect(t.scale).toEqual([4, 8, 16, 20, 32, 40, 70]); // DESIGN.md: xs, sm, md, gutter, lg, section-mobile, section-desktop
      expect(t.ext).toEqual([12, 40, 32, 8, 12, 8, 32, 16, 20, 20]);
      expect(t.band).toBeGreaterThanOrEqual(40);
      expect(t.band).toBeLessThanOrEqual(80);
      expect(t.bandSm).toBeLessThan(t.band);
      expect(t.bandLg).toBeLessThanOrEqual(80);
      expect(t.bandLg).toBeGreaterThanOrEqual(t.band);
      if (vp.width >= 1200) expect(t.band).toBeGreaterThanOrEqual(70);
      else expect(t.band).toBe(40);
    });

    for (const p of PAGES) {
      test(`${p || 'Home'}: band padding stays in the system range, and bands on the same ground sit at most 112px apart`, async ({ page }) => {
        await open(page, p);
        const bs = await bands(page);
        expect(bs.length).toBeGreaterThan(0);
        for (const b of bs) {
          for (const v of [b.pt, b.pb]) {
            expect(v, `${b.id}: padding ${v}`).toBeGreaterThanOrEqual(0);
            expect(v, `${b.id}: padding ${v}`).toBeLessThanOrEqual(80.5);
          }
        }
        for (let i = 1; i < bs.length; i++) {
          const a = bs[i - 1];
          const b = bs[i];
          if (Math.abs(a.bottom - b.top) > 2 || a.bg !== b.bg) continue; // not touching, or a visible edge between them
          if (a.none || b.none) continue; // a deliberate zero-padding join
          expect(a.pb + b.pt, `${a.id} then ${b.id}: padding between two bands on the same ground`).toBeLessThanOrEqual(112.5);
        }
      });
    }
  });
}

test.describe('headings use the system weights', () => {
  test.use({ viewport: DESKTOP });

  for (const p of PAGES) {
    test(`${p || 'Home'}: H1 is 700, section H2 is 600, no heading is lighter than 500`, async ({ page }) => {
      await open(page, p);
      const bad = await page.evaluate(() => {
        const out: string[] = [];
        for (const h of Array.from(document.querySelectorAll('main h1, main h2, main h3, main h4'))) {
          const r = h.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          const w = Number(getComputedStyle(h).fontWeight);
          const small = h.matches('.pn__title'); // the "On This Page" label is a heading-m navigation label
          const min = h.tagName === 'H1' ? 700 : h.tagName === 'H2' && !small ? 600 : 500;
          if (w < min) out.push(`${h.tagName.toLowerCase()}.${(h.className || '').toString().slice(0, 40)} = ${w}: ${(h.textContent || '').trim().slice(0, 40)}`);
        }
        return out;
      });
      expect(bad, bad.join('\n')).toEqual([]);
    });
  }

  test('sub-section headings are heading-xl (28px, 600) and card titles keep heading-l (500)', async ({ page }) => {
    const read = async (path: string, sel: string) => {
      await open(page, path);
      return page.evaluate((q) => Array.from(document.querySelectorAll(q)).filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => ({ w: Number(getComputedStyle(e).fontWeight), s: parseFloat(getComputedStyle(e).fontSize) })), sel);
    };
    const groups = await read('impact/', 'h3.glance__group-title'); // "Trial Results, Predecessor Program" and its siblings
    const panels = await read('partner-with-us/', 'h3.rc__h'); // "What Your Monthly Report Covers"
    const outcomes = await read('impact/outcomes-2026/', 'h3.ro__group'); // "Earnings and Work"
    const inShort = await read('partner-with-us/governments/', 'h2.is__title');
    const cards = await read('contact/', 'h3.card__title');
    for (const [label, list] of Object.entries({ groups, panels, outcomes, inShort })) {
      expect(list.length, label).toBeGreaterThan(0);
      for (const x of list) {
        expect(x.w, label).toBe(600);
        expect(x.s, label).toBeGreaterThanOrEqual(27.5); // heading-xl at 1280: 28px
      }
    }
    expect(cards.length).toBeGreaterThan(0);
    for (const x of cards) expect(x.w).toBe(500); // heading-l
  });

  test('heading order reads by size: section H2 is larger than a card H3 (Impact)', async ({ page }) => {
    await open(page, 'impact/');
    const sizes = await page.evaluate(() => {
      const max = (sel: string) => Math.max(...Array.from(document.querySelectorAll(sel)).map((e) => parseFloat(getComputedStyle(e).fontSize)));
      return { h2: max('main h2.sh__title'), h3: max('main h3.card__title') };
    });
    expect(sizes.h2).toBeGreaterThan(sizes.h3);
  });
});

test.describe('the page uses its width', () => {
  test('desktop: the definition question sits beside its answer; the FAQ heading sits beside the questions', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, '');
    const def = await page.evaluate(() => {
      const t = document.querySelector('#definition .def__title')!.getBoundingClientRect();
      const x = document.querySelector('#definition .def__text')!.getBoundingClientRect();
      return { titleRight: t.right, textLeft: x.left, titleTop: t.top, textTop: x.top };
    });
    expect(def.titleRight).toBeLessThanOrEqual(def.textLeft);
    expect(Math.abs(def.titleTop - def.textTop)).toBeLessThan(24);
    const faq = await page.evaluate(() => {
      const h = document.querySelector('#faq .sh')!.getBoundingClientRect();
      const a = document.querySelector('#faq .faq')!.getBoundingClientRect();
      return { headerRight: h.right, listLeft: a.left, listWidth: a.width, container: document.querySelector('#faq .container')!.getBoundingClientRect().width };
    });
    expect(faq.headerRight).toBeLessThanOrEqual(faq.listLeft + 1);
    expect(faq.listWidth).toBeGreaterThan(faq.container * 0.5);
  });

  test('phone: the definition and the FAQ stack (heading above the text) and nothing scrolls sideways', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, '');
    const m = await page.evaluate(() => {
      const t = document.querySelector('#definition .def__title')!.getBoundingClientRect();
      const x = document.querySelector('#definition .def__text')!.getBoundingClientRect();
      const h = document.querySelector('#faq .sh')!.getBoundingClientRect();
      const a = document.querySelector('#faq .faq')!.getBoundingClientRect();
      return { defStacked: x.top >= t.bottom - 1, faqStacked: a.top >= h.bottom - 1, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    expect(m.defStacked).toBe(true);
    expect(m.faqStacked).toBe(true);
    expect(m.overflow).toBeLessThanOrEqual(0);
  });

  for (const p of PAGES) {
    test(`${p || 'Home'}: no horizontal scroll at 390px`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await open(page, p);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    });
  }
});
