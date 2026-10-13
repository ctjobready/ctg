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

export interface NavLink {
  label: string;
  href: string;
  /** One-line description shown in mega-menu panels. */
  description?: string;
  /** Listed in the footer column (default true). Hub overview links are not: the column heading already links to the hub. */
  footer?: boolean;
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

export const navGroups: NavGroup[] = [
  {
    id: 'about',
    label: 'About',
    href: '/about/',
    items: [
      { label: 'Our Story', href: '/about/', description: 'How CodersTrust began and where it is heading.' },
      { label: 'Leadership & Team', href: '/about/team/', description: 'Founders, advisors and the executive team.' },
      { label: 'Governance and Accountability', href: '/about/governance/', description: 'How CodersTrust is organized and reports to partners.' },
      { label: 'Instructors & Mentors', href: '/about/mentors/', description: 'The practitioners who teach and mentor learners.' },
      { label: 'Recognition & Media', href: '/about/recognition/', description: 'Awards, endorsements and press coverage.' },
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
      { label: 'JobReady Platform', href: '/our-model/jobready-platform/', description: 'Our learning and work platform, rolling out in stages.' },
    ],
    feature: {
      kind: 'model',
      eyebrow: 'The Cycle',
      title: 'Learn → Earn → Prosper',
      text: 'Competency development, then employment, then career advancement.',
      cta: { label: 'See How It Works', href: '/our-model/' },
    },
  },
  {
    id: 'programs',
    label: 'Programs',
    href: '/programs/',
    items: [
      { label: 'Programs Overview', href: '/programs/', description: 'Every program, by audience and delivery route.', footer: false },
      { label: 'YouthWIDE', href: '/programs/youthwide/', description: 'Youth digital employment: a Bangladesh national initiative and country cohorts.' },
      { label: 'JobReady@Campus', href: '/programs/jobready-campus/', description: 'Universities and colleges.' },
      { label: 'JobReady@Work', href: '/programs/jobready-work/', description: 'Corporate training and talent.' },
      { label: 'NU Postgraduate Diploma', href: '/nu-postgraduate-diploma/', description: 'Digital Marketing and ICT diplomas.' },
      { label: 'SuperKids', href: '/programs/superkids/', description: 'K-12 STEAM, robotics and coding.' },
    ],
    feature: {
      kind: 'pilot',
      eyebrow: 'Start Small',
      title: 'Start with a Pilot',
      text: 'Launch a first cohort, measure results, then scale.',
      cta: { label: 'Find the Right Program', href: '/programs/' },
    },
  },
  {
    id: 'impact',
    label: 'Impact',
    href: '/impact/',
    items: [
      { label: 'Impact Overview', href: '/impact/', description: 'Headline outcomes and the evidence ladder.' },
      { label: 'Outcomes 2026', href: '/impact/outcomes-2026/', description: 'Findings from the Impact Survey 2026.' },
      { label: 'Independent Evaluation (RCT)', href: '/impact/independent-evaluation/', description: 'The BIGD randomized trial.' },
      { label: 'Case Studies', href: '/impact/case-studies/', description: 'Four programs with partners, in depth.' },
      { label: 'Success Stories', href: '/impact/stories/', description: 'Individual learner stories and outcomes.' },
      { label: 'Global Reach', href: '/impact/global-reach/', description: 'Where our programs have run.' },
      { label: 'In the Field', href: '/impact/in-the-field/', description: 'Photographs from programs and events.' },
    ],
    feature: {
      kind: 'stat',
      eyebrow: 'Impact Survey 2026',
      figure: `${emp.from} → ${emp.value}`,
      title: 'of surveyed completers employed',
      text: 'Before training and at the October 2026 survey.',
      factIds: ['OC-01'],
      cta: { label: 'See the Findings', href: '/impact/outcomes-2026/' },
    },
  },
  {
    id: 'partner',
    label: 'Partner with Us',
    href: '/partner-with-us/',
    items: [
      { label: 'Partnership Overview', href: '/partner-with-us/', description: 'Choose the route that fits your organization.', footer: false },
      { label: 'Development Partners & NGOs', href: '/partner-with-us/development-partners/', description: 'Evidence-led delivery for your portfolio.' },
      { label: 'Governments', href: '/partner-with-us/governments/', description: 'National programs for youth employment.' },
      { label: 'Foundations & CSR', href: '/partner-with-us/foundations/', description: 'Fund outcomes you can verify.' },
      { label: 'Investors', href: '/investors/', description: 'Thesis and traction.' },
      { label: 'Local Partners', href: '/partner-with-us/local-partners/', description: 'NGOs, colleges and chambers delivering locally.' },
      { label: 'Universities', href: '/partner-with-us/universities/', description: 'Make graduates job-ready.' },
      { label: 'Employers', href: '/partner-with-us/employers/', description: 'Train your team or hire talent.' },
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
export const headerCta: NavLink = { label: 'Start a Partnership', href: '/contact/' };

/** PromoBar (planning/03 §3.1) — hidden on the outcomes page itself. */
export const promo = {
  lead: 'Impact Survey 2026:',
  rest: `among surveyed completers, employment rose from ${emp.from} before training to ${emp.value} at the October 2026 survey.`,
  /** Bump to show a changed announcement to people who dismissed the previous one. */
  storageKey: 'ct-promo-v2',
  factId: 'OC-01',
  action: { label: 'See the Findings', href: '/impact/outcomes-2026/' },
  hideOnPath: '/impact/outcomes-2026/',
};

/** Footer columns mirror the mega-menus (planning/03 §3.3). */
export const footerColumns = navGroups
  .filter((g) => ['about', 'programs', 'impact', 'partner'].includes(g.id))
  .map((g) => ({ id: g.id, title: g.label, href: g.href, links: g.items.filter((i) => i.footer !== false).map(({ label, href }) => ({ label, href })) }));

export const footerBottomLinks: NavLink[] = [
  { label: 'Privacy', href: '/privacy-policy/' },
  { label: 'Accessibility', href: '/accessibility/' },
];

/** Audience router (Home, 404, partner hub): who are you? */
export const audiences = [
  { id: 'development-partners', title: 'Development Partners', icon: 'globe', text: 'Evidence-led delivery for your portfolio', href: '/partner-with-us/development-partners/' },
  { id: 'governments', title: 'Governments', icon: 'landmark', text: 'National programs for youth employment', href: '/partner-with-us/governments/' },
  { id: 'foundations', title: 'Foundations & CSR', icon: 'heart-handshake', text: 'Fund outcomes you can verify', href: '/partner-with-us/foundations/' },
  { id: 'investors', title: 'Investors', icon: 'trending-up', text: 'Thesis and traction', href: '/investors/' },
  { id: 'local-partners', title: 'Local Partners', icon: 'map-pin', text: 'NGOs, colleges and chambers delivering locally', href: '/partner-with-us/local-partners/' },
  { id: 'universities', title: 'Universities', icon: 'graduation-cap', text: 'Make graduates job-ready', href: '/partner-with-us/universities/' },
  { id: 'employers', title: 'Employers', icon: 'briefcase', text: 'Train your team or hire talent', href: '/partner-with-us/employers/' },
] as const;
