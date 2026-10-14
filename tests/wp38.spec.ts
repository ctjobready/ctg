import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP38 behaviors (cycle-15 whole-site reviews, GPT-6.1 Sol and GLM 5.3): Home's "What Your Partnership Includes" is three short cards, Universities' evidence band is a two-line strip, the Home Guide band drops the two
 * tiles the carousel states, the Home cost-of-waiting card states one finding, the audience pages' Guide band has a one-line origin, the three funder pains that had no line have one, one title pattern, the carousel's
 * reach slide has its figure again, and the smaller wording fixes (Contact, About, Investors, press headlines, SuperKids, the program pages' route strip). Retrospective coverage (the owner exempted this project from
 * test-first work); each test states one observable behavior of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp38.spec.ts --project=chromium`).
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const hrefs = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
/** The ids of the page's bands, in order, with whether each is a dark one. */
const bands = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('main .band[id]')).map((b) => ({ id: b.id, dark: /band--(klein|deep-ink)/.test(b.className) })));

test.describe('Home: "What Your Partnership Includes" is three short cards, not a concern / inclusion / benefit matrix', () => {
  const CARDS = [
    {
      title: 'Training, Mentoring and Placement Support',
      text: '100 training hours per certification, followed by three months of milestone-based mentoring and placement support. Each track’s work-entry plan is approved before enrollment.',
      pain: 'P1',
      facts: ['PD-01', 'PD-15', 'PD-19'],
    },
    {
      title: 'Results You Can Check',
      text: 'Monthly reports and follow-up surveys, as agreed in the program scope, show progress toward paid work. Documentary evidence is checked where available.',
      pain: 'P2',
      facts: ['PD-08', 'PD-09'],
    },
    {
      title: 'Tracks Chosen from Employer Demand',
      text: 'An AI-ready curriculum is designed to follow the skills employers ask for as entry-level tasks change.',
      pain: 'P3',
      facts: ['PD-02', 'PD-10'],
    },
  ];

  test('three cards, each a heading and its sentences, in the order of the three ranked pains and tied to their register facts', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#features h2')).toHaveText('What Your Partnership Includes');
    const cards = page.locator('#features li.card');
    await expect(cards).toHaveCount(3);
    for (const [i, c] of CARDS.entries()) {
      const card = cards.nth(i);
      await expect(card.locator('h3'), c.title).toHaveText(c.title);
      expect(c.title).toBe(titleCase(c.title));
      expect(await texts(page, `#features li.card:nth-child(${i + 1}) p`), c.title).toEqual([c.text]);
      expect(await card.getAttribute('data-relieves'), c.title).toBe(c.pain);
      expect(((await card.getAttribute('data-fact')) ?? '').split(' ').sort(), c.title).toEqual([...c.facts].sort());
    }
  });

  test('Home carries none of the matrix labels; YouthWIDE and Development Partners keep them', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#features').textContent())).not.toMatch(/Funder Concern Addressed|What Is Included|Practical Benefit|Added Benefit/);
    await expect(page.locator('#features .fc__card')).toHaveCount(0);
    for (const route of ['programs/youthwide/', 'partner-with-us/development-partners/']) {
      await open(page, route);
      expect(compact(await page.locator('#features').textContent()), route).toContain('Funder Concern Addressed');
      expect(await page.locator('#features .fc__card').count(), route).toBeGreaterThan(0);
    }
  });

  test('the band keeps its id and its place (after Recognition, before the questions) and has room under the cards', async ({ page }) => {
    await open(page, '');
    const ids = (await bands(page)).map((b) => b.id);
    expect(ids.indexOf('features')).toBe(ids.indexOf('recognition') + 1);
    expect(ids.indexOf('faq')).toBe(ids.indexOf('features') + 1);
    // the old wrapper's `join` had left this band with no bottom padding, so the cards touched the band's edge
    const pad = await page.locator('#features').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expect(pad, 'bottom padding of the band').toBeGreaterThanOrEqual(40);
    expect(await page.locator('#features').getAttribute('class')).toMatch(/band--(airy|white|ice)/);
  });

  for (const vp of [DESKTOP, MOBILE]) {
    test(`at ${vp.width}px the cards fit, stack on a phone and do not scroll sideways`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, '');
      const tops = await page.locator('#features li.card').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
      if (vp.width >= 1024) expect(new Set(tops).size, 'one row of three').toBe(1);
      else expect(new Set(tops).size, 'one card per row').toBe(3);
      expect(await noOverflow(page)).toBe(true);
    });
  }
});

