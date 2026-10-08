/**
 * Navigation structure (planning/03 §3). Paths are root-relative and resolved by url().
 * The statistics inside feature cards mirror the Facts Register (SC-01, SC-03, OC-01);
 * wire them to `facts.ts` once that module is merged.
 */
import { COURSES_URL } from '../lib/site';
import { ctaHref } from '../lib/mailto';

export interface NavLink {
  label: string;
  href: string;
  /** One-line description shown in mega-menu panels. */
  description?: string;
}

export interface NavFeature {
  kind: 'about' | 'model' | 'pilot' | 'stat' | 'discovery';
  eyebrow?: string;
  title: string;
  text?: string;
  /** Large figure shown on stat cards. */
  figure?: string;
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
      { label: 'Our story', href: '/about/', description: 'How CodersTrust began and where it is heading.' },
      { label: 'Leadership & team', href: '/about/team/', description: 'Founders, advisors and the executive team.' },
      { label: 'Instructors & mentors', href: '/about/mentors/', description: 'The practitioners who teach and mentor learners.' },
      { label: 'Recognition & media', href: '/about/recognition/', description: 'Awards, endorsements and press coverage.' },
      { label: 'Careers', href: '/careers/', description: 'Open roles and life at CodersTrust.' },
      { label: 'Contact', href: '/contact/', description: 'Offices, email and phone.' },
    ],
    feature: {
      kind: 'about',
      eyebrow: 'Since 2014',
      title: '130,000+ youth · 15 countries',
      text: 'A workforce-development organization for the next generation of digital professionals.',
      cta: { label: 'Read our story', href: '/about/' },
    },
  },
  {
    id: 'model',
    label: 'Our model',
    href: '/our-model/',
    items: [
      { label: 'How it works', href: '/our-model/', description: 'From partner goals to employed graduates, end to end.' },
      { label: 'TalentLEAP', href: '/our-model/talentleap/', description: 'The mechanism behind our results.' },
      { label: 'JobReady platform', href: '/our-model/jobready-platform/', description: 'The digital platform that scales the model.' },
    ],
    feature: {
      kind: 'model',
      eyebrow: 'The cycle',
      title: 'Learn → Earn → Prosper',
      text: 'Competency development, then employment, then career advancement.',
      cta: { label: 'See how it works', href: '/our-model/' },
    },
  },
  {
    id: 'programs',
    label: 'Programs',
    href: '/programs/',
    items: [
      { label: 'YouthWIDE', href: '/programs/youthwide/', description: 'Multi-country cohorts for development partners.' },
      { label: 'NationWIDE', href: '/programs/nationwide/', description: 'National initiative with priority groups.' },
      { label: 'JobReady@Campus', href: '/programs/jobready-campus/', description: 'Universities and colleges.' },
      { label: 'JobReady@Work', href: '/programs/jobready-work/', description: 'Corporate training and talent.' },
      { label: 'NU Postgraduate Diploma', href: '/nu-postgraduate-diploma/', description: 'Digital Marketing and ICT diplomas.' },
      { label: 'SuperKids', href: '/programs/superkids/', description: 'K-12 STEAM, robotics and coding.' },
    ],
    feature: {
      kind: 'pilot',
      eyebrow: 'Start small',
      title: 'Start with a pilot',
      text: 'Launch a first cohort, measure results, then scale.',
      cta: { label: 'Explore YouthWIDE', href: '/programs/youthwide/' },
    },
  },
  {
    id: 'impact',
    label: 'Impact',
    href: '/impact/',
    items: [
      { label: 'Impact overview', href: '/impact/', description: 'Headline outcomes and the evidence ladder.' },
      { label: 'Outcomes 2026', href: '/impact/outcomes-2026/', description: 'Findings from the Impact Survey 2026.' },
      { label: 'Independent evaluation (RCT)', href: '/impact/independent-evaluation/', description: 'The BIGD randomized trial.' },
      { label: 'Case studies', href: '/impact/case-studies/', description: 'Five programs with partners, in depth.' },
      { label: 'Success stories', href: '/impact/stories/', description: 'Learners in their own words.' },
      { label: 'Global reach', href: '/impact/global-reach/', description: 'Where our programs have run.' },
    ],
    feature: {
      kind: 'stat',
      eyebrow: 'Impact Survey 2026',
      figure: '47.4% → 77.9%',
      title: 'employed',
      text: 'Surveyed completers, before training and today.',
      cta: { label: 'See the findings', href: '/impact/outcomes-2026/' },
    },
  },
  {
    id: 'partner',
    label: 'Partner with us',
    href: '/partner-with-us/',
    items: [
      { label: 'Governments', href: '/partner-with-us/governments/', description: 'National programs for youth employment.' },
      { label: 'Development partners & NGOs', href: '/partner-with-us/development-partners/', description: 'Evidence-led delivery for your portfolio.' },
      { label: 'Foundations & CSR', href: '/partner-with-us/foundations/', description: 'Fund outcomes you can verify.' },
      { label: 'Universities', href: '/partner-with-us/universities/', description: 'Make graduates job-ready.' },
      { label: 'Employers', href: '/partner-with-us/employers/', description: 'Train your team or hire talent.' },
      { label: 'Investors', href: '/investors/', description: 'Thesis and traction.' },
    ],
    feature: {
      kind: 'discovery',
      eyebrow: '30 minutes, no obligation',
      title: 'Book a discovery session',
      text: 'Tell us your goals; we will outline a first cohort.',
      cta: { label: 'Book a discovery session', href: ctaHref('discovery') },
    },
  },
];

