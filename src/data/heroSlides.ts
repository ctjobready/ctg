import type { Fact } from './facts';
import { HEADLINE, VALUE_PROPOSITION } from './copy';
import { navGroups, type NavLink } from './nav';
import { cta } from '../lib/mailto';

/**
 * The home hero (WP17, hybrid) and the "Results and Programs" carousel below it (WP13, WP13b; rendered by src/components/sections/HeroSlider.astro,
 * driven by src/scripts/heroSlider.ts). Every figure is read from the facts register at build time (fact(id).stat, or <Fact> for a register
 * sentence); no number is typed here.
 * HOME_HERO is the stable hero: the page's only h1, one value proposition, one primary action, one text link, the audience links and the three
 * strongest proof cards, always visible. HOME_SLIDES are the carousel slides: the trial first, then scale, income and employment, speed to
 * earning, placement (named programs), government and National University trust, and the programs (employment programs first, SuperKids last).
 * Each slide has one cleared photograph from the registry (src/data/photos.ts, D13 rows in src/data/permissions.json); the hero's is eager, the carousel's lazy.
 * Titles and eyebrows are Title Case (src/lib/titleCase.mjs). Every carousel slide title is an h2.
 */

export interface HeroSlideStat {
  /** Register fact whose stat (value and label) the figure shows. */
  factId: string;
  /** Caption under the figure, built from the register; the register's own label when omitted. */
  caption?: (f: Fact) => string;
}

export interface HeroSlideLink {
  label: string;
  href: string;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface HeroSlide {
  id: string;
  eyebrow?: string;
  /** The heading: the page's h1 on the first slide, an h2 on the others. */
  title: string;
  lead?: string;
  /** A register sentence, rendered with <Fact>, in place of the lead. */
  fact?: { id: string; field: 'text' | 'headline' };
  /** Figures in white tiles under the lead. */
  stats?: HeroSlideStat[];
  /** One figure on a Klein-blue band (the evidence proof): a card over the photograph on desktop, under it on phones. */
  proof?: HeroSlideStat;
  /** Program links, in a grid. */
  programs?: NavLink[];
  links?: HeroSlideLink[];
  /** First slide only: audience links above the heading. */
  audience?: { label: string; href: string }[];
  /** Key of the photograph registry (src/data/photos.ts, photo()). */
  photo: string;
}

/** Program links, in slide order. Labels and one-line descriptors are the navigation's own (src/data/nav.ts), so the two stay in step. */
const PROGRAM_HREFS = ['/programs/youthwide/', '/programs/jobready-campus/', '/programs/jobready-work/', '/nu-postgraduate-diploma/', '/programs/superkids/'] as const;

function navLink(href: string): NavLink {
  const item = navGroups.flatMap((g) => g.items).find((i) => i.href === href);
  if (!item) throw new Error(`heroSlides: no navigation entry for ${href}`);
  return item;
}

/** The before-training figure of a survey fact (stat.from), for a caption such as "up from 47.4% before training". */
function before(f: Fact): string {
  const from = f.stat?.from;
  if (!from) throw new Error(`heroSlides: ${f.id} has no stat.from`);
  return from;
}

const discovery = cta('discovery');

/** The stable home hero. */
export const HOME_HERO = {
  title: HEADLINE.home,
  lead: VALUE_PROPOSITION.home,
  audience: [
    { label: 'Development Partners', href: '/partner-with-us/development-partners/' },
    { label: 'Governments', href: '/partner-with-us/governments/' },
    { label: 'Foundations', href: '/partner-with-us/foundations/' },
    { label: 'Investors', href: '/investors/' },
  ],
  primary: { label: discovery.label, href: discovery.href },
  secondary: { label: 'See the Evidence', href: '/impact/' },
  photo: 'general/women-learners-classroom',
  /** The three proof cards: the trial, the survey, the scale. */
  proof: [
    { eyebrow: 'Randomized Trial', factId: 'RC-02' },
    { eyebrow: 'Impact Survey 2026', factId: 'OC-01' },
    { eyebrow: 'Reach Since 2014', factId: 'SC-16' },
  ] as { eyebrow: string; factId: string }[],
};

export const HOME_SLIDES: HeroSlide[] = [
  {
    id: 'evidence',
    eyebrow: 'Independent Evaluation',
    title: 'Evidence from a Randomized Trial',
    fact: { id: 'RC-13', field: 'text' },
    proof: { factId: 'RC-06a', caption: (f) => f.stat?.glance?.label ?? '' },
    links: [{ label: 'See the Trial', href: '/impact/independent-evaluation/', variant: 'primary' }],
    photo: 'general/classroom-girls',
  },
  {
    id: 'scale',
    eyebrow: 'Impact at Scale',
    title: 'Reach That Spans Continents',
    lead: 'Learners trained in programs across Asia, Africa, Europe and the Americas.',
    stats: [{ factId: 'SC-16' }],
    links: [{ label: 'Explore Global Reach', href: '/impact/global-reach/', variant: 'primary' }],
    photo: 'general/madrasa-students-hall',
  },
  {
    id: 'outcomes',
    eyebrow: 'Impact Survey 2026',
    title: 'Income and Employment Among Surveyed Completers',
    lead: 'Median monthly income and employment, before training and at the October 2026 survey.',
    stats: [
      { factId: 'OC-03', caption: (f) => `median monthly income among surveyed completers, up from ${before(f)} before training` },
      { factId: 'OC-01', caption: (f) => `employed among surveyed completers at the October 2026 survey, up from ${before(f)} before training` },
    ],
    links: [{ label: 'Read the 2026 Survey Results', href: '/impact/outcomes-2026/', variant: 'primary' }],
    photo: 'general/woman-learner-laptop',
  },
  {
    id: 'fast-to-earning',
    eyebrow: 'Impact Survey 2026',
    title: 'Fast to Earning',
    lead: 'Among surveyed completers, most new earners started within six months of training.',
    stats: [{ factId: 'OC-02' }, { factId: 'OC-05' }],
    links: [{ label: 'See How Fast Completers Earn', href: '/impact/outcomes-2026/', variant: 'primary' }],
    photo: 'general/lab-women-screen',
  },
  {
    id: 'placement',
    eyebrow: 'Placement',
    title: 'Strong Placement in Partner-Funded Programs',
    lead: 'Three partner-funded programs report their own placement results.',
    stats: [{ factId: 'PR-06' }],
    links: [{ label: 'See the Case Studies', href: '/impact/case-studies/', variant: 'primary' }],
    photo: 'general/yes-trainees-group',
  },
  {
    id: 'government-trust',
    eyebrow: 'Trust',
    title: 'Trusted by Governments and National University',
    lead: 'Governments and national institutions trust CodersTrust to train their people.',
    stats: [{ factId: 'GV-12' }, { factId: 'SC-04' }],
    links: [{ label: 'For Governments', href: '/partner-with-us/governments/', variant: 'primary' }],
    photo: 'general/nu-affiliation-group',
  },
  {
    id: 'programs',
    eyebrow: 'Our Programs',
    title: 'Key Programs',
    lead: 'Programs for youth, universities, employers and schools.',
    programs: PROGRAM_HREFS.map(navLink),
    photo: 'general/computer-lab-rows',
  },
];
