import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP39 behaviors (cycle-16 whole-site reviews, GPT-6.1 Sol): "What You Get" is three short cards on every audience and program page that had the concern / inclusion / benefit matrix (one shared component, IncludesBand, which
 * Home already used), the partner hub's reporting line is scoped to supported cohorts, the Universities Guide band no longer repeats the National University sentence, Investors' platform-status question points to "What
 * JobReady Does" and the page carries no "Our Approach" statement, the Governments contracts column reads "Training Figure", YouthWIDE's hero lead is one sentence and its entry-point chooser has one agenda line, the NU
 * course pages answer "What Will I Be Able to Do After This Course?" in two plain sentences, Home's income slide and SuperKids' agreements band have shorter headings. Retrospective coverage (the owner exempted this
 * project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp39.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** The ids of the page's bands, in order, with whether each is a dark one. */
const bands = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main .band[id]')).map((b) => ({ id: b.id, dark: /band--(klein|deep-ink)/.test(b.className) })));

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

interface CardSpec {
  title: string;
  text: string;
  facts: string[];
  /** The ranked pain the card answers (Local Partners only here: Home is not in this list, and YouthWIDE has had no C8 band since WP57). */
  pain?: string;
}
interface PageSpec {
  route: string;
  h2: string;
  cards: CardSpec[];
}

const SCOPE_RESULTS = 'Follow-up surveys, monthly reports and documentary evidence where available, as agreed in the program scope, give your institution outcome data it can report.';
const CERT_AND_MENTORING = 'Industry certification exam preparation by track, followed by three months of milestone-based mentoring toward a first client or a first job.';
const EMPLOYER_SKILLS = 'Tracks are set from employer demand in an AI-ready curriculum, built around the skills employers say they cannot find.';

/** The three cards of each page's "What You Get" band, in the order of the page's three pains. Each page's cards are derived from the rows its matrix had (cycle-16 review, item 1). */
const PAGES: PageSpec[] = [
  {
    route: 'partner-with-us/development-partners/',
    h2: 'What Your Portfolio Gets',
    cards: [
      // WP49 (cycle-24 review): the 100 hours per certification stay in the delivery model above (tests/wp49.spec.ts); WP65 (cycle-37 review, Gemini, Sonnet): "CodersTrust connects training, mentoring and placement support in one program." (it said "One delivery partner connects ...")
      { title: 'Training, Mentoring and Placement Support', text: 'CodersTrust connects training, mentoring and placement support in one program.', facts: ['PD-01'] },
      { title: 'Accessible Local Delivery', text: 'Outreach, accessible selection and tracks chosen from employer demand, with safeguarding agreed for each program.', facts: ['PD-02', 'PD-10', 'PD-12'] },
      { title: 'Progress Your Evaluators Can Check', text: 'Baseline data, follow-up surveys and monthly reports, with documentary evidence where available, as agreed in the program scope.', facts: ['PD-08', 'PD-09'] },
    ],
  },
  {
    route: 'partner-with-us/governments/',
    h2: 'What Your Agency Gets',
    cards: [
      // WP49 (cycle-24 review): "completers", the site's word for people who finished a program (it said "graduates"); WP62 (cycle-34 review, Gemini): "... placement support toward local, remote and global work." (it said "... that point completers toward paid work.")
      { title: 'Certification Tracks and Placement Support', text: 'Certification tracks chosen from employer demand, then mentoring and placement support toward local, remote and global work.', facts: ['PD-10', 'PD-01'] },
      { title: 'Spending Measured Against Outcomes', text: 'A pilot scorecard with cost per completer and per verified outcome, and monthly reports. Your budget is assessed against the agreed scorecard.', facts: ['PD-11', 'PD-08'] },
      {
        title: 'Capacity Designed to Stay in Your System',
        // WP60 (cycle-32 review, Gemini GM5): the list opens "Where included in your program scope:" (it read as unconditional)
        text: 'Where included in your program scope: Training of Trainers, curriculum and manuals; certified local facilitators; and blended learning in existing labs that works with limited connectivity, so rural labs can take part.',
        facts: ['GV-11', 'PD-06', 'PD-07'],
      },
    ],
  },
  {
    route: 'partner-with-us/foundations/',
    h2: 'What Your Cohort Grant Gets',
    cards: [
      {
        title: 'Mentoring, Placement Support and Outcome Tracking',
        // WP49 (cycle-24 review): the scorecard also covers completion, certification and sustained work (PD-11), so results are measured against it, "including first paid work, not attendance alone"
        text: 'Mentoring and placement support are standard inclusions, and outcomes are tracked for 12 months after each course. Results are measured against the agreed scorecard, including first paid work, not attendance alone.',
        facts: ['PD-01', 'PD-02', 'PD-11'],
      },
      { title: 'A Pilot Scorecard Agreed with You', text: 'Cost per completer and per verified outcome, with thresholds agreed before the first cohort starts.', facts: ['PD-11'] },
      {
        title: 'Progress You Can See Every Month',
        // WP49 (cycle-24 review): two sentences; the scorecard and the contracting entity and due-diligence confirmation are stated elsewhere on the page (the first two cards, the Due Diligence band), so the card rests on PD-08 and PD-18 alone
        text: 'Monthly reports and quarterly reviews keep progress visible. Where agreed, SDG-mapped reporting follows your CSR framework, with co-branded certificates and events.',
        facts: ['PD-08', 'PD-18'],
      },
    ],
  },
  {
    route: 'partner-with-us/universities/',
    h2: 'What Your Students Get',
    cards: [
      { title: 'Certification Exam Preparation and Mentoring', text: CERT_AND_MENTORING, facts: ['PD-02', 'PD-01'] },
      { title: 'Skills Employers Ask For', text: EMPLOYER_SKILLS, facts: ['PD-10', 'PD-02'] },
      { title: 'Placement Results You Can Discuss', text: SCOPE_RESULTS, facts: ['PD-08', 'PD-09'] },
    ],
  },
  {
    route: 'partner-with-us/employers/',
    h2: 'What Your Business Gets',
    cards: [
      { title: 'Job-Ready Candidates for Your Roles', text: 'Access to candidates from CodersTrust’s placement team for your roles, plus trainees from employer-demand certification tracks.', facts: ['IN-04', 'PD-10'] },
      { title: 'AI Content Agreed Before Enrollment', text: 'An AI-ready curriculum, designed to prepare people to work with AI tools. Each track’s AI content and work-entry plan are agreed before enrollment.', facts: ['PD-02', 'PD-19'] },
      { title: 'Customized Curriculum and Workshops', text: 'JobReady@Work builds a customized curriculum and interactive workshops, so your team learns on tasks from your own roles.', facts: ['IN-10'] },
    ],
  },
  {
    route: 'partner-with-us/local-partners/',
    h2: 'What Your Community Gets',
    cards: [
      {
        title: 'Certified Facilitators and a Local Curriculum',
        // WP52 (cycle-27 review): what stays after funding ends is scoped ("Where included in the program scope, ..."); it read "Local capacity stays after a funded cohort ends, ..."
        text: 'Certified-facilitator training, a localized curriculum and preparation for industry certification. You do not have to build the curriculum or certification route yourself.',
        facts: ['PD-06', 'PD-02'],
        pain: 'P1',
      },
      {
        title: 'Mentoring and Placement Support',
        text: 'Three months of milestone-based mentoring, with placement support alongside, gives your completers a route into work that your organization does not have to build alone.',
        facts: ['PD-01', 'PD-15'],
        pain: 'P2',
      },
      {
        title: 'Monthly Reports and Program Updates',
        text: 'Where a funder is involved, it receives monthly reports, and your organization receives agreed program updates on enrollment, completion, certification and placement.',
        facts: ['PD-08'],
        pain: 'P3',
      },
    ],
  },
  // WP57 (cycle-29 review, GPT-6.1 Sol G2): YouthWIDE's three-card band ("Built Around What Funders and Agencies Ask") is gone; tests/wp57.spec.ts holds the page to having no C8 band and its Reporting row
  {
    route: 'programs/jobready-campus/',
    h2: 'Built Around What Institutions Ask For',
    cards: [
      { title: 'Certification Exam Preparation and Mentoring', text: CERT_AND_MENTORING, facts: ['PD-02', 'PD-01'] },
      { title: 'Skills Employers Ask For', text: EMPLOYER_SKILLS, facts: ['PD-10', 'PD-02'] },
      { title: 'Placement Evidence You Can Report', text: SCOPE_RESULTS, facts: ['PD-08', 'PD-09'] },
    ],
  },
];

const MATRIX_LABELS = /Funder Concern Addressed|Concern Addressed|What Is Included|Practical Benefit|Added Benefit/;

test.describe('"What You Get" is three short cards on every audience and program page (item 1), not a concern / inclusion / benefit matrix', () => {
  for (const p of PAGES) {
    test(`${p.route}: "${p.h2}" is three cards, each a Title Case heading and its sentences, tied to its register facts`, async ({ page }) => {
      await open(page, p.route);
      await expect(page.locator('#features h2')).toHaveText(p.h2);
      await expect(page.locator('#features .eyebrow')).toHaveText('What You Get');
      const cards = page.locator('#features li.card');
      await expect(cards).toHaveCount(3);
      for (const [i, c] of p.cards.entries()) {
        const card = cards.nth(i);
        await expect(card.locator('h3'), c.title).toHaveText(c.title);
        expect(c.title, 'a card heading is in Title Case').toBe(titleCase(c.title));
        expect(await texts(page, `#features li.card:nth-child(${i + 1}) p`), c.title).toEqual([c.text]);
        expect(((await card.getAttribute('data-fact')) ?? '').split(' ').sort(), c.title).toEqual([...c.facts].sort());
        expect(await card.getAttribute('data-relieves'), `${c.title}: the ranked pain it answers`).toBe(c.pain ?? null);
      }
      expect(compact(await page.locator('#features').textContent())).not.toMatch(MATRIX_LABELS);
      await expect(page.locator('#features .fc__card')).toHaveCount(0);
    });
  }

  test('each card sentence opens with a capital letter or a figure and does not open by repeating its own heading', async ({ page }) => {
    for (const p of PAGES) {
      await open(page, p.route);
      const lines = await texts(page, '#features .card__text');
      expect(lines.length, p.route).toBe(3);
      for (const [i, l] of lines.entries()) {
        expect(l, `${p.route}: "${l.slice(0, 40)}…"`).toMatch(/^[A-Z0-9]/);
        expect(l.toLowerCase().startsWith(p.cards[i].title.toLowerCase()), `${p.route}: card ${i + 1} opens with its heading`).toBe(false);
      }
    }
  });

  // WP57 (cycle-29 review, GPT-6.1 Sol G2): YouthWIDE has no C8 band any more, so only Local Partners keeps the one-to-one map; YouthWIDE states its three ranked pains in C2 alone (tests/wp57.spec.ts)
  test('Local Partners keeps its one-to-one map: three ranked pains in C2, three cards in C8, P1 to P3 in order', async ({ page }) => {
    for (const route of ['partner-with-us/local-partners/']) {
      await open(page, route);
      const pains = await page.locator('#problem [data-pain]').evaluateAll((els) => els.map((e) => e.getAttribute('data-pain')));
      const relieves = await page.locator('#features [data-relieves]').evaluateAll((els) => els.map((e) => e.getAttribute('data-relieves')));
      expect(pains, route).toEqual(['P1', 'P2', 'P3']);
      expect(relieves, route).toEqual(['P1', 'P2', 'P3']);
    }
  });

  // WP40 (cycle-17 review): Investors' status table became three cards too, so no page keeps the table and its component is gone (tests/wp40.spec.ts holds Investors' cards)
  test('no page keeps the concern / inclusion / benefit table any more; Investors states its status in three cards', async ({ page }) => {
    const withTable = listPages()
      .filter((p) => /class="fc__card/.test(readFileSync(p.file, 'utf8')))
      .map((p) => p.route);
    expect(withTable).toEqual([]);
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#features h2')).toHaveText('What JobReady Does');
    await expect(page.locator('#features .fc__card')).toHaveCount(0);
    await expect(page.locator('#features li.card')).toHaveCount(3);
    expect(compact(await page.locator('#features').textContent())).not.toContain('Concern Addressed');
  });

  test('the band keeps its id and its place, and no two dark bands meet', async ({ page }) => {
    for (const p of PAGES) {
      await open(page, p.route);
      const order = await bands(page);
      const ids = order.map((b) => b.id);
      expect(ids, p.route).toContain('features');
      expect(ids.indexOf('features'), `${p.route}: the band comes after the evidence and before the questions`).toBeLessThan(ids.indexOf('faq') === -1 ? ids.length : ids.indexOf('faq'));
      for (let i = 1; i < order.length; i++) expect(order[i].dark && order[i - 1].dark, `${p.route}: ${order[i - 1].id} then ${order[i].id}`).toBe(false);
    }
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the cards sit in one row of three (1280) or stack (390) and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const p of PAGES) {
        await open(page, p.route);
        const tops = await page.locator('#features li.card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
        if (vp.width >= 1024) expect(new Set(tops).size, `${p.route}: one row of three`).toBe(1);
        else expect(new Set(tops).size, `${p.route}: one card per row`).toBe(3);
        const pad = await page.locator('#features').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
        expect(pad, `${p.route}: bottom padding of the band`).toBeGreaterThanOrEqual(40);
        expect(await noOverflow(page), `${p.route} at ${vp.width}px`).toBe(true);
      }
    });
  }
});

// WP39 (cycle-16 review) scoped the hub's reporting band ("Monthly Reports and Quarterly Reviews", #review-cycle) to supported cohorts; WP45 (cycle-21 review) removed the band from the hub (the due-diligence view and the route pages
// state the reporting), so the hub carries no reporting line and the two route pages that linked to the band keep their sentence without the link (tests/wp45.spec.ts, tests/wp40.spec.ts)
test.describe('Partner with Us hub: no reporting band, and no page links to one (item 2, WP45)', () => {
  test('the hub has no "Monthly Reports and Quarterly Reviews" band and does not say "A quarterly review with you decides"', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('#review-cycle')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Monthly Reports and Quarterly Reviews');
    expect(await mainText(page)).not.toContain('A quarterly review with you decides');
  });

  // WP48 (cycle-23 review): Foundations' "Reporting and Review" callout is gone (its card says the same); Development Partners keeps its scoped sentence
  test('the route pages that linked to the band no longer link to it; Development Partners keeps its scoped sentence', async ({ page }) => {
    for (const route of ['partner-with-us/development-partners/', 'partner-with-us/foundations/']) {
      await open(page, route);
      expect((await hrefs(page, 'main a')).some((h) => h.includes('#review-cycle')), route).toBe(false);
    }
    await open(page, 'partner-with-us/development-partners/');
    expect(await mainText(page)).toContain('For supported cohorts, monthly reports track progress; quarterly reviews, as agreed in the program scope, guide corrective action and any expansion.');
  });
});

