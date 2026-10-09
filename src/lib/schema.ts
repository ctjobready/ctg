import { BANGLADESH_HQ, CONTACT, ENTITY_DEFINITION, LOGO_PNG_PATH, OFFICES, PRODUCTION_ORIGIN, SITE_NAME, SOCIAL, plainPhone } from './site';
import { canonicalUrl, stripBase } from './url';
import { stripHtml } from './format';

/**
 * JSON-LD builders (planning/09). One @graph per page: Organization + WebSite on every page,
 * page-type nodes added by the page via the layout's `jsonLd` prop.
 * All URLs are canonical (production origin) regardless of the deployment host.
 */

export type JsonLdNode = Record<string, unknown>;

export const ORG_ID = `${PRODUCTION_ORIGIN}/#organization`;
export const SITE_ID = `${PRODUCTION_ORIGIN}/#website`;

/**
 * dateModified of a page node whose page states no "last updated" date: the day the site was built (UTC).
 * PUBLIC_BUILD_DATE (YYYY-MM-DD) pins it for reproducible builds.
 */
export const BUILD_DATE: string = (import.meta.env.PUBLIC_BUILD_DATE as string | undefined) || new Date().toISOString().slice(0, 10);

/** Reference to a node by id. */
export const ref = (id: string) => ({ '@id': id });

/** Canonical absolute URL for a site path. */
export const pageUrl = (path: string) => canonicalUrl(path);

/** An asset URL on the deployment host (staging) re-pointed at the canonical origin, like every other URL in the graph. */
const canonicalAsset = (u: string): string => {
  if (!/^https?:\/\//i.test(u)) return u;
  const p = new URL(u);
  return p.origin === PRODUCTION_ORIGIN ? u : PRODUCTION_ORIGIN + stripBase(p.pathname) + p.search;
};

/** A CodersTrust office as a schema.org Place (telephone in plain form). */
const officePlace = (o: { name: string; city: string; street: string; region?: string; postalCode: string; countryCode: string; phone: string; email: string }): JsonLdNode => ({
  '@type': 'Place',
  name: `${o.name}, ${o.city}`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: o.street,
    addressLocality: o.city,
    ...(o.region && { addressRegion: o.region }),
    postalCode: o.postalCode,
    addressCountry: o.countryCode,
  },
  telephone: plainPhone(o.phone),
  email: o.email,
});

export function organization(): JsonLdNode {
  const usa = OFFICES[0];
  const phone = plainPhone(CONTACT.phone);
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    url: `${PRODUCTION_ORIGIN}/`,
    logo: { '@type': 'ImageObject', url: PRODUCTION_ORIGIN + LOGO_PNG_PATH, width: 1200, height: 143 },
    image: PRODUCTION_ORIGIN + LOGO_PNG_PATH,
    description: ENTITY_DEFINITION,
    foundingDate: '2014',
    founder: [
      { '@type': 'Person', name: 'Aziz Ahmad' },
      { '@type': 'Person', name: 'Ferdinand Kjærulff' },
    ],
    email: CONTACT.email,
    telephone: phone,
    // Where the site says CodersTrust works (IN-02, ID-07): Bangladesh, the base, and the three regions YouthWIDE names.
    areaServed: [
      { '@type': 'Country', name: 'Bangladesh' },
      ...['South Asia', 'Middle East and North Africa', 'Sub-Saharan Africa'].map((name) => ({ '@type': 'Place', name })),
    ],
    knowsAbout: ['workforce development', 'digital skills training', 'youth employment', 'freelancing', 'competency-based education', 'AI-ready curriculum'],
    address: [
      {
        '@type': 'PostalAddress',
        name: usa.name,
        streetAddress: '40 Wall Street, Suite 2004',
        addressLocality: 'New York',
        addressRegion: 'NY',
        postalCode: '10005',
        addressCountry: 'US',
      },
      {
        '@type': 'PostalAddress',
        name: BANGLADESH_HQ.name,
        streetAddress: BANGLADESH_HQ.street,
        addressLocality: BANGLADESH_HQ.city,
        postalCode: BANGLADESH_HQ.postalCode,
        addressCountry: BANGLADESH_HQ.countryCode,
      },
    ],
    // Offices only: no parent/subsidiary relation is asserted until the legal status is confirmed with funders (ID-07).
    location: [
      officePlace({ name: usa.name, city: usa.city, street: usa.address[0], region: 'NY', postalCode: '10005', countryCode: 'US', phone: usa.phone, email: usa.email }),
      officePlace({ name: BANGLADESH_HQ.name, city: BANGLADESH_HQ.city, street: BANGLADESH_HQ.street, postalCode: BANGLADESH_HQ.postalCode, countryCode: BANGLADESH_HQ.countryCode, phone: BANGLADESH_HQ.phone, email: BANGLADESH_HQ.email }),
    ],
    contactPoint: [
      { '@type': 'ContactPoint', contactType: 'customer support', email: CONTACT.email, telephone: phone, availableLanguage: ['en'] },
      { '@type': 'ContactPoint', contactType: 'partnerships', email: CONTACT.email, telephone: phone, availableLanguage: ['en'] },
    ],
    // linkedin.com/company/coderstrust verified HTTP 200 ("CodersTrust Global | LinkedIn") on 2026-10-08
    sameAs: [...SOCIAL.map((s) => s.href), 'https://www.linkedin.com/company/coderstrust'],
  };
}

