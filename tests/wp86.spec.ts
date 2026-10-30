import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { open } from './support/browser';
import { listPages, type SitePage } from './support/pages';

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
/** The built HTML of one inventory page (the inventory gives its file, not its markup). */
const htmlOf = (p: SitePage): string => readFileSync(p.file, 'utf8');

/**
 * WP86 behaviors (CLR review, Sonnet Max run 3, Minor 1 to 4, plus coordinator items 5 to 7). Retrospective coverage: the owner exempted this project from
 * test-first work, so these tests were written after the change. Run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp86.spec.ts --project=chromium`:
 *   - 1: the Governments contracts note says the other rows give contracted scopes, not the Her Power figures (Minor 1);
 *   - 2: the overlap sentence ("Her Power’s 25,125 is the same group counted in the 150,000+ enrollments ...") is on Investors and Impact only (Minor 2);
 *   - 3: YouthWIDE and JobReady Platform read "Last updated October 24, 2026"; the Her Power news post reads "updated October 24, 2026" with dateModified 2026-10-24 (Minor 3);
 *   - 4: the News boilerplate says "worked in 16 countries and territories", not "across 15" (Minor 4; the BCIU roundtable post keeps the Chairman's reported words, per the review);
 *   - 5: the WSDFM case-study caption uses the short form of the not-trial note on Development Partners, Foundations, Local Partners and YouthWIDE;
 *   - 6: Universities reads "outcome tracking for 12 months after each course, as agreed in the program scope";
 *   - 7: the About menu describes Recognition and Media as "Listings, honors and press coverage".
 */

const OVERLAP = 'Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.';
// WP94 (triage A4): Investors points back to its reconciliation paragraph instead of restating the overlap.
const OVERLAP_INVESTORS = 'Her Power’s 25,125 are already counted in the 150,000+ enrollments above, not additional people.';
const NOTE_SHORT_FIRST = 'The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).';
const CONTRACT_NOTE = 'We confirm each contract’s delivery status in a briefing. Apart from the Her Power figures, the other rows give contracted scopes of work, not delivered scale.';
const WSDFM_CAPTION = 'WSDFM program records (not trial results; the trial’s 425 women offered a place were among these 1,000): 71% of enrolled women in work';
const BCIU_SLUG = 'coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c';
const HER_POWER_SLUG = '25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative';

// Routes here are written without the leading slash ('' is Home); the inventory's routes start with "/".
const pageHtml = (route: string): string => {
  const want = route === '' ? '/' : `/${route}`;
  const p = listPages().find((x) => x.route === want);
  if (!p) throw new Error(`no built page for ${want}`);
  return htmlOf(p);
};

test.describe('Item 1: the Governments contracts note carves out only the Her Power figures', () => {
  test('the note reads the new sentence, and the Governments table carries it', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    expect(compact(await page.locator('#contracts .ct__notes').textContent())).toBe(CONTRACT_NOTE);
    expect(compact(await page.locator('#contracts .ct__notes').textContent())).not.toContain('CodersTrust’s own Her Power figures');
  });
});

test.describe('Item 2: the overlap sentence only where 150,000+ is printed', () => {
  test('Governments and the JobReady Platform show the first sentence of the note alone', async () => {
    for (const route of ['partner-with-us/governments/', 'our-model/jobready-platform/']) {
      const html = pageHtml(route);
      expect(html, route).toContain(NOTE_SHORT_FIRST);
      expect(html, route).not.toContain(OVERLAP);
      expect(html, route).not.toContain('150,000+ enrollments');
    }
  });

  test('Impact keeps the full note with the overlap sentence; Investors keeps the first sentence and points back to its reconciliation (WP94)', async () => {
    expect(pageHtml('impact/'), 'impact/').toContain(`${NOTE_SHORT_FIRST} ${OVERLAP}`);
    expect(pageHtml('partner-with-us/investors/'), 'investors/').toContain(`${NOTE_SHORT_FIRST} ${OVERLAP_INVESTORS}`);
  });
});

