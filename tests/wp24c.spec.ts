import { expect, test, type Page } from '@playwright/test';
import { open } from './support/browser';

/**
 * WP24c behaviors (review round 5, cycle 4): Programs, Our Model, About, Careers and Contact.
 * Each test expresses one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp24c.spec.ts --project=chromium`).
 */

const headingsOf = (page: Page) => page.locator('main h2, main h3').allInnerTexts();

test.describe('YouthWIDE (/programs/youthwide/)', () => {
  test('one "Choose Your Entry Point" chooser holds the page-end actions, with one primary button', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const band = page.locator('section#entry-point');
    await expect(band.getByRole('heading', { level: 2, name: 'Choose Your Entry Point' })).toBeVisible();
    await expect(band.locator('#cta')).toHaveCount(1);
    await expect(band.locator('#cta-governments')).toHaveCount(1);
    // one primary button in the whole chooser; the briefing is a text link
    await expect(band.locator('.btn--primary')).toHaveCount(1);
    await expect(band.locator('#cta-governments .btn')).toHaveCount(0);
    await expect(band.locator('#cta-governments a.link').first()).toBeVisible();
    // WP39 (cycle-16 review): the two near-identical session agendas are ONE line under both cards (tests/wp39.spec.ts holds its wording)
    await expect(band.locator('[data-session-agenda]')).toHaveCount(1);
    await expect(band.locator('#cta [data-session-agenda], #cta-governments [data-session-agenda]')).toHaveCount(0);
  });

  test('one shared "What Happens Next" with two short role-specific actions', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const titles = await headingsOf(page);
    expect(titles.filter((t) => /What Happens Next/i.test(t))).toEqual(['What Happens Next']);
    const next = page.locator('section#next-steps');
    await expect(next.locator('ul li strong')).toHaveText(['Governments.', 'Funders.']);
  });

  // WP48 (cycle-23 review): the hero's two links back to audience pages ("For Development Partners", "For Governments") are gone; the ministry briefing stays as the one text link beside the one button (tests/wp48.spec.ts)
  test('the hero holds one primary button; the ministry briefing is the one text link below it', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const hero = page.locator('#hero');
    await expect(hero.locator('.btn--primary')).toHaveCount(1);
    const routes = hero.locator('.hero__actions nav a.link');
    await expect(routes).toHaveCount(1);
  });

  test('WP30d: the Bangladesh initiative is one band (#governments, headed as the delivery base and its 2030 aim; WP53: "Reference Country" became "Delivery Base") and the 2030 aim is the only Target-tagged tile', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const band = page.locator('section#governments');
    await expect(band.getByRole('heading', { level: 2 })).toHaveText('Bangladesh: Delivery Base and 2030 Aim');
    await expect(band.locator('.status-tag', { hasText: 'Target' })).toHaveCount(1);
    await expect(page.locator('main .status-tag', { hasText: 'Target' })).toHaveCount(1);
    await expect(band).toContainText('not a delivered figure');
  });

  // WP48 (cycle-23 review): the Cost of Waiting band (it had dropped the 72% employer card and kept two evidence cards) is gone from YouthWIDE; Home carries the shared band (tests/wp48.spec.ts)
  test('the page has no Cost of Waiting band', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#cost')).toHaveCount(0);
    await expect(page.locator('main', { hasText: 'The Cost of Waiting' })).toHaveCount(0);
  });

  // WP48 (cycle-23 review): "What Success Looks Like" ("Young People Earning, Locally and Globally") is gone from YouthWIDE, so the track record is followed by the delivery model (tests/wp41.spec.ts, tests/wp48.spec.ts)
  test('the track record comes before the delivery model, and the page has no "what success looks like" band', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const titles = await headingsOf(page);
    const record = titles.findIndex((t) => /We Have Built This Path/i.test(t));
    const model = titles.findIndex((t) => /One Delivery Model, from Selection to Paid Work/i.test(t));
    expect(record).toBeGreaterThan(-1);
    expect(model).toBeGreaterThan(record);
    expect(titles.findIndex((t) => /Young People Earning, Locally and Globally/i.test(t))).toBe(-1);
  });

  test('the FAQ is trimmed to five decision questions, the national-scale answer leading with Her Power in two short paragraphs', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const items = page.locator('#faq details');
    await expect(items).toHaveCount(5);
    const scale = items.filter({ hasText: 'Can You Deliver at National Scale?' });
    await expect(scale.locator('p').first()).toContainText(/^Her Power/);
    await expect(scale.locator('p')).toHaveCount(2);
  });
});

