import { fact, type Fact } from './facts';
import { HEADLINE, NU_ELIGIBILITY, VALUE_PROPOSITION } from './copy';
import { navGroups, type NavLink } from './nav';
import { cta } from '../lib/mailto';

/**
 * The home hero (WP17, hybrid) and the "Results and Programs" carousel below it (WP13, WP13b; rendered by src/components/sections/HeroSlider.astro,
 * driven by src/scripts/heroSlider.ts). Every figure is read from the facts register at build time (fact(id).stat, or <Fact> for a register
 * sentence); no number is typed here.
 * HOME_HERO is the stable hero: the page's only h1, one value proposition, one primary action, one text link, the audience links and the three
 * strongest proof cards, always visible. HOME_SLIDES are the carousel slides (WP19, item 7): the trial first, then survey income and employment,
 * program results (named programs), speed to earning, reach, government and National University partners, and the programs (employment programs first, SuperKids last).
 * Each slide has one cleared photograph from the registry (src/data/photos.ts, D13 rows in src/data/permissions.json); the hero's is eager, the carousel's lazy.
 * Titles and eyebrows are Title Case (src/lib/titleCase.mjs) and carry no trailing period (WP23). Every carousel slide title is an h2.
 * WP23: the survey and reach slides state their figure in the heading (read from the register, with titleFacts naming the facts); the trial slide gives
 * the offered-place employment and income results before the attenders' income; the placement slide lists all four case-study programs.
 * WP25h: the program-results slide is headed "Results by Program" and says each program reports its own records; UNDP YES, Korail is stated
 * with its own measure (67% found a first job within three months, never "in work"; PR-03), and the WSDFM line says "program records" so it is
 * not read as the trial's follow-up employment (63.1% against 52.8%, a different measure on the evidence band).
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
  /** Fact IDs whose figures the heading states (data-fact on the heading). */
  titleFacts?: string[];
  lead?: string;
  /** Fact IDs the lead states (data-fact on the lead paragraph). */
  leadFacts?: string[];
  /** A register sentence, rendered with <Fact>, in place of the lead. */
  fact?: { id: string; field: 'text' | 'headline' };
  /** One line per item under the lead (a short list of named results); each line names the register facts it states. */
  lines?: { text: string; factIds: string[] }[];
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
const PROGRAM_HREFS = ['/programs/youthwide/', '/programs/jobready-campus/', '/programs/jobready-work/', '/programs/nu-postgraduate-diploma/', '/programs/superkids/'] as const;

function navLink(href: string): NavLink {
  const item = navGroups.flatMap((g) => g.items).find((i) => i.href === href);
  if (!item) throw new Error(`heroSlides: no navigation entry for ${href}`);
  return item;
}

/** Slide 7 names the NU Postgraduate Diploma for individual learners and states admissions' eligibility sentence (NU-01) as the menu does (WP27); the menu's lead-in is "Eligibility:", the slide's is its audience. */
const NU_SLIDE_HREF = '/programs/nu-postgraduate-diploma/';
function slideLink(href: string): NavLink {
  const item = navLink(href);
  return href === NU_SLIDE_HREF ? { ...item, description: `For individual learners: ${NU_ELIGIBILITY}.`, factIds: ['NU-01'] } : item;
}

/** The before-training figure of a survey fact (stat.from), for a caption such as "up from 47.4% before training". */
function before(f: Fact): string {
  const from = f.stat?.from;
  if (!from) throw new Error(`heroSlides: ${f.id} has no stat.from`);
  return from;
}

const discovery = cta('discovery');

