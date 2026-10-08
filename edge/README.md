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
npm run test:edge-release                         # Worker tests + the staged-hostname checklist (network only if EDGE_HOST is set)
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
- `include subdomains` also matches the rollback hostname (`legacy.coderstrust.global`). The rule expression below excludes that
  host, otherwise the read-only WordPress copy would be redirected too.
- A request without the trailing slash is not an exact match; GitHub Pages first answers it with a redirect to the slashed
  URL and the rule then applies, so such a request takes two hops. The WordPress site only ever linked the slashed form.

### Rule expression: let WordPress-parameter requests reach the Worker

A Bulk Redirect rule matches the URL **path only**: the query string is ignored. Left alone, `/team/?p=7670` matches the list
item `/team/` and is redirected to `/about/team/`, so the Worker never sees the `?p=` and the post at ID 7670 is lost.
Cloudflare runs redirect rules (Bulk Redirects included) **before** Workers, so the exclusion has to be written into the rule.
In the Bulk Redirect rule, choose **Edit expression** and use (replace `coderstrust_legacy` with the name of your list):

```
(http.request.full_uri in $coderstrust_legacy)
and http.host ne "legacy.coderstrust.global"
and not any(http.request.uri.args.names[*] in {"p" "page_id" "attachment_id" "post_type" "cat" "tag" "author" "feed" "s"})
and not http.request.uri.path in {"/wp-login.php" "/xmlrpc.php" "/wp-cron.php"}
and not starts_with(http.request.uri.path, "/wp-admin")
and not starts_with(http.request.uri.path, "/wp-json")
```

- The first line is the list match the dashboard writes for you; keep whatever it generated and add the other lines with `and`.
- The `any(...)` line is the exclusion: a request that carries **any** of the nine WordPress parameters (the same nine as
  `PARAM_ORDER` in `worker/src/index.mjs`) skips the list and falls through to the Worker, on every path. Tracking parameters
  (`utm_*`, `fbclid`, `gclid`, ...) are not in the set, so `/team/?utm_source=x` is still a plain 301 from the list.
- The last three lines send the WordPress system paths to the Worker, which answers **410 Gone** (the list holds no row for them;
  this keeps it that way if one is ever added). The Worker matches the same paths case-insensitively and after one percent-decode.
- Parameter names are case-sensitive on both sides (`?P=1` is not `?p=1`), and the Worker decodes a name once (`?%70=7670` is `p`).
  The rules engine's `http.request.uri.args.names` has to give the same answer; check it on the staging hostname with
  `/team/?%70=<known id>`. If it matches the raw name only, add `and not http.request.uri.query contains "%"` to the expression
  (a request with an encoded query then goes to the Worker, which passes the non-WordPress ones through to Pages and its stub).
- If the dashboard does not accept the combined expression on your plan, do not enable the rule: a rule without the exclusion
  is worse than no rule, because it swallows `?p=` requests on every legacy path.
- Check the result with the collision requests in section 3. The same collisions are pinned offline in
  `worker/test/worker.test.mjs` ("collisions" tests, run against every legacy path in the manifest).

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
- **Query-string URLs on any path** carrying `p`, `page_id`, `attachment_id`, `post_type`, `cat`, `tag`, `author`, `feed` or `s`:
  - a known ID gets one 301 to its destination with no query string; an unknown, empty or non-numeric ID goes to the home page;
  - `?attachment_id=` goes to the attachment's parent page or post, `?cat=`, `?tag=`, `?feed=` and `?s=` to `/news/`,
    `?author=` to `/about/team/`, a known course `post_type` to `https://jobready.global/courses/`;
  - values are decoded once and must be digits (IDs); the first of a duplicated parameter wins; tracking parameters
    (`utm_*`, `fbclid`, `gclid`, ...) are ignored and never forwarded; the search term is never forwarded.
- **Precedence when several of these parameters are present:** the first one recognized in the order
  `p`, `page_id`, `attachment_id`, `post_type`, `cat`, `tag`, `author`, `feed`, `s` decides, whatever order they have in the URL.
  So `/?s=term&p=7670` is the post, `/?author=2&cat=3` is `/news/`, `/?feed=rss2&author=2` is `/about/team/`. The order is
  `PARAM_ORDER` in `src/index.mjs`; a test pins every pair, and the Bulk Redirect rule expression above lists the same nine names.
- Every other request, including every other query string, goes through to Pages untouched.

Order of execution: Cloudflare runs redirect rules (including Bulk Redirects) before Workers. The rule expression above keeps
every request that carries a WordPress parameter (or a WordPress system path) away from the list, so the Worker decides it; a
legacy path without such a parameter, with or without tracking parameters, is redirected by the list and its query string is
dropped. Either way a visitor takes one hop.

## 3. Test before and after switching on

