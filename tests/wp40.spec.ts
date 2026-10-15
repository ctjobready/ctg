import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { faqs, faqsFor } from '../src/data/faqs';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP40 behaviors (cycle-17 whole-site review, GPT-6.1 Sol): Investors' "What JobReady Does" is three short cards and one link (IncludesBand) in place of the status table, YouthWIDE's glance row is
 * "Designed for Three Regions" and its timing answer is the two-sentence variant, Foundations' links under "Two Ways to Fund the Path" are one for each route, "Reporting and Review" (Development Partners,
 * Foundations) says what the reports and reviews do, Foundations' third pain is about accountability keeping pace with scale, Local Partners' statement divides the work, the "It doesn’t have to be this way."
 * line is gone from every page, and the two research headings are short. Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site
 * (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp40.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
/** An href as rendered ("/ctg/our-model/") without the staging base, so the test does not depend on it. */
const sitePath = (href: string) => href.replace(/^\/ctg(?=\/)/, '');
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

test.describe('Investors: "What JobReady Does" is three short cards and one link (item 1)', () => {
  const CARDS = [
    {
      title: 'Learn Through TalentLEAP',
      text: 'Competent is the published first level; Proficient and Expert are planned. Supported cohorts include mentoring, certification exam preparation and placement support.',
      facts: ['IN-06', 'IN-08', 'PD-01', 'PD-02'],
    },
    {
      title: 'Connect to Paid Work',
      text: 'The employer marketplace and the gig-work (Earn) marketplace are in pre-launch. Until launch, placement runs through CodersTrust’s placement team and marketplaces such as Upwork and Fiverr.',
      facts: ['IN-04'],
    },
    {
      title: 'Equip Partner Institutions',
      text: 'Partner portals and AI chat are live. Personalized and adaptive learning is on the roadmap.',
      facts: ['IN-04', 'IN-06'],
    },
  ];

  test('the band keeps its id and heading and has the three cards, each with its sentences and the register facts they rest on', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('section#features')).toHaveCount(1);
    await expect(page.locator('#features h2')).toHaveText('What JobReady Does');
    await expect(page.locator('#features .eyebrow')).toHaveText('What You Get');
    const cards = page.locator('#features li.card');
    await expect(cards).toHaveCount(3);
    for (const [i, c] of CARDS.entries()) {
      const card = cards.nth(i);
      await expect(card.locator('h3'), c.title).toHaveText(c.title);
      expect(c.title, 'a card heading is in Title Case').toBe(titleCase(c.title));
      expect(await texts(page, `#features li.card:nth-child(${i + 1}) p`), c.title).toEqual([c.text]);
      expect(((await card.getAttribute('data-fact')) ?? '').split(' ').sort(), c.title).toEqual([...c.facts].sort());
      expect(await card.getAttribute('data-relieves'), 'Investors has no ranked-pain map').toBeNull();
    }
  });

  test('every status word is the register’s: live and pre-launch as IN-04 has them (the two marketplaces named as two), the levels as IN-08, the roadmap as IN-06', async ({ page }) => {
    expect(fact('IN-04').text).toContain('Live today: partner portals, marketing automation, customer relationship management and AI chat. In pre-launch: the employer marketplace and the gig-work (Earn) marketplace.');
    expect(fact('IN-08').text).toContain('Competent is the first level; Proficient and Expert are planned');
    expect(fact('IN-06').text).toContain('personalized and adaptive learning (roadmap)');
    await open(page, 'partner-with-us/investors/');
    const band = compact(await page.locator('#features').textContent());
    expect(band).toContain('The employer marketplace and the gig-work (Earn) marketplace are in pre-launch.');
    expect(band, 'the two marketplaces are named as two (tests/wp25s.spec.ts)').not.toMatch(/employer and gig-work/i);
    expect(band).toContain('Partner portals and AI chat are live.');
    expect(band).toContain('marketplaces such as Upwork and Fiverr');
    expect(band, 'nothing is called live that IN-04 does not call live').not.toMatch(/marketplaces? (is|are) live/i);
  });

  test('the table is gone: no table, no labelled parts, no lead sentence about how the status is stated, and the table component no longer ships on any page', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#features table, #features .fc__card, #features .sh__lead')).toHaveCount(0);
    expect(compact(await page.locator('#features').textContent())).not.toMatch(/Concern Addressed|What Is Included|Practical Benefit|Added Benefit|Status is stated exactly/);
    const withTable = listPages().filter((p) => /class="fc__card/.test(readFileSync(p.file, 'utf8'))).map((p) => p.route);
    expect(withTable, 'no page carries the old table markup (the component was deleted with its last user)').toEqual([]);
  });

  test('"See the Full Rollout Status" is one text link under the cards, inside the band, and reaches the platform page’s rollout status', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const link = page.locator('#features a');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('See the Full Rollout Status');
    expect(titleCase('See the Full Rollout Status')).toBe('See the Full Rollout Status');
    expect(sitePath((await link.getAttribute('href')) ?? '')).toBe('/our-model/jobready-platform/');
    const [cardsBox, linkBox] = await Promise.all([page.locator('#features ul.inc').boundingBox(), link.boundingBox()]);
    expect(linkBox!.y, 'the link sits under the cards').toBeGreaterThanOrEqual(cardsBox!.y + cardsBox!.height);
    await link.click();
    await expect(page.locator('#status h2')).toHaveText('Rollout Status');
  });

  test('the first FAQ answer still links to the band, which now holds the cards it points at', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: 'Is the JobReady Platform Live?' }) }).first();
    const link = item.locator('.faq__a a');
    await expect(link).toHaveText('What JobReady Does');
    expect(await link.getAttribute('href')).toBe('#features');
    await expect(page.locator('#features li.card')).toHaveCount(3);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the cards sit in one row (1280) or stack (390), the band has room under them, nothing scrolls sideways and no two dark bands meet`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/investors/');
      const tops = await page.locator('#features li.card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      if (vp.width >= 1024) expect(new Set(tops).size, 'one row of three').toBe(1);
      else expect(new Set(tops).size, 'one card per row').toBe(3);
      expect(await page.locator('#features').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)), 'bottom padding of the band').toBeGreaterThanOrEqual(40);
      expect(await noOverflow(page)).toBe(true);
      const order = await bands(page);
      for (let i = 1; i < order.length; i++) expect(order[i].dark && order[i - 1].dark, `${order[i - 1].id} then ${order[i].id}`).toBe(false);
    });
  }
});

test.describe('YouthWIDE: the glance row and the timing answer (items 2 and 7)', () => {
  test('the first glance row is headed "Designed for Three Regions"; its text names the regions without repeating "designed for"; "Where It Runs" is gone', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const first = page.locator('#program-glance .pg__row').first();
    await expect(first).toContainText('Designed for Three Regions');
    expect(titleCase('Designed for Three Regions')).toBe('Designed for Three Regions');
    expect(compact(await first.textContent())).toContain('South Asia, the Middle East and North Africa, and Sub-Saharan Africa, as co-funded country cohorts. Bangladesh is the reference implementation and has a national initiative of its own.');
    expect(await mainText(page)).not.toContain('Where It Runs');
  });

  test('"How Fast Can We Start?" is the two-sentence variant (Q7-model), tied to PD-04, with no week-by-week count; the JSON-LD says the same', async ({ page }) => {
    const answer = faqsFor('variants').find((f) => f.id === 'Q7-model')!.a;
    expect(answer).toBe('For grant-funded pilots, allow about three weeks from the first conversation to agreement, then 6–8 weeks from signing to training. Public procurement follows the agency’s own timeline.');
    await open(page, 'programs/youthwide/');
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: 'How Fast Can We Start?' }) });
    await expect(item).toHaveCount(1);
    expect(compact(await item.locator('.faq__a').textContent())).toBe(answer);
    expect(await item.locator('.faq__a p').getAttribute('data-fact')).toBe('PD-04');
    const ld = (await faqJsonLd(page)).find((q) => q.name === 'How Fast Can We Start?');
    expect(ld?.text).toBe(answer);
    const text = await mainText(page);
    expect(text).not.toMatch(/Counting from the first conversation|Week 1 is a discovery session/);
    // "What Happens Next" still shows the timing once, in its own line
    expect(compact(await page.locator('.next-timing').textContent())).toContain('6–8 weeks after signing');
  });

  test('the shared answer with the Week 1 to 3 sentence stays in the objection bank; no built page prints it any more except the component gallery', async () => {
    expect(faqs.find((f) => f.id === 'Q7')!.a).toContain('Counting from the first conversation, Week 1 is a discovery session, Week 2 co-design and Week 3 the agreement');
    const printing = listPages()
      .filter((p) => readFileSync(p.file, 'utf8').includes('Week 1 is a discovery session'))
      .map((p) => p.route);
    expect(printing).toEqual(['/styleguide/']);
  });
});

test.describe('Foundations: the links, the pain and "Reporting and Review" (items 3, 4 and 5)', () => {
  test('under "Two Ways to Fund the Path" there are two links, one for each route, named for what they open; the numbered jump links and the duplicate platform link are gone', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    expect(await texts(page, '#mechanism .mech__link a')).toEqual(['Explore YouthWIDE Delivery', 'Explore JobReady’s Rollout']);
    for (const label of ['Explore YouthWIDE Delivery', 'Explore JobReady’s Rollout']) expect(titleCase(label), label).toBe(label);
    expect((await hrefs(page, '#mechanism .mech__link a')).map(sitePath)).toEqual(['/programs/youthwide/', '/our-model/jobready-platform/']);
    const band = compact(await page.locator('#mechanism').textContent());
    expect(band).not.toMatch(/See Funding Route|About the JobReady Platform/);
    // the two links point at two different pages
    expect(new Set((await hrefs(page, '#mechanism .mech__link a')).map(sitePath)).size).toBe(2);
  });

  test('both funding-inquiry links stay under the comparison, with their prefilled subjects', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const links = page.locator('#mechanism .fr__inquire a');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toContainText('Discuss a YouthWIDE Cohort Grant');
    await expect(links.nth(1)).toContainText('Discuss a JobReady Platform Grant');
    expect((await hrefs(page, '#mechanism .fr__inquire a')).every((h) => h.startsWith('mailto:'))).toBe(true);
  });

  test('the two offer bands the comparison describes keep their ids and their order (nothing links to them from the band any more, but the ids stay)', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids).toContain('cohort-grants');
    expect(ids.indexOf('platform-grants')).toBe(ids.indexOf('cohort-grants') + 1);
    expect(ids.indexOf('mechanism')).toBeLessThan(ids.indexOf('cohort-grants'));
  });

  test('the third pain is about accountability keeping pace with scale, in Title Case, and no longer compares implementers', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const qs = await texts(page, '.gp__q');
    expect(qs).toEqual(['Grants Buy Training Hours, but Rarely Earnings', 'Independent Evidence Is Hard to Find', 'Accountability Must Keep Pace with Scale']);
    for (const q of qs) expect(q, q).toBe(titleCase(q));
    const item = page.locator('.gp__pains li', { has: page.locator('.gp__q', { hasText: 'Accountability Must Keep Pace with Scale' }) });
    expect(compact(await item.locator('.gp__a').textContent())).toBe('You need monthly outcome reports as delivery expands.');
    await expect(page.locator('.gp__pains li .gp__a')).toHaveCount(3);
    expect(await mainText(page)).not.toMatch(/Implementers|are rare/);
  });

  test('the third C8 card still answers it: monthly reports, in the order of the three pains', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#features li.card').nth(2).locator('h3')).toHaveText('Progress You Can See Every Month');
  });
});

test.describe('"Reporting and Review" says what the reports and reviews do (item 4)', () => {
  const SENTENCE = 'For supported cohorts, monthly reports track progress; quarterly reviews guide corrective action and any expansion.';
  for (const route of ['partner-with-us/development-partners/', 'partner-with-us/foundations/']) {
    test(`${route}: the callout carries the sentence (scoped like the hub it links to), tied to PD-08 and PD-11, and keeps its optional link`, async ({ page }) => {
      await open(page, route);
      const callout = page.locator('.callout', { has: page.locator('.eyebrow', { hasText: 'Reporting and Review' }) });
      await expect(callout).toHaveCount(1);
      const line = callout.locator('.callout__body p').first();
      expect(compact(await line.textContent())).toBe(SENTENCE);
      expect(await line.getAttribute('data-fact')).toBe('PD-08 PD-11');
      const link = callout.locator('a.link');
      await expect(link).toHaveText('See Reporting and Review');
      expect(sitePath((await link.getAttribute('href')) ?? '')).toBe('/partner-with-us/#review-cycle');
      expect(await mainText(page)).not.toContain('are set out once, on the partnership overview');
    });
  }

  test('the sentence keeps the two qualifiers of the hub line it links to (the scope, and "any" expansion: PD-11 says expansion is the funder’s decision)', async ({ page }) => {
    expect(fact('PD-11').text).toContain('expansion is the funder’s decision');
    await open(page, 'partner-with-us/');
    const hub = compact(await page.locator('#review-cycle .sh__lead').textContent());
    expect(hub).toContain('For supported cohorts');
    expect(hub).toContain('guide corrective action and any expansion');
    expect(SENTENCE).toContain('For supported cohorts');
    expect(SENTENCE).toContain('guide corrective action and any expansion');
  });
});

test.describe('Local Partners: the positioning statement divides the work (item 6)', () => {
  test('the statement is the two sentences, opens the band, rests on PD-01, PD-06 and PD-08, and the four responsibility cards follow it', async ({ page }) => {
    await open(page, 'partner-with-us/local-partners/');
    await expect(page.locator('#mechanism .pos__label')).toHaveText('Our Approach');
    await expect(page.locator('#mechanism .pos__text')).toHaveText('Your organization mobilizes learners and hosts training. CodersTrust supports delivery, mentoring, placement and reporting.');
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('PD-01 PD-06 PD-08');
    expect(await texts(page, '#mechanism .model__label')).toEqual(['Your Organization', 'With CodersTrust', 'Together', 'Throughout']);
    const [pos, cards] = await Promise.all([page.locator('#mechanism .pos').boundingBox(), page.locator('#mechanism .model__list').boundingBox()]);
    expect(cards!.y, 'the statement is above the cards').toBeGreaterThan(pos!.y + pos!.height - 1);
    const text = await mainText(page);
    expect(text).not.toMatch(/who need to move young people in their communities|integrated training-to-earnings model delivered through certified local facilitators/);
  });

  // WP44 (cycle-21 review): Foundations and Universities are declared whole too (tests/wp44.spec.ts), so neither keeps the audience sentence any more
  test('Foundations and Universities carry their own declared statements, not the audience sentence (the declaration is for the pages the gate lists only)', async ({ page }) => {
    const WHOLE: [string, string][] = [
      ['partner-with-us/foundations/', 'Fund a YouthWIDE cohort or JobReady’s platform infrastructure. For cohort grants, we agree a pilot scorecard and combine training, mentoring and placement support, with monthly progress reports.'],
      ['partner-with-us/universities/', 'JobReady@Campus combines training, mentoring and placement support in campus labs alongside academic studies. Your institution receives monthly reports on progress toward paid work, as agreed in the program scope.'],
    ];
    for (const [route, statement] of WHOLE) {
      await open(page, route);
      expect(compact(await page.locator('#mechanism .pos__text').textContent()), route).toBe(statement);
    }
  });
});

test.describe('the "It doesn’t have to be this way." line is gone from every page (item 8)', () => {
  test('no built page, including the component gallery, prints it', () => {
    const printing = listPages()
      .filter((p) => /have to be this way/i.test(readFileSync(p.file, 'utf8')))
      .map((p) => p.route);
    expect(printing).toEqual([]);
  });

  test('Home keeps the next sentence, as the closing line of the cost band', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#cost .cost__after')).toHaveText('A first cohort can show who is earning, and you decide on the evidence.');
    await expect(page.locator('#cost .cost__transition')).toHaveCount(0);
    expect(await page.locator('#cost .container > :last-child').getAttribute('class')).toContain('cost__turn');
  });

  test('every other cost band now ends with its cards; the Investors thesis band ends with its stakes line', async ({ page }) => {
    for (const route of ['programs/youthwide/', 'partner-with-us/universities/', 'partner-with-us/employers/', 'partner-with-us/foundations/', 'partner-with-us/governments/', 'partner-with-us/local-partners/', 'partner-with-us/development-partners/']) {
      await open(page, route);
      expect(await page.locator('#cost .container > :last-child').getAttribute('class'), route).toContain('grid-cards');
      await expect(page.locator('#cost .cost__transition'), route).toHaveCount(0);
    }
    await open(page, 'partner-with-us/investors/');
    expect(compact(await page.locator('#thesis .container > :last-child').textContent())).toBe('Every trained young person who remains out of work is an opportunity employers and communities are not yet capturing.');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the cost bands and the thesis band have no sideways scroll and keep room under their last element`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['', 'programs/youthwide/', 'partner-with-us/foundations/', 'partner-with-us/local-partners/', 'partner-with-us/investors/']) {
        await open(page, route);
        expect(await noOverflow(page), `${route || 'home'} at ${vp.width}px`).toBe(true);
        const id = route === 'partner-with-us/investors/' ? '#thesis' : '#cost';
        expect(await page.locator(id).evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)), `${route || 'home'}: bottom padding`).toBeGreaterThanOrEqual(40);
      }
    });
  }
});

