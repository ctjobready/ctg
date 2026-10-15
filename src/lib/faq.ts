import { faqsFor, type Faq, type FaqAudience } from '../data/faqs';
import { faqPage } from './schema';
import { linkAttrs } from './url';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * FAQs for an audience as Accordion items (answers wrapped in <p data-fact="…evidence ids…">);
 * optional id filter / order. An FAQ answer is plain text: no markers, no source list. A `link` (WP36) closes the answer as its last sentence, the whole sentence being the link ("See what a partnership includes.");
 * faqPage() strips the markup for the JSON-LD, so the structured answer reads the same words as the page ("… in the discovery session. See what a partnership includes."), which scripts/validate-jsonld.mjs
 * requires. The full stop is inside the link on purpose: stripHtml turns every tag into a space, so a stop outside it would read "includes ." in the JSON-LD.
 * An `inlineLink` (WP39) turns one phrase inside the answer into a link ("See <a>What JobReady Does</a> above …"); the words around it are the same in the page and in the JSON-LD, because stripHtml collapses the
 * spaces the tags leave.
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
  return list.map((f) => ({
    q: f.q,
    a: `<p data-fact="${f.evidence.join(' ')}">${answerHtml(f)}${f.link ? ` <a href="${esc(linkAttrs(f.link.href).href)}">${esc(f.link.label)}.</a>` : ''}</p>`,
  }));
}

/** The answer text, escaped, with its `inlineLink` phrase (WP39) turned into a link; the phrase must appear exactly once or the build fails. */
function answerHtml(f: Faq): string {
  const text = esc(f.a);
  if (!f.inlineLink) return text;
  const phrase = esc(f.inlineLink.text);
  if (text.split(phrase).length !== 2) throw new Error(`faqItems: the link text "${f.inlineLink.text}" must appear exactly once in the answer ${f.id}`);
  return text.replace(phrase, () => `<a href="${esc(linkAttrs(f.inlineLink!.href).href)}">${phrase}</a>`);
}

/** FAQPage JSON-LD node for the same FAQs — pass it to the layout's `jsonLd` prop (one @graph per page). */
export function faqJsonLd(audience: FaqAudience, path: string, ids?: string[]) {
  return faqPage(faqItems(audience, ids), path);
}