test.describe('Universities: the Guide band does not repeat the National University sentence (item 3)', () => {
  // WP66 (owner request 2026-10-20): the band has a proof column again, with one line, the signed-agreements sentence for universities and colleges (SC-11b); it is not the NU sentence, which the first band still states once (tests/wp66.spec.ts)
  test('the band keeps its origin line, its TalentLEAP line and its logos, and its one proof line is the signed-agreements sentence, not the NU relationship', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    const guide = page.locator('#guide');
    const text = compact(await guide.textContent());
    expect(text).not.toContain('official training partner');
    expect(text).toContain('From a Copenhagen launch to work in 16 countries and territories.'); // WP64 rework RW2 (coordinator): the heading says "Since 2014", so the line does not
    // WP46 (cycle-22 review): "with progressive levels" is gone from the Track Record bands (only the first level is published)
    expect(text).toContain('JobReady@Campus runs training in parallel with academic studies, and TalentLEAP organizes skills into career paths.');
    await expect(guide.getByRole('link', { name: 'How TalentLEAP Works' })).toHaveCount(1);
    await expect(guide.locator('.partners__row img'), 'the logo strip stays: National University, UPEACE and CCNY').toHaveCount(3);
    await expect(guide.locator('.pg__proof')).toHaveCount(1);
    await expect(guide.locator('.pg--solo')).toHaveCount(0);
    expect(await texts(page, '#guide .pg__list li')).toEqual(['CodersTrust has signed MOUs, agreements or contracts with 20 universities and colleges.']);
  });

  test('"Our University Partnerships" band still states the relationship, once on the page', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#offer-evidence h2')).toHaveText('Our University Partnerships');
    await expect(page.locator('#offer-evidence .pe__item')).toHaveCount(3);
    expect(compact(await page.locator('#offer-evidence').textContent())).toContain('CodersTrust has been NU’s official training partner for digital career skills and credentials since 2023');
    expect(count(await mainText(page), 'since 2023'), 'the relationship is stated once, in the NU band').toBe(1);
  });

  test('the copy stays inside the page at both widths, and every Guide band has its proof column (Universities since WP66)', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/universities/');
      const width = await page.locator('#guide .pg__copy').evaluate((el) => el.getBoundingClientRect().width);
      expect(width, `${vp.width}px`).toBeLessThanOrEqual(vp.width);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
    for (const route of ['partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/employers/', 'partner-with-us/development-partners/', 'partner-with-us/universities/']) {
      await open(page, route);
      await expect(page.locator('#guide .pg__proof'), route).toHaveCount(1);
    }
    await open(page, 'partner-with-us/governments/');
    expect(compact(await page.locator('#guide').textContent())).toContain('National University’s official training partner');
  });
});

