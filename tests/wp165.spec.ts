import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { titleCase } from '../src/lib/titleCase.mjs';
import { blogHref, otherBlogPosts, publishedBlogPosts, type BlogPostLike } from '../src/lib/blogPosts';
import { BASE, DIST_DIR } from './support/env';
import { MOBILE, VIEWPORTS, fontsReady, open, scrollThrough, settleAnimations, vpLabel } from './support/browser';
import { listPages } from './support/pages';
import { routeOfDistFile, withoutRepostBody } from './support/repost';

/**
 * WP165 (owner request of 5 November 2026): a Blog at /blog/ (index) and /blog/<slug>/ (essays), separate from News, re-publishing Aziz Ahmad's two
 * Substack essays with his permission. Run `npm run build`, then `PORT=4911 npx playwright test tests/wp165.spec.ts --project=chromium`.
 *   Index     the two essays, newest first, with their dates, titles, excerpts and links.
 *   Essays    H1, subtitle, byline linking to his team profile with the role it shows, the full text (first and last sentences, word counts within 2%
 *             of the feed), the "Originally published on Substack on <date>." line with the site's external-link conventions, Title Case headings,
 *             BlogPosting JSON-LD (datePublished, author, publisher, isBasedOn) and breadcrumbs, "More Essays".
 *   Discovery Blog beside News in the header, the drawer, the no-JS nav and the footer; llms.txt; the sitemap.
 *   Drafts    the shared filter (src/lib/blogPosts.ts) leaves drafts out; every draft file in src/content/blog is absent from dist/.
 *   Exemption the site-wide copy sweeps (WP54, WP55, WP56, WP57b, WP59, WP106, WP123, WP127, WP142) skip only the essay element of a /blog/<post>/ page,
 *             Aziz Ahmad's own text (tests/support/repost.ts), and still read the rest of that page and every other page.
 *   Header    the desktop header still fits on one row at 1024 and 1280 px with the extra link.
 *   Axe       zero violations on /blog/ and both essays at 390x844 and 1280x800 (a11y.spec.ts also covers them, as it covers every built page).
 *
 * Word counts: the feed's bodies (RSS content:encoded) hold 1,596 and 3,582 words when a tag is read as a word break. The essay page shows the second
 * essay's first three lines (its title, subtitle and "By Aziz Ahmad | October 18, 2026") as its H1, subtitle, byline and date, so its body holds the
 * other 3,537. The figures in the work-package spec (1,553 and 3,476) are the same bodies with the tags deleted without a break, which fuses the last
 * word of each paragraph with the first word of the next; they are kept below as a second, documented reference.
 */

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
/** The essay element (<div data-repost-body>) of a built essay page, to its own closing tag. */
function essayHtml(rel: string): string {
  const raw = html(rel);
  const open = /<div\b[^>]*\sdata-repost-body(?=[\s=/>])[^>]*>/.exec(raw);
  expect(open, `${rel} has a <div data-repost-body>`).toBeTruthy();
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = open!.index;
  let depth = 0;
  for (let m = tag.exec(raw); m; m = tag.exec(raw)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return raw.slice(open!.index, tag.lastIndex);
  }
  throw new Error(`${rel}: the essay element is not closed`);
}
const ORIGIN = 'https://coderstrust.global';
const SUBSTACK_HOST = 'tergadesidero178981.substack.com';

