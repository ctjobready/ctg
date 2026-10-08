import { focusables } from './util';

/** Mobile drawer: modal <dialog>, explicit focus trap, scroll lock, Esc/close/route-change handling. */
const dlg = document.querySelector<HTMLDialogElement>('[data-drawer]');
const openers = Array.from(document.querySelectorAll<HTMLElement>('[data-drawer-open]'));

if (dlg && openers.length && typeof dlg.showModal === 'function') {
  let opener: HTMLElement | null = null;
  const root = document.documentElement;

  const setExpanded = (v: boolean) => openers.forEach((o) => o.setAttribute('aria-expanded', String(v)));

  const open = (from: HTMLElement) => {
    opener = from;
    dlg.showModal();
    root.classList.add('is-locked');
    setExpanded(true);
    (dlg.querySelector<HTMLElement>('[data-drawer-close]') ?? focusables(dlg)[0])?.focus();
  };
  const close = () => {
    if (dlg.open) dlg.close();
  };

  openers.forEach((o) => o.addEventListener('click', () => open(o)));
  dlg.querySelectorAll('[data-drawer-close]').forEach((b) => b.addEventListener('click', close));

  // Native close (Esc, dialog.close()) — restore state and focus.
  dlg.addEventListener('close', () => {
    root.classList.remove('is-locked');
    setExpanded(false);
    opener?.focus();
  });

  // Click on the backdrop closes.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });

  // Following any link closes the drawer (same-page anchors keep the page, others navigate).
  dlg.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a[href]')) close();
  });

  // Focus trap: wrap Tab / Shift+Tab inside the dialog.
  dlg.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = focusables(dlg);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !dlg.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !dlg.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  });

  // Desktop width or bfcache restore: make sure nothing stays locked.
  matchMedia('(min-width: 1024px)').addEventListener('change', (m) => m.matches && close());
  addEventListener('pageshow', () => {
    if (!dlg.open) root.classList.remove('is-locked');
  });
  addEventListener('pagehide', close);
}
