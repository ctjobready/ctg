import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP135 (Opus High run 10, kit 102).
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp135.spec.ts --project=chromium`.
 *   - Minor 1: every closing line that sits directly before an email button whose prefilled body asks for "Two suitable times" asks for two suitable times too.
 *     The site-wide rule test below walks every built page, so the sweep does not recur one page at a time.
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
 * The site-wide rule.
 *
 * A "band" is the nearest enclosing <section> or <aside> of an email (mailto) link whose decoded body contains "Two suitable times"
 * (the Governments "for a briefing" and Investors "for an introduction call" emails included: the match is on the phrase, not on what follows).
 * Closing line: the paragraph directly before the link, once the wrapper tags that open the link's row (div, p, span, li) are skipped.
 * The rule: a band with a closing line asks for "suitable times" somewhere in its visible text (the button label, the sr-only text and the
 * other email links are not counted, so a button cannot satisfy the rule by naming the times).
 *
 * Deliberate exemptions, each with its reason (the test prints how many bands each one took out):
 *   hero        a hero band (class hero or hh, or the page's <h1>): its lead introduces the page; the ask sits in the closing band.
 *   no-band     a link outside every <section>/<aside> (the sticky mobile button): it carries no text of its own.
 *   styleguide  /styleguide/ is the design-system demo page, not content; its sample bands are placeholders.
 *   contact     /contact/ is the inquiry directory: six-plus route cards, each one audience line and one button. The page's own "Your Inquiry"
 *               step says "In your inquiry, include two suitable times." (asserted below), so the cards do not repeat it ten times.
 *   no-line     the paragraph directly before the link is absent: the heading, a table, a stat block or a list stands there. There is no closing
 *               line to complete (the route pages' heading-only bands, the case studies, Success Stories, Our Model; the mid-page text links on
 *               Foundations, Employers and YouthWIDE). Their pages carry the ask in "Your first step" / "What Happens Next".
 * ------------------------------------------------------------------------------------------------------------------------------------- */
type Verdict = { page: string; heading: string; line: string; asks: boolean } | { page: string; exempt: 'hero' | 'no-band' | 'styleguide' | 'contact' | 'no-line' };

function bandVerdicts(page: string): Verdict[] {
  const raw = html(page);
  if (page === 'styleguide/index.html') return /href="mailto:[^"]*"/.test(raw) ? [{ page, exempt: 'styleguide' }] : [];
  const spans: { s: number; e: number; open: string }[] = [];
  const stack: { s: number; open: string }[] = [];
  for (const m of raw.matchAll(/<(\/?)(?:section|aside)\b[^>]*>/gi)) {
    if (m[1]) {
      const o = stack.pop();
      if (o) spans.push({ s: o.s, e: m.index! + m[0].length, open: o.open });
    } else stack.push({ s: m.index!, open: m[0] });
  }
  const bands = new Map<number, { band: (typeof spans)[number]; closing: string | null }>();
  const out: Verdict[] = [];
  for (const a of raw.matchAll(/<a\b[^>]*?href="(mailto:[^"]*)"[^>]*>/gi)) {
    let body = '';
    try {
      body = new URL(decode(a[1])).searchParams.get('body') ?? '';
    } catch {
      /* a mailto without a query has no body */
    }
    if (!/two suitable times/i.test(body)) continue;
    const at = a.index!;
    const band = spans.filter((x) => x.s < at && x.e > at).sort((x, y) => x.e - x.s - (y.e - y.s))[0];
    if (!band) {
      out.push({ page, exempt: 'no-band' });
      continue;
    }
    const prior = raw.slice(band.s, at).replace(/(?:\s|<(?:div|p|span|li)\b[^>]*>)+$/i, '');
    const closing = /<\/p>$/i.test(prior) ? (prior.match(/<p\b[^>]*>(?:(?!<p\b)[\s\S])*<\/p>$/i)?.[0] ?? '') : null;
    const known = bands.get(band.s);
    if (!known || (known.closing === null && closing !== null)) bands.set(band.s, { band, closing });
  }
  for (const { band, closing } of bands.values()) {
    const bandHtml = raw.slice(band.s, band.e);
    if (/class="[^"]*\b(?:hero|hh)\b/.test(band.open) || /<h1\b/.test(bandHtml)) {
      out.push({ page, exempt: 'hero' });
      continue;
    }
    if (page === 'contact/index.html') {
      out.push({ page, exempt: 'contact' });
      continue;
    }
    if (closing === null) {
      out.push({ page, exempt: 'no-line' });
      continue;
    }
    const text = visible(
      bandHtml
        .replace(/<a\b[^>]*href="mailto:[^"]*"[^>]*>[\s\S]*?<\/a>/gi, ' ')
        .replace(/<(\w+)\b[^>]*class="[^"]*\bsr-only\b[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, ' '),
    );
    const heading = visible(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(bandHtml)?.[1] ?? '(no heading)');
    out.push({ page, heading, line: visible(closing), asks: /suitable times/i.test(text) });
  }
  return out;
}

test.describe('Minor 1: every closing line before an email button that asks for "Two suitable times" asks for them too', () => {
  const verdicts = allPages().flatMap(bandVerdicts);
  const checked = verdicts.filter((v): v is Extract<Verdict, { asks: boolean }> => 'asks' in v);

  test('no closing band leaves the two suitable times out (page-by-page offender list)', () => {
    const offenders = checked.filter((v) => !v.asks).map((v) => `${v.page} | ${v.heading} | "${v.line}"`);
    expect(offenders.length, `${offenders.length} closing band(s) with a closing line but no ask:\n${offenders.join('\n')}`).toBe(0);
  });

  test('the rule is not vacuous: it examines the closing bands it is meant to', () => {
    expect(checked.length).toBeGreaterThanOrEqual(25);
    const pages = new Set(checked.map((v) => v.page));
    for (const p of [
      'index.html',
      'impact/index.html',
      'impact/outcomes-2026/index.html',
      'impact/independent-evaluation/index.html',
      'our-model/talentleap/index.html',
      'our-model/jobready-platform/index.html',
      'partner-with-us/index.html',
      'partner-with-us/local-partners/index.html',
      'programs/youthwide/index.html',
      'about/index.html',
    ]) expect(pages.has(p), `${p} is examined`).toBe(true);
    // The Governments column on YouthWIDE (a text link with a briefing email) is examined, not exempted.
    const yw = checked.filter((v) => v.page === 'programs/youthwide/index.html');
    expect(yw.some((v) => /Public procurement follows/.test(v.line)), 'YouthWIDE government column is examined').toBe(true);
  });

  test('the exemptions are the documented ones, and the contact directory carries the ask in its own steps', () => {
    const kinds = new Set(verdicts.filter((v) => 'exempt' in v).map((v) => (v as { exempt: string }).exempt));
    expect([...kinds].sort()).toEqual(['contact', 'hero', 'no-band', 'no-line', 'styleguide']);
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

test('Minor 1: the Case Studies index, the JobReady Platform and Local Partners closing lines ask', () => {
  expect(main('impact/case-studies/index.html')).toContain(`A discovery session sets the scorecard for your own program. ${ASK}`);
  const platform = main('our-model/jobready-platform/index.html');
  expect(platform).toContain(`A discovery session covers how JobReady fits your program, and a platform grant helps CodersTrust roll out the remaining modules. ${ASK}`);
  expect(platform).not.toContain('details are shared in the discovery session');
  const local = main('partner-with-us/local-partners/index.html');
  expect(local).toContain('Tell the Bangladesh team about your organization, your district, the groups you work with and two suitable times for a discovery session.');
  expect(local).not.toContain('your district and the groups you work with.');
});

test('Minor 1: Home’s closing band, found by the rule, asks too', () => {
  expect(main('index.html')).toContain(`Start with a multi-cohort pilot, agree the scorecard up front and decide on expansion from the evidence. ${ASK}`);
});

test('Minor 1: YouthWIDE’s government column and its last "What Happens Next" line ask for two suitable times for a briefing', () => {
  const t = main('programs/youthwide/index.html');
  expect(t).toContain(`Public procurement follows the agency’s own timeline, so we start with a briefing that fits it. In your inquiry, include two suitable times for it.`);
  expect(t).toContain('Governments. In your inquiry, include two suitable times for a briefing; your agency’s procurement timeline sets the pace.');
  expect(t).not.toContain('Governments. Your agency’s procurement timeline sets the pace; we start with a briefing.');
  expect(t).toContain('Funders. In your inquiry, include two suitable times for a discovery session.');
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
