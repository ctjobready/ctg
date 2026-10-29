import { fact } from './facts';

/**
 * Program locations (SC-03): Bangladesh plus 15 international locations = 16 countries and territories.
 * Years, target groups and skills follow CodersTrust program records. Somaliland is its own row and pin, labelled neutrally.
 * The USA is not a program location; offices are listed separately (OFFICES_LINE). No funder is named for any location; partners are named in `note` only where the owner approved them
 * (World Bank Group in Kosovo and Albania; WP55, owner decision 2026-10-18: Maarifasasa, Makerere University Business School, U-Touch, CrossWorkers and SOS Children’s Villages, from CodersTrust’s release of 10 September 2020 and the partners’ own pages).
 * WP56 (owner decisions 12, 13 and 15 of 2026-10-18, after the DR1 research): Somalia is removed (merged into Somaliland: the record shows Somaliland in 2015–2016 and never Somalia), so the headline is 16, Bangladesh plus 15.
 * WP106 (owner 2026-10-29: "add 2020"): Somaliland is also in the partnerships CodersTrust announced on 10 September 2020 (with Uganda, Benin and Egypt: the release and the news post "CodersTrust Announces Learning Partnerships in Uganda"), so its years are "2015–2016, 2020" and its note adds "partnership announced in 2020". It stays one location: the count is still 16.
 * Tima-ade University is no longer called a partner: the Somaliland note says "Hour of Code, and an ICT program at Tima-ade University". Nigeria is not a location and is not counted; it appears only as a timeline line on About (TL-07).
 * WP54 (cycle-28 review, Grok R1; owner's investor deck): the Albania program (2021–2022) was with the World Bank Group, so its row says "Partner: World Bank Group" as Kosovo's does. No amount or investment figure is published.
 * WP55 (owner decision 2026-10-18, "the headline becomes 17"): the 15 locations the owner vouches for stay; Egypt and Benin (2020, partnerships announced in September 2020) are added. Corrections: Uganda 2020 (was 2016), Somaliland 2015–2016 (was 2017: the Hour of Code with Tima-ade
 * University, December 2015), Iraq 2018 (was 2017: a cooperation with the World Food Programme announced in March 2018; WP125, owner 2026-10-29: "Yes, training delivered", so the note says so; still no figure and no outcome), Albania with the Government of Albania and EuroPartners Development. The target groups and skills of the 15 older rows are the owner's, unchanged,
 * except Uganda's target group: the deck's "100 participants from across Uganda aged 18 to 40" belonged to the unsupported 2016 row (no source gives it for the 2020 partnerships), so the row says "Learners through partner institutions" (the release of 10 September 2020: "students", "online and blended classroom learning with local mentors").
 * WP79 (Claude-ladder review, Sonnet XHigh run 8): Kosovo and Albania are delivered training programs, so their notes say "Program: …" (Kosovo "Program: Women in Online Work, with the World Bank"; Albania "Program: Digital Jobs Albania, a World Bank initiative, with …"), not "Partner: …", which the page's "Locations Are Not Programs" rule
 * reserves for partnerships, announced cooperations and the launch. "Partner: …" stays on Benin, Egypt and Uganda (the 2020 partnerships) and "Cooperation … announced" on Iraq. The WP54 sentence above is superseded for these two rows.
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
  /** Fact whose footnote marker follows the note in the table (e.g. SC-02 for the 45 programs, source IR26). */
  noteFactId?: string;
  /** Photo registry key (src/data/photos.ts) of a photograph of this location's program, shown beside the name in the table (WP55). Only a location with a CodersTrust photograph has one. */
  photo?: string;
}

/**
 * WP57 (cycle-29 review, Grok R1): Denmark's note says when the launch was, "Launch location of CodersTrust, April 2014" (the page's H1 no longer says "Delivered in", so the one row that is not a program says what it is). The date is TL-01's
 * (the Copenhagen tile of the "Around the World" strip reads it too), never retyped; the build stops if the register has no launch date.
 * WP58 (cycle-30 review, Grok R1): Denmark's target-group and skills cells are "—" (they had been copied from another row), so the row keeps only its years and its note.
 */
const launched = fact('TL-01').stat?.value;
if (!launched) throw new Error('countries: TL-01 has no stat value (the launch date the Denmark note states)');

export const OFFICES_LINE = 'Headquarters: New York (CT USA, Inc.). Country office: Dhaka (CodersTrust Bangladesh Ltd.).';

