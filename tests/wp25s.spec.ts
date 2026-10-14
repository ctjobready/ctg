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
  test('/impact/ says what each kind of evidence shows, in the lead under the H1', async ({ page }) => {
    await open(page, 'impact/');
    expect(compact(await heroLead(page))).toBe(
      'The randomized trial shows cause for one predecessor program; the 2026 survey describes what surveyed completers report; program records show results for named programs.',
    );
  });

  for (const [route, needle] of [
    ['programs/youthwide/', 'YouthWIDE is the program through which governments, development partners and funders prepare educated, unemployed youth'],
    ['programs/jobready-campus/', 'JobReady@Campus runs mentored, certification-focused training in on-campus labs'],
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
  test('the WSDFM case study names the predecessor program in its H1', async ({ page }) => {
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('WSDFM: A Predecessor Program Evaluated by a Randomized Trial');
  });

  test('"Four Programs, in Depth" is four link cards and repeats no figure', async ({ page }) => {
    await open(page, 'impact/');
    const band = page.locator('#cases');
    await expect(band.getByRole('heading', { level: 2, name: 'Four Programs, in Depth' })).toBeVisible();
    await expect(band.locator('article.card')).toHaveCount(4);
    for (const slug of ['wsdfm-women-freelancers', 'kosovo-women-in-online-work', 'undp-yes-korail', 'her-power']) {
      await expect(band.locator(`a.card__link[href$="/impact/case-studies/${slug}/"]`)).toHaveCount(1);
    }
    // At a Glance and the results table carry the figures; the band restates none of them.
    expect(await band.innerText()).not.toMatch(/\d+%|\d[\d,]* of [\d,]+|\d+ pp/);
    await expect(band.locator('[data-fact]')).toHaveCount(0);
  });

  test('the survey card links the respondent profile that Outcomes 2026 already shows', async ({ page }) => {
    await open(page, 'impact/');
    const link = page.locator('#proof').getByRole('link', { name: 'Who Responded' });
    await expect(link).toHaveCount(1);
    await link.click();
    await expect(page).toHaveURL(/impact\/outcomes-2026\/#respondents$/);
    await expect(page.locator('#respondents')).toBeVisible();
  });

  test('the case studies page labels its link to the evidence ladder in words', async ({ page }) => {
    await open(page, 'impact/case-studies/');
    expect(await main(page)).not.toContain('How the Evidence Fits Together');
    await expect(page.getByRole('link', { name: /See Where These Results Sit on the Evidence Ladder/ })).toHaveCount(1);
  });

  test('every case study closes with a labelled "Keep Reading" band, not a bare "All Case Studies" heading', async ({ page }) => {
    for (const slug of ['wsdfm-women-freelancers', 'kosovo-women-in-online-work', 'undp-yes-korail', 'her-power']) {
      await open(page, `impact/case-studies/${slug}/`);
      const band = page.locator('section[aria-labelledby="related-h"]');
      await expect(band.locator('.eyebrow')).toHaveText('Keep Reading');
      await expect(band.getByRole('heading', { level: 2 })).toHaveText('Where the Model Runs Next');
      await expect(band.getByRole('link', { name: /Compare the Four Case Studies/ })).toHaveCount(1);
      expect(await page.locator('main').innerText(), slug).not.toContain('All Case Studies');
    }
  });

  test('the survey reads as two readings, not as a rise', async ({ page }) => {
    await open(page, 'impact/');
    const text = await main(page);
    expect(text).toContain('employment was 47.4% before training and 77.9% at the October 2026 survey');
    expect(text).not.toMatch(/employment rose from 47\.4%/);
  });
});

test.describe('Programs', () => {
  test('the hub shows the learner route under the one primary button', async ({ page }) => {
    await open(page, 'programs/');
    const hero = page.locator('main .hero');
    await expect(hero.locator('.btn--primary')).toHaveCount(1);
    const nu = hero.locator('.hub__nu');
    await expect(nu).toContainText('Applying for the NU Postgraduate Diploma?');
    await expect(nu.getByRole('link', { name: 'See the diploma.' })).toHaveAttribute('href', /programs\/nu-postgraduate-diploma\/$/);
  });

  test('the YouthWIDE hub card and table read "from training to paid work" and "share of trainees"', async ({ page }) => {
    await open(page, 'programs/');
    const text = compact(await main(page));
    expect(text).toContain('Ministries can follow phased delivery from training to paid work, and funders get monthly reports on paid-work outcomes, not only enrollment.');
    expect(text).toContain('Share of trainees in paid digital work, from monthly reports');
  });

  test('step two of the path is two sentences', async ({ page }) => {
    await open(page, 'programs/');
    const text = compact(await page.locator('#path').innerText());
    expect(text).toContain('with placement support alongside. Mentoring works toward each track’s agreed work-entry goal');
  });

  test('YouthWIDE population cards carry "Priority Group", not "Target"; third-gender stays "Planned"', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const card = (title: string) => page.locator('.pg__card', { has: page.getByRole('heading', { level: 3, name: title }) });
    for (const t of ['Unemployed Graduates', 'Madrasah Youth', 'Climate-Vulnerable Coastal Youth', 'Indigenous Communities']) {
      await expect(card(t)).toContainText('Priority Group');
      await expect(card(t).locator('.status-tag')).toHaveCount(0);
    }
    await expect(card('Third-Gender People').locator('.status-tag')).toHaveText('Planned');
    // the 2030 aim keeps its own "Target" tag in the delivery band
    await expect(page.locator('.mech-target .status-tag')).toHaveText('Target');
  });

  test('Campus says the empathy line once, and puts the Track Record before the vision', async ({ page }) => {
    await open(page, 'programs/jobready-campus/');
    const text = compact(await main(page));
    expect(text.split('You see capable students finish their degrees').length - 1).toBe(1);
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(order.indexOf('guide'), 'guide band').toBeGreaterThan(-1);
    const titles = await page.locator('main h2').allInnerTexts();
    expect(titles.findIndex((t) => /Universities Partner with CodersTrust/.test(t))).toBeLessThan(titles.findIndex((t) => /What a Campus Cohort Can Produce/.test(t)));
    expect(text).toContain('training is built around the skills employers say they cannot find');
    expect(text).not.toContain('training matches what employers say');
  });

  test('the Find Your Program eyebrow no longer repeats its heading', async ({ page }) => {
    await open(page, 'programs/');
    const head = page.locator('#find');
    await expect(head.locator('.eyebrow').first()).toHaveText('Decision Guide');
    await expect(head.getByRole('heading', { level: 2 })).toHaveText('Find Your Program');
  });

  test('the YouthWIDE fit answer names who it does not suit in one plain sentence', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    const text = compact(await everything(page));
    expect(text).toContain('YouthWIDE is not the right fit if you need a 100,000+ rollout delivered by one provider in a single phase; we plan national delivery phase by phase.');
    expect(text).not.toContain('single-vendor');
  });

  test('Work: steps five and seven do not say the same thing', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const group = compact(await page.locator('#mechanism .grp', { has: page.getByRole('heading', { name: 'Measure and Support' }) }).innerText());
    expect((group.match(/checked against/gi) ?? []).length, 'steps five to seven').toBe(1);
    expect(group).toContain('Team capability in the digital and AI tasks defined in the needs assessment.');
  });

  test('Work states the survey result once', async ({ page }) => {
    await open(page, 'programs/jobready-work/');
    const text = compact(await main(page));
    expect(text.split('77.9%').length - 1).toBe(1);
  });

  test('the NU course answer names concrete modules', async ({ page }) => {
    await open(page, 'programs/nu-postgraduate-diploma/digital-marketing/');
    const dm = compact(await everything(page));
    expect(dm).toContain('modules such as WordPress Design, Content Marketing, Search Engine Optimization (SEO) and Web & Google Analytics');
    expect(dm).not.toContain('You can explain the digital skills');
    await open(page, 'programs/nu-postgraduate-diploma/ict/');
    expect(compact(await everything(page))).toContain('modules such as Java Programming, Database Management Systems, Computer Networks Maintenance and Mobile Application Development');
  });

  test('YouthWIDE and Investors say courses are designed to keep pace with employer demand', async ({ page }) => {
    await open(page, 'programs/youthwide/');
    expect(compact(await main(page))).toContain('courses are designed to keep pace with employer demand');
    await open(page, 'partner-with-us/investors/');
    expect(compact(await main(page))).toContain('Courses are designed to keep pace with employer demand');
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

  test('Careers: the two application routes are explained in one line, and "Why Join" says what the work is', async ({ page }) => {
    await open(page, 'careers/');
    await expect(page.locator('#apply .cr-mail')).toContainText('Two ways to apply, one inbox');
    await expect(page.locator('#why')).toContainText('preparing educated, unemployed young people for paid digital work');
  });

  test('Recognition: the World Bank item says which CodersTrust program it covers', async ({ page }) => {
    await open(page, 'about/recognition/');
    const item = page.locator('.rec-press__item', { hasText: 'Kosovo’s Women Go WOW' });
    await expect(item).toContainText('Women in Online Work program in Kosovo, with the World Bank Group');
    await expect(item.getByRole('link', { name: /Read the Case Study/ })).toHaveAttribute('href', /case-studies\/kosovo-women-in-online-work\/$/);
  });

  test('About: the SDG line keeps the registered "aligns with" wording', async ({ page }) => {
    await open(page, 'about/');
    const text = compact(await page.locator('#sdgs').innerText());
    expect(text).toContain('aligns with seven SDGs');
    expect(text).not.toContain('contributes to seven SDGs');
  });

  test('About: "Inclusion by Design" states selection with a verb', async ({ page }) => {
    await open(page, 'about/');
    const text = compact(await page.locator('#how-we-work').innerText());
    expect(text).toContain('Selection and placement into a career or foundation track use a readiness assessment, a written test and an interview guide.');
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
    await expect(dd.locator('.ddv__item')).toHaveCount(4);
  });

  test('Universities and Local Partners name the contracting party, not the funder', async ({ page }) => {
    for (const route of ['partner-with-us/universities/', 'partner-with-us/local-partners/']) {
      await open(page, route);
      const text = compact(await page.locator('#due-diligence').innerText());
      expect(text, route).toContain('the contracting party’s requirements');
      expect(text, route).not.toContain('the funder’s requirements');
    }
  });

  test('the hub keeps the funder set, with a shorter safeguarding card and a partner decision', async ({ page }) => {
    await open(page, 'partner-with-us/');
    const dd = compact(await page.locator('#due-diligence').innerText());
    expect(dd).toContain('Monthly Reports and Tracers');
    expect(dd).toContain('Consent, protected records and grievance handling are specified for each program.');
    expect(compact(await main(page))).toContain('The decision is yours: independent evaluation is welcome, and we support it.');
  });

  test('Employers: one pricing sentence, and the scoped-candidate sentence is not repeated', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const text = compact(await main(page));
    const pricing = 'Pricing is set per program; we share an indicative budget in the discovery session and confirm it after the needs assessment.';
    expect(text).toContain(pricing);
    expect(text).not.toContain('Pricing is set per program and shared after the needs assessment');
    expect(text.split('scoped against the experience and credentials available').length - 1).toBeLessThanOrEqual(3);
  });

  test('Employers: proof comes before the features table, as on every other audience page', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const order = await page.evaluate(() => Array.from(document.querySelectorAll('main section[id]')).map((s) => s.id));
    expect(order.indexOf('proof-band'), 'proof band').toBeGreaterThan(-1);
    expect(order.indexOf('features'), 'features').toBeGreaterThan(-1);
    expect(order.indexOf('proof-band')).toBeLessThan(order.indexOf('features'));
    expect(order.indexOf('mechanism')).toBeLessThan(order.indexOf('proof-band'));
  });

  test('Foundations: one chooser, one naming scheme, measured against first paid work', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const text = compact(await main(page));
    await expect(page.locator('#route-chooser')).toHaveCount(0);
    expect(text).not.toMatch(/Funding Vehicle|Track 1|Track 2|Choose Your Route/);
    expect(text).toContain('Funding Route 1');
    expect(text).toContain('Funding Route 2');
    expect(text).toContain('A grant measured against first paid work');
    expect(text).not.toContain('followed through to first paid work');
    expect(text).toContain('documented where documentary evidence is available');
    await expect(page.locator('#mechanism').getByRole('link', { name: 'See Funding Route 1' })).toHaveAttribute('href', '#cohort-grants');
    await expect(page.locator('#mechanism').getByRole('link', { name: 'See Funding Route 2' })).toHaveAttribute('href', '#platform-grants');
  });
});

