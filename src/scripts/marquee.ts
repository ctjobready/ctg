/** M13 — pause/play control for logo marquees (WCAG 2.2.2). Hover/focus pause is CSS. */
document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((root) => {
  const btn = root.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
  if (!btn) return;
  btn.hidden = false;
  btn.addEventListener('click', () => {
    const paused = root.classList.toggle('is-paused');
    btn.setAttribute('aria-pressed', String(paused));
    btn.setAttribute('aria-label', paused ? 'Play logo animation' : 'Pause logo animation');
  });
});
