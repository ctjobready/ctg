/** Site-wide constants (identity, contacts, social). Single place to edit. */

/** Canonical production origin — canonical URLs and JSON-LD always use it, even on staging. */
export const PRODUCTION_ORIGIN = 'https://coderstrust.global';

export const SITE_NAME = 'CodersTrust';
export const SITE_TAGLINE = 'Learn. Earn. Prosper.';
export const COPYRIGHT_YEAR = 2026;

/** ID-01 entity definition (planning/05) — use verbatim on Home, About and in schema. */
export const ENTITY_DEFINITION =
  'CodersTrust is a workforce-development organization that turns educated, unemployed youth in emerging markets into job-ready digital professionals — and connects them to local, remote and global work.';

export const CONTACT = {
  email: 'contact@coderstrust.global',
  phone: '+1 212 344 4111',
  phoneHref: 'tel:+12123444111',
} as const;

export const OFFICES = [
  {
    id: 'usa',
    name: 'CT USA, Inc.',
    city: 'New York',
    address: ['40 Wall Street, Suite 2004', 'New York, NY 10005, USA'],
    email: 'contact@coderstrust.global',
    phone: '+1 212 344 4111',
    phoneHref: 'tel:+12123444111',
  },
  {
    id: 'bangladesh',
    name: 'CodersTrust Bangladesh',
    city: 'Dhaka',
    address: ['BSCIC Electronics Complex, Level 4, Mirpur (11 No Bus Stand)', 'Dhaka 1216, Bangladesh'],
    email: 'hello@coderstrustbd.com',
    phone: '+880 1958-220802',
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
 * limited to the click-to-load video providers.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://i.ytimg.com",
  "font-src 'self'",
  "connect-src 'self'",
  'frame-src https://www.youtube-nocookie.com https://player.vimeo.com',
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
  phone: '+880 1958-220802',
  email: 'hello@coderstrustbd.com',
} as const;

/** 1200-px PNG wordmark for schema.org logo (public/press-kit). */
export const LOGO_PNG_PATH = '/press-kit/coderstrust-wordmark.png';
