import { faqs } from '../../../data/faqs';
import { fact } from '../../../data/facts';
import { footnotesFor } from '../../../lib/footnotes';

/**
 * FAQ items by id, drawn from the whole FAQ v1.2 bank (not filtered by audience). The shared
 * `faqItems()` filters by audience, and no audience covers every question (the partner hub shows
 * Q1–Q14; Investors needs Q2, which the investors audience does not list), so page-local code builds
 * the same markup from the same data: answers wrapped in <p data-fact="…evidence ids…"> with a footnote
 * marker for each cited fact that carries a caveat.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function faqItemsByIds(ids: string[], astro?: { locals: App.Locals }): { q: string; a: string }[] {
  return ids.map((id) => {
    const f = faqs.find((x) => x.id === id);
    if (!f) throw new Error(`faqItemsByIds: unknown FAQ id ${id}`);
    let marks = '';
    if (astro) {
      const fn = footnotesFor(astro);
      for (const cid of f.cite ?? []) {
        fact(cid); // throws on unknown IDs
        const { n, k } = fn.register(cid);
        marks += `<sup class="fn" data-fact="${cid}"><a href="#fn-${n}" id="fn-ref-${n}-${k}" aria-label="Note ${n}">${n}</a></sup>`;
      }
    }
    return { q: f.q, a: `<p data-fact="${f.evidence.join(' ')}">${esc(f.a)}${marks}</p>` };
  });
}
