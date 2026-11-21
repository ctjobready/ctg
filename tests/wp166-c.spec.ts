import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { fact } from '../src/data/facts';
import { CASE_STUDIES } from '../src/components/pages/impact/case-studies';
import { DIST_DIR } from './support/env';
import { open } from './support/browser';

/**
 * WP166-C (owner approval of 21 November 2026): the marketing-effectiveness review, package C. The Impact pages (hub, Impact Survey 2026, Independent Evaluation, Global Reach, In the Field,
 * News Photographs, Stories, the Case Studies hub and the five case studies; review R4) and News (the index and the archived posts; reviews R5 and R6).
 * Run `npm run build`, then `PORT=4915 npx playwright test tests/wp166-c.spec.ts --project=chromium`. The tests read the built files; one opens the News index and the Impact hub.
 *   News index   the H1, lead and description; the "Featured" row of four (Her Power, the DoICT Training of Trainers, the U.S. Embassy treasure hunt, the UPEACE ambassador); one dating note; the general band at the end.
 *   Archive note posts dated 2026 show "Published …; updated …." alone; older posts lead with the dates, then one shorter note of the same meaning; the five written-from-sources notes are unchanged; no "Archived post".
 *   Posts        every rewritten headline, excerpt (the meta description) and title tag; the notes under the H1 (Her Power's "Delivered" line, EDGE's and SKIT's contract scope); the story-matched closing bands and links;
 *                "More News" for the government-band posts; the cut decks and the closing framing (Young Leaders for Peace, the Aziz Ahmad profile).
 *   Impact       the leads, headings, order, moved and cut text, new links and closing bands the R4 findings changed; the register strings they show stay verbatim (data-fact).
 *   Dates        every page whose visible text changed is dated 2026-11-21.
 */

const TODAY = '2026-11-21';
// src/components/pages/news/news.ts imports astro:content, which a spec cannot load, so its constants are restated here (CURRENT_NEWS_FROM_YEAR, FEATURED_NEWS, NEWS_CTA.general).
const CURRENT_NEWS_FROM_YEAR = 2026;
const GENERAL_BAND = { heading: 'Working on Youth Employment?', text: 'Tell us your goals, priority groups and two suitable times. A discovery session is a conversation, not a commitment.' };
const html = (rel: string) => readFileSync(join(DIST_DIR, rel), 'utf8');
const decode = (s: string) =>
  s.replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n))).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
/** Readable text: comments, scripts, styles and screen-reader-only notes removed, tags stripped, no space before punctuation. */
const visible = (raw: string) =>
  decode(
    raw
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<span class="sr-only"[^>]*>[\s\S]*?<\/span>/g, '')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:)])/g, '$1')
    .trim();
const main = (rel: string) => /<main[\s\S]*<\/main>/.exec(html(rel))?.[0] ?? '';
const text = (rel: string) => visible(main(rel));
/** The raw HTML of the element with that id, from its opening tag to the first closing tag of the same name. */
function byId(rel: string, tag: string, id: string): string {
  const raw = html(rel);
  const i = raw.search(new RegExp(`<${tag}\\b[^>]*\\bid="${id}"`));
  expect(i, `<${tag} id="${id}"> is on ${rel}`).toBeGreaterThanOrEqual(0);
  const j = raw.indexOf(`</${tag}>`, i);
  return raw.slice(i, j + tag.length + 3);
}
type Node = Record<string, unknown>;
const ld = (rel: string): Node[] =>
  [...html(rel).matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap((m) => {
    const j = JSON.parse(m[1]) as Node;
    return ((j['@graph'] as Node[] | undefined) ?? [j]) as Node[];
  });
const nodes = (rel: string, type: string): Node[] => ld(rel).filter((x) => [x['@type']].flat().includes(type));
const metaDescription = (rel: string) => decode(/<meta name="description" content="([^"]*)"/.exec(html(rel))?.[1] ?? '');
const titleOf = (rel: string) => decode(/<title>([^<]*)<\/title>/.exec(html(rel))?.[1] ?? '');
const h1Of = (rel: string) => visible(/<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(html(rel))?.[1] ?? '');
const ids = (raw: string, tag: string) => [...raw.matchAll(new RegExp(`<${tag}\\b[^>]*\\bid="([^"]+)"`, 'g'))].map((m) => m[1]);
const post = (slug: string) => `news/${slug}/index.html`;
const frontMatter = (slug: string) => readFileSync(join('src/content/news', `${slug}.md`), 'utf8').split('\n---')[0];
const NEWS_SLUGS = readdirSync('src/content/news').filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));

