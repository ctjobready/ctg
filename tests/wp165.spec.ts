import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { blogHref, otherBlogPosts, publishedBlogPosts, type BlogPostLike } from '../src/lib/blogPosts';
import { BLOG_LINK, NEWS_LINK, footerBottomLinksFor, topLinksFor } from '../src/data/nav';
import { BASE, DIST_DIR } from './support/env';
import { MOBILE, VIEWPORTS, fontsReady, open, scrollThrough, settleAnimations, vpLabel } from './support/browser';
import { listPages } from './support/pages';
import { routeOfDistFile, withoutRepostBody } from './support/repost';

/**
 * WP165 (owner request of 5 November 2026) and its follow-up (owner decisions of the same day): a Blog at /blog/ (index) and /blog/<slug>/ (posts),
 * separate from News. Two of Aziz Ahmad's Substack essays, re-posted with his permission and with their figures aligned to the facts register, and one essay
 * written for this site. All three are drafts until Aziz approves them, and with no live post the Blog has no page and no link anywhere.
 *
 * Two states, picked by the build under test (dist/blog/index.html present or not):
 *   ZERO LIVE  the committed state. `npm run build`, then `PORT=4911 npx playwright test tests/wp165.spec.ts --project=chromium`. No /blog/ page, no Blog
 *              link in the header, drawer, no-JS nav or footer of any page, nothing in llms.txt or the sitemap, and the sources really are all drafts.
 *   LIVE       a scratch build with the drafts lifted: set `draft: false` in src/content/blog/*.md, `npx astro build --outDir .work/live-dist`, put the
 *              files back, `node scripts/postbuild-redirects.mjs .work/live-dist`, serve it with
 *              `npx astro preview --outDir .work/live-dist --port 4911 --host 127.0.0.1 --ignore-lock`, then
 *              `DIST_DIR=.work/live-dist PORT=4911 npx playwright test tests/wp165.spec.ts --project=chromium`. The index, each built post (byline, figures note,
 *              Substack line or none, full text, Title Case, BlogPosting JSON-LD, More Essays), the nav, llms.txt, the sitemap, the header fit and axe.
 * Always (either state): the shared draft filter, the nav gate, the verbatim-essay exemption helper, the front matter of the three files and the register
 * corrections in the two re-posts.
 *
 * Word counts: the feed's bodies hold 1,596 (Father) and 3,537 (Beyond, without its title, subtitle and byline lines, which the page shows as its header) words
 * when a tag is read as a word break. The register corrections add 34 words to the first (1,630) and 1 to the second (3,538); the live test pins those, within 2%.
 */

const LIVE = existsSync(join(DIST_DIR, 'blog', 'index.html'));
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
const text = (raw: string) => decode(raw.replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;:)])/g, '$1').trim();
type Node = Record<string, unknown>;
const ld = (rel: string): Node[] =>
  [...html(rel).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => ((JSON.parse(m[1]) as { '@graph'?: Node[] })['@graph'] ?? []) as Node[]);
const nodeOf = (rel: string, type: string): Node => {
  const n = ld(rel).find((x) => [x['@type']].flat().includes(type));
  expect(n, `${rel} has a ${type} node`).toBeTruthy();
  return n as Node;
};
/** The post body (<div class="prose post__body">) of a built post page, to its own closing tag. */
function bodyHtml(rel: string): string {
  const raw = html(rel);
  const open = /<div class="prose post__body"[^>]*>/.exec(raw);
  expect(open, `${rel} has a post body`).toBeTruthy();
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = open!.index;
  let depth = 0;
  for (let m = tag.exec(raw); m; m = tag.exec(raw)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return raw.slice(open!.index, tag.lastIndex);
  }
  throw new Error(`${rel}: the post body is not closed`);
}
const ORIGIN = 'https://coderstrust.global';
const SUBSTACK_HOST = 'tergadesidero178981.substack.com';
const BYLINE = 'By Aziz Ahmad, Co-Founder and Chairman of CodersTrust';
const PROFILE = '/about/team/aziz-ahmad/';
const UPDATED = '2026-11-05';
const UPDATED_SHOWN = 'November 5, 2026';

