import { faqItems } from '../../../lib/faq';
import { faqPage, type JsonLdNode } from '../../../lib/schema';
import { linkAttrs } from '../../../lib/url';
import { stripHtml } from '../../../lib/format';
import type { FaqAudience } from '../../../data/faqs';

/**
 * Page-local FAQ composition: entries from the shared FAQ v1.2 (`faqs.ts`) taken from whichever audience
 * list holds them, plus page-specific entries (the "right for you / not right for you" objection 9a and
 * admissions notes). One source of truth feeds both the visible accordion and the FAQPage JSON-LD.
 */
export type FaqSource =
  | { audience: FaqAudience; id: string }
  | { q: string; html: string; evidence?: string[] };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline link for custom answers (base-aware, external-link rel). */
export function anchor(href: string, label: string): string {
  const a = linkAttrs(href);
  return `<a href="${esc(a.href)}"${a.rel ? ` rel="${a.rel}"` : ''}>${esc(label)}</a>`;
}

/** Plain-text paragraph for custom answers. */
export const para = (text: string) => esc(text);

export function buildFaq(sources: FaqSource[], astro?: { locals: App.Locals }): { q: string; a: string }[] {
  return sources.map((s) => {
    if ('audience' in s) {
      const item = faqItems(s.audience, [s.id], astro)[0];
      if (!item) throw new Error(`FAQ ${s.id} not found in audience ${s.audience}`);
      return item;
    }
    const ev = s.evidence?.length ? ` data-fact="${s.evidence.join(' ')}"` : '';
    return { q: s.q, a: `<p${ev}>${s.html}</p>` };
  });
}

/** FAQPage node built from the same entries (no footnote markers in the text). */
export function faqNode(sources: FaqSource[], path: string): JsonLdNode {
  return faqPage(
    buildFaq(sources).map((i) => ({ q: i.q, a: stripHtml(i.a) })),
    path,
  );
}
