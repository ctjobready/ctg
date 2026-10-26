import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP96 (owner decisions of 2026-10-26; item 1 as superseded by the coordinator's owner change the same day):
 *   - 1: the Supply Chain award and Nasdaq photographs show only on Aziz Ahmad's team profile, with his name and "Co-Founder" in the alt text and captions; files and permissions rows stay;
 *   - 2: Her Power is dated "2023–2025" (was "from 2023") on the Impact cards, the Case Studies index and the case-study eyebrow;
 *   - 3: the NU course name is spelled "Cybersecurity" in visible text (menus, titles, copy); the URL slug stays cyber-security;
 *   - 4: unchanged: "130,000+ learners trained" and the founders line (Aziz Ahmad and Ferdinand Kjærulff).
 * Run `npm run build` first, then `PORT=<port> npx playwright test tests/wp96.spec.ts --project=chromium --workers=2`.
 * Screenshots (opt-in): WP96_SHOTS=<dir> with the same command writes PNGs of the changed regions at 1280 and 390.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const visible = (html: string) =>
  compact(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&#x27;/g, '’')
      .replace(/&quot;/g, '"'),
  );
// Routes without the leading slash ("about/team/aziz-ahmad/"), as the other WP specs name them.
const builtPages = () => listPages().map((p) => ({ route: p.route.replace(/^\//, ''), html: readFileSync(p.file, 'utf8') }));
const routesWhere = (test: (text: string, html: string) => boolean) =>
  builtPages()
    .filter((p) => test(visible(p.html), p.html))
    .map((p) => p.route);

const AZIZ = 'about/team/aziz-ahmad/';
const SUPPLY_CAPTION = 'Aziz Ahmad, Co-Founder of CodersTrust, receiving the Supply Chain Diversity and Sustainability Excellence Award, 2019';
const NASDAQ_CAPTION = 'Aziz Ahmad, Co-Founder of CodersTrust, at the Nasdaq closing bell ceremony with the US Small Business Administration';
const SUPPLY_ALT = 'Aziz Ahmad, Co-Founder of CodersTrust, receiving the Supply Chain Diversity and Sustainability Excellence Award at the 2019 awards, among four people on stage with a framed certificate';
const NASDAQ_ALT = 'Aziz Ahmad, Co-Founder of CodersTrust, at the podium of the Nasdaq closing bell ceremony for the US Small Business Administration';

test.describe('Item 1: the two award photographs show only on Aziz Ahmad’s profile', () => {
  test('both captions appear on the profile page, and on no other built page', () => {
    expect(routesWhere((t) => t.includes(SUPPLY_CAPTION))).toEqual([AZIZ]);
    expect(routesWhere((t) => t.includes(NASDAQ_CAPTION))).toEqual([AZIZ]);
  });

  test('the profile page shows both photographs with the Co-Founder alt text (no award claim is added)', () => {
    const html = builtPages().find((p) => p.route === AZIZ)!.html;
    expect(html).toContain(`alt="${SUPPLY_ALT}"`);
    expect(html).toContain(`alt="${NASDAQ_ALT}"`);
    // Owner confirmation (2026-10-26): he received the 2019 award. The bio has no honors list, so none is added.
    expect(visible(html)).not.toContain('Supply Chain Diversity and Sustainability Excellence Award (2019)');
  });

  test('Recognition and In the Field no longer show either photograph (no alt text, no caption)', () => {
    for (const route of ['about/recognition/', 'impact/in-the-field/']) {
      const html = builtPages().find((p) => p.route === route)!.html;
      expect(html, route).not.toContain('Supply Chain Diversity and Sustainability Excellence Awards');
      expect(html, route).not.toContain('Nasdaq closing bell ceremony');
      expect(html, route).not.toContain('recognition/supply-chain-award');
      expect(html, route).not.toContain('legacy-recognition-nasdaq-sba');
    }
  });

  test('the Recognition gallery stays balanced at four captioned photographs', async ({ page }) => {
    await open(page, 'about/recognition/');
    await expect(page.locator('#photos .pg__item')).toHaveCount(4);
  });

  test('the files and their permissions rows are kept', () => {
    const permissions = JSON.parse(readFileSync('src/data/permissions.json', 'utf8')) as { assetId: string; status: string }[];
    for (const id of ['legacy-recognition-nasdaq-sba', 'legacy-recognition-supply-chain-award']) {
      expect(permissions.find((r) => r.assetId === id)?.status, id).toBe('cleared');
    }
    for (const f of ['nasdaq-sba.jpg', 'supply-chain-award.jpg']) {
      expect(() => readFileSync(join('src/assets/images/pages/recognition', f))).not.toThrow();
    }
  });
});

test.describe('Item 2: Her Power is dated 2023–2025', () => {
  test('the Impact cards, the Case Studies index and the case-study eyebrow say "2023–2025"', async ({ page }) => {
    await open(page, 'impact/');
    const eyebrows = (await page.locator('#cases .card .eyebrow').allTextContents()).map(compact);
    expect(eyebrows).toContain('ICT Division / DoICT, Government of Bangladesh; Bangladesh, 2023–2025');
    await open(page, 'impact/case-studies/her-power/');
    expect(compact(await page.locator('.hero__eyebrow').textContent())).toBe('Case Study · ICT Division / Department of ICT (DoICT), Government of Bangladesh, 2023–2025');
  });

  test('no built page still says Her Power ran "from 2023"', () => {
    expect(routesWhere((t) => /Her Power[^.]{0,120}from 2023/.test(t) || t.includes(', from 2023'))).toEqual([]);
  });
});

// WP97 (owner instruction 2026-10-26: NU's own course names): the course is "Cyber Security" everywhere, so this block now pins that spelling.
// tests/wp97.spec.ts holds the full WP97 checks.
test.describe('Item 3: the NU course is spelled Cyber Security in visible text (WP97)', () => {
  test('no built NU page prints the one-word "Cybersecurity" for the course', () => {
    const hits = routesWhere((t) => /Diploma in Cybersecurity|in cybersecurity,|Cybersecurity knowledge|Choose Cybersecurity/.test(t));
    expect(hits).toEqual([]);
  });

  test('the course page keeps its URL slug; its H1 and title say Cyber Security', async ({ page }) => {
    const route = 'programs/nu-postgraduate-diploma/cyber-security/';
    await open(page, route);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('NU Postgraduate Diploma in Cyber Security');
    await expect(page).toHaveTitle(/NU Postgraduate Diploma in Cyber Security/);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toContain('in cyber security');
  });

  test('the Programs menu and the diploma overview name the course "Cyber Security"', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    const html = builtPages().find((p) => p.route === 'programs/nu-postgraduate-diploma/')!.html;
    expect(visible(html)).toContain('Four courses, in digital marketing, information and communication technology (ICT), cyber security and data analytics');
    const labels = await page.locator('#mega-programs .mega__title, #courses h3').allTextContents();
    expect(labels.map(compact)).toContain('Cyber Security');
  });
});

test.describe('Item 4: unchanged items', () => {
  test('"130,000+ learners trained" and the founders line are still on the site', () => {
    expect(routesWhere((t) => t.includes('130,000+'))).not.toEqual([]);
    expect(routesWhere((t) => t.includes('CodersTrust’s founders are Aziz Ahmad and Ferdinand Kjærulff.'))).toEqual(['about/recognition/']);
  });
});

test('WP96 opt-in screenshots of the changed regions at 1280 and 390', async ({ browser }) => {
  const dir = process.env.WP96_SHOTS;
  test.skip(!dir, 'set WP96_SHOTS=<dir> to write screenshots');
  mkdirSync(dir!, { recursive: true });
  const shots: [string, string, string][] = [
    ['about/recognition/', '#photos', 'recognition'],
    ['impact/in-the-field/', '#recognition', 'in-the-field'],
    ['impact/case-studies/her-power/', '.hero', 'her-power'],
    ['impact/', '#cases', 'impact-cards'],
    ['programs/nu-postgraduate-diploma/cyber-security/', '.hero', 'nu-course'],
    ['programs/nu-postgraduate-diploma/', '#courses', 'nu-overview'],
    ['about/team/aziz-ahmad/', '#field', 'aziz-profile'],
  ];
  for (const vp of [DESKTOP, MOBILE]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    try {
      for (const [route, sel, name] of shots) {
        await open(page, route);
        await page.locator(sel).first().scrollIntoViewIfNeeded();
        await page.locator(sel).first().screenshot({ path: join(dir!, `${name}-${vp.width}.png`), animations: 'disabled' });
      }
    } finally {
      await ctx.close();
    }
  }
});
