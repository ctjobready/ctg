// Media coverage migrated from the legacy CodersTrust WordPress site (post type `featured-media`).
// Headlines, outlets and dates are as displayed on the legacy homepage (WP38, cycle-15 review: four headlines that the legacy page set in sentence case are set in Title Case here, as every heading on the site is; the words are unchanged).
// `url` points to the ORIGINAL external article
// only where the legacy HTML exposed it (currently TechCrunch); otherwise null: verify and add before publishing.
// The lorem-ipsum placeholder item ("Skype co-founder to speak in Dubai") is intentionally excluded.
import type { ImageMetadata } from 'astro';
import logo_gulf_news from '../assets/images/press/gulf-news.png';
import logo_techcrunch from '../assets/images/press/techcrunch.png';
import logo_forbes from '../assets/images/press/forbes.png';
import logo_the_wall_street_journal from '../assets/images/press/wsj.png';
import logo_tech_in_asia from '../assets/images/press/tech-in-asia.png';
import logo_usa_today from '../assets/images/press/usa-today.png';
import logo_mid_hudson_news from '../assets/images/press/mid-hudson-news.png';
import logo_the_times_of_india from '../assets/images/press/times-of-india.png';
import logo_world_bank from '../assets/images/press/world-bank-blogs.png';

export interface PressItem {
  outlet: string;
  headline: string;
  date: string;
  url: string | null;
  logo: ImageMetadata;
  logoAlt: string;
  legacyUrl: string | null;
}

export const press: PressItem[] = [
  {
    outlet: "Gulf News",
    headline: "CodersTrust to Finance Brains to Educate IT Coders",
    date: "2014-05-01",
    url: null,
    logo: logo_gulf_news,
    logoAlt: "Gulf News logo",
    legacyUrl: "https://coderstrust.global/featured-media/coderstrust-to-finance-brains-to-educate-it-coders/",
  },
  {
    outlet: "TechCrunch",
    headline: "Building Code To Break Poverty In Bangladesh",
    date: "2014-06-13",
    url: "https://techcrunch.com/2014/06/13/building-code-to-break-poverty-in-bangladesh/",
    logo: logo_techcrunch,
    logoAlt: "TechCrunch logo",
    legacyUrl: "https://coderstrust.global/featured-media/building-code-to-break-poverty-in-bangladesh/",
  },
  {
    outlet: "Forbes",
    headline: "5 Companies Making A Splash For A Better World",
    date: "2014-08-21",
    url: null,
    logo: logo_forbes,
    logoAlt: "Forbes logo",
    legacyUrl: "https://coderstrust.global/featured-media/5-companies-making-a-splash-for-a-better-world/",
  },
  {
    outlet: "The Wall Street Journal",
    headline: "Startup Aims to Boost Number of Qualified IT Workers",
    date: "2014-09-24",
    url: null,
    logo: logo_the_wall_street_journal,
    logoAlt: "The Wall Street Journal logo",
    legacyUrl: "https://coderstrust.global/featured-media/startup-aims-to-boost-number-of-qualified-it-workers/",
  },
  {
    outlet: "Tech in Asia",
    headline: "A Novel Idea in Microfinance Is Turning Bangladeshis into Freelance Coders",
    date: "2015-10-20",
    url: null,
    logo: logo_tech_in_asia,
    logoAlt: "Tech in Asia logo",
    legacyUrl: "https://coderstrust.global/featured-media/a-novel-idea-in-microfinance-is-turning-bangladeshis-into-freelance-coders/",
  },
  {
    outlet: "USA Today",
    headline: "Bangladesh, New York Pursue Different Paths to Train More Coders",
    date: "2014-12-22",
    url: null,
    logo: logo_usa_today,
    logoAlt: "USA Today logo",
    legacyUrl: "https://coderstrust.global/featured-media/bangladesh-new-york-pursue-different-paths-to-train-more-coders/",
  },
  {
    outlet: "Mid-Hudson News",
    headline: "CodersTrust brings Discovery Education, global leader of STEM Education, to Bangladesh",
    date: "2023-06-29",
    url: null,
    logo: logo_mid_hudson_news,
    logoAlt: "Mid-Hudson News logo",
    legacyUrl: "https://coderstrust.global/featured-media/coderstrust-brings-discovery-education-global-leader-of-stem-education-to-bangladesh/",
  },
  {
    outlet: "The Times of India",
    headline: "Cook to Coder: How Low-Income Youth Are Writing a Better Future",
    date: "2016-08-07",
    url: null,
    logo: logo_the_times_of_india,
    logoAlt: "The Times of India logo",
    legacyUrl: "https://coderstrust.global/featured-media/cook-to-coder-how-low-income-youth-are-writing-a-better-future/",
  },
  {
    outlet: "World Bank",
    headline: "Kosovo’s Women Go WOW: Online and Working!",
    date: "2016-09-19",
    url: null,
    logo: logo_world_bank,
    logoAlt: "World Bank logo",
    legacyUrl: "https://coderstrust.global/featured-media/kosovos-women-go-wow-online-and-working/",
  },
];

