// The three case-study cards of Home's Proof in Practice band (STRONG-IT / PR-04 is withheld: no card, no link; UNDP YES stays in its own case study and the Impact hub).
// Card photographs are from the previous site (WP2): each is tagged with its D13 asset id, so the permissions gate sees it.
import type { ImageMetadata } from 'astro';
import wsdfm from '../../../assets/images/pages/impact/wsdfm-training-group.jpg';
import herPower from '../../../assets/images/pages/impact/her-power-training-lab.jpg';
import { caseCardPhoto } from '../../../data/photos';
import { fact } from '../../../data/facts';
import { KOSOVO_RECORDS, TRIAL_WOMEN, WB_KOSOVO, WSDFM_RECORDS } from '../../../data/copy';

interface CardPhoto {
  src: ImageMetadata;
  alt: string;
  assetId: string;
}

/** The card photograph of a case study, by slug (the last path segment of /impact/case-studies/<slug>/). */
export function casePhoto(slug: string): CardPhoto | undefined {
  if (slug === 'wsdfm-women-freelancers') return { src: wsdfm, alt: 'Women trainees and a CodersTrust Bangladesh banner at a WSDFM training session', assetId: 'case-wsdfm-training-group' };
  if (slug === 'her-power') return { src: herPower, alt: 'Women working on laptops in a Her Power training lab', assetId: 'case-her-power-training-lab' };
  return caseCardPhoto(slug);
}

/**
 * WP23: the Her Power card's label read as one clause with another inside it ("tracked women, from the 2,500 trained directly by CodersTrust, in work: 47%").
 * It states the result first and the base after it, from PR-05's own label (the figures are not retyped).
 * WP47 (cycle-22 review): the base is "among the 2,500 women CodersTrust trained directly" (the tracked 800 are a subset of those 2,500), where it read "from the 2,500 trained directly by CodersTrust".
 */
const herPowerParts = /^tracked women, from the ([\d,]+) trained directly by CodersTrust, in work: (\d+%)$/.exec(fact('PR-05').stat?.label ?? '');
if (!herPowerParts) throw new Error('caseStudies: PR-05 label no longer reads "tracked women, from the N trained directly by CodersTrust, in work: P%"');
const herPowerLabel = `tracked women in work (${herPowerParts[2]}), among the ${herPowerParts[1]} women CodersTrust trained directly`;
/**
 * WP63 (cycle-35 review, Gemini M6): the Governments Results at a Glance tile sets the label apart from its figure ("372 of 800"), and "Her Power: tracked women in work (47%), among the 2,500 women CodersTrust trained directly" could be read as all 2,500 tracked.
 * The tile's label states the tracked base itself, in PR-05's numbers (the 800 from its stat value "372 of 800", the 47% and the 2,500 from its label): "Her Power: 47% of the 800 tracked women in work, from the 2,500 women CodersTrust trained directly". The count (372) is the tile's own
 * figure above the label, so the label does not state it a second time. The cards that print the figure and the caption together keep herPowerLabel ("372 of 800 tracked women in work (47%), among the 2,500 women ..."), which reads as one clause there.
 */
const herPowerTracked = /^[\d,]+ of ([\d,]+)$/.exec(fact('PR-05').stat?.value ?? '')?.[1];
if (!herPowerTracked) throw new Error('caseStudies: PR-05 stat value no longer reads "N of M"');
export const HER_POWER_TILE_LABEL = `Her Power: ${herPowerParts[2]} of the ${herPowerTracked} tracked women in work, from the ${herPowerParts[1]} women CodersTrust trained directly`;
/**
 * WP31: the WSDFM card sits on pages that also show the trial's follow-up employment (63.1% against 52.8%), a different measure. The caption says the
 * 71% is program records, from PR-01's own label ("WSDFM: 71% in work"); the figures are not retyped.
 * WP46 (cycle-22 review): "(not trial data)", where it read "separate from the trial", which suggested the records contradict the trial of the same predecessor program.
 * WP60 (cycle-32 review, Claude S4; owner answer 2026-10-20, "The BIGD study only studied 833"): the parenthesis adds how the records relate to the trial, "(not trial data; the trial studied 833 women)": the 711 of 1,000 above it are the program's records and
 * the trial's count is RC-07's 833 (TRIAL_WOMEN, src/data/copy.ts), so the card names RC-07 beside PR-01 (CASE_CARD_LABEL_FACTS). It does not say the 833 are "of" the 1,000: the trial's sample includes 408 women who were not offered a place.
 */
