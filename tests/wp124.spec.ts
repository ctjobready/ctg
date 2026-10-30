import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP124 (Opus Medium run 6, kit 91; 2026-10-29): the run-6 findings and one complete proofread of the News archive. Run `npm run build` first.
 *   A1 Minor: the Jahangirnagar teaser and meta description name the Department of ICT (DoICT), as the post body does.
 *   A2 Minor: no single-quoted word or phrase as a primary quotation (double quotes; single only for a quote inside a quote), swept site-wide.
 *   A3 Minor: the dashes restored in "Why We Call It a Digital Factory" and "The Future"; "knowledge-based".
 *   A4 Polish: "A former Danish Army captain"; "Mr. Ahmad" (never "Mr. Aziz" without the surname); American dates (no ordinals, no zero-padded day,
 *      no day-month order); "Professor Rojas Aravena"; Title Case NU Module 10 titles.
 *   B  the archive proofread: every before → after edit is pinned below so it cannot regress.
 * "MoU" inside the Ostitto president's quotation is a person's words, kept verbatim under WP67, and is deliberately not changed.
 */
const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#x27;/g, '’')
    .replace(/&quot;/g, '"')
    .replace(/&#8221;|&#x201D;/gi, '”')
    .replace(/&#8220;|&#x201C;/gi, '“')
    .replace(/&nbsp;/g, ' ');
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');

/** Visible text plus alt / meta / title / aria-label attribute values plus JSON-LD, with URLs removed (a URL is not copy). */
function searchable(raw: string): string {
  const attrs = [...raw.matchAll(/\b(?:alt|content|title|aria-label)="([^"]*)"/g)].map((m) => m[1]).join(' ¶ ');
  const ld = [...raw.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(' ¶ ');
  const body = raw.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
  return decode(`${body} ¶ ${attrs} ¶ ${ld}`)
    .replace(/\\u201d/gi, '”')
    .replace(/https?:\/\/[^\s"'<>)]+/g, ' ')
    .replace(/\s+/g, ' ');
}
const text = (rel: string) => searchable(html(rel));
const pagesMatching = (re: RegExp, prep: (s: string) => string = (s) => s): string[] =>
  listPages().filter((p) => re.test(prep(searchable(readFileSync(p.file, 'utf8'))))).map((p) => p.route);
const post = (slug: string) => `news/${slug}/index.html`;
const metaDescription = (raw: string) => decode(raw.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');

const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';

const JU = 'coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad';
const HER_POWER = '25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative';
const CARNIVAL = 'coderstrust-organizes-career-carnival-for-students-and-affiliates';
const FACTORY = 'why-we-call-it-a-digital-factory';
const FUTURE = 'the-future-building-a-digital-factory-for-bangladesh';
const SDG = 'coderstrust-chairman-mr-aziz-ahmad-receives-sdg-life-achievement-award-from-the-unsgii';
const ROOTS = 'the-man-behind-coderstrust-who-never-forgot-his-roots';
const BUILD_PEACE = 'harnessing-socio-technology-for-positive-impact-and-unity-globally';
const DOICT_TOT = 'coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment';
const UPEACE = 'coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration';
const BCIU = 'coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c';
const AMERICA_WEEK = 'celebrating-america-week-with-the-u-s-embassy-dhaka';
const MILESTONE = 'a-proud-milestone-for-coderstrust';
const EDGE = '1000-trainees-enhancing-digital-government-economy-edge';
const TOP100 = 'coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia';
const UNGA = 'coderstrust-chairman-mr-aziz-ahmad-speaks-on-cybersecurity-artificial-intelligence-at-united-nations-general-assembly-unga-2025';
const NSU = 'mou-signing-ceremony-between-north-south-university-coderstrust';
const LEEDO = 'coderstrust-leedo-join-to-expands-ict-education-to-street-children';
const BASE_STUDY = 'coderstrust-bangladesh-signs-strategic-mou-with-base-study-concern-to-enhance-global-education-opportunities';
const HOLONIQ_2024 = 'coderstrust-recognized-among-holoniqs-2024-south-asia-edtech-100';
const BIMSTEC = 'coderstrust-visited-bimstec-headquarter';
const RMSTU = 'coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation';
const GARDINER = 'gardinar-emphasizes-skill-development-and-access-for-bangladeshis-to-us-digital-platform';
const OSTITTO = 'coderstrust-bangladesh-and-ostitto-join-forces-to-bridge-the-digital-divide';
const DISCOVERY = 'coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners';
const AKIJ = 'coderstrust-provides-corporate-training-to-akij-group-one-of-the-largest-conglomerates-of-south-asia';
const NCTB = 'coderstrust-seals-groundbreaking-mou-with-nctb-paving-the-way-for-competency-based-learning-opportunities';
const PRESS_FREEDOM = 'aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day';

test.describe('WP124 A1, the Jahangirnagar MOU counterparty is the Department of ICT (DoICT) everywhere', () => {
  const TEASER = 'Aziz Ahmad joins the MOU signing between Jahangirnagar University’s Institute of IT and the Department of ICT (DoICT) and speaks on IT skills for youth.';
  test('the post meta description and the News index card both name the DoICT', () => {
    const d = metaDescription(html(post(JU)));
    expect(d).toBe(TEASER);
    expect(d.length).toBeLessThanOrEqual(155);
    expect(text('news/index.html')).toContain(TEASER);
  });
  test('no built page says the MOU was with "the ICT Division"', () => {
    expect(pagesMatching(/Institute of IT and the ICT Division/)).toEqual([]);
  });
});

test.describe('WP124 A2, primary quotations use double quotation marks', () => {
  test('no built page has a single-quoted word or phrase outside a double-quoted span', () => {
    // A quote inside a quote may use single marks, so double-quoted spans are taken out first; an apostrophe never opens with ‘.
    expect(pagesMatching(/(^|[\s(—–-])‘[^’]{2,}’/, (s) => s.replace(/“[^”]*”/g, ' '))).toEqual([]);
  });
  test('the three posts carry “supportive”, “Envisioning Future Bangladesh” and “Career Carnival”', () => {
    expect(text(post(HER_POWER))).toContain('would be a “supportive” force');
    expect(text(post(JU))).toContain('A workshop on “Envisioning Future Bangladesh”');
    expect(text(post(CARNIVAL))).toContain('organized a “Career Carnival” at its Dhaka office');
  });
});

test.describe('WP124 A3, the Digital Factory posts read as whole sentences', () => {
  test('"Why We Call It a Digital Factory" has its dashes back', () => {
    const t = text(post(FACTORY));
    expect(t).toContain('Bangladesh’s greatest natural resource is not beneath the ground—it is in the minds of its young people.');
    expect(t).toContain('remain unemployed or underemployed—not because they lack ability, but because they lack access');
    expect(t).toContain('to transform Bangladesh into a Digital Factory—not a factory of buildings and machines, but a nationwide ecosystem');
    expect(t).toContain('every motivated young person—regardless of geography, gender, or economic background—has access');
    expect(t).toContain('Let’s make Bangladesh a Digital Factory—empowering millions of skilled minds');
  });
  test('"The Future" has its dash and "knowledge-based"; "knowledge based" is on no page', () => {
    expect(text(post(FUTURE))).toContain('This philosophy is more than a slogan—it is a roadmap for transforming Bangladesh into a knowledge-based economy');
    expect(pagesMatching(/knowledge based/)).toEqual([]);
  });
});

test.describe('WP124 A4, names, dates and course titles', () => {
  test('the SDG award post says "A former Danish Army captain"; "Danish captain" is on no page', () => {
    expect(text(post(SDG))).toContain('A former Danish Army captain with an extraordinary dream, Ferdinand envisioned');
    expect(pagesMatching(/Danish captain/)).toEqual([]);
  });
  test('"Mr. Aziz" is never used without the surname: no built page matches /Mr\\. Aziz(?! Ahmad)/', () => {
    expect(pagesMatching(/Mr\. Aziz(?! Ahmad)/)).toEqual([]);
    expect(text(post(SDG))).toContain('In his acceptance speech, Mr. Ahmad honored the legacy');
    expect(text(post(ROOTS))).toContain('Mr. Ahmad continues to embrace a simple lifestyle');
    expect(text(post(BUILD_PEACE))).toContain('Mr. Ahmad invites everyone to join them');
  });
  test('American dates: no ordinal, no zero-padded day and no day-before-month date on any built page', () => {
    expect(pagesMatching(new RegExp(`\\b${MONTH} \\d{1,2}(?:st|nd|rd|th)\\b`))).toEqual([]);
    expect(pagesMatching(new RegExp(`\\b${MONTH} 0\\d\\b`))).toEqual([]);
    expect(pagesMatching(new RegExp(`\\b\\d{1,2} ${MONTH},? \\d{4}\\b`))).toEqual([]);
  });
  test('the dated posts carry "November 16", "Saturday, June 3," and "Saturday, November 4,"', () => {
    expect(text(post(DOICT_TOT))).toContain('The formal closing ceremony was held on November 16 at the ICT Tower in Agargaon, Dhaka.');
    expect(text(post(UPEACE))).toContain('have forged a partnership on Saturday, June 3, at a signing ceremony');
    expect(text(post(JU))).toContain('alongside the event held on Saturday, November 4, at the senate hall');
  });
  test('the UPEACE post names the Rector "Professor Rojas Aravena" and drops "emphasizing on"', () => {
    const t = text(post(UPEACE));
    expect(t).toContain('Emphasizing innovation for peace, Professor Rojas Aravena said');
    expect(t).not.toContain('Professor Aravena');
    expect(pagesMatching(/[Ee]mphasizing on\b/)).toEqual([]);
  });
  for (const course of ['digital-marketing', 'ict']) {
    test(`the NU ${course} page lists Module 10 in Title Case`, () => {
      const t = text(`programs/nu-postgraduate-diploma/${course}/index.html`);
      expect(t).toContain('Internship, Project Work and Seminar');
      expect(t).not.toContain('Internship, project work and seminar');
    });
  }
});

/** B: every archive proofread edit, as [post slug, before, after]. */
const EDITS: [string, string, string][] = [
  [JU, 'virtually joined at the Memorandum of Understanding', 'virtually joined the Memorandum of Understanding'],
  [JU, 'supported by CodersTrust was also organized', 'supported by CodersTrust were also organized'],
  [SDG, 'Chairman and Co-Founder of CodersTrust had the honor', 'Chairman and Co-Founder of CodersTrust, had the honor'],
  [SDG, 'said Mr. Aziz.', 'said Mr. Ahmad.'],
  [SDG, 'working towards a future', 'working toward a future'],
  [ROOTS, 'Mr. Aziz’s journey', 'Mr. Ahmad’s journey'],
  [DOICT_TOT, 'Information and Communication Technology- ICT Division', 'Information and Communication Technology (ICT) Division'],
  [DOICT_TOT, 'gratitude to the ICT division for choosing', 'gratitude to the ICT Division for choosing'],
  [UPEACE, 'mandated by UN General Assembly', 'mandated by the UN General Assembly'],
  [UPEACE, 'Aziz Ahmad, Chairman of CodersTrust and Professor Francisco Rojas Aravena, Rector of University for Peace signed', 'Aziz Ahmad, Chairman of CodersTrust, and Professor Francisco Rojas Aravena, Rector of University for Peace, signed'],
  [UPEACE, 'Aziz Ahmad said, this affiliation', 'Aziz Ahmad said this affiliation'],
  [UPEACE, 'He said, in today’s world where technology is rapidly advancing, digital skills', 'He said that in today’s world, where technology is rapidly advancing, digital skills'],
  [UPEACE, 'Vice Rector, UPEACE, Melissa Mannis, Special Advisor, UPEACE, Dr. Mariateresa Garrido', 'Vice Rector, UPEACE; Melissa Mannis, Special Advisor, UPEACE; Dr. Mariateresa Garrido'],
  [UPEACE, 'Dan O’Bryan, CEO of Roco Plants and Natalia Porras', 'Dan O’Bryan, CEO of Roco Plants; and Natalia Porras'],
  [UPEACE, 'CodersTrust mission is to transform', 'CodersTrust’s mission is to transform'],
  [UPEACE, 'marginalized communities – especially youth and women – with skills', 'marginalized communities—especially youth and women—with skills'],
  [BCIU, 'Chairman and Co-Founder of CodersTrust participated', 'Chairman and Co-Founder of CodersTrust, participated'],
  [AMERICA_WEEK, 'partnership with the Embassy – including', 'partnership with the Embassy—including'],
  [MILESTONE, 'in Bangladesh and beyond and to many more', 'in Bangladesh and beyond, and to many more'],
  [EDGE, 'build resiliency during future crisis,', 'build resiliency during future crises,'],
  [EDGE, 'Information Systems (PMIS) University of Dhaka', 'Information Systems (PMIS), University of Dhaka'],
  [TOP100, 'Government of Bangladesh-GoB', 'Government of Bangladesh (GoB)'],
  [UNGA, 'at the UN General Assembly, 23 September 2025, in New York', 'at the UN General Assembly, September 23, 2025, in New York'],
  [NSU, 'CodersTrust. MOU signed by Professor', 'CodersTrust. The MOU was signed by Professor'],
  [NSU, 'Chairman, Grameen Bank and Aziz Ahmad', 'Chairman, Grameen Bank, and Aziz Ahmad'],
  [LEEDO, 'a prominent EduTech Company,', 'a prominent EdTech company,'],
  [BASE_STUDY, 'Chief Business Officer of CodersTrust Bangladesh, Rana Saha, Finance & Accounts Manager of CodersTrust Bangladesh along with', 'Chief Business Officer of CodersTrust Bangladesh; and Rana Saha, Finance & Accounts Manager of CodersTrust Bangladesh, along with'],
  [HOLONIQ_2024, 'Boston Global Forum added “', 'Boston Global Forum, added, “'],
  [HOLONIQ_2024, 'UNGSII Foundation said “', 'UNGSII Foundation, said, “'],
  [BIMSTEC, 'a promising step towards enhancing', 'a promising step toward enhancing'],
  [RMSTU, 'mission remains clear to build', 'mission remains clear: to build'],
  [RMSTU, 'industry relevant training', 'industry-relevant training'],
  [GARDINER, 'the Economic Officer, responsible for technology issues', 'the Economic Officer responsible for technology issues'],
  [OSTITTO, 'a non-profit organization, dedicated to the welfare of the third gender community', 'a non-profit organization dedicated to the welfare of the third-gender community'],
  [OSTITTO, 'CEO of CodersTrust Bangladesh, and Former Additional Foreign Secretary emphasized', 'CEO of CodersTrust Bangladesh and former Additional Foreign Secretary, emphasized'],
  [OSTITTO, 'recognized the immense potential within the third gender community. He stated', 'recognized the immense potential within the third-gender community. He stated'],
  [OSTITTO, 'previous work with the third gender community, including', 'previous work with the third-gender community, including'],
  [OSTITTO, 'will include five third gender individuals', 'will include five third-gender individuals'],
  [DISCOVERY, 'Chairman and Co-Founder of CodersTrust, Emily Waters, International Senior Project Director of Discovery Education, Jeni Evans, Senior Director of Educational Partnerships, Ataul Goni Osmani, CodersTrust Bangladesh Country Director, and other officials', 'Chairman and Co-Founder of CodersTrust; Emily Waters, International Senior Project Director of Discovery Education; Jeni Evans, Senior Director of Educational Partnerships; Ataul Goni Osmani, CodersTrust Bangladesh Country Director; and other officials'],
  [DISCOVERY, 'termed it as a historic milestone', 'termed it a historic milestone'],
  [AKIJ, 'participants in presence of high officials', 'participants in the presence of high officials'],
  [AKIJ, 'Ministry of Foreign Affairs of Government of Bangladesh', 'Ministry of Foreign Affairs of the Government of Bangladesh'],
  [AKIJ, 'such corporate trainings not only benefits', 'such corporate trainings not only benefit'],
  [NCTB, 'textbook development in Bangladesh on November 26, 2023,', 'textbook development in Bangladesh, on November 26, 2023,'],
  [NCTB, 'Prof. Md. Farhadul Islam, Chairman of NCTB and CodersTrust', 'Prof. Md. Farhadul Islam, Chairman of NCTB, and CodersTrust'],
  [NCTB, 'NCTB (Primary Wing), CodersTrust Chairman Aziz Ahmad, Mosammat Nazma Akhter, Secretary, NCTB, and Ataul Goni Osmani', 'NCTB (Primary Wing); CodersTrust Chairman Aziz Ahmad; Mosammat Nazma Akhter, Secretary, NCTB; and Ataul Goni Osmani'],
  [NCTB, 'a significant step towards that goal', 'a significant step toward that goal'],
  [PRESS_FREEDOM, 'Co-Founder and Chairman CodersTrust and CEO of UTC Associates, Inc. at a recent', 'Co-Founder and Chairman of CodersTrust and CEO of UTC Associates, Inc., at a recent'],
  [PRESS_FREEDOM, 'United Nations Headquarters in New York organized by', 'United Nations Headquarters in New York, organized by'],
  [PRESS_FREEDOM, 'Global Communications, United Nations, Amy Larsen, Director, Strategy and Management at Democracy Forward, Microsoft, Dr. Chris Wiggins', 'Global Communications, United Nations; Amy Larsen, Director, Strategy and Management at Democracy Forward, Microsoft; Dr. Chris Wiggins'],
  [PRESS_FREEDOM, 'Data Science Institute, Columbia University and Dr. Mona Sloane', 'Data Science Institute, Columbia University; and Dr. Mona Sloane'],
  [PRESS_FREEDOM, 'NYU Center for Responsible AI as the panellists', 'NYU Center for Responsible AI, as the panelists'],
  [PRESS_FREEDOM, 'severe underemployment, and unemployment across the Globe', 'severe underemployment and unemployment across the globe'],
  [PRESS_FREEDOM, 'needs to be re-skilled and up-skilled', 'needs to be reskilled and upskilled'],
];

test.describe('WP124 B, the News archive proofread', () => {
  for (const [slug, before, after] of EDITS) {
    test(`${slug}: "${after.slice(0, 70)}"`, () => {
      const t = text(post(slug));
      expect(t).toContain(after);
      expect(t).not.toContain(before);
    });
  }
  test('"panellist" (British spelling) is on no built page', () => {
    expect(pagesMatching(/panellist/i)).toEqual([]);
  });
  test('every changed News post is dated 2026-10-29 (dateModified)', () => {
    const changed = [...new Set([JU, HER_POWER, CARNIVAL, FACTORY, FUTURE, ...EDITS.map((e) => e[0])])];
    // WP126 re-dated the posts that carry `countToday` (and the Digital Factory post) to 2026-10-30: the date is the post's own `updated`
    for (const slug of changed) {
      const updated = /^updated: (\S+)$/m.exec(readFileSync(join('src/content/news', `${slug}.md`), 'utf8'))?.[1];
      expect(['2026-10-29', '2026-10-30'], slug).toContain(updated);
      expect(html(post(slug)), slug).toContain(`"dateModified":"${updated}"`);
    }
  });
});