test.describe('Home: the Guide band and the cost-of-waiting card', () => {
  test('the Guide band drops the 31,200+ and 1.5M+ tiles (slide 6 of the carousel states both) and keeps its copy and logos', async ({ page }) => {
    await open(page, '');
    const guide = compact(await page.locator('#guide').textContent());
    expect(guide).not.toMatch(/31,200|1\.5M/);
    await expect(page.locator('#guide .stat, #guide .guide__panel, #guide .guide__tile, #guide [data-evidence]')).toHaveCount(0);
    expect(guide).toContain('We’ve Built This Path Since 2014');
    expect(guide).toContain('CodersTrust launched in 2014 in Copenhagen and began developing freelancers in Bangladesh.');
    await expect(page.locator('#guide').getByRole('link', { name: 'How TalentLEAP Works' })).toHaveCount(1);
    await expect(page.locator('#guide').getByRole('link', { name: 'Meet the Leadership Team' })).toHaveCount(1);
    await expect(page.locator('#guide .rel__title')).toHaveCount(4);
    const slide6 = compact(await page.locator('[data-hs-slide]').nth(5).textContent());
    expect(slide6).toContain('31,200+ people (contract scope, not people trained)');
    expect(slide6).toContain('1.5M+ learners');
    const text = await mainText(page);
    expect(count(text, '31,200+'), 'the 31,200+ is stated once on Home').toBe(1);
    expect(count(text, '1.5M+'), 'the 1.5M+ is stated once on Home').toBe(1);
  });

  test('the Guide copy is one column at a reading width, with no sideways scroll at 1280 or 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, '');
      const copyWidth = await page.locator('#guide .guide__copy').evaluate((el) => el.getBoundingClientRect().width);
      expect(copyWidth, `${vp.width}px`).toBeLessThanOrEqual(vp.width);
      if (vp.width >= 1024) expect(copyWidth, 'a reading measure (48rem), not the full container').toBeLessThanOrEqual(768);
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  test('the cost card states the 21% finding alone, still rests on PX-06, and keeps its "What It Means" line; the pages that print the whole fact still do', async ({ page }) => {
    await open(page, '');
    const card = page.locator('#cost article').first();
    expect(compact(await card.locator('.cost__data').textContent())).toBe('On one major freelancing platform, automation-prone writing and coding postings fell 21% relative to manual-intensive jobs within eight months of ChatGPT’s release.');
    expect(await card.locator('.cost__data').getAttribute('data-fact')).toBe('PX-06');
    expect(compact(await card.locator('.cost__impl').textContent())).toBe('What It Means Training has to follow current employer demand, not last year’s job market.');
    expect(await mainText(page)).not.toMatch(/image-creation|17%/);
    await open(page, 'programs/youthwide/');
    expect(await mainText(page)).toContain('image-creation postings fell 17% within about a year of image-generating AI');
  });
});

test.describe('Universities: the evidence strip, the National University heading and the third pain', () => {
  test('#proof-band is "Evidence from Our Wider Youth Programs": the trial line, the survey line and the two links; no chart, tile, list or second block', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    const band = page.locator('#proof-band');
    await expect(band).toHaveCount(1);
    await expect(band.locator('h2')).toHaveText('Evidence from Our Wider Youth Programs');
    expect(await texts(page, '#proof-band p.lead')).toEqual([
      'A randomized trial of the predecessor WSDFM program found women offered a place were 10.3 percentage points more likely to be employed.',
      'Among surveyed completers, 84.6% hold a bachelor’s degree or higher; employment was 77.9% at the October 2026 survey, up from 47.4% before training.',
    ]);
    expect(await band.locator('p.lead').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['RC-02', 'OC-09 OC-01']);
    expect(await texts(page, '#proof-band a')).toEqual(['The Randomized Trial', 'Impact Survey 2026']);
    expect((await hrefs(page, '#proof-band a')).map((h) => h.replace(/^.*\/ctg\//, ''))).toEqual(['impact/independent-evaluation/', 'impact/outcomes-2026/']);
    await expect(band.locator('svg:not(.icon), .stat, .ba, .ev, table, [data-plain-line], .proofband')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/An Independent Randomized Trial|What Surveyed Completers Report|Employment Among Surveyed Completers|median monthly income was \$245/);
  });

  test('the strip sits on a light ground right after the dark mechanism band and before the features band; no two dark bands meet', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    const order = await bands(page);
    const ids = order.map((b) => b.id);
    expect(ids.indexOf('proof-band')).toBe(ids.indexOf('mechanism') + 1);
    expect(ids.indexOf('features')).toBe(ids.indexOf('proof-band') + 1);
    expect(await page.locator('#proof-band').getAttribute('class')).toMatch(/band--(airy|ice|white)/);
    for (let i = 1; i < order.length; i++) expect(order[i].dark && order[i - 1].dark, `${order[i - 1].id} then ${order[i].id}`).toBe(false);
  });

  test('the strip fits at 1280 and 390 without sideways scroll', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/universities/');
      await expect(page.locator('#proof-band a').first()).toBeVisible();
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  test('the first band is "The National University Partnership" and keeps its clarifying sentence and its three figures', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#offer-evidence h2')).toHaveText('The National University Partnership');
    expect(compact(await page.locator('#offer-evidence .sh__lead').textContent())).toBe('These figures describe National University’s size and the learners being onboarded; they are not learners trained by CodersTrust.');
    await expect(page.locator('#offer-evidence .pe__item')).toHaveCount(3);
  });
});

test.describe('the three funder pains that had a heading and no line now have one', () => {
  const LINES: [string, string, string][] = [
    ['partner-with-us/foundations/', 'Scalable, Accountable Implementers Are Hard to Find', 'Implementers who can absorb a large grant and still report monthly outcomes are rare.'],
    ['partner-with-us/governments/', 'Trainer and Curriculum Capacity Is Thin', 'Trainers and localized curricula are rarely ready at national scale.'],
    ['partner-with-us/universities/', 'Institutions Lack Placement Results They Can Publish', 'Placement data that would satisfy a board or ministry is rarely collected.'],
  ];
  for (const [route, title, line] of LINES) {
    test(`${route}: "${title}" carries its line, and every pain on the page has one`, async ({ page }) => {
      await open(page, route);
      const item = page.locator('.gp__pains li', { has: page.locator('.gp__q', { hasText: title }) });
      await expect(item).toHaveCount(1);
      expect(compact(await item.locator('.gp__a').textContent())).toBe(line);
      await expect(page.locator('.gp__pains li .gp__a')).toHaveCount(3);
    });
  }
});

test.describe('Guide band: one origin line on the audience pages, the two-sentence history on Home', () => {
  const ORIGIN_SHORT = 'Since 2014, from a Copenhagen launch to programs in 15 countries and territories.';
  const AUDIENCE = ['partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/universities/', 'partner-with-us/employers/', 'partner-with-us/investors/'];

  for (const route of AUDIENCE) {
    test(`${route}: the Guide band says it in one line tied to ID-02 and SC-03`, async ({ page }) => {
      await open(page, route);
      const line = page.locator('#guide p[data-fact="ID-02 SC-03"]');
      await expect(line).toHaveCount(1);
      expect(compact(await line.textContent())).toBe(ORIGIN_SHORT);
      expect(compact(await page.locator('#guide').textContent())).not.toMatch(/began developing freelancers|first UNDP-supported pilot|Korail settlement/);
    });
  }

  test('Development Partners: its Guide band shows SC-03’s tile, so the origin line is the launch alone and the 15 is stated once', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const line = page.locator('#guide p[data-fact="ID-02"]');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe('Launched in Copenhagen in 2014.');
    const guide = compact(await page.locator('#guide').textContent());
    expect(guide).not.toMatch(/began developing freelancers|first UNDP-supported pilot|Korail settlement/);
    expect(count(guide, 'countries and territories'), 'the count of countries and territories is the tile’s alone').toBe(2);
    await expect(page.locator('#guide [data-fact="SC-03"]')).toHaveCount(1);
  });

  test('Home keeps the two-sentence history; YouthWIDE and Local Partners never carried it', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#guide').textContent())).toContain('CodersTrust launched in 2014 in Copenhagen and began developing freelancers in Bangladesh. Our first UNDP-supported pilot (2015) was in Dhaka’s Korail settlement.');
    for (const route of ['programs/youthwide/', 'partner-with-us/local-partners/']) {
      await open(page, route);
      expect(compact(await page.locator('#guide').textContent()), route).not.toContain('began developing freelancers');
    }
  });
});

