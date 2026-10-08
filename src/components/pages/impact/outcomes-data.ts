/**
 * Published survey aggregates for /impact/outcomes-2026/ and the downloadable CSV.
 *
 * Source: CodersTrust Impact Survey, October 2026 (surveyed completers; chart percentages from the Impact Report).
 * Headline figures live in the facts dataset (OC-01 … OC-09); this module holds only the
 * distributions behind the charts.
 *
 * INTERNAL ONLY: the `n` counts and `base` totals below are reconstructed from the published percentages. They
 * are never rendered or exported; their only job is the small-cell rule (any cell under MIN_CELL is folded into a
 * neighboring band on the page, and suppressed in the CSV). Only `statedBase`, the base the Impact Report itself
 * states (321, 277, 170, and 34 of 47), may be shown. Every percentage reproduces a register headline (checked in
 * `assertConsistent`).
 *
 * Districts and the recommendation score are the exceptions: their base is not stated, so no counts are held or derived for
 * them at all. Only the published shares are kept. Every district under 3.0% is combined into "Other districts" (the only
 * place the below-3% fold applies); the 0–10 recommendation score shows all eleven scores, as percentages only.
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

/**
 * District of residence. The Impact Report does not state the base for this question, so no counts are held or derived
 * here: the districts are kept as the published shares only. Every district under 3.0% is combined into "Other districts"
 * (page text: "Districts under 3% are combined into Other districts"); that remainder is 100% minus the shares shown.
 */
