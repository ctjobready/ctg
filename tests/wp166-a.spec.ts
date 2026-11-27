import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { CTAS, CTA_KEYS } from '../src/data/ctas';
import { navGroups, audiences } from '../src/data/nav';
import { DEFAULT_OG, ogCardFor } from '../src/lib/og';
import { DIST_DIR } from './support/env';
import { open } from './support/browser';

/**
 * WP166-A (marketing-effectiveness copy review, owner approval of 21 November 2026): package A, the findings of R1 (Home, About, its sub-pages and the team pages) and R7 (menus, header, footer,
 * page titles and meta descriptions, Contact, Careers, the Blog index, the prefilled emails and the shared CTA band with the phone number as a second route).
 * Run `npm run build`, then `PORT=4911 npx playwright test tests/wp166-a.spec.ts --project=chromium`. Most tests read the built files; a few open a page.
 *   Home        twelve bands in the approved order (offer at band 9), the removed bands gone, title and description, H1 and lead, the trial card's benchmark, the funders' row under the hero,
 *               "Results You Can Check" and its slide order, the peer-reviewed callout, the router lines, the folded research findings, the mechanism band's training sentence, TalentLEAP line and
 *               scope sentence, the learner heading, the one credibility band, the YouthWIDE line and the closing band's promise.
 *   Chrome      the menu lines and featured panels, "Randomized Trial Results" in the menu, drawer and footer, the email templates (name, time zone), the CTA labels.
 *   Phone line  "Prefer to call? +1 212 344 4111" beside the main CTA on Contact and every /partner-with-us/ page, and nowhere else.
 *   Pages       Contact, Careers, the Blog index, About, Governance, Mentors, Recognition, Team and the six leadership profiles; the other titles and descriptions; the three regenerated share cards.
 *   Dates       the pages with their own date whose visible text changed read 2026-11-21.
 */

const TODAY = '2026-11-21';
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
/** Readable text: comments, scripts, styles and screen-reader-only notes removed, tags stripped, non-breaking spaces as spaces, no space before punctuation. */
const visible = (raw: string) =>
  decode(
    raw
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ ‑]/g, (c) => (c === '‑' ? '-' : ' '))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:)?])/g, '$1')
    .trim();
