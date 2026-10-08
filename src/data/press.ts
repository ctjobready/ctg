// Media coverage migrated from the legacy CodersTrust WordPress site (post type `featured-media`).
// Headlines, outlets and dates are as displayed on the legacy homepage. `url` points to the ORIGINAL external article
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
    headline: "CodersTrust to finance brains to educate IT coders",
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
    headline: "A novel idea in microfinance is turning Bangladeshis into freelance coders",
    date: "2015-10-20",
    url: null,
    logo: logo_tech_in_asia,
    logoAlt: "Tech in Asia logo",
    legacyUrl: "https://coderstrust.global/featured-media/a-novel-idea-in-microfinance-is-turning-bangladeshis-into-freelance-coders/",
  },
  {
    outlet: "USA Today",
    headline: "Bangladesh, New York pursue different paths to train more coders",
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
    headline: "Cook to coder: How low-income youth are writing a better future",
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
