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

/**
 * Optical corrections for the logo tiles (PartnerStrip). Every logo is shown at one grayscale/opacity treatment, so the
 * source artwork's own weight decides how loud it looks next to its neighbors: a solid block (UNDP, iDE) shrinks a
 * little and sits softer; thin or pale artwork (DANIDA, UPEACE, CCNY, Porticus) is darkened a little. `scale` multiplies
 * the tile's max logo height. Measured from the artwork files (share of ink pixels and their mean luminance).
 */
export interface LogoFit {
  scale?: number;
  tone?: 'soft' | 'strong';
}
export const LOGO_FIT: Record<string, LogoFit> = {
  undp: { scale: 0.85, tone: 'soft' },
  ide: { scale: 0.8, tone: 'soft' },
  brac: { scale: 0.9, tone: 'soft' },
  accenture: { tone: 'soft' },
  forbes: { scale: 0.85, tone: 'soft' },
  'usa-today': { scale: 0.9, tone: 'soft' },
  danida: { tone: 'strong' },
  upeace: { tone: 'strong' },
  ccny: { tone: 'strong' },
  porticus: { tone: 'strong' },
  bcc: { tone: 'strong' },
  wfp: { tone: 'strong' },
};

export interface LogoItem {
  id: string;
  name: string;
  logo?: ImageMetadata | string;
  /** Source artwork has a solid white background: keep it on a white tile. */
  white?: boolean;
  href?: string;
  fit?: LogoFit;
}

export type PartnerGroup = Partner['group'];

export function partnerLogos(group?: PartnerGroup | PartnerGroup[]): LogoItem[] {
  const groups = group === undefined ? undefined : Array.isArray(group) ? group : [group];
  return partners
    .filter((p) => !groups || groups.includes(p.group))
    .map((p) => ({ id: p.id, name: p.name, logo: find(partnerImgs, p.logo), white: p.bg === 'white', href: p.url, fit: LOGO_FIT[p.id] }));
}

export function pressLogos(): LogoItem[] {
  return pressOutlets.map((p) => ({ id: p.id, name: p.name, logo: find(pressImgs, p.logo), white: p.bg === 'white', href: p.url, fit: LOGO_FIT[p.id] }));
}

/** PA-04's caption sentence (verbatim): the first sentence of every partner-logo caption, and the base of each strip's accessible name (PartnerStrip). */
export const PARTNER_CAPTION_SENTENCE = 'Organizations we have worked with, 2014–2026.';
/**
 * The caption every partner-logo band prints (WP54, cycle-28 review, Kimi K1): PA-04's sentence, then the statement Home's band carried beside its own copy of the sentence, so no band reads as a list of endorsements. It was PA-04's
 * sentence alone on every page but Home. One source for all of them: PartnerStrip's default, the caption GuideBand, GuideSection, PartnerGuideBand and Reinforcement pass to it, and Home's PartnerRelationships.
 */
export const PARTNER_CAPTION = `${PARTNER_CAPTION_SENTENCE} These are working relationships, not endorsements.`;
export const PRESS_CAPTION = 'Press Coverage, 2014–2016';
