import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { CONTRACT_FIGURES, CONTRACT_TOTAL_NOTE } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP83 behaviors (owner answer 2026-10-23: "Her Power's 25,125 is the national program's TARGET, not a count of women trained"; CLR review finding 2). Retrospective coverage (the owner exempted this
 * project from test-first work). Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp83.spec.ts --project=chromium`:
 *   - 1: the register says Her Power is "a national program to train 25,125 women" (GV-01, GV-10) and the contract-scope total "includes Her Power’s national target of 25,125 women" (GV-12 note, CONTRACT_TOTAL_NOTE);
 *   - 1: every page that states the 25,125 words it as a target (Home slide 2, Impact, the Her Power case study, Governments, Investors, JobReady Platform, YouthWIDE); no built page, JSON-LD included, says the national program
 *     trained 25,125 women; the 372-of-800 tracked outcome (47%) is unchanged;
 *   - 1: the Her Power news post's banner reads "Target: ..." (not "Delivered: ..."), tied to GV-01;
 *   - 1: Home's carousel keeps its height budget (no slide leaves more than 48 px unused at 1280 and 390, no horizontal overflow);
 *   - 2: the Recognition and Media card for Tech in Asia carries the article's own headline, in Title Case;
 *   - 3 (owner, 2026-10-23: "CodersTrust trained 2,400 women directly in Her Power, not 2,500"; source: the owner's "CT - JobReady Platform" sheet, Ex-Trainees Data): GV-13, GV-11, GV-10, GV-12 and PR-05 read 2,400,
 *     and on no built page does a "2,500" stand for the women CodersTrust trained directly (the one remaining "2,500" is the pilot size in "1,000–2,500 trainees").
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

/** Every built page (redirect stubs excluded) with its HTML. */
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The visible text of a built page (no scripts or styles), entities decoded. */
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );

/** The measure of tests/wp61.spec.ts (budget 48 px at 1280 and 390): unused space between the showing slide's content and the controls bar. */
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

const TARGET_NOTE = 'The total is contract scope, not a count of completers; it includes Her Power’s national target of 25,125 women (CodersTrust trained 2,400 directly).';
/** WP84: the shared note also says the 25,125 is the curriculum reach already counted in the 150,000+ enrollments. */
const CONTRACT_NOTE = `${TARGET_NOTE} Her Power’s 25,125 is the same curriculum reach counted in the 150,000+ enrollments, not additional people.`;
/** Wordings that say the national program (or its 25,125 women) was trained. */
const TRAINED_25125 = [
  /trained 25,125/i,
  /25,125 (?:women )?(?:were |have been )?(?:trained|delivered|reached|graduated)/i,
  /25,125 women trained/i,
  /national program trained/i,
  /Delivered: the national program/i,
];

test.describe('WP83: the register words Her Power’s 25,125 as a target', () => {
  test('GV-01 and GV-10 say "a national program to train 25,125 women"; GV-11 and GV-13 keep CodersTrust’s own 2,400 trained directly', () => {
    expect(fact('GV-01').text).toBe('Her Power (DoICT, ICT Division) is a national program to train 25,125 women across 130 sub-districts (upazilas)'); // WP84: "is", where it had a colon
    expect(fact('GV-01').stat?.value).toBe('25,125');
    expect(fact('GV-01').stat?.label).toBe('women targeted for training across 130 sub-districts (upazilas) in the national program');
    expect(fact('GV-10').text).toContain('curriculum for a national program to train 25,125 women, with 2,400 women trained directly');
    expect(fact('GV-11').text).toContain('2,400 women trained directly');
    expect(fact('GV-13').stat?.value).toBe('2,400');
    expect(fact('PR-05').stat?.value).toBe('372 of 800');
  });

  test('GV-12’s note and the shared contract-scope note say the total includes Her Power’s national target, and CodersTrust trained 2,400 directly', () => {
    expect(fact('GV-12').stat?.glance?.note).toBe('The figure is contract scope, not a count of completers. It includes Her Power’s national target of 25,125 women; CodersTrust trained 2,400 women directly.');
    expect(fact('GV-12').stat?.value).toBe('30,000+');
    expect(CONTRACT_FIGURES).toEqual({ national: '25,125', direct: '2,400' });
    expect(CONTRACT_TOTAL_NOTE.text).toBe(CONTRACT_NOTE);
    expect(CONTRACT_TOTAL_NOTE.facts).toEqual(['GV-12', 'GV-01', 'GV-11', 'SC-02']);
  });

  test('no register fact says the national program trained 25,125 women', () => {
    for (const id of ['GV-01', 'GV-10', 'GV-11', 'GV-12', 'GV-13', 'PR-05']) {
      const f = fact(id);
      const all = [f.text, f.stat?.label, f.stat?.glance?.note, f.stat?.glance?.label].filter(Boolean).join(' | ');
      for (const re of TRAINED_25125) expect(all, `${id} vs ${re}`).not.toMatch(re);
    }
  });
});

test.describe('WP83: no built page says the national program trained 25,125 women', () => {
  test('the HTML of every page (text, meta and JSON-LD) has none of the "trained 25,125" wordings; the news post’s own "aims to train" headline stays', () => {
    const offenders: string[] = [];
    for (const p of builtPages()) {
      for (const re of TRAINED_25125) if (re.test(p.html)) offenders.push(`${p.route} ${re}`);
    }
    expect(offenders).toEqual([]);
    const post = builtPages().find((p) => p.route === '/news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/');
    expect(post, 'the Her Power news post is built').toBeTruthy();
    expect(visible(post!.html)).toContain('Her Power Contract Aims to Train 25,125 Women');
  });

  test('every built page that shows 25,125 states it as a target or an aim: "to train", "target of" or "target is to train" (the news post’s archived text says "train and facilitate")', () => {
    const pages = builtPages().filter((p) => visible(p.html).includes('25,125'));
    expect(pages.map((p) => p.route).sort()).toEqual([
      '/impact/',
      '/impact/case-studies/her-power/',
      '/',
      '/news/',
      '/news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/',
      '/our-model/jobready-platform/',
      '/partner-with-us/governments/',
      '/partner-with-us/investors/',
      '/programs/youthwide/',
      '/styleguide/',
    ].sort());
    for (const p of pages) {
      const text = visible(p.html);
      const mentions = [...text.matchAll(/25,125/g)].map((m) => text.slice(Math.max(0, m.index - 110), m.index + 40));
      for (const m of mentions) expect(m, `${p.route}: "${m}"`).toMatch(/to train|national target of|aims? to train|train and (?:support|facilitate)|Aims to Train/);
    }
  });

  test('the older section heading and sentence are gone: "National Scale: A Different Measure", "reach is counted separately"', () => {
    const offenders = builtPages().filter((p) => /National Scale: A Different Measure|reach is counted separately/.test(visible(p.html))).map((p) => p.route);
    expect(offenders).toEqual([]);
  });
});

test.describe('WP83: the pages that state the 25,125', () => {
  test.use({ viewport: DESKTOP });

  test('Home slide 2: "Her Power, one of the six, is a national program to train 25,125 women; CodersTrust trained 2,400 directly."; the 30,000+ and the NU sentence stay', async ({ page }) => {
    await open(page, '');
    const lead = slide(page, 2).locator('.hs__lead');
    expect(compact(await lead.textContent())).toBe(
      'Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, is a national program to train 25,125 women; CodersTrust trained 2,400 directly. As National University’s official training partner for digital career skills and credentials, CodersTrust is onboarding 1.5M+ learners, the university’s own learners, not learners trained by CodersTrust.',
    );
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
  });

  test('Impact: the 30,000+ tile carries the target note; the Her Power tile says its target is a separate figure', async ({ page }) => {
    await open(page, 'impact/');
    const tile = page.locator('#glance [data-fact~="GV-12"]').first();
    expect(compact(await tile.textContent())).toContain(TARGET_NOTE);
    const her = page.locator('#glance [data-fact~="PR-05"]').first();
    expect(compact(await her.textContent())).toContain('Her Power: tracked women in work (47%), from the 2,400 CodersTrust trained directly');
    expect(compact(await her.textContent())).toContain('Within the national program scope; the national program’s target is a separate figure.');
  });

  test('Governments: the tile and the table row say target; the FAQ says "Her Power is a national program to train 25,125 women"; the note exempts only CodersTrust’s own Her Power figures', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    expect(compact(await page.locator('#glance li', { hasText: '30,000+' }).locator('.pg__note').textContent())).toBe(CONTRACT_NOTE);
    const row = compact(await page.locator('#contracts tbody tr').first().textContent());
    expect(row).toContain('CodersTrust trained 2,400 women directly. The national program’s target is to train 25,125 women across 130 sub-districts (upazilas). 54,609 manuals and guidelines were distributed.');
    expect(compact(await page.locator('#contracts .ct__notes').textContent())).toBe('We confirm each contract’s delivery status in a briefing. Apart from CodersTrust’s own Her Power figures, scopes are contracted scopes of work, not delivered scale.');
    expect(compact(await page.locator('#contracts caption').textContent())).toContain('Apart from CodersTrust’s own Her Power figures, counts are contract training scopes, not delivered scale.');
    const faq = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) }).first();
    expect(compact(await faq.textContent())).toContain('We scale in phases. Her Power is a national program to train 25,125 women; CodersTrust provided the curriculum and trained 2,400 directly. A 100,000+ program is a design option we have not yet delivered.');
  });

  test('Investors: the tile and the FAQ say target (CodersTrust’s role first); JobReady Platform’s tile says target', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(compact(await page.locator('#reach .ir__note').textContent())).toBe(CONTRACT_NOTE);
    const faq = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) }).first();
    expect(compact(await faq.textContent())).toContain('trained 2,400 women directly; the national program’s target is to train 25,125 women across 130 sub-districts (upazilas).');
    await open(page, 'our-model/jobready-platform/');
    expect(compact(await page.locator('#why .jr__whynote').textContent())).toBe(CONTRACT_NOTE);
  });

  test('YouthWIDE: the national-scale answer says Her Power is a national program of DoICT, the ICT Division, to train 25,125 women', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const faq = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) }).first();
    expect(compact(await faq.textContent())).toContain('Her Power is a national program of DoICT, the ICT Division, to train 25,125 women across 130 sub-districts (upazilas). CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,400 women directly.');
  });

  test('the Her Power case study: "National Target: A Different Measure"; the tracked 372 of 800 from the 2,400 trained directly is unchanged', async ({ page }) => {
    await open(page, 'impact/case-studies/her-power/');
    await expect(page.getByRole('heading', { level: 3, name: 'National Target: A Different Measure' })).toBeVisible();
    const scale = compact(await page.locator('.hp__scale').textContent());
    expect(scale).toContain('The in-work figure above covers 800 tracked women from the 2,400 that CodersTrust trained directly. The national program’s target is separate: Her Power (DoICT, ICT Division) is a national program to train 25,125 women across 130 sub-districts (upazilas).');
    expect(await page.locator('.hp__scale').getAttribute('data-fact')).toBe('GV-01');
    expect(compact(await page.locator('main').textContent())).toContain('Her Power (ICT Division / DoICT): 372 of 800 tracked women, from the 2,400 trained directly by CodersTrust, were in work (47%)');
    expect(titleCase('National Target: A Different Measure')).toBe('National Target: A Different Measure');
  });

  test('the Her Power news post: the banner note is "Target: ..." and "Delivered" appears nowhere in it', async ({ page }) => {
    await open(page, 'news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/');
    const note = page.locator('.archive-banner .archive-banner__note');
    await expect(note).toHaveText('Target: Her Power is a national program to train 25,125 women. See the Her Power case study.');
    expect(await note.getAttribute('data-fact')).toBe('GV-01');
    expect(compact(await page.locator('.archive-banner').textContent())).not.toMatch(/Delivered/);
    expect(await note.locator('a').getAttribute('href')).toMatch(/\/impact\/case-studies\/her-power\/$/);
  });
});

test.describe('WP83: Home’s carousel keeps its height budget with the longer Her Power sentence', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`no slide leaves more than 48 px unused below its content at ${vp.width}px, and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, '');
      for (const n of [1, 2, 3, 4]) {
        await showSlide(page, n);
        const gap = await unusedBelow(page);
        expect(gap, `slide ${n} at ${vp.width}px: unused space below the content`).toBeLessThanOrEqual(48);
        expect(gap, `slide ${n} at ${vp.width}px: content must not run into the controls`).toBeGreaterThanOrEqual(0);
      }
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    });
  }
});

