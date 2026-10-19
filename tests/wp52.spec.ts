import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { C14, EMPATHY, PROGRAM_SIZES_NOTE, VALUE_PROPOSITION, defineNewEarners } from '../src/data/copy';
import { timeline } from '../src/data/timeline';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP52 behaviors (the verified cycle-27 whole-site reviews, items 1-38): the employer track-record opener (Employers and JobReady@Work) without a speed comparison; JobReady@Campus's problem-band lead; the Local Partners
 * "Certified Facilitators and a Local Curriculum" card, "Monthly Reporting" block and challenge lead; the Governments delivery card, Her Power glance tile, contracts-table note, "Capacity Designed to Stay" card, closing call to action
 * (no repeated procurement point), Track Record band (no empathy line) and "Options" eyebrow; the Foundations cohort-grant lead; the About timeline, identity sentences, meta description and "Start a Conversation" band; Home's hero line,
 * slides 2, 4 and 5, "Progress You Can Check" card and AWS line; "surveyed new earners" defined where the 58.8% appears; the Development Partners glance (no ">4×" tile) and "Where They Work" card; YouthWIDE's hero label and
 * glance row; the Governance leadership card; the Our Model cards; the Programs hub lines; the evidence ladder's first row; the Impact title; the Investors Track Record band and the IN-05 label. Retrospective coverage (the owner
 * exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp52.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** The visible text of a built page's HTML (scripts, styles and the head dropped), for scans across every page. */
const visible = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/\s+/g, ' ');
const sitePages = () => listPages().filter((p) => !p.route.startsWith('/news/')).map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The routes of the built pages whose visible text contains any of these strings. */
const pagesWith = (...needles: string[]) => sitePages().filter((p) => needles.some((n) => visible(p.html).includes(n))).map((p) => p.route);

/** Everything in main, including answers inside closed FAQ accordions (innerText leaves those out). */
const everything = async (page: Page) => compact(await page.locator('main').evaluate((el) => el.textContent ?? ''));
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

const HOME = '';
const EMP = 'partner-with-us/employers/';
const WORK = 'programs/jobready-work/';
const CAMPUS = 'programs/jobready-campus/';
const LOCAL = 'partner-with-us/local-partners/';
const GOV = 'partner-with-us/governments/';
const FOUND = 'partner-with-us/foundations/';
const DP = 'partner-with-us/development-partners/';
const UNI = 'partner-with-us/universities/';
const INVEST = 'partner-with-us/investors/';
const ABOUT = 'about/';
const GOVERNANCE = 'about/governance/';
const YOUTHWIDE = 'programs/youthwide/';
const PROGRAMS = 'programs/';
const IMPACT = 'impact/';
const MODEL = 'our-model/';

test.describe('Employers and JobReady@Work: the track-record opener makes no speed comparison (item 1)', () => {
  // WP61 (cycle-33 reviews, GPT-6.1 Sol G2 and Kimi K1; flagged in many cycles): the line ("You have roles to fill and teams that need AI skills for their daily work.", EMPATHY.employers) is gone from both pages; the bands open with the origin line (Employers)
  // or the credentials list (JobReady@Work). The speed comparison it replaced in WP52 is still on no page (next test). tests/wp61.spec.ts holds the rest.
  const LINE = 'You have roles to fill and teams that need AI skills for their daily work.';

  test('neither page opens the band with the line any more, and EMPATHY has no employers key', async ({ page }) => {
    expect(Object.keys(EMPATHY)).not.toContain('employers');
    for (const route of [EMP, WORK]) {
      await open(page, route);
      await expect(page.locator('#guide p.lead'), route).toHaveCount(0);
      expect(compact(await page.locator('main').textContent()), route).not.toContain(LINE);
    }
    expect(pagesWith(LINE)).toEqual([]);
  });

  test('the earlier comparison ("faster than hiring or generic courses can supply them") is on no built page', () => {
    expect(pagesWith('faster than hiring', 'generic courses can supply')).toEqual([]);
  });
});

test.describe('JobReady@Campus: the problem band’s lead says what the program does for the students (item 2)', () => {
  const LEAD = 'Help students prepare for paid digital work and build placement evidence from your campus cohorts.';
  const HEADING = 'Capable Students Still Struggle to Find Work';

  test('the lead is the line (EMPATHY.universities), stated once; the heading speaks of students, not of the reader, and stays', async ({ page }) => {
    expect(EMPATHY.universities).toBe(LEAD);
    await open(page, CAMPUS);
    expect(compact(await page.locator('#problem .sh__lead').textContent())).toBe(LEAD);
    expect(compact(await page.locator('#problem h2').textContent())).toBe(HEADING);
    expect(HEADING).not.toMatch(/\byou(r|rs)?\b/i);
    expect(count(compact(await page.locator('main').evaluate((el) => el.textContent ?? '')), LEAD)).toBe(1);
  });

  test('the earlier lead ("... you are asked for placement results you cannot yet show.") is on no built page', () => {
    expect(pagesWith('You see capable students finish their degrees', 'placement results you cannot yet show')).toEqual([]);
  });
});

