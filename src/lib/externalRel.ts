import { partners } from '../data/partners';

/**
 * rel policy for links that leave the site (planning/08 §9): every one carries `noopener`; `noreferrer` is added
 * for everything except CodersTrust's own sites and partner organizations.
 *
 * Plain module on purpose: astro.config.mjs imports it for the Markdown link plugin, so it must not touch
 * `import.meta.env` or any Astro-only module. `linkAttrs()` in url.ts is the single caller for components.
 */

/** Hostname without a leading "www." ("" when the value is not a URL). */
export function hostKey(href: string): string {
  try {
    return new URL(href, 'https://base.invalid').hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** CodersTrust's own sites. The referrer is wanted there: it is how course traffic from this site shows up as a referral. */
export const OWN_HOSTS: readonly string[] = ['coderstrust.global', 'jobready.global'];

/**
 * Partner organizations: the hosts of the `url` fields in src/data/partners.ts (the same list scripts/check-seo.mjs
 * reads), so adding a partner there needs no second edit. Press outlets (pressOutlets) are not partners.
 */
export const PARTNER_HOSTS: readonly string[] = [...new Set(partners.map((p) => (p.url ? hostKey(p.url) : '')).filter(Boolean))].sort();

const REFERRER_OK = new Set<string>([...OWN_HOSTS, ...PARTNER_HOSTS]);

/** True when a link to this host may carry the referrer (own site or partner). */
export const keepsReferrer = (href: string): boolean => REFERRER_OK.has(hostKey(href));

/** rel for an absolute http(s) link that leaves the site. */
export const externalRel = (href: string): string => (keepsReferrer(href) ? 'noopener' : 'noopener noreferrer');
