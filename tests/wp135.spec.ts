import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP135 (Opus High run 10, kit 102).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp135.spec.ts --project=chromium`.
 *   - Minor 1: every closing line that sat directly before an email button whose prefilled body asks for "Two suitable times" asked for two suitable times too.
 *     WP136 (owner answer 2026-10-31) replaced the per-band rule with a per-PAGE rule: the request appears ONCE per page. The site-wide rule test below walks every built page.
 *   - Polish 2: "On This Page" lists the closing H2 on the Trial and Outcomes 2026 pages, as Impact and About do.
 *   - Polish 3: Universities folds "Start with One Campus" into the pilot band ("A Pilot Comes First").
 *   - Polish 4: the Careers meta description is two full sentences.
 *   - Owner rule 2026-10-31: a page with its own "Last updated" / dateModified moves to 2026-10-31 when its visible text changes (build-date pages need nothing).
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const visible = (raw: string) =>
  decode(raw.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const onOrAfter = (day: string | undefined, min: string) => (day ?? '') >= min;

const allPages = (dir = DIST_DIR): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? allPages(p) : p.endsWith('.html') ? [relative(DIST_DIR, p)] : [];
  });

/* ---------------------------------------------------------------------------------------------------------------------------------------
 * The site-wide rule (WP136 rewrote the WP135 band rule as a PAGE rule; owner answer 2026-10-31: the "two suitable times" request appears ONCE per page).
 *
 * A page "asks" when one of its mailto links carries a prefilled body with the field "Two suitable times" (the Governments "for a briefing" and Investors
 * "for an introduction call" emails included: the match is on the phrase, not on what follows). On such a page the visible text of <main>, with the email
 * button labels and the sr-only text left out (so a button cannot satisfy the rule by naming the times), contains "suitable times" EXACTLY once.
 * Where the page has a final "What Happens Next" block ("Your first step" line), that one occurrence sits in it; elsewhere it sits in the page's one closing
 * line before the email button. The other bands rely on the prefilled email's "Two suitable times …" field.
 *
 * Deliberate exemptions, each with its reason:
 *   styleguide  /styleguide/ is the design-system demo page, not content; its sample bands are placeholders.
 *   no-line     pages with NO closing line at all: the case studies, Success Stories, Our Model and Mentors close on a heading with a button (or carry only
 *               a hero button), so the sentence has no line to live in. They must carry the phrase ZERO times (asserted, so a new page cannot slip in).
 * ------------------------------------------------------------------------------------------------------------------------------------- */
const STYLEGUIDE = 'styleguide/index.html';
const NO_LINE: Record<string, string> = {
  'about/mentors/index.html': 'a hero button only; the page has no closing line',
  'impact/case-studies/digital-jobs-albania/index.html': 'a heading-only closing band',
  'impact/case-studies/her-power/index.html': 'a heading-only closing band',
  'impact/case-studies/kosovo-women-in-online-work/index.html': 'a heading-only closing band',
  'impact/case-studies/undp-yes-korail/index.html': 'a heading-only closing band',
  'impact/case-studies/wsdfm-women-freelancers/index.html': 'a heading-only closing band',
  'impact/stories/index.html': 'a heading-only closing band',
  'our-model/index.html': 'a hero button and a heading-only closing band',
};

const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
/** The page's main text without the email button labels and the sr-only text: what the reader reads as the sentence, not as a button. */
const proseText = (rel: string) =>
  visible(
    mainRaw(rel)
      .replace(/<a\b[^>]*href="mailto:[^"]*"[^>]*>[\s\S]*?<\/a>/gi, ' ')
      .replace(/<(\w+)\b[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, ' '),
  );
const asksForTimes = (rel: string) => {
  for (const a of html(rel).matchAll(/<a\b[^>]*?href="(mailto:[^"]*)"[^>]*>/gi)) {
    try {
      if (/two suitable times/i.test(new URL(decode(a[1])).searchParams.get('body') ?? '')) return true;
    } catch {
      /* a mailto without a query has no body */
    }
  }
  return false;
};
const timesAt = (text: string) => [...text.matchAll(/suitable times/gi)].map((m) => m.index!);

test.describe('Owner answer 2026-10-31: the "two suitable times" request appears once per page', () => {
  const pages = allPages().filter(asksForTimes);

  test('every page whose emails ask for "Two suitable times" says "suitable times" exactly once (page-by-page offender list)', () => {
    const offenders = pages
      .filter((p) => p !== STYLEGUIDE && !(p in NO_LINE))
      .map((p) => ({ p, n: timesAt(proseText(p)).length }))
      .filter((x) => x.n !== 1)
      .map((x) => `${x.p} | ${x.n} occurrence(s)`);
    expect(offenders.length, `${offenders.length} page(s) without exactly one "suitable times":\n${offenders.join('\n')}`).toBe(0);
  });

  test('where a page has a final "What Happens Next" block, the one occurrence sits in it (the "Your first step" line)', () => {
    const misplaced: string[] = [];
    for (const p of pages.filter((x) => x !== STYLEGUIDE && !(x in NO_LINE))) {
      const text = proseText(p);
      const at = timesAt(text)[0];
      const next = text.lastIndexOf('What Happens Next');
      if (next >= 0 && at !== undefined && at < next) misplaced.push(`${p} | "suitable times" at ${at}, before the last "What Happens Next" at ${next}`);
    }
    expect(misplaced, misplaced.join('\n')).toEqual([]);
  });

  test('the pages without a closing line carry the phrase zero times, and they really ask by email', () => {
    for (const p of Object.keys(NO_LINE)) {
      expect(pages.includes(p), `${p} has a "Two suitable times" email (${NO_LINE[p]})`).toBe(true);
      expect(timesAt(proseText(p)), `${p} (${NO_LINE[p]})`).toEqual([]);
    }
  });

  test('the rule is not vacuous: it examines the pages it is meant to', () => {
    const checked = pages.filter((p) => p !== STYLEGUIDE && !(p in NO_LINE));
    expect(checked.length).toBeGreaterThanOrEqual(60);
    for (const p of [
      'index.html',
      'about/index.html',
      'contact/index.html',
      'impact/index.html',
      'impact/outcomes-2026/index.html',
      'impact/independent-evaluation/index.html',
      'our-model/talentleap/index.html',
      'our-model/jobready-platform/index.html',
      'partner-with-us/index.html',
      'partner-with-us/development-partners/index.html',
      'partner-with-us/foundations/index.html',
      'partner-with-us/governments/index.html',
      'partner-with-us/investors/index.html',
      'partner-with-us/universities/index.html',
      'partner-with-us/employers/index.html',
      'partner-with-us/local-partners/index.html',
      'programs/index.html',
      'programs/superkids/index.html',
      'programs/youthwide/index.html',
      'programs/jobready-campus/index.html',
      'programs/jobready-work/index.html',
    ]) expect(checked.includes(p), `${p} is examined`).toBe(true);
    const news = checked.filter((p) => p.startsWith('news/') && p !== 'news/index.html');
    expect(news.length, 'the News posts are examined (their closing line is their one occurrence)').toBeGreaterThanOrEqual(40);
    expect(asksForTimes(STYLEGUIDE), 'the styleguide exemption is for a page that would otherwise be examined').toBe(true);
  });

  test('the contact directory carries the ask once, in its own "Your Inquiry" step', () => {
    expect(timesAt(main('contact/index.html'))).toHaveLength(1);
    expect(main('contact/index.html')).toContain('In your inquiry, include two suitable times.');
  });
});

const ASK = 'In your inquiry, include two suitable times.';

test('Minor 1: Impact, Outcomes 2026, the Trial and TalentLEAP close "A discovery session explores … scope. In your inquiry, include two suitable times."', () => {
  const LINE = `A discovery session explores your goals, priority groups and possible program scope. ${ASK}`;
  for (const p of ['impact/index.html', 'impact/outcomes-2026/index.html', 'impact/independent-evaluation/index.html', 'our-model/talentleap/index.html']) expect(main(p), p).toContain(LINE);
});

test('Minor 1: In the Field and News Photographs close "Seen a program like the one you need? Tell us your goals, priority groups and two suitable times …"', () => {
  const LINE = 'Seen a program like the one you need? Tell us your goals, priority groups and two suitable times for a discovery session.';
  for (const p of ['impact/in-the-field/index.html', 'impact/in-the-field/news-photos/index.html']) {
    expect(main(p), p).toContain(LINE);
    expect(main(p), p).not.toContain('Seen a program like the one you need? A discovery session explores');
  }
});

test('Minor 1: the Case Studies index and the JobReady Platform closing lines ask; Local Partners asks once, in its last line (WP136)', () => {
  expect(main('impact/case-studies/index.html')).toContain(`In a discovery session, we start planning the scorecard for your own program. ${ASK}`);
  const platform = main('our-model/jobready-platform/index.html');
  expect(platform).toContain(`A discovery session covers how JobReady fits your program, and a platform grant helps CodersTrust roll out the remaining modules. ${ASK}`);
  expect(platform).not.toContain('details are shared in the discovery session');
  const local = main('partner-with-us/local-partners/index.html');
  expect(local).toContain('In your inquiry, include two suitable times for a discovery session.');
  expect(local).toContain('Tell the Bangladesh team about your organization, your district and the groups you work with.');
  expect(local).not.toContain('the groups you work with and two suitable times for a discovery session.');
});

test('Minor 1 (WP136): Home asks once, in the "First Step" line; its closing band leaves the ask to that line', () => {
  const t = main('index.html');
  expect(t).toContain('Start with a multi-cohort pilot, agree the scorecard up front and decide on expansion from the evidence.');
  expect(t).not.toContain(`decide on expansion from the evidence. ${ASK}`);
  expect(t).toContain(`First Step A discovery session. ${ASK}`);
});

test('Minor 1 (WP136): YouthWIDE asks once, in the funders line of "What Happens Next"; the government column and the government line leave it to the email', () => {
  const t = main('programs/youthwide/index.html');
  expect(t).toContain('Public procurement follows the agency’s own timeline, so we start with a briefing that fits it.');
  expect(t).not.toContain('with a briefing that fits it. In your inquiry');
  expect(t).toContain('Governments. Your agency’s procurement timeline sets the pace; we start with a briefing.');
  expect(t).toContain('Funders. In your inquiry, include two suitable times for a discovery session.');
  expect(t).not.toContain('include two suitable times for a briefing');
});

/* ----------------------------------------------------------------------------------------------------------------------------------- */

function tocLabels(rel: string): { text: string; href: string }[] {
  // The long-form pages keep the list in a [data-toc] disclosure; Impact keeps it in a nav ("On this page").
  const raw = html(rel);
  const box = /<div[^>]*data-toc[^>]*>([\s\S]*?)<\/details>/.exec(raw)?.[1] ?? /<nav[^>]*aria-label="On this page"[^>]*>([\s\S]*?)<\/nav>/i.exec(raw)?.[1] ?? '';
  return [...box.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1], text: visible(m[2]) }));
}

test('Polish 2: "On This Page" ends with the closing H2 on the Trial and Outcomes 2026 pages, and the entry jumps to it', () => {
  for (const [rel, heading] of [
    ['impact/independent-evaluation/index.html', 'Talk to Us About a First Cohort'],
    ['impact/outcomes-2026/index.html', 'Discuss the Evidence for Your Program'],
    ['impact/index.html', 'Discuss the Evidence for Your Program'],
  ] as const) {
    const toc = tocLabels(rel);
    const last = toc[toc.length - 1];
    expect(last?.text, rel).toBe(heading);
    const id = last!.href.replace(/^.*#/, '');
    const target = new RegExp(`<(?:section|aside)[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<h2[^>]*>\\s*${heading}\\s*</h2>`).test(html(rel));
    expect(target, `${rel}: #${id} is the closing band`).toBe(true);
  }
});

