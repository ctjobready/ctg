#!/usr/bin/env node
/**
 * JSON-LD validation over dist/ (planning/09 §2, planning/10 "SEO lint: JSON-LD parses").
 *
 * Every page (redirect stubs excluded) must carry exactly one application/ld+json block holding an @graph that
 *   - parses, has @context https://schema.org and typed, uniquely identified nodes,
 *   - has Organization and WebSite nodes and no dangling {"@id": ...} reference,
 *   - uses canonical (production) URLs only, never the staging host or a /ctg/ path,
 *   - has the node types its template needs (BreadcrumbList off Home, Article on case studies, Dataset on Outcomes, ...),
 *   - carries the key properties planning/09 §2 lists for each schema type.
 * ERRORS fail the run. WARNINGS are planning/09 key properties that are absent but not structural defects (reported, not fatal).
 * Also asserts what planning/09 forbids: AggregateRating/Review, HowTo, market-size terms on the investors page, and Course
 * Offer/timeRequired before the admissions fact set is approved (reported as a warning to confirm).
 * FAQPage question and answer text must also appear in the page's visible copy.
 *
 *   node scripts/validate-jsonld.mjs [dist]
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, entityDefinition, envConfig, isRedirectStub, productionOrigin, walkFiles } from './manifest-lib.mjs';

const dist = path.resolve(process.argv[2] ?? path.join(REPO_ROOT, 'dist'));
const { siteEnv } = envConfig();
if (!fs.existsSync(dist)) {
  console.error(`validate-jsonld: ${dist} not found (build first)`);
  process.exit(1);
}
const ORIGIN = productionOrigin();
const ENTITY = entityDefinition();
/** Organization.sameAs in the doc 02 §6 order. */
const SAME_AS = [
  'https://www.facebook.com/coderstrustbangladesh',
  'https://www.linkedin.com/company/coderstrust',
  'https://www.linkedin.com/company/coderstrust-bangladesh',
  'https://www.youtube.com/@CodersTrustBangladesh',
];

// ---------------------------------------------------------------------------------------------
// Templates (by built route) and the node types each must carry
// ---------------------------------------------------------------------------------------------
const TEMPLATES = [
  [/^\/$/, 'home', []],
  [/^\/partner-with-us\/$/, 'partner hub', []],
  [/^\/partner-with-us\/[^/]+\/$/, 'partner landing', []],
  [/^\/investors\/$/, 'investors', ['WebPage']],
  [/^\/programs\/$/, 'programs hub', []],
  [/^\/programs\/[^/]+\/$/, 'program landing', []],
  [/^\/nu-postgraduate-diploma\/$/, 'NU PGD overview', []],
  [/^\/nu-postgraduate-diploma\/[^/]+\/$/, 'NU PGD course', ['Course']],
  [/^\/our-model\/$/, 'model hub', []],
  [/^\/our-model\/talentleap\/$/, 'TalentLEAP', ['Article', 'ItemList']],
  [/^\/our-model\/jobready-platform\/$/, 'platform', ['Article']],
  [/^\/impact\/$/, 'impact hub', ['Article']],
  [/^\/impact\/outcomes-2026\/$/, 'outcomes 2026', ['Dataset']],
  [/^\/impact\/independent-evaluation\/$/, 'independent evaluation', ['ScholarlyArticle']],
  [/^\/impact\/case-studies\/$/, 'case studies listing', []],
  [/^\/impact\/case-studies\/[^/]+\/$/, 'case study', ['Article']],
  [/^\/impact\/(stories|global-reach)\/$/, 'impact listing', []],
  [/^\/about\/$/, 'about', ['AboutPage']],
  [/^\/about\/team\/$/, 'team listing', []],
  [/^\/about\/team\/[^/]+\/$/, 'team profile', ['Person']],
  [/^\/about\/(governance|mentors|recognition)\/$/, 'about section', []],
  [/^\/news\/$/, 'news listing', []],
  [/^\/news\/[^/]+\/$/, 'news article', ['NewsArticle']],
  [/^\/contact\/$/, 'contact', ['ContactPage']],
  [/^\/(careers|privacy-policy|accessibility)\/$/, 'utility', []],
  [/^\/(404|styleguide)\/$/, 'noindex utility', []],
];
const templateOf = (route) => TEMPLATES.find(([re]) => re.test(route)) ?? [null, 'other', []];

