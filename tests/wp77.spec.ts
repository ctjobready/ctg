import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { REDIRECTS } from '../src/data/redirects';
import { curlyApostrophes } from '../src/lib/format';
import { DIST_DIR } from './support/env';
import { open, serveWithoutUpgradeForLocalHttp } from './support/browser';

/**
 * WP77 behaviors (Claude-ladder fixes, owner review run 6). Retrospective coverage: the owner exempted this project from test-first work,
 * so these tests were written after the change. Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp77.spec.ts --project=chromium`.
 *   - 1: the two NU course pages Cyber Security and Data Analytics list eight "Fields This Diploma Can Support" titles, legacy text, legacy order;
 *   - 2: news teasers print curly apostrophes in visible text; attributes and meta descriptions keep the source text;
 *   - 3: the two old WordPress course URLs (with and without /feed/) redirect to the NU course pages, as the existing NU course legacy URLs do.
 * The straight-apostrophe sweep over every built page is in tests/wp72.spec.ts (Item 3 there).
 */

// ---- Item 1: at most eight chips -------------------------------------------------------------------------------------------------------------

const CHIPS: Record<string, { route: string; chips: string[]; trimmed: string[] }> = {
  'cyber-security': {
    route: 'programs/nu-postgraduate-diploma/cyber-security/',
    chips: [
      'Junior Cyber Security Analyst',
      'Information Security Analyst',
      'Network Security Assistant',
      'Digital Forensics Assistant',
      'Cybercrime Investigation Assistant',
      'Fraud Investigation Assistant',
      'Junior Cyber Risk Analyst',
      'Data Privacy Assistant',
    ],
    trimmed: [
      'SOC Analyst Trainee',
      'IT Security Support Associate',
      'Digital Evidence Assistant',
      'Cyber Incident Response Assistant',
      'Information Security Compliance Assistant',
      'IT Risk Management Assistant',
      'Junior Network Security Administrator',
    ],
  },
  'data-analytics': {
    route: 'programs/nu-postgraduate-diploma/data-analytics/',
    chips: [
      'Data Analyst',
      'Junior Data Analyst',
      'Business Intelligence Analyst',
      'Reporting Analyst',
      'Data Visualization Analyst',
      'Database Reporting Assistant',
      'Performance Analyst',
      'Freelance Data Analyst',
    ],
    trimmed: ['Business Analyst', 'Research Data Assistant', 'Marketing Data Analyst', 'Operations Analyst', 'Financial Data Analyst', 'Data Analytics Consultant'],
  },
};

test.describe('Item 1: the NU Cyber Security and Data Analytics pages list at most eight fields', () => {
  for (const [slug, c] of Object.entries(CHIPS)) {
    test(`${slug}: eight chips, the legacy titles in legacy order; the trimmed titles are not on the chip list`, async ({ page }) => {
      await open(page, c.route);
      const chips = await page.locator('#who .roles li').allTextContents();
      expect(chips).toEqual(c.chips);
      expect(chips.length).toBeLessThanOrEqual(8);
      for (const t of c.trimmed) expect(chips, t).not.toContain(t);
    });
  }
  test('Digital Marketing (4) and ICT (8) keep their lists', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/digital-marketing/');
    await expect(page.locator('#who .roles li')).toHaveCount(4);
    await open(page, 'programs/nu-postgraduate-diploma/ict/');
    await expect(page.locator('#who .roles li')).toHaveCount(8);
  });
});

// ---- Item 2: curly apostrophes in teaser text ------------------------------------------------------------------------------------------------

test.describe('Item 2: teaser text prints curly apostrophes', () => {
  test('curlyApostrophes: apostrophes and closing quotes become ’, opening quotes become ‘, other text is untouched', () => {
    expect(curlyApostrophes("Bangladesh's Foreign Minister")).toBe('Bangladesh’s Foreign Minister');
    expect(curlyApostrophes("CodersTrust's mission.")).toBe('CodersTrust’s mission.');
    expect(curlyApostrophes("to 'Be Useful'.")).toBe('to ‘Be Useful’.');
    expect(curlyApostrophes("'Start' here")).toBe('‘Start’ here');
    expect(curlyApostrophes('He said "hi" and (\'quoted\')')).toBe('He said "hi" and (‘quoted’)');
    expect(curlyApostrophes('No quotes here.')).toBe('No quotes here.');
  });

  test('the news index teasers show the curly form and no card title or excerpt has a straight apostrophe', async ({ page }) => {
    await open(page, 'news/');
    await expect(page.locator('.card__text', { hasText: 'Bangladesh’s Foreign Minister' }).first()).toBeVisible();
    const cards = await page.locator('.card__title, .card__text').allTextContents();
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.filter((t) => t.includes("'"))).toEqual([]);
  });

  test('a news post shows its related teasers curly, and its meta description keeps the source text', async ({ page }) => {
    await open(page, 'news/coderstrust-chairman-aziz-ahmad-meets-bangladesh-foreign-affairs-minister-khalilur-rahman/');
    const teasers = await page.locator('.card__text').allTextContents();
    expect(teasers.filter((t) => t.includes("'"))).toEqual([]);
    // attributes are not visible text: the meta description still carries the source's straight apostrophe
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Bangladesh's Foreign Minister/);
  });
});

// ---- Item 3: the old WordPress course URLs redirect to the NU course pages ------------------------------------------------------------------

const LEGACY: [string, string][] = [
  ['course/post-graduate-diploma-in-cybersecurity/', 'programs/nu-postgraduate-diploma/cyber-security/'],
  ['course/post-graduate-diploma-in-cybersecurity/feed/', 'programs/nu-postgraduate-diploma/cyber-security/'],
  ['course/post-graduate-diploma-in-data-analytics/', 'programs/nu-postgraduate-diploma/data-analytics/'],
  ['course/post-graduate-diploma-in-data-analytics/feed/', 'programs/nu-postgraduate-diploma/data-analytics/'],
];

test.describe('Item 3: the legacy NU course URLs redirect', () => {
  test('src/data/redirects.ts carries the four rows, in the same form as the existing NU course rows', () => {
    for (const [from, to] of LEGACY) {
      expect(REDIRECTS).toContainEqual({ from: `/${from}`, to: `/${to}`, kind: 'internal' });
    }
    expect(REDIRECTS).toContainEqual({ from: '/course/digital-marketing-pgd/', to: '/programs/nu-postgraduate-diploma/digital-marketing/', kind: 'internal' });
  });

  test('the edge list carries the same four 301s (generated from the manifest)', () => {
    const csv = readFileSync(join(process.cwd(), 'edge', 'bulk-redirects.csv'), 'utf8');
    for (const [from, to] of LEGACY) {
      expect(csv).toContain(`coderstrust.global/${from},https://coderstrust.global/${to},301,`);
    }
  });

  for (const [from, to] of LEGACY) {
    test(`built stub /${from} points to /${to}`, () => {
      const html = readFileSync(join(DIST_DIR, from, 'index.html'), 'utf8');
      expect(html).toContain('data-redirect-stub');
      expect(html).toContain(`<link rel="canonical" href="https://coderstrust.global/${to}">`);
      expect(html).toMatch(new RegExp(`url=/[^"]*${to.replace(/\//g, '\\/')}"`));
    });
  }

  test('a visitor to the old Cyber Security URL lands on the NU course page', async ({ page }) => {
    await serveWithoutUpgradeForLocalHttp(page);
    await page.goto('course/post-graduate-diploma-in-cybersecurity/');
    await page.waitForURL(/programs\/nu-postgraduate-diploma\/cyber-security\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('NU Postgraduate Diploma in Cyber Security');
  });
});
