import { getCollection, type CollectionEntry } from 'astro:content';
import { publishedBlogPosts } from '../../../lib/blogPosts';

export type BlogEntry = CollectionEntry<'blog'>;

/** All published Blog posts, newest first (drafts left out: src/lib/blogPosts.ts). */
export async function allBlogPosts(): Promise<BlogEntry[]> {
  return publishedBlogPosts(await getCollection('blog'));
}

/** The author's team profile, when the author is on the team: the byline links to it and uses the role the profile shows (WP165). */
export async function authorProfile(name: string): Promise<{ path: string; role: string } | undefined> {
  const member = (await getCollection('team')).find((t) => t.data.name === name);
  return member ? { path: `/about/team/${member.id}/`, role: member.data.role } : undefined;
}
