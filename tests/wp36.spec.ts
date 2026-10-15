import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP36 behaviors (cycle-13 whole-site reviews, GPT-6.1 Sol, GLM 5.3 and Kimi K3): each figure is stated once on a page (Home's income and reach slides, Development Partners' Kosovo result,
 * Governments' 31,200+), the Investors evidence band is three sentences and three links with no case-study cards and no sector taxonomy, the audience pages state their pains as outcomes, the cost
 * and safeguarding answers are one line with a link on the route pages, and the smaller wording fixes (Contact, TalentLEAP, YouthWIDE, SuperKids, the option bands, the contract-scope tag, the dating line).
 * Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp36.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z“])/).filter(Boolean);

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

/** The answer text of one FAQ item on the page. */
const answerOf = async (page: Page, question: string) => compact(await page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: question }) }).first().locator('.faq__a').textContent());

test.describe('Home: each figure once', () => {
  // WP42 (cycle-19 review): the government slide is second, so the survey, program-result, speed and reach slides are the third to the sixth
  test('slide 3 shows the income result only; the 77.9% is the hero’s survey card', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(2);
    await expect(slide.locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    await expect(slide.locator('.hs__stat')).toHaveCount(1);
    expect(await slide.locator('.hs__stat').getAttribute('data-fact')).toBe('OC-03');
    expect(compact(await slide.textContent())).not.toContain('77.9');
    await expect(page.locator('.hh__card[data-fact="OC-01"]')).toContainText('77.9%');
    expect(count(await mainText(page), '77.9%'), 'the 77.9% is stated once on Home').toBe(1);
  });

  // WP38 (cycle-15 review): the slide had SC-03's "15" as its tile; WP45 (cycle-21 review): the heading states the 15 ("Programs in 15 Countries and Territories", tests/wp45.spec.ts) and the tile is gone; the 130,000+ stays the hero's reach card alone
  test('slide 6 is headed "Programs in 15 Countries and Territories" and keeps SC-03’s detail line; the 130,000+ is the hero’s reach card', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(5);
    await expect(slide.locator('.hs__eyebrow')).toHaveText('Reach at Scale');
    await expect(slide.locator('h2')).toHaveText('Programs in 15 Countries and Territories');
    await expect(slide.locator('.hs__lead')).toHaveText('Bangladesh plus 14 other countries and territories; most delivery has been in Bangladesh.');
    expect(await slide.locator('.hs__lead').getAttribute('data-fact')).toBe('SC-03');
    expect(await slide.locator('h2').getAttribute('data-fact')).toBe('SC-03');
    const text = compact(await slide.textContent());
    expect(text).not.toContain('130,000');
    await expect(slide.locator('a', { hasText: 'Explore Global Reach' })).toHaveCount(1);
    await expect(page.locator('.hh__card[data-fact="SC-16"]')).toContainText('130,000+');
    expect(count(await mainText(page), '130,000+'), 'the 130,000+ is stated once on Home').toBe(1);
  });

  // WP38 (cycle-15 review): the heading led with its figure and then named the base ("completers who started earning"). WP41 (cycle-18 reviews): the heading is the finding alone, "First Earnings Within Six Months", with no
  // percentage; the survey qualifier and the base are on the slide itself (eyebrow, tile). WP43 (cycle-20 review): the lead sentence is gone (it repeated the heading and the tile). WP45 (cycle-21 review): "Most First Earnings Came Within Six Months"
  test('slide 5 is headed "Most First Earnings Came Within Six Months" (the finding, no percentage), has no lead, and keeps "surveyed completers" in the 58.8% tile', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(4);
    await expect(slide.locator('h2')).toHaveText('Most First Earnings Came Within Six Months');
    expect(await slide.locator('h2').textContent()).toBe(titleCase('Most First Earnings Came Within Six Months'));
    expect(await slide.locator('h2').getAttribute('data-fact')).toBe('OC-05');
    await expect(slide.locator('.hs__lead')).toHaveCount(0);
    expect(compact(await slide.locator('.hs__stat').textContent())).toContain('58.8%');
    expect(compact(await slide.locator('.hs__stat').textContent())).toContain('surveyed completers');
  });

  test('slide 4 names the base of every result and no line calls the Korail result "in work"', async ({ page }) => {
    await open(page, '');
    const lines = await page.locator('[data-hs-slide]').nth(3).locator('.hs__lines li').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
    expect(lines).toEqual(['Women in Online Work, Kosovo: 68% in work (102 of 150).', 'UNDP YES, Korail: 67% of the 350 trained found a first job within three months.', 'Her Power: 47% of 800 tracked women in work.']);
    expect(lines[1]).not.toMatch(/in work/);
  });

  // WP38 (cycle-15 review): Home's band is three short cards, so there are no Practical Benefit cells; the card titles are Title Case like every other heading
  test('the three cards of "What a Supported Youth Cohort Includes" (WP41: it was "What Your Partnership Includes") carry Title Case headings', async ({ page }) => {
    await open(page, '');
    const titles = await texts(page, '#features .card__title');
    expect(titles).toEqual(['Training, Mentoring and Placement Support', 'Results You Can Check', 'Tracks Chosen from Employer Demand']);
    for (const t of titles) expect(t, t).toBe(titleCase(t));
  });

  test('the carousel keeps its layout: slides share one height box at 1280 and 390 and no slide leaves more than 48 px unused', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const gaps = await page.evaluate(async () => {
        const slides = Array.from(document.querySelectorAll('[data-hs-slide]'));
        const out: number[] = [];
        for (let i = 0; i < slides.length; i++) {
          (document.querySelectorAll('[data-hs-dot]')[i] as HTMLElement).click();
          await new Promise((r) => setTimeout(r, 450));
          const active = document.querySelector('[data-hs-slide].is-active')!;
          const controls = document.querySelector('[data-hs-bar]')!;
          const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
          out.push(Math.round(controls.getBoundingClientRect().top - Math.max(...parts.map((el) => el.getBoundingClientRect().bottom))));
        }
        return out;
      });
      for (const [i, g] of gaps.entries()) expect(g, `${vp.width}px, slide ${i + 1}: unused space under the content`).toBeLessThanOrEqual(48);
    }
  });
});

