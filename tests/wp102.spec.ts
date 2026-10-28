import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fact } from '../src/data/facts';
import { listPages, pageByRoute } from './support/pages';

/**
 * WP102 (Sonnet Medium run 1, kit 68, and owner answers of 2026-10-28). Written test-first: run against the unchanged build they must fail for the reasons below.
 *   1. "Onboarding pipeline" is retired for National University learners: SC-04 opens "being onboarded (the university’s own learners, not learners trained by CodersTrust)";
 *      no built page says "pipeline" for NU learners; the JobReady Platform tile is "Being Onboarded".
 *   2. The NU Post Graduate Diploma overview and its four course pages link National University's own PGD notices where they say intake and schedule are confirmed with each applicant.
 *   3. Those five pages describe CodersTrust only as an affiliated college (College Code: 6634) under the National University of Bangladesh; no "official training partner" there.
 *      Other pages keep "official training partner".
 *   4. Home "Learner Journeys" lead: "One learner from each program shown in Proof in Practice: ...".
 * Run: `npm run build`, then `PORT=4610 npx playwright test tests/wp102.spec.ts --project=chromium`.
 */

const compact = (t: string) => t.replace(/\s+/g, ' ').trim();
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
const htmlOf = (route: string) => readFileSync(pageByRoute(route).file, 'utf8');
const visibleOf = (route: string) => visible(htmlOf(route));

const NU_OVERVIEW = '/programs/nu-postgraduate-diploma/';
const NU_COURSES = [
  '/programs/nu-postgraduate-diploma/digital-marketing/',
  '/programs/nu-postgraduate-diploma/ict/',
  '/programs/nu-postgraduate-diploma/cyber-security/',
  '/programs/nu-postgraduate-diploma/data-analytics/',
];
const NU_PAGES = [NU_OVERVIEW, ...NU_COURSES];

const SC04_NEW =
  '1.5M+ National University learners being onboarded (the university’s own learners, not learners trained by CodersTrust); CodersTrust has been NU’s official training partner for digital career skills and credentials since 2023 and delivers NU post graduate diploma courses';

test.describe('WP102 1: SC-04 says the NU learners are being onboarded, not in a pipeline', () => {
  test('SC-04 text opens with the new wording and keeps the rest of the sentence', () => {
    expect(fact('SC-04').text).toBe(SC04_NEW);
  });

  test('SC-04 stat label drops "onboarding pipeline"', () => {
    expect(fact('SC-04').stat?.label).toBe('National University learners being onboarded');
  });

  test('no built page says "pipeline" for National University learners', () => {
    const pipelineNU = /National University[^<]{0,160}pipeline|pipeline[^<]{0,160}National University/i;
    const hits = listPages()
      .filter((p) => pipelineNU.test(visible(readFileSync(p.file, 'utf8'))))
      .map((p) => p.route);
    expect(hits).toEqual([]);
  });

  test('the JobReady Platform tile is headed "Being Onboarded" (not "In the Pipeline") and shows the new label', () => {
    const text = visibleOf('/our-model/jobready-platform/');
    expect(text).toContain('Being Onboarded');
    expect(text).not.toContain('In the Pipeline');
    expect(text).toContain('National University learners being onboarded, not learners trained by CodersTrust');
  });

  test('Investors reads SC-04 whole: the NU sentence is the new SC-04 text', () => {
    expect(visibleOf('/partner-with-us/investors/')).toContain(SC04_NEW);
  });
});

test.describe('WP102 2: NU schedule notices are linked where intake and schedule are confirmed', () => {
  for (const route of NU_PAGES) {
    test(`${route} links the two National University PGD notice pages from the Schedule and Intake row`, () => {
      const html = htmlOf(route);
      const row = /<dt[^>]*>Schedule and Intake<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/.exec(html)?.[1] ?? '';
      expect(row, 'the Schedule and Intake row').toContain('Admissions confirms intake dates and schedule with each applicant.');
      expect(row).toContain('href="https://pgd.nu.ac.bd/admission-notices-pgd.php"');
      expect(row).toContain('href="https://pgd.nu.ac.bd/all-recent-notices-pgd.php"');
      expect(visible(row)).toContain('National University PGD Admission Notices');
      expect(visible(row)).toContain('National University PGD Recent Notices');
      expect(visible(row)).toContain('notices are published in Bangla');
    });
  }
});

test.describe('WP102 3: affiliated college wording on the NU pages, official training partner kept elsewhere', () => {
  for (const route of NU_PAGES) {
    test(`${route} has no "official training partner" wording`, () => {
      const text = visibleOf(route);
      expect(text).not.toMatch(/official training partner/i);
      expect(text).not.toMatch(/training partnership/i);
      expect(htmlOf(route)).not.toMatch(/official training partner/i);
    });
  }

  test('the NU overview describes CodersTrust as an affiliated college (College Code: 6634)', () => {
    expect(visibleOf(NU_OVERVIEW)).toContain('CodersTrust is an affiliated college (College Code: 6634) under the National University of Bangladesh');
  });

  test('the Universities page keeps "official training partner"', () => {
    expect(visibleOf('/partner-with-us/universities/')).toMatch(/official training partner/i);
  });

  test('the Home page keeps "official training partner" in the government slide', () => {
    expect(visibleOf('/')).toMatch(/official training partner/i);
  });
});

test.describe('WP102 4 (polish): Home Learner Journeys lead', () => {
  test('the lead reads "One learner from each program shown in Proof in Practice"', () => {
    const text = visibleOf('/');
    expect(text).toContain('One learner from each program shown in Proof in Practice: individual stories, not typical or promised outcomes.');
    expect(text).not.toContain('One learner from each program in Proof in Practice');
  });
});
