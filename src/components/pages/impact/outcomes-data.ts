/**
 * Published survey aggregates for /impact/outcomes-2026/ and the downloadable CSV.
 *
 * Source: CodersTrust Impact Survey, October 2026 (surveyed completers; chart percentages from the Impact Report).
 * Headline figures live in the facts dataset (OC-01 … OC-09); this module holds only the
 * distributions behind the charts.
 *
 * INTERNAL ONLY: the `n` counts and `base` totals below are reconstructed from the published percentages. They
 * are never rendered or exported; their only job is the small-cell rule (any cell under MIN_CELL is folded into
 * "Other districts" or a neighboring band on the page, and suppressed in the CSV). Only `statedBase`, the base
 * the Impact Report itself states (321, 277, 170, and 34 of 47), may be shown. Every percentage reproduces a
 * register headline (checked in `assertConsistent`).
 */
export interface Cell {
  label: string;
  n: number;
}
export interface Dist {
  id: string;
  measure: string;
  base: number;
  /** Base as stated in the Impact Report; undefined = not stated (never rendered or exported). */
  statedBase?: number;
  cells: Cell[];
}

const pct = (n: number, base: number) => Math.round((n / base) * 1000) / 10;
export const percent = pct;

/** Every published cell must rest on at least this many respondents. */
export const MIN_CELL = 10;

// ---- Who responded (OC-09) -------------------------------------------------------------------
export const AGE: Dist = {
  id: 'OC-09-age',
  measure: 'Respondents by age group',
  base: 473,
  cells: [
    { label: '15–24', n: 72 },
    { label: '25–35', n: 253 },
    { label: '36–45', n: 110 },
    { label: '46 and over', n: 38 },
  ],
};

/** SSC (8) and PhD (5) rest on fewer than 10 respondents, so they are merged into neighbouring bands. */
export const EDUCATION: Dist = {
  id: 'OC-09-education',
  measure: 'Respondents by highest education',
  base: 474,
  cells: [
    { label: 'HSC or below', n: 52 },
    { label: 'Diploma', n: 21 },
    { label: 'Bachelor’s degree', n: 162 },
    { label: 'Master’s degree or higher', n: 239 },
  ],
};

const DISTRICTS_RAW: Cell[] = [
  { label: 'Dhaka', n: 176 },
  { label: 'Chattogram', n: 39 },
  { label: 'Barishal', n: 27 },
  { label: 'Comilla', n: 15 },
  { label: 'Narayanganj', n: 14 },
  { label: 'Khulna', n: 11 },
  { label: 'Bogura', n: 10 },
  { label: 'Rajshahi', n: 10 },
];
const DISTRICT_BASE = 474;
const named = DISTRICTS_RAW.reduce((s, c) => s + c.n, 0);
/** Districts with fewer than 10 respondents (and every district outside the list) fold into "Other districts". */
export const DISTRICTS: Dist = {
  id: 'OC-09-district',
  measure: 'Respondents by district of residence',
  base: DISTRICT_BASE,
  cells: [...DISTRICTS_RAW, { label: 'Other districts', n: DISTRICT_BASE - named }],
};

// ---- Employment by type (OC-04, base 321) ----------------------------------------------------
export const EMPLOYMENT_BASE = 321;
export const EMPLOYMENT_TYPES = [
  { label: 'Salaried employment', before: 123, after: 171 },
  { label: 'Freelancing', before: 20, after: 45 },
  { label: 'Business ownership', before: 9, after: 34 },
];
export const EMPLOYED = { before: 152, after: 250 };
/** Share of those employed before training who reported they were no longer employed (OC-01); n is below the small-cell threshold. */
export const EXIT = { share: 5.9, n: 9 };

// ---- Speed to earnings (OC-05, base 170; cumulative) ----------------------------------------
export const SPEED_BASE = 170;
export const SPEED: Cell[] = [
  { label: 'During the course', n: 40 },
  { label: 'Within 3 months', n: 65 },
  { label: 'Within 6 months', n: 100 },
  { label: 'Within 12 months', n: 131 },
  { label: 'Within 2 years', n: 154 },
];

