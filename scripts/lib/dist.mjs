/**
 * Shared helpers for the static build checks (check-html, check-links, check-budget, check-seo,
 * check-content-rules). Node built-ins only: a small tolerant HTML5 tree builder (enough for the
 * output of Astro and its Markdown pipeline), base-aware route/asset resolution over dist/, CSS and
 * srcset URL extraction, site-data readers (CTA library, contact addresses, phone numbers, partner
 * and press hosts), a findings collector and JSON + markdown report writers (.work/qa/).
 *
 * Environment (same names and defaults as astro.config.mjs; every one can be overridden by a flag):
 *   BASE_PATH  path prefix of the build under test            (--base, default /ctg)
 *   SITE_ENV   staging | production                           (--env,  default staging)
 *   SITE_URL   deployment origin                              (--site-url, default https://ctjobready.github.io)
 *   DIST_DIR   build output                                   (--dist, default <repo>/dist)
 *   QA_DIR     report directory                               (--out,  default <repo>/.work/qa)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import vm from 'node:vm';

export const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
/** Canonical origin; canonical URLs and JSON-LD always use it, even on staging (doc 09 §3). */
export const PRODUCTION_ORIGIN = 'https://coderstrust.global';

/* ------------------------------------------------------------------------------------------- */
/* CLI + configuration                                                                          */
/* ------------------------------------------------------------------------------------------- */

/** `--key value`, `--key=value`, and boolean flags listed in `booleans`. Everything else is positional. */
export function parseArgs(argv = process.argv.slice(2), booleans = []) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      positional.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    if (eq !== -1) {
      opts[a.slice(2, eq)] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    if (booleans.includes(key)) opts[key] = true;
    else if (i + 1 < argv.length) opts[key] = argv[++i];
    else opts[key] = true;
  }
  return { opts, positional };
}

export function normalizeBase(raw) {
  if (raw === undefined || raw === null) return '/ctg';
  const s = String(raw).trim();
  if (s === '' || s === '/') return '';
  return '/' + s.replace(/^\/+|\/+$/g, '');
}

/**
 * Resolve the settings of one check run. `base` is '' for root hosting, '/ctg' on staging.
 * Throws nothing; scripts decide how to react to a missing dist/.
 */
export function loadConfig(argv = process.argv.slice(2), booleans = []) {
  const { opts, positional } = parseArgs(argv, booleans);
  const distArg = opts.dist ?? positional[0] ?? process.env.DIST_DIR;
  const dist = distArg ? resolve(String(distArg)) : join(REPO_ROOT, 'dist');
  const base = normalizeBase(opts.base ?? process.env.BASE_PATH ?? '/ctg');
  const siteEnv = String(opts.env ?? process.env.SITE_ENV ?? 'staging') === 'production' ? 'production' : 'staging';
  const siteUrl = String(opts['site-url'] ?? process.env.SITE_URL ?? 'https://ctjobready.github.io').replace(/\/+$/, '');
  const outDir = resolve(String(opts.out ?? process.env.QA_DIR ?? join(REPO_ROOT, '.work/qa')));
  return {
    opts,
    dist,
    base,
    siteEnv,
    siteUrl,
    outDir,
    repoRoot: REPO_ROOT,
    /** Report-name suffix so a production run does not overwrite the staging report. */
    label: siteEnv === 'production' ? '.production' : '',
  };
}

export function describeConfig(cfg) {
  return `dist=${relative(process.cwd(), cfg.dist) || '.'}  base=${cfg.base || '/'}  env=${cfg.siteEnv}  site=${cfg.siteUrl}`;
}

/* ------------------------------------------------------------------------------------------- */
/* File system                                                                                  */
/* ------------------------------------------------------------------------------------------- */

const toPosix = (p) => p.split(sep).join('/');

export function listFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out.sort();
}

/** Route (URL path without the base) for a dist-relative HTML file. */
export function routeOfHtml(rel) {
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404/'; // directory build emits 404.html; the site treats it as /404/
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'index.html'.length);
  return '/' + rel;
}

/* ------------------------------------------------------------------------------------------- */
/* HTML parsing                                                                                 */
/* ------------------------------------------------------------------------------------------- */

