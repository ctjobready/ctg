import { expect, test, type Page } from '@playwright/test';
import { VIEWPORTS, fontsReady, open, scrollThrough, settleAnimations, vpLabel } from './support/browser';
import { listPages } from './support/pages';

/**
 * Owner design rules: no coloured top-edge bar on a card (2026-10-15) and no coloured left-edge bar on boxes: callouts, cards, quotes, definition blocks and panels (2026-10-16, WP50). Boxes carry their 1 px outline or
 * shadow and their radius, nothing else. This spec reads the computed style of every element (and of its ::before and ::after) on EVERY built page at 1280 and 390 px, after scrolling the page through so that the reveals
 * and the active states are in place, and fails on an edge accent bar:
 *   - a left or top border of 2 px or more, with a colour that is not transparent, that is thicker than the opposite border (a bar is one-sided; the uniform white ring around the timeline and map dots is not a bar).
 * It applies to any element, not only to rounded or painted ones: the bars the owner objected to sat on quotes, definition blocks and data lines that had neither a radius nor a ground, and every such block is "a box" in the owner's words.
 * Allow-listed, by selector, is one navigation indicator that is not a box: the table of contents' active-section
 * marker (LongformLayout: `.lf-toc a`, transparent until the link is active). Retrospective coverage (the owner exempted this project from test-first work); run `npm run build` first.
 */
// Owner, 2026-10-21/22: no vertical bars beside nested links, so the menu and drawer sub-lists (.mega__sub, .drawer__sub) are no
// longer allow-listed; only the table of contents' active-section marker is.
const NAV_INDICATORS = ['.lf-toc a'];

/** Every edge accent bar on the page, as "<element> (<side> <width>px <colour>)". Runs in the page. */
async function accentBars(page: Page, allow: string[] = NAV_INDICATORS): Promise<string[]> {
  return page.evaluate((allowed) => {
    const transparent = (c: string) => c === 'transparent' || /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)$/.test(c);
    const label = (el: Element, pseudo: string) => {
      let s = el.tagName.toLowerCase();
      if (el.id) s += `#${el.id}`;
      if (el.classList.length) s += `.${Array.from(el.classList).slice(0, 3).join('.')}`;
      return s + pseudo;
    };
    const out: string[] = [];
    const check = (el: Element, cs: CSSStyleDeclaration, pseudo: string) => {
      for (const [side, opposite] of [['left', 'right'], ['top', 'bottom']] as const) {
        const width = parseFloat(cs.getPropertyValue(`border-${side}-width`));
        const style = cs.getPropertyValue(`border-${side}-style`);
        const colour = cs.getPropertyValue(`border-${side}-color`);
        const against = parseFloat(cs.getPropertyValue(`border-${opposite}-width`));
        if (width >= 2 && style !== 'none' && style !== 'hidden' && !transparent(colour) && width > against) out.push(`${label(el, pseudo)} (${side} ${width}px ${colour})`);
      }
    };
    for (const el of Array.from(document.querySelectorAll('*'))) {
      if (allowed.some((selector) => el.matches(selector))) continue;
      check(el, getComputedStyle(el), '');
      for (const pseudo of ['::before', '::after']) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.content !== 'none' && cs.content !== 'normal') check(el, cs, pseudo);
      }
    }
    return out;
  }, allow);
}

test.describe('the scan proves itself on fixtures before it judges the site', () => {
  test('it reports a rounded box, a plain text block and a top bar with an edge accent, and passes a uniform ring, a 1 px rule, a transparent marker and the allow-listed navigation indicators', async ({ page }) => {
    await open(page, '');
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'accent-fixtures';
      host.innerHTML = `
        <div id="f-box" style="border-radius:8px;background:#fff;padding:8px;border-left:4px solid rgb(6,101,223)">rounded box with a left bar</div>
        <p id="f-text" style="padding-left:8px;border-left:3px solid rgb(196,119,0)">plain text block with a left bar</p>
        <div id="f-top" style="border-radius:8px;border-top:4px solid rgb(0,47,167)">card with a top bar</div>
        <div id="f-inline" style="border-inline-start:4px solid rgb(6,101,223)">inline-start bar</div>
        <div id="f-ring" style="border-radius:50%;border:4px solid #fff">uniform ring</div>
        <div id="f-rule" style="border-left:1px solid rgb(6,101,223)">1 px rule</div>
        <div id="f-clear" style="border-radius:8px;border-left:4px solid transparent">transparent marker</div>
        <ul class="mega__sub" id="f-nav" style="border-left:2px solid rgb(210,229,254)"><li>nav divider</li></ul>
        <style>#f-pseudo::before{content:'';display:block;border-left:4px solid rgb(6,101,223)}</style>
        <div id="f-pseudo">pseudo-element bar</div>`;
      document.body.appendChild(host);
    });
    const found = await accentBars(page);
    const mine = found.filter((f) => /#f-/.test(f)).map((f) => f.replace(/\.[^ (]*/g, '').replace(/ \(.*/, '')).sort();
    // A sub-list divider beside nested links is now reported like any other bar (owner, 2026-10-21/22).
    expect(mine).toEqual(['div#f-box', 'div#f-inline', 'div#f-pseudo::before', 'div#f-top', 'p#f-text', 'ul#f-nav'].sort());
  });
});

for (const vp of VIEWPORTS) {
  test.describe(`no edge accent bars ${vpLabel(vp)}`, () => {
    test.use({ viewport: vp });
    for (const p of listPages()) {
      test(p.route, async ({ page }) => {
        await open(page, p.rel);
        await fontsReady(page);
        await scrollThrough(page);
        await settleAnimations(page);
        expect(await accentBars(page), `edge accent bars on ${p.route} at ${vpLabel(vp)}`).toEqual([]);
      });
    }
  });
}