const S = {
  hp: '25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative',
  pm: 'a-proud-milestone-for-coderstrust',
  tot: 'coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment',
  edge: '1000-trainees-enhancing-digital-government-economy-edge',
  skit: '1000-trainees-sheikh-kamal-ict-incubator-training',
  un: 'aziz-ahmad-advocates-technology-skills-for-peace-at-un-world-press-freedom-day',
  bc: 'coderstrust-chairman-mr-aziz-ahmad-joins-bciu-roundtable-in-washington-d-c',
  up: 'aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador',
  os: 'coderstrust-bangladesh-and-ostitto-join-forces-to-bridge-the-digital-divide',
  ba: 'coderstrust-and-basis-asset-collaborate-to-build-bangladeshs-it-future',
  rm: 'coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation',
  en: 'coderstrust-chairman-and-co-founder-aziz-ahmad-participates-in-u-s-energy-security-panel',
  em: 'coderstrust-chairman-mr-aziz-ahmad-leads-delegation-to-u-s-embassy-to-discuss-youth-empowerment',
  sdg: 'coderstrust-chairman-mr-aziz-ahmad-receives-sdg-life-achievement-award-from-the-unsgii',
  fm: 'coderstrust-chairman-aziz-ahmad-meets-bangladesh-foreign-affairs-minister-khalilur-rahman',
  cc: 'coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership',
  ri: 'coderstrust-bangladesh-partners-with-us-based-remoteintegrity-llc-to-expand-global-career-opportunities',
  ws: 'coderstrust-attends-wsis20-forum-high-level-event',
  de: 'coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners',
  carn: 'coderstrust-organizes-career-carnival-for-students-and-affiliates',
  ylp: 'coderstrust-students-invited-to-join-upeaces-young-leaders-for-peace-summer-programme-2026',
  upeace: 'coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration',
  nctb: 'coderstrust-seals-groundbreaking-mou-with-nctb-paving-the-way-for-competency-based-learning-opportunities',
  bp: 'harnessing-socio-technology-for-positive-impact-and-unity-globally',
  joy: 'empowering-women-in-digital-economy-certificate-giving-ceremony-by-coderstrust-with-joyeeta-foundation',
  h24: 'coderstrust-recognized-among-holoniqs-2024-south-asia-edtech-100',
  h23: 'coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia',
  leedo: 'coderstrust-leedo-join-to-expands-ict-education-to-street-children',
  ju: 'coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad',
  free: 'coderstrust-teaching-you-freelancing-the-right-way',
  bpi: 'mou-signed-between-bangladesh-petroleum-institute-bpi-and-coderstrust',
  nsu: 'mou-signing-ceremony-between-north-south-university-coderstrust',
  unga: 'coderstrust-chairman-mr-aziz-ahmad-speaks-on-cybersecurity-artificial-intelligence-at-united-nations-general-assembly-unga-2025',
  gard: 'gardinar-emphasizes-skill-development-and-access-for-bangladeshis-to-us-digital-platform',
  cph: 'coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner',
  dxb: 'coderstrust-presents-at-in5-in-dubai',
  ind: 'coderstrust-sets-up-in-india',
  som: 'hour-of-code-in-somaliland',
  ug: 'coderstrust-announces-learning-partnerships-in-uganda',
  df1: 'the-future-building-a-digital-factory-for-bangladesh',
  df2: 'why-we-call-it-a-digital-factory',
  man: 'the-man-behind-coderstrust-who-never-forgot-his-roots',
} as const;

