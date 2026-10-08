import data from '../data/permissions.json';
import { isClearedRow, stagingMayRender, type PermissionRow } from './permissionRule.mjs';

/**
 * D13 public permissions metadata (R6-M3): five non-personal fields per asset. Holder details, contacts
 * and release documents stay in the private repository under the same `clearanceId`.
 *
 * Components that show consent-dependent assets (learner/team/mentor photos, names, quotes, stories, press and
 * endorsement assets) carry `data-asset="<assetId>"`; scripts/check-permissions.mjs reads those attributes
 * from the built HTML. The rule (src/lib/permissionRule.mjs, shared with the gate script and astro.config.mjs):
 *  - staging renders an asset when it is `cleared`, or when `publishedOnLegacySite` is true and `sensitiveGroup` is false;
 *  - production renders only `cleared` assets (the build fails otherwise).
 * Names, quotes and stories follow the same rule as photos. A sensitive-group asset reaches a page only with a cleared
 * release, and is never committed to this public repository without one (scripts/check-repo-publication.mjs).
 * Sample assets in the component gallery use the `example-` prefix, which is allowed only on /styleguide/.
 */
export type Permission = PermissionRow;

export const EXAMPLE_ASSET_PREFIX = 'example-';

export const permissions = data as Permission[];

const rowFor = (assetId: string): Permission | undefined => permissions.find((p) => p.assetId === assetId);

/** Production rule: a `cleared` row exists. */
export function isCleared(assetId: string): boolean {
  return isClearedRow(rowFor(assetId));
}

/** Staging rule (D13, round 8): cleared, or already published on coderstrust.global and not in a sensitive group. */
export function isStagingRenderable(assetId: string): boolean {
  return stagingMayRender(rowFor(assetId));
}

/**
 * Render gate for components that have a text or illustration fallback (news covers, partner logos, learner names,
 * quotes and photos). Staging: an asset that is neither cleared nor (published on coderstrust.global AND not in a
 * sensitive group) is replaced by the fallback, so it never reaches the markup. An asset with NO row is still rendered,
 * so that scripts/check-permissions.mjs reports the missing row. Production never hides anything here: the gate script
 * fails the build until every rendered asset is `cleared`.
 */
export function mayRender(assetId: string): boolean {
  if (__SITE_ENV__ === 'production') return true;
  const row = rowFor(assetId);
  return !row || stagingMayRender(row);
}
