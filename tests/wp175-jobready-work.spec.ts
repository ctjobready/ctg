import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, EMPLOYER_INCLUDES, EMPLOYER_PAINS, EMPLOYER_STEPS, METHOD, ORIGIN_SHORT, POSITIONING, TRIAL_LEAD, TRIAL_SCOPE, USPS, WORK_BRIDGE } from '../src/data/copy';
import { titleCase } from '../src/lib/titleCase.mjs';
// the partner strip's caption ends with this sentence (PARTNER_CAPTION, src/lib/logos.ts, which reads image files through Vite and cannot load here)
const PARTNER_CAPTION = 'These are working relationships, not endorsements.';
import { DESKTOP, MOBILE, open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package C (owner decisions of 28 November 2026): JobReady@Work (P13) follows CMF v3, C1 to C14. Its C2 problem band is back (Q7 (a): a compression merges C2 to C4 into
 * the C2 band, it cannot remove C2), with the Employers page's three pains (EMPLOYER_PAINS) and the C3 transition line; the TRIAL-SCOPE line sits under the C7 trial lead; C11 is
 * its own band again, before C12, and C13 is the closing band (Q1 (a) supersedes the WP166-B R2-20 merge). Run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp175-jobready-work.spec.ts --project=chromium`.
 */

const ROUTE = '/programs/jobready-work/';
const TODAY = '2026-11-28';
/** The declared compression, as doc 04 4.6 and doc 06 P13 record it (package Z writes it into ctg-planning). */
const COMPRESSIONS = {
  'C2-C4':
    'P13 declares a C2–C4 compression (2026-11-28): the C2 band carries PX-05 and the three ranked pains; C3 and C4 are not rendered; the band ends with “It doesn’t have to be this way.”',
};
const EXPECTED = ['C1', 'GEO', 'GLANCE', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];

const html = () => readBuilt(ROUTE);
const band = (tag: string, i = 0) => cmfBandHtml(html(), tag)[i] ?? '';
const h2Of = (b: string) => textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(b)?.[1] ?? '');
const attrs = (b: string, name: string) => [...b.matchAll(new RegExp(`\\b${name}="([^"]*)"`, 'g'))].map((m) => m[1]);
const statements = (b: string) => [...b.slice(b.indexOf('</h2>')).matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map((m) => ({ attrs: m[1], text: textOf(m[2]) }));
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

test.describe('JobReady@Work: CMF v3 order and coverage, C2 back and C2 to C4 compressed (Q7 (a))', () => {
  test('the bands run C1, GEO, the route link and glance, the compressed C2 band and C5 to C14 once each, C11 before C12 and C12 directly before C13', () => {
    const seq = cmfSequence(html());
    expect(cmfProblems(seq, { compression: 'C2-C4', rows: ['GLANCE'] })).toEqual([]);
    expect(seq).toEqual(EXPECTED);
    expect(COMPRESSIONS['C2-C4']).toContain('C2–C4');
  });

  test('GEO directly follows the hero: ID-01 word for word, then the bridge to JobReady@Work (WORK_BRIDGE, as on Employers)', () => {
    const geo = band('GEO');
    expect(h2Of(geo)).toBe('What Is CodersTrust?');
    expect(textOf(geo)).toContain(`${fact('ID-01').text} ${WORK_BRIDGE.text}`);
    expect(geo).toContain(`data-fact="${WORK_BRIDGE.facts.join(' ')}"`);
    expect(cmfBandHtml(html(), 'GLANCE').map((b) => /<section\b[^>]*\bid="([^"]+)"/.exec(b)?.[1])).toEqual(['route-link', 'program-glance']);
  });

  test('C2 is back, compressed: the three employer pains P1 to P3, the PX-05 tile (moved out of the glance), then the transition line as the band’s last line', () => {
    const c2 = band('C2-C4 (compressed)');
    expect(c2).toMatch(/<section\b[^>]*id="problem"/);
    expect(attrs(c2, 'data-pain')).toEqual(EMPLOYER_PAINS.map((p) => p.id));
    expect([...c2.matchAll(/<p class="gp__q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]))).toEqual(EMPLOYER_PAINS.map((p) => titleCase(p.name)));
    expect(c2).toMatch(/data-fact="PX-05"/);
    expect(band('GLANCE', 1)).not.toMatch(/data-fact="PX-05"/);
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(c2).toMatch(/<p\b[^>]*data-transition[^>]*>It doesn’t have to be this way\.<\/p>\s*<\/div>\s*<\/section>/);
    for (const t of ['C2', 'C3', 'C4']) expect(cmfSequence(html()), t).not.toContain(t);
    expect(count(textOf(html()), C3_TRANSITION)).toBe(1);
  });

  test('C5 opens with the empathy line, then the one-line origin, the authority (the 23,000+ tile, the credentials, the logo strip), and ends with the method line', () => {
    const c5 = band('C5');
    expect(inOrder(cmfBandText(html(), 'C5'), [EMPATHY.work, ORIGIN_SHORT.text, fact('SC-15').stat!.value, 'Akij Group', PARTNER_CAPTION, METHOD.work.text])).toEqual([]);
    expect(lastParagraph(c5)).toBe(METHOD.work.text);
    expect(c5).not.toContain('TalentLEAP'); // JobReady@Work is not on the TalentLEAP path (WP161 A-37)
    for (const line of [EMPATHY.work, ORIGIN_SHORT.text, METHOD.work.text]) expect(count(textOf(html()), line), line).toBe(1);
  });

  test('C6 opens with the positioning statement', () => {
    const c6 = band('C6');
    const pos = c6.indexOf('class="pos"');
    expect(pos).toBeGreaterThan(0);
    expect(textOf(c6.slice(c6.indexOf('</h2>') + 5, pos))).toBe('');
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(c6)![1])).toBe(POSITIONING.work.text);
  });

  test('C7 opens with the one-line trial lead, the TRIAL-SCOPE line directly under it, then the survey line labelled as the youth programs’', () => {
    const c7 = band('C7');
    expect(c7).toMatch(/<section\b[^>]*id="proof-band"/);
    const [lead, scope] = statements(c7);
    expect(lead.text).toBe(TRIAL_LEAD.text);
    expect(lead.attrs).toContain('data-fact="RC-01 RC-02"');
    expect(scope.text).toBe(TRIAL_SCOPE.work.text);
    expect(scope.attrs).toContain('data-trial-scope');
    expect(textOf(c7)).toContain(`From CodersTrust’s youth programs: Among surveyed completers, employment was ${fact('OC-01').stat!.value}`);
    for (const l of ['The Randomized Trial', 'Impact Survey 2026']) expect(textOf(c7), l).toContain(l);
  });

  test('C8: one card per pain, P1 to P3 in the rank order of C2 (EMPLOYER_INCLUDES), then “How It Works in Three Steps” (EMPLOYER_STEPS)', () => {
    const c8 = band('C8');
    expect(c8).toMatch(/<section\b[^>]*id="features"/);
    expect(h2Of(c8)).toBe('What Your Business Gets');
    expect(attrs(c8, 'data-relieves')).toEqual(attrs(band('C2-C4 (compressed)'), 'data-pain'));
    expect([...c8.matchAll(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual(EMPLOYER_INCLUDES.map((c) => c.title));
    const steps = c8.slice(c8.indexOf('How It Works in Three Steps'));
    expect(c8).toMatch(/<h3[^>]*>How It Works in Three Steps<\/h3>/);
    expect([...steps.matchAll(/class="steps__item"/g)]).toHaveLength(3);
    expect([...steps.matchAll(/<h4 class="steps__title"[^>]*>([\s\S]*?)<\/h4>/g)].map((m) => textOf(m[1]))).toEqual(EMPLOYER_STEPS.map((s) => titleCase(s.title)));
    // step 2 leaves the exam-terms clause to the glance's Training row: the qualifier is said once per page (WP145)
    expect(count(textOf(html()), 'exam eligibility and any further attempts are set per program')).toBe(1);
    // the AI card leaves the AIvolve offering to the glance's Training row, where the page names it once (WP104)
    expect(count(textOf(band('C8')), 'AIvolve')).toBe(0);
    expect(count(textOf(html().replace(/<script[\s\S]*?<\/script>/g, '')), 'AIvolve')).toBe(1);
  });

  test('C10: the short band, #difference, “What Makes CodersTrust Different” with two USP lines, no table', () => {
    const c10 = band('C10');
    expect(c10).toMatch(/<section\b[^>]*id="difference"/);
    expect(h2Of(c10)).toBe(DIFFERENCE_HEADING);
    expect(c10).not.toMatch(/<table\b/);
    expect([...c10.matchAll(/<h3 class="diff__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual([USPS.credentialWork.title, USPS.evidence.title]);
  });

  test('C11 is the options band again (two cards, no actions); C12 the pilot band; C13 the closing band with one solid button and the hiring route as a text link', () => {
    const c11 = band('C11');
    expect(c11).toMatch(/<section\b[^>]*id="offer"/);
    expect(h2Of(c11)).toBe('A Training Program for Your Team, and Talent When You Need It');
    expect([...c11.matchAll(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual(['Train Your Team', 'Hire Job-Ready Talent']);
    expect(c11).not.toMatch(/class="btn\b/);
    expect(count(textOf(html()), 'Pick one or both.'), 'the hero lead keeps it; the options band has no lead').toBe(1);
    expect(band('C12')).toMatch(/id="risk"/);
    const c13 = band('C13');
    expect(c13).toMatch(/<section\b[^>]*id="cta"/);
    expect(h2Of(c13)).toBe('Tell Us About Your Team and Your Roles');
    expect(c13.match(/class="btn btn--primary/g)).toHaveLength(1);
    expect(textOf(c13)).toContain('Plan Your First Team Program');
    expect(textOf(c13)).toContain('Hire JobReady Talent');
    expect(textOf(c13)).toContain('A discovery session is a conversation, not a commitment.');
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
      for (const id of ['definition', 'problem', 'proof-band', 'features', 'how-it-works', 'difference', 'offer']) await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(1);
    }
  });
});
