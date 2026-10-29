import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP117 (Opus Low run 9, kit 83; 2026-10-29). Run `npm run build` first.
 * Her Power is a national program of the Department of ICT (DoICT), under the ICT Division (WP115). The case study, its meta description, a learner story and
 * the GV-01/GV-13 facts still said "a project of (Bangladesh’s) ICT Division" or "(DoICT, ICT Division)", which reads as if the two were the same body.
 */
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(dir)) { const f = join(dir, n); if (statSync(f).isDirectory()) walk(f, out); else if (n.endsWith('.html')) out.push(f); }
  return out;
};

test.describe('WP117: Her Power is DoICT’s program, under the ICT Division, everywhere', () => {
  test('no built page says Her Power is a project of the ICT Division, or writes "(DoICT, ICT Division)"', () => {
    const OLD = /a project of (?:Bangladesh’s |the )?ICT Division|\(DoICT, ICT Division\)/;
    const offenders = walk(DIST_DIR).filter((f) => OLD.test(decode(readFileSync(f, 'utf8')))).map((f) => relative(DIST_DIR, f));
    expect(offenders).toEqual([]);
  });

  test('the Her Power case study states the program and its meta description says DoICT under the ICT Division', () => {
    const html = decode(readFileSync(join(DIST_DIR, 'impact/case-studies/her-power/index.html'), 'utf8'));
    expect(html).toContain('Her Power is a national program of the Department of ICT (DoICT), under the ICT Division of the Government of Bangladesh.');
    expect(html).toMatch(/<meta name="description" content="Her Power, a program of DoICT under Bangladesh’s ICT Division:/);
  });
});