const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const mainText = (rel: string) => visible(mainRaw(rel));
/** The raw HTML of the element with that id, from its opening tag to the matching closing tag (nesting counted). */
function byId(rel: string, tag: string, id: string): string {
  const raw = html(rel);
  const open = new RegExp(`<${tag}\\b[^>]*\\bid="${id}"[^>]*>`).exec(raw);
  expect(open, `<${tag} id="${id}"> is on ${rel}`).toBeTruthy();
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'g');
  re.lastIndex = open!.index;
  let depth = 0;
  for (let m = re.exec(raw); m; m = re.exec(raw)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return raw.slice(open!.index, re.lastIndex);
  }
  throw new Error(`${rel}: <${tag} id="${id}"> is not closed`);
}
const count = (hay: string, needle: string) => hay.split(needle).length - 1;
const titleOf = (rel: string) => decode(/<title>([^<]*)<\/title>/.exec(html(rel))?.[1] ?? '');
const meta = (rel: string, attr: 'name' | 'property', key: string) => decode(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`).exec(html(rel))?.[1] ?? '');
type Node = Record<string, unknown>;
const ld = (rel: string): Node[] =>
  [...html(rel).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const j = JSON.parse(m[1]) as Node;
    return ((j['@graph'] as Node[] | undefined) ?? [j]) as Node[];
  });
const webPageModified = (rel: string) => (ld(rel).find((n) => [n['@type']].flat().some((t) => /Page$/.test(String(t)))) as Node | undefined)?.dateModified;
/** The decoded body of the first mailto: link on a page whose subject starts with `subject`. */
const mailBody = (rel: string, subject: string): string => {
  const hrefs = [...html(rel).matchAll(/href="(mailto:[^"]+)"/g)].map((m) => decode(m[1]));
  const href = hrefs.find((h) => decodeURIComponent(/subject=([^&]*)/.exec(h)?.[1] ?? '').startsWith(subject));
  expect(href, `${rel} has a mailto: link with the subject "${subject}…"`).toBeTruthy();
  return decodeURIComponent(/body=([^&]*)/.exec(href!)?.[1] ?? '');
};

const HOME = 'index.html';
const CONTACT = 'contact/index.html';
const CAREERS = 'careers/index.html';
const BLOG = 'blog/index.html';
const ABOUT = 'about/index.html';
const GOV = 'about/governance/index.html';
const MENTORS = 'about/mentors/index.html';
const RECOGNITION = 'about/recognition/index.html';
const TEAM = 'about/team/index.html';
const profile = (slug: string) => `about/team/${slug}/index.html`;

/* ============================================================================================== */
test.describe('Home: twelve bands, the offer at band 9 (R1-08, owner approval item 1)', () => {
  test('the bands run in the approved order, each with its heading', () => {
    const raw = html(HOME);
    const bands = [...raw.matchAll(/<div class="tone[^"]*" data-cmf="([^"]+)"/g)].map((m) => m[1]);
    expect(bands).toEqual(['C1', 'GEO', 'RESULTS', 'ROUTER', 'C2', 'C6', 'C7', 'C5', 'C11', 'C9', 'C13', 'C14']);
    expect(bands.indexOf('C11') + 1, 'the offer is band 9').toBe(9);
    const h2 = [...mainRaw(HOME).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => visible(m[1]));
    const want = [
      'Proof at a Glance',
      'What Is CodersTrust?',
      'Results You Can Check',
      'What Brings You Here?',
      'Education Alone Is Not Leading to Jobs',
      'One Path from Learning to Earning',
      'Proof in Practice',
      'Three Learners Who Turned Training into Paid Work',
      'We’ve Built This Path Since 2014',
      'Choose Where to Start',
      'Questions Partners Ask',
      'Let’s Design Your First Cohort',
      'What Happens Next',
    ];
    expect(h2.filter((h) => want.includes(h))).toEqual(want);
  });

  test('the Cost of Waiting, Imagine, Compare, Includes and separate Recognition and World bands are gone, with "Our Approach" and the launch story', () => {
    const raw = mainRaw(HOME);
    for (const id of ['cost', 'future', 'compare', 'features']) expect(raw, `#${id}`).not.toMatch(new RegExp(`\\bid="${id}"`));
    const text = mainText(HOME);
    for (const gone of [
      'Training and Evidence Fall Behind While You Wait',
      'What It Means',
      'Imagine the Next 12 Months',
      'Three illustrative scenarios, not case studies.',
      'How CodersTrust Compares with Self-Paced Courses',
      'What a Supported Youth Cohort Includes',
      'Our Approach',
      'CodersTrust connects training, mentoring and placement support for educated, unemployed and underemployed youth',
      'CodersTrust launched in 2014 in Copenhagen',
      'University Partners National University (official training partner',
      'Early press coverage, 2014–2016, and the World Bank pages',
      'Employment effect, not income',
      'Learner Journeys',
    ])
      expect(text, gone).not.toContain(gone);
    expect(raw).not.toContain('>4×');
  });

  test('title, description and share text name the buyers, without "WSDFM" (R1-21, R7-03)', () => {
    expect(titleOf(HOME)).toBe('CodersTrust: Youth Jobs Programs for Funders and Governments');
    const d = 'CodersTrust trains and mentors educated, unemployed and underemployed youth for paid digital work. 130,000+ learners trained since 2014. See the evidence.';
    expect(meta(HOME, 'name', 'description')).toBe(d);
    expect(meta(HOME, 'property', 'og:description')).toBe(d);
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d).not.toContain('WSDFM');
  });

  test('the H1 and lead name what the funder gets and who it is for (R1-10, R1-03)', () => {
    expect(visible(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html(HOME))![1])).toBe('Turn Youth Unemployment into a Digital Workforce — and Show Who Starts Earning');
    expect(visible(/<p class="hh__lead"[^>]*>([\s\S]*?)<\/p>/.exec(html(HOME))![1])).toBe(
      'We help funders and governments move educated, unemployed and underemployed youth into paid digital work, with monthly reports on their progress.',
    );
  });

  test('the trial card is "Independent Randomized Trial" and states the nine-trial benchmark once, tagged RC-06a (R1-02)', () => {
    const card = /<li class="hh__card" data-fact="RC-02"[^>]*>([\s\S]*?)<\/li>/.exec(html(HOME))![1];
    expect(visible(/<p class="hh__eyebrow"[^>]*>([\s\S]*?)<\/p>/.exec(card)![1])).toBe('Independent Randomized Trial');
    expect(visible(/<p class="hh__figlabel"[^>]*>([\s\S]*?)<\/p>/.exec(card)![1])).toBe(
      'For every 100 women offered a place in CodersTrust’s 200-hour WSDFM program, about 10 more were in work than among 100 comparable women in the control group. That is more than four times the 2.3-point average across nine vocational-training trials.',
    );
    expect(card).toMatch(/<span data-fact="RC-06a"[^>]*>That is more than four times/);
    expect(count(mainText(HOME), 'more than four times the 2.3-point average')).toBe(1);
  });

  test('the funders’ logo row sits under the proof cards, captioned with the first sentence; the caveat is said once, under the rest of the wall (R1-05)', () => {
    const hero = byId(HOME, 'section', 'hero');
    const strip = /<section class="partners[^"]*hh__funders[^"]*"[\s\S]*?<\/section>/.exec(hero)?.[0] ?? '';
    expect(strip, 'the funders’ row is inside the hero').not.toBe('');
    expect(visible(/<p class="partners__title"[^>]*>([\s\S]*?)<\/p>/.exec(strip)![1])).toBe('Organizations we have worked with, 2014–2026.');
    for (const org of ['UNDP', 'World Bank Group', 'The Rockefeller Foundation']) expect(strip, org).toContain(`alt="${org}"`);
    const text = mainText(HOME);
    expect(count(text, 'These are working relationships, not endorsements.')).toBe(1);
    const guide = visible(byId(HOME, 'section', 'guide'));
    expect(guide.indexOf('Employers and Industry Partners')).toBeLessThan(guide.indexOf('These are working relationships, not endorsements.'));
    expect(guide).not.toContain('Funders and Development Partners');
  });

  test('"Results You Can Check": trial, survey, program records, then the government contracts; the first slide’s callout is the peer-reviewed publication (R1-11, R1-06)', () => {
    expect(visible(/<h2 class="hs__heading" id="results-h">([\s\S]*?)<\/h2>/.exec(html(HOME))![1])).toBe('Results You Can Check');
    const labels = [...html(HOME).matchAll(/aria-roledescription="slide" aria-label="([^"]+)"/g)].map((m) => decode(m[1]));
    expect(labels).toEqual([
      '1 of 4: Women Offered a Place Earned an Estimated 38% More per Month', // WP172 (owner decision 2026-11-27): the published study's figures (it was the 2022 report's 41%)
      '2 of 4: Surveyed Completers Report Higher Income',
      '3 of 4: Results by Program',
      '4 of 4: Six Government Contracts and a National University Partnership',
    ]);
    const proof = /<div class="hs__proof" data-fact="RC-15"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/.exec(html(HOME));
    expect(proof, 'the first slide’s callout is tagged RC-15').toBeTruthy();
    expect(visible(proof![1])).toBe('Peer-Reviewed Published in a peer-reviewed journal: Economic Development and Cultural Change (October 2026).');
    expect(fact('RC-15').text).toContain('Economic Development and Cultural Change 75(1): 367–399 (October 2026)');
  });

  test('the router cards state each audience page’s benefit; JobReady is defined where Home first names it (R1-04)', () => {
    const router = visible(byId(HOME, 'section', 'router'));
    for (const line of [
      'Report youth employment results, not just training numbers',
      'Build a national digital workforce through graduates and digital labs',
      'Fund outcomes you can track',
      'Back JobReady, CodersTrust’s digital learning and earning platform',
    ])
      expect(router, line).toContain(line);
    expect(router).not.toContain('Evidence-led delivery for your portfolio');
    expect(router).not.toContain('Back JobReady’s staged rollout');
  });

  test('pains 2 and 3 end with the research findings that prove them, tagged with their facts (R1-07)', () => {
    const problem = byId(HOME, 'section', 'problem');
    const p2 = /<li data-pain="P2" data-fact="([^"]*)"[^>]*>([\s\S]*?)<\/li>/.exec(problem)!;
    const p3 = /<li data-pain="P3" data-fact="([^"]*)"[^>]*>([\s\S]*?)<\/li>/.exec(problem)!;
    expect(p2[1]).toBe('RC-06');
    expect(visible(p2[2])).toContain('Showing who started earning, to a board or an evaluator, is much harder. A 2017 World Bank review of nine randomized vocational-training trials found only three with significant employment impacts.');
    expect(p3[1]).toBe('PX-06');
    expect(visible(p3[2])).toContain(
      'so last year’s course list can miss this year’s demand. On one major freelancing platform, automation-prone writing and coding postings fell 21% relative to manual-intensive jobs within eight months of ChatGPT’s release (Demirci, Hannane and Zhu, 2025).',
    );
  });

  test('the mechanism band carries the training sentence, the TalentLEAP line beside the model link and the page’s one scope sentence (R1-17, R1-18)', () => {
    const mech = visible(byId(HOME, 'section', 'mechanism'));
    expect(mech).toContain('100 training hours per certification, including exam preparation, followed by three months of milestone-based mentoring and placement support. Each track’s work-entry plan is agreed before enrollment.');
    expect(mech).not.toContain('Industry certification exam preparation by track, then three months');
    expect(mech.indexOf('How Our Model Works')).toBeLessThan(mech.indexOf('Our method organizes skills into career paths. We call it TalentLEAP.'));
    expect(mech).toContain('How TalentLEAP Works');
    expect(mech).toContain('Inclusions and reporting on this page are agreed in the program scope.');
    expect(count(mainText(HOME), 'are agreed in the program scope.')).toBe(1);
  });

  test('the track-record band opens with the signed agreements and holds the recognition items and the world strip (R1-05, R1-19)', () => {
    const guide = byId(HOME, 'section', 'guide');
    const g = visible(guide);
    expect(g).toContain('CodersTrust has signed MOUs, agreements or contracts with 70+ organizations: 13 government bodies; 20 universities and colleges; 13 development partners and NGOs; and 27 companies and industry bodies.');
    expect(guide).toMatch(/data-fact="SC-11"/);
    expect(g).toContain('CodersTrust is an AWS Authorized Training Partner.');
    expect(g).toContain('CodersTrust was listed in 2023 (STEAM category) and 2024.');
    expect(g).toContain('See All Recognition and Media');
    expect(guide).toMatch(/id="world"/);
    expect(g).toContain('CodersTrust Around the World');
    expect(g).toContain('Meet the Leadership Team');
  });

  test('the offer names YouthWIDE and links it (R1-20)', () => {
    const offer = visible(byId(HOME, 'section', 'offer'));
    expect(offer).toContain('This is YouthWIDE, the program through which funders deploy the CodersTrust model in a country. How YouthWIDE Works');
  });

  test('the closing band says what the session covers right under the button, then the routes and the fallback; no "Read the Evidence" there (R1-01)', () => {
    const cta = byId(HOME, 'section', 'cta');
    const t = visible(cta);
    const promise = 'A discovery session is a conversation, not a commitment. It covers your country and priority groups, an indicative budget and the pilot scorecard.';
    expect(t).toContain(promise);
    expect(cta).toMatch(/<p class="cta-band__promise"[^>]*data-fact="PD-02"/);
    expect(t.indexOf('Request a Discovery Session')).toBeLessThan(t.indexOf(promise));
    expect(t.indexOf(promise)).toBeLessThan(t.indexOf('Governments: Request a Briefing for Your Ministry'));
    expect(t.indexOf('Impact investors: Request an Introduction Call')).toBeLessThan(t.indexOf('If your email app does not open'));
    expect(t).not.toContain('Read the Evidence');
    expect(count(mainText(HOME), 'A discovery session is a conversation, not a commitment.')).toBe(1);
    expect(count(mainText(HOME), 'two suitable times')).toBe(1);
    expect(cta).not.toContain('data-call-line');
  });
});

