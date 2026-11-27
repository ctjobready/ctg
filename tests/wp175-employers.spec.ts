import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { C3_TRANSITION, DIFFERENCE_HEADING, EMPATHY, EMPLOYER_INCLUDES, EMPLOYER_PAINS, EMPLOYER_STEPS, METHOD, POSITIONING, TRIAL_BAND_HEADING, TRIAL_LEAD, TRIAL_SCOPE, USPS, WORK_BRIDGE } from '../src/data/copy';
import { titleCase } from '../src/lib/titleCase.mjs';
import { open } from './support/browser';
import { cmfBandHtml, cmfBandText, cmfProblems, cmfSequence, inOrder, lastParagraph, readBuilt, textOf } from './support/cmf';

/**
 * WP175 package B (owner decisions of 28 November 2026): Employers (P7, /partner-with-us/employers/) follows CMF v3, C1 to C14, in order and coverage.
 *   Order       C1 → GEO (the "Your Next Step" routes and the "See the Program" link move under the definition) → C2–C4 (declared compression) → C5 → … → C14.
 *   C2–C4       EMPLOYER_PAINS, P1 to P3, then the C3 transition line.
 *   C5          empathy → ORIGIN (one line) → authority (SC-15, Akij Group, AWS, the ministry contract, the signed-agreement sentence, the logos) → METHOD.employers last (JobReady@Work’s needs
 *               assessment, IN-10); the TalentLEAP line that C6 printed is gone, so the method is said once.
 *   C6          the crafted statement first, once; the band is light, so the dark trial band after it is not a second dark band in a row.
 *   C7          the trial band (it was two links): the one-line trial lead, the TRIAL-SCOPE line directly under it, the survey sentence with its youth-programs lead-in; then Mysha’s story.
 *   C8          EMPLOYER_INCLUDES relieve P1 to P3 in order, then "How It Works in Three Steps" (EMPLOYER_STEPS, step 2 cut to "Custom curriculum and workshops.": WP175-Z put WP145's wording in the shared
 *               step, "can be added where a track offers one", which is the C6 "Deliver" card's clause word for word, so the step keeps only its first clause here). Doc 04 4.6 and doc 06 P7 name no gain creator
 *               for this page, so none is drafted.
 *   C10         "What Makes CodersTrust Different": USP 3 (the employer form, credentialWork) and USP 1 (evidence). Doc 04 4.6 names USPs 3 and 4, but USP 4 (labs, colleges, Training of Trainers) describes youth
 *               delivery, and a page that explains delivery must name its facilitators (tests/wp152.spec.ts).
 *   C11         the hiring band (it sat before C2) and the two options.
 * Run `npm run build`, then `PORT=<port> npx playwright test tests/wp175-employers.spec.ts --project=chromium`.
 */

const ROUTE = '/partner-with-us/employers/';
const TODAY = '2026-11-28';
const html = readBuilt(ROUTE);

