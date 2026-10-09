/**
 * Published survey aggregates for /impact/outcomes-2026/ and the downloadable CSV.
 *
 * Source: CodersTrust Impact Survey, October 2026 (surveyed completers; chart percentages from the Impact Report).
 * Headline figures live in the facts dataset (OC-01 … OC-09); this module holds the distributions behind the charts
 * and the headline shares the register publishes, so that every published percentage or median has a CSV row.
 *
 * Percentages only. The Impact Report states a base for four measures (321 paired completers, 277 paired income
 * answers, 170 completers who first earned during or after training, and 47 completers with no prior income, of whom 34
 * were earning); it does not state counts for any category, and none is reconstructed here. Where the report gives no
 * base (respondent profile, main income source, recommendation score, districts) the shares are shown without one.
 * Every percentage reproduces a register headline (checked in `assertConsistent` and `assertAgainstRegister`).
 *
 * Grouping: education categories are shown as grouped in the source; every district under 3.0% is combined into
 * "Other districts" (the only place the below-3% fold applies); the 0–10 recommendation score shows all eleven scores.
 * Shares are rounded to one decimal, so a group may add to 99.9 or 100.1.
 *
 * This file has no imports, so it can also be run directly to regenerate the CSV:
 *   node --experimental-strip-types -e "import('./src/components/pages/impact/outcomes-data.ts').then((m) => process.stdout.write(m.csvText()))" > public/data/outcomes-2026-aggregates.csv
 */
export interface ShareCell {
  label: string;
  /** Published share of respondents, in percent (one decimal). */
  pct: number;
}
export interface Dist {
  id: string;
  measure: string;
  /** Base as stated in the Impact Report; undefined = not stated (then no base is shown or exported). */
  statedBase?: number;
  cells: ShareCell[];
}

const pct = (n: number, base: number) => Math.round((n / base) * 1000) / 10;
/** Share of a stated count in a stated base (only used for the one stated count, 34 of 47). */
export const percent = pct;

/**
 * The CSV repeats a row's stated base only when the share does not imply a cell smaller than this (the release gate
 * scripts/check-budget.mjs reads a base and a percentage together). The share itself is always published.
 */
export const MIN_CELL = 10;

// ---- Who responded (OC-09) -------------------------------------------------------------------
export const AGE: Dist = {
  id: 'OC-09-age',
  measure: 'Respondents by age group',
  cells: [
    { label: '15–24', pct: 15.2 },
    { label: '25–35', pct: 53.5 },
    { label: '36–45', pct: 23.3 },
    { label: '46 and over', pct: 8.0 },
  ],
};

/** Education categories as grouped in the source. */
export const EDUCATION: Dist = {
  id: 'OC-09-education',
  measure: 'Respondents by highest education',
  cells: [
    { label: 'Higher Secondary Certificate (HSC) or below', pct: 11.0 },
    { label: 'Diploma', pct: 4.4 },
    { label: 'Bachelor’s degree', pct: 34.2 },
    { label: 'Master’s degree or higher', pct: 50.4 },
  ],
};

/**
 * District of residence. The Impact Report does not state the base for this question, so only the published shares are
 * kept. Every district under 3.0% is combined into "Other districts" (page text: "Districts under 3% are combined into
 * Other districts"); that remainder is 100% minus the shares shown.
 */
export const DISTRICT_FOLD_BELOW = 3.0;
export const OTHER_DISTRICTS = 'Other districts';
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

// ---- Employment by type (OC-04, stated base 321) ---------------------------------------------
export const EMPLOYMENT_BASE = 321;
export const EMPLOYMENT_TYPES = [
  { label: 'Salaried employment', before: 38.3, after: 53.3 },
  { label: 'Freelancing', before: 6.2, after: 14.0 },
  { label: 'Business ownership', before: 2.8, after: 10.6 },
];
export const EMPLOYED = { before: 47.4, after: 77.9 };
/** Share of those employed before training who reported they were no longer employed (OC-01). The report states no count for it. */
export const EXIT = { share: 5.9 };

// ---- Speed to earnings (OC-05, stated base 170; cumulative) ---------------------------------
export const SPEED_BASE = 170;
export const SPEED: ShareCell[] = [
  { label: 'During the course', pct: 23.5 },
  { label: 'Within 3 months', pct: 38.2 },
  { label: 'Within 6 months', pct: 58.8 },
  { label: 'Within 12 months', pct: 77.1 },
  { label: 'Within 2 years', pct: 90.6 },
];

