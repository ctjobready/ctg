import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP157 (primary adversarial review 2026-11-02: 4 Minor, 9 Polish, F1 to F13).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp157.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   F1  Outcomes "Who Responded": the 48.0% is a share of surveyed completers, not of all respondents.
 *   F2  Outcomes "Employment by Type": "Shares are rounded." (the components sum to 78.3% against the 78.2% total).
 *   F3  The public CSV says "published; base not available", not "base not stated in the report" (a public reader cannot identify "the report").
 *   F4  Independent Evaluation, "Over Four Times the Average of Nine Training Trials": the sentence no longer repeats the heading.
 *   F5  Impact SDG intro: seven SDGs, then the three at the core named with their numbers.
 *   F6  Global Reach meta (and llms.txt, and the JSON-LD description): Denmark has no target group or skills, so the line does not promise them for every location.
 *   F7  About timeline: completed periods in the past tense (2014–2017, 2015–2016, the Impact Survey); the current JobReady line stays present.
 *   F8  JobReady@Work meta (and llms.txt, JSON-LD): drops the ManpowerGroup statistic, which the page body never states.
 *   F9  Investors H1: "a Platform Built to Connect", not a live capability.
 *   F10 Aziz Ahmad: "he has spoken at forums including ..." (past appearances).
 *   F11 JobReady platform "Planned Adaptive Learning": "planned" once in the sentence.
 *   F12 TalentLEAP: the "Example only" caption repeated the H2 and is gone.
 *   F13 Kosovo case study H1: "Women in Online Work, Kosovo: A World Bank Pilot for Young Women".
 *   O1  (owner 2026-11-02) The four SuperKids portraits carry no first names: "SuperKids learner" captions, "Portrait of a SuperKids learner" alt text, no name on any built page.
 *   O2  (owner 2026-11-02) Governance: "Legal status: CT USA, Inc. is a for-profit company incorporated in New York. CodersTrust Bangladesh Ltd. is incorporated in Bangladesh."
 *   O3  (owner 2026-11-02) Aziz Ahmad: the Senate is dropped; the Davos events are named as events during World Economic Forum week.
 *   14  Owner date rule: a page with its own "Last updated" or dateModified is today (2026-11-02) or later.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const main = (rel: string) => visible(mainRaw(rel));
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);
/** The text from `start` up to (not including) the next `end`; fails if either marker is missing. */
function between(text: string, start: string, end: string): string {
  const i = text.indexOf(start);
  expect(i, `"${start}" is on the page`).toBeGreaterThanOrEqual(0);
  const j = text.indexOf(end, i + start.length);
  expect(j, `"${end}" follows "${start}"`).toBeGreaterThan(i);
  return text.slice(i, j);
}
/** The visible text of one ReportSection (the section with that id, up to the next ReportSection), so the "On This Page" list does not match first. */
function rsec(rel: string, id: string): string {
  const raw = html(rel);
  const i = raw.search(new RegExp(`<section[^>]*\\bid="${id}"`));
  expect(i, `section #${id} is on ${rel}`).toBeGreaterThanOrEqual(0);
  const j = raw.indexOf('<section class="rsec', i + 10);
  return visible(raw.slice(i, j > i ? j : undefined));
}
const metaDescription = (rel: string) => decode(/<meta name="description" content="([^"]*)"/.exec(html(rel))?.[1] ?? '');
const jsonLdDescriptions = (rel: string) => [...html(rel).matchAll(/"description":"((?:[^"\\]|\\.)*)"/g)].map((m) => decode(JSON.parse(`"${m[1]}"`)));
const h1 = (rel: string) => visible(/<h1[\s\S]*?<\/h1>/.exec(html(rel))?.[0] ?? '');

const OUTCOMES = 'impact/outcomes-2026/index.html';
const EVALUATION = 'impact/independent-evaluation/index.html';
const IMPACT = 'impact/index.html';
const GLOBAL_REACH = 'impact/global-reach/index.html';
const ABOUT = 'about/index.html';
const WORK = 'programs/jobready-work/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const AZIZ = 'about/team/aziz-ahmad/index.html';
const PLATFORM = 'our-model/jobready-platform/index.html';
const TALENTLEAP = 'our-model/talentleap/index.html';
const KOSOVO = 'impact/case-studies/kosovo-women-in-online-work/index.html';
const SUPERKIDS = 'programs/superkids/index.html';
const IN_THE_FIELD = 'impact/in-the-field/index.html';
const GOVERNANCE = 'about/governance/index.html';

