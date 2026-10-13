import type { APIRoute } from 'astro';
import { ENTITY_DEFINITION, PRODUCTION_ORIGIN, SITE_NAME } from '../lib/site';

/**
 * llms.txt (planning/09 §1 and §6).
 *
 * Line 1 is the title and line 2 is the entity definition, character for character ENTITY_DEFINITION (ID-01), so the
 * wording cannot drift from the Home, About and JSON-LD copies. Then the priority resources, the canonical reference
 * pages, and what to deprioritise. Every URL is a production URL.
 *
 * Page descriptions are NOT typed here: they are the pages' own meta descriptions, appended to each link line by
 * scripts/postbuild-llms.mjs (run by scripts/postbuild-redirects.mjs after the build) so a changed page cannot leave a
 * stale description in this file and no registered number is ever typed twice. Without that step the file is still valid;
 * its link lines just carry no description.
 */
type Item = { name: string; path: string; note?: string };

const PRIORITY: Item[] = [
  { name: 'Home', path: '/' },
  { name: 'About CodersTrust', path: '/about/' },
  { name: 'TalentLEAP', path: '/our-model/talentleap/' },
  { name: 'Outcomes 2026', path: '/impact/outcomes-2026/' },
  { name: 'Independent Evaluation', path: '/impact/independent-evaluation/' },
  { name: 'YouthWIDE', path: '/programs/youthwide/' },
  { name: 'Partner with us', path: '/partner-with-us/' },
  { name: 'Investors', path: '/partner-with-us/investors/' },
  { name: 'NU Postgraduate Diploma', path: '/programs/nu-postgraduate-diploma/' },
];

const REFERENCE: Item[] = [
  { name: 'Our Model', path: '/our-model/' },
  { name: 'JobReady platform', path: '/our-model/jobready-platform/' },
  { name: 'Impact and evidence', path: '/impact/' },
  { name: 'Case Studies', path: '/impact/case-studies/' },
  { name: 'Success Stories', path: '/impact/stories/' },
  { name: 'Global reach', path: '/impact/global-reach/' },
  { name: 'In the field (photo collections)', path: '/impact/in-the-field/' },
  { name: 'News photo archive', path: '/impact/in-the-field/news-photos/' },
  {
    name: 'Outcomes 2026 published aggregates (CSV)',
    path: '/data/outcomes-2026-aggregates.csv',
    note: 'The published aggregates behind the Outcomes 2026 findings, as a CSV file.',
  },
  { name: 'Programs', path: '/programs/' },
  { name: 'JobReady@Campus', path: '/programs/jobready-campus/' },
  { name: 'JobReady@Work', path: '/programs/jobready-work/' },
  { name: 'SuperKids', path: '/programs/superkids/' },
  { name: 'Governments', path: '/partner-with-us/governments/' },
  { name: 'Development Partners', path: '/partner-with-us/development-partners/' },
  { name: 'Foundations', path: '/partner-with-us/foundations/' },
  { name: 'Universities', path: '/partner-with-us/universities/' },
  { name: 'Employers', path: '/partner-with-us/employers/' },
  { name: 'Local Partners', path: '/partner-with-us/local-partners/' },
  { name: 'Leadership and Team', path: '/about/team/' },
  { name: 'Governance and Accountability', path: '/about/governance/' },
  { name: 'Instructors and Mentors', path: '/about/mentors/' },
  { name: 'Recognition and Media', path: '/about/recognition/' },
  { name: 'News', path: '/news/' },
  { name: 'Careers', path: '/careers/' },
  { name: 'Contact', path: '/contact/' },
];

const line = ({ name, path, note }: Item) => `- [${name}](${PRODUCTION_ORIGIN}${path})${note ? `: ${note}` : ''}`;

function llmsTxt(): string {
  return [
    `# ${SITE_NAME}`,
    ENTITY_DEFINITION,
    '',
    '## Priority resources',
    ...PRIORITY.map(line),
    '',
    '## Canonical reference pages',
    ...REFERENCE.map(line),
    '',
    '## Deprioritised',
    `- Redirect stubs: legacy ${PRODUCTION_ORIGIN.replace('https://', '')} paths (old posts, archives, feeds and course pages) that forward to the pages above. Follow them to the destination; do not cite or index the stub.`,
    // the component gallery is not part of a production build (WP20a), so only the other builds name it
    ...(__SITE_ENV__ === 'production' ? [] : [`- Styleguide (${PRODUCTION_ORIGIN}/styleguide/): an internal component gallery for quality checks, not content.`]),
    '',
  ].join('\n');
}

export const GET: APIRoute = () => new Response(llmsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
