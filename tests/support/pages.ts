import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { BASE, DIST_DIR } from './env';

/**
 * Page inventory, derived from the build output so no route is ever hard-coded:
 * every `dist/**\/index.html` plus the top-level `404.html`, minus redirect stubs
 * (pages whose <head> carries a meta refresh).
 */
export interface SitePage {
  /** Site-relative route: "/", "/about/team/", "/404.html". */
  route: string;
  /** Path relative to the Playwright baseURL (which already carries the base path). */
  rel: string;
  /** File-system-safe identifier: "home", "about-team", "404". */
  slug: string;
  /** Absolute path of the built HTML file. */
  file: string;
}

export interface Inventory {
  pages: SitePage[];
  /** Redirect stubs that were skipped (route list, for the run summary). */
  stubs: string[];
}

let cache: Inventory | undefined;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * True for a redirect stub: the document head carries <meta http-equiv="refresh">, or the build marked the root element
 * with data-redirect-stub (postbuild-redirects.mjs).
 */
export function isRedirectStub(html: string): boolean {
  const head = /<head[\s\S]*?<\/head>/i.exec(html)?.[0] ?? html.slice(0, 6000);
  const root = /<html\b[^>]*>/i.exec(html.slice(0, 2000))?.[0] ?? '';
  return /<meta[^>]+http-equiv\s*=\s*["']?refresh/i.test(head) || /\bdata-redirect-stub\b/i.test(root);
}

function assertBuiltForThisBase(): void {
  const home = join(DIST_DIR, 'index.html');
  const html = readFileSync(home, 'utf8');
  const icon = /<link rel="icon" href="([^"]*)favicon\.svg"/.exec(html);
  if (icon && icon[1] !== BASE) {
    throw new Error(
      `dist/ was built with base "${icon[1]}" but the tests expect "${BASE}". ` +
        'Build and test with the same BASE_PATH (default /ctg).',
    );
  }
}

export function inventory(): Inventory {
  if (cache) return cache;
  if (!existsSync(DIST_DIR)) {
    throw new Error(`No build output at ${DIST_DIR}. Run "npm run build" first (staging defaults).`);
  }
  assertBuiltForThisBase();
  const pages: SitePage[] = [];
  const stubs: string[] = [];
  for (const file of walk(DIST_DIR).sort()) {
    const rel = relative(DIST_DIR, file).split(sep).join('/');
    let route: string;
    if (rel === 'index.html') route = '/';
    else if (rel === '404.html') route = '/404.html';
    else if (rel.endsWith('/index.html')) route = `/${rel.slice(0, -'index.html'.length)}`;
    else continue; // other loose .html files are not site pages
    const html = readFileSync(file, 'utf8');
    if (isRedirectStub(html)) {
      stubs.push(route);
      continue;
    }
    const slug = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replace(/\.html$/, '').replace(/\//g, '-');
    pages.push({ route, rel: route === '/' ? './' : route.slice(1), slug, file });
  }
  cache = { pages, stubs };
  return cache;
}

export const listPages = (): SitePage[] => inventory().pages;

export function pageByRoute(route: string): SitePage {
  const found = listPages().find((p) => p.route === route);
  if (!found) throw new Error(`Route ${route} is not in dist/ (pages: ${listPages().length}).`);
  return found;
}

/** Pages whose built HTML matches `needle` (used to find the pages that contain a component). */
export function pagesWithMarkup(needle: RegExp): SitePage[] {
  return listPages().filter((p) => needle.test(readFileSync(p.file, 'utf8')));
}

/** Number of matches of a pattern in a page's built HTML. */
export function countMarkup(page: SitePage, needle: RegExp): number {
  const flags = needle.flags.includes('g') ? needle.flags : `${needle.flags}g`;
  return (readFileSync(page.file, 'utf8').match(new RegExp(needle.source, flags)) ?? []).length;
}