const POSTS = [
  {
    slug: 'beyond-digital-literacy',
    title: 'Beyond Digital Literacy: Teaching Our Children and Youth to See Opportunities in the Age of AI',
    subtitle: 'From digital access to digital capabilities and opportunity creation—a globally adaptable model for AI-era economic empowerment, informed by CodersTrust’s experience in Bangladesh.',
    excerpt: 'From digital access to digital capabilities and opportunity creation: a globally adaptable model for AI-era economic empowerment.',
    iso: '2026-10-18',
    shown: 'October 18, 2026',
    substack: `https://${SUBSTACK_HOST}/p/beyond-digital-literacy-teaching`,
    // the body opens with its first section heading, then the first sentence
    first: 'The Question That Stayed with Me A few days ago, I published an essay titled “The Father, the Godfather, and the Jobs of Our Children and Youth,” reflecting on the warnings of two pioneers of artificial intelligence: John McCarthy, who gave the field its name, and Geoffrey Hinton, whose work helped make modern AI possible.',
    last: 'Aziz Ahmad is Co-Founder and Global Chairman of CodersTrust, CEO of UTC Associates, and the recently appointed Global Ambassador of the UN General Assembly-mandated University for Peace. October 18, 2026',
    words: 3537,
    specWords: 3476,
    headings: 15,
  },
  {
    slug: 'the-father-the-godfather-and-the-jobs-of-our-children',
    title: 'The Father, the Godfather, and the Jobs of Our Children',
    subtitle: 'What two AI pioneers tell us about youth employment in Bangladesh and beyond',
    excerpt: 'What two AI pioneers tell us about youth employment in Bangladesh and beyond.',
    iso: '2026-10-16',
    shown: 'October 16, 2026',
    substack: `https://${SUBSTACK_HOST}/p/the-father-the-godfather-and-the`,
    first: 'The man who named artificial intelligence and the man who made it work have, between them, handed my generation a warning and a homework assignment.',
    last: 'McKenzie, D. (2017), “How Effective Are Active Labor Market Policies in Developing Countries?”, World Bank.',
    words: 1596,
    specWords: 1553,
    headings: 7,
  },
] as const;
const INDEX = 'blog/index.html';
const page = (slug: string) => `blog/${slug}/index.html`;
const BYLINE = 'By Aziz Ahmad, Co-Founder and Chairman of CodersTrust';
const PROFILE = '/about/team/aziz-ahmad/';

/* ---------------------------------------------------------------------------------------------- */
test.describe('The Blog index', () => {
  test('lists the two essays newest first, each with its date, title, excerpt and link', () => {
    const raw = html(INDEX);
    const cards = [...raw.matchAll(/<article class="card card--link news"[\s\S]*?<\/article>/g)].map((m) => m[0]);
    expect(cards, 'one card per published essay').toHaveLength(POSTS.length);
    cards.forEach((card, i) => {
      const p = POSTS[i];
      expect(card).toContain(`<time datetime="${p.iso}"`);
      expect(text(card)).toContain(p.shown);
      expect(/<a class="card__link" href="([^"]+)"/.exec(card)?.[1], `card ${i + 1} links to its essay`).toBe(`${BASE}blog/${p.slug}/`);
      expect(text(/<h3[\s\S]*?<\/h3>/.exec(card)![0])).toBe(p.title);
      expect(text(card)).toContain(p.excerpt);
    });
  });
  test('has the H1 "Blog", a Title Case eyebrow and section heading, a one-sentence lead naming the author and his role, and a CollectionPage dated 2026-11-05', () => {
    const raw = html(INDEX);
    expect(text(/<h1[\s\S]*?<\/h1>/.exec(raw)![0])).toBe('Blog');
    expect(text(/<p class="hero__eyebrow"[\s\S]*?<\/p>/.exec(raw)![0])).toBe('Essays');
    expect(text(/<p class="hero__lead"[\s\S]*?<\/p>/.exec(raw)![0])).toBe('Essays by Aziz Ahmad, Co-Founder and Chairman of CodersTrust, on youth, work and technology.');
    for (const h of [...raw.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((m) => text(m[1]))) expect(h, 'Title Case').toBe(titleCase(h));
    const page = nodeOf(INDEX, 'CollectionPage');
    expect(page.dateModified).toBe('2026-11-05');
    expect((page.mainEntity as { itemListElement: { url: string }[] }).itemListElement.map((x) => x.url)).toEqual(POSTS.map((p) => `${ORIGIN}/blog/${p.slug}/`));
  });
});