/**
 * WP62 (cycle-34 review): Home's press line is one pointer sentence to Recognition and Media now (src/components/ui/AsCoveredBy.astro); it reads only the years of `COVERED_BY`. The outlets' links below, and the World Bank pages after them, are the researched
 * list for any page that prints them again; no page prints them today.
 * WP55 (owner decision 2026-10-18, synthesis 3.5): the "As covered by" line on Home and About (WP58, cycle-30 review, Claude S9: on Home only now; About no longer repeats it), as text links with their years and no logos. The outlets are PA-09's, in date order, each with the link the research
 * checked on 17-18 October 2026 (a live page where one answers, otherwise the Wayback Machine copy: Forbes, The Wall Street Journal and USA Today open only as copies). `press` above is unchanged: the Recognition and Media
 * page keeps its logo list and its headlines, and links only where the original URL is known.
 */
export interface CoveredItem {
  outlet: string;
  year: string;
  /** A qualifier that keeps the claim true (Forbes' piece is a contributor post, not staff reporting). */
  note?: string;
  href: string;
}

export const COVERED_BY: CoveredItem[] = [
  { outlet: 'Gulf News', year: '2014', href: 'https://gulfnews.com/technology/skype-co-founder-seeks-local-partners-in-new-venture-1.1327190' },
  { outlet: 'TechCrunch', year: '2014', href: 'https://techcrunch.com/2014/06/13/building-code-to-break-poverty-in-bangladesh/' },
  { outlet: 'Forbes', year: '2014', note: 'contributor post', href: 'https://web.archive.org/web/20140924225212/http://www.forbes.com/sites/ilyapozin/2014/08/21/5-companies-making-a-splash-for-a-better-world/' },
  { outlet: 'The Wall Street Journal', year: '2014', href: 'https://web.archive.org/web/20141224065551/http://blogs.wsj.com/cio/2014/09/24/startup-aims-to-boost-number-of-qualified-it-workers/' },
  { outlet: 'USA Today', year: '2014', href: 'https://web.archive.org/web/20141228085159/http://www.usatoday.com/story/tech/columnist/shinal/2014/12/22/new-york-bangladesh-global-technology-trends/20734365/' },
  { outlet: 'Tech in Asia', year: '2015', href: 'https://www.techinasia.com/microfinance-startup-coders-trust-teaches-code' },
  { outlet: 'The Times of India', year: '2016', href: 'https://timesofindia.indiatimes.com/home/sunday-times/Cook-to-coder-How-low-income-youth-are-writing-a-better-future/articleshow/53575603.cms' },
];

/** World Bank pages that name CodersTrust among the implementing partners (PA-13): the Kosovo feature story (2016) and country brief (2017), and the Albania press release (2021). */
export const COVERED_BY_WORLD_BANK: { place: string; pages: { year: string; href: string }[] }[] = [
  {
    place: 'Kosovo',
    pages: [
      { year: '2016', href: 'https://web.archive.org/web/20170504003520/http://www.worldbank.org/en/news/feature/2016/09/19/kosovos-women-go-wow-online-and-working' },
      { year: '2017', href: 'https://www.worldbank.org/en/country/kosovo/brief/kosovo-wow' },
    ],
  },
  { place: 'Albania', pages: [{ year: '2021', href: 'https://www.worldbank.org/en/news/press-release/2021/09/14/women-in-albania-to-gain-greater-access-to-global-digital-jobs-market-with-world-bank-support' }] },
];