/** The trial's employment effect and the nine-trial average, read from the register so no figure is typed here. */
const offeredPoints = fact('RC-02').stat?.numeric;
const nineTrialAverage = /which was ([\d.]+) percentage points/.exec(fact('RC-06a').text)?.[1];
const hours = /was (\d+) hours/.exec(fact('RC-07').text)?.[1];
const incomeAttended = fact('RC-13').stat?.numeric;
/** The trial's estimated income difference for all women offered a place (RC-01's tile), stated before the attenders' figure. */
const incomeOffered = fact('RC-01').stat?.numeric;
if (offeredPoints === undefined || !nineTrialAverage || !hours || incomeAttended === undefined || incomeOffered === undefined) throw new Error('heroSlides: RC-01, RC-02, RC-06a, RC-07 or RC-13 no longer carries the figure a slide reads');
/** Women per 100 offered a place who were in work beyond the control group, as RC-02 rounds it (the [PLAIN-LINE] wording). */
const perHundred = Math.round(offeredPoints);
/** Her Power's tracked base and in-work share, read from PR-05 ("372 of 800 tracked women ... in work (47%)"). */
const herPower = /of (\d+) tracked women.*\((\d+)%\)/.exec(fact('PR-05').text);
if (!herPower) throw new Error('heroSlides: PR-05 no longer reads "... of N tracked women ... (P%)"');
/** The new earners' share and the survey's income figures, for the survey slide headlines. */
const startedSixMonths = fact('OC-05').stat?.value;
const incomeNow = fact('OC-03').stat?.value;
const incomeBefore = fact('OC-03').stat?.from;
const reachFigure = fact('SC-16').stat?.value;
const countries = fact('SC-03').stat?.numeric;
/** GV-12 reads "Six government contracts with training and curriculum scopes covering 31,200+ people; official skills partner of Bangladesh’s National University, onboarding 1.5M+ learners". */
const governmentScope = /^(Six government contracts with training and curriculum scopes) covering ([\d,]+\+ people); (official skills partner of Bangladesh’s National University, onboarding [\d.]+M\+ learners)$/.exec(fact('GV-12').text);
if (!governmentScope) throw new Error('heroSlides: GV-12 no longer reads "Six government contracts ... covering N+ people; official skills partner of ... onboarding N+ learners"');
if (!startedSixMonths || !incomeNow || !incomeBefore || !reachFigure || countries === undefined) throw new Error('heroSlides: OC-03, OC-05, SC-03 or SC-16 no longer carries the figure a slide headline reads');
/** PR-01's label reads "WSDFM: 71% in work"; on this slide it is labelled as program records, apart from the trial's follow-up employment. */
const wsdfmLabel = /^WSDFM: (.+)$/.exec(fact('PR-01').stat?.label ?? '');
if (!wsdfmLabel) throw new Error('heroSlides: PR-01 label no longer reads "WSDFM: <share> in work"');
/** UNDP YES, Korail reports a different measure from the others: the share of the 350 trained who found their first job within three months (PR-03), not the share in work. */
const firstJob = /^of the \d+ trained found their first job within 3 months$/.test(fact('PR-03').stat?.label ?? '');
if (!firstJob) throw new Error('heroSlides: PR-03 label no longer reads "of the N trained found their first job within 3 months"');
const PR_TEXT = {
  wsdfm: `WSDFM program records: ${wsdfmLabel[1]}.`,
  wow: `${fact('PR-02').stat?.label}.`,
  yes: `UNDP YES, Korail: ${fact('PR-03').stat?.value} found a first job within three months.`,
  herPower: `Her Power: ${herPower[2]}% of ${herPower[1]} tracked women in work.`,
};

/** The stable home hero. */
export const HOME_HERO = {
  title: HEADLINE.home,
  lead: VALUE_PROPOSITION.home,
  audience: [
    { label: 'Development Partners', href: '/partner-with-us/development-partners/' },
    { label: 'Governments', href: '/partner-with-us/governments/' },
    { label: 'Foundations', href: '/partner-with-us/foundations/' },
    { label: 'Investors', href: '/partner-with-us/investors/' },
  ],
  primary: { label: discovery.label, href: discovery.href },
  secondary: { label: 'See the Evidence', href: '/impact/' },
  photo: 'general/women-learners-classroom',
  /** The three proof cards: the trial, the survey, the scale. A card's own `value` and `caption` replace the register's stat value and label. */
  proof: [
    {
      eyebrow: 'Randomized Trial',
      factId: 'RC-02',
      value: `+${offeredPoints}`,
      unit: 'percentage points',
      caption: `For every 100 women offered a place in a ${hours}-hour predecessor program, about ${perHundred} more were in work than in the control group.`,
    },
    { eyebrow: 'Impact Survey 2026', factId: 'OC-01' },
    { eyebrow: 'Reach Since 2014', factId: 'SC-16' },
  ] as { eyebrow: string; factId: string; value?: string; unit?: string; caption?: string }[],
};