test.describe('Item 3: "Last updated" and the Her Power news date are October 24, 2026', () => {
  test('YouthWIDE and JobReady Platform show October 24, 2026', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    // WP104: both stamps moved on to October 31, 2026 with their later content changes (tests/wp104.spec.ts)
    await expect(page.locator('.updated')).toHaveText('Last updated October 31, 2026');
    await open(page, 'our-model/jobready-platform/');
    await expect(page.locator('.lf-updated')).toHaveText('Last updated October 31, 2026');
    expect(pageHtml('our-model/jobready-platform/')).toContain('"dateModified":"2026-10-31"');
  });

  // WP124: the Her Power post moved on to October 29, 2026 with its quotation-mark fix (tests/wp124.spec.ts)
  test('the Her Power news post reads "updated October 29, 2026" and its JSON-LD dateModified is 2026-10-29', async ({ page }) => {
    const route = listPages().map((p) => p.route).find((r) => r.includes(HER_POWER_SLUG));
    expect(route, 'Her Power news route').toBeTruthy();
    await open(page, route!.replace(/^\//, ''));
    await expect(page.locator('body')).toContainText('updated October 29, 2026');
    await expect(page.locator('body')).not.toContainText('updated October 15, 2026');
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"dateModified":"2026-10-29"');
    expect(ld).not.toContain('"dateModified":"2026-10-15"');
  });
});

test.describe('Item 4: News boilerplate agrees with the 16 countries and territories', () => {
  test('no News post except the BCIU roundtable says CodersTrust trained learners "across 15 countries and territories"', async () => {
    const news = listPages().filter((p) => p.route.includes('/news/') && !p.route.includes(BCIU_SLUG));
    expect(news.length).toBeGreaterThan(0);
    const offenders = news.filter((p) => /across 15 countries and territories/.test(htmlOf(p))).map((p) => p.route);
    expect(offenders).toEqual([]);
  });

  test('the six boilerplate posts say "worked in 16 countries and territories"', async () => {
    const withSixteen = listPages().filter((p) => p.route.includes('/news/') && /16 countries and territories/.test(htmlOf(p))).map((p) => p.route);
    expect(withSixteen.length).toBeGreaterThanOrEqual(6);
  });
});

test.describe('Item 5: the WSDFM caption uses the short form of the not-trial note', () => {
  test('Development Partners, Foundations, Local Partners and YouthWIDE print the new caption', async () => {
    for (const route of ['partner-with-us/development-partners/', 'partner-with-us/foundations/', 'partner-with-us/local-partners/', 'programs/youthwide/']) {
      expect(pageHtml(route), route).toContain(WSDFM_CAPTION);
    }
  });

  test('no built page still says the trial studied 833 women in the caption', async () => {
    const offenders = listPages().filter((p) => htmlOf(p).includes('the trial studied 833 women): 71% of enrolled women')).map((p) => p.route);
    expect(offenders).toEqual([]);
  });
});

test.describe('Item 6: Universities outcome tracking is scoped like the other pages', () => {
  test('the Mentoring and Placement card says "after each course, as agreed in the program scope"', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('body')).toContainText('with outcome tracking for 12 months after each course, as agreed in the program scope.');
  });
});

test.describe('Item 7: the About menu describes Recognition and Media as "Listings, honors and press coverage"', () => {
  test('the built navigation carries the new description and not the old one', async () => {
    const html = pageHtml('');
    expect(html).toContain('Listings, honors and press coverage.');
    expect(html).not.toContain('Awards, endorsements and press coverage.');
  });
});

test.describe('Item 8: the Gulf News card carries the article headline', () => {
  test('the card title is "Skype Co-Founder Seeks Local Partners in New Venture", not the standfirst', async () => {
    const html = pageHtml('about/recognition/');
    expect(html).toContain('Skype Co-Founder Seeks Local Partners in New Venture');
    expect(html).not.toContain('CodersTrust to Finance Brains to Educate IT Coders');
  });
});

