import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { faqs, faqsFor } from '../src/data/faqs';
import { DESKTOP, MOBILE, open } from './support/browser';
import { pagesWithMarkup } from './support/pages';

/**
 * WP37 behaviors (cycle-14 whole-site review, GPT-6.1 Sol): Home's Proof in Practice cards say what was delivered instead of repeating the figures its carousel states, Governments tells the
 * Her Power story once (a text link under the contracts table, a one-line scale answer), the JobReady@Work hero offers hiring beside training, Development Partners and Our Model have page
 * variants of two shared FAQ answers, Foundations says what a platform grant supports in one sentence, Investors' vision band states the 3M+ once, and the live-platform list writes out
 * "customer relationship management". Retrospective coverage (the owner exempted this project from test-first work); each test states one observable behavior of the built site (run
 * `npm run build` first, then `PORT=<port> npx playwright test tests/wp37.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
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

/** One FAQ item on the page, and its answer text. */
const itemOf = (page: Page, question: string) => page.locator('#faq details, #faqs details', { has: page.locator('summary', { hasText: question }) }).first();
const answerOf = async (page: Page, question: string) => compact(await itemOf(page, question).locator('.faq__a').textContent());

test.describe('Home: Proof in Practice says what was delivered where its carousel already states the figures', () => {
  // WP51 (cycle-26 review): slide 4 states WSDFM's "711 of 1,000" too (WP50), so the WSDFM card shows delivery context like the other two (tests/wp51.spec.ts holds the pages that keep the figure)
  // WP57 (cycle-29 review, Gemini GM4; owner decision 7, "show both"): the Kosovo card's context line is its program records ("Program records: 102 of 150 women in work."), and its World Bank line follows (tests/wp57.spec.ts); Her Power's says what was delivered
  // WP63 (cycle-35 review, Gemini M4): the WSDFM card's context line is its program records too ("Program records: 711 of 1,000 women in work (71%).", WSDFM_RECORDS)
  test('all three cards show one context line and no headline figure: WSDFM and Kosovo give their program records, Her Power says what was delivered', async ({ page }) => {
    await open(page, '');
    const cards = page.locator('#cases article');
    await expect(cards).toHaveCount(3);

    const delivery = [
      { i: 0, title: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)', program: 'Commissioned by Porticus', context: 'Program records: 711 of 1,000 women in work (71%).', slug: 'wsdfm-women-freelancers' },
      { i: 1, title: 'Women in Online Work, Kosovo', program: 'World Bank Group', context: 'Program records, 2016–2017: 102 of 150 women in work.', slug: 'kosovo-women-in-online-work' },
      { i: 2, title: 'Her Power', program: 'ICT Division / Department of ICT (DoICT)', context: 'Curriculum, trainer training and direct delivery for women’s digital skills.', slug: 'her-power' },
    ];
    for (const d of delivery) {
      const card = cards.nth(d.i);
      await expect(card.locator('.case__stat, .case__value, .case__label'), d.title).toHaveCount(0);
      expect(compact(await card.locator('.case__context').textContent()), d.title).toBe(d.context);
      // the program name, the partner line and the link to the case study are kept
      expect(compact(await card.locator('.card__title').textContent()), d.title).toBe(d.title);
      expect(compact(await card.locator('.card__meta').textContent()), d.title).toBe(d.program);
      expect(await card.locator('a.card__link').getAttribute('href'), d.title).toMatch(new RegExp(`/impact/case-studies/${d.slug}/$`));
      expect(compact(await card.locator('.card__more').textContent()), d.title).toContain('Read the Case Study');
    }
  });

  test('the context sits where the figure sat: above the title, in body type, with no horizontal overflow at 1280 or 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      for (const i of [0, 1, 2]) {
        const card = page.locator('#cases article').nth(i);
        const order = await card.evaluate((el) => {
          const context = el.querySelector('.case__context')!.getBoundingClientRect();
          const title = el.querySelector('.card__title')!.getBoundingClientRect();
          const body = el.querySelector('.card__body')!.getBoundingClientRect();
          return { contextBottom: context.bottom, titleTop: title.top, contextRight: context.right, bodyRight: body.right };
        });
        expect(order.contextBottom, `${vp.width}px, card ${i + 1}`).toBeLessThanOrEqual(order.titleTop + 1);
        expect(order.contextRight, `${vp.width}px, card ${i + 1}: the line stays inside the card`).toBeLessThanOrEqual(order.bodyRight + 1);
      }
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  // WP57 (cycle-29 review, Gemini GM4): Kosovo's program records are stated twice on Home now, in slide 4 and in the Kosovo card (which shows both Kosovo figures); Her Power's stays slide 4's alone
  // WP63 (cycle-35 review, Gemini M4): WSDFM's program records are stated twice too, in slide 4 and in the WSDFM card ("Program records: 711 of 1,000 women in work (71%)."), which names PR-01
  test('Her Power’s figures are stated once on Home, in slide 4; Kosovo’s and WSDFM’s program records are in slide 4 and in their cards, which name PR-02 and PR-02b, and PR-01', async ({ page }) => {
    await open(page, '');
    const text = await mainText(page);
    expect(count(text, '102 of 150'), 'Kosovo, slide 4 and the Kosovo card').toBe(2);
    expect(count(text, 'Women in Online Work, Kosovo (2016–2017): 68% in work'), 'Kosovo, slide 4').toBe(1);
    expect(count(text, 'Her Power: 372 of 800 tracked in work (47%); 2,500 trained directly.'), 'Her Power, slide 4').toBe(1);
    // WP58 (cycle-30 review, Grok R3): slide 4's line states the count and its base itself ("372 of 800 tracked in work (47%)"), once; no card states it
    expect(count(text, '372 of 800'), 'the count and its base are slide 4’s alone').toBe(1);
    // WP51 (cycle-26 review): WSDFM's figure was slide 4's alone, and no card named PR-01; WP63 (cycle-35 review, Gemini M4): its card shows the program records too
    expect(count(text, '711 of 1,000'), 'WSDFM, slide 4 and the WSDFM card').toBe(2);
    // WP55 (owner decision 2026-10-17, "Show both"): the Kosovo card adds the World Bank's own figure (PR-02b, one line: "World Bank: 77 trainees won at least one online contract."). WP57 (cycle-29 review, Gemini GM4): and its program records
    // (PR-02, "Program records: 102 of 150 women in work."); the band's wrapper names both, and each line names its own. The other program-record figures (PR-01, PR-05) stay slide 4's alone, so no other fact is named.
    expect(await page.locator('#cases [data-fact]').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['PR-01 PR-02 TL-04 PR-02b', 'PR-01', 'PR-02 TL-04', 'PR-02b']);
  });

  test('the other pages keep their case-study figures: Development Partners and Foundations show the Kosovo and Her Power results, no card shows a context line', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const dp = compact(await page.locator('#cases').textContent());
    expect(dp).toContain('102 of 150');
    expect(dp).toContain('372 of 800');
    await expect(page.locator('#cases .case__context')).toHaveCount(0);
    await open(page, 'partner-with-us/foundations/');
    const fo = compact(await page.locator('#cases').textContent());
    expect(fo).toContain('711 of 1,000');
    expect(fo).toContain('372 of 800');
    await expect(page.locator('#cases .case__context')).toHaveCount(0);
  });
});

