import type { JsonLdNode } from './schema';

export interface Crumb {
  label: string;
  /** Omit on the last (current) crumb. */
  href?: string;
}

/** Props shared by every layout (BaseLayout owns them; the others forward them). */
export interface BaseLayoutProps {
  title: string;
  description?: string;
  /** Site path of the page (base-less). Defaults to the request path with the base stripped. */
  path?: string;
  /** Home → … → current. Pass items after "Home"; the last one is the current page. Omit on Home. */
  breadcrumbs?: Crumb[];
  /** Page-type JSON-LD nodes (WebPage, Article, FAQPage…). Organization + WebSite are added automatically. */
  jsonLd?: JsonLdNode[];
  /** Show the PromoBar (default true; auto-hidden on the outcomes page). */
  promo?: boolean;
  image?: string;
  imageAlt?: string;
  /** D13 asset ID of the photo behind `image` (team headshot, news cover); see SEOHead. */
  imageAsset?: string;
  ogType?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  /** Append " | CodersTrust" (default true). */
  titleSuffix?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  /** Extra class on <body>. */
  bodyClass?: string;
}
