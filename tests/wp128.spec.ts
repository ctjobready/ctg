import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP128 (Opus High run 3, kit 95: copy fixes). Written test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp128.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  "What Happens When Funding Ends?": the sentence is split, as on Universities ("... localized curricula. Completers join ...") on every page that carries the answer
 *   2  The 70+ partner breakdown is written with semicolons wherever it appears (About, Local Partners, Careers, the register's tile detail)
 *   3  Governance, "How Outcome Records Are Used": "funders receive monthly reports and outcome data with personal details protected."
 *   4  Captions "2016–2017" (Kosovo case study, In the Field, YouthWIDE), never "2016–17"
 *   5  "U.K." in site-authored copy (outside quotations): Employers learner card, Hazrat Ali Nahid's bio
 *   6  YouthWIDE closing funders line: "... include two suitable times for a discovery session."
 *   7  Universities, "The National University Partnership": the lead keeps the disclaimer; the first card does not repeat it; no card body repeats its own label
 *   8  Every learner-story headline ends with a period (a verbatim quotation keeps its own punctuation)
 *   9  Meta descriptions: Governance reads without semicolons; no other description gains one
 */

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
/** Visible text on one line: scripts and styles dropped, every tag a space, entities decoded, space before punctuation closed. */
const visible = (raw: string) =>
  decode(raw.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim();
const text = (rel: string) => visible(html(rel));
const metaContent = (raw: string, key: 'description' | 'og:description' | 'twitter:description') => {
  for (const tag of raw.match(/<meta\b[^>]*>/g) ?? []) {
    if (new RegExp(`(?:name|property)="${key}"`).test(tag)) return decode(/content="([^"]*)"/.exec(tag)?.[1] ?? '');
  }
  return '';
};
function jsonStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => jsonStrings(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => jsonStrings(n, out));
  return out;
}
/** Every string of every JSON-LD block of one built page. */
function jsonLdStrings(raw: string): string[] {
  const out: string[] = [];
  for (const m of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      out.push(...jsonStrings(JSON.parse(m[1])));
    } catch {
      out.push(m[1]);
    }
  }
  return out;
}
const LLMS = join(DIST_DIR, 'llms.txt');
const llms = () => (existsSync(LLMS) ? decode(readFileSync(LLMS, 'utf8')) : '');
const read = (p: { file: string }) => readFileSync(p.file, 'utf8');

