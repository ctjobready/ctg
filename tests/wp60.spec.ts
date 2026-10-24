import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { locations } from '../src/data/countries';
import { AIM_DEPENDENCY, CONTRACT_FIGURES, NU_NOT_TRAINED, POSITIONING, SOURCE_NOTE, TRIAL_WOMEN } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP60 behaviors (cycle-32 whole-site reviews: Grok R1, R2, R4, R5 and R6; Claude S3, S4 (owner answer 2026-10-20) and S6; GPT-6.1 Sol G1, G2, G3 and G5). Retrospective coverage (the owner exempted this project from test-first work);
 * each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp60.spec.ts --project=chromium`):
 *   - R1: Global Reach's note says "Rows that are a partnership, an announced cooperation or the launch say so in their note; the other rows are training programs." and the table's rows bear it out (Bangladesh's and Somaliland's notes describe training);
 *   - R2: Maria Dewan "first came across Her Power, where CodersTrust was a training partner" on Success Stories and Universities (WP61, GPT-6.1 Sol G6: the Her Power case study’s card says "joined Her Power" in two plain sentences); no page says CodersTrust implemented the project;
 *   - R4: the JobReady Platform "In the Pipeline" tile reads "... in the onboarding pipeline, not learners trained by CodersTrust" (SC-04's own label plus the clause Home's slide 2 uses); the register's label and the other pages that show it are unchanged;
 *   - R5: YouthWIDE's country answer ends "CodersTrust has worked in 16 countries and territories; most delivery has been in Bangladesh.";
 *   - R6: Independent Evaluation's classes band is "Freelancing Share by Classes Attended" and says "In this study, freelancing was higher among women who attended more classes.";
 *   - S3: the 2 million 2030 aim carries "depending on government and donor commitments" on Programs, Impact, About and YouthWIDE, from one constant;
 *   - S4: wherever WSDFM's program records show beside the trial, the trial's 833 women (RC-07) are named: Home slide 4 (one row at 1280), the audience-page cards, Impact's tile and the WSDFM case study's note;
 *   - S6: the Governments delivery card is "Trainers and Curriculum"; "Capacity Designed to Stay in Your System" stays the benefit card;
 *   - G1: Home slide 2 says the same facts in four plain sentences, within the carousel's height budget;
 *   - G2: YouthWIDE's national-scale answer says "Larger programs are designed to run in phases, up to 10 cohorts in parallel, with certified local facilitators.";
 *   - G3: Employers' first pain card says "AI skills are the hardest to find (ManpowerGroup, 2026).", from PX-05's source note;
 *   - G5: Local Partners' first "What Your Community Gets" card no longer repeats the funding-end answer;
 *   - K1: the Case Studies hub hero is the Kosovo training room (a case-study program's photograph), not the Bhutan inauguration, with Kosovo in its alt text;
 *   - K2: the hub H1 was "Five Programs, from Kosovo to Bangladesh" (WP63, cycle-35 review, Kimi K5: "Five Programs Across Kosovo, Albania and Bangladesh"; grid H2 "Results First, Program by Program"), and the Albania card's figure is labelled "Reported Enrollment";
 *   - K3: Her Power's 18.6% names its base, "18.6% of those 800 were in work during the course" (PR-05, owner answer 2026-10-20);
 *   - L4: Home's "How Do You Prove Outcomes?" opens "A scorecard is agreed for every cohort before delivery.";
 *   - L7: the JobReady Platform rollout table's first row (the course storefront) is "Live", not "Operating";
 *   - GM1: the Programs hub's evidence band is "Evidence from Youth-Employment Programs", with the scope line "These results are from youth-employment programs, not evidence for every program listed above.";
 *   - GM4: Foundations' "What Happens Next" opens "For platform grants, the first conversation covers JobReady's infrastructure and staged rollout. For cohort grants, the steps are below.";
 *   - GM5: Governments' "Capacity Designed to Stay in Your System" opens "Where included in your program scope:";
 *   - GM6: Development Partners' first challenge card is "Connect training to a first job, freelance client or business.";
 *   - GM7: Home's "Our Approach" is one sentence that keeps the audience, declared whole for Home in scripts/check-facts.mjs;
 *   - GM8 and GM9: the Governments and Foundations learner cards show the outcome line once (no narrative sentence repeating it).
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
const GLOBAL_REACH = 'impact/global-reach/';
const YOUTHWIDE = 'programs/youthwide/';
const GOVERNMENTS = 'partner-with-us/governments/';
const LOCAL = 'partner-with-us/local-partners/';
const EMPLOYERS = 'partner-with-us/employers/';
const EVALUATION = 'impact/independent-evaluation/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R1 (Grok): Global Reach says which rows are partnerships, an announced cooperation or the launch, and the table bears it out', () => {
  test('the note says it in the new words, and the old sentence is gone', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const note = compact(await page.locator('#map .callout p[data-fact="SC-03"]').textContent());
    expect(note).toContain('Rows that are a partnership, an announced cooperation or the launch say so in their note; the other rows are training programs.');
    expect(note).toContain('New York is the headquarters, not one of the 16 locations.');
    expect(note).not.toContain('distinguishes training, partnerships and launch activity');
    expect(sitePages().filter((p) => visible(p.html).includes('distinguishes training, partnerships and launch activity')).map((p) => p.route)).toEqual([]);
  });

  test('every row is one of three kinds the note names or a training program: seven rows name a partner, a cooperation or the launch (Albania and Kosovo are training programs with a World Bank program label); Bangladesh’s and Somaliland’s notes describe training; the rest have no note', async ({ page }) => {
    await open(page, GLOBAL_REACH);
    const rows = page.locator('.wmap__table tbody tr');
    await expect(rows).toHaveCount(locations.length);
    const found: { name: string; note: string }[] = [];
    for (let i = 0; i < locations.length; i++) {
      const row = rows.nth(i);
      const name = compact(await row.locator('th[scope="row"]').evaluate((el) => el.firstChild?.textContent ?? ''));
      found.push({ name, note: compact(await row.locator('td[data-label="Partner / Note"]').textContent()) });
    }
    const kind = (note: string) => (/^Partners?:/.test(note) ? 'partnership' : /^Cooperation with .* announced/.test(note) ? 'cooperation' : /^Launch location/.test(note) ? 'launch' : 'training');
    const byKind = (k: string) => found.filter((r) => kind(r.note) === k).map((r) => r.name).sort();
    expect(byKind('partnership')).toEqual(['Benin', 'Egypt', 'Uganda']);
    expect(byKind('cooperation')).toEqual(['Iraq']);
    expect(byKind('launch')).toEqual(['Denmark']);
    // the other nine are "training programs": no note (a dash), or a note that says it is training or a program
    const training = found.filter((r) => kind(r.note) === 'training');
    expect(training.map((r) => r.name).sort()).toEqual(['Albania', 'Bangladesh', 'Bhutan', 'Honduras', 'India', 'Jordan', 'Kenya', 'Kosovo', 'Malaysia', 'Poland', 'Somaliland']);
    for (const r of training) {
      if (r.note === '—' || r.note === '') continue;
      expect(r.note, `${r.name}'s note describes training or a program`).toMatch(/training|program/i);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R2 (Grok): Maria Dewan first came across Her Power, where CodersTrust was a training partner', () => {
  const SENTENCE = 'Maria Dewan was a third-year Biology student when she first came across Her Power, where CodersTrust was a training partner.';

  test('the Universities page and Success Stories say it, the Her Power case study joins her to Her Power without giving CodersTrust the project; no page says CodersTrust implemented the project', async ({ page }) => {
    // WP61 (cycle-33 review, GPT-6.1 Sol G6): the case study’s card replaced the story’s second and third paragraphs with two plain sentences (tests/wp61.spec.ts); the case study’s own context says CodersTrust’s role
    await open(page, 'impact/case-studies/her-power/');
    const herPower = compact(await page.locator('main').textContent());
    expect(herPower).toContain('Maria Dewan joined Her Power as a third-year Biology student.');
    expect(herPower).toContain('Within the national program, CodersTrust provided the curriculum, training manuals, mentorship guidelines and trainer training, and trained 2,400 women directly.');
    await open(page, 'partner-with-us/universities/');
    expect(compact(await page.locator('main').textContent())).toContain(SENTENCE);
    await open(page, 'impact/stories/');
    expect(compact(await page.locator('#steps').innerText())).toContain('A third-year Biology student when she first came across Her Power, where CodersTrust was a training partner.');
    expect(sitePages().filter((p) => /Her Power project implemented by CodersTrust/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R4 (Grok): the JobReady Platform pipeline tile says the 1.5M+ are not learners trained by CodersTrust', () => {
  const BASE = 'National University learners in the onboarding pipeline';

  test('the tile reads SC-04’s label plus the clause Home’s slide 2 uses; the register’s label is unchanged', async ({ page }) => {
    expect(NU_NOT_TRAINED).toBe('not learners trained by CodersTrust');
    expect(fact('SC-04').stat?.label).toBe(BASE);
    await open(page, 'our-model/jobready-platform/');
    const tile = page.locator('#why .jr__whystat', { has: page.getByRole('heading', { level: 3, name: 'In the Pipeline' }) });
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.stat__label')).toHaveText(`${BASE}, ${NU_NOT_TRAINED}`);
    await expect(tile).toContainText('1.5M+');
    await expect(tile.locator('.factstat')).toHaveAttribute('data-fact', 'SC-04');
    await open(page, HOME);
    // WP61 (cycle-33 review, GPT-6.1 Sol G1): the clause closes the National University sentence ("..., the university’s own learners, not learners trained by CodersTrust."); it was a sentence of its own ("They are National University’s own learners, ...")
    expect(compact(await slide(page, 2).locator('.hs__lead').textContent()).endsWith(`the university’s own learners, ${NU_NOT_TRAINED}.`)).toBe(true);
  });

  test('the pages that show SC-04’s figure with the register’s label keep it, and their own separation (a band lead, or "not counted in the delivered reach")', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    const campus = compact(await page.locator('main').textContent());
    expect(campus).toContain(BASE);
    expect(campus).not.toContain(`${BASE}, ${NU_NOT_TRAINED}`);
    expect(campus).toContain('they are not learners trained by CodersTrust');
    await open(page, 'partner-with-us/investors/');
    expect(compact(await page.locator('main').textContent())).toContain('Separately, and not counted in the delivered reach: 1.5M+ National University learners being onboarded (the university’s own learners, not learners trained by CodersTrust)');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WP63 (cycle-35 review, GPT-6.1 Sol G2): YouthWIDE prints the bank's two-sentence answer (tests/wp62.spec.ts, Item 6), so the 16-countries sentence WP60 added to it is gone; "has worked since 2014 in" is still on no built page
test.describe('R5 (Grok): YouthWIDE’s country answer does not read as all 16 since 2014', () => {
  const SENTENCE = 'CodersTrust has worked in 16 countries and territories; most delivery has been in Bangladesh.';

  test('the answer no longer carries the 16-countries sentence, in the page and in its structured data; "has worked since 2014 in" is on no built page', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const item = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Will This Work in Our Country?' }) }).first();
    const answer = compact(await item.locator('.faq__a').textContent());
    expect(answer).toBe('We test local employer demand first and choose each country’s tracks with local partners. Our outcome evidence comes mainly from Bangladesh, with program results from Kosovo and delivery experience in Albania.');
    expect(answer).not.toContain(SENTENCE);
    expect((await faqJsonLd(page)).find((q) => q.name === 'Will This Work in Our Country?')?.text).not.toContain(SENTENCE);
    expect(sitePages().filter((p) => visible(p.html).includes('has worked since 2014 in')).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('R6 (Grok): Independent Evaluation does not read the classes result as a dose effect', () => {
  test('the band is "Freelancing Share by Classes Attended" (heading and contents link, anchor unchanged) and says it as this study’s finding', async ({ page }) => {
    await open(page, EVALUATION);
    await expect(page.locator('#classes h2')).toHaveText('Freelancing Share by Classes Attended');
    await expect(page.locator('a[href="#classes"]').first()).toHaveText('Freelancing Share by Classes Attended');
    await expect(page.locator('#classes .rsec__body > p').first()).toHaveText('In this study, freelancing was higher among women who attended more classes.');
    // the chart under it is titled "Share of Women Freelancing", not the heading's words again; its data (RC-08) and rows are unchanged
    await expect(page.locator('#classes [data-fact="RC-08"] .bars__title')).toHaveText('Share of Women Freelancing');
    await expect(page.locator('#classes [data-fact="RC-08"] .bars__data caption')).toHaveText('Share of Women Freelancing');
    expect(await texts(page, '#classes [data-fact="RC-08"] .bars__label')).toEqual(['Control Group', 'Attended 1–10 Classes', 'Attended 11–24 Classes', 'Attended 25 or More Classes']);
    await expect(page.locator('#classes [data-fact="RC-08"] .bars__row')).toHaveCount(4);
    expect(await texts(page, '#classes [data-fact="RC-08"] .bars__value')).toEqual(['12%', '16%', '21%', '42%']);
    const html = readFileSync(listPages().find((p) => p.route === '/impact/independent-evaluation/')!.file, 'utf8');
    expect(visible(html)).not.toMatch(/More Classes, More Freelancing|more likely to be freelancing at follow-up/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S3 (Claude): the 2 million 2030 aim carries its dependency on every page that states it', () => {
  test('the constant is the clause the Programs hub card had', () => {
    expect(AIM_DEPENDENCY).toBe('depending on government and donor commitments');
  });

  test('Programs, Impact, About and YouthWIDE (the regions row and the 2030 aim tile) say it', async ({ page }) => {
    await open(page, 'programs/');
    expect(compact(await page.locator('main').textContent())).toContain(`In Bangladesh it aims to train 2 million vulnerable youth for digital employment by 2030, ${AIM_DEPENDENCY}.`);
    await open(page, 'impact/');
    const tile = page.locator('#heading a[data-fact~="IN-01"]');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.locator('.glance__note').textContent())).toBe(`YouthWIDE in Bangladesh, ${AIM_DEPENDENCY}. An ambition, not a result.`);
    await open(page, 'about/');
    expect(compact(await page.locator('#story .timeline__item').last().locator('.timeline__text').textContent())).toBe(
      `JobReady rolls out in stages. YouthWIDE aims to train 2 million vulnerable youth in Bangladesh by 2030, ${AIM_DEPENDENCY}; CodersTrust publishes Impact Survey 2026.`,
    );
    await open(page, YOUTHWIDE);
    expect(compact(await page.locator('#program-glance .pg__row').first().textContent())).toContain(`that aims to train 2 million vulnerable youth by 2030, ${AIM_DEPENDENCY}.`);
    expect(compact(await page.locator('section#governments .mech-target__note').textContent())).toBe(`A national ambition for 2030, ${AIM_DEPENDENCY}; not a delivered figure.`);
  });

  test('no built page states the 2 million aim without the clause within 260 characters, and only those four pages state it', () => {
    const pages = sitePages()
      .map((p) => ({ route: p.route, text: visible(p.html) }))
      .map((p) => ({ route: p.route, windows: [...p.text.matchAll(/(?<![\d,.])2 million.{0,260}/g)].map((m) => m[0]).filter((w) => /vulnerable youth/.test(w) && /2030/.test(w)) }))
      .filter((p) => p.windows.length > 0);
    expect(pages.map((p) => p.route).sort()).toEqual(['/about/', '/impact/', '/programs/', '/programs/youthwide/']);
    for (const p of pages) for (const w of p.windows) expect(w, p.route).toContain(AIM_DEPENDENCY);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S4 (Claude; owner answer 2026-10-20: "711 of 1000 is correct. The BIGD study only studied 833."): WSDFM’s program records name the trial’s count beside them', () => {
  const LINE = 'WSDFM: 711 of 1,000 enrolled in work (71%), from program records.'; // WP63 (cycle-35 review, Kimi K2): WP81 (owner item 2026-10-23): "separate trial: 833 women" is replaced by "from program records", which keeps the line one row at 1280 (this block's budget test)
  const CAPTION = 'WSDFM program records (not trial results; the trial’s 425 women offered a place were among these 1,000): 71% of enrolled women in work';
  const CARD_PAGES = ['partner-with-us/development-partners/', 'partner-with-us/foundations/', LOCAL, YOUTHWIDE];

  test('the count is RC-07’s (833 women at baseline: 425 treatment, 408 control), read from the register; PR-01 still says 711 of 1,000', () => {
    expect(TRIAL_WOMEN).toBe('833');
    expect(fact('RC-07').text).toContain('833 women at baseline (425 treatment, 408 control)');
    expect(fact('PR-01').stat?.value).toBe('711 of 1,000');
  });

  test('Home slide 4: the WSDFM line is one row at 1280 (as long as the Kosovo line), names PR-01 and RC-07, and every slide keeps the 48 px budget at 1280 and 390', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HOME);
    const lines = slide(page, 4).locator('.hs__lines li');
    expect((await texts(page, '[data-hs-slide]:nth-child(4) .hs__lines li'))[1]).toBe(LINE);
    expect(await lines.nth(1).getAttribute('data-fact')).toBe('PR-01');
    const heights = await lines.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(heights[1], 'the WSDFM line wraps').toBe(heights[0]);
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

  for (const route of CARD_PAGES) {
    test(`${route}: the WSDFM card’s caption names the trial’s count, and the band names RC-07`, async ({ page }) => {
      await open(page, route);
      const card = page.locator('#cases article', { hasText: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)' });
      await expect(card.locator('.case__value')).toHaveText('711 of 1,000');
      expect(compact(await card.locator('.case__label').textContent())).toBe(CAPTION);
      expect(((await page.locator('#cases [data-fact]').first().getAttribute('data-fact')) ?? '').split(' ')).toContain('RC-07');
    });
  }

  test('Home’s WSDFM card shows its program records (WP63; it showed delivery context), not the caption, and the band does not name RC-07 (the slide names it beside the figure)', async ({ page }) => {
    await open(page, HOME);
    expect(compact(await page.locator('#cases').textContent())).not.toContain('the trial studied 833 women');
    expect(((await page.locator('#cases [data-fact]').first().getAttribute('data-fact')) ?? '').split(' ')).not.toContain('RC-07');
  });

  test('Impact: the WSDFM tile’s note says the trial studied 833 women, and names RC-07', async ({ page }) => {
    await open(page, 'impact/');
    const tile = page.locator('#glance a[data-fact~="PR-01"]');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.locator('.glance__note').textContent())).toBe('Program records, not trial results; the 425 women offered a place in the randomized trial were among these 1,000.');
    expect(((await tile.getAttribute('data-fact')) ?? '').split(' ')).toEqual(expect.arrayContaining(['PR-01', 'PR-06', 'RC-07']));
  });

  test('the WSDFM case study: the note above the tiles says the 425 women offered a place were among the 1,000 (WP82), beside the first tile’s "711 of 1,000"', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    const note = page.locator('[data-hero-note]');
    await expect(note).toHaveText('Program records, not trial results; the 425 women offered a place in the randomized trial by the BRAC Institute of Governance and Development (BIGD) were among the 1,000 women enrolled.');
    await expect(note).toHaveAttribute('data-fact', 'RC-07');
    await expect(page.locator('.cs__stat').first()).toContainText('711 of 1,000');
  });

  test('no page says the 833 are "of" the 1,000 (the trial’s sample includes 408 women who were not offered a place)', () => {
    expect(sitePages().filter((p) => /833 of (?:them|the 1,000|those)/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S6 (Claude): the Governments delivery card is "Trainers and Curriculum"', () => {
  test('the card keeps its text; the benefit card "Capacity Designed to Stay in Your System" stays; no card is headed just "Capacity Designed to Stay"', async ({ page }) => {
    await open(page, GOVERNMENTS);
    const card = page.locator('#mechanism li', { hasText: 'Trainers and Curriculum' });
    await expect(card).toHaveCount(1);
    expect(compact(await card.textContent())).toContain('Training of Trainers, curriculum and manuals, then preparation for industry certification.');
    // WP76: the first card is the settled target-group wording ("Vulnerable and Unemployed Youth" before); tests/wp76.spec.ts holds the card
    expect(await texts(page, '#mechanism .model__title')).toEqual(['Educated, Unemployed and Underemployed Youth', 'Government Digital Labs', 'Trainers and Curriculum', 'Placement and Monthly Reports']);
    const titles = await texts(page, 'h3, .card__title, .model__title');
    expect(titles.filter((t) => t === 'Capacity Designed to Stay')).toEqual([]);
    expect(titles.filter((t) => t === 'Capacity Designed to Stay in Your System')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// WP61 (cycle-33 review, GPT-6.1 Sol G1) shortened the slide to three sentences, with one semicolon (in the Her Power sentence) and no bracket; tests/wp61.spec.ts holds the new wording's other behaviors.
test.describe('G1 (GPT-6.1 Sol): Home slide 2 says the same facts in plain sentences (four until WP61, three since)', () => {
  const LEAD =
    'Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly. As National University’s official training partner for digital career skills and credentials, CodersTrust is onboarding 1.5M+ learners, the university’s own learners, not learners trained by CodersTrust.';

  test('the lead reads as above, with no bracket and one semicolon, the owner words "onboarding 1.5M+ learners", and the facts GV-12, GV-01, GV-11 and SC-04', async ({ page }) => {
    await open(page, HOME);
    const lead = slide(page, 2).locator('.hs__lead');
    const text = compact(await lead.textContent());
    expect(text).toBe(LEAD);
    expect(text).not.toMatch(/[()]/);
    expect((text.match(/;/g) ?? []).length, 'the one semicolon is the Her Power sentence’s').toBe(1);
    expect(text.split(/(?<=\.)\s+/)).toHaveLength(3);
    expect(text).toContain('onboarding 1.5M+ learners');
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
  });

  test('the two Her Power counts are the register’s (GV-01 and GV-11 with GV-13), and the Governments tile keeps the longer note', async ({ page }) => {
    expect(CONTRACT_FIGURES).toEqual({ national: '25,125', direct: '2,400' });
    expect(fact('GV-01').stat?.value).toBe(CONTRACT_FIGURES.national);
    expect(fact('GV-13').stat?.value).toBe(CONTRACT_FIGURES.direct);
    await open(page, GOVERNMENTS);
    const tile = page.locator('#glance li', { hasText: '30,000+' });
    expect(compact(await tile.locator('.pg__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G2 (GPT-6.1 Sol): YouthWIDE’s national-scale answer says larger programs are designed to run in phases', () => {
  test('the sentence is in the page and in its structured data, and "We scale in phases, up to 10 cohorts" is gone', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const item = page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) }).first();
    const answer = compact(await item.locator('.faq__a').textContent());
    expect(answer).toContain('Larger programs are designed to run in phases, up to 10 cohorts in parallel, with certified local facilitators. A 100,000+ phase is a design option; we have not yet delivered a program at that size.');
    expect(answer).not.toContain('We scale in phases, up to 10 cohorts');
    expect((await faqJsonLd(page)).find((q) => q.name === 'Can You Deliver at National Scale?')?.text).toContain('Larger programs are designed to run in phases, up to 10 cohorts in parallel, with certified local facilitators.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G3 (GPT-6.1 Sol): Employers’ "AI skills are the hardest to find" names its source', () => {
  test('the first pain card reads the sentence with PX-05’s source note inside it, from SOURCE_NOTE', async ({ page }) => {
    expect(SOURCE_NOTE['PX-05']).toBe('(ManpowerGroup, 2026)');
    await open(page, EMPLOYERS);
    const first = page.locator('#problem .gp__pains li').first();
    expect(compact(await first.locator('.gp__q').textContent())).toBe('You Struggle to Find the Digital Talent You Need');
    expect(compact(await first.locator('.gp__a').textContent())).toBe(`AI skills are the hardest to find ${SOURCE_NOTE['PX-05']}.`);
    await expect(page.locator('#problem [data-fact="PX-05"]')).toContainText('72%');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G5 (GPT-6.1 Sol): Local Partners’ first "What Your Community Gets" card no longer repeats the funding-end answer', () => {
  test('the card is two sentences; the funding-end answer (Q10) is still on the page, with its scope words', async ({ page }) => {
    await open(page, LOCAL);
    const card = page.locator('#features li', { has: page.locator('.card__title', { hasText: 'Certified Facilitators and a Local Curriculum' }) });
    await expect(card).toHaveCount(1);
    const text = compact(await card.locator('.card__text').textContent());
    expect(text).toBe('Certified-facilitator training, a localized curriculum and preparation for industry certification. You do not have to build the curriculum or certification route yourself.');
    expect(text).not.toContain('funding ends');
    expect(await card.getAttribute('data-fact')).toBe('PD-06 PD-02');
    expect(compact(await page.locator('main').textContent())).toContain('Where included in the program scope, what the program builds stays in place');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K1 and K2 (Kimi): the Case Studies hub is "Five Programs Across Kosovo, Albania and Bangladesh" (WP63; it was "..., from Kosovo to Bangladesh"), with a photograph from a case-study program and an honest label on Albania’s figure', () => {
  const HUB = 'impact/case-studies/';

  test('the H1, the lead and the grid’s H2 read as below, and the old H1 and H2 are gone', async ({ page }) => {
    await open(page, HUB);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Five Programs Across Kosovo, Albania and Bangladesh');
    await expect(page.locator('main .hero__lead').first()).toHaveText('Five programs, each with its result and its base.');
    await expect(page.getByRole('heading', { level: 2, name: 'Results First, Program by Program' })).toHaveCount(1);
    expect(sitePages().filter((p) => /Learners Reaching Paid Work, from Kosovo|Five Programs, Results First|Five Programs, from Kosovo to Bangladesh/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  test('the hero photograph is the Kosovo training room (a case-study program), described as Kosovo; the Bhutan inauguration is on Global Reach and not on the hub', async ({ page }) => {
    await open(page, HUB);
    const hero = page.locator('img[fetchpriority="high"]').first();
    await expect(hero).toHaveAttribute('data-asset', 'legacy-general-kosovo-woman-training');
    expect(await hero.getAttribute('alt')).toBe('A woman learner seated at a computer among other learners in a Women in Online Work training room in Kosovo');
    // no photograph twice on the page: the Kosovo card keeps the wider Kosovo photograph
    const assets = await page.locator('img[data-asset]').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('data-asset')));
    expect(new Set(assets).size, 'each photograph once').toBe(assets.length);
    expect(assets).not.toContain('legacy-global-bhutan-batch-inauguration');
    await open(page, GLOBAL_REACH);
    expect(await page.locator('img[data-asset="legacy-global-bhutan-batch-inauguration"]').count()).toBeGreaterThan(0);
  });

  test('the Albania card names its figure "Reported Enrollment" (an enrollment count, not a result); the other four cards say "Result"', async ({ page }) => {
    await open(page, HUB);
    const names = await page.locator('article.case .card__title').evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
    const labels = await page.locator('article.case .case__result dt').evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
    expect(names).toHaveLength(5);
    expect(labels).toEqual(names.map((n) => (n === 'Digital Jobs Albania' ? 'Reported Enrollment' : 'Result')));
    const albania = page.locator('article.case', { hasText: 'Digital Jobs Albania' });
    await expect(albania.locator('.case__value')).toHaveText('500+');
    expect(compact(await albania.locator('.case__label').textContent())).toBe('students enrolled, reported by the World Bank in May 2022 while the program was running');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K3 (Kimi; owner answer 2026-10-20: "Of the same 800 tracked"): Her Power’s 18.6% names its base', () => {
  test('PR-05 says "18.6% of those 800 were in work during the course", and every page that prints the 18.6% says it that way', async ({ page }) => {
    expect(fact('PR-05').text).toBe(
      'Her Power (ICT Division / DoICT): 372 of 800 tracked women, from the 2,400 trained directly by CodersTrust, were in work (47%); 18.6% of those 800 were in work during the course',
    );
    expect(fact('PR-05').stat?.value).toBe('372 of 800');
    const printing = sitePages().filter((p) => visible(p.html).includes('18.6%'));
    expect(printing.map((p) => p.route)).toEqual(['/impact/case-studies/her-power/']);
    for (const p of printing) expect(visible(p.html), p.route).toContain('were in work (47%); 18.6% of those 800 were in work during the course');
    await open(page, 'impact/case-studies/her-power/');
    expect(compact(await page.locator('p[data-fact="PR-05"]').textContent())).toContain('18.6% of those 800 were in work during the course');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L4 (GLM): Home’s "How Do You Prove Outcomes?" says a scorecard is agreed for every cohort', () => {
  const OPENING = 'A scorecard is agreed for every cohort before delivery.';

  test('the answer opens with the sentence, in the page and in its FAQ structured data; "Every cohort agrees a scorecard" is on no built page', async ({ page }) => {
    await open(page, HOME);
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: 'How Do You Prove Outcomes?' }) }).first();
    const answer = compact(await item.locator('.faq__a').textContent());
    expect(answer).toBe(`${OPENING} As agreed in the program scope, partners receive monthly reports and follow-up surveys at 3, 6 and 12 months, and independent evaluation is welcome.`);
    expect((await faqJsonLd(page)).find((q) => q.name === 'How Do You Prove Outcomes?')?.text).toBe(answer);
    expect(sitePages().filter((p) => visible(p.html).includes('Every cohort agrees a scorecard')).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L7 (GLM): the JobReady Platform rollout table says "Live" for the course storefront', () => {
  test('the statuses are Live, Pre-Launch, Pre-Launch, Live and Live; the storefront’s note still says it operates at jobready.global; "Operating" is not a status', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const rows = page.locator('#status tbody tr');
    await expect(rows).toHaveCount(5);
    expect(await texts(page, '#status tbody td[data-label="Status"]')).toEqual(['Live', 'Pre-Launch', 'Pre-Launch', 'Live', 'Live']);
    const first = rows.first();
    expect(compact(await first.locator('th').textContent())).toBe('Train');
    expect(compact(await first.locator('td[data-label="Capability"]').textContent())).toBe('Course storefront at jobready.global');
    expect(compact(await first.locator('td[data-label="Note"]').textContent())).toBe('CodersTrust’s course storefront operates at jobready.global.');
    expect(await texts(page, '#status .badge')).not.toContain('Operating');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM1 (Gemini): the Programs hub’s evidence band is scoped to youth-employment programs', () => {
  test('the band is "Evidence from Youth-Employment Programs", opens with the scope line, and keeps the trial line (predecessor program named), the survey tile and the two links', async ({ page }) => {
    await open(page, 'programs/');
    const band = page.locator('#proof-band');
    await expect(band.locator('h2')).toHaveText('Evidence from Youth-Employment Programs');
    await expect(band.locator('.eb__head .lead').first()).toHaveText('These results are from youth-employment programs, not evidence for every program listed above.');
    expect(await texts(page, '#proof-band h3')).toEqual(['An Independent Randomized Trial', 'From the October 2026 Survey']);
    expect(compact(await band.locator('.eb__headline').textContent())).toContain('predecessor WSDFM program');
    expect(compact(await band.locator('.eb__stat').first().textContent())).toContain('78.2%');
    expect(await texts(page, '#proof-band .eb__links a')).toEqual(['See the Evidence', 'The Randomized Trial']);
    expect(sitePages().filter((p) => p.route === '/programs/' && visible(p.html).includes('Trial and Survey Evidence'))).toEqual([]);
  });

  test('YouthWIDE, which is a youth-employment program, keeps "Trial and Survey Evidence"', async ({ page }) => {
    await open(page, YOUTHWIDE);
    await expect(page.locator('#proof-band h2')).toHaveText('Trial and Survey Evidence');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM4 (Gemini): Foundations’ "What Happens Next" says what the first conversation covers for a platform grant', () => {
  test('the lead names the platform grant before the cohort sequence, and the four cohort steps stay', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const band = page.locator('#next-steps');
    await expect(band.locator('h2')).toHaveText('What Happens Next');
    expect(compact(await band.locator('.lead').textContent())).toBe('For platform grants, the first conversation covers JobReady’s infrastructure and staged rollout. For cohort grants, the steps below show target timing for grant-funded pilots.');
    expect(await band.locator('[data-fact="PD-04"]').count()).toBe(1);
    expect(compact(await band.locator('[data-fact="PD-04"]').textContent())).toMatch(/Discovery.*Co-Design.*Agreement/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM5 (Gemini): Governments’ "Capacity Designed to Stay in Your System" opens with its scope', () => {
  test('the card text is "Where included in your program scope: ..." and keeps its list and facts; the other two "What Your Agency Gets" cards are unchanged', async ({ page }) => {
    await open(page, GOVERNMENTS);
    const cards = page.locator('main section:has(h2:text-is("What Your Agency Gets")) li');
    expect(await cards.locator('.card__title').allTextContents()).toEqual(['Certification Tracks and Placement Support', 'Spending Measured Against Outcomes', 'Capacity Designed to Stay in Your System']);
    const card = cards.nth(2);
    expect(compact(await card.locator('.card__text').textContent())).toBe(
      'Where included in your program scope: Training of Trainers, curriculum and manuals; certified local facilitators; and blended learning in existing labs that works with limited connectivity, so rural labs can take part.',
    );
    expect(await card.getAttribute('data-fact')).toBe('GV-11 PD-06 PD-07');
    expect(compact(await cards.nth(1).locator('.card__text').textContent())).toBe('A pilot scorecard with cost per completer and per verified outcome, and monthly reports. Your budget is assessed against the agreed scorecard.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM6 (Gemini): Development Partners’ first challenge card no longer repeats the band’s lead', () => {
  test('the card body is "Connect training to a first job, freelance client or business."; the other two are unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    expect(await texts(page, '#problem .gp__a')).toEqual([
      'Connect training to a first job, freelance client or business.',
      'Computer skills, devices, connectivity and social barriers can keep learners from joining or staying.',
      'Without a baseline and documentary evidence, evaluators have little to check.',
    ]);
    expect(compact(await page.locator('#problem .sh__bluf, #problem .bluf, #problem').first().textContent())).toContain('You can count who enrolled.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM7 (Gemini): Home’s "Our Approach" is one sentence that keeps the audience', () => {
  // WP63 (cycle-35 review, Grok R1): the audience is "educated, unemployed and underemployed youth" (it was "educated, unemployed youth"), the group ID-01 and the hero name
  const STATEMENT = 'CodersTrust connects training, mentoring and placement support for educated, unemployed and underemployed youth, with monthly reports on progress toward paid work, as agreed in the program scope.';

  test('the statement is the one sentence, in the source and on Home; the gate declares it whole for Home, independently of the source', async ({ page }) => {
    expect(POSITIONING.home.text).toBe(STATEMENT);
    expect(POSITIONING.home.facts).toEqual(['PD-08']);
    const gate = readFileSync(new URL('../scripts/check-facts.mjs', import.meta.url), 'utf8');
    const whole = /const POSITION_WHOLE_STATEMENT = \{([\s\S]*?)\n\};/.exec(gate)?.[1] ?? '';
    expect(whole).toContain(`'/': '${STATEMENT}'`);
    expect(/const POSITION_EMPLOYER_CLOSING = \{([\s\S]*?)\n\};/.exec(gate)?.[1] ?? '').not.toMatch(/^\s*'\/':/m);
    await open(page, HOME);
    const text = compact(await page.locator('#mechanism .pos__text').textContent());
    expect(text).toBe(STATEMENT);
    expect(text.split(/(?<=\.)\s+/)).toHaveLength(1);
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('PD-08');
    expect(compact(await page.locator('main').textContent())).not.toContain('For funders who need educated, unemployed youth in paid digital work');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM8 and GM9 (Gemini): the Governments and Foundations learner cards say it once', () => {
  test('Governments: Maria Dewan’s card is the one line "Won logo-design work on Freelancer.com, then gained more clients.", with her name and program and no narrative sentence under it', async ({ page }) => {
    await open(page, GOVERNMENTS);
    const card = page.locator('#learner-voice article.ls');
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.ls__outcome').textContent())).toBe('Won logo-design work on Freelancer.com, then gained more clients.');
    await expect(card.locator('.ls__excerpt')).toHaveCount(0);
    expect(await texts(page, '#learner-voice .ls__name b, #learner-voice .ls__name span')).toEqual(['Maria Dewan', 'Her Power']);
    expect(compact(await card.locator('.ls__caveat').textContent())).toBe('Individual story; not typical or promised.');
    expect(compact(await page.locator('main').textContent())).not.toMatch(/She showed her skills by winning a company logo design|began her journey of earning/);
  });

  test('Foundations: Samina’s card is her outcome line alone; "She has completed 90+ projects on Fiverr so far." is gone from the page', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const card = page.locator('#learner-voice article.ls');
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.ls__outcome').textContent())).toBe('Completed 90+ projects as a freelance graphic designer on Fiverr');
    await expect(card.locator('.ls__excerpt')).toHaveCount(0);
    expect(await texts(page, '#learner-voice .ls__name b, #learner-voice .ls__name span')).toEqual(['Samina Tasneem Chowdhury', 'WSDFM']);
    expect(compact(await page.locator('main').textContent())).not.toContain('She has completed 90+ projects on Fiverr so far.');
  });

  test('the other learner cards keep their passage (Local Partners’ Samina sentence, Universities’ Maria sentence, Employers’ quotation)', async ({ page }) => {
    for (const [route, text] of [
      [LOCAL, 'During the training period, she began offering her services as a graphic designer on the freelance marketplace Fiverr.'],
      ['partner-with-us/universities/', 'Maria Dewan was a third-year Biology student when she first came across Her Power, where CodersTrust was a training partner.'],
      [EMPLOYERS, 'A paying job after only two months of Digital Accounting training is a huge accomplishment for me'],
    ] as const) {
      await open(page, route);
      expect(compact(await page.locator('#learner-voice .ls__excerpt').textContent()), route).toContain(text);
    }
  });
});
