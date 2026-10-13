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

export const caseStudyItems = [
  { title: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)', program: 'Commissioned by Porticus', factId: 'PR-01', href: '/impact/case-studies/wsdfm-women-freelancers/' },
  { title: 'Women in Online Work, Kosovo', program: 'World Bank Group', factId: 'PR-02', href: '/impact/case-studies/kosovo-women-in-online-work/' },
  { title: 'Her Power', program: 'ICT Division / Department of ICT (DoICT)', factId: 'PR-05', statLabel: herPowerLabel, href: '/impact/case-studies/her-power/' },
];