test.describe('Development Partners and Governments: each figure once', () => {
  test('Development Partners: the Kosovo result (102 of 150) is stated once, on its Proof in Practice card; the glance’s program-record tile is UNDP YES, Korail', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    expect(count(await mainText(page), '102 of 150')).toBe(1);
    await expect(page.locator('#cases article', { hasText: '102 of 150' })).toHaveCount(1);
    expect(await page.locator('#glance .pg__lead a').evaluateAll((els) => els.map((e) => (e.getAttribute('data-fact') ?? '').split(' ')[0]))).toEqual(['RC-02', 'OC-01', 'PR-03']);
    const tile = page.locator('#glance .pg__lead a[data-fact="PR-03"]');
    await expect(tile.locator('[data-evidence="Program Record"]')).toHaveCount(1);
    await expect(tile).toContainText('67%');
    await expect(tile).toContainText('of the 350 trained in UNDP YES, Korail, found their first job within 3 months');
    expect(await tile.getAttribute('href')).toMatch(/\/impact\/case-studies\/undp-yes-korail\/$/);
  });

  test('Development Partners: the mechanism card says "Placement support into ..."', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const card = page.locator('#mechanism').getByText('Placement support into local, remote, overseas and freelance work, with outcome tracking for 12 months after each course.');
    await expect(card).toHaveCount(1);
    expect(await mainText(page)).not.toMatch(/Placement into local/);
  });

  test('Governments: the 31,200+ is stated once, in Results at a Glance; the Track Record band has no stat tile, the NU statement and the contracts table stay', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    expect(count(await mainText(page), '31,200+')).toBe(1);
    await expect(page.locator('#glance li', { hasText: '31,200+' })).toHaveCount(1);
    await expect(page.locator('#guide .fs, #guide [data-fact="SC-06"], #guide .stat')).toHaveCount(0);
    await expect(page.locator('#guide')).toContainText('National University’s official training partner');
    await expect(page.locator('#contracts tbody tr')).toHaveCount(6);
  });

  test('Governments: the glance tile reads "People in the Scopes of Six Government Contracts"; "What Your Agency Gets" speaks of outcomes and the agreed scorecard', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#glance li', { hasText: '31,200+' }).locator('.pg__desc')).toHaveText('People in the Scopes of Six Government Contracts');
    // WP39 (cycle-16 review): the features band is three short cards; the second one keeps "Spending Measured Against Outcomes" and the budget "assessed against the agreed scorecard"
    const card = page.locator('#features li.card', { has: page.locator('h3', { hasText: 'Spending Measured Against Outcomes' }) });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.card__text').textContent())).toContain('Your budget is assessed against the agreed scorecard.');
    expect(await mainText(page)).not.toMatch(/judged against verified outcomes|Spending tied to verified outcomes/);
  });
});

