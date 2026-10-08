#!/usr/bin/env node
/**
 * Builds migration/migration-manifest.csv (planning/02 §5a): one row per unique legacy URL, with
 *   legacy_url, content_id, class, disposition, destination, query_handling, publication_hold, test_status
 * then regenerates everything derived from it (src/data/redirects.ts, edge/bulk-redirects.csv,
 * edge/worker/id-map.json) via scripts/generate-from-manifest.mjs.
 *
 *   node scripts/build-manifest.mjs <wp-export-dir>
 *
 * The export directory is UNTRUSTED DATA: it is only read, never executed, and only URLs, IDs, slugs and
 * type names are taken from it (no page text is copied into the repository). Every value is validated
 * before it is written, and the script fails loudly on anything it cannot classify.
 *
 * Destinations are checked against the routes this site really serves (src/pages + content collections)
 * or against jobready.global (course map, planning/02 §7).
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, HOLD_TEXT, GONE, CLASSES, DISPOSITIONS, QUERY_HANDLING, TEST_STATUSES, EXTERNAL_HOSTS, parseCsv, writeManifest, contentEntries, siteRoutes, splitFragment, isExternalDest } from './manifest-lib.mjs';
import { generate } from './generate-from-manifest.mjs';

const exportDir = process.argv[2];
if (!exportDir) {
  console.error('usage: node scripts/build-manifest.mjs <wp-export-dir>');
  process.exit(2);
}
const readJson = (rel, optional = false) => {
  const f = path.join(exportDir, rel);
  if (!fs.existsSync(f)) {
    if (optional) return null;
    throw new Error(`missing export file: ${f}`);
  }
  return JSON.parse(fs.readFileSync(f, 'utf8'));
};

const HOST = 'https://coderstrust.global';
const JR = 'https://jobready.global';
const JR_COURSES = `${JR}/courses/`;
// Path characters allowed in a legacy URL (anything else is rejected, never escaped into the repo).
const SAFE_PATH = /^\/[A-Za-z0-9._~%!$&()*+,;=:@/-]*$/;
const SAFE_QUERY_URL = /^\/\?[a-z_]+=[A-Za-z0-9_-]*$/;

const fail = (msg) => {
  throw new Error(msg);
};

// ---------------------------------------------------------------------------------------------
// Context: what the new site really serves
// ---------------------------------------------------------------------------------------------
const routes = siteRoutes();
const content = contentEntries();
const pathOfLegacy = (u) => {
  if (!u) return undefined;
  const m = u.match(/^https:\/\/coderstrust\.global(\/[^?#]*)?$/);
  return m ? m[1] || '/' : undefined;
};
const byLegacy = (list) => new Map(list.filter((e) => e.legacyUrl).map((e) => [pathOfLegacy(e.legacyUrl), e]));
const newsByLegacy = byLegacy(content.news);
const teamByLegacy = byLegacy(content.team);
const mentorsByLegacy = byLegacy(content.mentors);
const storiesByLegacy = byLegacy(content.stories);
const teamIds = new Set(content.team.map((t) => t.id));

// ---------------------------------------------------------------------------------------------
// Course redirect map (planning/02 §7): only high-confidence product matches go to a product page
// ---------------------------------------------------------------------------------------------
const courseMap = new Map();
{
  const [head, ...rows] = parseCsv(fs.readFileSync(path.join(exportDir, 'course-redirect-map.csv'), 'utf8'));
  const col = (n) => head.indexOf(n);
  if (['old_url', 'new_url', 'confidence'].some((n) => col(n) === -1)) fail('course-redirect-map.csv: unexpected header');
  for (const r of rows) {
    if (r.length < 5) continue;
    const old = pathOfLegacy(r[col('old_url')]);
    const target = r[col('new_url')];
    const conf = r[col('confidence')];
    if (!old || !SAFE_PATH.test(old)) fail(`course map: bad old_url ${r[col('old_url')]}`);
    let u;
    try {
      u = new URL(target);
    } catch {
      fail(`course map: bad new_url ${target}`);
    }
    if (u.protocol !== 'https:' || !EXTERNAL_HOSTS.has(u.hostname) || u.search || u.hash) fail(`course map: unexpected destination ${target}`);
    // Product matches below `high` are not trusted (planning/02 §7): use the category/landing page the map already carries.
    const isProduct = /^\/course\/[^/]+\/$/.test(u.pathname);
    const dest = conf === 'high' || !isProduct ? u.href : JR_COURSES;
    courseMap.set(old, { dest, conf });
  }
}
const jrDest = (p) => courseMap.get(p)?.dest;

// ---------------------------------------------------------------------------------------------
// Explicit page table (planning/02 §1). Anything else must be a JobReady-scope page in the course map.
// ---------------------------------------------------------------------------------------------
const PAGES = {
  '/': ['KEEP', '/'],
  '/about/': ['KEEP', '/about/'],
  '/coderstrust-story/': ['MERGE', '/about/#story'],
  '/aziz-ahmad/': ['MOVE', '/about/team/aziz-ahmad/'],
  '/ferdinand-kjaerulff/': ['MOVE', '/about/team/ferdinand-kjaerulff/'],
  '/team/': ['MOVE', '/about/team/'],
  '/mentors/': ['MOVE', '/about/mentors/'],
  '/talentleap/': ['MOVE', '/our-model/talentleap/'],
  '/workforce-development/': ['MOVE', '/partner-with-us/development-partners/'],
  '/nationwide/': ['MOVE', '/programs/nationwide/'],
  '/superkids/': ['MOVE', '/programs/superkids/'],
  '/nu-postgraduate-diploma/': ['KEEP', '/nu-postgraduate-diploma/'],
  '/case-studies/': ['MOVE', '/impact/case-studies/'],
  '/case-studies/undp-yes-project/': ['MOVE', '/impact/case-studies/undp-yes-korail/'],
  '/case-studies/womens-skill-development-for-freelancing-marketplace-wsdfm-project/': ['MOVE', '/impact/case-studies/wsdfm-women-freelancers/'],
  '/case-studies/brac-strong-it-project/': ['WITHHELD', '/impact/case-studies/'],
  '/case-studies/kosovo-women-in-online-work-wow-pilot-2017/': ['MOVE', '/impact/case-studies/kosovo-women-in-online-work/'],
  '/case-studies/her-power-project/': ['MOVE', '/impact/case-studies/her-power/'],
  '/news/': ['KEEP', '/news/'],
  '/join-us/': ['MOVE', '/careers/'],
  '/contact/': ['KEEP', '/contact/'],
  '/privacy-policy/': ['KEEP', '/privacy-policy/'],
  // Commerce/help pages with no equivalent here: the JobReady home page (no help URL is invented).
  '/payment-methods/': ['JR', `${JR}/`],
  '/registration-form/': ['JR', `${JR}/`],
  // The map points these at jobready.global; planning/02 §1/§7 send them to this site instead.
  '/job-category/': ['DROP', '/careers/'],
  // Templates / placeholders (planning/02 §1).
  '/course-layout-template/': ['DROP', `${JR}/`],
  '/ngs-category-page-new-layout/': ['DROP', `${JR}/`],
};

// ---------------------------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------------------------
const rows = new Map(); // legacy_url -> row
const byContentId = new Map(); // WordPress ID -> row (underlying content only)
const notes = []; // judgment calls and coverage notes printed at the end

function add(r) {
  const row = { content_id: 'none', query_handling: 'none', publication_hold: 'none', ...r };
  if (!row.test_status) {
    row.test_status = row.disposition === 'KEEP' ? 'route' : ['system', 'query-string', 'media', 'attachment'].includes(row.class) ? 'edge' : 'stub+edge';
  }
  if (row.disposition === 'WITHHELD') row.publication_hold = HOLD_TEXT;
  // Validation: nothing malformed reaches the CSV, redirects.ts or the Worker map.
  if (!CLASSES.includes(row.class)) fail(`bad class: ${JSON.stringify(row)}`);
  if (!DISPOSITIONS.includes(row.disposition)) fail(`bad disposition: ${JSON.stringify(row)}`);
  if (!QUERY_HANDLING.includes(row.query_handling)) fail(`bad query_handling: ${JSON.stringify(row)}`);
  if (!TEST_STATUSES.includes(row.test_status)) fail(`bad test_status: ${JSON.stringify(row)}`);
  if (!(SAFE_PATH.test(row.legacy_url) || SAFE_QUERY_URL.test(row.legacy_url))) fail(`unsafe legacy_url: ${row.legacy_url}`);
  if (!/^(none|\d{1,10})$/.test(row.content_id)) fail(`bad content_id: ${JSON.stringify(row)}`);
  if (row.destination === GONE) {
    if (row.disposition !== 'SYSTEM') fail(`only SYSTEM rows may use ${GONE}: ${row.legacy_url}`);
  } else if (isExternalDest(row.destination)) {
    const u = new URL(row.destination);
    if (u.protocol !== 'https:' || !EXTERNAL_HOSTS.has(u.hostname)) fail(`external destination not allowed: ${row.destination}`);
  } else {
    const [p] = splitFragment(row.destination);
    if (!SAFE_PATH.test(row.destination.replace('#', '')) || !p.endsWith('/')) fail(`unsafe destination: ${row.destination}`);
    if (!routes.has(p)) fail(`destination is not a route of this site: ${row.destination} (from ${row.legacy_url})`);
  }
  if (rows.has(row.legacy_url)) {
    const old = rows.get(row.legacy_url);
    if (JSON.stringify(old) !== JSON.stringify(row)) fail(`conflicting rows for ${row.legacy_url}: ${JSON.stringify(old)} vs ${JSON.stringify(row)}`);
    return old;
  }
  rows.set(row.legacy_url, row);
  return row;
}

/** Destination a request for an already-classified path ends up at (KEEP rows are their own destination). */
const destOf = (r) => r.destination;

