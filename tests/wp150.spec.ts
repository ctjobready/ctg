import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP150 (Opus XHigh run 4, kit 117: 1 Minor, 4 Polish).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp150.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Minor + Polish 2, with a site-wide sweep so the class cannot recur: CodersTrust prepares learners for third-party exams and does not certify (WP144), so
 *      (a) no heading names a bare "Certification" as the deliverable ("Certification and Mentoring", "Certification and Internships"): Development Partners' "What We Deliver" card
 *          is "Certification Preparation and Mentoring" and JobReady@Campus' "What" card is "Certification Preparation and Internships";
 *      (b) every "N training hours per certification" on a page is followed, in the same sentence, by "including exam preparation" (or "including certification exam preparation"):
 *          the variants on the current build are only "training hours per certification" (Home, Development Partners, Universities, YouthWIDE, JobReady@Campus, TalentLEAP Q14, the styleguide).
 *   3  Development Partners and Investors: the origin line reads "From a Copenhagen launch to work across Asia, Africa, Europe and the Americas." (Global Reach's wording, from SC-03);
 *      the 16 sits only in the tile. No page shows both the SC-03 tile and the sentence "to work in 16 countries and territories".
 *   4  YouthWIDE "Delivery Base in Bangladesh and the 2030 Aim" states "lab access and seats are confirmed per program" once (the tile caption keeps it; the lead drops it).
 *   5  Foundations Route 2: "The discovery session covers JobReady’s staged rollout."
 *   6  Owner date rule: JobReady@Campus and YouthWIDE (own "Last updated") read 2026-11-01 or later; the other changed pages carry no date of their own or a 2026-11-01 JSON-LD dateModified.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);

function allPages(dir: string = DIST_DIR): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? allPages(p) : n === 'index.html' ? [relative(DIST_DIR, p)] : [];
  });
}

const DEV = 'partner-with-us/development-partners/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const FOUNDATIONS = 'partner-with-us/foundations/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const HOME = 'index.html';
const GLOBAL_REACH = 'impact/global-reach/index.html';

/** The headings of a page (h1 to h6), as the reader reads them. */
const headings = (rel: string) => [...html(rel).replace(/<script[\s\S]*?<\/script>/g, ' ').matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => visible(m[2]));

/**
 * A heading that names a bare "Certification" as something CodersTrust delivers: the word stands alone as an item of a list ("Certification and Mentoring", "Mentoring and Certification",
 * "Training, Certification and Support"), not as the object of "Prepare for" or as a modifier ("Certification Preparation", "Industry Certification Tracks", "Meta Certifications").
 */
const BARE_CERTIFICATION = /(?:^|[,:]\s+|\band\s+|\bplus\s+)Certifications?(?=\s*(?:,|$|\band\b|\bplus\b))/i;

/** "N training hours per certification" (and "N hours per certification") NOT followed, in the same sentence, by ", including exam preparation" / ", including certification exam preparation". */
const HOURS_WITHOUT_PREP = /\b\d+ (?:training )?hours per certification(?!,? including (?:certification )?exam preparation)/gi;
const HOURS_ANY = /\b\d+ (?:training )?hours per certification/gi;