// ---- Income direction (OC-03b, base 277) ----------------------------------------------------
export const INCOME_BASE = 277;
export const INCOME_DIRECTION: Cell[] = [
  { label: 'Increased', n: 200 },
  { label: 'Unchanged', n: 61 },
  { label: 'Decreased', n: 16 },
];

// ---- Career outcomes (OC-08, base 321) -------------------------------------------------------
export const CAREER: Dist = {
  id: 'OC-08',
  measure: 'Career and education outcomes reported',
  base: 321,
  statedBase: 321,
  cells: [
    { label: 'Freelancing or remote job', n: 61 },
    { label: 'New job', n: 37 },
    { label: 'Started a business', n: 22 },
    { label: 'Better position', n: 20 },
    { label: 'Higher education', n: 26 },
    { label: 'Promotion', n: 14 },
    { label: 'Salary increase', n: 11 },
    { label: 'Other or no change', n: 130 },
  ],
};

// ---- Main income source (OC-07, base 337) ---------------------------------------------------
export const SOURCE: Dist = {
  id: 'OC-07',
  measure: 'Main income source',
  base: 337,
  cells: [
    { label: 'Job in Bangladesh', n: 163 },
    { label: 'Own business', n: 39 },
    { label: 'Freelancing in Bangladesh', n: 21 },
    { label: 'Freelancing for foreign clients', n: 24 },
    { label: 'Job abroad', n: 16 },
    { label: 'Other', n: 57 },
    { label: 'No current income', n: 17 },
  ],
};

// ---- Recommendation score 0–10 (OC-06, base 550) -------------------------------------------
/** Scores 0–3 are merged: scores 2 (n = 4) and 3 (n = 8) alone would fall below the small-cell threshold. */
export const RECOMMEND: Dist = {
  id: 'OC-06-recommend',
  measure: 'Recommendation score (0–10)',
  base: 550,
  cells: [
    { label: '0–3', n: 52 },
    { label: '4', n: 16 },
    { label: '5', n: 62 },
    { label: '6', n: 26 },
    { label: '7', n: 52 },
    { label: '8', n: 72 },
    { label: '9', n: 32 },
    { label: '10', n: 238 },
  ],
};

// ---- No prior income (OC-02, base 47) -------------------------------------------------------
export const NO_PRIOR = { base: 47, earning: 34 };

