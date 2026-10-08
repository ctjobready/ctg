import { fact } from '../../../data/facts';
import { CTAS } from '../../../data/ctas';
import { cta as libCta, mailto, bodyTemplate } from '../../../lib/mailto';
import { article, ref, ORG_ID, type JsonLdNode } from '../../../lib/schema';

/** Meta description guard: ≤ 155 characters (doc 09). */
export function desc(text: string): string {
  if (text.length > 155) throw new Error(`meta description is ${text.length} characters (max 155): ${text}`);
  return text;
}
/** Title guard: "<title> | CodersTrust" must stay within 60 characters. */
export function title(text: string): string {
  if (text.length + ' | CodersTrust'.length > 60) throw new Error(`title is too long: ${text}`);
  return text;
}

/** Display figure from the register (never typed on a page). */
export const val = (id: string, field: 'value' | 'from' | 'label' = 'value'): string => {
  const v = fact(id).stat?.[field];
  if (v === undefined) throw new Error(`fact ${id} has no stat.${field}`);
  return v;
};

/**
 * `report` CTA with the partner-edition wording of messaging framework §7
 * ("Request the Impact Report 2026 (partner edition)"); the shared CTA library still carries the
 * earlier label, so the label and subject are set here (shared-code change requested in the report).
 */
export function reportCta() {
  const def = CTAS.report;
  return {
    label: 'Request the Impact Report 2026 (partner edition)',
    href: mailto({ subject: 'Impact Report 2026 (partner edition) request', body: bodyTemplate(def.body ?? []) }),
  };
}
export const discoveryCta = () => libCta('discovery');
export const fundingCta = () => libCta('funding');

/** Article node authored by the organization (or a named team) with an optional page-specific author. */
export function articleNode(o: { path: string; headline: string; description: string; datePublished: string; dateModified?: string; author?: string; about?: JsonLdNode; citation?: JsonLdNode[] }): JsonLdNode {
  const node = article({ path: o.path, headline: o.headline, description: o.description, datePublished: o.datePublished, dateModified: o.dateModified });
  return {
    ...node,
    ...(o.author && { author: { '@type': 'Organization', name: o.author, parentOrganization: ref(ORG_ID) } }),
    ...(o.about && { about: o.about }),
    ...(o.citation && { citation: o.citation }),
  };
}
