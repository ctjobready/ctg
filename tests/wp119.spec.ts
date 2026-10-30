import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP119 (Opus Medium run 1, kit 86; 2026-10-29). Run `npm run build` first. News archive Minors and Polish:
 *   - the 2026 National University onboarding clause is gone from three 2023-2024 posts' boilerplate (no news post sets "1.5M+" in a sentence with "trained");
 *   - the Jahangirnagar MOU post names DoICT as a department under the ICT Division;
 *   - the five posts written in October 2026 from dated sources carry their own note ("Written in October 2026 ... Event date: ..."), not "Archived post ... Published <old date>";
 *   - Polish: Governments contract row, Aziz Ahmad bio and alt text, Shamsul Haque bio, two News Photographs captions, one missing colon, one doubled TalentLEAP qualifier.
 */
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const html = (rel: string) => decode(readFileSync(join(DIST_DIR, rel), 'utf8'));
const text = (rel: string) => html(rel).replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(dir)) { const f = join(dir, n); if (statSync(f).isDirectory()) walk(f, out); else if (n.endsWith('.html')) out.push(f); }
  return out;
};
const banner = (slug: string) => {
  const m = /<p class="archive-banner"[^>]*>([\s\S]*?)<\/p>/.exec(html(`news/${slug}/index.html`));
  return m ? m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
};
const source = (slug: string) => readFileSync(join('src/content/news', `${slug}.md`), 'utf8');

const DISCOVERY = 'coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners';
const JOYEETA = 'empowering-women-in-digital-economy-certificate-giving-ceremony-by-coderstrust-with-joyeeta-foundation';
const CARNIVAL = 'coderstrust-organizes-career-carnival-for-students-and-affiliates';
const JU = 'coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad';
const MILESTONE = 'a-proud-milestone-for-coderstrust';
const ADDED = [
  { slug: 'coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner', date: 'April 8, 2014' },
  { slug: 'coderstrust-presents-at-in5-in-dubai', date: 'April 29, 2014' },
  { slug: 'hour-of-code-in-somaliland', date: 'December 21, 2015' },
  { slug: 'coderstrust-sets-up-in-india', date: 'August 7, 2016' },
  { slug: 'coderstrust-announces-learning-partnerships-in-uganda', date: 'September 10, 2020' },
];

test.describe('WP119 Minor 1: no news post attaches the National University onboarding figure to "trained"', () => {
  test('no news post sets "1.5M+" in the same sentence as "trained"', () => {
    const offenders: string[] = [];
    for (const f of walk(join(DIST_DIR, 'news'))) {
      const rel = relative(DIST_DIR, f);
      const t = decode(readFileSync(f, 'utf8')).replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      for (const s of t.split(/(?<=[.!?])\s+/)) if (/1\.5M\+/.test(s) && /trained/i.test(s)) offenders.push(`${rel}: ${s.slice(0, 160)}`);
    }
    expect(offenders).toEqual([]);
  });

  test('Discovery Education and Joyeeta: "…has trained learners since 2014 and has worked in 16 countries and territories."', () => {
    expect(text(`news/${DISCOVERY}/index.html`)).toContain('provider that has trained learners since 2014 and has worked in 16 countries and territories. Through this collaboration');
    expect(text(`news/${JOYEETA}/index.html`)).toContain('provider that has trained learners since 2014 and has worked in 16 countries and territories. Its programs range');
  });

  test('Career Carnival: "It has trained learners since 2014 and worked in 16 countries and territories."', () => {
    expect(text(`news/${CARNIVAL}/index.html`)).toContain('It has trained learners since 2014 and worked in 16 countries and territories. Its programs range');
  });

  test('none of the three still names National University in its closing paragraph', () => {
    for (const slug of [DISCOVERY, JOYEETA, CARNIVAL]) expect(source(slug), slug).not.toMatch(/National University learners/);
  });
});

test.describe('WP119 Minor 2: the Jahangirnagar MOU post puts DoICT under the ICT Division', () => {
  test('the first paragraph and the quoted remark say "the Department of ICT (DoICT)", never "ICT Division of DoICT" or "ICT Division, DoICT"', () => {
    const t = text(`news/${JU}/index.html`);
    expect(t).toContain('between Jahangirnagar University Institute of IT and the Department of ICT (DoICT), under the ICT Division, Ministry of ICT.');
    expect(t).toContain('“thrilled about this mutually beneficial collaboration” between Jahangirnagar University and the Department of ICT (DoICT)');
    expect(t).not.toMatch(/ICT Division of DoICT|ICT Division, DoICT/);
  });
});

