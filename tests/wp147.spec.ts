import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DIST_DIR } from './support/env';

/**
 * WP147 (owner answer 2026-11-01 on facilitators; Opus XHigh run 1 and Opus High run 22 Polish, kit 114).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp147.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Facilitators: "Trained by CodersTrust", never "local". The first explanation on a page says "facilitators trained and certified by CodersTrust (Training of Trainers)"; later mentions say "certified facilitators".
 *      No built file (HTML, JSON-LD, llms.txt) says "local facilitator"; the register's PD-06 reads "facilitators trained and certified by CodersTrust".
 *   2  The NYNJMSDC award stays in Aziz Ahmad's bio: the News Photographs caption names UTC Associates; the archived post moves from "Recognition" to "Leadership and Advocacy".
 *   3  XHigh Polish: Outcomes method line ("Impact Survey 2026") and the first use of "surveyed new earners"; the Employers FAQ answer; Governance "How to Ask"; Home FAQ ("follow-up survey results"),
 *      Home citation ("Hannane and Zhu"); the journal citation "(October 2026)" on TalentLEAP as on the Trial page; "NU Post Graduate Diploma courses".
 *   4  High run 22 Polish: one "Independent Evaluation Welcome" card; Home slide 4 drops "from program records"; one wording for the 30,000+ contract-scope tile.
 *   5  Owner date rule: a page with its own date moves to 2026-11-01 when its visible text changes.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);
const ldText = (rel: string) => decode([...html(rel).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n'));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|txt|xml|json|md|csv)$/.test(name)) out.push(p);
  }
  return out;
}

const GOVERNANCE = 'about/governance/index.html';
const OUR_MODEL = 'our-model/index.html';
const TALENTLEAP = 'our-model/talentleap/index.html';
const DEV = 'partner-with-us/development-partners/index.html';
const FOUNDATIONS = 'partner-with-us/foundations/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const LOCAL = 'partner-with-us/local-partners/index.html';
const UNIVERSITIES = 'partner-with-us/universities/index.html';
const EMPLOYERS = 'partner-with-us/employers/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const WORK = 'programs/jobready-work/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const HOME = 'index.html';
const IMPACT = 'impact/index.html';
const OUTCOMES = 'impact/outcomes-2026/index.html';
const PLATFORM = 'our-model/jobready-platform/index.html';
const PHOTOS = 'impact/in-the-field/news-photos/index.html';
const NEWS = 'news/index.html';
const POST_SLUG = 'aziz-ahmad-wins-the-nynjmsdc-partnership-award-in-the-united-states';
const POST = `news/${POST_SLUG}/index.html`;

const LONG = 'facilitators trained and certified by CodersTrust (Training of Trainers)';

test.describe('1 Facilitators: trained and certified by CodersTrust, never "local"', () => {
  test('no built file says "local facilitator" (page text, meta, JSON-LD, llms.txt)', () => {
    const hits = walk(DIST_DIR)
      .filter((f) => /\blocal[ ,-]+(?:\w+ )?facilitators?\b/i.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(DIST_DIR.length));
    expect(hits).toEqual([]);
  });

  test('the register: PD-06 says facilitators trained and certified by CodersTrust', () => {
    expect(fact('PD-06').text).toBe(
      'Up to 10 certification cohorts in parallel from about month 5; classes of 20 (labs) and 40 (lectures); hub-and-spoke delivery with facilitators trained and certified by CodersTrust for larger programs',
    );
  });

  test('every page that explains the facilitator model says "trained and certified by CodersTrust" once, on its first explanation', () => {
    for (const p of [GOVERNANCE, OUR_MODEL, TALENTLEAP, DEV, FOUNDATIONS, GOVERNMENTS, INVESTORS, LOCAL, UNIVERSITIES, CAMPUS, YOUTHWIDE]) {
      const text = main(p);
      expect(count(text, 'trained and certified by CodersTrust'), p).toBe(1);
      expect(text, p).toContain(LONG);
    }
  });

  test('"What Happens When Funding Ends?" (page and FAQ JSON-LD): the long form where it is the page’s only mention, "certified facilitators" where the page has explained it above', () => {
    const LONG_A = `Where included, what the program builds stays in place: ${LONG} and localized curricula.`;
    const SHORT_A = 'Where included, what the program builds stays in place: certified facilitators and localized curricula.';
    for (const p of [GOVERNANCE, TALENTLEAP, DEV, FOUNDATIONS]) {
      expect(main(p), p).toContain(LONG_A);
      expect(ldText(p), `${p} JSON-LD`).toContain(LONG_A);
      expect(main(p), p).not.toContain(SHORT_A);
    }
    for (const p of [GOVERNMENTS, LOCAL]) {
      expect(main(p), p).toContain(SHORT_A);
      expect(ldText(p), `${p} JSON-LD`).toContain(SHORT_A);
      expect(main(p), p).not.toContain(LONG_A);
    }
    const CAMPUS_A = 'Where included, what the program builds stays on your campus: certified facilitators, localized curricula and campus labs that serve as blended-learning centers.';
    expect(main(UNIVERSITIES)).toContain(CAMPUS_A);
    expect(ldText(UNIVERSITIES)).toContain(CAMPUS_A);
  });

  test('first explanations read in context', () => {
    expect(main(OUR_MODEL)).toContain(`After about five months of delivery, programs are designed to run up to 10 certification cohorts in parallel, using existing labs and ${LONG}.`);
    expect(main(CAMPUS)).toContain(`Campus labs work as blended-learning centers, with ${LONG}.`);
    expect(main(UNIVERSITIES)).toContain(`On-campus labs become blended-learning centers with ${LONG}; faculty members act as coordinators.`);
    expect(main(GOVERNMENTS)).toContain(`Where included: curriculum and manuals; ${LONG}; and blended learning in existing labs that works with limited connectivity, so rural labs can take part.`);
    expect(main(LOCAL)).toContain(`Larger programs are designed to run through ${LONG} in existing labs and colleges, coordinated centrally.`);
    expect(main(YOUTHWIDE)).toContain(`Blended training in existing labs and colleges, with ${LONG}; a central team coordinating local labs for larger programs.`);
  });

  test('later mentions say "certified facilitators"', () => {
    expect(main(LOCAL)).toContain('Certified facilitators, a localized curriculum and preparation for industry certification, delivered in blended classes.');
    expect(main(YOUTHWIDE)).toContain('Larger programs are designed to run in phases, up to 10 cohorts in parallel, with certified facilitators.');
    expect(ldText(YOUTHWIDE)).toContain('Larger programs are designed to run in phases, up to 10 cohorts in parallel, with certified facilitators.');
  });

  test('Investors: the national-scale answer says it once, in the long form (page and JSON-LD)', () => {
    const S = `larger programs are designed to run up to 10 cohorts in parallel through ${LONG} in existing labs and colleges.`;
    expect(main(INVESTORS)).toContain(S);
    expect(ldText(INVESTORS)).toContain(S);
  });
});

test.describe('2 The NYNJMSDC award stays in Aziz Ahmad’s bio', () => {
  test('News Photographs: the caption names the recipient, UTC Associates', () => {
    const text = main(PHOTOS);
    expect(text).toContain('UTC Associates, led by Aziz Ahmad, receives the NYNJMSDC Partnership Award, October 2022');
    expect(text).not.toContain('NYNJMSDC Partnership Award, United States, October 2022');
  });

  test('the archived post is under "Leadership and Advocacy", not "Recognition" (badge, filter, JSON-LD, counts)', () => {
    const post = html(POST);
    expect(post).toContain('<span class="badge badge--brand">Leadership and Advocacy</span>');
    expect(post).not.toContain('<span class="badge badge--brand">Recognition</span>');
    expect(post).toContain('"articleSection":"Leadership and Advocacy"');
    const news = html(NEWS);
    const item = [...news.matchAll(/<div class="nf__item[^"]*" data-topic="([a-z-]+)"[^>]*>([\s\S]*?)(?=<div class="nf__item|<\/section>)/g)].find((m) => m[2].includes(`/news/${POST_SLUG}/`));
    expect(item?.[1]).toBe('leadership-advocacy');
    expect(news).toMatch(/for="nf-recognition"[^>]*>Recognition <span[^>]*>4<\/span>/);
    expect(news).toMatch(/for="nf-leadership-advocacy"[^>]*>Leadership and Advocacy <span[^>]*>15<\/span>/);
  });

  test('Recognition keeps its page free of the award and its "More Recognition News" link', () => {
    const text = main('about/recognition/index.html');
    expect(text).not.toMatch(/NYNJMSDC/);
    expect(text).toContain('More Recognition News');
  });
});

test.describe('3 XHigh Polish', () => {
  test('Outcomes: the method line uses the public survey name', () => {
    const text = main(OUTCOMES);
    expect(text).toContain('Survey. Impact Survey 2026: an online alumni survey, fielded in October 2026.');
    expect(text).not.toContain('CodersTrust Impact Survey, October 2026');
  });

  test('Outcomes: "surveyed new earners" is defined before it is used (Results in Brief says it in plain words)', () => {
    const text = main(OUTCOMES);
    const definition = text.indexOf('Surveyed new earners are the completers who first earned during or after training.');
    expect(definition).toBeGreaterThan(0);
    expect(text.toLowerCase().indexOf('surveyed new earners')).toBe(definition);
    expect(text).toContain('of the 172 surveyed completers who first earned during or after training had started earning by six months after finishing the course (October 2026 survey)');
  });

  test('Employers: the FAQ answer states the needs assessment and stops repeating the Hire Talent band', () => {
    const A = 'We start with a needs assessment of your roles, tasks and required tools.';
    const BAND = 'Talent requests are scoped against the experience and credentials available in the candidate pool.';
    const text = main(EMPLOYERS);
    expect(text).toContain(A);
    expect(count(text, 'scoped against the experience and credentials available in the candidate pool')).toBe(1);
    expect(text).toContain(BAND);
    expect(text).not.toContain(`${A} For hiring`);
    expect(ldText(EMPLOYERS)).toContain(A);
    expect(ldText(EMPLOYERS)).not.toContain('For hiring, talent requests are scoped');
  });

  test('Governance: one "how to ask" instruction, the closing band’s (the card is gone)', () => {
    const text = main(GOVERNANCE);
    expect(text).not.toContain('How to Ask');
    expect(text).not.toContain('we reply with what can be shared');
    expect(count(text, 'Send the program or grant you are considering')).toBe(1);
    expect(text).toContain('Send the program or grant you are considering and the questions you need answered. We will reply with what can be shared.');
    expect(count(html(GOVERNANCE), /class="cp__item"/g)).toBe(5);
  });

  test('Home: partners receive follow-up survey results (page and JSON-LD)', () => {
    const S = 'Partners receive monthly reports and follow-up survey results at 3, 6 and 12 months.';
    expect(main(HOME)).toContain(S);
    expect(ldText(HOME)).toContain(S);
    expect(main(HOME)).not.toContain('monthly reports and follow-up surveys at 3, 6 and 12 months. Independent');
  });

  test('Home: the citation reads "Demirci, Hannane and Zhu, 2025"', () => {
    const text = main(HOME);
    expect(text).toContain('(Demirci, Hannane and Zhu, 2025)');
    expect(text).not.toContain('Hannane & Zhu');
  });

  test('journal citation: TalentLEAP gives "(October 2026)" as the Trial page does (page and JSON-LD)', () => {
    const S = 'Economic Development and Cultural Change 75(1): 367–399 (October 2026). https://doi.org/10.1086/741450';
    expect(main(TALENTLEAP)).toContain(S);
    expect(ldText(TALENTLEAP)).toContain(S);
    expect(main('impact/independent-evaluation/index.html')).toContain('Economic Development and Cultural Change 75(1): 367–399 (October 2026).');
  });

  test('running text says "NU Post Graduate Diploma courses" (the owner’s name), not "post graduate diploma courses"', () => {
    expect(fact('PA-05').text.startsWith('University partners: National University (official training partner; NU Post Graduate Diploma courses)')).toBe(true);
    expect(fact('SC-04').text).toContain('delivers NU Post Graduate Diploma courses');
    for (const p of [HOME, CAMPUS]) expect(main(p), p).toContain('National University (official training partner; NU Post Graduate Diploma courses)');
    for (const p of [INVESTORS, UNIVERSITIES]) expect(main(p), p).toContain('delivers NU Post Graduate Diploma courses');
    expect(main('programs/index.html')).toContain('National University Post Graduate Diploma courses delivered by CodersTrust, in ');
    const hits = walk(DIST_DIR)
      .filter((f) => /post graduate diploma courses/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(DIST_DIR.length));
    expect(hits).toEqual([]);
  });
});

test.describe('4 High run 22 Polish', () => {
  test('"Independent Evaluation Welcome" reads the same on JobReady@Campus, JobReady@Work and the route pages', () => {
    for (const p of [CAMPUS, WORK, GOVERNMENTS, UNIVERSITIES, EMPLOYERS, LOCAL]) {
      const text = main(p);
      expect(text, p).toContain('Independent Evaluation Welcome We support third-party evaluation of outcomes.');
      expect(text, p).not.toContain('Independent Evaluation Is Welcome');
      expect(text, p).not.toContain('support a third-party evaluation');
    }
  });

  test('Home slide 4: the WSDFM line drops "from program records" (the slide label says it)', () => {
    const text = main(HOME);
    expect(text).toContain('WSDFM: 711 of 1,000 enrolled in work (71%).');
    expect(text).not.toContain('enrolled in work (71%), from program records');
  });

  test('the 30,000+ tile description is one wording on Impact, Governments, Investors and JobReady Platform', () => {
    const W = 'people in the training and curriculum scopes of six government contracts';
    for (const p of [IMPACT, GOVERNMENTS, INVESTORS, PLATFORM]) {
      const text = main(p);
      expect(text, p).toContain(W);
      expect(text, p).not.toContain('people in the contracted scopes of six government contracts');
      expect(text, p).not.toContain('people in the scopes of six government contracts');
    }
  });
});

test('5 owner date rule: changed pages that carry their own date read 2026-11-01 or later', () => {
  const pages = [HOME, GOVERNANCE, OUR_MODEL, TALENTLEAP, DEV, FOUNDATIONS, GOVERNMENTS, INVESTORS, LOCAL, UNIVERSITIES, EMPLOYERS, CAMPUS, WORK, YOUTHWIDE, IMPACT, OUTCOMES, PHOTOS, NEWS, POST, 'programs/index.html'];
  for (const p of pages) {
    const raw = html(p);
    for (const m of raw.matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)) expect(m[1] >= '2026-11-01', `${p} dateModified ${m[1]}`).toBe(true);
    const stamp = /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(raw)?.[1];
    if (stamp) expect(stamp >= '2026-11-01', `${p} Last updated ${stamp}`).toBe(true);
  }
});
