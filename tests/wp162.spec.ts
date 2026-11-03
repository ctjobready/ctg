import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact, facts, sources } from '../src/data/facts';
import { locations } from '../src/data/countries';
import { CASE_STUDIES } from '../src/components/pages/impact/case-studies';
import { DIST_DIR } from './support/env';
import { open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP162: the site follows the facts register's "Deck sync 2026-11-03" (ctg-planning de5fe8c) and the owner answers of 2–3 November 2026.
 * Run `npm run build`, then `PORT=4911 npx playwright test tests/wp162.spec.ts --project=chromium`. Most tests read the built files; one opens the Albania case study.
 *   SC-10  "mapped to 40+ digital roles across eight domains" (no "high-demand"); no built file says "high-demand digital roles".
 *   TL-05  CodersTrust took part in Digital Jobs Albania in 2021 only: the register's sentence and tile date, and the "Albania, 2021." tile on Home and About.
 *   Albania years  2021 wherever CodersTrust's part is stated (Global Reach, case-study cards, the case study's eyebrow and meta description); no "2021–2022" beside Albania anywhere.
 *   PR-07/PR-08  The World Bank's May 2022 whole-program figures (500+ enrolled, 5,000+ interested) are out of the register and off every page; the case study's Results band says why
 *          and keeps the World Bank links; the hub card has no figure, and the hub lead and description stay true.
 *   PA-09  The Kosovo item is a World Bank feature story, not a blog.
 *   PX-11  The source is Alam and Mamun, PLOS ONE (2022); "Hossain et al." is gone from src and dist.  PX-14 stays undated.  PD-13 adds no visible claim (no page calls the policies drafts).
 *   Dates  Every page whose visible text changed is dated 2026-11-03 (owner rule: any visible text change moves the date).
 */

const TODAY = '2026-11-03';
const ROOT = process.cwd();

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/\\u0026/g, '&').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;| /g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
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
/** Everything a reader, a search engine or an assistant can read on a page: the visible text, then every text attribute (meta descriptions, alt, aria-label, title) and the JSON-LD. */
const everything = (raw: string) =>
  [
    visible(raw),
    ...[...raw.matchAll(/\b(?:content|alt|aria-label|title)="([^"]*)"/g)].map((m) => decode(m[1])),
    ...[...raw.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => decode(m[1])),
  ].join('\n');
const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
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
const metaDescription = (rel: string) => decode(/<meta name="description" content="([^"]*)"/.exec(html(rel))?.[1] ?? '');
/** Every built text file (pages, stubs excepted, plus llms.txt, the sitemaps and the data files). */
const builtTexts = (): { rel: string; text: string }[] => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== '_astro') walk(full, out);
      } else if (/\.(html|txt|xml|json|csv)$/.test(name)) out.push(full);
    }
    return out;
  };
  return walk(DIST_DIR)
    .map((f) => ({ rel: relative(DIST_DIR, f), raw: readFileSync(f, 'utf8') }))
    .filter((f) => !/data-redirect-stub/.test(f.raw))
    .map((f) => ({ rel: f.rel, text: f.rel.endsWith('.html') ? everything(f.raw) : decode(f.raw) }));
};
/** Every source file under src/ (code, data, content). */
const srcFiles = (): { rel: string; text: string }[] => {
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|astro|mjs|js|md|mdx|json|css)$/.test(name)) out.push(full);
    }
    return out;
  };
  return walk(join(ROOT, 'src')).map((f) => ({ rel: relative(ROOT, f), text: readFileSync(f, 'utf8') }));
};

const HOME = 'index.html';
const ABOUT = 'about/index.html';
const IMPACT = 'impact/index.html';
const HUB = 'impact/case-studies/index.html';
const ALBANIA = 'impact/case-studies/digital-jobs-albania/index.html';
const REACH = 'impact/global-reach/index.html';
const GOVERNANCE = 'about/governance/index.html';

