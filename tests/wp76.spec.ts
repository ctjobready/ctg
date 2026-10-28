import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { fact, facts, sources } from '../src/data/facts';
import { WSDFM_RECORDS } from '../src/data/copy';
import { programResultRows, wsdfmFigureLabel, wsdfmRecordLine } from '../src/components/pages/impact/evidence';
import { DESKTOP, MOBILE, open, scrollThrough } from './support/browser';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP76 (Claude-ladder fixes). Retrospective coverage: the owner exempted this project from test-first work (WP24-common.md), so these tests were written after the changes.
 * Each one states an observable behavior of the register or of the built site (run `npm run build` first, then `PORT=<port> npx playwright test tests/wp76.spec.ts --project=chromium`):
 *   - 1 (owner answer 2026-10-22: the NU Post Graduate Diploma has FOUR courses): Cyber Security and Data Analytics have pages beside Digital Marketing and ICT, built from the same template (the same bands, Before You Apply rows, FAQ questions,
 *     apply and call links, schedule and location notes); the overview, the Programs hub card and the menus name all four; "Also Consider" names the other three; the register and its two new sources say so; the pages are in the sitemap and
 *     reachable without JavaScript;
 *   - 2 (owner answer 2026-10-22: "the 1,000 are the women enrolled"): PR-01 and every rendering of "711 of 1,000" name the base; the carousel keeps its rows and its 48 px height budget at 1280 and 390;
 *   - 3: the Kosovo case study and its Impact card describe the World Bank brief's two phases (front-end web development first, then coding, graphic design and digital marketing), not digital literacy first;
 *   - 4: the Governments "Who We Reach" card is headed "Educated, Unemployed and Underemployed Youth", the settled target-group wording, with its body unchanged.
 */

const compact = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim();
const mainText = async (page: Page) => compact(await page.locator('main').textContent());
const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((els) => els.map((e) => (e.textContent ?? '').replace(/\s+/g, ' ').trim()));
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const wordsIn = async (page: Page) => compact(await page.locator('main').evaluate((el) => el.textContent ?? '')).split(' ').length;
/** The visible text of a built page's HTML (scripts, styles and the head dropped), for scans across every page. */
const visible = (html: string) =>
  html
    .replace(/<head[\s\S]*?<\/head>/i, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/\s+/g, ' ');
const builtPages = () => listPages().map((p) => ({ route: p.route, html: readFileSync(p.file, 'utf8') }));
/** The built pages that are not archived news posts (those keep their original wording). */
const sitePages = () => builtPages().filter((p) => !p.route.startsWith('/news/'));
const itemOf = (page: Page, question: string) => page.locator('#faq details', { has: page.locator('summary', { hasText: question }) }).first();
const answerOf = async (page: Page, question: string) => compact(await itemOf(page, question).locator('.faq__a').textContent());
type LdNode = Record<string, unknown>;
/** Every JSON-LD node of the page (the @graph flattened). */
async function jsonLdNodes(page: Page): Promise<LdNode[]> {
  const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: LdNode[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object') {
      const o = n as LdNode;
      if (typeof o['@type'] === 'string') out.push(o);
      Object.values(o).forEach(walk);
    }
  };
  blobs.forEach((b) => walk(JSON.parse(b)));
  return out;
}
const faqJsonLd = async (page: Page) => {
  const faq = (await jsonLdNodes(page)).find((n) => n['@type'] === 'FAQPage');
  return ((faq?.mainEntity as { name: string; acceptedAnswer?: { text: string } }[]) ?? []).map((q) => ({ name: q.name, text: q.acceptedAnswer?.text ?? '' }));
};
const slide = (page: Page, n: number) => page.locator('[data-hs-slide]').nth(n - 1);
/** The measure of tests/hero-slider.spec.ts (budget 48 px): unused space between the showing slide's content and the controls bar. */
const unusedBelow = (page: Page) =>
  page.evaluate(() => {
    const active = document.querySelector('[data-hs-slide].is-active');
    const controls = document.querySelector('[data-hs-bar]');
    if (!active || !controls) return Number.NaN;
    const parts = Array.from(active.querySelectorAll('.hs__copy, .hs__visual')).filter((el) => el.getBoundingClientRect().height > 0);
    const contentBottom = Math.max(...parts.map((el) => el.getBoundingClientRect().bottom));
    return Math.round(controls.getBoundingClientRect().top - contentBottom);
  });
async function showSlide(page: Page, n: number) {
  await page.locator('[data-hs-dot]').nth(n - 1).click();
  await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('[data-hs-slide]')).findIndex((s) => s.classList.contains('is-active')))).toBe(n - 1);
  await page.waitForTimeout(450);
}
const readText = (path: string) => readFileSync(resolve(path), 'utf8');
/** The `modules: [...]` front-matter line of an NU course's content file, as the list it holds. */
const modulesOf = (slug: string) => JSON.parse(/^modules: (\[.*\])$/m.exec(readText(`src/content/nu-pgd/${slug}.md`))![1]) as string[];
const frontMatter = (slug: string) => /^---\n([\s\S]*?)\n---/.exec(readText(`src/content/nu-pgd/${slug}.md`))![1];

const HOME = '';
const NU = 'programs/nu-postgraduate-diploma/';
const NEXT_STEP = 'Your next step depends on your experience, portfolio and local market.';
const ELIGIBILITY = 'Honors / Diploma holders with a minimum CGPA of 2.25';

interface Course {
  slug: string;
  title: string;
  subject: string;
  topics: string[];
  prefer: string;
}
/** The four courses in the order every surface lists them. */
const COURSES: Course[] = [
  { slug: 'digital-marketing', title: 'NU Post Graduate Diploma in Digital Marketing', subject: 'digital marketing', topics: ['SEO and analytics', 'Social media marketing', 'E-commerce'], prefer: 'Prefer SEO, social media and advertising?' },
  { slug: 'ict', title: 'NU Post Graduate Diploma in Information and Communication Technology (ICT)', subject: 'information and communication technology (ICT)', topics: ['Programming and databases', 'Networks and troubleshooting', 'Mobile and web development'], prefer: 'Prefer programming, databases and networks?' },
  { slug: 'cyber-security', title: 'NU Post Graduate Diploma in Cyber Security', subject: 'cyber security', topics: ['Cryptography and network security', 'Digital forensics and investigation', 'Cyber law and risk management'], prefer: 'Prefer cryptography, network security and digital forensics?' },
  { slug: 'data-analytics', title: 'NU Post Graduate Diploma in Data Analytics', subject: 'data analytics', topics: ['Analytics tools and databases', 'Data visualization', 'Machine learning and data governance'], prefer: 'Prefer analytics tools, data visualization and machine learning?' },
];

