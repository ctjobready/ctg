import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP45 behaviors (cycle-21 whole-site review, Claude Sonnet 5.5 items 9-29): the Bangladesh initiative is an aim, not an existing national program (Programs menu and panel, Home slide 7, YouthWIDE); Home's trial slide leads with the
 * income result, its government slide states the contract scope in GV-12's note, its speed slide says "Most", its reach slide states the 15 in the heading (WP53: the speed and reach slides, and Home's programs slide, are gone), and its closing band has no grant-funding block; the partner hub has no
 * reporting band and two FAQs; the Programs card links Foundations; the Investors scale answer says "designed to run"; the Our Model menu names both marketplaces; the Recognition H1 is the HolonIQ listing; the Her Power post carries a
 * delivery note; the hub and Our Model state the same cost inclusions; the survey's +$82 tile says whose change it is; the Samina alt text; no bare "pp" or "MENA"; the SDG award has the register's name. Retrospective coverage (the owner
 * exempted this project from test-first work); run `npm run build` first, then `PORT=<port> npx playwright test tests/wp45.spec.ts --project=chromium`.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
const sitePath = (href: string) => href.replace(/^\/ctg(?=\/)/, '');
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);
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
    .replace(/\s+/g, ' ');
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));

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

test.describe('The Bangladesh initiative is an aim, not an existing national program (item 9)', () => {
  // The three regions are named on the YouthWIDE page, the Programs hub card and the funding-route table; the one-line menu description says "three regions" (it was kept short for Home's former programs slide, which is gone: WP53)
  const LINE = 'Co-funded country cohorts, designed for three regions, with a Bangladesh initiative that aims to train 2 million vulnerable youth by 2030.';

  test('the Programs menu and its featured panel say the cohorts are designed for three regions and that the Bangladesh initiative aims to train 2 million vulnerable youth by 2030 (IN-01 and IN-02; WP48: IN-01’s own "vulnerable youth"); WP53: Home’s carousel no longer repeats it on a programs slide', async ({ page }) => {
    await open(page, '');
    expect(fact('IN-01').stat?.value, 'the figure in the line is the register’s').toBe('2 million');
    expect(compact(await page.locator('#mega-programs a.mega__link[href$="programs/youthwide/"] .mega__desc').textContent())).toBe(LINE);
    expect(compact(await page.locator('#mega-programs .mega__feature-text').textContent())).toBe(LINE);
    await expect(page.locator('#results .hs__program')).toHaveCount(0);
    const factIds = await page.locator('#mega-programs a.mega__link[href$="programs/youthwide/"]').evaluate((el) => `${el.getAttribute('data-fact') ?? ''} ${el.querySelector('[data-fact]')?.getAttribute('data-fact') ?? ''}`);
    expect(factIds).toContain('IN-01');
    expect(factIds).toContain('IN-02');
  });

  // WP53 (owner follow-up, 2026-10-16): "Reference" was the jargon WP52 removed from the glance row and IN-02, so the band is headed "Bangladesh: Delivery Base and 2030 Aim" (tests/wp53.spec.ts)
  test('YouthWIDE: the Bangladesh band is headed "Bangladesh: Delivery Base and 2030 Aim" (Title Case), the glance row says "aims", the meta description says "a 2030 aim"', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const heading = page.locator('section#governments').getByRole('heading', { level: 2 });
    await expect(heading).toHaveText('Bangladesh: Delivery Base and 2030 Aim');
    expect('Bangladesh: Delivery Base and 2030 Aim').toBe(titleCase('Bangladesh: Delivery Base and 2030 Aim'));
    expect(compact(await page.locator('#program-glance .pg__row').first().textContent())).toContain('Bangladesh is where most delivery has been, with an initiative of its own that aims to train 2 million vulnerable youth by 2030.');
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('co-funded cohorts designed for three regions, with a 2030 aim in Bangladesh.');
    expect(description!.length).toBeLessThanOrEqual(155);
  });

  test('no built page calls the Bangladesh initiative "a national initiative"', async () => {
    const hits = builtPages().filter((p) => /national initiative/i.test(visible(p.html)) || /national initiative/i.test(p.html.match(/<meta[^>]+name="description"[^>]*>/i)?.[0] ?? ''));
    expect(hits.map((p) => p.route)).toEqual([]);
  });
});