/* ---------------------------------------------------------------------------------------------- */
test.describe('SC-10: 40+ digital roles, without "high-demand"', () => {
  test('the register reads "… mapped to 40+ digital roles across eight domains"; the tile label is unchanged', () => {
    expect(fact('SC-10').text).toBe('500+ industry certifications, digital-skills courses, university postgraduate programs and CPD courses mapped to 40+ digital roles across eight domains');
    expect(fact('SC-10').stat?.label).toBe('certifications and courses mapped to 40+ digital roles');
  });
  test('no built file says "high-demand digital roles" (the news posts’ "high-demand IT skills" and GV-03 are other wording)', () => {
    expect(builtTexts().filter((f) => /high-demand digital roles/i.test(f.text)).map((f) => f.rel)).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('TL-05 and the Albania years: CodersTrust took part in Digital Jobs Albania in 2021 only', () => {
  test('TL-05 reads "In 2021, CodersTrust took part in Digital Jobs Albania, …"; its tile date is 2021 and its label is unchanged', () => {
    const tl05 = fact('TL-05');
    expect(tl05.text).toBe(
      'In 2021, CodersTrust took part in Digital Jobs Albania, a World Bank initiative with the Government of Albania and EuroPartners Development that gave women aged 16 to 35 an online three-month course in digital skills',
    );
    expect(tl05.stat?.value).toBe('2021');
    expect(tl05.stat?.label).toBe('A World Bank initiative, delivered online');
    expect(tl05.sourceIds).toEqual(['WBDJA21']);
  });
  for (const rel of [HOME, ABOUT]) {
    test(`${rel}: the "CodersTrust Around the World" tile reads "Albania, 2021. A World Bank initiative, delivered online."`, () => {
      const tile = /<li\b[^>]*data-tile="albania"[\s\S]*?<\/li>/.exec(html(rel))?.[0] ?? '';
      expect(visible(/<figcaption[\s\S]*?<\/figcaption>/.exec(tile)?.[0] ?? '')).toBe('Albania, 2021. A World Bank initiative, delivered online.');
    });
  }
  test('Global Reach: the Albania row and card say 2021', () => {
    expect(locations.find((l) => l.id === 'albania')?.years).toBe('2021');
    const raw = html(REACH);
    const row = /<tr\b[^>]*>(?:(?!<\/tr>)[\s\S])*?Albania[\s\S]*?<\/tr>/.exec(raw)?.[0] ?? '';
    expect(visible(/<td data-label="Years"[^>]*>[\s\S]*?<\/td>/.exec(row)?.[0] ?? '')).toBe('2021');
    expect(visible(/<p class="wmap__country"[^>]*>Albania <span[^>]*>[^<]*<\/span><\/p>/.exec(raw)?.[0] ?? '')).toBe('Albania 2021');
  });
  test('the case-study data: program "World Bank, 2021" and place "…; Albania, 2021"', () => {
    const dja = CASE_STUDIES.find((c) => c.slug === 'digital-jobs-albania')!;
    expect(dja.program).toBe('World Bank, 2021');
    expect(dja.place).toBe('World Bank, with the Government of Albania and EuroPartners Development; Albania, 2021');
  });
  test('no built file puts "2021–2022" (or 2021-2022, 2021 to 2022) beside Albania, in text, attributes or JSON-LD', () => {
    const offenders: string[] = [];
    for (const f of builtTexts()) {
      for (const m of f.text.matchAll(/Albania/g)) {
        const near = f.text.slice(Math.max(0, m.index! - 160), m.index! + 160);
        if (/2021\s*[–-]\s*(?:20)?22|2021 to 2022/.test(near)) offenders.push(`${f.rel}: …${near.replace(/\s+/g, ' ')}…`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('PR-07 and PR-08: the World Bank’s whole-program figures for Albania are off the site', () => {
  test('neither fact is in the register’s public dataset, and the May 2022 source no longer quotes them', () => {
    expect(facts['PR-07']).toBeUndefined();
    expect(facts['PR-08']).toBeUndefined();
    expect(() => fact('PR-07')).toThrow();
    expect(() => fact('PR-08')).toThrow();
    expect(sources.WBBLOG22.citation).not.toMatch(/\b5,000\b|\b500\b|enrolled|interest/);
    expect(sources.WBBLOG22.url).toMatch(/^https:\/\/web\.archive\.org\//);
    for (const f of Object.values(facts)) expect(`${f.text} ${f.stat?.label ?? ''}`, f.id).not.toMatch(/Digital Jobs Albania, 2021–2022/);
  });
  test('no source file uses PR-07 or PR-08 as an id (comments may name them)', () => {
    const offenders = srcFiles().filter((f) => /['"`]PR-0[78]['"`]|data-fact="[^"]*PR-0[78]/.test(f.text)).map((f) => f.rel);
    expect(offenders).toEqual([]);
  });
  test('no built page marks or states the figures: no data-fact PR-07/PR-08, no "Reported Enrollment", no 500+ students or 5,000+ women', () => {
    const offenders: string[] = [];
    for (const p of listPages()) {
      const raw = readFileSync(p.file, 'utf8');
      if (/data-fact="[^"]*\bPR-0[78]\b/.test(raw)) offenders.push(`${p.route}: data-fact PR-07/PR-08`);
      const text = everything(raw);
      for (const re of [/Reported Enrollment/i, /(?<![\d,])500\+? students/i, /more than 500 students/i, /5,000\+? women/i, /students enrolled, reported by the World Bank/i, /expressed interest/i]) {
        if (re.test(text)) offenders.push(`${p.route}: ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });
  test('llms.txt carries neither figure', () => {
    const llms = readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8');
    expect(llms).not.toMatch(/5,000\+|500\+ students|enrolled/);
  });
});

test.describe('The Digital Jobs Albania case study', () => {
  const SENTENCE = 'The World Bank’s published figures cover the whole program, including the months after CodersTrust’s part ended in 2021, so they are not shown here as CodersTrust results.';
  test('the Results band states why no figure is shown, keeps the two World Bank links and shows no figure', () => {
    const results = byId(ALBANIA, 'section', 'results');
    const text = visible(results);
    expect(text).toBe(`Results What Happened ${SENTENCE} Read the World Bank Announcement Read the World Bank’s May 2022 Update`);
    expect(results).not.toMatch(/data-fact=/);
    expect(results).toContain(`href="${sources.WBDJA21.url}"`);
    expect(results).toContain(`href="${sources.WBBLOG22.url}"`);
    // both open off the site with rel="noopener" (worldbank.org is a partner domain, so lib/url keeps the referrer for it; the archive copy also gets noreferrer)
    const external = [...results.matchAll(/<a\b[^>]*href="https:[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(external).toHaveLength(2);
    for (const a of external) expect(a).toMatch(/rel="noopener(?: noreferrer)?"/);
  });
  test('the hero shows no stat tile; its eyebrow says 2021; the context says CodersTrust took part in 2021; no year beyond 2021 describes CodersTrust’s part', () => {
    const main = mainRaw(ALBANIA);
    expect(main).not.toContain('class="cs__stat"');
    expect(visible(/<p class="hero__eyebrow"[^>]*>[\s\S]*?<\/p>/.exec(main)?.[0] ?? '')).toBe('Case Study · World Bank, 2021');
    expect(visible(main)).toContain(
      'The initiative was implemented with the Government of Albania, CodersTrust and EuroPartners Development, a local consulting company. CodersTrust took part in 2021.',
    );
    // the only 2022 on the page is in the May 2022 update's link text
    const text = visible(main);
    expect(text.split('2022').length - 1).toBe(1);
    expect(text).toContain('Read the World Bank’s May 2022 Update');
  });
  test('the meta description and the Article description say CodersTrust took part in 2021', () => {
    const d = 'Digital Jobs Albania, a World Bank initiative: an online three-month course in digital skills for women in Albania. CodersTrust took part in 2021.';
    expect(metaDescription(ALBANIA)).toBe(d);
    expect(nodeOf(ALBANIA, 'Article').description).toBe(d);
  });
  test('"Jump to the Results" lands on the Results section, and the World Bank links point at the register’s sources', async ({ page }) => {
    await open(page, 'impact/case-studies/digital-jobs-albania/');
    const jump = page.getByRole('link', { name: 'Jump to the Results' });
    await expect(jump).toHaveAttribute('href', '#results');
    await jump.click();
    await expect(page).toHaveURL(/#results$/);
    await expect(page.locator('#results-h')).toBeInViewport();
    await expect(page.locator('#results')).toContainText(SENTENCE);
    await expect(page.getByRole('link', { name: /Read the World Bank Announcement/ })).toHaveAttribute('href', sources.WBDJA21.url!);
    await expect(page.getByRole('link', { name: /Read the World Bank’s May 2022 Update/ })).toHaveAttribute('href', sources.WBBLOG22.url!);
  });
});

test.describe('The case-study hub and the Impact page', () => {
  const cards = (rel: string) => [...html(rel).matchAll(/<article class="card card--link case"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  test('hub: the Albania card has no figure block; the other four each have a "Result" with a figure', () => {
    const all = cards(HUB);
    expect(all).toHaveLength(5);
    const albania = all.find((c) => c.includes('Digital Jobs Albania'))!;
    expect(albania).not.toContain('case__result');
    expect(albania).not.toContain('case__value');
    expect(visible(albania)).toBe('Digital Jobs Albania Partner and Place World Bank, with the Government of Albania and EuroPartners Development; Albania, 2021 Read the Case Study');
    for (const c of all.filter((x) => x !== albania)) {
      expect(visible(/<div class="case__result"[\s\S]*?<dt[^>]*>([\s\S]*?)<\/dt>/.exec(c)?.[1] ?? '')).toBe('Result');
      expect(visible(/<span class="case__value"[^>]*>[\s\S]*?<\/span>/.exec(c)?.[0] ?? '')).not.toBe('');
    }
    expect(/<div class="grid-cards[^"]*" data-fact="([^"]*)"/.exec(html(HUB))?.[1]).toBe('PR-02 PR-01 PR-03 PR-05 PR-02b');
  });
  test('hub: the lead and the description say "with the figures and bases where they exist" (not "each with its figure and its base")', () => {
    expect(visible(/<p class="hero__lead"[^>]*>[\s\S]*?<\/p>/.exec(mainRaw(HUB))?.[0] ?? '')).toBe('Five programs, with the figures and bases where they exist.');
    const d = 'Five CodersTrust case studies, with the figures and bases where they exist: Women in Online Work, Digital Jobs Albania, WSDFM, UNDP YES and Her Power.';
    expect(metaDescription(HUB)).toBe(d);
    expect(readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8')).toContain(`(https://coderstrust.global/impact/case-studies/): ${d}`);
    for (const rel of [HUB, 'llms.txt']) expect(readFileSync(join(DIST_DIR, rel), 'utf8')).not.toContain('each with its figure and its base');
  });
  test('Impact: the Albania card reads "…; Albania, 2021" and its scope line no longer quotes the World Bank’s enrollment', () => {
    const card = /<article class="card card--link"[^>]*>(?:(?!<\/article>)[\s\S])*?Digital Jobs Albania[\s\S]*?<\/article>/.exec(byId(IMPACT, 'section', 'cases'))?.[0] ?? '';
    expect(visible(card)).toBe(
      'World Bank, with the Government of Albania and EuroPartners Development; Albania, 2021 Digital Jobs Albania Three-month online training in graphic design, web development and digital marketing, with mentoring. Read the Case Study',
    );
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('PA-09, PX-11, PX-14, PD-13 and SC-13', () => {
  test('PA-09 calls the Kosovo item a World Bank feature story, not a blog', () => {
    const t = fact('PA-09').text;
    expect(t).toContain('World Bank feature story on Kosovo’s women in online work (2016)');
    expect(t).not.toMatch(/blog/i);
  });
  test('PX-11 cites Alam and Mamun, PLOS ONE (2022), as the article page shows it; the old source is gone', () => {
    expect(fact('PX-11').sourceIds).toEqual(['BBSCENSUS22', 'ALAMMAMUN22', 'IDMC25']);
    const s = sources.ALAMMAMUN22;
    expect(s.label).toBe('Alam and Mamun, PLOS ONE (2022)');
    expect(s.citation).toBe('Alam, M. Z. and Mamun, A. A. (2022), “Dynamics of internal migration in Bangladesh: Trends, patterns, determinants, and causes”, PLOS ONE 17(2): e0263878. doi:10.1371/journal.pone.0263878.');
    expect(s.url).toBe('https://doi.org/10.1371/journal.pone.0263878');
    expect(sources.HOSSAIN22).toBeUndefined();
    for (const f of Object.values(facts)) expect(f.sourceIds ?? [], f.id).not.toContain('HOSSAIN22');
  });
  test('no source file and no built file says "Hossain et al"', () => {
    expect(srcFiles().filter((f) => /Hossain et al/i.test(f.text)).map((f) => f.rel)).toEqual([]);
    expect(builtTexts().filter((f) => /Hossain et al/i.test(f.text)).map((f) => f.rel)).toEqual([]);
  });
  test('PX-14 keeps the 10,000 official estimate undated', () => {
    expect(fact('PX-14').text).toBe('Population estimates vary: the official estimate is 10,000; other published estimates cited in CodersTrust’s Impact Report range from 200,000 to 1.5 million');
    expect(fact('PX-14').text).not.toMatch(/\b(?:19|20)\d\d\b/);
  });
  test('PD-13: no built page calls the due-diligence policies drafts, and Governance makes no new claim about them', () => {
    expect(visible(mainRaw(GOVERNANCE))).not.toMatch(/\bdraft/i);
    expect(listPages().filter((p) => /polic(?:y|ies)[^.]{0,80}\bdraft|\bdraft[^.]{0,80}polic(?:y|ies)/i.test(visible(readFileSync(p.file, 'utf8')))).map((p) => p.route)).toEqual([]);
  });
  test('SC-13 stays unrendered: no register entry, and no built page prints the $4M+ investment', () => {
    expect(facts['SC-13']).toBeUndefined();
    expect(builtTexts().filter((f) => /\$4M\+|\$4 million|\$5M\+/i.test(f.text)).map((f) => f.rel)).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe(`Dates: every page whose visible text changed in WP162 is dated ${TODAY}`, () => {
  for (const [rel, type] of [
    [ALBANIA, 'Article'],
    [HUB, 'Article'],
    [IMPACT, 'Article'],
    [REACH, 'Article'],
    [ABOUT, 'AboutPage'],
  ] as const) {
    test(`${rel}: ${type}.dateModified is ${TODAY}`, () => {
      expect(nodeOf(rel, type).dateModified).toBe(TODAY);
    });
  }
  test('the Albania case study keeps datePublished 2026-10-08 and declares its own dateModified in the case-study data', () => {
    expect(nodeOf(ALBANIA, 'Article').datePublished).toBe('2026-10-08');
    expect(CASE_STUDIES.find((c) => c.slug === 'digital-jobs-albania')?.dateModified).toBe(TODAY);
  });
  test(`Home pins no date of its own: its WebPage.dateModified is the build date, ${TODAY} or later`, () => {
    expect(String(nodeOf(HOME, 'WebPage').dateModified) >= TODAY).toBe(true);
  });
});