const wsdfmShare = /^WSDFM: (.+)$/.exec(fact('PR-01').stat?.label ?? '');
if (!wsdfmShare) throw new Error('caseStudies: PR-01 label no longer reads "WSDFM: <share> in work"');
const wsdfmLabel = `WSDFM program records (not trial data; the trial studied ${TRIAL_WOMEN} women): ${wsdfmShare[1]}`;

/**
 * The caption a case-study card puts under its figure, by register fact. CaseStudyCarousel uses it wherever a page gives no caption of its own, so the WSDFM and Her Power
 * cards read the same on every audience page that shows their figures (WP31: Development Partners showed Her Power's register label, "tracked women, from the 2,500 trained
 * directly by CodersTrust, in work: 47%", which no other page did); the Governments Results at a Glance tile reads it too.
 */
export const CASE_CARD_LABELS: Record<string, string> = { 'PR-01': wsdfmLabel, 'PR-05': herPowerLabel };
/** The other register facts a card's shared caption states (WP60: the WSDFM caption names the trial's count, RC-07's 833), named in the band's data-fact beside the card's own fact. */
export const CASE_CARD_LABEL_FACTS: Record<string, string[]> = { 'PR-01': ['RC-07'] };

/**
 * Home's three cards. WP37 (cycle-14 review): the results carousel above the band (slide 3, "Results by Program") already states the Kosovo (102 of 150) and Her Power (372 of 800) figures, so those two
 * cards show a line of delivery context in the figure's place (`context`, from each case study's own scope: Kosovo "Two-phase delivery that built digital literacy first, then real online work";
 * Her Power "Curriculum, training manuals, mentorship guidelines and trainer training; a cohort trained directly"). The WSDFM card kept its figure because the slide did not list WSDFM.
 * WP50 (cycle-25 review): the slide (now the fourth, still "Results by Program") lists WSDFM again as the fourth of four programs, with the same qualifier ("program records, not trial data"); this card still shows its figure.
 * WP51 (cycle-26 review): that slide now shows "711 of 1,000 ... 71% in work", so the WSDFM card repeated it: like the Kosovo and Her Power cards, it shows a line of delivery context in the figure's place. The line is the case study's own
 * scope (CASE_STUDIES: "ICT skills for freelancing marketplaces and local jobs, with one-to-one mentoring"), read from there so the card and the case-study card cannot drift apart. Home is the only page that passes these items: Development
 * Partners, Foundations, Local Partners and YouthWIDE list their own cards (no `context`), so they keep the figure and its caption (CASE_CARD_LABELS).
 * WP57 (cycle-29 review, Gemini GM4; owner decision 7, "show both"): the Kosovo card is the exception to the delivery-context rule: its `context` line is the program records ("Program records: 102 of 150 women in work.") and its `note` the World Bank's
 * figure, so the card shows both Kosovo figures itself (the slide's line stays as it is).
 * WP63 (cycle-35 review, Gemini M4): the WSDFM card was left with the delivery-context line and no outcome line, while the Kosovo card has its program records. Its `context` is now the same kind of line, "Program records: 711 of 1,000 women in work (71%)."
 * (WSDFM_RECORDS, src/data/copy.ts, from PR-01), which the fourth carousel slide states too (the figure is on Home twice now, as Kosovo's is); the case study's delivery scope stays on its own page and card.
 */
export const caseStudyItems = [
  { title: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)', program: 'Commissioned by Porticus', factId: 'PR-01', context: WSDFM_RECORDS.text, contextFacts: WSDFM_RECORDS.facts, href: '/impact/case-studies/wsdfm-women-freelancers/' },
  // WP55 (owner decision 2026-10-17, "Show both"): this card adds the World Bank's own figure in one line (WB_KOSOVO). WP57 (cycle-29 review, Gemini GM4): the card showed only that line, with the program records in the slide far above it, so
  // it now shows both: "Program records: 102 of 150 women in work." (KOSOVO_RECORDS, PR-02) where the delivery-context line was ("Digital literacy followed by real online work."), then the World Bank's line.
  { title: 'Women in Online Work, Kosovo', program: 'World Bank Group', factId: 'PR-02', context: KOSOVO_RECORDS.text, contextFacts: KOSOVO_RECORDS.facts, note: WB_KOSOVO, href: '/impact/case-studies/kosovo-women-in-online-work/' },
  { title: 'Her Power', program: 'ICT Division / Department of ICT (DoICT)', factId: 'PR-05', context: 'Curriculum, trainer training and direct delivery for women’s digital skills.', href: '/impact/case-studies/her-power/' },
];
