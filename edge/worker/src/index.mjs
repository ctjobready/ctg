/**
 * Query-aware Cloudflare Worker for the CodersTrust cutover (planning/08 §7, planning/02 §5).
 *
 * Cloudflare Bulk Redirects match a URL path, never a query string, so the WordPress query parameters are
 * handled here. This Worker also answers 410 Gone for the WordPress system paths. Everything else passes
 * through to the origin (GitHub Pages) untouched.
 *
 * Rules
 *  - 410 Gone: /wp-login.php, /wp-admin/*, /wp-json/*, /xmlrpc.php, /wp-cron.php (any method, any query).
 *  - GET/HEAD requests whose query string carries a WordPress parameter, on ANY path:
 *      p, page_id        known ID -> one 301 to the mapped destination (no query string); unknown or non-numeric -> home
 *      attachment_id     known attachment -> its parent page or post; unknown -> home
 *      post_type         with a known `name` slug -> its destination; a known course post type -> the JobReady courses
 *                        page; anything else -> home (an accompanying p/page_id decides first)
 *      author            -> /about/team/
 *      cat, tag, s, feed -> /news/ (the search term is never forwarded)
 *    Parameters are looked up in that order; the first one present decides. Tracking parameters (utm_*, fbclid,
 *    gclid, ...) and every other parameter are ignored for matching and never reach the destination.
 *  - Values are percent-decoded exactly once, then validated (IDs must be 1-12 ASCII digits). Duplicate
 *    parameters: the first one wins. A malformed encoding is simply "not an ID" and falls through to home.
 *  - Every other request, including every other query string, is passed through unchanged.
 *
 * The ID map (../id-map.json) is generated from migration/migration-manifest.csv by
 * scripts/generate-from-manifest.mjs. Do not edit it by hand.
 */
import ID_MAP from '../id-map.json' with { type: 'json' };

export const CANONICAL_ORIGIN = 'https://coderstrust.global';
/** Hosts that always redirect to the canonical origin (the apex), whatever host the request used. */
const CANONICAL_HOSTS = new Set(['coderstrust.global', 'www.coderstrust.global']);
/** The rollback host serves the old WordPress site; this Worker must never touch it. */
const PASSTHROUGH_HOSTS = new Set(['legacy.coderstrust.global']);
/** Hosts a map entry may send visitors to besides this site. */
const EXTERNAL_HOSTS = new Set(['jobready.global']);

const HOME = '/';
const NEWS = '/news/';
const TEAM = '/about/team/';
const COURSES = 'https://jobready.global/courses/';
const COURSE_POST_TYPES = new Set(['course', 'ngs-course', 'product']);
const ID_PARAMS = ['p', 'page_id'];
const NEWS_PARAMS = ['cat', 'tag', 's', 'feed'];

const RE_ID = /^[0-9]{1,12}$/;
const RE_TYPE = /^[A-Za-z0-9_-]{1,40}$/;
const RE_SLUG = /^[A-Za-z0-9_-]{1,200}$/;

const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** Is the path a WordPress system path? Matching ignores case, repeated slashes, one level of percent-encoding and a trailing slash. */
export function isSystemPath(pathname) {
  let p = pathname;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    /* keep the raw path */
  }
  p = p.toLowerCase().replace(/\/{2,}/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return (
    p === '/wp-login.php' ||
    p === '/xmlrpc.php' ||
    p === '/wp-cron.php' ||
    p === '/wp-admin' ||
    p.startsWith('/wp-admin/') ||
    p === '/wp-json' ||
    p.startsWith('/wp-json/')
  );
}

/** Look an ID up (digits only, one decode already done by URLSearchParams). */
function lookupId(raw, ...maps) {
  if (raw === null || !RE_ID.test(raw)) return undefined;
  const key = String(Number(raw));
  for (const m of maps) if (own(m, key)) return m[key];
  return undefined;
}

/**
 * Where should a request go? Returns a destination (base-less path or absolute https URL) or null when the
 * query string carries no WordPress parameter (pass through).
 */
export function destinationFor(searchParams) {
  for (const name of ID_PARAMS) {
    if (searchParams.has(name)) return lookupId(searchParams.get(name), ID_MAP.ids, ID_MAP.attachments) ?? HOME;
  }
  if (searchParams.has('attachment_id')) return lookupId(searchParams.get('attachment_id'), ID_MAP.attachments) ?? HOME;
  if (searchParams.has('post_type')) {
    const type = searchParams.get('post_type');
    if (RE_TYPE.test(type)) {
      const name = searchParams.get('name');
      if (name !== null && RE_SLUG.test(name) && own(ID_MAP.slugs, `${type}/${name}`)) return ID_MAP.slugs[`${type}/${name}`];
      if (COURSE_POST_TYPES.has(type)) return COURSES;
    }
    return HOME;
  }
  if (searchParams.has('author')) return TEAM;
  for (const name of NEWS_PARAMS) if (searchParams.has(name)) return NEWS;
  return null;
}

/**
 * Absolute Location for a map destination. Only a site path or an absolute https URL on an allowed host is
 * accepted; anything else (a corrupted map, protocol-relative or backslash tricks) falls back to home.
 */
export function resolveLocation(dest, origin) {
  const home = origin + HOME;
  if (typeof dest !== 'string' || dest === '' || /[\u0000-\u001f\u007f\\\s]/.test(dest)) return home;
  if (dest.startsWith('/') && !dest.startsWith('//')) return origin + dest;
  if (dest.startsWith('https://')) {
    try {
      const u = new URL(dest);
      if (EXTERNAL_HOSTS.has(u.hostname) && !u.username && !u.password && !u.port) return u.href;
    } catch {
      /* fall through */
    }
  }
  return home;
}

const redirect = (location) => new Response(null, { status: 301, headers: { location, 'cache-control': 'public, max-age=86400' } });
const gone = () => new Response('410 Gone\n', { status: 410, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });

/**
 * Pure request handler: returns a Response, or null to pass the request through to the origin.
 * `env.TARGET_ORIGIN` (optional) forces the origin of redirect targets, for a staging hostname behind Cloudflare.
 */
export function handle(request, env = {}) {
  const url = new URL(request.url);
  if (PASSTHROUGH_HOSTS.has(url.hostname)) return null;
  if (isSystemPath(url.pathname)) return gone();
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (url.search === '') return null;
  const dest = destinationFor(url.searchParams);
  if (dest === null) return null;
  const origin = env.TARGET_ORIGIN ?? (CANONICAL_HOSTS.has(url.hostname) ? CANONICAL_ORIGIN : url.origin);
  return redirect(resolveLocation(dest, origin));
}

export default {
  async fetch(request, env) {
    return handle(request, env) ?? fetch(request);
  },
};
