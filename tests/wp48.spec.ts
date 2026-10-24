import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP48 behaviors (cycle-23 whole-site reviews, GPT-6.1 Sol items 1-8 and Claude Sonnet 5.5 items 9-21): Home slide 2 has a two-sentence body; the Universities FAQ says that further levels are "published"; the Local Partners
 * definition says the central coordination is a design; YouthWIDE no longer repeats Home's Cost of Waiting and Imagine bands or the hero's links back to audience pages, and its labs tile carries the registered qualifier; the shared
 * "Is the JobReady Platform Live?" answer drops the internal tooling; the Governments contracts column is "Scale and Outputs" and its glance is "Results and Contract Scope at a Glance"; Foundations has no second "Reporting and Review"
 * callout; the WSDFM headline tile says "gain versus the control group"; Home's proof strip is "Proof at a Glance" and its "Evidence You Can Check" band is folded into the "Proof in Practice" link row; the GV-12 note, the Governments
 * blurb, the 2030 aim wording, the PX-05 year, the "three months" wording and the Programs H1 read as the reviews asked. Items 22-34 (Kimi K3, GLM 5.3 and Grok 4.7): Home loses its "Low Risk" band (one line leads the closing band), the FAQ trial answer is two
 * sentences, the RC-06a tile label says what is compared, the hero line names the underemployed, slide 1 names the predecessor program, the Imagine card is "Employers Hiring from Your Cohort", OC-05 says "had started earning by six months after
 * finishing", the Home investor card says "Back JobReady", and the evidence ladder's first rung is "Independent Randomized Trial (BIGD)" (WP49: "Independent Evaluation (BIGD)"). Retrospective coverage (the owner exempted this project from test-first work); run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp48.spec.ts --project=chromium`.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
const sitePath = (href: string) => href.replace(/^\/ctg(?=\/)/, '');
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** The ids of the page's top-level sections, in order. */
const sectionIds = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
/** The visible text of a built page's HTML (scripts, styles and the head dropped), for scans across every page. */
const visible = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The built pages that are not archived news posts (those keep their original wording). */
const sitePages = () => builtPages().filter((p) => !p.route.startsWith('/news/'));
const metaDescription = (html: string) => /<meta name="description" content="([^"]*)"/.exec(html)?.[1].replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’') ?? '';

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
/** One FAQ item on the page, and its answer text. */
const itemOf = (page: Page, question: string) => page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: question }) }).first();
const answerOf = async (page: Page, question: string) => compact(await itemOf(page, question).locator('.faq__a').textContent());

const GV12_NOTE = 'The figure is contract scope, not a count of completers. It includes Her Power’s national program, which trained 25,125 women and met its target; CodersTrust trained 2,400 women directly.';
// WP57 (cycle-29 review, Grok R2 with Gemini GM1): the second sentence is the note's WP35 wording again (it said "This is contract scope, not a count of completers.")
const SLIDE2_LEAD =
  'Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly. As the official training partner of Bangladesh’s National University for digital career skills and credentials, CodersTrust is onboarding 1.5M+ of the university’s own learners, who are not learners trained by CodersTrust.';