test.describe('Home: the trial slide leads with income and keeps its scope (item 11)', () => {
  // WP48 (cycle-23 review): the heading itself named the predecessor program ("Women Offered a Place in a Predecessor Program Earned an Estimated 41% More")
  // WP50 (cycle-25 review): the heading is "Women Offered a Place Earned an Estimated 41% More" and the slide's eyebrow is "Randomized Trial of a Predecessor Program"; the >4× tile's caption says the multiple in words (tests/wp50.spec.ts)
  test('slide 1 is "Women Offered a Place Earned an Estimated 41% More": RC-01 and RC-04, the predecessor program named in the eyebrow and the lead, the >4× tile kept', async ({ page }) => {
    await open(page, '');
    const first = slide(page, 1);
    await expect(first.locator('h2')).toHaveText('Women Offered a Place Earned an Estimated 41% More');
    expect(await first.locator('h2').getAttribute('data-fact')).toBe('RC-01');
    expect(compact(await first.locator('.hs__lead').textContent())).toBe('In the predecessor WSDFM program, their monthly income was an estimated 41% higher than the control group’s, about +$27 a month.');
    expect(await first.locator('.hs__lead').getAttribute('data-fact')).toBe('RC-01 RC-04');
    expect(fact('RC-01').stat?.value).toBe('+41%');
    expect(fact('RC-04').stat?.value).toBe('+$27');
    await expect(first.locator('.hs__eyebrow')).toHaveText('Randomized Trial of a Predecessor Program');
    expect(compact(await first.locator('.hs__proof').textContent())).toContain('>4×');
    expect(compact(await first.locator('.hs__proof').textContent())).toContain('More than four times the average employment effect across nine vocational-training trials.');
  });

  test('the employment result is no longer retold in the slide’s heading or lead (the hero card, the bar and the >4× tile state it)', async ({ page }) => {
    await open(page, '');
    const first = slide(page, 1);
    expect(compact(await first.locator('h2').textContent())).not.toMatch(/Women in Work|10\.3|percentage points/);
    expect(compact(await first.locator('.hs__lead').textContent())).not.toMatch(/more likely to be employed|10\.3/);
  });

  test('"Results You Can Check" is one line, scoped, tied to PD-08', async ({ page }) => {
    await open(page, '');
    const card = page.locator('#features li.card', { has: page.locator('h3', { hasText: 'Results You Can Check' }) });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.card__text')).toHaveText('Monthly reports will show progress toward paid work, as agreed in the program scope.');
    expect(await card.getAttribute('data-fact')).toBe('PD-08');
    expect(await card.getAttribute('data-relieves')).toBe('P2');
  });
});

test.describe('Home: the government slide states the contract scope in GV-12’s note (item 10)', () => {
  test('slide 2 reads the note’s first clause (the Impact and Governments tiles print the whole note, with Her Power’s 25,125 women) and keeps the National University sentence', async ({ page }) => {
    await open(page, '');
    const lead = slide(page, 2).locator('.hs__lead');
    // WP46 (cycle-22 review): the note said who trained whom ("which trained 25,125 women; CodersTrust trained 2,500 women directly", GV-01 and GV-11) and the last sentence names its subject ("CodersTrust is the official training partner of ...")
    // WP48 (cycle-23 review): the slide keeps only the note's first clause ("contract scope, not a count of completers") and no longer mentions the 25,125 or the 2,500, so the lead rests on GV-12 alone (tests/wp48.spec.ts)
    expect(compact(await lead.textContent())).toBe(
      'Six government contracts with training and curriculum work scoped for 31,200+ people. This is contract scope, not a count of completers. CodersTrust is also the official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners.',
    );
    expect(await lead.getAttribute('data-fact')).toBe('GV-12');
    expect(compact(await lead.textContent())).not.toContain('not people trained');
    expect(fact('GV-12').stat?.glance?.note).toBe('The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; CodersTrust trained 2,500 women directly.');
  });
});