interface Post {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  iso: string;
  shown: string;
  substack?: string;
  first: string;
  last: string;
  words: number;
  headings: number;
}
const FATHER: Post = {
  slug: 'the-father-the-godfather-and-the-jobs-of-our-children',
  title: 'The Father, the Godfather, and the Jobs of Our Children',
  subtitle: 'What two AI pioneers tell us about youth employment in Bangladesh and beyond',
  excerpt: 'What two AI pioneers tell us about youth employment in Bangladesh and beyond.',
  iso: '2026-10-16',
  shown: 'October 16, 2026',
  substack: `https://${SUBSTACK_HOST}/p/the-father-the-godfather-and-the`,
  first: 'The man who named artificial intelligence and the man who made it work have, between them, handed my generation a warning and a homework assignment.',
  last: 'McKenzie, D. (2017), “How Effective Are Active Labor Market Policies in Developing Countries?”, World Bank.',
  words: 1630,
  headings: 7,
};
const BEYOND: Post = {
  slug: 'beyond-digital-literacy',
  title: 'Beyond Digital Literacy: Teaching Our Children and Youth to See Opportunities in the Age of AI',
  subtitle: 'From digital access to digital capabilities and opportunity creation—a globally adaptable model for AI-era economic empowerment, informed by CodersTrust’s experience in Bangladesh.',
  excerpt: 'From digital access to digital capabilities and opportunity creation: a globally adaptable model for AI-era economic empowerment.',
  iso: '2026-10-18',
  shown: 'October 18, 2026',
  substack: `https://${SUBSTACK_HOST}/p/beyond-digital-literacy-teaching`,
  // the body opens with its first section heading, then the first sentence
  first: 'The Question That Stayed with Me A few days ago, I published an essay titled “The Father, the Godfather, and the Jobs of Our Children,” reflecting on the warnings of two pioneers of artificial intelligence',
  last: 'Aziz Ahmad is Co-Founder and Chairman of CodersTrust, leads UTC Associates and is the recently appointed Global Ambassador of the UN General Assembly-mandated University for Peace. October 18, 2026',
  words: 3538,
  headings: 15,
};
const CLOCK: Post = {
  slug: 'the-clock-is-running-bangladesh-demographic-dividend',
  title: 'The Clock Is Running: Bangladesh’s Demographic Dividend Will Not Wait for Its Jobs',
  subtitle: 'The World Bank says South Asia’s demographic tailwinds peak in 2034 and fade. Bangladesh’s peak is 2045, but the jobs are already falling behind.',
  excerpt: 'South Asia’s demographic tailwinds fade after 2034. Bangladesh peaks in 2045, but jobs already lag the workforce and AI-exposed postings are falling.',
  iso: '2026-11-05',
  shown: 'November 5, 2026',
  first: 'For years, I have heard Bangladesh described as a country blessed by its young.',
  last: 'The CodersTrust figures are from our learner records, our October 2026 completer survey and the BIGD randomized trial. The interpretation and the opinions are my own.',
  words: 1500,
  headings: 6,
};
const ALL = [CLOCK, BEYOND, FATHER]; // newest first
const page = (slug: string) => `blog/${slug}/index.html`;
const built = (p: Post) => existsSync(join(DIST_DIR, page(p.slug)));
const SRC = join('src', 'content', 'blog');
const frontMatter = (slug: string) => /^---\n([\s\S]*?)\n---/.exec(readFileSync(join(SRC, `${slug}.md`), 'utf8'))?.[1] ?? '';
const source = (slug: string) => readFileSync(join(SRC, `${slug}.md`), 'utf8');