const VOID = new Set([
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'embed', 'frame', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);
const RAW_TEXT = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes']);
const RCDATA = new Set(['textarea', 'title']);
const SPECIAL = new Set([
  'address', 'applet', 'area', 'article', 'aside', 'base', 'basefont', 'bgsound', 'blockquote', 'body', 'br', 'button', 'caption', 'center', 'col',
  'colgroup', 'dd', 'details', 'dialog', 'dir', 'div', 'dl', 'dt', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'frame', 'frameset',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'iframe', 'img', 'input', 'keygen', 'li', 'link', 'listing', 'main',
  'marquee', 'menu', 'meta', 'nav', 'noembed', 'noframes', 'noscript', 'object', 'ol', 'p', 'param', 'plaintext', 'pre', 'script', 'search', 'section',
  'select', 'source', 'style', 'summary', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'title', 'tr', 'track', 'ul', 'wbr', 'xmp',
]);
const SCOPE_BOUNDARY = new Set(['html', 'table', 'td', 'th', 'caption', 'marquee', 'object', 'template', 'applet']);
const P_CLOSERS = new Set([
  'address', 'article', 'aside', 'blockquote', 'center', 'details', 'dialog', 'dir', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer', 'form',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'search', 'section', 'table', 'ul', 'li', 'dd', 'dt',
  'listing', 'xmp',
]);
const HEAD_OK = new Set(['base', 'basefont', 'bgsound', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title']);

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', shy: '\u00ad', copy: '©', reg: '®', trade: '™', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', sbquo: '‚', bdquo: '„', bull: '•', middot: '·', times: '×', divide: '÷', plusmn: '±', deg: '°', euro: '€',
  pound: '£', yen: '¥', cent: '¢', sect: '§', para: '¶', laquo: '«', raquo: '»', larr: '←', rarr: '→', uarr: '↑', darr: '↓', harr: '↔', minus: '−',
  ne: '≠', le: '≤', ge: '≥', infin: '∞', asymp: '≈', frac12: '½', frac14: '¼', frac34: '¾', sup1: '¹', sup2: '²', sup3: '³', micro: 'µ', thinsp: '\u2009',
  ensp: '\u2002', emsp: '\u2003', hairsp: '\u200a', zwnj: '\u200c', zwj: '\u200d', check: '✓', dagger: '†', Dagger: '‡', permil: '‰', prime: '′', Prime: '″',
  eacute: 'é', egrave: 'è', aacute: 'á', agrave: 'à', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', ouml: 'ö', uuml: 'ü', auml: 'ä', oslash: 'ø', aring: 'å',
  aelig: 'æ', ccedil: 'ç', szlig: 'ß',
};

/** Decode numeric and the common named character references. Unknown names are left untouched. */
export function decodeEntities(s) {
  if (!s || s.indexOf('&') === -1) return s;
  return s.replace(/&(#[xX][0-9a-fA-F]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g, (m, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '\ufffd';
      try {
        return String.fromCodePoint(code);
      } catch {
        return '\ufffd';
      }
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : m;
  });
}

const rawEndCache = new Map();
function rawEndRegex(tag) {
  let re = rawEndCache.get(tag);
  if (!re) {
    re = new RegExp('</' + tag + '(?=[\\s/>])', 'ig');
    rawEndCache.set(tag, re);
  }
  return re;
}

const END_TAG = /<\/([A-Za-z][^\s/>]*)[^>]*>/y;
const TAG_NAME = /<([A-Za-z][^\s/>]*)/y;

/**
 * Parse an HTML document into a light tree.
 * Element: { type:'element', tag (lower-case), name (as written), ns:null|'svg'|'math', attrs (lower-case name -> decoded value,
 *            first occurrence wins), attrList:[[name,value]] (all, in order, as written), children, parent, start, openEnd, end, closeStart }
 * Text:    { type:'text', text (decoded; raw for script/style), raw, start, end, parent }
 * Comment: { type:'comment', text, start, end, parent }
 */
export function parseHtml(src) {
  const n = src.length;
  const root = { type: 'root', tag: '#root', name: '#root', ns: null, attrs: {}, attrList: [], children: [], parent: null, start: 0, openEnd: 0, end: n, closeStart: -1 };
  const stack = [root];
  let i = 0;

  const pushText = (raw, start, decode = true) => {
    if (!raw) return;
    const parent = stack[stack.length - 1];
    const last = parent.children[parent.children.length - 1];
    const text = decode ? decodeEntities(raw) : raw;
    if (last && last.type === 'text' && last.end === start) {
      last.text += text;
      last.raw += raw;
      last.end = start + raw.length;
      return;
    }
    parent.children.push({ type: 'text', text, raw, start, end: start + raw.length, parent });
  };

  const popTo = (idx, at) => {
    while (stack.length > idx) {
      const e = stack.pop();
      e.end = at;
    }
  };

  const applyImpliedEnds = (tag, at) => {
    let top = stack[stack.length - 1];
    if (top.tag === 'head' && !HEAD_OK.has(tag)) {
      popTo(stack.length - 1, at);
      top = stack[stack.length - 1];
    }
    if (P_CLOSERS.has(tag)) {
      for (let j = stack.length - 1; j > 0; j--) {
        const t = stack[j];
        if (t.tag === 'p' && !t.ns) {
          popTo(j, at);
          break;
        }
        if ((SCOPE_BOUNDARY.has(t.tag) || t.tag === 'button') && !t.ns) break;
      }
    }
    if (/^h[1-6]$/.test(tag) && /^h[1-6]$/.test(top.tag) && !top.ns) popTo(stack.length - 1, at);
    if (tag === 'li') {
      for (let j = stack.length - 1; j > 0; j--) {
        const t = stack[j].tag;
        if (t === 'li') {
          popTo(j, at);
          break;
        }
        if (SPECIAL.has(t) && t !== 'address' && t !== 'div' && t !== 'p') break;
      }
    } else if (tag === 'dd' || tag === 'dt') {
      for (let j = stack.length - 1; j > 0; j--) {
        const t = stack[j].tag;
        if (t === 'dd' || t === 'dt') {
          popTo(j, at);
          break;
        }
        if (SPECIAL.has(t) && t !== 'address' && t !== 'div' && t !== 'p') break;
      }
    } else if (tag === 'td' || tag === 'th') {
      for (let j = stack.length - 1; j > 0; j--) {
        const t = stack[j].tag;
        if (t === 'td' || t === 'th') {
          popTo(j, at);
          break;
        }
        if (t === 'tr' || t === 'table') break;
      }
    } else if (tag === 'tr') {
      while (['td', 'th', 'tr'].includes(stack[stack.length - 1].tag)) popTo(stack.length - 1, at);
    } else if (tag === 'tbody' || tag === 'thead' || tag === 'tfoot') {
      while (['td', 'th', 'tr', 'tbody', 'thead', 'tfoot', 'caption', 'colgroup'].includes(stack[stack.length - 1].tag)) popTo(stack.length - 1, at);
    } else if (tag === 'option') {
      if (stack[stack.length - 1].tag === 'option') popTo(stack.length - 1, at);
    } else if (tag === 'optgroup') {
      if (stack[stack.length - 1].tag === 'option') popTo(stack.length - 1, at);
      if (stack[stack.length - 1].tag === 'optgroup') popTo(stack.length - 1, at);
    }
  };

  const closeElement = (name, closeStart, closeEnd) => {
    const special = SPECIAL.has(name);
    let k = -1;
    for (let j = stack.length - 1; j > 0; j--) {
      const t = stack[j];
      if (t.tag === name) {
        k = j;
        break;
      }
      if (!t.ns && SCOPE_BOUNDARY.has(t.tag)) break;
      if (!special && !t.ns && SPECIAL.has(t.tag)) break;
    }
    if (k === -1) return; // stray end tag: ignored, like a browser
    while (stack.length > k) {
      const e = stack.pop();
      if (stack.length === k) {
        e.closeStart = closeStart;
        e.end = closeEnd;
      } else e.end = closeStart;
    }
  };

  while (i < n) {
    const lt = src.indexOf('<', i);
    if (lt === -1) {
      pushText(src.slice(i), i);
      break;
    }
    if (lt > i) pushText(src.slice(i, lt), i);
    i = lt;
    const c1 = src.charCodeAt(i + 1);
    if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4);
      const end = e === -1 ? n : e + 3;
      const parent = stack[stack.length - 1];
      parent.children.push({ type: 'comment', text: src.slice(i + 4, e === -1 ? n : e), start: i, end, parent });
      i = end;
    } else if (c1 === 33 /* ! */ || c1 === 63 /* ? */) {
      const e = src.indexOf('>', i);
      const end = e === -1 ? n : e + 1;
      const parent = stack[stack.length - 1];
      const body = src.slice(i + 2, end - 1);
      parent.children.push({ type: /^doctype/i.test(body) ? 'doctype' : 'comment', text: body, start: i, end, parent });
      i = end;
    } else if (c1 === 47 /* / */) {
      END_TAG.lastIndex = i;
      const m = END_TAG.exec(src);
      if (!m) {
        pushText('<', i);
        i++;
        continue;
      }
      i = m.index + m[0].length;
      const name = m[1].toLowerCase();
      if (name === 'br' || (name === 'p' && !stack.some((e) => e.tag === 'p'))) continue;
      closeElement(name, m.index, i);
    } else if ((c1 >= 65 && c1 <= 90) || (c1 >= 97 && c1 <= 122)) {
      const startAt = i;
      TAG_NAME.lastIndex = i;
      const nm = TAG_NAME.exec(src);
      const name = nm[1];
      let j = i + nm[0].length;
      const attrList = [];
      let selfClosing = false;
      let closed = false;
      while (j < n) {
        while (j < n && /\s/.test(src[j])) j++;
        if (j >= n) break;
        const ch = src[j];
        if (ch === '>') {
          j++;
          closed = true;
          break;
        }
        if (ch === '/') {
          if (src[j + 1] === '>') {
            selfClosing = true;
            j += 2;
            closed = true;
            break;
          }
          j++;
          continue;
        }
        let k = j;
        if (src[k] === '=') k++; // a leading "=" belongs to the name (HTML parsing rule)
        while (k < n && !/[\s/>=]/.test(src[k])) k++;
        const aname = src.slice(j, k);
        j = k;
        while (j < n && /\s/.test(src[j])) j++;
        let value = '';
        if (src[j] === '=') {
          j++;
          while (j < n && /\s/.test(src[j])) j++;
          const q = src[j];
          if (q === '"' || q === "'") {
            const e = src.indexOf(q, j + 1);
            const stop = e === -1 ? n : e;
            value = src.slice(j + 1, stop);
            j = e === -1 ? n : e + 1;
          } else {
            let e = j;
            while (e < n && !/[\s>]/.test(src[e])) e++;
            value = src.slice(j, e);
            j = e;
          }
        }
        attrList.push([aname, decodeEntities(value)]);
      }
      if (!closed) {
        // unterminated tag at EOF: browsers drop it
        i = n;
        break;
      }
      i = j;
      const tag = name.toLowerCase();
      let parent = stack[stack.length - 1];
      const foreignParent = parent.ns && parent.tag !== 'foreignobject' ? parent.ns : null;
      const ns = tag === 'svg' ? 'svg' : tag === 'math' ? 'math' : foreignParent;
      if (!ns) applyImpliedEnds(tag, startAt);
      parent = stack[stack.length - 1];
      const attrs = Object.create(null);
      for (const [an, av] of attrList) {
        const key = an.toLowerCase();
        if (!(key in attrs)) attrs[key] = av;
      }
      const el = { type: 'element', tag, name, ns, attrs, attrList, children: [], parent, start: startAt, openEnd: i, end: i, closeStart: -1, selfClosing };
      parent.children.push(el);
      if ((VOID.has(tag) && !ns) || (selfClosing && ns)) continue;
      stack.push(el);
      if (!ns && (RAW_TEXT.has(tag) || RCDATA.has(tag))) {
        const re = rawEndRegex(tag);
        re.lastIndex = i;
        const em = re.exec(src);
        const stop = em ? em.index : n;
        if (stop > i) {
          const raw = src.slice(i, stop);
          el.children.push({ type: 'text', text: RAW_TEXT.has(tag) ? raw : decodeEntities(raw), raw, start: i, end: stop, parent: el });
        }
        i = stop;
      }
    } else {
      pushText('<', i);
      i++;
    }
  }
  while (stack.length > 1) {
    const e = stack.pop();
    e.end = n;
  }
  return root;
}

