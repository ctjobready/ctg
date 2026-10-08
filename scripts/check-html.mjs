#!/usr/bin/env node
/**
 * HTML validity gate (planning/10 §1): html-validate over every dist/**\/*.html, 0 errors required.
 *
 *   node scripts/check-html.mjs [--dist dist] [--out .work/qa] [--config .htmlvalidate.json]
 *
 * Configuration lives in .htmlvalidate.json (preset html-validate:recommended). Every rule relaxed there must have a
 * rationale in RELAXED below; the check fails if a relaxation has none, so the config cannot quietly loosen:
 *   no-inline-style     off: style="" attributes are intentional (component CSS custom properties; the CSP in
 *                       src/lib/site.ts allows style-src 'unsafe-inline' for exactly this - planning/08 §9).
 *   no-redundant-role   role="list" excluded only: it restores list semantics for VoiceOver/WebKit on lists styled with
 *                       list-style:none (used site-wide, doc 10 §3 requires a VoiceOver pass). Any other redundant role
 *                       (role="navigation" on <nav>, role="button" on <button> ...) is still an error.
 *   prefer-native-element  role="list" excluded only, same reason (it is used on <ol> as well as <ul>). role="region", role="button"
 *                       and every other role are still checked.
 * Everything else in the recommended preset is enforced, including the accessibility-flavoured rules.
 *
 * Output: console summary, .work/qa/html.json and html.md (errors grouped by rule, then by Astro page template).
 */
import { HtmlValidate, StaticConfigLoader, version as hvVersion } from 'html-validate';
import {
  REPO_ROOT, Findings, describeConfig, existsSync, fatal, join, loadConfig, loadSite, makeTemplateResolver, mdTable, readFileSync, trunc, writeReports,
} from './lib/dist.mjs';

const RELAXED = {
  'no-inline-style': 'style attributes are intentional (component CSS custom properties); the CSP allows style-src \'unsafe-inline\' by design (doc 08 §9)',
  'no-redundant-role': 'only role="list" is excluded: it restores list semantics for VoiceOver/WebKit on list-style:none lists; all other redundant roles still fail',
  'prefer-native-element': 'only role="list" is excluded (same VoiceOver/WebKit workaround, used on <ol> too); role="region", role="button" and all other roles still fail',
};

const cfg = loadConfig(process.argv.slice(2));
const configPath = cfg.opts.config ? String(cfg.opts.config) : join(REPO_ROOT, '.htmlvalidate.json');
if (!existsSync(configPath)) fatal(`check-html: config not found: ${configPath}`);
const configData = JSON.parse(readFileSync(configPath, 'utf8'));

let site;
try {
  site = loadSite(cfg, { parse: false });
} catch (e) {
  fatal(`check-html: ${e.message}`);
}
if (!site.pages.length) fatal(`check-html: no HTML files in ${cfg.dist}`);

console.log(`check-html: html-validate over ${site.pages.length} pages  (${describeConfig(cfg)})`);

/* every relaxed rule needs a rationale (and every rationale should still be live) */
const findings = new Findings();
const relaxedInConfig = [];
for (const [rule, setting] of Object.entries(configData.rules ?? {})) {
  const sev = Array.isArray(setting) ? setting[0] : setting;
  const hasOptions = Array.isArray(setting) && setting.length > 1;
  const off = sev === 'off' || sev === 0;
  const warn = sev === 'warn' || sev === 1;
  if (off || warn || hasOptions) {
    relaxedInConfig.push({ rule, setting, rationale: RELAXED[rule] ?? null });
    if (!RELAXED[rule]) findings.error('relaxed-rule-without-rationale', '.htmlvalidate.json', `rule "${rule}" is relaxed in the config but has no rationale in scripts/check-html.mjs`);
  }
}
for (const rule of Object.keys(RELAXED)) if (!(rule in (configData.rules ?? {}))) findings.warn('stale-rationale', '.htmlvalidate.json', `rationale given for "${rule}" but the rule is not relaxed in the config`);

const hv = new HtmlValidate(new StaticConfigLoader(configData));
const templateOf = makeTemplateResolver(REPO_ROOT);

