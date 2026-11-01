import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP154 (Opus Max run 1, kit 121: 1 Minor and 7 Polish).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp154.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  (Minor) YouthWIDE "For Governments and Ministries" band: its action is "Request a Briefing for Your Ministry" (the government briefing email, two suitable times for a briefing),
 *      not the co-funding / discovery-session email. Site-wide: every link whose section or label targets governments or ministries is the briefing route (never "discovery session");
 *      every funder or partner route keeps its own email.
 *   2  Home "Blended Training" card: training in existing labs and colleges, led by facilitators trained by CodersTrust (Training of Trainers); delivery designed to work where connectivity is limited.
 *   3  Investors: the "Prosper" card body does not repeat its heading; the "Learn" card says "Supported Cohorts", not "Bootcamps" (the word is on no page).
 *   4  Development Partners and Governments "How It Works": the closing statement no longer says "in existing labs and colleges" (the card heading or the H2 and card carry it).
 *   5  JobReady@Campus: the "In Parallel with Studies" card does not repeat the statement ("alongside academic studies").
 *   6  NU Post Graduate Diploma (overview and four course pages): the "Ready to Apply?" step names its subject ("The Apply Now button opens the standalone application form.").
 *   7  TalentLEAP: the planned levels are stated once (the opening); the example has no lead and the Prosper step no longer repeats it.
 *   8  Owner date rule: a page with its own "Last updated" or explicit dateModified is 2026-11-02 or later; build-date pages are 2026-11-01 or later (UTC).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const main = (rel: string) => visible(mainRaw(rel));
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);

function allPages(dir: string = DIST_DIR): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? allPages(p) : n === 'index.html' ? [relative(DIST_DIR, p)] : [];
  });
}
const realPages = () => allPages().filter((p) => !/http-equiv="refresh"/.test(html(p)));

const HOME = 'index.html';
const DEV = 'partner-with-us/development-partners/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const TALENTLEAP = 'our-model/talentleap/index.html';
const OUR_MODEL = 'our-model/index.html';
const NU = 'programs/nu-postgraduate-diploma/index.html';
const NU_COURSES = ['cyber-security', 'data-analytics', 'digital-marketing', 'ict'].map((s) => `programs/nu-postgraduate-diploma/${s}/index.html`);

const LONG = 'facilitators trained by CodersTrust (Training of Trainers)';
const TODAY = '2026-11-02';
const BUILD_FLOOR = '2026-11-01';

interface Link {
  page: string;
  context: string;
  label: string;
  href: string;
  subject: string;
  body: string;
}
const mailParts = (href: string) => {
  const q = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
  const params = new URLSearchParams(q);
  return { subject: params.get('subject') ?? '', body: params.get('body') ?? '' };
};
/** Every link in <main> of a page with the context of its section (eyebrow, H1/H2 and first H3 of the chunk that starts at the nearest <section>). */
function linksOf(page: string): Link[] {
  const out: Link[] = [];
  for (const chunk of mainRaw(page).split(/(?=<section\b)/)) {
    const eyebrow = visible(/class="[^"]*eyebrow[^"]*"[^>]*>([\s\S]*?)<\/(?:p|span|div)>/.exec(chunk)?.[1] ?? '');
    const head = visible(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/.exec(chunk)?.[1] ?? '');
    const h3 = visible(/<h3[^>]*>([\s\S]*?)<\/h3>/.exec(chunk)?.[1] ?? '');
    for (const a of chunk.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const href = decode(a[1]);
      out.push({ page, context: `${eyebrow} | ${head} | ${h3}`, label: visible(a[2]).replace(/ \(opens your email app\)$/, ''), href, ...(href.startsWith('mailto:') ? mailParts(href) : { subject: '', body: '' }) });
    }
  }
  return out;
}
const sitePages = () => realPages().filter((p) => p !== 'styleguide/index.html'); // the design-system demo page is not content

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 1 Governments and ministries: the briefing route, never a discovery session
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const targetsGovernments = (l: Link) => /government|ministr/i.test(l.context) || /government|ministr/i.test(l.label);
const governmentActions = () => sitePages().flatMap(linksOf).filter((l) => l.href.startsWith('mailto:') && targetsGovernments(l));