/** Depth-first walk; return false from `visit` to skip an element's subtree. */
export function walk(node, visit) {
  for (const c of node.children ?? []) {
    if (visit(c) === false) continue;
    if (c.children) walk(c, visit);
  }
}

export function elements(root, tag) {
  const out = [];
  walk(root, (n) => {
    if (n.type === 'element' && (!tag || n.tag === tag)) out.push(n);
  });
  return out;
}

export function first(root, tag, pred) {
  let found = null;
  const visit = (node) => {
    for (const c of node.children ?? []) {
      if (found) return;
      if (c.type === 'element' && c.tag === tag && (!pred || pred(c))) {
        found = c;
        return;
      }
      if (c.children) visit(c);
    }
  };
  visit(root);
  return found;
}

export const attr = (el, name) => el.attrs[name];
export const hasAttr = (el, name) => name in el.attrs;

export function* ancestors(el) {
  for (let p = el.parent; p && p.type !== 'root'; p = p.parent) yield p;
}

export function textContent(node) {
  if (node.type === 'text') return node.text;
  let s = '';
  for (const c of node.children ?? []) {
    if (c.type === 'text') s += c.text;
    else if (c.type === 'element') s += textContent(c);
  }
  return s;
}

/** Whitespace-collapsed text of an element (all descendants, including hidden ones). */
export const plainText = (node) => textContent(node).replace(/\s+/g, ' ').trim();