test.describe('Home slide 2 and the GV-12 note (items 1 and 12)', () => {
  // WP60 (cycle-32 review, GPT-6.1 Sol G1): the body was four plain sentences (the contract scope with its clause; "This includes Her Power’s national program: 25,125 women trained nationally, 2,500 directly by CodersTrust."; the National University sentence; "They are National University’s own learners, ...")
  // WP61 (cycle-33 review, GPT-6.1 Sol G1): it is three: the contract scope with its clause; "Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly."; and one National University sentence that ends with the qualifier
  test('slide 2 body is the contract scope with its clause, Her Power (trained 25,125 women nationally, its full target; 2,400 trained directly by CodersTrust), then the National University sentence; the 2,400 once; the lead rests on GV-12, GV-01, GV-11 and SC-04; the links stay', async ({ page }) => {
    await open(page, '');
    const s = slide(page, 2);
    const lead = s.locator('.hs__lead');
    expect(compact(await lead.textContent())).toBe(SLIDE2_LEAD);
    expect(await lead.getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
    expect(compact(await s.textContent())).toContain('Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly.');
    // WP58 (cycle-30 review, Gemini GM1): the note says "CodersTrust trained 2,500 directly", so the 2,500 is on the slide once, in the note
    expect((compact(await s.textContent()).match(/2,400/g) ?? []).length, 'the 2,400 is in the note alone').toBe(1);
    await expect(s.locator('h3')).toHaveText('Six Government Contracts and a National University Partnership');
    expect(await s.locator('.hs__actions a').evaluateAll((els) => els.map((a) => ({ text: (a.textContent ?? '').trim(), href: a.getAttribute('href') ?? '' })))).toEqual([
      { text: 'For Governments', href: expect.stringMatching(/\/partner-with-us\/governments\/$/) },
      { text: 'For Universities', href: expect.stringMatching(/\/partner-with-us\/universities\/$/) },
    ]);
  });

  // WP51 (cycle-26 review, Kimi m2): Governments' tile keeps the note's first sentence and points to its contracts table (Her Power's figures are in the table); Impact still prints the whole note
  test('the slide reads its clause from the register note, and the Impact tile prints the whole new note while the Governments tile keeps its first sentence', async ({ page }) => {
    expect(fact('GV-12').stat?.glance?.note).toBe(GV12_NOTE);
    // WP60 (cycle-32 review, GPT-6.1 Sol G1): the register's clause is still "contract scope, not a count of completers"; the slide says it in plain words, "... work scoped for 30,000+ people, not a count of completers." (tests/wp60.spec.ts)
    expect(GV12_NOTE.startsWith('The figure is contract scope, not a count of completers.')).toBe(true);
    expect(SLIDE2_LEAD).toContain('work scoped for 30,000+ people, not a count of completers.');
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance a[data-fact~="GV-12"] .glance__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly). Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.');
    await open(page, 'partner-with-us/governments/');
    expect(compact(await page.locator('#glance li', { hasText: '30,000+' }).locator('.pg__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).');
  });

  // WP57 (cycle-29 review, Grok R2 with Gemini GM1): the WP35 wording is back on two pages by decision (it had been retired in WP46/WP48); the register's note and the Impact tile keep the later wording
  // WP59 (cycle-31 review, GPT-6.1 Sol G1): the Investors and JobReady Platform "Contracted Scope" tiles print the same note (tests/wp59.spec.ts)
  // WP60 (cycle-32 review, GPT-6.1 Sol G1): Home slide 2 says the same facts in plainer sentences and no longer prints the note, so it is not in the list
  test('the old note ("The total is contract scope ... it includes Her Power’s national program") is printed on the Governments tile and the Investors and JobReady Platform tiles only', () => {
    const hits = builtPages().filter((p) => /The total is contract scope|it includes Her Power’s national program/.test(visible(p.html)));
    expect(hits.map((p) => p.route).sort()).toEqual(['/impact/', '/our-model/jobready-platform/', '/partner-with-us/governments/', '/partner-with-us/investors/']);
  });
});

// WP49 (cycle-24 review, GLM M3): both answers end after the alumni-network clause; the TalentLEAP clause ("... progressive levels as further levels are published.") that WP48 reworded does not answer the question and is gone (tests/wp49.spec.ts)
test.describe('The "what happens after" sentence (item 2)', () => {
  const UNIVERSITIES =
    'Where included in the program scope, what the program builds stays on your campus: certified local facilitators, localized curricula and campus labs that serve as blended-learning centers. Completers join CodersTrust’s alumni network after their three months of mentoring.';

  test('Universities: "What Happens After the First Cohort?" ends after the alumni-network clause; the JSON-LD says the same', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    const answer = await answerOf(page, 'What Happens After the First Cohort?');
    expect(answer).toBe(UNIVERSITIES);
    expect((await faqJsonLd(page)).find((q) => q.name === 'What Happens After the First Cohort?')?.text).toBe(answer);
  });

  test('the shared "What Happens When Funding Ends?" answer (Development Partners, Governments, Foundations, Local Partners, TalentLEAP, Governance) ends after the alumni-network clause, with no TalentLEAP clause', async ({ page }) => {
    const ENDING = 'completers join CodersTrust’s alumni network after their three months of mentoring.';
    for (const route of ['partner-with-us/development-partners/', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/local-partners/', 'our-model/talentleap/', 'about/governance/']) {
      await open(page, route);
      const answer = await answerOf(page, 'What Happens When Funding Ends?');
      expect(answer.endsWith(ENDING), route).toBe(true);
      expect(answer, route).not.toContain('TalentLEAP');
      expect(answer, route).not.toContain('so completers can keep advancing');
      expect((await faqJsonLd(page)).find((q) => q.name === 'What Happens When Funding Ends?')?.text, route).toBe(answer);
    }
  });

  test('no page says "so they can keep advancing" or "so completers can keep advancing", and TalentLEAP’s worked example is unchanged', async ({ page }) => {
    expect(builtPages().filter((p) => /so (?:they|completers) can keep advancing/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
    await open(page, 'our-model/talentleap/');
    expect(await mainText(page)).toContain('TalentLEAP organizes skills into career paths with progressive levels. In this example the levels are Competent, Proficient and Expert.');
  });
});

test.describe('Local Partners: the definition block (item 3)', () => {
  test('the central coordination is a design, and what CodersTrust Bangladesh gives local partners is its own sentence', async ({ page }) => {
    await open(page, 'partner-with-us/local-partners/');
    const p = page.locator('#definition p[data-fact="PD-06 GV-09"]');
    await expect(p).toHaveCount(1);
    expect(compact(await p.textContent())).toBe(
      'Larger programs are designed to run through certified local facilitators in existing labs and colleges, coordinated centrally. CodersTrust Bangladesh supports local partners with curriculum, certification, mentoring, reporting and safeguarding.',
    );
    expect(await mainText(page)).not.toContain('Larger programs run through');
  });
});

test.describe('YouthWIDE: no Cost of Waiting band, no Imagine band, no hero links back to audience pages (items 4 and 11)', () => {
  test('neither band is on the page, with their headings and eyebrows', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    for (const id of ['cost', 'future']) await expect(page.locator(`#${id}`), `#${id}`).toHaveCount(0);
    const text = await mainText(page);
    for (const gone of ['The Cost of Waiting', 'What Success Looks Like', 'Training Without Work Entry Leaves Budgets Without Results', 'Young People Earning, Locally and Globally', 'Earning from Their Own Business', 'Illustrative: imagine']) {
      expect(text, gone).not.toContain(gone);
    }
    expect(text).not.toMatch(/Training Does Not Always Lead to Employment|AI Is Changing Freelance Demand/);
    expect(builtPages().filter((p) => p.html.includes('>Training Without Work Entry Leaves Budgets Without Results<')).map((p) => p.route)).toEqual([]);
  });

  test('the challenge band stays, then the track record and the delivery model; the tone alternates white, airy, white, airy and never puts two dark bands together', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const ids = await sectionIds(page);
    expect(ids.indexOf('problem'), 'the challenge band stays').toBeGreaterThanOrEqual(0);
    expect(ids.slice(ids.indexOf('problem'), ids.indexOf('problem') + 4)).toEqual(['problem', 'guide', 'mechanism', 'governments']);
    const tones = await page.evaluate(() => {
      const tone = (id: string) => /\bband--(white|airy|ice|klein|deep-ink)\b/.exec(document.getElementById(id)?.className ?? '')?.[1];
      return ['problem', 'guide', 'mechanism', 'governments'].map(tone);
    });
    expect(tones).toEqual(['white', 'airy', 'white', 'airy']);
    const adjacent = await page.evaluate(() => {
      const bands = Array.from(document.querySelectorAll('main section.band')).filter((b) => !b.parentElement?.closest('section.band'));
      const dark = bands.map((b) => /\bband--(klein|deep-ink)\b/.test(b.className));
      return dark.flatMap((d, i) => (d && i > 0 && dark[i - 1] ? [`#${bands[i - 1].id} then #${bands[i].id}`] : []));
    });
    expect(adjacent).toEqual([]);
    await expect(page.locator('#guide h2')).toHaveText(/We’ve Built This Path Since/);
  });

  test('the hero keeps one primary button and the ministry briefing as its one text link; "For Development Partners" and "For Governments" are gone from it', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const hero = page.locator('#hero');
    await expect(hero.locator('.btn--primary')).toHaveCount(1);
    const links = hero.locator('.hero__actions nav a.link');
    await expect(links).toHaveCount(1);
    expect(await links.getAttribute('href')).toMatch(/^mailto:/);
    expect(compact(await hero.textContent())).not.toMatch(/For Development Partners|For Governments/);
    expect((await hrefs(page, '#hero a')).filter((h) => /partner-with-us\//.test(h))).toEqual([]);
  });

  test('Home keeps its Cost of Waiting and Imagine bands; no other program page has a Cost of Waiting band, and the unused component is gone', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#cost')).toHaveCount(1);
    await expect(page.locator('#future')).toHaveCount(1);
    const withBand = sitePages().filter((p) => visible(p.html).includes('The Cost of Waiting')).map((p) => p.route);
    expect(withBand.filter((r) => r !== '/' && r !== '/styleguide/'), 'pages other than Home and the component gallery').toEqual([]);
    expect(existsSync(resolve('src/components/pages/programs/CostSection.astro'))).toBe(false);
    const photos = readFileSync(resolve('src/data/photos.ts'), 'utf8');
    expect(/const FUTURE[\s\S]*?\n};/.exec(photos)?.[0] ?? '').not.toMatch(/\byouthwide:/);
  });
});

test.describe('YouthWIDE: the labs tile carries the registered qualifier (item 10)', () => {
  const QUALIFIER = 'In Bangladesh; lab access and seats are confirmed per program.';

  test('the qualifier is the fact’s own detail line, shown as the tile’s note on YouthWIDE and on Local Partners; the 2030 aim stays the only Target tile', async ({ page }) => {
    expect(fact('GV-09').stat?.detail).toBe(QUALIFIER);
    await open(page, 'programs/youthwide/');
    const tile = page.locator('#governments .mech-stat', { has: page.locator('[data-fact="GV-09"]') });
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.locator('.stat__note').textContent())).toBe(QUALIFIER);
    // WP64 (cycle-36 review, Kimi; rework RW1): the label names the publisher of the count, "government digital labs (Department of ICT count) that could host blended learning" (SOURCE_NOTE; the source states no year; tests/wp64.spec.ts)
    expect(compact(await tile.locator('.stat__label').textContent())).toBe('government digital labs (Department of ICT count) that could host blended learning');
    await expect(page.locator('#governments .mech-stat')).toHaveCount(2);
    await expect(page.locator('main .status-tag', { hasText: 'Target' })).toHaveCount(1);
    await open(page, 'partner-with-us/local-partners/');
    expect(compact(await page.locator('#guide .factstat[data-fact="GV-09"] .stat__note').textContent())).toBe(QUALIFIER);
  });
});