test.describe('1 Government-targeted actions use the briefing route', () => {
  test('YouthWIDE "For Governments and Ministries" band: the action is "Request a Briefing for Your Ministry" (the briefing email), not the co-funding email', () => {
    const raw = html(YOUTHWIDE);
    const start = raw.indexOf('id="governments"');
    const band = raw.slice(start, raw.indexOf('</section>', start));
    const bandText = visible(band);
    expect(bandText).toContain('For Governments and Ministries Delivery Base in Bangladesh and the 2030 Aim');
    expect(bandText).toContain('Request a Briefing for Your Ministry');
    expect(bandText).not.toMatch(/co-funding|discovery/i);
    const link = linksOf(YOUTHWIDE).find((l) => l.context.startsWith('For Governments and Ministries') && l.href.startsWith('mailto:'));
    expect(link, 'the band has an email action').toBeDefined();
    expect(link!.label).toBe('Request a Briefing for Your Ministry');
    expect(link!.subject).toBe('Briefing request — [ministry/agency]');
    expect(link!.body).toContain('Two suitable times for a briefing');
    expect(link!.body).not.toMatch(/discovery session/i);
    // The co-funding email is on no page of the site (the band was its only place).
    expect(sitePages().filter((p) => html(p).includes('Co-Funding YouthWIDE') || /YouthWIDE co-funding in Bangladesh/.test(decode(html(p)))), 'pages with the co-funding email').toEqual([]);
  });

  test('YouthWIDE: the funder card keeps the discovery-session route; the page keeps its government briefing links in the hero, the band and the Governments card', () => {
    const links = linksOf(YOUTHWIDE).filter((l) => l.href.startsWith('mailto:'));
    const discovery = links.filter((l) => l.subject.startsWith('Discovery session request'));
    expect(discovery.length, 'discovery links: hero button, funder card, sticky or fallback').toBeGreaterThanOrEqual(1);
    for (const l of discovery) expect(l.body).toContain('Two suitable times for a discovery session');
    expect(links.some((l) => l.context.includes('Funders: Talk to Us About a First Cohort') && l.subject.startsWith('Discovery session request'))).toBe(true);
    const briefings = links.filter((l) => l.label === 'Request a Briefing for Your Ministry');
    expect(briefings.length).toBeGreaterThanOrEqual(3); // hero route, the band, the Governments card
    for (const l of briefings) expect(l.subject).toBe('Briefing request — [ministry/agency]');
  });

  test('site-wide: every email action whose section or label targets governments or ministries is the briefing route, with two suitable times for a briefing and never a discovery session', () => {
    const actions = governmentActions();
    expect(actions.length, 'government-targeted email actions found').toBeGreaterThanOrEqual(14);
    const offenders = actions
      .filter((l) => !(l.subject === 'Briefing request — [ministry/agency]' && l.body.includes('Two suitable times for a briefing') && !/discovery session/i.test(`${l.subject} ${l.body} ${l.label}`) && /Briefing/.test(l.label)))
      .map((l) => `${l.page}: [${l.context}] "${l.label}" -> ${l.subject}`);
    expect(offenders).toEqual([]);
  });

  test('site-wide: no link or button whose label names a ministry or government says "discovery session" or "co-funding"', () => {
    const offenders = sitePages()
      .flatMap(linksOf)
      .filter((l) => /ministr|government/i.test(l.label) && /discovery|co-funding/i.test(l.label))
      .map((l) => `${l.page}: "${l.label}"`);
    expect(offenders).toEqual([]);
  });

  test('funder and partner routes keep their own emails (Foundations: three funding routes; Local Partners: the Bangladesh team; Employers, Universities: their own inquiries)', () => {
    const subjects = (page: string) => linksOf(page).filter((l) => l.href.startsWith('mailto:')).map((l) => l.subject.split(' — ')[0]);
    const f = subjects('partner-with-us/foundations/index.html');
    expect(f).toEqual(expect.arrayContaining(['Funding partnership', 'YouthWIDE cohort grant', 'JobReady platform grant']));
    expect(subjects('partner-with-us/local-partners/index.html')).toContain('Local partnership inquiry');
    expect(subjects('partner-with-us/investors/index.html')).toContain('Introduction call request');
    expect(subjects('partner-with-us/universities/index.html')).toContain('JobReady@Campus inquiry');
    expect(subjects('partner-with-us/employers/index.html')).toEqual(expect.arrayContaining(['JobReady@Work inquiry', 'Talent request']));
    // None of them is a briefing email: a funder, partner or institution does not get the government route.
    for (const page of ['partner-with-us/foundations/index.html', 'partner-with-us/local-partners/index.html', 'partner-with-us/investors/index.html', 'partner-with-us/universities/index.html', 'partner-with-us/employers/index.html']) {
      expect(subjects(page).filter((s) => s === 'Briefing request'), page).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 2 Home: Blended Training
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test('2 Home: the "Blended Training" card says facilitators lead training in existing labs and colleges, and that delivery is designed for limited connectivity', () => {
  const text = main(HOME);
  expect(text).toContain(`How We Reach Them Blended Training Training in existing labs and colleges, led by ${LONG}, with delivery designed to work where connectivity is limited.`);
  expect(text).not.toContain('Labs, colleges and delivery that works');
  expect(count(text, LONG)).toBe(1);
  // The first delivery explanation still names who teaches, in the long form, before any short form (wp152, wp153).
  expect(text.indexOf(LONG)).toBeGreaterThan(-1);
  expect(text.indexOf('CodersTrust-trained facilitators') === -1 || text.indexOf('CodersTrust-trained facilitators') > text.indexOf(LONG)).toBe(true);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 3 Investors: model band
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('3 Investors: the model band', () => {
  test('the Prosper card body adds information instead of repeating its heading', () => {
    const text = main(INVESTORS);
    expect(text).toContain('Prosper Career Paths and Continuing Development Career paths built on TalentLEAP’s assessed skill units, with continuing development.');
    expect(text).not.toContain('TalentLEAP career paths and continuing development.');
    // The planned levels stay out of the card (WP153: they are said once, in "What JobReady Does").
    expect(text).not.toMatch(/progressive levels are planned/i);
  });

  test('the Learn card reads "Courses, Supported Cohorts and University Programs"; "bootcamp" is on no page', () => {
    const text = main(INVESTORS);
    expect(text).toContain('Learn Courses, Supported Cohorts and University Programs');
    expect(text).not.toContain('Bootcamps');
    expect(sitePages().filter((p) => /bootcamp/i.test(visible(html(p)))), 'pages that say bootcamp').toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 4 Development Partners and Governments: "How It Works"
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('4 "How It Works": existing labs and colleges is said once per band', () => {
  test('Development Partners: the statement is "We combine training, mentoring and placement support. Partners receive monthly reports, and outcomes are tracked after each course."; the card heading says "Existing Labs and Colleges" once', () => {
    const text = main(DEV);
    const band = text.slice(text.indexOf('An Integrated Path from Training to Earnings'), text.indexOf('See the Evidence Behind the Results'));
    expect(band.length).toBeGreaterThan(300);
    expect(band).toContain('Our Approach We combine training, mentoring and placement support. Partners receive monthly reports, and outcomes are tracked after each course.');
    expect(count(band, /existing labs and colleges/gi)).toBe(1);
    expect(band).toContain('How We Reach Them Existing Labs and Colleges Outreach and selection with local partners');
    expect(count(text, /placement support in existing labs and colleges/gi)).toBe(0);
  });

  test('Governments: the statement is "We combine training, mentoring and placement support. Your agency receives monthly reports on progress toward paid work."; the H2 and the card carry the labs idea in their own words', () => {
    const text = main(GOVERNMENTS);
    const band = text.slice(text.indexOf('A National Delivery Model, Built on Labs That Already Exist'), text.indexOf('See the Evidence Behind the Results'));
    expect(band.length).toBeGreaterThan(300);
    expect(band).toContain('Our Approach We combine training, mentoring and placement support. Your agency receives monthly reports on progress toward paid work.');
    expect(count(band, /existing labs and colleges/gi)).toBe(0);
    expect(band).toContain('Government Digital Labs Blended learning in government labs you already run');
    expect(count(text, /placement support in existing labs and colleges/gi)).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 5 JobReady@Campus
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test('5 JobReady@Campus: the "In Parallel with Studies" card does not repeat the statement', () => {
  const text = main(CAMPUS);
  const band = text.slice(text.indexOf('Training Beside the Degree, in Your Own Labs'), text.indexOf('Delivery Context: National University'));
  expect(band).toContain('Our Approach JobReady@Campus combines certification exam preparation, mentoring and placement support in campus labs alongside academic studies.');
  expect(band).toContain('1 When In Parallel with Studies Industry-oriented skills training for your students. 2 Where On-Campus Labs');
  expect(band).not.toContain('runs alongside the academic program');
  // "alongside academic studies" is said once in the band (the statement).
  expect(count(band, /alongside (?:the )?academic/gi)).toBe(1);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 6 NU "Ready to Apply?" step
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('6 NU "Ready to Apply?": the step names its subject', () => {
  for (const page of [NU, ...NU_COURSES]) {
    test(`${page}: "Submit the Application Form. The Apply Now button opens the standalone application form."`, () => {
      const text = main(page);
      expect(text).toContain('Submit the Application Form. The Apply Now button opens the standalone application form. Admissions Contacts You. Our admissions team shares the next steps.');
      expect(text).not.toContain('It takes you to the standalone application form');
      expect(count(text, 'Apply Now')).toBeGreaterThanOrEqual(2); // the button and the step
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 7 TalentLEAP: planned levels once
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('7 TalentLEAP: the planned levels are stated once', () => {
  test('the opening says it; the example has no lead; the Prosper step does not repeat it', () => {
    const text = main(TALENTLEAP);
    expect(text).toContain('The first published TalentLEAP level is Competent; Proficient and Expert levels are planned.');
    expect(count(text, /planned/gi)).toBe(1);
    expect(text).not.toContain('In this example, Level 1 is Competent; Proficient and Expert are the planned next levels.');
    expect(text).not.toContain('TalentLEAP organizes skills into career paths with progressive levels.');
    expect(text).not.toContain('Further TalentLEAP levels are planned.');
    expect(text).toContain('Prosper Career paths, continuing development and the alumni network.');
    // The example band goes straight from its heading to the Level 1 card.
    expect(text).toContain('Example: The Digital Marketing Career Path Level 1 · Competent');
    expect(text).toContain('Example only: the Digital Marketing career path.');
  });

  test('Our Model prints the same pipeline and states the planned levels once, in the TalentLEAP card', () => {
    const text = main(OUR_MODEL);
    expect(text).toContain('Prosper Career paths, continuing development and the alumni network.');
    expect(text).not.toContain('Further TalentLEAP levels are planned.');
    expect(count(text, /levels planned|levels are planned/gi)).toBe(1);
    expect(text).toContain('with progressive levels planned beyond the first published level.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// 8 Owner date rule
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const lastUpdated = (rel: string) => /Last updated\s*<time[^>]*datetime="([^"]+)"/.exec(html(rel))?.[1];
const dateModified = (rel: string) => /"dateModified":"([^"]+)"/.exec(html(rel))?.[1];

test.describe('8 Owner date rule', () => {
  test('pages with their own "Last updated" or explicit dateModified are today (2026-11-02) or later', () => {
    for (const page of [YOUTHWIDE, CAMPUS, NU, ...NU_COURSES, TALENTLEAP]) {
      expect((lastUpdated(page) ?? '') >= TODAY, `${page} Last updated ${lastUpdated(page)}`).toBe(true);
      expect((dateModified(page) ?? '') >= TODAY, `${page} dateModified ${dateModified(page)}`).toBe(true);
    }
    for (const page of [GOVERNMENTS, INVESTORS]) {
      expect((dateModified(page) ?? '') >= TODAY, `${page} dateModified ${dateModified(page)}`).toBe(true);
    }
  });

  test('build-date pages (Home, Development Partners, Our Model) are on or after 2026-11-01 (UTC build date)', () => {
    for (const page of [HOME, DEV, OUR_MODEL]) {
      expect((dateModified(page) ?? '') >= BUILD_FLOOR, `${page} dateModified ${dateModified(page)}`).toBe(true);
    }
  });
});
