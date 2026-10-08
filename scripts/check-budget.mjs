#!/usr/bin/env node
/**
 * JS budget and CSV small-cell suppression (planning/10 §1; the budget is stated once in planning/08 §5).
 *
 *   node scripts/check-budget.mjs [--dist dist] [--out .work/qa]
 *
 * JS budget, measured per page in gzip level 9 (1 KB = 1024 bytes):
 *   page total  = every inline <script> (module or classic; JSON-LD and other data blocks are not JS) + every external
 *                 <script src> and modulepreload, plus all files they import (static import/export-from and literal
 *                 dynamic import()), each shared file counted once per page
 *   warn  if a page total is above 20 KB (target) · FAIL above 40 KB
 *   FAIL  if any single interaction script is above 15 KB: measured as the closure of one <script> entry (the inline
 *         block or the src file plus everything it imports), which is the stricter reading of "single script";
 *         the largest individual file is reported alongside
 * CSV small-cell suppression: every published CSV (public/data/*.csv and the copy in dist/) is parsed; no count/n cell
 * may be below 10 (columns n, base_n, *_n, count, …; value_type=count rows; "n = 7" text), rows marked suppressed must
 * hold no value, and the cell count implied by a percentage and its base_n (round(value/100 x base_n)) must be at least 10.
 * Rows that give a percentage without a base cannot be verified from the file; they are reported as a warning.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import {
  Findings, classifyUrl, describeConfig, elements, fatal, findingsMarkdown, gzipSize, join, kb, loadConfig, loadSite, mdTable, printFindings, publicPath,
  resolveInDist, snippet, textContent, trunc, writeReports, REPO_ROOT,
} from './lib/dist.mjs';

const WARN_TOTAL = 20 * 1024;
const FAIL_TOTAL = 40 * 1024;
const FAIL_SINGLE = 15 * 1024;
const MIN_CELL = 10;

const cfg = loadConfig(process.argv.slice(2));
let site;
try {
  site = loadSite(cfg);
} catch (e) {
  fatal(`check-budget: ${e.message}`);
}
const findings = new Findings();
console.log(`check-budget: ${site.pages.length} pages  (${describeConfig(cfg)})`);

/* ------------------------------------------------------------------------------------------- */
/* JS                                                                                           */
/* ------------------------------------------------------------------------------------------- */

const JS_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript', 'text/jscript']);
const IMPORT_RES = [
  /\bimport\s*(?:[\w$*{}\s,]+?\s*from\s*)?["']([^"'\n]+)["']/g,
  /\bexport\s*(?:\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*["']([^"'\n]+)["']/g,
  /\bimport\(\s*["']([^"'\n]+)["']\s*\)/g,
];

const fileInfo = new Map(); // rel -> {rel, bytes, gz, imports:[rel]}
function loadJsFile(rel) {
  if (fileInfo.has(rel)) return fileInfo.get(rel);
  const text = readFileSync(join(cfg.dist, rel), 'utf8');
  const info = { rel, bytes: Buffer.byteLength(text), gz: gzipSize(Buffer.from(text)), imports: [], unresolved: [] };
  fileInfo.set(rel, info);
  resolveImports(text, `${cfg.base}/${rel}`, info);
  return info;
}

/** Fill info.imports (dist-relative files) from import specifiers found in `text`; `fromPublic` is the public path of the importer. */
function resolveImports(text, fromPublic, info) {
  const seen = new Set();
  for (const re of IMPORT_RES) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const spec = m[1];
      if (seen.has(spec)) continue;
      seen.add(spec);
      if (!/^(\.{1,2}\/|\/)/.test(spec)) {
        if (/^https?:/i.test(spec)) info.unresolved.push(spec);
        continue; // bare specifier or URL: not part of the site build
      }
      const c = classifyUrl(cfg, spec, fromPublic);
      if (c.kind !== 'root-relative' && c.kind !== 'relative') continue;
      const res = resolveInDist(site, c.pathname, { base: true });
      if (res.status === 'file') info.imports.push(res.rel);
      else info.unresolved.push(spec);
    }
  }
}