test.describe('Local Partners: what stays after funding, and what the monthly reports cover, are scoped (items 3 and 4)', () => {
  const CARD =
    'Certified-facilitator training, a localized curriculum and preparation for industry certification. You do not have to build the curriculum or certification route yourself.';
  const BLOCK = 'Where a funder is involved, monthly reports cover enrollment, completion, certification, placements and first earnings, as agreed in the program scope.';

  // WP60 (cycle-32 review, GPT-6.1 Sol G5): the card no longer says what remains after funding ends; the page’s funding-ends answer (Q10) says it, with the scope words, and still opens with them
  test('"Certified Facilitators and a Local Curriculum" is training, a localized curriculum and certification preparation; what remains after funding ends is the page’s funding-ends answer (Q10)', async ({ page }) => {
    await open(page, LOCAL);
    const card = page.locator('#features li', { has: page.locator('.card__title', { hasText: 'Certified Facilitators and a Local Curriculum' }) });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.card__text').textContent())).toBe(CARD);
    expect(await card.getAttribute('data-fact')).toBe('PD-06 PD-02');
    // Q10 ("What Happens When Funding Ends?") opens with the same scope words, and the page carries it
    expect(faqs.find((f) => f.id === 'Q10')!.a).toContain('Where included in the program scope, what the program builds stays in place: certified local facilitators and localized curricula');
    expect(compact(await page.locator('main').evaluate((el) => el.textContent ?? ''))).toContain('Where included in the program scope, what the program builds stays in place');
  });

  test('"Monthly Reporting" says what the reports cover, with the measures list as before, and scopes it; it no longer says a funder "sees" each measure "every month"', async ({ page }) => {
    await open(page, LOCAL);
    const block = page.locator('#mechanism li', { has: page.locator('.model__title', { hasText: 'Monthly Reporting' }) });
    await expect(block).toHaveCount(1);
    const text = compact(await block.locator('.model__text').textContent());
    expect(text).toBe(BLOCK);
    expect(text).toContain('enrollment, completion, certification, placements and first earnings');
    expect(text).not.toMatch(/every month|\bsees\b/);
    // the measures are the register's: PD-08 lists monthly reports of completion and certification, placements and first earnings
    expect(fact('PD-08').text).toContain('enrollment and attendance, completion and certification, placements and first earnings');
  });

  test('the earlier wording of both is on no built page', () => {
    expect(pagesWith('Local capacity stays after a funded cohort ends', 'it sees enrollment, completion, certification, placements and first earnings every month')).toEqual([]);
  });
});

test.describe('Governments: the delivery card scopes its reports and surveys; the Her Power tile names its program (items 4 and 5)', () => {
  const CARD = 'Placement support into local, remote and global work, with monthly reports to the agency and follow-up surveys at 3, 6 and 12 months after each course, as agreed in the program scope.';
  const BASE_OF_FIGURE = 'tracked women in work (47%), among the 2,500 women CodersTrust trained directly';

  test('"Placement and Monthly Reports" ends "..., as agreed in the program scope." and keeps the survey months', async ({ page }) => {
    await open(page, GOV);
    const card = page.locator('#mechanism .model__block', { hasText: 'Placement and Monthly Reports' });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.model__text').textContent())).toBe(CARD);
    expect(fact('PD-09').text).toContain('follow-up surveys at 3, 6 and 12 months');
  });

  test('the "372 of 800" tile reads "Her Power: ..." and the program’s other captions, and the register, are untouched', async ({ page }) => {
    await open(page, GOV);
    const tile = page.locator('#glance a[data-fact^="PR-05"]');
    await expect(tile).toHaveCount(1);
    expect(await tile.getAttribute('data-fact')).toBe('PR-05');
    expect(compact(await tile.locator('.pg__value').textContent())).toBe('372 of 800');
    expect(compact(await tile.locator('.pg__desc').textContent())).toBe(`Her Power: ${BASE_OF_FIGURE}`);
    // the register's own label is unchanged: the caption is derived from it
    expect(fact('PR-05').stat?.label).toBe('tracked women, from the 2,500 trained directly by CodersTrust, in work: 47%');
    // the case cards on the pages that list them sit under the program's name and keep the bare caption
    for (const route of ['partner-with-us/development-partners/', 'partner-with-us/foundations/']) {
      await open(page, route);
      const cards = (await texts(page, '#cases article')).join(' | ');
      expect(cards, route).toContain(`372 of 800 ${BASE_OF_FIGURE}`);
      expect(cards, route).not.toContain(`372 of 800 Her Power: ${BASE_OF_FIGURE}`);
    }
  });
});

test.describe('Foundations: the cohort-grant offer’s lead is the program-sizes note alone (item 6)', () => {
  test('the lead is the note; the platform-grant pointer is gone, and the platform-grant route is still on the page (the comparison row, its inquiry link, the #platform-grants passage after #cohort-grants)', async ({ page }) => {
    await open(page, FOUND);
    expect(compact(await page.locator('#cohort-grants .sh__lead').textContent())).toBe(PROGRAM_SIZES_NOTE);
    expect(pagesWith('Prefer to fund the platform', 'See JobReady Platform Grants below')).toEqual([]);
    // the target of the removed pointer and everything that names the route
    await expect(page.locator('#platform-grants')).toHaveCount(1);
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids.indexOf('platform-grants')).toBe(ids.indexOf('cohort-grants') + 1);
    expect(compact(await page.locator('#funding-routes tbody tr').nth(1).locator('th').textContent())).toBe('Funding Route 2 JobReady Platform Grants');
    expect((await texts(page, '#mechanism .fr__inquire a')).some((t) => t.includes('Discuss a JobReady Platform Grant'))).toBe(true);
    await expect(page.locator('#platform-grants .callout').first()).toContainText('A platform grant supports JobReady’s infrastructure and staged rollout, not cohorts.');
  });
});

