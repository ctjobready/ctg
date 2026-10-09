import { CAVEATS, fact, sources, type Fact, type Source } from '../data/facts';

/**
 * Per-page footnote collector. Fact markers register fact IDs as the page renders; <Sources> renders the notes. State lives on
 * `Astro.locals`, which is one object per page render — never module-level state (static builds render many pages in one process).
 *
 * Numbering. The numbers handed out here follow the order in which components happen to render, which is not always the order a
 * reader meets the markers (a page's frontmatter can build FAQ answers, with their markers, before the body renders). The reading
 * order is therefore settled once per page, after rendering, by `orderFootnotes()` in src/lib/postprocess.ts (run by
 * src/middleware.ts): markers and notes are numbered by first appearance in the page, the Notes list follows that order, and a
 * repeated caveat becomes "Same caveat as note N." scripts/check-facts.mjs fails the build for any page where that did not happen.
 */
export interface Note {
  n: number;
  id: string;
  /** What the note annotates: a phrase that stands alone (fact.claim, else the stat label, else the full text). */
  claim: string;
  /** Caveat text (register v1.1 class text, or the fact's own `caveatText`), if the fact has one. */
  caveat?: string;
  /**
   * Identity of the caveat text for de-duplication: the class letter, or `fact:<ID>` when the fact words its own caveat.
   * Notes that share a key print the caveat once (the first in reading order) and "Same caveat as note N." afterwards.
   */
  caveatKey?: string;
  /** Public plain-language extra note, if any. */
  footnote?: string;
  /** Sample base (n), if the register gives one. */
  base?: string;
  /** Public citations, deduplicated. */
  sources: Source[];
  /** Number of in-page references (for back-links). */
  refs: number;
}

export class Footnotes {
  private order: string[] = [];
  private refs = new Map<string, number>();
  private certNoteShown = false;

  /** Register a reference to a fact; returns its note number and the 1-based ref index. */
  register(id: string): { n: number; k: number } {
    let i = this.order.indexOf(id);
    if (i === -1) {
      this.order.push(id);
      i = this.order.length - 1;
    }
    const k = (this.refs.get(id) ?? 0) + 1;
    this.refs.set(id, k);
    return { n: i + 1, k };
  }

  get size(): number {
    return this.order.length;
  }

  /** The numbered notes, in registration order (the reading order is applied after rendering; see the class comment). */
  notes(): Note[] {
    return this.order.map((id, i) => noteFor(fact(id), i + 1, this.refs.get(id) ?? 1));
  }

  /**
   * Claim the page's one certification note (messaging framework rule 13). True for the first caller on a page, false after:
   * <CertNote> and the facts that name vendor certifications call this, so the note appears once, beside the first naming.
   */
  claimCertNote(): boolean {
    if (this.certNoteShown) return false;
    this.certNoteShown = true;
    return true;
  }
}

/** Does a fact carry a caveat the reader should see (→ show a footnote marker automatically)? */
export function needsFootnote(f: Fact): boolean {
  return Boolean(f.caveat || f.caveatText || f.base || f.footnote);
}

export function noteFor(f: Fact, n: number, refs = 1): Note {
  const seen = new Set<string>();
  const cites: Source[] = [];
  for (const id of f.sourceIds) {
    const s = sources[id];
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      cites.push(s);
    }
  }
  return {
    n,
    id: f.id,
    claim: f.claim ?? f.stat?.label ?? f.text,
    caveat: f.caveatText ?? (f.caveat ? CAVEATS[f.caveat] : undefined),
    caveatKey: f.caveatText ? `fact:${f.id}` : f.caveat,
    footnote: f.footnote,
    base: f.base,
    sources: cites,
    refs,
  };
}

/** Get (or create) the collector for the current page render. */
export function footnotesFor(astro: { locals: App.Locals }): Footnotes {
  const l = astro.locals;
  if (!l.footnotes) l.footnotes = new Footnotes();
  return l.footnotes;
}
