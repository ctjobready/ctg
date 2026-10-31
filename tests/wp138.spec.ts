import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP138 (Opus High run 13, kit 105). Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp138.spec.ts --project=chromium`.
 * One scorecard model site-wide: the pilot scorecard is SHAPED in co-design (Step 2) and AGREED in the agreement (Step 3), before the
 * first cohort. A discovery session never "sets" it, partners never "set" it alone, and it is never "agreed in co-design".
 *   - Minor 1: Case Studies closing: "In a discovery session, we start planning the scorecard for your own program."
 *   - Polish 2: the model everywhere (Home label, YouthWIDE lead and Step 3, Trial, Governments Steps 2-3) plus a site-wide sweep.
 *   - Polish 3: About "Partnership and Accountability": "Partners agree the scorecard with us ...".
 *   - Polish 4: Local Partners third card body.
 *   - Polish 5: Universities H2 "What Your Students and Your Institution Get".
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&#x2B;|&#43;/g, '+').replace(/&nbsp;/g, ' ');
const flatten = (s: string) => decode(s).replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
const visible = (raw: string) =>
  flatten(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '));
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const onOrAfter = (raw: string, day: string, re = /"dateModified":"(\d{4}-\d{2}-\d{2})"/) => (raw.match(re)?.[1] ?? '') >= day;

/** Every string value in a parsed JSON-LD block. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

/** All text a reader or crawler can take from a built page: visible text, meta descriptions and JSON-LD strings. */
function pageTexts(raw: string): string[] {
  const out = [visible(raw)];
  for (const m of raw.matchAll(/<meta\b[^>]*>/g)) {
    const tag = m[0];
    if (/(?:name|property)="(?:description|og:description|twitter:description|og:title|twitter:title)"/.test(tag)) {
      const c = /\bcontent="([^"]*)"/.exec(tag)?.[1];
      if (c) out.push(flatten(c));
    }
  }
  for (const m of raw.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      out.push(...strings(JSON.parse(m[1])).map(flatten));
    } catch {
      out.push(flatten(m[1]));
    }
  }
  return out;
}

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const MODEL_BREAK = /agreed in co-design|\bsets?\b[^.;!?]{0,80}\bscorecard|\bscorecard\b[^.;!?]{0,60}\b(?:is|are) set\b/i;
/** Sentences that put the pilot scorecard in co-design alone, or in a discovery session / partners' hands alone. */
function offenders(texts: string[]): string[] {
  const found = new Set<string>();
  for (const t of texts) for (const s of sentences(t)) if (/scorecard/i.test(s) && MODEL_BREAK.test(s)) found.add(s.slice(0, 200));
  return [...found];
}

test('Minor 1: Case Studies closing says a discovery session starts planning the scorecard, with the one times sentence', () => {
  const text = main('impact/case-studies/index.html');
  expect(text).toContain('In a discovery session, we start planning the scorecard for your own program. In your inquiry, include two suitable times.');
  expect(text).not.toContain('A discovery session sets the scorecard for your own program.');
  expect(text.match(/two suitable times/g) ?? []).toHaveLength(1);
});

test('Polish 2: the named strings use the model (Home, YouthWIDE, Trial, Governments)', () => {
  const home = main('index.html');
  expect(home).toContain('Five measures, agreed before the first cohort');
  expect(home).not.toContain('Five measures, agreed in co-design');

  const yw = main('programs/youthwide/index.html');
  expect(yw).toContain('A pilot scorecard is agreed before the first cohort.');
  expect(yw).not.toContain('A pilot scorecard is agreed in co-design.');
  expect(yw).toContain('Scope, schedule and the pilot scorecard are agreed, on the agency’s own timeline where it applies.');
  expect(yw).not.toContain('Scope, schedule and success measures are agreed, on the agency’s own timeline where it applies.');

  const trial = main('impact/independent-evaluation/index.html');
  expect(trial).toContain('so a new pilot starts from a scorecard agreed before the first cohort, with independent evaluation welcome.');
  expect(trial).not.toContain('a scorecard agreed in co-design');

  const gov = main('partner-with-us/governments/index.html');
  expect(gov).toContain('Priority groups, tracks, labs and the pilot scorecard are shaped together.');
  expect(gov).not.toContain('and the pilot scorecard are agreed together.');
  expect(gov).toContain('Scope, schedule and the pilot scorecard are agreed on the agency’s own procurement timeline.');
  expect(gov).not.toContain('Scope and schedule follow the agency’s own procurement timeline.');
});

test('Polish 2: site-wide sweep, no built page, meta, JSON-LD or llms.txt sentence has the scorecard "agreed in co-design", "sets" or "set" by a session or partners', () => {
  const found: string[] = [];
  for (const p of listPages()) {
    const bad = offenders(pageTexts(readFileSync(p.file, 'utf8')));
    for (const s of bad) found.push(`${p.route}: ${s}`);
  }
  const llms = readFileSync(join(DIST_DIR, 'llms.txt'), 'utf8');
  for (const s of offenders([flatten(llms)])) found.push(`/llms.txt: ${s}`);
  expect(found).toEqual([]);
});

test('Polish 2: the sweep itself catches the three banned shapes (self-check)', () => {
  expect(offenders(['A pilot scorecard is agreed in co-design.'])).toHaveLength(1);
  expect(offenders(['A discovery session sets the scorecard for your own program.'])).toHaveLength(1);
  expect(offenders(['Partners set the scorecard before the first cohort.'])).toHaveLength(1);
  expect(offenders(['Partners agree the scorecard with us before the first cohort.'])).toHaveLength(0);
  expect(offenders(['The pilot scorecard is shaped together.'])).toHaveLength(0);
  expect(offenders(['A discovery session sets priority groups, tracks and the pilot scorecard.'])).toHaveLength(1);
  expect(offenders(['Tracks and labs are agreed in co-design.'])).toHaveLength(0);
  expect(offenders(['Tracks and labs are agreed in co-design. Scorecard Thresholds If a threshold is missed, a plan follows.'])).toHaveLength(0);
});

test('Polish 3: About "Partnership and Accountability" says partners agree the scorecard with us', () => {
  const text = main('about/index.html');
  expect(text).toContain('Partners agree the scorecard with us before the first cohort and, as agreed in the program scope, receive monthly reports.');
  expect(text).not.toContain('partners set the scorecard');
});

test('Polish 4: Local Partners third card body no longer repeats its heading', () => {
  const text = main('partner-with-us/local-partners/index.html');
  expect(text).toContain('Mobilize Priority Groups');
  expect(text).toContain('Reach the young people your community serves; women are a priority in every program.');
  expect(text).not.toContain('Mobilize priority groups in your community, with women a priority in every program.');
});

test('Polish 5: Universities H2 reads "What Your Students and Your Institution Get", with the anchor and On This Page entry in step', () => {
  const raw = html('partner-with-us/universities/index.html');
  const h2s = [...raw.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => visible(m[1]));
  expect(h2s).toContain('What Your Students and Your Institution Get');
  expect(h2s).not.toContain('What Your Students Get');
  expect(main('partner-with-us/universities/index.html')).not.toContain('What Your Students Get');
  // Every in-page link (On This Page, anchors) resolves to an id on the page.
  const ids = new Set([...raw.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const dead = [...raw.matchAll(/\bhref="#([^"]+)"/g)].map((m) => m[1]).filter((id) => !ids.has(id));
  expect(dead).toEqual([]);
});

test('owner date rule: the pages with their own dateModified whose text changed carry 2026-10-31 or later', () => {
  for (const page of ['index.html', 'about/index.html', 'impact/case-studies/index.html', 'impact/independent-evaluation/index.html', 'partner-with-us/governments/index.html', 'partner-with-us/local-partners/index.html', 'partner-with-us/universities/index.html', 'programs/youthwide/index.html']) {
    expect(onOrAfter(html(page), '2026-10-31'), page).toBe(true);
  }
});

test('register PD-11 states the model: the scorecard is shaped in co-design and agreed before the first cohort', async () => {
  const { fact } = await import('../src/data/facts');
  expect(fact('PD-11').text).toMatch(/^Pilot scorecard shaped in co-design and agreed before the first cohort: /);
  expect(fact('PD-11').text).not.toContain('agreed in co-design');
});
