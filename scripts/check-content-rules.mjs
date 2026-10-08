#!/usr/bin/env node
/**
 * Content-rules gate (planning/10 §1 "Content rules"; decisions D1, D2, C1): the visible text of every built page must hold
 * zero hits for the terms in the rules file - confidential financial terms, program prices (per-trainee), named-program
 * comparisons, market-size figures, political slogans and named ministers outside /news/, banned hype words outside quotes.
 *
 *   node scripts/check-content-rules.mjs [--dist dist] [--rules <file>] [--out .work/qa]
 *
 * The term list is confidential, so it is not in this repository. Where it is read from, in order:
 *   1. env CONTENT_RULES_JSON   a JSON string (the Actions secret)
 *   2. --rules <file> or env CONTENT_RULES_FILE
 *   3. ../ctg-planning/content-rules.json (the private planning checkout; found by walking up from the repo, so it also
 *      works from a git worktree)
 * If none exists: for production builds (SITE_ENV=production) or with CONTENT_RULES_STRICT=1 the check FAILS CLOSED; anywhere else
 * it warns and skips (exit 0). A rules source that exists but is invalid always fails.
 *
 * Rules file format
 *   { "version": 1, "rules": [ {
 *       "id": "fin.valuation",            unique id (printed in logs; never put the term itself in an id)
 *       "category": "confidential-financial",
 *       "pattern": "\\bvaluations?\\b",    JavaScript regex source (use word boundaries and context, not bare words)
 *       "flags": "i",                      regex flags ("g" is added)            [optional, default "i"]
 *       "unless": ["gender equity"],       regexes; a hit is dropped if its surrounding text matches one  [optional]
 *       "allowRoutes": ["/news/"],         route prefixes (no base path) where the rule does not apply   [optional]
 *       "allowInQuotes": true,             ignore hits inside <blockquote> / <q>                         [optional]
 *       "severity": "error"                "error" (fails) or "warn" (reported only)                     [optional]
 *   } ],
 *     "allow": [ { "rule": "fin.revenue", "route": "/about/mentors/", "contains": "exact text of the hit", "reason": "why it is a false positive" } ] }
 * "allow" entries suppress individual, reviewed false positives (a hit is dropped when its rule id, route prefix and context
 * text all match). Suppressed hits are not hidden: they are listed in the report under "Allowed hits".
 * What is scanned: the rendered text of <body> (script, style, template and hidden subtrees removed), plus the page
 * <title>, meta/Open Graph/Twitter descriptions, and published alternative text (alt, aria-label, title, SVG title/desc).
 * Reports never contain the patterns, only rule ids, categories and the matching text found on the (public) pages.
 *
 * Output: console summary, .work/qa/content.json and content.md.
 */
import {
  Findings, accessibleTexts, describeConfig, existsSync, fatal, loadConfig, loadSite, mdTable, metaContent, join, dirname, pageTitle, readFileSync, resolve, trunc, visibleText,
  writeReports, REPO_ROOT,
} from './lib/dist.mjs';

const cfg = loadConfig(process.argv.slice(2));

