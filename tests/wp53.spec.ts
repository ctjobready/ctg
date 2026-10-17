import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { defineNewEarners } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP53 behaviors (the owner decisions of 16 October 2026 and the WP52 follow-ups): Home's carousel is four slides (the reach and programs slides are gone, the two survey slides are one); JobReady is
 * "CodersTrust's digital learning and earning platform" wherever the site defines it; the legal status of the two entities is a registered fact (ID-12) and the Governance checklist is built from it; the four
 * policies are not named as existing documents (the checklist and the cards speak of arrangements agreed in co-design); the YouthWIDE Bangladesh band no longer says "Reference"; the YouthWIDE and
 * JobReady@Campus option bands have the eyebrow "Options"; the Local Partners facilitators card scopes its promise; the Development Partners "Where They Work" card says "local, remote and global work" once.
 * Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp53.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const sitePages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The routes of the built pages (the head included: meta descriptions and JSON-LD) that contain any of these patterns. */
const pagesMatching = (...needles: RegExp[]) => sitePages().filter((p) => needles.some((n) => n.test(p.html))).map((p) => p.route);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

const HOME = '';
const GOVERNANCE = 'about/governance/';
const HUB = 'partner-with-us/';
const INVEST = 'partner-with-us/investors/';
const PLATFORM = 'our-model/jobready-platform/';
const MODEL = 'our-model/';
const YOUTHWIDE = 'programs/youthwide/';
const CAMPUS = 'programs/jobready-campus/';
const LOCAL = 'partner-with-us/local-partners/';
const DP = 'partner-with-us/development-partners/';

const TITLES = [
  'Women Offered a Place Earned an Estimated 41% More',
  'Six Government Contracts and Bangladesh’s National University',
  'Surveyed Completers Report Higher Income',
  'Results by Program',
];
const TIMING = '58.8% of the 170 surveyed new earners (completers who first earned during or after training) had started earning by six months after finishing the course.';

