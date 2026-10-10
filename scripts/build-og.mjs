#!/usr/bin/env node
/**
 * Renders the 1200x630 Open Graph cards (planning/09 §3) with Playwright's Chromium and writes
 *   public/og/<card>.png     (committed; default + one card per top-level section of the IA)
 *   src/lib/og.ts            (path prefix -> card, used by SEOHead; generated so it can never drift from the files)
 *
 *   node scripts/build-og.mjs
 *   env: CHROMIUM_PATH  Chromium/Chrome executable (default: Playwright's cached "Google Chrome for Testing" 1243 on macOS)
 *
 * Source of everything on a card:
 *   - colors: design tokens in src/styles/tokens.css (the AA theme)
 *   - type: the self-hosted D-DIN fonts in public/fonts/d-din (embedded, no network)
 *   - brand: the white CodersTrust wordmark in src/assets/images/brand
 *   - words: the section name and one line that already exist verbatim in the site's own copy (checked below).
 *     No statistics, no photographs of people, nothing that is not already on a page.
 * Every text/background pair is checked against WCAG AA (4.5:1) and every PNG against a 200 KB budget.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { REPO_ROOT } from './manifest-lib.mjs';

const OUT_DIR = path.join(REPO_ROOT, 'public', 'og');
const OG_TS = path.join(REPO_ROOT, 'src', 'lib', 'og.ts');
const W = 1200;
const H = 630;
const MAX_BYTES = 200 * 1024;

/**
 * One card per top-level section of the IA (planning/03 §2). `prefix` is the base-less path prefix the card serves;
 * `label` is the section name and `line` one existing sentence from that section's own copy.
 */
const CARDS = [
  { file: 'default', prefix: '/', exact: true, label: 'Learn. Earn. Prosper.', line: 'Turn youth unemployment into digital employment — with evidence.' },
  { file: 'partner-with-us', prefix: '/partner-with-us/', label: 'Partner with us', line: 'Co-design a youth-employment program with CodersTrust.' },
  { file: 'investors', prefix: '/investors/', label: 'Investors', line: 'Invest in the infrastructure of emerging-market work.' },
  { file: 'programs', prefix: '/programs/', label: 'Programs', line: 'Choose the program that fits you.' },
  { file: 'nu-postgraduate-diploma', prefix: '/nu-postgraduate-diploma/', label: 'NU Postgraduate Diploma', line: 'Build the digital skills employers are hiring for — alongside your degree.' },
  { file: 'our-model', prefix: '/our-model/', label: 'Our model', line: 'How the CodersTrust model works' },
  { file: 'impact', prefix: '/impact/', label: 'Impact', line: 'What CodersTrust results show, what kind of evidence each one is, and what it does not show.' },
  { file: 'about', prefix: '/about/', label: 'About', line: 'CodersTrust turns educated, unemployed youth in emerging markets into job-ready digital professionals.' },
  { file: 'news', prefix: '/news/', label: 'News', line: 'Partnerships and MoUs, recognition, program events and leadership' },
  { file: 'careers', prefix: '/careers/', label: 'Careers', line: 'Help move educated, unemployed young people into paid digital work.' },
  { file: 'contact', prefix: '/contact/', label: 'Contact', line: 'Choose the route that fits you.' },
];