export function lineCol(src, offset) {
  let line = 1;
  let last = -1;
  for (let i = src.indexOf('\n'); i !== -1 && i < offset; i = src.indexOf('\n', i + 1)) {
    line++;
    last = i;
  }
  return { line, col: offset - last };
}

export function trunc(s, max = 160) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

/** Opening-tag source of an element, collapsed and truncated: the evidence shown next to a finding. */
export function snippet(src, el, max = 180) {
  return trunc(src.slice(el.start, el.openEnd), max);
}

/* ---- visible text (content rules) ------------------------------------------------------------ */

const NON_VISIBLE = new Set(['head', 'script', 'style', 'template', 'title', 'meta', 'link', 'base', 'noframes', 'object', 'canvas']);
const SVG_NON_VISIBLE = new Set(['title', 'desc', 'metadata', 'defs', 'symbol', 'clippath', 'mask', 'pattern', 'lineargradient', 'radialgradient', 'filter', 'style', 'script']);
const BLOCK = new Set([
  'address', 'article', 'aside', 'blockquote', 'body', 'br', 'caption', 'dd', 'details', 'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure',
  'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main', 'menu', 'nav', 'ol', 'p', 'pre', 'section', 'summary',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'option', 'select', 'textarea', 'button', 'label', 'legend', 'noscript',
]);

export function isHiddenElement(el) {
  if ('hidden' in el.attrs && el.attrs.hidden !== 'false') return true;
  const st = el.attrs.style;
  if (st && /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i.test(st)) return true;
  if (el.tag === 'input' && (el.attrs.type ?? '').toLowerCase() === 'hidden') return true;
  return false;
}

/**
 * Rendered text of a document: script/style/template/head and hidden subtrees are dropped, whitespace is collapsed,
 * block elements are separated by newlines. `quotes` lists the [start,end) offsets inside <blockquote>/<q>.
 */
export function visibleText(root) {
  const parts = [];
  let len = 0;
  let last = 10; // pretend the text starts after a newline so leading whitespace is dropped
  const quotes = [];
  const isSpaceCode = (c) => c === 32 || c === 10 || c === 9 || c === 13 || c === 12 || c === 160 || (c >= 0x2000 && c <= 0x200a);
  const push = (s) => {
    if (!s) return;
    parts.push(s);
    len += s.length;
    last = s.charCodeAt(s.length - 1);
  };
  const emit = (s) => {
    let buf = '';
    let prev = last;
    for (let k = 0; k < s.length; k++) {
      const code = s.charCodeAt(k);
      if (isSpaceCode(code)) {
        if (prev !== 32 && prev !== 10) {
          buf += ' ';
          prev = 32;
        }
      } else {
        buf += s[k];
        prev = code;
      }
    }
    push(buf);
  };
  const brk = () => {
    if (last === 32) {
      const tail = parts.pop().slice(0, -1);
      len -= 1;
      if (tail) parts.push(tail);
      last = parts.length ? parts[parts.length - 1].charCodeAt(parts[parts.length - 1].length - 1) : 10;
    }
    if (len && last !== 10) push('\n');
  };
  const visit = (node) => {
    for (const c of node.children ?? []) {
      if (c.type === 'text') {
        emit(c.text);
        continue;
      }
      if (c.type !== 'element') continue;
      if (!c.ns && NON_VISIBLE.has(c.tag)) continue;
      if (c.ns === 'svg' && SVG_NON_VISIBLE.has(c.tag)) continue;
      if (isHiddenElement(c)) continue;
      const block = !c.ns && BLOCK.has(c.tag);
      const quote = !c.ns && (c.tag === 'blockquote' || c.tag === 'q');
      if (block) brk();
      const qStart = len;
      visit(c);
      if (quote) quotes.push([qStart, len]);
      if (block) brk();
    }
  };
  visit(root);
  return { text: parts.join(""), quotes };
}

/** Text that is published but not "visible": alt, aria-label, title attributes and SVG <title>/<desc>. */
export function accessibleTexts(root) {
  const out = [];
  walk(root, (el) => {
    if (el.type !== 'element') return;
    if (el.ns === 'svg' && (el.tag === 'title' || el.tag === 'desc')) {
      const t = plainText(el);
      if (t) out.push({ source: `svg-${el.tag}`, text: t, el });
      return;
    }
    if (el.tag === 'script' || el.tag === 'style') return false;
    for (const a of ['alt', 'aria-label', 'title', 'placeholder']) {
      const v = el.attrs[a];
      if (v && v.trim() && !(a === 'title' && el.tag === 'title')) out.push({ source: `${el.tag}[${a}]`, text: v.replace(/\s+/g, ' ').trim(), el });
    }
  });
  return out;
}