test.describe('Each essay page', () => {
  for (const p of POSTS) {
    test.describe(p.slug, () => {
      test('H1, subtitle, date and the byline linking to his team profile with the role the profile shows', () => {
        const raw = html(page(p.slug));
        expect(text(/<h1[\s\S]*?<\/h1>/.exec(raw)![0])).toBe(p.title);
        expect(text(/<p class="post__subtitle"[\s\S]*?<\/p>/.exec(raw)![0])).toBe(p.subtitle);
        expect(raw).toContain(`<time datetime="${p.iso}"`);
        const byline = /<p class="post__byline"[\s\S]*?<\/p>/.exec(raw)![0];
        expect(text(byline)).toBe(BYLINE);
        expect(/<a class="link" href="([^"]+)"[^>]*>Aziz Ahmad<\/a>/.exec(byline)?.[1]).toBe(`${BASE}${PROFILE.slice(1)}`);
        // the role is the profile's own ("Co-Founder and Chairman", src/content/team/aziz-ahmad.md), and the profile is built
        expect(text(/<p class="prof__role"[\s\S]*?<\/p>/.exec(html('about/team/aziz-ahmad/index.html'))![0])).toBe('Co-Founder and Chairman');
      });
      test('the closing line "Originally published on Substack on <date>." links to the original with rel and the "(opens …)" text', () => {
        const raw = html(page(p.slug));
        const line = /<p class="post__origin"[\s\S]*?<\/p>/.exec(raw)![0];
        expect(text(line)).toBe(`Originally published on Substack on ${p.shown}.`);
        const a = /<a class="link" href="([^"]+)" rel="([^"]+)"[^>]*>Substack<span class="sr-only"[^>]*> \(opens ([^)]+)\)<\/span><\/a>/.exec(line);
        expect(a, 'the Substack link with its screen-reader suffix').toBeTruthy();
        expect(a![1]).toBe(p.substack);
        expect(a![2].split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
        expect(a![3]).toBe(SUBSTACK_HOST);
        expect(line, 'same-tab navigation, the site convention').not.toContain('target=');
      });
      test('the full text: its first and last sentences, and a word count within 2% of the feed', () => {
        const body = text(essayHtml(page(p.slug)));
        expect(body.startsWith(p.first), 'first sentence').toBe(true);
        expect(body.endsWith(p.last), 'last sentence').toBe(true);
        const words = body.split(/\s+/).length;
        expect(Math.abs(words - p.words) / p.words, `${words} words against the feed's ${p.words}`).toBeLessThanOrEqual(0.02);
        // the spec's reference count (tags deleted without a word break: see the note at the top); the page's count is above it by the paragraph breaks
        expect(words).toBeGreaterThan(p.specWords);
      });
      test('every heading is in Title Case, and the body headings are h2 under the H1', () => {
        const raw = html(page(p.slug));
        const heads = [...essayHtml(page(p.slug)).matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)];
        expect(heads, 'section headings in the essay').toHaveLength(p.headings);
        for (const [, level, inner] of heads) {
          expect(level).toBe('2');
          expect(text(inner), 'Title Case').toBe(titleCase(text(inner)));
        }
        for (const h of [...raw.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/g)].map((m) => text(m[1]))) expect(h, 'Title Case').toBe(titleCase(h));
      });
      test('BlogPosting JSON-LD: headline, Substack date, the author as his team profile’s Person, the Organization as publisher, the original as isBasedOn; breadcrumbs', () => {
        const post = nodeOf(page(p.slug), 'BlogPosting');
        expect(post.headline).toBe(p.title);
        expect(post.datePublished).toBe(p.iso);
        expect(post.dateModified).toBe(p.iso);
        expect(post.author).toEqual({ '@type': 'Person', '@id': `${ORIGIN}${PROFILE}#person`, name: 'Aziz Ahmad', url: `${ORIGIN}${PROFILE}` });
        expect(post.publisher).toEqual({ '@id': `${ORIGIN}/#organization` });
        expect(post.isBasedOn).toBe(p.substack);
        expect(post.description).toBe(p.excerpt);
        const web = nodeOf(page(p.slug), 'WebPage');
        expect(web.mainEntity).toEqual({ '@id': `${ORIGIN}/blog/${p.slug}/#article` });
        const crumbs = (nodeOf(page(p.slug), 'BreadcrumbList').itemListElement as { item: string }[]).map((c) => c.item);
        expect(crumbs).toEqual([`${ORIGIN}/`, `${ORIGIN}/blog/`, `${ORIGIN}/blog/${p.slug}/`]);
        // the meta description is the excerpt (155 characters at most), the <title> fits in 60 characters
        expect(decode(/<meta name="description" content="([^"]*)"/.exec(html(page(p.slug)))![1])).toBe(p.excerpt);
        expect(decode(/<title>([^<]*)<\/title>/.exec(html(page(p.slug)))![1]).length).toBeLessThanOrEqual(60);
      });
      test('"More Essays" lists the other essay and links back to the index', () => {
        const raw = html(page(p.slug));
        const more = /<section class="post__more[\s\S]*?<\/section>/.exec(raw)![0];
        const others = POSTS.filter((x) => x.slug !== p.slug);
        expect([...more.matchAll(/<a class="card__link" href="([^"]+)"/g)].map((m) => m[1])).toEqual(others.map((x) => `${BASE}blog/${x.slug}/`));
        expect(more).toContain(`href="${BASE}blog/"`);
      });
    });
  }
});

