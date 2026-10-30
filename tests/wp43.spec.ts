import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';
import { pagesWithMarkup } from './support/pages';

/**
 * WP43 behaviors (cycle-20 whole-site review, GPT-6.1 Sol items 1-9): Investors' track-record band is the delivered tiles, the origin line, ONE paragraph that names the institutions by type and the link to the leadership team
 * (no relationship lists, no founder or leadership entries); Investors' mechanism band is headed "How JobReady Connects Learning to Work" and its one-sentence platform band is gone; About's "Outcomes over Outputs" principle
 * is about youth-employment programs; Universities has one evidence strip, not two; Home's speed slide has no lead sentence; the partner hub's cost answer is three shorter sentences; JobReady@Campus' "Our Approach" is two
 * sentences with the reporting scoped; Development Partners' cost-of-waiting heading and Foundations' problem heading are not absolute claims. Retrospective coverage (the owner exempted this project from test-first work);
 * each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp43.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
/** An href as rendered ("/ctg/our-model/") without the staging base, so the test does not depend on it. */
const sitePath = (href: string) => href.replace(/^\/ctg(?=\/)/, '');
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z“])/);
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** The ids of main's bands in page order, with whether each is a dark one (nested sections are not bands). */
const bands = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main .band[id]')).map((b) => ({ id: b.id, dark: /band--(klein|deep-ink)/.test(b.className) })));
/** Edges of an element on the page (document coordinates). */
const box = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const r = (document.querySelector(sel) as HTMLElement).getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, left: r.left, width: r.width };
  }, selector);

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