test.describe('Our Model and Investors', () => {
  test('the platform names two marketplaces, and the National University pipeline sits in its own group', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const text = compact(await main(page));
    expect(text).toContain('The employer marketplace and the gig-work (Earn) marketplace are in pre-launch');
    const why = page.locator('#why');
    const tile = (title: string) => why.locator('.jr__whystat', { has: page.getByRole('heading', { level: 3, name: title }) });
    await expect(tile('In the Pipeline')).toContainText('1.5M+');
    await expect(tile('In the Pipeline').locator('.status-tag')).toHaveCount(0);
    await expect(tile('Delivered Since 2014').locator('.status-tag')).toHaveText('Delivered');
    await expect(tile('Delivered Since 2014')).not.toContainText('1.5M+');
  });

  test('Our Model and Investors open with an In Short box that spells out BIGD once', async ({ page }) => {
    for (const route of ['our-model/', 'partner-with-us/investors/']) {
      await open(page, route);
      const box = page.locator('#in-short');
      await expect(box.getByRole('heading', { level: 2, name: 'In Short' })).toBeVisible();
      const items = await box.locator('li').count();
      expect(items, route).toBeGreaterThanOrEqual(3);
      expect(compact(await box.innerText()), route).toContain('the BRAC Institute of Governance and Development (BIGD)');
      expect((compact(await main(page)).match(/BRAC Institute of Governance and Development/g) ?? []).length, route).toBe(1);
    }
  });

  test('TalentLEAP: supported cohorts, further levels, typical timing, BIGD spelled out once', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    const text = compact(await everything(page));
    expect(text).toContain('Every supported TalentLEAP cohort pairs');
    expect(text).toContain('so completers can keep advancing as further levels are published');
    expect(text).toContain('by the BRAC Institute of Governance and Development (BIGD) at BRAC University');
  });

  test('Our Model: the timeline answer says "typically"', async ({ page }) => {
    await open(page, 'our-model/');
    const text = compact(await everything(page));
    expect(text).toContain('agreement typically takes about three weeks from first conversation');
    expect(text).toContain('typically in training 6–8 weeks after signing');
  });

  test('Investors: program results appear once, the national-scale answer leads with CodersTrust’s role', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    const text = compact(await main(page));
    expect(text).toContain('Program results appear once, in Proof in Practice.');
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
