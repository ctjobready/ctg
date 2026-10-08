#!/usr/bin/env node
/**
 * Repository publication audit (planning/08 §4 "Repository publication rule", review round 8 C1).
 *
 * The permissions gate (scripts/check-permissions.mjs) looks at the BUILT site. This audit looks at what is COMMITTED to
 * the public repository: `git ls-files`, not dist/. A photo or name that no page renders is still public the moment it is
 * pushed, and it stays in history. Sensitive-group material (minors, refugees, third-gender trainees, slum residents) enters
 * this repository only with a cleared release.
 *
 *   node scripts/check-repo-publication.mjs [--root <repo>] [--list <file>] [--permissions <file>] [--out .work/qa]
 *
 * (a) The private never-publish list. Where it is read from, in order:
 *       1. env NEVER_PUBLISH_JSON    a JSON string (the Actions secret)
 *       2. --list <file> or env NEVER_PUBLISH_FILE
 *       3. ../ctg-planning/never-publish.json (the private planning checkout; found by walking up from the repo, so it also
 *          works from a git worktree)
 *     If none exists: on refs/heads/main (GITHUB_REF) or with NEVER_PUBLISH_STRICT=1 the audit FAILS CLOSED; anywhere else it
 *     warns and skips this part (the sensitive-asset check below still runs). A list that exists but is invalid always fails.
 *
 *       { "terms": [ { "id": "learner-a", "pattern": "<JavaScript regex source>", "flags": "i" } ],
 *         "files": [ "**\/some-photo-1.jpg", { "id": "photo-b", "glob": "src/assets/**\/some-photo-2.*" } ] }
 *
 *     Every term is tested against the PATH of every committed file (image file names included) and against the TEXT of every
 *     committed text file: Markdown, YAML, JSON, TS/Astro/JS, HTML, TOML, SVG and plain text (so alt text, captions, front
 *     matter and data files are covered). `files` are path globs (`*` within a folder, `**` across folders, no slash = any
 *     folder): a committed file that matches one fails. CSV files are not text-scanned: the migration manifest and the
 *     redirect lists enumerate the legacy WordPress site's public URLs, which cannot be rewritten without breaking the redirect.
 *     The list is confidential and CI logs are public, so the output carries only entry ids, file paths and line numbers -
 *     never a pattern and never the text that matched.
 *
 * (b) Sensitive assets that are still committed. For every row in src/data/permissions.json with sensitiveGroup true and a
 *     status other than "cleared", the audit looks for committed files that belong to the asset: image files under src/assets/
 *     or public/ with a folder or file name equal to the asset id without its kind prefix (news-, story-, team-, ...), and the
 *     story or team content file of that name. A hit means the release is missing but the material is in the repository.
 *
 * Output: console summary, .work/qa/repo-publication.json and repo-publication.md.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync as readFile, statSync } from 'node:fs';
import { Findings, REPO_ROOT, dirname, existsSync, fatal, findingsMarkdown, join, loadConfig, mdTable, resolve, writeReports } from './lib/dist.mjs';

const cfg = loadConfig(process.argv.slice(2));
const root = cfg.opts.root ? resolve(String(cfg.opts.root)) : REPO_ROOT;
const strict = process.env.GITHUB_REF === 'refs/heads/main' || process.env.NEVER_PUBLISH_STRICT === '1';
const findings = new Findings();

/* ---- committed files ---- */
const ls = spawnSync('git', ['-C', root, 'ls-files', '-z', '--cached'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (ls.error || ls.status !== 0) fatal(`check-repo-publication: cannot list the committed files of ${root} (git ls-files failed${ls.stderr ? ': ' + ls.stderr.trim().split('\n')[0] : ''})`);
// a file that is tracked but gone from the working tree is a pending deletion: nothing to scan
const tracked = ls.stdout.split('\0').filter(Boolean).filter((f) => existsSync(join(root, f)));

/* ---- (a) the private list ---- */
function findPlanningFile() {
  let dir = dirname(root.replace(/\/$/, ''));
  for (let i = 0; i < 7; i++) {
    const candidate = join(dir, 'ctg-planning', 'never-publish.json');
    if (existsSync(candidate)) return candidate;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
let source = null;
let raw = null;
if (process.env.NEVER_PUBLISH_JSON && process.env.NEVER_PUBLISH_JSON.trim()) {
  source = 'env NEVER_PUBLISH_JSON';
  raw = process.env.NEVER_PUBLISH_JSON;
} else {
  const file = cfg.opts.list ? resolve(String(cfg.opts.list)) : process.env.NEVER_PUBLISH_FILE ? resolve(process.env.NEVER_PUBLISH_FILE) : findPlanningFile();
  if (file && existsSync(file)) {
    source = `file ${file.includes('ctg-planning') ? '../ctg-planning/never-publish.json' : file}`;
    raw = readFile(file, 'utf8');
  } else if (cfg.opts.list || process.env.NEVER_PUBLISH_FILE) {
    fatal(`check-repo-publication: never-publish list not found: ${cfg.opts.list ?? process.env.NEVER_PUBLISH_FILE}`);
  }
}

const terms = [];
const fileRules = [];
let listChecked = false;
let failedClosed = false;
if (raw === null) {
  const msg = 'no never-publish list found (env NEVER_PUBLISH_JSON unset and no ../ctg-planning/never-publish.json)';
  if (strict) {
    console.error(`check-repo-publication: FAILED CLOSED - ${msg}; refusing to pass on ${process.env.GITHUB_REF ?? 'a strict run'}.`);
    findings.error('list-missing', '', msg);
    failedClosed = true;
  } else {
    console.warn(`check-repo-publication: WARN ${msg}; skipping the never-publish scan locally (it fails closed on refs/heads/main). The sensitive-asset check still runs.`);
    findings.warn('list-missing', '', `${msg}; scan skipped`);
  }
} else {
  let spec;
  try {
    spec = JSON.parse(raw);
  } catch (e) {
    // the list is confidential and CI logs are public: never echo parser messages that quote the input
    const at = /position (\d+)/.exec(e.message);
    fatal(`check-repo-publication: ${source} is not valid JSON${at ? ` (parse error at character ${at[1]})` : ''}`);
  }
  if (!spec || typeof spec !== 'object' || (!Array.isArray(spec.terms) && !Array.isArray(spec.files))) fatal(`check-repo-publication: ${source} needs a "terms" and/or a "files" array`);
  const ids = new Set();
  for (const [i, t] of (spec.terms ?? []).entries()) {
    const where = `${source}: terms[${i}]${t?.id ? ` (${t.id})` : ''}`;
    if (!t || typeof t.id !== 'string' || !t.id) fatal(`check-repo-publication: ${where} needs a string "id"`);
    if (ids.has(t.id)) fatal(`check-repo-publication: duplicate entry id "${t.id}"`);
    ids.add(t.id);
    if (typeof t.pattern !== 'string' || !t.pattern) fatal(`check-repo-publication: ${where} needs a "pattern" string`);
    const flags = (typeof t.flags === 'string' ? t.flags : 'i').replace(/[gy]/g, '');
    try {
      terms.push({ id: t.id, re: new RegExp(t.pattern, flags + 'g') });
    } catch (e) {
      // V8 puts the pattern into the message; keep only the reason
      fatal(`check-repo-publication: ${where} has an invalid regular expression (${String(e.message).replace(/^Invalid regular expression: \/[\s\S]*\/[a-z]*: /, '')})`);
    }
  }
  for (const [i, f] of (spec.files ?? []).entries()) {
    const id = typeof f === 'string' ? `files[${i}]` : f?.id || `files[${i}]`;
    const glob = typeof f === 'string' ? f : f?.glob;
    if (typeof glob !== 'string' || !glob.trim()) fatal(`check-repo-publication: ${source}: files[${i}] needs a glob string`);
    if (ids.has(id)) fatal(`check-repo-publication: duplicate entry id "${id}"`);
    ids.add(id);
    fileRules.push({ id, re: globToRegExp(glob) });
  }
  listChecked = true;
}

/** Minimal glob: `**` crosses folders, `*` and `?` stay inside one, a glob without a slash matches in any folder. Case-insensitive. */
function globToRegExp(glob) {
  let g = glob.trim().replace(/^\.\//, '');
  if (!g.includes('/')) g = '**/' + g;
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        i++;
        if (g[i + 1] === '/') {
          i++;
          re += '(?:.*/)?';
        } else re += '.*';
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$', 'i');
}

const TEXT_EXT = /\.(md|mdx|markdown|ya?ml|json|ts|tsx|astro|mjs|cjs|js|html|txt|toml|svg)$/i;
const MAX_TEXT_BYTES = 4 * 1024 * 1024;
const lineOf = (text, index) => {
  let n = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < index; i = text.indexOf('\n', i + 1)) n++;
  return n;
};

let scannedText = 0;
let scannedNames = 0;
if (terms.length || fileRules.length) {
  for (const f of tracked) {
    scannedNames++;
    for (const t of terms) {
      t.re.lastIndex = 0;
      if (t.re.test(f)) findings.error('never-publish-filename', f, `file name matches never-publish entry "${t.id}"`);
    }
    for (const r of fileRules) if (r.re.test(f)) findings.error('never-publish-file', f, `file matches never-publish file rule "${r.id}"`);
    if (!terms.length || !TEXT_EXT.test(f)) continue;
    let size = 0;
    try {
      size = statSync(join(root, f)).size;
    } catch {
      continue;
    }
    if (size > MAX_TEXT_BYTES) {
      findings.warn('file-too-large', f, `not text-scanned (${Math.round(size / 1024)} KB exceeds the ${MAX_TEXT_BYTES / 1024 / 1024} MB limit)`);
      continue;
    }
    const buf = readFile(join(root, f));
    if (buf.includes(0)) continue; // binary
    const text = buf.toString('utf8');
    scannedText++;
    for (const t of terms) {
      const lines = [];
      t.re.lastIndex = 0;
      for (const m of text.matchAll(t.re)) {
        const n = lineOf(text, m.index ?? 0);
        if (!lines.includes(n)) lines.push(n);
        if (lines.length >= 5) break;
      }
      if (lines.length) findings.error('never-publish-term', f, `text matches never-publish entry "${t.id}" at line${lines.length > 1 ? 's' : ''} ${lines.join(', ')}`);
    }
  }
}

/* ---- (b) sensitive assets whose files are still committed ---- */
const permissionsFile = cfg.opts.permissions ? resolve(String(cfg.opts.permissions)) : join(root, 'src/data/permissions.json');
let sensitiveRows = 0;
let sensitiveFiles = 0;
if (!existsSync(permissionsFile)) {
  findings.warn('permissions-missing', '', `permissions file not found (${permissionsFile}); the sensitive-asset check was skipped`);
} else {
  let rows;
  try {
    rows = JSON.parse(readFile(permissionsFile, 'utf8'));
  } catch (e) {
    fatal(`check-repo-publication: ${permissionsFile} is not valid JSON (${e.message})`);
  }
  const KIND = /^(news|story|team|mentor|partner|press|endorsement|case|careers)-/;
  const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif|svg|heic|tiff?)$/i;
  const CONTENT_DIRS = { story: 'src/content/stories/', team: 'src/content/team/' };
  const noExt = (s) => s.replace(/\.[A-Za-z0-9]+$/, '');
  const lowerTracked = tracked.map((f) => [f, f.toLowerCase()]);
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !row.sensitiveGroup || row.status === 'cleared') continue;
    sensitiveRows++;
    const id = String(row.assetId);
    const m = KIND.exec(id);
    const stem = id.slice(m ? m[0].length : 0).toLowerCase();
    if (!stem) continue;
    for (const [f, lower] of lowerTracked) {
      const segs = lower.split('/');
      const inMedia = lower.startsWith('src/assets/') || lower.startsWith('public/');
      const isImage = inMedia && IMAGE_EXT.test(lower) && (segs.slice(0, -1).includes(stem) || noExt(segs[segs.length - 1]) === stem || noExt(segs[segs.length - 1]).startsWith(stem + '-'));
      const contentDir = m ? CONTENT_DIRS[m[1]] : undefined;
      const isContent = Boolean(contentDir) && lower.startsWith(contentDir) && noExt(lower.slice(contentDir.length)) === stem;
      if (isImage || isContent) {
        sensitiveFiles++;
        findings.error('sensitive-asset-committed', f, `asset "${id}" is in a sensitive group and has no cleared release (status ${row.status}), but its file is committed`);
      }
    }
  }
}

/* ---- report ---- */
const errors = findings.errors.length;
const warnings = findings.warnings.length;
const byCode = new Map();
for (const f of findings.errors) byCode.set(f.code, (byCode.get(f.code) ?? 0) + 1);
for (const [code, n] of byCode) {
  console.error(`  FAIL ${code}: ${n}`);
  for (const f of findings.errors.filter((x) => x.code === code).slice(0, 25)) console.error(`       ${f.page ? f.page + ' - ' : ''}${f.message}`);
  if (n > 25) console.error(`       ... ${n - 25} more in the report`);
}
for (const w of findings.warnings) console.warn(`  WARN ${w.code}${w.page ? ' ' + w.page : ''}: ${w.message}`);
console.log(
  `check-repo-publication: ${errors ? 'FAILED' : 'passed'} - ${tracked.length} committed file(s), ` +
    (listChecked ? `${terms.length} term(s) and ${fileRules.length} file rule(s) from ${source} (${scannedText} text file(s) and ${scannedNames} path(s) scanned)` : failedClosed ? 'never-publish list MISSING (failed closed)' : 'never-publish scan SKIPPED (no list)') +
    `, ${sensitiveRows} sensitive-group row(s) without a release (${sensitiveFiles} committed file(s) found), ${errors} error(s), ${warnings} warning(s)`,
);

let md = `# Repository publication audit\n\nCommitted files: ${tracked.length} · never-publish list: ${listChecked ? `${terms.length} term(s), ${fileRules.length} file rule(s) (${source})` : failedClosed ? 'MISSING (failed closed)' : 'not found (skipped)'} · errors **${errors}** · warnings ${warnings}\n\n`;
md += 'Entry ids and file paths only: the list itself is confidential and is never written to a report.\n\n';
md += `## Findings\n${findingsMarkdown(findings)}`;
md += `\n## Sensitive-group rows without a release\n\n${mdTable(['Rows', 'Committed files found'], [[sensitiveRows, sensitiveFiles]])}`;
const paths = writeReports(cfg, 'repo-publication', { check: 'repo-publication', summary: { committed: tracked.length, terms: terms.length, fileRules: fileRules.length, listChecked, failedClosed, sensitiveRows, sensitiveFiles, errors, warnings }, findings: findings.items }, md);
console.log(`reports: ${paths.json}, ${paths.md}`);
process.exit(errors ? 1 : 0);
