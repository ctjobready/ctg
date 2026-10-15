export interface TimelineItem { year: string; title: string; text: string; factIds?: string[] }

export const timeline: TimelineItem[] = [
  { year: '2014', title: 'Launch in Copenhagen', text: `Founded in 2014 and launched in Copenhagen, Denmark, in the presence of Sir Richard Branson and early Skype investor Morten Lund.`, factIds: ['ID-02'] },
  { year: '2014–2017', title: 'Freelancer Development and Talent Financing', text: `CodersTrust begins developing freelancers in Bangladesh with a talent-financing model; international programs follow, including Kosovo with the World Bank Group.`, factIds: ['PR-02'] },
  { year: '2018–2021', title: 'NGO Workforce Programs and COVID-19 Teacher Training', text: `NGO workforce programs, including WSDFM, and 10,000 teachers trained to teach online during COVID-19.`, factIds: ['PR-01', 'SC-08'] },
  { year: '2022–2024', title: 'Government Contracts and University Partnerships', text: `Government contracts in Bangladesh, including Her Power, EDGE and SKIT; partnerships with National University (official training partner since 2023) and the University for Peace (UPEACE).`, factIds: ['GV-01', 'GV-02', 'GV-03', 'SC-04', 'PA-05'] },
  { year: '2025–2026', title: 'JobReady, YouthWIDE and the Impact Survey', text: `JobReady platform rolls out in stages; YouthWIDE aims to train 2 million vulnerable youth in Bangladesh by 2030 and lets funders deploy the CodersTrust model in a country; Impact Survey 2026.`, factIds: ['IN-04', 'IN-01', 'IN-02', 'OC-01'] },
];
