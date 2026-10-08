import { CAVEATS, fact, sources, type Fact, type Source } from '../data/facts';

/**
 * Per-page footnote collector. Fact markers register fact IDs in render order; <Sources> renders
 * the numbered notes. State lives on `Astro.locals`, which is one object per page render — never
 * module-level state (static builds render many pages in one process).
 */
export interface Note {
  n: number;
  id: string;
  /** Short description of the claim the note belongs to. */
  claim: string;
  /** Caveat class text + base + note, in that order (each optional). */
  parts: string[];
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

  notes(): Note[] {
    return this.order.map((id, i) => noteFor(fact(id), i + 1, this.refs.get(id) ?? 1));
  }
}

/** Does a fact carry a caveat the reader should see (→ show a footnote marker automatically)? */
export function needsFootnote(f: Fact): boolean {
  return Boolean(f.caveat || f.base || f.note);
}

export function noteFor(f: Fact, n: number, refs = 1): Note {
  const parts: string[] = [];
  if (f.caveat) parts.push(CAVEATS[f.caveat]);
  if (f.base) parts.push(f.base);
  if (f.note) parts.push(f.note);
  return {
    n,
    id: f.id,
    claim: f.stat?.label ?? f.text,
    parts,
    sources: f.sourceIds.map((s) => sources[s]).filter(Boolean),
    refs,
  };
}

/** Get (or create) the collector for the current page render. */
export function footnotesFor(astro: { locals: App.Locals }): Footnotes {
  const l = astro.locals;
  if (!l.footnotes) l.footnotes = new Footnotes();
  return l.footnotes;
}
