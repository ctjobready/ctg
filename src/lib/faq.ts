import { faqsFor, type FaqAudience } from '../data/faqs';
import { faqPage } from './schema';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * FAQs for an audience as Accordion items (answers wrapped in <p data-fact="…evidence ids…">);
 * optional id filter / order. An FAQ answer is plain text: no markers, no source list.
 */
export function faqItems(audience: FaqAudience, ids?: string[]): { q: string; a: string }[] {
  let list = faqsFor(audience);
  if (ids) {
    // An id outside the audience's own 9b list is still served from the full bank (`all`) or from the page-specific variants (e.g. Q8-employer); an unknown id fails the build.
    const bank = [...faqsFor('all'), ...faqsFor('variants')];
    list = ids.map((id) => {
      const f = list.find((x) => x.id === id) ?? bank.find((x) => x.id === id);
      if (!f) throw new Error(`faqItems: unknown FAQ id ${id}`);
      return f;
    });
  }
  return list.map((f) => ({ q: f.q, a: `<p data-fact="${f.evidence.join(' ')}">${esc(f.a)}</p>` }));
}

/** FAQPage JSON-LD node for the same FAQs — pass it to the layout's `jsonLd` prop (one @graph per page). */
export function faqJsonLd(audience: FaqAudience, path: string, ids?: string[]) {
  return faqPage(faqItems(audience, ids), path);
}
