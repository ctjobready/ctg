import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP125 (Opus Medium run 7, kit 92; owner answer 2026-10-29 on the World Food Programme): the run-7 findings. Run `npm run build` first.
 *   1  Global Reach, Iraq: "Training delivered with the World Food Programme (WFP); cooperation announced in March 2018" (owner: "Yes, training delivered"); no figure.
 *   2  The News index lede and meta no longer say every post is dated "when it was published": five posts written in October 2026 are listed under their event dates.
 *   3  The WSIS post names the 2024 event as the WSIS+20 Forum High-Level Event, not the World Summit.
 *   4  Akij post: "such corporate trainings not only benefit ... but also contribute".
 *   5  The 2021 freelancing post: "within a few years, she was ..." and "a former Danish Army captain".
 *   6  Her Power: the hero tile, the meta description and the Case Studies card read "tracked women in work (47%), among the 2,400 women CodersTrust trained directly".
 *   7  Ostitto post: "emphasized CodersTrust’s dedication to equal rights" (narration, not a quotation).
 */
const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&#8221;|&#x201D;/gi, '”')
    .replace(/&#8220;|&#x201C;/gi, '“')
    .replace(/&nbsp;/g, ' ');
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');

/** Visible text plus alt / meta / title / aria-label attribute values plus JSON-LD, with URLs removed (a URL is not copy). */
function searchable(raw: string): string {
  const attrs = [...raw.matchAll(/\b(?:alt|content|title|aria-label)="([^"]*)"/g)].map((m) => m[1]).join(' ¶ ');
  const ld = [...raw.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(' ¶ ');
  const body = raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  return decode(`${body} ¶ ${attrs} ¶ ${ld}`)
    .replace(/\\u201d/gi, '”')
    .replace(/https?:\/\/[^\s"'<>)]+/g, ' ')
    .replace(/\s+/g, ' ');
}
const text = (rel: string) => searchable(html(rel));
const pagesMatching = (re: RegExp): string[] => listPages().filter((p) => re.test(searchable(readFileSync(p.file, 'utf8')))).map((p) => p.route);
const post = (slug: string) => `news/${slug}/index.html`;
const metaDescription = (raw: string) => decode(raw.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
const dateModified = (raw: string) => raw.match(/"dateModified":"([^"]*)"/)?.[1];

const WSIS = 'coderstrust-attends-wsis20-forum-high-level-event';
const AKIJ = 'coderstrust-provides-corporate-training-to-akij-group-one-of-the-largest-conglomerates-of-south-asia';
const FREELANCING = 'coderstrust-teaching-you-freelancing-the-right-way';
const OSTITTO = 'coderstrust-bangladesh-and-ostitto-join-forces-to-bridge-the-digital-divide';

test.describe('WP125 item 1, Global Reach: Iraq is training delivered with the WFP', () => {
  const NOTE = 'Training delivered with the World Food Programme (WFP); cooperation announced in March 2018';
  test('the Iraq map card carries the new note and keeps its other cells; the old note is on no page', () => {
    const raw = html('impact/global-reach/index.html');
    const card = raw.match(/<div class="wmap__card" id="wmap-card-iraq"[\s\S]*?<\/dl>/)?.[0] ?? '';
    const t = searchable(card);
    expect(t).toContain('Iraq 2018');
    expect(t).toContain('Target Group Refugees');
    expect(t).toContain('Skills Graphic design and freelancing');
    expect(t).toContain(`Note ${NOTE}`);
    expect(pagesMatching(/Cooperation with the World Food Programme announced/)).toEqual([]);
  });
  test('the Iraq table row carries the note, and the note states no figure beyond the month and year of the announcement', () => {
    const raw = html('impact/global-reach/index.html');
    const rows = [...raw.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) => m[0]).filter((r) => /<th[^>]*>\s*Iraq\b/.test(r));
    expect(rows).toHaveLength(1);
    expect(searchable(rows[0])).toContain(NOTE);
    expect(NOTE.replace('March 2018', '')).not.toMatch(/\d/);
  });
});

test.describe('WP125 item 2, the News index does not say every post is dated when it was published', () => {
  const LEDE = 'Partnerships and MOUs, recognition, program events and leadership: what CodersTrust has announced, each post dated by its publication or, for posts written later from dated sources, by its event date.';
  const META = 'News from CodersTrust: partnerships and MOUs, recognition, program events and leadership, each dated by publication or event.';
  test('lede and meta description are reworded, and the meta stays within 155 characters', () => {
    const raw = html('news/index.html');
    expect(searchable(raw)).toContain(LEDE);
    expect(metaDescription(raw)).toBe(META);
    expect(META.length).toBeLessThanOrEqual(155);
  });
  test('"dated when it was published" and "dated as published" are on no page', () => {
    expect(pagesMatching(/dated when it was published|dated as published/)).toEqual([]);
  });
});

test.describe('WP125 items 3 to 5 and 7, News post wording', () => {
  test('the WSIS post names the WSIS+20 Forum High-Level Event', () => {
    const t = text(post(WSIS));
    expect(t).toContain('CodersTrust participated in the WSIS+20 Forum High-Level Event in Geneva, held May 27 to 31, 2024.');
    expect(t).not.toContain('CodersTrust participated in the World Summit on the Information Society');
  });
  test('the Akij post says "also contribute to the growth"; "also contributes" is gone', () => {
    const t = text(post(AKIJ));
    expect(t).toContain('such corporate trainings not only benefit the individuals involved but also contribute to the growth and competitiveness of the companies in the digital economy.');
    expect(t).not.toContain('also contributes to the growth');
  });
  test('the freelancing post says "within a few years, she was" and "a former Danish Army captain"', () => {
    const t = text(post(FREELANCING));
    expect(t).toContain('within a few years, she was on the path to becoming a dental technician');
    expect(t).not.toContain('within a few years, she is now');
    expect(t).toContain('Ferdinand Kjærulff, a former Danish Army captain');
    expect(t).not.toContain('Ferdinand Kjærulff, a Danish Army captain');
  });
  test('the Ostitto post says "emphasized CodersTrust’s dedication to equal rights"', () => {
    const t = text(post(OSTITTO));
    expect(t).toContain('emphasized CodersTrust’s dedication to equal rights');
    expect(t).not.toContain('the institute’s dedication');
  });
  test('each changed post carries dateModified 2026-10-29', () => {
    for (const slug of [WSIS, AKIJ, FREELANCING, OSTITTO]) expect(dateModified(html(post(slug))), slug).toBe('2026-10-29');
  });
});

test.describe('WP125 item 6, Her Power reads "tracked women in work (47%), among the 2,400 women CodersTrust trained directly"', () => {
  const LABEL = 'tracked women in work (47%), among the 2,400 women CodersTrust trained directly';
  const META = 'Her Power, a program of DoICT under Bangladesh’s ICT Division: 372 of 800 tracked women in work (47%), among the 2,400 women CodersTrust trained directly.';
  test('the Her Power hero tile (stat label) and meta description carry the clause; the meta stays within 155 characters', () => {
    const raw = html('impact/case-studies/her-power/index.html');
    expect(raw.match(/<p class="stat__label"[^>]*>([^<]*)<\/p>/)?.[1]).toBe(LABEL);
    expect(metaDescription(raw)).toBe(META);
    expect(META.length).toBeLessThanOrEqual(155);
  });
  test('the Case Studies index card carries the clause beside 372 of 800', () => {
    expect(text('impact/case-studies/index.html')).toContain(`372 of 800 ${LABEL}`);
  });
  test('the old order "tracked women, from the 2,400 trained directly by CodersTrust, in work" is on neither page, and 372 of 800 stays', () => {
    for (const rel of ['impact/case-studies/her-power/index.html', 'impact/case-studies/index.html']) {
      const t = text(rel);
      expect(t, rel).not.toContain('tracked women, from the 2,400 trained directly by CodersTrust, in work');
      expect(t, rel).toContain('372 of 800');
    }
  });
});
