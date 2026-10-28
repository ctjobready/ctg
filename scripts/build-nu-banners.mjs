#!/usr/bin/env node
/**
 * Renders the four NU Post Graduate Diploma course banners (808x555 JPEG) with Playwright's Chromium and writes
 *   src/assets/images/pages/nu-pgd/{cybersecurity,data-analytics,digital-marketing,ict}.jpg
 * (the file names the photo registry, src/data/photos.ts, and the permissions rows already use).
 *
 *   node scripts/build-nu-banners.mjs            or  npm run nu-banners
 *   node scripts/build-nu-banners.mjs --check    checks tokens, assets, wording and WCAG AA contrast, prints them as JSON, renders nothing
 *   node scripts/build-nu-banners.mjs --out DIR  writes the JPEGs into DIR instead of the asset folder
 *   env: CHROMIUM_PATH  Chromium/Chrome executable (default: the one Playwright installed)
 *
 * Source of everything on a banner (no stock photos, no generated images, no statistics):
 *   - colors: the design tokens in src/styles/tokens.css, the same source scripts/build-og.mjs reads
 *   - type: the self-hosted D-DIN fonts in public/fonts/d-din (embedded, no network)
 *   - logos: the National University crest (src/assets/images/partners/national-university.png, which has no lettering, so
 *     "National University of Bangladesh" is set beside it, as on the previous banners) and the CodersTrust wordmark
 *     (src/assets/images/brand/coderstrust-wordmark.svg, the file the Logo component inlines)
 *   - words: NU's own wording (owner 2026-10-26/27): the eyebrow, the course name and, for ICT, its long name
 *   - art: simple vector motifs drawn below in the site's cover style (src/components/ui/HeroArt.astro: Klein slab, Powder
 *     panel, JobReady-Blue slab, one orange spark, one cyan chip) on the Airy Blue ground, as the course-card frames are
 * Every text/ground pair is checked against WCAG AA (4.5:1) and every JPEG against the size budget (the previous banner's size x 1.5).
 * The course page's hero shows a banner in a 3:2 frame (about 8 px cropped top and bottom), so nothing sits within 28 px of an edge.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { REPO_ROOT } from './manifest-lib.mjs';

const W = 808;
const H = 555;
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const outFlag = argv.indexOf('--out');
const OUT_DIR = outFlag >= 0 ? path.resolve(argv[outFlag + 1] ?? '') : path.join(REPO_ROOT, 'src', 'assets', 'images', 'pages', 'nu-pgd');
if (outFlag >= 0 && !argv[outFlag + 1]) throw new Error('--out needs a folder');

const EYEBROW = 'PGD | Post Graduate Diploma';
/** `file` is the registry key's file name; `size` is the title size in px (shrunk below if a word would run into the art). */
const BANNERS = [
  { file: 'cybersecurity.jpg', title: 'Cyber Security', motif: 'cyber', size: 78, bytes: 77815 },
  { file: 'data-analytics.jpg', title: 'Data Analytics', motif: 'data', size: 78, bytes: 73508 },
  { file: 'digital-marketing.jpg', title: 'Digital Marketing', motif: 'marketing', size: 78, bytes: 80779 },
  { file: 'ict.jpg', title: 'ICT', subtitle: 'Information and Communication Technology', motif: 'ict', size: 150, bytes: 80398 },
];