test.describe('1 Sweep: CodersTrust prepares for certification; it does not deliver "Certification"', () => {
  test('the heading rule itself: a bare "Certification" item is caught; "Prepare for Certification", "Certification Preparation …", "… Certification Tracks" and third-party names are not', () => {
    for (const h of ['Certification and Mentoring', 'Certification and Internships', 'Mentoring and Certification', 'Training, Certification and Support']) {
      expect(BARE_CERTIFICATION.test(h), h).toBe(true);
    }
    for (const h of [
      'Certification Preparation and Mentoring',
      'Certification Preparation and Internships',
      'Certification Exam Preparation and Mentoring',
      'Prepare for Certification',
      'Trains and Prepares for Certification',
      'Certification Preparation and Placement Support',
      'Certification Preparation by Track',
      'An Industry Certification Beside the Degree',
      'Introduction to Digital Marketing with Google and Meta Certifications',
      'Skills, Certification Preparation and Mentoring',
      'Blended Training and Certification Preparation',
    ]) {
      expect(BARE_CERTIFICATION.test(h), h).toBe(false);
    }
  });

  test('(a) no built page has a heading with a bare "Certification" as the deliverable', () => {
    const offenders: string[] = [];
    for (const p of allPages()) for (const h of headings(p)) if (BARE_CERTIFICATION.test(h)) offenders.push(`${p}: ${h}`);
    expect(offenders).toEqual([]);
  });

  test('(b) every "N training hours per certification" on a page is followed in its sentence by "including exam preparation"', () => {
    const offenders: string[] = [];
    let compliant = 0;
    for (const p of allPages()) {
      const text = visible(html(p));
      for (const m of text.matchAll(HOURS_WITHOUT_PREP)) offenders.push(`${p}: ${text.slice(m.index, (m.index ?? 0) + 120)}`);
      compliant += count(text, HOURS_ANY);
    }
    expect(offenders).toEqual([]);
    // Not vacuous: the sentence is on Home, Development Partners, Universities, YouthWIDE, JobReady@Campus, TalentLEAP (Q14) and the styleguide at least.
    expect(compliant).toBeGreaterThanOrEqual(7);
  });

  test('Development Partners "What We Deliver": "Certification Preparation and Mentoring", and the 100 hours include exam preparation', () => {
    const text = main(DEV);
    expect(text).toContain(
      'What We Deliver Certification Preparation and Mentoring 100 training hours per certification, including exam preparation, then three months of milestone-based mentoring and placement support.',
    );
    expect(text).not.toContain('Certification and Mentoring');
    expect(headings(DEV)).toContain('Certification Preparation and Mentoring');
  });

  test('Home states exam preparation inside the 100 hours in its "Each Cohort Includes" card', () => {
    const text = main(HOME);
    expect(text).toContain(
      '100 training hours per certification, including exam preparation, followed by three months of milestone-based mentoring and placement support. Each track’s work-entry plan is agreed before enrollment.',
    );
  });

  test('JobReady@Campus "What" card: "Certification Preparation and Internships"', () => {
    const text = main(CAMPUS);
    expect(text).toContain('What Certification Preparation and Internships Preparation for industry-recognized certifications, plus professional internships where employer placements are available.');
    expect(headings(CAMPUS)).toContain('Certification Preparation and Internships');
    expect(headings(CAMPUS)).not.toContain('Certification and Internships');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WP151 (Opus XHigh run 5, kit 118): the WP150 sweep covered headings only and the "per certification" wording only. It now also covers (a) the labels and eyebrows of cards (a bare "Certification" in "Training and Certification", "Curriculum and Certification Take Time to Build")
// and (b) every "N training hours" sentence, whatever its wording ("Each certification track includes 100 training hours ...").
// Allowlisted on purpose: the pilot scorecard's measure labels (Home "Certification", YouthWIDE's measure list: SCORECARD_LABELS, pinned by wp138/wp140: the scorecard reports how many learners certify), the comparison table's criterion rows
// ("Certification" as a row of what each approach offers: Home, styleguide). WP152: "Certification Tracks ..." / "Industry Certification Tracks" left the allowlist (the headings say Preparation; wp152 holds the meaning-based sweep).

const VOID_TAGS = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'path', 'circle', 'rect', 'use', 'line', 'polyline', 'polygon']);
const INLINE_TAGS = /^(?:a|b|strong|em|span|i|time|sup|sub|abbr|small|mark|code)$/;
const LABEL_TAG = /^(?:h[1-6]|dt|th|summary|legend)$/;
const LABEL_CLASS = /(?:eyebrow|label|kicker|__title|__name|__q|__kind)/;
interface Leaf {
  tag: string;
  cls: string;
  text: string;
  /** Classes and ids of the ancestors, for the allowlist. */
  anc: string;
}

/** The leaf elements of a page's <main> (no block child): their tag, class, text and ancestors. */
function leaves(rel: string): Leaf[] {
  const body = (/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ');
  const out: Leaf[] = [];
  const stack: { tag: string; cls: string; id: string; text: string; blocks: number }[] = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*?)(\/?)>|([^<]+)/g)) {
    if (m[5] !== undefined) {
      if (stack.length) stack[stack.length - 1].text += m[5];
      continue;
    }
    const [, close, rawTag, attrs, self] = m;
    const tag = rawTag.toLowerCase();
    if (!close) {
      if (VOID_TAGS.has(tag) || self) continue;
      stack.push({ tag, cls: /class="([^"]*)"/.exec(attrs)?.[1] ?? '', id: /\bid="([^"]*)"/.exec(attrs)?.[1] ?? '', text: '', blocks: 0 });
    } else {
      const el = stack.pop();
      if (!el) continue;
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.text += ` ${el.text} `;
        if (!INLINE_TAGS.test(el.tag)) parent.blocks++;
      }
      const text = decode(el.text).replace(/\s+/g, ' ').trim();
      if (el.blocks === 0 && text) out.push({ tag: el.tag, cls: el.cls, text, anc: stack.map((a) => `${a.cls} ${a.id}`).join(' ') });
    }
  }
  return out;
}