test.describe('Home: the speed and reach slides (items 16 and 28; WP53: they are gone)', () => {
  // WP46 (cycle-22 review, owner answer 2026-10-15): the six months are counted from the end of the course (tests/wp46.spec.ts)
  // WP48 (cycle-23 review, item 32): OC-05 is cumulative and includes the 23.5% who first earned DURING the course, so "within six months of the course ending" contradicted itself (tests/wp48.spec.ts)
  // WP53 (owner decision 2026-10-16): the speed slide ("Most Surveyed New Earners Were Earning by Six Months After the Course") is gone; its finding is the survey slide's one body line, tied to OC-05, with the base the register defines
  test('the survey slide (slide 3) carries the 58.8% in one body line tied to OC-05, with "170 surveyed new earners" (WP49: the register’s term; the Outcomes page defines it)', async ({ page }) => {
    await open(page, '');
    const s = slide(page, 3);
    await expect(s.locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    await expect(s.locator('.hs__lead')).toHaveCount(1);
    expect(await s.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
    expect(compact(await s.locator('.hs__lead').textContent())).toContain('58.8%');
    expect(compact(await s.locator('.hs__lead').textContent())).toContain('170 surveyed new earners');
    expect(compact(await page.locator('#results').textContent())).not.toContain('Most Surveyed New Earners Were Earning');
  });

  // WP53 (owner decision 2026-10-16): the reach slide ("Programs in 15 Countries and Territories", SC-03's detail line) is gone; SC-03's "15" stays the register's value and the hero's reach card (SC-16) says the 15 countries and territories
  test('the reach slide is gone: SC-03 is still "15" in the register, and no slide says "Programs in 15 Countries and Territories" or links "Explore Global Reach"', async ({ page }) => {
    expect(fact('SC-03').stat?.value).toBe('15');
    await open(page, '');
    const region = compact(await page.locator('#results').textContent());
    expect(region).not.toContain('Programs in 15 Countries and Territories');
    expect(region).not.toContain('Bangladesh plus 14 other countries and territories');
    await expect(page.locator('#results a', { hasText: 'Explore Global Reach' })).toHaveCount(0);
  });

  test('the carousel keeps four slides, one height, and no horizontal overflow at 1280 and 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      await expect(page.locator('[data-hs-slide]')).toHaveCount(4);
      const heights = await page.locator('[data-hs-slide]').evaluateAll((els) => els.map((e) => Math.round((e as HTMLElement).scrollHeight)));
      const track = await page.locator('[data-hs-track]').evaluate((e) => Math.round((e as HTMLElement).clientHeight));
      for (const h of heights) expect(h, `${vp.width}px`).toBeLessThanOrEqual(track + 1);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

// WP48 (cycle-23 review, consistent with the owner decision of 2026-10-15): YouthWIDE's cost band, headed "Training Without Work Entry Leaves Budgets Without Results" here, is gone (Home carries the shared band; tests/wp48.spec.ts)
test.describe('YouthWIDE: the cost heading (item 28; WP48: the band is gone)', () => {
  test('"Training Without Work Entry Leaves Budgets Without Results" is on no page; it stays in Title Case', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#cost')).toHaveCount(0);
    expect(builtPages().filter((p) => p.html.includes('Training Without Work Entry Leaves Budgets Without Results')).map((p) => p.route)).toEqual([]);
    expect('Training Without Work Entry Leaves Budgets Without Results').toBe(titleCase('Training Without Work Entry Leaves Budgets Without Results'));
  });
});

test.describe('Home: the closing band has no grant-funding block (item 26)', () => {
  test('the call to action is its heading, the button, the text links and the micro-commitment; "Planning a Grant-Funded Cohort?" is gone', async ({ page }) => {
    await open(page, '');
    const cta = page.locator('#cta');
    await expect(cta.getByRole('heading', { level: 2 })).toHaveText('Let’s Design Your First Cohort');
    await expect(cta.locator('h3')).toHaveCount(0);
    expect(compact(await cta.textContent())).not.toMatch(/Planning a Grant-Funded Cohort|Work backward from your intended training start date/);
    await expect(cta.locator('.btn')).toHaveCount(1);
    expect(compact(await cta.textContent())).toContain('A discovery session is a conversation, not a commitment.');
    expect(await page.content()).not.toContain('cta-band__plan');
  });
});

test.describe('Partner with Us hub: no reporting band, two FAQs, no dead link (item 12)', () => {
  test('the band "Monthly Reports and Quarterly Reviews" (#review-cycle) is gone; the due-diligence view states reporting and safeguarding once', async ({ page }) => {
    await open(page, 'partner-with-us/');
    await expect(page.locator('#review-cycle')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('Monthly Reports and Quarterly Reviews');
    expect(await mainText(page)).not.toContain('See What YouthWIDE Reports');
    expect(await texts(page, '#due-diligence .ddv__title')).toEqual(['Contracting Entities', 'Monthly Reports and Follow-Up Surveys', 'Safeguarding Agreed per Program', 'Independent Evaluation Welcome']);
  });

  test('the FAQ block is two questions (the country and the cost) with the new lead-in; the FAQ JSON-LD lists the same two', async ({ page }) => {
    await open(page, 'partner-with-us/');
    expect(await texts(page, '#faqs details > summary')).toEqual(['Will This Work in Our Country?', 'What Does It Cost?']);
    await expect(page.locator('#faqs .sh__lead')).toHaveText('Two questions every partner asks. Each route page answers the rest.');
    expect((await faqJsonLd(page)).map((q) => q.name)).toEqual(['Will This Work in Our Country?', 'What Does It Cost?']);
    const text = await mainText(page);
    expect(text).not.toContain('How Do You Prove Outcomes?');
    expect(text).not.toContain('What About Safeguarding and Data Protection?');
  });

  test('the "Monthly Reports and Follow-Up Surveys" card links to where Governance answers it, and no page links to the removed band', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const link = page.locator('#due-diligence .ddv__item', { hasText: 'Monthly Reports and Follow-Up Surveys' }).locator('a.ddv__link');
    await expect(link).toHaveText('How We Track Outcomes');
    expect(sitePath((await link.getAttribute('href')) ?? '')).toBe('/about/governance/#faq');
    await open(page, 'about/governance/');
    await expect(page.locator('#faq')).toHaveCount(1);
    const dead = builtPages().filter((p) => p.html.includes('#review-cycle'));
    expect(dead.map((p) => p.route)).toEqual([]);
  });

  // WP48 (cycle-23 review): Foundations' callout is gone (its "Progress You Can See Every Month" card says the same; tests/wp48.spec.ts); Development Partners keeps its callout
  for (const route of ['partner-with-us/development-partners/']) {
    test(`${route}: the "Reporting and Review" callout keeps its sentence and has no link to the removed band`, async ({ page }) => {
      await open(page, route);
      const callout = page.locator('.callout', { has: page.locator('.eyebrow', { hasText: 'Reporting and Review' }) });
      await expect(callout).toHaveCount(1);
      expect(compact(await callout.locator('.callout__body p').first().textContent())).toBe('For supported cohorts, monthly reports track progress; quarterly reviews guide corrective action and any expansion.');
      await expect(callout.locator('a')).toHaveCount(0);
      expect(compact(await callout.textContent())).not.toContain('See Reporting and Review');
      expect((await hrefs(page, 'main a')).some((h) => h.includes('#review-cycle'))).toBe(false);
    });
  }
});

test.describe('Programs: the YouthWIDE card links every audience it names (item 13)', () => {
  test('"Governments, Development Partners and Funders" has For Governments, For Development Partners and For Foundations links', async ({ page }) => {
    await open(page, 'programs/');
    const card = page.locator('#programs-grid li:has(a[href$="programs/youthwide/"])');
    expect(await texts(page, '#programs-grid li:has(a[href$="programs/youthwide/"]) .hub__partner a')).toEqual(['For Governments', 'For Development Partners', 'For Foundations']);
    expect((await hrefs(page, '#programs-grid li:has(a[href$="programs/youthwide/"]) .hub__partner a')).map(sitePath)).toEqual(['/partner-with-us/governments/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/']);
    expect(compact(await card.textContent())).toContain('designed as co-funded country cohorts for South Asia, the Middle East and North Africa, and Sub-Saharan Africa');
    expect(compact(await card.textContent())).toContain('aims to train 2 million vulnerable youth');
  });
});

test.describe('Investors: the scale answer says larger programs are designed to run 10 cohorts in parallel (item 14)', () => {
  test('the FAQ answer and its JSON-LD carry "are designed to run"', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: 'Can You Deliver at National Scale?' }) });
    const answer = compact(await item.locator('.faq__a').textContent());
    expect(answer).toContain('larger programs are designed to run up to 10 cohorts in parallel through certified local facilitators in existing labs and colleges.');
    expect(answer).not.toContain('larger programs run up to 10 cohorts');
    expect((await faqJsonLd(page)).find((q) => q.name === 'Can You Deliver at National Scale?')?.text).toContain('larger programs are designed to run up to 10 cohorts in parallel');
  });
});