test.describe('About: the 2025–2026 timeline entry is sentences, not a semicolon chain (item 7)', () => {
  const TEXT = 'JobReady rolls out in stages. YouthWIDE aims to train 2 million vulnerable youth in Bangladesh by 2030, depending on government and donor commitments; CodersTrust publishes Impact Survey 2026.';

  test('the last entry reads as above, from data/timeline.ts, under its unchanged heading, and cites the facts its sentences rest on (IN-02 is no longer among them)', async ({ page }) => {
    const last = timeline[timeline.length - 1];
    expect(last.title).toBe('JobReady, YouthWIDE and the Impact Survey');
    expect(last.text).toBe(TEXT);
    expect(last.factIds).toEqual(['IN-04', 'IN-01', 'OC-01']);
    await open(page, ABOUT);
    const item = page.locator('#story .timeline__item').last();
    expect(compact(await item.locator('.timeline__year').textContent())).toBe('2025–2026');
    expect(compact(await item.locator('.timeline__title').textContent())).toBe('JobReady, YouthWIDE and the Impact Survey');
    expect(compact(await item.locator('.timeline__text').textContent())).toBe(TEXT);
    expect(await item.getAttribute('data-fact')).toBe('IN-04 IN-01 OC-01');
  });

  test('every claim in the entry rests on the register: IN-04 (modules roll out in stages), IN-01 (2 million vulnerable youth in Bangladesh by 2030), OC-01 (the Impact Survey 2026 result)', () => {
    expect(fact('IN-04').text).toContain('Modules are rolling out in stages');
    expect(fact('IN-01').text).toContain('aims to train 2 million vulnerable youth');
    expect(fact('IN-01').text).toContain('by 2030');
    expect(fact('OC-01').text).toContain('October 2026 survey');
  });

  test('the earlier chain, and its fragment "; Impact Survey 2026.", are on no built page', () => {
    expect(pagesWith('JobReady platform rolls out in stages', 'lets funders deploy the CodersTrust model in a country', '; Impact Survey 2026.')).toEqual([]);
  });
});

// WP54 (cycle-28 reviews, Claude S23 and GLM L1): Home's survey slide no longer uses the term; its body line leads with the base in the words of OC-05's own text (tests/wp54.spec.ts). The Impact tile still defines the term where it uses it.
test.describe('"Surveyed new earners" is defined where the 58.8% appears: the Impact tile (item 8); Home’s survey slide names the subgroup in OC-05’s own words (WP54)', () => {
  const DEFINITION = '(completers who first earned during or after training)';
  // WP53 (owner decision 2026-10-16): the speed slide's tile caption became the survey slide's body line; WP54 (cycle-28 reviews, Claude S23 and GLM L1): the line leads with its base, in the words of OC-05's text
  const SLIDE_LINE = 'Of the 170 surveyed completers who first earned during or after training, 58.8% had started earning by six months after finishing the course.';
  const TILE_LABEL = `of the 170 surveyed new earners ${DEFINITION} had started earning by six months after finishing the course, including 23.5% who first earned during the course`;

  test('the survey slide’s body line names the subgroup in OC-05’s own words, so it needs no definition of the term', async ({ page }) => {
    expect(fact('OC-05').text.startsWith('Among the 170 surveyed completers who first earned during or after training: ')).toBe(true);
    expect(fact('OC-05').stat?.value).toBe('58.8%');
    await open(page, HOME);
    const s = slide(page, 3);
    await expect(s.locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    expect(await s.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
    expect(compact(await s.locator('.hs__lead').textContent())).toBe(SLIDE_LINE);
    await expect(s.locator('.hs__stat')).toHaveCount(1);
  });

  test('the Impact tile defines it too, from the register’s glance label', async ({ page }) => {
    expect(defineNewEarners(fact('OC-05').stat!.glance!.label)).toBe(TILE_LABEL);
    await open(page, IMPACT);
    const tile = page.locator('#glance a[data-fact~="OC-05"]');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.textContent())).toContain(TILE_LABEL);
  });

  test('the definition is the words of OC-05’s own text, the register’s labels are unchanged, and the Outcomes page keeps its short label beside its one definition', async ({ page }) => {
    const oc05 = fact('OC-05');
    expect(oc05.text).toContain('surveyed completers who first earned during or after training');
    expect(oc05.stat?.label).toBe('of the 170 surveyed new earners had started earning by six months after finishing the course (October 2026 survey)');
    expect(oc05.stat?.glance?.label).toBe('of the 170 surveyed new earners had started earning by six months after finishing the course, including 23.5% who first earned during the course');
    await open(page, 'impact/outcomes-2026/');
    expect(compact(await page.locator('#summary [data-fact="OC-05"]').textContent())).toContain(oc05.stat!.label);
    expect(count(await everything(page), 'Surveyed new earners are the completers who first earned during or after training.')).toBe(1);
  });

  test('the helper stops the build when its inputs change shape', () => {
    expect(() => defineNewEarners('of the 170 completers had started earning')).toThrow(/no longer says/);
  });

  // WP53 (owner decision 2026-10-16): the slide that states the 58.8% is the survey slide (slide 3)
  test('the survey slide (slide 3) still fits the carousel at 1280 and 390 (the unused-space budget is held by tests/hero-slider.spec.ts)', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      expect(await slide(page, 3).evaluate((e) => Math.round((e as HTMLElement).scrollHeight)), `${vp.width}px: slide 3 fits its track`).toBeLessThanOrEqual(track + 1);
    }
  });
});

