import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP113 (Opus Low run 5, kit 79): finish the reporting-qualifier sweep, with a site-wide rule test, and the Polish items.
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp113.spec.ts --project=chromium`.
 * The rule (owner brief): a reporting or inclusion PROMISE (what a partner receives) carries "as agreed in the program scope";
 * a TIMELINE STEP that only describes sequence ("The first cohort begins training; monthly reports follow.") does not.
 *   - Minor 1 to 6: Home, Governments, Local Partners, JobReady@Campus (glance row and FAQ) and Programs say the monthly reports "as agreed in the program scope".
 *   - Minor sweep: every sentence on a built page (JSON-LD and llms.txt included; /news/ posts and the styleguide excluded) that contains "monthly report"
 *     either contains "program scope" or is a timeline step ("monthly reports follow").
 *   - Polish 7: the partner hub's "What Does It Cost?" answer says the standard clause once, on the exam preparation.
 *   - Polish 8: About's meta description (page, og:description, JSON-LD) reads "... trains ... and has worked in 16 countries and territories." (within 155 characters).
 *   - Polish 9: the changed pages carry dateModified 2026-10-29 (guard test: they already did, so it passes before the change).
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

/** Sentences of a text: a sentence ends at a full stop, question or exclamation mark followed by a space or a closing quote (JSON-LD strings). */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])(?:\s+|(?=["”]))/);
}

/** Text segments of a built page: attribute values (meta descriptions, alt text) and the text between tags, JSON-LD included. A tag boundary ends a segment. */
function segments(html: string): string[] {
  const attrs = [...html.matchAll(/\s(?:content|alt|title|aria-label)="([^"]*)"/g)].map((m) => decode(m[1]));
  const body = decode(html.replace(/<style[\s\S]*?<\/style>/g, '\n').replace(/<[^>]+>/g, '\n'));
  return [...attrs, ...body.split(/\n+/)].flatMap(sentences);
}

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP113 Minor 1 to 6: each reporting promise says "as agreed in the program scope"', () => {
  test('1. Home: "You review monthly reports, as agreed in the program scope, showing who is earning, not only who completed."', () => {
    const text = visibleText(distHtml('index.html'));
    expect(text).toContain('You review monthly reports, as agreed in the program scope, showing who is earning, not only who completed.');
    expect(text).not.toContain('You review monthly reports showing who is earning');
  });

  test('2. Governments "What Your Agency Gets" card 2 ends "…, and monthly reports, as agreed in the program scope."', () => {
    const text = visibleText(distHtml('partner-with-us/governments/index.html'));
    expect(text).toContain('A pilot scorecard with cost per completer and per verified outcome, and monthly reports, as agreed in the program scope.');
    expect(text).not.toContain('and per verified outcome, and monthly reports.');
  });

  test('3. Local Partners "What Your Community Gets" card 3: "…it receives monthly reports as agreed in the program scope, and your organization receives agreed program updates…"', () => {
    const text = visibleText(distHtml('partner-with-us/local-partners/index.html'));
    expect(text).toContain('Where a funder is involved, it receives monthly reports as agreed in the program scope, and your organization receives agreed program updates on enrollment, completion, certification and placement.');
    expect(text).not.toContain('it receives monthly reports, and your organization');
  });

  test('4. JobReady@Campus At a Glance "Reporting": "Baseline data, follow-up surveys and monthly reports, as agreed in the program scope, so your institution builds placement evidence from its own students."', () => {
    const text = visibleText(distHtml('programs/jobready-campus/index.html'));
    expect(text).toContain('Baseline data, follow-up surveys and monthly reports, as agreed in the program scope, so your institution builds placement evidence from its own students.');
    expect(text).not.toContain('monthly reports, so your institution builds');
  });

  test('5. JobReady@Campus FAQ "How Do You Prove Outcomes?" ends "…placements and first earnings, as agreed in the program scope.", in the page and its FAQ structured data', () => {
    const html = distHtml('programs/jobready-campus/index.html');
    const answer = 'Your institution receives monthly reports on enrollment, completion, certification, placements and first earnings, as agreed in the program scope.';
    expect(visibleText(html)).toContain(answer);
    expect(html).toContain(answer);
    expect(html).not.toContain('placements and first earnings."');
  });

  test('6. Programs: funders "get monthly reports on progress toward paid work, as agreed in the program scope, not only enrollment."', () => {
    const text = visibleText(distHtml('programs/index.html'));
    expect(text).toContain('funders get monthly reports on progress toward paid work, as agreed in the program scope, not only enrollment.');
    expect(text).not.toContain('paid work, not only enrollment');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
// The rule, site-wide. A sentence that states what a partner receives qualifies it ("program scope"); a sequence step ("monthly reports follow") does not.
test.describe('WP113 sweep: every "monthly report" sentence carries "program scope" or is a timeline step', () => {
  const REPORT = /monthly report/i;
  const TIMELINE = /monthly reports follow/i;
  // A heading or a card title ("Monthly Reports and Program Updates") promises nothing: a segment of eight words or fewer with no closing punctuation is not a sentence.
  const heading = (s: string) => !/[.!?]["”]?$/.test(s.trim()) && s.trim().split(/\s+/).length <= 8;
  const ok = (s: string) => !REPORT.test(s) || heading(s) || /program scope/.test(s) || TIMELINE.test(s);
  const inScope = (rel: string) => !rel.startsWith('news/') && !/^(styleguide|_styleguide)\//.test(rel);

  test('every built HTML page (news posts and the styleguide excluded), its JSON-LD and llms.txt', () => {
    const offenders: string[] = [];
    for (const file of walk(DIST_DIR)) {
      const rel = relative(DIST_DIR, file).replace(/\\/g, '/');
      if (!inScope(rel)) continue;
      for (const s of segments(readFileSync(file, 'utf8'))) if (!ok(s)) offenders.push(`${rel}: ${s.trim().slice(0, 170)}`);
    }
    const llms = join(DIST_DIR, 'llms.txt');
    if (existsSync(llms)) {
      for (const s of decode(readFileSync(llms, 'utf8')).split(/\n+/).flatMap(sentences)) if (!ok(s)) offenders.push(`llms.txt: ${s.trim().slice(0, 170)}`);
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  test('the rule recognizes a timeline step and a qualified promise, and flags an unqualified one (the rule itself)', () => {
    expect(ok('The first cohort begins training; monthly reports follow.')).toBe(true);
    expect(ok('Target timing for grant-funded pilots: the first cohort begins training 6–8 weeks after signing, and monthly reports follow from the first cohort.')).toBe(true);
    expect(ok('You review monthly reports, as agreed in the program scope, showing who is earning.')).toBe(true);
    expect(ok('You review monthly reports showing who is earning, not only who completed.')).toBe(false);
    expect(ok('Monthly Reports and Program Updates')).toBe(true); // a card title
    expect(ok('Funders get monthly reports on progress toward paid work and enrollment')).toBe(false); // eleven words, no scope
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP113 Polish 7: the partner hub "What Does It Cost?" answer', () => {
  test('it says the clause once, opening the sentence so it covers every inclusion, and not twice', () => {
    const text = visibleText(distHtml('partner-with-us/index.html'));
    expect(text).toContain('As agreed in the program scope, supported youth cohorts include outreach and selection, training, certification exam preparation (with exam fees and attempts), three months of mentoring, placement support and 12 months of outcome tracking after each course.');
    expect(text).not.toContain('and the exam fee,');
    const sentence = sentences(text).find((s) => s.startsWith('As agreed in the program scope, supported youth cohorts include'));
    expect(sentence, 'the inclusion sentence').toBeDefined();
    expect((sentence!.match(/program scope/g) ?? []).length).toBe(1);
  });

  test('the same answer is the FAQ structured data of the page', () => {
    const html = distHtml('partner-with-us/index.html');
    expect(html).toContain('certification exam preparation (with exam fees and attempts), three months of mentoring, placement support and 12 months of outcome tracking after each course.');
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
      expect(distHtml(page)).toMatch(/"dateModified":"2026-10-29"/);
    });
  }
});