/** The rewritten headline (H1), title tag and excerpt (meta description) of each post; a field left out is unchanged. */
const POSTS: { slug: string; id: string; h1?: string; title?: string; description?: string }[] = [
  { slug: S.hp, id: 'R5-03', description: 'CodersTrust signs the Her Power contract with the DoICT. Delivered: the national program trained 25,125 women, its full target.' },
  { slug: S.pm, id: 'R5-04', h1: 'CodersTrust and the U.S. Embassy Dhaka Draw 1,400+ Users to the “Great American Treasure Hunt”', title: 'U.S. Embassy Treasure Hunt Draws 1,400+ Users | CodersTrust' },
  { slug: S.tot, id: 'R5-09', h1: 'CodersTrust and DoICT Complete a Five-Day Training of Trainers Program', description: 'CodersTrust and DoICT complete a five-day Training of Trainers program. The ICT Division Secretary calls CodersTrust a “steadfast and dedicated partner.”' },
  { slug: S.edge, id: 'R5-11', h1: 'CodersTrust Signs EDGE Contract to Train 1,000 Youth in Digital and 4IR Technologies' },
  { slug: S.skit, id: 'R5-11', h1: 'CodersTrust Contracted to Train 1,000 People in High-Demand IT Skills in Barishal' },
  { slug: S.un, id: 'R5-12', h1: 'At the United Nations, Aziz Ahmad Says Technology Skills Can Support Peace', title: 'Aziz Ahmad at the UN: Skills for Peace | CodersTrust', description: 'At United Nations Headquarters, Aziz Ahmad joins panelists from Microsoft, The New York Times and NYU at a UPEACE seminar for World Press Freedom Day 2023.' },
  // R5-13 in part: the excerpt says what the roundtable was about without naming the two officials (an excerpt that names a government official makes a post political, and the post would leave Recognition's forums band)
  { slug: S.bc, id: 'R5-13, R5-18', h1: 'Aziz Ahmad Joins BCIU Roundtable in Washington, D.C.', description: 'Aziz Ahmad joins a Business Council for International Understanding roundtable on aligning Bangladesh’s development financing with digital skills.' },
  { slug: S.up, id: 'R5-15', h1: 'Aziz Ahmad Appointed Global UPEACE Ambassador', description: 'The University for Peace, established by the UN General Assembly, appoints Aziz Ahmad a Global Ambassador for his work on skills, opportunity and peace.' },
  { slug: S.os, id: 'R5-16', h1: 'CodersTrust Bangladesh and Ostitto Sign MOU on ICT Training for the Third-Gender Community', title: 'ICT Training for the Third-Gender Community | CodersTrust', description: 'CodersTrust Bangladesh signs an MOU with Ostitto Bangladesh to bring ICT literacy training to the third-gender community, with five places in each batch.' },
  { slug: S.ba, id: 'R5-17', h1: 'CodersTrust Becomes a Training Partner Under the BASIS-ASSET Project' },
  { slug: S.rm, id: 'R5-18', h1: 'Aziz Ahmad Tells RMSTU Graduates: “Be Useful — The World Will Find You”' },
  { slug: S.en, id: 'R5-18', h1: 'Aziz Ahmad Attends U.S. Energy Security Panel' },
  { slug: S.em, id: 'R5-18', h1: 'Aziz Ahmad Leads Delegation to U.S. Embassy to Discuss Youth Empowerment' },
  { slug: S.sdg, id: 'R5-18', h1: 'Aziz Ahmad Receives SDG Life Achievement Award from the UNGSII Foundation' },
  { slug: S.fm, id: 'R5-18', h1: 'Aziz Ahmad Meets Bangladesh Foreign Minister Khalilur Rahman' },
  // Title Case: "the" mid-headline (the reviewer wrote "The City College of New York")
  { slug: S.cc, id: 'R5-18', h1: 'CodersTrust and the City College of New York Discuss an Expanded Partnership' },
  { slug: S.ri, id: 'R5-21', description: 'CodersTrust Bangladesh signs an MOU with Florida-based RemoteIntegrity to support top-performing program completers with international placement.' },
  { slug: S.ws, id: 'R5-22', h1: 'CodersTrust Joins the WSIS+20 Forum High-Level Event in Geneva', description: 'At the WSIS+20 Forum High-Level Event in Geneva, Aziz Ahmad joins discussions on platform economies and decent work in the Global South.' },
  // R6-02: the reviewer's title tag (51 characters) is over the 46 the field allows, so it keeps the lead figure
  { slug: S.carn, id: 'R6-01, R6-02', h1: 'Career Carnival Brings Around 20 Employers and 60+ Job Openings to 1,000+ Students and Alumni', title: 'Career Carnival: 60+ Job Openings | CodersTrust', description: 'Around 20 companies offer 60+ job openings to more than 1,000 CodersTrust students and alumni at a Career Carnival in Dhaka.' },
  { slug: S.ylp, id: 'R6-03, R6-04', h1: 'CodersTrust Alumna Attends UPEACE’s Young Leaders for Peace Summer Programme on a Scholarship', title: 'Alumna Attends UPEACE Young Leaders for Peace | CodersTrust', description: 'A CodersTrust alumna attended UPEACE’s Young Leaders for Peace Summer Programme in San José, Costa Rica, on a scholarship in June 2026.' },
  { slug: S.upeace, id: 'R6-06', h1: 'CodersTrust Partners with the UN-Mandated University for Peace on Next Generation Skills Training', title: 'UN-Mandated University for Peace Partnership | CodersTrust' },
  { slug: S.nctb, id: 'R6-07, R6-08', h1: 'CodersTrust and Bangladesh’s National Curriculum and Textbook Board Sign an MOU on Competency-Based Learning', title: 'National Curriculum and Textbook Board MOU | CodersTrust', description: 'CodersTrust and Bangladesh’s National Curriculum and Textbook Board sign an MOU on teacher training and hands-on robotics and coding learning in schools.' },
  { slug: S.bp, id: 'R6-09', h1: 'CodersTrust Joins Build Peace 2023 in Nairobi on Designing Online Spaces for Conflict Transformation', title: 'Workshop at Build Peace 2023 in Nairobi | CodersTrust' },
  { slug: S.joy, id: 'R6-10, R6-11', h1: 'Women Complete Advanced Training for the Digital Economy with CodersTrust and the Joyeeta Foundation', title: 'Women Complete Joyeeta Foundation Training | CodersTrust', description: 'Women who completed advanced training in social media marketing and accounts management receive certificates from CodersTrust and the Joyeeta Foundation.' },
  { slug: S.h24, id: 'R6-12', h1: 'CodersTrust Named in HolonIQ’s 2024 South Asia EdTech 100, Its Second Listing', description: 'CodersTrust is named in HolonIQ’s 2024 South Asia EdTech 100, its second listing after 2023.' },
  { slug: S.h23, id: 'R6-13', description: 'HolonIQ’s 2023 South Asia EdTech 100 names CodersTrust among the region’s top 100 EdTech companies.' },
  { slug: S.leedo, id: 'R6-14', h1: 'CodersTrust and LEEDO Open a 20-Computer Lab for Street Children in Dhaka', description: 'CodersTrust equips a 20-computer lab at the LEEDO Peace Home in Dhaka and starts three-month IT training for street children.' },
  // R6-15: title tag and excerpt shortened to the 46- and 155-character limits ("Opens" for "Is Inaugurated")
  { slug: S.ju, id: 'R6-15', h1: 'Freelancing Training Supported by CodersTrust Is Inaugurated at Jahangirnagar University', title: 'Freelancing Training Opens at Jahangirnagar | CodersTrust', description: 'Freelancing training supported by CodersTrust opens at Jahangirnagar University as its Institute of IT signs an MOU with the Department of ICT (DoICT).' },
  { slug: S.free, id: 'R6-16', h1: '“If I Could Learn This Skill, I Could Continue My Studies”: One Student’s Story' },
  { slug: S.bpi, id: 'R6-17', h1: 'CodersTrust Bangladesh and Bangladesh Petroleum Institute Sign an MOU on Digital Skills for the Energy Sector', title: 'Digital Skills MOU for the Energy Sector | CodersTrust' },
  { slug: S.nsu, id: 'R6-18, R6-31', h1: 'North South University and CodersTrust Sign an MOU on Skills and Career Pathways for Students', description: 'North South University and CodersTrust sign an MOU on student skills and career pathways, signed by Vice Chancellor Abdul Hannan Chowdhury and Aziz Ahmad.' },
  // R6-19: the title tag stays (the reviewer's is 47 characters, over the limit; the current one has no ampersand)
  { slug: S.unga, id: 'R6-19, R6-31', h1: 'Aziz Ahmad Joins a BCIU and Mastercard Discussion on Cybersecurity and AI During UNGA Week', title: 'Aziz Ahmad on Cybersecurity, AI at UNGA Week | CodersTrust', description: 'Aziz Ahmad joins a discussion hosted by BCIU and Mastercard on cybersecurity, digital governance and AI during UN General Assembly week in New York.' },
  { slug: S.gard, id: 'R6-20', h1: 'U.S. Embassy Economic Officer Highlights Skills and Access to U.S. Digital Platforms at CodersTrust Ceremony', title: 'U.S. Embassy Officer on Skills and Platforms | CodersTrust' },
  { slug: S.cph, id: 'R6-21', h1: 'CodersTrust Launches in Copenhagen in the Presence of Sir Richard Branson and Morten Lund' },
  { slug: S.df1, id: 'R6-22', h1: 'Aziz Ahmad on Building a Digital Factory for Bangladesh' },
  { slug: S.df2, id: 'R6-23', description: 'For decades, developing countries exported labor. CodersTrust’s case for a Bangladesh that exports knowledge and digital services instead.' },
  { slug: S.man, id: 'R6-30', description: 'A video profile of Co-Founder and Chairman Aziz Ahmad: a simple life, a farm and a school initiative for underprivileged children in Bangladesh.' },
];

