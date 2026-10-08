#!/usr/bin/env node
/**
 * Appends each page's own meta description to its link line in dist/llms.txt (planning/09 §6: "one-line descriptions
 * taken from the pages' own meta descriptions").
 *
 * src/pages/llms.txt.ts writes `- [Name](https://coderstrust.global/path/)`; this step reads
 * dist/<path>/index.html, takes its <meta name="description"> and writes `- [Name](url): description`. The description is
 * never typed in the endpoint, so a page edit cannot leave a stale line and no registered number is duplicated.
 * Idempotent; fails if a listed page was not built or has no description.
 *
 * Runs at the end of scripts/postbuild-redirects.mjs, or on its own:  node scripts/postbuild-llms.mjs [dist]
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, distFile, productionOrigin } from './manifest-lib.mjs';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });

export function fillLlmsDescriptions(dist) {
  const file = path.join(dist, 'llms.txt');
  if (!fs.existsSync(file)) throw new Error(`${file} not found (is src/pages/llms.txt.ts built?)`);
  const origin = productionOrigin();
  const link = new RegExp(`^- \\[([^\\]]+)\\]\\(${origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/(?:[^)\\s]*/)?)\\)$`);
  let filled = 0;
  const out = fs.readFileSync(file, 'utf8').split('\n').map((l) => {
    const m = l.match(link);
    if (!m) return l; // headings, text, lines that already carry a note, and file links
    const f = distFile(dist, m[2]);
    if (!fs.existsSync(f)) throw new Error(`llms.txt lists ${m[2]} but it is not in dist/`);
    const html = fs.readFileSync(f, 'utf8');
    const d = html.match(/<meta name="description" content="([^"]*)"/);
    if (!d) throw new Error(`${m[2]} has no meta description`);
    const text = decode(d[1]).replace(/\s+/g, ' ').trim();
    if (!text) throw new Error(`${m[2]} has an empty meta description`);
    filled++;
    return `${l}: ${text}`;
  });
  fs.writeFileSync(file, out.join('\n'));
  return filled;
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const dist = path.resolve(process.argv[2] ?? path.join(REPO_ROOT, 'dist'));
  try {
    console.log(`postbuild-llms: ${fillLlmsDescriptions(dist)} descriptions added to llms.txt`);
  } catch (e) {
    console.error(`postbuild-llms: FAIL ${e.message}`);
    process.exit(1);
  }
}
