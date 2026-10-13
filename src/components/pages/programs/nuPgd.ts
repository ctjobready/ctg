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
export const NU_CALL_TEXT = `Call ${NU_CALL_NUMBER}`;

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

/** One point of the "Why This Course" band: every line names modules of the course and says nothing beyond them. */
export interface NuWhy {
  title: string;
  text: string;
}

/** Short, claim-light summary per course, written from the module names. */
export const NU_COURSE_COPY: Record<string, { short: string; lead: string; description: string; topics: string[]; titleTag: string; why: NuWhy[]; alsoConsider: string }> = {
  'digital-marketing': {
    short: 'Practical digital marketing: SEO, social media, advertising and analytics.',
    lead: 'Practical digital marketing skills, from SEO and social media to advertising and analytics, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in digital marketing, delivered by CodersTrust: SEO, social media, advertising and analytics.',
    topics: ['SEO and analytics', 'Social media marketing', 'E-commerce'],
    titleTag: 'NU Postgraduate Diploma in Digital Marketing',
    why: [
      { title: 'A Practical Core', text: 'Five modules are marked practical: WordPress Design, Content Marketing, Affiliate & E-mail Marketing, Search Engine Optimization (SEO) and Web & Google Analytics.' },
      { title: 'Channels and Commerce', text: 'Separate modules cover AdWords & PPC, Social Media Marketing and E-Commerce.' },
      { title: 'A Final Module', text: 'The last module combines an internship, project work and a seminar.' },
    ],
    alsoConsider: 'Prefer programming, databases and networks? This is the course for those modules.',
  },
  ict: {
    short: 'Practical ICT: programming, databases, networks, mobile and web development.',
    lead: 'Practical information and communication technology (ICT) skills, from programming and databases to networks, mobile apps and web design, in a National University postgraduate diploma delivered by CodersTrust.',
    description: 'A National University postgraduate diploma in ICT, delivered by CodersTrust: programming, databases, networks, mobile and web development.',
    topics: ['Programming and databases', 'Networks and troubleshooting', 'Mobile and web development'],
    titleTag: 'NU Postgraduate Diploma in ICT',
    why: [
      { title: 'Programming and Data', text: 'Modules on Java Programming and Database Management Systems.' },
      { title: 'Systems and Networks', text: 'Modules on Office Automation, System Maintenance and Troubleshooting, and Computer Networks Maintenance.' },
      { title: 'Apps, Web and Media', text: 'Modules on Mobile Application Development, Web Application & Web Site Design, and Multimedia Design and Developments.' },
      { title: 'A Final Module', text: 'The last module combines an internship, project work and a seminar.' },
    ],
    alsoConsider: 'Prefer SEO, social media and advertising? This is the course for those modules.',
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

/** Course-page questions, answered from the course's module names only (no outcome, role or service claim). */
export function nuModuleFaqs(c: NuCourse): { q: string; html: string }[] {
  const names = c.modules.map((m) => esc(m));
  const last = names[names.length - 1];
  return [
    { q: 'What Will I Study?', html: `${c.modules.length} modules: ${names.slice(0, -1).join('; ')}; and ${last.toLowerCase().startsWith('internship') ? 'a final module of ' + last.toLowerCase() : last}.` },
    { q: 'What Will I Be Able to Do After This Course?', html: `You will have completed the ${c.modules.length} modules listed above, including a final module of internship, project work and a seminar. What you can do next depends on your own experience, portfolio and the local market.` },
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

