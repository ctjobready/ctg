import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP149 (Opus XHigh run 3, kit 116: 1 Minor, 3 Polish, and the facilitator-placement principle challenge, accepted).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp149.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Facilitator placement rule (replaces "first mention on the page", WP147/WP148): the long form "facilitators trained by CodersTrust (Training of Trainers)" sits in the sentence where the page explains who
 *      delivers the training (its delivery sentence; the "What Happens When Funding Ends?" answer where that is the page's only mention). Other mentions say "CodersTrust-trained facilitators", "trained facilitators" or
 *      "facilitator support". Our Model: the Foundation Tracks card is back to PD-17's meaning ("extra foundation hours with facilitator support"); the long form is in the "Local Labs, Coordinated Delivery" card.
 *   2  Development Partners, "Our Approach": "Partners receive monthly reports, and outcomes are tracked after each course." (it was "... monthly reports and outcome tracking after each course.").
 *   3  Shafqat Ullah's bio: the expertise sentence is a semicolon list ("AI and cloud-native architecture; SaaS and mobile app design; and, since 2002, large-scale tech skills training").
 *   4  Privacy and Accessibility name the program "National University Post Graduate Diploma" in all three remaining mentions.
 *   5  Owner date rule: Accessibility's own "Last updated" moves to 2026-11-01 (Privacy already reads it); other changed pages state no date of their own, so their JSON-LD dateModified is the build date.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|txt|xml|json|md|csv)$/.test(name)) out.push(p);
  }
  return out;
}

const OUR_MODEL = 'our-model/index.html';
const GOVERNANCE = 'about/governance/index.html';
const TALENTLEAP = 'our-model/talentleap/index.html';
const DEV = 'partner-with-us/development-partners/index.html';
const FOUNDATIONS = 'partner-with-us/foundations/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const INVESTORS = 'partner-with-us/investors/index.html';
const LOCAL = 'partner-with-us/local-partners/index.html';
const UNIVERSITIES = 'partner-with-us/universities/index.html';
const CAMPUS = 'programs/jobready-campus/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const SHAFQAT = 'about/team/shafqat-ullah/index.html';
const PRIVACY = 'privacy-policy/index.html';
const ACCESSIBILITY = 'accessibility/index.html';

const LONG = 'facilitators trained by CodersTrust (Training of Trainers)';
const SHORT = 'CodersTrust-trained facilitators';