test.describe('Home: the hero line has a subject (item 9)', () => {
  const HERO = 'We help educated, unemployed and underemployed youth reach paid digital work through training, mentoring and placement support.';

  test('"We help ...", read from VALUE_PROPOSITION.home; the H1 is unchanged and the earlier "Help ..." is on no built page', async ({ page }) => {
    expect(VALUE_PROPOSITION.home).toBe(HERO);
    await open(page, HOME);
    await expect(page.locator('.hh__lead')).toHaveText(HERO);
    await expect(page.locator('#hero h1')).toHaveText('Turn Youth Unemployment into a Digital Workforce — with Evidence');
    expect(pagesWith('Help educated, unemployed and underemployed youth')).toEqual([]);
  });
});

test.describe('Governments: the closing call to action does not repeat the procurement point (item 10)', () => {
  test('the call-to-action band has no urgency line, and no first-action strip closes the page', async ({ page }) => {
    await open(page, GOV);
    await expect(page.locator('#cta .cta-band__notes')).toHaveCount(0);
    expect(compact(await page.locator('#cta').textContent())).not.toMatch(/procurement/i);
    await expect(page.locator('#reinforce')).toHaveCount(0);
    const text = await everything(page);
    expect(text).not.toContain('Your agency’s procurement timeline sets the pace');
    expect(text).not.toContain('we start with a briefing that fits it');
    // the page still ends with its one primary action and the steps, then the shared page enhancements
    await expect(page.locator('#cta .btn--primary')).toHaveCount(1);
  });

  test('what remains: the FAQ answer and the two steps that name the agency’s own timeline (three mentions in all)', async ({ page }) => {
    await open(page, GOV);
    const text = await everything(page);
    expect(text).toContain('Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry.');
    const steps = compact(await page.locator('#next-steps').textContent());
    expect(steps).toContain('A briefing for your ministry or agency, shaped to its procurement timeline.');
    expect(steps).toContain('Scope and schedule follow the agency’s own procurement timeline.');
    expect(count(text, 'procurement')).toBe(3);
  });

  test('the shared variant (C14.variants.governments) still stands in YouthWIDE’s "What Happens Next"', async ({ page }) => {
    expect(C14.variants.governments).toBe('Your agency’s procurement timeline sets the pace; we start with a briefing.');
    await open(page, YOUTHWIDE);
    expect(await everything(page)).toContain(C14.variants.governments);
  });
});

test.describe('Governments: the contracts-table note excepts the Her Power figures and offers a briefing, not a request (items 11 and 37)', () => {
  const NOTE = 'Delivery status is confirmed for each contract in a briefing. Apart from the Her Power figures, scopes are contracted scopes of work, not delivered scale.';

  test('two sentences under the table; the screen-reader caption makes the same exception; "on request" is on no built page', async ({ page }) => {
    await open(page, GOV);
    expect(compact(await page.locator('#contracts .ct__notes').textContent())).toBe(NOTE);
    expect(await page.locator('#contracts .ct__notes p').getAttribute('data-fact')).toBe('GV-10');
    expect(compact(await page.locator('#contracts caption').textContent())).toBe('Six government contracts: what CodersTrust does under each and the training scope. Apart from the Her Power figures, counts are contract training scopes, not delivered scale.');
    expect(pagesWith('confirmed per contract on request')).toEqual([]);
    // the exception names figures that are in the table: Her Power’s first row has the delivered ones
    expect(compact(await page.locator('#contracts tbody tr').first().textContent())).toContain('CodersTrust trained 2,500 women directly.');
  });
});

test.describe('"Capacity Designed to Stay" (item 12)', () => {
  // WP60 (cycle-32 review, Claude S6): the Governments delivery card is "Trainers and Curriculum" (it was "Capacity Designed to Stay", one phrase from the benefit card "Capacity Designed to Stay in Your System"); the Campus vignette keeps its heading (tests/wp60.spec.ts)
  test('the Governments delivery card is "Trainers and Curriculum" and the Campus vignette says "Capacity Designed to Stay on Campus"; "Capacity That Stays" is on no built page', async ({ page }) => {
    await open(page, GOV);
    await expect(page.locator('#mechanism .model__title', { hasText: /^Trainers and Curriculum$/ })).toHaveCount(1);
    await expect(page.locator('#mechanism .model__title', { hasText: /^Capacity Designed to Stay$/ })).toHaveCount(0);
    await open(page, CAMPUS);
    expect(await everything(page)).toContain('Capacity Designed to Stay on Campus');
    expect(pagesWith('Capacity That Stays')).toEqual([]);
  });
});

test.describe('Governance: the Leadership card names each leader’s own organization (item 13)', () => {
  test('"The Chairman, Aziz Ahmad, leads CodersTrust. Md. Shamsul Haque leads CodersTrust Bangladesh."; its link to the leadership section stays', async ({ page }) => {
    await open(page, GOVERNANCE);
    const card = page.locator('#contracting .cp__item', { has: page.locator('h3', { hasText: 'Leadership' }) });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.cp__text').textContent())).toBe('The Chairman, Aziz Ahmad, leads CodersTrust. Md. Shamsul Haque leads CodersTrust Bangladesh.');
    expect(await card.getAttribute('data-fact')).toBe('ID-03');
    const link = card.locator('a.cp__link');
    expect(compact(await link.textContent())).toBe('Who Leads CodersTrust');
    await expect(page.locator((await link.getAttribute('href')) ?? '#missing')).toHaveCount(1);
    expect(pagesWith('lead the organization')).toEqual([]);
  });
});

