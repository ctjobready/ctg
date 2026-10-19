import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { WORLD_STRIP } from '../src/data/globalStrip';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP57 behaviors (cycle-29 whole-site reviews: GPT-6.1 Sol G2, G5, G6, G7, P1, P2; Kimi K3 K1, K2; Gemini GM4; Grok R1, R2 (with Gemini GM1), R5, R6, P1). Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of
 * the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp57.spec.ts --project=chromium`):
 *   - G2: YouthWIDE's three-card band "Built Around What Funders and Agencies Ask" (#features) is gone, its verification detail is in the glance's Reporting row, the page keeps its three ranked pains and its tone rhythm, and the
 *     facts gate accepts a page with no C8 band (its allowance is one page; the gate's own negative self-tests run with it);
 *   - G5: the short "CodersTrust Around the World" strip on Development Partners, Governments and Foundations leads with Kosovo, then Copenhagen and Dubai; Home and About stay chronological;
 *   - G6: the mobile drawer's Programs accordion shows the desktop menu's two group labels as plain labels, before YouthWIDE and the NU Postgraduate Diploma (it already did: this pins it beside the desktop names);
 *   - G7: Employers' "Due Diligence in One View" is three rows (no "Independent Evaluation Welcome"), laid out without an empty cell; the hub keeps its four;
 *   - P1: Home's fourth logo group is "Employers and Industry Partners";
 *   - P2: the press line is two short sentences ("Early press coverage, 2014–2016: ..." and "World Bank coverage: ..."), every link kept;
 *   - K1: Impact's "On This Page" list ends on the closing band, "Discuss the Evidence for Your Program";
 *   - K2: the Foundations meta description reads "... earned an estimated $27 more a month.";
 *   - GM4: Home's "Proof in Practice" Kosovo card reads "Program records: 102 of 150 women in work. World Bank: 77 trainees won at least one online contract." (PR-02, PR-02b), and every other card, tile or block that
 *     shows one Kosovo figure shows the other (owner decision 7, "show both"); two hero headline figures list the program records alone, and the test names them;
 *   - R1: Global Reach's H1 is "Where We Have Worked: 16 Countries and Territories", and Denmark's note says "Launch location of CodersTrust, April 2014" (the date is TL-01's);
 *   - R2: the contract total says it includes Her Power's national program ("... it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly).") on Home's government slide and the Governments glance (GV-12 and GV-01);
 *   - R5: Universities' "Choose Where to Start" is one line, "Start with one campus: cohort size, tracks and labs are set in the discovery session.", with no size cards;
 *   - R6: Foundations' +$27 tile reads "about +$27", as Home and the trial page do;
 *   - P1 (Grok): "On This Page" is an H2 on the long-form pages (inside the contents box's summary).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** The text of an element without its screen-reader-only parts (the "(opens host)" suffixes of external links). */
const visibleText = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    const c = el.cloneNode(true) as HTMLElement;
    c.querySelectorAll('.sr-only').forEach((n) => n.remove());
    return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
  });
/** Main's top-level bands in page order, each with its ground (white, airy, ice, klein or deep-ink). */
const bandsOf = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('main section.band[id]'))
      .filter((b) => !b.parentElement?.closest('section.band'))
      .map((b) => ({ id: b.id, tone: /\bband--(white|airy|ice|klein|deep-ink)\b/.exec(b.className)?.[1] ?? '' })),
  );
const rectsOf = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { top: Math.round(r.top + window.scrollY), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height) };
    }),
  );
/** Built pages that are not archived news posts (those keep their original wording), with their HTML. */
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));

const HOME = '';
const ABOUT = 'about/';
const IMPACT = 'impact/';
const YOUTHWIDE = 'programs/youthwide/';
const EMPLOYERS = 'partner-with-us/employers/';
const HUB = 'partner-with-us/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const AUDIENCE_STRIP_PAGES = [
  ['Development Partners', 'partner-with-us/development-partners/'],
  ['Governments', 'partner-with-us/governments/'],
  ['Foundations', FOUNDATIONS],
] as const;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G2, YouthWIDE: "Built Around What Funders and Agencies Ask" is gone; its verification detail is in the glance', () => {
  test('the page has no C8 band: no #features, no data-relieves, none of the old cards’ headings or sentences, and the heading is nowhere in the build', async ({ page }) => {
    await open(page, YOUTHWIDE);
    await expect(page.locator('#features')).toHaveCount(0);
    await expect(page.locator('[data-relieves]')).toHaveCount(0);
    const main = compact(await page.locator('main').textContent());
    for (const gone of [
      'Built Around What Funders and Agencies Ask',
      'Progress Your Evaluators Can Check',
      'Tracks That Follow Employer Demand',
      'Success is measured against agreed outcomes, including paid work, not attendance alone',
      'Your evaluators can check results against payslips',
    ]) {
      expect(main, gone).not.toContain(gone);
    }
    const stillThere = sitePages().filter((p) => p.html.includes('Built Around What Funders and Agencies Ask')).map((p) => p.route);
    expect(stillThere, 'no page carries the old heading').toEqual([]);
  });

  test('the three ranked pains still stand in the challenge band, P1 to P3 in order', async ({ page }) => {
    await open(page, YOUTHWIDE);
    expect(await page.locator('#problem [data-pain]').evaluateAll((els) => els.map((e) => e.getAttribute('data-pain')))).toEqual(['P1', 'P2', 'P3']);
  });

  test('nothing on the site links to the removed anchor (programs/youthwide/#features), and the anchors other pages use are still there (#governments)', async ({ page }) => {
    const links = sitePages().filter((p) => /youthwide\/#features/.test(p.html)).map((p) => p.route);
    expect(links).toEqual([]);
    await open(page, YOUTHWIDE);
    await expect(page.locator('#governments')).toHaveCount(1);
    const linkingToIt = sitePages().filter((p) => /programs\/youthwide\/#governments/.test(p.html)).map((p) => p.route);
    expect(linkingToIt.length, 'pages still link to #governments').toBeGreaterThan(0);
  });

  test('"YouthWIDE at a Glance" Reporting row says what earnings are checked against, where available, as agreed in the program scope, and stays tied to PD-08 and PD-09', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const row = page.locator('.pg__row', { has: page.locator('dt', { hasText: 'Reporting' }) });
    await expect(row).toHaveCount(1);
    const text = compact(await row.locator('dd').textContent());
    expect(text).toBe('Monthly reports and follow-up surveys, with earnings checked against payslips, offer letters, platform logs or bank receipts where available, as agreed in the program scope.');
    expect(text.endsWith('.')).toBe(true);
    expect(await row.getAttribute('data-fact')).toBe('PD-08 PD-09');
    // the same detail is stated once on the page (the removed card said it too)
    expect(compact(await page.locator('main').textContent()).split('payslips, offer letters, platform logs or bank receipts').length - 1).toBe(1);
  });

  test('the band rhythm holds after the removal: carousel (airy), photographs (white), questions (ice); no two dark bands meet', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const order = await bandsOf(page);
    const ids = order.map((b) => b.id);
    const at = ids.indexOf('proof-band');
    expect(at, 'the proof band is on the page').toBeGreaterThanOrEqual(0);
    expect(order.slice(at, at + 4)).toEqual([
      { id: 'proof-band', tone: 'klein' },
      { id: 'cases', tone: 'airy' },
      { id: 'in-the-field', tone: 'white' },
      { id: 'faq', tone: 'ice' },
    ]);
    const dark = order.map((b) => b.tone === 'klein' || b.tone === 'deep-ink');
    for (let i = 1; i < order.length; i++) expect(dark[i] && dark[i - 1], `${order[i - 1].id} then ${order[i].id}`).toBe(false);
  });

  test('the photograph band and the glance fit at 1280 and 390 with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, YOUTHWIDE);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      await expect(page.locator('#in-the-field figure').first()).toBeVisible();
    }
  });

  test('npm run check:facts accepts the page with no C8 band: the pain map is read on three pages and the card map on the two that carry the band', () => {
    // the allowance is one page (PAIN_C8_OPTIONAL); the script's own negative self-tests (a page with no C2 band, two pains, a band with a pain missing, ...) run on every call
    const out = execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/check-facts.mjs'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toContain('check-facts: OK');
    expect(out).toMatch(/three ranked pains \(C2\) on 3 page\(s\), with one C8 card each on 2 of them/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G5, the short strip on the audience pages leads with Kosovo; Home and About stay chronological', () => {
  for (const [name, route] of AUDIENCE_STRIP_PAGES) {
    test(`${name}: Kosovo, Copenhagen, Dubai from left to right at 1280; Kosovo and Copenhagen share a row and Dubai takes the last row at 390; no sideways scroll`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await open(page, route);
      await scrollThrough(page);
      expect(await texts(page, '#guide #world .wst__where')).toEqual(['Kosovo, 2016–2017.', 'Copenhagen, April 2014.', 'Dubai, April 2014.']);
      const wide = await rectsOf(page, '#guide #world li[data-tile]');
      expect(wide).toHaveLength(3);
      expect(new Set(wide.map((r) => r.top)).size, 'one row at 1280').toBe(1);
      expect(wide[0].left).toBeLessThan(wide[1].left);
      expect(wide[1].left).toBeLessThan(wide[2].left);
      expect(await noOverflow(page)).toBe(true);
      await page.setViewportSize(MOBILE);
      await open(page, route);
      await scrollThrough(page);
      const narrow = await rectsOf(page, '#guide #world li[data-tile]');
      expect(narrow[0].top, 'Kosovo and Copenhagen share a row').toBe(narrow[1].top);
      expect(narrow[2].top, 'Dubai is on the next row').toBeGreaterThan(narrow[0].top);
      expect(narrow[2].width, 'the odd last tile takes the whole row').toBeGreaterThan(narrow[0].width * 1.8);
      expect(await noOverflow(page)).toBe(true);
    });
  }

  test('Home and About keep the full strip in date order (Copenhagen first, Bangladesh last); the register’s short form is the only reordered list', async ({ page }) => {
    for (const route of [HOME, ABOUT]) {
      await open(page, route);
      expect(await page.locator('#world li[data-tile]').evaluateAll((els) => els.map((e) => e.getAttribute('data-tile'))), route || 'home').toEqual(['copenhagen', 'dubai', 'somaliland', 'kosovo', 'albania', 'new-york', 'bangladesh']);
    }
    expect(WORLD_STRIP.map((t) => t.id)).toEqual(['copenhagen', 'dubai', 'somaliland', 'kosovo', 'albania', 'new-york', 'bangladesh']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G6, the mobile drawer’s Programs accordion has the desktop menu’s group labels as plain labels', () => {
  test('"Partner Programs" comes before YouthWIDE and "For Individual Learners" before the NU Postgraduate Diploma; both are labels, not links, and match the desktop names', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, HOME);
    const desktop = await texts(page, '#mega-programs .mega__group-title');
    expect(desktop).toEqual(['Partner Programs', 'For Individual Learners']);
    await page.locator('[data-drawer-open]').click();
    const accordion = page.locator('#site-drawer details.drawer__group', { has: page.locator('summary', { hasText: 'Programs' }) });
    await accordion.locator('summary').click();
    const heads = accordion.locator('li.drawer__subhead');
    await expect(heads).toHaveCount(2);
    expect(await texts(page, '#site-drawer details.drawer__group[open] li.drawer__subhead')).toEqual(desktop);
    await expect(heads.locator('a'), 'the labels are not links').toHaveCount(0);
    await expect(heads.first()).toBeVisible();
    await expect(heads.last()).toBeVisible();
    // each label is directly followed by the first link of its group
    const firstLinkAfter = await heads.evaluateAll((els) => els.map((e) => (e.nextElementSibling?.querySelector(':scope > a')?.textContent ?? '').replace(/\s+/g, ' ').trim()));
    expect(firstLinkAfter).toEqual(['YouthWIDE', 'NU Postgraduate Diploma']);
    // the Programs overview link comes first, ahead of any label
    const firstItem = await accordion.locator('.acc__body > ul > li').first().evaluate((e) => e.className);
    expect(firstItem).not.toContain('drawer__subhead');
    expect(await noOverflow(page)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G7, Employers: "Due Diligence in One View" is three rows without "Independent Evaluation Welcome"', () => {
  test('the rows are Contracting Entities, Needs Assessment First and Progress Evaluation; none links the independent-evaluation page; the hub keeps its four', async ({ page }) => {
    await open(page, EMPLOYERS);
    expect(await texts(page, '#due-diligence .ddv__title')).toEqual(['Contracting Entities', 'Needs Assessment First', 'Progress Evaluation']);
    await expect(page.locator('#due-diligence a[href*="independent-evaluation"]')).toHaveCount(0);
    expect(compact(await page.locator('#due-diligence').textContent())).not.toContain('Independent Evaluation');
    await open(page, HUB);
    expect(await texts(page, '#due-diligence .ddv__title')).toEqual(['Contracting Entities', 'Monthly Reports and Follow-Up Surveys', 'Safeguarding Agreed per Program', 'Independent Evaluation Welcome']);
  });

  test('"Independent Evaluation Welcome" is on the Employers page once, in the pilot-team band after it; "Broader Evidence from Our Youth Programs" still links the trial and the survey', async ({ page }) => {
    await open(page, EMPLOYERS);
    const main = compact(await page.locator('main').textContent());
    expect(main.split('Independent Evaluation Welcome').length - 1).toBe(1);
    expect(await texts(page, '#risk h3')).toContain('Independent Evaluation Welcome');
    await expect(page.locator('#risk h2')).toHaveText('Start with a Pilot Team, Then Decide on Evidence');
    await expect(page.locator('#offer-evidence h2')).toHaveText('Broader Evidence from Our Youth Programs');
    expect(await texts(page, '#offer-evidence a')).toEqual(['The Randomized Trial', 'Impact Survey 2026']);
  });

  test('the three cards sit in three columns at 1280, in two with the third across the row at 900, and stack at 390; no cell is left empty and nothing scrolls sideways', async ({ page }) => {
    // reduced motion: the cards' reveal animation would still be moving them when they are measured
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(DESKTOP);
    await open(page, EMPLOYERS);
    await scrollThrough(page);
    const list = (await rectsOf(page, '#due-diligence .ddv'))[0];
    const wide = await rectsOf(page, '#due-diligence .ddv__item');
    expect(wide).toHaveLength(3);
    expect(new Set(wide.map((r) => r.top)).size, 'one row at 1280').toBe(1);
    expect(Math.abs(wide[2].right - list.right), 'the row is filled: no empty fourth column').toBeLessThanOrEqual(2);
    expect(Math.abs(wide[0].width - wide[2].width), 'equal columns').toBeLessThanOrEqual(2);
    expect(await noOverflow(page)).toBe(true);

    await page.setViewportSize({ width: 900, height: 800 });
    await open(page, EMPLOYERS);
    await scrollThrough(page);
    const mid = await rectsOf(page, '#due-diligence .ddv__item');
    const midList = (await rectsOf(page, '#due-diligence .ddv'))[0];
    expect(mid[0].top, 'two columns at 900').toBe(mid[1].top);
    expect(mid[2].top, 'the third card is on the next row').toBeGreaterThan(mid[0].top);
    expect(Math.abs(mid[2].width - midList.width), 'the third card is across the row, not alone beside an empty cell').toBeLessThanOrEqual(2);
    expect(await noOverflow(page)).toBe(true);

    await page.setViewportSize(MOBILE);
    await open(page, EMPLOYERS);
    await scrollThrough(page);
    const narrow = await rectsOf(page, '#due-diligence .ddv__item');
    expect(new Set(narrow.map((r) => r.top)).size, 'one card per row at 390').toBe(3);
    expect(await noOverflow(page)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('P1, Home: the fourth logo group is "Employers and Industry Partners"', () => {
  test('the group title and the strip’s name say so, the strip still holds AWS and BASIS beside the employers, and the other three groups are unchanged', async ({ page }) => {
    await open(page, HOME);
    const titles = await texts(page, '#guide .rel__title');
    expect(titles).toEqual(['Funders and Development Partners', 'Government Programs', 'Education Partners', 'Employers and Industry Partners']);
    for (const t of titles) expect(t, t).toBe(titleCase(t));
    const strip = page.locator('#guide section.partners[aria-label="Employers and industry partners"]');
    await expect(strip).toHaveCount(1);
    const names = await strip.locator('li').evaluateAll((els) => els.map((li) => (li.querySelector('img')?.getAttribute('alt') ?? li.textContent ?? '').replace(/\s+/g, ' ').trim()));
    expect(names).toEqual(expect.arrayContaining(['AWS', 'BASIS', 'Grameenphone Academy', 'Robi', 'Accenture']));
    // no group is still named just "Employers"
    expect(titles).not.toContain('Employers');
    await expect(page.locator('#guide section.partners[aria-label="Employer and private-sector partners"]')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('P2, "As covered by" is two short sentences with every link kept', () => {
  for (const [name, route] of [['Home', HOME]] as const) {
    test(`${name}: "Early press coverage, 2014–2016: ..." names the seven outlets once (Forbes with its qualifier); "World Bank coverage: ..." keeps Kosovo’s two pages and Albania’s page apart by year`, async ({ page }) => {
      await open(page, route);
      const line = page.locator('p.cov');
      await expect(line).toHaveCount(1);
      const text = await visibleText(page, 'p.cov');
      const sentences = text.split(/(?<=\.) (?=[A-Z])/);
      expect(sentences).toEqual([
        'Early press coverage, 2014–2016: Gulf News, TechCrunch, Forbes (contributor post), The Wall Street Journal, USA Today, Tech in Asia and The Times of India.',
        'World Bank coverage: Kosovo (2016, 2017) and Albania (2021).',
      ]);
      expect(text).not.toContain('As covered by');
      // no stray space before a comma or a period (the links are followed directly by their punctuation)
      expect(text).not.toMatch(/ [,.]/);
      // the outlet links carry the outlet's name alone; the qualifier is plain text beside Forbes' link; the three World Bank links are their years
      const linkTexts = await line.locator('a').evaluateAll((as) =>
        as.map((a) => {
          const c = a.cloneNode(true) as HTMLElement;
          c.querySelectorAll('.sr-only').forEach((n) => n.remove());
          return (c.textContent ?? '').trim();
        }),
      );
      expect(linkTexts).toEqual(['Gulf News', 'TechCrunch', 'Forbes', 'The Wall Street Journal', 'USA Today', 'Tech in Asia', 'The Times of India', '2016', '2017', '2021']);
      expect(await line.getAttribute('data-fact')).toBe('PA-09 PA-13');
      expect(await line.locator('a .sr-only').count(), 'each link says where it goes').toBe(10);
      expect(await line.locator('a').evaluateAll((as) => as.every((a) => /noopener/.test(a.getAttribute('rel') ?? '')))).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K1, Impact: "On This Page" ends on the closing band', () => {
  const CLOSING = 'Discuss the Evidence for Your Program';

  test('the last entry is the closing band’s heading in Title Case, linking its anchor (#cta), after the goals entry; the entries before it are unchanged and in page order', async ({ page }) => {
    await open(page, IMPACT);
    const links = await page.locator('nav[aria-label="On this page"] a').evaluateAll((els) => els.map((a) => ({ label: (a.textContent ?? '').replace(/\s+/g, ' ').trim(), id: (a.getAttribute('href') ?? '').replace(/^.*#/, '') })));
    expect(links).toEqual([
      { label: 'In Short', id: 'summary' },
      { label: 'Results at a Glance', id: 'glance' },
      { label: 'Five Programs', id: 'cases' },
      { label: 'Four Kinds of Evidence', id: 'evidence-ladder' },
      { label: 'Where We Are Heading', id: 'heading' },
      { label: 'Seven Global Goals, Three at the Core', id: 'sdg' },
      { label: CLOSING, id: 'cta' },
    ]);
    expect(CLOSING).toBe(titleCase(CLOSING));
    await expect(page.locator('#cta-h')).toHaveText(CLOSING);
    // every entry's target exists once and the targets are in page order
    const positions = await page.evaluate((ids) => ids.map((id) => (document.getElementById(id)?.getBoundingClientRect().top ?? NaN) + window.scrollY), links.map((l) => l.id));
    for (const p of positions) expect(Number.isNaN(p)).toBe(false);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  test('the entry opens the closing band', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, IMPACT);
    await page.locator('nav[aria-label="On this page"] a', { hasText: CLOSING }).click();
    await expect(page).toHaveURL(/#cta$/);
    await expect(page.locator('#cta-h')).toBeInViewport();
  });

  test('the list wraps at 390 and 1280 with every entry inside the page width and no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, IMPACT);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      const boxes = await rectsOf(page, 'nav[aria-label="On this page"] a');
      expect(boxes).toHaveLength(7);
      for (const b of boxes) {
        expect(b.left, `${vp.width}px: inside on the left`).toBeGreaterThanOrEqual(0);
        expect(b.right, `${vp.width}px: inside on the right`).toBeLessThanOrEqual(vp.width);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K2, Foundations: the meta description reads "earned an estimated $27 more a month"', () => {
  const DESCRIPTION = 'Fund a supported path to earnings. A randomized trial of a predecessor program found women offered a place earned an estimated $27 more a month.';

  test('the description, its Open Graph copy and the page’s structured data say it, within the length limit, with the figure read from RC-04', async ({ page }) => {
    await open(page, FOUNDATIONS);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe(DESCRIPTION);
    expect(description!.length).toBeLessThanOrEqual(155);
    expect(description).not.toContain('higher monthly income');
    expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(DESCRIPTION);
    expect(fact('RC-04').stat?.value, 'the figure is RC-04’s "+$27"').toBe('+$27');
    expect(fact('RC-04').text).toContain('+$27 a month');
    const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blobs.some((b) => b.includes(DESCRIPTION)), 'the WebPage node carries the same description').toBe(true);
  });

  test('no built page outside the archived news posts carries the old sentence', () => {
    // (other pages say "higher monthly income" in their own words; only this description's sentence is gone)
    const old = sitePages().filter((p) => p.html.includes('had an estimated $27 higher monthly income')).map((p) => p.route);
    expect(old).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM4, Kosovo: Home’s "Proof in Practice" card shows both figures, and no card, tile or block shows one without the other ("show both", owner decision 7)', () => {
  const RECORDS = 'Program records: 102 of 150 women in work.';
  const WORLD_BANK = 'World Bank: 77 trainees won at least one online contract.';
  const card = (page: Page) => page.locator('#cases article', { hasText: 'Women in Online Work, Kosovo' });

  test('the card reads the program records and then the World Bank line, each tied to its own register fact, with no headline figure, and the band names both facts', async ({ page }) => {
    await open(page, HOME);
    await expect(card(page)).toHaveCount(1);
    await expect(card(page).locator('.case__context')).toHaveText(RECORDS);
    expect(await card(page).locator('.case__context').getAttribute('data-fact')).toBe('PR-02');
    await expect(card(page).locator('.case__note')).toHaveText(WORLD_BANK);
    expect(await card(page).locator('.case__note').getAttribute('data-fact')).toBe('PR-02b');
    expect(compact(await card(page).locator('.case__context, .case__note').allTextContents().then((t) => t.join(' ')))).toBe(`${RECORDS} ${WORLD_BANK}`);
    await expect(card(page).locator('.case__stat, .case__value, .case__label')).toHaveCount(0);
    // the band's wrapper names both facts; no other fact is named in the band (WSDFM's and Her Power's cards state none)
    expect(await page.locator('#cases [data-fact]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['PR-02 PR-02b', 'PR-02', 'PR-02b']);
    // the program records are on Home in the hero slide and in this card; the World Bank's figure is on this card alone
    const main = compact(await page.locator('main').textContent());
    expect(main.split('102 of 150').length - 1).toBe(2);
    expect(main.split('77 trainees').length - 1).toBe(1);
    // the figure's spaces are no-break spaces, so "102 of 150" never splits across two lines in the card
    expect(await card(page).locator('.case__context').evaluate((el) => (el.textContent ?? '').includes('102\u00a0of\u00a0150'))).toBe(true);
  });

  test('both lines are built from the register: PR-02 reads "102 of 150 women in work" and PR-02b is the World Bank’s count of 77', () => {
    expect(fact('PR-02').stat?.value).toBe('102 of 150');
    expect(fact('PR-02').text).toContain('102 of 150 women in work');
    expect(fact('PR-02b').stat?.value).toBe('77');
    expect(fact('PR-02b').text).toContain('The World Bank reports that 77 trainees');
  });

  test('the two lines sit in order above the title and inside the card at 1280 and 390, with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      await scrollThrough(page);
      const g = await card(page).evaluate((el) => {
        const r = (s: string) => el.querySelector(s)!.getBoundingClientRect();
        return { contextBottom: r('.case__context').bottom, noteTop: r('.case__note').top, noteBottom: r('.case__note').bottom, titleTop: r('.card__title').top, noteRight: r('.case__note').right, bodyRight: r('.card__body').right };
      });
      expect(g.contextBottom, `${vp.width}px: the records line comes first`).toBeLessThanOrEqual(g.noteTop + 1);
      expect(g.noteBottom, `${vp.width}px: both lines are above the title`).toBeLessThanOrEqual(g.titleTop + 1);
      expect(g.noteRight, `${vp.width}px: the World Bank line stays inside the card`).toBeLessThanOrEqual(g.bodyRight + 1);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  test('every card, tile or block that shows the program records or the World Bank’s count also shows the other (two hero headline figures aside, named below; the staging-only component gallery and the archived news posts are not read)', async ({ page }) => {
    const text = (html: string) => html.replace(/<head[\s\S]*?<\/head>/i, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const routes = sitePages()
      .filter((p) => p.route !== '/styleguide/' && /102 of 150|77 trainees/.test(text(p.html)))
      .map((p) => p.route);
    // the pages that show a Kosovo figure today: the Case Studies hub and the Kosovo case study, the Impact overview, Home, and the Development Partners, Foundations, Governments and YouthWIDE pages
    expect(routes.sort()).toEqual(['/', '/impact/', '/impact/case-studies/', '/impact/case-studies/kosovo-women-in-online-work/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/', '/partner-with-us/governments/', '/programs/youthwide/']);
    const unpaired: string[] = [];
    for (const route of routes) {
      await open(page, route.replace(/^\//, ''));
      const hits = await page.evaluate(() => {
        const A = '102 of 150';
        const B = '77 trainees';
        const norm = (t: string | null) => (t ?? '').replace(/\s+/g, ' ').trim();
        const out: { needle: string; container: string; length: number; inHero: boolean }[] = [];
        const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          for (const needle of [A, B]) {
            if (!norm(n.textContent).includes(needle)) continue;
            // the smallest element around this figure that also holds the other one: a card, a tile or a block, not a band or the page
            let el = n.parentElement;
            while (el && el.tagName !== 'MAIN' && !(norm(el.textContent).includes(A) && norm(el.textContent).includes(B))) el = el.parentElement;
            out.push({ needle, container: el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}` : '', length: norm(el?.textContent ?? '').length, inHero: !!n.parentElement?.closest('[data-hs-slide], .hero') });
          }
        }
        return out;
      });
      expect(hits.length, `${route} shows a Kosovo figure`).toBeGreaterThan(0);
      for (const h of hits) {
        // The two hero headline figures that give the program records alone, each on a page whose own card or results block gives both:
        //  - Home's hero slide "Results by Program" (eyebrow "Program Records") lists each program's own record on one line; a second sentence on the Kosovo line leaves slide 1 57 px unused at 1280 against the 48 px budget
        //    of tests/hero-slider.spec.ts (measured when GM4 was handled), and the "Proof in Practice" card below it shows both;
        //  - the Kosovo case study's hero stat ("Program Record", 102 of 150), beside "Jump to the Results": its #results block gives the program records first and the World Bank's count after them (tests/wp55.spec.ts).
        if (h.inHero && (route === '/' || route === '/impact/case-studies/kosovo-women-in-online-work/')) continue;
        // a figure whose smallest holder of both is the whole page body (main) or a long block is shown without its pair
        if (h.container === 'main' || h.container === '' || h.length > 1600) unpaired.push(`${route}: "${h.needle}" has no partner within a card, a tile or a block (${h.container || 'none'}, ${h.length} characters)`);
      }
    }
    expect(unpaired).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R1, Global Reach: "Where We Have Worked: 16 Countries and Territories", and Denmark says when the launch was', () => {
  const GLOBAL_REACH = 'impact/global-reach/';

  test('the H1 is "Where We Have Worked: 16 Countries and Territories" in Title Case; the lead is SC-03’s sentence; the title and description keep their limits and the same count', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    await expect(page.locator('main h1')).toHaveText('Where We Have Worked: 16 Countries and Territories');
    expect('Where We Have Worked: 16 Countries and Territories').toBe(titleCase('Where We Have Worked: 16 Countries and Territories'));
    expect(compact(await page.locator('main .hero__lead').first().textContent())).toBe(`${fact('SC-03').text}.`);
    // the page title cannot carry the H1 (its words and " | CodersTrust" are 64 characters; the limit is 60), so it keeps "Global Reach: 16 Countries and Territories"
    const title = await page.title();
    expect(title).toBe('Global Reach: 16 Countries and Territories | CodersTrust');
    expect(title.length).toBeLessThanOrEqual(60);
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toMatch(/^CodersTrust has worked in 16 countries and territories: Bangladesh since 2014 and 15 international locations/);
    expect(description.length).toBeLessThanOrEqual(155);
  });

  test('no built page outside the archived news posts still says "Delivered in 16 Countries and Territories"', () => {
    expect(sitePages().filter((p) => p.html.includes('Delivered in 16 Countries and Territories')).map((p) => p.route)).toEqual([]);
  });

  test('Denmark’s note reads "Launch location of CodersTrust, April 2014" in the table and on its pin card; the date is TL-01’s, and no other row carries a launch note', async ({ page }) => {
    const NOTE = `Launch location of CodersTrust, ${fact('TL-01').stat?.value}`;
    expect(NOTE).toBe('Launch location of CodersTrust, April 2014');
    await open(page, GLOBAL_REACH);
    const row = page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: 'Denmark' }) });
    await expect(row).toHaveCount(1);
    expect(compact(await row.locator('td[data-label="Partner / Note"]').textContent())).toBe(NOTE);
    expect(compact(await page.locator('#map').textContent()).split(NOTE).length - 1, 'the table and the pin card say it once each').toBe(2);
    expect((await texts(page, '.wmap__table tbody tr td[data-label="Partner / Note"]')).filter((t) => /launch/i.test(t))).toEqual([NOTE]);
  });

  test('the hero fits at 1280 and 390 with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, GLOBAL_REACH);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R2, the 30,000+ visibly includes Her Power’s national program (GV-12 and GV-01)', () => {
  const NOTE = 'The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly).';

  test('Home, slide 2: the lead is the contracts sentence, the note and the National University sentence, tied to GV-12 and GV-01', async ({ page }) => {
    await open(page, HOME);
    const lead = page.locator('#results [data-hs-slide]').nth(1).locator('.hs__lead');
    expect(compact(await lead.textContent())).toBe(
      `Six government contracts with training and curriculum work scoped for 30,000+ people. ${NOTE} CodersTrust is also the official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners.`,
    );
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11');
  });

  test('Governments: the first glance tile (30,000+) carries the same note, tied to GV-12, SC-06 and GV-01; the old pointer sentence is gone', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const tile = page.locator('#glance a.pg__tile', { has: page.locator('.pg__value', { hasText: '30,000+' }) });
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.pg__note')).toHaveText(NOTE);
    expect(await tile.getAttribute('data-fact')).toBe('GV-12 SC-06 GV-01 GV-11');
    expect(compact(await tile.textContent())).not.toContain('The contracts table below shows each scope.');
  });

  test('the 25,125 is GV-01’s own value and the clause that keeps the total true is still in GV-12’s register note; Impact keeps the register’s longer note (it adds the 2,500 trained directly)', async ({ page }) => {
    expect(fact('GV-01').stat?.value).toBe('25,125');
    expect(fact('GV-01').text).toContain('a national program that trained 25,125 women');
    expect(fact('GV-12').stat?.glance?.note).toContain('contract scope, not a count of completers');
    await open(page, IMPACT);
    const tile = page.locator('#glance [data-fact~="GV-12"]').first();
    expect(compact(await tile.textContent())).toContain('The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; CodersTrust trained 2,500 women directly.');
  });

  test('the 25,125 is stated on Home’s government slide and on the Governments tile in the same words (no page words the inclusion differently)', () => {
    const offenders = sitePages().filter((p) => /it includes Her Power(?:’|&#39;|')s national program/.test(p.html) && !p.html.includes('it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly)')).map((p) => p.route);
    expect(offenders).toEqual([]);
    const pages = sitePages().filter((p) => p.html.includes('it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly)')).map((p) => p.route).sort();
    expect(pages).toEqual(['/', '/partner-with-us/governments/']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R5, Universities: "Choose Where to Start" is one line, with no size cards', () => {
  const LINE = 'Start with one campus: cohort size, tracks and labs are set in the discovery session.';
  const UNIVERSITIES = 'partner-with-us/universities/';

  test('the band is its heading and the one line (id #offer kept): no cards, no size, no recommendation, no link or button of its own', async ({ page }) => {
    await open(page, UNIVERSITIES);
    await expect(page.locator('#offer h2')).toHaveText('Choose Where to Start');
    await expect(page.locator('#offer .sh__lead')).toHaveText(LINE);
    await expect(page.locator('#offer article, #offer .grid-cards, #offer .oc')).toHaveCount(0);
    await expect(page.locator('#offer a, #offer button, #offer .btn')).toHaveCount(0);
    expect(await texts(page, '#offer h2, #offer p')).toEqual(['Choose Where to Start', LINE]);
    const main = compact(await page.locator('main').textContent());
    for (const gone of ['1,000', '2,500', 'Recommended First Step', 'Multi-Cohort Pilot Program', 'Option 1', 'Option 2']) expect(main, gone).not.toContain(gone);
    expect(LINE.endsWith('.')).toBe(true);
  });

  test('the page keeps its own button: one primary button in the hero and one in the closing band, and none in the one-line band', async ({ page }) => {
    await open(page, UNIVERSITIES);
    await expect(page.locator('#offer .btn--primary')).toHaveCount(0);
    await expect(page.locator('#cta .btn--primary')).toHaveCount(1);
    expect(await page.locator('main .btn--primary').count()).toBeGreaterThanOrEqual(2);
  });

  test('the size cards stay on the pages that are about a country or funder cohort: Development Partners and Governments keep their options, with the first recommended', async ({ page }) => {
    for (const route of ['partner-with-us/development-partners/', 'partner-with-us/governments/']) {
      await open(page, route);
      expect(await page.locator('#offer article').count(), route).toBeGreaterThanOrEqual(2);
      await expect(page.locator('#offer .oc__rec'), route).toHaveCount(1);
    }
  });

  test('the slim band fits at 1280 and 390: it sits between the questions and the due-diligence item, with no empty gap under its header and no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, UNIVERSITIES);
      await scrollThrough(page);
      const order = (await bandsOf(page)).map((b) => b.id);
      const at = order.indexOf('offer');
      expect(order[at - 1], 'the questions band comes before it').toBe('faq');
      expect(order[at + 1], 'the due-diligence item comes after it').toBe('due-diligence');
      const gap = await page.locator('#offer').evaluate((el) => {
        const header = el.querySelector('header')!.getBoundingClientRect();
        const band = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { below: band.bottom - header.bottom - parseFloat(cs.paddingBottom), pad: parseFloat(cs.paddingTop) };
      });
      // (a header with a gap under it, as every other band's, would leave about 32 px here; the few px are line-height rounding)
      expect(Math.abs(gap.below), `${vp.width}px: nothing but the band's padding under the header`).toBeLessThanOrEqual(3);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R6, Foundations: the +$27 tile reads "about +$27", as Home and the trial page say it', () => {
  test('the tile’s figure is "about +$27" (the qualifier is the register’s own word), its label and facts are unchanged', async ({ page }) => {
    await open(page, FOUNDATIONS);
    const tile = page.locator('#glance a.pg__tile', { has: page.locator('.pg__value', { hasText: '+$27' }) });
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.pg__value')).toHaveText('about +$27');
    await expect(tile.locator('.pg__qual')).toHaveText('about');
    await expect(tile.locator('.pg__desc')).toHaveText('estimated monthly income gain for women offered a place in a predecessor program, compared with the control group');
    expect(await tile.getAttribute('data-fact')).toBe('RC-04');
    expect(fact('RC-04').text.startsWith('About +$27 a month')).toBe(true);
    expect(fact('RC-04').stat?.value).toBe('+$27');
  });

  test('Home and the trial page say "about +$27 a month" in their own sentences', async ({ page }) => {
    await open(page, HOME);
    expect(compact(await page.locator('#results').textContent())).toContain('about +$27 a month');
    await open(page, 'impact/independent-evaluation/');
    expect(compact(await page.locator('li[data-fact="RC-04"]').first().textContent())).toMatch(/^About \+\$27 a month/);
  });

  test('the qualifier sits on the figure’s line in the small body size, inside the tile at 1280 and 390 (no sideways scroll)', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, FOUNDATIONS);
      const g = await page.locator('#glance a.pg__tile', { has: page.locator('.pg__qual') }).evaluate((el) => {
        const q = el.querySelector('.pg__qual')!.getBoundingClientRect();
        const v = el.querySelector('.pg__value')!.getBoundingClientRect();
        const t = el.getBoundingClientRect();
        return { qTop: q.top, qBottom: q.bottom, vTop: v.top, vBottom: v.bottom, qRight: q.right, tRight: t.right, qSize: parseFloat(getComputedStyle(el.querySelector('.pg__qual')!).fontSize), vSize: parseFloat(getComputedStyle(el.querySelector('.pg__value')!).fontSize) };
      });
      expect(g.qTop, `${vp.width}px: on the figure's line`).toBeGreaterThanOrEqual(g.vTop - 1);
      expect(g.qBottom).toBeLessThanOrEqual(g.vBottom + 1);
      expect(g.qSize, 'smaller than the figure').toBeLessThan(g.vSize);
      expect(g.qRight).toBeLessThanOrEqual(g.tRight);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('P1 (Grok), "On This Page" is an H2 on the long-form pages', () => {
  const LONGFORM = ['impact/independent-evaluation/', 'impact/outcomes-2026/', 'our-model/talentleap/', 'our-model/jobready-platform/', 'privacy-policy/', 'accessibility/'];

  for (const route of LONGFORM) {
    test(`${route}: the contents box has one H2 "On This Page" in its summary, ahead of the page's other H2s; the box still opens and closes from it`, async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await open(page, route);
      const heading = page.locator('.lf-toc details > summary > h2');
      await expect(heading).toHaveCount(1);
      await expect(heading).toHaveText('On This Page');
      expect(await heading.evaluate((h) => h.tagName)).toBe('H2');
      await expect(page.locator('main h2').first()).toHaveText('On This Page');
      // the summary keeps its look: bold, no margin, the summary's own size
      const look = await heading.evaluate((h) => {
        const cs = getComputedStyle(h);
        const sum = getComputedStyle(h.parentElement!);
        return { weight: cs.fontWeight, margin: cs.marginTop, size: cs.fontSize, summarySize: sum.fontSize };
      });
      expect(Number(look.weight)).toBeGreaterThanOrEqual(600);
      expect(look.margin).toBe('0px');
      expect(look.size).toBe(look.summarySize);
      // the disclosure still works from the heading
      const box = page.locator('.lf-toc details');
      await expect(box).toHaveAttribute('open', '');
      await heading.click();
      await expect(box).not.toHaveAttribute('open', '');
      await heading.click();
      await expect(box).toHaveAttribute('open', '');
    });
  }

  test('the About pages’ own "On This Page" (PageNav) is still an H2, so the label is one heading level across the site', async ({ page }) => {
    for (const route of [ABOUT, IMPACT]) {
      await open(page, route);
      await expect(page.locator('nav[aria-label="On this page"] h2'), route).toHaveText('On This Page');
    }
  });

  test('the box fits at 390 and 1280 with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const route of LONGFORM) {
        await open(page, route);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    }
  });
});
