import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { fact } from '../src/data/facts';
import { DEFAULT_OG, ogCardFor } from '../src/lib/og';
import { titleCase } from '../src/lib/titleCase.mjs';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP101 behaviors (owner answers 2026-10-28). Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp101.spec.ts --project=chromium`:
 *   A. the four NU course banners are new designs built by scripts/build-nu-banners.mjs (NU's own wording, site tokens, AA contrast), with alt texts that describe them;
 *   B. the eleven social-preview cards carry current, verbatim page copy (scripts/build-og.mjs runs again) and Title Case labels;
 *   C. the YouthWIDE aim tile reads in three lines or fewer, and the back-to-top button shows only while the reader scrolls up and hides when idle;
 *   D. source comments no longer quote the retired pre-signature timing.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const read = (rel: string) => readFileSync(rel, 'utf8');
/** Runs a repository script (cwd = the repository root, where Playwright runs) and returns its stdout. */
const run = (script: string, args: string[] = []) => execFileSync(process.execPath, [script, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 100_000 });

function jpegSize(buf: Buffer): { width: number; height: number } {
  expect(buf[0] === 0xff && buf[1] === 0xd8, 'a JPEG starts with FFD8').toBe(true);
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('no SOF marker');
}
function pngSize(buf: Buffer): { width: number; height: number } {
  expect(buf.subarray(1, 4).toString('ascii'), 'a PNG starts with the PNG signature').toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// A. The four NU course banners
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

const NU = 'programs/nu-postgraduate-diploma/';
const BANNER_DIR = 'src/assets/images/pages/nu-pgd';
/** File name, course slug, the retired banner's size and SHA-256, and the alt text the new banner gets. */
const BANNERS = [
  {
    file: 'cybersecurity.jpg',
    slug: 'cyber-security',
    oldBytes: 77815,
    oldSha: 'cb94c2f89c09166d429f6b3ccd97b8a581c24b970d0303b5e9461b3724b67d0c',
    alt: 'Post Graduate Diploma in Cyber Security course banner from National University and CodersTrust, with a shield and padlock illustration',
  },
  {
    file: 'data-analytics.jpg',
    slug: 'data-analytics',
    oldBytes: 73508,
    oldSha: '14b73a1c334ccb83b99c60fbff28ffd526c38063db3d826aaf96d28d66e5ec0e',
    alt: 'Post Graduate Diploma in Data Analytics course banner from National University and CodersTrust, with a bar chart illustration',
  },
  {
    file: 'digital-marketing.jpg',
    slug: 'digital-marketing',
    oldBytes: 80779,
    oldSha: 'a17244299f63be641cc13d231cc94766f13546c6639b039845b53a9dea903325',
    alt: 'Post Graduate Diploma in Digital Marketing course banner from National University and CodersTrust, with a megaphone and funnel illustration',
  },
  {
    file: 'ict.jpg',
    slug: 'ict',
    oldBytes: 80398,
    oldSha: '9b9d30f67122a318a4f149425783d1bbe6adf81c90ff349d3560c9b95b0ff839',
    alt: 'Post Graduate Diploma in Information and Communication Technology course banner from National University and CodersTrust, with a network and code illustration',
  },
];

/** NU's own wording (owner 2026-10-26/27). Nothing else is printed on a banner except the two logos. */
const BANNER_TEXT: Record<string, { title: string; subtitle?: string }> = {
  'cybersecurity.jpg': { title: 'Cyber Security' },
  'data-analytics.jpg': { title: 'Data Analytics' },
  'digital-marketing.jpg': { title: 'Digital Marketing' },
  'ict.jpg': { title: 'ICT', subtitle: 'Information and Communication Technology' },
};

test.describe('WP101 A: new NU course banners', () => {
  test('the banners are produced by scripts/build-nu-banners.mjs, run with `npm run nu-banners`', () => {
    expect(existsSync('scripts/build-nu-banners.mjs')).toBe(true);
    expect(JSON.parse(read('package.json')).scripts['nu-banners']).toBe('node scripts/build-nu-banners.mjs');
  });

  test('the script’s check mode lists exactly NU’s wording (eyebrow, title, and for ICT the long name), no digits, and every text and ground pair passes WCAG AA (4.5:1)', () => {
    const out = JSON.parse(run('scripts/build-nu-banners.mjs', ['--check']));
    expect(out.banners.map((b: { file: string }) => b.file)).toEqual(BANNERS.map((b) => b.file));
    for (const b of out.banners as { file: string; eyebrow: string; title: string; subtitle?: string }[]) {
      expect(b.eyebrow, b.file).toBe('PGD | Post Graduate Diploma');
      expect(b.title, b.file).toBe(BANNER_TEXT[b.file].title);
      expect(b.subtitle, b.file).toBe(BANNER_TEXT[b.file].subtitle);
      expect(`${b.eyebrow}${b.title}${b.subtitle ?? ''}`, `${b.file}: no statistics or claims`).not.toMatch(/\d/);
    }
    expect(Object.keys(out.contrast).length, 'at least the eyebrow, the title, the long name and the lockup text are checked').toBeGreaterThanOrEqual(4);
    for (const [what, ratio] of Object.entries(out.contrast as Record<string, number>)) expect(ratio, what).toBeGreaterThanOrEqual(4.5);
  });

  test('the script renders four 808x555 JPEGs under the old files’ size budget (old size x 1.5) into the folder it is given', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nu-banners-'));
    try {
      run('scripts/build-nu-banners.mjs', ['--out', dir]);
      for (const b of BANNERS) {
        const buf = readFileSync(join(dir, b.file));
        expect(jpegSize(buf), b.file).toEqual({ width: 808, height: 555 });
        expect(buf.length, `${b.file} bytes`).toBeLessThanOrEqual(b.oldBytes * 1.5);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('the four banner files in the repository are 808x555 JPEGs under the size budget, and are not the retired banners', () => {
    for (const b of BANNERS) {
      const buf = readFileSync(join(BANNER_DIR, b.file));
      expect(jpegSize(buf), b.file).toEqual({ width: 808, height: 555 });
      expect(buf.length, `${b.file} bytes`).toBeLessThanOrEqual(b.oldBytes * 1.5);
      expect(createHash('sha256').update(buf).digest('hex'), `${b.file} is still the retired banner`).not.toBe(b.oldSha);
    }
  });

  test('the diploma page’s four course cards carry the new alt texts, in the diploma’s order, with their asset ids unchanged', async ({ page }) => {
    await open(page, NU);
    const imgs = page.locator('#courses article img');
    expect(await imgs.evaluateAll((els) => els.map((i) => i.getAttribute('alt')))).toEqual([BANNERS[2].alt, BANNERS[3].alt, BANNERS[0].alt, BANNERS[1].alt]);
    expect(await imgs.evaluateAll((els) => els.map((i) => i.getAttribute('data-asset')))).toEqual(['legacy-nu-pgd-digital-marketing', 'legacy-nu-pgd-ict', 'legacy-nu-pgd-cybersecurity', 'legacy-nu-pgd-data-analytics']);
  });

  test('the four banners are CodersTrust’s own 2026 designs in the permissions file: a cleared row each (owner answer 2026-10-28), not "published on the legacy site"; the other NU photograph keeps its legacy row', () => {
    const rows = JSON.parse(read('src/data/permissions.json')) as { assetId: string; clearanceId: string; status: string; publishedOnLegacySite: boolean; sensitiveGroup: boolean }[];
    for (const id of ['legacy-nu-pgd-cybersecurity', 'legacy-nu-pgd-data-analytics', 'legacy-nu-pgd-digital-marketing', 'legacy-nu-pgd-ict']) {
      expect(rows.find((r) => r.assetId === id), id).toEqual({ assetId: id, clearanceId: 'OWNER-2026-10-28-NU-BANNERS', status: 'cleared', publishedOnLegacySite: false, sensitiveGroup: false });
    }
    expect(rows.find((r) => r.assetId === 'legacy-nu-pgd-students-laptops')).toEqual({ assetId: 'legacy-nu-pgd-students-laptops', clearanceId: 'OWNER-2026-10-11-OLDSITE', status: 'cleared', publishedOnLegacySite: true, sensitiveGroup: false });
  });

  test('the photo registry records where the banners come from, since a permissions row holds five fields only', () => {
    const photos = read('src/data/photos.ts');
    expect(photos).toContain('scripts/build-nu-banners.mjs');
    expect(photos).toContain('OWNER-2026-10-28-NU-BANNERS');
    expect(photos).toMatch(/National University crest/);
  });

  for (const b of BANNERS) {
    test(`the ${b.slug} course page’s hero shows its banner with the new alt text`, async ({ page }) => {
      await open(page, `${NU}${b.slug}/`);
      expect(await page.locator('.hero img[data-asset]').getAttribute('alt')).toBe(b.alt);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// B. The eleven social-preview cards
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** Base-less prefix, card file, label (Title Case) and the line: each line is verbatim in that page's own copy (the hero title or lead, or its first sentence). */
const CARDS = [
  { prefix: '/', file: 'default', label: 'Learn. Earn. Prosper.', line: 'Turn Youth Unemployment into a Digital Workforce — with Evidence' },
  { prefix: '/partner-with-us/', file: 'partner-with-us', label: 'Partner with Us', line: 'Choose a partnership for youth employment, campus skills, team training, hiring or JobReady’s staged rollout.' },
  { prefix: '/partner-with-us/investors/', file: 'investors', label: 'Investors', line: 'Back JobReady’s staged rollout, built on CodersTrust’s training and mentoring programs.' },
  { prefix: '/programs/', file: 'programs', label: 'Programs', line: 'Digital Skills Programs, from School to Work' },
  { prefix: '/programs/nu-postgraduate-diploma/', file: 'nu-postgraduate-diploma', label: 'NU Post Graduate Diploma', line: 'We help learners prepare for digital work through a National University post graduate diploma.' },
  { prefix: '/our-model/', file: 'our-model', label: 'Our Model', line: 'One Path from Learning to Earning, with Outcomes Tracked' },
  { prefix: '/impact/', file: 'impact', label: 'Impact', line: 'Impact You Can Verify' },
  { prefix: '/about/', file: 'about', label: 'About', line: 'A Global Workforce Organization, Built on Evidence' },
  { prefix: '/news/', file: 'news', label: 'News', line: 'Partnerships and MOUs, recognition, program events and leadership' },
  { prefix: '/careers/', file: 'careers', label: 'Careers', line: 'We are building a team that finds practical answers and delivers.' },
  { prefix: '/contact/', file: 'contact', label: 'Contact', line: 'Choose the route that fits you.' },
];
const altOf = (c: (typeof CARDS)[number]) => (c.file === 'default' ? 'CodersTrust: Learn. Earn. Prosper.' : `CodersTrust: ${c.label}. ${c.line}${/[.!?]$/.test(c.line) ? '' : '.'}`);

test.describe('WP101 B: the social-preview cards carry current copy', () => {
  test('scripts/build-og.mjs accepts its card table (every label and line is verbatim site copy), and its table is the one the owner approved', () => {
    const out = JSON.parse(run('scripts/build-og.mjs', ['--check']));
    expect(out.cards).toEqual(CARDS.map(({ file, prefix, label, line }) => ({ file, prefix, label, line })));
  });

  test('every card label is in Title Case (the site rule)', () => {
    for (const c of CARDS) expect(c.label, c.file).toBe(titleCase(c.label));
  });

  test('src/lib/og.ts carries each card’s alt text: "CodersTrust: <label>. <line>."', () => {
    expect(DEFAULT_OG.alt).toBe(altOf(CARDS[0]));
    for (const c of CARDS.slice(1)) expect(ogCardFor(c.prefix).alt, c.file).toBe(altOf(c));
  });

  test('each card’s line is verbatim in the visible copy of the page the card belongs to', async ({ page }) => {
    for (const c of CARDS) {
      await open(page, c.prefix === '/' ? '' : c.prefix.slice(1));
      expect(compact(await page.locator('main').textContent()), c.file).toContain(c.line);
    }
  });

  test('every card is a 1200x630 PNG under 200 KB, and the page serves it with its alt text', async ({ page }) => {
    for (const c of CARDS) {
      const file = join('public/og', `${c.file}.png`);
      expect(pngSize(readFileSync(file)), c.file).toEqual({ width: 1200, height: 630 });
      expect(statSync(file).size, `${c.file} bytes`).toBeLessThanOrEqual(200 * 1024);
      await open(page, c.prefix === '/' ? '' : c.prefix.slice(1));
      expect(await page.locator('meta[property="og:image:alt"]').getAttribute('content'), c.file).toBe(altOf(c));
    }
  });

  test('the generator no longer carries the stale WP63 note that it cannot run', () => {
    expect(read('scripts/build-og.mjs')).not.toMatch(/cannot run today|are stale until/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// C. Layout polish
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/** Number of rendered lines of a text element (distinct line-box tops of its text). */
async function lineCount(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size;
  });
}

test.describe('WP101 C1: the YouthWIDE 2030 aim tile', () => {
  const LABEL = '#governments .mech-target .stat__label';
  for (const width of [390, 768, 1024, 1280]) {
    // WP105 (Minor 1): the tile's label is the short "educated youth YouthWIDE aims to train by 2030"; the register's long label (IN-01) is unchanged and is said in full once, in the "Designed for Three Regions" row.
    test(`the "1 million" label reads in three lines or fewer at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await open(page, 'programs/youthwide/');
      expect(compact(await page.locator(LABEL).textContent())).toBe('educated youth YouthWIDE aims to train by 2030');
      expect(fact('IN-01').stat!.label).toContain('educated youth (Higher Secondary Certificate or above) that YouthWIDE aims to train by 2030');
      expect(await lineCount(page, LABEL)).toBeLessThanOrEqual(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll').toBe(true);
    });
  }

  test('WP105: with the short label the three tiles share the band equally at desktop width, and the two neighbours read their labels in four lines or fewer', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, 'programs/youthwide/');
    const widths = await page.locator('#governments .mech-stats > *').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
    expect(widths).toHaveLength(3);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(4);
    for (const sel of ['#governments .mech-stat:nth-child(2) .stat__label', '#governments .mech-stat:nth-child(3) .stat__label']) expect(await lineCount(page, sel), sel).toBeLessThanOrEqual(4);
  });
});

