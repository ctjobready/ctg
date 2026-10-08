// Partner and media logos. Facts: planning/05-facts-register.md §G (PA-01…PA-09).
// Caption rule (PA-04): "Organizations we have worked with, 2014–2026." Logos show program
// relationships, not endorsements.
//
// `logo` is a file name under src/assets/images/partners (or press/ for pressOutlets), or null
// when no acceptable logo exists (render the name as text instead).
// `bg: 'white'` means the source artwork has a solid white background (keep it on a white tile).

export interface Partner {
  id: string;
  name: string;
  group: 'development' | 'government' | 'private' | 'academic';
  logo: string | null;
  bg?: 'transparent' | 'white';
  url?: string;
}

export interface PressOutlet {
  id: string;
  name: string;
  logo: string | null;
  bg?: 'transparent' | 'white';
  url?: string;
}

export const partners: Partner[] = [
  // Development & NGO (PA-01)
  { id: 'undp', name: 'UNDP', group: 'development', logo: 'undp.png', bg: 'transparent', url: 'https://www.undp.org' },
  { id: 'world-bank-group', name: 'World Bank Group', group: 'development', logo: 'world-bank-group.png', bg: 'transparent', url: 'https://www.worldbank.org' },
  { id: 'wfp', name: 'World Food Programme', group: 'development', logo: 'wfp.png', bg: 'transparent', url: 'https://www.wfp.org' },
  { id: 'rockefeller-foundation', name: 'The Rockefeller Foundation', group: 'development', logo: 'rockefeller-foundation.png', bg: 'transparent', url: 'https://www.rockefellerfoundation.org' },
  { id: 'danida', name: 'DANIDA', group: 'development', logo: 'danida.png', bg: 'transparent' },
  { id: 'brac', name: 'BRAC', group: 'development', logo: 'brac.png', bg: 'transparent', url: 'https://www.brac.net' },
  { id: 'porticus', name: 'Porticus', group: 'development', logo: 'porticus.png', bg: 'transparent', url: 'https://www.porticus.com' },
  { id: 'care', name: 'CARE', group: 'development', logo: 'care.png', bg: 'transparent', url: 'https://www.care.org' },
  { id: 'ide', name: 'iDE', group: 'development', logo: 'ide.png', bg: 'transparent', url: 'https://www.ideglobal.org' },
  { id: 'pksf', name: 'PKSF', group: 'development', logo: 'pksf.png', bg: 'transparent', url: 'https://pksf-bd.org' },
  { id: 'save-the-children', name: 'Save the Children', group: 'development', logo: 'save-the-children.png', bg: 'transparent', url: 'https://www.savethechildren.org' },

  // Government of Bangladesh (PA-02)
  { id: 'ict-division', name: 'ICT Division', group: 'government', logo: 'ict-division.png', bg: 'transparent', url: 'https://ictd.gov.bd' },
  { id: 'doict', name: 'DoICT', group: 'government', logo: 'doict.png', bg: 'transparent' },
  { id: 'bhtpa', name: 'Bangladesh Hi-Tech Park Authority', group: 'government', logo: 'bhtpa.png', bg: 'transparent' },
  { id: 'nsda', name: 'National Skills Development Authority (NSDA)', group: 'government', logo: 'nsda.png', bg: 'white' },
  { id: 'bcc', name: 'Bangladesh Computer Council (BCC)', group: 'government', logo: 'bcc.png', bg: 'white', url: 'https://bcc.gov.bd' },

  // Private sector (PA-03, PA-06)
  { id: 'grameenphone-academy', name: 'Grameenphone Academy', group: 'private', logo: 'grameenphone-academy.png', bg: 'transparent', url: 'https://www.grameenphone.com' },
  { id: 'robi', name: 'Robi', group: 'private', logo: 'robi.png', bg: 'transparent', url: 'https://www.robi.com.bd' },
  { id: 'accenture', name: 'Accenture', group: 'private', logo: 'accenture.png', bg: 'transparent', url: 'https://www.accenture.com' },
  { id: 'basis', name: 'BASIS', group: 'private', logo: 'basis.png', bg: 'transparent', url: 'https://basis.org.bd' },
  { id: 'aws', name: 'AWS', group: 'private', logo: 'aws.png', bg: 'transparent', url: 'https://aws.amazon.com' },

  // Academic (PA-05)
  { id: 'national-university', name: 'National University, Bangladesh', group: 'academic', logo: 'national-university.png', bg: 'transparent', url: 'https://www.nu.ac.bd' },
  { id: 'upeace', name: 'University for Peace (UPEACE)', group: 'academic', logo: 'upeace.png', bg: 'transparent', url: 'https://www.upeace.org' },
  { id: 'ccny', name: 'The City College of New York (CCNY)', group: 'academic', logo: 'ccny.png', bg: 'white', url: 'https://www.ccny.cuny.edu' },
];

// Media coverage since 2014 (PA-09). No BBC logo: no documented item.
export const pressOutlets: PressOutlet[] = [
  { id: 'forbes', name: 'Forbes', logo: 'forbes.png', bg: 'transparent', url: 'https://www.forbes.com' },
  { id: 'wsj', name: 'The Wall Street Journal', logo: 'wsj.png', bg: 'transparent', url: 'https://www.wsj.com' },
  { id: 'techcrunch', name: 'TechCrunch', logo: 'techcrunch.png', bg: 'transparent', url: 'https://techcrunch.com' },
  { id: 'usa-today', name: 'USA Today', logo: 'usa-today.png', bg: 'transparent', url: 'https://www.usatoday.com' },
  { id: 'gulf-news', name: 'Gulf News', logo: 'gulf-news.png', bg: 'transparent', url: 'https://gulfnews.com' },
  { id: 'tech-in-asia', name: 'Tech in Asia', logo: 'tech-in-asia.png', bg: 'transparent', url: 'https://www.techinasia.com' },
  { id: 'times-of-india', name: 'The Times of India', logo: 'times-of-india.png', bg: 'transparent', url: 'https://timesofindia.indiatimes.com' },
  { id: 'world-bank-blogs', name: 'World Bank Blogs', logo: 'world-bank-blogs.png', bg: 'white', url: 'https://blogs.worldbank.org' },
];
