import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * WP168-A (owner decision of 24 November 2026): the open roles (src/content/careers), shared by /careers/ (the Open Roles band and its category filter) and
 * /careers/<slug>/ (each role's page and its "More Open Roles").
 */
export type RoleEntry = CollectionEntry<'careers'>;
export type RoleCategory = RoleEntry['data']['category'];

/**
 * The old site's job categories (its `job-category` taxonomy), in alphabetical order, with the labels in the site's style ("and" for "&" and "/").
 * Typed against the collection's enum, so a new category needs a label here (and a filter rule in RoleGrid.astro).
 */
export const CATEGORIES: Record<RoleCategory, string> = {
  'accounting-finance': 'Accounting and Finance',
  'creative-media': 'Creative Media',
  'digital-marketing': 'Digital Marketing',
  management: 'Management',
  'marketing-sales': 'Marketing and Sales',
  mentors: 'Mentors',
  operations: 'Operations',
  'software-engineering': 'Software Engineering',
  'training-development': 'Training and Development',
};
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as RoleCategory[];

/** Newest post first (the post date is never printed: every role is open); ties by the old post's last change, then by title. */
export function sortRoles<T extends { data: { title: string; posted: Date; modified: Date } }>(roles: readonly T[]): T[] {
  return [...roles].sort((a, b) => b.data.posted.valueOf() - a.data.posted.valueOf() || b.data.modified.valueOf() - a.data.modified.valueOf() || a.data.title.localeCompare(b.data.title));
}

/** The published roles (a `draft: true` role is held back: no page, no card), in list order. */
export async function allRoles(): Promise<RoleEntry[]> {
  return sortRoles(await getCollection('careers', (e) => !e.data.draft));
}

export const roleHref = (role: { id: string }) => `/careers/${role.id}/`;

/** "More Open Roles" on a role page: the other roles in its category first, then the most recent others, in list order. */
export function relatedRoles<T extends { id: string; data: { category: string } }>(all: readonly T[], role: T, count = 3): T[] {
  const others = all.filter((r) => r.id !== role.id);
  const same = others.filter((r) => r.data.category === role.data.category);
  const rest = others.filter((r) => r.data.category !== role.data.category);
  return [...same, ...rest].slice(0, count);
}

/** The application steps each role page shows (from the old posts' "How To Apply"); the button opens the email the third step describes. */
export const APPLY_STEPS = [
  { title: 'Tailor Your Resume', text: 'Prepare a tailored version of your resume, highlighting the match with the qualifications above, with your contact information in it.' },
  { title: 'Email Your Application', text: 'The Apply for This Role button opens an email to the CodersTrust Bangladesh HR team, with the role title as its subject. Attach your resume.' },
  {
    title: 'Complete the Details',
    text: 'In the email, give your earliest availability for joining and for interviews, your interview time windows, your minimum desired compensation (monthly salary in BDT) and the job location you are applying for.',
  },
];

/** The benefits every old job post listed, word for word apart from the site's style. */
export const BENEFITS = {
  lead: 'At CodersTrust, we offer a comprehensive benefits package to support our employees’ well-being and work-life balance. Our perks include the following:',
  items: ['Excellent Work Environment', 'Dual Festival Bonuses', 'Loyalty Bonus', 'Annual Tour'],
};