/* ---- documents ------------------------------------------------------------------------------ */

export function metaContent(root, { name, property, httpEquiv }) {
  const m = first(root, 'meta', (e) => {
    if (name) return (e.attrs.name ?? '').toLowerCase() === name;
    if (property) return (e.attrs.property ?? '').toLowerCase() === property;
    if (httpEquiv) return (e.attrs['http-equiv'] ?? '').toLowerCase() === httpEquiv;
    return false;
  });
  return m ? (m.attrs.content ?? '') : null;
}

export const pageTitle = (root) => {
  const t = first(root, 'title', (e) => !e.ns);
  return t ? textContent(t).replace(/\s+/g, ' ').trim() : null;
};

/** `<meta http-equiv="refresh" content="0;url=…">` -> target URL (redirect stubs), else null. */
export function refreshTarget(root) {
  const content = metaContent(root, { httpEquiv: 'refresh' });
  if (content === null) return null;
  const m = /url\s*=\s*['"]?([^'";]+)/i.exec(content);
  return m ? m[1].trim() : '';
}

export function jsonLdBlocks(root) {
  return elements(root, 'script')
    .filter((s) => (s.attrs.type ?? '').toLowerCase().split(';')[0].trim() === 'application/ld+json')
    .map((s) => {
      const text = textContent(s);
      try {
        return { el: s, text, json: JSON.parse(text), error: null };
      } catch (e) {
        return { el: s, text, json: null, error: e.message };
      }
    });
}

/** All ids a fragment link may target on this page (id attributes and legacy <a name>). */
export function collectIds(root) {
  const ids = new Set();
  walk(root, (e) => {
    if (e.type !== 'element') return;
    if (e.attrs.id) ids.add(e.attrs.id);
    if (e.tag === 'a' && e.attrs.name) ids.add(e.attrs.name);
  });
  return ids;
}

/* ---- URL attribute helpers ------------------------------------------------------------------- */

/** Parse an img/source `srcset` into its URL candidates. */
export function parseSrcset(value) {
  const out = [];
  const re = /(\S+?)(?:\s+(\d+(?:\.\d+)?[wx]))?\s*(?:,|$)/g;
  let m;
  while ((m = re.exec(value)) !== null) {
    if (m[1]) out.push({ url: m[1], descriptor: m[2] ?? '' });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

/** url(...) and @import references in a CSS text (data: URIs and fragment-only references are skipped). */
export function cssUrls(css) {
  const out = [];
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const re = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s][^)]*?))\s*\)/gi;
  let m;
  while ((m = re.exec(stripped)) !== null) out.push((m[1] ?? m[2] ?? m[3] ?? '').trim());
  const imp = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi;
  while ((m = imp.exec(stripped)) !== null) out.push(m[1].trim());
  return out.filter((u) => u && !u.startsWith('data:') && !u.startsWith('#') && !u.includes('var(') && !u.includes('{'));
}

/* ------------------------------------------------------------------------------------------- */
/* The built site                                                                               */
/* ------------------------------------------------------------------------------------------- */

/**
 * Load dist/: every file (posix paths relative to dist) and, with `parse`, every HTML page parsed.
 * Page: { rel, file, route, source, doc, ids, refresh (stub target or null), isStub, is404 }
 */
export function loadSite(cfg, { parse = true } = {}) {
  if (!existsSync(cfg.dist) || !statSync(cfg.dist).isDirectory()) {
    throw new Error(`dist directory not found: ${cfg.dist}. Run "npm run build" first (or pass --dist <dir>).`);
  }
  const files = listFiles(cfg.dist);
  const fileSet = new Set(files.map((f) => toPosix(relative(cfg.dist, f))));
  const pages = [];
  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    const rel = toPosix(relative(cfg.dist, file));
    const page = { rel, file, route: routeOfHtml(rel), is404: rel === '404.html' };
    if (parse) {
      page.source = readFileSync(file, 'utf8');
      page.doc = parseHtml(page.source);
      page.ids = collectIds(page.doc);
      page.refresh = refreshTarget(page.doc);
      page.isStub = page.refresh !== null;
    }
    pages.push(page);
  }
  const byRel = new Map(pages.map((p) => [p.rel, p]));
  return { cfg, files, fileSet, relFiles: [...fileSet], pages, byRel };
}

/** Public path of a route on this deployment ("/about/" -> "/ctg/about/"). */
export const publicPath = (cfg, route) => (route === '/404/' ? `${cfg.base}/404.html` : `${cfg.base}${route}`);

/**
 * Resolve a URL *pathname* (already percent-decoded, no query/hash) against dist.
 *   base:true  the path is a deployment path ("/ctg/about/") and must carry the base
 *   base:false the path is a production-origin path ("/about/", e.g. canonical/og:image) and never carries the base
 * Returns { status: 'page'|'file'|'missing'|'needs-trailing-slash'|'outside-base', rel?, route? }
 */
export function resolveInDist(site, pathname, { base = true } = {}) {
  const b = base ? site.cfg.base : '';
  let rest = pathname;
  if (b) {
    if (pathname === b) return { status: 'needs-trailing-slash', rel: 'index.html' };
    if (!pathname.startsWith(b + '/')) return { status: 'outside-base' };
    rest = pathname.slice(b.length);
  }
  if (!rest.startsWith('/')) rest = '/' + rest;
  if (rest.endsWith('/')) {
    const rel = rest.slice(1) + 'index.html';
    if (site.fileSet.has(rel)) return { status: 'page', rel, route: routeOfHtml(rel) };
    return { status: 'missing' };
  }
  const rel = rest.slice(1);
  if (site.fileSet.has(rel)) return { status: rel.endsWith('.html') ? 'page' : 'file', rel, route: rel.endsWith('.html') ? routeOfHtml(rel) : undefined };
  if (site.fileSet.has(rel + '/index.html')) return { status: 'needs-trailing-slash', rel: rel + '/index.html' };
  return { status: 'missing' };
}