// ---- Income direction (OC-03b, stated base 277) ---------------------------------------------
export const INCOME_BASE = 277;
export const INCOME_DIRECTION: ShareCell[] = [
  { label: 'Increased', pct: 72.2 },
  { label: 'Unchanged', pct: 22.0 },
  { label: 'Decreased', pct: 5.8 },
];

// ---- Career outcomes (OC-08, stated base 321) ------------------------------------------------
export const CAREER: Dist = {
  id: 'OC-08',
  measure: 'Career and education outcomes reported',
  statedBase: 321,
  cells: [
    { label: 'Freelancing or remote job', pct: 19.0 },
    { label: 'New job', pct: 11.5 },
    { label: 'Started a business', pct: 6.9 },
    { label: 'Better position', pct: 6.2 },
    { label: 'Higher education', pct: 8.1 },
    { label: 'Promotion', pct: 4.4 },
    { label: 'Salary increase', pct: 3.4 },
    { label: 'Other or no change', pct: 40.5 },
  ],
};

// ---- Main income source (OC-07; base not stated) --------------------------------------------
export const SOURCE: Dist = {
  id: 'OC-07',
  measure: 'Main income source',
  cells: [
    { label: 'Job in Bangladesh', pct: 48.4 },
    { label: 'Own business', pct: 11.6 },
    { label: 'Freelancing in Bangladesh', pct: 6.2 },
    { label: 'Freelancing for foreign clients', pct: 7.1 },
    { label: 'Job abroad', pct: 4.7 },
    { label: 'Other', pct: 16.9 },
    { label: 'No current income', pct: 5.0 },
  ],
};

// ---- Recommendation score 0–10 (OC-06; base not stated) -------------------------------------
/**
 * The Impact Report publishes the share for each of the 11 scores and does not state the base, so only those published
 * shares are held. The below-3% fold is a district rule and is not applied here (review round 9, N6): the scale is
 * ordered, so every score from 0 to 10 is shown, as a percentage only. The shares are rounded to one decimal and add to
 * 100.1; scores of 7 or more add to 71.7 against the 71.6 headline.
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

// ---- No prior income (OC-02, stated: 34 of 47) ----------------------------------------------
export const NO_PRIOR = { base: 47, earning: 34 };

// ---- Headline shares the register publishes (OC-01 … OC-09) ----------------------------------
/**
 * Percentages and medians that the register states in its headline sentences but that no chart shows. Each has its own
 * CSV row, so the download holds one row per published percentage or median. `fact` names the register entry whose text
 * must contain the figure (checked in `assertAgainstRegister`).
 */
interface Headline {
  id: string;
  measure: string;
  category: string;
  type: 'percent' | 'percentage_points' | 'percent_change';
  value: number;
  fact: string;
  /** Stated base, where the report gives one. */
  base?: number;
}
const HEADLINES: Headline[] = [
  { id: 'OC-01', measure: 'Net gain in employment, among surveyed completers with paired employment answers', category: 'October 2026 survey vs before training', type: 'percentage_points', value: 30.5, fact: 'OC-01', base: EMPLOYMENT_BASE },
  { id: 'OC-03', measure: 'Change in median monthly income (ratio of medians 3.00)', category: 'October 2026 survey vs before training', type: 'percent_change', value: 200, fact: 'OC-03' },
  { id: 'OC-06-summary', measure: 'Learner experience, among responding completers', category: 'Rate instructors good or better', type: 'percent', value: 92.7, fact: 'OC-06' },
  { id: 'OC-06-summary', measure: 'Learner experience, among responding completers', category: 'Rate their overall experience good or better', type: 'percent', value: 86.9, fact: 'OC-06' },
  { id: 'OC-06-summary', measure: 'Learner experience, among responding completers', category: 'Recommendation score of 7 or more out of 10', type: 'percent', value: 71.6, fact: 'OC-06' },
  { id: 'OC-07-summary', measure: 'Main income source, summary shares', category: 'Freelancing for foreign clients or a job abroad', type: 'percent', value: 11.9, fact: 'OC-07' },
  { id: 'OC-07-summary', measure: 'Main income source, summary shares', category: 'Work as the main income source', type: 'percent', value: 78.0, fact: 'OC-07' },
  { id: 'OC-08-summary', measure: 'Career and education outcomes, summary shares', category: 'Report a specific career or education outcome', type: 'percent', value: 59.5, fact: 'OC-08', base: CAREER.statedBase },
  { id: 'OC-08-summary', measure: 'Career and education outcomes, summary shares', category: 'Gained a new income source', type: 'percent', value: 37.4, fact: 'OC-08', base: CAREER.statedBase },
  { id: 'OC-09-profile', measure: 'Respondent profile', category: 'Hold a bachelor’s degree or higher', type: 'percent', value: 84.6, fact: 'OC-09' },
  { id: 'OC-09-profile', measure: 'Respondent profile', category: 'Aged 15–35', type: 'percent', value: 68.7, fact: 'OC-09' },
  { id: 'OC-09-profile', measure: 'Respondent profile', category: 'Women', type: 'percent', value: 19.9, fact: 'OC-09' },
  { id: 'OC-09-profile', measure: 'Respondent profile', category: 'Live outside Dhaka', type: 'percent', value: 62.9, fact: 'OC-09' },
  { id: 'OC-09-profile', measure: 'Respondent profile', category: 'Rural', type: 'percent', value: 16.0, fact: 'OC-09' },
];

