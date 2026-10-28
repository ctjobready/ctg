import { prefersReducedMotion } from './util';

/**
 * M19 — back-to-top with a scroll-progress ring.
 * WP101 (owner answer 2026-10-28, "Hide when idle"): the fixed button covers whatever is beneath it, so it is shown only while the reader
 * scrolls up, and only once past one viewport of scrolling (the show threshold). It hides again when the reader scrolls down, or after IDLE_MS
 * without a scroll (it waits while the pointer is on it). Two classes: `is-active` is past the threshold (the button can take focus, so a keyboard
 * reader who tabs to the end of the page reaches it; it stays unseen and untouchable until shown), `is-visible` is shown. While the button has focus,
 * CSS keeps it shown (BackToTop.astro). Under prefers-reduced-motion it has no transitions (CSS), and the page scroll is not smoothed here.
 */
const IDLE_MS = 2000;
const JITTER = 2; // px: a layout shift that nudges the scroll position up (scroll anchoring) is not the reader scrolling up
const btn = document.querySelector<HTMLButtonElement>('[data-backtotop]');
if (btn) {
  const ring = btn.querySelector<SVGCircleElement>('[data-ring]');
  const reduce = prefersReducedMotion();
  const C = 2 * Math.PI * 20; // r=20
  let ticking = false;
  let last = scrollY;
  let idle = 0;
  const hide = () => {
    clearTimeout(idle);
    btn.classList.remove('is-visible');
  };
  const armIdle = () => {
    clearTimeout(idle);
    idle = window.setTimeout(() => (btn.matches(':hover') ? armIdle() : btn.classList.remove('is-visible')), IDLE_MS);
  };
  const update = () => {
    ticking = false;
    const y = scrollY;
    const delta = y - last;
    last = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, y / max) : 0;
    const past = y > innerHeight;
    btn.classList.toggle('is-active', past);
    if (!past || delta > 0) hide();
    else if (delta < -JITTER) {
      btn.classList.add('is-visible');
      armIdle();
    }
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
