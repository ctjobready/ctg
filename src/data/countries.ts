export interface ProgramLocation {
  id: string; country: string;
  region: 'South Asia' | 'Southeast Asia' | 'Middle East' | 'Africa' | 'Europe' | 'Americas';
  lat: number; lon: number; years: string; targetGroup: string; skills: string;
  funder?: string; note?: string; kind: 'program' | 'hq' | 'office';
}

export const locations: ProgramLocation[] = [
  { id: 'bangladesh', country: 'Bangladesh', region: 'South Asia', lat: 23.8103, lon: 90.4125, years: '2014–present', targetGroup: 'Unemployed graduates, women, and priority groups', skills: 'Digital marketing, graphic design, web development, freelancing and more', note: 'Headquarters of operations; 45 programs', kind: 'program' },
  { id: 'bhutan', country: 'Bhutan', region: 'South Asia', lat: 27.4728, lon: 89.6390, years: '2015–2016', targetGroup: 'Over 100 young Bhutanese who participated in the program', skills: 'Web development, mobile development and data analytics', kind: 'program' },
  { id: 'india', country: 'India', region: 'South Asia', lat: 28.6139, lon: 77.2090, years: '2015–2017', targetGroup: 'Students, youth and people willing to create a career in online freelancing marketplaces', skills: 'Coding, development, mobile development and data analytics', kind: 'program' },
  { id: 'malaysia', country: 'Malaysia', region: 'Southeast Asia', lat: 3.1390, lon: 101.6869, years: '2016', targetGroup: 'Students, youth and people willing to create a career in online freelancing marketplaces', skills: 'Front-end development, freelancing', kind: 'program' },
  { id: 'iraq', country: 'Iraq', region: 'Middle East', lat: 33.3152, lon: 44.3661, years: '2017', targetGroup: 'Refugees', skills: 'Graphic design and freelancing', kind: 'program' },
  { id: 'jordan', country: 'Jordan', region: 'Middle East', lat: 31.9454, lon: 35.9284, years: '2016', targetGroup: 'Undergraduate students willing to build a career in freelancing', skills: 'Data entry and freelancing', kind: 'program' },
  { id: 'kenya', country: 'Kenya', region: 'Africa', lat: -1.2921, lon: 36.8219, years: '2016', targetGroup: '100 students from across Kenya', skills: 'Computer science, coding and entrepreneurship', kind: 'program' },
  { id: 'somalia', country: 'Somalia', region: 'Africa', lat: 2.0469, lon: 45.3182, years: '2016–2017', targetGroup: 'HSC students; students interested in after-school programs', skills: 'Data entry and freelancing; basic computing', note: 'Includes the Somaliland program (2017): students interested in after-school programs; basic computing, data entry and freelancing.', kind: 'program' },
  { id: 'uganda', country: 'Uganda', region: 'Africa', lat: 0.3476, lon: 32.5825, years: '2016', targetGroup: '100 participants from across Uganda aged 18 to 40', skills: 'Basic computing, data entry and freelancing', kind: 'program' },
  { id: 'albania', country: 'Albania', region: 'Europe', lat: 41.3275, lon: 19.8187, years: '2021–2022', targetGroup: 'Young Albanian women aged 16 to 35', skills: 'Digital marketing, graphic design and web development', funder: 'World Bank Group', kind: 'program' },
  { id: 'denmark', country: 'Denmark', region: 'Europe', lat: 55.6761, lon: 12.5683, years: '2014', targetGroup: 'Students, youth and people willing to create a career in online freelancing marketplaces', skills: 'Coding, development, mobile development and data analytics', note: 'Launch location of CodersTrust, 2014.', kind: 'program' },
  { id: 'kosovo', country: 'Kosovo', region: 'Europe', lat: 42.6629, lon: 21.1655, years: '2016–2017', targetGroup: 'Young Kosovar women', skills: 'Front-end web development, coding, graphic design and digital marketing', funder: 'World Bank Group', note: 'Women in Online Work pilot, 2017.', kind: 'program' },
  { id: 'poland', country: 'Poland', region: 'Europe', lat: 52.2297, lon: 21.0122, years: '2016–2017', targetGroup: 'Students, youth and people from across Poland aged 18 to 45', skills: 'Full-stack, front-end and back-end development', kind: 'program' },
  { id: 'honduras', country: 'Honduras', region: 'Americas', lat: 14.0723, lon: -87.1921, years: '2018', targetGroup: 'HSC students', skills: 'Web design and freelancing', kind: 'program' },
  { id: 'usa', country: 'USA', region: 'Americas', lat: 40.7069, lon: -74.0113, years: '—', targetGroup: 'Students and recent graduates of The City College of New York', skills: 'Job-ready certifications', note: 'CT USA, Inc., New York; partnership with The City College of New York', kind: 'office' },
];
