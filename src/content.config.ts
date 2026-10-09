import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';

/**
 * Content collections for the CodersTrust Global site (see planning/08-technical-architecture.md §4).
 *
 * Images in Markdown front matter are referenced with paths relative to the Markdown file
 * (for example `../../assets/images/news/<slug>/cover.jpg`) and validated with the `image()` helper.
 *
 * `mentors` is a JSON array loaded with `file()`. The `image()` helper is not available to `file()`
 * collections in a way that resolves paths relative to the JSON file, so `photo` is stored as a plain
 * path string relative to `src/content/` (for example `../assets/images/mentors/<id>.jpg`).
 * Resolve it at build time with `import.meta.glob('../assets/images/mentors/*.{jpg,png}')` (keyed by the
 * same relative path) and pass the result to `<Image />`.
 */

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      topic: z.enum(['partnerships', 'recognition', 'programs-events', 'leadership-advocacy', 'insights']),
      excerpt: z.string().max(180),
      cover: image().optional(),
      coverAlt: z.string(),
      /**
       * true when the post's first body image is a different crop of the cover photo (the same file needs no flag: it is detected). The
       * page then shows the cover once, as the hero, and drops the body image (src/lib/newsCover.mjs).
       */
      coverInBody: z.boolean().default(false),
      legacyUrl: z.string(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      /**
       * true when the title or excerpt names a minister, government official, politician or political slogan.
       * Such posts stay under /news/ but are never teased on evergreen pages (Home, team profiles, recognition).
       */
      political: z.boolean().default(false),
      /**
       * Optional page title (the <title>, og:title and twitter:title) for posts whose headline is too long to
       * read well in search results. Write it without " | CodersTrust" and without the site name: the layout
       * appends the suffix, and the whole title must stay within 60 characters (the build fails otherwise).
       * The H1 and the NewsArticle headline keep the full headline.
       */
      seoTitle: z.string().max(46).optional(),
    }),
});

const stories = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/stories' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      outcome: z.string().max(120),
      pathway: z.enum(['job', 'freelance', 'business', 'education', 'unknown']),
      program: z.string().optional(),
      role: z.string().optional(),
      photo: image().optional(),
      photoAlt: z.string().optional(),
      quote: z.string().optional(),
      videoUrl: z.string().url().optional(),
      legacyUrl: z.string().url().optional(),
      source: z.string(),
    }),
});

const team = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/team' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      slug: z.string(),
      role: z.string(),
      group: z.enum(['founders', 'advisors', 'executive', 'management']),
      order: z.number(),
      photo: image().optional(),
      photoAlt: z.string(),
      expertise: z.array(z.string()).default([]),
      linkedin: z.string().url().optional(),
      legacyUrl: z.string().url().optional(),
    }),
});

const mentors = defineCollection({
  loader: file('./src/content/mentors.json'),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    expertise: z.array(z.string()),
    /** Path string relative to `src/content/`; see the note at the top of this file. */
    photo: z.string(),
    photoAlt: z.string(),
    legacyUrl: z.string().url(),
  }),
});

const nuPgd = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/nu-pgd' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    kind: z.enum(['overview', 'course', 'upcoming']),
    duration: z.string().optional(),
    /** Exactly as published on the legacy site, for example "BDT 50,000". */
    fee: z.string().optional(),
    mode: z.string().optional(),
    applyUrl: z.string().url(),
    modules: z.array(z.string()).optional(),
    internship: z.string().optional(),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
    legacyUrl: z.string().url(),
    /** true while fee / duration still need to be confirmed with CodersTrust. */
    verify: z.boolean(),
  }),
});

export const collections = { news, stories, team, mentors, nuPgd };
