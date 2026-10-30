import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { open } from './support/browser';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP104 (Sonnet High run 1, kit 70; owner answer of 2026-10-29; the batched Polish items). Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp104.spec.ts --project=chromium`.
 *   - Item 1: AIvolve (owner 2026-10-29: "MOU only"; then "no need to mention 'planned'; list it as an offering under JRW"): PA-07 says MOU; Employers does not list it; JobReady@Work names it as an offering in the Training row only.
 *   - Item 2: the trial sample is "women in Dhaka with at least an SSC, most of them aged 18–35" (not "women aged 18–35").
 *   - Item 3: the SuperKids gallery carries the consent line under its lede.
 *   - Item 4: the NU overview Context heading is "An Affiliated College of National University".
 *   - Item 5: the UNDP YES case study H1 is "UNDP YES: Korail Youth Finding First Jobs, 2017".
 *   - Item 6: Home slide 1 shows the WSDFM training-session photograph; the generic classroom photograph stays on In the Field.
 *   - Item 7: Outcomes 2026 states the 70.8% (34 of 48) sentence once (Results in Brief), not again under "Median Change per Person".
 *   - Item 8: the Home, YouthWIDE and Careers meta descriptions name the full target group, within 155 characters.
 *   - Item 9: the two "1,000 trainees" news posts say "1,000" in H1 and body.
 *   - Item 10: "Last updated" stamps (and dateModified) match the date of each page's latest content change.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const ldJson = async (page: Page) => (await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n');
const meta = async (page: Page, name: string) => (await page.locator(`meta[name="${name}"]`).getAttribute('content')) ?? '';

/** The visible text of a built page (no scripts or styles), entities decoded. */
const visible = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));

/** Every text file in dist (HTML, llms.txt, JSON, XML): the sweep that catches JSON-LD and llms.txt as well as the visible page. */
function distTextFiles(dir = DIST_DIR, out: { file: string; text: string }[] = []): { file: string; text: string }[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) distTextFiles(full, out);
    else if (/\.(html|txt|json|xml|md)$/.test(name)) out.push({ file: full.slice(DIST_DIR.length), text: readFileSync(full, 'utf8') });
  }
  return out;
}

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 1: AIvolve is an offering under JobReady@Work, and the register says it is an MOU', () => {
  const PA07 = 'MOU signed in March 2025 with AIvolve Leadership Dynamics GmbH (Switzerland) for AI leadership and AI-transformation programs';

  test('the register states PA-07 as an MOU signed in March 2025', () => {
    expect(fact('PA-07').text).toBe(PA07);
  });

  test('Employers: "Our Track Record" lists the contract scope and the signed-agreement sentence, and no longer lists AIvolve', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    expect(await page.locator('#guide .pg__list li').evaluateAll((els) => els.map((e) => e.getAttribute('data-fact')))).toEqual(['GV-06', 'SC-11d']);
    expect(compact(await page.locator('main').textContent())).not.toContain('AIvolve');
  });

  test('JobReady@Work: the glance Training row lists it as an offering, "AI leadership and AI-transformation programs with AIvolve.", with no "planned" and no MOU date', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const training = compact(await page.locator('#program-glance .pg__row', { hasText: 'Training' }).first().textContent());
    expect(training).toContain('AI leadership and AI-transformation programs with AIvolve.');
    expect(training).not.toMatch(/planned|March 2025|MOU/);
  });

  test('JobReady@Work: "Employers and Partners We Work With" no longer lists AIvolve (the list implies an active partner)', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    await expect(page.locator('#guide li[data-fact~="PA-07"]')).toHaveCount(0);
    expect(compact(await page.locator('#guide').textContent())).not.toContain('AIvolve');
  });

  test('AIvolve is named on JobReady@Work alone, and no built page, JSON-LD or llms.txt says "Partnership with AIvolve"', () => {
    const hits = distTextFiles().filter((f) => /AIvolve/.test(f.text)).map((f) => f.file);
    expect(hits).toEqual(['/programs/jobready-work/index.html']);
    expect(distTextFiles().filter((f) => /Partnership with AIvolve/.test(f.text)).map((f) => f.file)).toEqual([]);
  });

  test('no sentence that names AIvolve says delivered, trained or completed', () => {
    const problems: string[] = [];
    let seen = 0;
    for (const f of distTextFiles()) {
      const text = f.file.endsWith('.html') ? visible(f.text) : f.text;
      for (const m of text.matchAll(/[^.]*AIvolve[^.]*\./g)) {
        seen += 1;
        if (/delivered|trained|completed/i.test(m[0])) problems.push(`${f.file}: ${m[0].trim()}`);
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(problems).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 2: the trial sample is not "all aged 18–35"', () => {
  test('How to Read This Trial: "Who took part" says women in Dhaka with an SSC or above, most of them aged 18–35', async ({ page }) => {
    await open(page, 'impact/independent-evaluation/');
    const item = page.locator('li[data-fact="RC-01"]', { hasText: 'Who took part.' });
    expect(compact(await item.first().textContent())).toBe('Who took part. Women in Dhaka with a Secondary School Certificate (SSC) or above, most of them aged 18–35.');
  });

  test('the Development Partners FAQ (text and JSON-LD) says the trial studied women in Dhaka with at least an SSC, most of them aged 18–35', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    const NEW = 'The randomized trial studied women in Dhaka with at least a Secondary School Certificate (SSC), most of them aged 18–35, so it does not speak to other groups.';
    expect(compact(await page.locator('main').textContent())).toContain(NEW);
    expect(await ldJson(page)).toContain(NEW);
  });

  test('no built page, JSON-LD or llms.txt says the trial studied "women aged 18–35"', () => {
    const hits = distTextFiles().filter((f) => /studied women aged 18–35|Women aged 18–35 with a Secondary School/i.test(f.text)).map((f) => f.file);
    expect(hits).toEqual([]);
  });

  test('the two evidence-and-fit briefs (components not on a page today) carry the same wording', () => {
    const impact = readFileSync(new URL('../src/components/pages/impact/FitBrief.astro', import.meta.url), 'utf8');
    const partners = readFileSync(new URL('../src/components/pages/partners/FitBrief.astro', import.meta.url), 'utf8');
    expect(impact).toContain('<dd>Women in Dhaka with a Secondary School Certificate (SSC) or above, most of them aged 18–35.</dd>');
    expect(partners).toContain("const population = 'women in Dhaka with a Secondary School Certificate (SSC) or above, most of them aged 18–35';");
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 3: SuperKids gallery consent line', () => {
  const NOTE = 'Photographs are used with the consent of those pictured or their guardians.';

  test('the gallery carries the consent line directly under its lede, before the photographs', async ({ page }) => {
    await open(page, 'programs/superkids/');
    const header = page.locator('#in-the-field header').first();
    await expect(header.locator('p', { hasText: NOTE })).toHaveCount(1);
    const order = await header.evaluate((h) => Array.from(h.children).map((c) => (c.textContent ?? '').replace(/\s+/g, ' ').trim()));
    expect(order.at(-2)).toBe('Workshops, certificate ceremonies and school agreements, in photographs.');
    expect(order.at(-1)).toBe(NOTE);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 4: NU overview Context heading', () => {
  const H = 'An Affiliated College of National University';

  test('the Context band is headed "An Affiliated College of National University" in Title Case', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    await expect(page.locator('#guide h2')).toHaveText(H);
    expect(H).toBe(titleCase(H));
  });

  test('no built page still says "Delivered with National University"', () => {
    expect(builtPages().filter((p) => p.html.includes('Delivered with National University')).map((p) => p.route)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 5: UNDP YES case study H1', () => {
  const H = 'UNDP YES: Korail Youth Finding First Jobs, 2017';

  test('the H1 and the JSON-LD headline read "UNDP YES: Korail Youth Finding First Jobs, 2017"', async ({ page }) => {
    await open(page, 'impact/case-studies/undp-yes-korail/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(H);
    expect(await ldJson(page)).toContain(`"headline":"${H}"`);
  });

  test('the heading is in Title Case, and no built page still says "Korail Youth into Paid Work"', () => {
    expect(H).toBe(titleCase(H));
    expect(distTextFiles().filter((f) => f.text.includes('Korail Youth into Paid Work')).map((f) => f.file)).toEqual([]);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 6: Home slide 1 photograph', () => {
  const WSDFM_ALT = 'Women trainees and a CodersTrust Bangladesh banner at a WSDFM training session';
  const GENERIC_ALT = 'Girls and women learners working at computers in a bright classroom';

  test('slide 1 shows the WSDFM training-session photograph, not the generic classroom photograph', async ({ page }) => {
    await open(page, '');
    const img = page.locator('[data-hs-slide]').first().locator('img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('alt', WSDFM_ALT);
    await expect(img).toHaveAttribute('data-asset', 'case-wsdfm-training-group');
  });

  test('the generic classroom photograph is no longer on Home, and stays on In the Field', async ({ page }) => {
    await open(page, '');
    await expect(page.locator(`img[alt="${GENERIC_ALT}"]`)).toHaveCount(0);
    await open(page, 'impact/in-the-field/');
    await expect(page.locator(`img[alt="${GENERIC_ALT}"]`).first()).toHaveCount(1);
  });
});

test.describe('WP104 item 6 (owner reframing, 2026-10-29): the slide 1 photograph is framed so the faces sit clear of the ">4×" card at 1280', () => {
  // Where a fraction of the source photograph (0 = top, 1 = bottom) lands on screen, whatever object-position and transform the slide gives the image.
  const mapSourceY = (page: Page, fractions: number[]) =>
    page.evaluate((fs) => {
      const img = document.querySelector('[data-hs-slide]')!.querySelector('img')!;
      const box = img.parentElement!.getBoundingClientRect();
      const cs = getComputedStyle(img);
      const W = img.offsetWidth;
      const H = img.offsetHeight;
      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const h = img.naturalHeight * scale;
      const posY = parseFloat(cs.objectPosition.split(' ')[1]) / 100;
      const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
      const oy = parseFloat(cs.transformOrigin.split(' ')[1]);
      return {
        zoom: m.a,
        frame: { top: box.top, height: box.height },
        card: (() => { const c = document.querySelector('[data-hs-slide]')!.querySelector('.hs__proof')!.getBoundingClientRect(); return { top: c.top }; })(),
        ys: fs.map((f) => box.top + oy + ((H - h) * posY + f * h - oy) * m.d + m.f),
      };
    }, fractions);
  // Measured on the source photograph (977 × 568): the top of the back row's heads is at about 0.34 of its height; the faces of the two upper rows end at about 0.62.
  const HEAD_TOP = 0.34;
  const FACE_LINE = 0.62;

  test('at 1280 the lowest of the upper rows’ faces ends above the proof card, and the heads start inside the frame with little ceiling above them', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await open(page, '');
    await page.locator('.hs-shell').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const i = document.querySelector('[data-hs-slide] img') as HTMLImageElement | null; return !!i && i.complete && i.naturalWidth > 0; });
    const r = await mapSourceY(page, [HEAD_TOP, FACE_LINE]);
    expect(r.zoom, 'the slide is zoomed in on the group').toBeGreaterThan(1.1);
    expect(r.ys[1], 'faces end above the card').toBeLessThan(r.card.top - 4);
    expect(r.ys[0], 'the heads are in the frame').toBeGreaterThanOrEqual(r.frame.top);
    expect(r.ys[0] - r.frame.top, 'little ceiling above the heads').toBeLessThan(r.frame.height * 0.12);
  });

  test('at 390 the photograph keeps its plain centered crop (the proof card is below the photograph there)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, '');
    const img = page.locator('[data-hs-slide]').first().locator('img');
    expect(await img.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    expect(await img.evaluate((el) => getComputedStyle(el).objectPosition)).toBe('50% 50%');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 7: Outcomes 2026 states the 70.8% sentence once', () => {
  test('"Median Change per Person" keeps its tile and no longer repeats the 70.8% (34 of 48) sentence; Results in Brief keeps it', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    await expect(page.locator('#income [data-fact="OC-03c"] h3')).toHaveText('Median Change per Person');
    await expect(page.locator('#income [data-fact="OC-02"]')).toHaveCount(0);
    expect(compact(await page.locator('#income').textContent())).not.toContain('34 of 48');
    await expect(page.locator('#summary [data-fact="OC-02"]')).toHaveCount(1);
    expect(compact(await page.locator('#summary [data-fact="OC-02"]').textContent())).toContain('70.8%');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 8: meta descriptions name the full target group', () => {
  const CASES = [
    {
      route: '',
      name: 'Home',
      text: 'CodersTrust trains and mentors educated, unemployed and underemployed youth for digital work, with evidence from a randomized trial of its WSDFM program.',
    },
    {
      route: 'programs/youthwide/',
      name: 'YouthWIDE',
      text: 'YouthWIDE trains educated, unemployed and underemployed youth for paid digital work: co-funded cohorts designed for three regions, with a 2030 aim.',
    },
    {
      route: 'careers/',
      name: 'Careers',
      text: 'Join CodersTrust and help prepare educated, unemployed and underemployed young people for paid digital work. How to apply, and speculative applications.',
    },
  ];
  for (const c of CASES) {
    test(`${c.name}: the description is "${c.text.slice(0, 40)}…", within 155 characters, and the social descriptions agree`, async ({ page }) => {
      await open(page, c.route);
      const description = await meta(page, 'description');
      expect(description).toBe(c.text);
      expect(description.length).toBeLessThanOrEqual(155);
      expect(await page.locator('meta[property="og:description"]').getAttribute('content')).toBe(c.text);
      expect(await ldJson(page)).toContain(c.text);
      expect(description).toContain('educated, unemployed and underemployed');
    });
  }
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 9: "1,000" in the two 1,000-trainees news posts', () => {
  const POSTS = [
    { route: 'news/1000-trainees-sheikh-kamal-ict-incubator-training/', h1: '1,000 People to Be Trained in High-Demand IT Skills | Sheikh Kamal ICT Incubator Training', body: 'CodersTrust will provide training to 1,000 people in high-demand IT skills.' },
    { route: 'news/1000-trainees-enhancing-digital-government-economy-edge/', h1: 'Contract to Train 1,000 Youth | Enhancing Digital Government & Economy (EDGE)', body: 'CodersTrust will provide training to 1,000 youths on digital and disruptive 4IR technologies.' },
  ];
  for (const p of POSTS) {
    test(`${p.route}: the H1 and the body say 1,000, never 1000`, async ({ page }) => {
      await open(page, p.route);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(p.h1);
      const main = compact(await page.locator('main').textContent());
      expect(main).toContain(p.body);
      expect(main).not.toMatch(/\b1000\b/);
    });

    // Item 10 also covers "any page this WP changes": as with the Her Power post (tests/wp86.spec.ts), an edited archived post carries the day of the edit.
    test(`${p.route}: the archive banner says "updated October 29, 2026" and the JSON-LD dateModified is 2026-10-29`, async ({ page }) => {
      await open(page, p.route);
      await expect(page.locator('.archive-banner')).toContainText(/updated October (29|30), 2026/); // WP127 re-dated the EDGE post to October 30 (serial-comma sweep)
      expect(await ldJson(page)).toMatch(/"dateModified"\s*:\s*"2026-10-(29|30)"/);
    });
  }
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP104 item 10: "Last updated" stamps match each page’s latest content change', () => {
  // Dates: TalentLEAP 2026-10-29 (WP112: its FAQ answer and pipeline step changed on 29 October; it was 2026-10-28 from WP98 to WP101);
  // the NU overview and course pages, JobReady@Campus and JobReady Platform 2026-10-29 (WP102, 29 October: NU learners "being onboarded", the affiliated-college wording);
  // every page this WP changes (YouthWIDE, JobReady@Work, SuperKids, Outcomes 2026, Independent Evaluation, the NU overview, the UNDP YES case study) 2026-10-29.
  const STAMPED = [
    { route: 'our-model/talentleap/', selector: '.lf-updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'our-model/jobready-platform/', selector: '.lf-updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/nu-postgraduate-diploma/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/nu-postgraduate-diploma/cyber-security/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/nu-postgraduate-diploma/data-analytics/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/nu-postgraduate-diploma/digital-marketing/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/nu-postgraduate-diploma/ict/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/jobready-campus/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/youthwide/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/jobready-work/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'programs/superkids/', selector: '.updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' },
    { route: 'impact/outcomes-2026/', selector: '.lf-updated', text: 'Source snapshot: October 2026 · Last updated October 29, 2026', iso: '2026-10-29' },
    { route: 'impact/independent-evaluation/', selector: '.lf-updated', text: 'Last updated October 31, 2026', iso: '2026-10-31' }, // WP134: WP133 changed its text
  ];
  for (const s of STAMPED) {
    test(`${s.route} reads "${s.text}" and its JSON-LD dateModified is ${s.iso}`, async ({ page }) => {
      await open(page, s.route);
      expect(compact(await page.locator(s.selector).first().textContent())).toBe(s.text);
      expect(await ldJson(page)).toMatch(new RegExp(`"dateModified"\\s*:\\s*"${s.iso}"`));
    });
  }

  test('the UNDP YES case study’s JSON-LD dateModified is 2026-10-31 (its heading changed that day); the other case studies keep theirs', async ({ page }) => {
    await open(page, 'impact/case-studies/undp-yes-korail/');
    expect(await ldJson(page)).toMatch(/"dateModified"\s*:\s*"2026-10-31"/);
    await open(page, 'impact/case-studies/her-power/');
    expect(await ldJson(page)).toMatch(/"dateModified"\s*:\s*"2026-10-10"/);
  });
});