/** Closure of a set of root files: every file reachable through imports, each once. */
function closure(roots) {
  const out = new Set();
  const stack = [...roots];
  while (stack.length) {
    const rel = stack.pop();
    if (out.has(rel)) continue;
    out.add(rel);
    stack.push(...loadJsFile(rel).imports);
  }
  return out;
}

const pageResults = [];
const referenced = new Set();
for (const page of site.pages) {
  const from = publicPath(cfg, page.route);
  const entries = []; // {kind, name, gz (own), files:Set, inlineGz}
  const inline = [];
  for (const s of elements(page.doc, 'script')) {
    const type = (s.attrs.type ?? '').toLowerCase().split(';')[0].trim();
    if (!JS_TYPES.has(type)) continue;
    if (s.attrs.src !== undefined) {
      const c = classifyUrl(cfg, s.attrs.src, from);
      if (c.kind === 'external' || c.kind === 'own-origin' || c.kind === 'protocol-relative') {
        findings.error('external-script', page.rel, `script src ${trunc(s.attrs.src, 120)} is loaded from another origin (no third-party scripts, doc 08 §9)`, { evidence: snippet(page.source, s) });
        continue;
      }
      const res = c.pathname ? resolveInDist(site, c.pathname, { base: true }) : { status: 'missing' };
      if (res.status !== 'file') {
        findings.error('script-not-found', page.rel, `script src ${trunc(s.attrs.src, 120)} does not resolve to a file in dist`, { evidence: snippet(page.source, s) });
        continue;
      }
      const files = closure([res.rel]);
      entries.push({ kind: 'src', name: res.rel, files });
    } else {
      const code = textContent(s);
      if (!code.trim()) continue;
      const info = { imports: [], unresolved: [] };
      resolveImports(code, from, info);
      const gz = gzipSize(Buffer.from(code));
      inline.push({ gz, bytes: Buffer.byteLength(code), preview: trunc(code, 60) });
      entries.push({ kind: 'inline', name: `inline #${inline.length} (${trunc(code, 40)})`, files: closure(info.imports), ownGz: gz });
    }
  }
  for (const l of elements(page.doc, 'link')) {
    if ((l.attrs.rel ?? '').toLowerCase().split(/\s+/).includes('modulepreload') && l.attrs.href) {
      const c = classifyUrl(cfg, l.attrs.href, from);
      if (c.pathname) {
        const res = resolveInDist(site, c.pathname, { base: true });
        if (res.status === 'file') entries.push({ kind: 'modulepreload', name: res.rel, files: closure([res.rel]) });
      }
    }
  }
  // inline event-handler attributes are JavaScript too
  let handlerBytes = 0;
  let handlers = 0;
  const visit = (n) => {
    for (const c of n.children ?? []) {
      if (c.type !== 'element') continue;
      if (!c.ns) for (const [k, v] of c.attrList) if (/^on[a-z]+$/i.test(k)) { handlerBytes += Buffer.byteLength(v); handlers++; }
      visit(c);
    }
  };
  visit(page.doc);
  if (handlers) findings.warn('inline-event-handler', page.rel, `${handlers} inline on* event-handler attribute(s) (${handlerBytes} bytes of inline JS)`);

  const allFiles = new Set();
  for (const e of entries) for (const f of e.files) allFiles.add(f);
  for (const f of allFiles) referenced.add(f);
  const inlineGz = inline.reduce((a, i) => a + i.gz, 0) + (handlers ? gzipSize(Buffer.alloc(handlerBytes, 'a')) : 0);
  const filesGz = [...allFiles].reduce((a, f) => a + loadJsFile(f).gz, 0);
  const total = inlineGz + filesGz;
  const entrySizes = entries.map((e) => ({
    kind: e.kind,
    name: e.name,
    closureGz: (e.ownGz ?? 0) + [...e.files].reduce((a, f) => a + loadJsFile(f).gz, 0),
    files: [...e.files],
  }));
  const biggestEntry = entrySizes.reduce((m, e) => (e.closureGz > (m?.closureGz ?? -1) ? e : m), null);
  const biggestFile = [...allFiles].reduce((m, f) => (loadJsFile(f).gz > (m?.gz ?? -1) ? loadJsFile(f) : m), null);
  pageResults.push({ page: page.rel, route: page.route, inlineScripts: inline.length, inlineGz, files: [...allFiles].sort(), filesGz, total, biggestEntry, biggestFile: biggestFile && { rel: biggestFile.rel, gz: biggestFile.gz } });

  if (total > FAIL_TOTAL) findings.error('js-page-total', page.rel, `page JS is ${kb(total)} gzip (limit ${kb(FAIL_TOTAL)})`, { evidence: `inline ${kb(inlineGz)} + ${allFiles.size} file(s) ${kb(filesGz)}` });
  else if (total > WARN_TOTAL) findings.warn('js-page-total', page.rel, `page JS is ${kb(total)} gzip (target ${kb(WARN_TOTAL)}, limit ${kb(FAIL_TOTAL)})`, { evidence: `inline ${kb(inlineGz)} + ${allFiles.size} file(s) ${kb(filesGz)}` });
  for (const e of entrySizes) {
    if (e.closureGz > FAIL_SINGLE) findings.error('js-single-script', page.rel, `interaction script ${e.name} is ${kb(e.closureGz)} gzip with its imports (limit ${kb(FAIL_SINGLE)})`, { evidence: e.files.join(', ') });
  }
}
for (const [rel, info] of fileInfo) {
  for (const u of info.unresolved) findings.warn('js-import-unresolved', rel, `import "${trunc(u, 100)}" does not resolve to a file in dist (or is a URL)`);
}
const unreferenced = site.relFiles.filter((f) => f.endsWith('.js') && !referenced.has(f));
for (const f of unreferenced) findings.info('js-unreferenced', f, 'JS file not loaded by any page');

