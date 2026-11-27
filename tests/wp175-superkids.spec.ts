import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, METHOD, POSITIONING, originShortUnder } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package C (owner decisions of 28 November 2026, Q7 (a) and Q9 (a)): SuperKids (P14) follows CMF v3, C1 to C14, with C2 and C3 compressed into one band and its C4 band kept,
 * minimal wording drafted from the earlier site copy (for the owner's approval before the push) and two declared exceptions: no randomized trial in C7 (a K-12 offer; doc 06 P14 C7:
 * agreements and targets only) and no three-step band (doc 04 §4.0 STEPS by page). Run `npm run build`, then `PORT=<port> npx playwright test tests/wp175-superkids.spec.ts --project=chromium`.
 */

const ROUTE = '/programs/superkids/';
const TODAY = '2026-11-28';
/** The declared compression and exceptions, as doc 04 §4 and doc 06 P14 record them (package Z writes them into ctg-planning). */
const COMPRESSIONS = {
  'C2-C3': 'P14 compresses C2–C3 into one band: the PX-08 sentence, then the transition line “It doesn’t have to be this way.” (doc 06 P14, R9-Mi3; restored 2026-11-28). C4 keeps its own band.',
};
const EXCEPTIONS = {
  C7: 'P14 C7 carries no randomized trial: agreements and targets only (GV-08), never delivered reach (doc 06 P14 C7; owner decision Q9 (a) of 2026-11-28).',
  C8d: 'P14 has no “How It Works in Three Steps” band (doc 04 §4.0 STEPS by page; owner decision Q9 (a) of 2026-11-28). Its C8 holds gain creators only: C2 carries the PX-08 context and no ranked pains.',
};
const EXPECTED = ['C1', 'GEO', 'GLANCE', 'C2-C3 (compressed)', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
/** The lines drafted for the owner's approval (WP175 DRAFT in the page source). */
const DRAFT = {
  c8: ['Courses in STEAM, Coding, Robotics and Digital Art', 'Delivery Through Schools and Education Partners'],
  c10: ['Public-Sector Agreements', 'Safeguarding Agreed Before Enrollment'],
  c12: 'Start with Pilot Classes',
};

const html = () => readBuilt(ROUTE);
const band = (tag: string, i = 0) => cmfBandHtml(html(), tag)[i] ?? '';
const h2Of = (b: string) => textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(b)?.[1] ?? '');
const attrs = (b: string, name: string) => [...b.matchAll(new RegExp(`\\b${name}="([^"]*)"`, 'g'))].map((m) => m[1]);
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

