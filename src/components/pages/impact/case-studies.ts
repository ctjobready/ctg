/**
 * The four published case studies (planning v1.3 P24). A fifth study is intentionally withheld and has no
 * entry, route, card or link anywhere; completeness is measured against the release manifest.
 */
export interface CaseStudy {
  slug: string;
  path: string;
  /** Card and breadcrumb name. */
  name: string;
  /** H1 of the case-study page. */
  heading: string;
  program: string;
  partner: string;
  /** Register fact whose stat is the outcome-first figure. */
  factId: string;
  summary: string;
  related: { label: string; href: string };
}

const base = '/impact/case-studies/';

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'wsdfm-women-freelancers',
    path: `${base}wsdfm-women-freelancers/`,
    name: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)',
    heading: 'WSDFM: Evaluated by a Randomized Trial',
    program: 'Commissioned by Porticus',
    partner: 'Independently evaluated by BIGD',
    factId: 'PR-01',
    summary: 'ICT skills for freelancing marketplaces and local jobs, plus women’s empowerment, in Bangladesh.',
    related: { label: 'See How YouthWIDE Deploys the Model', href: '/programs/youthwide/' },
  },
  {
    slug: 'kosovo-women-in-online-work',
    path: `${base}kosovo-women-in-online-work/`,
    name: 'Women in Online Work, Kosovo',
    heading: 'Women in Online Work, Kosovo: A 2017 Pilot with the World Bank Group',
    program: 'World Bank Group, 2017',
    partner: 'Women in Online Work pilot',
    factId: 'PR-02',
    summary: 'A pilot that prepared young women in Kosovo for online work.',
    related: { label: 'See How YouthWIDE Deploys the Model', href: '/programs/youthwide/' },
  },
  {
    slug: 'undp-yes-korail',
    path: `${base}undp-yes-korail/`,
    name: 'UNDP YES, Korail',
    heading: 'UNDP YES: Korail Youth into Freelance Work, 2017',
    program: 'UNDP, Government of Bangladesh, Swanirvar Bangladesh',
    partner: '2017',
    factId: 'PR-03',
    summary: 'Skills training for young people from the Korail settlement in Dhaka, linked to freelance marketplaces.',
    related: { label: 'See How YouthWIDE Deploys the Model', href: '/programs/youthwide/' },
  },
  {
    slug: 'her-power',
    path: `${base}her-power/`,
    name: 'Her Power',
    heading: 'Her Power: Women’s Digital Skills with the ICT Division',
    program: 'ICT Division / Department of ICT (DoICT), Government of Bangladesh',
    partner: 'Training cohort',
    factId: 'PR-05',
    summary: 'A national program for women’s self-employment through digital skills, with CodersTrust as curriculum and training partner.',
    related: { label: 'See YouthWIDE in Bangladesh, the National Initiative', href: '/programs/youthwide/#governments' },
  },
];

export const caseBySlug = (slug: string): CaseStudy => {
  const c = CASE_STUDIES.find((x) => x.slug === slug);
  if (!c) throw new Error(`unknown case study ${slug}`);
  return c;
};