test.describe('1 The long facilitator form sits in the sentence where the page explains who delivers the training', () => {
  test('Our Model: the Foundation Tracks card says "facilitator support" (PD-17’s meaning), with no "trained by CodersTrust" in it', () => {
    const text = main(OUR_MODEL);
    const S = 'Foundation Tracks Learners with limited computer or English skills get extra foundation hours with facilitator support, scoped in co-design. Their outcomes are reported by track.';
    expect(text).toContain(S);
    expect(text).not.toContain(`extra foundation hours and ${LONG}`);
    expect(text.search(/facilitator/i)).toBe(text.indexOf('facilitator support'));
  });

  test('Our Model: the "Local Labs, Coordinated Delivery" card is the delivery sentence and carries the long form, once', () => {
    const text = main(OUR_MODEL);
    const S = `Local Labs, Coordinated Delivery After about five months of delivery, programs are designed to run up to 10 certification cohorts in parallel, using existing labs and ${LONG}.`;
    expect(text).toContain(S);
    expect(count(text, LONG)).toBe(1);
    expect(count(text, SHORT)).toBe(0);
  });

  test('every page that explains the facilitator model has the long form once, inside its delivery sentence', () => {
    const LONG_A = `Where included, what the program builds stays in place: ${LONG} and localized curricula.`;
    const DELIVERY: [string, string][] = [
      [OUR_MODEL, `programs are designed to run up to 10 certification cohorts in parallel, using existing labs and ${LONG}.`],
      // WP152 (Opus XHigh run 6): Governments’ delivery sentence is the "Government Digital Labs" card (How We Reach Them); its "Capacity Designed to Stay in Your System" card says "CodersTrust-trained facilitators".
      [GOVERNMENTS, `Blended learning in government labs you already run, led by ${LONG}; lab access and seats are confirmed per program.`],
      // WP152: Development Partners’ delivery sentence is the "Existing Labs and Colleges" card; its funding-ends answer says "CodersTrust-trained facilitators".
      [DEV, `then blended delivery in existing labs and colleges by ${LONG}.`],
      [INVESTORS, `larger programs are designed to run up to 10 cohorts in parallel through ${LONG} in existing labs and colleges.`],
      [LOCAL, `Larger programs are designed to run through ${LONG} in existing labs and colleges, coordinated centrally.`],
      [UNIVERSITIES, `On-campus labs become blended-learning centers with ${LONG}; faculty members act as coordinators.`],
      // WP151 (Opus XHigh run 5): JobReady@Campus' delivery sentence is the How It Works "On-Campus Labs" card (it was the "Capacity Designed to Stay on Campus" card in the "Illustrative" band, which now says "CodersTrust-trained facilitators").
      [CAMPUS, `Labs serve as blended-learning centers, with ${LONG} and faculty members as coordinators.`],
      [YOUTHWIDE, `Blended training in existing labs and colleges, with ${LONG}; a central team coordinating local labs for larger programs.`],
      // Pages whose only facilitator mention is the "What Happens When Funding Ends?" answer: that answer is their delivery sentence.
      [GOVERNANCE, LONG_A],
      [TALENTLEAP, LONG_A],
      [FOUNDATIONS, LONG_A],
    ];
    for (const [p, sentence] of DELIVERY) {
      const text = main(p);
      expect(text, p).toContain(sentence);
      expect(count(text, LONG), p).toBe(1);
      // The long form is never later than a bare "CodersTrust-trained facilitators" on the page. WP151: except JobReady@Campus, whose "Illustrative" band (a success picture, before How It Works) uses the short form.
      const short = text.indexOf(SHORT);
      if (short >= 0 && p !== CAMPUS) expect(short, `${p}: "${SHORT}" comes before the delivery sentence`).toBeGreaterThan(text.indexOf(LONG));
    }
  });

  // WP151 (Opus XHigh run 5, Minor): a program or route page that specifies delivery does it in its How It Works / delivery CARD (title and body), and that card names the facilitators in the long form.
  // JobReady@Work, SuperKids and the NU Post Graduate Diploma describe no facilitator model (their delivery is a custom employer program, a school program and a college course), so they have no such card.
  test('each program or route page’s How It Works delivery card names the facilitators trained by CodersTrust', () => {
    const CARDS: [string, string][] = [
      [CAMPUS, `Where On-Campus Labs Labs serve as blended-learning centers, with ${LONG} and faculty members as coordinators.`],
      [UNIVERSITIES, `Set Up Campus Labs as Learning Centers On-campus labs become blended-learning centers with ${LONG}; faculty members act as coordinators.`],
      [YOUTHWIDE, `Delivery Blended training in existing labs and colleges, with ${LONG};`],
      [GOVERNMENTS, `How We Reach Them Government Digital Labs Blended learning in government labs you already run, led by ${LONG};`], // WP152: it was the "Capacity Designed to Stay in Your System" card
      [DEV, `How We Reach Them Existing Labs and Colleges Outreach and selection with local partners, then blended delivery in existing labs and colleges by ${LONG}.`], // WP152
      [OUR_MODEL, `Local Labs, Coordinated Delivery After about five months of delivery, programs are designed to run up to 10 certification cohorts in parallel, using existing labs and ${LONG}.`],
    ];
    for (const [p, card] of CARDS) {
      expect(main(p), p).toContain(card);
      expect(count(main(p), LONG), p).toBe(1);
    }
  });

  test('JobReady@Campus: the "Illustrative" band’s Capacity card uses the short form; the long form is in How It Works only', () => {
    const text = main(CAMPUS);
    expect(text).toContain('Capacity Designed to Stay on Campus Campus labs keep working as blended-learning centers, with CodersTrust-trained facilitators.');
    expect(count(text, SHORT)).toBe(1);
    expect(count(text, LONG)).toBe(1);
    expect(text.indexOf('Illustrative:')).toBeLessThan(text.indexOf(SHORT));
    expect(text.indexOf(SHORT)).toBeLessThan(text.indexOf(LONG));
  });

  test('Governments: an earlier, generic mention says "trained facilitators" (not the long form); the long form is in the "Government Digital Labs" card and the "Capacity Designed to Stay in Your System" card says "CodersTrust-trained facilitators" (WP152)', () => {
    const text = main(GOVERNMENTS);
    expect(text).toContain('National delivery needs trained facilitators and localized curricula.');
    expect(text.indexOf('National delivery needs trained facilitators')).toBeLessThan(text.indexOf(LONG));
    expect(text).toContain(`Capacity Designed to Stay in Your System Where included: curriculum and manuals; ${SHORT};`);
    expect(text.indexOf('Government Digital Labs')).toBeLessThan(text.indexOf('Capacity Designed to Stay in Your System')); // the delivery card comes first
  });

  test('no page puts the long form in a card about learners (Foundation Tracks) and none says "certified" or "local" facilitators', () => {
    const hits = walk(DIST_DIR)
      .filter((f) => {
        const raw = readFileSync(f, 'utf8');
        const text = f.endsWith('.html') ? visible(raw) : raw;
        return /Foundation Tracks .{0,200}trained by CodersTrust/i.test(text) || /\bcertified[ -]+(?:local )?facilitators?\b|\blocal[ ,-]+(?:\w+ )?facilitators?\b/i.test(raw);
      })
      .map((f) => f.slice(DIST_DIR.length));
    expect(hits).toEqual([]);
  });
});

