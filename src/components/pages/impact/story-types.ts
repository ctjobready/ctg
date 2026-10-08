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
}
