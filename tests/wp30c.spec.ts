import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP30c behaviors (owner direction 2026-10-14, "less is more"): Home, the Partner with Us hub, the six audience pages and Investors are shorter and say each
 * point once. Each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp30c.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** The visible words of <main> (what a reader at 1280 px can see): hidden table/card duplicates and inactive carousel slides are not counted. */
async function visibleWords(page: Page): Promise<number> {
  return page.evaluate(() => {
    const visible = (el: Element) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const count = (el: Element): number => {
      if (!visible(el) || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName.toUpperCase())) return 0;
      let n = 0;
      el.childNodes.forEach((c) => {
        if (c.nodeType === 3) n += (c.textContent ?? '').split(/\s+/).filter(Boolean).length;
        else if (c.nodeType === 1) n += count(c as Element);
      });
      return n;
    };
    return count(document.querySelector('main')!);
  });
}

// The pages this package rewrote, each with a ceiling for its visible main text. The ceilings sit a little above the shipped length (WP30c took them down by
// roughly a quarter to a half); a page that grows past its ceiling is bringing report-like text back.
const BUDGETS: { route: string; label: string; max: number }[] = [
  { route: '', label: 'Home', max: 2450 },
  { route: 'partner-with-us/', label: 'Partner with Us hub', max: 1000 },
  { route: 'partner-with-us/governments/', label: 'Governments', max: 2400 },
  { route: 'partner-with-us/development-partners/', label: 'Development Partners', max: 2200 },
  { route: 'partner-with-us/foundations/', label: 'Foundations', max: 2150 },
  { route: 'partner-with-us/universities/', label: 'Universities', max: 1850 },
  { route: 'partner-with-us/employers/', label: 'Employers', max: 1650 },
  { route: 'partner-with-us/local-partners/', label: 'Local Partners', max: 1800 },
  { route: 'partner-with-us/investors/', label: 'Investors', max: 1950 },
];

test.describe('shorter pages', () => {
  test.use({ viewport: DESKTOP });
  for (const b of BUDGETS) {
    test(`${b.label}: main text stays within ${b.max} visible words`, async ({ page }) => {
      await open(page, b.route);
      expect(await visibleWords(page)).toBeLessThanOrEqual(b.max);
    });
  }
});

test.describe('headings', () => {
  test('the H1s the owner chose are unchanged: Home, Governments, Investors', async ({ page }) => {
    const wanted: [string, string][] = [
      ['', 'Turn Youth Unemployment into a Digital Workforce — with Evidence'],
      ['partner-with-us/governments/', 'Build a National Digital Workforce Through Graduates and Digital Labs'],
      ['partner-with-us/investors/', 'Invest in the Platform Connecting Emerging-Market Youth to Work'],
    ];
    for (const [route, h1] of wanted) {
      await open(page, route);
      expect(compact(await page.locator('main h1').first().textContent()), route || 'home').toBe(h1);
    }
  });

  test('no heading on the rewritten pages ends in a period', async ({ page }) => {
    for (const b of BUDGETS) {
      await open(page, b.route);
      const heads = (await page.locator('main h1, main h2, main h3').allTextContents()).map(compact).filter(Boolean);
      expect(heads.filter((h) => /\.$/.test(h)), b.label).toEqual([]);
    }
  });
});

test.describe('FAQs: the decision questions, one to three sentences each', () => {
  const FAQ_PAGES: { route: string; selector: string; min: number }[] = [
    { route: '', selector: '#faq details', min: 3 },
    { route: 'partner-with-us/', selector: '#faqs details', min: 2 },
    { route: 'partner-with-us/governments/', selector: '#faq details', min: 5 },
    { route: 'partner-with-us/development-partners/', selector: '#faq details', min: 5 },
    { route: 'partner-with-us/foundations/', selector: '#faq details', min: 4 },
    { route: 'partner-with-us/universities/', selector: '#faq details', min: 3 },
    { route: 'partner-with-us/employers/', selector: '#faq details', min: 3 },
    { route: 'partner-with-us/local-partners/', selector: '#faq details', min: 3 },
    { route: 'partner-with-us/investors/', selector: '#faq details', min: 3 },
  ];
  for (const p of FAQ_PAGES) {
    test(`${p.route || 'Home'}: every answer is at most three sentences`, async ({ page }) => {
      await open(page, p.route);
      const items = page.locator(p.selector);
      expect(await items.count()).toBe(p.min);
      const answers = await items.evaluateAll((els) =>
        els.map((d) => {
          const q = (d.querySelector('summary')?.textContent ?? '').replace(/\s+/g, ' ').trim();
          const all = (d.textContent ?? '').replace(/\s+/g, ' ').trim();
          return { q, a: all.startsWith(q) ? all.slice(q.length).trim() : all };
        }),
      );
      for (const { q, a } of answers) {
        const sentences = a.split(/(?<=[.!?])\s+(?=[A-Z“])/).filter(Boolean);
        expect(sentences.length, `${q}: ${a}`).toBeLessThanOrEqual(3);
      }
    });
  }
});

