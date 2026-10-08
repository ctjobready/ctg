import { getCollection, type CollectionEntry } from 'astro:content';

export type NewsEntry = CollectionEntry<'news'>;

/** Topic labels (planning/02 §2). Keys match the `topic` enum in src/content.config.ts. */
export const TOPICS: Record<NewsEntry['data']['topic'], string> = {
  partnerships: 'Partnerships & MoUs',
  recognition: 'Recognition',
  'programs-events': 'Programs & events',
  'leadership-advocacy': 'Leadership & advocacy',
  insights: 'Insights',
};
export const TOPIC_KEYS = Object.keys(TOPICS) as NewsEntry['data']['topic'][];

/** All published news, newest first. */
export async function allNews(): Promise<NewsEntry[]> {
  const posts = await getCollection('news', (e) => !e.data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Related posts: same topic first, then the most recent others. */
export function relatedNews(all: NewsEntry[], post: NewsEntry, count = 3): NewsEntry[] {
  const others = all.filter((p) => p.id !== post.id);
  const same = others.filter((p) => p.data.topic === post.data.topic);
  const rest = others.filter((p) => p.data.topic !== post.data.topic);
  return [...same, ...rest].slice(0, count);
}

/** Posts that mention a person (title or body), newest first. Used for "related news" on team profiles. */
export function newsMentioning(all: NewsEntry[], name: string, count = 3): NewsEntry[] {
  const needle = name.replace(/^(Md\.|Mr\.|Dr\.)\s+/i, '').toLowerCase();
  return all.filter((p) => `${p.data.title}\n${p.body ?? ''}`.toLowerCase().includes(needle)).slice(0, count);
}

export const newsHref = (post: NewsEntry) => `/news/${post.id}/`;

/**
 * Alt text for a cover image. Migrated alt texts such as "…: photo 2 of 3" or "…: cover image" describe
 * nothing, so those covers are treated as decorative (empty alt); real descriptions pass through.
 */
export function coverAlt(alt: string): string {
  return /(: (photo \d+ of \d+|cover image)$)|^Photo from the news story/i.test(alt) ? '' : alt;
}

/** True when the cover image is also embedded in the body (the hero would repeat it). */
export function coverDuplicatesBody(post: NewsEntry): boolean {
  const src = post.data.cover?.src;
  if (!src) return false;
  const file = decodeURIComponent(src.split('?')[0].split('/').pop() ?? '').split('.')[0];
  return file.length > 2 && (post.body ?? '').includes(file);
}
