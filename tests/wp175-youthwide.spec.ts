import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, FUNDER_PAINS, METHOD, POSITIONING, RCT_COMPARISON, STEPS, TRIAL_SENTENCE, USPS, originShortUnder } from '../src/data/copy';
import { titleCase } from '../src/lib/titleCase.mjs';
// the partner strip's caption ends with this sentence (PARTNER_CAPTION, src/lib/logos.ts, which reads image files through Vite and cannot load here)
const PARTNER_CAPTION = 'These are working relationships, not endorsements.';
import { DESKTOP, MOBILE, open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package C (owner decisions of 28 November 2026): YouthWIDE (P10), with the governments route (P11) folded into its one CMF sequence (Q8 (a)), follows CMF v3, C1 to C14,
 * with its C2 to C4 compressed into the challenge band (Q7 (a)). Run `npm run build`, then `PORT=<port> npx playwright test tests/wp175-youthwide.spec.ts --project=chromium`.
 * The order tests read the built page (tests/support/cmf.ts); the last test opens it at two widths.
 */

const ROUTE = '/programs/youthwide/';
const TODAY = '2026-11-28';
/** The declared compression, as doc 04 4.1/4.3 and doc 06 P10 record it (package Z writes it into ctg-planning). */
const COMPRESSIONS = {
  'C2-C4':
    'P10 compresses C2–C4 into the C2 band: the three ranked funder pains (FUNDER_PAINS) close with the transition line “It doesn’t have to be this way.”; the Cost of Waiting (C3) and Imagine (C4) bands are not rendered (WP48, 2026-10-15; declared 2026-11-28).',
};
const EXPECTED = ['C1', 'GEO', 'GLANCE', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];

const html = () => readBuilt(ROUTE);
const band = (tag: string, i = 0) => cmfBandHtml(html(), tag)[i] ?? '';
const h2Of = (b: string) => textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(b)?.[1] ?? '');
const attrs = (b: string, name: string) => [...b.matchAll(new RegExp(`\\b${name}="([^"]*)"`, 'g'))].map((m) => m[1]);
/** The first paragraph after the band's H2 (its attributes and its text). */
const firstStatement = (b: string) => {
  const m = /<p\b([^>]*)>([\s\S]*?)<\/p>/.exec(b.slice(b.indexOf('</h2>')));
  return { attrs: m?.[1] ?? '', text: textOf(m?.[2] ?? '') };
};

