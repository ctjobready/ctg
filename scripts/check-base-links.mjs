#!/usr/bin/env node
/**
 * Base-path guard (planning/08 §2): every internal href/src/srcset URL in dist/ must start with the
 * deployment base ("/ctg/" on staging). Fails on any root-relative URL without it.
 *   node scripts/check-base-links.mjs [dist] [base]      (base defaults to BASE_PATH or /ctg)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const raw = process.argv[3] ?? process.env.BASE_PATH ?? '/ctg';
const base = raw === '/' || raw === '' ? '' : '/' + raw.replace(/^\/+|\/+$/g, '');

function* walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const bad = [];
let ok = 0;
const attr = /\b(href|src|poster|action|data-src)="([^"]*)"/g;
const srcset = /\bsrcset="([^"]*)"/g;
const cssUrl = /url\(\s*["']?([^"')]+)["']?\s*\)/g;

const check = (file, url) => {
  if (!url.startsWith('/') || url.startsWith('//')) return; // external, relative, mailto:, tel:, #hash
  if (base === '' || url === base || url.startsWith(base + '/')) ok++;
  else bad.push(`${file}: ${url}`);
};

for (const file of walk(dist)) {
  if (!/\.(html|css)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  if (file.endsWith('.html')) {
    for (const m of text.matchAll(attr)) check(file, m[2]);
    for (const m of text.matchAll(srcset)) for (const part of m[1].split(',')) check(file, part.trim().split(/\s+/)[0]);
  }
  for (const m of text.matchAll(cssUrl)) check(file, m[1]);
}

console.log(`base-links: ${ok} internal URLs carry base "${base || '/'}"; ${bad.length} violations`);
if (bad.length) {
  console.log(bad.slice(0, 30).join('\n'));
  process.exit(1);
}
