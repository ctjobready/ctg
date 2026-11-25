import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { CTAS } from '../src/data/ctas';
import { REDIRECTS } from '../src/data/redirects';
import { BASE, DIST_DIR } from './support/env';
import { open } from './support/browser';

/**
 * WP168-A (owner decision of 24 November 2026): "Preserve the job posts of the current (old) site with good navigation and browsing. Consider all jobs open, but
 * exclude redundant roles (keep the latest one for such redundant roles)." Run `npm run build`, then `PORT=4911 npx playwright test tests/wp168-a.spec.ts --project=chromium`.
 *   Data       the 33 job posts of the old site: 28 published roles in src/content/careers, the Chief Revenue Officer post held (draft: its title and text name terms
 *              the content rules keep off every page) and 4 redundant re-posts left out (the latest post of each group is kept).
 *   Careers    /careers/: no "No open roles" line; "See Open Roles" leads the hero's actions, beside "Send Your Resume"; the Open Roles band follows the hero, filtered by
 *              the old site's job categories with a count each; the application steps no longer wait for a role to open; the description; dateModified 2026-11-24.
 *   Roles      /careers/<slug>/: H1 and title, the category eyebrow, "Apply for This Role" (a prefilled email to the HR address, the role in the subject), the link back to
 *              all roles, more roles from the same category, breadcrumbs, WebPage + BreadcrumbList JSON-LD (no JobPosting), dateModified 2026-11-24, no posting date.
 *   Redirects  every /jobs/<slug>/ of the old site: a kept role to its own page, a dropped or held one to /careers/ (stub, src/data/redirects.ts and the Bulk Redirects list).
 */

const DAY = '2026-11-26'; // WP170: the garbled lines in seven role texts were cleaned // WP169: the careers pages moved on (role texts, the CRO role)
const SITE = 'https://coderstrust.global';

/** The 29 published roles (the old slugs). WP169 (owner answers of 2026-11-25): the Chief Revenue Officer post was published (28 before). */
const KEPT = [
  'chief-revenue-officer-cro',
  'associate-manager-pr-communications',
  'associate-sr-associate-content-development-and-demand-generation',
  'cinematographer-videographer-editor',
  'executive-student-affairs',
  'frontend-developer-wordpress-woocommerce-shopify',
  'head-of-business-development-and-sales-workforce-development-and-corporate-training-solutions',
  'interactive-animator',
  'intern-business-development',
  'job-intern-grant-marketing-proposals-and-content-writer',
  'management-trainee-training-excellence-customer-success',
  'manager-digital-marketing',
  'mentor-coding-stem',
  'mentor-for-mern-stack-course',
  'mentor-instructor-cybersecurity',
  'mentor-maths-stem',
  'mentor-robotics-stem',
  'mentor-science-stem',
  'senior-executive-job-placement',
  'senior-manager-accounts-and-finance',
  'sr-associate-associate-manager-talent-acquisition',
  'sr-creative-video-editor',
  'sr-manager-business-development-and-sales-ctg',
  'sr-manager-head-of-global-sales-and-marketing',
  'sr-manager-marketing-and-sales-b2c-training',
  'sr-manager-marketing-and-sales-superkids',
  'sr-manager-training-excellence-customer-success',
  'systems-administrator',
  'tech-lead-php-wordpress-woocommerce-shopify',
];
/** Redundant re-posts, each an earlier post of a kept role (the kept, latest post after the arrow). */
const DROPPED: Record<string, string> = {
  'sr-manager-global-marketing-and-sales-corporate-training': 'sr-manager-head-of-global-sales-and-marketing',
  'sr-manager-global-marketing-and-sales-training-and-talent-solutions': 'sr-manager-head-of-global-sales-and-marketing',
  'sr-manager-head-of-business-development-workforce-development-solutions': 'head-of-business-development-and-sales-workforce-development-and-corporate-training-solutions',
  'job-sr-manager-marketing-and-sales-corporate-training-and-employment': 'head-of-business-development-and-sales-workforce-development-and-corporate-training-solutions',
};
/** Held back (draft: true): in the collection, faithful to the old post, but not published. */
const HELD: string[] = []; // WP169: the Chief Revenue Officer post was held until 2026-11-25; nothing is held now
/** Roles per category on /careers/ (the old site's job categories). */
const COUNTS: [string, string, number][] = [
  ['accounting-finance', 'Accounting and Finance', 1],
  ['creative-media', 'Creative Media', 5],
  ['digital-marketing', 'Digital Marketing', 2],
  ['management', 'Management', 4], // WP169: the CRO role joined this category
  ['marketing-sales', 'Marketing and Sales', 6],
  ['mentors', 'Mentors', 6],
  ['operations', 'Operations', 2],
  ['software-engineering', 'Software Engineering', 2],
  ['training-development', 'Training and Development', 1],
];
const LABEL = Object.fromEntries(COUNTS.map(([k, l]) => [k, l]));

