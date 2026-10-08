import { getCollection, type CollectionEntry } from 'astro:content';
import { TOPICS as TOPIC_LABELS } from '../../../data/newsTopics';

export type NewsEntry = CollectionEntry<'news'>;

/** Topic labels (planning/02 §2), shared with the Home news teaser (src/data/newsTopics.ts). Typed against the collection's `topic` enum, so a new topic must get a label. */
export const TOPICS: Record<NewsEntry['data']['topic'], string> = TOPIC_LABELS;
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

/**
 * The issuing body of the founder's SDG award (spelled both ways in the legacy posts). Evergreen pages never name it
 * (register PA-11), so a post whose headline does is never teased there; it stays under /news/.
 */
const ISSUER_ACRONYM = /\bUN(?:SG|GS)II\b/i;

/** Lowercase, accents and the Danish "æ" folded to plain letters, so "Kjaerulff" and "Kjærulff" match. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/æ/gi, 'ae').toLowerCase();

/** True when the post may be teased on an evergreen page: not political and not headlined by the award issuer's acronym. */
const teasable = (p: NewsEntry) => !p.data.political && !ISSUER_ACRONYM.test(`${p.data.title} ${p.data.excerpt}`);

/**
 * Posts whose headline (title or excerpt, the text a card shows) names a person, newest first. Used for "related news"
 * on team profiles, which are evergreen pages. A post that names the person only in passing in its body (another
 * person's honor that thanks a late co-founder, say) is not about them and is not shown; political posts and posts
 * headlined by the award issuer's acronym are skipped too.
 */
export function newsMentioning(all: NewsEntry[], name: string, count = 3): NewsEntry[] {
  const needle = fold(name.replace(/^(Md\.|Mr\.|Dr\.)\s+/i, ''));
  return all.filter((p) => teasable(p) && fold(`${p.data.title}\n${p.data.excerpt}`).includes(needle)).slice(0, count);
}

/** News for teasers on evergreen (non-/news/) pages: political posts and posts naming the award issuer are excluded. */
export function teasableNews(all: NewsEntry[]): NewsEntry[] {
  return all.filter(teasable);
}

export const newsHref = (post: NewsEntry) => `/news/${post.id}/`;

/**
 * Alt text for a cover image. Migrated alt texts such as "…: photo 2 of 3" or "…: cover image" describe
 * nothing, so those covers are treated as decorative (empty alt); real descriptions pass through.
 */
export function coverAlt(alt: string): string {
  return /(: (photo \d+ of \d+|cover image)$)|^Photo from the news story/i.test(alt) ? '' : alt;
}

/**
 * Alt text for the og:image / twitter:image of a post. The social image is never decorative, so the generic
 * migrated alts (which `coverAlt` empties) fall back to a plain description built from the headline.
 */
export function ogImageAlt(alt: string, title: string): string {
  return coverAlt(alt) || `Photo from the news story: ${title}`;
}

/** True when the cover image is also embedded in the body (the hero would repeat it). */
export function coverDuplicatesBody(post: NewsEntry): boolean {
  const src = post.data.cover?.src;
  if (!src) return false;
  const file = decodeURIComponent(src.split('?')[0].split('/').pop() ?? '').split('.')[0];
  return file.length > 2 && (post.body ?? '').includes(file);
}
