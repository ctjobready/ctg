import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { faqs, faqsFor } from '../src/data/faqs';
import { C14, CONTRACTING_ENTITIES, EMPATHY, GOVERNANCE, NEXT_STEPS_TITLE, PROGRAM_SIZES_NOTE, PROGRAM_SIZES_NOTE_BRIEFING, RISK_EYEBROW, TRIAL_RUNG_NAME } from '../src/data/copy';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP49 behaviors (the verified cycle-24 whole-site reviews, items 1-34): the Development Partners problem band and first portfolio card; the Governments, Universities and Local Partners wording; the Foundations cards; YouthWIDE's closing
 * timing paragraph; the JobReady Platform's live-today callout; the NU course pages' "right course" sentence; Mysha K. Diya's attribution; the "Managed Rollout" eyebrow; the Governments briefing wording; the single-tile glance heading;
 * the Impact evidence ladder's first rung; the Home router, closing steps and first-step line; "What Happens Next"; the About meta description; SC-16 "learners trained"; Investors' due-diligence line and eyebrow; Our Model's definition
 * band; the shared "What Happens When Funding Ends?" answer; Home's curriculum line; the OC-05 and RC-06a labels; the Foundations route actions; the Programs card. Retrospective coverage (the owner exempted this project from test-first
 * work); each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp49.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
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
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The built pages that are not archived news posts (those keep their original wording). */
const sitePages = () => builtPages().filter((p) => !p.route.startsWith('/news/'));
const itemOf = (page: Page, question: string) => page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: question }) }).first();
const answerOf = async (page: Page, question: string) => compact(await itemOf(page, question).locator('.faq__a').textContent());
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

const DP = 'partner-with-us/development-partners/';
const GOV = 'partner-with-us/governments/';
const FOUND = 'partner-with-us/foundations/';
const UNI = 'partner-with-us/universities/';
const LOCAL = 'partner-with-us/local-partners/';
const NU = 'programs/nu-postgraduate-diploma/';

