import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C14, C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, METHOD, POSITIONING, STEPS, TRIAL_LEAD, USPS, originShortUnder } from '../src/data/copy';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, cmfTags, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';
import { elements, parseHtml } from '../scripts/lib/dist.mjs';

/**
 * WP175 package A (owner decisions of 28 November 2026, scratchpad wp175-decisions.md): Foundations (`/partner-with-us/foundations/`, P5) follows CMF v3, C1 to C14.
 *   Order      C1 · GEO · GLANCE · C2–C4 (compressed) · C5 · C6 · C7 · C8 · C9 · C10 · C11 · C12 · C13 · C14
 *   C2–C4      one band: the three ranked pains, then the C3 transition line as its last line
 *   C5         EMPATHY.foundations, ORIGIN in one line, then the funders sentence (WP166-B R3-28, kept after the origin line), the BIGD line and the signed agreements, the world and logo strips,
 *              METHOD last
 *   C6         POSITIONING.foundations first (the two funding routes); C7 the one-line trial lead first, the learner story after the carousel; C8 one card per pain in rank order (card 2 relieves
 *              "Independent Evidence Is Hard to Find"), a gain creator (SDG-mapped reporting) and the three steps; C9 the FAQ and the due-diligence view; C10 USPs 1 to 3 (doc 04 4.3);
 *              C12 "Start with a Pilot, Then Decide on Evidence" (restored), directly before C13
 * Run `npm run build`, then `PORT=4931 npx playwright test tests/wp175-foundations.spec.ts --project=chromium`. Every test reads the built file.
 */

