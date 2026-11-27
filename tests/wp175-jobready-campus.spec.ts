import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, CAMPUS_INCLUDES, CAMPUS_PROBLEM_LEAD, CAMPUS_STEPS, DELIVERY_MODEL, DIFFERENCE_HEADING, EMPATHY, METHOD, ORIGIN_SHORT, POSITIONING, TRIAL_LEAD, USPS } from '../src/data/copy';
import { titleCase } from '../src/lib/titleCase.mjs';
// the partner strip's caption ends with this sentence (PARTNER_CAPTION, src/lib/logos.ts, which reads image files through Vite and cannot load here)
const PARTNER_CAPTION = 'These are working relationships, not endorsements.';
import { DESKTOP, MOBILE, open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package C (owner decisions of 28 November 2026): JobReady@Campus (P12) follows CMF v3, C1 to C14, with C2 and C3 compressed into the problem band and its own C4 band kept
 * (Q7 (a)); its two statistic tiles count as the pains (Q4 (b), as on Universities), with the lead as the third. Run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp175-jobready-campus.spec.ts --project=chromium`.
 */

const ROUTE = '/programs/jobready-campus/';
const TODAY = '2026-11-28';
/** The declared compression and the pains reading, as doc 04 4.5 and doc 06 P12 record them (package Z writes them into ctg-planning). */
const COMPRESSIONS = {
  'C2-C3':
    'P12 declares a C2–C3 compression (2026-11-28): C3 is not rendered; the C2 band ends with the transition line “It doesn’t have to be this way.” C4 keeps its own band.',
  pains: 'P12 counts its two statistic tiles as P1 (PX-02) and P2 (PX-05) and its lead as P3, as Universities does (Q4 (b), 2026-11-28).',
};
const EXPECTED = ['C1', 'GEO', 'GLANCE', 'C2-C3 (compressed)', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];

const html = () => readBuilt(ROUTE);
const band = (tag: string, i = 0) => cmfBandHtml(html(), tag)[i] ?? '';
const h2Of = (b: string) => textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(b)?.[1] ?? '');
const attrs = (b: string, name: string) => [...b.matchAll(new RegExp(`\\b${name}="([^"]*)"`, 'g'))].map((m) => m[1]);
const statements = (b: string) => [...b.slice(b.indexOf('</h2>')).matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map((m) => ({ attrs: m[1], text: textOf(m[2]) }));
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

test.describe('JobReady@Campus: CMF v3 order and coverage, C2 and C3 compressed with C4 kept (Q7 (a))', () => {
  test('the bands run C1, GEO, the route link and glance, the compressed C2 band, C4 and C5 to C14 once each, C12 directly before C13', () => {
    const seq = cmfSequence(html());
    expect(cmfProblems(seq, { compression: 'C2-C3', rows: ['GLANCE'] })).toEqual([]);
    expect(seq).toEqual(EXPECTED);
    expect(Object.keys(COMPRESSIONS)).toEqual(['C2-C3', 'pains']);
  });

  test('GEO directly follows the hero: “What Is CodersTrust?” with ID-01 word for word; the partnership route link and the glance follow it', () => {
    const geo = band('GEO');
    expect(h2Of(geo)).toBe('What Is CodersTrust?');
    expect(textOf(geo)).toContain(fact('ID-01').text);
    const rows = cmfBandHtml(html(), 'GLANCE');
    expect(rows.map((b) => /<section\b[^>]*\bid="([^"]+)"/.exec(b)?.[1])).toEqual(['route-link', 'program-glance']);
  });

  test('the declared C2–C3 compression: the two statistic tiles and the lead (the pains), then the transition line as the band’s last line; C4 keeps its band, no C3', () => {
    const c2 = band('C2-C3 (compressed)');
    expect(attrs(c2, 'data-fact').filter((f) => f.startsWith('PX-'))).toEqual(['PX-02', 'PX-05']);
    expect(textOf(c2)).toContain(CAMPUS_PROBLEM_LEAD);
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(c2).toMatch(/<p\b[^>]*data-transition[^>]*>It doesn’t have to be this way\.<\/p>\s*<\/div>\s*<\/section>/);
    const seq = cmfSequence(html());
    expect(seq).toContain('C4');
    expect(seq).not.toContain('C3');
    expect(band('C4')).toMatch(/<section\b[^>]*id="future"/);
    expect(count(textOf(html()), C3_TRANSITION)).toBe(1);
  });

  test('C5 opens with the empathy line, then the one-line origin, the authority (the NU tiles, the partners sentence, the logo strip), and ends with the method line', () => {
    const c5 = band('C5');
    expect(inOrder(cmfBandText(html(), 'C5'), [EMPATHY.campus, ORIGIN_SHORT.text, fact('SC-04').stat!.value, PARTNER_CAPTION, METHOD.campus.text])).toEqual([]);
    expect(textOf(c5)).toContain('These figures describe National University’s size and the learners being onboarded; they are not learners trained by CodersTrust.');
    expect(lastParagraph(c5)).toBe(`${METHOD.campus.text} ${METHOD.campus.link!.label}`);
    // the evidence links are C7's now (Q3 (a)), not the track-record band's
    expect(textOf(c5)).not.toContain('Broader evidence from our youth programs');
    for (const line of [EMPATHY.campus, ORIGIN_SHORT.text, METHOD.campus.text]) expect(count(textOf(html()), line), line).toBe(1);
  });

  test('C6 opens with the positioning statement', () => {
    const c6 = band('C6');
    const pos = c6.indexOf('class="pos"');
    expect(pos).toBeGreaterThan(0);
    expect(textOf(c6.slice(c6.indexOf('</h2>') + 5, pos))).toBe('');
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(c6)![1])).toBe(POSITIONING.campus.text);
  });

  test('C7 opens with the one-line trial lead (RC-01, RC-02), then the survey line, and carries the three evidence links', () => {
    const c7 = band('C7');
    expect(c7).toMatch(/<section\b[^>]*id="proof-band"/);
    const [first] = statements(c7);
    expect(first.text).toBe(TRIAL_LEAD.text);
    expect(first.attrs).toContain('data-fact="RC-01 RC-02"');
    expect(textOf(c7)).toContain(`Among surveyed completers, employment was ${fact('OC-01').stat!.value}`);
    for (const l of ['The Randomized Trial', 'Impact Survey 2026', 'Case Studies']) expect(textOf(c7), l).toContain(l);
    expect(c7).not.toMatch(/data-trial-scope/); // the trial is the youth programs' evidence; this page needs no relevance line (only P7, P13 and P15 do)
  });

  test('C8: one card per pain, P1 to P3 in the order of the C2 tiles and lead (CAMPUS_INCLUDES), then “How It Works in Three Steps” (CAMPUS_STEPS)', () => {
    const c8 = band('C8');
    expect(c8).toMatch(/<section\b[^>]*id="features"/);
    expect(h2Of(c8)).toBe('Built Around What Institutions Ask For');
    expect(attrs(c8, 'data-relieves')).toEqual(['P1', 'P2', 'P3']);
    expect([...c8.matchAll(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual(CAMPUS_INCLUDES.map((c) => c.title));
    // P1 is the PX-02 tile (graduates out of work: certification preparation and mentoring), P2 the PX-05 tile (skills employers ask for), P3 the lead (placement evidence)
    expect(CAMPUS_INCLUDES.map((c) => c.painId)).toEqual(['P1', 'P2', 'P3']);
    const steps = c8.slice(c8.indexOf('How It Works in Three Steps'));
    expect(c8).toMatch(/<h3[^>]*>How It Works in Three Steps<\/h3>/);
    expect([...steps.matchAll(/class="steps__item"/g)]).toHaveLength(3);
    expect([...steps.matchAll(/<h4 class="steps__title"[^>]*>([\s\S]*?)<\/h4>/g)].map((m) => textOf(m[1]))).toEqual(CAMPUS_STEPS.map((s) => titleCase(s.title)));
    // the delivery-model sentence stays the "What" card's alone (WP166-B)
    expect(count(textOf(html()), DELIVERY_MODEL.text)).toBe(1);
  });

  test('C10: the short band, #difference, “What Makes CodersTrust Different” with USPs 3 and 4 (doc 04 4.5), no table', () => {
    const c10 = band('C10');
    expect(c10).toMatch(/<section\b[^>]*id="difference"/);
    expect(h2Of(c10)).toBe(DIFFERENCE_HEADING);
    expect(c10).not.toMatch(/<table\b/);
    expect([...c10.matchAll(/<h3 class="diff__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual([USPS.credential.title, USPS.infrastructure.title]);
  });

  test('C11, C12 and C13 in order; C13 has one solid button and the academic-calendar timing line', () => {
    expect(band('C11')).toMatch(/id="offer"/);
    expect(band('C12')).toMatch(/id="risk"/);
    const c13 = band('C13');
    expect(c13.match(/class="btn btn--primary/g)).toHaveLength(1);
    expect(textOf(c13)).toContain('Timing follows your academic calendar');
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
      for (const id of ['definition', 'proof-band', 'features', 'how-it-works', 'difference']) await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(1);
    }
  });
});
