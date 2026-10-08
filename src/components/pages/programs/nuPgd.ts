import { getCollection } from 'astro:content';
import { CTAS } from '../../../data/ctas';

/**
 * NU Postgraduate Diploma content, read from the `nu-pgd` collection (legacy-page content, NU sign-off pending).
 * The admissions fact set (duration, schedule, fee, eligibility, delivery mode, internship terms, award,
 * application route) is NOT approved, so none of those fields are ever read or rendered here: only titles,
 * module names, role titles and a few legacy FAQs are used. No `Offer` is ever emitted in JSON-LD.
 */
export interface NuCourse {
  slug: string;
  title: string;
  modules: string[];
  roles: string[];
  faqs: { q: string; a: string }[];
}

export const NU_PATH = '/nu-postgraduate-diploma/';
export const NU_NAME = 'National University Postgraduate Diploma';
/** Standalone Google Form (never embedded) and the secondary phone route, both from the CTA library. */
export const NU_APPLY = { label: CTAS['nu-pgd'].label, href: CTAS['nu-pgd'].href as string };
export const NU_CALL = CTAS['nu-pgd'].secondary as { label: string; href: string };

/** Legacy FAQ indexes that do not touch the unapproved admissions facts (duration, eligibility, mode, award, internship terms). */
const SAFE_FAQS: Record<string, number[]> = {
  'digital-marketing': [0, 1, 2],
  ict: [1, 2, 3, 5],
};

/** Short, claim-light summary per course, written from the module names. */
export const NU_COURSE_COPY: Record<string, { short: string; lead: string; description: string; topics: string[]; titleTag: string }> = {
  'digital-marketing': {
    short: 'Practical digital marketing: SEO, social media, advertising and analytics.',
    lead: 'Practical digital marketing skills, from SEO and social media to advertising and analytics, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in digital marketing, delivered by CodersTrust: SEO, social media, advertising and analytics.',
    topics: ['SEO and analytics', 'Social media marketing', 'E-commerce'],
    titleTag: 'NU PGD in Digital Marketing',
  },
  ict: {
    short: 'Practical ICT: programming, databases, networks, mobile and web development.',
    lead: 'Practical ICT skills, from programming and databases to networks, mobile apps and web design, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in ICT, delivered by CodersTrust: programming, databases, networks, mobile and web development.',
    topics: ['Programming and databases', 'Networks and troubleshooting', 'Mobile and web development'],
    titleTag: 'NU PGD in ICT',
  },
};

function list(body: string, heading: string): string[] {
  const block = body.split(/\n## /).find((s) => s.startsWith(heading));
  return block ? block.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()) : [];
}

export async function nuOverview() {
  const all = await getCollection('nuPgd');
  const overview = all.find((e) => e.data.kind === 'overview');
  if (!overview) throw new Error('nu-pgd overview entry missing');
  return overview;
}

export async function nuCourses(): Promise<NuCourse[]> {
  const all = await getCollection('nuPgd');
  return all
    .filter((e) => e.data.kind === 'course')
    .map((e) => {
      const keep = SAFE_FAQS[e.data.slug] ?? [];
      return {
        slug: e.data.slug,
        title: e.data.title,
        modules: (e.data.modules ?? []).map((m) => (/^Internship/i.test(m) ? 'Internship, project work and seminar' : m)),
        roles: list(e.body ?? '', 'Career opportunities'),
        faqs: (e.data.faqs ?? []).filter((_, i) => keep.includes(i)),
      };
    });
}

export async function nuUpcoming() {
  const all = await getCollection('nuPgd');
  return all.filter((e) => e.data.kind === 'upcoming').map((e) => ({ slug: e.data.slug, title: e.data.title.replace(/\s*\(upcoming\)\s*$/i, '') }));
}
