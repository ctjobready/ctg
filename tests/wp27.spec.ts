import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP27 behaviors (review round 5, cycle 6, the verified IA reviews): one NU eligibility sentence, evidence-first link names, route-specific next
 * steps. Each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp27.spec.ts --project=chromium`).
 */

/** NU-01, verbatim: admissions' one eligibility sentence. */
const ELIGIBILITY = 'Honors / Diploma holders with a minimum CGPA of 2.25';
const NU = 'programs/nu-postgraduate-diploma/';

const compact = (t: string | null) => (t ?? '').replace(/\s+/g, ' ').trim();
/** Everything in main, including answers inside closed FAQ accordions (innerText leaves those out). */
const everything = (page: Page) => page.locator('main').evaluate((el) => el.textContent ?? '').then(compact);
const hrefOf = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
const subjectOf = (href: string) => decodeURIComponent(/subject=([^&]*)/.exec(href)?.[1] ?? '');

test.describe('one NU eligibility sentence', () => {
  test('the Programs menu description and the Home slide state it in the register’s words', async ({ page }) => {
    await open(page, '');
    const menu = page.locator(`#mega-programs a.mega__link[href$="${NU}"] .mega__desc`);
    expect(compact(await menu.textContent())).toBe(`Eligibility: ${ELIGIBILITY}.`);
    const slide = page.locator(`.hs__program[href$="${NU}"]`).first();
    expect(compact(await slide.textContent())).toContain(`For individual learners: ${ELIGIBILITY}.`);
  });

  test('the Programs hub card states it; "degree holders" is gone from the NU entries', async ({ page }) => {
    await open(page, 'programs/');
    const card = page.locator(`#programs-grid li:has(a[href$="${NU}"])`);
    expect(compact(await card.textContent())).toContain(`Eligibility: ${ELIGIBILITY}`);
    expect(await everything(page)).not.toMatch(/degree holders?/i);
    expect(compact(await page.locator('.hero__lead').first().textContent())).toContain('the NU Postgraduate Diploma for individual learners');
  });

  for (const route of [NU, `${NU}ict/`, `${NU}digital-marketing/`]) {
    test(`${route} answers "is it right for me" with the eligibility sentence, never "if you hold a degree"`, async ({ page }) => {
      await open(page, route);
      const text = await everything(page);
      expect(text).toContain(`Eligibility: ${ELIGIBILITY}. It is right for you if you meet that`);
      expect(text).not.toMatch(/if you hold a degree|degree holders who want/i);
      // the Before You Apply table keeps the register sentence in its Eligibility row
      expect(compact(await page.locator('#before-you-apply .ba__row', { hasText: 'Eligibility' }).first().textContent())).toContain(ELIGIBILITY);
    });
  }

  test('the NU hero text link "Confirm Intake, Schedule and Location" goes to the admissions contact block', async ({ page }) => {
    for (const route of [NU, `${NU}ict/`]) {
      await open(page, route);
      const link = page.locator('.hero a.link', { hasText: 'Confirm Intake, Schedule and Location' });
      await expect(link).toHaveCount(1);
      expect(await link.getAttribute('href')).toBe('#admissions-contact');
      const block = page.locator('#admissions-contact');
      await expect(block).toHaveCount(1);
      await expect(block.locator('a[href^="tel:"]')).toHaveCount(1);
      await expect(block.locator('a[href^="mailto:"]')).toHaveCount(1);
    }
  });

  test('the YouthWIDE menu description leads with the co-funded country cohorts, not with Bangladesh alone', async ({ page }) => {
    await open(page, '');
    const desc = compact(await page.locator('#mega-programs a.mega__link[href$="programs/youthwide/"] .mega__desc').textContent());
    // WP31: designed for the three regions (no wording that implies cohorts already run in all of them)
    expect(desc).toBe('Co-funded country cohorts, designed for South Asia, MENA and Sub-Saharan Africa, with a national initiative in Bangladesh.');
  });

  test('the Programs featured panel (WP30c) points to YouthWIDE with its menu description; individual learners stay in the menu group "For Individual Learners"', async ({ page }) => {
    await open(page, '');
    const text = compact(await page.locator('#mega-programs .mega__feature-text').textContent());
    // the panel states the target page's own menu description (WP30c); this line was left on the older wording until WP31
    expect(text).toBe('Co-funded country cohorts, designed for South Asia, MENA and Sub-Saharan Africa, with a national initiative in Bangladesh.');
    expect(await page.locator('#mega-programs .mega__feature a.link').getAttribute('href')).toMatch(/\/programs\/youthwide\/$/);
    const learners = (await page.locator('#mega-programs a.mega__link').allTextContents()).map(compact).join(' ');
    expect(learners).toContain('NU Postgraduate Diploma');
    expect(learners).toContain('Courses');
  });
});