/** Plain top-level link after the groups. */
export const topLinks: NavLink[] = [{ label: 'News', href: '/news/' }];

/** Utility link: course catalogue lives on jobready.global. */
export const utilityLink: NavLink = { label: 'Courses', href: COURSES_URL };

/** Primary header CTA. */
export const headerCta: NavLink = { label: 'Start a partnership', href: '/contact/' };

/** PromoBar (planning/03 §3.1) — hidden on the outcomes page itself. */
export const promo = {
  message: 'Impact Report 2026: employment among surveyed graduates rose from 47.4% to 77.9%.',
  lead: 'Impact Report 2026:',
  rest: 'employment among surveyed graduates rose from 47.4% to 77.9%.',
  action: { label: 'See the findings', href: '/impact/outcomes-2026/' },
  hideOnPath: '/impact/outcomes-2026/',
};

/** Footer columns mirror the mega-menus (planning/03 §3.3). */
export const footerColumns = navGroups
  .filter((g) => ['about', 'programs', 'impact', 'partner'].includes(g.id))
  .map((g) => ({ id: g.id, title: g.label, href: g.href, links: g.items.map(({ label, href }) => ({ label, href })) }));

export const footerBottomLinks: NavLink[] = [
  { label: 'Privacy', href: '/privacy-policy/' },
  { label: 'Accessibility', href: '/accessibility/' },
];

/** Audience router (Home, 404, partner hub): who are you? */
export const audiences = [
  { id: 'governments', title: 'Governments', icon: 'landmark', text: 'National programs for youth employment', href: '/partner-with-us/governments/' },
  { id: 'development-partners', title: 'Development partners', icon: 'globe', text: 'Evidence-led delivery for your portfolio', href: '/partner-with-us/development-partners/' },
  { id: 'foundations', title: 'Foundations & CSR', icon: 'heart-handshake', text: 'Fund outcomes you can verify', href: '/partner-with-us/foundations/' },
  { id: 'universities', title: 'Universities', icon: 'graduation-cap', text: 'Make graduates job-ready', href: '/partner-with-us/universities/' },
  { id: 'employers', title: 'Employers', icon: 'briefcase', text: 'Train your team or hire talent', href: '/partner-with-us/employers/' },
  { id: 'investors', title: 'Investors', icon: 'trending-up', text: 'Thesis and traction', href: '/investors/' },
] as const;