test.describe('Investors: the platform-status question points to "What JobReady Does", and there is no "Our Approach" statement (items 4 and 5)', () => {
  const ANSWER = 'Partly. See What JobReady Does above for the live, pre-launch and planned capabilities.';

  test('the first question answers "Partly." and links "What JobReady Does" to the section above it; the JSON-LD carries the same words', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: 'Is the JobReady Platform Live?' }) }).first();
    expect(compact(await item.locator('.faq__a').textContent())).toBe(ANSWER);
    const link = item.locator('.faq__a a');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('What JobReady Does');
    const href = await link.getAttribute('href');
    expect(href).toBe('#features');
    await expect(page.locator(href!)).toHaveCount(1);
    await expect(page.locator(`${href} h2`)).toHaveText('What JobReady Does');
    expect(await item.locator('.faq__a p').getAttribute('data-fact')).toBe('IN-04');
    const ld = (await faqJsonLd(page)).find((q) => q.name === 'Is the JobReady Platform Live?');
    expect(ld?.text).toBe(ANSWER);
    expect(compact(await page.locator('main').textContent())).toContain(ANSWER);
  });

  // WP41 (cycle-18 review): the platform page points to its "Rollout Status" band the same way (tests/wp41.spec.ts), so the shared answer is in full on Employers and JobReady@Work only
  test('the shared answer stays in full wherever else it is asked (Employers, JobReady@Work); Investors no longer lists the status a third time', async ({ page }) => {
    // WP48 (cycle-23 review): the shared answer is "Partner portals and AI chat are live; the employer marketplace and the gig-work (Earn) marketplace are in pre-launch. Hiring currently runs through CodersTrust’s placement team." (tests/wp48.spec.ts)
    const shared = 'Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.';
    for (const route of ['partner-with-us/employers/', 'programs/jobready-work/']) {
      await open(page, route);
      expect(await page.locator('main').evaluate((el) => el.textContent ?? ''), route).toContain(shared);
    }
    await open(page, 'partner-with-us/investors/');
    const text = await page.locator('main').evaluate((el) => el.textContent ?? '');
    expect(text).not.toContain('Live today: partner portals');
    expect(text).not.toContain('Partly — modules');
    // the status itself is still on the page, in "What JobReady Does" (the cards that the answer links; WP40: three short cards in place of the table)
    expect(compact(await page.locator('#features').textContent())).toContain('Partner portals and AI chat are live.');
  });

  // WP43 (cycle-20 review): the mechanism band is headed "How JobReady Connects Learning to Work" (it was "A Multi-Sided Model: Learn, Earn, Prosper"), and the "How JobReady Builds on Delivery" band WP39 kept is gone (tests/wp43.spec.ts)
  test('the mechanism band opens with its eyebrow and heading; "Our Approach" and its statement are gone', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#mechanism .eyebrow').first()).toHaveText('The Model');
    await expect(page.locator('#mechanism h2')).toHaveText('How JobReady Connects Learning to Work');
    await expect(page.locator('#mechanism .pos, .pos__label, .pos__text')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toContain('Our Approach');
    expect(text).not.toContain('weighing a platform for emerging-market youth employment');
    expect(text).not.toContain('Partners receive monthly reports on progress toward paid work');
    await expect(page.locator('#platform')).toHaveCount(0);
  });

  test('every other page keeps its "Our Approach" statement', async ({ page }) => {
    for (const route of ['', 'partner-with-us/governments/', 'partner-with-us/development-partners/', 'partner-with-us/foundations/', 'partner-with-us/universities/', 'partner-with-us/employers/', 'partner-with-us/local-partners/', 'programs/youthwide/', 'programs/jobready-campus/', 'programs/jobready-work/', 'programs/superkids/']) {
      await open(page, route);
      await expect(page.locator('#mechanism .pos__text'), route || 'home').toHaveCount(1);
    }
  });
});

