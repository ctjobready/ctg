/**
 * Program locations (SC-03): Bangladesh plus 14 international locations = 15 countries and territories.
 * Years, target groups and skills follow CodersTrust program records. Somaliland is its own row and pin, labelled neutrally.
 * The USA is not a program location; offices are listed separately (OFFICES_LINE). No funder is named for any location;
 * only Kosovo's partner (the World Bank Group) is published, in `note`.
 */
export interface ProgramLocation {
  id: string;
  /** Location name as displayed (country or territory). */
  name: string;
  region: 'South Asia' | 'Southeast Asia' | 'Middle East' | 'Africa' | 'Europe' | 'Americas';
  lat: number;
  lon: number;
  years: string;
  targetGroup: string;
  skills: string;
  /** Not used for any location: funders are not named publicly. Partner relationships go in `note`. */
  funder?: string;
  note?: string;
}

export const OFFICES_LINE = 'Offices: New York (CT USA, Inc.) and Dhaka (CodersTrust Bangladesh)';

export const locations: ProgramLocation[] = [
  { id: 'bangladesh', name: 'Bangladesh', region: 'South Asia', lat: 23.8103, lon: 90.4125, years: '2014–present', targetGroup: 'Unemployed graduates, women, and priority groups', skills: 'Digital marketing, graphic design, web development, freelancing and more', note: 'Direct training across 45 programs' },
  { id: 'bhutan', name: 'Bhutan', region: 'South Asia', lat: 27.4728, lon: 89.6390, years: '2015–2016', targetGroup: 'Young Bhutanese who participated in the program', skills: 'Web development, mobile development and data analytics' },
  { id: 'india', name: 'India', region: 'South Asia', lat: 28.6139, lon: 77.2090, years: '2015–2017', targetGroup: 'Students, youth and people willing to create a career in online freelancing marketplaces', skills: 'Coding, development, mobile development and data analytics' },
  { id: 'malaysia', name: 'Malaysia', region: 'Southeast Asia', lat: 3.1390, lon: 101.6869, years: '2016', targetGroup: 'Students, youth and people willing to create a career in online freelancing marketplaces', skills: 'Front-end development and freelancing' },
  { id: 'iraq', name: 'Iraq', region: 'Middle East', lat: 33.3152, lon: 44.3661, years: '2017', targetGroup: 'Refugees', skills: 'Graphic design and freelancing' },
  { id: 'jordan', name: 'Jordan', region: 'Middle East', lat: 31.9454, lon: 35.9284, years: '2016', targetGroup: 'Undergraduate students willing to build a career in freelancing', skills: 'Data entry and freelancing' },
  { id: 'kenya', name: 'Kenya', region: 'Africa', lat: -1.2921, lon: 36.8219, years: '2016', targetGroup: '100 students from across Kenya', skills: 'Computer science, coding and entrepreneurship' },
  { id: 'somalia', name: 'Somalia', region: 'Africa', lat: 2.0469, lon: 45.3182, years: '2016', targetGroup: 'Higher Secondary Certificate (HSC) students', skills: 'Data entry and freelancing' },
  { id: 'somaliland', name: 'Somaliland', region: 'Africa', lat: 9.5600, lon: 44.0650, years: '2017', targetGroup: 'Students interested in after-school programs', skills: 'Basic computing, data entry and freelancing' },
  { id: 'uganda', name: 'Uganda', region: 'Africa', lat: 0.3476, lon: 32.5825, years: '2016', targetGroup: '100 participants from across Uganda aged 18 to 40', skills: 'Basic computing, data entry and freelancing' },
  { id: 'albania', name: 'Albania', region: 'Europe', lat: 41.3275, lon: 19.8187, years: '2021–2022', targetGroup: 'Young Albanian women aged 16 to 35', skills: 'Digital marketing, graphic design and web development' },
  { id: 'denmark', name: 'Denmark', region: 'Europe', lat: 55.6761, lon: 12.5683, years: '2014', targetGroup: 'Students, youth and people willing to create a career in online freelancing marketplaces', skills: 'Coding, development, mobile development and data analytics', note: 'Launch location of CodersTrust' },
  { id: 'kosovo', name: 'Kosovo', region: 'Europe', lat: 42.6629, lon: 21.1655, years: '2016–2017', targetGroup: 'Young Kosovar women', skills: 'Front-end web development, coding, graphic design and digital marketing', note: 'Partner: World Bank Group (Women in Online Work pilot, 2017)' },
  { id: 'poland', name: 'Poland', region: 'Europe', lat: 52.2297, lon: 21.0122, years: '2016–2017', targetGroup: 'Students, youth and people from across Poland aged 18 to 45', skills: 'Full-stack, front-end and back-end development' },
  { id: 'honduras', name: 'Honduras', region: 'Americas', lat: 14.0723, lon: -87.1921, years: '2018', targetGroup: 'Higher Secondary Certificate (HSC) students', skills: 'Web design and freelancing' },
];
