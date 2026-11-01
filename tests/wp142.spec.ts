import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP142 (Opus High run 17, kit 109). Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp142.spec.ts tests/wp141.spec.ts --project=chromium`.
 *   - Item 1 and 2 (the principle challenge, accepted within the owner's once-per-page rule): each page keeps ONE scope sentence, and its nouns name only what that page promises
 *     (inclusions, exam terms, reporting, tracking). The per-page sentence map is pinned in tests/wp141.spec.ts; here: the nouns have a referent on the page (Item 2 check), the
 *     Investors sentence follows the cohort-inclusions sentence (not the platform-status cards), the Programs sentence follows the routing line (not the SuperKids card).
 *   - Item 3: Case Studies "Partner and Place"; no other site-authored "&" label on a built page (allowlist of fixed names below).
 *   - Item 4: Employers card 2 ("AI Content Agreed Before Training").
 *   - Owner date rule: Case Studies carries its own dateModified, so it moves to 2026-11-01.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const mainHtml = (raw: string) => /<main[\s\S]*<\/main>/.exec(raw)?.[0];
const main = (rel: string) => visible(mainHtml(html(rel)) ?? '');
const onOrAfter = (day: string | undefined, min: string) => (day ?? '') >= min;

const allPages = (dir = DIST_DIR): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? allPages(p) : p.endsWith('.html') ? [relative(DIST_DIR, p).replace(/\\/g, '/')] : [];
  });

/* ---------------------------------------------------------------------------------------------------------------------------------------
 * Item 2 check: the nouns of the page statement have a referent on the page.
 *   "exam terms"     only where the page states exam fees, exam eligibility, attempts or retakes;
 *   "inclusions"     only where the page lists inclusions (standard inclusions, "where included", "included for every cohort", "a cohort includes", ...);
 *   "reporting"      only where the page promises reports, follow-up surveys or reporting;
 *   "tracking plan"  only where the page states its baseline or follow-up surveys.
 * The referent is looked for in the visible text of <main> OUTSIDE the statement itself (the statement cannot vouch for its own nouns).
 * ------------------------------------------------------------------------------------------------------------------------------------- */
const STATEMENT_IN_TEXT = /[A-Z][^.]{0,80}\b(?:is|are) agreed in (?:the|each) program(?:[’']s)? scope\./;
const EXAM_EVIDENCE = /\bexam fees?\b|\bexam eligibility\b|\beligibility, attempts\b|\battempts (?:and|or|set)\b|\bretakes\b/i;
const INCLUSION_EVIDENCE = /\bstandard inclusions\b|\bwhere included\b|\bincluded for every cohort\b|\b(?:cohorts?|partnership|support) includes?\b|\bcohorts include\b|\bcohort pairs\b|\bincluding certification\b/i;
const REPORT_EVIDENCE = /\bmonthly reports?\b|\bprogress reports?\b|\bfollow-up surveys?\b|\breporting\b/i;
const TRACKING_EVIDENCE = /\bfollow-up surveys?\b|\bbaseline\b/i;

/** The statement's nouns that have no referent on the page; [] when every noun is backed. */
function unbackedNouns(text: string): string[] {
  const statement = STATEMENT_IN_TEXT.exec(text)?.[0];
  if (!statement) return [];
  const rest = text.replace(statement, ' ');
  const out: string[] = [];
  if (/exam terms/i.test(statement) && !EXAM_EVIDENCE.test(rest)) out.push('exam terms');
  if (/\binclusions\b/i.test(statement) && !INCLUSION_EVIDENCE.test(rest)) out.push('inclusions');
  if (/\breporting\b/i.test(statement) && !REPORT_EVIDENCE.test(rest)) out.push('reporting');
  if (/tracking plan/i.test(statement) && !TRACKING_EVIDENCE.test(rest)) out.push('tracking plan');
  return out;
}

const inScope = (rel: string) => !rel.startsWith('news/') && !rel.startsWith('styleguide/');
const statementPages = () => allPages().filter(inScope).filter((p) => mainHtml(html(p)) && STATEMENT_IN_TEXT.test(main(p)));

test.describe('WP142 items 1 and 2: the scope sentence names only what the page promises', () => {
  test('the detector: a noun with no referent on the page is flagged, a backed noun is not', () => {
    const stmtExams = 'Inclusions, exam terms and reporting on this page are agreed in the program scope.';
    expect(unbackedNouns(`Industry certification exam preparation by track. Monthly reports show progress. Included for every cohort: surveys. ${stmtExams}`)).toEqual(['exam terms']);
    expect(unbackedNouns(`Certification exam preparation (exam fees and attempts set per program). Monthly reports. Standard inclusions are a needs assessment. ${stmtExams}`)).toEqual([]);
    expect(unbackedNouns('Funders get monthly reports. Reporting on this page is agreed in the program scope.')).toEqual([]);
    expect(unbackedNouns('Pricing is set per program. Inclusions and reporting on this page are agreed in the program scope.')).toEqual(['inclusions', 'reporting']);
    expect(unbackedNouns('We plan a baseline at enrollment. This tracking plan is agreed in each program’s scope.')).toEqual([]);
    expect(unbackedNouns('Results are listed. This tracking plan is agreed in each program’s scope.')).toEqual(['tracking plan']);
    expect(unbackedNouns('Supported cohorts include mentoring. Cohort inclusions on this page are agreed in each program’s scope.')).toEqual([]);
    expect(unbackedNouns('Nothing here.')).toEqual([]);
  });

  test('on every built page with a statement, "exam terms", "inclusions", "reporting" and "tracking plan" each have a referent on that page (non-vacuous)', () => {
    const pages = statementPages();
    expect(pages.length).toBeGreaterThanOrEqual(18);
    const offenders = pages.map((p) => [p, unbackedNouns(main(p))] as const).filter(([, n]) => n.length > 0).map(([p, n]) => `${p}: ${n.join(', ')}`);
    expect(offenders).toEqual([]);
    const names = (noun: RegExp) => pages.filter((p) => noun.test(STATEMENT_IN_TEXT.exec(main(p))![0]));
    expect(names(/exam terms/i).length, 'pages naming exam terms').toBeGreaterThanOrEqual(8);
    expect(names(/\binclusions\b/i).length, 'pages naming inclusions').toBeGreaterThanOrEqual(12);
    expect(names(/\breporting\b/i).length, 'pages naming reporting').toBeGreaterThanOrEqual(12);
  });

  test('Investors: the sentence follows the cohort-inclusions sentence, in the first card, and not the platform live / roadmap status', () => {
    const text = main('partner-with-us/investors/index.html');
    const inclusions = 'Supported cohorts include mentoring, certification exam preparation and placement support.';
    const statement = 'Cohort inclusions on this page are agreed in each program’s scope.';
    expect(text).toContain(`${inclusions} ${statement}`);
    expect(text.split(statement).length - 1, 'once').toBe(1);
    expect(text).not.toContain('Personalized and adaptive learning is on the roadmap. Cohort inclusions');
    expect(text).not.toMatch(/\b(?:Inclusions and reporting|exam terms)\b/);
    // the platform status cards read as they did, with no qualifier between them
    expect(text).toContain('Partner portals and AI chat are live. Personalized and adaptive learning is on the roadmap.');
  });

  test('Programs: the sentence follows the routing line ("Deciding as an institution? Start with Partner with Us."), not the SuperKids card', () => {
    const text = main('programs/index.html');
    const statement = 'Reporting on this page is agreed in the program scope.';
    const routing = text.indexOf('Deciding as an institution? Start with Partner with Us.');
    const at = text.indexOf(statement);
    expect(routing, 'routing line').toBeGreaterThan(-1);
    expect(at, 'statement').toBeGreaterThan(routing);
    expect(text.split(statement).length - 1, 'once').toBe(1);
    const superkids = text.indexOf('A school can bring these into the classroom, so children build digital skills early.');
    expect(superkids).toBeGreaterThan(-1);
    expect(text.slice(superkids, at)).toContain('Start with Partner with Us.');
    expect(text).not.toContain('so children build digital skills early. Reporting on this page');
  });

  test('Trial page: "This tracking plan is agreed in each program’s scope." closes "How We Track Outcomes", and the page says nothing about inclusions or reporting being agreed', () => {
    const text = main('impact/independent-evaluation/index.html');
    expect(text).toContain('follow-up surveys at 3, 6 and 12 months and monthly reports. ');
    expect(text.split('This tracking plan is agreed in each program’s scope.').length - 1, 'once').toBe(1);
    expect(text).not.toMatch(/(?:Inclusions and reporting|Reporting on this page|exam terms)/);
  });

  test('Employers, JobReady@Work and TalentLEAP promise a progress evaluation or a pilot scorecard, not reports: their sentences name no reporting', () => {
    expect(main('partner-with-us/employers/index.html')).toContain('Inclusions on this page are agreed in the program scope.');
    for (const p of ['programs/jobready-work/index.html', 'our-model/talentleap/index.html']) {
      expect(main(p), p).toContain('Inclusions and exam terms on this page are agreed in the program scope.');
      expect(main(p), p).not.toMatch(/exam terms and reporting/);
    }
    expect(main('partner-with-us/employers/index.html')).not.toMatch(/Inclusions and reporting/);
  });

  test('Home, About and Governance: Home keeps inclusions and reporting but names no exam terms; About and Governance name reporting only', () => {
    expect(main('index.html')).toContain('Inclusions and reporting on this page are agreed in the program scope.');
    expect(main('index.html')).not.toContain('exam terms');
    for (const p of ['about/index.html', 'about/governance/index.html']) {
      const text = main(p);
      expect(text, p).toContain('Reporting on this page is agreed in the program scope.');
      expect(text, p).not.toMatch(/Inclusions (?:and|,)/);
    }
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */
test.describe('WP142 item 3: "&" labels', () => {
  test('Case Studies: the five cards label the partner line "Partner and Place"', () => {
    const raw = html('impact/case-studies/index.html');
    expect(raw.match(/<dt\b[^>]*>Partner and Place<\/dt>/g)?.length).toBe(5);
    expect(decode(raw)).not.toContain('Partner & Place');
  });

  test('sweep: no site-authored " & " label on a built page (fixed names, quotes and citations are allowed, listed below)', () => {
    // Fixed names the site does not author: a citation's authors, a news headline or event title, an award, the National University syllabus module names, the styleguide demo.
    const ALLOWED: Array<[RegExp, RegExp]> = [
      [/^index\.html$/, /Demirci, Hannane & Zhu, 2025/],
      [/^about\/recognition\//, /Cybersecurity & Artificial Intelligence/],
      [/^about\/team\/aziz-ahmad\//, /NYNJMSDC|Minority/],
      [/^programs\/nu-postgraduate-diploma\//, /.*/],
    ];
    const offenders: string[] = [];
    for (const rel of allPages()) {
      if (rel.startsWith('news/') || rel.startsWith('styleguide/')) continue;
      const raw = html(rel);
      if (!mainHtml(raw)) continue;
      const lines = decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, '\n')).split('\n').map((l) => l.trim());
      for (const l of lines) {
        if (!/ & /.test(l)) continue;
        if (ALLOWED.some(([page, pat]) => page.test(rel) && pat.test(l))) continue;
        offenders.push(`${rel}: ${l.slice(0, 90)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the investor introduction-call email asks for "Name and role" (a prefilled-email field label, not "&")', () => {
    const raw = html('partner-with-us/investors/index.html');
    expect(raw).toContain('Name%20and%20role');
    expect(raw).not.toContain('Name%20%26%20role');
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */
test.describe('WP142 item 4: Employers card 2', () => {
  test('the heading and body speak team training: AI content agreed in the needs assessment, before training starts', () => {
    const raw = html('partner-with-us/employers/index.html');
    const text = main('partner-with-us/employers/index.html');
    expect(text).toContain('AI Content Agreed Before Training');
    expect(text).toContain('An AI-ready curriculum, designed to prepare people to work with AI tools. Each track’s AI content is agreed with you before training starts.');
    expect(text).not.toContain('AI Content Agreed Before Enrollment');
    expect(text).not.toContain('work-entry plan');
    expect(text).not.toContain('agreed before enrollment');
    expect(/<h3[^>]*>\s*AI Content Agreed Before Training\s*<\/h3>/.test(raw), 'card heading is an h3').toBe(true);
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */
// Owner rule 2026-10-31/11-01: a page with its OWN "Last updated" / dateModified moves to the day its visible text changes (2026-11-01 today); build-date pages need nothing.
test('Owner rule: the changed pages that carry their own date read 2026-11-01 or later (Case Studies moves; the others already did in WP141)', () => {
  const DAY = '2026-11-01';
  const nodeDate = (raw: string) => {
    const nodes: Record<string, unknown>[] = [];
    for (const m of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const j = JSON.parse(m[1]);
      nodes.push(...(j['@graph'] ?? [j]));
    }
    const own = (suffix: string) => nodes.find((n) => String(n['@id'] ?? '').endsWith(suffix)) as { dateModified?: string } | undefined;
    return (own('#article') ?? own('#webpage'))?.dateModified;
  };
  for (const p of [
    'impact/case-studies/index.html',
    'about/index.html',
    'about/governance/index.html',
    'programs/index.html',
    'impact/independent-evaluation/index.html',
    'partner-with-us/investors/index.html',
  ]) expect(onOrAfter(nodeDate(html(p)), DAY), `${p} JSON-LD dateModified`).toBe(true);
});
