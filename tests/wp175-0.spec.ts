import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import {
  C3_TRANSITION,
  CAMPUS_INCLUDES,
  CAMPUS_PROBLEM_LEAD,
  CAMPUS_STEPS,
  CONVERSION_PAGES,
  DIFFERENCE_EYEBROW,
  DIFFERENCE_HEADING,
  EMPATHY,
  EMPLOYER_INCLUDES,
  EMPLOYER_PAINS,
  EMPLOYER_STEPS,
  LOCAL_PARTNER_EVIDENCE,
  METHOD,
  POSITIONING,
  TRACK_MENU,
  TRIAL_BAND_HEADING,
  TRIAL_LEAD,
  USPS,
  WORK_BRIDGE,
} from '../src/data/copy';
import { CMF_TAGS } from '../src/data/cmf';
import { titleCase } from '../src/lib/titleCase.mjs';
import { open } from './support/browser';
import { listPages } from './support/pages';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, cmfTags, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package 0 (owner decisions of 28 November 2026, scratchpad wp175-decisions.md): the shared code that packages A, B and C build on.
 *   Helper     tests/support/cmf.ts reads the data-cmf order of a built page and checks order, coverage and declared compressions.
 *   Copy       src/data/copy.ts: the C3 transition line, the empathy and method lines of every conversion page, the crafted positioning statements (Q5),
 *              the C10 heading and USP lines, the C7 one-line trial lead, the campus and employer constants two packages share.
 *   Bands      ProblemBand `transition`, the short DifferenceBand (#difference), PartnerGuideBand `withOrigin` and `methodLast`, ProofBand `trialLead`
 *              and `surveyLeadIn`, shown on the styleguide; every band keeps its default output.
 *   Tone       data-cmf only takes the CMF vocabulary (src/data/cmf.ts).
 *   Gate       scripts/check-facts.mjs pins the new statements (first in C6, present once).
 *   Dates      the ten pages whose statement changed read 2026-11-28.
 * Run `npm run build`, then `PORT=4917 npx playwright test tests/wp175-0.spec.ts --project=chromium`. Most tests read the built files; a few open the styleguide.
 */

const TODAY = '2026-11-28';
const STYLEGUIDE = '/styleguide/';
const compact = (s: string) => s.replace(/\s+/g, ' ').trim();
const sentences = (s: string) => s.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** The statement's page, by POSITIONING key (Home and Investors render theirs when packages A and B add them). */
const POSITION_ROUTE: Record<string, string> = {
  home: '/',
  governments: '/partner-with-us/governments/',
  developmentPartners: '/partner-with-us/development-partners/',
  foundations: '/partner-with-us/foundations/',
  universities: '/partner-with-us/universities/',
  employers: '/partner-with-us/employers/',
  localPartners: '/partner-with-us/local-partners/',
  investors: '/partner-with-us/investors/',
  youthwide: '/programs/youthwide/',
  campus: '/programs/jobready-campus/',
  work: '/programs/jobready-work/',
  superkids: '/programs/superkids/',
};
/** The ten pages that print their statement today, so their visible text changed with it. */
const RENDERED = Object.keys(POSITION_ROUTE).filter((k) => k !== 'home' && k !== 'investors');

/* ============================================================================================== */
test.describe('tests/support/cmf.ts reads the CMF order of a page', () => {
  const band = (tag: string, inner = '') => `<div class="tone" data-cmf="${tag}"><section class="band"><h2>${tag}</h2>${inner}</section></div>`;
  const page = (...bands: string[]) => `<!doctype html><html><head><title>x</title></head><body><header data-cmf="C1-not-main"></header><main>${bands.join('')}</main></body></html>`;
  const FULL = ['C1', 'GEO', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];

  test('the tags are read in document order, inside <main> only, nested tags included; repeats collapse to one slot', () => {
    const html = page(band('C1'), band('GEO'), band('C7'), band('C7'), band('C13', '<ol data-cmf="C14"><li>Next</li></ol>'));
    expect(cmfTags(html)).toEqual(['C1', 'GEO', 'C7', 'C7', 'C13', 'C14']);
    expect(cmfSequence(html)).toEqual(['C1', 'GEO', 'C7', 'C13', 'C14']);
  });

  test('a complete C1 to C14 sequence with a declared C2–C4 compression passes', () => {
    expect(cmfProblems(FULL, { compression: 'C2-C4' })).toEqual([]);
    expect(cmfProblems(['C1', 'GEO', 'RESULTS', 'ROUTER', ...FULL.slice(2)], { compression: 'C2-C4', rows: ['RESULTS', 'ROUTER'] })).toEqual([]);
    expect(cmfProblems(['C1', 'GEO', 'C2-C3 (compressed)', 'C4', ...FULL.slice(3)], { compression: 'C2-C3' })).toEqual([]);
    expect(cmfProblems(['C1', 'GEO', 'C2', 'C3', 'C4', ...FULL.slice(3)], { compression: 'none' })).toEqual([]);
    // a declared exception (the NU Post Graduate Diploma has no C10 until National University signs off)
    expect(cmfProblems(FULL.filter((t) => t !== 'C10'), { compression: 'C2-C4', omit: ['C10'] })).toEqual([]);
  });

  test('each kind of fault is reported', () => {
    const faults: [string, string[], Parameters<typeof cmfProblems>[1]][] = [
      ['C10 missing', FULL.filter((t) => t !== 'C10'), { compression: 'C2-C4' }],
      ['C5 twice', [...FULL.slice(0, 4), 'C6', 'C5', ...FULL.slice(5)], { compression: 'C2-C4' }],
      ['GEO not directly after C1', ['C1', 'ROUTER', 'GEO', ...FULL.slice(2)], { compression: 'C2-C4', rows: ['ROUTER'] }],
      ['C1 not first', ['GEO', 'C1', ...FULL.slice(2)], { compression: 'C2-C4' }],
      ['C12 not directly before C13', [...FULL.slice(0, 10), 'C12', 'C11', 'C13', 'C14'], { compression: 'C2-C4' }],
      ['C9 after C10', [...FULL.slice(0, 7), 'C10', 'C9', ...FULL.slice(9)], { compression: 'C2-C4' }],
      ['C3 beside a C2–C4 compression', [...FULL.slice(0, 3), 'C3', ...FULL.slice(3)], { compression: 'C2-C4' }],
      ['no compression tag where one is declared', ['C1', 'GEO', 'C2', ...FULL.slice(3)], { compression: 'C2-C4' }],
      ['C4 missing beside a C2–C3 compression', ['C1', 'GEO', 'C2-C3 (compressed)', ...FULL.slice(3)], { compression: 'C2-C3' }],
      ['an unknown tag', [...FULL.slice(0, 5), 'C6a', ...FULL.slice(5)], { compression: 'C2-C4' }],
      ['a recorded row after C2', ['C1', 'GEO', 'C2-C4 (compressed)', 'GLANCE', ...FULL.slice(3)], { compression: 'C2-C4', rows: ['GLANCE'] }],
      ['a row the page does not record', ['C1', 'GEO', 'RESULTS', ...FULL.slice(2)], { compression: 'C2-C4' }],
    ];
    for (const [why, seq, opts] of faults) expect(cmfProblems(seq, opts).length, why).toBeGreaterThan(0);
  });

  test('band text, band markup, the order of parts in a text and the last paragraph of a band', () => {
    const html = page(band('C5', '<p class="lead">Empathy.</p><p>Origin.</p><ul><li>Authority.</li></ul><p>Method.</p>'), band('C6'));
    expect(compact(cmfBandText(html, 'C5'))).toBe('C5 Empathy. Origin. Authority. Method.');
    expect(cmfBandHtml(html, 'C5')).toHaveLength(1);
    expect(inOrder(cmfBandText(html, 'C5'), ['Empathy.', 'Origin.', 'Authority.', 'Method.'])).toEqual([]);
    expect(inOrder(cmfBandText(html, 'C5'), ['Origin.', 'Empathy.']).length).toBeGreaterThan(0);
    expect(inOrder(cmfBandText(html, 'C5'), ['Missing.']).length).toBeGreaterThan(0);
    expect(lastParagraph(cmfBandHtml(html, 'C5')[0])).toBe('Method.');
    expect(textOf('<p>a <span class="sr-only">hidden</span>b &amp; c</p>')).toBe('a b & c');
  });

  test('on the built site every conversion page’s data-cmf value is in the vocabulary, and the page opens with C1 and GEO', () => {
    // a conversion page carries a C1 band; the partner hub labels its bands in its own words (HERO, AUDIENCES, …) and is not one
    const tagged = listPages().filter((p) => cmfTags(readFileSync(p.file, 'utf8')).includes('C1'));
    expect(tagged.length, 'Home and Investors are tagged today').toBeGreaterThanOrEqual(2);
    for (const p of tagged) {
      const html = readFileSync(p.file, 'utf8');
      for (const t of cmfTags(html)) expect(CMF_TAGS as readonly string[], `${p.route}: ${t}`).toContain(t);
      expect(cmfSequence(html).slice(0, 2), p.route).toEqual(['C1', 'GEO']);
    }
  });
});

/* ============================================================================================== */
test.describe('copy.ts: the shared WP175 lines', () => {
  test('the C3 transition line', () => {
    expect(C3_TRANSITION).toBe('It doesn’t have to be this way.');
  });

  test('EMPATHY has one fresh line for every conversion page (Q2, owner rule on empathy lines)', () => {
    expect(Object.keys(EMPATHY).sort()).toEqual([...CONVERSION_PAGES].sort());
    expect(CONVERSION_PAGES).toHaveLength(13);
    const lines = Object.values(EMPATHY);
    expect(new Set(lines).size, 'no two pages share a line').toBe(lines.length);
    for (const [key, line] of Object.entries(EMPATHY)) {
      expect(sentences(line), key).toHaveLength(1);
      expect(line, key).toMatch(/^You\b.*\.$/);
      expect(line, key).not.toMatch(/\d/);
      expect(words(line), key).toBeLessThanOrEqual(25);
    }
    // the doc 04 lines that reviews retired (deficit presumptions, an unsourced comparison) are not restored (decisions: P6, P12, P7, P13, P8, P7b, P14)
    const RETIRED = [
      'You see capable students finish their degrees and still struggle to find work, and you are asked for placement results you cannot yet show.',
      'You have roles to fill and teams that need AI skills faster than hiring or generic courses can supply them.',
      'You have roles to fill and teams that need AI skills for their daily work.',
      'You are weighing a market with real demand for skills, and you need to tell a model that is working from one that is only promised.',
      'Impact investors need to see what is proven and what is still being built.',
      'You reach young people that central programs miss, often without the curriculum, certification and placement links to finish the job.',
      'You reach young people that national programs miss',
      'You want children to build digital skills early.',
      'You worked hard for your degree, but the job offers did not follow',
      'job offers did not follow',
    ];
    for (const line of lines) for (const r of RETIRED) expect(line).not.toContain(r);
  });

  test('JobReady@Campus keeps its problem lead (it read EMPATHY.universities; now CAMPUS_PROBLEM_LEAD, the same words)', () => {
    expect(CAMPUS_PROBLEM_LEAD).toBe('A degree alone does not show employers what students can do, and without follow-up data an institution cannot show where its students start earning.');
    expect(compact(textOf(cmfFreeBand(readBuilt('/programs/jobready-campus/'), 'problem')))).toContain(CAMPUS_PROBLEM_LEAD);
    expect(Object.values(EMPATHY)).not.toContain(CAMPUS_PROBLEM_LEAD);
  });

  test('METHOD gives every conversion page its one-sentence method line (the band’s last line, Q2)', () => {
    expect(Object.keys(METHOD).sort()).toEqual([...CONVERSION_PAGES].sort());
    for (const [key, m] of Object.entries(METHOD)) {
      expect(sentences(m.text), key).toHaveLength(1);
      expect(m.text, key).toMatch(/\.$/);
      if (m.link) expect(m.link, key).toEqual({ label: 'How TalentLEAP Works', href: '/our-model/talentleap/' });
    }
    expect(METHOD.governments.text).toBe('Our TalentLEAP method organizes skills into career paths.');
    expect(METHOD.work.text).toBe('JobReady@Work builds each program around a needs assessment.');
    expect(METHOD.work.link).toBeUndefined();
  });

  test('POSITIONING: one crafted statement per page that has a C6 statement, Home and Investors included (Q5)', () => {
    expect(Object.keys(POSITIONING).sort()).toEqual(CONVERSION_PAGES.filter((k) => k !== 'nuPgd').sort());
    const all = Object.entries(POSITIONING);
    const seen = new Map<string, string>();
    for (const [key, s] of all) {
      // not the literal template: no "For … who need …", no verbatim [UNLIKE] sentence, no in-sentence scope clause, no figure
      expect(s.text, key).not.toMatch(/^For /);
      expect(s.text, key).not.toContain('who need');
      expect(s.text, key).not.toMatch(/Unlike approaches|provision varies|randomized trial by BIGD|integrated training-to-earnings model/);
      expect(s.text, key).not.toContain('We combine training, mentoring and placement support in existing labs and colleges.');
      expect(s.text, key).not.toContain('agreed in the program scope');
      expect(s.text, key).not.toMatch(/\d/);
      expect(sentences(s.text).length, key).toBeLessThanOrEqual(2);
      for (const sentence of sentences(s.text)) {
        expect(words(sentence), `${key}: ${sentence}`).toBeLessThanOrEqual(50);
        expect(seen.get(sentence), `"${sentence}" is on ${seen.get(sentence)} and ${key}`).toBeUndefined();
        seen.set(sentence, key);
      }
      expect(s.facts.length, key).toBeGreaterThan(0);
      for (const id of s.facts) expect(() => fact(id), `${key}: ${id}`).not.toThrow();
    }
  });

  test('the gate declares each statement independently, in the same words (scripts/check-facts.mjs)', () => {
    const gate = readFileSync(resolve('scripts/check-facts.mjs'), 'utf8');
    const whole = /const POSITION_WHOLE_STATEMENT = \{([\s\S]*?)\n\};/.exec(gate)?.[1] ?? '';
    for (const [key, route] of Object.entries(POSITION_ROUTE)) expect(whole, key).toContain(`'${route}': '${POSITIONING[key as keyof typeof POSITIONING].text}'`);
  });

  test('the C10 heading and the USP lines (doc 04 §6, as the register reads today)', () => {
    expect(DIFFERENCE_HEADING).toBe('What Makes CodersTrust Different');
    expect(titleCase(DIFFERENCE_EYEBROW)).toBe(DIFFERENCE_EYEBROW);
    expect(Object.keys(USPS).sort()).toEqual(['credential', 'credentialWork', 'earners', 'evidence', 'infrastructure']);
    for (const [key, u] of Object.entries(USPS)) {
      expect(titleCase(u.title), key).toBe(u.title);
      expect(sentences(u.text), key).toHaveLength(1);
      expect(u.facts.length, key).toBeGreaterThan(0);
      expect(`${u.title} ${u.text}`, key).not.toMatch(/within six months|started earning within|agreed in the program scope|9,000\+/i);
    }
    // USP 2 reads OC-05 (58.7% of 172), never doc 04's stale 58.8% of 170
    const oc05 = fact('OC-05');
    expect(USPS.earners.text).toContain(oc05.stat!.value);
    expect(USPS.earners.text).toContain(`of the ${/of the (\d+) surveyed/.exec(oc05.stat!.label)![1]} surveyed completers who first earned during or after training`);
    expect(USPS.earners.facts).toEqual(['OC-05']);
  });

  test('the C7 one-line trial lead (Q3) is the Local Partners evidence line, held to RC-01 and RC-02', () => {
    const points = fact('RC-02').stat!.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points');
    expect(TRIAL_LEAD.text).toBe(`A randomized trial of CodersTrust’s WSDFM program found women offered a place were ${points} more likely to be employed.`);
    expect(TRIAL_LEAD.text).toBe(LOCAL_PARTNER_EVIDENCE[0].text);
    expect(TRIAL_LEAD.facts).toEqual(['RC-01', 'RC-02']);
  });
});

/* ============================================================================================== */
/** A band of a page by id (pages that are not tagged yet), as raw HTML. */
function cmfFreeBand(html: string, id: string): string {
  const open = new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
  if (!open) throw new Error(`no <section id="${id}">`);
  const re = /<(\/?)section\b[^>]*>/g;
  re.lastIndex = open.index;
  let depth = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(open.index, re.lastIndex);
  }
  throw new Error(`<section id="${id}"> is not closed`);
}
const cardTitles = (band: string) => [...band.matchAll(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]));
const cardTexts = (band: string) => [...band.matchAll(/<p class="card__text"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));

