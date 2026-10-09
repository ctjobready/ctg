// Does a news post's first body image repeat its cover photo? Shared by astro.config.mjs (the Markdown plugin that drops the
// repeat from the body) and src/components/pages/news/news.ts (the page that shows the cover as the hero, with the caption).
// Plain Node (no Astro or Vite imports) so the config can load it. The test runs on the Markdown source and the image files.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

/** @typedef {{ repeats: boolean, caption?: string }} CoverRepeat */
/** @type {CoverRepeat} */
const NONE = { repeats: false };

const sha = (/** @type {string} */ file) => createHash('sha1').update(readFileSync(file)).digest('hex');

/**
 * A post "repeats its cover" when the first image in its body is the cover photo: the same file (identical bytes, whatever the file
 * name), or a different crop of the same photograph that the post's front matter says so for (`coverInBody: true`). Only a first
 * image that sits alone in its paragraph counts, so that dropping it leaves no stray text behind.
 * `caption` is the italic line directly under that image, when there is one (it moves to the hero).
 * @param {string} mdPath absolute path of the post's Markdown file
 * @returns {CoverRepeat}
 */
export function readCoverRepeat(mdPath) {
  const raw = readFileSync(mdPath, 'utf8');
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!fm) return NONE;
  const cover = /^cover:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(fm[1])?.[1];
  if (!cover) return NONE;
  const flagged = /^coverInBody:\s*true\s*$/m.test(fm[1]);
  const blocks = raw.slice(fm[0].length).split(/\r?\n[ \t]*\r?\n/);
  const at = blocks.findIndex((b) => /!\[[^\]]*\]\([^)]*\)/.test(b));
  if (at === -1) return NONE;
  const image = /^\s*!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/.exec(blocks[at]);
  if (!image) return NONE;
  const dir = dirname(mdPath);
  const coverFile = resolve(dir, cover);
  const imageFile = resolve(dir, decodeURI(image[1]));
  if (!existsSync(coverFile) || !existsSync(imageFile)) return NONE;
  if (!flagged && coverFile !== imageFile && sha(coverFile) !== sha(imageFile)) return NONE;
  const caption = /^\s*[*_]([^*_\r\n][^\r\n]*?)[*_]\s*$/.exec(blocks[at + 1] ?? '')?.[1]?.trim();
  return { repeats: true, ...(caption && { caption }) };
}

/**
 * Does the cover photo (the same file, byte for byte) appear anywhere in the post's body, not only as its first image? Then a hero
 * above the body would show it twice, and the page keeps the body's copy (no hero). Compares file contents, never file names: a
 * cover "x-1.jpg" is not "x-1-2.jpg" just because one name starts with the other.
 * @param {string} mdPath absolute path of the post's Markdown file
 */
export function coverAppearsInBody(mdPath) {
  const raw = readFileSync(mdPath, 'utf8');
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  const cover = fm && /^cover:\s*["']?([^"'\r\n]+?)["']?\s*$/m.exec(fm[1])?.[1];
  if (!fm || !cover) return false;
  const dir = dirname(mdPath);
  const coverFile = resolve(dir, cover);
  if (!existsSync(coverFile)) return false;
  const coverHash = sha(coverFile);
  for (const m of raw.slice(fm[0].length).matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const file = resolve(dir, decodeURI(m[1]));
    if (existsSync(file) && (file === coverFile || sha(file) === coverHash)) return true;
  }
  return false;
}

/**
 * Every post in a folder of news Markdown files that repeats its cover, by slug (file name without .md).
 * @param {string} dir absolute path of src/content/news
 * @returns {Map<string, CoverRepeat>}
 */
export function coverRepeats(dir) {
  /** @type {Map<string, CoverRepeat>} */
  const out = new Map();
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.md')) continue;
    const r = readCoverRepeat(resolve(dir, file));
    if (r.repeats) out.set(basename(file, '.md'), r);
  }
  return out;
}
