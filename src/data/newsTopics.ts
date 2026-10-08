/**
 * Human labels for the `topic` values of the news collection (planning/02 §2). Keys match the `topic` enum in
 * src/content.config.ts; every news card, badge and filter shows these labels, never the slug.
 */
export type NewsTopic = 'partnerships' | 'recognition' | 'programs-events' | 'leadership-advocacy' | 'insights';

export const TOPICS: Record<NewsTopic, string> = {
  partnerships: 'Partnerships & MoUs',
  recognition: 'Recognition',
  'programs-events': 'Programs & events',
  'leadership-advocacy': 'Leadership & advocacy',
  insights: 'Insights',
};

/** Label for a topic slug (an unknown slug is a content error and fails the build). */
export function topicLabel(topic: string): string {
  const label = (TOPICS as Record<string, string | undefined>)[topic];
  if (!label) throw new Error(`Unknown news topic "${topic}" (expected one of ${Object.keys(TOPICS).join(', ')})`);
  return label;
}