const CONTENT = join(process.cwd(), 'src', 'content', 'careers');
const fm = (slug: string): Record<string, string> => {
  const src = readFileSync(join(CONTENT, `${slug}.md`), 'utf8');
  const block = /^---\n([\s\S]*?)\n---/.exec(src)![1];
  return Object.fromEntries(block.split('\n').map((l) => /^(\w+): (.*)$/.exec(l)!).map((m) => [m[1], m[2].startsWith('"') ? (JSON.parse(m[2]) as string) : m[2]]));
};
const html = (rel: string) => readFileSync(join(DIST_DIR, rel, 'index.html'), 'utf8');
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
const text = (raw: string) =>
  decode(
    raw
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:)])/g, '$1')
    .trim();
const mainRaw = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const mainText = (rel: string) => text(mainRaw(rel));
const heroRaw = (rel: string) => /<section class="hero\b[\s\S]*?<\/section>/.exec(mainRaw(rel))?.[0] ?? '';
type Node = Record<string, unknown>;
const ld = (rel: string): Node[] =>
  [...html(rel).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const j = JSON.parse(m[1]) as { '@graph'?: Node[] } & Node;
    return (j['@graph'] ?? [j]) as Node[];
  });
const meta = (rel: string, name: string) => decode(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`).exec(html(rel))?.[1] ?? '');
const refresh = (rel: string) => /http-equiv="refresh" content="0;url=([^"]+)"/.exec(html(rel))?.[1];
const ROLE_HREF = (slug: string) => `${BASE}careers/${slug}/`;

/* ============================================================================================== */
test.describe('The old site’s 33 job posts: 29 published, 4 redundant re-posts left out (the CRO post was held until WP169)', () => {
  test('the migration manifest lists 33 job posts, and every one is accounted for exactly once', () => {
    const rows = readFileSync(join(process.cwd(), 'migration', 'migration-manifest.csv'), 'utf8')
      .split('\n')
      .filter((l) => /^\/jobs\/[^/,]+\/,/.test(l));
    expect(rows).toHaveLength(33);
    const slugs = rows.map((r) => /^\/jobs\/([^/]+)\//.exec(r)![1]).sort();
    expect(slugs).toEqual([...KEPT, ...Object.keys(DROPPED), ...HELD].sort());
    expect(KEPT).toHaveLength(29);
    expect(Object.keys(DROPPED)).toHaveLength(4);
  });

  test('src/content/careers holds the 29 kept roles, each with its old URL; no dropped re-post is there', () => {
    const files = readdirSync(CONTENT).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, '')).sort();
    expect(files).toEqual([...KEPT, ...HELD].sort());
    for (const slug of files) expect(fm(slug).legacyUrl, slug).toBe(`${SITE}/jobs/${slug}/`);
    for (const slug of KEPT) expect(fm(slug).draft, slug).toBeUndefined();
    for (const slug of HELD) expect(fm(slug).draft, slug).toBe('true');
    for (const [slug, kept] of Object.entries(DROPPED)) {
      expect(existsSync(join(CONTENT, `${slug}.md`)), slug).toBe(false);
      expect(KEPT, `${slug} folds into a kept role`).toContain(kept);
    }
  });

  test('each dropped re-post is older than the role kept for its group (the latest post is kept)', () => {
    const posted = (slug: string) => fm(slug).posted;
    // the dropped posts' dates, from the old site's REST API (they are not in the repository)
    const DROPPED_POSTED: Record<string, string> = {
      'sr-manager-global-marketing-and-sales-corporate-training': '2024-03-28',
      'sr-manager-global-marketing-and-sales-training-and-talent-solutions': '2024-03-28',
      'sr-manager-head-of-business-development-workforce-development-solutions': '2024-03-30',
      'job-sr-manager-marketing-and-sales-corporate-training-and-employment': '2023-08-08',
    };
    for (const [slug, kept] of Object.entries(DROPPED)) expect(posted(kept) > DROPPED_POSTED[slug], `${kept} is newer than ${slug}`).toBe(true);
  });

  test('every role names a category of the old site, its job type and location as the post gave them, and a salary without a figure', () => {
    for (const slug of [...KEPT, ...HELD]) {
      const d = fm(slug);
      expect(Object.keys(LABEL), slug).toContain(d.category);
      expect(['Full-Time', 'Internship'], slug).toContain(d.type);
      expect(d.location, slug).toBe('Dhaka, Bangladesh');
      expect(d.salary, slug).toBe('Negotiable');
      expect(d.summary.length, slug).toBeLessThanOrEqual(155);
    }
  });
});

/* ============================================================================================== */
test.describe('/careers/: the Open Roles band, browsable by category', () => {
  const CAREERS = 'careers';

  test('the hero: the lead is unchanged, no "No open roles" line, and "See Open Roles" (to the band) leads, beside "Send Your Resume"', () => {
    const hero = heroRaw(CAREERS);
    expect(text(hero)).toContain('We judge youth-employment programs by whether young people end up working and earning, not by how many attended.');
    expect(text(hero)).not.toMatch(/No open roles|when one opens|when a role opens/);
    const buttons = [...hero.matchAll(/<a\b[^>]*class="btn[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [decode(m[1]), text(m[2])]);
    expect(buttons.map((b) => b[1])).toEqual(['See Open Roles', 'Send Your Resume']);
    expect(buttons[0][0]).toBe('#open-roles');
    expect(buttons[1][0]).toMatch(/^mailto:career@coderstrustbd\.com\?subject=Resume/);
  });

  test('the Open Roles band follows the hero, then "Why Join", "What to Expect", the photos, the application steps and equal opportunity', () => {
    const ids = [...mainRaw(CAREERS).matchAll(/<(?:section|aside)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.slice(0, 2)).toEqual(['open-roles', 'why']);
    for (const id of ['how', 'team-photos', 'life', 'apply', 'eoe']) expect(ids, id).toContain(id);
    const band = text(/<section[^>]*id="open-roles"[\s\S]*?<\/section>\s*(?=<section|<script)/.exec(mainRaw(CAREERS))?.[0] ?? '');
    expect(band).toContain('Join Our Team Open Roles Filter by category, then open a role to read it in full and apply.');
  });

  test('the filter: "All Roles 29" and one chip per category of the old site, each with its count of roles', () => {
    const raw = mainRaw(CAREERS);
    const chips = [...raw.matchAll(/<label class="rf__chip"[^>]*for="(rf-[^"]+)"[^>]*>([\s\S]*?)<\/label>/g)].map((m) => [m[1], text(m[2])]);
    expect(chips).toEqual([['rf-all', 'All Roles 29'], ...COUNTS.map(([k, l, n]) => [`rf-${k}`, `${l} ${n}`])]);
    expect(raw).toContain('<legend class="rf__legend"');
    expect(text(raw)).toContain('Filter by Category');
  });

  test('one card per published role, each linking to its page with its category, job type and one line from its own text; no posting date', () => {
    const raw = mainRaw(CAREERS);
    const items = [...raw.matchAll(/<div class="rf__item"[^>]*data-category="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
    expect(items).toHaveLength(KEPT.length);
    const hrefs = items.map((m) => /href="([^"]+)"/.exec(m[2])![1]);
    expect([...hrefs].sort()).toEqual(KEPT.map(ROLE_HREF).sort());
    for (const [, cat, card] of items) {
      const slug = /href="[^"]*\/careers\/([^/]+)\/"/.exec(card)![1];
      const d = fm(slug);
      expect(cat, slug).toBe(d.category);
      expect(text(card), slug).toBe(`${LABEL[d.category]} ${d.type} ${d.title} ${d.summary} View Role`);
    }
    for (const [k, , n] of COUNTS) expect(items.filter((m) => m[1] === k), k).toHaveLength(n);
    expect(raw).not.toMatch(/<time\b/);
    expect(mainText(CAREERS)).not.toMatch(/\b(?:19|20|21|23|30)\/\d{2}\/20\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 202[3-5]\b/);
  });

  test('the application steps no longer wait for a role to open, and the resume route stays', () => {
    const t = text(/<section[^>]*id="apply"[\s\S]*?<\/section>/.exec(mainRaw(CAREERS))![0]);
    expect(t).toContain('Your Application Apply for an open role from its page, or send your resume and we keep it on file.');
    expect(t).toContain('Application Review We review the applications and invite shortlisted candidates to interview.');
    expect(t).toContain('Employment Offer The selected candidate receives an offer letter and package details.');
    expect(t).not.toMatch(/when a role opens|on file for when/);
    expect(t).toContain('Or email your resume to career@coderstrustbd.com.');
  });

  test(`the description points to the open roles, and the page pins dateModified ${DAY}`, () => {
    const D = 'Join CodersTrust and help prepare educated, unemployed and underemployed young people for paid digital work. See our open roles and apply.';
    expect(meta(CAREERS, 'description')).toBe(D);
    expect(meta(CAREERS, 'og:description')).toBe(D);
    const page = ld(CAREERS).find((n) => n['@type'] === 'WebPage');
    expect(page?.dateModified).toBe(DAY);
  });
});

/* ============================================================================================== */
test.describe('/careers/<slug>/: one page per published role', () => {
  test('dist/careers holds the 29 role pages and nothing for the dropped posts', () => {
    const dirs = readdirSync(join(DIST_DIR, 'careers'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    expect(dirs).toEqual([...KEPT].sort());
  });

  for (const slug of KEPT) {
    test(`${slug}: H1, title, eyebrow, Apply for This Role, the link back, breadcrumbs, JSON-LD and no posting date`, () => {
      const d = fm(slug);
      const rel = `careers/${slug}`;
      const raw = html(rel);
      const main = mainRaw(rel);
      // H1 = the role title; <title> = its short form when the title is too long for 60 characters
      const h1s = [...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1]));
      expect(h1s).toEqual([d.title]);
      const title = `${d.seoTitle ?? d.title} | CodersTrust`;
      expect(decode(/<title>([^<]*)<\/title>/.exec(raw)![1])).toBe(title);
      expect(title.length).toBeLessThanOrEqual(60);
      expect(meta(rel, 'description')).toBe(d.summary);
      // the category eyebrow
      expect(text(/<p class="hero__eyebrow"[^>]*>([\s\S]*?)<\/p>/.exec(main)![1])).toBe(LABEL[d.category]);
      // Apply for This Role: two buttons and the address line, all the role CTA with the role title in the subject
      const subject = encodeURIComponent(`Application: ${d.title}`);
      const applies = [...main.matchAll(/<a\b[^>]*class="btn[^"]*"[^>]*href="(mailto:[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      expect(applies.map((m) => text(m[2]))).toEqual(['Apply for This Role', 'Apply for This Role']);
      for (const [, href] of applies) {
        const h = decode(href);
        expect(h.startsWith(`mailto:career@coderstrustbd.com?subject=${subject}&body=`), h).toBe(true);
        const body = decodeURIComponent(h.slice(h.indexOf('&body=') + 6));
        expect(body.split('\r\n').map((l) => /^(.+?):\s*$/.exec(l)?.[1]).filter(Boolean)).toEqual(CTAS.role.body);
      }
      expect(text(main)).toContain('Or email your resume to career@coderstrustbd.com, with the role title as the subject.');
      // the link back to all roles (hero and the foot of "More Open Roles")
      expect(main).toContain(`href="${BASE}careers/#open-roles"`);
      expect(text(main)).toContain('See All Open Roles');
      // more roles, the same category first
      const more = /<section[^>]*id="more-roles"[\s\S]*?<\/section>/.exec(main)?.[0] ?? '';
      const moreSlugs = [...more.matchAll(/href="[^"]*\/careers\/([^/#]+)\/"/g)].map((m) => m[1]);
      expect(moreSlugs.length, 'up to three more roles').toBe(3);
      expect(moreSlugs).not.toContain(slug);
      const sameCount = KEPT.filter((s) => s !== slug && fm(s).category === d.category).length;
      expect(moreSlugs.filter((s) => fm(s).category === d.category).length).toBe(Math.min(3, sameCount));
      // breadcrumbs: Home › Careers › the role, in the page and in the JSON-LD
      const crumbs = ld(rel).find((n) => n['@type'] === 'BreadcrumbList') as { itemListElement: { name: string; item: string }[] };
      expect(crumbs.itemListElement.map((i) => i.item)).toEqual([`${SITE}/`, `${SITE}/careers/`, `${SITE}/careers/${slug}/`]);
      expect(crumbs.itemListElement.slice(0, 2).map((i) => i.name)).toEqual(['Home', 'Careers']);
      const page = ld(rel).find((n) => n['@type'] === 'WebPage');
      expect(page?.name).toBe(d.title);
      expect(page?.dateModified).toBe(DAY);
      expect(ld(rel).some((n) => n['@type'] === 'JobPosting')).toBe(false);
      expect(raw).toContain(`<link rel="canonical" href="${SITE}/careers/${slug}/">`);
      // the role text, the benefits and the steps; no posting date, deadline, job code or the old boilerplate
      const t = text(main);
      expect(t).toContain('Your Role and Responsibilities');
      expect(t).toContain('Qualifications and Skills');
      expect(t).toContain('Benefits At CodersTrust, we offer a comprehensive benefits package');
      expect(t).toContain('Tailor Your Resume');
      expect(main).not.toMatch(/<time\b/);
      expect(t).not.toMatch(/Deadline|Job Code|About CodersTrust|About SuperKids|Unlock Your Potential|APPLY NOW/);
      expect(t).not.toMatch(/\b\d{2}\/\d{2}\/20\d{2}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 202[3-5]\b/);
    });
  }

  test('the grant-writing internship keeps its own instruction in How to Apply', () => {
    const t = text(/<section[^>]*id="apply"[\s\S]*?<\/section>/.exec(mainRaw('careers/job-intern-grant-marketing-proposals-and-content-writer'))![0]);
    expect(t).toContain('If you have any previous marketing content, video and design projects or samples of your work, include a link to your online portfolio or attach relevant files. You must include at least one work sample link.');
  });

  test('the "Apply for This Role" email: the HR address, "Application: [role title]", and what the old posts asked applicants to give', () => {
    expect(CTAS.role.label).toBe('Apply for This Role');
    expect(CTAS.role.to).toBe('career@coderstrustbd.com');
    expect(CTAS.role.subject).toBe('Application: [role title]');
    expect(CTAS.role.body).toEqual([
      'Name',
      'Earliest availability for joining',
      'Earliest availability for interviews',
      'Interview availability time windows',
      'Minimum desired compensation (monthly salary in BDT)',
      'Job location applying for',
      'Contact information',
      'Resume attached (or link to your resume or portfolio)',
    ]);
  });

  test('the experience lines are on the seven role pages that had them cut (WP169), and the cuts the content rules still require are on every role page but the CRO post', () => {
    const RESTORED: [string, string][] = [
      ['associate-sr-associate-content-development-and-demand-generation', '7+ years of experience in demand generation and content developing field.'],
      ['frontend-developer-wordpress-woocommerce-shopify', '5+ years of experience in front-end web development.'],
      ['interactive-animator', '5+ years of experience in animation, with a strong portfolio showcasing interactive and motion graphics work.'],
      ['sr-creative-video-editor', '10+ years of proven experience as a video editor, preferably in a digital media or agency environment.'],
      ['sr-manager-marketing-and-sales-b2c-training', '15+ years of experience in marketing and sales, preferably in a leadership role.'],
      ['sr-manager-training-excellence-customer-success', 'Minimum 12+ years experience in the relevant field.'],
      ['tech-lead-php-wordpress-woocommerce-shopify', '10+ years of relevant experience in Shopify, WooCommerce and WordPress advanced development, High-Availability WordPress deployment in AWS and Disaster Recovery.'],
    ];
    for (const [slug, line] of RESTORED) expect(mainText(`careers/${slug}`), slug).toContain(line);
    expect(mainText('careers/chief-revenue-officer-cro')).toContain('25+ years of progressive experience in sales, marketing or revenue leadership roles, with 15+ years in the EdTech or technology sector.');
    for (const slug of KEPT.filter((s) => s !== 'chief-revenue-officer-cro')) {
      const t = mainText(`careers/${slug}`);
      expect(t, slug).not.toMatch(/\bROI\b|\blifetime value\b|\bP&L\b|\bprofit and loss\b|\bleverag|\bworld-class\b/i);
      // the site-wide wording rules: "CRM" is written out (tests/wp37.spec.ts), Google Ads not AdWords (tests/wp89.spec.ts), no "bootcamp" (tests/wp154.spec.ts)
      expect(t, slug).not.toMatch(/\bCRM\b|AdWords|bootcamp/i);
    }
  });

  test('the gender and age preference lines and the partner mention are on no role page (owner answers of 2026-11-25)', () => {
    for (const slug of KEPT) {
      const t = mainText(`careers/${slug}`);
      expect(t, slug).not.toMatch(/Females are preferred|female candidates|Male and female both can apply|Age at least 30|Thimble|Discovery Education/);
    }
  });
});

/* ============================================================================================== */
test.describe('Redirects: every /jobs/<slug>/ of the old site', () => {
  const ALL = [...KEPT, ...Object.keys(DROPPED), ...HELD];
  const dest = (slug: string) => (KEPT.includes(slug) ? `/careers/${slug}/` : '/careers/');

  test('the stub at each old URL forwards to the role’s page (kept) or to /careers/ (dropped)', () => {
    for (const slug of ALL) expect(refresh(`jobs/${slug}`), slug).toBe(`${BASE}${dest(slug).slice(1)}`);
    expect(refresh('jobs')).toBe(`${BASE}careers/`);
  });

  test('src/data/redirects.ts and the Bulk Redirects list carry the same destinations', () => {
    const map = new Map(REDIRECTS.map((r) => [r.from, r.to]));
    const bulk = readFileSync(join(process.cwd(), 'edge', 'bulk-redirects.csv'), 'utf8');
    for (const slug of ALL) {
      expect(map.get(`/jobs/${slug}/`), slug).toBe(dest(slug));
      expect(bulk, slug).toContain(`coderstrust.global/jobs/${slug}/,${SITE}${dest(slug)},301,`);
    }
  });

  test('the sitemap lists /careers/ and the 29 role pages, and no dropped post; llms.txt names /careers/ (the roles, like news posts, are not listed one by one)', () => {
    const sm = readdirSync(DIST_DIR).filter((f) => /^sitemap-\d+\.xml$/.test(f)).map((f) => readFileSync(join(DIST_DIR, f), 'utf8')).join('\n');
    const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.startsWith(`${SITE}/careers/`));
    expect(locs.sort()).toEqual([`${SITE}/careers/`, ...KEPT.map((s) => `${SITE}/careers/${s}/`)].sort());
    const llms = readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8');
    expect(llms).toContain(`- [Careers](${SITE}/careers/)`);
    expect(llms).not.toContain(`${SITE}/careers/mentor-coding-stem/`);
  });
});

/* ============================================================================================== */
test.describe('In the browser', () => {
  test('a category chip shows only its roles and says how many; a chip anchor in the URL preselects it', async ({ page }) => {
    await open(page, 'careers/');
    const visible = page.locator('#open-roles .rf__item:visible');
    await expect(visible).toHaveCount(KEPT.length);
    await page.locator('label[for="rf-mentors"]').click();
    await expect(visible).toHaveCount(6);
    await expect(page.locator('[data-role-status]')).toHaveText('Showing 6 roles in Mentors.');
    await page.locator('label[for="rf-all"]').click();
    await expect(visible).toHaveCount(KEPT.length);
    await page.goto('about:blank'); // a fresh load (a hash change on the same page is not a navigation)
    await open(page, 'careers/#rf-software-engineering');
    await expect(visible).toHaveCount(2);
  });

  test('"See Open Roles" jumps to the band; a card opens its role; "See All Open Roles" comes back', async ({ page }) => {
    await open(page, 'careers/');
    await page.locator('main .hero .btn', { hasText: 'See Open Roles' }).click();
    await expect(page).toHaveURL(/\/careers\/#open-roles$/);
    await page.locator('#open-roles a.card__link', { hasText: 'Systems Administrator' }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE}careers/systems-administrator/$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Systems Administrator');
    await expect(page.locator('main .hero .btn', { hasText: 'Apply for This Role' })).toHaveAttribute('href', /^mailto:career@coderstrustbd\.com\?subject=Application%3A%20Systems%20Administrator&body=/);
    await page.locator('main .hero a[data-role-back]').click();
    await expect(page).toHaveURL(/\/careers\/#open-roles$/);
  });
});