test.describe('About: the identity sentences sit directly under the lede (item 14), the closing band is "Start a Conversation" (item 22) and the meta description names the underemployed (item 27)', () => {
  const IDENTITY = fact('ID-11').text;
  // WP57b (cycle-29 review, GLM L8): the page prints ID-11 with its last sentence as "Additional country and regional offices are planned." (the register entry is unchanged; tests/wp57b.spec.ts)
  const SHOWN = IDENTITY.replace(' are planned in the next few years.', ' are planned.');

  test('the three sentences of ID-11 are the first thing under the hero lede, once on the page, and "Where We Are Today" holds the figures alone', async ({ page }) => {
    expect(IDENTITY).toBe('CodersTrust is headquartered in New York, and its parent organization is CT USA, Inc. CodersTrust Bangladesh (CodersTrust Bangladesh Ltd.) is a country office. Additional country and regional offices are planned in the next few years.');
    expect(SHOWN).toBe('CodersTrust is headquartered in New York, and its parent organization is CT USA, Inc. CodersTrust Bangladesh (CodersTrust Bangladesh Ltd.) is a country office. Additional country and regional offices are planned.');
    await open(page, ABOUT);
    await expect(page.locator('main [data-fact="ID-11"]')).toHaveCount(1);
    await expect(page.locator('.hero__copy > .hero__lead + .about-identity')).toHaveCount(1);
    expect(compact(await page.locator('.hero__copy > .about-identity').textContent())).toBe(SHOWN);
    await expect(page.locator('#glance [data-fact="ID-11"]')).toHaveCount(0);
    await expect(page.locator('#glance .lead')).toHaveCount(0);
    expect(count(await everything(page), 'CT USA, Inc.')).toBe(1);
    // the lede above it is ID-01, and the hero keeps its one text link and no primary button
    expect(compact(await page.locator('.hero__copy > .hero__lead').textContent())).toBe(fact('ID-01').text);
    await expect(page.locator('main .hero .btn--primary')).toHaveCount(0);
  });

  test('it is set like the lede (same size, color and measure) and wraps without sideways scroll at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, ABOUT);
      const styles = await page.evaluate(() => {
        const s = (sel: string) => {
          const cs = getComputedStyle(document.querySelector(sel)!);
          return { size: cs.fontSize, color: cs.color, max: cs.maxWidth };
        };
        return { lead: s('.hero__copy > .hero__lead'), identity: s('.hero__copy > .about-identity') };
      });
      expect(styles.identity.size, `${vp.width}px`).toBe(styles.lead.size);
      expect(styles.identity.color, `${vp.width}px`).toBe(styles.lead.color);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  test('the closing band and its "On This Page" entry read "Start a Conversation", keep the id #about-cta and open it; the team page keeps "Talk to the Team"', async ({ page }) => {
    await open(page, ABOUT);
    expect(compact(await page.locator('#about-cta h2').textContent())).toBe('Start a Conversation');
    const link = page.locator('nav[aria-label="On this page"] a', { hasText: 'Start a Conversation' });
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toMatch(/#about-cta$/);
    expect(await texts(page, 'nav[aria-label="On this page"] a')).not.toContain('Talk to the Team');
    await link.click();
    await expect(page).toHaveURL(/#about-cta$/);
    await expect(page.locator('#about-cta-h')).toBeInViewport();
    await open(page, 'about/team/');
    expect(compact(await page.locator('#team-cta h2').textContent())).toBe('Talk to the Team');
  });

  test('the meta description is 154 characters, within the limit of 155, with the register’s year and count, and names the underemployed (also in og:description)', async ({ page }) => {
    await open(page, ABOUT);
    const D = 'Since 2014, New York-headquartered CodersTrust has trained unemployed and underemployed youth for digital work, with work in 16 countries and territories.';
    expect(D.length).toBe(154);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe(D);
    expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(D);
    expect(fact('SC-03').stat?.value).toBe('16'); // WP55 (owner decision 2026-10-18): 17, with Egypt and Benin added; WP56 (owner decision 2026-10-18): 16, with Somalia merged into Somaliland
    expect(fact('ID-02').stat?.value).toBe('2014');
  });
});

test.describe('YouthWIDE: the briefing link names its audience (item 15) and the glance row is plain about Bangladesh (item 16)', () => {
  test('the hero keeps its one primary button, "Request a Discovery Session", and the text link reads "Governments: Request a Briefing for Your Ministry" (the label outside the link)', async ({ page }) => {
    await open(page, YOUTHWIDE);
    const hero = page.locator('#hero');
    await expect(hero.locator('.btn--primary')).toHaveCount(1);
    expect(compact(await hero.locator('.btn--primary').textContent())).toMatch(/^Request a Discovery Session\b/);
    const route = hero.locator('nav.routes .route');
    await expect(route).toHaveCount(1);
    expect(compact(await route.textContent())).toBe('Governments: Request a Briefing for Your Ministry');
    expect(compact(await route.locator('a.link').textContent())).toBe('Request a Briefing for Your Ministry');
    expect(((await route.locator('a.link').getAttribute('href')) ?? '').startsWith('mailto:')).toBe(true);
  });

  test('the first glance row says "Bangladesh is where most delivery has been", IN-02 says it the same way and keeps its outcome-evidence clause; "reference implementation" is on no built page', async ({ page }) => {
    expect(fact('IN-02').text.endsWith('current outcome evidence comes from Bangladesh and Kosovo, with Bangladesh where most delivery has been')).toBe(true);
    await open(page, YOUTHWIDE);
    expect(compact(await page.locator('#program-glance .pg__row').first().textContent())).toContain(
      'South Asia, the Middle East and North Africa, and Sub-Saharan Africa, as co-funded country cohorts. Bangladesh is where most delivery has been, with an initiative of its own that aims to train 2 million vulnerable youth by 2030, depending on government and donor commitments.',
    );
    // WP53 (owner follow-up, 2026-10-16): the Bangladesh band’s heading had kept "Reference Country", the jargon this item removed from the glance row; it is "Bangladesh: Delivery Base and 2030 Aim" (tests/wp53.spec.ts)
    await expect(page.locator('section#governments').getByRole('heading', { level: 2 })).toHaveText('Bangladesh: Delivery Base and 2030 Aim');
    expect(pagesWith('reference implementation')).toEqual([]);
    // the YouthWIDE service node in the page’s JSON-LD carries IN-02’s text
    const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blobs.join(' ')).toContain('with Bangladesh where most delivery has been');
  });
});

test.describe('Home: slide 2 is plain sentences (items 17 and 25; four since WP60) and slide 4 reads "Four delivered programs" with an unambiguous Her Power line (items 20 and 33)', () => {
  // WP57 (cycle-29 review, Grok R2): the second sentence is the note's WP35 wording ("The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly).")
  // WP60 (cycle-32 review, GPT-6.1 Sol G1): the slide said "... work scoped for 30,000+ people, not a count of completers. This includes Her Power’s national program: 25,125 women trained nationally, 2,500 directly by CodersTrust. CodersTrust is also the official training partner of ... onboarding 1.5M+ learners. They are National University’s own learners, ..."
  // WP61 (cycle-33 review, GPT-6.1 Sol G1): three sentences: "... work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly. As National University’s official training partner for ..., CodersTrust is onboarding 1.5M+ learners, the university’s own learners, ..." (tests/wp61.spec.ts)
  test('slide 2: "... work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly. As National University’s official training partner for ..."', async ({ page }) => {
    await open(page, HOME);
    expect(compact(await slide(page, 2).locator('.hs__lead').textContent())).toBe(
      'Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly. As National University’s official training partner for digital career skills and credentials, CodersTrust is onboarding 1.5M+ learners, the university’s own learners, not learners trained by CodersTrust.',
    );
    expect(await slide(page, 2).locator('.hs__lead').getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
  });

  test('slide 4: "Four delivered programs, with results from each program’s records." and Her Power’s line ends "... tracked women in work; 2,500 trained directly." (one line at 1280, read from PR-05)', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HOME);
    // WP57b (cycle-29 review, GLM L3): "Four delivered programs, with results from each program’s records." (it said "..., each with its partner, with results from their own records.")
    await expect(slide(page, 4).locator('.hs__lead')).toHaveText('Four delivered programs, with results from each program’s records.');
    const lines = slide(page, 4).locator('.hs__lines li');
    await expect(lines.nth(3)).toHaveText('Her Power: 372 of 800 tracked in work (47%); 2,500 trained directly.');
    expect(await lines.nth(3).getAttribute('data-fact')).toBe('PR-05');
    expect(fact('PR-05').stat?.label).toBe('tracked women, from the 2,500 trained directly by CodersTrust, in work: 47%');
    const heights = await lines.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(heights[3], 'the Her Power line wraps').toBe(heights[0]);
    expect(pagesWith('Four programs, each with its partner', 'in work (2,500 trained directly)')).toEqual([]);
  });

  // WP53 (owner decision 2026-10-16): the carousel is four slides; the slide that had been the fifth (the speed slide) is the survey slide's body line now (slide 3)
  test('slides 2, 3 and 4 fit the carousel at 1280 and 390, and the page does not scroll sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, HOME);
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      for (const n of [2, 3, 4]) expect(await slide(page, n).evaluate((e) => Math.round((e as HTMLElement).scrollHeight)), `${vp.width}px: slide ${n} fits its track`).toBeLessThanOrEqual(track + 1);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Home: "Progress You Can Check" promises reports (item 36) and the recognition band gives the AWS item its line (item 24)', () => {
  test('"Monthly reports will show progress toward paid work, as agreed in the program scope."', async ({ page }) => {
    await open(page, HOME);
    expect(compact(await page.locator('#features .card__text').nth(1).textContent())).toBe('Monthly reports will show progress toward paid work, as agreed in the program scope.');
    expect(pagesWith('Monthly reports show progress toward paid work')).toEqual([]);
  });

  test('every badge has a line under its title; the AWS one is "CodersTrust is an AWS Authorized Training Partner." (PA-06)', async ({ page }) => {
    await open(page, HOME);
    const badges = page.locator('#recognition .rec__badge');
    await expect(badges).toHaveCount(3);
    for (let i = 0; i < 3; i++) await expect(badges.nth(i).locator('.rec__badge-text'), `badge ${i + 1}`).toHaveCount(1);
    const aws = page.locator('#recognition .rec__badge[data-fact="PA-06"]');
    expect(compact(await aws.locator('.rec__badge-title').textContent())).toBe('AWS Authorized Training Partner');
    expect(compact(await aws.locator('.rec__badge-text').textContent())).toBe('CodersTrust is an AWS Authorized Training Partner.');
    expect(fact('PA-06').text).toBe('AWS Authorized Training Partner');
  });
});

test.describe('Local Partners: the challenge lead begins "Pair your community reach" (item 18)', () => {
  test('"Pair your community reach with CodersTrust’s curriculum, mentoring, placement support and reporting."', async ({ page }) => {
    await open(page, LOCAL);
    expect(compact(await page.locator('#problem .sh__lead').textContent())).toBe('Pair your community reach with CodersTrust’s curriculum, mentoring, placement support and reporting.');
    await expect(page.locator('#problem h2')).toHaveText('Connect Your Community to Paid Digital Work');
  });
});

test.describe('Our Model: the readiness assessment promises no quantity (item 19) and lessons "work over" 1.5 Mbps (item 26)', () => {
  test('the two card sentences read as below; the register’s PD-14 and PD-07 wording and the placement-support list are unchanged', async ({ page }) => {
    await open(page, MODEL);
    const text = await everything(page);
    expect(text).toContain('Tests and an interview route applicants to a career track or a foundation track. Some applicants may not be selected, and the reasons are reported.');
    expect(text).toContain('Lessons work over a 1.5 Mbps connection, and 720p lessons can be downloaded for offline viewing.');
    expect(text).toContain('Support includes assessment-based career advising, resume writing, job-application and interview preparation, industry internships and apprenticeships, job fairs, employer matching and freelance-marketplace onboarding.');
    expect(text).not.toContain('A small number may not be selected');
    expect(text).not.toContain('Lessons run on a 1.5 Mbps connection');
    expect(fact('PD-14').text).toContain('a small number of applicants may not be selected, and the reasons are reported');
  });
});

test.describe('Development Partners: the glance is three tiles and the +10.3 tile carries the benchmark (item 21); the "Where They Work" card uses the usual wording (item 29); the offer eyebrow is "Options" (item 32)', () => {
  test('the ">4×" tile is gone; the +10.3 tile’s note is RC-06a’s comparison, its data-fact lists both facts, and the 10.3 is stated once', async ({ page }) => {
    await open(page, DP);
    const tiles = page.locator('#glance .pg__lead > li');
    await expect(tiles).toHaveCount(3);
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-02', 'OC-01', 'PR-03']);
    await expect(page.locator('#glance .pg__more')).toHaveCount(0);
    const first = page.locator('#glance .pg__lead a').first();
    expect(await first.getAttribute('data-fact')).toBe('RC-02 RC-06a');
    expect(compact(await first.locator('.pg__note').textContent())).toBe('More than four times the 2.3-point average across nine vocational-training trials.');
    expect(fact('RC-06a').stat?.glance?.label).toMatch(/more than four times the 2\.3-point average across nine vocational-training trials$/);
    expect(count(compact(await page.locator('#glance').textContent()), '10.3')).toBe(1);
    expect(compact(await page.locator('#glance').textContent())).not.toContain('>4×');
  });

  test('the three tiles sit in one row from 720 px up and stack on a phone, with no sideways scroll', async ({ page }) => {
    await open(page, DP);
    const tops = () => page.locator('#glance .pg__lead > li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    await page.setViewportSize(DESKTOP);
    expect(new Set(await tops()).size, 'one row at 1280').toBe(1);
    await page.setViewportSize({ width: 768, height: 900 });
    expect(new Set(await tops()).size, 'one row at 768').toBe(1);
    await page.setViewportSize(MOBILE);
    expect(new Set(await tops()).size, 'three rows at 390').toBe(3);
    expect(await noOverflow(page)).toBe(true);
  });

  test('Foundations and Governments never showed the ">4×" tile and still have their four; Home’s first slide keeps its own', async ({ page }) => {
    for (const [route, ids] of [
      [FOUND, ['RC-02', 'OC-03', 'PR-02', 'PR-01']], // WP62 (cycle-34 review): the WSDFM program record is the fourth tile (the +$27 tile left)
      [GOV, ['RC-02', 'PR-05', 'PR-02', 'GV-12']], // WP61 (cycle-33 review, GLM L5): the contract scope is the fourth tile, after the results
    ] as const) {
      await open(page, route);
      expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0])), route).toEqual(ids);
    }
    await open(page, HOME);
    expect(compact(await slide(page, 1).locator('.hs__proof').textContent())).toContain('>4×');
  });

  // WP53 (owner follow-up, 2026-10-16): the card said "local, remote and global work" in its title and again in its text; the text is "Placement support and outcome tracking for 12 months after each course." (tests/wp53.spec.ts)
  test('"Placement support and outcome tracking for 12 months after each course." (the title says "local, remote and global work" once)', async ({ page }) => {
    await open(page, DP);
    const card = page.locator('#mechanism li', { has: page.locator('.model__title', { hasText: 'Local, Remote and Global Work' }) });
    expect(compact(await card.locator('.model__text').textContent())).toBe('Placement support and outcome tracking for 12 months after each course.');
    expect(pagesWith('local, remote, overseas and freelance work')).toEqual([]);
  });

  // WP57 (cycle-29 review, Grok R5): Universities' band is one line and has no eyebrow ("Options" named size cards it no longer has); Governments and Development Partners keep the pair
  test('"Choose Where to Start" has the eyebrow "Options" on Governments and Development Partners (the same pair); Universities has none; Employers and Foundations keep theirs', async ({ page }) => {
    for (const route of [GOV, DP]) {
      await open(page, route);
      expect(compact(await page.locator('#offer .sh .eyebrow').textContent()), route).toBe('Options');
      await expect(page.locator('#offer h2'), route).toHaveText('Choose Where to Start');
    }
    await open(page, UNI);
    await expect(page.locator('#offer h2')).toHaveText('Choose Where to Start');
    await expect(page.locator('#offer .sh .eyebrow')).toHaveCount(0);
    await open(page, EMP);
    expect(compact(await page.locator('#offer .sh .eyebrow').textContent())).toBe('Start');
    await open(page, FOUND);
    expect(compact(await page.locator('#cohort-grants .sh .eyebrow').textContent())).toBe('Funding Route 1 · YouthWIDE Cohort Grants');
  });
});

