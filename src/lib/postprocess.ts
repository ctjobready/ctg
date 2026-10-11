/**
 * Build-time HTML passes that need the finished page, run for every HTML page by src/middleware.ts and exercised by the
 * self-test in scripts/check-facts.mjs. Pure string functions with no imports, so the gate can load this file directly.
 *
 *  1. keepOneCertNote  the non-affiliation note (rule 13) prints once per page: the first copy stays, later copies go
 *  2. dropDoubledStops the period <Fact> adds to a sentence, removed where the page typed its own punctuation straight after the fact
 *  3. spaceInlineLinks Astro's HTML compression trims the space between a sentence and an inline link written on its own line
 *                      ("welcome.How partnerships work"); one space is put back before `<a class="link">`
 *
 * The passes read markup written by src/components/ui/CertNote.astro and src/components/facts/Fact.astro. If that markup
 * changes, the passes leave the page as it was and the checks in scripts/check-facts.mjs fail the build.
 */

/** A rendered CertNote: `<p class="certnote" data-cert-note>…</p>` or the `span` form. */
const CERT_NOTE_RE = /<(p|span)\b[^>]*\bdata-cert-note\b[^>]*>[^<]*<\/\1>/g;
/**
 * <Fact> adds a period to a sentence that has none (`<span class="fact__stop">.</span>`, before any closing quote).
 * When the fact's element is followed directly by punctuation the page typed (`<Fact id="X" />.`), the added period goes.
 */
const DOUBLED_STOP_RE = /<span class="fact__stop">\.<\/span>([”’"]*)(<\/(?:span|p|strong|b|div)>)(?=\s?[.,;:)!?—–])/g;
/** A letter, digit or sentence mark directly followed by an inline link: the space was trimmed. */
const GLUED_LINK_RE = /([\p{L}\p{N}.,;:!?%)”’'"])(<a class="link[ "])/gu;

export function keepOneCertNote(html: string): string {
  let seen = false;
  return html.replace(CERT_NOTE_RE, (note) => {
    if (seen) return '';
    seen = true;
    return note;
  });
}

export function dropDoubledStops(html: string): string {
  return html.replace(DOUBLED_STOP_RE, '$1$2');
}

export function spaceInlineLinks(html: string): string {
  // Leave <script> and <style> text alone; only page markup is touched.
  return html
    .split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/gi)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(GLUED_LINK_RE, '$1 $2')))
    .join('');
}

export function postprocessPage(html: string): string {
  return spaceInlineLinks(dropDoubledStops(keepOneCertNote(html)));
}
