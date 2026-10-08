import { listPages, pageByRoute, type SitePage } from './pages';

/** One representative page per template (planning doc 10 §3 "Focus not obscured"). */
export interface TemplatePage {
  id: string;
  label: string;
  page: SitePage;
}

function firstArticle(): SitePage {
  const article = listPages().find((p) => /^\/news\/[^/]+\/$/.test(p.route));
  if (!article) throw new Error('No news article found in dist/');
  return article;
}

export function templatePages(): TemplatePage[] {
  return [
    { id: 'home', label: 'Home', page: pageByRoute('/') },
    { id: 'partner', label: 'Partner landing', page: pageByRoute('/partner-with-us/development-partners/') },
    { id: 'program', label: 'Program', page: pageByRoute('/programs/youthwide/') },
    { id: 'evidence', label: 'Evidence', page: pageByRoute('/impact/outcomes-2026/') },
    { id: 'case-study', label: 'Case study', page: pageByRoute('/impact/case-studies/her-power/') },
    { id: 'article', label: 'Article', page: firstArticle() },
    { id: 'team', label: 'Team', page: pageByRoute('/about/team/') },
    { id: 'nu-pgd', label: 'NU PGD', page: pageByRoute('/nu-postgraduate-diploma/') },
    { id: 'contact', label: 'Contact', page: pageByRoute('/contact/') },
  ];
}

/** Core pages for the opt-in screenshot run (slug is the file name under .work/qa/screens/<width>/). */
export function screenshotPages(): { slug: string; page: SitePage }[] {
  const route = (slug: string, r: string) => ({ slug, page: pageByRoute(r) });
  return [
    route('home', '/'),
    route('partner-with-us', '/partner-with-us/'),
    route('development-partners', '/partner-with-us/development-partners/'),
    route('governments', '/partner-with-us/governments/'),
    route('foundations', '/partner-with-us/foundations/'),
    route('investors', '/investors/'),
    route('programs', '/programs/'),
    route('youthwide', '/programs/youthwide/'),
    route('our-model', '/our-model/'),
    route('talentleap', '/our-model/talentleap/'),
    route('impact', '/impact/'),
    route('outcomes-2026', '/impact/outcomes-2026/'),
    route('case-study-her-power', '/impact/case-studies/her-power/'),
    route('about', '/about/'),
    route('team', '/about/team/'),
    route('news', '/news/'),
    { slug: 'article', page: firstArticle() },
    route('nu-pgd', '/nu-postgraduate-diploma/'),
    route('contact', '/contact/'),
    route('404', '/404.html'),
  ];
}
