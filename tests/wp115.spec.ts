import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP115 (Opus Low run 7, kit 81; 2026-10-29). Run `npm run build` first.
 *   - Minor: "a national program of DoICT, the ICT Division" read as if DoICT were the ICT Division; the program is the Department of ICT's, under the ICT Division.
 *   - Polish: the Investors AI answer agreed track content "with you" (the investor); it is agreed with the program partner.
 *   - Polish: TalentLEAP said "outcome tracking for 12 months" without "after each course", which every other page says.
 */
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const text = (rel: string) => decode(readFileSync(join(DIST_DIR, rel), 'utf8').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

test.describe('WP115', () => {
  test('Her Power is a national program of the Department of ICT (DoICT), under the ICT Division, on YouthWIDE and Investors', () => {
    for (const page of ['programs/youthwide/index.html', 'partner-with-us/investors/index.html']) {
      const t = text(page);
      expect(t, page).toContain('a national program of the Department of ICT (DoICT), under the ICT Division');
      expect(t, page).not.toContain('a national program of DoICT, the ICT Division');
    }
  });

  test('the Investors AI answer agrees track content with the program partner, not "with you"', () => {
    const t = text('partner-with-us/investors/index.html');
    expect(t).toContain('agree each track’s AI content and work-entry plan with the program partner before enrollment');
    expect(t).not.toContain('work-entry plan with you before enrollment');
  });

  test('TalentLEAP says outcome tracking for 12 months after each course', () => {
    const t = text('our-model/talentleap/index.html');
    expect(t).toContain('placement support and outcome tracking for 12 months after each course.');
  });
});
