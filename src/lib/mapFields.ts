import type { ProgramLocation } from '../data/countries';

/**
 * WorldMap equivalence contract (planning v1.2 R2-M14): the SVG pins are supplementary (hidden from the
 * accessibility tree, not focus targets), so the always-visible table must contain every detail any
 * pin tooltip shows. Both views are built from these two functions and `assertMapEquivalence` fails
 * the build if a tooltip field is ever missing from its table row.
 */
export interface TooltipFields {
  name: string;
  years: string;
  targetGroup: string;
  skills: string;
  funder?: string;
  note?: string;
}
export interface TableRow {
  location: string;
  region: string;
  years: string;
  targetGroup: string;
  skills: string;
  funderNote: string;
}

export const tooltipFields = (l: ProgramLocation): TooltipFields => ({
  name: l.name,
  years: l.years,
  targetGroup: l.targetGroup,
  skills: l.skills,
  funder: l.funder,
  note: l.note,
});

export const tableRow = (l: ProgramLocation): TableRow => ({
  location: l.name,
  region: l.region,
  years: l.years,
  targetGroup: l.targetGroup,
  skills: l.skills,
  funderNote: [l.funder && `Funder: ${l.funder}`, l.note].filter(Boolean).join(' · ') || '—',
});

/** Returns the list of tooltip details that the table row does not contain (empty = equivalent). */
export function mapEquivalenceGaps(items: ProgramLocation[]): string[] {
  const gaps: string[] = [];
  for (const l of items) {
    const t = tooltipFields(l);
    const r = tableRow(l);
    const check = (field: string, tip: string | undefined, cell: string) => {
      if (tip && !cell.includes(tip)) gaps.push(`${l.id}: tooltip ${field} "${tip}" missing from table`);
    };
    check('name', t.name, r.location);
    check('years', t.years, r.years);
    check('targetGroup', t.targetGroup, r.targetGroup);
    check('skills', t.skills, r.skills);
    check('funder', t.funder, r.funderNote);
    check('note', t.note, r.funderNote);
  }
  return gaps;
}

export function assertMapEquivalence(items: ProgramLocation[]): void {
  const gaps = mapEquivalenceGaps(items);
  if (gaps.length) throw new Error(`WorldMap equivalence contract broken:\n  ${gaps.join('\n  ')}`);
}
