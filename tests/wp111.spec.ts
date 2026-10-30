import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP111 (Opus Low run 3, kit 77: Minor and Polish). Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp111.spec.ts --project=chromium`.
 *   - Minor 1: the SDG 9 name is "Industry, Innovation and Infrastructure" everywhere it appears (Impact, "Seven Global Goals").
 *   - Minor 2: Development Partners' first "What Your Portfolio Gets" card names the exam preparation, mentoring and placement support, with exam fees and attempts as agreed in the program scope.
 *   - Minor 3: Foundations' "Two Ways to Fund the Path" lead and its "What Your Cohort Grant Gets" reporting card carry "as agreed in the program scope"; the "What Gets in the Way" card names an outsider's check.
 *   - Polish 4: Universities' H1 is "Give Your Students a Route into Paid Digital Work"; the menu description reads "Make students job-ready."; no built page keeps "Graduates" in either.
 *   - Polish 5: Universities' "Expansion Is Your Decision" card reads "You decide whether to add campuses or tracks after the pilot."
 *   - Polish 6: the Gardiner news item's H1 is "Gardiner Emphasizes Skill Development and Access to U.S. Digital Platforms for Bangladesh" (slug and seoTitle unchanged).
 *   - Polish 8: the changed pages carry dateModified 2026-10-29 (Impact changed from 2026-10-10).
 */

const distHtml = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');

// Pages without a date of their own carry the build date (BUILD_DATE), so a later build dates them later: check "on or after" the change date.
const onOrAfter = (html: string, day: string, re = /"dateModified":"(\d{4}-\d{2}-\d{2})"/) => (html.match(re)?.[1] ?? "") >= day;
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+');
const visibleText = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');
const h1 = (html: string) => visibleText(html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? '').trim();
const titleOf = (html: string) => decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
const metaDescription = (html: string) => decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}
const pagesWith = (text: string) => walk(DIST_DIR).filter((f) => visibleText(readFileSync(f, 'utf8')).includes(text));

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP111 item 1: SDG 9 is named "Industry, Innovation and Infrastructure"', () => {
  test('Impact prints the full SDG 9 name and no built page keeps the short name', () => {
    expect(visibleText(distHtml('impact/index.html'))).toContain('SDG 9 · Industry, Innovation and Infrastructure');
    expect(visibleText(distHtml('impact/index.html'))).not.toContain('SDG 9 · Industry and Innovation');
    expect(pagesWith('SDG 9 · Industry and Innovation')).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP111 item 2: Development Partners first portfolio card', () => {
  test('the card reads the new sentence and the old one is gone', () => {
    const html = visibleText(distHtml('partner-with-us/development-partners/index.html'));
    expect(html).toContain('Certification exam preparation, three months of mentoring and placement support in one program; exam fees and attempts as agreed in the program scope.');
    expect(html).not.toContain('Certification exam preparation with the exam fee included, three months of mentoring and placement support, in one program.');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP111 item 3: Foundations lead, reporting card and funder pain', () => {
  const html = () => visibleText(distHtml('partner-with-us/foundations/index.html'));

  test('the "Two Ways to Fund the Path" lead says "as agreed in the program scope"', () => {
    const raw = distHtml('partner-with-us/foundations/index.html');
    expect(raw).toContain('with monthly progress reports, as agreed in the program scope.');
    expect(html()).not.toContain('and combine training, mentoring and placement support, with monthly progress reports.');
  });

  test('the "What Your Cohort Grant Gets" reporting card names the program scope', () => {
    expect(html()).toContain('Monthly reports and quarterly reviews, as agreed in the program scope, keep progress visible.');
    expect(html()).not.toContain('Monthly reports and quarterly reviews keep progress visible.');
  });

  test('the "What Gets in the Way" card 2 says "evidence an outsider can check"', () => {
    expect(html()).toContain('You need evidence an outsider can check, not only a provider’s own count.');
    expect(html()).not.toContain('You need independent evidence, not a provider’s own count.');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP111 item 4: Universities H1 and menu description say "Students"', () => {
  test('the H1 reads "Give Your Students a Route into Paid Digital Work"', () => {
    expect(h1(distHtml('partner-with-us/universities/index.html'))).toBe('Give Your Students a Route into Paid Digital Work');
  });

  test('no built page keeps "Give Your Graduates" or "Make graduates job-ready"', () => {
    expect(pagesWith('Give Your Graduates a Route into Paid Digital Work')).toEqual([]);
    expect(pagesWith('Make graduates job-ready')).toEqual([]);
  });

  test('the menu description reads "Make students job-ready." on the built site', () => {
    expect(pagesWith('Make students job-ready.').length).toBeGreaterThan(0);
  });

  test('the changed Universities title and description stay within 60 and 155 characters', () => {
    const page = distHtml('partner-with-us/universities/index.html');
    expect(titleOf(page).length).toBeLessThanOrEqual(60);
    expect(metaDescription(page).length).toBeLessThanOrEqual(155);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP111 item 5: Universities "Expansion Is Your Decision" card', () => {
  test('the card body reads "You decide whether to add campuses or tracks after the pilot."', () => {
    const html = visibleText(distHtml('partner-with-us/universities/index.html'));
    expect(html).toContain('You decide whether to add campuses or tracks after the pilot.');
    expect(html).not.toContain('Expansion is your institution’s decision.');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP111 item 6: Gardiner news item H1', () => {
  const page = () => distHtml('news/gardinar-emphasizes-skill-development-and-access-for-bangladeshis-to-us-digital-platform/index.html');

  test('the H1 reads "Gardiner Emphasizes Skill Development and Access to U.S. Digital Platforms for Bangladesh"', () => {
    expect(h1(page())).toBe('Gardiner Emphasizes Skill Development and Access to U.S. Digital Platforms for Bangladesh');
  });

  test('the old H1 is gone and the page title stays within 60 characters', () => {
    expect(visibleText(page())).not.toContain('Gardiner Emphasizes on Skill Development and Access to U.S. Digital Platform for Bangladesh');
    expect(titleOf(page()).length).toBeLessThanOrEqual(60);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP111 item 8: changed pages carry dateModified 2026-10-29', () => {
  test('Impact, Development Partners, Foundations, Universities and the Gardiner item carry 2026-10-29', () => {
    expect(onOrAfter(distHtml('impact/index.html'), "2026-10-29")).toBe(true);
    expect(onOrAfter(distHtml('partner-with-us/development-partners/index.html'), "2026-10-29")).toBe(true);
    expect(onOrAfter(distHtml('partner-with-us/foundations/index.html'), "2026-10-29")).toBe(true);
    expect(onOrAfter(distHtml('partner-with-us/universities/index.html'), "2026-10-29")).toBe(true);
    expect(onOrAfter(distHtml('news/gardinar-emphasizes-skill-development-and-access-for-bangladeshis-to-us-digital-platform/index.html'), "2026-10-29")).toBe(true);
  });
});