/** The labels of a page: headings, glance and table labels, eyebrows and card titles (leaf text of a heading, dt, th, summary, legend, or an element classed eyebrow, label, kicker, title, name, q or kind). */
const labelTexts = (rel: string): string[] =>
  leaves(rel)
    .filter((l) => LABEL_TAG.test(l.tag) || LABEL_CLASS.test(l.cls))
    .filter((l) => !/\bpsc|\bcmp|\bcompare\b/.test(`${l.cls} ${l.anc}`)) // the pilot scorecard's measure labels and the comparison table's criterion rows
    .map((l) => l.text);

/** A bare "Certification" as an item of a label ("Training and Certification", "Curriculum and Certification Take Time to Build"), not a modifier of Preparation, Exam(s), Track(s) or Course(s). */
const BARE_LABEL = /(?:^|[,:]\s+|\band\s+|\bplus\s+)Certifications?\b(?!\s+(?:Preparation|Exams?|Courses?)\b)/i; // WP152: "Tracks?" left the allowlist (the Governments and Universities headings now say Preparation)

/** "N training hours" (any wording after it): the sentence must say "including exam preparation" or "including certification exam preparation". */
const TRAINING_HOURS = /\b\d+ training hours\b/g;
const EXAM_PREP = /including (?:certification )?exam preparation/;

test.describe('7 WP151: the sweep covers card labels and eyebrows, and every "N training hours" sentence', () => {
  test('the label rule itself: "Training and Certification" and "Curriculum and Certification Take Time to Build" are caught; every preparation, track, course and third-party wording is not', () => {
    for (const h of ['Training and Certification', 'Curriculum and Certification Take Time to Build', 'Certification and Mentoring', 'Mentoring, Certification and Support', 'Certification', 'Certification Tracks and Placement Support']) { // WP152: a "Certification Tracks" heading is caught now ("Industry Certification Tracks" is caught by wp152’s meaning-based sweep)
      expect(BARE_LABEL.test(h), h).toBe(true);
    }
    for (const h of [
      'Training and Certification Preparation',
      'Curriculum and Certification Preparation Take Time to Build',
      'Certification Preparation and Mentoring',
      'Certification Exam Preparation and Mentoring',
      'Certification Preparation and Placement Support',
      'Certification Preparation by Track',
      'Prepare for Certification',
      'Trains and Prepares for Certification',
      'Skills, Certification Preparation and Mentoring',
      'An Industry Certification Beside the Degree',
      'Introduction to Digital Marketing with Google and Meta Certifications',
      'skill and certification courses delivered',
      'First Earnings, Not Just Certificates',
    ]) {
      expect(BARE_LABEL.test(h), h).toBe(false);
    }
  });

  test('(a) no built page has a heading, glance label, eyebrow or card title with a bare "Certification" as the deliverable', () => {
    const offenders: string[] = [];
    let examined = 0;
    for (const p of allPages()) {
      for (const t of labelTexts(p)) {
        if (/certif/i.test(t)) examined++;
        if (BARE_LABEL.test(t)) offenders.push(`${p}: ${t}`);
      }
    }
    expect(offenders).toEqual([]);
    expect(examined, 'not vacuous: many labels mention certification').toBeGreaterThanOrEqual(15);
  });

  test('(b) every "N training hours" sentence, whatever its wording, says "including exam preparation"', () => {
    const offenders: string[] = [];
    let compliant = 0;
    for (const p of allPages()) {
      const text = visible(html(p));
      for (const m of text.matchAll(TRAINING_HOURS)) {
        const rest = text.slice(m.index ?? 0);
        const end = rest.search(/\.(?:\s|$)/);
        const sentence = end < 0 ? rest : rest.slice(0, end);
        if (EXAM_PREP.test(sentence)) compliant++;
        else offenders.push(`${p}: ${sentence.slice(0, 140)}`);
      }
    }
    expect(offenders).toEqual([]);
    // Home, Development Partners, Universities, YouthWIDE, JobReady@Campus, TalentLEAP (Q14), Our Model and the styleguide.
    expect(compliant).toBeGreaterThanOrEqual(8);
  });

  test('JobReady@Campus glance label is "Training and Certification Preparation"; Local Partners’ first pain is "Curriculum and Certification Preparation Take Time to Build"', () => {
    expect(labelTexts(CAMPUS)).toContain('Training and Certification Preparation');
    expect(labelTexts(CAMPUS)).not.toContain('Training and Certification');
    expect(labelTexts('partner-with-us/local-partners/index.html')).toContain('Curriculum and Certification Preparation Take Time to Build');
  });
});

