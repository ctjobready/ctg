import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP152 (Opus XHigh run 6, kit 119: 1 Minor, 5 Polish, the principle challenge, and the WP151 backlog).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp152.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Minor, by meaning: whatever text on an audience, program or Our Model page explains how or where training is delivered (blended delivery, existing, government, campus or local labs) names who teaches:
 *      "facilitators trained by CodersTrust (Training of Trainers)" the first time the page explains delivery, "CodersTrust-trained facilitators" later. Development Partners' "Existing Labs and Colleges" card and
 *      Governments' "Government Digital Labs" card now carry the long form; the FAQ and the Governments "Capacity Designed to Stay in Your System" card use the short one. The sweep (section 1) finds the pages
 *      by the delivery wording, not by a list, so a sibling cannot be left for the next run; the pages that explain no facilitator model are exempt by name and reason.
 *   2  Certification, by meaning: every visible block on every built page (News posts and bios aside) that mentions certification is classified. (A) A CodersTrust deliverable says preparation. (B) A third-party
 *      certification, the learner's own certification, a register or scorecard label, a comparison row, a report measure, a modifier of "track" or "cohort" inside a sentence, or "certification-focused"
 *      (training focused on certifications; it does not claim CodersTrust certifies) is fine. A short label or heading (nine words or fewer) never gets the modifier pass, so "Certification Tracks and Placement
 *      Support" and "Industry Certification Tracks" are caught (the WP150 allowlist is gone). Fixed: Governments "Certification Preparation and Placement Support", Universities "Certification Preparation by Track",
 *      Local Partners' lead "a curriculum, certification preparation and links to paid work", the styleguide sample card.
 *   3  Our Model: "Each certification track has 100 training hours, including exam preparation, over 3–6 months." (no "includes ... including").
 *   4  Investors "Connect Learning to Paid Work": the body no longer repeats its heading and has no comma before "through".
 *   5  About timeline 2025–2026: a period, not a semicolon, before "CodersTrust publishes Impact Survey 2026."
 *   6  NU Post Graduate Diploma (overview and four course pages): the "Ready to Apply?" lead is "Submit the application form." (the "Admissions Contacts You" step carries the admissions sentence).
 *   7  Owner date rule: a page with its own "Last updated" or explicit dateModified moves to 2026-11-02 when its visible text changes; build-date pages are 2026-11-01 or later (UTC).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
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
/** Real pages only: the build writes noindex redirect stubs (meta refresh) for the old URLs. */
const realPages = () => allPages().filter((p) => !/http-equiv="refresh"/.test(html(p)));

const OUR_MODEL = 'our-model/index.html';
const ABOUT = 'about/index.html';
const DEV = 'partner-with-us/development-partners/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const LOCAL = 'partner-with-us/local-partners/index.html';
const UNIVERSITIES = 'partner-with-us/universities/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const NU = 'programs/nu-postgraduate-diploma/index.html';
const NU_COURSES = ['cyber-security', 'data-analytics', 'digital-marketing', 'ict'].map((s) => `programs/nu-postgraduate-diploma/${s}/index.html`);
const STYLEGUIDE = 'styleguide/index.html';

const LONG = 'facilitators trained by CodersTrust (Training of Trainers)';
const SHORT = 'CodersTrust-trained facilitators';
const TODAY = '2026-11-02';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 1 Facilitators: the text that explains delivery says who teaches
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** Wording that explains how or where training is delivered: blended delivery, or a named kind of lab. */
const DELIVERY_EXPLAINER = /\bblended\b|\b(?:existing|government|campus|on-campus|local) labs?\b|\blabs? and colleges\b/i;

/** Audience (Partner with Us), program and Our Model pages: the pages the rule covers. */
const inScope = (p: string) => /^partner-with-us\/[^/]+\/index\.html$/.test(p) || /^programs\/[^/]+\/index\.html$/.test(p) || /^programs\/nu-postgraduate-diploma\/[^/]+\/index\.html$/.test(p) || p === OUR_MODEL;

/** Pages in scope whose delivery wording is a summary that points to the program pages (a hub), not an explanation. */
const HUBS = ['partner-with-us/index.html', 'programs/index.html'];

