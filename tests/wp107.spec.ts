import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DIST_DIR } from './support/env';
import { open } from './support/browser';
import { listPages, pageByRoute } from './support/pages';

/**
 * WP107 (Sonnet XHigh run 3, kit 73; owner answer of 2026-10-29). Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp107.spec.ts --project=chromium`.
 *   - Item 1: Md. Shamsul Haque is "CEO of CodersTrust Bangladesh" (the Team and Governance title) in every news post, excerpt and card.
 *   - Item 2: "organized by the University for Peace (UPEACE)", never "United Nations University for Peace".
 *   - Item 3: PX-08 reads "job postings ... all postings ... workers with AI skills earned a 62% wage premium" (the numbers are unchanged).
 *   - Item 4: the YouthWIDE meta description does not narrow the 2030 aim to Bangladesh.
 *   - Item 5: the trial page's last band is "How We Track Outcomes", with the answer directly under the H2 (no single-question FAQ).
 *   - Item 6: the Pope Francis photo caption is "Greeting Pope Francis".
 *   - Item 7: the Discovery Education post reads "... Discovery Education STEM and Coding Content ..." (the URL slug keeps the old words).
 *   - Item 8: the NCTB post spells the Country Director "Ataul Goni Osmani".
 *   - Every news post changed here carries `updated: 2026-10-29` and a JSON-LD dateModified of 2026-10-29.
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
const metaContent = async (page: Page, sel: string) => (await page.locator(sel).first().getAttribute('content')) ?? '';

/** Every text file in dist/ (pages, redirect stubs, feeds, llms.txt, sitemaps). */
function distTextFiles(dir = DIST_DIR, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) distTextFiles(full, out);
    else if (/\.(html|xml|txt|json|webmanifest|md)$/.test(name)) out.push(full);
  }
  return out;
}
const offenders = (re: RegExp) =>
  distTextFiles()
    .filter((f) => re.test(readFileSync(f, 'utf8')))
    .map((f) => f.slice(DIST_DIR.length));

const post = (slug: string) => readFileSync(`src/content/news/${slug}.md`, 'utf8');
const routeOf = (slug: string) => `news/${slug}/`;

