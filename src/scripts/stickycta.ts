/**
 * Mobile sticky CTA bar (rendered by LandingLayout). One solid primary per viewport region: the bar steps aside, and
 * leaves the tab order (inert), while the hero's primary CTA or an in-flow CTA band is in view, and shows everywhere
 * else. The bar is position: fixed and the body reserves its height, so toggling it shifts no layout; motion is a CSS
 * transition that reduced motion switches off. Without JavaScript the bar is not drawn (LandingLayout: html:not(.js)).
 */
export {}; // a module: keeps `bar` out of the global script scope shared with promo.ts

const bar = document.querySelector<HTMLElement>('.sticky-cta');
const targets = bar ? document.querySelectorAll('.hero__actions .btn--primary, #cta, .cta-band, [data-sticky-hide]') : [];

if (bar && (!targets.length || !('IntersectionObserver' in window))) {
  // Nothing to step aside for (or no observer support): show the bar (it stays up, as there is no CTA it could overlap).
  bar.setAttribute('data-ready', '');
} else if (bar) {
  const inView = new Set<Element>();
  const apply = () => {
    // Never pull the bar away from a keyboard user who is on it.
    const hide = inView.size > 0 && !bar.contains(document.activeElement);
    bar.toggleAttribute('data-hidden', hide);
    bar.toggleAttribute('inert', hide);
    bar.setAttribute('data-ready', '');
  };
  // The sticky header covers the top and the bar itself the bottom of the viewport; a CTA behind either is not "in view".
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) inView.add(e.target);
        else inView.delete(e.target);
      }
      apply();
    },
    { rootMargin: '-64px 0px -72px 0px' },
  );
  targets.forEach((t) => io.observe(t));
  bar.addEventListener('focusout', () => requestAnimationFrame(apply));
}