test.describe('"Is the JobReady Platform Live?" (item 5)', () => {
  const ANSWER = 'Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch. Hiring currently runs through CodersTrust’s placement team.';

  test('Employers and JobReady@Work give the short answer, without the internal tooling; the JSON-LD says what the page says', async ({ page }) => {
    for (const route of ['partner-with-us/employers/', 'programs/jobready-work/']) {
      await open(page, route);
      const answer = await answerOf(page, 'Is the JobReady Platform Live?');
      expect(answer, route).toBe(ANSWER);
      expect(answer, route).not.toMatch(/marketing automation|customer relationship management|Upwork|Fiverr|employer and gig-work/i);
      expect((await faqJsonLd(page)).find((q) => q.name === 'Is the JobReady Platform Live?')?.text, route).toBe(answer);
    }
  });

  test('the JobReady Platform page and the register keep the full list', async ({ page }) => {
    expect(fact('IN-04').text).toContain('Live today: partner portals, marketing automation, customer relationship management and AI chat. In pre-launch: the employer marketplace and the gig-work marketplace.');
    await open(page, 'our-model/jobready-platform/');
    // WP49 (cycle-24 review): the "What Is Live Today" callout is gone; the status table keeps the full list (its "Across the Platform" row and the partner-portals row; tests/wp49.spec.ts)
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('Marketing automation, customer relationship management and AI chat');
    expect(text).toContain('Partner portals');
    expect(text).not.toContain('are live, and the course storefront operates');
  });
});

test.describe('Governments: the contracts column and the glance heading (items 6 and 16)', () => {
  test('the last column is "Scale and Outputs" (header and mobile label); the cells are unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    expect(await texts(page, '#contracts thead th')).toEqual(['Contract', 'CodersTrust Scope', 'Scale and Outputs']);
    expect('Scale and Outputs').toBe(titleCase('Scale and Outputs'));
    expect(await page.locator('#contracts td.ct__num').evaluateAll((els) => els.map((e) => e.getAttribute('data-label')))).toEqual(Array(6).fill('Scale and Outputs'));
    // WP50 (cycle-25 review, item 15): each line is a full sentence (tests/wp50.spec.ts)
    expect(await texts(page, '#contracts tbody tr:first-child td.ct__num li')).toEqual([
      'CodersTrust trained 2,400 women directly.',
      'The national program trained 25,125 women across 130 sub-districts (upazilas), meeting its target.',
      '54,609 manuals and guidelines were distributed.',
    ]);
    const cells = await texts(page, '#contracts td.ct__num');
    for (const c of cells.slice(1)) expect(c.startsWith('Contract scope:'), c).toBe(true);
    expect(await mainText(page)).not.toContain('Training Figure');
  });

  test('the glance is headed "Results and Contract Scope at a Glance" on Governments; the other pages keep "Results at a Glance"', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#glance h2.pg__title')).toHaveText('Results and Contract Scope at a Glance');
    expect('Results and Contract Scope at a Glance').toBe(titleCase('Results and Contract Scope at a Glance'));
    for (const route of ['partner-with-us/development-partners/', 'partner-with-us/foundations/']) {
      await open(page, route);
      await expect(page.locator('#glance h2.pg__title'), route).toHaveText('Results at a Glance');
    }
  });
});