export function website(): JsonLdNode {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: `${PRODUCTION_ORIGIN}/`,
    name: SITE_NAME,
    inLanguage: 'en',
    publisher: ref(ORG_ID),
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site path ("/about/"). Omit for the current page's own item only if you pass `current`. */
  path: string;
}

export function breadcrumbList(items: BreadcrumbItem[]): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: pageUrl(it.path),
    })),
  };
}

export interface WebPageOpts {
  path: string;
  name: string;
  description?: string;
  type?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage' | 'ProfilePage' | 'FAQPage';
  datePublished?: string;
  dateModified?: string;
  breadcrumb?: BreadcrumbItem[];
  about?: JsonLdNode;
}

export function webPage(o: WebPageOpts): JsonLdNode {
  return {
    '@type': o.type ?? 'WebPage',
    '@id': `${pageUrl(o.path)}#webpage`,
    url: pageUrl(o.path),
    name: o.name,
    ...(o.description && { description: o.description }),
    inLanguage: 'en',
    isPartOf: ref(SITE_ID),
    about: o.about ?? ref(ORG_ID),
    ...(o.datePublished && { datePublished: o.datePublished }),
    // Every page node carries dateModified: the page's own "last updated" date, else the build date (BUILD_DATE).
    dateModified: o.dateModified ?? BUILD_DATE,
    ...(o.breadcrumb && { breadcrumb: breadcrumbList(o.breadcrumb) }),
  };
}

export interface ArticleOpts {
  path: string;
  headline: string;
  description?: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  authorName?: string;
  section?: string;
  keywords?: string[];
}

function articleBase(type: 'Article' | 'NewsArticle', o: ArticleOpts): JsonLdNode {
  return {
    '@type': type,
    '@id': `${pageUrl(o.path)}#article`,
    mainEntityOfPage: pageUrl(o.path),
    headline: o.headline,
    ...(o.description && { description: o.description }),
    datePublished: o.datePublished,
    dateModified: o.dateModified ?? o.datePublished,
    ...(o.image && { image: [canonicalAsset(o.image)] }),
    author: o.authorName ? { '@type': 'Person', name: o.authorName } : ref(ORG_ID),
    publisher: ref(ORG_ID),
    inLanguage: 'en',
    ...(o.section && { articleSection: o.section }),
    ...(o.keywords?.length && { keywords: o.keywords.join(', ') }),
  };
}
export const article = (o: ArticleOpts) => articleBase('Article', o);
export const newsArticle = (o: ArticleOpts) => articleBase('NewsArticle', o);

/** JSON-LD text is plain text: undo the HTML escaping (&amp; and friends) that stripHtml leaves behind. */
const unescapeHtml = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' })[e as 'amp']);

/** FAQPage from Q/A pairs. Answers may contain HTML; tags are stripped and entities decoded for the schema text. */
export function faqPage(items: { q: string; a: string }[], path?: string): JsonLdNode {
  return {
    '@type': 'FAQPage',
    ...(path && { '@id': `${pageUrl(path)}#faq` }),
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: unescapeHtml(stripHtml(it.a)) },
    })),
  };
}

export function howTo(o: {
  path: string;
  name: string;
  description?: string;
  steps: { name: string; text: string }[];
}): JsonLdNode {
  return {
    '@type': 'HowTo',
    '@id': `${pageUrl(o.path)}#howto`,
    name: o.name,
    ...(o.description && { description: o.description }),
    step: o.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text })),
  };
}

