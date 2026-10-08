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
    address: [] as string[],
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