test.describe('Partner with Us hub', () => {
  test('"Choose Your Route" is the hero button only; the route cards’ label is "Partnership Routes" and the H2 is unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('#hero .btn')).toHaveText('Choose Your Route');
    await expect(page.locator('#audiences .eyebrow').first()).toHaveText('Partnership Routes');
    await expect(page.locator('#audiences h2')).toHaveText('Which Route Is Yours?');
    expect(count(await mainText(page), 'Choose Your Route')).toBe(1);
  });
});

test.describe('Investors', () => {
  const EVIDENCE =
    'A randomized trial of CodersTrust’s predecessor WSDFM program found women offered a place were 10.3 percentage points more likely to be employed. Among surveyed completers, employment was 77.9% at the October 2026 survey, up from 47.4% before training. Youth-program outcomes are not platform outcomes.';

  test('Independent Evidence is three sentences tied to RC-02 and OC-01, then three links; no chart, tile, table or case-study card', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const band = page.locator('#proof-band');
    await expect(band).toHaveCount(1);
    await expect(band.locator('h2')).toHaveText('Independent Evidence');
    const body = band.locator('p.lead');
    await expect(body).toHaveCount(1);
    expect(compact(await body.textContent())).toBe(EVIDENCE);
    expect(sentences(EVIDENCE)).toHaveLength(3);
    expect(await body.getAttribute('data-fact')).toBe('RC-02 OC-01');
    expect(await texts(page, '#proof-band a')).toEqual(['Impact Survey 2026', 'The Randomized Trial', 'Case Studies']);
    expect((await hrefs(page, '#proof-band a')).map((h) => h.replace(/^.*\/ctg\//, ''))).toEqual(['impact/outcomes-2026/', 'impact/independent-evaluation/', 'impact/case-studies/']);
    await expect(band.locator('svg:not(.icon), .stat, .ba, .ba__data, table, [data-plain-line], article')).toHaveCount(0);
    await expect(page.locator('#cases')).toHaveCount(0);
    expect(await band.getAttribute('class')).toMatch(/band--klein/);
  });

  test('the youth-program line is said once on the page, and the trial, the 77.9% and the 47.4% are stated once', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const text = await mainText(page);
    expect(count(text, 'Youth-program outcomes are not platform outcomes.')).toBe(1);
    expect(count(text, '10.3 percentage points')).toBe(1);
    expect(count(text, '77.9%')).toBe(1);
    expect(count(text, '47.4%')).toBe(1);
    expect(text).not.toMatch(/BIGD|For every 100 women|Chart data|Control Group/);
  });

  test('"The Sectors Involved" is gone from the mechanism band; the band keeps its model blocks and its link', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(await mainText(page)).not.toMatch(/Sectors Involved|four sectors|freelance marketplaces and job sites/);
    // WP39 (cycle-16 review): the band carries no "Our Approach" statement any more (tests/wp39.spec.ts)
    await expect(page.locator('#mechanism .pos__text')).toHaveCount(0);
    await expect(page.locator('#mechanism').getByRole('link', { name: 'How Our Model Works' })).toHaveCount(1);
    expect(await texts(page, '#mechanism h3'), 'the four model blocks are the band’s only sub-headings').toEqual(['Courses, Bootcamps and University Programs', 'Jobs, Freelance Work and Gigs', 'Career Paths and Continuing Development', 'A Digital Delivery Platform']);
  });

  test('no two dark bands meet, and the evidence band sits between the reach band and the features band', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main .band[id]')).map((b) => ({ id: b.id, dark: /band--(klein|deep-ink)/.test(b.className) })));
    for (let i = 1; i < order.length; i++) expect(order[i].dark && order[i - 1].dark, `${order[i - 1].id} then ${order[i].id}`).toBe(false);
    const ids = order.map((o) => o.id);
    expect(ids.indexOf('proof-band')).toBe(ids.indexOf('reach') + 1);
    expect(ids.indexOf('features')).toBe(ids.indexOf('proof-band') + 1);
  });
});

