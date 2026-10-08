/** Highlights the table-of-contents entry for the section currently in view. */
const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]'));
if (links.length && 'IntersectionObserver' in window) {
  const map = new Map<string, HTMLAnchorElement>();
  links.forEach((a) => map.set(decodeURIComponent(a.hash.slice(1)), a));
  const targets = [...map.keys()].map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
  const set = (id: string) =>
    links.forEach((a) => {
      const on = decodeURIComponent(a.hash.slice(1)) === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  const io = new IntersectionObserver(
    (entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) set(vis[0].target.id);
    },
    { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
  );
  targets.forEach((t) => io.observe(t));
}