// ---------------------------------------------------------------------------------------------
// Tokens, fonts, brand
// ---------------------------------------------------------------------------------------------
const tokensCss = fs.readFileSync(path.join(REPO_ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
const token = (name) => {
  const m = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`));
  if (!m) throw new Error(`design token --${name} not found in src/styles/tokens.css (run npm run tokens)`);
  return m[1].toLowerCase();
};
const COLORS = {
  bg: token('secondary'), // Klein blue
  text: token('on-secondary'), // white
  soft: token('primary-fixed'), // powder blue: secondary text
  line: token('primary-fixed-dim'), // decorative arcs
  cyan: token('cyan'), // decorative bar
  accent: token('tertiary-light'), // decorative dot
};

const luminance = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const contrasts = { 'headline text on card': contrast(COLORS.text, COLORS.bg), 'label and URL text on card': contrast(COLORS.soft, COLORS.bg) };
for (const [what, ratio] of Object.entries(contrasts)) {
  if (ratio < 4.5) throw new Error(`${what}: contrast ${ratio.toFixed(2)}:1 is below WCAG AA (4.5:1)`);
}

const b64 = (file) => fs.readFileSync(path.join(REPO_ROOT, file)).toString('base64');
const FONT_REGULAR = b64('public/fonts/d-din/D-DIN.woff2');
const FONT_BOLD = b64('public/fonts/d-din/D-DIN-Bold.woff2');
const WORDMARK = b64('src/assets/images/brand/coderstrust-wordmark-white.svg');

// ---------------------------------------------------------------------------------------------
// Words must already exist in the site's copy
// ---------------------------------------------------------------------------------------------
const srcText = [];
(function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(astro|ts|md|json)$/.test(ent.name) && p !== OG_TS) srcText.push(fs.readFileSync(p, 'utf8'));
  }
})(path.join(REPO_ROOT, 'src'));
const corpus = srcText.join('\n');
for (const c of CARDS) {
  for (const [what, text] of [['label', c.label], ['line', c.line]]) {
    if (!corpus.includes(text)) throw new Error(`card "${c.file}": ${what} "${text}" does not appear in the site copy (src/); cards may only reuse existing copy`);
    if (/\d/.test(text)) throw new Error(`card "${c.file}": ${what} contains a digit; cards carry no statistics`);
  }
}

// ---------------------------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Typesetting: keep an em dash with the word before it and never break inside a hyphenated compound. */
const typeset = (s) => esc(s).replace(/ — /g, '&nbsp;— ').replace(/\b([A-Za-z]+(?:-[A-Za-z]+)+)\b/g, '<span style="white-space:nowrap">$1</span>');

function cardHtml(card, index) {
  const size = card.line.length <= 56 ? 66 : card.line.length <= 80 ? 58 : 52;
  // Decorative motif: arcs anchored in the bottom-right corner, a dot travelling along one arc per section.
  const theta = ((200 + index * 6) * Math.PI) / 180; // 200 deg .. 260 deg: always inside the motif box
  const cx = 420 + 280 * Math.cos(theta);
  const cy = 630 + 280 * Math.sin(theta);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
@font-face{font-family:"D-DIN";font-weight:400;src:url(data:font/woff2;base64,${FONT_REGULAR}) format("woff2")}
@font-face{font-family:"D-DIN";font-weight:700;src:url(data:font/woff2;base64,${FONT_BOLD}) format("woff2")}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;background:${COLORS.bg};color:${COLORS.text};font-family:"D-DIN",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.motif{position:absolute;right:0;top:0;width:420px;height:${H}px}
.brand{position:absolute;left:72px;top:60px;width:340px;height:auto;display:block}
.copy{position:absolute;left:72px;top:176px;width:700px}
.label{display:flex;align-items:center;gap:16px;font-weight:700;font-size:28px;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.soft}}
.label::before{content:"";width:56px;height:6px;border-radius:3px;background:${COLORS.cyan}}
h1{margin-top:28px;font-weight:700;font-size:${size}px;line-height:1.12;letter-spacing:-.005em;color:${COLORS.text};text-wrap:balance}
.url{position:absolute;left:72px;bottom:52px;font-size:28px;color:${COLORS.soft};letter-spacing:.02em}
</style></head><body>
<svg class="motif" viewBox="0 0 420 ${H}" aria-hidden="true">
  <g fill="none" stroke="${COLORS.line}" stroke-opacity=".28" stroke-width="2">
    <circle cx="420" cy="630" r="120"/><circle cx="420" cy="630" r="200"/><circle cx="420" cy="630" r="280"/><circle cx="420" cy="630" r="360"/><circle cx="420" cy="630" r="440"/>
  </g>
  <rect x="150" y="96" width="132" height="30" rx="15" fill="${COLORS.cyan}"/>
  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="24" fill="${COLORS.accent}"/>
  <circle cx="352" cy="218" r="9" fill="${COLORS.text}"/>
</svg>
<img class="brand" alt="" src="data:image/svg+xml;base64,${WORDMARK}">
<div class="copy"><div class="label">${esc(card.label)}</div><h1>${typeset(card.line)}</h1></div>
<div class="url">coderstrust.global</div>
</body></html>`;
}

// ---------------------------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------------------------
const executablePath =
  process.env.CHROMIUM_PATH ??
  path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
if (!fs.existsSync(executablePath)) {
  console.error(`build-og: Chromium not found at ${executablePath}\nSet CHROMIUM_PATH to a Chromium or Chrome executable.`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--font-render-hinting=none', '--hide-scrollbars'] });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const [i, card] of CARDS.entries()) {
    await page.setContent(cardHtml(card, i), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const fontsOk = await page.evaluate(() => document.fonts.check('700 40px "D-DIN"') && document.fonts.check('400 28px "D-DIN"'));
    if (!fontsOk) throw new Error(`card "${card.file}": D-DIN did not load`);
    // Fit the headline: shrink in 2 px steps (never below 44 px) until it ends well above the URL line.
    const bottom = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      let size = parseFloat(getComputedStyle(h1).fontSize);
      while (h1.getBoundingClientRect().bottom > 480 && size > 44) {
        size -= 2;
        h1.style.fontSize = `${size}px`;
      }
      return h1.getBoundingClientRect().bottom;
    });
    if (bottom > 490) throw new Error(`card "${card.file}": headline runs to y=${Math.round(bottom)}, too close to the URL line`);
    const file = path.join(OUT_DIR, `${card.file}.png`);
    await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
    const bytes = fs.statSync(file).size;
    if (bytes > MAX_BYTES) throw new Error(`card "${card.file}": ${bytes} bytes exceeds the ${MAX_BYTES} byte budget`);
    results.push({ file: `${card.file}.png`, bytes });
  }
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------------------------
// src/lib/og.ts
// ---------------------------------------------------------------------------------------------
const altOf = (c) => (c.file === 'default' ? 'CodersTrust: Learn. Earn. Prosper.' : `CodersTrust: ${c.label}. ${c.line}${/[.!?]$/.test(c.line) ? '' : '.'}`);
const q = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const longestFirst = [...CARDS].filter((c) => c.file !== 'default').sort((a, b) => b.prefix.length - a.prefix.length);
const def = CARDS.find((c) => c.file === 'default');
fs.writeFileSync(
  OG_TS,
  [
    '// GENERATED by scripts/build-og.mjs from the same card table that renders public/og/*.png. Do not edit by hand.',
    '',
    '/** An Open Graph card (1200x630 PNG in public/og/) and its alt text. `src` is a base-less site path. */',
    'export interface OgCard {',
    '  src: string;',
    '  alt: string;',
    '}',
    '',
    `export const DEFAULT_OG: OgCard = { src: ${q('/og/default.png')}, alt: ${q(altOf(def))} };`,
    '',
    '/** Path prefix -> section card, longest prefix first. */',
    'const SECTION_CARDS: { prefix: string; card: OgCard }[] = [',
    ...longestFirst.map((c) => `  { prefix: ${q(c.prefix)}, card: { src: ${q(`/og/${c.file}.png`)}, alt: ${q(altOf(c))} } },`),
    '];',
    '',
    '/** The card for a base-less page path (for example "/impact/outcomes-2026/"); the default card when no section matches. */',
    'export function ogCardFor(path: string): OgCard {',
    '  for (const { prefix, card } of SECTION_CARDS) {',
    '    if (path === prefix || path.startsWith(prefix)) return card;',
    '  }',
    '  return DEFAULT_OG;',
    '}',
    '',
  ].join('\n'),
);

console.log(`build-og: ${results.length} cards in public/og/ (${W}x${H}); contrast ${Object.entries(contrasts).map(([k, v]) => `${v.toFixed(1)}:1`).join(', ')}`);
for (const r of results) console.log(`  ${r.file.padEnd(32)}${String(r.bytes).padStart(8)} bytes`);
console.log('wrote src/lib/og.ts');