/* ---- locate the rules ---- */
function findPlanningFile() {
  let dir = dirname(REPO_ROOT.replace(/\/$/, ''));
  for (let i = 0; i < 7; i++) {
    const candidate = join(dir, 'ctg-planning', 'content-rules.json');
    if (existsSync(candidate)) return candidate;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
let source = null;
let raw = null;
if (process.env.CONTENT_RULES_JSON && process.env.CONTENT_RULES_JSON.trim()) {
  source = 'env CONTENT_RULES_JSON';
  raw = process.env.CONTENT_RULES_JSON;
} else {
  const file = cfg.opts.rules ? resolve(String(cfg.opts.rules)) : process.env.CONTENT_RULES_FILE ? resolve(process.env.CONTENT_RULES_FILE) : findPlanningFile();
  if (file && existsSync(file)) {
    source = `file ${file.includes('ctg-planning') ? '../ctg-planning/content-rules.json' : file}`;
    raw = readFileSync(file, 'utf8');
  } else if (cfg.opts.rules || process.env.CONTENT_RULES_FILE) {
    fatal(`check-content-rules: rules file not found: ${cfg.opts.rules ?? process.env.CONTENT_RULES_FILE}`);
  }
}

const strict = process.env.SITE_ENV === 'production' || process.env.CONTENT_RULES_STRICT === '1';
if (raw === null) {
  const msg = 'no content rules found (env CONTENT_RULES_JSON unset and no ../ctg-planning/content-rules.json)';
  if (strict) {
    console.error(`check-content-rules: FAILED CLOSED - ${msg}; refusing to pass on ${process.env.GITHUB_REF ?? 'a strict run'}.`);
    writeReports(cfg, 'content', { check: 'content', summary: { skipped: false, failedClosed: true, errors: 1 } }, `# Content rules\n\nFAILED CLOSED: ${msg}\n`);
    process.exit(1);
  }
  console.warn(`check-content-rules: WARN ${msg}; skipping (this check fails closed for production builds).`);
  writeReports(cfg, 'content', { check: 'content', summary: { skipped: true, errors: 0 } }, `# Content rules\n\nSKIPPED: ${msg}\n`);
  process.exit(0);
}

/* ---- validate ---- */
let spec;
try {
  spec = JSON.parse(raw);
} catch (e) {
  // the term list is confidential and CI logs are public: never echo parser messages that quote the input
  const at = /position (\d+)/.exec(e.message);
  fatal(`check-content-rules: ${source} is not valid JSON${at ? ` (parse error at character ${at[1]})` : ''}`);
}
if (!spec || !Array.isArray(spec.rules) || !spec.rules.length) fatal(`check-content-rules: ${source} has no "rules" array`);
const rules = [];
const ids = new Set();
for (const [i, r] of spec.rules.entries()) {
  const where = `${source}: rules[${i}]${r?.id ? ` (${r.id})` : ''}`;
  if (!r || typeof r.id !== 'string' || !r.id) fatal(`check-content-rules: ${where} needs a string "id"`);
  if (ids.has(r.id)) fatal(`check-content-rules: duplicate rule id "${r.id}"`);
  ids.add(r.id);
  if (typeof r.category !== 'string' || !r.category) fatal(`check-content-rules: ${where} needs a string "category"`);
  if (typeof r.pattern !== 'string' || !r.pattern) fatal(`check-content-rules: ${where} needs a "pattern" string`);
  const flags = typeof r.flags === 'string' ? r.flags : 'i';
  let re;
  const unless = [];
  try {
    re = new RegExp(r.pattern, flags.includes('g') ? flags : flags + 'g');
    for (const u of r.unless ?? []) unless.push(new RegExp(u, flags.replace('g', '')));
  } catch (e) {
    // V8 puts the pattern into the message; keep only the reason so a secret term list is never printed
    fatal(`check-content-rules: ${where} has an invalid regular expression (${String(e.message).replace(/^Invalid regular expression: \/[\s\S]*\/[a-z]*: /, '')})`);
  }
  if (r.severity !== undefined && !['error', 'warn'].includes(r.severity)) fatal(`check-content-rules: ${where} severity must be "error" or "warn"`);
  rules.push({ id: r.id, category: r.category, re, unless, allowRoutes: (r.allowRoutes ?? []).map(String), allowInQuotes: r.allowInQuotes === true, severity: r.severity ?? 'error' });
}

const allow = [];
for (const [i, a] of (spec.allow ?? []).entries()) {
  if (!a || !ids.has(a.rule) || typeof a.contains !== 'string' || !a.contains || typeof a.reason !== 'string' || !a.reason) {
    fatal(`check-content-rules: ${source}: allow[${i}] needs an existing "rule" id, a "contains" text and a "reason"`);
  }
  allow.push({ rule: a.rule, route: typeof a.route === 'string' ? a.route : '', contains: a.contains, reason: a.reason, used: 0 });
}

let site;
try {
  site = loadSite(cfg);
} catch (e) {
  fatal(`check-content-rules: ${e.message}`);
}
console.log(`check-content-rules: ${rules.length} rule(s) in ${[...new Set(rules.map((r) => r.category))].length} categor(ies) from ${source}; ${site.pages.length} pages  (${describeConfig(cfg)})`);

/* ---- scan ---- */
const groups = new Map(); // key -> hit group
const allowed = new Map(); // key -> suppressed hit group
let segmentsScanned = 0;

function segmentsOf(page) {
  const { text, quotes } = visibleText(page.doc);
  const segs = [{ source: 'body', text, quotes }];
  const add = (src, t) => t && t.trim() && segs.push({ source: src, text: t.trim(), quotes: [] });
  add('title', pageTitle(page.doc));
  add('meta description', metaContent(page.doc, { name: 'description' }));
  add('og:title', metaContent(page.doc, { property: 'og:title' }));
  add('og:description', metaContent(page.doc, { property: 'og:description' }));
  add('twitter:title', metaContent(page.doc, { name: 'twitter:title' }));
  add('twitter:description', metaContent(page.doc, { name: 'twitter:description' }));
  for (const a of accessibleTexts(page.doc)) add(a.source, a.text);
  return segs;
}

for (const page of site.pages) {
  const segs = segmentsOf(page);
  for (const rule of rules) {
    if (rule.allowRoutes.some((p) => page.route.startsWith(p))) continue;
    for (const seg of segs) {
      segmentsScanned++;
      // match line by line: block boundaries (newlines in the rendered text) are hard boundaries, so a pattern can never
      // run from the end of one element into the start of the next
      let offset = 0;
      for (const line of seg.text.split('\n')) {
        const base = offset;
        offset += line.length + 1;
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(line)) !== null) {
          if (m[0] === '') {
            rule.re.lastIndex++;
            continue;
          }
          const start = m.index;
          const end = start + m[0].length;
          if (rule.allowInQuotes && seg.quotes.some(([qs, qe]) => base + start >= qs && base + end <= qe)) continue;
          const from = Math.max(0, start - 110);
          const to = Math.min(line.length, end + 110);
          const context = (from > 0 ? '…' : '') + line.slice(from, to).trim() + (to < line.length ? '…' : '');
          const wide = line.slice(Math.max(0, start - 200), Math.min(line.length, end + 200));
          if (rule.unless.some((u) => u.test(wide))) continue;
          const key = JSON.stringify([rule.id, m[0], context, seg.source]);
          const exception = allow.find((a) => a.rule === rule.id && page.route.startsWith(a.route) && wide.includes(a.contains));
          const target = exception ? allowed : groups;
          let g = target.get(key);
          if (!g) target.set(key, (g = { rule: rule.id, category: rule.category, severity: rule.severity, match: m[0], source: seg.source, context, pages: new Set(), ...(exception ? { reason: exception.reason } : {}) }));
          g.pages.add(page.route);
          if (exception) exception.used++;
        }
      }
    }
  }
}

