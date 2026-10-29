import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact, sources } from '../src/data/facts';
import { ORIGIN_SHORT, SOURCE_NOTE, originShortUnder, statLabelUnder, withSourceNote, withoutSince2014 } from '../src/data/copy';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP64 behaviors (cycle-36 whole-site reviews, Perplexity models; the accepted triage items 1 to 7; item 3 was skipped because Home has no Digital Jobs Albania card). Retrospective coverage (the owner exempted this project from
 * test-first work); each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp64.spec.ts --project=chromium`):
 *   - 1: Home slide 2 is "Six Government Contracts and a National University Partnership" (the body still names the National University);
 *   - 2: Home slide 4 leads "Results from the records of four programs.", above its four program lines;
 *   - 3 (skipped): Home's Proof in Practice has the WSDFM, Kosovo and Her Power cards and no Digital Jobs Albania card; Albania's only appearance on Home is a strip tile that describes the initiative and states no outcome;
 *   - 4: the Cost of Waiting card reads "A 2017 World Bank review of nine randomized vocational-training trials found only three with significant employment impacts." (RC-06, source MCKENZIE17 kept);
 *   - 5: the 9,000+ labs tile (YouthWIDE, Local Partners) names the publisher of the count, "government digital labs (Department of ICT count) that could host blended learning" (its source states no year; rework RW1: the note sits after the labs, not at the end, so it covers the count only),
 *     beside the register's "In Bangladesh; ..." detail, and SuperKids' DoICT target says the labs are in Bangladesh;
 *   - 6: "since 2014" is said once where a heading or a neighbouring tile already says it: the Programs hub, About, Investors and JobReady Platform;
 *   - 7: Home slide 1 says "about $27 more a month"; Impact's Learner Stories row says "some stories are outliers, and their cards say so"; TalentLEAP and Investors say "The first published TalentLEAP level is Competent; Proficient and Expert levels are planned.";
 *   - RW2 (rework, coordinator): where a band's heading already says "Since 2014" (Development Partners, Governments, Foundations, Universities, Employers, YouthWIDE, Investors), its tile label ("learners trained") and its origin line ("From a Copenhagen launch to work in 16 countries and territories.")
 *     do not say it again; a band whose heading does not carry the year (Careers) keeps it, and founding-fact lines (Home's "CodersTrust launched in 2014 in Copenhagen ...") stay.
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
const PROGRAMS = 'programs/';
const ABOUT = 'about/';
const INVESTORS = 'partner-with-us/investors/';
const JOBREADY_PLATFORM = 'our-model/jobready-platform/';
const YOUTHWIDE = 'programs/youthwide/';
const LOCAL_PARTNERS = 'partner-with-us/local-partners/';
const SUPERKIDS = 'programs/superkids/';
const IMPACT = 'impact/';
const TALENTLEAP = 'our-model/talentleap/';
const DEV_PARTNERS = 'partner-with-us/development-partners/';
const GOVERNMENTS = 'partner-with-us/governments/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const UNIVERSITIES = 'partner-with-us/universities/';
const EMPLOYERS = 'partner-with-us/employers/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 1 (GLM, GPT-6.1 Sol, Grok, Kimi): Home slide 2 is "Six Government Contracts and a National University Partnership"', () => {
  const HEADING = 'Six Government Contracts and a National University Partnership';
  const OLD = 'Six Government Contracts and Bangladesh’s National University';

  test('the heading (Title Case, "Six" read from GV-12), its slide label and its data-fact; the body still names the National University and is unchanged', async ({ page }) => {
    expect(HEADING).toBe(titleCase(HEADING));
    expect(fact('GV-12').text.startsWith('Six government contracts')).toBe(true);
    await open(page, HOME);
    const gov = slide(page, 2);
    await expect(gov.locator('h3')).toHaveText(HEADING);
    expect(await gov.locator('h3').getAttribute('data-fact')).toBe('GV-12');
    await expect(gov).toHaveAttribute('aria-label', `2 of 4: ${HEADING}`);
    await expect(gov.locator('.hs__eyebrow')).toHaveText('Government and University Partners');
    await expect(gov.locator('.hs__lead')).toHaveText(
      'Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly. As the official training partner of Bangladesh’s National University for digital career skills and credentials, CodersTrust is onboarding 1.5M+ of the university’s own learners, who are not learners trained by CodersTrust.',
    );
    expect(await texts(page, '#results [data-hs-slide] h3')).toEqual([
      'Women Offered a Place Earned an Estimated 41% More per Month',
      HEADING,
      'Surveyed Completers Report Higher Income',
      'Results by Program',
    ]);
  });

  test('the earlier heading is on no built page, in its text or in a slide label', () => {
    expect(sitePages().filter((p) => p.html.includes(OLD)).map((p) => p.route)).toEqual([]);
  });

  test('the slide’s dot reaches it, and it keeps the carousel’s 48 px budget at 1280 and 390 with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      await showSlide(page, 2);
      await expect(page.locator('#results [data-hs-slide].is-active h3')).toHaveText(HEADING);
      expect(await unusedBelow(page), `slide 2 at ${vp.width}px`).toBeLessThanOrEqual(48);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 2 (Claude): Home slide 4 leads "Results from the records of four programs."', () => {
  test('the lead sits above four program lines (Kosovo, WSDFM, UNDP YES, Her Power); "Four delivered programs" is on no built page', async ({ page }) => {
    await open(page, HOME);
    const s4 = slide(page, 4);
    await expect(s4.locator('.hs__eyebrow')).toHaveText('Program Records');
    await expect(s4.locator('h3')).toHaveText('Results by Program');
    await expect(s4.locator('.hs__lead')).toHaveText('Results from the records of four programs.');
    const lines = await s4.locator('.hs__lines li').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
    expect(lines).toHaveLength(4);
    // WP71: the Kosovo and Korail lines carry their years in brackets ("Women in Online Work, Kosovo (2016–2017): ...", "UNDP YES, Korail (2017): ...").
    expect(lines.map((l) => l.split(':')[0])).toEqual(['Women in Online Work, Kosovo (2016–2017)', 'WSDFM', 'UNDP YES, Korail (2017)', 'Her Power']);
    expect(pagesWith('Four delivered programs')).toEqual([]);
  });

  test('Impact still counts five programs (Albania among them, without an outcome figure), which is why the slide counts the four that report records', async ({ page }) => {
    await open(page, IMPACT);
    await expect(page.locator('#cases').getByRole('heading', { level: 2, name: 'Five Programs Across Kosovo, Albania and Bangladesh' })).toHaveCount(1);
  });

  test('the slide keeps the carousel’s 48 px budget at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      await showSlide(page, 4);
      expect(await unusedBelow(page), `slide 4 at ${vp.width}px`).toBeLessThanOrEqual(48);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 3 (GPT-6.1 Sol), skipped: Home has no Digital Jobs Albania card to relabel', () => {
  test('Proof in Practice has the WSDFM, Kosovo and Her Power cards; Albania appears on Home only as a strip tile that describes the initiative (TL-05) and states no outcome', async ({ page }) => {
    await open(page, HOME);
    expect(await texts(page, '#cases article.case h3')).toEqual(['Women’s Skill Development for Freelancing Marketplace (WSDFM)', 'Women in Online Work, Kosovo', 'Her Power']);
    expect(compact(await page.locator('#cases').textContent())).not.toContain('Albania');
    const tile = page.locator('#world [data-tile="albania"]');
    await expect(tile).toHaveCount(1);
    expect(await tile.getAttribute('data-fact')).toBe('TL-05');
    expect(compact(await tile.locator('figcaption').textContent())).toBe('Albania, 2021–2022. A World Bank initiative, delivered online.');
    expect(fact('TL-05').stat?.label).toBe('A World Bank initiative, delivered online');
    expect(compact(await tile.locator('.wst__mark').textContent())).toBe('Digital Jobs Albania');
    expect(compact(await tile.textContent())).not.toMatch(/%|enrolled|students|in work/i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 4 (Gemini, GPT-6.1 Sol, Kimi): the Cost of Waiting card names the World Bank and the year, not the economist', () => {
  const TEXT = 'A 2017 World Bank review of nine randomized vocational-training trials found only three with significant employment impacts';

  test('RC-06 reads it, its source id is kept, and the register’s citation still names McKenzie (2017)', () => {
    expect(fact('RC-06').text).toBe(TEXT);
    expect(fact('RC-06').sourceIds).toEqual(['MCKENZIE17']);
    expect(sources.MCKENZIE17.citation).toContain('McKenzie, D. (2017)');
  });

  test('Home’s second Cost of Waiting card prints the sentence with a full stop and its data-fact, under the same heading', async ({ page }) => {
    await open(page, HOME);
    expect(await texts(page, '#cost .card__title')).toEqual(['AI Is Changing Freelance Demand', 'Training Does Not Always Lead to Employment']);
    const data = page.locator('#cost .cost__data');
    expect(compact(await data.nth(1).textContent())).toBe(`${TEXT}.`);
    expect(await data.nth(1).getAttribute('data-fact')).toBe('RC-06');
  });

  test('"by World Bank economist David McKenzie (2017) found only three" is on no built page (RC-06a keeps its own comparison sentence)', () => {
    expect(pagesWith('A review of nine randomized trials of vocational training by World Bank economist David McKenzie')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 5 (Kimi) and RW1: the 9,000+ labs name the publisher of the count and say they are in Bangladesh', () => {
  const QUALIFIER = 'In Bangladesh; lab access and seats are confirmed per program.';
  const LABEL = 'government digital labs that could host blended learning';
  // RW1 (coordinator): the note covers the count (it goes right after the labs), not "that could host blended learning", which is CodersTrust's own judgment
  const SHOWN = 'government digital labs (Department of ICT count) that could host blended learning';

  test('SOURCE_NOTE reads GV-09’s note from its registered source (DOICTLAB), publisher alone because the source states no year; the register’s wording is unchanged', () => {
    expect(SOURCE_NOTE['GV-09']).toBe('(Department of ICT count)');
    expect(fact('GV-09').sourceIds).toEqual(['DOICTLAB']);
    expect(sources.DOICTLAB.citation).toContain('Department of ICT (DoICT)');
    expect(sources.DOICTLAB.citation).not.toMatch(/\b(?:19|20)\d{2}\b/);
    expect(fact('GV-09').text).toBe('9,000+ government digital labs in Bangladesh that could host blended learning');
    expect(fact('GV-09').stat?.label).toBe(LABEL);
    expect(fact('GV-09').stat?.detail).toBe(QUALIFIER);
  });

  test('RW1: the note goes directly after "government digital labs", so it covers the count and not "that could host blended learning"; a text without that phrase stops the build; the other notes still close their text', () => {
    expect(withSourceNote('GV-09', LABEL)).toBe(SHOWN);
    expect(withSourceNote('GV-09', LABEL).endsWith('(Department of ICT count)')).toBe(false);
    expect(withSourceNote('GV-09', fact('GV-09').text)).toBe('9,000+ government digital labs (Department of ICT count) in Bangladesh that could host blended learning');
    expect(() => withSourceNote('GV-09', 'labs that could host blended learning')).toThrow(/no longer contains/);
    expect(withSourceNote('PX-05', 'AI skills are the hardest to find')).toBe(`AI skills are the hardest to find ${SOURCE_NOTE['PX-05']}`);
    expect(withSourceNote('SC-01', 'learners trained since 2014')).toBe('learners trained since 2014');
  });

  test('YouthWIDE’s Bangladesh band and Local Partners’ track record print the label with the note after the labs and, under it, the register’s detail line; no year is made up', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const yw = page.locator('#governments .mech-stat', { has: page.locator('[data-fact="GV-09"]') });
    await expect(yw).toHaveCount(1);
    expect(compact(await yw.locator('.stat__label').textContent())).toBe(SHOWN);
    expect(compact(await yw.locator('.stat__note').textContent())).toBe(QUALIFIER);
    await open(page, LOCAL_PARTNERS);
    const lp = page.locator('#guide .factstat[data-fact="GV-09"]');
    await expect(lp).toHaveCount(1);
    expect(compact(await lp.locator('.stat__label').textContent())).toBe(SHOWN);
    expect(compact(await lp.locator('.stat__note').textContent())).toBe(QUALIFIER);
    expect(compact(await lp.locator('.stat__label').textContent())).not.toMatch(/\b(?:19|20)\d{2}\b/);
  });

  test('wherever a built page shows the labs figure it says Bangladesh within the same tile or sentence (YouthWIDE, Local Partners and SuperKids; nothing else shows it)', () => {
    const shown: string[] = [];
    const problems: string[] = [];
    for (const p of sitePages()) {
      const text = visible(p.html);
      const re = /9,000\+/g;
      let m: RegExpExecArray | null;
      let hits = 0;
      while ((m = re.exec(text))) {
        hits += 1;
        if (!/Bangladesh/.test(text.slice(m.index, m.index + 170))) problems.push(`${p.route}: "${text.slice(m.index, m.index + 90)}..." does not say Bangladesh`);
      }
      if (hits) shown.push(p.route);
    }
    expect(shown.sort()).toEqual(['/partner-with-us/local-partners/', '/programs/superkids/', '/programs/youthwide/']);
    expect(problems).toEqual([]);
  });

  test('the tile’s whole text stays inside its box at 1280 and 390, with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const [route, selector] of [[YOUTHWIDE, '#governments .mech-stat:has([data-fact="GV-09"])'], [LOCAL_PARTNERS, '#guide .factstat[data-fact="GV-09"] .stat']] as const) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
        const clipped = await page.locator(selector).first().evaluate((el) => {
          const box = el.getBoundingClientRect();
          return Array.from(el.querySelectorAll('.stat__label, .stat__note')).some((c) => c.getBoundingClientRect().right > box.right + 1 || c.getBoundingClientRect().left < box.left - 1);
        });
        expect(clipped, `${route} at ${vp.width}px`).toBe(false);
      }
    }
  });

  test('SuperKids’ DoICT target says the labs are in Bangladesh; the NCTB target and the agreement-target sentence are unchanged', async ({ page }) => {
    await open(page, SUPERKIDS);
    expect(await texts(page, '.agree__fact p')).toEqual([
      'DoICT agreement target: 20M+ students through 9,000+ digital labs in Bangladesh.',
      'NCTB agreement target: 20M+ students.',
      'These are agreement targets, not delivered reach.',
    ]);
    expect(await page.locator('.agree__fact').getAttribute('data-fact')).toBe('GV-08');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 6 (Grok): "since 2014" is said once where a heading or a neighbouring tile already says it', () => {
  test('the register is unchanged, and withoutSince2014 drops the phrase from a register label (and stops the build on a label that no longer carries it)', () => {
    expect(fact('SC-01').stat?.label).toBe('learners trained since 2014');
    expect(fact('SC-02').stat?.label).toBe('enrollments since 2014');
    expect(fact('SC-01').text).toBe('130,000+ learners trained since 2014');
    expect(withoutSince2014('learners trained since 2014')).toBe('learners trained');
    expect(withoutSince2014('enrollments since 2014')).toBe('enrollments');
    expect(() => withoutSince2014('countries and territories where CodersTrust has worked')).toThrow(/no longer ends/);
  });

  test('Programs: under "Reach Since 2014" the learners tile reads "130,000+ learners trained"', async ({ page }) => {
    await open(page, PROGRAMS);
    await expect(page.locator('#reach h2')).toHaveText('Reach Since 2014');
    const tile = page.locator('#reach .factstat[data-fact="SC-01"]');
    await expect(tile.locator('.stat__value')).toHaveText('130,000+');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe('learners trained');
    expect(compact(await page.locator('#reach').textContent()).match(/since 2014/gi)).toHaveLength(1);
  });

  // WP65 (cycle-37 review, Sonnet, Grok): the enrollments tile's detail line ("Including 111,268 direct enrollments and 40,043 through courseware.") is gone from About (tests/wp65.spec.ts)
  test('About: of the two side-by-side tiles only the learners tile says "since 2014"; the enrollments tile reads "enrollments" and has no detail line', async ({ page }) => {
    await open(page, ABOUT);
    const labels = await texts(page, '#glance .about-stats .stat__label');
    expect(labels.slice(0, 2)).toEqual(['learners trained since 2014', 'enrollments']);
    expect(await texts(page, '#glance .about-stats .stat__value')).toContain('150,000+');
    await expect(page.locator('#glance .about-stats__tile[data-fact="SC-02"] .stat__note')).toHaveCount(0);
    // WP66 (owner request 2026-10-20): the fourth tile, the signed-agreements count (SC-11), says "since 2014" too (a count of signed agreements has to say since when): it is not beside the learners tile, and neither of its neighbors says it,
    // so the phrase is on those two tiles only (tests/wp66.spec.ts)
    expect(labels.map((l) => /since 2014/.test(l))).toEqual([true, false, false, true, false]);
    expect(compact(await page.locator('#glance').textContent()).match(/since 2014/gi)).toHaveLength(2);
  });

  test('Investors: under the group heading "Since 2014" the learners and enrollments tiles read "learners trained" and "enrollments"; the tiles’ values, tags and notes are unchanged', async ({ page }) => {
    await open(page, INVESTORS);
    await expect(page.locator('#guide .ig__delivered h3')).toHaveText('Scale and Partners');
    expect(await texts(page, '#guide .ig__tile .stat__value')).toEqual(['130,000+', '150,000+', '16']);
    expect(await texts(page, '#guide .ig__tile .stat__label')).toEqual(['learners trained', 'enrollments', 'countries and territories where CodersTrust has worked']);
    expect(await texts(page, '#guide .ig__tile .status-tag')).toEqual(['Delivered', 'Delivered']);
    await expect(page.locator('#guide .ig__notes')).toHaveText('Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: 25,125 in Her Power’s national program, which used CodersTrust’s curriculum, and 15,027 enrollments in six CodersTrust-designed courses on UNDP’s FutureNation platform. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments. Most delivery has been in Bangladesh.');
    expect(await page.locator('#guide .ig__tile').evaluateAll((els) => els.map((e) => /since 2014/.test(e.textContent ?? '')))).toEqual([false, false, false]);
  });

  test('JobReady Platform (the same repeat): under "Delivered Since 2014" the learners tile reads "130,000+ learners trained"', async ({ page }) => {
    await open(page, JOBREADY_PLATFORM);
    const group = page.locator('#why .jr__whystat').first();
    await expect(group.locator('h3')).toHaveText('Delivered Since 2014');
    expect(compact(await group.locator('.stat__label').textContent())).toBe('learners trained');
    await expect(group.locator('.stat__value')).toHaveText('130,000+');
  });

  test('a tile with no heading or neighbour that gives the period keeps "since 2014": the Impact glance and Careers still read "learners trained since 2014"', async ({ page }) => {
    await open(page, IMPACT);
    expect(compact(await page.locator('#glance a[data-fact~="SC-16"]').textContent())).toContain('learners trained since 2014');
    await open(page, 'careers/');
    const careers = page.locator('main .factstat[data-fact="SC-01"]');
    await expect(careers).toHaveCount(1);
    expect(compact(await careers.locator('.stat__label').textContent())).toBe('learners trained since 2014');
  });

  test('the five changed pages keep their tiles inside the page at 390, with no sideways scroll', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    for (const route of [PROGRAMS, ABOUT, INVESTORS, JOBREADY_PLATFORM]) {
      await open(page, route);
      await scrollThrough(page);
      expect(await noOverflow(page), route).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 7 (GLM, Gemini, Claude): three polish fixes', () => {
  test('Home slide 1’s lead says "about $27 more a month" (RC-04’s figure); the register’s RC-04 and the trial page keep "+$27"', async ({ page }) => {
    expect(fact('RC-04').stat?.numeric).toBe(27);
    expect(fact('RC-04').stat?.value).toBe('+$27');
    expect(fact('RC-04').text.startsWith('About +$27 a month')).toBe(true);
    await open(page, HOME);
    const lead = slide(page, 1).locator('.hs__lead');
    await expect(lead).toHaveText('In CodersTrust’s WSDFM program, women offered a place had an estimated 41% higher monthly income than the control group, about $27 more a month.');
    expect(await lead.getAttribute('data-fact')).toBe('RC-01 RC-04');
    expect(compact(await page.locator('#results').textContent())).not.toContain('about +$27 a month');
    await open(page, 'impact/independent-evaluation/');
    expect(compact(await page.locator('li[data-fact="RC-04"]').first().textContent())).toMatch(/^About \+\$27 a month/);
  });

  test('Impact’s Learner Stories row ends "...; some stories are outliers, and their cards say so." in the matrix, and the story cards do say so', async ({ page }) => {
    await open(page, IMPACT);
    const row = page.locator('section[aria-label="Evidence ladder matrix"] tbody tr').nth(3);
    await expect(row.locator('th a')).toHaveText('Learner Stories');
    expect(compact(await row.locator('td[data-label="What It Shows"]').textContent())).toBe('What the path can look like for one person.');
    expect(compact(await row.locator('td[data-label="What It Does Not Show"]').textContent())).toBe('A typical or promised outcome; some stories are outliers, and their cards say so.');
    expect(pagesWith('some are outliers and say so')).toEqual([]);
    await open(page, 'impact/stories/');
    expect(compact(await page.locator('main').textContent())).toContain('Individual story; an outlier, not typical');
  });

  test('TalentLEAP’s opening and Investors’ "Learn Through TalentLEAP" card say "The first published TalentLEAP level is Competent; Proficient and Expert levels are planned."; the old sentence is on no built page', async ({ page }) => {
    const SENTENCE = 'The first published TalentLEAP level is Competent; Proficient and Expert levels are planned.';
    await open(page, TALENTLEAP);
    expect(compact(await page.locator('.lf-head .lead').textContent())).toBe(
      `TalentLEAP organizes learning around assessed skill units and career paths. ${SENTENCE} Learners move through three stages, Learn, Earn and Prosper, with three months of milestone-based mentoring after the course.`,
    );
    await open(page, INVESTORS);
    await expect(page.locator('#features li.card').first().locator('h3')).toHaveText('Learn Through TalentLEAP');
    expect(await texts(page, '#features li.card:nth-child(1) p')).toEqual([`${SENTENCE} Supported cohorts include mentoring, certification exam preparation and placement support, as agreed in the program scope.`]);
    expect(pagesWith('Competent is the published first level; Proficient and Expert are planned')).toEqual([]);
    expect(fact('IN-08').text).toContain('Competent is the first level; Proficient and Expert are planned');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('RW2 (coordinator): "Since 2014" is said once in the bands whose heading says it', () => {
  const HEADING = 'We’ve Built This Path Since 2014';
  const LINE = 'From a Copenhagen launch to work in 16 countries and territories.';
  const BANDS = [DEV_PARTNERS, GOVERNMENTS, FOUNDATIONS, UNIVERSITIES, EMPLOYERS];

  test('the helpers read the heading: a "since 2014" label and the origin line lose the year only under a heading that states it; the register’s ORIGIN_SHORT and labels are unchanged', () => {
    expect(ORIGIN_SHORT.text).toBe('Since 2014, from a Copenhagen launch to work in 16 countries and territories.');
    expect(originShortUnder(HEADING)).toEqual({ ...ORIGIN_SHORT, text: LINE });
    expect(originShortUnder(HEADING).facts).toEqual(['ID-02', 'SC-03']);
    expect(originShortUnder('A Record Built Since 2014').text).toBe(LINE);
    expect(originShortUnder('Why Join CodersTrust')).toBe(ORIGIN_SHORT);
    expect(statLabelUnder(HEADING, fact('SC-01').stat?.label)).toBe('learners trained');
    expect(statLabelUnder(HEADING, fact('SC-02').stat?.label)).toBe('enrollments');
    expect(statLabelUnder('Why Join CodersTrust', fact('SC-01').stat?.label)).toBeUndefined();
    expect(statLabelUnder(HEADING, fact('SC-03').stat?.label)).toBeUndefined();
    expect(statLabelUnder(HEADING, undefined)).toBeUndefined();
    expect(fact('SC-01').stat?.label).toBe('learners trained since 2014');
  });

  for (const route of BANDS) {
    test(`${route}: the band is headed "${HEADING}", its origin line is "${LINE}" (still tied to ID-02 and SC-03), and "since 2014" is in the heading alone`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('#guide h2')).toHaveText(HEADING);
      const line = page.locator('#guide p[data-fact="ID-02 SC-03"]');
      await expect(line).toHaveCount(1);
      expect(compact(await line.textContent())).toBe(LINE);
      expect(compact(await page.locator('#guide').textContent()).match(/since 2014/gi)).toHaveLength(1);
    });
  }

  test('Development Partners: the band’s tiles are "130,000+ learners trained" and the 16 countries and territories', async ({ page }) => {
    await open(page, DEV_PARTNERS);
    expect(await texts(page, '#guide .pg__stats .stat__value')).toEqual(['130,000+', '16']);
    expect(await texts(page, '#guide .pg__stats .stat__label')).toEqual(['learners trained', 'countries and territories where CodersTrust has worked']);
    expect(await page.locator('#guide .pg__stats .factstat').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['SC-01', 'SC-03']);
  });

  test('YouthWIDE: under "We’ve Built This Path Since 2014" (WP67, cycle-38 review: it said "We Have Built This ...") the learners tile is "learners trained"', async ({ page }) => {
    await open(page, YOUTHWIDE);
    await expect(page.locator('#guide h2')).toHaveText(HEADING);
    expect(await texts(page, '#guide .guide__stats .stat__label')).toEqual(['learners trained', 'countries and territories where CodersTrust has worked']);
    expect(compact(await page.locator('#guide').textContent()).match(/since 2014/gi)).toHaveLength(1);
  });

  test('Investors: the band’s heading says the year, so neither its origin line nor its tiles do', async ({ page }) => {
    await open(page, INVESTORS);
    await expect(page.locator('#guide h2')).toHaveText('A Record Built Since 2014');
    const line = page.locator('#guide p[data-fact="ID-02 SC-03"]');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(LINE);
    expect(await texts(page, '#guide .ig__tile .stat__label')).toEqual(['learners trained', 'enrollments', 'countries and territories where CodersTrust has worked']);
  });

  test('a band whose heading does not carry the year keeps it in its tile (Careers), and founding-fact lines stay (Home: "CodersTrust launched in 2014 in Copenhagen ...")', async ({ page }) => {
    await open(page, 'careers/');
    await expect(page.locator('#why h2')).toHaveText('Why Join CodersTrust');
    expect(compact(await page.locator('#why .factstat[data-fact="SC-01"] .stat__label').textContent())).toBe('learners trained since 2014');
    await open(page, HOME);
    expect(compact(await page.locator('#guide').textContent())).toContain('CodersTrust launched in 2014 in Copenhagen and began training freelancers in Bangladesh.');
  });

  test('no built page prints the old origin line, "Since 2014, from a Copenhagen launch ...", because every page that prints it is headed with the year', () => {
    expect(pagesWith('Since 2014, from a Copenhagen launch')).toEqual([]);
    expect(pagesWith(LINE).sort()).toEqual(['/partner-with-us/development-partners/', '/partner-with-us/employers/', '/partner-with-us/foundations/', '/partner-with-us/governments/', '/partner-with-us/investors/', '/partner-with-us/universities/']);
  });

  test('the changed bands fit at 1280 and 390, with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const route of [...BANDS, YOUTHWIDE, INVESTORS]) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    }
  });
});
