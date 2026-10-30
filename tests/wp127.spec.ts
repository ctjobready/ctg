import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { faqs } from '../src/data/faqs';
import { DIST_DIR } from './support/env';
import { listPages } from './support/pages';

/**
 * WP127 (Opus High run 2, kit 94: the serial-comma rule finished site-wide, and copy Polish). Written test-first: run `npm run build`, then
 * `PORT=<port> npx playwright test tests/wp127.spec.ts --project=chromium`. The tests read the built files; none opens a browser.
 *   1  Recognition: the photo band and its "On This Page" entry are "Forums in Photographs" (the band shows no award); the About menu describes the page
 *      as "Listings, honors and press coverage."
 *   2  No serial comma anywhere (owner style): a site-wide scan of every built page (body text, meta and Open Graph descriptions, titles, JSON-LD) and llms.txt, News and
 *      team bios included, plus pinned assertions for the strings the review named.
 *   3  Programs, YouthWIDE card: "...progress toward paid work, not only enrollment, as agreed in the program scope."
 *   4  Local Partners, "Mentoring and Placement": "with placement support into local, remote and global work."
 *   5  Investors, "Contracts and Recognition": the HolonIQ item is a sentence ("Listed in ... (STEAM category) and 2024.")
 *   6  Recognition lede: "CodersTrust’s Co-Founder and Chairman, Aziz Ahmad,"
 *   7  Impact, 3M+ tile: the note is "An ambition, not a result." (line 1 already gives June 30, 2032)
 *   8  TalentLEAP FAQ "Is There Independent Evidence?": the citation ends with a period and the DOI link follows it (the answer and its JSON-LD)
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
// Pages without a date of their own carry the build date, so a later build dates them later: dates are checked "on or after".
const onOrAfter = (raw: string, day: string) => (raw.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1] ?? '') >= day;

// ---------------------------------------------------------------------------------------------------------------------------------
// The serial-comma checker. It is a heuristic, kept simple on purpose: in one line of text, a ", and" or ", or" counts as closing a series when the stretch of
// text since the last sentence boundary holds at least two earlier comma-separated items ("a, b, and c"). Left alone:
//   - text inside quotation marks (a verbatim quote keeps its own punctuation);
//   - a conjunction that introduces a new clause by a subject pronoun or possessive (", and we use it", ", and its work") or a person (", and Professor ...", ", and Dr. ..."
//     after a name and title: a pair of people, not a series);
//   - the short, explicit ALLOWED list below: sentences that join clauses, or set a phrase off in commas, which the pattern would wrongly flag.
// A list whose items themselves hold "and" is written with semicolons ("a; b and c; and d") or reordered, so it never reaches this pattern.
// ---------------------------------------------------------------------------------------------------------------------------------
const ABBREVIATIONS = String.raw`(?:Mr|Mrs|Ms|Dr|Md|Prof|St|Inc|Ltd|U\.S|D\.C|vs|No)`;
const BOUNDARY = new RegExp(String.raw`(?<!\b${ABBREVIATIONS})[.;:!?]\s|\s—|—`, 'g');
const CLAUSE_START = /^(?:we|you|it|they|he|she|then|there|your|its|his|their|our)\b/i;
const PERSON_START = /^(?:Professor|Prof\.|Dr\.|Mr\.|Mrs\.|Ms\.|Md\.|Aziz Ahmad|Ferdinand|CodersTrust Bangladesh CEO|his team)/;

/** Sentences the pattern flags although they are not a series of three or more. `has` is a fragment of the flagged sentence; each entry says why it is kept. */
const ALLOWED: { has: string; why: string }[] = [
  { has: 'youtube-nocookie.com, YouTube’s privacy-enhanced domain, and YouTube sees', why: 'an apposition, then a new clause' },
  { has: '78.2% at the October 2026 survey, and median monthly income rose', why: 'two clauses joined' },
  { has: 'monthly reports and follow-up surveys at 3, 6 and 12 months, and independent evaluation is welcome', why: 'two clauses joined; the numbers are one phrase' },
  { has: 'Early press coverage, 2014–2016, and World Bank coverage', why: 'the years are set off as a parenthetical' },
  { has: 'spoke at a start-up event at In5, Dubai Internet City, and met investors', why: 'one subject, two verbs; the place name carries its own comma' },
  { has: 'STEM students must continually reskill themselves, and CodersTrust plays', why: 'two clauses joined' },
  { has: 'particularly the youth, and takes pride', why: 'one subject, two verbs, after an apposition' },
  { has: 'for your team, from a needs assessment to interactive workshops, and sources job-ready talent', why: 'one subject, two verbs; the "from ... to ..." phrase is a parenthetical' },
  { has: 'she embarked on her journey, and within a few years', why: 'two clauses joined' },
  { has: 'with placement support alongside, and attendance is tracked', why: 'a parenthetical, then a new clause' },
  { has: 'for freelancing marketplaces and local jobs, and on women’s empowerment', why: 'two items only; the comma keeps the first item, which holds "and", apart' },
  { has: 'set per country, and agree each track’s AI content', why: 'one subject, two verbs; "set per country" is a parenthetical' },
  { has: 'with special focus on women, and train 100,000 youth', why: 'one subject, two verbs; "with special focus on women" is a parenthetical' },
  { has: 'mentorship guidelines and trainer training, and trained 2,400 women directly', why: 'two verbs; the first object is a list of its own' },
  { has: 'which used CodersTrust’s curriculum, and 15,027 enrollments', why: 'two figures only; the first carries a relative clause' },
  { has: 'job postings requiring AI skills grew 69% vs. 9% for all postings, and workers with AI skills', why: 'two clauses joined' },
  { has: 'has received appointments and honors, and CodersTrust’s work has been covered in the press', why: 'two clauses joined; "Aziz Ahmad" is an apposition (WP129)' },
  { has: 'fell 21% relative to manual-intensive jobs, and image-creation postings fell 17%', why: 'two clauses joined' },
];

