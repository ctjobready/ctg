/**
 * WP165 (owner request of 5 November 2026): a /blog/<post>/ re-post republishes an essay by Aziz Ahmad as he published it on Substack, with his
 * permission (its CodersTrust figures aligned with the register, his own wording otherwise kept), inside ONE element, <div … data-repost-body>
 * (src/pages/blog/[slug].astro; an essay written for the site has none, so the sweeps read all of it). The site-wide copy sweeps that hold
 * the site's own house style (no serial comma, American quotation punctuation, "Co-Founder and Chairman" for his title, ...) read a built page
 * through `withoutRepostBody`, which leaves out that element on a /blog/<post>/ page only: everything else on those pages (title, meta description,
 * subtitle, byline, cards, JSON-LD) and every other page, the /blog/ index included, are still swept. scripts/check-facts.mjs applies the same rule
 * to its wording checks (withoutRepostBody there). The essays' departures from the register are listed for the owner in the WP165 report.
 */
export const REPOST_PAGE = /^\/blog\/[^/]+\/$/;

/** The built HTML of a page without the essay element, when the route is a /blog/<post>/ page; any other page is returned unchanged. */
export function withoutRepostBody(route: string, html: string): string {
  if (!REPOST_PAGE.test(route)) return html;
  const open = /<div\b[^>]*\sdata-repost-body(?=[\s=/>])[^>]*>/.exec(html);
  if (!open) return html;
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = open.index;
  let depth = 0;
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(0, open.index) + html.slice(tag.lastIndex);
  }
  return html; // unbalanced markup: nothing is left out
}

/** The route of a built file under dist/ ("blog/x/index.html" -> "/blog/x/"), for sweeps that walk files rather than pages. */
export const routeOfDistFile = (relPath: string): string => {
  const rel = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  return rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
};
