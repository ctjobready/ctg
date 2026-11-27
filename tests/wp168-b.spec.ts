import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact, facts, sources } from '../src/data/facts';
import { AKIJ_ASSET, AKIJ_STORY } from '../src/data/copy';
import { CASE_STUDIES } from '../src/components/pages/impact/case-studies';
import { titleCase } from '../src/lib/titleCase.mjs';
import { BASE, DIST_DIR } from './support/env';
import { open } from './support/browser';

/**
 * WP168-B (owner decisions and information of 24 November 2026). Run `npm run build`, then `PORT=4913 npx playwright test tests/wp168-b.spec.ts --project=chromium`. The tests read the built files; one opens the NU overview.
 *   NU      owner statement: classes at CodersTrust Mirpur Campus (NU-14), the next intake by December 10, 2026 (NU-15), the fee payable in installments (NU-16). The overview and the four course pages show them in the hero's key facts
 *           and in Before You Apply ("Intake", "Campus", "Program Fee"); the overview answers three FAQs; no class schedule is stated (none is set) and "Admissions confirms ..." is gone; the hero link goes to Before You Apply.
 *   Akij    owner permission: Akij Group may be named as a client (PA-12, V). It is the first track-record item on Employers and JobReady@Work, with a link to the 2023 post, and carries its permissions row (D13). The post's deck,
 *           which restated the H1, is cut (marketing review R6-33); its facts are unchanged.
 *   Impact  R4-30: the UNDP YES case study's hero adds "97.5% / completed the program" (PR-03c; PR-03 states no base for the 97.5%, so the tile says so). R4-18: the Impact hub's 58.7% tile splits label and note.
 *           R4-09: the Trial page's journal band is headed "Peer-Reviewed: The Article Estimates a Benefit/Cost Ratio of 3.01". R4-21 is not applied (see the last group).
 *   Dates   every page whose visible text changed is dated 2026-11-24.
 */

const TODAY = '2026-11-24';
const NU_DAY = '2026-11-26'; // WP170 (owner answer of 2026-11-26): the NU pages' Application Deadline key fact
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
/** Readable text: comments, scripts, styles and screen-reader-only notes removed, tags stripped, no space before punctuation. */
const visible = (raw: string) =>
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
const main = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const text = (rel: string) => visible(main(rel));
type Node = Record<string, unknown>;
const ld = (rel: string): Node[] =>
  [...html(rel).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const j = JSON.parse(m[1]) as Node;
    return ((j['@graph'] as Node[] | undefined) ?? [j]) as Node[];
  });
const nodes = (rel: string, type: string): Node[] => ld(rel).filter((x) => [x['@type']].flat().includes(type));
const modified = (rel: string) => [...new Set(ld(rel).map((n) => n.dateModified).filter(Boolean))];
const lastUpdated = (rel: string) => /Last updated <time datetime="([^"]+)"/.exec(html(rel))?.[1];
/** The <dl> rows (dt → visible dd) of the first <dl> with that class. */
function rows(rel: string, cls: string): [string, string][] {
  const dl = new RegExp(`<dl\\b[^>]*class="${cls}"[\\s\\S]*?</dl>`).exec(html(rel))?.[0] ?? '';
  return [...dl.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)].map((m) => [visible(m[1]), visible(m[2])]);
}
/** The <li> items of the first list with that class: [opening tag, visible text]. */
function items(rel: string, cls: string): [string, string][] {
  const ul = new RegExp(`<ul\\b[^>]*class="${cls}"[\\s\\S]*?</ul>`).exec(html(rel))?.[0] ?? '';
  return [...ul.matchAll(/(<li\b[^>]*>)([\s\S]*?)<\/li>/g)].map((m) => [m[1], visible(m[2])]);
}
const attr = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];
function sitePages(dir = DIST_DIR, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sitePages(p, out);
    else if (name === 'index.html') out.push(p.slice(DIST_DIR.length + 1));
  }
  return out;
}