/* ------------------------------------------------------------------------------------------- */
/* CSV                                                                                          */
/* ------------------------------------------------------------------------------------------- */

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const COUNT_COLUMN = /^(n|base_n|.+_n|n_.+|count|counts|.+_count|numerator|denominator|respondents|cell_n|sample_size|unweighted_n|base)$/i;
const csvFiles = [];
const publicData = join(REPO_ROOT, 'public/data');
if (existsSync(publicData)) for (const f of readdirSync(publicData)) if (f.toLowerCase().endsWith('.csv')) csvFiles.push({ label: `public/data/${f}`, file: join(publicData, f) });
for (const rel of site.relFiles.filter((f) => f.toLowerCase().endsWith('.csv'))) csvFiles.push({ label: `dist/${rel}`, file: join(cfg.dist, rel) });

const csvReports = [];
for (const { label, file } of csvFiles) {
  const text = readFileSync(file, 'utf8');
  const rows = parseCsv(text);
  const report = { file: label, rows: Math.max(0, rows.length - 1), countColumns: [], checkedCells: 0, suppressedRows: 0, rowsWithoutBase: 0 };
  csvReports.push(report);
  if (rows.length < 2) {
    findings.warn('csv-empty', label, 'CSV has no data rows');
    continue;
  }
  const header = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(header.map((h, i) => [h.toLowerCase(), i]));
  const countCols = header.map((h, i) => (COUNT_COLUMN.test(h) ? i : -1)).filter((i) => i >= 0);
  report.countColumns = countCols.map((i) => header[i]);
  const valueCol = idx.value;
  const typeCol = idx.value_type;
  const statusCol = idx.status;
  const baseCol = idx.base_n ?? (countCols.length ? countCols[0] : undefined);
  const noBase = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length !== header.length) findings.error('csv-ragged-row', label, `row ${r + 1} has ${row.length} cells, header has ${header.length}`, { evidence: trunc(row.join(','), 160) });
    const id = `row ${r + 1} (${trunc(row.slice(0, 3).join(' | '), 90)})`;
    const status = (statusCol !== undefined ? row[statusCol] ?? '' : '').toLowerCase();
    const value = valueCol !== undefined ? (row[valueCol] ?? '').trim() : '';
    const suppressed = /suppress/.test(status);
    if (suppressed) {
      report.suppressedRows++;
      if (value !== '') findings.error('csv-suppressed-row-has-value', label, `${id} is marked suppressed but still carries value "${value}"`);
      for (const ci of countCols) if ((row[ci] ?? '').trim() !== '') findings.error('csv-suppressed-row-has-count', label, `${id} is marked suppressed but still carries ${header[ci]}="${row[ci]}"`);
    } else if (value === '') {
      findings.warn('csv-empty-value', label, `${id} has no value and is not marked suppressed`);
    }
    for (const ci of countCols) {
      const raw = (row[ci] ?? '').trim().replace(/,/g, '');
      if (raw === '') continue;
      report.checkedCells++;
      if (!/^\d+$/.test(raw)) continue;
      if (Number(raw) < MIN_CELL) findings.error('csv-small-cell', label, `${id}: ${header[ci]} = ${raw} is below ${MIN_CELL}`);
    }
    if (typeCol !== undefined && /^(count|number|n)$/i.test((row[typeCol] ?? '').trim()) && /^\d+$/.test(value.replace(/,/g, '')) && Number(value.replace(/,/g, '')) < MIN_CELL) {
      findings.error('csv-small-cell', label, `${id}: count value ${value} is below ${MIN_CELL}`);
    }
    for (let ci = 0; ci < row.length; ci++) {
      for (const m of (row[ci] ?? '').matchAll(/\bn\s*=\s*(\d+)\b/gi)) if (Number(m[1]) < MIN_CELL) findings.error('csv-small-cell', label, `${id}: text "${m[0]}" in ${header[ci] ?? 'column ' + (ci + 1)} is below ${MIN_CELL}`);
    }
    if (!suppressed && typeCol !== undefined && /^percent/i.test((row[typeCol] ?? '').trim()) && value !== '') {
      const base = baseCol !== undefined ? Number((row[baseCol] ?? '').replace(/,/g, '')) : NaN;
      const pct = Number(value);
      if (Number.isFinite(base) && base > 0 && Number.isFinite(pct)) {
        const implied = Math.round((pct / 100) * base);
        if (implied < MIN_CELL) findings.error('csv-derived-small-cell', label, `${id}: ${pct}% of base ${base} implies about ${implied} respondents (below ${MIN_CELL}); suppress it`);
      } else {
        report.rowsWithoutBase++;
        noBase.push(`${(row[2] ?? '').trim() || row[1]} ${pct}%`);
      }
    }
  }
  if (report.rowsWithoutBase) {
    findings.warn(
      'csv-base-not-stated',
      label,
      `${report.rowsWithoutBase} percentage row(s) carry no base_n, so the n >= ${MIN_CELL} rule cannot be verified from the file (smallest shares: ${noBase
        .map((s) => [parseFloat(s.slice(s.lastIndexOf(' ') + 1)), s])
        .sort((a, b) => a[0] - b[0])
        .slice(0, 5)
        .map((x) => x[1])
        .join('; ')})`,
    );
  }
}
if (!csvFiles.length) findings.info('csv-none', 'public/data', 'no CSV files published');
const publicCopies = csvFiles.filter((c) => c.label.startsWith('public/data/'));
for (const p of publicCopies) {
  const d = csvFiles.find((c) => c.label === `dist/data/${p.label.split('/').pop()}`);
  if (!d) findings.warn('csv-not-in-dist', p.label, 'CSV exists in public/data but not in dist/ (stale build?)');
  else if (readFileSync(p.file, 'utf8') !== readFileSync(d.file, 'utf8')) findings.error('csv-dist-differs', p.label, 'dist copy differs from public/data (stale build?)');
}

