import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, METHOD, POSITIONING, STEPS, TRIAL_LEAD, USPS, originShortUnder } from '../src/data/copy';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, cmfTags, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';
import { elements, parseHtml } from '../scripts/lib/dist.mjs';

/**
 * WP175 package A (owner decisions of 28 November 2026, scratchpad wp175-decisions.md): Development Partners (`/partner-with-us/development-partners/`, P4) follows CMF v3, C1 to C14.
 *   Order      C1 · GEO · GLANCE · C2–C4 (compressed) · C5 · C6 · C7 · C8 · C9 · C10 · C11 · C12 · C13 · C14 (the route link under the hero is one of C6's links now)
 *   C2–C4      one band: the three ranked pains, then the C3 transition line as its last line
 *   C5         EMPATHY.developmentPartners, ORIGIN in one line (the regions: the SC-03 tile carries the count), the tiles and the signed agreements, the world and logo strips, METHOD last
 *   C6         POSITIONING.developmentPartners first; C7 the one-line trial lead first, the learner story after the carousel; C8 one card per pain in rank order, a gain creator, the three
 *              steps; C9 the FAQ and the due-diligence view; C10 USPs 1, 2 and 4; C12 "Start with a Pilot, Then Decide on Evidence" (restored) with the "Reporting and Review" callout under it,
 *              directly before C13
 * Run `npm run build`, then `PORT=4931 npx playwright test tests/wp175-development-partners.spec.ts --project=chromium`. Every test reads the built file.
 */

