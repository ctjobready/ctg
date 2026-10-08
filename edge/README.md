# Edge artifacts for the production cutover

GitHub Pages cannot send real redirects or read query strings, so at cutover Cloudflare sits in front of Pages and applies
two things from this folder:

| File | What it is | Cloudflare feature |
|---|---|---|
| `bulk-redirects.csv` | every path-based legacy URL (pages, posts, archives, feeds, course URLs and legacy upload routes) mapped to its new address, as a true 301 | Bulk Redirects (a list plus a Bulk Redirect rule) |
| `worker/` | the query-aware Worker: WordPress `?p=` style URLs on any path, and 410 Gone for WordPress system paths | Workers |

Both are generated from the migration manifest (`migration/migration-manifest.csv`). Do not edit them by hand.

```
node scripts/generate-from-manifest.mjs           # regenerate src/data/redirects.ts, edge/bulk-redirects.csv, edge/worker/id-map.json
node scripts/generate-from-manifest.mjs --check   # CI: fail if a committed file differs from the manifest
node --test edge/worker/test/                     # Worker tests (no network, no dependencies)
```

The same manifest drives the static redirect pages that Pages itself serves (`src/data/redirects.ts`), so a visitor still
lands in the right place if the edge rules are ever switched off, only through a meta refresh instead of a 301.

## 1. Load the Bulk Redirects list

1. In the Cloudflare dashboard open **Bulk Redirects** for the account, create a list (for example `coderstrust-legacy`), and
   upload `edge/bulk-redirects.csv`.
2. Create a **Bulk Redirect rule** that uses the list, and enable it.

About the file:

- No header row, seven columns: source URL (host and path, no scheme), target URL, status code (`301`), preserve query string
  (`FALSE`), include subdomains (`TRUE`, so `www.` is covered), subpath matching (`FALSE`), preserve path suffix (`FALSE`).
  The legacy query string is never carried to the destination.
- Source URLs are the exact legacy paths WordPress served, with the trailing slash.
- Page, post, archive, feed and course rules come first. The legacy upload rules (`/wp-content/uploads/...`) come last,
  so a plan with a small list limit can load the head of the file; check your plan's limit for list items before loading.
- Course and catalogue URLs go to their JobReady equivalents (`jobready.global`); everything else goes to
  `https://coderstrust.global/...`.
- Withheld items still redirect, to a useful parent page, and nothing links to them.
- The traffic for the hostname must be proxied by Cloudflare (orange cloud) for these rules to apply.
- `include subdomains` also matches the rollback hostname (`legacy.coderstrust.global`). Restrict the Bulk Redirect rule so that
  it does not apply to that host, otherwise the read-only WordPress copy would be redirected too.
- A request without the trailing slash is not an exact match; GitHub Pages first answers it with a redirect to the slashed
  URL and the rule then applies, so such a request takes two hops. The WordPress site only ever linked the slashed form.

## 2. Deploy the Worker

The Worker needs no secrets and no bindings. The owner signs in to Cloudflare; nothing about the account is stored here.

```
cd edge/worker
npx wrangler login          # interactive, done by the owner
npx wrangler deploy         # or paste src/index.mjs and id-map.json into the dashboard editor
```

Then add routes for `coderstrust.global/*` and `www.coderstrust.global/*` only. Do **not** route `legacy.coderstrust.global`
(the Worker also ignores that host as a second safeguard).

What it does (the full rules are in the header of `src/index.mjs`; the tests in `test/worker.test.mjs` pin every case):

- **410 Gone** for `/wp-login.php`, `/wp-admin/*`, `/wp-json/*`, `/xmlrpc.php` and `/wp-cron.php`, for any method and query.
  These are scanner paths with no value; they are never redirected to content.
- **Query-string URLs on any path** carrying `p`, `page_id`, `attachment_id`, `post_type`, `author`, `cat`, `tag`, `s` or `feed`:
  - a known ID gets one 301 to its destination with no query string; an unknown, empty or non-numeric ID goes to the home page;
  - `?attachment_id=` goes to the attachment's parent page or post, `?cat=`, `?tag=`, `?s=` and `?feed=` to `/news/`,
    `?author=` to `/about/team/`, a known course `post_type` to `https://jobready.global/courses/`;
  - values are decoded once and must be digits (IDs); the first of a duplicated parameter wins; tracking parameters
    (`utm_*`, `fbclid`, `gclid`, ...) are ignored and never forwarded; the search term is never forwarded.
- Every other request, including every other query string, goes through to Pages untouched.

Order of execution: Cloudflare runs redirect rules (including Bulk Redirects) before Workers, so a legacy path in the list
is redirected by the list and its query string is dropped; the Worker handles everything the list does not match. Either way
a visitor takes one hop.

## 3. Test before and after switching on

Follow the cutover runbook: load the list and the Worker on a **staging hostname behind Cloudflare** first, and run the test
list there; enable them for the production hostname only afterwards. For a staging hostname set the Worker variable
`TARGET_ORIGIN` to the origin the redirects should point at (for example `https://coderstrust.global`); without it the
Worker redirects to the origin the request came in on.

Smoke test (replace the host as needed; every redirect must be one 301 with no `?` in `Location`):

```
curl -sI 'https://coderstrust.global/team/'                      # 301 -> /about/team/
curl -sI 'https://coderstrust.global/?p=7670&utm_source=x'       # 301 -> /about/   (known page ID)
curl -sI 'https://coderstrust.global/?p=12abc'                   # 301 -> /          (not an ID)
curl -sI 'https://coderstrust.global/?s=anything'                # 301 -> /news/
curl -sI 'https://coderstrust.global/news/?cat=3'                # 301 -> /news/
curl -sI 'https://coderstrust.global/?post_type=course'          # 301 -> https://jobready.global/courses/
curl -sI 'https://coderstrust.global/wp-login.php'               # 410
curl -sI 'https://coderstrust.global/wp-json/wp/v2/posts'        # 410
curl -sI 'https://coderstrust.global/about/?utm_source=x'        # 200, untouched
```

## 4. Rollback

Disable the Bulk Redirect rule and remove the Worker routes (the runbook's rollback step). The static redirect pages on
Pages keep the old URLs working through meta refresh while the edge rules are off.

## Regenerating after a content change

The manifest builder (`node scripts/build-manifest.mjs <wp-export-dir>`) reads the WordPress export, which is kept privately,
and the site's own content collections. After it runs, commit the manifest, `src/data/redirects.ts`, `bulk-redirects.csv` and
`worker/id-map.json` together; `node scripts/test-redirects.mjs` and `node scripts/test-manifest.mjs` fail if any of them
disagree with each other or with the built site.
