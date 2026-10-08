# coderstrust.global — CodersTrust Global website

Static site for **CodersTrust**, built with [Astro](https://astro.build) on the *JobReady Global* design system and deployed to GitHub Pages.

- Staging: https://ctjobready.github.io/ctg/ (noindex)
- Production (after cutover): https://coderstrust.global/
- Planning package: [`planning/`](planning/00-README.md)

## Development

Requires Node 22 (`.nvmrc`).

```bash
npm ci            # install
npm run dev       # dev server (regenerates design tokens first) → http://localhost:4321/ctg/
npm run build     # static build into dist/ (staging settings by default)
npm run preview   # serve dist/ locally
npm run check     # astro check — TypeScript + template diagnostics (must be 0/0/0)
npm run check:base  # after a build: every internal URL in dist/ must carry the base path
npm run a11y      # axe + console + reduced-motion + no-JS smoke (needs `npm run preview` running)
npm run tokens    # design-system/tokens.json → src/styles/tokens.css (runs automatically before dev/build)
```

**Environment variables** (read by `astro.config.mjs`):

| Variable | Default | Meaning |
|---|---|---|
| `SITE_URL` | `https://ctjobready.github.io` | deployment origin |
| `BASE_PATH` | `/ctg` | path prefix (`/` for root hosting, e.g. `BASE_PATH=/ npm run dev`) |
| `SITE_ENV` | `staging` | `staging` adds `noindex, nofollow` to every page; `production` indexes (canonical URLs always point at `https://coderstrust.global`) |

**Base-path rule:** never hard-code `/ctg/`. Every internal `href`/`src` goes through `url()` from `src/lib/url.ts` (components such as `Button`, `Logo` and the nav already do), so the same source builds for staging (`/ctg/`) and production (`/`).

**Where things live:** design tokens → `design-system/tokens.json` (source of truth; `src/styles/tokens.css` is generated, do not edit) · components → `src/components/{system,ui,seo}` · page chrome → `src/layouts` · navigation and CTA library → `src/data/nav.ts`, `src/data/ctas.ts` · JSON-LD builders → `src/lib/schema.ts` · component gallery → `/styleguide/` (noindex).

Content-editing and deployment runbooks are added as the build progresses.
