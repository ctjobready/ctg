import { defineConfig, devices } from '@playwright/test';
import { BASE_URL, PORT, QA_DIR } from './tests/support/env';

/**
 * Browser QA suite (planning doc 10 §1 and §3). Serves the built site (`npm run build` first) with
 * `astro preview` and runs the specs under tests/.
 *
 *   npx playwright test                       everything, chromium (plus the CI smoke projects if installed)
 *   npx playwright test --project=chromium    whole suite in Chromium
 *   SCREENS=1 npx playwright test tests/screenshots.spec.ts --project=chromium    opt-in screenshot run
 *
 * Environment: CHROMIUM_PATH (use a specific Chromium/Chrome binary), FIREFOX_PATH, WEBKIT_PATH,
 * BASE_PATH (must match the build; default /ctg), PORT (default 4341), DIST_DIR, QA_DIR.
 * Reports and screenshots go to .work/qa/ (git-ignored).
 */

/** Specs that also run in the Firefox and WebKit projects (cross-browser smoke, doc 10 §3). */
const CROSS_BROWSER = /(smoke|home-cta)\.spec\.ts$/;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  outputDir: `${QA_DIR}/test-results`,
  // Honest results: no retries, no silent re-runs.
  retries: 0,
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 90_000,
  expect: { timeout: 7_500 },
  reporter: [
    [process.env.CI ? 'dot' : 'list'],
    ['json', { outputFile: `${QA_DIR}/playwright-results.json` }],
    ['html', { outputFolder: `${QA_DIR}/playwright-report`, open: 'never' }],
    ['./tests/support/qa-reporter.ts'],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    // The site is static and local; anything slower than this is a defect worth seeing.
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
  },
  webServer: {
    // --ignore-lock keeps `astro preview` in the foreground even under an AI agent (Astro 7 otherwise
    // daemonizes and exits, which Playwright reads as "server exited early").
    command: `npx astro preview --port ${PORT} --host 127.0.0.1 --ignore-lock`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
      },
    },
    {
      name: 'firefox',
      testMatch: CROSS_BROWSER,
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: { executablePath: process.env.FIREFOX_PATH || undefined },
      },
    },
    {
      name: 'webkit',
      testMatch: CROSS_BROWSER,
      use: {
        ...devices['Desktop Safari'],
        launchOptions: { executablePath: process.env.WEBKIT_PATH || undefined },
      },
    },
  ],
});
