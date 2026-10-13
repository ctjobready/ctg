/**
 * Navigation structure (planning/03 §3). Paths are root-relative and resolved by url().
 * Every statistic below is read from the Facts Register (facts.ts): ID-02, OC-01. Cards that show a figure list its fact IDs in `factIds` (rendered as data-fact).
 * The About card shows no count: SC-01 and SC-03 need their footnotes, and a menu card has no room for them (review round 11, F17/M10).
 */
import { fact } from './facts';
import { COURSES_URL } from '../lib/site';

const stat = (id: string) => {
  const s = fact(id).stat;
  if (!s) throw new Error(`Fact ${id} has no stat`);
  return s;
};
const since = stat('ID-02').value;
const emp = stat('OC-01');
const trial = stat('RC-02');
const trialPoints = `+${trial.numeric} Percentage Points`;

export interface NavLink {
  label: string;
  href: string;
  /** One-line description shown in mega-menu panels. */
  description?: string;
  /** Listed in the footer column (default true). Hub overview links are not: the column heading already links to the hub. */
  footer?: boolean;
  /** Sub-heading of the menu section the link sits under (mega menu and mobile drawer); links without one come first, unheaded. */
  group?: string;
  /** Only in the header menus (the NU course pages and the Courses link): teaser lists elsewhere show the program links alone. */
  menuOnly?: boolean;
  /** Link path of the item this one is nested under (mega menu, drawer and footer render it as a child list of that item). */
  parent?: string;
}

export interface NavFeature {
  kind: 'about' | 'model' | 'pilot' | 'stat' | 'discovery';
  eyebrow?: string;
  title: string;
  text?: string;
  /** Large figure shown on stat cards. */
  figure?: string;
  /** Register facts the card displays (rendered as data-fact; used by the status gate). */
  factIds?: string[];
    cta: { label: string; href: string };
}

export interface NavGroup {
  id: string;
  label: string;
  /** Hub page for the group (no-JS fallback and footer heading link). */
  href: string;
  items: NavLink[];
  feature: NavFeature;
}

const PARTNER_PROGRAMS = 'Partner Programs';
const LEARNER_PROGRAMS = 'For Individual Learners';
const NU_PARENT = '/programs/nu-postgraduate-diploma/';

