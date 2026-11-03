import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR, QA_DIR } from './support/env';

/**
 * WP161-A (adversarial review of 2 November 2026, group A: dates and structured data, partner routes, privacy and accessibility, Foundations).
 * Test-first: run `npm run build`, then `PORT=4911 npx playwright test tests/wp161-a.spec.ts --project=chromium`. The tests read the built files (and run
 * scripts/check-privacy-launch.mjs and the edge-release gate); none opens a browser.
 *   A-01  WSDFM and Digital Jobs Albania declare the day their visible text last changed; the Stories CollectionPage says 2026-10-31 like its Article.
 *   A-02  Development Partners, Local Partners and Universities declare dateModified 2026-11-02 (their last visible change); Employers changes today (A-28).
 *   A-03  The five posts written in October 2026 give NewsArticle.datePublished and article:published_time as publishedOn (2026-10-18); the visible date stays the event date.
 *   A-04  Article.headline equals the H1 on Global Reach, Case Studies and Success Stories.
 *   A-05/06 Outcomes 2026: the Dataset description names bases (n) and the rounding; "Download the Data" prints the rounding sentence.
 *   A-07  Investors WebPage.name carries no site-name suffix.
 *   A-08  Privacy Policy: no YouTube player is promised; the Video section says no page embeds a video today (checked in dist).
 *   A-09  Accessibility Statement: no exception for news-post photos; the external-content line says some news posts link to YouTube videos.
 *   A-26..A-31  Partner routes: three months of mentoring stated first, "every supported cohort", where the candidate pool is, spending reported against the scorecard,
 *         the safeguarding link lands on #safeguarding, and the briefing, JobReady@Campus and due-diligence emails ask for the fields the pages name.
 *   C-3   (owner 2026-11-02) Foundations states the registered ID-12 legal form once, beside its due-diligence line; the other brief bands are unchanged.
 *   C-4   (owner 2026-11-02) Privacy Policy states the legitimate-interest basis once; scripts/check-privacy-launch.mjs fails until the policy states an email retention
 *         period and an international-transfer sentence, and it runs in the edge-release gate only.
 * Owner date rule: a page whose visible text changes in this package moves its own date to the change day, TODAY.
 */

const TODAY = '2026-11-03';

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;| /g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const main = (rel: string) => visible(mainRaw(rel));
const count = (text: string, needle: string) => text.split(needle).length - 1;
const h1 = (rel: string) => visible(/<h1[\s\S]*?<\/h1>/.exec(html(rel))?.[0] ?? '');
/** The raw HTML of the element with that id, from its opening tag to the first closing tag of the same name. */
function byId(rel: string, tag: string, id: string): string {
  const raw = html(rel);
  const i = raw.search(new RegExp(`<${tag}\\b[^>]*\\bid="${id}"`));
  expect(i, `<${tag} id="${id}"> is on ${rel}`).toBeGreaterThanOrEqual(0);
  const j = raw.indexOf(`</${tag}>`, i);
  return raw.slice(i, j + tag.length + 3);
}
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
const lastUpdated = (rel: string) => /Last updated\s*<time[^>]*datetime="([^"]+)"/.exec(html(rel))?.[1];
/** Every mailto: link on a page, with its decoded subject and body. */
const mails = (rel: string) =>
  [...html(rel).matchAll(/href="mailto:([^"]*)"/g)].map((m) => {
    const q = new URLSearchParams(decode(m[1]).split('?')[1] ?? '');
    return { subject: q.get('subject') ?? '', body: q.get('body') ?? '' };
  });

