import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { CONTRACT_FIGURES, CONTRACT_TOTAL_NOTE } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP85 behaviors (owner update 2026-10-24: a CodersTrust team member confirmed to the owner that the government achieved 100% of Her Power's 25,125-trainee target). Retrospective coverage
 * (the owner exempted this project from test-first work). Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp85.spec.ts --project=chromium`:
 *   - 1: the register says the national program TRAINED 25,125 women and met its target (GV-01, GV-10, GV-12's note, SC-02's text and detail, CONTRACT_TOTAL_NOTE); CodersTrust trained 2,400 directly, 372 of 800 tracked (47%),
 *     the 30,000+ contract scope and the 130,000+ figure are unchanged (WP87: the composition changed, the total stays "150,000+");
 *   - 2: on every built page (text, meta tags and JSON-LD) each 25,125 sits in a sentence that says "trained" (or "the 25,125 women Her Power trained", or "the same group counted in the 150,000+ enrollments");
 *     the only other wording is the Her Power news post's archived headline, excerpt and text ("Aims to Train", "train and support", "train and facilitate"), on the post and the news index;
 *   - 3: the pages that state it (Home slide 2, Impact, the Her Power case study, Governments, Investors, JobReady Platform, YouthWIDE) read the new sentences; the case study heading is "National Scale: The Wider Program";
 *     the news post's banner reads "Delivered: the national program trained 25,125 women, its full target.";
 *   - 4: Home's carousel keeps its height budget (no slide leaves more than 48 px unused at 1280 and 390, no horizontal overflow); the changed pages do not scroll sideways at 1280 and 390.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

/** Every built page (redirect stubs excluded) with its HTML. */
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const POST = '/news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/';

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

const SCOPE_NOTE = 'The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).';
const OVERLAP = 'Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.';
const CONTRACT_NOTE = `${SCOPE_NOTE} ${OVERLAP}`;
const SLIDE_2 = 'Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly. As the official training partner of Bangladesh’s National University for digital career skills and credentials, CodersTrust is onboarding 1.5M+ of the university’s own learners, who are not learners trained by CodersTrust.';

/** Wordings that put the 25,125 as a target still to be met (WP83); none may stand. */
const TARGET_WORDING = [/to train 25,125/i, /national target/i, /targeted for training/i, /target of 25,125/i, /target is (?:to train|separate|a separate)/i, /National Target: A Different Measure/, /national program to train/i];

test.describe('WP85: the register says the national program trained 25,125 women and met its target', () => {
  test('GV-01 (text and tile label) and GV-10', () => {
    expect(fact('GV-01').text).toBe('Her Power (DoICT, ICT Division) is a national program that trained 25,125 women across 130 sub-districts (upazilas), meeting its target');
    expect(fact('GV-01').stat?.value).toBe('25,125');
    expect(fact('GV-01').stat?.numeric).toBe(25125);
    expect(fact('GV-01').stat?.label).toBe('women trained across 130 sub-districts (upazilas) in the national program (its full target)');
    expect(fact('GV-10').text).toBe('Government contracts with training scopes ranging from 120+ professionals to 3,120+ digital-lab staff; curriculum for a national program that trained 25,125 women (its full target), with 2,400 women trained directly; separately, 10,000 teachers were trained to teach online during COVID-19');
  });

  test('GV-12’s note and the shared contract-scope note say the total includes the national program, which trained 25,125 women; the 30,000+ stays contract scope', () => {
    expect(fact('GV-12').stat?.value).toBe('30,000+');
    expect(fact('GV-12').stat?.glance?.note).toBe('The figure is contract scope, not a count of completers. It includes Her Power’s national program, which trained 25,125 women and met its target; CodersTrust trained 2,400 women directly.');
    expect(CONTRACT_FIGURES).toEqual({ national: '25,125', direct: '2,400' });
    expect(CONTRACT_TOTAL_NOTE.text).toBe(CONTRACT_NOTE);
    expect(CONTRACT_TOTAL_NOTE.facts).toEqual(['GV-12', 'GV-01', 'GV-11', 'SC-02']);
  });

  test('SC-02 names Her Power’s 25,125 (the WP90 shortened form of the breakdown);130,000+ learners trained and 150,000+ enrollments are unchanged (WP87 changed the composition: 112,926 direct, 40,152 courseware)', () => {
    // the register text keeps the full wording (WP90 shortened only the detail)
    const longBreakdown = '(the 25,125 women Her Power trained nationally with CodersTrust’s curriculum, including the 2,400 CodersTrust also trained directly, and UNDP FutureNation’s 15,027 course learners)';
    expect(fact('SC-02').text).toBe(`150,000+ enrollments since 2014 — 112,926 through direct training across 45 programs and 40,152 reached through CodersTrust curriculum and courseware ${longBreakdown}`);
    // WP91 (triage A1): the detail's wording is the triage's; the figures are unchanged
    expect(fact('SC-02').stat?.detail).toBe('Of 150,000+ enrollments, 112,926 were direct. The other 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both counts, so counted once the total is 150,678.');
    expect(25125 + (fact('SC-14').stat?.numeric ?? 0)).toBe(40152);
    expect(fact('SC-01').stat?.value).toBe('130,000+');
    expect(fact('SC-02').stat?.value).toBe('150,000+');
  });

  test('CodersTrust’s own count and the tracked outcome are unchanged: 2,400 trained directly, 372 of 800 tracked (47%)', () => {
    expect(fact('GV-13').stat?.value).toBe('2,400');
    expect(fact('GV-11').text).toContain('2,400 women trained directly');
    expect(fact('PR-05').stat?.value).toBe('372 of 800');
    expect(fact('PR-05').text).toContain('372 of 800 tracked women, from the 2,400 trained directly by CodersTrust, were in work (47%)');
  });

  test('no register fact words the 25,125 as a target still to be met', () => {
    for (const id of ['GV-01', 'GV-10', 'GV-11', 'GV-12', 'GV-13', 'PR-05', 'SC-02']) {
      const f = fact(id);
      const all = [f.text, f.stat?.label, f.stat?.detail, f.stat?.glance?.note, f.stat?.glance?.label].filter(Boolean).join(' | ');
      for (const re of TARGET_WORDING) expect(all, `${id} vs ${re}`).not.toMatch(re);
    }
  });
});

test.describe('WP85: every 25,125 on a built page is said as trained', () => {
  // WP90: the SC-02 detail's shortened form "courseware (Her Power’s 25,125 and ...)" is a reach figure, not a target
  const TRAINED = /trained 25,125|25,125 women Her Power trained|25,125 is the same group counted|25,125 women the national program trained|courseware: Her Power’s 25,125/;
  const ARCHIVED = /Aims to Train 25,125|aims to train and support 25,125|train and facilitate 25,125/;

  test('text, meta tags and JSON-LD: each 25,125 is in a "trained" context; only the Her Power news post and the news index keep the archived "aims to train" wording', () => {
    const offenders: string[] = [];
    const archived: string[] = [];
    let mentions = 0;
    for (const p of builtPages()) {
      const html = p.html.replace(/&#39;|&#x27;/g, '’').replace(/&amp;/g, '&');
      for (const m of html.matchAll(/25,125/g)) {
        mentions++;
        const near = html.slice(Math.max(0, (m.index ?? 0) - 45), (m.index ?? 0) + 70);
        if (TRAINED.test(near)) continue;
        if (ARCHIVED.test(near) && (p.route === POST || p.route === '/news/')) {
          archived.push(p.route);
          continue;
        }
        offenders.push(`${p.route}: "${near.replace(/\s+/g, ' ')}"`);
      }
    }
    expect(offenders).toEqual([]);
    expect(mentions).toBeGreaterThan(20);
    expect([...new Set(archived)].sort()).toEqual(['/news/', POST].sort());
  });

  test('no built page (the news post and index aside) words the 25,125 as a target still to be met', () => {
    const offenders: string[] = [];
    for (const p of builtPages()) {
      if (p.route === POST || p.route === '/news/') continue;
      for (const re of TARGET_WORDING) if (re.test(p.html)) offenders.push(`${p.route} ${re}`);
    }
    expect(offenders).toEqual([]);
  });

  test('the pages that show the 25,125 are the seven that state it, the post, the news index and the style guide', () => {
    const routes = builtPages().filter((p) => p.html.includes('25,125')).map((p) => p.route).sort();
    expect(routes).toEqual(['/', '/impact/', '/impact/case-studies/her-power/', '/news/', POST, '/our-model/jobready-platform/', '/partner-with-us/governments/', '/partner-with-us/investors/', '/programs/youthwide/', '/styleguide/'].sort());
  });

  test('the archived post keeps its headline as published; its banner note is a "Delivered" line tied to GV-01', () => {
    const post = builtPages().find((p) => p.route === POST);
    expect(post, 'the Her Power news post is built').toBeTruthy();
    expect(post!.html).toContain('Her Power Contract Aims to Train 25,125 Women: Empowerment of Women Through ICT Frontier Initiative');
    expect(post!.html).toContain('Delivered: the national program trained 25,125 women, its full target.');
  });
});

test.describe('WP85: the pages that state the 25,125', () => {
  test.use({ viewport: DESKTOP });

  test('Home slide 2: "Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly."', async ({ page }) => {
    await open(page, '');
    const lead = slide(page, 2).locator('.hs__lead');
    expect(compact(await lead.textContent())).toBe(SLIDE_2);
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
  });

  test('Impact: the 30,000+ tile carries the shared note; the Her Power tile says the 2,400 are among the 25,125 women', async ({ page }) => {
    await open(page, 'impact/');
    const tile = page.locator('#glance [data-fact~="GV-12"]').first();
    expect(compact(await tile.textContent())).toContain(CONTRACT_NOTE);
    const her = compact(await page.locator('#glance [data-fact~="PR-05"]').first().textContent());
    expect(her).toContain('The 2,400 are among the 25,125 women the national program trained.');
    expect(her).not.toMatch(/target/i);
  });

  test('Governments: the tile, the Her Power row and the national-scale answer say trained, meeting its target', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    expect(compact(await page.locator('#glance li', { hasText: '30,000+' }).locator('.pg__note').textContent())).toBe(SCOPE_NOTE);
    const row = compact(await page.locator('#contracts tbody tr').first().textContent());
    expect(row).toContain('CodersTrust trained 2,400 women directly. The national program trained 25,125 women across 130 sub-districts (upazilas), meeting its target. 54,609 manuals and guidelines were distributed.');
    const faq = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) }).first();
    const answer = 'We scale in phases. Her Power, a national program, trained 25,125 women, meeting its target; CodersTrust provided the curriculum and trained 2,400 directly. A 100,000+ program is a design option we have not yet delivered.';
    expect(compact(await faq.textContent())).toContain(answer);
    expect(builtPages().find((p) => p.route === '/partner-with-us/governments/')!.html).toContain(`"text":"${answer}"`);
  });

  test('Investors: the track-record note, the 30,000+ note and the national-scale answer say trained; JobReady Platform prints the shared note', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#guide .ig__notes')).toHaveText(
      'Of 150,000+ enrollments, 112,926 were direct. The other 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both counts, so counted once the total is 150,678. Most delivery has been in Bangladesh.',
    );
    expect(await page.locator('#guide .ig__notes').getAttribute('data-fact')).toBe('SC-02 SC-03 GV-01 SC-14');
    expect(compact(await page.locator('#reach .ir__note').textContent())).toBe(CONTRACT_NOTE);
    const faq = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) }).first();
    expect(compact(await faq.textContent())).toContain('In Her Power, a national program of DoICT, the ICT Division, CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,400 women directly; the national program trained 25,125 women across 130 sub-districts (upazilas), meeting its target.');
    await open(page, 'our-model/jobready-platform/');
    expect(compact(await page.locator('#why .jr__whynote').textContent())).toBe(SCOPE_NOTE);
  });

  test('YouthWIDE: "Her Power, a national program of DoICT, the ICT Division, trained 25,125 women across 130 sub-districts (upazilas), meeting its target."', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const faq = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) }).first();
    expect(compact(await faq.textContent())).toContain('Her Power, a national program of DoICT, the ICT Division, trained 25,125 women across 130 sub-districts (upazilas), meeting its target. CodersTrust provided the curriculum, training manuals and mentorship guidelines and trained 2,400 women directly.');
  });

  test('the Her Power case study: heading "National Scale: The Wider Program"; "The national program’s reach is a separate measure: ... trained 25,125 women ..., meeting its target."', async ({ page }) => {
    await open(page, 'impact/case-studies/her-power/');
    await expect(page.getByRole('heading', { level: 3, name: 'National Scale: The Wider Program' })).toBeVisible();
    expect(titleCase('National Scale: The Wider Program')).toBe('National Scale: The Wider Program');
    const para = compact(await page.locator('.hp__scale p').textContent());
    expect(para).toBe(
      'The in-work figure above covers 800 tracked women from the 2,400 that CodersTrust trained directly. The national program’s reach is a separate measure: Her Power (DoICT, ICT Division) is a national program that trained 25,125 women across 130 sub-districts (upazilas), meeting its target. The 2,400 women CodersTrust trained directly are among them.',
    );
    expect(para.split(':').length - 1, 'one colon in the paragraph').toBe(1);
    expect(await page.locator('.hp__scale').getAttribute('data-fact')).toBe('GV-01');
    expect(compact(await page.locator('main').textContent())).toContain('372 of 800 tracked women, from the 2,400 trained directly by CodersTrust, were in work (47%)');
  });

  test('the Her Power news post: the banner note is "Delivered: the national program trained 25,125 women, its full target." with the case-study link; the headline stays "Aims to Train"', async ({ page }) => {
    await open(page, 'news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/');
    const note = page.locator('.archive-banner .archive-banner__note');
    await expect(note).toHaveText('Delivered: the national program trained 25,125 women, its full target. See the Her Power case study.');
    expect(await note.getAttribute('data-fact')).toBe('GV-01');
    expect(await note.locator('a').getAttribute('href')).toMatch(/\/impact\/case-studies\/her-power\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Her Power Contract Aims to Train 25,125 Women: Empowerment of Women Through ICT Frontier Initiative');
  });
});

test.describe('WP85: the changed regions fit', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px Home’s carousel keeps its height budget (slide 2 included) and the changed pages do not scroll sideways`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, '');
      for (const n of [1, 2, 3, 4]) {
        await showSlide(page, n);
        const gap = await unusedBelow(page);
        expect(gap, `slide ${n} at ${vp.width}px: unused space below the content`).toBeLessThanOrEqual(48);
        expect(gap, `slide ${n} at ${vp.width}px: content must not run into the controls`).toBeGreaterThanOrEqual(0);
      }
      expect(await noOverflow(page), `Home at ${vp.width}px`).toBe(true);
      for (const route of ['impact/', 'impact/case-studies/her-power/', 'partner-with-us/governments/', 'partner-with-us/investors/', 'our-model/jobready-platform/', 'programs/youthwide/', 'news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/']) {
        await open(page, route);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    });
  }
});