test.describe('Item 9: the Digital Jobs Albania card takes no Delivered tag', () => {
  test('four of the five case cards carry a Delivered tag; Digital Jobs Albania carries none', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    expect(await page.locator('.case__tags').count()).toBe(5);
    expect(await page.locator('.case__tags .status-tag').count()).toBe(4);
    // The card that links to Digital Jobs Albania: its own tags hold no status tag.
    const albaniaTags = await page.evaluate(() => {
      let el: Element | null = document.querySelector('a[href*="digital-jobs-albania"]');
      while (el && !el.querySelector('.case__tags')) el = el.parentElement;
      return el ? el.querySelectorAll('.case__tags .status-tag').length : -1;
    });
    expect(albaniaTags).toBe(0);
  });
});

test.describe('Item 10: the Success Stories captions end with a period', () => {
  test('each caption ends "...not typical or promised." or "...an outlier, not typical."', async () => {
    const html = pageHtml('impact/stories/');
    expect(html).toContain('Individual story; not typical or promised.');
    expect(html).toContain('Individual story; an outlier, not typical.');
    expect(html).not.toMatch(/Individual story; (not typical or promised|an outlier, not typical)(?!\.)/);
  });
});

test.describe('Item 11: the Recognition On This Page entries are the section headings', () => {
  test('every entry names the heading of the section it opens, and every rendered section has an entry', async ({ page }) => {
    await open(page, 'about/recognition/');
    const links = await page.locator('nav[aria-label="On this page"] a').evaluateAll((els) =>
      els.map((a) => ({ label: (a.textContent ?? '').replace(/\s+/g, ' ').trim(), id: (a.getAttribute('href') ?? '').replace(/^.*#/, '') })),
    );
    expect(links.length).toBeGreaterThan(0);
    for (const { label, id } of links) {
      expect(compact(await page.locator(`#${id} h2`).first().textContent()), `the heading of #${id}`).toBe(label);
    }
    for (const id of ['related', 'forums', 'endorsements']) {
      const rendered = (await page.locator(`#${id}`).count()) > 0;
      expect(links.some((l) => l.id === id), `entry for #${id}`).toBe(rendered);
    }
    for (const id of ['listing', 'honors', 'photos', 'coverage', 'press-kit']) {
      expect(links.some((l) => l.id === id), `entry for #${id}`).toBe(true);
    }
  });
});

test.describe('Item 12: the JobReady Platform FAQ does not point to planned items', () => {
  test('the answer reads "what is live and what is in pre-launch", with no "planned"', async () => {
    const html = pageHtml('our-model/jobready-platform/');
    expect(html).toContain('Partly. See Rollout Status above for what is live and what is in pre-launch.');
    expect(html).not.toContain('pre-launch and planned capabilities');
  });
});

test.describe('Item 13: no two consecutive Investors headings both start "Since 2014"', () => {
  test('the track-record headings no longer repeat the period in consecutive headings', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const texts = await page.locator('#guide h2, #guide h3').evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
    for (let i = 1; i < texts.length; i++) {
      expect(texts[i - 1].startsWith('Since 2014') && texts[i].startsWith('Since 2014'), `${texts[i - 1]} / ${texts[i]}`).toBe(false);
    }
    await expect(page.locator('#guide .ig__delivered h3')).toHaveText('Scale and Partners');
  });
});

test.describe('Item 14: the story role reads "Freelance Designer"', () => {
  test('no built page says "Freelancer - Designer"; the Aysha Akter story says "Freelance Designer"', async () => {
    const offenders = listPages().filter((p) => htmlOf(p).includes('Freelancer - Designer')).map((p) => p.route);
    expect(offenders).toEqual([]);
    expect(listPages().some((p) => htmlOf(p).includes('Freelance Designer'))).toBe(true);
  });
});
