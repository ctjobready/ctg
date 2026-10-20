import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP38 behaviors (cycle-15 whole-site reviews, GPT-6.1 Sol and GLM 5.3): Home's "What Your Partnership Includes" is three short cards, Universities' evidence band is a two-line strip (WP43 removed that strip), the Home Guide band drops the two
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

test.describe('Home: "What a Supported Youth Cohort Includes" (WP41: it was "What Your Partnership Includes") is three short cards, not a concern / inclusion / benefit matrix', () => {
  const CARDS = [
    {
      title: 'Training, Mentoring and Placement Support',
      // WP54 (cycle-28 review, Claude S25): "agreed before enrollment" (it said "approved")
      text: '100 training hours per certification, followed by three months of milestone-based mentoring and placement support. Each track’s work-entry plan is agreed before enrollment.',
      pain: 'P1',
      facts: ['PD-01', 'PD-15', 'PD-19'],
    },
    {
      title: 'Progress You Can Check',
      // WP45 (cycle-21 review): one line, the monthly reports (PD-08), scoped
      text: 'Monthly reports will show progress toward paid work, as agreed in the program scope.',
      pain: 'P2',
      facts: ['PD-08'],
    },
    {
      title: 'Tracks Chosen from Employer Demand',
      // WP49 (cycle-24 review, three reviewers): "AI-ready" is a positioning term that Employers and JobReady@Work explain, not Home; the line keeps "designed to" (the register states the track menu is set from employer demand, not that the curriculum follows every change)
      text: 'A curriculum designed to follow the skills employers ask for as entry-level tasks change.',
      pain: 'P3',
      facts: ['PD-02', 'PD-10'],
    },
  ];

  test('three cards, each a heading and its sentences, in the order of the three ranked pains and tied to their register facts', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#features h2')).toHaveText('What a Supported Youth Cohort Includes');
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

  // WP39 and WP40 (cycle-16 and cycle-17 reviews): the audience and program pages and Investors state their features as three short cards too (tests/wp39.spec.ts and tests/wp40.spec.ts hold them)
  test('Home and Investors carry none of the matrix labels', async ({ page }) => {
    for (const route of ['', 'partner-with-us/investors/']) {
      await open(page, route);
      expect(compact(await page.locator('#features').textContent()), route || 'home').not.toMatch(/Concern Addressed|What Is Included|Practical Benefit|Added Benefit/);
      await expect(page.locator('#features .fc__card'), route || 'home').toHaveCount(0);
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
  test('the Guide band drops the 30,000+ and 1.5M+ tiles (the government slide of the carousel, slide 2 since WP42, states both) and keeps its copy and logos', async ({ page }) => {
    await open(page, '');
    const guide = compact(await page.locator('#guide').textContent());
    expect(guide).not.toMatch(/(?<![\d,])30,000|1\.5M/); // the 130,000+ learners are not the total
    await expect(page.locator('#guide .stat, #guide .guide__panel, #guide .guide__tile, #guide [data-evidence]')).toHaveCount(0);
    expect(guide).toContain('We’ve Built This Path Since 2014');
    expect(guide).toContain('CodersTrust launched in 2014 in Copenhagen and began training freelancers in Bangladesh.');
    await expect(page.locator('#guide').getByRole('link', { name: 'How TalentLEAP Works' })).toHaveCount(1);
    await expect(page.locator('#guide').getByRole('link', { name: 'Meet the Leadership Team' })).toHaveCount(1);
    await expect(page.locator('#guide .rel__title')).toHaveCount(4);
    // (WP42, cycle-19 review: the government slide is the second slide)
    const slide2 = compact(await page.locator('[data-hs-slide]').nth(1).textContent());
    // (WP45, cycle-21 review: the scope was GV-12's own note, "The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly)."; WP48, cycle-23 review: the slide keeps the note's first clause, "30,000+ people: contract scope, not a count of completers.")
    // WP57 (cycle-29 review, Grok R2): the slide says the note's WP35 wording again
    // WP61 (cycle-33 review, GPT-6.1 Sol G1): "Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly." (it said "This includes Her Power’s national program: ...")
    expect(slide2).toContain('30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally; CodersTrust trained 2,500 directly.');
    expect(slide2).toContain('1.5M+ learners');
    const text = await mainText(page);
    expect((text.match(/(?<![\d,])30,000\+/g) ?? []).length, 'the 30,000+ is stated once on Home (the 130,000+ learners are another figure)').toBe(1);
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

  // WP48 (cycle-23 review): YouthWIDE's cost band, the one other page that printed the whole PX-06 sentence, is gone; the register keeps the whole fact (tests/wp48.spec.ts)
  test('the cost card states the 21% finding alone, still rests on PX-06, and keeps its "What It Means" line; the register keeps the whole fact', async ({ page }) => {
    await open(page, '');
    const card = page.locator('#cost article').first();
    expect(compact(await card.locator('.cost__data').textContent())).toBe('On one major freelancing platform, automation-prone writing and coding postings fell 21% relative to manual-intensive jobs within eight months of ChatGPT’s release (Demirci, Hannane & Zhu, 2025).');
    expect(await card.locator('.cost__data').getAttribute('data-fact')).toBe('PX-06');
    expect(compact(await card.locator('.cost__impl').textContent())).toBe('What It Means Training has to follow current employer demand, not last year’s job market.');
    expect(await mainText(page)).not.toMatch(/image-creation|17%/);
    expect(fact('PX-06').text).toContain('image-creation postings fell 17% within about a year of image-generating AI');
  });
});

// WP43 (cycle-20 review): the second evidence strip this page had since WP38 ("Evidence from Our Wider Youth Programs": the trial line, the survey line and two links, #proof-band) is gone; the first band's linked strip
// ("Broader Evidence from Our Youth Programs") is the one evidence pointer left (tests/wp43.spec.ts)
test.describe('Universities: the one evidence strip, the National University heading and the third pain', () => {
  test('there is one evidence strip: no #proof-band, no "Evidence from Our Wider Youth Programs", no trial or survey result line; the first band links the trial, the survey and the case studies', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#proof-band')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/Evidence from Our Wider Youth Programs|A randomized trial of the predecessor WSDFM program|Among surveyed completers, 84\.6%|An Independent Randomized Trial|What Surveyed Completers Report|Employment Among Surveyed Completers|median monthly income was \$245/);
    expect(await texts(page, '#offer-evidence nav a')).toEqual(['The Randomized Trial', 'Impact Survey 2026', 'Case Studies']);
    expect((await hrefs(page, '#offer-evidence nav a')).map((h) => h.replace(/^.*\/ctg\//, ''))).toEqual(['impact/independent-evaluation/', 'impact/outcomes-2026/', 'impact/case-studies/']);
    await expect(page.locator('main .eyebrow', { hasText: 'The Evidence' })).toHaveCount(0);
  });

  test('the features band follows the dark mechanism band directly; no two dark bands meet', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    const order = await bands(page);
    const ids = order.map((b) => b.id);
    expect(ids.indexOf('features')).toBe(ids.indexOf('mechanism') + 1);
    expect(await page.locator('#features').getAttribute('class')).toMatch(/band--(airy|ice|white)/);
    for (let i = 1; i < order.length; i++) expect(order[i].dark && order[i - 1].dark, `${order[i - 1].id} then ${order[i].id}`).toBe(false);
  });

  test('the page fits at 1280 and 390 without sideways scroll, and the evidence links are visible', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/universities/');
      await expect(page.locator('#offer-evidence a').first()).toBeVisible();
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });

  test('the first band is "Our University Partnerships" and keeps its clarifying sentence and its three figures', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('#offer-evidence h2')).toHaveText('Our University Partnerships');
    expect(compact(await page.locator('#offer-evidence .sh__lead').textContent())).toBe('These figures describe National University’s size and the learners being onboarded; they are not learners trained by CodersTrust.');
    await expect(page.locator('#offer-evidence .pe__item')).toHaveCount(3);
  });
});

test.describe('the three funder pains that had a heading and no line now have one', () => {
  const LINES: [string, string, string][] = [
    // WP40 (cycle-17 review): the third Foundations pain is about accountability keeping pace with scale, not about how rare other implementers are
    ['partner-with-us/foundations/', 'Accountability Must Keep Pace with Scale', 'You need monthly outcome reports as delivery expands.'],
    // WP49 (cycle-24 reviews): the Governments and Universities lines say what the agency or institution needs, not what is "rarely" so across a sector (tests/wp49.spec.ts)
    // WP54 (cycle-28 review, GPT-6.1 Sol G2): the heading is "... Takes Time to Build" (it said capacity "Is Thin"); the line is unchanged
    ['partner-with-us/governments/', 'Trainer and Curriculum Capacity Takes Time to Build', 'National delivery needs trained facilitators and localized curricula.'],
    ['partner-with-us/universities/', 'Placement Results Are Hard to Publish', 'Your institution needs placement data it can report to a board or ministry.'],
  ];
  for (const [route, title, line] of LINES) {
    test(`${route}: "${title}" carries its line, and every pain on the page has one`, async ({ page }) => {
      await open(page, route);
      const item = page.locator('.gp__pains li', { has: page.locator('.gp__q', { hasText: title }) });
      await expect(item).toHaveCount(1);
      expect(compact(await item.locator('.gp__a').textContent())).toBe(line);
      // WP46 (cycle-22 review): Universities states two pains now, so every pain on it (two) still has its line
      await expect(page.locator('.gp__pains li .gp__a')).toHaveCount(route === 'partner-with-us/universities/' ? 2 : 3);
    });
  }
});

test.describe('Guide band: one origin line on the audience pages, the two-sentence history on Home', () => {
  const ORIGIN_SHORT = 'From a Copenhagen launch to work in 16 countries and territories.'; // WP64 rework RW2 (coordinator): under a heading that says "Since 2014" the band drops that lead-in (originShortUnder, src/data/copy.ts; ORIGIN_SHORT itself keeps it)
  // WP42 (cycle-19 review): Investors' Guide band shows SC-03's tile since "Delivered Since 2014" moved into it, so its origin line is the launch alone, as on Development Partners (tests/wp42.spec.ts)
  const AUDIENCE = ['partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/universities/', 'partner-with-us/employers/'];

  for (const route of AUDIENCE) {
    test(`${route}: the Guide band says it in one line tied to ID-02 and SC-03`, async ({ page }) => {
      await open(page, route);
      const line = page.locator('#guide p[data-fact="ID-02 SC-03"]');
      await expect(line).toHaveCount(1);
      expect(compact(await line.textContent())).toBe(ORIGIN_SHORT);
      expect(compact(await page.locator('#guide').textContent())).not.toMatch(/began (?:developing|training) freelancers|first UNDP-supported pilot|Korail settlement/);
    });
  }

  // WP51 (cycle-26 review, Kimi P2): Development Partners prints the shared origin line like Governments and Foundations (ORIGIN_SHORT), in place of the launch alone that WP38 gave a band showing SC-03's tile; the count is therefore in the
  // origin line as well as in the tile (tests/wp51.spec.ts; 15 then, 17 after WP55, 16 since WP56)
  test('Development Partners: its Guide band prints the shared origin line, "From a Copenhagen launch to work in 16 countries and territories." (WP64: without the "Since 2014," its heading says)', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const line = page.locator('#guide p[data-fact="ID-02 SC-03"]');
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(ORIGIN_SHORT);
    const guide = compact(await page.locator('#guide').textContent());
    expect(guide).not.toMatch(/Launched in Copenhagen|began (?:developing|training) freelancers|first UNDP-supported pilot|Korail settlement/);
    // the tile is the one element marked SC-03 alone; the origin line carries the pair "ID-02 SC-03"
    await expect(page.locator('#guide [data-fact="SC-03"]')).toHaveCount(1);
  });

  test('Home keeps the two-sentence history; YouthWIDE and Local Partners never carried it', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#guide').textContent())).toContain('CodersTrust launched in 2014 in Copenhagen and began training freelancers in Bangladesh. Our first UNDP-supported pilot (2015) was in Dhaka’s Korail settlement.');
    for (const route of ['programs/youthwide/', 'partner-with-us/local-partners/']) {
      await open(page, route);
      expect(compact(await page.locator('#guide').textContent()), route).not.toMatch(/began (?:developing|training) freelancers/);
    }
  });
});

test.describe('Investors: the definition band no longer repeats the 130,000+', () => {
  // WP42 (cycle-19 review): the count is the first tile of "Delivered Since 2014", which moved from "Reach to Date" (now "Contracts, Pipeline and Recognition") into the track-record band (#guide)
  test('the second paragraph is the platform sentence alone; the track-record band carries the count', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(await texts(page, '#definition .def__text')).toEqual([
      'CodersTrust is a workforce-development organization that trains and mentors educated, unemployed and underemployed youth in emerging markets for digital work and connects them to local, remote and global work.',
      // WP46 (cycle-22 review): no "AI-native" (an unexplained label; tests/wp46.spec.ts)
      // WP53 (owner decision 2026-10-16): "a digital learning and earning platform"
      'CodersTrust is building JobReady, a digital learning and earning platform for emerging markets.',
    ]);
    expect(await page.locator('#definition .def').getAttribute('data-fact')).toBe('ID-01 IN-04');
    expect(compact(await page.locator('#definition').textContent())).not.toContain('130,000');
    expect(compact(await page.locator('#guide').textContent())).toContain('130,000+');
    expect(compact(await page.locator('#reach').textContent())).not.toContain('130,000+');
    expect(count(await mainText(page), '130,000+'), 'the 130,000+ is stated once on Investors').toBe(1);
  });
});

test.describe('Home carousel: the reach slide and the speed slide are one survey slide and the hero (WP53)', () => {
  // WP38 (cycle-15 review) gave the reach slide SC-03's "15" as a tile and WP45 (cycle-21 review) as its heading ("Programs in 15 Countries and Territories"). WP53 (owner decision 2026-10-16): that slide is gone; SC-03 is no longer on Home, and the countries and
  // territories are the hero's reach card (SC-16), with no second statement of the figure.
  // WP55 (owner decisions 2026-10-17/18): the "CodersTrust Around the World" strip ends on a Bangladesh tile tied to SC-03 ("Most delivery has been in Bangladesh"), so SC-03 is on Home once, there and never in the carousel; the count itself is still stated once.
  test('the reach slide is gone: no slide states SC-03, the only SC-03 on Home is the world strip’s Bangladesh tile, and the 130,000+ and the 16 countries and territories stand once, in the hero’s reach card', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#results').textContent())).not.toMatch(/Programs in 1[57] Countries|Explore Global Reach|130,000/);
    await expect(page.locator('#results [data-fact~="SC-03"]')).toHaveCount(0);
    await expect(page.locator('main [data-fact~="SC-03"]')).toHaveCount(1);
    await expect(page.locator('main [data-world-strip] [data-tile="bangladesh"][data-fact~="SC-03"]')).toHaveCount(1);
    await expect(page.locator('.hh__card[data-fact="SC-16"]')).toContainText('16 countries and territories');
  });

  // WP41 (cycle-18 reviews), WP43 (cycle-20 review) and WP45 to WP51 shaped the speed slide ("Most Surveyed New Earners Were Earning by Six Months After the Course", Title Case, tied to OC-05, the 58.8% and its base in a tile). WP53 (owner decision 2026-10-16): that slide is gone;
  // its finding is the survey slide's one body line, tied to OC-05, with the base the register defines.
  test('the survey slide (slide 3) states the 58.8% with its survey base in one body line tied to OC-05, under the unchanged income heading and "Impact Survey 2026" eyebrow', async ({ page }) => {
    await open(page, '');
    const slide = page.locator('[data-hs-slide]').nth(2);
    await expect(slide.locator('h2')).toHaveText('Surveyed Completers Report Higher Income');
    expect(await slide.locator('h2').getAttribute('data-fact')).toBe('OC-03');
    await expect(slide.locator('.hs__eyebrow')).toHaveText('Impact Survey 2026');
    await expect(slide.locator('.hs__lead')).toHaveCount(1);
    expect(await slide.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
    // WP49 (cycle-24 review): "surveyed new earners", the register's term (the Outcomes page defines it; tests/wp49.spec.ts). WP54 (cycle-28 reviews, Claude S23 and GLM L1): the line leads with its base and needs no term (tests/wp54.spec.ts)
    expect(compact(await slide.locator('.hs__lead').textContent())).toContain('Of the 170 surveyed completers who first earned during or after training, 58.8% had started earning by six months after finishing the course');
    expect(compact(await page.locator('#results').textContent())).not.toContain('Most Surveyed New Earners Were Earning');
  });
});

test.describe('wording fixes', () => {
  test('Contact: step 3 says "a program scope, designed with you" (only that sentence changed)', async ({ page }) => {
    await open(page, 'contact/');
    const third = compact(await page.locator('#next .steps__item').nth(2).textContent());
    // WP54 (cycle-28 review, GPT-6.1 Sol G7): the recap is four short lines; "Program partners" stands for the four partner types that share the program-scope sentence (tests/wp54.spec.ts)
    expect(third).toContain('Program partners: a program scope, designed with you. Foundations: a cohort or platform grant. Employers: a needs assessment, or a talent request scoped against the candidate pool.');
    expect(third).not.toContain('a first cohort, designed with you');
    expect(third).toContain('Impact investors: the deck and data room, under NDA.');
  });

  // WP52 (cycle-27 review, Kimi M3): About's band is "Start a Conversation" (the action is a general discovery email; the team page keeps "Talk to the Team")
  for (const [route, id, heading] of [['about/', 'about-cta', 'Start a Conversation'], ['about/team/', 'team-cta', 'Talk to the Team']]) {
    test(`${route}: "${heading}" asks for goals and offers a partnership route, not a first cohort`, async ({ page }) => {
      await open(page, route);
      const cta = page.locator(`#${id}`);
      await expect(cta).toHaveCount(1);
      const text = compact(await cta.textContent());
      expect(text).toContain(heading);
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
    // WP61 (cycle-33 review, Kimi K2): "About | CodersTrust" (it was "About Us | CodersTrust", which broke the "{Page} | CodersTrust" pattern)
    expect(byRoute.get('/about/')).toBe('About | CodersTrust');
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
