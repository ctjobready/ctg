/**
 * Page-local helpers for the five audience landing pages (WP5b).
 * Everything here reads the facts register, so a number in a page string can never drift from it.
 */
import { CAVEATS, fact, type CaveatClass } from '../../../data/facts';
import type { FaqAudience } from '../../../data/faqs';

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

/** Same as factPart, for a caveat class text (for example the randomized-trial population). */
export function caveatPart(cls: CaveatClass, re: RegExp): string {
  const m = CAVEATS[cls].match(re);
  if (!m) throw new Error(`caveatPart: /${re.source}/ not found in caveat ${cls}`);
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

/**
 * FAQ lookup scope for pages whose question set (doc 04 §4.x 9b) crosses the audience tags in
 * src/data/faqs.ts. The "foundations" tag is a superset of every id used on P4 to P7; the
 * questions actually shown are always selected explicitly with `ids`.
 */
export const FAQ_SCOPE: FaqAudience = 'foundations';

// Program-design phrases used in page strings, sourced from the register.
export const HOURS = factPart('PD-01', /(\d+) training hours per certification/);
export const TRACKING_MONTHS = factPart('PD-02', /outcome tracking for (\d+) months/);
const tracerNums = factPart('PD-09', /tracers at ([\d/]+) months/).split('/');
/** "3, 6 and 12 months" */
export const TRACER_MONTHS = `${tracerNums.slice(0, -1).join(', ')} and ${tracerNums[tracerNums.length - 1]} months`;
/** "6–8 weeks" */
export const FIRST_COHORT = statValue('PD-04');
export const NATIONWIDE_TARGET = statValue('IN-01');

/** Sentence-case an inclusion fragment from PD-02, as OfferBand does. */
export function pricingParts(): { lead: string; inclusions: string[]; separate: string } {
  const text = fact('PD-02').text;
  const inclusions = text
    .split('Standard inclusions: ')[1]
    .split('. Items such as')[0]
    .split(' · ')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));
  return {
    lead: 'Pricing is set per program, and we share an indicative budget in the discovery session.',
    inclusions,
    separate: 'Devices, stipends, connectivity and independent evaluation are budgeted separately where a program needs them.',
  };
}

/** Program option rows from PD-05 (Pilot, Scale, National), parsed the way OfferBand parses them. */
export function programOptions(): { name: string; volume: string; duration: string }[] {
  const pd05 = fact('PD-05').text.split(': ').slice(1).join(': ');
  return pd05.split('; ').map((chunk) => {
    const [name, ...rest] = chunk.split(' ');
    const [volume, ...tail] = rest.join(' ').split(', ');
    return { name, volume, duration: tail.join(', ') };
  });
}

/** Evidence links shared by the pages (internal routes, resolved by the base-aware helpers). */
export const LINKS = {
  evidence: '/impact/',
  outcomes: '/impact/outcomes-2026/',
  methodology: '/impact/outcomes-2026/#methodology',
  trial: '/impact/independent-evaluation/',
  talentleap: '/our-model/talentleap/',
  model: '/our-model/',
  governance: '/about/governance/',
  hub: '/partner-with-us/',
  nationwide: '/programs/nationwide/',
  youthwide: '/programs/youthwide/',
  campus: '/programs/jobready-campus/',
  work: '/programs/jobready-work/',
  platform: '/our-model/jobready-platform/',
  caseWsdfm: '/impact/case-studies/wsdfm-women-freelancers/',
  caseWow: '/impact/case-studies/kosovo-women-in-online-work/',
  caseHerPower: '/impact/case-studies/her-power/',
  caseUndp: '/impact/case-studies/undp-yes-korail/',
} as const;
