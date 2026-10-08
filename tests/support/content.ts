/**
 * Browser-side probe for the no-JS spec (self-contained: runs inside page.evaluate()).
 * Reports whether the page content is rendered in its final state: main visible, nothing left hidden by a reveal class,
 * every stat showing its final value, and no JS-only control left visible (dead controls).
 */
export interface ContentReport {
  jsClass: boolean;
  mainVisible: boolean;
  mainText: number;
  h1Visible: number;
  revealCount: number;
  hiddenReveals: string[];
  statCount: number;
  countupCount: number;
  wrongCountups: { where: string; actual: string; expected: string; hasTwin: boolean }[];
  emptyStats: string[];
  links: number;
  /** Visible controls that only work with JavaScript. */
  deadControls: string[];
}

export function contentProbe(): ContentReport {
  const describe = (el: Element) => {
    const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls}`;
  };
  const visible = (el: Element) => {
    const cs = getComputedStyle(el);
    return el.getClientRects().length > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0;
  };
  const main = document.querySelector('main');
  const hiddenReveals = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    .filter((el) => {
      const cs = getComputedStyle(el);
      const m = cs.transform === 'none' ? new DOMMatrixReadOnly() : new DOMMatrixReadOnly(cs.transform);
      return parseFloat(cs.opacity) < 1 || cs.visibility === 'hidden' || Math.abs(m.m42) > 0.01;
    })
    .map((el) => `${describe(el)} opacity=${getComputedStyle(el).opacity}`);
  const countups = Array.from(document.querySelectorAll<HTMLElement>('[data-countup]'));
  const wrongCountups = countups
    .map((el) => {
      const twin = el.nextElementSibling;
      return { where: describe(el), actual: (el.textContent ?? '').trim(), expected: (twin?.textContent ?? '').trim(), hasTwin: !!twin?.classList.contains('sr-only') };
    })
    .filter((c) => !c.hasTwin || c.actual !== c.expected || c.actual === '');
  const emptyStats = Array.from(document.querySelectorAll('.stat__num'))
    .filter((el) => (el.textContent ?? '').trim() === '')
    .map(describe);
  const deadSelectors = ['[data-promo-close]', '[data-backtotop]', '[data-drawer-open]', '[data-carousel-prev]', '[data-carousel-next]', '[data-carousel-dots] button', '[data-marquee-toggle]', '[data-copy]'];
  const deadControls = Array.from(document.querySelectorAll(deadSelectors.join(',')))
    .filter(visible)
    .map((el) => `${describe(el)} [${deadSelectors.find((s) => el.matches(s)) ?? ''}]`);
  return {
    jsClass: document.documentElement.classList.contains('js'),
    mainVisible: !!main && visible(main),
    mainText: (main?.innerText ?? '').trim().length,
    h1Visible: Array.from(document.querySelectorAll('h1')).filter(visible).length,
    revealCount: document.querySelectorAll('[data-reveal]').length,
    hiddenReveals,
    statCount: document.querySelectorAll('.stat').length,
    countupCount: countups.length,
    wrongCountups,
    emptyStats,
    links: Array.from(document.querySelectorAll('a[href]')).filter(visible).length,
    deadControls,
  };
}