test.describe('Foundations', () => {
  test('the +$27 tile reads "estimated monthly income gain for women offered a place in a predecessor program, versus a control mean of about $66"', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const tile = page.locator('#glance .pg__lead a[data-fact="RC-04"]');
    await expect(tile.locator('.pg__value')).toHaveText('+$27');
    await expect(tile.locator('.pg__desc')).toHaveText('estimated monthly income gain for women offered a place in a predecessor program, versus a control mean of about $66');
    await expect(tile.locator('[data-evidence="Randomized Trial"]')).toHaveCount(1);
  });
});

test.describe('Contact', () => {
  // WP38 (cycle-15 review): the shared sentence says "a program scope, designed with you" (a "first cohort" was one kind of scope; the sentence is for four routes)
  test('step 3 names foundations’ two grants; development partners, governments, universities and local partners share the program-scope sentence', async ({ page }) => {
    await open(page, 'contact/');
    expect(compact(await page.locator('#next .steps__item').nth(2).textContent())).toContain(
      'Development partners, governments, universities and local partners: a program scope, designed with you. Foundations: a cohort grant or a JobReady platform grant. Employers training a team: a needs assessment of your roles.',
    );
    const third = compact(await page.locator('#next .steps__item').nth(2).textContent());
    expect(third).toContain('Impact investors: the deck and data room follow under NDA.');
    expect(third).not.toMatch(/governments, foundations, universities/);
  });

  // WP42 (cycle-19 review): the group is "Educate, Hire or Train" (it also holds the universities and the schools)
  test('"Educate, Hire or Train" has a Schools and Education Partners route that reuses SuperKids’ inquiry (same address, same prefilled subject)', async ({ page }) => {
    await open(page, 'contact/');
    const group = page.locator('.ct-group', { has: page.getByRole('heading', { level: 3, name: 'Educate, Hire or Train' }) });
    expect(await group.locator('h4').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()))).toEqual([
      'Universities and Colleges',
      'Employers: Train Your Team',
      'Employers: Hire Talent',
      'Schools and Education Partners',
    ]);
    const card = group.locator('.ct-route', { has: page.getByRole('heading', { level: 4, name: 'Schools and Education Partners' }) });
    await expect(card).toContainText('Explore coding, robotics and digital art for your learners.');
    const href = (await card.locator('a.btn').first().getAttribute('href')) ?? '';
    expect(href).toMatch(/^mailto:contact@coderstrust\.global\?/);
    expect(decodeURIComponent(href)).toContain('SuperKids discovery session request');
    await open(page, 'programs/superkids/');
    expect(await page.locator('#hero a.btn').first().getAttribute('href')).toBe(href);
  });
});

test.describe('TalentLEAP and YouthWIDE', () => {
  test('TalentLEAP’s opening no longer implies several levels are taught: Competent is the published first level, Proficient and Expert are planned', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    const lead = compact(await page.locator('.lf-head .lead').textContent());
    expect(lead).toBe(
      'TalentLEAP organizes learning around assessed skill units and career paths. Competent is the published first level; Proficient and Expert are planned. Learners move through three stages, Learn, Earn and Prosper, with three months of milestone-based mentoring after the course.',
    );
    expect(lead).not.toMatch(/graduated|taught/);
    expect(compact(await page.locator('meta[name="description"]').getAttribute('content'))).not.toMatch(/graduated levels/);
  });

  test('YouthWIDE: the Bangladesh band says "Designed for delivery through existing government digital labs and colleges", and the glance replaces "hub-and-spoke"', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#governments .sh__lead')).toHaveText('Designed for delivery through existing government digital labs and colleges; lab access and seats are confirmed per program.');
    const row = page.locator('main').getByText('a central team coordinating local labs for larger programs');
    await expect(row).toHaveCount(1);
    expect(await mainText(page)).not.toMatch(/hub-and-spoke|the country already has/i);
  });

  test('YouthWIDE: "Our Approach" is the two shared sentences with the program as subject, and opens the band', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#mechanism .pos__label')).toHaveText('Our Approach');
    await expect(page.locator('#mechanism .pos__text')).toHaveText('YouthWIDE combines training, mentoring and placement support in existing labs and colleges. Partners receive monthly reports on progress toward paid work.');
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('PD-01 PD-08');
    // WP44 (cycle-21 review): Foundations is declared whole too, with its own two sentences (tests/wp44.spec.ts), not the audience sentence it had here
    await open(page, 'partner-with-us/foundations/');
    expect(compact(await page.locator('#mechanism .pos__text').textContent())).toBe('Fund a YouthWIDE cohort or JobReady’s platform infrastructure. For cohort grants, we agree a pilot scorecard and combine training, mentoring and placement support, with monthly progress reports.');
  });
});