const TODAY = '2026-11-02';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// F1, F2 Outcomes
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('F1 Outcomes "Who Responded": the 48.0% is a share of surveyed completers', () => {
  test('"Nearly half of surveyed completers were employed before training (48.0%)." and the respondent profile still follows', () => {
    const t = rsec(OUTCOMES, 'respondents');
    expect(t).toContain('Nearly half of surveyed completers were employed before training (48.0%).');
    expect(t).not.toContain('Nearly half of respondents were employed before training');
    // The next sentence is the register's respondent profile (OC-09), which stays about respondents.
    expect(t).toContain('(48.0%). Respondent profile: 85.0% hold a bachelor’s degree or higher;');
  });
});

test.describe('F2 Outcomes "Employment by Type": the rounding note', () => {
  test('"Shares are rounded." is on the page once, with the Employment by Type chart', () => {
    const t = main(OUTCOMES);
    expect(count(t, 'Shares are rounded.')).toBe(1);
    const band = rsec(OUTCOMES, 'employment');
    expect(band).toContain('Employment by Type, Before Training and at the October 2026 Survey');
    expect(band).toContain('Shares are rounded.');
    // It is a sentence beside the by-type chart (a note under it), not in the table.
    expect(mainRaw(OUTCOMES)).toMatch(/class="pb__note[^"]*"[^>]*>Shares are rounded\.<\/p>/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// F3 CSV
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('F3 The public CSV: "published; base not available"', () => {
  const csvs = () => [readFileSync('public/data/outcomes-2026-aggregates.csv', 'utf8'), ...(existsSync(join(DIST_DIR, 'data/outcomes-2026-aggregates.csv')) ? [html('data/outcomes-2026-aggregates.csv')] : [])];

  test('no row says "base not stated in the report"; the 43 rows without a stated base say "published; base not available"', () => {
    const files = csvs();
    expect(files.length).toBe(2); // the source file and its built copy
    for (const csv of files) {
      expect(csv).not.toMatch(/not stated in the report/);
      expect(count(csv, ',published; base not available\n')).toBe(43);
    }
  });

  test('the other statuses are unchanged ("base is n = N, as for the other rows of this measure"), and the built copy equals the source', () => {
    const [src, built] = csvs();
    expect(built).toBe(src);
    const statuses = new Set(src.trim().split('\n').slice(1).map((l) => /,([^,]*)$/.exec(l)?.[1] ?? ''));
    expect([...statuses].every((s) => s === 'published' || s === 'published; base not available' || /^published; base is n = \d+, as for the other rows of this measure$/.test(s)), [...statuses].join(' | ')).toBe(true);
    expect(src.split('\n')[0]).toBe('measure_id,measure,category,value_type,value,base_n,status');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// F4 Independent Evaluation
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('F4 Independent Evaluation: the nine-trials sentence does not repeat its heading', () => {
  const NEW = 'The employment effect, +10.3 percentage points for women offered a place, is over four times the 2.3-point average across nine randomized trials of vocational training reviewed by World Bank economist David McKenzie (2017), only three of which found a significant employment effect.';

  test('the sentence under "Over Four Times the Average of Nine Training Trials" is the new one, once', () => {
    const t = main(EVALUATION);
    expect(rsec(EVALUATION, 'context')).toBe(`Over Four Times the Average of Nine Training Trials ${NEW}`);
    expect(count(t, 'David McKenzie (2017)')).toBe(1);
    expect(t).not.toContain('Employment effect over four times the average across nine training trials');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// F5 Impact SDG intro
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('F5 Impact SDG intro: the three core goals are named as the core', () => {
  test('"... aligns with seven SDGs. At its core are SDG 4 (Quality Education), SDG 5 (Gender Equality) and SDG 8 (Decent Work and Economic Growth)." with no serial comma', () => {
    const t = visible(/<section[^>]*id="sdg"[\s\S]*?<\/section>/.exec(html(IMPACT))?.[0] ?? '');
    expect(t).toContain('Seven Global Goals, Three at the Core');
    expect(t).toContain('CodersTrust’s training-to-employment model aligns with seven SDGs. At its core are SDG 4 (Quality Education), SDG 5 (Gender Equality) and SDG 8 (Decent Work and Economic Growth).');
    expect(t).not.toContain('with a primary focus on');
    expect(t).not.toContain('as well as Decent Work');
    expect(t).not.toContain('..');
    // the list below is unchanged: three core badges, then four others
    expect(count(t, '(Core)')).toBe(3);
    expect(t).toContain('SDG 1 · No Poverty');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// F6, F8 Meta descriptions
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

function expectDescription(rel: string, route: string, expected: string, forbidden: RegExp[]) {
  const meta = metaDescription(rel);
  expect(meta).toBe(expected);
  expect(meta.length).toBeLessThanOrEqual(155);
  for (const f of forbidden) expect(meta).not.toMatch(f);
  // The JSON-LD description and the llms.txt entry reuse the meta.
  expect(jsonLdDescriptions(rel).filter((d) => d !== expected && /CodersTrust has worked in|JobReady@Work builds/.test(d))).toEqual([]);
  expect(jsonLdDescriptions(rel)).toContain(expected);
  const llms = readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8');
  expect(llms).toContain(`${route}): ${expected}`);
}

test.describe('F6 Global Reach meta: no target group and skills promised for every location', () => {
  const NEW = 'CodersTrust has worked in 16 countries and territories: Bangladesh since 2014 and 15 international locations, with years and, where known, target groups.';
  test('the meta, the JSON-LD description and llms.txt agree, within 155 characters, and keep "16 countries and territories"', () => {
    expectDescription(GLOBAL_REACH, 'https://coderstrust.global/impact/global-reach/', NEW, [/each location/, /skills/]);
    expect(metaDescription(GLOBAL_REACH)).toContain('16 countries and territories');
  });
  test('the reason: the Denmark row has no target group and no skills ("—")', () => {
    const t = main(GLOBAL_REACH);
    expect(t).toMatch(/Denmark[^]*?2014[^]*?—[^]*?—/);
  });
});

test.describe('F8 JobReady@Work meta: the ManpowerGroup statistic is not advertised where the page body does not state it', () => {
  const NEW = 'JobReady@Work builds custom AI-ready training around your roles and sources job-ready talent through CodersTrust’s placement team.';
  test('the meta, the JSON-LD description and llms.txt agree, within 155 characters', () => {
    expectDescription(WORK, 'https://coderstrust.global/programs/jobready-work/', NEW, [/ManpowerGroup/, /72%/]);
  });
  test('the page body never states the statistic (so the meta must not)', () => {
    expect(main(WORK)).not.toMatch(/72%|ManpowerGroup/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// F7 About timeline
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('F7 About timeline: completed periods in the past tense', () => {
  const t = () => main(ABOUT);

  test('2014–2017: "CodersTrust began training freelancers in Bangladesh with a talent-financing model; international programs followed, including Kosovo with the World Bank Group."', () => {
    expect(t()).toContain('2014–2017 Freelancer Development and Talent Financing CodersTrust began training freelancers in Bangladesh with a talent-financing model; international programs followed, including Kosovo with the World Bank Group. 2015–2016');
    expect(t()).not.toContain('CodersTrust begins training freelancers');
    expect(t()).not.toContain('international programs follow,');
  });

  test('2015–2016: "A Rockefeller Foundation grant supported a CodersTrust feasibility study in Kenya and Nigeria."', () => {
    expect(t()).toContain('2015–2016 Rockefeller Foundation Grant A Rockefeller Foundation grant supported a CodersTrust feasibility study in Kenya and Nigeria. 2018–2021');
    expect(t()).not.toContain('grant supports a CodersTrust feasibility study');
  });

  test('2025–2026 (the current period): "JobReady rolls out in stages." stays present; "CodersTrust published Impact Survey 2026."', () => {
    const line = between(t(), '2025–2026 JobReady, YouthWIDE and the Impact Survey', 'CodersTrust Around the World').trim();
    expect(line.startsWith('2025–2026 JobReady, YouthWIDE and the Impact Survey JobReady rolls out in stages. YouthWIDE aims to train')).toBe(true);
    expect(line).toMatch(/depending on government and donor commitments\. CodersTrust published Impact Survey 2026\./);
    expect(t()).not.toContain('CodersTrust publishes Impact Survey 2026');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// F9 to F13 Single strings
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test('F9 Investors H1: "Invest in a Platform Built to Connect Emerging-Market Youth to Work"', () => {
  expect(h1(INVESTORS)).toBe('Invest in a Platform Built to Connect Emerging-Market Youth to Work');
  expect(main(INVESTORS)).not.toContain('Invest in the Platform Connecting');
});

test('F10 Aziz Ahmad: "he has spoken at forums including" (past appearances; the forums themselves are O3)', () => {
  const t = main(AZIZ);
  expect(t).toContain('he has spoken at forums including');
  expect(t).not.toContain('he speaks at forums');
});

test('F11 JobReady platform: "Personalized and adaptive learning based on TalentLEAP’s competency levels is planned and not live yet."', () => {
  const t = main(PLATFORM);
  expect(t).toContain('Planned Adaptive Learning Personalized and adaptive learning based on TalentLEAP’s competency levels is planned and not live yet.');
  expect(t).not.toContain('Planned: personalized and adaptive learning');
});

test.describe('F12 TalentLEAP: the Example caption that repeated the heading is gone', () => {
  test('no "Example only: the Digital Marketing career path."; the H2 and the not-affiliated sentence stay', () => {
    const t = main(TALENTLEAP);
    expect(t).not.toContain('Example only');
    const band = rsec(TALENTLEAP, 'example');
    expect(band.startsWith('Example: The Digital Marketing Career Path')).toBe(true);
    expect(band).toContain('Level 1 · Competent');
    expect(band).toMatch(/not affiliated/i);
    expect(mainRaw(TALENTLEAP)).not.toContain('lv__cap');
  });
});

test('F13 Kosovo case study H1: "Women in Online Work, Kosovo: A World Bank Pilot for Young Women"', () => {
  expect(h1(KOSOVO)).toBe('Women in Online Work, Kosovo: A World Bank Pilot for Young Women');
  expect(html(KOSOVO)).not.toContain('Preparing Young Women for Online Work');
  expect(html(KOSOVO)).toContain('"headline":"Women in Online Work, Kosovo: A World Bank Pilot for Young Women"');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// O1 to O3 Owner decisions 2026-11-02
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('O1 SuperKids learner portraits: no first names', () => {
  const NAMES = /Kolika|Zuhaina|Nihal|Zaeem/;

  test('no built page (text, attributes, JSON-LD) and no llms.txt carries the four first names', () => {
    const hits = listPages().filter((p) => NAMES.test(readFileSync(p.file, 'utf8'))).map((p) => p.route);
    expect(hits).toEqual([]);
    expect(readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8')).not.toMatch(NAMES);
  });

  test('no built page and no built asset filename carries the names in any letter case (image URLs, asset ids)', () => {
    const ANY_CASE = /kolika|zuhaina|nihal|zaeem/i;
    const hits = listPages().filter((p) => ANY_CASE.test(readFileSync(p.file, 'utf8'))).map((p) => p.route);
    expect(hits).toEqual([]);
    expect(readdirSync(join(DIST_DIR, '_astro')).filter((f) => ANY_CASE.test(f))).toEqual([]);
  });

  test('SuperKids and In the Field show the four portraits with the alt "Portrait of a SuperKids learner" and the caption "SuperKids learner"', () => {
    for (const rel of [SUPERKIDS, IN_THE_FIELD]) {
      const raw = html(rel);
      const imgs = [...raw.matchAll(/<img[^>]*data-asset="legacy-superkids-learner-portrait-[1-4]"[^>]*>/g)].map((m) => m[0]);
      expect(imgs.length, `${rel} shows the four learner portraits`).toBe(4);
      for (const img of imgs) expect(decode(/alt="([^"]*)"/.exec(img)?.[1] ?? ''), rel).toBe('Portrait of a SuperKids learner');
      const caps = [...raw.matchAll(/<figcaption class="gd__cap"[^>]*>([^<]*)<\/figcaption>/g)].map((m) => decode(m[1])).filter((c) => /SuperKids learner/.test(c));
      expect(caps, rel).toEqual(['SuperKids learner', 'SuperKids learner', 'SuperKids learner', 'SuperKids learner']);
    }
  });
});

test.describe('O2 Governance: the legal-status line', () => {
  test('"Legal status: CT USA, Inc. is a for-profit company incorporated in New York. CodersTrust Bangladesh Ltd. is incorporated in Bangladesh." once, in the co-design checklist', () => {
    const t = main(GOVERNANCE);
    const LINE = 'Legal status: CT USA, Inc. is a for-profit company incorporated in New York. CodersTrust Bangladesh Ltd. is incorporated in Bangladesh.';
    expect(count(t, LINE)).toBe(1);
    expect(count(t, 'Legal status:')).toBe(1);
    expect(t).not.toContain('Legal status: CT USA, Inc. is incorporated in New York.');
    const checklist = visible(/<section[^>]*id="checklist"[\s\S]*?<\/section>/.exec(html(GOVERNANCE))?.[0] ?? '');
    expect(checklist).toContain(LINE);
  });
});

test.describe('O3 Aziz Ahmad: no U.S. Senate claim', () => {
  test('"... he has spoken at forums including the European Parliament, Vatican City and events during World Economic Forum week in Davos, on the Future of Work and the Common Good in the Digital Age."', () => {
    const t = main(AZIZ);
    expect(t).toContain('An award-winning entrepreneur, he has spoken at forums including the European Parliament, Vatican City and events during World Economic Forum week in Davos, on the Future of Work and the Common Good in the Digital Age.');
  });

  test('no built page says that Aziz Ahmad spoke at the U.S. Senate ("Senate" is on no page and not in llms.txt)', () => {
    const hits = listPages().filter((p) => /Senate/.test(readFileSync(p.file, 'utf8'))).map((p) => p.route);
    expect(hits).toEqual([]);
    expect(readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8')).not.toMatch(/Senate/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 14 Owner date rule
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const lastUpdated = (rel: string) => /Last updated\s*<time[^>]*datetime="([^"]+)"/.exec(html(rel))?.[1];
const dateModifieds = (rel: string) => [...html(rel).matchAll(/"dateModified":"([^"]+)"/g)].map((m) => m[1]);

test.describe('14 Owner date rule', () => {
  test('the changed pages with their own "Last updated" are 2026-11-02 or later', () => {
    for (const page of [OUTCOMES, EVALUATION, WORK, PLATFORM, TALENTLEAP, SUPERKIDS, GOVERNANCE]) {
      expect((lastUpdated(page) ?? '') >= TODAY, `${page} Last updated ${lastUpdated(page)}`).toBe(true);
    }
  });

  test('the changed pages with an explicit dateModified are 2026-11-02 or later (every dateModified in their JSON-LD)', () => {
    for (const page of [OUTCOMES, EVALUATION, IMPACT, GLOBAL_REACH, ABOUT, WORK, INVESTORS, AZIZ, PLATFORM, TALENTLEAP, KOSOVO, SUPERKIDS, IN_THE_FIELD, GOVERNANCE]) {
      const dates = dateModifieds(page);
      expect(dates.length, `${page} has a dateModified`).toBeGreaterThan(0);
      for (const d of dates) expect(d >= TODAY, `${page} dateModified ${d}`).toBe(true);
    }
  });

  test('Aziz Ahmad’s profile has its own dateModified entry (2026-11-02), not the build date', () => {
    expect(readFileSync('src/pages/about/team/[slug].astro', 'utf8')).toMatch(/'aziz-ahmad': '2026-11-02'/);
  });
});