test.describe('SuperKids: CMF v3 order and coverage, C2 and C3 compressed with C4 kept, two declared exceptions (Q9 (a))', () => {
  test('the bands run C1, GEO, the glance, the compressed C2 band, C4 and C5 to C14 once each, C12 directly before C13', () => {
    const seq = cmfSequence(html());
    expect(cmfProblems(seq, { compression: 'C2-C3', rows: ['GLANCE'] })).toEqual([]);
    expect(seq).toEqual(EXPECTED);
    expect(Object.keys(EXCEPTIONS)).toEqual(['C7', 'C8d']);
    expect(COMPRESSIONS['C2-C3']).toContain('C2–C3');
  });

  test('GEO directly follows the hero: “What Is CodersTrust?” with ID-01 word for word', () => {
    const geo = band('GEO');
    expect(h2Of(geo)).toBe('What Is CodersTrust?');
    expect(textOf(geo)).toContain(fact('ID-01').text);
  });

  test('the declared C2–C3 compression: “Digital Skills Start Early”, the PX-08 sentence, then the transition line; C4 keeps its band, no C3', () => {
    const c2 = band('C2-C3 (compressed)');
    expect(h2Of(c2)).toBe('Digital Skills Start Early');
    expect(attrs(c2, 'data-fact')).toEqual(['PX-08']);
    expect(textOf(c2)).toContain(fact('PX-08').text);
    expect(attrs(c2, 'data-pain'), 'no ranked pains: PX-08 is context').toEqual([]);
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(c2).toMatch(/<p\b[^>]*data-transition[^>]*>It doesn’t have to be this way\.<\/p>\s*<\/div>\s*<\/section>/);
    expect(cmfSequence(html())).not.toContain('C3');
    expect(band('C4')).toMatch(/<section\b[^>]*id="future"/);
    expect(count(textOf(html()), C3_TRANSITION)).toBe(1);
  });

  test('C5 opens with the empathy line, then the one-line origin, the authority (the 400+ learners tile), and ends with the method line; no CodersTrust-wide logo strip', () => {
    const c5 = band('C5');
    const origin = originShortUnder(h2Of(c5));
    expect(inOrder(cmfBandText(html(), 'C5'), [EMPATHY.superkids, origin.text, fact('SK-05').stat!.value, METHOD.superkids.text])).toEqual([]);
    expect(lastParagraph(c5)).toBe(METHOD.superkids.text);
    expect(c5).not.toMatch(/class="partners\b/);
    // the 400+ figure is stated once on the page (WP143): in C5 now, not in C7
    expect(count(textOf(html()), `${fact('SK-05').stat!.value} SuperKids learners`)).toBe(1);
    for (const line of [EMPATHY.superkids, origin.text, METHOD.superkids.text]) expect(count(textOf(html()), line), line).toBe(1);
  });

  test('C6 opens with the positioning statement; the two offers (#two-ways) follow it in the C6 slot', () => {
    const c6 = band('C6');
    expect(c6).toMatch(/<section\b[^>]*id="mechanism"/);
    const pos = c6.indexOf('class="pos"');
    expect(textOf(c6.slice(c6.indexOf('</h2>') + 5, pos))).toBe('');
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(c6)![1])).toBe(POSITIONING.superkids.text);
    expect(cmfBandHtml(html(), 'C6').map((b) => /<section\b[^>]*\bid="([^"]+)"/.exec(b)?.[1])).toEqual(['mechanism', 'two-ways']);
  });

  test('declared exception: C7 has no randomized trial; it is the agreement targets (GV-08) and the photographs', () => {
    const c7s = cmfBandHtml(html(), 'C7');
    expect(c7s.map((b) => /<section\b[^>]*\bid="([^"]+)"/.exec(b)?.[1])).toEqual(['agreements', 'in-the-field']);
    const all = c7s.join('');
    expect(textOf(all)).not.toMatch(/randomi[sz]ed|trial/i);
    expect(attrs(all, 'data-fact').filter((f) => /\bRC-/.test(f))).toEqual([]);
    expect(h2Of(c7s[0])).toBe('Agreement Targets');
    expect(textOf(c7s[0])).toContain('These are agreement targets, not delivered reach.');
    expect(attrs(c7s[0], 'data-fact')).toContain('GV-08');
  });

  test('C8: “What Your School Receives”, gain creators only; declared exception: no three-step band', () => {
    const c8 = band('C8');
    expect(c8).toMatch(/<section\b[^>]*id="features"/);
    expect(h2Of(c8)).toBe('What Your School Receives');
    expect([...c8.matchAll(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual(DRAFT.c8);
    expect(attrs(c8, 'data-relieves')).toEqual([]);
    expect(html()).not.toContain('How It Works in Three Steps');
    expect(html()).not.toMatch(/id="how-it-works"/);
  });

  test('C10: the short band, #difference, “What Makes CodersTrust Different” with two drafted lines, no table, no figure', () => {
    const c10 = band('C10');
    expect(c10).toMatch(/<section\b[^>]*id="difference"/);
    expect(h2Of(c10)).toBe(DIFFERENCE_HEADING);
    expect(c10).not.toMatch(/<table\b/);
    const titles = [...c10.matchAll(/<h3 class="diff__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]));
    expect(titles).toEqual(DRAFT.c10);
    expect(textOf(c10)).not.toMatch(/\d/);
  });

  test('C11, then C12 (pilot classes) directly before C13 (one solid button); C14 closes', () => {
    expect(band('C11')).toMatch(/id="offer"/);
    const c12 = band('C12');
    expect(c12).toMatch(/<section\b[^>]*id="risk"/);
    expect(h2Of(c12)).toBe(DRAFT.c12);
    const c13 = band('C13');
    expect(c13).toMatch(/<section\b[^>]*id="cta"/);
    expect(c13.match(/class="btn btn--primary/g)).toHaveLength(1);
    expect(band('C14')).toMatch(/id="next-steps"/);
  });

  test('dated 2026-11-28: the Last updated line and the WebPage dateModified', () => {
    expect(html()).toContain(`Last updated <time datetime="${TODAY}"`);
    expect([...html().matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1])).toContain(TODAY);
  });

  test('the restored bands fit at 390 and 1280 with no sideways scroll', async ({ page }) => {
    for (const vp of [MOBILE, DESKTOP]) {
      await page.setViewportSize(vp);
      await open(page, ROUTE.slice(1));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${vp.width}px`).toBe(true);
      for (const id of ['definition', 'problem', 'guide', 'features', 'difference', 'risk']) await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(1);
    }
  });
});
