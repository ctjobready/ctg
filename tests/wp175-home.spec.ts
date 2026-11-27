import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, FUNDER_PAINS, METHOD, POSITIONING, STEPS, TRIAL_LEAD, USPS, originShortUnder } from '../src/data/copy';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, cmfTags, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';
import { elements, parseHtml } from '../scripts/lib/dist.mjs';
import { titleCase } from '../src/lib/titleCase.mjs';

/**
 * WP175 package A (owner decisions of 28 November 2026, scratchpad wp175-decisions.md): Home (`/`, P1) follows CMF v3, C1 to C14, in order and coverage.
 *   Order      C1 · GEO · RESULTS · ROUTER · C2–C4 (compressed) · C5 · C6 · C7 · C8 · C9 · C10 · C11 · C12 · C13 · C14
 *   Exception  C1 keeps its proof cards and the funders' logo row, and "Results You Can Check" stays as a recorded row before C2 (Q6 (a); doc 06 P1 records it)
 *   C2–C4      one band: the three ranked funder pains (pains 2 and 3 close with the C3 findings RC-06 and PX-06), then the C3 transition line as its last line
 *   C5         the empathy line, ORIGIN in one line, the authority (signed agreements, relationship cards, recognition, the world strip), then METHOD.home as the band's last line;
 *              the method is said once on the page (no TalentLEAP line in C6 any more)
 *   C6         POSITIONING.home first; C7 the one-line trial lead first; C8 one card per pain in rank order, a gain creator and "How It Works in Three Steps"
 *   C10        "What Makes CodersTrust Different", two USP lines (#difference, no table); C12 "Start with a Multi-Cohort Pilot, Then Decide on Evidence" directly before C13
 * Run `npm run build`, then `PORT=4931 npx playwright test tests/wp175-home.spec.ts --project=chromium`. Every test reads the built file.
 */

const HTML = readBuilt('/');
const SEQUENCE = ['C1', 'GEO', 'RESULTS', 'ROUTER', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
/** The page's declared compression, in the words package Z records in doc 06 P1 and doc 04 §4 (audit §1, owner decisions Q1 and Q7). */
const COMPRESSION = {
  tag: 'C2-C4 (compressed)',
  declaration:
    'P1 declares a C2–C4 compression (owner approvals of 2026-11-21, WP166-A R1-07 and R1-14; recorded 2026-11-28): the C2 band carries the three ranked funder pains, pains 2 and 3 close with the C3 findings (RC-06, PX-06), and the band ends with the C3 transition line ‘It doesn’t have to be this way.’; the Imagine (C4) vignettes and the C2a gains are not rendered.',
};
/** The declared C1 exception (Q6 (a)): the hero's proof strip is a C1 sub-block; the carousel and the router are recorded rows before C2. */
const ROWS = ['RESULTS', 'ROUTER'];
const GUIDE_HEADING = 'We’ve Built This Path Since 2014';

const compact = (s: string) => s.replace(/\s+/g, ' ').trim();
const band = (tag: string) => {
  const all = cmfBandHtml(HTML, tag);
  expect(all, `one ${tag} band`).toHaveLength(1);
  return all[0];
};
/** The tags of the element children of <main>, in order (the wrappers themselves, not nested tags). */
type El = { type: string; tag: string; attrs: Record<string, string>; children: El[] };
const mainChildren = (): El[] => ((elements(parseHtml(HTML), 'main')[0] as El).children ?? []).filter((c) => c.type === 'element');
/** The paragraphs of a band's header after its H2, as visible text. */
const afterHeading = (bandHtml: string) => {
  const h2 = /<h2\b[^>]*>[\s\S]*?<\/h2>/.exec(bandHtml)!;
  return [...bandHtml.slice(h2.index + h2[0].length).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
};

test.describe('Home: CMF v3 order and coverage', () => {
  test('the bands run C1 to C14 with the declared compression and the recorded rows', () => {
    const seq = cmfSequence(HTML);
    expect(cmfProblems(seq, { compression: 'C2-C4', rows: ROWS })).toEqual([]);
    expect(seq).toEqual(SEQUENCE);
  });

  test('GEO is the wrapper directly after C1 and states ID-01 verbatim', () => {
    const all = mainChildren();
    const kids = all.filter((k) => 'data-cmf' in k.attrs);
    expect(kids[0].attrs['data-cmf']).toBe('C1');
    expect(kids[1].attrs['data-cmf']).toBe('GEO');
    expect(all.indexOf(kids[1]), 'nothing untagged sits between C1 and GEO').toBe(all.indexOf(kids[0]) + 1);
    expect(compact(cmfBandText(HTML, 'GEO'))).toContain(fact('ID-01').text);
  });

  test('C12 sits directly before C13, and C13 is the page’s one closing call to action', () => {
    const seq = cmfSequence(HTML);
    expect(seq[seq.indexOf('C12') + 1]).toBe('C13');
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(band('C12'))![1])).toBe('Start with a Multi-Cohort Pilot, Then Decide on Evidence');
    expect(band('C12')).toMatch(/<section\b[^>]*\bid="risk"/);
  });
});

