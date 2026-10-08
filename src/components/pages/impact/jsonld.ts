import { pageUrl, type JsonLdNode } from '../../../lib/schema';

/** ItemList of pages (case-study index). */
export function itemList(name: string, items: { name: string; path: string }[]): JsonLdNode {
  return {
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: pageUrl(it.path) })),
  };
}

/** Ordered ItemList of described steps or levels (TalentLEAP); deliberately not a HowTo. */
export function describedList(name: string, items: { name: string; description: string }[], id?: string): JsonLdNode {
  return {
    '@type': 'ItemList',
    ...(id && { '@id': id }),
    name,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, description: it.description })),
  };
}