export function person(o: {
  path: string;
  name: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  sameAs?: string[];
  knowsAbout?: string[];
  worksFor?: boolean;
}): JsonLdNode {
  return {
    '@type': 'Person',
    '@id': `${pageUrl(o.path)}#person`,
    name: o.name,
    url: pageUrl(o.path),
    ...(o.jobTitle && { jobTitle: o.jobTitle }),
    ...(o.description && { description: o.description }),
    ...(o.image && { image: o.image }),
    ...(o.sameAs?.length && { sameAs: o.sameAs }),
    ...(o.knowsAbout?.length && { knowsAbout: o.knowsAbout }),
    ...(o.worksFor !== false && { worksFor: ref(ORG_ID) }),
  };
}

export function course(o: {
  path: string;
  name: string;
  description: string;
  duration?: string; // ISO 8601 e.g. "P1Y"
  mode?: string;
  applyUrl?: string;
}): JsonLdNode {
  return {
    '@type': 'Course',
    '@id': `${pageUrl(o.path)}#course`,
    name: o.name,
    description: o.description,
    url: pageUrl(o.path),
    provider: ref(ORG_ID),
    ...(o.duration || o.mode
      ? {
          hasCourseInstance: {
            '@type': 'CourseInstance',
            ...(o.mode && { courseMode: o.mode }),
            ...(o.duration && { courseWorkload: o.duration }),
            ...(o.applyUrl && { url: o.applyUrl }),
          },
        }
      : {}),
  };
}

export function dataset(o: {
  path: string;
  name: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
  methodology?: string;
  keywords?: string[];
  variableMeasured?: string[];
  spatialCoverage?: string;
  temporalCoverage?: string;
}): JsonLdNode {
  return {
    '@type': 'Dataset',
    '@id': `${pageUrl(o.path)}#dataset`,
    name: o.name,
    description: o.description,
    url: pageUrl(o.path),
    creator: ref(ORG_ID),
    publisher: ref(ORG_ID),
    ...(o.datePublished && { datePublished: o.datePublished }),
    ...(o.dateModified && { dateModified: o.dateModified }),
    ...(o.keywords?.length && { keywords: o.keywords }),
    ...(o.variableMeasured?.length && { variableMeasured: o.variableMeasured }),
    ...(o.spatialCoverage && { spatialCoverage: o.spatialCoverage }),
    ...(o.temporalCoverage && { temporalCoverage: o.temporalCoverage }),
    ...(o.methodology && { measurementTechnique: o.methodology }),
    isAccessibleForFree: true,
  };
}

const PAGE_TYPES = ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'ProfilePage'];
const typesOf = (n: JsonLdNode): string[] => [n['@type'] ?? []].flat() as string[];

/**
 * A page described by an Article or NewsArticle alone (news posts, case studies, ...) also gets a WebPage node,
 * and the article points at it through mainEntityOfPage (planning/09 §2). The article builders keep the page URL
 * in mainEntityOfPage; it becomes a reference to the page node here, so no page has to assemble the pair.
 */
function withPageNode(nodes: JsonLdNode[]): JsonLdNode[] {
  if (nodes.some((n) => typesOf(n).some((t) => PAGE_TYPES.includes(t)))) return nodes;
  const i = nodes.findIndex((n) => typesOf(n).some((t) => t === 'Article' || t === 'NewsArticle') && typeof n.mainEntityOfPage === 'string');
  if (i === -1) return nodes;
  const art = nodes[i];
  const url = art.mainEntityOfPage as string;
  const pageId = `${url}#webpage`;
  const page: JsonLdNode = {
    '@type': 'WebPage',
    '@id': pageId,
    url,
    name: art.headline,
    ...(art.description ? { description: art.description } : {}),
    inLanguage: 'en',
    isPartOf: ref(SITE_ID),
    about: art.about ?? ref(ORG_ID),
    datePublished: art.datePublished,
    dateModified: art.dateModified ?? BUILD_DATE,
    mainEntity: ref(art['@id'] as string),
  };
  return [page, ...nodes.map((n, j) => (j === i ? { ...n, mainEntityOfPage: ref(pageId) } : n))];
}

/** Assemble the page graph: Organization + WebSite always, then page nodes. */
export function graph(nodes: JsonLdNode[] = []): JsonLdNode {
  return { '@context': 'https://schema.org', '@graph': [organization(), website(), ...withPageNode(nodes)] };
}
