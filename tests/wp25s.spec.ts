import { expect, test, type Page } from '@playwright/test';
import { DESKTOP, MOBILE, open } from './support/browser';

/**
 * WP25s behaviors (review round 5, cycle 5): Impact, Programs, About, Partner with Us, Our Model and Investors.
 * Each test states one observable behavior of the built site (run `npm run build` first, then
 * `PORT=<port> npx playwright test tests/wp25s.spec.ts --project=chromium`).
 */

const main = (page: Page) => page.locator('main').innerText();
/** Everything in main, including answers inside closed FAQ accordions (innerText leaves those out). */
const everything = (page: Page) => page.locator('main').evaluate((el) => el.textContent ?? '');
const heroLead = (page: Page) => page.locator('main .hero .hero__lead').first().innerText();
const compact = (t: string) => t.replace(/\s+/g, ' ').trim();

test.describe('direct answers under the H1', () => {
  test('/impact/ names its three kinds of proof in the lead under the H1, and the box below says what each shows', async ({ page }) => {
    await open(page, 'impact/');
    expect(compact(await heroLead(page))).toBe('Program records from Kosovo and Bangladesh, an independent trial in Dhaka and a 2026 survey of completers. Each figure names its kind of evidence.');
    const box = compact(await page.locator('#summary').innerText());
    expect(box).toContain('A randomized trial of CodersTrust’s WSDFM program found that women offered a place');
    expect(box).toContain('Among surveyed completers, employment was');
  });

  for (const [route, needle] of [
    // WP63 rework RW1: the lead names the group as ID-01 does ("educated, unemployed and underemployed youth")
    ['programs/youthwide/', 'YouthWIDE helps governments and funders prepare educated, unemployed and underemployed youth for paid digital work through training, mentoring and placement support.'],
    // WP41 (cycle-18 review): the lead speaks to the institution ("Run mentored, certification-focused training in your campus labs alongside academic studies.")
    ['programs/jobready-campus/', 'Run mentored, certification-focused training in your campus labs alongside academic studies.'],
    ['programs/jobready-work/', 'JobReady@Work builds custom AI-ready training for your team'],
    ['programs/superkids/', 'SuperKids brings block coding, robotics and graphic design for kids into schools'],
    ['our-model/', 'One integrated path: assessment, certification-focused training'],
  ] as const) {
    test(`${route} opens with a direct answer under the H1`, async ({ page }) => {
      await open(page, route);
      expect(compact(await heroLead(page))).toContain(needle);
    });
  }

  test('Our Model scopes the path to every supported cohort', async ({ page }) => {
    await open(page, 'our-model/');
    expect(compact(await heroLead(page))).toContain('agreed for each supported cohort');
  });
});