test.describe('YouthWIDE: CMF v3 order and coverage, C2 to C4 compressed (Q7 (a)), P11 folded into the one sequence (Q8 (a))', () => {
  test('the bands run C1, GEO, the glance, the compressed C2 band and C5 to C14 once each, C12 directly before C13', () => {
    const seq = cmfSequence(html());
    expect(cmfProblems(seq, { compression: 'C2-C4', rows: ['GLANCE'] })).toEqual([]);
    expect(seq).toEqual(EXPECTED);
    expect(COMPRESSIONS['C2-C4']).toContain('C2–C4');
  });

  test('GEO directly follows the hero: “What Is CodersTrust?” with ID-01 word for word', () => {
    const geo = band('GEO');
    expect(h2Of(geo)).toBe('What Is CodersTrust?');
    expect(textOf(geo)).toContain(fact('ID-01').text);
    expect(attrs(geo, 'data-fact')).toContain('ID-01');
  });

  test('the declared C2–C4 compression: the three ranked funder pains, then the transition line as the band’s last line; no C3 or C4 band', () => {
    const c2 = band('C2-C4 (compressed)');
    expect(attrs(c2, 'data-pain')).toEqual(['P1', 'P2', 'P3']);
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(c2).toMatch(/<p\b[^>]*data-transition[^>]*>It doesn’t have to be this way\.<\/p>\s*<\/div>\s*<\/section>/);
    const seq = cmfSequence(html());
    for (const t of ['C2', 'C3', 'C4']) expect(seq, t).not.toContain(t);
    expect(textOf(html()).split(C3_TRANSITION).length - 1, 'the line is on the page once').toBe(1);
  });

  test('C5 opens with the empathy line, then the one-line origin, the authority (tiles and partner strip), and ends with the method line', () => {
    const c5 = band('C5');
    const title = h2Of(c5);
    const origin = originShortUnder(title, { tile: true });
    expect(inOrder(cmfBandText(html(), 'C5'), [EMPATHY.youthwide, origin.text, fact('SC-01').stat!.value, fact('SC-03').stat!.value, PARTNER_CAPTION, METHOD.youthwide.text])).toEqual([]);
    expect(c5).toMatch(/<p class="lead"[^>]*>You need more than enrollment numbers/);
    expect(lastParagraph(c5)).toBe(`${METHOD.youthwide.text} ${METHOD.youthwide.link!.label}`);
    expect(c5).toMatch(new RegExp(`<p class="guide__method[^"]*" data-fact="${METHOD.youthwide.facts.join(' ')}"`));
    for (const line of [EMPATHY.youthwide, origin.text, METHOD.youthwide.text]) expect(textOf(html()).split(line).length - 1, line).toBe(1);
  });

  test('C6 opens with the positioning statement; the governments route (P11, #governments) sits in the C6 slot', () => {
    const c6 = band('C6');
    expect(c6).toMatch(/<section\b[^>]*id="mechanism"/);
    const pos = c6.indexOf('class="pos"');
    expect(pos).toBeGreaterThan(0);
    expect(textOf(c6.slice(c6.indexOf('</h2>') + 5, pos)), 'nothing but the eyebrow and H2 before the statement').toBe('');
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(c6)![1])).toBe(POSITIONING.youthwide.text);
    expect(cmfBandHtml(html(), 'C6').some((b) => /<section\b[^>]*id="governments"/.test(b)), 'P11 is a route inside C6').toBe(true);
    expect(band('C13')).toMatch(/id="cta-governments"/);
  });

  test('C7 opens with the trial (the H2 states its result; the first statement is the trial sentence, RC-01 and RC-02) and keeps the comparison chart (WP173)', () => {
    const c7 = band('C7');
    expect(c7).toMatch(/<section\b[^>]*id="proof-band"/);
    expect(h2Of(c7)).toBe('More Employment for Women Offered a Place, in a Randomized Trial');
    const first = firstStatement(c7);
    expect(first.text).toBe(TRIAL_SENTENCE.text);
    expect(first.attrs).toContain('data-fact="RC-01 RC-02"');
    expect(textOf(c7)).toContain(`${RCT_COMPARISON.control}%`);
    expect(textOf(c7)).toContain(`${RCT_COMPARISON.offered}%`);
    // the carousel and the photographs stay C7 sub-blocks
    const ids = cmfBandHtml(html(), 'C7').map((b) => /<section\b[^>]*\bid="([^"]+)"/.exec(b)?.[1]);
    expect(ids).toEqual(['proof-band', 'cases', 'in-the-field']);
  });

  test('C8: one card per pain, in the rank order of C2, a gain creator, then “How It Works in Three Steps” (STEPS)', () => {
    const c8 = band('C8');
    expect(c8).toMatch(/<section\b[^>]*id="features"/);
    expect(h2Of(c8)).toBe('Built Around What Funders and Agencies Ask');
    expect(attrs(c8, 'data-relieves')).toEqual(FUNDER_PAINS.map((p) => p.id));
    expect(attrs(c8, 'data-relieves')).toEqual(attrs(band('C2-C4 (compressed)'), 'data-pain'));
    expect([...c8.matchAll(/<h3 class="card__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual([
      'Placement Support and Mentoring',
      'Progress Your Evaluators Can Check',
      'Tracks That Follow Employer Demand',
      'Training That Reaches Hard-to-Reach Groups',
    ]);
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>/g)].map((m) => m[1]);
    expect(cards.filter((a) => !a.includes('data-relieves')).length, 'at least one gain creator').toBeGreaterThanOrEqual(1);
    const steps = c8.slice(c8.indexOf('How It Works in Three Steps'));
    expect(c8).toMatch(/<h3[^>]*>How It Works in Three Steps<\/h3>/);
    expect([...steps.matchAll(/class="steps__item"/g)]).toHaveLength(3);
    expect([...steps.matchAll(/<h4 class="steps__title"[^>]*>([\s\S]*?)<\/h4>/g)].map((m) => textOf(m[1]).replace(/^Step \d: /, ''))).toEqual(STEPS.map((s) => titleCase(s.title)));
    // the verification detail stays the glance's (WP57): the C8 card does not restate it
    expect(textOf(html()).split('offer letters, payslips, platform logs or bank receipts').length - 1).toBe(1);
  });

  test('C10: the short band, #difference, “What Makes CodersTrust Different” with three USP lines, no table', () => {
    const c10 = band('C10');
    expect(c10).toMatch(/<section\b[^>]*id="difference"/);
    expect(h2Of(c10)).toBe(DIFFERENCE_HEADING);
    expect(c10).not.toMatch(/<table\b/);
    const titles = [...c10.matchAll(/<h3 class="diff__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]));
    expect(titles).toEqual([USPS.evidence.title, USPS.credential.title, USPS.infrastructure.title]);
    expect(titles.length).toBeGreaterThanOrEqual(2);
    expect(titles.length).toBeLessThanOrEqual(4);
    expect(html()).not.toMatch(/id="compare"/);
  });

  test('C13: one solid button, the shared session agenda; C14 follows it', () => {
    const c13 = band('C13');
    expect(c13.match(/class="btn btn--primary/g)).toHaveLength(1);
    expect(c13).toMatch(/id="entry-point"/);
    expect(textOf(c13)).toContain('We discuss your priority groups, locations, tracks, indicative budget, scorecard and reporting plan.');
    expect(band('C14')).toMatch(/id="next-steps"/);
  });

  test('dated 2026-11-28: the Last updated line and the WebPage dateModified', () => {
    expect(html()).toContain(`Last updated <time datetime="${TODAY}"`);
    expect([...html().matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1])).toContain(TODAY);
  });

  test('the restored bands fit at 390 and 1280 with no sideways scroll, and every band keeps its own ground (no two dark bands together)', async ({ page }) => {
    for (const vp of [MOBILE, DESKTOP]) {
      await page.setViewportSize(vp);
      await open(page, ROUTE.slice(1));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${vp.width}px`).toBe(true);
      for (const id of ['definition', 'features', 'how-it-works', 'difference']) await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(1);
    }
    const dark = await page.evaluate(() => {
      const bands = Array.from(document.querySelectorAll('main section.band')).filter((b) => !b.parentElement?.closest('section.band'));
      const isDark = bands.map((b) => getComputedStyle(b).backgroundColor).map((c) => c === getComputedStyle(document.getElementById('proof-band')!).backgroundColor);
      return isDark.flatMap((d, i) => (d && i > 0 && isDark[i - 1] ? [`#${bands[i - 1].id} then #${bands[i].id}`] : []));
    });
    expect(dark).toEqual([]);
  });
});
