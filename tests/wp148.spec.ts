import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP148 (Opus XHigh run 2, kit 115: 1 Minor, 7 Polish, and the facilitator principle challenge, accepted as the owner's literal words, "Trained by CodersTrust").
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp148.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Facilitators: "certified" no longer describes facilitators anywhere (the long form is "facilitators trained by CodersTrust (Training of Trainers)", later "CodersTrust-trained facilitators"; tests/wp147.spec.ts holds the
 *      per-page forms). Our Model's long form is in its delivery card (WP149: it was the Foundation Tracks card, the first mention); the Local Partners cards no longer ask a partner to "supply certified facilitators".
 *   2  The NYNJMSDC post body says UTC Associates, led by Aziz Ahmad, received the Partnership Award (first, second and last paragraphs); "remarked Clark"; one spelling of the Council's name.
 *   3  "Post Graduate Diploma" is capitalised wherever it names the NU program (NU overview, four course pages, Privacy Policy, the social-preview card).
 *   4  YouthWIDE says "we have not yet delivered a 100,000+ program" once in its own words (the Option 3 card is the shared PROGRAM_OPTIONS note, unchanged).
 *   5  Recognition: "Where CodersTrust Has Taken Part" runs newest first.
 *   6  Owner date rule: changed pages that carry their own date read 2026-11-01 or later.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const count = (text: string, needle: string | RegExp) => (typeof needle === 'string' ? text.split(needle).length - 1 : (text.match(needle) ?? []).length);
const ldText = (rel: string) => decode([...html(rel).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n'));
const metaDescription = (rel: string) => decode(/<meta name="description" content="([^"]*)"/.exec(html(rel))?.[1] ?? '');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|txt|xml|json|md|csv)$/.test(name)) out.push(p);
  }
  return out;
}

const OUR_MODEL = 'our-model/index.html';
const LOCAL = 'partner-with-us/local-partners/index.html';
const YOUTHWIDE = 'programs/youthwide/index.html';
const NU = 'programs/nu-postgraduate-diploma/index.html';
const NU_COURSES = ['digital-marketing', 'ict', 'cyber-security', 'data-analytics'].map((s) => `programs/nu-postgraduate-diploma/${s}/index.html`);
const PRIVACY = 'privacy-policy/index.html';
const RECOGNITION = 'about/recognition/index.html';
const PHOTOS = 'impact/in-the-field/news-photos/index.html';
const AZIZ = 'about/team/aziz-ahmad/index.html';
const POST_SLUG = 'aziz-ahmad-wins-the-nynjmsdc-partnership-award-in-the-united-states';
const POST = `news/${POST_SLUG}/index.html`;

const LONG = 'facilitators trained by CodersTrust (Training of Trainers)';
const SHORT = 'CodersTrust-trained facilitators';

test.describe('1 Facilitators are trained by CodersTrust, never "certified"', () => {
  test('no built file puts "certified" (or "certifies") beside "facilitator" (page text, meta, JSON-LD, llms.txt)', () => {
    const re = /\bcertif(?:ied|y|ies|ying)\b[^.<>]{0,30}\bfacilitator|\bfacilitators?\b[^.<>]{0,30}\bcertif(?:ied|y|ies|ying)\b|facilitator certification|certified-facilitator/i;
    const hits = walk(DIST_DIR)
      .filter((f) => re.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(DIST_DIR.length));
    expect(hits).toEqual([]);
  });

  // WP149 (Opus XHigh run 3, kit 116 principle challenge, accepted): the long form sits in the sentence where the page explains who delivers the training, not in the page's first mention. Our Model's Foundation Tracks card says
  // "facilitator support" again (PD-17's meaning) and the "Local Labs, Coordinated Delivery" card carries the long form (tests/wp149.spec.ts holds the rest of the rule).
  test('Our Model: the delivery sentence (the "Local Labs, Coordinated Delivery" card) is the long form; the Foundation Tracks card says "facilitator support"', () => {
    const text = main(OUR_MODEL);
    expect(text).toContain(
      'Foundation Tracks Learners with limited computer or English skills get extra foundation hours with facilitator support, scoped in co-design. Their outcomes are reported by track.',
    );
    expect(text).toContain(`using existing labs and ${LONG}.`);
    expect(text).not.toContain(`using existing labs and ${SHORT}.`);
    expect(count(text, LONG)).toBe(1);
    expect(text.indexOf('Local Labs, Coordinated Delivery')).toBeLessThan(text.indexOf(LONG));
  });

  test('Local Partners: the second "Three Ways to Partner with Us" card asks for trainers who join Training of Trainers, not for certified facilitators', () => {
    const text = main(LOCAL);
    expect(text).toContain(
      'Put Your Trainers Through Our Training Your trainers join CodersTrust’s Training of Trainers, so delivery capacity can stay in your community where the program includes it.',
    );
    expect(text).not.toContain('Supply Certified Facilitators');
    expect(text).not.toContain('certified facilitator training');
  });

  test('Local Partners: the support card is "Facilitator Training and a Local Curriculum" and the comparison tile says "CodersTrust-trained facilitators"', () => {
    const text = main(LOCAL);
    expect(text).toContain(
      'Facilitator Training and a Local Curriculum Training of Trainers, a localized curriculum and preparation for industry certification. You do not have to build the curriculum or certification route yourself.',
    );
    expect(text).toContain(`${SHORT}, a localized curriculum and preparation for industry certification, delivered in blended classes.`);
    expect(text).not.toContain('Certified Facilitators and a Local Curriculum');
  });

  test('the register: PD-06 says facilitators trained by CodersTrust (no "certified")', () => {
    const facts = readFileSync('src/data/facts.ts', 'utf8');
    expect(facts).toContain('hub-and-spoke delivery with facilitators trained by CodersTrust for larger programs');
    expect(facts).not.toMatch(/trained and certified by CodersTrust/);
  });
});