test.describe('"Reporting and Review" (item 7)', () => {
  // WP57b (cycle-29 review, GLM L5): the quarterly reviews carry the scope qualifier "as agreed in the program scope"
  const SENTENCE = 'For supported cohorts, monthly reports track progress; quarterly reviews, as agreed in the program scope, guide corrective action and any expansion.';
  const callout = (page: Page) => page.locator('.callout', { has: page.locator('.eyebrow', { hasText: 'Reporting and Review' }) });

  test('Foundations has no "Reporting and Review" callout; its "Progress You Can See Every Month" card already says monthly reports and a quarterly steering review; the due-diligence band is followed by the call to action', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(callout(page)).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toContain(SENTENCE);
    expect(text).toContain('Progress You Can See Every Month');
    // WP49 (cycle-24 review): the card is two sentences: "Monthly reports and quarterly reviews keep progress visible. Where agreed, SDG-mapped reporting follows your CSR framework, with co-branded certificates and events." (tests/wp49.spec.ts)
    expect(text).toContain('Monthly reports and quarterly reviews keep progress visible');
    const ids = await sectionIds(page);
    expect(ids.indexOf('cta')).toBe(ids.indexOf('due-diligence') + 1);
  });

  test('Development Partners keeps the callout: it is the one place the page names the quarterly reviews', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    await expect(callout(page)).toHaveCount(1);
    expect(compact(await callout(page).locator('.callout__body p').first().textContent())).toBe(SENTENCE);
    expect(count(await mainText(page), 'quarterly'), 'quarterly reviews are named once on the page').toBe(1);
  });
});

test.describe('WSDFM case study: the +41% tile says gain versus the control group (item 8)', () => {
  const LABEL = 'estimated monthly income gain versus the control group, for women in Dhaka offered a place (randomized trial of a predecessor program)';

  test('the label comes from RC-01; the tile shows it, and only the case study and the component gallery print it', async ({ page }) => {
    expect(fact('RC-01').stat?.label).toBe(LABEL);
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    const tile = page.locator('.hero .cs__stat').nth(2);
    await expect(tile.locator('.stat__value')).toHaveText('+41%');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe(LABEL);
    expect(builtPages().filter((p) => p.html.includes('estimated monthly income for women in Dhaka offered a place')).map((p) => p.route)).toEqual([]);
    expect(builtPages().filter((p) => p.html.includes(LABEL)).map((p) => p.route)).toEqual(['/impact/case-studies/wsdfm-women-freelancers/', '/styleguide/']);
  });
});

