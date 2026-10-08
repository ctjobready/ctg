import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/**
 * Build-time icon loader. Lucide (ISC) SVGs are read from `lucide-static`, stripped to their
 * inner shapes and cached; <Icon> inlines them. Brand glyphs (removed from Lucide) are local.
 */
const require = createRequire(import.meta.url);
let iconDir: string | undefined;
const cache = new Map<string, string>();

/** Minimal brand glyphs on a 24px grid (stroke style, currentColor). */
const BRAND: Record<string, string> = {
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  linkedin:
    '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  youtube:
    '<path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>',
};

function dir(): string {
  if (!iconDir) iconDir = join(dirname(require.resolve('lucide-static/package.json')), 'icons');
  return iconDir;
}

/** Inner SVG markup (paths, circles…) for an icon name. Throws with a helpful message if unknown. */
export function iconInner(name: string): string {
  const hit = cache.get(name);
  if (hit) return hit;
  let inner = BRAND[name];
  if (!inner) {
    let svg: string;
    try {
      svg = readFileSync(join(dir(), `${name}.svg`), 'utf8');
    } catch {
      throw new Error(`<Icon name="${name}"> is not a Lucide icon (see node_modules/lucide-static/icons).`);
    }
    inner = svg
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  cache.set(name, inner);
  return inner;
}