// ---- Consistency with the register ----------------------------------------------------------
const sumTenths = (cs: ShareCell[]) => cs.reduce((s, c) => s + tenths(c.pct), 0);
const must = (ok: boolean, msg: string) => {
  if (!ok) throw new Error(`outcomes-data: ${msg}`);
};
/** Throws at build time if a distribution no longer adds up (within one-decimal rounding) or contradicts a published headline. */
export function assertConsistent(): void {
  const near = (a: number, b: number, tolerance = 1) => Math.abs(a - b) <= tolerance;
  // Each share is rounded to one decimal (at most 0.05 off), so a sum may differ from 100% by half a tenth per share added.
  for (const d of [AGE, EDUCATION, CAREER, SOURCE, DISTRICTS, RECOMMEND]) {
    must(near(sumTenths(d.cells), 1000, Math.ceil(d.cells.length / 2)), `${d.id} shares should add up to 100% within rounding (got ${sumTenths(d.cells) / 10})`);
  }
  must(near(sumTenths(INCOME_DIRECTION), 1000, 2), 'income direction shares should add up to 100% within rounding');
  must(near(tenths(AGE.cells[0].pct) + tenths(AGE.cells[1].pct), 687), 'aged 15–35 should be 68.7%');
  must(near(tenths(EDUCATION.cells[2].pct) + tenths(EDUCATION.cells[3].pct), 846), 'bachelor’s or higher should be 84.6%');
  must(tenths(100) - tenths(DISTRICTS.cells[0].pct) === 629, 'outside Dhaka should be 62.9%');
  must(EMPLOYED.before === 47.4 && EMPLOYED.after === 77.9, 'employment should be 47.4 → 77.9');
  must(tenths(EMPLOYED.after) - tenths(EMPLOYED.before) === 305, 'net employment gain should be 30.5 percentage points');
  must(EMPLOYMENT_TYPES[0].before === 38.3 && EMPLOYMENT_TYPES[0].after === 53.3, 'salaried should be 38.3 → 53.3');
  must(EMPLOYMENT_TYPES[1].before === 6.2 && EMPLOYMENT_TYPES[1].after === 14, 'freelancing should be 6.2 → 14.0');
  must(EMPLOYMENT_TYPES[2].before === 2.8 && EMPLOYMENT_TYPES[2].after === 10.6, 'business should be 2.8 → 10.6');
  must(EXIT.share === 5.9, 'exit share should be 5.9% of those employed before training');
  must(SPEED[2].pct === 58.8 && SPEED[3].pct === 77.1 && SPEED[4].pct === 90.6 && SPEED[0].pct === 23.5, 'speed to earnings should match OC-05');
  must(INCOME_DIRECTION[0].pct === 72.2 && INCOME_DIRECTION[1].pct === 22 && INCOME_DIRECTION[2].pct === 5.8, 'income direction should match OC-03b');
  // Recommendation score: all eleven scores, in order, as published shares.
  const scores = RECOMMEND.cells;
  must(scores.length === 11 && scores.every((c, i) => c.label === String(i)), 'the recommendation-score distribution must show every score from 0 to 10, in order (no fold, no merged buckets)');
  must(near(sumTenths(scores.slice(7)), 716, Math.ceil(scores.slice(7).length / 2)), 'scores of 7+ should be 71.6% within rounding');
  must(pct(NO_PRIOR.earning, NO_PRIOR.base) === 72.3, 'no-prior-income earners should be 72.3%');
  must(near(sumTenths(SOURCE.cells.slice(0, 5)), 780), 'work as main income source should be 78.0%');
  must(near(tenths(SOURCE.cells[3].pct) + tenths(SOURCE.cells[4].pct), 119), 'foreign-client freelancing or job abroad should be 11.9%');
  must(near(1000 - tenths(CAREER.cells[7].pct), 595), 'specific career or education outcome should be 59.5%');
  must(near(tenths(CAREER.cells[0].pct) + tenths(CAREER.cells[1].pct) + tenths(CAREER.cells[2].pct), 374), 'new income source should be 37.4%');
  must(DISTRICTS.cells.every((c) => c.label === OTHER_DISTRICTS || c.pct >= DISTRICT_FOLD_BELOW), `every district under ${DISTRICT_FOLD_BELOW}% must be combined into "${OTHER_DISTRICTS}"`);
  must(DISTRICTS.cells[DISTRICTS.cells.length - 1].label === OTHER_DISTRICTS, '"Other districts" should come last');
}

