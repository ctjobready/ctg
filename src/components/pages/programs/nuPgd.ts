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

export const NU_PATH = '/programs/nu-postgraduate-diploma/';
/** Schedule, intake and location are not in the published admissions facts; one wording on all three NU pages states who confirms them. */
export const NU_SCHEDULE_NOTE = 'Admissions confirms intake dates and schedule with each applicant.';
export const NU_LOCATION_NOTE = 'Admissions confirms the teaching location with each applicant.';
/** WP44 (cycle-21 review): the FAQ answer states the schedule and the location in one sentence (the rows keep NU_SCHEDULE_NOTE and NU_LOCATION_NOTE). */
export const NU_ADMISSIONS_NOTE = 'Admissions confirms intake dates, schedule and teaching location with each applicant.';
export const NU_NAME = 'National University Postgraduate Diploma';
/** WP21: one name for each NU track on every surface (menu, footer, <title>, H1, cards, breadcrumbs). Official module titles are untouched. */
export const NU_COURSE_NAME: Record<string, string> = {
  'digital-marketing': 'NU Postgraduate Diploma in Digital Marketing',
  ict: 'NU Postgraduate Diploma in ICT',
};
/** Standalone Google Form (never embedded) and the secondary phone route, both from the CTA library. */
export const NU_APPLY = { label: CTAS['nu-pgd'].label, href: CTAS['nu-pgd'].href as string };
export const NU_CALL = CTAS['nu-pgd'].secondary as { label: string; href: string };
/** The number in the call label ("Call to Enroll: +880 1958-220802"), for sentences that name it on their own. */
export const NU_CALL_NUMBER = NU_CALL.label.replace(/^[^:]*:\s*/, '');
/** "Call +880 1958-220802" as link text: a non-breaking space after "Call" keeps the whole phone link on one line (html-validate tel-non-breaking). */
export const NU_CALL_TEXT = NU_CALL.label;

/**
 * (Retired in WP20a: course pages now answer from their module names, see nuModuleFaqs; the legacy answers are generic and are no longer shown.)
 * Legacy FAQ indexes that describe the course itself. They exclude the unapproved admissions facts (duration, eligibility, mode, award,
 * internship terms) and every answer that promises an outcome or a service: the digital-marketing answers on readiness for real-world
 * challenges and on career roles, and the ICT answers on skills gained, career benefit ("enhancing your employability") and
 * "personalized support from experienced instructors". They return only with the approved NU admissions fact set (confirm list #16).
 */
const SAFE_FAQS: Record<string, number[]> = {
  'digital-marketing': [0],
  ict: [1],
};

/** Short, claim-light summary per course, written from the module names. (WP46: the "Why This Course" points are gone with the "What You Will Work On" band, which restated the module list.) */
export const NU_COURSE_COPY: Record<string, { short: string; lead: string; description: string; topics: string[]; titleTag: string; alsoConsider: string }> = {
  'digital-marketing': {
    short: 'Practical digital marketing: SEO, social media, advertising and analytics.',
    lead: 'Practical digital marketing skills, from SEO and social media to advertising and analytics, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in digital marketing, delivered by CodersTrust: SEO, social media, advertising and analytics.',
    topics: ['SEO and analytics', 'Social media marketing', 'E-commerce'],
    titleTag: 'NU Postgraduate Diploma in Digital Marketing',
    alsoConsider: 'Prefer programming, databases and networks? The NU Postgraduate Diploma in ICT is the course for those modules.',
  },
  ict: {
    short: 'Practical information and communication technology (ICT): programming, databases, networks, mobile and web development.',
    lead: 'Practical information and communication technology (ICT) skills, from programming and databases to networks, mobile apps and web design, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in ICT, delivered by CodersTrust: programming, databases, networks, mobile and web development.',
    topics: ['Programming and databases', 'Networks and troubleshooting', 'Mobile and web development'],
    titleTag: 'NU Postgraduate Diploma in ICT',
    alsoConsider: 'Prefer SEO, social media and advertising? The NU Postgraduate Diploma in Digital Marketing is the course for those modules.',
  },
};

function list(body: string, heading: string): string[] {
  const block = body.split(/\n## /).find((s) => s.startsWith(heading));
  return block ? block.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2).trim()) : [];
}

