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

/** Everything a button needs: label + href (+ secondary). The href is '' for a withheld CTA, which renders as nothing. */
export function cta(key: CtaKey): CtaDef & { href: string } {
  return { ...CTAS[key], href: ctaHref(key) };
}
