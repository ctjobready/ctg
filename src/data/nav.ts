/**
 * Navigation structure (planning/03 §3). Paths are root-relative and resolved by url().
 * Every statistic below is read from the Facts Register (facts.ts): ID-02, RC-02. Cards that show a figure list its fact IDs in `factIds` (rendered as data-fact).
 * The About card shows no count: SC-01 and SC-03 need their footnotes, and a menu card has no room for them (review round 11, F17/M10).
 * WP30c (cycle-7 IA review): a featured panel points to a different decisive page than the first item of its own menu, with that page's own menu description
 * as its text (About: Governance and Accountability; Our Model: the JobReady Platform status; Programs: YouthWIDE; Partner with Us: Governments).
 */
import { fact } from './facts';
import { NU_ELIGIBILITY } from './copy';
import { COURSES_URL } from '../lib/site';

const stat = (id: string) => {
  const s = fact(id).stat;
  if (!s) throw new Error(`Fact ${id} has no stat`);
  return s;
};
const trial = stat('RC-02');
const trialPoints = `+${trial.numeric} Percentage Points`;
/**
 * YouthWIDE's one-line description (the Programs menu and its featured panel; Home's carousel showed it on a seventh slide until WP53): co-funded country cohorts designed for three regions (IN-02; the YouthWIDE page names them: South Asia, the Middle East and North Africa, and Sub-Saharan Africa),
 * from training to paid digital work. The three regions are not listed here: with them spelled out (no "MENA") the line is longer than a menu line should be.
 * WP54 (cycle-28 review, Claude S7): the line no longer carries the Bangladesh aim. It said "..., with a Bangladesh initiative that aims to train 2 million vulnerable youth by 2030" (IN-01; WP45, cycle-21 review: "a national initiative in Bangladesh" read as an existing national
 * program; WP48: IN-01's own "vulnerable youth"), which put a Bangladesh target in the menu of every page of a global site. The aim stays on the YouthWIDE page, the Programs hub and Impact, where it is labeled as an aim; this line states IN-02 only.
 */
const youthwideLine = 'Co-funded country cohorts, designed for three regions, from training to paid digital work.';

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
  /** Register facts the description states (rendered as data-fact on the description in the header menus). */
  factIds?: string[];
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
      eyebrow: 'Accountability',
      title: 'Governance and Accountability',
      text: 'How CodersTrust is organized and reports to partners.',
      cta: { label: 'See How We Report to Partners', href: '/about/governance/' },
    },
  },
  {
    id: 'model',
    label: 'Our Model',
    href: '/our-model/',
    items: [
      { label: 'How It Works', href: '/our-model/', description: 'From partner goals to training, placement support and tracked outcomes.' },
      { label: 'TalentLEAP', href: '/our-model/talentleap/', description: 'Our competency-based talent model.' },
      // WP45 (cycle-21 review): IN-04 names two marketplaces in pre-launch, the employer marketplace and the gig-work marketplace, so the menu names both (tests/wp25s.spec.ts forbids "employer and gig-work").
      { label: 'JobReady Platform', href: '/our-model/jobready-platform/', description: 'Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.' },
    ],
    feature: {
      kind: 'pilot',
      eyebrow: 'Platform Status',
      title: 'JobReady Platform',
      text: 'Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.',
      cta: { label: 'See the Rollout Status', href: '/our-model/jobready-platform/' },
    },
  },
  {
    id: 'programs',
    label: 'Programs',
    href: '/programs/',
    items: [
      { label: 'Programs Overview', href: '/programs/', description: 'Every program, by audience and delivery route.' },
      // WP27: not "National…" alone, which fits Bangladesh only: the page's own description (IN-02: the program through which funders deploy the model in a country). WP54: the line states IN-02 only (the Bangladesh aim, IN-01, is no longer in it).
      { label: 'YouthWIDE', href: '/programs/youthwide/', description: youthwideLine, factIds: ['IN-02'], group: PARTNER_PROGRAMS },
      { label: 'JobReady@Campus', href: '/programs/jobready-campus/', description: 'For universities and colleges.', group: PARTNER_PROGRAMS },
      { label: 'JobReady@Work', href: '/programs/jobready-work/', description: 'For employers and corporate teams.', group: PARTNER_PROGRAMS },
      { label: 'SuperKids', href: '/programs/superkids/', description: 'For schools and young learners.', group: PARTNER_PROGRAMS },
      // WP27: admissions' eligibility sentence (NU-01), the same words on the NU pages, the Programs hub and the FAQs (Home's programs slide, which carried it too, is gone: WP53).
      { label: 'NU Postgraduate Diploma', href: '/programs/nu-postgraduate-diploma/', description: `Eligibility: ${NU_ELIGIBILITY}.`, factIds: ['NU-01'], group: LEARNER_PROGRAMS },
      { label: 'Digital Marketing', href: '/programs/nu-postgraduate-diploma/digital-marketing/', description: 'SEO, social media, advertising and analytics.', group: LEARNER_PROGRAMS, menuOnly: true, parent: NU_PARENT },
      { label: 'ICT', href: '/programs/nu-postgraduate-diploma/ict/', description: 'Programming, databases, networks, mobile and web development.', group: LEARNER_PROGRAMS, menuOnly: true, parent: NU_PARENT },
      { label: 'Courses', href: COURSES_URL, description: 'Short, self-paced courses on JobReady.global.', group: LEARNER_PROGRAMS, menuOnly: true },
    ],
    feature: {
      kind: 'pilot',
      eyebrow: 'Partner Programs',
      title: 'YouthWIDE',
      text: youthwideLine,
      factIds: ['IN-02'],
      cta: { label: 'Explore YouthWIDE', href: '/programs/youthwide/' },
    },
  },
  {
    id: 'impact',
    label: 'Impact',
    href: '/impact/',
    items: [
      { label: 'Impact Overview', href: '/impact/', description: 'Headline outcomes and the evidence ladder.' },
      { label: 'Independent Evaluation', href: '/impact/independent-evaluation/', description: 'The randomized trial of a predecessor program.' },
      { label: 'Impact Survey 2026', href: '/impact/outcomes-2026/', description: 'Findings from the Impact Survey 2026.' },
      { label: 'Case Studies', href: '/impact/case-studies/', description: 'Five programs with partners, in depth.' },
      { label: 'Success Stories', href: '/impact/stories/', description: 'Individual learner stories and outcomes.' },
      { label: 'Global Reach', href: '/impact/global-reach/', description: 'Where we have worked.' },
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
      // WP48 (cycle-23 review): not "National programs for youth employment." (a 100,000+ national program is a design option CodersTrust has not yet delivered); the blurb says what the Governments page offers. The featured panel below and the audience router (Home, 404, partner hub) say the same.
      { label: 'Governments', href: '/partner-with-us/governments/', description: 'Curriculum, trainer training and phased delivery for ministries.' },
      { label: 'Foundations and CSR', href: '/partner-with-us/foundations/', description: 'Fund outcomes you can track.' },
      { label: 'Universities', href: '/partner-with-us/universities/', description: 'Make graduates job-ready.' },
      { label: 'Employers', href: '/partner-with-us/employers/', description: 'Train your team or hire talent.' },
      { label: 'Local Partners in Bangladesh', href: '/partner-with-us/local-partners/', description: 'NGOs, colleges, chambers and associations delivering locally.' },
      { label: 'Investors', href: '/partner-with-us/investors/', description: 'For impact investors: back JobReady’s staged rollout.' },
    ],
    feature: {
      kind: 'discovery',
      eyebrow: 'For Ministries and Public Agencies',
      title: 'Governments',
      text: 'Curriculum, trainer training and phased delivery for ministries.',
      cta: { label: 'Explore the Government Route', href: '/partner-with-us/governments/' },
    },
  },
];

