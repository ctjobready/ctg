import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP114 (Opus Low run 6, kit 80): obstacle cards state the reader's obstacle; NU payment wording.
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp114.spec.ts --project=chromium`.
 *   - Item 1: Development Partners "What Gets in the Way" card 1 body says training often ends before paid work.
 *   - Item 2: JobReady@Campus "The Challenge" band keeps its H2; its lead and two cards state obstacles.
 *   - Item 3: NU Post Graduate Diploma overview and four course pages say "a CodersTrust Bangladesh (CTBD) campus".
 *   - Item 4: no obstacle-band card on the eight pages begins with an imperative verb.
 *   - Item 5: the changed pages carry 2026-10-29 (already dated; guard only).
 */

const distHtml = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const srcText = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

/** The "The Challenge" / "What Gets in the Way" band: the section with id="problem" in the built HTML. */
function problemBand(html: string): string {
  const i = html.indexOf('id="problem"');
  if (i < 0) return '';
  const j = html.indexOf('<section', i + 10);
  return html.slice(i, j > 0 ? j : undefined);
}

/** Card titles and bodies inside the band (the obstacle cards), in document order. */
function cardTexts(html: string): string[] {
  return [...problemBand(html).matchAll(/<(?:p|h3)\b[^>]*class="(?:gp__q|gp__a|card__title|card__text)"[^>]*>([^<]*)</g)].map((m) => m[1].trim());
}

const lead = (html: string) => (/<p class="sh__lead[^"]*"[^>]*>([^<]*)<\/p>/.exec(problemBand(html))?.[1] ?? '').trim();

/** Words an obstacle card must not open with: each would make the card an instruction, not a statement of the reader's obstacle. */
const IMPERATIVE = ['Connect', 'Help', 'Prepare', 'Track', 'Build', 'Make', 'Give', 'Fund', 'Train', 'Hire', 'Start'];

const OBSTACLE_PAGES = [
  'partner-with-us/development-partners/index.html',
  'partner-with-us/governments/index.html',
  'partner-with-us/foundations/index.html',
  'partner-with-us/employers/index.html',
  'partner-with-us/universities/index.html',
  'partner-with-us/local-partners/index.html',
  'programs/youthwide/index.html',
  'programs/jobready-campus/index.html',
];

const NU_PAGES = [
  'programs/nu-postgraduate-diploma/index.html',
  'programs/nu-postgraduate-diploma/data-analytics/index.html',
  'programs/nu-postgraduate-diploma/ict/index.html',
  'programs/nu-postgraduate-diploma/cyber-security/index.html',
  'programs/nu-postgraduate-diploma/digital-marketing/index.html',
];

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP114 item 1: Development Partners card 1 states the obstacle', () => {
  test('the body is "Training often ends before a first job, freelance client or business."; the title and the other two cards are unchanged', () => {
    const html = distHtml('partner-with-us/development-partners/index.html');
    expect(cardTexts(html)).toEqual([
      'Training Must Connect to Paid Work',
      'Training often ends before a first job, freelance client or business.',
      'Barriers Can Interrupt Training',
      'Computer skills, devices, connectivity and social barriers can keep learners from joining or staying.',
      'Outcomes Are Hard to Audit',
      'Without a baseline and documentary evidence, evaluators have little to check.',
    ]);
    expect(html).not.toContain('Connect training to a first job, freelance client or business.');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP114 item 2: JobReady@Campus "The Challenge" band states obstacles and keeps its heading', () => {
  const HEADING = 'Capable Students Still Struggle to Find Work';
  const LEAD = 'A degree alone does not show employers what students can do, and without follow-up data an institution cannot show where its students start earning.';

  test('the H2 is unchanged; the lead and the two cards read as the reader’s obstacles', () => {
    const html = distHtml('programs/jobready-campus/index.html');
    expect(problemBand(html)).toContain(`>${HEADING}</h2>`);
    expect(lead(html)).toBe(LEAD);
    expect(cardTexts(html)).toEqual([
      'Skills Employers Cannot See',
      'Employers look for proof of job-ready skills beside the degree.',
      'Placement Evidence Is Missing',
      'Without a baseline and follow-up surveys, placement results are hard to report.',
    ]);
  });

  test('the old instruction wording is on no JobReady@Campus page', () => {
    const html = distHtml('programs/jobready-campus/index.html');
    for (const old of [
      'Help students prepare for paid digital work',
      'Make Students’ Skills Visible',
      'Prepare students for industry certification alongside the degree.',
      'Build Placement Evidence',
      'Track where completers start earning',
    ]) {
      expect(html, old).not.toContain(old);
    }
  });

  test('the lead is EMPATHY.universities in the source (one place, read by the band)', () => {
    expect(srcText('src/data/copy.ts')).toContain(
      "universities: 'A degree alone does not show employers what students can do, and without follow-up data an institution cannot show where its students start earning.',",
    );
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP114 item 3: NU payment wording names a campus, not branches', () => {
  test('each NU Post Graduate Diploma page says "visit a CodersTrust Bangladesh (CTBD) campus for cash or POS payments"', () => {
    for (const page of NU_PAGES) {
      const html = distHtml(page);
      expect(html, page).toContain('visit a CodersTrust Bangladesh (CTBD) campus for cash or POS payments');
      expect(html, page).not.toContain('(CTBD) branches');
    }
  });

  test('the source fact NU-05 carries the campus wording', () => {
    const facts = srcText('src/data/facts.ts');
    expect(facts).toContain('visit a CodersTrust Bangladesh (CTBD) campus for cash or POS payments');
    expect(facts).not.toContain('(CTBD) branches');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP114 item 4: obstacle-band cards do not open with an imperative verb', () => {
  test('no card on the eight obstacle-band pages starts with one of the listed verbs', () => {
    const hits: string[] = [];
    for (const page of OBSTACLE_PAGES) {
      const html = distHtml(page);
      expect(problemBand(html), page).not.toBe('');
      for (const text of cardTexts(html)) {
        const first = text.split(/\s+/)[0];
        if (IMPERATIVE.includes(first)) hits.push(`${page}: ${text}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP114 item 5: the changed pages are dated 2026-10-29', () => {
  test('JobReady@Campus shows the date and JSON-LD dateModified; the NU pages and Development Partners carry the same date', () => {
    const campus = distHtml('programs/jobready-campus/index.html');
    expect(campus).toMatch(/<time datetime="2026-10-29"[^>]*>October 29, 2026<\/time>/);
    expect(campus).toMatch(/"dateModified":"2026-10-29"/);
    for (const page of [...NU_PAGES, 'partner-with-us/development-partners/index.html']) {
      expect(distHtml(page), page).toMatch(/"dateModified":"2026-10-29"/);
    }
  });

  test('the Governance date from item 1 of WP109 is unchanged', () => {
    expect(distHtml('about/governance/index.html')).toMatch(/<time datetime="2026-10-24"[^>]*>October 24, 2026<\/time>/);
  });
});
