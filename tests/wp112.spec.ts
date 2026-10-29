import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP112 (Opus Low run 4, kit 78): finish the program-scope qualifier sweep, and the Polish items.
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp112.spec.ts --project=chromium`.
 *   - Minor 1: YouthWIDE's glance "Training and Mentoring" row says the exam preparation with "exam fees and attempts as agreed in the program scope".
 *   - Minor 2: Our Model's pipeline step 3 (and TalentLEAP's, which shares it) says the same.
 *   - Minor 3: the Partner with Us hub's "What Does It Cost?" answer ends its list of supported-cohort inclusions with "as agreed in the program scope."; Home's comparison table cell too.
 *   - Minor 4 (sweep): no built page, JSON-LD or llms.txt states "exam fee included" / "exam fees included" / "with the exam fee", or a supported-cohort inclusion list, without "program scope" in the same sentence.
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

/**
 * Text segments of a built page, for sentence checks: attribute values (meta descriptions, alt text) and the text between tags,
 * JSON-LD included. A tag boundary ends a segment, so a table cell is its own sentence.
 */
function segments(html: string): string[] {
  const attrs = [...html.matchAll(/\s(?:content|alt|title|aria-label)="([^"]*)"/g)].map((m) => decode(m[1]));
  const body = decode(html.replace(/<style[\s\S]*?<\/style>/g, '\n').replace(/<[^>]+>/g, '\n'));
  return [...attrs, ...body.split(/\n+/)].flatMap(sentences);
}

/** Sentences of a text: a sentence ends at a full stop, question or exclamation mark followed by a space or a closing quote (JSON-LD strings). */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])(?:\s+|(?=["”]))/);
}

// An inclusion stated as given: the exam fee in the cohort, or the list of what a supported cohort includes.
const INCLUSION = /exam fees? included|with the exam fees?\b|Supported youth cohorts include/i;

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Minor 1: YouthWIDE glance row "Training and Mentoring"', () => {
  test('the row says the exam preparation with "exam fees and attempts as agreed in the program scope"', () => {
    const text = visibleText(distHtml('programs/youthwide/index.html'));
    expect(text).toContain('100 training hours per certification, then certification exam preparation (exam fees and attempts as agreed in the program scope) and three months of milestone-based mentoring.');
    expect(text).not.toContain('with the exam fee included');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Minor 2: Our Model pipeline step 3', () => {
  test('Our Model and TalentLEAP print the qualified step 3 and the old "exam fee included" is gone', () => {
    for (const page of ['our-model/index.html', 'our-model/talentleap/index.html']) {
      const text = visibleText(distHtml(page));
      expect(text, page).toContain('Certification exam preparation (exam fees and attempts as agreed in the program scope).');
      expect(text, page).not.toContain('Certification exam preparation, exam fee included.');
    }
  });

  test('the structured data of the pipeline carries the same step 3 text', () => {
    expect(distHtml('our-model/talentleap/index.html')).toContain('"description":"Certification exam preparation (exam fees and attempts as agreed in the program scope)."');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Minor 3: "What Does It Cost?" list and the comparison cell', () => {
  test('the Partner with Us hub answer ends the list of supported-cohort inclusions with "as agreed in the program scope."', () => {
    expect(visibleText(distHtml('partner-with-us/index.html'))).toContain('placement support and 12 months of outcome tracking after each course, as agreed in the program scope.');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 sweep: no built page states an inclusion without "program scope" in its sentence', () => {
  test('every built HTML page, its JSON-LD and llms.txt', () => {
    const offenders: string[] = [];
    for (const file of walk(DIST_DIR)) {
      for (const s of segments(readFileSync(file, 'utf8'))) {
        if (INCLUSION.test(s) && !/program scope/.test(s)) offenders.push(`${relative(DIST_DIR, file)}: ${s.trim().slice(0, 140)}`);
      }
    }
    const llms = join(DIST_DIR, 'llms.txt');
    if (existsSync(llms)) {
      for (const s of decode(readFileSync(llms, 'utf8')).split(/\n+/).flatMap(sentences)) {
        if (INCLUSION.test(s) && !/program scope/.test(s)) offenders.push(`llms.txt: ${s.trim().slice(0, 140)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

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
    expect(text).toContain('We test local employer demand for your students’ skills and your campus labs first');
    expect(text).not.toContain('your graduates’ skills');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP112 Polish 7: dates', () => {
  test('TalentLEAP, whose text changed, carries 2026-10-29 in JSON-LD and reads "Last updated October 29, 2026"', () => {
    const html = distHtml('our-model/talentleap/index.html');
    expect(html).toMatch(/"dateModified":"2026-10-29"/);
    expect(html).not.toMatch(/"dateModified":"2026-10-28"/);
    expect(visibleText(html)).toContain('Last updated October 29, 2026');
  });

  test('Governance keeps "Last updated October 24, 2026" (its content has not changed; guard test, passes before the change)', () => {
    expect(visibleText(distHtml('about/governance/index.html'))).toContain('Last updated October 24, 2026');
  });
});
