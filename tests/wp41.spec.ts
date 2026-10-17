import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP41 behaviors (cycle-18 whole-site reviews, GPT-6.1 Sol and GLM 5.3): YouthWIDE's "What Success Looks Like" band is about young people earning, the partner hub's cost answer and Home's "What a Supported Youth Cohort
 * Includes" say the standard inclusions are for supported youth cohorts, Investors' "Four Kinds of Institutional Relationship", the Programs hub states the trial as one line, the JobReady Platform's status question points to
 * "Rollout Status", JobReady@Campus' hero lead and mechanism wording, "resume" for "CV", Home's speed (now slide 5) and government (now slide 2) slide headings and meta description, the Governments contracts table with short scope phrases, Employers' Track Record
 * band and "AI Is Reshaping the Workforce" card, Our Model's problem figure in its registered wording, and the Outcomes 2026 heading. Retrospective coverage (the owner exempted this project from test-first work); each test states
 * one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp41.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
/** An href as rendered ("/ctg/our-model/") without the staging base, so the test does not depend on it. */
const sitePath = (href: string) => href.replace(/^\/ctg(?=\/)/, '');
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z“])/);

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



// WP48 (cycle-23 review, consistent with the owner decision of 2026-10-15): YouthWIDE's "What Success Looks Like" band (#future, "Young People Earning, Locally and Globally") is gone; Home carries the shared Imagine band (tests/wp48.spec.ts).
// The reporting that band once explained stays in the glance's Reporting row and the C8 cards.
test.describe('YouthWIDE: no "What Success Looks Like" band (item 1; WP48: the band is gone)', () => {
  test('the page has no #future band, none of its headings or vignettes, and none of the old reporting vignettes; the glance and the C8 cards carry the reporting', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#future')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/What Success Looks Like|Young People Earning, Locally and Globally|Earning from a Job|Earning from Freelance Clients|Earning from Their Own Business|Illustrative: imagine/);
    expect(text).not.toMatch(/Reports That Show Who Started Earning|Monthly Reports Your Board or Agency Can Read|See Who Started Earning|Evidence Your Evaluators Can Check/);
    expect(await texts(page, '#program-glance dt')).toEqual(expect.arrayContaining(['Reporting']));
  });

  test('"Our Track Record" (#guide) is followed by the delivery model (#mechanism): the credibility comes straight before the mechanism', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids.indexOf('mechanism')).toBe(ids.indexOf('guide') + 1);
  });
});

test.describe('"What Does It Cost?" and Home’s inclusions heading: standard inclusions are for supported youth cohorts (item 2)', () => {
  // WP43 (cycle-20 review): the answer is three shorter sentences; the inclusions are still said for "Supported youth cohorts" ("include ..."), and the separately budgeted items stay
  const COST =
    'Pricing is set per program; we share an indicative budget in the discovery session. Supported youth cohorts include outreach and selection, training, certification exam preparation and the exam fee, three months of mentoring, placement support and 12 months of outcome tracking after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where needed.';

  test('the partner hub FAQ says it for supported youth cohorts, in three sentences, and the FAQ JSON-LD says the same words', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const item = page.locator('#faqs details', { has: page.locator('summary', { hasText: 'What Does It Cost?' }) });
    const answer = compact(await item.locator('.faq__a').textContent());
    expect(answer).toBe(COST);
    expect(sentences(answer)).toHaveLength(3);
    expect((await faqJsonLd(page)).find((q) => q.name === 'What Does It Cost?')?.text).toBe(COST);
  });

  test('the full answer is on the hub only: route pages keep their one line and their own variants', async ({ page }) => {
    for (const route of ['partner-with-us/governments/', 'partner-with-us/development-partners/', 'partner-with-us/foundations/', 'partner-with-us/universities/']) {
      await open(page, route);
      expect(await mainText(page), route).not.toMatch(/standard inclusions are outreach and selection|Supported youth cohorts include (outreach and selection, )?training/);
    }
    await open(page, 'partner-with-us/employers/');
    expect(await mainText(page)).toContain('Standard inclusions are a needs assessment, a customized curriculum');
  });

  test('Home’s band is headed "What a Supported Youth Cohort Includes" (Title Case) and keeps its id and its three cards', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('section#features')).toHaveCount(1);
    await expect(page.locator('#features h2')).toHaveText('What a Supported Youth Cohort Includes');
    expect('What a Supported Youth Cohort Includes').toBe(titleCase('What a Supported Youth Cohort Includes'));
    await expect(page.locator('#features li.card')).toHaveCount(3);
    expect(await mainText(page)).not.toContain('What Your Partnership Includes');
  });
});