/* ------------------------------------------------------------------------------------------- */
/* output                                                                                       */
/* ------------------------------------------------------------------------------------------- */

const totals = pageResults.map((p) => p.total).sort((a, b) => a - b);
const median = totals[Math.floor(totals.length / 2)] ?? 0;
const max = pageResults.reduce((m, p) => (p.total > (m?.total ?? -1) ? p : m), null);
const uniqueFiles = [...fileInfo.values()].sort((a, b) => b.gz - a.gz);
const errors = findings.errors.length;
const warnings = findings.warnings.length;

printFindings('check-budget', findings, { examples: 4 });
console.log(
  `  JS per page (gzip): min ${kb(totals[0] ?? 0)}, median ${kb(median)}, max ${kb(totals[totals.length - 1] ?? 0)}${max ? ` (${max.route})` : ''}; ` +
    `${uniqueFiles.length} distinct JS file(s), largest ${uniqueFiles[0] ? `${uniqueFiles[0].rel.split('/').pop()} ${kb(uniqueFiles[0].gz)}` : 'n/a'}`,
);
for (const r of csvReports) console.log(`  CSV ${r.file}: ${r.rows} row(s), count columns [${r.countColumns.join(', ') || 'none'}], ${r.checkedCells} count cell(s) checked, ${r.suppressedRows} suppressed row(s), ${r.rowsWithoutBase} percentage row(s) without base`);

