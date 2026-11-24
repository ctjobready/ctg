import { CTAS, CTA_RECIPIENT, type CtaDef, type CtaKey } from '../data/ctas';
import { REPORT_EDITION_READY } from './site';

/** Encode with CRLF line breaks as RFC 6068 expects. */
function enc(s: string): string {
  return encodeURIComponent(s);
}

/** Build a mailto: URL. */
export function mailto(opts: { to?: string; subject?: string; body?: string }): string {
  const params: string[] = [];
  if (opts.subject) params.push(`subject=${enc(opts.subject)}`);
  if (opts.body) params.push(`body=${enc(opts.body)}`);
  return `mailto:${opts.to ?? CTA_RECIPIENT}${params.length ? '?' + params.join('&') : ''}`;
}

/** Body template: greeting, one "Field:" line per entry for the sender to complete. */
export function bodyTemplate(lines: string[]): string {
  return ['Hello CodersTrust team,', '', ...lines.map((l) => `${l}: `), '', 'Thank you.'].join('\r\n');
}

/**
 * Is this CTA withheld? The `report` CTA is until REPORT_EDITION_READY (src/lib/site.ts) is switched on. A withheld CTA has an empty
 * href, and every component that draws a CTA (Button, CTABand, NextStep, the Contact routes) draws nothing for an empty href.
 */
export function ctaWithheld(key: CtaKey): boolean {
  return key === 'report' && !REPORT_EDITION_READY;
}

/** href for a CTA key (mailto, or the external form for `nu-pgd`); '' while the CTA is withheld. */
export function ctaHref(key: CtaKey): string {
  if (ctaWithheld(key)) return '';
  const cta = CTAS[key];
  if (cta.href) return cta.href;
  return mailto({
    to: cta.to,
    subject: cta.subject,
    body: cta.body ? bodyTemplate(cta.body) : undefined,
  });
}

/** The placeholder in the `role` CTA's subject that the role title replaces. */
export const ROLE_TITLE_SLOT = '[role title]';

/**
 * WP168-A: "Apply for This Role" for one open role (/careers/<slug>/): the `role` CTA with the role title in its subject ("Application: Chief Revenue
 * Officer (CRO)") and the CTA's body fields. scripts/check-links.mjs matches such a subject to the CTA's template.
 */
export function roleApplyHref(roleTitle: string): string {
  const c = CTAS.role;
  if (!c.subject?.includes(ROLE_TITLE_SLOT)) throw new Error(`src/data/ctas.ts: the role CTA subject must contain ${ROLE_TITLE_SLOT}`);
  return mailto({ to: c.to, subject: c.subject.replace(ROLE_TITLE_SLOT, roleTitle), body: c.body ? bodyTemplate(c.body) : undefined });
}

/** Everything a button needs: label + href (+ secondary). The href is '' for a withheld CTA, which renders as nothing. */
export function cta(key: CtaKey): CtaDef & { href: string } {
  return { ...CTAS[key], href: ctaHref(key) };
}
