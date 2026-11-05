import { getCollection, type CollectionEntry } from 'astro:content';
import { publishedBlogPosts } from '../../../lib/blogPosts';

export type BlogEntry = CollectionEntry<'blog'>;

/** All published Blog posts, newest first (drafts left out: src/lib/blogPosts.ts). */
export async function allBlogPosts(): Promise<BlogEntry[]> {
  return publishedBlogPosts(await getCollection('blog'));
}

/**
 * WP165 follow-up (owner, 5 November 2026): true while at least one Blog post is live. With none, the Blog has no page (/blog/ is not built) and no link:
 * the header, drawer, no-JS nav and footer (src/data/nav.ts topLinksFor / footerBottomLinksFor) and llms.txt leave it out.
 */
export async function hasLiveBlogPosts(): Promise<boolean> {
  return (await allBlogPosts()).length > 0;
}

/** The author's team profile, when the author is on the team: the byline links to it and uses the role the profile shows (WP165). */
export async function authorProfile(name: string): Promise<{ path: string; role: string } | undefined> {
  const member = (await getCollection('team')).find((t) => t.data.name === name);
  return member ? { path: `/about/team/${member.id}/`, role: member.data.role } : undefined;
}