export function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

/**
 * Classify a URL found in markup. `from` is the public path of the document it appears in ("/ctg/about/"), used for relative URLs.
 * kinds: empty | fragment | mailto | tel | data | javascript | other-scheme | protocol-relative | external | own-origin | root-relative | relative
 */
export function classifyUrl(cfg, raw, from = '/') {
  const url = (raw ?? '').trim();
  if (url === '') return { kind: 'empty', raw };
  if (url.startsWith('#')) return { kind: 'fragment', fragment: url.slice(1), raw };
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(url);
  if (scheme) {
    const s = scheme[1].toLowerCase();
    if (s === 'mailto') return { kind: 'mailto', raw };
    if (s === 'tel') return { kind: 'tel', raw };
    if (s === 'data') return { kind: 'data', raw };
    if (s === 'javascript') return { kind: 'javascript', raw };
    if (s === 'http' || s === 'https') {
      let u;
      try {
        u = new URL(url);
      } catch {
        return { kind: 'invalid', raw };
      }
      const origins = new Set([PRODUCTION_ORIGIN, cfg.siteUrl]);
      return { kind: origins.has(u.origin) ? 'own-origin' : 'external', url: u, raw };
    }
    return { kind: 'other-scheme', scheme: s, raw };
  }
  if (url.startsWith('//')) return { kind: 'protocol-relative', raw };
  let u;
  try {
    u = new URL(url, 'http://placeholder.invalid' + from);
  } catch {
    return { kind: 'invalid', raw };
  }
  const path = safeDecode(u.pathname);
  return {
    kind: url.startsWith('/') ? 'root-relative' : 'relative',
    pathname: path ?? u.pathname,
    badEncoding: path === null,
    search: u.search,
    fragment: u.hash ? u.hash.slice(1) : '',
    raw,
  };
}

/* ------------------------------------------------------------------------------------------- */
/* Reference extraction                                                                         */
/* ------------------------------------------------------------------------------------------- */

const URL_ATTRS = {
  a: ['href'], area: ['href'], link: ['href'], img: ['src', 'srcset'], source: ['src', 'srcset'], script: ['src'], iframe: ['src'], video: ['src', 'poster'],
  audio: ['src'], track: ['src'], embed: ['src'], object: ['data'], form: ['action'], input: ['src', 'formaction'], button: ['formaction'], base: ['href'],
};
const KNOWN_ATTRS = new Set(Object.values(URL_ATTRS).flat());
const NAV_TAGS = new Set(['a', 'area']);

/**
 * Every URL reference of a page: { tag, attr, url, kind: 'nav'|'asset'|'meta', el, rel? }.
 * Includes href/src/srcset/poster/action/data, inline style and <style> url(), og/twitter image metas, meta refresh, and any
 * non-standard attribute whose value is an absolute http(s) URL or starts with the deployment base.
 */