test.describe('Development Partners: the problem band and the first portfolio card (items 1 and 5)', () => {
  test('the band is "Show Who Reaches Paid Work"; its cards are "Training Must Connect to Paid Work", "Barriers Can Interrupt Training" and "Outcomes Are Hard to Audit", with their bodies unchanged', async ({ page }) => {
    await open(page, DP);
    await expect(page.locator('#problem h2')).toHaveText('Show Who Reaches Paid Work');
    const heads = ['Show Who Reaches Paid Work', 'Training Must Connect to Paid Work', 'Barriers Can Interrupt Training', 'Outcomes Are Hard to Audit'];
    for (const h of heads) expect(h, h).toBe(titleCase(h));
    expect(await texts(page, '#problem .gp__q')).toEqual(heads.slice(1));
    expect(await texts(page, '#problem .gp__a')).toEqual([
      'Enrollment is easy to count. Paid work is not.',
      'Computer skills, devices, connectivity and social barriers can keep learners from joining or staying.',
      'Without a baseline and documentary evidence, evaluators have little to check.',
    ]);
    expect(sitePages().filter((p) => /Enrollment Targets Are Often Met|Skills Programs Miss Their Employment Targets|The Hardest-to-Reach Groups Drop Out/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  test('the first "What Your Portfolio Gets" card says one delivery partner connects training, mentoring and placement support; the 100 hours per certification are in the delivery model, once', async ({ page }) => {
    await open(page, DP);
    const card = page.locator('#features li.card').first();
    await expect(card.locator('h3')).toHaveText('Training, Mentoring and Placement Support');
    expect(await texts(page, '#features li.card:nth-child(1) p')).toEqual(['One delivery partner connects training, mentoring and placement support.']);
    expect(await card.getAttribute('data-fact')).toBe('PD-01');
    expect(compact(await page.locator('#features').textContent())).not.toContain('100 training hours');
    expect(compact(await page.locator('#mechanism').textContent())).toContain('100 training hours per certification, then three months of milestone-based mentoring and placement support.');
    expect(count(await mainText(page), '100 training hours per certification')).toBe(1);
  });
});

test.describe('Governments, Universities and Local Partners: the wording the reviews asked for (items 2, 3, 4 and 27)', () => {
  test('Governments: the two pain lines say what the agency needs, and "What Your Agency Gets" speaks of completers', async ({ page }) => {
    await open(page, GOV);
    const pain = (title: string) => page.locator('.gp__pains li', { has: page.locator('.gp__q', { hasText: title }) });
    expect(compact(await pain('Training Budgets Do Not Show Up as Earnings').locator('.gp__a').textContent())).toBe('Track who is earning afterward, not only who enrolled.');
    // WP54 (cycle-28 review, GPT-6.1 Sol G2): the heading is "Trainer and Curriculum Capacity Takes Time to Build" (it said "Is Thin"); the line under it is unchanged
    expect(compact(await pain('Trainer and Curriculum Capacity Takes Time to Build').locator('.gp__a').textContent())).toBe('National delivery needs trained facilitators and localized curricula.');
    expect(await texts(page, '#features li.card:nth-child(1) p')).toEqual(['Certification tracks chosen from employer demand, then mentoring and placement support that point completers toward paid work.']);
    const text = await mainText(page);
    expect(text).not.toContain('Budgets are measured by enrollment, not by who is earning afterward.');
    expect(text).not.toContain('rarely ready at national scale');
    expect(text).not.toContain('point graduates toward paid work');
  });

  test('Universities: the institution’s pain says what it needs', async ({ page }) => {
    await open(page, UNI);
    const line = page.locator('.gp__pains li', { has: page.locator('.gp__q', { hasText: 'Build Placement Results You Can Publish' }) }).locator('.gp__a');
    expect(compact(await line.textContent())).toBe('Your institution needs placement data it can report to a board or ministry.');
    expect(await mainText(page)).not.toContain('is rarely collected');
  });

  test('Local Partners: the problem heading, its lead, the track-record band and the third partnership option no longer compare with national programs', async ({ page }) => {
    await open(page, LOCAL);
    await expect(page.locator('#problem h2')).toHaveText('Connect Your Community to Paid Digital Work');
    expect('Connect Your Community to Paid Digital Work').toBe(titleCase('Connect Your Community to Paid Digital Work'));
    // WP50 (cycle-25 review): the problem band's lead is "Connect your community reach with CodersTrust’s curriculum, mentoring, placement support and reporting." (it was "Local organizations often lack ..."; tests/wp50.spec.ts)
    expect(compact(await page.locator('#problem .sh__lead').textContent())).toBe('Pair your community reach with CodersTrust’s curriculum, mentoring, placement support and reporting.');
    // the track-record band opens with its method paragraph, which names the Bangladesh team; its empathy line is gone
    await expect(page.locator('#guide p.lead')).toHaveCount(0);
    expect(compact(await page.locator('#guide .guide__method').textContent())).toContain('CodersTrust Bangladesh, our country office in');
    const offer = compact(await page.locator('#offer').textContent());
    expect(offer).toContain('Mobilize Priority Groups');
    expect(offer).toContain('Mobilize priority groups in your community, with women a priority in every group.');
    expect(offer).toContain('Open your labs or classrooms for blended training, so cohorts meet where young people already are.');
    expect(sitePages().filter((p) => /national programs miss/i.test(visible(p.html))).map((p) => p.route)).toEqual([]);
    expect(Object.keys(EMPATHY)).not.toContain('localPartners');
  });
});

test.describe('Foundations: the first and third "What Your Cohort Grant Gets" cards (items 6 and 25)', () => {
  test('the first card measures results against the agreed scorecard, including first paid work, not attendance alone', async ({ page }) => {
    await open(page, FOUND);
    expect(await texts(page, '#features li.card:nth-child(1) p')).toEqual([
      'Mentoring and placement support are standard inclusions, and outcomes are tracked for 12 months after each course. Results are measured against the agreed scorecard, including first paid work, not attendance alone.',
    ]);
    expect(await mainText(page)).not.toContain('using the agreed scorecard');
  });

  test('the third card is two sentences on PD-08 and PD-18; the scorecard and the due-diligence confirmation are still stated elsewhere on the page', async ({ page }) => {
    await open(page, FOUND);
    const card = page.locator('#features li.card').nth(2);
    await expect(card.locator('h3')).toHaveText('Progress You Can See Every Month');
    expect(await texts(page, '#features li.card:nth-child(3) p')).toEqual(['Monthly reports and quarterly reviews keep progress visible. Where agreed, SDG-mapped reporting follows your CSR framework, with co-branded certificates and events.']);
    expect(((await card.getAttribute('data-fact')) ?? '').split(' ').sort()).toEqual(['PD-08', 'PD-18']);
    // the scorecard: the second card and the Accountability callout; the due-diligence confirmation: the Due Diligence band
    await expect(page.locator('#features li.card:nth-child(2) h3')).toHaveText('A Pilot Scorecard Agreed with You');
    expect(compact(await page.locator('#due-diligence .lead').textContent())).toBe('The contracting entity, safeguarding arrangements and reporting plan are confirmed for your program.');
    const text = await mainText(page);
    expect(text).toContain('For cohort grants, every pilot is judged on cost per completer and per verified outcome');
    expect(text).not.toContain('confirmed in co-design');
  });

  test('the two route actions under "Two Ways to Fund the Path" are text links, not buttons (item 29)', async ({ page }) => {
    await open(page, FOUND);
    const links = page.locator('#mechanism .fr__inquire a');
    await expect(links).toHaveCount(2);
    expect((await texts(page, '#mechanism .fr__inquire a')).map((t) => t.replace(/\(opens.*$/, '').trim())).toEqual(['Discuss a YouthWIDE Cohort Grant', 'Discuss a JobReady Platform Grant']);
    for (const cls of await links.evaluateAll((els) => els.map((e) => e.className))) {
      expect(cls).toMatch(/\blink\b/);
      expect(cls).not.toMatch(/btn/);
    }
    await expect(page.locator('#mechanism .btn')).toHaveCount(0);
  });
});

test.describe('YouthWIDE: the closing timing paragraph (item 7)', () => {
  test('"What Happens Next" has no closing timing paragraph; the step sequence and the timing answer stay, and procurement timing is still stated', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('.next-timing')).toHaveCount(0);
    await expect(page.locator('#next-steps h2')).toHaveText('What Happens Next');
    expect((await texts(page, '#next-steps ol h3')).map((t) => t.replace(/^Step \d+: /, ''))).toEqual(['Briefing or Discovery', 'Co-Design', 'Agreement', 'First Cohort', 'Monthly Reports']);
    const text = await mainText(page);
    expect(text).not.toContain('For grant-funded pilots: Discovery (Week 1)');
    expect(text).not.toContain('Discovery (Week 1)');
    // procurement timing is stated in the Governments entry card and in the timing answer
    expect(compact(await page.locator('#cta-governments .entry__text').textContent())).toBe('Public procurement follows the agency’s own timeline, so we start with a briefing that fits it.');
    expect(await answerOf(page, 'How Fast Can We Start?')).toBe('For grant-funded pilots, allow about three weeks from the first conversation to agreement, then 6–8 weeks from signing to training. Public procurement follows the agency’s own timeline.');
    expect(await itemOf(page, 'How Fast Can We Start?').locator('.faq__a p').getAttribute('data-fact')).toBe('PD-04');
  });
});

test.describe('JobReady Platform: the live-today callout (item 8)', () => {
  test('the "What Is Live Today" label and its paragraph are gone; the status table, the JobReady link and "Planned Adaptive Learning" stay', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const text = await mainText(page);
    expect(text).not.toContain('What Is Live Today');
    expect(text).not.toContain('Adaptive learning remains on the roadmap.');
    expect(sitePages().filter((p) => visible(p.html).includes('What Is Live Today')).map((p) => p.route)).toEqual([]);
    const rows = page.locator('#status tbody tr');
    await expect(rows).toHaveCount(5);
    // the table says the course storefront operates, and that the two marketplaces are in pre-launch
    expect(compact(await rows.first().textContent())).toContain('course storefront operates');
    await expect(rows.filter({ hasText: 'Gig-work (Earn) marketplace' })).toContainText('Pre-Launch');
    await expect(rows.filter({ hasText: 'Employer marketplace' })).toContainText('Pre-Launch');
    await expect(page.locator('#status a', { hasText: 'Visit jobready.global' })).toHaveCount(1);
    await expect(page.locator('#roadmap h2')).toHaveText('Planned Adaptive Learning');
    expect(compact(await page.locator('#roadmap').textContent())).toContain('This is roadmap, not live.');
  });
});

test.describe('NU course pages: "Is This the Right Course for Me?" (item 9)', () => {
  const ELIGIBILITY = 'Honors / Diploma holders with a minimum CGPA of 2.25';
  const modulesOf = (slug: string) => JSON.parse(/^modules: (\[.*\])$/m.exec(readFileSync(resolve(`src/content/nu-pgd/${slug}.md`), 'utf8'))![1]) as string[];

  for (const [slug, sentence, topics] of [
    ['ict', 'Choose ICT if you want to study programming, databases, networks and mobile or web development.', ['Java Programming', 'Database Management Systems', 'Computer Networks Maintenance', 'Mobile Application Development', 'Web Application & Web Site Design']],
    ['digital-marketing', 'Choose Digital Marketing if you want to study SEO, social media, advertising and analytics.', ['Search Engine Optimization (SEO) - Practical', 'Social Media Marketing', 'AdWords & PPC', 'Web & Google Analytics (Practical)']],
  ] as [string, string, string[]][]) {
    test(`${slug}: the answer keeps the eligibility sentence and names what the course teaches, from its own module list`, async ({ page }) => {
      await open(page, `${NU}${slug}/`);
      const text = await mainText(page);
      expect(text).toContain(`Eligibility: ${ELIGIBILITY}. ${sentence} Not right if you want a short self-paced course: see JobReady.global`);
      expect(text).not.toContain('It is right for you if you meet that and want a digital career.');
      // every subject the sentence names is the subject of one of the course's own modules
      for (const m of topics) expect(modulesOf(slug), m).toContain(m);
      const ld = (await faqJsonLd(page)).find((q) => q.name === 'Is This the Right Course for Me?');
      expect(ld?.text).toContain(sentence);
    });
  }

  test('the two course pages no longer share the sentence; the overview keeps its own generic answer', async ({ page }) => {
    await open(page, `${NU}ict/`);
    const ict = await mainText(page);
    await open(page, `${NU}digital-marketing/`);
    const marketing = await mainText(page);
    expect(ict).not.toContain('Choose Digital Marketing');
    expect(marketing).not.toContain('Choose ICT');
    await open(page, NU);
    expect(await mainText(page)).toContain(`Eligibility: ${ELIGIBILITY}. It is right for you if you meet that and want a digital career.`);
  });
});

test.describe('Impact stories: Mysha K. Diya’s attribution (item 10)', () => {
  test('the card reads "Digital Accounting", the course name her own story uses; "Accounting Experts" is gone', async ({ page }) => {
    await open(page, 'impact/stories/');
    const card = page.locator('article.sc', { has: page.locator('.sc__name', { hasText: 'Mysha K. Diya' }) });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.sc__role').textContent())).toBe('Digital Accounting');
    expect(compact(await card.locator('.sc__outcome').textContent())).toContain('Digital Accounting training');
    expect(sitePages().filter((p) => visible(p.html).includes('Accounting Experts')).map((p) => p.route)).toEqual([]);
    // the same course name on the page that shows her quote
    await open(page, 'partner-with-us/employers/');
    expect(await mainText(page)).toContain('Digital Accounting course, CodersTrust Bangladesh');
  });
});

test.describe('The risk-reversal bands: "Managed Rollout" (item 11)', () => {
  const PAGES = [GOV, UNI, 'partner-with-us/employers/', LOCAL, 'programs/youthwide/', 'programs/jobready-campus/', 'programs/jobready-work/'];

  test('every risk-reversal band has one eyebrow, RISK_EYEBROW ("Managed Rollout"), and no page says "Low Risk"', async ({ page }) => {
    expect(RISK_EYEBROW).toBe('Managed Rollout');
    expect(RISK_EYEBROW).toBe(titleCase(RISK_EYEBROW));
    for (const route of PAGES) {
      await open(page, route);
      await expect(page.locator('#risk .eyebrow'), route).toHaveText('Managed Rollout');
    }
    // Development Partners and Foundations have no risk band, so they never carried the eyebrow
    for (const route of [DP, FOUND, '']) {
      await open(page, route);
      await expect(page.locator('#risk'), route || 'home').toHaveCount(0);
    }
    expect(sitePages().filter((p) => /Low Risk/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Governments: the briefing, not a discovery session (items 12, 28 and 33)', () => {
  const COST = 'Pricing is set per program; we share an indicative budget in the discovery session. See what a partnership includes.';
  const COST_GOV = 'Pricing is set per program; we share an indicative budget in the briefing. See what a partnership includes.';

  test('the cost answer says "in the briefing" (a page-level variant, Q8-government), and the JSON-LD says the same words', async ({ page }) => {
    const variant = faqsFor('variants').find((f) => f.id === 'Q8-government')!;
    expect(variant.a).toBe('Pricing is set per program; we share an indicative budget in the briefing.');
    expect(variant.evidence).toEqual(['PD-02']);
    expect(faqs.find((f) => f.id === 'Q8')!.a).toContain('in the discovery session');
    await open(page, GOV);
    expect(await answerOf(page, 'What Does It Cost?')).toBe(COST_GOV);
    expect((await faqJsonLd(page)).find((q) => q.name === 'What Does It Cost?')?.text).toBe(COST_GOV);
    for (const route of [DP, FOUND, UNI]) {
      await open(page, route);
      expect(await answerOf(page, 'What Does It Cost?'), route).toBe(COST);
    }
  });

  test('"Choose Where to Start" opens with the program-sizes note in its briefing variant and no longer repeats the pricing sentence; the note is the same sentence as the shared one but for "briefing"', async ({ page }) => {
    expect(PROGRAM_SIZES_NOTE_BRIEFING).toBe(PROGRAM_SIZES_NOTE.replace('in the discovery session', 'in the briefing'));
    await open(page, GOV);
    expect(compact(await page.locator('#offer .sh__lead').textContent())).toBe(PROGRAM_SIZES_NOTE_BRIEFING);
    expect(await mainText(page)).not.toMatch(/indicative budget in the discovery session|in the discovery session you choose/);
  });

  test('Foundations and Universities, which also carry the cost answer, do not repeat its pricing sentence in their "Choose Where to Start" leads', async ({ page }) => {
    await open(page, FOUND);
    // WP52 (cycle-27 review): the lead is the note alone ("Prefer to fund the platform? See JobReady Platform Grants below." is gone; the funding-route comparison above carries the platform-grant row; tests/wp52.spec.ts)
    expect(compact(await page.locator('#cohort-grants .sh__lead').textContent())).toBe(PROGRAM_SIZES_NOTE);
    await open(page, UNI);
    expect(compact(await page.locator('#offer .sh__lead').textContent())).toBe(PROGRAM_SIZES_NOTE);
    await open(page, DP);
    expect(compact(await page.locator('#offer .sh__lead').textContent())).toBe(PROGRAM_SIZES_NOTE);
    for (const route of [GOV, FOUND, UNI]) {
      await open(page, route);
      expect(compact(await page.locator('#offer .sh__lead, #cohort-grants .sh__lead').first().textContent()), route).not.toContain('Pricing is set per program, and we share an indicative budget');
    }
  });
});

test.describe('Results at a Glance: one secondary tile has no heading of its own (item 13)', () => {
  // WP52 (cycle-27 review, Kimi M2): Development Partners' ">4×" tile is gone (its comparison is the +10.3 tile's note), so its glance is the three lead tiles in one row from 720 px; Governments and Foundations keep their fourth tile
  // (tests/wp52.spec.ts). Each entry: the route, the tiles in order, the rows at 900 and the rows at 390.
  const PAGES: [string, string[], number, number][] = [
    [DP, ['RC-02', 'OC-01', 'PR-03'], 1, 3],
    [GOV, ['GV-12', 'PR-05', 'RC-02', 'PR-02'], 2, 4],
    [FOUND, ['RC-04', 'OC-03', 'PR-02', 'RC-02'], 2, 4],
  ];

  for (const [route, ids, rows900, rows390] of PAGES) {
    test(`${route}: ${ids.length} tiles in the main group, no "More Results" heading, each tile tagged; one row at 1280, ${rows900} at 900, ${rows390} at 390`, async ({ page }) => {
      await open(page, route);
      expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(ids);
      await expect(page.locator('#glance h3')).toHaveCount(0);
      await expect(page.locator('#glance .pg__more')).toHaveCount(0);
      expect(compact(await page.locator('#glance').textContent())).not.toContain('More Results');
      await expect(page.locator('#glance .pg__lead .evidence-tag')).toHaveCount(ids.length);
      const tops = () => page.locator('#glance .pg__lead > li').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      await page.setViewportSize(DESKTOP);
      expect(new Set(await tops()).size, 'one row at 1280').toBe(1);
      await page.setViewportSize({ width: 900, height: 900 });
      expect(new Set(await tops()).size, `${rows900} row(s) at 900`).toBe(rows900);
      await page.setViewportSize(MOBILE);
      expect(new Set(await tops()).size, `${rows390} rows at 390`).toBe(rows390);
      expect(await noOverflow(page)).toBe(true);
    });
  }

  test('the component keeps the heading where it introduces several tiles (the rule is in PartnerGlance itself)', () => {
    const source = readFileSync(resolve('src/components/pages/partners/PartnerGlance.astro'), 'utf8');
    expect(source).toContain('const single = moreTiles.length === 1;');
    expect(source).toContain('const groupedTiles = single ? [] : moreTiles;');
    expect(source).toContain('groupedTiles.length > 0');
    expect(source).toContain('{moreTitle}');
  });
});

test.describe('Impact evidence ladder: the first rung (item 14)', () => {
  test('the rung is "Independent Evaluation (BIGD)" with the "Randomized Trial" tag, so the type is printed once; the institute is spelled out once, in the row text', async ({ page }) => {
    expect(TRIAL_RUNG_NAME).toBe('Independent Evaluation (BIGD)');
    await open(page, 'impact/');
    const first = page.locator('#evidence-ladder tbody tr').first();
    expect(compact(await first.locator('th a').textContent())).toBe('Independent Evaluation (BIGD)');
    expect(await first.locator('th [data-evidence]').getAttribute('data-evidence')).toBe('Randomized Trial');
    expect(count(compact(await first.locator('th').textContent()), 'Randomized Trial'), 'the type once in the row header').toBe(1);
    expect(compact(await first.locator('td[data-label="What It Shows"]').textContent())).toContain('evaluated by the BRAC Institute of Governance and Development against a randomly chosen control group');
    const text = await mainText(page);
    expect(count(text, 'BRAC Institute of Governance and Development')).toBe(1);
    expect(sitePages().filter((p) => visible(p.html).includes('Independent Randomized Trial (BIGD)')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Home: the router card, the closing steps and the first-step line (items 15, 31 and 32)', () => {
  const DESCRIPTIONS = [
    'A conversation about your goals, priority groups and timeline.',
    'We shape tracks, cohorts, safeguarding and reporting with you.',
    'Scope, schedule and the pilot scorecard are agreed.',
    'The first cohort begins training; monthly reports follow.',
  ];

  // WP50 (cycle-25 review, item 14): the card's text is "Back the staged rollout of JobReady, CodersTrust’s digital education and employment platform." (it was "Back JobReady, the platform we are building to connect emerging-market youth to work."; tests/wp50.spec.ts)
  // WP53 (owner decision 2026-10-16): IN-04's definition is "CodersTrust’s digital learning and earning platform", so the card reads "... digital learning and earning platform." (tests/wp53.spec.ts)
  test('the investor card is "Investors" (the menu, the footer and the hub use it) and keeps "Back ..."', async ({ page }) => {
    await open(page, '');
    expect(await texts(page, '#router .cat__title')).toEqual(['Development Partners and NGOs', 'Governments', 'Foundations and CSR', 'Investors']);
    const card = page.locator('#router a.cat[href$="partner-with-us/investors/"]');
    expect(compact(await card.locator('.cat__text').textContent())).toBe('Back the staged rollout of JobReady, CodersTrust’s digital learning and earning platform.');
    expect(sitePages().filter((p) => /cat__title[^>]*>\s*Impact Investors/.test(p.html)).map((p) => p.route)).toEqual([]);
  });

  test('the four closing steps carry the hub’s one-line descriptions (one shared source), and the "Your First Step" panel does not say "first step" twice', async ({ page }) => {
    await open(page, '');
    expect(await texts(page, '#next-steps .steps__text')).toEqual(DESCRIPTIONS);
    expect((await texts(page, '#next-steps ol h3')).map((t) => t.replace(/^Step \d+: /, ''))).toEqual(['Discovery (Week 1)', 'Co-Design (Week 2)', 'Agreement (Week 3)', 'Training Starts 6–8 Weeks After Signing']);
    expect(await texts(page, '#next-steps .ns__note--first p')).toEqual(['Your First Step', C14.firstActionLabeled]);
    expect(C14.firstActionLabeled).toBe('A discovery session. In your inquiry, include two suitable times.');
    await open(page, 'partner-with-us/');
    expect(await texts(page, '#how-partnering-works .steps__text')).toEqual(DESCRIPTIONS);
  });

  test('the audience pages, where no "Your First Step" heading precedes the line, keep the full sentence', async ({ page }) => {
    await open(page, DP);
    expect(compact(await page.locator('#reinforce .rf__first').textContent())).toBe(C14.firstAction);
    expect(C14.firstAction).toBe('Your first step: a discovery session. In your inquiry, include two suitable times for a discovery conversation.');
  });
});

test.describe('"What Happens Next" (item 16)', () => {
  test('the C14 band of the six pages that said "What Happens After You Say Yes" is headed by NEXT_STEPS_TITLE; no page keeps the old heading', async ({ page }) => {
    expect(NEXT_STEPS_TITLE).toBe('What Happens Next');
    for (const route of [DP, GOV, FOUND, UNI, 'partner-with-us/employers/', LOCAL]) {
      await open(page, route);
      await expect(page.locator('#next-steps h2'), route).toHaveText('What Happens Next');
    }
    expect(sitePages().filter((p) => visible(p.html).includes('What Happens After You Say Yes')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('About: the meta description (item 17)', () => {
  // WP52 (cycle-27 review, GLM m4): it names the group as ID-01 does ("educated, unemployed and underemployed youth") and opens with the year: 153 characters, within the 155 limit (tests/wp52.spec.ts)
  test('it reads "Since 2014, New York-headquartered CodersTrust has trained ... in 16 countries and territories." within 155 characters, in the meta description and in og:description', async ({ page }) => {
    await open(page, 'about/');
    const D = 'Since 2014, New York-headquartered CodersTrust has trained educated, unemployed and underemployed youth for digital work in 16 countries and territories.';
    expect(D.length).toBe(153);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe(D);
    expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(D);
  });
});

test.describe('SC-16 reads "learners trained" (item 18)', () => {
  test('the register, Home, Impact and the partner hub say "learners trained"; no page says "young people trained"', async ({ page }) => {
    const sc16 = fact('SC-16');
    expect(sc16.text).toBe('130,000+ learners trained through 150,000+ enrollments in 16 countries and territories since 2014');
    expect(sc16.stat?.label).toBe('learners trained through 150,000+ enrollments in 16 countries and territories since 2014');
    expect(sc16.stat?.glance?.label).toBe('learners trained since 2014');
    expect(sc16.stat?.glance?.note).toBe('Through 150,000+ enrollments across 16 countries and territories.');
    expect(sc16.stat?.value).toBe('130,000+');
    await open(page, '');
    expect(compact(await page.locator('.hh__card[data-fact="SC-16"]').textContent())).toContain('learners trained through 150,000+ enrollments in 16 countries and territories since 2014');
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance a[data-fact~="SC-16"]').textContent())).toContain('learners trained since 2014');
    await open(page, 'partner-with-us/');
    await expect(page.locator('#why-partner li').nth(2).locator('.wp__desc')).toHaveText('learners trained since 2014');
    expect(sitePages().filter((p) => /young people trained/i.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Investors: the due-diligence line and the eyebrow (items 20 and 34)', () => {
  test('the band "What Happens After You Ask" has the eyebrow "Next Steps" and one due-diligence line that names the contracting entities as the register does and links Governance and Accountability', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#offer .eyebrow').first()).toHaveText('Next Steps');
    await expect(page.locator('#offer h2')).toHaveText('What Happens After You Ask');
    const line = page.locator('#offer .io__diligence');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(`Due diligence: CodersTrust contracts through ${CONTRACTING_ENTITIES}. Governance and Accountability`);
    expect(await line.getAttribute('data-fact')).toBe('ID-07 PD-13');
    expect((await line.locator('a').getAttribute('href')) ?? '').toMatch(/\/about\/governance\/$/);
    // the names are the register's (ID-07), and the Governance hero reads the same phrase (one constant)
    expect(fact('ID-07').text).toContain('CT USA, Inc.');
    expect(fact('ID-07').text).toContain('CodersTrust Bangladesh Ltd.');
    expect(CONTRACTING_ENTITIES).toBe('CT USA, Inc. in the United States or CodersTrust Bangladesh Ltd. in Bangladesh');
    expect(GOVERNANCE.text.startsWith(`CodersTrust contracts through ${CONTRACTING_ENTITIES};`)).toBe(true);
    await open(page, 'about/governance/');
    expect(await mainText(page)).toContain(`CodersTrust contracts through ${CONTRACTING_ENTITIES};`);
  });
});

test.describe('Our Model: the definition band (item 21)', () => {
  test('it carries ID-01 alone; PX-01 stays on Home and the audience pages', async ({ page }) => {
    await open(page, 'our-model/');
    expect(compact(await page.locator('#definition .def__text').textContent())).toBe(fact('ID-01').text);
    await expect(page.locator('#definition p')).toHaveCount(1);
    expect(compact(await page.locator('#definition').textContent())).not.toContain('62 million');
    for (const route of ['', DP, GOV, FOUND]) {
      await open(page, route);
      await expect(page.locator('#problem [data-fact="PX-01"]'), route || 'home').toHaveCount(1);
    }
  });
});

test.describe('"What Happens When Funding Ends?" (item 22)', () => {
  const ENDING = 'completers join CodersTrust’s alumni network after their three months of mentoring.';

  test('Q10 and Q10-campus end after the alumni-network clause; the TalentLEAP clause and its fact are gone', () => {
    const q10 = faqs.find((f) => f.id === 'Q10')!;
    expect(q10.a).toBe(`Where included in the program scope, what the program builds stays in place: certified local facilitators and localized curricula, and ${ENDING}`);
    expect(q10.evidence).toEqual(['PD-06', 'PD-01']);
    const campus = faqsFor('variants').find((f) => f.id === 'Q10-campus')!;
    expect(campus.a).toBe('Where included in the program scope, what the program builds stays on your campus: certified local facilitators, localized curricula and campus labs that serve as blended-learning centers. Completers join CodersTrust’s alumni network after their three months of mentoring.');
    expect(campus.evidence).toEqual(['PD-06', 'PD-01']);
  });

  test('every page that carries the answer prints it whole, with its JSON-LD; no page keeps the TalentLEAP clause', async ({ page }) => {
    for (const route of [DP, GOV, FOUND, LOCAL, 'our-model/talentleap/', 'about/governance/']) {
      await open(page, route);
      const answer = await answerOf(page, 'What Happens When Funding Ends?');
      expect(answer.endsWith(ENDING), route).toBe(true);
      expect(answer, route).not.toContain('TalentLEAP');
      expect((await faqJsonLd(page)).find((q) => q.name === 'What Happens When Funding Ends?')?.text, route).toBe(answer);
    }
    expect(sitePages().filter((p) => visible(p.html).includes('TalentLEAP is designed to organize skills into career paths')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Home: the curriculum line (item 23)', () => {
  test('"Tracks Chosen from Employer Demand" says "A curriculum designed to follow the skills employers ask for as entry-level tasks change."; no page keeps "An AI-ready curriculum is designed to follow"; the AI-ready positioning stays where it is explained', async ({ page }) => {
    await open(page, '');
    const card = page.locator('#features li.card').nth(2);
    await expect(card.locator('h3')).toHaveText('Tracks Chosen from Employer Demand');
    expect(await texts(page, '#features li.card:nth-child(3) p')).toEqual(['A curriculum designed to follow the skills employers ask for as entry-level tasks change.']);
    expect(sitePages().filter((p) => visible(p.html).includes('An AI-ready curriculum is designed to follow')).map((p) => p.route)).toEqual([]);
    await open(page, 'partner-with-us/employers/');
    expect(await mainText(page)).toContain('An AI-ready curriculum, designed to prepare people to work with AI tools.');
    await open(page, 'programs/youthwide/');
    expect(await mainText(page)).toContain('AI-Ready Training, Certification Preparation and Mentoring');
  });
});

test.describe('The OC-05 and RC-06a labels (items 24 and 26)', () => {
  test('OC-05 says "surveyed new earners" in its stat and glance labels, keeps the full definition in its text, and the Outcomes page defines the term once', async ({ page }) => {
    const oc05 = fact('OC-05');
    expect(oc05.stat?.label).toBe('of the 170 surveyed new earners had started earning by six months after finishing the course (October 2026 survey)');
    expect(oc05.stat?.glance?.label).toBe('of the 170 surveyed new earners had started earning by six months after finishing the course, including 23.5% who first earned during the course');
    expect(oc05.text).toBe('Among the 170 surveyed completers who first earned during or after training: 23.5% first earned during the course; 58.8% had started earning by six months after finishing it; 77.1% by a year; 90.6% by two years (cumulative)');
    expect(oc05.stat?.value).toBe('58.8%');
    await open(page, 'impact/outcomes-2026/');
    const text = await mainText(page);
    expect(count(text, 'Surveyed new earners are the completers who first earned during or after training.'), 'the definition, once').toBe(1);
    expect(compact(await page.locator('#speed p').first().textContent())).toBe('Surveyed new earners are the completers who first earned during or after training.');
    expect(compact(await page.locator('#speed p[data-fact="OC-05"]').textContent())).toContain(oc05.text);
    expect(compact(await page.locator('#summary [data-fact="OC-05"]').textContent())).toContain('surveyed new earners');
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance a[data-fact~="OC-05"]').textContent())).toContain('surveyed new earners');
    await open(page, '');
    // WP53 (owner decision 2026-10-16): Home's survey slide (slide 3) states it in its body line (it was the speed slide's tile). WP54 (cycle-28 reviews, Claude S23 and GLM L1): that line leads with its base and no longer uses the term
    expect(compact(await page.locator('[data-hs-slide]').nth(2).locator('.hs__lead').textContent())).toContain('Of the 170 surveyed completers who first earned during or after training, 58.8% had started earning by six months after finishing the course');
  });

  // WP52 (cycle-27 review, Kimi M2): Development Partners no longer shows a ">4×" tile; the register's glance label is the source of the +10.3 tile's note ("More than four times the 2.3-point average across nine vocational-training trials."; tests/wp52.spec.ts)
  test('RC-06a’s glance label states the ratio ("was more than four times the 2.3-point average"); the ">4×" value is unchanged; Development Partners’ +10.3 tile quotes it as its note', async ({ page }) => {
    const rc06a = fact('RC-06a');
    expect(rc06a.stat?.glance?.label).toBe('The employment effect for women offered a place was more than four times the 2.3-point average across nine vocational-training trials');
    expect(rc06a.stat?.value).toBe('>4×');
    await open(page, DP);
    await expect(page.locator('#glance a[data-fact="RC-06a"]')).toHaveCount(0);
    const tile = page.locator('#glance a[data-fact~="RC-06a"]');
    await expect(tile.locator('.pg__value')).toContainText('+10.3');
    await expect(tile.locator('.pg__note')).toHaveText('More than four times the 2.3-point average across nine vocational-training trials.');
  });
});

test.describe('Programs: the JobReady@Campus card (item 30)', () => {
  test('it says "a supported route to industry certification beside the degree", and JobReady@Campus does prepare for industry certification exams', async ({ page }) => {
    await open(page, 'programs/');
    const text = await mainText(page);
    expect(text).toContain('Students get a supported route to industry certification beside the degree.');
    expect(text).not.toContain('recognized credential');
    await open(page, 'programs/jobready-campus/');
    const campus = await mainText(page);
    expect(campus).toContain('Industry certification exam preparation by track');
    expect(campus).toContain('Preparation for industry-recognized certifications');
  });
});

test.describe('layout', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`the changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['', 'about/', 'impact/', 'impact/stories/', 'impact/outcomes-2026/', 'our-model/', 'our-model/jobready-platform/', 'partner-with-us/', DP, GOV, FOUND, UNI, LOCAL, 'partner-with-us/investors/', 'programs/', 'programs/youthwide/', `${NU}ict/`, `${NU}digital-marketing/`]) {
        await open(page, route);
        expect(await noOverflow(page), `${route || 'home'} at ${vp.width}px`).toBe(true);
      }
    });
  }
});