// ---- Consistency with the register ----------------------------------------------------------
const sum = (cs: Cell[]) => cs.reduce((s, c) => s + c.n, 0);
/** Throws at build time if a distribution no longer adds up or contradicts a published headline. */
export function assertConsistent(): void {
  const must = (ok: boolean, msg: string) => {
    if (!ok) throw new Error(`outcomes-data: ${msg}`);
  };
  for (const d of [AGE, EDUCATION, DISTRICTS, CAREER, SOURCE, RECOMMEND]) {
    if (d.id !== 'OC-08') must(sum(d.cells) === d.base, `${d.id} cells sum to ${sum(d.cells)}, expected ${d.base}`);
  }
  must(pct(AGE.cells[0].n + AGE.cells[1].n, AGE.base) === 68.7, 'aged 15–35 should be 68.7%');
  must(pct(EDUCATION.cells[2].n + EDUCATION.cells[3].n, EDUCATION.base) === 84.6, 'bachelor’s or higher should be 84.6%');
  must(pct(DISTRICT_BASE - 176, DISTRICT_BASE) === 62.9, 'outside Dhaka should be 62.9%');
  must(pct(EMPLOYED.before, EMPLOYMENT_BASE) === 47.4 && pct(EMPLOYED.after, EMPLOYMENT_BASE) === 77.9, 'employment should be 47.4 → 77.9');
  must(pct(EMPLOYMENT_TYPES[0].before, EMPLOYMENT_BASE) === 38.3 && pct(EMPLOYMENT_TYPES[0].after, EMPLOYMENT_BASE) === 53.3, 'salaried should be 38.3 → 53.3');
  must(pct(EMPLOYMENT_TYPES[1].before, EMPLOYMENT_BASE) === 6.2 && pct(EMPLOYMENT_TYPES[1].after, EMPLOYMENT_BASE) === 14, 'freelancing should be 6.2 → 14.0');
  must(pct(EMPLOYMENT_TYPES[2].before, EMPLOYMENT_BASE) === 2.8 && pct(EMPLOYMENT_TYPES[2].after, EMPLOYMENT_BASE) === 10.6, 'business should be 2.8 → 10.6');
  must(pct(EXIT.n, EMPLOYED.before) === EXIT.share, 'exit share should be 5.9% of those employed before training');
  must(pct(SPEED[2].n, SPEED_BASE) === 58.8 && pct(SPEED[3].n, SPEED_BASE) === 77.1 && pct(SPEED[4].n, SPEED_BASE) === 90.6 && pct(SPEED[0].n, SPEED_BASE) === 23.5, 'speed to earnings should match OC-05');
  must(sum(INCOME_DIRECTION) === INCOME_BASE, 'income direction cells should sum to 277');
  must(pct(INCOME_DIRECTION[0].n, INCOME_BASE) === 72.2 && pct(INCOME_DIRECTION[1].n, INCOME_BASE) === 22 && pct(INCOME_DIRECTION[2].n, INCOME_BASE) === 5.8, 'income direction should match OC-03b');
  must(pct(RECOMMEND.cells.slice(4).reduce((s, c) => s + c.n, 0), RECOMMEND.base) === 71.6, 'scores of 7+ should be 71.6%');
  must(pct(NO_PRIOR.earning, NO_PRIOR.base) === 72.3, 'no-prior-income earners should be 72.3%');
  must(pct(SOURCE.cells.slice(0, 5).reduce((s, c) => s + c.n, 0), SOURCE.base) === 78, 'work as main income source should be 78.0%');
  must(pct(SOURCE.cells[3].n + SOURCE.cells[4].n, SOURCE.base) === 11.9, 'foreign-client freelancing or job abroad should be 11.9%');
  must(pct(CAREER.base - 130, CAREER.base) === 59.5, 'specific career or education outcome should be 59.5%');
  must(pct(61 + 37 + 22, CAREER.base) === 37.4, 'new income source should be 37.4%');
  must(DISTRICTS.cells.every((c) => c.n >= MIN_CELL), 'districts must all have at least 10 respondents');
}

// ---- CSV of published aggregates -------------------------------------------------------------
const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export const CSV_HEADER = ['measure_id', 'measure', 'category', 'value_type', 'value', 'base_n', 'status'];

/**
 * One exported cell. `n` is the internal (reconstructed) count: it only decides small-cell suppression and is
 * never written to the CSV or the page. `base` is exported only where the Impact Report states it.
 */
interface Rec {
  id: string;
  measure: string;
  category: string;
  type: 'percent' | 'median_usd';
  value: string;
  base?: number;
  n?: number;
  note?: string;
}

const NOT_STATED = 'base not stated in the report';