export const DISTRICT_FOLD_BELOW = 3.0;
export const OTHER_DISTRICTS = 'Other districts';
export interface ShareCell {
  label: string;
  /** Published share of respondents, in percent (one decimal). */
  pct: number;
}
/** Districts at or above DISTRICT_FOLD_BELOW; the smaller ones are not listed anywhere. */
const DISTRICT_SHARES: ShareCell[] = [
  { label: 'Dhaka', pct: 37.1 },
  { label: 'Chattogram', pct: 8.2 },
  { label: 'Barishal', pct: 5.7 },
  { label: 'Comilla', pct: 3.2 },
  { label: 'Narayanganj', pct: 3.0 },
];
const tenths = (p: number) => Math.round(p * 10);
export const DISTRICTS: { id: string; measure: string; cells: ShareCell[] } = {
  id: 'OC-09-district',
  measure: 'Respondents by district of residence',
  cells: [
    ...DISTRICT_SHARES,
    { label: OTHER_DISTRICTS, pct: (1000 - DISTRICT_SHARES.reduce((s, c) => s + tenths(c.pct), 0)) / 10 },
  ],
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

// ---- Recommendation score 0–10 (OC-06) -------------------------------------------------------
/**
 * The Impact Report publishes the share for each of the 11 scores and does not state the base, so, as for the districts, only
 * those published shares are held: no counts and no base are reconstructed. The below-3% fold is a district rule and is not
 * applied here (review round 9, N6): the scale is ordered, so every score from 0 to 10 is shown, as a percentage only.
 * The shares are rounded to one decimal and add to 100.1; scores of 7 or more add to 71.7 against the 71.6 headline.
 */
export const RECOMMEND: { id: string; measure: string; cells: ShareCell[] } = {
  id: 'OC-06-recommend',
  measure: 'Recommendation score (0–10)',
  cells: [
    { label: '0', pct: 5.5 },
    { label: '1', pct: 1.8 },
    { label: '2', pct: 0.7 },
    { label: '3', pct: 1.5 },
    { label: '4', pct: 2.9 },
    { label: '5', pct: 11.3 },
    { label: '6', pct: 4.7 },
    { label: '7', pct: 9.5 },
    { label: '8', pct: 13.1 },
    { label: '9', pct: 5.8 },
    { label: '10', pct: 43.3 },
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
  for (const d of [AGE, EDUCATION, CAREER, SOURCE]) {
    if (d.id !== 'OC-08') must(sum(d.cells) === d.base, `${d.id} cells sum to ${sum(d.cells)}, expected ${d.base}`);
  }
  must(pct(AGE.cells[0].n + AGE.cells[1].n, AGE.base) === 68.7, 'aged 15–35 should be 68.7%');
  must(pct(EDUCATION.cells[2].n + EDUCATION.cells[3].n, EDUCATION.base) === 84.6, 'bachelor’s or higher should be 84.6%');
  must(tenths(100) - tenths(DISTRICTS.cells[0].pct) === 629, 'outside Dhaka should be 62.9%');
  must(pct(EMPLOYED.before, EMPLOYMENT_BASE) === 47.4 && pct(EMPLOYED.after, EMPLOYMENT_BASE) === 77.9, 'employment should be 47.4 → 77.9');
  must(pct(EMPLOYMENT_TYPES[0].before, EMPLOYMENT_BASE) === 38.3 && pct(EMPLOYMENT_TYPES[0].after, EMPLOYMENT_BASE) === 53.3, 'salaried should be 38.3 → 53.3');
  must(pct(EMPLOYMENT_TYPES[1].before, EMPLOYMENT_BASE) === 6.2 && pct(EMPLOYMENT_TYPES[1].after, EMPLOYMENT_BASE) === 14, 'freelancing should be 6.2 → 14.0');
  must(pct(EMPLOYMENT_TYPES[2].before, EMPLOYMENT_BASE) === 2.8 && pct(EMPLOYMENT_TYPES[2].after, EMPLOYMENT_BASE) === 10.6, 'business should be 2.8 → 10.6');
  must(pct(EXIT.n, EMPLOYED.before) === EXIT.share, 'exit share should be 5.9% of those employed before training');
  must(pct(SPEED[2].n, SPEED_BASE) === 58.8 && pct(SPEED[3].n, SPEED_BASE) === 77.1 && pct(SPEED[4].n, SPEED_BASE) === 90.6 && pct(SPEED[0].n, SPEED_BASE) === 23.5, 'speed to earnings should match OC-05');
  must(sum(INCOME_DIRECTION) === INCOME_BASE, 'income direction cells should sum to 277');
  must(pct(INCOME_DIRECTION[0].n, INCOME_BASE) === 72.2 && pct(INCOME_DIRECTION[1].n, INCOME_BASE) === 22 && pct(INCOME_DIRECTION[2].n, INCOME_BASE) === 5.8, 'income direction should match OC-03b');
  // Recommendation score: all eleven scores, in order, as published shares. Each share is rounded to one decimal (at most 0.05 off), so a
  // sum may differ from 100% or from the 71.6% headline by half a tenth per share added.
  const scores = RECOMMEND.cells;
  const shareSum = (cs: ShareCell[]) => cs.reduce((s, c) => s + tenths(c.pct), 0);
  must(scores.length === 11 && scores.every((c, i) => c.label === String(i)), 'the recommendation-score distribution must show every score from 0 to 10, in order (no fold, no merged buckets)');
  must(Math.abs(shareSum(scores) - 1000) <= Math.ceil(scores.length / 2), 'recommendation-score shares should add up to 100% within rounding');
  must(Math.abs(shareSum(scores.slice(7)) - 716) <= Math.ceil(scores.slice(7).length / 2), 'scores of 7+ should be 71.6% within rounding');
  must(pct(NO_PRIOR.earning, NO_PRIOR.base) === 72.3, 'no-prior-income earners should be 72.3%');
  must(pct(SOURCE.cells.slice(0, 5).reduce((s, c) => s + c.n, 0), SOURCE.base) === 78, 'work as main income source should be 78.0%');
  must(pct(SOURCE.cells[3].n + SOURCE.cells[4].n, SOURCE.base) === 11.9, 'foreign-client freelancing or job abroad should be 11.9%');
  must(pct(CAREER.base - 130, CAREER.base) === 59.5, 'specific career or education outcome should be 59.5%');
  must(pct(61 + 37 + 22, CAREER.base) === 37.4, 'new income source should be 37.4%');
  must(DISTRICTS.cells.reduce((s, c) => s + tenths(c.pct), 0) === 1000, 'district shares should add up to 100%');
  must(DISTRICTS.cells.every((c) => c.label === OTHER_DISTRICTS || c.pct >= DISTRICT_FOLD_BELOW), `every district under ${DISTRICT_FOLD_BELOW}% must be combined into "${OTHER_DISTRICTS}"`);
  must(DISTRICTS.cells[DISTRICTS.cells.length - 1].label === OTHER_DISTRICTS, '"Other districts" should come last');
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
  // Recommendation score: the published share for each score 0–10 (no counts exist, and no cell is folded or suppressed).
  for (const c of RECOMMEND.cells) out.push({ id: RECOMMEND.id, measure: RECOMMEND.measure, category: c.label, type: 'percent', value: c.pct.toFixed(1), note: NOT_STATED });
  for (const d of [CAREER, SOURCE, AGE, EDUCATION]) {
    for (const c of d.cells) out.push(pctRec(d.id, d.measure, c.label, c.n, d.base, d.statedBase, d.statedBase ? undefined : NOT_STATED));
  }
  // Districts: the published shares only (no counts exist for them, so the cell-size rule works by share: under 3% is combined).
  for (const c of DISTRICTS.cells) out.push({ id: DISTRICTS.id, measure: DISTRICTS.measure, category: c.label, type: 'percent', value: c.pct.toFixed(1), note: NOT_STATED });
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