test.describe('1 Facilitators: each page that explains delivery names who teaches', () => {
  /** [page, the delivery card or sentence, in the page order the reader meets it]. The long form is once on the page. */
  const DELIVERY: [string, string][] = [
    [DEV, `How We Reach Them Existing Labs and Colleges Outreach and selection with local partners, then blended delivery in existing labs and colleges by ${LONG}.`],
    [GOVERNMENTS, `How We Reach Them Government Digital Labs Blended learning in government labs you already run, led by ${LONG}; lab access and seats are confirmed per program.`],
    [UNIVERSITIES, `Set Up Campus Labs as Learning Centers On-campus labs become blended-learning centers with ${LONG}; faculty members act as coordinators.`],
    [YOUTHWIDE, `Delivery Blended training in existing labs and colleges, with ${LONG};`],
    [CAMPUS, `Where On-Campus Labs Labs serve as blended-learning centers, with ${LONG} and faculty members as coordinators.`],
    [OUR_MODEL, `Local Labs, Coordinated Delivery After about five months of delivery, programs are designed to run up to 10 certification cohorts in parallel, using existing labs and ${LONG}.`],
    [INVESTORS, `larger programs are designed to run up to 10 cohorts in parallel through ${LONG} in existing labs and colleges.`],
    [LOCAL, `Larger programs are designed to run through ${LONG} in existing labs and colleges, coordinated centrally.`],
  ];

  for (const [p, card] of DELIVERY) {
    test(`${p.split('/').slice(0, -1).join('/')}: the delivery card names the facilitators, and the long form is on the page once`, () => {
      const text = main(p);
      expect(text).toContain(card);
      expect(count(text, LONG)).toBe(1);
      // "CodersTrust-trained facilitators" comes later on the page (JobReady@Campus’ success picture is the one earlier use, pinned by wp149).
      const short = text.indexOf(SHORT);
      if (short >= 0 && p !== CAMPUS) expect(short, `"${SHORT}" comes before the delivery card`).toBeGreaterThan(text.indexOf(LONG));
    });
  }

  test('Development Partners and Governments: the funding-ends answer and the "what stays" card use the short form', () => {
    const dev = main(DEV);
    expect(dev).toContain('What Happens When Funding Ends? Where included, what the program builds stays in place: CodersTrust-trained facilitators and localized curricula. Completers join CodersTrust’s alumni network after their three months of mentoring.');
    expect(dev).not.toContain(`stays in place: ${LONG}`);
    expect(count(dev, SHORT)).toBe(1);
    const gov = main(GOVERNMENTS);
    expect(gov).toContain('Capacity Designed to Stay in Your System Where included: curriculum and manuals; CodersTrust-trained facilitators; and blended learning in existing labs that works with limited connectivity, so rural labs can take part.');
    expect(gov).not.toContain('curriculum and manuals; facilitators trained by CodersTrust');
    expect(count(gov, SHORT)).toBe(2); // the "what stays" card and the funding-ends answer
    // The "Trainers and Curriculum" card keeps naming the Training of Trainers.
    expect(gov).toContain('Trainers and Curriculum Training of Trainers, curriculum and manuals, then preparation for industry certification.');
  });

  test('sweep: every page in scope that explains delivery (by its wording, hubs aside) names the facilitators trained by CodersTrust once, before any short form', () => {
    const swept: string[] = [];
    const offenders: string[] = [];
    for (const p of realPages().filter(inScope)) {
      if (HUBS.includes(p)) continue;
      const text = main(p);
      if (!DELIVERY_EXPLAINER.test(text)) continue;
      swept.push(p);
      if (count(text, LONG) !== 1) offenders.push(`${p}: the long form appears ${count(text, LONG)} times`);
      // The block that carries the long form is itself a delivery explanation (blended delivery or a named kind of lab), not only a funding-ends or "what stays" answer.
      const carrier = blocks(p).find((b) => b.includes(LONG));
      if (!carrier || !DELIVERY_EXPLAINER.test(carrier)) offenders.push(`${p}: the block with the long form is not a delivery explanation: ${carrier?.slice(0, 120)}`);
      const short = text.indexOf(SHORT);
      if (short >= 0 && p !== CAMPUS && short < text.indexOf(LONG)) offenders.push(`${p}: the short form comes before the long form`);
    }
    expect(offenders).toEqual([]);
    // Not vacuous, and it finds the eight pages above.
    expect(swept.sort()).toEqual([...DELIVERY.map(([p]) => p)].sort());
  });

  test('the pages in scope that match no delivery wording explain no facilitator model (exempt by name and reason)', () => {
    const EXEMPT: Record<string, string> = {
      'partner-with-us/foundations/index.html': 'a funding page: it explains the funding routes and says who teaches only in the funding-ends answer',
      'partner-with-us/employers/index.html': 'custom employer workshops built from a needs assessment (JobReady@Work); the site states no facilitator model for them',
      'programs/jobready-work/index.html': 'custom employer workshops (JobReady@Work), as Employers',
      'programs/superkids/index.html': 'a school program of workshops and classes; no facilitator model is stated',
      [NU]: 'National University teaching staff: "On-Campus and Instructor-Led" (a college course)',
    };
    for (const c of NU_COURSES) EXEMPT[c] = 'as the NU overview';
    const unmatched = realPages().filter(inScope).filter((p) => !HUBS.includes(p) && !DELIVERY_EXPLAINER.test(main(p)));
    expect(unmatched.sort()).toEqual(Object.keys(EXEMPT).sort());
  });

  test('none of the delivery cards says "certified" or "local" facilitators', () => {
    for (const [p] of DELIVERY) expect(main(p), p).not.toMatch(/\bcertified[ -]+(?:local )?facilitators?\b|\blocal[ ,-]+(?:\w+ )?facilitators?\b/i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 2 Certification: classify every visible block that mentions it
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** The visible text blocks of a page's <main> (and its title and description): one string per block element, inline elements joined. */
function blocks(rel: string): string[] {
  const raw = html(rel);
  const mainHtml = /<main[\s\S]*<\/main>/.exec(raw)?.[0] ?? '';
  const out = decode(
    mainHtml
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<(?:p|h[1-6]|li|div|section|article|td|th|tr|dt|dd|figcaption|button|summary|label|header|footer|nav|main|aside|blockquote|table|figure)\b[^>]*>|<\/(?:p|h[1-6]|li|div|section|article|td|th|tr|dt|dd|figcaption|button|summary|label|header|footer|nav|main|aside|blockquote|table|figure)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((s) => s.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim())
    .filter(Boolean);
  const title = decode(/<title>([\s\S]*?)<\/title>/.exec(raw)?.[1] ?? '').trim();
  const desc = decode(/<meta name="description" content="([^"]*)"/.exec(raw)?.[1] ?? '').trim();
  return [...new Set([title, desc, ...out].filter(Boolean))];
}

/** News posts and the team and mentor bios are out of the sweep (they report events and careers; none claims CodersTrust certifies). */
const sweptCertification = (p: string) => !/^news\//.test(p) && !/^about\/(?:team|mentors)\/./.test(p);

const CERTIFICATION = /certification|certified|certifying|certify/i;
const PREPARATION = /\bprepar(?:e|es|ed|ing|ation)\b/i;
/** A heading, card title or label: nine words or fewer and no closing full stop. */
const isLabel = (b: string) => b.split(/\s+/).length <= 9 && !/[.!?]$/.test(b);

/** Class (B) rules. Each returns true when the block names something other than a certification CodersTrust awards or delivers. */
const B_RULES: [string, (b: string) => boolean][] = [
  ['certificate (a qualification, a ceremony or a statement), not certification', (b) => !CERTIFICATION.test(b)],
  ['third-party certification or certifying body named', (b) => /Google and Meta Certifications|certifying bodies/.test(b)],
  ['register, scorecard or comparison label', (b) => /^(?:\d+ )?Certification$/.test(b) || /^skill and certification courses delivered$/.test(b)],
  ['report or scorecard measure', (b) => /completion, certification,? (?:and )?placements?|any certification the track offers/.test(b)],
  ['the learner’s own certification', (b) => /industry certification beside (?:the|their) degree|a certification beside the degree|route to industry certification|certifications to add next|Certification is not guaranteed/i.test(b)],
  ['"certification-focused" (training focused on certifications)', (b) => /certification-focused/.test(b)],
  ['modifier of "track" or "cohort" inside a sentence', (b) => !isLabel(b) && /certification[- ](?:tracks?|cohorts?)\b/i.test(b)],
];

type Verdict = { cls: 'A' | 'B' | 'A-unprepared'; reason: string };
function classify(block: string): Verdict | null {
  if (!/certif/i.test(block)) return null;
  if (PREPARATION.test(block)) return { cls: 'A', reason: 'says preparation' };
  for (const [reason, rule] of B_RULES) if (rule(block)) return { cls: 'B', reason };
  return { cls: 'A-unprepared', reason: 'names a CodersTrust deliverable as certification without preparation' };
}

test.describe('2 Certification: every mention is preparation (A) or something that is not a CodersTrust certification (B)', () => {
  test('the rule itself: bare deliverables are caught; preparation, third-party, learner, label and report wordings are not', () => {
    for (const b of [
      'Certification Tracks and Placement Support',
      'Industry Certification Tracks',
      'Certification and Mentoring',
      'Training and Certification',
      'Your organization reaches young people, but a curriculum, certification and links to paid work are hard to build alone.',
      'Certification and one-to-one support.',
      'We award certification to every completer.',
    ]) {
      expect(classify(b)?.cls, b).toBe('A-unprepared');
    }
    for (const b of [
      'Certification Preparation and Placement Support',
      'Certification Preparation by Track',
      'Your organization reaches young people, but a curriculum, certification preparation and links to paid work are hard to build alone.',
      'Trains and Prepares for Certification',
      'Introduction to Digital Marketing with Google and Meta Certifications',
      'Certification',
      '2 Certification',
      'An Industry Certification Beside the Degree',
      'Students who pass the exam add an industry certification beside their degree. Certification is not guaranteed.',
      'Reports are designed to show enrollment, completion, certification, placement and first earnings.',
      'We help partners prepare youth for paid work through mentored, certification-focused training.',
      'Certification tracks chosen from employer demand, then mentoring and placement support toward local, remote and global work.',
      'First Earnings, Not Just Certificates',
      'skill and certification courses delivered',
      'Higher Secondary Certificate (HSC) or Below',
    ]) {
      expect(classify(b)?.cls, b).not.toBe('A-unprepared');
    }
  });

  test('sweep: no block on any built page presents certification as a CodersTrust deliverable without preparation', () => {
    const offenders: string[] = [];
    const tally: Record<string, number> = {};
    let examined = 0;
    for (const p of realPages().filter(sweptCertification)) {
      for (const b of blocks(p)) {
        const v = classify(b);
        if (!v) continue;
        examined++;
        tally[`${v.cls}: ${v.reason}`] = (tally[`${v.cls}: ${v.reason}`] ?? 0) + 1;
        if (v.cls === 'A-unprepared') offenders.push(`${p}: ${b.slice(0, 160)}`);
      }
    }
    expect(offenders).toEqual([]);
    // Not vacuous: dozens of blocks mention certification, in each class.
    expect(examined).toBeGreaterThanOrEqual(80);
    expect(tally['A: says preparation']).toBeGreaterThanOrEqual(40);
    for (const [reason] of B_RULES) expect(tally[`B: ${reason}`] ?? 0, reason).toBeGreaterThan(0);
  });

  test('"certification-focused" is on the hero sentences of at least seven pages (classified fine, unchanged)', () => {
    const pages = realPages().filter(sweptCertification).filter((p) => blocks(p).some((b) => /certification-focused/.test(b)));
    expect(pages.length).toBeGreaterThanOrEqual(7);
  });

  test('Governments: the third card is "Certification Preparation and Placement Support" (the allowlist entry is gone)', () => {
    const text = main(GOVERNMENTS);
    expect(text).toContain('Certification Preparation and Placement Support Certification tracks chosen from employer demand, then mentoring and placement support toward local, remote and global work.');
    expect(text).not.toContain('Certification Tracks and Placement Support');
  });

  test('Universities: the training card is "Certification Preparation by Track"', () => {
    const text = main(UNIVERSITIES);
    expect(text).toContain('Prepare for Certification Certification Preparation by Track 100 training hours per certification, including exam preparation; exam fees, eligibility and attempts are set per program.');
    expect(text).not.toContain('Industry Certification Tracks');
  });

  test('Local Partners: the Challenge lead says "certification preparation"', () => {
    const text = main(LOCAL);
    expect(text).toContain('Connect Your Community to Paid Digital Work Your organization reaches young people, but a curriculum, certification preparation and links to paid work are hard to build alone.');
    expect(text).not.toContain('a curriculum, certification and links to paid work');
  });

  test('the styleguide’s sample "What" card says "Certification preparation and one-to-one support."', () => {
    expect(main(STYLEGUIDE)).toContain('Credential Plus Mentoring Certification preparation and one-to-one support.');
    expect(main(STYLEGUIDE)).not.toContain('Mentoring Certification and one-to-one support.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 3 to 6 Polish and backlog
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test('3 Our Model: "Each certification track has 100 training hours, including exam preparation, over 3–6 months." (no "includes ... including")', () => {
  const text = main(OUR_MODEL);
  expect(text).toContain('Blended Training and Certification Preparation Each certification track has 100 training hours, including exam preparation, over 3–6 months.');
  expect(text).not.toContain('Each certification track includes 100 training hours');
  // The hour sentences of the WP150 rule still say exam preparation; and no sentence on any page reads "includes ..., including".
  const offenders = realPages()
    .filter((p) => !/^news\//.test(p))
    .flatMap((p) => blocks(p).filter((b) => /\bincludes\b[^.;]*,\s*including\b/.test(b)).map((b) => `${p}: ${b.slice(0, 140)}`));
  expect(offenders).toEqual([]);
});

test('4 Investors, "Connect Learning to Paid Work": the body does not repeat the heading and has no comma before "through"', () => {
  const text = main(INVESTORS);
  expect(text).toContain('Connect Learning to Paid Work JobReady is being built to link learners to paid work through mentoring and placement support.');
  expect(text).not.toContain('connect learning to paid work, through');
  expect(text).not.toMatch(/JobReady is being built to connect learning to paid work/);
  expect(text).not.toMatch(/paid work, through mentoring/);
});

test('5 About timeline 2025–2026: a period, not a semicolon, before "CodersTrust publishes Impact Survey 2026."', () => {
  const text = main(ABOUT);
  expect(text).toMatch(/depending on government and donor commitments\. CodersTrust publishes Impact Survey 2026\./);
  expect(text).not.toContain('commitments; CodersTrust publishes');
  // The aim wording itself is unchanged.
  expect(text).toContain('YouthWIDE aims to train 1 million educated youth (Higher Secondary Certificate or above) for digital employment by 2030, in Bangladesh and similar countries in South Asia and the Middle East and North Africa, depending on government and donor commitments.');
});

test.describe('6 NU Post Graduate Diploma: the "Ready to Apply?" lead does not repeat the "Admissions Contacts You" step', () => {
  for (const p of [NU, ...NU_COURSES]) {
    test(p.replace('/index.html', ''), () => {
      const text = main(p);
      expect(text).toContain('Ready to Apply? Submit the application form.');
      expect(text).not.toContain('Submit the application form. Our admissions team will contact you with the next steps.');
      expect(text).toContain('Admissions Contacts You. Our admissions team shares the next steps.');
      expect(text).toContain('Submit the Application Form. It takes you to the standalone application form.');
      // The admissions sentence is said once on the page (the step).
      expect(count(text, /Our admissions team (?:will )?(?:contacts? you|shares)/)).toBe(1);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 7 Owner date rule
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('7 Owner date rule (on or after 2026-11-02 where the page states a date of its own)', () => {
  const stamp = (rel: string) => /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(rel))?.[1];
  const modified = (rel: string) => [...html(rel).matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);

  test('the NU overview and the four course pages (own "Last updated") read 2026-11-02 or later', () => {
    for (const p of [NU, ...NU_COURSES]) {
      expect(stamp(p), `${p} Last updated`).toBeTruthy();
      expect((stamp(p) ?? '') >= TODAY, `${p} Last updated ${stamp(p)}`).toBe(true);
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= TODAY, `${p} dateModified ${d}`).toBe(true);
    }
  });

  test('About, Governments and Investors (explicit dateModified) read 2026-11-02 or later', () => {
    for (const p of [ABOUT, GOVERNMENTS, INVESTORS]) {
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= TODAY, `${p} dateModified ${d}`).toBe(true);
    }
  });

  test('the other changed pages state no date of their own: their dateModified is the build date (UTC), 2026-11-01 or later', () => {
    for (const p of [DEV, UNIVERSITIES, LOCAL, OUR_MODEL]) {
      expect(modified(p).length, `${p} has a dateModified`).toBeGreaterThan(0);
      for (const d of modified(p)) expect(d >= '2026-11-01', `${p} dateModified ${d}`).toBe(true);
    }
  });
});