test.describe('Programs hub (/programs/)', () => {
  test('a routing line sends institutions to Partner with Us', async ({ page }) => {
    await open(page, 'programs/');
    const line = page.locator('#programs-grid .hub__more');
    await expect(line).toContainText('Deciding as an institution?');
    await expect(line.getByRole('link', { name: 'Start with Partner with Us.' })).toHaveAttribute('href', /\/partner-with-us\/$/);
  });

  test('program cards link their matching partner pages', async ({ page }) => {
    await open(page, 'programs/');
    const card = (title: string) => page.locator('#programs-grid article', { has: page.getByRole('heading', { name: title }) });
    await expect(card('YouthWIDE').getByRole('link', { name: 'For Governments' })).toHaveAttribute('href', /partner-with-us\/governments\/$/);
    await expect(card('YouthWIDE').getByRole('link', { name: 'For Development Partners' })).toHaveAttribute('href', /partner-with-us\/development-partners\/$/);
    await expect(card('JobReady@Campus').getByRole('link', { name: 'For Universities' })).toHaveAttribute('href', /partner-with-us\/universities\/$/);
    await expect(card('JobReady@Work').getByRole('link', { name: 'For Employers' })).toHaveAttribute('href', /partner-with-us\/employers\/$/);
  });

  test('the reach band reads "Reach Since 2014" and follows the evidence', async ({ page }) => {
    await open(page, 'programs/');
    await expect(page.getByRole('heading', { level: 2, name: 'Reach Since 2014' })).toBeVisible();
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(order.indexOf('reach')).toBeGreaterThan(order.indexOf('proof-band'));
  });
});

test.describe('Other program pages', () => {
  test('JobReady@Work: the final CTA reads "Plan Your First Team Program" and the broader evidence is one link', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    await expect(page.locator('#cta .btn--primary')).toHaveText(/Plan Your First Team Program/);
    // WP25s: the measurable outcome names what is measured; "checked against the measures you set" stays with the progress evaluation (WP30d: four blocks, not seven steps).
    await expect(page.locator('#mechanism')).toContainText('toward team capability in the digital and AI tasks defined in the needs assessment.');
  });

  test('SuperKids: the agreement disclaimer is not repeated in the glance table or the partners band, and the gallery shows four photos first', async ({ page }) => {
    await open(page, 'programs/superkids/');
    const count = (await page.locator('main').innerText()).match(/not delivered reach/g)?.length ?? 0;
    expect(count).toBeLessThanOrEqual(3);
    await expect(page.locator('#in-the-field figure:visible')).toHaveCount(4);
  });

  test('JobReady@Campus: a short problem band opens the page body', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    await expect(page.getByRole('heading', { level: 2, name: 'Capable Students Still Struggle to Find Work' })).toBeVisible();
  });
});

test.describe('NU Postgraduate Diploma', () => {
  test('the challenge heading no longer claims a degree is not producing offers', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    await expect(page.getByRole('heading', { level: 2, name: 'A Degree Alone May Not Be Enough for Today’s Digital Jobs' })).toBeVisible();
  });

  test('"Ready to Apply?" and the after-apply steps are one band, with one call label', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/');
    const cta = page.locator('section#cta');
    await expect(cta.getByRole('heading', { level: 2, name: 'Ready to Apply?' })).toBeVisible();
    await expect(cta.locator('ol.after li')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'What Happens After You Apply' })).toHaveCount(0);
    const calls = page.locator('.hero__actions a[href^="tel:"], #cta a[href^="tel:"]');
    expect(await calls.count()).toBe(2);
    for (const text of await calls.allInnerTexts()) expect(text.replace(/ /g, ' ')).toMatch(/Call Admissions/);
  });
});

