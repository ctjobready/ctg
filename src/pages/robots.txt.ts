import type { APIRoute } from 'astro';
import { PRODUCTION_ORIGIN } from '../lib/site';

/**
 * robots.txt (planning/09 §6, planning/08 §2).
 *
 * Production: allow everything, name the AI crawlers explicitly (the CMF baseline names Claude-Web and
 * anthropic-ai stay alongside the current ones), and point at the sitemap index on the canonical origin.
 *
 * Staging: a disallow-all file. robots.txt cannot sit at the github.io host root (this site lives under /ctg/),
 * so the real control on staging is the per-page `noindex, nofollow` meta tag; this file is only a courtesy
 * for anyone who fetches it.
 */
const AI_USER_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
] as const;

function robotsTxt(env: 'staging' | 'production'): string {
  if (env !== 'production') {
    return [
      '# Staging build: not for indexing. Every page also carries a noindex meta tag.',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }
  return [
    '# CodersTrust robots.txt',
    'User-agent: *',
    'Allow: /',
    '',
    '# AI crawlers and answer engines are welcome: we want to be cited accurately.',
    ...AI_USER_AGENTS.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']),
    `Sitemap: ${PRODUCTION_ORIGIN}/sitemap-index.xml`,
    '',
  ].join('\n');
}

export const GET: APIRoute = () =>
  new Response(robotsTxt(__SITE_ENV__), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