const PRIVACY = 'privacy-policy/index.html';
const ACCESSIBILITY = 'accessibility/index.html';
const GOVERNMENTS = 'partner-with-us/governments/index.html';
const FOUNDATIONS = 'partner-with-us/foundations/index.html';
const EMPLOYERS = 'partner-with-us/employers/index.html';
const HUB = 'partner-with-us/index.html';
const OUTCOMES = 'impact/outcomes-2026/index.html';
const NEWS_DIR = join(process.cwd(), 'src/content/news');
const OCTOBER_POSTS = [
  'coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner',
  'coderstrust-presents-at-in5-in-dubai',
  'hour-of-code-in-somaliland',
  'coderstrust-sets-up-in-india',
  'coderstrust-announces-learning-partnerships-in-uganda',
];

/* ---------------------------------------------------------------------------------------------- */
/* Package 1: structured data and dates                                                            */
/* ---------------------------------------------------------------------------------------------- */

test.describe('A-01 case studies and Stories declare the day their visible text last changed', () => {
  const article = (slug: string) => nodeOf(`impact/case-studies/${slug}/index.html`, 'Article');
  test('WSDFM says 2026-10-28 and Digital Jobs Albania 2026-10-21 (no longer the shared 2026-10-10)', () => {
    expect(article('wsdfm-women-freelancers').dateModified).toBe('2026-10-28');
    expect(article('digital-jobs-albania').dateModified).toBe('2026-10-21');
  });
  test('the other three keep their own dates, and all five keep datePublished 2026-10-08', () => {
    expect(article('kosovo-women-in-online-work').dateModified).toBe('2026-11-02');
    expect(article('undp-yes-korail').dateModified).toBe('2026-11-01');
    expect(article('her-power').dateModified).toBe('2026-10-31');
    for (const s of ['kosovo-women-in-online-work', 'digital-jobs-albania', 'wsdfm-women-freelancers', 'undp-yes-korail', 'her-power']) expect(article(s).datePublished, s).toBe('2026-10-08');
  });
  test('Stories: the CollectionPage and the Article both say 2026-10-31', () => {
    expect(nodeOf('impact/stories/index.html', 'CollectionPage').dateModified).toBe('2026-10-31');
    expect(nodeOf('impact/stories/index.html', 'Article').dateModified).toBe('2026-10-31');
  });
});

test.describe('A-02 partner route pages declare their own dateModified', () => {
  for (const route of ['development-partners', 'local-partners', 'universities']) {
    test(`${route}: WebPage.dateModified is 2026-11-02, its last visible change`, () => {
      expect(nodeOf(`partner-with-us/${route}/index.html`, 'WebPage').dateModified).toBe('2026-11-02');
    });
  }
  test(`Employers, Governments and Foundations change visible text in this package, so they say ${TODAY}; Investors keeps 2026-11-02`, () => {
    expect(nodeOf(EMPLOYERS, 'WebPage').dateModified).toBe(TODAY);
    expect(nodeOf(GOVERNMENTS, 'WebPage').dateModified).toBe(TODAY);
    expect(nodeOf(FOUNDATIONS, 'WebPage').dateModified).toBe(TODAY);
    expect(nodeOf('partner-with-us/investors/index.html', 'WebPage').dateModified).toBe('2026-11-02');
  });
});

