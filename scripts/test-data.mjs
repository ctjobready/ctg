// Run: node --experimental-strip-types scripts/test-data.mjs   (Node >= 22.6; imports the .ts data files directly)
import { readFileSync } from 'node:fs';
import { facts, sources, CAVEATS } from '../src/data/facts.ts';
import { faqs } from '../src/data/faqs.ts';
import { locations } from '../src/data/countries.ts';
import { timeline } from '../src/data/timeline.ts';

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failed++; };

const md = readFileSync(new URL('../planning/05-facts-register.md', import.meta.url), 'utf8');
const regIds = [...md.matchAll(/^\| ((?:ID|SC|OC|RC|PR|GV|PA|PD|IN|PX)-\d\d) \|/gm)].map((m) => m[1]);
check('register IDs parsed', regIds.length === 94, `${regIds.length} ids`);
check('(b) no duplicate register IDs', new Set(regIds).size === regIds.length);
check('(a) every register ID exists in facts', regIds.every((i) => facts[i]), regIds.filter((i) => !facts[i]).join(','));
check('no extra facts beyond register', Object.keys(facts).every((k) => regIds.includes(k)), Object.keys(facts).filter((k) => !regIds.includes(k)).join(','));
check('fact.id matches key', Object.entries(facts).every(([k, f]) => f.id === k));
check('(c) every sourceId resolves', Object.values(facts).every((f) => f.sourceIds.length > 0 && f.sourceIds.every((s) => sources[s])), Object.values(facts).flatMap((f) => f.sourceIds.filter((s) => !sources[s]).map((s) => f.id + ':' + s)).join(','));
check('(d) every caveat class resolves', Object.values(facts).every((f) => !f.caveat || CAVEATS[f.caveat]));
check('five caveat classes', Object.keys(CAVEATS).sort().join('') === 'EPRSX');
check('OC facts are class S; RC facts R (RC-06 X)', Object.values(facts).filter((f) => f.id.startsWith('OC')).every((f) => f.caveat === 'S') && Object.values(facts).filter((f) => f.id.startsWith('RC')).every((f) => f.caveat === 'R' || f.id === 'RC-06'));
check('stat labels <= 9 words', Object.values(facts).every((f) => !f.stat || f.stat.label.split(/\s+/).length <= 9), Object.values(facts).filter((f) => f.stat && f.stat.label.split(/\s+/).length > 9).map((f) => f.id).join(','));
check('14 faqs, unique ids', faqs.length === 14 && new Set(faqs.map((f) => f.id)).size === 14);
check('(e) every faq.evidence fact exists', faqs.every((q) => q.evidence.every((e) => facts[e])), faqs.flatMap((q) => q.evidence.filter((e) => !facts[e])).join(','));
check('six home FAQs', faqs.filter((q) => q.audiences.includes('home')).length === 6);
check('timeline factIds exist', timeline.every((t) => (t.factIds ?? []).every((i) => facts[i])));
check('(f) locations.length === 15', locations.length === 15, String(locations.length));
check('funders only Kosovo & Albania (World Bank Group)', locations.filter((l) => l.funder).map((l) => l.country + ':' + l.funder).sort().join('|') === 'Albania:World Bank Group|Kosovo:World Bank Group');
check('location ids unique, lat/lon in range', new Set(locations.map((l) => l.id)).size === 15 && locations.every((l) => Math.abs(l.lat) <= 90 && Math.abs(l.lon) <= 180));

const forbidden = [/\bvaluation\b/i, /\bequity\b/i, /CAGR/, /revenue/i, /EBITDA/, /\bROI\b/, /\bLTV\b/, /per trainee \$/i, /laptop/i, /vs LEDP/i, /\bLEDP\b/];
const corpus = [
  ...Object.values(facts).flatMap((f) => [f.id, f.text, f.base, f.note, f.rules, f.stat?.label, f.stat?.value]),
  ...faqs.flatMap((q) => [q.q, q.a]),
  ...timeline.flatMap((t) => [t.title, t.text]),
  ...locations.flatMap((l) => [l.targetGroup, l.skills, l.note, l.funder]),
].filter(Boolean);
const hits = corpus.flatMap((s) => forbidden.filter((r) => r.test(s)).map((r) => `${r} in "${s.slice(0, 50)}"`));
check('(g) no forbidden terms', hits.length === 0, hits.join('; '));
check('no dollar amounts in locations', !locations.some((l) => /\$/.test(JSON.stringify(l))));

const counts = {};
for (const f of Object.values(facts)) counts[f.group] = (counts[f.group] || 0) + 1;
console.log('facts per group:', JSON.stringify(counts), 'total', Object.keys(facts).length);
console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