test.describe('Impact', () => {
  test('the WSDFM case study names CodersTrust’s WSDFM program in its H1', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('CodersTrust’s WSDFM Program Evaluated by a Randomized Trial');
  });

  // WP55 (owner decision 2026-10-18): Digital Jobs Albania is the fifth case study; the two World Bank programs lead, then the three Bangladesh programs in their earlier order
  test('"Five Programs Across Kosovo, Albania and Bangladesh" (WP63; it was "..., from Kosovo to Bangladesh") is five link cards, Kosovo first, and repeats no figure', async ({ page }) => {
    await open(page, 'impact/');
    const band = page.locator('#cases');
    await expect(band.getByRole('heading', { level: 2, name: 'Five Programs Across Kosovo, Albania and Bangladesh' })).toBeVisible();
    await expect(band.locator('article.card')).toHaveCount(5);
    const hrefs = await band.locator('a.card__link').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
    expect(hrefs.map((h) => h.split('/').filter(Boolean).pop())).toEqual(['kosovo-women-in-online-work', 'digital-jobs-albania', 'wsdfm-women-freelancers', 'undp-yes-korail', 'her-power']);
    // Results at a Glance carries the figures; the band restates none of them.
    expect(await band.innerText()).not.toMatch(/\d+%|\d[\d,]* of [\d,]+|\d+ pp/);
    await expect(band.locator('[data-fact]')).toHaveCount(0);
  });

  test('the evidence ladder’s survey row links the Impact Survey 2026, which shows who responded (WP35: the "Go Deeper" cards are gone)', async ({ page }) => {
    await open(page, 'impact/');
    const link = page.locator('#evidence-ladder').getByRole('link', { name: 'Impact Survey 2026' });
    await expect(link).toHaveCount(1);
    await link.click();
    await expect(page).toHaveURL(/impact\/outcomes-2026\/$/);
    await expect(page.locator('#respondents')).toBeVisible();
    await expect(page.locator('#respondents h2')).toHaveText('Who Responded');
  });

  test('the case studies page labels its link to the evidence ladder in words', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    expect(await main(page)).not.toContain('How the Evidence Fits Together');
    await expect(page.getByRole('link', { name: /See Where These Results Sit on the Evidence Ladder/ })).toHaveCount(1);
  });

  test('every case study closes with a labelled "Keep Reading" band, not a bare "All Case Studies" heading', async ({ page }) => {
    for (const slug of ['wsdfm-women-freelancers', 'kosovo-women-in-online-work', 'digital-jobs-albania', 'undp-yes-korail', 'her-power']) {
      await open(page, `impact/case-studies/${slug}/`);
      const band = page.locator('section[aria-labelledby="related-h"]');
      await expect(band.locator('.eyebrow')).toHaveText('Keep Reading');
      await expect(band.getByRole('heading', { level: 2 })).toHaveText('Where the Model Runs Next');
      await expect(band.getByRole('link', { name: /Compare the Five Case Studies/ })).toHaveCount(1);
      expect(await page.locator('main').innerText(), slug).not.toContain('All Case Studies');
    }
  });

  test('the survey reads as two readings, not as a rise', async ({ page }) => {
    await open(page, 'impact/');
    const text = await main(page);
    expect(text).toContain('employment was 48.0% before training and 78.2% at the October 2026 survey');
    expect(text).not.toMatch(/employment rose from 48\.0%/);
  });
});