test.describe('Investors: the track-record band (item 1)', () => {
  const URL = 'partner-with-us/investors/';
  // WP65 (cycle-37 review, GLM): the last sentence names AWS by the status PA-06 registers, "CodersTrust is an AWS Authorized Training Partner", not as a partner beside the other two (it was "... Grameenphone Academy, Accenture and AWS."; tests/wp65.spec.ts)
  const PARTNERS =
    'Government partners include Bangladesh’s ICT Division, the Department of ICT (DoICT) and the Bangladesh Hi-Tech Park Authority. Development partners include UNDP, the World Bank Group and the World Food Programme. University partners include National University and The City College of New York, a memorandum of understanding (MOU) partner since 2024. Private-sector partners include Grameenphone Academy and Accenture, and CodersTrust is an AWS Authorized Training Partner.';

  test('the delivered tiles, the origin line and the TalentLEAP line stay; the only sub-heading left is "Delivered Since 2014"', async ({ page }) => {
    await open(page, URL);
    expect(await texts(page, '#guide .ig__tile .stat__value')).toEqual(['130,000+', '150,000+', '16']);
    expect(await page.locator('#guide .ig__tile').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['SC-01', 'SC-02', 'SC-03']);
    // WP51 (cycle-26 review, Grok m1): the shared origin line, "Since 2014, from a Copenhagen launch to work in 16 countries and territories." (it was "Launched in Copenhagen in 2014.")
    expect(compact(await page.locator('#guide p[data-fact="ID-02 SC-03"]').textContent())).toBe('From a Copenhagen launch to work in 16 countries and territories.'); // WP64 rework RW2 (coordinator): the heading says "Since 2014", so the line does not
    // WP46 (cycle-22 review): "with progressive levels" is gone from the Track Record bands (only the first level is published)
    expect(compact(await page.locator('#guide .ig__method').textContent())).toContain('TalentLEAP, our method, organizes skills into career paths.');
    expect(compact(await page.locator('#guide .ig__method').textContent())).not.toContain('progressive levels');
    await expect(page.locator('#guide h2')).toHaveText('A Record Built Since 2014');
    expect(await texts(page, '#guide h3')).toEqual(['Scale and Partners']);
  });

  test('the four relationship lists and the seven founder and leadership entries are gone: no panel, list, portrait or person in the band, and no person anywhere on the page', async ({ page }) => {
    await open(page, URL);
    await expect(page.locator('#guide .ig__channels, #guide ul, #guide li, #guide img, #guide [data-asset]')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/Four Kinds of Institutional Relationship|Founders|Current Leadership/);
    for (const person of ['Aziz Ahmad', 'Ferdinand Kjærulff', 'Md. Shamsul Haque', 'Mahdee Zaman', 'Shafqat Ullah', 'Asad Zaman', 'Rezaul Karim Khan']) expect(text, person).not.toContain(person);
    // the lists' own wording is not left behind in the band ("Development and NGO partners include ...", "University partners: ...")
    expect(compact(await page.locator('#guide').textContent())).not.toMatch(/Development and NGO partners|University partners:|the Rockefeller Foundation|Save the Children|UPEACE|Robi/);
  });

  test('ONE paragraph names the institutions by type, in the register’s own sentence pattern, with its two relationship qualifiers and the register’s facts', async ({ page }) => {
    await open(page, URL);
    const paragraph = page.locator('#guide .ig__names');
    await expect(paragraph).toHaveCount(1);
    expect(await paragraph.evaluate((el) => el.tagName)).toBe('P');
    expect(compact(await paragraph.textContent())).toBe(PARTNERS);
    expect(await paragraph.getAttribute('data-fact')).toBe('PA-02 PA-01 PA-05 PA-03 PA-06');
    expect(sentences(PARTNERS).map((s) => s.split(' include')[0])).toEqual(['Government partners', 'Development partners', 'University partners', 'Private-sector partners']);
    // the two relationship qualifiers travel with their names: National University "(official training partner)", The City College of New York "a memorandum of understanding (MOU) partner since 2024"
    // WP130 (Opus High run 5): NU’s role is stated in the next band (SC-04), so the paragraph names the university only.
    expect(PARTNERS).not.toContain('National University (official training partner)');
    expect(PARTNERS).toContain('The City College of New York, a memorandum of understanding (MOU) partner since 2024');
    // the first mention of DoICT on the page is spelled out (the Her Power answer in the FAQ says "DoICT")
    const text = await mainText(page);
    expect(text.indexOf('the Department of ICT (DoICT)')).toBeGreaterThan(-1);
    // WP115: the Her Power answer now spells DoICT out as well, so the check is that the first "DoICT" on the page sits inside "Department of ICT (DoICT)".
    expect(text.indexOf('DoICT')).toBe(text.indexOf('Department of ICT (DoICT)') + 'Department of ICT ('.length);
  });

  test('every institution the paragraph names is in the register fact it rests on, and the two relationships are the register’s', async () => {
    const named: Record<string, string[]> = {
      'PA-02': ['Bangladesh’s ICT Division', 'DoICT', 'Bangladesh Hi-Tech Park Authority'],
      'PA-01': ['UNDP', 'the World Bank Group', 'the World Food Programme'],
      // WP130: the paragraph names NU without its role (stated in the next band, SC-04).
      'PA-05': ['National University', 'The City College of New York (CCNY), a memorandum of understanding (MOU) partner since 2024'],
      'PA-03': ['Grameenphone Academy', 'Accenture'],
      'PA-06': ['AWS Authorized Training Partner'], // WP65: AWS is named by its registered status, not listed as a PA-03 partner
    };
    for (const [id, names] of Object.entries(named)) for (const name of names) expect(fact(id).text, `${id} names "${name}"`).toContain(name);
    // and the paragraph names exactly these (the register's "(CCNY)" and "; post graduate diploma courses" are the only parts of the two university entries it leaves out)
    for (const name of Object.values(named).flat()) expect(PARTNERS, name).toContain(name.replace(' (CCNY)', ''));
  });

  test('"Meet the Leadership Team" is the link under the paragraph (to the team page), and the closing band no longer carries it', async ({ page }) => {
    await open(page, URL);
    const link = page.locator('#guide').getByRole('link', { name: 'Meet the Leadership Team' });
    await expect(link).toHaveCount(1);
    expect(sitePath((await link.getAttribute('href')) ?? '')).toBe('/about/team/');
    expect((await box(page, '#guide .ig__leaders')).top).toBeGreaterThan((await box(page, '#guide .ig__names')).bottom - 1);
    await expect(page.getByRole('link', { name: 'Meet the Leadership Team' })).toHaveCount(1);
    await expect(page.locator('#cta a[href*="/about/team/"]')).toHaveCount(0);
    await expect(page.locator('#cta .btn')).toHaveCount(1);
    expect(compact(await page.locator('#cta h2').textContent())).toBe('Let’s Talk About Backing the Platform');
  });

  test('desktop: the paragraph sits under the copy and the figures at a reading width; phone: one column, no sideways scroll', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, URL);
    const [copy, delivered, names, leaders] = await Promise.all([box(page, '#guide .ig__copy'), box(page, '#guide .ig__delivered'), box(page, '#guide .ig__names'), box(page, '#guide .ig__leaders')]);
    expect(names.top, 'under both columns').toBeGreaterThan(Math.max(copy.bottom, delivered.bottom) - 1);
    expect(names.width, 'a reading measure (48rem), not the full container').toBeLessThanOrEqual(769);
    expect(leaders.top).toBeGreaterThan(names.bottom - 1);
    expect(await noOverflow(page)).toBe(true);
    await page.setViewportSize(MOBILE);
    await open(page, URL);
    expect(await noOverflow(page), '390px').toBe(true);
    const [c, d, n, l] = await Promise.all([box(page, '#guide .ig__copy'), box(page, '#guide .ig__delivered'), box(page, '#guide .ig__names'), box(page, '#guide .ig__leaders')]);
    expect(c.top).toBeLessThan(d.top);
    expect(d.top).toBeLessThan(n.top);
    expect(n.top).toBeLessThan(l.top);
  });
});