test.describe('Investors: the definition band no longer repeats the 130,000+', () => {
  test('the second paragraph is the platform sentence alone; "Reach to Date" still carries the count', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(await texts(page, '#definition .def__text')).toEqual([
      'CodersTrust is a workforce-development organization that trains and mentors educated, unemployed and underemployed youth in emerging markets for digital work and connects them to local, remote and global work.',
      'CodersTrust is building JobReady, an AI-native digital education and employment platform for emerging markets.',
    ]);
    expect(await page.locator('#definition .def').getAttribute('data-fact')).toBe('ID-01 IN-04');
    expect(compact(await page.locator('#definition').textContent())).not.toContain('130,000');
    expect(compact(await page.locator('#reach').textContent())).toContain('130,000+');
    expect(count(await mainText(page), '130,000+'), 'the 130,000+ is stated once on Investors').toBe(1);
  });
});

test.describe('Home carousel: the reach slide has its figure, the speed slide leads with its figure', () => {
  test('slide 5 shows SC-03’s 15 with its caption above the unchanged heading, line and link', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(4);
    await expect(slide.locator('h2')).toHaveText('Explore Where Our Programs Have Run');
    await expect(slide.locator('.hs__lead')).toHaveText('Bangladesh plus 14 other countries and territories; most delivery has been in Bangladesh.');
    await expect(slide.locator('.hs__stat')).toHaveCount(1);
    expect(await slide.locator('.hs__stat').getAttribute('data-fact')).toBe('SC-03');
    await expect(slide.locator('.stat__value')).toHaveText('15');
    await expect(slide.locator('.stat__label')).toHaveText('countries and territories with CodersTrust programs');
    expect(compact(await slide.textContent())).not.toContain('130,000');
    await expect(slide.locator('a', { hasText: 'Explore Global Reach' })).toHaveCount(1);
  });

  test('slide 4 reads "58.8% of Completers Who Started Earning Began Within Six Months" (Title Case, tied to OC-05) and keeps its survey base in the lead and the tile', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(3);
    const heading = '58.8% of Completers Who Started Earning Began Within Six Months';
    await expect(slide.locator('h2')).toHaveText(heading);
    expect(heading).toBe(titleCase(heading));
    expect(await slide.locator('h2').getAttribute('data-fact')).toBe('OC-05');
    await expect(slide.locator('.hs__eyebrow')).toHaveText('Impact Survey 2026');
    await expect(slide.locator('.hs__lead')).toHaveText('Among surveyed completers who first earned during or after training, most started within six months.');
    expect(compact(await slide.locator('.hs__stat').textContent())).toContain('of the 170 surveyed completers who first earned during or after training started earning within six months (October 2026 survey)');
  });
});

