import { prefersReducedMotion } from './util';

/** M9 — sticky header: shadow once scrolled; hides on scroll-down > 120px, reveals on scroll-up. */
const header = document.querySelector<HTMLElement>('[data-site-header]');

if (header) {
  let lastY = scrollY;
  let ticking = false;
  const reduce = prefersReducedMotion();

  const menuOpen = () => !!header.querySelector('[data-mega].is-open') || document.documentElement.classList.contains('is-locked');

  const update = () => {
    ticking = false;
    const y = Math.max(0, scrollY);
    header.classList.toggle('is-scrolled', y > 8);
    if (!reduce) {
      const delta = y - lastY;
      if (menuOpen() || header.querySelector(':focus-visible')) {
        header.classList.remove('is-hidden');
      } else if (delta > 4 && y > 120) {
        header.classList.add('is-hidden');
      } else if (delta < -4 || y <= 120) {
        header.classList.remove('is-hidden');
      }
    }
    lastY = y;
  };

  addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  update();
}