test.describe('Investors: the mechanism heading and the platform band (items 8 and 9)', () => {
  const URL = 'partner-with-us/investors/';

  test('the mechanism band is headed "How JobReady Connects Learning to Work" (Title Case), keeps its eyebrow, its id and its four blocks', async ({ page }) => {
    await open(page, URL);
    await expect(page.locator('section#mechanism')).toHaveCount(1);
    await expect(page.locator('#mechanism .eyebrow').first()).toHaveText('The Model');
    await expect(page.locator('#mechanism h2')).toHaveText('How JobReady Connects Learning to Work');
    expect('How JobReady Connects Learning to Work').toBe(titleCase('How JobReady Connects Learning to Work'));
    expect(await mainText(page)).not.toMatch(/Multi-Sided Model|A Multi-Sided/);
    expect(await texts(page, '#mechanism h3')).toEqual(['Courses, Bootcamps and University Programs', 'Jobs, Freelance Work and Gigs', 'Career Paths and Continuing Development', 'A Digital Delivery Platform']);
  });

  test('the one-sentence platform band is gone: the FAQ is followed by the offer; the platform-outcomes sentence closes the evidence block once; the first FAQ answer still links "What JobReady Does" (#features)', async ({ page }) => {
    await open(page, URL);
    await expect(page.locator('#platform')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/How JobReady Builds on Delivery|JobReady adds live partner portals and pre-launch work marketplaces/);
    await expect(page.locator('main .eyebrow', { hasText: 'The Platform' })).toHaveCount(0);
    expect(count(text, 'Youth-program outcomes are not platform outcomes.'), 'said once').toBe(1);
    expect(compact(await page.locator('#proof-band').textContent())).toContain('Youth-program outcomes are not platform outcomes.');
    const ids = (await bands(page)).map((b) => b.id);
    expect(ids.indexOf('offer')).toBe(ids.indexOf('faq') + 1);
    // the link target of the first FAQ answer (Q11-investor) is the "What JobReady Does" band, which keeps its id and its heading
    const link = page.locator('#faq a[href="#features"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('What JobReady Does');
    await expect(page.locator('section#features h2')).toHaveText('What JobReady Does');
  });

  test('the bands keep their order (guide, vision, mechanism, reach, proof, features, questions, offer, call to action) and no two dark bands touch', async ({ page }) => {
    await open(page, URL);
    const list = await bands(page);
    const ids = list.map((b) => b.id);
    const order = ['guide', 'vision', 'mechanism', 'reach', 'proof-band', 'features', 'faq', 'offer', 'cta'];
    for (const id of order) expect(ids, id).toContain(id);
    expect(order.map((id) => ids.indexOf(id)), 'in this order').toEqual([...order.map((id) => ids.indexOf(id))].sort((a, b) => a - b));
    for (let i = 1; i < list.length; i++) expect(list[i].dark && list[i - 1].dark, `bands ${list[i - 1].id} and ${list[i].id}`).toBe(false);
  });
});

test.describe('About: "Outcomes over Outputs" is about youth-employment programs (item 2)', () => {
  test('the principle judges youth-employment programs by whether young people end up working and earning, not by how many attended', async ({ page }) => {
    await open(page, 'about/');
    const card = page.locator('#how-we-work article', { has: page.locator('h3', { hasText: 'Outcomes over Outputs' }) });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.card__text').textContent())).toBe('We judge youth-employment programs by whether young people end up working and earning, not by how many attended.');
    expect(await mainText(page)).not.toContain('We judge a program by');
    expect(compact(await card.locator('a').textContent())).toBe('See the Outcomes');
    expect(await texts(page, '#how-we-work .principle h3')).toEqual(['Outcomes over Outputs', 'Inclusion by Design', 'Evidence Before Claims', 'Partnership and Accountability']);
  });
});

test.describe('Universities: one evidence strip, not two (item 3)', () => {
  const URL = 'partner-with-us/universities/';

  test('the later strip ("Evidence from Our Wider Youth Programs": the trial line, the survey line, the repeated links) and its anchor are gone; the first band keeps its linked strip', async ({ page }) => {
    await open(page, URL);
    await expect(page.locator('#proof-band')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/Evidence from Our Wider Youth Programs|A randomized trial of the predecessor WSDFM program/);
    expect(count(text, '10.3 percentage points'), 'the trial result is not restated').toBe(0);
    expect(count(text, '78.2%'), 'the survey result is not restated').toBe(0);
    await expect(page.locator('main .eyebrow', { hasText: 'The Evidence' })).toHaveCount(0);
    // the first band ends in the strip that links the evidence
    await expect(page.locator('#offer-evidence h2')).toHaveText('The National University Partnership');
    expect(compact(await page.locator('#offer-evidence .pe__more-label').textContent())).toBe('Broader Evidence from Our Youth Programs');
    expect(await texts(page, '#offer-evidence nav a')).toEqual(['The Randomized Trial', 'Impact Survey 2026', 'Case Studies']);
    expect((await hrefs(page, '#offer-evidence nav a')).map(sitePath)).toEqual(['/impact/independent-evaluation/', '/impact/outcomes-2026/', '/impact/case-studies/']);
    await expect(page.locator('main nav[aria-label]', { hasText: 'The Randomized Trial' })).toHaveCount(1);
  });

  test('no page links to the removed anchor, and Local Partners keeps its own strip of the same name', async ({ page }) => {
    expect(pagesWithMarkup(/partner-with-us\/universities\/#proof-band/).map((p) => p.route)).toEqual([]);
    await open(page, 'partner-with-us/local-partners/');
    await expect(page.locator('#proof h2')).toHaveText('Evidence from Our Wider Youth Programs');
  });

  test('the features band follows the dark mechanism band directly (no two dark bands meet) and the page fits at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, URL);
      const list = await bands(page);
      const ids = list.map((b) => b.id);
      expect(ids.indexOf('features'), `${vp.width}px`).toBe(ids.indexOf('mechanism') + 1);
      for (let i = 1; i < list.length; i++) expect(list[i].dark && list[i - 1].dark, `${vp.width}px: ${list[i - 1].id} then ${list[i].id}`).toBe(false);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Home: the survey slide’s timing line is one sentence that repeats neither the heading nor a tile (item 4; WP53)', () => {
  // WP43 (cycle-20 review): the speed slide had no lead sentence ("Among surveyed completers who first earned during or after training, most started within six months." repeated its heading and its tile). WP53 (owner decision 2026-10-16): that slide is gone;
  // its finding is ONE body line on the survey slide (slide 3), the 58.7% with its defined base, stated once and in no tile.
  test('slide 3 has the 58.7% once, with its full base, in one body line; its one tile is the income result; the evidence link stays; the old repeating sentence is gone', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(2);
    await expect(slide.locator('.hs__eyebrow')).toHaveText('Impact Survey 2026');
    await expect(slide.locator('.hs__lead')).toHaveCount(1);
    expect(await slide.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
    expect(compact(await slide.textContent())).not.toMatch(/most started within six months|Among surveyed completers who first earned/);
    const line = compact(await slide.locator('.hs__lead').textContent());
    expect(line).toContain('58.7%');
    // WP49 (cycle-24 review): "surveyed new earners", the register's term (the Outcomes page defines it; tests/wp49.spec.ts). WP54 (cycle-28 reviews, Claude S23 and GLM L1): the line leads with its base and needs no term (tests/wp54.spec.ts)
    expect(line).toContain('Of the 172 surveyed completers who first earned during or after training, 58.7% had started earning by six months after finishing the course');
    await expect(slide.locator('.hs__stat')).toHaveCount(1);
    expect(await slide.locator('.hs__stat').getAttribute('data-fact')).toBe('OC-03');
    expect(compact(await slide.locator('.hs__stat').textContent())).not.toContain('58.7%');
    const link = slide.locator('a', { hasText: 'Read the Impact Survey 2026' });
    await expect(link).toHaveCount(1);
    expect(sitePath((await link.getAttribute('href')) ?? '')).toBe('/impact/outcomes-2026/');
  });

  test('the carousel keeps one height at 1280 and 390: no slide is taller than the track, and the region is as tall on every slide', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const heights = await page.locator('[data-hs-slide]').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).scrollHeight)));
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      for (const h of heights) expect(h, `${vp.width}px`).toBeLessThanOrEqual(track + 1);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('Partner with Us hub: "What Does It Cost?" is three shorter sentences (item 5)', () => {
  const COST =
    'Pricing is set per program; we share an indicative budget in the discovery session. As agreed in the program scope, supported youth cohorts include outreach and selection, training, certification exam preparation (with exam fees and attempts), three months of mentoring, placement support and 12 months of outcome tracking after each course. Devices, stipends, connectivity and independent evaluation are budgeted separately where needed.';

  test('the hub answer is the three sentences, the FAQ JSON-LD says the same words, and the delivery inventory is gone', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const item = page.locator('#faqs details', { has: page.locator('summary', { hasText: 'What Does It Cost?' }) });
    const answer = compact(await item.locator('.faq__a').textContent());
    expect(answer).toBe(COST);
    expect(sentences(answer)).toHaveLength(3);
    expect(answer).not.toMatch(/blended training|AI-ready curriculum|monthly reports/);
    expect((await faqJsonLd(page)).find((q) => q.name === 'What Does It Cost?')?.text).toBe(COST);
    const tagged = await item.evaluate((el) => [el, ...Array.from(el.querySelectorAll('[data-fact]'))].map((e) => e.getAttribute('data-fact') ?? '').join(' '));
    expect(tagged, 'the answer is tied to PD-02').toContain('PD-02');
  });

  test('every claim in the answer rests on the register (PD-02, PD-02a): the same items, the 12 months after each course, the separately budgeted items', async () => {
    const pd02 = fact('PD-02').text;
    for (const phrase of ['Pricing is set per program', 'certification exam preparation (exam fees and attempts as agreed in the program scope)', 'three months of mentoring', 'placement support', 'outcome tracking for 12 months after each course', 'devices, stipends, connectivity and independent evaluation are budgeted separately where needed']) {
      expect(pd02.toLowerCase(), phrase).toContain(phrase.toLowerCase());
    }
    expect(fact('PD-02a').text).toContain('exam fee');
  });

  test('the route pages keep their one-line answer and do not print the hub’s full one', async ({ page }) => {
    for (const route of ['partner-with-us/governments/', 'partner-with-us/development-partners/', 'partner-with-us/foundations/', 'partner-with-us/universities/']) {
      await open(page, route);
      // WP49 (cycle-24 review): Governments' action is a ministry briefing, so its one-line answer says "in the briefing" (tests/wp49.spec.ts)
      const budget = route === 'partner-with-us/governments/' ? 'in the briefing' : 'in the discovery session';
      expect(await mainText(page), route).toContain(`Pricing is set per program; we share an indicative budget ${budget}.`);
      expect(await mainText(page), route).not.toMatch(/Supported youth cohorts include (outreach and selection, )?training/);
    }
  });
});

test.describe('JobReady@Campus: "Our Approach" is two sentences with the reporting scoped (item 6)', () => {
  const STATEMENT =
    'JobReady@Campus combines certification exam preparation, mentoring and placement support in campus labs alongside academic studies. Institutions receive monthly reports on progress toward paid work, as agreed in the program scope.';

  test('the statement is exactly these two sentences, tied to IN-09, PD-01 and PD-08, with the program as the subject and the scope clause on the reporting claim', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    expect(compact(await page.locator('#mechanism .pos__text').textContent())).toBe(STATEMENT);
    expect(sentences(STATEMENT)).toHaveLength(2);
    expect(await page.locator('#mechanism .pos').getAttribute('data-fact')).toBe('IN-09 PD-01 PD-08');
    expect(STATEMENT).toMatch(/monthly reports on progress toward paid work, as agreed in the program scope\.$/);
    const text = await mainText(page);
    expect(text).not.toMatch(/For universities and colleges who need their degree holders|We combine training, mentoring and placement support in existing labs and colleges/);
    // nothing but the eyebrow and the H2 comes before the statement in its band (scripts/check-facts.mjs holds this for every page; the first thing in the band here is the statement)
    const before = await page.locator('#mechanism').evaluate((band) => {
      const pos = band.querySelector('.pos')!;
      const out: string[] = [];
      for (const el of Array.from(band.querySelectorAll('header p, header h2, header .sh__lead'))) if (pos.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING) out.push(el.tagName.toLowerCase());
      return out;
    });
    for (const tag of before) expect(tag, 'only the eyebrow (p) and the heading (h2) come first').toMatch(/^(p|h2)$/);
  });

  test('the register backs each part: PD-08 (monthly reports) and PD-01 (mentoring, placement support), and IN-09 (parallel with academic studies, on-campus labs, certification preparation)', async () => {
    expect(fact('PD-08').text).toContain('monthly reports');
    expect(fact('PD-01').text).toMatch(/mentoring.*placement support/);
    expect(fact('IN-09').text).toMatch(/in parallel with academic studies/);
    expect(fact('IN-09').text).toMatch(/on-campus labs/);
    expect(fact('IN-09').text).toMatch(/preparation for industry-recognized certifications/);
  });

  // WP44 (cycle-21 review): Universities is declared whole (tests/wp44.spec.ts) and no longer carries the audience sentence and the shared closing
  test('the Universities page carries its declared whole statement, not the audience sentence and the shared closing', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    const statement = compact(await page.locator('#mechanism .pos__text').textContent());
    expect(statement.startsWith('For universities and colleges that need to prepare their degree holders for paid digital work')).toBe(false);
    expect(statement).toBe('JobReady@Campus combines training, mentoring and placement support in campus labs alongside academic studies. Your institution receives monthly reports on progress toward paid work, as agreed in the program scope.');
  });
});