const hits = [...groups.values()].map((g) => ({ ...g, pages: [...g.pages].sort() })).sort((a, b) => a.rule.localeCompare(b.rule) || b.pages.length - a.pages.length);
const allowedHits = [...allowed.values()].map((g) => ({ ...g, pages: [...g.pages].sort() }));
for (const a of allow) if (!a.used) console.warn(`check-content-rules: WARN allow entry for ${a.rule} ("${trunc(a.contains, 40)}") matched nothing; remove it`);
const errorHits = hits.filter((h) => h.severity === 'error');
const warnHits = hits.filter((h) => h.severity === 'warn');
const occurrences = (list) => list.reduce((n, h) => n + h.pages.length, 0);

/* ---- console ---- */
for (const h of hits) {
  const pages = h.pages.length <= 3 ? h.pages.join(', ') : `${h.pages.slice(0, 3).join(', ')} +${h.pages.length - 3} more`;
  console.log(`  ${h.severity === 'error' ? 'FAIL' : 'WARN'} ${h.rule} [${h.category}] "${trunc(h.match, 50)}" (${h.source}) on ${h.pages.length} page(s): ${pages}\n       ${trunc(h.context, 260)}`);
}
const byRule = new Map();
for (const h of hits) byRule.set(h.rule, (byRule.get(h.rule) ?? 0) + h.pages.length);
for (const h of allowedHits) console.log(`  ALLOWED ${h.rule} "${trunc(h.match, 50)}" on ${h.pages.join(', ')}: ${trunc(h.context, 140)}  [reason: ${h.reason}]`);
console.log(`check-content-rules: ${errorHits.length ? 'FAILED' : 'passed'} - ${errorHits.length} distinct error hit(s) (${occurrences(errorHits)} page occurrences), ${warnHits.length} warning hit(s); ${segmentsScanned} text segments scanned`);

/* ---- reports ---- */
let md = `# Content rules\n\nRules: ${rules.length} from ${source} · pages scanned: ${site.pages.length} · error hits: **${errorHits.length}** (${occurrences(errorHits)} page occurrences) · warning hits: ${warnHits.length}\n\n`;
md += `Rule ids by category:\n\n${mdTable(['Category', 'Rules', 'Hits (page occurrences)'], [...new Set(rules.map((r) => r.category))].map((c) => [c, rules.filter((r) => r.category === c).map((r) => r.id).join(', '), rules.filter((r) => r.category === c).reduce((n, r) => n + (byRule.get(r.id) ?? 0), 0)]))}\n`;
md += `## Allowed hits (reviewed false positives, suppressed)\n\n${mdTable(['Rule', 'Matched text', 'Pages', 'Context', 'Reason'], allowedHits.map((h) => [h.rule, h.match, h.pages.join(', '), h.context, h.reason]))}\n`;
md += `## Hits\n\n${mdTable(['Rule', 'Severity', 'Matched text', 'Source', 'Pages', 'Context'], hits.map((h) => [h.rule, h.severity, h.match, h.source, h.pages.length <= 4 ? h.pages.join(', ') : `${h.pages.slice(0, 4).join(', ')} +${h.pages.length - 4}`, h.context]))}\n`;
const f = new Findings();
for (const h of hits) f.add(h.severity === 'error' ? 'error' : 'warning', h.rule, h.pages[0], `"${h.match}" - ${h.context}`);
const paths = writeReports(cfg, 'content', { check: 'content', rulesSource: source, ruleCount: rules.length, summary: { pages: site.pages.length, errors: errorHits.length, warnings: warnHits.length, errorOccurrences: occurrences(errorHits), segmentsScanned }, rules: rules.map((r) => ({ id: r.id, category: r.category, severity: r.severity, allowRoutes: r.allowRoutes, allowInQuotes: r.allowInQuotes })), allowedHits, hits }, md);
console.log(`reports: ${paths.json}, ${paths.md}`);
process.exit(errorHits.length ? 1 : 0);
