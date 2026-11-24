import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DELIVERY_MODEL, DELIVERY_MODEL_WORK, PROGRAM_SIZES_NOTE, PROGRAM_SIZES_NOTE_BRIEFING, TRACK_MENU, TRIAL_SENTENCE, VALUE_PROPOSITION, HEADLINE } from '../src/data/copy';
import { fact } from '../src/data/facts';
import { DIST_DIR } from './support/env';

/**
 * WP166-B (owner approval of 21 November 2026): the marketing-effectiveness copy review, package B: reviewer R2 (Our Model, the JobReady Platform, TalentLEAP, the Programs hub and every program page) and reviewer R3 (the Partner with Us hub and the
 * seven audience pages). Run `npm run build`, then `PORT=4913 npx playwright test tests/wp166-b.spec.ts --project=chromium`. Every test reads the built files.
 *   Programs    YouthWIDE (evidence after The Challenge, its H2 and two trial tiles, the glance order, the delivery-model sentence in How It Works, the governments heading, safeguarding as one FAQ answer), JobReady@Campus (two statistics, the
 *               university band with the NU figures, two bands gone, the FAQ), JobReady@Work (the ManpowerGroup tile, one closing band with the two cards' actions, the cuts), the NU overview and course pages (the lead, the short-form line, the
 *               course-page order, the single fit and caveat), SuperKids (the parents' link, the glance, "Agreement Targets", the cost question, the gallery before the start band) and the Programs hub cards.
 *   Model       Our Model (the hero lead, the evidence after the path), the pipeline's "Train" step, TalentLEAP and the JobReady Platform (first-screen actions, no "On This Page", the date at the foot, the cuts and the closing band).
 *   Partners    the hub (the hero, the two route cards), Development Partners, Governments, Foundations, Universities, Employers, Investors and Local Partners (heroes, glance notes, the cut evidence strips, the track menu, the delivery-model
 *               sentence in How It Works, the due-diligence band, the FAQ and closing-band changes).
 *   Shared      the program-sizes note (Home, JobReady@Campus, Development Partners, Foundations; Governments' briefing form), the track menu once per page, the delivery-model sentence once per page, the meta descriptions unchanged.
 *   Dates       every page whose visible text changed is dated 2026-11-21 (its "Last updated" line and/or JSON-LD dateModified).
 */

const TODAY = '2026-11-21';
const TODAY_SHOWN = 'November 21, 2026';
// WP168-B (owner decisions of 24 November 2026): JobReady@Work and Employers (the Akij Group line) and the five NU pages (campus, next intake, installments) changed again and are dated 2026-11-24.
const WP168B_DAY = '2026-11-24';
const WP168B_SHOWN = 'November 24, 2026';

const html = (rel: string) => readFileSync(join(DIST_DIR, rel, 'index.html'), 'utf8');
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
/** Readable text: comments, scripts, styles and screen-reader-only notes removed, tags stripped, no space before punctuation. */
const text = (raw: string) =>
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
const mainText = (rel: string) => text(mainRaw(rel));
const count = (hay: string, needle: string) => hay.split(needle).length - 1;
/** The element with that id (section, aside, div or article), from its opening tag to its own closing tag. */
function byId(rel: string, id: string): string {
  const raw = html(rel);
  const open = new RegExp(`<(section|aside|div|article)\\b[^>]*\\bid="${id}"[^>]*>`).exec(raw);
  expect(open, `#${id} is on ${rel}`).toBeTruthy();
  const tagName = open![1];
  const tag = new RegExp(`<(/?)${tagName}\\b[^>]*>`, 'gi');
  tag.lastIndex = open!.index;
  let depth = 0;
  for (let m = tag.exec(raw); m; m = tag.exec(raw)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return raw.slice(open!.index, tag.lastIndex);
  }
  throw new Error(`${rel}: #${id} is not closed`);
}
const bandText = (rel: string, id: string) => text(byId(rel, id));
/** The page's hero (<section class="hero ...">, the Hero component every hero uses), to its own closing tag. */
function heroRaw(rel: string): string {
  const raw = html(rel);
  const open = /<section class="hero\b[^>]*>/.exec(raw);
  expect(open, `${rel} has a hero`).toBeTruthy();
  const tag = /<(\/?)section\b[^>]*>/gi;
  tag.lastIndex = open!.index;
  let depth = 0;
  for (let m = tag.exec(raw); m; m = tag.exec(raw)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return raw.slice(open!.index, tag.lastIndex);
  }
  throw new Error(`${rel}: the hero is not closed`);
}
/** Section and aside ids inside <main>, in page order. */
const bandIds = (rel: string) => [...mainRaw(rel).matchAll(/<(?:section|aside)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
const h2s = (rel: string) => [...mainRaw(rel).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));
const metaDescription = (rel: string) => decode(/<meta name="description" content="([^"]*)"/.exec(html(rel))?.[1] ?? '');
type Node = Record<string, unknown>;
const ld = (rel: string): Node[] =>
  [...html(rel).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const j = JSON.parse(m[1]) as { '@graph'?: Node[] } & Node;
    return (j['@graph'] ?? [j]) as Node[];
  });
const dateModified = (rel: string) => ld(rel).map((n) => n.dateModified).filter(Boolean);