test.describe('Development Partners and Foundations: headings that are not absolute claims (items 7 and 9)', () => {
  // WP47 (owner decision 2026-10-15): the cost-of-waiting band ("Build Work Entry into the Training Budget") is gone from Development Partners (Home carries it), so neither its heading nor the absolute claim it replaced is on the page (tests/wp47.spec.ts)
  test('Development Partners: no cost-of-waiting band, and nothing says "Training Without Placement Spends Budget Without Earnings"', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    await expect(page.locator('section#cost')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toContain('Training Without Placement Spends Budget Without Earnings');
    expect(text).not.toContain('Build Work Entry into the Training Budget');
  });

  test('Foundations: the problem band is headed "Fund Training That Reaches Paid Work" and keeps its three pains', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    await expect(page.locator('section#problem')).toHaveCount(1);
    await expect(page.locator('#problem h2')).toHaveText('Fund Training That Reaches Paid Work');
    expect('Fund Training That Reaches Paid Work').toBe(titleCase('Fund Training That Reaches Paid Work'));
    expect(await mainText(page)).not.toContain('Grants Buy Hours. You Want Earnings');
    await expect(page.locator('#problem .gp__pains li')).toHaveCount(3);
    // WP50 (cycle-25 review): the first pain is "Earnings Must Be Tracked, Not Only Training Hours" (it was "Grants Buy Training Hours, but Rarely Earnings"; tests/wp50.spec.ts)
    expect(await texts(page, '#problem .gp__q')).toEqual(['Earnings Must Be Tracked, Not Only Training Hours', 'Independent Evidence Is Hard to Find', 'Accountability Must Keep Pace with Scale']);
  });
});