test.describe('2 Development Partners: the reports and the tracking read as two plain clauses', () => {
  test('"Our Approach" says monthly reports arrive, and outcomes are tracked after each course', () => {
    const S = 'We combine training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports, and outcomes are tracked after each course.';
    expect(main(DEV)).toContain(S);
    expect(main(DEV)).not.toContain('monthly reports and outcome tracking after each course');
  });

  test('no built page keeps "receive monthly reports and outcome tracking"', () => {
    const hits = walk(DIST_DIR)
      .filter((f) => /receive monthly reports and outcome tracking/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(DIST_DIR.length));
    expect(hits).toEqual([]);
  });
});

test.describe('3 Shafqat Ullah’s bio: the expertise sentence is a semicolon list', () => {
  test('"AI and cloud-native architecture; SaaS and mobile app design; and, since 2002, large-scale tech skills training."', () => {
    const text = main(SHAFQAT);
    expect(text).toContain('His expertise spans AI and cloud-native architecture; SaaS and mobile app design; and, since 2002, large-scale tech skills training.');
    expect(text).not.toContain('cloud-native SaaS and mobile app design and architecture');
  });
});

test.describe('4 Privacy and Accessibility name the "National University Post Graduate Diploma"', () => {
  test('Privacy: the Google Forms row and the Email Inquiries help line', () => {
    const text = main(PRIVACY);
    expect(text).toContain('Only if you open the National University Post Graduate Diploma application form');
    expect(text).toContain('Help requests from the National University Post Graduate Diploma page go to');
    expect(text).not.toMatch(/National University diploma/);
  });

  test('Accessibility: the Known Limitations line', () => {
    const text = main(ACCESSIBILITY);
    expect(text).toContain('the National University Post Graduate Diploma application form is run by Google Forms.');
    expect(text).not.toMatch(/National University diploma/);
  });

  test('no built file names the program "National University diploma"', () => {
    const hits = walk(DIST_DIR)
      .filter((f) => /National University diploma/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(DIST_DIR.length));
    expect(hits).toEqual([]);
  });
});

test('5 owner date rule: Accessibility and Privacy read 2026-11-01 or later (own "Last updated"); changed pages without one carry a build-date dateModified', () => {
  for (const p of [ACCESSIBILITY, PRIVACY]) {
    const raw = html(p);
    const stamp = /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(raw)?.[1];
    expect(stamp, `${p} Last updated`).toBeTruthy();
    expect((stamp ?? '') >= '2026-11-01', `${p} Last updated ${stamp}`).toBe(true);
    for (const m of raw.matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)) expect(m[1] >= '2026-11-01', `${p} dateModified ${m[1]}`).toBe(true);
  }
  for (const p of [OUR_MODEL, DEV, SHAFQAT]) {
    for (const m of html(p).matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)) expect(m[1] >= '2026-11-01', `${p} dateModified ${m[1]}`).toBe(true);
  }
});