interface Series {
  sentence: string;
}
const stripQuotes = (line: string) =>
  line
    .replace(/“[^”]*”|"[^"]*"/g, ' QQ ')
    // a quote that runs across paragraphs: an opening mark with no close ends the line, a closing mark with no open starts it
    .replace(/“.*$/, ' QQ')
    .replace(/^.*”/, 'QQ ');

/** Every ", and" / ", or" in `line` that closes a series of three or more, apart from the allowed sentences and the two clause rules. */
function seriesIn(line: string, { allow = true } = {}): Series[] {
  const l = stripQuotes(line);
  const out: Series[] = [];
  const re = /, (and|or) /g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(l))) {
    const before = l.slice(0, m.index);
    let start = 0;
    for (const b of before.matchAll(BOUNDARY)) start = (b.index ?? 0) + b[0].length;
    const seg = before.slice(start);
    if (seg.split(', ').length < 2) continue;
    const rest = l.slice(m.index + m[0].length);
    if (CLAUSE_START.test(rest) || PERSON_START.test(rest)) continue;
    const sentence = `${seg}, ${m[1]} ${rest.split(/[.;!?]\s|[.;!?]$/)[0]}`;
    if (allow && ALLOWED.some((a) => sentence.includes(a.has))) continue;
    out.push({ sentence });
  }
  return out;
}

