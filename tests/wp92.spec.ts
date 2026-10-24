import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';

/**
 * WP92 behaviors (Perplexity cycle 41, triage A1 to A10, accepted exactly as written in c41-triage.md; WP92-spec items 2 to 4). Retrospective coverage: the owner
 * exempted this project from test-first work, so these tests were written after the change. Run `npm run build` first, then
 * `PORT=4573 npx playwright test tests/wp92.spec.ts --project=chromium`.
 *   - A1: SC-02's detail says Her Power's 2,400 are "in both the 112,926 and the 25,125" (every figure stays; the arithmetic closes);
 *   - A2: the Governments Her Power tile reads "Her Power: tracked women in work (47%), among the 2,400 women CodersTrust trained directly" under "372 of 800";
 *   - A3: the Governments "Where They Work" card is headed "Local, Remote and Global Work";
 *   - A4: Impact's Delivered tile note is "Through 150,000+ enrollments."; the 16 countries sentence stays on Global Reach;
 *   - A5: the Our Model card is "Blended Training and Certification Preparation";
 *   - A6: the Global Reach "Locations Are Not Programs" note ends "Most delivery has been in Bangladesh.";
 *   - A7: Development Partners' first portfolio card says the exam fee is included and names mentoring and placement support;
 *   - A8: SuperKids' agreement lines state the targets only (the subjects stay in the cards);
 *   - A9: the SuperKids "In Practice" line closes with "so children build digital skills early";
 *   - A10: the WSDFM "What CodersTrust Did" list says "Campus outreach".
 * Screenshots (1280 and 390): set WP92_SHOTS to a directory and run the "WP92 screenshots" test.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

const SC02_DETAIL =
  'Of 150,000+ enrollments, 112,926 were direct. The other 40,152 came through CodersTrust curriculum and courseware: Her Power’s 25,125 and UNDP FutureNation’s 15,027. Her Power’s 2,400 directly trained women are in both the 112,926 and the 25,125, so counted once the total is 150,678.';
const HER_POWER_TILE = 'Her Power: tracked women in work (47%), among the 2,400 women CodersTrust trained directly';
const WHERE_THEY_WORK_BODY =
  'Placement support into local, remote and global work, with monthly reports to the agency and follow-up surveys at 3, 6 and 12 months after each course, as agreed in the program scope.';
const BLENDED_TITLE = 'Blended Training and Certification Preparation';
const GLOBAL_REACH_NOTE_END = 'New York is the headquarters, not one of the 16 locations. Most delivery has been in Bangladesh.';
const PORTFOLIO_CARD_1 = 'Certification exam preparation with the exam fee included, three months of mentoring and placement support, in one program.';
const DOICT_LINE = 'DoICT agreement target: 20M+ students through 9,000+ digital labs in Bangladesh.';
const NCTB_LINE = 'NCTB agreement target: 20M+ students.';
const SUPERKIDS_MEANS = 'A school can bring these into the classroom, so children build digital skills early.';
const WSDFM_SOLUTION = 'Campus outreach, roadshows, seminars, parent counseling sessions and online campaigns.';

test.describe('WP92 A1: SC-02 detail names where Her Power’s 2,400 are counted', () => {
  test('the register detail reads the triage wording and the arithmetic still closes', () => {
    expect(fact('SC-02').stat?.detail).toBe(SC02_DETAIL);
    expect(112926 + 40152 - 2400).toBe(150678);
    expect(25125 + 15027).toBe(40152);
    expect(fact('SC-02').stat?.value).toBe('150,000+');
    // the copy.ts guard reads "Her Power’s N and" from this detail; it must still find it
    expect(fact('SC-02').stat?.detail).toContain('Her Power’s 25,125 and');
  });

  test('the Investors note prints the new SC-02 wording', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const note = compact(await page.locator('#guide .ig__notes').textContent());
    expect(note).toBe(`${SC02_DETAIL} Most delivery has been in Bangladesh.`);
  });
});

test.describe('WP92 A2: the Governments Her Power tile names the program and the base once', () => {
  test('the tile shows 372 of 800 over the new label', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const tile = page.locator('#glance li', { hasText: '372 of 800' });
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.locator('.pg__desc').textContent())).toBe(HER_POWER_TILE);
  });
});

test.describe('WP92 A3: the Governments "Where They Work" card has a delivery heading', () => {
  test('the card is headed "Local, Remote and Global Work" and keeps its body; the old heading is gone', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    const card = page.locator('#mechanism .model__block', { hasText: 'Where They Work' });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.model__title')).toHaveText('Local, Remote and Global Work');
    await expect(card).toContainText(WHERE_THEY_WORK_BODY);
    await expect(page.locator('body')).not.toContainText('Placement and Monthly Reports');
  });
});

test.describe('WP92 A4: the Impact Delivered tile has its own note; the 16 sentence stays on Global Reach', () => {
  test('the Impact tile note is "Through 150,000+ enrollments." and the Delivered tag is unchanged', async ({ page }) => {
    await open(page, 'impact/');
    const tile = page.locator('#glance a[data-fact~="SC-16"]');
    await expect(tile).toHaveCount(1);
    expect(compact(await tile.locator('.glance__note').textContent())).toBe('Through 150,000+ enrollments.');
    await expect(tile.locator('.status-tag')).toHaveText('Delivered');
  });

  test('the register note (used by Home and the hub) keeps the 16 countries sentence', () => {
    expect(fact('SC-16').stat?.glance?.note).toBe('Through 150,000+ enrollments. CodersTrust has worked in 16 countries and territories.');
  });
});

test.describe('WP92 A5: the Our Model certification card has the preparation heading', () => {
  test('the card reads "Blended Training and Certification Preparation" and the body is unchanged', async ({ page }) => {
    await open(page, 'our-model/');
    const card = page.locator('#delivery .card', { hasText: BLENDED_TITLE });
    await expect(card).toHaveCount(1);
    await expect(page.locator('body')).not.toContainText('Blended Training with Certification');
    await expect(card).toContainText('Each certification track includes');
  });
});

test.describe('WP92 A6: the Global Reach location note says most delivery was in Bangladesh', () => {
  test('the note ends with the registered sentence', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    const p = page.locator('#map .callout p[data-fact="SC-03"]');
    await expect(p).toHaveCount(1);
    expect(compact(await p.textContent())).toMatch(new RegExp(`${GLOBAL_REACH_NOTE_END.replace(/\./g, '\\.')}$`));
  });
});

test.describe('WP92 A7: the first Development Partners portfolio card names the exam fee', () => {
  test('the card body is the triage wording; its heading is unchanged', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const card = page.locator('#features li.card', { hasText: 'Training, Mentoring and Placement Support' });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('p').first().textContent())).toBe(PORTFOLIO_CARD_1);
  });
});

test.describe('WP92 A8: SuperKids agreement lines state the targets only', () => {
  test('the DoICT and NCTB lines carry no subject; the cards keep the subjects and the tags', async ({ page }) => {
    await open(page, 'programs/superkids/');
    const lines = await page.locator('#agreements .agree__fact p').allTextContents();
    expect(lines.map(compact)).toEqual([DOICT_LINE, NCTB_LINE, 'These are agreement targets, not delivered reach.']);
    await expect(page.locator('#agreements .card', { hasText: 'Primary-school STEM and robotics.' })).toHaveCount(1);
    await expect(page.locator('#agreements .card', { hasText: 'Competency-based experiential learning.' })).toHaveCount(1);
  });
});

test.describe('WP92 A9: the SuperKids "In Practice" line closes with the early-skills clause', () => {
  test('the card line reads the triage wording', async ({ page }) => {
    await open(page, 'programs/');
    const line = page.locator('.feature__means', { hasText: 'digital skills early' });
    await expect(line).toHaveCount(1);
    expect(compact(await line.textContent())).toBe(`In Practice ${SUPERKIDS_MEANS}`);
  });
});

test.describe('WP92 A10: the WSDFM solution list says "Campus outreach"', () => {
  test('the list item reads the triage wording and "Campus activation" is gone', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    await expect(page.locator('body')).toContainText(WSDFM_SOLUTION);
    await expect(page.locator('body')).not.toContainText('Campus activation');
  });
});

const SHOTS = process.env.WP92_SHOTS;
type Shot = { name: string; route: string; selector?: string };
const shots: Shot[] = [
  { name: 'governments-glance', route: 'partner-with-us/governments/', selector: '#glance' },
  { name: 'governments-mechanism', route: 'partner-with-us/governments/', selector: '#mechanism' },
  { name: 'investors-guide', route: 'partner-with-us/investors/', selector: '#guide' },
  { name: 'impact-glance', route: 'impact/', selector: '#glance' },
  { name: 'global-reach-map', route: 'impact/global-reach/', selector: '#map .callout' },
  { name: 'our-model-delivery', route: 'our-model/', selector: '#delivery' },
  { name: 'development-partners-features', route: 'partner-with-us/development-partners/', selector: '#features' },
  { name: 'programs-index', route: 'programs/' },
  { name: 'superkids-agreements', route: 'programs/superkids/', selector: '#agreements' },
  { name: 'wsdfm-case-study', route: 'impact/case-studies/wsdfm-women-freelancers/' },
];

test.describe('WP92 screenshots', () => {
  test.skip(!SHOTS, 'set WP92_SHOTS to a directory to capture');
  for (const shot of shots) {
    for (const [label, vp] of [['1280', DESKTOP], ['390', MOBILE]] as const) {
      test(`${shot.name} at ${label}`, async ({ page }: { page: Page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await open(page, shot.route);
        await scrollThrough(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `horizontal overflow at ${label}`).toBeLessThanOrEqual(0);
        const path = `${SHOTS}/${shot.name}-${label}.png`;
        if (shot.selector) await page.locator(shot.selector).first().screenshot({ path });
        else await page.screenshot({ path, fullPage: true });
      });
    }
  }
});