// WP48 (cycle-23 review): the last column is "Scale and Outputs" (it was "Training Figure"; tests/wp48.spec.ts); the cells and the note are as WP39 and WP41 left them
test.describe('Governments: the contracts table’s last column (item 6; WP48: "Scale and Outputs")', () => {
  test('the last column header is "Scale and Outputs"; the other cells and the note are unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    expect(await texts(page, '#contracts thead th')).toEqual(['Contract', 'CodersTrust Scope', 'Scale and Outputs']);
    expect(await page.locator('#contracts td.ct__num').evaluateAll((els) => els.map((e) => e.getAttribute('data-label')))).toEqual(Array(6).fill('Scale and Outputs'));
    const cells = await texts(page, '#contracts td.ct__num');
    // WP41 (cycle-18 review): Her Power's cell lists its three figures, one per line (tests/wp41.spec.ts): the first is still the women CodersTrust trained directly
    // WP50 (cycle-25 review, item 15): each line is a full sentence (tests/wp50.spec.ts)
    expect(await texts(page, '#contracts tbody tr:first-child td.ct__num li')).toEqual([
      'CodersTrust trained 2,500 women directly.',
      'The national program trained 25,125 women across 130 sub-districts (upazilas).',
      '54,609 manuals and guidelines were distributed.',
    ]);
    expect(cells[0].startsWith('CodersTrust trained 2,500 women directly.')).toBe(true);
    for (const c of cells.slice(1)) expect(c.startsWith('Contract scope:'), c).toBe(true);
    // WP65 (cycle-37 review): "We confirm each contract’s delivery status in a briefing." (tests/wp52.spec.ts, tests/wp65.spec.ts)
    expect(compact(await page.locator('#contracts .ct__notes').textContent())).toBe('We confirm each contract’s delivery status in a briefing. Apart from the Her Power figures, scopes are contracted scopes of work, not delivered scale.');
    expect(await mainText(page)).not.toContain('Direct Training');
  });
});