// ---- 1. Yoast sitemap URLs (inventory.json) --------------------------------------------------
const inventory = readJson('inventory.json');
const rawPages = readJson('raw/pages.json', true) ?? [];
const rawIds = new Map(rawPages.map((p) => [pathOfLegacy(p.link), p.id])); // cross-check of the REST IDs only

const CPT_TYPES = new Set(['endorsements', 'featured-media', 'students-success-sto', 'trainee-testimonials', 'team-member', 'mentor', 'jobs', 'project', 'test-case', 'c-test', 'ae_global_templates', 'header', 'footer']);
const TAXONOMY = {
  category: '/news/',
  post_tag: '/news/',
  author: '/about/team/',
  'job-category': '/careers/',
  'mentor-category': '/about/mentors/',
  'team-category': '/about/team/',
};
const ARCHIVE_DEST = { 'jobs-archive': '/careers/', 'mentor-archive': '/about/mentors/', 'test-case-archive': '/' };
const idTypes = { skip: new Set(['ae_global_templates', 'header', 'footer', 'test-case', 'c-test']) };

const counts = { sitemapUrls: 0 };
for (const rec of inventory) {
  let p = pathOfLegacy(rec.url);
  if (!p && rec.type === 'ae_global_templates') {
    // Elementor templates are only reachable as /?ae_global_templates=<slug>: a query-string URL, no path to stub.
    const m = rec.url.match(/^https:\/\/coderstrust\.global\/(\?ae_global_templates=[a-z0-9_-]+)$/);
    if (m) p = '/' + m[1];
  }
  if (!p) fail(`inventory URL outside coderstrust.global: ${rec.url}`);
  counts.sitemapUrls++;
  let id = Number.isInteger(rec.rest_id) ? rec.rest_id : null;
  if (rec.type === 'page' && rawIds.has(p) && id !== null && rawIds.get(p) !== id) fail(`REST id mismatch for ${p}: ${id} vs ${rawIds.get(p)}`);
  const content_id = id === null ? 'none' : String(id);
  let r;
  switch (rec.type) {
    case 'page': {
      const spec = PAGES[p];
      if (spec) r = { class: rec.scope === 'jobready' && !['/job-category/', '/course-layout-template/', '/ngs-category-page-new-layout/'].includes(p) ? 'course' : 'page', disposition: spec[0], destination: spec[1] };
      else if (rec.scope === 'jobready' && jrDest(p)) r = { class: 'course', disposition: 'JR', destination: jrDest(p) };
      else fail(`page without a disposition: ${p} (add it to PAGES in scripts/build-manifest.mjs)`);
      if (p === '/payment-methods/' || p === '/registration-form/') r.class = 'page';
      break;
    }
    case 'post': {
      const n = newsByLegacy.get(p);
      if (!n) fail(`post ${p} has no article in src/content/news (42/42 posts must be accounted for)`);
      r = { class: 'post', disposition: 'MOVE', destination: `/news/${n.id}/` };
      break;
    }
    case 'course':
      if (p === '/course/digital-marketing-pgd/') r = { class: 'course', disposition: 'MOVE', destination: '/nu-postgraduate-diploma/digital-marketing/' };
      else if (p === '/course/information-communication-technology/') r = { class: 'course', disposition: 'MOVE', destination: '/nu-postgraduate-diploma/ict/' };
      else if (jrDest(p)) r = { class: 'course', disposition: 'JR', destination: jrDest(p) };
      else fail(`course without a map row: ${p}`);
      break;
    case 'ngs-course':
      if (!jrDest(p)) fail(`ngs-course without a map row: ${p}`);
      r = { class: 'course', disposition: 'JR', destination: jrDest(p) };
      break;
    case 'course-archive':
      if (!jrDest(p)) fail(`course archive without a map row: ${p}`);
      r = { class: 'course', disposition: 'JR', destination: jrDest(p) };
      break;
    case 'course-category':
      if (p === '/course-category/nu-pgd-courses/') r = { class: 'archive', disposition: 'MOVE', destination: '/nu-postgraduate-diploma/' };
      else if (jrDest(p)) r = { class: 'archive', disposition: 'JR', destination: jrDest(p) };
      else fail(`course category without a map row: ${p}`);
      break;
    case 'team-member': {
      const slug = path.posix.basename(p);
      const t = teamByLegacy.get(p) ?? (teamIds.has(slug) ? { id: slug } : undefined);
      if (!t) fail(`team member ${p} has no profile in src/content/team`);
      r = { class: 'custom-post-type', disposition: 'MOVE', destination: `/about/team/${t.id}/` };
      break;
    }
    case 'mentor':
      if (!mentorsByLegacy.has(p)) notes.push(`mentor ${p} is not in src/content/mentors.json (folded into the mentors page regardless)`);
      r = { class: 'custom-post-type', disposition: 'MERGE', destination: '/about/mentors/' };
      break;
    case 'endorsements':
      r = { class: 'custom-post-type', disposition: 'MERGE', destination: '/about/recognition/#endorsements' };
      break;
    case 'featured-media':
      r = /lorem-ipsum/i.test(p)
        ? { class: 'custom-post-type', disposition: 'DROP', destination: '/about/recognition/' } // placeholder dropped (planning/02 §3)
        : { class: 'custom-post-type', disposition: 'MERGE', destination: '/about/recognition/#coverage' };
      break;
    case 'students-success-sto':
    case 'trainee-testimonials':
      if (!storiesByLegacy.has(p)) notes.push(`story ${p} has no entry of its own in src/content/stories (folded into the stories page regardless)`);
      r = { class: 'custom-post-type', disposition: 'MERGE', destination: '/impact/stories/' };
      break;
    case 'jobs':
      r = { class: 'custom-post-type', disposition: 'MERGE', destination: '/careers/' };
      break;
    case 'project':
      if (p !== '/project/yes-project/') fail(`unexpected project ${p}`);
      r = { class: 'custom-post-type', disposition: 'MOVE', destination: '/impact/case-studies/undp-yes-korail/' };
      break;
    case 'test-case':
    case 'c-test':
    case 'header':
    case 'footer':
      r = { class: 'custom-post-type', disposition: 'DROP', destination: '/' };
      break;
    case 'ae_global_templates':
      // Not a path: the query is ignored and Pages serves the home page (the Worker only inspects the WordPress parameters in planning/08 §7).
      r = { class: 'custom-post-type', disposition: 'DROP', destination: '/', query_handling: 'ignore parameters', test_status: 'edge' };
      break;
    default:
      if (TAXONOMY[rec.type]) r = { class: 'archive', disposition: 'DROP', destination: TAXONOMY[rec.type] };
      else if (ARCHIVE_DEST[rec.type]) r = { class: 'archive', disposition: 'DROP', destination: ARCHIVE_DEST[rec.type] };
      else fail(`unclassified inventory type "${rec.type}" for ${p}`);
  }
  const row = add({ legacy_url: p, content_id, ...r });
  if (id !== null) byContentId.set(id, { row, type: rec.type, path: p });
}