/** Text blocks of one built page: body lines (block tags break lines, inline tags do not), meta and Open Graph descriptions, the title, the JSON-LD strings. */
const INLINE_TAG = /<\/?(?:a|em|strong|span|b|i|abbr|cite|code|mark|sub|sup|small|time|u|bdi|q|wbr)(?:\s[^>]*)?>/gi;
function jsonStrings(node: unknown, out: string[] = []): string[] {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((n) => jsonStrings(n, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => jsonStrings(n, out));
  return out;
}
function textBlocks(raw: string): { kind: string; lines: string[] }[] {
  const body = decode(
    raw
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, '\n')
      .replace(INLINE_TAG, '')
      .replace(/<[^>]+>/g, '\n'),
  ).replace(/[ \t ]+/g, ' ');
  const meta = (['description', 'og:description', 'twitter:description'] as const).map((k) => metaContent(raw, k)).filter(Boolean);
  const title = [...raw.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
  const jsonLd: string[] = [];
  for (const m of raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      jsonLd.push(...jsonStrings(JSON.parse(m[1])).flatMap((s) => s.split('\n')));
    } catch {
      jsonLd.push(m[1]);
    }
  }
  return [
    { kind: 'text', lines: body.split('\n') },
    { kind: 'meta', lines: meta },
    { kind: 'title', lines: title },
    { kind: 'json-ld', lines: jsonLd },
  ];
}
const LLMS = join(DIST_DIR, 'llms.txt');
function everyText(): { where: string; lines: string[] }[] {
  const out: { where: string; lines: string[] }[] = [];
  for (const p of listPages()) for (const b of textBlocks(readFileSync(p.file, 'utf8'))) out.push({ where: `${p.route} ${b.kind}`, lines: b.lines });
  if (existsSync(LLMS)) out.push({ where: '/llms.txt', lines: decode(readFileSync(LLMS, 'utf8')).split('\n') });
  return out;
}

test.describe('WP127 item 2: the serial-comma checker', () => {
  test('flags a series of three or more closed by ", and" or ", or"', () => {
    expect(seriesIn('We trained youth in coding, design, and marketing.')).toHaveLength(1);
    expect(seriesIn('Pay online, transfer by phone, or visit a campus.')).toHaveLength(1);
    expect(seriesIn('He cited estimates that costs rise, that youth enter the market, and that skills lapse.')).toHaveLength(1);
  });
  test('leaves a series without the comma, a pair, and a single comma-and alone', () => {
    expect(seriesIn('We trained youth in coding, design and marketing.')).toEqual([]);
    expect(seriesIn('We trained youth in coding and design.')).toEqual([]);
    expect(seriesIn('Partners can start small, and they can grow later.')).toEqual([]);
  });
  test('leaves text inside quotation marks alone', () => {
    expect(seriesIn('She said, “We build skills, jobs, and futures.”')).toEqual([]);
    expect(seriesIn('The sign reads "red, green, and blue" in print.')).toEqual([]);
    expect(seriesIn('“We learned a lot, and we grew, and')).toEqual([]);
    expect(seriesIn('Wait, we grew, and so did they”')).toEqual([]);
  });
  test('treats a sentence boundary, an abbreviation and an em dash correctly', () => {
    expect(seriesIn('Two items. Then one, and another.')).toEqual([]);
    expect(seriesIn('Present were Dr. Md. Karim, Dean of the faculty, and Dr. Ahmed Khan.')).toEqual([]);
    expect(seriesIn('He works in the U.S., UK, Australia, and Canada.')).toHaveLength(1);
    expect(seriesIn('Open to all—students, graduates, and retirees.')).toHaveLength(1);
  });
  test('skips a conjunction that starts a clause with a pronoun or possessive, and a pair of people', () => {
    expect(seriesIn('If you write to us, we receive your email, and we use it to answer you.')).toEqual([]);
    expect(seriesIn('The agreement was signed by Aziz Ahmad, Chairman of CodersTrust, and Professor Jane Roe, Rector.')).toEqual([]);
  });
  test('an allowed sentence is skipped only while `allow` is on', () => {
    const s = 'Early press coverage, 2014–2016, and World Bank coverage of our work are on the Recognition and Media page.';
    expect(seriesIn(s)).toEqual([]);
    expect(seriesIn(s, { allow: false })).toHaveLength(1);
  });
});

