import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fact, sources } from '../src/data/facts';
import { DIST_DIR } from './support/env';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP57b behaviors (the owner's decisions of 2026-10-19 and GLM's accepted items L3, L5 and L8 of cycle 29). Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the
 * built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp57b.spec.ts --project=chromium`):
 *   - G1: "Remove the 56 item": the Kosovo case study no longer shows "56 won online contracts (~180 jobs)" (nor does any other built file); it keeps 102 of 150 in work, the earnings line and the World Bank's 77;
 *   - external statistics: "name publisher + year", inside the sentence, no footnotes: the 62 million (PX-01, "(CodersTrust estimate from ILO data, 2026)"), the 19M+ (PX-02, "(ILOSTAT, 2019–2025)"), the 72% of employers (PX-05,
 *     "(ManpowerGroup, 2026)") and the AI-skills growth (PX-08, "(PwC, 2026)"), each note taken from the fact's registered source, never in a title or meta description;
 *   - L3: Home slide 4 reads "Four delivered programs, with results from each program’s records." (WP64, cycle-36 review: "Results from the records of four programs."; tests/wp64.spec.ts);
 *   - L5: Development Partners' quarterly reviews carry "as agreed in the program scope";
 *   - L8: About and llms.txt say "Additional country and regional offices are planned." (the register's ID-11 keeps "in the next few years").
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** Built pages that are not archived news posts (those keep their original wording), with their HTML. */
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const mainText = (html: string) =>
  compact(
    (html.includes('<main') ? html.slice(html.indexOf('<main'), html.indexOf('</main>')) : html)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, '’'),
  );
const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
};
/** Every text-like file of the build (pages, llms.txt, the sitemaps, the manifests), with its path. */
const builtFiles = () =>
  walk(DIST_DIR)
    .filter((f) => /\.(html|txt|xml|json|csv|webmanifest)$/.test(f))
    .map((f) => ({ file: relative(DIST_DIR, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));

const HOME = '';
const ABOUT = 'about/';
const KOSOVO = 'impact/case-studies/kosovo-women-in-online-work/';
const INVESTORS = 'partner-with-us/investors/';
const DP = 'partner-with-us/development-partners/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G1, Kosovo: "56 won online contracts (~180 jobs)" is removed', () => {
  test('the case study lists "In Work" (102 of 150 women in work, 68%) and "Online Earnings" only, still tied to PR-02, and the World Bank’s 77 follows the lines', async ({ page }) => {
    await open(page, KOSOVO);
    expect(await texts(page, '.kw__results dt')).toEqual(['In Work', 'Online Earnings']);
    expect(await texts(page, '.kw__results dd')).toEqual(['102 of the 150 women trained were in work (68%)','78 program completers earned a combined total of about $25,000 online']);
    expect(await page.locator('.kw__results').getAttribute('data-fact')).toBe('PR-02');
    const results = compact(await page.locator('#results').textContent());
    expect(results).not.toMatch(/56|180|Online Contracts/);
    expect(results).toContain('The figures above are from CodersTrust program records.');
    expect(results).toContain('The World Bank reports that 77 trainees in the Women in Online Work pilot in Kosovo won at least one online work contract in the pilot’s first two phases.');
    expect(results.indexOf('102 of 150'), 'the program records come first').toBeLessThan(results.indexOf('77 trainees'));
  });

  test('no built file (pages, archived posts, llms.txt, the sitemaps and manifests) prints the 56 or the ~180 jobs', () => {
    const hits = builtFiles()
      .filter((f) => /56 won online contracts|~180 jobs|won online contracts \(/.test(f.text))
      .map((f) => f.file);
    expect(hits).toEqual([]);
  });

  test('the register entry PR-02 is shared with the lines that stay, so only what renders changed: the 102 of 150 and the earnings clause are still its first two clauses', () => {
    const parts = fact('PR-02').text.split(': ')[1]?.split('; ') ?? [];
    expect(parts[0]).toMatch(/^102 of the 150 women trained were in work/);
    expect(parts[1]).toMatch(/earned a combined total/);
  });

  test('both Kosovo figures are still shown where the Kosovo outcome appears (the card, the tiles and the case study keep "102 of 150" and the World Bank’s 77)', async ({ page }) => {
    for (const route of [HOME, DP, KOSOVO, 'impact/']) {
      await open(page, route);
      const main = compact(await page.locator('main').textContent());
      expect(main, route || 'home').toContain('102 of 150');
      expect(main, route || 'home').toMatch(/77 trainees/);
    }
  });

  test('the results block fits at 1280 and 390 with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, KOSOVO);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('external statistics name their publisher and year inside the sentence (owner decision 2026-10-19)', () => {
  const NOTES: Record<string, string> = {
    'PX-01': '; CodersTrust estimate from ILO data, 2026)',
    'PX-02': '(ILOSTAT, 2019–2025)',
    'PX-05': '(ManpowerGroup, 2026)',
    'PX-08': '(PwC, 2026)',
  };
  /** Where each figure is shown today: route, fact, and how many elements carry it. */
  const PLACES: [string, string][] = [
    [HOME, 'PX-01'],
    [HOME, 'PX-02'],
    [DP, 'PX-01'],
    ['partner-with-us/employers/', 'PX-05'],
    ['partner-with-us/foundations/', 'PX-01'],
    ['partner-with-us/governments/', 'PX-01'],
    [INVESTORS, 'PX-01'],
    [INVESTORS, 'PX-05'],
    [INVESTORS, 'PX-08'],
    ['partner-with-us/universities/', 'PX-05'],
    ['programs/nu-postgraduate-diploma/', 'PX-05'],
    ['programs/youthwide/', 'PX-01'],
    ['programs/youthwide/', 'PX-02'],
  ];

  test('every tile or sentence of the four figures ends with its note, inside the same sentence (13 places on 9 pages)', async ({ page }) => {
    let last: string | null = null;
    for (const [route, id] of PLACES) {
      if (route !== last) await open(page, route);
      last = route;
      const holders = page.locator(`main [data-fact="${id}"]`);
      await expect(holders, `${route || 'home'} ${id}`).toHaveCount(1);
      const text = await holders.first().evaluate((el) => {
        const c = el.cloneNode(true) as HTMLElement;
        c.querySelectorAll('.sr-only').forEach((n) => n.remove());
        return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
      });
      // PX-08 is a sentence the page ends with a period; the others are tile labels
      expect(text, `${route || 'home'} ${id}`).toMatch(new RegExp(`${NOTES[id].replace(/[()+.]/g, '\\$&')}\\.?$`));
    }
  });

  test('the notes are the registered sources’ own publishers and years: each fact’s source names them, and PX-01 is worded as a CodersTrust estimate (not an ILO statistic)', () => {
    const cited = (id: string) => fact(id).sourceIds.map((s) => sources[s]?.citation ?? '').join(' ');
    expect(fact('PX-05').sourceIds).toEqual(['MANPOWER26']);
    expect(cited('PX-05')).toContain('ManpowerGroup');
    expect(cited('PX-05')).toContain('2026');
    expect(fact('PX-08').sourceIds).toEqual(['PWC26']);
    expect(cited('PX-08')).toContain('PwC');
    expect(cited('PX-08')).toContain('2026');
    expect(fact('PX-02').sourceIds).toEqual(['ILOSTAT26']);
    expect(cited('PX-02')).toContain('ILOSTAT');
    expect(cited('PX-02')).toContain('2019–2025');
    expect(fact('PX-01').sourceIds).toEqual(['PX01CALC']);
    expect(cited('PX-01')).toContain('CodersTrust analysis of ILOSTAT and ILO');
    expect(cited('PX-01')).toContain('2026');
    expect(fact('PX-01').text).toContain('An estimated 62 million');
  });

  test('the register’s own wording is unchanged: only what renders carries the note', () => {
    expect(fact('PX-05').stat?.label).toBe('of employers globally reported difficulty finding talent in 2026');
    expect(fact('PX-02').stat?.label).toBe('university-educated people of all working ages unemployed across South Asia, the Middle East and North Africa, and Sub-Saharan Africa');
    expect(fact('PX-01').stat?.label).toMatch(/\(range 61–78 million\)$/);
    expect(fact('PX-08').text).toBe('Globally, jobs requiring AI skills grew 69% vs. 9% for all jobs, with a 62% wage premium');
    for (const id of Object.keys(NOTES)) {
      expect(fact(id).text, id).not.toMatch(/\((?:CodersTrust estimate|ILOSTAT|ManpowerGroup|PwC),/);
      expect(fact(id).stat?.label ?? '', id).not.toMatch(/\((?:CodersTrust estimate|ILOSTAT|ManpowerGroup|PwC),/);
    }
  });

  test('wherever a built page shows one of the four figures it shows that figure’s note, and a note is never printed without its figure (the staging-only component gallery included)', () => {
    const FIGURES: [string, RegExp][] = [
      ['PX-01', /62 million/],
      ['PX-02', /19M\+/],
      ['PX-05', /72% of employers/],
      ['PX-08', /jobs requiring AI skills grew 69%/],
    ];
    const problems: string[] = [];
    for (const p of sitePages()) {
      const text = mainText(p.html);
      for (const [id, re] of FIGURES) {
        const shows = re.test(text);
        const noted = text.includes(NOTES[id]);
        if (shows && !noted) problems.push(`${p.route}: ${id} is shown without ${NOTES[id]}`);
        if (noted && !shows) problems.push(`${p.route}: ${NOTES[id]} is printed without its figure`);
      }
    }
    expect(problems).toEqual([]);
  });

  test('no title and no meta description carries a note (page titles and descriptions stay as they were, within their limits)', () => {
    const offenders = sitePages().flatMap((p) => {
      const title = /<title>([^<]*)<\/title>/.exec(p.html)?.[1] ?? '';
      const description = /<meta name="description" content="([^"]*)"/.exec(p.html)?.[1] ?? '';
      return [title, description].filter((t) => /(?:\(|; )(?:CodersTrust estimate from ILO data|ILOSTAT, 2019|ManpowerGroup, 2026|PwC, 2026)/.test(t)).map((t) => `${p.route}: ${t}`);
    });
    expect(offenders).toEqual([]);
  });

  test('no note is a footnote: no figure of the four is followed by a footnote marker or a source list, and the notes are plain text inside the label (no link, no superscript)', async ({ page }) => {
    for (const route of [HOME, INVESTORS]) {
      await open(page, route);
      for (const id of ['PX-01', 'PX-02', 'PX-05', 'PX-08']) {
        const holders = page.locator(`main [data-fact="${id}"]`);
        if ((await holders.count()) === 0) continue;
        await expect(holders.first().locator('sup, a'), `${route || 'home'} ${id}`).toHaveCount(0);
      }
    }
  });

  test('the longer labels fit: the tiles keep their text inside the card at 1280 and 390, with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const route of [HOME, 'programs/youthwide/', INVESTORS, 'partner-with-us/employers/', 'programs/nu-postgraduate-diploma/']) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route || 'home'} at ${vp.width}px`).toBe(true);
        const clipped = await page.locator('main [data-fact^="PX-0"]').evaluateAll((els) =>
          els.flatMap((el) => {
            const card = el.closest('article, .card, .th__card') as HTMLElement | null;
            const box = (card ?? (el as HTMLElement)).getBoundingClientRect();
            const r = (el as HTMLElement).getBoundingClientRect();
            return r.width > 0 && (r.right > box.right + 1 || r.left < box.left - 1) ? [`${el.getAttribute('data-fact')}: ${Math.round(r.right)} > ${Math.round(box.right)}`] : [];
          }),
        );
        expect(clipped, `${route || 'home'} at ${vp.width}px`).toEqual([]);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WP64 (cycle-36 review, Claude): the lead is now "Results from the records of four programs." (Impact counts five delivered programs, Albania among them, which has no outcome figure; tests/wp64.spec.ts); the program lines are unchanged
