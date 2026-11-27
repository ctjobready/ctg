/**
 * WP175 (owner decision of 28 November 2026: every conversion page follows CMF v3, C1 to C14, in order and coverage): the values a band may carry in
 * `data-cmf` (the Tone wrapper, src/components/pages/home/Tone.astro). Tone stops the build on any other value, so a typo cannot slip into the order that the
 * per-page specs read (tests/support/cmf.ts).
 *   - the CMF components C1 to C14 and GEO, the "What Is CodersTrust?" band directly under the hero;
 *   - the declared compressions, one band standing for C2 to C4 (the audience pages, P10, P13, P15 and Home) or C2 to C3 (Investors, P12 and P14, which keep their C4 band);
 *   - the recorded rows that are not CMF components: Home's "Results You Can Check" carousel (RESULTS) and router (ROUTER), and the glance strips (GLANCE) of P3, P4, P5,
 *     P10, P12, P13 and P14 (doc 06 v1.23 and the 2026-11-28 records).
 */
export const CMF_COMPONENTS = ['C1', 'GEO', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C13', 'C14'] as const;
export const CMF_COMPRESSIONS = { 'C2-C4': 'C2-C4 (compressed)', 'C2-C3': 'C2-C3 (compressed)' } as const;
export const CMF_ROWS = ['RESULTS', 'ROUTER', 'GLANCE'] as const;
export const CMF_TAGS = [...CMF_COMPONENTS, ...Object.values(CMF_COMPRESSIONS), ...CMF_ROWS] as const;
export type CmfTag = (typeof CMF_TAGS)[number];

/** True for a value of the CMF vocabulary. */
export const isCmfTag = (value: string): value is CmfTag => (CMF_TAGS as readonly string[]).includes(value);
/**
 * True for a value that reads as a CMF component (C and a digit, GEO, or one of the recorded rows), so a typo of one is caught; a non-conversion page's own band labels (the partner hub's HERO,
 * AUDIENCES, HOW, DILIGENCE, FAQ and CTA) are not CMF tags and are left as they are.
 */
export const looksLikeCmfTag = (value: string): boolean => /^(?:C\d|GEO\b|RESULTS\b|ROUTER\b|GLANCE)/.test(value);
