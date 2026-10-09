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

## Pre-push publication audit

This repository is public: a push publishes every committed file and the full history. The audit in CI (`check:repo-publication`, part of `test:production-release`) runs *after* a push, so it can only detect a leak. A versioned `pre-push` hook runs the same audit **before** anything leaves your machine, against the private never-publish list. No imported content or asset is pushed to any public branch until it passes; CI repeats the audit to catch regressions and is not a publication approval.

**Install it once per clone** (the setting is shared by that clone's worktrees):

```bash
npm run hooks:install      # git config core.hooksPath .githooks
sh .githooks/pre-push      # optional: run the audit by hand, exactly as a push would
```

What it does, on every `git push`:

- Runs `NEVER_PUBLISH_STRICT=1 node scripts/check-repo-publication.mjs`: every committed file's path and text is tested against the private list, and sensitive-group assets without a cleared release are rejected. The output names entry ids, file paths and line numbers only, never the list's patterns.
- **Blocks the push on any finding.**
- Reads the list the way the audit does: `NEVER_PUBLISH_JSON` (the list as a JSON string), then `NEVER_PUBLISH_FILE` (a path), then `../ctg-planning/never-publish.json` (the private planning checkout next to this one; found from a git worktree too).
- **Fails closed** when the list is missing or unreadable: the push is blocked with a message that says how to make the list available. It never skips the scan.
- Audits the checked-out working tree, so it refuses to run when tracked files differ from `HEAD`, or when a ref being pushed is not the checked-out commit. Commit or discard first; push a different commit from a clean checkout of it. A push that only deletes remote refs publishes nothing and skips the audit.

**Bypass.** `git push --no-verify` skips the hook. It is for one case only: the private list is unavailable and the owner has decided the push must go ahead. A finding is never bypassed; fix it.

**Accidental push of material that should not be public** (a finding the hook did not stop, or a push made with `--no-verify`):

1. Stop pushing, and do not pull the material into other branches or forks.
2. Remove the content in a new commit and push that commit. Removing it from the tip does not erase it: it stays in history, in clones and forks, and possibly in caches.
3. Assess history remediation with the owner: whether the history must be rewritten, the branch or tag deleted, GitHub support asked to purge cached views and forks, and anything exposed (names, images, credentials) rotated or withdrawn. Do not rewrite shared history on your own.
4. Inform the owner at once, before the clean-up is finished, with what was pushed, where (branch, commit), when, and who may have seen it.

Content-editing and deployment runbooks are added as the build progresses.
