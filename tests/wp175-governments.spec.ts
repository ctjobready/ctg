import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, METHOD, POSITIONING, STEPS, TRIAL_LEAD, USPS, originShortUnder } from '../src/data/copy';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, cmfTags, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';
import { elements, parseHtml } from '../scripts/lib/dist.mjs';

/**
 * WP175 package A (owner decisions of 28 November 2026, scratchpad wp175-decisions.md): Governments (`/partner-with-us/governments/`, P3) follows CMF v3, C1 to C14, in order and coverage.
 *   Order      C1 · GEO · GLANCE · C2–C4 (compressed) · C5 · C6 · C7 · C8 · C9 · C10 · C11 · C12 · C13 · C14 (the route link between the hero and GEO is gone: C6 links YouthWIDE)
 *   C2–C4      one band: three ranked pains, "Graduates Struggle to Find Work" restored as P1 (Q4 (a), its text before fec0dce2), then the C3 transition line as its last line
 *   C5         EMPATHY.governments, ORIGIN in one line, the authority (the National University line, the signed agreements, the world strip, the logo strip), then METHOD.governments last
 *   C6         POSITIONING.governments first; C7 the one-line trial lead first, the learner story after the contracts table; C8 one card per pain in rank order, a gain creator and the
 *              three steps with "Briefing and Co-Design with the Agency" as step 1; C9 the FAQ and the due-diligence view; C10 USPs 1 and 4 (doc 04 4.2); C12 directly before C13
 * Run `npm run build`, then `PORT=4931 npx playwright test tests/wp175-governments.spec.ts --project=chromium`. Every test reads the built file.
 */