const rowFor = (p) => rows.get(p);
// ---- 2. URLs observed in the exported HTML but absent from the sitemaps ------------------------
{
  const htmlDir = path.join(exportDir, 'html');
  const known = new Set(inventory.map((r) => r.url));
  const observed = new Set();
  const attr = /(?:href|src|content)=["'](https?:\/\/(?:www\.)?coderstrust\.global[^"'#\s]*)["']/gi;
  if (fs.existsSync(htmlDir)) {
    for (const f of fs.readdirSync(htmlDir).filter((x) => x.endsWith('.html'))) {
      const t = fs.readFileSync(path.join(htmlDir, f), 'utf8');
      for (const m of t.matchAll(attr)) observed.add(m[1].replace('://www.', '://'));
    }
  }
  const SYSTEM_PATHS = /^\/(wp-json|xmlrpc\.php|wp-login\.php|wp-admin|wp-cron\.php)/;
  const extras = { dayArchive: new Set(), feeds: new Set(), pagination: new Set(), other: [] };
  for (const u of [...observed].sort()) {
    if (known.has(u) || /\/wp-(content|includes)\//.test(u)) continue;
    const m = u.match(/^https:\/\/coderstrust\.global(\/[^?#]*)?(\?.*)?$/);
    if (!m) continue;
    const p = m[1] || '/';
    const q = m[2] || '';
    if (SYSTEM_PATHS.test(p)) continue;
    if (p === '/' && !q) continue; // the bare home URL
    if (p === '/' && /^\?p=\d+$/.test(q)) continue; // shortlinks: covered by the ID rows
    if (q) {
      if (/^\?feed=[a-z0-9]+$/i.test(q)) continue; // covered by the ?feed= pattern row
      extras.other.push(u);
      continue;
    }
    if (/^\/\d{4}(\/\d{2}){0,2}\/?$/.test(p)) extras.dayArchive.add(p.replace(/\/?$/, '/'));
    else if (/\/feed\/$/.test(p)) extras.feeds.add(p);
    else if (/\/page\/\d+\/$/.test(p) || /^\/(join-us|courses\/all-courses)\/\d+\/$/.test(p)) extras.pagination.add(p);
    else extras.other.push(u);
  }

  // 2a. Date archives: every observed day, plus the months and years above them and every post's own date.
  const days = new Set(extras.dayArchive);
  for (const rec of inventory.filter((r) => r.type === 'post' && r.date)) {
    const m = rec.date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) days.add(`/${m[1]}/${m[2]}/${m[3]}/`);
  }
  const dateRows = new Set(days);
  for (const d of days) {
    const [y, mo] = d.split('/').filter(Boolean);
    dateRows.add(`/${y}/${mo}/`);
    dateRows.add(`/${y}/`);
  }
  for (const d of [...dateRows].sort()) add({ legacy_url: d, class: 'archive', disposition: 'DROP', destination: '/news/' });

  // 2b. Pagination (planning/02 class table): observed pages plus the page-N URLs of the two blog-style lists.
  for (let n = 2; n <= 5; n++) {
    extras.pagination.add(`/page/${n}/`);
    extras.pagination.add(`/news/page/${n}/`);
  }
  for (const p of [...extras.pagination].sort()) {
    const parent = p.replace(/(?:page\/)?\d+\/$/, '');
    const pr = parent === '/' ? undefined : rowFor(parent); // /page/N/ is the blog index: planning/02 sends it to /news/
    if (pr && pr.disposition === 'JR') add({ legacy_url: p, class: 'archive', disposition: 'JR', destination: pr.destination });
    else if (pr && pr.disposition !== 'KEEP' && pr.disposition !== 'WITHHELD') add({ legacy_url: p, class: 'archive', disposition: 'DROP', destination: destOf(pr) });
    else add({ legacy_url: p, class: 'archive', disposition: 'DROP', destination: pr && pr.disposition === 'KEEP' ? destOf(pr) : '/news/' });
  }

  // 2c. Feeds: the site and comments feeds, every observed feed, and a feed for every post (planning/02: per-post feeds go to the post).
  extras.feeds.add('/feed/');
  extras.feeds.add('/comments/feed/');
  for (const rec of inventory.filter((r) => r.type === 'post')) extras.feeds.add(pathOfLegacy(rec.url) + 'feed/');
  for (const p of [...extras.feeds].sort()) {
    if (p === '/feed/' || p === '/comments/feed/') {
      add({ legacy_url: p, class: 'archive', disposition: 'DROP', destination: '/news/' });
      continue;
    }
    const parent = p.replace(/feed\/$/, '');
    const pr = rowFor(parent);
    if (!pr) fail(`feed ${p} has no parent URL in the manifest`);
    const disposition = pr.class === 'post' ? 'MOVE' : pr.disposition === 'JR' ? 'JR' : 'DROP';
    add({ legacy_url: p, class: 'archive', disposition, destination: destOf(pr) });
  }

  // 2d. Anything else observed must be classified here by hand; unknown shapes are never guessed.
  for (const u of extras.other) {
    const p = u.replace(HOST, '');
    if (/^\/product\/[a-z0-9-]+\/$/.test(p)) add({ legacy_url: p, class: 'course', disposition: 'JR', destination: JR_COURSES });
    else if (/^\/course\/[a-z0-9-]+\/$/.test(p)) add({ legacy_url: p, class: 'course', disposition: 'JR', destination: JR_COURSES });
    else if (/^\/job-category\/[a-z0-9_-]+\/$/.test(p)) add({ legacy_url: p, class: 'archive', disposition: 'DROP', destination: '/careers/' });
    else if (/^\/[a-z0-9-]+\/$/.test(p) && !p.startsWith('/wp-')) {
      // A post linked from the legacy home page that is in neither sitemap nor the REST export (no article was migrated).
      add({ legacy_url: p, class: 'post', disposition: 'DROP', destination: '/news/' });
      notes.push(`${p} is linked from the legacy site but is in no sitemap or REST export: DROP -> /news/`);
    } else fail(`observed legacy URL not classified: ${u}`);
  }
}

// ---- 3. WordPress system paths (410 at the edge) ----------------------------------------------
for (const p of ['/wp-login.php', '/wp-admin/', '/wp-json/', '/xmlrpc.php', '/wp-cron.php']) {
  add({ legacy_url: p, class: 'system', disposition: 'SYSTEM', destination: GONE, test_status: 'edge' });
}

// ---- 4. Query-string URLs (edge Worker; static hosting cannot read query strings) -----------------
for (const [id, { row, type }] of [...byContentId].sort((a, b) => a[0] - b[0])) {
  if (idTypes.skip.has(type)) continue; // templates and test items: an unknown ID already goes home
  const legacy_url = type === 'page' ? `/?page_id=${id}` : `/?p=${id}`;
  const disposition = row.disposition === 'KEEP' ? 'MOVE' : row.disposition;
  add({ legacy_url, content_id: String(id), class: 'query-string', disposition, destination: destOf(row), query_handling: 'ID map' });
}
const PATTERNS = [
  ['/?p=', 'DROP', '/', 'ID map'],
  ['/?page_id=', 'DROP', '/', 'ID map'],
  ['/?attachment_id=', 'DROP', '/', 'ID map'],
  ['/?s=', 'DROP', '/news/', 'ignore parameters'],
  ['/?cat=', 'DROP', '/news/', 'ignore parameters'],
  ['/?tag=', 'DROP', '/news/', 'ignore parameters'],
  ['/?author=', 'DROP', '/about/team/', 'ignore parameters'],
  ['/?feed=', 'DROP', '/news/', 'ignore parameters'],
  ['/?post_type=', 'DROP', '/', 'ignore parameters'],
  ['/?post_type=course', 'JR', JR_COURSES, 'ignore parameters'],
  ['/?post_type=ngs-course', 'JR', JR_COURSES, 'ignore parameters'],
];
for (const [legacy_url, disposition, destination, query_handling] of PATTERNS) {
  add({ legacy_url, class: 'query-string', disposition, destination, query_handling });
}

// ---- 5. Legacy media (planning/02 §5b) and attachment IDs -----------------------------------------
{
  const inv = readJson('media-inventory.json');
  const dl = readJson('media-downloaded.json');
  const attachments = inv.items;
  const attachByUrl = new Map();
  for (const a of attachments) {
    for (const u of [a.source_url, ...Object.values(a.sizes ?? {})]) if (typeof u === 'string') attachByUrl.set(u, a.id);
  }
  const attachId = (u) => attachByUrl.get(u) ?? attachByUrl.get(u.replace(/-\d+x\d+(\.[A-Za-z0-9]+)$/, '$1'));
  const users = new Map(); // media URL -> set of referencing pages
  const useAdd = (u, by) => {
    if (!users.has(u)) users.set(u, new Set());
    for (const b of by) users.get(u).add(b);
  };
  for (const f of dl.files) {
    useAdd(f.referenced_url, f.referenced_by);
    if (f.downloaded_url) useAdd(f.downloaded_url, f.referenced_by);
  }
  const mediaPath = (u) => {
    const m = u.match(/^https:\/\/coderstrust\.global(\/wp-content\/uploads\/[^?#\s]+)$/);
    if (!m) fail(`media URL outside /wp-content/uploads/: ${u}`);
    return m[1];
  };
  const pickDestination = (by) => {
    const cands = [...by].filter((b) => b.startsWith(HOST)).map((b) => rowFor(pathOfLegacy(b))).filter(Boolean);
    const internal = cands.find((c) => c.disposition !== 'WITHHELD' && !isExternalDest(c.destination) && destOf(c) !== '/');
    if (internal) return { disposition: 'MERGE', destination: destOf(internal) };
    const home = cands.find((c) => c.disposition !== 'WITHHELD' && destOf(c) === '/');
    if (home) return { disposition: 'MERGE', destination: '/' };
    const ext = cands.find((c) => c.disposition !== 'WITHHELD' && isExternalDest(c.destination));
    if (ext) return { disposition: 'JR', destination: ext.destination };
    if (cands.some((c) => c.disposition === 'WITHHELD')) return { disposition: 'WITHHELD', destination: destOf(cands.find((c) => c.disposition === 'WITHHELD')) };
    return { disposition: 'DROP', destination: '/' }; // header/footer/logo images and anything no public page uses
  };
  const mediaRowsById = new Map();
  for (const u of [...users.keys()].sort()) {
    const pick = pickDestination(users.get(u));
    const id = attachId(u);
    const r = add({ legacy_url: mediaPath(u), content_id: id ? String(id) : 'none', class: 'media', ...pick });
    if (id && !mediaRowsById.has(id)) mediaRowsById.set(id, r);
  }
  // Documents (PDF and similar) are never re-hosted: retired to the landing page of the page they belonged to.
  for (const a of attachments) {
    if (/^image\//.test(a.mime_type)) continue;
    const parent = byContentId.get(a.post_parent_id);
    // No parent in the export: choose the landing page by file name (the NU PGD circular belongs to the NU PGD page), else home.
    const landing = [[/nu-?pgd/i, '/nu-postgraduate-diploma/']].find(([re]) => re.test(a.source_url))?.[1] ?? '/';
    const dest = parent ? destOf(parent.row) : landing;
    const r = add({ legacy_url: mediaPath(a.source_url), content_id: String(a.id), class: 'media', disposition: 'DROP', destination: isExternalDest(dest) ? '/' : dest });
    mediaRowsById.set(a.id, r);
  }
  // ?attachment_id=<id> for every attachment that appears in a media row and has a known parent page or post.
  let attachmentRows = 0;
  for (const a of [...attachments].sort((x, y) => x.id - y.id)) {
    if (!mediaRowsById.has(a.id)) continue;
    const parent = byContentId.get(a.post_parent_id);
    if (!parent) continue;
    const pd = parent.row.disposition;
    const disposition = pd === 'JR' || pd === 'WITHHELD' || pd === 'DROP' ? pd : 'MERGE';
    add({ legacy_url: `/?attachment_id=${a.id}`, content_id: String(a.id), class: 'attachment', disposition, destination: destOf(parent.row), query_handling: 'ID map' });
    attachmentRows++;
  }
  notes.push(`media: ${mediaRowsById.size} attachments and ${users.size} image URLs referenced by migrated content; ${attachments.length - [...mediaRowsById.keys()].length} further library attachments are not referenced by any exported page and have no row (they 404 after cutover).`);
  notes.push(`attachment-ID rows: ${attachmentRows}`);
}

// ---- 6. Write ------------------------------------------------------------------------------
const order = Object.fromEntries(CLASSES.map((c, i) => [c, i]));
const all = [...rows.values()].sort((a, b) => order[a.class] - order[b.class] || (a.legacy_url < b.legacy_url ? -1 : a.legacy_url > b.legacy_url ? 1 : 0));
writeManifest(all);

const posts = all.filter((r) => r.class === 'post' && r.destination.startsWith('/news/') && r.legacy_url.split('/').filter(Boolean).length === 1 && r.disposition === 'MOVE').length;
console.log(`manifest rows: ${all.length} (sitemap URLs read: ${counts.sitemapUrls}; posts mapped to /news/<slug>/: ${posts})`);
for (const n of notes) console.log(`note: ${n}`);
if (posts !== 42) fail(`expected 42 posts mapped to /news/<slug>/, found ${posts}`);

generate();
console.log('derived: src/data/redirects.ts, edge/bulk-redirects.csv, edge/worker/id-map.json regenerated');
console.log('next: node scripts/manifest-report.mjs');
