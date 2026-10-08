import { CAVEATS, fact, sources, type Fact, type Source } from '../data/facts';

/**
 * Per-page footnote collector. Fact markers register fact IDs in render order; <Sources> renders
 * the numbered notes. State lives on `Astro.locals`, which is one object per page render — never
 * module-level state (static builds render many pages in one process).
 */
export interface Note {
  n: number;
  id: string;
  /** Short description of the claim the note belongs to (public stat label or fact text). */
  claim: string;
  /** Caveat class text (register v1.1), if the fact has one. */
  caveat?: string;
  /**
   * Set when an earlier note on the same page already carries this exact caveat text: that note's number.
   * <Sources> then prints "Same caveat as note N." (linked) instead of repeating the caveat in full.
   */
  caveatSameAs?: number;
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

  /**
   * The numbered notes in render order. A caveat is printed in full at its first occurrence; every later note with the
   * identical caveat text gets `caveatSameAs` (the first note's number) so the list does not repeat long identical text.
   * Each note keeps its own claim, footnote, base and sources.
   */
  notes(): Note[] {
    const firstWithCaveat = new Map<string, number>();
    return this.order.map((id, i) => {
      const note = noteFor(fact(id), i + 1, this.refs.get(id) ?? 1);
      if (note.caveat) {
        const first = firstWithCaveat.get(note.caveat);
        if (first === undefined) firstWithCaveat.set(note.caveat, note.n);
        else note.caveatSameAs = first;
      }
      return note;
    });
  }
}

/** Does a fact carry a caveat the reader should see (→ show a footnote marker automatically)? */
export function needsFootnote(f: Fact): boolean {
  return Boolean(f.caveat || f.base || f.footnote);
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
    claim: f.stat?.label ?? f.text,
    caveat: f.caveat ? CAVEATS[f.caveat] : undefined,
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
