import type { ImageMetadata } from 'astro';
import { partners, pressOutlets, type Partner } from '../data/partners';

/** Resolve partner / press logo files (src/assets/images/{partners,press}) to optimised image metadata. */
const partnerImgs = import.meta.glob<{ default: ImageMetadata }>('../assets/images/partners/*.{png,jpg,svg,webp}', { eager: true });
const pressImgs = import.meta.glob<{ default: ImageMetadata }>('../assets/images/press/*.{png,jpg,svg,webp}', { eager: true });

function find(map: Record<string, { default: ImageMetadata }>, file: string | null): ImageMetadata | undefined {
  if (!file) return undefined;
  const key = Object.keys(map).find((k) => k.endsWith('/' + file));
  return key ? map[key].default : undefined;
}

export interface LogoItem {
  id: string;
  name: string;
  logo?: ImageMetadata | string;
  /** Source artwork has a solid white background: keep it on a white tile. */
  white?: boolean;
  href?: string;
}

export type PartnerGroup = Partner['group'];

export function partnerLogos(group?: PartnerGroup | PartnerGroup[]): LogoItem[] {
  const groups = group === undefined ? undefined : Array.isArray(group) ? group : [group];
  return partners
    .filter((p) => !groups || groups.includes(p.group))
    .map((p) => ({ id: p.id, name: p.name, logo: find(partnerImgs, p.logo), white: p.bg === 'white', href: p.url }));
}

export function pressLogos(): LogoItem[] {
  return pressOutlets.map((p) => ({ id: p.id, name: p.name, logo: find(pressImgs, p.logo), white: p.bg === 'white', href: p.url }));
}

/** PA-04 caption (verbatim). */
export const PARTNER_CAPTION = 'Organizations we have worked with, 2014–2026.';
export const PRESS_CAPTION = 'As covered in';
