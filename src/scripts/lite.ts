/** LiteVideo facade: swap the poster link for a privacy-friendly iframe on click. */
document.querySelectorAll<HTMLElement>('[data-lite]').forEach((root) => {
  const trigger = root.querySelector<HTMLElement>('[data-lite-play]');
  if (!trigger) return;
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    const { provider, id, title } = root.dataset;
    if (!provider || !id) return;
    const src =
      provider === 'vimeo'
        ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&dnt=1`
        : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = title ?? 'Video';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.className = 'lite__frame';
    root.replaceChildren(iframe);
    iframe.focus();
  });
});
