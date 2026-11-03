import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP151 (Opus XHigh run 5, kit 118: 1 Minor, 7 Polish, plus the open JobReady@Campus eyebrow).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp151.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Minor: JobReady@Campus' How It Works "On-Campus Labs" card is the page's delivery sentence and names "facilitators trained by CodersTrust (Training of Trainers)" (as the Universities card does);
 *      the "Illustrative" band's Capacity card says "CodersTrust-trained facilitators" (wp149 holds the card-level facilitator rule for every program and route page).
 *   2  The WP150 sweep also covers card labels and eyebrows ("Training and Certification" is "Training and Certification Preparation"; Local Partners' first pain names "Certification Preparation") and every
 *      "N training hours" sentence (Our Model: "Each certification track includes 100 training hours, including exam preparation, over 3–6 months."). The sweep itself is in wp150 (section 7).
 *   3  Repetition, once each: YouthWIDE's briefing-or-discovery routing (the "Choose Your Entry Point" lead is gone); Investors' pre-launch status (the "Not a Fit Yet" clause is gone); NU's "admissions contacts you" (the FAQ "How Do I Apply?" is gone).
 *   4  Investors "Connect Learning to Paid Work": "JobReady is being built to connect learning to paid work, through mentoring and placement support."
 *   5  The six route pages label the learner card "Individual Story" (the defined evidence tag), not "Individual Learner Story".
 *   6  Owner date rule: a page with its own "Last updated" or explicit dateModified moves to 2026-11-02 when its visible text changes (Campus, YouthWIDE, NU overview, Governments, Foundations, Investors);
 *      pages with no date of their own carry the build date (UTC, so 2026-11-01 or later).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);

const CAMPUS = 'programs/jobready-campus/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const NU = 'programs/nu-postgraduate-diploma/index.html';
const OUR_MODEL = 'our-model/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const FOUNDATIONS = 'partner-with-us/foundations/index.html';
const LOCAL = 'partner-with-us/local-partners/index.html';
const ROUTES = ['development-partners', 'governments', 'foundations', 'universities', 'employers', 'local-partners'].map((r) => `partner-with-us/${r}/index.html`);

const LONG = 'facilitators trained by CodersTrust (Training of Trainers)';
const SHORT = 'CodersTrust-trained facilitators';
const TODAY = '2026-11-02';

test.describe('1 JobReady@Campus: the How It Works card says who teaches', () => {
  test('"On-Campus Labs" names the facilitators trained by CodersTrust and the faculty coordinators', () => {
    const text = main(CAMPUS);
    expect(text).toContain(`Where On-Campus Labs Labs serve as blended-learning centers, with ${LONG} and faculty members as coordinators.`);
    expect(text).not.toContain('Labs serve as blended-learning centers, with faculty members as coordinators.');
  });

  test('the "Illustrative" band’s Capacity card says "CodersTrust-trained facilitators"; the long form is once on the page', () => {
    const text = main(CAMPUS);
    expect(text).toContain('Capacity Designed to Stay on Campus Campus labs keep working as blended-learning centers, with CodersTrust-trained facilitators.');
    expect(text).not.toContain('Campus labs work as blended-learning centers');
    expect(count(text, LONG)).toBe(1);
    expect(count(text, SHORT)).toBe(1);
  });
});

test.describe('2 Labels and training hours (the sweep itself is in wp150, section 7)', () => {
  test('Our Model states the hours with exam preparation inside them', () => {
    const text = main(OUR_MODEL);
    expect(text).toContain('Blended Training and Certification Preparation Each certification track has 100 training hours, including exam preparation, over 3–6 months.'); // WP152: "has" (it read "includes 100 training hours, including")
    expect(text).not.toContain('100 training hours over 3–6 months');
  });

  test('JobReady@Campus glance row: "Training and Certification Preparation"', () => {
    const text = main(CAMPUS);
    expect(text).toContain(
      'Training and Certification Preparation 100 training hours per certification, including certification exam preparation, then three months of milestone-based mentoring; exam fees, eligibility, attempts and retakes are set per program.',
    );
    expect(text).not.toContain('Training and Certification 100 training hours');
  });

  test('Local Partners’ first pain: "Curriculum and Certification Preparation Take Time to Build", body unchanged', () => {
    const text = main(LOCAL);
    expect(text).toContain('Curriculum and Certification Preparation Take Time to Build A ready curriculum, trained facilitators and a route to industry certification take time and specialist support to build.');
    expect(text).not.toContain('Curriculum and Certification Take Time to Build');
  });
});