export function extractRefs(page, cfg) {
  const refs = [];
  const add = (el, attrName, url, kind, extra = {}) => refs.push({ tag: el.tag, attr: attrName, url, kind, el, ...extra });
  walk(page.doc, (el) => {
    if (el.type !== 'element') return;
    if (el.ns) {
      // SVG: <a href>, <image href>, <use href> are references too
      for (const an of ['href', 'xlink:href']) {
        const v = el.attrs[an];
        if (v !== undefined && !v.startsWith('#')) add(el, an, v, el.tag === 'a' ? 'nav' : 'asset');
      }
    } else {
      for (const an of URL_ATTRS[el.tag] ?? []) {
        const v = el.attrs[an];
        if (v === undefined) continue;
        if (an === 'srcset') {
          for (const cand of parseSrcset(v)) add(el, 'srcset', cand.url, 'asset');
        } else if (el.tag === 'input' && an === 'src' && (el.attrs.type ?? '').toLowerCase() !== 'image') {
          continue;
        } else {
          let kind = NAV_TAGS.has(el.tag) ? 'nav' : 'asset';
          const rel = (el.attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
          if (el.tag === 'link' && rel.includes('canonical')) kind = 'canonical';
          if (el.tag === 'link' && rel.includes('alternate') && !rel.includes('stylesheet') && /(?:rss|atom|xml)/.test(el.attrs.type ?? '')) kind = 'asset';
          if (el.tag === 'form' || el.tag === 'button' || (el.tag === 'input' && an === 'formaction')) kind = 'nav';
          add(el, an, v, kind, { rel });
        }
      }
      if (el.tag === 'meta') {
        const key = (el.attrs.property ?? el.attrs.name ?? '').toLowerCase();
        const v = el.attrs.content;
        if (v && /^(og:image|og:image:url|og:image:secure_url|twitter:image|og:video|og:audio)$/.test(key)) add(el, 'content', v, 'meta', { metaKey: key });
        if (v && key === 'og:url') add(el, 'content', v, 'meta', { metaKey: key });
        if ((el.attrs['http-equiv'] ?? '').toLowerCase() === 'refresh') {
          const t = /url\s*=\s*['"]?([^'";]+)/i.exec(v ?? '');
          if (t) add(el, 'content', t[1].trim(), 'refresh');
        }
      }
    }
    if (el.attrs.style) for (const u of cssUrls(el.attrs.style)) add(el, 'style', u, 'asset', { css: true });
    if (el.tag === 'style') for (const u of cssUrls(textContent(el))) add(el, '#text', u, 'asset', { css: true });
    for (const [an, av] of el.attrList) {
      const key = an.toLowerCase();
      if (KNOWN_ATTRS.has(key) || key === 'style' || key === 'content' || key === 'xlink:href' || key.startsWith('xmlns')) continue;
      if (/^https?:\/\//i.test(av) || (cfg.base && (av === cfg.base || av.startsWith(cfg.base + '/')))) {
        if (/^(?:content|d|points|transform|class|id|alt|title|aria-[a-z]+|data-copy-message)$/.test(key)) continue;
        add(el, an, av, 'other');
      }
    }
  });
  return refs;
}

/* ------------------------------------------------------------------------------------------- */
/* Site data (source of truth for mailto / tel / partner hosts)                                 */
/* ------------------------------------------------------------------------------------------- */

function readIfExists(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

function matchingBrace(src, openIdx) {
  let depth = 0;
  let q = null;
  for (let j = openIdx; j < src.length; j++) {
    const ch = src[j];
    if (q) {
      if (ch === '\\') j++;
      else if (ch === q) q = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') q = ch;
    else if (ch === '/' && src[j + 1] === '/') {
      j = src.indexOf('\n', j);
      if (j < 0) break;
    } else if (ch === '/' && src[j + 1] === '*') {
      const e = src.indexOf('*/', j + 2);
      if (e < 0) break;
      j = e + 1;
    } else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

/** "+880 1958-220802" -> "+8801958220802" */
export const toE164 = (s) => '+' + String(s).replace(/\D/g, '');

/**
 * Read the facts the checks compare against, straight from the source files: the CTA library (src/data/ctas.ts),
 * published contact addresses and phone numbers (src/lib/site.ts, src/data/*), partner and press hosts.
 * `errors` lists anything that could not be read, so a check can fail loudly instead of silently skipping.
 */
export function loadSiteData(root = REPO_ROOT) {
  const errors = [];
  const siteTs = readIfExists(join(root, 'src/lib/site.ts'));
  const ctasTs = readIfExists(join(root, 'src/data/ctas.ts'));
  const dataDir = join(root, 'src/data');
  const dataSources = existsSync(dataDir) ? readdirSync(dataDir).filter((f) => /\.(ts|json)$/.test(f)).map((f) => [f, readFileSync(join(dataDir, f), 'utf8')]) : [];

  let ctas = null;
  let recipient = null;
  const rm = /export const CONTACT = \{[\s\S]*?email:\s*'([^']+)'/.exec(siteTs);
  if (rm) recipient = rm[1];
  else errors.push('could not read CONTACT.email from src/lib/site.ts');
  const um = /export const NU_PGD_APPLY_URL\s*=\s*'([^']+)'/.exec(ctasTs);
  const at = ctasTs.indexOf('export const CTAS');
  if (at !== -1 && recipient) {
    const open = ctasTs.indexOf('{', ctasTs.indexOf('=', at));
    const close = matchingBrace(ctasTs, open);
    if (open !== -1 && close !== -1) {
      try {
        ctas = vm.runInNewContext('(' + ctasTs.slice(open, close + 1) + ')', { NU_PGD_APPLY_URL: um ? um[1] : '', CTA_RECIPIENT: recipient }, { timeout: 1000 });
      } catch (e) {
        errors.push(`could not evaluate the CTA library in src/data/ctas.ts: ${e.message}`);
      }
    }
  }
  if (!ctas) errors.push('CTA library (src/data/ctas.ts) not readable');

  const emails = new Set();
  const phones = new Set();
  for (const [, src] of [['site.ts', siteTs], ['ctas.ts', ctasTs], ...dataSources]) {
    for (const m of src.matchAll(EMAIL_RE)) emails.add(m[0].toLowerCase());
    for (const m of src.matchAll(/tel:(\+\d{6,15})/g)) phones.add(m[1]);
  }
  for (const m of siteTs.matchAll(/phone:\s*'(\+[\d\s()-]+)'/g)) phones.add(toE164(m[1]));

  const hostsFrom = (src, keys) => {
    const hosts = new Set();
    for (const k of keys) for (const m of src.matchAll(new RegExp(`\\b${k}:\\s*["'\`](https?://[^"'\`]+)["'\`]`, 'g'))) hosts.add(hostKey(m[1]));
    return hosts;
  };
  // partners.ts holds two lists: partners (logo strip) and pressOutlets (media coverage); outlets are not partners
  const partnersTs = readIfExists(join(root, 'src/data/partners.ts'));
  const cut = partnersTs.indexOf('export const pressOutlets');
  const partnerHosts = hostsFrom(cut === -1 ? partnersTs : partnersTs.slice(0, cut), ['url']);
  const pressHosts = new Set([...hostsFrom(readIfExists(join(root, 'src/data/press.ts')), ['url']), ...(cut === -1 ? [] : hostsFrom(partnersTs.slice(cut), ['url']))]);
  const socialHosts = new Set();
  for (const m of siteTs.matchAll(/href:\s*'(https?:\/\/[^']+)'/g)) socialHosts.add(hostKey(m[1]));
  const criticalHosts = new Set();
  if (um) criticalHosts.add(hostKey(um[1]));
  const cu = /COURSES_URL\s*=\s*'(https?:\/\/[^']+)'/.exec(siteTs);
  if (cu) criticalHosts.add(hostKey(cu[1]));

  return { errors, ctas, recipient, emails, phones, partnerHosts, pressHosts, socialHosts, criticalHosts, nuFormUrl: um ? um[1] : null };
}

export function hostKey(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return String(url);
  }
}

/* ------------------------------------------------------------------------------------------- */
/* Templates                                                                                    */
/* ------------------------------------------------------------------------------------------- */