/* ---------------------------------------------------------------------------------------------- */
test.describe('Always: the draft filter, the nav gate and the exemption helper', () => {
  const entry = (id: string, date: string, draft: boolean, withUrl = true): BlogPostLike => ({
    id,
    data: { title: id, date: new Date(date), draft, repost: true, substackUrl: withUrl ? 'https://example.substack.com/p/x' : undefined },
  });
  test('the filter every Blog surface uses (index, post pages, More Essays, llms.txt, the nav gate) leaves drafts out and sorts newest first', () => {
    const all = [entry('older', '2026-10-16', false), entry('draft-newest', '2026-11-04', true), entry('newer', '2026-10-18', false)];
    const live = publishedBlogPosts(all);
    expect(live.map((e) => e.id)).toEqual(['newer', 'older']);
    expect(otherBlogPosts(live, { id: 'newer' }).map((e) => e.id)).toEqual(['older']);
    expect(blogHref({ id: 'newer' })).toBe('/blog/newer/');
    expect(publishedBlogPosts([entry('a', '2026-10-16', true), entry('b', '2026-10-18', true)]), 'all drafts: no live post').toEqual([]);
    // a re-post needs its Substack URL; a draft without one is not built, so it does not fail the build; a post written for the site needs none
    expect(() => publishedBlogPosts([entry('no-url', '2026-10-20', false, false)])).toThrow(/substackUrl/);
    expect(publishedBlogPosts([entry('draft-no-url', '2026-10-20', true, false)])).toEqual([]);
    expect(publishedBlogPosts([{ id: 'own', data: { title: 'own', date: new Date('2026-11-05'), draft: false, repost: false } }]).map((e) => e.id)).toEqual(['own']);
  });
  test('the nav gate: News alone with no live post; News then Blog with one (header, drawer, no-JS nav and footer all read it)', () => {
    expect(topLinksFor(false)).toEqual([NEWS_LINK]);
    expect(topLinksFor(true)).toEqual([NEWS_LINK, BLOG_LINK]);
    expect(BLOG_LINK).toEqual({ label: 'Blog', href: '/blog/' });
    expect(footerBottomLinksFor(false).map((l) => l.label)).toEqual(['News', 'Privacy', 'Accessibility']);
    expect(footerBottomLinksFor(true).map((l) => l.label)).toEqual(['News', 'Blog', 'Privacy', 'Accessibility']);
  });
  test('the header, the footer, llms.txt and the two Blog pages read the posts through that filter and gate', () => {
    const src = (f: string) => readFileSync(join('src', f), 'utf8');
    expect(src('components/pages/blog/blog.ts')).toMatch(/publishedBlogPosts\(await getCollection\('blog'\)\)/);
    expect(src('components/pages/blog/blog.ts')).toMatch(/hasLiveBlogPosts[\s\S]*\(await allBlogPosts\(\)\)\.length > 0/);
    expect(src('components/system/SiteHeader.astro')).toMatch(/const topLinks = topLinksFor\(await hasLiveBlogPosts\(\)\)/);
    expect(src('components/system/Footer.astro')).toMatch(/const footerBottomLinks = footerBottomLinksFor\(await hasLiveBlogPosts\(\)\)/);
    expect(src('pages/llms.txt.ts')).toMatch(/publishedBlogPosts\(await getCollection\('blog'\)\)/);
    expect(src('pages/blog/[...listing].astro')).toMatch(/return posts\.length \? \[\{ params: \{ listing: undefined \}, props: \{ posts \} \}\] : \[\];/);
    expect(src('pages/blog/[slug].astro')).toMatch(/await allBlogPosts\(\)/);
    for (const f of ['pages/blog/[...listing].astro', 'pages/blog/[slug].astro']) expect(src(f)).not.toMatch(/getCollection\(/);
  });
  test('the verbatim-essay exemption (tests/support/repost.ts) leaves out only the essay element of a /blog/<post>/ page', () => {
    const fixture = '<main><h1>T</h1><div class="prose" data-repost-body=""><p>a</p><div><p>b</p></div><p>c</p></div><p>after</p></main>';
    expect(withoutRepostBody('/about/', fixture)).toBe(fixture);
    expect(withoutRepostBody('/news/a-post/', fixture)).toBe(fixture);
    expect(withoutRepostBody('/blog/', fixture)).toBe(fixture);
    expect(withoutRepostBody('/blog/a-post/', fixture)).toBe('<main><h1>T</h1><p>after</p></main>');
    expect(withoutRepostBody('/blog/a-post/', fixture.replace('data-repost-body=""', 'data-repost-bodyx=""'))).toContain('<p>a</p>');
    expect(routeOfDistFile('blog/a-post/index.html')).toBe('/blog/a-post/');
    expect(routeOfDistFile('index.html')).toBe('/');
  });
});

test.describe('Always: the three post files (owner decisions of 5 November 2026)', () => {
  test('all three are drafts until Aziz approves them: none is built', () => {
    const files = readdirSync(SRC).filter((f) => f.endsWith('.md')).sort();
    expect(files).toEqual(ALL.map((p) => `${p.slug}.md`).sort());
    for (const f of files) expect(frontMatter(f.replace(/\.md$/, '')), f).toMatch(/^draft: true$/m);
  });
  test('the two re-posts carry their Substack URL and figuresUpdated 2026-11-05; the new essay is not a re-post and names no Substack URL', () => {
    for (const p of [FATHER, BEYOND]) {
      const fm = frontMatter(p.slug);
      expect(fm, p.slug).toContain(`substackUrl: "${p.substack}"`);
      expect(fm, p.slug).toMatch(new RegExp(`^figuresUpdated: ${UPDATED}$`, 'm'));
      expect(fm, p.slug).not.toMatch(/^repost:/m); // the default, true
    }
    const fm = frontMatter(CLOCK.slug);
    expect(fm).toMatch(/^repost: false$/m);
    expect(fm).not.toMatch(/substackUrl|figuresUpdated/);
    // its source link and DOI are kept
    expect(source(CLOCK.slug)).toContain('[Demographic Change in South Asia: From Tailwinds to Headwinds for Development](https://doi.org/10.1596/978-1-4648-0959-0)');
  });
  test('the Father essay states the register’s figures and wording (and keeps the price sentence, by the owner’s decision)', () => {
    const s = source(FATHER.slug);
    for (const want of [
      'Since 2014, we have trained more than 130,000 learners.', // SC-01
      'A 2017 World Bank review of nine randomized vocational training trials found employment rose by an average of just 2.3 percentage points, and only three of the nine raised employment significantly at all.', // RC-06, RC-06a
      'Women who attended earned 54% more, were 26% more likely to be employed and 2.8 times as likely to freelance.', // RC-13, RC-03
      'Their households spent 43% more and fewer took out loans.', // RC-14, RC-05
      'Employment rose from 48.0% before training to 78.2% at the October 2026 survey, and median monthly income rose from $98 to $245.', // OC-01, OC-03
      'Of 2014–2023 completers who had no income before the course, 70.8% (34 of 48) were earning at the survey', // OC-02
      'about one in eight surveyed completers named freelancing for foreign clients or a job abroad as their main income source.', // OC-07
      'Responses came from 58 of Bangladesh\'s 64 districts', // OC-09
      'onboarding more than 1.5 million National University learners as the university\'s official training partner', // SC-04
      'our YouthWIDE program aims to train 1 million educated youth for digital employment by 2030, in Bangladesh and similar countries in South Asia and the Middle East and North Africa, depending on government and donor commitments.', // IN-01
      '*Aziz Ahmad is Co-Founder and Chairman of CodersTrust, leads UTC Associates and is the recently appointed Global Ambassador', // ID-03, ID-13
      'At national scale, the cost falls from about $500 to $300 per trainee.', // kept: owner decision 1
    ])
      expect(s, want).toContain(want);
    for (const gone of ['Global Chairman', 'CEO of UTC', '47.4%', '77.9%', 'tripled', '$82', '72.3%', '55 of', 'two million', 'skills partner', '53% more', '28% more', '3.6 times', '41% more', '39% less', 'about a third', '130,000 young people'])
      expect(s, gone).not.toContain(gone);
  });
  test('the Beyond essay states the register’s figures and wording', () => {
    const s = source(BEYOND.slug);
    for (const want of [
      'an essay titled “The Father, the Godfather, and the Jobs of Our Children,” reflecting', // the earlier essay's published title
      'my work over the past twelve years, since 2014, helping young people', // ID-08: "12 years" with the year visible
      'CodersTrust has trained more than 130,000 learners and has worked in 16 countries and territories.', // SC-01, SC-03 ("has worked", never "programs in": tests/wp58.spec.ts)
      'treatment-on-treated estimates of approximately 26% higher employment and 54% higher monthly income', // RC-13
      'the evaluation estimated approximately 54% higher monthly income and 26% higher employment relative to the control group.', // RC-13
      'reported employment increased from 48.0% before training to 78.2% at the October 2026 survey. Median monthly income rose from approximately $98 to $245.', // OC-01, OC-03
      '70.8% (34 of 48) were earning at the October 2026 survey.', // OC-02
      'Aziz Ahmad is Co-Founder and Chairman of CodersTrust, leads UTC Associates and is the recently appointed Global Ambassador', // ID-03, ID-13
    ])
      expect(s, want).toContain(want);
    for (const gone of ['Global Chairman', 'CEO of UTC', 'and Youth,”', '15 countries', 'programs in 16', '25.75%', '54.56%', '53% higher', '28% higher', '47.4%', '77.9%', '$82', '72.3%', '130,000 young people'])
      expect(s, gone).not.toContain(gone);
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('Always: the new essay meets the site’s own gates (it is not a re-post, so nothing on its page is exempt)', () => {
  test('front matter: a page title within 46 characters, a meta description within 155, typographic apostrophes', () => {
    const fm = frontMatter(CLOCK.slug);
    const field = (k: string) => new RegExp(`^${k}: "([^"]*)"$`, 'm').exec(fm)?.[1] ?? '';
    expect(field('title')).toBe(CLOCK.title);
    expect(field('subtitle')).toBe(CLOCK.subtitle);
    expect(field('excerpt')).toBe(CLOCK.excerpt);
    expect(field('excerpt').length).toBeLessThanOrEqual(155);
    expect(field('seoTitle')).toBe('The Clock Is Running on Bangladesh’s Dividend');
    expect(field('seoTitle').length).toBeLessThanOrEqual(46);
    expect(fm).not.toMatch(/[A-Za-z]'[A-Za-z]/);
  });
  test('the body uses the site’s registered wording for CodersTrust’s figures and has no serial comma', () => {
    const s = source(CLOCK.slug);
    for (const want of [
      'run by the BRAC Institute of Governance and Development (BIGD):', // BIGD spelled out at first mention (tests/wp54.spec.ts)
      'and had an estimated 41 percent higher monthly income.', // RC-01 wording (tests/wp63.spec.ts)
      'Median monthly income was $245; the median before training was $98.', // OC-03 wording, never "up from $98" (tests/wp67.spec.ts)
      'CodersTrust has trained more than 130,000 learners since 2014.', // SC-01
    ])
      expect(s, want).toContain(want);
    for (const gone of ['up from $98', 'their monthly income was', 'alive, and the choices', 'economies, and only 34', 'employed, and informal', 'doors, and the aging', 'earning, or with one']) expect(s, gone).not.toContain(gone);
  });
});

test.describe('ZERO LIVE (the committed build): no Blog page and no Blog link anywhere', () => {
  test.skip(LIVE, 'this build has live Blog posts (the LIVE group runs instead)');
  test('dist/ has no /blog/ page at all, and the sources agree: no post is live', () => {
    expect(existsSync(join(DIST_DIR, 'blog'))).toBe(false);
    expect(readdirSync(SRC).filter((f) => f.endsWith('.md') && !/^draft: true$/m.test(frontMatter(f.replace(/\.md$/, ''))))).toEqual([]);
  });
  test('no built page links to /blog/; the header, drawer, no-JS nav and footer carry News alone, as before WP165', () => {
    const pages = listPages();
    expect(pages.length).toBeGreaterThan(100);
    for (const pg of pages) {
      const raw = readFileSync(pg.file, 'utf8');
      expect(raw.includes(`href="${BASE}blog/`), `${pg.route} links to /blog/`).toBe(false);
      const header = /<header class="site-header"[\s\S]*?<\/header>/.exec(raw)?.[0] ?? '';
      const nav = /<nav class="site-nav"[\s\S]*?<\/nav>/.exec(header)?.[0] ?? '';
      expect([...nav.matchAll(/<a class="site-nav__link" href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => `${m[2]} ${m[1]}`), pg.route).toEqual([`News ${BASE}news/`]);
      const bottom = /<div class="footer__bottom"[\s\S]*?<\/div>/.exec(raw)?.[0] ?? '';
      expect([...bottom.matchAll(/<a href="[^"]+"[^>]*>([^<]*)<\/a>/g)].map((m) => m[1]), pg.route).toEqual(['News', 'Privacy', 'Accessibility']);
    }
  });
  test('llms.txt and the sitemap name no Blog page', () => {
    const llms = html('llms.txt');
    expect(llms).not.toContain('/blog/');
    expect(llms).not.toMatch(/^## Blog$/m);
    expect(llms).not.toMatch(/^- \[Blog\]/m);
    expect(html('sitemap-0.xml')).not.toContain('/blog/');
  });
});

/* ---------------------------------------------------------------------------------------------- */
test.describe('LIVE (a build with the drafts lifted: see the header of this file)', () => {
  test.skip(!LIVE, 'no live Blog post in this build (all drafts): the ZERO LIVE group runs instead');
  const live = () => ALL.filter(built);
  const INDEX = 'blog/index.html';

  test('the index lists the built posts newest first, each with its date, title, excerpt and link; its JSON-LD lists the same', () => {
    expect(live().length).toBeGreaterThan(0);
    const raw = html(INDEX);
    const cards = [...raw.matchAll(/<article class="card card--link news"[\s\S]*?<\/article>/g)].map((m) => m[0]);
    expect(cards).toHaveLength(live().length);
    cards.forEach((card, i) => {
      const p = live()[i];
      expect(card).toContain(`<time datetime="${p.iso}"`);
      expect(text(card)).toContain(p.shown);
      expect(/<a class="card__link" href="([^"]+)"/.exec(card)?.[1]).toBe(`${BASE}blog/${p.slug}/`);
      expect(text(/<h3[\s\S]*?<\/h3>/.exec(card)![0])).toBe(p.title);
      expect(text(card)).toContain(p.excerpt);
    });
    expect(text(/<h1[\s\S]*?<\/h1>/.exec(raw)![0])).toBe('Blog');
    expect(text(/<p class="hero__lead"[\s\S]*?<\/p>/.exec(raw)![0])).toBe('Essays by Aziz Ahmad, Co-Founder and Chairman of CodersTrust, on youth, work and technology.');
    const reposts = live().filter((p) => p.substack).length;
    const lead = /<p class="sh__lead lead"[^>]*>([\s\S]*?)<\/p>/.exec(raw)?.[1];
    if (reposts === live().length) expect(lead).toBe('Each essay first appeared on Aziz Ahmad’s Substack and is republished here with his permission.');
    else if (reposts > 0) expect(lead).toBe('Some of these essays first appeared on Aziz Ahmad’s Substack and are republished here with his permission.');
    else expect(lead).toBeUndefined();
    for (const h of [...raw.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((m) => text(m[1]))) expect(h, 'Title Case').toBe(titleCase(h));
    const cp = nodeOf(INDEX, 'CollectionPage');
    expect(cp.dateModified).toBe('2026-11-05');
    expect((cp.mainEntity as { itemListElement: { url: string }[] }).itemListElement.map((x) => x.url)).toEqual(live().map((p) => `${ORIGIN}/blog/${p.slug}/`));
  });

  for (const p of ALL) {
    test.describe(p.slug, () => {
      test.skip(!built(p), `${p.slug} is not live in this build`);
      test('H1, subtitle, date, the byline linking to his team profile with the role it shows, and (a re-post) the figures note', () => {
        const raw = html(page(p.slug));
        expect(text(/<h1[\s\S]*?<\/h1>/.exec(raw)![0])).toBe(p.title);
        expect(text(/<p class="post__subtitle"[\s\S]*?<\/p>/.exec(raw)![0])).toBe(p.subtitle);
        expect(raw).toContain(`<time datetime="${p.iso}"`);
        const byline = /<p class="post__byline"[\s\S]*?<\/p>/.exec(raw)![0];
        expect(text(byline)).toBe(BYLINE);
        expect(/<a class="link" href="([^"]+)"[^>]*>Aziz Ahmad<\/a>/.exec(byline)?.[1]).toBe(`${BASE}${PROFILE.slice(1)}`);
        expect(text(/<p class="prof__role"[\s\S]*?<\/p>/.exec(html('about/team/aziz-ahmad/index.html'))![0])).toBe('Co-Founder and Chairman');
        const note = /<p class="post__note"[\s\S]*?<\/p>/.exec(raw)?.[0];
        if (p.substack) {
          expect(text(note ?? ''), 'the figures note under the byline').toBe(`Updated on ${UPDATED_SHOWN}, to align figures with CodersTrust’s current published figures. Originally published on Substack on ${p.shown}.`);
          expect(raw.indexOf('class="post__note"')).toBeGreaterThan(raw.indexOf('class="post__byline"'));
        } else expect(note, 'a post written for the site carries no figures note').toBeUndefined();
      });
      test('a re-post closes with "Originally published on Substack on <date>." (rel and "(opens …)"); a post written for the site never mentions Substack', () => {
        const raw = html(page(p.slug));
        const line = /<p class="post__origin"[\s\S]*?<\/p>/.exec(raw)?.[0];
        if (!p.substack) {
          expect(line).toBeUndefined();
          expect(/<main[\s\S]*<\/main>/.exec(raw)![0]).not.toContain('Substack');
          expect(raw).not.toContain('data-repost-body');
          return;
        }
        expect(text(line!)).toBe(`Originally published on Substack on ${p.shown}.`);
        const a = /<a class="link" href="([^"]+)" rel="([^"]+)"[^>]*>Substack<span class="sr-only"[^>]*> \(opens ([^)]+)\)<\/span><\/a>/.exec(line!);
        expect(a).toBeTruthy();
        expect(a![1]).toBe(p.substack);
        expect(a![2].split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
        expect(a![3]).toBe(SUBSTACK_HOST);
        expect(raw).toContain('data-repost-body');
      });
      test('the full text: first and last sentences, and the word count (within 2%)', () => {
        const body = text(bodyHtml(page(p.slug)));
        expect(body.startsWith(p.first), 'first sentence').toBe(true);
        expect(body.endsWith(p.last), 'last sentence').toBe(true);
        const words = body.split(/\s+/).length;
        expect(Math.abs(words - p.words) / p.words, `${words} words against ${p.words}`).toBeLessThanOrEqual(0.02);
      });
      test('every heading is in Title Case; the body headings are h2', () => {
        const raw = html(page(p.slug));
        const heads = [...bodyHtml(page(p.slug)).matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)];
        expect(heads).toHaveLength(p.headings);
        for (const [, level, inner] of heads) {
          expect(level).toBe('2');
          expect(text(inner)).toBe(titleCase(text(inner)));
        }
        for (const h of [...raw.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((m) => text(m[1]))) expect(h, 'Title Case').toBe(titleCase(h));
      });
      test('BlogPosting JSON-LD (datePublished, dateModified, author, publisher, isBasedOn for a re-post only), breadcrumbs, meta description and title', () => {
        const post = nodeOf(page(p.slug), 'BlogPosting');
        expect(post.headline).toBe(p.title);
        expect(post.datePublished).toBe(p.iso);
        expect(post.dateModified).toBe(p.substack ? UPDATED : p.iso);
        expect(post.author).toEqual({ '@type': 'Person', '@id': `${ORIGIN}${PROFILE}#person`, name: 'Aziz Ahmad', url: `${ORIGIN}${PROFILE}` });
        expect(post.publisher).toEqual({ '@id': `${ORIGIN}/#organization` });
        expect(post.isBasedOn).toBe(p.substack);
        expect(post.description).toBe(p.excerpt);
        expect(nodeOf(page(p.slug), 'WebPage').mainEntity).toEqual({ '@id': `${ORIGIN}/blog/${p.slug}/#article` });
        expect((nodeOf(page(p.slug), 'BreadcrumbList').itemListElement as { item: string }[]).map((c) => c.item)).toEqual([`${ORIGIN}/`, `${ORIGIN}/blog/`, `${ORIGIN}/blog/${p.slug}/`]);
        expect(decode(/<meta name="description" content="([^"]*)"/.exec(html(page(p.slug)))![1])).toBe(p.excerpt);
        expect(decode(/<title>([^<]*)<\/title>/.exec(html(page(p.slug)))![1]).length).toBeLessThanOrEqual(60);
      });
      test('"More Essays" lists the other live posts, newest first, and links back to the index', () => {
        const others = live().filter((x) => x.slug !== p.slug).slice(0, 3);
        const more = /<section class="post__more[\s\S]*?<\/section>/.exec(html(page(p.slug)))?.[0] ?? '';
        expect([...more.matchAll(/<a class="card__link" href="([^"]+)"/g)].map((m) => m[1])).toEqual(others.map((x) => `${BASE}blog/${x.slug}/`));
        if (others.length) expect(more).toContain(`href="${BASE}blog/"`);
      });
      test('the site-wide sweeps leave out only a re-post’s essay element (tests/support/repost.ts)', () => {
        const raw = html(page(p.slug));
        const rest = withoutRepostBody(`/blog/${p.slug}/`, raw);
        if (!p.substack) {
          expect(rest, 'a post written for the site is swept whole').toBe(raw);
          return;
        }
        expect(rest.length).toBeLessThan(raw.length);
        expect(text(rest)).not.toContain(p.last);
        for (const kept of [p.title, BYLINE, `Originally published on Substack on ${p.shown}.`]) expect(text(rest)).toContain(kept);
      });
    });
  }

  test('Blog sits right after News in the header, the drawer, the no-JS nav and the footer, on every built page; it is the current page on /blog/ pages only', () => {
    const blog = `href="${BASE}blog/"`;
    const news = `href="${BASE}news/"`;
    for (const pg of listPages()) {
      const raw = readFileSync(pg.file, 'utf8');
      const header = /<header class="site-header"[\s\S]*?<\/header>/.exec(raw)?.[0] ?? '';
      const nav = /<nav class="site-nav"[\s\S]*?<\/nav>/.exec(header)?.[0] ?? '';
      expect([...nav.matchAll(/<a class="site-nav__link" href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => `${m[2]} ${m[1]}`), pg.route).toEqual([`News ${BASE}news/`, `Blog ${BASE}blog/`]);
      const drawer = [...header.matchAll(/<a class="drawer__top" href="([^"]+)"/g)].map((m) => m[1]);
      expect(drawer.indexOf(`${BASE}blog/`), pg.route).toBe(drawer.indexOf(`${BASE}news/`) + 1);
      const noscript = /<nav class="nav-noscript"[\s\S]*?<\/nav>/.exec(header)?.[0] ?? '';
      expect(noscript.indexOf(blog), pg.route).toBeGreaterThan(noscript.indexOf(news));
      const bottom = /<div class="footer__bottom"[\s\S]*?<\/div>/.exec(raw)?.[0] ?? '';
      expect([...bottom.matchAll(/<a href="[^"]+"[^>]*>([^<]*)<\/a>/g)].map((m) => m[1]), pg.route).toEqual(['News', 'Blog', 'Privacy', 'Accessibility']);
      expect(/<a class="site-nav__link" href="[^"]*blog\/"[^>]*aria-current="page"/.test(raw), pg.route).toBe(pg.route.startsWith('/blog/'));
    }
  });
  test('llms.txt: Blog after News among the reference pages, and a "## Blog" section listing each live post with its meta description', () => {
    const lines = html('llms.txt').split('\n');
    const ref = lines.slice(lines.indexOf('## Canonical reference pages'), lines.indexOf('## Blog'));
    const at = ref.findIndex((l) => l.startsWith(`- [Blog](${ORIGIN}/blog/): `));
    expect(at).toBeGreaterThan(0);
    expect(ref[at - 1]).toMatch(new RegExp(`^- \\[News\\]\\(${ORIGIN}/news/\\)`));
    const section = lines.slice(lines.indexOf('## Blog') + 1, lines.indexOf('## Deprioritised'));
    expect(section[0]).toBe('Essays by Aziz Ahmad. They are his views; the figures CodersTrust publishes are on the Impact pages above.');
    expect(section.filter((l) => l.startsWith('- '))).toEqual(live().map((p) => `- [${p.title}](${ORIGIN}/blog/${p.slug}/): ${p.excerpt}`));
  });
  test('the sitemap lists /blog/ and every live post', () => {
    const sm = html('sitemap-0.xml');
    for (const path of ['/blog/', ...live().map((p) => `/blog/${p.slug}/`)]) expect(sm).toContain(`<loc>${ORIGIN}${path}</loc>`);
  });

  for (const width of [1024, 1100, 1280]) {
    test(`the desktop header keeps one row at ${width} px with Blog beside News`, async ({ page: pw }) => {
      await pw.setViewportSize({ width, height: 800 });
      await open(pw, 'blog/');
      await fontsReady(pw);
      const fit = await pw.evaluate(() => {
        const row = document.querySelector<HTMLElement>('.site-header__row')!;
        const items = [...document.querySelectorAll<HTMLElement>('.site-nav__item')];
        const tops = new Set(items.map((i) => Math.round(i.getBoundingClientRect().top)));
        const actions = document.querySelector<HTMLElement>('.site-header__actions')!.getBoundingClientRect();
        const last = items[items.length - 1].getBoundingClientRect();
        return { rowOverflow: row.scrollWidth - row.clientWidth, rows: tops.size, gap: actions.left - last.right, docOverflow: document.documentElement.scrollWidth - window.innerWidth, lastLabel: items[items.length - 1].innerText.trim() };
      });
      expect(fit.lastLabel).toBe('Blog');
      expect(fit.rows).toBe(1);
      expect(fit.rowOverflow).toBeLessThanOrEqual(0);
      expect(fit.gap).toBeGreaterThan(0);
      expect(fit.docOverflow).toBeLessThanOrEqual(0);
    });
  }

  const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
  for (const vp of VIEWPORTS) {
    test.describe(`axe ${vpLabel(vp)}`, () => {
      test.use({ viewport: vp });
      for (const rel of ['blog/', ...ALL.map((p) => `blog/${p.slug}/`)]) {
        test(rel, async ({ page: pw }) => {
          test.skip(!existsSync(join(DIST_DIR, rel, 'index.html')), `${rel} is not live in this build`);
          await open(pw, rel);
          await fontsReady(pw);
          await scrollThrough(pw);
          await settleAnimations(pw);
          const results = await new AxeBuilder({ page: pw }).withTags(TAGS).analyze();
          expect(results.violations.map((v) => `${v.id} x${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
          if (vp === MOBILE) expect(await pw.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        });
      }
    });
  }
});
