// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

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

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      // Utility / redirect pages never belong in the sitemap.
      filter: (page) => !/\/(styleguide|404)\/?$/.test(page),
    }),
  ],
  vite: {
    define: {
      __SITE_ENV__: JSON.stringify(SITE_ENV),
    },
  },
});