test.describe('The Track Record bands of Governments and Investors start with their record (items 34 and 35)', () => {
  test('Governments: the band opens with the origin line, there is no empathy line and no EMPATHY key for it', async ({ page }) => {
    expect(Object.keys(EMPATHY)).not.toContain('governments');
    await open(page, GOV);
    await expect(page.locator('#guide p.lead')).toHaveCount(0);
    expect(compact(await page.locator('#guide .pg__copy > :first-child').textContent())).toBe('Since 2014, from a Copenhagen launch to work in 16 countries and territories.');
    await expect(page.locator('#guide h2')).toHaveText('We’ve Built This Path Since 2014');
  });

  test('Investors: after the eyebrow and heading the band opens with the origin line; no empathy line and no EMPATHY key for it', async ({ page }) => {
    expect(Object.keys(EMPATHY)).not.toContain('investors');
    await open(page, INVEST);
    await expect(page.locator('#guide .ig__empathy')).toHaveCount(0);
    const kids = await page.locator('#guide .ig__copy').first().evaluate((el) => Array.from(el.children).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()));
    expect(kids.slice(0, 3)).toEqual(['Our Track Record', 'A Record Built Since 2014', 'Since 2014, from a Copenhagen launch to work in 16 countries and territories.']);
    expect(pagesWith('Impact investors need to see what is proven')).toEqual([]);
  });

  // WP61 (cycle-33 reviews, GPT-6.1 Sol G2 and Kimi K1): Employers and JobReady@Work have none either
  test('the remaining empathy lines are the JobReady@Campus and NU lines', () => {
    expect(Object.keys(EMPATHY).sort()).toEqual(['nuPgd', 'universities']);
  });
});

