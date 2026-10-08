import data from '../data/permissions.json';

/**
 * D13 public permissions metadata (R6-M3): five non-personal fields per asset. Holder details, contacts
 * and release documents stay in the private repository under the same `clearanceId`.
 *
 * Components that show consent-dependent assets (learner/team/mentor photos, names, quotes, press and
 * endorsement assets) carry `data-asset="<assetId>"`; scripts/check-permissions.mjs reads those attributes
 * from the built HTML:
 *  - staging renders an asset only when `publishedOnLegacySite` is true and `sensitiveGroup` is false;
 *  - production renders only `cleared` assets (the build fails otherwise).
 * Sample assets in the component gallery use the `example-` prefix, which is allowed only on /styleguide/.
 */
export interface Permission {
  assetId: string;
  /** Release reference in the private repository; null until a release is on file. */
  clearanceId: string | null;
  status: 'cleared' | 'pending';
  /** True when the image, name or quote already appeared on coderstrust.global (generated from the WordPress export). */
  publishedOnLegacySite: boolean;
  /** True for minors, refugees, third-gender trainees and slum residents (from a private classification list). */
  sensitiveGroup: boolean;
}

export const EXAMPLE_ASSET_PREFIX = 'example-';

export const permissions = data as Permission[];

const rowFor = (assetId: string): Permission | undefined => permissions.find((p) => p.assetId === assetId);

/** Production rule: a `cleared` row exists. */
export function isCleared(assetId: string): boolean {
  return rowFor(assetId)?.status === 'cleared';
}

/** Staging rule (D13 v1.3): already published on coderstrust.global and not in a sensitive group. */
export function isStagingRenderable(assetId: string): boolean {
  const row = rowFor(assetId);
  return Boolean(row && row.publishedOnLegacySite && !row.sensitiveGroup);
}
