import { mkdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { listPages, type SitePage } from './support/pages';

/**
 * WP89 behaviors (Opus Max run 1 review, Minor and Polish findings 2 to 12 of o-max-1.md). Retrospective coverage: the owner exempted this project from
 * test-first work, so these tests were written after the change. Run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp89.spec.ts --project=chromium`. Set WP89_SHOTS=<dir> to also write
 * screenshots of the changed regions at 1280 and 390 (the screenshot test checks for horizontal overflow at 390).
 *   - 1 (finding 2): every route email whose page asks for two suitable times asks for them in its prefilled body; Investors asks for two, not one;
 *   - 2 (finding 3): the Universities problem heading reads "Degrees Alone Are Not Turning into Jobs";
 *   - 3 (finding 4): the photo caption on Home and JobReady@Campus says the photographs are from programs and offices;
 *   - 4 (finding 5): the SKIT and EDGE news titles and the SKIT teaser read as contract scope, and the SKIT teaser names Barishal;
 *   - 5 (finding 6): Careers scopes the outcome principle to youth-employment programs, as About does;
 *   - 6 (finding 7): Governance and Accessibility carry the date of their last content change;
 *   - 7 (finding 9): the Privacy quotes and the RMSTU and UPEACE teasers use American punctuation and curly quotes, and "San José";
 *   - 8 (finding 10): the Aziz Ahmad meta description attaches the appositive to Aziz Ahmad;
 *   - 9 (finding 12): the NU Digital Marketing module names read "(Practical)", "Google Ads and PPC" and "Google Ads, PPC and SEM Specialist".
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();

/** The built HTML of one inventory page, by site-relative route with a leading slash. */
const htmlFor = (route: string): string => {
  const p: SitePage | undefined = listPages().find((x) => x.route === route);
  if (!p) throw new Error(`no built page for ${route}`);
  return readFileSync(p.file, 'utf8');
};

const metaDescription = (html: string): string => /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
const titleOf = (html: string): string => /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '';
const decodeAmp = (s: string): string => s.replace(/&amp;/g, '&');

/** Each mailto: link on a built page, with its decoded subject and body. */
const mailtos = (html: string): { subject: string; body: string }[] =>
  [...html.matchAll(/href="(mailto:[^"]+)"/g)].map((m) => {
    const href = decodeAmp(m[1]);
    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    return { subject: params.get('subject') ?? '', body: params.get('body') ?? '' };
  });

// ---- Item 1: route emails ask for two suitable times ------------------------------------------------------------------------------

test.describe('Item 1: route emails ask for two suitable times', () => {
  const routeEmails: [route: string, subjectStart: string][] = [
    ['/partner-with-us/foundations/', 'Funding partnership'],
    ['/partner-with-us/foundations/', 'YouthWIDE cohort grant'],
    ['/partner-with-us/foundations/', 'JobReady platform grant'],
    ['/programs/youthwide/', 'YouthWIDE co-funding in Bangladesh'],
    ['/partner-with-us/universities/', 'JobReady@Campus inquiry'],
    ['/programs/jobready-campus/', 'JobReady@Campus inquiry'],
    ['/partner-with-us/employers/', 'JobReady@Work inquiry'],
    ['/programs/jobready-work/', 'JobReady@Work inquiry'],
    ['/partner-with-us/employers/', 'Talent request'],
    ['/partner-with-us/investors/', 'Introduction call request'],
  ];

  for (const [route, subjectStart] of routeEmails) {
    test(`${route} "${subjectStart}" prefilled body asks for two suitable times for a call`, () => {
      const email = mailtos(htmlFor(route)).find((m) => m.subject.startsWith(subjectStart));
      expect(email, `${route}: mailto with subject starting "${subjectStart}"`).toBeDefined();
      expect(email!.body).toContain('Two suitable times for a call: ');
    });
  }

  test('Investors no longer asks for a single preferred time', () => {
    const email = mailtos(htmlFor('/partner-with-us/investors/')).find((m) => m.subject.startsWith('Introduction call request'));
    expect(email!.body).not.toContain('Preferred time for an introduction call');
  });
});

