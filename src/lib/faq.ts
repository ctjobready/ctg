import { faqsFor, type FaqAudience } from '../data/faqs';
import { faqPage } from './schema';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** FAQs for an audience as Accordion items (answers wrapped in <p>); optional id filter / order. */
export function faqItems(audience: FaqAudience, ids?: string[]): { q: string; a: string }[] {
  let list = faqsFor(audience);
  if (ids) list = ids.map((id) => list.find((f) => f.id === id) ?? faqsFor('all').find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f);
  return list.map((f) => ({ q: f.q, a: `<p>${esc(f.a)}</p>` }));
}

/** FAQPage JSON-LD node for the same FAQs — pass it to the layout's `jsonLd` prop (one @graph per page). */
export function faqJsonLd(audience: FaqAudience, path: string, ids?: string[]) {
  return faqPage(faqItems(audience, ids), path);
}