const NEWS = 'news/index.html';
const IMPACT = 'impact/index.html';
const TRIAL = 'impact/independent-evaluation/index.html';
const SURVEY = 'impact/outcomes-2026/index.html';
const HUB = 'impact/case-studies/index.html';
const STORIES = 'impact/stories/index.html';
const REACH = 'impact/global-reach/index.html';
const FIELD = 'impact/in-the-field/index.html';
const PHOTOS = 'impact/in-the-field/news-photos/index.html';
const CASE = (slug: string) => `impact/case-studies/${slug}/index.html`;

/* ---------------------------------------------------------------------------------------------- */

test.describe('News index (R5-01, R5-02, R5-06, R5-07)', () => {
  test('the H1, lead, description and one dating note', () => {
    expect(h1Of(NEWS)).toBe('Contracts, Partnerships and Recognition Since 2014');
    const t = text(NEWS);
    expect(t).toContain('Government contracts, partnerships and MOUs, recognition and program events, from the 2014 launch in Copenhagen to this year.');
    const description = 'CodersTrust news since 2014: government contracts, partnerships and MOUs, recognition and program events.';
    expect(metaDescription(NEWS)).toBe(description);
    expect(nodes(NEWS, 'CollectionPage')[0]?.description).toBe(description);
    expect(t).toContain('Posts carry their publication date; posts written later from dated sources carry the event date. Older posts are lightly edited from the original, and each carries the dates its titles, offices and figures reflect.');
    expect(t).not.toContain('each post dated by its publication or, for posts written later from dated sources, by its event date');
    expect(t).not.toContain('News from CodersTrust');
  });

  test('a "Featured" row of four proof stories sits above the dated list, which still opens on "Latest"', () => {
    const featured = byId(NEWS, 'section', 'featured');
    expect(visible(featured)).toMatch(/^Featured /);
    const hrefs = [...featured.matchAll(/<a class="card__link" href="([^"]+)"/g)].map((m) => m[1].replace(/^\/ctg/, ''));
    expect(hrefs).toEqual([S.hp, S.tot, S.pm, S.up].map((s) => `/news/${s}/`));
    const raw = main(NEWS);
    expect(raw.indexOf('id="featured"')).toBeLessThan(raw.indexOf('id="archive"'));
    expect(visible(byId(NEWS, 'section', 'archive'))).toContain('Latest');
  });

  test('the index ends on the general band the posts carry, word for word (one "two suitable times")', () => {
    const band = visible(byId(NEWS, 'section', 'cta'));
    expect(band).toContain(GENERAL_BAND.heading);
    expect(band).toContain(GENERAL_BAND.text);
    expect(band).toContain('Request a Discovery Session');
    expect(band).toContain('See Our Programs');
    expect(text(NEWS).split('two suitable times').length - 1).toBe(1);
    const raw = main(NEWS);
    expect(raw.indexOf('id="cta"')).toBeGreaterThan(raw.indexOf('id="archive"'));
  });

  test('in the browser: the Featured row, the list and the closing band, in that order', async ({ page }) => {
    await open(page, 'news/');
    await expect(page.locator('h1')).toHaveText('Contracts, Partnerships and Recognition Since 2014');
    await expect(page.locator('#featured .card')).toHaveCount(4);
    await expect(page.locator('#featured .card__title').first()).toHaveText('Her Power Contract Aims to Train 25,125 Women: Empowerment of Women Through ICT Frontier Initiative');
    await expect(page.locator('#cta h2')).toHaveText('Working on Youth Employment?');
  });
});

test.describe('The archive note, narrowed and shortened (owner approval 2, R5-05, R6-05)', () => {
  test('no post says "Archived post"; 2026 posts show the date line alone; older posts lead with the dates, then the shorter note', () => {
    const SHORT = 'Lightly edited. Titles, offices and figures are as of publication; current figures are on the Impact pages.';
    let current = 0;
    let older = 0;
    for (const slug of NEWS_SLUGS) {
      const raw = html(post(slug));
      const banner = visible(/<p class="archive-banner"[\s\S]*?<\/p>/.exec(raw)?.[0] ?? '');
      expect(visible(raw), slug).not.toContain('Archived post');
      const fm = frontMatter(slug);
      if (/^writtenFromSources: true$/m.test(fm)) {
        expect(banner, slug).toMatch(/^Written in October 2026 from the dated sources linked in the text\. Event date: [A-Z][a-z]+ \d{1,2}, \d{4}\.$/);
        continue;
      }
      const year = Number(/^date: (\d{4})/m.exec(fm)?.[1]);
      if (year >= CURRENT_NEWS_FROM_YEAR) {
        current++;
        expect(banner, slug).toMatch(/^Published [A-Z][a-z]+ \d{1,2}, 2026; updated November 21, 2026\.$/);
      } else {
        older++;
        const country = /^countToday: true$/m.test(fm) ? ' The country count is today’s.' : '';
        expect(banner, slug).toMatch(new RegExp(`^Published [A-Z][a-z]+ \\d{1,2}, \\d{4}; updated November 21, 2026\\. ${SHORT.replace(/[.]/g, '\\.')}${country.replace(/[.]/g, '\\.')}$`));
      }
    }
    expect(current, 'posts dated 2026').toBe(13);
    expect(older, 'older posts with the short note').toBe(29);
  });

  test('Her Power: the "Delivered" line is directly under the H1, not in the date note; EDGE and SKIT state their contract scope there', () => {
    const head = (slug: string) => /<header class="art__head"[\s\S]*?<\/header>/.exec(html(post(slug)))?.[0] ?? '';
    const hp = head(S.hp);
    expect(hp).toContain('data-fact="GV-01"');
    expect(visible(hp)).toContain('Delivered: the national program trained 25,125 women, its full target. See the Her Power case study.');
    expect(visible(/<p class="archive-banner"[\s\S]*?<\/p>/.exec(html(post(S.hp)))?.[0] ?? '')).not.toContain('Delivered');
    expect(visible(head(S.edge))).toContain('Contract scope: 1,000 youth. We confirm each contract’s delivery status in a briefing.');
    expect(head(S.edge)).toContain('data-fact="GV-02 GV-10"');
    expect(visible(head(S.skit))).toContain('Contract scope: 1,000 people. We confirm each contract’s delivery status in a briefing.');
    expect(head(S.skit)).toContain('data-fact="GV-03 GV-10"');
  });
});

