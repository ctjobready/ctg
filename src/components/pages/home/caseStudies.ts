// The three case-study cards of Home's Proof in Practice band (STRONG-IT / PR-04 is withheld: no card, no link; UNDP YES stays in its own case study and the Impact hub).
// Card photographs are from the previous site (WP2): each is tagged with its D13 asset id, so the permissions gate sees it.
import type { ImageMetadata } from 'astro';
import wsdfm from '../../../assets/images/pages/impact/wsdfm-training-group.jpg';
import herPower from '../../../assets/images/pages/impact/her-power-training-lab.jpg';
import { caseCardPhoto } from '../../../data/photos';
import { fact } from '../../../data/facts';
import { WB_KOSOVO } from '../../../data/copy';
import { caseBySlug } from '../impact/case-studies';

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
 * WP31: the WSDFM card sits on pages that also show the trial's follow-up employment (63.1% against 52.8%), a different measure. The caption says the
 * 71% is program records, from PR-01's own label ("WSDFM: 71% in work"); the figures are not retyped.
 * WP46 (cycle-22 review): "(not trial data)", where it read "separate from the trial", which suggested the records contradict the trial of the same predecessor program.
 */
const wsdfmShare = /^WSDFM: (.+)$/.exec(fact('PR-01').stat?.label ?? '');
if (!wsdfmShare) throw new Error('caseStudies: PR-01 label no longer reads "WSDFM: <share> in work"');
const wsdfmLabel = `WSDFM program records (not trial data): ${wsdfmShare[1]}`;

/**
 * The caption a case-study card puts under its figure, by register fact. CaseStudyCarousel uses it wherever a page gives no caption of its own, so the WSDFM and Her Power
 * cards read the same on every audience page that shows their figures (WP31: Development Partners showed Her Power's register label, "tracked women, from the 2,500 trained
 * directly by CodersTrust, in work: 47%", which no other page did); the Governments Results at a Glance tile reads it too.
 */
export const CASE_CARD_LABELS: Record<string, string> = { 'PR-01': wsdfmLabel, 'PR-05': herPowerLabel };

/**
 * Home's three cards. WP37 (cycle-14 review): the results carousel above the band (slide 3, "Results by Program") already states the Kosovo (102 of 150) and Her Power (372 of 800) figures, so those two
 * cards show a line of delivery context in the figure's place (`context`, from each case study's own scope: Kosovo "Two-phase delivery that built digital literacy first, then real online work";
 * Her Power "Curriculum, training manuals, mentorship guidelines and trainer training; a cohort trained directly"). The WSDFM card kept its figure because the slide did not list WSDFM.
 * WP50 (cycle-25 review): the slide (now the fourth, still "Results by Program") lists WSDFM again as the fourth of four programs, with the same qualifier ("program records, not trial data"); this card still shows its figure.
 * WP51 (cycle-26 review): that slide now shows "711 of 1,000 ... 71% in work", so the WSDFM card repeated it: like the Kosovo and Her Power cards, it shows a line of delivery context in the figure's place. The line is the case study's own
 * scope (CASE_STUDIES: "ICT skills for freelancing marketplaces and local jobs, with one-to-one mentoring"), read from there so the card and the case-study card cannot drift apart. Home is the only page that passes these items: Development
 * Partners, Foundations, Local Partners and YouthWIDE list their own cards (no `context`), so they keep the figure and its caption (CASE_CARD_LABELS).
 */
export const caseStudyItems = [
  { title: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)', program: 'Commissioned by Porticus', factId: 'PR-01', context: `${caseBySlug('wsdfm-women-freelancers').scope}.`, href: '/impact/case-studies/wsdfm-women-freelancers/' },
  // WP55 (owner decision 2026-10-17, "Show both"): the slide above states the program records (102 of 150); this card adds the World Bank's own figure in one line (WB_KOSOVO).
  { title: 'Women in Online Work, Kosovo', program: 'World Bank Group', factId: 'PR-02', context: 'Digital literacy followed by real online work.', note: WB_KOSOVO, href: '/impact/case-studies/kosovo-women-in-online-work/' },
  { title: 'Her Power', program: 'ICT Division / Department of ICT (DoICT)', factId: 'PR-05', context: 'Curriculum, trainer training and direct delivery for women’s digital skills.', href: '/impact/case-studies/her-power/' },
];
