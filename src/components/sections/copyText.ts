/**
 * Small text helpers for conversion pages (WP1i-conv). They only reshape the register's own wording, so no figure is typed.
 */
import { fact } from '../../data/facts';

/**
 * Claim lines for the C3 "cost of waiting" blocks. Each restates only what its register fact (shown directly under it as the DATA line)
 * supports, with the scope in the sentence, so a card heading never generalizes past the evidence.
 */
/** PX-06: the freelancing-platform postings result. */
export const CLAIM_PX06 = 'On One Major Freelancing Platform, Automation-Prone Postings Fell After ChatGPT’s Release.';
/** RC-06: the review of vocational-training trials. */
export const CLAIM_RC06 = 'A Review of Nine Trials Found Only Three with Significant Employment Impacts.';
/** PX-11: coastal-district out-migration (measured for one district, census 2001–2011; the perfect tense keeps the heading from reading as today's rate, and it claims no cause). */
export const CLAIM_PX11 = 'Climate-Exposed Coastal Districts Have Been Losing Their Young People.';

/**
 * First mention of SSC in a sentence taken from the register ("... 2.0% for SSC holders"): spelled out once, so a reader who does not know
 * the Bangladeshi qualification names still follows the comparison. A text that already spells it out is returned as it is.
 */
export function expandSsc(text: string): string {
  return /Secondary School Certificate/.test(text) ? text : text.replace(/\bSSC holders\b/, 'holders of the Secondary School Certificate (SSC)');
}

/**
 * PA-02 ("Government partners include Bangladesh’s ICT Division, DoICT, Bangladesh Hi-Tech Park Authority, NSDA and BCC") with its
 * acronyms spelled out, for the first mention on a page. The names come from the register (GV-07 for BCC, confirm item 24 for NSDA, F30 for DoICT).
 */
export function governmentPartners(): string {
  return fact('PA-02')
    .text.replace(', DoICT,', ', the Department of ICT (DoICT),')
    .replace('NSDA and BCC', 'the National Skills Development Authority (NSDA) and the Bangladesh Computer Council (BCC)');
}

/** The two PX-03 rates, read from the register ("graduate unemployment is 13.5% vs 2.0% for SSC holders"), so a page sentence never retypes them. */
export function graduateRates(): { graduate: string; ssc: string } {
  const m = fact('PX-03').text.match(/graduate unemployment is ([\d.]+%) vs ([\d.]+%) for/);
  if (!m) throw new Error(`graduateRates: PX-03 no longer reads "graduate unemployment is X% vs Y% for ...": "${fact('PX-03').text}"`);
  return { graduate: m[1], ssc: m[2] };
}

/** Adds a closing full stop to a fragment that has none; a text that already ends a sentence is returned as it is. */
export function endSentence(text: string): string {
  const t = text.trim();
  return /[.!?]["”’)]*$/.test(t) ? t : `${t}.`;
}

/**
 * A government contract fact written as a contract scope, so a scope of work never reads as delivered training.
 * GV-05 and GV-06 are registered as "<contract or ministry>: <scope>"; this returns
 * "Contract scope: <scope>, for the <contract or ministry>." (the closing full stop included).
 */
export function contractScope(id: string): string {
  const text = fact(id).text;
  const at = text.indexOf(': ');
  if (at === -1) throw new Error(`contractScope: ${id} is not in "<contract>: <scope>" form: "${text}"`);
  const name = text.slice(0, at);
  const scope = text.slice(at + 2).replace(/\.$/, '');
  return `Contract scope: ${scope}, for the ${name}.`;
}

/**
 * Duration line of an offer card. The register's PD-05 wording for the pilot ("8–14 months (tracking to month 23)") reads as if the pilot
 * itself runs to month 23, so the card says what the pilot runs and what tracking covers. Other options print as registered.
 */
export function offerDurationText(name: string, duration: string): string {
  const m = /^(\d+–\d+ months) \(tracking to month \d+\)$/.exec(duration.trim());
  if (name !== 'Pilot' || !m) return duration;
  const months = fact('PD-02').text.match(/outcome tracking for (\d+) months/)?.[1];
  if (!months) throw new Error('offerDurationText: PD-02 no longer names the outcome tracking period');
  return `Pilot delivery runs ${m[1]}. Outcome tracking continues for ${months} months after each course.`;
}