test.describe('YouthWIDE: one-sentence hero lead and one agenda line (items 7 and 8)', () => {
  test('the hero lead is one sentence: audience, outcome, mechanism', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    // WP63 rework RW1: "... educated, unemployed and underemployed youth ..." (the group ID-01 names)
    await expect(page.locator('#hero .hero__lead')).toHaveText('YouthWIDE helps governments and funders prepare educated, unemployed and underemployed youth for paid digital work through training, mentoring and placement support.');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description.length).toBeLessThanOrEqual(155);
  });

  test('the scope word moved to the glance: "YouthWIDE at a Glance" says reporting is as agreed in the program scope', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#program-glance-h')).toHaveText('YouthWIDE at a Glance');
    const row = page.locator('.pg__row', { has: page.locator('dt', { hasText: 'Reporting' }) });
    await expect(row).toHaveCount(1);
    // WP57 (cycle-29 review, GPT-6.1 Sol G2): the removed C8 card's verification detail is in this row
    // WP63 (cycle-35 review, GPT-6.1 Sol G1): "work and earnings checked against offer letters, payslips, ..."
    expect(compact(await row.locator('dd').textContent())).toBe('Monthly reports and follow-up surveys, with work and earnings checked against offer letters, payslips, platform logs or bank receipts where available, as agreed in the program scope.');
    expect(await row.getAttribute('data-fact')).toBe('PD-08 PD-09');
  });

  test('"Choose Your Entry Point" keeps both route actions and the procurement sentence, with ONE agenda line under the two cards', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const band = page.locator('section#entry-point');
    await expect(band.locator('#cta')).toHaveCount(1);
    await expect(band.locator('#cta-governments')).toHaveCount(1);
    await expect(band.locator('#cta .btn--primary')).toHaveCount(1);
    await expect(band.locator('#cta a.link', { hasText: 'Read the Evidence' })).toHaveCount(1);
    await expect(band.locator('#cta-governments a.link', { hasText: 'Request a Briefing for Your Ministry' })).toHaveCount(1);
    expect(compact(await band.locator('#cta-governments .entry__text').textContent())).toBe('Public procurement follows the agency’s own timeline, so we start with a briefing that fits it.');
    const agendas = band.locator('[data-session-agenda]');
    await expect(agendas).toHaveCount(1);
    expect(compact(await agendas.textContent())).toBe('We discuss your priority groups, locations, tracks, indicative budget, scorecard and reporting plan.');
    expect(await agendas.getAttribute('data-fact')).toBe('PD-02');
    await expect(band.locator('#cta [data-session-agenda], #cta-governments [data-session-agenda]')).toHaveCount(0);
    expect(await agendas.evaluate((el) => el.tagName)).toBe('P');
    const text = await mainText(page);
    expect(text).not.toContain('What the discovery session covers');
    expect(text).not.toContain('What the briefing covers');
    expect(text).not.toContain('your priority groups and districts');
  });

  test('the agenda line sits under both cards, across their width, with no sideways scroll at 1280 or 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, 'programs/youthwide/');
      const geo = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('#entry-point .entry__card')).map((c) => c.getBoundingClientRect());
        const agenda = document.querySelector('#entry-point [data-session-agenda]')!.getBoundingClientRect();
        return { cardsBottom: Math.max(...cards.map((c) => c.bottom)), agendaTop: agenda.top, agendaWidth: agenda.width, cardsWidth: Math.max(...cards.map((c) => c.right)) - Math.min(...cards.map((c) => c.left)) };
      });
      expect(geo.agendaTop, `${vp.width}px: under the cards`).toBeGreaterThanOrEqual(geo.cardsBottom);
      expect(Math.abs(geo.agendaWidth - geo.cardsWidth), `${vp.width}px: as wide as the cards together`).toBeLessThanOrEqual(2);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  test('the other session agendas are unchanged: Development Partners, Governments and Foundations', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    expect(compact(await page.locator('#cta [data-session-agenda]').textContent())).toBe('What the discovery session covers: your country, priority groups and locations; employer demand and certification tracks; an indicative budget, the pilot scorecard and the follow-up survey schedule.');
    await open(page, 'partner-with-us/governments/');
    expect(compact(await page.locator('#cta [data-session-agenda]').textContent())).toBe('What the briefing covers: your priority groups and locations; employer demand and certification tracks; an indicative budget, the pilot scorecard and the follow-up survey schedule.');
    await open(page, 'partner-with-us/foundations/');
    expect(compact(await page.locator('#cta [data-session-agenda]').textContent())).toBe('For a cohort grant, we discuss your country, priority groups, tracks, budget and scorecard. For a platform grant, we discuss JobReady’s staged rollout.');
  });
});

