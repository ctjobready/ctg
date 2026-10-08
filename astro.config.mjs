// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { REDIRECTS } from './src/data/redirects.ts';

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
 * (canonical, visible link, no noindex). Internal destinations carry the deployment base here (Astro does not add it).
 */
const redirects = Object.fromEntries(REDIRECTS.map((r) => [r.from, r.kind === 'external' ? r.to : BASE + r.to]));
const stubPaths = new Set(REDIRECTS.map((r) => r.from));

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  redirects,
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
