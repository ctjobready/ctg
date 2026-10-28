import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { TRIAL_OFFERED, TRIAL_WOMEN, WSDFM_NOT_TRIAL_NOTE } from '../src/data/copy';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP62 behaviors (cycle-34 whole-site reviews, Perplexity models; triage items 1 to 10). Retrospective coverage (the owner exempted this project from test-first work);
 * each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp62.spec.ts --project=chromium`):
 *   - 1: Home slide 1 is "Women Offered a Place Earned an Estimated 41% More per Month" (RC-01's 41% is a monthly income difference), within the carousel’s height budget;
 *   - 2: Home’s press line is one pointer sentence to Recognition and Media that names Kosovo and Albania (no outlet, no link of its own); Recognition and Media prints the full line, with its ten links, in the coverage band (rework R1, R2);
 *   - 3: Foundations’ fourth glance tile is a program record, not the +$27 tile (WP62: the WSDFM record, 711 of 1,000, with the note the Impact tile has, rework R3; WP65: the UNDP YES, Korail record, 67%, in its place);
 *   - 4: the partner hub’s steps band is "From First Conversation to First Cohort", and its lead no longer opens with the sentence the heading now says;
 *   - 5: Development Partners’ UNDP YES tile names the program’s year (2017, from PR-03); the Impact tile keeps the register’s label;
 *   - 6: the "Will This Work in Our Country?" answer (the bank’s Q1, its audience variants and YouthWIDE’s own) adds Digital Jobs Albania as delivery experience, not results (reworded by WP63 as two sentences, the same on YouthWIDE);
 *   - 7: Home’s "Proof in Practice" link is "See All Case Studies";
 *   - 8: the "Where They Work" card says "Placement support, then outcome tracking for 12 months after each course, as agreed in the program scope." (WP67, cycle-38 review: the sentence ended at "course.") on Home, YouthWIDE and the shared mechanism band, as on Development Partners;
 *   - 9: "Reach Since 2014" says "since 2014" once: Home’s hero card and the hub’s "Why Partner" tile drop it from their supporting line; the Impact tile (no such label) keeps it;
 *   - 10: Governments’ first "What Your Agency Gets" card ends "... placement support toward local, remote and global work."
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

/** Built pages that are not archived news posts (those keep their original wording), with their HTML. */
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The visible text of a built page (no scripts, styles or screen-reader-only parts), entities decoded. */
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
/** The routes of the built site pages whose visible text contains any of these strings. */
const pagesWith = (...needles: string[]) => sitePages().filter((p) => needles.some((n) => visible(p.html).includes(n))).map((p) => p.route);

/** Every FAQPage question and answer text in the page's JSON-LD. */
async function faqJsonLd(page: Page) {
  const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: { name: string; text: string }[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      const o = n as Record<string, unknown>;
      if (o['@type'] === 'FAQPage') for (const q of (o.mainEntity as { name: string; acceptedAnswer?: { text: string } }[]) ?? []) out.push({ name: q.name, text: q.acceptedAnswer?.text ?? '' });
      Object.values(o).forEach(walk);
    }
  };
  blobs.forEach((b) => walk(JSON.parse(b)));
  return out;
}

/** The measure of tests/hero-slider.spec.ts (its budget is 48 px at 1280 and 390): unused space between the showing slide's content and the controls bar. */
const unusedBelow = (page: Page) =>
  page.evaluate(() => {
    const active = document.querySelector('[data-hs-slide].is-active');
    const controls = document.querySelector('[data-hs-bar]');
    if (!active || !controls) return Number.NaN;
    const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
    const contentBottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom));
    return Math.round(controls.getBoundingClientRect().top - contentBottom);
  });
async function showSlide(page: Page, n: number) {
  await page.locator('[data-hs-dot]').nth(n - 1).click();
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')))).toBe(n - 1);
  await page.waitForTimeout(450);
}

const HOME = '';
const HUB = 'partner-with-us/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const DEV_PARTNERS = 'partner-with-us/development-partners/';
const GOVERNMENTS = 'partner-with-us/governments/';
const IMPACT = 'impact/';
const YOUTHWIDE = 'programs/youthwide/';
const RECOGNITION = 'about/recognition/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 1 (GPT-6.1 Sol, Kimi): Home slide 1 says the 41% is monthly', () => {
  const TITLE = 'Women Offered a Place Earned an Estimated 41% More per Month';

  test('the register says the 41% is a monthly income difference (RC-01), which is what the heading now says', () => {
    expect(fact('RC-01').text).toContain('Their monthly income was an estimated 41% higher');
    expect(fact('RC-01').stat?.label).toContain('estimated monthly income gain');
    expect(fact('RC-01').stat?.value).toBe('+41%');
  });

  test('the heading, its slide label and its Title Case; the eyebrow and facts are unchanged (the lead is WP63’s: "women offered a place had ..."); no built page keeps the heading without "per Month"', async ({ page }) => {
    await open(page, HOME);
    const first = slide(page, 1);
    await expect(first.locator('h3')).toHaveText(TITLE);
    expect(TITLE).toBe(titleCase(TITLE));
    expect(await first.locator('h3').getAttribute('data-fact')).toBe('RC-01');
    await expect(first).toHaveAttribute('aria-label', `1 of 4: ${TITLE}`);
    await expect(first.locator('.hs__eyebrow')).toHaveText('Randomized Trial of CodersTrust’s WSDFM Program');
    expect(compact(await first.locator('.hs__lead').textContent())).toBe('In CodersTrust’s WSDFM program, women offered a place had an estimated 41% higher monthly income than the control group, about $27 more a month.'); // WP63 (cycle-35 review, GLM L4)
    expect(sitePages().filter((p) => /Earned an Estimated 41% More(?! per Month)/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  test('the longer heading keeps the carousel’s height budget: no slide leaves more than 48 px unused at 1280 and 390, and nothing scrolls sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      for (const n of [1, 2, 3, 4]) {
        await showSlide(page, n);
        expect(await unusedBelow(page), `slide ${n} at ${vp.width}px`).toBeLessThanOrEqual(48);
      }
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WP62 rework (R1, R2): the first pass named Kosovo alone on Home and left the ten press and World Bank links on no page, because Recognition and Media printed no Albania release; the full line is printed on that page now and Home’s pointer names both places.
test.describe('Item 2 (Kimi, GPT-6.1 Sol, Gemini; rework R1 and R2): Home’s press line is one pointer sentence; Recognition and Media prints the line with its links', () => {
  const POINTER = 'Early press coverage, 2014–2016, and World Bank coverage of our work in Kosovo and Albania are on the Recognition and Media page.';
  const LINE = 'World Bank coverage: Kosovo (2016, 2017) and Albania (2021).'; // WP87: the outlets sentence is gone; the links are on the cards
  const TECHCRUNCH = 'https://techcrunch.com/2014/06/13/building-code-to-break-poverty-in-bangladesh/';
  const withoutSrOnly = (selector: string) => (page: Page) =>
    page.locator(selector).first().evaluate((el) => {
      const c = el.cloneNode(true) as HTMLElement;
      c.querySelectorAll('.sr-only').forEach((n) => n.remove());
      return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
    });

  test('Home: the recognition band keeps its three badges, then the one-sentence pointer naming Kosovo and Albania (no outlet, no link of its own), then the link to Recognition and Media', async ({ page }) => {
    await open(page, HOME);
    const band = page.locator('#recognition');
    await expect(band.locator('h3')).toHaveText(['University Partners', 'Amazon Web Services (AWS)', 'HolonIQ South Asia EdTech 100']); // WP63 (cycle-35 review, Gemini M3)
    const line = band.locator('p.cov');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(POINTER);
    await expect(line.locator('a')).toHaveCount(0);
    expect(await line.getAttribute('data-fact')).toBe('PA-09 PA-13');
    expect(compact(await band.textContent())).not.toMatch(/Gulf News|TechCrunch|Forbes|Wall Street Journal|USA Today|Tech in Asia|Times of India/);
    await expect(band.locator('p.cov + p.rec__press a')).toHaveText('See All Recognition and Media');
    await expect(band.locator('a[href^="http"]')).toHaveCount(0);
  });

  test('Recognition and Media: the World Bank line is one paragraph with its three links, each with rel and screen-reader text, in a section of its own after the coverage band (WP87)', async ({ page }) => {
    await open(page, RECOGNITION);
    const line = page.locator('#world-bank p.cov');
    await expect(line).toHaveCount(1);
    expect(await withoutSrOnly('#world-bank p.cov')(page)).toBe(LINE);
    expect(await line.getAttribute('data-fact')).toBe('PA-13');
    await expect(line.locator('a')).toHaveCount(3);
    expect(await line.locator('a').evaluateAll((as) => as.every((a) => /noopener/.test(a.getAttribute('rel') ?? '') && a.getAttribute('href')!.startsWith('https://')))).toBe(true);
    expect(await line.locator('a .sr-only').count()).toBe(3);
    await expect(line.locator('img, svg, picture')).toHaveCount(0);
    const order = await page.evaluate(() => {
      const follows = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { coverageThenLine: follows(document.querySelector('#coverage')!, document.querySelector('#world-bank')!), lineThenKit: follows(document.querySelector('#world-bank')!, document.querySelector('#press-kit')!) };
    });
    expect(order).toEqual({ coverageThenLine: true, lineThenKit: true });
  });

  // WP87: the cards link their articles themselves, so the line repeats only the one World Bank article a card also is (the 2016 Kosovo story)
  test('the Kosovo 2016 story is the only link the World Bank line shares with a card', async ({ page }) => {
    await open(page, RECOGNITION);
    const cards = await page.locator('ul.rec-press .rec-press__headline a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    const lineLinks = await page.locator('p.cov a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(cards).toHaveLength(8);
    expect(lineLinks.filter((h) => cards.includes(h))).toEqual(['https://web.archive.org/web/20170504003520/http://www.worldbank.org/en/news/feature/2016/09/19/kosovos-women-go-wow-online-and-working']);
    expect(await page.locator(`a[href="${TECHCRUNCH}"]`).count()).toBe(1);
  });

  test('the pointer names exactly the World Bank places the line prints, and the years it names are the outlets’ own', async ({ page }) => {
    await open(page, RECOGNITION);
    const line = await withoutSrOnly('#world-bank p.cov')(page);
    const places = [...line.matchAll(/(?:World Bank coverage:| and) (Kosovo|Albania) \(/g)].map((m) => m[1]);
    expect(places).toEqual(['Kosovo', 'Albania']);
    expect(POINTER).toContain(`our work in ${places.join(' and ')} are on`);
    const outletYears = (await page.locator('ul.rec-press li time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')))).sort();
    expect(`${outletYears[0]}–${outletYears[outletYears.length - 1]}`).toBe('2014–2016');
    expect(POINTER).toContain('Early press coverage, 2014–2016,');
  });

  test('the line fits at 1280 and 390 px with no sideways scroll, and its links stay inside the page', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const route of [HOME, RECOGNITION]) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route || 'home'} at ${vp.width}px`).toBe(true);
        const box = await page.locator('p.cov').first().evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: window.innerWidth };
        });
        expect(box.left, `${route || 'home'} at ${vp.width}px`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${route || 'home'} at ${vp.width}px`).toBeLessThanOrEqual(box.width);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WP65 (cycle-37 review, GPT-6.1 Sol, Gemini) supersedes this item's tile: "711 of 1,000" and its not-the-trial note stood in the glance and again on the Proof in Practice WSDFM card, so the fourth glance tile is the UNDP YES, Korail record (PR-03)
// and the WSDFM program records are stated once, on the card (tests/wp65.spec.ts).
test.describe('Item 3 (Grok, GPT-6.1 Sol, Gemini; superseded by WP65): Foundations’ fourth glance tile is a program record, not the +$27 tile', () => {
  test('the glance runs trial, survey, Kosovo, UNDP YES; the fourth tile is "67%" with the label "... in UNDP YES, Korail (2017), found their first job within three months", tagged Program Record, linking the UNDP YES case study', async ({ page }) => {
    await open(page, FOUNDATIONS);
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-02', 'OC-03', 'PR-02', 'PR-03']);
    const tile = page.locator('#glance .pg__lead a[data-fact~="PR-03"]');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.pg__value')).toHaveText('67%');
    await expect(tile.locator('.pg__desc')).toHaveText('of the 350 enrolled in UNDP YES, Korail (2017), found their first job within three months');
    await expect(tile.locator('[data-evidence="Program Record"]')).toHaveCount(1);
    expect(await tile.getAttribute('data-fact')).toBe('PR-03');
    expect(await tile.getAttribute('href')).toMatch(/\/impact\/case-studies\/undp-yes-korail\/$/);
  });

  // WP62 rework (R3): the WSDFM tile said how its records relate to the trial, in the string the Impact page's WSDFM tile has (one source, WSDFM_NOT_TRIAL_NOTE in src/data/copy.ts). WP65: Foundations no longer has that tile, so the Impact page's tile is the note's one user.
  test('the not-the-trial note is the Impact page’s WSDFM tile note, from one source: "Program records, not trial results; the 425 women offered a place in the randomized trial were among these 1,000." (19 words, the 425 being RC-07’s); the Foundations glance no longer carries it', async ({ page }) => {
    const NOTE = 'Program records, not trial results; the 425 women offered a place in the randomized trial were among these 1,000.';
    expect(WSDFM_NOT_TRIAL_NOTE).toBe(NOTE);
    expect(TRIAL_WOMEN).toBe('833');
    expect(TRIAL_OFFERED).toBe('425');
    expect(fact('RC-07').text).toContain('833 women at baseline');
    expect(NOTE.split(/\s+/)).toHaveLength(19);
    await open(page, FOUNDATIONS);
    await expect(page.locator('#glance')).not.toContainText('Program records, separate from the randomized trial');
    await open(page, IMPACT);
    const impact = page.locator('#glance a[data-fact~="PR-01"]');
    await expect(impact.locator('.glance__note')).toHaveText(NOTE);
    expect(await impact.getAttribute('data-fact')).toBe('PR-01 PR-06 RC-07');
    // the Foundations tile (the single secondary tile joins the main group) stays inside the page at 1280 and 390, with its label shown on a phone too
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, FOUNDATIONS);
      await expect(page.locator('#glance .pg__lead a[data-fact~="PR-03"] .pg__desc')).toBeVisible();
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  test('the figure and the share are the register’s (PR-01), and the +$27 is not stated anywhere in the page body (WP108: nor in the meta description, which leads with the +10.3 employment result)', async ({ page }) => {
    expect(fact('PR-01').stat?.value).toBe('711 of 1,000');
    expect(fact('PR-01').stat?.label).toBe('WSDFM: 71% of enrolled women in work');
    await open(page, FOUNDATIONS);
    expect(compact(await page.locator('main').textContent())).not.toContain('+$27');
    await expect(page.locator('#glance a[data-fact~="RC-04"]')).toHaveCount(0);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toContain('women offered a place were 10.3 points more likely to be employed');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).not.toContain('$27');
  });

  test('the trial fills one of four tiles now (the +10.3), and the four tiles sit in one row at 1280 with no sideways scroll at 390', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, FOUNDATIONS);
    expect(await page.locator('#glance .pg__lead a [data-evidence="Randomized Trial"]').count()).toBe(1);
    const tops = await page.locator('#glance .pg__lead > li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size, 'one row at 1280').toBe(1);
    await page.setViewportSize(MOBILE);
    await open(page, FOUNDATIONS);
    expect(await noOverflow(page)).toBe(true);
  });

  // WP65 (cycle-37 review): Foundations carries no WSDFM tile in its glance either now (the WSDFM program records are on its Proof in Practice card)
  test('Development Partners, Governments and Foundations carry no WSDFM tile in their glance', async ({ page }) => {
    for (const route of [DEV_PARTNERS, GOVERNMENTS, FOUNDATIONS]) {
      await open(page, route);
      await expect(page.locator('#glance [data-fact~="PR-01"]'), route).toHaveCount(0);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 4 (GLM, Grok): the partner hub’s steps band', () => {
  const HEADING = 'From First Conversation to First Cohort';

  test('the heading is "From First Conversation to First Cohort"; the lead keeps the procurement sentence and no longer opens with "Four steps from first conversation to first cohort."; the anchor and the four steps are unchanged', async ({ page }) => {
    await open(page, HUB);
    await expect(page.locator('#how-h')).toHaveText(HEADING);
    expect(HEADING).toBe(titleCase(HEADING));
    expect(compact(await page.locator('#how-partnering-works .sh__lead').textContent())).toBe('Target timing for grant-funded pilots; public procurement follows the agency’s own timeline.');
    expect(compact(await page.locator('#how-h').locator('xpath=preceding-sibling::*[1]').textContent())).toBe('For Grant-Funded Supported Cohorts');
    await expect(page.locator('#how-partnering-works ol > li')).toHaveCount(4);
    expect(await page.locator('#how-partnering-works [data-fact="PD-04"]').count()).toBeGreaterThan(0);
  });

  test('"Your First 90 Days" and the sentence the heading replaced are on no built page', () => {
    expect(pagesWith('Your First 90 Days', 'Four steps from first conversation to first cohort')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 5 (Grok): the UNDP YES tile names its year', () => {
  test('Development Partners: "... in UNDP YES, Korail (2017), found their first job within three months", the year being PR-03’s', async ({ page }) => {
    expect(/, (\d{4}): [\d,]+ enrolled;/.exec(fact('PR-03').text)?.[1]).toBe('2017');
    await open(page, DEV_PARTNERS);
    const tile = page.locator('#glance .pg__lead a[data-fact="PR-03"]');
    await expect(tile.locator('.pg__desc')).toHaveText('of the 350 enrolled in UNDP YES, Korail (2017), found their first job within three months');
    await expect(tile.locator('.pg__value')).toHaveText('67%');
    await expect(tile.locator('[data-evidence="Program Record"]')).toHaveCount(1);
  });

  test('the register’s glance label is unchanged, and the Impact tile (whose note already gives the year) does not say 2017 twice', async ({ page }) => {
    expect(fact('PR-03').stat?.glance?.label).toBe('of the 350 enrolled in UNDP YES, Korail, found their first job within three months');
    await open(page, IMPACT);
    const tile = page.locator('#glance a[data-fact~="PR-03"]');
    await expect(tile.locator('.glance__desc')).toHaveText('of the 350 enrolled in UNDP YES, Korail, found their first job within three months');
    await expect(tile.locator('.glance__note')).toHaveText('A 2017 program in Dhaka’s Korail settlement.');
    expect(((await tile.textContent()) ?? '').match(/2017/g)?.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WP63 (cycle-35 review, GPT-6.1 Sol G2) supersedes WP62's wording of the answer (one long second sentence with two semicolons) with two plain sentences; Albania still adds delivery experience, not results, and the answer still rests on TL-05.
test.describe('Item 6 (Sonnet, Gemini; reworded by WP63, GPT-6.1 Sol G2): "Will This Work in Our Country?" adds Digital Jobs Albania as delivery experience, not results', () => {
  const FIRST = 'We test local employer demand first and choose each country’s tracks with local partners.';
  const SECOND = 'Our outcome evidence comes mainly from Bangladesh, with program results from Kosovo and delivery experience in Albania.';
  const answerOf = async (page: Page) => {
    const item = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Will This Work in Our Country?' }) }).first();
    return compact(await item.locator('.faq__a').textContent());
  };

  test('the bank answer (Home) is two sentences; the second is the new one; the answer rests on TL-05 too (CodersTrust took part in Digital Jobs Albania)', async ({ page }) => {
    await open(page, HOME);
    const answer = await answerOf(page);
    expect(answer).toBe(`${FIRST} ${SECOND}`);
    expect(answer.split(/(?<=\.) (?=[A-Z])/)).toHaveLength(2);
    expect((await faqJsonLd(page)).find((q) => q.name === 'Will This Work in Our Country?')?.text).toBe(`${FIRST} ${SECOND}`);
    const evidence = (await page.locator('#faq details', { hasText: 'Will This Work in Our Country?' }).locator('.faq__a p').first().getAttribute('data-fact')) ?? '';
    expect(evidence.split(' ')).toEqual(['IN-02', 'PD-10', 'PR-02', 'TL-05']);
    expect(fact('TL-05').text).toContain('CodersTrust took part in Digital Jobs Albania');
  });

  test('the audience variants keep the second sentence (Development Partners, Governments, Universities), each opening with its own first sentence', async ({ page }) => {
    for (const [route, opening] of [
      [DEV_PARTNERS, 'We test local employer demand in your portfolio countries first and choose each country’s tracks with local partners.'],
      [GOVERNMENTS, 'We test local employer demand, lab access and facilitator supply first and choose each country’s tracks with local partners.'],
      ['partner-with-us/universities/', 'We test local employer demand for your graduates’ skills and your campus labs first, and choose each country’s tracks with local partners.'],
    ] as const) {
      await open(page, route);
      expect(await answerOf(page), route).toBe(`${opening} ${SECOND}`);
    }
  });

  test('YouthWIDE prints the same answer as the bank (one shorter answer for every page; the 16-countries sentence of WP60 is gone), on the page and in its structured data, resting on the same facts', async ({ page }) => {
    await open(page, YOUTHWIDE);
    expect(await answerOf(page)).toBe(`${FIRST} ${SECOND}`);
    expect((await faqJsonLd(page)).find((q) => q.name === 'Will This Work in Our Country?')?.text).toBe(`${FIRST} ${SECOND}`);
    const evidence = (await page.locator('#faq details', { hasText: 'Will This Work in Our Country?' }).locator('.faq__a p').first().getAttribute('data-fact')) ?? '';
    expect(evidence.split(' ')).toEqual(['IN-02', 'PD-10', 'PR-02', 'TL-05']);
  });

  test('the earlier wording is on no built page, and no page credits Albania with results', () => {
    expect(pagesWith('comes mainly from Bangladesh, and the Kosovo pilot adds program results')).toEqual([]);
    expect(pagesWith('the Kosovo pilot adds program results from outside it', 'Digital Jobs Albania adds delivery experience')).toEqual([]);
    expect(pagesWith('That depends on local demand')).toEqual([]);
    expect(pagesWith('Digital Jobs Albania adds program results', 'Digital Jobs Albania adds results')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 7 (Grok): Home’s case-study link', () => {
  test('"Proof in Practice" closes with "See All Case Studies", "Read the Trial Results" and "Impact Survey 2026"; "See All Five Case Studies" is on no built page', async ({ page }) => {
    await open(page, HOME);
    expect(await texts(page, '#cases .csc__more a')).toEqual(['See All Case Studies', 'Read the Trial Results', 'Impact Survey 2026']);
    expect(await page.locator('#cases .csc__more a').first().getAttribute('href')).toMatch(/\/impact\/case-studies\/$/);
    expect(pagesWith('See All Five Case Studies')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 8 (Gemini): the "Where They Work" card says how long outcomes are tracked', () => {
  const TEXT = 'Placement support, then outcome tracking for 12 months after each course, as agreed in the program scope.';

  test('the months are PD-02’s ("outcome tracking for 12 months after each course")', () => {
    expect(fact('PD-02').text).toContain('outcome tracking for 12 months after each course');
  });

  test('Home, YouthWIDE and Development Partners show the same card text', async ({ page }) => {
    for (const route of [HOME, YOUTHWIDE, DEV_PARTNERS]) {
      await open(page, route);
      const card = page.locator('#mechanism li', { has: page.locator('.model__label', { hasText: 'Where They Work' }) });
      await expect(card, route).toHaveCount(1);
      await expect(card.locator('.model__title'), route).toHaveText('Local, Remote and Global Work');
      expect(compact(await card.locator('.model__text').textContent()), route).toBe(TEXT);
    }
  });

  test('the shared mechanism band’s default says it too (the styleguide shows it), and the card text without the months is on no built page', () => {
    expect(pagesWith(TEXT)).toEqual(expect.arrayContaining(['/', '/programs/youthwide/', '/partner-with-us/development-partners/', '/styleguide/']));
    expect(pagesWith('Placement support and outcome tracking after each course.')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 9 (Gemini): "Reach Since 2014" says "since 2014" once', () => {
  test('the register is unchanged: SC-16 keeps "since 2014" in its text, label and glance label', () => {
    const sc16 = fact('SC-16');
    expect(sc16.text).toBe('130,000+ learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories');
    expect(sc16.stat?.label).toBe('learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories.');
    expect(sc16.stat?.glance?.label).toBe('learners trained since 2014');
    expect(sc16.stat?.glance?.note).toBe('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
  });

  test('Home’s hero card: the eyebrow is "Reach Since 2014"; the figure and caption do not repeat it, and nothing else in the card changes', async ({ page }) => {
    await open(page, HOME);
    const card = page.locator('.hh__card[data-fact="SC-16"]');
    await expect(card.locator('.hh__eyebrow')).toHaveText('Reach Since 2014');
    await expect(card.locator('.stat__value')).toHaveText('130,000+');
    await expect(card.locator('.stat__label')).toHaveText('learners trained through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
    expect((compact(await card.textContent()).match(/2014/g) ?? []).length).toBe(1);
  });

  test('the hub’s "Why Partner" tile: the kicker is "Reach Since 2014", the label "learners trained", the note unchanged', async ({ page }) => {
    await open(page, HUB);
    const tile = page.locator('#why-partner li[data-fact="SC-16"]');
    await expect(tile.locator('.wp__kicker')).toHaveText('Reach Since 2014');
    await expect(tile.locator('.wp__value')).toHaveText('130,000+');
    await expect(tile.locator('.wp__desc')).toHaveText('learners trained');
    await expect(tile.locator('.wp__note')).toHaveText('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
    expect((compact(await tile.textContent()).match(/2014/g) ?? []).length).toBe(1);
  });

  test('the Impact tile, which has no "Since 2014" label, keeps "learners trained since 2014"', async ({ page }) => {
    await open(page, IMPACT);
    const tile = page.locator('#glance a[data-fact~="SC-16"]');
    await expect(tile.locator('.glance__desc')).toHaveText('learners trained since 2014');
  });

  test('both captions fit at 390 px with no sideways scroll', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    for (const route of [HOME, HUB]) {
      await open(page, route);
      await scrollThrough(page);
      expect(await noOverflow(page), route).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 10 (Gemini): Governments’ "What Your Agency Gets"', () => {
  test('the first card ends "... mentoring and placement support toward local, remote and global work."; the earlier wording is on no built page', async ({ page }) => {
    await open(page, GOVERNMENTS);
    expect(await texts(page, '#features li.card:nth-child(1) p')).toEqual(['Certification tracks chosen from employer demand, then mentoring and placement support toward local, remote and global work.']);
    expect(await page.locator('#features li.card:nth-child(1)').getAttribute('data-fact')).toBe('PD-10 PD-01');
    expect(pagesWith('point completers toward paid work')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Changed pages: no sideways scroll at 390 px', () => {
  for (const route of [HOME, HUB, FOUNDATIONS, DEV_PARTNERS, GOVERNMENTS, YOUTHWIDE]) {
    test(`${route || 'home'}: the page fits`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await open(page, route);
      await scrollThrough(page);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});