test.describe('Home', () => {
  // WP42 (cycle-19 review): the government slide is second, so the reach slide was the sixth. WP53 (owner decision 2026-10-16): the reach slide is gone; the reach figure is the hero's "Reach Since 2014" card
  test('the reach figure is tagged as reach, not impact: the hero card is "Reach Since 2014" and no carousel slide says "Reach at Scale" or "Impact at Scale"', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('.hh__card[data-fact="SC-16"] .hh__eyebrow')).toHaveText('Reach Since 2014');
    const region = compact(await page.locator('#results').textContent());
    expect(region).not.toContain('Impact at Scale');
    expect(region).not.toContain('Reach at Scale');
  });

  test('the comparison answers each row with its own cell: the self-paced Mentoring cell is not its Work Entry cell; WP31 dropped the freelance-marketplace column on Home', async ({ page }) => {
    await open(page, '');
    expect((await page.locator('#compare thead th').allTextContents()).map(compact)).toEqual(['Approach', 'CodersTrust Supported Cohort', 'Self-Paced Course Platforms']);
    const rows = await page.locator('#compare tbody tr').evaluateAll((trs) => trs.map((tr) => Array.from(tr.querySelectorAll('th, td')).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim())));
    const byLabel = new Map(rows.map((r) => [r[0], r]));
    const mentoring = byLabel.get('Mentoring')!;
    const work = byLabel.get('Work Entry')!;
    expect(mentoring[mentoring.length - 1]).toBe('Varies; often self-directed');
    // WP42 (cycle-19 review): every cell is a fragment with no trailing period, in sentence case, in CodersTrust's column and the comparison column alike
    expect(work[work.length - 1]).toBe('Work-entry support depends on the provider and package');
    expect(mentoring[mentoring.length - 1]).not.toBe(work[work.length - 1]);
    // WP31: the independent-evidence cell is one clause on Home (the shared cell keeps its longer wording elsewhere)
    expect(byLabel.get('Independent Evidence')![1]).toBe('One randomized trial of a predecessor program (200 hours, women in Dhaka); independent evaluation of your cohort welcome');
  });

  test('the recognition band leads with the university and UN-mandated partners, then AWS, then the EdTech listing; the 2014–2016 press list is a link away', async ({ page }) => {
    await open(page, '');
    const band = page.locator('#recognition');
    await expect(band.locator('h2')).toHaveText('Partners and Recognition');
    await expect(band.locator('h3')).toHaveText(['University and UN-Mandated Partners', 'AWS Authorized Training Partner', 'HolonIQ South Asia EdTech 100']);
    expect(compact(await band.locator('.rec__badge').first().textContent())).toContain('University for Peace (UPEACE), the UN-mandated university');
    expect(compact(await band.textContent())).not.toMatch(/Forbes|Wall Street Journal|TechCrunch/);
    await expect(band.getByRole('link', { name: 'See All Recognition and Media' })).toHaveCount(1);
  });

  test('no statistic is shown a third time: the reach figure is on the hero card and the reach slide only', async ({ page }) => {
    await open(page, '');
    const main = compact(await page.locator('main').textContent());
    expect((main.match(/130,000\+/g) ?? []).length, 'the hero card and the reach slide').toBeLessThanOrEqual(2);
    expect(compact(await page.locator('#guide').textContent())).not.toContain('130,000+');
  });
});