test.describe('WP127 item 2: no serial comma on any built page, meta description, JSON-LD block or in llms.txt', () => {
  test('the site-wide scan finds no series closed with a comma before "and" or "or" (the allowed sentences excepted)', () => {
    const found = new Map<string, string[]>();
    for (const t of everyText()) for (const line of t.lines) for (const s of seriesIn(line)) found.set(s.sentence, [...(found.get(s.sentence) ?? []), t.where]);
    const report = [...found].map(([sentence, where]) => `${sentence} [${[...new Set(where)].slice(0, 3).join('; ')}]`);
    expect(report).toEqual([]);
  });

  test('every allowed sentence still occurs on the site (a stale entry fails)', () => {
    const seen = new Set<string>();
    for (const t of everyText()) for (const line of t.lines) for (const s of seriesIn(line, { allow: false })) seen.add(s.sentence);
    const stale = ALLOWED.filter((a) => ![...seen].some((s) => s.includes(a.has))).map((a) => a.has);
    expect(stale).toEqual([]);
  });

  test('the allowed list stays small and each entry says why', () => {
    expect(ALLOWED.length).toBeLessThanOrEqual(20);
    for (const a of ALLOWED) expect(a.why.length, a.has).toBeGreaterThan(10);
  });
});

// The strings the review named, and the others the sweep changed by hand (lists whose items hold "and" are rewritten, not just un-commaed).
const PAGE_TEXT: [string, string][] = [
  ['index.html', 'Start with a multi-cohort pilot, agree the scorecard up front and decide on expansion from the evidence.'],
  ['programs/youthwide/index.html', 'Missed thresholds trigger a corrective plan, expansion is your decision and independent evaluation is welcome.'],
  ['our-model/jobready-platform/index.html', 'train youth through courses that prepare for industry certification; connect learners to local, remote and global work; supply employers with job-ready talent; and give institutions a digital delivery platform.'],
  ['accessibility/index.html', 'Please tell us the page, what you were trying to do and the device or assistive technology you use.'],
  ['accessibility/index.html', 'Pages are built with one main heading, a logical heading order and landmarks; a “Skip to Main Content” link comes first.'],
  ['about/team/hazrat-ali-nahid/index.html', 'FreshBooks, QuickBooks Payroll and Gusto Payroll.'],
  ['about/team/mahdee-zaman/index.html', 'a global technology executive, generative AI strategist and cloud leader with over 30 years of experience'],
  ['about/team/mahdee-zaman/index.html', 'senior roles at Dell, Verizon and CenturyLink.'],
  ['about/team/rezaul-karim-khan/index.html', 'His certifications include AWS Certified AI Practitioner, AWS Certified Solutions Architect - Associate and Microsoft Certified Azure Fundamentals, as well as Google certifications in digital marketing and project management.'],
  ['about/team/asad-zaman/index.html', 'organized high-level UN events, built global partnerships and authored research on future skills and training reforms.'],
  ['about/index.html', 'NGO workforce programs (including WSDFM) and 10,000 teachers trained to teach online during COVID-19.'],
  ['impact/index.html', 'with a primary focus on Quality Education and Gender Equality, as well as Decent Work and Economic Growth'],
  ['partner-with-us/index.html', '70+ organizations since 2014: 13 government bodies; 20 universities and colleges; 13 development partners and NGOs; and 27 companies and industry bodies.'],
  ['programs/youthwide/index.html', 'South Asia, Sub-Saharan Africa and the Middle East and North Africa, as co-funded country cohorts.'],
  ['partner-with-us/foundations/index.html', 'Co-fundable country programs designed for South Asia, Sub-Saharan Africa and the Middle East and North Africa.'],
  ['programs/jobready-campus/index.html', 'Baseline at enrollment, follow-up surveys at 3, 6 and 12 months and documentary evidence of earnings where available'],
  ['privacy-policy/index.html', 'It is a functional setting, it stays on your device and we never receive it.'],
  ['privacy-policy/index.html', 'to object to our use of it and to complain to your local data-protection authority.'],
  ['programs/nu-postgraduate-diploma/index.html', 'Pay instantly online; transfer via mobile merchant accounts; visit a CodersTrust Bangladesh (CTBD) campus for cash or POS payments; or make a bank deposit'],
  ['impact/case-studies/undp-yes-korail/index.html', 'limited access to education and training, discrimination and little exposure to careers or networks.'],
  ['news/coderstrust-announces-learning-partnerships-in-uganda/index.html', 'partnerships in Benin, with SOS Children’s Villages; in Egypt, with CrossWorkers; and in Somaliland.'],
  ['news/hour-of-code-in-somaliland/index.html', 'included an Hour of Code event for students and an ICT program at Tima-ade University.'],
  ['news/why-we-call-it-a-digital-factory/index.html', 'every district, town and village'],
  ['news/coderstrust-visited-bimstec-headquarter/index.html', 'Bangladesh, Bhutan, India, Myanmar, Nepal, Sri Lanka and Thailand'],
  ['news/aziz-ahmad-wins-the-nynjmsdc-partnership-award-in-the-united-states/index.html', 'Chairman of CodersTrust, Technology Architect and philanthropist, has been honored'],
];
// Clause-joining commas the sweep keeps (see ALLOWED), pinned so a later sweep does not strip them.
const KEPT: [string, string][] = [
  ['about/recognition/index.html', 'has received appointments and honors, and CodersTrust’s work has been covered in the press.'],
  ['news/coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad/index.html', 'particularly the youth, and takes pride in contributing'],
  ['news/coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration/index.html', 'Aziz Ahmad, Chairman of CodersTrust, and Professor Francisco Rojas Aravena'],
];
const META: [string, string][] = [
  ['about/recognition/index.html', 'HolonIQ South Asia EdTech 100 listing, founder honors, media coverage from 2014 to 2016 and a press kit with logos and boilerplate for CodersTrust.'],
  ['accessibility/index.html', 'Our accessibility target (WCAG 2.2 AA), what we have done to meet it, known limitations such as the supplementary map and how to tell us about a barrier.'],
  ['privacy-policy/index.html', 'How the CodersTrust website handles data: no analytics cookies, no trackers of its own and a plain list of every service involved.'],
  ['about/governance/index.html', 'CodersTrust’s offices and leadership, with its safeguarding and data-protection arrangements, set out for funders doing due diligence.'],
  ['our-model/talentleap/index.html', 'TalentLEAP is CodersTrust’s competency-based model: assessed skill units, career paths and Learn, Earn, Prosper with three months of mentoring.'],
];
const OLD_EVERYWHERE = [
  'agree the scorecard up front, and decide',
  'expansion is your decision, and independent',
  'industry certification, connect learners',
  'what you were trying to do, and the device',
  'no trackers of its own, and a plain list',
  'QuickBooks Payroll, and Gusto Payroll',
  'strategist, and cloud leader',
  'Verizon, and CenturyLink',
  'Azure Fundamentals, and Google certifications',
  'built global partnerships, and authored',
  'media coverage from 2014 to 2016, and a press kit',
  'Gender Equality, and Decent Work',
  'development partners and NGOs, and 27 companies',
  'the Middle East and North Africa, and Sub-Saharan Africa',
  'including WSDFM, and 10,000 teachers',
  'career paths, and Learn, Earn',
];