test.describe('the ranked pains are statements, not questions', () => {
  const PAGES: [string, string[]][] = [
    ['partner-with-us/governments/', ['Graduates Struggle to Find Work', 'Training Budgets Do Not Show Up as Earnings', 'Trainer and Curriculum Capacity Is Thin']],
    ['partner-with-us/development-partners/', ['Skills Programs Miss Their Employment Targets', 'The Hardest-to-Reach Groups Drop Out', 'Outcomes Are Hard to Audit']],
    ['partner-with-us/foundations/', ['Grants Buy Training Hours, but Rarely Earnings', 'Independent Evidence Is Hard to Find', 'Accountability Must Keep Pace with Scale']],
    ['partner-with-us/universities/', ['Degree Holders Struggle to Find Work', 'Employers Struggle to Find the Skills They Need', 'Institutions Lack Placement Results They Can Publish']],
    ['partner-with-us/employers/', ['You Struggle to Find the Digital Talent You Need', 'Hiring Alone Does Not Close the Gap', 'Your Teams Need Upskilling for AI Workflows']],
  ];
  for (const [route, titles] of PAGES) {
    test(`${route}: three Title Case statements, none a question, and no answer line that repeats its title`, async ({ page }) => {
      await open(page, route);
      expect(await texts(page, '.gp__q')).toEqual(titles);
      for (const t of titles) expect(t, t).toBe(titleCase(t));
      const items = await page.locator('.gp__pains li').evaluateAll((lis) => lis.map((li) => ({ q: li.querySelector('.gp__q')?.textContent?.trim() ?? '', a: li.querySelector('.gp__a')?.textContent?.trim() ?? null })));
      for (const { q, a } of items) {
        expect(q, q).not.toMatch(/\?$|^(Why|Where|How|Who|What|When)\b/);
        if (a !== null) expect(a.toLowerCase().replace(/\.$/, ''), `${q}: the line under it adds something`).not.toBe(q.toLowerCase());
      }
    });
  }

  test('Home, YouthWIDE and Local Partners keep their outcome statements', async ({ page }) => {
    for (const route of ['', 'programs/youthwide/', 'partner-with-us/local-partners/']) {
      await open(page, route);
      const qs = await texts(page, '.gp__q');
      expect(qs.length, route || 'home').toBe(3);
      for (const q of qs) expect(q).not.toMatch(/\?$/);
    }
  });
});