test.describe('Our Model menu names both pre-launch marketplaces (item 15)', () => {
  const LINE = 'Partner portals and AI chat are live; the employer marketplace and the gig-work marketplace are in pre-launch.';

  test('the menu line and the featured panel say it as IN-04 does, never "employer and gig-work"', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#mega-model a.mega__link[href$="our-model/jobready-platform/"] .mega__desc').textContent())).toBe(LINE);
    expect(compact(await page.locator('#mega-model .mega__feature-text').textContent())).toBe(LINE);
    expect(fact('IN-04').text).toContain('In pre-launch: the employer marketplace and the gig-work marketplace.');
    expect(compact(await page.locator('header').first().textContent())).not.toMatch(/employer and gig-work/i);
  });
});

test.describe('Recognition: the H1 is the listing the register supports (item 17)', () => {
  test('"Twice Listed in the HolonIQ South Asia EdTech 100" (PA-08: listed in 2023 and 2024); the lead does not repeat it and the Industry Recognition band keeps the years', async ({ page }) => {
    await open(page, 'about/recognition/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Twice Listed in the HolonIQ South Asia EdTech 100');
    expect('Twice Listed in the HolonIQ South Asia EdTech 100').toBe(titleCase('Twice Listed in the HolonIQ South Asia EdTech 100'));
    expect(fact('PA-08').text).toMatch(/2023 .*and 2024/);
    expect(await mainText(page)).not.toContain('Recognized, Honored and Covered Worldwide');
    // the lead no longer repeats the listing the H1 states; the Industry Recognition band gives the years
    expect(compact(await page.locator('main .hero').textContent())).not.toContain('was listed in the HolonIQ');
    expect(compact(await page.locator('main .hero').textContent())).toContain('has received appointments and honors');
    expect(compact(await page.locator('#listing').textContent())).toContain('listed in the HolonIQ South Asia EdTech 100 in 2023 (STEAM category) and 2024');
  });
});

