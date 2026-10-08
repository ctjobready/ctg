import { prefersReducedMotion } from './util';

/** M1 — fade + 16px rise, children entering together are staggered 60ms (CSS reads --reveal-i). */
const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
const nativeView = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()');

if (els.length) {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.style.setProperty('--reveal-i', String(Math.min(i++, 8)));
          el.classList.add('is-visible');
          io.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    for (const el of els) {
      // data-reveal="view" is handled by CSS scroll-driven animation where supported.
      if (nativeView && el.dataset.reveal === 'view') continue;
      io.observe(el);
    }
  }
}