const messages = [];
for (const page of site.pages) {
  const report = await hv.validateFile(page.file);
  const src = readFileSync(page.file, 'utf8');
  const lines = src.split('\n');
  for (const res of report.results) {
    for (const m of res.messages) {
      const lineText = lines[m.line - 1] ?? '';
      const evidence = trunc(lineText.slice(Math.max(0, m.column - 1), m.column - 1 + 160), 160);
      messages.push({
        rule: m.ruleId ?? '(parser)',
        severity: m.severity === 2 ? 'error' : 'warning',
        page: '/' + page.rel,
        route: page.route,
        template: templateOf(page.route),
        line: m.line,
        column: m.column,
        selector: m.selector ?? null,
        message: m.message,
        evidence,
      });
    }
  }
}

/* group: rule -> template -> {count, pages, example} */
const byRule = new Map();
for (const m of messages) {
  let r = byRule.get(m.rule);
  if (!r) byRule.set(m.rule, (r = { rule: m.rule, severity: m.severity, count: 0, templates: new Map() }));
  r.count++;
  let t = r.templates.get(m.template);
  if (!t) r.templates.set(m.template, (t = { template: m.template, count: 0, pages: new Set(), examples: [] }));
  t.count++;
  t.pages.add(m.page);
  if (t.examples.length < 3) t.examples.push(m);
  findings.add(m.severity, m.rule, m.page, m.message, { evidence: m.selector ? `${m.selector}  ${m.evidence}` : m.evidence, template: m.template });
}

const errors = messages.filter((m) => m.severity === 'error').length;
const warnings = messages.filter((m) => m.severity === 'warning').length;
const failures = findings.errors.length;
const ruleList = [...byRule.values()].sort((a, b) => b.count - a.count);

/* ---- console ---- */
for (const r of ruleList) {
  console.log(`  ${r.severity === 'error' ? 'FAIL' : 'WARN'} ${r.rule}: ${r.count} message(s) on ${new Set([...r.templates.values()].flatMap((t) => [...t.pages])).size} page(s)`);
  for (const t of [...r.templates.values()].sort((a, b) => b.count - a.count).slice(0, 6)) {
    const ex = t.examples[0];
    console.log(`       ${t.template}: ${t.count} on ${t.pages.size} page(s)  e.g. ${ex.page} — ${ex.message}${ex.selector ? '  ⟨' + trunc(ex.selector, 90) + '⟩' : ''}`);
  }
  if (r.templates.size > 6) console.log(`       … ${r.templates.size - 6} more template(s)`);
}
for (const f of findings.items.filter((f) => f.page === '.htmlvalidate.json')) console.log(`  ${f.severity === 'error' ? 'FAIL' : 'WARN'} ${f.code}: ${f.message}`);
console.log(`check-html: ${failures ? 'FAILED' : 'passed'} — ${errors} error(s), ${warnings} warning(s) across ${site.pages.length} pages; relaxed rules: ${relaxedInConfig.map((r) => r.rule).join(', ') || 'none'}`);

/* ---- reports ---- */
const jsonRules = ruleList.map((r) => ({
  rule: r.rule,
  severity: r.severity,
  count: r.count,
  templates: [...r.templates.values()]
    .sort((a, b) => b.count - a.count)
    .map((t) => ({ template: t.template, count: t.count, pages: [...t.pages].sort(), examples: t.examples })),
}));
let md = `# HTML validity (html-validate ${hvVersion})\n\n`;
md += `Pages: ${site.pages.length} · errors: **${errors}** · warnings: ${warnings} · relaxed rules: ${relaxedInConfig.map((r) => `\`${r.rule}\``).join(', ') || 'none'}\n\n`;
md += `## Relaxed rules\n\n${mdTable(['Rule', 'Setting', 'Rationale'], relaxedInConfig.map((r) => [r.rule, JSON.stringify(r.setting), r.rationale ?? '(MISSING)']))}\n`;
md += `## Errors and warnings by rule and template\n`;
for (const r of jsonRules) {
  md += `\n### \`${r.rule}\` (${r.severity}) — ${r.count}\n\n`;
  md += mdTable(
    ['Template', 'Count', 'Pages', 'Example page', 'Element (selector)', 'Message'],
    r.templates.map((t) => [t.template, t.count, t.pages.length, t.examples[0].page, t.examples[0].selector ?? '', t.examples[0].message]),
  );
}
const paths = writeReports(cfg, 'html', { check: 'html', summary: { pages: site.pages.length, errors, warnings, failures }, relaxedRules: relaxedInConfig, rules: jsonRules, messages }, md);
console.log(`reports: ${paths.json}, ${paths.md}`);
process.exit(failures || errors ? 1 : 0);