test.describe('wording fixes', () => {
  test('Contact: step 3 says "a program scope, designed with you" (only that sentence changed)', async ({ page }) => {
    await open(page, 'contact/');
    const third = compact(await page.locator('#next .steps__item').nth(2).textContent());
    expect(third).toContain('Development partners, governments, universities and local partners: a program scope, designed with you. Foundations: a cohort grant or a JobReady platform grant. Employers training a team: a needs assessment of your roles.');
    expect(third).not.toContain('a first cohort, designed with you');
    expect(third).toContain('Impact investors: the deck and data room follow under NDA.');
  });

  for (const [route, id] of [['about/', 'about-cta'], ['about/team/', 'team-cta']]) {
    test(`${route}: "Talk to the Team" asks for goals and offers a partnership route, not a first cohort`, async ({ page }) => {
      await open(page, route);
      const cta = page.locator(`#${id}`);
      await expect(cta).toHaveCount(1);
      const text = compact(await cta.textContent());
      expect(text).toContain('Talk to the Team');
      expect(text).toContain('Tell us your goals, and we will discuss the right partnership route.');
      expect(text).not.toMatch(/priority groups|first cohort/);
    });
  }

  test('SuperKids: the options lead is "Bring these three things to the conversation." and the pricing statement sits right under it', async ({ page }) => {
    await open(page, 'programs/superkids/');
    const band = page.locator('#offer');
    await expect(band.locator('h2')).toHaveText('Options Are Shaped with You in a Discovery Session');
    expect(compact(await band.locator('.sh__lead').textContent())).toBe('Bring these three things to the conversation.');
    expect(compact(await band.textContent())).not.toContain('We do not publish prices');
    expect(compact(await band.locator('[data-fact="PD-02"]').textContent())).toBe('Pricing is set per program, and we share an indicative budget in the discovery session.');
  });

  for (const [route, label] of [
    ['programs/jobready-campus/', 'University Partnership Overview'],
    ['programs/jobready-work/', 'Employer Partnership Overview'],
  ] as const) {
    test(`${route}: the route strip is its kicker and its link alone (the sentence that repeated the hero action is gone)`, async ({ page }) => {
      await open(page, route);
      const band = page.locator('#route-link');
      await expect(band.locator('a.link')).toHaveText(label);
      await expect(band.locator('.rl__kicker')).toHaveText('The Partnership Route');
      await expect(band.locator('p.rl > *'), 'the kicker and the link, nothing after them').toHaveCount(2);
      await expect(band.locator('.rl__note')).toHaveCount(0);
      expect(await mainText(page)).not.toMatch(/Ready to discuss this program|inquiry action on this page/);
    });
  }

  test('TalentLEAP: the Level 1 example keeps the course’s registered title (IN-08), with the certification note right under the levels', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    await expect(page.locator('#example .lv__title')).toHaveText('Introduction to Digital Marketing with Google and Meta Certifications');
    expect(compact(await page.locator('#example .lv').textContent())).toContain('CodersTrust is not affiliated with or endorsed by these certifying bodies; it prepares learners for their exams.');
  });
});