/** Checks the data against the register text it publishes: every headline share must appear in its fact, and so must each chart's key figures. */
export function assertAgainstRegister(factText: (id: string) => string): void {
  const has = (id: string, figure: string) => must(factText(id).includes(figure), `register entry ${id} does not contain "${figure}"`);
  for (const h of HEADLINES) has(h.fact, h.type === 'percentage_points' ? `${h.value.toFixed(1)} percentage-point` : h.type === 'percent_change' ? `+${h.value}%` : `${h.value.toFixed(1)}%`);
  for (const v of [EMPLOYED.before, EMPLOYED.after]) has('OC-01', `${v.toFixed(1)}%`);
  for (const t of EMPLOYMENT_TYPES) for (const v of [t.before, t.after]) has('OC-04', `${v.toFixed(1)}%`);
  for (const c of INCOME_DIRECTION) has('OC-03b', `${c.pct.toFixed(1)}%`);
  for (const i of [0, 2, 3, 4]) has('OC-05', `${SPEED[i].pct.toFixed(1)}%`);
  has('OC-02', `${pct(NO_PRIOR.earning, NO_PRIOR.base).toFixed(1)}%`);
  has('OC-01', `${EXIT.share.toFixed(1)}%`);
}

// ---- CSV of published aggregates -------------------------------------------------------------
const q = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export const CSV_HEADER = ['measure_id', 'measure', 'category', 'value_type', 'value', 'base_n', 'status'];

/** One exported row: a percentage, a percentage-point change or a median, and the base where the Impact Report states one. */
interface Rec {
  id: string;
  measure: string;
  category: string;
  type: 'percent' | 'percentage_points' | 'percent_change' | 'median_usd';
  value: string;
  base?: number;
  note?: string;
}

const NOT_STATED = 'base not stated in the report';

/** The stated base is repeated on a row only if the share does not imply a cell under MIN_CELL (see MIN_CELL). */
const baseFor = (value: number, base?: number) => (base !== undefined && Math.round((value / 100) * base) >= MIN_CELL ? base : undefined);
const SHOWN_ON_PAGE = (base: number) => `base is n = ${base}, as for the other rows of this measure`;

