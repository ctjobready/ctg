import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP122 (Opus Medium run 4, kit 89; 2026-10-29): privacy completeness, a News list, and wording consistency. Run `npm run build` first.
 *   - Minor: the Privacy Policy names the YouTube channel link (footer and Contact) in the social-link row, the "Links to Other Sites" sentence and the Video line;
 *     the Discovery Education post lists every person as "Name, Title".
 *   - Polish: TalentLEAP states its program caveat once and does not list "planned" levels inside the Level 1 example; "Sainz-Borgo"; "Mr. Md. Shamsul Arefin";
 *     "the U.S." in the Nahid bio; "Co-Founder and Chairman" in Aziz Ahmad's photo captions.
 */
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const text = (rel: string) => decode(html(rel).replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const count = (hay: string, needle: string) => hay.split(needle).length - 1;

const PRIVACY = 'privacy-policy/index.html';
const TL = 'our-model/talentleap/index.html';
const DISCOVERY = 'news/coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners/index.html';
const UPEACE = 'news/coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration/index.html';
const DOICT = 'news/coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment/index.html';

test.describe('WP122, Privacy Policy: YouTube is named wherever the page lists social and share links', () => {
  test('the "Every Service Involved" row reads "LinkedIn, X, Facebook, YouTube, Google Maps"', () => {
    const t = text(PRIVACY);
    expect(t).toContain('LinkedIn, X, Facebook, YouTube, Google Maps Only if you click a share, social or map link');
  });
  test('"Links to Other Sites" says nothing is sent to LinkedIn, X, Facebook, YouTube or Google until you click one', () => {
    expect(text(PRIVACY)).toContain('nothing is sent to LinkedIn, X, Facebook, YouTube or Google until you click one, and then you are on their site.');
  });
  test('the Video line is accurate: no play click and no YouTube link click means YouTube never hears from you', () => {
    const t = text(PRIVACY);
    expect(t).toContain('If you never click play or the YouTube link, YouTube never hears from you.');
    expect(t).not.toContain('If you never click play, YouTube never hears from you.');
  });
  test('the page is dated 2026-10-29 (Last updated and dateModified)', () => {
    const h = html(PRIVACY);
    expect(h).toContain('"dateModified":"2026-10-29"');
    expect(text(PRIVACY)).toMatch(/Last updated:? 29 October 2026|Last updated:? October 29, 2026|2026-10-29/);
  });
});

test.describe('WP122, Discovery Education post: every person is "Name, Title"', () => {
  // WP124 proofread: the list of "Name, Title" entries is separated by semicolons
  test('the tail of the second paragraph reads "Jeni Evans, Senior Director of Educational Partnerships; Ataul Goni Osmani, CodersTrust Bangladesh Country Director; and other officials of CodersTrust."', () => {
    const t = text(DISCOVERY);
    expect(t).toContain('Jeni Evans, Senior Director of Educational Partnerships; Ataul Goni Osmani, CodersTrust Bangladesh Country Director; and other officials of CodersTrust.');
    expect(t).not.toContain('CodersTrust Bangladesh Country Director, Ataul Goni Osmani and other officials');
  });
});

test.describe('WP122, TalentLEAP: the caveat once, and no "planned" levels inside the Level 1 example', () => {
  test('the program caveat appears once (in At a Glance), and Results from CodersTrust Programs opens with the evaluation sentence', () => {
    const t = text(TL);
    expect(count(t, 'not TalentLEAP’s features on their own')).toBe(1);
    expect(count(t, 'not individual TalentLEAP features')).toBe(0);
    expect(t).toContain('Results from CodersTrust Programs The current 100-hour track has not yet been independently evaluated.');
  });
  test('the Example band lists no "Proficient and Expert levels are planned." card, and its footnote is "Example only: the Digital Marketing career path."', () => {
    const h = html(TL);
    const band = h.slice(h.indexOf('id="example"'), h.indexOf('id="different"'));
    const t = decode(band.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
    expect(t).not.toContain('Proficient and Expert levels are planned.');
    expect(t).toContain('Level 1 · Competent');
    expect(t).toContain('Bonus mini-courses in essential business and leadership skills');
    expect(t).toContain('Example only: the Digital Marketing career path.');
    expect(t).not.toContain('Competent is the published first level');
  });
  test('the lede still says once that Proficient and Expert levels are planned', () => {
    expect(count(text(TL), 'Proficient and Expert levels are planned.')).toBe(1);
  });
});

test.describe('WP122, name consistency', () => {
  test('"Sainz Borgo" is on no built page; the UPEACE MOU sentence has its verb in agreement', () => {
    const bad = listPages().filter((p) => /Sainz Borgo/.test(readFileSync(p.file, 'utf8'))).map((p) => p.route);
    expect(bad).toEqual([]);
    expect(text(UPEACE)).toContain('Dr. Juan Carlos Sainz-Borgo, Vice Rector of University for Peace, and Md. Shamsul Haque, CEO of CodersTrust Bangladesh, were present among others.');
    expect(text('news/aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day/index.html')).toContain('Juan Carlos Sainz-Borgo, Vice Rector of the University for Peace, was in the chair.');
  });
  test('DoICT post: "Mr. Md. Shamsul Arefin" (with the period), and no "Md Shamsul Arefin"', () => {
    const t = text(DOICT);
    expect(t).toContain('Mr. Md. Shamsul Arefin, Secretary of the Information and Communication Technology Division');
    expect(t).not.toContain('Md Shamsul Arefin');
  });
  test('Hazrat Ali Nahid’s bio says "a registered tax preparer in the U.S."', () => {
    const t = text('about/team/hazrat-ali-nahid/index.html');
    expect(t).toContain('a registered tax preparer in the U.S. with a Preparer Tax Identification Number (PTIN)');
    expect(t).not.toContain('tax preparer in the USA');
  });
  test('Aziz Ahmad’s two photo captions and alt texts say "Co-Founder and Chairman of CodersTrust"', () => {
    const h = html('about/team/aziz-ahmad/index.html');
    const t = text('about/team/aziz-ahmad/index.html');
    expect(t).toContain('Aziz Ahmad, Co-Founder and Chairman of CodersTrust, at the Nasdaq closing bell ceremony with the U.S. Small Business Administration');
    expect(t).toContain('Aziz Ahmad, Co-Founder and Chairman of CodersTrust, receiving the Supply Chain Diversity and Sustainability Excellence Award, 2019');
    expect(h).toContain('alt="Aziz Ahmad, Co-Founder and Chairman of CodersTrust, at the podium of the Nasdaq closing bell ceremony for the U.S. Small Business Administration"');
    expect(h).toContain('alt="Aziz Ahmad, Co-Founder and Chairman of CodersTrust, receiving the Supply Chain Diversity and Sustainability Excellence Award at the 2019 awards, among four people on stage with a framed certificate"');
    expect(t).not.toContain('Aziz Ahmad, Co-Founder of CodersTrust,');
  });
});