test.describe('Recognition: the press headlines are in Title Case, words unchanged', () => {
  const TITLED = [
    'CodersTrust to Finance Brains to Educate IT Coders',
    'Bangladesh, New York Pursue Different Paths to Train More Coders',
    'A Novel Idea in Microfinance Is Turning Bangladeshis into Freelance Coders',
    'Cook to Coder: How Low-Income Youth Are Writing a Better Future',
  ];

  test('the four sentence-case headlines read in Title Case; the two quoted in the register (PA-09) keep their published capitals', async ({ page }) => {
    await open(page, 'about/recognition/');
    // the linked headline carries a screen-reader note ("(opens techcrunch.com)") after its words
    const headlines = (await texts(page, '#coverage .rec-press__headline')).map((h) => h.replace(/ \(opens [^)]+\)$/, ''));
    expect(headlines).toHaveLength(8);
    for (const t of TITLED) {
      expect(headlines, t).toContain(t);
      expect(t).toBe(titleCase(t));
    }
    expect(headlines).toContain('Building Code To Break Poverty In Bangladesh');
    expect(headlines).toContain('5 Companies Making A Splash For A Better World');
    expect(headlines).toContain('Startup Aims to Boost Number of Qualified IT Workers');
    expect(headlines).not.toContain('CodersTrust to finance brains to educate IT coders');
  });

  test('the linked headline (TechCrunch) keeps its link', async ({ page }) => {
    await open(page, 'about/recognition/');
    const link = page.locator('#coverage .rec-press__headline a');
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toBe('https://techcrunch.com/2014/06/13/building-code-to-break-poverty-in-bangladesh/');
  });
});

test.describe('one title pattern: "{Page} | CodersTrust", with Home’s brand-forward title kept', () => {
  const titleOf = (file: string) => (/<title>([\s\S]*?)<\/title>/.exec(readFileSync(file, 'utf8'))?.[1] ?? '').replace(/&amp;/g, '&').replace(/&#39;/g, '’').trim();

  test('every page but Home ends its title with " | CodersTrust", within 60 characters', () => {
    const odd: string[] = [];
    for (const p of listPages()) {
      const t = titleOf(p.file);
      if (p.route === '/') continue;
      if (!t.endsWith(' | CodersTrust') || t.length > 60) odd.push(`${p.route}: ${t} (${t.length})`);
    }
    expect(odd).toEqual([]);
  });

  test('Home keeps "CodersTrust: From Learning to Earning for Youth"; the three pages that had dropped the suffix carry it', () => {
    const byRoute = new Map(listPages().map((p) => [p.route, titleOf(p.file)]));
    expect(byRoute.get('/')).toBe('CodersTrust: From Learning to Earning for Youth');
    expect(byRoute.get('/about/')).toBe('About Us | CodersTrust');
    expect(byRoute.get('/about/team/shamsul-haque/')).toBe('Md. Shamsul Haque, CEO, CodersTrust Bangladesh | CodersTrust');
    expect(byRoute.get('/news/a-proud-milestone-for-coderstrust/')).toBe('A Proud Milestone for CodersTrust! | CodersTrust');
  });

  test('the social titles match the page title on those pages', async ({ page }) => {
    for (const route of ['about/', 'about/team/shamsul-haque/']) {
      await open(page, route);
      const title = await page.title();
      expect(await page.locator('meta[property="og:title"]').getAttribute('content'), route).toBe(title);
      expect(title, route).toMatch(/ \| CodersTrust$/);
    }
  });
});
