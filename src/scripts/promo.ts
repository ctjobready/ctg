/** Dismissible PromoBar, remembered in localStorage (all storage access guarded). */
const bar = document.querySelector<HTMLElement>('[data-promo]');
if (bar) {
  const key = bar.dataset.promoKey ?? 'ct-promo-v1';
  const root = document.documentElement;
  try {
    if (localStorage.getItem(key)) root.setAttribute('data-promo', 'off');
  } catch {
    /* storage unavailable — bar stays visible */
  }
  bar.querySelector('[data-promo-close]')?.addEventListener('click', () => {
    root.setAttribute('data-promo', 'off');
    try {
      localStorage.setItem(key, '1');
    } catch {
      /* ignore */
    }
    document.getElementById('main')?.focus?.();
  });
}