test.describe('3 Repetition: said once', () => {
  test('YouthWIDE: "Choose Your Entry Point" has no lead; the briefing-or-discovery routing is said once, in What Happens Next', () => {
    const text = main(YOUTHWIDE);
    expect(text).toContain('Get Started Choose Your Entry Point Funders: Talk to Us About a First Cohort');
    expect(text).not.toContain('Funders start with a discovery session. Governments start with a briefing that fits the agency’s timeline.');
    expect(count(text, /start with a discovery session/i)).toBe(1);
    expect(count(text, 'Governments start with a briefing')).toBe(1);
    // The two H3s, the procurement sentence, the step and the two closing lines stay.
    for (const s of [
      'Funders: Talk to Us About a First Cohort',
      'Governments: Start with a Briefing',
      'Public procurement follows the agency’s own timeline, so we start with a briefing that fits it.',
      'Step 1: Briefing or Discovery Governments start with a briefing; funders start with a discovery session.',
      // WP155 (Polish 7): the Governments closing line ("Your agency’s procurement timeline sets the pace; we start with a briefing.") is gone.
      'Funders. In your inquiry, include two suitable times for a discovery session.',
    ]) {
      expect(text, s).toContain(s);
    }
  });

  test('Investors: "Not a Fit Yet" no longer restates the pre-launch status (the hero and the "What JobReady Does" tile state it)', () => {
    const text = main(INVESTORS);
    expect(text).toContain('Not a Fit Yet Investors who need a finished marketplace now.');
    expect(text).not.toContain('finished marketplace now:');
    // The hero lead and the status tile ("Connect to Paid Work") are the only two statements of the status; the FAQ points to the tiles.
    expect(count(text, 'the gig-work marketplace are in pre-launch')).toBe(2);
  });

  test('NU Post Graduate Diploma: the FAQ "How Do I Apply?" is gone; the "Ready to Apply?" band keeps the instruction', () => {
    const text = main(NU);
    expect(text).not.toContain('How Do I Apply?');
    expect(text).not.toContain('Our admissions team contacts you with the next steps.');
    // WP152: the lead is "Submit the application form." and the "Admissions Contacts You" step carries the admissions sentence.
    expect(count(text, /Our admissions team (?:will )?contacts? you/)).toBe(0);
    expect(text).not.toContain('Ready to Apply? Submit the application form.'); // WP153: the band has no lead (step 1 is the instruction)
    expect(text).toContain('Register Your Interest. The Apply Now button opens a short form asking for your name, contact details and course.'); // WP161 (A-34): the form registers interest (it said "Submit the Application Form. The Apply Now button opens the standalone application form.")
    expect(text).toContain('Admissions Contacts You. Our admissions team shares the application steps.'); // WP161 (A-34): it said "shares the next steps"
    // The other two FAQ questions stay, and the FAQ structured data matches the visible questions.
    expect(text).toContain('Is the NU Post Graduate Diploma Right for Me?');
    expect(text).toContain('Where Do I Find Eligibility, Schedule and Fees?');
    expect(html(NU)).not.toMatch(/"name":"How Do I Apply\?"/);
  });
});

test('4 Investors, "Connect Learning to Paid Work": the body says paid work', () => {
  const text = main(INVESTORS);
  expect(text).toContain('Connect Learning to Paid Work JobReady is being built to link learners to paid work through mentoring and placement support.'); // WP152: no heading echo, no comma before "through"
  expect(text).not.toContain('connect learning with mentoring and placement support');
});

test.describe('5 The learner card on the six route pages is labelled "Individual Story"', () => {
  for (const rel of ROUTES) {
    test(`${rel.split('/')[1]}: the card’s label is "Individual Story"`, () => {
      const section = /<section[^>]*id="learner-voice"[\s\S]*?<\/section>/.exec(html(rel))?.[0] ?? '';
      expect(section, 'learner voice section').not.toBe('');
      expect(/<p class="eyebrow"[^>]*>\s*([^<]*?)\s*<\/p>/.exec(section)?.[1]).toBe('Individual Story');
      expect(main(rel)).not.toContain('Individual Learner Story');
    });
  }

  test('no page prints "Individual Learner Story" as visible text', () => {
    for (const rel of [...ROUTES, 'impact/index.html', 'impact/stories/index.html']) expect(main(rel), rel).not.toContain('Individual Learner Story');
  });
});

test.describe('6 Owner date rule (on or after 2026-11-02)', () => {
  const stamp = (rel: string) => /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(rel))?.[1];
  const modified = (rel: string) => [...html(rel).matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);

  test('JobReady@Campus, YouthWIDE and the NU overview (own "Last updated") read 2026-11-02 or later', () => {
    for (const p of [CAMPUS, YOUTHWIDE, NU]) {
      expect(stamp(p), `${p} Last updated`).toBeTruthy();
      expect((stamp(p) ?? '') >= TODAY, `${p} Last updated ${stamp(p)}`).toBe(true);
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= TODAY, `${p} dateModified ${d}`).toBe(true);
    }
  });

  test('Governments, Foundations and Investors (explicit dateModified) read 2026-11-02 or later', () => {
    for (const p of [GOVERNMENTS, FOUNDATIONS, INVESTORS]) {
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= TODAY, `${p} dateModified ${d}`).toBe(true);
    }
  });

  test('the other changed pages state no date of their own: their dateModified is the build date (UTC), 2026-11-01 or later', () => {
    for (const p of [OUR_MODEL, LOCAL, ...ROUTES]) {
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= '2026-11-01', `${p} dateModified ${d}`).toBe(true);
    }
  });
});
