import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP155 (Opus Max run 2, kit 122: 12 Polish items before Perplexity cycle 45).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp155.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  YouthWIDE "One Delivery Model" band: the statement no longer says "in existing labs and colleges"; the "How We Reach Them" card says it once and names who teaches (WP152: "CodersTrust-trained facilitators",
 *      the page's long form is in the Delivery row of the decision summary above the band).
 *   2  Investors: the National University line is two sentences (SC-04 split at its semicolon, wording register-exact), none over 30 words.
 *   3  Investors: the national-scale answer does not restate Her Power's counts (the 25,125 and the 2,400 are stated in the contract-scope tile and in the reach reconciliation); it says CodersTrust trained women directly and
 *      the national program met its target, "figures above".
 *   4  Universities "How It Works": the statement does not repeat "alongside academic studies" (the H2 and the "In Parallel with the Degree" card state it); YouthWIDE's statement drops "in existing labs and colleges"
 *      (row 1); the card holds the fact.
 *   5  Development Partners: the statement ends at "monthly reports" (the "Where They Work" card has the outcome tracking); Governments: the "Where They Work" card does not repeat the reports (the statement has them).
 *   6  Governance: the hero says what is confirmed in co-design (not the entities, which the Contracting Entities card names); "How Outcome Records Are Used" does not promise monthly reports a second time.
 *   7  YouthWIDE: the closing "Governments. ... we start with a briefing." line is gone; the page's one request for two suitable times (Funders) stays.
 *   8  Employers: the pilot band's lead states the measures once ("Success measures cover ..."); "agreed before you start" is in the Needs Assessment First card, the evaluation in the Progress Evaluation card.
 *   9  Universities FAQ "Will This Work in Our Country?": both employer demand and the campus labs are tested/checked.
 *  10  TalentLEAP FAQ: "How Is a Supported Cohort Different from a Self-Paced Course?" (CodersTrust runs a course storefront itself).
 *  11  Local Partners: the "Mentoring and Placement Support" card does not add "your organization does not have to build alone".
 *  12  About timeline: "A Rockefeller Foundation grant supports ..." (the timeline is in the historic present).
 *  13  Owner date rule: a page with its own "Last updated" or explicit dateModified is today (2026-11-02) or later; build-date pages are on or after 2026-11-01 (UTC).
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
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean);

const HOME = 'index.html';
const ABOUT = 'about/index.html';
const GOVERNANCE = 'about/governance/index.html';
const DEV = 'partner-with-us/development-partners/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const UNIVERSITIES = 'partner-with-us/universities/index.html';
const EMPLOYERS = 'partner-with-us/employers/index.html';
const LOCAL = 'partner-with-us/local-partners/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const TALENTLEAP = 'our-model/talentleap/index.html';
const OUR_MODEL = 'our-model/index.html';

