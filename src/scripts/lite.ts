/** LiteVideo facade: swap the poster link for a privacy-friendly YouTube (youtube-nocookie.com) iframe on click. */
document.querySelectorAll<HTMLElement>('[data-lite]').forEach((root) => {
  const trigger = root.querySelector<HTMLElement>('[data-lite-play]');
  if (!trigger) return;
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    const { id, title } = root.dataset;
    if (!id) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    iframe.title = title ?? 'Video';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.className = 'lite__frame';
    root.replaceChildren(iframe);
    iframe.focus();
  });
});
