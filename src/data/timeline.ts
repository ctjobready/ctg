export interface TimelineItem { year: string; title: string; text: string; factIds?: string[] }

export const timeline: TimelineItem[] = [
  { year: '2014', title: 'Launch in Copenhagen', text: `Founded 2014; launched in Copenhagen, Denmark, in the presence of Sir Richard Branson and investor Morten Lund (co-founder of Skype).`, factIds: ['ID-02'] },
  { year: '2014–2017', title: 'Freelancer development and talent financing', text: `CodersTrust launches in Copenhagen and begins developing freelancers in Bangladesh with a talent-financing model; international programs follow, eventually reaching 15 countries and territories across Asia, Africa, Europe and the Americas.`, factIds: ['SC-03', 'PR-02', 'PR-03'] },
  { year: '2018–2021', title: 'NGO workforce programs and COVID-19 teacher training', text: `NGO workforce programs, including WSDFM and BRAC STRONG-IT, and 10,000 teachers trained to teach online during COVID-19.`, factIds: ['PR-01', 'PR-04', 'SC-08'] },
  { year: '2022–2024', title: 'Government contracts, SuperKids and university partnerships', text: `Government contracts including Her Power, EDGE and SKIT; SuperKids agreements with DoICT and NCTB; partnerships with University for Peace (UPEACE) and The City College of New York (CCNY); HolonIQ South Asia EdTech 100 listing.`, factIds: ['GV-01', 'GV-02', 'GV-03', 'GV-08', 'PA-05', 'PA-08'] },
  { year: '2025–2026', title: 'JobReady, National University and NationWIDE', text: `JobReady platform rolls out in stages; 1.5M+ National University learners being onboarded; NationWIDE aims to train 2 million vulnerable youth by 2030; Impact Survey 2026; YouthWIDE lets funders deploy the CodersTrust model in a country.`, factIds: ['IN-04', 'SC-04', 'IN-01', 'IN-02', 'OC-01'] },
];
