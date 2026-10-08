import { prefersReducedMotion } from './util';

/**
 * M15 — details/summary height animation. Browsers with ::details-content + interpolate-size
 * animate in pure CSS; this is the fallback for the rest (Web Animations on the body wrapper).
 */
const native = typeof CSS !== 'undefined' && CSS.supports('selector(::details-content)');

if (!native && !prefersReducedMotion()) {
  document.querySelectorAll<HTMLDetailsElement>('details.acc').forEach((d) => {
    const summary = d.querySelector('summary');
    const body = d.querySelector<HTMLElement>('.acc__body');
    if (!summary || !body) return;
    let anim: Animation | null = null;

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      anim?.cancel();
      body.style.overflow = 'hidden';
      if (d.open) {
        anim = body.animate({ height: [`${body.offsetHeight}px`, '0px'] }, { duration: 200, easing: 'ease' });
        anim.onfinish = () => {
          d.open = false;
          body.style.overflow = '';
          anim = null;
        };
      } else {
        d.open = true;
        anim = body.animate({ height: ['0px', `${body.scrollHeight}px`] }, { duration: 200, easing: 'ease' });
        anim.onfinish = () => {
          body.style.overflow = '';
          anim = null;
        };
      }
    });
  });
}