const ROUTE = '/partner-with-us/foundations/';
const HTML = readBuilt(ROUTE);
const SEQUENCE = ['C1', 'GEO', 'GLANCE', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
/** The page's declared compression, in the words package Z records in doc 04 4.3 (audit §2). */
const COMPRESSION = {
  tag: 'C2-C4 (compressed)',
  declaration:
    'C2–C4 compressed (declared; owner decision 2026-10-15, recast 2026-11-28): no Cost of Waiting (C3) or Imagine (C4) band. The C2 band keeps pains P1–P3 and closes with “It doesn’t have to be this way.”; the C2a gains, the C3 facts (PX-06, PX-07, PX-01, RC-06) and the C4 future-state sentence are not rendered.',
};
const PAINS = ['Earnings Must Be Tracked, Not Only Training Hours', 'Independent Evidence Is Hard to Find', 'Accountability Must Keep Pace with Scale'];
const CARDS = ['Mentoring, Placement Support and Outcome Tracking', 'A Model with Independent Evidence', 'Progress You Can See Every Month', 'SDG-Mapped Reporting'];
const GUIDE_HEADING = 'We’ve Built This Path Since 2014';

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

test.describe('Foundations: CMF v3 order and coverage', () => {
  test('the bands run C1 to C14 with the declared compression and the recorded glance row', () => {
    const seq = cmfSequence(HTML);
    expect(cmfProblems(seq, { compression: 'C2-C4', rows: ['GLANCE'] })).toEqual([]);
    expect(seq).toEqual(SEQUENCE);
  });

  test('GEO is the wrapper directly after C1 and states ID-01 verbatim', () => {
    const all = mainChildren();
    const c1 = all.findIndex((k) => k.attrs['data-cmf'] === 'C1');
    expect(all[c1 + 1].attrs['data-cmf']).toBe('GEO');
    expect(compact(cmfBandText(HTML, 'GEO'))).toContain(fact('ID-01').text);
  });

  test('C12 is the restored risk-reversal band, directly before C13', () => {
    const seq = cmfSequence(HTML);
    expect(seq[seq.indexOf('C12') + 1]).toBe('C13');
    const risk = band('C12');
    expect(risk).toMatch(/<section\b[^>]*\bid="risk"/);
    expect(h2Of(risk)).toBe('Start with a Pilot, Then Decide on Evidence');
    // doc 04 4.3 C12: an independent evaluation can be budgeted separately, which the default "Independent Evaluation Welcome" point covers
    expect(textOf(risk)).toContain('Independent Evaluation Welcome');
  });
});

test.describe('Foundations: C2–C4 compressed into the problem band', () => {
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

test.describe('Foundations: C5 empathy → ORIGIN → authority → method', () => {
  test('the four elements, in order: the origin line comes back before the funders sentence, and the method is the band’s last line', () => {
    const origin = originShortUnder(GUIDE_HEADING).text;
    const funders = C14.validateFor.foundations.text ?? fact(C14.validateFor.foundations.facts[0]).text;
    expect(inOrder(cmfBandText(HTML, 'C5'), [GUIDE_HEADING, EMPATHY.foundations, origin, funders.replace(/\.$/, ''), 'in a randomized trial', 'development partners and NGOs', 'CodersTrust Around the World', METHOD.foundations.text])).toEqual([]);
    const guide = band('C5');
    expect(lastParagraph(guide)).toBe(`${METHOD.foundations.text} ${METHOD.foundations.link!.label}`);
    expect(guide).toMatch(/<p class="pg__method pg__method--last" data-fact="IN-06"/);
    expect(mainText().split(METHOD.foundations.text).length - 1, 'the method is said once').toBe(1);
  });
});

test.describe('Foundations: C6 opens with the positioning statement', () => {
  test('POSITIONING.foundations is the first thing after the H2, printed once', () => {
    const mech = band('C6');
    const h2 = /<h2\b[^>]*>[\s\S]*?<\/h2>/.exec(mech)!;
    const rest = mech.slice(h2.index + h2[0].length);
    expect(rest).toMatch(/^\s*<div class="pos"/);
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(rest)![1])).toBe(POSITIONING.foundations.text);
    expect(HTML.split('class="pos__text"').length - 1).toBe(1);
  });
});

test.describe('Foundations: C7 leads with the trial', () => {
  test('the one-line trial lead is the first line after the "Proof in Practice" heading; the learner story follows the carousel', () => {
    const proof = band('C7');
    expect(h2Of(proof)).toBe('Proof in Practice');
    expect(afterHeading(proof)[0]).toBe(TRIAL_LEAD.text);
    // WP175-Z: the lead is claim-marked with the trial's facts (CaseStudyCarousel `trialLead`), as ProofBand's and ContractTable's trial leads are
    expect(proof).toMatch(new RegExp(`<p class="sh__lead lead" data-fact="${TRIAL_LEAD.facts.join(' ')}"[^>]*>${TRIAL_LEAD.text}</p>`));
    expect(proof.indexOf('id="cases"')).toBeLessThan(proof.indexOf('id="learner-voice"'));
  });
});

test.describe('Foundations: C8 relieves each pain, then a gain creator and the three steps', () => {
  test('one card per pain, in rank order; one gain creator; "How It Works in Three Steps" with three steps', () => {
    const c8 = band('C8');
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>([\s\S]*?)<\/li>/g)];
    expect(cards.map((m) => /data-relieves="([^"]+)"/.exec(m[1])?.[1])).toEqual(['P1', 'P2', 'P3', undefined]);
    expect(cards.map((m) => textOf(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]))).toEqual(CARDS);
    // card 2 relieves "Independent Evidence Is Hard to Find" (doc 04 4.3 C8 map: the trial, and independent evaluation welcome on new programs)
    expect(/data-relieves="P2" data-fact="([^"]*)"/.exec(c8)?.[1]).toBe('RC-01 PD-08');
    const steps = /<h3\b[^>]*>How It Works in Three Steps<\/h3>([\s\S]*?)<\/ol>/.exec(c8);
    expect(steps, 'the three-step heading').toBeTruthy();
    expect([...steps![1].matchAll(/<h4 class="steps__title"[^>]*>([\s\S]*?)<\/h4>/g)].map((m) => textOf(m[1]))).toEqual(STEPS.map((s) => s.title));
  });
});

test.describe('Foundations: C9, C10 and the date', () => {
  test('C9 holds the FAQ and the due-diligence view (with the grantee’s legal form, ID-12)', () => {
    const c9 = band('C9');
    expect(c9).toMatch(/\bid="faq"/);
    expect(c9).toMatch(/\bid="due-diligence"/);
    expect(c9).toMatch(/data-fact="ID-12"/);
  });

  test('#difference has the one heading and USPs 1 to 3 (doc 04 4.3), no table', () => {
    const diff = band('C10');
    expect(diff).toMatch(/<section\b[^>]*\bid="difference"/);
    expect(h2Of(diff)).toBe(DIFFERENCE_HEADING);
    expect(diff).not.toMatch(/<table\b/);
    const items = [...diff.matchAll(/<li class="diff__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[1])![1]));
    expect(items).toEqual([USPS.evidence.title, USPS.earners.title, USPS.credential.title]);
  });

  test('the page is dated 2026-11-28', () => {
    expect(HTML).toMatch(/"dateModified":"2026-11-28"/);
  });
});
