/** M10 — WAI-ARIA disclosure mega-menus. Enter/Space toggle (native button), Esc closes + returns focus. */
const items = Array.from(document.querySelectorAll<HTMLElement>('[data-mega]'));

if (items.length) {
  const triggers = items.map((li) => li.querySelector<HTMLButtonElement>('[data-mega-trigger]')!);
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let hoverTimer: number | undefined;

  const set = (li: HTMLElement, open: boolean) => {
    li.classList.toggle('is-open', open);
    li.querySelector('[data-mega-trigger]')?.setAttribute('aria-expanded', String(open));
  };
  const closeAll = (except?: HTMLElement) => items.forEach((li) => li !== except && set(li, false));

  items.forEach((li, idx) => {
    const trigger = triggers[idx];
    const links = () => Array.from(li.querySelectorAll<HTMLElement>('[data-mega-panel] a'));

    trigger.addEventListener('click', () => {
      const open = !li.classList.contains('is-open');
      closeAll(li);
      set(li, open);
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        closeAll(li);
        set(li, true);
        links()[0]?.focus();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const next = triggers[(idx + (e.key === 'ArrowRight' ? 1 : triggers.length - 1)) % triggers.length];
        if (next) {
          e.preventDefault();
          next.focus();
        }
      }
    });

    li.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && li.classList.contains('is-open')) {
        e.stopPropagation();
        set(li, false);
        trigger.focus();
      } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target !== trigger) {
        const l = links();
        const i = l.indexOf(e.target as HTMLElement);
        if (i === -1) return;
        e.preventDefault();
        l[(i + (e.key === 'ArrowDown' ? 1 : l.length - 1)) % l.length].focus();
      }
    });

    // Close when focus leaves the item.
    li.addEventListener('focusout', (e) => {
      const next = e.relatedTarget as Node | null;
      if (next && !li.contains(next)) set(li, false);
    });

    // Pointer hover (desktop mice only) — click/keyboard remain the accessible path.
    li.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !finePointer.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        closeAll(li);
        set(li, true);
      }, 90);
    });
    li.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || !finePointer.matches) return;
      clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        // keep open if keyboard focus is inside
        if (!li.contains(document.activeElement) || !li.matches(':focus-within')) set(li, false);
      }, 160);
    });
  });

  document.addEventListener('pointerdown', (e) => {
    if (!(e.target as Element).closest('[data-mega]')) closeAll();
  });
  addEventListener('pageshow', () => closeAll());
}
