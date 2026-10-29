import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';

/**
 * WP121 (Opus Medium run 3, kit 88; 2026-10-29): News archive light edits. Run `npm run build` first.
 *   - Minor: the RemoteIntegrity headline had a stray comma before "to"; Juan Carlos Sainz Borgo is UPEACE's Vice Rector (the May 2023 post said "Vice President").
 *   - Polish: "High-Demand" hyphen; the BIMSTEC headline names the Secretariat and has a subject; "Senior Director of Educational Partnerships".
 */
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const text = (rel: string) => decode(readFileSync(join(DIST_DIR, rel), 'utf8').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');
const NEWS = text('news/index.html');

test.describe('WP121', () => {
  test('RemoteIntegrity headline has no comma before "to" (post and News index)', () => {
    const h = 'CodersTrust Bangladesh Partners with U.S.-Based RemoteIntegrity to Expand Global Career Opportunities';
    expect(text('news/coderstrust-bangladesh-partners-with-us-based-remoteintegrity-llc-to-expand-global-career-opportunities/index.html')).toContain(h);
    expect(NEWS).toContain(h);
  });
  test('Sainz Borgo is Vice Rector of the University for Peace', () => {
    const t = text('news/aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day/index.html');
    expect(t).toContain('Vice Rector of the University for Peace');
    expect(t).not.toContain('Vice President of the University for Peace');
  });
  test('headlines: "High-Demand" and the BIMSTEC Secretariat', () => {
    expect(NEWS).toContain('1,000 People to Be Trained in High-Demand IT Skills | Sheikh Kamal ICT Incubator Training');
    expect(NEWS).toContain('CodersTrust Visits the BIMSTEC Secretariat to Discuss Science, Technology and Innovation Cooperation');
  });
  test('Discovery Education post: "Senior Director of Educational Partnerships"', () => {
    expect(text('news/coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners/index.html')).toContain('Jeni Evans, Senior Director of Educational Partnerships;'); // WP124: the list of people is semicolon-separated
  });
});
