import { ORG_ID, pageUrl, ref, type JsonLdNode } from '../../../lib/schema';
import { fact } from '../../../data/facts';
import { C14 } from '../../../data/copy';
import { cta } from '../../../lib/mailto';

/** C14 first action (N1): "In your enquiry, include two suitable times for a discovery conversation." */
export const C14_FIRST = C14.firstAction.replace(/^Your first step: a discovery session\. /, '');

/** YouthWIDE execution roadmap phases, in order (visible roadmap and the ItemList JSON-LD share these names). */
export const ROADMAP_PHASES = [
  'Set up and mobilize',
  'Outreach and selection',
  'Training',
  'Mentor, certify and place',
  'Parallel cohorts, track and review',
] as const;

/** "Last updated" date shown on every program page (doc 09 §3). */
export const LAST_UPDATED = '2026-10-08';

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
