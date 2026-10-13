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
 *   - UI labels (owner rule 2026-10-13, WP12: every menu item, button label, tag label, table heading and other UI label):
 *       menu    <a> and <button> inside <header> (mobile drawer and utility links included), <nav>, <footer> or the On This Page
 *               list; [aria-current] items (breadcrumb trail); the visible title of a mega-menu item (its description is excluded)
 *       skip-link  a.skip-link;  feature-title  .mega__feature-title (featured panel titles)
 *       button  every <button>;  btn  any element with a .btn / .button class (button-styled links included)
 *       cta-link  a.link that carries an icon (a call-to-action link; a link inside running prose is left as written)
 *       tag     any element with a .tag, .chip, .badge or .eyebrow class (BEM variants included, e.g. .hero__eyebrow)
 *       th, caption (a table caption, also the screen-reader caption of a chart), label, legend, tab ([role=tab])
 *       figcaption  only a chart title (figcaption with a __title class, e.g. .bars__title); photo captions are sentences
 *       ui-label    any element with a …__label class (kickers, callout and category labels), except stat and fact labels
 *       ui-title    any non-heading element with a …__title class (card and partner-strip titles)
 *     The visible text is taken: without sr-only text, aria-hidden or hidden subtrees, SVG icons, and the "(opens …)" suffix.
 *     Full sentences are body text and are not checked: text ending in "." "?" or "!", or containing "; ".
 * Justified exceptions live in scripts/title-case-allow.json ({page, tag, text, reason}); an entry that no longer matches anything fails
 * the gate, so the list cannot rot. Not checked: body text, link text inside running prose, alt text, photo captions (sentences), table cells
 * that are not headings, quoted text, stat labels, mega-menu descriptions.
 *
 * The gate first proves itself on in-memory fixtures (a sentence-case heading or label MUST be flagged, a Title Case one MUST pass;
 * sentences, prose links and descriptions MUST pass) and fails if the rule does not behave, so a broken rule can never make the real check
 * pass silently.
 */
import {
  Findings, decodeEntities, elements, existsSync, fatal, isHiddenElement, jsonLdBlocks, loadConfig, loadSite, metaContent, pageTitle, parseHtml, plainText,
  printFindings, readFileSync, REPO_ROOT, join, trunc,
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
  items.push(...collectLabels(doc));
  return items;
}

/* ---------- UI labels (WP12) ---------- */

/** Classes whose text is not part of a label: screen-reader text and the mega-menu description. */
const HIDDEN_CLASSES = new Set(['sr-only', 'visually-hidden', 'mega__desc']);
/** Never rendered as text. */
const NON_LABEL_TAGS = new Set(['script', 'style', 'template', 'noscript', 'svg']);
/** Ancestors whose links and buttons are menus (site header with the mobile drawer, primary and breadcrumb navs, the footer, the On This Page list). */
const CHROME_TAGS = new Set(['header', 'nav', 'footer']);
/** Stat and fact labels: sentence case by the WP12 rule (stat captions, fact-card claims, percentage-chart labels). */
const STAT_LABEL_CLASSES = new Set(['stat__label', 'factcard__label', 'pcs__label', 'case__label']);
const BUTTON_TOKEN = /(^|__|--|-)(btn|button)($|__|--)/;
const TAG_TOKEN = /(^|__|--|-)(tags?|chips?|badges?|eyebrow)($|__|--)/;

const classTokens = (el) => String(el.attrs?.class ?? '').split(/\s+/).filter(Boolean);
const hasClass = (el, name) => classTokens(el).includes(name);
const hasSvg = (el) => (el.children ?? []).some((c) => c.type === 'element' && (c.tag === 'svg' || hasSvg(c)));

/** The visible text of a UI label: screen-reader text, aria-hidden and hidden subtrees, SVG icons and descriptions are left out. */
export function labelText(el) {
  let s = '';
  for (const c of el.children ?? []) {
    if (c.type === 'text') {
      s += c.text;
      continue;
    }
    if (c.type !== 'element' || c.ns || NON_LABEL_TAGS.has(c.tag)) continue;
    if (isHiddenElement(c) || c.attrs?.['aria-hidden'] === 'true') continue;
    if (classTokens(c).some((t) => HIDDEN_CLASSES.has(t))) continue;
    s += labelText(c);
  }
  // the accessible-name suffix that screen readers announce, e.g. " (opens your email app)"
  return s.replace(/\s+/g, ' ').replace(/\s*\(opens [^)]*\)$/, '').trim();
}

/** Full sentences are body text, not labels: ends in "." "?" or "!", or holds a clause break "; ". */
export const isSentence = (t) => /[.?!]$/.test(t) || t.includes('; ');