// WP43 (cycle-20 review): the heading "Four Kinds of Institutional Relationship" and the four lists under it are gone; the institutions are one paragraph by type (tests/wp43.spec.ts). What this test still holds: the band does not
// talk about distribution (WP41: that read as platform distribution channels), and the paragraph rests on the same four register facts the four lists did.
test.describe('Investors: the track-record band names relationships, not distribution (item 3)', () => {
  test('the paragraph that names the institutions rests on PA-02, PA-01, PA-05 and PA-03, and no heading or text says "distribution"', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(await page.locator('#guide .ig__names').getAttribute('data-fact')).toBe('PA-02 PA-01 PA-05 PA-03');
    await expect(page.locator('#guide .ig__channels')).toHaveCount(0);
    expect(await mainText(page)).not.toMatch(/Distribution Through|Four Kinds of Institutional Relationship/);
    expect(await texts(page, '#guide h2, #guide h3')).toEqual(['A Record Built Since 2014', 'Delivered Since 2014']);
  });
});

test.describe('Programs hub: the trial is one line (item 4)', () => {
  const points = fact('RC-02').stat!.value.replace(/^\+/, '').replace(/ pp$/, ' percentage points');
  const LINE = `Women offered a place in the predecessor WSDFM program were ${points} more likely to be employed than the control group.`;

  test('under "An Independent Randomized Trial" there is the one line, read from RC-02 and RC-01, and nothing else of the trial: no prose paragraph, no +10.3 pp tile, no chart', async ({ page }) => {
    await open(page, 'programs/');
    const band = page.locator('#proof-band');
    await expect(band.locator('h2')).toHaveText('Trial and Survey Evidence');
    expect(await texts(page, '#proof-band h3')).toEqual(['An Independent Randomized Trial', 'From the October 2026 Survey']);
    await expect(band.locator('.eb__headline')).toHaveCount(1);
    await expect(band.locator('.eb__headline')).toHaveText(LINE);
    expect(await band.locator('.eb__headline').getAttribute('data-fact')).toBe('RC-01 RC-02');
    expect(points).toBe('10.3 percentage points');
    await expect(band.locator('svg[role="img"], .ba, [data-plain-line]')).toHaveCount(0);
    const text = compact(await band.textContent());
    expect(count(text, '10.3'), 'the effect is stated once').toBe(1);
    expect(text).not.toMatch(/\+10\.3|For every 100 women|Trial figures are for a predecessor program|Chart data/);
  });

  test('the survey tile stays (77.9%, without its detail line) and the two links stay; the band is one column', async ({ page }) => {
    await open(page, 'programs/');
    const tiles = page.locator('#proof-band .eb__stat');
    await expect(tiles).toHaveCount(1);
    expect(await tiles.first().getAttribute('data-fact')).toBe('OC-01');
    expect(compact(await tiles.first().textContent())).toContain('77.9%');
    expect(compact(await tiles.first().textContent())).not.toContain('no longer employed');
    expect(await texts(page, '#proof-band .eb__links a')).toEqual(['See the Evidence', 'The Randomized Trial']);
    expect((await hrefs(page, '#proof-band .eb__links a')).map(sitePath)).toEqual(['/impact/', '/impact/independent-evaluation/']);
    await expect(page.locator('#proof-band .eb--single')).toHaveCount(1);
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids.indexOf('reach')).toBe(ids.indexOf('proof-band') + 1);
  });

  test('YouthWIDE’s evidence band is unchanged: the single trial sentence, the tiles and the chart', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#proof-band .eb__headline')).toHaveCount(1);
    await expect(page.locator('#proof-band .eb__stat')).toHaveCount(2);
    await expect(page.locator('#proof-band svg[role="img"]').first()).toBeVisible();
    await expect(page.locator('#proof-band .eb--single')).toHaveCount(0);
  });
});

