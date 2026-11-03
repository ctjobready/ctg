import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP161-C (group C of the resumed adversarial-review fixes: NU diploma, program and model pages, SuperKids).
 * Items: WP159 package 6 (A-32 to A-36), WP159 package 7 (A-37 to A-40) and WP160-B (owner answers of 2 November 2026: NU intake, SuperKids offers).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp161-c.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   A-32 NU "Before You Apply" leads: details of CodersTrust’s delivery, not "as stated for" the National University diploma.
 *   A-33 NU module lists follow National University’s syllabi: Digital Marketing "Affiliate Marketing (Practical)" and Web & Google Analytics before SEO; ICT ends with "Project or Internship".
 *   A-34 NU "How to Apply" row and "Ready to Apply?" steps: the form is a short registration form, and admissions shares the application steps.
 *   A-35 "short self-paced course" becomes "a course for yourself" / "a shorter course"; the eligibility sentence is not repeated in the course pages’ "Who It Is For" lead; the menu's Courses line.
 *   A-36 The common noun is "cybersecurity" (the course name "Cyber Security" is unchanged).
 *   A-37 JobReady@Work's track-record line rests on its own needs assessment (IN-10), not on the TalentLEAP model.
 *   A-38 YouthWIDE: "Results from Earlier CodersTrust Programs".
 *   A-39 JobReady@Campus: the university band's eyebrow is "Our University Partnerships".
 *   A-40 FutureBand takes a `note` prop; SuperKids renders no "CodersTrust programs and offices" note under its SuperKids photographs.
 *   B1   (owner 2026-11-02) NU notices describe National University's own Gazipur intake, not admission through CodersTrust.
 *   B2   (owner rule WP97) Data Analytics final module follows NU's syllabus title: Special Topics in Data Analytics, a project or internship.
 *   B3   (owner 2026-11-02) SuperKids has two offers, SuperKids@School and SuperKids courses for families on JobReady.global; no "D2C"/"B2B2C".
 *   D    Owner date rule: every page whose visible text changed is dated 2026-11-02 or later.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
/** Readable text: tags, comments, scripts, styles and screen-reader-only notes removed; no space before punctuation. */
const visible = (raw: string) =>
  decode(
    raw
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:)])/g, '$1')
    .trim();
const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const main = (rel: string) => visible(mainRaw(rel));
const count = (text: string, needle: string) => text.split(needle).length - 1;
const metaDescription = (rel: string) => decode(/<meta name="description" content="([^"]*)"/.exec(html(rel))?.[1] ?? '');
/** The raw HTML of the section with this id (up to the next <section). */
function sectionRaw(rel: string, id: string): string {
  const raw = mainRaw(rel);
  const i = raw.search(new RegExp(`<section[^>]*\\bid="${id}"`));
  expect(i, `section #${id} is on ${rel}`).toBeGreaterThanOrEqual(0);
  const j = raw.indexOf('<section', i + 10);
  return raw.slice(i, j > i ? j : undefined);
}
const section = (rel: string, id: string) => visible(sectionRaw(rel, id));
/** The visible text of the Before You Apply row with this label. */
function row(rel: string, label: string): string {
  const raw = sectionRaw(rel, 'before-you-apply');
  const m = new RegExp(`<dt[^>]*>${label}</dt>\\s*<dd[^>]*>([\\s\\S]*?)</dd>\\s*</div>`).exec(raw);
  expect(m, `row "${label}" on ${rel}`).not.toBeNull();
  return visible(m![1]);
}
/** The visible text of the FAQ answer to this question. */
function faqAnswer(rel: string, q: string): string {
  const raw = mainRaw(rel);
  const i = raw.indexOf(q);
  expect(i, `FAQ "${q}" on ${rel}`).toBeGreaterThanOrEqual(0);
  const rest = raw.slice(i + q.length);
  const end = rest.search(/<\/details>/);
  return visible(rest.slice(0, end > 0 ? end : undefined)).replace(/^[^A-Za-z0-9]+/, '');
}
const lastUpdated = (rel: string) => /<time datetime="(\d{4}-\d{2}-\d{2})/.exec(/class="(?:lf-)?updated"[\s\S]*?<\/p>/.exec(html(rel))?.[0] ?? '')?.[1];
const dateModified = (rel: string) => [...html(rel).matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);