/** The kind of UI label an element is, or undefined. `chrome` is true inside a header, nav, footer or the On This Page list. */
export function labelKind(el, chrome) {
  if (el.ns) return undefined;
  const tag = el.tag;
  // a table caption is a label even when it is screen-reader-only (a chart's accessible table caption)
  if (tag === 'caption') return 'caption';
  // a chart title (figcaption.bars__title, .colc__title, .pb__title, .sb__title) is a title. Photo captions are sentences and are not checked.
  if (tag === 'figcaption') return classTokens(el).some((t) => /__title$/.test(t)) ? 'figcaption' : undefined;
  // the inner span of a .btn is part of its button's label, so it is not a label of its own
  if (classTokens(el).some((t) => HIDDEN_CLASSES.has(t)) || hasClass(el, 'btn__label')) return undefined;
  if (tag === 'th') return 'th';
  if (tag === 'label') return 'label';
  if (tag === 'legend') return 'legend';
  if (hasClass(el, 'skip-link')) return 'skip-link';
  // a card's link label ("Read More", "Learn More"); the span is aria-hidden, its screen-reader title suffix is excluded by labelText
  if (hasClass(el, 'card__more')) return 'card-link';
  // stat and fact labels are sentence case (WP12): a stat caption under a figure, a fact card's claim, a percentage-chart label
  if (classTokens(el).some((t) => STAT_LABEL_CLASSES.has(t))) return undefined;
  // a UI label family by class name: kickers, callout labels, category labels (…__label); and a non-heading title span (…__title)
  if (classTokens(el).some((t) => /__label$/.test(t))) return 'ui-label';
  // (not inside a header, nav or footer: the mega-menu title there is a menu item already)
  if (!chrome && !/^h[1-6]$/.test(tag) && classTokens(el).some((t) => /__title$/.test(t))) return 'ui-title';
  if (hasClass(el, 'mega__feature-title')) return 'feature-title';
  if (el.attrs?.role === 'tab') return 'tab';
  if (chrome && (tag === 'a' || tag === 'button' || 'aria-current' in (el.attrs ?? {}))) return 'menu';
  if (tag === 'button') return 'button';
  if (classTokens(el).some((t) => BUTTON_TOKEN.test(t))) return 'btn';
  if (tag === 'a' && hasClass(el, 'link') && hasSvg(el)) return 'cta-link';
  if (classTokens(el).some((t) => TAG_TOKEN.test(t))) return 'tag';
  return undefined;
}

/** Lists and table parts hold labels; they are not labels themselves (their items are checked one by one). */
const LIST_TAGS = new Set(['ul', 'ol', 'dl', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'select']);
/** The element children that show text: not SVG, not hidden, not screen-reader-only. */
const visibleChildren = (el) =>
  (el.children ?? []).filter((c) => c.type === 'element' && !c.ns && !NON_LABEL_TAGS.has(c.tag) && !isHiddenElement(c) && c.attrs?.['aria-hidden'] !== 'true' && !classTokens(c).some((t) => HIDDEN_CLASSES.has(t)));