Follow the cutover runbook: load the list and the Worker on a **staging hostname behind Cloudflare** first, and run the test
list there; enable them for the production hostname only afterwards. For a staging hostname set the Worker variable
`TARGET_ORIGIN` to the origin the redirects should point at (for example `https://coderstrust.global`); without it the
Worker redirects to the origin the request came in on.

Smoke test (replace the host as needed; every redirect must be one 301 with no `?` in `Location`):

```
curl -sI 'https://coderstrust.global/team/'                      # 301 -> /about/team/        (Bulk Redirects list)
curl -sI 'https://coderstrust.global/team/?utm_source=x'         # 301 -> /about/team/        (tracking only: still the list)
curl -sI 'https://coderstrust.global/team/?p=7670'               # 301 -> /about/             (COLLISION: the Worker, not the list)
curl -sI 'https://coderstrust.global/team/?%70=7670'             # 301 -> /about/             (encoded name: same answer)
curl -sI 'https://coderstrust.global/category/latest-news/?cat=3'# 301 -> /news/
curl -sI 'https://coderstrust.global/feed/?p=7670'               # 301 -> /about/             (an ID beats the path's own target)
curl -sI 'https://coderstrust.global/?p=7670&utm_source=x'       # 301 -> /about/   (known page ID)
curl -sI 'https://coderstrust.global/?p=12abc'                   # 301 -> /          (not an ID)
curl -sI 'https://coderstrust.global/?author=2&cat=3'            # 301 -> /news/     (cat precedes author)
curl -sI 'https://coderstrust.global/?s=anything'                # 301 -> /news/
curl -sI 'https://coderstrust.global/news/?cat=3'                # 301 -> /news/
curl -sI 'https://coderstrust.global/?feed=rss2'                 # 301 -> /news/
curl -sI 'https://coderstrust.global/?post_type=course'          # 301 -> https://jobready.global/courses/
curl -sI 'https://coderstrust.global/wp-login.php'               # 410
curl -sI 'https://coderstrust.global/wp-json/wp/v2/posts'        # 410
curl -sI 'https://coderstrust.global/about/?utm_source=x'        # 200, untouched
```

`npm run test:edge-release` runs the Worker tests offline (no network) and prints this checklist. With `EDGE_HOST` set (for
example `EDGE_HOST=https://staging.example.net`) it also sends these requests to that staging hostname and compares each answer;
without `EDGE_HOST` it never touches the network.

## 4. Certificates and SSL mode

Do these in this order. The GitHub Pages origin certificate comes first and is validated before Cloudflare is put in front of
it; skipping the order is how a site ends up behind a proxy that cannot reach a valid origin.

1. **Provision and validate the GitHub Pages origin certificate first.** Set the custom domain in the repository's Pages
   settings, point DNS at GitHub Pages **without** the proxy (DNS only, grey cloud), and wait until the Pages API reports
   `https_certificate` with state `approved` and HTTPS works on the origin. Allow **up to 24 hours**. If `https_certificate`
   is absent, remove the custom domain and re-add it straight away, then wait for state `new` and then `approved`.
2. **Switch Cloudflare to SSL mode Full (strict) only after the origin certificate is validated** (step 1 is `approved` and
   `https://<domain>/` answers on the origin with a valid certificate). Full (strict) checks the origin certificate; setting it
   before the origin has one gives 52x errors.
3. **A temporary proxy fallback uses Full, not Full (strict).** If the Pages certificate is stuck in `new` and the site must be
   reachable meanwhile, proxy the record (orange cloud) with SSL mode **Full** (not strict) and let Cloudflare's edge
   certificate serve visitors. Treat this as temporary: keep polling the Pages certificate, and when it is `approved` raise the
   SSL mode to Full (strict). Never use Flexible, which sends visitors' traffic to the origin in clear text.
4. Validate the rollback hostname (`legacy.coderstrust.global`) before the switch, so that rollback does not depend on a
   certificate that has not been issued yet.

Enforce HTTPS in the Pages settings once the origin certificate is approved. No API token, zone ID or account ID belongs in this
repository; the owner signs in to Cloudflare and GitHub for these steps.

## 5. Rollback

Disable the Bulk Redirect rule and remove the Worker routes (the runbook's rollback step). The static redirect pages on
Pages keep the old URLs working through meta refresh while the edge rules are off.

## Regenerating after a content change

The manifest builder (`node scripts/build-manifest.mjs <wp-export-dir>`) reads the WordPress export, which is kept privately,
and the site's own content collections. After it runs, commit the manifest, `src/data/redirects.ts`, `bulk-redirects.csv` and
`worker/id-map.json` together; `node scripts/test-redirects.mjs` and `node scripts/test-manifest.mjs` fail if any of them
disagree with each other or with the built site.
