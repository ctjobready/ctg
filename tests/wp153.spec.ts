import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP153 (Opus XHigh run 7, kit 120: no Critical, Major or Minor; 5 Polish and the principle challenge; plus the WP152 backlog).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp153.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Principle challenge (accepted): the "(Training of Trainers)" parenthetical may drop from the long facilitator form ("facilitators trained by CodersTrust") when the same or the adjacent card
 *      already names Training of Trainers. Governments does it ("Government Digital Labs" sits beside "Trainers and Curriculum", which names Training of Trainers); the wp147/wp149/wp152 tests allow either form.
 *   2  Development Partners: "existing labs and colleges" is not repeated in the "Existing Labs and Colleges" card body (the lead says it, the card heading names it).
 *   3  Universities and JobReady@Campus: "in parallel with / alongside academic studies" stays where it does work (the hero or lead and the approach line) and goes from the track-record line and the last step.
 *   4  Investors: the planned TalentLEAP levels are stated once ("What JobReady Does"); the Prosper card no longer says it. The thesis band reads problem, problem, answer.
 *   5  NU Post Graduate Diploma (overview and four course pages): the "Ready to Apply?" band has no lead; step 1 "Submit the Application Form." is the instruction.
 *   6  Home: the "Blended Training" card (the first place Home explains delivery) names who teaches, in the long form.
 *   7  Owner date rule: a page with its own "Last updated" or explicit dateModified is 2026-11-02 or later; build-date pages are 2026-11-01 or later (UTC).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);

function allPages(dir: string = DIST_DIR): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? allPages(p) : n === 'index.html' ? [relative(DIST_DIR, p)] : [];
  });
}
const realPages = () => allPages().filter((p) => !/http-equiv="refresh"/.test(html(p)));

const HOME = 'index.html';
const DEV = 'partner-with-us/development-partners/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const UNIVERSITIES = 'partner-with-us/universities/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const NU = 'programs/nu-postgraduate-diploma/index.html';
const NU_COURSES = ['cyber-security', 'data-analytics', 'digital-marketing', 'ict'].map((s) => `programs/nu-postgraduate-diploma/${s}/index.html`);

