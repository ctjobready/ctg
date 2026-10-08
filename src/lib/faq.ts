import { faqsFor, type FaqAudience } from '../data/faqs';
import { fact } from '../data/facts';
import { footnotesFor } from './footnotes';
import { faqPage } from './schema';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * FAQs for an audience as Accordion items (answers wrapped in <p data-fact="…evidence ids…">);
 * optional id filter / order. Pass `astro` (the calling component's Astro global) to append footnote
 * markers for the figures that carry a caveat (survey, randomized trial, program data, external).
 */
export function faqItems(audience: FaqAudience, ids?: string[], astro?: { locals: App.Locals }): { q: string; a: string }[] {
  let list = faqsFor(audience);
  if (ids) list = ids.map((id) => list.find((f) => f.id === id) ?? faqsFor('all').find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f);
  return list.map((f) => {
    let marks = '';
    if (astro) {
      const fn = footnotesFor(astro);
      for (const id of f.cite ?? []) {
        fact(id); // throws on unknown IDs
        const { n, k } = fn.register(id);
        marks += `<sup class="fn" data-fact="${id}"><a href="#fn-${n}" id="fn-ref-${n}-${k}" aria-label="Note ${n}">${n}</a></sup>`;
      }
    }
    return { q: f.q, a: `<p data-fact="${f.evidence.join(' ')}">${esc(f.a)}${marks}</p>` };
  });
}

/** FAQPage JSON-LD node for the same FAQs — pass it to the layout's `jsonLd` prop (one @graph per page). */
export function faqJsonLd(audience: FaqAudience, path: string, ids?: string[]) {
  return faqPage(faqItems(audience, ids), path);
}
