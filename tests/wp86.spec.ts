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
  // WP166-B (marketing review R2-39): the JobReady Platform's contract-scope tile and its note are gone, so the check that it prints the first sentence is gone with them; it still prints neither the overlap sentence nor the 150,000+.
  test('Governments shows the first sentence of the note alone; the JobReady Platform shows neither the note nor the overlap sentence', async () => {
    for (const route of ['partner-with-us/governments/', 'our-model/jobready-platform/']) {
      const html = pageHtml(route);
      if (route === 'partner-with-us/governments/') expect(html, route).toContain(NOTE_SHORT_FIRST);
      else expect(html, route).not.toContain(NOTE_SHORT_FIRST);
      expect(html, route).not.toContain(OVERLAP);
      expect(html, route).not.toContain('150,000+ enrollments');
    }
  });

  // WP166-C (R4-17, owner approval of 21 November 2026, item 5): Impact's tile keeps the first sentence only (the overlap sentence was cut there); Investors still points back to its reconciliation
  test('Impact keeps the first sentence of the note; Investors keeps the first sentence and points back to its reconciliation (WP94)', async () => {
    expect(pageHtml('impact/'), 'impact/').toContain(NOTE_SHORT_FIRST);
    expect(pageHtml('impact/'), 'impact/').not.toContain(OVERLAP);
    expect(pageHtml('partner-with-us/investors/'), 'investors/').toContain(`${NOTE_SHORT_FIRST} ${OVERLAP_INVESTORS}`);
  });
});

test.describe('Item 3: "Last updated" and the Her Power news date are October 24, 2026', () => {
  test('YouthWIDE and JobReady Platform show October 24, 2026', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    // WP104: both stamps moved on with their later content changes (tests/wp104.spec.ts); WP141: November 1, 2026
    await expect(page.locator('.updated')).toHaveText('Last updated November 27, 2026'); // WP172 (2026-11-27): the trial tiles; WP151; WP163: re-dated 2026-11-03; WP166-B (marketing review R2): 2026-11-21
    await open(page, 'our-model/jobready-platform/');
    // WP166-B (marketing review R2-06): the platform page prints the line at its foot (.jr__updated; it was .lf-updated in the header), dated 2026-11-21.
    await expect(page.locator('.jr__updated')).toHaveText('Last updated November 21, 2026'); // WP157: re-dated 2026-11-02; WP163: 2026-11-03; WP166-B: 2026-11-21
    expect(pageHtml('our-model/jobready-platform/')).toContain('"dateModified":"2026-11-21"'); // WP163: re-dated 2026-11-03; WP166-B: 2026-11-21
  });

  // WP124: the Her Power post moved on to October 29, 2026 with its quotation-mark fix (tests/wp124.spec.ts)
  // WP161-B: it moved on to November 2, 2026 (Fable review A-17: "DoICT), under the ICT Division, Bangladesh")
  // WP166-C: it moved on to November 21, 2026 (its excerpt, the note under the H1 and the closing link)
  test('the Her Power news post reads "updated November 21, 2026" and its JSON-LD dateModified is 2026-11-21', async ({ page }) => {
    const route = listPages().map((p) => p.route).find((r) => r.includes(HER_POWER_SLUG));
    expect(route, 'Her Power news route').toBeTruthy();
    await open(page, route!.replace(/^\//, ''));
    await expect(page.locator('body')).toContainText('updated November 21, 2026');
    await expect(page.locator('body')).not.toContainText('updated October 15, 2026');
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"dateModified":"2026-11-21"');
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
    await expect(page.locator('body')).toContainText('with outcome tracking for 12 months after each course.');
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

// WP162 (owner decision 2026-11-03): the Albania card had no figure at all (the World Bank's May 2022 figures count the whole program), so it had no tag row; the other four keep theirs.
// WP164 (owner decision 2026-11-03): the card has a figure again, PR-09, the implementing partner's; it is not a CodersTrust program record, so the card still has no tag row (CaseGrid shows tags only for a figure with an evidence type).
test.describe('Item 9: the Digital Jobs Albania card takes no Delivered tag', () => {
  test('four of the five case cards carry a Delivered tag; Digital Jobs Albania carries none (WP164: its partner-reported figure takes no tag row)', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    expect(await page.locator('.case__result dd > .case__tags').count()).toBe(4); // WP166-C (R4-06): the WSDFM card's trial figure has its own tag row, inside .case__trial
    expect(await page.locator('.case__tags .status-tag').count()).toBe(4);
    // The card that links to Digital Jobs Albania: no tag row and no status tag.
    const albania = page.locator('article.case', { has: page.locator('a[href*="digital-jobs-albania"]') });
    await expect(albania).toHaveCount(1);
    await expect(albania.locator('.case__tags, .status-tag')).toHaveCount(0);
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
    // WP166-A (marketing review R1-39): the listing band is gone (its register sentence opens the hero lead); the World Bank section now has its entry near the top (R1-40)
    for (const id of ['honors', 'world-bank', 'photos', 'coverage', 'press-kit']) {
      expect(links.some((l) => l.id === id), `entry for #${id}`).toBe(true);
    }
    expect(links.some((l) => l.id === 'listing')).toBe(false);
  });
});

test.describe('Item 12: the JobReady Platform FAQ does not point to planned items', () => {
  // WP163 (owner answers of 3 November 2026): the answer points to the capabilities with no live, pre-launch or planned label at all (it read "Partly. See Rollout Status above for what is live and what is in pre-launch.").
  // WP166-B (marketing review R2-40, owner approval of 21 November 2026): the platform question that pointed to Platform Capabilities ("See Platform Capabilities above, from the AI Tutor to the work marketplaces.") is gone, and the
  // assertion on its answer with it; the page's FAQ (now the connectivity question) still carries no planned, live or pre-launch label.
  test('the FAQ carries no "planned" (and no live or pre-launch label)', async () => {
    const html = pageHtml('our-model/jobready-platform/');
    expect(html).not.toContain('See Platform Capabilities above, from the AI Tutor to the work marketplaces.');
    const faq = /<section[^>]*\bid="faq"[\s\S]*?<\/section>/.exec(html)?.[0] ?? '';
    expect(faq, 'the FAQ band is on the page').not.toBe('');
    expect(faq).not.toMatch(/\bplanned\b|pre-launch|live today/i);
    expect(html).not.toContain('pre-launch and planned capabilities');
    expect(html).not.toContain('what is live and what is in pre-launch');
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
