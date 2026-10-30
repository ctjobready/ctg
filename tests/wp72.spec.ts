import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { sources } from '../src/data/facts';
import { open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP72 behaviors (Claude-ladder fixes, 2026-10-21). Retrospective coverage: the owner exempted this project from test-first work,
 * so these tests were written after the change. Each states one observable behavior of the built site
 * (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp72.spec.ts --project=chromium`):
 *   - 1: the trial page's "Read the BIGD Report (2022)" link points at the 2022 evaluation (BIGD22), not the follow-up study page (BIGDSTUDY);
 *   - 2: the Digital Jobs Albania case study links the World Bank's May 2022 update (WBBLOG22) beside the September 2021 announcement (WBDJA21);
 *   - 3: no built page prints a straight double quote in visible text (code samples excepted);
 *   - 4: the outcomes-2026, JobReady@Campus and YouthWIDE pages say "Last updated October 21, 2026".
 */

const TRIAL = 'impact/independent-evaluation/';
const ALBANIA = 'impact/case-studies/digital-jobs-albania/';

/** Visible text of a built HTML file: comments, scripts, styles and code samples dropped, tags removed, entities decoded for quotes. */
function visibleTextOfHtml(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(code|pre)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;|&#34;|&#x22;/gi, '"')
    .replace(/&#39;|&#x27;|&apos;/gi, "'");
}

test.describe('Item 1: the trial page links the 2022 BIGD report', () => {
  test('"Read the BIGD Report (2022)" points at the BIGD22 evaluation and the follow-up study link is gone', async ({ page }) => {
    expect(sources.BIGD22.url).toBe('https://bigd.bracu.ac.bd/publications/impact-evaluation-report-of-the-womens-skill-development-for-freelancing-marketplaces-wsdfm-program/');
    await open(page, TRIAL);
    const link = page.getByRole('link', { name: /Read the BIGD Report \(2022\)/ });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', sources.BIGD22.url!);
    await expect(page.getByRole('link', { name: /Read the BIGD Study/ })).toHaveCount(0);
  });
});

test.describe('Item 2: the Albania case study links the World Bank May 2022 update', () => {
  test('the update link sits beside the September 2021 announcement, with its own source', async ({ page }) => {
    await open(page, ALBANIA);
    const update = page.getByRole('link', { name: /Read the World Bank’s May 2022 Update/ });
    await expect(update).toHaveCount(1);
    await expect(update).toHaveAttribute('href', sources.WBBLOG22.url!);
    await expect(page.getByRole('link', { name: /Read the World Bank Announcement/ })).toHaveAttribute('href', sources.WBDJA21.url!);
  });
});

test.describe('Item 3: no straight double quotes or apostrophes in visible text', () => {
  // WP77 item 2 extends this check to straight apostrophes (' or &#39;), which teasers printed before WP77.
  test('no built page prints a straight double quote or apostrophe in visible text (code samples and attributes excepted)', () => {
    const offenders = listPages().flatMap((p) => {
      const text = visibleTextOfHtml(readFileSync(p.file, 'utf8'));
      const i = text.search(/["']/);
      return i === -1 ? [] : [`${p.route}: …${text.slice(Math.max(0, i - 50), i + 50).replace(/\s+/g, ' ')}…`];
    });
    expect(offenders).toEqual([]);
  });
});

test.describe('Item 4: pages whose survey figures changed on 21 October say so', () => {
  // WP86 (CLR run 3, Minor 3): YouthWIDE's line is now October 24 (tests/wp86.spec.ts)
  for (const [route, day] of [['impact/outcomes-2026/', 'October 29, 2026'], ['programs/jobready-campus/', 'October 31, 2026']]) {
    // WP104: both pages' stamps moved on to October 29, 2026 with their later content changes (tests/wp104.spec.ts); WP129: JobReady@Campus moved on to October 31, 2026 (its wording changed again on 30 and 31 October)
    test(`${route} shows "Last updated ${day}"`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('body')).toContainText(`Last updated ${day}`);
    });
  }
});