test.describe('Investors: IN-05 aims to have learners "on the platform" (item 23)', () => {
  test('the stat label reads as below on the vision band; the glance label and the value are unchanged', async ({ page }) => {
    const in05 = fact('IN-05');
    expect(in05.stat?.label).toBe('learners and professionals JobReady aims to have on the platform by the fiscal year ending June 30, 2032');
    expect(in05.stat?.glance?.label).toBe('Aim: learners and professionals on JobReady by June 30, 2032');
    expect(in05.stat?.value).toBe('3M+');
    await open(page, INVEST);
    expect(compact(await page.locator('#vision .factstat').textContent())).toContain(in05.stat!.label);
    expect(pagesWith('targeted on JobReady')).toEqual([]);
    await open(page, IMPACT);
    expect(compact(await page.locator('#heading a[data-fact~="IN-05"]').textContent())).toContain(in05.stat!.glance!.label);
  });
});

test.describe('The Programs hub lines (items 28 and 30)', () => {
  test('YouthWIDE’s "In Practice" line promises reports on progress toward paid work; JobReady@Work offers "a route to hire job-ready talent"', async ({ page }) => {
    await open(page, PROGRAMS);
    const text = await everything(page);
    expect(text).toContain('Ministries can follow phased delivery from training to paid work, and funders get monthly reports on progress toward paid work, not only enrollment.');
    expect(text).toContain('Corporate training custom-developed for each organization, plus a route to hire job-ready talent.');
    expect(pagesWith('monthly reports on paid-work outcomes', 'plus access to job-ready talent')).toEqual([]);
  });
});

