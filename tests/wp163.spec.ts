import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DELIVERY_MODEL } from '../src/data/copy';
import { faqs } from '../src/data/faqs';
import { fact } from '../src/data/facts';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP163 (owner answers of 3 November 2026). Run `npm run build`, then `PORT=4913 npx playwright test tests/wp163.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Exam fee (PD-02, PD-02a): the program fee includes ONE certification exam fee per trainee. Every standard-inclusion list says "certification exam preparation and one exam fee per trainee (any further attempts set per
 *      program)"; the certification cards that also name eligibility say "one exam fee per trainee" and "exam eligibility and any further attempts are set per program". The 1 November wording "(exam fees and attempts set per
 *      program)" is in no built file, and no page names an exam fee without "one ... per trainee" (no unlimited attempts, no guaranteed certification).
 *   2  Delivery model: an AI-supported flipped classroom (all lectures pre-recorded, an AI Tutor for every learner, mentors' time on Q&A and handholding beyond the AI Tutor). It is stated ONCE on each page that describes the
 *      program or offer (DELIVERY_MODEL, src/data/copy.ts), and in the FAQ answer about how training works (Q14). "Three months of mentoring" stays.
 *   3  PD-06: lectures are pre-recorded, so no lecture class size is published (labs of 20 stay in the register).
 *   4  No capability carries a live, pre-launch, planned or roadmap label in any built page, its structured data, its meta description or llms.txt; the JobReady Platform table lists capabilities with no Status column
 *      and names the AI capabilities the investor deck describes (the R8-m4 exclusion of an AI tutor and an AI career coach is lifted by the owner).
 *   5  Dates: every page whose visible text changed in this package says 2026-11-03 ("Last updated" and JSON-LD dateModified).
 */

const TODAY = '2026-11-03';
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;| /g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const mainOf = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);
const ldText = (rel: string) => [...html(rel).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => decode(m[1])).join('\n');
type Node = Record<string, unknown>;
const ld = (rel: string): Node[] =>
  [...html(rel).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const j = JSON.parse(m[1]) as Node;
    return ((j['@graph'] as Node[] | undefined) ?? [j]) as Node[];
  });
const nodeOf = (rel: string, type: string): Node => {
  const n = ld(rel).find((x) => [x['@type']].flat().includes(type));
  expect(n, `${rel} has a ${type} node`).toBeTruthy();
  return n as Node;
};
const dateModified = (rel: string) => [...html(rel).matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
/** Every built page's file, relative to dist (redirect stubs excluded), plus llms.txt. */
const builtPages = () => listPages().map((p) => p.file.slice(DIST_DIR.length + 1));
/** A page's visible text, its structured data and its meta descriptions, the places a reader or a crawler gets its words from. */
const everything = (rel: string) => {
  const raw = html(rel);
  const metas = [...raw.matchAll(/<meta (?:name|property)="(?:description|og:description|twitter:description|og:image:alt|twitter:image:alt)" content="([^"]*)"/g)].map((m) => decode(m[1]));
  return [visible(raw), ldText(rel), ...metas].join('\n');
};

const HUB = 'partner-with-us/index.html';
const OUR_MODEL = 'our-model/index.html';
const TALENTLEAP = 'our-model/talentleap/index.html';
const PLATFORM = 'our-model/jobready-platform/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const WORK = 'programs/jobready-work/index.html';
const DEV = 'partner-with-us/development-partners/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const FOUNDATIONS = 'partner-with-us/foundations/index.html';
const EMPLOYERS = 'partner-with-us/employers/index.html';
const UNIVERSITIES = 'partner-with-us/universities/index.html';
const LOCAL = 'partner-with-us/local-partners/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const STYLEGUIDE = 'styleguide/index.html';

const EXAM_INCLUSION = 'certification exam preparation and one exam fee per trainee (any further attempts set per program)';
const OLD_EXAM = 'exam fees and attempts set per program';

/* ---------------------------------------------------------------------------------------------- */
/* 1. One exam fee per trainee                                                                     */
/* ---------------------------------------------------------------------------------------------- */

test.describe('1. the program fee includes one certification exam fee per trainee', () => {
  test('the register rows say it: PD-02 lists the new inclusion and PD-02a is the one-fee sentence', () => {
    expect(fact('PD-02').text).toContain(`· ${EXAM_INCLUSION} ·`);
    expect(fact('PD-02').text).not.toContain(OLD_EXAM);
    expect(fact('PD-02a').text).toBe('The program fee includes one certification exam fee per trainee; any further attempts are set per program');
  });

  test('every standard-inclusion list says the new inclusion: the partner hub cost answer (page and FAQ JSON-LD)', () => {
    const text = mainOf(HUB);
    expect(text).toContain(`Supported youth cohorts include outreach and selection, training, ${EXAM_INCLUSION}, three months of mentoring, placement support and 12 months of outcome tracking after each course.`);
    expect(ldText(HUB)).toContain(EXAM_INCLUSION);
  });

  test('the TalentLEAP stage pipeline (Our Model and TalentLEAP, and TalentLEAP’s step list in JSON-LD)', () => {
    const step = 'Prepare for Certification Certification exam preparation and one exam fee per trainee (any further attempts set per program).';
    expect(mainOf(OUR_MODEL)).toContain(step);
    expect(mainOf(TALENTLEAP)).toContain(step);
    expect(ldText(TALENTLEAP)).toContain('"name":"Prepare for Certification","description":"Certification exam preparation and one exam fee per trainee (any further attempts set per program)."');
  });

  test('YouthWIDE’s glance row and the Development Partners portfolio card', () => {
    expect(mainOf(YOUTHWIDE)).toContain(`Training and Mentoring 100 training hours per certification, including ${EXAM_INCLUSION}, then three months of milestone-based mentoring.`);
    expect(mainOf(DEV)).toContain(`Training, Mentoring and Placement Support Certification exam preparation and one exam fee per trainee (any further attempts set per program), three months of mentoring and placement support in one program.`);
  });

  test('the styleguide’s Standard Inclusions list (from PD-02) and comparison cell', () => {
    const text = mainOf(STYLEGUIDE);
    expect(text).toContain('Standard Inclusions Outreach and selection AI-supported blended training AI-ready curriculum Certification exam preparation and one exam fee per trainee (any further attempts set per program) Three months of mentoring');
    expect(text).toContain('Certification Certification exam preparation and one exam fee per trainee (any further attempts set per program) Varies Often sold separately');
  });

  test('the certification cards that also name exam eligibility: JobReady@Campus, Universities and JobReady@Work', () => {
    expect(mainOf(CAMPUS)).toContain('100 training hours per certification, including certification exam preparation and one exam fee per trainee, then three months of milestone-based mentoring; exam eligibility and any further attempts are set per program.');
    expect(mainOf(UNIVERSITIES)).toContain('100 training hours per certification, including exam preparation and one exam fee per trainee; exam eligibility and any further attempts are set per program.');
    expect(mainOf(WORK)).toContain('Certification preparation and one exam fee per trainee can be added where a track offers one; exam eligibility and any further attempts are set per program.');
  });

  test(`"${OLD_EXAM}" and the other old exam-fee forms are in no built page, JSON-LD, meta tag or llms.txt`, () => {
    const hits: string[] = [];
    for (const rel of [...builtPages(), 'llms.txt']) {
      const raw = html(rel);
      for (const old of [OLD_EXAM, 'exam fees, eligibility', 'exam fee included', 'exam fees included']) if (decode(raw).includes(old)) hits.push(`${rel}: ${old}`);
    }
    expect(hits).toEqual([]);
  });

  test('no page names an exam fee without "one … per trainee" (no unlimited attempts, no guaranteed certification), and every PD-02a-tagged text that names a fee says it', () => {
    const loose: string[] = [];
    const tagged: string[] = [];
    for (const rel of builtPages()) {
      if (rel.startsWith('news/')) continue;
      const text = visible(html(rel));
      const fees = count(text, /\bexam fees?\b/gi);
      const one = count(text, /\bone exam fee per trainee\b/g);
      if (fees !== one) loose.push(`${rel}: ${fees} exam-fee mentions, ${one} "one exam fee per trainee"`);
      if (/\bunlimited\b[^.]*\battempts\b|\bcertification is guaranteed\b|\bguaranteed certification\b/i.test(text)) loose.push(`${rel}: unlimited attempts or a guaranteed certification`);
      for (const m of html(rel).matchAll(/<(\w+)[^>]*\bdata-fact="([^"]*\bPD-02a\b[^"]*)"[^>]*>([\s\S]*?)<\/\1>/g)) {
        const t = visible(m[3]);
        if (/\bexam fee/i.test(t) && !/\bone exam fee per trainee\b/.test(t)) tagged.push(`${rel}: ${t.slice(0, 120)}`);
      }
    }
    expect(loose).toEqual([]);
    expect(tagged).toEqual([]);
  });

  test('the exam-terms qualifier stays once per page beyond the scope sentence (WP145), now in the one-fee form', () => {
    const QUALIFIER = /\b(?:exam fees?|exam eligibility|eligibility, attempts)\b[^.;]*?\bset per program\b/g;
    for (const rel of [YOUTHWIDE, CAMPUS, TALENTLEAP, OUR_MODEL, DEV, UNIVERSITIES, WORK]) expect(count(mainOf(rel), QUALIFIER), rel).toBe(1);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* 2. The AI-supported flipped classroom                                                           */
/* ---------------------------------------------------------------------------------------------- */

test.describe('2. the AI-supported flipped classroom is stated once where the program or offer is described', () => {
  test('the sentence: all lectures pre-recorded, an AI Tutor for every learner, mentors on Q&A and handholding beyond the AI Tutor', () => {
    expect(DELIVERY_MODEL.text).toBe('Training follows an AI-supported flipped classroom: all lectures are pre-recorded and an AI Tutor supports every learner, so mentors’ time goes to Q&A and to handholding beyond what the AI Tutor can provide.');
    expect(fact('IN-04').text).toContain('an AI Tutor');
  });

  const PLACED: [string, string][] = [
    ['Home', 'index.html'],
    ['Our Model', OUR_MODEL],
    ['TalentLEAP (Q14)', TALENTLEAP],
    ['JobReady Platform', PLATFORM],
    ['YouthWIDE', YOUTHWIDE],
    ['JobReady@Campus', CAMPUS],
    ['JobReady@Work', WORK],
    ['Governments', GOVERNMENTS],
    ['Foundations', FOUNDATIONS],
    ['Employers', EMPLOYERS],
    ['Development Partners', DEV],
    ['Universities', UNIVERSITIES],
    ['Local Partners', LOCAL],
    ['Investors', INVESTORS],
  ];
  for (const [label, rel] of PLACED) {
    test(`${label} states it exactly once`, () => {
      expect(count(mainOf(rel), DELIVERY_MODEL.text)).toBe(1);
      expect(count(mainOf(rel), 'flipped classroom'), 'the model is not restated in other words').toBe(1);
    });
  }

  test('the FAQ answer about how training works (Q14) carries it, on TalentLEAP and in its FAQ JSON-LD, after the comparison with a self-paced course', () => {
    const q14 = faqs.find((f) => f.id === 'Q14');
    expect(q14?.a.endsWith(DELIVERY_MODEL.text)).toBe(true);
    expect(q14?.a.split(/(?<=\.)\s/).length, 'FAQ answers stay within three sentences').toBeLessThanOrEqual(3);
    expect(ldText(TALENTLEAP)).toContain(DELIVERY_MODEL.text);
  });

  test('the delivery model is not stated on pages that do not describe the training offer (no repetition site-wide)', () => {
    const placed = new Set(PLACED.map(([, rel]) => rel));
    const extra = builtPages().filter((rel) => !placed.has(rel) && rel !== STYLEGUIDE && visible(html(rel)).includes('flipped classroom'));
    expect(extra).toEqual([]);
  });

  test('"three months of mentoring" stays (its scope is now Q&A and handholding)', () => {
    expect(mainOf(HUB)).toContain('three months of mentoring');
    expect(mainOf(FOUNDATIONS)).toContain('Three months of mentoring and placement support are standard inclusions');
    expect(fact('PD-02').text).toContain('· three months of mentoring ·');
  });

  test('past results are not attributed to the AI Tutor or the flipped model: no paragraph, list item or cell that names them states a result', () => {
    const bad: string[] = [];
    for (const rel of builtPages()) {
      for (const m of html(rel).matchAll(/<(p|dd|td|li)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
        const t = visible(m[2]);
        if (/AI Tutor|flipped classroom/.test(t) && /\d+(?:\.\d+)?%|percentage points|\bwere employed\b|\bin work\b/i.test(t)) bad.push(`${rel}: ${t.slice(0, 160)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* 3. PD-06: no lecture class size                                                                 */
/* ---------------------------------------------------------------------------------------------- */

test.describe('3. PD-06 publishes no lecture class size', () => {
  test('PD-06 keeps the labs of 20 and drops "40 (lectures)"', () => {
    expect(fact('PD-06').text).toContain('classes of 20 (labs); hub-and-spoke delivery');
    expect(fact('PD-06').text).not.toMatch(/lecture/i);
  });
  test('no built page, JSON-LD or llms.txt states a lecture class size', () => {
    const hits = [...builtPages(), 'llms.txt'].filter((rel) => /40 \(lectures\)|\(lectures\)|lecture class|classes of 40/i.test(decode(html(rel))));
    expect(hits).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* 4. No live, pre-launch, planned or roadmap labels on capabilities                               */
/* ---------------------------------------------------------------------------------------------- */

test.describe('4. no capability is labelled live, pre-launch, planned or roadmap', () => {
  // Allowed, because they label no capability: ID-11's "Additional country and regional offices are planned." (offices; the owner's rule covers capabilities) and the styleguide's note on button states.
  const ALLOWED = ['Additional country and regional offices are planned.', 'Hover, focus (Tab) and press states are live.'];
  const allow = (t: string) => ALLOWED.reduce((acc, a) => acc.split(a).join(' '), t);
  const STATUS = /\bLive today\b|\bpre-launch\b|\(roadmap\)|\bon the roadmap\b|\bare planned\b|\blevels? (?:are |is )?planned\b|\bnot live\b|\bare live\b|\bis live\b|\bRollout Status\b|\bmodules are rolling out\b|\brolling out in stages\b|\bmore modules follow\b|\buntil launch\b|\bcoming soon\b/i;

  test('no built page (news included), JSON-LD, meta description or llms.txt carries a status label', () => {
    const hits: string[] = [];
    for (const rel of builtPages()) {
      const text = allow(everything(rel));
      const m = STATUS.exec(text);
      if (m) hits.push(`${rel}: …${text.slice(Math.max(0, m.index - 60), m.index + 60)}…`);
    }
    const llms = allow(readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8'));
    const m = STATUS.exec(llms);
    if (m) hits.push(`llms.txt: …${llms.slice(Math.max(0, m.index - 60), m.index + 60)}…`);
    expect(hits).toEqual([]);
  });

  // IN-08 is outside this package's rows (its "Proficient and Expert are planned" renders nowhere; the report proposes the register change).
  test('the register rows named by the package carry no status: IN-04 lists capabilities, IN-06 has no "(roadmap)" and no "planned"', () => {
    for (const id of ['IN-04', 'IN-06']) expect(fact(id).text, id).not.toMatch(STATUS);
    expect(fact('IN-04').text).toContain('Its capabilities include an AI Tutor, AI-driven personalized and adaptive learning paths, automated assessment and feedback, an AI career coach, partner portals, marketing automation, customer relationship management, AI chat, the employer marketplace and the gig-work marketplace.');
    expect(fact('IN-06').text.endsWith('the basis for AI-driven personalized and adaptive learning paths')).toBe(true);
  });

  test('JobReady Platform: "Platform Capabilities" lists each capability by job with no Status column, the AI capabilities included', () => {
    const raw = html(PLATFORM);
    const section = /<section[^>]*id="status"[\s\S]*?<\/table>/.exec(raw)?.[0] ?? '';
    expect(section.length).toBeGreaterThan(500);
    expect(visible(/<h2[\s\S]*?<\/h2>/.exec(section)?.[0] ?? '')).toBe('Platform Capabilities');
    expect([...section.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1])).toEqual(['Job', 'Capability', 'Note']);
    const capabilities = [...section.matchAll(/<td data-label="Capability"[^>]*>([^<]*)<\/td>/g)].map((m) => decode(m[1]));
    expect(capabilities).toEqual([
      'Course storefront at jobready.global',
      'AI Tutor',
      'Personalized and adaptive learning paths',
      'Automated assessment and feedback',
      'AI career coach',
      'Gig-work (Earn) marketplace',
      'Employer marketplace',
      'Partner portals',
      'Marketing automation, customer relationship management and AI chat',
    ]);
    expect(raw).not.toContain('id="roadmap"');
    expect(mainOf(PLATFORM)).toContain('JobReady is CodersTrust’s digital learning and earning platform, from an AI Tutor to work marketplaces.');
  });

  test('the platform question asks what JobReady offers, on every page that asks it and in its FAQ JSON-LD; "Is the JobReady Platform Live?" is asked nowhere', () => {
    for (const rel of [EMPLOYERS, WORK, PLATFORM, INVESTORS]) {
      expect(mainOf(rel), rel).toContain('What Does the JobReady Platform Offer?');
      expect(ldText(rel), rel).toContain('"name":"What Does the JobReady Platform Offer?"');
    }
    const shared = 'JobReady offers an AI Tutor, AI-driven personalized and adaptive learning paths, automated assessment and feedback, an AI career coach, partner portals, AI chat, the employer marketplace and the gig-work marketplace. Hiring runs through CodersTrust’s placement team.';
    expect(mainOf(EMPLOYERS)).toContain(shared);
    expect(mainOf(WORK)).toContain(shared);
    expect(mainOf(PLATFORM)).toContain('See Platform Capabilities above, from the AI Tutor to the work marketplaces.');
    expect(mainOf(INVESTORS)).toContain('See What JobReady Does above, from the AI Tutor to the work marketplaces.');
    expect(builtPages().filter((rel) => html(rel).includes('Is the JobReady Platform Live?'))).toEqual([]);
  });

  test('the menu, Investors, Foundations and TalentLEAP say what is offered, with no status', () => {
    const menu = 'An AI Tutor, adaptive learning paths, an AI career coach, partner portals and work marketplaces.';
    expect(visible(html('index.html'))).toContain(menu);
    expect(mainOf(INVESTORS)).toContain('Back JobReady’s staged rollout, built on CodersTrust’s training and mentoring programs. JobReady offers an AI Tutor, adaptive learning paths, an AI career coach, partner portals, the employer marketplace and the gig-work marketplace.');
    expect(mainOf(INVESTORS)).toContain('Partner portals give institutions a digital delivery platform, with automated assessment and feedback and AI chat across the platform.');
    expect(mainOf(FOUNDATIONS)).toContain('A grant toward platform infrastructure, not toward cohorts: JobReady’s AI Tutor, adaptive learning paths, AI career coach, partner portals and work marketplaces.');
    expect(mainOf(TALENTLEAP)).toContain('TalentLEAP organizes learning around assessed skill units and career paths. Its levels run from Competent to Proficient and Expert.');
    expect(mainOf(OUR_MODEL)).toContain('skill units, career paths and mentoring, with levels from Competent to Proficient and Expert.');
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* 5. Dates                                                                                        */
/* ---------------------------------------------------------------------------------------------- */

test.describe(`5. every page whose visible text changed says ${TODAY}`, () => {
  const STAMPED: [string, string][] = [
    [TALENTLEAP, 'lf-updated'],
    [PLATFORM, 'lf-updated'],
    [YOUTHWIDE, 'updated'],
    [CAMPUS, 'updated'],
    [WORK, 'updated'],
  ];
  for (const [rel, cls] of STAMPED) {
    test(`${rel}: "Last updated November 3, 2026" and JSON-LD dateModified ${TODAY}`, () => {
      const raw = html(rel);
      const m = new RegExp(`<p class="${cls}[^"]*"[^>]*>([\\s\\S]*?)</p>`).exec(raw);
      expect(visible(m?.[1] ?? '')).toBe('Last updated November 3, 2026');
      expect(raw).toMatch(new RegExp(`<time datetime="${TODAY}"`));
      expect(dateModified(rel)).toContain(TODAY);
      expect(dateModified(rel).filter((d) => d < TODAY)).toEqual([]);
    });
  }
  for (const rel of [DEV, UNIVERSITIES, LOCAL, INVESTORS, GOVERNMENTS, FOUNDATIONS, EMPLOYERS]) {
    test(`${rel}: WebPage.dateModified is ${TODAY}`, () => {
      expect(nodeOf(rel, 'WebPage').dateModified).toBe(TODAY);
    });
  }
  test(`About (the 2025–2026 timeline item now says what JobReady is, with no rollout status): AboutPage.dateModified is ${TODAY}`, () => {
    expect(mainOf('about/index.html')).toContain('2025–2026 JobReady, YouthWIDE and the Impact Survey JobReady is CodersTrust’s digital learning and earning platform. YouthWIDE aims to train');
    expect(nodeOf('about/index.html', 'AboutPage').dateModified).toBe(TODAY);
  });
});