test.describe('cost and safeguarding: full on the hub, one line and a link on the route pages', () => {
  const COST = 'Pricing is set per program; we share an indicative budget in the discovery session. See what a partnership includes.';
  const SAFE = 'Safeguarding and data protection are specified for each program and agreed before enrollment. See how we handle them.';

  for (const route of ['partner-with-us/development-partners/', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/universities/']) {
    test(`${route}: "What Does It Cost?" is one line and links to the hub FAQ; the FAQ JSON-LD says the same words`, async ({ page }) => {
      await open(page, route);
      const answer = await answerOf(page, 'What Does It Cost?');
      expect(answer).toBe(COST);
      const link = page.locator('#faq details', { has: page.locator('summary', { hasText: 'What Does It Cost?' }) }).locator('.faq__a a');
      await expect(link).toHaveText('See what a partnership includes.');
      expect(await link.getAttribute('href')).toMatch(/\/partner-with-us\/#faqs$/);
      const ld = (await faqJsonLd(page)).find((q) => q.name === 'What Does It Cost?');
      expect(ld?.text).toBe(COST);
      expect(await mainText(page)).not.toMatch(/standard inclusions are outreach and selection|Supported youth cohorts include (outreach and selection, )?training/i);
    });
  }

  for (const route of ['partner-with-us/foundations/', 'partner-with-us/local-partners/', 'programs/superkids/']) {
    test(`${route}: the safeguarding answer is one line and links to the governance page; the FAQ JSON-LD says the same words`, async ({ page }) => {
      await open(page, route);
      const answer = await answerOf(page, 'What About Safeguarding and Data Protection?');
      expect(answer).toBe(SAFE);
      const link = page.locator('#faq details, details.faq__item', { has: page.locator('summary', { hasText: 'What About Safeguarding' }) }).locator('.faq__a a');
      await expect(link).toHaveText('See how we handle them.');
      expect(await link.getAttribute('href')).toMatch(/\/about\/governance\/$/);
      const ld = (await faqJsonLd(page)).find((q) => q.name === 'What About Safeguarding and Data Protection?');
      expect(ld?.text).toBe(SAFE);
      expect(await mainText(page)).not.toContain('Guardian consent and supervision apply');
    });
  }

  // WP45 (cycle-21 review): the hub's FAQ block is two questions (the country and the cost); the full safeguarding answer is gone from it (the due-diligence view and Governance state it; tests/wp45.spec.ts)
  test('the Partner with Us hub keeps the full cost answer (three sentences) and no longer prints the full safeguarding answer', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const cost = await answerOf(page, 'What Does It Cost?');
    // WP41 (cycle-18 review): the list is scoped to supported youth cohorts; WP43 (cycle-20 review): "Supported youth cohorts include training, certification exam preparation and the exam fee, …"; WP45: "… include outreach and selection, training, …"
    expect(cost).toContain('Supported youth cohorts include outreach and selection, training, certification exam preparation and the exam fee');
    expect(sentences(cost).length).toBeLessThanOrEqual(3);
    expect(await mainText(page)).not.toContain('Guardian consent and supervision apply to anyone under 18');
    const ld = await faqJsonLd(page);
    expect(ld.find((q) => q.name === 'What Does It Cost?')?.text).toBe(cost);
    expect(ld.find((q) => q.name === 'What About Safeguarding and Data Protection?')).toBeUndefined();
  });

  test('the other cost and "Will This Work in Our Country?" answers are untouched', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    expect(await answerOf(page, 'What Does It Cost?')).toContain('confirm it after the needs assessment');
    await open(page, 'partner-with-us/governments/');
    expect(await answerOf(page, 'Will This Work in Our Country?')).toContain('That depends on local demand and on lab access and facilitator supply, which we test first.');
  });

  // WP37 (cycle-14 review): Development Partners no longer restates the three program figures (its Proof in Practice band, directly above, shows them): a page variant of Q6 (tests/wp37.spec.ts)
  test('Development Partners: "Can It Reach Women and Marginalized Groups?" is three plain sentences', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const answer = await answerOf(page, 'Can It Reach Women and Marginalized Groups?');
    expect(answer).toBe(
      'Our women-focused programs report work outcomes; see Proof in Practice above. For other priority groups, we have early delivery experience and measure outcomes in each pilot. The randomized trial studied women aged 18–35 in Dhaka with at least a Secondary School Certificate (SSC), so it does not speak to other groups.',
    );
    expect(sentences(answer)).toHaveLength(3);
    expect((await faqJsonLd(page)).find((q) => q.name === 'Can It Reach Women and Marginalized Groups?')?.text).toBe(answer);
  });
});

test.describe('SuperKids: two separate 20M+ targets, each labeled', () => {
  test('the DoICT and NCTB targets are labeled apart, and the page says they are agreement targets, not delivered reach', async ({ page }) => {
    await open(page, 'programs/superkids/');
    expect(await texts(page, '.agree__fact p')).toEqual([
      'DoICT agreement target: 20M+ students through 9,000+ digital labs, for primary-school STEM and robotics.',
      'NCTB agreement target: 20M+ students, for competency-based experiential learning.',
      'These are agreement targets, not delivered reach.',
    ]);
    expect(await page.locator('.agree__fact').getAttribute('data-fact')).toBe('GV-08');
    expect(count(await mainText(page), '20M+')).toBe(2);
  });
});