// ---- Item 2: Universities problem heading ----------------------------------------------------------------------------------------

test.describe('Item 2: Universities problem heading', () => {
  test('the Challenge heading reads "Degrees Alone Are Not Turning into Jobs"', async ({ page }) => {
    await open(page, 'partner-with-us/universities/');
    await expect(page.locator('h2', { hasText: 'Degrees Alone Are Not Turning into Jobs' })).toHaveCount(1);
    await expect(page.locator('body')).not.toContainText('Degrees Are Not Turning into Jobs');
  });
});

// ---- Item 3: photo caption on Home and JobReady@Campus ---------------------------------------------------------------------------

test.describe('Item 3: photo caption covers programs and offices', () => {
  for (const route of ['/', '/programs/jobready-campus/']) {
    test(`${route} captions its photographs as programs and offices`, () => {
      const html = htmlFor(route);
      expect(html, route).toContain('Photographs are from CodersTrust programs and offices, shown for context.');
      expect(html, route).not.toContain('Photographs are from past CodersTrust programs');
    });
  }
});

// ---- Item 4: SKIT and EDGE news ---------------------------------------------------------------------------------------------------

test.describe('Item 4: SKIT and EDGE news read as contract scope', () => {
  const skit = '/news/1000-trainees-sheikh-kamal-ict-incubator-training/';
  const edge = '/news/1000-trainees-enhancing-digital-government-economy-edge/';

  test('SKIT title and teaser say contract to train, and the teaser names Barishal', () => {
    const html = htmlFor(skit);
    expect(titleOf(html)).toContain('Sheikh Kamal ICT: Contract to Train 1,000');
    expect(metaDescription(html)).toContain('CodersTrust is contracted to train 1,000 people in high-demand IT skills');
    expect(metaDescription(html)).toContain('in Barishal.');
    expect(metaDescription(html)).not.toContain('across Bangladesh');
  });

  test('EDGE title reads contract to train, not 1000 Trainees', () => {
    const html = htmlFor(edge);
    expect(titleOf(html)).toContain('EDGE: Contract to Train 1,000 Youth');
    expect(titleOf(html)).not.toContain('1000 Trainees');
  });
});

// ---- Item 5: Careers principle ----------------------------------------------------------------------------------------------------

test.describe('Item 5: Careers scopes the outcome principle', () => {
  test('Careers reads "We judge youth-employment programs by whether young people end up working and earning"', async ({ page }) => {
    await open(page, 'careers/');
    await expect(page.locator('body')).toContainText(
      'We judge youth-employment programs by whether young people end up working and earning, not by how many attended.',
    );
    await expect(page.locator('body')).not.toContainText('Our programs are judged by whether young people end up working');
  });
});

// ---- Item 6: Governance and Accessibility dates -----------------------------------------------------------------------------------

test.describe('Item 6: legal page dates match their last content change', () => {
  test('Governance reads "Last updated October 24, 2026"', async ({ page }) => {
    await open(page, 'about/governance/');
    expect(compact(await page.locator('.gov-updated').textContent())).toBe('Last updated October 24, 2026');
    await expect(page.locator('body')).not.toContainText('Last updated October 10, 2026');
  });

  test('Accessibility reads "Last updated October 23, 2026"', async ({ page }) => {
    await open(page, 'accessibility/');
    await expect(page.locator('body')).toContainText('Last updated October 23, 2026');
    await expect(page.locator('body')).not.toContainText('Last updated October 10, 2026');
  });
});

// ---- Item 7: Privacy quotes and RMSTU and UPEACE teasers -------------------------------------------------------------------------

