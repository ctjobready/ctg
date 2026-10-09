/**
 * In-page links that land inside a closed FAQ answer (a footnote back-link to a marker in an answer) must land in one scroll.
 * The browser opens the answer and scrolls to its target in the same step, but the answer's height animates (and so does the
 * answer it closes, in an exclusive group), so the layout the scroll was worked out on is not the layout that settles: the target
 * ends hundreds of pixels off, out of sight. While a link to a fragment of this page is being followed, the answers' height
 * animation is suspended (html[data-jumping], see details.acc::details-content in src/styles/utilities.css) and it resumes after.
 */
const FLAG = 'data-jumping';
let timer: number | undefined;

const suspend = (): void => {
  document.documentElement.setAttribute(FLAG, '');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => document.documentElement.removeAttribute(FLAG), 800);
};

// Capture phase: the flag is set before the click's default action (the fragment navigation) runs.
document.addEventListener(
  'click',
  (event) => {
    const link = (event.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
    if (link && link.hash.length > 1 && link.origin === location.origin && link.pathname === location.pathname) suspend();
  },
  true,
);
window.addEventListener('hashchange', suspend);
