// The three case-study cards used by Home and Investors (STRONG-IT / PR-04 is withheld: no card, no link; UNDP YES stays in its own case study and the Impact hub).
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
 * cards read the same on Home, Investors and every audience page (WP31: Development Partners showed Her Power's register label, "tracked women, from the 2,500 trained
 * directly by CodersTrust, in work: 47%", which no other page did).
 */
export const CASE_CARD_LABELS: Record<string, string> = { 'PR-01': wsdfmLabel, 'PR-05': herPowerLabel };

export const caseStudyItems = [
  { title: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)', program: 'Commissioned by Porticus', factId: 'PR-01', statLabel: wsdfmLabel, href: '/impact/case-studies/wsdfm-women-freelancers/' },
  { title: 'Women in Online Work, Kosovo', program: 'World Bank Group', factId: 'PR-02', href: '/impact/case-studies/kosovo-women-in-online-work/' },
  { title: 'Her Power', program: 'ICT Division / Department of ICT (DoICT)', factId: 'PR-05', statLabel: herPowerLabel, href: '/impact/case-studies/her-power/' },
];