const BASIS = 'coderstrust-and-basis-asset-collaborate-to-build-bangladeshs-it-future';
const DOICT = 'coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment';
const OSTITTO = 'coderstrust-bangladesh-and-ostitto-join-forces-to-bridge-the-digital-divide';
const UPEACE_MOU = 'coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration';
const NSU = 'mou-signing-ceremony-between-north-south-university-coderstrust';
const NCTB = 'coderstrust-seals-groundbreaking-mou-with-nctb-paving-the-way-for-competency-based-learning-opportunities';
const AMERICA_WEEK = 'celebrating-america-week-with-the-u-s-embassy-dhaka';
const PRESS_FREEDOM = 'aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day';
const DISCOVERY = 'coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners';

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107 item 1: Md. Shamsul Haque is "CEO of CodersTrust Bangladesh" in the news posts', () => {
  const CASES: [string, string, string][] = [
    ['BASIS-ASSET', BASIS, 'The CEO of CodersTrust Bangladesh, Md. Shamsul Haque, signed the agreement on behalf of CodersTrust.'],
    ['DoICT Training of Trainers', DOICT, 'said Mr. Md. Shamsul Haque, CEO of CodersTrust Bangladesh.'],
    ['Ostitto', OSTITTO, 'Mr. Shamsul Haque, CEO of CodersTrust Bangladesh, and Former Additional Foreign Secretary emphasized'],
    ['UPEACE partnership', UPEACE_MOU, 'Md. Shamsul Haque, CEO of CodersTrust Bangladesh, were present among others.'],
    ['NSU MOU', NSU, 'Mr. Md. Shamsul Haque, CEO of CodersTrust Bangladesh, along with Mr. Md. Iqbal Hassan Ferdous (CRO)'],
    ['NCTB MOU', NCTB, 'Chairman of NCTB and CodersTrust Bangladesh CEO Md. Shamsul Haque signed the document'],
    ['America Week', AMERICA_WEEK, 'CodersTrust was proudly represented by CodersTrust Bangladesh CEO Md. Shamsul Haque, former Additional Foreign Secretary of Bangladesh, and his team'],
  ];
  for (const [name, slug, sentence] of CASES) {
    test(`${name}: the post says "${sentence.slice(0, 60)}…" (visible text, source and page)`, async ({ page }) => {
      expect(visible(htmlOf(`/${routeOf(slug)}`))).toContain(sentence);
      expect(compact(post(slug).replace(/\n/g, ' '))).toContain(sentence);
      await open(page, routeOf(slug));
      expect(compact(await page.locator('main').textContent())).toContain(sentence);
    });
  }

  test('the America Week excerpt (meta description, News index card) says "CodersTrust Bangladesh CEO Md. Shamsul Haque", within 155 characters', async ({ page }) => {
    const EXCERPT = 'CodersTrust Bangladesh CEO Md. Shamsul Haque and the team attend the U.S. Ambassador’s reception for National Day and America Week in Dhaka.';
    expect(EXCERPT.length).toBeLessThanOrEqual(155);
    expect(post(AMERICA_WEEK)).toContain(`excerpt: "${EXCERPT}"`);
    await open(page, routeOf(AMERICA_WEEK));
    expect(await metaContent(page, 'meta[name="description"]')).toBe(EXCERPT);
    expect(visible(htmlOf('/news/'))).toContain(EXCERPT);
    expect(offenders(/CEO Md\. Shamsul Haque and the CodersTrust team/)).toEqual([]);
  });

  test('no page, feed or llms.txt calls him "CEO of CodersTrust" or "CodersTrust CEO" without "Bangladesh" (Aziz Ahmad’s "CEO of UTC Associates" and the CRO are unaffected)', () => {
    const bad: string[] = [];
    for (const f of distTextFiles()) {
      const text = readFileSync(f, 'utf8');
      for (const m of text.matchAll(/CEO of CodersTrust(?! Bangladesh)|CodersTrust CEO|(?<!Bangladesh )CEO Md\. Shamsul Haque/g)) {
        bad.push(`${f.slice(DIST_DIR.length)}: …${text.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, ' ')}…`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('Team and Governance still say "CEO, CodersTrust Bangladesh" (the title the posts now match)', () => {
    expect(readFileSync('src/content/team/shamsul-haque.md', 'utf8')).toContain('role: "CEO, CodersTrust Bangladesh"');
  });

  test('the Base Study Concern post keeps "Rezaul Karim Khan, Chief Business Officer of CodersTrust Bangladesh" (dated archive title; Team gives no organization to contradict it)', () => {
    const slug = 'coderstrust-bangladesh-signs-strategic-mou-with-base-study-concern-to-enhance-global-education-opportunities';
    expect(post(slug)).toContain('Rezaul Karim Khan, Chief Business Officer of CodersTrust Bangladesh');
    expect(readFileSync('src/content/team/rezaul-karim-khan.md', 'utf8')).toContain('role: "Chief Business Officer"');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107 item 2: the World Press Freedom Day side event was organized by the University for Peace (UPEACE)', () => {
  test('the post says "organized by the University for Peace (UPEACE)"', async ({ page }) => {
    await open(page, routeOf(PRESS_FREEDOM));
    expect(compact(await page.locator('main').textContent())).toContain('organized by the University for Peace (UPEACE) as a side event in observance of World Press Freedom Day');
  });

  test('"United Nations University for Peace" is on no page, feed or llms.txt', () => {
    expect(offenders(/United Nations University for Peace/i)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107 item 3: the AI-skills statistic (PX-08) says what the PwC barometer measures', () => {
  const TEXT = 'Globally, job postings requiring AI skills grew 69% vs. 9% for all postings, and workers with AI skills earned a 62% wage premium';

  test('the register fact reads as above and still starts "Globally" (claims rule 12)', () => {
    expect(fact('PX-08').text).toBe(TEXT);
    expect(fact('PX-08').sourceIds).toEqual(['PWC26']);
  });

  test('Investors “The Thesis”, third card, shows the sentence with its source note', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(compact(await page.locator('#thesis .th__more[data-fact="PX-08"]').textContent())).toBe(`${TEXT} (PwC, 2026).`);
  });

  test('the old sentence is on no page, feed or llms.txt', () => {
    expect(offenders(/jobs requiring AI skills grew 69%/)).toEqual([]);
    expect(offenders(/9% for all jobs/)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107 item 4: the YouthWIDE meta description does not narrow the 2030 aim to Bangladesh', () => {
  const DESCRIPTION = 'YouthWIDE trains educated, unemployed and underemployed youth for paid digital work: co-funded cohorts designed for three regions, with a 2030 aim.';

  test('description, og:description, twitter:description and JSON-LD all read as above (155 characters or fewer)', async ({ page }) => {
    expect(DESCRIPTION.length).toBeLessThanOrEqual(155);
    await open(page, 'programs/youthwide/');
    expect(await metaContent(page, 'meta[name="description"]')).toBe(DESCRIPTION);
    expect(await metaContent(page, 'meta[property="og:description"]')).toBe(DESCRIPTION);
    expect(await metaContent(page, 'meta[name="twitter:description"]')).toBe(DESCRIPTION);
    expect(await ldJson(page)).toContain(`"description":"${DESCRIPTION}"`);
  });

  test('no built page keeps "2030 aim in Bangladesh"', () => {
    expect(offenders(/2030 aim in Bangladesh/)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107 item 5: the trial page ends with "How We Track Outcomes", the answer directly under the H2', () => {
  const ANSWER =
    'For every cohort, as agreed in the program scope, we plan a baseline at enrollment, follow-up surveys at 3, 6 and 12 months and monthly reports. Where available, offer letters, payslips, platform logs or bank receipts document work and earnings.';

  test('the last H2 is "How We Track Outcomes"; the section holds the answer paragraph and nothing else (no accordion, no H3, no question)', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    const h2s = (await page.locator('main h2.rsec__title').allTextContents()).map(compact); // the report bands; the closing "next step" band follows them
    expect(h2s.at(-1)).toBe('How We Track Outcomes');
    expect(h2s).not.toContain('Questions Funders Ask');
    const section = page.locator('section.rsec', { has: page.locator('h2', { hasText: 'How We Track Outcomes' }) });
    await expect(section).toHaveCount(1);
    const children = section.locator('.rsec__body > *');
    await expect(children).toHaveCount(1);
    expect(await children.first().evaluate((el) => el.tagName)).toBe('P');
    expect(compact(await children.first().textContent())).toBe(ANSWER);
    expect(await children.first().getAttribute('data-fact')).toBe('PD-09 PD-08 RC-01');
    await expect(section.locator('details, summary, h3')).toHaveCount(0);
  });

  test('the page has no "How Do You Track Outcomes?" question, no "Questions Funders Ask", and the contents list names the band', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    const body = compact(await page.locator('body').textContent());
    expect(body).not.toContain('How Do You Track Outcomes?');
    expect(body).not.toContain('Questions Funders Ask');
    const link = page.locator('a[href="#outcomes"]');
    await expect(link.first()).toHaveText('How We Track Outcomes');
    await expect(page.locator('#outcomes')).toHaveCount(1);
    await expect(page.locator('#faq')).toHaveCount(0);
  });

  test('there is no FAQPage JSON-LD on the page (one question only), and the answer text is printed once', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    expect(await ldJson(page)).not.toContain('FAQPage');
    expect(compact(await page.locator('main').textContent()).split(ANSWER).length - 1).toBe(1);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107 item 6: the Pope Francis photograph is captioned "Greeting Pope Francis"', () => {
  for (const route of ['impact/in-the-field/', 'about/team/aziz-ahmad/']) {
    test(`${route} captions it "Greeting Pope Francis" and keeps the descriptive alt text`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('figcaption', { hasText: 'Greeting Pope Francis' })).toHaveCount(1);
      await expect(page.locator('figcaption', { hasText: 'Meeting Pope Francis' })).toHaveCount(0);
      const alts = await page.locator('img[alt*="Pope Francis"]').evaluateAll((els) => els.map((e) => e.getAttribute('alt')));
      expect(alts).toEqual(['A man greeting Pope Francis, with a cardinal standing beside them']);
    });
  }

  test('"Meeting Pope Francis" is on no page', () => {
    expect(offenders(/Meeting Pope Francis/)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107 item 7: the Discovery Education post names the content, not "the Global Leader of STEM Education"', () => {
  const H1 = 'CodersTrust Brings Discovery Education STEM and Coding Content to Bangladeshi Schools and Learners';

  test('H1, <title> (60 characters or fewer), og:title, NewsArticle headline and front-matter title agree; the slug is unchanged', async ({ page }) => {
    await open(page, routeOf(DISCOVERY));
    expect(compact(await page.locator('h1').textContent())).toBe(H1);
    const title = await page.title();
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).not.toContain('Global Leader');
    expect(await ldJson(page)).toContain(`"headline":"${H1}"`);
    expect(post(DISCOVERY)).toContain(`title: "${H1}"`);
    expect(page.url()).toContain(`/${DISCOVERY}/`);
  });

  test('the News index card (H3) carries the new headline, and the old headline is on no page, feed or llms.txt', () => {
    expect(visible(htmlOf('/news/'))).toContain(H1);
    expect(offenders(/Global Leader of STEM/)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107 item 8: the NCTB post spells the Country Director "Ataul Goni Osmani"', () => {
  test('the post says "Ataul Goni Osmani, Country Director of CodersTrust" and no file says "Ataul Gani"', async ({ page }) => {
    await open(page, routeOf(NCTB));
    expect(compact(await page.locator('main').textContent())).toContain('and Ataul Goni Osmani, Country Director of CodersTrust.');
    expect(offenders(/Ataul Gani/)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP107: every news post changed here carries `updated: 2026-10-29` and a JSON-LD dateModified of that day', () => {
  const SLUGS = [BASIS, DOICT, OSTITTO, UPEACE_MOU, NSU, NCTB, AMERICA_WEEK, PRESS_FREEDOM, DISCOVERY];
  for (const slug of SLUGS) {
    test(`${slug.slice(0, 60)}`, async ({ page }) => {
      expect(post(slug)).toMatch(/^updated: 2026-10-29$/m);
      await open(page, routeOf(slug));
      const ld = await ldJson(page);
      expect(ld).toMatch(/"dateModified"\s*:\s*"2026-10-29"/);
      expect(ld).not.toMatch(/"dateModified"\s*:\s*"(?!2026-10-29)[^"]*"/);
    });
  }

  test('the pages listed are all in the build inventory', () => {
    const routes = new Set(listPages().map((p) => p.route));
    for (const slug of SLUGS) expect(routes.has(`/${routeOf(slug)}`), slug).toBe(true);
  });
});