const NU = 'programs/nu-postgraduate-diploma/index.html';
const NU_COURSES = ['digital-marketing', 'ict', 'cyber-security', 'data-analytics'].map((s) => `programs/nu-postgraduate-diploma/${s}/index.html`);
const NU_PAGES = [NU, ...NU_COURSES];
const EMPLOYERS = 'partner-with-us/employers/index.html';
const WORK = 'programs/jobready-work/index.html';
const AKIJ_SLUG = 'coderstrust-provides-corporate-training-to-akij-group-one-of-the-largest-conglomerates-of-south-asia';
const AKIJ = `news/${AKIJ_SLUG}/index.html`;
const IMPACT = 'impact/index.html';
const KORAIL = 'impact/case-studies/undp-yes-korail/index.html';
const TRIAL = 'impact/independent-evaluation/index.html';
const OUTCOMES = 'impact/outcomes-2026/index.html';

test.describe('The register mirror (src/data/facts.ts) for the owner decisions of 24 November 2026', () => {
  test('NU-14 to NU-16: campus, next intake and installments, from the owner statement (OWNERNU26); NU-03 is unchanged', () => {
    expect(fact('NU-14').text).toBe('Classes are held at CodersTrust Mirpur Campus');
    expect(fact('NU-15').text).toBe('The application deadline for the next intake is December 10, 2026');
    expect(fact('NU-16').text).toBe('The program fee is payable in installments');
    for (const id of ['NU-14', 'NU-15', 'NU-16']) {
      expect(fact(id).status, id).toBe('V');
      expect(fact(id).group, id).toBe('admissions');
      expect(fact(id).sourceIds, id).toEqual(['OWNERNU26']);
    }
    expect(sources.OWNERNU26.citation).toContain('24 and 26 November 2026'); // WP170: the 26 November answer made December 10 the application deadline
    expect(fact('NU-03').text).toBe('BDT 50,000');
  });

  test('PA-12 (Akij Group) is published, with its permissions row', () => {
    const pa12 = fact('PA-12');
    expect(pa12.status).toBe('V');
    expect(pa12.text).toBe('Corporate training for Akij Group, a conglomerate based in Bangladesh (2021–2024: workplace productivity, advanced Excel, corporate communications)');
    const rowsFile = JSON.parse(readFileSync('src/data/permissions.json', 'utf8')) as { assetId: string; clearanceId: string; status: string }[];
    expect(rowsFile.filter((r) => r.assetId === AKIJ_ASSET)).toEqual([{ assetId: 'client-akij-group', clearanceId: 'OWNER-2026-11-24-AKIJ', status: 'cleared', publishedOnLegacySite: true, sensitiveGroup: false }]);
    expect(AKIJ_STORY).toEqual({ label: 'Read About the 2023 Training', href: `/news/${AKIJ_SLUG}/` });
    expect(AKIJ_STORY.label).toBe(titleCase(AKIJ_STORY.label));
  });

  test('PR-03c is the 97.5% tile, in PR-03’s own words, with no base (PR-03 states none)', () => {
    expect(fact('PR-03').text).toContain('350 enrolled; 97.5% completed the program; 67% of the 350 enrolled');
    const c = fact('PR-03c');
    expect(c.text).toBe('UNDP YES, Korail settlement, Dhaka, 2017: 97.5% completed the program');
    expect(c.stat).toMatchObject({ value: '97.5%', numeric: 97.5, decimals: 1, suffix: '%', label: 'completed the program' });
    expect(c.stat?.detail).toBeUndefined(); // WP169 (owner answer of 2026-11-25): the tile carries no base note
    expect(c.sourceIds).toEqual(fact('PR-03').sourceIds);
    // 97.5% of 350 is not a whole number of people, so the site never puts the 97.5% "of the 350 enrolled"
    expect(Number.isInteger(0.975 * 350)).toBe(false);
  });

  test('OC-05’s glance tile has a short label and a separate note (R4-18); its text and tile label are unchanged', () => {
    const oc05 = fact('OC-05');
    expect(oc05.stat?.glance).toEqual({ label: 'of the 172 surveyed new earners had started earning by six months after finishing the course', note: 'New earners are completers who first earned during or after training; 23.3% first earned during the course.' });
    expect(oc05.stat?.label).toBe('of the 172 surveyed new earners had started earning by six months after finishing the course (October 2026 survey)');
    expect(oc05.text).toContain('surveyed completers who first earned during or after training: 23.3% first earned during the course');
  });

  test('no other fact changed id or status: the new rows are the five above', () => {
    for (const id of ['PA-12', 'PR-03c', 'NU-14', 'NU-15', 'NU-16']) expect(facts[id], id).toBeTruthy();
    expect(facts['NU-17']).toBeUndefined();
  });
});