/** The page's declared compression, in the words package Z records in doc 04 4.6 / doc 06 P7 (scratchpad wp175-audit.md §3: "the same sentence as P6, with P7"). */
const COMPRESSION = {
  kind: 'C2-C4',
  declaration:
    'P7 declares a C2–C4 compression (owner decision of 2026-10-15, recast 2026-11-28): the Cost of Waiting (C3) and Imagine (C4) bands are not rendered; the C2 band carries the gains and ranked pains and ends with the C3 transition line ‘It doesn’t have to be this way.’',
} as const;
/** Doc 04 4.6 and doc 06 P7 list C8 as the three relievers and the steps, with no gain creator (the other matrices name theirs). */
const NO_GAIN_CREATOR = 'doc 04 4.6 C8 map and doc 06 P7 C8 name no gain creator';
const SEQUENCE = ['C1', 'GEO', 'C2-C4 (compressed)', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'];
const SURVEY_LEAD_IN = 'From CodersTrust’s youth programs:';

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

test.describe('Employers (P7): CMF v3 order and coverage', () => {
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

  test('GEO directly follows C1: the definition and its JobReady@Work bridge, then the two routes and the program link', () => {
    const geo = one('GEO');
    expect(sectionIds(geo)).toEqual(['definition', 'route-link']);
    expect(inOrder(textOf(geo), [fact('ID-01').text, WORK_BRIDGE.text, 'Your Next Step', 'Train Your Team', 'Hire Talent', 'See the Training Delivery Details'])).toEqual([]);
    expect(textOf(one('C1'))).not.toContain('Your Next Step');
  });

  test('the declared C2–C4 compression: EMPLOYER_PAINS P1 to P3, then the C3 transition line; no C3 or C4 band', () => {
    expect(COMPRESSION.declaration).toContain(C3_TRANSITION);
    const seq = cmfSequence(html);
    for (const t of ['C2', 'C3', 'C4']) expect(seq, t).not.toContain(t);
    const c2 = one('C2-C4 (compressed)');
    expect(sectionIds(c2)).toEqual(['problem']);
    expect([...c2.matchAll(/<li\b[^>]*\bdata-pain="([^"]+)"/g)].map((m) => m[1])).toEqual(EMPLOYER_PAINS.map((p) => p.id));
    expect([...c2.matchAll(/<p class="gp__q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => textOf(m[1]))).toEqual(EMPLOYER_PAINS.map((p) => titleCase(p.name)));
    expect(lastParagraph(c2)).toBe(C3_TRANSITION);
    expect(mainText().split(C3_TRANSITION).length - 1).toBe(1);
    for (const gone of ['id="cost"', 'id="future"', 'AI Is Changing the Skills Your Teams Need', 'What Changes for Your Team']) expect(html).not.toContain(gone);
  });

  test('C5: empathy → ORIGIN in one line → authority → the JobReady@Work method line (needs assessment, IN-10) as the band’s last line', () => {
    const c5 = one('C5');
    expect(sectionIds(c5)).toEqual(['guide']);
    expect(inOrder(cmfBandText(html, 'C5'), [EMPATHY.employers, 'From a Copenhagen launch to work in 16 countries and territories.', fact('SC-15').stat!.value, 'Akij Group', 'AWS Authorized Training Partner', 'Organizations we have worked with', METHOD.employers.text])).toEqual([]);
    expect(lastParagraph(c5)).toBe(METHOD.employers.text);
    expect(c5).toMatch(/<p class="pg__method pg__method--last" data-fact="IN-10"/);
    expect(paragraphs(c5).find((p) => p.text === EMPATHY.employers)?.attrs).toMatch(/\bclass="lead"/);
  });

  test('C6: the crafted statement opens the band and is the page’s only statement; the TalentLEAP line and link are gone from it, so the method is said once', () => {
    const c6 = one('C6');
    expect(sectionIds(c6)).toEqual(['mechanism']);
    expect(textOf(c6.slice(c6.indexOf('</h2>') + 5, c6.indexOf('<div class="pos"')))).toBe('');
    expect(textOf(/<p class="pos__text"[^>]*>([\s\S]*?)<\/p>/.exec(c6)![1])).toBe(POSITIONING.employers.text);
    expect(html.split('class="pos__text"').length - 1).toBe(1);
    expect(c6).not.toContain('Our TalentLEAP method organizes skills into career paths.');
    expect(c6).not.toContain('How TalentLEAP Works');
    expect(mainText().split(METHOD.employers.text).length - 1).toBe(1);
  });

  test('C7: the trial band leads with the one-line trial lead, the TRIAL-SCOPE line directly under it, the survey sentence with its youth-programs label; Mysha’s story follows', () => {
    const c7 = one('C7');
    expect(sectionIds(c7)).toEqual(['proof-band', 'learner-voice']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c7)![1])).toBe(TRIAL_BAND_HEADING);
    const [lead, scope] = contentParagraphs(c7);
    expect(lead.text).toBe(TRIAL_LEAD.text);
    expect(attr(lead.attrs, 'data-fact')).toBe('RC-01 RC-02');
    expect(scope.text).toBe(TRIAL_SCOPE.work.text);
    expect(scope.attrs).toMatch(/\bdata-trial-scope\b/);
    expect(c7).toMatch(new RegExp(`<p class="proofband__chartlead"[^>]*><strong\\b[^>]*>${SURVEY_LEAD_IN}</strong> Among surveyed completers`));
    expect(textOf(c7)).not.toContain('(Not Corporate Training)');
    expect(html.indexOf('id="learner-voice"')).toBeGreaterThan(html.indexOf('id="problem"'));
  });

  test(`C8: EMPLOYER_INCLUDES relieve P1 to P3 in rank order, then "How It Works in Three Steps"; no gain creator (${NO_GAIN_CREATOR})`, () => {
    const c8 = one('C8');
    expect(sectionIds(c8)).toEqual(['features', 'how-it-works']);
    const pains = [...one('C2-C4 (compressed)').matchAll(/<li\b[^>]*\bdata-pain="([^"]+)"/g)].map((m) => m[1]);
    const cards = [...c8.matchAll(/<li class="card inc__card"([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ relieves: attr(m[1], 'data-relieves'), title: textOf(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(m[2])![1]) }));
    expect(cards.map((c) => c.relieves)).toEqual(pains);
    expect(cards.map((c) => c.title)).toEqual(EMPLOYER_INCLUDES.map((c) => c.title));
    const steps = /<section\b[^>]*\bid="how-it-works"[\s\S]*$/.exec(c8)![0];
    expect(textOf(/<h3\b[^>]*>([\s\S]*?)<\/h3>/.exec(steps)![1])).toBe('How It Works in Three Steps');
    const shown = [EMPLOYER_STEPS[0], { title: EMPLOYER_STEPS[1].title, text: 'Custom curriculum and workshops.' }, EMPLOYER_STEPS[2]];
    expect([...steps.matchAll(/<li class="steps__item"[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]))).toEqual(shown.map((s, i) => `${i + 1} ${s.title} ${s.text}`));
    // WP145: certification preparation "can be added where a track offers one" (the Deliver card); the step does not say it again in the retired form
    expect(mainText()).not.toContain('including preparation for an industry certification where a track offers one');
    // WP175-Z: nor in WP145's form, which the shared step now carries: the page says it in the Deliver card (and C10's line), not a second time in the step
    expect(mainText().split('preparation for an industry certification can be added where a track offers one').length - 1).toBe(1);
  });

  test('C9: the FAQ, then the due-diligence view (it sat after the offer)', () => {
    expect(sectionIds(one('C9'))).toEqual(['faq', 'due-diligence']);
  });

  test('C10: the short band, "What Makes CodersTrust Different", USP 3 (employer form) and USP 1, no table; no delivery wording that would need the facilitator model', () => {
    const c10 = one('C10');
    expect(sectionIds(c10)).toEqual(['difference']);
    expect(textOf(/<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(c10)![1])).toBe(DIFFERENCE_HEADING);
    expect(c10).not.toMatch(/<table\b/);
    expect([...c10.matchAll(/<h3 class="diff__title"[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => textOf(m[1]))).toEqual([USPS.credentialWork.title, USPS.evidence.title]);
    expect(textOf(c10)).not.toContain(USPS.infrastructure.text);
    expect(html).not.toContain('id="compare"');
  });

  test('C11: the hiring band (it sat before the problem band) and the two options; the in-page anchors still resolve', () => {
    expect(sectionIds(one('C11'))).toEqual(['hire-talent', 'offer']);
    expect(html).toContain('id="train-your-team"');
    expect(html.indexOf('id="hire-talent"')).toBeGreaterThan(html.indexOf('id="problem"'));
  });

  test('C12 directly before C13; C14 is the two routes and the closing line', () => {
    const seq = cmfSequence(html);
    expect(seq[seq.indexOf('C12') + 1]).toBe('C13');
    expect(sectionIds(one('C12'))).toEqual(['risk']);
    expect(sectionIds(one('C13'))).toEqual(['cta']);
    expect(sectionIds(one('C14'))).toEqual(['next-steps', 'reinforce']);
  });

  test('no two dark bands touch (C6 is light; the trial band is the one dark band)', () => {
    const main = /<main\b[\s\S]*<\/main>/.exec(html)![0];
    const bands = [...main.matchAll(/<section\b[^>]*\bclass="band ([^"]*)"[^>]*\bid="([^"]+)"/g)].map((m) => ({ id: m[2], dark: /\bband--(klein|deep-ink)\b/.test(m[1]) }));
    expect(bands.flatMap((b, i) => (i > 0 && b.dark && bands[i - 1].dark ? [`#${bands[i - 1].id} then #${b.id}`] : []))).toEqual([]);
  });

  test('the WebPage dateModified is the day of the change', () => {
    expect([...html.matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1])).toContain(TODAY);
  });
});

test.describe('Employers (P7): spacing after the wrapping', () => {
  test('bands that meet on the same ground join at 32px (the problem band and the track record; the learner story and the cards; the hiring band and the options)', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const pads = await page.evaluate(() => {
      const css = (id: string) => getComputedStyle(document.getElementById(id)!);
      return ['problem:guide', 'learner-voice:features', 'hire-talent:offer'].map((pair) => {
        const [a, b] = pair.split(':');
        return { pair, same: css(a).backgroundColor === css(b).backgroundColor, top: css(b).paddingTop };
      });
    });
    for (const p of pads) expect(p, p.pair).toEqual({ pair: p.pair, same: true, top: '32px' });
  });
});
