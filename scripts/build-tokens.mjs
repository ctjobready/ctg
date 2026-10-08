#!/usr/bin/env node
/**
 * design-system/tokens.json  ->  src/styles/tokens.css
 *
 * The CSS can never drift from the design system: every color, spacing, radius,
 * shadow and breakpoint token is read from tokens.json. Themed tokens resolve to
 * the Accessible (AA) value (planning/07 §1); the Light value is also exposed as
 * `--<name>-light` for decoration / large display only.
 * Extension tokens (planning/07 §2) are declared in this file.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'design-system/tokens.json');
const out = resolve(root, 'src/styles/tokens.css');

const tokens = JSON.parse(readFileSync(src, 'utf8'));
const THEME = 'accessible';

const lines = [];
const push = (s = '') => lines.push(s);
const decl = (name, value, comment) =>
  push(`  --${name}: ${value};${comment ? ` /* ${comment} */` : ''}`);

push('/* ==========================================================================');
push('   GENERATED FILE — DO NOT EDIT.');
push('   Source: design-system/tokens.json (theme: Accessible AA) via scripts/build-tokens.mjs');
push('   Regenerate with `npm run tokens` (runs automatically before dev and build).');
push('   ========================================================================== */');
push();
push(':root {');

// ---- Color ---------------------------------------------------------------
push('  /* Color — AA theme values; themed tokens also expose --<name>-light (decoration / ≥24px display only) */');
const lightExtras = [];
for (const t of tokens.color.tokens) {
  if (t.value && typeof t.value === 'object') {
    decl(t.name, t.value[THEME]);
    lightExtras.push([`${t.name}-light`, t.value.light]);
  } else {
    decl(t.name, t.value);
  }
}
push();
push('  /* Light-theme counterparts of themed tokens */');
for (const [n, v] of lightExtras) decl(n, v);

// ---- Spacing -------------------------------------------------------------
push();
push('  /* Spacing & layout */');
for (const t of tokens.spacing.tokens) decl(t.name, t.value);

// ---- Radius --------------------------------------------------------------
push();
push('  /* Radius */');
for (const t of tokens.radius.tokens) decl(t.name, t.value);

// ---- Shadow --------------------------------------------------------------
push();
push('  /* Elevation */');
for (const t of tokens.shadow.tokens) decl(t.name, t.value);

// ---- Breakpoints (reference only: custom properties cannot be used in @media) --
push();
push('  /* Breakpoints (reference values; use the literal px in @media) */');
for (const t of tokens.breakpoint.tokens) decl(t.name, t.value);

// ---- Extension tokens (planning/07 §2) -------------------------------------
push();
push('  /* ➕ Extension tokens */');
decl('brand-bright', '#2682f9', 'Light-theme JobReady Blue: decoration + ≥24px display figures only (3.72:1 on white)');
decl(
  'font-sans',
  '"D-DIN", "D-DIN Fallback", Roboto, "Hind Siliguri", system-ui, sans-serif',
  'system stack + metric-matched fallback',
);
decl('measure', '68ch');
decl('header-h', '64px', '72px from 1024px — see media query below');
decl('band-pad', 'clamp(40px, 6vw, 80px)', 'section padding');
decl('ease-standard', 'cubic-bezier(0.2, 0, 0, 1)');
decl('ease-emphasized', 'cubic-bezier(0.2, 0.8, 0.2, 1)');
decl('dur-fast', '150ms');
decl('dur-base', '200ms');
decl('dur-slow', '400ms');
decl('dur-reveal', '600ms');
decl('shadow-card-hover', '0 12px 24px -6px rgba(6, 101, 223, 0.18), 0 2px 6px rgba(210, 229, 254, 0.6)');

// ---- Font weights --------------------------------------------------------
push();
push('  /* Font weights — D-DIN ships 400 + 700; 500 resolves to 400 and 600 to 700 by CSS font matching */');
decl('fw-regular', '400');
decl('fw-medium', '500');
decl('fw-semibold', '600');
decl('fw-bold', '700');

// ---- Type scale (planning/07 §3 fluid values) -----------------------------
push();
push('  /* Type scale — fluid between mobile and desktop (system sizes) */');
const scale = [
  ['display-5xl', 'clamp(2rem, 1.4rem + 2.2vw, 2.75rem)', '1.2'],
  ['display-4xl', 'clamp(1.75rem, 1.3rem + 1.8vw, 2.5rem)', '1.2'],
  ['heading-3xl', 'clamp(1.5rem, 1.1rem + 1.6vw, 2.25rem)', '1.22'],
  ['heading-2xl', 'clamp(1.5rem, 1.2rem + 1.1vw, 2rem)', '1.25'],
  ['heading-xl', 'clamp(1.5rem, 1.35rem + 0.6vw, 1.75rem)', '1.29'],
  ['heading-l', 'clamp(1.25rem, 1.15rem + 0.4vw, 1.5rem)', '1.33'],
  ['heading-m', 'clamp(1.125rem, 1.08rem + 0.2vw, 1.25rem)', '1.4'],
  ['body-l', 'clamp(1rem, 0.9rem + 0.45vw, 1.25rem)', '1.6'],
  ['body-m', 'clamp(1rem, 0.95rem + 0.25vw, 1.125rem)', '1.45'],
  ['body-base', '1rem', '1.5'],
  ['body-xs', '0.875rem', '1.43'],
];
for (const [n, fs, lh] of scale) {
  decl(`fs-${n}`, fs);
  decl(`lh-${n}`, lh);
}
push('}');
push();
push('/* Header height steps up on desktop */');
push('@media (min-width: 1024px) {');
push('  :root {');
push('    --header-h: 72px;');
push('  }');
push('}');
push();

mkdirSync(dirname(out), { recursive: true });
const css = lines.join('\n');
writeFileSync(out, css);
console.log(`tokens: wrote ${out.replace(root + '/', '')} (${css.split('\n').length} lines)`);
