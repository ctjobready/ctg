import { defineMiddleware } from 'astro:middleware';
import { postprocessPage } from './lib/postprocess';

/**
 * Finishes every HTML page after it has rendered (src/lib/postprocess.ts): one non-affiliation note per page, no doubled
 * full stop after a fact, and a space before inline links that Astro's HTML compression glued to the sentence before them.
 * Non-HTML responses (llms.txt, robots.txt, redirects) pass through untouched.
 */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(postprocessPage(html), { status: response.status, statusText: response.statusText, headers });
});
