// @ts-check
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { REDIRECTS } from './src/data/redirects.ts';
import { OWN_HOSTS, PARTNER_HOSTS, externalRel, hostKey } from './src/lib/externalRel.ts';
import { stagingMayRender } from './src/lib/permissionRule.mjs';

/**
 * Environment-driven build (planning/08 §2).
 *   SITE_URL   deployment origin             (default https://ctjobready.github.io)
 *   BASE_PATH  path prefix                   (default /ctg; use "/" for root hosting)
 *   SITE_ENV   staging | production          (default staging → noindex on every page)
 */
const SITE_URL = (process.env.SITE_URL || 'https://ctjobready.github.io').replace(/\/+$/, '');
const rawBase = process.env.BASE_PATH ?? '/ctg';
const BASE_PATH = rawBase === '/' || rawBase === '' ? '/' : '/' + rawBase.replace(/^\/+|\/+$/g, '');
const SITE_ENV = process.env.SITE_ENV === 'production' ? 'production' : 'staging';
const BASE = BASE_PATH === '/' ? '' : BASE_PATH;

/**
 * Legacy-URL redirect stubs (planning/08 §7), generated from the migration manifest (src/data/redirects.ts).
 * Astro emits one meta-refresh page per entry; scripts/postbuild-redirects.mjs then rewrites each stub
 * (canonical, visible link; robots noindex on staging builds only, none on production). Internal destinations carry the
 * deployment base here (Astro does not add it).
 */
const redirects = Object.fromEntries(REDIRECTS.map((r) => [r.from, r.kind === 'external' ? r.to : BASE + r.to]));
const stubPaths = new Set(REDIRECTS.map((r) => r.from));

/*
 * Markdown plugins. Astro 7 renders Markdown with Sätteri by default, so these are Sätteri hast plugins (the
 * counterpart of rehype plugins; markdown.rehypePlugins would need the unified processor from a package this project
 * does not install). `satteri()` with no options is exactly Astro's default processor. Astro keeps rendered Markdown in
 * its content cache and fingerprints the config with JSON.stringify, which drops functions; each plugin therefore
 * carries the data it depends on in its name, so that changing a partner or a permissions row re-renders the posts.
 * After editing a plugin's own code, clear node_modules/.astro once.
 */
/** @param {unknown} parts */
const digest = (parts) => createHash('sha1').update(JSON.stringify(parts)).digest('hex').slice(0, 10);

/**
 * Markdown links that leave the site (news bodies, mostly press releases and partner pages) get the same rel as
 * components get from linkAttrs() in src/lib/url.ts: rel="noopener", plus "noreferrer" unless the host is a
 * CodersTrust site or a partner (src/lib/externalRel.ts, planning/08 §9). Same-tab navigation is the site
 * convention, so no target attribute is added; an existing rel keeps its tokens. Links to this site's own
 * hosts (production, staging) are internal and left alone.
 */
const SELF_HOSTS = new Set(['coderstrust.global', hostKey(SITE_URL)]);
/** @type {import('satteri').HastPluginDefinition} */
const externalLinks = {
  name: `ctg-external-links-${digest([OWN_HOSTS, PARTNER_HOSTS, [...SELF_HOSTS]])}`,
  element: {
    filter: ['a'],
    visit(node, ctx) {
      const href = node.properties?.href;
      if (typeof href !== 'string' || !/^https?:\/\//i.test(href) || SELF_HOSTS.has(hostKey(href))) return;
      // rel is a token list: a string or an array, depending on where it came from
      const have = String(node.properties?.rel ?? '').split(/[\s,]+/).filter(Boolean);
      ctx.setProperty(node, 'rel', [...new Set([...have, ...externalRel(href).split(' ')])].join(' '));
    },
  },
};

/**
 * D13 for the photographs inside news posts: every <img> in src/content/news/<slug>.md carries
 * data-asset="news-<slug>", the same asset as the post's cover (src/data/permissions.json, scripts/check-permissions.mjs),
 * so the permissions gate sees the whole post, not only its cover. On staging an asset that the D13 rule does not let
 * render (neither cleared, nor published on coderstrust.global and outside a sensitive group; src/lib/permissionRule.mjs)
 * is not rendered at all: its images, and the paragraphs that held nothing else, are dropped from the post body.
 */
/** @type {import('./src/lib/permissionRule.mjs').PermissionRow[]} */
const PERMISSIONS = JSON.parse(readFileSync(new URL('./src/data/permissions.json', import.meta.url), 'utf8'));
const HIDDEN_NEWS = new Set(SITE_ENV === 'production' ? [] : PERMISSIONS.filter((r) => r.assetId.startsWith('news-') && !stagingMayRender(r)).map((r) => r.assetId));
/** The asset ID of the post a Markdown document belongs to ("news-<slug>"), or undefined outside src/content/news. */
const newsAsset = (/** @type {import('satteri').HastVisitorContext} */ ctx) => {
  const slug = /\/src\/content\/news\/([^/]+)\.md$/.exec(ctx.fileURL?.pathname ?? '')?.[1];
  return slug ? `news-${slug}` : undefined;
};
const onlyImages = (/** @type {import('hast').Element} */ p) => p.children.every((c) => (c.type === 'element' && c.tagName === 'img') || (c.type === 'text' && !c.value.trim()));
/** @type {import('satteri').HastPluginDefinition} */
const newsPhotos = {
  name: `ctg-news-photos-${digest([...HIDDEN_NEWS].sort())}`,
  element: [
    {
      filter: ['img'],
      visit(node, ctx) {
        const id = newsAsset(ctx);
        if (!id) return;
        if (!HIDDEN_NEWS.has(id)) return void ctx.setProperty(node, 'data-asset', id);
        const parent = ctx.parent(node);
        // a paragraph made only of images is removed as a whole (visitor below)
        if (!(parent.type === 'element' && parent.tagName === 'p' && onlyImages(parent))) ctx.removeNode(node);
      },
    },
    {
      filter: ['p'],
      visit(node, ctx) {
        const id = newsAsset(ctx);
        if (id && HIDDEN_NEWS.has(id) && node.children.some((c) => c.type === 'element' && c.tagName === 'img') && onlyImages(node)) ctx.removeNode(node);
      },
    },
  ],
};

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  redirects,
  markdown: { processor: satteri({ hastPlugins: [externalLinks, newsPhotos] }) },
  integrations: [
    sitemap({
      // Utility pages (styleguide, 404, any noindex page) and redirect stubs never belong in the sitemap.
      filter: (page) => {
        const path = new URL(page).pathname.slice(BASE.length) || '/';
        return !/^\/(styleguide|404)\/?$/.test(path) && !stubPaths.has(path.endsWith('/') ? path : path + '/');
      },
    }),
  ],
  vite: {
    define: {
      __SITE_ENV__: JSON.stringify(SITE_ENV),
    },
  },
});