/** Plain top-level link after the groups. */
export const topLinks: NavLink[] = [{ label: 'News', href: '/news/' }];

/** Utility link: course catalogue lives on jobready.global. */
export const utilityLink: NavLink = { label: 'Courses', href: COURSES_URL };

/** Primary header CTA. */
export const headerCta: NavLink = { label: 'Talk to Us', href: '/contact/' };

/** PromoBar (planning/03 §3.1) — hidden on the outcomes page itself. One statement, the trial's employment result (WP31: the survey sentence is gone, the survey stays one text link away). */
export const promo = {
  lead: 'Randomized trial of a predecessor program:',
  rest: `women offered a place were ${trial.numeric} percentage points more likely to be employed.`,
  /** The same statement for a phone (up to 575 px). */
  short: `women offered a place: +${trial.numeric} percentage points employed.`,
  /** Bump to show a changed announcement to people who dismissed the previous one. */
  storageKey: 'ct-promo-v4',
  factId: 'RC-02',
  links: [
    { label: 'Trial Results', href: '/impact/independent-evaluation/' },
    { label: 'Impact Survey 2026', href: '/impact/outcomes-2026/' },
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

/**
 * JobReady's definition, as IN-04 registers it ("JobReady is CodersTrust’s digital learning and earning platform, being built as ..."). The investor card names the platform in these words and says nothing about what it does for youth
 * (IN-04: the employer and gig-work marketplaces are in pre-launch, so the card does not say the platform "connects" youth to work); the build stops if the register stops opening with the definition.
 */
const jobreadyDefinition = /^JobReady is (CodersTrust’s digital learning and earning platform)\b/.exec(fact('IN-04').text)?.[1];
if (!jobreadyDefinition) throw new Error('nav: IN-04 no longer opens "JobReady is CodersTrust’s digital learning and earning platform"; update the investor card');

/** Audience router (Home, 404, partner hub): who are you? Same order as the Partner with Us menu. */
export const audiences = [
  { id: 'development-partners', title: 'Development Partners', icon: 'globe', text: 'Evidence-led delivery for your portfolio', href: '/partner-with-us/development-partners/' },
  { id: 'governments', title: 'Governments', icon: 'landmark', text: 'Curriculum, trainer training and phased delivery for ministries', href: '/partner-with-us/governments/' },
  { id: 'foundations', title: 'Foundations and CSR', icon: 'heart-handshake', text: 'Fund outcomes you can track', href: '/partner-with-us/foundations/' },
  { id: 'universities', title: 'Universities', icon: 'graduation-cap', text: 'Make graduates job-ready', href: '/partner-with-us/universities/' },
  { id: 'employers', title: 'Employers', icon: 'briefcase', text: 'Train your team or hire talent', href: '/partner-with-us/employers/' },
  { id: 'local-partners', title: 'Local Partners in Bangladesh', icon: 'map-pin', text: 'NGOs, colleges, chambers and associations delivering locally', href: '/partner-with-us/local-partners/' },
  // WP46 (cycle-22 review): JobReady is not defined on Home, so the investor card says what it is, in the partner hub's words for this route.
  // WP48 (cycle-23 review, item 33): the card now also states the investor's route ("Back JobReady, ...").
  // WP50 (cycle-25 review, item 14): the card backs the staged rollout and names the platform in IN-04's own definition; it was "Back JobReady, the platform we are building to connect emerging-market youth to work.", which understated the live modules
  // and claimed a connection to work while the marketplaces are in pre-launch.
  { id: 'investors', title: 'Investors', icon: 'trending-up', text: `Back the staged rollout of JobReady, ${jobreadyDefinition}.`, href: '/partner-with-us/investors/' },
] as const;
