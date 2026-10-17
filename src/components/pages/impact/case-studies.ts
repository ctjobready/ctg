import { WB_KOSOVO } from '../../../data/copy';

/**
 * The five published case studies (planning v1.3 P24), Kosovo first (WP30e: the international footprint leads), then Digital Jobs Albania (WP55, owner decision 2026-10-18: a short case study from the World Bank's wording). Another study is intentionally withheld and has no
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
  /** Card fields, the same four on every card (WP20d): Partner & Place, Who, Scope & Delivery, then the Result (the register stat). Wording follows each case-study page. */
  place: string;
  who: string;
  scope: string;
  /** WP55 ("Show both"): a second source's figure for the same program, as one short line under the card's result (Kosovo: the World Bank's 77 trainees with an online contract). */
  note?: { text: string; facts: string[] };
  related: { label: string; href: string };
}

const base = '/impact/case-studies/';

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'kosovo-women-in-online-work',
    path: `${base}kosovo-women-in-online-work/`,
    name: 'Women in Online Work, Kosovo',
    heading: 'Women in Online Work, Kosovo: Young Women Earning Online',
    program: 'World Bank Group, 2017',
    partner: 'Women in Online Work pilot',
    factId: 'PR-02',
    summary: 'A pilot that prepared young women in Kosovo for online work.',
    place: 'World Bank Group; Kosovo, 2017',
    who: 'Young women',
    scope: 'Two-phase delivery that built digital literacy first, then real online work',
    note: WB_KOSOVO,
    related: { label: 'See How YouthWIDE Deploys the Model', href: '/programs/youthwide/' },
  },
  {
    slug: 'digital-jobs-albania',
    path: `${base}digital-jobs-albania/`,
    name: 'Digital Jobs Albania',
    heading: 'Digital Jobs Albania: Online Skills for Women, with the World Bank',
    program: 'World Bank, 2021–2022',
    partner: 'Online training program',
    // PR-07 is the World Bank's own figure (500+ students enrolled, May 2022), not a CodersTrust program record, and takes no "Program Record" tag (evidenceOf).
    factId: 'PR-07',
    summary: 'A World Bank initiative that gave women in Albania a three-month online course in digital skills.',
    place: 'World Bank, with the Government of Albania and EuroPartners Development; Albania, 2021–2022',
    who: 'Women aged 16 to 35',
    scope: 'Three-month online training in graphic design, web development and digital marketing, with mentoring',
    related: { label: 'See How YouthWIDE Deploys the Model', href: '/programs/youthwide/' },
  },
  {
    slug: 'wsdfm-women-freelancers',
    path: `${base}wsdfm-women-freelancers/`,
    name: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)',
    heading: 'WSDFM: A Predecessor Program Evaluated by a Randomized Trial',
    program: 'Commissioned by Porticus',
    partner: 'Independently evaluated by BIGD',
    factId: 'PR-01',
    summary: 'ICT skills for freelancing marketplaces and local jobs, plus women’s empowerment, in Bangladesh.',
    place: 'Commissioned by Porticus; Bangladesh',
    who: 'Women in Bangladesh',
    scope: 'ICT skills for freelancing marketplaces and local jobs, with one-to-one mentoring',
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
    place: 'UNDP, the Government of Bangladesh and Swanirvar Bangladesh; Korail settlement, Dhaka, 2017',
    who: 'Young people from the Korail settlement',
    scope: 'Skills training linked to freelance marketplaces, in a fully equipped lab with one-to-one mentoring',
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
    place: 'ICT Division / DoICT, Government of Bangladesh; Bangladesh',
    who: 'Women',
    scope: 'Curriculum, training manuals, mentorship guidelines and trainer training; a cohort trained directly',
    related: { label: 'See How YouthWIDE Deploys the Model', href: '/programs/youthwide/#governments' },
  },
];

export const caseBySlug = (slug: string): CaseStudy => {
  const c = CASE_STUDIES.find((x) => x.slug === slug);
  if (!c) throw new Error(`unknown case study ${slug}`);
  return c;
};