test.describe('Programs', () => {
  test('the hub shows the learner route under the one primary button', async ({ page }) => {
    await open(page, 'programs/');
    const hero = page.locator('main .hero');
    await expect(hero.locator('.btn--primary')).toHaveCount(1);
    const nu = hero.locator('.hub__nu').first(); // WP95 A2 adds a second .hub__nu line (the JobReady.global course link) after it
    await expect(nu).toContainText('Applying for the NU Post Graduate Diploma?');
    await expect(nu.getByRole('link', { name: 'See the diploma.' })).toHaveAttribute('href', /programs\/nu-postgraduate-diploma\/$/);
  });

  test('the YouthWIDE hub card reads "from training to paid work"', async ({ page }) => {
    await open(page, 'programs/');
    const text = compact(await main(page));
    expect(text).toContain('Ministries can follow phased delivery from training to paid work, and funders get monthly reports on progress toward paid work, as agreed in the program scope, not only enrollment.');
  });

  test('YouthWIDE: the 2030 aim keeps its own "Target" tag and its not-delivered note in the Bangladesh band, beside two delivered-scale figures', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    await expect(page.locator('#governments .mech-target .status-tag')).toHaveText('Target');
    await expect(page.locator('#governments .mech-target')).toContainText('not a delivered figure');
    await expect(page.locator('#governments .mech-stat')).toHaveCount(2);
  });

  test('Campus says the empathy line once, and puts the Track Record before the vision', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    const text = compact(await main(page));
    // WP52 (cycle-27 review): the line is "Help students prepare for paid digital work and build placement evidence from your campus cohorts." (it read "You see capable students finish their degrees and still struggle to find work, ...")
    expect(text.split('A degree alone does not show employers what students can do, and without follow-up data an institution cannot show where its students start earning.').length - 1).toBe(1);
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(order.indexOf('guide'), 'guide band').toBeGreaterThan(-1);
    const titles = await page.locator('main h2').allInnerTexts();
    expect(titles.findIndex((t) => /Universities Partner with CodersTrust/.test(t))).toBeLessThan(titles.findIndex((t) => /What a Campus Cohort Can Produce/.test(t)));
    // WP39 (cycle-16 review): the features band is three short cards; the second says tracks are "built around the skills employers say they cannot find"
    expect(text).toContain('built around the skills employers say they cannot find');
    expect(text).not.toContain('training matches what employers say');
  });

  test('the YouthWIDE fit answer names who it does not suit in one plain sentence', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const text = compact(await everything(page));
    expect(text).toContain('YouthWIDE is not the right fit if you need a 100,000+ rollout delivered by one provider in a single phase; we plan national delivery phase by phase.');
    expect(text).not.toContain('single-vendor');
  });

  test('Work: the measure block and the support block do not say the same thing', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const blocks = compact((await page.locator('#mechanism .model__block').allInnerTexts()).join(' '));
    expect((blocks.match(/checked against/gi) ?? []).length, 'measure and support blocks').toBe(1);
    expect(blocks).toContain('toward team capability in the digital and AI tasks defined in the needs assessment.');
  });

  test('Work shows no youth-program survey figure of its own: two links to the evidence pages stand in for it (WP31)', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const text = compact(await main(page));
    expect(text).not.toContain('78.2%');
    await expect(page.locator('#offer-evidence .pe__more a')).toHaveText(['The Randomized Trial', 'Impact Survey 2026']);
  });

  // WP39 (cycle-16 review): the answer names the practical work in plain words (tests/wp39.spec.ts holds both answers); each subject is a module of the course, which the build checks
  test('the NU course answer names concrete work', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/digital-marketing/');
    const dm = compact(await everything(page));
    expect(dm).toContain('Build practical work in WordPress design, content marketing, SEO and analytics, followed by the final internship, project work and seminar module.');
    expect(dm).not.toContain('You can explain the digital skills');
    await open(page, 'programs/nu-postgraduate-diploma/ict/');
    expect(compact(await everything(page))).toContain('Build practical work in programming, databases, networks and mobile applications, followed by the final internship, project work and seminar module.');
  });

  // WP39 (cycle-16 review): YouthWIDE's features band was three short cards; its third said the curriculum is "designed to keep pace as AI changes entry-level tasks" (the designed-to scope stayed).
  // WP57 (cycle-29 review, GPT-6.1 Sol G2): that band is gone, so YouthWIDE no longer states the sentence (tests/wp31.spec.ts keeps the absolute "tracks have to follow" wording off the page).
  // WP40 (cycle-17 review): Investors' three cards no longer carry the AI-ready curriculum row; its AI answer (Q5) says tracks are chosen from current employer demand, with each track's AI content and work-entry plan agreed before enrollment
  test('YouthWIDE no longer carries the removed card’s "designed to keep pace" sentence; Investors’ AI answer says tracks are chosen from current employer demand', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    expect(compact(await main(page))).not.toContain('designed to keep pace as AI changes entry-level tasks');
    await open(page, 'partner-with-us/investors/');
    expect(compact(await everything(page))).toContain('we choose tracks from current employer demand, set per country, and agree each track’s AI content and work-entry plan with you before enrollment');
  });
});