test.describe('News: the Her Power post carries a delivery note (item 20)', () => {
  const HER_POWER = 'news/25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative/';

  test('the archive banner ends with "Delivered: the national program trained 25,125 women.", tied to GV-01; the headline is unchanged', async ({ page }) => {
    await open(page, HER_POWER);
    const banner = page.locator('.archive-banner');
    const note = banner.locator('.archive-banner__note');
    // WP46 (cycle-22 review): the note closes with a text link to the Her Power case study (the sentence itself is unchanged)
    await expect(note).toHaveText('Delivered: the national program trained 25,125 women. See the Her Power case study.');
    await expect(note.locator('a')).toHaveText('See the Her Power case study.');
    expect(await note.locator('a').getAttribute('href')).toMatch(/\/impact\/case-studies\/her-power\/$/);
    expect(await note.getAttribute('data-fact')).toBe('GV-01');
    expect(fact('GV-01').text).toContain('a national program that trained 25,125 women');
    expect(compact(await banner.textContent())).toContain('Archived post, lightly edited.');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Her Power Contract Aims to Train 25,125 Women: Empowerment of Women Through ICT Frontier Initiative');
  });

  test('another archived post has the standard banner and no note', async ({ page }) => {
    await open(page, 'news/coderstrust-chairman-mr-aziz-ahmad-receives-sdg-life-achievement-award-from-the-unsgii/');
    await expect(page.locator('.archive-banner')).toHaveCount(1);
    await expect(page.locator('.archive-banner__note')).toHaveCount(0);
  });
});

