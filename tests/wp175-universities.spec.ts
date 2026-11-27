import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, CAMPUS_INCLUDES, CAMPUS_STEPS, DIFFERENCE_HEADING, EMPATHY, METHOD, POSITIONING, TRIAL_BAND_HEADING, TRIAL_LEAD, USPS } from '../src/data/copy';
import { signedWith } from '../src/components/sections/copyText';
import { open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package B (owner decisions of 28 November 2026): Universities (P6, /partner-with-us/universities/) follows CMF v3, C1 to C14, in order and coverage.
 *   Order       C1 → GEO (the "See Campus Delivery Details" link moves under the definition) → C2–C4 (declared compression) → C5 → … → C14, every band in a Tone wrapper.
 *   C2–C4       the PX-02 and PX-05 tiles are pains P1 and P2 (recorded in doc 04 4.5), "Placement Results Are Hard to Publish" is P3; the band ends with the transition line.
 *   C5          empathy → ORIGIN (one line) → authority (the signed-agreement sentence, the academic logos) → the TalentLEAP method line, last; C6 no longer says the method.
 *   C6          the crafted statement first, once; the band is light, so the dark trial band after it is not a second dark band in a row.
 *   C7          the trial band leads with the one-line trial lead; the National University band (it opened the page) and Maria Dewan's story follow.
 *   C8          the three campus cards relieve P1 to P3 in order, one gain creator, "How It Works in Three Steps" (CAMPUS_STEPS).
 *   C10         "What Makes CodersTrust Different", USPs 3 and 4 (doc 04 4.5).
 *   C11         "Start with One Campus", restored as one line (WP135 had folded it into the pilot band).
 * Run `npm run build`, then `PORT=<port> npx playwright test tests/wp175-universities.spec.ts --project=chromium`.
 */

const ROUTE = '/partner-with-us/universities/';
const TODAY = '2026-11-28';
const html = readBuilt(ROUTE);

/** The page's declared compression, in the words package Z records in doc 04 4.5 / doc 06 P6 (scratchpad wp175-audit.md §3, Universities target). */
const COMPRESSION = {
  kind: 'C2-C4',
  declaration:
    'P6 declares a C2–C4 compression (owner decision of 2026-10-15, recast 2026-11-28): the Cost of Waiting (C3) and Imagine (C4) bands are not rendered; the C2 band carries the gains and ranked pains and ends with the C3 transition line ‘It doesn’t have to be this way.’',
} as const;
const SEQUENCE = ['C1', 'GEO', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
const START_LINE = 'Cohort size, tracks and labs are agreed in co-design.';

const one = (tag: string): string => {
  const bands = cmfBandHtml(html, tag);
  expect(bands, `one ${tag} wrapper`).toHaveLength(1);
  return bands[0];
};
const paragraphs = (fragment: string) => [...fragment.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map((m) => ({ attrs: m[1], text: textOf(m[2]) }));
const firstContent = (fragment: string) => paragraphs(fragment).find((p) => p.text && !/\b(eyebrow|pos__label|pe__label)\b/.test(p.attrs));
const attr = (attrs: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
const sectionIds = (fragment: string) => [...fragment.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
const mainText = () => textOf(/<main\b[\s\S]*<\/main>/.exec(html)![0]);

test.describe('Universities (P6): CMF v3 order and coverage', () => {
  test('the bands run C1 → GEO → C2–C4 (compressed) → C5 … C14, with no gap, repeat or stray tag', () => {
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

  test('GEO directly follows C1 and states ID-01; the "See the Program" link now sits under the definition, not between it and the hero', () => {
    expect(sectionIds(one('C1'))).not.toContain('route-link');
    expect(sectionIds(one('GEO'))).toEqual(['definition', 'route-link']);
    expect(textOf(one('GEO'))).toContain(fact('ID-01').text);
  });

  test('the declared C2–C4 compression: the PX-02 and PX-05 tiles and the P3 pain, then the C3 transition line; no C3 or C4 band', () => {
    expect(COMPRESSION.declaration).toContain(C3_TRANSITION);
    const seq = cmfSequence(html);
    for (const t of ['C2', 'C3', 'C4']) expect(seq, t).not.toContain(t);
    const c2 = one('C2-C4 (compressed)');
    expect(sectionIds(c2)).toEqual(['problem']);
    // the tiles stand for P1 and P2 (Q4: the statistic tiles count as the pains, as doc 04 4.5 records for this page), the card for P3
    expect([...c2.matchAll(/<article class="card factcard"[^>]*data-fact="([^"]+)"/g)].map((m) => m[1])).toEqual(['PX-02', 'PX-05']);
    expect([...c2.matchAll(/<li\b[^>]*\bdata-pain="([^"]+)"/g)].map((m) => m[1])).toEqual(['P3']);
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(mainText().split(C3_TRANSITION).length - 1).toBe(1);
    for (const gone of ['id="cost"', 'id="future"', 'No Placement Evidence Weakens Your Employment Story', 'What Your Students Leave With']) expect(html).not.toContain(gone);
  });

  test('C5: empathy → ORIGIN in one line → authority (the signed-agreement sentence, the academic logos) → the method line as the band’s last line', () => {
    const c5 = one('C5');
    expect(sectionIds(c5)).toEqual(['guide']);
    const text = cmfBandText(html, 'C5');
    expect(inOrder(text, [EMPATHY.universities, 'From a Copenhagen launch to work in 16 countries and territories.', textOf(signedWith('SC-11b', 'We’ve Built This Path Since 2014')), 'Organizations we have worked with', METHOD.universities.text])).toEqual([]);
    expect(lastParagraph(c5)).toBe(`${METHOD.universities.text} How TalentLEAP Works`);
    expect(c5).toMatch(/<p class="pg__method pg__method--last" data-fact="IN-06"/);
    expect(paragraphs(c5).find((p) => p.text === EMPATHY.universities)?.attrs).toMatch(/\bclass="lead"/);
  });

  test('C6: the crafted statement opens the band and is the page’s only statement; the method is said once, in C5, not again in C6', () => {
    const c6 = one('C6');
    expect(sectionIds(c6)).toEqual(['mechanism']);
    expect(textOf(c6.slice(c6.indexOf('</h2>') + 5, c6.indexOf('<div class="pos"')))).toBe('');
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(c6)![1])).toBe(POSITIONING.universities.text);
    expect(html.split('class="pos__text"').length - 1).toBe(1);
    expect(c6).not.toContain(METHOD.universities.text);
    expect(c6).not.toContain('How TalentLEAP Works');
    expect(mainText().split(METHOD.universities.text).length - 1).toBe(1);
  });

  test('C7: the trial band leads with the one-line trial lead; the National University band and Maria Dewan’s story follow it', () => {
    const c7 = one('C7');
    expect(sectionIds(c7)).toEqual(['proof-band', 'offer-evidence', 'learner-voice']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c7)![1])).toBe(TRIAL_BAND_HEADING);
    const lead = firstContent(c7)!;
    expect(lead.text).toBe(TRIAL_LEAD.text);
    expect(attr(lead.attrs, 'data-fact')).toBe('RC-01 RC-02');
    expect(inOrder(textOf(c7), [TRIAL_LEAD.text, 'Official Training Partner of the World’s Second-Largest University by Enrollment', 'Maria Dewan'])).toEqual([]);
    // nothing of C7 is left before the problem band
    for (const id of ['offer-evidence', 'learner-voice']) expect(html.indexOf(`id="${id}"`), id).toBeGreaterThan(html.indexOf('id="problem"'));
  });

  test('C8: the three campus cards relieve P1 to P3 in order (P1 and P2 are the PX-02 and PX-05 tiles), then one gain creator and "How It Works in Three Steps"', () => {
    const c8 = one('C8');
    expect(sectionIds(c8)).toEqual(['features', 'how-it-works']);
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ relieves: attr(m[1], 'data-relieves'), title: textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]) }));
    expect(cards.filter((c) => c.relieves).map((c) => c.relieves)).toEqual(['P1', 'P2', 'P3']);
    expect(cards.filter((c) => c.relieves).map((c) => c.title)).toEqual(CAMPUS_INCLUDES.map((c) => c.title));
    expect(cards.filter((c) => !c.relieves).map((c) => c.title)).toEqual(['Capacity Designed to Stay on Campus']);
    expect(cards.findIndex((c) => !c.relieves)).toBe(3);
    const steps = /<section\b[^>]*\bid="how-it-works"[\s\S]*$/.exec(c8)![0];
    expect(textOf(/<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(steps)![1])).toBe('How It Works in Three Steps');
    const items = [...steps.matchAll(/<li class="steps__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]));
    expect(items).toEqual(CAMPUS_STEPS.map((s, i) => `${i + 1} ${s.title} ${s.text}`));
  });

  test('C9: the FAQ, then the due-diligence view', () => {
    expect(sectionIds(one('C9'))).toEqual(['faq', 'due-diligence']);
  });

  test('C10: the short band, "What Makes CodersTrust Different", USPs 3 and 4, no table', () => {
    const c10 = one('C10');
    expect(sectionIds(c10)).toEqual(['difference']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c10)![1])).toBe(DIFFERENCE_HEADING);
    expect(c10).not.toMatch(/<table\b/);
    expect([...c10.matchAll(/<h3 class="diff__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual([USPS.credential.title, USPS.infrastructure.title]);
    expect(html).not.toContain('id="compare"');
  });

  test('C11: "Start with One Campus", one line and no cards or button; the pilot band no longer repeats the line', () => {
    const c11 = one('C11');
    expect(sectionIds(c11)).toEqual(['offer']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c11)![1])).toBe('Start with One Campus');
    expect(textOf(c11)).toContain(START_LINE);
    expect(c11).not.toMatch(/<a\b|<li\b/);
    expect(mainText().split(START_LINE).length - 1).toBe(1);
    expect(textOf(one('C12'))).toContain('Start with a first campus program and see its results.');
  });

  test('C12 directly before C13; C14 is the next steps and the closing line', () => {
    const seq = cmfSequence(html);
    expect(seq[seq.indexOf('C12') + 1]).toBe('C13');
    expect(sectionIds(one('C12'))).toEqual(['risk']);
    expect(sectionIds(one('C13'))).toEqual(['cta']);
    expect(sectionIds(one('C14'))).toEqual(['next-steps', 'reinforce']);
  });

  test('no two dark bands touch (C6 is light, the trial band is the page’s one dark band before the call to action)', () => {
    const main = /<main\b[\s\S]*<\/main>/.exec(html)![0];
    const bands = [...main.matchAll(/<section\b[^>]*\bclass="band ([^"]*)"[^>]*\bid="([^"]+)"/g)].map((m) => ({ id: m[2], dark: /\bband--(klein|deep-ink)\b/.test(m[1]) }));
    const touching = bands.flatMap((b, i) => (i > 0 && b.dark && bands[i - 1].dark ? [`#${bands[i - 1].id} then #${b.id}`] : []));
    expect(touching).toEqual([]);
  });

  test('the WebPage dateModified is the day of the change', () => {
    expect([...html.matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1])).toContain(TODAY);
  });
});

test.describe('Universities (P6): spacing after the wrapping', () => {
  test('bands that meet on the same ground join at 32px (the problem band and the track record; the learner story and the cards)', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    const pads = await page.evaluate(() => {
      const css = (id: string) => getComputedStyle(document.getElementById(id)!);
      return ['problem:guide', 'learner-voice:features'].map((pair) => {
        const [a, b] = pair.split(':');
        return { pair, same: css(a).backgroundColor === css(b).backgroundColor, top: css(b).paddingTop };
      });
    });
    for (const p of pads) expect(p, p.pair).toEqual({ pair: p.pair, same: true, top: '32px' });
  });
});