test.describe('About', () => {
  test('Mentors: no category is a band of one card', async ({ page }) => {
    await open(page, 'about/mentors/');
    const groups = page.locator('.mn-group');
    const n = await groups.count();
    expect(n).toBeGreaterThan(1);
    for (let i = 0; i < n; i++) {
      const name = await groups.nth(i).getByRole('heading', { level: 2 }).innerText();
      expect(await groups.nth(i).locator('.card').count(), name).toBeGreaterThan(1);
    }
    await expect(page.getByRole('heading', { level: 2, name: 'Digital Marketing, Content and Language' })).toBeVisible();
    await expect(page.locator('.mn-group', { has: page.getByRole('heading', { level: 2, name: 'Digital Marketing, Content and Language' }) }).getByRole('heading', { level: 3, name: 'Papiya Nabi' })).toHaveCount(1);
  });

  test('Careers: the two application routes are explained in one line, and the H1 says what the work is', async ({ page }) => {
    await open(page, 'careers/');
    await expect(page.locator('#apply .cr-mail')).toContainText('opens a prefilled email to');
    // WP41 (cycle-18 review): American English, "resume" (tests/wp41.spec.ts)
    await expect(page.locator('#apply .cr-mail')).toContainText('you can also send your resume to that address yourself');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Help Put Young People into Paid Digital Work');
  });

  test('Recognition: the World Bank item says which CodersTrust program it covers', async ({ page }) => {
    await open(page, 'about/recognition/');
    const item = page.locator('.rec-press__item', { hasText: 'Kosovo’s Women Go WOW' });
    await expect(item).toContainText('Women in Online Work program in Kosovo, with the World Bank Group');
    await expect(item.getByRole('link', { name: /Read the Case Study/ })).toHaveAttribute('href', /case-studies\/kosovo-women-in-online-work\/$/);
  });

  test('Impact: the SDG line keeps the registered "aligns with" wording (WP30e: it lives on Impact only, not on About)', async ({ page }) => {
    await open(page, 'impact/');
    const text = compact(await page.locator('#sdg').innerText());
    expect(text).toContain('aligns with seven SDGs');
    expect(text).not.toContain('contributes to seven SDGs');
    await open(page, 'about/');
    await expect(page.locator('#sdgs')).toHaveCount(0);
  });

  test('About: "Inclusion by Design" says who can join, in one plain sentence', async ({ page }) => {
    await open(page, 'about/');
    const text = compact(await page.locator('#how-we-work').innerText());
    // WP46 (cycle-22 review): scoped to the supported youth cohorts ("Programs" also covered the corporate, school and diploma programs)
    expect(text).toContain('Supported youth cohorts are built so that people with fewer computer or English skills can still join, with women a priority in every group.');
    expect(text).not.toContain('interview guide selection and placement');
  });
});

test.describe('Partner with Us', () => {
  test('Employers: Due Diligence in One View speaks of the employer offer, not of funders and cohorts', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const dd = page.locator('#due-diligence');
    const text = compact(await dd.innerText());
    expect(text).toContain('Needs Assessment First');
    expect(text).toContain('Progress Evaluation');
    expect(text).not.toMatch(/tracers|funder|Safeguarding Agreed per Program|enrollment/i);
    // WP57 (cycle-29 review, GPT-6.1 Sol G7): three rows; the "Independent Evaluation Welcome" row is gone (tests/wp57.spec.ts)
    await expect(dd.locator('.ddv__item')).toHaveCount(3);
  });

  test('Universities and Local Partners do not speak of a funder in their due-diligence item (WP34: one sentence for every audience page, no funder or contracting-party wording)', async ({ page }) => {
    for (const route of ['partner-with-us/universities/', 'partner-with-us/local-partners/']) {
      await open(page, route);
      const text = compact(await page.locator('#due-diligence').innerText());
      expect(text, route).toContain('The contracting entity, safeguarding arrangements and reporting plan are confirmed for your program.');
      expect(text, route).not.toMatch(/funder/i);
    }
  });

  test('the hub keeps the funder set, with a shorter safeguarding card and the independent-evaluation item (WP35: the reporting band is two sentences and a link, so the decision panel is gone)', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const dd = compact(await page.locator('#due-diligence').innerText());
    expect(dd).toContain('Monthly Reports and Follow-Up Surveys');
    expect(dd).toContain('Consent, protected records and grievance handling are specified for each program.');
    expect(dd).toContain('We support third-party evaluation of outcomes, and the randomized trial of CodersTrust’s WSDFM program is public.');
  });

  test('Employers: one pricing sentence, and the scoped-candidate sentence is not repeated', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    // WP50 (cycle-25 review): the pricing sentence is said once, in the "What Does It Cost?" answer (a closed accordion item, so it is read from the markup's own text, not from innerText); the options band has no lead (tests/wp50.spec.ts)
    const text = compact(await everything(page));
    const pricing = 'Pricing is set per program; we share an indicative budget in the discovery session and confirm it after the needs assessment.';
    expect(text.split(pricing).length - 1).toBe(1);
    expect(text).not.toContain('Pricing is set per program and shared after the needs assessment');
    expect(text.split('scoped against the experience and credentials available').length - 1).toBeLessThanOrEqual(3);
  });

  test('Employers: proof comes before the features table, as on every other audience page (WP31: the proof is the delivery record for employers)', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(order.indexOf('offer-evidence'), 'delivery record band').toBeGreaterThan(-1);
    expect(order.indexOf('features'), 'features').toBeGreaterThan(-1);
    expect(order.indexOf('offer-evidence')).toBeLessThan(order.indexOf('features'));
    expect(order.indexOf('mechanism')).toBeLessThan(order.indexOf('offer-evidence'));
  });

  test('Foundations: one chooser, one naming scheme, measured against first paid work', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const text = compact(await main(page));
    await expect(page.locator('#route-chooser')).toHaveCount(0);
    expect(text).not.toMatch(/Funding Vehicle|Track 1|Track 2|Choose Your Route/);
    // (innerText applies the uppercase styling of the table's and the offer bands' labels, so the names are read from the markup's own text; WP40: the numbered jump links are gone, the table rows and the two offer bands carry them)
    const named = compact(await everything(page));
    expect(named).toContain('Funding Route 1');
    expect(named).toContain('Funding Route 2');
    // WP39 (cycle-16 review): the features band is three short cards; the first says how results are measured. WP49 (cycle-24 review): against the agreed scorecard (which also covers completion, certification and sustained work), "including first paid work, not attendance alone"
    expect(text).toContain('Results are measured against the agreed scorecard, including first paid work, not attendance alone.');
    expect(text).not.toContain('followed through to first paid work');
    // WP30c: the "Reporting and Recognition" paragraph is gone (the features rows state reporting once); the monitoring row stays scope-aware
    expect(text).not.toContain('Funders receive job and income outcomes');
    // WP49 (cycle-24 review): the third card no longer lists the contracting entity and due-diligence documents; the Due Diligence band states them (tests/wp49.spec.ts)
    expect(text).toContain('The contracting entity, safeguarding arrangements and reporting plan are confirmed for your program.');
    // WP40 (cycle-17 review): the two links under the comparison are one for each route, named for what they open (tests/wp40.spec.ts)
    await expect(page.locator('#mechanism').getByRole('link', { name: 'Explore YouthWIDE Delivery' })).toHaveAttribute('href', /\/programs\/youthwide\/$/);
    await expect(page.locator('#mechanism').getByRole('link', { name: 'Explore JobReady’s Rollout' })).toHaveAttribute('href', /\/our-model\/jobready-platform\/$/);
  });
});

