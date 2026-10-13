import type { ImageMetadata } from 'astro';

export interface StoryCardData {
  key: string;
  outcome: string;
  name: string;
  role?: string;
  pathway: 'job' | 'freelance' | 'business' | 'other';
  image?: ImageMetadata;
  imageAlt?: string;
  /** D13: consent-dependent asset ID (named learners only). */
  assetId?: string;
  /** Per-card label for a result line that is an individual result ("Individual result; not typical"). The general caveat is stated once in the page intro. */
  caveat?: string;
  /** Three fields, only where the learner's story text supports all three. */
  steps?: { start: string; did: string; now: string };
}