test.describe('Governments: Her Power is told once', () => {
  test('the "Her Power, with the ICT Division" band is gone; the case study is a text link under the contracts table, which keeps the Her Power row', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#model-partnership')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Her Power, with the ICT Division');
    expect(await mainText(page)).not.toContain('A Model Partnership');

    const link = page.locator('#contracts a', { hasText: 'Read the Her Power Case Study' });
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toMatch(/\/impact\/case-studies\/her-power\/$/);
    await expect(link, 'a text link, never a button').not.toHaveClass(/btn/);

    const geometry = await page.evaluate(() => {
      const top = (s: string) => document.querySelector(s)!.getBoundingClientRect();
      return { tableBottom: top('#contracts table').bottom, noteBottom: top('#contracts .ct__notes').bottom, linkTop: top('#contracts .ct__more a').top };
    });
    expect(geometry.linkTop, 'under the table').toBeGreaterThan(geometry.tableBottom);
    expect(geometry.linkTop, 'under the table’s note').toBeGreaterThanOrEqual(geometry.noteBottom);

    const firstRow = compact(await page.locator('#contracts tbody tr').first().textContent());
    expect(firstRow).toContain('Her Power (Department of ICT (DoICT), ICT Division)');
    expect(firstRow).toContain('25,125 women across 130 sub-districts (upazilas)');
    // WP50 (cycle-25 review, item 15): the row's lines are full sentences ("CodersTrust trained 2,500 women directly."; tests/wp50.spec.ts)
    expect(firstRow).toContain('CodersTrust trained 2,500 women directly.');
    // the contracts table is followed directly by "What Your Agency Gets"
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids.indexOf('features')).toBe(ids.indexOf('contracts') + 1);
  });

  test('Results at a Glance keeps its Her Power tile, linked to the case study, and states the 372 of 800 once on the page', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const tile = page.locator('#glance a[data-fact^="PR-05"]');
    await expect(tile).toHaveCount(1);
    expect(await tile.getAttribute('href')).toMatch(/\/impact\/case-studies\/her-power\/$/);
    expect(count(await mainText(page), '372 of 800')).toBe(1);
  });

  // WP67 (cycle-38 review, Gemini): the answer gives Her Power's two counts (GV-01's 25,125, GV-11's 2,500) and is three short sentences with no closing link (it was "We scale in phases. A 100,000+ national program is a design option we
  // have not yet delivered. See the contract scopes above.", the link being the third sentence; a fourth would break the FAQ cap, tests/wp30c.spec.ts); the contracts table, its anchor and the glance tile's link to it are as they were (tests/wp63.spec.ts)
  test('the national-scale answer is three short sentences (the phases, Her Power’s counts, the design option not yet delivered) with no link, in the page and in its FAQ JSON-LD', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const answer = await answerOf(page, 'Can You Deliver at National Scale?');
    expect(answer).toBe('We scale in phases. Her Power, a national program, trained 25,125 women; CodersTrust provided the curriculum and trained 2,500 directly. A 100,000+ program is a design option we have not yet delivered.');
    expect(sentences(answer)).toHaveLength(3);
    expect(answer, 'the counts are the register’s').toContain(`trained ${fact('GV-01').stat?.value} women`);
    expect(answer).not.toMatch(/120\+|3,120\+|See the contract scopes above/);
    await expect(itemOf(page, 'Can You Deliver at National Scale?').locator('.faq__a a')).toHaveCount(0);
    expect((await faqJsonLd(page)).find((q) => q.name === 'Can You Deliver at National Scale?')?.text).toBe(answer);
    expect(await itemOf(page, 'Can You Deliver at National Scale?').locator('.faq__a p').getAttribute('data-fact')).toBe('GV-01 GV-11 PD-05');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/governments/');
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('JobReady@Work: the hero offers hiring beside training', () => {
  test('"Hire JobReady Talent" is a text link under the one primary button, with the same prefilled inquiry as the call-to-action band', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const hero = page.locator('#hero');
    const link = hero.getByRole('link', { name: /Hire JobReady Talent/ });
    await expect(link).toHaveCount(1);
    await expect(hero.locator('.btn'), 'one button in the hero').toHaveCount(1);
    await expect(hero.locator('.btn--primary')).toHaveText(/Plan Your First Team Program/);
    await expect(link, 'a text link, never a button').not.toHaveClass(/btn/);
    const href = await link.getAttribute('href');
    expect(href).toMatch(/^mailto:.*Talent%20request/);
    expect(href).toBe(await page.locator('#cta a', { hasText: 'Hire JobReady Talent' }).getAttribute('href'));
    // the band's own link stays
    await expect(page.locator('#cta a', { hasText: 'Hire JobReady Talent' })).toHaveCount(1);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the hiring link sits directly under the primary button, on its left edge, with no overflow`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'programs/jobready-work/');
      const boxes = await page.evaluate(() => {
        const rect = (s: string) => {
          const r = document.querySelector(s)!.getBoundingClientRect();
          return { left: r.left, top: r.top, bottom: r.bottom };
        };
        return { button: rect('#hero .btn--primary'), link: rect('#hero .routelinks a') };
      });
      expect(boxes.link.top).toBeGreaterThanOrEqual(boxes.button.bottom - 1);
      expect(boxes.link.top - boxes.button.bottom, 'close under the button, not a band apart').toBeLessThanOrEqual(48);
      expect(Math.abs(boxes.link.left - boxes.button.left)).toBeLessThanOrEqual(2);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('Development Partners: the women-and-marginalized-groups answer does not restate the program figures', () => {
  const QUESTION = 'Can You Reach Women and Other Priority Groups?';
  const SHARED_FIGURES = /71%|68%|372 of 800|47%|2,500/;

  test('the answer says the programs report work outcomes, points to Proof in Practice and keeps the trial’s scope; the FAQ JSON-LD says the same', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const answer = await answerOf(page, QUESTION);
    expect(answer).toBe(
      // WP48 (cycle-23 review): "we have early delivery experience and" is gone (tests/wp48.spec.ts)
      'Our women-focused programs report work outcomes; see Proof in Practice above. For other priority groups, we measure outcomes in each pilot. The randomized trial studied women aged 18–35 in Dhaka with at least a Secondary School Certificate (SSC), so it does not speak to other groups.',
    );
    expect(sentences(answer)).toHaveLength(3);
    expect(answer).not.toMatch(SHARED_FIGURES);
    expect((await faqJsonLd(page)).find((q) => q.name === QUESTION)?.text).toBe(answer);
    // "above" is true: the Proof in Practice band comes before the FAQ
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids.indexOf('cases')).toBeGreaterThan(-1);
    expect(ids.indexOf('cases')).toBeLessThan(ids.indexOf('faq'));
    await expect(page.locator('#cases h2')).toHaveText('Proof in Practice');
  });

  test('the objection bank’s shared answer is unchanged (it keeps the three program results); the page variant is not listed in the bank’s full list', () => {
    const shared = faqs.find((f) => f.id === 'Q6')!;
    expect(shared.a).toContain('WSDFM 71% in work; Women in Online Work, Kosovo 68%; Her Power 372 of 800 tracked women in work (47%), tracked from the 2,500 trained directly by CodersTrust.');
    expect(shared.a).toContain('The randomized trial studied women aged 18–35 in Dhaka with at least a Secondary School Certificate (SSC), so it does not speak to other groups.');
    expect(faqsFor('all').map((f) => f.id)).not.toContain('Q6-development-partners');
    expect(faqsFor('variants').map((f) => f.id)).toContain('Q6-development-partners');
  });
});

// WP50 (cycle-25 review, item 20): the passage no longer repeats the platform-grant inquiry link; the one link is under the funding-routes comparison (tests/wp50.spec.ts)
test.describe('Foundations: the Funding Route 2 passage says what a platform grant supports; the inquiry link sits under the comparison', () => {
  test('one sentence and no link of its own; the platform-grant inquiry link is the one under the comparison; the platform introduction and the live list are in the comparison table only', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const passage = page.locator('#platform-grants .callout', { hasText: 'Funding Route 2 · JobReady Platform Grants' });
    await expect(passage).toHaveCount(1);
    expect(compact(await passage.locator('p[data-fact="IN-04"]').textContent())).toBe('A platform grant supports JobReady’s infrastructure and staged rollout, not cohorts.');
    await expect(passage.getByRole('link')).toHaveCount(0);
    const inquiry = page.locator('.fr__inquire a', { hasText: 'Discuss a JobReady Platform Grant' });
    await expect(inquiry).toHaveCount(1);
    expect(await inquiry.getAttribute('href')).toMatch(/^mailto:.*JobReady%20platform%20grant/);
    await expect(page.getByRole('link', { name: /Discuss a JobReady Platform Grant/ }), 'the link is on the page once').toHaveCount(1);
    expect(compact(await passage.textContent())).not.toMatch(/Live today|In pre-launch|Modules are rolling out|AI-native|jobready\.global/);
    // the list is stated once on the page, in the comparison
    expect(count(await mainText(page), 'Live today:')).toBe(1);
    // WP47 (cycle-22 review): the comparison lists the live subset, "partner portals and AI chat" (the register's IN-04 and the platform page keep the full list)
    expect(compact(await page.locator('#funding-routes').textContent())).toContain('Live today: partner portals and AI chat.');
  });

  // WP40 (cycle-17 review): the numbered jump links ("See Funding Route 1 / 2") are gone from the mechanism band, which links the program and platform pages instead (tests/wp40.spec.ts); the two bands keep their ids and their order
  test('the funding-route bands keep their ids and their order: #cohort-grants, then #platform-grants', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('#platform-grants')).toHaveCount(1);
    const ids = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(ids.indexOf('platform-grants')).toBe(ids.indexOf('cohort-grants') + 1);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: the passage fits its band with no horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/foundations/');
      const fits = await page.locator('#platform-grants .callout').first().evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
      expect(fits).toBe(true);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('Investors: "The Ambition and the Vision" states the 3M+ once', () => {
  test('the opening sentence is gone; the vision, the tile and "A long-term ambition, not a commitment." stay', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const band = page.locator('#vision');
    await expect(band.locator('h2')).toHaveText('The Ambition and the Vision');
    const text = compact(await band.textContent());
    expect(text).not.toContain('The ambition is');
    expect(count(text, '3M+'), 'the 3M+ is the tile’s alone').toBe(1);
    expect(count(text, 'June 30, 2032')).toBe(1);
    // the vision is the register's ID-05, as one sentence
    await expect(band.locator('.vis__lead')).toHaveText(`Our vision: ${fact('ID-05').text.replace(/^A /, 'a ')}.`);
    await expect(band.locator('.vis__note')).toHaveText('A long-term ambition, not a commitment.');
    expect(await band.locator('.vis__copy').getAttribute('data-fact')).toBe('ID-05');
    expect(await band.locator('.factstat').getAttribute('data-fact')).toBe('IN-05');
    await expect(band.locator('.factstat')).toContainText('3M+');
    await expect(band.locator('.factstat')).toContainText('learners and professionals JobReady aims to have on the platform by the fiscal year ending June 30, 2032');
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: the band has no horizontal overflow and the tile stays inside it`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/investors/');
      const fits = await page.locator('#vision').evaluate((band) => {
        const tile = band.querySelector('.vis__stat')!.getBoundingClientRect();
        const b = band.getBoundingClientRect();
        return tile.left >= b.left - 1 && tile.right <= b.right + 1;
      });
      expect(fits).toBe(true);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('Our Model: a timeline answer that says the weeks once, and a plain connectivity heading', () => {
  const QUESTION = 'How Fast Can We Start?';

  test('the answer is two sentences, without the Week 1 to 3 count, tied to PD-04', async ({ page }) => {
    await open(page, 'our-model/');
    const answer = await answerOf(page, QUESTION);
    expect(answer).toBe('Target timing for grant-funded pilots: about three weeks from the first conversation to agreement, then 6–8 weeks from signing to training. Public procurement follows the agency’s own timeline.');
    expect(sentences(answer)).toHaveLength(2);
    expect(answer).not.toMatch(/Counting from the first conversation|Week 1|Week 2|Week 3/);
    expect(await itemOf(page, QUESTION).locator('.faq__a p').getAttribute('data-fact')).toBe('PD-04');
    // PD-04 (the register) carries the same timeline
    expect(fact('PD-04').text).toContain('about three weeks from first conversation to agreement; training starts 6–8 weeks after signing');
  });

  // WP40 (cycle-17 review): YouthWIDE's "What Happens Next" shows the sequence, so YouthWIDE uses the Our Model variant too (tests/wp40.spec.ts); the shared answer stays in the objection bank
  test('the shared answer, with the Week 1 to 3 sentence, stays in the objection bank; YouthWIDE says the weeks once, like Our Model; the variant is not listed in the bank’s full list', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const text = await mainText(page);
    expect(text).toContain('Target timing for grant-funded pilots: about three weeks from the first conversation to agreement, then 6–8 weeks from signing to training. Public procurement follows the agency’s own timeline.');
    expect(text).not.toContain('Counting from the first conversation');
    expect(faqs.find((f) => f.id === 'Q7')!.a).toContain('Counting from the first conversation, Week 1 is a discovery session, Week 2 co-design and Week 3 the agreement; public procurement follows the agency’s own timeline.');
    expect(faqsFor('all').map((f) => f.id)).not.toContain('Q7-model');
    expect(faqsFor('variants').map((f) => f.id)).toContain('Q7-model');
  });

  test('the connectivity card is headed "Learning with Limited Connectivity", in Title Case, with its body unchanged', async ({ page }) => {
    await open(page, 'our-model/');
    const heading = 'Learning with Limited Connectivity';
    const card = page.locator('#delivery .card', { has: page.getByRole('heading', { level: 3, name: heading }) });
    await expect(card).toHaveCount(1);
    expect(titleCase(heading)).toBe(heading);
    expect(compact(await card.locator('.card__text').textContent())).toBe('Lessons work over a 1.5 Mbps connection, and 720p lessons can be downloaded for offline viewing.');
    expect(await card.locator('.card__text').getAttribute('data-fact')).toBe('PD-07');
    expect(await mainText(page)).not.toContain('Connectivity-Light Delivery');
    // six cards, as before
    await expect(page.locator('#delivery .card')).toHaveCount(6);
  });
});

test.describe('"CRM" is written out wherever the live-platform list is printed', () => {
  test('the register’s IN-04 says "customer relationship management" and no longer "CRM"', () => {
    expect(fact('IN-04').text).toContain('Live today: partner portals, marketing automation, customer relationship management and AI chat. In pre-launch: the employer marketplace and the gig-work marketplace.');
    expect(fact('IN-04').text).not.toMatch(/\bCRM\b/);
  });

  test('no built page prints the bare acronym, and every page that lists marketing automation names customer relationship management beside it', () => {
    expect(pagesWithMarkup(/\bCRM\b/).map((p) => p.route)).toEqual([]);
    const listing = pagesWithMarkup(/marketing automation/i);
    // the platform page, the Employers and JobReady@Work FAQs (WP47, cycle-22 review: the Foundations comparison lists "partner portals and AI chat" only; WP40, cycle-17 review: Investors' "What JobReady Does" is three short cards that name the two modules institutions use, "Partner portals and AI chat
    // are live", beside a link to the full rollout status, as its hero lead does; so Investors no longer lists marketing automation)
    // WP48 (cycle-23 review, item 5): the Employers and JobReady@Work FAQs ("Is the JobReady Platform Live?") no longer list the internal tooling ("Partner portals and AI chat are live; ..."); the JobReady Platform page keeps the full list
    expect(listing.map((p) => p.route)).toEqual(expect.arrayContaining(['/our-model/jobready-platform/']));
    expect(listing.map((p) => p.route)).not.toContain('/partner-with-us/foundations/');
    expect(listing.map((p) => p.route)).not.toContain('/partner-with-us/employers/');
    expect(listing.map((p) => p.route)).not.toContain('/programs/jobready-work/');
    expect(listing.filter((p) => !/customer relationship management/i.test(readFileSync(p.file, 'utf8'))).map((p) => p.route)).toEqual([]);
  });

  for (const [route, expected] of [
    // WP49 (cycle-24 review): the "What Is Live Today" callout is gone; the status table names the live list in its "Across the Platform" row and says the course storefront operates in its first row
    ['our-model/jobready-platform/', ['Marketing automation, customer relationship management and AI chat', 'CodersTrust’s course storefront operates at jobready.global.']],
    ['partner-with-us/investors/', ['Partner portals and AI chat are live.']],
  ] as [string, string[]][]) {
    test(`${route}: the live list reads in full`, async ({ page }) => {
      await open(page, route);
      const text = await mainText(page);
      for (const e of expected) expect(text).toContain(e);
    });
  }

  // WP41 (cycle-18 review): the platform page has "Rollout Status" directly above its questions (the table and the "What Is Live Today" callout), so its answer points there instead of listing the status a third time
  // (tests/wp41.spec.ts); the shared answer stays in full on Employers and JobReady@Work
  test('the "Is the JobReady Platform Live?" answer reads in full on Employers and JobReady@Work and points to "Rollout Status" on the platform page, and the FAQ JSON-LD says what the page says', async ({ page }) => {
    for (const route of ['partner-with-us/employers/', 'programs/jobready-work/']) {
      await open(page, route);
      const answer = await answerOf(page, 'Is the JobReady Platform Live?');
      // WP48 (cycle-23 review): the answer names the live modules a partner or employer deals with, not the internal tooling (tests/wp48.spec.ts)
      expect(answer, route).toBe('Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch. Hiring currently runs through CodersTrust’s placement team.');
      expect((await faqJsonLd(page)).find((q) => q.name === 'Is the JobReady Platform Live?')?.text, route).toBe(answer);
    }
    await open(page, 'our-model/jobready-platform/');
    const platform = await answerOf(page, 'Is the JobReady Platform Live?');
    expect(platform).toBe('Partly. See Rollout Status above for live, pre-launch and planned capabilities.');
    expect((await faqJsonLd(page)).find((q) => q.name === 'Is the JobReady Platform Live?')?.text).toBe(platform);
    // WP39 (cycle-16 review): Investors lists the status in "What JobReady Does", directly above its questions, so its answer points there (tests/wp39.spec.ts); the JSON-LD still reads the same as the page
    await open(page, 'partner-with-us/investors/');
    const investors = await answerOf(page, 'Is the JobReady Platform Live?');
    expect(investors).toBe('Partly. See What JobReady Does above for the live, pre-launch and planned capabilities.');
    expect((await faqJsonLd(page)).find((q) => q.name === 'Is the JobReady Platform Live?')?.text).toBe(investors);
  });

  test('the platform page’s meta description names the live modules the menu names and fits the 155-character limit', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    // WP53 (owner decision 2026-10-16): JobReady is "CodersTrust’s digital learning and earning platform"
    expect(description).toBe('JobReady is CodersTrust’s digital learning and earning platform. Partner portals and AI chat are live; more modules follow.');
    expect(description.length).toBeLessThanOrEqual(155);
  });
});