test.describe('Instructors and Mentors (/about/mentors/)', () => {
  // WP25s: the single IELTS mentor joined content writing, so no category is a band of one card.
  const categories = ['Digital Marketing, Content and Language', 'Design and Video', 'Web Development and AI', 'Accounting and Spreadsheets'];

  test('each category is an H2 and each person an H3, with Md. Hazrat Ali Nahid under accounting', async ({ page }) => {
    await open(page, 'about/mentors/');
    for (const c of categories) await expect(page.getByRole('heading', { level: 2, name: c })).toBeVisible();
    const group = (name: string) => page.locator('.mn-group', { has: page.getByRole('heading', { level: 2, name }) });
    await expect(group('Accounting and Spreadsheets').getByRole('heading', { level: 3, name: 'Md. Hazrat Ali Nahid' })).toHaveCount(1);
    await expect(group('Digital Marketing, Content and Language').getByRole('heading', { level: 3, name: 'Md. Hazrat Ali Nahid' })).toHaveCount(0);
    // people are H3 only; no category is an H3
    const h3s = await page.locator('#mentors h3').allInnerTexts();
    for (const c of categories) expect(h3s).not.toContain(c);
  });

  test('On This Page has a jump link to every category', async ({ page }) => {
    await open(page, 'about/mentors/');
    const nav = page.locator('#on-this-page');
    for (const c of categories) {
      const link = nav.getByRole('link', { name: c });
      await expect(link).toHaveCount(1);
      const href = (await link.getAttribute('href'))!;
      await expect(page.locator(href)).toHaveText(c);
    }
  });

  test('Become a Mentor asks for experience and availability from anyone in a digital field (WP30e shortened the field list)', async ({ page }) => {
    await open(page, 'about/mentors/');
    await expect(page.locator('#mentor-cta')).toContainText(/digital field/i);
    await expect(page.locator('#mentor-cta')).toContainText(/experience and availability/i);
  });
});

test.describe('About, Governance, Recognition, Careers and Contact', () => {
  test('About: the hero holds no primary button, the tracking line is scope-aware and the enrollments tile carries no split line', async ({ page }) => {
    await open(page, 'about/');
    await expect(page.locator('main .hero .btn--primary')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'See Our Impact' }).first()).toBeVisible();
    await expect(page.locator('#how-we-work')).toContainText('As agreed in the program scope');
    await expect(page.locator('#how-we-work')).not.toContainText('see progress in reports every month');
    // WP50 (cycle-25 review, item 21) gave the tile "Including 111,268 direct enrollments and 40,043 through courseware."; WP65 (cycle-37 review) took the line off About (tests/wp65.spec.ts)
    await expect(page.locator('#glance')).not.toContainText('Including 111,268 direct enrollments');
    await expect(page.locator('#glance')).toContainText('150,000+');
  });

  test('Governance: leadership is two sentences, reporting is scope-aware, the FAQ is renamed and On This Page labels equal the H2s', async ({ page }) => {
    await open(page, 'about/governance/');
    // WP30e: the two leaders are shown once, as cards (name and role), not repeated in a lead sentence; the anti-fraud cards repeated the contracting panel and the safeguarding section.
    await expect(page.locator('#leadership')).toContainText('Aziz Ahmad');
    await expect(page.locator('#leadership')).toContainText('CEO, CodersTrust Bangladesh');
    await expect(page.locator('#evidence')).toContainText('As agreed in the program scope, funders receive monthly reports');
    await expect(page.locator('#anti-fraud')).toHaveCount(0);
    await expect(page.locator('#safeguarding')).toContainText('consent, protected records, grievance handling, harassment and fraud response');
    await expect(page.locator('#faq')).toContainText('as agreed in the program scope, we plan a baseline');
    await expect(page.getByRole('heading', { level: 2, name: 'Common Due-Diligence Questions' })).toBeVisible();
    await expect(page.locator('#faq summary', { hasText: 'How Do You Track and Verify Outcomes?' })).toHaveCount(1);
    const links = page.locator('#on-this-page a[href^="#"]');
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(7);
    for (let i = 0; i < n; i++) {
      const href = (await links.nth(i).getAttribute('href'))!;
      const label = (await links.nth(i).innerText()).trim();
      const heading = (await page.locator(`${href} h2`).first().innerText()).trim();
      expect(label, href).toBe(heading);
    }
  });

  test('Recognition: appointments and honors, one primary hero button, a University Partnership eyebrow and a two-sentence founder note', async ({ page }) => {
    await open(page, 'about/recognition/');
    await expect(page.locator('main .hero')).toContainText('has received appointments and honors');
    await expect(page.locator('main .hero .btn--primary')).toHaveCount(1);
    await expect(page.locator('main .hero .btn--primary')).toContainText('Media Inquiries');
    await expect(page.locator('#endorsements .eyebrow').first()).toHaveText('University Partnership');
    await expect(page.locator('#coverage')).toContainText('as a co-founder. CodersTrust’s founders are');
  });

  test('Careers: the hiring status sits in the hero above the button, and the equal-opportunity heading is "We Judge People on Merit"', async ({ page }) => {
    await open(page, 'careers/');
    await expect(page.locator('main .hero')).toContainText('not hiring for specific roles right now');
    await expect(page.getByRole('heading', { level: 2, name: 'We Judge People on Merit' })).toBeVisible();
    await expect(page.locator('#eoe .cr-eoe')).toContainText('we judge people on their work and merit');
  });

  test('Contact: no hero button, due-diligence under Partner or Fund, a Study or Contact the Media group and an NU applicant route', async ({ page }) => {
    await open(page, 'contact/');
    await expect(page.locator('main .hero .btn')).toHaveCount(0);
    const group = (name: string) => page.locator('.ct-group', { has: page.getByRole('heading', { level: 3, name }) });
    await expect(group('Partner or Fund').getByRole('heading', { level: 4, name: 'Due-Diligence Teams' })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 3, name: 'Study or Contact the Media' })).toBeVisible();
    await expect(group('Study or Contact the Media').getByRole('heading', { level: 4, name: 'NU Postgraduate Diploma Applicants' })).toHaveCount(1);
    // WP42 (cycle-19 review): the group is "Educate, Hire or Train" (it also holds the universities and the schools)
    await expect(group('Educate, Hire or Train')).toContainText('Connect with job-ready digital talent through the placement team.');
    await expect(page.locator('#next')).toContainText('Public procurement follows the agency’s own timeline.');
  });

  test('Team: "and" replaces "&" in role tags, TVET is spelled out and a careers link follows', async ({ page }) => {
    await open(page, 'about/team/');
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/Co-Founder & Chairman|Project & Training|Finance & Accounts/);
    expect(text).toContain('Co-Founder and Chairman');
    expect(text).toContain('Technical and Vocational Education and Training (TVET)');
    await expect(page.getByRole('link', { name: 'Explore Careers' })).toHaveCount(1);
  });
});