export const locations: ProgramLocation[] = [
  { id: 'bangladesh', name: 'Bangladesh', region: 'South Asia', lat: 23.8103, lon: 90.4125, years: '2014–present', targetGroup: 'Unemployed graduates, women, and priority groups', skills: 'Digital marketing, graphic design, web development, freelancing and more', note: 'Direct training across 45 programs', noteFactId: 'SC-02' },
  { id: 'bhutan', name: 'Bhutan', region: 'South Asia', lat: 27.4728, lon: 89.6390, years: '2015–2016', targetGroup: 'Program participants', skills: 'Web development, mobile development and data analytics', photo: 'global/bhutan-batch-inauguration' },
  { id: 'india', name: 'India', region: 'South Asia', lat: 28.6139, lon: 77.2090, years: '2015–2017', targetGroup: 'Students, youth and people willing to create a career in online freelancing marketplaces', skills: 'Coding, development, mobile development and data analytics' },
  { id: 'malaysia', name: 'Malaysia', region: 'Southeast Asia', lat: 3.1390, lon: 101.6869, years: '2016', targetGroup: 'Students, youth and people willing to create a career in online freelancing marketplaces', skills: 'Front-end development and freelancing' },
  { id: 'iraq', name: 'Iraq', region: 'Middle East', lat: 33.3152, lon: 44.3661, years: '2018', targetGroup: 'Refugees', skills: 'Graphic design and freelancing', note: 'Training delivered with the World Food Programme (WFP); cooperation announced in March 2018' },
  { id: 'jordan', name: 'Jordan', region: 'Middle East', lat: 31.9454, lon: 35.9284, years: '2016', targetGroup: 'Undergraduate students willing to build a career in freelancing', skills: 'Data entry and freelancing' },
  { id: 'benin', name: 'Benin', region: 'Africa', lat: 6.4969, lon: 2.6289, years: '2020', targetGroup: 'Students learning with a local partner', skills: 'Digital and soft skills for online freelancing', note: 'Partner: SOS Children’s Villages' },
  { id: 'egypt', name: 'Egypt', region: 'Africa', lat: 30.0444, lon: 31.2357, years: '2020', targetGroup: 'Students learning with a local partner', skills: 'Digital and soft skills for online freelancing', note: 'Partner: CrossWorkers' },
  { id: 'kenya', name: 'Kenya', region: 'Africa', lat: -1.2921, lon: 36.8219, years: '2016', targetGroup: '100 students', skills: 'Computer science, coding and entrepreneurship', note: 'Feasibility study with a Rockefeller Foundation grant' },
  { id: 'somaliland', name: 'Somaliland', region: 'Africa', lat: 9.5600, lon: 44.0650, years: '2015–2016, 2020', targetGroup: 'Students interested in after-school programs', skills: 'Basic computing, data entry and freelancing', note: 'Hour of Code, and an ICT program at Tima-ade University (2015–2016); separately, a learning partnership announced in 2020', photo: 'global/somaliland-hour-of-code' },
  { id: 'uganda', name: 'Uganda', region: 'Africa', lat: 0.3476, lon: 32.5825, years: '2020', targetGroup: 'Learners through partner institutions', skills: 'Basic computing, data entry and freelancing', note: 'Partners: Maarifasasa, Makerere University Business School and U-Touch' },
  { id: 'albania', name: 'Albania', region: 'Europe', lat: 41.3275, lon: 19.8187, years: '2021–2022', targetGroup: 'Young Albanian women aged 16 to 35', skills: 'Digital marketing, graphic design and web development', note: 'Program: Digital Jobs Albania, a World Bank initiative, with the Government of Albania and EuroPartners Development' },
  { id: 'denmark', name: 'Denmark', region: 'Europe', lat: 55.6761, lon: 12.5683, years: '2014', targetGroup: '—', skills: '—', note: `Launch location of CodersTrust, ${launched}`, photo: 'global/copenhagen-launch-dinner' },
  { id: 'kosovo', name: 'Kosovo', region: 'Europe', lat: 42.6629, lon: 21.1655, years: '2016–2017', targetGroup: 'Young women', skills: 'Front-end web development, coding, graphic design and digital marketing', note: 'Program: Women in Online Work, with the World Bank', photo: 'general/kosovo-wow-group' },
  { id: 'poland', name: 'Poland', region: 'Europe', lat: 52.2297, lon: 21.0122, years: '2016–2017', targetGroup: 'Students, youth and people from across Poland aged 18 to 45', skills: 'Full-stack, front-end and back-end development' },
  { id: 'honduras', name: 'Honduras', region: 'Americas', lat: 14.0723, lon: -87.1921, years: '2018', targetGroup: 'Higher-secondary students', skills: 'Web design and freelancing' },
];