test.describe('JobReady Platform: the status question points to "Rollout Status" (item 5)', () => {
  const ANSWER = 'Partly. See Rollout Status above for live, pre-launch and planned capabilities.';

  test('the answer is one short pair of sentences, "Rollout Status" is a link to the rollout band, and the FAQ JSON-LD says the same words', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: 'Is the JobReady Platform Live?' }) });
    expect(compact(await item.locator('.faq__a').textContent())).toBe(ANSWER);
    const link = item.locator('.faq__a a');
    await expect(link).toHaveText('Rollout Status');
    expect(await link.getAttribute('href')).toBe('#status');
    await expect(page.locator('section#status h2')).toHaveText('Rollout Status');
    expect((await faqJsonLd(page)).find((q) => q.name === 'Is the JobReady Platform Live?')?.text).toBe(ANSWER);
    expect(await item.locator('.faq__a p').getAttribute('data-fact')).toBe('IN-04');
  });

  test('the link reaches the band; the shared answer is unchanged where it is asked elsewhere (Employers)', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    await page.locator('#faq .faq__a a', { hasText: 'Rollout Status' }).click();
    await expect(page).toHaveURL(/#status$/);
    await open(page, 'partner-with-us/employers/');
    const answer = compact(await page.locator('#faq details', { has: page.locator('summary', { hasText: 'Is the JobReady Platform Live?' }) }).locator('.faq__a').textContent());
    // WP48 (cycle-23 review): the shared answer names the live modules a partner or employer deals with, not the internal tooling (tests/wp48.spec.ts)
    expect(answer).toContain('Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.');
  });

  test('the page carries today’s date, the day its wording changed', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    expect(compact(await page.locator('.lf-updated').textContent())).toBe('Last updated October 15, 2026');
  });
});

test.describe('JobReady@Campus: hero lead and mechanism wording (items 6 and 8)', () => {
  test('the hero lead speaks to the institution in two short sentences; the mechanism says "toward paid work"', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    await expect(page.locator('#hero .hero__lead, .hero__lead').first()).toHaveText(
      'Run mentored, certification-focused training in your campus labs alongside academic studies. Prepare students for paid digital work and build placement evidence from your own cohorts.',
    );
    const mechanism = compact(await page.locator('#mechanism').textContent());
    expect(mechanism).toContain('Freelance, Local, Remote and Overseas Work');
    expect(mechanism).toContain('Mentoring and placement support toward paid work.');
    expect(mechanism).not.toContain('lead into work');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toContain('mentored, certification-focused training in campus labs');
    expect(description.length).toBeLessThanOrEqual(155);
  });
});

