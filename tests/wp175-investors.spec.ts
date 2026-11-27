import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, INVESTOR_EVIDENCE, INVESTOR_PARTNERS, METHOD, POSITIONING, TRIAL_LEAD, USPS } from '../src/data/copy';
import { open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package B (owner decisions of 28 November 2026): Investors (P8, /partner-with-us/investors/) follows CMF v3, C1 to C14, in order and coverage.
 *   Order       C1 → GEO → C2–C3 (the declared compression of doc 04 4.4 and doc 06 P8) → C4 → C5 → … → C14; nothing is reordered (doc 06 P8).
 *   C2–C3       the thesis states three pains (P1 to P3) and ends with the C3 transition line again.
 *   C4          the vision now comes before the track record (it followed it).
 *   C5          empathy (.ig__empathy, EMPATHY.investors) → ORIGIN (one line) → authority (the delivered tiles, the institutions, the leadership link) → the TalentLEAP method line, last.
 *   C6          the crafted statement (POSITIONING.investors) first, once.
 *   C7          the evidence band leads with the one-line trial lead (it followed the contracts band); "Contracts and Recognition" follows.
 *   C8          one card per thesis pain, in its order, then the gain creator ("Equip Partner Institutions") and "How It Works in Three Steps" (Learn → Earn → Prosper).
 *   C10         "What Makes CodersTrust Different", USPs 1 and 4 (doc 04 4.4).
 *   C11–C14     the offer (what you receive), the risk reversal (restored), the call to action with its micro-commitment, and the four next steps with the first action (they sat in C11).
 * Run `npm run build`, then `PORT=<port> npx playwright test tests/wp175-investors.spec.ts --project=chromium`.
 */

const ROUTE = '/partner-with-us/investors/';
const TODAY = '2026-11-28';
const html = readBuilt(ROUTE);

/** The page's declared compression (doc 04 4.4 and doc 06 P8 record it already); WP175 restores its transition line. */
const COMPRESSION = {
  kind: 'C2-C3',
  declaration: 'P8 compresses C2 and C3 into one band for a solution-aware audience (doc 06 P8, "Declared compression"); C1 and C4 to C14 are present in order. The band ends with the C3 transition line ‘It doesn’t have to be this way.’',
} as const;
const SEQUENCE = ['C1', 'GEO', 'C2-C3 (compressed)', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
const FIRST_ACTION = 'Your first step: an introduction call. In your inquiry, include two suitable times for it.';
const MICRO = 'An introduction call comes first; the deck follows under NDA.';

const one = (tag: string): string => {
  const bands = cmfBandHtml(html, tag);
  expect(bands, `one ${tag} wrapper`).toHaveLength(1);
  return bands[0];
};
const paragraphs = (fragment: string) => [...fragment.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map((m) => ({ attrs: m[1], text: textOf(m[2]) }));
const contentParagraphs = (fragment: string) => paragraphs(fragment).filter((p) => p.text && !/\b(eyebrow|pos__label|pe__label)\b/.test(p.attrs));
const attr = (attrs: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
const sectionIds = (fragment: string) => [...fragment.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
const mainText = () => textOf(/<main\b[\s\S]*<\/main>/.exec(html)![0]);
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

test.describe('Investors (P8): CMF v3 order and coverage', () => {
  test('the bands run C1 → GEO → C2–C3 (compressed) → C4 → C5 … C14, with no gap, repeat or stray tag', () => {
    const seq = cmfSequence(html);
    expect(seq).toEqual(SEQUENCE);
    expect(cmfProblems(seq, { compression: COMPRESSION.kind })).toEqual([]);
  });

  test('every band of <main> sits in a Tone wrapper, and every wrapper from GEO on starts with its band', () => {
    const main = /<main\b[\s\S]*<\/main>/.exec(html)![0];
    const untagged = [...main.matchAll(/<section\b[^>]*\bclass="band\b[^"]*"[^>]*\bid="([^"]+)"/g)].map((m) => m[1]).filter((id) => !SEQUENCE.some((t) => cmfBandHtml(html, t).some((b) => b.includes(`id="${id}"`))));
    expect(untagged, 'bands outside every wrapper').toEqual([]);
    for (const tag of SEQUENCE.slice(1)) expect(one(tag), tag).toMatch(/^<div class="tone[^"]*" data-cmf="[^"]+">\s*(?:<!--[\s\S]*?-->\s*)*<section\b[^>]*\bclass="band\b/);
  });

  test('GEO directly follows C1 and states ID-01', () => {
    expect(cmfSequence(html).indexOf('GEO')).toBe(1);
    expect(textOf(one('GEO'))).toContain(fact('ID-01').text);
  });

  test('the declared C2–C3 compression: the thesis states P1 to P3 and ends with the C3 transition line; C4 is its own band, C3 is not', () => {
    expect(COMPRESSION.declaration).toContain(C3_TRANSITION);
    const seq = cmfSequence(html);
    for (const t of ['C2', 'C3']) expect(seq, t).not.toContain(t);
    expect(seq[seq.indexOf('C2-C3 (compressed)') + 1]).toBe('C4');
    const c2 = one('C2-C3 (compressed)');
    expect(sectionIds(c2)).toEqual(['thesis']);
    expect([...c2.matchAll(/\bdata-pain="([^"]+)"/g)].map((m) => m[1])).toEqual(['P1', 'P2', 'P3']);
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(count(mainText(), C3_TRANSITION)).toBe(1);
    // WP48: the stakes line stays gone ("less is more"); only the transition line returns
    expect(c2).not.toContain('th__stakes');
  });

  test('C4: the vision comes before the track record', () => {
    expect(sectionIds(one('C4'))).toEqual(['vision']);
    expect(html.indexOf('id="vision"')).toBeLessThan(html.indexOf('id="guide"'));
  });

  test('C5: empathy → ORIGIN in one line → authority (the delivered tiles, the institutions, the leadership link) → the method line as the band’s last line', () => {
    const c5 = one('C5');
    expect(sectionIds(c5)).toEqual(['guide']);
    const empathy = [...c5.matchAll(/<p class="ig__empathy"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]));
    expect(empathy).toEqual([EMPATHY.investors]);
    expect(inOrder(cmfBandText(html, 'C5'), ['Our Track Record', 'A Record Built Since 2014', EMPATHY.investors, 'From a Copenhagen launch to work across', 'Scale and Partners', fact('SC-01').stat!.value, INVESTOR_PARTNERS.text.split('. ')[0], 'Meet the Leadership Team', METHOD.investors.text])).toEqual([]);
    expect(lastParagraph(c5)).toBe(`${METHOD.investors.text} How TalentLEAP Works`);
    expect(c5).toMatch(/<p class="ig__method[^"]*"[^>]*data-fact="IN-06"/);
    expect(count(mainText(), METHOD.investors.text)).toBe(1);
  });

  test('C6: the crafted statement opens the band (only its eyebrow and H2 come first) and is the page’s only statement', () => {
    const c6 = one('C6');
    expect(sectionIds(c6)).toEqual(['mechanism']);
    expect(textOf(c6.slice(c6.indexOf('</h2>') + 5, c6.indexOf('<div class="pos"')))).toBe('');
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(c6)![1])).toBe(POSITIONING.investors.text);
    expect(html.split('class="pos__text"').length - 1).toBe(1);
    expect(count(mainText(), POSITIONING.investors.text)).toBe(1);
  });

  test('C7: the evidence band leads with the one-line trial lead, then the survey sentence and the youth-program qualifier; "Contracts and Recognition" follows', () => {
    const c7 = one('C7');
    expect(sectionIds(c7)).toEqual(['proof-band', 'reach']);
    const [lead, rest] = contentParagraphs(c7);
    expect(lead.text).toBe(TRIAL_LEAD.text);
    expect(attr(lead.attrs, 'data-fact')).toBe(TRIAL_LEAD.facts.join(' '));
    expect(INVESTOR_EVIDENCE.text.startsWith(`${TRIAL_LEAD.text} `)).toBe(true);
    expect(rest.text).toBe(INVESTOR_EVIDENCE.text.slice(TRIAL_LEAD.text.length + 1));
    expect(attr(rest.attrs, 'data-fact')).toBe('OC-01');
    expect(count(mainText(), TRIAL_LEAD.text)).toBe(1);
  });

  test('C8: one card per thesis pain, in its order, then the gain creator and "How It Works in Three Steps" (Learn → Earn → Prosper)', () => {
    const c8 = one('C8');
    expect(sectionIds(c8)).toEqual(['features', 'how-it-works']);
    const pains = [...one('C2-C3 (compressed)').matchAll(/\bdata-pain="([^"]+)"/g)].map((m) => m[1]);
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ relieves: attr(m[1], 'data-relieves'), title: textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]) }));
    expect(cards.filter((c) => c.relieves).map((c) => c.relieves)).toEqual(pains);
    expect(cards.map((c) => c.title)).toEqual(['Connect to Paid Work', 'An AI-Ready Curriculum', 'Learn Through TalentLEAP', 'Equip Partner Institutions']);
    expect(cards.filter((c) => !c.relieves).map((c) => c.title)).toEqual(['Equip Partner Institutions']);
    const steps = /<section\b[^>]*\bid="how-it-works"[\s\S]*$/.exec(c8)![0];
    expect(textOf(/<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(steps)![1])).toBe('How It Works in Three Steps');
    expect([...steps.matchAll(/<li class="steps__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]))).toEqual([
      '1 Learn Competency development through certification-focused courses.',
      '2 Earn Employment or freelance work with mentoring and placement support.',
      '3 Prosper Career advancement along graduated levels.',
    ]);
  });

  test('C9: the questions band with its fit check', () => {
    expect(sectionIds(one('C9'))).toEqual(['faq']);
  });

  test('C10: the short band, "What Makes CodersTrust Different", USPs 1 and 4, no table and no comparison wording', () => {
    const c10 = one('C10');
    expect(sectionIds(c10)).toEqual(['difference']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c10)![1])).toBe(DIFFERENCE_HEADING);
    expect(c10).not.toMatch(/<table\b/);
    expect([...c10.matchAll(/<h3 class="diff__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual([USPS.evidence.title, USPS.infrastructure.title]);
    expect(mainText()).not.toMatch(/How the Approaches Compare|Self-Paced Course Platforms|Freelance Marketplaces Alone/);
    expect(html).not.toContain('id="compare"');
  });

  test('C11: the offer is what you receive (the introduction call, then the deck and data room under NDA) and the due-diligence line; the steps moved to C14', () => {
    const c11 = one('C11');
    expect(sectionIds(c11)).toEqual(['offer']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c11)![1])).toBe('What You Receive');
    expect([...c11.matchAll(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual(['An Introduction Call', 'The Deck and Data Room, Under NDA']);
    expect(textOf(c11)).toContain('Due diligence: CT USA, Inc.');
    expect(textOf(c11)).not.toMatch(/Step \d|suitable times/);
  });

  test('C12: "Start with a Conversation, Not a Commitment", restored, directly before the call to action', () => {
    const seq = cmfSequence(html);
    expect(seq[seq.indexOf('C12') + 1]).toBe('C13');
    const c12 = one('C12');
    expect(sectionIds(c12)).toEqual(['risk']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c12)![1])).toBe('Start with a Conversation, Not a Commitment');
    expect([...c12.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual(['The Call Does Not Commit Either Side', 'An NDA Comes First']);
  });

  test('C13: one primary action and the micro-commitment line', () => {
    const c13 = one('C13');
    expect(sectionIds(c13)).toEqual(['cta']);
    expect(textOf(c13)).toContain(MICRO);
    expect(count(mainText(), MICRO)).toBe(1);
  });

  test('C14: the four next steps and the first action, once on the page, after the call to action', () => {
    const c14 = one('C14');
    expect(sectionIds(c14)).toEqual(['next-steps', 'reinforce']);
    expect([...c14.matchAll(/<li class="steps__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]).replace(/^\d+ /, ''))).toEqual(['Introduction Call', 'NDA', 'Deck and Data Room', 'Your Questions']);
    expect(textOf(c14)).toContain(FIRST_ACTION);
    expect(count(mainText(), FIRST_ACTION)).toBe(1);
    expect(count(mainText(), 'two suitable times')).toBe(1);
  });

  test('no two dark bands touch', () => {
    const main = /<main\b[\s\S]*<\/main>/.exec(html)![0];
    const bands = [...main.matchAll(/<section\b[^>]*\bclass="band ([^"]*)"[^>]*\bid="([^"]+)"/g)].map((m) => ({ id: m[2], dark: /\bband--(klein|deep-ink)\b/.test(m[1]) }));
    expect(bands.flatMap((b, i) => (i > 0 && b.dark && bands[i - 1].dark ? [`#${bands[i - 1].id} then #${b.id}`] : []))).toEqual([]);
  });

  test('the WebPage dateModified is the day of the change', () => {
    expect([...html.matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1])).toContain(TODAY);
  });
});

test.describe('Investors (P8): spacing after the moves', () => {
  test('bands that meet on the same ground join at 32px (the differentiation band, the offer and the risk band are all white)', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const pads = await page.evaluate(() => {
      const css = (id: string) => getComputedStyle(document.getElementById(id)!);
      return ['difference:offer', 'offer:risk'].map((pair) => {
        const [a, b] = pair.split(':');
        return { pair, same: css(a).backgroundColor === css(b).backgroundColor, top: css(b).paddingTop };
      });
    });
    for (const p of pads) expect(p, p.pair).toEqual({ pair: p.pair, same: true, top: '32px' });
  });
});