test.describe('the two research headings are short (item 8)', () => {
  const PX06 = 'AI Is Changing Freelance Demand';
  const RC06 = 'Training Does Not Always Lead to Employment';
  /** The pages whose cost band shows each research card. */
  const PAGES: [string, string[]][] = [
    ['', [PX06, RC06]],
    ['programs/youthwide/', [RC06, PX06]],
    ['partner-with-us/development-partners/', [PX06, RC06]],
    ['partner-with-us/local-partners/', [PX06, RC06]],
    ['partner-with-us/governments/', [RC06, PX06]],
    ['partner-with-us/foundations/', ['Educated Young People Are Waiting', RC06]],
    ['partner-with-us/universities/', ['Jobs Requiring AI Skills Are Growing and Paying More', PX06]],
  ];

  test('both headings are in Title Case and the old sentence-length headings are on no page', async () => {
    expect(titleCase(PX06)).toBe(PX06);
    expect(titleCase(RC06)).toBe(RC06);
    for (const p of listPages()) {
      const html = readFileSync(p.file, 'utf8');
      expect(html, p.route).not.toMatch(/Automation-Prone (Freelance )?Postings Fell After ChatGPT|A Review of Nine Trials Found Only Three|Only Three of Nine Training Trials/);
    }
  });

  for (const [route, headings] of PAGES) {
    test(`${route || 'home'}: the cost cards are headed ${headings.map((h) => `"${h}"`).join(' and ')}`, async ({ page }) => {
      await open(page, route);
      expect(await texts(page, '#cost .card__title')).toEqual(headings);
    });
  }

  test('the quantified sentences beneath the headings are the register’s own, unchanged', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const data = await texts(page, '#cost .cost__data');
    expect(data[0]).toContain('found only three with significant employment impacts');
    expect(data[0]).toContain('David McKenzie (2017)');
    expect(data[1]).toContain('postings for automation-prone writing and coding jobs on a major freelancing platform fell 21% relative to manual-intensive jobs');
    expect(data[1]).toContain('image-creation postings fell 17%');
    await open(page, '');
    const home = await texts(page, '#cost .cost__data');
    expect(home[0]).toBe('On one major freelancing platform, automation-prone writing and coding postings fell 21% relative to manual-intensive jobs within eight months of ChatGPT’s release.');
    expect(home[1]).toContain('found only three with significant employment impacts');
    expect(await page.locator('#cost .cost__data').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['PX-06', 'RC-06']);
  });
});