test.describe('WP166-B programs: YouthWIDE', () => {
  const P = 'programs/youthwide';
  test('the evidence follows The Challenge, before the track record, How It Works and the governments band', () => {
    const ids = bandIds(P);
    expect(ids.indexOf('proof-band')).toBe(ids.indexOf('problem') + 1);
    expect(ids.indexOf('proof-band')).toBeLessThan(ids.indexOf('guide'));
    expect(ids.indexOf('guide')).toBeLessThan(ids.indexOf('mechanism'));
    expect(ids.indexOf('mechanism')).toBeLessThan(ids.indexOf('governments'));
    expect(ids.indexOf('governments')).toBeLessThan(ids.indexOf('cases'));
  });
  test('the evidence band states the result, shows both trial tiles and has no qualifier lead', () => {
    const band = bandText(P, 'proof-band');
    expect(band).toContain('More Employment for Women Offered a Place, in a Randomized Trial');
    expect(band).not.toContain('Trial and Survey Evidence');
    expect(band).not.toContain('Trial figures are for CodersTrust’s WSDFM program. Survey figures are among surveyed completers');
    expect(TRIAL_SENTENCE.text).toBe('A randomized trial of CodersTrust’s WSDFM program by the BRAC Institute of Governance and Development (BIGD). Two results for women offered a place:');
    expect(band).toContain(TRIAL_SENTENCE.text);
    expect(band).not.toContain('alongside the employment effect below');
    expect(byId(P, 'proof-band')).toMatch(/data-fact="RC-02"/);
    expect(byId(P, 'proof-band')).toMatch(/data-fact="RC-01"/);
    expect(band).toContain('+41%');
    expect(band).toContain(fact('RC-01').stat!.label);
    expect(band).toContain('median monthly income among surveyed completers at the October 2026 survey');
  });
  test('the glance keeps its settled order and the full aim (R2-10 not applied: WP30d, WP105); no delivery-model sentence in the glance', () => {
    const glance = byId(P, 'program-glance');
    const labels = [...glance.matchAll(/<dt\b[^>]*>([\s\S]*?)<\/dt>/g)].map((m) => text(m[1]));
    expect(labels.slice(0, 2)).toEqual(['Designed for Three Regions', 'Who It Is For']);
    const g = text(glance);
    expect(g).toContain('Bangladesh is where most delivery has been. YouthWIDE aims to train 1 million educated youth (Higher Secondary Certificate or above)');
    expect(g).not.toContain(DELIVERY_MODEL.text);
  });
  test('the delivery-model sentence is in the "What We Deliver" card, once on the page', () => {
    expect(bandText(P, 'mechanism')).toContain(`${DELIVERY_MODEL.text} Certification exam preparation by track, then three months of milestone-based mentoring.`);
    expect(count(mainText(P), DELIVERY_MODEL.text)).toBe(1);
  });
  test('the governments band is headed with its benefit; the 2030 aim tile stays', () => {
    const band = bandText(P, 'governments');
    expect(band).toContain('Designed for the Digital Labs and Colleges Governments Already Have');
    expect(band).not.toContain('Delivery Base in Bangladesh and the 2030 Aim');
    expect(band).toContain('educated youth YouthWIDE aims to train by 2030');
  });
  test('safeguarding is one FAQ answer; the "Protected by Design" band is gone', () => {
    expect(mainText(P)).not.toContain('Protected by Design');
    expect(bandIds(P)).not.toContain('governance');
    const faq = bandText(P, 'faq');
    expect(faq).toContain('What About Safeguarding and Data Protection? Safeguarding and data protection are specified for each program and agreed before enrollment. See how we handle them.');
  });
  test('dated 2026-11-21', () => {
    expect(mainText(P)).toContain(`Last updated ${TODAY_SHOWN}`);
    expect(dateModified(P)).toContain(TODAY);
  });
});

test.describe('WP166-B programs: JobReady@Campus', () => {
  const P = 'programs/jobready-campus';
  test('the problem band shows PX-02 and PX-05, not the two cards that repeated its lead', () => {
    const band = byId(P, 'problem');
    expect(band).toMatch(/data-fact="PX-02"/);
    expect(band).toMatch(/data-fact="PX-05"/);
    const t = text(band);
    expect(t).toContain('19M+');
    expect(t).toContain('72%');
    expect(t).not.toContain('Skills Employers Cannot See');
    expect(t).not.toContain('Placement Evidence Is Missing');
  });
  test('the university band names the three partners and carries the NU figures, their note and the three evidence links', () => {
    const t = bandText(P, 'guide');
    expect(t).toContain('Working with National University, UPEACE and CCNY');
    expect(t).not.toContain('Universities Partner with CodersTrust');
    expect(t).toContain('1.5M+');
    expect(t).toContain('3M+');
    expect(t).toContain('These figures describe National University’s size and the learners being onboarded; they are not learners trained by CodersTrust.');
    for (const l of ['The Randomized Trial', 'Impact Survey 2026', 'Case Studies']) expect(t).toContain(l);
  });
  test('the "Delivery Context" and "What You Get" bands are gone; the "What" card carries the tracks and the delivery model', () => {
    const t = mainText(P);
    expect(t).not.toContain('Delivery Context: National University');
    expect(t).not.toContain('Built Around What Institutions Ask For');
    expect(bandText(P, 'mechanism')).toContain(`Preparation for industry-recognized certifications on tracks set from employer demand, plus professional internships where employer placements are available. ${DELIVERY_MODEL.text}`);
    expect(count(t, DELIVERY_MODEL.text)).toBe(1);
    expect(bandText(P, 'program-glance')).not.toContain(DELIVERY_MODEL.text);
  });
  test('the FAQ: the short outcomes answer, the degree-holders question and what the institution provides', () => {
    const f = bandText(P, 'faq');
    expect(f).toContain('How Do You Prove Outcomes? We plan a baseline at enrollment, follow-up surveys at 3, 6 and 12 months and monthly reports for every cohort');
    expect(f).not.toContain('Offer letters document job offers');
    expect(f).toContain('Has CodersTrust Worked with Degree Holders Before? Yes. Among alumni of CodersTrust’s programs who answered the October 2026 survey, 85.0% hold a bachelor’s degree or higher.');
    expect(f).not.toContain('Who Is JobReady@Campus For?');
    expect(f).toContain('What Does Our Institution Need to Provide? Campus labs to serve as blended-learning centers and faculty members to act as coordinators. The labs run with CodersTrust-trained facilitators.');
  });
  test('the options lead puts the reader’s choice first; dated 2026-11-21', () => {
    expect(bandText(P, 'offer')).toContain('You choose the starting scope in the discovery session, for your goals, country and delivery capacity. The sizes below are program sizes, not commitments.');
    expect(mainText(P)).toContain(`Last updated ${TODAY_SHOWN}`);
    expect(dateModified(P)).toContain(TODAY);
  });
});