test.describe('WP127 item 2: the review’s named strings and the hand-rewritten lists', () => {
  for (const [route, s] of PAGE_TEXT) {
    test(`${route.replace(/index\.html$/, '')} reads "${s.slice(0, 70)}${s.length > 70 ? '...' : ''}"`, () => {
      expect(text(route)).toContain(s);
    });
  }
  for (const [route, s] of META) {
    test(`${route.replace(/index\.html$/, '')} meta description reads "${s.slice(0, 60)}..."`, () => {
      const raw = html(route);
      expect(metaContent(raw, 'description')).toBe(s);
      expect(metaContent(raw, 'og:description')).toBe(s);
    });
  }
  for (const [route, s] of KEPT) {
    test(`${route.replace(/index\.html$/, '')} keeps the clause-joining comma in "${s.slice(0, 50)}..."`, () => {
      expect(text(route)).toContain(s);
    });
  }
  test('the old serial-comma strings are on no built page or in llms.txt', () => {
    const stale = listPages()
      .filter((p) => OLD_EVERYWHERE.some((s) => decode(readFileSync(p.file, 'utf8')).includes(s)))
      .map((p) => p.route);
    expect(stale).toEqual([]);
    if (existsSync(LLMS)) for (const s of OLD_EVERYWHERE) expect(readFileSync(LLMS, 'utf8'), s).not.toContain(s);
  });
  test('the register’s own text follows (SC-11, ID-09, NU-05, the YouthWIDE regions)', () => {
    expect(fact('SC-11').text).toBe('70+ organizations with signed MOUs, agreements or contracts since 2014: 13 government bodies; 20 universities and colleges; 13 development partners and NGOs; and 27 companies and industry bodies');
    expect(fact('ID-09').text).toBe('CodersTrust’s training-to-employment model aligns with seven SDGs, with a primary focus on Quality Education and Gender Equality, as well as Decent Work and Economic Growth');
    expect(fact('NU-05').text).toBe('Pay instantly online; transfer via mobile merchant accounts; visit a CodersTrust Bangladesh (CTBD) campus for cash or POS payments; or make a bank deposit');
    expect(fact('IN-02').text).toContain('across South Asia, Sub-Saharan Africa and the Middle East and North Africa;');
    expect(fact('PX-02').text).toBe('19M+ university-educated people are unemployed across South Asia, Sub-Saharan Africa and the Middle East and North Africa');
  });
});

