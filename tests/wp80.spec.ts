import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { KOSOVO_RECORDS } from '../src/data/copy';
import { KOSOVO_WOW_TILE_LABEL } from '../src/components/pages/partners/partners';
import { open } from './support/browser';

/**
 * WP80 (Claude-ladder fixes, Sonnet XHigh run 9). Retrospective coverage (the owner exempted this project from test-first work); run
 * `npm run build` first, then `PORT=<port> npx playwright test tests/wp80.spec.ts --project=chromium`.
 *   - Item 1: the FAQ answer "Is There Independent Evidence?" opens "Yes, for CodersTrust’s WSDFM program." and states the evaluator, the trial and the control-group result in plain sentences.
 *   - Item 2: RC-04a states the rate behind the taka-to-dollar conversions (WP99, owner check 2026-10-23: about BDT 86 to the dollar, the November–December 2021 rate; it was BDT 87).
 *   - Item 3: the Kosovo base reads "102 of the 150 women trained" wherever a sentence quotes the register line.
 *   - Item 4: the Women in Online Work tile on the partner pages and the Development Partners and YouthWIDE cards is dated "(2016–2017)".
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

test.describe('WP80 item 1: Independent Evidence FAQ answer', () => {
  test('the answer reads as plain sentences (WP99: the fourth cites the peer-reviewed article) with the evaluator spelled out once and no survey aside', () => {
    const q4 = faqs.find((f) => f.q === 'Is There Independent Evidence?');
    expect(q4?.a).toBe('Yes, for CodersTrust’s WSDFM program. The BRAC Institute of Governance and Development (BIGD) at BRAC University ran a randomized controlled trial of that 200-hour program, longer than today’s 100-hour tracks, with women in Dhaka trained in 2020. Women offered a place were more likely to be employed than the control group. The trial is also published in a peer-reviewed journal: Arman, Bhattacharjee, Das, Gomes and Mahmood (2026), “Tackling Women’s Unemployment: Evidence from an Online Jobs Experiment in Bangladesh,” Economic Development and Cultural Change 75(1): 367–399, https://doi.org/10.1086/741450');
    expect(q4?.evidence).toEqual(['RC-01', 'RC-02', 'RC-07', 'RC-15']);
    expect(q4?.a).not.toMatch(/599|May 2022|by BIGD \(BRAC University\)/);
  });

  test('TalentLEAP shows the same answer, with the evaluator spelled out once', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    const text = compact(await page.locator('main').textContent());
    expect(text).toContain('Yes, for CodersTrust’s WSDFM program. The BRAC Institute of Governance and Development (BIGD) at BRAC University ran a randomized controlled trial');
    expect(text.split('BRAC Institute of Governance and Development').length - 1).toBe(1);
  });
});

test.describe('WP80 item 2: taka conversion rate', () => {
  test('RC-04a gives the rate beside the dollar figures it converts', () => {
    expect(fact('RC-04a').text).toBe('BDT 2,354 a month for women offered a place, BDT 3,118 for attenders, on a control-group mean of BDT 5,715 (Table 4); the dollar figures are approximate conversions at about BDT 86 to the dollar, the rate in November–December 2021, when the follow-up survey ran');
  });

  test('the independent evaluation page prints the rate in its taka line', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    const note = compact(await page.locator('#results p[data-fact="RC-04a"]').textContent());
    expect(note).toContain('; the dollar figures are approximate conversions at about BDT 86 to the dollar, the rate in November–December 2021, when the follow-up survey ran.');
  });
});

test.describe('WP80 item 3: the Kosovo base', () => {
  test('PR-02 names the 2016–2017 span and the 150 women trained; its stat value stays "102 of 150"', () => {
    expect(fact('PR-02').text).toContain('2016–2017: 102 of the 150 women trained were in work (68%); 78 program completers');
    expect(fact('PR-02').stat?.value).toBe('102 of 150');
  });

  test('the Home card line is built from the register with the base in no-break spaces', () => {
    expect(KOSOVO_RECORDS.text).toBe('Program records, 2016–2017: 102 of the 150 women trained were in work.');
  });

  test('the Kosovo case study reads the base in its In Work result and its meta description', async ({ page }) => {
    await open(page, 'impact/case-studies/kosovo-women-in-online-work/');
    await expect(page.locator('.kw__results dd').first()).toHaveText('102 of the 150 women trained were in work (68%)');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe('Women in Online Work, a 2016–2017 pilot in Kosovo with the World Bank Group: 102 of the 150 women trained were in work (68%).');
  });
});

test.describe('WP80 item 4: the dated Kosovo tile', () => {
  test('the label is built from PR-02 and TL-04', () => {
    expect(KOSOVO_WOW_TILE_LABEL.replace(/\u2060/g, '')).toBe('Women in Online Work, Kosovo (2016–2017): 68% in work');
    // word joiners keep the span on one line
    expect(KOSOVO_WOW_TILE_LABEL).toContain('2016\u2060–\u20602017');
  });

  for (const route of ['partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/development-partners/', 'programs/youthwide/']) {
    test(`${route} dates the Women in Online Work tile and drops the undated label`, async ({ page }) => {
      await open(page, route);
      const main = compact(await page.locator('main').textContent());
      expect(main).toContain(KOSOVO_WOW_TILE_LABEL);
      expect(main).not.toContain('Women in Online Work, Kosovo: 68% in work');
    });
  }
});