/* ============================================================================================== */
test.describe('Chrome: menus, panels, emails and CTA labels (R7)', () => {
  const item = (group: string, label: string) => navGroups.find((g) => g.id === group)!.items.find((i) => i.label === label)!;
  test('menu lines say what each page delivers (R7-09 to R7-15)', () => {
    expect(item('model', 'TalentLEAP').description).toBe('A skill-by-skill path from learning to earning.');
    expect(item('programs', 'YouthWIDE').description).toBe('For governments and funders: co-funded country cohorts designed for three regions.');
    expect(item('programs', 'NU Post Graduate Diploma').description).toBe('Four National University of Bangladesh diploma courses, from digital marketing to data analytics.');
    expect(item('programs', 'Courses').description).toBe('Courses for individual learners and families on JobReady.global, including SuperKids.');
    expect(item('impact', 'Impact Overview').description).toBe('Headline results, each with its kind of evidence.');
    // the reviewer's "... by BIGD." would put an unexplained acronym in every page's menu (Home names BIGD nowhere, tests/wp35.spec.ts)
    expect(item('impact', 'Randomized Trial Results').description).toBe('An independent evaluation of CodersTrust’s WSDFM program.');
    expect(item('impact', 'Impact Survey 2026').description).toBe('Employment and income among surveyed completers at the October 2026 survey.');
    expect(item('impact', 'Case Studies').description).toBe('Five programs across Kosovo, Albania and Bangladesh.');
    expect(item('impact', 'Global Reach').description).toBe('16 countries and territories where CodersTrust has worked.');
    expect(item('partner', 'Development Partners and NGOs').description).toBe('Youth employment results you can report.');
    expect(audiences.find((a) => a.id === 'development-partners')!.text).toBe('Youth employment results you can report');
  });

  test('featured panels add something the item beside them does not say (R7-08)', () => {
    const f = (id: string) => navGroups.find((g) => g.id === id)!.feature;
    expect([f('about').eyebrow, f('about').text]).toEqual(['For Due-Diligence Teams', 'The contracting entity, safeguarding and reporting, in one place.']);
    expect(f('model').text).toBe('Built to connect learning to work.');
    expect(f('programs').text).toBe('From training to paid digital work, country by country.');
    expect(f('partner').text).toBe('Turn existing labs into a workforce pipeline.');
    expect(f('impact').title).toBe('More Employment for Women Offered a Place');
    for (const g of navGroups) {
      const beside = g.items.find((i) => i.href === g.feature.cta.href);
      if (beside && g.feature.text) expect(g.feature.text, g.id).not.toBe(beside.description);
    }
  });

  test('the trial page is "Randomized Trial Results" in the header, the drawer and the footer of a built page (R7-13)', () => {
    const raw = html(ABOUT);
    const header = /<header[\s\S]*?<\/header>/.exec(raw)![0];
    const footer = /<footer[\s\S]*?<\/footer>/.exec(raw)![0];
    for (const [where, part] of [['header', header], ['footer', footer]] as const) {
      expect(visible(part), where).toContain('Randomized Trial Results');
      expect(visible(part), where).not.toContain('Independent Evaluation');
    }
  });

  test('every prefilled email that asks for times asks for the time zone, and every inquiry email has a line for the sender (R7-01, R7-30)', () => {
    expect(CTAS.discovery.body).toEqual(['Organization', 'Your name and role', 'Country/region', 'What you want to achieve (groups, numbers and timeline, if known)', 'Two suitable times for a discovery session (with your time zone)']);
    for (const key of CTA_KEYS) {
      const body = CTAS[key].body ?? [];
      const times = body.filter((l) => /suitable times/i.test(l));
      for (const t of times) expect(t, key).toMatch(/^Two suitable times for (a discovery session|a briefing|an introduction call) \(with your time zone\)$/);
      if (times.length) expect(body.some((l) => /^(Your name and role|Name and role|Contact person)$/.test(l)), key).toBe(true);
    }
    expect(mailBody(HOME, 'Discovery session request')).toBe(
      'Hello CodersTrust team,\r\n\r\nOrganization: \r\nYour name and role: \r\nCountry/region: \r\nWhat you want to achieve (groups, numbers and timeline, if known): \r\nTwo suitable times for a discovery session (with your time zone): \r\n\r\nThank you.',
    );
  });

  test('email buttons start with a verb (R7-23, R7-24, R1-37, R7-25) and the careers email takes a resume (R7-27)', () => {
    expect(CTAS.funding.label).toBe('Discuss a Funding Partnership');
    expect(CTAS.media.label).toBe('Send a Media Inquiry');
    expect(CTAS.mentor.label).toBe('Apply to Become a Mentor');
    expect(CTAS.careers.label).toBe('Send Your Resume');
    expect(CTAS.careers.subject).toBe('Resume — [your name]');
    expect(CTAS.careers.body).toEqual(['Name', 'Area of work you are interested in', 'Location', 'Resume attached (or link to your resume or portfolio)']);
    for (const c of Object.values(CTAS)) expect(c.label, c.key).not.toMatch(/^(Explore a Funding|Media Inquiries|Mentor Application|Send a Speculative)/);
  });
});