// C2 (owner answer 2026-10-28, "Hide when idle"): the fixed back-to-top button covers whatever is beneath it, so it is shown only while the reader scrolls up past one screen, and hides after about two
// seconds without scrolling or at once on scroll down. It stays shown while it has focus, and moves without animation under prefers-reduced-motion.
const BTT = '[data-backtotop]';
const frames = (page: Page) => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
const jump = async (page: Page, top: number) => {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await frames(page);
};
const nudge = async (page: Page, dy: number) => {
  await page.evaluate((y) => window.scrollBy({ top: y, behavior: 'instant' }), dy);
  await frames(page);
};
/** What a reader sees of the button once its transitions have finished. */
async function bttState(page: Page, settle = true) {
  if (settle) await page.waitForFunction((sel) => document.querySelector(sel)!.getAnimations().length === 0, BTT);
  return page.evaluate((sel) => {
    const b = document.querySelector(sel) as HTMLElement;
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { opacity: Number(cs.opacity), pointerEvents: cs.pointerEvents, visibility: cs.visibility, hitIsButton: Boolean(hit && b.contains(hit)), shownClass: b.classList.contains('is-visible') };
  }, BTT);
}
/** Presses End and waits until the page has arrived (the site scrolls smoothly) and the button can take focus. */
async function toEnd(page: Page) {
  await page.keyboard.press('End');
  await page.waitForFunction(() => window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2);
  await expect(page.locator(BTT)).toHaveClass(/is-active/);
  await frames(page);
}
const SHOWN = { opacity: 1, pointerEvents: 'auto', visibility: 'visible', hitIsButton: true, shownClass: true };
const HIDDEN = { opacity: 0, pointerEvents: 'none', hitIsButton: false, shownClass: false };

