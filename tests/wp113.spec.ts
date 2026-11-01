import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP113 (Opus Low run 5, kit 79): finish the reporting-qualifier sweep, with a site-wide rule test, and the Polish items.
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp113.spec.ts --project=chromium`.
 * The rule (owner brief): a reporting or inclusion PROMISE (what a partner receives) carries "as agreed in the program scope";
 * a TIMELINE STEP that only describes sequence ("The first cohort begins training; monthly reports follow.") does not.
 *   - Minor 1 to 6 and the Minor sweep (sentence-level "program scope" on every "monthly report" sentence): replaced by the PAGE rule in tests/wp141.spec.ts (WP141, owner answer 2026-11-01).
 *   - Polish 7: the partner hub's "What Does It Cost?" answer says the standard clause once, on the exam preparation (WP141: the answer carries no clause; the page statement does).
 *   - Polish 8: About's meta description (page, og:description, JSON-LD) reads "... trains ... and has worked in 16 countries and territories." (within 155 characters).
 *   - Polish 9: the changed pages carry dateModified 2026-10-29 (guard test: they already did, so it passes before the change).
 */

const distHtml = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');

// Pages without a date of their own carry the build date (BUILD_DATE), so a later build dates them later: check "on or after" the change date.
const onOrAfter = (html: string, day: string, re = /"dateModified":"(\d{4}-\d{2}-\d{2})"/) => (html.match(re)?.[1] ?? "") >= day;
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+');
const visibleText = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');

/** Sentences of a text: a sentence ends at a full stop, question or exclamation mark followed by a space or a closing quote (JSON-LD strings). */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])(?:\s+|(?=["”]))/);
}

// --------------------------------------------------------------------------------------------------------------------------------
// WP141 (owner answer 2026-11-01, "as agreed in the program scope" ONCE per page): the Minor 1 to 6 sentence pins ("monthly reports ... as agreed in the program scope") and the
// "monthly report" sentence sweep that stood here are replaced by the PAGE rule in tests/wp141.spec.ts (one statement per page; no in-sentence copies).

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP113 Polish 7: the partner hub "What Does It Cost?" answer', () => {
  test('it lists the inclusions with the exam terms "set per program" and no program-scope clause of its own (WP141: the page statement carries it)', () => {
    const text = visibleText(distHtml('partner-with-us/index.html'));
    expect(text).toContain('Supported youth cohorts include outreach and selection, training, certification exam preparation (exam fees and attempts set per program), three months of mentoring, placement support and 12 months of outcome tracking after each course.');
    expect(text).not.toContain('and the exam fee,');
    const sentence = sentences(text).find((s) => s.startsWith('Supported youth cohorts include'));
    expect(sentence, 'the inclusion sentence').toBeDefined();
    expect(sentence).not.toContain('program scope');
  });

  test('the same answer is the FAQ structured data of the page', () => {
    const html = distHtml('partner-with-us/index.html');
    expect(html).toContain('certification exam preparation (exam fees and attempts set per program), three months of mentoring, placement support and 12 months of outcome tracking after each course.');
    expect(html).not.toContain('and the exam fee,');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP113 Polish 8: About meta description', () => {
  const D = 'New York-headquartered CodersTrust trains educated, unemployed and underemployed youth for digital work and has worked in 16 countries and territories.';

  test('it reads "… trains … and has worked in 16 countries and territories." within 155 characters, in the meta description, og:description and JSON-LD', () => {
    const html = distHtml('about/index.html');
    expect(D.length).toBeLessThanOrEqual(155);
    expect(html).toContain(`<meta name="description" content="${D}"`);
    expect(html).toContain(`<meta property="og:description" content="${D}"`);
    expect(html).toContain(`"description":"${D}"`);
    expect(html).not.toContain('has trained educated, unemployed and underemployed youth for digital work, with work in');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP113 Polish 9: changed pages carry dateModified 2026-10-29 (guard test, passes before the change)', () => {
  for (const page of ['index.html', 'partner-with-us/index.html', 'partner-with-us/governments/index.html', 'partner-with-us/local-partners/index.html', 'programs/index.html', 'programs/jobready-campus/index.html', 'about/index.html']) {
    test(page, () => {
      expect(onOrAfter(distHtml(page), "2026-10-29")).toBe(true);
    });
  }
});
