import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP141 (Opus High run 16, kit 108; owner answer 2026-11-01: "as agreed in the program scope", ONCE per page).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp141.spec.ts --project=chromium`.
 *   - Item 1 (the PAGE rule, replacing the sentence-level sweeps of WP112 and WP113): the program-scope qualifier is stated ONCE per page, as its own
 *     short sentence in the page's inclusions band ("... are agreed in the program scope."); the in-sentence copies (and those in FAQ answers, JSON-LD,
 *     meta descriptions and llms.txt, which mirror the page) are gone.
 *   - Item 2 and 3: Our Model "Placement Support" (internships and apprenticeships where employer placements are available) and "Accessible Readiness
 *     Assessment" ("Some applicants may not be selected.").
 *   - Item 4: every "On This Page" box ends with the page's closing H2.
 *   - Item 5: Governments Step 4 drops "Seats are confirmed per program."
 *   - Item 6: Mentors expertise tags read "and", not "&".
 *   - Owner rule: a page with its own "Last updated" / dateModified moves to the day its visible text changes (2026-11-01; build-date pages need nothing).
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
 * The PAGE rule (item 1).
 *
 * Scope: every built HTML page with a <main> except /news/ posts (archive) and /styleguide/ (the design-system demo, whose sample bands are placeholders;
 * the same exemption WP113 had). Redirect stubs have no <main> and are skipped.
 *
 * The qualifier: "program scope" as a word pair (so "a training program scoped to your team" is not one). Two NOUN uses are not the qualifier and are set
 * aside before counting: the discovery-session line ("... priority groups and possible program scope.", DISCOVERY_SESSION_LINE) and Contact's route
 * line ("Program partners: a program scope, designed with you."). Everything else that says "program scope" is the qualifier.
 *
 * (a) no page has the qualifier more than once in the visible text of <main>;
 * (b) every page with an inclusion or reporting PROMISE has exactly one qualifier, and it is the page statement: its own sentence, ending
 *     "are agreed in the program scope.", one of the two allowed forms below;
 * (c) non-vacuous: at least 15 pages are examined, and the core route pages are among them;
 * (d) nothing outside the visible text of <main> carries the qualifier: JSON-LD, meta and og descriptions, llms.txt (they mirror the page).
 *
 * The promise detector (a sentence of the visible text of <main>, split at tag boundaries and at full stops): it mentions monthly report(s) / monthly
 * reporting / progress reports, exam fee(s), certification exam preparation, exam eligibility, "supported (youth) cohorts include", "standard inclusions",
 * follow-up surveys, outcome tracking, or "outcomes are reported", AND it is neither a heading (eight words or fewer, no closing punctuation) nor a
 * timeline step ("monthly reports follow"), which only describes sequence.
 * ------------------------------------------------------------------------------------------------------------------------------------- */
const SCOPE = /\bprogram scope\b/g;
const NOUN_USES = [/priority groups and possible program scope\./g, /Program partners: a program scope, designed with you\./g];
const PROMISE = /monthly reports?\b|monthly reporting|progress reports|exam fees?\b|certification exam preparation|exam eligibility|supported (?:youth )?cohorts include|standard inclusions|follow-up surveys?|outcome tracking|outcomes? (?:are|is) reported/i;
const TIMELINE = /monthly reports follow/i;
const STATEMENT = /^(?:Inclusions and reporting|Inclusions, exam terms and reporting) on this page are agreed in the program scope\.$/;
const heading = (s: string) => !/[.!?]["”]?$/.test(s.trim()) && s.trim().split(/\s+/).length <= 8;

const qualifierCount = (text: string) => (NOUN_USES.reduce((t, re) => t.replace(re, ' '), text).match(SCOPE) ?? []).length;
const isPromise = (s: string) => PROMISE.test(s) && !TIMELINE.test(s) && !heading(s);
const sentences = (text: string) => text.split(/(?<=[.!?])(?:\s+|(?=["”]))/);
/** The sentences of the visible text of <main>: inline tags do not end a segment, block tags do. */
function mainSentences(raw: string): string[] {
  const m = mainHtml(raw);
  if (!m) return [];
  const body = decode(
    m
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/g, '\n')
      .replace(/<style[\s\S]*?<\/style>/g, '\n')
      .replace(/<\/?(?:a|strong|em|span|b|i|abbr|sup|sub|mark|code|small|time)\b[^>]*>/g, '')
      .replace(/<[^>]+>/g, '\n'),
  );
  return body.split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).flatMap(sentences);
}

const inScope = (rel: string) => !rel.startsWith('news/') && !rel.startsWith('styleguide/');
interface Row { page: string; qualifiers: number; statements: string[]; promises: string[] }
function rows(): Row[] {
  const out: Row[] = [];
  for (const rel of allPages()) {
    if (!inScope(rel)) continue;
    const raw = html(rel);
    if (!mainHtml(raw)) continue;
    const ss = mainSentences(raw);
    out.push({
      page: rel,
      qualifiers: qualifierCount(visible(mainHtml(raw)!)),
      statements: ss.filter((s) => STATEMENT.test(s)),
      promises: ss.filter(isPromise),
    });
  }
  return out;
}

test.describe('WP141 item 1: the program-scope qualifier is stated once per page', () => {
  const R = rows();

  test('(a) no page says the qualifier more than once (offenders, with counts)', () => {
    const offenders = R.filter((r) => r.qualifiers > 1).map((r) => `${r.page}: ${r.qualifiers}`);
    expect(offenders).toEqual([]);
  });

  test('(b) every page with an inclusion or reporting promise has exactly one statement, and the statement is the only qualifier on it', () => {
    const offenders = R.filter((r) => r.promises.length > 0 && !(r.statements.length === 1 && r.qualifiers === 1)).map(
      (r) => `${r.page}: ${r.promises.length} promise sentence(s), ${r.statements.length} statement(s), ${r.qualifiers} qualifier(s); e.g. ${r.promises[0]?.slice(0, 110)}`,
    );
    expect(offenders).toEqual([]);
  });

  test('(b2) a page without a promise has no qualifier to state (no stray statement)', () => {
    const offenders = R.filter((r) => r.promises.length === 0 && (r.qualifiers > 0 || r.statements.length > 0)).map((r) => `${r.page}: ${r.qualifiers} qualifier(s)`);
    expect(offenders).toEqual([]);
  });

  test('(c) non-vacuous: at least 15 pages carry a promise, and the core route pages are among them', () => {
    const examined = R.filter((r) => r.promises.length > 0).map((r) => r.page);
    expect(examined.length, `pages examined: ${examined.join(', ')}`).toBeGreaterThanOrEqual(15);
    for (const core of [
      'index.html',
      'partner-with-us/index.html',
      'partner-with-us/development-partners/index.html',
      'partner-with-us/governments/index.html',
      'partner-with-us/foundations/index.html',
      'partner-with-us/universities/index.html',
      'partner-with-us/local-partners/index.html',
      'partner-with-us/employers/index.html',
      'partner-with-us/investors/index.html',
      'programs/youthwide/index.html',
      'programs/jobready-campus/index.html',
      'programs/jobready-work/index.html',
      'our-model/index.html',
      'about/governance/index.html',
    ]) expect(examined, core).toContain(core);
  });

  test('(d) the qualifier appears nowhere outside the visible text of <main>: JSON-LD, meta and og descriptions, llms.txt', () => {
    const offenders: string[] = [];
    for (const r of R) {
      const raw = html(r.page);
      const whole = qualifierCount(decode(raw));
      if (whole !== r.qualifiers) offenders.push(`${r.page}: ${whole - r.qualifiers} more in JSON-LD, meta or other markup`);
    }
    const llms = join(DIST_DIR, 'llms.txt');
    if (existsSync(llms) && qualifierCount(decode(readFileSync(llms, 'utf8'))) > 0) offenders.push('llms.txt');
    expect(offenders).toEqual([]);
  });

  test('the detector: counts the qualifier, sets the two noun uses aside, knows a promise from a timeline step and a heading', () => {
    expect(qualifierCount('Partners receive reports, as agreed in the program scope, and more.')).toBe(1);
    expect(qualifierCount('Inclusions and reporting on this page are agreed in the program scope. Where included in the program scope, it stays.')).toBe(2);
    expect(qualifierCount('A training program scoped to your team.')).toBe(0);
    expect(qualifierCount('A discovery session explores your goals, priority groups and possible program scope.')).toBe(0);
    expect(qualifierCount('Program partners: a program scope, designed with you.')).toBe(0);
    expect(isPromise('Partners receive monthly reports on progress toward paid work.')).toBe(true);
    expect(isPromise('Supported youth cohorts include outreach and selection, training and mentoring.')).toBe(true);
    expect(isPromise('Certification exam preparation (exam fees and attempts set per program).')).toBe(true);
    expect(isPromise('The first cohort begins training; monthly reports follow.')).toBe(false);
    expect(isPromise('Monthly Reports and Follow-Up Surveys')).toBe(false);
    expect(isPromise('A discovery session explores your goals, priority groups and possible program scope.')).toBe(false);
    expect(STATEMENT.test('Inclusions and reporting on this page are agreed in the program scope.')).toBe(true);
    expect(STATEMENT.test('Inclusions, exam terms and reporting on this page are agreed in the program scope.')).toBe(true);
    expect(STATEMENT.test('As agreed in the program scope, partners receive monthly reports.')).toBe(false);
    expect(STATEMENT.test('Exam fees are agreed in the program scope.')).toBe(false);
  });

  test('the statement on each page (page -> sentence)', () => {
    const S1 = 'Inclusions and reporting on this page are agreed in the program scope.';
    const S2 = 'Inclusions, exam terms and reporting on this page are agreed in the program scope.';
    const EXPECTED: Record<string, string> = {
      'index.html': S2,
      'partner-with-us/index.html': S2,
      'partner-with-us/development-partners/index.html': S2,
      'partner-with-us/governments/index.html': S1,
      'partner-with-us/foundations/index.html': S1,
      'partner-with-us/universities/index.html': S2,
      'partner-with-us/local-partners/index.html': S1,
      'partner-with-us/employers/index.html': S1,
      'partner-with-us/investors/index.html': S1,
      'programs/index.html': S1,
      'programs/youthwide/index.html': S2,
      'programs/jobready-campus/index.html': S2,
      'programs/jobready-work/index.html': S2,
      'our-model/index.html': S2,
      'our-model/talentleap/index.html': S2,
      'about/index.html': S1,
      'about/governance/index.html': S1,
      'impact/independent-evaluation/index.html': S1,
    };
    const got = Object.fromEntries(R.filter((r) => r.statements.length > 0).map((r) => [r.page, r.statements[0]]));
    expect(got).toEqual(EXPECTED);
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */
test.describe('WP141 item 1: the in-sentence copies are rewritten (spot checks)', () => {
  test('the positioning statements read without the clause (Home, YouthWIDE, Development Partners, Governments, Universities, JobReady@Campus)', () => {
    expect(main('index.html')).toContain('with monthly reports on progress toward paid work. ');
    expect(main('programs/youthwide/index.html')).toContain('Partners receive monthly reports on progress toward paid work.');
    expect(main('partner-with-us/development-partners/index.html')).toContain('Partners receive monthly reports and outcome tracking after each course.');
    expect(main('partner-with-us/governments/index.html')).toContain('Your agency receives monthly reports on progress toward paid work.');
    expect(main('partner-with-us/universities/index.html')).toContain('Your institution receives monthly reports on progress toward paid work.');
    expect(main('programs/jobready-campus/index.html')).toContain('Institutions receive monthly reports on progress toward paid work.');
  });

  test('exam wording says "set per program", not the clause', () => {
    expect(main('programs/youthwide/index.html')).toContain('including certification exam preparation (exam fees and attempts set per program), then three months of milestone-based mentoring.');
    expect(main('our-model/index.html')).toContain('Certification exam preparation (exam fees and attempts set per program).');
    expect(main('programs/jobready-campus/index.html')).toContain('exam fees, eligibility, attempts and retakes are set per program.');
    expect(main('partner-with-us/index.html')).toContain('certification exam preparation (exam fees and attempts set per program), three months of mentoring');
    expect(main('partner-with-us/development-partners/index.html')).toContain('exam fees and attempts set per program.');
  });

  test('the FAQ structured data equals the visible answer (the shared "How Do You Prove Outcomes?" answer, without the clause)', () => {
    const answer = 'For every cohort, we plan a baseline at enrollment, follow-up surveys at 3, 6 and 12 months and monthly reports.';
    for (const p of ['about/governance/index.html', 'impact/independent-evaluation/index.html']) {
      expect(main(p), p).toContain(answer);
      expect(html(p), `${p} FAQ JSON-LD`).toContain(answer);
    }
  });

  test('"Where included in the program scope" / "where the program scope includes it" become "Where included" / "where the program includes it"', () => {
    for (const p of ['about/governance/index.html', 'partner-with-us/development-partners/index.html', 'partner-with-us/local-partners/index.html']) {
      expect(main(p), p).toContain('Where included, what the program builds stays in place: certified local facilitators and localized curricula.');
    }
    expect(main('partner-with-us/local-partners/index.html')).toContain('so delivery capacity can stay in your community where the program includes it.');
    expect(main('partner-with-us/governments/index.html')).toContain('Where included: Training of Trainers, curriculum and manuals;');
  });

  test('the Home comparison row and the hub due-diligence card read "Included for every cohort: ..."', () => {
    expect(main('index.html')).toContain('Included for every cohort: monthly reports and follow-up surveys at 3, 6 and 12 months');
    expect(main('partner-with-us/index.html')).toContain('Included for every cohort: follow-up surveys at 3, 6 and 12 months and monthly reports.');
  });

  test('wp112b stays: no page says the exam fee is included', () => {
    const FEE = /exam fees? included/i;
    expect(allPages().filter((p) => FEE.test(decode(html(p))))).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */
test.describe('WP141 items 2 and 3: Our Model cards', () => {
  test('2. "Placement Support" makes internships and apprenticeships conditional', () => {
    const text = main('our-model/index.html');
    expect(text).toContain('Support includes assessment-based career advising, resume writing, job-application and interview preparation, job fairs, employer matching and freelance-marketplace onboarding, with internships or apprenticeships where employer placements are available.');
    expect(text).not.toContain('industry internships and apprenticeships');
  });

  test('3. "Accessible Readiness Assessment" says "Some applicants may not be selected." and "Foundation Tracks" keeps its outcomes line', () => {
    const text = main('our-model/index.html');
    expect(text).toContain('Some applicants may not be selected.');
    expect(text).not.toContain('and the reasons are reported');
    expect(text).toContain('Their outcomes are reported by track.');
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */
test.describe('WP141 item 4: "On This Page" ends with the closing H2', () => {
  const txt = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  function toc(rel: string): { links: string[]; closing: string | undefined; hrefs: string[] } | undefined {
    const raw = html(rel);
    const box = /<div[^>]*data-toc[^>]*>([\s\S]*?)<\/details>/.exec(raw)?.[1] ?? /<nav[^>]*aria-label="On this page"[^>]*>([\s\S]*?)<\/nav>/i.exec(raw)?.[1];
    if (!box) return undefined;
    const as = [...box.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
    const h2s = [...(mainHtml(raw) ?? '').matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => txt(m[1])).filter((t) => t !== 'On This Page');
    return { links: as.map((m) => txt(m[2])), hrefs: as.map((m) => m[1]), closing: h2s[h2s.length - 1] };
  }

  test('the five pages the review named list their closing H2 last, and the entry jumps to it', () => {
    for (const [rel, heading] of [
      ['about/governance/index.html', 'Ask About Due Diligence'],
      ['about/recognition/index.html', 'Working on a Story About Youth Employment?'],
      ['about/team/index.html', 'Talk to the Team'],
      ['our-model/jobready-platform/index.html', 'Talk to Us About JobReady'],
      ['our-model/talentleap/index.html', 'See How TalentLEAP Would Run in Your Program'],
    ] as const) {
      const t = toc(rel)!;
      expect(t.links[t.links.length - 1], rel).toBe(heading);
      const id = t.hrefs[t.hrefs.length - 1].replace(/^.*#/, '');
      expect(new RegExp(`<(?:section|aside)[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<h2[^>]*>\\s*${heading.replace(/[?]/g, '\\?')}\\s*</h2>`).test(html(rel)), `${rel}: #${id} is the closing band`).toBe(true);
    }
  });

  test('sweep: on every built page with an "On This Page" box, the last entry is the last H2 (non-vacuous: 12 boxes today)', () => {
    const boxes = allPages().filter(inScope).map((p) => [p, toc(p)] as const).filter(([, t]) => t);
    expect(boxes.length).toBeGreaterThanOrEqual(12);
    const offenders = boxes.filter(([, t]) => t!.links[t!.links.length - 1] !== t!.closing).map(([p, t]) => `${p}: box ends "${t!.links[t!.links.length - 1]}", page ends "${t!.closing}"`);
    expect(offenders).toEqual([]);
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */
test.describe('WP141 items 5 and 6', () => {
  test('5. Governments Step 4 reads "The first cohort begins training; monthly reports follow." and no longer repeats the seats line', () => {
    const text = main('partner-with-us/governments/index.html');
    expect(text).toContain('The first cohort begins training; monthly reports follow.');
    expect(text).not.toContain('monthly reports follow. Seats are confirmed per program.');
  });

  test('6. Mentors expertise tags read "and", never "&"', () => {
    const raw = html('about/mentors/index.html');
    const chips = [...raw.matchAll(/<ul[^>]*class="[^"]*tc__chips[^"]*"[^>]*>([\s\S]*?)<\/ul>/g)].flatMap((m) => [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((c) => decode(c[1].replace(/<[^>]+>/g, '')).trim()));
    expect(chips.length).toBeGreaterThan(20);
    expect(chips.filter((c) => /&/.test(c))).toEqual([]);
    const text = main('about/mentors/index.html');
    for (const t of [
      'WordPress Plugin and SaaS Product Marketing',
      'Go-to-Market (GTM) Strategy and Product Launches',
      'Meta (Facebook and Instagram) Ads',
      'Strategic Team Leadership and Mentoring',
      'Financial Analysis and Reporting',
      'Data Intelligence and Analytics',
      'Advanced Excel and Automation',
    ]) expect(text, t).toContain(t);
  });
});

/* ------------------------------------------------------------------------------------------------------------------------------------- */
// Owner rule 2026-10-31/11-01: a page with its OWN "Last updated" / dateModified moves to the day its visible text changes (2026-11-01 today); build-date pages need nothing.
test('Owner rule: the changed pages that carry their own date read 2026-11-01 or later (JSON-LD dateModified and the visible "Last updated")', () => {
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
  const pages = [
    'about/index.html',
    'about/governance/index.html',
    'about/mentors/index.html',
    'about/recognition/index.html',
    'about/team/index.html',
    'impact/independent-evaluation/index.html',
    'partner-with-us/foundations/index.html',
    'partner-with-us/governments/index.html',
    'partner-with-us/investors/index.html',
    'our-model/index.html',
    'our-model/jobready-platform/index.html',
    'our-model/talentleap/index.html',
    'programs/index.html',
    'programs/jobready-campus/index.html',
    'programs/jobready-work/index.html',
    'programs/youthwide/index.html',
  ];
  for (const p of pages) expect(onOrAfter(nodeDate(html(p)), DAY), `${p} JSON-LD dateModified`).toBe(true);
  for (const p of pages) {
    const stamp = /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(p))?.[1];
    if (stamp) expect(onOrAfter(stamp, DAY), `${p} visible "Last updated"`).toBe(true);
  }
});
