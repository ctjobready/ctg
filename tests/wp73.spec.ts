import { expect, test } from '@playwright/test';
import { fact, sources } from '../src/data/facts';
import { open } from './support/browser';

/**
 * WP73 behaviors (Claude-ladder fixes, 2026-10-21). Retrospective coverage: the owner exempted this project from test-first work,
 * so these tests were written after the change. Each states one observable behavior of the built site
 * (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp73.spec.ts --project=chromium`):
 *   - 1: RC-10 says BIGD's follow-up study is under way, sourced to BIGD's study page (BIGDSTUDY); the trial page links that page;
 *   - 2: the JobReady@Campus FAQ answer reads its bachelor's-degree share from OC-09 and names the October 2026 survey of completers;
 *   - 3: TalentLEAP is dated October 21, 2026 (page line and JSON-LD dateModified);
 *   - 4: Our Model's scope line links YouthWIDE and JobReady@Campus.
 */

const compact = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

test.describe('Item 1: RC-10 reports the follow-up study as under way', () => {
  test('RC-10 is sourced to BIGDSTUDY and no longer says five-year', () => {
    expect(fact('RC-10').text).toBe('BIGD’s long-term follow-up study of the program is under way');
    expect(fact('RC-10').sourceIds).toEqual(['BIGDSTUDY']);
    expect(sources.BIGDSTUDY.url).toBe('https://bigd.bracu.ac.bd/study/long-term-impact-of-training-underprivileged-women-on-digital-employment-evidence-from-bangladesh/');
  });

  test('the trial page prints RC-10 and links BIGD’s Follow-Up Study beside it', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    const funders = page.locator('#funders');
    await expect(funders).toContainText('BIGD’s long-term follow-up study of the program is under way.');
    await expect(funders).not.toContainText(/five-year/i);
    const link = funders.getByRole('link', { name: /See BIGD’s Follow-Up Study/ });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', sources.BIGDSTUDY.url!);
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(funders.getByRole('link', { name: /See How Partnerships Work/ })).toHaveCount(1);
  });
});

test.describe('Item 2: JobReady@Campus FAQ reads the bachelor’s share from OC-09', () => {
  test('the answer names the October 2026 survey of completers and carries OC-09’s share', async ({ page }) => {
    const share = /(\d+\.\d+)% hold a bachelor/.exec(fact('OC-09').text)?.[1];
    expect(share).toBe('85.0');
    await open(page, 'programs/jobready-campus/');
    const answer = page.locator('#faq details', { hasText: 'Who Is JobReady@Campus For?' }).locator('p');
    await expect(answer).toHaveCount(1);
    expect(compact(await answer.textContent())).toBe('Students and degree holders at universities and colleges. In CodersTrust’s October 2026 survey of completers across its programs, 85.0% held a bachelor’s degree or higher.');
    await expect(answer).toHaveAttribute('data-fact', 'OC-09');
  });
});

test.describe('Item 3: TalentLEAP is dated October 21, 2026', () => {
  test('the Last updated line and the JSON-LD dateModified both read October 21, 2026', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    await expect(page.locator('.lf-updated')).toHaveText(/Last updated October 21, 2026/);
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"dateModified":"2026-10-21"');
    expect(ld).not.toContain('"dateModified":"2026-10-15"');
  });

  test('the page still renders an OC- register fact (the glance tile)', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    await expect(page.locator('[data-fact="OC-01"]').first()).toBeVisible();
  });
});

test.describe('Item 4: Our Model links the two programs it describes', () => {
  test('the scope line links YouthWIDE and JobReady@Campus', async ({ page }) => {
    await open(page, 'our-model/');
    const scope = page.locator('#path .om__scope');
    await expect(scope.getByRole('link', { name: 'YouthWIDE', exact: true })).toHaveAttribute('href', /\/programs\/youthwide\/$/);
    await expect(scope.getByRole('link', { name: 'JobReady@Campus', exact: true })).toHaveAttribute('href', /\/programs\/jobready-campus\/$/);
    await expect(scope).toContainText('this path is the delivery model');
  });
});
