import { CTAS, CTA_RECIPIENT, type CtaDef, type CtaKey } from '../data/ctas';

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

/** href for a CTA key (mailto, or the external form for `nu-pgd`). */
export function ctaHref(key: CtaKey): string {
  const cta = CTAS[key];
  if (cta.href) return cta.href;
  return mailto({
    subject: cta.subject,
    body: cta.body ? bodyTemplate(cta.body) : undefined,
  });
}

/** Everything a button needs: label + href (+ secondary). */
export function cta(key: CtaKey): CtaDef & { href: string } {
  return { ...CTAS[key], href: ctaHref(key) };
}