test.describe('Navigation and discovery', () => {
  test('Blog sits right after News in the header, the drawer, the no-JS nav and the footer, on every built page', () => {
    const pages = listPages();
    expect(pages.length).toBeGreaterThan(100);
    const blog = `href="${BASE}blog/"`;
    const news = `href="${BASE}news/"`;
    for (const pg of pages) {
      const raw = readFileSync(pg.file, 'utf8');
      const header = /<header class="site-header"[\s\S]*?<\/header>/.exec(raw)?.[0] ?? '';
      const nav = /<nav class="site-nav"[\s\S]*?<\/nav>/.exec(header)?.[0] ?? '';
      const tops = [...nav.matchAll(/<a class="site-nav__link" href="([^"]+)"[^>]*>([^<]*)<\/a>/g)].map((m) => `${m[2]} ${m[1]}`);
      expect(tops, `${pg.route}: the header's plain links`).toEqual([`News ${BASE}news/`, `Blog ${BASE}blog/`]);
      const drawer = [...header.matchAll(/<a class="drawer__top" href="([^"]+)"/g)].map((m) => m[1]);
      expect(drawer.indexOf(`${BASE}blog/`), `${pg.route}: the drawer lists Blog after News`).toBe(drawer.indexOf(`${BASE}news/`) + 1);
      const noscript = /<nav class="nav-noscript"[\s\S]*?<\/nav>/.exec(header)?.[0] ?? '';
      expect(noscript.indexOf(blog), `${pg.route}: the no-JS nav lists Blog after News`).toBeGreaterThan(noscript.indexOf(news));
      const bottom = /<div class="footer__bottom"[\s\S]*?<\/div>/.exec(raw)?.[0] ?? '';
      expect(bottom.indexOf(blog), `${pg.route}: the footer's bottom row lists Blog after News`).toBeGreaterThan(bottom.indexOf(news));
      expect(bottom.indexOf(news)).toBeGreaterThan(-1);
    }
  });
  test('the Blog link is the current page on /blog/ and on the essays, and on no other page', () => {
    for (const pg of listPages()) {
      const current = /<a class="site-nav__link" href="[^"]*blog\/"[^>]*aria-current="page"/.test(readFileSync(pg.file, 'utf8'));
      expect(current, pg.route).toBe(pg.route.startsWith('/blog/'));
    }
  });
  test('llms.txt lists the Blog among the reference pages and each essay, with its meta description, under "## Blog"', () => {
    const lines = html('llms.txt').split('\n');
    const ref = lines.slice(lines.indexOf('## Canonical reference pages'), lines.indexOf('## Blog'));
    expect(ref.some((l) => l.startsWith(`- [Blog](${ORIGIN}/blog/): `))).toBe(true);
    const at = lines.indexOf('## Blog');
    expect(at).toBeGreaterThan(-1);
    const section = lines.slice(at + 1, lines.indexOf('## Deprioritised'));
    expect(section[0]).toBe('Essays by Aziz Ahmad, republished from his Substack. They are his views; the figures CodersTrust publishes are on the Impact pages above.');
    expect(section.filter((l) => l.startsWith('- '))).toEqual(POSTS.map((p) => `- [${p.title}](${ORIGIN}/blog/${p.slug}/): ${p.excerpt}`));
  });
  test('the sitemap lists /blog/ and both essays', () => {
    const sm = html('sitemap-0.xml');
    for (const path of ['/blog/', ...POSTS.map((p) => `/blog/${p.slug}/`)]) expect(sm).toContain(`<loc>${ORIGIN}${path}</loc>`);
  });
});

