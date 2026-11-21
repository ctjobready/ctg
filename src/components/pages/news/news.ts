import { resolve } from 'node:path';
import { getCollection, type CollectionEntry } from 'astro:content';
import { TOPICS as TOPIC_LABELS } from '../../../data/newsTopics';
import { coverAppearsInBody, readCoverRepeat } from '../../../lib/newsCover.mjs';

export type NewsEntry = CollectionEntry<'news'>;

/** Topic labels (planning/02 §2), shared with the Home news teaser (src/data/newsTopics.ts). Typed against the collection's `topic` enum, so a new topic must get a label. */
export const TOPICS: Record<NewsEntry['data']['topic'], string> = TOPIC_LABELS;
export const TOPIC_KEYS = Object.keys(TOPICS) as NewsEntry['data']['topic'][];

/** All published news, newest first. */
export async function allNews(): Promise<NewsEntry[]> {
  const posts = await getCollection('news', (e) => !e.data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/**
 * WP166-C (owner approval of 21 November 2026, "Archive label: narrow and shorten"; R5-05, R6-05): a post dated 2026 or later is current news, so its banner
 * shows the "Published …; updated …" line alone (no "Archived post" label, no disclaimer). An older post keeps one shorter note, date first, with the same meaning.
 */
export const CURRENT_NEWS_FROM_YEAR = 2026;
export const isCurrentNews = (date: Date): boolean => date.getUTCFullYear() >= CURRENT_NEWS_FROM_YEAR;

/**
 * WP166-C (R5-01, owner approval of 21 November 2026): the News index's "Featured" row, four proof stories in this order, above the dated list. A meeting,
 * visit or reception post is never featured; the build stops if an entry is missing or is a draft.
 */
export const FEATURED_NEWS = [
  '25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative',
  'coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment',
  'a-proud-milestone-for-coderstrust',
  'aziz-ahmad-co-founder-and-global-chairman-of-coderstrust-appointed-as-global-upeace-ambassador',
] as const;

export function featuredNews(all: NewsEntry[]): NewsEntry[] {
  return FEATURED_NEWS.map((id) => {
    const p = all.find((x) => x.id === id);
    if (!p) throw new Error(`News index: the featured post ${id} is missing or a draft`);
    return p;
  });
}

/**
 * WP166-C (R5-20): a post with the government band offers the other government-band posts as "More News", Her Power first, then the Training of Trainers
 * post, EDGE and SKIT, then any other government-band post, newest first; so a ministry reader is offered the other contracts, not a placement MOU.
 */
const GOVERNMENT_RELATED_FIRST = [
  '25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative',
  'coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment',
  '1000-trainees-enhancing-digital-government-economy-edge',
  '1000-trainees-sheikh-kamal-ict-incubator-training',
];

/** Related posts: same topic first, then the most recent others; a government-band post gets the other government-band posts (WP166-C). */
export function relatedNews(all: NewsEntry[], post: NewsEntry, count = 3): NewsEntry[] {
  const others = all.filter((p) => p.id !== post.id);
  if (newsAudience(post) === 'government') {
    const gov = others.filter((p) => newsAudience(p) === 'government');
    const rank = (p: NewsEntry) => {
      const i = GOVERNMENT_RELATED_FIRST.indexOf(p.id);
      return i === -1 ? GOVERNMENT_RELATED_FIRST.length : i;
    };
    return [...gov].sort((a, b) => rank(a) - rank(b) || b.data.date.valueOf() - a.data.date.valueOf()).slice(0, count);
  }
  const same = others.filter((p) => p.data.topic === post.data.topic);
  const rest = others.filter((p) => p.data.topic !== post.data.topic);
  return [...same, ...rest].slice(0, count);
}

/**
 * The issuing body of the founder's SDG award (spelled both ways in the legacy posts). Evergreen pages never name it
 * (register PA-11), so a post whose headline does is never teased there; it stays under /news/.
 */
const ISSUER_ACRONYM = /\bUN(?:SG|GS)II\b/i;

/** Lowercase, accents and the Danish "æ" folded to plain letters, so "Kjaerulff" and "Kjærulff" match. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/æ/gi, 'ae').toLowerCase();

/** True when the post may be teased on an evergreen page: not political and not headlined by the award issuer's acronym. */
const teasable = (p: NewsEntry) => !p.data.political && !ISSUER_ACRONYM.test(`${p.data.title} ${p.data.excerpt}`);

/**
 * Posts whose headline (title or excerpt, the text a card shows) names a person, newest first. Used for "related news"
 * on team profiles, which are evergreen pages. A post that names the person only in passing in its body (another
 * person's honor that thanks a late co-founder, say) is not about them and is not shown; political posts and posts
 * headlined by the award issuer's acronym are skipped too.
 */
export function newsMentioning(all: NewsEntry[], name: string, count = 3): NewsEntry[] {
  const needle = fold(name.replace(/^(Md\.|Mr\.|Dr\.)\s+/i, ''));
  return all.filter((p) => teasable(p) && fold(`${p.data.title}\n${p.data.excerpt}`).includes(needle)).slice(0, count);
}

/** News for teasers on evergreen (non-/news/) pages: political posts and posts naming the award issuer are excluded. */
export function teasableNews(all: NewsEntry[]): NewsEntry[] {
  return all.filter(teasable);
}

export const newsHref = (post: NewsEntry) => `/news/${post.id}/`;

/**
 * Alt text for a cover image. Migrated alt texts such as "…: photo 2 of 3" or "…: cover image" describe
 * nothing, so those covers are treated as decorative (empty alt); real descriptions pass through.
 */
export function coverAlt(alt: string): string {
  return /(: (photo \d+ of \d+|cover image)$)|^Photo from the news story/i.test(alt) ? '' : alt;
}

/**
 * Alt text for the og:image / twitter:image of a post. The social image is never decorative, so the generic
 * migrated alts (which `coverAlt` empties) fall back to a plain description built from the headline.
 */
export function ogImageAlt(alt: string, title: string): string {
  return coverAlt(alt) || `Photo from the news story: ${title}`;
}

/**
 * The post's first body image is its cover photo (the same file, or a crop flagged with `coverInBody`): the page shows the photo once, as
 * the hero, and the Markdown plugin in astro.config.mjs drops the repeat (and its italic caption line) from the body. `caption` is that
 * line, to be set under the hero. Decided by src/lib/newsCover.mjs, the same function the plugin uses.
 */
export function coverRepeat(post: NewsEntry): { repeats: boolean; caption?: string } {
  return readCoverRepeat(resolve(process.cwd(), post.filePath ?? `src/content/news/${post.id}.md`));
}

/**
 * True when the cover image is also embedded in the body, further down (the hero would repeat it): then the body keeps its copy and there
 * is no hero. Compared by file contents, not by file name (a cover "x-1.jpg" matched any body that mentioned "x-1", such as "x-1-2.jpg",
 * and lost its hero for a different photo). Posts whose first body image is the cover are handled by coverRepeat() instead.
 */
export function coverDuplicatesBody(post: NewsEntry): boolean {
  return post.data.cover ? coverAppearsInBody(resolve(process.cwd(), post.filePath ?? `src/content/news/${post.id}.md`)) : false;
}

/**
 * Which closing call to action an archived post gets (WP20a). The posts carry no audience field, so the choice is listed by post slug; a post that is
 * not listed (a new one, or one that is about CodersTrust generally) gets the discovery session. The archived text itself is never touched.
 */
export type NewsAudience = 'corporate' | 'university' | 'government' | 'school' | 'general';

const AUDIENCE_BY_POST: Record<string, NewsAudience> = {
  'coderstrust-provides-corporate-training-to-akij-group-one-of-the-largest-conglomerates-of-south-asia': 'corporate',
  'mou-signing-ceremony-between-north-south-university-coderstrust': 'university',
  'coderstrust-chairman-aziz-ahmad-visits-city-college-downtown-to-explore-global-partnership': 'university',
  'coderstrust-is-signing-mou-with-un-mandated-university-for-peace-on-academic-collaboration': 'university',
  'coderstrust-chairman-and-co-founder-aziz-ahmad-encourages-rmstu-graduates-to-build-global-careers-through-skills-and-innovation': 'university',
  'mou-signed-between-bangladesh-petroleum-institute-bpi-and-coderstrust': 'government', // WP87 (CLR review, Opus High run 1, finding 4): an energy-sector government MOU gets the briefing band, not the universities offer
  'coderstrust-is-committed-to-the-vision-of-a-smart-bangladesh-within-2041-aziz-ahmad': 'university',
  '1000-trainees-enhancing-digital-government-economy-edge': 'government',
  '1000-trainees-sheikh-kamal-ict-incubator-training': 'government',
  '25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative': 'government',
  'coderstrust-and-doict-shaping-a-smart-future-through-trainer-empowerment': 'government',
  'coderstrust-seals-groundbreaking-mou-with-nctb-paving-the-way-for-competency-based-learning-opportunities': 'government',
  // WP166-C (R6-24): the two Digital Factory pieces set out a national-skills vision, so they close on the ministry briefing.
  'the-future-building-a-digital-factory-for-bangladesh': 'government',
  'why-we-call-it-a-digital-factory': 'government',
  // WP166-C (R5-19): STEM and coding content for schools closes on the school band.
  'coderstrust-brings-discovery-education-the-global-leader-of-stem-education-to-bangladeshi-schools-and-learners': 'school',
};

export const newsAudience = (post: NewsEntry): NewsAudience => AUDIENCE_BY_POST[post.id] ?? 'general';

/**
 * WP166-C (R5-08, R6-25 to R6-28): the closing band's text link follows the story where the band's default offer is the wrong next page; the heading, line and
 * button stay the audience's. Labels and anchors are the ones the site already uses for these pages.
 */
const OFFER_BY_POST: Record<string, { label: string; href: string }> = {
  '25000-trainees-her-power-empowerment-of-women-through-ict-frontier-initiative': { label: 'Read the Her Power Case Study', href: '/impact/case-studies/her-power/' },
  'coderstrust-organizes-career-carnival-for-students-and-affiliates': { label: 'Hire Talent', href: '/partner-with-us/employers/#hire-talent' },
  'coderstrust-launches-in-copenhagen-with-a-virgin-unite-dinner': { label: 'See Global Reach', href: '/impact/global-reach/' },
  'coderstrust-presents-at-in5-in-dubai': { label: 'See Global Reach', href: '/impact/global-reach/' },
  'coderstrust-sets-up-in-india': { label: 'See Global Reach', href: '/impact/global-reach/' },
  'hour-of-code-in-somaliland': { label: 'See Global Reach', href: '/impact/global-reach/' },
  'coderstrust-earns-recognition-among-top-100-edtech-companies-in-south-asia': { label: 'See Recognition and Media', href: '/about/recognition/' },
  'coderstrust-recognized-among-holoniqs-2024-south-asia-edtech-100': { label: 'See Recognition and Media', href: '/about/recognition/' },
  'empowering-women-in-digital-economy-certificate-giving-ceremony-by-coderstrust-with-joyeeta-foundation': { label: 'Read the Trial Results', href: '/impact/independent-evaluation/' },
  'coderstrust-teaching-you-freelancing-the-right-way': { label: 'More Learner Stories', href: '/impact/stories/' },
};

/** The closing band's text link for a post: its own (OFFER_BY_POST) or its audience's. */
export const newsOffer = (post: NewsEntry): { label: string; href: string } => OFFER_BY_POST[post.id] ?? NEWS_CTA[newsAudience(post)].offer;

/** The closing module per audience: the heading and line, the CTA from the CTA library, and one text link to the current offer. */
export const NEWS_CTA: Record<NewsAudience, { heading: string; text: string; cta: 'discovery' | 'work' | 'campus' | 'briefing'; offer: { label: string; href: string } }> = {
  general: {
    heading: 'Working on Youth Employment?',
    text: 'Tell us your goals, priority groups and two suitable times. A discovery session is a conversation, not a commitment.',
    cta: 'discovery',
    offer: { label: 'See Our Programs', href: '/programs/' },
  },
  corporate: {
    heading: 'Building Your Team’s Digital Skills?',
    text: 'Tell us your company, team size, skills needed and timeline, with two suitable times for a discovery session.',
    cta: 'work',
    offer: { label: 'Explore JobReady@Work', href: '/programs/jobready-work/' },
  },
  university: {
    heading: 'Preparing Students for Work?',
    text: 'Tell us your institution, number of students and programs of interest, with two suitable times for a discovery session.',
    cta: 'campus',
    offer: { label: 'Explore JobReady@Campus', href: '/programs/jobready-campus/' },
  },
  government: {
    heading: 'Planning a Government Program?',
    text: 'Tell us your agency and program target, with two suitable times for a briefing.',
    cta: 'briefing',
    offer: { label: 'Explore Government Partnerships', href: '/partner-with-us/governments/' },
  },
  // WP166-C (R5-19): a school reader (STEM and coding content for classrooms) is asked about the school, with the SuperKids page as the offer.
  school: {
    heading: 'Bringing Coding and Robotics into Your Classroom?',
    text: 'Tell us your school, grade levels and two suitable times for a discovery session.',
    cta: 'discovery',
    offer: { label: 'Explore SuperKids', href: '/programs/superkids/' },
  },
};