const PAGE_TYPES = new Set(['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'ProfilePage']);
/** A page may be described by its primary entity alone (BaseLayout adds a plain WebPage only when the page passes no nodes). */
const PRIMARY_TYPES = new Set(['Article', 'NewsArticle', 'Dataset', 'Course', 'ScholarlyArticle']);
const NESTED_KEYED = new Set(['ScholarlyArticle']);
const asArray = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const typesOf = (n) => asArray(n['@type']);
const has = (n, k) => n[k] !== undefined && n[k] !== null && n[k] !== '' && !(Array.isArray(n[k]) && n[k].length === 0);

// Key properties per schema type (planning/09 §2). `required` -> error, `recommended` -> warning.
const KEYS = {
  Organization: {
    required: ['name', 'url', 'logo', 'description', 'foundingDate', 'founder', 'address', 'contactPoint', 'sameAs'],
    recommended: ['areaServed', 'knowsAbout', 'award', 'location'],
  },
  WebSite: { required: ['name', 'url', 'publisher', 'inLanguage'], recommended: [] },
  BreadcrumbList: { required: ['itemListElement'], recommended: [] },
  Article: { required: ['headline', 'datePublished', 'author', 'publisher'], recommended: ['about', 'dateModified', 'citation'] },
  NewsArticle: { required: ['headline', 'datePublished', 'author', 'publisher'], recommended: ['dateModified', 'image'] },
  Person: { required: ['name', 'worksFor'], recommended: ['jobTitle', 'image', 'sameAs'] },
  Course: { required: ['name', 'description', 'provider'], recommended: ['hasCourseInstance'] },
  Dataset: { required: ['name', 'description', 'creator', 'spatialCoverage', 'variableMeasured', 'measurementTechnique'], recommended: ['temporalCoverage', 'distribution', 'license'] },
  ScholarlyArticle: { required: ['name'], recommended: ['author', 'datePublished'] },
  ItemList: { required: ['itemListElement'], recommended: [] },
  FAQPage: { required: ['mainEntity'], recommended: [] },
};
const PAGE_KEYS = { required: ['name', 'url', 'isPartOf', 'about'], recommended: ['dateModified'] };

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
const visibleText = (html) =>
  decode(
    html
      .replace(/<(script|style|template|noscript)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
const squash = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function* urlsIn(v, key = '') {
  if (typeof v === 'string') {
    if (/^https?:\/\//i.test(v)) yield [key, v];
  } else if (Array.isArray(v)) for (const x of v) yield* urlsIn(x, key);
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) yield* urlsIn(x, k);
}
function* walkNodes(v) {
  if (Array.isArray(v)) for (const x of v) yield* walkNodes(x);
  else if (v && typeof v === 'object') {
    yield v;
    for (const x of Object.values(v)) yield* walkNodes(x);
  }
}

// ---------------------------------------------------------------------------------------------
// Validate
// ---------------------------------------------------------------------------------------------
const byTemplate = new Map(); // template -> { pages, types:Set, errors:[], warnings:Map }
const allErrors = [];
const warnCounts = new Map();
let pages = 0;
let checked = 0;

for (const file of walkFiles(dist)) {
  if (!file.endsWith('.html')) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (isRedirectStub(html)) continue;
  pages++;
  const rel = path.relative(dist, file).split(path.sep).join('/');
  const route = rel === '404.html' ? '/404/' : '/' + rel.replace(/index\.html$/, '');
  const [, tname, expectTypes] = templateOf(route);
  const t = byTemplate.get(tname) ?? { pages: 0, types: new Set(), errors: 0, warnings: 0 };
  byTemplate.set(tname, t);
  t.pages++;
  const err = (m) => {
    t.errors++;
    allErrors.push(`${route}: ${m}`);
  };
  const warn = (m) => {
    t.warnings++;
    const k = m.replace(/https?:\/\/\S+/g, '<url>').replace(/@id <url> /, '@id ');
    const w = warnCounts.get(k) ?? { count: 0, templates: new Set() };
    w.count++;
    w.templates.add(tname);
    warnCounts.set(k, w);
  };

  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (blocks.length !== 1) {
    err(`expected exactly one JSON-LD block, found ${blocks.length}`);
    continue;
  }
  let doc;
  try {
    doc = JSON.parse(blocks[0]);
  } catch (e) {
    err(`JSON-LD does not parse: ${e.message}`);
    continue;
  }
  checked++;
  if (doc['@context'] !== 'https://schema.org') err(`@context is ${JSON.stringify(doc['@context'])}, expected https://schema.org`);
  if (!Array.isArray(doc['@graph']) || doc['@graph'].length === 0) {
    err('no @graph array');
    continue;
  }
  const graph = doc['@graph'];
  const ids = new Map();
  const typesSeen = new Set();
  for (const n of graph) {
    if (!n || typeof n !== 'object') {
      err('non-object node in @graph');
      continue;
    }
    if (!has(n, '@type')) err(`node without @type: ${JSON.stringify(n).slice(0, 80)}`);
    for (const ty of typesOf(n)) {
      typesSeen.add(ty);
      t.types.add(ty);
    }
    if (n['@id']) {
      const prev = ids.get(n['@id']);
      if (prev) {
        // JSON-LD merges nodes that share an @id, so a page may enrich a node (the governance page adds office
        // locations to the Organization). That is fine unless the two nodes disagree on a property.
        // Differing values of one property are unioned by the merge, so this is a warning, not an error.
        const clash = Object.keys(n).filter((k) => k in prev && JSON.stringify(prev[k]) !== JSON.stringify(n[k]));
        warn(`@id ${n['@id']} is declared twice${clash.length ? ` (also with another ${clash.join(', ')})` : ''}; JSON-LD merges them, one node would be cleaner`);
        Object.assign(prev, { ...n, ...prev });
      } else ids.set(n['@id'], n);
    }
  }
  // Nodes that share an @id are one node (see above); checks below run on the merged list.
  const merged = [...graph.filter((n) => n && typeof n === 'object' && !n['@id']), ...ids.values()];
  // Nested typed nodes count too (Person, ScholarlyArticle citations, Offer ...).
  const nested = new Set();
  for (const n of walkNodes(graph)) for (const ty of typesOf(n)) nested.add(ty);
  for (const ty of nested) t.types.add(ty);

  // Dangling references: an object with only "@id" must resolve to a node in the graph.
  for (const n of walkNodes(graph)) {
    const keys = Object.keys(n);
    if (keys.length === 1 && keys[0] === '@id' && !ids.has(n['@id'])) err(`dangling reference ${n['@id']}`);
  }
  // JSON-LD strings are plain text: an HTML entity or tag left in one would be shown literally by consumers.
  for (const n of walkNodes(graph)) {
    for (const [k, v] of Object.entries(n)) {
      if (typeof v !== 'string' || /^(@|url$|image$|logo$|item$|contentUrl$|sameAs$)/.test(k)) continue;
      if (/&(amp|lt|gt|quot|nbsp|#\d+|#x[0-9a-f]+);/i.test(v)) err(`${k} contains an HTML entity: "${v.slice(0, 60)}"`);
      else if (/<\/?[a-z][^>]*>/i.test(v)) err(`${k} contains an HTML tag: "${v.slice(0, 60)}"`);
    }
  }
  // Canonical URLs only.
  for (const [k, u] of urlsIn(graph)) {
    if (/ctjobready\.github\.io|localhost/.test(u) || /^https:\/\/coderstrust\.global\/ctg(\/|$)/.test(u)) {
      // A staging build may point asset URLs (images) at its own host; everything else, and every production URL, must be canonical.
      if (siteEnv === 'staging' && /^(image|logo|contentUrl|thumbnailUrl)$/.test(k)) warn(`${k} is on the deployment host, not the canonical origin (staging only; production resolves it): ${u}`);
      else err(`${k} uses a non-canonical URL: ${u}`);
    }
    if (/^http:\/\//i.test(u) && !/^http:\/\/schema\.org/.test(u)) err(`${k} is not https: ${u}`);
  }

  // Organization + WebSite on every page.
  const orgs = merged.filter((n) => typesOf(n).includes('Organization'));
  const sites = merged.filter((n) => typesOf(n).includes('WebSite'));
  if (orgs.length !== 1) err(`expected one Organization, found ${orgs.length}`);
  if (sites.length !== 1) err(`expected one WebSite, found ${sites.length}`);
  const org = orgs[0];
  if (org) {
    if (org.description !== ENTITY) err('Organization.description is not ID-01 verbatim');
    if (org.url !== `${ORIGIN}/`) err(`Organization.url is ${org.url}`);
    if (org['@id'] !== `${ORIGIN}/#organization`) err(`Organization @id is ${org['@id']}`);
    if (!asArray(org.contactPoint).some((c) => c && c.contactType === 'partnerships')) warn('Organization.contactPoint has no contactType "partnerships" (planning/09 §2)');
    // sameAs in the doc 02 §6 order (R10-N2): Facebook, LinkedIn (CodersTrust Global), LinkedIn (CodersTrust Bangladesh), YouTube
    if (JSON.stringify(asArray(org.sameAs)) !== JSON.stringify(SAME_AS)) err(`Organization.sameAs is ${JSON.stringify(org.sameAs)}, expected the doc 02 §6 order ${JSON.stringify(SAME_AS)}`);
  }
  // NewsArticle: the author is the Organization (planning/09 §2, R10-Mi7), not an invented individual
  for (const n of merged.filter((x) => typesOf(x).includes('NewsArticle'))) {
    const a = n.author;
    if (!org || !a || a['@id'] !== org['@id'] || Object.keys(a).some((k) => k !== '@id' && k !== '@type' && k !== 'name')) err(`NewsArticle.author is ${JSON.stringify(a)}, expected a reference to the Organization (${org?.['@id']})`);
  }
  if (sites[0] && org && sites[0].publisher?.['@id'] !== org['@id']) err('WebSite.publisher does not reference the Organization');

  // Page node and breadcrumbs.
  const pageNodes = merged.filter((n) => typesOf(n).some((ty) => PAGE_TYPES.has(ty)));
  if (pageNodes.length === 0 && !/^\/(404|styleguide)\/$/.test(route)) {
    const primary = merged.find((n) => typesOf(n).some((ty) => PRIMARY_TYPES.has(ty)));
    if (!primary) err('no WebPage-family node and no primary entity (Article, Dataset, Course, ...)');
    else {
      warn(`no WebPage node; the page is described by its ${typesOf(primary)[0]} alone (planning/09 §2 lists WebPage by template)`);
      if (route !== '/404/' && !/^\/styleguide\/$/.test(route) && primary.mainEntityOfPage !== ORIGIN + route) err(`${typesOf(primary)[0]}.mainEntityOfPage is ${primary.mainEntityOfPage}, expected ${ORIGIN + route}`);
    }
  }
  const crumbs = merged.filter((n) => typesOf(n).includes('BreadcrumbList'));
  const nestedCrumbs = pageNodes.flatMap((n) => asArray(n.breadcrumb));
  const allCrumbs = [...crumbs, ...nestedCrumbs];
  if (route !== '/' && !/^\/(404|styleguide)\/$/.test(route) && allCrumbs.length === 0) err('BreadcrumbList missing');
  for (const c of allCrumbs) {
    const items = asArray(c.itemListElement);
    items.forEach((it, i) => {
      if (it.position !== i + 1) err(`breadcrumb position ${it.position} at index ${i}`);
      if (!has(it, 'name') || !has(it, 'item')) err('breadcrumb item without name or item URL');
    });
    if (!items.length) err('empty BreadcrumbList');
  }
  for (const n of pageNodes) {
    for (const k of PAGE_KEYS.required) if (!has(n, k)) err(`${typesOf(n)[0]} missing ${k}`);
    for (const k of PAGE_KEYS.recommended) if (!has(n, k)) warn(`${typesOf(n)[0]} has no ${k} (planning/09 §2)`);
    if (n.url && route !== '/404/' && !/^\/(styleguide)\/$/.test(route)) {
      const want = ORIGIN + route;
      if (n.url !== want) err(`${typesOf(n)[0]}.url ${n.url} != canonical ${want}`);
    }
  }

  // Key properties per type: every top-level graph node, plus nested typed nodes that stand for a whole entity
  // (a cited ScholarlyArticle); nested name-only Person/Organization stubs (founder, publisher, provider) are references.
  const keyed = [...merged, ...[...walkNodes(graph)].filter((n) => typesOf(n).some((ty) => NESTED_KEYED.has(ty)))];
  for (const n of new Set(keyed)) {
    for (const ty of typesOf(n)) {
      const spec = KEYS[ty];
      if (!spec || Object.keys(n).length === 1) continue;
      for (const k of spec.required) {
        if (k === 'worksFor' && ty === 'Person' && has(n, 'deathDate')) continue; // a deceased founder has no current employer
        if (!has(n, k)) err(`${ty} missing required ${k}`);
      }
      for (const k of spec.recommended) if (!has(n, k)) warn(`${ty} has no ${k} (planning/09 §2 key property)`);
    }
  }
  // Template-specific node types.
  for (const need of expectTypes) if (!nested.has(need)) err(`template "${tname}" needs a ${need} node`);

  // FAQPage: genuine Q&A, identical to the visible copy.
  const faqs = merged.filter((n) => typesOf(n).includes('FAQPage'));
  if (faqs.length) {
    const text = squash(visibleText(html));
    for (const f of faqs) {
      for (const q of asArray(f.mainEntity)) {
        const qn = squash(q.name ?? '');
        const an = squash(q.acceptedAnswer?.text ?? '');
        if (!qn || !an) err('FAQ question without name or answer text');
        else {
          if (!text.includes(qn)) err(`FAQ question not in the visible copy: "${qn.slice(0, 70)}"`);
          if (!text.includes(an)) err(`FAQ answer not in the visible copy: "${an.slice(0, 70)}"`);
        }
      }
    }
  }

  // What planning/09 forbids.
  for (const bad of ['AggregateRating', 'Review', 'HowTo', 'Event']) if (nested.has(bad)) err(`${bad} markup is not allowed (planning/09 §2)`);
  if (route === '/investors/' && /\b(TAM|SAM|SOM)\b/.test(blocks[0])) err('market-size term (TAM/SAM/SOM) in the investors JSON-LD');
  for (const n of walkNodes(graph)) {
    if (typesOf(n).includes('Course')) {
      if (has(n, 'offers') || JSON.stringify(n).includes('"Offer"')) warn('Course carries an Offer: only after the admissions fact set is approved (planning/09 §2)');
      if (JSON.stringify(n).includes('"timeRequired"')) warn('Course carries timeRequired: only after the admissions fact set is approved (planning/09 §2)');
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------
console.log(`validate-jsonld: ${checked}/${pages} pages carry a parseable JSON-LD @graph (dist ${path.relative(REPO_ROOT, dist) || '.'})\n`);
console.log('template                  pages  errors  warnings  node types');
for (const [name, t] of [...byTemplate].sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`${name.padEnd(25)} ${String(t.pages).padStart(5)}  ${String(t.errors).padStart(6)}  ${String(t.warnings).padStart(8)}  ${[...t.types].sort().join(', ')}`);
}
if (warnCounts.size) {
  console.log('\nWarnings (planning/09 §2 key properties not emitted; not structural defects):');
  for (const [k, w] of [...warnCounts].sort((a, b) => b[1].count - a[1].count || (a[0] < b[0] ? -1 : 1))) {
    const tl = [...w.templates].sort();
    console.log(`  [${w.count}x] ${k}  (${tl.length > 5 ? `${tl.length} templates` : tl.join(', ')})`);
  }
}
if (allErrors.length) {
  console.error(`\nFAIL: ${allErrors.length} error(s)`);
  const grouped = new Map();
  for (const e of allErrors) {
    const i = e.indexOf(': ');
    const m = e.slice(i + 2).replace(/https?:\/\/\S+/g, '<url>');
    grouped.set(m, [...(grouped.get(m) ?? []), e.slice(0, i)]);
  }
  for (const [m, routes] of [...grouped].slice(0, 40)) console.error(`  [${routes.length}x] ${m}  e.g. ${routes.slice(0, 3).join(' ')}`);
  process.exit(1);
}
console.log('\nPASS: no errors');