test.describe('American English: "resume", not "CV" (item 7)', () => {
  test('Our Model’s placement-support card, the register line behind it, Careers and the application email say "resume"', async ({ page }) => {
    expect(fact('PD-15').text).toContain('assessment-based career advising, resume writing, job-application');
    await open(page, 'our-model/');
    const card = compact(await page.locator('[data-fact="PD-15"]').first().textContent());
    expect(card).toContain('resume writing');
    expect(card).not.toContain('CV');
    await open(page, 'careers/');
    const apply = compact(await page.locator('#apply').textContent());
    expect(apply).toContain('Send your resume. We keep it on file for when a role opens.');
    expect(apply).toContain('you can also send your resume to that address yourself');
    const mailto = decodeURIComponent((await page.locator('main a[href^="mailto:"]').first().getAttribute('href')) ?? '');
    expect(mailto).toContain('Link to your resume or portfolio');
    expect(mailto).not.toMatch(/\bCV\b/);
  });

  test('no page outside the archived news posts says "CV" (the quotes in /news/ stay verbatim)', async () => {
    const offenders = listPages()
      .filter((p) => !p.route.startsWith('/news/') && !p.route.startsWith('news/'))
      .filter((p) => /\bCVs?\b/.test(readFileSync(p.file, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')))
      .map((p) => p.route);
    expect(offenders).toEqual([]);
  });
});

test.describe('Home: slide headings, tile and meta description (items 8, 13 and 16)', () => {
  // WP42 (cycle-19 review): the government slide moved to second, so the speed slide was the fifth. WP43 to WP51 shaped its heading ("Most Surveyed New Earners Were Earning by Six Months After the Course": the finding, no percentage, no lead, the 58.8% in a tile).
  // WP53 (owner decision 2026-10-16): that slide is gone; its finding is the survey slide's one body line (slide 3), so the heading carries no percentage and the 58.8% keeps its surveyed-completer base in that line
  test('the survey slide (slide 3) keeps the income heading without a percentage, and its one body line states the 58.8% with its surveyed-completer base', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(2);
    await expect(slide.locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    expect(await slide.locator('h2').textContent()).not.toMatch(/\d/);
    expect(await slide.locator('h2').getAttribute('data-fact')).toBe('OC-03');
    await expect(slide.locator('.hs__eyebrow')).toHaveText('Impact Survey 2026');
    await expect(slide.locator('.hs__lead')).toHaveCount(1);
    const line = compact(await slide.locator('.hs__lead').textContent());
    expect(line).toContain('58.8%');
    // WP49 (cycle-24 review): "surveyed new earners", the register's term (the Outcomes page defines it; tests/wp49.spec.ts)
    expect(line).toContain('of the 170 surveyed new earners (completers who first earned during or after training) had started earning by six months after finishing the course');
    expect(compact(await page.locator('#results').textContent())).not.toContain('Most Surveyed New Earners Were Earning');
  });

  test('slide 2 counts the contracts and names Bangladesh’s National University', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(1);
    await expect(slide.locator('h2')).toHaveText('Six Government Contracts and Bangladesh’s National University');
    expect('Six Government Contracts and Bangladesh’s National University').toBe(titleCase('Six Government Contracts and Bangladesh’s National University'));
    expect(await slide.locator('h2').getAttribute('data-fact')).toBe('GV-12');
    expect(fact('GV-12').text.startsWith('Six government contracts')).toBe(true);
  });

  test('the carousel keeps one height: no slide is taller than the track after the heading changes', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const heights = await page.locator('[data-hs-slide]').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).scrollHeight)));
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      for (const h of heights) expect(h, `${vp.width}px`).toBeLessThanOrEqual(track + 1);
    }
  });

  test('the meta description opens with what CodersTrust does and ends with the evidence; the title is unchanged', async ({ page }) => {
    await open(page, '');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).toBe('CodersTrust trains and mentors educated, unemployed youth for paid digital work, with evidence from a randomized trial of a predecessor program.');
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).not.toMatch(/10\.3|percentage points/);
    await expect(page).toHaveTitle('CodersTrust: From Learning to Earning for Youth');
    expect((await page.locator('meta[property="og:description"]').getAttribute('content')) ?? description).toBe(description);
  });
});

