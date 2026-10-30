import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact, sources } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { CONTRACT_TOTAL_NOTE, CONTRACT_TOTAL_NOTE_INVESTORS, CONTRACT_TOTAL_NOTE_SHORT, DISCOVERY_SESSION_LINE, READ_THE_EVIDENCE, SOURCE_NOTE } from '../src/data/copy';
import { NO_PRIOR, percent } from '../src/components/pages/impact/outcomes-data';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP59 behaviors (cycle-31 whole-site reviews: Claude S3 and S4; GPT-6.1 Sol G1, G2, G5 and G6; Kimi K3; GLM L1 and L3; Gemini GM1). Retrospective coverage (the owner exempted this project from test-first work); each test states one observable
 * behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp59.spec.ts --project=chromium`):
 *   - S3: the Home FAQ "Does the Trial Apply to Your Program?" says "Results for other programs ..." (not "later programs"), in the page and in its FAQ structured data;
 *   - S4: Outcomes 2026, "Results in Brief": the 70.8% tile names its base, "(34 of 48) of surveyed 2014-2023 completers with no prior income were earning at the October 2026 survey";
 *   - G1: the Investors and JobReady Platform "Contracted Scope" tiles carry the note Home and Governments print (CONTRACT_TOTAL_NOTE), so the 30,000+ is explained the same way wherever it appears;
 *   - G2: the closing bands (Impact pages, TalentLEAP) say "A discovery session explores your goals, priority groups and possible program scope.";
 *   - G5: the Bangladesh graduate-unemployment rate (PX-03) names its publisher and year, "(BBS Labour Force Survey, 2024)", wherever it is shown (Local Partners, NU Post Graduate Diploma);
 *   - G6: the five audience pages no longer print the standalone "Safeguarding, Governance and Due Diligence" link after their FAQs; the due-diligence band and its "Governance and Accountability" link stay;
 *   - K3: Home slide 1's ">4x" callout states its base, "Employment effect, not income: +10.3 percentage points, more than four times the 2.3-point average across nine vocational-training trials.", within the carousel's height budget;
 *   - L1: Home slide 2 keeps "onboarding 1.5M+ learners" and adds "(National University's learners, not learners trained by CodersTrust)", within the carousel's height budget;
 *   - L3: SC-16 is two sentences, "... enrollments since 2014. CodersTrust has worked in 16 countries and territories.", on Home's reach card;
 *   - GM1: the closing-band text link is "Read the Evidence" (Title Case) on Home, the hub, About, Recognition, Development Partners and Universities.
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
/** The visible text of a built page's <main>. */
const mainOf = (html: string) => visible(html.includes('<main') ? html.slice(html.indexOf('<main'), html.indexOf('</main>')) : html);

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
/**
 * Unused space, in px, between the showing slide's content and the controls bar under the slides: the measure of tests/hero-slider.spec.ts (its budget is 48 px at 1280 and 390).
 */
const unusedBelow = (page: Page) =>
  page.evaluate(() => {
    const active = document.querySelector('[data-hs-slide].is-active');
    const controls = document.querySelector('[data-hs-bar]');
    if (!active || !controls) return Number.NaN;
    const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
    const contentBottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom));
    return Math.round(controls.getBoundingClientRect().top - contentBottom);
  });
/** Show slide n (1-based) the way a visitor does (a dot), and let the slide settle. */
async function showSlide(page: Page, n: number) {
  await page.locator('[data-hs-dot]').nth(n - 1).click();
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')))).toBe(n - 1);
  await page.waitForTimeout(450);
}

const HOME = '';
const INVESTORS = 'partner-with-us/investors/';
const JOBREADY = 'our-model/jobready-platform/';
const OUTCOMES = 'impact/outcomes-2026/';
const LOCAL = 'partner-with-us/local-partners/';
const NU = 'programs/nu-postgraduate-diploma/';
const FIVE_AUDIENCE_PAGES = ['partner-with-us/development-partners/', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/universities/', LOCAL];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S3: the Home FAQ says "Results for other programs ..."', () => {
  const ANSWER =
    'The randomized trial evaluated CodersTrust’s 200-hour WSDFM program for women in Dhaka, not today’s 100-hour tracks. Results for other programs come from the October 2026 survey of completers and from program records, which are descriptive.';

  test('the register holds the two-sentence answer with "other programs" (the Kosovo pilot of 2016–2017 predates the trial follow-up, so "later" was untrue of it)', () => {
    const q15 = faqs.find((f) => f.id === 'Q15');
    expect(q15?.q).toBe('Does the Trial Apply to Your Program?');
    expect(q15?.a).toBe(ANSWER);
    expect(q15?.audiences).toEqual(['home']);
  });

  test('Home prints the answer whole, its FAQ structured data says the same words, and "later programs" is gone', async ({ page }) => {
    await open(page, HOME);
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: 'Does the Trial Apply to Your Program?' }) }).first();
    const answer = compact(await item.locator('.faq__a').textContent());
    expect(answer).toBe(ANSWER);
    expect((await faqJsonLd(page)).find((q) => q.name === 'Does the Trial Apply to Your Program?')?.text).toBe(answer);
    expect(compact(await page.locator('main').textContent())).not.toContain('later programs');
  });

  test('no built page, in its text or its structured data, still says "Results for later programs"', () => {
    expect(listPages().filter((p) => readFileSync(p.file, 'utf8').includes('Results for later programs')).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('S4: Outcomes 2026, "Results in Brief": the 70.8% tile names its base', () => {
  const LABEL = '(34 of 48) of surveyed 2014–2023 completers with no prior income were earning at the October 2026 survey';

  test('the register: OC-02 states 70.8% (34 of 48); the tile label prints that base, which is the base the page data holds (NO_PRIOR)', () => {
    const oc02 = fact('OC-02');
    expect(oc02.text).toBe('70.8% (34 of 48) of 2014–2023 completers who had no income before training were earning at the October 2026 survey');
    expect(oc02.stat?.value).toBe('70.8%');
    expect(oc02.stat?.label).toBe(LABEL);
    expect(oc02.stat?.label.startsWith(`(${NO_PRIOR.earning} of ${NO_PRIOR.base}) `)).toBe(true);
    expect(`${percent(NO_PRIOR.earning, NO_PRIOR.base).toFixed(1)}%`).toBe(oc02.stat?.value);
    // the glance wording (no page prints OC-02 as a glance tile today) is untouched
    expect(oc02.stat?.glance?.label).toBe('of surveyed 2014–2023 completers with no income before training were earning at the October 2026 survey');
  });

  test('the tile reads "70.8% (34 of 48) of surveyed 2014–2023 completers with no prior income were earning at the October 2026 survey", with no note under it', async ({ page }) => {
    await open(page, OUTCOMES);
    const tile = page.locator('#summary [data-fact="OC-02"]');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.stat__value')).toHaveText('70.8%');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe(LABEL);
    await expect(tile.locator('.stat__note')).toHaveCount(0);
    expect(compact(await tile.evaluate((el) => (el as HTMLElement).innerText))).toBe(`70.8% ${LABEL}`);
    // WP104 (item 7): the paragraph that repeated the register's text under "Median Change per Person" is gone; Results in Brief says it once
    await expect(page.locator('#income [data-fact="OC-02"]')).toHaveCount(0);
  });

  test('the tile fits at 1280 and 390: the label stays inside its tile and the page does not scroll sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, OUTCOMES);
      await scrollThrough(page);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      const box = await page.locator('#summary [data-fact="OC-02"] .stat__label').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { right: r.right, left: r.left, width: r.width, vw: document.documentElement.clientWidth };
      });
      expect(box.left, `${vp.width}px left`).toBeGreaterThanOrEqual(0);
      expect(box.right, `${vp.width}px right`).toBeLessThanOrEqual(box.vw);
    }
  });

  test('no built page prints the OC-02 label without its base', () => {
    const bare = /of surveyed 2014–2023 completers with no prior income were earning at the October 2026 survey/g;
    const problems: string[] = [];
    let seen = 0;
    for (const p of sitePages()) {
      const text = visible(p.html);
      for (const m of text.matchAll(bare)) {
        seen += 1;
        if (!text.slice(0, m.index!).endsWith('(34 of 48) ')) problems.push(`${p.route}: "${text.slice(Math.max(0, m.index! - 20), m.index! + 20)}"`);
      }
    }
    expect(seen, 'the label is found in the build (the check is not silently empty)').toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G1: the Investors and JobReady Platform "Contracted Scope" tiles explain the 30,000+ as Home and Governments do', () => {
  test('the note is CONTRACT_TOTAL_NOTE (contract scope, not a count of completers; Her Power’s national program; who trained how many), tied to GV-12, GV-01 and GV-11', () => {
    expect(CONTRACT_TOTAL_NOTE.text).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly). Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.');
    expect(CONTRACT_TOTAL_NOTE.facts).toEqual(['GV-12', 'GV-01', 'GV-11', 'SC-02']);
  });

  test('Investors: directly under the 30,000+ figure and its label, inside the tile, tied to the facts it rests on; the tile keeps its Contract Scope tag and its fact', async ({ page }) => {
    await open(page, INVESTORS);
    const tile = page.locator('#reach .ir__tile');
    await expect(tile).toHaveCount(1);
    expect(await tile.getAttribute('data-fact')).toBe('SC-06');
    await expect(tile.locator('[data-evidence="Contract Scope"]')).toHaveCount(1);
    await expect(tile.locator('.stat__value')).toHaveText('30,000+');
    const note = tile.locator('.ir__note');
    await expect(note).toHaveCount(1);
    // WP94 (triage A4): Investors' note ends with the pointer sentence; the other pages keep CONTRACT_TOTAL_NOTE.
    expect(compact(await note.textContent())).toBe(CONTRACT_TOTAL_NOTE_INVESTORS.text);
    expect(await note.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-02');
    const gap = await page.evaluate(() => {
      const label = document.querySelector('#reach .ir__tile .stat__label')!.getBoundingClientRect();
      const note = document.querySelector('#reach .ir__tile .ir__note')!.getBoundingClientRect();
      return { noteTop: note.top, labelBottom: label.bottom };
    });
    expect(gap.noteTop, 'the note is under the label').toBeGreaterThanOrEqual(gap.labelBottom);
    expect(gap.noteTop - gap.labelBottom, 'and directly under it').toBeLessThanOrEqual(24);
  });

  test('JobReady Platform: the third tile ("Contracted Scope") carries the note under its figure; the other two tiles carry no note', async ({ page }) => {
    await open(page, JOBREADY);
    const tiles = page.locator('#why .jr__whystat');
    await expect(tiles).toHaveCount(3);
    expect(await texts(page, '#why .jr__whyh')).toEqual(['Delivered Since 2014', 'Being Onboarded', 'Contracted Scope']);
    await expect(page.locator('#why .jr__whynote')).toHaveCount(1);
    const third = tiles.nth(2);
    expect(compact(await third.locator('.jr__whynote').textContent())).toBe(CONTRACT_TOTAL_NOTE_SHORT.text);
    expect(await third.locator('.jr__whynote').getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11');
    await expect(third.locator('.factstat')).toHaveAttribute('data-fact', 'SC-06');
    await expect(third.locator('.stat__value')).toHaveText('30,000+');
    const gap = await page.evaluate(() => {
      const third = document.querySelectorAll('#why .jr__whystat')[2];
      const label = third.querySelector('.stat__label')!.getBoundingClientRect();
      const note = third.querySelector('.jr__whynote')!.getBoundingClientRect();
      return { noteTop: note.top, labelBottom: label.bottom };
    });
    expect(gap.noteTop).toBeGreaterThanOrEqual(gap.labelBottom);
    expect(gap.noteTop - gap.labelBottom).toBeLessThanOrEqual(24);
  });

  test('wherever a built page shows the six-contract total (a SC-06 or GV-12 tile), it also says it is contract scope, not a count of completers, and names Her Power’s 25,125 and the 2,400 trained directly', () => {
    const TOTAL_PAGES = sitePages().filter((p) => p.route !== '/styleguide/' && /data-fact="[^"]*\b(?:SC-06|GV-12)\b[^"]*"/.test(p.html));
    expect(TOTAL_PAGES.map((p) => p.route)).toEqual(expect.arrayContaining(['/', '/impact/', '/partner-with-us/governments/', '/partner-with-us/investors/', '/our-model/jobready-platform/']));
    for (const p of TOTAL_PAGES) {
      const text = mainOf(p.html);
      // WP60 (cycle-32 review, GPT-6.1 Sol G1): Home's slide 2 says the clause in plain words, "... work scoped for 30,000+ people, not a count of completers."; every other page keeps the register's "contract scope, not a count of completers"
      expect(text, p.route).toContain(p.route === '/' ? 'work scoped for 30,000+ people, not a count of completers' : 'contract scope, not a count of completers');
      expect(text, p.route).toContain('25,125 women');
      expect(text, p.route).toContain('2,400');
    }
  });

  test('the two tiles fit at 1280 and 390: the note stays inside its column and the page does not scroll sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const [route, selector] of [[INVESTORS, '#reach .ir__note'], [JOBREADY, '#why .jr__whynote']] as const) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
        const right = await page.locator(selector).evaluate((el) => el.getBoundingClientRect().right);
        expect(right, `${route} note at ${vp.width}px`).toBeLessThanOrEqual(vp.width);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G2: the closing bands say a discovery session "explores your goals, priority groups and possible program scope"', () => {
  const LINE = 'A discovery session explores your goals, priority groups and possible program scope.';
  const ROUTES = ['impact/', 'impact/independent-evaluation/', OUTCOMES, 'impact/in-the-field/', 'impact/in-the-field/news-photos/', 'our-model/talentleap/'];

  test('DISCOVERY_SESSION_LINE is the sentence', () => {
    expect(DISCOVERY_SESSION_LINE).toBe(LINE);
  });

  test('each page that printed the K5 line prints the new one, in its closing band or next step', async ({ page }) => {
    for (const route of ROUTES) {
      await open(page, route);
      // the line is in the page's closing call-to-action band (#cta) or its next-step aside, once
      await expect(page.locator('#cta, aside.next').filter({ hasText: LINE }), route).toHaveCount(1);
    }
    for (const route of ['impact/in-the-field/', 'impact/in-the-field/news-photos/']) {
      await open(page, route);
      expect(compact(await page.locator('#cta .cta-band__text').textContent()), route).toBe(`Seen a program like the one you need? ${LINE}`);
    }
  });

  test('exactly those pages print it, and no built page says a discovery session "agrees" or "sets" the priority groups, tracks and pilot scorecard', () => {
    const printed = sitePages().filter((p) => visible(p.html).includes(LINE)).map((p) => p.route).sort();
    expect(printed).toEqual(ROUTES.map((r) => `/${r}`).sort());
    const stale = sitePages().filter((p) => /A discovery session (?:agrees your|sets) priority groups, tracks/.test(visible(p.html))).map((p) => p.route);
    expect(stale).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G5: the 13.5% graduate unemployment names its publisher and year', () => {
  const NOTE = '(BBS Labour Force Survey, 2024)';

  test('SOURCE_NOTE reads PX-03’s note from its registered source (BBSLFS24), and the register’s own wording is unchanged', () => {
    expect(SOURCE_NOTE['PX-03']).toBe(NOTE);
    expect(fact('PX-03').sourceIds).toEqual(['BBSLFS24']);
    expect(sources.BBSLFS24.citation).toBe('Bangladesh Bureau of Statistics (BBS), Labour Force Survey 2024.');
    expect(fact('PX-03').text).toBe('In Bangladesh, graduate unemployment is 13.5% vs. 2.0% for SSC holders');
    expect(fact('PX-03').stat?.label).toBe('graduate unemployment in Bangladesh, vs. 2.0% for Secondary School Certificate (SSC) holders');
  });

  for (const route of [LOCAL, NU]) {
    test(`${route}: the 13.5% tile ends with the note, inside the same label`, async ({ page }) => {
      await open(page, route);
      const card = page.locator('main [data-fact="PX-03"]');
      await expect(card).toHaveCount(1);
      await expect(card.locator('.factcard__value')).toHaveText('13.5%');
      expect(compact(await card.locator('.factcard__label').textContent())).toBe(`graduate unemployment in Bangladesh, vs. 2.0% for Secondary School Certificate (SSC) holders ${NOTE}`);
      await expect(card.locator('sup, a')).toHaveCount(0);
    });
  }

  test('wherever a built page shows the 13.5% it shows the note, the note is never printed without the figure, and no title or meta description carries it', () => {
    const problems: string[] = [];
    let shown = 0;
    for (const p of sitePages()) {
      const text = mainOf(p.html);
      const shows = /13\.5%/.test(text);
      const noted = text.includes(NOTE);
      if (shows) shown += 1;
      if (shows && !noted) problems.push(`${p.route}: the 13.5% is shown without ${NOTE}`);
      if (noted && !shows) problems.push(`${p.route}: ${NOTE} is printed without the 13.5%`);
      const title = /<title>([^<]*)<\/title>/.exec(p.html)?.[1] ?? '';
      const description = /<meta name="description" content="([^"]*)"/.exec(p.html)?.[1] ?? '';
      if (/BBS Labour Force Survey/.test(`${title} ${description}`)) problems.push(`${p.route}: a title or description carries the note`);
    }
    expect(shown, 'the 13.5% is found in the build (the check is not silently empty)').toBeGreaterThanOrEqual(3);
    expect(problems).toEqual([]);
  });

  test('the longer label fits: the tile keeps its text inside the card at 1280 and 390, with no sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      for (const route of [LOCAL, NU]) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
        const clipped = await page.locator('main [data-fact="PX-03"] .factcard__label').evaluate((el) => {
          const card = el.closest('article') as HTMLElement;
          const box = card.getBoundingClientRect();
          const r = el.getBoundingClientRect();
          return r.right > box.right + 1 || r.left < box.left - 1;
        });
        expect(clipped, `${route} at ${vp.width}px`).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('G6: the five audience pages end their FAQs without the standalone governance link', () => {
  for (const route of FIVE_AUDIENCE_PAGES) {
    test(`${route}: the FAQ band is its accordion alone; the due-diligence band and its "Governance and Accountability" link stay`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('#faq')).toHaveCount(1);
      await expect(page.locator('#faq .faqband__all')).toHaveCount(0);
      await expect(page.locator('#faq a.link[href$="/about/governance/"]')).toHaveCount(0);
      expect(compact(await page.locator('main').textContent())).not.toContain('Safeguarding, Governance and Due Diligence');
      const block = page.locator('#due-diligence');
      await expect(block).toHaveCount(1);
      await expect(block.locator('a')).toHaveCount(1);
      expect(compact(await block.locator('a').textContent())).toBe('Governance and Accountability');
      expect(await block.locator('a').getAttribute('href')).toMatch(/\/about\/governance\/$/);
      // the band is still below the FAQs, as the review described it
      const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
      expect(order.indexOf('due-diligence'), `${route} bands: ${order.join(', ')}`).toBeGreaterThan(order.indexOf('faq'));
    });
  }

  test('no built page prints the old link, and Home’s FAQ band keeps its own link to the partner routes', async ({ page }) => {
    expect(listPages().filter((p) => readFileSync(p.file, 'utf8').includes('Safeguarding, Governance and Due Diligence')).map((p) => p.route)).toEqual([]);
    await open(page, HOME);
    expect(compact(await page.locator('#faq .faqband__all').textContent())).toBe('Find the Answers for Your Route');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('K3: Home slide 1’s ">4×" callout states the +10.3 it compares', () => {
  const CAPTION = 'Employment effect, not income: +10.3 percentage points, more than four times the 2.3-point average across nine vocational-training trials.';

  test('the +10.3 is RC-02’s figure and RC-06a’s own text states it; the callout is an average of nine trials, never "typical"', async ({ page }) => {
    expect(fact('RC-02').stat?.numeric).toBe(10.3);
    expect(fact('RC-06a').text).toContain('10.3 percentage points more likely to be employed, more than four times the average of the nine randomized trials');
    expect(fact('RC-06a').stat?.value).toBe('>4×');
    await open(page, HOME);
    const proof = slide(page, 1).locator('.hs__proof');
    expect(await proof.getAttribute('data-fact')).toBe('RC-06a');
    await expect(proof.locator('.stat__value')).toHaveText('>4×');
    expect(compact(await proof.locator('.stat__label').textContent())).toBe(CAPTION);
    expect(compact(await proof.textContent())).not.toMatch(/typical/i);
    // the hero’s trial card states the same figure
    await expect(page.locator('.hh__card[data-fact="RC-02"] .hh__num')).toHaveText('+10.3');
  });

  test('no slide leaves more than 48 px of unused space at 1280 and 390 (the budget of tests/hero-slider.spec.ts), and the callout card stays inside the slide’s visual column', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      for (const n of [1, 2, 3, 4]) {
        await showSlide(page, n);
        expect(await unusedBelow(page), `slide ${n} at ${vp.width}px`).toBeLessThanOrEqual(48);
      }
      await showSlide(page, 1);
      const inside = await page.evaluate(() => {
        const s = document.querySelector('[data-hs-slide].is-active')!;
        const card = s.querySelector('.hs__proof')!.getBoundingClientRect();
        const visual = s.querySelector('.hs__visual')!.getBoundingClientRect();
        return card.left >= visual.left - 1 && card.right <= visual.right + 1 && card.top >= visual.top - 1 && card.bottom <= visual.bottom + 1;
      });
      expect(inside, `the callout card at ${vp.width}px`).toBe(true);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L1: Home slide 2 separates the National University’s learners from learners trained by CodersTrust', () => {
  // WP61 (cycle-33 review, GPT-6.1 Sol G1): the National University sentence is one sentence that ends with the qualifier (it was two: "CodersTrust is also the official training partner of ..., onboarding 1.5M+ learners." and "They are National University’s own learners, ...")
  const SENTENCE = 'As the official training partner of Bangladesh’s National University for digital career skills and credentials, CodersTrust is onboarding 1.5M+ of the university’s own learners, who are not learners trained by CodersTrust.';

  // WP60 (cycle-32 review, GPT-6.1 Sol G1): the qualifier was a sentence of its own after "onboarding 1.5M+ learners." (it had been in brackets): "They are National University’s own learners, not learners trained by CodersTrust."
  test('the owner-confirmed wording "onboarding 1.5M+ learners" is kept (GV-12), and the qualifier closes the same sentence', async ({ page }) => {
    expect(fact('GV-12').text).toContain('official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners');
    expect(fact('SC-04').text.startsWith('1.5M+ National University learners being onboarded (the university’s own learners, not learners trained by CodersTrust)')).toBe(true);
    await open(page, HOME);
    const lead = slide(page, 2).locator('.hs__lead');
    expect(compact(await lead.textContent()).endsWith(SENTENCE)).toBe(true);
    // the lead rests on the facts of the contract-scope note, the National University sentence and the learners' pipeline (SC-04)
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
  });

  test('the longer slide fits the carousel: no slide leaves more than 48 px unused at 1280 and 390, and nothing scrolls sideways', async ({ page }) => {
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

  test('the same separation is on the Universities page’s own note (the qualifier is its shortest form)', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    expect(compact(await page.locator('main').textContent())).toContain('The first two cards describe the learners being onboarded and National University’s size, not learners trained by CodersTrust.'); // WP132: the lead names the first two cards in their order (was "...; they are not learners trained by CodersTrust")
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('L3: SC-16 is two sentences', () => {
  const LABEL = 'learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories.';

  test('the register: text and label are the two-sentence wording; the glance label and note are unchanged', () => {
    const sc16 = fact('SC-16');
    expect(sc16.text).toBe('130,000+ learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories');
    expect(sc16.stat?.label).toBe(LABEL);
    expect(sc16.stat?.value).toBe('130,000+');
    expect(sc16.stat?.glance?.label).toBe('learners trained since 2014');
    expect(sc16.stat?.glance?.note).toBe('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
  });

  test('Home’s reach card reads 130,000+ and the two sentences; no built page keeps the one-sentence form', async ({ page }) => {
    await open(page, HOME);
    const card = page.locator('.hh__card[data-fact="SC-16"]');
    await expect(card.locator('.stat__value')).toHaveText('130,000+');
    // WP62 (cycle-34 review, Gemini): the card’s eyebrow is "Reach Since 2014", so the caption is the register’s label without " since 2014"
    expect(compact(await card.locator('.stat__label').textContent())).toBe(LABEL.replace(' since 2014', ''));
    expect(sitePages().filter((p) => /enrollments since 2014, with work in 16 countries/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  test('the proof strip fits at 1280 and 390: each caption stays inside its card, the cards’ figures start on one line where they sit side by side, and the page does not scroll sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      await scrollThrough(page);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      const cards = await page.locator('.hh__card').evaluateAll((els) =>
        els.map((card) => {
          const box = card.getBoundingClientRect();
          const cap = card.querySelector('.stat__label, .hh__figlabel')!.getBoundingClientRect();
          const fig = (card.querySelector('.hh__figvalue, .stat__value') as HTMLElement).getBoundingClientRect();
          return { inside: cap.left >= box.left - 1 && cap.right <= box.right + 1 && cap.bottom <= box.bottom + 1, figTop: Math.round(fig.top - box.top) };
        }),
      );
      expect(cards.map((c) => c.inside), `${vp.width}px`).toEqual([true, true, true]);
      if (vp.width >= 768) expect(new Set(cards.map((c) => c.figTop)).size, `figures level at ${vp.width}px`).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('GM1: the closing-band text link is "Read the Evidence"', () => {
  const ROUTES = [HOME, 'partner-with-us/', 'about/', 'about/recognition/', 'partner-with-us/development-partners/', 'partner-with-us/universities/'];

  test('READ_THE_EVIDENCE is Title Case like the other text links', () => {
    expect(READ_THE_EVIDENCE).toBe('Read the Evidence');
    expect(titleCase(READ_THE_EVIDENCE)).toBe(READ_THE_EVIDENCE);
  });

  for (const route of ROUTES) {
    test(`${route || 'Home'}: the closing band’s text link reads "Read the Evidence" and opens the Impact page`, async ({ page }) => {
      await open(page, route);
      const link = page.locator('main .cta-band__actions a.link');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveText('Read the Evidence');
      expect(await link.getAttribute('href')).toMatch(/\/impact\/$/);
    });
  }

  test('no built page, the component gallery included, still has the sentence-case "Read the evidence"', () => {
    expect(listPages().filter((p) => readFileSync(p.file, 'utf8').includes('Read the evidence')).map((p) => p.route)).toEqual([]);
  });
});