test.describe('A-03 the posts written in October 2026 are dated by first publication in structured data', () => {
  const source = (slug: string) => readFileSync(join(NEWS_DIR, `${slug}.md`), 'utf8');
  const frontDate = (slug: string, key: string) => new RegExp(`^${key}: (\\d{4}-\\d{2}-\\d{2})$`, 'm').exec(source(slug).split(/^---$/m)[1] ?? '')?.[1];
  const visibleDate = (slug: string) => /<header class="art__head"[\s\S]*?<time datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(`news/${slug}/index.html`))?.[1];
  const publishedTime = (slug: string) => /<meta property="article:published_time" content="([^"]+)"/.exec(html(`news/${slug}/index.html`))?.[1];

  test('exactly the five writtenFromSources posts carry publishedOn: 2026-10-18', () => {
    const slugs = readdirSync(NEWS_DIR).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
    expect(slugs.filter((s) => /^writtenFromSources: true$/m.test(source(s))).sort()).toEqual([...OCTOBER_POSTS].sort());
    expect(slugs.filter((s) => /^publishedOn:/m.test(source(s))).sort()).toEqual([...OCTOBER_POSTS].sort());
    for (const s of OCTOBER_POSTS) expect(frontDate(s, 'publishedOn'), s).toBe('2026-10-18');
  });
  for (const slug of OCTOBER_POSTS) {
    test(`${slug}: NewsArticle, WebPage and article:published_time say 2026-10-18; the visible date is still the event date`, () => {
      const rel = `news/${slug}/index.html`;
      expect(nodeOf(rel, 'NewsArticle').datePublished).toBe('2026-10-18');
      expect(nodeOf(rel, 'WebPage').datePublished).toBe('2026-10-18');
      expect(publishedTime(slug)).toMatch(/^2026-10-18T/);
      expect(visibleDate(slug)).toBe(frontDate(slug, 'date'));
      expect(visibleDate(slug)! < '2026-01-01').toBe(true);
    });
  }
  test('every other post: datePublished is the visible date (the date the post was first published)', () => {
    const others = readdirSync(NEWS_DIR).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).filter((s) => !OCTOBER_POSTS.includes(s));
    expect(others.length).toBeGreaterThan(30);
    for (const s of others) {
      const rel = `news/${s}/index.html`;
      if (!existsSync(join(DIST_DIR, rel))) continue;
      expect(nodeOf(rel, 'NewsArticle').datePublished, s).toBe(visibleDate(s));
      expect(publishedTime(s), s).toMatch(new RegExp(`^${visibleDate(s)}T`));
    }
  });
});

test.describe('A-04 Article.headline equals the page H1', () => {
  for (const [rel, heading] of [
    ['impact/global-reach/index.html', 'Where We Have Worked: 16 Countries and Territories'],
    ['impact/case-studies/index.html', 'Five Programs Across Kosovo, Albania and Bangladesh'],
    ['impact/stories/index.html', 'Learners Turning Training into Work'],
  ] as const) {
    test(`${rel}: "${heading}"`, () => {
      expect(h1(rel)).toBe(heading);
      expect(nodeOf(rel, 'Article').headline).toBe(heading);
    });
  }
  test('the dates of the three Article nodes stay as they were (the headline is structured data, not visible text)', () => {
    expect(nodeOf('impact/global-reach/index.html', 'Article').dateModified).toBe('2026-11-02');
    expect(nodeOf('impact/case-studies/index.html', 'Article').dateModified).toBe('2026-11-01');
  });
});

test.describe('A-05 and A-06 Outcomes 2026: the Dataset description and the Download the Data section', () => {
  const ROUNDING = 'Shares are rounded to one decimal, so a summary share can differ from the sum of its parts by 0.1 point.';
  test('the Dataset description names the bases and the rounding', () => {
    const d = String(nodeOf(OUTCOMES, 'Dataset').description);
    expect(d).toContain('Percentages and medians with their bases (n) where published, and no cell counts; districts under 3% are combined into Other districts.');
    expect(d).not.toContain('Percentages and medians only, with no counts');
    expect(d.endsWith(` ${ROUNDING}`)).toBe(true);
  });
  test('"Download the Data" prints the rounding sentence once, after the download link', () => {
    const section = visible(byId(OUTCOMES, 'section', 'download'));
    expect(section).toContain(`Download the Survey Aggregates (CSV) ${ROUNDING}`);
    expect(count(main(OUTCOMES), ROUNDING)).toBe(1);
  });
  test(`the page's own date moves to ${TODAY} (visible text changed)`, () => {
    expect(lastUpdated(OUTCOMES)).toBe(TODAY);
    expect(nodeOf(OUTCOMES, 'Dataset').dateModified).toBe(TODAY);
    expect(nodeOf(OUTCOMES, 'WebPage').dateModified).toBe(TODAY);
  });
});

