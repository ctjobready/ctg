/**
 * The D13 render rule as plain, dependency-free functions (planning/08 §4, review round 8 m2).
 *
 *   staging     an asset, name, quote or story renders when its row is `cleared`, OR when it is already published on
 *               coderstrust.global (`publishedOnLegacySite`) AND is not in a sensitive group (`sensitiveGroup` false).
 *               Staging is noindex but publicly reachable, so it may re-publish what CodersTrust itself published for
 *               adult learners; anything else stays anonymized or illustrated until a release is on file.
 *   production  an asset renders only when its row is `cleared`.
 *
 * Plain JavaScript on purpose: the same functions are imported by src/lib/permissions.ts (components), by
 * astro.config.mjs (the Markdown image plugin) and by scripts/check-permissions.mjs (the build gate), so the three can
 * never drift apart. A row is the five non-personal fields of src/data/permissions.json.
 */

/**
 * @typedef {{ assetId: string; clearanceId: string | null; status: 'cleared' | 'pending'; publishedOnLegacySite: boolean; sensitiveGroup: boolean }} PermissionRow
 */

/** A release is on file for the asset. */
export const isClearedRow = (/** @type {PermissionRow | undefined} */ row) => row?.status === 'cleared';

/** Already published on coderstrust.global and not in a sensitive group (minors, refugees, third-gender trainees, slum residents). */
export const isLegacyAdultRow = (/** @type {PermissionRow | undefined} */ row) => Boolean(row && row.publishedOnLegacySite && !row.sensitiveGroup);

/** Staging rule: cleared, or already published for an adult (non-sensitive) audience. */
export const stagingMayRender = (/** @type {PermissionRow | undefined} */ row) => isClearedRow(row) || isLegacyAdultRow(row);

/** Production rule: cleared only. */
export const productionMayRender = isClearedRow;

/**
 * Rule for an environment.
 * @param {'staging' | 'production'} env
 * @param {PermissionRow | undefined} row
 */
export const mayRenderRow = (env, row) => (env === 'production' ? productionMayRender(row) : stagingMayRender(row));

/**
 * Why a row does not render on staging (for the build gate's messages), or null when it does.
 * @param {PermissionRow} row
 */
export function stagingBlockReason(row) {
  if (stagingMayRender(row)) return null;
  if (row.sensitiveGroup) return 'is in a sensitive group and has no cleared release, so it must not render';
  return 'was not already published on coderstrust.global and has no cleared release, so it must not render on staging';
}