test.describe('Governments: the contracts table has short scope phrases and every figure in its last column (item 9; WP48: the column is "Scale and Outputs")', () => {
  test('no scope cell carries a number or a sentence; Her Power’s three figures are in its last-column cell, each saying whose it is', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const scopes = await texts(page, '#contracts tbody td:nth-child(2)');
    expect(scopes).toHaveLength(6);
    for (const s of scopes) {
      expect(s, 'a scope is a short phrase').not.toMatch(/\d|;|\.$/);
      expect(s.split(' ').length, s).toBeLessThanOrEqual(10);
    }
    expect(scopes[0]).toBe('Curriculum, manuals, mentorship guidelines and Training of Trainers');
    const first = page.locator('#contracts tbody tr').first();
    expect(await first.getAttribute('data-fact')).toBe('GV-01 GV-11');
    // WP50 (cycle-25 review, item 15): each line is a full sentence (tests/wp50.spec.ts)
    expect(await texts(page, '#contracts tbody tr:first-child td.ct__num li')).toEqual([
      'CodersTrust trained 2,500 women directly.',
      'The national program trained 25,125 women across 130 sub-districts (upazilas).',
      '54,609 manuals and guidelines were distributed.',
    ]);
    const cells = await texts(page, '#contracts td.ct__num');
    for (const c of cells.slice(1)) expect(c.startsWith('Contract scope:'), c).toBe(true);
    expect(await mainText(page)).not.toContain('372 of 800 women trained directly');
  });

  test('the manuals figure is stated once, in the table; the "Capacity Designed to Stay" card of the delivery band no longer repeats it', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const text = await mainText(page);
    expect(count(text, '54,609')).toBe(1);
    const card = compact(await page.locator('#mechanism li', { hasText: 'Capacity Designed to Stay' }).first().textContent());
    expect(card).toContain('Training of Trainers, curriculum and manuals, then preparation for industry certification.');
    expect(card).not.toMatch(/54,609|for Her Power/);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: the table has no horizontal page overflow`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/governments/');
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('Employers: "Our Track Record" leads with its delivered figure; "AI Is Reshaping the Workforce" states the 11M and 9M jobs (items 10 and 15)', () => {
  test('the 23,000+ is the band’s headline stat (large), followed by the ministry contract in the register’s "Contract scope:" wording and the AIvolve partnership', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    await expect(page.locator('#guide .pg__stats .stat--lg')).toHaveCount(1);
    expect(compact(await page.locator('#guide .pg__stats').textContent())).toContain('23,000+');
    expect(await page.locator('#guide .pg__stats .factstat').getAttribute('data-fact')).toBe('SC-15');
    expect(await texts(page, '#guide .pg__list li')).toEqual([
      'Contract scope: ICT, networking and cybersecurity for 120+ professionals, for the Ministry of Power, Energy and Mineral Resources (via Bangladesh Petroleum Institute).',
      'Partnership with AIvolve Leadership Dynamics GmbH (Switzerland) for AI leadership and AI-transformation programs.',
    ]);
    expect(await page.locator('#guide .pg__list li').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['GV-06', 'PA-07']);
    // a scope of work is never worded as delivered training (register presentation rule for GV-02 to GV-06)
    expect(compact(await page.locator('#guide').textContent())).not.toMatch(/Also delivered/);
  });

  test('"AWS Authorized Training Partner" is a line under the logo strip, beside the AWS logo, and is stated once', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const note = page.locator('#guide section.partners .pg__logonote');
    await expect(note).toHaveText('AWS Authorized Training Partner.');
    expect(await note.getAttribute('data-fact')).toBe('PA-06');
    await expect(page.locator('#guide .partners__row img[alt="AWS"]')).toHaveCount(1);
    const [rowBox, noteBox] = await Promise.all([page.locator('#guide .partners__row').boundingBox(), note.boundingBox()]);
    expect(noteBox!.y, 'the line sits under the logos').toBeGreaterThanOrEqual(rowBox!.y + rowBox!.height);
    expect(count(compact(await page.locator('main').textContent()), 'AWS Authorized Training Partner')).toBe(1);
    await expect(page.locator('#guide .pg__list')).not.toContainText('AWS');
  });

  // WP47 (owner decision 2026-10-15): Employers has no cost-of-waiting band any more, so its AI card ("AI Is Reshaping the Workforce", the 11M and 9M jobs) is gone with it; the register sentence stays whole
  test('the register’s PX-07 sentence is unchanged, and Employers prints none of its figures (no all-trends clause anywhere on the page)', async ({ page }) => {
    expect(fact('PX-07').text).toContain('across all trends 170M created vs. 92M displaced');
    await open(page, 'partner-with-us/employers/');
    expect(await mainText(page)).not.toMatch(/170M|92M|across all trends|11M jobs/);
    await expect(page.locator('[data-fact~="PX-07"]')).toHaveCount(0);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: the Track Record band has no horizontal page overflow`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/employers/');
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

// WP49 (cycle-24 review, Kimi m4): the problem line (PX-01, the 62 million) is gone from Our Model's definition band, which defines CodersTrust and carries no problem statistic; Home and the audience pages keep PX-01 (tests/wp49.spec.ts)
test.describe('Our Model: the definition band carries the definition alone (item 12 of cycle 18, reversed by item 21 of cycle 24)', () => {
  test('"What Is CodersTrust?" is ID-01 and nothing else: no PX-01 sentence, no 62 million', async ({ page }) => {
    await open(page, 'our-model/');
    await expect(page.locator('#definition .def__extra')).toHaveCount(0);
    expect(await page.locator('#definition [data-fact="PX-01"]').count()).toBe(0);
    expect(compact(await page.locator('#definition').textContent())).not.toContain('62 million');
    // the register still carries the figure, and Home keeps it
    expect(fact('PX-01').text).toContain('62 million');
    await open(page, '');
    expect(compact(await page.locator('#problem [data-fact="PX-01"]').textContent())).toContain('62 million');
  });
});

test.describe('Outcomes 2026: the heading is the finding; the survey’s name is the eyebrow (item 16)', () => {
  test('H1 "Surveyed Completers Report More Work and Higher Income", eyebrow and breadcrumb "Impact Survey 2026", meta title unchanged, JSON-LD headline the H1', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    await expect(page.locator('h1')).toHaveText('Surveyed Completers Report More Work and Higher Income');
    expect('Surveyed Completers Report More Work and Higher Income').toBe(titleCase('Surveyed Completers Report More Work and Higher Income'));
    await expect(page.locator('.lf-head .eyebrow')).toHaveText('Impact Survey 2026');
    await expect(page.locator('nav[aria-label="Breadcrumb"] [aria-current="page"], .crumbs [aria-current="page"]')).toHaveText('Impact Survey 2026');
    await expect(page).toHaveTitle('Impact Survey 2026 Outcomes | CodersTrust');
    const headlines = (await page.locator('script[type="application/ld+json"]').allTextContents()).flatMap((b) => {
      const out: string[] = [];
      const walk = (n: unknown): void => {
        if (Array.isArray(n)) n.forEach(walk);
        else if (n && typeof n === 'object') {
          const o = n as Record<string, unknown>;
          if (typeof o.headline === 'string') out.push(o.headline);
          Object.values(o).forEach(walk);
        }
      };
      walk(JSON.parse(b));
      return out;
    });
    expect(headlines).toContain('Surveyed Completers Report More Work and Higher Income');
    expect(compact(await page.locator('.lf-updated').textContent())).toBe('Source snapshot: October 2026 · Last updated October 15, 2026');
  });
});

test.describe('the changed pages fit a phone: no horizontal overflow at 390 px', () => {
  for (const route of ['', 'programs/', 'programs/youthwide/', 'programs/jobready-campus/', 'partner-with-us/', 'partner-with-us/investors/', 'our-model/', 'our-model/jobready-platform/', 'impact/outcomes-2026/', 'careers/']) {
    test(`${route || 'home'}`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await open(page, route);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});
