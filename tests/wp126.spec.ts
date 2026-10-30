import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP126 (owner answer 2026-10-29 on the archive country count; Opus Medium run 8, kit 93, Polish). Run `npm run build` first.
 *   1  Archive posts that say "16 countries and territories" keep the 16 (owner: "Keep 16; adjust note"); their archive note adds
 *      "The country count is today’s." (front matter `countToday: true`, set on exactly those posts); no other page carries it.
 *   2  No serial comma: SuperKids "Who It Is For", the Global Reach Bangladesh row, Fahim Sheikh's bio (body and meta description).
 *   3  Recognition: the stray "Co-Founder and Chairman." line under the honors heading is gone.
 *   4  "Why We Call It a Digital Factory": "exported labor", not "exported (unskilled) labor".
 *   5  JobReady@Campus, JobReady@Work and SuperKids close on "…include two suitable times." (YouthWIDE's "Funders." line is not changed).
 */
const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ');
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const strip = (raw: string) => decode(raw.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const text = (rel: string) => strip(html(rel));
const source = (slug: string) => readFileSync(join('src/content/news', `${slug}.md`), 'utf8');
const metaDescription = (raw: string) => decode(raw.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');

const NEWS_SLUGS = readdirSync(join(DIST_DIR, 'news'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join('src/content/news', `${d.name}.md`)))
  .map((d) => d.name);
const banner = (raw: string) => {
  const m = /<p class="archive-banner"[^>]*>([\s\S]*?)<\/p>/.exec(raw);
  return m ? strip(m[1]) : '';
};
const body = (raw: string) => {
  const m = /<div class="prose art__body"[^>]*>([\s\S]*?)<aside class="art__share"/.exec(raw);
  return m ? strip(m[1]) : '';
};

const COUNT_TODAY = [
  'a-proud-milestone-for-coderstrust',
  'coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners',
  'coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership',
  'coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c',
  'coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia',
  'coderstrust-organizes-career-carnival-for-students-and-affiliates',
  'empowering-women-in-digital-economy-certificate-giving-ceremony-by-coderstrust-with-joyeeta-foundation',
  'the-man-behind-coderstrust-who-never-forgot-his-roots',
];
const SENTENCE = 'The country count is today’s.';
const DIGITAL_FACTORY = 'why-we-call-it-a-digital-factory';

test.describe('WP126 item 1: archive posts that say "16 countries and territories" add "The country count is today’s." to their note', () => {
  test('every built News page whose body says "16 countries and territories" and carries the archive note also carries the sentence', () => {
    const withCount: string[] = [];
    const offenders: string[] = [];
    for (const slug of NEWS_SLUGS) {
      const raw = html(`news/${slug}/index.html`);
      const b = banner(raw);
      if (!/16 countries and territories/.test(body(raw)) || !b.startsWith('Archived post, lightly edited.')) continue;
      withCount.push(slug);
      if (!b.includes(SENTENCE)) offenders.push(slug);
    }
    expect(offenders).toEqual([]);
    expect(withCount.sort()).toEqual([...COUNT_TODAY].sort());
  });

  test('the sentence sits in the standard note, after the Impact-pages sentence and before "Published …"', () => {
    for (const slug of COUNT_TODAY) {
      const b = banner(html(`news/${slug}/index.html`));
      expect(b, slug).toMatch(/current figures are on the Impact pages ?\. The country count is today’s\. Published /);
      expect(b.split(SENTENCE).length - 1, slug).toBe(1);
    }
  });

  test('no other page carries the sentence', () => {
    const carriers = listPages().filter((p) => decode(readFileSync(p.file, 'utf8')).includes(SENTENCE)).map((p) => p.route.replace(/^\/+|\/+$/g, '').replace(/^ctg\//, '').replace(/^news\//, ''));
    expect(carriers.sort()).toEqual([...COUNT_TODAY].sort());
  });

  test('the 16 stays in every one of those posts (the count is not restored to the as-published figure)', () => {
    for (const slug of COUNT_TODAY) expect(body(html(`news/${slug}/index.html`)), slug).toContain('16 countries and territories');
  });

  test('the posts are flagged in front matter (countToday: true) and dated updated: 2026-10-30; no other post carries the flag', () => {
    const flagged = NEWS_SLUGS.filter((s) => /^countToday: true$/m.test(source(s)));
    expect(flagged.sort()).toEqual([...COUNT_TODAY].sort());
    for (const slug of COUNT_TODAY) expect(source(slug), slug).toMatch(/^updated: 2026-10-30$/m);
  });

  test('a written-from-sources post never carries the sentence (its banner has no archive sentences)', () => {
    for (const slug of NEWS_SLUGS) {
      if (!/^writtenFromSources: true$/m.test(source(slug))) continue;
      expect(banner(html(`news/${slug}/index.html`)), slug).not.toContain(SENTENCE);
    }
  });
});

test.describe('WP126 item 2: no serial comma in the three named lists', () => {
  test('SuperKids "Who It Is For" reads "block coding, robotics and graphic design for kids."', () => {
    const raw = html('programs/superkids/index.html');
    expect(strip(raw)).toContain('through block coding, robotics and graphic design for kids.');
    expect(strip(raw)).not.toContain('robotics, and graphic design');
  });

  test('Global Reach, Bangladesh: "Unemployed graduates, women and priority groups" in the table and the map card', () => {
    const raw = html('impact/global-reach/index.html');
    const t = strip(raw);
    expect(t).toContain('Unemployed graduates, women and priority groups');
    expect(t).not.toContain('women, and priority groups');
  });

  test('Fahim Sheikh: body and meta description say "marketing, project and training operations"', () => {
    const raw = html('about/team/fahim-sheikh/index.html');
    expect(strip(raw)).toContain('works in marketing, project and training operations at CodersTrust Bangladesh.');
    expect(metaDescription(raw)).toContain('marketing, project and training operations');
    expect(strip(raw)).not.toContain('project, and training operations');
    expect(metaDescription(raw)).not.toContain('project, and training operations');
  });

  test('the old serial-comma strings are on no built page', () => {
    const stale = listPages().filter((p) => /robotics, and graphic design|women, and priority groups|project, and training operations/.test(decode(readFileSync(p.file, 'utf8')))).map((p) => p.route);
    expect(stale).toEqual([]);
  });
});

test.describe('WP126 item 3: Recognition drops the stray line under the honors heading', () => {
  test('the honors header has its eyebrow and heading and no lead; the list follows', () => {
    const raw = html('about/recognition/index.html');
    const header = /<header class="sh[^"]*"[^>]*>(?:(?!<\/header>)[\s\S])*id="honors-h"[\s\S]*?<\/header>/.exec(raw)?.[0] ?? '';
    expect(header).not.toBe('');
    expect(strip(header)).toBe('Founder Honors Aziz Ahmad’s Appointments and Honors');
    expect(header).not.toContain('sh__lead');
    expect(raw).toMatch(/<\/header><ul class="rec-honors"/);
    expect(text('about/recognition/index.html')).not.toContain('Co-Founder and Chairman.');
  });
});

test.describe('WP126 item 4: the Digital Factory post says "exported labor"', () => {
  test('"For decades, developing countries exported labor." and no "(unskilled)" on the page', () => {
    const t = text(`news/${DIGITAL_FACTORY}/index.html`);
    expect(t).toContain('For decades, developing countries exported labor. We believe the future belongs to nations that export knowledge');
    expect(t).not.toContain('(unskilled)');
    expect(t).not.toContain('exported (unskilled)');
  });
  test('the post is dated updated: 2026-10-30', () => {
    expect(source(DIGITAL_FACTORY)).toMatch(/^updated: 2026-10-30$/m);
    expect(banner(html(`news/${DIGITAL_FACTORY}/index.html`))).toContain('updated October 30, 2026');
  });
});

test.describe('WP126 item 5: the programs’ closing line is "Your first step: a discovery session. In your inquiry, include two suitable times."', () => {
  const LINE = 'Your first step: a discovery session. In your inquiry, include two suitable times.';
  for (const route of ['programs/jobready-campus/', 'programs/jobready-work/', 'programs/superkids/']) {
    test(`${route} ends What Happens Next on the tighter line (once), and the old wording is gone`, () => {
      const t = text(`${route}index.html`);
      expect(t.split(LINE).length - 1).toBe(1);
      expect(t).not.toContain('include two suitable times for a discovery conversation');
      expect(html(`${route}index.html`)).toMatch(/<p class="next__first"[^>]*><strong[^>]*>Your first step: a discovery session\.<\/strong> In your inquiry, include two suitable times\.<\/p>/);
    });
  }
  test('YouthWIDE keeps its role-labelled "Funders." line, which names the discovery session once', () => {
    expect(text('programs/youthwide/index.html')).toContain('Funders. In your inquiry, include two suitable times for a discovery session.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Opus High run 1 (kit 93), added to WP126: A (route emails ask for two suitable times), B (platform-grant link), C (serial commas in six team bios).
type Mail = { subject: string; body: string; to: string };
const mails = (raw: string): Mail[] =>
  [...raw.matchAll(/href="(mailto:[^"]*)"/g)].map((m) => {
    const u = new URL(decode(m[1]));
    return { to: decodeURIComponent(u.pathname), subject: u.searchParams.get('subject') ?? '', body: (u.searchParams.get('body') ?? '').replace(/\r\n/g, '\n') };
  });
const pages = () => listPages().map((p) => ({ route: p.route, raw: readFileSync(p.file, 'utf8') }));
/** Templates that do not schedule a call: the report request, media, due diligence, applications. */
const NO_TIMES_BY_DESIGN = /^(Impact Report 2026|Media inquiry|Due-diligence inquiry|Application|Mentor application)/;

test.describe('WP126 A: every route email asks for two suitable times, as its page does', () => {
  test('the Governments briefing email has a "Two suitable times for a briefing:" line', () => {
    const gov = mails(html('partner-with-us/governments/index.html')).filter((m) => m.subject.startsWith('Briefing request'));
    expect(gov.length).toBeGreaterThan(0);
    for (const m of gov) {
      expect(m.body).toContain('Two suitable times for a briefing: ');
      expect(m.body, 'one dates line, not two').not.toContain('Preferred dates');
    }
  });
  test('the Local Partners email has a "Two suitable times for a discovery session:" line, not "Best times to talk"', () => {
    const lp = mails(html('partner-with-us/local-partners/index.html')).filter((m) => m.subject.startsWith('Local partnership inquiry'));
    expect(lp.length).toBeGreaterThan(0);
    for (const m of lp) {
      expect(m.body).toContain('Two suitable times for a discovery session: ');
      expect(m.body).not.toContain('Best times to talk');
    }
  });
  test('on every page, every route mailto (all but report, media, due diligence, applications) has a "Two suitable times for …:" line', () => {
    const missing: string[] = [];
    for (const p of pages()) for (const m of mails(p.raw)) if (m.subject && !NO_TIMES_BY_DESIGN.test(m.subject) && !/^Two suitable times for .*: $/m.test(m.body)) missing.push(`${p.route} | ${m.subject}`);
    expect([...new Set(missing)]).toEqual([]);
  });
  test('every page whose text asks for "two suitable times" carries a mailto whose body has the line', () => {
    const bad = pages()
      .filter((p) => /two suitable times/i.test(strip(p.raw)))
      .filter((p) => !mails(p.raw).some((m) => /^Two suitable times for .*: $/m.test(m.body)))
      .map((p) => p.route);
    expect(bad).toEqual([]);
  });
});

test.describe('WP126 B: the JobReady platform page’s grant link opens the dedicated platform-grant email', () => {
  test('"Discuss a Platform Grant for JobReady’s Next Stage" opens "JobReady platform grant — [foundation/company]"', () => {
    const raw = html('our-model/jobready-platform/index.html');
    const link = /<a class="link" href="(mailto:[^"]*)"[^>]*>Discuss a Platform Grant for JobReady(?:’|&#39;|&#x27;)s Next Stage<\/a>/.exec(raw);
    expect(link).not.toBeNull();
    const u = new URL(decode(link![1]));
    expect(u.searchParams.get('subject')).toBe('JobReady platform grant — [foundation/company]');
    expect(u.searchParams.get('body')).toContain('Questions about the platform grant: ');
    expect(u.searchParams.get('body')).not.toContain('Interest: platform grant / YouthWIDE cohort');
  });
  test('the page no longer opens the generic "Funding partnership" template', () => {
    expect(mails(html('our-model/jobready-platform/index.html')).filter((m) => m.subject.startsWith('Funding partnership'))).toEqual([]);
  });
});

test.describe('WP126 C: no serial comma in the six team bios', () => {
  const BIOS: [string, string][] = [
    ['aziz-ahmad', 'the U.S. Senate, the World Economic Forum, the European Parliament and Vatican City, on the Future of Work'],
    ['asad-zaman', 'technical and vocational education and training (TVET), labor-market and migration strategist'],
    ['asad-zaman', 'strategic partnerships, resource mobilization and digital transformation.'],
    ['asad-zaman', 'education, migration, e-governance and South-South Cooperation, organized'],
    ['hazrat-ali-nahid', 'bookkeeping, payroll, VAT, GST and tax filing'],
    ['hazrat-ali-nahid', 'the U.S., U.K., Australia and Canada.'],
    ['rezaul-karim-khan', 'business analysis and project management.'],
    ['shafqat-ullah', 'software engineering, cloud and edge computing.'],
    ['ferdinand-kjaerulff', 'a former Danish Army captain, entrepreneur and businessman, founded CodersTrust'],
  ];
  for (const [slug, s] of BIOS) {
    test(`${slug}: "${s}"`, () => {
      expect(text(`about/team/${slug}/index.html`)).toContain(s);
    });
  }
  test('the old serial-comma strings are on no built page', () => {
    const stale = pages().filter((p) => /European Parliament, and|labor-market, and|resource mobilization, and|e-governance, and|GST, and tax|UK, Australia, and|business analysis, and project|cloud, and edge computing|entrepreneur, and businessman/.test(decode(p.raw))).map((p) => p.route);
    expect(stale).toEqual([]);
  });
});
