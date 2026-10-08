import { prefersReducedMotion } from './util';

/** M19 — back-to-top with a scroll-progress ring; visible after one viewport of scrolling. */
const btn = document.querySelector<HTMLButtonElement>('[data-backtotop]');
if (btn) {
  const ring = btn.querySelector<SVGCircleElement>('[data-ring]');
  const reduce = prefersReducedMotion();
  const C = 2 * Math.PI * 20; // r=20
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, scrollY / max) : 0;
    btn.classList.toggle('is-visible', scrollY > innerHeight);
    if (ring && !reduce) ring.style.strokeDashoffset = String(C * (1 - p));
  };
  addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  btn.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // Return focus to the top of the document for keyboard users.
    document.getElementById('main')?.focus?.({ preventScroll: true });
  });
  update();
}