const TODAY = '2026-11-02';
const BUILD_FLOOR = '2026-11-01';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 1 YouthWIDE "One Delivery Model, from Selection to Paid Work"
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('1 YouthWIDE how-it-works band: the delivery place is said once, with who teaches', () => {
  const band = () => between(main(YOUTHWIDE), 'One Delivery Model, from Selection to Paid Work', 'For Governments and Ministries');

  test('the statement drops "in existing labs and colleges"; the "How We Reach Them" card says it once and names the CodersTrust-trained facilitators', () => {
    const b = band();
    expect(b).toContain('Our Approach YouthWIDE combines training, mentoring and placement support. Partners receive monthly reports on progress toward paid work. 1 Who We Reach');
    expect(b).toContain('2 How We Reach Them Accessible Selection, Blended Delivery Outreach and an accessible readiness assessment, then blended training in existing labs and colleges, led by CodersTrust-trained facilitators. 3 What We Deliver');
    expect(count(b, 'existing labs and colleges')).toBe(1);
    expect(count(b, 'CodersTrust-trained facilitators')).toBe(1);
  });

  test('WP152 order: the long form (the Delivery row above) comes first and is on the page once; the band uses the short form after it', () => {
    const t = main(YOUTHWIDE);
    expect(count(t, 'facilitators trained by CodersTrust')).toBe(1);
    expect(t.indexOf('CodersTrust-trained facilitators')).toBeGreaterThan(t.indexOf('facilitators trained by CodersTrust (Training of Trainers)'));
    expect(t).not.toContain('Outreach and an accessible readiness assessment, then training in existing labs and colleges.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 2 Investors: the National University line
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('2 Investors: the National University line is two sentences, wording register-exact', () => {
  const NU1 = 'Not counted in the delivered reach: 1.5M+ National University learners being onboarded (the university’s own learners, not learners trained by CodersTrust).';
  const NU2 = 'CodersTrust has been NU’s official training partner for digital career skills and credentials since 2023 and delivers NU Post Graduate Diploma courses.';

  test('two sentences after the contract-scope tile, each 30 words or fewer, with no semicolon', () => {
    const t = main(INVESTORS);
    expect(t).toContain(`${NU1} ${NU2}`);
    const para = `${NU1} ${NU2}`;
    expect(sentences(para)).toHaveLength(2);
    for (const s of sentences(para)) expect(words(s), s).toBeLessThanOrEqual(30);
    expect(para).not.toContain(';');
    expect(t).not.toContain('Separately, and not counted in the delivered reach');
    expect(t).not.toContain('CodersTrust); CodersTrust has been NU');
  });

  test('keeps every fact: 1.5M+ learners being onboarded, not trained by CodersTrust, not delivered reach; the 2023 partnership; the diploma courses', () => {
    const t = main(INVESTORS);
    expect(count(t, '1.5M+ National University learners being onboarded')).toBe(1);
    expect(count(t, 'not learners trained by CodersTrust')).toBe(1);
    expect(count(t, 'since 2023 and delivers NU Post Graduate Diploma courses')).toBe(1);
    // The paragraph still rests on SC-04 (the register text is unchanged; the page splits it at its semicolon).
    expect(mainRaw(INVESTORS)).toMatch(/<p[^>]*data-fact="SC-04"[^>]*>[^<]*Not counted in the delivered reach/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 3 Investors: Her Power's counts are not stated a third time
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('3 Investors: the national-scale answer does not restate Her Power’s counts', () => {
  const ANSWER =
    'In Her Power, a national program of the Department of ICT (DoICT), under the ICT Division, CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained women directly; the national program met its target (figures above). We scale in phases:';

  test('the answer says what CodersTrust did and that the national program met its target, "figures above", with neither count', () => {
    const t = main(INVESTORS);
    const answer = between(t, 'Can You Deliver at National Scale?', 'Next Steps');
    expect(answer).toContain(ANSWER);
    expect(answer).not.toMatch(/25,125|2,400|130 sub-districts/);
    // The same answer is in the page's FAQ structured data.
    expect(decode(html(INVESTORS))).toContain(ANSWER);
  });

  test('the counts are stated twice on the page: the contract-scope tile (with who trained whom) and the reach reconciliation', () => {
    const t = main(INVESTORS);
    expect(t).toContain('it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).');
    expect(t).toContain('Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125.');
    expect(count(t, '2,400')).toBe(2);
    expect(count(t, 'trained 25,125 women')).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 4 and 5 Universities, Development Partners and Governments: each fact once per how-it-works band
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('4 Universities "JobReady@Campus: Training Alongside the Degree"', () => {
  test('the statement does not say "alongside academic studies" again; the card states the timing once', () => {
    const band = between(main(UNIVERSITIES), 'JobReady@Campus: Training Alongside the Degree', 'About JobReady@Campus');
    expect(band).toContain('Our Approach JobReady@Campus combines training, mentoring and placement support in campus labs. Your institution receives monthly reports on progress toward paid work. 1 Set Up');
    expect(band).toContain('4 Alongside Studies In Parallel with the Degree Training runs in parallel with academic studies, with professional internships where employer placements are available.');
    expect(count(band, 'academic studies')).toBe(1);
    expect(band).not.toContain('alongside academic studies');
  });
});

test.describe('5 Development Partners and Governments: the lead does not repeat the last card', () => {
  test('Development Partners: "We combine training, mentoring and placement support. Partners receive monthly reports."; the card keeps the outcome tracking', () => {
    const band = between(main(DEV), 'An Integrated Path from Training to Earnings', 'Learn. Earn. Prosper.');
    expect(band).toContain('Our Approach We combine training, mentoring and placement support. Partners receive monthly reports. YouthWIDE is the program through which funders deploy');
    expect(band).toContain('4 Where They Work Local, Remote and Global Work Placement support, then outcome tracking for 12 months after each course.');
    expect(count(band, /outcome|tracked/gi)).toBe(1);
    expect(band).not.toContain('outcomes are tracked after each course');
  });

  test('Governments: the card gives the placement support and the follow-up surveys; the monthly reports are in the statement only', () => {
    const band = between(main(GOVERNMENTS), 'A National Delivery Model, Built on Labs That Already Exist', 'Learn. Earn. Prosper.');
    expect(band).toContain('Our Approach We combine training, mentoring and placement support. Your agency receives monthly reports on progress toward paid work.');
    expect(band).toContain('4 Where They Work Local, Remote and Global Work Placement support, then follow-up surveys at 3, 6 and 12 months after each course.');
    expect(count(band, 'monthly reports')).toBe(1);
    expect(band).not.toContain('Placement support into local, remote and global work');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 6 Governance
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('6 Governance: the hero and the cards do not repeat each other', () => {
  test('the hero says what is confirmed in co-design; the Contracting Entities card names the entities once', () => {
    const t = main(GOVERNANCE);
    expect(t).toContain('The contracting entity, legal status and due-diligence arrangements for each program are confirmed with the funder during co-design.');
    const entities = 'CT USA, Inc. in the United States or CodersTrust Bangladesh Ltd. in Bangladesh';
    expect(count(t, entities)).toBe(1);
    expect(t).toContain(`Contracting Entities ${entities}. The entity that contracts depends on the program’s country and the funder’s requirements.`);
    expect(count(t, 'depends on the program’s country')).toBe(1);
    expect(t).not.toContain('CodersTrust contracts through');
  });

  test('"How Outcome Records Are Used" does not promise monthly reports; the Independent Evaluation band says it once', () => {
    const t = main(GOVERNANCE);
    expect(t).toContain('How Outcome Records Are Used Follow-up survey results are checked against documentary evidence where available, and outcome data shared with funders has personal details protected.');
    expect(t).not.toContain('Funders receive monthly reports and outcome data');
    expect(count(t, 'Funders receive monthly reports')).toBe(1);
    expect(t).toContain('Funders receive monthly reports from the first cohort.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 7 YouthWIDE closing lines
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('7 YouthWIDE: the page closes on one request', () => {
  test('the Governments closing line is gone (Step 1 and the entry card say it); the Funders line keeps the page’s one request for two suitable times', () => {
    const t = main(YOUTHWIDE);
    expect(t).not.toContain('Governments. Your agency’s procurement timeline sets the pace; we start with a briefing.');
    expect(t).not.toContain('procurement timeline sets the pace');
    expect(t).toContain('Public procurement follows the agency’s own timeline, so we start with a briefing that fits it.');
    expect(t).toContain('Governments start with a briefing; funders start with a discovery session.');
    expect(t).toContain('Step 5: Monthly Reports Reports are designed to show enrollment, completion, certification, placement and first earnings. Funders. In your inquiry, include two suitable times for a discovery session.');
    expect(count(t, 'suitable times')).toBe(1);
    expect(count(t, /start with a briefing/gi)).toBe(3); // the entry-card heading, its sentence and Step 1 (it was four with the closing line)
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 8 Employers
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('8 Employers: the success measures are promised once', () => {
  test('the pilot band lead lists the measures; "agreed before you start" stays in the Needs Assessment First card, the check in the Progress Evaluation card', () => {
    const t = main(EMPLOYERS);
    expect(t).toContain('Start with a Pilot Team, Then Decide on Evidence Success measures cover completion, any certification the track offers and the role-specific skills you prioritize. Pilot Team First');
    expect(t).toContain('A needs assessment scopes the skills and team size, and success measures are agreed before you start.');
    expect(t).toContain('Progress Evaluation A progress evaluation checks results against the measures you set.');
    expect(count(t, 'agreed before you start')).toBe(1);
    expect(t).not.toContain('Success measures are agreed before you start (completion');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 9 Universities FAQ
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('9 Universities FAQ "Will This Work in Our Country?"', () => {
  const FIRST = 'We first test local employer demand for your students’ skills and check your campus labs, then choose each country’s tracks with local partners.';
  test('the answer tests the demand and checks the labs, in that order, then chooses the tracks', () => {
    const t = main(UNIVERSITIES);
    expect(t).toContain(`Will This Work in Our Country? ${FIRST} Our outcome evidence comes mainly from Bangladesh`);
    expect(t).not.toContain('and your campus labs first');
    expect(decode(html(UNIVERSITIES))).toContain(FIRST);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 10 TalentLEAP FAQ heading
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('10 TalentLEAP FAQ: compares a supported cohort with a self-paced course, not CodersTrust with "an online course platform"', () => {
  const Q = 'How Is a Supported Cohort Different from a Self-Paced Course?';
  test('the heading and the structured-data question are reworded; the answer is unchanged', () => {
    const t = main(TALENTLEAP);
    expect(t).toContain(`${Q} Compared with a self-paced course alone, every supported TalentLEAP cohort pairs 100 training hours per certification`);
    expect(t).not.toContain('Online Course Platform');
    const raw = decode(html(TALENTLEAP));
    expect(raw).toContain(`"name":"${Q}"`);
    expect(raw).not.toContain('Online Course Platform');
  });

  test('the old heading is on no page', () => {
    for (const p of [HOME, OUR_MODEL, 'partner-with-us/index.html', 'partner-with-us/foundations/index.html', 'programs/index.html', TALENTLEAP]) {
      expect(html(p), p).not.toContain('Online Course Platform');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 11 Local Partners
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('11 Local Partners: "build alone" is said once, not twice', () => {
  test('the Mentoring and Placement Support card ends at "a route into work"', () => {
    const t = main(LOCAL);
    expect(t).toContain('Mentoring and Placement Support Three months of milestone-based mentoring, with placement support alongside, gives your completers a route into work. Monthly Reports and Program Updates');
    expect(t).toContain('You do not have to build the curriculum or certification route yourself.');
    expect(t).not.toContain('does not have to build alone');
    expect(count(t, 'build alone')).toBe(1); // the challenge lead ("hard to build alone"); the curriculum card says it without "alone"
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 12 About timeline
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('12 About timeline: the historic present throughout', () => {
  test('"A Rockefeller Foundation grant supports a CodersTrust feasibility study in Kenya and Nigeria."', () => {
    const t = main(ABOUT);
    expect(t).toContain('2015–2016 Rockefeller Foundation Grant A Rockefeller Foundation grant supports a CodersTrust feasibility study in Kenya and Nigeria. 2018–2021');
    expect(t).not.toContain('grant supported a CodersTrust feasibility study');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 13 Owner date rule
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const lastUpdated = (rel: string) => /Last updated\s*<time[^>]*datetime="([^"]+)"/.exec(html(rel))?.[1];
const dateModified = (rel: string) => /"dateModified":"([^"]+)"/.exec(html(rel))?.[1];

test.describe('13 Owner date rule', () => {
  test('pages with their own "Last updated" or explicit dateModified are 2026-11-02 or later (Governance moves; the others were already today)', () => {
    for (const page of [GOVERNANCE, YOUTHWIDE, TALENTLEAP]) {
      expect((lastUpdated(page) ?? '') >= TODAY, `${page} Last updated ${lastUpdated(page)}`).toBe(true);
      expect((dateModified(page) ?? '') >= TODAY, `${page} dateModified ${dateModified(page)}`).toBe(true);
    }
    for (const page of [ABOUT, GOVERNMENTS, INVESTORS]) {
      expect((dateModified(page) ?? '') >= TODAY, `${page} dateModified ${dateModified(page)}`).toBe(true);
    }
  });

  test('build-date pages (Development Partners, Universities, Employers, Local Partners) are on or after 2026-11-01 (UTC build date)', () => {
    for (const page of [DEV, UNIVERSITIES, EMPLOYERS, LOCAL]) {
      expect((dateModified(page) ?? '') >= BUILD_FLOOR, `${page} dateModified ${dateModified(page)}`).toBe(true);
    }
  });
});