test.describe('2 The NYNJMSDC post says who received the award', () => {
  const text = () => main(POST);

  test('first paragraph: UTC Associates, led by Aziz Ahmad, was honored with the Partnership Award', () => {
    expect(text()).toContain(
      'UTC Associates, the technology consulting company led by Aziz Ahmad, Chairman of CodersTrust, has been honored with the Partnership Award presented by the New York & New Jersey Minority Supplier Development Council (NYNJMSDC/the Council).',
    );
    expect(text()).not.toContain('Aziz Ahmad, a renowned entrepreneur');
    expect(text()).not.toContain('esteemed Partnership Award');
  });

  test('second paragraph: UTC Associates, not Ahmad, was recognized and emerged as top supplier', () => {
    expect(text()).toContain(
      'On Thursday, October 20, UTC Associates, led by Aziz Ahmad, was recognized for its outstanding achievements and contributions in the technology consulting field at an extravagant reception held in New York City. The company emerged as the top supplier in category two, surpassing 30 other nominees to secure the accolade.',
    );
    expect(text()).not.toContain('Ahmad was recognized for his outstanding achievements');
    expect(text()).not.toContain('presenting him with the prestigious award');
  });

  test('last paragraph: the award recognizes UTC Associates, under Aziz Ahmad’s leadership', () => {
    expect(text()).toContain('The NYNJMSDC Partnership Award recognizes UTC Associates’ contributions to the IT industry under Aziz Ahmad’s leadership.');
    expect(text()).not.toContain('recognizes Aziz Ahmad’s exceptional contributions');
  });

  test('the second reference to the Council’s president is the surname: "remarked Clark"', () => {
    expect(text()).toContain('remarked Clark.');
    expect(text()).not.toContain('remarked Terrence');
  });

  test('one spelling of the Council’s name everywhere it is written out: "New York & New Jersey Minority Supplier Development Council" (post, meta, alt text, bio)', () => {
    let seen = 0;
    const bad: string[] = [];
    for (const f of walk(DIST_DIR).filter((p) => p.endsWith('.html'))) {
      const t = decode(readFileSync(f, 'utf8'));
      for (const m of t.matchAll(/(.{0,28})Minority Supplier Development Council/g)) {
        seen++;
        if (!m[1].endsWith('New York & New Jersey ')) bad.push(`${f.slice(DIST_DIR.length)}: …${m[1]}Minority Supplier Development Council`);
      }
    }
    expect(seen).toBeGreaterThan(6);
    expect(bad).toEqual([]);
    expect(metaDescription(POST)).toBe('UTC Associates, led by Aziz Ahmad, received the Partnership Award from the New York & New Jersey Minority Supplier Development Council.');
    expect(html(PHOTOS)).toContain('in front of a New York &amp; New Jersey Minority Supplier Development Council backdrop');
    expect(main(AZIZ)).toContain('from the New York & New Jersey Minority Supplier Development Council on October 20, 2022');
  });
});