// ---------------------------------------------------------------------------------------------------------------------------------
// 1. "What Happens When Funding Ends?"
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 1: "What Happens When Funding Ends?" is two sentences, as on Universities', () => {
  const NEW =
    'Where included in the program scope, what the program builds stays in place: certified local facilitators and localized curricula. Completers join CodersTrust’s alumni network after their three months of mentoring.';
  const OLD = 'localized curricula, and completers';
  const SIX = ['partner-with-us/development-partners/', 'partner-with-us/governments/', 'partner-with-us/foundations/', 'partner-with-us/local-partners/', 'about/governance/', 'our-model/talentleap/'];

  test('the register’s answer (Q10) is the new wording; the Universities variant is unchanged', () => {
    expect(faqs.find((f) => f.id === 'Q10')?.a).toBe(NEW);
    expect(faqs.find((f) => f.id === 'Q10-campus')?.a).toBe(
      'Where included in the program scope, what the program builds stays on your campus: certified local facilitators, localized curricula and campus labs that serve as blended-learning centers. Completers join CodersTrust’s alumni network after their three months of mentoring.',
    );
  });
  for (const route of SIX) {
    test(`${route} prints the answer whole, and its FAQ JSON-LD says the same`, () => {
      const raw = html(`${route}index.html`);
      expect(visible(raw)).toContain(NEW);
      expect(jsonLdStrings(raw)).toContain(NEW);
    });
  }
  test('no built page, JSON-LD block or llms.txt has "localized curricula, and completers"', () => {
    const stale = listPages()
      .filter((p) => decode(read(p)).includes(OLD) || jsonLdStrings(read(p)).some((s) => s.includes(OLD)))
      .map((p) => p.route);
    expect(stale).toEqual([]);
    expect(llms()).not.toContain(OLD);
  });
  test('every page that carries the answer carries the new wording', () => {
    const carriers = listPages().filter((p) => visible(read(p)).includes('what the program builds stays in place'));
    expect(carriers.length).toBeGreaterThanOrEqual(SIX.length);
    expect(carriers.filter((p) => !visible(read(p)).includes(NEW)).map((p) => p.route)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 2. The partner breakdown
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 2: the 70+ partner breakdown uses the hub’s semicolon form everywhere', () => {
  const FORM = '13 government bodies; 20 universities and colleges; 13 development partners and NGOs; and 27 companies and industry bodies.';
  test('the register’s tile detail (SC-11) is the semicolon form', () => {
    expect(fact('SC-11').stat?.detail).toBe(FORM);
  });
  for (const route of ['about/', 'partner-with-us/local-partners/', 'partner-with-us/']) {
    test(`${route} gives the breakdown in the semicolon form`, () => {
      expect(text(`${route}index.html`)).toContain(FORM);
    });
  }
  test('every built page that gives the breakdown gives exactly that string (no plain-comma list)', () => {
    const givers = listPages().filter((p) => /13 government bodies[,;] 20 universities/.test(visible(read(p))));
    expect(givers.map((p) => p.route)).toEqual(expect.arrayContaining(['/about/', '/partner-with-us/local-partners/', '/partner-with-us/']));
    for (const p of givers) {
      const t = visible(read(p));
      expect(t, p.route).toContain(FORM);
      expect(t, p.route).not.toContain('13 government bodies, 20 universities');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 3. Governance, "How Outcome Records Are Used"
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 3: Governance, "How Outcome Records Are Used"', () => {
  test('funders receive monthly reports and outcome data with personal details protected', () => {
    const t = text('about/governance/index.html');
    expect(t).toContain('As agreed in the program scope, funders receive monthly reports and outcome data with personal details protected.');
    expect(t).not.toContain('funders receive data with personal details protected and monthly reports');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 4. Captions "2016–2017"
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 4: the Kosovo captions read 2016–2017', () => {
  const CAPTIONS: [string, string][] = [
    ['impact/case-studies/kosovo-women-in-online-work/index.html', 'Women in Online Work pilot, Kosovo, 2016–2017'],
    ['impact/case-studies/kosovo-women-in-online-work/index.html', 'Women in Online Work trainees, Kosovo, 2016–2017'],
    ['impact/in-the-field/index.html', 'Women in Online Work pilot, Kosovo, 2016–2017'],
    ['impact/in-the-field/index.html', 'Women in Online Work trainees, Kosovo, 2016–2017'],
    ['programs/youthwide/index.html', 'Women in Online Work pilot, Kosovo, 2016–2017'],
  ];
  for (const [route, caption] of CAPTIONS) {
    test(`${route} captions a photograph "${caption}"`, () => {
      expect(html(route)).toMatch(new RegExp(`<figcaption[^>]*>\\s*${caption}\\s*</figcaption>`));
    });
  }
  test('no built page shows "2016–17"', () => {
    const stale = listPages().filter((p) => /2016–17(?!\d)/.test(decode(read(p)))).map((p) => p.route);
    expect(stale).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 5. "U.K."
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 5: "U.K." in site-authored copy', () => {
  test('Employers learner card: "a U.K. company"', () => {
    expect(text('partner-with-us/employers/index.html')).toContain('Secured a remote bookkeeping job with a U.K. company after two months of Digital Accounting training.');
  });
  test('Hazrat Ali Nahid’s bio: "the U.S., U.K., Australia and Canada."', () => {
    expect(text('about/team/hazrat-ali-nahid/index.html')).toContain('his expertise spans the U.S., U.K., Australia and Canada.');
  });
  test('no built page, meta description, JSON-LD block or llms.txt has "UK" outside a quotation', () => {
    const outsideQuotes = (s: string) => s.replace(/“[^”]*”|"[^"]*"/g, ' ');
    const found: string[] = [];
    for (const p of listPages()) {
      const raw = read(p);
      const blocks = [visible(raw), metaContent(raw, 'description'), metaContent(raw, 'og:description'), ...jsonLdStrings(raw)];
      if (blocks.some((b) => /\bUK\b/.test(outsideQuotes(b)))) found.push(p.route);
    }
    expect(found).toEqual([]);
    expect(/\bUK\b/.test(outsideQuotes(llms()))).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 6. YouthWIDE closing funders line
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 6: YouthWIDE closes with a discovery session for funders', () => {
  test('"Funders. In your inquiry, include two suitable times for a discovery session."', () => {
    const t = text('programs/youthwide/index.html');
    expect(t).toContain('Funders. In your inquiry, include two suitable times for a discovery session.');
    expect(t).not.toContain('discovery conversation');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 7. Universities, "The National University Partnership"
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 7: Universities, "The National University Partnership"', () => {
  const ROUTE = 'partner-with-us/universities/index.html';
  const band = () => {
    const raw = html(ROUTE);
    const start = raw.indexOf('id="offer-evidence"');
    expect(start).toBeGreaterThan(0);
    return raw.slice(start, raw.indexOf('</section>', start));
  };
  const item = (id: string) => {
    const m = new RegExp(`<li class="pe__item"[^>]*data-fact="${id}"[^>]*>[\\s\\S]*?</li>`).exec(band());
    expect(m, id).not.toBeNull();
    return m![0];
  };
  const body = (id: string) => visible(/<p class="pe__text"[^>]*>[\s\S]*?<\/p>/.exec(item(id))![0]);
  const DISCLAIMER = 'not learners trained by CodersTrust';

  test('the lead keeps the disclaimer; the cards say it no more', () => {
    const b = visible(band());
    expect(b).toContain('These cards describe the learners being onboarded and National University’s size, not learners trained by CodersTrust.'); // WP136: the band has two cards now, so the lead says "These cards" (WP132 had "The first two cards") (was "...size and the learners being onboarded; they are not learners trained by CodersTrust.")
    expect(b.split(DISCLAIMER).length - 1).toBe(1);
    expect(b).not.toContain('the university’s own learners');
  });
  test('first card: "1.5M+ National University learners being onboarded; CodersTrust has been NU’s official training partner ..."', () => {
    expect(body('SC-04')).toBe(
      '1.5M+ National University learners being onboarded; CodersTrust has been NU’s official training partner for digital career skills and credentials since 2023 and delivers NU post graduate diploma courses.',
    );
  });
  test('second card does not repeat its label: "The world’s second-largest university by enrollment — 3M+ students in 2,257 affiliated colleges."', () => {
    expect(body('SC-05')).toBe('The world’s second-largest university by enrollment — 3M+ students in 2,257 affiliated colleges.');
  });
  // WP136 (Opus High run 11, Polish): the third card (PA-05, University Partners) is gone from the band; the register's PA-05 text is unchanged and the partners are named in the Track Record band's logo alt text.
  test('the band has no third card; the second card does not carry the register’s "National University: " label either', () => {
    expect(band()).not.toContain('data-fact="PA-05"');
    expect(visible(band())).not.toMatch(/University partners: |National University: the world/);
  });
  test('the cards keep their labels and their data-fact attributes; the register is unchanged', () => {
    const labels = [...band().matchAll(/<p class="pe__label"[^>]*>([^<]*)<\/p>/g)].map((m) => m[1]);
    expect(labels).toEqual(['Official Training Partner', 'National University']); // WP136: the 'University Partners' card is gone
    for (const id of ['SC-04', 'SC-05']) {
      expect(item(id), id).toContain(`data-fact="${id}"`);
      expect(item(id), id).toMatch(new RegExp(`<span data-fact="${id}" class="fact"`));
    }
    expect(fact('SC-04').text).toBe(
      '1.5M+ National University learners being onboarded (the university’s own learners, not learners trained by CodersTrust); CodersTrust has been NU’s official training partner for digital career skills and credentials since 2023 and delivers NU post graduate diploma courses',
    );
    expect(fact('SC-05').text).toBe('National University: the world’s second-largest university by enrollment — 3M+ students in 2,257 affiliated colleges');
    expect(fact('PA-05').text.startsWith('University partners: National University (official training partner; post graduate diploma courses)')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 8. Learner-story headlines end with a period
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 8: every learner-story headline ends with a period', () => {
  /** The headline paragraphs of the story cards (`ls__outcome` in LearnerStory, `sc__outcome` in StoryGallery). */
  const headlines = (raw: string) =>
    [...raw.matchAll(/<p class="[^"]*\b(?:ls__outcome|sc__outcome)\b[^"]*"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => visible(m[1]));
  // A card whose headline is a verbatim quotation of the learner keeps the learner’s own punctuation.
  const isQuotation = (h: string) => /^[“"]/.test(h);

  test('every headline on every built page ends with a period, except a verbatim quotation', () => {
    const missing: string[] = [];
    let seen = 0;
    for (const p of listPages()) {
      if (p.route === '/styleguide/') continue;
      for (const h of headlines(read(p))) {
        seen += 1;
        if (!isQuotation(h) && !h.endsWith('.')) missing.push(`${p.route}: ${h}`);
      }
    }
    expect(seen).toBeGreaterThan(30);
    expect(missing).toEqual([]);
  });
  const PINNED: [string, string][] = [
    ['index.html', 'Completed 90+ projects as a freelance graphic designer on Fiverr.'],
    ['index.html', 'Won a company logo design on Freelancer.com, then more clients.'],
    ['partner-with-us/foundations/index.html', 'Completed 90+ projects as a freelance graphic designer on Fiverr.'],
    ['partner-with-us/local-partners/index.html', 'Completed 90+ projects as a freelance graphic designer on Fiverr.'],
    ['partner-with-us/universities/index.html', 'Won a company logo design on Freelancer.com, then more clients.'],
    ['impact/stories/index.html', 'Works as a digital designer.'],
    ['impact/stories/index.html', 'Works as a freelance graphic designer.'],
    ['impact/index.html', 'Secured a first freelance job after the Graphic Designing course, followed by a job offer.'],
  ];
  for (const [route, h] of PINNED) {
    test(`${route.replace(/index\.html$/, '') || '/'} shows the headline "${h.slice(0, 60)}"`, () => {
      expect(headlines(html(route))).toContain(h);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 9. Meta descriptions without semicolons
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 9: meta descriptions prefer a reorder or a split to semicolons', () => {
  const GOV = 'CodersTrust’s offices and leadership, with its safeguarding and data-protection arrangements, set out for funders doing due diligence.';
  test('Governance: the description (and Open Graph description) reads without semicolons and stays within 155 characters', () => {
    const raw = html('about/governance/index.html');
    for (const key of ['description', 'og:description', 'twitter:description'] as const) {
      const d = metaContent(raw, key);
      if (key === 'twitter:description' && d === '') continue;
      expect(d, key).toBe(GOV);
    }
    expect(GOV.length).toBeLessThanOrEqual(155);
    expect(GOV).not.toContain(';');
  });
  test('only the three descriptions that join two full clauses keep a semicolon (a new one fails)', () => {
    const KEPT = ['/news/coderstrust-sets-up-in-india/', '/our-model/jobready-platform/', '/partner-with-us/investors/'];
    const withSemicolon = listPages()
      .filter((p) => metaContent(read(p), 'description').includes(';'))
      .map((p) => p.route)
      .sort();
    expect(withSemicolon).toEqual(KEPT);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// Primary review of WP128: the prefilled emails name the first step as the pages do ("discovery session").
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP128 item 6b: route emails say "discovery session", not "discovery conversation"', () => {
  test('no prefilled email body on any built page asks for times "for a discovery conversation"', () => {
    const offenders: string[] = [];
    for (const p of listPages()) {
      for (const m of readFileSync(p.file, 'utf8').matchAll(/href="mailto:([^"]+)"/g)) {
        const body = decodeURIComponent(m[1].replace(/&amp;/g, '&'));
        if (/discovery conversation/.test(body)) offenders.push(p.route);
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});
