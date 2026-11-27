import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { AIM_DEPENDENCY } from '../src/data/copy';
import { fact } from '../src/data/facts';
import { open } from './support/browser';
import { listPages, pageByRoute } from './support/pages';

/**
 * WP105 (Sonnet XHigh run 1, kit 71; Minor 1 and the batched Polish items 2 to 9). Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp105.spec.ts --project=chromium`.
 *   - Item 1: YouthWIDE says the 1 million aim in full once (the "Designed for Three Regions" row); the 2030 aim tile is short and repeats no region list.
 *   - Item 2: the Trial page's "Women Who Attended" household line has no percentages.
 *   - Item 3: Recognition drops "Recognition Connected to Our Chairman’s Work" (owner 2026-10-29: the chairman's bio only carries UTC Associates).
 *   - Item 4: EDGE is expanded at first use on About and Governments (GV-02's own words); SKIT has no expansion anywhere in the source, so it stays as is.
 *   - Item 5: the Governments "Can You Deliver at National Scale?" answer no longer repeats the Her Power figures.
 *   - Item 6: the NU overview says "College Code: 6634" in the Recognition row and the "Choose Your Course" lead, not a third time in the Context band.
 *   - Item 7: the Privacy Policy "Email Inquiries" section names the careers inbox and the NU diploma help inbox.
 *   - Item 8: JobReady@Campus option 1 is "Multi-Cohort Pilot Program".
 *   - Item 9: the "Last updated" stamps and dateModified of the pages this WP changes read 2026-10-29.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
const htmlOf = (route: string) => readFileSync(pageByRoute(route).file, 'utf8');
const ldJson = async (page: Page) => (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
const count = (text: string, needle: string) => text.split(needle).length - 1;

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP105 item 1: the YouthWIDE 1 million aim is stated in full once', () => {
  const SCOPE = 'in Bangladesh and similar countries in South Asia and the Middle East and North Africa';
  const GROUP = 'educated youth (Higher Secondary Certificate or above)';

  test('the 2030 aim tile is "1 million", "educated youth YouthWIDE aims to train by 2030", and the short ambition note, with no region list', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const tile = page.locator('#governments .mech-target');
    expect(compact(await tile.locator('.stat__value').textContent())).toContain('1 million');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe('educated youth YouthWIDE aims to train by 2030');
    expect(compact(await tile.locator('.mech-target__note').textContent())).toBe(`An ambition, ${AIM_DEPENDENCY}; not a delivered figure.`);
    const text = compact(await tile.textContent());
    expect(text).not.toContain('South Asia');
    expect(text).not.toContain('Higher Secondary');
    expect(text).toContain('Target');
  });

  test('the full statement (the group in brackets and the region list) appears once on the page, in the "Designed for Three Regions" row', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const main = compact(await page.locator('main').textContent());
    expect(count(main, SCOPE), 'the region list').toBe(1);
    expect(count(main, GROUP), 'the group in brackets').toBe(1);
    const row = compact(await page.locator('#program-glance .pg__row').first().textContent());
    expect(row.startsWith('Designed for Three Regions')).toBe(true);
    expect(row).toContain(`YouthWIDE aims to train 1 million ${GROUP} for digital employment by 2030, ${SCOPE}, ${AIM_DEPENDENCY}.`);
  });

  test('the dependency clause is never said twice in one sentence on the page (the guard of WP99)', async () => {
    const sentences = visible(htmlOf('/programs/youthwide/')).split(/(?<=[.;])\s+/);
    expect(sentences.filter((s) => count(s, AIM_DEPENDENCY) > 1)).toEqual([]);
  });

  test('the register’s IN-01 is unchanged (the long label stays for Programs, Impact and About)', () => {
    expect(fact('IN-01').stat?.value).toBe('1 million');
    expect(fact('IN-01').stat?.label).toBe(`${GROUP} that YouthWIDE aims to train by 2030, ${SCOPE}`);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
// WP166-C (R4-32, owner approval of 21 November 2026, item 5): the RC-05 plain-words line this item pinned is replaced by RC-14, the register's verified household figure; RC-05's six figures still never render.
test.describe('WP105 item 2: the Trial page household line (WP166-C: RC-14)', () => {
  // WP172 (owner decision 2026-11-27): RC-14 is the published study's food-spending figure (the study reports no total household spending; it was the 2022 report's 43% and 48%)
  const LINE = 'Food spending was 39% higher for women who attended, against the control group; the share with savings was 38% higher and fewer took out loans.';

  test('"Women Who Attended" lists the household line (data-fact RC-14), and none of RC-05\'s six figures', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    await expect(page.locator('#results li[data-fact="RC-05"]')).toHaveCount(0);
    const li = page.locator('#results li[data-fact="RC-14"]');
    await expect(li).toHaveCount(1);
    expect(compact(await li.textContent())).toBe(LINE);
    expect(compact(await page.locator('#results').textContent())).not.toMatch(/\+48|\+41|\+83|never felt stressed|43% higher|48% higher/);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP105 item 3: Recognition no longer has "Recognition Connected to Our Chairman’s Work"', () => {
  test('no such H2, no #related section, no "On This Page" entry, no UTC Associates card', async ({ page }) => {
    await open(page, 'about/recognition/');
    expect(await page.locator('h2').allTextContents().then((t) => t.map(compact))).not.toContain('Recognition Connected to Our Chairman’s Work');
    await expect(page.locator('#related')).toHaveCount(0);
    const links = await page.locator('nav[aria-label="On this page"] a').allTextContents();
    expect(links.map(compact)).not.toContain('Recognition Connected to Our Chairman’s Work');
    expect(links.length).toBeGreaterThan(0);
    const main = compact(await page.locator('main').textContent());
    expect(main).not.toContain('UTC Associates');
    expect(main).not.toContain('Related Recognition');
  });

  test('the other sections stay, and the page links to no #related anchor', async ({ page }) => {
    await open(page, 'about/recognition/');
    // WP166-A (marketing review R1-39): the listing band is gone (its register sentence opens the hero lead); the others stay
    for (const id of ['honors', 'forums', 'photos', 'coverage', 'world-bank', 'press-kit']) await expect(page.locator(`#${id}`), id).toHaveCount(1);
    await expect(page.locator('#listing')).toHaveCount(0);
    expect(htmlOf('/about/recognition/')).not.toContain('#related');
  });

  test('Aziz Ahmad’s bio keeps its UTC Associates text', () => {
    expect(visible(htmlOf('/about/team/aziz-ahmad/'))).toContain('UTC Associates, a technology consulting company that he leads, received Con Edison’s Minority Business Entrepreneur of the Year award in 2019 and the NYNJMSDC Partnership Award from the New York & New Jersey Minority Supplier Development Council on October 20, 2022.'); // WP161-B (owner 2026-11-02): the sentence names the 2019 Con Edison award too
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP105 item 4: EDGE is expanded at first use on About and Governments', () => {
  const EDGE = 'EDGE (Enhancing Digital Government and Economy)';

  test('the expansion is the register’s own wording (GV-02)', () => {
    expect(fact('GV-02').text).toContain('EDGE — Enhancing Digital Government and Economy');
  });

  test('About: the "Government Contracts and University Partnerships" entry expands EDGE and leaves SKIT as is', async ({ page }) => {
    await open(page, 'about/');
    const item = compact(await page.locator('#story .timeline__item', { hasText: 'Government Contracts and University Partnerships' }).textContent());
    expect(item).toContain(`including Her Power, ${EDGE} and SKIT;`);
  });

  test('Governments: "What Each Government Contract Covers" expands EDGE at its first use on the page, and SKIT keeps its row as is', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const table = compact(await page.locator('#contracts').textContent());
    expect(table).toContain(`${EDGE}: Center for Project Management and Information Systems (PMIS), University of Dhaka, with the Bangladesh Computer Council (BCC)`);
    expect(table).toContain('SKIT Incubator (Bangladesh Hi-Tech Park Authority)');
    const main = compact(await page.locator('main').textContent());
    expect(main.indexOf('EDGE'), 'the first EDGE on the page is the expanded one').toBe(main.indexOf(EDGE));
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP105 item 5: the Governments national-scale answer does not repeat the Her Power figures', () => {
  const Q = 'Can You Deliver at National Scale?';
  const ANSWER = 'We scale in phases. Her Power, a national program, met its full target with CodersTrust’s curriculum; the contract table above gives the figures. A 100,000+ program is a design option we have not yet delivered.';

  test('the answer, its JSON-LD and its fact attribution (GV-01, PD-05) read the new wording', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: Q }) });
    await expect(item).toHaveCount(1);
    const answer = compact(await item.locator('.faq__a').textContent());
    expect(answer).toBe(ANSWER);
    expect(answer).not.toMatch(/2,400|2,500|25,125|trained/);
    expect(answer.split(/(?<=\.)\s+/)).toHaveLength(3);
    expect(await item.locator('.faq__a p').getAttribute('data-fact')).toBe('GV-01 PD-05');
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').allTextContents()).find((t) => t.includes('FAQPage')) ?? '{}');
    const nodes = ld['@graph'] ?? [ld];
    const faq = nodes.find((n: { '@type'?: string }) => n['@type'] === 'FAQPage');
    expect(faq.mainEntity.find((e: { name: string }) => e.name === Q).acceptedAnswer.text).toBe(ANSWER);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP105 item 6: the NU overview says "College Code: 6634" once in the Recognition row and once in the course lead, not in the Context band', () => {
  test('the Context band keeps its heading and drops the affiliated-college sentence', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    await expect(page.locator('#guide h2')).toHaveText('An Affiliated College of National University');
    const band = compact(await page.locator('#guide').textContent());
    expect(band).not.toContain('College Code');
    expect(band).not.toContain('is an affiliated college');
    expect(band).toContain('Practical digital-skills courses, delivered by CodersTrust.');
  });

  test('the sentence stays in the Recognition row, and "College Code: 6634" is on the page twice (the course lead and the row)', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    const row = compact(await page.locator('.ba__row', { hasText: 'Recognition' }).textContent());
    expect(row).toContain('CodersTrust is an affiliated college (College Code: 6634) under the National University of Bangladesh.');
    expect(count(compact(await page.locator('main').textContent()), 'College Code: 6634')).toBe(2);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP105 item 7: the Privacy Policy names the careers inbox and the NU diploma help inbox', () => {
  test('"Email Inquiries" says Careers applications go to career@coderstrustbd.com and NU diploma help goes to hello@coderstrustbd.com', async ({ page }) => {
    await open(page, 'privacy-policy/');
    const section = page.locator('#email');
    const text = compact(await section.textContent());
    expect(text).toContain('Applications from the Careers page go to career@coderstrustbd.com.');
    expect(text).toContain('Help requests from the National University Post Graduate Diploma page go to hello@coderstrustbd.com.');
    await expect(section.locator('a[href="mailto:career@coderstrustbd.com"]')).toHaveCount(1);
    await expect(section.locator('a[href="mailto:hello@coderstrustbd.com"]')).toHaveCount(2); // the local-partners line and the NU line (the general line is contact@coderstrust.global)
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP105 item 8: JobReady@Campus option 1 is "Multi-Cohort Pilot Program"', () => {
  test('the first option card carries the shared name and its own description', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    const first = page.locator('article.offer', { hasText: 'Prove the model with a first campus program.' }).first();
    await expect(first.locator('h3')).toHaveText('Multi-Cohort Pilot Program');
    expect(compact(await first.textContent())).toContain('Prove the model with a first campus program.');
  });

  test('no built page, JSON-LD included, says "First Multi-Cohort Program"', () => {
    expect(listPages().filter((p) => readFileSync(p.file, 'utf8').includes('First Multi-Cohort Program')).map((p) => p.route)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP105 item 9: stamps and dateModified of the pages this WP changes read 2026-10-29', () => {
  // WP129: every page here except Independent Evaluation changed again on 30 October (WP126 to WP128) and moved on to 2026-10-31.
  const STAMPED = [
    { route: 'privacy-policy/', selector: '.lf-updated', day: 'November 3, 2026', iso: '2026-11-03' }, // WP148: "Post Graduate Diploma" capitalised; WP161-A: the Video section and the legal-basis line
    { route: 'impact/independent-evaluation/', selector: '.lf-updated', day: 'November 27, 2026', iso: '2026-11-27' }, // WP172 (owner decision 2026-11-27: the published study's trial figures) moved it to 2026-11-27. Earlier: WP168-B (R4-09). Earlier: WP166-C (the marketing-effectiveness review). Earlier: WP134: WP133 changed its text
    // WP166-B: the three program pages below changed again on 21 November 2026 (the marketing review R2); they read November 3, November 2 and November 3, 2026.
    { route: 'programs/youthwide/', selector: '.updated', day: 'November 28, 2026', iso: '2026-11-28' }, // WP175 (owner decision Q5 of 2026-11-28: the crafted C6 statement) moved it to 2026-11-28. Earlier: WP172 (owner decision 2026-11-27: the published study's trial figures) moved it to 2026-11-27. Earlier: WP166-B. Earlier: WP163 (one exam fee per trainee; the delivery model). Earlier: WP151
    { route: 'programs/nu-postgraduate-diploma/', selector: '.updated', day: 'November 28, 2026', iso: '2026-11-28' }, // WP175 (owner decisions of 2026-11-28: the CMF v3 order and coverage; it read November 26, WP170). Earlier: WP168-B (campus, next intake, installments). Earlier: WP166-B. Earlier: WP151 (WP148: as Privacy)
    { route: 'programs/jobready-campus/', selector: '.updated', day: 'November 28, 2026', iso: '2026-11-28' }, // WP175 (owner decision Q5 of 2026-11-28: the crafted C6 statement) moved it to 2026-11-28. Earlier: WP166-B. Earlier: WP163 (as YouthWIDE). Earlier: WP151

  ];
  for (const s of STAMPED) {
    test(`${s.route} reads "Last updated ${s.day}" and its JSON-LD dateModified is ${s.iso}`, async ({ page }) => {
      await open(page, s.route);
      expect(compact(await page.locator(s.selector).first().textContent())).toBe(`Last updated ${s.day}`);
      expect(await ldJson(page)).toMatch(new RegExp(`"dateModified"\\s*:\\s*"${s.iso}"`));
    });
  }

  // These three pages state no "Last updated" line, so their JSON-LD dateModified would otherwise be the build day (UTC).
  // WP151: Governments moved on to 2026-11-02 (the learner card label is "Individual Story"). WP152: About moved on to 2026-11-02 (the 2025–2026 timeline item is two sentences).
  // WP161-A: Governments moved on to 2026-11-03; WP161-B: Recognition moved on to 2026-11-02.
  // WP162 and WP163: About moved on to 2026-11-03 (the 2025–2026 timeline item's JobReady sentence).
  // WP166-A: About and Recognition and Media moved on to 2026-11-21; WP166-B: Governments did too (the marketing review R3; it was 2026-11-03).
  // WP167 (owner approval of 2026-11-23): About (the hero's identity paragraph) and Recognition and Media (the two honors' headings) moved on to 2026-11-23.
  for (const [route, day] of [['about/', '2026-11-27'], ['partner-with-us/governments/', '2026-11-28'], // WP172 (2026-11-27): the trial figures moved both on; WP175 (owner decision Q5 of 2026-11-28: the crafted C6 statement) moved it to 2026-11-28 (Governments)
     ['about/recognition/', '2026-11-23']]) {
    test(`${route} pins its JSON-LD dateModified to ${day} (the day it last changed: WP141, WP151, WP152, WP161, WP162, WP163), not the build date`, async ({ page }) => {
      await open(page, route);
      expect(await ldJson(page)).toMatch(new RegExp(`"dateModified"\\s*:\\s*"${day}"`));
    });
  }
});
