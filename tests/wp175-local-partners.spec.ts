import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, LOCAL_PARTNER_EVIDENCE, LOCAL_PARTNER_PAINS, METHOD, POSITIONING, TRIAL_LEAD, USPS } from '../src/data/copy';
import { HOURS, TRACER_MONTHS } from '../src/components/pages/partners/partners';
import { open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package B (owner decisions of 28 November 2026): Local Partners (P7b, /partner-with-us/local-partners/) follows CMF v3, C1 to C14, in order and coverage.
 *   Order       C1 → GEO → C2–C4 (declared compression) → C5 → … → C14, every band in a Tone wrapper (data-cmf).
 *   C2–C4       the problem band keeps the three ranked local-partner pains and ends with the C3 transition line.
 *   C5          empathy → ORIGIN (one line, year-less: the tiles' labels say "since 2014", WP64) → authority (SC-11 and SC-01, the Bangladesh team, the partner logos) → the method line, last.
 *   C6          the crafted statement (POSITIONING.localPartners) first, once.
 *   C7          the one-line trial lead first; the case studies and Samina's story (moved from before C2) follow.
 *   C8          one reliever per pain, in rank order, then the gain creators and "How It Works in Three Steps".
 *   C9          the FAQ, then the due-diligence view (moved from between C11 and C12).
 *   C10         the short "What Makes CodersTrust Different" band (USPs 4 and 3).
 * Run `npm run build`, then `PORT=<port> npx playwright test tests/wp175-local-partners.spec.ts --project=chromium`.
 */

const ROUTE = '/partner-with-us/local-partners/';
const TODAY = '2026-11-28';
const html = readBuilt(ROUTE);

/** The page's declared compression, in the words package Z records in doc 06 P7b (scratchpad wp175-audit.md §2, Local Partners target). */
const COMPRESSION = {
  kind: 'C2-C4',
  declaration:
    'C2–C4 compressed (declared; owner decision 2026-10-15, recast 2026-11-28): no Cost of Waiting (C3) or Imagine (C4) band. The C2 band keeps the three ranked local-partner pains and closes with "It doesn’t have to be this way."; the C2a gains (the C4 vignettes), the C3 facts (PX-06, RC-06) and the C4 vignette are not rendered.',
} as const;
const SEQUENCE = ['C1', 'GEO', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];

const one = (tag: string): string => {
  const bands = cmfBandHtml(html, tag);
  expect(bands, `one ${tag} wrapper`).toHaveLength(1);
  return bands[0];
};
const paragraphs = (fragment: string) => [...fragment.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)].map((m) => ({ attrs: m[1], text: textOf(m[2]) }));
/** The first paragraph of a band that is content (not its eyebrow or the statement's small label). */
const firstContent = (fragment: string) => paragraphs(fragment).find((p) => p.text && !/\b(eyebrow|pos__label|pe__label)\b/.test(p.attrs));
const attr = (attrs: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];
const sectionIds = (fragment: string) => [...fragment.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);

test.describe('Local Partners (P7b): CMF v3 order and coverage', () => {
  test('the bands run C1 → GEO → C2–C4 (compressed) → C5 … C14, with no gap, repeat or stray tag', () => {
    const seq = cmfSequence(html);
    expect(seq).toEqual(SEQUENCE);
    expect(cmfProblems(seq, { compression: COMPRESSION.kind })).toEqual([]);
  });

  test('every band of <main> sits in a Tone wrapper, and every wrapper’s first child is its band (so Tone’s 32px join holds)', () => {
    const main = /<main\b[\s\S]*<\/main>/.exec(html)![0];
    const untagged = [...main.matchAll(/<section\b[^>]*\bclass="band\b[^"]*"[^>]*\bid="([^"]+)"/g)].map((m) => m[1]).filter((id) => !SEQUENCE.some((t) => cmfBandHtml(html, t).some((b) => b.includes(`id="${id}"`))));
    expect(untagged, 'bands outside every wrapper').toEqual([]);
    for (const tag of SEQUENCE.slice(1)) expect(one(tag), tag).toMatch(/^<div class="tone[^"]*" data-cmf="[^"]+">\s*(?:<!--[\s\S]*?-->\s*)*<section\b[^>]*\bclass="band\b/);
  });

  test('GEO directly follows C1 and states ID-01 word for word; the page BLUF stays in it', () => {
    expect(cmfSequence(html).indexOf('GEO')).toBe(1);
    const geo = textOf(one('GEO'));
    expect(geo).toContain(fact('ID-01').text);
    expect(geo).toContain('CodersTrust Bangladesh supports local partners with curriculum, certification exam preparation, mentoring, reporting and safeguarding.');
  });

  test('the declared C2–C4 compression: one problem band with the three ranked pains, ending with the C3 transition line; no C3 or C4 band', () => {
    expect(COMPRESSION.declaration).toContain(C3_TRANSITION);
    const seq = cmfSequence(html);
    for (const t of ['C2', 'C3', 'C4']) expect(seq, t).not.toContain(t);
    const c2 = one('C2-C4 (compressed)');
    expect(sectionIds(c2)).toEqual(['problem']);
    expect([...c2.matchAll(/<li\b[^>]*\bdata-pain="([^"]+)"/g)].map((m) => m[1])).toEqual(['P1', 'P2', 'P3']);
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(c2).toMatch(/<p class="pb__transition"[^>]*data-transition[^>]*>[^<]+<\/p>\s*<\/div>\s*<\/section>\s*<\/div>$/);
    expect(textOf(/<main\b[\s\S]*<\/main>/.exec(html)![0]).split(C3_TRANSITION).length - 1, 'the transition line once on the page').toBe(1);
    for (const gone of ['id="cost"', 'id="future"', 'Cohorts That Train Without Placement Cost Community Trust', 'Imagine a Cohort in Your Community']) expect(html).not.toContain(gone);
  });

  test('C5: empathy → ORIGIN in one line → authority (the tiles, the Bangladesh team, the partner logos) → the method line as the band’s last line', () => {
    const c5 = one('C5');
    expect(sectionIds(c5)).toEqual(['guide']);
    const text = cmfBandText(html, 'C5');
    const team = 'CodersTrust Bangladesh, our country office in Dhaka, runs campuses in Mirpur and Agrabad, Chattogram. Most delivery has been in Bangladesh.';
    expect(inOrder(text, [EMPATHY.localPartners, 'From a Copenhagen launch to work in 16 countries and territories.', fact('SC-11').stat!.value, fact('SC-01').stat!.value, team, 'Organizations we have worked with', METHOD.localPartners.text])).toEqual([]);
    // the year is the tiles' ("since 2014" in their labels); the origin line does not say it again (WP64: no page prints "Since 2014, from a Copenhagen launch ...")
    expect(text).not.toContain('Since 2014, from a Copenhagen launch');
    expect(lastParagraph(c5)).toBe(`${METHOD.localPartners.text} How TalentLEAP Works`);
    expect(c5).toMatch(/<p class="pg__method pg__method--last" data-fact="IN-06"/);
    // one line each: the empathy line is the band's lead, and the origin and team lines carry their register facts
    expect(paragraphs(c5).find((p) => p.text === EMPATHY.localPartners)?.attrs).toMatch(/\bclass="lead"/);
    expect(c5).toMatch(/data-fact="ID-02 SC-03"/);
    expect(c5).toMatch(/data-fact="ID-07 SC-03"/);
    expect(text.split(METHOD.localPartners.text).length - 1, 'the method line once in C5').toBe(1);
  });

  test('C6: the crafted statement opens the band (only its eyebrow and H2 come first) and is the page’s only statement', () => {
    const c6 = one('C6');
    expect(sectionIds(c6)).toEqual(['mechanism']);
    const beforeStatement = c6.slice(c6.indexOf('</h2>') + 5, c6.indexOf('<div class="pos"'));
    expect(textOf(beforeStatement)).toBe('');
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(c6)![1])).toBe(POSITIONING.localPartners.text);
    expect(html.split('class="pos__text"').length - 1).toBe(1);
  });

  test('C7: the one-line trial lead is the band’s first line; the survey line, the case studies and Samina’s story follow', () => {
    const c7 = one('C7');
    expect(sectionIds(c7)).toEqual(['proof', 'cases', 'learner-voice']);
    const lead = firstContent(c7)!;
    expect(lead.text).toBe(TRIAL_LEAD.text);
    expect(attr(lead.attrs, 'data-fact')).toBe(TRIAL_LEAD.facts.join(' '));
    expect(inOrder(textOf(c7), [TRIAL_LEAD.text, LOCAL_PARTNER_EVIDENCE[1].text, 'Women-Focused Programs in Practice', 'she began offering her services as a graphic designer'])).toEqual([]);
    // Samina's story is no longer before the problem band
    expect(html.indexOf('id="learner-voice"')).toBeGreaterThan(html.indexOf('id="problem"'));
  });

  test('C8: one reliever per pain in rank order, then the gain creators, then "How It Works in Three Steps"', () => {
    const c8 = one('C8');
    expect(sectionIds(c8)).toEqual(['features', 'how-it-works']);
    const pains = [...one('C2-C4 (compressed)').matchAll(/<li\b[^>]*\bdata-pain="([^"]+)"/g)].map((m) => m[1]);
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ relieves: attr(m[1], 'data-relieves'), title: textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]) }));
    expect(cards.filter((c) => c.relieves).map((c) => c.relieves)).toEqual(pains);
    expect(LOCAL_PARTNER_PAINS.map((p) => p.id)).toEqual(pains);
    // the relievers come first, then the gain creator (no data-relieves): doc 06 P7b's connectivity-light delivery; its other two (labs you already have, safeguarding agreed before
    // enrollment) are said on this page already ("Mobilizes and Hosts" and "Host a Cohort"; the safeguarding answer), so they are not said again
    const gains = cards.filter((c) => !c.relieves).map((c) => c.title);
    expect(gains).toEqual(['Connectivity-Light Delivery']);
    expect(cards.findIndex((c) => !c.relieves)).toBe(pains.length);
    const steps = /<section\b[^>]*\bid="how-it-works"[\s\S]*$/.exec(c8)![0];
    expect(textOf(/<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(steps)![1])).toBe('How It Works in Three Steps');
    const items = [...steps.matchAll(/<li class="steps__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]));
    expect(items).toEqual([
      '1 Tell the Bangladesh Team Describe your organization, your district and the groups you work with, and we shape the cohort, tracks, safeguarding and reporting together.',
      `2 Host, Train and Mentor CodersTrust-trained facilitators deliver the localized curriculum in your labs, classrooms or centers: ${HOURS} training hours per certification, including exam preparation, then three months of milestone-based mentoring.`,
      `3 Place and Report Placement support into local, remote and global work, then follow-up surveys at ${TRACER_MONTHS}.`,
    ]);
    expect(steps).not.toMatch(/tracer|certified/i);
  });

  test('C9: the FAQ, then the due-diligence view (it sat between C11 and C12)', () => {
    expect(sectionIds(one('C9'))).toEqual(['faq', 'due-diligence']);
  });

  test('C10: the short band, "What Makes CodersTrust Different", USP 4 and USP 3, no table', () => {
    const c10 = one('C10');
    expect(sectionIds(c10)).toEqual(['difference']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c10)![1])).toBe(DIFFERENCE_HEADING);
    expect(c10).not.toMatch(/<table\b/);
    const titles = [...c10.matchAll(/<h3 class="diff__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]));
    expect(titles).toEqual([USPS.infrastructure.title, USPS.credential.title]);
    expect(titles.length).toBeGreaterThanOrEqual(2);
    expect(titles.length).toBeLessThanOrEqual(4);
    expect(html).not.toContain('id="compare"');
  });

  test('C11 → C12 → C13 → C14: the offer, the pilot band directly before the call to action, the next steps', () => {
    const seq = cmfSequence(html);
    expect(seq[seq.indexOf('C12') + 1]).toBe('C13');
    expect(sectionIds(one('C11'))).toEqual(['offer']);
    expect(sectionIds(one('C12'))).toEqual(['risk']);
    expect(sectionIds(one('C13'))).toEqual(['cta']);
    expect(sectionIds(one('C14'))).toEqual(['next-steps']);
  });

  test('the WebPage dateModified is the day of the change', () => {
    expect([...html.matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1])).toContain(TODAY);
  });
});

test.describe('Local Partners (P7b): spacing after the wrapping', () => {
  test('the track-record band follows the problem band on the same white ground, so its top padding is the 32px join', async ({ page }) => {
    await open(page, 'partner-with-us/local-partners/');
    const pads = await page.evaluate(() => {
      const css = (id: string) => getComputedStyle(document.getElementById(id)!);
      return { problemBg: css('problem').backgroundColor, guideBg: css('guide').backgroundColor, guideTop: css('guide').paddingTop };
    });
    expect(pads.guideBg).toBe(pads.problemBg);
    expect(pads.guideTop).toBe('32px');
  });
});