test.describe('Drafts', () => {
  const entry = (id: string, date: string, draft: boolean, withUrl = true): BlogPostLike => ({
    id,
    data: { title: id, date: new Date(date), draft, repost: true, substackUrl: withUrl ? 'https://example.substack.com/p/x' : undefined },
  });
  test('the filter every Blog surface uses (index, essay pages, More Essays, llms.txt) leaves a draft out and sorts newest first', () => {
    const all = [entry('older', '2026-10-16', false), entry('draft-demographic-dividend', '2026-11-04', true), entry('newer', '2026-10-18', false)];
    const live = publishedBlogPosts(all);
    expect(live.map((e) => e.id)).toEqual(['newer', 'older']);
    expect(otherBlogPosts(live, { id: 'newer' }).map((e) => e.id)).toEqual(['older']);
    expect(blogHref({ id: 'newer' })).toBe('/blog/newer/');
    // a re-post needs its Substack URL; a draft without one is not built, so it does not fail the build
    expect(() => publishedBlogPosts([entry('no-url', '2026-10-20', false, false)])).toThrow(/substackUrl/);
    expect(publishedBlogPosts([entry('draft-no-url', '2026-10-20', true, false)])).toEqual([]);
  });
  test('the index, the essay pages and llms.txt read the posts through that filter', () => {
    const src = (f: string) => readFileSync(join('src', f), 'utf8');
    expect(src('components/pages/blog/blog.ts')).toMatch(/publishedBlogPosts\(await getCollection\('blog'\)\)/);
    expect(src('pages/llms.txt.ts')).toMatch(/publishedBlogPosts\(await getCollection\('blog'\)\)/);
    for (const f of ['pages/blog/index.astro', 'pages/blog/[slug].astro']) expect(src(f)).toMatch(/await allBlogPosts\(\)/);
    expect(src('pages/blog/index.astro')).not.toMatch(/getCollection\(/);
    expect(src('pages/blog/[slug].astro')).not.toMatch(/getCollection\(/);
  });
  test('dist/ holds exactly the published essays: every draft file in src/content/blog is absent from the pages, the index, the sitemap and llms.txt', () => {
    const dir = join('src', 'content', 'blog');
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
    const isDraft = (f: string) => /^draft:\s*true\s*$/m.test(/^---\n([\s\S]*?)\n---/.exec(readFileSync(join(dir, f), 'utf8'))?.[1] ?? '');
    const published = files.filter((f) => !isDraft(f)).map((f) => f.replace(/\.md$/, '')).sort();
    expect(published).toEqual(POSTS.map((p) => p.slug).sort());
    const built = readdirSync(join(DIST_DIR, 'blog'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    expect(built).toEqual(published);
    const surfaces = [html(INDEX), html('sitemap-0.xml'), html('llms.txt'), ...published.map((s) => html(page(s)))];
    for (const f of files.filter(isDraft)) {
      const slug = f.replace(/\.md$/, '');
      expect(existsSync(join(DIST_DIR, 'blog', slug)), `draft ${slug} has no page`).toBe(false);
      for (const s of surfaces) expect(s.includes(`blog/${slug}/`), `draft ${slug} is not linked or listed`).toBe(false);
    }
  });
});

test.describe('The verbatim-essay exemption of the site-wide sweeps (tests/support/repost.ts; scripts/check-facts.mjs has its own self-tests)', () => {
  test('it leaves out the essay element of a /blog/<post>/ page and nothing else of that page', () => {
    for (const p of POSTS) {
      const route = `/blog/${p.slug}/`;
      const raw = html(page(p.slug));
      const rest = withoutRepostBody(route, raw);
      expect(rest.length, route).toBeLessThan(raw.length);
      expect(rest).not.toContain('data-repost-body');
      // the essay is gone ...
      expect(text(rest)).not.toContain(p.last);
      expect(rest).not.toMatch(/Global Chairman/);
      // ... and the page around it stays: H1, subtitle, byline, Substack line, More Essays, footer, JSON-LD
      for (const kept of [p.title, BYLINE, `Originally published on Substack on ${p.shown}.`, 'More Essays']) expect(text(rest), `${route} keeps "${kept}"`).toContain(kept);
      expect(rest).toContain('<footer');
      expect(rest).toContain('application/ld+json');
    }
  });
  test('it changes no other page, the /blog/ index included, and stops at the essay element’s own closing tag', () => {
    expect(withoutRepostBody('/blog/', html(INDEX))).toBe(html(INDEX));
    const fixture = '<main><h1>T</h1><div class="prose" data-repost-body=""><p>a</p><div><p>b</p></div><p>c</p></div><p>after</p></main>';
    expect(withoutRepostBody('/about/', fixture)).toBe(fixture);
    expect(withoutRepostBody('/news/a-post/', fixture)).toBe(fixture);
    expect(withoutRepostBody('/blog/a-post/', fixture)).toBe('<main><h1>T</h1><p>after</p></main>');
    expect(withoutRepostBody('/blog/a-post/', fixture.replace('data-repost-body=""', 'data-repost-bodyx=""'))).toContain('<p>a</p>');
    expect(routeOfDistFile('blog/a-post/index.html')).toBe('/blog/a-post/');
    expect(routeOfDistFile('index.html')).toBe('/');
  });
});

test.describe('Header fit', () => {
  for (const width of [1024, 1100, 1280]) {
    test(`the desktop header keeps one row at ${width} px with Blog beside News`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await open(page, 'blog/');
      await fontsReady(page);
      const fit = await page.evaluate(() => {
        const row = document.querySelector<HTMLElement>('.site-header__row')!;
        const items = [...document.querySelectorAll<HTMLElement>('.site-nav__item')];
        const tops = new Set(items.map((i) => Math.round(i.getBoundingClientRect().top)));
        const actions = document.querySelector<HTMLElement>('.site-header__actions')!.getBoundingClientRect();
        const last = items[items.length - 1].getBoundingClientRect();
        return { rowOverflow: row.scrollWidth - row.clientWidth, rows: tops.size, gap: actions.left - last.right, docOverflow: document.documentElement.scrollWidth - window.innerWidth, blogVisible: items[items.length - 1].innerText.trim() };
      });
      expect(fit.blogVisible).toBe('Blog');
      expect(fit.rows, 'every nav item on one line').toBe(1);
      expect(fit.rowOverflow, 'the header row does not overflow').toBeLessThanOrEqual(0);
      expect(fit.gap, 'the Blog link does not run into the actions').toBeGreaterThan(0);
      expect(fit.docOverflow, 'no horizontal scroll').toBeLessThanOrEqual(0);
    });
  }
});

test.describe('Axe on the Blog', () => {
  const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
  for (const vp of VIEWPORTS) {
    test.describe(vpLabel(vp), () => {
      test.use({ viewport: vp });
      for (const rel of ['blog/', ...POSTS.map((p) => `blog/${p.slug}/`)]) {
        test(rel, async ({ page }) => {
          await open(page, rel);
          await fontsReady(page);
          await scrollThrough(page);
          await settleAnimations(page);
          const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
          expect(results.violations.map((v) => `${v.id} x${v.nodes.length}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
          // no horizontal scroll on a phone (the reference lists print long URLs)
          if (vp === MOBILE) expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
        });
      }
    });
  }
});
