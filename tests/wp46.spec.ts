import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { DESKTOP, MOBILE, open } from './support/browser';
import { listPages } from './support/pages';

/**
 * WP46 behaviors (cycle-22 whole-site reviews: GPT-6.1 Sol items 1-8, Claude Sonnet 5.5 items 9-21, Kimi K3 items 23-28): the TalentLEAP course-platform answer compares with a self-paced course alone; About's
 * "Inclusion by Design" is scoped to the supported youth cohorts and About has its "On This Page" list back; the Our Model menu line no longer implies guaranteed employment; the Investors definition drops
 * "AI-native"; Development Partners' and Foundations' final calls to action drop the timing their steps band repeats; the NU diploma course pages lose "What You Will Work On"; the JobReady Platform record band is
 * "The Record Behind JobReady"; the contract-scope note says who trained whom; Foundations gets the four grant-funded steps; and the smaller wording fixes. Retrospective coverage (the owner exempted this project from
 * test-first work); run `npm run build` first, then `PORT=<port> npx playwright test tests/wp46.spec.ts --project=chromium`.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);

/** Every FAQPage question and answer text in the page's JSON-LD. */
async function faqJsonLd(page: Page) {
  const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: { name: string; text: string }[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      const o = n as Record<string, unknown>;
      if (o['@type'] === 'FAQPage') for (const q of (o.mainEntity as { name: string; acceptedAnswer?: { text: string } }[]) ?? []) out.push({ name: q.name, text: q.acceptedAnswer?.text ?? '' });
      Object.values(o).forEach(walk);
    }
  };
  blobs.forEach((b) => walk(JSON.parse(b)));
  return out;
}

test.describe('TalentLEAP: the course-platform answer compares with a self-paced course alone (item 1)', () => {
  const QUESTION = 'How Is CodersTrust Different from an Online Course Platform?';
  const FIRST = 'Compared with a self-paced course alone, supported CodersTrust cohorts add mentoring, certification exam preparation and placement support, agreed in each program’s scope.';
  const SECOND = 'Every supported TalentLEAP cohort pairs 100 training hours per certification with three months of milestone-based mentoring, certification exam preparation (exam fee included), placement support and outcome tracking for 12 months.';

  test('the answer is the scoped comparison followed by the unchanged cohort sentence, in the page and in its FAQ JSON-LD; it no longer generalizes about every course platform', async ({ page }) => {
    await open(page, 'our-model/talentleap/');
    const item = page.locator('#faq details', { has: page.locator('summary', { hasText: QUESTION }) });
    await expect(item).toHaveCount(1);
    expect(compact(await item.locator('.faq__a').textContent())).toBe(`${FIRST} ${SECOND}`);
    expect((await faqJsonLd(page)).find((q) => q.name === QUESTION)?.text).toContain(FIRST);
    const text = await mainText(page);
    expect(text).not.toMatch(/Self-paced course platforms|focus on content access/);
    // the objection bank (the one source) carries the same words
    expect(faqs.find((f) => f.id === 'Q14')!.a).toBe(`${FIRST} ${SECOND}`);
  });
});

test.describe('About: "Inclusion by Design" is scoped to the supported youth cohorts (item 2)', () => {
  test('the card says "Supported youth cohorts are built so that…", keeps the women-first clause and its link, and the other three principles are unchanged', async ({ page }) => {
    await open(page, 'about/');
    const card = page.locator('#how-we-work article', { has: page.locator('h3', { hasText: 'Inclusion by Design' }) });
    await expect(card).toHaveCount(1);
    expect(compact(await card.locator('.card__text').textContent())).toBe('Supported youth cohorts are built so that people with fewer computer or English skills can still join, with women a priority in every group.');
    expect(compact(await card.locator('a').textContent())).toBe('How Our Model Works');
    expect(await mainText(page)).not.toContain('Programs are built so that');
    expect(await texts(page, '#how-we-work .principle h3')).toEqual(['Outcomes over Outputs', 'Inclusion by Design', 'Evidence Before Claims', 'Partnership and Accountability']);
  });
});

test.describe('Our Model menu: "How It Works" no longer implies guaranteed employment (item 3)', () => {
  const LINE = 'From partner goals to training, placement support and tracked outcomes.';

  test('the menu line reads as above, and no built page still carries the old "employed program completers" line', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#mega-model a.mega__link[href$="our-model/"] .mega__desc').textContent())).toBe(LINE);
    const stale = builtPages().filter((p) => p.html.includes('employed program completers')).map((p) => p.route);
    expect(stale, 'pages that still say "employed program completers"').toEqual([]);
    const carrying = builtPages().filter((p) => p.html.includes(LINE));
    expect(carrying.length, 'the site header carries the line on every real page').toBe(listPages().length);
  });
});