test.describe('3 "Post Graduate Diploma" is capitalised where it names the NU program', () => {
  test('no built file spells it "post graduate diploma" (page text, meta, alt text, JSON-LD, llms.txt)', () => {
    const bad: string[] = [];
    for (const f of walk(DIST_DIR)) {
      for (const m of readFileSync(f, 'utf8').matchAll(/post graduate diploma/gi)) {
        if (m[0] !== 'Post Graduate Diploma') bad.push(`${f.slice(DIST_DIR.length)}: ${m[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('the sources of the social-preview card carry the capitalised name too', () => {
    expect(readFileSync('scripts/build-og.mjs', 'utf8')).toContain('through the National University Post Graduate Diploma.');
    expect(readFileSync('src/lib/og.ts', 'utf8')).toContain('through the National University Post Graduate Diploma.');
    expect(readFileSync('src/lib/og.ts', 'utf8')).not.toContain('post graduate diploma');
  });

  test('NU overview: lead and meta name the Post Graduate Diploma; the meta stays within 155 characters', () => {
    expect(main(NU)).toContain('We help learners prepare for digital work through the National University Post Graduate Diploma.');
    const d = metaDescription(NU);
    expect(d).toBe('Build practical digital skills after your degree with the National University Post Graduate Diploma, delivered by CodersTrust.');
    expect(d.length).toBeLessThanOrEqual(155);
  });

  test('the four NU course pages: lead and meta say "Post Graduate Diploma" (meta at most 155 characters)', () => {
    const SUBJECTS = ['digital marketing', 'information and communication technology (ICT)', 'cyber security', 'data analytics'];
    NU_COURSES.forEach((p, i) => {
      expect(main(p), p).toContain('in a National University Post Graduate Diploma delivered by CodersTrust.');
      const d = metaDescription(p);
      expect(d, p).toMatch(/National University Post Graduate Diploma in /);
      expect(d.toLowerCase(), p).toContain(SUBJECTS[i].toLowerCase());
      expect(d.length, p).toBeLessThanOrEqual(155);
    });
  });

  test('Privacy Policy: "Applications for the National University Post Graduate Diploma use an existing Google Form."', () => {
    expect(main(PRIVACY)).toContain('Applications for the National University Post Graduate Diploma use an existing Google Form.');
  });
});

test.describe('4 YouthWIDE says "not yet delivered at 100,000+" once in the page’s own words', () => {
  const S = 'Larger programs are designed to run in phases, up to 10 cohorts in parallel, with CodersTrust-trained facilitators; we have not yet delivered a 100,000+ program.';

  test('"Can You Deliver at National Scale?" holds the caveat (page and FAQ JSON-LD), as one sentence', () => {
    expect(main(YOUTHWIDE)).toContain(S);
    expect(ldText(YOUTHWIDE)).toContain(S);
    expect(count(main(YOUTHWIDE), 'have not yet delivered')).toBe(1);
    expect(main(YOUTHWIDE)).not.toContain('is a design option we plan phase by phase');
  });

  test('"Is YouthWIDE Right for Our Organization?" gives plain phase-by-phase design wording, without the caveat (page and JSON-LD)', () => {
    const S2 = 'YouthWIDE is not the right fit if you need a 100,000+ rollout delivered by one provider in a single phase; national delivery is designed in phases.';
    expect(main(YOUTHWIDE)).toContain(S2);
    expect(ldText(YOUTHWIDE)).toContain(S2);
    expect(main(YOUTHWIDE)).not.toContain('we plan national delivery phase by phase');
  });

  test('the Option 3 card is the shared PROGRAM_OPTIONS note and still carries its own qualifier', () => {
    expect(main(YOUTHWIDE)).toContain('A design option we plan phase by phase; not yet delivered at this size.');
    expect(count(main(YOUTHWIDE), 'phase by phase')).toBe(1);
  });
});

test.describe('5 Recognition: "Where CodersTrust Has Taken Part" runs newest first', () => {
  test('the dates fall, newest first', () => {
    const section = /id="forums"[\s\S]*?<\/section>/.exec(html(RECOGNITION))?.[0] ?? '';
    const dates = [...section.matchAll(/rec-forum__date"[^>]*><time datetime="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);
    expect(dates.length).toBeGreaterThanOrEqual(4);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(dates[0]).toBe('2025-10-14');
    expect(dates[dates.length - 1]).toBe('2023-05-04');
  });
});

test('6 owner date rule: changed pages that carry their own date read 2026-11-01 or later', () => {
  const pages = [NU, ...NU_COURSES, PRIVACY, RECOGNITION, POST, OUR_MODEL, LOCAL, YOUTHWIDE, PHOTOS, AZIZ];
  for (const p of pages) {
    const raw = html(p);
    for (const m of raw.matchAll(/"dateModified":"(\d{4}-\d{2}-\d{2})"/g)) expect(m[1] >= '2026-11-01', `${p} dateModified ${m[1]}`).toBe(true);
    const stamp = /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(raw)?.[1];
    if (stamp) expect(stamp >= '2026-11-01', `${p} Last updated ${stamp}`).toBe(true);
  }
});