// ---------------------------------------------------------------------------------------------
// Tokens, fonts, logos
// ---------------------------------------------------------------------------------------------
const tokensCss = fs.readFileSync(path.join(REPO_ROOT, 'src', 'styles', 'tokens.css'), 'utf8');
const token = (name) => {
  const m = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\b`));
  if (!m) throw new Error(`design token --${name} not found in src/styles/tokens.css (run npm run tokens)`);
  return m[1].toLowerCase();
};
const C = {
  ground: token('surface-container-low'), // Airy Blue: the ground of the course-card frames and of HeroArt
  panel: token('primary-fixed'), // Powder panel
  klein: token('secondary'), // Klein slab and the title
  white: token('on-secondary'),
  blue: token('brand-bright'), // JobReady-Blue slab (decoration)
  primary: token('primary'),
  cyan: token('cyan'), // chip
  spark: token('tertiary-light'), // spark disc
  sparkInk: token('on-tertiary-light'),
  trace: token('secondary-fixed-dim'), // thin lines on Klein
  tint: token('secondary-container'),
  arc: token('primary-fixed-dim'), // background arcs (decoration)
  eyebrow: token('on-primary-container'), // eyebrow text on its white pill
  subtitle: token('on-secondary-container'), // ICT's long name on the ground
  text: token('on-surface'), // "National University of Bangladesh" on the ground
};
const WORDMARK_SVG = fs.readFileSync(path.join(REPO_ROOT, 'src', 'assets', 'images', 'brand', 'coderstrust-wordmark.svg'), 'utf8');
const WORDMARK_COLOR = (WORDMARK_SVG.match(/fill="(#[0-9a-fA-F]{6})"/) ?? [])[1];
if (!WORDMARK_COLOR) throw new Error('the CodersTrust wordmark has no fill color to check');
const b64 = (file) => fs.readFileSync(path.join(REPO_ROOT, file)).toString('base64');
const FONT_REGULAR = b64('public/fonts/d-din/D-DIN.woff2');
const FONT_BOLD = b64('public/fonts/d-din/D-DIN-Bold.woff2');
const CREST = b64('src/assets/images/partners/national-university.png');
const WORDMARK = Buffer.from(WORDMARK_SVG).toString('base64');

const luminance = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const contrasts = {
  'title on ground': contrast(C.klein, C.ground),
  'eyebrow on its pill': contrast(C.eyebrow, C.white),
  'long name (ICT) on ground': contrast(C.subtitle, C.ground),
  'National University lettering on ground': contrast(C.text, C.ground),
  'CodersTrust wordmark on ground': contrast(WORDMARK_COLOR.toLowerCase(), C.ground),
};
for (const [what, ratio] of Object.entries(contrasts)) {
  if (ratio < 4.5) throw new Error(`${what}: contrast ${ratio.toFixed(2)}:1 is below WCAG AA (4.5:1)`);
}
for (const b of BANNERS) {
  if (/\d/.test(`${EYEBROW}${b.title}${b.subtitle ?? ''}`)) throw new Error(`banner "${b.file}": its words carry a digit; banners carry no statistics`);
}

if (CHECK) {
  console.log(
    JSON.stringify({
      banners: BANNERS.map(({ file, title, subtitle }) => ({ file, eyebrow: EYEBROW, title, ...(subtitle ? { subtitle } : {}) })),
      contrast: Object.fromEntries(Object.entries(contrasts).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    }),
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------
// Course motifs, drawn in absolute banner coordinates. The Klein slab is x 440..768, y 60..432.
// ---------------------------------------------------------------------------------------------
const SLAB = { x: 440, y: 60, w: 328, h: 372 };
const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const trace = (d) => `<path d="${d}" fill="none" stroke="${C.trace}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

const MOTIFS = {
  // A shield with a padlock, circuit traces and a check badge.
  cyber: `
    ${trace('M40 92 H92 L114 114')}${trace('M290 122 H238 L214 146')}${trace('M52 304 H102 L126 280')}${trace('M278 296 H228 L206 274')}
    ${dot(40, 92, 8, C.cyan)}${dot(290, 122, 8, C.spark)}${dot(52, 304, 8, C.white)}${dot(278, 296, 8, C.cyan)}
    <path d="M164 52 L254 88 V176 C254 234 214 276 164 304 C114 276 74 234 74 176 V88 Z" fill="${C.white}"/>
    <path d="M164 78 L232 104 V176 C232 220 202 254 164 276 C126 254 96 220 96 176 V104 Z" fill="${C.tint}"/>
    <path d="M136 172 V154 a28 28 0 0 1 56 0 V172" fill="none" stroke="${C.klein}" stroke-width="12" stroke-linecap="round"/>
    <rect x="122" y="168" width="84" height="66" rx="13" fill="${C.klein}"/>
    ${dot(164, 193, 9, C.cyan)}<rect x="160" y="198" width="8" height="22" rx="4" fill="${C.cyan}"/>
    ${dot(250, 270, 28, C.spark)}<path d="M237 270 l10 10 l19 -21" fill="none" stroke="${C.sparkInk}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
  // A chart card (bars and a trend line) with a donut card in front of it.
  data: `
    <rect x="36" y="52" width="258" height="206" rx="20" fill="${C.white}"/>
    <g fill="${C.primary}"><rect x="62" y="172" width="26" height="50" rx="7"/><rect x="100" y="146" width="26" height="76" rx="7"/><rect x="138" y="160" width="26" height="62" rx="7"/><rect x="176" y="120" width="26" height="102" rx="7"/></g>
    <rect x="214" y="92" width="26" height="130" rx="7" fill="${C.spark}"/>
    <path d="M50 226 H280" stroke="${C.panel}" stroke-width="4" stroke-linecap="round"/>
    <path d="M75 150 L113 124 L151 136 L189 96 L227 72" fill="none" stroke="${C.klein}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <g fill="${C.klein}" stroke="${C.white}" stroke-width="3"><circle cx="75" cy="150" r="7"/><circle cx="113" cy="124" r="7"/><circle cx="151" cy="136" r="7"/><circle cx="189" cy="96" r="7"/><circle cx="227" cy="72" r="7"/></g>
    <rect x="170" y="236" width="124" height="112" rx="20" fill="${C.panel}"/>
    <circle cx="232" cy="292" r="31" fill="none" stroke="${C.white}" stroke-width="16"/>
    <circle cx="232" cy="292" r="31" fill="none" stroke="${C.primary}" stroke-width="16" stroke-dasharray="118 194.8" transform="rotate(-90 232 292)"/>
    <circle cx="232" cy="292" r="31" fill="none" stroke="${C.spark}" stroke-width="16" stroke-dasharray="36 194.8" stroke-dashoffset="-118" transform="rotate(-90 232 292)"/>
    <rect x="36" y="284" width="108" height="20" rx="10" fill="${C.panel}"/><rect x="36" y="314" width="74" height="20" rx="10" fill="${C.trace}"/>`,
  // A megaphone with sound waves, and a funnel with dots dropping into it.
  marketing: `
    <path d="M62 152 L198 90 V224 L62 188 Z" fill="${C.white}"/>
    <rect x="190" y="78" width="28" height="158" rx="14" fill="${C.spark}"/>
    <rect x="34" y="146" width="46" height="48" rx="12" fill="${C.panel}"/>
    <rect x="92" y="190" width="32" height="68" rx="12" fill="${C.white}" transform="rotate(-12 108 224)"/>
    <g fill="none" stroke="${C.cyan}" stroke-width="9" stroke-linecap="round">
      <path d="M249.5 132.4 A40 40 0 0 1 249.5 181.6"/><path d="M270 116.3 A66 66 0 0 1 270 197.7" stroke="${C.trace}"/><path d="M290.5 100.3 A92 92 0 0 1 290.5 213.7" stroke="${C.panel}" stroke-opacity=".7"/>
    </g>
    ${dot(146, 268, 8, C.spark)}${dot(178, 254, 8, C.cyan)}${dot(212, 272, 8, C.white)}${dot(246, 258, 8, C.spark)}${dot(272, 276, 8, C.cyan)}
    <path d="M52 292 H276 L196 338 V356 H132 V338 Z" fill="${C.panel}"/>
    <path d="M52 292 H276 L262 300 H66 Z" fill="${C.white}" fill-opacity=".7"/>`,
  // A network of nodes and a code card.
  ict: `
    <g stroke="${C.trace}" stroke-width="4" stroke-linecap="round"><path d="M164 132 L62 84"/><path d="M164 132 L266 76"/><path d="M164 132 L286 190"/><path d="M164 132 L48 196"/><path d="M164 132 L164 40"/></g>
    ${dot(62, 84, 22, C.white)}${dot(62, 84, 8, C.klein)}${dot(266, 76, 22, C.white)}${dot(266, 76, 8, C.klein)}
    ${dot(286, 190, 22, C.white)}${dot(286, 190, 8, C.klein)}${dot(48, 196, 22, C.white)}${dot(48, 196, 8, C.klein)}
    ${dot(164, 40, 22, C.spark)}${dot(164, 40, 8, C.sparkInk)}
    ${dot(164, 132, 40, C.cyan)}${dot(164, 132, 21, C.white)}
    <rect x="46" y="250" width="236" height="100" rx="20" fill="${C.white}"/>
    <path d="M112 278 L88 300 L112 322" fill="none" stroke="${C.klein}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M216 278 L240 300 L216 322" fill="none" stroke="${C.klein}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M180 274 L152 326" fill="none" stroke="${C.spark}" stroke-width="11" stroke-linecap="round"/>`,
};

// ---------------------------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function bannerHtml(b) {
  const arcs = [120, 210, 300, 390, 480].map((r) => `<circle cx="0" cy="${H}" r="${r}"/>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
@font-face{font-family:"D-DIN";font-weight:400;src:url(data:font/woff2;base64,${FONT_REGULAR}) format("woff2")}
@font-face{font-family:"D-DIN";font-weight:700;src:url(data:font/woff2;base64,${FONT_BOLD}) format("woff2")}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{position:relative;background:${C.ground};font-family:"D-DIN",Arial,sans-serif;-webkit-font-smoothing:antialiased}
svg.art{position:absolute;left:0;top:0}
.lockup{position:absolute;left:40px;top:34px;height:64px;display:flex;align-items:center;gap:12px}
.crest{height:64px;width:auto;display:block}
.nu{font-size:17px;line-height:1.22;color:${C.text}}
.sep{width:2px;height:46px;border-radius:1px;background:${C.arc}}
.wm{width:148px;height:auto;display:block}
.copy{position:absolute;left:40px;top:122px;bottom:36px;width:392px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}
.eyebrow{display:inline-block;padding:8px 18px 9px;border-radius:999px;background:${C.white};border:2px solid ${C.panel};color:${C.eyebrow};font-weight:700;font-size:20px;line-height:1.1;white-space:nowrap}
h1{margin-top:20px;font-weight:700;font-size:${b.size}px;line-height:${b.subtitle ? 0.92 : 1.02};letter-spacing:-.01em;color:${C.klein}}
.sub{margin-top:14px;font-size:27px;line-height:1.25;color:${C.subtitle};max-width:340px}
</style></head><body>
<svg class="art" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
  <g fill="none" stroke="${C.arc}" stroke-opacity=".34" stroke-width="2">${arcs}</g>
  <rect x="${SLAB.x + 36}" y="${SLAB.y + 48}" width="${SLAB.w - 36}" height="${SLAB.h + 16}" rx="28" fill="${C.panel}"/>
  <rect x="${SLAB.x}" y="${SLAB.y}" width="${SLAB.w}" height="${SLAB.h}" rx="28" fill="${C.klein}"/>
  <rect x="704" y="456" width="64" height="52" rx="14" fill="${C.blue}"/>
  <g transform="translate(${SLAB.x} ${SLAB.y})">${MOTIFS[b.motif]}</g>
  <circle cx="752" cy="64" r="26" fill="${C.spark}"/>
  <rect x="408" y="414" width="112" height="26" rx="13" fill="${C.cyan}"/>
</svg>
<div class="lockup"><img class="crest" alt="" src="data:image/png;base64,${CREST}"><div class="nu">National University<br>of Bangladesh</div><div class="sep"></div><img class="wm" alt="" src="data:image/svg+xml;base64,${WORDMARK}"></div>
<div class="copy"><div class="eyebrow">${esc(EYEBROW)}</div><h1>${esc(b.title)}</h1>${b.subtitle ? `<div class="sub">${esc(b.subtitle)}</div>` : ''}</div>
</body></html>`;
}

// ---------------------------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------------------------
fs.mkdirSync(OUT_DIR, { recursive: true });
const launch = { args: ['--font-render-hinting=none', '--hide-scrollbars'] };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launch);
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const b of BANNERS) {
    await page.setContent(bannerHtml(b), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const ok = await page.evaluate(() => document.fonts.check('700 40px "D-DIN"') && document.fonts.check('400 17px "D-DIN"') && [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    if (!ok) throw new Error(`banner "${b.file}": D-DIN or a logo did not load`);
    // Fit: the title may not run into the art (its widest line ends before x=424) and the copy block may not leave its frame.
    const fit = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      let size = parseFloat(getComputedStyle(h1).fontSize);
      const right = () => Math.max(...[...(() => { const r = document.createRange(); r.selectNodeContents(h1); return r.getClientRects(); })()].map((x) => x.right));
      while ((right() > 424 || h1.scrollWidth > h1.clientWidth) && size > 40) {
        size -= 2;
        h1.style.fontSize = `${size}px`;
      }
      const copy = document.querySelector('.copy').getBoundingClientRect();
      const kids = [...document.querySelector('.copy').children].map((e) => e.getBoundingClientRect());
      return { size, right: right(), top: Math.min(...kids.map((k) => k.top)), bottom: Math.max(...kids.map((k) => k.bottom)), copyTop: copy.top, copyBottom: copy.bottom };
    });
    if (fit.right > 426) throw new Error(`banner "${b.file}": the title runs to x=${Math.round(fit.right)}, into the art`);
    if (fit.top < fit.copyTop - 1 || fit.bottom > fit.copyBottom + 1) throw new Error(`banner "${b.file}": the text block leaves its frame (${Math.round(fit.top)}..${Math.round(fit.bottom)})`);
    const budget = Math.round(b.bytes * 1.5);
    let buf;
    for (const quality of [92, 88, 84, 80, 76]) {
      buf = await page.screenshot({ type: 'jpeg', quality, clip: { x: 0, y: 0, width: W, height: H } });
      if (buf.length <= budget) break;
    }
    if (buf.length > budget) throw new Error(`banner "${b.file}": ${buf.length} bytes exceeds the ${budget} byte budget (the previous banner x 1.5)`);
    fs.writeFileSync(path.join(OUT_DIR, b.file), buf);
    results.push({ file: b.file, bytes: buf.length, titleSize: fit.size });
  }
} finally {
  await browser.close();
}

console.log(`build-nu-banners: ${results.length} banners in ${path.relative(REPO_ROOT, OUT_DIR) || '.'} (${W}x${H}); contrast ${Object.values(contrasts).map((v) => `${v.toFixed(1)}:1`).join(', ')}`);
for (const r of results) console.log(`  ${r.file.padEnd(26)}${String(r.bytes).padStart(8)} bytes  title ${r.titleSize}px`);