test('Polish 3: Universities folds "Start with One Campus" into the pilot band', () => {
  const rel = 'partner-with-us/universities/index.html';
  const raw = html(rel);
  const text = main(rel);
  expect(/<h2[^>]*>\s*Start with One Campus\s*<\/h2>/.test(raw), 'no H2 "Start with One Campus"').toBe(false);
  expect(text).not.toContain('Start with One Campus');
  expect(/<h3[^>]*>\s*(?:<[^>]+>\s*)*A Pilot Comes First\s*<\/h3>/.test(raw), 'H3 "A Pilot Comes First"').toBe(true);
  expect(text).toContain('A Pilot Comes First Start with one campus; cohort size, tracks and labs are agreed in co-design.');
  expect(text).not.toContain('Start with a first campus program and see its results.');
  expect(text.match(/agreed in co-design/g) ?? []).toHaveLength(1);
});

test('Polish 3: nothing links to the Universities #offer anchor, and the page has no #offer left to link to', () => {
  const rel = 'partner-with-us/universities/index.html';
  expect(/\bid="offer"/.test(html(rel)), 'no id="offer" on the page').toBe(false);
  const links = allPages().filter((p) => /href="[^"]*partner-with-us\/universities\/#offer"/.test(html(p)));
  expect(links, 'pages that link to /partner-with-us/universities/#offer').toEqual([]);
  expect(/href="#offer"/.test(html(rel)), 'no in-page link to #offer').toBe(false);
});

