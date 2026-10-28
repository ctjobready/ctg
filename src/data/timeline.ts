import { AIM_STATEMENT } from './copy';

export interface TimelineItem { year: string; title: string; text: string; factIds?: string[] }

export const timeline: TimelineItem[] = [
  { year: '2014', title: 'Launch in Copenhagen', text: `Founded in 2014 and launched in Copenhagen, Denmark, in the presence of Sir Richard Branson and early Skype investor Morten Lund.`, factIds: ['ID-02'] },
  { year: '2014–2017', title: 'Freelancer Development and Talent Financing', text: `CodersTrust begins training freelancers in Bangladesh with a talent-financing model; international programs follow, including Kosovo with the World Bank Group.`, factIds: ['PR-02'] },
  // WP56 (owner decision 15, 2026-10-18): Nigeria is named here only, as a timeline line (TL-07, source RFGRANT15). It is not a Global Reach location and is not counted in SC-03. No amount is shown.
  { year: '2015–2016', title: 'Rockefeller Foundation Grant', text: `A Rockefeller Foundation grant supported a CodersTrust feasibility study in Kenya and Nigeria.`, factIds: ['TL-07'] },
  { year: '2018–2021', title: 'NGO Workforce Programs and COVID-19 Teacher Training', text: `NGO workforce programs, including WSDFM, and 10,000 teachers trained to teach online during COVID-19.`, factIds: ['PR-01', 'SC-08'] },
  { year: '2022–2024', title: 'Government Contracts and University Partnerships', text: `Government contracts in Bangladesh, including Her Power, EDGE and SKIT; partnerships with National University (official training partner since 2023) and the University for Peace (UPEACE).`, factIds: ['GV-01', 'GV-02', 'GV-03', 'SC-04', 'PA-05'] },
  // WP52 (cycle-27 review): two sentences in place of one semicolon chain that ended in a fragment ("...; Impact Survey 2026."). The clause "and lets funders deploy the CodersTrust model in a country" (IN-02) is gone with the chain, so the entry no longer cites IN-02.
  // WP60 (cycle-32 review, Claude S3): the 2030 aim carries the dependency clause every page that states it carries. WP99 (owner answers 2026-10-28, Q1): the aim is IN-01’s own statement (AIM_STATEMENT, src/data/copy.ts), which ends with that clause: "... by 2030, in Bangladesh and similar countries ..., depending on government and donor commitments; ...".
  { year: '2025–2026', title: 'JobReady, YouthWIDE and the Impact Survey', text: `JobReady rolls out in stages. YouthWIDE aims to train ${AIM_STATEMENT}; CodersTrust publishes Impact Survey 2026.`, factIds: ['IN-04', 'IN-01', 'OC-01'] },
];
