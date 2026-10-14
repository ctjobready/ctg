// The three case-study cards of Home's Proof in Practice band (STRONG-IT / PR-04 is withheld: no card, no link; UNDP YES stays in its own case study and the Impact hub).
// Card photographs are from the previous site (WP2): each is tagged with its D13 asset id, so the permissions gate sees it.
import type { ImageMetadata } from 'astro';
import wsdfm from '../../../assets/images/pages/impact/wsdfm-training-group.jpg';
import herPower from '../../../assets/images/pages/impact/her-power-training-lab.jpg';
import { caseCardPhoto } from '../../../data/photos';
import { fact } from '../../../data/facts';

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
 */
const herPowerParts = /^tracked women, (from the [\d,]+ trained directly by CodersTrust), in work: (\d+%)$/.exec(fact('PR-05').stat?.label ?? '');
if (!herPowerParts) throw new Error('caseStudies: PR-05 label no longer reads "tracked women, from the N trained directly by CodersTrust, in work: P%"');
const herPowerLabel = `tracked women in work (${herPowerParts[2]}), ${herPowerParts[1]}`;
/**
 * WP31: the WSDFM card sits on pages that also show the trial's follow-up employment (63.1% against 52.8%), a different measure. The caption says the
 * 71% is program records, separate from the trial, from PR-01's own label ("WSDFM: 71% in work"); the figures are not retyped.
 */
const wsdfmShare = /^WSDFM: (.+)$/.exec(fact('PR-01').stat?.label ?? '');
if (!wsdfmShare) throw new Error('caseStudies: PR-01 label no longer reads "WSDFM: <share> in work"');
const wsdfmLabel = `WSDFM program records, separate from the trial: ${wsdfmShare[1]}`;

/**
 * The caption a case-study card puts under its figure, by register fact. CaseStudyCarousel uses it wherever a page gives no caption of its own, so the WSDFM and Her Power
 * cards read the same on every audience page that shows their figures (WP31: Development Partners showed Her Power's register label, "tracked women, from the 2,500 trained
 * directly by CodersTrust, in work: 47%", which no other page did); the Governments Results at a Glance tile reads it too.
 */
export const CASE_CARD_LABELS: Record<string, string> = { 'PR-01': wsdfmLabel, 'PR-05': herPowerLabel };

/**
 * Home's three cards. WP37 (cycle-14 review): the results carousel above the band (slide 3, "Results by Program") already states the Kosovo (102 of 150) and Her Power (372 of 800) figures, so those two
 * cards show a line of delivery context in the figure's place (`context`, from each case study's own scope: Kosovo "Two-phase delivery that built digital literacy first, then real online work";
 * Her Power "Curriculum, training manuals, mentorship guidelines and trainer training; a cohort trained directly"). The WSDFM card keeps its figure: slide 3 no longer lists WSDFM.
 */
export const caseStudyItems = [
  { title: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)', program: 'Commissioned by Porticus', factId: 'PR-01', statLabel: wsdfmLabel, href: '/impact/case-studies/wsdfm-women-freelancers/' },
  { title: 'Women in Online Work, Kosovo', program: 'World Bank Group', factId: 'PR-02', context: 'Digital literacy followed by real online work.', href: '/impact/case-studies/kosovo-women-in-online-work/' },
  { title: 'Her Power', program: 'ICT Division / Department of ICT (DoICT)', factId: 'PR-05', context: 'Curriculum, trainer training and direct delivery for women’s digital skills.', href: '/impact/case-studies/her-power/' },
];
