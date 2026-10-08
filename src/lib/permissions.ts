import data from '../data/permissions.json';

/**
 * D13 public permissions metadata: only asset ID, clearance ID and status. Holder details, contacts
 * and release documents stay in the private repository. Components that show consent-dependent
 * assets (learner photos, names, quotes) carry `data-asset="<assetId>"`; scripts/check-permissions.mjs
 * reads those attributes from the built HTML and, in production, fails on any asset not `cleared`.
 */
export interface Permission {
  assetId: string;
  clearanceId: string;
  status: 'cleared' | 'pending';
}

export const permissions = data as Permission[];

export function isCleared(assetId: string): boolean {
  return permissions.some((p) => p.assetId === assetId && p.status === 'cleared');
}
