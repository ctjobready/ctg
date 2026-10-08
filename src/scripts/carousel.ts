import { prefersReducedMotion } from './util';

/** M14 — scroll-snap carousel controls: prev/next, dots (widen when active), keyboard. No autoplay. */
document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]');
  if (!track) return;
  const slides = Array.from(track.children) as HTMLElement[];
  if (!slides.length) return;

  const prev = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
  const dotsWrap = root.querySelector<HTMLElement>('[data-carousel-dots]');
  root.classList.add('is-ready');

  slides.forEach((s, i) => {
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'slide');
    s.setAttribute('aria-label', `${i + 1} of ${slides.length}`);
  });

  let dots: HTMLButtonElement[] = [];
  if (dotsWrap) {
    dotsWrap.replaceChildren();
    dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'dot';
      b.setAttribute('aria-label', `Go to slide ${i + 1}`);
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
      return b;
    });
  }

  const behavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');
  const goTo = (i: number) => {
    const idx = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: slides[idx].offsetLeft - track.offsetLeft, behavior: behavior() });
  };
  const current = () => {
    const x = track.scrollLeft + track.offsetLeft;
    let best = 0;
    let dist = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.offsetLeft - x);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    return best;
  };

  const sync = () => {
    const i = current();
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    // The track has padding, so the first slide snaps at scrollLeft = its offset (4px), not at 0: "at the start" means at
    // or before that snap position (2px of rounding slack), the same position goTo(0) scrolls to.
    const atStart = track.scrollLeft <= slides[0].offsetLeft - track.offsetLeft + 2;
    const active = atEnd ? slides.length - 1 : i;
    dots.forEach((d, n) => {
      const on = n === active;
      d.classList.toggle('is-active', on);
      // aria-current needs a value: a bare attribute (toggleAttribute) is aria-current="" which assistive technology treats as false
      if (on) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    if (prev) prev.disabled = atStart;
    if (next) next.disabled = atEnd;
  };

  prev?.addEventListener('click', () => goTo(current() - 1));
  next?.addEventListener('click', () => goTo(current() + 1));
  track.addEventListener('keydown', (e) => {
    if (e.target !== track) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(current() + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(current() - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(slides.length - 1);
    }
  });
  let raf = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(sync);
  }, { passive: true });
  addEventListener('resize', sync, { passive: true });
  sync();
});