/** [{tag, text}] for every UI label in the document (see the header comment for the classes). */
export function collectLabels(root, out = [], chrome = false) {
  for (const el of root.children ?? []) {
    if (el.type !== 'element' || el.ns || NON_LABEL_TAGS.has(el.tag)) continue;
    const inChrome = chrome || CHROME_TAGS.has(el.tag) || 'data-toc' in (el.attrs ?? {});
    let kind = labelKind(el, inChrome);
    // a tag, button or .btn holding two or more visible children is a container of labels (a chip list), so it is skipped
    if (LIST_TAGS.has(el.tag) || (kind && ['tag', 'btn', 'button'].includes(kind) && visibleChildren(el).length > 1)) kind = undefined;
    if (kind) {
      const text = labelText(el);
      if (text && !isSentence(text)) out.push({ tag: kind, text });
    }
    collectLabels(el, out, inChrome);
  }
  return out;
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
    ['JobReady@Campus · For universities and colleges', 'JobReady@Campus · For Universities and Colleges'],
    ['SDG 4 · Quality education (core)', 'SDG 4 · Quality Education (Core)'],
    ['YouTube (youtube-nocookie.com)', 'YouTube (youtube-nocookie.com)'],
    ['Visit jobready.global for details', 'Visit jobready.global for Details'],
    ['CodersTrust brings Discovery Education, the…', 'CodersTrust Brings Discovery Education, the…'],
    ['Gardiner emphasizes on skill development and…', 'Gardiner Emphasizes on Skill Development and…'],
    ['Which means…', 'Which Means…'],
    ['Write to hello@coderstrustbd.com for details', 'Write to hello@coderstrustbd.com for Details'],
    ['Email contact@coderstrust.global today', 'Email contact@coderstrust.global Today'],
  ];
  const problems = [];
  if (bad.length !== 2) problems.push(`sentence-case fixture should give 2 violations (title + h1), got ${bad.length}`);
  if (good.length !== 0) problems.push(`Title Case fixture should give 0 violations, got ${good.length}`);
  for (const [input, want] of cases) if (titleCase(input) !== want) problems.push(`titleCase(${JSON.stringify(input)}) = ${JSON.stringify(titleCase(input))}, wanted ${JSON.stringify(want)}`);

  // UI labels: each class must flag its sentence-case text and pass its Title Case text (%T% is the label).
  const labelPage = (body) => `<!doctype html><html><head><title>Fixture | CodersTrust</title></head><body>${body}</body></html>`;
  const LABEL_CASES = [
    ['menu', '<header><nav aria-label="Primary"><ul><li><a class="mega__link" href="/a/"><span class="mega__title">%T%</span> <span class="mega__desc">Who we are and why we exist.</span></a></li></ul></nav></header>', 'our story', 'Our Story'],
    ['menu', '<footer><ul><li><a href="/a/">%T%</a></li></ul></footer>', 'privacy policy', 'Privacy Policy'],
    ['menu', '<nav aria-label="Breadcrumb"><ol><li><a href="/">Home</a></li><li><span aria-current="page">%T%</span></li></ol></nav>', 'our model', 'Our Model'],
    ['menu', '<div data-toc><nav aria-label="On this page"><ol><li><a href="#x">%T%</a></li></ol></nav></div>', 'our model', 'Our Model'],
    ['menu', '<header><a class="site-header__util" href="/a/">%T%<svg aria-hidden="true"></svg></a></header>', 'start a partnership', 'Start a Partnership'],
    ['skip-link', '<a class="skip-link" href="#main">%T%</a>', 'skip to main content', 'Skip to Main Content'],
    ['feature-title', '<aside class="mega__feature"><p class="mega__feature-title">%T%</p></aside>', 'learn with a first cohort', 'Learn with a First Cohort'],
    ['button', '<button type="button">%T%</button>', 'book a discovery session', 'Book a Discovery Session'],
    ['btn', '<a class="btn btn--primary" href="/a/"><span class="btn__label">%T%</span></a>', 'see the findings', 'See the Findings'],
    ['cta-link', '<p><a class="link" href="/a/">%T%<svg aria-hidden="true"></svg></a></p>', 'meet the full team', 'Meet the Full Team'],
    ['tag', '<span class="tag">%T%</span>', 'open to all', 'Open to All'],
    ['tag', '<p class="hero__eyebrow">%T%</p>', 'our model', 'Our Model'],
    ['tag', '<span class="badge badge--info">%T%</span>', 'new course', 'New Course'],
    ['tag', '<ul class="tc__chips"><li><span class="chip">%T%</span></li><li><span class="chip">Data Analysis</span></li></ul>', 'digital marketing', 'Digital Marketing'],
    ['th', '<table><thead><tr><th scope="col">%T%</th></tr></thead></table>', 'cost per learner', 'Cost per Learner'],
    ['caption', '<table><caption>%T%</caption><tbody><tr><td>1</td></tr></tbody></table>', 'cohort outcomes by year', 'Cohort Outcomes by Year'],
    ['label', '<form><label for="e">%T%</label><input id="e" type="email"></form>', 'email address', 'Email Address'],
    ['legend', '<form><fieldset><legend>%T%</legend></fieldset></form>', 'contact method', 'Contact Method'],
    ['tab', '<div role="tablist"><button role="tab" type="button">%T%</button></div>', 'all programs', 'All Programs'],
    ['figcaption', '<figure><figcaption class="bars__title">%T%</figcaption></figure>', 'monthly income change', 'Monthly Income Change'],
    ['card-link', '<span class="card__more" aria-hidden="true">%T%<span class="sr-only">: Local partners</span></span>', 'read more', 'Read More'],
    ['ui-label', '<p class="callout__label">%T%</p>', 'program results', 'Program Results'],
    ['ui-title', '<span class="cat__title">%T%</span>', 'local partners (bangladesh)', 'Local Partners (Bangladesh)'],
    ['caption', '<table><caption class="sr-only">%T%</caption><tbody><tr><td>1</td></tr></tbody></table>', 'respondents by age group', 'Respondents by Age Group'],
  ];
  const withText = (html, t) => html.split('%T%').join(t);
  for (const [kind, html, lower, title] of LABEL_CASES) {
    const bad = violations(parseHtml(labelPage(withText(html, lower)))).filter((v) => v.tag === kind);
    if (!bad.some((v) => v.text === lower && v.expected === title)) problems.push(`${kind}: sentence-case label ${JSON.stringify(lower)} was not flagged as ${JSON.stringify(title)}`);
    const good = violations(parseHtml(labelPage(withText(html, title))));
    if (good.length) problems.push(`${kind}: Title Case label ${JSON.stringify(title)} was flagged: ${JSON.stringify(good.map((v) => v.text))}`);
  }
  // Text that is not a label must pass: sentences, prose links, descriptions, screen-reader suffixes, brand names, hidden text.
  const EXEMPT = [
    '<button type="button">Tell us your goals; we will outline a first cohort.</button>',
    '<a class="btn btn--primary" href="/a/">Ready to start?</a>',
    '<a class="btn" href="/a/">Read the Report<span class="sr-only"> (opens your email app)</span></a>',
    '<p>See <a class="link" href="/a/">governance and accountability</a> for details.</p>',
    '<span class="tag">JobReady@Campus</span>',
    '<nav aria-label="Primary"><ul><li><a href="/a/">Our Story</a></li></ul></nav>',
    '<header><a class="mega__link" href="/a/"><span class="mega__title">Our Story</span> <span class="mega__desc">who we are and why we exist</span></a></header>',
    '<button type="button"><svg aria-hidden="true"></svg><span aria-hidden="true">x</span></button>',
    '<table><thead><tr><th scope="col">Learners <span class="sr-only">(count)</span></th></tr></thead></table>',
    '<div class="tc__chips"><span class="chip">Data Analysis</span><span class="chip">Digital Marketing</span></div>',
    '<table><tbody><tr><th scope="row">jobready.global</th><td>Web hosting</td></tr></tbody></table>',
    '<p><a class="link" href="/a/">See the report</a>, then decide.</p>',
    '<figure><img src="/a.jpg" alt="Certificate ceremony"><figcaption>Certificate ceremony with Joyeeta Foundation, May 2024</figcaption></figure>',
    '<p class="stat__label">of employers globally report difficulty finding talent</p>',
    '<footer><a href="mailto:contact@coderstrust.global">contact@coderstrust.global</a></footer>',
    '<p class="factcard__label">young Africans enter the labor market each year</p>',
    '<h3 class="card__title"><a class="card__link" href="/a/">Our Story</a></h3>',
  ];
  for (const html of EXEMPT) {
    const v = violations(parseHtml(labelPage(html)));
    if (v.length) problems.push(`exempt text was flagged in ${html.slice(0, 70)}: ${JSON.stringify(v.map((x) => x.text))}`);
  }
  // a label that is not sentence case must still be flagged in the exempt-style markup (the exemptions are narrow)
  if (!violations(parseHtml(labelPage('<button type="button">yes please</button>'))).some((v) => v.tag === 'button')) problems.push('a sentence-case button label was not flagged');
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
  const labelCounts = {}; // UI labels inspected per kind (occurrences across pages), printed so a pass shows what it covered
  for (const page of site.pages) {
    if (page.isStub) continue;
    pages++;
    const route = page.route;
    for (const item of collectItems(page.doc)) {
      checked++;
      if (!/^(h[1-6]|summary|title|og:title|twitter:title|jsonld\.)/.test(item.tag)) labelCounts[item.tag] = (labelCounts[item.tag] ?? 0) + 1;
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
  // An entry for a page this build does not contain (the styleguide is absent from production builds, WP20a) is not stale.
  const builtRoutes = new Set(site.pages.filter((p) => !p.isStub).map((p) => p.route));
  allow.forEach((a, i) => {
    if (a.page !== '*' && !builtRoutes.has(a.page)) return;
    if (!used.has(i)) findings.error('stale-allow-entry', 'scripts/title-case-allow.json', `allowlist entry matches nothing: ${a.tag} ${JSON.stringify(a.text)} on ${a.page}`);
  });
  console.log(`check-title-case: ${pages} pages, ${checked} titles/headings checked, ${used.size} allowlisted (${allow.length} entries)`);
  const labelTotal = Object.values(labelCounts).reduce((a, b) => a + b, 0);
  console.log(`  UI labels inspected: ${labelTotal} occurrences (${Object.entries(labelCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  printFindings('check-title-case', findings, { examples: cfg.opts.list ? 100000 : 25 });
  process.exit(findings.errors.length ? 1 : 0);
}
void trunc;
