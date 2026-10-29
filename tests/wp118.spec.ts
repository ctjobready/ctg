import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP118 (Opus Low run 10, kit 84; 2026-10-29). Run `npm run build` first.
 *   - Minor: the Her Power case-study H1 said "with the ICT Division"; the program is DoICT's (WP115, WP117).
 *   - Polish: TalentLEAP's "every supported cohort" inclusion sentence qualified only the exam fees; the qualifier now opens the sentence and covers every item (WP113 rule).
 */
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const html = (rel: string) => decode(readFileSync(join(DIST_DIR, rel), 'utf8'));

test.describe('WP118', () => {
  test('the Her Power case-study H1 names DoICT', () => {
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html('impact/case-studies/her-power/index.html'))?.[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    expect(h1).toBe('Her Power: Women’s Digital Skills with the Department of ICT (DoICT)');
  });

  test('TalentLEAP’s inclusion sentence opens with the qualifier and covers every item', () => {
    const t = html('our-model/talentleap/index.html').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(t).toContain('As agreed in the program scope, every supported TalentLEAP cohort pairs 100 training hours per certification with three months of milestone-based mentoring, certification exam preparation (with exam fees and attempts), placement support and outcome tracking for 12 months after each course.');
  });
});
