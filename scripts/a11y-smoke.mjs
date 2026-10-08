#!/usr/bin/env node
/**
 * Accessibility + console smoke test (planning/10 §1): axe-core (WCAG 2.0/2.1/2.2 A+AA tags) at
 * 390×844 and 1280×800, console-error hygiene, reduced-motion and no-JS renders.
 *
 *   npm run build && npm run preview &        # serves http://localhost:4321/ctg/
 *   node scripts/a11y-smoke.mjs [baseUrl] [path ...]
 *
 * Defaults: http://localhost:4321/ctg  /styleguide/ /404.html /
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const base = (process.argv[2] ?? 'http://localhost:4321/ctg').replace(/\/$/, '');
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/styleguide/', '/404.html', '/'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const sizes = [
  { name: '390x844', width: 390, height: 844 },
  { name: '1280x800', width: 1280, height: 800 },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let failures = 0;

for (const p of paths) {
  for (const size of sizes) {
    for (const motion of ['no-preference', 'reduce']) {
      const ctx = await browser.newContext({ viewport: size, reducedMotion: motion });
      const page = await ctx.newPage();
      const errors = [];
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(base + p, { waitUntil: 'networkidle' });
      // reveal everything so axe sees final states (reduced motion shows them immediately)
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 40));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(motion === 'reduce' ? 100 : 3200);
      const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const v = res.violations;
      const label = `${p} @ ${size.name} motion=${motion}`;
      console.log(`${v.length === 0 && errors.length === 0 ? 'PASS' : 'FAIL'}  ${label}  violations=${v.length} console-errors=${errors.length} (${res.passes.length} rules passed)`);
      for (const x of v) {
        failures++;
        console.log(`   - [${x.impact}] ${x.id}: ${x.help} (${x.nodes.length} nodes)`);
        for (const n of x.nodes.slice(0, 4)) console.log(`       ${n.target.join(' ')}  ${(n.failureSummary ?? '').split('\n')[1] ?? ''}`);
      }
      for (const e of errors) {
        failures++;
        console.log(`   - console error: ${e}`);
      }
      await ctx.close();
    }
  }
}

// Interactive states: each mega-menu open (desktop) and the drawer with a group expanded (mobile).
{
  const run = async (label, setup, size) => {
    const ctx = await browser.newContext({ viewport: size });
    const page = await ctx.newPage();
    await page.goto(base + paths[0], { waitUntil: 'networkidle' });
    await setup(page);
    await page.waitForTimeout(500);
    const res = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    console.log(`${res.violations.length ? 'FAIL' : 'PASS'}  ${label}  violations=${res.violations.length}`);
    for (const x of res.violations) {
      failures++;
      console.log(`   - [${x.impact}] ${x.id}: ${x.help} (${x.nodes.length} nodes)`);
    }
    await ctx.close();
  };
  for (const i of [0, 1, 2, 3, 4]) {
    await run(`mega-menu #${i + 1} open @ 1280x800`, async (page) => {
      await page.locator('[data-mega-trigger]').nth(i).click();
    }, sizes[1]);
  }
  await run('drawer open + group expanded @ 390x844', async (page) => {
    await page.locator('[data-drawer-open]').click();
    await page.locator('#site-drawer summary').first().click();
  }, sizes[0]);
}

// No-JS render: content, stats (final values) and links must be present.
for (const p of paths) {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: sizes[1] });
  const page = await ctx.newPage();
  await page.goto(base + p, { waitUntil: 'load' });
  const info = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    links: document.querySelectorAll('a[href]').length,
    hiddenReveals: [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity === '0').length,
  }));
  const ok = info.h1 === 1 && info.hiddenReveals === 0 && info.links > 10;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  no-JS ${p}  h1=${info.h1} links=${info.links} hidden-reveals=${info.hiddenReveals}`);
  await ctx.close();
}

await browser.close();
console.log(failures ? `\n${failures} problem(s)` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
