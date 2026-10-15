import { fact } from '../../../data/facts';

/**
 * Evidence types for the Impact pages (WP24b). A proof figure is one of four kinds, and the kind follows from the register entry's id:
 *  - RC-*  the BIGD randomized trial of the predecessor WSDFM program  → Randomized Trial
 *  - OC-*  the CodersTrust Impact Survey, October 2026                  → Surveyed Completers
 *  - PR-*  a program's own records (WSDFM, Kosovo, UNDP YES, Her Power) → Program Record
 *  - ST-*  one learner's own account                                    → Individual Story
 * Reach and scale facts (SC-*, GV-*) are not proof of outcomes and carry no evidence type; they take a StatusTag (Delivered, Target) instead. The one exception is the contract-scope figure
 * (GV-12 and SC-06, 31,200+ people in the training and curriculum scopes of six government contracts): WP36 (cycle-13 review, "one figure, one label") gives it the "Contract Scope" evidence tag
 * on every page, as Home and Governments already did, in place of the "Agreement" status tag Impact and Investors showed.
 * Trial and program-record figures are never put in one undifferentiated group (cycle-4 owner decision).
 */
/** The kinds of evidence an Impact page badges (see <EvidenceTag>). */
export type Evidence = 'Randomized Trial' | 'Surveyed Completers' | 'Program Record' | 'Contract Scope' | 'Individual Story';

export function evidenceOf(id: string): Evidence | undefined {
  if (id.startsWith('RC-')) return 'Randomized Trial';
  if (id.startsWith('OC-')) return 'Surveyed Completers';
  if (id.startsWith('PR-')) return 'Program Record';
  if (id.startsWith('ST-')) return 'Individual Story';
  if (id === 'GV-12' || id === 'SC-06') return 'Contract Scope';
  return undefined;
}

/** The share inside a register label or text, e.g. "71%" from "WSDFM: 71% in work". */
const shareIn = (s: string, what: string): string => {
  const m = /(\d+(?:\.\d+)?%)/.exec(s);
  if (!m) throw new Error(`${what}: no share found in "${s}"`);
  return m[1];
};

/**
 * One formulation of the WSDFM program-record result, everywhere: "WSDFM program records: 711 of 1,000 women in work (71%)". Built from PR-01's own
 * stat (the count and its base) and its label (the share), so no figure is typed here.
 */
export function wsdfmRecordLine(): string {
  const st = fact('PR-01').stat;
  if (!st) throw new Error('PR-01 has no stat');
  return `WSDFM program records: ${st.value} women in work (${shareIn(st.label, 'PR-01')})`;
}

/** The tile and ladder label for PR-01: the same formulation without the count, which the figure above it already shows. */
export function wsdfmFigureLabel(): string {
  return wsdfmRecordLine().replace(/ [\d,]+ of [\d,]+ women in work/, ': women in work').replace('records:: ', 'records: ');
}

/** The trial's employment label without the duplicated unit: the value already reads "+10.3 pp", so the label does not say "in percentage points" again. */
export function trialEmploymentLabel(): string {
  const label = fact('RC-02').stat?.label ?? '';
  return label.replace(', in percentage points,', '');
}

/** One row of "Every Reported Program Result in One Table"; a field left undefined is shown as a dash (not reported), never filled in. */
export interface ProgramResultRow {
  id: string;
  program: string;
  slug: string;
  partner: string;
  geography: string;
  trained?: string;
  completed?: string;
  certified?: string;
  inWork: string;
}

/**
 * The four program results the register reports, from registered facts only. Each count, base and share is read from the entry that states it
 * (PR-01, PR-02, PR-03, PR-05, GV-13); a measure the register does not report for a program stays undefined (a dash on the page). The rows
 * differ in what was measured: UNDP YES counts first jobs within three months of the 350 trained, the others count women in work at a follow-up.
 */
export function programResultRows(): ProgramResultRow[] {
  const pr01 = fact('PR-01');
  const pr02 = fact('PR-02');
  const pr03 = fact('PR-03');
  const pr05 = fact('PR-05');
  const gv13 = fact('GV-13');
  const need = <T,>(v: T | null | undefined, what: string): T => {
    if (v === null || v === undefined) throw new Error(`program results table: ${what} not found in the register`);
    return v;
  };
  // PR-03: "<program>, 2017: 350 trained; 97.5% completed the program; 67% of the 350 trained found their first job within three months" (WP48, cycle-23 review: "three months", not "3 months", in prose, as the rest of the page says it)
  const trained = need(/(\d[\d,]*) trained;/.exec(pr03.text)?.[1], 'PR-03 trained');
  const completed = need(/(\d+(?:\.\d+)?%) completed the program/.exec(pr03.text)?.[1], 'PR-03 completed');
  const firstJob = need(/(\d+(?:\.\d+)?%) of the (\d[\d,]*) trained found their first job within three months/.exec(pr03.text), 'PR-03 first job');
  // PR-05: "372 of 800 tracked women, from the 2,500 trained directly by CodersTrust, were in work (47%)"
  const direct = need(/(\d[\d,]*) women trained directly by CodersTrust/.exec(gv13.text)?.[1], 'GV-13 trained directly');
  return [
    {
      id: 'PR-01',
      program: 'WSDFM',
      slug: 'wsdfm-women-freelancers',
      partner: 'Porticus',
      geography: 'Bangladesh',
      inWork: `${need(pr01.stat, 'PR-01 stat').value} women (${shareIn(pr01.stat!.label, 'PR-01')})`,
    },
    {
      id: 'PR-02',
      program: 'Women in Online Work, Kosovo',
      slug: 'kosovo-women-in-online-work',
      partner: 'World Bank Group',
      geography: 'Kosovo',
      inWork: `${need(pr02.stat, 'PR-02 stat').value} women (${shareIn(pr02.stat!.label, 'PR-02')})`,
    },
    {
      id: 'PR-03',
      program: 'UNDP YES, Korail',
      slug: 'undp-yes-korail',
      partner: 'UNDP, Government of Bangladesh and Swanirvar Bangladesh',
      geography: 'Korail settlement, Dhaka',
      trained,
      completed,
      inWork: `${firstJob[1]} found a first job within three months`,
    },
    {
      id: 'PR-05',
      program: 'Her Power',
      slug: 'her-power',
      partner: 'ICT Division / DoICT, Government of Bangladesh',
      geography: 'Bangladesh',
      trained: `${direct} directly by CodersTrust`,
      inWork: `${need(pr05.stat, 'PR-05 stat').value} tracked women (${shareIn(pr05.stat!.label, 'PR-05')})`,
    },
  ];
}