let md = `# JS budget and CSV small-cell suppression\n\nPages: ${site.pages.length} · errors **${errors}** · warnings ${warnings}\n\n`;
md += `Budget (gzip-9, 1 KB = 1024 B): page total target ${kb(WARN_TOTAL)} (warn), fail above ${kb(FAIL_TOTAL)}; single interaction script (entry closure) fail above ${kb(FAIL_SINGLE)}.\n\n`;
md += `JS per page: min ${kb(totals[0] ?? 0)} · median ${kb(median)} · max ${kb(totals[totals.length - 1] ?? 0)}${max ? ` (${max.route})` : ''}\n\n`;
md += `## Largest pages\n\n${mdTable(['Page', 'Inline scripts', 'Inline gz', 'Files', 'Files gz', 'Total gz', 'Largest entry closure'], [...pageResults].sort((a, b) => b.total - a.total).slice(0, 15).map((p) => [p.route, p.inlineScripts, kb(p.inlineGz), p.files.length, kb(p.filesGz), kb(p.total), p.biggestEntry ? `${trunc(p.biggestEntry.name, 50)} ${kb(p.biggestEntry.closureGz)}` : '-']))}\n`;
md += `## JS files\n\n${mdTable(['File', 'Raw', 'Gzip', 'Imports'], uniqueFiles.map((f) => [f.rel, `${(f.bytes / 1024).toFixed(1)} KB`, kb(f.gz), f.imports.map((i) => i.split('/').pop()).join(', ')]))}\n`;
md += `## CSV\n\n${mdTable(['File', 'Rows', 'Count columns', 'Count cells checked', 'Suppressed rows', 'Percent rows without base'], csvReports.map((r) => [r.file, r.rows, r.countColumns.join(', ') || '-', r.checkedCells, r.suppressedRows, r.rowsWithoutBase]))}\n`;
md += `## Findings\n${findingsMarkdown(findings)}`;
const paths = writeReports(cfg, 'budget', { check: 'budget', limits: { warnTotal: WARN_TOTAL, failTotal: FAIL_TOTAL, failSingle: FAIL_SINGLE, minCell: MIN_CELL }, summary: { pages: site.pages.length, errors, warnings, jsMinGz: totals[0] ?? 0, jsMedianGz: median, jsMaxGz: totals[totals.length - 1] ?? 0 }, pages: pageResults, jsFiles: uniqueFiles, csv: csvReports, findings: findings.items }, md);
console.log(`reports: ${paths.json}, ${paths.md}`);

process.exit(errors ? 1 : 0);