/* ============================================================================================== */
test.describe('The phone number as a second route beside the main CTA (owner approval item 4)', () => {
  const PARTNER_PAGES = ['', 'development-partners/', 'governments/', 'foundations/', 'universities/', 'employers/', 'local-partners/', 'investors/'].map((p) => `partner-with-us/${p}index.html`);
  const line = (rel: string) => [...html(rel).matchAll(/<p class="call-line[^"]*"[^>]*data-call-line[^>]*>([\s\S]*?)<\/p>/g)];
  test('Contact and every partner and audience page carry exactly one call line, in the closing band (Contact: in the hero), with the registered number as a tel: link', () => {
    expect(fact('ID-07').text).toContain('+1 212 344 4111');
    for (const rel of [CONTACT, ...PARTNER_PAGES]) {
      const lines = line(rel);
      expect(lines, rel).toHaveLength(1);
      expect(visible(lines[0][1]), rel).toBe('Prefer to call? +1 212 344 4111');
      expect(lines[0][0], rel).toContain('href="tel:+12123444111"');
    }
    for (const rel of PARTNER_PAGES) expect(/<section[^>]*id="cta"[\s\S]*?data-call-line/.test(html(rel)), rel).toBe(true);
  });
  test('no other page carries it (Home, About, the programs, Impact)', () => {
    for (const rel of [HOME, ABOUT, 'programs/youthwide/index.html', 'programs/index.html', 'impact/index.html', CAREERS, BLOG]) expect(line(rel), rel).toHaveLength(0);
  });
  test('the line is visible beside the button on a partner page and on Contact', async ({ page }) => {
    await open(page, 'partner-with-us/governments/');
    await expect(page.locator('#cta [data-call-line]')).toBeVisible();
    await expect(page.locator('#cta [data-call-line] a')).toHaveAttribute('href', 'tel:+12123444111');
    await open(page, 'contact/');
    await expect(page.locator('.hero [data-call-line]')).toHaveText('Prefer to call? +1 212 344 4111');
  });
});

/* ============================================================================================== */
test.describe('Contact (R7-02, R7-05, R7-06, R7-19, R7-23)', () => {
  test('title, hero promise, learners line and the routes lead', () => {
    // the settled "{Page} | CodersTrust" pattern keeps the suffix the reviewer's wording dropped
    expect(titleOf(CONTACT)).toBe('Contact: Partners, Funders, Media and Learners | CodersTrust');
    const t = mainText(CONTACT);
    expect(t).toContain('Choose the route that fits you, and the right team will respond.');
    expect(t).toContain('Looking for a course? Go to JobReady.global.');
    // the reviewer's "Each button opens a prefilled email." is the wording WP161-B (A-13) corrected (two buttons open other sites), so the routes' lead keeps A-13's sentence, moved from the hero
    expect(t).toContain(
      'Choose Your Inquiry Route The inquiry buttons open a prefilled email to the CodersTrust team; the NU application form and JobReady.global open their own sites. Not sure which route fits, or your email app does not open? Write to contact@coderstrust.global. For local partnerships in Bangladesh, write to hello@coderstrustbd.com.',
    );
    expect(count(t, 'The inquiry buttons open a prefilled email')).toBe(1);
    expect(t).toContain('Learners and Media');
    expect(t).toContain('Fund a supported path from learning to earning, with outcomes you can track.');
    expect(t).toContain('CodersTrust is headquartered in New York, with a country office in Dhaka. New York');
    for (const gone of ['Choose the route that fits you. The inquiry buttons', 'Study or Contact the Media', 'Use the contact route above', 'the first two steps are shared and the third follows your route', 'The Next Step Depends on Your Route', 'Explore a funding partnership'])
      expect(t, gone).not.toContain(gone);
  });
  test('"What Happens After Your Inquiry" follows the route cards, before the offices, with step 3 "A Next Step for Your Route"', () => {
    const t = mainText(CONTACT);
    expect(t.indexOf('Choose Your Inquiry Route')).toBeLessThan(t.indexOf('What Happens After Your Inquiry'));
    expect(t.indexOf('What Happens After Your Inquiry')).toBeLessThan(t.indexOf('Where We Work From'));
    expect(t).toContain('A Next Step for Your Route');
    expect(count(t, 'two suitable times')).toBe(1);
  });
});

/* ============================================================================================== */
test.describe('Careers (R7-19, R7-25, R7-26, R7-27, R7-39)', () => {
  test('title, description, hero and the two resume buttons', () => {
    expect(titleOf(CAREERS)).toBe('Careers: Help Put Young People into Paid Work | CodersTrust');
    // WP168-A (owner decision of 24 November 2026): the old site's roles are open, so the description points to them and the hero's "No open roles right now ..." line is gone (a "See Open Roles" button leads the hero's actions: tests/wp168-a.spec.ts)
    expect(meta(CAREERS, 'name', 'description')).toBe('Join CodersTrust and help prepare educated, unemployed and underemployed young people for paid digital work. See our open roles and apply.');
    const t = mainText(CAREERS);
    expect(t).toContain('Help Put Young People into Paid Digital Work We judge youth-employment programs by whether young people end up working and earning, not by how many attended.');
    expect(t).not.toContain('No open roles right now');
    expect(count(t, 'We judge youth-employment programs')).toBe(1);
    expect(t).not.toContain('Work That Is Measured');
    expect(t).not.toMatch(/speculative/i);
    expect(t).toContain('Or email your resume to career@coderstrustbd.com.');
    const buttons = [...mainRaw(CAREERS).matchAll(/<a\b[^>]*class="btn[^"]*"[^>]*href="(mailto:career@[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    expect(buttons.map((b) => visible(b[2]))).toEqual(['Send Your Resume', 'Send Your Resume']);
    expect(t.indexOf('Employment Offer')).toBeLessThan(t.lastIndexOf('Send Your Resume'));
  });
});

/* ============================================================================================== */
test.describe('Blog index (R7-19, R7-28, R7-29)', () => {
  test('title, eyebrow, H1, lead and the closing band', () => {
    expect(titleOf(BLOG)).toBe('Blog: Aziz Ahmad on Youth, Work and Technology | CodersTrust');
    expect(meta(BLOG, 'name', 'description')).toBe('Essays by Aziz Ahmad, Co-Founder and Chairman of CodersTrust, on youth, work and technology.');
    const t = mainText(BLOG);
    expect(t).toContain('Blog Essays on Youth, Work and Technology By Aziz Ahmad, Co-Founder and Chairman of CodersTrust.');
    const cta = visible(byId(BLOG, 'section', 'blog-cta'));
    expect(cta).toContain('Working on Youth Employment? Tell us your goals, priority groups and two suitable times. A discovery session is a conversation, not a commitment. Request a Discovery Session');
    expect(cta).toContain('See Our Programs');
    expect(webPageModified(BLOG)).toBe(TODAY);
  });
});

/* ============================================================================================== */
test.describe('About, Governance, Mentors and Recognition (R1)', () => {
  test('About: title, the peer-reviewed line, the founders’ line, "Where We Are Going", the timeline entry and the second link (R7-04, R1-06, R1-25, R1-26, R1-27)', () => {
    expect(titleOf(ABOUT)).toBe('About: A Global Workforce Organization | CodersTrust');
    const t = mainText(ABOUT);
    expect(t).toContain('more likely to be employed. The trial is also published in a peer-reviewed journal.');
    expect(t).toContain(
      'The People Who Started It Ferdinand Kjærulff, a former Danish Army captain, saw a gap between access to online learning and the financing people needed to prepare for online work. He and Aziz Ahmad, a Bangladeshi-American business leader, launched CodersTrust in Copenhagen in 2014.',
    );
    const aim = `YouthWIDE aims to train ${fact('IN-01').text.slice('YouthWIDE aims to train '.length)}.`;
    expect(t).toContain(`Where We Are Going ${aim} Explore YouthWIDE`);
    expect(count(t, 'YouthWIDE aims to train')).toBe(1);
    expect(t).toContain('JobReady and the Impact Survey JobReady is CodersTrust’s digital learning and earning platform. CodersTrust published Impact Survey 2026.');
    const cta = visible(byId(ABOUT, 'section', 'about-cta'));
    expect(cta).toContain('See Partnership Routes');
    expect(cta).not.toContain('Read the Evidence');
    expect(webPageModified(ABOUT)).toBe('2026-11-27'); // WP172 (2026-11-27): the trial sentence. WP167 (owner approval of 2026-11-23): the hero's identity paragraph
  });

  test('Governance: the peer-reviewed line, the closing band and the page date (R1-06, R1-29)', () => {
    const t = mainText(GOV);
    expect(t).toContain('more likely to be employed. The trial is also published in a peer-reviewed journal. Funders receive monthly reports');
    expect(t).toContain('We will reply with the documents and answers we can share.');
    expect(t).not.toContain('what can be shared');
    expect(visible(byId(GOV, 'section', 'diligence-cta'))).toContain('Read the Evidence');
    expect(t).toContain('Last updated November 27, 2026'); // WP172 (2026-11-27): the trial sentence. WP167 (owner approval of 2026-11-23): the lead
    expect(webPageModified(GOV)).toBe('2026-11-27');
  });

  test('Mentors: lead, count line, buttons, two credentials and the Title Case link (R1-37, R1-38, R1-56)', () => {
    const t = mainText(MENTORS);
    expect(t).toContain('Practitioners who mentor CodersTrust learners toward employment and freelance work: Q&A and handholding during training, then three months of milestone-based mentoring.');
    expect(t).toContain('15 of CodersTrust’s 150+ instructors and mentors, by field.');
    expect(count(t, 'Apply to Become a Mentor')).toBe(2);
    expect(t).toContain('Registered tax preparer in the U.S., with over 15 years of experience');
    expect(t).toContain('20+ years in global ICT projects and startups');
    expect(t).toContain('See How Mentoring Works');
    expect(t).not.toContain('Mentor Application');
  });

  test('Recognition: the lead carries the listing, the listing band is gone and the strongest proof comes first (R1-39, R1-40, R7-24)', () => {
    const t = mainText(RECOGNITION);
    expect(t).toContain(
      'CodersTrust was listed in the HolonIQ South Asia EdTech 100 in 2023 (STEAM category) and 2024. Also on this page: founder honors, World Bank pages that name CodersTrust, press coverage from 2014 to 2016 and a press kit.',
    );
    expect(mainRaw(RECOGNITION)).not.toMatch(/id="listing"/);
    expect(count(t, 'HolonIQ South Asia EdTech 100')).toBe(2); // the H1 and the lead
    const order = ['Aziz Ahmad’s Appointments and Honors', 'World Bank Pages on Our Work in Kosovo and Albania', 'Press Coverage, 2014–2016: TechCrunch, Forbes, The Wall Street Journal and More', 'What University for Peace Says', 'Where CodersTrust Has Taken Part', 'Forums in Photographs', 'Press Kit'];
    const h2 = [...mainRaw(RECOGNITION).matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => visible(m[1])).filter((h) => order.includes(h));
    expect(h2).toEqual(order);
    expect(visible(byId(RECOGNITION, 'section', 'coverage'))).toMatch(/^In the Press /);
    expect(count(t, 'Send a Media Inquiry')).toBeGreaterThanOrEqual(2);
    expect(t).not.toContain('Media Inquiries');
    expect(t).toContain('More Recognition News');
    expect(webPageModified(RECOGNITION)).toBe('2026-11-23'); // WP167 (owner approval of 2026-11-23): the two honors
  });
});

/* ============================================================================================== */
test.describe('Team and the leadership profiles (R1-30 to R1-34, R1-53)', () => {
  test('the Team lead gives reasons to trust the team, and the executives’ cards show one credential each, no tags', () => {
    const t = mainText(TEAM);
    expect(t).toContain('Leaders with careers at UNDP, Amazon Web Services and Bangladesh’s Ministry of Foreign Affairs, advised by a former Principal Secretary and a former Executive Chairman of the National Skills Development Authority.');
    const exec = byId(TEAM, 'section', 'executive');
    for (const cred of [
      'Former Additional Secretary, Ministry of Foreign Affairs of Bangladesh',
      'Led solutions architecture teams at Amazon Web Services',
      'Software architect with 25+ years of experience; computer science graduate of the Indian Institute of Technology (IIT)',
      '20+ years of experience, including 14 years at UNDP',
      '20+ years in global ICT projects and startups; AWS Certified Solutions Architect - Associate',
    ])
      expect(visible(exec), cred).toContain(cred);
    expect(exec).not.toContain('tc__chips');
  });

  test('the six leadership profiles close with the Team page’s band; the In Memoriam, advisor and staff profiles do not', () => {
    const band = 'Talk to the Team Tell us your goals and two suitable times, and we will discuss the right partnership route. Request a Discovery Session';
    for (const slug of ['aziz-ahmad', 'shamsul-haque', 'mahdee-zaman', 'shafqat-ullah', 'asad-zaman', 'rezaul-karim-khan']) {
      expect(mainText(profile(slug)), slug).toContain(band);
      expect(count(mainText(profile(slug)), 'two suitable times'), slug).toBe(1);
      expect(webPageModified(profile(slug)), slug).toBe(TODAY);
    }
    for (const slug of ['ferdinand-kjaerulff', 'abdul-karim', 'faruque-hossain', 'fahim-sheikh', 'mahzabin-akter', 'zahurul-islam', 'hazrat-ali-nahid']) expect(mainText(profile(slug)), slug).not.toContain('Talk to the Team');
  });

  test('the Asad Zaman, Md. Shamsul Haque and Ferdinand Kjærulff biographies', () => {
    expect(mainText(profile('asad-zaman'))).toContain('He spent 14 years at UNDP and has 20+ years of experience across Asia and Africa in skills development, technical and vocational education and training (TVET), labor markets and migration.');
    const shamsul = mainText(profile('shamsul-haque'));
    expect(shamsul).toContain('A specialist in government relations and multilateral negotiations, he leads strategic communication at CodersTrust.');
    expect(shamsul).not.toContain('deep expertise');
    expect(mainText(profile('ferdinand-kjaerulff'))).toContain('with skill-based digital education and industry certification preparation.');
    expect(webPageModified(profile('ferdinand-kjaerulff'))).toBe(TODAY);
  });
});

/* ============================================================================================== */
test.describe('Titles, descriptions and share cards of the other pages (R7-04, R7-19 to R7-22)', () => {
  test('hub, second-tier and case-study titles say what the page offers', () => {
    const want: [string, string][] = [
      ['partner-with-us/index.html', 'Partner with Us: Turn Training into Paid Work | CodersTrust'],
      ['programs/index.html', 'Digital Skills Programs, from School to Work | CodersTrust'],
      ['our-model/index.html', 'Our Model: One Path from Learning to Earning | CodersTrust'],
      ['partner-with-us/investors/index.html', 'Investors: Back JobReady’s Staged Rollout | CodersTrust'],
      ['news/index.html', 'News: Partnerships, Recognition and Events | CodersTrust'],
      ['our-model/jobready-platform/index.html', 'JobReady: AI Tutor to Work Marketplaces | CodersTrust'],
      ['our-model/talentleap/index.html', 'TalentLEAP: A Skill-by-Skill Path to Earning | CodersTrust'],
      ['impact/stories/index.html', 'Learners Turning Training into Work | CodersTrust'],
      ['impact/case-studies/wsdfm-women-freelancers/index.html', 'WSDFM: Evaluated by a Randomized Trial | CodersTrust'],
      ['impact/case-studies/her-power/index.html', 'Her Power: Women’s Digital Skills with DoICT | CodersTrust'],
      ['impact/case-studies/digital-jobs-albania/index.html', 'Digital Jobs Albania: A World Bank Initiative | CodersTrust'],
      ['impact/case-studies/kosovo-women-in-online-work/index.html', 'Kosovo Women in Online Work: World Bank Pilot | CodersTrust'],
    ];
    for (const [rel, title] of want) {
      expect(titleOf(rel), rel).toBe(title);
      expect(title.length, rel).toBeLessThanOrEqual(60);
    }
  });

  test('the Impact, Trial and Governments descriptions are their own (R7-21, R7-22)', () => {
    expect(meta('impact/index.html', 'name', 'description')).toBe('Program records from Kosovo and Bangladesh, an independent trial in Bangladesh and a 2026 survey of completers. Each figure names its kind of evidence.'); // WP173 (owner answer of 2026-11-27): "in Bangladesh" (it was "in Dhaka")
    expect(meta('impact/independent-evaluation/index.html', 'name', 'description')).toBe(
      'A BRAC University (BIGD) randomized trial of CodersTrust’s WSDFM program: women offered a place were 10 percentage points more likely to be employed.', // WP172 (owner decision 2026-11-27): the published study's figures (it was the 2022 report's 10.3)
    );
    expect(meta('partner-with-us/governments/index.html', 'name', 'description')).toBe(
      'Build a national digital workforce through graduates and existing digital labs: curriculum, trainer training and phased delivery. Request a briefing.',
    );
  });

  test('the Home, Careers and Contact share cards carry the new H1 and leads', () => {
    expect(DEFAULT_OG.alt).toBe('CodersTrust: Learn. Earn. Prosper.');
    expect(ogCardFor('/careers/').alt).toBe('CodersTrust: Careers. We judge youth-employment programs by whether young people end up working and earning, not by how many attended.');
    expect(ogCardFor('/contact/').alt).toBe('CodersTrust: Contact. Choose the route that fits you, and the right team will respond.');
    expect(readFileSync('scripts/build-og.mjs', 'utf8')).toContain("line: 'Turn Youth Unemployment into a Digital Workforce — and Show Who Starts Earning'");
  });
});
