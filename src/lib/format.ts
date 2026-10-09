/** Small formatting helpers (American English, UTC-stable so builds are reproducible). */

const dateFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const monthFmt = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });

/** "October 8, 2026" */
export function formatDate(d: Date | string): string {
  return dateFmt.format(typeof d === 'string' ? new Date(d) : d);
}
/** "October 2026" */
export function formatMonth(d: Date | string): string {
  return monthFmt.format(typeof d === 'string' ? new Date(d) : d);
}
/** ISO date (YYYY-MM-DD) for <time datetime>. */
export function isoDate(d: Date | string): string {
  return (typeof d === 'string' ? new Date(d) : d).toISOString().slice(0, 10);
}
/** 130000 -> "130,000" */
export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
}
/** 77.9 -> "77.9%" */
export function formatPercent(n: number, decimals = 1): string {
  return `${formatNumber(n, decimals)}%`;
}
/** Tiny slugger for ids/anchors. */
export function slugify(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
/** Truncate at a word boundary. */
export function truncate(s: string, max = 160): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : cut.length).trimEnd() + '…';
}
/** "A, B and C" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
/**
 * Where does the final period of a sentence belong? Returns null when the text already ends with terminal punctuation (a period,
 * "!", "?" or "…", optionally followed by closing quotes or brackets), so a period is never doubled. Otherwise the text is split into
 * the part before the period and what follows it: a closing quotation mark stays after the period (American style), a closing
 * bracket does not ("(vs the control group)." and "“Earned $600 in 3 months.”").
 */
export function terminalStop(text: string): { body: string; close: string } | null {
  const t = text.trimEnd();
  if (/[.!?…][”’"')\]]*$/.test(t)) return null;
  const m = /^([\s\S]*?)([”’"]+)$/.exec(t);
  return m ? { body: m[1], close: m[2] } : { body: t, close: '' };
}
/**
 * A card prints its heading above a register sentence that often opens with the same words and a colon ("Quality assurance" over
 * "Quality assurance: common practical-assessment rubrics, …"; "Placement support" over "Placement support components: …";
 * "Connectivity-light delivery" over "Connectivity-light: runs on …"). When the words before the first colon are the heading or
 * a close prefix of it (or the heading is a prefix of them), the echo is not printed: the sentence starts after the colon, with
 * a capital. Any other text, including one whose colon introduces something else, comes back unchanged.
 */
export function dropTitleEcho(title: string, text: string): string {
  const colon = text.indexOf(':');
  if (colon < 3 || colon > 60) return text;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const label = norm(text.slice(0, colon));
  const head = norm(title);
  if (!label || !head || !(head.startsWith(label) || label.startsWith(head))) return text;
  const rest = text.slice(colon + 1).trimStart();
  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : text;
}
/**
 * Visible text with arrows, as an accessible name: screen readers announce "→" as "right arrow", so a sequence reads as its steps
 * ("Learn → Earn → Prosper" becomes "Learn, then Earn, then Prosper"), like the model diagram's own label. Text without arrows is unchanged.
 */
export function spokenSteps(text: string): string {
  return text.replace(/\s*→\s*/g, ', then ');
}
/** Strip tags for plain-text use (FAQ schema, meta descriptions). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
/**
 * Split a display figure into prefix / number / suffix for count-up:
 * "77.9%" -> {prefix:"", num:77.9, decimals:1, suffix:"%", grouped:false}
 * "130,000+" -> {prefix:"", num:130000, decimals:0, suffix:"+", grouped:true}
 */
export function parseFigure(display: string) {
  const m = display.match(/^([^\d-]*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  const raw = m[2];
  return {
    prefix: m[1],
    num: Number(raw.replace(/,/g, '')),
    decimals: raw.includes('.') ? raw.split('.')[1].length : 0,
    suffix: m[3],
    grouped: raw.includes(','),
  };
}