test.describe('JobReady@Campus and JobReady@Work', () => {
  test('Campus states exam preparation, not the certification itself', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    // WP39 (cycle-16 review): the features band is three short cards
    const cards = (await page.locator('#features .card__text').allTextContents()).map(compact).join(' ');
    expect(cards).toContain('Industry certification exam preparation by track');
    expect(cards.toLowerCase()).not.toContain('industry certifications by track');
  });

  for (const [route, label] of [
    ['programs/jobready-campus/', 'University Partnership Overview'],
    ['programs/jobready-work/', 'Employer Partnership Overview'],
  ] as const) {
    // WP38 (cycle-15 review): the sentence that followed the link ("Ready to discuss this program? Use the inquiry action on this page.") read as placeholder copy and repeated the hero's button right above it, so the strip is
    // the kicker and the link alone (the inquiry action is the hero's button)
    test(`${route} links its partnership route by what it opens, and the hero holds the inquiry action`, async ({ page }) => {
      await open(page, route);
      const band = page.locator('#route-link');
      await expect(band.locator('a.link')).toHaveText(label);
      expect(compact(await band.textContent())).not.toContain('Ready to discuss this program');
      expect(await band.textContent()).not.toContain('Start Here');
      await expect(page.locator('#hero .btn').first()).toBeVisible();
    });
  }

  test('the hub employer card covers both halves of JobReady@Work: training a team and hiring talent', async ({ page }) => {
    await open(page, 'programs/');
    const card = compact(await page.locator('#programs-grid li:has(a[href$="programs/jobready-work/"])').textContent());
    expect(card).toContain('Corporate training custom-developed for each organization, plus access to job-ready talent.');
  });
});

test.describe('Partner with Us', () => {
  test('the hub offers seven peer routes, Investors among them, in menu order', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const hrefs = await hrefOf(page, '#audiences .grid-cards a');
    expect(hrefs.map((h) => h.replace(/^.*partner-with-us\//, ''))).toEqual(['development-partners/', 'governments/', 'foundations/', 'universities/', 'employers/', 'local-partners/', 'investors/']);
    await expect(page.locator('#audiences .grid-cards')).toContainText('Back JobReady’s Staged Rollout');
  });

  test('the seventh route card does not sit alone beside empty cells', async ({ page }) => {
    for (const vp of [DESKTOP, { width: 900, height: 800 }]) {
      await page.setViewportSize(vp);
      await open(page, 'partner-with-us/');
      const boxes = await page.locator('#audiences .grid-cards > a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
      const grid = await page.locator('#audiences .grid-cards').evaluate((e) => e.getBoundingClientRect());
      const last = boxes[boxes.length - 1];
      expect(Math.abs(last.width - grid.width), `last card spans the row at ${vp.width}px`).toBeLessThan(2);
    }
  });

  test('the hero asks which partnership you need, for any country, and has a way to choose a route; the timetable is labelled for grant-funded supported cohorts', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const lead = compact(await page.locator('.hero__lead').first().textContent());
    // WP32 (cycle-9 review): the hub routes more than cohorts (campus skills, team training, hiring, the platform), so one sentence names the choice and describes no cohort (the route cards name the audiences)
    expect(lead).toBe('Choose a partnership for youth employment, campus skills, team training, hiring or JobReady’s staged rollout.');
    expect(lead).not.toMatch(/Bangladesh|investors|cohort|co-design/i);
    await expect(page.locator('#audiences .grid-cards a[href$="partner-with-us/investors/"]')).toHaveCount(1);
    // WP35 (cycle-12 review): the hero's one button jumps to the route cards (it was an email button, with "Choose Your Route" a text link under it)
    const button = page.locator('#hero .btn');
    await expect(button).toHaveText('Choose Your Route');
    expect(await button.getAttribute('href')).toBe('#audiences');
    expect(compact(await page.locator('#how-h').locator('xpath=preceding-sibling::*[1]').textContent())).toBe('For Grant-Funded Supported Cohorts');
  });

  test('Foundations keeps one primary button in the hero; the two route-specific text links sit directly under the two-route comparison, each with its own subject (WP30c)', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const hero = page.locator('#hero');
    await expect(hero.locator('.btn')).toHaveCount(1);
    await expect(hero.locator('.routelinks')).toHaveCount(0);
    const links = page.locator('#mechanism .fr__inquire a.link');
    expect((await links.allTextContents()).map(compact)).toEqual(['Discuss a YouthWIDE Cohort Grant (opens your email app)', 'Discuss a JobReady Platform Grant (opens your email app)']);
    const hrefs = await hrefOf(page, '#mechanism .fr__inquire a.link');
    expect(hrefs.map(subjectOf)).toEqual(['YouthWIDE cohort grant — [foundation/company]', 'JobReady platform grant — [foundation/company]']);
    // the links follow the comparison table directly (they are its next sibling), and sit below it
    const table = await page.locator('#mechanism #funding-routes').boundingBox();
    const first = await links.first().boundingBox();
    expect(first!.y).toBeGreaterThan(table!.y + table!.height - 1);
    const next = await page.evaluate(() => document.querySelector('#funding-routes')?.nextElementSibling?.classList.contains('fr__inquire') ?? false);
    expect(next, 'the inquiry links are the table’s next sibling').toBe(true);
  });

  test('the mobile drawer keeps the Programs group headings', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await open(page, '');
    const heads = (await page.locator('#site-drawer .drawer__subhead p').allTextContents()).map(compact);
    expect(heads).toEqual(['Partner Programs', 'For Individual Learners']);
  });
});