const NU = 'programs/nu-postgraduate-diploma/index.html';
const COURSE = (slug: string) => `programs/nu-postgraduate-diploma/${slug}/index.html`;
const DM = COURSE('digital-marketing');
const ICT = COURSE('ict');
const CYBER = COURSE('cyber-security');
const DA = COURSE('data-analytics');
const COURSES = [DM, ICT, CYBER, DA];
const NU_PAGES = [NU, ...COURSES];
const HUB = 'programs/index.html';
const WORK = 'programs/jobready-work/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const SUPERKIDS = 'programs/superkids/index.html';
const HOME = 'index.html';

const ELIGIBILITY = 'Honors / Diploma holders with a minimum CGPA of 2.25';
const TODAY = '2026-11-02';

/** The module list of a course page, in order (the visible "Module n:" prefix is screen-reader text). */
const modules = (rel: string) => [...sectionRaw(rel, 'curriculum').matchAll(/<span class="modgrid__name"[^>]*>([\s\S]*?)<\/span>\s*<\/li>/g)].map((m) => visible(m[1]));

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// A-32
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-32 NU "Before You Apply" leads describe CodersTrust’s delivery', () => {
  test('the overview: "Program details for CodersTrust’s delivery of the National University Post Graduate Diploma."', () => {
    expect(section(NU, 'before-you-apply')).toContain('Before You Apply Program details for CodersTrust’s delivery of the National University Post Graduate Diploma.');
  });
  for (const rel of COURSES) {
    test(`${rel}: "Program details for this course as delivered by CodersTrust."`, () => {
      expect(section(rel, 'before-you-apply')).toContain('Before You Apply Program details for this course as delivered by CodersTrust.');
    });
  }
  test('no NU page says "as stated for"', () => {
    for (const rel of NU_PAGES) expect(main(rel), rel).not.toContain('as stated for');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// A-33
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-33 NU module lists follow National University’s own syllabi', () => {
  test('Digital Marketing: "Affiliate Marketing (Practical)", and Web & Google Analytics comes before SEO', () => {
    expect(modules(DM)).toEqual([
      'Fundamentals of Digital Marketing',
      'WordPress Design (Practical)',
      'Google Ads and PPC',
      'Content Marketing (Practical)',
      'Affiliate Marketing (Practical)',
      'E-Commerce',
      'Social Media Marketing',
      'Web & Google Analytics (Practical)',
      'Search Engine Optimization (SEO) (Practical)',
      'Internship, Project Work and Seminar',
    ]);
    expect(main(DM)).not.toContain('E-mail Marketing');
  });
  test('Digital Marketing keeps its internship, project work and seminar lines', () => {
    expect(section(DM, 'curriculum')).toContain('Modules, in order. The final module combines internship, project work and a seminar; internship arrangements are confirmed with admissions.');
    expect(faqAnswer(DM, 'What Will I Be Able to Do After This Course?')).toContain('Build practical work in WordPress design, content marketing, SEO and analytics, followed by the final internship, project work and seminar module.');
  });
  test('ICT ends with "Project or Internship", and its study lead and answer say so', () => {
    const m = modules(ICT);
    expect(m).toHaveLength(10);
    expect(m[m.length - 1]).toBe('Project or Internship');
    expect(section(ICT, 'curriculum')).toContain('Modules, in order. The final module is a project or internship; internship arrangements are confirmed with admissions.');
    expect(faqAnswer(ICT, 'What Will I Be Able to Do After This Course?')).toContain('Build practical work in programming, databases, networks and mobile applications, followed by the final project or internship module.');
    expect(main(ICT)).not.toMatch(/Internship, Project Work and Seminar|internship, project work and (a )?seminar/i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// A-34
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-34 the NU form is a short registration form; admissions shares the application steps', () => {
  for (const rel of NU_PAGES) {
    test(`${rel}: the How to Apply row and the "Ready to Apply?" steps`, () => {
      expect(row(rel, 'How to Apply')).toMatch(/^Complete the short form \(name, contact details and course\); admissions then shares the application steps\. For help, call \+880 1958.220802 or email hello@coderstrustbd\.com\.$/);
      const steps = section(rel, 'cta');
      expect(steps).toContain('Register Your Interest. The Apply Now button opens a short form asking for your name, contact details and course.');
      expect(steps).toContain('Admissions Contacts You. Our admissions team shares the application steps.');
      const t = main(rel);
      for (const old of ['Submit the Application Form', 'standalone application form', 'shares the next steps', 'Complete the application form']) expect(t, old).not.toContain(old);
    });
  }
  test('the short-form link still opens the standalone Google Form', () => {
    for (const rel of NU_PAGES) {
      const raw = sectionRaw(rel, 'before-you-apply');
      expect(raw, rel).toMatch(/Complete the <a class="link" href="https:\/\/docs\.google\.com\/forms\/[^"]+"[^>]*>short form<\/a>/);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// A-35
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-35 JobReady.global is "a course for yourself" or "a shorter course", not only short self-paced courses', () => {
  test('Programs hub: "Looking for a course for yourself? Explore Courses at JobReady.global"', () => {
    const t = main(HUB);
    expect(t).toContain('Looking for a course for yourself? Explore Courses at JobReady.global');
    expect(t).not.toContain('short self-paced course');
  });
  test('NU overview FAQ: "Not right if you want a shorter course: see JobReady.global."', () => {
    expect(faqAnswer(NU, 'Is the NU Post Graduate Diploma Right for Me?')).toBe(`Eligibility: ${ELIGIBILITY}. It is right for you if you meet that and want a digital career. Not right if you want a shorter course: see JobReady.global.`);
  });
  for (const rel of COURSES) {
    test(`${rel}: the FAQ and the "Who It Is For" lead; the eligibility sentence is stated twice, not three times`, () => {
      expect(faqAnswer(rel, 'Is This the Right Course for Me?')).toMatch(new RegExp(`Not right if you want a shorter course: see JobReady\\.global\\.$`));
      expect(section(rel, 'who')).toContain('For Learners Who Want a Digital Career Right for you if you meet the eligibility above and want to add practical digital skills. If you want a shorter course instead, see JobReady.global.');
      const t = main(rel);
      expect(t).not.toContain('self-paced');
      expect(count(t, ELIGIBILITY)).toBe(2);
    });
  }
  test('the Programs menu: "Courses for individual learners on JobReady.global." on every page, the old line on none', () => {
    expect(html(HOME)).toContain('<span class="mega__desc"');
    expect(visible(html(HOME))).toContain('Courses for individual learners on JobReady.global.');
    const offenders = listPages().filter((p) => readFileSync(p.file, 'utf8').includes('Short, self-paced courses on JobReady.global.')).map((p) => p.route);
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// A-36
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-36 "cybersecurity" as a common noun; "Cyber Security" stays the course name', () => {
  test('the Programs hub card and the NU "Choose Your Course" lead name "cybersecurity"', () => {
    for (const rel of [HUB, NU]) {
      const t = main(rel);
      expect(t, rel).toContain('information and communication technology (ICT), cybersecurity and data analytics');
      expect(t, rel).not.toContain('cyber security');
    }
  });
  test('the Cyber Security page: lead, meta description and the unchanged H1', () => {
    expect(main(CYBER)).toContain('Cybersecurity knowledge, from cryptography and network security to digital forensics and cyber law, in a National University Post Graduate Diploma delivered by CodersTrust.');
    expect(metaDescription(CYBER)).toBe('A National University Post Graduate Diploma in cybersecurity, delivered by CodersTrust: cryptography, network security, digital forensics and cyber law.');
    expect(visible(/<h1[\s\S]*?<\/h1>/.exec(html(CYBER))![0])).toBe('NU Post Graduate Diploma in Cyber Security');
    expect(`${main(CYBER)} ${metaDescription(CYBER)}`).not.toMatch(/[Cc]yber security(?! Laws)/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// A-37 to A-40
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('A-37 JobReady@Work: the track-record line is its own needs assessment (IN-10)', () => {
  test('"JobReady@Work builds each program around a needs assessment." with IN-10 and no TalentLEAP link in the band', () => {
    const raw = sectionRaw(WORK, 'guide');
    const m = /<p class="guide__method" data-fact="([^"]*)"[^>]*>([\s\S]*?)<\/p>/.exec(raw);
    expect(m).not.toBeNull();
    expect(m![1]).toBe('IN-10');
    expect(visible(m![2])).toBe('JobReady@Work builds each program around a needs assessment.');
    expect(visible(raw)).not.toContain('TalentLEAP');
  });
  test('JobReady@Campus keeps its TalentLEAP line (it is on the path)', () => {
    expect(section(CAMPUS, 'guide')).toContain('JobReady@Campus is built on the TalentLEAP model. How TalentLEAP Works');
  });
});

test.describe('A-38 YouthWIDE: "Results from Earlier CodersTrust Programs"', () => {
  test('the cases band is titled for earlier programs', () => {
    expect(section(YOUTHWIDE, 'cases')).toMatch(/^Proof in Practice Results from Earlier CodersTrust Programs\b/);
    expect(main(YOUTHWIDE)).not.toContain('Results from Delivered Programs');
  });
});

test.describe('A-39 JobReady@Campus: the university band says what it lists', () => {
  test('eyebrow "Our University Partnerships" above "Universities Partner with CodersTrust"', () => {
    expect(section(CAMPUS, 'guide')).toMatch(/^Our University Partnerships Universities Partner with CodersTrust\b/);
  });
});

test.describe('A-40 FutureBand note: SuperKids shows none, Home and JobReady@Campus keep the default', () => {
  const NOTE = 'Photographs are from CodersTrust programs and offices, shown for context.';
  test('SuperKids: no template note; its own band lead stays', () => {
    expect(main(SUPERKIDS)).not.toContain(NOTE);
    expect(section(SUPERKIDS, 'future')).toContain('Photographs from SuperKids workshops, events and school partnerships.');
  });
  test('Home and JobReady@Campus keep the default note', () => {
    expect(main(HOME)).toContain(NOTE);
    expect(main(CAMPUS)).toContain(NOTE);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// B1 to B3 (owner answers of 2 November 2026)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const NOTICES_LEAD = 'National University publishes notices for its own intake at its Gazipur campus in Bangla; the fee, eligibility and admission test in those notices apply to that intake, not to admission through CodersTrust:';

test.describe('B1 NU notices describe National University’s own intake, not admission through CodersTrust', () => {
  for (const rel of NU_PAGES) {
    test(`${rel}: the Schedule and Intake row qualifies the notices and keeps both links; fee and eligibility unchanged`, () => {
      expect(row(rel, 'Schedule and Intake')).toBe(`Admissions confirms intake dates and schedule with each applicant. ${NOTICES_LEAD} National University PGD Admission Notices and National University PGD Recent Notices.`);
      const raw = sectionRaw(rel, 'before-you-apply');
      expect(raw).toContain('href="https://pgd.nu.ac.bd/admission-notices-pgd.php"');
      expect(raw).toContain('href="https://pgd.nu.ac.bd/all-recent-notices-pgd.php"');
      expect(row(rel, 'Program Fee')).toBe('BDT 50,000.');
      expect(row(rel, 'Eligibility')).toBe(`${ELIGIBILITY}.`);
      expect(main(rel)).not.toContain('notices are published in Bangla');
    });
  }
  test('the overview FAQ "Where Do I Find Eligibility, Schedule and Fees?" carries the same qualifier', () => {
    expect(faqAnswer(NU, 'Where Do I Find Eligibility, Schedule and Fees?')).toContain(`${NOTICES_LEAD} National University PGD Admission Notices and National University PGD Recent Notices.`);
  });
});

test.describe('B2 Data Analytics: the final module follows National University’s title', () => {
  test('study lead, answer and module list', () => {
    expect(section(DA, 'curriculum')).toContain('Modules, in order. The final module, Special Topics in Data Analytics, is a project or internship.');
    expect(faqAnswer(DA, 'What Will I Be Able to Do After This Course?')).toContain('Build a foundation in analytics tools, databases, data visualization and machine learning, then apply it in the final project or internship module.');
    const m = modules(DA);
    expect(m).toHaveLength(10);
    expect(m[m.length - 1]).toBe('Special Topics in Data Analytics (Project or Internship)');
    expect(main(DA)).not.toMatch(/thesis|project report/i);
  });
});

const FAMILY_CARD = 'Parents can enroll their children in SuperKids courses on JobReady.global, including Introduction to Robotics on campus and Graphics Design for Kids and Fundamentals of Block Coding online.';

test.describe('B3 SuperKids: SuperKids@School for schools, SuperKids courses for families', () => {
  test('eyebrow and hero lead name both offers', () => {
    const hero = visible(/<section class="hero[\s\S]*?<\/section>/.exec(mainRaw(SUPERKIDS))![0]);
    expect(hero).toContain('SuperKids · For Schools, Education Partners and Families');
    // two sentences: "..., robotics and graphic design for kids into schools, and parents ..." is read as a serial comma by the site-wide check (tests/wp127.spec.ts)
    expect(hero).toContain('SuperKids@School brings block coding, robotics and graphic design for kids into schools. Parents can enroll their children in SuperKids courses on JobReady.global.');
  });
  test('the "Two Ways to Join SuperKids" band: a schools card and a families card with the JobReady.global link', () => {
    const raw = mainRaw(SUPERKIDS);
    const i = raw.indexOf('Two Ways to Join SuperKids');
    expect(i, 'the band is on the page').toBeGreaterThan(0);
    const start = raw.lastIndexOf('<section', i);
    const band = raw.slice(start, raw.indexOf('</section>', i));
    expect(/<h2[^>]*>Two Ways to Join SuperKids<\/h2>/.test(band)).toBe(true);
    const h3 = [...band.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/g)].map((m) => visible(m[1]));
    expect(h3).toEqual(['SuperKids@School', 'SuperKids Courses for Families']);
    const t = visible(band);
    expect(t).toContain('schools and education partners');
    expect(t).toContain('courses shaped with you in a discovery session');
    expect(t).toContain(FAMILY_CARD);
    expect(band).toMatch(/<a class="link" href="https:\/\/jobready\.global\/"[^>]*>Explore SuperKids Courses at JobReady\.global/);
  });
  test('the storefront line names a parent’s own child', () => {
    const t = main(SUPERKIDS);
    expect(t).toContain('Looking for a SuperKids course for your own child, or courses for older learners? Explore Courses at JobReady.global');
    expect(t).not.toContain('Looking for courses for older learners?');
  });
  test('meta description (155 characters or fewer) mentions schools and families', () => {
    const d = metaDescription(SUPERKIDS);
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d).toMatch(/schools/i);
    expect(d).toMatch(/families/i);
  });
  test('the school route, the agreements, the 400+ figure and the safeguarding answer stay', () => {
    const t = main(SUPERKIDS);
    expect(section(SUPERKIDS, 'agreements')).toContain('These are agreement targets, not delivered reach.');
    expect(section(SUPERKIDS, 'agreements')).toContain('400+');
    expect(t).toContain('Bring SuperKids to Your School or Program');
    expect(t).toContain('Options Are Shaped with You in a Discovery Session');
    expect(t).toContain('Questions Schools and Partners Ask');
    expect(mainRaw(SUPERKIDS)).toMatch(/href="mailto:[^"]+"/);
  });
  test('Programs hub: the SuperKids card is for schools, education partners and parents and names both offers', () => {
    const raw = mainRaw(HUB);
    const i = raw.indexOf('>SuperKids</a></h3>');
    expect(i).toBeGreaterThan(0);
    const card = visible(raw.slice(i, raw.indexOf('</article>', i)));
    expect(card).toContain('Best For: Schools, Education Partners and Parents');
    expect(card).toContain('SuperKids@School');
    expect(card).toContain('SuperKids courses for families');
  });
  test('no built page says "D2C" or "B2B2C"', () => {
    const offenders = listPages().filter((p) => /\bD2C\b|\bB2B2C\b/.test(decode(readFileSync(p.file, 'utf8')))).map((p) => p.route);
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// D Owner date rule
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('D Owner date rule: every page whose visible text changed is dated 2026-11-02 or later', () => {
  for (const rel of [...NU_PAGES, WORK, YOUTHWIDE, CAMPUS, SUPERKIDS]) {
    test(`${rel}: Last updated and dateModified`, () => {
      expect((lastUpdated(rel) ?? '') >= TODAY, `${rel} Last updated ${lastUpdated(rel)}`).toBe(true);
      const dates = dateModified(rel);
      expect(dates.length).toBeGreaterThan(0);
      for (const d of dates) expect(d >= TODAY, `${rel} dateModified ${d}`).toBe(true);
    });
  }
  test('Programs hub dateModified (the hub prints no Last updated line)', () => {
    const dates = dateModified(HUB);
    expect(dates.length).toBeGreaterThan(0);
    for (const d of dates) expect(d >= TODAY, `programs/ dateModified ${d}`).toBe(true);
  });
});