test.describe('WP83: Recognition and Media shows the Tech in Asia article’s own headline (CLR review, finding 2)', () => {
  const HEADLINE = 'This Microfinance Startup Teaches Students in Bangladesh, Africa How to Code';
  const OLD = 'A Novel Idea in Microfinance Is Turning Bangladeshis into Freelance Coders';

  test('the data source holds the article’s headline, in Title Case, with its 2015 date and legacy URL unchanged', () => {
    // src/data/press.ts imports image assets, so the spec reads its source text instead of importing it
    const source = readFileSync(new URL('../src/data/press.ts', import.meta.url), 'utf8');
    const block = /outlet: "Tech in Asia",[\s\S]*?headline: "([^"]+)",\s*date: "([^"]+)",[\s\S]*?legacyUrl: "([^"]+)"/.exec(source);
    expect(block, 'the Tech in Asia item is in src/data/press.ts').not.toBeNull();
    expect(block![1]).toBe(HEADLINE);
    expect(titleCase(HEADLINE)).toBe(HEADLINE);
    expect(block![2]).toBe('2015-10-20');
    expect(block![3]).toBe('https://coderstrust.global/featured-media/a-novel-idea-in-microfinance-is-turning-bangladeshis-into-freelance-coders/');
    expect(source).not.toContain(`headline: "${OLD}"`);
  });

  test('the card on the page reads the article’s headline beside "2015"; the old legacy-card wording is on no built page', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'about/recognition/');
    const card = page.locator('#coverage .rec-press__item', { has: page.locator('img[alt="Tech in Asia logo"]') });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.rec-press__headline').textContent())).toBe(HEADLINE);
    expect(compact(await card.locator('time').textContent())).toBe('2015');
    expect(await page.locator('#coverage .rec-press__headline').count()).toBe(8);
    expect(builtPages().filter((p) => p.html.includes(OLD)).map((p) => p.route)).toEqual([]);
  });
});

