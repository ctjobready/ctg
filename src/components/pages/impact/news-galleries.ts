import type { ImageMetadata } from 'astro';
import { allNews } from '../news/news';
import type { Photo } from '../../../data/photos';
import { FIELD_NEWS_LABEL, FIELD_NEWS_PHOTOS } from '../../../data/fieldNews';

/**
 * The news photographs for /impact/in-the-field/news-photos/ (the News Photo Archive), by year of the post. Moved out of the In the Field page
 * (WP20d) so that page holds only the program, partner and recognition collections. Alt text comes from src/data/fieldNews.ts; the caption is the
 * event label plus the month and year of the post (or the entry's own caption), and the asset id is the post's (D13).
 */
export interface NewsYear {
  label: string;
  id: string;
  photos: Photo[];
}

const files = import.meta.glob<{ default: ImageMetadata }>('../../../assets/images/news/**/*.{jpg,png}', { eager: true });

export async function newsGalleries(): Promise<NewsYear[]> {
  const posts = (await allNews()).filter((p) => !p.data.political);
  const month = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const years = new Map<number, { date: number; photo: Photo }[]>();
  // The profile of Aziz Ahmad on his farm is a personal profile, not a program or event record, so its photographs are left out of the archive.
  const LEFT_OUT_POSTS = new Set(['the-man-behind-coderstrust-who-never-forgot-his-roots']);
  for (const post of posts) {
    if (LEFT_OUT_POSTS.has(post.id)) continue;
    const year = post.data.date.getUTCFullYear();
    // An event with three or more photographs keeps its first two in registry order, so near-duplicate shots do not crowd the archive.
    const entries = FIELD_NEWS_PHOTOS.filter((x) => x.slug === post.id);
    for (const e of entries.length >= 3 ? entries.slice(0, 2) : entries) {
      const img = files[`../../../assets/images/news/${post.id}/${e.file}`]?.default;
      if (!img) throw new Error(`news-galleries: missing image ${post.id}/${e.file}`);
      const list = years.get(year) ?? [];
      const caption = e.caption ?? `${FIELD_NEWS_LABEL[post.id] ?? post.data.title}, ${month.format(post.data.date)}`;
      list.push({ date: post.data.date.getTime(), photo: { src: img, alt: e.alt, assetId: `news-${post.id}`, caption } });
      years.set(year, list);
    }
  }
  // A year with a single photograph is joined to the next year, so every gallery holds at least two pictures.
  const byYear: NewsYear[] = [];
  let carry: { from: number; items: { date: number; photo: Photo }[] } | undefined;
  for (const [year, list] of [...years.entries()].sort((a, b) => a[0] - b[0])) {
    const items = [...(carry?.items ?? []), ...list];
    const from = carry?.from ?? year;
    if (items.length < 2) {
      carry = { from, items };
      continue;
    }
    const label = from === year ? String(year) : `${from}–${year}`;
    // Newest post first within a gallery, like the years themselves; photographs of one post keep their order (stable sort).
    byYear.push({ label, id: `news-${label.replace('–', '-')}`, photos: [...items].sort((x, y) => y.date - x.date).map((x) => x.photo) });
    carry = undefined;
  }
  byYear.reverse();
  return byYear;
}