test.describe('copy.ts: the campus and employer lines that packages B and C share', () => {
  const EMPLOYERS = readBuilt('/partner-with-us/employers/');
  const UNIVERSITIES = readBuilt('/partner-with-us/universities/');

  test('EMPLOYER_PAINS are the Employers page’s three pains, P1 to P3, in its order', () => {
    expect(EMPLOYER_PAINS.map((p) => p.id)).toEqual(['P1', 'P2', 'P3']);
    const problem = cmfFreeBand(EMPLOYERS, 'problem');
    const shown = [...problem.matchAll(/<p class="gp__q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
    expect(shown).toEqual(EMPLOYER_PAINS.map((p) => titleCase(p.name)));
    const said = [...problem.matchAll(/<p class="gp__a"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
    expect(said).toEqual(EMPLOYER_PAINS.map((p) => p.text));
  });

  test('EMPLOYER_INCLUDES are the Employers page’s three cards, ordered P1 to P3 (P2 is met by the customized curriculum, P3 by the AI skills card)', () => {
    expect(EMPLOYER_INCLUDES.map((c) => c.painId)).toEqual(['P1', 'P2', 'P3']);
    expect(EMPLOYER_INCLUDES.map((c) => c.title)).toEqual(['Job-Ready Candidates for Your Roles', 'Customized Curriculum and Workshops', 'AI Skills Scoped to Your Team’s Tasks']);
    const features = cmfFreeBand(EMPLOYERS, 'features');
    expect([...cardTitles(features)].sort()).toEqual(EMPLOYER_INCLUDES.map((c) => c.title).sort());
    expect([...cardTexts(features)].sort()).toEqual(EMPLOYER_INCLUDES.map((c) => c.text).sort());
  });

  // WP175-Z (owner decisions of 2026-11-28; WP145): step 2 says the certification preparation in WP145's approved words ("can be added where a track offers one"), not the wording WP145 retired on
  // Employers and JobReady@Work ("including preparation for an industry certification where a track offers one"), and it leaves the exam terms ("set per program", which it carried) to the one
  // statement each page makes elsewhere (JobReady@Work's glance, Employers' C10 line; tests/wp163.spec.ts holds the qualifier to once per page).
  test('EMPLOYER_STEPS: Assess, Train, Support and Measure; step 2 in WP145’s wording, with no second scope sentence and no exam-terms qualifier', () => {
    expect(EMPLOYER_STEPS.map((s) => s.title)).toEqual(['Assess', 'Train', 'Support and Measure']);
    for (const s of EMPLOYER_STEPS) expect(s.text).not.toContain('agreed in the program scope');
    expect(EMPLOYER_STEPS[1].text).toBe('Custom curriculum and workshops; preparation for an industry certification can be added where a track offers one.');
    expect(EMPLOYER_STEPS[1].text).not.toContain('including preparation for an industry certification where a track offers one');
    for (const s of EMPLOYER_STEPS) expect(s.text).not.toMatch(/\b(?:exam fees?|exam eligibility|eligibility, attempts)\b[^.;]*?\bset per program\b/);
  });

  test('WORK_BRIDGE is the Employers definition band’s bridge sentence', () => {
    expect(compact(textOf(cmfFreeBand(EMPLOYERS, 'definition')))).toContain(WORK_BRIDGE.text);
    expect(WORK_BRIDGE.facts).toEqual(['IN-10', 'IN-04']);
  });

  test('CAMPUS_INCLUDES are the Universities page’s three cards, P1 to P3, in its order; CAMPUS_STEPS read PD-01’s hours', () => {
    expect(CAMPUS_INCLUDES.map((c) => c.painId)).toEqual(['P1', 'P2', 'P3']);
    const features = cmfFreeBand(UNIVERSITIES, 'features');
    // WP175 package B (owner decision of 2026-11-28: C8 names its gain creator): the page's cards are CAMPUS_INCLUDES, P1 to P3 in order, then one gain creator (tests/wp175-universities.spec.ts)
    expect(cardTitles(features).slice(0, 3)).toEqual(CAMPUS_INCLUDES.map((c) => c.title));
    expect(cardTexts(features).slice(0, 3)).toEqual(CAMPUS_INCLUDES.map((c) => c.text));
    expect([...features.matchAll(/<li class="card inc__card"[^>]*data-relieves="(P\d)"/g)].map((m) => m[1])).toEqual(['P1', 'P2', 'P3']);
    expect(CAMPUS_INCLUDES[1].text).toBe(TRACK_MENU.text);
    expect(CAMPUS_STEPS.map((s) => s.title)).toEqual(['Set Up', 'Prepare for Certification', 'Mentor and Place']);
    expect(CAMPUS_STEPS[1].text).toBe(`${fact('PD-01').stat!.value} training hours per certification, including exam preparation.`);
    for (const s of CAMPUS_STEPS) expect(s.text).not.toMatch(/tracer|certified/i);
  });
});

/* ============================================================================================== */
test.describe('the shared bands: new options shown on the styleguide, defaults unchanged', () => {
  const SG = readBuilt(STYLEGUIDE);

  test('ProblemBand: `transition` closes the band with its line; without it the band ends with its cards, as before', () => {
    const demo = cmfFreeBand(SG, 'sg-problem-transition');
    expect(demo).toMatch(/<p class="pb__transition"[^>]*data-transition[^>]*>[^<]+<\/p>\s*<\/div>\s*<\/section>$/);
    // WP175-Z (owner decisions of 2026-11-28): the sample carries the C3 line itself (it printed "A sample transition line closes the band." only while tests/wp40.spec.ts held the line off every page)
    expect(lastParagraph(demo)).toBe(C3_TRANSITION);
    expect(demo.split(C3_TRANSITION).length - 1, 'the sample prints the line once').toBe(1);
    expect(SG).not.toContain('A sample transition line closes the band.');
    expect(cmfFreeBand(SG, 'band-problem')).not.toContain('data-transition');
  });

  // WP175-Z: CaseStudyCarousel's `trialLead` (Home, Development Partners and Foundations) marks the lead with the trial's facts; a carousel given a plain `lead`, or none, is unchanged (no marker)
  test('CaseStudyCarousel: `trialLead` prints the lead with data-fact="RC-01 RC-02"; a plain lead or none carries no marker, as before', () => {
    for (const route of ['/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/']) {
      const header = /<section\b[^>]*\bid="cases"[\s\S]*?<\/header>/.exec(readBuilt(route))![0];
      expect(header, route).toContain(`<p class="sh__lead lead" data-fact="RC-01 RC-02"`);
      expect(textOf(/<p class="sh__lead lead"[^>]*>([\s\S]*?)<\/p>/.exec(header)![1]), route).toBe(TRIAL_LEAD.text);
    }
    // SectionHeader's `leadFacts` is set only through `trialLead`: no other section-header lead on the site carries a marker (every other caller of SectionHeader is unchanged)
    const marked = listPages()
      .filter((p) => /class="sh__lead lead" data-fact=/.test(readFileSync(p.file, 'utf8')))
      .map((p) => p.route)
      .sort();
    expect(marked).toEqual(['/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/']);
  });

  test('DifferenceBand: #difference, the one C10 heading, two to four USP lines, no table', () => {
    const band = cmfFreeBand(SG, 'difference');
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(band)![1])).toBe(DIFFERENCE_HEADING);
    expect(band).not.toMatch(/<table\b/);
    const items = [...band.matchAll(/<li class="diff__item"[^>]*data-fact="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)];
    expect(items.map((m) => textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]))).toEqual([USPS.evidence.title, USPS.credential.title, USPS.infrastructure.title]);
    expect(items.map((m) => m[1])).toEqual([USPS.evidence, USPS.credential, USPS.infrastructure].map((u) => u.facts.join(' ')));
    expect(items.map((m) => textOf(/<p class="diff__text"[^>]*>([\s\S]*?)<\/p>/.exec(m[2])![1]))).toEqual([USPS.evidence.text, USPS.credential.text, USPS.infrastructure.text]);
  });

  test('DifferenceBand: no coloured top or left accent bar on the items or the list (owner rule)', async ({ page }) => {
    await open(page, 'styleguide/');
    const borders = await page.locator('#difference .diff, #difference .diff__item').evaluateAll((els) =>
      els.map((el) => {
        const cs = getComputedStyle(el);
        return `${cs.borderTopWidth} ${cs.borderLeftWidth}`;
      }),
    );
    expect(borders.length).toBe(4);
    for (const b of borders) expect(b).toBe('0px 0px');
  });

  test('PartnerGuideBand: `withOrigin` prints the origin line before the opening sentence, and `methodLast` makes the method line the band’s last line', () => {
    const band = cmfFreeBand(SG, 'sg-guide-c5');
    const text = textOf(band);
    expect(inOrder(text, [EMPATHY.foundations, 'From a Copenhagen launch to work across', 'Organizations that have worked with CodersTrust include', METHOD.foundations.text])).toEqual([]);
    expect(lastParagraph(band)).toBe(`${METHOD.foundations.text} How TalentLEAP Works`);
    expect(band).toMatch(/<p class="pg__method pg__method--last" data-fact="IN-06"/);
  });

  test('ProofBand: `trialLead` states the trial in one line as the band’s first line; `surveyLeadIn` labels the survey sentence; the default band is unchanged', () => {
    const band = cmfFreeBand(SG, 'sg-proof-lead');
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(band)![1])).toBe('An Evidence Band Led by the Trial'); // the sample's own heading (a page passes headlineFact, which keeps the trial heading)
    const lead = /<p class="lead proofband__headline" data-fact="([^"]+)"[^>]*>([\s\S]*?)<\/p>/.exec(band);
    expect(lead?.[1]).toBe('RC-01 RC-02');
    expect(textOf(lead![2])).toBe(TRIAL_LEAD.text);
    expect(band).not.toContain(fact('RC-01').headline!.slice(0, 40));
    expect(band).toMatch(/<p class="proofband__chartlead"[^>]*><strong\b[^>]*>From CodersTrust’s youth programs:<\/strong> Among surveyed completers/);
    const plain = cmfFreeBand(SG, 'band-proof');
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(plain)![1])).toBe(TRIAL_BAND_HEADING);
    expect(plain).toContain('the BRAC Institute of Governance and Development (BIGD)');
    expect(plain).not.toMatch(/<strong\b/);
  });
});

/* ============================================================================================== */
test.describe('the ten pages that print a statement: the new wording, first in C6, once; their dates move to 2026-11-28', () => {
  for (const key of RENDERED) {
    const route = POSITION_ROUTE[key];
    test(`${route}: the statement is POSITIONING.${key}, the first content of #mechanism, and the page’s only statement`, () => {
      const html = readBuilt(route);
      const band = cmfFreeBand(html, 'mechanism');
      const pos = /<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(band);
      expect(textOf(pos![1])).toBe(POSITIONING[key as keyof typeof POSITIONING].text);
      expect(html.split('class="pos__text"').length - 1).toBe(1);
      const main = textOf(/<main[\s\S]*<\/main>/.exec(html)![0]);
      expect(main.split(POSITIONING[key as keyof typeof POSITIONING].text).length - 1).toBe(1);
      const dates = [...html.matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1]);
      expect(dates, 'the WebPage dateModified').toContain(TODAY);
      if (route.startsWith('/programs/')) expect(html).toContain(`Last updated <time datetime="${TODAY}"`);
    });
  }
});