test('Polish 4: the Careers meta description, og, twitter and JSON-LD are two full sentences', () => {
  const raw = html('careers/index.html');
  const D = 'Join CodersTrust and help prepare educated, unemployed and underemployed young people for paid digital work. We welcome speculative applications.';
  expect(D.length).toBeLessThanOrEqual(155);
  expect(raw.includes(`<meta name="description" content="${D}"`), 'meta description').toBe(true);
  expect(raw.includes(`<meta property="og:description" content="${D}"`), 'og:description').toBe(true);
  expect(raw.includes(`<meta name="twitter:description" content="${D}"`), 'twitter:description').toBe(true);
  expect(raw.includes(`"description":"${D}"`), 'JSON-LD description').toBe(true);
  expect(raw.includes('How to apply, and speculative applications.'), 'the old fragment is gone').toBe(false);
});

test('Owner rule 2026-10-31: the pages whose text changed carry their own date on or after 2026-10-31 (build-date pages need nothing)', () => {
  const DAY = '2026-10-31';
  const nodeDate = (raw: string) => {
    const nodes: Record<string, unknown>[] = [];
    for (const m of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const j = JSON.parse(m[1]);
      nodes.push(...(j['@graph'] ?? [j]));
    }
    const own = (suffix: string) => nodes.find((n) => String(n['@id'] ?? '').endsWith(suffix)) as { dateModified?: string } | undefined;
    return (own('#article') ?? own('#webpage'))?.dateModified;
  };
  const pages = [
    'impact/index.html',
    'impact/outcomes-2026/index.html',
    'impact/independent-evaluation/index.html',
    'impact/in-the-field/index.html',
    'impact/in-the-field/news-photos/index.html',
    'impact/case-studies/index.html',
    'our-model/talentleap/index.html',
    'our-model/jobready-platform/index.html',
    'programs/youthwide/index.html',
  ];
  for (const p of pages) expect(onOrAfter(nodeDate(html(p)), DAY), `${p} JSON-LD dateModified`).toBe(true);
  for (const p of ['impact/outcomes-2026/index.html', 'impact/independent-evaluation/index.html', 'our-model/talentleap/index.html', 'our-model/jobready-platform/index.html', 'programs/youthwide/index.html']) {
    const stamp = /Last updated\s*<time[^>]*datetime="(\d{4}-\d{2}-\d{2})"/.exec(html(p))?.[1];
    expect(onOrAfter(stamp, DAY), `${p} visible "Last updated"`).toBe(true);
  }
});
