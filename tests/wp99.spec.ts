import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { facts, fact, sources } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import * as copy from '../src/data/copy';
import { DIST_DIR } from './support/env';
import { open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP99 (site sync to the merged facts register; grant-deck facts and the owner answers of 2026-10-28). Written test-first: every group below failed against the
 * pre-change site for the reason named in its title, then passed after the change. Run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp99.spec.ts --project=chromium --workers=2`.
 *   - Item 1: the YouthWIDE aim is IN-01's 1 million educated youth (Higher Secondary Certificate or above) by 2030, in Bangladesh and similar countries in South Asia and the
 *     Middle East and North Africa, depending on government and donor commitments; the band is "Delivery Base in Bangladesh and the 2030 Aim"; no HSC+, NEET or bare MENA;
 *   - Item 2: the trial's taka-to-dollar rate is BDT 86 everywhere (owner check 2026-10-23);
 *   - Item 3: the Trial page and FAQ Q4 cite the peer-reviewed article (RC-15, DOI link); the Trial page alone shows its benefit/cost ratio of 3.01 (RC-16), apart from the report figures;
 *   - Item 4: the WSDFM case study names the commissioner, the funder and the outreach partner (PR-01a);
 *   - Item 5: "predecessor program" is "CodersTrust’s WSDFM program" everywhere, and the 200-hour versus 100-hour caveat is kept in other words;
 *   - Item 6: the survey profile (85.0%, 68.2%, 19.6%) is labelled as describing all responding alumni, not completers;
 *   - Item 7: the dataset strings PX-12 (3.8M students) and the BIDS 2023 source follow the register;
 *   - Item 8: sweeps for every superseded value, and the things this package must NOT change.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const visible = (html: string) =>
  compact(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
/** Everything a reader, a search engine or an assistive technology can get from a page: visible text, meta and attribute text, and JSON-LD. */
const surface = (html: string) => {
  const attrs = [...html.matchAll(/\b(?:content|alt|title|aria-label|aria-description)="([^"]*)"/g)].map((m) => m[1]).join(' ');
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(' ');
  return `${visible(html)} ${attrs} ${ld}`.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
};
const pages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const sitePages = () => pages().filter((p) => !p.route.startsWith('/news/') && p.route !== '/404.html');
const routesWith = (re: RegExp, scope = sitePages()) => scope.filter((p) => re.test(surface(p.html))).map((p) => p.route);
const pageHtml = (route: string) => pages().find((p) => p.route === route)!.html;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
// read through the namespace so that a constant that is not exported yet fails its own test (a named import of a missing export would stop the whole file from loading)
const { AIM_DEPENDENCY } = copy;
const { AIM_GROUP, AIM_SCOPE, AIM_STATEMENT } = copy as unknown as Record<string, string | undefined>;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Item 1: the YouthWIDE aim (IN-01; owner answer 2026-10-28, Q1)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const IN01_TEXT = 'YouthWIDE aims to train 1 million educated youth (Higher Secondary Certificate or above) for digital employment by 2030, in Bangladesh and similar countries in South Asia and the Middle East and North Africa, depending on government and donor commitments';
const IN01_STATEMENT = '1 million educated youth (Higher Secondary Certificate or above) for digital employment by 2030, in Bangladesh and similar countries in South Asia and the Middle East and North Africa, depending on government and donor commitments';
const IN01_SCOPE = 'in Bangladesh and similar countries in South Asia and the Middle East and North Africa';
const BAND = 'Delivery Base in Bangladesh and the 2030 Aim';

test.describe('Item 1: the YouthWIDE aim is 1 million educated youth (Higher Secondary Certificate or above) by 2030, in Bangladesh and similar countries', () => {
  test('IN-01 is the register’s wording: the value, the text (ending with the dependency clause), the tile label and the glance row', () => {
    const f = fact('IN-01');
    expect(f.text).toBe(IN01_TEXT);
    expect(f.stat?.value).toBe('1 million');
    expect(f.stat?.numeric).toBe(1);
    expect(f.stat?.suffix).toBe(' million');
    expect(f.stat?.label).toBe(`educated youth (Higher Secondary Certificate or above) that YouthWIDE aims to train by 2030, ${IN01_SCOPE}`);
    expect(f.stat?.glance?.label).toBe('Aim: educated youth (Higher Secondary Certificate or above) trained for digital employment by 2030');
    expect(f.stat?.glance?.note).toBe(`YouthWIDE in Bangladesh and similar countries in South Asia and the Middle East and North Africa. An ambition, not a result.`);
    expect(f.sourceIds).toEqual(['PROJ26']);
    expect(f.text.endsWith(AIM_DEPENDENCY), 'IN-01 ends with the one dependency clause').toBe(true);
  });

  test('the site constants are read from IN-01: AIM_GROUP, AIM_SCOPE and AIM_STATEMENT (so no page retypes the aim)', () => {
    expect(AIM_DEPENDENCY).toBe('depending on government and donor commitments');
    expect(AIM_GROUP).toBe('educated youth (Higher Secondary Certificate or above)');
    expect(AIM_SCOPE).toBe(IN01_SCOPE);
    expect(AIM_STATEMENT).toBe(IN01_STATEMENT);
    expect(fact('IN-01').text).toBe(`YouthWIDE aims to train ${AIM_STATEMENT}`);
  });

  test('the four pages that state the aim say it in IN-01’s words, and none says the clause twice in a sentence', async ({ page }) => {
    await open(page, 'programs/');
    // WP106 (Polish, accepted): the Programs card is sibling length, so it states the short aim (the figure from IN-01, the 2030 date and the clause); the full statement stays on About and YouthWIDE
    expect(compact(await page.locator('main').textContent())).toContain(`It aims to train 1 million educated youth by 2030, ${AIM_DEPENDENCY}.`);
    await open(page, 'about/');
    expect(compact(await page.locator('#story .timeline__item').last().locator('.timeline__text').textContent())).toBe(`JobReady rolls out in stages. YouthWIDE aims to train ${IN01_STATEMENT}; CodersTrust publishes Impact Survey 2026.`);
    await open(page, 'impact/');
    const tile = page.locator('#heading a[data-fact~="IN-01"]');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.locator('.glance__note').textContent())).toBe(`YouthWIDE ${IN01_SCOPE}, ${AIM_DEPENDENCY}. An ambition, not a result.`);
    expect(compact(await tile.textContent())).toContain('Aim: educated youth (Higher Secondary Certificate or above) trained for digital employment by 2030');
    await open(page, 'programs/youthwide/');
    const row = compact(await page.locator('#program-glance .pg__row').first().textContent());
    expect(row.startsWith('Designed for Three Regions')).toBe(true);
    expect(row.endsWith(`South Asia, Sub-Saharan Africa and the Middle East and North Africa, as co-funded country cohorts. Bangladesh is where most delivery has been. YouthWIDE aims to train ${IN01_STATEMENT}.`)).toBe(true);
    const clause = new RegExp(escapeRe(AIM_DEPENDENCY), 'g');
    for (const route of ['/programs/', '/about/', '/impact/', '/programs/youthwide/']) {
      const sentences = visible(pageHtml(route)).split(/(?<=[.;])\s+/);
      const doubled = sentences.filter((s) => (s.match(clause) ?? []).length > 1);
      expect(doubled, `${route}: a sentence with the clause twice`).toEqual([]);
      expect(visible(pageHtml(route)), route).toContain(AIM_DEPENDENCY);
    }
  });

  test('the YouthWIDE band is "Delivery Base in Bangladesh and the 2030 Aim"; its tile is the 1 million target with a note that fits a multi-country aim', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const band = page.locator('section#governments');
    await expect(band.getByRole('heading', { level: 2 })).toHaveText(BAND);
    expect(BAND).toBe(titleCase(BAND));
    // WP105 (Sonnet XHigh run 1, kit 71, Minor 1): the full statement is said once, in the "Designed for Three Regions" row; the tile is short ("1 million", "educated youth YouthWIDE aims to train by 2030", the ambition note), with no region list.
    expect(compact(await band.locator('.mech-target__note').textContent())).toBe(`An ambition, ${AIM_DEPENDENCY}; not a delivered figure.`);
    expect(compact(await band.locator('.mech-target').textContent())).not.toMatch(/national/i);
    const target = compact(await band.locator('.mech-target').textContent());
    expect(target).toContain('1 million');
    expect(target).toContain('educated youth YouthWIDE aims to train by 2030');
    expect(target).not.toContain(IN01_SCOPE);
    expect(await routesWith(/Bangladesh: Delivery Base and 2030 Aim/)).toEqual([]);
  });

  test('no page’s text, attributes or JSON-LD carries a "2 million" aim, "vulnerable youth", HSC+, NEET or a bare MENA', () => {
    expect(routesWith(/2 million.{0,160}youth|youth.{0,160}2 million/i)).toEqual([]);
    expect(routesWith(/vulnerable youth/i)).toEqual([]);
    expect(routesWith(/\bHSC\+|\bNEET\b|\bMENA\b/)).toEqual([]);
    expect(routesWith(/2,000,000/)).toEqual([]);
  });

});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Item 2: BDT 86 = $1 (RC-04a)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 2: the trial’s exchange rate is BDT 86 to the dollar', () => {
  test('RC-04a states BDT 86 and the November–December 2021 rate, and the dollar figures in RC-04 follow from it', () => {
    expect(fact('RC-04a').text).toBe('BDT 2,354 a month for women offered a place, BDT 3,118 for attenders, on a control-group mean of BDT 5,715 (Table 4); the dollar figures are approximate conversions at about BDT 86 to the dollar, the rate in November–December 2021, when the follow-up survey ran');
    // 2,354.3 / 86 = 27.4; 3,118.2 / 86 = 36.3; 5,714.6 / 86 = 66.4 (the report prints BDT 2,354.311, 3,118.155 and 5,714.605)
    expect(Math.round(2354.311 / 86)).toBe(27);
    expect(Math.round(3118.155 / 86)).toBe(36);
    expect(Math.round(5714.605 / 86)).toBe(66);
    expect(fact('RC-04').text).toBe('About +$27 a month for all women offered a place, on a control-group mean of about $66');
    expect(Math.round(3118.155 / 86), 'BDT 3,118 is about $36').toBe(36);
  });

  test('the Trial page prints the rate in its taka line, and no built page or source still says BDT 87', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    expect(compact(await page.locator('#results p[data-fact="RC-04a"]').textContent())).toBe(
      'The report gives these amounts in taka: BDT 2,354 a month for women offered a place, BDT 3,118 for attenders, on a control-group mean of BDT 5,715 (Table 4); the dollar figures are approximate conversions at about BDT 86 to the dollar, the rate in November–December 2021, when the follow-up survey ran.',
    );
    expect(routesWith(/BDT 87|87 to the dollar|87 taka/, pages())).toEqual([]);
    expect(source('src/data/facts.ts')).not.toMatch(/BDT 87|≈ 87/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Item 3: the peer-reviewed article (RC-15) and its benefit/cost ratio (RC-16)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const CITATION = 'Arman, Bhattacharjee, Das, Gomes and Mahmood (2026), “Tackling Women’s Unemployment: Evidence from an Online Jobs Experiment in Bangladesh,” Economic Development and Cultural Change 75(1): 367–399';
const DOI = 'https://doi.org/10.1086/741450';
const TRIAL = 'impact/independent-evaluation/';

test.describe('Item 3: the Trial page and FAQ Q4 cite the peer-reviewed article; the Trial page alone shows its benefit/cost ratio', () => {
  test('RC-15, RC-16 and the EDCC26 source are the register’s', () => {
    expect(fact('RC-15').text).toBe(`The BIGD randomized trial of CodersTrust’s WSDFM program is published in a peer-reviewed journal: ${CITATION} (October 2026)`);
    expect(fact('RC-15').sourceIds).toEqual(['EDCC26']);
    expect(fact('RC-16').text).toBe('The journal article estimates a benefit/cost ratio of 3.01 for CodersTrust’s 200-hour WSDFM program');
    expect(fact('RC-16').sourceIds).toEqual(['EDCC26']);
    expect(fact('RC-16').status).toBe('V');
    expect(sources.EDCC26?.citation).toBe(`${CITATION}.`);
    expect(sources.EDCC26?.url).toBe(DOI);
  });

  test('the Trial page has its own band "Published in a Peer-Reviewed Journal" with the full citation, a DOI link and the 3.01 sourced to the article', async ({ page }) => {
    await open(page, TRIAL);
    const band = page.locator('section#journal');
    await expect(band).toHaveCount(1);
    await expect(band.getByRole('heading', { level: 2 })).toHaveText('Published in a Peer-Reviewed Journal');
    expect('Published in a Peer-Reviewed Journal').toBe(titleCase('Published in a Peer-Reviewed Journal'));
    await expect(page.locator('.lf-toc a[href="#journal"]')).toHaveText('Published in a Peer-Reviewed Journal');
    const citation = band.locator('p[data-fact="RC-15"]');
    await expect(citation).toHaveCount(1);
    expect(compact(await citation.textContent())).toContain(`The trial is also published in a peer-reviewed journal: ${CITATION} (October 2026).`);
    const link = band.locator(`a[href="${DOI}"]`);
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('rel', /noopener/);
    expect(compact(await link.textContent())).toContain(DOI);
    const ratio = band.locator('p[data-fact="RC-16"]');
    await expect(ratio).toHaveCount(1);
    expect(compact(await ratio.textContent())).toBe('The journal article estimates a benefit/cost ratio of 3.01 for CodersTrust’s 200-hour WSDFM program.');
    expect(compact(await band.textContent())).toContain('The results above come from BIGD’s report. The article is a separate publication.');
  });

  test('the report figures are never labelled peer-reviewed: the result band does not say it, and no paragraph that says it carries a percentage or a dollar figure', async ({ page }) => {
    await open(page, TRIAL);
    expect(compact(await page.locator('#summary').textContent())).not.toMatch(/peer-reviewed/i);
    expect(compact(await page.locator('#results').textContent())).not.toMatch(/peer-reviewed/i);
    const blocks = await page.locator('main p, main li, main dd').allTextContents();
    const labelled = blocks.map(compact).filter((t) => /peer-reviewed/i.test(t));
    expect(labelled.length).toBeGreaterThan(0);
    for (const t of labelled) expect(t).not.toMatch(/\d+(\.\d+)?%|percentage point|\$\d/);
    for (const p of sitePages()) {
      const blocks = [...p.html.matchAll(/<(p|li|dd|dt|td|th|summary|figcaption|h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => compact(m[2].replace(/<[^>]+>/g, ' ')));
      const bad = blocks.filter((t) => /peer-reviewed/i.test(t) && /\d+(\.\d+)?%|percentage point/.test(t));
      expect(bad, p.route).toEqual([]);
    }
  });

  test('3.01 and the benefit/cost wording are on the Trial page only; the article’s abstract percentages are on no page', () => {
    expect(routesWith(/\b3\.01\b/)).toEqual(['/impact/independent-evaluation/']);
    expect(routesWith(/benefit\/cost/i)).toEqual(['/impact/independent-evaluation/']);
    expect(sitePages().filter((p) => /data-fact="[^"]*\bRC-16\b/.test(p.html)).map((p) => p.route)).toEqual(['/impact/independent-evaluation/']);
    expect(routesWith(/10 percentage points \(18%\)|\+38%|38% (?:higher )?income|27% (?:more )?hours/i)).toEqual([]);
  });

  test('the Trial page JSON-LD cites the article beside the BIGD report', async ({ page }) => {
    await open(page, TRIAL);
    const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
    const nodes: any[] = [];
    const walk = (n: any) => { if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === 'object') { nodes.push(n); Object.values(n).forEach(walk); } };
    for (const b of blobs) walk(JSON.parse(b));
    const articles = nodes.filter((n) => n['@type'] === 'ScholarlyArticle');
    expect(articles.map((a) => a.name)).toEqual(['Impact Evaluation Report of the WSDFM Program', 'Tackling Women’s Unemployment: Evidence from an Online Jobs Experiment in Bangladesh']);
    const journal = articles[1];
    expect(journal?.url).toBe(DOI);
    expect(journal?.datePublished).toBe('2026-10');
    expect(journal?.isPartOf?.name).toBe('Economic Development and Cultural Change');
    expect(journal?.pagination).toBe('367–399');
    expect((journal?.author ?? []).map((a: any) => a.name)).toEqual(['Mohammad Raied Arman', 'Anindita Bhattacharjee', 'Narayan Das', 'Mohima Gomes', 'Sakib Mahmood']);
  });

  test('FAQ Q4 cites the article with its DOI link; the answer, its structured data and every page that prints it agree', async ({ page }) => {
    const q4 = faqs.find((f) => f.id === 'Q4');
    expect(q4?.a).toBe(
      `Yes, for CodersTrust’s WSDFM program. The BRAC Institute of Governance and Development (BIGD) at BRAC University ran a randomized controlled trial of that 200-hour program, longer than today’s 100-hour tracks, with women in Dhaka trained in 2020. Women offered a place were more likely to be employed than the control group. The trial is also published in a peer-reviewed journal: ${CITATION}. ${DOI}`,
    );
    expect(q4?.inlineLink).toEqual({ text: DOI, href: DOI });
    expect(q4?.evidence).toEqual(['RC-01', 'RC-02', 'RC-07', 'RC-15']);
    expect(q4?.a).not.toMatch(/3\.01|benefit\/cost/);
    await open(page, 'our-model/talentleap/');
    const item = page.locator('details', { hasText: 'Is There Independent Evidence?' }).first();
    expect(compact(await item.textContent()).endsWith(`The trial is also published in a peer-reviewed journal: ${CITATION}. ${DOI}`), 'the citation ends with a full stop and the DOI link follows it, as on the Trial page; no full stop after the link').toBe(true);
    const link = item.locator(`a[href="${DOI}"]`);
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('rel', /noopener/);
    const carriers = pages().filter((p) => visible(p.html).includes('Is There Independent Evidence?'));
    expect(carriers.length).toBeGreaterThan(0);
    for (const p of carriers) {
      expect(visible(p.html), p.route).toContain(`published in a peer-reviewed journal: ${CITATION}. ${DOI}`);
      expect(p.html, p.route).toContain(`href="${DOI}"`);
      const ld = [...p.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(' ');
      expect(ld, p.route).toContain(`published in a peer-reviewed journal: ${CITATION}. ${DOI}"`);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Item 4: the WSDFM case study names the commissioner, the funder and the outreach partner (PR-01a)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 4: WSDFM was commissioned by Porticus, funded by the Dutch Foundation advised by Porticus, with Manusher Jonno Foundation as outreach partner', () => {
  test('the case study says all three roles in the owner’s wording', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    const main = compact(await page.locator('main').textContent());
    expect(main).toContain('Porticus commissioned CodersTrust to run a skills project for women, focused on ICT skills for freelancing marketplaces and local jobs, and on women’s empowerment.');
    expect(main).toContain('The project was funded by the Dutch Foundation advised by Porticus, with Manusher Jonno Foundation as outreach partner.');
  });

  test('no page says Porticus funded WSDFM, none says "Dutch Foundations", and Manusher Jonno Foundation is named in the case study’s text only (no logo, no other page)', () => {
    expect(routesWith(/Porticus[- ]funded|funded by Porticus|Porticus funds|Porticus funded/i)).toEqual([]);
    expect(routesWith(/Dutch Foundations/)).toEqual([]);
    expect(routesWith(/Dutch Foundation/)).toEqual(['/impact/case-studies/wsdfm-women-freelancers/']);
    expect(routesWith(/Manusher Jonno/)).toEqual(['/impact/case-studies/wsdfm-women-freelancers/']);
    expect(pageHtml('/impact/case-studies/wsdfm-women-freelancers/')).not.toMatch(/<img[^>]+(manusher|jonno)/i);
  });

  test('the other places that name Porticus for WSDFM still say "commissioned by Porticus" (PR-01) and PR-06 keeps "WSDFM (Porticus)"', () => {
    expect(fact('PR-01').text).toContain('commissioned by Porticus');
    expect(fact('PR-06').text).toContain('WSDFM (Porticus)');
    const withCommissioned = sitePages().filter((p) => /Commissioned by Porticus/.test(visible(p.html))).map((p) => p.route);
    expect(withCommissioned.length).toBeGreaterThan(3);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Item 5: "predecessor program" -> "CodersTrust’s WSDFM program" everywhere
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 5: CodersTrust’s WSDFM program, not "predecessor program"', () => {
  test('no built page (text, attributes, JSON-LD) and no published text file says "predecessor"', () => {
    expect(routesWith(/predecessor/i, pages())).toEqual([]);
    for (const f of ['llms.txt', 'data/outcomes-2026-aggregates.csv']) {
      const p = join(DIST_DIR, f);
      if (existsSync(p)) expect(readFileSync(p, 'utf8'), f).not.toMatch(/predecessor/i);
    }
  });

  test('no fact, headline, tile label, detail or glance line in the dataset says "predecessor"', () => {
    const strings = Object.values(facts).flatMap((f) => [f.text, f.headline, f.stat?.label, f.stat?.detail, f.stat?.glance?.label, f.stat?.glance?.note].filter((s): s is string => !!s));
    expect(strings.filter((s) => /predecessor/i.test(s))).toEqual([]);
  });

  test('the register-mirroring RC strings name CodersTrust’s WSDFM program', () => {
    expect(fact('RC-01').text.startsWith('A randomized controlled trial of CodersTrust’s WSDFM program found that women offered a place')).toBe(true);
    expect(fact('RC-01').headline).toContain('women offered a place in CodersTrust’s WSDFM program were 10.3 percentage points');
    expect(fact('RC-01').stat?.label).toBe('estimated monthly income gain versus the control group, for women in Dhaka offered a place (randomized trial of CodersTrust’s WSDFM program)');
    expect(fact('RC-02').stat?.label).toBe('more employment, in percentage points, for women offered a place (randomized trial of CodersTrust’s WSDFM program)');
    expect(fact('RC-04').stat?.label).toBe('estimated monthly income gain for women offered a place in CodersTrust’s WSDFM program, compared with the control group');
    expect(fact('RC-07').text).toBe('Trial design: 833 women at baseline (425 treatment, 408 control) and 599 surveyed at follow-up; CodersTrust’s WSDFM program was 200 hours over 4 months, plus 3 months of mentoring');
    expect(fact('RC-11').text.startsWith('In CodersTrust’s WSDFM program, 39% of trainees')).toBe(true);
    expect(fact('RC-13').text).toContain('of CodersTrust’s WSDFM program found that, for women who attended');
    expect(fact('RC-13').stat?.label).toBe('income for women who attended, against the control group (randomized trial of CodersTrust’s WSDFM program; about $36 a month)');
    expect(fact('RC-13').stat?.glance?.label).toBe('higher monthly income for women who attended CodersTrust’s WSDFM program (randomized trial)');
    expect(fact('RC-14').stat?.label).toBe('household spending for women who attended, against the control group (randomized trial of CodersTrust’s WSDFM program)');
    expect(fact('RC-14').stat?.glance?.label).toBe('household spending, women who attended (randomized trial of CodersTrust’s WSDFM program)');
    expect(fact('PR-01').text).toContain('BIGD evaluated CodersTrust’s WSDFM program in a randomized trial');
  });

  test('where "predecessor" signalled that today’s tracks differ (200 against 100 hours), the caveat is kept in other words', async ({ page }) => {
    await open(page, TRIAL);
    expect(compact(await page.locator('li[data-fact="RC-07 PD-01"]').textContent())).toBe('What was evaluated. CodersTrust’s 200-hour WSDFM program; today’s track is 100 hours.');
    expect(compact(await page.locator('.ie__type').textContent())).toContain('CodersTrust’s WSDFM program, women in Dhaka');
    expect(compact(await page.locator('main').textContent())).toContain('The trial evaluated CodersTrust’s 200-hour WSDFM program for women in Dhaka, not today’s 100-hour tracks.');
    expect(faqs.find((f) => f.id === 'Q15')?.a).toContain('evaluated CodersTrust’s 200-hour WSDFM program for women in Dhaka, not today’s 100-hour tracks');
    expect(compact(await page.locator('meta[name="description"]').getAttribute('content'))).toBe('A BIGD trial of CodersTrust’s WSDFM program: women offered a place were 10.3 percentage points more likely to be employed.');
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CodersTrust’s WSDFM Program Evaluated by a Randomized Trial');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe('WSDFM (Porticus): a randomized trial of the program found women offered a place had an estimated 41% higher monthly income than the control group.');
  });

  test('the two FitBrief components (not on a page today) carry the same caveat and the survey wording of item 6', () => {
    expect(source('src/components/pages/impact/FitBrief.astro')).toContain('<dd>CodersTrust’s 200-hour WSDFM program; today’s track is 100 hours.</dd>');
    expect(source('src/components/pages/partners/FitBrief.astro')).toContain('<dd>CodersTrust’s {evaluatedHours}-hour WSDFM program; today’s track is {HOURS} hours.</dd>');
  });

  test('the longer wording does not wrap the announcement bar: it is one 44 px line at 1280 and at 1100 pixels wide (it wrapped to 56 px at the first attempt: tests/wp76.spec.ts caught it too)', async ({ page }) => {
    for (const width of [1280, 1100]) {
      await page.setViewportSize({ width, height: 720 });
      await open(page, '');
      const bar = page.locator('.promo-bar');
      expect(compact(await bar.locator('.promo-bar__text strong').textContent())).toBe('Randomized trial of CodersTrust’s WSDFM program:');
      expect(Math.round((await bar.boundingBox())!.height), `promo bar height at ${width}`).toBeLessThanOrEqual(44);
    }
  });

  test('source files carry no "predecessor" outside the deliberate absence checks', () => {
    for (const f of ['src/data/facts.ts', 'src/data/copy.ts', 'src/data/faqs.ts', 'src/data/heroSlides.ts', 'src/data/nav.ts', 'scripts/check-facts.mjs', 'src/pages/impact/independent-evaluation/index.astro']) {
      expect(source(f), f).not.toMatch(/predecessor/i);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Item 6: the survey profile describes all responding alumni
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 6: 85.0%, 68.2% and 19.6% describe all responding alumni, not completers', () => {
  test('FAQ Q13 and the JobReady@Campus FAQ label the profile as the alumni who answered; the 48.0% keeps "completers"', async ({ page }) => {
    expect(faqs.find((f) => f.id === 'Q13')?.a).toBe(
      'Mostly university graduates from across Bangladesh, some of them already working before training. Among alumni who answered the October 2026 survey, 85.0% hold a bachelor’s degree or higher, 68.2% were aged 15–35 and 63.0% live outside Dhaka, across 58 of the country’s 64 districts. Among surveyed completers, 48.0% were working before training.',
    );
    await open(page, 'programs/jobready-campus/');
    const answer = page.locator('#faq details', { hasText: 'Who Is JobReady@Campus For?' }).locator('p');
    expect(compact(await answer.textContent())).toBe('Students and degree holders at universities and colleges. Among alumni of CodersTrust’s programs who answered the October 2026 survey, 85.0% hold a bachelor’s degree or higher.');
  });

  test('the two FitBrief lines say the outcomes are the completers’ and the districts are the responding alumni’s', () => {
    expect(source('src/components/pages/impact/FitBrief.astro')).toContain('<dd>Descriptive outcomes among surveyed completers; the alumni who responded live across 58 of 64 districts.</dd>');
    expect(source('src/components/pages/partners/FitBrief.astro')).toContain('<dd>Descriptive outcomes among surveyed completers; the alumni who responded live across {districts}.</dd>');
  });

  test('no sentence on a built page that gives 85.0%, 68.2% or 19.6% calls the people "surveyed completers" or "completers"', () => {
    const offenders: string[] = [];
    for (const p of sitePages()) {
      for (const s of visible(p.html).split(/(?<=[.!?])\s+/)) {
        if (/\b(85\.0%|68\.2%|19\.6%)/.test(s) && /completers/i.test(s)) offenders.push(`${p.route}: ${s.slice(0, 140)}`);
      }
    }
    expect(offenders).toEqual([]);
    expect(routesWith(/respondent profile among surveyed completers/i)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Item 7: dataset strings that follow the register even where nothing renders them (PX-12, the BIDS 2023 source)
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 7: PX-12 and the BIDS 2023 source follow the register', () => {
  test('PX-12 counts 3.8M madrasah students (BIGD), not 5M+, and cites the BIGD study', () => {
    expect(fact('PX-12').text).toBe('50,000+ madrasahs (one-third of the education system) with 3.8M students; only 14% of madrasahs have a computer lab; 94–97% of those surveyed want training');
    expect(fact('PX-12').sourceIds).toEqual(['IR26', 'BIGDMADRASA21']);
    expect(sources.BIGDMADRASA21?.citation).toBe('BRAC Institute of Governance and Development (BIGD), BRAC University, Employment and Expectations of Former Madrasa Students in Cox’s Bazar: A Cross-Sectional Exploration (final report 28 December 2021).');
    expect(sources.BIGDMADRASA21?.url).toBe('https://bigd.bracu.ac.bd/study/employment-and-expectations-of-former-madrasa-students-in-coxs-bazar-a-cross-sectional-exploration/');
    expect(Object.values(facts).filter((f) => /(?<![\d.])5M\+/.test(f.text)).map((f) => f.id)).toEqual([]);
  });

  test('the BIDS 2023 source is the tracer study report to CEDP (the 13.3% is students, the 48% is graduates three years on); PX-04 stays out of the public dataset', () => {
    expect(sources.BIDS23.citation).toBe('Bangladesh Institute of Development Studies (BIDS), Follow-up Tracer Study on Graduates of Tertiary-Level Colleges, final report to the College Education Development Project (CEDP), 31 October 2023.');
    expect(sources.BIDS23.url).toBe('https://cedp.gov.bd/wp-content/uploads/2024/09/Final%20Report%20of%20Follow-up%20Tracer%20Study%20on%20Graduates%20of%20Tertiary-level%20Colleges-CEDP.pdf');
    expect(facts['PX-04'], 'PX-04 is restricted (NU is a partner) and has no public scope').toBeUndefined();
    expect(routesWith(/\b48%.{0,80}(National University|NU)|(National University|NU).{0,80}\b48%|13\.3%/)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Item 8: sweeps for superseded values, and what this package must not change
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 8: no superseded value remains, and the things the owner kept are untouched', () => {
  test('no built page shows a superseded value: 5M+ madrasah students, the Impact Report’s Korail populations, the November 2022 trial figures, or "certified" graduates', () => {
    expect(routesWith(/5M\+ students|5 million students/i)).toEqual([]);
    expect(routesWith(/Korail.{0,160}(200,000|170,000)|(200,000|170,000).{0,160}Korail/i)).toEqual([]);
    expect(routesWith(/\+53%|\+28%|\b14\.7\b|3\.6×|\b3,031\b/)).toEqual([]);
    expect(routesWith(/certified (graduates?|completers?|alumni|learners?|youth|young people|candidates?|hires?|students?)/i)).toEqual([]);
  });

  test('not changed by this package: the Kosovo funder is not named, PCEP and CWP stay in PD-03, the Learn portal row stays "Live", the Rockefeller entry and 130,000+ stay, Her Power 2,400 stays', async ({ page }) => {
    expect(routesWith(/Korea Green Growth|Green Growth Trust/i, pages())).toEqual([]);
    expect(fact('PD-03').text).toMatch(/PCEP/);
    expect(fact('PD-03').text).toMatch(/CWP/);
    expect(fact('PA-01').text).toContain('the Rockefeller Foundation');
    expect(fact('SC-16').text).toContain('130,000+ learners trained');
    expect(fact('GV-13').text).toContain('2,400');
    await open(page, 'our-model/jobready-platform/');
    const row = page.locator('tr', { hasText: 'Course storefront at jobready.global' });
    await expect(row).toHaveCount(1);
    expect(compact(await row.textContent())).toContain('Live');
    expect(Object.keys(facts)).not.toContain('IN-11');
  });
});