// The News posts the sweep changed keep their slugs and carry `updated: 2026-10-30` (their JSON-LD dateModified follows it).
const SWEPT_POSTS = [
  '1000-trainees-enhancing-digital-government-economy-edge',
  'a-proud-milestone-for-coderstrust',
  'aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day',
  'aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador',
  'aziz-ahmad-wins-the-nynjmsdc-partnership-award-in-the-united-states',
  'coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment',
  'coderstrust-announces-learning-partnerships-in-uganda',
  'coderstrust-attends-wsis20-forum-high-level-event',
  'coderstrust-bangladesh-partners-with-us-based-remoteintegrity-llc-to-expand-global-career-opportunities',
  'coderstrust-bangladesh-signs-strategic-mou-with-base-study-concern-to-enhance-global-education-opportunities',
  'coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners',
  'coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation',
  'coderstrust-chairman-and-co-founder-aziz-ahmad-participates-in-u-s-energy-security-panel',
  'coderstrust-chairman-aziz-ahmad-meets-bangladesh-foreign-affairs-minister-khalilur-rahman',
  'coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership',
  'coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c',
  'coderstrust-chairman-mr-aziz-ahmad-leads-delegation-to-u-s-embassy-to-discuss-youth-empowerment',
  'coderstrust-chairman-mr-aziz-ahmad-receives-sdg-life-achievement-award-from-the-unsgii',
  'coderstrust-chairman-mr-aziz-ahmad-speaks-on-cybersecurity-artificial-intelligence-at-united-nations-general-assembly-unga-2025',
  'coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia',
  'coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad',
  'coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration',
  'coderstrust-leedo-join-to-expands-ict-education-to-street-children',
  'coderstrust-organizes-career-carnival-for-students-and-affiliates',
  'coderstrust-provides-corporate-training-to-akij-group-one-of-the-largest-conglomerates-of-south-asia',
  'coderstrust-recognized-among-holoniqs-2024-south-asia-edtech-100',
  'coderstrust-seals-groundbreaking-mou-with-nctb-paving-the-way-for-competency-based-learning-opportunities',
  'coderstrust-students-invited-to-join-upeaces-young-leaders-for-peace-summer-programme-2026',
  'coderstrust-teaching-you-freelancing-the-right-way',
  'coderstrust-visited-bimstec-headquarter',
  'empowering-women-in-digital-economy-certificate-giving-ceremony-by-coderstrust-with-joyeeta-foundation',
  'gardinar-emphasizes-skill-development-and-access-for-bangladeshis-to-us-digital-platform',
  'harnessing-socio-technology-for-positive-impact-and-unity-globally',
  'hour-of-code-in-somaliland',
  'mou-signed-between-bangladesh-petroleum-institute-bpi-and-coderstrust',
  'mou-signing-ceremony-between-north-south-university-coderstrust',
  'the-future-building-a-digital-factory-for-bangladesh',
  'the-man-behind-coderstrust-who-never-forgot-his-roots',
  'why-we-call-it-a-digital-factory',
];
test.describe('WP127 item 2: the News posts the sweep changed are dated updated: 2026-10-30', () => {
  test('there are 39 of them', () => {
    expect(SWEPT_POSTS).toHaveLength(39);
  });
  for (const slug of SWEPT_POSTS) {
    test(`${slug.slice(0, 80)}: front matter and structured data`, () => {
      expect(readFileSync(join('src/content/news', `${slug}.md`), 'utf8')).toMatch(/^updated: 2026-10-30$/m);
      expect(onOrAfter(html(`news/${slug}/index.html`), '2026-10-30'), 'JSON-LD dateModified').toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('WP127 item 1: Recognition photo band and the About menu', () => {
  test('the band is "Forums in Photographs" (heading, On This Page entry and list label); no page says "Awards and Forums in Photographs"', () => {
    const raw = html('about/recognition/index.html');
    expect(raw).toMatch(/<h2 class="sh__title" id="photos-h"[^>]*>Forums in Photographs<\/h2>/);
    expect(raw).toMatch(/<a class="link" href="#photos"[^>]*>Forums in Photographs<\/a>/);
    expect(raw).toContain('aria-label="Forums in Photographs"');
    const stale = listPages().filter((p) => readFileSync(p.file, 'utf8').includes('Awards and Forums in Photographs')).map((p) => p.route);
    expect(stale).toEqual([]);
  });
  test('the About menu describes Recognition and Media as "Listings, honors and press coverage." on every page that carries the menu', () => {
    const withMenu = listPages().filter((p) => readFileSync(p.file, 'utf8').includes('>Recognition and Media</span>'));
    expect(withMenu.length).toBeGreaterThan(50);
    const bad = withMenu.filter((p) => !readFileSync(p.file, 'utf8').includes('>Listings, honors and press coverage.</span>')).map((p) => p.route);
    expect(bad).toEqual([]);
    const stale = listPages().filter((p) => readFileSync(p.file, 'utf8').includes('Awards, recognition and press coverage')).map((p) => p.route);
    expect(stale).toEqual([]);
    if (existsSync(LLMS)) expect(readFileSync(LLMS, 'utf8')).not.toContain('Awards, recognition and press coverage');
  });
});

test.describe('WP127 items 3 to 7: copy polish', () => {
  test('3. Programs, YouthWIDE card: "...not only enrollment, as agreed in the program scope."', () => {
    const t = text('programs/index.html');
    expect(t).toContain('funders get monthly reports on progress toward paid work, not only enrollment, as agreed in the program scope.');
    expect(t).not.toContain('as agreed in the program scope, not only enrollment');
  });

  test('4. Local Partners, "Mentoring and Placement": "with placement support into local, remote and global work."', () => {
    const t = text('partner-with-us/local-partners/index.html');
    expect(t).toContain('Three months of milestone-based mentoring, with placement support into local, remote and global work.');
    expect(t).not.toContain('alongside into');
  });

  test('5. Investors, "Contracts and Recognition": the HolonIQ item is a sentence, not a Title Case line', () => {
    const raw = html('partner-with-us/investors/index.html');
    const item = /<li data-fact="PA-08"[^>]*>(?:(?!<\/li>)[\s\S])*<\/li>/.exec(raw)?.[0] ?? '';
    expect(item).not.toBe('');
    expect(visible(item)).toBe('Listed in the HolonIQ South Asia EdTech 100 in 2023 (STEAM category) and 2024.');
    expect(visible(raw)).not.toContain('Was Listed in the HolonIQ');
    // WP130 (Opus High run 5): the AWS badge is gone; the Scale and Partners paragraph states the AWS status once
    expect(raw).not.toMatch(/<li data-fact="PA-06"/);
    // the register itself is unchanged: Home’s sentence is derived from it
    expect(fact('PA-08').text).toBe('CodersTrust Was Listed in the HolonIQ South Asia EdTech 100 in 2023 (STEAM Category) and 2024');
  });

  test('6. Recognition lede: "Its Co-Founder and Chairman, Aziz Ahmad," (WP129: the lede opens with the listing, so "Its" has an antecedent)', () => {
    const t = text('about/recognition/index.html');
    expect(t).toContain('Its Co-Founder and Chairman, Aziz Ahmad, has received appointments and honors');
    expect(t).not.toContain('co-founder and Chairman, Aziz Ahmad');
  });

  test('7. Impact, 3M+ tile: line 1 gives the date, line 2 is "An ambition, not a result."', () => {
    const g = fact('IN-05').stat?.glance;
    expect(g?.label).toBe('Aim: learners and professionals on JobReady by June 30, 2032');
    expect(g?.note).toBe('An ambition, not a result.');
    const raw = html('impact/index.html');
    expect(raw).toMatch(/Aim: learners and professionals on JobReady by June 30, 2032<\/span><span class="glance__note"[^>]*>An ambition, not a result\.<\/span>/);
    const stale = listPages().filter((p) => readFileSync(p.file, 'utf8').includes('An ambition for the fiscal year ending June 30, 2032, not a result.')).map((p) => p.route);
    expect(stale).toEqual([]);
  });
});

test.describe('WP127 item 8: the TalentLEAP FAQ citation ends with a period and the DOI link follows it', () => {
  const CITATION = 'Arman, Bhattacharjee, Das, Gomes and Mahmood (2026), “Tackling Women’s Unemployment: Evidence from an Online Jobs Experiment in Bangladesh,” Economic Development and Cultural Change 75(1): 367–399';
  const DOI = 'https://doi.org/10.1086/741450';
  test('the answer in the register', () => {
    const q4 = faqs.find((f) => f.id === 'Q4');
    expect(q4?.a.endsWith(`${CITATION}. ${DOI}`)).toBe(true);
    expect(q4?.inlineLink).toEqual({ text: DOI, href: DOI });
  });
  test('the TalentLEAP page and every page that prints the answer: text, link and FAQ JSON-LD', () => {
    const carriers = listPages().filter((p) => visible(readFileSync(p.file, 'utf8')).includes('Is There Independent Evidence?'));
    expect(carriers.map((p) => p.route)).toContain('/our-model/talentleap/');
    for (const p of carriers) {
      const raw = readFileSync(p.file, 'utf8');
      expect(visible(raw), p.route).toContain(`published in a peer-reviewed journal: ${CITATION}. ${DOI}`);
      expect(raw, p.route).toMatch(new RegExp(`367–399\\. <a href="${DOI.replace(/[.]/g, '\\.')}"`));
      const ld = [...raw.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(' ');
      expect(ld, p.route).toContain(`published in a peer-reviewed journal: ${CITATION}. ${DOI}"`);
    }
  });
});