export const HOME_SLIDES: HeroSlide[] = [
  {
    id: 'evidence',
    eyebrow: 'Independent Evaluation',
    title: `About ${perHundred} More Women in Work for Every 100 Offered a Place`,
    lead: `A randomized trial by BIGD (BRAC University) of CodersTrust’s predecessor WSDFM program found women offered a place were ${offeredPoints} percentage points more likely to be employed, and their monthly income was an estimated ${incomeOffered}% higher than the control group’s. For women who attended, income was ${incomeAttended}% higher.`,
    leadFacts: ['RC-01', 'RC-02', 'RC-13'],
    proof: {
      factId: 'RC-06a',
      caption: () => `Employment effect for women offered a place: +${offeredPoints} percentage points, against ${nineTrialAverage} on average across nine vocational-training trials.`,
    },
    links: [{ label: 'See the Trial', href: '/impact/independent-evaluation/', variant: 'primary' }],
    photo: 'general/classroom-girls',
  },
  {
    id: 'outcomes',
    eyebrow: 'Impact Survey 2026',
    title: `Median Income: ${incomeBefore} Before Training, ${incomeNow} at the October 2026 Survey`,
    titleFacts: ['OC-03'],
    lead: 'Among surveyed completers: median monthly income, and share employed, before training and at the October 2026 survey.',
    stats: [
      { factId: 'OC-03', caption: (f) => `median monthly income among surveyed completers, up from ${before(f)} before training` },
      { factId: 'OC-01', caption: (f) => `employed among surveyed completers at the October 2026 survey, up from ${before(f)} before training` },
    ],
    links: [{ label: 'Read the Impact Survey 2026', href: '/impact/outcomes-2026/', variant: 'primary' }],
    photo: 'general/woman-learner-laptop',
  },
  {
    id: 'placement',
    eyebrow: 'Program Records',
    title: 'Results by Program',
    lead: 'Four programs, each with its partner, with results from their own program records.',
    lines: [
      { text: PR_TEXT.wsdfm, factIds: ['PR-01'] },
      { text: PR_TEXT.wow, factIds: ['PR-02'] },
      { text: PR_TEXT.yes, factIds: ['PR-03', 'PR-06'] },
      { text: PR_TEXT.herPower, factIds: ['PR-05'] },
    ],
    links: [{ label: 'See the Case Studies', href: '/impact/case-studies/', variant: 'primary' }],
    photo: 'general/yes-trainees-group',
  },
  {
    id: 'fast-to-earning',
    eyebrow: 'Impact Survey 2026',
    title: `${startedSixMonths} of Surveyed Earners Started Within Six Months`,
    titleFacts: ['OC-05'],
    lead: 'Among surveyed completers who first earned during or after training, most started within six months.',
    leadFacts: ['OC-05'],
    stats: [{ factId: 'OC-05' }],
    links: [{ label: 'See When Completers First Earn', href: '/impact/outcomes-2026/', variant: 'primary' }],
    photo: 'general/lab-women-screen',
  },
  {
    id: 'scale',
    eyebrow: 'Impact at Scale',
    title: `${reachFigure} Young People Trained in ${countries} Countries and Territories`,
    titleFacts: ['SC-16', 'SC-03'],
    lead: fact('SC-03').stat?.detail,
    leadFacts: ['SC-03'],
    links: [{ label: 'Explore Global Reach', href: '/impact/global-reach/', variant: 'primary' }],
    photo: 'general/albania-trainees-group', // WP21: a photograph from one of the programs abroad; the madrasah photograph is no longer a placement for this slide
  },
  {
    id: 'government-trust',
    eyebrow: 'Government and University Partners',
    title: 'Government Contracts and National University Partnership',
    // WP25h: the contracts' scope is stated as scope ("for 31,200+ people (contract scope, not people trained)"), and the National University sentence stays as registered.
    lead: `${governmentScope[1]} for ${governmentScope[2]} (contract scope, not people trained). ${governmentScope[3][0].toUpperCase()}${governmentScope[3].slice(1)}.`,
    leadFacts: ['GV-12'],
    links: [{ label: 'For Governments', href: '/partner-with-us/governments/', variant: 'primary' }],
    photo: 'general/nu-affiliation-group',
  },
  {
    id: 'programs',
    eyebrow: 'Our Programs',
    title: 'Find the Program for Your Partnership',
    // No lead: the title and the five program links say it, and a lead would make this the tallest slide by more than the layout test allows (WP19).
    programs: PROGRAM_HREFS.map(slideLink),
    links: [{ label: 'Explore Programs', href: '/programs/', variant: 'primary' }],
    photo: 'general/computer-lab-rows',
  },
];