function recs(): Rec[] {
  const out: Rec[] = [];
  const pctRec = (id: string, measure: string, category: string, n: number, internalBase: number, statedBase?: number, note?: string): Rec => ({
    id, measure, category, type: 'percent', value: pct(n, internalBase).toFixed(1), base: statedBase, n, note,
  });
  out.push(pctRec('OC-01', 'Employed, among surveyed completers with paired employment answers', 'Before training', EMPLOYED.before, EMPLOYMENT_BASE, EMPLOYMENT_BASE));
  out.push(pctRec('OC-01', 'Employed, among surveyed completers with paired employment answers', 'At the October 2026 survey', EMPLOYED.after, EMPLOYMENT_BASE, EMPLOYMENT_BASE));
  out.push({ id: 'OC-01', measure: 'Employed before training who reported no longer being employed', category: 'Share of those employed before training', type: 'percent', value: EXIT.share.toFixed(1), n: EXIT.n, note: NOT_STATED });
  out.push(pctRec('OC-02', 'Completers (2014–2023) with no income before training who were earning at the October 2026 survey', 'Earning', NO_PRIOR.earning, NO_PRIOR.base, NO_PRIOR.base));
  out.push(pctRec('OC-02', 'Completers (2014–2023) with no income before training who were earning at the October 2026 survey', 'Not earning', NO_PRIOR.base - NO_PRIOR.earning, NO_PRIOR.base, NO_PRIOR.base));
  out.push({ id: 'OC-03', measure: 'Median monthly income (USD), ratio of medians 3.00', category: 'Before training', type: 'median_usd', value: '82', note: NOT_STATED });
  out.push({ id: 'OC-03', measure: 'Median monthly income (USD), ratio of medians 3.00', category: 'At the October 2026 survey', type: 'median_usd', value: '245', note: NOT_STATED });
  for (const c of INCOME_DIRECTION) out.push(pctRec('OC-03b', 'Direction of paired monthly income change', c.label, c.n, INCOME_BASE, INCOME_BASE));
  out.push({ id: 'OC-03c', measure: 'Median individual change in monthly income (USD)', category: 'Median change', type: 'median_usd', value: '82', note: NOT_STATED });
  for (const t of EMPLOYMENT_TYPES) {
    out.push(pctRec('OC-04', 'Employment by type, among surveyed completers with paired answers', `${t.label}, before training`, t.before, EMPLOYMENT_BASE, EMPLOYMENT_BASE));
    out.push(pctRec('OC-04', 'Employment by type, among surveyed completers with paired answers', `${t.label}, at the October 2026 survey`, t.after, EMPLOYMENT_BASE, EMPLOYMENT_BASE));
  }
  for (const c of SPEED) out.push(pctRec('OC-05', 'Cumulative share of completers who first earned during or after training and started earning by each point (timing only)', c.label, c.n, SPEED_BASE, SPEED_BASE));
  for (const d of [RECOMMEND, CAREER, SOURCE, AGE, EDUCATION, DISTRICTS]) {
    for (const c of d.cells) out.push(pctRec(d.id, d.measure, c.label, c.n, d.base, d.statedBase, d.statedBase ? undefined : NOT_STATED));
  }
  return out;
}

export function csvRows(): string[][] {
  return recs().map((r) => {
    const small = r.n !== undefined && r.n < MIN_CELL;
    const status = small ? 'suppressed (small cell)' : r.note ? `published; ${r.note}` : 'published';
    return [r.id, r.measure, r.category, r.type, small ? '' : r.value, small || r.base === undefined ? '' : String(r.base), status];
  });
}

export function csvText(): string {
  const lines = [CSV_HEADER, ...csvRows()].map((r) => r.map(q).join(','));
  return lines.join('\n') + '\n';
}

/**
 * Build-time guards: no published percentage rests on an internal count below MIN_CELL, suppressed cells carry no
 * value, and the export holds only percentages, medians and bases the report states.
 */
export function assertSuppression(): void {
  const stated = new Set([EMPLOYMENT_BASE, INCOME_BASE, SPEED_BASE, NO_PRIOR.base]);
  for (const [i, r] of recs().entries()) {
    const row = csvRows()[i];
    if (r.n !== undefined && r.n < MIN_CELL && (row[4] !== '' || row[5] !== '')) throw new Error(`outcomes CSV: small cell carries a value (${r.id} ${r.category})`);
    if (row[5] !== '' && !stated.has(Number(row[5]))) throw new Error(`outcomes CSV: base ${row[5]} is not stated in the report (${r.id} ${r.category})`);
  }
  if (CSV_HEADER.includes('cell_n')) throw new Error('outcomes CSV must not export counts');
}