test.describe('A-07 Investors WebPage.name has no site-name suffix', () => {
  test('Investors: "Investors"; the hub keeps its CollectionPage name', () => {
    expect(nodeOf('partner-with-us/investors/index.html', 'WebPage').name).toBe('Investors');
    expect(nodeOf(HUB, 'CollectionPage').name).toBe('Partner with Us | CodersTrust');
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* Package 2: Privacy Policy and Accessibility Statement                                           */
/* ---------------------------------------------------------------------------------------------- */

const realPages = (): { rel: string; raw: string }[] => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) walk(f, out);
      else if (n === 'index.html') out.push(f);
    }
    return out;
  };
  return walk(DIST_DIR)
    .map((f) => ({ rel: relative(DIST_DIR, f), raw: readFileSync(f, 'utf8') }))
    .filter((p) => !/http-equiv="refresh"|data-redirect-stub/.test(p.raw.slice(0, 6000)));
};
const YOUTUBE_LINK = /href="https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//;

test.describe('A-08 Privacy Policy: no page embeds a video today', () => {
  test('the lead says nothing from another company loads inside the pages', () => {
    expect(main(PRIVACY)).toContain('This website is a static site. It sets no analytics cookies and loads no third-party trackers on its own; nothing from another company loads inside its pages. This page names the services involved in handling your data, and when.');
    expect(main(PRIVACY)).not.toContain('a video loads from YouTube only after you click play');
  });
  test('the services table has no YouTube player row; the share, social and map-link row still names YouTube', () => {
    const rows = [...byId(PRIVACY, 'section', 'services').matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/g)].map((m) => visible(m[0]));
    expect(rows.some((r) => r.startsWith('YouTube (youtube-nocookie.com)'))).toBe(false);
    expect(rows.some((r) => r.includes('Only after you click play'))).toBe(false);
    expect(rows).toContain('LinkedIn, X, Facebook, YouTube, Google Maps Only if you click a share, social or map link What those services collect once you are on them');
  });
  test('the Video section says no page embeds a video, how YouTube links work and what would happen if a page ever embedded one', () => {
    expect(visible(byId(PRIVACY, 'section', 'video'))).toBe(
      'Video No page embeds a video today. Some news posts and our social links point to YouTube; nothing loads from YouTube unless you follow a link, and then you are on YouTube’s site under its own policy. If a page ever embeds a video, it will appear as a still image with a play button, and no request will go to YouTube until you click play. It would then load from youtube-nocookie.com, YouTube’s privacy-enhanced domain.',
    );
  });
  test('the sentences hold in the build: no real page embeds an iframe, a video or the LiteVideo facade (the styleguide excepted); news posts and the footer link to YouTube', () => {
    const pages = realPages();
    expect(pages.length).toBeGreaterThan(90);
    expect(pages.filter((p) => /<iframe\b|<video\b|\bdata-lite\b/.test(p.raw)).map((p) => p.rel)).toEqual(['styleguide/index.html']);
    expect(pages.filter((p) => p.rel.startsWith('news/') && YOUTUBE_LINK.test(mainRaw(p.rel))).length).toBeGreaterThanOrEqual(2);
    expect(/<footer[\s\S]*<\/footer>/.exec(html('index.html'))?.[0]).toMatch(YOUTUBE_LINK);
  });
  test(`"Last updated" and dateModified are ${TODAY}`, () => {
    expect(lastUpdated(PRIVACY)).toBe(TODAY);
    expect(nodeOf(PRIVACY, 'WebPage').dateModified).toBe(TODAY);
  });
});