/**
 * "Related Career Areas" (WP18b). The legacy "Career opportunities" list cannot be grouped cleanly under the courses' own module names:
 * only some roles follow from a module (an SEO role from the SEO module), the rest (Entrepreneur, Freelancer, Business Analyst,
 * Network Engineer, ...) follow from no single module, and a mapping beyond the module list would be invented. So the list stays flat,
 * split into single titles ("A or B", "A & B"), and drops the senior titles (Director, Manager, Architect), which a postgraduate
 * diploma does not lead to by itself. The text of every kept title is the legacy text, unchanged.
 */
const SENIOR_TITLE = /\b(Director|Manager|Architect)\b/;
/**
 * Titles that no module of the course leads to (WP20a): Digital Marketing has no web design or development module and none on starting a business or
 * freelancing; ICT has no analytics or business-analysis module. The remaining titles each follow from a module name.
 */
const NO_MODULE: Record<string, RegExp> = {
  'digital-marketing': /^(Web Developer|Web Designer|Entrepreneur|Freelancer)$/,
  ict: /^(Data Analyst|System Analyst|Business Analyst)$/,
};
export function relatedCareerAreas(raw: string[], slug?: string): string[] {
  const drop = slug ? NO_MODULE[slug] : undefined;
  return raw
    .flatMap((r) => r.split(/\s+or\s+|\s+&\s+(?=[A-Z][a-z])/))
    .map((r) => r.trim())
    .filter((r) => r && !SENIOR_TITLE.test(r) && !(drop && drop.test(r)));
}

/**
 * WP25s: the modules named in "What Will I Be Able to Do After This Course?". Each is one of the course's own module titles (a title that is not in
 * the course's list fails the build), so the answer names concrete subjects and promises nothing beyond the module list.
 * WP39 (cycle-16 review): the answer says each module in plain words (`words`, the subject of the registered module title: "WordPress Design (Practical)" is "WordPress design", "Database Management Systems" is "databases"),
 * so the sentence reads "Build practical work in WordPress design, content marketing, SEO and analytics, followed by the final internship, project work and seminar module." instead of a list of module titles.
 */
const ANSWER_MODULES: Record<string, { module: string; words: string }[]> = {
  'digital-marketing': [
    { module: 'WordPress Design (Practical)', words: 'WordPress design' },
    { module: 'Content Marketing (Practical)', words: 'content marketing' },
    { module: 'Search Engine Optimization (SEO) - Practical', words: 'SEO' },
    { module: 'Web & Google Analytics (Practical)', words: 'analytics' },
  ],
  ict: [
    { module: 'Java Programming', words: 'programming' },
    { module: 'Database Management Systems', words: 'databases' },
    { module: 'Computer Networks Maintenance', words: 'networks' },
    { module: 'Mobile Application Development', words: 'mobile applications' },
  ],
};
/** "a, b, c and d" */
const andList = (items: string[]) => `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/** Course-page questions, answered from the course's module names only (no outcome, role or service claim). */
export function nuModuleFaqs(c: NuCourse): { q: string; html: string }[] {
  const names = c.modules.map((m) => esc(m));
  const last = names[names.length - 1];
  const picked = ANSWER_MODULES[c.slug];
  if (!picked) throw new Error(`nuModuleFaqs: no answer modules for ${c.slug}`);
  for (const m of picked) if (!c.modules.includes(m.module)) throw new Error(`nuModuleFaqs: "${m.module}" is not a module of ${c.slug}`);
  if (!c.modules.some((m) => /^Internship/i.test(m))) throw new Error(`nuModuleFaqs: ${c.slug} no longer has its final internship, project work and seminar module`);
  return [
    { q: 'What Will I Study?', html: `${c.modules.length} modules: ${names.slice(0, -1).join('; ')}; and ${last.toLowerCase().startsWith('internship') ? 'a final module of ' + last.toLowerCase() : last}.` },
    { q: 'What Will I Be Able to Do After This Course?', html: `Build practical work in ${andList(picked.map((m) => m.words))}, followed by the final internship, project work and seminar module. Your next step depends on your experience, portfolio and local market.` },
  ];
}
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
        title: NU_COURSE_NAME[e.data.slug] ?? e.data.title,
        modules: (e.data.modules ?? []).map((m) => (/^Internship/i.test(m) ? 'Internship, project work and seminar' : m)),
        roles: relatedCareerAreas(list(e.body ?? '', 'Career opportunities'), e.data.slug),
        faqs: (e.data.faqs ?? []).filter((_, i) => keep.includes(i)),
      };
    });
}

