import { ORG_ID, pageUrl, ref, type JsonLdNode } from '../../../lib/schema';
import { fact } from '../../../data/facts';
import { C14 } from '../../../data/copy';
import { cta } from '../../../lib/mailto';

/** C14 first action (N1): the shared C14 line without its "Your first step: a discovery session." lead (two suitable times for a discovery conversation). */
export const C14_FIRST = C14.firstAction.replace(/^Your first step: a discovery session\. /, '');

/** YouthWIDE execution roadmap phases, in order (visible roadmap and the ItemList JSON-LD share these names). */
export const ROADMAP_PHASES = [
  'Set up and mobilize',
  'Outreach and selection',
  'Training',
  'Mentor, certify and place',
  'Parallel cohorts, track and review',
] as const;

/**
 * "Last updated" date of a program page (doc 09 §3): the day its content last changed, shown on the page and used as JSON-LD dateModified.
 * LAST_UPDATED is the date of the first publication of the program pages; the NU Postgraduate Diploma course pages have not changed since and keep it.
 * A page that changes gets its own entry in PAGE_UPDATED (2026-10-09: the programs index, YouthWIDE, JobReady@Campus, JobReady@Work, NationWIDE;
 * 2026-10-10: those five again, SuperKids and the NU Postgraduate Diploma index, after the round-16 wording changes).
 */
export const LAST_UPDATED = '2026-10-08';
export const PAGE_UPDATED = {
  programs: '2026-10-10',
  youthwide: '2026-10-10',
  campus: '2026-10-10',
  work: '2026-10-10',
  nationwide: '2026-10-10',
  superkids: '2026-10-10',
  nu: '2026-10-10',
} as const;

/** Page-level primary-CTA helper: label + href for a registered key. */
export const ctaFor = (key: Parameters<typeof cta>[0]) => {
  const c = cta(key);
  return { label: c.label, href: c.href };
};

/** Value of a fact's stat (never typed into pages). */
export function statValue(id: string): string {
  const v = fact(id).stat?.value;
  if (!v) throw new Error(`Fact ${id} has no stat`);
  return v;
}

/** Survey proof number for meta descriptions: "47.4% to 77.9%" (OC-01), always with its qualifier in the same sentence. */
export const surveyShort = () => {
  const s = fact('OC-01').stat!;
  return `${s.from} to ${s.value}`;
};

/** schema.org Service node describing a program (provider = CodersTrust). */
export function serviceNode(o: {
  path: string;
  name: string;
  description: string;
  audience: string;
  areaServed?: string[];
}): JsonLdNode {
  return {
    '@type': 'Service',
    '@id': `${pageUrl(o.path)}#service`,
    name: o.name,
    serviceType: 'Youth workforce development',
    description: o.description,
    provider: ref(ORG_ID),
    audience: { '@type': 'Audience', audienceType: o.audience },
    ...(o.areaServed?.length && { areaServed: o.areaServed }),
  };
}