test.describe('evidence pages end with a next step for every reader', () => {
  for (const route of ['impact/independent-evaluation/', 'impact/outcomes-2026/']) {
    test(`${route}: the final call to action adds "Find the Partnership Route for Your Organization" and the email fallback`, async ({ page }) => {
      await open(page, route);
      const end = page.locator('aside.next, #cta').last();
      const link = end.locator('a.link', { hasText: 'Find the Partnership Route for Your Organization' });
      await expect(link).toHaveCount(1);
      expect(await link.getAttribute('href')).toMatch(/\/partner-with-us\/$/);
      expect(compact(await end.locator('.email-fallback').textContent())).toBe('If your email app does not open, write to contact@coderstrust.global.');
    });
  }

  test('the JobReady Platform page ends with the email fallback and one text link for impact investors', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const end = page.locator('aside.jr__next');
    expect(compact(await end.locator('.email-fallback').textContent())).toBe('If your email app does not open, write to contact@coderstrust.global.');
    const link = end.locator('a.link', { hasText: 'Backing the platform? See Investors' });
    await expect(link).toHaveCount(1);
    expect(await link.getAttribute('href')).toMatch(/\/partner-with-us\/investors\/$/);
  });

  test('Contact closes with "What Happens After Your Inquiry" and a route-specific third step', async ({ page }) => {
    await open(page, 'contact/');
    const section = page.locator('#next');
    await expect(section.getByRole('heading', { level: 2, name: 'What Happens After Your Inquiry' })).toBeVisible();
    const steps = (await section.locator('.steps__title').allTextContents()).map((t) => compact(t.replace(/^Step \d+:/, '')));
    expect(steps).toEqual(['Your Inquiry', 'A Conversation', 'The Next Step Depends on Your Route']);
    const third = compact(await section.locator('.steps__item').nth(2).textContent());
    for (const route of ['Development partners', 'Employers training a team', 'Employers hiring talent: a talent request scoped against the experience and credentials available in the candidate pool.', 'Impact investors']) expect(third).toContain(route);
  });
});

test.describe('link names', () => {
  test('"Impact Survey 2026" is the one name for the survey page in links and cards', async ({ page }) => {
    for (const route of ['', 'impact/', 'partner-with-us/', 'programs/youthwide/', 'partner-with-us/foundations/', 'impact/stories/', 'contact/']) {
      await open(page, route);
      const names = (await page.locator('a[href$="impact/outcomes-2026/"], a[href*="impact/outcomes-2026/#"]').allInnerTexts()).map(compact);
      for (const n of names) expect(n, `${route || 'home'}: "${n}"`).not.toMatch(/^(Outcomes 2026|Survey Findings|Read Outcomes 2026|Read the Full Findings|Read the 2026 Survey Results)/);
      const cards = (await page.locator('main .card__title, main .cat__title').allInnerTexts()).map(compact);
      expect(cards).not.toContain('Outcomes 2026');
    }
  });

  test('"Courses" is announced as an external link in the header, drawer and footer', async ({ page }) => {
    await open(page, '');
    for (const scope of ['header', 'footer']) {
      const link = page.locator(scope).getByRole('link', { name: 'Courses (opens JobReady.global)', exact: true });
      await expect(link, scope).toHaveCount(1);
      await expect(link.locator('svg')).toHaveCount(1);
    }
    await page.setViewportSize(MOBILE);
    const drawer = page.locator('#site-drawer a.drawer__top', { hasText: 'Courses' });
    await expect(drawer.locator('svg')).toHaveCount(1);
    expect(compact(await drawer.textContent())).toBe('Courses (opens JobReady.global)');
  });
});