test.describe('NU Postgraduate Diploma course pages: "What Will I Be Able to Do After This Course?" (item 9)', () => {
  const NEXT_STEP = 'Your next step depends on your experience, portfolio and local market.';
  const CASES: [string, string, string[]][] = [
    ['programs/nu-postgraduate-diploma/digital-marketing/', 'Build practical work in WordPress design, content marketing, SEO and analytics, followed by the final internship, project work and seminar module.', ['WordPress Design', 'Content Marketing', 'Search Engine Optimization', 'Web & Google Analytics']],
    ['programs/nu-postgraduate-diploma/ict/', 'Build practical work in programming, databases, networks and mobile applications, followed by the final internship, project work and seminar module.', ['Java Programming', 'Database Management Systems', 'Computer Networks Maintenance', 'Mobile Application Development']],
  ];
  for (const [route, sentence, modules] of CASES) {
    test(`${route}: two plain sentences, the next-step line kept, every subject a module of the course, the JSON-LD the same`, async ({ page }) => {
      await open(page, route);
      const item = page.locator('details', { has: page.locator('summary', { hasText: 'What Will I Be Able to Do After This Course?' }) }).first();
      const answer = compact(await item.locator('.faq__a').textContent());
      expect(answer).toBe(`${sentence} ${NEXT_STEP}`);
      expect(answer).not.toMatch(/describe and show|such as|the local market/);
      const text = await mainText(page);
      for (const m of modules) expect(text, `"${m}" is a module of the course, listed on the page`).toContain(m);
      const ld = (await faqJsonLd(page)).find((q) => q.name === 'What Will I Be Able to Do After This Course?');
      expect(ld?.text).toBe(`${sentence} ${NEXT_STEP}`);
    });
  }
});