test.describe('L3, Home: slide 4 reads "Results from the records of four programs." (WP57b: "Four delivered programs, with results from each program’s records.")', () => {
  test('the lead is the shorter line, and the four program lines under it are unchanged', async ({ page }) => {
    await open(page, HOME);
    const slide = page.locator('#results [data-hs-slide]').nth(3);
    await expect(slide.locator('.hs__lead')).toHaveText('Results from the records of four programs.');
    await expect(slide.locator('.hs__lines li')).toHaveCount(4);
    expect(compact(await slide.textContent())).not.toContain('each with its partner');
  });

  test('no built page still says "each with its partner, with results from their own records"', () => {
    expect(sitePages().filter((p) => /each with its partner, with results from their own records/.test(mainText(p.html))).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L5, Development Partners: the quarterly reviews carry the scope qualifier', () => {
  const SENTENCE = 'For supported cohorts, monthly reports track progress; quarterly reviews, as agreed in the program scope, guide corrective action and any expansion.';

  test('the callout says "quarterly reviews, as agreed in the program scope, guide corrective action and any expansion", tied to PD-08 and PD-11, and names the reviews once on the page', async ({ page }) => {
    await open(page, DP);
    const line = page.locator('main p[data-fact="PD-08 PD-11"]');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(SENTENCE);
    expect(compact(await page.locator('main').textContent()).split('quarterly').length - 1).toBe(1);
  });

  test('no built page keeps the unqualified sentence', () => {
    expect(sitePages().filter((p) => mainText(p.html).includes('quarterly reviews guide corrective action and any expansion')).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L8, About and llms.txt: "Additional country and regional offices are planned."', () => {
  const SHOWN = 'CodersTrust is headquartered in New York, and its parent organization is CT USA, Inc. CodersTrust Bangladesh (CodersTrust Bangladesh Ltd.) is a country office. Additional country and regional offices are planned.';

  test('About prints the three identity sentences with the last one shortened, tied to ID-11, once', async ({ page }) => {
    await open(page, ABOUT);
    await expect(page.locator('main [data-fact="ID-11"]')).toHaveCount(1);
    expect(compact(await page.locator('.hero__copy > .about-identity').textContent())).toBe(SHOWN);
    expect(compact(await page.locator('main').textContent())).not.toContain('in the next few years');
  });

  test('llms.txt states the same sentences on its third line', async ({ request }) => {
    const res = await request.get('llms.txt');
    expect(res.status()).toBe(200);
    expect((await res.text()).split('\n')[2]).toBe(SHOWN);
  });

  test('no built file says "in the next few years" (the register’s ID-11 is an owner statement and keeps its wording; only what renders changed)', () => {
    expect(builtFiles().filter((f) => f.text.includes('in the next few years')).map((f) => f.file)).toEqual([]);
    expect(fact('ID-11').text.startsWith('CodersTrust is headquartered in New York, and its parent organization is CT USA, Inc.')).toBe(true);
  });

  test('the paragraph is still one `fact` paragraph under the lede (set like it: tests/wp52.spec.ts) and wraps inside the page at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, ABOUT);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      await expect(page.locator('.hero__copy > .about-identity > p.fact[data-fact="ID-11"]')).toHaveCount(1);
    }
  });
});