test.describe('Investors: the definition band no longer calls JobReady "AI-native" (item 4)', () => {
  // WP53 (owner decision 2026-10-16): "a digital learning and earning platform" (it said "education and employment"; tests/wp53.spec.ts)
  test('the platform sentence reads "a digital learning and earning platform", and no page, JSON-LD block or llms.txt still says AI-native', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    expect(await texts(page, '#definition .def__text')).toContain('CodersTrust is building JobReady, a digital learning and earning platform for emerging markets.');
    expect(await page.locator('#definition .def').getAttribute('data-fact')).toBe('ID-01 IN-04');
    expect(await mainText(page)).not.toMatch(/AI-native/i);
    const stale = builtPages().filter((p) => /AI[- ]native/i.test(p.html)).map((p) => p.route);
    expect(stale, 'pages that still say "AI-native"').toEqual([]);
    // the live / pre-launch status lines stay where they are
    const text = await mainText(page);
    expect(text).toMatch(/Live today|are live|pre-launch/i);
  });
});

test.describe('Development Partners and Foundations: the final call to action does not repeat the timing the steps below it show (item 5)', () => {
  test('Development Partners: #cta shows only the micro-commitment; the four grant-funded steps and the procurement lead below it say the timing once', async ({ page }) => {
    await open(page, 'partner-with-us/development-partners/');
    expect(await texts(page, '#cta .cta-band__notes li')).toEqual(['A discovery session is a conversation, not a commitment.']);
    const cta = compact(await page.locator('#cta').textContent());
    expect(cta).not.toMatch(/grant-funded pilots|three weeks|6–8|Public procurement/);
    // the discovery agenda and the one primary button stay in the band
    await expect(page.locator('#cta .btn--primary')).toHaveCount(1);
    await expect(page.locator('#cta [data-session-agenda]')).toHaveCount(1);
    // the steps band below: four steps, the 6–8 weeks in the last step heading only, the procurement caveat in its lead
    await expect(page.locator('#next-steps ol h3')).toHaveCount(4);
    const steps = compact(await page.locator('#next-steps').textContent());
    expect(steps).toContain('Public procurement follows the agency’s own timeline.');
    expect(count(await mainText(page), '6–8')).toBe(1);
    expect(count(await mainText(page), 'Public procurement follows the agency’s own timeline')).toBe(1);
  });

  test('Governments states its procurement note in the steps band ("Briefing", not the grant timing) and the FAQ; WP52 (cycle-27 review) removed the call-to-action band’s own copy of it; the pages whose urgency line is not the grant timing are unaffected', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    expect(await texts(page, '#cta .cta-band__notes li')).toEqual([]);
    expect(compact(await page.locator('#cta').textContent())).not.toContain('Public procurement follows the agency’s own timeline');
    await open(page, 'partner-with-us/universities/');
    expect(await texts(page, '#cta .cta-band__notes li')).toContain('Timing follows your academic calendar: tracks and campus labs are agreed in co-design before the first cohort starts.');
  });
});

test.describe('NU diploma course pages: "What You Will Work On" is gone, "What You Study" keeps every module (item 6)', () => {
  for (const route of ['programs/nu-postgraduate-diploma/ict/', 'programs/nu-postgraduate-diploma/digital-marketing/']) {
    test(`${route}: no #why band, the modules and the internship sentence stay, and the bands keep alternating`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('#why')).toHaveCount(0);
      const text = await mainText(page);
      expect(text).not.toMatch(/What You Will Work On|Why This Course|Each point below comes from the course/);
      // "What You Study": the lead sentence (internship, project, seminar) and every module in the list
      const curriculum = page.locator('#curriculum');
      await expect(curriculum.locator('h2')).toHaveText('What You Study');
      expect(compact(await curriculum.locator('.sh .lead, header .lead').first().textContent())).toContain('The final module combines internship, project work and a seminar');
      const summary = compact(await curriculum.locator('summary').textContent());
      const total = Number(/View All (\d+) Modules/.exec(summary)?.[1]);
      expect(total).toBeGreaterThan(5);
      await expect(curriculum.locator('.modgrid__item')).toHaveCount(total);
      // the band sequence: no two airy bands in a row where the removed white band used to sit; no two dark bands in a row
      const bands = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main > section.band, main section.band')).map((s) => ({ id: s.id, tone: /band--(white|airy|ice|klein|deep-ink)/.exec(s.className)?.[1] ?? '' })),
      );
      expect(bands.map((b) => b.id)).toEqual(['before-you-apply', 'who', 'curriculum', 'also-consider', 'faq', 'cta', '']);
      expect(bands.map((b) => b.tone)).toEqual(['white', 'white', 'airy', 'white', 'ice', 'airy', 'white']);
      for (let i = 1; i < bands.length; i++) expect(['klein', 'deep-ink'].includes(bands[i].tone) && ['klein', 'deep-ink'].includes(bands[i - 1].tone), `${bands[i - 1].id} then ${bands[i].id}`).toBe(false);
      // nothing links to the removed anchor
      expect(await page.locator('a[href$="#why"], a[href$="#why-h"]').count()).toBe(0);
    });
  }

  test('no page on the site links to the removed NU #why anchor', () => {
    const links = builtPages().filter((p) => /programs\/nu-postgraduate-diploma\/[a-z-]+\/#why/.test(p.html)).map((p) => p.route);
    expect(links).toEqual([]);
  });
});