test.describe('3 The origin line on Development Partners and Investors does not repeat the 16 tile', () => {
  const LINE = 'From a Copenhagen launch to work across Asia, Africa, Europe and the Americas.';
  const REGIONS = 'across Asia, Africa, Europe and the Americas';

  test('Global Reach carries the wording the line borrows, verbatim', () => {
    expect(main(GLOBAL_REACH)).toContain(`CodersTrust has worked in 16 countries and territories ${REGIONS}, including Bangladesh since 2014`);
  });

  for (const [name, rel] of [['Development Partners', DEV], ['Investors', INVESTORS]] as const) {
    test(`${name}: the band says "${LINE}" and keeps the 16 in the tile only`, () => {
      const text = main(rel);
      expect(text).toContain(LINE);
      expect(text).not.toContain('to work in 16 countries and territories');
      expect(count(text, '16 countries and territories')).toBe(1); // the tile only
      expect(text).toContain('16 countries and territories where CodersTrust has worked');
    });
  }

  test('site-wide: a page that shows the SC-03 tile does not also say "to work in 16 countries and territories"', () => {
    const offenders = allPages().filter((p) => {
      const text = main(p);
      return text.includes('countries and territories where CodersTrust has worked') && text.includes('to work in 16 countries and territories');
    });
    expect(offenders).toEqual([]);
  });

  test('the pages without the tile keep the sentence (Governments, Foundations, Universities, Employers)', () => {
    for (const p of ['governments', 'foundations', 'universities', 'employers']) {
      expect(main(`partner-with-us/${p}/index.html`), p).toContain('From a Copenhagen launch to work in 16 countries and territories.');
    }
  });
});

test.describe('4 YouthWIDE: "lab access and seats are confirmed per program" is stated once', () => {
  const Q = 'lab access and seats are confirmed per program';
  test('the Bangladesh band lead drops the clause; the tile caption keeps it (once on the page)', () => {
    const raw = /<section[^>]*id="governments"[\s\S]*?<\/section>/.exec(html(YOUTHWIDE))?.[0] ?? '';
    const band = visible(raw);
    expect(band).toContain('Delivery Base in Bangladesh and the 2030 Aim');
    expect(band).toContain('Designed for delivery through existing government digital labs and colleges.');
    expect(band).toContain(`In Bangladesh; ${Q}.`);
    expect(count(band, Q)).toBe(1);
    expect(count(main(YOUTHWIDE), Q)).toBe(1);
  });
});

test.describe('5 Foundations Route 2 names the first step a discovery session', () => {
  test('"The discovery session covers JobReady’s staged rollout." replaces "The first conversation covers ..."', () => {
    const text = main(FOUNDATIONS);
    expect(text).toContain('Youth-program outcomes are not platform outcomes. The discovery session covers JobReady’s staged rollout.');
    expect(text).not.toContain('The first conversation covers JobReady');
  });
});

test.describe('6 Owner date rule', () => {
  test('JobReady@Campus and YouthWIDE (own "Last updated") read 2026-11-01 or later; Investors and Foundations dateModified is 2026-11-01 or later', () => {
    for (const p of [CAMPUS, YOUTHWIDE]) {
      const stamp = /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(p))?.[1];
      expect(stamp, `${p} Last updated`).toBeTruthy();
      expect((stamp ?? '') >= '2026-11-01', `${p} Last updated ${stamp}`).toBe(true);
    }
    for (const p of [HOME, DEV, INVESTORS, FOUNDATIONS, CAMPUS, YOUTHWIDE]) {
      for (const m of html(p).matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)) expect(m[1] >= '2026-11-01', `${p} dateModified ${m[1]}`).toBe(true);
    }
  });
});
