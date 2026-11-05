/**
 * WP165: the one filter every Blog surface uses (the /blog/ index, the /blog/<slug>/ pages, their "More Essays" list and llms.txt), so a
 * `draft: true` post is left out of all of them, and therefore out of the sitemap, exactly as a draft news post is. Plain module (no
 * astro:content import), so tests/wp165.spec.ts can run it on fixtures.
 */
export interface BlogPostLike {
  id: string;
  data: { title: string; date: Date; draft: boolean; repost: boolean; substackUrl?: string };
}

/** Published posts, newest first (ties: by title, so the order never depends on the file system). A re-post without its Substack URL fails the build. */
export function publishedBlogPosts<T extends BlogPostLike>(entries: readonly T[]): T[] {
  const live = entries.filter((e) => !e.data.draft);
  for (const e of live) if (e.data.repost && !e.data.substackUrl) throw new Error(`Blog post ${e.id}: a re-post needs its substackUrl in the front matter.`);
  return [...live].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf() || a.data.title.localeCompare(b.data.title));
}

export const blogHref = (post: { id: string }) => `/blog/${post.id}/`;

/** The other published posts for an article's "More Essays" list, newest first. */
export const otherBlogPosts = <T extends BlogPostLike>(published: readonly T[], post: { id: string }, count = 3): T[] => published.filter((p) => p.id !== post.id).slice(0, count);