test.describe('option bands: program sizes are not a commitment', () => {
  const NOTE = 'Program sizes, not a commitment: use the discovery session to choose a starting scope for your goals, country and delivery capacity.';

  for (const route of ['', 'partner-with-us/universities/', 'programs/jobready-campus/']) {
    test(`${route || 'Home'}: the option band opens with Home’s line`, async ({ page }) => {
      await open(page, route);
      expect(compact(await page.locator('#offer .sh__lead').textContent())).toContain(NOTE);
    });
  }

  test('Universities and JobReady@Campus keep their pricing statement beside it', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    expect(compact(await page.locator('#offer .sh__lead').textContent())).toContain('Pricing is set per program, and we share an indicative budget in the discovery session.');
    await open(page, 'programs/jobready-campus/');
    expect(compact(await page.locator('#offer .sh__lead').textContent())).toContain('Program options are shown without prices.');
    await expect(page.locator('#offer [data-fact="PD-02"]')).toHaveCount(1);
  });
});

test.describe('one figure, one label: the 31,200+ is tagged "Contract Scope" everywhere', () => {
  // WP38 (cycle-15 review): Home's Track Record band has no tile for it any more; slide 2 (since WP42) states it and says "contract scope, not people trained" (tests/wp31.spec.ts)
  const TILES: [string, string][] = [
    ['partner-with-us/governments/', '#glance li'],
    ['impact/', '#glance li'],
    ['partner-with-us/investors/', '#reach .ir__tile'],
    ['our-model/jobready-platform/', '#why .jr__whystat'],
  ];
  for (const [route, selector] of TILES) {
    test(`${route || 'Home'}: the tile that shows 31,200+ carries the Contract Scope evidence tag and no Agreement status tag`, async ({ page }) => {
      await open(page, route);
      const tile = page.locator(selector, { hasText: '31,200+' });
      await expect(tile).toHaveCount(1);
      await expect(tile.locator('[data-evidence="Contract Scope"]')).toHaveCount(1);
      await expect(tile.locator('[data-status]')).toHaveCount(0);
      await expect(page.locator('main [data-status="Agreement"]')).toHaveCount(0);
    });
  }
});

test.describe('dating lines', () => {
  // WP41 (cycle-18 review): the survey page's heading changed on October 15 (the survey's name moved to the eyebrow), so its "Last updated" is that day; the source snapshot stays October 2026
  test('Impact Survey 2026 reads "Source snapshot: October 2026 · Last updated October 15, 2026"; no page says "Page last reviewed"', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    expect(compact(await page.locator('.lf-updated').textContent())).toBe('Source snapshot: October 2026 · Last updated October 15, 2026');
    for (const route of ['impact/independent-evaluation/', 'our-model/talentleap/', 'programs/youthwide/', 'programs/superkids/']) {
      await open(page, route);
      expect(compact(await page.locator('.lf-updated, .updated').first().textContent()), route).toMatch(/^Last updated [A-Z][a-z]+ \d{1,2}, 2026$/);
      expect(await mainText(page), route).not.toContain('Page last reviewed');
    }
  });

  test('TalentLEAP and SuperKids carry today’s date, the day their wording changed', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    expect(compact(await page.locator('.lf-updated').textContent())).toBe('Last updated October 15, 2026');
    await open(page, 'programs/superkids/');
    expect(compact(await page.locator('.updated').textContent())).toBe('Last updated October 15, 2026');
  });
});

test.describe('Employers', () => {
  test('the closing reassurance reads "Your first step is a conversation, not a commitment."; the other pages keep the discovery-session line', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const cta = compact(await page.locator('#cta').textContent());
    expect(cta).toContain('Your first step is a conversation, not a commitment.');
    expect(cta).not.toContain('A discovery session is a conversation, not a commitment.');
    for (const route of ['partner-with-us/development-partners/', 'programs/jobready-work/']) {
      await open(page, route);
      expect(compact(await page.locator('#cta').textContent()), route).toContain('A discovery session is a conversation, not a commitment.');
    }
  });
});

test.describe('layout of the changed pages', () => {
  const ROUTES = [
    '',
    'partner-with-us/',
    'partner-with-us/development-partners/',
    'partner-with-us/governments/',
    'partner-with-us/foundations/',
    'partner-with-us/investors/',
    'partner-with-us/universities/',
    'partner-with-us/employers/',
    'partner-with-us/local-partners/',
    'contact/',
    'our-model/talentleap/',
    'programs/youthwide/',
    'programs/superkids/',
    'programs/jobready-campus/',
    'impact/',
  ];
  for (const vp of [DESKTOP, MOBILE]) {
    test(`no page this package changed scrolls sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ROUTES) {
        await open(page, route);
        expect(await noOverflow(page), `${route || 'home'} at ${vp.width}px`).toBe(true);
      }
    });
  }
});