test.describe('Our Model', () => {
  // WP49 (cycle-24 review, Kimi m4): the hub's definition band no longer carries the 62 million (PX-01); it stays on Home and the audience pages (tests/wp49.spec.ts)
  test('the hub is a definition band without the problem figure, a partner Q&A band and the safeguarding heading', async ({ page }) => {
    await open(page, 'our-model/');
    await expect(page.locator('#definition')).not.toContainText('62 million');
    await expect(page.locator('#definition')).not.toContainText('Tens of millions');
    await expect(page.getByRole('heading', { level: 2, name: 'Questions Partners Ask' })).toBeVisible();
    await expect(page.locator('#faq details')).not.toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'Safeguarding and Data Protection Are Agreed per Program' })).toBeVisible();
  });

  // WP42 (cycle-19 review): "Each stage prepares learners for the next. Partners agree an outcome-tracking plan for every supported cohort before delivery begins." (it was "... and every supported cohort agrees an outcome-tracking plan ...")
  test('the hub says partners agree an outcome-tracking plan for every supported cohort before delivery begins', async ({ page }) => {
    await open(page, 'our-model/');
    await expect(page.locator('#path .sh__lead')).toHaveText('Each stage prepares learners for the next. Partners agree an outcome-tracking plan for every supported cohort before delivery begins.');
  });

  test('JobReady Platform: the four jobs are one intro sentence feeding a status table with a Supply Talent row, and the Why band links the evidence', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    await expect(page.locator('#jobs h3')).toHaveCount(0);
    const rows = page.locator('#status tbody th');
    await expect(rows).toContainText(['Train', 'Connect to Work', 'Supply Talent', 'Equip Institutions']);
    await expect(page.locator('#why a', { hasText: 'How TalentLEAP Works' })).toHaveCount(1);
    // WP49 (cycle-24 review): the "What Is Live Today" callout is gone; the roadmap says adaptive learning is planned, not live
    // WP63 (cycle-35 review, GPT-6.1 Sol GP3, polish): "..., not live yet."
    await expect(page.locator('#roadmap')).toContainText('not live yet.');
  });

  test('TalentLEAP: How It Works is the five-step stage pipeline (no repeated rows) and every On This Page label equals its heading', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    await expect(page.locator('#how .sp__step')).toHaveCount(5);
    await expect(page.locator('#how .tl__row')).toHaveCount(0);
    const links = page.locator('.lf-toc a[href^="#"]');
    const n = await links.count();
    expect(n).toBeGreaterThanOrEqual(6);
    for (let i = 0; i < n; i++) {
      const href = (await links.nth(i).getAttribute('href'))!;
      const label = (await links.nth(i).innerText()).trim();
      const heading = (await page.locator(`${href} h2`).first().innerText()).trim();
      expect(label, href).toBe(heading);
    }
  });
});