test.describe('Our Model and Investors', () => {
  test('the platform names two marketplaces, and the National University onboarding figure sits in its own group', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const text = compact(await main(page));
    // WP49 (cycle-24 review): the "What Is Live Today" callout is gone; the status table names the two marketplaces as two rows, each in pre-launch (never "the employer and gig-work marketplaces")
    const rows = page.locator('#status tbody tr');
    await expect(rows.filter({ hasText: 'Gig-work (Earn) marketplace' })).toContainText('Pre-Launch');
    await expect(rows.filter({ hasText: 'Employer marketplace' })).toContainText('Pre-Launch');
    expect(text).not.toMatch(/employer and gig-work marketplaces/i);
    const why = page.locator('#why');
    const tile = (title: string) => why.locator('.jr__whystat', { has: page.getByRole('heading', { level: 3, name: title }) });
    await expect(tile('Being Onboarded')).toContainText('1.5M+');
    await expect(tile('Being Onboarded').locator('.status-tag')).toHaveCount(0);
    await expect(tile('Delivered Since 2014').locator('.status-tag')).toHaveText('Delivered');
    await expect(tile('Delivered Since 2014')).not.toContainText('1.5M+');
  });

  test('Our Model spells out BIGD once, where its evidence band first names it; Investors (no In Short since WP30c; WP36: its evidence band is three sentences and names no evaluator) does not name it', async ({ page }) => {
    await open(page, 'our-model/');
    const text = compact(await main(page));
    expect((text.match(/BRAC Institute of Governance and Development/g) ?? []).length).toBe(1);
    expect(text).toContain('A randomized trial by the BRAC Institute of Governance and Development (BIGD) found');
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#in-short')).toHaveCount(0);
    expect(compact(await page.locator('#proof-band').innerText())).toContain('A randomized trial of CodersTrust’s WSDFM program found women offered a place were 10.3 percentage points more likely to be employed.');
    expect(compact(await main(page))).not.toMatch(/BIGD|BRAC Institute of Governance and Development/);
  });

  test('TalentLEAP: supported cohorts, further levels, typical timing, BIGD spelled out once', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    const text = compact(await everything(page));
    expect(text).toContain('Every supported TalentLEAP cohort pairs');
    // WP48 (cycle-23 review): "... progressive levels as further levels are published." (it ended ", so completers can keep advancing as further levels are published"; tests/wp48.spec.ts).
    // WP49 (cycle-24 review): the shared "What Happens When Funding Ends?" answer no longer carries that TalentLEAP clause (tests/wp49.spec.ts); the page's own worked example states the levels
    expect(text).not.toContain('TalentLEAP is designed to organize skills into career paths with progressive levels as further levels are published');
    expect(text).toContain('TalentLEAP organizes skills into career paths with progressive levels. In this example the levels are Competent, Proficient and Expert.');
    // WP80 (item 1): the FAQ answer now opens "Yes, for CodersTrust’s WSDFM program." and names the evaluator in its second sentence.
    expect(text).toContain('The BRAC Institute of Governance and Development (BIGD) at BRAC University ran a randomized controlled trial');
  });

  // WP37 (cycle-14 review): Our Model has its own two-sentence variant of the timeline answer ("allow about three weeks ... then 6–8 weeks ..."), hedged by "allow about"; WP40 (cycle-17 review): YouthWIDE, whose "What Happens Next"
  // shows the sequence, uses it too; the Governments variant kept "typically". WP50 (cycle-25 review, item 23): the Governments variant is the procurement sentence alone, with no grant-pilot timing to hedge (tests/wp50.spec.ts)
  test('the timeline answers: YouthWIDE and Our Model state the 6–8 weeks after signing; Governments states no timing beyond the agency’s own procurement timeline', async ({ page }) => {
    for (const route of ['programs/youthwide/', 'our-model/']) {
      await open(page, route);
      const text = compact(await everything(page));
      expect(text, route).toContain('Target timing for grant-funded pilots: training starts 6–8 weeks after signing. Public procurement follows the agency’s own timeline.');
    }
    await open(page, 'partner-with-us/governments/');
    const gov = compact(await everything(page));
    expect(gov).toContain('Public procurement follows the agency’s own timeline, so the first step is a briefing for your ministry.');
    expect(gov).not.toMatch(/agreement typically takes about three weeks|typically in training 6–8 weeks after signing/);
  });

  test('Investors: program results appear once, the national-scale answer leads with CodersTrust’s role', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const text = compact(await main(page));
    // WP30c: the reach band no longer carries the pointer sentence; the program tiles still appear only in Proof in Practice (see tests/wp24a-pages.spec.ts)
    expect(text).not.toContain('The outcomes behind these figures appear once');
    const item = page.locator('#faq details', { hasText: 'Can You Deliver at National Scale?' });
    await expect(item).toHaveCount(1);
    const answer = compact((await item.textContent()) ?? '');
    expect(answer.indexOf('CodersTrust provided the curriculum')).toBeGreaterThan(-1);
    expect(answer.indexOf('CodersTrust provided the curriculum')).toBeLessThan(answer.indexOf('25,125'));
  });

  test('the employer and gig-work marketplaces are named as two, wherever the page speaks of them', async ({ page }) => {
    for (const route of ['our-model/jobready-platform/', 'programs/jobready-work/', 'partner-with-us/employers/', 'partner-with-us/investors/', 'partner-with-us/foundations/']) {
      await open(page, route);
      expect(compact(await everything(page)), route).not.toMatch(/employer and gig-work/i);
    }
  });
});

test.describe('layout', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test(`changed pages do not scroll sideways at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const route of ['impact/', 'programs/', 'programs/youthwide/', 'about/mentors/', 'partner-with-us/', 'partner-with-us/employers/', 'partner-with-us/foundations/', 'our-model/', 'our-model/jobready-platform/', 'partner-with-us/investors/']) {
        await open(page, route);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(over, route).toBeLessThanOrEqual(0);
      }
    });
  }
});
