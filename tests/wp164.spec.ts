import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact, facts, sources } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { locations } from '../src/data/countries';
import { CASE_STUDIES } from '../src/components/pages/impact/case-studies';
import { evidenceOf } from '../src/components/pages/impact/evidence';
import { DIST_DIR } from './support/env';
import { open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP164 (owner decision of 3 November 2026; partly reverses WP162): Digital Jobs Albania was begun by CodersTrust in 2021 and, after the December 2021 split of the CodersTrust group
 * (PRWeb, 15 December 2021), completed by Learnio, the former CodersTrust Global, in 2022 (EuroPartners Development's project page: 06.2021 to 12.2022, lead partner Learnio). The program's results are
 * the implementing partner's, for the whole program (500 trained, 270+ certified, 100+ found a freelancing job or project before the training ended), and are shown as partner-reported, never as
 * CodersTrust program records. The World Bank's May 2022 interim figures (PR-07, PR-08) stay off the site.
 * Run `npm run build`, then `PORT=4915 npx playwright test tests/wp164.spec.ts --project=chromium`. Most tests read the built files; two open the Albania case study and the hub.
 *   Register    TL-05's new sentence and tile date 2021–2022; PR-09 (text, stat, source EPDJA, no evidence pill); sources EPDJA and PRWEB21.
 *   Years       2021–2022 on the Home and About tile, Global Reach (table and card), the case-study cards (hub and Impact) and the case study's eyebrow and meta description.
 *   Case study  the context sentence, the hero's PR-09 tile, the Results band's two figures and the "not CodersTrust program records" sentence, the EuroPartners link, the kept World Bank links.
 *   Cards       the hub card shows PR-09 as its "Result" with no "Delivered" tag and no "Program Record" pill; the other four keep both; the hub lead and description are restored.
 *   Unchanged   no World Bank 500+/5,000+ figure, no money amount for Albania, FAQ Q1's answer as it was.
 *   Dates       every page whose visible text changed is dated 2026-11-03.
 */

const TODAY = '2026-11-03';
const RANGE = '2021–2022';

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
/** Everything a reader, a search engine or an assistant can read on a page: the visible text, then every text attribute and the JSON-LD. */
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

const HOME = 'index.html';
const ABOUT = 'about/index.html';
const IMPACT = 'impact/index.html';
const HUB = 'impact/case-studies/index.html';
const ALBANIA = 'impact/case-studies/digital-jobs-albania/index.html';
const REACH = 'impact/global-reach/index.html';

const TL05 =
  'In 2021, CodersTrust began Digital Jobs Albania, a World Bank initiative with the Government of Albania and EuroPartners Development that gave women aged 16 to 35 an online three-month course in digital skills; after the December 2021 split of the CodersTrust group, CodersTrust Global continued as Learnio and completed the program in 2022';
const PR09 =
  'Digital Jobs Albania, 2021–2022: of 500 women trained, 270+ were certified and 100+ found a freelancing job or project before the training ended, as reported by EuroPartners Development, the implementing partner';
const PR09_LABEL = 'found a freelancing job or project before the training ended (of 500 trained; partner-reported)';
const CONTEXT =
  'The initiative was implemented with the Government of Albania, CodersTrust and EuroPartners Development, a local consulting company. CodersTrust began delivery in 2021; after the December 2021 split of the CodersTrust group, CodersTrust Global continued as Learnio and completed the program in 2022.';
const NOT_RECORDS = 'EuroPartners Development, the implementing partner, reports these figures for the whole program; they are not CodersTrust program records.';
// The spec's meta description ("Digital Jobs Albania, a World Bank initiative: …", 173 characters) is longer than the 155 the case-study template allows (desc() in page-utils.ts throws),
// so the page leaves out the leading program name, which the page title already gives; every other word is the approved one.
const META = 'A World Bank initiative: an online three-month course in digital skills for women in Albania, 2021–2022, begun by CodersTrust and completed by Learnio.';

/* ---------------------------------------------------------------------------------------------- */
test.describe('The register: TL-05, PR-09 and the two new sources', () => {
  test('TL-05 says CodersTrust began the program in 2021 and Learnio, the former CodersTrust Global, completed it in 2022; its tile date is 2021–2022 and its label is unchanged', () => {
    const tl05 = fact('TL-05');
    expect(tl05.text).toBe(TL05);
    expect(tl05.stat?.value).toBe(RANGE);
    expect(tl05.stat?.label).toBe('A World Bank initiative, delivered online');
    expect(tl05.sourceIds).toEqual(['WBDJA21', 'PRWEB21', 'EPDJA']);
    expect(tl05.status).toBe('V');
  });
  test('PR-09 holds the partner-reported results: its text, its 100+ stat and its label, cited to the EuroPartners project page', () => {
    const pr09 = fact('PR-09');
    expect(pr09.text).toBe(PR09);
    expect(pr09.group).toBe('programs');
    expect(pr09.status).toBe('V');
    expect(pr09.stat).toEqual({ value: '100+', numeric: 100, decimals: 0, suffix: '+', label: PR09_LABEL });
    expect(pr09.sourceIds).toEqual(['EPDJA']);
  });
  test('PR-09 takes no evidence pill (it is not a CodersTrust program record); the four program-record results keep "Program Record"', () => {
    expect(evidenceOf('PR-09')).toBeUndefined();
    for (const id of ['PR-01', 'PR-02', 'PR-03', 'PR-05']) expect(evidenceOf(id), id).toBe('Program Record');
  });
  test('the sources EPDJA (the EuroPartners project page) and PRWEB21 (the release on the split) are registered with the approved wording', () => {
    expect(sources.EPDJA).toEqual({
      id: 'EPDJA',
      label: 'EuroPartners Development, Digital Jobs Albania project page',
      citation:
        'EuroPartners Development, “Digital Jobs Albania” (project page, read 3 November 2026): starting date 06.2021, ending date 12.2022; 500 students trained, 270+ certified, 100+ found a freelancing job or project before the training program ended; lead partner Learnio (Denmark).',
      url: 'https://europartners.al/node/193',
    });
    expect(sources.PRWEB21.label).toBe('PRWeb, 15 December 2021');
    expect(sources.PRWEB21.citation).toBe('PRWeb, “CodersTrust Group Divides into Two Companies, CodersTrust and Learnio”, 15 December 2021: “With rebranding Coderstrust Global to Learnio”.');
    expect(sources.PRWEB21.url).toBe('https://www.prweb.com/releases/coderstrust-group-divides-into-two-companies-coderstrust-and-learnio-812486578.html');
  });
  test('the World Bank’s May 2022 interim figures stay out of the register (PR-07, PR-08) and no register entry quotes them', () => {
    expect(facts['PR-07']).toBeUndefined();
    expect(facts['PR-08']).toBeUndefined();
    const albania = Object.values(facts).filter((f) => /Albania/.test(`${f.text} ${f.stat?.label ?? ''}`));
    expect(albania.map((f) => f.id).sort()).toEqual(['PA-13', 'PR-09', 'TL-05']);
    for (const f of albania) expect(`${f.text} ${f.stat?.label ?? ''}`, f.id).not.toMatch(/5,000\+?|500\+|enrolled|interest/);
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('The years are 2021–2022 again wherever the program is dated', () => {
  for (const rel of [HOME, ABOUT]) {
    test(`${rel}: the "CodersTrust Around the World" tile reads "Albania, 2021–2022. A World Bank initiative, delivered online."`, () => {
      const tile = /<li\b[^>]*data-tile="albania"[\s\S]*?<\/li>/.exec(html(rel))?.[0] ?? '';
      expect(tile).toContain('data-fact="TL-05"');
      expect(visible(/<figcaption[\s\S]*?<\/figcaption>/.exec(tile)?.[0] ?? '')).toBe('Albania, 2021–2022. A World Bank initiative, delivered online.');
    });
  }
  test('Global Reach: the Albania row and its map card say 2021–2022', () => {
    expect(locations.find((l) => l.id === 'albania')?.years).toBe(RANGE);
    const raw = html(REACH);
    const row = /<tr\b[^>]*>(?:(?!<\/tr>)[\s\S])*?Albania[\s\S]*?<\/tr>/.exec(raw)?.[0] ?? '';
    expect(visible(/<td data-label="Years"[^>]*>[\s\S]*?<\/td>/.exec(row)?.[0] ?? '')).toBe(RANGE);
    expect(visible(/<p class="wmap__country"[^>]*>Albania <span[^>]*>[^<]*<\/span><\/p>/.exec(raw)?.[0] ?? '')).toBe(`Albania ${RANGE}`);
  });
  test('the case-study data: program "World Bank, 2021–2022", place "…; Albania, 2021–2022" and the figure PR-09', () => {
    const dja = CASE_STUDIES.find((c) => c.slug === 'digital-jobs-albania')!;
    expect(dja.program).toBe(`World Bank, ${RANGE}`);
    expect(dja.place).toBe(`World Bank, with the Government of Albania and EuroPartners Development; Albania, ${RANGE}`);
    expect(dja.factId).toBe('PR-09');
    // every published case has a figure again
    expect(CASE_STUDIES.map((c) => c.factId)).toEqual(['PR-02', 'PR-09', 'PR-01', 'PR-03', 'PR-05']);
  });
  test('no built file still dates CodersTrust’s part in Albania to 2021 alone ("took part in 2021", "Albania, 2021." or "World Bank, 2021" without "–2022")', () => {
    const offenders: string[] = [];
    for (const f of builtTexts()) {
      for (const re of [/took part in (?:Digital Jobs Albania )?(?:in )?2021/, /Albania, 2021(?![–-])/, /World Bank, 2021(?![–-])/, /CodersTrust’s part ended in 2021/]) {
        if (re.test(f.text)) offenders.push(`${f.rel}: ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('The Digital Jobs Albania case study', () => {
  test('the eyebrow says 2021–2022; the context says CodersTrust began delivery in 2021 and Learnio, the former CodersTrust Global, completed the program in 2022', () => {
    const main = mainRaw(ALBANIA);
    expect(visible(/<p class="hero__eyebrow"[^>]*>[\s\S]*?<\/p>/.exec(main)?.[0] ?? '')).toBe(`Case Study · World Bank, ${RANGE}`);
    // the Context band is the <section> labelled by #context-h (it has no id of its own)
    const raw = html(ALBANIA);
    const at = raw.search(/<h2\b[^>]*\bid="context-h"/);
    expect(at).toBeGreaterThan(0);
    const context = raw.slice(raw.lastIndexOf('<section', at), raw.indexOf('</section>', at));
    expect(visible(context)).toBe(
      `Context Why This Program In September 2021, the World Bank launched Digital Jobs Albania to help women in Albania gain better access to online work and connect with the global economy. ${CONTEXT}`,
    );
    expect(visible(main)).not.toContain('CodersTrust took part in 2021');
  });
  test('the hero shows one stat tile, PR-09 (100+), with its label and no evidence pill', () => {
    const main = mainRaw(ALBANIA);
    const tiles = [...main.matchAll(/<div class="cs__stat"[\s\S]*?<\/div>\s*<\/div>/g)].map((m) => m[0]);
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toContain('data-fact="PR-09"');
    expect(visible(tiles[0])).toBe(`100+ ${PR09_LABEL}`);
    expect(tiles[0]).not.toMatch(/evidence-tag|status-tag/);
  });
  test('the Results band shows the two figures with their base, says they are the partner’s and not CodersTrust program records, and links the EuroPartners page and both World Bank pages', () => {
    const results = byId(ALBANIA, 'section', 'results');
    expect(visible(results)).toBe(
      `Results What Happened Partner-Reported Results 270+ certified, of 500 trained 100+ found a freelancing job or project before the training ended, of 500 trained ${NOT_RECORDS} Read the EuroPartners Project Page Read the World Bank Announcement Read the World Bank’s May 2022 Update`,
    );
    expect(results).toMatch(/<ul class="dja__results"[^>]*data-fact="PR-09"/);
    // the figure lines carry no label of their own (a bare "Certification" or "Certified" label is caught by tests/wp150.spec.ts and tests/wp152.spec.ts)
    expect(results).not.toMatch(/<dt\b/);
    expect(results).not.toMatch(/evidence-tag|status-tag|Program Record/);
    const links = [...results.matchAll(/<a\b[^>]*href="(https:[^"]*)"[^>]*>/g)].map((m) => ({ href: m[1], tag: m[0] }));
    expect(links.map((l) => l.href)).toEqual([sources.EPDJA.url, sources.WBDJA21.url, sources.WBBLOG22.url]);
    // europartners.al is not a partner host in src/data/partners.ts, so lib/url gives it rel="noopener noreferrer"; worldbank.org (a partner) keeps the referrer
    expect(links[0].tag).toContain('rel="noopener noreferrer"');
    expect(links[1].tag).toContain('rel="noopener"');
    expect(results).toMatch(/Read the EuroPartners Project Page<span class="sr-only"[^>]*> \(opens europartners\.al\)<\/span>/);
  });
  test('the page names no money amount and no World Bank interim figure', () => {
    const text = everything(html(ALBANIA));
    expect(text).not.toMatch(/[$€£]\s?\d|\bUSD\b|\bEUR\b|150,000/);
    expect(text).not.toMatch(/5,000\+?|500\+|expressed interest|enrolled/);
  });
  test('the meta description and the Article description say 2021–2022, begun by CodersTrust and completed by Learnio; the Article is dated 2026-11-03', () => {
    expect(metaDescription(ALBANIA)).toBe(META);
    expect(META.length).toBeLessThanOrEqual(155);
    const article = nodeOf(ALBANIA, 'Article');
    expect(article.description).toBe(META);
    expect(article.datePublished).toBe('2026-10-08');
    expect(article.dateModified).toBe(TODAY);
    expect(CASE_STUDIES.find((c) => c.slug === 'digital-jobs-albania')?.dateModified).toBe(TODAY);
  });
  test('in the browser: the hero tile reads 100+, "Jump to the Results" lands on the two figures, and the EuroPartners link is named for screen readers', async ({ page }) => {
    await open(page, 'impact/case-studies/digital-jobs-albania/');
    const tile = page.locator('.cs__stat');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.evidence-tag, .status-tag')).toHaveCount(0);
    await expect(tile).toContainText('100+');
    await page.getByRole('link', { name: 'Jump to the Results' }).click();
    await expect(page).toHaveURL(/#results$/);
    await expect(page.locator('#results-h')).toBeInViewport();
    await expect(page.locator('#results .dja__results li')).toHaveText(['270+ certified, of 500 trained', '100+ found a freelancing job or project before the training ended, of 500 trained']);
    await expect(page.locator('#results .dja__results li strong')).toHaveText(['270+', '100+']);
    await expect(page.locator('#results')).toContainText(NOT_RECORDS);
    const epd = page.getByRole('link', { name: 'Read the EuroPartners Project Page (opens europartners.al)' });
    await expect(epd).toHaveAttribute('href', sources.EPDJA.url!);
    await expect(epd).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByRole('link', { name: /Read the World Bank Announcement/ })).toHaveAttribute('href', sources.WBDJA21.url!);
    await expect(page.getByRole('link', { name: /Read the World Bank’s May 2022 Update/ })).toHaveAttribute('href', sources.WBBLOG22.url!);
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('The case-study hub and the Impact page', () => {
  const cards = (rel: string) => [...html(rel).matchAll(/<article class="card card--link case"[\s\S]*?<\/article>/g)].map((m) => m[0]);
  test('hub: the Albania card shows PR-09 as its "Result", with no "Delivered" tag and no "Program Record" pill; the other four keep both', () => {
    const all = cards(HUB);
    expect(all).toHaveLength(5);
    const albania = all.find((c) => c.includes('Digital Jobs Albania'))!;
    expect(visible(albania)).toBe(
      `Digital Jobs Albania Partner and Place World Bank, with the Government of Albania and EuroPartners Development; Albania, ${RANGE} Result 100+ ${PR09_LABEL} Read the Case Study`,
    );
    expect(albania).not.toMatch(/case__tags|status-tag|evidence-tag|Program Record|Delivered/);
    for (const c of all.filter((x) => x !== albania)) {
      expect(c).toContain('data-status="Delivered"');
      expect(c).toContain('data-evidence="Program Record"');
    }
    expect(/<div class="grid-cards[^"]*" data-fact="([^"]*)"/.exec(html(HUB))?.[1]).toBe('PR-02 PR-09 PR-01 PR-03 PR-05 PR-02b');
  });
  test('hub: the lead and the description say "each with its figure and its base" again (WP162 had "with the figures and bases where they exist")', () => {
    expect(visible(/<p class="hero__lead"[^>]*>[\s\S]*?<\/p>/.exec(mainRaw(HUB))?.[0] ?? '')).toBe('Five programs, each with its figure and its base.');
    const d = 'Five CodersTrust case studies, each with its figure and its base: Women in Online Work, Digital Jobs Albania, WSDFM, UNDP YES and Her Power.';
    expect(metaDescription(HUB)).toBe(d);
    for (const type of ['CollectionPage', 'Article']) expect(nodeOf(HUB, type).description, type).toBe(d);
    expect(readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8')).toContain(`(https://coderstrust.global/impact/case-studies/): ${d}`);
    for (const rel of [HUB, 'llms.txt']) expect(readFileSync(join(DIST_DIR, rel), 'utf8')).not.toContain('where they exist');
    expect(visible(mainRaw(HUB))).toContain('Results First, Program by Program');
  });
  test('in the browser: the hub has four "Delivered" tags, none on the Albania card, whose result reads 100+', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    await expect(page.locator('article.case .status-tag[data-status="Delivered"]')).toHaveCount(4);
    const dja = page.locator('article.case', { hasText: 'Digital Jobs Albania' });
    await expect(dja.locator('.case__result dt')).toHaveText('Result');
    await expect(dja.locator('.case__value')).toHaveText('100+');
    await expect(dja.locator('.status-tag, .evidence-tag')).toHaveCount(0);
  });
  test('Impact: the Albania card reads "…; Albania, 2021–2022" and its scope line is unchanged (the Impact cards carry no figure)', () => {
    const card = /<article class="card card--link"[^>]*>(?:(?!<\/article>)[\s\S])*?Digital Jobs Albania[\s\S]*?<\/article>/.exec(byId(IMPACT, 'section', 'cases'))?.[0] ?? '';
    expect(visible(card)).toBe(
      `World Bank, with the Government of Albania and EuroPartners Development; Albania, ${RANGE} Digital Jobs Albania Three-month online training in graphic design, web development and digital marketing, with mentoring. Read the Case Study`,
    );
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('What stays as it was', () => {
  test('no built page states the World Bank’s May 2022 figures (500+ students, 5,000+ women) or marks PR-07/PR-08', () => {
    const offenders: string[] = [];
    for (const p of listPages()) {
      const raw = readFileSync(p.file, 'utf8');
      if (/data-fact="[^"]*\bPR-0[78]\b/.test(raw)) offenders.push(`${p.route}: data-fact PR-07/PR-08`);
      const text = everything(raw);
      for (const re of [/Reported Enrollment/i, /(?<![\d,])500\+? students/i, /more than 500 students/i, /5,000\+? women/i, /expressed interest/i]) {
        if (re.test(text)) offenders.push(`${p.route}: ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });
  test('only the Albania case study names Learnio or links the EuroPartners page', () => {
    const named = builtTexts().filter((f) => /Learnio/.test(f.text)).map((f) => f.rel);
    expect(named).toEqual([ALBANIA]);
    const linked = listPages().filter((p) => readFileSync(p.file, 'utf8').includes('europartners.al')).map((p) => p.route);
    expect(linked).toEqual(['/impact/case-studies/digital-jobs-albania/']);
  });
  test('FAQ "Will This Work in Our Country?" keeps its answer: Albania adds delivery experience (the partner-reported results are not CodersTrust outcome evidence)', () => {
    const q1 = faqs.find((f) => f.id === 'Q1')!;
    expect(q1.q).toBe('Will This Work in Our Country?');
    expect(q1.a).toBe('We test local employer demand first and choose each country’s tracks with local partners. Our outcome evidence comes mainly from Bangladesh, with program results from Kosovo and delivery experience in Albania.');
    expect(q1.evidence).toEqual(['IN-02', 'PD-10', 'PR-02', 'TL-05']);
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe(`Dates: every page whose visible text changed in WP164 is dated ${TODAY}`, () => {
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
  test(`Home pins no date of its own: its WebPage.dateModified is the build date, ${TODAY} or later`, () => {
    expect(String(nodeOf(HOME, 'WebPage').dateModified) >= TODAY).toBe(true);
  });
});