// WP46 (cycle-22 review): Our Model no longer prints the hub's inclusion answer word for word; its "What Does It Cost?" is the one-line route answer with a link to the hub's FAQ (tests/wp46.spec.ts)
test.describe('The cost inclusions are one sentence in the hub (item 21); Our Model links to it (WP46)', () => {
  const SENTENCE = 'Supported youth cohorts include outreach and selection, training, certification exam preparation and the exam fee, three months of mentoring, placement support and 12 months of outcome tracking after each course.';
  const COST = `Pricing is set per program; we share an indicative budget in the discovery session. ${SENTENCE} Devices, stipends, connectivity and independent evaluation are budgeted separately where needed.`;

  for (const route of ['partner-with-us/']) {
    test(`${route}: "What Does It Cost?" is the three-sentence answer, tied to PD-02, and the FAQ JSON-LD says the same words`, async ({ page }) => {
      await open(page, route);
      const item = page.locator('details', { has: page.locator('summary', { hasText: 'What Does It Cost?' }) });
      await expect(item).toHaveCount(1);
      expect(compact(await item.locator('.faq__a').textContent())).toBe(COST);
      // (the hub’s FAQ block also writes its FAQPage JSON-LD; the Our Model page prints the answers without structured data)
      if (route === 'partner-with-us/') expect((await faqJsonLd(page)).find((q) => q.name === 'What Does It Cost?')?.text).toBe(COST);
      const tagged = await item.evaluate((el) => [el, ...Array.from(el.querySelectorAll('[data-fact]'))].map((e) => e.getAttribute('data-fact') ?? '').join(' '));
      expect(tagged).toContain('PD-02');
    });
  }

  test('our-model/: "What Does It Cost?" is the one-line route answer and a link to the hub FAQ, tied to PD-02; the inclusion sentence is not printed a second time', async ({ page }) => {
    await open(page, 'our-model/');
    const item = page.locator('details', { has: page.locator('summary', { hasText: 'What Does It Cost?' }) });
    await expect(item).toHaveCount(1);
    expect(compact(await item.locator('.faq__a').textContent())).toBe('Pricing is set per program; we share an indicative budget in the discovery session. See what a supported cohort includes.');
    expect(await item.locator('.faq__a a').getAttribute('href')).toMatch(/\/partner-with-us\/#faqs$/);
    expect(compact(await page.locator('main').textContent())).not.toContain(SENTENCE);
    const tagged = await item.evaluate((el) => [el, ...Array.from(el.querySelectorAll('[data-fact]'))].map((e) => e.getAttribute('data-fact') ?? '').join(' '));
    expect(tagged).toContain('PD-02');
  });

  test('every inclusion in the sentence is one of PD-02’s standard inclusions', async () => {
    const pd02 = fact('PD-02').text.toLowerCase();
    for (const phrase of ['outreach and selection', 'certification exam preparation (exam fee included)', 'three months of mentoring', 'placement support', 'outcome tracking for 12 months after each course']) expect(pd02, phrase).toContain(phrase);
  });
});

test.describe('Outcomes 2026: the +$82 tile cannot be read as the $82 before training (item 22)', () => {
  test('the tile says whose change it is; the $245 tile keeps "up from $82 before training"', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    const tile = page.locator('#income [data-fact="OC-03c"] .stat');
    await expect(tile.locator('.stat__value')).toHaveText('+$82');
    await expect(tile.locator('.stat__label')).toHaveText('median change in each surveyed completer’s own monthly income');
    expect(compact(await page.locator('#summary [data-fact="OC-03"] .stat').textContent())).toContain('up from $82');
  });
});