test.describe('Partner with Us: sections that moved or went', () => {
  // WP37 (cycle-14 review): the Her Power card (WP29) is gone too; its case study is a text link under the contracts table
  // WP46 (cycle-22 review): "What a Ministry Sees" (#ministry-sees) is gone too; it restated the reporting cadence stated elsewhere on the page (tests/wp46.spec.ts)
  test('Governments: the contracts table stays; the ministry timeline, the Her Power card, the second Her Power case-card set and the scale callout are gone', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#model-partnership')).toHaveCount(0);
    await expect(page.locator('#contracts a', { hasText: 'Read the Her Power Case Study' })).toHaveCount(1);
    await expect(page.locator('#contracts')).toHaveCount(1);
    await expect(page.locator('#ministry-sees')).toHaveCount(0);
    await expect(page.locator('#cases')).toHaveCount(0);
    await expect(page.locator('#scale')).toHaveCount(0);
    await expect(page.locator('#national-target')).toHaveCount(0);
  });

  test('Foundations: the hero has one primary button and no inquiry links; the funding-route comparison comes before them', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const order = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('main [id], main .fr__inquire')).map((e) => e.id || 'inquire');
      return { table: ids.indexOf('funding-routes'), inquire: ids.indexOf('inquire'), cohorts: ids.indexOf('cohort-grants') };
    });
    expect(order.table).toBeGreaterThan(-1);
    expect(order.inquire).toBeGreaterThan(order.table);
    expect(order.inquire).toBeLessThan(order.cohorts);
  });

  test('every audience page keeps its positioning statement, call to action and due-diligence block (WP34: one short item, four rows on Employers)', async ({ page }) => {
    for (const slug of ['development-partners', 'governments', 'foundations', 'universities', 'employers', 'local-partners']) {
      await open(page, `partner-with-us/${slug}/`);
      await expect(page.locator('#mechanism .pos__text'), slug).toHaveCount(1);
      await expect(page.locator('#cta'), slug).toHaveCount(1);
      await expect(page.locator('#due-diligence'), slug).toHaveCount(1);
      await expect(page.locator('#due-diligence li'), slug).toHaveCount(slug === 'employers' ? 4 : 0);
    }
  });
});

test.describe('mega-menu featured panels point to a different decisive page than the first item of their menu', () => {
  test.use({ viewport: DESKTOP });
  test('About, Our Model, Programs, Partner with Us and Impact', async ({ page }) => {
    await open(page, '');
    for (const id of ['about', 'model', 'programs', 'impact', 'partner']) {
      const first = await page.locator(`#mega-${id} .mega__links a.mega__link`).first().getAttribute('href');
      const featured = await page.locator(`#mega-${id} .mega__feature a.link`).getAttribute('href');
      expect(featured, id).not.toBe(first);
    }
  });

  test('each panel uses its target page’s own menu description (no new claim)', async ({ page }) => {
    await open(page, '');
    const cases: [string, string, string][] = [
      ['about', '/about/governance/', 'How CodersTrust is organized and reports to partners.'],
      ['model', '/our-model/jobready-platform/', 'Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.'],
      // WP54 (cycle-28 review, Claude S7): the line no longer carries the Bangladesh aim (tests/wp54.spec.ts)
      ['programs', '/programs/youthwide/', 'Co-funded country cohorts, designed for three regions, from training to paid digital work.'],
      // WP48 (cycle-23 review): the Governments blurb no longer implies a delivered national program (tests/wp48.spec.ts)
      ['partner', '/partner-with-us/governments/', 'Curriculum, trainer training and phased delivery for ministries.'],
    ];
    for (const [id, href, text] of cases) {
      const target = page.locator(`#mega-${id} .mega__links a.mega__link[href$="${href}"] .mega__desc`);
      expect(compact(await target.textContent()), id).toBe(text);
      expect(compact(await page.locator(`#mega-${id} .mega__feature-text`).textContent()), id).toBe(text);
      expect(await page.locator(`#mega-${id} .mega__feature a.link`).getAttribute('href'), id).toMatch(new RegExp(`${href.replace(/\//g, '\\/')}$`));
    }
  });
});

test.describe('layout', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the rewritten pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const b of BUDGETS) {
        await open(page, b.route);
        expect(await noOverflow(page), b.label).toBe(true);
      }
    });
  }
});
