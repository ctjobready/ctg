import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact, sources } from '../src/data/facts';
import { WB_KOSOVO } from '../src/data/copy';
import { open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP74 behaviors (Claude-ladder fixes, Sonnet XHigh run 3, 2026-10-21). Retrospective coverage: the owner exempted this project from
 * test-first work, so these tests were written after the change. Each states one observable behavior of the built site
 * (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp74.spec.ts --project=chromium`):
 *   - 1: the Kosovo case study links the World Bank's February 2017 release (WBKOSOVO17), the source of the 77 in PR-02b, and no other built page links it;
 *   - 2: the 77 fact (PR-02b) cites WBKOSOVO17, and the "World Bank: 77 trainees" line is built from it;
 *   - 3: the "Where They Work" card reads "Placement support, then outcome tracking for 12 months after each course, as agreed in the program scope.",
 *        on Home, YouthWIDE and Development Partners, and the old sentence is on no built page.
 */

const KOSOVO = 'impact/case-studies/kosovo-women-in-online-work/';
const HOME = '';
const YOUTHWIDE = 'programs/youthwide/';
const DP = 'partner-with-us/development-partners/';
const WHERE_THEY_WORK = 'Placement support, then outcome tracking for 12 months after each course, as agreed in the program scope.';
const OLD_WHERE_THEY_WORK = 'Placement support and outcome tracking for 12 months after each course';

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

/** Every built page (archived news posts included), with its HTML. */
const allPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The visible text of a built page (no scripts or styles), entities decoded, no-break spaces as spaces. */
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;| /g, ' '),
  );

test.describe('Item 1: the Kosovo case study links the World Bank February 2017 release', () => {
  test('the link sits in the results, with the external rel and "(opens web.archive.org)" text, and points at WBKOSOVO17', async ({ page }) => {
    expect(sources.WBKOSOVO17.url).toContain('web.archive.org/');
    await open(page, KOSOVO);
    const link = page.locator('#results').getByRole('link', { name: /Read the World Bank’s February 2017 Release/ });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', sources.WBKOSOVO17.url!);
    expect(await link.getAttribute('rel')).toMatch(/noopener/);
    expect(compact(await link.textContent())).toContain('(opens web.archive.org)');
  });

  test('no other built page links WBKOSOVO17 (the short proof cards link the case study, not the release)', () => {
    const url = sources.WBKOSOVO17.url!;
    const routes = allPages().filter((p) => p.html.includes(url)).map((p) => p.route);
    expect(routes).toEqual(['/impact/case-studies/kosovo-women-in-online-work/']);
  });
});

test.describe('Item 2: the 77 cites the World Bank February 2017 release', () => {
  test('PR-02b, the fact behind the 77, lists WBKOSOVO17 among its sources, and the line is built from it', () => {
    expect(fact('PR-02b').stat?.value).toBe('77');
    expect(fact('PR-02b').sourceIds).toContain('WBKOSOVO17');
    expect(WB_KOSOVO.text).toBe('World Bank: 77 trainees won at least one online contract.');
    expect(WB_KOSOVO.facts).toEqual(['PR-02b']);
  });
});

test.describe('Item 3: the "Where They Work" card says placement support comes first, then the 12 months of tracking', () => {
  for (const [route, name] of [
    [HOME, 'Home'],
    [YOUTHWIDE, 'YouthWIDE'],
    [DP, 'Development Partners'],
  ] as const) {
    test(`${name} shows the new sentence in its Where They Work card`, async ({ page }) => {
      await open(page, route);
      const text = page.getByText(WHERE_THEY_WORK, { exact: true });
      await expect(text).toHaveCount(1);
      const card = page.locator('li', { has: text });
      await expect(card).toHaveCount(1);
      expect(compact(await card.textContent())).toContain('Where They Work');
    });
  }

  test('the new sentence is on Home, YouthWIDE and Development Partners, and the old sentence is on no built page', () => {
    const pages = allPages();
    const withNew = pages.filter((p) => visible(p.html).includes(WHERE_THEY_WORK)).map((p) => p.route);
    for (const expected of ['/', '/programs/youthwide/', '/partner-with-us/development-partners/']) expect(withNew).toContain(expected);
    const withOld = pages.filter((p) => visible(p.html).includes(OLD_WHERE_THEY_WORK)).map((p) => p.route);
    expect(withOld).toEqual([]);
  });
});