test.describe('A-09 Accessibility Statement: news-post photos are no exception; some posts link to YouTube videos', () => {
  test('the Images line has no exception', () => {
    const t = main(ACCESSIBILITY);
    expect(t).toContain('Images, charts and maps. Images have alternative text or are marked decorative. Charts have a data table, and the map has a location table (below).');
    expect(t).not.toContain('photos in older news posts are an exception');
  });
  test('Known Limitations: long web addresses as link text, and external content', () => {
    const t = main(ACCESSIBILITY);
    expect(t).toContain('Older news posts. News articles are carried over from our earlier website and lightly edited. Some posts show a long web address as the link text. We are improving these as we edit posts.');
    expect(t).toContain('External content. Some news posts link to videos on YouTube; their captions and controls are YouTube’s. Pages we link to may not meet the same standard.');
    expect(t).not.toContain('generic or empty alternative text');
    expect(t).not.toContain('Embedded and external content');
  });
  test('the sentences hold in the build: every photo in a news article has alternative text, and some posts show a long web address as link text', () => {
    const news = realPages().filter((p) => /<article class="art\b/.test(p.raw));
    expect(news.length).toBeGreaterThan(30);
    const imgs = news.flatMap((p) => [.../<article class="art[\s\S]*?<\/article>/.exec(p.raw)![0].matchAll(/<img\b[^>]*>/g)].map((m) => ({ rel: p.rel, tag: m[0] })));
    expect(imgs.length).toBeGreaterThan(50);
    expect(imgs.filter((i) => !(/\balt="([^"]+)"/.exec(i.tag)?.[1] ?? '').trim()).map((i) => i.rel)).toEqual([]);
    const longText = news.filter((p) => [...mainRaw(p.rel).matchAll(/<a\b[^>]*>\s*(https?:\/\/[^<\s]{20,})\s*<\/a>/g)].length > 0);
    expect(longText.length).toBeGreaterThanOrEqual(1);
  });
  test(`"Last updated" and dateModified are ${TODAY}`, () => {
    expect(lastUpdated(ACCESSIBILITY)).toBe(TODAY);
    expect(nodeOf(ACCESSIBILITY, 'WebPage').dateModified).toBe(TODAY);
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* Package 5: partner routes                                                                       */
/* ---------------------------------------------------------------------------------------------- */

test.describe('A-26 and A-29 Governments and Foundations cards', () => {
  test('Governments: three months of mentoring is stated, and spending is reported against the scorecard', () => {
    const t = main(GOVERNMENTS);
    expect(t).toContain('Certification tracks chosen from employer demand, then three months of mentoring and placement support toward local, remote and global work.');
    expect(t).toContain('A pilot scorecard with cost per completer and per verified outcome, and monthly reports. Spending is reported against the agreed scorecard.');
    expect(t).not.toContain('Your budget is assessed against the agreed scorecard.');
  });
  test('Foundations: three months of mentoring is stated before the FAQ refers to it', () => {
    const t = main(FOUNDATIONS);
    const card = 'Three months of mentoring and placement support are standard inclusions, and outcomes are tracked for 12 months after each course.';
    expect(t).toContain(card);
    expect(t.indexOf(card)).toBeLessThan(t.indexOf('after their three months of mentoring'));
  });
});

test.describe('A-27 the reporting band applies to every supported cohort', () => {
  test('the hub due-diligence card and the Home comparison row', () => {
    expect(main(HUB)).toContain('Included for every supported cohort: follow-up surveys at 3, 6 and 12 months and monthly reports.');
    expect(main('index.html')).toContain('Included for every supported cohort: monthly reports and follow-up surveys at 3, 6 and 12 months');
    expect(main(HUB)).not.toContain('Included for every cohort');
    expect(main('index.html')).not.toContain('Included for every cohort');
  });
});

test.describe('A-28 Employers: the Hire Talent lead says where most delivery has been', () => {
  test('the lead, with the register sentence once on the page', () => {
    const lead = visible(byId(EMPLOYERS, 'section', 'hire-talent'));
    expect(lead).toContain('Job-ready candidates are introduced through CodersTrust’s placement team. Most delivery has been in Bangladesh. Talent requests are scoped against the experience and credentials available in the candidate pool.');
    expect(count(main(EMPLOYERS), 'Most delivery has been in Bangladesh.')).toBe(1);
  });
});

test.describe('A-30 the safeguarding link lands on the Governance safeguarding section', () => {
  for (const rel of [FOUNDATIONS, 'partner-with-us/local-partners/index.html', 'programs/superkids/index.html']) {
    test(rel, () => {
      const links = [...html(rel).matchAll(/<a href="([^"]*)"[^>]*>See how we handle them/g)].map((m) => m[1]);
      expect(links.length).toBeGreaterThanOrEqual(1);
      for (const href of links) expect(href).toMatch(/\/about\/governance\/#safeguarding$/);
    });
  }
});

test.describe('A-31 prefilled emails ask for the fields the pages name', () => {
  const bodyOf = (rel: string, subject: RegExp) => {
    const m = mails(rel).find((x) => subject.test(x.subject));
    expect(m, `${rel} has a ${subject} email`).toBeTruthy();
    return m!.body;
  };
  test('ministry briefing (Governments)', () => {
    const body = bodyOf(GOVERNMENTS, /^Briefing request/);
    expect(body).toContain('Ministry or agency: \r\nCountry: \r\nPriority groups and locations: \r\nTarget number of trainees: \r\nContact person: \r\nTwo suitable times for a briefing: ');
    expect(body).not.toContain('Program/target');
  });
  test('JobReady@Campus (Universities)', () => {
    const body = bodyOf('partner-with-us/universities/index.html', /^JobReady@Campus inquiry/);
    expect(body).toContain('Institution: \r\nCountry: \r\nStudents you have in mind (approximate number): \r\nPrograms of interest: \r\nTwo suitable times for a discovery session: ');
    expect(body).not.toContain('Number of students');
  });
  test('due diligence (hub)', () => {
    const body = bodyOf(HUB, /^Due-diligence inquiry/);
    expect(body).toContain('Program, grant or contract under consideration: ');
    expect(body).not.toContain('Program or grant under consideration');
  });
});

/* ---------------------------------------------------------------------------------------------- */
/* WP160-C items 3 and 4 (owner answers of 2 November 2026)                                        */
/* ---------------------------------------------------------------------------------------------- */

const ID12 = 'CT USA, Inc. is a for-profit company incorporated in New York. CodersTrust Bangladesh Ltd. is incorporated in Bangladesh.';
const DD_LINE = 'The contracting entity, safeguarding arrangements and reporting plan are confirmed for your program.';

test.describe('C-3 Foundations states the legal form once, beside its due-diligence line', () => {
  test('the due-diligence band: the line, then ID-12 from the register', () => {
    const band = byId(FOUNDATIONS, 'section', 'due-diligence');
    expect(visible(band)).toContain(`${DD_LINE} ${ID12}`);
    expect(band).toMatch(/data-fact="ID-12"/);
    expect(count(main(FOUNDATIONS), 'CT USA, Inc. is a for-profit company')).toBe(1);
  });
  for (const route of ['development-partners', 'governments', 'universities', 'local-partners']) {
    test(`${route}: the shared brief band is unchanged`, () => {
      const band = visible(byId(`partner-with-us/${route}/index.html`, 'section', 'due-diligence'));
      expect(band).toContain(DD_LINE);
      expect(band).not.toContain('CT USA, Inc.');
      expect(band).not.toContain('for-profit');
    });
  }
});

const LEGAL_BASIS = 'We rely on our legitimate interest in running and securing the site and in answering inquiries.';
const LAUNCH = join(process.cwd(), 'scripts/check-privacy-launch.mjs');
const FIXTURES = join(QA_DIR, 'wp161-a-fixtures');
/** A one-page dist holding a privacy policy with the given sentences. */
function fixture(name: string, sentences: string[]): string {
  const dir = join(FIXTURES, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, 'privacy-policy'), { recursive: true });
  const body = html(PRIVACY).replace('<section id="changes"', `<section id="launch"><h2>Retention and Transfers</h2>${sentences.map((s) => `<p>${s}</p>`).join('')}</section><section id="changes"`);
  writeFileSync(join(dir, 'privacy-policy/index.html'), body);
  return dir;
}
const RETENTION = 'Inquiry emails are kept for 12 months and then deleted.';
const TRANSFER = 'The host’s servers are in the United States; if you visit from elsewhere, your IP address is processed there.';
const run = (cmd: string[], extra: string[] = []) => spawnSync(process.execPath, [...cmd, ...extra], { encoding: 'utf8', cwd: process.cwd() });

test.describe('C-4 Privacy Policy: the legal basis now; retention and transfers gated at cutover', () => {
  test('"In Short" states the legitimate-interest basis, once on the page', () => {
    const summary = [...byId(PRIVACY, 'section', 'summary').matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/g)].map((m) => visible(m[0]));
    expect(summary).toContain(LEGAL_BASIS);
    expect(count(main(PRIVACY), 'legitimate interest')).toBe(1);
  });
  test('check-privacy-launch fails on today’s build and names both missing statements', () => {
    expect(existsSync(LAUNCH)).toBe(true);
    const r = run([LAUNCH, '--dist', DIST_DIR]);
    expect(r.status, r.stdout + r.stderr).toBe(1);
    expect(r.stdout + r.stderr).toMatch(/retention/i);
    expect(r.stdout + r.stderr).toMatch(/transfer/i);
  });
  test('it passes on a fixture that states both, and fails when either is missing', () => {
    const both = run([LAUNCH, '--dist', fixture('both', [RETENTION, TRANSFER])]);
    expect(both.status, both.stdout + both.stderr).toBe(0);
    const onlyRetention = run([LAUNCH, '--dist', fixture('retention-only', [RETENTION])]);
    expect(onlyRetention.status).toBe(1);
    expect(onlyRetention.stdout + onlyRetention.stderr).toMatch(/transfer/i);
    const onlyTransfer = run([LAUNCH, '--dist', fixture('transfer-only', [TRANSFER])]);
    expect(onlyTransfer.status).toBe(1);
    expect(onlyTransfer.stdout + onlyTransfer.stderr).toMatch(/retention/i);
    // a period with no email, and email with no period, are not a retention statement
    expect(run([LAUNCH, '--dist', fixture('vague', ['We keep emails as long as needed.', 'Server logs are kept for 30 days.', TRANSFER])]).status).toBe(1);
  });
  test('it runs in the edge-release gate only: build and production-release stay as they are', () => {
    const gate = run([join(process.cwd(), 'scripts/run-gate.mjs'), 'edge-release', '--dist', DIST_DIR]);
    expect(gate.status).toBe(1);
    expect(gate.stdout).toMatch(/FAIL {2}privacy launch statements/);
    expect(gate.stdout).toMatch(/PASS {2}Worker tests/);
    const ok = run([join(process.cwd(), 'scripts/run-gate.mjs'), 'edge-release', '--dist', fixture('gate', [RETENTION, TRANSFER])]);
    expect(ok.status, ok.stdout).toBe(0);
    const src = readFileSync(join(process.cwd(), 'scripts/run-gate.mjs'), 'utf8');
    const block = (name: string) => {
      const i = src.indexOf(`${name}: {`) >= 0 ? src.indexOf(`${name}: {`) : src.indexOf(`'${name}': {`);
      expect(i, `gate ${name}`).toBeGreaterThan(0);
      return src.slice(i, src.indexOf('\n  },', i));
    };
    expect(block('edge-release')).toContain('check-privacy-launch.mjs');
    expect(block('build')).not.toContain('check-privacy-launch');
    expect(block('production-release')).not.toContain('check-privacy-launch');
  });
});
