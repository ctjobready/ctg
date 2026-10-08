#!/usr/bin/env node
// Content validator (plain Node, no dependencies).
// Usage: node scripts/validate-content.mjs
// Checks every content file under src/content for required fields, enum values, date parsing,
// referenced image files, alt text, "lorem" placeholders, empty bodies and leftover links to the
// legacy coderstrust.global domain (allowed only in `legacyUrl` fields). Also checks src/data/{press,endorsements}.ts.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${relative(ROOT, file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(ROOT, file)}: ${msg}`);

/** Minimal YAML front matter parser for the subset used here: scalars, inline JSON arrays, and a `faqs:` block. */
function parseFrontmatter(text, file) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) { err(file, 'missing front matter'); return { fm: {}, body: text }; }
  const fm = {};
  const lines = m[1].split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const kv = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (!kv) { err(file, `cannot parse front matter line: ${line}`); continue; }
    const [, key, raw] = kv;
    if (raw === '') {
      // block list of {q, a}
      const items = [];
      while (i + 1 < lines.length && /^\s+/.test(lines[i + 1])) {
        i++;
        const l = lines[i];
        const q = l.match(/^\s+- (\w+):\s*(.*)$/);
        const c = l.match(/^\s{4}(\w+):\s*(.*)$/);
        if (q) items.push({ [q[1]]: parseScalar(q[2]) });
        else if (c && items.length) items[items.length - 1][c[1]] = parseScalar(c[2]);
      }
      fm[key] = items;
    } else fm[key] = parseScalar(raw);
  }
  return { fm, body: m[2] };
}
function parseScalar(raw) {
  raw = raw.trim();
  if (raw.startsWith('"') || raw.startsWith('[')) { try { return JSON.parse(raw); } catch { return raw; } }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const isUrl = (v) => { try { new URL(v); return true; } catch { return false; } };
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

function req(file, fm, keys) {
  for (const k of keys) {
    const v = fm[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && false)) err(file, `missing required field "${k}"`);
  }
}
function oneOf(file, fm, key, allowed) {
  if (fm[key] !== undefined && !allowed.includes(fm[key])) err(file, `"${key}" must be one of ${allowed.join(', ')} (got ${JSON.stringify(fm[key])})`);
}
function imageExists(file, rel, label) {
  const p = resolve(dirname(file), rel);
  if (!existsSync(p) || !statSync(p).isFile()) err(file, `${label} image not found: ${rel}`);
}
function commonChecks(file, fm, body) {
  const all = readFileSync(file, 'utf8');
  if (/lorem/i.test(all)) err(file, 'contains "lorem"');
  // legacy domain: only in legacyUrl
  for (const [k, v] of Object.entries(fm)) {
    if (k !== 'legacyUrl' && typeof v === 'string' && /coderstrust\.global/i.test(v)) err(file, `front matter "${k}" links to coderstrust.global`);
  }
  if (/coderstrust\.global/i.test(body)) err(file, 'body links to coderstrust.global');
  // images in body
  const imgRe = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
  let m;
  while ((m = imgRe.exec(body))) {
    if (!m[1].trim()) err(file, `image without alt text: ${m[2]}`);
    if (/^https?:\/\//.test(m[2])) err(file, `remote image in body: ${m[2]}`);
    else imageExists(file, m[2], 'body');
  }
}

const counts = {};
function collection(name, dir, check, { bodyRequired = false } = {}) {
  const d = join(ROOT, 'src/content', dir);
  const files = existsSync(d) ? readdirSync(d).filter((f) => f.endsWith('.md')).sort() : [];
  counts[name] = files.length;
  const seen = new Set();
  for (const f of files) {
    const file = join(d, f);
    const { fm, body } = parseFrontmatter(readFileSync(file, 'utf8'), file);
    commonChecks(file, fm, body);
    if (bodyRequired && body.trim().length < 20) err(file, 'empty body');
    check(file, fm, body, f.replace(/\.md$/, ''));
    if (seen.has(f)) err(file, 'duplicate file');
    seen.add(f);
  }
}

// ---- news
collection('news', 'news', (file, fm, body, slug) => {
  req(file, fm, ['title', 'date', 'topic', 'excerpt', 'coverAlt', 'legacyUrl']);
  if (!Array.isArray(fm.tags)) err(file, '"tags" must be an array');
  if (!isDate(fm.date)) err(file, `invalid date ${fm.date}`);
  if (fm.updated !== undefined && !isDate(fm.updated)) err(file, `invalid updated ${fm.updated}`);
  oneOf(file, fm, 'topic', ['partnerships', 'recognition', 'programs-events', 'leadership-advocacy', 'insights']);
  if (typeof fm.excerpt === 'string' && fm.excerpt.length > 180) err(file, `excerpt is ${fm.excerpt.length} chars (max 180)`);
  if (!fm.cover) err(file, 'missing cover image'); else imageExists(file, fm.cover, 'cover');
  if (typeof fm.legacyUrl === 'string' && !fm.legacyUrl.includes(`/${slug}/`)) err(file, 'legacyUrl does not match slug');
  if (fm.draft !== undefined && typeof fm.draft !== 'boolean') err(file, '"draft" must be boolean');
}, { bodyRequired: true });

// ---- stories
collection('stories', 'stories', (file, fm) => {
  req(file, fm, ['name', 'outcome', 'pathway', 'source']);
  oneOf(file, fm, 'pathway', ['job', 'freelance', 'business', 'education', 'unknown']);
  if (typeof fm.outcome === 'string' && fm.outcome.length > 120) err(file, `outcome is ${fm.outcome.length} chars (max 120)`);
  if (fm.photo) { imageExists(file, fm.photo, 'photo'); if (!fm.photoAlt) err(file, 'photo without photoAlt'); }
  else warn(file, 'no photo');
  for (const k of ['videoUrl', 'legacyUrl']) if (fm[k] !== undefined && !isUrl(fm[k])) err(file, `${k} is not a URL`);
});

// ---- team
const GROUPS = ['founders', 'advisors', 'executive', 'management'];
const EXPECTED_ROLES = {
  'aziz-ahmad': 'Co-founder & Chairman',
  'ferdinand-kjaerulff': 'Co-founder',
  'shamsul-haque': 'CEO, CodersTrust Bangladesh',
  'faruque-hossain': 'Advisor; former Chairman, National Skills Development Authority',
  'abdul-karim': 'Advisor; former Principal Secretary, Government of Bangladesh',
  'mahdee-zaman': 'Chief Strategy Officer',
  'shafqat-ullah': 'Chief Technology Officer',
  'asad-zaman': 'Chief Growth Officer',
  'rezaul-karim-khan': 'Chief Business Officer',
  'hazrat-ali-nahid': 'Team Lead, Education',
  'fahim-sheikh': 'Marketing, Project & Training Operations',
  'zahurul-islam': 'Finance & Accounts',
  'mahzabin-akter': 'Service Delivery',
};
collection('team', 'team', (file, fm, body, slug) => {
  req(file, fm, ['name', 'slug', 'role', 'group', 'order', 'photo', 'photoAlt']);
  oneOf(file, fm, 'group', GROUPS);
  if (fm.slug !== slug) err(file, `slug "${fm.slug}" does not match file name`);
  if (typeof fm.order !== 'number') err(file, '"order" must be a number');
  if (!Array.isArray(fm.expertise)) err(file, '"expertise" must be an array');
  if (fm.photo) imageExists(file, fm.photo, 'photo');
  if (EXPECTED_ROLES[slug] && fm.role !== EXPECTED_ROLES[slug]) err(file, `role "${fm.role}" differs from the agreed title "${EXPECTED_ROLES[slug]}"`);
  const w = words(body);
  if (w < 80 || w > 180) warn(file, `bio is ${w} words (target 80-180)`);
}, { bodyRequired: true });
for (const s of Object.keys(EXPECTED_ROLES)) if (!existsSync(join(ROOT, 'src/content/team', `${s}.md`))) errors.push(`team: missing profile ${s}`);

// ---- nu-pgd
collection('nuPgd', 'nu-pgd', (file, fm, body, slug) => {
  req(file, fm, ['title', 'slug', 'kind', 'applyUrl', 'legacyUrl']);
  oneOf(file, fm, 'kind', ['overview', 'course', 'upcoming']);
  if (typeof fm.verify !== 'boolean') err(file, '"verify" must be boolean');
  if (fm.slug !== slug) err(file, 'slug does not match file name');
  if (fm.applyUrl && (!isUrl(fm.applyUrl) || (fm.applyUrl.match(/https?:\/\//g) || []).length !== 1)) err(file, 'applyUrl malformed (or contains a second URL)');
  if (fm.kind === 'course') {
    req(file, fm, ['duration', 'fee', 'mode', 'internship']);
    if (!Array.isArray(fm.modules) || fm.modules.length === 0) err(file, 'course without modules');
    if (!Array.isArray(fm.faqs) || fm.faqs.length === 0) err(file, 'course without faqs');
    else for (const f of fm.faqs) if (!f.q || !f.a) err(file, 'faq missing q or a');
    if (fm.verify !== true) err(file, 'verify must be true while fee/duration are unconfirmed');
  }
}, { bodyRequired: true });

// ---- mentors.json
{
  const file = join(ROOT, 'src/content/mentors.json');
  let list = [];
  try { list = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { err(file, `invalid JSON: ${e.message}`); }
  counts.mentors = list.length;
  const ids = new Set();
  for (const m of list) {
    for (const k of ['id', 'name', 'role', 'photo', 'photoAlt', 'legacyUrl']) if (!m[k]) err(file, `mentor ${m.id ?? '?'} missing "${k}"`);
    if (!Array.isArray(m.expertise) || !m.expertise.length) err(file, `mentor ${m.id} missing expertise`);
    if (ids.has(m.id)) err(file, `duplicate mentor id ${m.id}`); ids.add(m.id);
    if (m.photo) imageExists(file, m.photo, `mentor ${m.id} photo`);
    if (/lorem/i.test(JSON.stringify(m))) err(file, `mentor ${m.id} contains "lorem"`);
  }
}

// ---- src/data/*.ts
for (const name of ['press', 'endorsements']) {
  const file = join(ROOT, 'src/data', `${name}.ts`);
  if (!existsSync(file)) { err(file, 'missing'); continue; }
  const t = readFileSync(file, 'utf8');
  if (/lorem|Skype co-founder to speak/i.test(t.replace(/^\/\/.*$/gm, ''))) err(file, 'contains placeholder content');
  for (const m of t.matchAll(/from '(\.\.\/assets\/[^']+)'/g)) imageExists(file, m[1], 'import');
  const code = t.replace(/^\/\/.*$/gm, '');
  for (const line of code.split('\n')) if (/coderstrust\.global/i.test(line) && !/legacyUrl/.test(line)) err(file, `links to coderstrust.global outside legacyUrl: ${line.trim()}`);
  const n = (t.match(/^\s+(?:id|outlet): "/gm) || []).length;
  counts[name] = n;
  for (const m of t.matchAll(/date: "([^"]+)"/g)) if (!isDate(m[1])) err(file, `invalid date ${m[1]}`);
}
if (counts.endorsements !== 4) errors.push(`endorsements: expected 4, found ${counts.endorsements}`);
if (counts.news !== 42) errors.push(`news: expected 42 posts, found ${counts.news}`);
if (counts.team !== 13) errors.push(`team: expected 13 profiles, found ${counts.team}`);
if (counts.mentors !== 15) errors.push(`mentors: expected 15, found ${counts.mentors}`);

// ---- image size totals
function dirSize(d) {
  let n = 0;
  if (!existsSync(d)) return 0;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    n += e.isDirectory() ? dirSize(p) : statSync(p).size;
  }
  return n;
}
const imgDirs = ['news', 'stories', 'team', 'mentors', 'nu-pgd', 'endorsements', 'press'];
let total = 0;
const sizes = {};
for (const d of imgDirs) { sizes[d] = dirSize(join(ROOT, 'src/assets/images', d)); total += sizes[d]; }

console.log('Collection counts:');
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(14)} ${v}`);
console.log('Image sizes (MB):');
for (const d of imgDirs) console.log(`  ${d.padEnd(14)} ${(sizes[d] / 1048576).toFixed(2)}`);
console.log(`  ${'TOTAL'.padEnd(14)} ${(total / 1048576).toFixed(2)}`);
if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); for (const w of warnings) console.log('  WARN ' + w); }
if (errors.length) { console.log(`\n${errors.length} error(s):`); for (const e of errors) console.log('  ERROR ' + e); process.exit(1); }
console.log('\nContent validation passed.');