test.describe('Impact: the evidence ladder’s first row and the page title (items 31 and 38)', () => {
  test('row 1 "What It Shows": "The effect of CodersTrust’s predecessor WSDFM program on women in Dhaka, evaluated by the BRAC Institute ..." (the institute’s name stays)', async ({ page }) => {
    await open(page, IMPACT);
    const shows = compact(await page.locator('#evidence-ladder tbody tr').first().locator('td[data-label="What It Shows"]').textContent());
    expect(shows).toBe('The effect of CodersTrust’s predecessor WSDFM program on women in Dhaka, evaluated by the BRAC Institute of Governance and Development against a randomly chosen control group.');
    expect(pagesWith('The effect of one CodersTrust program (WSDFM)')).toEqual([]);
  });

  test('the title is "Impact You Can Verify | CodersTrust", the H1’s words, within the 60-character limit', async ({ page }) => {
    await open(page, IMPACT);
    await expect(page).toHaveTitle('Impact You Can Verify | CodersTrust');
    expect('Impact You Can Verify | CodersTrust'.length).toBeLessThanOrEqual(60);
    await expect(page.locator('h1')).toHaveText('Impact You Can Verify');
    expect(await page.locator('meta[property="og:title"]').getAttribute('content')).toBe('Impact You Can Verify | CodersTrust');
    expect(pagesWith('Impact and Evidence You Can Verify')).toEqual([]);
  });
});

test.describe('The changed pages do not scroll sideways', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of [HOME, EMP, WORK, CAMPUS, LOCAL, GOV, FOUND, DP, UNI, INVEST, ABOUT, GOVERNANCE, YOUTHWIDE, PROGRAMS, IMPACT, MODEL]) {
        await open(page, route);
        expect(await noOverflow(page), `${route || 'home'} at ${vp.width}px`).toBe(true);
      }
    });
  }
});
