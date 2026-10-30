import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP123 (Opus Medium run 5, kit 90; 2026-10-29): News archive consistency sweep with site-wide tests, and the closing-prompt wording. Run `npm run build` first.
 * Each sweep reads every built page (visible text, alt, meta and other attribute text, JSON-LD) so one-at-a-time nits cannot recur:
 *   - Minor: "Md" is always "Md." before a name; "Grameenphone" (never "GrameenPhone"); American quotation punctuation (commas and full stops inside closing double quotes);
 *     a full quotation in double (not single) quotation marks in the Recognition post.
 *   - Polish: JobReady@Campus, JobReady@Work and SuperKids end on "Your first step: a discovery session. ..."; "Danish Army captain"; "San José" in the UPEACE post;
 *     Build Peace post commas; the two Recognition captions for the UPEACE officials.
 * "Mr. Shamsul Haque" is the post's own courtesy-title wording and is deliberately not swept.
 */
const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&#8221;|&#x201D;/gi, '”')
    .replace(/&#8220;|&#x201C;/gi, '“')
    .replace(/&nbsp;/g, ' ');
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');

/** Visible text plus alt / meta / title / aria-label attribute values plus JSON-LD, with URLs removed (a URL is not copy). */
function searchable(raw: string): string {
  const attrs = [...raw.matchAll(/\b(?:alt|content|title|aria-label)="([^"]*)"/g)].map((m) => m[1]).join(' ¶ ');
  const ld = [...raw.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(' ¶ ');
  const body = raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  return decode(`${body} ¶ ${attrs} ¶ ${ld}`)
    .replace(/\\u201d/gi, '”')
    .replace(/https?:\/\/[^\s"'<>)]+/g, ' ')
    .replace(/\s+/g, ' ');
}
const text = (rel: string) => searchable(html(rel));
const pagesMatching = (re: RegExp): string[] => listPages().filter((p) => re.test(searchable(readFileSync(p.file, 'utf8')))).map((p) => p.route);
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

const MOU_BASE = 'news/coderstrust-bangladesh-signs-strategic-mou-with-base-study-concern-to-enhance-global-education-opportunities/index.html';
const LEEDO = 'news/coderstrust-leedo-join-to-expands-ict-education-to-street-children/index.html';
const DISCOVERY = 'news/coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners/index.html';
const BUILD_PEACE = 'news/harnessing-socio-technology-for-positive-impact-and-unity-globally/index.html';
const RECOGNITION_POST = 'news/coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia/index.html';
const FREELANCING = 'news/coderstrust-teaching-you-freelancing-the-right-way/index.html';
const UPEACE = 'news/coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration/index.html';
const RECOGNITION_PAGE = 'about/recognition/index.html';

test.describe('WP123, site-wide sweeps over the built pages', () => {
  test('"Md" before a name always carries its period: no built page matches /\\bMd (?=[A-Z])/', () => {
    expect(pagesMatching(/\bMd (?=[A-Z])/)).toEqual([]);
  });
  test('"Grameenphone", never "GrameenPhone", in visible text, alt, meta and JSON-LD', () => {
    expect(pagesMatching(/GrameenPhone/)).toEqual([]);
    expect(count(text(RECOGNITION_POST), 'PKSF, iDE, CARE and Grameenphone trust CodersTrust')).toBe(1);
  });
  test('American quotation punctuation: no built page has a closing double quote followed by a comma or full stop', () => {
    expect(pagesMatching(/”[,.]/)).toEqual([]);
  });
  test('a quotation that the attribution continues ends in a comma, not a full stop: no built page matches /\\.” [a-z]/', () => {
    expect(pagesMatching(/\.” [a-z]/)).toEqual([]);
  });
  test('a full quotation is introduced in double quotation marks, not single: no built page matches /[,:] ‘[A-Z]/', () => {
    expect(pagesMatching(/[,:] ‘[A-Z]/)).toEqual([]);
  });
  test('the three named posts carry the American forms', () => {
    const d = text(DISCOVERY);
    expect(d).toContain('“Looking forward to working closely together and making this collaboration a great success,” he said.');
    expect(d).toContain('And we are so excited about it.”');
    expect(text(BUILD_PEACE)).toContain('for a better future together,” he says.');
    const r = text(RECOGNITION_POST);
    expect(r).toContain('stating, “This acknowledgment coincides with');
    expect(r).toContain('market-based business model.”');
    expect(r).not.toContain('stating, ‘This acknowledgment');
  });
  test('the journal citation puts its comma inside the closing quotation mark (Independent Evaluation and TalentLEAP)', () => {
    for (const rel of ['impact/independent-evaluation/index.html', 'our-model/talentleap/index.html']) {
      const t = text(rel);
      expect(t, rel).toContain('Online Jobs Experiment in Bangladesh,” Economic Development and Cultural Change');
    }
  });
  test('the Recognition page logo guidance puts no full stop outside a closing quotation mark', () => {
    const t = text(RECOGNITION_PAGE);
    expect(t).not.toMatch(/letter “C”\./);
    expect(t).toContain('at least as tall as the letter C.');
  });
});

test.describe('WP123, names in the News archive', () => {
  test('the Base Study Concern post: "Md. Shamsul Haque", "Md. Monayem Siddique", "Md. Aminul Islam", "Md. Rakib Ahmed"', () => {
    const t = text(MOU_BASE);
    expect(t).toContain('Md. Shamsul Haque, CEO of CodersTrust Bangladesh, and Md. Monayem Siddique');
    expect(t).toContain('Md. Aminul Islam, Country Manager of CodersTrust Bangladesh; Md. Rakib Ahmed from Base Study Con');
  });
  test('the Leedo post: "Md. Abdul Halim, retired Brigadier General"', () => {
    expect(text(LEEDO)).toContain('Md. Abdul Halim, retired Brigadier General');
  });
});

test.describe('WP123, programs: the closing line reads the same as on the other route pages', () => {
  const LINE = 'Your first step: a discovery session. In your inquiry, include two suitable times.'; // WP126: the programs’ closing line no longer names the discovery conversation twice
  for (const route of ['programs/jobready-campus/', 'programs/jobready-work/', 'programs/superkids/']) {
    test(`${route} ends What Happens Next on the shared "Your first step" line and no "First action." label remains`, () => {
      const t = text(`${route}index.html`);
      expect(count(t, LINE)).toBe(1);
      expect(t).not.toContain('First action.');
      expect(html(`${route}index.html`)).toMatch(/<p class="next__first"[^>]*>(?:<strong[^>]*>)?Your first step: a discovery session\./);
    });
  }
  test('YouthWIDE keeps its role-labelled "Funders." line (not in this package)', () => {
    expect(text('programs/youthwide/index.html')).toContain('Funders. In your inquiry, include two suitable times for a discovery session.');
  });
});

test.describe('WP123, polish', () => {
  test('"a former Danish Army captain" in the freelancing post; "Danish army" is on no page', () => {
    expect(text(FREELANCING)).toContain('Ferdinand Kjærulff, a former Danish Army captain'); // WP125: "former", as the bios and the SDG post say
    expect(pagesMatching(/Danish army/)).toEqual([]);
  });
  test('the UPEACE post writes "San José" and "the UPEACE campus"; "San Jose" is on no page', () => {
    expect(text(UPEACE)).toContain('a signing ceremony held at the UPEACE campus in San José, Costa Rica');
    expect(pagesMatching(/San Jose/)).toEqual([]);
  });
  test('the Build Peace post has no stray commas', () => {
    const t = text(BUILD_PEACE);
    expect(t).toContain('CodersTrust, a global EdTech company working on technology-driven social impact, was honored');
    expect(t).toContain('Team CodersTrust actively contributed to workshops');
    expect(t).not.toContain('EdTech company, in technology-driven social impact');
    expect(t).not.toContain('Team CodersTrust, actively');
  });
  test('Recognition captions for the UPEACE officials carry the comma between title and institution', () => {
    const t = text(RECOGNITION_PAGE);
    expect(t).toContain('Vice Rector, University for Peace, Costa Rica');
    expect(t).toContain('Special Advisor, University for Peace');
    expect(t).not.toContain('Vice Rector University for Peace');
    expect(t).not.toContain('Special Advisor University for Peace');
  });
  test('changed News posts are dated 2026-10-29 (dateModified)', () => {
    for (const rel of [MOU_BASE, LEEDO, DISCOVERY, BUILD_PEACE, RECOGNITION_POST, FREELANCING, UPEACE]) {
      // WP126 re-dated the Discovery Education and HolonIQ 2023 posts (countToday note) to 2026-10-30
      expect(html(rel), rel).toMatch(rel === DISCOVERY || rel === RECOGNITION_POST ? /"dateModified":"2026-10-30"/ : /"dateModified":"2026-10-(29|30)"/); // WP127 re-dated more of these (serial-comma sweep)
    }
  });
});