const LONG = 'facilitators trained by CodersTrust (Training of Trainers)';
const BARE = 'facilitators trained by CodersTrust';
const SHORT_FORM = 'CodersTrust-trained facilitators';
const TOT = 'Training of Trainers';
const TODAY = '2026-11-02';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 1 Principle challenge: the parenthetical may drop when the same or the adjacent card names Training of Trainers
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('1 "(Training of Trainers)" drops from the long facilitator form when the same or the adjacent card names it', () => {
  test('Governments: "Government Digital Labs" says "facilitators trained by CodersTrust"; the adjacent "Trainers and Curriculum" card names Training of Trainers, once in the band', () => {
    const text = main(GOVERNMENTS);
    expect(text).toContain(`How We Reach Them Government Digital Labs Blended learning in government labs you already run, led by ${BARE}; lab access and seats are confirmed per program.`);
    expect(text).not.toContain(LONG);
    expect(count(text, BARE)).toBe(1);
    expect(text).toContain(`What We Deliver Trainers and Curriculum ${TOT}, curriculum and manuals, then preparation for industry certification.`);
    // The four-card delivery band names Training of Trainers once.
    const band = text.slice(text.indexOf('Who We Reach'), text.indexOf('Where They Work'));
    expect(band.length).toBeGreaterThan(200);
    expect(count(band, TOT)).toBe(1);
    expect(count(band, BARE)).toBe(1);
    // The long form is still before any short form, and the funding-ends answer and the "what stays" card keep the short form.
    expect(text.indexOf(SHORT_FORM)).toBeGreaterThan(text.indexOf(BARE));
  });

  test('every page in the audience, program and Our Model sets that has the long form either keeps the parenthetical or sits beside a card that names Training of Trainers', () => {
    const offenders: string[] = [];
    let bare = 0;
    for (const p of realPages().filter((p) => /^partner-with-us\/[^/]+\/index\.html$|^programs\/[^/]+\/index\.html$|^our-model\/index\.html$/.test(p))) {
      const text = main(p);
      const n = count(text, BARE);
      if (n === 0) continue;
      if (n !== 1) offenders.push(`${p}: the facilitator form appears ${n} times`);
      const i = text.indexOf(BARE);
      if (text.startsWith('(Training of Trainers)', i + BARE.length + 1)) continue; // the full long form
      bare++;
      // A bare form needs Training of Trainers within the same sentence or the 300 characters either side (the same or the adjacent card).
      const near = text.slice(Math.max(0, i - 300), i + BARE.length + 300);
      if (!near.includes(TOT)) offenders.push(`${p}: "${BARE}" has no Training of Trainers beside it`);
    }
    expect(offenders).toEqual([]);
    expect(bare).toBeGreaterThanOrEqual(1); // Governments
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 2 Development Partners
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test('2 Development Partners: the "Existing Labs and Colleges" card body does not repeat "existing labs and colleges"', () => {
  const text = main(DEV);
  expect(text).toContain(`How We Reach Them Existing Labs and Colleges Outreach and selection with local partners, then blended delivery by ${LONG}.`);
  expect(text).not.toContain('then blended delivery in existing labs and colleges');
  // The lead says it once and the card heading names it; the body that follows does not say it a third time.
  expect(count(text, /existing labs and colleges/gi)).toBe(2);
  expect(count(text, LONG)).toBe(1);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 3 Universities and JobReady@Campus
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const WITH_STUDIES = /(?:in parallel with|alongside) academic studies/gi;

test.describe('3 "In parallel with / alongside academic studies" stays where it does work', () => {
  test('Universities: the track-record line is the TalentLEAP line only; the approach line and the "In Parallel with the Degree" card keep the idea', () => {
    const text = main(UNIVERSITIES);
    expect(text).toContain('Our TalentLEAP method organizes skills into career paths. How TalentLEAP Works');
    expect(text).not.toContain('JobReady@Campus runs training in parallel with academic studies');
    expect(text).toContain('JobReady@Campus combines training, mentoring and placement support in campus labs alongside academic studies.');
    expect(text).toContain('In Parallel with the Degree Training runs in parallel with academic studies, with professional internships where employer placements are available.');
    expect(count(text, WITH_STUDIES)).toBe(2);
  });

  test('JobReady@Campus: the track-record line is "built on the TalentLEAP model" and the last step is "The first cohort begins in your campus labs."; the hero and the approach line keep the idea', () => {
    const text = main(CAMPUS);
    expect(text).toContain('JobReady@Campus is built on the TalentLEAP model. How TalentLEAP Works');
    expect(text).not.toContain('JobReady@Campus runs training in parallel with academic studies');
    expect(text).toContain('The first cohort begins in your campus labs.');
    expect(text).not.toContain('Training runs in parallel with academic studies.');
    expect(text).toContain('Run mentored, certification-focused training in your campus labs alongside academic studies.');
    expect(text).toContain('JobReady@Campus combines certification exam preparation, mentoring and placement support in campus labs alongside academic studies.');
    expect(count(text, WITH_STUDIES)).toBe(2);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 4 Investors
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('4 Investors', () => {
  test('the planned TalentLEAP levels are stated once, in "What JobReady Does"; the Prosper card is "TalentLEAP career paths and continuing development."', () => {
    const text = main(INVESTORS);
    expect(text).toContain('Prosper Career Paths and Continuing Development TalentLEAP career paths and continuing development.');
    expect(text).not.toContain('progressive levels are planned beyond the first published level');
    expect(text).toContain('The first published TalentLEAP level is Competent; Proficient and Expert levels are planned.');
    expect(count(text, /Proficient and Expert/g)).toBe(1);
    expect(count(text, /\blevels are planned\b/gi)).toBe(1);
    expect(count(text, /progressive levels/gi)).toBe(0);
  });

  test('the thesis band reads problem, problem, answer: the JobReady answer card follows the two demand facts', () => {
    const raw = html(INVESTORS);
    const band = /<section[^>]*id="thesis"[\s\S]*?<\/section>/.exec(raw)?.[0] ?? '';
    const titles = [...band.matchAll(/<h3 class="card__title"[^>]*>([^<]+)<\/h3>/g)].map((m) => decode(m[1]));
    expect(titles).toEqual(['Young People Need Work and Employers Need Skills', 'AI Skills Are in Rising Demand', 'Connect Learning to Paid Work']);
    const text = visible(band);
    expect(text).toContain('JobReady is being built to link learners to paid work through mentoring and placement support.');
    expect(text.indexOf('AI Skills Are in Rising Demand')).toBeLessThan(text.indexOf('Connect Learning to Paid Work'));
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 5 NU Post Graduate Diploma: the "Ready to Apply?" band has no lead
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('5 NU Post Graduate Diploma: "Ready to Apply?" has no lead repeating step 1', () => {
  for (const p of [NU, ...NU_COURSES]) {
    test(p.replace('/index.html', ''), () => {
      const raw = html(p);
      const band = /<section[^>]*id="cta"[\s\S]*?<\/section>/.exec(raw)?.[0] ?? '';
      expect(band).toContain('Ready to Apply?');
      expect(band).not.toContain('cta-band__text');
      const text = main(p);
      expect(text).not.toContain('Ready to Apply? Submit the application form.');
      // The instruction is said once, as step 1; step 2 carries the admissions sentence.
      expect(count(text, /Submit the application form/i)).toBe(1);
      expect(text).toContain('Submit the Application Form. It takes you to the standalone application form.');
      expect(text).toContain('Admissions Contacts You. Our admissions team shares the next steps.');
      expect(visible(band).startsWith('Ready to Apply? Apply Now')).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 6 Home
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test('6 Home: the "Blended Training" card (Home’s first explanation of delivery) names who teaches, in the long form, once', () => {
  const text = main(HOME);
  expect(text).toContain(`How We Reach Them Blended Training Labs, colleges and delivery that works where connectivity is limited, led by ${LONG}.`);
  expect(count(text, LONG)).toBe(1);
  expect(count(text, SHORT_FORM)).toBe(0);
  // It is Home’s first delivery explanation: no earlier block names labs, colleges or blended delivery.
  const first = text.search(/\bblended\b|\b(?:existing|government|campus|on-campus|local) labs?\b|\blabs?,? (?:and )?colleges\b/i);
  expect(first).toBeGreaterThan(-1);
  expect(first).toBeLessThan(text.indexOf(LONG));
  expect(text.slice(0, text.indexOf('Blended Training'))).not.toMatch(/\bblended\b|\blabs?,? (?:and )?colleges\b/i);
  // No built Home file says "local" or "certified" facilitators.
  expect(text).not.toMatch(/\bcertified[ -]+(?:local )?facilitators?\b|\blocal[ ,-]+(?:\w+ )?facilitators?\b/i);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 7 Owner date rule
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('7 Owner date rule (2026-11-02 or later where the page states a date of its own)', () => {
  const stamp = (rel: string) => /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(rel))?.[1];
  const modified = (rel: string) => [...html(rel).matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);

  test('NU overview, NU course pages and JobReady@Campus (own "Last updated") read 2026-11-02 or later, as does their dateModified', () => {
    for (const p of [NU, ...NU_COURSES, CAMPUS]) {
      expect(stamp(p), `${p} Last updated`).toBeTruthy();
      expect((stamp(p) ?? '') >= TODAY, `${p} Last updated ${stamp(p)}`).toBe(true);
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= TODAY, `${p} dateModified ${d}`).toBe(true);
    }
  });

  test('Governments and Investors (explicit dateModified) read 2026-11-02 or later', () => {
    for (const p of [GOVERNMENTS, INVESTORS]) {
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= TODAY, `${p} dateModified ${d}`).toBe(true);
    }
  });

  test('Home, Development Partners and Universities state no date of their own: their dateModified is the build date (UTC), 2026-11-01 or later', () => {
    for (const p of [HOME, DEV, UNIVERSITIES]) {
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= '2026-11-01', `${p} dateModified ${d}`).toBe(true);
    }
  });
});
