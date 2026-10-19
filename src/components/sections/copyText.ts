/**
 * Small text helpers for conversion pages (WP1i-conv). They only reshape the register's own wording, so no figure is typed.
 */
import { fact } from '../../data/facts';
import { withSourceNote } from '../../data/copy';

/**
 * Claim lines for the C3 "cost of waiting" blocks. Each is a short heading over its register fact, which the card shows directly under it as the DATA line and which carries the scope, the figure and the study in full
 * (WP40, cycle-17 review: the two research headings were whole sentences that the data line then said again), so the heading names the topic and the line beneath it is what the card claims.
 */
/** PX-06: the freelancing-platform postings result. */
export const CLAIM_PX06 = 'AI Is Changing Freelance Demand';
/**
 * PX-06 states two headline findings of one study in one sentence ("... fell 21% relative to manual-intensive jobs, and image-creation postings fell 17% ..."). A card that has room for one reads the first finding alone
 * (WP38, cycle-15 review: Home's cost-of-waiting card), in the register's own words and figures: the platform, the postings, the 21% and the eight-month window. The 17% image-creation finding stays in PX-06 for the pages that print it whole.
 * WP58 (cycle-30 reviews, Claude S5 and Kimi K2): the sentence names its source inside it, "... of ChatGPT’s release (Demirci, Hannane & Zhu, 2025).", through withSourceNote (src/data/copy.ts; DHZ25), as the other external statistics do (no footnote).
 */
export function freelancePostingsFinding(): string {
  const m = /^Within (\w+ months) of ChatGPT’s release, postings for (automation-prone writing and coding) jobs on a major freelancing platform fell (\d+%) relative to manual-intensive jobs/.exec(fact('PX-06').text);
  if (!m) throw new Error(`freelancePostingsFinding: PX-06 no longer reads "Within N months of ChatGPT’s release, postings for automation-prone writing and coding jobs on a major freelancing platform fell N% relative to manual-intensive jobs ...": "${fact('PX-06').text}"`);
  return `${withSourceNote('PX-06', `On one major freelancing platform, ${m[2]} postings fell ${m[3]} relative to manual-intensive jobs within ${m[1]} of ChatGPT’s release`)}.`;
}
/** RC-06: the review of vocational-training trials. */
export const CLAIM_RC06 = 'Training Does Not Always Lead to Employment';
/** PX-11: coastal-district out-migration (measured for one district, census 2001–2011; the perfect tense keeps the heading from reading as today's rate, and it claims no cause). */
export const CLAIM_PX11 = 'Climate-Exposed Coastal Districts Have Been Losing Their Young People';

/**
 * First mention of SSC in a sentence taken from the register ("... 2.0% for SSC holders"): spelled out once, so a reader who does not know
 * the Bangladeshi qualification names still follows the comparison. A text that already spells it out is returned as it is.
 */
export function expandSsc(text: string): string {
  return /Secondary School Certificate/.test(text) ? text : text.replace(/\bSSC holders\b/, 'holders of the Secondary School Certificate (SSC)');
}

/** The two PX-03 rates, read from the register ("graduate unemployment is 13.5% vs. 2.0% for SSC holders"), so a page sentence never retypes them. */
export function graduateRates(): { graduate: string; ssc: string } {
  const m = fact('PX-03').text.match(/graduate unemployment is ([\d.]+%) vs\.? ([\d.]+%) for/);
  if (!m) throw new Error(`graduateRates: PX-03 no longer reads "graduate unemployment is X% vs. Y% for ...": "${fact('PX-03').text}"`);
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
  if (!/Pilot/.test(name) || !m) return duration;
  const months = fact('PD-02').text.match(/outcome tracking for (\d+) months/)?.[1];
  if (!months) throw new Error('offerDurationText: PD-02 no longer names the outcome tracking period');
  return `Pilot delivery runs ${m[1]}. Outcome tracking continues for ${months} months after each course.`;
}

/**
 * PD-05 option rows ("Program options: Multi-Cohort Pilot Program, 1,000–2,500 trainees, 8–14 months (…); Scale 10,000–25,000 trainees, …"):
 * the name runs up to the trainee volume, which may follow a comma or a space.
 */
export function parseProgramOptions(text: string): { name: string; volume: string; duration: string }[] {
  const body = text.split(': ').slice(1).join(': ');
  return body.split('; ').map((chunk) => {
    const m = /^(.+?),?\s(\d[\d,–]*\+?\s*trainees),\s*(.*)$/.exec(chunk);
    if (!m) throw new Error(`parseProgramOptions: cannot read option "${chunk}"`);
    return { name: m[1], volume: m[2], duration: m[3] };
  });
}
