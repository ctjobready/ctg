import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP120 (Opus Medium run 2, kit 87; 2026-10-29). Run `npm run build` first.
 *   - Minor: Investors' TalentLEAP card stated the supported-cohort inclusions without the program-scope qualifier (WP116 rule).
 *   - Minor: the BCIU post said "since 2014" twice in one sentence.
 *   - Polish: Employers / JobReady@Work "standard inclusions" qualified; BCIU title "Washington, D.C."; SKIT post sentence ends with a full stop;
 *     the Career Carnival post says "Program completers", not "Graduates", for course completers.
 */
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const text = (rel: string) => decode(readFileSync(join(DIST_DIR, rel), 'utf8').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

test.describe('WP120', () => {
  test('Investors: the supported-cohort inclusions carry the qualifier', () => {
    expect(text('partner-with-us/investors/index.html')).toContain('Supported cohorts include mentoring, certification exam preparation and placement support, as agreed in the program scope.');
  });
  test('BCIU post: "since 2014" once in the closing sentence, and the title says "Washington, D.C."', () => {
    const t = text('news/coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c/index.html');
    expect(t).toContain('highlighted CodersTrust’s contributions since 2014, noting that the organization has worked in 16 countries and territories, helping build a smarter and more inclusive future.');
    expect(t).toContain('Joins BCIU Roundtable in Washington, D.C.');
  });
  test('Employers and JobReady@Work: standard inclusions as agreed in the program scope', () => {
    for (const p of ['partner-with-us/employers/index.html', 'programs/jobready-work/index.html']) {
      expect(text(p), p).toContain('Standard inclusions, as agreed in the program scope, are a needs assessment, a customized curriculum, interactive workshops, progress evaluation and post-training support;');
    }
  });
  test('SKIT post sentence ends with a full stop; Career Carnival says "Program completers"', () => {
    expect(text('news/1000-trainees-sheikh-kamal-ict-incubator-training/index.html')).toContain('CodersTrust will provide training to 1,000 people in high-demand IT skills.');
    const c = text('news/coderstrust-organizes-career-carnival-for-students-and-affiliates/index.html');
    expect(c).toContain('Program completers also benefit from job-placement support');
    expect(c).not.toContain('Graduates also benefit');
  });
});