test.describe('NU Post Graduate Diploma: campus, next intake and installments (owner statement of 24 November 2026)', () => {
  for (const rel of NU_PAGES) {
    test(`${rel}: the hero's key facts are Duration, Program Fee (in installments), Campus and Application Deadline`, () => {
      expect(rows(rel, 'keyfacts')).toEqual([
        ['Duration', '1 Year (2 Semesters).'],
        ['Program Fee', 'BDT 50,000, payable in installments.'],
        ['Campus', 'CodersTrust Mirpur Campus.'],
        ['Application Deadline', 'December 10, 2026.'], // WP170 (owner answer of 2026-11-26): December 10 is the application deadline
      ]);
      const dl = /<dl\b[^>]*class="keyfacts"[\s\S]*?<\/dl>/.exec(html(rel))?.[0] ?? '';
      for (const id of ['NU-02', 'NU-03', 'NU-16', 'NU-14', 'NU-15']) expect(dl, id).toContain(`data-fact="${id}"`);
    });

    test(`${rel}: Before You Apply has Intake, Campus and the fee in installments; no "Admissions confirms" line and no schedule`, () => {
      const r = rows(rel, 'ba');
      expect(r.map(([k]) => k)).toEqual(['Eligibility', 'Duration', rel === NU ? 'Credit Hours and Subjects (Each Course)' : 'Credit Hours and Subjects', 'Intake', 'Delivery', 'Campus', 'Program Fee', 'Payment', 'Recognition', 'How to Apply']);
      const get = (k: string) => r.find(([x]) => x === k)?.[1];
      expect(get('Intake')).toBe('The application deadline for the next intake is December 10, 2026. National University publishes notices for its own intake at its Gazipur campus in Bangla; the fee, eligibility and admission test in those notices apply to that intake, not to admission through CodersTrust: National University PGD Admission Notices and National University PGD Recent Notices.');
      expect(get('Campus')).toBe('Classes are held at CodersTrust Mirpur Campus.');
      expect(get('Program Fee')).toBe('BDT 50,000, payable in installments.');
      expect(get('Payment')).toBe('Pay instantly online; transfer via mobile merchant accounts; visit a CodersTrust Bangladesh (CTBD) campus for cash or POS payments; or make a bank deposit.');
      const t = text(rel);
      for (const gone of ['Admissions confirms', 'Schedule and Intake', 'Teaching Location', 'Confirm Intake, Schedule and Location']) expect(t, gone).not.toContain(gone);
      expect(t).not.toMatch(/class schedule|schedule is|schedule to be/i);
    });

    test(`${rel}: the hero's admissions link goes to Before You Apply; the page is dated ${TODAY}`, () => {
      const hero = /<section\b[^>]*class="[^"]*\bhero\b[\s\S]*?<\/section>/.exec(main(rel))?.[0] ?? '';
      const link = /<a class="link" href="([^"]+)"[^>]*>See All Admissions Details<\/a>/.exec(hero);
      expect(link?.[1]).toBe('#before-you-apply');
      expect(html(rel)).toContain('id="before-you-apply"');
      expect(lastUpdated(rel)).toBe(NU_DAY);
      expect(nodes(rel, 'WebPage')[0]?.dateModified).toBe(NU_DAY);
    });
  }

  // PAGE_UPDATED (src/components/pages/programs/meta.ts) cannot be imported in a spec (it reaches import.meta.env through src/lib/url.ts); its source is read instead.
  // WP175 (owner decision Q5 of 2026-11-28: the crafted C6 statement) moved it to 2026-11-28 (JobReady@Work)
  test('PAGE_UPDATED: the NU overview and the NU course pages are dated 2026-11-26, JobReady@Work 2026-11-28', () => {
    const meta = readFileSync('src/components/pages/programs/meta.ts', 'utf8');
    for (const key of ['work']) expect(new RegExp(`\\n  ${key}: '2026-11-28',`).test(meta), key).toBe(true);
    for (const key of ['nu', 'nuCourse']) expect(new RegExp(`\\n  ${key}: '${NU_DAY}',`).test(meta), key).toBe(true); // WP170
  });

  test('the overview answers the next intake, where classes are held and the installments in place (visible FAQ and FAQPage JSON-LD)', () => {
    const want = [
      ['When Is the Next Intake?', 'The application deadline for the next intake is December 10, 2026.', 'NU-15'],
      ['Where Are Classes Held?', 'Classes are held at CodersTrust Mirpur Campus; online delivery is not available.', 'NU-14 NU-10'],
      ['Can I Pay the Program Fee in Installments?', 'Yes. The program fee is BDT 50,000, payable in installments. Pay instantly online; transfer via mobile merchant accounts; visit a CodersTrust Bangladesh (CTBD) campus for cash or POS payments; or make a bank deposit.', 'NU-03 NU-16 NU-05'],
    ];
    const faq = nodes(NU, 'FAQPage')[0];
    const qs = (faq.mainEntity as Node[]).map((q) => [q.name, (q.acceptedAnswer as Node).text]);
    expect(qs.map(([q]) => q)).toEqual(['Is the NU Post Graduate Diploma Right for Me?', ...want.map(([q]) => q)]);
    for (const [q, a, ev] of want) {
      expect(qs.find(([x]) => x === q)?.[1], q).toBe(a);
      expect(q, q).toBe(titleCase(q));
      expect(html(NU), q).toContain(`<p data-fact="${ev}">${a.replace(/&/g, '&amp;')}</p>`);
    }
    // the course pages keep their own two questions (the diploma-wide answers are on the overview; the hero and Before You Apply state the facts on every course page)
    for (const rel of NU_COURSES) expect((nodes(rel, 'FAQPage')[0].mainEntity as Node[]).map((q) => q.name), rel).toEqual(['What Will I Be Able to Do After This Course?', 'Is This the Right Course for Me?']);
  });

  test('the NU facts render only on the NU pages, and no page states a class schedule', () => {
    const pages = sitePages();
    for (const id of ['NU-14', 'NU-15', 'NU-16']) {
      const on = pages.filter((p) => new RegExp(`data-fact="[^"]*\\b${id}\\b`).test(html(p))).sort();
      expect(on, id).toEqual([...NU_PAGES].sort());
    }
    expect(pages.filter((p) => /December 10, 2026/.test(visible(main(p)))).sort()).toEqual([...NU_PAGES].sort());
  });

  test('the overview hero shows the four key facts on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'programs/nu-postgraduate-diploma/');
    const keyfacts = page.locator('.hero .keyfacts');
    await expect(keyfacts.locator('dt')).toHaveText(['Duration', 'Program Fee', 'Campus', 'Application Deadline']);
    await expect(keyfacts.locator('dd').nth(1)).toHaveText('BDT 50,000, payable in installments', { useInnerText: true }); // the key facts hide <Fact>'s full stop
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('Akij Group, a named client (owner permission of 24 November 2026)', () => {
  const LINE = 'Corporate training for Akij Group, a conglomerate based in Bangladesh (2021–2024: workplace productivity, advanced Excel, corporate communications). Read About the 2023 Training';
  test('Employers: the first track-record item, with its link and permissions marker; the other items follow unchanged', () => {
    const list = items(EMPLOYERS, 'pg__list');
    expect(list.map(([tag]) => attr(tag, 'data-fact'))).toEqual(['PA-12', 'PA-06', 'GV-06', 'SC-11d']);
    expect(list[0][1]).toBe(LINE);
    expect(attr(list[0][0], 'data-asset')).toBe('client-akij-group');
    expect(list[1][1]).toBe('AWS Authorized Training Partner.');
    const guide = /<section\b[^>]*id="guide"[\s\S]*?<\/section>/.exec(html(EMPLOYERS))?.[0] ?? '';
    expect(guide).toMatch(new RegExp(`<a class="link" href="${BASE}news/${AKIJ_SLUG}/"[^>]*>Read About the 2023 Training`));
    expect(modified(EMPLOYERS)).toEqual(['2026-11-28']); // WP175 (owner decision Q5 of 2026-11-28: the crafted C6 statement) moved it to 2026-11-28
  });

  test('JobReady@Work: the first credential, with the same link and marker; dated 2026-11-24', () => {
    const list = items(WORK, 'guide-list');
    expect(list.map(([tag]) => attr(tag, 'data-fact'))).toEqual(['PA-12', 'PA-06', 'GV-06']);
    expect(list[0][1]).toBe(LINE);
    expect(attr(list[0][0], 'data-asset')).toBe('client-akij-group');
    expect(html(WORK)).toMatch(new RegExp(`<a class="link" href="${BASE}news/${AKIJ_SLUG}/"[^>]*>Read About the 2023 Training`));
    expect(lastUpdated(WORK)).toBe('2026-11-28'); // WP175 (owner decision Q5 of 2026-11-28: the crafted C6 statement) moved it to 2026-11-28
    expect(nodes(WORK, 'WebPage')[0]?.dateModified).toBe('2026-11-28');
  });

  test('PA-12 renders on Employers and JobReady@Work only', () => {
    expect(sitePages().filter((p) => /data-fact="[^"]*\bPA-12\b/.test(html(p))).sort()).toEqual([EMPLOYERS, WORK].sort());
  });

  test('the 2023 post: the deck that restated the H1 is cut (R6-33); H1, dateline and body are unchanged; dated 2026-11-24', () => {
    const t = text(AKIJ);
    expect(visible(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html(AKIJ))?.[1] ?? '')).toBe('CodersTrust Provides Corporate Training to Akij Group');
    expect(t).not.toContain('Akij Group Receives Training on Modern Corporate Skills, Digital Marketing and Soft Skills');
    expect(t).toContain('Dhaka, Bangladesh');
    expect(t).toMatch(/CodersTrust has conducted a corporate training on digital marketing and soft skills for Akij Group of Companies( \(opens [^)]+\))?, a conglomerate based in Bangladesh\./);
    expect(t).toContain('social media marketing, search engine optimization (SEO), content marketing, email marketing and digital marketing analytics');
    const src = readFileSync(`src/content/news/${AKIJ_SLUG}.md`, 'utf8');
    expect(src).toContain('updated: 2026-11-24');
    expect(src).not.toMatch(/^## /m);
    expect(modified(AKIJ)).toEqual([TODAY]);
  });
});