for (const vp of [MOBILE, DESKTOP]) {
  test.describe(`WP101 C2: the back-to-top button hides when idle, ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp });

    test('past one screen of scrolling down, the button is hidden (not drawn, not hit by a tap), and stays hidden while the reader is idle', async ({ page }) => {
      await open(page, '');
      await jump(page, vp.height * 3);
      expect(await bttState(page)).toMatchObject(HIDDEN);
      await page.waitForTimeout(2500);
      expect(await bttState(page)).toMatchObject(HIDDEN);
    });

    test('scrolling up past one screen shows the button, over the page, ready to be pressed', async ({ page }) => {
      await open(page, '');
      await jump(page, vp.height * 3);
      expect(await bttState(page), 'hidden before the reader scrolls up').toMatchObject(HIDDEN);
      await nudge(page, -250);
      expect(await bttState(page)).toMatchObject(SHOWN);
    });

    test('it hides again at once when the reader scrolls down', async ({ page }) => {
      await open(page, '');
      await jump(page, vp.height * 3);
      await nudge(page, -250);
      await expect(page.locator(BTT)).toHaveClass(/is-visible/);
      await nudge(page, 300);
      await expect(page.locator(BTT)).not.toHaveClass(/is-visible/, { timeout: 800 });
      expect(await bttState(page)).toMatchObject(HIDDEN);
    });

    test('it hides about two seconds after the last scroll up', async ({ page }) => {
      await open(page, '');
      await jump(page, vp.height * 3);
      await nudge(page, -250);
      const idle = await page.evaluate(
        (sel) =>
          new Promise<number>((resolve) => {
            const b = document.querySelector(sel) as HTMLElement;
            const t0 = performance.now();
            const poll = () => {
              if (!b.classList.contains('is-visible')) resolve(performance.now() - t0);
              else if (performance.now() - t0 > 6000) resolve(Infinity); // never hides
              else setTimeout(poll, 20);
            };
            poll();
          }),
        BTT,
      );
      expect(idle, 'ms between the scroll up and the button hiding').toBeGreaterThanOrEqual(1500);
      expect(idle).toBeLessThanOrEqual(3000);
      expect(await bttState(page)).toMatchObject(HIDDEN);
    });

    test('scrolling up within the first screen does not show it (the existing show threshold)', async ({ page }) => {
      await open(page, '');
      await jump(page, Math.round(vp.height * 0.6));
      await nudge(page, -100);
      expect(await bttState(page)).toMatchObject({ opacity: 0, visibility: 'hidden', hitIsButton: false, shownClass: false });
    });

    test('a reader who tabs to it from the end of the page finds it shown, and it stays shown while it has focus, through the idle time and a scroll down', async ({ page }) => {
      await open(page, '');
      await toEnd(page);
      expect(await bttState(page), 'hidden until reached').toMatchObject(HIDDEN);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press('Shift+Tab'); // the last stop in the document
      expect(await page.evaluate((sel) => document.activeElement === document.querySelector(sel), BTT), 'focus is on the button').toBe(true);
      expect(await bttState(page)).toMatchObject({ opacity: 1, pointerEvents: 'auto', visibility: 'visible', hitIsButton: true });
      await page.waitForTimeout(2600);
      await nudge(page, -1);
      await nudge(page, 1);
      expect(await page.evaluate((sel) => document.activeElement === document.querySelector(sel), BTT), 'still focused').toBe(true);
      expect(await bttState(page)).toMatchObject({ opacity: 1, pointerEvents: 'auto', visibility: 'visible', hitIsButton: true });
    });

    test('pressing it from the keyboard returns to the top of the page', async ({ page }) => {
      await open(page, '');
      await toEnd(page);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press('Shift+Tab');
      expect(await page.evaluate((sel) => document.activeElement === document.querySelector(sel), BTT), 'focus is on the button').toBe(true);
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), { timeout: 8000 }).toBe(0);
    });
  });
}

test.describe('WP101 C2: the back-to-top button and reduced motion', () => {
  test.use({ viewport: MOBILE });

  test('with reduced motion preferred, the button has no animated transition (none longer than 1 ms, the site rule) and shows at once; otherwise it fades', async ({ page }) => {
    const durations = () => page.evaluate((sel) => getComputedStyle(document.querySelector(sel)!).transitionDuration.split(',').map((d) => parseFloat(d)), BTT);
    await open(page, '');
    expect((await durations()).some((d) => d > 0.05), 'a fade when motion is allowed').toBe(true);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await durations()).every((d) => d <= 0.001), 'no animated transition under prefers-reduced-motion').toBe(true);
    await jump(page, MOBILE.height * 3);
    await nudge(page, -250);
    expect(await page.evaluate((sel) => document.querySelector(sel)!.getAnimations().length, BTT), 'nothing animating').toBe(0);
    expect(await bttState(page, false)).toMatchObject(SHOWN);
  });
});

test.describe('WP101 C2: the keep-clear lane is gone from the steps', () => {
  test.use({ viewport: MOBILE });
  test('the steps text column runs to the edge of the content at 390 px again (no lane reserved for the button)', async ({ page }) => {
    await open(page, '');
    const gaps = await page.locator('#next-steps ol.steps > li').evaluateAll((items) =>
      items.map((li) => {
        const text = li.querySelector('.steps__text')!.getBoundingClientRect();
        const box = li.getBoundingClientRect();
        return { padding: getComputedStyle(li.children[1]).paddingInlineEnd, right: Math.round(box.right - text.right) };
      }),
    );
    for (const g of gaps) expect(g).toEqual({ padding: '0px', right: 0 });
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// D. Housekeeping: comments describe current behavior
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

test.describe('WP101 D: source comments no longer quote the retired pre-signature timing', () => {
  const FILES = [
    'src/components/sections/NextStepsBand.astro',
    'src/components/pages/home/ConversionNextSteps.astro',
    'src/pages/programs/youthwide.astro',
    'src/pages/partner-with-us/development-partners/index.astro',
    'src/pages/partner-with-us/foundations/index.astro',
    'src/data/faqs.ts',
  ];
  const RETIRED = [/Discovery \(Week/, /\bWeek [1-3]\b/, /three weeks/i, /weeks to agreement/i, /weeks from the first conversation/i, /Your First 90 Days/];
  for (const f of FILES) {
    test(`${f} has no comment that quotes the retired timing or the retired steps heading`, () => {
      const text = read(f);
      for (const re of RETIRED) expect(text, `${f}: ${re.source}`).not.toMatch(re);
    });
  }
});