function recs(): Rec[] {
  const out: Rec[] = [];
  const pctRec = (id: string, measure: string, category: string, value: number, statedBase?: number): Rec => {
    const base = baseFor(value, statedBase);
    const note = statedBase === undefined ? NOT_STATED : base === undefined ? SHOWN_ON_PAGE(statedBase) : undefined;
    return { id, measure, category, type: 'percent', value: value.toFixed(1), base, note };
  };
  const emp = 'Employed, among surveyed completers with paired employment answers';
  out.push(pctRec('OC-01', emp, 'Before training', EMPLOYED.before, EMPLOYMENT_BASE));
  out.push(pctRec('OC-01', emp, 'At the October 2026 survey', EMPLOYED.after, EMPLOYMENT_BASE));
  out.push(pctRec('OC-01', 'Employed before training who reported no longer being employed', 'Share of those employed before training', EXIT.share));
  const none = 'Completers (2014–2023) with no income before training who were earning at the October 2026 survey';
  out.push(pctRec('OC-02', none, 'Earning', pct(NO_PRIOR.earning, NO_PRIOR.base), NO_PRIOR.base));
  out.push(pctRec('OC-02', none, 'Not earning', pct(NO_PRIOR.base - NO_PRIOR.earning, NO_PRIOR.base), NO_PRIOR.base));
  out.push({ id: 'OC-03', measure: 'Median monthly income (USD), ratio of medians 3.00', category: 'Before training', type: 'median_usd', value: '82', note: NOT_STATED });
  out.push({ id: 'OC-03', measure: 'Median monthly income (USD), ratio of medians 3.00', category: 'At the October 2026 survey', type: 'median_usd', value: '245', note: NOT_STATED });
  for (const c of INCOME_DIRECTION) out.push(pctRec('OC-03b', 'Direction of paired monthly income change', c.label, c.pct, INCOME_BASE));
  out.push({ id: 'OC-03c', measure: 'Median individual change in monthly income (USD)', category: 'Median change', type: 'median_usd', value: '82', note: NOT_STATED });
  for (const t of EMPLOYMENT_TYPES) {
    const m = 'Employment by type, among surveyed completers with paired answers';
    out.push(pctRec('OC-04', m, `${t.label}, before training`, t.before, EMPLOYMENT_BASE));
    out.push(pctRec('OC-04', m, `${t.label}, at the October 2026 survey`, t.after, EMPLOYMENT_BASE));
  }
  for (const c of SPEED) out.push(pctRec('OC-05', 'Cumulative share of completers who first earned during or after training and started earning by each point (timing only)', c.label, c.pct, SPEED_BASE));
  // Recommendation score: the published share for each score 0–10 (no base is stated; no cell is folded).
  for (const c of RECOMMEND.cells) out.push(pctRec(RECOMMEND.id, RECOMMEND.measure, c.label, c.pct));
  for (const d of [CAREER, SOURCE, AGE, EDUCATION]) for (const c of d.cells) out.push(pctRec(d.id, d.measure, c.label, c.pct, d.statedBase));
  // Districts: the published shares only (under 3% combined into Other districts).
  for (const c of DISTRICTS.cells) out.push(pctRec(DISTRICTS.id, DISTRICTS.measure, c.label, c.pct));
  // Headline shares that no chart shows, so that every published percentage or median has a row.
  for (const h of HEADLINES) {
    if (h.type === 'percent') out.push(pctRec(h.id, h.measure, h.category, h.value, h.base));
    else out.push({ id: h.id, measure: h.measure, category: h.category, type: h.type, value: h.value.toFixed(h.type === 'percent_change' ? 0 : 1), base: h.base, note: h.base === undefined ? NOT_STATED : undefined });
  }
  return out;
}

export function csvRows(): string[][] {
  return recs().map((r) => [r.id, r.measure, r.category, r.type, r.value, r.base === undefined ? '' : String(r.base), r.note ? `published; ${r.note}` : 'published']);
}

export function csvText(): string {
  const lines = [CSV_HEADER, ...csvRows()].map((r) => r.map(q).join(','));
  return lines.join('\n') + '\n';
}

/**
 * Build-time guards: every row carries a value, the export holds only percentages, point changes, medians and bases the
 * report states, and no count column exists.
 */
export function assertPublication(): void {
  const stated = new Set([EMPLOYMENT_BASE, INCOME_BASE, SPEED_BASE, NO_PRIOR.base, CAREER.statedBase]);
  for (const r of csvRows()) {
    must(r[4] !== '', `CSV row has no value (${r[0]} ${r[2]})`);
    must(r[5] === '' || stated.has(Number(r[5])), `CSV base ${r[5]} is not stated in the report (${r[0]} ${r[2]})`);
  }
  must(!CSV_HEADER.some((h) => /^(n|cell_n|count)$/i.test(h)), 'the CSV must not export counts');
}
