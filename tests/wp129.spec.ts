import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { faqs } from '../src/data/faqs';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP129 (Opus High run 4, kit 96, and the owner answers of 2026-10-31). Written test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp129.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  The 100 training hours include certification exam preparation (owner answer): YouthWIDE, JobReady@Campus, Universities and TalentLEAP say "including"; no page says "then exam preparation"
 *   2  The two Korail learner-story headlines end with a period inside the quotation marks (Stories page, UNDP YES case study)
 *   3  Impact, evidence table, Learner Stories row: "one story is an outlier, and its card says so." (one story card carries the label)
 *   4  Recognition: the H1 lead opens with the HolonIQ listing
 *   5  Employers and JobReady@Work: "A discovery session is a conversation, not a commitment."; the hiring track's first step is "Discovery Session"
 *   6  "Last updated" (and JSON-LD dateModified) move to 2026-10-31 on every dated page whose visible text changed (owner rule: any visible text change, copy edits included)
 *   7  YouthWIDE trial chart caption: "(November–December 2021)"
 *   8  SuperKids: no "K-12"; the H2 is "A School STEAM Program for Young Learners" (owner answer: SuperKids is for young learners)
 *   9  Home, "Choose Where to Start", Option 1: one sentence
 */

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
/** Visible text on one line: scripts and styles dropped, every tag a space, entities decoded, space before punctuation closed. */
const visible = (raw: string) =>
  decode(raw.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
const text = (rel: string) => visible(html(rel));
const metaContent = (raw: string, key: 'description' | 'og:description' | 'twitter:description') => {
  for (const tag of raw.match(/<meta\b[^>]*>/g) ?? []) {
    if (new RegExp(`(?:name|property)="${key}"`).test(tag)) return decode(/content="([^"]*)"/.exec(tag)?.[1] ?? '');
  }
  return '';
};
function jsonStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => jsonStrings(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => jsonStrings(n, out));
  return out;
}
/** Every string of every JSON-LD block of one built page. */
function jsonLdStrings(raw: string): string[] {
  const out: string[] = [];
  for (const m of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      out.push(...jsonStrings(JSON.parse(m[1])));
    } catch {
      out.push(m[1]);
    }
  }
  return out;
}
/** The "dateModified" values of one built page's JSON-LD. */
const dateModified = (raw: string) => [...raw.matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
const LLMS = join(DIST_DIR, 'llms.txt');
const llms = () => (existsSync(LLMS) ? decode(readFileSync(LLMS, 'utf8')) : '');
const read = (p: { file: string }) => readFileSync(p.file, 'utf8');
/** Everything a built page says: its visible text, meta descriptions and every JSON-LD string. */
const everything = (raw: string) => [visible(raw), ...(['description', 'og:description', 'twitter:description'] as const).map((k) => metaContent(raw, k)), ...jsonLdStrings(raw)];
/** The sentences of a text (a period, then a space and a capital, ends one; a semicolon does not). */
const sentences = (t: string) => t.split(/(?<=\.)\s+(?=[A-Z“"])/);

// ---------------------------------------------------------------------------------------------------------------------------------
// 1. The 100 training hours include certification exam preparation
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 1: the 100 training hours per certification include exam preparation', () => {
  const YOUTHWIDE =
    '100 training hours per certification, including certification exam preparation (exam fees and attempts as agreed in the program scope), then three months of milestone-based mentoring.';
  const CAMPUS =
    '100 training hours per certification, including certification exam preparation, then three months of milestone-based mentoring; exam fees, eligibility, attempts and retakes are agreed in the program scope.';
  const UNIVERSITIES = '100 training hours per certification, including exam preparation; eligibility, attempts and terms are agreed in the program scope.';
  const Q14 =
    'Compared with a self-paced course alone, supported CodersTrust cohorts add mentoring, certification exam preparation and placement support. As agreed in the program scope, every supported TalentLEAP cohort pairs 100 training hours per certification, including certification exam preparation (with exam fees and attempts), with three months of milestone-based mentoring, placement support and outcome tracking for 12 months after each course.';

  test('YouthWIDE at a Glance, "Training and Mentoring"', () => {
    expect(text('programs/youthwide/index.html')).toContain(YOUTHWIDE);
  });
  test('JobReady@Campus at a Glance, "Training and Certification"', () => {
    expect(text('programs/jobready-campus/index.html')).toContain(CAMPUS);
  });
  test('Universities, "Industry Certification Tracks"', () => {
    expect(text('partner-with-us/universities/index.html')).toContain(UNIVERSITIES);
  });
  test('TalentLEAP: the course-platform FAQ answer (register Q14), on the page and in its FAQ JSON-LD', () => {
    expect(faqs.find((f) => f.id === 'Q14')?.a).toBe(Q14);
    const raw = html('our-model/talentleap/index.html');
    expect(visible(raw)).toContain(Q14);
    expect(jsonLdStrings(raw)).toContain(Q14);
  });
  test('Our Model keeps the pipeline that places "Prepare for Certification" inside the Learn stage of a track that includes the 100 hours (guard; passes before the change)', () => {
    const t = text('our-model/index.html');
    expect(t).toContain('Each certification track includes 100 training hours over 3–6 months.');
    expect(t).toContain('Blended Training and Certification Preparation');
    expect(t).toContain('Prepare for Certification');
  });
  test('no built page, meta description, JSON-LD string or llms.txt says "then exam preparation" or "then certification exam preparation"', () => {
    const offenders: string[] = [];
    for (const p of listPages()) {
      for (const s of everything(read(p))) {
        if (/\bthen (?:certification )?exam preparation/i.test(s)) offenders.push(p.route);
      }
    }
    if (/\bthen (?:certification )?exam preparation/i.test(llms())) offenders.push('llms.txt');
    expect([...new Set(offenders)]).toEqual([]);
  });
  test('every sentence that gives the 100 hours and mentions exam preparation says "including" (every page, its meta and JSON-LD, and llms.txt)', () => {
    const offenders: string[] = [];
    let seen = 0;
    const check = (where: string, t: string) => {
      for (const s of sentences(t)) {
        if (/\b100 training hours\b|\b100 hours\b/.test(s) && /exam preparation/i.test(s)) {
          seen += 1;
          if (!/including (?:certification )?exam preparation/i.test(s)) offenders.push(`${where}: ${s.slice(0, 160)}`);
        }
      }
    };
    for (const p of listPages()) for (const s of everything(read(p))) check(p.route, s);
    check('llms.txt', llms());
    expect(seen).toBeGreaterThanOrEqual(4);
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 2. The Korail story headlines end with a period
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 2: the Korail learner-story headlines end with a period inside the quotation marks', () => {
  /** The headline paragraphs of the story cards (`ls__outcome` in LearnerStory, `sc__outcome` in StoryGallery). */
  const headlines = (raw: string) => [...raw.matchAll(/<p class="[^"]*\b(?:ls__outcome|sc__outcome)\b[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => visible(m[1]));
  const AKLIMA = '“Earned $600 in 3 months.”';
  const SHAMIM_CARD = '“Earned $32K in 3 years.” (about $32,000)';
  const SHAMIM_STORY = '“Earned $32K in 3 years.”';

  test('Stories page: both cards', () => {
    const h = headlines(html('impact/stories/index.html'));
    expect(h).toContain(AKLIMA);
    expect(h).toContain(SHAMIM_CARD);
  });
  test('UNDP YES Korail case study: both learner cards', () => {
    const h = headlines(html('impact/case-studies/undp-yes-korail/index.html'));
    expect(h).toContain(AKLIMA);
    expect(h).toContain(SHAMIM_STORY);
  });
  test('extends WP128 item 8: on every built page a quotation headline ends with a period, "!", "?" or an ellipsis inside the closing quotation mark (a parenthetical may follow)', () => {
    const bad: string[] = [];
    let quotations = 0;
    for (const p of listPages()) {
      if (p.route === '/styleguide/') continue;
      for (const h of headlines(read(p))) {
        if (!/^[“"]/.test(h)) continue;
        quotations += 1;
        if (!/[.!?…][”"](?: \([^)]*\))?$/.test(h)) bad.push(`${p.route}: ${h}`);
      }
    }
    expect(quotations).toBeGreaterThan(10);
    expect(bad).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 3. Impact evidence table: one outlier story
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 3: Impact says one story is an outlier', () => {
  test('the Learner Stories row reads "one story is an outlier, and its card says so."; no built page says "some stories are outliers"', () => {
    expect(text('impact/index.html')).toContain('A typical or promised outcome; one story is an outlier, and its card says so.');
    const offenders = listPages().filter((p) => visible(read(p)).includes('some stories are outliers')).map((p) => p.route);
    expect(offenders).toEqual([]);
  });
  test('exactly one story card carries an outlier label (Shamim Ahmed), on the Stories page and on the Korail case study (guard; passes before the change)', () => {
    const label = /Individual story; an outlier, not typical\./g;
    for (const route of ['impact/stories/index.html', 'impact/case-studies/undp-yes-korail/index.html']) {
      expect(visible(html(route)).match(label)?.length, route).toBe(1);
    }
    const others = listPages().filter((p) => !p.route.startsWith('/impact/stories/') && !p.route.startsWith('/impact/case-studies/undp-yes-korail/') && label.test(visible(read(p)))).map((p) => p.route);
    expect(others).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 4. Recognition lead
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 4: the Recognition H1 lead opens with the listing', () => {
  test('lead text', () => {
    const t = text('about/recognition/index.html');
    expect(t).toContain(
      'CodersTrust was listed in the HolonIQ South Asia EdTech 100 in 2023 and 2024. Its Co-Founder and Chairman, Aziz Ahmad, has received appointments and honors, and CodersTrust’s work has been covered in the press.',
    );
    expect(t).not.toContain('has received appointments and honors, and its work has been covered');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 5. Discovery session wording on the Employers and JobReady@Work pages
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 5: the first step is a "discovery session" on both routes', () => {
  test('Employers closing band: "A discovery session is a conversation, not a commitment."; no page says "Your first step is a conversation, not a commitment."', () => {
    const raw = html('partner-with-us/employers/index.html');
    expect(visible(raw)).toContain('A discovery session is a conversation, not a commitment.');
    const offenders = listPages().filter((p) => visible(read(p)).includes('Your first step is a conversation, not a commitment.')).map((p) => p.route);
    expect(offenders).toEqual([]);
  });
  for (const route of ['partner-with-us/employers/index.html', 'programs/jobready-work/index.html']) {
    test(`${route}: the hiring track's first step is "Step 1: Discovery Session" (both tracks name it so)`, () => {
      const t = text(route);
      expect(t.match(/Step 1: Discovery Session/g)?.length, route).toBe(2);
      expect(t).not.toMatch(/Step 1: Discovery(?! Session)/);
      expect(t).toContain('Step 1: Discovery Session A conversation about the roles you want to fill, to scope your talent request.');
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 6. "Last updated" and dateModified
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 6: every dated page whose visible text changed carries 2026-10-31', () => {
  // Owner rule (2026-10-31): a page's "Last updated" date, and its JSON-LD dateModified, change whenever visible text on the page changes, copy edits included.
  // Pages that print "Last updated": the program pages, the NU Post Graduate Diploma pages, the evidence pages and the legal pages.
  const STAMPED: [string, string][] = [
    ['about/governance/index.html', 'gov-updated'],
    ['accessibility/index.html', 'lf-updated'],
    ['our-model/talentleap/index.html', 'lf-updated'],
    ['our-model/jobready-platform/index.html', 'lf-updated'],
    ['privacy-policy/index.html', 'lf-updated'],
    ['programs/youthwide/index.html', 'updated'],
    ['programs/jobready-campus/index.html', 'updated'],
    ['programs/jobready-work/index.html', 'updated'],
    ['programs/superkids/index.html', 'updated'],
    ['programs/nu-postgraduate-diploma/index.html', 'updated'],
    ['programs/nu-postgraduate-diploma/cyber-security/index.html', 'updated'],
    ['programs/nu-postgraduate-diploma/data-analytics/index.html', 'updated'],
    ['programs/nu-postgraduate-diploma/digital-marketing/index.html', 'updated'],
    ['programs/nu-postgraduate-diploma/ict/index.html', 'updated'],
  ];
  for (const [route, cls] of STAMPED) {
    test(`${route} reads "Last updated October 31, 2026" and its JSON-LD dateModified is 2026-10-31`, () => {
      const raw = html(route);
      const m = new RegExp(`<p class="${cls}[^"]*"[^>]*>([\\s\\S]*?)</p>`).exec(raw);
      expect(visible(m?.[1] ?? '')).toBe('Last updated October 31, 2026');
      expect(raw).toMatch(/<time datetime="2026-10-31"/);
      expect(dateModified(raw)).toContain('2026-10-31');
      expect(dateModified(raw).filter((d) => d < '2026-10-31')).toEqual([]);
    });
  }

  // Pages that print no date but pin their own JSON-LD dateModified (the others use the build date and need nothing).
  const JSONLD_ONLY = [
    'about/index.html',
    'about/recognition/index.html',
    'about/team/fahim-sheikh/index.html',
    'about/team/ferdinand-kjaerulff/index.html',
    'impact/index.html',
    'impact/stories/index.html',
    'impact/global-reach/index.html',
    'impact/in-the-field/index.html',
    'impact/case-studies/kosovo-women-in-online-work/index.html',
    'impact/case-studies/undp-yes-korail/index.html',
    'partner-with-us/foundations/index.html',
    'partner-with-us/governments/index.html',
    'partner-with-us/investors/index.html',
    'programs/index.html',
  ];
  for (const route of JSONLD_ONLY) {
    test(`${route} pins its own JSON-LD dateModified to 2026-10-31`, () => {
      expect(dateModified(html(route))).toContain('2026-10-31');
    });
  }

  // Dated pages whose visible text did not change since their date keep it (guard tests; they pass before the change).
  const KEEP: [string, string][] = [
    ['impact/outcomes-2026/index.html', '2026-10-29'],
    ['about/team/abdul-karim/index.html', '2026-10-29'],
    ['about/team/faruque-hossain/index.html', '2026-10-29'],
    ['impact/case-studies/her-power/index.html', '2026-10-10'],
    ['impact/case-studies/wsdfm-women-freelancers/index.html', '2026-10-10'],
    ['impact/case-studies/digital-jobs-albania/index.html', '2026-10-10'],
  ];
  for (const [route, day] of KEEP) {
    test(`${route} keeps ${day} (its text did not change; guard)`, () => {
      expect(dateModified(html(route))).toContain(day);
      expect(dateModified(html(route))).not.toContain('2026-10-31');
    });
  }

  test('every visible "Last updated" date equals the page’s own JSON-LD date (no page shows one date and declares another)', () => {
    const bad: string[] = [];
    for (const p of listPages()) {
      const raw = read(p);
      const m = /<time datetime="(\d{4}-\d{2}-\d{2})"[^>]*>[^<]*<\/time>/.exec(/Last updated[\s\S]{0,200}/.exec(raw)?.[0] ?? '');
      if (m && !dateModified(raw).includes(m[1])) bad.push(`${p.route}: ${m[1]} against ${dateModified(raw).join(', ')}`);
    }
    expect(bad).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 7. YouthWIDE trial chart caption
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 7: the trial chart caption spells the months out', () => {
  test('YouthWIDE: "Employment at Follow-Up (November–December 2021), Randomized Trial"; no built page abbreviates the range', () => {
    expect(text('programs/youthwide/index.html')).toContain('Employment at Follow-Up (November–December 2021), Randomized Trial');
    const offenders: string[] = [];
    for (const p of listPages()) for (const s of everything(read(p))) if (/Nov(?:\.|ember)?\s?[–-]\s?Dec\.? 2021/.test(s) && !/November–December 2021/.test(s)) offenders.push(p.route);
    expect([...new Set(offenders)]).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 8. SuperKids is for young learners
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 8: SuperKids says "young learners", not K-12', () => {
  test('the H2 reads "A School STEAM Program for Young Learners"', () => {
    const raw = html('programs/superkids/index.html');
    const h2 = [...raw.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => visible(m[1]));
    expect(h2).toContain('A School STEAM Program for Young Learners');
    expect(h2).not.toContain('A K-12 STEAM Program Offered Through Schools');
  });
  test('no "K-12" in SuperKids copy, meta descriptions or JSON-LD', () => {
    const raw = html('programs/superkids/index.html');
    expect(everything(raw).filter((s) => /K-12|K–12/.test(s))).toEqual([]);
    expect(raw.replace(/<script[\s\S]*?<\/script>/g, '')).not.toMatch(/K-12|K–12/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 9. Home, "Choose Where to Start", Option 1
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP129 item 9: Home’s Option 1 is one sentence', () => {
  test('"Prove the model in one country or region." and nothing after it; the second sentence is on no built page', () => {
    const t = text('index.html');
    expect(t).toMatch(/Option 1 Multi-Cohort Pilot Program 1,000–2,500 trainees .{0,200}Prove the model in one country or region\. Option 2/);
    const offenders = listPages().filter((p) => visible(read(p)).includes('Scope the number of cohorts and trainees')).map((p) => p.route);
    expect(offenders).toEqual([]);
  });
});