export const navGroups: NavGroup[] = [
  {
    id: 'about',
    label: 'About',
    href: '/about/',
    items: [
      { label: 'Our Story', href: '/about/', description: 'How CodersTrust began and where it is heading.' },
      { label: 'Leadership and Team', href: '/about/team/', description: 'Founders, advisors and the executive team.' },
      { label: 'Governance and Accountability', href: '/about/governance/', description: 'How CodersTrust is organized and reports to partners.' },
      { label: 'Instructors and Mentors', href: '/about/mentors/', description: 'The practitioners who teach and mentor learners.' },
      { label: 'Recognition and Media', href: '/about/recognition/', description: 'Awards, endorsements and press coverage.' },
      { label: 'Careers', href: '/careers/', description: 'Working at CodersTrust and how to apply.' },
      { label: 'Contact', href: '/contact/', description: 'Offices, email and phone.' },
    ],
    feature: {
      kind: 'about',
      eyebrow: `Since ${since}`,
      title: 'From Learning to Earning, for Youth',
      factIds: ['ID-02'],
      text: 'A workforce-development organization for the next generation of digital professionals.',
      cta: { label: 'Read Our Story', href: '/about/' },
    },
  },
  {
    id: 'model',
    label: 'Our Model',
    href: '/our-model/',
    items: [
      { label: 'How It Works', href: '/our-model/', description: 'From partner goals to employed program completers, end to end.' },
      { label: 'TalentLEAP', href: '/our-model/talentleap/', description: 'Our competency-based talent model.' },
      { label: 'JobReady Platform', href: '/our-model/jobready-platform/', description: 'Partner portals and AI chat are live; the employer marketplace is in pre-launch.' },
    ],
    feature: {
      kind: 'model',
      eyebrow: 'The Cycle',
      title: 'One Path from Learning to Earning',
      text: 'Competency development, then employment, then career advancement.',
      cta: { label: 'See How It Works', href: '/our-model/' },
    },
  },
  {
    id: 'programs',
    label: 'Programs',
    href: '/programs/',
    items: [
      { label: 'Programs Overview', href: '/programs/', description: 'Every program, by audience and delivery route.' },
      { label: 'YouthWIDE', href: '/programs/youthwide/', description: 'National Youth Employment Program.', group: PARTNER_PROGRAMS },
      { label: 'JobReady@Campus', href: '/programs/jobready-campus/', description: 'For universities and colleges.', group: PARTNER_PROGRAMS },
      { label: 'JobReady@Work', href: '/programs/jobready-work/', description: 'For employers and corporate teams.', group: PARTNER_PROGRAMS },
      { label: 'SuperKids', href: '/programs/superkids/', description: 'For schools and young learners.', group: PARTNER_PROGRAMS },
      { label: 'NU Postgraduate Diploma', href: '/programs/nu-postgraduate-diploma/', description: 'For degree holders.', group: LEARNER_PROGRAMS },
      { label: 'Digital Marketing', href: '/programs/nu-postgraduate-diploma/digital-marketing/', description: 'SEO, social media, advertising and analytics.', group: LEARNER_PROGRAMS, menuOnly: true, parent: NU_PARENT },
      { label: 'ICT', href: '/programs/nu-postgraduate-diploma/ict/', description: 'Programming, databases, networks, mobile and web development.', group: LEARNER_PROGRAMS, menuOnly: true, parent: NU_PARENT },
      { label: 'Courses', href: COURSES_URL, description: 'Short, self-paced courses on JobReady.global.', group: LEARNER_PROGRAMS, menuOnly: true },
    ],
    feature: {
      kind: 'pilot',
      eyebrow: 'Choose Your Path',
      title: 'Partner Programs or a Postgraduate Diploma?',
      text: 'Institutions and employers start with a partner program. Degree holders apply to the NU diploma.',
      cta: { label: 'Find the Right Program', href: '/programs/' },
    },
  },
  {
    id: 'impact',
    label: 'Impact',
    href: '/impact/',
    items: [
      { label: 'Impact Overview', href: '/impact/', description: 'Headline outcomes and the evidence ladder.' },
      { label: 'Independent Evaluation', href: '/impact/independent-evaluation/', description: 'The BIGD randomized trial.' },
      { label: 'Impact Survey 2026', href: '/impact/outcomes-2026/', description: 'Findings from the Impact Survey 2026.' },
      { label: 'Case Studies', href: '/impact/case-studies/', description: 'Four programs with partners, in depth.' },
      { label: 'Success Stories', href: '/impact/stories/', description: 'Individual learner stories and outcomes.' },
      { label: 'Global Reach', href: '/impact/global-reach/', description: 'Where our programs have run.' },
      { label: 'In the Field', href: '/impact/in-the-field/', description: 'Photographs from programs and events.' },
      { label: 'News Photographs', href: '/impact/in-the-field/news-photos/', description: 'Photographs published with CodersTrust news.', parent: '/impact/in-the-field/' },
    ],
    feature: {
      kind: 'stat',
      eyebrow: 'Randomized Trial of a Predecessor Program',
      title: 'More Employment for Women Offered a Place',
      figure: trialPoints,
      factIds: ['RC-02'],
      cta: { label: 'Read the Trial Results', href: '/impact/independent-evaluation/' },
    },
  },
  {
    id: 'partner',
    label: 'Partner with Us',
    href: '/partner-with-us/',
    items: [
      { label: 'Partnership Overview', href: '/partner-with-us/', description: 'Choose the route that fits your organization.' },
      { label: 'Development Partners and NGOs', href: '/partner-with-us/development-partners/', description: 'Evidence-led delivery for your portfolio.' },
      { label: 'Governments', href: '/partner-with-us/governments/', description: 'National programs for youth employment.' },
      { label: 'Foundations and CSR', href: '/partner-with-us/foundations/', description: 'Fund outcomes you can verify.' },
      { label: 'Universities', href: '/partner-with-us/universities/', description: 'Make graduates job-ready.' },
      { label: 'Employers', href: '/partner-with-us/employers/', description: 'Train your team or hire talent.' },
      { label: 'Local Partners in Bangladesh', href: '/partner-with-us/local-partners/', description: 'NGOs, colleges and chambers delivering locally.' },
      { label: 'Investors', href: '/partner-with-us/investors/', description: 'For impact investors: back JobReady’s staged rollout.' },
    ],
    feature: {
      kind: 'discovery',
      eyebrow: 'Choose Your Route',
      title: 'Find Your Partnership Route',
      text: 'Each route has its own evidence, offer and next step.',
      cta: { label: 'Explore Partnership Routes', href: '/partner-with-us/' },
    },
  },
];

