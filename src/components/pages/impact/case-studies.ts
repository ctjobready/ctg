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
  /** WP60 (cycle-32 review, Kimi K2): the card's name for its figure when it is not a result ("Reported Enrollment": Albania's figure is the World Bank's enrollment count, PR-07). Cards without one say "Result". */
  resultTitle?: string;
  /** WP86 (coordinator item 9): a figure the World Bank reported while the program was still running; the card takes no "Delivered" tag (CaseGrid). */
  reported?: boolean;
  /** WP104: the day the page's content last changed, for the JSON-LD dateModified, where it is later than the case studies' shared 2026-10-10 (UNDP YES: its heading). */
  dateModified?: string;
  related: { label: string; href: string };
}

const base = '/impact/case-studies/';

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: 'kosovo-women-in-online-work',
    path: `${base}kosovo-women-in-online-work/`,
    name: 'Women in Online Work, Kosovo',
    heading: 'Women in Online Work, Kosovo: Preparing Young Women for Online Work',
    program: 'World Bank Group, 2016–2017',
    partner: 'Women in Online Work pilot',
    factId: 'PR-02',
    summary: 'A pilot that prepared young women in Kosovo for online work.',
    place: 'World Bank Group; Kosovo, 2016–2017',
    who: 'Young women',
    // WP76: the World Bank brief's two phases (February to August 2016: front-end web development; September to December 2016: three tracks, coding, graphic design and digital marketing), where the line had said digital literacy came first.
    scope: 'Two phases: front-end web development first, then tracks in coding, graphic design and digital marketing',
    note: WB_KOSOVO,
    dateModified: '2026-10-29',
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
    // WP91 (triage A7): the card's figure and wording are PR-07's (register: "the World Bank reported in May 2022, while the program was still running, that more than 500 students had enrolled").
    scope: 'Three-month online training in graphic design, web development and digital marketing, with mentoring. The World Bank reported in May 2022, while the program was still running, that more than 500 students had enrolled',
    resultTitle: 'Reported Enrollment',
    reported: true,
    related: { label: 'See How YouthWIDE Deploys the Model', href: '/programs/youthwide/' },
  },
  {
    slug: 'wsdfm-women-freelancers',
    path: `${base}wsdfm-women-freelancers/`,
    name: 'Women’s Skill Development for Freelancing Marketplace (WSDFM)',
    heading: 'CodersTrust’s WSDFM Program Evaluated by a Randomized Trial',
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
    heading: 'UNDP YES: Korail Youth Finding First Jobs, 2017',
    dateModified: '2026-10-29',
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
    heading: 'Her Power: Women’s Digital Skills with the Department of ICT (DoICT)',
    program: 'ICT Division / Department of ICT (DoICT), Government of Bangladesh, 2023–2025', // WP96 (owner decision 2026-10-26): the span 2023–2025 replaces "from 2023", matching register GV-01's contract scope 2023–2025 (WP87 had dated the contract signing, April 2023)
    partner: 'Training cohort',
    factId: 'PR-05',
    summary: 'A national program for women’s self-employment through digital skills, with CodersTrust as curriculum and training partner.',
    place: 'ICT Division / DoICT, Government of Bangladesh; Bangladesh, 2023–2025',
    who: 'Women',
    scope: 'Curriculum, training manuals, mentorship guidelines and trainer training; 2,400 trained directly',
    related: { label: 'See How YouthWIDE Deploys the Model', href: '/programs/youthwide/#governments' },
  },
];

export const caseBySlug = (slug: string): CaseStudy => {
  const c = CASE_STUDIES.find((x) => x.slug === slug);
  if (!c) throw new Error(`unknown case study ${slug}`);
  return c;
};