test.describe('Stories: the Samina portrait’s alt text (item 24)', () => {
  test('"Portrait of Samina Tasneem Chowdhury", like the other portraits; no mention of a Fiverr profile', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    expect(await page.locator('img[alt="Portrait of Samina Tasneem Chowdhury"]').count()).toBeGreaterThan(0);
    expect(await page.content()).not.toContain('from her Fiverr profile');
  });
});

test.describe('No bare "pp" and no "MENA" (item 25)', () => {
  test('no built page shows "pp" as a unit or the abbreviation MENA (text, attributes and structured data)', async () => {
    const bare = builtPages().filter((p) => /\bpp\b/.test(visible(p.html)) || /\b[0-9] pp\b/.test(p.html));
    expect(bare.map((p) => p.route)).toEqual([]);
    const mena = builtPages().filter((p) => /\bMENA\b/.test(p.html));
    expect(mena.map((p) => p.route)).toEqual([]);
  });

  test('the trial tile reads "+10.3" with "percentage points" under it: Impact, Governments, Foundations, the partner hub and YouthWIDE', async ({ page }) => {
    const cases: [string, string][] = [
      ['impact/', '#glance a[data-fact~="RC-02"] .glance__value'],
      ['partner-with-us/governments/', '#glance a[data-fact~="RC-02"] .pg__value'],
      ['partner-with-us/foundations/', '#glance a[data-fact~="RC-02"] .pg__value'],
      ['partner-with-us/', '#why-partner li[data-fact="RC-02"] .wp__value'],
      ['programs/youthwide/', '#proof-band .stat__value'],
    ];
    for (const [route, selector] of cases) {
      await open(page, route);
      const value = page.locator(selector).first();
      expect(compact(await value.textContent()), route).toBe('+10.3 percentage points');
      await expect(value.locator('.fig-unit'), route).toHaveText('percentage points');
      expect(await value.locator('.fig-unit').evaluate((el) => getComputedStyle(el).display), route).toBe('block');
    }
  });

  test('the tile’s label does not say the unit twice', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const tile = page.locator('#proof-band .stat', { has: page.locator('.fig-unit') }).first();
    expect(compact(await tile.locator('.stat__label').textContent())).toBe('more employment for women offered a place (randomized trial of a predecessor program)');
  });

  test('the unit line fits at 390 px: no horizontal overflow on the pages that show the tile', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    for (const route of ['impact/', 'partner-with-us/', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'programs/youthwide/', 'our-model/talentleap/']) {
      await open(page, route);
      expect(await noOverflow(page), route).toBe(true);
    }
  });
});

test.describe('The SDG award has the register’s name everywhere (item 27)', () => {
  test('PA-11 says "SDG Life Achievement Award"; the Recognition page and the news post say it too; no page says "Lifetime Achievement"', async ({ page }) => {
    expect(fact('PA-11').text).toContain('SDG Life Achievement Award (2025)');
    await open(page, 'about/recognition/');
    expect(await mainText(page)).toContain('SDG Life Achievement Award');
    await open(page, 'news/coderstrust-chairman-mr-aziz-ahmad-receives-sdg-life-achievement-award-from-the-unsgii/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CodersTrust Chairman Mr. Aziz Ahmad Receives SDG Life Achievement Award from the UNGSII Foundation');
    expect(await mainText(page)).toContain('the SDG Life Achievement Award from the UNGSII Foundation');
    const lifetime = builtPages().filter((p) => /Lifetime Achievement/i.test(p.html));
    expect(lifetime.map((p) => p.route)).toEqual([]);
  });
});
