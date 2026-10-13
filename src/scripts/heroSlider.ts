/**
 * Home hero slider (WP13; markup in src/components/sections/HeroSlider.astro).
 *
 * Rules (WCAG 2.2 AA, WAI-ARIA Authoring Practices carousel):
 *   - the slide changes every STEP_MS, and only while the visitor wants it (the Pause control), no hover or focus is inside the region,
 *     the tab is visible, and prefers-reduced-motion is not set (no autoplay under reduced motion; the control is hidden then);
 *   - hovering the region or having keyboard focus inside it pauses the rotation until they leave;
 *   - a visitor's own choice (previous, next, a slide picker, the arrow keys on the controls) stops the rotation for good: it does not
 *     restart on hover or focus. The Play control restarts it on the visitor's explicit request;
 *   - the slides that are not showing leave the accessibility tree and the tab order (`inert`, and `visibility: hidden` in CSS);
 *   - the region announces slide changes (aria-live polite) only while it is not rotating (aria-live off while it rotates).
 * Without this script the markup shows every slide stacked and has no controls (the `is-ready` class is what switches the carousel on).
 */

const STEP_MS = 7000;

function setup(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-hs-track]');
  const slides = Array.from(root.querySelectorAll<HTMLElement>('[data-hs-slide]'));
  if (!track || slides.length < 2) return;
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-hs-dot]'));
  const prev = root.querySelector<HTMLButtonElement>('[data-hs-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-hs-next]');
  const bar = root.querySelector<HTMLElement>('[data-hs-bar]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-hs-toggle]');
  const toggleLabel = root.querySelector<HTMLElement>('[data-hs-toggle-label]');
  const pauseIcon = root.querySelector<HTMLElement>('[data-hs-icon="pause"]');
  const playIcon = root.querySelector<HTMLElement>('[data-hs-icon="play"]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let index = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
  let wanted = !reduced.matches; // the visitor wants the slides to rotate
  let hovered = false;
  let focused = false;
  let timer: number | undefined;

  const rotating = (): boolean => wanted && !hovered && !focused && !document.hidden && !reduced.matches;

  function show(i: number): void {
    index = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      const on = n === index;
      s.classList.toggle('is-active', on);
      s.toggleAttribute('inert', !on);
    });
    dots.forEach((d, n) => {
      if (n === index) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  }

  /** Re-derives the timer, the live region and the Pause/Play control from the current state. */
  function sync(): void {
    window.clearInterval(timer);
    timer = undefined;
    if (rotating()) timer = window.setInterval(() => show(index + 1), STEP_MS);
    track!.setAttribute('aria-live', timer === undefined ? 'polite' : 'off');
    if (toggleLabel) toggleLabel.textContent = wanted ? 'Pause' : 'Play';
    pauseIcon?.toggleAttribute('hidden', !wanted);
    playIcon?.toggleAttribute('hidden', wanted);
  }

  /** The visitor chose a slide by hand: show it and stop the rotation for good (the Play control can restart it). */
  function choose(i: number): void {
    wanted = false;
    show(i);
    sync();
  }

  prev?.addEventListener('click', () => choose(index - 1));
  next?.addEventListener('click', () => choose(index + 1));
  dots.forEach((d, n) => d.addEventListener('click', () => choose(n)));
  bar?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      choose(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      choose(index + 1);
    }
  });

  toggle?.addEventListener('click', () => {
    wanted = !wanted;
    sync();
  });

  root.addEventListener('pointerenter', () => {
    hovered = true;
    sync();
  });
  root.addEventListener('pointerleave', () => {
    hovered = false;
    sync();
  });
  root.addEventListener('focusin', () => {
    focused = true;
    sync();
  });
  root.addEventListener('focusout', (e) => {
    focused = root.contains((e as FocusEvent).relatedTarget as Node | null);
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => {
    wanted = !reduced.matches;
    if (toggle) toggle.hidden = reduced.matches;
    sync();
  });

  if (toggle) toggle.hidden = reduced.matches;
  show(index);
  root.classList.add('is-ready');
  sync();
}

document.querySelectorAll<HTMLElement>('[data-hero-slider]').forEach(setup);