/** Map a route to the Astro page file that produced it ("/news/foo/" -> "src/pages/news/[slug].astro"). */
export function makeTemplateResolver(root = REPO_ROOT) {
  const pagesDir = join(root, 'src/pages');
  const entries = [];
  if (existsSync(pagesDir)) {
    for (const f of listFiles(pagesDir)) {
      const rel = toPosix(relative(pagesDir, f));
      if (!/\.(astro|md|mdx)$/.test(rel)) continue;
      let route = rel.replace(/\.(astro|md|mdx)$/, '');
      if (route === 'index') route = '';
      else if (route.endsWith('/index')) route = route.slice(0, -'/index'.length);
      const segs = route === '' ? [] : route.split('/');
      const dynamic = segs.filter((s) => s.includes('[')).length;
      const pattern = new RegExp(
        '^/' +
          segs
            .map((s) => (s.startsWith('[...') ? '.+' : s.includes('[') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
            .join('/') +
          (segs.length ? '/' : '') +
          '$',
      );
      entries.push({ file: 'src/pages/' + rel, pattern, dynamic, rest: segs.some((s) => s.startsWith('[...')) });
    }
  }
  entries.sort((a, b) => a.dynamic - b.dynamic || Number(a.rest) - Number(b.rest));
  return (route) => {
    const r = route === '/404/' ? '/404/' : route;
    const hit = entries.find((e) => e.pattern.test(r));
    return hit ? hit.file : '(unknown template)';
  };
}

/* ------------------------------------------------------------------------------------------- */
/* Findings and reports                                                                         */
/* ------------------------------------------------------------------------------------------- */

export class Findings {
  constructor() {
    this.items = [];
  }
  add(severity, code, page, message, extra = {}) {
    const item = { severity, code, page, message, ...extra };
    this.items.push(item);
    return item;
  }
  error(code, page, message, extra) {
    return this.add('error', code, page, message, extra);
  }
  warn(code, page, message, extra) {
    return this.add('warning', code, page, message, extra);
  }
  info(code, page, message, extra) {
    return this.add('info', code, page, message, extra);
  }
  get errors() {
    return this.items.filter((f) => f.severity === 'error');
  }
  get warnings() {
    return this.items.filter((f) => f.severity === 'warning');
  }
  get infos() {
    return this.items.filter((f) => f.severity === 'info');
  }
  /** [{code, severity, count, pages, examples}] sorted by severity then count. */
  groups() {
    const map = new Map();
    for (const f of this.items) {
      const k = `${f.severity}|${f.code}`;
      let g = map.get(k);
      if (!g) map.set(k, (g = { severity: f.severity, code: f.code, count: 0, pages: new Set(), items: [] }));
      g.count++;
      if (f.page) g.pages.add(f.page);
      g.items.push(f);
    }
    const rank = { error: 0, warning: 1, info: 2 };
    return [...map.values()].sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
  }
}

const mdCell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

export function mdTable(headers, rows) {
  if (!rows.length) return '_none_\n';
  return `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`).join('\n')}\n`;
}

export function findingsMarkdown(findings, { limitPerGroup = 40 } = {}) {
  let md = '';
  for (const g of findings.groups()) {
    md += `\n### ${g.severity.toUpperCase()} \`${g.code}\` — ${g.count} finding(s) on ${g.pages.size} page(s)\n\n`;
    const rows = g.items.slice(0, limitPerGroup).map((f) => [f.page ?? '', f.message, f.evidence ?? '']);
    md += mdTable(['Page', 'Message', 'Evidence'], rows);
    if (g.items.length > limitPerGroup) md += `\n_… ${g.items.length - limitPerGroup} more in the JSON report._\n`;
  }
  return md || '\n_No findings._\n';
}

/** Write <outDir>/<name><label>.json and .md; returns their paths. */
export function writeReports(cfg, name, data, markdown) {
  mkdirSync(cfg.outDir, { recursive: true });
  const stem = join(cfg.outDir, name + cfg.label);
  const payload = { generatedAt: new Date().toISOString(), config: { base: cfg.base || '/', siteEnv: cfg.siteEnv, siteUrl: cfg.siteUrl, dist: relative(REPO_ROOT, cfg.dist) || cfg.dist }, ...data };
  writeFileSync(stem + '.json', JSON.stringify(payload, null, 2) + '\n');
  writeFileSync(stem + '.md', markdown);
  return { json: stem + '.json', md: stem + '.md' };
}

/** Console summary shared by all checks: group counts plus the first few examples of each group. */
export function printFindings(title, findings, { examples = 3, quiet = false } = {}) {
  const groups = findings.groups();
  for (const g of groups) {
    if (quiet && g.severity !== 'error') continue;
    const mark = g.severity === 'error' ? 'FAIL' : g.severity === 'warning' ? 'WARN' : 'INFO';
    console.log(`  ${mark} ${g.code}: ${g.count} on ${g.pages.size} page(s)`);
    for (const f of g.items.slice(0, examples)) console.log(`       ${f.page ? f.page + ' — ' : ''}${f.message}${f.evidence ? '  ⟨' + trunc(f.evidence, 140) + '⟩' : ''}`);
    if (g.items.length > examples) console.log(`       … ${g.items.length - examples} more`);
  }
  const e = findings.errors.length;
  const w = findings.warnings.length;
  console.log(`${title}: ${e ? 'FAILED' : 'passed'} — ${e} error(s), ${w} warning(s)`);
}

export const gzipSize = (buf) => gzipSync(buf, { level: 9 }).length;
export const kb = (bytes) => (bytes / 1024).toFixed(1) + ' KB';

/** Standard fatal exit for a setup problem (missing dist, unreadable data). */
export function fatal(msg) {
  console.error(msg);
  process.exit(1);
}

export { dirname, existsSync, join, readFileSync, relative, resolve, writeFileSync };
