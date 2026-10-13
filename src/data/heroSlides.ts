import type { Fact } from './facts';
import { HEADLINE, VALUE_PROPOSITION } from './copy';
import { navGroups, type NavLink } from './nav';
import { cta } from '../lib/mailto';

/**
 * Slides of the home hero (WP13, reworked in WP13b; rendered by src/components/sections/HeroSlider.astro, driven by src/scripts/heroSlider.ts).
 * Every figure is read from the facts register at build time (fact(id).stat, or <Fact> for a register sentence); no number is typed here.
 * Slide 1 is the positioning hero the page has always opened with. Slides 2 to 6 highlight the impact and the key programs.
 * Each slide has one cleared photograph from the registry (src/data/photos.ts, D13 rows in src/data/permissions.json); the first is eager, the rest lazy.
 * Titles and eyebrows are Title Case (src/lib/titleCase.mjs). The first slide's title is the page's only h1; the others are h2.
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

export const HOME_SLIDES: HeroSlide[] = [
  {
    id: 'positioning',
    title: HEADLINE.home,
    lead: VALUE_PROPOSITION.home,
    audience: [
      { label: 'Development Partners', href: '/partner-with-us/development-partners/' },
      { label: 'Governments', href: '/partner-with-us/governments/' },
      { label: 'Foundations', href: '/partner-with-us/foundations/' },
    ],
    links: [
      { label: discovery.label, href: discovery.href, variant: 'primary' },
      { label: 'See the Evidence', href: '/impact/', variant: 'outline' },
    ],
    photo: 'general/women-learners-classroom',
  },
  {
    id: 'scale',
    eyebrow: 'Impact at Scale',
    title: 'Reach That Spans Continents',
    lead: 'Learners trained in programs across Asia, Africa, Europe and the Americas.',
    stats: [{ factId: 'SC-01' }, { factId: 'SC-03' }],
    links: [{ label: 'Explore Global Reach', href: '/impact/global-reach/', variant: 'primary' }],
    photo: 'general/madrasa-students-hall',
  },
  {
    id: 'evidence',
    eyebrow: 'Independent Evaluation',
    title: 'Evidence from a Randomized Trial',
    fact: { id: 'RC-01', field: 'headline' },
    proof: { factId: 'RC-02' },
    links: [{ label: 'See the Trial', href: '/impact/independent-evaluation/', variant: 'primary' }],
    photo: 'general/classroom-girls',
  },
  {
    id: 'outcomes',
    eyebrow: 'Impact Survey 2026',
    title: 'Outcomes Among Surveyed Completers',
    lead: 'Employment and median monthly income, before training and at the October 2026 survey.',
    stats: [
      { factId: 'OC-01', caption: (f) => `employed among surveyed completers, up from ${before(f)} before training` },
      { factId: 'OC-03', caption: (f) => `median monthly income, up from ${before(f)} before training` },
    ],
    links: [{ label: 'Read the 2026 Survey Results', href: '/impact/outcomes-2026/', variant: 'primary' }],
    photo: 'general/woman-learner-laptop',
  },
  {
    id: 'programs',
    eyebrow: 'Our Programs',
    title: 'Key Programs',
    lead: 'Programs for youth, universities, employers and schools.',
    programs: PROGRAM_HREFS.map(navLink),
    photo: 'general/computer-lab-rows',
  },
  {
    id: 'women-government',
    eyebrow: 'Women and Government',
    title: 'Women’s Programs and Government Scale',
    lead: 'Results from programs for women and from government training contracts.',
    stats: [{ factId: 'PR-01' }, { factId: 'SC-06' }],
    links: [
      { label: 'See the Case Studies', href: '/impact/case-studies/', variant: 'primary' },
      { label: 'For Governments', href: '/partner-with-us/governments/', variant: 'outline' },
    ],
    photo: 'general/her-power-laptops-1',
  },
];
