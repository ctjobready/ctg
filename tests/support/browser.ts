import { expect, type Page, type Response, type TestInfo } from '@playwright/test';
import { BASE, ORIGIN } from './env';
import type { SitePage } from './pages';

/** Turn an href as rendered in the page ("/ctg/about/", "/ctg/") into a path relative to the baseURL. */
export function relativeToBase(href: string): string {
  const path = href.split('#')[0];
  const rel = path.startsWith(BASE) ? path.slice(BASE.length) : path.replace(/^\//, '');
  return rel === '' ? './' : rel;
}

/** The two viewports every page is checked at (planning doc 10 §1). */
export const MOBILE = { width: 390, height: 844 } as const;
export const DESKTOP = { width: 1280, height: 800 } as const;
export const VIEWPORTS = [MOBILE, DESKTOP] as const;
export const vpLabel = (v: { width: number; height: number }): string => `${v.width}x${v.height}`;

/** Navigate to a built page (path relative to the baseURL) and require HTTP 200. */
export async function open(
  page: Page,
  target: SitePage | string,
  waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' = 'load',
): Promise<Response> {
  const rel = typeof target === 'string' ? target : target.rel;
  const response = await page.goto(rel, { waitUntil });
  expect(response, `no HTTP response for ${rel}`).not.toBeNull();
  expect(response!.status(), `HTTP status of ${rel}`).toBe(200);
  return response!;
}

/**
 * Scroll the whole document in viewport-sized steps and back to the top. Triggers lazy images and the
 * IntersectionObserver-driven reveals so the page is in its final state. Uses instant scrolling
 * (the site sets scroll-behavior: smooth, which would make a programmatic scroll slow and racy).
 */
export async function scrollThrough(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await frame();
      await pause(25);
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
    await frame();
    await pause(50);
    window.scrollTo({ top: 0, behavior: 'instant' });
    await frame();
  });
}

/**
 * Wait until every finite document-timeline animation/transition has finished (infinite ones such as the
 * marquee and the hero drift never finish and are ignored). Bounded so a stuck animation cannot hang a test.
 */
export async function settleAnimations(page: Page, timeoutMs = 4000): Promise<void> {
  await page.evaluate(async (limit) => {
    const deadline = performance.now() + limit;
    for (let round = 0; round < 4 && performance.now() < deadline; round++) {
      const pending = document.getAnimations().filter((a) => {
        const end = a.effect?.getComputedTiming().endTime;
        return a.timeline instanceof DocumentTimeline && typeof end === 'number' && Number.isFinite(end) && a.playState === 'running';
      });
      if (pending.length === 0) break;
      await Promise.race([
        Promise.allSettled(pending.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline - performance.now()))),
      ]);
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, timeoutMs);
}

export async function fontsReady(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** Attach a JSON blob to the test result; the QA reporter picks up attachments named "qa:<kind>". */
export async function attachJson(testInfo: TestInfo, kind: string, data: unknown): Promise<void> {
  await testInfo.attach(`qa:${kind}`, { body: JSON.stringify(data), contentType: 'application/json' });
}

export interface PageIssues {
  /** console.error messages. */
  console: string[];
  /** Uncaught exceptions / unhandled rejections (pageerror). */
  pageErrors: string[];
  /** Same-origin requests that failed at the network level. */
  failedRequests: string[];
  /** Same-origin responses with a 4xx/5xx status. */
  badResponses: string[];
  /** console.warning messages (reported, never failing). */
  warnings: string[];
}

/** Start collecting console / page / network problems on a page. Call before navigating. */
export function watchPage(page: Page, origin: string = ORIGIN): PageIssues {
  const issues: PageIssues = { console: [], pageErrors: [], failedRequests: [], badResponses: [], warnings: [] };
  const sameOrigin = (url: string) => url.startsWith(origin + '/') || url === origin;
  page.on('console', (message) => {
    const where = message.location();
    const text = `${message.text()}${where.url ? `  (${where.url}:${where.lineNumber})` : ''}`;
    if (message.type() === 'error') issues.console.push(text);
    else if (message.type() === 'warning') issues.warnings.push(text);
  });
  page.on('pageerror', (error) => issues.pageErrors.push(error.stack ?? String(error)));
  page.on('requestfailed', (request) => {
    if (sameOrigin(request.url())) issues.failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`);
  });
  page.on('response', (response) => {
    if (sameOrigin(response.url()) && response.status() >= 400) {
      issues.badResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  return issues;
}

/** Wait until the network has been quiet, bounded (Firefox/WebKit can keep a connection open). */
export async function quiet(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
}