test.describe('Home: the declared C1 exception (Q6 (a))', () => {
  test('the hero keeps its proof cards and the funders’ logo row; "Results You Can Check" and the router are recorded rows between GEO and C2', () => {
    const hero = band('C1');
    expect(hero).toMatch(/<li class="hh__card" data-fact="RC-02"/);
    expect(hero).toMatch(/hh__funders/);
    const seq = cmfSequence(HTML);
    expect(seq.slice(seq.indexOf('GEO') + 1, seq.indexOf(COMPRESSION.tag))).toEqual(ROWS);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(band('RESULTS'))![1])).toBe('Results You Can Check');
  });
});

test.describe('Home: C2–C4 compressed into the problem band', () => {
  test('the compression is declared, no separate C2, C3 or C4 band is tagged, and the band ends with the transition line', () => {
    expect(COMPRESSION.declaration).toContain(C3_TRANSITION);
    const tags = cmfTags(HTML);
    expect(tags).toContain(COMPRESSION.tag);
    for (const t of ['C2', 'C3', 'C4', 'C2-C3 (compressed)']) expect(tags, t).not.toContain(t);
    const problem = band(COMPRESSION.tag);
    expect(lastParagraph(problem)).toBe(C3_TRANSITION);
    expect(problem).toMatch(/<p class="pb__transition" data-transition[^>]*>/);
    expect(compact(textOf(HTML)).split(C3_TRANSITION).length - 1, 'the transition line is said once').toBe(1);
  });

  test('the three ranked funder pains, P1 to P3; pains 2 and 3 close with their findings', () => {
    const problem = band(COMPRESSION.tag);
    expect([...problem.matchAll(/<li data-pain="([^"]+)"/g)].map((m) => m[1])).toEqual(['P1', 'P2', 'P3']);
    expect([...problem.matchAll(/<p class="gp__q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]))).toEqual(FUNDER_PAINS.map((p) => titleCase(p.name)));
    expect(/<li data-pain="P2" data-fact="([^"]*)"/.exec(problem)?.[1]).toBe('RC-06');
    expect(/<li data-pain="P3" data-fact="([^"]*)"/.exec(problem)?.[1]).toBe('PX-06');
  });
});

test.describe('Home: C5 empathy → ORIGIN → authority → method', () => {
  const origin = originShortUnder(GUIDE_HEADING, { tile: true }).text;
  test('the four elements, in order, one line each, with the method as the band’s last line', () => {
    const text = cmfBandText(HTML, 'C5');
    expect(inOrder(text, [GUIDE_HEADING, EMPATHY.home, origin, 'CodersTrust has signed MOUs, agreements or contracts with 70+ organizations', 'These are working relationships, not endorsements.', 'CodersTrust Around the World', METHOD.home.text])).toEqual([]);
    const guide = band('C5');
    expect(lastParagraph(guide)).toBe(`${METHOD.home.text} ${METHOD.home.link!.label}`);
    expect(guide).toMatch(/<p class="guide__method" data-fact="IN-06"[^>]*>/);
    expect(guide).toMatch(/<p class="guide__empathy lead"[^>]*>/);
    expect(guide).toMatch(/<p class="guide__from" data-fact="ID-02 SC-03"[^>]*>/);
  });

  test('the origin line leaves the count of countries to the hero card and the world strip (one statement per figure)', () => {
    expect(origin).toBe('From a Copenhagen launch to work across Asia, Africa, Europe and the Americas.');
    expect(cmfBandText(HTML, 'C5')).not.toContain('16 countries and territories');
  });

  test('the method is said once on the page, in C5: no TalentLEAP line in the mechanism band', () => {
    const main = compact(textOf(/<main[\s\S]*<\/main>/.exec(HTML)![0]));
    expect(main.split(METHOD.home.text).length - 1).toBe(1);
    expect(main).not.toContain('Our method organizes skills into career paths. We call it TalentLEAP.');
    expect(cmfBandText(HTML, 'C6')).not.toContain('TalentLEAP');
    expect(main.split('How TalentLEAP Works').length - 1).toBe(1);
  });
});

test.describe('Home: C6 opens with the positioning statement', () => {
  test('POSITIONING.home is the first thing after the H2, printed once', () => {
    const mech = band('C6');
    const h2 = /<h2\b[^>]*>[\s\S]*?<\/h2>/.exec(mech)!;
    const rest = mech.slice(h2.index + h2[0].length);
    expect(rest).toMatch(/^\s*<div class="pos"/);
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(rest)![1])).toBe(POSITIONING.home.text);
    expect(HTML.split('class="pos__text"').length - 1).toBe(1);
    expect(compact(textOf(HTML)).split(POSITIONING.home.text).length - 1).toBe(1);
  });
});

