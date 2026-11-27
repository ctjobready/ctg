import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, EMPATHY, METHOD, ORIGIN_SHORT, TRIAL_LEAD, TRIAL_SCOPE } from '../src/data/copy';
// the partner strip's caption ends with this sentence (PARTNER_CAPTION, src/lib/logos.ts, which reads image files through Vite and cannot load here)
const PARTNER_CAPTION = 'These are working relationships, not endorsements.';
import { DESKTOP, MOBILE, open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, cmfTags, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package C (owner decisions of 28 November 2026, Q7 (a), Q4 (b) and Q10 (a)): the NU Post Graduate Diploma overview (P15) follows CMF v3, C1 to C14, with C2 to C4 compressed
 * into the problem band. The S4-C2 exception stands until National University signs off: no C6 positioning statement and no C10 band. Its two statistic tiles count as the pains; the C8
 * relievers wait for NU sign-off, so C8 is "How It Works in Three Steps" alone (Apply, Learn, Prepare for Work). C7 leads with the trial and its TRIAL-SCOPE line. Run `npm run build`,
 * then `PORT=<port> npx playwright test tests/wp175-nu-pgd.spec.ts --project=chromium`.
 */

const ROUTE = '/programs/nu-postgraduate-diploma/';
const TODAY = '2026-11-28';
/** The declared compression and exceptions, as doc 04 4.7 and doc 06 P15 record them (package Z writes them into ctg-planning). */
const COMPRESSIONS = {
  'C2-C4':
    'P15 compresses C2–C4 into the C2 band: the two pains (the PX-03 and PX-05 tiles; P3 removed with owner approval, WP166-B R2-24) and the transition line “It doesn’t have to be this way.”; C3 and C4 are not rendered (declared 2026-11-28).',
};
const EXCEPTIONS = {
  C6: 'S4-C2 (doc 06 P15, doc 04 4.7): no C6 positioning statement until National University signs off; the course band is C6 without one.',
  C10: 'S4-C2: no C10 band until National University signs off.',
  C8: 'The C8 relievers wait for NU sign-off (Q10 (a)); only “How It Works in Three Steps” is rendered.',
};
const EXPECTED = ['C1', 'GEO', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C11', 'C12', 'C13', 'C14'];

const html = () => readBuilt(ROUTE);
const band = (tag: string, i = 0) => cmfBandHtml(html(), tag)[i] ?? '';
const h2Of = (b: string) => textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(b)?.[1] ?? '');
const attrs = (b: string, name: string) => [...b.matchAll(new RegExp(`\\b${name}="([^"]*)"`, 'g'))].map((m) => m[1]);
const statements = (b: string) => [...b.slice(b.indexOf('</h2>')).matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map((m) => ({ attrs: m[1], text: textOf(m[2]) }));
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

test.describe('NU Post Graduate Diploma: CMF v3 order and coverage, C2 to C4 compressed, the S4-C2 exception (Q10 (a))', () => {
  test('the bands run C1, GEO, the compressed C2 band and C5 to C14 once each except the declared C10; C12 directly before C13; C14 inside the closing band', () => {
    const seq = cmfSequence(html());
    expect(cmfProblems(seq, { compression: 'C2-C4', omit: ['C10'] })).toEqual([]);
    expect(seq).toEqual(EXPECTED);
    expect(Object.keys(EXCEPTIONS)).toEqual(['C6', 'C10', 'C8']);
    expect(COMPRESSIONS['C2-C4']).toContain('C2–C4');
    // C14 ("What Happens After You Apply") is a list nested in the C13 band (WP24c)
    expect(cmfTags(html()).slice(-2)).toEqual(['C13', 'C14']);
    expect(band('C13')).toMatch(/<ol class="after"[^>]*data-cmf="C14"/);
  });

  test('GEO directly follows the hero: “What Is CodersTrust?” with ID-01 word for word', () => {
    const geo = band('GEO');
    expect(h2Of(geo)).toBe('What Is CodersTrust?');
    expect(textOf(geo)).toContain(fact('ID-01').text);
  });

  test('the declared C2–C4 compression: the two statistic tiles (the pains, Q4 (b)), then the transition line as the band’s last line; no C3 or C4 band', () => {
    const c2 = band('C2-C4 (compressed)');
    expect(c2).toMatch(/<section\b[^>]*id="problem"/);
    expect(attrs(c2, 'data-fact')).toEqual(['PX-03', 'PX-05']);
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(c2).toMatch(/<p\b[^>]*data-transition[^>]*>It doesn’t have to be this way\.<\/p>\s*<\/div>\s*<\/section>/);
    for (const t of ['C2', 'C3', 'C4']) expect(cmfSequence(html()), t).not.toContain(t);
    expect(count(textOf(html()), C3_TRANSITION)).toBe(1);
  });

  test('C5 opens with the empathy line, then the one-line origin, the authority (the NU tile and the academic logo strip), and ends with the method line', () => {
    const c5 = band('C5');
    expect(inOrder(cmfBandText(html(), 'C5'), [EMPATHY.nuPgd, ORIGIN_SHORT.text, fact('SC-05').stat!.value, PARTNER_CAPTION, METHOD.nuPgd.text])).toEqual([]);
    expect(lastParagraph(c5)).toBe(METHOD.nuPgd.text);
    expect(c5).toMatch(/<p class="guide__method[^"]*" data-fact="NU-04"/);
    expect(textOf(c5)).not.toContain('official training partner'); // WP102: an affiliated college, on the NU pages
    for (const line of [EMPATHY.nuPgd, ORIGIN_SHORT.text]) expect(count(textOf(html()), line), line).toBe(1);
  });

  test('declared exception S4-C2: C6 is the course band, with no positioning statement anywhere on the page', () => {
    const c6 = band('C6');
    expect(c6).toMatch(/<section\b[^>]*id="courses"/);
    expect(h2Of(c6)).toBe('Choose Your Course');
    expect(html()).not.toMatch(/class="pos__text"/);
    expect(html()).not.toMatch(/class="pos"/);
  });

  test('C7 opens with the one-line trial lead, the TRIAL-SCOPE line directly under it, then the survey line and the link to the Impact page', () => {
    const c7 = band('C7');
    expect(c7).toMatch(/<section\b[^>]*id="proof-band"/);
    const [lead, scope] = statements(c7);
    expect(lead.text).toBe(TRIAL_LEAD.text);
    expect(lead.attrs).toContain('data-fact="RC-01 RC-02"');
    expect(scope.text).toBe(TRIAL_SCOPE.nuPgd.text);
    expect(scope.attrs).toContain('data-trial-scope');
    expect(textOf(c7)).toContain(`Among surveyed completers, employment was ${fact('OC-01').stat!.value}`);
    expect(textOf(c7)).toContain('See CodersTrust’s Impact');
  });

  test('C8: “How It Works in Three Steps” alone (Apply, Learn, Prepare for Work); no relievers until NU signs off', () => {
    const c8 = band('C8');
    expect(c8).toMatch(/<section\b[^>]*id="steps"/);
    expect(h2Of(c8)).toBe('How It Works in Three Steps');
    expect([...c8.matchAll(/class="steps__item"/g)]).toHaveLength(3);
    expect([...c8.matchAll(/<h3 class="steps__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual(['Apply', 'Learn', 'Prepare for Work']);
    expect(html()).not.toMatch(/data-relieves=/);
    expect(html()).not.toMatch(/id="features"/);
  });

  test('declared exception S4-C2: no C10 band (#difference) and no comparison band', () => {
    expect(html()).not.toMatch(/id="difference"/);
    expect(html()).not.toMatch(/id="compare"/);
    expect(cmfSequence(html())).not.toContain('C10');
  });

  test('C11 (Before You Apply) after the FAQ; C12 (talk to admissions) directly before C13 (Apply Now, the one solid button, and the admissions call)', () => {
    expect(band('C9')).toMatch(/id="faq"/);
    expect(band('C11')).toMatch(/<section\b[^>]*id="before-you-apply"/);
    const c12 = band('C12');
    expect(c12).toMatch(/<section\b[^>]*id="risk"/);
    expect(h2Of(c12)).toBe('Talk to Admissions Before You Decide');
    expect(textOf(c12)).toContain('Call with your eligibility and recognition questions before you apply.');
    expect(c12).not.toMatch(/href="tel:/); // one phone contact in the closing band, not two (S4-m10)
    const c13 = band('C13');
    expect(c13.match(/class="btn btn--primary/g)).toHaveLength(1);
    expect(c13).toMatch(/href="tel:/);
  });

  test('dated 2026-11-28: the Last updated line and the WebPage dateModified', () => {
    expect(html()).toContain(`Last updated <time datetime="${TODAY}"`);
    expect([...html().matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1])).toContain(TODAY);
  });

  test('the restored bands fit at 390 and 1280 with no sideways scroll; the hero still links to Before You Apply', async ({ page }) => {
    for (const vp of [MOBILE, DESKTOP]) {
      await page.setViewportSize(vp);
      await open(page, ROUTE.slice(1));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${vp.width}px`).toBe(true);
      for (const id of ['definition', 'proof-band', 'steps', 'risk', 'before-you-apply']) await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(1);
    }
    await expect(page.locator('main a[href="#before-you-apply"]')).toHaveCount(1);
  });
});