test.describe('WP83: CodersTrust trained 2,400 women directly in Her Power (owner, 2026-10-23)', () => {
  test('the register reads 2,400: GV-13 (value, numeric, text), GV-11, GV-10, GV-12’s note and PR-05 (text and label); the 800 tracked, 372 and 47% are unchanged', () => {
    expect(fact('GV-13').stat?.value).toBe('2,400');
    expect(fact('GV-13').stat?.numeric).toBe(2400);
    expect(fact('GV-13').text).toBe('Her Power (DoICT, ICT Division): 2,400 women trained directly by CodersTrust');
    expect(fact('GV-11').text).toBe('CodersTrust’s role in Her Power: curriculum, training manuals and mentorship guidelines; Training of Trainers; 2,400 women trained directly; 54,609 manuals and guidelines distributed');
    expect(fact('GV-10').text).toContain('with 2,400 women trained directly');
    expect(fact('GV-12').stat?.glance?.note).toContain('CodersTrust trained 2,400 women directly.');
    expect(fact('PR-05').text).toBe('Her Power (ICT Division / DoICT): 372 of 800 tracked women, from the 2,400 trained directly by CodersTrust, were in work (47%); 18.6% of those 800 were in work during the course');
    expect(fact('PR-05').stat?.value).toBe('372 of 800');
    expect(fact('PR-05').stat?.label).toBe('tracked women, from the 2,400 trained directly by CodersTrust, in work: 47%');
    expect(CONTRACT_FIGURES.direct).toBe('2,400');
  });

  test('no built page uses "2,500" for Her Power: the only "2,500" left is the pilot size in "1,000–2,500 trainees"', () => {
    const offenders: string[] = [];
    for (const p of builtPages()) {
      // visible text, then the whole markup (meta tags and JSON-LD)
      for (const text of [visible(p.html), p.html]) {
        for (const m of text.matchAll(/2,500/g)) {
          const at = m.index ?? 0;
          if (text.slice(Math.max(0, at - 6), at) !== '1,000–') offenders.push(`${p.route}: "${text.slice(Math.max(0, at - 40), at + 40)}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('every "2,400" on a built page is about women CodersTrust trained directly ("directly" within the sentence)', () => {
    const seen = new Set<string>();
    const offenders: string[] = [];
    for (const p of builtPages()) {
      const text = visible(p.html);
      for (const m of text.matchAll(/2,400/g)) {
        seen.add(p.route);
        const at = m.index ?? 0;
        const near = text.slice(Math.max(0, at - 70), at + 70);
        if (!/directly/.test(near)) offenders.push(`${p.route}: "${near}"`);
      }
    }
    expect(offenders).toEqual([]);
    // the pages that carry the Her Power counts say it: Home, Impact, the case study, Governments, Investors, JobReady Platform and YouthWIDE
    for (const route of ['/', '/impact/', '/impact/case-studies/her-power/', '/partner-with-us/governments/', '/partner-with-us/investors/', '/our-model/jobready-platform/', '/programs/youthwide/']) {
      expect(seen.has(route), `${route} states the 2,400`).toBe(true);
    }
  });

  test('the Her Power case study, Impact and the Governments tile read "2,400 trained directly"; the 372 of 800 (47%) line is unchanged', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'impact/case-studies/her-power/');
    const study = compact(await page.locator('main').textContent());
    expect(study).toContain('Her Power (ICT Division / DoICT): 372 of 800 tracked women, from the 2,400 trained directly by CodersTrust, were in work (47%)');
    expect(study).toContain('The in-work figure above covers 800 tracked women from the 2,400 that CodersTrust trained directly.');
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance [data-fact~="PR-05"]').first().textContent())).toContain('Her Power: tracked women in work (47%), from the 2,400 CodersTrust trained directly');
    await open(page, 'partner-with-us/governments/');
    expect(compact(await page.locator('#glance li', { hasText: '372 of 800' }).textContent())).toContain('Her Power: 47% of the 800 tracked women in work, from the 2,400 women CodersTrust trained directly');
  });
});
