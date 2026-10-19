/**
 * Page-local helpers for the five audience landing pages (WP5b).
 * Everything here reads the facts register, so a number in a page string can never drift from it.
 */
import { fact } from '../../../data/facts';
import { offerDurationText, parseProgramOptions } from '../../sections/copyText';
import type { CopyBlock } from '../../../data/copy';

/**
 * Pull a phrase out of a fact's canonical text. The first capture group is returned when the
 * pattern has one, otherwise the whole match. Throws at build time when the register no longer
 * contains the phrase, so page copy fails loudly instead of silently diverging from the register.
 */
export function factPart(id: string, re: RegExp): string {
  const m = fact(id).text.match(re);
  if (!m) throw new Error(`factPart: /${re.source}/ not found in ${id}: "${fact(id).text}"`);
  return m[1] ?? m[0];
}


/** A fact's headline stat value ("6–8 weeks", "2 million"). */
export function statValue(id: string): string {
  const v = fact(id).stat?.value;
  if (!v) throw new Error(`statValue: fact ${id} has no stat`);
  return v;
}

/** SEO guard: title (with the " | CodersTrust" suffix) at most 60 characters, description at most 155. */
export function meta(title: string, description: string): { title: string; description: string } {
  const full = `${title} | CodersTrust`;
  if (full.length > 60) throw new Error(`Title is ${full.length} characters (max 60): ${full}`);
  if (description.length > 155) throw new Error(`Description is ${description.length} characters (max 155): ${description}`);
  return { title, description };
}

// Program-design phrases used in page strings, sourced from the register.
export const HOURS = factPart('PD-01', /(\d+) training hours per certification/);
export const TRACKING_MONTHS = factPart('PD-02', /outcome tracking for (\d+) months/);
const tracerNums = factPart('PD-09', /surveys at (\d+, \d+ and \d+) months/).split(/, | and /);
/** "3, 6 and 12 months" */
export const TRACER_MONTHS = `${tracerNums.slice(0, -1).join(', ')} and ${tracerNums[tracerNums.length - 1]} months`;
/** "6–8 weeks" */
export const FIRST_COHORT = statValue('PD-04');
export const NATIONWIDE_TARGET = statValue('IN-01');

/**
 * The grant-funded start sequence as step headings (WP29: every timeline names its starting point), read from PD-04 so no week is retyped:
 * "Discovery (Week 1)", "Co-Design (Week 2)", "Agreement (Week 3)", then "Training Starts 6–8 Weeks After Signing". Week 1 to 3 count from the first
 * conversation; the last window counts from signing. Public procurement timing is a separate line (it is not part of this sequence).
 */
export function grantStartTitles(): [string, string, string, string] {
  const weeks = [...fact('PD-04').text.matchAll(/(Discovery|Co-Design|Agreement) \(Week (\d)\)/g)].map((m) => `${m[1]} (Week ${m[2]})`);
  if (weeks.length !== 3) throw new Error(`grantStartTitles: PD-04 no longer reads "Discovery (Week 1) → Co-Design (Week 2) → Agreement (Week 3)": "${fact('PD-04').text}"`);
  return [weeks[0], weeks[1], weeks[2], `Training Starts ${FIRST_COHORT} After Signing`];
}

/**
 * The grant-funded start sequence with each step's one-line description: the partner hub's "From First Conversation to First Cohort" (WP62; it was "Your First 90 Days") and Home's closing band read these four (WP49, cycle-24 review: Home showed the headings alone, while the hub
 * and the audience pages describe each step). The headings are grantStartTitles(), so no week is retyped.
 */
export function grantStartSteps(): { title: string; text: string }[] {
  const [discovery, codesign, agreement, training] = grantStartTitles();
  return [
    { title: discovery, text: 'A conversation about your goals, priority groups and timeline.' },
    { title: codesign, text: 'We shape tracks, cohorts, safeguarding and reporting with you.' },
    { title: agreement, text: 'Scope, schedule and the pilot scorecard are agreed.' },
    { title: training, text: 'The first cohort begins training; monthly reports follow.' },
  ];
}

/**
 * First-cohort timing line for the contact and local-partner pages (grant-funded pilots): a plan, not a promise. It replaces
 * C14.reminder on those pages; the PD-04 and PD-08 facts it rests on are unchanged.
 */
export const FIRST_COHORT_REMINDER: CopyBlock = {
  text: 'For grant-funded pilots, we plan for the first cohort to begin training 6–8 weeks after signing, and monthly reports follow from the first cohort.',
  facts: ['PD-04', 'PD-08'],
};

/** Sentence-case an inclusion fragment from PD-02, as OfferBand does. */
export function pricingParts(): { inclusions: string[]; separate: string } {
  const text = fact('PD-02').text;
  const inclusions = text
    .split('Standard inclusions: ')[1]
    .split('. Items such as')[0]
    .split(' · ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return {
    inclusions,
    separate: 'Devices, stipends, connectivity and independent evaluation are budgeted separately where a program needs them.',
  };
}

/** Program option rows from PD-05 (Pilot, Scale, National), parsed the way OfferBand parses them. */
export function programOptions(): { name: string; volume: string; duration: string }[] {
  return parseProgramOptions(fact('PD-05').text);
}

/**
 * The three program options (Pilot, Scale, National) as <OfferCards> cards, from PD-05 (WP30c: the funder pages show the options without the standard-inclusions
 * list, which the features band and the FAQ state once). `blurbs` is one line per option; the duration line is PD-05's own, with the National "design option" note.
 */
export function funderOptionCards(
  blurbs: readonly [string, string, string] = ['Prove the model in one country or region.', 'Expand to more cohorts and locations on the pilot’s results.', 'A multi-year national program with government and partners.'],
): { eyebrow: string; title: string; headline: string; meta: string; text: string; facts: string[] }[] {
  return programOptions().map((o, i) => ({ eyebrow: `Option ${i + 1}`, title: o.name, headline: o.volume, meta: offerDurationText(o.name, o.duration), text: blurbs[i], facts: ['PD-05'] }));
}

/** Evidence links shared by the pages (internal routes, resolved by the base-aware helpers). */
export const LINKS = {
  evidence: '/impact/',
  outcomes: '/impact/outcomes-2026/',
  methodology: '/impact/outcomes-2026/#methodology',
  trial: '/impact/independent-evaluation/',
  talentleap: '/our-model/talentleap/',
  model: '/our-model/',
  hub: '/partner-with-us/',
  nationwide: '/programs/youthwide/#governments',
  youthwide: '/programs/youthwide/',
  campus: '/programs/jobready-campus/',
  work: '/programs/jobready-work/',
  platform: '/our-model/jobready-platform/',
  caseWsdfm: '/impact/case-studies/wsdfm-women-freelancers/',
  caseWow: '/impact/case-studies/kosovo-women-in-online-work/',
  caseHerPower: '/impact/case-studies/her-power/',
  caseUndp: '/impact/case-studies/undp-yes-korail/',
} as const;