const ROUTE = '/partner-with-us/development-partners/';
const HTML = readBuilt(ROUTE);
const SEQUENCE = ['C1', 'GEO', 'GLANCE', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
/** The page's declared compression, in the words package Z records in doc 04 4.1 (audit §2). */
const COMPRESSION = {
  tag: 'C2-C4 (compressed)',
  declaration:
    'C2–C4 compressed (declared; owner decision 2026-10-15, recast 2026-11-28): no Cost of Waiting (C3) or Imagine (C4) band. The C2 band keeps pains P1–P3 and closes with “It doesn’t have to be this way.”; the C2a gains, the C3 facts (PX-06, RC-06) and the C4 future-state sentence are not rendered.',
};
const PAINS = ['Training Must Connect to Paid Work', 'Barriers Can Interrupt Training', 'Outcomes Are Hard to Audit'];
const CARDS = ['Training, Mentoring and Placement Support', 'Accessible Local Delivery', 'Progress Your Evaluators Can Check', 'A Supported Route to a Recognized Credential'];
const GUIDE_HEADING = 'We’ve Built This Path Since 2014';
const RISK_LEAD = 'For supported cohorts, monthly reports track progress; quarterly reviews guide corrective action and any expansion.';

const compact = (s: string) => s.replace(/\s+/g, ' ').trim();
const band = (tag: string) => {
  const all = cmfBandHtml(HTML, tag);
  expect(all, `one ${tag} band`).toHaveLength(1);
  return all[0];
};
const h2Of = (bandHtml: string) => textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(bandHtml)![1]);
type El = { type: string; tag: string; attrs: Record<string, string>; children: El[] };
const mainChildren = (): El[] => ((elements(parseHtml(HTML), 'main')[0] as El).children ?? []).filter((c) => c.type === 'element');
const afterHeading = (bandHtml: string) => {
  const h2 = /<h2\b[^>]*>[\s\S]*?<\/h2>/.exec(bandHtml)!;
  return [...bandHtml.slice(h2.index + h2[0].length).matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
};
const mainText = () => compact(textOf(/<main[\s\S]*<\/main>/.exec(HTML)![0]));

test.describe('Development Partners: CMF v3 order and coverage', () => {
  test('the bands run C1 to C14 with the declared compression and the recorded glance row', () => {
    const seq = cmfSequence(HTML);
    expect(cmfProblems(seq, { compression: 'C2-C4', rows: ['GLANCE'] })).toEqual([]);
    expect(seq).toEqual(SEQUENCE);
  });

  test('GEO is the wrapper directly after C1 and states ID-01 verbatim; the YouthWIDE link is in C6', () => {
    const all = mainChildren();
    const c1 = all.findIndex((k) => k.attrs['data-cmf'] === 'C1');
    expect(all[c1 + 1].attrs['data-cmf']).toBe('GEO');
    expect(HTML).not.toMatch(/\bid="route-link"/);
    expect(compact(cmfBandText(HTML, 'GEO'))).toContain(fact('ID-01').text);
    expect(textOf(band('C6'))).toContain('How YouthWIDE Works');
  });

  test('C12 is the restored risk-reversal band, directly before C13, with the "Reporting and Review" callout (PD-08, PD-11) tucked under it', () => {
    const seq = cmfSequence(HTML);
    expect(seq[seq.indexOf('C12') + 1]).toBe('C13');
    const risk = band('C12');
    expect(risk).toMatch(/<section\b[^>]*\bid="risk"/);
    expect(h2Of(risk)).toBe('Start with a Pilot, Then Decide on Evidence');
    expect(risk.indexOf('id="risk"')).toBeLessThan(risk.indexOf('Reporting and Review'));
    expect(risk).toMatch(/<p data-fact="PD-08 PD-11"[^>]*>For supported cohorts, monthly reports track progress;/);
    expect(mainText().split(RISK_LEAD).length - 1).toBe(1);
    expect(mainText().split('Reporting and Review').length - 1).toBe(1);
  });
});

test.describe('Development Partners: C2–C4 compressed into the problem band', () => {
  test('the compression is declared, no separate C2, C3 or C4 band is tagged, and the band ends with the transition line', () => {
    expect(COMPRESSION.declaration).toContain(C3_TRANSITION);
    const tags = cmfTags(HTML);
    expect(tags).toContain(COMPRESSION.tag);
    for (const t of ['C2', 'C3', 'C4', 'C2-C3 (compressed)']) expect(tags, t).not.toContain(t);
    expect(lastParagraph(band(COMPRESSION.tag))).toBe(C3_TRANSITION);
    expect(mainText().split(C3_TRANSITION).length - 1).toBe(1);
  });

  test('three ranked pains, P1 to P3', () => {
    const problem = band(COMPRESSION.tag);
    expect([...problem.matchAll(/<li data-pain="([^"]+)"/g)].map((m) => m[1])).toEqual(['P1', 'P2', 'P3']);
    expect([...problem.matchAll(/<p class="gp__q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]))).toEqual(PAINS);
  });
});

test.describe('Development Partners: C5 empathy → ORIGIN → authority → method', () => {
  test('the four elements, in order, with the method as the band’s last line', () => {
    const origin = originShortUnder(GUIDE_HEADING, { tile: true }).text;
    expect(origin).toBe('From a Copenhagen launch to work across Asia, Africa, Europe and the Americas.');
    expect(inOrder(cmfBandText(HTML, 'C5'), [GUIDE_HEADING, EMPATHY.developmentPartners, origin, '130,000+', 'development partners and NGOs', 'CodersTrust Around the World', METHOD.developmentPartners.text])).toEqual([]);
    const guide = band('C5');
    expect(lastParagraph(guide)).toBe(`${METHOD.developmentPartners.text} ${METHOD.developmentPartners.link!.label}`);
    expect(guide).toMatch(/<p class="pg__method pg__method--last" data-fact="IN-06"/);
    expect(mainText().split(METHOD.developmentPartners.text).length - 1, 'the method is said once').toBe(1);
  });
});

test.describe('Development Partners: C6 opens with the positioning statement', () => {
  test('POSITIONING.developmentPartners is the first thing after the H2, printed once', () => {
    const mech = band('C6');
    const h2 = /<h2\b[^>]*>[\s\S]*?<\/h2>/.exec(mech)!;
    const rest = mech.slice(h2.index + h2[0].length);
    expect(rest).toMatch(/^\s*<div class="pos"/);
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(rest)![1])).toBe(POSITIONING.developmentPartners.text);
    expect(HTML.split('class="pos__text"').length - 1).toBe(1);
  });
});

test.describe('Development Partners: C7 leads with the trial', () => {
  test('the one-line trial lead is the first line after the "Proof in Practice" heading; the learner story follows the carousel', () => {
    const proof = band('C7');
    expect(h2Of(proof)).toBe('Proof in Practice');
    expect(afterHeading(proof)[0]).toBe(TRIAL_LEAD.text);
    // WP175-Z: the lead is claim-marked with the trial's facts (CaseStudyCarousel `trialLead`), as ProofBand's and ContractTable's trial leads are
    expect(proof).toMatch(new RegExp(`<p class="sh__lead lead" data-fact="${TRIAL_LEAD.facts.join(' ')}"[^>]*>${TRIAL_LEAD.text}</p>`));
    expect(proof.indexOf('id="cases"')).toBeLessThan(proof.indexOf('id="learner-voice"'));
  });
});

test.describe('Development Partners: C8 relieves each pain, then a gain creator and the three steps', () => {
  test('one card per pain, in rank order; one gain creator; "How It Works in Three Steps" with three steps', () => {
    const c8 = band('C8');
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>([\s\S]*?)<\/li>/g)];
    expect(cards.map((m) => /data-relieves="([^"]+)"/.exec(m[1])?.[1])).toEqual(['P1', 'P2', 'P3', undefined]);
    expect(cards.map((m) => textOf(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]))).toEqual(CARDS);
    const steps = /<h3\b[^>]*>How It Works in Three Steps<\/h3>([\s\S]*?)<\/ol>/.exec(c8);
    expect(steps, 'the three-step heading').toBeTruthy();
    expect([...steps![1].matchAll(/<h4 class="steps__title"[^>]*>([\s\S]*?)<\/h4>/g)].map((m) => textOf(m[1]))).toEqual(STEPS.map((s) => s.title));
    // the 100 hours per certification are the delivery model's, once on the page (WP49); step 2 opens "Training, then ..."
    expect(compact(textOf(steps![1]))).toContain('Training, then three months of milestone-based one-to-one mentoring');
    expect(mainText().split('training hours per certification').length - 1).toBe(1);
  });
});

test.describe('Development Partners: C9, C10 and the date', () => {
  test('C9 holds the FAQ and the due-diligence view', () => {
    const c9 = band('C9');
    expect(c9).toMatch(/\bid="faq"/);
    expect(c9).toMatch(/\bid="due-diligence"/);
  });

  test('#difference has the one heading and three USP lines, no table', () => {
    const diff = band('C10');
    expect(diff).toMatch(/<section\b[^>]*\bid="difference"/);
    expect(h2Of(diff)).toBe(DIFFERENCE_HEADING);
    expect(diff).not.toMatch(/<table\b/);
    const items = [...diff.matchAll(/<li class="diff__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[1])![1]));
    expect(items).toEqual([USPS.evidence.title, USPS.earners.title, USPS.infrastructure.title]);
  });

  test('the page is dated 2026-11-28', () => {
    expect(HTML).toMatch(/"dateModified":"2026-11-28"/);
  });
});
