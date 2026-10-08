import { PRODUCTION_ORIGIN } from './site';

/**
 * Base-aware URL helper (planning/08 §2). EVERY internal href/src must go through `url()`.
 * Content is written root-relative ("/about/"); staging resolves it to "/ctg/about/".
 */

const RAW_BASE: string = import.meta.env.BASE_URL || '/';
/** Normalised base without trailing slash: "" for root hosting, "/ctg" on staging. */
export const BASE: string = RAW_BASE === '/' ? '' : '/' + RAW_BASE.replace(/^\/+|\/+$/g, '');

/** True for anything that is not a site-internal path (http(s), mailto, tel, protocol-relative…). */
export function isExternal(href: string): boolean {
  return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
}

/** True for http(s) links leaving the site (these get external-link treatment). */
export function isOffsite(href: string): boolean {
  return /^(https?:)?\/\//i.test(href);
}

/** Split "/a/b/?x=1#frag" into [path, suffix]. */
function splitSuffix(href: string): [string, string] {
  const i = href.search(/[?#]/);
  return i === -1 ? [href, ''] : [href.slice(0, i), href.slice(i)];
}

/** Add a trailing slash unless the path points at a file ("/robots.txt", "/og/default.png"). */
function withTrailingSlash(path: string): string {
  if (path.endsWith('/')) return path;
  const last = path.split('/').pop() ?? '';
  return last.includes('.') ? path : path + '/';
}

/**
 * Resolve a site path to its deployed URL.
 *   url('/about/')        -> '/ctg/about/'  (staging)  |  '/about/' (production)
 *   url('about')          -> '/ctg/about/'
 *   url('/news/#latest')  -> '/ctg/news/#latest'
 *   url('https://x.org')  -> 'https://x.org'   (external, mailto:, tel:, #hash passthrough)
 */
export function url(href: string = '/'): string {
  if (!href) return BASE + '/';
  if (isExternal(href) || href.startsWith('#')) return href;
  const [path, suffix] = splitSuffix(href);
  let p = path.startsWith('/') ? path : '/' + path;
  p = withTrailingSlash(p);
  // Idempotent: never double-prefix an already-based path.
  if (BASE && (p === BASE + '/' || p.startsWith(BASE + '/'))) return p + suffix;
  return BASE + p + suffix;
}

/** Remove the base prefix from a pathname ("/ctg/about/" -> "/about/"). */
export function stripBase(pathname: string): string {
  if (BASE && (pathname === BASE || pathname.startsWith(BASE + '/'))) {
    return pathname.slice(BASE.length) || '/';
  }
  return pathname;
}

/** Fully-qualified URL on the *deployment* origin (current staging/production host). */
export function absoluteUrl(href: string, site: URL | string | undefined): string {
  const origin = String(site ?? PRODUCTION_ORIGIN).replace(/\/+$/, '');
  return isExternal(href) ? href : origin + url(href);
}

/** Canonical URL: always the production origin + the base-less path. */
export function canonicalUrl(path: string): string {
  const [p, suffix] = splitSuffix(stripBase(path));
  return PRODUCTION_ORIGIN + withTrailingSlash(p.startsWith('/') ? p : '/' + p) + suffix;
}

/** Hostname for display / screen readers ("https://jobready.global/x" -> "jobready.global"). */
export function hostOf(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, '');
  } catch {
    return href;
  }
}

export interface LinkAttrs {
  href: string;
  rel?: string;
  external: boolean;
  /** Visually-hidden suffix announced by screen readers, e.g. "(opens jobready.global)". */
  srText?: string;
}

/** One place that decides href resolution, rel and the external-link announcement. */
export function linkAttrs(href: string): LinkAttrs {
  if (isOffsite(href)) {
    return { href, rel: 'noopener', external: true, srText: `(opens ${hostOf(href)})` };
  }
  if (/^mailto:/i.test(href)) return { href, external: false, srText: '(opens your email app)' };
  return { href: url(href), external: false };
}