test.describe('Rewritten headlines, title tags and excerpts (owner approval 3; R5, R6)', () => {
  for (const p of POSTS) {
    test(`${p.id}: ${p.slug}`, () => {
      const rel = post(p.slug);
      if (p.h1) {
        expect(h1Of(rel)).toBe(p.h1);
        expect(nodes(rel, 'NewsArticle')[0]?.headline).toBe(p.h1);
      }
      if (p.title) expect(titleOf(rel)).toBe(p.title);
      if (p.description) {
        expect(metaDescription(rel)).toBe(p.description);
        expect(p.description.length).toBeLessThanOrEqual(155);
      }
    });
  }

  test('no headline starts with the chairman\'s title string or carries an ampersand (R5-18, R6-31)', () => {
    for (const slug of NEWS_SLUGS) {
      const h1 = h1Of(post(slug));
      expect(h1, slug).not.toMatch(/^CodersTrust Chairman/);
      expect(h1, slug).not.toContain('&');
    }
  });

  test('a post whose excerpt names a government official is political, so it is never teased on an evergreen page (the Training of Trainers post); BCIU stays teasable', () => {
    expect(frontMatter(S.tot)).toMatch(/^political: true$/m);
    expect(frontMatter(S.bc)).not.toMatch(/^political: true$/m);
    expect(visible(html(PHOTOS))).not.toContain('DoICT trainer program closing ceremony');
    expect(visible(html('about/recognition/index.html'))).toContain('Aziz Ahmad Joins BCIU Roundtable in Washington, D.C.');
  });

  test('the decks that repeated the headline are cut, and the closing framing is tightened (R6-07, R6-09, R6-29, R6-30)', () => {
    expect(text(post(S.nctb))).not.toContain('CodersTrust and NCTB Sign an MOU on Competency-Based Learning');
    expect(text(post(S.bp))).not.toContain('CodersTrust Joins Build Peace 2023 on Designing Online Spaces for Conflict Transformation');
    const ylp = text(post(S.ylp));
    expect(ylp).toContain('The 2026 program has concluded. Program details remain available from UPEACE.');
    expect(ylp).not.toContain('Program Information');
    expect(ylp).not.toContain('Download Brochure');
    expect(html(post(S.ylp))).toContain('href="https://www.upeaceny.org/young-leaders-for-peace"');
    const man = text(post(S.man));
    expect(man).toContain('Learn more about the Bir Muktijoddha Ayub Ahmed Master Memorial Institute on Facebook.');
    expect(man).not.toContain('https://www.facebook.com/profile.php');
  });
});

