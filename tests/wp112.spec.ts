import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP112 (Opus Low run 4, kit 78): finish the program-scope qualifier sweep, and the Polish items.
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp112.spec.ts --project=chromium`.
 *   - Minor 1: YouthWIDE's glance "Training and Mentoring" row says the exam preparation with "exam fees and attempts set per program".
 *   - Minor 2: Our Model's pipeline step 3 (and TalentLEAP's, which shares it) says the same.
 *   - Minor 3: the Partner with Us hub's "What Does It Cost?" answer carries "as agreed in the program scope" in its list of supported-cohort inclusions (WP113: once, on the exam preparation, not at the end); Home's comparison table cell too.
 *   - Minor 4 (sweep): no built page, JSON-LD or llms.txt states "exam fee included" / "exam fees included" / "with the exam fee", or a supported-cohort inclusion list, without "program scope" in the same sentence.
 *     WP141 (owner answer 2026-11-01): replaced by the PAGE rule in tests/wp141.spec.ts (the qualifier is stated once per page); WP112b below stays.
 *   - Polish 5: the NU Post Graduate Diploma 72% tile reads "of employers globally reported difficulty finding talent in 2026 (ManpowerGroup, 2026)".
 *   - Polish 6: Universities' campus FAQ answer says "your students’ skills", not "your graduates’ skills".
 *   - Polish 7: TalentLEAP, whose text changed, is dated 2026-10-29 (JSON-LD dateModified and "Last updated"); Governance keeps October 24, 2026.
 */

const distHtml = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+');
const visibleText = (html: string) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1');

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Minor 1: YouthWIDE glance row "Training and Mentoring"', () => {
  test('the row says the exam preparation with "exam fees and attempts set per program"', () => {
    const text = visibleText(distHtml('programs/youthwide/index.html'));
    expect(text).toContain('100 training hours per certification, including certification exam preparation (exam fees and attempts set per program), then three months of milestone-based mentoring.');
    expect(text).not.toContain('with the exam fee included');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Minor 2: Our Model pipeline step 3', () => {
  test('Our Model and TalentLEAP print the qualified step 3 and the old "exam fee included" is gone', () => {
    for (const page of ['our-model/index.html', 'our-model/talentleap/index.html']) {
      const text = visibleText(distHtml(page));
      expect(text, page).toContain('Certification exam preparation (exam fees and attempts set per program).');
      expect(text, page).not.toContain('Certification exam preparation, exam fee included.');
    }
  });

  test('the structured data of the pipeline carries the same step 3 text', () => {
    expect(distHtml('our-model/talentleap/index.html')).toContain('"description":"Certification exam preparation (exam fees and attempts set per program)."');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Minor 3: "What Does It Cost?" list and the comparison cell', () => {
  test('the Partner with Us hub answer states the supported-cohort inclusions with the clause once, opening the sentence so it covers every item (WP113)', () => {
    expect(visibleText(distHtml('partner-with-us/index.html'))).toContain('certification exam preparation (exam fees and attempts set per program), three months of mentoring, placement support and 12 months of outcome tracking after each course.');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
// WP141 (owner answer 2026-11-01, "as agreed in the program scope" ONCE per page): the Minor 4 sentence-level sweep (no inclusion without "program scope" in its sentence) is replaced by the PAGE rule in tests/wp141.spec.ts.

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Polish 5: NU Post Graduate Diploma difficulty tile', () => {
  test('the 72% tile reads "of employers globally reported difficulty finding talent in 2026 (ManpowerGroup, 2026)"', () => {
    const text = visibleText(distHtml('programs/nu-postgraduate-diploma/index.html'));
    expect(text).toContain('of employers globally reported difficulty finding talent in 2026 (ManpowerGroup, 2026)');
    expect(text).not.toContain('of employers worldwide reported difficulty finding the talent they need');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Polish 6: Universities campus FAQ says "students"', () => {
  test('the campus answer reads "your students’ skills" and "your graduates’ skills" is gone', () => {
    const text = visibleText(distHtml('partner-with-us/universities/index.html'));
    expect(text).toContain('We first test local employer demand for your students’ skills and check your campus labs, then choose'); // WP155 (Polish 9): was "... for your students’ skills and your campus labs first, and choose ..."
    expect(text).not.toContain('your graduates’ skills');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Polish 7: dates', () => {
  test('TalentLEAP, whose text changed, carries 2026-11-02 in JSON-LD and reads "Last updated November 2, 2026" (WP154; WP141 had 2026-11-01)', () => {
    const html = distHtml('our-model/talentleap/index.html');
    expect(html).toMatch(/"dateModified":"2026-11-02"/);
    expect(html).not.toMatch(/"dateModified":"2026-10-28"/);
    expect(visibleText(html)).toContain('Last updated November 2, 2026');
  });

  test('Governance reads "Last updated November 2, 2026" (WP127 and WP128 changed its text on 30 October, WP129 applied the owner rule that any visible text change moves the date; WP141 changed it again; WP155 on 2 November)', () => {
    expect(visibleText(distHtml('about/governance/index.html'))).toContain('Last updated November 2, 2026');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
// WP112b (kit 79 check): JobReady@Campus said "with the exam fee included, …; eligibility, attempts and retakes are agreed in the program scope."
// The sentence carried the qualifier, but for eligibility and attempts, not for the fee, so the sweep above passed it. No built page may state the fee as included at all.
test.describe('WP112b: no built page says the exam fee is included', () => {
  test('"exam fee(s) included" appears on no built page or in llms.txt', () => {
    const FEE = /exam fees? included/i;
    const offenders = walk(DIST_DIR).filter((f) => FEE.test(decode(readFileSync(f, 'utf8')))).map((f) => relative(DIST_DIR, f));
    const llms = join(DIST_DIR, 'llms.txt');
    if (existsSync(llms) && FEE.test(readFileSync(llms, 'utf8'))) offenders.push('llms.txt');
    expect(offenders).toEqual([]);
  });

  test('JobReady@Campus states the fee, eligibility, attempts and retakes as set per program (WP141: the page statement carries the program-scope qualifier)', () => {
    expect(visibleText(distHtml('programs/jobready-campus/index.html'))).toContain('100 training hours per certification, including certification exam preparation, then three months of milestone-based mentoring; exam fees, eligibility, attempts and retakes are set per program.');
  });
});