test.describe('About: "On This Page" is back under the hero, one link for each of the main bands (item 7)', () => {
  // WP51 (cycle-26 review): the list had left out two existing H2s, "The People Who Started It" (#founders) and "Industry Recognition" (#recognition); it links all eight bands now
  const LABELS = ['Why We Exist', 'Where We Are Today', 'An Independent Randomized Trial', 'From a Copenhagen Launch to National Programs', 'The People Who Started It', 'Four Principles Behind Every Program', 'Industry Recognition', 'Start a Conversation'];

  test('the list sits directly after the hero and before the first band, links the eight H2s in page order, and every label is the heading it opens (Title Case)', async ({ page }) => {
    await open(page, 'about/');
    const nav = page.locator('nav[aria-label="On this page"]');
    await expect(nav).toHaveCount(1);
    await expect(nav.locator('h2')).toHaveText('On This Page');
    const links = await nav.locator('a').evaluateAll((els) => els.map((a) => ({ label: (a.textContent ?? '').replace(/\s+/g, ' ').trim(), id: (a.getAttribute('href') ?? '').replace(/^.*#/, '') })));
    expect(links.map((l) => l.label)).toEqual(LABELS);
    for (const l of links) {
      expect(l.label, `"${l.label}" is Title Case`).toBe(titleCase(l.label));
      await expect(page.locator(`#${l.id}`), `#${l.id} exists once`).toHaveCount(1);
      expect(compact(await page.locator(`#${l.id} h2`).first().textContent()), `the H2 under #${l.id}`).toBe(l.label);
    }
    // the anchors follow the page's own order, and the list sits between the hero and the Mission band
    const order = await page.evaluate((ids) => {
      const tops = ids.map((id) => document.getElementById(id)!.getBoundingClientRect().top + window.scrollY);
      const nav = document.getElementById('on-this-page')!.getBoundingClientRect().top + window.scrollY;
      const hero = document.querySelector('main .hero')!.getBoundingClientRect().bottom + window.scrollY;
      return { ascending: tops.every((t, i) => i === 0 || t > tops[i - 1]), afterHero: nav >= hero - 1, beforeMission: nav < tops[0] };
    }, links.map((l) => l.id));
    expect(order).toEqual({ ascending: true, afterHero: true, beforeMission: true });
    // the hero keeps its single text link and no primary button; the list adds no new prose
    await expect(page.locator('main .hero .btn--primary')).toHaveCount(0);
    await expect(page.locator('#on-this-page p')).toHaveCount(0);
  });

  test('a link opens its band, and the page has no horizontal overflow on a phone or a desktop', async ({ page }) => {
    await open(page, 'about/');
    await page.locator('nav[aria-label="On this page"]').getByRole('link', { name: 'Start a Conversation' }).click();
    await expect(page).toHaveURL(/#about-cta$/);
    await expect(page.locator('#about-cta-h')).toBeInViewport();
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, 'about/');
      expect(await noOverflow(page), `${vp.width}px`).toBe(true);
    }
  });
});

test.describe('JobReady Platform: the record band is "The Record Behind JobReady" (item 8)', () => {
  test('the H2 and the jump link carry the new heading, the jump link still opens #why, and the old heading is gone from the site', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    await expect(page.locator('#why h2')).toHaveText('The Record Behind JobReady');
    expect(titleCase('The Record Behind JobReady')).toBe('The Record Behind JobReady');
    const toc = page.locator('.lf-toc nav a', { hasText: 'The Record Behind JobReady' });
    await expect(toc).toHaveCount(1);
    expect(await toc.getAttribute('href')).toMatch(/#why$/);
    expect(await texts(page, '.lf-toc nav a')).toEqual(['Four Jobs, One Platform', 'Rollout Status', 'The Record Behind JobReady', 'Planned Adaptive Learning', 'Questions About the Platform']);
    // the band still shows the three labelled groups (delivered, in the pipeline, contracted scope)
    expect(await texts(page, '#why .jr__whyh')).toEqual(['Delivered Since 2014', 'In the Pipeline', 'Contracted Scope']);
    expect(await mainText(page)).not.toContain('Why Institutions Choose JobReady');
    expect(builtPages().filter((p) => p.html.includes('Why Institutions Choose JobReady')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('The contract-scope note says who trained whom, and Home’s slide 2 names its subject (item 9)', () => {
  // WP48 (cycle-23 review): the note reads "The figure is contract scope, not a count of completers. In Her Power, the national program trained 25,125 women; CodersTrust trained 2,500 women directly." (it was "The total is ... ; it includes Her Power’s national program, which trained ...")
  const NOTE = 'The figure is contract scope, not a count of completers. It includes Her Power’s national program, which trained 25,125 women and met its target; CodersTrust trained 2,400 women directly.';

  // WP51 (cycle-26 review, Kimi m2): the Governments tile kept the note's first sentence and pointed to its contracts table; the Impact tile reads the register note.
  // WP57 (cycle-29 review, Grok R2 with Gemini GM1): R2 restores the note's WP35 wording on the Governments tile and Home slide 2 ("The total is contract scope, not a count of completers; it includes Her Power’s national program (25,125 women trained; CodersTrust trained 2,500 directly)."), which WP46
  // had retired so the 25,125 is not read as CodersTrust's own count; the two pages that print it say "Her Power’s national program", and the Impact tile keeps the register's note, which adds that CodersTrust trained 2,500 women directly.
  test('the register’s GV-12 note and the Impact tile read the same note; the Governments tile and Home slide 2 say the total includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly), and (WP59, GPT-6.1 Sol G1) the Investors and JobReady Platform tiles say it too and no other page does', async ({ page }) => {
    expect(fact('GV-12').stat?.glance?.note).toBe(NOTE);
    // the figures in the note are the register’s own (GV-01 and GV-13), and the register’s GV-12 text keeps the National University sentence
    expect(fact('GV-01').text).toContain('a national program that trained 25,125 women');
    expect(fact('GV-13').text).toContain('2,400 women trained directly by CodersTrust');
    // WP47 (cycle-22 review): the register’s GV-12 text now says "work scoped for" (it read "scopes covering"); tests/wp47.spec.ts pins the new sentence
    expect(fact('GV-12').text).toBe('Six government contracts with training and curriculum work scoped for 30,000+ people; official training partner of Bangladesh’s National University for digital career skills and credentials, onboarding 1.5M+ learners');
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance a[data-fact~="GV-12"] .glance__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly). Her Power’s 25,125 is the same group counted in the 150,000+ enrollments through CodersTrust’s curriculum, not additional people.');
    expect(await page.locator('#glance a[data-fact~="GV-12"]').getAttribute('data-fact')).toContain('GV-11');
    await open(page, 'partner-with-us/governments/');
    expect(compact(await page.locator('#glance li', { hasText: '30,000+' }).locator('.pg__note').textContent())).toBe('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).');
    await open(page, '');
    const lead = compact(await slide(page, 2).locator('.hs__lead').textContent());
    expect(lead).toBe('Six government contracts with training and curriculum work scoped for 30,000+ people, not a count of completers. Her Power, one of the six, trained 25,125 women nationally, its full target; CodersTrust trained 2,400 directly. As the official training partner of Bangladesh’s National University for digital career skills and credentials, CodersTrust is onboarding 1.5M+ of the university’s own learners, who are not learners trained by CodersTrust.');
    expect(NOTE.startsWith('The figure is contract scope, not a count of completers.')).toBe(true);
    expect(await slide(page, 2).locator('.hs__lead').getAttribute('data-fact')).toBe('GV-12 GV-01 GV-11 SC-04');
    expect(builtPages().filter((p) => p.html.includes('national program, which trained 25,125 women (CodersTrust trained 2,400 directly)')).map((p) => p.route).sort()).toEqual(['/impact/', '/our-model/jobready-platform/', '/partner-with-us/governments/', '/partner-with-us/investors/']);
  });
});

// WP52 (cycle-27 review, Grok m1): the Investors Track Record band no longer opens with the guide line ("Impact investors need to see what is proven and what is still being built."); it starts with its record (tests/wp52.spec.ts)
test.describe('Investors: the guide band has no empathy line, and the "only promised" test stays gone (item 13)', () => {
  test('the band starts with its heading and the origin line; the "only promised" wording is gone', async ({ page }) => {
    await open(page, 'partner-with-us/investors/');
    await expect(page.locator('#guide .ig__empathy')).toHaveCount(0);
    expect(await mainText(page)).not.toContain('only promised');
  });
});

// WP49 (cycle-24 review): the band's heading is "What Happens Next" (it was "What Happens After You Say Yes", which presumed a commitment; tests/wp49.spec.ts)
// WP51 (cycle-26 review, Kimi m1): the partner line moved, unchanged, from the closing strip into the Track Record band, directly after the BIGD line (tests/wp51.spec.ts); the closing strip keeps the first-action line alone
test.describe('Foundations: "What Happens Next" has the four steps, and the partner line is not mislabeled (item 14)', () => {
  test('the band leads with "For cohort grants.", shows the Development Partners steps (PD-04), and the partner line is "Organizations that have worked with CodersTrust include…", in the Track Record band', async ({ page }) => {
    await open(page, 'partner-with-us/foundations/');
    const band = page.locator('#next-steps');
    await expect(band.locator('h2')).toHaveText('What Happens Next');
    expect(compact(await band.locator('.lead').textContent())).toBe('For platform grants, the first conversation covers JobReady’s infrastructure and staged rollout. For cohort grants, the steps below show target timing for grant-funded pilots.');
    const stepsOf = async () => (await texts(page, '#next-steps ol h3')).map((t) => t.replace(/^Step \d: /, ''));
    const foundations = await stepsOf();
    await open(page, 'partner-with-us/development-partners/');
    expect(foundations, 'the same four steps as Development Partners').toEqual(await stepsOf());
    expect(foundations).toEqual(['Discovery (Week 1)', 'Co-Design (Week 2)', 'Agreement (Week 3)', 'Training Starts 6–8 Weeks After Signing']);
    await open(page, 'partner-with-us/foundations/');
    expect(compact(await page.locator('#guide').textContent())).toContain('Organizations that have worked with CodersTrust include the Rockefeller Foundation, DANIDA and Porticus.');
    expect(compact(await page.locator('#reinforce').textContent())).not.toContain('Organizations that have worked with CodersTrust include');
    expect(await mainText(page)).not.toMatch(/Development and NGO partners include|introductory call/);
    // the platform route is still scoped in the discovery session, by the agenda in the call-to-action band above
    expect(compact(await page.locator('#cta [data-session-agenda]').textContent())).toContain('For a platform grant, we discuss JobReady’s staged rollout.');
    // no horizontal overflow on a phone
    await page.setViewportSize(MOBILE);
    await open(page, 'partner-with-us/foundations/');
    expect(await noOverflow(page)).toBe(true);
  });

  test('JobReady Platform: its closing line also says "discovery session" where it said "introductory call"', async ({ page }) => {
    await open(page, 'our-model/jobready-platform/');
    const aside = compact(await page.locator('.jr__next').textContent());
    expect(aside).toContain('A platform grant helps CodersTrust roll out the remaining modules; details are shared in the discovery session.');
    expect(aside).not.toContain('introductory call');
  });
});

test.describe('Home: the investor route card says what JobReady is (item 15)', () => {
  // WP48 (cycle-23 review, item 33): the card also states the investor's route: "Back JobReady, the platform we are building to connect emerging-market youth to work." (tests/wp48.spec.ts)
  // WP49 (cycle-24 review): the card's title is "Investors" (it was "Impact Investors"); its text is unchanged
  // WP50 (cycle-25 review, item 14): the text is "Back the staged rollout of JobReady, CodersTrust’s digital education and employment platform." (IN-04's definition; tests/wp50.spec.ts)
  // WP53 (owner decision 2026-10-16): IN-04's definition is "CodersTrust’s digital learning and earning platform", so the card reads "... digital learning and earning platform." (tests/wp53.spec.ts)
  test('the "Investors" card reads "Back the staged rollout of JobReady, CodersTrust’s digital learning and earning platform."', async ({ page }) => {
    await open(page, '');
    const card = page.locator('#router .cat', { has: page.locator('.cat__title', { hasText: 'Investors' }) });
    await expect(card).toHaveCount(1);
    expect(compact(await card.textContent())).toContain('Back the staged rollout of JobReady, CodersTrust’s digital learning and earning platform.');
    expect(compact(await card.textContent())).not.toContain('For impact investors:');
    expect(await mainText(page)).not.toContain('For impact investors backing JobReady');
  });
});

test.describe('Track Record bands: "with progressive levels" is gone (item 16)', () => {
  test('no Track Record band says the method has progressive levels; TalentLEAP’s worked example and the qualified sentences keep it', async () => {
    const claim = /(?:Our method|Our TalentLEAP method|TalentLEAP, our method,|and TalentLEAP|TalentLEAP) organizes skills into career paths with progressive levels/;
    const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const offenders: string[] = [];
    for (const p of builtPages()) {
      if (p.route === '/our-model/talentleap/') continue;
      for (const m of visibleText(p.html).matchAll(/[^.]*progressive levels[^.]*\./g)) {
        const sentence = compact(m[0]);
        if (claim.test(sentence)) offenders.push(`${p.route}: ${sentence}`);
      }
    }
    expect(offenders, 'unqualified "organizes skills into career paths with progressive levels" outside TalentLEAP’s worked example').toEqual([]);
    // the worked example on the TalentLEAP page stays as it was: it names the three levels it is an example of
    const talentleap = builtPages().find((p) => p.route === '/our-model/talentleap/')!;
    expect(visibleText(talentleap.html)).toContain('TalentLEAP organizes skills into career paths with progressive levels. In this example the levels are Competent, Proficient and Expert.');
  });

  test('Home and Investors read "…organizes skills into career paths." and keep their TalentLEAP link', async ({ page }) => {
    await open(page, '');
    expect(compact(await page.locator('#guide .guide__method').textContent())).toBe('Our method organizes skills into career paths. We call it TalentLEAP. How TalentLEAP Works');
    await open(page, 'partner-with-us/investors/');
    expect(compact(await page.locator('#guide .ig__method').textContent())).toBe('TalentLEAP, our method, organizes skills into career paths. How TalentLEAP Works');
  });
});

test.describe('Our Model: the scale card says delivery is designed to run 10 cohorts in parallel (item 17)', () => {
  // WP65 (cycle-37 review): the subject was "delivery" and month 5 was "of a program"; WP67 (cycle-38 review, Grok): "After about five months of delivery, programs are designed to run up to 10 ..." (tests/wp34.spec.ts pins the whole sentence); the design wording ("are designed to run", never "can run") is item 17's
  test('"Local Labs, Coordinated Delivery" reads "programs are designed to run up to 10 certification cohorts in parallel", as Q2 and Investors say "designed"', async ({ page }) => {
    await open(page, 'our-model/');
    const scale = page.locator('#delivery .card', { hasText: 'Local Labs, Coordinated Delivery' });
    expect(compact(await scale.textContent())).toContain('programs are designed to run up to 10 certification cohorts in parallel');
    expect(await mainText(page)).not.toContain('programs can run up to 10');
    expect(await mainText(page)).not.toContain('delivery can run up to 10');
    expect(faqs.find((f) => f.id === 'Q2')!.a).toContain('larger programs are designed to run up to 10 cohorts in parallel');
  });
});

test.describe('About: the 2022–2024 timeline entry says the government contracts are in Bangladesh (item 19)', () => {
  test('"Government contracts in Bangladesh, including Her Power, EDGE and SKIT;" and the three contracts are registered as Bangladesh bodies’ (GV-01, GV-02, GV-03)', async ({ page }) => {
    await open(page, 'about/');
    expect(compact(await page.locator('#story').textContent())).toContain('Government contracts in Bangladesh, including Her Power, EDGE and SKIT; partnerships with National University');
    expect(fact('PA-02').text).toContain('Bangladesh’s ICT Division, DoICT, Bangladesh Hi-Tech Park Authority, NSDA and BCC');
    expect(fact('GV-03').text).toContain('Bangladesh Hi-Tech Park Authority');
    expect(fact('GV-02').text).toContain('with BCC');
    expect(fact('GV-01').text).toContain('DoICT');
  });
});

test.describe('Governments: "What a Ministry Sees" is gone and its follow-up surveys sit in the delivery card (item 20)', () => {
  test('no #ministry-sees band; the "Local, Remote and Global Work" card names the surveys; the neighbors are not the same ground; no unused anchor link', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#ministry-sees')).toHaveCount(0);
    const text = await mainText(page);
    expect(text).not.toMatch(/What a Ministry Sees|Monthly Reports Begin|The 6-Month Follow-Up Survey/);
    expect(count(text, 'follow-up surveys at 3, 6 and 12 months after each course'), 'stated once').toBe(1);
    const bands = await page.evaluate(() => Array.from(document.querySelectorAll('main section.band')).map((s) => ({ id: s.id, tone: /band--(white|airy|ice|klein|deep-ink)/.exec(s.className)?.[1] ?? '' })));
    const features = bands.findIndex((b) => b.id === 'features');
    expect(bands[features].tone).toBe('white');
    expect(bands[features + 1]).toEqual({ id: 'faq', tone: 'ice' });
    expect(builtPages().filter((p) => p.html.includes('#ministry-sees')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Outcomes 2026: the download link names the data, not the file (item 21)', () => {
  test('the link reads "Download the Survey Aggregates (CSV)" and still downloads the CSV', async ({ page }) => {
    await open(page, 'impact/outcomes-2026/');
    const link = page.locator('#download a.ro__dl');
    await expect(link).toHaveText('Download the Survey Aggregates (CSV)');
    expect(await link.getAttribute('href')).toMatch(/\/data\/outcomes-2026-aggregates\.csv$/);
    expect(await link.getAttribute('download')).not.toBeNull();
    expect(await mainText(page)).not.toContain('Download outcomes-2026-aggregates.csv');
  });
});

test.describe('The WSDFM card says its 71% is program records, not trial data (item 23)', () => {
  test('every page that shows the WSDFM caption reads "WSDFM program records (not trial results; the trial’s 425 women offered a place were among these 1,000): 71% of enrolled women in work"', async () => {
    const withCaption = builtPages().filter((p) => p.html.includes('WSDFM program records (not trial results; the trial’s 425 women offered a place were among these 1,000): 71% of enrolled women in work'));
    // WP51 (cycle-26 review): Home's card shows delivery context in place of the figure and its caption (the fourth carousel slide states the figure), so Home is not in the list
    expect(withCaption.map((p) => p.route).filter((r) => r !== '/styleguide/').sort()).toEqual(['/partner-with-us/development-partners/', '/partner-with-us/foundations/', '/partner-with-us/local-partners/', '/programs/youthwide/']);
    // the old caption is gone everywhere (Impact’s tile has its own label, "WSDFM program records: enrolled women in work (71%)", and its own note, "Program records, separate from the randomized trial of CodersTrust’s WSDFM program.": different lines, unchanged)
    expect(builtPages().filter((p) => p.html.includes('program records, separate from the trial')).map((p) => p.route)).toEqual([]);
  });
});

test.describe('Universities and Employers: no card restates the 72% tile (item 24)', () => {
  test('Employers: the first card says only "AI skills are the hardest to find (ManpowerGroup, 2026)."; Universities: two pains remain, side by side, and the 72% tile and its footnote stay', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const first = page.locator('#problem .gp__pains li').first();
    expect(compact(await first.locator('.gp__q').textContent())).toBe('You Struggle to Find the Digital Talent You Need');
    expect(compact(await first.locator('.gp__a').textContent())).toBe('AI skills are the hardest to find (ManpowerGroup, 2026).');
    await expect(page.locator('#problem [data-fact="PX-05"]')).toContainText('72%');
    await open(page, 'partner-with-us/universities/');
    expect(await texts(page, '#problem .gp__pains .gp__q')).toEqual(['Degree Holders Struggle to Find Work', 'Placement Results Are Hard to Publish']);
    expect(await mainText(page)).not.toContain('Employers report difficulty finding the talent they need.');
    await expect(page.locator('#problem [data-fact="PX-05"]')).toContainText('72%');
    // the two cards fill the row: no empty third column on a desktop, one column on a phone
    await page.setViewportSize(DESKTOP);
    await open(page, 'partner-with-us/universities/');
    const boxes = await page.locator('#problem .gp__pains li').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
    const list = await page.locator('#problem .gp__pains').evaluate((e) => e.getBoundingClientRect());
    expect(boxes).toHaveLength(2);
    expect(boxes[1].right, 'the second card ends at the right edge of the list').toBeGreaterThan(list.right - 4);
    await page.setViewportSize(MOBILE);
    await open(page, 'partner-with-us/universities/');
    expect(await noOverflow(page)).toBe(true);
  });
});

test.describe('Employers: "For Hiring" has two steps in the training route’s step component (item 25)', () => {
  test('Discovery (the scoping sentence) and Introductions (the placement-team sentence), both wording the page already has, tied to IN-04, after the four training steps', async ({ page }) => {
    await open(page, 'partner-with-us/employers/');
    const hiring = page.locator('#next-steps .route', { has: page.locator('h3', { hasText: 'For Hiring' }) });
    expect((await hiring.locator('ol h4').allTextContents()).map((t) => compact(t).replace(/^Step \d: /, ''))).toEqual(['Discovery', 'Introductions']);
    expect((await hiring.locator('.steps__text').allTextContents()).map(compact)).toEqual([
      'A conversation about the roles you want to fill, to scope your talent request.',
      'Job-ready candidates are introduced through CodersTrust’s placement team.',
    ]);
    expect(await hiring.locator('[data-fact]').first().getAttribute('data-fact')).toBe('IN-04');
    await expect(page.locator('#next-steps .route').first().locator('ol li')).toHaveCount(4);
    // both sentences are already on the page (the "Hire Talent" band), so no wording was added
    const text = await mainText(page);
    expect(count(text, 'Job-ready candidates are introduced through CodersTrust’s placement team.')).toBe(2);
    await page.setViewportSize(MOBILE);
    await open(page, 'partner-with-us/employers/');
    expect(await noOverflow(page)).toBe(true);
  });
});

test.describe('Our Model: the cost FAQ is the one-line route answer with a link to the hub (item 26)', () => {
  test('the answer, its link label (the answer’s closing sentence), the PD-02 tie and the hub anchor it opens', async ({ page }) => {
    await open(page, 'our-model/');
    const item = page.locator('details', { has: page.locator('summary', { hasText: 'What Does It Cost?' }) });
    expect(compact(await item.locator('.faq__a').textContent())).toBe('Pricing is set per program; we share an indicative budget in the discovery session. See what a supported cohort includes.');
    const href = (await item.locator('.faq__a a').getAttribute('href')) ?? '';
    expect(href).toMatch(/\/partner-with-us\/#faqs$/);
    await open(page, href.replace(/^\/ctg\//, ''));
    await expect(page.locator('#faqs')).toHaveCount(1);
    await expect(page.locator('#faqs details', { has: page.locator('summary', { hasText: 'What Does It Cost?' }) })).toHaveCount(1);
  });
});

test.describe('Impact: the freelancing tile carries no second claim (item 27)', () => {
  test('OC-04’s note is the business-ownership sentence only, the tile no longer carries OC-07, and the survey page still states the foreign-client share', async ({ page }) => {
    expect(fact('OC-04').stat?.glance?.note).toBe('Business ownership rose from 3.0% to 10.3%.');
    await open(page, 'impact/');
    const tile = page.locator('#glance a[data-fact~="OC-04"]');
    await expect(tile.locator('.glance__note')).toHaveText('Business ownership rose from 3.0% to 10.3%.');
    expect(await tile.getAttribute('data-fact')).not.toContain('OC-07');
    await open(page, 'impact/outcomes-2026/');
    expect(await mainText(page)).toContain('About 12%');
  });
});

test.describe('Home: the post-inquiry steps are labelled "For Grant-Funded Pilots" (item 28)', () => {
  test('the eyebrow reads "Target Timing for Grant-Funded Pilots", and no page labels the steps "For Grant-Funded Cohorts"', async ({ page }) => {
    await open(page, '');
    await expect(page.locator('#next-steps .eyebrow').first()).toHaveText('Target Timing for Grant-Funded Pilots');
    expect(builtPages().filter((p) => p.html.includes('For Grant-Funded Cohorts')).map((p) => p.route)).toEqual([]);
  });
});

// WP48 (cycle-23 review, item 32, a logic error this item introduced): OC-05 is cumulative and includes the 23.3% who first earned DURING the course, so "started earning within six months of finishing the course"
// contradicted itself (they started before it ended). The wording is "had started earning by six months after finishing" (tests/wp48.spec.ts pins the rest of item 32).
test.describe('OC-05: the six months are counted from the end of the course (item 29, owner answer 2026-10-15; "by", not "within": item 32 of cycle 23)', () => {
  const TEXT = 'Among the 172 surveyed completers who first earned during or after training: 23.3% first earned during the course; 58.7% had started earning by six months after finishing it; 77.3% by a year; 90.7% by two years (cumulative)';
  // WP49 (cycle-24 review): the labels say "surveyed new earners" (the register's term; the text field keeps the full definition; tests/wp49.spec.ts)
  const LABEL = 'of the 172 surveyed new earners had started earning by six months after finishing the course (October 2026 survey)';
  const GLANCE = 'of the 172 surveyed new earners had started earning by six months after finishing the course, including 23.3% who first earned during the course';
  // WP52 (cycle-27 review): Home's slide and the Impact tile define the term in place (OC-05's label with "(completers who first earned during or after training)" after it); the register's labels are unchanged (tests/wp52.spec.ts)
  const define = (s: string) => s.replace('surveyed new earners', 'surveyed new earners (completers who first earned during or after training)');

  test('the register states the reference point in its text, stat label and glance label', () => {
    const oc05 = fact('OC-05');
    expect(oc05.text).toBe(TEXT);
    expect(oc05.stat?.label).toBe(LABEL);
    expect(oc05.stat?.glance?.label).toBe(GLANCE);
    expect(oc05.stat?.value).toBe('58.7%');
  });

  // WP53 (owner decision 2026-10-16): the speed slide ("Most Surveyed New Earners Were Earning by Six Months After the Course") is gone; the survey slide's one body line is OC-05's value and the register's label with the term defined (WP52),
  // without the label's closing "(October 2026 survey)", which the slide's own eyebrow ("Impact Survey 2026") says. WP54 (cycle-28 reviews, Claude S23 and GLM L1): the line leads with its base, in the words of OC-05's text, and needs no term
  test('Home slide 3 shows OC-05’s value and the register’s closing clause in its body line, "had started earning by six months after finishing the course" (WP54: the line leads with its base)', async ({ page }) => {
    await open(page, '');
    const s = slide(page, 3);
    expect(await s.locator('.hs__lead').getAttribute('data-fact')).toBe('OC-05');
    const line = compact(await s.locator('.hs__lead').textContent());
    expect(line).toBe(`Of the 172 surveyed completers who first earned during or after training, 58.7% ${LABEL.replace(/^of the 172 surveyed new earners /, '').replace(/ \(October 2026 survey\)$/, '')}.`);
    expect(line).toContain('had started earning by six months after finishing the course');
  });

  test('Impact’s tile and Outcomes 2026 (summary tile, paragraph, chart note, data file) all read the reference point from the fact', async ({ page }) => {
    await open(page, 'impact/');
    expect(compact(await page.locator('#glance a[data-fact~="OC-05"]').textContent())).toContain(define(GLANCE));
    await open(page, 'impact/outcomes-2026/');
    expect(compact(await page.locator('#summary [data-fact="OC-05"]').textContent())).toContain(LABEL);
    expect(compact(await page.locator('#speed p[data-fact="OC-05"]').textContent())).toContain(`${TEXT}.`);
    expect(compact(await page.locator('#speed .colc__note').textContent())).toBe('Months are counted from the end of the course; the shares are cumulative and include earnings during the course.');
    expect(await texts(page, '#speed .colc__label')).toEqual(['During the Course', 'By 3 Months', 'By 6 Months', 'By 12 Months', 'By 2 Years']);
    const csv = readFileSync('public/data/outcomes-2026-aggregates.csv', 'utf8');
    const rows = csv.split('\n').filter((l) => l.startsWith('OC-05,'));
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r, r).toContain('with months counted from the end of the course and including earnings during the course (timing only)');
  });

  test('no built page says "within six months" (OC-05 counts those who started during the course too); the three pages that state it say "by six months after"', () => {
    const old = builtPages().filter((p) => /within six months/i.test(p.html)).map((p) => p.route);
    expect(old).toEqual([]);
    const named = builtPages().filter((p) => /by six months after (?:finishing|the course)/i.test(p.html)).map((p) => p.route).sort();
    expect(named).toEqual(['/', '/impact/', '/impact/outcomes-2026/']);
  });
});
