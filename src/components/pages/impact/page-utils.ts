import { fact } from '../../../data/facts';
import { cta as libCta } from '../../../lib/mailto';
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

/** `report` CTA: the shared library carries the partner-edition wording of messaging framework §7. */
export function reportCta() {
  const { label, href } = libCta('report');
  return { label, href };
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
