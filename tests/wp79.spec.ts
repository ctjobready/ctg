import { expect, test, type Page } from '@playwright/test';
import { locations } from '../src/data/countries';
import { open } from './support/browser';

/**
 * WP79 (Claude-ladder review, Sonnet XHigh run 8). Retrospective coverage (the owner exempted this project from test-first work); run
 * `npm run build` first, then `PORT=<port> npx playwright test tests/wp79.spec.ts --project=chromium`.
 *   - Item 1: Global Reach labels follow the page's "Locations Are Not Programs" rule. Kosovo (Women in Online Work, with the World Bank) and Albania
 *     (Digital Jobs Albania, a World Bank initiative) are delivered training programs, so they say "Program:"; "Partner:" stays on the 2020 partnerships
 *     (Benin, Egypt, Uganda); the map pin card for Albania shows the same label.
 *   - Item 2: the Case Studies lead says "Five programs, each with its result and its base." (no claim about what the figures do not show).
 *   - Item 3: the Kosovo case study says the pilot was implemented in five municipalities (Ministry release of 13 February 2017, MED17).
 *   - Item 4: the Independent Evaluation page reads "Last updated October 28, 2026" (WP99 added the journal band; it read October 23, 2026), and its JSON-LD dateModified agrees.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const row = (page: Page, name: string) => page.locator('.wmap__table tbody tr', { has: page.locator('th[scope="row"]', { hasText: name }) }).first();
const noteCell = (page: Page, name: string) => row(page, name).locator('td[data-label="Partner / Note"]');

test.describe('WP79 item 1: Global Reach labels follow the Locations Are Not Programs rule', () => {
  test('Kosovo and Albania say "Program:", and Benin, Egypt and Uganda keep "Partner" for their 2020 partnerships', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    expect(compact(await noteCell(page, 'Kosovo').textContent())).toBe('Program: Women in Online Work, with the World Bank');
    expect(compact(await noteCell(page, 'Albania').textContent())).toBe(
      'Program: Digital Jobs Albania, a World Bank initiative, with the Government of Albania and EuroPartners Development',
    );
    expect(compact(await noteCell(page, 'Benin').textContent())).toBe('Partner: SOS Children’s Villages');
    expect(compact(await noteCell(page, 'Egypt').textContent())).toBe('Partner: CrossWorkers');
    expect(compact(await noteCell(page, 'Uganda').textContent())).toBe('Partners: Maarifasasa, Makerere University Business School and U-Touch');
  });

  test('the Albania map pin card shows the same program label, and no "Partner: World Bank" wording remains on the page', async ({ page }) => {
    await open(page, 'impact/global-reach/');
    const card = compact(await page.locator('#wmap-card-albania').evaluate((el) => el.textContent ?? ''));
    expect(card).toContain('Program: Digital Jobs Albania, a World Bank initiative');
    expect(card).not.toContain('Partner: World Bank Group');
    await expect(page.locator('main')).not.toContainText('Partner: World Bank Group');
  });

  test('the location data pins the rule: only Benin, Egypt and Uganda are partner rows; Kosovo and Albania are World Bank program rows', () => {
    const partnerRows = locations.filter((l) => /^Partners?:/.test(l.note ?? '')).map((l) => l.id).sort();
    expect(partnerRows).toEqual(['benin', 'egypt', 'uganda']);
    const worldBank = locations.filter((l) => /World Bank/.test(l.note ?? '')).map((l) => l.id).sort();
    expect(worldBank).toEqual(['albania', 'kosovo']);
    for (const id of worldBank) {
      expect(locations.find((l) => l.id === id)?.note?.startsWith('Program: '), id).toBe(true);
    }
  });
});

test.describe('WP79 item 2: Case Studies lead', () => {
  test('the lead reads "Five programs, each with its figure and its base." (WP103: "figure", not "result") and drops the claim about what the figures do not show', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    await expect(page.locator('main .hero__lead').first()).toHaveText('Five programs, each with its figure and its base.');
    const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(description).not.toContain('do not show');
    expect(description).toContain('each with its figure and its base');
  });
});

test.describe('WP79 item 3: Kosovo case study scope', () => {
  test('the context says the pilot was in five municipalities, not "around the country"', async ({ page }) => {
    await open(page, 'impact/case-studies/kosovo-women-in-online-work/');
    await expect(page.locator('main')).toContainText('prepared young women in five municipalities in Kosovo for online work.');
    await expect(page.locator('main')).not.toContainText('around the country');
  });
});

test.describe('WP79 item 4: Independent Evaluation last-updated date', () => {
  test('the page reads "Last updated October 29, 2026" and its JSON-LD dateModified is 2026-10-29 (WP104; WP99 had October 28)', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    await expect(page.locator('body')).toContainText('Last updated October 31, 2026'); // WP134: WP133 changed its text
    await expect(page.locator('body')).not.toContainText('Last updated October 23, 2026');
    const ld = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => e.textContent ?? '').join('\n'));
    expect(ld).toMatch(/"dateModified"\s*:\s*"2026-10-31"/);
  });
});
