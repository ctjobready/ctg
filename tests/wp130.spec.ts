import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP130 (Opus High run 5, kit 97): route emails, Investors repetition, TalentLEAP example, Universities band lead.
 * Test-first: run `npm run build`, then `PORT=<port> npx playwright test tests/wp130.spec.ts --project=chromium`.
 *   - Minor 1: the prefilled route emails ask for times "for a discovery session" (the pages' first step), not "for a call";
 *     the Investors email asks for times "for an introduction call", as its page's first step reads.
 *   - Minor 2: Investors names the AWS partnership once (the partner paragraph) and NU's official-training-partner role once (the next band).
 *   - Polish 3: TalentLEAP's example lead says Level 1 is Competent and the other levels are planned.
 *   - Polish 4: Universities' NU band lead covers only its first two cards.
 *   - Owner rule (2026-10-31): pages whose visible text changes carry dateModified 2026-10-31 or later.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const visible = (raw: string) =>
  decode(raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const main = (rel: string) => visible(/<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '');
const onOrAfter = (raw: string, day: string) => (raw.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? '') >= day;

/** Every prefilled email on built pages: subject and decoded body. */
function mails(): { route: string; subject: string; body: string }[] {
  const out: { route: string; subject: string; body: string }[] = [];
  for (const p of listPages()) {
    for (const m of readFileSync(p.file, 'utf8').matchAll(/href="mailto:([^"]+)"/g)) {
      const q = new URLSearchParams(decode(m[1]).split('?')[1] ?? '');
      out.push({ route: p.route, subject: q.get('subject') ?? '', body: q.get('body') ?? '' });
    }
  }
  return out;
}

test.describe('WP130 Minor 1: route emails name the first step as the pages do', () => {
  test('no prefilled email asks for "Two suitable times for a call"', () => {
    const offenders = mails().filter((m) => /Two suitable times for a call\b/.test(m.body)).map((m) => `${m.route}: ${m.subject}`);
    expect([...new Set(offenders)]).toEqual([]);
  });

  test('the funding, YouthWIDE grant, Campus, Work and talent emails ask for "Two suitable times for a discovery session:"', () => {
    const all = mails();
    for (const prefix of ['Funding partnership', 'YouthWIDE cohort grant', 'JobReady@Campus inquiry', 'JobReady@Work inquiry', 'Talent request']) {
      const found = all.filter((m) => m.subject.startsWith(prefix));
      expect(found.length, prefix).toBeGreaterThan(0);
      for (const m of found) expect(m.body, prefix).toContain('Two suitable times for a discovery session: ');
    }
  });

  test('the Investors email asks for "Two suitable times for an introduction call:", as the page’s first step reads', () => {
    expect(main('partner-with-us/investors/index.html')).toContain('Your first step: an introduction call.');
    const inv = mails().filter((m) => m.route === '/partner-with-us/investors/' && /Firm: /.test(m.body));
    expect(inv.length).toBeGreaterThan(0);
    for (const m of inv) expect(m.body).toContain('Two suitable times for an introduction call: ');
  });
});

test.describe('WP130 Minor 2: Investors states each credential once', () => {
  test('"AWS Authorized Training Partner" appears once in the page body', () => {
    expect(main('partner-with-us/investors/index.html').match(/AWS Authorized Training Partner/g) ?? []).toHaveLength(1);
  });

  test('the partner paragraph names National University without its role; the next band states the role and its date', () => {
    const text = main('partner-with-us/investors/index.html');
    expect(text).toContain('University partners include National University and The City College of New York, a memorandum of understanding (MOU) partner since 2024.');
    expect(text).not.toContain('National University (official training partner)');
    expect(text).toContain('CodersTrust has been NU’s official training partner for digital career skills and credentials since 2023');
  });
});

test.describe('WP130 Polish 3 and 4', () => {
  test('TalentLEAP example lead: Level 1 is Competent; Proficient and Expert are planned', () => {
    const text = main('our-model/talentleap/index.html');
    expect(text).toContain('TalentLEAP organizes skills into career paths with progressive levels. In this example, Level 1 is Competent; Proficient and Expert are the planned next levels.');
    expect(text).not.toContain('In this example the levels are Competent, Proficient and Expert.');
  });

  test('Universities NU band lead covers its first two cards only', () => {
    const text = main('partner-with-us/universities/index.html');
    expect(text).toContain('The first two cards describe the learners being onboarded and National University’s size, not learners trained by CodersTrust.'); // WP132: the lead names the first two cards in their order, no dangling "they"
    expect(text).not.toContain('These figures describe National University’s size');
  });
});

test.describe('WP130 owner rule: changed pages are dated 2026-10-31 or later', () => {
  // Universities takes the build date (no date of its own), so it needs no stamp.
  for (const page of ['partner-with-us/investors/index.html', 'our-model/talentleap/index.html']) {
    test(page, () => {
      expect(onOrAfter(html(page), '2026-10-31')).toBe(true);
    });
  }
});
