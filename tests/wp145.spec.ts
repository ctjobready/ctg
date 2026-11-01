import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP145 (Opus High run 20, kit 112).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp145.spec.ts --project=chromium`.
 *   - Minor 1: Employers and JobReady@Work say certification preparation "can be added where a track offers one" (their cost answers say it is scoped separately).
 *   - Polish 2: YouthWIDE, JobReady@Campus and TalentLEAP state the exam-terms qualifier once beyond the scope sentence, and each page keeps a referent for "exam terms".
 *   - Polish 3: Investors' Learn card and the JobReady Platform four-jobs sentence say "where a track offers one".
 *   - Polish 4: Option 3 "National Design Option" reads as on Home on all five pages that show it (duration "3–5 years", the Home note).
 *   - Polish 5: the Partner with Us hub's scope sentence closes the "What Does It Cost?" answer (and stays out of the FAQ JSON-LD).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);

const EMPLOYERS = 'partner-with-us/employers/index.html';
const WORK = 'programs/jobready-work/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const TALENTLEAP = 'our-model/talentleap/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const PLATFORM = 'our-model/jobready-platform/index.html';
const HUB = 'partner-with-us/index.html';

test.describe('Minor 1: certification preparation is an add-on where a track offers one (the cost answers already say it is scoped separately)', () => {
  const COST = 'certification exam preparation and talent sourcing are scoped separately where needed';
  test('Employers "Deliver" card', () => {
    const text = main(EMPLOYERS);
    expect(text).toContain('Soft-skills and hard-skills tracks; preparation for an industry certification can be added where a track offers one.');
    expect(text).not.toContain('including preparation for an industry certification where a track offers one');
    expect(text).toContain(COST);
  });
  test('JobReady@Work glance "Training" line', () => {
    const text = main(WORK);
    expect(text).toContain('Certification preparation can be added where a track offers one, with exam eligibility and attempts set per program.');
    expect(text).not.toContain('Certification preparation where a track offers one');
    expect(text).toContain(COST);
  });
});

test.describe('Polish 2: the exam-terms qualifier is stated once per page beyond the scope sentence', () => {
  // Any statement of the exam terms: "exam fees … set per program", "exam eligibility … set per program", "eligibility, attempts and retakes … set per program".
  const QUALIFIER = /\b(?:exam fees|exam eligibility|eligibility, attempts)\b[^.;]*?\bset per program\b/g;

  test('YouthWIDE "What We Deliver" drops its second statement and keeps the glance as the referent', () => {
    const text = main(YOUTHWIDE);
    expect(text).toContain('Certification exam preparation by track, then three months of milestone-based mentoring.');
    expect(text).not.toContain('then three months of milestone-based mentoring; exam eligibility and attempts are set per program');
    expect(count(text, QUALIFIER), 'exam-terms statements').toBe(1);
    expect(text).toContain('exam fees and attempts set per program');
  });

  test('JobReady@Campus certification card drops its second statement and keeps the glance as the referent', () => {
    const text = main(CAMPUS);
    expect(text).toContain('Students who pass the exam add an industry certification beside their degree. Certification is not guaranteed.');
    expect(text).not.toContain('Certification is not guaranteed; eligibility, attempts and retakes are set per program');
    expect(count(text, QUALIFIER), 'exam-terms statements').toBe(1);
    expect(text).toContain('exam fees, eligibility, attempts and retakes are set per program');
  });

  test('TalentLEAP FAQ drops its second statement (page and FAQ JSON-LD), the Step 3 pipeline keeps the referent', () => {
    const raw = html(TALENTLEAP);
    const text = main(TALENTLEAP);
    const answer = 'Every supported TalentLEAP cohort pairs 100 training hours per certification, including certification exam preparation, with three months of milestone-based mentoring, placement support and outcome tracking for 12 months after each course.';
    expect(text).toContain(answer);
    expect(text).not.toContain('including certification exam preparation (exam fees and attempts set per program), with three months');
    expect(count(text, QUALIFIER), 'exam-terms statements').toBe(1);
    expect(text).toContain('exam fees and attempts set per program');
    const ld = [...raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => decode(m[1])).join('\n');
    expect(ld).toContain(answer);
    expect(ld).not.toContain('including certification exam preparation (exam fees and attempts set per program), with three months');
  });
});

test.describe('Polish 3: platform pages apply "where a track offers one"', () => {
  test('Investors Learn card', () => {
    const text = main(INVESTORS);
    expect(text).toContain('AI-ready digital skills, with preparation for industry certification where a track offers one.');
    expect(text).not.toContain('AI-ready digital skills, with preparation for industry certification.');
  });
  test('JobReady Platform four-jobs sentence', () => {
    const text = main(PLATFORM);
    expect(text).toContain('train youth through courses, including preparation for industry certification where a track offers one; connect learners to local, remote and global work; supply employers with job-ready talent; and give institutions a digital delivery platform.');
    expect(text).not.toContain('courses that prepare for industry certification');
  });
});

test.describe('Polish 4: Option 3 "National Design Option" reads the same on all five pages', () => {
  const CARD = /National Design Option\s+100,000\+ trainees\s+3–5 years\s+A design option we plan phase by phase; not yet delivered at this size\./;
  for (const [label, rel] of [
    ['Home', 'index.html'],
    ['YouthWIDE', YOUTHWIDE],
    ['Development Partners', 'partner-with-us/development-partners/index.html'],
    ['Governments', 'partner-with-us/governments/index.html'],
    ['Foundations', 'partner-with-us/foundations/index.html'],
  ] as const) {
    test(`${label}: duration "3–5 years" and the Home note`, () => {
      const text = main(rel);
      expect(text).toMatch(CARD);
      expect(text).not.toContain('(a design option — not yet delivered at this size)');
      expect(text).not.toContain('A multi-year national program with government and partners.');
    });
  }
});

test.describe('Polish 5: the hub scope sentence closes the "What Does It Cost?" answer', () => {
  const SCOPE = 'Inclusions, exam terms and reporting on this page are agreed in the program scope.';
  const ANSWER_END = 'Devices, stipends, connectivity and independent evaluation are budgeted separately where needed.';
  test('the sentence follows the cost answer inside the same accordion paragraph, once on the page', () => {
    const raw = html(HUB);
    expect(count(main(HUB), SCOPE)).toBe(1);
    expect(raw).toMatch(new RegExp(`<p data-fact="PD-02 PD-02a">[^<]*${ANSWER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ${SCOPE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</p>`));
  });
  test('the Due Diligence band no longer carries it, and the FAQ JSON-LD stays the plain answer', () => {
    const raw = html(HUB);
    const band = /id="due-diligence"[\s\S]*?<\/section>/.exec(raw)?.[0] ?? '';
    expect(band.length).toBeGreaterThan(200);
    expect(visible(band)).not.toContain('agreed in the program scope');
    const ld = [...raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
    expect(ld).not.toContain('agreed in the program scope');
    expect(decode(ld)).toContain(ANSWER_END);
  });
});

test('owner date rule: changed pages that carry their own date read 2026-11-01 or later', () => {
  const day = (raw: string) => /"dateModified":"(\d{4}-\d{2}-\d{2})"/.exec(raw)?.[1] ?? '';
  for (const p of [WORK, YOUTHWIDE, CAMPUS, TALENTLEAP, INVESTORS, PLATFORM, 'partner-with-us/governments/index.html', 'partner-with-us/foundations/index.html']) {
    expect(day(html(p)) >= '2026-11-01', `${p} dateModified`).toBe(true);
    const stamp = /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(p))?.[1];
    if (stamp) expect(stamp >= '2026-11-01', `${p} Last updated`).toBe(true);
  }
});
