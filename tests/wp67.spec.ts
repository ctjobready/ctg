import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { CONTRACT_FIGURES } from '../src/data/copy';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP67 behaviors (cycle-38 whole-site reviews, Perplexity models; the accepted triage items 1 to 8). Written before the changes and run red against the cycle-37 build, then green (the owner exempted this project from test-first work, so this is
 * a courtesy, not a gate); each test states one observable behavior of the register or of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp67.spec.ts --project=chromium`):
 *   - 1: the SC-11 tile (About, Careers, Local Partners) reads "organizations with signed MOUs, agreements or contracts since 2014", as the hub line and SC-11's text do;
 *   - 2: OC-03's before-training median is worded "the median before training was $98", never "up from $98", on Home slide 3, the Impact and Foundations glance tiles, the Impact Survey 2026 tile and the YouthWIDE tile;
 *   - 3: the "Where They Work" card (Home, YouthWIDE, Development Partners and the shared mechanism band) closes "..., as agreed in the program scope.";
 *   - 4: "MoU" is "MOU" wherever it is printed (the one exception is a person's words, quoted verbatim in an archived news post);
 *   - 5: YouthWIDE's track-record heading is "We’ve Built This Path Since 2014", as on the other pages;
 *   - 6: Governments' "Can You Deliver at National Scale?" answer gives Her Power's figures from the register (three sentences, no link);
 *   - 7: the Programs hub card for YouthWIDE is "Best For: Governments, Development Partners and Foundations";
 *   - 8: Our Model's "Local Labs, Coordinated Delivery" card opens "After about five months of delivery, programs are designed to run ...".
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);
const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z“])/).filter(Boolean);

/** Every built page (archived news posts included), with its HTML. */
const allPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The visible text of a built page (no scripts or styles), entities decoded, no-break spaces as spaces. */
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;| /g, ' '),
  );
/** The routes of the built pages whose visible text contains any of these strings. */
const pagesWith = (...needles: string[]) => allPages().filter((p) => needles.some((n) => visible(p.html).includes(n))).map((p) => p.route);

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

const HOME = '';
const ABOUT = 'about/';
const CAREERS = 'careers/';
const LOCAL = 'partner-with-us/local-partners/';
const GOVERNMENTS = 'partner-with-us/governments/';
const DEV_PARTNERS = 'partner-with-us/development-partners/';
const FOUNDATIONS = 'partner-with-us/foundations/';
const YOUTHWIDE = 'programs/youthwide/';
const PROGRAMS = 'programs/';
const OUR_MODEL = 'our-model/';
const IMPACT = 'impact/';
const OUTCOMES = 'impact/outcomes-2026/';
const NEWS = 'news/';

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 1: the SC-11 tile says "signed MOUs, agreements or contracts since 2014"', () => {
  const LABEL = 'organizations with signed MOUs, agreements or contracts since 2014';

  test('the register: SC-11’s label is the new wording and its figure, text and detail are unchanged', () => {
    const sc11 = fact('SC-11');
    expect(sc11.stat?.label).toBe(LABEL);
    expect(sc11.stat?.value).toBe('70+');
    expect(sc11.text).toBe('70+ organizations with signed MOUs, agreements or contracts since 2014: 13 government bodies, 20 universities and colleges, 13 development partners and NGOs, and 27 companies and industry bodies');
    expect(sc11.stat?.detail).toBe('13 government bodies, 20 universities and colleges, 13 development partners and NGOs, 27 companies and industry bodies.');
  });

  for (const [route, selector] of [
    [ABOUT, '#glance .factstat[data-fact="SC-11"]'],
    [CAREERS, '#why .factstat[data-fact="SC-11"]'],
    [LOCAL, '#guide .factstat[data-fact="SC-11"]'],
  ] as const) {
    test(`${route}: the 70+ tile reads the new label`, async ({ page }) => {
      await open(page, route);
      const tile = page.locator(selector);
      await expect(tile).toHaveCount(1);
      await expect(tile.locator('.stat__value')).toHaveText('70+');
      expect(compact(await tile.locator('.stat__label').textContent())).toBe(LABEL);
    });
  }

  test('"signed partnership agreements" is on no built page', () => {
    expect(pagesWith('signed partnership agreements')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 2: OC-03’s before-training median is "the median before training was $98", not "up from $98"', () => {
  const NOTE = 'The median before training was $98 (October 2026 survey).';
  const LABEL = 'median monthly income among surveyed completers at the October 2026 survey; the median before training was $98';
  const CAPTION = 'median monthly income among surveyed completers; the median before training was $98.';

  test('the register: the stat label and the glance note say it (no "up from"); the figures, the register sentence and the glance label are unchanged', () => {
    const oc03 = fact('OC-03');
    expect(oc03.stat?.label).toBe(LABEL);
    expect(oc03.stat?.glance?.note).toBe(NOTE);
    expect(oc03.stat?.glance?.label).toBe('median monthly income among surveyed completers');
    expect(oc03.stat?.value).toBe('$245');
    expect(oc03.stat?.from).toBe('$98');
    expect(oc03.text).toBe('Among surveyed completers, median monthly income rose from $98 before training to $245 at the October 2026 survey (2.5×)');
    expect(`${oc03.stat?.label} ${oc03.stat?.glance?.note}`).not.toMatch(/up from/i);
  });

  test('Home slide 3: "$245" and "median monthly income among surveyed completers; the median before training was $98."', async ({ page }) => {
    await open(page, HOME);
    const s = slide(page, 3);
    await expect(s.locator('h3')).toHaveText('Surveyed Completers Report Higher Income');
    await expect(s.locator('.hs__stat')).toHaveCount(1);
    expect(await s.locator('.hs__stat').getAttribute('data-fact')).toBe('OC-03');
    await expect(s.locator('.stat__value')).toHaveText('$245');
    expect(compact(await s.locator('.stat__label').textContent())).toBe(CAPTION);
  });

  for (const [route, selector] of [
    [FOUNDATIONS, '#glance li'],
    [IMPACT, '#glance a[data-fact~="OC-03"]'],
  ] as const) {
    test(`${route}: the $245 glance tile ends with the note "${NOTE}"`, async ({ page }) => {
      await open(page, route);
      const tile = page.locator(selector, { hasText: '$245' });
      await expect(tile).toHaveCount(1);
      const text = compact(await tile.textContent());
      expect(text).toContain(NOTE);
      expect(text).toContain('(October 2026 survey)');
      expect(text).not.toMatch(/up from/i);
    });
  }

  for (const [route, selector] of [
    [OUTCOMES, '#summary [data-fact="OC-03"] .stat__label'],
    [YOUTHWIDE, '.eb__stat[data-fact="OC-03"] .stat__label'],
  ] as const) {
    test(`${route}: the $245 tile’s label is the register’s (the survey date, then the before-training median)`, async ({ page }) => {
      await open(page, route);
      const label = page.locator(selector);
      await expect(label).toHaveCount(1);
      expect(compact(await label.textContent())).toBe(LABEL);
    });
  }

  test('no built page says "up from $98" (or "up from $82", the previous edition’s median before training)', () => {
    expect(pagesWith('up from $98', 'Up from $98', 'up from $82', 'Up from $82')).toEqual([]);
    const raw = allPages().filter((p) => /up from \$(?:98|82)\b/i.test(p.html)).map((p) => p.route);
    expect(raw, 'not in attributes or structured data either').toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 3: the "Where They Work" card closes "as agreed in the program scope"', () => {
  const TEXT = 'Placement support, then outcome tracking for 12 months after each course, as agreed in the program scope.';

  test('the months are still PD-02’s', () => {
    expect(fact('PD-02').text).toContain('outcome tracking for 12 months after each course');
  });

  test('Home, YouthWIDE and Development Partners show the same card text, under the same title', async ({ page }) => {
    for (const route of [HOME, YOUTHWIDE, DEV_PARTNERS]) {
      await open(page, route);
      const card = page.locator('#mechanism li', { has: page.locator('.model__label', { hasText: 'Where They Work' }) });
      await expect(card, route).toHaveCount(1);
      await expect(card.locator('.model__title'), route).toHaveText('Local, Remote and Global Work');
      expect(compact(await card.locator('.model__text').textContent()), route).toBe(TEXT);
    }
  });

  test('the shared mechanism band’s default (the styleguide shows it) says it too, and the card text without the qualifier is on no built page', () => {
    expect(pagesWith(TEXT)).toEqual(expect.arrayContaining(['/', '/programs/youthwide/', '/partner-with-us/development-partners/', '/styleguide/']));
    expect(pagesWith('Placement support and outcome tracking for 12 months after each course.')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 4: "MoU" is "MOU" wherever it is printed', () => {
  test('the register: TL-06’s label and PA-05’s text say MOU', () => {
    expect(fact('TL-06').stat?.label).toBe('MOU with The City College of New York');
    expect(fact('PA-05').text).toContain('The City College of New York (CCNY), a memorandum of understanding (MOU) partner since 2024');
    expect(fact('PA-05').text).not.toContain('MoU');
  });

  test('Home prints "a memorandum of understanding (MOU) partner since 2024"', async ({ page }) => {
    await open(page, HOME);
    expect(compact(await page.locator('main').textContent())).toContain('The City College of New York (CCNY), a memorandum of understanding (MOU) partner since 2024');
  });

  test('the news topic is "Partnerships and MOUs" on the News page, with the page’s lead and its meta description', async ({ page }) => {
    await open(page, NEWS);
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('Partnerships and MOUs, recognition, program events and leadership: what CodersTrust has announced');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toContain('partnerships and MOUs, recognition, program events and leadership');
  });

  test('"MoU" is on no built page, in its text, attributes or structured data, except in one person’s words (an archived news post quotes them verbatim)', () => {
    // a URL or a file name keeps its case ("MoU-with-Ostitto.jpeg" is a legacy upload path in the redirect tables, not a page), so link and source attributes are taken out first
    const withoutUrls = (html: string) => html.replace(/\b(?:href|src|srcset|data-src|poster|action|content)="(?:https?:)?\/[^"]*"/g, ' ').replace(/https?:\/\/[^\s"'<>)]+/g, ' ');
    const found = allPages()
      .map((p) => ({ route: p.route, n: (withoutUrls(p.html).match(/MoUs?\b/g) ?? []).length }))
      .filter((p) => p.n > 0);
    expect(found.map((p) => p.route)).toEqual(['/news/coderstrust-bangladesh-and-ostitto-join-forces-to-bridge-the-digital-divide/']);
    const html = allPages().find((p) => p.route === found[0].route)!.html;
    const text = visible(html);
    expect(text).toContain('and this MoU with CodersTrust shows that transformative potential,');
    expect(text.match(/MoU/g)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 5: YouthWIDE’s track-record heading is "We’ve Built This Path Since 2014"', () => {
  test('the heading reads as on the other pages, and the learners tile still leaves the year to it (WP64)', async ({ page }) => {
    await open(page, YOUTHWIDE);
    await expect(page.locator('#guide h2')).toHaveText('We’ve Built This Path Since 2014');
    const labels = await texts(page, '#guide .factstat .stat__label');
    expect(labels.some((l) => l === 'learners trained'), labels.join(' | ')).toBe(true);
    expect(labels.some((l) => /since 2014/i.test(l)), 'the heading says the year once').toBe(false);
  });

  test('"We Have Built This Path" is on no built page', () => {
    expect(pagesWith('We Have Built This Path')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 6: Governments’ "Can You Deliver at National Scale?" answer gives Her Power’s figures', () => {
  const Q = 'Can You Deliver at National Scale?';
  const ANSWER = 'We scale in phases. Her Power is a national program to train 25,125 women; CodersTrust provided the curriculum and trained 2,400 directly. A 100,000+ program is a design option we have not yet delivered.';
  const item = (page: Page) => page.locator('#faq details', { has: page.locator('summary', { hasText: Q }) });

  test('the figures are the register’s (GV-01’s 25,125 and GV-11’s 2,400, GV-13 holds the same count)', () => {
    expect(fact('GV-01').stat?.value).toBe('25,125');
    expect(fact('GV-11').text).toContain('2,400 women trained directly');
    expect(fact('GV-13').stat?.value).toBe('2,400');
    expect(CONTRACT_FIGURES).toEqual({ national: '25,125', direct: '2,400' });
    expect(fact('PD-05').text).toContain('National Design Option 100,000+ trainees'); // WP69 (owner item 3): the option is "National Design Option"
  });

  test('the answer is three sentences with no link, its JSON-LD says the same, and it rests on GV-01, GV-11 and PD-05', async ({ page }) => {
    await open(page, GOVERNMENTS);
    await expect(item(page)).toHaveCount(1);
    const answer = compact(await item(page).locator('.faq__a').textContent());
    expect(answer).toBe(ANSWER);
    expect(sentences(answer)).toHaveLength(3);
    await expect(item(page).locator('.faq__a a')).toHaveCount(0);
    expect(answer).not.toContain('See the contract scopes above');
    expect(await item(page).locator('.faq__a p').getAttribute('data-fact')).toBe('GV-01 GV-11 PD-05');
    expect((await faqJsonLd(page)).find((q) => q.name === Q)?.text).toBe(ANSWER);
  });

  test('the Investors answer keeps its own wording (Her Power first, then the phases)', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const answer = compact(await page.locator('#faq details', { has: page.locator('summary', { hasText: Q }) }).locator('.faq__a').textContent());
    expect(answer).toContain('A 100,000+ national program is a design option we have not yet delivered.');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 7: the Programs hub says "Best For: Governments, Development Partners and Foundations"', () => {
  test('the YouthWIDE card’s audience matches the three routes under it, and no card says "Funders"', async ({ page }) => {
    await open(page, PROGRAMS);
    const card = page.locator('#programs-grid li:has(a[href$="programs/youthwide/"])');
    expect(compact(await card.locator('.hub__aud:not(.hub__partner)').textContent())).toBe('Best For: Governments, Development Partners and Foundations');
    expect(await texts(page, '#programs-grid li:has(a[href$="programs/youthwide/"]) .hub__partner a')).toEqual(['For Governments', 'For Development Partners', 'For Foundations']);
    for (const aud of await texts(page, '#programs-grid .hub__aud:not(.hub__partner)')) expect(aud).not.toMatch(/funders/i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Item 8: Our Model’s scale card says "After about five months of delivery, programs are designed to run ..."', () => {
  const TEXT = 'After about five months of delivery, programs are designed to run up to 10 certification cohorts in parallel, using existing labs and certified local facilitators.';

  test('"Local Labs, Coordinated Delivery" reads as above, still rests on PD-06, and the earlier sentences are on no built page', async ({ page }) => {
    await open(page, OUR_MODEL);
    const card = page.locator('#delivery .card', { hasText: 'Local Labs, Coordinated Delivery' });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.card__text').textContent())).toBe(TEXT);
    expect(await card.locator('[data-fact]').getAttribute('data-fact')).toBe('PD-06');
    expect(pagesWith('From about month 5 of a program', 'From about month 5, programs are designed')).toEqual([]);
  });

  test('the register’s PD-06 text is unchanged ("from about month 5")', () => {
    expect(fact('PD-06').text).toBe(
      'Up to 10 certification cohorts in parallel from about month 5; classes of 20 (labs) and 40 (lectures); hub-and-spoke delivery with certified local facilitators for larger programs',
    );
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('Layout: the changed pages stay inside the page', () => {
  const ROUTES = [HOME, ABOUT, CAREERS, LOCAL, GOVERNMENTS, DEV_PARTNERS, FOUNDATIONS, YOUTHWIDE, PROGRAMS, OUR_MODEL, IMPACT, OUTCOMES, NEWS];
  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px: no sideways scroll on any of the ${ROUTES.length} pages, and the SC-11 and OC-03 tiles sit inside the viewport`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ROUTES) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route || 'Home'} at ${vp.width}px`).toBe(true);
      }
      for (const [route, selector] of [
        [ABOUT, '#glance .factstat[data-fact="SC-11"] .stat'],
        [CAREERS, '#why .factstat[data-fact="SC-11"] .stat'],
        [LOCAL, '#guide .factstat[data-fact="SC-11"] .stat'],
        [OUTCOMES, '#summary [data-fact="OC-03"] .stat'],
        [YOUTHWIDE, '.eb__stat[data-fact="OC-03"] .stat'],
      ] as const) {
        await open(page, route);
        const box = await page.locator(selector).first().boundingBox();
        expect(box, `${route}: ${selector}`).not.toBeNull();
        expect(box!.x, `${route} left edge`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${route} right edge at ${vp.width}px`).toBeLessThanOrEqual(vp.width + 1);
      }
    });
  }
});