test.describe('Story-matched closing bands and "More News" (R5-08, R5-19, R5-20, R6-24 to R6-28)', () => {
  const band = (slug: string) => visible(/<section class="art__cta"[\s\S]*?<\/section>/.exec(html(post(slug)))?.[0] ?? '');
  test('the school band on the Discovery Education post', () => {
    const b = band(S.de);
    expect(b).toContain('Bringing Coding and Robotics into Your Classroom?');
    expect(b).toContain('Tell us your school, grade levels and two suitable times for a discovery session.');
    expect(b).toContain('Request a Discovery Session');
    expect(b).toContain('Explore SuperKids');
  });
  test('the government band on the two Digital Factory pieces', () => {
    for (const slug of [S.df1, S.df2]) {
      const b = band(slug);
      expect(b, slug).toContain('Planning a Government Program?');
      expect(b, slug).toContain('Request a Briefing for Your Ministry');
      expect(b, slug).toContain('Explore Government Partnerships');
    }
  });
  test('each story gets its own text link; the button and heading stay the audience\'s', () => {
    const offers: [string, string, string][] = [
      [S.hp, 'Read the Her Power Case Study', '/ctg/impact/case-studies/her-power/'],
      [S.carn, 'Hire Talent', '/ctg/partner-with-us/employers/#hire-talent'],
      [S.cph, 'See Global Reach', '/ctg/impact/global-reach/'],
      [S.dxb, 'See Global Reach', '/ctg/impact/global-reach/'],
      [S.ind, 'See Global Reach', '/ctg/impact/global-reach/'],
      [S.som, 'See Global Reach', '/ctg/impact/global-reach/'],
      [S.h23, 'See Recognition and Media', '/ctg/about/recognition/'],
      [S.h24, 'See Recognition and Media', '/ctg/about/recognition/'],
      [S.joy, 'Read the Trial Results', '/ctg/impact/independent-evaluation/'],
      [S.free, 'More Learner Stories', '/ctg/impact/stories/'],
    ];
    for (const [slug, label, href] of offers) {
      const raw = /<section class="art__cta"[\s\S]*?<\/section>/.exec(html(post(slug)))?.[0] ?? '';
      expect(raw, slug).toContain(`href="${href}"`);
      expect(visible(raw), slug).toContain(label);
      expect(visible(raw), slug).not.toContain('See Our Programs');
    }
    expect(band(S.hp)).toContain('Request a Briefing for Your Ministry');
    expect(band(S.carn)).toContain('Working on Youth Employment?');
  });
  test('a government-band post offers the other government posts as "More News", Her Power first', () => {
    const related = (slug: string) => [...(/<section class="art__related[\s\S]*?<\/section>/.exec(html(post(slug)))?.[0] ?? '').matchAll(/href="\/ctg\/news\/([^/"]+)\/"/g)].map((m) => m[1]).filter((s, i, a) => a.indexOf(s) === i);
    expect(related(S.edge)).toEqual([S.hp, S.tot, S.skit]);
    expect(related(S.skit)).toEqual([S.hp, S.tot, S.edge]);
    expect(related(S.hp)).toEqual([S.tot, S.edge, S.skit]);
    expect(related(S.tot)).toEqual([S.hp, S.edge, S.skit]);
  });
});

/* ---------------------------------------------------------------------------------------------- */

test.describe('Impact hub (R4-01, R4-04, R4-13 to R4-17)', () => {
  test('the lead is the register answer with its fact markers, then one line on evidence kinds; no In Short band, no inventory lead', () => {
    const hero = /<section class="hero[\s\S]*?<\/section>/.exec(html(IMPACT))?.[0] ?? '';
    expect(hero).toMatch(/<p class="hero__lead"[^>]*data-fact="RC-02 OC-01"/);
    expect(visible(hero)).toContain('A randomized trial of CodersTrust’s WSDFM program found that women offered a place were 10.3 percentage points more likely to be employed. Among surveyed completers, employment was 48.0% before training and 78.2% at the October 2026 survey. Each figure names its kind of evidence.');
    const t = text(IMPACT);
    expect(t).not.toContain('In Short');
    expect(t).not.toContain('Program records from Kosovo and Bangladesh, an independent trial in Dhaka and a 2026 survey of completers.');
    expect(t.split('A randomized trial of CodersTrust’s WSDFM program found that').length - 1).toBe(1);
  });
  test('the hero carries the discovery session and the trial link', () => {
    const hero = /<section class="hero[\s\S]*?<\/section>/.exec(html(IMPACT))?.[0] ?? '';
    expect(visible(hero)).toContain('Request a Discovery Session');
    expect(hero).toContain('href="/ctg/impact/independent-evaluation/"');
    expect(visible(hero)).toContain('Read the Trial Results');
  });
  test('the +10.3 tile carries the benchmark note; program results come before reach and contract scope; the scope note is one sentence', () => {
    const glance = byId(IMPACT, 'section', 'glance');
    const g = visible(glance);
    expect(g).toContain('More than four times the 2.3-point average across nine vocational-training trials.');
    expect(glance).toContain('data-fact="RC-02 RC-06a"');
    expect(g.indexOf('Program Results, by Named Program')).toBeLessThan(g.indexOf('Reach and Contract Scope'));
    expect(g.indexOf('Survey Results, Among Surveyed Completers')).toBeLessThan(g.indexOf('Program Results, by Named Program'));
    expect(g).toContain('The total is contract scope, not a count of completers; it includes Her Power’s national program, which trained 25,125 women (CodersTrust trained 2,400 directly).');
    expect(g).not.toContain('Her Power’s 25,125 is the same group counted in the 150,000+ enrollments');
  });
  test('the case cards are a partner strip (no description line); the story is Erlisa Zherka\'s; the closing heading is the Impact pages\' one', () => {
    const cases = visible(byId(IMPACT, 'section', 'cases'));
    for (const c of CASE_STUDIES) expect(cases).not.toContain(c.scope);
    expect(cases).toContain('See All Case Studies');
    const story = visible(byId(IMPACT, 'section', 'learner-voice'));
    expect(story).toContain(`She ${fact('ST-05').text.split(' in Kosovo, ')[1]}.`);
    expect(story).toContain('Erlisa Zherka');
    expect(story).toContain('Women in Online Work, Kosovo, 2016–2017');
    expect(story).toContain('More Learner Stories');
    expect(text(IMPACT)).not.toContain('Adrian Afraham');
    expect(visible(byId(IMPACT, 'section', 'cta'))).toContain('Talk to Us About a First Cohort');
    expect(text(IMPACT)).not.toContain('Discuss the Evidence for Your Program');
  });
  test('in the browser: the hero action opens the discovery email and the closing band is last', async ({ page }) => {
    await open(page, 'impact/');
    await expect(page.locator('.hero__actions .btn').first()).toHaveAttribute('href', /^mailto:/);
    await expect(page.locator('main > section').last()).toHaveAttribute('id', 'cta');
  });
});

test.describe('Independent Evaluation (R4-02, R4-03, R4-08, R4-10, R4-14, R4-32)', () => {
  test('the lead says why the result matters; the scope caveat stays in How to Read This Trial', () => {
    const head = visible(/<header class="lf-head"[\s\S]*?<\/header>/.exec(html(TRIAL))?.[0] ?? '');
    expect(head).toContain('In a randomized trial of CodersTrust’s WSDFM program by the BRAC Institute of Governance and Development (BIGD), women offered a place were 10.3 percentage points more likely to be employed than the control group: over four times the 2.3-point average across nine randomized trials of vocational training.'); // no journal sentence beside the report figures (WP99, owner Q2 option C)
    expect(head).not.toMatch(/peer-reviewed/i);
    expect(head).toContain('Talk to Us About a First Cohort');
    expect(head).toContain('Last updated November 21, 2026');
    expect(text(TRIAL)).toContain('What was evaluated. CodersTrust’s 200-hour WSDFM program; today’s tracks are 100 hours.');
  });
  test('the sections run result, benchmark, journal, income, freelancing, funders, tracking, close', () => {
    expect(ids(main(TRIAL), 'section')).toEqual(['summary', 'context', 'journal', 'results', 'freelancing', 'funders', 'outcomes']);
    expect(main(TRIAL).indexOf('id="cta"')).toBeGreaterThan(main(TRIAL).indexOf('id="outcomes"'));
    const toc = visible(/<nav aria-label="On this page"[^>]*>[\s\S]*?<\/nav>/.exec(html(TRIAL))?.[0] ?? '');
    expect(toc).toBe('The Result Over Four Times the Average of Nine Training Trials Published in a Peer-Reviewed Journal Income, Freelancing and Household Effects Freelancing: Women Offered a Place vs. the Control Group What It Means for Funders How We Track Outcomes Talk to Us About a First Cohort');
  });
  test('the freelancing exhibit is the randomized comparison (RC-09); the classes chart (RC-08) is cut; the household line is RC-14', () => {
    const fr = byId(TRIAL, 'section', 'freelancing');
    expect(fr).toContain('data-fact="RC-09"');
    expect(visible(fr)).toContain('Employment Status at Follow-Up: Women Offered a Place vs. the Control Group');
    expect(main(TRIAL)).not.toContain('RC-08');
    expect(text(TRIAL)).not.toContain('Freelancing Share by Classes Attended');
    const results = byId(TRIAL, 'section', 'results');
    expect(results).toContain('data-fact="RC-14"');
    expect(visible(results)).toContain('Household spending was 43% higher for women who attended, against the control group (food spending 48% higher), and fewer took out loans.');
    expect(text(TRIAL)).toContain('The other results on this page come from BIGD’s report. The article is a separate publication.');
  });
  test('What It Means for Funders leads with the offer, in bold', () => {
    const f = byId(TRIAL, 'section', 'funders');
    expect(f).toMatch(/<strong[^>]*>A new pilot starts from a scorecard agreed before the first cohort, with independent evaluation welcome\.<\/strong>/);
    expect(visible(f)).toContain('A new pilot starts from a scorecard agreed before the first cohort, with independent evaluation welcome. One trial in one population does not forecast a new country or a new track. The offered-place results are the closer guide to what a funded program can deliver, because they include women who were offered a place but did not attend.');
  });
});

test.describe('Impact Survey 2026 (R4-13, R4-14, R4-19, R4-20, R4-21)', () => {
  test('the lead keeps the non-causal limit in fewer words; the hero links to the closing band', () => {
    const head = visible(/<header class="lf-head"[\s\S]*?<\/header>/.exec(html(SURVEY))?.[0] ?? '');
    expect(head).toContain('Among surveyed completers, employment rose from 48.0% before training to 78.2% at the October 2026 survey, and median monthly income rose from $98 to $245. Respondents report these outcomes, and the survey does not show that training caused the change.');
    expect(head).toContain('Talk to Us About a First Cohort');
    expect(head).toContain('Source snapshot: October 2026 · Last updated November 21, 2026');
  });
  test('Who Responded follows the results, directly above How to Read This Survey; the duplicate profile lines are cut', () => {
    const order = ids(main(SURVEY), 'section').filter((id) => ['summary', 'employment', 'speed', 'experience', 'respondents', 'methodology', 'cta'].includes(id));
    expect(order).toEqual(['summary', 'employment', 'speed', 'experience', 'respondents', 'methodology', 'cta']);
    const t = text(SURVEY);
    expect(t).not.toContain('Nearly half of surveyed completers were employed before training');
    expect(t).not.toContain('Who the respondents are.');
    expect(byId(SURVEY, 'section', 'respondents')).toContain('data-fact="OC-09"');
    // R4-21 not applied: the reviewer's heading conflicts with the settled OC-05 wording (WP48 item 32) and the definition-before-use rule (WP147), so the heading stays
    expect(t).toContain('How Fast Earnings Started');
    expect(visible(byId(SURVEY, 'section', 'cta'))).toContain('Talk to Us About a First Cohort');
    expect(t).not.toContain('Discuss the Evidence for Your Program');
  });
});

test.describe('Case studies (R4-05, R4-11, R4-12, R4-27 to R4-29, R4-33) and their hub (R4-06, R4-07)', () => {
  const CLOSING = 'Want a program like this one? Tell us the country, your priority groups and two suitable times; we outline a first cohort in a discovery session.';
  test('every case study closes on one band with the line, the button and the two links; no "Where the Model Runs Next"; no section-level story disclaimer', () => {
    for (const c of CASE_STUDIES) {
      const rel = CASE(c.slug);
      const band = visible(byId(rel, 'section', 'cta'));
      expect(band, c.slug).toContain('Talk to Us About a First Cohort');
      expect(band, c.slug).toContain(CLOSING);
      expect(band, c.slug).toContain(c.related.label);
      expect(band, c.slug).toContain('Compare the Five Case Studies');
      expect(band, c.slug).not.toContain('How to Read the Evidence');
      const t = text(rel);
      expect(t, c.slug).not.toContain('Where the Model Runs Next');
      expect(t, c.slug).not.toContain('Keep Reading');
      expect(t, c.slug).not.toContain('Individual stories, not typical or promised outcomes.');
      expect(t.split('two suitable times').length - 1, c.slug).toBe(1);
      const article = nodes(rel, 'Article')[0];
      expect(article?.dateModified, c.slug).toBe(TODAY);
    }
    expect(visible(byId(CASE('wsdfm-women-freelancers'), 'section', 'cta'))).toContain('Read the Randomized Trial Results');
  });
  test('WSDFM: the H1 names the program and its learners; the trial tiles lead and the program-record note follows the record', () => {
    const rel = CASE('wsdfm-women-freelancers');
    expect(h1Of(rel)).toBe('WSDFM: Freelancing Skills for Women, Evaluated by a Randomized Trial');
    const stats = /<div class="hero__stats"[\s\S]*?<\/section>/.exec(html(rel))?.[0] ?? '';
    const order = ['+10.3', '+41%', '711 of 1,000', 'Program records, not trial results'].map((s) => visible(stats).indexOf(s));
    expect(order.every((x) => x >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(visible(stats)).toContain('Randomized trial by the BRAC Institute of Governance and Development (BIGD), May 2022');
    expect(visible(stats)).toContain('Program records, not trial results; the 425 women offered a place in the randomized trial by BIGD were among the 1,000 women enrolled.');
  });
  test('Kosovo and Albania: the sublines and the trimmed repeats', () => {
    const k = CASE('kosovo-women-in-online-work');
    expect(text(k)).toContain('Young women in five municipalities trained in two phases and bid on real online work.');
    expect(text(k)).not.toContain('The Women in Online Work (WoW) pilot prepared young women in five municipalities in Kosovo for online work.');
    expect(text(k)).not.toContain('Women in Online Work was a pilot with the World Bank Group in 2016–2017.');
    expect(text(k)).toContain('The figures above are from CodersTrust program records.');
    const a = CASE('digital-jobs-albania');
    expect(text(a)).toContain('A World Bank initiative for women in Albania. The World Bank names CodersTrust as the international digital skills training provider in the partnership.');
    expect(text(a)).toContain('The initiative gave participants:');
    expect(text(a).split('The World Bank names CodersTrust as the international digital skills training provider').length - 1).toBe(1);
  });
  test('Her Power: the national program\'s tile in the hero and its result as the sub-heading', () => {
    const rel = CASE('her-power');
    const stats = /<div class="hero__stats"[\s\S]*?<\/section>/.exec(html(rel))?.[0] ?? '';
    expect(stats).toContain('data-fact="GV-01"');
    expect(visible(stats)).toContain('25,125');
    expect(text(rel)).toContain('The National Program Trained 25,125 Women Across 130 Sub-Districts');
    expect(text(rel)).not.toContain('National Scale: The Wider Program');
  });
  test('the hub: the lead names the partners; the WSDFM card shows the trial figure above its program record', () => {
    expect(text(HUB)).toContain('With the World Bank, UNDP, Porticus and the Government of Bangladesh. Each program shows its figure and its base.');
    const card = /<article class="card card--link case"[^>]*>(?:(?!<\/article>)[\s\S])*wsdfm-women-freelancers[\s\S]*?<\/article>/.exec(html(HUB))?.[0] ?? '';
    const v = visible(card);
    expect(v).toContain('+10.3 percentage points more employment for women offered a place (randomized trial of CodersTrust’s WSDFM program)');
    expect(v.indexOf('+10.3')).toBeLessThan(v.indexOf('711 of 1,000'));
    expect(html(HUB)).toMatch(/data-fact="[^"]*\bRC-02\b/);
    expect(nodes(HUB, 'Article')[0]?.dateModified).toBe(TODAY);
  });
});

test.describe('Stories, Global Reach, In the Field and News Photographs (R4-22 to R4-26, R4-31)', () => {
  test('Stories: the lead, the strongest outcomes first, case-study links and the learner route', () => {
    const t = text(STORIES);
    expect(t).toContain('First freelance projects, first clients and paying jobs. Individual stories, not typical or promised outcomes.');
    const grid = byId(STORIES, 'section', 'stories');
    const visibleNine = /<ul class="grid-cards sgrid"[\s\S]*?<\/ul>/.exec(grid)?.[0] ?? '';
    const names = [...visibleNine.matchAll(/<p class="sc__name"[^>]*>([^<]+)<\/p>/g)].map((m) => m[1]);
    expect(names).toEqual(['Erlisa Zherka', 'Aklima Akder', 'Shamim Ahmed', 'Mysha K. Diya', 'Nushrat Jahan', 'Mustafa Zabed', 'Adrian Afraham', 'Ashraful Alam Sani', 'Zarin Tusnim Shifa']);
    const more = /<details class="sg-more"[\s\S]*?<\/details>/.exec(grid)?.[0] ?? '';
    const tail = [...more.matchAll(/<p class="sc__name"[^>]*>([^<]+)<\/p>/g)].map((m) => m[1]);
    expect(tail.slice(-2).sort()).toEqual(['Arfias Islam Rudro', 'Aysha Akter Bipasha']);
    const caseLinks = [...main(STORIES).matchAll(/<p class="sc__case"[^>]*><a class="link" href="([^"]+)"/g)].map((m) => m[1].replace(/^\/ctg/, ''));
    expect(caseLinks).toEqual([
      '/impact/case-studies/wsdfm-women-freelancers/',
      '/impact/case-studies/her-power/',
      '/impact/case-studies/kosovo-women-in-online-work/',
      '/impact/case-studies/undp-yes-korail/',
      '/impact/case-studies/undp-yes-korail/',
    ]);
    expect(t).toContain('Looking for a course for yourself? See Courses on JobReady.global.');
    expect(main(STORIES)).toContain('href="https://jobready.global/"');
    expect(nodes(STORIES, 'Article')[0]?.dateModified).toBe(TODAY);
  });
  test('Global Reach: the lead names the partners and the Bangladesh start', () => {
    expect(text(REACH)).toContain('Across Asia, Africa, Europe and the Americas, with partners including the World Bank, the World Food Programme and SOS Children’s Villages. In Bangladesh since 2014.');
    expect(nodes(REACH, 'Article')[0]?.dateModified).toBe(TODAY);
  });
  test('In the Field: the women\'s, UNDP YES and SuperKids collections link to their case studies and program', () => {
    const women = byId(FIELD, 'section', 'women');
    expect(visible(women)).toContain('Case studies: Women in Online Work, Kosovo · WSDFM · Her Power');
    for (const href of ['/ctg/impact/case-studies/kosovo-women-in-online-work/', '/ctg/impact/case-studies/wsdfm-women-freelancers/', '/ctg/impact/case-studies/her-power/']) expect(women).toContain(`href="${href}"`);
    expect(visible(byId(FIELD, 'section', 'youth'))).toContain('Read the UNDP YES, Korail Case Study');
    expect(byId(FIELD, 'section', 'superkids')).toContain('href="/ctg/programs/superkids/"');
    expect(nodes(FIELD, 'Article')[0]?.dateModified).toBe(TODAY);
  });
});

test.describe('Dates (constraint 12): every page whose visible text changed is dated 2026-11-21', () => {
  test('every news post', () => {
    for (const slug of NEWS_SLUGS) {
      expect(frontMatter(slug), slug).toMatch(/^updated: 2026-11-21$/m);
      expect(nodes(post(slug), 'NewsArticle')[0]?.dateModified, slug).toBe(TODAY);
    }
  });
  test('the Impact pages and the pages that print the changed news headlines', () => {
    expect(nodes(IMPACT, 'Article')[0]?.dateModified).toBe(TODAY);
    expect(nodes(TRIAL, 'Article')[0]?.dateModified).toBe(TODAY);
    expect(nodes(SURVEY, 'Article')[0]?.dateModified).toBe(TODAY);
    expect(nodes(PHOTOS, 'Article')[0]?.dateModified).toBe(TODAY);
    expect(nodes('about/recognition/index.html', 'WebPage')[0]?.dateModified).toBe(TODAY);
    expect(ld('about/team/aziz-ahmad/index.html').find((n) => [n['@type']].flat().includes('ProfilePage'))?.dateModified).toBe(TODAY);
  });
});
