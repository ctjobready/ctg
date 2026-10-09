export interface TimelineItem { year: string; title: string; text: string; factIds?: string[] }

export const timeline: TimelineItem[] = [
  { year: '2014', title: 'Launch in Copenhagen', text: `Founded 2014; launched in Copenhagen, Denmark, in the presence of Sir Richard Branson and investor Morten Lund (co-founder of Skype).`, factIds: ['ID-02'] },
  { year: '2014–2017', title: 'Freelancer development and talent financing', text: `CodersTrust launches in Copenhagen and begins developing freelancers in Bangladesh with a talent-financing model; international programs follow.`, factIds: [] },
  { year: '2018–2021', title: 'NGO workforce programs and COVID-19 teacher training', text: `NGO workforce programs, including WSDFM, and 10,000 teachers trained to teach online during COVID-19.`, factIds: ['PR-01', 'SC-08'] },
  { year: '2022–2024', title: 'Government contracts and a university partnership', text: `Government contracts including Her Power, EDGE and SKIT; a partnership with the University for Peace (UPEACE).`, factIds: ['GV-01', 'GV-02', 'GV-03', 'PA-05'] },
  { year: '2025–2026', title: 'JobReady, National University and NationWIDE', text: `JobReady platform rolls out in stages; 1.5M+ National University learners being onboarded; NationWIDE aims to train 2 million vulnerable youth by 2030; Impact Survey 2026; YouthWIDE lets funders deploy the CodersTrust model in a country.`, factIds: ['IN-04', 'SC-04', 'IN-01', 'IN-02', 'OC-01'] },
];
