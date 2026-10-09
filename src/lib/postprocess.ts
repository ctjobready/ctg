/**
 * Build-time HTML passes that need the finished page, run for every HTML page by src/middleware.ts and exercised by the
 * self-test in scripts/check-facts.mjs. Pure string functions with no imports, so the gate can load this file directly.
 *
 *  1. orderFootnotes   footnote markers and notes numbered by first appearance in the page (reading order), the Notes list in that
 *                      order, back-links renumbered, and a repeated caveat turned into "Same caveat as note N."
 *  2. dropEmptyNotesBand  the labelled "Notes and sources" band pages wrap <Sources> in, when <Sources> rendered nothing
 *  3. dropDoubledStops the period <Fact> adds to a sentence, removed where the page typed its own punctuation straight after the fact
 *  4. spaceInlineLinks Astro's HTML compression trims the space between a sentence and an inline link written on its own line
 *                      ("welcome.How partnerships work"); one space is put back before `<a class="link">`
 *
 * The passes read markup written by src/components/facts/FootnoteMarker.astro, src/components/facts/Sources.astro,
 * src/lib/faq.ts and src/components/ui/Section.astro. If that markup changes, the passes leave the page as it was and the
 * checks in scripts/check-facts.mjs (reading order, anchors, empty band, glued links) fail the build.
 */

/** `<sup class="fn" data-fact="RC-01"><a href="#fn-3" id="fn-ref-3-2" aria-label="Note 3">3</a></sup>` */
const MARKER_RE = /<sup class="fn" data-fact="([^"]*)"><a href="#fn-(\d+)" id="fn-ref-(\d+)-(\d+)" aria-label="Note \d+">\d+<\/a><\/sup>/g;
const LIST_RE = /(<ol class="sources__list"[^>]*>)([\s\S]*?)(<\/ol>)/g;
const NOTE_RE = /<li class="sources__note" id="fn-(\d+)"[\s\S]*?<\/li>/g;
const BACKLINK_RE = /<a href="#fn-ref-\d+-\d+" aria-label="Back to reference [\d.]+"/g;
const CAVEAT_RE = /<p class="sources__caveat" data-caveat="([^"]*)"([^>]*)>[\s\S]*?<\/p>/;
const EMPTY_NOTES_BAND_RE = /<section class="band [^"]*" aria-label="Notes and sources"[^>]*><div class="container"[^>]*><\/div><\/section>/g;
/**
 * <Fact> adds a period to a sentence that has none (`<span class="fact__stop">.</span>`, before any closing quote and the footnote marker).
 * When the fact's element is followed directly by punctuation the page typed (`<Fact id="X" />.`), the added period goes.
 */
const DOUBLED_STOP_RE = /<span class="fact__stop">\.<\/span>([”’"]*)((?:<sup class="fn" data-fact="[^"]*"><a [^>]*>\d+<\/a><\/sup>)?)(<\/(?:span|p|strong|b|div)>)(?=\s?[.,;:)!?—–])/g;
/** A letter, digit or sentence mark directly followed by an inline link: the space was trimmed. */
const GLUED_LINK_RE = /([\p{L}\p{N}.,;:!?%)”’'"])(<a class="link[ "])/gu;

export function orderFootnotes(html: string): string {
  if (!html.includes('class="fn"') && !html.includes('sources__note')) return html;

  // Number by first appearance. A marker is identified by its old (note, ref) pair; its new ref index counts that note's markers in reading order.
  const newN = new Map<number, number>();
  const seenRefs = new Map<number, number>();
  const newK = new Map<string, number>();
  for (const m of html.matchAll(MARKER_RE)) {
    const oldN = Number(m[2]);
    if (!newN.has(oldN)) newN.set(oldN, newN.size + 1);
    const k = (seenRefs.get(oldN) ?? 0) + 1;
    seenRefs.set(oldN, k);
    newK.set(`${oldN}-${m[4]}`, k);
  }
  // A note no marker points to keeps its relative place, after the numbered ones.
  for (const m of html.matchAll(NOTE_RE)) {
    const oldN = Number(m[1]);
    if (!newN.has(oldN)) newN.set(oldN, newN.size + 1);
  }

  let out = html.replace(MARKER_RE, (_all, id: string, oldN: string, _same: string, oldK: string) => {
    const n = newN.get(Number(oldN)) as number;
    const k = newK.get(`${oldN}-${oldK}`) as number;
    return `<sup class="fn" data-fact="${id}"><a href="#fn-${n}" id="fn-ref-${n}-${k}" aria-label="Note ${n}">${n}</a></sup>`;
  });

  const firstWithCaveat = new Map<string, number>();
  out = out.replace(LIST_RE, (all: string, open: string, inner: string, close: string) => {
    const notes = [...inner.matchAll(NOTE_RE)].map((m) => {
      const n = newN.get(Number(m[1])) as number;
      let note = m[0].replace(/id="fn-\d+"/, `id="fn-${n}"`);
      const total = (note.match(BACKLINK_RE) ?? []).length;
      let i = 0;
      note = note.replace(BACKLINK_RE, () => {
        i++;
        return `<a href="#fn-ref-${n}-${i}" aria-label="Back to reference ${n}${total > 1 ? `.${i}` : ''}"`;
      });
      return { n, html: note };
    });
    if (!notes.length) return all;
    notes.sort((a, b) => a.n - b.n);
    // The first note in reading order prints a caveat in full; later notes with the same caveat point back to it.
    for (const note of notes) {
      note.html = note.html.replace(CAVEAT_RE, (p: string, key: string, attrs: string) => {
        const first = firstWithCaveat.get(key);
        if (first === undefined) {
          firstWithCaveat.set(key, note.n);
          return p;
        }
        return `<p class="sources__same" data-caveat="${key}"${attrs}>Same caveat as <a href="#fn-${first}">note ${first}</a>.</p>`;
      });
    }
    return open + notes.map((x) => x.html).join('') + close;
  });
  return out;
}

export function dropEmptyNotesBand(html: string): string {
  return html.replace(EMPTY_NOTES_BAND_RE, '');
}

export function dropDoubledStops(html: string): string {
  return html.replace(DOUBLED_STOP_RE, '$1$2$3');
}

export function spaceInlineLinks(html: string): string {
  // Leave <script> and <style> text alone; only page markup is touched.
  return html
    .split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>)/gi)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(GLUED_LINK_RE, '$1 $2')))
    .join('');
}

export function postprocessPage(html: string): string {
  return spaceInlineLinks(dropDoubledStops(dropEmptyNotesBand(orderFootnotes(html))));
}