test.describe('Impact pages: R4-30, R4-18 and R4-09 (owner approval of 24 November 2026)', () => {
  test('UNDP YES, Korail: the hero shows 67% and 97.5% side by side, each a program record; the 97.5% says its base is not stated', () => {
    const tiles = [...main(KORAIL).matchAll(/<div class="cs__stat"[\s\S]*?<\/div>\s*<\/div>/g)].map((m) => m[0]);
    expect(tiles).toHaveLength(2);
    const read = (t: string) => ({
      fact: /data-fact="([^"]+)"/.exec(t)?.[1],
      evidence: /data-evidence="([^"]+)"/.exec(t)?.[1],
      value: visible(/<p class="stat__value"[\s\S]*?<\/p>/.exec(t)?.[0] ?? ''),
      label: visible(/<p class="stat__label"[\s\S]*?<\/p>/.exec(t)?.[0] ?? ''),
      note: visible(/<p class="stat__note"[\s\S]*?<\/p>/.exec(t)?.[0] ?? ''),
    });
    expect(tiles.map(read)).toEqual([
      { fact: 'PR-03', evidence: 'Program Record', value: '67%', label: 'of the 350 enrolled found their first job within three months', note: '' },
      { fact: 'PR-03c', evidence: 'Program Record', value: '97.5%', label: 'completed the program', note: '' }, // WP169 (owner answer of 2026-11-25): no base note
    ]);
    expect(sitePages().filter((p) => /97\.5% of the 350/.test(visible(html(p))))).toEqual([]);
    expect(CASE_STUDIES.find((c) => c.slug === 'undp-yes-korail')?.dateModified).toBe('2026-11-25'); // WP169
    expect(modified(KORAIL)).toEqual(['2026-11-25']); // WP169: the base note came off the tile on 2026-11-25
  });

  test('Impact hub: the 58.7% tile reads the register’s short label and its note, as its neighbors do', () => {
    const tile = /<a class="glance__tile"[^>]*data-fact="OC-05"[\s\S]*?<\/a>/.exec(html(IMPACT))?.[0] ?? '';
    expect(visible(/<span class="glance__value"[^>]*>([\s\S]*?)<\/span>\s*<span class="glance__desc"/.exec(tile)?.[1] ?? '')).toBe('58.7%');
    expect(visible(/<span class="glance__desc"[^>]*>[\s\S]*?<\/span>/.exec(tile)?.[0] ?? '')).toBe('of the 172 surveyed new earners had started earning by six months after finishing the course');
    expect(visible(/<span class="glance__note"[^>]*>[\s\S]*?<\/span>/.exec(tile)?.[0] ?? '')).toBe('New earners are completers who first earned during or after training; 23.3% first earned during the course.');
    // the neighbors in the survey group render label and note the same way
    for (const id of ['OC-03', 'OC-01', 'OC-04']) {
      const t = new RegExp(`<a class="glance__tile"[^>]*data-fact="${id}"[\\s\\S]*?</a>`).exec(html(IMPACT))?.[0] ?? '';
      expect(visible(/<span class="glance__desc"[^>]*>[\s\S]*?<\/span>/.exec(t)?.[0] ?? ''), id).toBe(fact(id).stat!.glance!.label);
      expect(visible(/<span class="glance__note"[^>]*>[\s\S]*?<\/span>/.exec(t)?.[0] ?? ''), id).toBe(fact(id).stat!.glance!.note);
    }
    expect(text(IMPACT)).not.toContain('(completers who first earned during or after training)');
    expect(modified(IMPACT)).toEqual(['2026-11-27']); // WP172 (owner decision 2026-11-27: the published study's trial figures) moved it to 2026-11-27
  });

  test('Trial page: the journal band is headed with the article’s estimate; the On This Page entry is the heading; the body and the RC-16 rule are unchanged', () => {
    const HEADING = 'Peer-Reviewed: The Article Estimates a Benefit/Cost Ratio of 3.01';
    expect(HEADING).toBe(titleCase(HEADING));
    const raw = html(TRIAL);
    expect(visible(/<h2[^>]*id="journal-h"[^>]*>([\s\S]*?)<\/h2>/.exec(raw)?.[1] ?? '')).toBe(HEADING);
    expect(visible(/<a[^>]*href="#journal"[^>]*>([\s\S]*?)<\/a>/.exec(raw)?.[1] ?? '')).toBe(HEADING);
    expect(raw).not.toContain('Published in a Peer-Reviewed Journal');
    const band = /<section\b[^>]*id="journal"[\s\S]*?<\/section>/.exec(raw)?.[0] ?? '';
    expect(visible(/<p data-fact="RC-16"[^>]*>[\s\S]*?<\/p>/.exec(band)?.[0] ?? '')).toBe('The journal article estimates a benefit/cost ratio of 3.01 for CodersTrust’s 200-hour WSDFM program.');
    expect(band).toContain('data-fact="RC-15"');
    // RC-16: the ratio is on the Trial page only
    expect(sitePages().filter((p) => /\b3\.01\b/.test(visible(main(p))))).toEqual([TRIAL]);
    expect(lastUpdated(TRIAL)).toBe('2026-11-27'); // WP172 (owner decision 2026-11-27: the published study's trial figures) moved it to 2026-11-27
    expect(modified(TRIAL)).toEqual(['2026-11-27']);
  });

  // R4-21 was not applied in WP168-B ("within six months" is retired by WP48 item 32). WP170 (owner answer of 2026-11-26): the heading is "Most Surveyed New Earners Started Earning in Six Months or Less" ("or Less", not "within").
  test('Outcomes 2026: the speed heading is "Most Surveyed New Earners Started Earning in Six Months or Less" and the page is dated 2026-11-26 (R4-21, WP170)', () => {
    const raw = html(OUTCOMES);
    expect(visible(/<h2[^>]*id="speed-h"[^>]*>([\s\S]*?)<\/h2>/.exec(raw)?.[1] ?? '')).toBe('Most Surveyed New Earners Started Earning in Six Months or Less');
    expect(visible(raw)).not.toMatch(/within six months/i);
    expect(visible(raw)).not.toContain('How Fast Earnings Started');
    expect(lastUpdated(OUTCOMES) ?? /Last updated <time datetime="([^"]+)"/.exec(raw)?.[1]).toBe('2026-11-26');
  });
});