test.describe('Home: the proof strip and the evidence band (items 9 and 13)', () => {
  test('the hero’s proof strip is headed "Proof at a Glance" (screen-reader heading); no page says "The Strongest Proof"', async ({ page }) => {
    await open(page, '');
    const h2 = page.locator('.hh__proof h2');
    await expect(h2).toHaveText('Proof at a Glance');
    await expect(h2).toHaveClass(/sr-only/);
    expect('Proof at a Glance').toBe(titleCase('Proof at a Glance'));
    expect(builtPages().filter((p) => p.html.includes('The Strongest Proof')).map((p) => p.route)).toEqual([]);
  });

  test('"Evidence You Can Check" is gone with its pathways table and its 70.8% line; the two evidence links close the "Proof in Practice" link row', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#proof-band')).toHaveCount(0);
    await expect(page.locator('.pwp, .he__top, .he__head, [data-fact="OC-02"], [data-fact="OC-04"]')).toHaveCount(0);
    const text = await mainText(page);
    for (const gone of ['Evidence You Can Check', 'Paid-Work Pathways Among Surveyed Completers', '70.8%', '34 of 48']) expect(text, gone).not.toContain(gone);
    expect(await texts(page, '#cases .csc__more a')).toEqual(['See All Case Studies', 'Read the Trial Results', 'Impact Survey 2026']);
    expect((await hrefs(page, '#cases .csc__more a')).map(sitePath)).toEqual(['/impact/case-studies/', '/impact/independent-evaluation/', '/impact/outcomes-2026/']);
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('[data-cmf]')).map((el) => el.getAttribute('data-cmf')));
    expect(order.filter((c) => c === 'C7'), 'one C7 proof position').toHaveLength(1);
    expect(order[order.indexOf('C6') + 1], 'the proof band follows the mechanism band').toBe('C7');
    expect(order[order.indexOf('C7') + 1]).toBe('RECOGNITION');
  });

  test('the Impact Survey 2026 page keeps the pathways and the 70.8%', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    const text = await mainText(page);
    expect(text).toContain('70.8%');
    expect(text).toContain('34 of 48');
    expect(text).toContain('39.0%');
    expect(text).toContain('54.4%');
  });

  test('the link row wraps as a row at 1280 and 390 and the page does not scroll sideways', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const row = page.locator('#cases .csc__more');
      expect(await row.evaluate((el) => getComputedStyle(el).display), `${vp.width}px`).toBe('flex');
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Development Partners, Foundations and Governments: sector generalizations (items 14 and 15)', () => {
  test('the Development Partners and Foundations pains say what the page can stand behind', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const dp = await mainText(page);
    // the pain headings render in Title Case (the sentence-case source strings are converted when the page prints them). WP49 (cycle-24 review): the first card is headed "Training Must Connect to Paid Work" (it was "Skills Programs Miss Their Employment Targets"; tests/wp49.spec.ts)
    expect(dp).toContain('Training Must Connect to Paid Work');
    expect(dp).toContain('Connect training to a first job, freelance client or business.');
    expect(dp).not.toContain('Enrollment targets are often met, while employment results lag behind.');
    await open(page, 'partner-with-us/foundations/');
    const foundations = await mainText(page);
    expect(foundations).toContain('Independent Evidence Is Hard to Find');
    expect(foundations).toContain('You need independent evidence, not a provider’s own count.');
    expect(foundations).not.toContain('Independent evidence on youth-employment programs is thin.');
  });

  test('"Can You Reach Women and Other Priority Groups?" says "we measure outcomes in each pilot" on Development Partners (the bank answer says it too); the JSON-LD says what the page says', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const answer = await answerOf(page, 'Can You Reach Women and Other Priority Groups?');
    expect(answer).toBe(
      'Our women-focused programs report work outcomes; see Proof in Practice above. For other priority groups, we measure outcomes in each pilot. The randomized trial studied women aged 18–35 in Dhaka with at least a Secondary School Certificate (SSC), so it does not speak to other groups.',
    );
    expect((await faqJsonLd(page)).find((q) => q.name === 'Can You Reach Women and Other Priority Groups?')?.text).toBe(answer);
    expect(faqs.find((f) => f.id === 'Q6')!.a).toContain('For other priority groups, we measure outcomes in each pilot.');
    expect(builtPages().filter((p) => visible(p.html).includes('early delivery experience')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('The Governments blurb and the 2030 aim (items 17 and 18)', () => {
  const BLURB = 'Curriculum, trainer training and phased delivery for ministries.';
  // WP54 (cycle-28 review, Claude S7): the Programs menu line no longer carries the aim (it was "..., with a Bangladesh initiative that aims to train 2 million vulnerable youth by 2030.")
  const MENU_LINE = 'Co-funded country cohorts, designed for three regions, from training to paid digital work.';

  test('the Partner with Us menu, its featured panel, Home’s router and the partner hub say the new blurb; no page says "National programs for youth employment"', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize(DESKTOP);
    await open(page, '');
    expect(compact(await page.locator('#mega-partner a.mega__link[href$="partner-with-us/governments/"] .mega__desc').textContent())).toBe(BLURB);
    expect(compact(await page.locator('#mega-partner .mega__feature-text').textContent())).toBe(BLURB);
    expect(compact(await page.locator('#router a.cat[href$="partner-with-us/governments/"] .cat__text').textContent())).toBe(BLURB.replace(/\.$/, ''));
    await open(page, 'partner-with-us/');
    // the hub's route cards are written as "For <who>: <what the route offers>." (src/pages/partner-with-us/index.astro; they do not read nav.ts)
    expect(compact(await page.locator('main a.cat[href$="partner-with-us/governments/"] .cat__text').first().textContent())).toBe('For ministries and public agencies: curriculum, trainer training and phased delivery.');
    expect(builtPages().filter((p) => /national programs for youth employment/i.test(p.html)).map((p) => p.route)).toEqual([]);
  });

  // WP53 (owner decision 2026-10-16): Home's carousel has no programs slide any more, so the aim was in the Programs menu and panel and the YouthWIDE glance row. WP54 (cycle-28 review, Claude S7): the menu and panel no longer carry it; the glance row does
  test('the aim is "2 million vulnerable youth" in the YouthWIDE glance row and not in the Programs menu and panel; no site page says "2 million youth"', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, '');
    expect(compact(await page.locator('#mega-programs a.mega__link[href$="programs/youthwide/"] .mega__desc').textContent())).toBe(MENU_LINE);
    expect(compact(await page.locator('#mega-programs .mega__feature-text').textContent())).toBe(MENU_LINE);
    await expect(page.locator('#results .hs__program')).toHaveCount(0);
    await open(page, 'programs/youthwide/');
    expect(compact(await page.locator('#program-glance .pg__row').first().textContent())).toContain('an initiative of its own that aims to train 2 million vulnerable youth by 2030, depending on government and donor commitments.');
    expect(sitePages().filter((p) => /2 million youth/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });
});

test.describe('PX-05 is dated, and UNDP YES says "three months" (items 19 and 20)', () => {
  test('the employer-shortage figure says 2026 at its source and on every page that shows it', async ({ page }) => {
    expect(fact('PX-05').stat?.label).toBe('of employers globally reported difficulty finding talent in 2026');
    expect(fact('PX-05').text.startsWith('In 2026, 72% of employers globally reported difficulty finding the talent they need')).toBe(true);
    for (const route of ['partner-with-us/investors/', 'partner-with-us/employers/', 'partner-with-us/universities/']) {
      await open(page, route);
      // Investors prints it as a stat tile and Employers and Universities as a fact card; all three read the register's label
      const text = await mainText(page);
      expect(text, route).toContain('of employers globally reported difficulty finding talent in 2026');
      expect(await page.locator('[data-fact~="PX-05"]').count(), route).toBeGreaterThan(0);
    }
    await open(page, 'programs/nu-postgraduate-diploma/');
    // WP57b (owner decision 2026-10-19): the tile names its publisher and year inside the sentence (tests/wp57b.spec.ts)
    expect(await texts(page, 'main .pcs__label')).toContain('of employers worldwide reported difficulty finding the talent they need in 2026 (ManpowerGroup, 2026)');
    await open(page, 'programs/jobready-work/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe('JobReady@Work builds custom AI-ready training for your team and sources talent. In 2026, 72% of employers globally reported difficulty finding talent.');
    expect([...description!].length).toBeLessThanOrEqual(155);
    expect(sitePages().filter((p) => /(?:employers|of employers) (?:globally|worldwide) report difficulty|Globally, 72% of employers report/.test(visible(p.html) + metaDescription(p.html))).map((p) => p.route)).toEqual([]);
  });

  test('PR-03 reads "within three months" in the register, on the Impact tiles and in the case study’s description; no site page says "within 3 months"', async ({ page }) => {
    const pr03 = fact('PR-03');
    expect(pr03.text.endsWith('67% of the 350 enrolled found their first job within three months')).toBe(true);
    expect(pr03.stat?.label).toBe('of the 350 enrolled found their first job within three months');
    expect(pr03.stat?.glance?.label).toBe('of the 350 enrolled in UNDP YES, Korail, found their first job within three months');
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance').textContent())).toContain('found their first job within three months');
    await open(page, 'partner-with-us/development-partners/');
    // WP62 (cycle-34 review, Grok): this page’s tile names the program’s year, read from PR-03 (the register’s glance label above, which the Impact tile keeps, is unchanged; tests/wp62.spec.ts)
    expect(compact(await page.locator('#glance .pg__lead a[data-fact="PR-03"]').textContent())).toContain('of the 350 enrolled in UNDP YES, Korail (2017), found their first job within three months');
    await open(page, 'impact/case-studies/undp-yes-korail/');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBe('UNDP YES, a 2017 program with UNDP in Korail, Dhaka: 350 enrolled, 97.5% completed, 67% of the 350 enrolled found a first job within three months.');
    expect([...description!].length).toBeLessThanOrEqual(155);
    expect(sitePages().filter((p) => /within 3 months/.test(visible(p.html) + metaDescription(p.html))).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Programs: the H1 (item 21)', () => {
  // WP50 (cycle-25 review): the H1 is "Digital Skills Programs, from School to Work" (it was "Programs That Take Learners from Classroom to Career", which does not cover SuperKids or people already employed; tests/wp50.spec.ts)
  test('"Digital Skills Programs, from School to Work" is the one H1, in Title Case, and neither earlier H1 is on the site', async ({ page }) => {
    await open(page, 'programs/');
    await expect(page.locator('main h1')).toHaveText('Digital Skills Programs, from School to Work');
    expect('Digital Skills Programs, from School to Work').toBe(titleCase('Digital Skills Programs, from School to Work'));
    expect(builtPages().filter((p) => p.html.includes('Digital Skills for Every Stage') || p.html.includes('Programs That Take Learners from Classroom to Career')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Home: the low-risk band, the FAQ trial answer, the hero line, the first slide, the Imagine card and the track record (items 23, 24, 26, 28, 30 and 31)', () => {
  test('the "Low Risk" band is gone from Home and its line leads the closing band, which keeps one primary button and two text routes; the audience pages keep their own risk bands; no two dark bands meet', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#risk')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Start with a Multi-Cohort Pilot, Then Decide on Evidence');
    const cta = page.locator('#cta');
    expect(compact(await cta.locator('.cta-band__text').textContent())).toBe('Start with a multi-cohort pilot, agree the scorecard up front, and decide on expansion from the evidence.');
    await expect(cta.locator('h2')).toHaveText('Let’s Design Your First Cohort');
    await expect(cta.locator('.btn--primary, .btn--inverse')).toHaveCount(1);
    expect(await texts(page, '#cta .cta-band__route')).toHaveLength(2);
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('[data-cmf]')).map((el) => el.getAttribute('data-cmf')));
    expect(order.slice(order.indexOf('C11')), 'the offer, the closing call to action, the next steps').toEqual(['C11', 'C13', 'C14']);
    const adjacent = await page.evaluate(() => {
      const bands = Array.from(document.querySelectorAll('main section.band')).filter((b) => !b.parentElement?.closest('section.band'));
      const dark = bands.map((b) => /\bband--(klein|deep-ink)\b/.test(b.className));
      return dark.flatMap((d, i) => (d && i > 0 && dark[i - 1] ? [`#${bands[i - 1].id} then #${bands[i].id}`] : []));
    });
    expect(adjacent).toEqual([]);
    for (const route of ['partner-with-us/governments/', 'partner-with-us/local-partners/', 'partner-with-us/universities/', 'partner-with-us/employers/']) {
      await open(page, route);
      await expect(page.locator('#risk'), route).toHaveCount(1);
    }
  });

  test('"Does the Trial Apply to Your Program?" is two sentences: the trial covered a 200-hour predecessor program, not today’s 100-hour tracks; other programs rest on the survey and program records, which are descriptive', async ({ page }) => {
    await open(page, '');
    const answer = await answerOf(page, 'Does the Trial Apply to Your Program?');
    expect(answer).toBe(
      'The randomized trial evaluated a 200-hour predecessor program for women in Dhaka, not today’s 100-hour tracks. Results for other programs come from the October 2026 survey of completers and from program records, which are descriptive.',
    );
    expect((await faqJsonLd(page)).find((q) => q.name === 'Does the Trial Apply to Your Program?')?.text).toBe(answer);
  });

  test('the hero line names the underemployed, as ID-01 does; the H1 is unchanged', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('.hh__lead')).toHaveText('We help educated, unemployed and underemployed youth reach paid digital work through training, mentoring and placement support.');
    await expect(page.locator('#hero h1')).toHaveText('Turn Youth Unemployment into a Digital Workforce — with Evidence');
    expect(fact('ID-01').text).toContain('educated, unemployed and underemployed youth');
  });

  // WP50 (cycle-25 review): the predecessor program is named in the slide's eyebrow ("Randomized Trial of a Predecessor Program") and the lead; the heading is short again (tests/wp50.spec.ts)
  test('slide 1 names the predecessor program, in the eyebrow above its heading and in its lead; the >4× tile stays', async ({ page }) => {
    await open(page, '');
    const first = slide(page, 1);
    const title = 'Women Offered a Place Earned an Estimated 41% More per Month';
    await expect(first.locator('h3')).toHaveText(title);
    expect(title).toBe(titleCase(title));
    expect(await first.locator('h3').getAttribute('data-fact')).toBe('RC-01');
    await expect(first.locator('.hs__eyebrow')).toHaveText('Randomized Trial of a Predecessor Program');
    expect(compact(await first.locator('.hs__lead').textContent())).toBe('In the predecessor WSDFM program, women offered a place had an estimated 41% higher monthly income than the control group, about $27 more a month.'); // WP63 (cycle-35 review, GLM L4)
    expect(compact(await first.locator('.hs__proof').textContent())).toContain('>4×');
  });

  test('the third Imagine scenario is "Employers Hiring from Your Cohort"; "AI-Ready Talent" is no longer a Home heading', async ({ page }) => {
    await open(page, '');
    expect(await texts(page, '#future h3')).toEqual(['A First Foreign Client, Billed from Home', 'First Earnings, Not Just Certificates', 'Employers Hiring from Your Cohort']);
    expect('Employers Hiring from Your Cohort').toBe(titleCase('Employers Hiring from Your Cohort'));
    expect(await texts(page, '#future .card__text')).toContain('You see employers hire completers whose skills match current employer demand.');
    expect(await mainText(page)).not.toContain('AI-Ready Talent');
  });

  test('"Our Track Record" says CodersTrust "began training freelancers in Bangladesh"', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#guide').textContent())).toContain('CodersTrust launched in 2014 in Copenhagen and began training freelancers in Bangladesh. Our first UNDP-supported pilot (2015) was in Dhaka’s Korail settlement.');
    expect(builtPages().filter((p) => p.route === '/' && p.html.includes('began developing freelancers')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Investors and Development Partners (items 25 and 27)', () => {
  test('the Investors thesis band ends with its three cards; the stakes line is gone', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(await page.locator('#thesis .container > :last-child').getAttribute('class')).toContain('grid-cards');
    await expect(page.locator('#thesis .th__stakes')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Every trained young person who remains out of work');
    expect(await page.locator('#thesis').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))).toBeGreaterThanOrEqual(40);
  });

  test('the ">4×" tile says what is compared; the 2.3-point average in the label is the one in the register’s sentence; the note that repeated it is gone', async ({ page }) => {
    // WP49 (cycle-24 review): "... was more than four times the 2.3-point average ..." (the label states the ratio the ">4×" figure shows)
    const LABEL = 'The employment effect for women offered a place was more than four times the 2.3-point average across nine vocational-training trials';
    expect(fact('RC-06a').stat?.glance?.label).toBe(LABEL);
    expect(fact('RC-06a').stat?.glance?.note).toBeUndefined();
    const average = /which was ([\d.]+) percentage points/.exec(fact('RC-06a').text)?.[1];
    expect(LABEL).toContain(`${average}-point average`);
    // WP52 (cycle-27 review, Kimi M2): the ">4×" tile is gone from Development Partners' glance; its comparison is the +10.3 tile's note, read from this label (tests/wp52.spec.ts)
    await open(page, 'partner-with-us/development-partners/');
    await expect(page.locator('#glance .pg__lead a[data-fact="RC-06a"]')).toHaveCount(0);
    const lead = page.locator('#glance .pg__lead a[data-fact~="RC-06a"]');
    await expect(lead).toHaveCount(1);
    await expect(lead.locator('.pg__note')).toHaveText(`${LABEL.replace(/^The employment effect for women offered a place was m/, 'M')}.`);
    expect(builtPages().filter((p) => p.html.includes('Against 2.3 percentage points on average across nine vocational-training trials')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('OC-05: "had started earning by six months after finishing" (item 32)', () => {
  const TEXT = 'Among the 172 surveyed completers who first earned during or after training: 23.3% first earned during the course; 58.7% had started earning by six months after finishing it; 77.3% by a year; 90.7% by two years (cumulative)';
  // WP49 (cycle-24 review): the labels say "surveyed new earners" (the register's term; the text field keeps the full definition and the Outcomes page defines the term once: tests/wp49.spec.ts)
  const LABEL = 'of the 172 surveyed new earners had started earning by six months after finishing the course (October 2026 survey)';
  const GLANCE = 'of the 172 surveyed new earners had started earning by six months after finishing the course, including 23.3% who first earned during the course';
  // WP52 (cycle-27 review): Home's slide and the Impact tile define the term in place (OC-05's label with "(completers who first earned during or after training)" after it); the register's labels are unchanged (tests/wp52.spec.ts)
  const define = (s: string) => s.replace('surveyed new earners', 'surveyed new earners (completers who first earned during or after training)');
  const HEADING = 'Most Surveyed New Earners Were Earning by Six Months After the Course';
  const NOTE = 'Months are counted from the end of the course; the shares are cumulative and include earnings during the course.';
  const MEASURE = 'Cumulative share of completers who first earned during or after training and had started earning by each point, with months counted from the end of the course and including earnings during the course (timing only)';

  test('the register says "by six months after finishing" in its text, stat label and glance label; the figures and the base are unchanged', () => {
    const oc05 = fact('OC-05');
    expect(oc05.text).toBe(TEXT);
    expect(oc05.stat?.value).toBe('58.7%');
    expect(oc05.stat?.label).toBe(LABEL);
    expect(oc05.stat?.glance?.label).toBe(GLANCE);
    // the cumulative figures include the 23.3% who first earned during the course, who cannot have started "within six months of" the course ending
    expect(oc05.text).toContain('23.3% first earned during the course');
    expect(`${oc05.text} ${oc05.stat?.label} ${oc05.stat?.glance?.label}`).not.toMatch(/within (?:six months|a year|two years)|of finishing the course/);
  });

  // WP53 (owner decision 2026-10-16): the speed slide (headed HEADING) is gone; the survey slide's one body line is OC-05's value and label with the term defined (WP52), without the label's "(October 2026 survey)", and it fits the carousel at 1280 and 390
  // WP54 (cycle-28 reviews, Claude S23 and GLM L1): the line leads with its base, "Of the 172 surveyed completers who first earned during or after training, 58.7% ...", and needs no term (tests/wp54.spec.ts)
  test('Home slide 3’s body line is OC-05’s value and the register’s closing clause, leading with its base; the former speed heading is on no slide; the slide fits the carousel at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const s = slide(page, 3);
      expect(await s.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
      expect(compact(await s.locator('.hs__lead').textContent()), `${vp.width}px`).toBe('Of the 172 surveyed completers who first earned during or after training, 58.7% had started earning by six months after finishing the course.');
      expect(compact(await page.locator('#results').textContent())).not.toContain(HEADING);
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      expect(await s.evaluate((e) => Math.round((e as HTMLElement).scrollHeight)), `${vp.width}px: the slide fits its track`).toBeLessThanOrEqual(track + 1);
    }
  });

  test('Impact’s tile, Outcomes 2026 (summary tile, paragraph, chart note) and the data file all say it the same way; the values are unchanged', async ({ page }) => {
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance a[data-fact~="OC-05"]').textContent())).toContain(define(GLANCE));
    await open(page, 'impact/outcomes-2026/');
    expect(compact(await page.locator('#summary [data-fact="OC-05"]').textContent())).toContain(LABEL);
    expect(compact(await page.locator('#speed p[data-fact="OC-05"]').textContent())).toContain(`${TEXT}.`);
    expect(compact(await page.locator('#speed .colc__note').textContent())).toBe(NOTE);
    const rows = readFileSync(resolve('public/data/outcomes-2026-aggregates.csv'), 'utf8').split('\n').filter((l) => l.startsWith('OC-05,'));
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r, r).toContain(`"${MEASURE}"`);
    expect(rows.map((r) => r.split('"')[2].split(',').slice(1, 6).join('|'))).toEqual([
      'During the Course|percent|23.3|172|published',
      'By 3 Months|percent|38.4|172|published',
      'By 6 Months|percent|58.7|172|published',
      'By 12 Months|percent|77.3|172|published',
      'By 2 Years|percent|90.7|172|published',
    ]);
  });

  test('no built page keeps the contradictory wording, and the check-facts advice string uses the new one', () => {
    const stale = sitePages().filter((p) => /within six months of (?:finishing|the course)|started earning within|Within Six Months of the Course Ending|First Earnings Came Within/i.test(visible(p.html) + metaDescription(p.html)));
    expect(stale.map((p) => p.route)).toEqual([]);
    const advice = readFileSync(resolve('scripts/check-facts.mjs'), 'utf8');
    expect(advice).toContain('Most surveyed new earners had started earning by six months after finishing the course.');
    expect(advice).not.toMatch(/started earning within six months of finishing/);
  });
});

test.describe('The Home router’s investor card states the route (item 33)', () => {
  // WP50 (cycle-25 review, item 14): Home's card reads "Back the staged rollout of JobReady, CodersTrust’s digital education and employment platform." (tests/wp50.spec.ts); the partner hub's card is the one this test still holds
  // WP53 (owner decision 2026-10-16): the definition is "CodersTrust’s digital learning and earning platform" on both cards (tests/wp53.spec.ts)
  test('Home states the investor’s route ("Back ..."); the partner hub’s card already names its audience and is unchanged', async ({ page }) => {
    const BACK = 'Back the staged rollout of JobReady, CodersTrust’s digital learning and earning platform.';
    await open(page, '');
    expect(compact(await page.locator('#router a.cat[href$="partner-with-us/investors/"] .cat__text').textContent())).toBe(BACK);
    await open(page, 'partner-with-us/');
    expect(compact(await page.locator('main a.cat[href$="partner-with-us/investors/"] .cat__text').first().textContent())).toBe('For impact investors: JobReady, CodersTrust’s digital learning and earning platform.');
    // the old Home wording, without "Back", is gone from every page
    expect(builtPages().filter((p) => /cat__text[^>]*>JobReady, the platform we are building/.test(p.html)).map((p) => p.route)).toEqual([]);
  });
});

// WP49 (cycle-24 review, item 14): the rung's name is "Independent Evaluation (BIGD)" (WP48 had "Independent Randomized Trial (BIGD)", which printed the type twice beside the "Randomized Trial" tag); tests/wp49.spec.ts pins the tag and the single name
test.describe('The evidence ladder’s first rung is "Independent Evaluation (BIGD)" (item 34)', () => {
  const NAME = 'Independent Evaluation (BIGD)';
  const INSTITUTE = 'BRAC Institute of Governance and Development';

  test('Impact: the matrix row is the one link named so, with the trial tag; the institute is spelled out once, in that row’s "What It Shows" cell; "BIGD" appears once on the page', async ({ page }) => {
    await open(page, 'impact/');
    const first = page.locator('#evidence-ladder tbody tr').first();
    const link = first.locator('th a');
    await expect(link).toHaveCount(1);
    expect(compact(await link.textContent())).toBe(NAME);
    expect(((await link.getAttribute('href')) ?? '').replace(/^\/ctg/, '')).toBe('/impact/independent-evaluation/');
    expect(await first.locator('th [data-evidence]').getAttribute('data-evidence')).toBe('Randomized Trial');
    const shows = compact(await first.locator('td[data-label="What It Shows"]').textContent());
    expect(shows).toBe(`The effect of CodersTrust’s predecessor WSDFM program on women in Dhaka, evaluated by the ${INSTITUTE} against a randomly chosen control group.`);
    const text = await mainText(page);
    expect(count(text, INSTITUTE), 'the institute is spelled out once on Impact').toBe(1);
    expect(count(text, 'BIGD'), 'the abbreviation appears once, in the rung name').toBe(1);
    expect(text).not.toContain('Independent Evaluation by');
    expect(sitePages().filter((p) => visible(p.html).includes('Independent Evaluation by the BRAC')).map((p) => p.route)).toEqual([]);
  });

  test('the name is read from one constant, so the matrix, the cards variant and the compact ladder cannot drift', () => {
    const copy = readFileSync(resolve('src/data/copy.ts'), 'utf8');
    expect(copy).toContain(`export const TRIAL_RUNG_NAME = '${NAME}';`);
    for (const file of ['EvidenceLadder.astro', 'EvidenceLadderCompact.astro']) {
      const source = readFileSync(resolve(`src/components/pages/impact/${file}`), 'utf8');
      expect(source, file).toContain('TRIAL_RUNG_NAME');
      expect(source, file).not.toMatch(/name: '(?:Randomized Trial \(BIGD\)|Independent Evaluation by)|`Independent Evaluation by/);
    }
    // the cards variant prints the name as the link text and as the plain title; neither is the old bare "Randomized Trial"
    const cards = readFileSync(resolve('src/components/pages/impact/EvidenceLadder.astro'), 'utf8');
    expect(cards).toContain('>{TRIAL_RUNG_NAME}<Icon');
    expect(cards).toContain(': TRIAL_RUNG_NAME}</H>');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the shorter rung name does not make Impact scroll sideways, and its link takes keyboard focus`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'impact/');
      const link = page.locator('#evidence-ladder tbody tr').first().locator('th a');
      await link.focus();
      await expect(link).toBeFocused();
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('YouthWIDE: nothing links to the removed bands', () => {
  test('no page links to /programs/youthwide/#cost or #future', () => {
    const stale = builtPages().flatMap((p) => (p.html.match(/href="[^"]*programs\/youthwide\/#(?:cost|future)"/g) ?? []).map((h) => `${p.route}: ${h}`));
    expect(stale).toEqual([]);
  });
});

test.describe('layout', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['', 'programs/', 'programs/youthwide/', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/local-partners/', 'partner-with-us/development-partners/', 'impact/case-studies/wsdfm-women-freelancers/', 'impact/']) {
        await open(page, route);
        expect(await noOverflow(page), `${route || 'home'} at ${vp.width}px`).toBe(true);
      }
    });
  }
});