interface NewCourse {
  title: string;
  lead: string;
  description: string;
  studyLead: string;
  answer: string;
  /** The subjects the answer names: each is one of the course's own module titles (a substring of one). */
  answerModules: string[];
  fit: string;
  fitModules: string[];
  roles: string[];
  droppedRoles: string[];
  banner: string;
  legacyUrl: string;
  source: 'NUCYBER26' | 'NUDATA26';
}
const NEW_COURSES: Record<string, NewCourse> = {
  'cyber-security': {
    title: 'NU Post Graduate Diploma in Cyber Security',
    lead: 'Cyber security knowledge, from cryptography and network security to digital forensics and cyber law, in a National University post graduate diploma delivered by CodersTrust.',
    description: 'A National University post graduate diploma in cyber security, delivered by CodersTrust: cryptography, network security, digital forensics and cyber law.',
    studyLead: 'Modules, in order. The final module is a capstone project or internship.',
    answer: 'Build a foundation in cryptography, network security, digital forensics and cyber risk management, then apply it in the final capstone project or internship.',
    answerModules: ['Cryptography and Data Security', 'Network and Communication Security', 'Cyber Crime Investigation and Digital Forensics', 'Cyber Risk Management and Crime Prevention'],
    fit: 'Choose Cyber Security if you want to study cryptography, network security, digital forensics and cyber law.',
    fitModules: ['Cryptography and Data Security', 'Network and Communication Security', 'Cyber Crime Investigation and Digital Forensics', 'Cyber Security Laws, Policies and Strategies'],
    // WP77: trimmed to eight (the legacy titles, in legacy order); the seven left out are listed in tests/wp77.spec.ts
    roles: [
      'Junior Cyber Security Analyst',
      'Information Security Analyst',
      'Network Security Assistant',
      'Digital Forensics Assistant',
      'Cybercrime Investigation Assistant',
      'Fraud Investigation Assistant',
      'Junior Cyber Risk Analyst',
      'Data Privacy Assistant',
    ],
    droppedRoles: ['IT Support Executive', 'Network Support Associate', 'IT Operations Associate', 'IT Audit Assistant'],
    banner: 'legacy-nu-pgd-cybersecurity',
    legacyUrl: 'https://coderstrust.global/course/post-graduate-diploma-in-cybersecurity/',
    source: 'NUCYBER26',
  },
  'data-analytics': {
    title: 'NU Post Graduate Diploma in Data Analytics',
    lead: 'Practical data analytics skills, from analytics tools and databases to data visualization and machine learning, in a National University post graduate diploma delivered by CodersTrust.',
    description: 'A National University post graduate diploma in data analytics, delivered by CodersTrust: analytics tools, databases, visualization and machine learning.',
    studyLead: 'Modules, in order. The final module is a special-topics thesis or project report.',
    answer: 'Build a foundation in analytics tools, databases, data visualization and machine learning, then apply it in the final special-topics thesis or project report.',
    answerModules: ['Data Analytics: Tools and Techniques', 'Database Systems', 'Data Visualization', 'Fundamentals of Machine Learning'],
    fit: 'Choose Data Analytics if you want to study analytics tools, databases, data visualization and machine learning.',
    fitModules: ['Data Analytics: Tools and Techniques', 'Database Systems', 'Data Visualization', 'Fundamentals of Machine Learning'],
    // WP77: trimmed to eight (the legacy titles, in legacy order); the six left out are listed in tests/wp77.spec.ts
    roles: [
      'Data Analyst',
      'Junior Data Analyst',
      'Business Intelligence Analyst',
      'Reporting Analyst',
      'Data Visualization Analyst',
      'Database Reporting Assistant',
      'Performance Analyst',
      'Freelance Data Analyst',
    ],
    droppedRoles: ['MIS Executive', 'Entrepreneur'],
    banner: 'legacy-nu-pgd-data-analytics',
    legacyUrl: 'https://coderstrust.global/course/post-graduate-diploma-in-data-analytics/',
    source: 'NUDATA26',
  },
};

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 1: the register says the NU Post Graduate Diploma has four courses (owner answer 2026-10-22)', () => {
  test('NU-13 names all four courses and cites the overview and the two new course pages', () => {
    expect(fact('NU-13').text).toBe('The NU Post Graduate Diploma has four courses: Digital Marketing, Information and Communication Technology (ICT), Cyber Security and Data Analytics');
    expect(fact('NU-13').group).toBe('admissions');
    expect(fact('NU-13').status).toBe('V');
    expect(fact('NU-13').sourceIds).toEqual(['NUPGD26', 'NUCYBER26', 'NUDATA26']);
  });

  test('each new course page is a source with its url and the day it was fetched (2026-10-22)', () => {
    expect(sources.NUCYBER26.url).toBe('https://coderstrust.global/course/post-graduate-diploma-in-cybersecurity/');
    expect(sources.NUDATA26.url).toBe('https://coderstrust.global/course/post-graduate-diploma-in-data-analytics/');
    for (const id of ['NUCYBER26', 'NUDATA26']) {
      expect(sources[id].id).toBe(id);
      expect(sources[id].citation, id).toContain('fetched 2026-10-22');
      expect(sources[id].citation, id).toContain('coderstrust.global');
    }
  });

  test('the facts the course pages state (duration, fee, instructor-led, credit hours, delivery) cite the two new pages too, and NU-01 (eligibility) is unchanged', () => {
    for (const id of ['NU-02', 'NU-03', 'NU-06', 'NU-09', 'NU-10']) expect(fact(id).sourceIds, id).toEqual(['NUPGD26', 'NUCYBER26', 'NUDATA26']);
    expect(fact('NU-01').text).toBe(ELIGIBILITY);
    expect(fact('NU-01').sourceIds).toEqual(['NUPGD26']);
    // the wording of the facts the pages print did not move
    expect(fact('NU-02').text).toBe('1 Year (2 Semesters)');
    expect(fact('NU-03').text).toBe('BDT 50,000');
    expect(fact('NU-09').text).toBe('40 Credit Hours and 10 Subjects');
    expect(fact('NU-10').text).toBe('On-Campus and Instructor-Led; online delivery is not available');
  });

  test('the two content files are courses with ten modules, the same duration, fee and mode as the other two, and the old "cybersecurity" file is gone', () => {
    for (const slug of ['digital-marketing', 'ict', 'cyber-security', 'data-analytics']) {
      const fm = frontMatter(slug);
      expect(fm, slug).toContain(`slug: ${slug}`);
      expect(fm, slug).toContain('kind: course');
      expect(fm, slug).toContain('duration: "12 Months"');
      expect(fm, slug).toContain(`fee: "${fact('NU-03').text}"`);
      expect(fm, slug).toContain('mode: "On-Campus"');
      expect(modulesOf(slug), slug).toHaveLength(10);
    }
    expect(() => readText('src/content/nu-pgd/cybersecurity.md')).toThrow();
    expect(frontMatter('cyber-security')).toContain(`legacyUrl: "${NEW_COURSES['cyber-security'].legacyUrl}"`);
    expect(frontMatter('data-analytics')).toContain(`legacyUrl: "${NEW_COURSES['data-analytics'].legacyUrl}"`);
    // the subjects are the ten of each course's own page, in its order
    expect(modulesOf('cyber-security')).toEqual([
      'Introduction to Cyber Criminology',
      'Cryptography and Data Security',
      'Network and Communication Security',
      'Cyber Security Laws, Policies and Strategies',
      'Cyber Crime Investigation and Digital Forensics',
      'Social Media and Digital Privacy',
      'Cyber Risk Management and Crime Prevention',
      'Cyber Terrorism and Threat Management',
      'Cyber Economic Crime and Management',
      'Capstone Project/Internship',
    ]);
    expect(modulesOf('data-analytics')).toEqual([
      'Fundamentals of Data Analytics',
      'Introduction to Programming',
      'Data Analytics: Tools and Techniques',
      'Database Systems',
      'Data Analysis and Software Application',
      'Data Visualization',
      'Data Governance and Ethics',
      'Fundamentals of Machine Learning',
      'Professional Development & Freelancing',
      'Special Topics in Data Analytics',
    ]);
  });

  test('the overview content file lists all four courses (it listed the last two as upcoming)', () => {
    const overview = readText('src/content/nu-pgd/overview.md');
    expect(overview).not.toContain('Upcoming:');
    for (const name of ['Digital Marketing', 'Information and Communication Technology (ICT)', 'Cyber Security', 'Data Analytics']) expect(overview, name).toContain(`- Post Graduate Diploma in ${name}: 40 credit hours, 10 subjects, instructor-led`);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 1: the overview page, the Programs hub and the menus name all four courses', () => {
  test('"Choose Your Course" says "Four courses, in digital marketing, information and communication technology (ICT), cyber security and data analytics, ..." over four cards in the diploma’s order, each linked, with its banner and three topics', async ({ page }) => {
    await open(page, NU);
    await expect(page.locator('#courses h2')).toHaveText('Choose Your Course');
    expect(compact(await page.locator('#courses .lead').textContent())).toBe('Four courses, in digital marketing, information and communication technology (ICT), cyber security and data analytics, delivered by CodersTrust under National University’s official training partnership.');
    expect(await texts(page, '#courses article .course__title')).toEqual(COURSES.map((c) => c.title));
    for (const [i, c] of COURSES.entries()) {
      const card = page.locator('#courses article').nth(i);
      expect(await card.locator('a.btn').getAttribute('href'), c.slug).toMatch(new RegExp(`/programs/nu-postgraduate-diploma/${c.slug}/$`));
      expect(compact(await card.locator('a.btn').textContent()), c.slug).toBe('View Course');
      expect(await texts(page, `#courses article:nth-of-type(${i + 1}) .course__meta li`), c.slug).toEqual(c.topics);
      await expect(card.locator('img'), c.slug).toHaveCount(1);
      expect(await card.locator('img').getAttribute('alt'), c.slug).toContain('course banner from National University and CodersTrust');
    }
    // the grid carries the register facts it rests on: the partnership (SC-04) and the four courses (NU-13)
    expect(await page.locator('#courses .courses').getAttribute('data-fact')).toBe('SC-04 NU-13');
  });

  test('the diploma’s JSON-LD list has four courses, in order, each with its URL; the page says "Four courses", never "Two courses"', async ({ page }) => {
    await open(page, NU);
    const list = (await jsonLdNodes(page)).find((n) => n['@type'] === 'ItemList' && String(n.name).includes('NU Post Graduate Diploma courses'));
    const items = (list?.itemListElement as { position: number; name: string; url: string }[]) ?? [];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
    expect(items.map((i) => i.name)).toEqual(COURSES.map((c) => c.title));
    expect(items.map((i) => i.url.replace(/^https:\/\/coderstrust\.global/, ''))).toEqual(COURSES.map((c) => `/programs/nu-postgraduate-diploma/${c.slug}/`));
    expect(await mainText(page)).not.toMatch(/Two courses/);
    expect(sitePages().filter((p) => /\bTwo courses\b/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  test('the Programs hub card names all four courses; no built page names only "digital marketing and ICT"', async ({ page }) => {
    await open(page, 'programs/');
    const card = page.locator(`#programs-grid li:has(a[href$="${NU}"])`);
    expect(compact(await card.textContent())).toContain('National University post graduate diploma courses delivered by CodersTrust, in digital marketing, information and communication technology (ICT), cyber security and data analytics.');
    expect(sitePages().filter((p) => /digital marketing and ICT/i.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  test('the Programs menu nests the four courses under the diploma with their own descriptions, and the footer lists none of them', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await open(page, HOME);
    const kids = '#mega-programs li:has(> a.mega__link[href$="' + NU + '"]) > ul > li > a';
    expect(await texts(page, kids + ' .mega__title')).toEqual(['Digital Marketing', 'ICT', 'Cyber Security', 'Data Analytics']);
    expect(await texts(page, kids + ' .mega__desc')).toEqual([
      'SEO, social media, advertising and analytics.',
      'Programming, databases, networks, mobile and web development.',
      'Cryptography, network security, digital forensics, cyber law and risk management.',
      'Analytics tools, databases, data visualization and machine learning.',
    ]);
    expect((await page.locator(kids).evaluateAll((els) => els.map((a) => a.getAttribute('href') ?? ''))).map((h) => h.replace(/^.*programs\/nu-postgraduate-diploma\//, ''))).toEqual(COURSES.map((c) => `${c.slug}/`));
    for (const label of ['Cyber Security', 'Data Analytics']) expect(await page.locator('footer').getByRole('link', { name: label }).count(), `footer: ${label}`).toBe(0);
  });

  // The nested descriptions show where the window is tall enough (the links end 739 px down with the header pinned and 783 px at the top of the page, at 1280 px wide) and are left out below that (671 and 715 px): every window listed shows every link.
  const MENU_WINDOWS = [
    { width: 1280, height: 800, desc: true },
    { width: 1440, height: 900, desc: true },
    { width: 1280, height: 720, desc: false },
    { width: 1100, height: 800, desc: false },
  ];
  for (const win of MENU_WINDOWS) test(`the Programs menu fits a ${win.width} by ${win.height} window (page at the top, and scrolled with the header pinned) with ${win.desc ? 'the nested descriptions' : 'the nested descriptions left out'}: the diploma spans both columns and its four courses sit two across; other menus keep their layout`, async ({ page }) => {
    await page.setViewportSize({ width: win.width, height: win.height });
    await open(page, HOME);
    // the parent of three or more nested links spans the row; only the Programs menu has one (Impact's "In the Field" has a single child)
    expect(await page.locator('#mega-programs .mega__item--span').count()).toBe(1);
    expect(await page.locator('.mega__item--span').count()).toBe(1);
    expect(await page.locator('#mega-impact .mega__sub').count()).toBe(1);
    expect(await page.locator('#mega-impact .mega__sub--two').count()).toBe(0);
    for (const scrolled of [false, true]) {
      if (scrolled) await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
      await page.locator('[data-mega-trigger][aria-controls="mega-programs"]').click();
      await expect(page.locator('#mega-programs')).toBeVisible();
      await page.waitForTimeout(450);
      if (win.desc) await expect(page.locator('#mega-programs .mega__sub .mega__desc').first()).toBeVisible();
      else await expect(page.locator('#mega-programs .mega__sub .mega__desc').first()).toBeHidden();
      const m = await page.evaluate(() => {
        const links = document.querySelector('#mega-programs .mega__links') as HTMLElement;
        const kids = Array.from(document.querySelectorAll('#mega-programs .mega__sub > li > a')) as HTMLElement[];
        const parent = document.querySelector('#mega-programs .mega__item--span') as HTMLElement;
        return {
          innerHeight: window.innerHeight,
          linksBottom: Math.round(links.getBoundingClientRect().bottom),
          kidTops: [...new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top)))],
          kidLefts: [...new Set(kids.map((k) => Math.round(k.getBoundingClientRect().left)))],
          kidsInside: kids.every((k) => k.getBoundingClientRect().bottom <= window.innerHeight),
          parentWidth: Math.round(parent.getBoundingClientRect().width),
          linksWidth: Math.round(links.getBoundingClientRect().width),
        };
      });
      expect(m.linksBottom, `the menu's links end above the fold (${scrolled ? 'scrolled' : 'top'})`).toBeLessThanOrEqual(m.innerHeight);
      expect(m.kidsInside, 'every nested course link is inside the viewport').toBe(true);
      expect(m.kidTops, 'two rows of nested courses').toHaveLength(2);
      expect(m.kidLefts, 'two columns of nested courses').toHaveLength(2);
      expect(m.parentWidth, 'the diploma item spans both columns').toBe(m.linksWidth);
      await page.keyboard.press('Escape');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 1: the two new course pages follow the course template', () => {
  for (const [slug, c] of Object.entries(NEW_COURSES)) {
    const route = `${NU}${slug}/`;

    test(`${route}: one H1, the course title in <title> and the breadcrumb, the meta description, and the hero lead`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('main h1')).toHaveCount(1);
      await expect(page.locator('main h1')).toHaveText(c.title);
      expect(c.title).toBe(titleCase(c.title));
      await expect(page).toHaveTitle(`${c.title} | CodersTrust`);
      expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe(c.description);
      expect(c.description.length, 'meta description length (the SEO check warns above 155)').toBeLessThanOrEqual(155);
      expect(compact(await page.locator('.hero__lead').first().textContent())).toBe(c.lead);
      expect(compact(await page.locator('.hero [class*="eyebrow"]').first().textContent())).toBe('National University Post Graduate Diploma');
      // the trail Home › Programs › NU Post Graduate Diploma › <course> (each crumb ends with its "›" separator in the markup)
      expect((await texts(page, 'nav[aria-label="Breadcrumb"] li, .breadcrumbs li')).map((t) => t.replace(/›$/, ''))).toEqual(['Home', 'Programs', 'NU Post Graduate Diploma', c.title]);
    });

    test(`${route}: the bands are the same, in the same order and tones, as the other course pages, with the same heading outline`, async ({ page }) => {
      await open(page, route);
      const bands = await page.evaluate(() =>
        Array.from(document.querySelectorAll('main > section.band, main section.band')).map((s) => ({ id: s.id, tone: /band--(white|airy|ice|klein|deep-ink)/.exec(s.className)?.[1] ?? '' })),
      );
      expect(bands.map((b) => b.id)).toEqual(['before-you-apply', 'who', 'curriculum', 'also-consider', 'faq', 'cta', '']);
      expect(bands.map((b) => b.tone)).toEqual(['white', 'white', 'airy', 'white', 'ice', 'airy', 'white']);
      expect(await texts(page, 'main h1, main h2, main h3')).toEqual([
        c.title,
        'Before You Apply',
        'For Learners Who Want a Digital Career',
        'Fields This Diploma Can Support',
        'What You Study',
        'Other NU Post Graduate Diploma Courses',
        'Questions About This Course',
        'Ready to Apply?',
      ]);
      for (const h of await texts(page, 'main h1, main h2, main h3')) expect(h, h).toBe(titleCase(h));
    });

    test(`${route}: Before You Apply, the hero facts, the apply and call links and the schedule and location notes are the ICT page’s, word for word`, async ({ page }) => {
      await open(page, `${NU}ict/`);
      const rowsOf = async () => ({
        labels: await texts(page, '#before-you-apply .ba__row dt'),
        values: await texts(page, '#before-you-apply .ba__row dd'),
        heroLabels: await texts(page, '.hero .keyfacts dt'),
        heroValues: await texts(page, '.hero .keyfacts dd'),
        actions: await page.locator('.hero a').evaluateAll((els) => els.map((a) => `${(a.textContent ?? '').replace(/\s+/g, ' ').trim()} -> ${a.getAttribute('href')}`)),
      });
      const ict = await rowsOf();
      await open(page, route);
      const mine = await rowsOf();
      expect(mine.labels).toEqual(ict.labels);
      expect(mine.values).toEqual(ict.values);
      expect(mine.heroLabels).toEqual(['Duration', 'Program Fee']);
      expect(mine.heroValues[0]).toContain('1 Year (2 Semesters)');
      expect(mine.heroValues[1]).toContain('BDT 50,000');
      expect(mine.heroLabels).toEqual(ict.heroLabels);
      expect(mine.heroValues).toEqual(ict.heroValues);
      expect(mine.actions.some((a) => a.startsWith('Apply Now') && a.includes('docs.google.com/forms'))).toBe(true);
      expect(mine.actions).toEqual(ict.actions);
      expect(mine.labels).toEqual(['Eligibility', 'Duration', 'Credit Hours and Subjects', 'Schedule and Intake', 'Delivery', 'Teaching Location', 'Program Fee', 'Payment', 'Recognition', 'How to Apply']);
      expect(mine.values).toContain('Admissions confirms intake dates and schedule with each applicant.');
      expect(mine.values).toContain('Admissions confirms the teaching location with each applicant.');
      // a register fact ends with its full stop in the table ("<Fact>" adds it)
      expect(mine.values).toContain(`${ELIGIBILITY}.`);
      expect(mine.values).toContain('40 Credit Hours and 10 Subjects.');
      const link = page.locator('.hero a.link', { hasText: 'Confirm Intake, Schedule and Location' });
      await expect(link).toHaveCount(1);
      expect(await link.getAttribute('href')).toBe('#admissions-contact');
      await expect(page.locator('#admissions-contact a[href^="tel:"]')).toHaveCount(1);
      await expect(page.locator('#admissions-contact a[href^="mailto:"]')).toHaveCount(1);
      // one primary button in the hero and one in the closing band, as on the other course pages
      await expect(page.locator('main .hero .btn--primary')).toHaveCount(1);
      await expect(page.locator('#cta .btn--primary')).toHaveCount(1);
    });

    test(`${route}: "What You Study" lists the course’s ten modules in order, under its own line about the last module`, async ({ page }) => {
      await open(page, route);
      const curriculum = page.locator('#curriculum');
      await expect(curriculum.locator('h2')).toHaveText('What You Study');
      expect(compact(await curriculum.locator('.sh .lead, header .lead').first().textContent())).toBe(c.studyLead);
      expect(compact(await curriculum.locator('summary').textContent())).toBe('View All 10 Modules');
      await expect(curriculum.locator('.modgrid__item')).toHaveCount(10);
      expect(await texts(page, '#curriculum .modgrid__name')).toEqual(modulesOf(slug).map((m, i) => `Module ${i + 1}: ${m}`));
    });

    test(`${route}: "Fields This Diploma Can Support" lists the titles the course’s modules lead to, and not the ones none of them does`, async ({ page }) => {
      await open(page, route);
      expect(await texts(page, '#who .roles li')).toEqual(c.roles);
      const text = await mainText(page);
      for (const dropped of c.droppedRoles) expect(text, dropped).not.toContain(dropped);
      expect(compact(await page.locator('#who .roles__note').textContent())).toBe('These are related fields; role readiness depends on your experience, portfolio and local market.');
      expect(text).not.toMatch(/\b(Director|Manager|Architect)\b/);
    });

    test(`${route}: two FAQ questions, both answered from the module list, the JSON-LD the same`, async ({ page }) => {
      await open(page, route);
      await expect(page.locator('#faq h2')).toHaveText('Questions About This Course');
      expect(await texts(page, '#faq summary')).toEqual(['What Will I Be Able to Do After This Course?', 'Is This the Right Course for Me?']);
      const doAnswer = await answerOf(page, 'What Will I Be Able to Do After This Course?');
      expect(doAnswer).toBe(`${c.answer} ${NEXT_STEP}`);
      const rightAnswer = await answerOf(page, 'Is This the Right Course for Me?');
      expect(rightAnswer).toBe(`Eligibility: ${ELIGIBILITY}. ${c.fit} Not right if you want a short self-paced course: see JobReady.global.`);
      // every subject the two sentences name is the subject of one of the course's own modules
      for (const m of [...c.answerModules, ...c.fitModules]) expect(modulesOf(slug), m).toContain(m);
      const ld = await faqJsonLd(page);
      expect(ld.find((q) => q.name === 'What Will I Be Able to Do After This Course?')?.text).toBe(`${c.answer} ${NEXT_STEP}`);
      expect(ld.find((q) => q.name === 'Is This the Right Course for Me?')?.text).toContain(c.fit);
      // no outcome, placement or earnings promise
      expect(`${doAnswer} ${rightAnswer}`).not.toMatch(/guarantee|job placement|you will earn|get a job|will be hired/i);
    });

    test(`${route}: the JSON-LD has the page, a Course with the fee and both providers, and the breadcrumb trail`, async ({ page }) => {
      await open(page, route);
      const nodes = await jsonLdNodes(page);
      const course = nodes.find((n) => n['@type'] === 'Course');
      expect(course?.name).toBe(c.title);
      expect(course?.description).toBe(c.description);
      expect(course?.offers).toMatchObject({ '@type': 'Offer', price: '50000', priceCurrency: 'BDT' });
      expect(JSON.stringify(course?.provider)).toContain('National University, Bangladesh');
      const crumbs = nodes.find((n) => n['@type'] === 'BreadcrumbList');
      expect(((crumbs?.itemListElement as { name: string }[]) ?? []).map((i) => i.name)).toEqual(['Home', 'Programs', 'NU Post Graduate Diploma', c.title]);
      expect(nodes.filter((n) => n['@type'] === 'WebPage').some((n) => n.dateModified === '2026-10-22')).toBe(true);
    });

    test(`${route}: the page is shorter than the 750-word cap the other course pages keep, shows its last-updated date, and does not scroll sideways at 1280 or 390`, async ({ page }) => {
      for (const vp of [DESKTOP, MOBILE]) {
        await page.setViewportSize(vp);
        await open(page, route);
        await scrollThrough(page);
        expect(await noOverflow(page), `${vp.width}px`).toBe(true);
      }
      expect(await wordsIn(page)).toBeLessThan(750);
      expect(compact(await page.locator('.updated').textContent())).toBe('Last updated October 22, 2026');
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 1: "Also Consider" names the other three courses on every course page', () => {
  for (const c of COURSES) {
    test(`${c.slug}: the band lists the other three, in the diploma’s order, each as "Prefer ...? The ... is the course for those modules." with a link, then the overview link`, async ({ page }) => {
      await open(page, `${NU}${c.slug}/`);
      const others = COURSES.filter((x) => x.slug !== c.slug);
      await expect(page.locator('#also-consider h2')).toHaveText('Other NU Post Graduate Diploma Courses');
      expect(compact(await page.locator('#also-consider .eyebrow').textContent())).toBe('Also Consider');
      expect(await texts(page, '#also-consider .others li')).toEqual(others.map((o) => `${o.prefer} The ${o.title} is the course for those modules.`));
      const links = await page.locator('#also-consider .others li a.link').evaluateAll((els) => els.map((a) => a.getAttribute('href') ?? ''));
      expect(links.map((h) => h.replace(/^.*programs\/nu-postgraduate-diploma\//, ''))).toEqual(others.map((o) => `${o.slug}/`));
      const overview = page.locator('#also-consider a.link', { hasText: 'See the NU Post Graduate Diploma Overview' });
      await expect(overview).toHaveCount(1);
      expect((await overview.getAttribute('href'))?.endsWith(`/${NU}`)).toBe(true);
      // the page never links to itself from this band, and the band is the only place that names the other courses' titles in full
      expect(await page.locator('#also-consider a.link').count()).toBe(4);
      expect(await page.locator(`#also-consider a[href$="/${c.slug}/"]`).count()).toBe(0);
    });
  }

  test('the two long-standing pages’ sentences about the courses they had named are the same words (they were "Prefer ...? The NU Post Graduate Diploma in ... is the course for those modules.")', async ({ page }) => {
    await open(page, `${NU}digital-marketing/`);
    expect(await texts(page, '#also-consider .others li')).toContain('Prefer programming, databases and networks? The NU Post Graduate Diploma in Information and Communication Technology (ICT) is the course for those modules.');
    await open(page, `${NU}ict/`);
    expect(await texts(page, '#also-consider .others li')).toContain('Prefer SEO, social media and advertising? The NU Post Graduate Diploma in Digital Marketing is the course for those modules.');
  });

  test('the course pages’ answers and "right for me" sentences differ from one another (no two courses share a sentence)', async ({ page }) => {
    const answers: string[] = [];
    const fits: string[] = [];
    for (const c of COURSES) {
      await open(page, `${NU}${c.slug}/`);
      answers.push(await answerOf(page, 'What Will I Be Able to Do After This Course?'));
      fits.push(await answerOf(page, 'Is This the Right Course for Me?'));
      expect(fits[fits.length - 1], c.slug).toContain(`Choose ${c.title.replace('NU Post Graduate Diploma in ', '')} if you want to study`);
    }
    expect(new Set(answers).size).toBe(4);
    expect(new Set(fits).size).toBe(4);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 1: the existing course pages keep their wording and structure', () => {
  test('Digital Marketing and ICT: the same answer sentences, "What You Study" line, band order and Fields heading as before', async ({ page }) => {
    await open(page, `${NU}digital-marketing/`);
    expect(await answerOf(page, 'What Will I Be Able to Do After This Course?')).toBe(`Build practical work in WordPress design, content marketing, SEO and analytics, followed by the final internship, project work and seminar module. ${NEXT_STEP}`);
    expect(compact(await page.locator('#curriculum .sh .lead, #curriculum header .lead').first().textContent())).toBe('Modules, in order. The final module combines internship, project work and a seminar; internship arrangements are confirmed with admissions.');
    expect(await texts(page, '#who .roles li')).toEqual(['Social Media Executive', 'SEO Executive/Expert', 'Google Ads, PPC and SEM Specialist', 'Content Marketer']);
    await open(page, `${NU}ict/`);
    expect(await answerOf(page, 'What Will I Be Able to Do After This Course?')).toBe(`Build practical work in programming, databases, networks and mobile applications, followed by the final internship, project work and seminar module. ${NEXT_STEP}`);
    expect(await texts(page, '#who .roles li')).toEqual(['Software Developer', 'Programmer', 'Network Administrator', 'Network Engineer', 'Database Administrator', 'Web Developer', 'Web Designer', 'Mobile App Developer']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 1: sitemap, banners and reachability', () => {
  test('the sitemap lists the overview and all four course pages (at the canonical origin) and not the old "cybersecurity" path', () => {
    const sitemap = readFileSync(join(DIST_DIR, 'sitemap-0.xml'), 'utf8');
    const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]).filter((l) => l.includes('/programs/nu-postgraduate-diploma/'));
    expect(locs.sort()).toEqual(
      ['', ...COURSES.map((c) => `${c.slug}/`)]
        .map((s) => `https://coderstrust.global/programs/nu-postgraduate-diploma/${s}`)
        .sort(),
    );
    expect(sitemap).not.toContain('nu-postgraduate-diploma/cybersecurity');
  });

  test('both new course pages are built pages (not redirect stubs) and no built page links to /cybersecurity/', () => {
    const routes = listPages().map((p) => p.route);
    expect(routes).toEqual(expect.arrayContaining(['/programs/nu-postgraduate-diploma/cyber-security/', '/programs/nu-postgraduate-diploma/data-analytics/']));
    expect(routes).not.toContain('/programs/nu-postgraduate-diploma/cybersecurity/');
    expect(builtPages().filter((p) => p.html.includes('nu-postgraduate-diploma/cybersecurity')).map((p) => p.route)).toEqual([]);
  });

  test('every course page’s hero shows its own course banner (the Cyber Security page looked its banner up under a spelling no page used, and showed the generated art instead)', async ({ page }) => {
    const BANNERS: Record<string, string> = {
      'digital-marketing': 'legacy-nu-pgd-digital-marketing',
      ict: 'legacy-nu-pgd-ict',
      'cyber-security': 'legacy-nu-pgd-cybersecurity',
      'data-analytics': 'legacy-nu-pgd-data-analytics',
    };
    for (const c of COURSES) {
      await open(page, `${NU}${c.slug}/`);
      expect(await page.locator('.hero img[data-asset]').evaluateAll((els) => els.map((i) => i.getAttribute('data-asset'))), c.slug).toEqual([BANNERS[c.slug]]);
      expect(await page.locator('.hero img[data-asset]').getAttribute('alt'), c.slug).toContain('course banner from National University and CodersTrust');
    }
  });

  test('the two new banners are cleared like the other two course banners (the same clearance, published on the previous site, no sensitive group), and the cards carry their asset ids', async ({ page }) => {
    const rows = JSON.parse(readText('src/data/permissions.json')) as { assetId: string; clearanceId: string; status: string; publishedOnLegacySite: boolean; sensitiveGroup: boolean }[];
    const row = (id: string) => rows.find((r) => r.assetId === id);
    for (const id of ['legacy-nu-pgd-digital-marketing', 'legacy-nu-pgd-ict', 'legacy-nu-pgd-cybersecurity', 'legacy-nu-pgd-data-analytics']) {
      expect(row(id), id).toMatchObject({ clearanceId: 'OWNER-2026-10-11-OLDSITE', status: 'cleared', publishedOnLegacySite: true, sensitiveGroup: false });
    }
    await open(page, NU);
    expect(await page.locator('#courses article img').evaluateAll((els) => els.map((i) => i.getAttribute('data-asset')))).toEqual([
      'legacy-nu-pgd-digital-marketing',
      'legacy-nu-pgd-ict',
      NEW_COURSES['cyber-security'].banner,
      NEW_COURSES['data-analytics'].banner,
    ]);
  });

  test.describe('without JavaScript', () => {
    test.use({ viewport: MOBILE, javaScriptEnabled: false });

    test('the diploma page links all four courses and each course page links the other three, so no course page is reachable only through a script', async ({ page }) => {
      await open(page, NU);
      for (const c of COURSES) await expect(page.locator(`#courses a[href$="/${c.slug}/"]`), c.slug).toBeVisible();
      for (const c of COURSES) {
        await open(page, `${NU}${c.slug}/`);
        for (const o of COURSES.filter((x) => x.slug !== c.slug)) expect(await page.locator(`#also-consider a[href$="/${o.slug}/"]`).count(), `${c.slug} -> ${o.slug}`).toBe(1);
      }
    });
  });

  test('the overview and every course page stay within their word caps (850 and 750) and do not scroll sideways at 1280 or 390', async ({ page }) => {
    for (const vp of [DESKTOP, MOBILE]) {
      await page.setViewportSize(vp);
      await open(page, NU);
      await scrollThrough(page);
      expect(await noOverflow(page), `overview at ${vp.width}px`).toBe(true);
      expect(await wordsIn(page)).toBeLessThan(850);
      for (const c of COURSES.slice(0, 2)) {
        await open(page, `${NU}${c.slug}/`);
        expect(await noOverflow(page), `${c.slug} at ${vp.width}px`).toBe(true);
        expect(await wordsIn(page), c.slug).toBeLessThan(750);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 2: the register says the 1,000 are the women enrolled (owner answer 2026-10-22)', () => {
  test('PR-01 reads "program records report that 711 of the 1,000 women enrolled were in work (71%)", with the value "711 of 1,000" and the label "WSDFM: 71% of enrolled women in work"', () => {
    const pr01 = fact('PR-01');
    expect(pr01.text).toBe(
      'WSDFM (Women’s Skill Development for Freelancing Marketplace), commissioned by Porticus: program records report that 711 of the 1,000 women enrolled were in work (71%); BIGD evaluated CodersTrust’s WSDFM program in a randomized trial',
    );
    expect(pr01.stat?.value).toBe('711 of 1,000');
    expect(pr01.stat?.numeric).toBe(711);
    expect(pr01.stat?.label).toBe('WSDFM: 71% of enrolled women in work');
    expect(pr01.sourceIds).toEqual(['IR26']);
  });

  test('PR-06 states the base: "WSDFM (Porticus) 71% in work (711 of the 1,000 women enrolled)"; its tile wording is unchanged', () => {
    const pr06 = fact('PR-06');
    expect(pr06.text).toContain('WSDFM (Porticus) 71% in work (711 of the 1,000 women enrolled); Women in Online Work, Kosovo, 68% in work;');
    expect(pr06.stat?.label).toBe('WSDFM 71% in work · Women in Online Work, Kosovo 68% in work · UNDP YES, Korail 67% found a first job within three months');
  });

  test('no register entry still gives the 711 without its base ("711 of 1,000 women", "711 of 1,000 in work")', () => {
    const offenders = Object.values(facts)
      .filter((f) => [f.text, f.headline, f.stat?.label, f.stat?.detail, f.stat?.glance?.label, f.stat?.glance?.note].some((s) => /\b711 of 1,000 (women|in work)/.test(s ?? '')))
      .map((f) => f.id);
    expect(offenders).toEqual([]);
  });

  test('the one formulation, everywhere, is built from PR-01: the record line, the tile label, the Home card line and the table row', () => {
    expect(wsdfmRecordLine()).toBe('WSDFM program records: 711 of the 1,000 women enrolled were in work (71%)');
    expect(wsdfmFigureLabel()).toBe('WSDFM program records: enrolled women in work (71%)');
    expect(WSDFM_RECORDS.text).toBe('Program records: 711 of the 1,000 women enrolled were in work (71%).');
    expect(WSDFM_RECORDS.facts).toEqual(['PR-01']);
    const row = programResultRows().find((r) => r.id === 'PR-01');
    expect(row?.enrolled).toBe('1,000');
    expect(row?.inWork).toBe('711 women (71%)');
    expect(row?.trained).toBeUndefined();
    // the other rows are unchanged
    expect(programResultRows().find((r) => r.id === 'PR-02')?.inWork).toBe('102 of 150 women (68%)');
    expect(programResultRows().find((r) => r.id === 'PR-03')?.enrolled).toBe('350');
  });
});

test.describe('WP76 item 2: every page that states the figure names its base', () => {
  const RECORD_LINE = 'Program records: 711 of the 1,000 women enrolled were in work (71%).';
  const CAPTION = 'WSDFM program records (not trial results; the trial’s 425 women offered a place were among these 1,000): 71% of enrolled women in work';
  const SLIDE_LINE = 'WSDFM: 711 of 1,000 enrolled in work (71%), from program records.';

  test('Home: slide 4 says "WSDFM: 711 of 1,000 enrolled in work (71%), from program records." and the WSDFM card "Program records: 711 of the 1,000 women enrolled were in work (71%)."', async ({ page }) => {
    await open(page, HOME);
    const line = slide(page, 4).locator('.hs__lines li').nth(1);
    await expect(line).toHaveText(SLIDE_LINE);
    await expect(line).toHaveAttribute('data-fact', 'PR-01');
    const card = page.locator('#cases article').first();
    expect(compact(await card.locator('.case__context').textContent())).toBe(RECORD_LINE);
    expect(await card.locator('.case__context').getAttribute('data-fact')).toBe('PR-01');
    expect(await card.locator('.case__context').evaluate((el) => (el.textContent ?? '').includes('711 of the 1,000'))).toBe(true);
  });

  test('the funder and card pages print the figure over the caption "... 71% of enrolled women in work"', async ({ page }) => {
    for (const route of ['partner-with-us/development-partners/', 'partner-with-us/foundations/', 'partner-with-us/local-partners/', 'programs/youthwide/']) {
      await open(page, route);
      const card = page.locator('#cases article', { has: page.locator('.case__value', { hasText: '711 of 1,000' }) });
      await expect(card, route).toHaveCount(1);
      expect(compact(await card.locator('.case__label').textContent()), route).toBe(CAPTION);
    }
  });

  test('Impact: the program-record tile reads "711 of 1,000" over "WSDFM program records: enrolled women in work (71%)", with its note and facts unchanged; the Case Studies card says the same', async ({ page }) => {
    await open(page, 'impact/');
    const tile = page.locator('#glance a[data-fact~="PR-01"]');
    await expect(tile).toHaveCount(1);
    await expect(tile.locator('.glance__desc')).toHaveText('WSDFM program records: enrolled women in work (71%)');
    await expect(tile.locator('.glance__note')).toHaveText('Program records, not trial results; the 425 women offered a place in the randomized trial were among these 1,000.');
    expect(await tile.getAttribute('data-fact')).toBe('PR-01 PR-06 RC-07');
    expect(compact(await tile.textContent())).toContain('711 of 1,000');
    await open(page, 'impact/case-studies/');
    const label = page.locator('.case__label', { hasText: 'WSDFM program records' });
    await expect(label).toHaveCount(1);
    await expect(label).toHaveText('WSDFM program records: enrolled women in work (71%)');
  });

  test('the WSDFM case study: the first tile (711 of 1,000, "WSDFM: 71% of enrolled women in work"), the program-results sentence and the description, social descriptions and JSON-LD all say the women enrolled', async ({ page }) => {
    const DESCRIPTION = 'WSDFM (Porticus): a randomized trial of the program found women offered a place had an estimated 41% higher monthly income than the control group.';
    await open(page, 'impact/case-studies/wsdfm-women-freelancers/');
    expect(await page.locator('.factstat[data-fact="PR-01"] .stat__num').getAttribute('data-final')).toBe('711 of 1,000');
    await expect(page.locator('.factstat[data-fact="PR-01"] .stat__label')).toHaveText('WSDFM: 71% of enrolled women in work');
    await expect(page.locator('p.fact[data-fact="PR-01"]')).toContainText('program records report that 711 of the 1,000 women enrolled were in work (71%)');
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) {
      expect(await page.locator(selector).getAttribute('content'), selector).toBe(DESCRIPTION);
    }
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join('\n')).toContain(DESCRIPTION);
    expect(DESCRIPTION.length, 'meta description length (the SEO check warns above 155)').toBeLessThanOrEqual(155);
  });

  test('no built page gives the 711 or the 71% without its base: none says "711 of 1,000 women in work", "711 of 1,000 in work", "WSDFM: 71% in work" or "(not trial results; the trial studied 833 women): 71% in work"', () => {
    const offenders: string[] = [];
    for (const p of sitePages()) {
      const text = visible(p.html);
      for (const old of [/711 of 1,000 women in work/, /711 of 1,000 in work/, /WSDFM: 71% in work/, /833 women\): 71% in work/, /records: women in work \(71%\)/]) {
        if (old.test(text) || old.test(p.html)) offenders.push(`${p.route}: ${old}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('the figure is still on the pages that state it, each with "enrolled" beside it (Home, the four card pages, Impact, the Case Studies hub and the case study)', () => {
    const stating: string[] = [];
    const without: string[] = [];
    for (const p of sitePages()) {
      const text = visible(p.html);
      if (!/711 of 1,000|711 of the 1,000/.test(text)) continue;
      stating.push(p.route);
      if (!/enrolled (women )?in work|women enrolled were in work/.test(text)) without.push(p.route);
    }
    expect(stating).toEqual(
      expect.arrayContaining(['/', '/programs/youthwide/', '/partner-with-us/development-partners/', '/partner-with-us/foundations/', '/partner-with-us/local-partners/', '/impact/', '/impact/case-studies/', '/impact/case-studies/wsdfm-women-freelancers/']),
    );
    expect(without).toEqual([]);
  });
});

test.describe('WP76 item 2: the longer wording keeps the carousel’s rows and its height budget', () => {
  for (const vp of [DESKTOP, MOBILE]) {
    test.describe(`at ${vp.width}px`, () => {
      test.use({ viewport: vp });

      test('slide 4: the WSDFM line is one row at 1280 (as the Kosovo and Her Power lines), the same rows as the others at 390, no slide leaves more than 48 px unused, and nothing scrolls sideways', async ({ page }) => {
        await open(page, HOME);
        await scrollThrough(page);
        await showSlide(page, 4);
        const lines = await slide(page, 4)
          .locator('.hs__lines li')
          .evaluateAll((els) => els.map((e) => ({ height: Math.round(e.getBoundingClientRect().height * 10) / 10, lineHeight: parseFloat(getComputedStyle(e).lineHeight) })));
        expect(lines).toHaveLength(4);
        if (vp.width >= 1024) {
          expect(lines[1].height, 'WSDFM line is one row').toBe(lines[0].height);
          expect(lines[3].height, 'Her Power line is one row').toBe(lines[0].height);
          expect(Math.round((lines[2].height - lines[0].height) / lines[0].lineHeight), 'UNDP YES line takes at most one row more').toBeLessThanOrEqual(1);
        } else {
          expect(lines[1].height, 'WSDFM line takes the rows the Kosovo line takes').toBe(lines[0].height);
        }
        for (let n = 1; n <= 4; n++) {
          await showSlide(page, n);
          const gap = await unusedBelow(page);
          expect(gap, `slide ${n} at ${vp.width}px: unused space below the content`).toBeLessThanOrEqual(48);
          expect(gap, `slide ${n} at ${vp.width}px: content must not run into the controls`).toBeGreaterThanOrEqual(0);
        }
        expect(await noOverflow(page), `horizontal overflow on Home at ${vp.width}px`).toBe(true);
      });
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 3: the Kosovo program is described as the World Bank brief does', () => {
  const SOLUTION = 'Two phases: front-end web development first, then tracks in coding, graphic design and digital marketing.';
  const CARD = 'Two phases: front-end web development first, then tracks in coding, graphic design and digital marketing';

  test('the case study’s first "What CodersTrust Did" point is the two phases; the other three points are unchanged', async ({ page }) => {
    await open(page, 'impact/case-studies/kosovo-women-in-online-work/');
    expect(await texts(page, '#solution-h ~ .cs__list li, ul[aria-labelledby="solution-h"] li')).toEqual([
      SOLUTION,
      'Interactive, collaborative sessions to keep learners engaged.',
      'Soft skills paired with career counseling.',
      'Marketplace integration: bidding on and doing real online work.',
    ]);
  });

  test('the Impact card (the case-study band on /impact/) says the same facts, Kosovo first, and the other four cards keep their scope lines', async ({ page }) => {
    await open(page, 'impact/');
    const cards = page.locator('#cases article');
    await expect(cards).toHaveCount(5);
    expect(compact(await cards.first().locator('.card__title').textContent())).toBe('Women in Online Work, Kosovo');
    expect(compact(await cards.first().locator('.card__text').textContent())).toBe(`${CARD}.`);
    expect(await texts(page, '#cases article .card__text')).toEqual([
      `${CARD}.`,
      'Three-month online training in graphic design, web development and digital marketing, with mentoring. The World Bank reported in May 2022, while the program was still running, that more than 500 students had enrolled.',
      'ICT skills for freelancing marketplaces and local jobs, with one-to-one mentoring.',
      'Skills training linked to freelance marketplaces, in a fully equipped lab with one-to-one mentoring.',
      'Curriculum, training manuals, mentorship guidelines and trainer training; 2,400 trained directly.',
    ]);
  });

  test('no built page says the program built digital literacy first; the Kosovo row of Global Reach already names the same four skills', () => {
    expect(sitePages().filter((p) => /digital literacy first|Two-phase delivery/i.test(visible(p.html))).map((p) => p.route)).toEqual([]);
    const reach = readText('src/data/countries.ts');
    expect(reach).toContain("skills: 'Front-end web development, coding, graphic design and digital marketing'");
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('WP76 item 4: the Governments "Who We Reach" card uses the settled target-group wording', () => {
  const HEADING = 'Educated, Unemployed and Underemployed Youth';
  const BODY = 'Unemployed graduates and other priority groups, with women a priority in every group.';

  test('the card’s heading is "Educated, Unemployed and Underemployed Youth" (Title Case), its label and body unchanged, and no built page still says "Vulnerable and Unemployed Youth"', async ({ page }) => {
    expect(HEADING).toBe(titleCase(HEADING));
    await open(page, 'partner-with-us/governments/');
    const card = page.locator('#mechanism li', { has: page.locator('.model__title', { hasText: HEADING }) });
    await expect(card).toHaveCount(1);
    expect(compact(await card.textContent())).toContain('Who We Reach');
    expect(compact(await card.textContent())).toContain(BODY);
    expect((await texts(page, '#mechanism .model__title'))[0]).toBe(HEADING);
    expect(sitePages().filter((p) => /Vulnerable and Unemployed Youth/.test(visible(p.html))).map((p) => p.route)).toEqual([]);
  });

  test('Home, YouthWIDE and Governments use the same card heading for who the model reaches', async ({ page }) => {
    for (const route of [HOME, 'programs/youthwide/', 'partner-with-us/governments/']) {
      await open(page, route);
      expect(await texts(page, '.model__title'), route).toContain(HEADING);
    }
  });
});
