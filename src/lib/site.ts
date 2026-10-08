/** Site-wide constants (identity, contacts, social). Single place to edit. */
import { fact } from '../data/facts';

/** Canonical production origin — canonical URLs and JSON-LD always use it, even on staging. */
export const PRODUCTION_ORIGIN = 'https://coderstrust.global';

export const SITE_NAME = 'CodersTrust';
export const SITE_TAGLINE = 'Learn. Earn. Prosper.';
export const COPYRIGHT_YEAR = 2026;

/** ID-01 entity definition (facts register v1.2) — verbatim on Home, About and in schema; read from the facts dataset so it cannot drift. */
export const ENTITY_DEFINITION = fact('ID-01').text;

/**
 * Display form of a phone number: non-breaking spaces (U+00A0) and non-breaking hyphens (U+2011), so a number never
 * wraps mid-way (html-validate rule tel-non-breaking). Every number shown on a page comes from the `phone` fields
 * below; the `tel:` hrefs stay plain E.164. D-DIN has no U+2011 glyph, so the metric-matched Arial fallback draws it.
 */
export const nonBreaking = (s: string): string => s.replace(/ /g, ' ').replace(/-/g, '‑');
/** Plain form (ordinary spaces and hyphens) for structured data and plain-text output. */
export const plainPhone = (s: string): string => s.replace(/ /g, ' ').replace(/‑/g, '-');

export const CONTACT = {
  email: 'contact@coderstrust.global',
  phone: nonBreaking('+1 212 344 4111'),
  phoneHref: 'tel:+12123444111',
} as const;

export const OFFICES = [
  {
    id: 'usa',
    name: 'CT USA, Inc.',
    city: 'New York',
    address: ['40 Wall Street, Suite 2004', 'New York, NY 10005, USA'],
    email: 'contact@coderstrust.global',
    phone: nonBreaking('+1 212 344 4111'),
    phoneHref: 'tel:+12123444111',
  },
  {
    id: 'bangladesh',
    name: 'CodersTrust Bangladesh',
    city: 'Dhaka',
    address: ['BSCIC Electronics Complex, Level 4, Mirpur (11 No Bus Stand)', 'Dhaka 1216, Bangladesh'],
    email: 'hello@coderstrustbd.com',
    phone: nonBreaking('+880 1958-220802'),
    phoneHref: 'tel:+8801958220802',
  },
] as const;

export const SOCIAL = [
  { id: 'facebook', label: 'Facebook', href: 'https://www.facebook.com/coderstrustbangladesh' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/coderstrust-bangladesh' },
  { id: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@CodersTrustBangladesh' },
] as const;

export const FOUNDERS = [
  { name: 'Aziz Ahmad', url: '/about/team/aziz-ahmad/' },
  { name: 'Ferdinand Kjærulff', url: '/about/team/ferdinand-kjaerulff/' },
] as const;

export const COURSES_URL = 'https://jobready.global/';

/**
 * Content-Security-Policy (meta). Astro's built-in hashing CSP (security.csp) is not used because it
 * forbids inline style attributes (used for CSS custom properties on components) and `is:inline`
 * scripts. This policy still blocks third-party scripts, plugins and base-tag injection; frames are
 * limited to the click-to-load video provider (YouTube's privacy-enhanced domain; no page uses another video host).
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://www.youtube-nocookie.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

export const BANGLADESH_HQ = {
  name: 'CodersTrust Bangladesh',
  street: 'BSCIC Electronics Complex, Level 4, Mirpur (11 No Bus Stand)',
  city: 'Dhaka',
  postalCode: '1216',
  country: 'Bangladesh',
  countryCode: 'BD',
  phone: nonBreaking('+880 1958-220802'),
  email: 'hello@coderstrustbd.com',
} as const;

/**
 * CodersTrust Bangladesh HR address, as published on the legacy careers page. It is not a general contact address:
 * only the `careers` CTA (src/data/ctas.ts) and the Careers page use it.
 */
export const CAREERS_EMAIL = 'career@coderstrustbd.com';

/** 1200-px PNG wordmark for schema.org logo (public/press-kit). */
export const LOGO_PNG_PATH = '/press-kit/coderstrust-wordmark.png';