test.describe('Home: the carousel is four slides (item 1)', () => {
  test.use({ viewport: DESKTOP });

  test('four slides in the owner’s order, labelled "n of 4", with four dots; the band is headed "Results" and has no framing sentence', async ({ page }) => {
    await open(page, HOME);
    await expect(page.locator('#results-h')).toHaveText('Results');
    expect('Results').toBe(titleCase('Results'));
    await expect(page.locator('#results')).toHaveAttribute('aria-labelledby', 'results-h');
    await expect(page.locator('.hs__intro')).toHaveCount(0);
    await expect(page.locator('[data-hs-slide]')).toHaveCount(4);
    expect(await texts(page, '#results [data-hs-slide] h2')).toEqual(TITLES);
    for (const [i, t] of TITLES.entries()) {
      await expect(slide(page, i + 1)).toHaveAttribute('aria-label', `${i + 1} of 4: ${t}`);
      await expect(page.locator('[data-hs-dot]').nth(i)).toHaveAttribute('aria-label', `Show slide ${i + 1} of 4: ${t}`);
    }
    await expect(page.locator('[data-hs-dot]')).toHaveCount(4);
    expect(await texts(page, '[data-hs-slide] .hs__eyebrow')).toEqual(['Randomized Trial of a Predecessor Program', 'Government and University Partners', 'Impact Survey 2026', 'Program Records']);
  });

  test('the next control wraps from slide 4 to slide 1 (and the previous control from 1 to 4)', async ({ page }) => {
    await open(page, HOME);
    const active = () => page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')));
    await page.locator('[data-hs-dot]').nth(3).click();
    await expect.poll(active).toBe(3);
    await page.locator('[data-hs-next]').click();
    await expect.poll(active).toBe(0);
    await page.locator('[data-hs-prev]').click();
    await expect.poll(active).toBe(3);
  });

  test('the reach slide and the programs slide are gone, and so is the programs grid; the Programs menu still links every program', async ({ page }) => {
    await open(page, HOME);
    const region = compact(await page.locator('#results').evaluate((el) => el.textContent ?? ''));
    for (const gone of ['Programs in 15 Countries and Territories', 'Reach at Scale', 'Explore Global Reach', 'Find Your Program', 'Our Programs', 'Explore Programs', 'Most Surveyed New Earners Were Earning', 'See When Completers First Earn']) {
      expect(region, gone).not.toContain(gone);
    }
    await expect(page.locator('.hs__programs, .hs__program')).toHaveCount(0);
    await expect(page.locator('#results a[href$="programs/youthwide/"]')).toHaveCount(0);
    const menu = await page.locator('#mega-programs a.mega__link').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
    for (const p of ['programs/youthwide/', 'programs/jobready-campus/', 'programs/jobready-work/', 'programs/superkids/', 'programs/nu-postgraduate-diploma/']) {
      expect(menu.some((h) => h.endsWith(p)), p).toBe(true);
    }
  });

  test('the reach figure stays in the hero’s "Proof at a Glance" strip, stated once (SC-16: 130,000+ learners, 15 countries and territories)', async ({ page }) => {
    await open(page, HOME);
    const card = page.locator('.hh__card[data-fact="SC-16"]');
    await expect(card).toContainText('130,000+');
    await expect(card).toContainText('15 countries and territories');
    expect(count(compact(await page.locator('main').textContent()), '130,000+'), 'the 130,000+ is stated once on Home').toBe(1);
    await expect(page.locator('main [data-fact~="SC-03"]')).toHaveCount(0);
  });

  test('the survey slide: the income heading, the eyebrow, the $245 tile and the evidence link are unchanged; the timing is ONE body line from OC-05 with its defined base, stated once', async ({ page }) => {
    await open(page, HOME);
    const s = slide(page, 3);
    await expect(s.locator('.hs__eyebrow')).toHaveText('Impact Survey 2026');
    await expect(s.locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    expect(await s.locator('h2').getAttribute('data-fact')).toBe('OC-03');
    // the line is the owner’s sentence, built from the register (value and label, the term defined in place)
    await expect(s.locator('.hs__lead')).toHaveCount(1);
    expect(compact(await s.locator('.hs__lead').textContent())).toBe(TIMING);
    const stat = fact('OC-05').stat!;
    expect(TIMING).toBe(`${stat.value} ${defineNewEarners(stat.label.replace(/ \(October 2026 survey\)$/, ''))}.`);
    expect(await s.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
    // one tile: the income result, with its before-training comparison
    await expect(s.locator('.hs__stat')).toHaveCount(1);
    expect(await s.locator('.hs__stat').getAttribute('data-fact')).toBe('OC-03');
    const tile = compact(await s.locator('.hs__stat').textContent());
    expect(tile).toContain('$245');
    expect(tile).toContain('median monthly income among surveyed completers, up from $82 before training');
    // the evidence link
    const link = s.locator('.hs__actions a');
    await expect(link).toHaveCount(1);
    expect(compact(await link.textContent())).toBe('Read the Impact Survey 2026');
    expect(await link.getAttribute('href')).toMatch(/\/impact\/outcomes-2026\/$/);
    // the figure is stated once in the carousel, and the 77.9% stays the hero’s
    expect(count(compact(await page.locator('#results').evaluate((el) => el.textContent ?? '')), '58.8%'), 'the 58.8% is stated once in the carousel').toBe(1);
    expect(compact(await s.textContent())).not.toContain('77.9');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px every slide fits the carousel’s height, leaves at most 48 px unused below its content, and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, HOME);
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      const heights = await page.locator('[data-hs-slide]').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).scrollHeight)));
      expect(heights).toHaveLength(4);
      for (const [i, h] of heights.entries()) expect(h, `slide ${i + 1} fits its track`).toBeLessThanOrEqual(track + 1);
      const gaps = await page.evaluate(async () => {
        const out: number[] = [];
        const dots = Array.from(document.querySelectorAll('[data-hs-dot]')) as HTMLElement[];
        for (const dot of dots) {
          dot.click();
          await new Promise((r) => setTimeout(r, 450));
          const active = document.querySelector('[data-hs-slide].is-active')!;
          const controls = document.querySelector('[data-hs-bar]')!;
          const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
          out.push(Math.round(controls.getBoundingClientRect().top - Math.max(...parts.map((el) => el.getBoundingClientRect().bottom))));
        }
        return out;
      });
      expect(gaps).toHaveLength(4);
      for (const [i, g] of gaps.entries()) expect(g, `slide ${i + 1}: unused space under the content`).toBeLessThanOrEqual(48);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('JobReady is "CodersTrust’s digital learning and earning platform" wherever the site defines it (item 2)', () => {
  const DEFINITION = 'CodersTrust’s digital learning and earning platform';

  test('IN-04 opens with the definition and keeps the rollout status; no built page, meta description or JSON-LD says "education and employment platform"', async () => {
    expect(fact('IN-04').text.startsWith(`JobReady is ${DEFINITION}, being built as`)).toBe(true);
    expect(fact('IN-04').text).toContain('Modules are rolling out in stages. Live today: partner portals, marketing automation, customer relationship management and AI chat. In pre-launch: the employer marketplace and the gig-work marketplace.');
    expect(pagesMatching(/education and employment platform/i)).toEqual([]);
  });

  test('Home’s role router and the partner hub carry the definition on the investor card, and keep "staged rollout"', async ({ page }) => {
    await open(page, HOME);
    expect(compact(await page.locator('#router a.cat[href$="partner-with-us/investors/"] .cat__text').textContent())).toBe(`Back the staged rollout of JobReady, ${DEFINITION}.`);
    await open(page, HUB);
    expect(compact(await page.locator('main a.cat[href$="partner-with-us/investors/"] .cat__text').first().textContent())).toBe(`For impact investors: JobReady, ${DEFINITION}.`);
    await expect(page.locator('main a.cat[href$="partner-with-us/investors/"] .cat__title').first()).toHaveText('Back JobReady’s Staged Rollout');
  });

  test('Investors: the definition band says it, and the hero keeps the staged rollout and the live / pre-launch status', async ({ page }) => {
    await open(page, INVEST);
    expect(await texts(page, '#definition .def__text')).toContain('CodersTrust is building JobReady, a digital learning and earning platform for emerging markets.');
    const hero = compact(await page.locator('#hero').textContent());
    expect(hero).toContain('Back JobReady’s staged rollout');
    expect(hero).toContain('Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.');
  });

  test('the JobReady Platform page: the lead and the meta description say it; the Our Model card says it', async ({ page }) => {
    await open(page, PLATFORM);
    expect(compact(await page.locator('main').textContent())).toContain('JobReady is CodersTrust’s digital learning and earning platform. Modules are rolling out in stages.');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toBe('JobReady is CodersTrust’s digital learning and earning platform. Partner portals and AI chat are live; more modules follow.');
    expect(description.length).toBeLessThanOrEqual(155);
    await open(page, MODEL);
    expect(compact(await page.locator('main').textContent())).toContain('The digital learning and earning platform, rolling out in stages.');
  });
});

test.describe('The legal status of the two entities is a registered fact and the Governance checklist is built from it (items 3 and 4)', () => {
  test('ID-12 is a verified identity fact in the owner’s words', async () => {
    const f = fact('ID-12');
    expect(f.group).toBe('identity');
    expect(f.status).toBe('V');
    expect(f.text).toBe('CT USA, Inc. is incorporated in New York. CodersTrust Bangladesh Ltd. is incorporated in Bangladesh.');
    expect(f.sourceIds).toEqual(['OWNERHQ']);
  });

  test('"What We Confirm with You in Co-Design": the lead and three lines; the first is "Legal status:" plus ID-12, once on the page', async ({ page }) => {
    await open(page, GOVERNANCE);
    await expect(page.locator('#check-h')).toHaveText('What We Confirm with You in Co-Design');
    expect(compact(await page.locator('#checklist .gov-check > p').first().textContent())).toBe('Tell us which documents you need and by when.');
    expect(await texts(page, '#checklist .gov-check__list li')).toEqual([
      'Legal status: CT USA, Inc. is incorporated in New York. CodersTrust Bangladesh Ltd. is incorporated in Bangladesh.',
      'Audited accounts, on request.',
      'Safeguarding, anti-fraud, data-protection and sanctions-screening arrangements, agreed for each program in co-design.',
    ]);
    await expect(page.locator('#checklist .gov-check__list li').first().locator('[data-fact="ID-12"]')).toHaveCount(1);
    await expect(page.locator('main [data-fact="ID-12"]')).toHaveCount(1);
    expect(compact(await page.locator('main').textContent())).toContain(fact('ID-12').text);
  });

  test('no page names the four policies as policies; the Governance hero, the contracting panel and the meta description speak of arrangements', async ({ page }) => {
    expect(pagesMatching(/(?:safeguarding|anti-fraud|data-protection|sanctions-screening)[ -]polic(?:y|ies)/i)).toEqual([]);
    expect(fact('PD-13').text).not.toMatch(/polic(?:y|ies)/i);
    await open(page, GOVERNANCE);
    const hero = compact(await page.locator('#hero').textContent());
    expect(hero).toContain('Legal status and due-diligence arrangements for a specific program are confirmed with the funder during co-design.');
    expect(hero).not.toMatch(/polic(?:y|ies)|due-diligence documents/i);
    const card = page.locator('#contracting .cp__item', { has: page.locator('.cp__title', { hasText: 'Due-Diligence Checklist' }) });
    expect(compact(await card.locator('.cp__text').textContent())).toBe('The items we confirm with you in co-design, from legal status to sanctions-screening arrangements.');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toContain('arrangements');
    expect(description).not.toMatch(/polic(?:y|ies)/i);
    expect(compact(await page.locator('#contracting').textContent())).not.toMatch(/polic(?:y|ies)/i);
  });

  test('the hub’s Due Diligence in One View makes no claim that policy documents exist', async ({ page }) => {
    await open(page, HUB);
    const view = compact(await page.locator('#due-diligence').textContent());
    expect(view).not.toMatch(/polic(?:y|ies)/i);
    expect(view).toContain('Safeguarding Agreed per Program');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the checklist items are readable boxes and the page does not scroll sideways`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, GOVERNANCE);
      const boxes = await page.locator('#checklist .gov-check__list li').evaluateAll((els) =>
        els.map((e) => {
          const li = e.getBoundingClientRect();
          const text = e.querySelector('span')!.getBoundingClientRect();
          return { top: Math.round(text.top - li.top), bottom: Math.round(li.bottom - text.bottom), inside: text.right <= li.right + 0.5 };
        }),
      );
      expect(boxes).toHaveLength(3);
      for (const b of boxes) {
        expect(b.inside).toBe(true);
        expect(b.top, 'space above the text').toBeGreaterThanOrEqual(8);
        expect(b.bottom, 'space below the text').toBeGreaterThanOrEqual(8);
      }
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('The WP52 follow-ups (items 6 to 9)', () => {
  test('YouthWIDE: the Bangladesh band is headed "Bangladesh: Delivery Base and 2030 Aim" (Title Case); "Reference Country" is on no built page', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const heading = page.locator('section#governments').getByRole('heading', { level: 2 });
    await expect(heading).toHaveText('Bangladesh: Delivery Base and 2030 Aim');
    expect('Bangladesh: Delivery Base and 2030 Aim').toBe(titleCase('Bangladesh: Delivery Base and 2030 Aim'));
    expect(pagesMatching(/Reference Country/i)).toEqual([]);
  });

  test('YouthWIDE and JobReady@Campus: the options band has the eyebrow "Options" over a heading that says "Start"; no section header has the eyebrow "Start" above a heading that says "Start"', async ({ page }) => {
    for (const [route, title] of [
      [YOUTHWIDE, 'Three Ways to Start, Sized to Your Goals'],
      [CAMPUS, 'Two Ways to Start a Campus Program'],
    ] as const) {
      await open(page, route);
      expect(compact(await page.locator('#offer .sh .eyebrow').textContent()), route).toBe('Options');
      await expect(page.locator('#offer h2'), route).toHaveText(title);
    }
    for (const route of [YOUTHWIDE, CAMPUS, 'programs/superkids/', 'programs/jobready-work/']) {
      await open(page, route);
      const echoes = await page.locator('.sh').evaluateAll((els) =>
        els.filter((e) => (e.querySelector('.eyebrow')?.textContent ?? '').trim() === 'Start' && /\bStart\b/.test(e.querySelector('h2')?.textContent ?? '')).map((e) => e.querySelector('h2')?.textContent ?? ''),
      );
      expect(echoes, route).toEqual([]);
    }
  });

  test('Local Partners: "Supply Certified Facilitators" scopes its promise to the program scope', async ({ page }) => {
    await open(page, LOCAL);
    const card = page.locator('#offer .card, #offer article, #offer li', { has: page.locator('text=Supply Certified Facilitators') }).first();
    expect(compact(await card.textContent())).toContain('Put trainers through certified facilitator training so delivery capacity can stay in your community where the program scope includes it.');
    expect(compact(await page.locator('main').textContent())).not.toContain('so delivery capacity stays in your community');
  });

  test('Development Partners: the "Where They Work" card says "local, remote and global work" once, in its title', async ({ page }) => {
    await open(page, DP);
    const card = page.locator('#mechanism li', { has: page.locator('.model__title', { hasText: 'Local, Remote and Global Work' }) });
    await expect(card.locator('.model__title')).toHaveText('Local, Remote and Global Work');
    expect(compact(await card.locator('.model__text').textContent())).toBe('Placement support and outcome tracking for 12 months after each course.');
    expect(count(compact(await card.textContent()).toLowerCase(), 'local, remote and global work')).toBe(1);
  });
});