/** Plain top-level link after the groups. */
export const topLinks: NavLink[] = [{ label: 'News', href: '/news/' }];

/** Utility link: course catalogue lives on jobready.global. */
export const utilityLink: NavLink = { label: 'Courses', href: COURSES_URL };

/** Primary header CTA. */
export const headerCta: NavLink = { label: 'Talk to Us', href: '/contact/' };

/** PromoBar (planning/03 §3.1) — hidden on the outcomes page itself. Two text links, one per evidence type: the trial and the survey. */
export const promo = {
  lead: 'Randomized trial of a predecessor program:',
  rest: `women offered a place were ${trial.numeric} percentage points more likely to be employed. Surveyed completers: ${emp.from} employed before training, ${emp.value} at the October 2026 survey.`,
  /** The same two statements for a phone (up to 575 px): both labels kept, three lines at 375 px. */
  short: `women offered a place: +${trial.numeric} percentage points employed. Surveyed completers: ${emp.from} to ${emp.value} employed.`,
  /** Bump to show a changed announcement to people who dismissed the previous one. */
  storageKey: 'ct-promo-v4',
  factId: 'RC-02 OC-01',
  links: [
    { label: 'Trial Results', href: '/impact/independent-evaluation/' },
    { label: 'Survey Findings', href: '/impact/outcomes-2026/' },
  ],
  hideOnPath: '/impact/outcomes-2026/',
};

/** Items in menu order with their nested children (items whose `parent` is the link path of another item) listed under that item. */
export type NavNode = NavLink & { children: NavLink[] };
export function nestItems(items: NavLink[]): NavNode[] {
  const top: NavNode[] = items.filter((i) => !i.parent).map((i) => ({ ...i, children: [] }));
  for (const i of items.filter((x) => x.parent)) {
    const host = top.find((t) => t.href === i.parent);
    if (!host) throw new Error(`nav: ${i.label} is nested under ${i.parent}, which is not an item of the same menu`);
    host.children.push(i);
  }
  return top;
}

export interface FooterLink {
  label: string;
  href: string;
  /** Nested under this link, as in the menus. */
  children?: { label: string; href: string }[];
}

/** Footer columns mirror the mega-menus (planning/03 §3.3). */
export const footerColumns = navGroups
  .filter((g) => ['about', 'model', 'programs', 'impact', 'partner'].includes(g.id))
  .map((g) => ({
    id: g.id,
    title: g.label,
    href: g.href,
    links: nestItems(g.items.filter((i) => i.footer !== false)).map<FooterLink>(({ label, href, children }) => ({
      label,
      href,
      ...(children.length ? { children: children.map(({ label: l, href: h }) => ({ label: l, href: h })) } : {}),
    })),
  }));

export const footerBottomLinks: NavLink[] = [
  ...topLinks,
  { label: 'Privacy', href: '/privacy-policy/' },
  { label: 'Accessibility', href: '/accessibility/' },
];

/** Audience router (Home, 404, partner hub): who are you? Same order as the Partner with Us menu. */
export const audiences = [
  { id: 'development-partners', title: 'Development Partners', icon: 'globe', text: 'Evidence-led delivery for your portfolio', href: '/partner-with-us/development-partners/' },
  { id: 'governments', title: 'Governments', icon: 'landmark', text: 'National programs for youth employment', href: '/partner-with-us/governments/' },
  { id: 'foundations', title: 'Foundations and CSR', icon: 'heart-handshake', text: 'Fund outcomes you can verify', href: '/partner-with-us/foundations/' },
  { id: 'universities', title: 'Universities', icon: 'graduation-cap', text: 'Make graduates job-ready', href: '/partner-with-us/universities/' },
  { id: 'employers', title: 'Employers', icon: 'briefcase', text: 'Train your team or hire talent', href: '/partner-with-us/employers/' },
  { id: 'local-partners', title: 'Local Partners in Bangladesh', icon: 'map-pin', text: 'NGOs, colleges and chambers delivering locally', href: '/partner-with-us/local-partners/' },
  { id: 'investors', title: 'Investors', icon: 'trending-up', text: 'For impact investors backing JobReady', href: '/partner-with-us/investors/' },
] as const;
