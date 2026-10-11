#!/usr/bin/env node
/**
 * Title Case gate (owner rule 2026-10-11: every page title, heading and subheading is in Title Case).
 *
 *   node scripts/check-title-case.mjs [--dist dist] [--list]
 *
 * Over every real page in dist/ (redirect stubs are skipped) it checks, against titleCase() in src/lib/titleCase.mjs:
 *   - <title> (without the " | CodersTrust" suffix), og:title and twitter:title
 *   - every h1-h6 and every <summary> (FAQ questions)
 *   - JSON-LD `headline`, and JSON-LD `name` where it mirrors the page title or the h1
 * Justified exceptions live in scripts/title-case-allow.json ({page, tag, text, reason}); an entry that no longer matches anything fails
 * the gate, so the list cannot rot. Not checked: body text, button/link labels, alt text, captions, table cells, quoted text, stat labels.
 *
 * The gate first proves itself on in-memory fixtures (a sentence-case heading MUST be flagged, a Title Case one MUST pass) and fails
 * if the rule does not behave, so a broken rule can never make the real check pass silently.
 */
import {
  Findings, decodeEntities, elements, existsSync, fatal, jsonLdBlocks, loadConfig, loadSite, metaContent, pageTitle, parseHtml, plainText, printFindings,
  readFileSync, REPO_ROOT, join, trunc,
} from './lib/dist.mjs';
import { titleCase } from '../src/lib/titleCase.mjs';

const SUFFIX = ' | CodersTrust';
const stripSuffix = (t) => (t.endsWith(SUFFIX) ? t.slice(0, -SUFFIX.length) : t);

/** Every checkable text of one parsed document: [{tag, text}] */
export function collectItems(doc) {
  const items = [];
  const title = pageTitle(doc);
  if (title) items.push({ tag: 'title', text: stripSuffix(title) });
  for (const [key, label] of [['og:title', 'og:title'], ['twitter:title', 'twitter:title']]) {
    const v = metaContent(doc, key.startsWith('og') ? { property: key } : { name: key });
    if (v) items.push({ tag: label, text: stripSuffix(decodeEntities(v).trim()) });
  }
  const h1s = [];
  for (const el of elements(doc)) {
    if (el.ns) continue;
    if (/^h[1-6]$/.test(el.tag)) {
      // the "(opens example.com)" suffix on external links is screen-reader affordance text, not part of the heading
      const text = plainText(el).replace(/ \(opens [^)]*\)$/, '');
      if (text) items.push({ tag: el.tag, text });
      if (el.tag === 'h1') h1s.push(text);
    } else if (el.tag === 'summary' && !elements(el).some((c) => /^h[1-6]$/.test(c.tag))) {
      const text = plainText(el);
      if (text) items.push({ tag: 'summary', text });
    }
  }
  const mirrors = new Set([...(title ? [stripSuffix(title).toLowerCase()] : []), ...h1s.map((h) => h.toLowerCase())]);
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    if (typeof node.headline === 'string') items.push({ tag: 'jsonld.headline', text: node.headline });
    if (typeof node.name === 'string' && mirrors.has(node.name.toLowerCase())) items.push({ tag: 'jsonld.name', text: node.name });
    Object.values(node).forEach(visit);
  };
  for (const b of jsonLdBlocks(doc)) if (b.json) visit(b.json);
  return items;
}

/** [{tag, text, expected}] for the items that are not in Title Case */
export function violations(doc) {
  return collectItems(doc)
    .map((i) => ({ ...i, expected: titleCase(i.text) }))
    .filter((i) => i.expected !== i.text);
}

/* ---------- self-test (negative and positive fixtures, in memory) ---------- */
function selfTest() {
  const page = (h) => `<!doctype html><html><head><title>${h} | CodersTrust</title></head><body><h1>${h}</h1></body></html>`;
  const bad = violations(parseHtml(page('How we train job-ready developers')));
  const good = violations(parseHtml(page('How We Train Job-Ready Developers')));
  const cases = [
    ['how we train job-ready developers', 'How We Train Job-Ready Developers'],
    ['What is the cost of a 100 hours course?', 'What Is the Cost of a 100 Hours Course?'],
    ['YouthWIDE in Bangladesh: how it works', 'YouthWIDE in Bangladesh: How It Works'],
    ['Why e-commerce needs AI and a "quoted phrase" too', 'Why E-Commerce Needs AI and a "quoted phrase" Too'],
    ['Up to date — and ready for the world', 'Up to Date — and Ready for the World'],
    ['JobReady@Campus vs JobReady@Work', 'JobReady@Campus vs JobReady@Work'],
  ];
  const problems = [];
  if (bad.length !== 2) problems.push(`sentence-case fixture should give 2 violations (title + h1), got ${bad.length}`);
  if (good.length !== 0) problems.push(`Title Case fixture should give 0 violations, got ${good.length}`);
  for (const [input, want] of cases) if (titleCase(input) !== want) problems.push(`titleCase(${JSON.stringify(input)}) = ${JSON.stringify(titleCase(input))}, wanted ${JSON.stringify(want)}`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = selfTest();
  if (problems.length) {
    console.error('check-title-case: SELF-TEST FAILED\n  ' + problems.join('\n  '));
    process.exit(1);
  }
  const cfg = loadConfig(process.argv.slice(2), ['list']);
  let site;
  try {
    site = loadSite(cfg);
  } catch (e) {
    fatal(`check-title-case: ${e.message}`);
  }
  const allowPath = join(REPO_ROOT, 'scripts/title-case-allow.json');
  const allow = existsSync(allowPath) ? JSON.parse(readFileSync(allowPath, 'utf8')).entries ?? [] : [];
  const findings = new Findings();
  for (const a of allow) if (!a.reason || !a.text || !a.tag || !a.page) findings.error('bad-allow-entry', 'scripts/title-case-allow.json', `entry needs page, tag, text and reason: ${JSON.stringify(a)}`);
  const used = new Set();
  let checked = 0;
  let pages = 0;
  for (const page of site.pages) {
    if (page.isStub) continue;
    pages++;
    const route = page.route;
    for (const item of collectItems(page.doc)) {
      checked++;
      const expected = titleCase(item.text);
      if (expected === item.text) continue;
      const hit = allow.findIndex((a) => (a.page === '*' || a.page === route) && a.tag === item.tag && a.text === item.text);
      if (hit !== -1) {
        used.add(hit);
        continue;
      }
      findings.error('not-title-case', route, `${item.tag}: ${JSON.stringify(item.text)}  expected: ${JSON.stringify(expected)}`);
    }
  }
  allow.forEach((a, i) => {
    if (!used.has(i)) findings.error('stale-allow-entry', 'scripts/title-case-allow.json', `allowlist entry matches nothing: ${a.tag} ${JSON.stringify(a.text)} on ${a.page}`);
  });
  console.log(`check-title-case: ${pages} pages, ${checked} titles/headings checked, ${used.size} allowlisted (${allow.length} entries)`);
  printFindings('check-title-case', findings, { examples: cfg.opts.list ? 100000 : 25 });
  process.exit(findings.errors.length ? 1 : 0);
}
void trunc;
