import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { CONTRACT_TOTAL_NOTE } from '../src/data/copy';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP87 behaviors (CLR review, Opus High run 1 and Opus XHigh run 1, plus the owner decisions of 2026-10-24, items 18 to 21). Retrospective coverage: the owner exempted this project from test-first work, so
 * these tests were written after the change. Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp87.spec.ts --project=chromium`:
 *   - 1: Her Power is dated "from 2023" on the Impact cards, the Case Studies index and the case-study eyebrow (the contract signing the site already dates to April 2023); WSDFM stays undated (no program year in the register);
 *   - 2: the Her Power laptop photo's alt text and caption agree (a participant receives the laptop);
 *   - 3: the BPI news post closes with the government band; 4: the Career Carnival teaser calls Banani "its Dhaka office"; 5: the India post does not say Gurugram; 6: Ferdinand is "a former Danish Army captain" on both pages;
 *   - 7: the America Week post gives Shamsul Haque the team page's rank; 8: the HolonIQ 2024 quotation is closed; 9: the three government posts' headings are Title Case;
 *   - 10: no page links prweb.com; 11: the NU Post Graduate Diploma page keeps the partnership's scope; 12: the two unattributed award photographs' captions are unchanged (no source names the recipient);
 *   - 13: the News Photographs captions for the UPEACE program and the NCTB MOU; 14: In the Field's heading outline; 15: the Kosovo portrait alt; 16: Recognition's early-coverage cards link their articles and the World Bank line has its own section;
 *   - 17: the polish items; 18 to 21: the enrollment total stays "150,000+", the composition is 112,926 direct and 40,152 courseware (25,125 + 15,027; 112,926 + 40,152 - 2,400 = 150,678), and no page prints the old figures or a "~" or "nearly" total.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
/** The visible text of a built page (no scripts or styles), entities decoded. */
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const pageHtml = (route: string): string => {
  const want = route === '' ? '/' : `/${route}`;
  const p = listPages().find((x) => x.route === want);
  if (!p) throw new Error(`no built page for ${want}`);
  return readFileSync(p.file, 'utf8');
};
const metaDescription = (html: string): string => /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';

const news = (slug: string) => `news/${slug}/`;
const BPI = 'mou-signed-between-bangladesh-petroleum-institute-bpi-and-coderstrust';
const PROUD = 'a-proud-milestone-for-coderstrust';
const AMERICA = 'celebrating-america-week-with-the-u-s-embassy-dhaka';
const HOLONIQ24 = 'coderstrust-recognized-among-holoniqs-2024-south-asia-edtech-100';
const INDIA = 'coderstrust-sets-up-in-india';
const CARNIVAL = 'coderstrust-organizes-career-carnival-for-students-and-affiliates';
const GOV_POSTS = ['1000-trainees-enhancing-digital-government-economy-edge', '1000-trainees-sheikh-kamal-ict-incubator-training', '25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative'];

// WP96 (owner decision 2026-10-26): Her Power is dated "2023–2025" (WP87 had "from 2023"); WSDFM stays undated.
test.describe('Item 1: Her Power is dated "2023–2025" like the other program records; WSDFM stays undated', () => {
  test('the Impact cards, the Case Studies index and the Her Power case-study eyebrow say "2023–2025"', async ({ page }) => {
    await open(page, 'impact/');
    const eyebrows = (await page.locator('#cases .card .eyebrow').allTextContents()).map(compact);
    expect(eyebrows).toContain('ICT Division / DoICT, Government of Bangladesh; Bangladesh, 2023–2025');
    expect(eyebrows).toContain('Commissioned by Porticus; Bangladesh');
    await open(page, 'impact/case-studies/');
    const places = (await page.locator('.case__fields dd').allTextContents()).map(compact);
    expect(places).toContain('ICT Division / DoICT, Government of Bangladesh; Bangladesh, 2023–2025');
    expect(places).toContain('Commissioned by Porticus; Bangladesh');
    await open(page, 'impact/case-studies/her-power/');
    expect(compact(await page.locator('.hero__eyebrow').textContent())).toBe('Case Study · ICT Division / Department of ICT (DoICT), Government of Bangladesh, 2023–2025');
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    expect(compact(await page.locator('.hero__eyebrow').textContent())).toBe('Case Study · Commissioned by Porticus');
  });

  test('the Her Power news post is still dated April 13, 2023 (the contract signing), and the span starts there', () => {
    expect(visible(pageHtml(news(GOV_POSTS[2])))).toContain('April 13, 2023');
  });
});

test.describe('Item 2: the Her Power laptop photo reads the same in its alt text and its caption', () => {
  const ALT = 'A participant in a yellow coat receiving a laptop box from a man in a pink shirt and face mask at a Her Power laptop distribution ceremony';
  test('Home, the Her Power case study and In the Field carry the new alt; the old alt is on no page', () => {
    for (const route of ['', 'impact/case-studies/her-power/', 'impact/in-the-field/']) expect(pageHtml(route), route || 'home').toContain(`alt="${ALT}"`);
    expect(builtPages().filter((p) => p.html.includes('accepting a laptop box from a participant')).map((p) => p.route)).toEqual([]);
  });

  test('the two gallery pages caption it "A participant receives a laptop, Her Power distribution ceremony"', () => {
    for (const route of ['impact/case-studies/her-power/', 'impact/in-the-field/']) expect(visible(pageHtml(route)), route).toContain('A participant receives a laptop, Her Power distribution ceremony');
  });
});

test.describe('Items 3 to 7: news archive consistency', () => {
  test('3: the BPI post closes with the government band, not the universities offer', () => {
    const text = visible(pageHtml(news(BPI)));
    expect(text).toContain('Planning a Government Program?');
    expect(text).toContain('Request a Briefing for Your Ministry');
    expect(text).toContain('Explore Government Partnerships');
    expect(text).not.toContain('Preparing Students for Work?');
    expect(text).not.toContain('Bring JobReady@Campus to Your Institution');
  });

  test('4: no teaser calls Banani the "head office"; the Career Carnival teaser says "Dhaka office in Banani"', () => {
    const teaser = 'CodersTrust holds a Career Carnival at its Dhaka office in Banani to create job placement opportunities for students and alumni.';
    expect(metaDescription(pageHtml(news(CARNIVAL)))).toBe(teaser);
    const withOld = builtPages().filter((p) => p.html.includes('Banani, Dhaka head office')).map((p) => p.route);
    expect(withOld).toEqual([]);
    const withNew = builtPages().filter((p) => visible(p.html).includes(teaser)).map((p) => p.route);
    expect(withNew.length, 'the news index and the "More News" teasers print it').toBeGreaterThanOrEqual(5);
  });

  test('5: the India post no longer says there was an office in Gurugram; it says Pune, as its Economic Times source does', () => {
    const html = pageHtml(news(INDIA));
    expect(html).not.toContain('Gurugram');
    expect(visible(html)).toContain('CodersTrust began operating in India in 2015 and in 2016 was moving to Pune to make it its hub for the region.');
    expect(metaDescription(html)).toBe('CodersTrust began operating in India in 2015 and in 2016 was moving to make Pune its hub; The Economic Times and The Times of India covered it that year.');
    expect(metaDescription(html).length).toBeLessThanOrEqual(155);
    expect(builtPages().filter((p) => p.html.includes('Gurugram')).map((p) => p.route)).toEqual([]);
  });

  test('6: Aziz Ahmad’s bio and Ferdinand’s page both say "a former Danish Army captain"', () => {
    expect(visible(pageHtml('about/team/aziz-ahmad/'))).toContain('a former Danish Army captain, he launched CodersTrust');
    expect(visible(pageHtml('about/team/ferdinand-kjaerulff/'))).toContain('a former Danish Army captain');
    expect(builtPages().filter((p) => p.html.includes('Danish military captain')).map((p) => p.route)).toEqual([]);
  });

  test('7: the America Week post gives Shamsul Haque the team page’s rank', () => {
    expect(visible(pageHtml('about/team/shamsul-haque/'))).toContain('former Additional Foreign Secretary of Bangladesh');
    const text = visible(pageHtml(news(AMERICA)));
    expect(text).toContain('CEO Md. Shamsul Haque, former Additional Foreign Secretary of Bangladesh, and his team');
    expect(text).not.toContain('Additional Secretary of the Ministry of Foreign Affairs');
  });
});

test.describe('Items 8 and 9: the HolonIQ 2024 quotation, and Title Case headings on three government posts', () => {
  test('8: every opening curly quote in the HolonIQ 2024 post has its closing quote', () => {
    const body = visible(pageHtml(news(HOLONIQ24)));
    const opens = (body.match(/“/g) ?? []).length;
    const closes = (body.match(/”/g) ?? []).length;
    expect(opens).toBeGreaterThanOrEqual(3);
    expect(closes).toBe(opens);
    expect(body).toContain('We are proud to see CodersTrust recognized on an international stage.”');
  });

  test('9: the OBJECTIVE and SCOPE headings are "Objective" and "Scope"; no news heading is all caps', () => {
    for (const slug of GOV_POSTS) {
      const html = pageHtml(news(slug));
      expect(html, slug).toMatch(/<h2[^>]*>Objective<\/h2>/);
      expect(html, slug).toMatch(/<h2[^>]*>Scope<\/h2>/);
      expect(html, slug).not.toMatch(/<h2[^>]*>(OBJECTIVE|SCOPE)<\/h2>/);
    }
    const shouting = builtPages().filter((p) => p.route.startsWith('/news/') && /<h2[^>]*>[A-Z]{4,}( [A-Z]{4,})*<\/h2>/.test(p.html)).map((p) => p.route);
    expect(shouting).toEqual([]);
  });
});

test.describe('Item 10 (Major): no page links the PRWeb release, whose boilerplate says "1.5 million learners"', () => {
  test('no built page links prweb.com or names the PRWeb / Cision release', () => {
    const linking = builtPages().filter((p) => /href="[^"]*prweb\.com/i.test(p.html)).map((p) => p.route);
    expect(linking).toEqual([]);
    const naming = builtPages().filter((p) => /Read the press release on PRWeb|CISION PRWEB|For details visit: https?:\/\/(www\.)?prweb/i.test(visible(p.html))).map((p) => p.route);
    expect(naming).toEqual([]);
  });

  test('A Proud Milestone and America Week keep their own reports of the event (1,400+ registered users and 15,000+ QR scans)', () => {
    expect(visible(pageHtml(news(PROUD)))).toContain('1,400+ registered users and 15,000+ QR code scans');
    expect(visible(pageHtml(news(AMERICA)))).toContain('1,400+ registered users and 15,000+ QR scans');
  });
});

test.describe('Item 11: the NU Post Graduate Diploma page keeps the partnership’s scope', () => {
  test('the Context band reads "National University’s official training partner for digital career skills and credentials since 2023"', () => {
    const sentence = 'CodersTrust has been National University’s official training partner for digital career skills and credentials since 2023.';
    // WP102 (owner answer 2026-10-28): the NU overview describes CodersTrust as an affiliated college, not the official training partner
    // WP105 (Polish 6): the Context band no longer opens with that sentence; the page says it in the Recognition row (a <Fact>, whose full stop is its own element), so the check is the sentence without its stop.
    expect(visible(pageHtml('programs/nu-postgraduate-diploma/'))).toContain('CodersTrust is an affiliated college (College Code: 6634) under the National University of Bangladesh');
    expect(visible(pageHtml('programs/nu-postgraduate-diploma/'))).not.toContain(sentence);
    expect(visible(pageHtml('partner-with-us/governments/'))).toContain(sentence);
    expect(builtPages().filter((p) => visible(p.html).includes('the official training partner of National University since 2023')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Items 12 and 13: photograph captions', () => {
  test('12: the 2019 supply-chain award and the Nasdaq photographs are no longer on Recognition or In the Field (WP96: they moved to Aziz Ahmad’s profile, with his name)', () => {
    for (const route of ['about/recognition/', 'impact/in-the-field/']) {
      const text = visible(pageHtml(route));
      expect(text, route).not.toContain('Supply Chain Diversity and Sustainability Excellence Awards, 2019');
      expect(text, route).not.toContain('Nasdaq closing bell ceremony with the US Small Business Administration');
    }
  });

  test('13: News Photographs says June 2026 for the UPEACE program and November 2023 for the NCTB MOU', () => {
    const text = visible(pageHtml('impact/in-the-field/news-photos/'));
    expect(text).toContain('UPEACE Young Leaders for Peace program, Costa Rica, June 2026');
    expect(text).toContain('MOU signing with NCTB, November 2023');
    expect(text).not.toContain('UPEACE Young Leaders for Peace program, Costa Rica, April 2026');
    expect(text).not.toContain('MOU signing with NCTB, December 2023');
  });
});

test.describe('Item 14: In the Field heading outline', () => {
  test('"Partners, Forums and Recognition" is followed by the two collections as H3s, and no heading level is skipped', async ({ page }) => {
    await open(page, 'impact/in-the-field/');
    const headings = await page.locator('main h1, main h2, main h3').evaluateAll((els) => els.map((e) => ({ level: Number(e.tagName[1]), text: (e.textContent ?? '').replace(/\s+/g, ' ').trim() })));
    const at = headings.findIndex((h) => h.text === 'Partners, Forums and Recognition');
    expect(at).toBeGreaterThan(0);
    expect(headings[at].level).toBe(2);
    expect(headings.slice(at + 1, at + 3)).toEqual([
      { level: 3, text: 'Partnerships and MOU Signings' },
      { level: 3, text: 'Recognition and Advocacy' },
    ]);
    for (let i = 1; i < headings.length; i++) expect(headings[i].level, `${headings[i - 1].text} → ${headings[i].text}`).toBeLessThanOrEqual(headings[i - 1].level + 1);
  });
});

test.describe('Item 15: the Kosovo portrait alt says "program completer"', () => {
  test('the Kosovo case study’s learner portrait', async ({ page }) => {
    await open(page, 'impact/case-studies/kosovo-women-in-online-work/');
    const alts = await page.locator('main img').evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt') ?? ''));
    expect(alts).toContain('Portrait of Erlisa Zherka, a program completer of the Women in Online Work pilot in Kosovo');
    expect(builtPages().filter((p) => p.html.includes('a graduate of the Women in Online Work pilot')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Item 16: Recognition’s early-coverage cards link their articles; the World Bank line has its own section', () => {
  test('all eight card headlines are links, the repeated paragraph is gone, and the 2021 Albania release is outside the 2014–2016 band', async ({ page }) => {
    await open(page, 'about/recognition/');
    const links = page.locator('#coverage .rec-press__headline a');
    await expect(links).toHaveCount(8);
    const hrefs = await links.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
    expect(hrefs.every((h) => h.startsWith('https://'))).toBe(true);
    expect(new Set(hrefs).size).toBe(8);
    expect(await links.evaluateAll((as) => as.every((a) => /noopener/.test(a.getAttribute('rel') ?? '') && !!a.querySelector('.sr-only')))).toBe(true);
    expect(compact(await page.locator('#coverage').textContent())).not.toMatch(/Early press coverage|Albania|2021/);
    await expect(page.locator('p.cov')).toHaveCount(1);
    await expect(page.locator('#world-bank p.cov a')).toHaveCount(3);
    const lineText = await page.locator('#world-bank p.cov').evaluate((el) => {
      const c = el.cloneNode(true) as HTMLElement;
      c.querySelectorAll('.sr-only').forEach((n) => n.remove());
      return (c.textContent ?? '').replace(/\s+/g, ' ').trim();
    });
    expect(lineText).toBe('World Bank coverage: Kosovo (2016, 2017) and Albania (2021).');
    expect(await page.locator('nav a[href="#world-bank"]').count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Item 17: polish', () => {
  test('the seven news meta descriptions carry curly apostrophes and quotes, and "12 April 2024" is "April 12, 2024"', () => {
    const slugs = [
      PROUD,
      AMERICA,
      'coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation',
      'coderstrust-chairman-aziz-ahmad-meets-bangladesh-foreign-affairs-minister-khalilur-rahman',
      'coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia',
      HOLONIQ24,
      'why-we-call-it-a-digital-factory',
    ];
    for (const slug of slugs) {
      const d = metaDescription(pageHtml(news(slug)));
      expect(d, slug).not.toMatch(/['"]/);
      expect(d, slug).toMatch(/[’‘“”]/);
    }
    expect(metaDescription(pageHtml(news(slugs[2])))).toContain('“Be Useful.”');
    const withOldDate = builtPages().filter((p) => visible(p.html).includes('City College of New York, 12 April 2024')).map((p) => p.route);
    expect(withOldDate).toEqual([]);
    expect(visible(pageHtml('impact/in-the-field/'))).toContain('MOU signing with the City College of New York, April 12, 2024 (date on the ceremony banner)');
  });

  test('Mentors: "On This Page" says "Meet Some of Our Mentors", as the heading does', async ({ page }) => {
    await open(page, 'about/mentors/');
    expect(compact(await page.locator('nav a[href="#mentors"]').first().textContent())).toBe('Meet Some of Our Mentors');
    await expect(page.locator('#mentors-h')).toHaveText('Meet Some of Our Mentors');
  });

  test('"Co-Founder and Chairman." and the Ferdinand portrait alt', () => {
    expect(visible(pageHtml('about/recognition/'))).toContain('Co-Founder and Chairman.');
    expect(visible(pageHtml('about/recognition/'))).not.toContain('Co-founder and Chairman.');
    for (const route of ['about/', 'about/team/', 'about/team/ferdinand-kjaerulff/', 'about/team/abdul-karim/', 'about/team/faruque-hossain/']) {
      const html = pageHtml(route);
      expect(html, route).toContain('alt="Portrait of Ferdinand Kjærulff, Co-Founder"');
      expect(html, route).not.toContain('Photo of Ferdinand Kjærulff');
    }
  });

  test('Rezaul Karim Khan’s bio has a verb', () => {
    expect(visible(pageHtml('about/team/rezaul-karim-khan/'))).toContain('He is a technologist and business innovator with 20+ years in global ICT projects and startups.');
  });

  test('Governments: the Her Power row has no nested parentheses', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const first = compact(await page.locator('#contracts tbody tr').first().textContent());
    expect(first).toContain('Her Power: Department of ICT (DoICT), ICT Division');
    expect(first).not.toContain('Her Power (Department');
  });

  test('WSDFM case study: the note names the trial as "the randomized trial by the BRAC Institute of Governance and Development (BIGD)" and says "the 1,000 women enrolled", so it reads on its own above the tiles', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    const note = page.locator('.hero [data-hero-note]');
    await expect(note).toHaveText('Program records, not trial results; the 425 women offered a place in the randomized trial by the BRAC Institute of Governance and Development (BIGD) were among the 1,000 women enrolled.');
    // the evaluator is spelled out (the note) before the tiles say "BIGD" (WP54 G8), and no "these 1,000" is left without an antecedent
    const text = compact(await page.locator('.hero').textContent());
    expect(text.indexOf('BRAC Institute of Governance and Development (BIGD)')).toBeGreaterThanOrEqual(0);
    expect(text.indexOf('BRAC Institute of Governance and Development (BIGD)')).toBeLessThan(text.indexOf('BIGD randomized trial'));
    expect(text).not.toContain('among these 1,000');
    expect(text).toContain('711 of 1,000');
    expect(visible(pageHtml('impact/case-studies/wsdfm-women-freelancers/'))).not.toContain('(BIGD)’s');
  });

  test('Foundations: outcome tracking carries "as agreed in the program scope"', () => {
    expect(visible(pageHtml('partner-with-us/foundations/'))).toContain('outcomes are tracked for 12 months after each course, as agreed in the program scope.');
  });
});

test.describe('Items 18 to 21 (owner decisions 2026-10-24): the enrollment total stays "150,000+"; the composition is 112,926 direct and 40,152 courseware', () => {
  const SPLIT = 'Of 150,000+ enrollments, 112,926 were direct. Another 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125. Counted once, the total is 150,678 enrollments.';

  test('no built page prints the old composition (111,268 / 40,043 / 14,918), a "~150,000" total or a "nearly 150,000" total', () => {
    const offenders: string[] = [];
    for (const p of builtPages()) {
      const t = visible(p.html);
      for (const old of ['111,268', '40,043', '14,918', '23,014', '~150,000', 'nearly 150,000', 'Nearly 150,000']) {
        if (t.includes(old) || p.html.includes(old)) offenders.push(`${p.route}: ${old}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('Investors prints the split exactly, tied to SC-02, SC-03, GV-01 and SC-14', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const notes = page.locator('#guide .ig__notes');
    await expect(notes).toHaveText(`${SPLIT} Most delivery has been in Bangladesh.`);
    expect(await notes.getAttribute('data-fact')).toBe('SC-02 SC-03 GV-01 SC-14');
    expect(compact(await page.locator('#guide .ig__tiles').textContent())).toContain('150,000+');
    expect(await page.locator('#guide .ig__tile .stat__value').allTextContents().then((v) => v.map(compact))).toEqual(['130,000+', '150,000+', '16']);
  });

  test('the register: SC-02 and SC-16 keep "150,000+", the composition adds up, and the 2,400 are counted once', () => {
    const sc02 = fact('SC-02');
    expect(sc02.stat?.value).toBe('150,000+');
    expect(sc02.stat?.detail).toBe(SPLIT);
    // WP90 shortened only the detail; the register text keeps the full wording
    expect(sc02.text).toBe(`150,000+ enrollments since 2014 — 112,926 through direct training across 45 programs and 40,152 reached through CodersTrust curriculum and courseware (the 25,125 women Her Power trained nationally with CodersTrust’s curriculum, including the 2,400 CodersTrust also trained directly, and UNDP FutureNation’s 15,027 course learners)`);
    expect(fact('SC-01').stat?.value, 'the unique-learner count is a separate figure').toBe('130,000+');
    expect(fact('SC-16').text).toBe('130,000+ learners trained through 150,000+ enrollments since 2014. CodersTrust has worked in 16 countries and territories');
    expect(fact('SC-16').stat?.glance?.note).toBe('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
    expect(fact('SC-14').stat?.numeric).toBe(15027);
    expect(fact('SC-15').stat?.numeric).toBe(23821);
    const herPower = Number((fact('GV-01').stat?.value ?? '').replace(/\D/g, ''));
    expect(herPower).toBe(25125);
    expect(herPower + 15027).toBe(40152);
    expect(112926 + 40152 - 2400).toBe(150678);
    expect(112926 + 40152 - 2400).toBeGreaterThanOrEqual(150000);
  });

  test('the basis is a public citation of SC-02, SC-14 and SC-15: program records and the course pages, October 2026', async () => {
    const { sources } = await import('../src/data/facts');
    expect(sources.COURSEPAGES26.citation).toBe('Program records, October 2026; course enrollment counts from the Grameenphone Academy and FutureNation course pages.');
    for (const id of ['SC-02', 'SC-14', 'SC-15']) expect(fact(id).sourceIds, id).toContain('COURSEPAGES26');
  });

  test('the overlap sentence under the 30,000+ keeps "150,000+" and is on Investors and Impact only', () => {
    const OVERLAP = 'Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.';
    expect(CONTRACT_TOTAL_NOTE.text.endsWith(OVERLAP)).toBe(true);
    // WP94 (triage A4): Investors points back to its reconciliation paragraph; Impact keeps the full overlap sentence.
    expect(visible(pageHtml('impact/')), 'impact/').toContain(OVERLAP);
    expect(visible(pageHtml('partner-with-us/investors/')), 'investors/').toContain('Her Power’s 25,125 are already counted in the 150,000+ enrollments above, not additional people.');
  });

  test('"150,000+" is printed on Home, About, Impact, Partner with Us and Investors', () => {
    for (const route of ['', 'about/', 'impact/', 'partner-with-us/', 'partner-with-us/investors/']) expect(visible(pageHtml(route)), route || 'home').toContain('150,000+');
  });

  test('About’s tile is "150,000+" over "enrollments"', async ({ page }) => {
    await open(page, 'about/');
    const tile = page.locator('#glance .about-stats__tile[data-fact="SC-02"]');
    await expect(tile.locator('.stat__value')).toHaveText('150,000+');
    expect(compact(await tile.locator('.stat__label').textContent())).toBe('enrollments');
  });
});

test.describe('The changed pages fit at 1280 and 390 px', () => {
  const ROUTES = ['about/recognition/', 'impact/in-the-field/', 'impact/case-studies/wsdfm-women-freelancers/', 'impact/case-studies/her-power/', 'partner-with-us/investors/', 'about/'];
  for (const vp of [DESKTOP, MOBILE]) {
    test(`no sideways scroll at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ROUTES) {
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${route} at ${vp.width}px`).toBe(true);
      }
    });
  }
});