test.describe('WP166-B programs: JobReady@Work', () => {
  const P = 'programs/jobready-work';
  test('the glance opens with the ManpowerGroup tile (PX-05)', () => {
    const g = byId(P, 'program-glance');
    expect(g).toMatch(/data-fact="PX-05"/);
    expect(text(g)).toContain('of employers globally reported difficulty finding talent in 2026 (ManpowerGroup, 2026)');
    expect(g.indexOf('data-fact="PX-05"')).toBeLessThan(g.indexOf('<dl'));
  });
  test('one closing band: the closing heading, the two cards, each with its action', () => {
    const cta = byId(P, 'cta');
    const t = text(cta);
    expect(t).toContain('Tell Us About Your Team and Your Roles');
    expect(t).toMatch(/Train Your Team A training program scoped to your team: needs assessment, a customized curriculum and interactive workshops\. Plan Your First Team Program/);
    expect(t).toMatch(/Hire Job-Ready Talent Access to job-ready candidates introduced through CodersTrust’s placement team\. Hire JobReady Talent/);
    expect(t).toContain('A discovery session is a conversation, not a commitment.');
    expect(cta.match(/class="btn btn--/g)?.length).toBe(1);
    const m = mainText(P);
    expect(m).not.toContain('A Training Program for Your Team, and Talent When You Need It');
    expect(count(m, 'Pick one or both.')).toBe(1); // the hero lead keeps it ("... placement team. Pick one or both."); the options band's lead is gone
  });
  test('no platform question, no "Independent Evaluation Welcome" card; How It Works links the platform page', () => {
    const m = mainText(P);
    expect(m).not.toContain('What Does the JobReady Platform Offer?');
    expect(m).not.toContain('Independent Evaluation Welcome');
    expect(bandText(P, 'mechanism')).toContain('See the JobReady Platform');
    expect(bandText(P, 'faq')).toContain('What Does It Cost?');
  });
  test('dated 2026-11-24 (WP168-B; WP166-B dated it 2026-11-21)', () => {
    expect(mainText(P)).toContain(`Last updated ${WP168B_SHOWN}`);
    expect(dateModified(P)).toContain(WP168B_DAY);
  });
});

test.describe('WP166-B programs: NU Post Graduate Diploma', () => {
  const NU = 'programs/nu-postgraduate-diploma';
  const COURSES = ['digital-marketing', 'ict', 'cyber-security', 'data-analytics'];
  const SHORT_FORM = 'A short form: your name, contact details and course. Admissions then shares the application steps.';
  test('the overview lead names the diploma, its year on campus and the four fields; the course lead no longer repeats them', () => {
    expect(VALUE_PROPOSITION.nuPgd).toBe('A one-year National University Post Graduate Diploma, on campus, delivered by CodersTrust. Choose digital marketing, information and communication technology (ICT), cybersecurity or data analytics.');
    const t = mainText(NU);
    expect(t).toContain(VALUE_PROPOSITION.nuPgd);
    expect(t).not.toContain('We help learners prepare for digital work through the National University Post Graduate Diploma.');
    expect(bandText(NU, 'courses')).toContain('Four courses, delivered by CodersTrust, an affiliated college (College Code: 6634) under the National University of Bangladesh.');
  });
  test('the overview cuts the skills card and the eligibility FAQ', () => {
    const t = mainText(NU);
    expect(t).not.toContain('It Is Hard to Know Which Skills to Pick');
    expect(t).not.toContain('Where Do I Find Eligibility, Schedule and Fees?');
    expect(bandText(NU, 'problem')).toContain('72%');
  });
  for (const rel of [NU, ...COURSES.map((c) => `${NU}/${c}`)]) {
    test(`${rel}: the short-form line under the hero button; dated 2026-11-24 (WP168-B; WP166-B dated it 2026-11-21)`, () => {
      const hero = heroRaw(rel);
      expect(text(hero)).toContain(SHORT_FORM);
      expect(mainText(rel)).toContain(`Last updated ${WP168B_SHOWN}`);
      expect(dateModified(rel)).toContain(WP168B_DAY);
    });
  }
  for (const c of COURSES) {
    test(`${c}: what you study comes before Before You Apply; fit and the outcome caveat are each said once`, () => {
      const rel = `${NU}/${c}`;
      const ids = bandIds(rel);
      expect(ids.slice(0, 4)).toEqual(['who', 'curriculum', 'before-you-apply', 'also-consider']);
      const t = mainText(rel);
      expect(t).not.toContain('Right for you if you meet the eligibility above');
      expect(count(t, 'depends on your experience, portfolio and local market')).toBe(1);
      expect(bandText(rel, 'who')).toContain('role readiness depends on your experience, portfolio and local market');
    });
  }
});

test.describe('WP166-B programs: SuperKids and the Programs hub', () => {
  const SK = 'programs/superkids';
  test('SuperKids: the parents’ link in the hero; the shorter glance rows', () => {
    expect(text(heroRaw(SK))).toContain('Parents: Explore SuperKids Courses at JobReady.global');
    const g = bandText(SK, 'program-glance');
    expect(g).toContain('Who It Is For Schools and education partners that want young learners to build digital skills early.');
    expect(g).toContain('Agreements Department of ICT (DoICT) and National Curriculum and Textbook Board (NCTB).');
    expect(g).not.toContain('details below');
    expect(count(mainText(SK), '400+')).toBe(1); // WP143: the 400+ figure once (Delivery and Agreements)
  });
  test('SuperKids: "Agreement Targets", one line per agreement, the caveat once, no agreement cards', () => {
    const a = bandText(SK, 'agreements');
    expect(a).toContain('Agreement Targets');
    expect(a).not.toContain('Agreed, Not Delivered');
    expect(a).toContain('DoICT agreement, primary-school STEM and robotics: target of 20M+ students through 9,000+ digital labs in Bangladesh.');
    expect(a).toContain('NCTB agreement, competency-based experiential learning: target of 20M+ students.');
    expect(count(a, 'These are agreement targets, not delivered reach.')).toBe(1);
    expect(byId(SK, 'agreements')).not.toContain('status="Agreement"');
    expect(a).not.toMatch(/Agreement DoICT Primary-school STEM and robotics\./);
  });
  test('SuperKids: the C6 band is the statement alone; the cost question is in the FAQ; the gallery comes before the start band', () => {
    expect(mainText(SK)).not.toContain('Looking for a SuperKids course for your own child');
    expect(bandText(SK, 'faq')).toContain('What Does It Cost? Pricing is set per program, and we share an indicative budget in the discovery session.');
    const ids = bandIds(SK);
    expect(ids.indexOf('in-the-field')).toBe(ids.indexOf('offer') - 1);
    const offer = bandText(SK, 'offer');
    expect(offer).toContain('Three Things to Bring to the Discovery Session');
    expect(offer).not.toContain('Options Are Shaped with You in a Discovery Session');
    expect(offer).not.toContain('Pricing is set per program');
    expect(mainText(SK)).toContain(`Last updated ${TODAY_SHOWN}`);
  });
  test('Programs hub: the YouthWIDE card says what the program does; each partner-program card opens with "Explore ..."', () => {
    const grid = bandText('programs', 'programs-grid');
    expect(grid).toContain('Prepares educated, unemployed and underemployed youth for paid digital work through training, mentoring and placement support, in co-funded country cohorts.');
    expect(grid).not.toContain('The youth digital-employment program, designed as co-funded country cohorts.');
    for (const l of ['Explore YouthWIDE', 'Explore JobReady@Campus', 'Explore JobReady@Work']) expect(grid).toContain(l);
    expect(dateModified('programs')).toContain(TODAY);
  });
});

test.describe('WP166-B model: Our Model, TalentLEAP and the JobReady Platform', () => {
  test('Our Model: the hero lead; the evidence follows the path; the scope paragraph follows the pipeline', () => {
    const P = 'our-model';
    expect(text(heroRaw(P))).toContain('Assessment, certification-focused training, three months of milestone-based mentoring and placement support, with monthly reports on progress toward paid work for every supported cohort.');
    expect(mainText(P)).not.toContain('One integrated path:');
    const ids = bandIds(P);
    expect(ids.indexOf('evidence')).toBe(ids.indexOf('path') + 1);
    expect(bandText(P, 'evidence')).toContain('What an Independent Randomized Trial Found');
    expect(mainText(P)).not.toContain('Evidence Behind the Approach');
    const path = byId(P, 'path');
    expect(path.indexOf('make up the Learn stage')).toBeLessThan(path.indexOf('this path is the delivery model'));
    expect(metaDescription(P)).toContain('One integrated path: assessment, certification-focused training'); // the description is package A's
  });
  test('the stage pipeline’s second step is "Train" (Our Model and TalentLEAP)', () => {
    for (const P of ['our-model', 'our-model/talentleap']) {
      const t = bandText(P, P === 'our-model' ? 'path' : 'how');
      expect(t).toContain('Train Skill units on a track set from employer demand, with hands-on labs.');
      expect(t).toContain('Assess, Train and Prepare for Certification make up the Learn stage; Earn and Prosper follow.');
      expect(t).not.toContain('Assess, Learn and Prepare');
    }
  });
  test('TalentLEAP: the opening, the first-screen actions, the difference first, the disclosures beside the figures, no "On This Page", the date at the foot', () => {
    const P = 'our-model/talentleap';
    const m = mainText(P);
    expect(m).toContain('TalentLEAP organizes learning around skill units that are assessed, not around hours attended alone. Levels run from Competent to Proficient and Expert, and three months of milestone-based mentoring follow the course.');
    expect(mainRaw(P)).not.toContain('On This Page');
    const head = /<header class="lf-head"[\s\S]*?<\/header>/.exec(mainRaw(P))?.[0] ?? '';
    expect(text(head)).toContain('Request a Discovery Session');
    expect(text(head)).toContain('See the Evidence');
    expect(text(head)).not.toContain('Last updated');
    expect(bandIds(P).slice(0, 2)).toEqual(['different', 'glance']);
    expect(m).not.toContain('Evidence for Today’s Tracks');
    expect(bandText(P, 'glance')).toContain('These results are from CodersTrust programs, not TalentLEAP’s features on their own. Today’s 100-hour tracks have not yet been independently evaluated; a pilot scorecard tracks agreed outcomes and independent evaluation is welcome.');
    expect(m.trim().endsWith(`Last updated ${TODAY_SHOWN}`)).toBe(true);
    expect(dateModified(P)).toContain(TODAY);
  });
  test('JobReady Platform: first-screen actions, four jobs, "What It Does", no contract scope, the connectivity question and the new closing', () => {
    const P = 'our-model/jobready-platform';
    const head = /<header class="lf-head"[\s\S]*?<\/header>/.exec(mainRaw(P))?.[0] ?? '';
    expect(text(head)).toContain('Request a Discovery Session');
    expect(text(head)).toContain('Visit jobready.global');
    expect(mainRaw(P)).not.toContain('On This Page');
    const jobs = bandText(P, 'jobs');
    for (const l of ['JobReady is designed to do four jobs:', 'Train. Youth learn through courses, including preparation for industry certification where a track offers one.', 'Connect to Work. Learners reach local, remote and global work.', 'Supply Talent. Employers get job-ready talent.', 'Equip Institutions. Institutions get a digital delivery platform.']) {
      expect(jobs).toContain(l);
    }
    expect(jobs).not.toContain('The table below lists its capabilities.');
    expect(byId(P, 'status')).toMatch(/<th scope="col"[^>]*>What It Does<\/th>/);
    const why = bandText(P, 'why');
    expect(why).toContain('JobReady builds on CodersTrust’s delivery record and its role with National University.');
    expect(why).not.toContain('Contracted Scope');
    expect(why).not.toContain('people in the training and curriculum scopes of six government contracts');
    expect(bandText(P, 'faq')).toContain('Will Lessons Work Where Connectivity Is Limited? Lessons work over a 1.5 Mbps connection, and 720p lessons can be downloaded for offline viewing.');
    const cta = bandText(P, 'cta');
    expect(cta).toContain('See How JobReady Would Fit Your Program');
    expect(cta).toContain('A discovery session covers how JobReady fits your program. In your inquiry, include two suitable times.');
    expect(cta).toContain('Funding the Platform? Discuss a Platform Grant');
    expect(cta).toContain('Investing? See Investors');
    expect(mainText(P).trim().endsWith(`Last updated ${TODAY_SHOWN}`)).toBe(true);
    expect(dateModified(P)).toContain(TODAY);
  });
});

test.describe('WP166-B partners: hub, Development Partners, Governments and Foundations', () => {
  test('hub: the hero leads with SC-01; the routes lead is gone; two route cards renamed', () => {
    const P = 'partner-with-us';
    const hero = heroRaw(P);
    expect(text(hero)).toContain('130,000+ learners trained since 2014. Pick the route built for your organization: each has its own evidence, offer and next step.');
    expect(hero).toMatch(/data-fact="SC-01"/);
    const routes = bandText(P, 'audiences');
    expect(routes).not.toContain('Each route has its own evidence, offer and next step.');
    expect(routes).toContain('Report Results, Not Just Training Numbers');
    expect(routes).toContain('Invest in the JobReady Platform For impact investors: back the staged rollout of CodersTrust’s digital learning and earning platform.');
    expect(routes).not.toContain('Prove Delivery in Your Portfolio');
    expect(routes).not.toContain('Back JobReady’s Staged Rollout');
  });
  test('Development Partners', () => {
    const P = 'partner-with-us/development-partners';
    expect(text(heroRaw(P))).toContain(VALUE_PROPOSITION.developmentPartners);
    expect(VALUE_PROPOSITION.developmentPartners).toBe('Mentored, certification-focused training for educated, unemployed and underemployed youth, with placement support and follow-up surveys at 3, 6 and 12 months that show who is in paid work.');
    expect(bandText(P, 'glance')).toContain('The trial evaluated CodersTrust’s WSDFM program; the survey describes what completers who responded report about work and income. Read the Trial Results Impact Survey 2026');
    expect(bandIds(P)).not.toContain('proof-band');
    expect(mainText(P)).not.toContain('See the Evidence Behind the Results');
    expect(bandText(P, 'guide')).not.toContain('Our TalentLEAP method');
    expect(bandText(P, 'mechanism')).toContain(`it builds on results from earlier programs in Bangladesh and Kosovo. ${DELIVERY_MODEL.text}`);
    const features = bandText(P, 'features');
    expect(features).not.toContain(DELIVERY_MODEL.text);
    expect(features).toContain(`Outreach, accessible selection and tracks chosen from employer demand, with safeguarding agreed for each program. ${TRACK_MENU.text}`);
    expect(bandText(P, 'faq')).toContain('What Does It Cost? Pricing is set per program; we share an indicative budget in the discovery session. Every pilot is judged against its scorecard, including cost per completer and per verified outcome, with thresholds agreed with you before the first cohort starts. See what a partnership includes.');
    expect(count(mainText(P), 'Every pilot is judged against its scorecard')).toBe(1);
    expect(dateModified(P)).toContain(TODAY);
  });
  test('Governments', () => {
    const P = 'partner-with-us/governments';
    const hero = text(heroRaw(P));
    expect(hero).toContain('Build a National Digital Workforce Through Graduates and Digital Labs'); // the owner's H1 (tests/wp30c.spec.ts): R3-03's H1 is not applied
    expect(HEADLINE.governments).toBe('Build a National Digital Workforce Through Graduates and Digital Labs');
    expect(hero).toContain('Curriculum, Training of Trainers and phased delivery in government digital labs, with spending reported against an agreed scorecard.');
    expect(metaDescription(P)).toBe('Build a national digital workforce through graduates and existing digital labs: curriculum, trainer training and phased delivery. Request a briefing.'); // package A's (R7-22), merged
    const glance = byId(P, 'glance');
    expect(text(glance)).toContain('Proof at a Glance');
    const order = ['GV-12', 'PR-05', 'RC-02', 'PR-02'].map((id) => glance.search(new RegExp(`data-fact="${id}\\b`)));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(text(glance)).toContain('More than four times the 2.3-point average across nine vocational-training trials.');
    expect(text(glance)).toContain('The trial evaluated CodersTrust’s WSDFM program; the survey describes what completers who responded report about work and income.');
    const problem = byId(P, 'problem');
    expect(problem).toMatch(/data-fact="PX-02"/);
    expect(problem).not.toMatch(/data-fact="PX-01"/);
    expect(text(problem)).not.toContain('Graduates Struggle to Find Work');
    expect(bandText(P, 'mechanism')).toContain(DELIVERY_MODEL.text);
    expect(bandText(P, 'features')).toContain(`${TRACK_MENU.text} Three months of mentoring and placement support follow, toward local, remote and global work.`);
    expect(bandText(P, 'faq')).toContain('How Fast Can We Start? Delivery uses government digital labs you already run. Timing follows your agency’s own procurement timeline, so the first step is a briefing for your ministry.');
    const offer = bandText(P, 'offer') + mainText(P);
    expect(offer).toContain('Or Start with Curriculum and Trainer Training');
    expect(offer).toContain('Curriculum development, manuals and Training of Trainers, as provided for Her Power.');
    expect(offer).toContain('Training for staff on the learning platform and lab operations, as contracted for the Digital Lab Establishment Project (Phase II).');
    expect(bandText(P, 'cta')).toContain('A briefing is a conversation, not a commitment.');
    expect(dateModified(P)).toContain(TODAY);
  });
  test('Foundations', () => {
    const P = 'partner-with-us/foundations';
    const hero = text(heroRaw(P));
    expect(hero).toContain('Know What Your Grant Changed, Not Just the Hours It Paid For');
    expect(hero).toContain('Fund mentored, certification-focused training for youth, with a pilot scorecard agreed with you, monthly reports and outcomes tracked for 12 months after each course.');
    expect(HEADLINE.foundations).toBe('Know What Your Grant Changed, Not Just the Hours It Paid For');
    expect(bandText(P, 'problem')).toContain('Most training budgets count who enrolled, not who is earning afterward.');
    expect(mainText(P)).not.toContain('You want to know what your grant changed');
    expect(bandText(P, 'glance')).toContain('More than four times the 2.3-point average across nine vocational-training trials.');
    const guide = bandText(P, 'guide');
    expect(guide.indexOf('Organizations that have worked with CodersTrust include the Rockefeller Foundation, DANIDA and Porticus.')).toBeGreaterThan(-1);
    expect(guide).not.toContain('From a Copenhagen launch to work in 16 countries and territories.');
    expect(guide).not.toContain('Our TalentLEAP method');
    expect(count(guide, 'Organizations that have worked with CodersTrust include')).toBe(1);
    expect(bandText(P, 'mechanism')).toContain(DELIVERY_MODEL.text);
    expect(bandText(P, 'features')).toContain('Three months of mentoring and placement support are standard inclusions, and outcomes are tracked for 12 months after each course.');
    expect(bandText(P, 'features')).not.toContain(DELIVERY_MODEL.text);
    expect(bandText(P, 'cta')).toContain('A discovery session is a conversation, not a commitment.');
    expect(bandIds(P)).not.toContain('proof-band');
    expect(dateModified(P)).toContain(TODAY);
  });
});

test.describe('WP166-B partners: Universities, Employers, Investors and Local Partners', () => {
  test('Universities', () => {
    const P = 'partner-with-us/universities';
    expect(text(heroRaw(P))).toContain('Mentored, certification-focused training in your campus labs, alongside the degree, with placement evidence your institution can report.');
    const nu = byId(P, 'offer-evidence');
    expect(text(nu)).toContain('Official Training Partner of the World’s Second-Largest University by Enrollment');
    const note = 'These cards describe the learners being onboarded and National University’s size, not learners trained by CodersTrust.';
    expect(nu.indexOf('class="pe"')).toBeLessThan(nu.indexOf(note));
    const problem = byId(P, 'problem');
    expect(problem).toMatch(/data-fact="PX-02"/);
    expect(text(problem)).not.toContain('Degree Holders Struggle to Find Work');
    expect(bandText(P, 'guide')).not.toContain('Our TalentLEAP method');
    const mech = bandText(P, 'mechanism');
    expect(mech).toContain(DELIVERY_MODEL.text);
    expect(mech).toContain('Our TalentLEAP method organizes skills into career paths.');
    expect(mech).toContain('How TalentLEAP Works');
    expect(bandText(P, 'features')).toContain(TRACK_MENU.text);
    expect(bandText(P, 'features')).not.toContain('built around the skills employers say they cannot find');
    expect(bandText(P, 'faq')).toContain('Does It Change Our Curriculum? Training runs in parallel with academic studies in your campus labs, and faculty members act as coordinators.');
    expect(bandText(P, 'cta')).toContain('A discovery session is a conversation, not a commitment.');
    expect(dateModified(P)).toContain(TODAY);
  });
  test('Employers', () => {
    const P = 'partner-with-us/employers';
    const hero = heroRaw(P);
    expect(text(hero)).toContain('Training built from a needs assessment of your roles, tasks and tools, plus job-ready candidates introduced by our placement team.');
    expect(text(hero)).not.toContain('AWS'); // the employer credentials are stated once, in the Track Record band (WP32)
    expect(count(mainText(P), 'AWS Authorized Training Partner')).toBe(1);
    expect(bandText(P, 'definition')).toContain('JobReady@Work is its program for employers: training built around your roles and job-ready talent through the placement team.');
    expect(bandText(P, 'hire-talent')).toContain('Our placement team introduces job-ready candidates from tracks such as digital marketing, graphic design, video editing, web design and development, digital accounting, Python programming and data analysis. Most delivery has been in Bangladesh. Talent requests are scoped against the experience and credentials available in the candidate pool.');
    const problem = bandText(P, 'problem');
    expect(problem).toContain('AI Skills Carry a Wage Premium');
    expect(problem).toContain('Globally, job postings requiring AI skills grew 69% vs. 9% for all postings, and workers with AI skills earned a 62% wage premium (PwC, 2026).');
    expect(problem).not.toContain('Your Teams Need Upskilling for AI Workflows');
    const guide = bandText(P, 'guide');
    expect(guide).toContain('Employers and Partners We Work With');
    expect(guide).not.toContain('We’ve Built This Path Since 2014');
    expect(guide).toContain('AWS Authorized Training Partner.');
    expect(guide).toContain('Organizations we have worked with, 2014–2026. These are working relationships, not endorsements.');
    expect(guide).not.toContain('not endorsements. CodersTrust is an AWS Authorized Training Partner.');
    expect(guide).not.toContain('Our TalentLEAP method');
    const mech = bandText(P, 'mechanism');
    expect(mech).toContain(DELIVERY_MODEL_WORK.text);
    expect(mech).toContain('Our TalentLEAP method organizes skills into career paths.');
    const features = bandText(P, 'features');
    expect(features).toContain('AI Skills Scoped to Your Team’s Tasks');
    expect(features).toContain('An AI-ready curriculum, designed to prepare people to work with AI tools, plus AI leadership and AI-transformation programs with AIvolve. Each track’s AI content is agreed with you before training starts.');
    expect(features).not.toContain(DELIVERY_MODEL_WORK.text);
    expect(features).toContain('See the Platform Capabilities');
    expect(count(mainText(P), DELIVERY_MODEL_WORK.text)).toBe(1);
    expect(bandText(P, 'faq')).not.toContain('What Does the JobReady Platform Offer?');
    const offer = bandText(P, 'offer');
    expect(offer).toMatch(/A Training Program Scoped to Your Team .* Plan Your First Team Program/);
    expect(offer).toMatch(/Talent Through the Placement Team .* Hire JobReady Talent/);
    const dd = bandText(P, 'due-diligence');
    expect(dd).toContain('Contracting Entities CT USA, Inc. in the United States or CodersTrust Bangladesh Ltd. in Bangladesh, depending on the program’s country and the contracting party’s requirements.');
    expect(dd).toContain('Ask About Due Diligence');
    expect(dd).not.toContain('Needs Assessment First');
    expect(dd).not.toContain('Progress Evaluation A progress evaluation checks results');
    expect(bandText(P, 'risk')).not.toContain('Independent Evaluation Welcome');
    expect(dateModified(P)).toContain(WP168B_DAY); // WP168-B: the Akij Group line (it was TODAY, 2026-11-21)
  });
  test('Investors', () => {
    const P = 'partner-with-us/investors';
    const hero = text(heroRaw(P));
    expect(hero).toContain('JobReady is CodersTrust’s digital learning and earning platform for emerging markets. Back its staged rollout.');
    expect(count(mainText(P), '130,000+')).toBe(1); // WP42: each delivered figure once on Investors, so R3-09's record sentence is not in the hero
    expect(count(mainText(P), 'JobReady is CodersTrust’s digital learning and earning platform for emerging markets.')).toBe(1);
    expect(bandText(P, 'thesis')).toContain('JobReady is designed to link learners to paid work through mentoring and placement support, the model CodersTrust has run since 2014.');
    expect(bandText(P, 'guide')).not.toContain('Aziz Ahmad'); // R3-36's leadership line is not applied: no person is named on Investors (WP43)
    const reach = byId(P, 'reach');
    expect(text(reach)).not.toContain('Not counted in the delivered reach');
    expect(reach.indexOf('The National University Partnership')).toBeGreaterThan(-1);
    expect(reach.indexOf('The National University Partnership')).toBeLessThan(reach.indexOf('Contracted Scope'));
    expect(text(reach)).toContain(`${fact('SC-04').text.split('; ')[0]}.`);
    expect(bandText(P, 'faq')).not.toContain('What Does the JobReady Platform Offer?');
    expect(bandText(P, 'offer')).toContain('Due diligence: CT USA, Inc., a for-profit company incorporated in New York, is CodersTrust’s parent company; CodersTrust Bangladesh Ltd. is its country office.');
    expect(bandText(P, 'mechanism')).toContain(DELIVERY_MODEL.text);
    expect(bandText(P, 'features')).not.toContain(DELIVERY_MODEL.text);
    expect(dateModified(P)).toContain(TODAY);
  });
  test('Local Partners', () => {
    const P = 'partner-with-us/local-partners';
    expect(text(heroRaw(P))).toContain('You mobilize learners and host the training. CodersTrust Bangladesh brings the curriculum, Training of Trainers, mentoring and placement support.');
    const guide = byId(P, 'guide');
    expect(guide).toMatch(/data-fact="SC-01"/);
    expect(guide).not.toMatch(/data-fact="GV-09"/);
    const g = text(guide);
    expect(g).toContain('Most delivery has been in Bangladesh.');
    expect(g).not.toContain('Our TalentLEAP method');
    expect(g).not.toContain('could host blended learning');
    expect(bandText(P, 'mechanism')).toContain(DELIVERY_MODEL.text);
    expect(bandText(P, 'features')).toContain(`You do not have to build the curriculum or certification route yourself. ${TRACK_MENU.text}`);
    expect(bandText(P, 'features')).not.toContain(DELIVERY_MODEL.text);
    expect(dateModified(P)).toContain(TODAY);
  });
});

test.describe('WP166-B shared strings', () => {
  test('the program-sizes note puts the reader’s choice first wherever it is printed', () => {
    expect(PROGRAM_SIZES_NOTE).toBe('You choose the starting scope in the discovery session, for your goals, country and delivery capacity. The sizes below are program sizes, not commitments.');
    expect(PROGRAM_SIZES_NOTE_BRIEFING).toBe('You choose the starting scope in the briefing, for your goals, country and delivery capacity. The sizes below are program sizes, not commitments.');
    for (const P of ['', 'programs/jobready-campus', 'partner-with-us/development-partners', 'partner-with-us/foundations']) {
      expect(mainText(P), P || 'home').toContain(PROGRAM_SIZES_NOTE);
      expect(mainText(P), P || 'home').not.toContain('These are program sizes, not commitments:');
    }
    expect(mainText('partner-with-us/governments')).toContain(PROGRAM_SIZES_NOTE_BRIEFING);
  });
  test('the track menu (PD-10) is one sentence, printed once on each page that names it', () => {
    expect(TRACK_MENU.text).toBe('Tracks are set per country from employer demand, from a menu that includes digital marketing, graphic design, video editing, web design and development, digital accounting, Python programming and data analysis.');
    for (const P of ['partner-with-us/development-partners', 'partner-with-us/governments', 'partner-with-us/universities', 'partner-with-us/local-partners']) {
      expect(count(mainText(P), TRACK_MENU.text), P).toBe(1);
    }
  });
  test('the delivery-model sentence is stated once on every page of the slice that states it', () => {
    const pages = ['programs/youthwide', 'programs/jobready-campus', 'partner-with-us/development-partners', 'partner-with-us/governments', 'partner-with-us/foundations', 'partner-with-us/universities', 'partner-with-us/local-partners', 'partner-with-us/investors', 'our-model', 'our-model/jobready-platform'];
    for (const P of pages) expect(count(mainText(P), DELIVERY_MODEL.text), P).toBe(1);
  });
  test('the brief due-diligence band: headed as the hub, names the entities, links the due-diligence inquiry', () => {
    for (const P of ['partner-with-us/development-partners', 'partner-with-us/governments', 'partner-with-us/foundations', 'partner-with-us/universities', 'partner-with-us/local-partners']) {
      const dd = bandText(P, 'due-diligence');
      expect(dd, P).toContain('Due Diligence in One View');
      expect(dd, P).toContain('CodersTrust contracts through CT USA, Inc. in the United States or CodersTrust Bangladesh Ltd. in Bangladesh, depending on the program’s country and your requirements. Safeguarding and reporting are specified for each program.');
      expect(dd, P).toContain('Governance and Accountability');
      expect(dd, P).toContain('Ask About Due Diligence');
      expect(dd, P).not.toContain('Confirm Contracting, Safeguarding and Reporting');
    }
    expect(bandText('partner-with-us/foundations', 'due-diligence')).toContain(fact('ID-12').text);
  });
  test('no TalentLEAP method line in the track-record band of the four funder and local pages', () => {
    for (const P of ['partner-with-us/development-partners', 'partner-with-us/governments', 'partner-with-us/foundations', 'partner-with-us/local-partners']) {
      expect(bandText(P, 'guide'), P).not.toContain('TalentLEAP');
    }
  });
});