test.describe('WP119 Minor 3: the five posts written in October 2026 carry their own note', () => {
  for (const a of ADDED) {
    test(`${a.slug}: "Written in October 2026 from the dated sources linked in the text. Event date: ${a.date}."`, () => {
      const b = banner(a.slug);
      expect(b).toBe(`Written in October 2026 from the dated sources linked in the text. Event date: ${a.date}.`);
      expect(b).not.toMatch(/Archived post|Published|lightly edited|Added in October 2026/);
      expect(source(a.slug)).toMatch(/^updated: 2026-10-(29|30)$/m); // WP127 re-dated two of the five (serial-comma sweep)
    });

    test(`${a.slug}: the news index card keeps the event date`, () => {
      expect(html('news/index.html')).toContain(`>${a.date}<`);
    });
  }

  test('an ordinary archived post keeps the standard banner, and the changed ones show updated October 30, 2026', () => {
    for (const slug of [DISCOVERY, JOYEETA, CARNIVAL, JU, MILESTONE]) {
      const b = banner(slug);
      expect(b, slug).toContain('Archived post, lightly edited.');
      // WP126: the posts that now say "The country count is today’s." were re-dated to October 30
      expect(b, slug).toContain('updated October 30, 2026'); // WP127 re-dated the 2041 post (JU) too
    }
  });
});

test.describe('WP119 Polish', () => {
  test('4. Governments contract table: first row "Her Power: Department of ICT (DoICT), under the ICT Division"', () => {
    const t = text('partner-with-us/governments/index.html');
    expect(t).toContain('Her Power: Department of ICT (DoICT), under the ICT Division');
    expect(t).not.toContain('Her Power: Department of ICT (DoICT), ICT Division');
  });

  test('5. Aziz Ahmad bio: "which he co-founded in 2014" (page and meta description)', () => {
    const h = html('about/team/aziz-ahmad/index.html');
    expect(text('about/team/aziz-ahmad/index.html')).toContain('Aziz Ahmad is the Co-Founder and Chairman of CodersTrust, which he co-founded in 2014.');
    expect(h).toContain('is the Co-Founder and Chairman of CodersTrust, which he co-founded in 2014 with Ferdinand Kjærulff.');
    expect(h).not.toContain('which he founded in 2014');
  });

  test('6. the Aziz Ahmad stage photograph alt text says "Co-Founder and Chairman", wherever it is used', () => {
    const OLD = 'Chairman and Co-Founder of CodersTrust, addressing a large audience from a stage';
    const NEW = 'Aziz Ahmad, Co-Founder and Chairman of CodersTrust, addressing a large audience from a stage';
    const offenders = walk(DIST_DIR).filter((f) => html(relative(DIST_DIR, f)).includes(OLD)).map((f) => relative(DIST_DIR, f));
    expect(offenders).toEqual([]);
    expect(html('about/team/aziz-ahmad/index.html')).toContain(NEW);
  });

  test('7. Shamsul Haque bio: "He brings 38 years of experience, including in banking and advertising."', () => {
    const t = text('about/team/shamsul-haque/index.html');
    expect(t).toContain('a former Additional Foreign Secretary of Bangladesh. He brings 38 years of experience, including in banking and advertising.');
    expect(t).not.toContain('diverse experience as a banker');
  });

  test('8. and 9. News Photographs captions: "SKIT Incubator training agreement, Barishal, January 2023" and "BCIU roundtable, Washington, D.C., October 2025"', () => {
    const t = text('impact/in-the-field/news-photos/index.html');
    expect(t).toContain('SKIT Incubator training agreement, Barishal, January 2023');
    expect(t).toContain('BCIU roundtable, Washington, D.C., October 2025');
    expect(t).not.toMatch(/Sheikh Kamal ICT Incubator training agreement|Washington, DC/);
    expect(source('1000-trainees-sheikh-kamal-ict-incubator-training')).toContain('Barishal');
  });

  test('10. "A Proud Milestone for CodersTrust": "This is what CodersTrust is all about: using digital skills…"', () => {
    const t = text(`news/${MILESTONE}/index.html`);
    expect(t).toContain('This is what CodersTrust is all about: using digital skills to build real, meaningful platforms.');
    expect(t).not.toContain('all about using digital skills');
  });

  test('11. TalentLEAP Q14 states "as agreed in the program scope" once: the comparison sentence no longer repeats it', () => {
    const FIRST = 'Compared with a self-paced course alone, supported CodersTrust cohorts add mentoring, certification exam preparation and placement support.';
    const SECOND = 'As agreed in the program scope, every supported TalentLEAP cohort pairs 100 training hours per certification';
    expect(text('our-model/talentleap/index.html')).toContain(`${FIRST} ${SECOND}`);
    const offenders = walk(DIST_DIR).filter((f) => /placement support, agreed in each program’s scope/.test(html(relative(DIST_DIR, f)))).map((f) => relative(DIST_DIR, f));
    expect(offenders).toEqual([]);
    expect(existsSync(join(DIST_DIR, 'our-model/talentleap/index.html'))).toBe(true);
  });
});
