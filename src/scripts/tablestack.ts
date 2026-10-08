/**
 * Stacked data tables (layout in src/styles/utilities.css, "Stacked data tables"). Progressive enhancement for
 * wrappers marked `data-stack`:
 *  - at 640 px and below the table is laid out as cards (`display` changes), and WebKit drops table semantics when that
 *    happens, so the explicit ARIA table roles are added while the stacked layout is active and removed again above it;
 *  - the wrapper is keyboard-focusable (`tabindex="0"`, server-rendered) only while it actually scrolls sideways, so a
 *    table that fits (stacked or wide screens) adds no empty tab stop.
 * Without JavaScript the wrapper keeps its tab stop and Chrome/Firefox keep the table semantics.
 */
export {}; // a module: keeps these names out of the global script scope

const stacked = matchMedia('(max-width: 640px)');
const wrappers = Array.from(document.querySelectorAll<HTMLElement>('[data-stack]'));

const ROLE: Record<string, string> = { TABLE: 'table', THEAD: 'rowgroup', TBODY: 'rowgroup', TFOOT: 'rowgroup', TR: 'row', TH: 'columnheader', TD: 'cell' };
const roleOf = (el: Element) => (el.tagName === 'TH' && el.getAttribute('scope') === 'row' ? 'rowheader' : ROLE[el.tagName]);
const added = new WeakSet<Element>();

function syncRoles() {
  for (const w of wrappers) {
    for (const el of w.querySelectorAll('table, thead, tbody, tfoot, tr, th, td')) {
      if (stacked.matches) {
        if (!el.hasAttribute('role')) {
          el.setAttribute('role', roleOf(el));
          added.add(el);
        }
      } else if (added.has(el)) {
        el.removeAttribute('role');
        added.delete(el);
      }
    }
  }
}

function syncFocus(w: HTMLElement) {
  if (w.scrollWidth > w.clientWidth + 1) w.setAttribute('tabindex', '0');
  else w.removeAttribute('tabindex');
}

if (wrappers.length) {
  syncRoles();
  stacked.addEventListener('change', () => {
    syncRoles();
    wrappers.forEach(syncFocus);
  });
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver((entries) => entries.forEach((e) => syncFocus(e.target as HTMLElement)));
    wrappers.forEach((w) => ro.observe(w));
  } else {
    wrappers.forEach(syncFocus);
  }
}