test.describe('Item 7: American punctuation and curly quotes in quoted phrases', () => {
  test('Privacy puts the comma inside the closing curly quote', () => {
    expect(htmlFor('/privacy-policy/')).toContain('Buttons that say “Request a Discovery Session,” “Ask About Due Diligence” and similar');
  });

  test('the RMSTU teaser and meta read “Be Useful.” inside the curly quotes', () => {
    const html = htmlFor('/news/coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation/');
    expect(metaDescription(html)).toContain('telling graduating Computer Science students to “Be Useful.”');
    expect(metaDescription(html)).not.toContain('‘Be Useful’');
  });

  test('the UPEACE MOU teaser and meta write San José', () => {
    const html = htmlFor('/news/coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration/');
    expect(metaDescription(html)).toContain('sign a partnership in San José, Costa Rica');
    expect(metaDescription(html)).not.toContain('San Jose');
  });
});

// ---- Item 8: Aziz Ahmad meta description ------------------------------------------------------------------------------------------

test.describe('Item 8: Aziz Ahmad meta description', () => {
  test('the appositive attaches to Aziz Ahmad and the text is within 155 characters', () => {
    const meta = metaDescription(htmlFor('/about/team/aziz-ahmad/'));
    expect(meta).toBe(
      'Aziz Ahmad, a Bangladeshi-American business leader, is the Co-Founder and Chairman of CodersTrust, which he co-founded in 2014 with Ferdinand Kjærulff.',
    );
    expect(meta.length).toBeLessThanOrEqual(155);
  });
});

// ---- Item 9: NU Digital Marketing module names -----------------------------------------------------------------------------------

test.describe('Item 9: NU Digital Marketing module names', () => {
  test('the module list and the career list use the new names', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/digital-marketing/');
    const body = page.locator('body');
    await expect(body).toContainText('Search Engine Optimization (SEO) (Practical)');
    await expect(body).toContainText('Google Ads and PPC');
    await expect(body).toContainText('Google Ads, PPC and SEM Specialist');
    await expect(body).not.toContainText('AdWords');
  });

  test('no built page still names AdWords or the other retired wording', () => {
    const retired = [
      'AdWords',
      'Degrees Are Not Turning into Jobs',
      'Photographs are from past CodersTrust programs',
      'Our programs are judged by whether young people',
      'Preferred time for an introduction call',
      'Sheikh Kamal ICT Incubator: 1,000 IT Trainees',
      'EDGE: Training 1,000 Youth in 4IR Technologies',
      'Bangladeshi-American business leader who founded it',
    ];
    const hits: string[] = [];
    for (const p of listPages()) {
      const html = readFileSync(p.file, 'utf8');
      for (const s of retired) if (html.includes(s)) hits.push(`${p.route}: ${s}`);
    }
    expect(hits).toEqual([]);
  });
});

// ---- Screenshots of changed regions (opt-in) and mobile overflow ------------------------------------------------------------------

const SHOT_ROUTES: [slug: string, route: string][] = [
  ['home', '/'],
  ['universities', '/partner-with-us/universities/'],
  ['jobready-campus', '/programs/jobready-campus/'],
  ['careers', '/careers/'],
  ['governance', '/about/governance/'],
  ['accessibility', '/accessibility/'],
  ['privacy', '/privacy-policy/'],
  ['aziz-ahmad', '/about/team/aziz-ahmad/'],
  ['nu-digital-marketing', '/programs/nu-postgraduate-diploma/digital-marketing/'],
  ['skit-news', '/news/1000-trainees-sheikh-kamal-ict-incubator-training/'],
  ['edge-news', '/news/1000-trainees-enhancing-digital-government-economy-edge/'],
];

test.describe('Screenshots and mobile overflow', () => {
  for (const [slug, route] of SHOT_ROUTES) {
    test(`${slug} at 1280 and 390 has no horizontal overflow at 390`, async ({ page }) => {
      const dir = process.env.WP89_SHOTS;
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const vp of [DESKTOP, MOBILE]) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await open(page, route.replace(/^\//, ''));
        await scrollThrough(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (vp === MOBILE) expect(overflow, `${slug} horizontal overflow at 390`).toBeLessThanOrEqual(0);
        if (dir) {
          mkdirSync(dir, { recursive: true });
          await page.screenshot({ path: `${dir}/${slug}-${vp.width}.png`, fullPage: true });
        }
      }
    });
  }
});