const ROUTE = '/partner-with-us/governments/';
const HTML = readBuilt(ROUTE);
const SEQUENCE = ['C1', 'GEO', 'GLANCE', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
/** The page's declared compression, in the words package Z records in doc 04 4.2 (audit §2, owner decisions of 2026-10-15 and 2026-11-28). */
const COMPRESSION = {
  tag: 'C2-C4 (compressed)',
  declaration:
    'C2–C4 compressed (declared; owner decision 2026-10-15, recast 2026-11-28): no Cost of Waiting (C3) or Imagine (C4) band. The C2 band keeps the ranked pains and closes with the C3 transition line “It doesn’t have to be this way.”; the C2a gains, the C3 facts (PX-11, PX-06, PX-08) and the C4 vignette are not rendered.',
};
const PAINS = [
  ['Graduates Struggle to Find Work', 'A degree alone does not guarantee a job offer.'],
  ['Training Budgets Do Not Show Up as Earnings', 'Most training budgets count who enrolled, not who is earning afterward.'],
  ['Trainer and Curriculum Capacity Takes Time to Build', 'National delivery needs trained facilitators and localized curricula.'],
];
const CARDS = ['Certification Preparation and Placement Support', 'Spending Measured Against Outcomes', 'Capacity Designed to Stay in Your System', 'Access to Work Beyond the Local Market'];
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

test.describe('Governments: CMF v3 order and coverage', () => {
  test('the bands run C1 to C14 with the declared compression and the recorded glance row', () => {
    const seq = cmfSequence(HTML);
    expect(cmfProblems(seq, { compression: 'C2-C4', rows: ['GLANCE'] })).toEqual([]);
    expect(seq).toEqual(SEQUENCE);
  });

  test('GEO is the wrapper directly after C1 (no route link between them) and states ID-01 verbatim', () => {
    const all = mainChildren();
    const c1 = all.findIndex((k) => k.attrs['data-cmf'] === 'C1');
    expect(all[c1 + 1].attrs['data-cmf']).toBe('GEO');
    expect(HTML).not.toMatch(/\bid="route-link"/);
    expect(compact(cmfBandText(HTML, 'GEO'))).toContain(fact('ID-01').text);
  });

  test('C12 sits directly before C13', () => {
    const seq = cmfSequence(HTML);
    expect(seq[seq.indexOf('C12') + 1]).toBe('C13');
    expect(h2Of(band('C12'))).toBe('Phased Rollout, with Review Gates');
  });
});

test.describe('Governments: C2–C4 compressed into the problem band', () => {
  test('the compression is declared, no separate C2, C3 or C4 band is tagged, and the band ends with the transition line', () => {
    expect(COMPRESSION.declaration).toContain(C3_TRANSITION);
    const tags = cmfTags(HTML);
    expect(tags).toContain(COMPRESSION.tag);
    for (const t of ['C2', 'C3', 'C4', 'C2-C3 (compressed)']) expect(tags, t).not.toContain(t);
    const problem = band(COMPRESSION.tag);
    expect(lastParagraph(problem)).toBe(C3_TRANSITION);
    expect(mainText().split(C3_TRANSITION).length - 1).toBe(1);
  });

  test('three ranked pains, P1 to P3, with "Graduates Struggle to Find Work" restored first (Q4 (a))', () => {
    const problem = band(COMPRESSION.tag);
    expect([...problem.matchAll(/<li data-pain="([^"]+)"/g)].map((m) => m[1])).toEqual(['P1', 'P2', 'P3']);
    expect([...problem.matchAll(/<p class="gp__q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]))).toEqual(PAINS.map((p) => p[0]));
    expect([...problem.matchAll(/<p class="gp__a"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]))).toEqual(PAINS.map((p) => p[1]));
    // the one context figure stays PX-02 (WP166-B R3-40)
    expect(problem).toMatch(/data-fact="PX-02"/);
  });
});

test.describe('Governments: C5 empathy → ORIGIN → authority → method', () => {
  test('the four elements, in order, with the method as the band’s last line', () => {
    const origin = originShortUnder(GUIDE_HEADING).text;
    expect(inOrder(cmfBandText(HTML, 'C5'), [GUIDE_HEADING, EMPATHY.governments, origin, 'National University', 'government bodies', 'CodersTrust Around the World', METHOD.governments.text])).toEqual([]);
    const guide = band('C5');
    expect(lastParagraph(guide)).toBe(`${METHOD.governments.text} ${METHOD.governments.link!.label}`);
    expect(guide).toMatch(/<p class="pg__method pg__method--last" data-fact="IN-06"/);
    expect(mainText().split(METHOD.governments.text).length - 1, 'the method is said once').toBe(1);
  });
});

test.describe('Governments: C6 opens with the positioning statement', () => {
  test('POSITIONING.governments is the first thing after the H2, printed once; C6 links YouthWIDE', () => {
    const mech = band('C6');
    const h2 = /<h2\b[^>]*>[\s\S]*?<\/h2>/.exec(mech)!;
    const rest = mech.slice(h2.index + h2[0].length);
    expect(rest).toMatch(/^\s*<div class="pos"/);
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(rest)![1])).toBe(POSITIONING.governments.text);
    expect(HTML.split('class="pos__text"').length - 1).toBe(1);
    expect(textOf(mech)).toContain('See How YouthWIDE Works');
  });
});

test.describe('Governments: C7 leads with the trial', () => {
  test('the one-line trial lead is the first line after the contracts heading, marked with its facts; the learner story follows the table', () => {
    const proof = band('C7');
    expect(h2Of(proof)).toBe('What Each Government Contract Covers');
    expect(afterHeading(proof)[0]).toBe(TRIAL_LEAD.text);
    expect(proof).toMatch(new RegExp(`<p class="[^"]*\\bct__trial\\b[^"]*" data-fact="${TRIAL_LEAD.facts.join(' ')}"`));
    expect(proof.indexOf('id="contracts"')).toBeLessThan(proof.indexOf('id="learner-voice"'));
  });
});

test.describe('Governments: C8 relieves each pain, then a gain creator and the three steps', () => {
  test('one card per pain, in rank order; one gain creator; "How It Works in Three Steps" with the briefing as step 1', () => {
    const c8 = band('C8');
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>([\s\S]*?)<\/li>/g)];
    const relieves = cards.map((m) => /data-relieves="([^"]+)"/.exec(m[1])?.[1]);
    expect(relieves).toEqual(['P1', 'P2', 'P3', undefined]);
    expect(cards.map((m) => textOf(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]))).toEqual(CARDS);
    const steps = /<h3\b[^>]*>How It Works in Three Steps<\/h3>([\s\S]*?)<\/ol>/.exec(c8);
    expect(steps, 'the three-step heading').toBeTruthy();
    const titles = [...steps![1].matchAll(/<h4 class="steps__title"[^>]*>([\s\S]*?)<\/h4>/g)].map((m) => textOf(m[1]));
    expect(titles).toEqual(['Briefing and Co-Design with the Agency', STEPS[1].title, STEPS[2].title]);
    expect(compact(textOf(steps![1]))).toContain('In the briefing and co-design sessions, we start planning priority groups');
    expect(compact(textOf(steps![1]))).not.toContain('discovery session');
  });

  test('the gain creator names how placement support opens work beyond the local market (PD-15), without repeating the first card’s "local, remote and global work"', () => {
    const cards = [...band('C8').matchAll(/<p class="card__text"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
    expect(cards.filter((c) => c.includes('local, remote and global work'))).toHaveLength(1);
    expect(cards[3]).toBe('Placement support includes career advising, job-application and interview preparation, employer matching and freelance-marketplace onboarding.');
    expect(band('C8')).toMatch(/<li class="card inc__card" data-fact="PD-15"/);
  });
});

test.describe('Governments: C9, C10 and the closing bands', () => {
  test('C9 holds the FAQ and the due-diligence view', () => {
    const c9 = band('C9');
    expect(c9).toMatch(/\bid="faq"/);
    expect(c9).toMatch(/\bid="due-diligence"/);
  });

  test('#difference has the one heading and USPs 1 and 4 (doc 04 4.2), no table', () => {
    const diff = band('C10');
    expect(diff).toMatch(/<section\b[^>]*\bid="difference"/);
    expect(h2Of(diff)).toBe(DIFFERENCE_HEADING);
    expect(diff).not.toMatch(/<table\b/);
    const items = [...diff.matchAll(/<li class="diff__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[1])![1]));
    expect(items).toEqual([USPS.evidence.title, USPS.infrastructure.title]);
  });

  test('the page is dated 2026-11-28', () => {
    expect(HTML).toMatch(/"dateModified":"2026-11-28"/);
  });
});