test.describe('smaller heading changes (item 10)', () => {
  // WP42 (cycle-19 review): the government slide is second, so the survey-income slide is the third
  test('Home slide 3 is "Surveyed Completers Report Higher Income" with the $245 tile and its before-training comparison', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(2);
    await expect(slide.locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    expect(titleCase('Surveyed Completers Report Higher Income')).toBe('Surveyed Completers Report Higher Income');
    expect(await slide.locator('h2').getAttribute('data-fact')).toBe('OC-03');
    await expect(slide.locator('.hs__stat')).toHaveCount(1);
    await expect(slide.locator('.stat__value')).toHaveText('$245');
    expect(compact(await slide.locator('.stat__label').textContent())).toBe('median monthly income among surveyed completers; the median before training was $82.');
    expect(await slide.locator('.hs__stat').getAttribute('data-fact')).toBe('OC-03');
    // WP53 (owner decision 2026-10-16): the carousel is four slides
    await expect(page.locator('#results [data-hs-slide] h2')).toHaveCount(4);
  });

  test('the Home carousel keeps one height box at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const heights = await page.locator('#results [data-hs-slide]').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).offsetHeight)));
      expect(new Set(heights).size, `${vp.width}px: every slide has the same height`).toBe(1);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  test('SuperKids: the agreements band is headed "Delivery and Agreements" and keeps its subheadings, its figure and its caution', async ({ page }) => {
    await open(page, 'programs/superkids/');
    const band = page.locator('#agreements');
    await expect(band.locator('h2')).toHaveText('Delivery and Agreements');
    await expect(band.locator('.eyebrow')).toHaveText('What Is in Place');
    expect(await texts(page, '#agreements h3.agree__h')).toEqual(['Delivered', 'Agreed, Not Delivered']);
    await expect(band.locator('.agree__delivered')).toHaveAttribute('data-fact', 'SK-05');
    expect(compact(await band.textContent())).toContain('These are agreement targets, not delivered reach.');
    expect(await mainText(page)).not.toContain('What Has Been Delivered, and What Is Only Agreed');
  });
});
