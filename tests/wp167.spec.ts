import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { topLinksFor, footerBottomLinksFor, promo } from '../src/data/nav';
import { DIST_DIR } from './support/env';

/**
 * WP167 (owner approvals of 2026-11-23 on the marketing review of 2026-11-21): the register-wording changes (RC-01/RC-04 on Home slide 1, RC-02's phone short form on the announcement bar, ID-11 on About,
 * PA-11 on Recognition and Media) and the structural changes (one "News and Blog" menu item, the bar's single link, the trial page's title, the Governance lead, the Mechanism card heading).
 * Run `npm run build`, then `PORT=4917 npx playwright test tests/wp167.spec.ts --project=chromium`. Every test reads the built files or the data modules.
 */

const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
const visible = (raw: string) =>
  decode(
    raw
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<span class="sr-only">[\s\S]*?<\/span>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;:!?])/g, '$1')
    .trim();
const dateModified = (raw: string) => /"dateModified":"([^"]+)"/.exec(raw)?.[1];

test.describe('WP167: the register-wording changes', () => {
  test('Home slide 1 gives the base under the dollar figure (RC-01, RC-04)', () => {
    const home = visible(html('index.html'));
    // WP172 (owner decision 2026-11-27): the published study's figures (about $25 on about $68; it was the 2022 report's $27 on $66)
    expect(home).toContain('about $25 more a month on a control-group mean of about $68.');
    expect(fact('RC-04').text).toContain('on a control-group mean of about $68');
  });

  test('the announcement bar: the phone short form is a sentence and the bar keeps the one link "Impact Survey 2026" (RC-02)', () => {
    expect(promo.short).toBe('+10 percentage points in employment for women offered a place.'); // WP172 (owner decision 2026-11-27): the published study's figures (it was +10.3)
    expect(promo.links.map((l) => l.label)).toEqual(['Impact Survey 2026']);
    const home = html('index.html');
    expect(home).toContain('promo-bar__short');
    expect(visible(home)).toContain('+10 percentage points in employment for women offered a place.');
    expect(visible(home)).not.toContain('percentage points employed.');
  });

  test('About opens with the short identity sentence (ID-11, SC-03); Governance keeps the full one', () => {
    const about = html('about/index.html');
    expect(visible(about)).toContain('CodersTrust is headquartered in New York and has worked in 16 countries and territories.');
    expect(visible(about)).not.toContain('Additional country and regional offices are planned.');
    expect(visible(html('about/governance/index.html'))).toContain('CT USA, Inc.');
    expect(dateModified(about)).toBe('2026-11-27'); // WP172 (owner decision 2026-11-27: the published study's trial figures) moved it to 2026-11-27
  });

  test('PA-11 names the UPEACE appointment in full and the SDG award’s issuer; Recognition and Media prints both', () => {
    const text = fact('PA-11').text;
    expect(text).toContain('Global Ambassador of the University for Peace (UPEACE), the UN-Mandated University (2026)');
    expect(text).toContain('SDG Life Achievement Award, UNGSII Foundation (2025)');
    expect(text).not.toContain('Global UPEACE Ambassador');
    const rec = visible(html('about/recognition/index.html'));
    expect(rec).toContain('Global Ambassador of the University for Peace (UPEACE), the UN-Mandated University');
    expect(rec).toContain('SDG Life Achievement Award, UNGSII Foundation');
    expect(dateModified(html('about/recognition/index.html'))).toBe('2026-11-23');
  });
});

test.describe('WP167: the structural changes', () => {
  test('one "News and Blog" item in the header while a post is live; News alone with none; the footer keeps both', () => {
    expect(topLinksFor(true).map((l) => l.label)).toEqual(['News and Blog']);
    expect(topLinksFor(true)[0].href).toBe('/news/');
    expect(topLinksFor(false).map((l) => l.label)).toEqual(['News']);
    expect(footerBottomLinksFor(true).map((l) => l.label)).toEqual(['News', 'Blog', 'Privacy', 'Accessibility']);
    const home = html('index.html');
    expect(home).toContain('>News and Blog<');
    expect(/class="site-nav__link"[^>]*>\s*Blog\s*</.test(home)).toBe(false);
  });

  test('the News page links the Blog under its lead', () => {
    const news = html('news/index.html');
    expect(visible(news)).toContain('Read the Blog: Essays by Aziz Ahmad');
    expect(news).toMatch(/href="[^"]*\/blog\/"/);
  });

  // WP172 (owner decision 2026-11-27): the published study's figures (+10; it was +10.3)
  test('the trial page’s title is "Randomized Trial: +10 Percentage Points | CodersTrust"', () => {
    expect(/<title>([^<]*)<\/title>/.exec(html('impact/independent-evaluation/index.html'))?.[1]).toBe('Randomized Trial: +10 Percentage Points | CodersTrust');
  });

  test('the Governance lead opens with what can be checked now (R1-09)', () => {
    const gov = visible(html('about/governance/index.html'));
    expect(gov).toContain('Two contracting entities, named leadership, safeguarding agreed before enrollment, an independent randomized trial and audited accounts on request. What is specific to your program is confirmed with you in co-design.');
    expect(gov).not.toContain('are confirmed with the funder during co-design.');
    expect(dateModified(html('about/governance/index.html'))).toBe('2026-11-27'); // WP172 (owner decision 2026-11-27: the published study's trial figures) moved it to 2026-11-27
  });

  test('the Home Mechanism card is headed "An AI-Supported Flipped Classroom" and keeps the owner’s delivery-model sentence (R1-16)', () => {
    const home = visible(html('index.html'));
    expect(home).toContain('An AI-Supported Flipped Classroom');
    expect(home).not.toContain('AI-Supported Blended Training');
    expect(home).toContain('all lectures are pre-recorded and an AI Tutor supports every learner');
  });
});
