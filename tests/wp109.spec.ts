import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP109 (Sonnet XHigh run 5 and Sonnet Max run 1, kit 75): polish batch. Test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp109.spec.ts --project=chromium`.
 *   - Item 1: Governance's "Last updated" and dateModified are the day its source last changed per git (2026-10-24).
 *   - Item 4: Fahim Sheikh's <title> is his name only; the role stays in the description and on the page.
 *   - Item 5: the 2014 recognition line says Morten Lund was a co-founder of CodersTrust.
 *   - Item 6: the employment table's row labels are "Before Training" and "October 2026 Survey".
 *   - Item 7: site-authored "US" is "U.S." (source copy scanned below; names, URLs and currency codes are not touched).
 *   - Item 8: the Mentors lede shows only the SC-09 instructors part.
 *   - Item 9: the pages and news posts changed here carry 2026-10-29 (Governance keeps its item 1 date).
 */

const distHtml = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"');
const titleOf = (html: string) => decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');
const descOf = (html: string) => decode(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '');

function walkSrc(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  if (statSync(dir).isFile()) return out.concat(dir);
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkSrc(full, out);
    else out.push(full);
  }
  return out;
}

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP109 item 1: Governance is dated by its last content change (git: 2026-10-24)', () => {
  test('the visible "Last updated" date and the JSON-LD dateModified are October 24, 2026', () => {
    const html = distHtml('about/governance/index.html');
    expect(html).toMatch(/<time datetime="2026-10-24"[^>]*>October 24, 2026<\/time>/);
    expect(html).not.toContain('October 17, 2026');
    expect(html).toMatch(/"dateModified":"2026-10-24"/);
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP109 item 4: Fahim Sheikh’s <title> names him without the abridged role', () => {
  test('the title is "Md. Fahim Sheikh | CodersTrust" and the description keeps his role', () => {
    const html = distHtml('about/team/fahim-sheikh/index.html');
    expect(titleOf(html)).toBe('Md. Fahim Sheikh | CodersTrust');
    expect(descOf(html)).toContain('marketing, project and training operations');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP109 item 5: the 2014 recognition line says co-founder of CodersTrust', () => {
  test('Recognition prints the full sentence, and the early-investor line elsewhere is unchanged', () => {
    const html = distHtml('about/recognition/index.html');
    expect(html).toContain('Some 2014 coverage described Morten Lund as a co-founder of CodersTrust.');
    expect(html).not.toContain('Some 2014 coverage described Morten Lund as a co-founder. ');
    expect(distHtml('about/index.html')).toContain('early Skype investor Morten Lund');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP109 item 6: employment table row labels', () => {
  test('the rows read "Before Training" and "October 2026 Survey", with no repeated parenthesis', () => {
    const html = distHtml('impact/outcomes-2026/index.html');
    expect(html).toMatch(/<th scope="row"[^>]*>Before Training<\/th>/);
    expect(html).toMatch(/<th scope="row"[^>]*>October 2026 Survey<\/th>/);
    expect(html).not.toContain('Before (Before Training)');
    expect(html).not.toContain('October 2026 Survey (Surveyed Completers)');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP109 item 7: site-authored "US" is "U.S."', () => {
  // Source copy the site authors (news, team bios, photo captions, facts, endorsements). Code, URLs, currency codes ("US$") and
  // quoted external titles are not in scope; comment lines are ignored.
  const SCOPE = ['src/content/news', 'src/content/team', 'src/data/photos.ts', 'src/data/endorsements.ts', 'src/data/facts.ts'];
  const bare = /(?<![\w.\-/'])US(?![\w$/])/;
  test('no bare "US" remains in site-authored copy', () => {
    const hits: string[] = [];
    for (const dir of SCOPE) {
      for (const file of walkSrc(dir)) {
        if (!/\.(md|ts)$/.test(file)) continue;
        readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
          const t = line.trim();
          if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
          if (bare.test(line)) hits.push(`${file}:${i + 1}`);
        });
      }
    }
    expect(hits).toEqual([]);
  });
  test('the In the Field captions use "U.S." for the Chamber and the Small Business Administration', () => {
    const photos = readFileSync('src/data/photos.ts', 'utf8');
    expect(photos).toContain('at the U.S. Chamber of Commerce');
    expect(photos).toContain('with the U.S. Small Business Administration');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP109 item 8: the Mentors lede keeps the instructors figure only', () => {
  test('the lede reads "150+ instructors and mentors." and SC-09 stays in the register', () => {
    const html = distHtml('about/mentors/index.html');
    expect(html).toContain('150+ instructors and mentors.');
    expect(html).not.toContain('150+ skill and certification courses delivered');
    expect(readFileSync('src/data/facts.ts', 'utf8')).toContain('150+ skill and certification courses delivered; 150+ instructors and mentors');
  });
});

// --------------------------------------------------------------------------------------------------------------------------------
test.describe('WP109 item 9: dates on the changed pages', () => {
  test('the news posts changed here carry updated 2026-10-29', () => {
    for (const slug of [
      'coderstrust-bangladesh-partners-with-us-based-remoteintegrity-llc-to-expand-global-career-opportunities',
      'gardinar-emphasizes-skill-development-and-access-for-bangladeshis-to-us-digital-platform',
    ]) {
      expect(readFileSync(`src/content/news/${slug}.md`, 'utf8'), slug).toMatch(/^updated: 2026-10-29$/m);
    }
  });
  test('Recognition, Fahim Sheikh and the outcomes page are dated 2026-10-29', () => {
    expect(distHtml('about/recognition/index.html')).toMatch(/"dateModified":"2026-10-29"/);
    expect(distHtml('about/team/fahim-sheikh/index.html')).toMatch(/"dateModified":"2026-10-29"/);
    expect(distHtml('impact/outcomes-2026/index.html')).toContain('2026-10-29');
  });
});
