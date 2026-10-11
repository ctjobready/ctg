// The four case-study cards used by Home and Investors (STRONG-IT / PR-04 is withheld: no card, no link).
// Card photographs are from the previous site (WP2): each is tagged with its D13 asset id, so the permissions gate sees it.
import type { ImageMetadata } from 'astro';
import wsdfm from '../../../assets/images/pages/impact/wsdfm-training-group.jpg';
import herPower from '../../../assets/images/pages/impact/her-power-training-lab.jpg';
import { caseCardPhoto } from '../../../data/photos';

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

export const caseStudyItems = [
  { title: 'Women’s skills for freelancing (WSDFM)', program: 'Commissioned by Porticus', factId: 'PR-01', href: '/impact/case-studies/wsdfm-women-freelancers/' },
  { title: 'Women in Online Work, Kosovo', program: 'World Bank Group', factId: 'PR-02', href: '/impact/case-studies/kosovo-women-in-online-work/' },
  { title: 'UNDP YES, Korail', program: 'UNDP, Government of Bangladesh', partner: 'Denominator not stated', factId: 'PR-03', href: '/impact/case-studies/undp-yes-korail/' },
  { title: 'Her Power', program: 'ICT Division / Department of ICT (DoICT)', factId: 'PR-05', href: '/impact/case-studies/her-power/' },
];