test.describe('Home: C7 leads with the trial', () => {
  test('the one-line trial lead is the first line after the "Proof in Practice" heading; the learner stories stay in C7', () => {
    const proof = band('C7');
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(proof)![1])).toBe('Proof in Practice');
    expect(afterHeading(proof)[0]).toBe(TRIAL_LEAD.text);
    // WP175-Z: the lead is claim-marked with the trial's facts (CaseStudyCarousel `trialLead`), as ProofBand's and ContractTable's trial leads are
    expect(proof).toMatch(new RegExp(`<p class="sh__lead lead" data-fact="${TRIAL_LEAD.facts.join(' ')}"[^>]*>${TRIAL_LEAD.text}</p>`));
    expect(proof).toMatch(/\bid="journeys"/);
  });
});

test.describe('Home: C8 relieves each pain, then a gain creator and the three steps', () => {
  test('one card per pain, in the pains’ rank order; one gain creator; "How It Works in Three Steps" with three steps', () => {
    const c8 = band('C8');
    expect(c8).toMatch(/<section\b[^>]*\bid="features"/);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c8)![1])).toBe('What a Supported Youth Cohort Includes');
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>([\s\S]*?)<\/li>/g)];
    const relieves = cards.map((m) => /data-relieves="([^"]+)"/.exec(m[1])?.[1]);
    expect(relieves.filter(Boolean)).toEqual(['P1', 'P2', 'P3']);
    expect(relieves.slice(0, 3), 'the relievers come first').toEqual(['P1', 'P2', 'P3']);
    expect(relieves.filter((r) => !r).length, 'one gain creator').toBe(1);
    expect(cards.map((m) => textOf(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]))).toEqual([
      'Training, Mentoring and Placement Support',
      'Progress You Can Check',
      'Tracks Chosen from Employer Demand',
      'The Right Career or Foundation Track',
    ]);
    const steps = /<h3\b[^>]*>How It Works in Three Steps<\/h3>([\s\S]*?)<\/ol>/.exec(c8);
    expect(steps, 'the three-step heading').toBeTruthy();
    expect([...steps![1].matchAll(/<li class="steps__item"/g)]).toHaveLength(3);
    expect(compact(textOf(steps![1]))).toContain(STEPS[0].title);
    // the training hours are the mechanism band's, once on the page; step 2 opens "Training, then ..."
    expect(compact(textOf(steps![1]))).toContain('Training, then three months of milestone-based one-to-one mentoring');
    expect(compact(textOf(/<main[\s\S]*<\/main>/.exec(HTML)![0])).split('training hours per certification').length - 1).toBe(1);
  });

  test('no card repeats a sentence of the mechanism band (C6) word for word', () => {
    const mech = compact(cmfBandText(HTML, 'C6'));
    const cards = [...band('C8').matchAll(/<p class="card__text"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
    for (const c of cards) for (const s of c.split(/(?<=\.)\s+/)) expect(mech, s).not.toContain(s);
  });
});

test.describe('Home: C10 short differentiation band', () => {
  test('#difference has the one heading, two USP lines and no table', () => {
    const diff = band('C10');
    expect(diff).toMatch(/<section\b[^>]*\bid="difference"/);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(diff)![1])).toBe(DIFFERENCE_HEADING);
    expect(diff).not.toMatch(/<table\b/);
    const items = [...diff.matchAll(/<li class="diff__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[1])![1]));
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items.length).toBeLessThanOrEqual(4);
    expect(items).toEqual([USPS.evidence.title, USPS.credential.title]);
    // Home names no exam terms (WP142): its credential line is the shared one's first clause
    expect(textOf(diff)).toContain('Each track includes preparation for an industry certification exam.');
    expect(textOf(diff)).not.toContain('exam terms');
  });
});

test.describe('Home: C13 and C14', () => {
  test('the closing band has no risk line of its own any more (C12 says it), and one solid primary button', () => {
    const cta = band('C13');
    expect(textOf(cta)).not.toContain('Start with a multi-cohort pilot, agree the scorecard up front and decide on expansion from the evidence.');
    // a solid button: primary on a light band, inverse on the Klein band (tests/home-cta.spec.ts)
    expect([...cta.matchAll(/class="btn btn--(?:primary|inverse)\b/g)]).toHaveLength(1);
  });
});
